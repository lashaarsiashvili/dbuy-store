/**
 * Cloudflare Pages Function: /product/[[path]].js
 * 
 * STRICT RULES & SAFETY:
 * - Read-only Cloudflare D1 query. Never modifies, updates, or deletes database records.
 * - No fallback images: if image is missing in database, og:image and twitter:image are strictly omitted.
 * - Bot interception for social sharing previews; regular visitors pass through to Vite SPA.
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // 1. Check User-Agent against a comprehensive bot regex for social scrapers
  const userAgent = request.headers.get('user-agent') || '';
  const botRegex = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterest|embedly|quora link preview|showyoubot|outbrain|vkShare|w3c_validator|slackbot/i;
  const isBot = botRegex.test(userAgent);

  // 2. Extract product identifier from URL path (e.g. /product/prod-123 -> params.path[0])
  const pathSegments = params.path || [];
  const productId = pathSegments[0];

  // If regular user (not a bot) or productId is missing, pass through immediately to SPA
  if (!isBot || !productId) {
    return context.next();
  }

  // 3. Query Cloudflare D1 database in strict READ-ONLY mode
  let product = null;
  try {
    if (env.DB) {
      const stmt = env.DB.prepare('SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1');
      const result = await stmt.bind(productId, productId).first();
      
      if (result) {
        product = {
          name: result.name || result.title || 'Product',
          description: result.description || '',
          image: result.image_url || result.image || result.imageUrl || null
        };
      }
    }
  } catch (err) {
    console.error('D1 database query error during bot intercept:', err);
  }

  // If product not found, pass through original response
  if (!product) {
    return context.next();
  }

  // 4. Prepare metadata values
  const siteTitle = "DBUY Store";
  const productTitle = `${product.name} - ${siteTitle}`;
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>?/gm, '').substring(0, 160)
    : `Check out ${product.name} on ${siteTitle}.`;
  
  const productUrl = url.toString();

  // Validate and format image URL without fallback placeholders
  let productImageUrl = null;
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    const rawImg = product.image.trim();
    if (rawImg.startsWith('/')) {
      productImageUrl = `${url.origin}${rawImg}`;
    } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      productImageUrl = rawImg;
    }
  }

  // 5. Fetch the base HTML response from Cloudflare Pages
  const response = await context.next();

  // 6. Build dynamic meta tags
  let dynamicTags = `
    <title>${escapeHtml(productTitle)}</title>
    <meta property="og:title" content="${escapeHtml(productTitle)}" />
    <meta property="og:description" content="${escapeHtml(cleanDescription)}" />
    <meta property="og:url" content="${escapeHtml(productUrl)}" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(productTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(cleanDescription)}" />
  `;

  // Append image tags ONLY if image exists in DB. Strictly NO fallback images.
  if (productImageUrl) {
    dynamicTags += `
      <meta property="og:image" content="${escapeHtml(productImageUrl)}" />
      <meta name="twitter:image" content="${escapeHtml(productImageUrl)}" />
    `;
  }

  // 7. Use HTMLRewriter to remove existing tags and append new ones
  return new HTMLRewriter()
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], title', {
      element(element) {
        element.remove();
      }
    })
    .on('head', {
      element(element) {
        element.append(dynamicTags, { html: true });
      }
    })
    .transform(response);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
