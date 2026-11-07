import { initialProducts } from '../../src/data/initialProducts';

export interface SeoProduct {
  id: string;
  title: string;
  titleKa?: string;
  titleEn?: string;
  description: string;
  descriptionKa?: string;
  descriptionEn?: string;
  image: string;
  images?: string[];
  price?: number;
  origPrice?: number;
}

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Searches Cloudflare D1 (with fallbacks to store_kv and initialProducts)
 * in strict READ-ONLY mode. Never fails if certain optional columns are missing.
 */
export async function findProductForSeo(db: any, rawIdentifier: string): Promise<SeoProduct | null> {
  if (!rawIdentifier) return null;

  const decodedId = decodeURIComponent(rawIdentifier).trim();
  const decodedLower = decodedId.toLowerCase();
  let row: any = null;

  if (db && typeof db.prepare === 'function') {
    // 1. Direct ID match first (the 'id' column is always guaranteed to exist)
    try {
      row = await db.prepare('SELECT * FROM products WHERE id = ? LIMIT 1').bind(decodedId).first();
    } catch (err) {
      console.warn('[SEO] Direct ID lookup error:', err);
    }

    // 2. If not found by direct ID, scan products table safely in JavaScript (avoids missing column SQL errors)
    if (!row) {
      try {
        const queryRes = await db.prepare('SELECT * FROM products').all();
        const results = Array.isArray(queryRes?.results) ? queryRes.results : [];
        row = results.find((r: any) => {
          const rId = String(r.id || '').toLowerCase().trim();
          const rSlug = String(r.slug || r.customSlug || r.custom_slug || '').toLowerCase().trim();
          const rTitle = String(r.title || r.name || '').toLowerCase().trim();
          const rTitleKa = String(r.title_ka || r.name_ka || '').toLowerCase().trim();
          const rSlugified = slugify(r.title || r.name || '');
          return (
            rId === decodedLower ||
            (rSlug && rSlug === decodedLower) ||
            rTitle === decodedLower ||
            rTitleKa === decodedLower ||
            rSlugified === decodedLower
          );
        });
      } catch (err) {
        console.warn('[SEO] Relational products scan error:', err);
      }
    }

    // 3. Fallback to store_kv 'products' cache if relational lookup didn't find it
    if (!row) {
      try {
        const kvRes: any = await db.prepare("SELECT value FROM store_kv WHERE key = 'products' LIMIT 1").first();
        if (kvRes?.value) {
          const kvProds = JSON.parse(kvRes.value);
          if (Array.isArray(kvProds)) {
            row = kvProds.find((r: any) => {
              const rId = String(r.id || '').toLowerCase().trim();
              const rSlug = String(r.slug || r.customSlug || r.custom_slug || '').toLowerCase().trim();
              const rTitle = String(r.title || r.name || '').toLowerCase().trim();
              const rTitleKa = String(r.title_ka || r.name_ka || '').toLowerCase().trim();
              const rSlugified = slugify(r.title || r.name || '');
              return (
                rId === decodedLower ||
                (rSlug && rSlug === decodedLower) ||
                rTitle === decodedLower ||
                rTitleKa === decodedLower ||
                rSlugified === decodedLower
              );
            });
          }
        }
      } catch (err) {
        console.warn('[SEO] store_kv products lookup notice:', err);
      }
    }
  }

  // 4. Fallback to initialProducts static catalog
  if (!row) {
    row = initialProducts.find((p) => {
      const pId = String(p.id).toLowerCase().trim();
      const pSlug = p.customSlug ? p.customSlug.toLowerCase().trim() : '';
      const pTitle = p.title ? p.title.toLowerCase().trim() : '';
      const pTitleKa = p.titleKa || p.title_ka ? String(p.titleKa || p.title_ka).toLowerCase().trim() : '';
      const pSlugified = slugify(p.title);
      return (
        pId === decodedLower ||
        (pSlug && pSlug === decodedLower) ||
        pTitle === decodedLower ||
        pTitleKa === decodedLower ||
        pSlugified === decodedLower
      );
    });
  }

  if (!row) return null;

  // Resolve titles
  const titleKa = String(row.title_ka || row.titleKa || row.title || row.name || 'Product').trim();
  const titleEn = String(row.title_en || row.titleEn || row.title || row.name || 'Product').trim();

  // Resolve descriptions
  const rawDescKa = String(
    row.description_ka || row.descriptionKa || row.description || row.description_en || ''
  ).trim();
  const cleanDescKa = rawDescKa.replace(/<[^>]*>?/gm, '').trim();

  const rawDescEn = String(
    row.description_en || row.descriptionEn || row.description || ''
  ).trim();
  const cleanDescEn = rawDescEn.replace(/<[^>]*>?/gm, '').trim();

  // Resolve image (checking primary image and JSON arrays)
  let image = String(row.imageUrl || row.image || row.image_url || row.image_path || '').trim();
  let images: string[] = [image].filter(Boolean);
  if (row.images || row.images_json) {
    try {
      const parsed = typeof row.images === 'string'
        ? JSON.parse(row.images)
        : (typeof row.images_json === 'string' ? JSON.parse(row.images_json) : row.images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        images = parsed.map((img: any) => String(img).trim());
        if (!image) image = images[0];
      }
    } catch (e) {}
  }

  const price = Number(row.price) || 0;
  const origPrice = Number(row.origPrice ?? row.orig_price ?? row.original_price ?? row.originalPrice ?? 0);

  return {
    id: String(row.id || rawIdentifier),
    title: titleKa,
    titleKa,
    titleEn,
    description: cleanDescKa,
    descriptionKa: cleanDescKa,
    descriptionEn: cleanDescEn,
    image,
    images,
    price,
    origPrice: origPrice > price ? origPrice : undefined,
  };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_SEO_GEL_RATE = 2.60;

/**
 * Injects Open Graph (og:) and Twitter Card meta tags for Facebook and social media crawlers.
 * Dynamically renders language and currency based on ?lang= parameter (e.g. ?lang=en).
 */
export function injectProductOpenGraphResponse(
  response: Response,
  product: SeoProduct,
  requestUrl: string,
  exchangeRate: number = DEFAULT_SEO_GEL_RATE
): Response {
  const url = new URL(requestUrl);
  const siteTitle = 'DBUY Store';

  const rawPrice = product.price || 0;
  
  let currencyCode = 'USD';
  let priceAmount = rawPrice;
  let displayTitle = product.titleEn || product.title;

  let seoTitle = `🔥 ${displayTitle} — Only $${rawPrice} | Worldwide Shipping 🌍`;
  let seoDesc = `Premium quality at direct value. Order now at DBUY Store with Fast & Secure Worldwide Shipping!`;


  // Facebook & Social Crawlers strictly require absolute URLs with https://
  let seoImage = 'https://dbuystore.com/icon.png';
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    const rawImg = product.image.trim();
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      seoImage = rawImg;
    } else {
      const cleanPath = rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
      const host = url.host && !url.host.includes('localhost') ? url.host : 'dbuystore.com';
      seoImage = `https://${host}${cleanPath}`;
    }
  }

  const seoUrl = url.toString();

  // Dynamic Tags Block for <head>
  const dynamicTags = `
    <title>${escapeHtml(seoTitle)}</title>
    <meta name="description" content="${escapeHtml(seoDesc)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${escapeHtml(siteTitle)}" />
    <meta property="og:title" content="${escapeHtml(seoTitle)}" id="og-title" />
    <meta property="og:description" content="${escapeHtml(seoDesc)}" id="og-description" />
    <meta property="og:url" content="${escapeHtml(seoUrl)}" id="og-url" />
    ${(product.images || [product.image]).map(img => `<meta property="og:image" content="${escapeHtml(img)}" />`).join('\n    ')}
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${escapeHtml(siteTitle)}" />
    <meta property="product:price:currency" content="${currencyCode}" id="og-price-currency" />

    ${priceAmount > 0 ? `<meta property="product:price:amount" content="${priceAmount}" id="og-price-amount" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seoTitle)}" id="twitter-title" />
    <meta name="twitter:description" content="${escapeHtml(seoDesc)}" id="twitter-description" />
    <meta name="twitter:image" content="${escapeHtml(seoImage)}" id="twitter-image" />
    <meta name="twitter:image:alt" content="${escapeHtml(displayTitle)}" id="twitter-image-alt" />
  `;

  // Use Cloudflare HTMLRewriter to remove stale static tags and append dynamic product tags
  if (typeof HTMLRewriter !== 'undefined') {
    return new HTMLRewriter()
      .on('title, meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], meta[name="description"], meta[property^="product:"]', {
        element(element) {
          element.remove();
        },
      })
      .on('head', {
        element(element) {
          element.append(dynamicTags, { html: true });
        },
      })
      .transform(response);
  }

  return response;
}
