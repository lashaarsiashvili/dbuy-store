import { GoogleGenAI, Type } from '@google/genai';
import {
  parseProductHtml,
  parsePlatformHtml,
  convertToUsd,
  isEbayNoiseSpec,
  isEbayNoiseText,
  polishEbayFeatures,
  ScrapedProductData,
  ImporterPlatform,
} from '../../src/utils/productScraper';

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
    const env = context.env || {};
    const body = await req.json().catch(() => ({}));
    const { url, html: directHtml, marketplace, preParsed, compactContext } = body || {};

    let targetUrl = (url || '').trim();
    let htmlContent = (directHtml || '').trim();

    // Dedicated pre-parsed / Ctrl+U flow for eBay, Alibaba, AliExpress, and Temu
    // (Amazon remains 100% untouched in the legacy branch below)
    const isDedicatedPlatform =
      marketplace === 'ebay' ||
      marketplace === 'alibaba' ||
      marketplace === 'aliexpress' ||
      marketplace === 'temu';

    if (isDedicatedPlatform && (preParsed || htmlContent)) {
      const platform = marketplace as ImporterPlatform;
      const baseData: ScrapedProductData = preParsed && typeof preParsed === 'object'
        ? {
            title: String(preParsed.title || 'Imported Product'),
            category: String(preParsed.category || 'Electronics'),
            price: Number(preParsed.price) || 0,
            origPrice: preParsed.origPrice ? Number(preParsed.origPrice) : undefined,
            currency: String(preParsed.currency || 'USD'),
            description: String(preParsed.description || ''),
            features: Array.isArray(preParsed.features) ? preParsed.features.map(String) : [],
            images: Array.isArray(preParsed.images)
              ? Array.from(new Set(preParsed.images.filter((u: any) => typeof u === 'string' && u.startsWith('http'))))
              : [],
            specs: Array.isArray(preParsed.specs) ? preParsed.specs.map(String) : [],
            rawAttributes: preParsed.rawAttributes && typeof preParsed.rawAttributes === 'object' ? preParsed.rawAttributes : {},
            sourceUrl: targetUrl || preParsed.sourceUrl || '',
            marketplace: platform,
            reviews: Array.isArray(preParsed.reviews) ? preParsed.reviews : [],
          }
        : parsePlatformHtml(platform, htmlContent, targetUrl);

      if (baseData.currency && baseData.currency.toUpperCase() !== 'USD' && baseData.price > 0) {
        baseData.price = convertToUsd(baseData.price, baseData.currency);
        if (baseData.origPrice && baseData.origPrice > 0) {
          baseData.origPrice = convertToUsd(baseData.origPrice, baseData.currency);
        }
        baseData.currency = 'USD';
      }

      if (platform === 'ebay') {
        const cleanAttrs: Record<string, string> = {};
        for (const [k, v] of Object.entries(baseData.rawAttributes || {})) {
          if (!isEbayNoiseSpec(k, String(v))) {
            cleanAttrs[k] = String(v);
          }
        }
        const cleanSpecs = (baseData.specs || []).filter((s) => {
          const idx = s.indexOf(':');
          if (idx > 0) {
            return !isEbayNoiseSpec(s.slice(0, idx), s.slice(idx + 1));
          }
          return !isEbayNoiseText(s);
        });
        baseData.rawAttributes = cleanAttrs;
        baseData.specs = cleanSpecs;
        baseData.features = polishEbayFeatures({
          title: baseData.title,
          rawAttributes: cleanAttrs,
          itemSpecifics: cleanSpecs,
          description: baseData.description,
          category: baseData.category,
        });
      }

      const contextText = String(compactContext || baseData.compactContext || '').slice(0, 8000);
      const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

      if (apiKey && (baseData.title !== 'Imported Product' || contextText.length > 40)) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const ebayFeatureRules =
            platform === 'ebay'
              ? `\n7. EBAY FEATURE RULES (CRITICAL):
   - NEVER include pricing, discounts, currency amounts, "Was:", "Item price:", "Estimated total:", "Shipping:", "Delivery:", "Returns:", "Condition:", "Item number", "Seller", "Quantity", or "Payments" in "features" or "description".
   - Transform the extracted product specs and description into 4 compelling, customer-focused, benefit-driven English marketing bullet points (highlighting build quality, key functions, compatibility, materials, or performance benefits — similar to Amazon's persuasive bullet style, NOT dry "Key: Value" labels).
   - If fewer than 4 real specs exist, generate the remaining persuasive highlights strictly from the product title, brand, category, and description without inventing unverified technical specs.`
              : '';

          const prompt = `You are an e-commerce product data normalizer for DBUY Store.
Normalize the following pre-parsed ${platform.toUpperCase()} product into clean, accurate English and USD ($).

STRICT RULES:
1. Translate ANY Chinese or non-English product title, specs, or attributes into crisp, natural English.
2. NEVER invent fake specs or features not supported by the extracted data.
3. Choose the exact best matching category from: Electronics, Gaming, Smart Home, Audio, Wearables, Smart Bottles, Office, Beauty & Health, Pets.
4. Normalize pricing to USD ($). Extracted price is ${baseData.price} (${baseData.currency || 'USD'}). If extracted price is 0 or clearly non-USD in the raw text, compute the USD price; otherwise preserve the exact USD price.
5. Format description cleanly in English (2-3 crisp benefit sentences followed by Key Specifications if specs exist). No Georgian text.
6. Provide exactly 4 concise English bullet points in "features".${ebayFeatureRules}

Extracted Summary:
Title: ${baseData.title}
Price: ${baseData.price} ${baseData.currency || 'USD'}
OrigPrice: ${baseData.origPrice || ''}
Specs: ${JSON.stringify(baseData.specs || [])}
RawAttributes: ${JSON.stringify(baseData.rawAttributes || {})}
Description: ${baseData.description.slice(0, 1500)}
Context: ${contextText.slice(0, 4000)}`;

          const aiRes = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priceUsd: { type: Type.NUMBER },
                  origPriceUsd: { type: Type.NUMBER },
                  description: { type: Type.STRING },
                  features: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'category', 'priceUsd', 'description', 'features'],
              },
            },
          });

          const parsedAi = JSON.parse((aiRes.text || '{}').trim());
          if (parsedAi.title && typeof parsedAi.title === 'string') {
            baseData.title = parsedAi.title.trim();
          }
          if (parsedAi.category && typeof parsedAi.category === 'string') {
            baseData.category = parsedAi.category.trim();
          }
          if (baseData.price <= 0 && typeof parsedAi.priceUsd === 'number' && parsedAi.priceUsd > 0) {
            baseData.price = Math.round(parsedAi.priceUsd * 100) / 100;
          }
          if (!baseData.origPrice && typeof parsedAi.origPriceUsd === 'number' && parsedAi.origPriceUsd > baseData.price) {
            baseData.origPrice = Math.round(parsedAi.origPriceUsd * 100) / 100;
          }
          if (parsedAi.description && typeof parsedAi.description === 'string') {
            baseData.description = parsedAi.description.trim();
          }
          if (Array.isArray(parsedAi.features) && parsedAi.features.length > 0) {
            const rawAiFeatures = parsedAi.features.map((f: any) => String(f).trim()).filter(Boolean);
            if (platform === 'ebay') {
              const cleanAiFeatures = rawAiFeatures.filter((f: string) => !isEbayNoiseText(f));
              if (cleanAiFeatures.length < 4) {
                const fallbackPolished = polishEbayFeatures({
                  title: baseData.title,
                  rawAttributes: baseData.rawAttributes || {},
                  itemSpecifics: baseData.specs || [],
                  description: baseData.description,
                  category: baseData.category,
                });
                for (const fb of fallbackPolished) {
                  if (cleanAiFeatures.length >= 4) break;
                  if (!cleanAiFeatures.some((existing: string) => existing.toLowerCase() === fb.toLowerCase())) {
                    cleanAiFeatures.push(fb);
                  }
                }
              }
              baseData.features = cleanAiFeatures.slice(0, 4);
            } else {
              baseData.features = rawAiFeatures.slice(0, 4);
            }
          }
        } catch (aiErr: any) {
          console.warn(`[CF-IMPORT-${platform.toUpperCase()}] Gemini normalization fallback:`, aiErr?.message || aiErr);
        }
      }

      if (!baseData.title || (baseData.title === 'Imported Product' && baseData.images.length === 0)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Could not extract ${platform} product details from pasted HTML. Make sure you copied the full Ctrl+U page source.`,
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
          data: baseData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

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
