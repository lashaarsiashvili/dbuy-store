import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ override: true });

const ADMIN_SLUG = 'dashboard';
const LIVE_DELETE_URL = 'https://dbuystore.com/api/products';
const LIVE_SYNC_URL = 'https://dbuystore.com/api/store/products';

async function deleteNoImageProducts() {
  console.log('========================================================');
  console.log('🗑️ DELETING PRODUCTS WITHOUT VALID IMAGES (D1 & LOCAL)');
  console.log('========================================================');

  // 1. Load local catalog
  const dbPath = path.resolve(process.cwd(), 'data/store_database.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ ლოკალური მონაცემთა ბაზა (data/store_database.json) არ არსებობს!');
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const dbData = JSON.parse(raw);
  const products = dbData.products || [];

  if (products.length === 0) {
    console.error('❌ ბაზაში პროდუქტები არ მოიძებნა!');
    process.exit(1);
  }

  // 2. Filter products with no image
  const toKeep: any[] = [];
  const toDelete: any[] = [];

  for (const p of products) {
    const img = (p.image || '').trim();
    if (!img || img === '' || img === '/uploads/placeholder.jpg' || img.includes('placeholder')) {
      toDelete.push(p);
    } else {
      toKeep.push(p);
    }
  }

  console.log(`\n🔍 ნაპოვნია ${toDelete.length} პროდუქტი გამოსახულების გარეშე.`);
  if (toDelete.length === 0) {
    console.log('✅ ყველა პროდუქტს აქვს ვალიდური გამოსახულება! წაშლა არ არის საჭირო.');
    process.exit(0);
  }

  console.log('წასაშლელი პროდუქტები:');
  toDelete.forEach(p => console.log(`   - [${p.id}] ${p.title || p.name}`));

  // 3. Delete from live Cloudflare D1 via DELETE API
  console.log('\n1. ოფიციალური Cloudflare D1-დან წაშლა...');
  for (const p of toDelete) {
    const url = `${LIVE_DELETE_URL}?id=${p.id}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Admin-Slug': ADMIN_SLUG,
          'Authorization': `Bearer ${ADMIN_SLUG}`,
          'x-admin-key': ADMIN_SLUG
        }
      });
      const resData = (await response.json()) as any;
      if (response.ok && resData.success) {
        console.log(`   ✅ წარმატებით წაიშალა D1-დან: ${p.title || p.name}`);
      } else {
        console.warn(`   ⚠️ ვერ წაიშალა D1-დან: ${p.title || p.name}`, JSON.stringify(resData));
      }
    } catch (err: any) {
      console.error(`   ❌ შეცდომა D1-დან წაშლისას ${p.id}:`, err.message);
    }
  }

  // 4. Update local database store_database.json
  console.log('\n2. ლოკალური მონაცემთა ბაზის განახლება...');
  dbData.products = toKeep;
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
  console.log(`   ✅ ლოკალურად წაიშალა ${toDelete.length} პროდუქტი. ბაზაში დარჩა ${toKeep.length} პროდუქტი.`);

  // 5. Trigger sync-catalog.ts
  console.log('\n3. ლოკალური კატალოგის ფაილების სინქრონიზაცია...');
  try {
    execSync('npx tsx scripts/sync-catalog.ts', { stdio: 'inherit' });
  } catch (err: any) {
    console.error('❌ სინქრონიზაციის შეცდომა:', err.message);
  }

  // 6. Push remaining clean products to official site to update KV / Cache
  console.log('\n4. დარჩენილი პროდუქტების სინქრონიზაცია ოფიციალურ საიტზე...');
  try {
    const response = await fetch(LIVE_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Slug': ADMIN_SLUG,
        'Authorization': `Bearer ${ADMIN_SLUG}`,
        'x-admin-key': ADMIN_SLUG
      },
      body: JSON.stringify({ products: toKeep })
    });

    const resData = (await response.json()) as any;
    if (response.ok && resData.success) {
      console.log(`   ✅ წარმატებით განახლდა საიტი! პროდუქტების რაოდენობა: ${resData.products?.length || toKeep.length}`);
    } else {
      console.warn(`   ⚠️ სერვერმა დააბრუნა შეცდომა სინქრონიზაციისას:`, JSON.stringify(resData));
    }
  } catch (err: any) {
    console.error(`   ❌ ვერ დაუკავშირდა სინქრონიზაციის API-ს:`, err.message);
  }

  console.log('\n========================================================');
  console.log('🎉 წაშლისა და სინქრონიზაციის პროცესი წარმატებით დასრულდა!');
  console.log('========================================================');
}

deleteNoImageProducts();
