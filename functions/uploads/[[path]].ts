import { initialProducts } from '../../src/data/initialProducts';

interface Env {
  [key: string]: any;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: { path?: string[] };
}) => Promise<Response> | Response;

// Default category fallback images
const CATEGORY_FALLBACK_URLS: Record<string, string> = {
  'drinkware': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80',
  'tech': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
  'fitness': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1000&q=80',
  'gaming': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1000&q=80',
  'audio': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1000&q=80',
  'wearables': 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=1000&q=80',
};

const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();

  // Try to match the filename to a product ID
  let targetImageUrl = '';

  for (const product of initialProducts) {
    if (product.id && pathname.includes(product.id.toLowerCase())) {
      targetImageUrl = product.image;
      break;
    }
  }

  // Heuristic category keyword matching
  if (!targetImageUrl) {
    if (pathname.includes('owala') || pathname.includes('bottle') || pathname.includes('drinkware') || pathname.includes('mug') || pathname.includes('ember') || pathname.includes('aquaminder')) {
      targetImageUrl = CATEGORY_FALLBACK_URLS['drinkware'];
    } else if (pathname.includes('gaming') || pathname.includes('mouse') || pathname.includes('headset') || pathname.includes('g309') || pathname.includes('superlight') || pathname.includes('superstrike')) {
      targetImageUrl = CATEGORY_FALLBACK_URLS['gaming'];
    } else if (pathname.includes('swanson') || pathname.includes('collagen') || pathname.includes('magnesium') || pathname.includes('omega') || pathname.includes('vitamin') || pathname.includes('avene') || pathname.includes('serum')) {
      targetImageUrl = CATEGORY_FALLBACK_URLS['fitness'];
    } else if (pathname.includes('whoop') || pathname.includes('hume') || pathname.includes('band') || pathname.includes('wearable')) {
      targetImageUrl = CATEGORY_FALLBACK_URLS['wearables'];
    } else if (pathname.includes('mic') || pathname.includes('podmic') || pathname.includes('rode') || pathname.includes('audio')) {
      targetImageUrl = CATEGORY_FALLBACK_URLS['audio'];
    } else {
      targetImageUrl = DEFAULT_IMAGE_URL;
    }
  }

  // Fetch the target image and return it with proper headers
  try {
    const imgResponse = await fetch(targetImageUrl, { cache: 'force-cache' });
    if (imgResponse.ok) {
      const headers = new Headers(imgResponse.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(imgResponse.body, {
        status: 200,
        headers,
      });
    }
  } catch (err) {
    // Fallback to 302 redirect
  }

  return Response.redirect(targetImageUrl, 302);
};
