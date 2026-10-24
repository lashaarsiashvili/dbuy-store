export const onRequest: PagesFunction<{ DB: D1Database }> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // 1. Dynamic Sitemap Generation
  if (url.pathname === "/sitemap.xml") {
    try {
      const { results } = await env.DB.prepare(
        "SELECT id, updatedAt, updated_at FROM products"
      ).all();
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.dbuystore.com/</loc>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
  </url>
  ${results.map((item: any) => `
  <url>
    <loc>https://www.dbuystore.com/product/${item.id}</loc>
    <lastmod>${new Date(item.updatedAt || item.updated_at || Date.now()).toISOString()}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
  </url>`).join('')}
</urlset>`;

      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    } catch (e) {
      return new Response("Error generating sitemap", { status: 500 });
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

  if (url.pathname.startsWith("/product/") && botRegex.test(userAgent)) {
    const id = url.pathname.split("/")[2];
    const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? LIMIT 1").bind(id).first();

    if (product) {
      const response = await next();

      // Clean metadata
      let imageUrl = product.image;
      try {
        const parsedImage = JSON.parse(product.image);
        if (Array.isArray(parsedImage)) imageUrl = parsedImage[0];
      } catch (e) {}
      
      const cleanDescription = (product.description || "")
        .replace(/[\r\n]+/g, " ")
        .substring(0, 150) + "...";

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.title,
        "image": imageUrl,
        "description": cleanDescription,
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
<meta name="description" content="${cleanDescription}" />
<link rel="canonical" href="https://www.dbuystore.com/product/${id}" />
<meta property="og:title" content="${product.title}" />
<meta property="og:description" content="${cleanDescription}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="https://www.dbuystore.com/product/${id}" />
<meta property="og:type" content="product" />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">${jsonLd}</script>`, { html: true });
          }
        })
        .transform(response);
    }
  }

  // 4. Default Passthrough
  return next();
};
