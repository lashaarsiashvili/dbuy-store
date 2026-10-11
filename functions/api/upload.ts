/**
 * /functions/api/upload.ts
 *
 * Cloudflare Pages Function route handler for /api/upload.
 * Uploads binary image assets directly to Cloudflare R2 bucket without Base64 storage in D1.
 *
 * Supports:
 * - Native Cloudflare Pages R2 bucket binding (env.R2)
 *
 * Returns:
 * { success: true, url: "https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/<filename>", key: "products/<filename>" }
 */

export interface Env {
  DB?: any;
  R2?: any; // Native binding
  [key: string]: any;
}

export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

const DEFAULT_PUBLIC_PREFIX = 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateCleanFileName(originalName: string, title?: string, mimeType?: string): { fileName: string; extension: string } {
  let ext = 'webp';
  if (mimeType) {
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
  } else if (originalName && originalName.includes('.')) {
    const rawExt = originalName.split('.').pop()?.toLowerCase();
    if (rawExt && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(rawExt)) {
      ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
    }
  }

  const baseSlug = title ? slugify(title) : (originalName ? slugify(originalName.replace(/\.[^/.]+$/, '')) : 'product');
  const safeBase = (baseSlug.slice(0, 40) || 'product');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fileName = `${safeBase}-${uniqueSuffix}.${ext}`;

  return { fileName, extension: ext };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let fileBuffer: Uint8Array | null = null;
    let mimeType = 'image/webp';
    let originalFilename = 'image.webp';
    let productTitle = '';

    // 1. Handle multipart/form-data (Standard binary upload from browser File input)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      productTitle = (formData.get('title') as string) || (formData.get('name') as string) || '';

      if (!file) {
        return new Response(
          JSON.stringify({ success: false, error: 'No file provided in form-data' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      originalFilename = file.name || 'product.webp';
      mimeType = file.type || 'image/webp';
      const arrayBuf = await file.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuf);
    } 
    else {
      return new Response(
        JSON.stringify({ success: false, error: 'Only multipart/form-data is supported' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Generate clean filename and object key under products/
    const { fileName } = generateCleanFileName(originalFilename, productTitle, mimeType);
    const objectKey = `products/${fileName}`;
    const publicUrl = `${DEFAULT_PUBLIC_PREFIX}${fileName}`;

    // Upload Target: Native Cloudflare Pages R2 Bucket Binding (env.R2)
    const r2Bucket = env.R2;
    if (r2Bucket && typeof r2Bucket.put === 'function') {
      await r2Bucket.put(objectKey, fileBuffer, {
        httpMetadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          url: publicUrl,
          key: objectKey,
          filename: fileName,
          size: fileBuffer.length,
          mimeType,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'R2 storage binding "R2" not configured in Cloudflare environment.',
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Cloudflare Pages /api/upload error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Upload processing failed' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};
