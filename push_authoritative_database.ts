import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function upload() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('firebase-applet-config.json not found!');
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    console.log('[PUSH] Firebase Config loaded. ProjectId:', config.projectId);

    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId || undefined);

    const dbFilePath = path.join(process.cwd(), 'data/store_database.json');
    if (!fs.existsSync(dbFilePath)) {
      throw new Error('data/store_database.json not found!');
    }
    const storeDb = JSON.parse(fs.readFileSync(dbFilePath, 'utf-8'));
    console.log('[PUSH] Local database file loaded successfully!');
    console.log('[PUSH] Number of products:', storeDb.products?.length);

    // Update lastUpdated to make sure client-side cache gets busted
    storeDb.lastUpdated = new Date().toISOString();

    // Sanitize database: remove the massive uploadsMap to stay well under the 1MB document size limit
    const sanitizedStoreDb = { ...storeDb };
    delete sanitizedStoreDb.uploadsMap;

    console.log('[PUSH] Starting Firestore setDoc on store/database (sanitized)...');
    const docRef = doc(db, 'store', 'database');
    await setDoc(docRef, sanitizedStoreDb, { merge: true });
    console.log('[PUSH] SUCCESS: Wrote store/database document (sanitized)');

    // Push each product to products collection
    if (Array.isArray(storeDb.products)) {
      console.log('[PUSH] Starting individual product collection updates...');
      for (const prod of storeDb.products) {
        if (prod.id) {
          const prodRef = doc(db, 'products', prod.id);
          await setDoc(prodRef, prod, { merge: true });
          console.log(`[PUSH] Wrote product to collection: ${prod.id} (${prod.title})`);
        }
      }
    }

    console.log('[PUSH] ALL DATA HAS BEEN SUCCESSFULLY PUSHED TO FIRESTORE!');
    process.exit(0);

  } catch (err: any) {
    console.error('[PUSH] ERROR during Firestore upload:', err.message || err);
    process.exit(1);
  }
}

upload();
