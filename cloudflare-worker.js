// cloudflare-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const KV_KEY = "SITE_PRODUCTS_LIST";

    // 1. პროდუქტების წამოღება Cloudflare D1 ბაზიდან (env.DB)
    if (url.pathname === "/api/products" && request.method === "GET") {
      // Strictly validate Cloudflare D1 env.DB connection
      if (!env || !env.DB || typeof env.DB.prepare !== "function") {
        console.error("[Cloudflare D1 /api/products] Connection Validation Error: env.DB connection is missing or invalid");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Cloudflare D1 database connection unavailable: env.DB binding is missing or invalid",
            products: [],
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        const products = Array.isArray(results) ? results : [];

        return new Response(
          JSON.stringify({
            success: true,
            products,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        console.error("[Cloudflare D1 /api/products] Error executing \"SELECT * FROM products\" query:", err);
        return new Response(
          JSON.stringify({
            success: false,
            error: err?.message || "Database query error while retrieving products",
            products: [],
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 2. ადმინიდან ცვლილებების შენახვა (დამატება/განახლება/წაშლა)
    if (url.pathname === "/api/products" && request.method === "POST") {
      try {
        const body = await request.json();
        let list = [];
        if (Array.isArray(body)) {
          list = body;
        } else if (body && body.id) {
          const currentData = await env.PRODUCTS_KV.get(KV_KEY, { type: "json" });
          const existing = Array.isArray(currentData) ? currentData : [];
          const idx = existing.findIndex((p) => p.id === body.id);
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...body };
          } else {
            existing.unshift(body);
          }
          list = existing;
        }
        
        await env.PRODUCTS_KV.put(KV_KEY, JSON.stringify(list));

        return new Response(
          JSON.stringify({ success: true, message: "Products updated successfully in Cloudflare KV", products: list }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. პროდუქტის წაშლა
    if (url.pathname === "/api/products" && request.method === "DELETE") {
      try {
        const id = url.searchParams.get("id");
        if (!id) {
          return new Response(JSON.stringify({ success: false, error: "Product ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const currentData = await env.PRODUCTS_KV.get(KV_KEY, { type: "json" });
        const existing = Array.isArray(currentData) ? currentData : [];
        const filtered = existing.filter((p) => p.id !== id);
        await env.PRODUCTS_KV.put(KV_KEY, JSON.stringify(filtered));

        return new Response(
          JSON.stringify({ success: true, message: "Product deleted from Cloudflare KV", products: filtered }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
