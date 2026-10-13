/**
 * Cloudflare Pages Function: /product/[[path]]
 * Intercepts product route requests, detects social media crawler bots via User-Agent,
 * fetches product metadata, and injects dynamic Open Graph meta tags (og:title, og:description, og:image, og:url).
 * Regular human users pass through directly to the Vite/React SPA without modification.
 */

import { injectProductOpenGraph } from '../_helpers/seo';

// List of known social media crawler bot user-agents
const SOCIAL_BOT_REGEX = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|applebot|pinterest|slackbot|googlebot|bingbot|yandex|baiduspider/i;

export const onRequest = async (context: {
  request: Request;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const { request, params } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Detect if the request is coming from a social media crawler bot
  const isBot = SOCIAL_BOT_REGEX.test(userAgent);

  // If it's a regular human user, pass straight through to the Vite SPA without overhead
  if (!isBot) {
    return context.next();
  }

  // 2. Fetch the static index.html response from Cloudflare Pages asset pipeline
  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  // 3. Extract product identifier (ID or slug) from path parameters
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

    // 4. Dynamically inject Open Graph meta tags specifically for the crawler bot
    // (Note: Uses read-only initialProducts catalog or D1 mock reader without modifying any database)
    const modifiedHtml = injectProductOpenGraph(rawHtml, identifier, url.toString());

    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (err) {
    // Fallback to original response on any unexpected error
    return response;
  }
};
