import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Load variables from .env
dotenv.config();

// ============================================================================
// ENVIRONMENT VARIABLES & CONFIGURATION
// ============================================================================
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID || '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'products';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';

// Clean prefix (defaults to https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev)
const rawPrefix = process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev';
const R2_PUBLIC_URL_BASE = rawPrefix.replace(/\/products\/?$/, '').replace(/\/+$/, '');

const IS_DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// CLOUDFLARE D1 API HELPER
// ============================================================================
async function executeD1(sql: string, params: any[] = []): Promise<any[]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = (await response.json()) as any;

  if (!response.ok || !data.success) {
    const errorMsg = data.errors ? JSON.stringify(data.errors) : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`D1 API error: ${errorMsg}`);
  }

  return data.result?.[0]?.results || [];
}

// ============================================================================
// BASE64 PARSER & HELPER
// ============================================================================
function extractBase64Data(input: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  if (!input || typeof input !== 'string' || !input.startsWith('data:image/')) {
    return null;
  }

  const match = input.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.+)$/s);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  const rawBase64 = match[2].trim().replace(/\s/g, '');
  const buffer = Buffer.from(rawBase64, 'base64');

  if (buffer.length === 0) return null;

  let extension = 'webp';
  if (mimeType.includes('png')) extension = 'png';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
  else if (mimeType.includes('webp')) extension = 'webp';
  else if (mimeType.includes('gif')) extension = 'gif';
  else if (mimeType.includes('svg')) extension = 'svg';

  return { buffer, mimeType, extension };
}

// ============================================================================
// MAIN MIGRATION
// ============================================================================
async function main() {
  console.log('================================================================');
  console.log(' 🚀 CLOUDFLARE D1 -> R2 IMAGE MIGRATION');
  console.log('================================================================');
  console.log(`• Mode:               ${IS_DRY_RUN ? '🔍 DRY RUN (Preview only)' : '⚡ LIVE RUN (Executing changes)'}`);
  console.log(`• Cloudflare Account: ${ACCOUNT_ID}`);
  console.log(`• D1 Database ID:     ${DATABASE_ID}`);
  console.log(`• R2 Bucket:          ${R2_BUCKET_NAME}`);
  console.log(`• R2 Public Base:     ${R2_PUBLIC_URL_BASE}`);
  console.log('----------------------------------------------------------------\n');

  // 1. Validation
  if (!API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN is missing. Please set it in your .env or environment.');
    process.exit(1);
  }

  if (!IS_DRY_RUN && (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)) {
    console.error('❌ Error: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required for uploading.');
    process.exit(1);
  }

  // 2. Initialize AWS S3 Client for Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  // 3. Fetch products from D1
  console.log('📥 1. Fetching products from D1 table "products"...');
  const products = await executeD1('SELECT * FROM products;');
  console.log(`   Found ${products.length} total rows in table.\n`);

  // 4. Filter products containing Base64 image data
  const base64Products = products.filter((p) => {
    const isImageBase64 = typeof p.image === 'string' && p.image.startsWith('data:image/');
    const isImagesBase64 = typeof p.images === 'string' && p.images.includes('data:image/');
    return isImageBase64 || isImagesBase64;
  });

  console.log(`🔍 2. Found ${base64Products.length} product(s) with Base64 image data to migrate.\n`);

  if (base64Products.length === 0) {
    console.log('✅ No products require migration. All images are already migrated or non-base64!');
    return;
  }

  // 5. Migrate each product
  let migratedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < base64Products.length; i++) {
    const product = base64Products[i];
    const productId = String(product.id);
    const title = product.title || product.name || `Product ${productId}`;

    console.log(`[${i + 1}/${base64Products.length}] Processing product: "${title}" (ID: ${productId})`);

    // Determine Base64 string
    let rawBase64 = '';
    if (typeof product.image === 'string' && product.image.startsWith('data:image/')) {
      rawBase64 = product.image;
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed[0]?.startsWith('data:image/')) {
          rawBase64 = parsed[0];
        }
      } catch {}
    }

    const decoded = extractBase64Data(rawBase64);
    if (!decoded) {
      console.warn(`   ⚠️ Could not decode Base64 data for ID: ${productId}`);
      failedCount++;
      continue;
    }

    const cleanId = productId.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const objectKey = `products/${cleanId}.${decoded.extension}`;
    const publicUrl = `${R2_PUBLIC_URL_BASE}/${objectKey}`;

    console.log(`   • Decoded size: ${(decoded.buffer.length / 1024).toFixed(1)} KB (${decoded.mimeType})`);
    console.log(`   • R2 Key:       ${objectKey}`);
    console.log(`   • New URL:      ${publicUrl}`);

    if (IS_DRY_RUN) {
      console.log('   🔍 [DRY-RUN] Skipped upload and database update.\n');
      migratedCount++;
      continue;
    }

    try {
      // Upload buffer directly to R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: objectKey,
          Body: decoded.buffer,
          ContentType: decoded.mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      console.log('   ✔ Successfully uploaded to R2.');

      // Update D1 row
      const imagesJson = JSON.stringify([publicUrl]);
      await executeD1(
        `UPDATE products SET image = ?, images = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`,
        [publicUrl, imagesJson, productId]
      );
      console.log('   ✔ Successfully updated D1 database.\n');
      migratedCount++;
    } catch (err: any) {
      console.error(`   ❌ Failed to migrate product ${productId}:`, err.message, '\n');
      failedCount++;
    }
  }

  // Summary
  console.log('================================================================');
  console.log(' 🏁 MIGRATION SUMMARY');
  console.log('================================================================');
  console.log(`• Successfully processed: ${migratedCount}`);
  console.log(`• Failed:                 ${failedCount}`);
  console.log(`• Mode:                   ${IS_DRY_RUN ? 'DRY RUN' : 'COMPLETED'}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
