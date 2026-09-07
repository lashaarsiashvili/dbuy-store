import fs from 'fs';
import path from 'path';
import { initialProducts } from '../src/data/initialProducts';

function generateSitemapSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateSitemapXML(products: any[]): string {
  const urls = [
    { loc: 'https://dbuystore.com/', changefreq: 'daily', priority: '1.0' },
    { loc: 'https://dbuystore.com/about', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://dbuystore.com/contact', changefreq: 'weekly', priority: '0.8' },
    { loc: 'https://dbuystore.com/guarantee', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://dbuystore.com/returns', changefreq: 'monthly', priority: '0.7' },
    { loc: 'https://dbuystore.com/privacy', changefreq: 'monthly', priority: '0.7' }
  ];

  if (Array.isArray(products)) {
    products.forEach(p => {
      const slug = p.customSlug?.trim() || generateSitemapSlug(p.title);
      const urlPath = p.customSlug 
        ? `/b/${encodeURIComponent(slug)}` 
        : `/product/${p.id}/${encodeURIComponent(slug)}`;
      urls.push({
        loc: `https://dbuystore.com${urlPath}`,
        changefreq: 'weekly',
        priority: '0.9'
      });
    });
  }

  const xmlItems = urls.map(item => `  <url>
    <loc>${item.loc}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;
}

function run() {
  console.log('[SITEMAP] Running static sitemap generator...');
  
  // Try to load products from local JSON store as primary source of truth if available
  let products = [...initialProducts];
  const dbPath = path.join(process.cwd(), 'data', 'store_database.json');
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const db = JSON.parse(raw);
      if (db && Array.isArray(db.products)) {
        products = db.products;
        console.log(`[SITEMAP] Found ${products.length} products in local store_database.json`);
      }
    } catch (e) {
      console.warn('[SITEMAP] Could not parse store_database.json, falling back to initialProducts.ts');
    }
  }

  const xmlContent = generateSitemapXML(products);

  // Write to public folder
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xmlContent, 'utf-8');
  console.log(`[SITEMAP] Generated public/sitemap.xml successfully with ${products.length} products.`);

  // Write to dist folder if it exists (for fast production deployment serving)
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xmlContent, 'utf-8');
    console.log('[SITEMAP] Copied sitemap.xml to dist/sitemap.xml.');
  }
}

// Only execute directly when run as a script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('generate-sitemap.ts')) {
  run();
}
