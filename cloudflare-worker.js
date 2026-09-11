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

    // 1. პროდუქტების წამოღება (მხოლოდ რეალური ბაზიდან)
    if (url.pathname === "/api/products" && request.method === "GET") {
      const data = await env.PRODUCTS_KV.get(KV_KEY, { type: "json" });
      // თუ ბაზაში არაფერია, აბრუნებს ცარიელ მასივს და არა დეფოლტ პროდუქტებს!
      const products = data || [];
      return new Response(JSON.stringify(products), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. ადმინიდან ცვლილებების შენახვა (დამატება/განახლება/წაშლა)
    if (url.pathname === "/api/products" && request.method === "POST") {
      try {
        const body = await request.json();
        
        // ინახავს ადმინის მიერ გამოგზავნილ ზუსტ მასივს
        await env.PRODUCTS_KV.put(KV_KEY, JSON.stringify(body));

        return new Response(
          JSON.stringify({ success: true, message: "Products updated successfully in Cloudflare KV" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
