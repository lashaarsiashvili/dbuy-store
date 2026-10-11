/**
 * scripts/migrate-d1-to-r2.ts
 *
 * Cloudflare D1 to Cloudflare R2 Product Images Migration Script
 *
 * Capabilities:
 * 1. Connects to Cloudflare D1 via Cloudflare REST API (or Wrangler CLI fallback).
 * 2. Fetches all products where `image` starts with "data:image/".
 * 3. Decodes the base64 strings into binary image buffers (.webp, .png, .jpg, etc.).
 * 4. Uploads the images directly to the Cloudflare R2 bucket using:
 *    - AWS S3 Client SDK (@aws-sdk/client-s3) via R2 S3-compatible API, OR
 *    - Cloudflare R2 direct REST API.
 * 5. Updates the Cloudflare D1 `image` and `images` (and `images_json`) columns
 *    with permanent R2 public URLs.
 * 6. (Optional) Syncs the updated URLs to local data/store_database.json.
 *
 * Run via:
 *   npx tsx scripts/migrate-d1-to-r2.ts
 * Or:
 *   npm run migrate-d1-to-r2
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { S3Client, PutObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';

// Load environment variables from .env if present
dotenv.config({ override: true });

// ============================================================================
// CONFIGURATION & CREDENTIALS
// ============================================================================
const CONFIG = {
  // Cloudflare Account & D1
  cfAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || 'ae33acd14aaf2f0ad7bcb1f2e37b71b5',
  d1DatabaseId: process.env.CLOUDFLARE_D1_DATABASE_ID || '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8',
  cfApiToken: process.env.CLOUDFLARE_API_TOKEN || '',

  // Cloudflare R2 Configuration
  r2BucketName: process.env.R2_BUCKET_NAME || 'products',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
  
  // Public URL prefix for R2 assets
  r2PublicUrlPrefix: process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/',
  
  // Options
  dryRun: process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true',
  syncLocal: process.argv.includes('--sync-local') || process.env.SYNC_LOCAL === 'true' || true,
};

// ANSI color helpers for clean, scannable terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes and formats the public URL prefix and extracts the R2 bucket key prefix.
 */
function getUrlAndKeyPrefix(): { publicBase: string; keyPrefix: string } {
  let publicBase = CONFIG.r2PublicUrlPrefix.trim();
  if (!publicBase.endsWith('/')) {
    publicBase += '/';
  }

  let keyPrefix = 'products/';
  try {
    const parsed = new URL(publicBase);
    const pathname = parsed.pathname.replace(/^\/+/, ''); // e.g. "products/"
    if (pathname) {
      keyPrefix = pathname.endsWith('/') ? pathname : `${pathname}/`;
    }
  } catch {
    // fallback to default
  }

  return { publicBase, keyPrefix };
}

/**
 * Extracts and decodes base64 Data URL to binary Buffer and MIME details.
 */
function parseBase64Image(dataUrl: string): { buffer: Buffer; mimeType: string; extension: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return null;
  }

  try {
    // Standard data URL: data:image/<type>;base64,<data>
    const match = dataUrl.match(/^data:([a-zA-Z0-9-+/.]+);base64,(.+)$/s);
    if (!match) {
      return null;
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2].trim().replace(/\s/g, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      return null;
    }

    let extension = 'webp';
    if (mimeType.includes('png')) extension = 'png';
    else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('webp')) extension = 'webp';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('svg')) extension = 'svg';
    else if (mimeType.includes('avif')) extension = 'avif';

    return { buffer, mimeType, extension };
  } catch (err) {
    return null;
  }
}

/**
 * Formats a byte count into a human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates a clean, safe filename based on product ID or product title.
 * e.g., <product-id>.webp
 */
function generateCleanFileName(product: any, extension: string): string {
  const rawId = String(product.id || '').trim();
  const cleanId = rawId
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (cleanId) {
    return `${cleanId}.${extension}`;
  }

  const rawTitle = String(product.title || product.name || 'product').trim();
  const cleanSlug = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${cleanSlug || 'product'}-${Date.now()}.${extension}`;
}

// ============================================================================
// D1 DATABASE COMMUNICATION (Cloudflare REST API)
// ============================================================================

interface D1QueryResult<T = any> {
  success: boolean;
  results: T[];
  errors?: any[];
}

async function queryD1<T = any>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
  // If no CF API token is provided or --wrangler flag is passed, fall back to Wrangler CLI
  if (!CONFIG.cfApiToken || process.argv.includes('--wrangler')) {
    try {
      // Escape SQL string for bash execution
      let finalSql = sql;
      if (params.length > 0) {
        // Interpolate parameters safely for wrangler command
        let pIndex = 0;
        finalSql = sql.replace(/\?/g, () => {
          const val = params[pIndex++];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          return `'${String(val).replace(/'/g, "''")}'`;
        });
      }

      // Execute via wrangler d1 execute
      const cmd = `npx wrangler d1 execute dbuystore-db --remote --json --command ${JSON.stringify(finalSql)}`;
      const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const parsed = JSON.parse(stdout);
      const results = parsed?.[0]?.results || [];
      return { success: true, results };
    } catch (wranglerErr: any) {
      if (!CONFIG.cfApiToken) {
        throw new Error(
          `CLOUDFLARE_API_TOKEN is missing and Wrangler CLI execution failed: ${wranglerErr.message}`
        );
      }
      // If token exists, continue to try REST API below
    }
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.cfAccountId}/d1/database/${CONFIG.d1DatabaseId}/query`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.cfApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = (await response.json()) as any;

  if (!response.ok || !data.success) {
    const errorDetails = data.errors ? JSON.stringify(data.errors) : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare D1 Query Failed: ${errorDetails}`);
  }

  const results = data.result?.[0]?.results || [];
  return { success: true, results };
}

// ============================================================================
// CLOUDFLARE R2 UPLOADER
// ============================================================================

class R2Uploader {
  private s3Client: S3Client | null = null;
  private useDirectApi = false;

  constructor() {
    if (CONFIG.r2AccessKeyId && CONFIG.r2SecretAccessKey) {
      // Standard & recommended: AWS S3 SDK for Cloudflare R2
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${CONFIG.cfAccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: CONFIG.r2AccessKeyId,
          secretAccessKey: CONFIG.r2SecretAccessKey,
        },
      });
    } else if (CONFIG.cfApiToken) {
      // Fallback: Direct Cloudflare REST API for R2
      this.useDirectApi = true;
    } else {
      throw new Error(
        'R2 Credentials Missing! Please provide R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY, or CLOUDFLARE_API_TOKEN with R2 permissions.'
      );
    }
  }

  async uploadObject(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    if (CONFIG.dryRun) {
      console.log(`${colors.dim}   [DRY-RUN] Would upload ${key} (${formatBytes(buffer.length)}, ${mimeType}) to R2 bucket "${CONFIG.r2BucketName}"${colors.reset}`);
      return;
    }

    if (this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: CONFIG.r2BucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      });
      await this.s3Client.send(command);
    } else {
      // Cloudflare R2 Direct REST API:
      // PUT accounts/{account_id}/r2/buckets/{bucket_name}/objects/{key}
      const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CONFIG.cfAccountId}/r2/buckets/${CONFIG.r2BucketName}/objects/${encodeURIComponent(key)}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${CONFIG.cfApiToken}`,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: buffer,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`R2 REST Upload Failed: HTTP ${response.status} - ${text}`);
      }
    }
  }
}

// ============================================================================
// MAIN MIGRATION WORKFLOW
// ============================================================================

async function runMigration() {
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  🚀 CLOUDFLARE D1 TO R2 PRODUCT IMAGES MIGRATION TOOL${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);

  const { publicBase, keyPrefix } = getUrlAndKeyPrefix();

  console.log(`${colors.blue}📋 Migration Configuration:${colors.reset}`);
  console.log(`   • Cloudflare Account ID: ${colors.yellow}${CONFIG.cfAccountId}${colors.reset}`);
  console.log(`   • D1 Database ID:        ${colors.yellow}${CONFIG.d1DatabaseId}${colors.reset}`);
  console.log(`   • R2 Bucket Name:        ${colors.yellow}${CONFIG.r2BucketName}${colors.reset}`);
  console.log(`   • R2 Public URL Prefix:  ${colors.yellow}${publicBase}${colors.reset}`);
  console.log(`   • R2 Bucket Key Prefix:  ${colors.yellow}${keyPrefix}${colors.reset}`);
  console.log(`   • Mode:                  ${CONFIG.dryRun ? colors.magenta + 'DRY-RUN (No writes)' : colors.green + 'LIVE MIGRATION'}${colors.reset}\n`);

  // 1. Initialize R2 Client
  let r2Uploader: R2Uploader;
  try {
    r2Uploader = new R2Uploader();
    console.log(`${colors.green}✔ R2 Uploader initialized successfully.${colors.reset}`);
  } catch (err: any) {
    console.error(`${colors.red}❌ R2 Initialization Error: ${err.message}${colors.reset}`);
    printInstructions();
    process.exit(1);
  }

  // 2. Introspect D1 schema to determine available columns
  console.log(`\n${colors.cyan}1. Checking D1 table schema...${colors.reset}`);
  let hasImageCol = true;
  let hasImagesCol = false;
  let hasImagesJsonCol = false;
  let hasImagePathCol = false;

  try {
    const tableInfo = await queryD1<{ name: string }>('PRAGMA table_info(products);');
    const colNames = tableInfo.results.map((c) => c.name);
    console.log(`   Detected table columns: ${colors.dim}${colNames.join(', ')}${colors.reset}`);

    hasImageCol = colNames.includes('image');
    hasImagesCol = colNames.includes('images');
    hasImagesJsonCol = colNames.includes('images_json');
    hasImagePathCol = colNames.includes('image_path');
  } catch (err: any) {
    console.warn(`${colors.yellow}   ⚠️ Could not inspect table schema via PRAGMA: ${err.message}. Assuming standard columns.${colors.reset}`);
  }

  // 3. Fetch products containing base64 images
  console.log(`\n${colors.cyan}2. Fetching products with base64 images from D1...${colors.reset}`);
  let productsToMigrate: any[] = [];
  try {
    // Select all products and filter for base64 in `image` or `images`
    const query = await queryD1('SELECT * FROM products;');
    const allProducts = query.results || [];
    console.log(`   Scanned ${allProducts.length} total products in database.`);

    for (const p of allProducts) {
      const hasBase64Image = typeof p.image === 'string' && p.image.startsWith('data:image/');
      let hasBase64ImagesArray = false;
      if (typeof p.images === 'string' && p.images.includes('data:image/')) {
        hasBase64ImagesArray = true;
      }
      if (typeof p.images_json === 'string' && p.images_json.includes('data:image/')) {
        hasBase64ImagesArray = true;
      }

      if (hasBase64Image || hasBase64ImagesArray) {
        productsToMigrate.push(p);
      }
    }

    console.log(`   Found ${colors.bright}${colors.yellow}${productsToMigrate.length}${colors.reset} product(s) with base64 data URIs.`);
  } catch (err: any) {
    console.error(`${colors.red}❌ Failed to query D1 database: ${err.message}${colors.reset}`);
    printInstructions();
    process.exit(1);
  }

  if (productsToMigrate.length === 0) {
    console.log(`\n${colors.green}🎉 No base64 images found in D1! All products are already migrated or using clean URLs.${colors.reset}`);
    return;
  }

  // 4. Process each product: Decode -> Upload to R2 -> Update D1
  console.log(`\n${colors.cyan}3. Migrating product images to R2 & updating D1 records...${colors.reset}`);
  let successCount = 0;
  let failedCount = 0;
  let totalBytesUploaded = 0;
  const migratedProducts: any[] = [];

  for (let i = 0; i < productsToMigrate.length; i++) {
    const product = productsToMigrate[i];
    const pid = product.id;
    const name = product.title || product.name || `Product #${pid}`;
    console.log(`\n[${i + 1}/${productsToMigrate.length}] Processing "${colors.bright}${name}${colors.reset}" (ID: ${pid})`);

    // Determine primary base64 image data
    let base64String = '';
    if (typeof product.image === 'string' && product.image.startsWith('data:image/')) {
      base64String = product.image;
    } else if (typeof product.images === 'string') {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed) && parsed[0]?.startsWith('data:image/')) {
          base64String = parsed[0];
        }
      } catch {}
    }

    if (!base64String) {
      console.warn(`   ${colors.yellow}⚠️ No valid base64 image found for product ${pid}, skipping.${colors.reset}`);
      continue;
    }

    // Decode base64 to buffer
    const parsedImage = parseBase64Image(base64String);
    if (!parsedImage) {
      console.error(`   ${colors.red}❌ Failed to decode base64 string for product ${pid}.${colors.reset}`);
      failedCount++;
      continue;
    }

    const { buffer, mimeType, extension } = parsedImage;
    const fileName = generateCleanFileName(product, extension);
    const objectKey = `${keyPrefix}${fileName}`;
    const publicUrl = `${publicBase}${fileName}`;

    console.log(`   Decoded: ${colors.dim}${formatBytes(buffer.length)}, ${mimeType}${colors.reset}`);
    console.log(`   R2 Key:  ${colors.yellow}${objectKey}${colors.reset}`);
    console.log(`   New URL: ${colors.green}${publicUrl}${colors.reset}`);

    // Upload to Cloudflare R2
    try {
      await r2Uploader.uploadObject(objectKey, buffer, mimeType);
      totalBytesUploaded += buffer.length;
      console.log(`   ${colors.green}✔ Uploaded to R2 successfully.${colors.reset}`);
    } catch (err: any) {
      console.error(`   ${colors.red}❌ Failed to upload ${objectKey} to R2: ${err.message}${colors.reset}`);
      failedCount++;
      continue;
    }

    // Update D1 database record
    if (!CONFIG.dryRun) {
      try {
        const imagesArrayJson = JSON.stringify([publicUrl]);

        // Construct dynamic update statement to update all relevant image columns present in schema
        const setClauses: string[] = ['image = ?'];
        const params: any[] = [publicUrl];

        if (hasImagesCol) {
          setClauses.push('images = ?');
          params.push(imagesArrayJson);
        }
        if (hasImagesJsonCol) {
          setClauses.push('images_json = ?');
          params.push(imagesArrayJson);
        }
        if (hasImagePathCol) {
          setClauses.push('image_path = ?');
          params.push(publicUrl);
        }

        // Add timestamp if supported
        setClauses.push('updated_at = CURRENT_TIMESTAMP');

        params.push(pid); // for WHERE id = ?

        const updateSql = `UPDATE products SET ${setClauses.join(', ')} WHERE id = ?;`;
        await queryD1(updateSql, params);

        console.log(`   ${colors.green}✔ D1 database updated with new R2 URL.${colors.reset}`);
        successCount++;
        migratedProducts.push({
          id: pid,
          name,
          oldImageSize: formatBytes(buffer.length),
          newUrl: publicUrl,
        });
      } catch (err: any) {
        console.error(`   ${colors.red}❌ Failed to update D1 row for product ${pid}: ${err.message}${colors.reset}`);
        failedCount++;
      }
    } else {
      console.log(`   ${colors.dim}[DRY-RUN] D1 update skipped.${colors.reset}`);
      successCount++;
    }
  }

  // 5. Optional local store_database.json sync
  if (CONFIG.syncLocal && !CONFIG.dryRun && migratedProducts.length > 0) {
    syncLocalDatabase(migratedProducts);
  }

  // Summary Report
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  📊 MIGRATION SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`   • Products successfully migrated: ${colors.green}${successCount}${colors.reset}`);
  console.log(`   • Failed products:               ${failedCount > 0 ? colors.red + failedCount : colors.green + '0'}${colors.reset}`);
  console.log(`   • Total image data uploaded:     ${colors.yellow}${formatBytes(totalBytesUploaded)}${colors.reset}`);
  console.log(`   • Mode:                          ${CONFIG.dryRun ? 'DRY-RUN' : 'COMPLETED'}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);
}

/**
 * Updates local data/store_database.json if present so local dev catalog reflects R2 URLs.
 */
function syncLocalDatabase(migrated: Array<{ id: any; newUrl: string }>) {
  const dbPath = path.resolve(process.cwd(), 'data/store_database.json');
  if (!fs.existsSync(dbPath)) return;

  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.products)) return;

    let modified = 0;
    const urlMap = new Map(migrated.map((m) => [String(m.id), m.newUrl]));

    db.products = db.products.map((p: any) => {
      const pid = String(p.id);
      if (urlMap.has(pid)) {
        const newUrl = urlMap.get(pid)!;
        modified++;
        return {
          ...p,
          image: newUrl,
          images: [newUrl],
        };
      }
      return p;
    });

    if (modified > 0) {
      db.lastUpdated = new Date().toISOString();
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      console.log(`${colors.green}✔ Updated ${modified} products in local data/store_database.json.${colors.reset}`);
    }
  } catch (err: any) {
    console.warn(`${colors.yellow}⚠️ Could not update local store_database.json: ${err.message}${colors.reset}`);
  }
}

/**
 * Prints helpful instructions when required environment variables are missing.
 */
function printInstructions() {
  console.log(`\n${colors.bright}${colors.yellow}📖 HOW TO CONFIGURE & RUN THIS SCRIPT:${colors.reset}`);
  console.log(`
1. Create or edit your ${colors.bright}.env${colors.reset} file in the project root:
   ${colors.dim}------------------------------------------------------------${colors.reset}
   ${colors.cyan}# Cloudflare Account & D1${colors.reset}
   CLOUDFLARE_ACCOUNT_ID=ae33acd14aaf2f0ad7bcb1f2e37b71b5
   CLOUDFLARE_D1_DATABASE_ID=0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8
   CLOUDFLARE_API_TOKEN=<your-cloudflare-api-token>

   ${colors.cyan}# Cloudflare R2 Credentials (from Cloudflare Dashboard > R2 > Manage R2 API Tokens)${colors.reset}
   R2_BUCKET_NAME=products
   R2_ACCESS_KEY_ID=<your-r2-access-key-id>
   R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
   R2_PUBLIC_URL_PREFIX=https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/
   ${colors.dim}------------------------------------------------------------${colors.reset}

2. Test with Dry-Run mode first (safe, does not write changes):
   ${colors.bright}npx tsx scripts/migrate-d1-to-r2.ts --dry-run${colors.reset}

3. Run the live migration:
   ${colors.bright}npx tsx scripts/migrate-d1-to-r2.ts${colors.reset}
`);
}

// Execute
runMigration().catch((err) => {
  console.error(`\n${colors.red}❌ Fatal Migration Error:${colors.reset}`, err);
  process.exit(1);
});
