export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug, x-admin-key',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

async function ensureProductReviewsTable(db: any): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS product_reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        title TEXT DEFAULT '',
        comment TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        review_date TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run();

  try {
    await db
      .prepare('CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id)')
      .run();
  } catch {
    // Index creation failure is non-fatal
  }
}

function normalizeRow(row: any) {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    author_name: String(row.author_name || 'Verified Buyer'),
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
    title: row.title ? String(row.title) : '',
    comment: String(row.comment || ''),
    verified: Boolean(Number(row.verified) === 1 || row.verified === true),
    review_date: row.review_date ? String(row.review_date) : '',
    created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

function summarizeReviews(reviews: ReturnType<typeof normalizeRow>[]) {
  const totalCount = reviews.length;
  const averageRating =
    totalCount > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount) * 10) / 10
      : 5.0;
  return { totalCount, averageRating };
}

function formatMonthYearNow(): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const d = new Date();
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!env || !env.DB || typeof env.DB.prepare !== 'function') {
    return jsonResponse({
      success: false,
      error: 'Cloudflare D1 database connection unavailable',
      reviews: [],
      totalCount: 0,
      averageRating: 5.0,
    }, 500);
  }

  try {
    await ensureProductReviewsTable(env.DB);
    const url = new URL(request.url);

    // 1. GET /api/reviews?productId=...
    if (request.method === 'GET') {
      const productId = (url.searchParams.get('productId') || '').trim();
      let rows: any[] = [];

      if (productId) {
        const res = await env.DB.prepare(
          'SELECT id, product_id, author_name, rating, title, comment, verified, review_date, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC'
        )
          .bind(productId)
          .all();
        rows = Array.isArray(res?.results) ? res.results : [];
      } else {
        const res = await env.DB.prepare(
          'SELECT id, product_id, author_name, rating, title, comment, verified, review_date, created_at FROM product_reviews ORDER BY created_at DESC LIMIT 300'
        ).all();
        rows = Array.isArray(res?.results) ? res.results : [];
      }

      const reviews = rows.map(normalizeRow);
      const { totalCount, averageRating } = summarizeReviews(reviews);

      return jsonResponse({
        success: true,
        reviews,
        totalCount,
        averageRating,
      });
    }

    // 2. POST /api/reviews (batch import OR logged-in customer review)
    if (request.method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const productId = String(body.productId || body.product_id || '').trim();

      if (!productId) {
        return jsonResponse({ success: false, error: 'productId is required' }, 400);
      }

      // Batch import of extracted HTML reviews
      if (Array.isArray(body.reviews)) {
        const items = body.reviews.slice(0, 15);
        let insertedCount = 0;

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const comment = String(item?.comment || '').trim().slice(0, 1500);
          if (!comment) continue;

          const id = `rev_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
          const authorName = String(item?.author_name || 'Verified Buyer').trim().slice(0, 60) || 'Verified Buyer';
          const rating = Math.min(5, Math.max(1, Math.round(Number(item?.rating) || 5)));
          const title = String(item?.title || '').trim().slice(0, 160);
          const verified = item?.verified ? 1 : 0;
          const reviewDate = String(item?.review_date || '').trim().slice(0, 40);
          const createdAt = new Date(Date.now() - idx * 1000).toISOString();

          await env.DB.prepare(
            `INSERT OR REPLACE INTO product_reviews (id, product_id, author_name, rating, title, comment, verified, review_date, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(id, productId, authorName, rating, title, comment, verified, reviewDate, createdAt)
            .run();
          insertedCount++;
        }

        const res = await env.DB.prepare(
          'SELECT id, product_id, author_name, rating, title, comment, verified, review_date, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC'
        )
          .bind(productId)
          .all();
        const reviews = (Array.isArray(res?.results) ? res.results : []).map(normalizeRow);
        const { totalCount, averageRating } = summarizeReviews(reviews);

        return jsonResponse({
          success: true,
          insertedCount,
          reviews,
          totalCount,
          averageRating,
        });
      }

      // Single customer review submission
      const userEmail = String(body.userEmail || body.email || '').trim();
      if (!userEmail || !userEmail.includes('@')) {
        return jsonResponse({ success: false, error: 'Please sign in to your dbuystore.com account to submit a review.' }, 401);
      }

      const comment = String(body.comment || '').trim().slice(0, 1500);
      if (comment.length < 2) {
        return jsonResponse({ success: false, error: 'Review comment cannot be empty.' }, 400);
      }

      const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const authorName = String(body.author_name || body.userName || userEmail.split('@')[0] || 'Customer')
        .trim()
        .slice(0, 60);
      const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
      const title = String(body.title || '').trim().slice(0, 160);
      const verified = body.verified === false ? 0 : 1;
      const reviewDate = String(body.review_date || formatMonthYearNow()).trim().slice(0, 40);
      const createdAt = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO product_reviews (id, product_id, author_name, rating, title, comment, verified, review_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(id, productId, authorName, rating, title, comment, verified, reviewDate, createdAt)
        .run();

      const res = await env.DB.prepare(
        'SELECT id, product_id, author_name, rating, title, comment, verified, review_date, created_at FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC'
      )
        .bind(productId)
        .all();
      const reviews = (Array.isArray(res?.results) ? res.results : []).map(normalizeRow);
      const { totalCount, averageRating } = summarizeReviews(reviews);

      return jsonResponse({
        success: true,
        review: normalizeRow({
          id,
          product_id: productId,
          author_name: authorName,
          rating,
          title,
          comment,
          verified,
          review_date: reviewDate,
          created_at: createdAt,
        }),
        reviews,
        totalCount,
        averageRating,
      });
    }

    // 3. DELETE /api/reviews?id=...
    if (request.method === 'DELETE') {
      let reviewId = (url.searchParams.get('id') || '').trim();
      if (!reviewId) {
        const body: any = await request.json().catch(() => ({}));
        reviewId = String(body?.id || '').trim();
      }

      if (!reviewId) {
        return jsonResponse({ success: false, error: 'Review id is required' }, 400);
      }

      await env.DB.prepare('DELETE FROM product_reviews WHERE id = ?').bind(reviewId).run();

      return jsonResponse({ success: true, deletedId: reviewId });
    }

    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  } catch (err: any) {
    console.error('[D1 REVIEWS ERROR]:', err);
    return jsonResponse({
      success: false,
      error: err?.message || 'Failed to process product reviews request',
    }, 500);
  }
};
