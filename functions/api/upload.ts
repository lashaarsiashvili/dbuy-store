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
    let productTitle = '';

    // Handle multipart/form-data (Standard binary upload from browser File input)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      productTitle = (formData.get('title') as string) || (formData.get('name') as string) || '';

      const fileEntries = formData.getAll('files').concat(formData.getAll('file')).filter((f): f is File => f instanceof File && f.size > 0);

      if (fileEntries.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No file provided in form-data' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const r2Bucket = env.R2_BUCKET || env.R2 || env.MEDIA_BUCKET || env.BUCKET;
      if (!r2Bucket || typeof r2Bucket.put !== 'function') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'R2 storage binding "R2_BUCKET" not configured in Cloudflare environment.',
          }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const uploadedUrls: string[] = [];
      const uploadedResults = [];

      for (const file of fileEntries.slice(0, 5)) {
        const originalFilename = file.name || 'product.webp';
        const mimeType = file.type || 'image/webp';
        const arrayBuf = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuf);

        const { fileName } = generateCleanFileName(originalFilename, productTitle, mimeType);
        const objectKey = `products/${fileName}`;
        const publicUrl = `https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/${fileName}`;

        await r2Bucket.put(objectKey, fileBuffer, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        uploadedUrls.push(publicUrl);
        uploadedResults.push({
          url: publicUrl,
          key: objectKey,
          filename: fileName,
          size: fileBuffer.length,
          mimeType,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          url: uploadedUrls[0],
          urls: uploadedUrls,
          results: uploadedResults,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    } 
    else {
      return new Response(
        JSON.stringify({ success: false, error: 'Only multipart/form-data is supported' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    console.error('[Cloudflare Pages /api/upload error]:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Upload processing failed' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};
