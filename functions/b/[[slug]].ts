// Cloudflare Pages Function: /b/[[slug]]
// Dynamically enriches index.html with product-specific Open Graph tags
// for custom slug short URLs so Facebook and other social crawlers display the product image.

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

  let slug = '';
  if (params.slug) {
    if (Array.isArray(params.slug)) {
      slug = params.slug[0] || '';
    } else {
      slug = String(params.slug);
    }
  }

  if (!slug) {
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    slug = segments[1] || '';
  }

  if (!slug) {
    return response;
  }

  try {
    const rawHtml = await response.text();
    const modifiedHtml = injectProductOpenGraph(rawHtml, slug, url.toString());

    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    return response;
  }
};
