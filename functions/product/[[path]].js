/**
 * Cloudflare Pages Function: /product/[[path]].js
 * 
 * CRITICAL SAFETY NOTICE:
 * - This function is strictly READ-ONLY. It queries the Cloudflare D1 database and transforms HTML responses.
 * - It NEVER modifies, overwrites, drops, or deletes any products, database records, or storage assets.
 * - If a product image is missing in the database, it strictly omits the og:image tag without fallback/placeholders.
 */

export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  
  // 1. Extract product identifier from URL parameter (e.g. /product/prod-123 -> params.path[0] is 'prod-123')
  const pathSegments = params.path || [];
  const productId = pathSegments[0];

  // 2. Detect social media scraper bots based on User-Agent
  const userAgent = request.headers.get('user-agent') || '';
  const botRegex = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterest|embedly|quora link preview|showyoubot|outbrain|vkShare|w3c_validator/i;
  const isBot = botRegex.test(userAgent);

  // If regular user or no product ID, pass through immediately to Vite SPA
  if (!isBot || !productId) {
    return context.next();
  }

  // 3. Connect directly to Cloudflare D1 database binding (`env.DB`)
  let product = null;
  try {
    if (env.DB) {
      // Read-only SQL query against D1 database
      const stmt = env.DB.prepare('SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1');
      const result = await stmt.bind(productId, productId).first();
      
      if (result) {
        product = {
          id: result.id,
          name: result.name || result.title,
          description: result.description,
          price: result.price,
          image: result.image_url || result.image || result.imageUrl
        };
      }
    }
  } catch (err) {
    console.error('D1 Database query error for Open Graph bot request:', err);
  }

  // If product not found in D1, pass through original response
  if (!product) {
    return context.next();
  }

  // Prepare metadata values
  const siteTitle = "DBUY Store";
  const productTitle = product.name ? `${product.name} - ${siteTitle}` : siteTitle;
  const productDescription = product.description 
    ? product.description.replace(/<[^>]*>?/gm, '').substring(0, 160) 
    : `Check out ${product.name || 'this product'} on ${siteTitle}.`;
  
  // Construct absolute image URL if available
  let productImageUrl = null;
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    const rawImg = product.image.trim();
    if (rawImg.startsWith('/')) {
      productImageUrl = `${url.origin}${rawImg}`;
    } else if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
      productImageUrl = rawImg;
    }
  }

  const productUrl = url.toString();

  // 4. Fetch the base response (index.html) from Cloudflare Pages assets
  const response = await context.next();

  // 5. Use HTMLRewriter to bulletproof metadata injection:
  // - Remove existing conflicting meta tags to avoid duplication
  // - Append fresh, dynamic Open Graph and Twitter card tags inside <head>
  let tagsToAppend = `
    <meta property="og:title" content="${escapeHtml(productTitle)}" />
    <meta property="og:description" content="${escapeHtml(productDescription)}" />
    <meta property="og:url" content="${escapeHtml(productUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(productTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(productDescription)}" />
  `;

  // If product image is present, add image tags. If missing, strictly omitted without fallback placeholders.
  if (productImageUrl) {
    tagsToAppend += `
      <meta property="og:image" content="${escapeHtml(productImageUrl)}" />
      <meta name="twitter:image" content="${escapeHtml(productImageUrl)}" />
    `;
  }

  return new HTMLRewriter()
    // Remove existing og: and twitter: meta tags to prevent duplicates
    .on('meta[property^="og:"], meta[name^="twitter:"], meta[property^="twitter:"], title', {
      element(element) {
        element.remove();
      }
    })
    // Append the dynamic Open Graph and Twitter tags right inside <head>
    .on('head', {
      element(element) {
        element.append(`<title>${escapeHtml(productTitle)}</title>\n${tagsToAppend}`, { html: true });
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
