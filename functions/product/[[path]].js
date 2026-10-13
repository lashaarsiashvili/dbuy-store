/**
 * Cloudflare Pages Function: /product/[[path]].js
 * 
 * CRITICAL SAFETY NOTICE:
 * - This function is strictly READ-ONLY. It queries products and transforms HTML responses.
 * - It NEVER modifies, overwrites, drops, or deletes any products, database records, or media files.
 * - If a product image is missing, it skips og:image replacement entirely without placeholders.
 */

const SOCIAL_BOT_REGEX = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterest|slackbot|googlebot|bingbot|yandex|baiduspider/i;

export async function onRequest(context) {
  const { request, params, env, next } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Check User-Agent for social media crawler bots
  const isBot = SOCIAL_BOT_REGEX.test(userAgent);

  // 2. If regular human user, pass through immediately to Vite SPA without changes
  if (!isBot) {
    return next();
  }

  // 3. Extract product identifier from path parameters
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

  if (!productId) {
    return next();
  }

  // 4. Fetch product data (Mock API / D1 fetch logic template)
  const product = await fetchProductData(productId, env);

  if (!product) {
    return next();
  }

  // Fetch the static HTML response from Cloudflare Pages asset pipeline
  const response = await next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  const title = product.title || 'DBUY Store Product';
  const description = product.description || product.subtitle || `Check out ${title} on DBUY Store.`;
  const productUrl = url.toString();
  const productImage = product.image || product.imageUrl || '';

  // 5. Use Cloudflare HTMLRewriter to dynamically replace Open Graph meta tags
  let rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        element.setInnerContent(`🔥 ${title} — DBUY-ში!`);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute('content', `🔥 ${title} — DBUY-ში!`);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute('content', description);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute('content', productUrl);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute('content', `🔥 ${title} — DBUY-ში!`);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute('content', description);
      },
    });

  // CRITICAL RULE: If product image is not found, DO NOT substitute with automated fallback or placeholder.
  // Skip og:image replacement entirely if the specific image is missing.
  if (productImage && productImage.trim() !== '') {
    const absoluteImage = productImage.startsWith('http')
      ? productImage
      : `${url.origin}${productImage.startsWith('/') ? '' : '/'}${productImage}`;

    rewriter = rewriter
      .on('meta[property="og:image"]', {
        element(element) {
          element.setAttribute('content', absoluteImage);
        },
      })
      .on('meta[property="og:image:secure_url"]', {
        element(element) {
          element.setAttribute('content', absoluteImage);
        },
      })
      .on('meta[name="twitter:image"]', {
        element(element) {
          element.setAttribute('content', absoluteImage);
        },
      });
  }

  return rewriter.transform(response);
}

/**
 * Mock API / D1 fetch logic implementation.
 * Replace or connect this with your actual Cloudflare D1 query:
 * e.g., const { results } = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(productId).all();
 */
async function fetchProductData(productId, env) {
  // If env.DB is available (Cloudflare D1), query it read-only:
  if (env && env.DB) {
    try {
      const stmt = env.DB.prepare('SELECT * FROM products WHERE id = ? OR customSlug = ?').bind(productId, productId);
      const row = await stmt.first();
      if (row) return row;
    } catch (err) {
      console.error('D1 read error:', err);
    }
  }

  // Fallback mock catalog for local testing or preview (Strictly Read-Only)
  const mockCatalog = [
    {
      id: 'prod-123',
      title: 'Wireless Noise Cancelling Earbuds Pro',
      description: 'Immersive sound, active noise cancellation, and 30-hour battery life.',
      image: '/uploads/earbuds.jpg'
    },
    {
      id: 'prod-1788877210563',
      title: 'Smart Water Bottle with Temperature Display',
      description: 'Keep your drinks cold or hot with real-time LED temperature display.',
      image: '/uploads/bottle.jpg'
    }
  ];

  return mockCatalog.find(p => p.id === productId || p.customSlug === productId) || null;
}
