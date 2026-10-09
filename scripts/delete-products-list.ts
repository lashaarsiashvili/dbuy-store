import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ override: true });

const CF_ACCOUNT_ID = 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const D1_DATABASE_ID = '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const CF_API_TOKEN = 'cfut_fsq3lkgNkuYzBsn6skvvJ2d5OS6uQUgRGToZ7TJwcbc635cb';

const IDS_TO_DELETE = [
  'prod-1789138804362-oilsgso', // Ember Smart Mug
  'prod-1789156000001',          // Moroccanoil Treatment
  'prod-1789156000002',          // OGX Argan Oil
  'prod-1789156000003',          // La Roche-Posay Cicaplast
  'prod-1789156000004',          // Sports Research Collagen
  'prod-1789156000005',          // Granions Collagen+
  'prod-1789156000006',          // BASED Sea Salt Spray
  'prod-1789156000007',          // Gents of London Sea Salt
  'prod-1789156000008',          // Audio-Technica Mic
  'prod-1789156000009',          // Logitech Z207 Speakers
  'prod-1789156000010',          // Asus Zenbook Sleeve
  'prod-1789156000011',          // Apple Watch Charger
  'prod-1789156000012',          // Midea AC Dongle
  'prod-1789156000013'           // Cole Haan Care Kit
];

async function runDelete() {
  console.log('========================================================');
  console.log('🗑️ DELETING SPECIFIED PRODUCTS FROM LIVE D1 & LOCAL');
  console.log('========================================================');

  // 1. Delete from Cloudflare D1
  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;

  console.log(`1. Cloudflare D1-დან ${IDS_TO_DELETE.length} პროდუქტის წაშლა...`);

  for (const id of IDS_TO_DELETE) {
    try {
      const response = await fetch(d1Url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'DELETE FROM products WHERE id = ?;',
          params: [id]
        }),
      });

      const data = (await response.json()) as any;
      if (data.success) {
        console.log(`   ✅ წაიშალა D1-დან: ${id}`);
      } else {
        console.warn(`   ⚠️ ვერ წაიშალა D1-დან: ${id}`, JSON.stringify(data.errors));
      }
    } catch (err: any) {
      console.error(`   ❌ შეცდომა ID-ის წაშლისას ${id}:`, err.message);
    }
  }

  // 2. Delete from local store_database.json
  console.log('\n2. ლოკალური ბაზიდან (data/store_database.json) წაშლა...');
  const dbPath = path.resolve(process.cwd(), 'data', 'store_database.json');
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(raw);
      if (Array.isArray(db.products)) {
        const originalCount = db.products.length;
        db.products = db.products.filter((p: any) => !IDS_TO_DELETE.includes(p.id));
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        console.log(`   ✅ წაიშალა ლოკალურად: ${originalCount - db.products.length} პროდუქტი. ბაზაში დარჩა ${db.products.length} პროდუქტი.`);
      }
    } catch (err: any) {
      console.error('   ❌ ლოკალური ბაზის განახლების შეცდომა:', err.message);
    }
  }

  // 3. Trigger sync-catalog.ts
  console.log('\n3. კატალოგის სინქრონიზაციის სკრიპტის გაშვება...');
  try {
    execSync('npx tsx scripts/sync-catalog.ts', { stdio: 'inherit' });
  } catch (err: any) {
    console.error('❌ სინქრონიზაციის შეცდომა:', err.message);
  }

  console.log('========================================================');
  console.log('🎉 წაშლა წარმატებით დასრულდა როგორც D1-ზე, ისე ლოკალურად!');
  console.log('========================================================');
}

runDelete();
