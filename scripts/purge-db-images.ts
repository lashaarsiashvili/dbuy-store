import fs from 'fs';
import path from 'path';

// 1. Update initialProducts.ts
const initialProductsPath = path.join(process.cwd(), 'src', 'data', 'initialProducts.ts');
if (fs.existsSync(initialProductsPath)) {
  let code = fs.readFileSync(initialProductsPath, 'utf-8');
  // Replace image and images values across initialProducts
  code = code.replace(/"image":\s*"[^"]*"/g, '"image": ""');
  code = code.replace(/"images":\s*\[[^\]]*\]/g, '"images": []');
  fs.writeFileSync(initialProductsPath, code, 'utf-8');
  console.log('[PURGE] Updated initialProducts.ts');
}

// 2. Update products.json
const productsJsonPath = path.join(process.cwd(), 'src', 'data', 'products.json');
if (fs.existsSync(productsJsonPath)) {
  try {
    const raw = fs.readFileSync(productsJsonPath, 'utf-8');
    const prods = JSON.parse(raw);
    if (Array.isArray(prods)) {
      const cleaned = prods.map((p: any) => ({ ...p, image: '', images: [] }));
      fs.writeFileSync(productsJsonPath, JSON.stringify(cleaned, null, 2), 'utf-8');
      console.log('[PURGE] Updated products.json');
    }
  } catch (e) {
    console.error('Error updating products.json:', e);
  }
}

// 3. Update store_database.json
const dbJsonPath = path.join(process.cwd(), 'data', 'store_database.json');
if (fs.existsSync(dbJsonPath)) {
  try {
    const raw = fs.readFileSync(dbJsonPath, 'utf-8');
    const db = JSON.parse(raw);
    if (db && Array.isArray(db.products)) {
      db.products = db.products.map((p: any) => ({ ...p, image: '', images: [] }));
      fs.writeFileSync(dbJsonPath, JSON.stringify(db, null, 2), 'utf-8');
      console.log('[PURGE] Updated store_database.json');
    }
  } catch (e) {
    console.error('Error updating store_database.json:', e);
  }
}

// 4. Update storeBackup.json
const backupJsonPath = path.join(process.cwd(), 'src', 'data', 'storeBackup.json');
if (fs.existsSync(backupJsonPath)) {
  try {
    const raw = fs.readFileSync(backupJsonPath, 'utf-8');
    const backup = JSON.parse(raw);
    if (backup && Array.isArray(backup.products)) {
      backup.products = backup.products.map((p: any) => ({ ...p, image: '', images: [] }));
      fs.writeFileSync(backupJsonPath, JSON.stringify(backup, null, 2), 'utf-8');
      console.log('[PURGE] Updated storeBackup.json');
    }
  } catch (e) {
    console.error('Error updating storeBackup.json:', e);
  }
}
