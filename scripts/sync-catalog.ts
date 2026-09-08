import fs from 'fs';
import path from 'path';

function syncCatalog() {
  const dbPath = path.resolve(process.cwd(), 'data/store_database.json');
  const productsOut = path.resolve(process.cwd(), 'src/data/initialProducts.ts');
  const billboardsOut = path.resolve(process.cwd(), 'src/data/initialBillboards.ts');

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
    const tsContent = `import { Product } from '../types';

export const initialProducts: Product[] = ${JSON.stringify(db.products, null, 2)};
`;
    fs.writeFileSync(productsOut, tsContent);
    console.log(`Synced ${db.products.length} products to initialProducts.ts`);
  }

  if (db.billboards && Array.isArray(db.billboards) && db.billboards.length > 0) {
    const tsContent = `import { BillboardSlide } from '../types';

export const initialBillboards: BillboardSlide[] = ${JSON.stringify(db.billboards, null, 2)};
`;
    fs.writeFileSync(billboardsOut, tsContent);
    console.log(`Synced ${db.billboards.length} billboards to initialBillboards.ts`);
  }
}

syncCatalog();
