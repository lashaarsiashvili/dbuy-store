if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json<any>().catch(() => null);
      if (!body) {
        return jsonResponse({ success: false, error: 'Invalid JSON payload' }, 400);
      }

      const rawList = Array.isArray(body) ? body : (Array.isArray(body.products) ? body.products : [body]);
      const savedProducts: any[] = [];

      for (const product of rawList) {
        if (!product || typeof product !== 'object') continue;

        const id = String(product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const title = product.title || product.titleKa || product.name || 'Product';
        const price = Number(product.price) || 0;
        const description = product.description || product.description_en || '';
        const category = product.category || 'general';
        const imageUrl = product.imageUrl || product.image || (Array.isArray(product.images) ? product.images[0] : '') || '';

        console.log('[D1 SAFE WRITE]: Saving product:', id, title);

        // ძირითადი და უსაფრთხო SQL ჩაწერა, რომელიც არასდროს გამოიწვევს სვეტის შეცდომას
        await env.DB.prepare(`
          INSERT OR REPLACE INTO products (id, title, price, description, category, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          id, title, price, description, category, imageUrl
        ).run();

        savedProducts.push({
          id,
          title,
          price,
          description,
          category,
          imageUrl,
          image: imageUrl,
        });
      }

      return jsonResponse({
        success: true,
        product: savedProducts[0],
        products: savedProducts,
      }, 200);
    }
