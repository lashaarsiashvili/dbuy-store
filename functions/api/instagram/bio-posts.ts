const DEFAULT_FB_PAGE_ID = '215073415343195';
const DEFAULT_FB_PAGE_TOKEN = 'EAAXgEb3A7ZCABS4HbURXoldCfeC5ZCSaLzYPqZA9Jo4UNZAR1qc9IKZBmuKNBocgaQbSFiHe4Q7ZA1EZBmZBPK7S5V7a5xSa5tFdCn84SwtgqjXydaqRHrqZATJO83oehDDFwQsq6VSZCyZB5Fv7cFxzeZBDQcumPvjzm66oP4DtWdvIu8K6lg5sI4woPQh9xrrK';
const GRAPH_VERSION = 'v26.0';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

function extractProductIdFromCaption(caption: string): string | null {
  if (!caption) return null;
  const idMatch =
    caption.match(/search\s*ID:\s*([A-Za-z0-9_-]+)/i) ||
    caption.match(/\b(prod-[A-Za-z0-9_-]+)\b/i) ||
    caption.match(/dbuystore\.com\/b\/([A-Za-z0-9_-]+)/i);
  return idMatch?.[1]?.trim() || null;
}

export async function onRequestGet(context: any) {
  const env = context.env || {};
  const db = env?.DB;
  const postsMap = new Map<string, any>();

  // 1. Read stored bio posts from store_kv (strictly read-only on products)
  if (db && typeof db.prepare === 'function') {
    try {
      const row: any = await db.prepare("SELECT value FROM store_kv WHERE key = 'instagram_bio_posts' LIMIT 1").first();
      if (row?.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && (item.igMediaId || item.productId)) {
              const key = item.igMediaId || item.productId;
              postsMap.set(key, item);
            }
          }
        }
      }
    } catch {
      // store_kv might not exist in local/preview
    }
  }

  // 2. Also query live @dbuy.store Instagram feed via Graph API v26.0 and match Product IDs from captions
  try {
    let token = (env.FACEBOOK_PAGE_ACCESS_TOKEN || env.FACEBOOK_ACCESS_TOKEN || DEFAULT_FB_PAGE_TOKEN || '').trim();
    const pageId = env.FACEBOOK_PAGE_ID || DEFAULT_FB_PAGE_ID;
    if (token) {
      try {
        const accRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?access_token=${encodeURIComponent(token)}`);
        if (accRes.ok) {
          const accData: any = await accRes.json();
          const page = accData?.data?.find((p: any) => p.id === pageId) || accData?.data?.[0];
          if (page?.access_token) token = page.access_token;
        }
      } catch {
        // Proceed with current token
      }
      const pageRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}?fields=instagram_business_account&access_token=${encodeURIComponent(token)}`
      );
      const pageData: any = await pageRes.json().catch(() => ({}));
      let igUserId = pageData?.instagram_business_account?.id;
      if (!igUserId) {
        const fbRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}?fields=connected_instagram_account&access_token=${encodeURIComponent(token)}`
        );
        const fbData: any = await fbRes.json().catch(() => ({}));
        igUserId = fbData?.connected_instagram_account?.id;
      }

      if (igUserId) {
        const mediaRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(igUserId)}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_url}&limit=24&access_token=${encodeURIComponent(token)}`
        );
        const mediaData: any = await mediaRes.json().catch(() => ({}));
        if (mediaRes.ok && Array.isArray(mediaData?.data)) {
          for (const item of mediaData.data) {
            const productId = extractProductIdFromCaption(item.caption || '');
            if (!productId) continue;
            const existing = postsMap.get(item.id);
            const childImages = Array.isArray(item.children?.data)
              ? item.children.data.map((c: any) => c.media_url).filter(Boolean)
              : [];
            const mainImg = existing?.mainImage || childImages[0] || item.media_url || item.thumbnail_url || '';

            postsMap.set(item.id, {
              id: existing?.id || `ig-${item.id}`,
              igMediaId: item.id,
              permalink: item.permalink || existing?.permalink || '',
              productId,
              productSlug: existing?.productSlug || productId,
              title: existing?.title || '',
              price: existing?.price,
              origPrice: existing?.origPrice,
              mainImage: mainImg,
              images: existing?.images?.length ? existing.images : (childImages.length ? childImages : (mainImg ? [mainImg] : [])),
              caption: item.caption || existing?.caption || '',
              mediaType: item.media_type,
              publishedAt: item.timestamp || existing?.publishedAt || new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch {
    // Graceful fallback to stored/local posts
  }

  const posts = Array.from(postsMap.values()).sort((a, b) => {
    const tA = new Date(a.publishedAt || 0).getTime();
    const tB = new Date(b.publishedAt || 0).getTime();
    return tB - tA;
  });

  return new Response(JSON.stringify({
    success: true,
    posts,
  }), { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
