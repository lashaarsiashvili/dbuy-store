import fs from 'fs';
import path from 'path';

function ensureUploadsDirectorySync() {
  const dataUploads = path.resolve(process.cwd(), 'data/uploads');
  const publicUploads = path.resolve(process.cwd(), 'public/uploads');

  fs.mkdirSync(dataUploads, { recursive: true });
  fs.mkdirSync(publicUploads, { recursive: true });

  // 1. Sync all files from data/uploads to public/uploads
  if (fs.existsSync(dataUploads)) {
    const files = fs.readdirSync(dataUploads);
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const src = path.join(dataUploads, file);
      const dest = path.join(publicUploads, file);
      try {
        if (fs.statSync(src).isFile()) {
          fs.copyFileSync(src, dest);
        }
      } catch (err) {
        console.warn(`[SYNC-CATALOG] Could not copy ${file} to public/uploads:`, err);
      }
    }
  }

  // 2. Reverse sync any missing files from public/uploads to data/uploads
  if (fs.existsSync(publicUploads)) {
    const publicFiles = fs.readdirSync(publicUploads);
    for (const file of publicFiles) {
      if (file.startsWith('.')) continue;
      const src = path.join(publicUploads, file);
      const dest = path.join(dataUploads, file);
      if (!fs.existsSync(dest)) {
        try {
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        } catch (err) {
          console.warn(`[SYNC-CATALOG] Could not copy ${file} to data/uploads:`, err);
        }
      }
    }
  }
}

function verifyAndRepairProductImages(products: any[], billboards: any[]) {
  const dataUploads = path.resolve(process.cwd(), 'data/uploads');
  const publicUploads = path.resolve(process.cwd(), 'public/uploads');

  // Find a valid fallback image file from data/uploads
  let defaultFallbackFile = 'placeholder.jpg';
  const existingFiles = fs.readdirSync(dataUploads).filter(f => !f.startsWith('.') && (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')));
  if (existingFiles.length > 0) {
    defaultFallbackFile = existingFiles[0];
  }

  const checkImage = (imgUrl: string | undefined): string => {
    if (!imgUrl || typeof imgUrl !== 'string') return '';
    const trimmed = imgUrl.trim();
    if (trimmed.includes('/uploads/')) {
      const filename = trimmed.split('/uploads/').pop();
      if (filename) {
        const dataPath = path.join(dataUploads, filename);
        const publicPath = path.join(publicUploads, filename);

        if (!fs.existsSync(dataPath) && !fs.existsSync(publicPath)) {
          console.warn(`[SYNC-CATALOG] Image missing for ${filename}, generating fallback image...`);
          const fallbackSource = path.join(dataUploads, defaultFallbackFile);
          if (fs.existsSync(fallbackSource)) {
            fs.copyFileSync(fallbackSource, dataPath);
            fs.copyFileSync(fallbackSource, publicPath);
          } else {
            // Write a dummy 1x1 transparent JPEG or SVG
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#94a3b8">Product Image</text></svg>`;
            fs.writeFileSync(dataPath, svgContent);
            fs.writeFileSync(publicPath, svgContent);
          }
        } else if (fs.existsSync(dataPath) && !fs.existsSync(publicPath)) {
          fs.copyFileSync(dataPath, publicPath);
        } else if (!fs.existsSync(dataPath) && fs.existsSync(publicPath)) {
          fs.copyFileSync(publicPath, dataPath);
        }
        return `https://pub-27ddbcb3c0b9415685d441c14a264005.r2.dev/products/${filename}`;
      }
    }
    return trimmed;
  };

  if (Array.isArray(products)) {
    products.forEach(p => {
      if (p.image) p.image = checkImage(p.image);
      if (Array.isArray(p.images)) {
        p.images = p.images.map((img: string) => checkImage(img));
      }
    });
  }

  if (Array.isArray(billboards)) {
    billboards.forEach(b => {
      if (b.image) b.image = checkImage(b.image);
      if (b.bgImage) b.bgImage = checkImage(b.bgImage);
    });
  }
}

function syncCatalog() {
  const dbPath = path.resolve(process.cwd(), 'data/store_database.json');
  const productsOut = path.resolve(process.cwd(), 'src/data/initialProducts.ts');
  const billboardsOut = path.resolve(process.cwd(), 'src/data/initialBillboards.ts');

  ensureUploadsDirectorySync();

  if (!fs.existsSync(dbPath)) {
    console.log('No store_database.json found, skipping sync.');
    return;
  }

  let db: any;
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    db = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading store_database.json:', err);
    return;
  }

  if (db.products && Array.isArray(db.products) && db.products.length > 0) {
    verifyAndRepairProductImages(db.products, db.billboards || []);

    const tsContent = `import { Product } from '../types';
import productsJson from './products.json';

export const DB_VERSION = "2026_v5_local_uploads";

export const initialProducts: Product[] = productsJson as Product[];
`;
    fs.writeFileSync(productsOut, tsContent);
    console.log(`Synced ${db.products.length} products & verified all images to initialProducts.ts`);
  }

  if (db.billboards && Array.isArray(db.billboards) && db.billboards.length > 0) {
    const tsContent = `import { BillboardSlide } from '../types';

export const initialBillboards: BillboardSlide[] = ${JSON.stringify(db.billboards, null, 2)};
`;
    fs.writeFileSync(billboardsOut, tsContent);
    console.log(`Synced ${db.billboards.length} billboards to initialBillboards.ts`);
  }

  ensureUploadsDirectorySync();
}

syncCatalog();

