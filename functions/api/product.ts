const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function formatProducts(results: any[]) {
  return results.map((row: any) => {
    let imagesArr: string[] = [];
    if (row.images) {
      if (typeof row.images === 'string') {
        try { imagesArr = JSON.parse(row.images); } catch (e) { imagesArr = []; }
      } else if (Array.isArray(row.images)) {
        imagesArr = row.images;
      }
    }
    if (!Array.isArray(imagesArr) || imagesArr.length === 0) {
      imagesArr = row.image && row.image !== 'null' ? [row.image] : [];
    }

    const primaryImg = imagesArr[0] || (row.image && row.image !== 'null' ? row.image : '');

    return {
      id: row.id,
      title: row.name,
      titleKa: row.name_ka || '',
      description: row.description || '',
      price: Number(row.price) || 0,
      origPrice: Number(row.original_price) || 0,
      image: primaryImg,
      images: imagesArr,
      category: row.category || 'tech',
      stock: Number(row.stock) || 0,
    };
  });
}

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ success: false, error: 'D1 Database binding missing' }, { status: 500, headers: CORS_HEADERS });
  }

  if (request.method === 'GET') {
    try {
      const { results } = await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
      return Response.json(formatProducts(results || []), { headers: CORS_HEADERS });
    } catch (err: any) {
      return Response.json({ success: false, error: err?.message || 'Failed to fetch' }, { status: 500, headers: CORS_HEADERS });
    }
  }

  return Response.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: CORS_HEADERS });
};
