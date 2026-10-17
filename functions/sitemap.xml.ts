/// <reference types="@cloudflare/workers-types" />

import { initialProducts } from '../src/data/initialProducts';

interface Env {
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const baseUrl = 'https://dbuystore.com';

  try {
    const urls: Array<{ loc: string; changefreq: string; priority: string }> = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${baseUrl}/about`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/contact`, changefreq: 'weekly', priority: '0.8' },
      { loc: `${baseUrl}/guarantee`, changefreq: 'monthly', priority: '0.7' },
      { loc: `${baseUrl}/returns`, changefreq: 'monthly', priority: '0.7' },
      { loc: `${baseUrl}/privacy`, changefreq: 'monthly', priority: '0.7' },
    ];

    let dbProducts: any[] = [];

    // Query Cloudflare D1 in strict READ-ONLY mode
    if (env && env.DB && typeof env.DB.prepare === 'function') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, custom_slug, slug, title, title_ka FROM products'
        ).all();
        if (results && Array.isArray(results) && results.length > 0) {
          dbProducts = results;
        }
      } catch (err) {
        console.warn('[Sitemap Function] D1 database query failed, falling back to local catalog:', err);
      }
    }

    // Combine D1 products or fallback to initialProducts catalog
    const productsToMap = dbProducts.length > 0 ? dbProducts : initialProducts;

    if (productsToMap && productsToMap.length > 0) {
      productsToMap.forEach((product) => {
        const pId = product.id;
        const customSlug = product.custom_slug || product.customSlug;
        const rawTitle = product.title_ka || product.titleKa || product.title || 'product';
        
        const slug = customSlug
          ? encodeURIComponent(String(customSlug).trim())
          : encodeURIComponent(
              String(rawTitle)
                .toLowerCase()
                .trim()
                .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
            );

        const loc = customSlug
          ? `${baseUrl}/b/${slug}`
          : `${baseUrl}/product/${pId}/${slug}`;

        urls.push({
          loc,
          changefreq: 'weekly',
          priority: '0.8',
        });
      });
    }

    const xmlItems = urls
      .map(
        (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
      )
      .join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;

    return new Response(sitemap.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error: any) {
    console.error('[Sitemap Function] Error generating dynamic sitemap:', error);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
