export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 1. Dynamic Sitemap Generation
  const baseUrl = "https://www.dbuystore.com";
  interface ProductRecord { id: string; }

  if (url.pathname === "/sitemap.xml") {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id FROM products"
      ).all<{ id: string | number }>();

      const today = new Date().toISOString().split("T")[0];

      const productUrls = (results || [])
        .map((item) => `
    <url>
      <loc>${baseUrl}/product/${item.id}</loc>
      <lastmod>${today}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`)
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${productUrls}
</urlset>`;

      return new Response(xml.trim(), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (err: any) {
      return new Response(`Error generating sitemap: ${err?.message || err}`, { 
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  }

  // 2. Dynamic robots.txt Delivery
  if (url.pathname === "/robots.txt") {
    return new Response(
      "User-agent: *\nAllow: /\nSitemap: https://www.dbuystore.com/sitemap.xml",
      {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  // 3. Edge HTML Rewriting for Bots & Social Crawlers
  const botRegex = /Googlebot|bingbot|facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Applebot|TelegramBot|Discordbot/i;
  const userAgent = request.headers.get("User-Agent") || "";

  if (url.pathname.startsWith("/product/")) {
    const productMatch = url.pathname.match(/^\/product\/([^\/]+)(?:\/.*)?$/);
    
    if (productMatch && botRegex.test(userAgent)) {
      const productId = decodeURIComponent(productMatch[1]);
      const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1")
        .bind(productId)
        .first<any>();

      if (product) {
        const response = await next();

        // Clean metadata
        let imageUrl = product.image;
        try {
          const parsedImage = JSON.parse(product.image);
          if (Array.isArray(parsedImage)) imageUrl = parsedImage[0];
        } catch (e) {}
        
        // Enrich metadata for AI Overviews (in-memory, no D1 modification)
        const rawDesc = product.description || "Premium quality product available at DBUY Store.";
        
        // Structured Enrichment Formula
        const enrichedDescription = `${product.title} is designed for users seeking ${rawDesc.substring(0, 100).toLowerCase()}... 
        
Key Highlights:
- High-performance build quality for long-term reliability.
- Optimized for seamless integration and ease of use.
- Designed to solve core daily tasks with efficiency.

Technical Specifications:
- Material: Durable high-grade components.
- Compatibility: Universal standards.
- Build: Ergonomic design.

FAQ:
Q: What is the primary use case? A: Designed for efficient daily operation and reliability.
Q: Is it compatible? A: Yes, follows universal standards for broad compatibility.`;

        const jsonLd = JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": product.title,
          "image": imageUrl,
          "description": enrichedDescription, // Using enriched format for AI Overviews
          "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
          },
        });

        return new HTMLRewriter()
          .on("title", {
            element(el) { el.setInnerContent(`${product.title} | DBUY Store`); }
          })
          .on("head", {
            element(el) {
              el.append(`
<meta name="description" content="${enrichedDescription.substring(0, 160)}" />
<link rel="canonical" href="https://www.dbuystore.com/product/${productId}" />
<meta property="og:title" content="${product.title}" />
<meta property="og:description" content="${enrichedDescription.substring(0, 160)}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="https://www.dbuystore.com/product/${productId}" />
<meta property="og:type" content="product" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${jsonLd}</script>`, { html: true });
            }
          })
          .transform(response);
      }
    }
  }

  // 4. Default Passthrough
  return next();
};
