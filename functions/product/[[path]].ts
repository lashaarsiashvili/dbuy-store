/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: /product/[[path]]
 * Intercepts product detail requests and dynamically injects product-specific
 * Open Graph (og:title, og:description, og:image) and Twitter Card meta tags
 * using Cloudflare HTMLRewriter before returning the page to Facebook, WhatsApp,
 * Twitter, Telegram, and social media crawlers.
 */

import { findProductForSeo, injectProductOpenGraphResponse } from '../_helpers/seo';

interface Env {
  DB?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // 1. Fetch base index.html response from the asset pipeline
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  // Only rewrite HTML responses
  if (contentType && !contentType.includes('text/html')) {
    return response;
  }

  // 2. Extract product identifier (ID or slug) from route parameters
  let productId = '';
  if (params.path) {
    if (Array.isArray(params.path)) {
      productId = params.path[0] || '';
    } else {
      productId = String(params.path).split('/')[0] || '';
    }
  }

  if (!productId) {
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    productId = segments[1] || '';
  }

  if (!productId) {
    return response;
  }

  try {
    // 3. Find product from D1 (with fallbacks) in strict READ-ONLY mode
    const product = await findProductForSeo(env.DB, productId);
    if (!product) {
      return response;
    }

    // 4. Inject dynamic Open Graph and Twitter Card tags via HTMLRewriter
    return injectProductOpenGraphResponse(response, product, request.url);
  } catch (err) {
    console.error('[Product OG Middleware Error]:', err);
    return response;
  }
};
