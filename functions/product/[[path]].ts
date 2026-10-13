/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: /product/[[path]]
 * Intercepts product route requests, detects social media crawler bots via User-Agent,
 * queries Cloudflare D1 database (or falls back to initialProducts catalog) in READ-ONLY mode,
 * and uses Cloudflare Edge HTMLRewriter to dynamically inject Open Graph (og:) and Twitter card meta tags.
 * Regular human visitors pass through directly to the Vite/React SPA without modification.
 */

import { initialProducts } from '../../src/data/initialProducts';

interface Env {
  DB?: D1Database;
}

// List of known social media crawler bot user-agents
const SOCIAL_BOT_REGEX = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterest|embedly|quora link preview|showyoubot|outbrain|vkshare|w3c_validator|slackbot|googlebot|bingbot|yandex|baiduspider/i;

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Detect if the request is coming from a social media crawler bot
  const isBot = SOCIAL_BOT_REGEX.test(userAgent);

  // If it's a regular human user, pass straight through to the Vite SPA without overhead
  if (!isBot) {
    return context.next();
  }

  // 2. Extract product identifier (ID or slug) from path parameters
  let productId = '';
  if (params.path) {
    if (Array.isArray(params.path)) {
      productId = params.path[0] || '';
    } else {
      productId = String(params.path).split('/')[0] || '';
    }
  }

  if (!productId) {
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    productId = segments[1] || '';
  }

  // If productId is missing, pass through original response
  if (!productId) {
    return context.next();
  }

  // 3. Fetch product data from Cloudflare D1 database in strict READ-ONLY mode
  let product: { title: string; description: string; image?: string | null; price?: number } | null = null;
  const decodedId = decodeURIComponent(productId).trim();

  if (env.DB) {
    try {
      const stmt = env.DB.prepare(
        'SELECT * FROM products WHERE id = ? OR custom_slug = ? OR slug = ? OR LOWER(title) = ? LIMIT 1'
      );
      const result: any = await stmt.bind(decodedId, decodedId, decodedId, decodedId.toLowerCase()).first();

      if (result) {
        product = {
          title: result.title_ka || result.titleKa || result.title || result.name || 'Product',
          description: result.description || '',
          image: result.image_url || result.image || result.imageUrl || null,
          price: result.price ? Number(result.price) : undefined,
        };
      }
    } catch (err) {
      console.error('D1 database query error during bot intercept:', err);
    }
  }

  // Fallback to initialProducts catalog if not found in D1 or D1 binding unavailable
  if (!product) {
    const decodedLower = decodedId.toLowerCase();
    const found = initialProducts.find((p) => {
      const idMatch = String(p.id).toLowerCase() === decodedLower;
      const slugMatch = p.customSlug && p.customSlug.toLowerCase().trim() === decodedLower;
      const genSlugMatch = p.title && p.title.toLowerCase().trim().replace(/\s+/g, '-') === decodedLower;
      return idMatch || slugMatch || genSlugMatch;
    });

    if (found) {
      product = {
        title: found.titleKa || found.title_ka || found.title,
        description: found.description || '',
        image: found.image || null,
        price: found.price || 0,
      };
    }
  }

  // If still no product found, pass through original response
  if (!product) {
    return context.next();
  }

  // 4. Prepare metadata values
  const siteTitle = 'DBUY Store';
  const productTitle = product.price
    ? `🔥 ${product.title} — მხოლოდ ${product.price} ₾ DBUY-ში!`
    : `${product.title} — ${siteTitle}`;

  const rawDesc = product.description
    ? product.description.replace(/<[^>]*>?/gm, '').trim().substring(0, 200)
    : `შეიძინეთ ${product.title} საუკეთესო ფასად DBUY-ში! 🚚 სწრაფი მიწოდება მთელ საქართველოში.`;
  const cleanDescription = rawDesc || `შეიძინეთ ${product.title} DBUY-ში.`;

  const pageUrl = url.toString();

  // Validate and format image URL. STRICT NO FALLBACK PLACEHOLDER IMAGES if image is missing.
  let productImageUrl: string | null = null;
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    const rawImg = product.image.trim();
    if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      productImageUrl = rawImg;
    } else if (rawImg.startsWith('/')) {
      productImageUrl = `${url.origin}${rawImg}`;
    } else {
      productImageUrl = `${url.origin}/${rawImg}`;
    }
  }

  // 5. Fetch base HTML response from Cloudflare Pages asset pipeline
  const response = await context.next();

  // 6. Build dynamic meta tags
  let dynamicTags = `
    <title>${escapeHtml(productTitle)}</title>
    <meta name="description" content="${escapeAttr(cleanDescription)}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeAttr(productTitle)}" />
    <meta property="og:description" content="${escapeAttr(cleanDescription)}" />
    <meta property="og:url" content="${escapeAttr(pageUrl)}" />
    <meta property="og:site_name" content="${escapeAttr(siteTitle)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(productTitle)}" />
    <meta name="twitter:description" content="${escapeAttr(cleanDescription)}" />
  `;

  if (productImageUrl) {
    dynamicTags += `
    <meta property="og:image" content="${escapeAttr(productImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeAttr(productImageUrl)}" />
    <meta name="twitter:image" content="${escapeAttr(productImageUrl)}" />
    `;
  }

  // 7. Use HTMLRewriter to remove existing tags and append dynamic tags to <head>
  return new HTMLRewriter()
    .on('title, meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], meta[name="description"]', {
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
};

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}
