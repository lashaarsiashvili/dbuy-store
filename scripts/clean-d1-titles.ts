import * as dotenv from 'dotenv';

dotenv.config({ override: true });

const ALIBABA_TITLE_SUFFIX_REGEX = /\s*[-|–—]?\s*Buy Product on Alibaba\.com(?:\s*\(Copy\))?\s*$/i;

export function stripAlibabaSuffix(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(ALIBABA_TITLE_SUFFIX_REGEX, '')
    .replace(/\s*[-|–—]?\s*Alibaba\.com\s*$/i, '')
    .replace(/[\s\-|–—]+$/, '')
    .trim();
}

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const TARGET_API_URL = process.env.TARGET_API_URL || 'https://www.dbuystore.com/api/products';
const ADMIN_SLUG = process.env.ADMIN_SLUG || 'dashboard';

export const CLEAN_TITLES_SQL = `
UPDATE products
SET 
  title = TRIM(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(title, ' - Buy Product on Alibaba.com (Copy)', ''),
            ' - Buy Product on Alibaba.com', ''
          ),
          ' - Buy product on Alibaba.com', ''
        ),
        'Buy Product on Alibaba.com', ''
      ),
      'Buy product on Alibaba.com', ''
    ),
    ' -|–—	'
  ),
  name = CASE 
    WHEN name LIKE '%Alibaba.com%' THEN 
      TRIM(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(name, ' - Buy Product on Alibaba.com (Copy)', ''),
                ' - Buy Product on Alibaba.com', ''
              ),
              ' - Buy product on Alibaba.com', ''
            ),
            'Buy Product on Alibaba.com', ''
          ),
          'Buy product on Alibaba.com', ''
        ),
        ' -|–—	'
      )
    ELSE name 
  END
WHERE title LIKE '%Alibaba.com%' OR name LIKE '%Alibaba.com%';
`;

async function cleanTitlesDirectD1(): Promise<boolean> {
  if (!CF_API_TOKEN) {
    return false;
  }
  console.log('📡 Attempting direct Cloudflare D1 query via REST API...');
  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  try {
    const res = await fetch(d1Url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: CLEAN_TITLES_SQL }),
    });
    const data = await res.json() as any;
    if (data.success) {
      console.log('✅ Direct D1 SQL update executed successfully!');
      return true;
    } else {
      console.warn('⚠️ Direct D1 API response error:', data.errors);
      return false;
    }
  } catch (err: any) {
    console.warn('⚠️ Direct D1 API call failed:', err.message);
    return false;
  }
}

async function cleanTitlesViaApi(): Promise<void> {
  console.log(`🔍 Fetching existing live catalog from ${TARGET_API_URL}...`);
  const getRes = await fetch(`${TARGET_API_URL}?limit=all`);
  if (!getRes.ok) {
    console.error(`❌ Failed to fetch products: ${getRes.status} ${getRes.statusText}`);
    return;
  }

  const json = await getRes.json() as any;
  const products: any[] = json.products || json.results || [];
  console.log(`📦 Loaded ${products.length} products from live catalog.`);

  const affected = products.filter(p =>
    (p.title && p.title.includes('Alibaba.com')) ||
    (p.name && p.name.includes('Alibaba.com'))
  );

  console.log(`🎯 Found ${affected.length} products with Alibaba title suffixes.`);

  if (affected.length === 0) {
    console.log('✨ All product titles are already 100% clean!');
    return;
  }

  const updatedProducts = affected.map(p => {
    const cleanTitle = stripAlibabaSuffix(p.title || p.name || '');
    return {
      ...p,
      title: cleanTitle,
      name: cleanTitle,
      titleKa: cleanTitle,
      // Strictly preserve everything else:
      price: Number(p.price) || 0,
      origPrice: Number(p.origPrice ?? p.orig_price ?? p.original_price ?? 0),
      original_price: Number(p.origPrice ?? p.orig_price ?? p.original_price ?? 0),
      description: p.description || '',
      images: Array.isArray(p.images) ? p.images : [p.image || p.imageUrl].filter(Boolean),
      image: p.image || p.imageUrl || '',
      imageUrl: p.imageUrl || p.image || '',
      variants: Array.isArray(p.variants) ? p.variants : [],
      category: p.category || 'general',
      stock: p.stock !== undefined ? Number(p.stock) : 10,
      badge: p.badge || '',
      views: Number(p.views) || 0,
    };
  });

  console.log(`🚀 Updating ${updatedProducts.length} products safely (preserving images, prices, descriptions, variants)...`);

  // Batch updates in chunks of 5
  for (let i = 0; i < updatedProducts.length; i += 5) {
    const chunk = updatedProducts.slice(i, i + 5);
    const postRes = await fetch(TARGET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Slug': ADMIN_SLUG,
        'Authorization': `Bearer ${ADMIN_SLUG}`,
        'x-admin-key': ADMIN_SLUG,
      },
      body: JSON.stringify({ products: chunk }),
    });

    if (postRes.ok) {
      console.log(`   ✅ Chunk ${Math.floor(i / 5) + 1} (${chunk.length} items) saved.`);
    } else {
      console.warn(`   ⚠️ Chunk ${Math.floor(i / 5) + 1} error: ${postRes.status}`);
    }
  }

  console.log('🔍 Re-verifying catalog after update...');
  const verifyRes = await fetch(`${TARGET_API_URL}?limit=all`);
  const verifyJson = await verifyRes.json() as any;
  const verifyProds: any[] = verifyJson.products || verifyJson.results || [];
  const remaining = verifyProds.filter(p =>
    (p.title && p.title.includes('Alibaba.com')) ||
    (p.name && p.name.includes('Alibaba.com'))
  );
  console.log(`🎉 Verification complete. Remaining products with Alibaba suffix: ${remaining.length}`);
}

async function main() {
  console.log('========================================================');
  console.log('🧹 DBUY STORE: CLEAN ALIBABA TITLE SUFFIXES');
  console.log('========================================================');
  await cleanTitlesDirectD1();
  await cleanTitlesViaApi();
  console.log('========================================================');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
