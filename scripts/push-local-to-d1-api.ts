import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ override: true });

const ADMIN_SLUG = 'dashboard'; // Default admin secret slug

// We will target both the shared preview URL and the official live domain
const TARGET_URLS = [
  'https://ais-pre-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app/api/store/products',
  'https://dbuystore.com/api/store/products'
];

async function pushLocalToD1Api() {
  console.log('========================================================');
  console.log('📤 EXPORTING LOCAL CATALOG TO OFFICIAL SITE VIA PAGES API');
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
    console.error('❌ ლოკალურ ბაზაში პროდუქტები არ მოიძებნა!');
    process.exit(1);
  }

  console.log(`1. ლოკალური ბაზიდან წაკითხულია: ${products.length} პროდუქტი.`);
  console.log('2. პროდუქტების ექსპორტირება ოფიციალურ საიტებზე...');

  for (const url of TARGET_URLS) {
    console.log(`\n📡 მოთხოვნის გაგზავნა: ${url}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Slug': ADMIN_SLUG,
          'Authorization': `Bearer ${ADMIN_SLUG}`,
          'x-admin-key': ADMIN_SLUG
        },
        body: JSON.stringify({ products })
      });

      const data = (await response.json()) as any;
      if (response.ok && data.success) {
        console.log(`   ✅ წარმატებით განახლდა საიტი! პროდუქტების რაოდენობა: ${data.products?.length || products.length}`);
      } else {
        console.warn(`   ⚠️ სერვერმა დააბრუნა შეცდომა:`, data.error || JSON.stringify(data));
      }
    } catch (err: any) {
      console.error(`   ❌ ვერ დაუკავშირდა მისამართს ${url}:`, err.message);
    }
  }

  console.log('\n========================================================');
  console.log('🎉 ექსპორტის პროცესი დასრულდა!');
  console.log('========================================================');
}

pushLocalToD1Api();
