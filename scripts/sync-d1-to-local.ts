import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

dotenv.config({ override: true });

const CF_ACCOUNT_ID = 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const D1_DATABASE_ID = '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const CF_API_TOKEN = 'cfut_fsq3lkgNkuYzBsn6skvvJ2d5OS6uQUgRGToZ7TJwcbc635cb';

// Dictionary of keyword-to-image mappings for beautiful fallback assignments
const KEYWORD_IMAGE_MAP: Array<{ keywords: string[]; file: string }> = [
  { keywords: ['water', 'bottle', 'drinkware', 'aquaminder'], file: 'categories/drinkware.jpg' },
  { keywords: ['collagen', 'protein', 'supplement', 'swanson', 'omega'], file: 'categories/supplements.jpg' },
  { keywords: ['watch', 'wearable', 'whoop', 'band', 'tracker'], file: 'categories/wearables.jpg' },
  { keywords: ['mic', 'microphone', 'audio', 'speakers', 'sound'], file: 'categories/audio.jpg' },
  { keywords: ['case', 'sleeve', 'mouse', 'keyboard', 'laptop'], file: 'categories/tech.jpg' },
];

function getAppropriateFallbackImage(title: string): string {
  const lowerTitle = title.toLowerCase();
  for (const mapping of KEYWORD_IMAGE_MAP) {
    if (mapping.keywords.some(kw => lowerTitle.includes(kw))) {
      return `/uploads/${mapping.file}`;
    }
  }
  return '/uploads/placeholder.jpg';
}

async function syncD1ToLocal() {
  console.log('========================================================');
  console.log('🔄 SYNCING LIVE CLOUDFLARE D1 PRODUCTS TO LOCAL CATALOG');
  console.log('========================================================');

  console.log('1. Cloudflare D1-დან 24-ვე პროდუქტის ამოღება...');
  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;

  try {
    const response = await fetch(d1Url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: 'SELECT * FROM products ORDER BY created_at DESC;',
      }),
    });

    const data = (await response.json()) as any;

    if (!data.success) {
      console.error('❌ შეცდომა D1-დან წამოღებისას:', JSON.stringify(data.errors, null, 2));
      process.exit(1);
    }

    const d1Products = data.result?.[0]?.results || [];
    console.log(`✅ წარმატებით წამოიღო ${d1Products.length} პროდუქტი Cloudflare D1-დან.`);

    if (d1Products.length === 0) {
      console.error('❌ ბაზაში პროდუქტები არ მოიძებნა.');
      process.exit(1);
    }

    console.log('\n2. პროდუქტების ფორმატირება და სანიტარიზაცია...');
    const formattedProducts = d1Products.map((p: any) => {
      const title = p.title || p.name || 'Unnamed Product';
      const imagePath = p.image && p.image.trim() ? p.image : getAppropriateFallbackImage(title);
      
      return {
        id: p.id,
        name: p.name || title,
        title: title,
        titleKa: p.titleKa || p.name_ka || title,
        title_en: p.title_en || title,
        title_ka: p.title_ka || null,
        description: p.description || 'Premium e-commerce item.',
        descriptionKa: p.descriptionKa || p.description_ka || p.description || 'Premium e-commerce item.',
        description_en: p.description_en || p.description || 'Premium e-commerce item.',
        description_ka: p.description_ka || null,
        price: Number(p.price) || 0,
        original_price: p.original_price ? Number(p.original_price) : null,
        origPrice: p.origPrice || (p.original_price ? Number(p.original_price) : undefined),
        category: p.category || 'tech',
        stock: Number(p.stock) || 25,
        badge: p.badge || (p.price === 0 ? 'Freebie' : 'New'),
        image: imagePath,
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [imagePath],
        rating: Number(p.rating) || 5.0,
        reviewsCount: Number(p.reviewsCount) || 0,
        isDeal: p.isDeal !== undefined ? Boolean(p.isDeal) : true,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    // 3. Update store_database.json with the formatted products list
    const dbPath = path.resolve(process.cwd(), 'data', 'store_database.json');
    let existingDb: any = {
      products: [],
      billboards: [],
      theme: { primaryColor: '#2563eb', storeName: 'DBUY Store', currency: '$' },
      lastUpdated: new Date().toISOString()
    };

    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf8');
        existingDb = JSON.parse(raw);
      } catch (err) {
        console.warn('Could not read existing store_database.json, creating fresh default schema.');
      }
    }

    existingDb.products = formattedProducts;
    existingDb.lastUpdated = new Date().toISOString();

    fs.writeFileSync(dbPath, JSON.stringify(existingDb, null, 2));
    console.log(`💾 ლოკალური ბაზა (data/store_database.json) განახლდა 24 ახალი პროდუქტით.`);

    // 4. Trigger sync-catalog.ts script
    console.log('\n3. კატალოგის სინქრონიზაციის სკრიპტის გაშვება...');
    // We can run execSync directly
    execSync('npx tsx scripts/sync-catalog.ts', { stdio: 'inherit' });

    console.log('========================================================');
    console.log('🎉 წარმატება! 24 პროდუქტი წაშლილია და ახლიდან სინქრონიზებულია D1 ბაზიდან!');
    console.log('========================================================');

  } catch (error) {
    console.error('❌ სერვერთან კავშირის შეცდომა:', error);
    process.exit(1);
  }
}

syncD1ToLocal();
