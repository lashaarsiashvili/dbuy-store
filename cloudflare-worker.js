/**
 * cloudflare-worker.js
 * Production-ready Cloudflare Worker handling API routes for products
 * backed by Cloudflare D1 SQL database and GitHub asset image resolution.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

function resolveImageUrl(path) {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('github.com/') && trimmed.includes('/blob/')) {
      return trimmed.replace('/blob/', '/').replace('github.com', 'raw.githubusercontent.com');
    }
    return trimmed;
  }
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }
  
  let clean = trimmed.replace(/^\/+/, '');
  clean = clean.replace(/^(data\/)?(public\/)?uploads\//, '');
  
  return `https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/data/uploads/${clean}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!env || !env.DB || typeof env.DB.prepare !== "function") {
      return new Response(
        JSON.stringify({ success: false, error: "Cloudflare D1 database connection unavailable" }),
        { status: 500, headers: corsHeaders }
      );
    }

    try {
      // GET /api/products -> List all active items
      if (pathname === "/api/products" && request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC"
        ).all();

        const data = (results || []).map((p) => {
          const imgUrl = resolveImageUrl(p.image_path || p.image);
          let imgs = [imgUrl];
          if (p.images) {
            try {
              const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
              if (Array.isArray(parsed)) {
                imgs = parsed.map((i) => resolveImageUrl(i));
              }
            } catch {
              imgs = [imgUrl];
            }
          }
          return {
            ...p,
            image_url: imgUrl,
            image: imgUrl,
            images: imgs,
          };
        });

        return new Response(JSON.stringify({ success: true, count: data.length, data, products: data }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // GET /api/products/:identifier -> Fetch single item by slug or numeric ID
      const match = pathname.match(/^\/api\/products\/([a-zA-Z0-9_-]+)$/);
      if (match && request.method === "GET") {
        const idOrSlug = match[1];
        const product = await env.DB.prepare(
          "SELECT * FROM products WHERE (slug = ? OR id = ?) AND is_active = 1 LIMIT 1"
        )
          .bind(idOrSlug, idOrSlug)
          .first();

        if (!product) {
          return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        const resolvedUrl = resolveImageUrl(product.image_path || product.image);
        let resolvedImgs = [resolvedUrl];
        if (product.images) {
          try {
            const parsed = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            if (Array.isArray(parsed)) {
              resolvedImgs = parsed.map((i) => resolveImageUrl(i));
            }
          } catch {}
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...product,
              image_url: resolvedUrl,
              image: resolvedUrl,
              images: resolvedImgs,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify({ success: false, error: "Not Found" }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err?.message || "Server Error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
