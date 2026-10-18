export async function handleProductsPost(env: any, request: Request): Promise<Response> {
  try {
    const product: any = await request.json();

    // D1 ბაზაში ჩაწერის ბრძანება (დარწმუნდით რომ env.DB სწორია თქვენი Binding-ისთვის)
    const info = await env.DB.prepare(
      `INSERT INTO products (id, title, price, description, category, imageUrl, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      product.id,
      product.title,
      product.price,
      product.description || "",
      product.category || "",
      product.imageUrl || "",
      product.createdAt || new Date().toISOString()
    ).run();

    if (info.success) {
      return new Response(JSON.stringify({ success: true, product }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error("D1 Insert failed");
    }
  } catch (error: any) {
    console.error("POST შეცდომა:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
