/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: /b/[[slug]]
 * Dynamically enriches index.html with product-specific Open Graph tags
 * for custom short slug URLs (/b/:slug) so Facebook and social crawlers
 * display the product's actual image, title, and description.
 */

import { findProductForSeo, injectProductOpenGraphResponse } from '../_helpers/seo';

interface Env {
  DB?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // Fetch the static index.html response
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (contentType && !contentType.includes('text/html')) {
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
    const product = await findProductForSeo(env.DB, slug);
    if (!product) {
      return response;
    }

    return injectProductOpenGraphResponse(response, product, request.url);
  } catch (err) {
    console.error('[Short Slug OG Middleware Error]:', err);
    return response;
  }
};
