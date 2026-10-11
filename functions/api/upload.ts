/**
 * /functions/api/upload.ts
 *
 * Cloudflare Pages Function route handler for /api/upload.
 * Uploads binary image assets directly to Cloudflare R2 bucket without Base64 storage in D1.
 *
 * Supports:
 * - Native Cloudflare Pages R2 bucket binding (env.R2_BUCKET or env.MEDIA_BUCKET or env.BUCKET)
 * - AWS S3 Client SDK fallback using R2 S3-compatible credentials
 * - Accepts both multipart/form-data (File) and application/json ({ dataUrl, filename, title })
 *
 * Returns:
 * { success: true, url: "https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/<filename>", key: "products/<filename>" }
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface Env {
  DB?: any;
  R2_BUCKET?: any;
  MEDIA_BUCKET?: any;
  BUCKET?: any;
  R2_BUCKET_NAME?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_PUBLIC_URL_PREFIX?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
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

function getPublicUrlPrefix(env: Env): string {
  let prefix = (env.R2_PUBLIC_URL_PREFIX || DEFAULT_PUBLIC_PREFIX).trim();
  if (!prefix.endsWith('/')) {
    prefix += '/';
  }
  // Ensure the prefix targets the products subpath
  if (!prefix.includes('/products/')) {
    prefix = prefix.replace(/\/+$/, '') + '/products/';
  }
  return prefix;
}

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
    // 2. Handle JSON payload { dataUrl, filename, title }
    else if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null) as any;
      if (!body) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      productTitle = body.title || body.name || '';
      originalFilename = body.filename || 'product.webp';

      const dataUrl = body.dataUrl || body.image || body.file;
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        const match = dataUrl.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.+)$/s);
        if (match) {
          mimeType = match[1];
          const base64Data = match[2].trim().replace(/\s/g, '');
          const binaryString = atob(base64Data);
          fileBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            fileBuffer[i] = binaryString.charCodeAt(i);
          }
        }
      } else if (typeof dataUrl === 'string' && dataUrl.startsWith('http')) {
        // Already a remote URL, return as-is
        return new Response(
          JSON.stringify({ success: true, url: dataUrl }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }
    } 
    // 3. Raw binary stream
    else if (contentType.startsWith('image/')) {
      mimeType = contentType;
      const arrayBuf = await request.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuf);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid image data received' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Generate clean filename and object key under products/
    const { fileName } = generateCleanFileName(originalFilename, productTitle, mimeType);
    const objectKey = `products/${fileName}`;
    const publicPrefix = getPublicUrlPrefix(env);
    const publicUrl = `${publicPrefix}${fileName}`;

    // Upload Target 1: Native Cloudflare Pages R2 Bucket Binding (env.R2_BUCKET)
    const r2Bucket = env.R2_BUCKET || env.MEDIA_BUCKET || env.BUCKET;
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

    // Upload Target 2: AWS S3 Client SDK for R2
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
    const accessKeyId = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const bucketName = env.R2_BUCKET_NAME || 'products';

    if (accessKeyId && secretAccessKey) {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: fileBuffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

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

    // If R2 binding and S3 credentials are both not set in this environment
    return new Response(
      JSON.stringify({
        success: false,
        error: 'R2 storage binding "R2_BUCKET" or R2 API credentials not configured in Cloudflare environment.',
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
