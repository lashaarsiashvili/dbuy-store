/**
 * cloudflare-worker.js
 * Production-ready Cloudflare Worker handling API routes for products
 * backed by Cloudflare D1 SQL database and GitHub asset image resolution.
 */

const DEFAULT_GH_USER = "lashaarsiashvili";
const DEFAULT_GH_REPO = "dbuy-store";
const DEFAULT_GH_BRANCH = "main";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
};

function resolveGitHubImageUrl(
  imagePath, 
  owner, 
  repo, 
  branch = "main"
) {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const trimmed = imagePath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const ghUser = env.GITHUB_USER || DEFAULT_GH_USER;
    const ghRepo = env.GITHUB_REPO || DEFAULT_GH_REPO;
    const ghBranch = env.GITHUB_BRANCH || DEFAULT_GH_BRANCH;

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

        const data = (results || []).map((p) => ({
          ...p,
          image_url: resolveGitHubImageUrl(p.image_path || p.image, ghUser, ghRepo, ghBranch),
          image: resolveGitHubImageUrl(p.image_path || p.image, ghUser, ghRepo, ghBranch),
        }));

        return new Response(JSON.stringify({ success: true, count: data.length, data }), {
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

        const resolvedUrl = resolveGitHubImageUrl(product.image_path || product.image, ghUser, ghRepo, ghBranch);
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...product,
              image_url: resolvedUrl,
              image: resolvedUrl,
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
