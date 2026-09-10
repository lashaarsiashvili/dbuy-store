// Cloudflare Pages Function: /product/[[path]]
// Dynamically enriches index.html with product-specific Open Graph tags
// so Facebook, Instagram, Twitter, and Telegram crawlers render the product picture and title.

import { injectProductOpenGraph } from '../_helpers/seo';

export const onRequest = async (context: {
  request: Request;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const { request, params } = context;
  const url = new URL(request.url);

  // Fetch the static index.html response
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  // Determine product identifier from path params or URL segments
  // e.g. /product/prod-1788877210563/smart-water-bottle -> 'prod-1788877210563'
  let identifier = '';
  if (params.path) {
    if (Array.isArray(params.path)) {
      identifier = params.path[0] || '';
    } else {
      identifier = String(params.path).split('/')[0] || '';
    }
  }

  if (!identifier) {
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    identifier = segments[1] || '';
  }

  if (!identifier) {
    return response;
  }

  try {
    const rawHtml = await response.text();
    const modifiedHtml = injectProductOpenGraph(rawHtml, identifier, url.toString());

    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    return response;
  }
};
