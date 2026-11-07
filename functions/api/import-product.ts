import { parseProductHtml } from '../../src/utils/productScraper';

const DESKTOP_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
  'Cookie': 'i18n-prefs=USD; lc-main=en_US;',
};

async function fetchWithTimeout(url: string, options: any, timeoutMs: number = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchProductHtmlFromWeb(targetUrl: string): Promise<{ html: string; error?: string }> {
  // Strategy 1: Direct fetch with realistic desktop browser headers
  try {
    const res = await fetchWithTimeout(targetUrl, {
      method: 'GET',
      headers: DESKTOP_HEADERS,
      redirect: 'follow',
    }, 6000);

    if (res.ok) {
      const text = await res.text();
      const isRobotBlock = text.includes('To discuss automated access to Amazon data') ||
                           text.includes('Enter the characters you see below') ||
                           text.includes('Something went wrong on our end') && text.includes('reference-id');
      if (!isRobotBlock && text.length > 3000) {
        return { html: text };
      }
    }
  } catch (err: any) {
    console.warn('[IMPORT-SCRAPER] Direct fetch failed or timed out:', err?.message || err);
  }

  // Strategy 2: Fallback proxies for public extraction
  const fallbackUrls = [
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://r.jina.ai/${targetUrl}`,
  ];

  for (const proxyUrl of fallbackUrls) {
    try {
      const res = await fetchWithTimeout(proxyUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,text/plain,*/*',
          'User-Agent': DESKTOP_HEADERS['User-Agent'],
        },
      }, 5000);

      if (res.ok) {
        const text = await res.text();
        if (
          text.length > 2000 &&
          !text.includes('Target URL returned error') &&
          !text.includes('Enter the characters you see below')
        ) {
          return { html: text };
        }
      }
    } catch {}
  }

  return {
    html: '',
    error: 'Marketplace automated verification active. Paste page HTML for instant 100% extraction.',
  };
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug',
    },
  });
}

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const body = await req.json().catch(() => ({}));
    const { url, html: directHtml } = body || {};

    let targetUrl = (url || '').trim();
    let htmlContent = (directHtml || '').trim();

    if (!targetUrl && !htmlContent) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide an Amazon or eBay product URL or paste page HTML',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Expand shortlinks e.g. amzn.to if URL provided
    if (targetUrl && !htmlContent) {
      const isAmazon = /amazon\.|amzn\.to/i.test(targetUrl);
      const isEbay = /ebay\./i.test(targetUrl);

      if (!isAmazon && !isEbay) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unsupported URL. Please enter a valid Amazon (amazon.com, amzn.to) or eBay (ebay.com/itm) product link.',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const fetchResult = await fetchProductHtmlFromWeb(targetUrl);
      if (fetchResult.html) {
        htmlContent = fetchResult.html;
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            isBotBlocked: true,
            error: fetchResult.error || 'Marketplace bot protection challenge detected.',
            suggestedAction: 'paste_html',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }
    }

    const scraped = parseProductHtml(htmlContent, targetUrl);

    if (!scraped.title || scraped.title === 'Imported Product') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract product details. Please ensure the link is a valid Amazon or eBay product page.',
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: scraped,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to process product extraction',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
