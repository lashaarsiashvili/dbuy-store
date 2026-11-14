/**
 * Multi-Platform Product Scraper and Pre-Parser Engine
 * Supports Amazon (untouched), eBay, Alibaba, AliExpress, and Temu
 * with high-resolution original image normalization, USD price normalization,
 * HTML sanitization (stripping style/svg/base64/unrelated scripts),
 * and structured English attribute extraction.
 */

export type ImporterPlatform = 'amazon' | 'ebay' | 'alibaba' | 'aliexpress' | 'temu';

export interface ScrapedProductData {
  title: string;
  category: string;
  price: number;
  origPrice?: number;
  currency?: string;
  description: string;
  features: string[];
  images: string[];
  specs?: string[];
  rawAttributes?: Record<string, string>;
  compactContext?: string;
  sourceUrl?: string;
  marketplace: ImporterPlatform | 'unknown';
}

export function cleanHtmlText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Amazon image URLs to full high-resolution (1500px+)
 * by stripping crop and sizing modifiers: \._[A-Z0-9_,]+_\.
 */
export function normalizeAmazonImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  // Strip size/crop modifiers e.g. ._AC_SL1500_.jpg -> .jpg
  clean = clean.replace(/\._[A-Z0-9_,]+_\./g, '.');
  clean = clean.replace(/\._[A-Z0-9_,]+_$/g, '');
  // Ignore transparent pixels or icons
  if (clean.includes('transparent-pixel') || clean.includes('icon') || clean.includes('pixel')) {
    return '';
  }
  return clean;
}

/**
 * Upgrades eBay image URLs to maximum resolution (/s-l1600.jpg or /s-l1200.jpg)
 * and normalizes size modifiers (e.g. /s-l64.jpg, /s-l300.jpg, /s-l500.jpg, $_57.JPG)
 * while filtering out placeholders, 1x2 GIFs, SVGs, and UI icons.
 */
export function normalizeEbayImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // Strip enclosing quotes, whitespace, or escape backslashes
  url = url.replace(/^["'\s\\]+|["'\s\\]+$/g, '');
  url = url.replace(/\\u002F/gi, '/');
  url = url.replace(/\\/g, '');
  url = url.replace(/&amp;/g, '&');
  url = url.replace(/&#x2F;/gi, '/');
  url = url.replace(/&#47;/g, '/');

  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    url = 'https:' + url;
  }

  // Must be a valid HTTP or HTTPS URL
  if (!/^https?:\/\//i.test(url)) {
    return '';
  }

  const lower = url.toLowerCase();

  // Filter out placeholder, tiny thumbnail, base64, SVG, and UI icons
  if (
    lower.startsWith('data:') ||
    lower.includes('blank.gif') ||
    lower.includes('s_1x2.gif') ||
    lower.includes('s_1x1.gif') ||
    lower.includes('transparent') ||
    lower.includes('placeholder') ||
    lower.includes('spinner') ||
    lower.includes('/icon') ||
    lower.includes('icon-') ||
    lower.includes('-icon') ||
    lower.includes('avatar') ||
    lower.includes('ebaystatic.com/cr/') || // internal eBay UI assets/sprites
    lower.includes('ebaystatic.com/pictures/') || // internal eBay UI assets
    lower.includes('badge') ||
    lower.includes('arrow') ||
    lower.includes('charity') ||
    lower.endsWith('.svg') ||
    lower.includes('.svg?')
  ) {
    return '';
  }

  // Upgrade eBay image assets (i.ebayimg.com, ir.ebaystatic.com)
  if (lower.includes('i.ebayimg.com') || lower.includes('ir.ebaystatic.com')) {
    // 1. Remove thumbnail subfolder if present: /thumbs/images/ -> /images/
    url = url.replace(/\/thumbs\/images\//i, '/images/');

    // 2. Preserve s-l1200.jpg if explicitly 1200, otherwise upgrade smaller sizing modifiers to /s-l1600.jpg
    if (/\/s-l1200\.(?:jpg|jpeg|png|webp)/i.test(url)) {
      url = url.replace(/\/s-l1200\.(?:jpg|jpeg|png|webp)/i, '/s-l1200.jpg');
    } else {
      url = url.replace(/\/s-l\d+\.(?:jpg|jpeg|png|webp)/i, '/s-l1600.jpg');
    }

    // 3. Upgrade legacy size modifiers like /$_57.JPG, /$_12.JPG, /$_1.JPG to /s-l1600.jpg
    url = url.replace(/\/\$_[0-9]+(?:\.[a-zA-Z]+)?(?:\?[^"'\s]*)?$/i, '/s-l1600.jpg');
    url = url.replace(/\/\$_[0-9]+(?:\.[a-zA-Z]+)?\b/i, '/s-l1600.jpg');

    // 4. Strip trailing query parameters if set_id is attached to s-l1600/s-l1200.jpg for clean URL
    if (url.includes('/s-l1600.jpg') || url.includes('/s-l1200.jpg')) {
      url = url.split('?')[0];
    }

    return url;
  }

  return url;
}

/**
 * Detects the most appropriate store category from title and specs
 */
export function inferStoreCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(headphone|earphone|earbuds|airpods|speaker|soundbar|audio|microphone|dac|amp)\b/.test(lower)) {
    return 'audio';
  }
  if (/\b(game|gaming|controller|playstation|ps5|xbox|nintendo|switch|arcade|joystick|rgb mouse|mechanical keyboard)\b/.test(lower)) {
    return 'gaming';
  }
  if (/\b(bottle|tumbler|mug|cup|flask|thermos|hydration|shaker|drinkware)\b/.test(lower)) {
    return 'drinkware';
  }
  if (/\b(watch|smartwatch|fitness tracker|band|wearable|garmin|fitbit|whoop)\b/.test(lower)) {
    return 'wearables';
  }
  if (/\b(fitness|dumbbell|weight|resistance band|yoga|gym|workout|exercise|massage gun|roller)\b/.test(lower)) {
    return 'fitness';
  }
  if (/\b(security|camera|doorbell|cctv|lock|alarm|surveillance|sensor)\b/.test(lower)) {
    return 'security';
  }
  if (/\b(wallet|bag|backpack|knife|multitool|flashlight|edc|keychain|organizer)\b/.test(lower)) {
    return 'everyday';
  }
  if (/\b(case|cover|strap|mount|holder|cable|charger|adapter|stand|dock)\b/.test(lower)) {
    return 'accessories';
  }
  return 'tech';
}

/**
 * Specialised Parser for Amazon Products
 */
export function parseAmazonProductHtml(html: string, sourceUrl: string = ''): ScrapedProductData {
  // 1. Title Extraction
  let title = '';
  const titleMatch = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) ||
                     html.match(/<meta\s+name=["']title["']\s+content=["']([^"']*)["']/i) ||
                     html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                     html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = cleanHtmlText(titleMatch[1]);
    title = title
      .replace(/^Amazon\.com\s*:\s*/i, '')
      .replace(/^Amazon\.com\s*-\s*/i, '')
      .replace(/\s*:\s*Electronics$/i, '')
      .replace(/\s*:\s*Home & Kitchen$/i, '')
      .replace(/\s*:\s*Sports & Outdoors$/i, '')
      .trim();
  }

  // 2. Price Extraction
  let price = 0;
  let origPrice: number | undefined = undefined;

  // Primary price
  const pricePatterns = [
    /class=["'][^"']*priceToPay[^"']*["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /id=["']corePrice_feature_div["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /id=["']corePriceDisplay_desktop_feature_div["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /id=["']priceblock_ourprice["'][^>]*>([\s\S]*?)<\/span>/i,
    /id=["']priceblock_dealprice["'][^>]*>([\s\S]*?)<\/span>/i,
    /class=["']a-price aok-align-center[^"']*["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /class=["']a-offscreen["'][^>]*>\s*\$([0-9,.]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      const rawPrice = (match[1] || match[0]).replace(/[^0-9.]/g, '');
      const parsed = parseFloat(rawPrice);
      if (parsed > 0) {
        price = parsed;
        break;
      }
    }
  }

  // Strikethrough / List Price
  const listPricePatterns = [
    /class=["'][^"']*basisPrice[^"']*["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /class=["'][^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?class=["']a-offscreen["'][^>]*>([\s\S]*?)<\/span>/i,
    /id=["']listPrice["'][^>]*>([\s\S]*?)<\/span>/i,
  ];
  for (const pattern of listPricePatterns) {
    const match = html.match(pattern);
    if (match) {
      const rawPrice = (match[1] || match[0]).replace(/[^0-9.]/g, '');
      const parsed = parseFloat(rawPrice);
      if (parsed > price) {
        origPrice = parsed;
        break;
      }
    }
  }

  // 3. High-Res Images Extraction
  const imageMap = new Map<string, string>();

  // A) Inline script 'colorImages': { 'initial': [...] }
  const scriptRegexes = [
    /'colorImages'\s*:\s*\{\s*'initial'\s*:\s*(\[[^\]]+\])/,
    /"colorImages"\s*:\s*\{\s*"initial"\s*:\s*(\[[^\]]+\])/,
  ];
  for (const reg of scriptRegexes) {
    const m = html.match(reg);
    if (m && m[1]) {
      try {
        const parsed = JSON.parse(m[1].replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const rawUrl = item.hiRes || item.large || item.main?.[Object.keys(item.main || {})[0]];
            const norm = normalizeAmazonImageUrl(rawUrl);
            if (norm) imageMap.set(norm, norm);
          }
        }
      } catch (err) {
        // Fallback to regex inside match
        const hiMatches = m[1].matchAll(/["'](hiRes|large)["']\s*:\s*["'](https:[^"']+)["']/gi);
        for (const hm of hiMatches) {
          const norm = normalizeAmazonImageUrl(hm[2]);
          if (norm) imageMap.set(norm, norm);
        }
      }
    }
  }

  // B) Regex match all hiRes and large image properties across scripts
  const hiResGlobal = html.matchAll(/["'](?:hiRes|large)["']\s*:\s*["'](https:[^"']+)["']/gi);
  for (const m of hiResGlobal) {
    const norm = normalizeAmazonImageUrl(m[1]);
    if (norm) imageMap.set(norm, norm);
  }

  // C) Parse data-a-dynamic-image on #landingImage or #imgTagWrapperId img
  const dynamicImageMatches = html.matchAll(/data-a-dynamic-image=["']([^"']+)["']/gi);
  for (const m of dynamicImageMatches) {
    try {
      const unescaped = m[1].replace(/&quot;/g, '"');
      const parsed = JSON.parse(unescaped);
      for (const url of Object.keys(parsed)) {
        const norm = normalizeAmazonImageUrl(url);
        if (norm) imageMap.set(norm, norm);
      }
    } catch {}
  }

  // D) Regex fallback for direct amazon media images
  const mediaMatches = html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%_-]+\.(?:_AC_[^"'\s]+\.)?jpg/gi);
  for (const m of mediaMatches) {
    const norm = normalizeAmazonImageUrl(m[0]);
    if (norm) imageMap.set(norm, norm);
  }

  const images = Array.from(imageMap.values()).slice(0, 10);

  // 4. Features extraction (#feature-bullets ul li span.a-list-item)
  const features: string[] = [];
  const bulletSection = html.match(/id=["']feature-bullets["'][^>]*>([\s\S]*?)<\/div>/i);
  if (bulletSection) {
    const liMatches = bulletSection[1].matchAll(/<span class=["']a-list-item["'][^>]*>([\s\S]*?)<\/span>/gi);
    for (const m of liMatches) {
      const text = cleanHtmlText(m[1]);
      if (
        text &&
        text.length > 5 &&
        !text.toLowerCase().includes('make sure this fits') &&
        !text.toLowerCase().includes('click here') &&
        !features.includes(text)
      ) {
        features.push(text);
      }
    }
  }

  // 5. Description Extraction
  let rawDesc = '';
  const descMatch = html.match(/id=["']productDescription["'][^>]*>([\s\S]*?)<\/div>/i);
  if (descMatch) {
    rawDesc = cleanHtmlText(descMatch[1]);
  }

  // Technical Specs extraction (#productDetails_techSpec_section_1 or #detailBullets_feature_div)
  const techSpecs: string[] = [];
  const techSection = html.match(/id=["']productDetails_techSpec_section_1["'][^>]*>([\s\S]*?)<\/table>/i) ||
                      html.match(/id=["']detailBullets_feature_div["'][^>]*>([\s\S]*?)<\/div>/i);
  if (techSection) {
    const rowMatches = techSection[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi);
    for (const rm of rowMatches) {
      const label = cleanHtmlText(rm[1]);
      const val = cleanHtmlText(rm[2]);
      if (label && val && label.length < 30 && val.length < 50) {
        techSpecs.push(`${label}: ${val}`);
      }
    }
  }

  // Combine into a clean, structured English description
  let finalDescription = rawDesc;
  if (!finalDescription && features.length > 0) {
    finalDescription = features.slice(0, 3).join('. ') + '.';
  }
  if (techSpecs.length > 0) {
    finalDescription += (finalDescription ? '\n\nKey Specifications:\n' : 'Key Specifications:\n') + techSpecs.slice(0, 6).join(' • ');
  }
  if (!finalDescription) {
    finalDescription = title ? `High-performance ${title} crafted for exceptional reliability, premium comfort, and modern convenience.` : 'Premium product engineered for peak performance and everyday utility.';
  }

  // Category inference
  const category = inferStoreCategory(title + ' ' + features.join(' ') + ' ' + finalDescription);

  return {
    title,
    category,
    price,
    origPrice: origPrice && origPrice > price ? origPrice : (price > 0 ? Math.round(price * 1.25 * 100) / 100 : undefined),
    description: finalDescription,
    features: features.slice(0, 4),
    images,
    sourceUrl,
    marketplace: 'amazon',
  };
}

/**
 * ============================================================================
 * SHARED SANITIZATION, CURRENCY & JSON EXTRACTION UTILITIES
 * ============================================================================
 */

const PRODUCT_SCRIPT_MARKERS = [
  'ld+json',
  'detaildata',
  'globaldata',
  'runparams',
  '_dida_config_',
  '_init_data_',
  '__aer_data__',
  '__init_data__',
  'rawdata',
  '__next_data__',
  '__initial_state__',
  '__initial_data__',
  'imagepathlist',
  'imagelist',
  'productbasicproperties',
  'pricecomponent',
  'specscomponent',
  'productpropcomponent',
  'productinfocomponent',
  'goodsname',
  'goodsproperty',
  'msku',
  'zoomimgurl',
  'maximageurl',
  'displayimgurl',
  'picturepanel',
  'medialist',
  'skulist',
  'skupricelist',
];

/**
 * Strips <style>, <svg>, base64 strings, HTML comments, and unrelated scripts
 * from pasted 2MB–5MB HTML before pre-parsing or sending compact context to backend.
 */
export function sanitizeMarketplaceHtml(rawHtml: string, _platform?: ImporterPlatform): string {
  if (!rawHtml) return '';

  let cleaned = rawHtml
    // Remove <style> blocks
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    // Remove <svg> blocks
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    // Remove <noscript> blocks
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Remove base64 data URIs
    .replace(/data:[a-zA-Z0-9/+.-]+;base64,[A-Za-z0-9+/=\r\n]+/gi, '');

  // Strip unrelated <script> tags while keeping JSON-LD and product state scripts
  cleaned = cleaned.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs: string, body: string) => {
    const lowerAttrs = (attrs || '').toLowerCase();
    const trimmedBody = (body || '').trim();

    if (!trimmedBody) return ' ';
    if (lowerAttrs.includes('application/ld+json')) return full;
    if (lowerAttrs.includes('id="__next_data__') || lowerAttrs.includes("id='__next_data__")) return full;

    const lowerBody = trimmedBody.toLowerCase();
    // Drop obvious tracking/analytics scripts
    if (
      lowerBody.includes('googletagmanager') ||
      lowerBody.includes('google-analytics') ||
      lowerBody.includes('fbq(') ||
      lowerBody.includes('clarity.ms') ||
      lowerBody.includes('sentry') ||
      lowerBody.includes('hotjar')
    ) {
      if (!PRODUCT_SCRIPT_MARKERS.some((m) => lowerBody.includes(m))) {
        return ' ';
      }
    }

    if (PRODUCT_SCRIPT_MARKERS.some((m) => lowerBody.includes(m))) {
      return full;
    }

    return ' ';
  });

  return cleaned;
}

/**
 * Normalizes a numeric price from various currencies into USD ($).
 */
export function convertToUsd(amount: number, currency?: string): number {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return 0;
  const cur = (currency || 'USD').trim().toUpperCase();

  let rate = 1;
  if (cur === 'USD' || cur === 'US$' || cur === 'US $' || cur === '$') {
    rate = 1;
  } else if (cur === 'CNY' || cur === 'RMB' || cur === 'CN¥' || cur === '¥' || cur === '元') {
    rate = 0.14;
  } else if (cur === 'EUR' || cur === '€') {
    rate = 1.08;
  } else if (cur === 'GBP' || cur === '£') {
    rate = 1.27;
  } else if (cur === 'CAD' || cur === 'CA$' || cur === 'C$') {
    rate = 0.73;
  } else if (cur === 'AUD' || cur === 'AU$' || cur === 'A$') {
    rate = 0.65;
  } else if (cur === 'GEL' || cur === '₾') {
    rate = 0.37;
  } else if (cur === 'JPY') {
    rate = 0.0067;
  } else if (cur === 'RUB' || cur === '₽') {
    rate = 0.011;
  } else if (cur === 'TRY' || cur === '₺') {
    rate = 0.029;
  } else if (cur === 'HKD' || cur === 'HK$') {
    rate = 0.128;
  }

  return Math.round(amount * rate * 100) / 100;
}

/**
 * Parses a formatted price string like "US $24.99", "RMB 128.00", "€19,50" into USD.
 */
export function parsePriceAndCurrency(rawText: string, defaultCurrency: string = 'USD'): { price: number; currency: string } {
  if (!rawText) return { price: 0, currency: defaultCurrency };
  const text = String(rawText).replace(/\s+/g, ' ').trim();

  let currency = defaultCurrency;
  if (/US\s*\$|USD/i.test(text)) currency = 'USD';
  else if (/CA\s*\$|C\s*\$|CAD/i.test(text)) currency = 'CAD';
  else if (/AU\s*\$|A\s*\$|AUD/i.test(text)) currency = 'AUD';
  else if (/HK\s*\$|HKD/i.test(text)) currency = 'HKD';
  else if (/CNY|RMB|CN¥|元/i.test(text)) currency = 'CNY';
  else if (/EUR|€/i.test(text)) currency = 'EUR';
  else if (/GBP|£/i.test(text)) currency = 'GBP';
  else if (/GEL|₾/i.test(text)) currency = 'GEL';
  else if (/JPY/i.test(text)) currency = 'JPY';
  else if (/¥/.test(text)) currency = 'CNY';
  else if (/\$/.test(text)) currency = 'USD';

  // Extract first price number (supporting comma thousands or comma decimals like 19,99)
  const numMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!numMatch) return { price: 0, currency };

  let numStr = numMatch[1];
  // Handle European decimal comma (e.g. "19,99" without dot)
  if (numStr.includes(',') && !numStr.includes('.')) {
    const parts = numStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      numStr = parts[0] + '.' + parts[1];
    } else {
      numStr = numStr.replace(/,/g, '');
    }
  } else {
    numStr = numStr.replace(/,/g, '');
  }

  const parsed = parseFloat(numStr);
  if (!Number.isFinite(parsed) || parsed <= 0) return { price: 0, currency };
  return { price: convertToUsd(parsed, currency), currency };
}

/**
 * Balanced-bracket JSON extractor that safely walks strings & escape sequences.
 */
function extractBalancedJsonFromIndex(str: string, openIndex: number): string | null {
  if (openIndex < 0 || openIndex >= str.length) return null;
  const openChar = str[openIndex];
  if (openChar !== '{' && openChar !== '[') return null;

  let depth = 0;
  let inString: '"' | "'" | null = null;
  let escaped = false;
  const maxScan = Math.min(str.length, openIndex + 4_000_000);

  for (let i = openIndex; i < maxScan; i++) {
    const ch = str[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
    } else if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        return str.slice(openIndex, i + 1);
      }
    }
  }

  return null;
}

function tryParseJsonSafe(raw: string): any | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Handle trailing commas in JS object literals
    try {
      const cleaned = trimmed.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function extractJsonAssignments(html: string, patterns: RegExp[]): any[] {
  const results: any[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const re = new RegExp(pattern.source, flags);
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(html)) !== null && count < 8) {
      count++;
      let idx = m.index + m[0].length;
      while (idx < html.length && /\s/.test(html[idx])) idx++;

      // Handle JSON.parse('...') or JSON.parse("...")
      if (html.slice(idx, idx + 11) === 'JSON.parse(') {
        idx += 11;
        while (idx < html.length && /\s/.test(html[idx])) idx++;
        const quote = html[idx];
        if (quote === '"' || quote === "'") {
          let end = idx + 1;
          let esc = false;
          while (end < html.length) {
            const c = html[end];
            if (esc) {
              esc = false;
            } else if (c === '\\') {
              esc = true;
            } else if (c === quote) {
              break;
            }
            end++;
          }
          const inner = html.slice(idx + 1, end);
          try {
            const unescaped = quote === "'"
              ? inner.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
              : JSON.parse(`"${inner}"`);
            const parsedInner = tryParseJsonSafe(unescaped);
            if (parsedInner) results.push(parsedInner);
          } catch {}
        }
        continue;
      }

      if (html[idx] === '{' || html[idx] === '[') {
        const rawJson = extractBalancedJsonFromIndex(html, idx);
        if (rawJson) {
          const parsed = tryParseJsonSafe(rawJson);
          if (parsed) results.push(parsed);
        }
      }
    }
  }
  return results;
}

function extractJsonLdProducts(html: string): any[] {
  const products: any[] = [];
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    const rawText = (m[1] || '').trim();
    if (!rawText) continue;
    const parsed = tryParseJsonSafe(rawText);
    if (!parsed) continue;

    const candidates: any[] = [];
    if (Array.isArray(parsed)) {
      candidates.push(...parsed);
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed['@graph'])) {
        candidates.push(...parsed['@graph']);
      } else {
        candidates.push(parsed);
      }
    }

    for (const item of candidates) {
      if (!item || typeof item !== 'object') continue;
      const type = item['@type'];
      const types = Array.isArray(type) ? type : [type];
      if (types.some((t) => t === 'Product' || t === 'IndividualProduct')) {
        products.push(item);
      }
    }
  }
  return products;
}

/**
 * Recursively collects objects/values matching a key predicate inside parsed state JSON.
 */
function deepFindByKey(root: any, targetKeys: Set<string>, maxDepth: number = 8): Array<{ key: string; value: any }> {
  const found: Array<{ key: string; value: any }> = [];
  const visited = new Set<any>();

  const walk = (node: any, depth: number) => {
    if (!node || typeof node !== 'object' || depth > maxDepth || visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (let i = 0; i < Math.min(node.length, 80); i++) {
        walk(node[i], depth + 1);
      }
      return;
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      if (targetKeys.has(key) && val !== undefined && val !== null) {
        found.push({ key, value: val });
      }
      if (val && typeof val === 'object') {
        walk(val, depth + 1);
      }
    }
  };

  walk(root, 0);
  return found;
}

function buildCompactContext(
  platform: ImporterPlatform,
  title: string,
  priceText: string,
  specs: string[],
  rawDesc: string,
  sanitizedHtml: string
): string {
  const parts: string[] = [];
  parts.push(`Platform: ${platform.toUpperCase()}`);
  if (title) parts.push(`Raw Title: ${title}`);
  if (priceText) parts.push(`Raw Price Info: ${priceText}`);
  if (specs.length > 0) parts.push(`Extracted Attributes/Specs:\n${specs.slice(0, 25).join('\n')}`);
  if (rawDesc) parts.push(`Raw Description:\n${rawDesc.slice(0, 2500)}`);

  // If sparse, extract compact visible text excerpt from sanitized HTML (never exceeding 6000 chars total)
  if (parts.join('\n').length < 600 && sanitizedHtml) {
    const textOnly = cleanHtmlText(sanitizedHtml).slice(0, 3500);
    if (textOnly) parts.push(`Page Text Excerpt:\n${textOnly}`);
  }

  return parts.join('\n\n').slice(0, 8000);
}

/**
 * ============================================================================
 * SPECIALISED PARSER 1: eBay Products
 * Extracts application/ld+json Product schema, MSKU / image zoom gallery arrays
 * (upgrading to s-l1600.jpg / s-l1200.jpg), ux-labels-values specifics, title & USD price.
 * ============================================================================
 */
export function parseEbayProductHtml(rawHtml: string, sourceUrl: string = ''): ScrapedProductData {
  const html = sanitizeMarketplaceHtml(rawHtml, 'ebay');
  let title = '';
  let price = 0;
  let origPrice: number | undefined = undefined;
  let currency = 'USD';
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const features: string[] = [];

  const addImageUrl = (rawUrl: string | undefined | null) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const norm = normalizeEbayImageUrl(rawUrl);
    if (norm && !imagesSet.has(norm)) {
      imagesSet.add(norm);
    }
  };

  const extractUrlsFromImgTag = (imgTag: string) => {
    if (!imgTag) return;
    const zoomMatch = imgTag.match(/data-zoom-src=["']([^"']+)["']/i);
    if (zoomMatch?.[1]) addImageUrl(zoomMatch[1]);

    const dataImgMatch = imgTag.match(/data-img-url=["']([^"']+)["']/i);
    if (dataImgMatch?.[1]) addImageUrl(dataImgMatch[1]);

    const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
    if (dataSrcMatch?.[1]) addImageUrl(dataSrcMatch[1]);

    const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch?.[1]) {
      for (const entry of srcsetMatch[1].split(',')) {
        const u = entry.trim().split(/\s+/)[0];
        if (u) addImageUrl(u);
      }
    }

    const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch?.[1]) addImageUrl(srcMatch[1]);
  };

  // SOURCE A: <script type="application/ld+json"> Product schema
  const jsonLdProducts = extractJsonLdProducts(html);
  for (const item of jsonLdProducts) {
    if (!title && item.name) {
      title = cleanHtmlText(String(item.name));
    }
    if (!rawDesc && item.description) {
      rawDesc = cleanHtmlText(String(item.description));
    }
    if (item.image) {
      const rawImages = Array.isArray(item.image) ? item.image : [item.image];
      for (const imgEntry of rawImages) {
        if (typeof imgEntry === 'string') {
          addImageUrl(imgEntry);
        } else if (imgEntry && typeof imgEntry === 'object') {
          addImageUrl(imgEntry.url || imgEntry.contentUrl);
        }
      }
    }
    if (item.offers) {
      const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
      for (const offers of offersList) {
        if (!offers) continue;
        const cur = String(offers.priceCurrency || 'USD').toUpperCase();
        const rawP = parseFloat(String(offers.price || offers.lowPrice || '0'));
        if (rawP > 0 && price === 0) {
          currency = cur;
          price = convertToUsd(rawP, cur);
        }
      }
    }
  }

  // SOURCE B: MSKU / Image Zoom Gallery Arrays in embedded script JSON
  const zoomUrlMatches = html.matchAll(
    /["'](?:maxImageUrl|zoomImgUrl|displayImgUrl|fullImageUrl|largeImageUrl|pictureUrl|imgUrl|imageUrl)["']\s*:\s*["']((?:https?:)?\\?\/\\?\/[^"']*ebayimg\.com[^"']+)["']/gi
  );
  for (const zm of zoomUrlMatches) {
    addImageUrl(zm[1]);
  }

  const mskuBlocks = extractJsonAssignments(html, [
    /["'](?:mediaList|picturePanel|imageTreatment|mskuData|MSKU|variationImages)["']\s*:/i,
    /\$rwidgets\s*\(/i,
  ]);
  const ebayImgKeys = new Set([
    'maxImageUrl',
    'zoomImgUrl',
    'displayImgUrl',
    'fullImageUrl',
    'imageUrl',
    'imgUrl',
    'pictureUrl',
    'originalUrl',
    'galleryUrls',
    'imageUrls',
    'mediaList',
    'url',
    'URL',
  ]);
  for (const block of mskuBlocks) {
    const matches = deepFindByKey(block, ebayImgKeys, 7);
    for (const m of matches) {
      if (typeof m.value === 'string' && m.value.includes('ebayimg')) {
        addImageUrl(m.value);
      } else if (Array.isArray(m.value)) {
        for (const el of m.value) {
          if (typeof el === 'string' && el.includes('ebayimg')) addImageUrl(el);
          else if (el && typeof el === 'object') {
            addImageUrl(el.maxImageUrl || el.zoomImgUrl || el.displayImgUrl || el.url || el.URL || el.imageUrl);
          }
        }
      }
    }
  }

  // SOURCE C: .ux-image-carousel-item / .image-treatment / #icImg / .vi-image-gallery
  const containerRegex = /<(?:div|li|span|button)[^>]*class=["'][^"']*(?:ux-image-carousel-item|image-treatment|ux-image-filmstrip-carousel-item|ux-image-grid-item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|span|button)>/gi;
  let matchContainer: RegExpExecArray | null;
  while ((matchContainer = containerRegex.exec(html)) !== null) {
    const block = matchContainer[1];
    for (const imgMatch of block.matchAll(/<img[^>]+>/gi)) {
      extractUrlsFromImgTag(imgMatch[0]);
    }
  }

  for (const imgM of html.matchAll(/<img[^>]+(?:class=["'][^"']*(?:ux-image-carousel-item|image-treatment)[^"']*["']|data-zoom-src=|data-img-url=)[^>]*>/gi)) {
    extractUrlsFromImgTag(imgM[0]);
  }

  const icImgMatch = html.match(/<img[^>]*id=["']icImg["'][^>]*>/i);
  if (icImgMatch) extractUrlsFromImgTag(icImgMatch[0]);

  for (const gm of html.matchAll(/<(?:div|ul|table)[^>]*class=["'][^"']*(?:vi-image-gallery|vi_main_img_fs|gallery-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|ul|table)>/gi)) {
    for (const im of gm[1].matchAll(/<img[^>]+>/gi)) {
      extractUrlsFromImgTag(im[0]);
    }
  }

  // SOURCE D: Global scan for eBay product image URLs (/images/g/...)
  const globalEbayImgRegex = /(?:https?:)?(?:\\\/\\\/|\/\/)(?:i\.ebayimg\.com|ir\.ebaystatic\.com)\/images\/(?:g|i)\/[^\s"'<>\\{}|[\]^`]+/gi;
  for (const rawM of html.matchAll(globalEbayImgRegex)) {
    addImageUrl(rawM[0]);
  }

  // Title fallback
  if (!title) {
    const titleMatch = html.match(/class=["'][^"']*x-item-title__mainTitle[^"']*["'][^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/id=["']itemTitle["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = cleanHtmlText(titleMatch[1])
        .replace(/^Details about\s+/i, '')
        .replace(/\s*\|\s*eBay$/i, '')
        .trim();
    }
  }

  // Price fallback (USD normalized)
  if (price === 0) {
    const priceMatch = html.match(/class=["'][^"']*x-price-primary[^"']*["'][^>]*>[\s\S]*?class=["'][^"']*ux-textspans[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/id=["']prcIsum["'][^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/itemprop=["']price["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/class=["']ux-textspans[^"']*["'][^>]*>\s*(?:US\s*)?\$[0-9,.]+/i);
    if (priceMatch) {
      const parsedP = parsePriceAndCurrency(cleanHtmlText(priceMatch[1] || priceMatch[0]));
      if (parsedP.price > 0) {
        price = parsedP.price;
        currency = parsedP.currency;
      }
    }
  }

  // Original / strikethrough price
  const origMatch = html.match(/class=["'][^"']*ux-textspans--STRIKETHROUGH[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                    html.match(/["']strikethroughPrice["']\s*:\s*\{[^}]*["']value["']\s*:\s*([0-9.]+)/i);
  if (origMatch) {
    const parsedOrig = parsePriceAndCurrency(cleanHtmlText(origMatch[1]), currency);
    if (parsedOrig.price > price) origPrice = parsedOrig.price;
  }

  // Item specifics (.ux-labels-values both div and dt/dd variants + .itemAttr fallback)
  const itemSpecifics: string[] = [];
  const rawAttributes: Record<string, string> = {};
  const addSpec = (lblRaw: string, valRaw: string) => {
    const lbl = cleanHtmlText(lblRaw).replace(/:$/, '');
    const val = cleanHtmlText(valRaw);
    if (lbl && val && lbl.length < 40 && val.length < 120 && !rawAttributes[lbl]) {
      rawAttributes[lbl] = val;
      itemSpecifics.push(`${lbl}: ${val}`);
      if (
        ['Brand', 'Model', 'Features', 'Condition', 'Connectivity', 'Color', 'Material', 'Type'].some((k) =>
          lbl.toLowerCase().includes(k.toLowerCase())
        ) &&
        features.length < 4
      ) {
        features.push(`${lbl}: ${val}`);
      }
    }
  };

  for (const lm of html.matchAll(/<div class=["'][^"']*ux-labels-values__labels[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div class=["'][^"']*ux-labels-values__values[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    addSpec(lm[1], lm[2]);
  }
  for (const lm of html.matchAll(/<dt class=["'][^"']*ux-labels-values__labels[^"']*["'][^>]*>([\s\S]*?)<\/dt>\s*<dd class=["'][^"']*ux-labels-values__values[^"']*["'][^>]*>([\s\S]*?)<\/dd>/gi)) {
    addSpec(lm[1], lm[2]);
  }
  if (itemSpecifics.length === 0) {
    for (const lm of html.matchAll(/<td class=["']attrLabels["'][^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) {
      addSpec(lm[1], lm[2]);
    }
  }

  if (!rawDesc) {
    const ogDesc = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']*)["']/i);
    if (ogDesc?.[1]) rawDesc = cleanHtmlText(ogDesc[1]);
  }

  let finalDescription = rawDesc;
  if (!finalDescription) {
    finalDescription = title
      ? `Authentic ${title} featuring high-grade engineering, reliable functionality, and durable construction.`
      : 'Premium marketplace item featuring verified specifications and authentic build.';
  }
  if (itemSpecifics.length > 0) {
    finalDescription += '\n\nItem Specifics & Details:\n' + itemSpecifics.slice(0, 10).join(' • ');
  }

  if (features.length < 4 && itemSpecifics.length > 0) {
    for (const spec of itemSpecifics) {
      if (features.length >= 4) break;
      if (!features.includes(spec)) features.push(spec);
    }
  }

  const category = inferStoreCategory(title + ' ' + finalDescription);

  return {
    title: title || 'Imported Product',
    category,
    price,
    origPrice: origPrice && origPrice > price ? origPrice : (price > 0 ? Math.round(price * 1.25 * 100) / 100 : undefined),
    currency: 'USD',
    description: finalDescription,
    features: features.slice(0, 4),
    images: Array.from(imagesSet).slice(0, 12),
    specs: itemSpecifics.slice(0, 20),
    rawAttributes,
    compactContext: buildCompactContext('ebay', title, `${currency} ${price}`, itemSpecifics, rawDesc, html),
    sourceUrl,
    marketplace: 'ebay',
  };
}

/**
 * ============================================================================
 * SPECIALISED PARSER 2: Alibaba Products
 * Extracts window.detailData / globalData / JSON-LD, imageList (stripping
 * thumbnail suffixes like _50x50.jpg, _100x100.jpg, _.webp to get full-res),
 * productBasicProperties, and USD pricing.
 * ============================================================================
 */
export function normalizeAlibabaImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  url = url.replace(/^["'\s\\]+|["'\s\\]+$/g, '');
  url = url.replace(/\\u002F/gi, '/');
  url = url.replace(/\\/g, '');
  url = url.replace(/&amp;/g, '&');

  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  if (!/^https?:\/\//i.test(url)) return '';

  const lower = url.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.includes('/tps/') ||
    lower.includes('placeholder') ||
    lower.includes('avatar') ||
    lower.includes('logo') ||
    lower.includes('/icon') ||
    lower.includes('icon-') ||
    lower.includes('-icon') ||
    lower.includes('flag') ||
    lower.includes('qrcode') ||
    lower.includes('badge') ||
    lower.includes('1x1') ||
    lower.includes('transparent') ||
    lower.endsWith('.svg') ||
    lower.includes('.svg?')
  ) {
    return '';
  }

  // Strip OSS / CDN resize query parameters
  url = url.split('?')[0];

  // Strip Alibaba thumbnail suffixes: e.g. .jpg_50x50.jpg, .jpg_100x100.jpg_.webp, .png_300x300xz.png_.webp, .jpg_q50.jpg, .jpg_.webp
  url = url.replace(/(\.(?:jpg|jpeg|png|gif))(?:_\d+x\d+[^/]*|_q\d+[^/]*|_\.webp|_\.avif|_xz\.[^/]+)+$/i, '$1');
  url = url.replace(/_\d+x\d+(?:xz|q\d+)?\.(?:jpg|jpeg|png|webp)(?:_\.(?:webp|avif))?$/i, '.jpg');
  url = url.replace(/_\.(?:webp|avif)$/i, '');

  return url;
}

export function parseAlibabaProductHtml(rawHtml: string, sourceUrl: string = ''): ScrapedProductData {
  const html = sanitizeMarketplaceHtml(rawHtml, 'alibaba');
  let title = '';
  let price = 0;
  let origPrice: number | undefined = undefined;
  let currency = 'USD';
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const specs: string[] = [];
  const rawAttributes: Record<string, string> = {};

  const addImage = (u: string | undefined | null) => {
    if (!u || typeof u !== 'string') return;
    const norm = normalizeAlibabaImageUrl(u);
    if (norm && !imagesSet.has(norm)) imagesSet.add(norm);
  };

  const addAttr = (nameRaw: string, valRaw: string) => {
    const name = cleanHtmlText(nameRaw).replace(/:$/, '');
    const val = cleanHtmlText(valRaw);
    if (name && val && name.length < 60 && val.length < 180 && !rawAttributes[name]) {
      rawAttributes[name] = val;
      specs.push(`${name}: ${val}`);
    }
  };

  // 1. Parse JSON-LD
  for (const ld of extractJsonLdProducts(html)) {
    if (!title && ld.name) title = cleanHtmlText(String(ld.name));
    if (!rawDesc && ld.description) rawDesc = cleanHtmlText(String(ld.description));
    if (ld.image) {
      const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
      for (const im of imgs) {
        addImage(typeof im === 'string' ? im : im?.url || im?.contentUrl);
      }
    }
    if (ld.offers) {
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offer) {
        const cur = String(offer.priceCurrency || 'USD').toUpperCase();
        const p = parseFloat(String(offer.price || offer.lowPrice || '0'));
        if (p > 0 && price === 0) {
          currency = cur;
          price = convertToUsd(p, cur);
        }
      }
    }
  }

  // 2. Extract window.detailData / globalData / __INITIAL_DATA__
  const stateObjects = extractJsonAssignments(html, [
    /window\.detailData\s*=/i,
    /window\.__INITIAL_DATA__\s*=/i,
    /["']globalData["']\s*:/i,
    /globalData\s*=/i,
  ]);

  for (const state of stateObjects) {
    // Title
    if (!title) {
      const foundTitles = deepFindByKey(state, new Set(['subject', 'productTitle', 'title']), 6);
      for (const t of foundTitles) {
        if (typeof t.value === 'string' && t.value.trim().length > 5 && !t.value.includes('Alibaba.com')) {
          title = cleanHtmlText(t.value);
          break;
        }
      }
    }

    // Images (imageList, mediaItems, productImageList)
    const foundImgLists = deepFindByKey(
      state,
      new Set(['imageList', 'productImageList', 'mediaItems', 'mainImage', 'fullPathImageURI', 'originalImageURI']),
      7
    );
    for (const entry of foundImgLists) {
      if (typeof entry.value === 'string') {
        addImage(entry.value);
      } else if (Array.isArray(entry.value)) {
        for (const item of entry.value) {
          if (typeof item === 'string') {
            addImage(item);
          } else if (item && typeof item === 'object') {
            addImage(
              item.fullPathImageURI ||
                item.originalImageURI ||
                item.imageUrl ||
                item.url ||
                item.src ||
                item.big ||
                item.normal ||
                item.thumb
            );
          }
        }
      }
    }

    // productBasicProperties / productProperties / keyAttributes
    const foundProps = deepFindByKey(
      state,
      new Set(['productBasicProperties', 'productProperties', 'keyAttributes', 'basicProperties']),
      7
    );
    for (const entry of foundProps) {
      if (Array.isArray(entry.value)) {
        for (const prop of entry.value) {
          if (prop && typeof prop === 'object') {
            const k = prop.attrName || prop.name || prop.key || prop.label;
            const v = prop.attrValue || prop.value || prop.val;
            if (k && v) addAttr(String(k), String(v));
          }
        }
      }
    }

    // USD Pricing (ladderPrice, priceRange, formatPrice, minPrice, skuPrice)
    if (price === 0) {
      const foundPrices = deepFindByKey(
        state,
        new Set(['priceRange', 'ladderPrice', 'formatPrice', 'minPrice', 'price', 'skuPrice', 'unitPrice']),
        7
      );
      for (const pEntry of foundPrices) {
        if (typeof pEntry.value === 'string' && /\d/.test(pEntry.value)) {
          const parsedP = parsePriceAndCurrency(pEntry.value, currency);
          if (parsedP.price > 0) {
            price = parsedP.price;
            currency = parsedP.currency;
            break;
          }
        } else if (typeof pEntry.value === 'number' && pEntry.value > 0) {
          price = convertToUsd(pEntry.value, currency);
          break;
        } else if (Array.isArray(pEntry.value) && pEntry.value.length > 0) {
          const first = pEntry.value[0];
          const val = first?.price ?? first?.dollarPrice ?? first?.minPrice;
          if (val) {
            const parsedP = typeof val === 'number'
              ? { price: convertToUsd(val, currency), currency }
              : parsePriceAndCurrency(String(val), currency);
            if (parsedP.price > 0) {
              price = parsedP.price;
              currency = parsedP.currency;
              break;
            }
          }
        } else if (pEntry.value && typeof pEntry.value === 'object') {
          const val = pEntry.value.minPrice || pEntry.value.price || pEntry.value.dollarPrice;
          if (val) {
            const parsedP = typeof val === 'number'
              ? { price: convertToUsd(val, currency), currency }
              : parsePriceAndCurrency(String(val), currency);
            if (parsedP.price > 0) {
              price = parsedP.price;
              currency = parsedP.currency;
              break;
            }
          }
        }
      }
    }
  }

  // 3. Fallback DOM / regex extraction for imageList & alicdn /kf/ product images
  if (imagesSet.size === 0) {
    const imgListRegex = /["']imageList["']\s*:\s*(\[[\s\S]*?\])/gi;
    for (const m of html.matchAll(imgListRegex)) {
      for (const urlM of m[1].matchAll(/https?:\\?\/\\?\/[^"'\s]+alicdn\.com\/kf\/[^"'\s]+/gi)) {
        addImage(urlM[0]);
      }
    }
  }
  if (imagesSet.size === 0) {
    for (const urlM of html.matchAll(/(?:https?:)?(?:\\\/\\\/|\/\/)[a-z0-9.-]*alicdn\.com\/kf\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp)(?:[^"'\s<>\\]*)?/gi)) {
      addImage(urlM[0]);
    }
  }

  // 4. DOM Fallbacks for Title, Price, and Specs
  if (!title) {
    const tMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                   html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                   html.match(/<title>([\s\S]*?)<\/title>/i);
    if (tMatch) {
      title = cleanHtmlText(tMatch[1]).replace(/\s*[-|]\s*Alibaba\.com.*$/i, '').trim();
    }
  }

  if (price === 0) {
    const pMatch = html.match(/(?:US\s*\$|RMB\s*|CNY\s*|¥)\s*\d+(?:[.,]\d{1,2})?/i);
    if (pMatch) {
      const parsedP = parsePriceAndCurrency(pMatch[0]);
      if (parsedP.price > 0) {
        price = parsedP.price;
        currency = parsedP.currency;
      }
    }
  }

  if (specs.length === 0) {
    for (const rowM of html.matchAll(/<div[^>]*class=["'][^"']*do-entry-item[^"']*["'][^>]*>[\s\S]*?<span[^>]*class=["'][^"']*attr-name[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class=["'][^"']*attr-value[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)) {
      addAttr(rowM[1], rowM[2]);
    }
  }

  if (!rawDesc) {
    const ogDesc = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']*)["']/i);
    if (ogDesc?.[1]) rawDesc = cleanHtmlText(ogDesc[1]);
  }

  const features = specs.slice(0, 4);
  let finalDescription = rawDesc || (title ? `${title} — sourced with verified manufacturer specifications and direct quality assurance.` : '');
  if (specs.length > 0) {
    finalDescription += (finalDescription ? '\n\nProduct Specifications:\n' : 'Product Specifications:\n') + specs.slice(0, 10).join(' • ');
  }

  return {
    title: title || 'Imported Product',
    category: inferStoreCategory(title + ' ' + finalDescription),
    price,
    origPrice: origPrice && origPrice > price ? origPrice : (price > 0 ? Math.round(price * 1.3 * 100) / 100 : undefined),
    currency: 'USD',
    description: finalDescription,
    features,
    images: Array.from(imagesSet).slice(0, 12),
    specs: specs.slice(0, 20),
    rawAttributes,
    compactContext: buildCompactContext('alibaba', title, `${currency} ${price}`, specs, rawDesc, html),
    sourceUrl,
    marketplace: 'alibaba',
  };
}

/**
 * ============================================================================
 * SPECIALISED PARSER 3: AliExpress Products
 * Extracts runParams / window._dida_config_ / imageComponent.imagePathList /
 * priceComponent / specsComponent, normalizing image URLs to full resolution.
 * ============================================================================
 */
export function normalizeAliExpressImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  url = url.replace(/^["'\s\\]+|["'\s\\]+$/g, '');
  url = url.replace(/\\u002F/gi, '/');
  url = url.replace(/\\/g, '');
  url = url.replace(/&amp;/g, '&');

  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  if (!/^https?:\/\//i.test(url)) return '';

  const lower = url.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.includes('/tps/') ||
    lower.includes('placeholder') ||
    lower.includes('avatar') ||
    lower.includes('logo') ||
    lower.includes('/icon') ||
    lower.includes('icon-') ||
    lower.includes('-icon') ||
    lower.includes('badge') ||
    lower.includes('flag') ||
    lower.includes('1x1') ||
    lower.includes('promo') ||
    lower.endsWith('.svg') ||
    lower.includes('.svg?')
  ) {
    return '';
  }

  url = url.split('?')[0];

  // Strip AliExpress resize suffixes: _80x80.jpg, _220x220.jpg_.webp, _640x640q75.jpg_.avif, _960x960.jpg
  url = url.replace(/(\.(?:jpg|jpeg|png|gif))(?:_\d+x\d+[^/]*|_q\d+[^/]*|_Q\d+[^/]*|_\.webp|_\.avif)+$/i, '$1');
  url = url.replace(/_\d+x\d+(?:q\d+)?\.(?:jpg|jpeg|png|webp|avif)(?:_\.(?:webp|avif))?$/i, '.jpg');
  url = url.replace(/_\.(?:webp|avif)$/i, '');

  return url;
}

export function parseAliExpressProductHtml(rawHtml: string, sourceUrl: string = ''): ScrapedProductData {
  const html = sanitizeMarketplaceHtml(rawHtml, 'aliexpress');
  let title = '';
  let price = 0;
  let origPrice: number | undefined = undefined;
  let currency = 'USD';
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const specs: string[] = [];
  const rawAttributes: Record<string, string> = {};

  const addImage = (u: string | undefined | null) => {
    if (!u || typeof u !== 'string') return;
    const norm = normalizeAliExpressImageUrl(u);
    if (norm && !imagesSet.has(norm)) imagesSet.add(norm);
  };

  const addSpec = (nameRaw: string, valRaw: string) => {
    const name = cleanHtmlText(nameRaw).replace(/:$/, '');
    const val = cleanHtmlText(valRaw);
    if (name && val && name.length < 60 && val.length < 180 && !rawAttributes[name]) {
      rawAttributes[name] = val;
      specs.push(`${name}: ${val}`);
    }
  };

  // 1. Parse runParams / window._dida_config_ / __AER_DATA__ / __INIT_DATA__
  const stateObjects = extractJsonAssignments(html, [
    /window\.runParams\s*=/i,
    /\brunParams\s*=/i,
    /window\._dida_config_\s*=/i,
    /_init_data_\s*[:=]/i,
    /window\.__AER_DATA__\s*=/i,
    /window\.__INIT_DATA__\s*=/i,
  ]);

  for (const state of stateObjects) {
    // imageComponent.imagePathList (primary full-res gallery)
    const imgComps = deepFindByKey(state, new Set(['imageComponent']), 8);
    for (const ic of imgComps) {
      const list = ic.value?.imagePathList || ic.value?.summImagePathList;
      if (Array.isArray(list)) {
        for (const u of list) addImage(u);
      }
    }

    // Fallback direct imagePathList
    if (imagesSet.size === 0) {
      const pathLists = deepFindByKey(state, new Set(['imagePathList', 'summImagePathList']), 8);
      for (const pl of pathLists) {
        if (Array.isArray(pl.value)) {
          for (const u of pl.value) addImage(u);
        }
      }
    }

    // productInfoComponent / metaDataComponent -> title
    if (!title) {
      const infoComps = deepFindByKey(state, new Set(['productInfoComponent', 'metaDataComponent']), 8);
      for (const info of infoComps) {
        const cand = info.value?.subject || info.value?.title;
        if (typeof cand === 'string' && cand.trim().length > 4) {
          title = cleanHtmlText(cand);
          break;
        }
      }
    }

    // priceComponent -> USD pricing
    if (price === 0) {
      const priceComps = deepFindByKey(state, new Set(['priceComponent', 'skuPriceList']), 8);
      for (const pc of priceComps) {
        const v = pc.value;
        if (!v) continue;
        if (pc.key === 'priceComponent' && typeof v === 'object') {
          const cur = String(v.currencyCode || v.discountPrice?.minActivityAmount?.currency || v.origPrice?.minAmount?.currency || 'USD').toUpperCase();
          const act =
            v.discountPrice?.minActivityAmount?.value ??
            v.discountPrice?.minAmount?.value ??
            v.discountPrice?.actMinPrice ??
            v.discountPrice?.minPrice;
          const orig = v.origPrice?.minAmount?.value ?? v.origPrice?.minPrice ?? v.origPrice?.maxAmount?.value;

          if (act && Number(act) > 0) {
            currency = cur;
            price = convertToUsd(Number(act), cur);
          } else if (v.discountPrice?.minActivityAmount?.formatedAmount) {
            const parsedP = parsePriceAndCurrency(v.discountPrice.minActivityAmount.formatedAmount, cur);
            if (parsedP.price > 0) {
              price = parsedP.price;
              currency = parsedP.currency;
            }
          }

          if (orig && Number(orig) > 0) {
            const origUsd = convertToUsd(Number(orig), cur);
            if (origUsd > price) origPrice = origUsd;
          }
          if (price > 0) break;
        } else if (pc.key === 'skuPriceList' && Array.isArray(v)) {
          for (const sku of v) {
            const val = sku?.skuVal?.skuActivityAmount?.value ?? sku?.skuVal?.skuAmount?.value;
            const cur = String(sku?.skuVal?.skuActivityAmount?.currency || sku?.skuVal?.skuAmount?.currency || 'USD').toUpperCase();
            if (val && Number(val) > 0) {
              currency = cur;
              price = convertToUsd(Number(val), cur);
              break;
            }
          }
          if (price > 0) break;
        }
      }
    }

    // specsComponent / productPropComponent -> specs
    const specComps = deepFindByKey(state, new Set(['specsComponent', 'productPropComponent']), 8);
    for (const sc of specComps) {
      const props = sc.value?.props || sc.value;
      if (Array.isArray(props)) {
        for (const p of props) {
          if (p && typeof p === 'object') {
            const k = p.attrName || p.name || p.key;
            const v = p.attrValue || p.value;
            if (k && v) addSpec(String(k), String(v));
          }
        }
      }
    }
  }

  // 2. JSON-LD fallback
  for (const ld of extractJsonLdProducts(html)) {
    if (!title && ld.name) title = cleanHtmlText(String(ld.name));
    if (!rawDesc && ld.description) rawDesc = cleanHtmlText(String(ld.description));
    if (imagesSet.size === 0 && ld.image) {
      const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
      for (const im of imgs) addImage(typeof im === 'string' ? im : im?.url);
    }
    if (price === 0 && ld.offers) {
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offer?.price) {
        const cur = String(offer.priceCurrency || 'USD').toUpperCase();
        price = convertToUsd(parseFloat(String(offer.price)), cur);
        currency = cur;
      }
    }
  }

  // 3. Regex fallback for imagePathList or alicdn/aliexpress-media /kf/ URLs
  if (imagesSet.size === 0) {
    const pathListRegex = /["']imagePathList["']\s*:\s*(\[[^\]]+\])/gi;
    for (const m of html.matchAll(pathListRegex)) {
      const parsedArr = tryParseJsonSafe(m[1]);
      if (Array.isArray(parsedArr)) {
        for (const u of parsedArr) addImage(u);
      }
    }
  }
  if (imagesSet.size === 0) {
    for (const m of html.matchAll(/(?:https?:)?(?:\\\/\\\/|\/\/)[a-z0-9.-]*(?:alicdn\.com|aliexpress-media\.com)\/kf\/[A-Za-z0-9_.-]+\.(?:jpg|jpeg|png|webp|avif)(?:[^"'\s<>\\]*)?/gi)) {
      addImage(m[0]);
    }
  }

  // 4. Title / Price / Desc DOM fallbacks
  if (!title) {
    const tMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                   html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                   html.match(/<title>([\s\S]*?)<\/title>/i);
    if (tMatch) {
      title = cleanHtmlText(tMatch[1]).replace(/\s*[-|]\s*AliExpress.*$/i, '').trim();
    }
  }

  if (price === 0) {
    const pMatch = html.match(/(?:US\s*\$|\$|EUR\s*|€|GBP\s*|£)\s*\d+(?:[.,]\d{1,2})?/i);
    if (pMatch) {
      const parsedP = parsePriceAndCurrency(pMatch[0]);
      if (parsedP.price > 0) {
        price = parsedP.price;
        currency = parsedP.currency;
      }
    }
  }

  if (!rawDesc) {
    const ogDesc = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']*)["']/i);
    if (ogDesc?.[1]) rawDesc = cleanHtmlText(ogDesc[1]);
  }

  const features = specs.slice(0, 4);
  let finalDescription = rawDesc || (title ? `${title} — curated with complete technical specifications and verified product imagery.` : '');
  if (specs.length > 0) {
    finalDescription += (finalDescription ? '\n\nKey Specifications:\n' : 'Key Specifications:\n') + specs.slice(0, 10).join(' • ');
  }

  return {
    title: title || 'Imported Product',
    category: inferStoreCategory(title + ' ' + finalDescription),
    price,
    origPrice: origPrice && origPrice > price ? origPrice : (price > 0 ? Math.round(price * 1.3 * 100) / 100 : undefined),
    currency: 'USD',
    description: finalDescription,
    features,
    images: Array.from(imagesSet).slice(0, 12),
    specs: specs.slice(0, 20),
    rawAttributes,
    compactContext: buildCompactContext('aliexpress', title, `${currency} ${price}`, specs, rawDesc, html),
    sourceUrl,
    marketplace: 'aliexpress',
  };
}

/**
 * ============================================================================
 * SPECIALISED PARSER 4: Temu Products
 * Extracts window.rawData / __NEXT_DATA__ / goods high-res gallery arrays,
 * sku USD prices, and product attributes (supports Ctrl+U & F12 Copy outerHTML).
 * ============================================================================
 */
export function normalizeTemuImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  url = url.replace(/^["'\s\\]+|["'\s\\]+$/g, '');
  url = url.replace(/\\u002F/gi, '/');
  url = url.replace(/\\/g, '');
  url = url.replace(/&amp;/g, '&');

  if (url.startsWith('//')) {
    url = 'https:' + url;
  }
  if (!/^https?:\/\//i.test(url)) return '';

  const lower = url.toLowerCase();
  if (
    lower.startsWith('data:') ||
    lower.includes('placeholder') ||
    lower.includes('avatar') ||
    lower.includes('logo') ||
    lower.includes('/icon') ||
    lower.includes('icon-') ||
    lower.includes('-icon') ||
    lower.includes('badge') ||
    lower.includes('flag') ||
    lower.includes('emoji') ||
    lower.includes('1x1') ||
    lower.includes('sprite') ||
    lower.endsWith('.svg') ||
    lower.includes('.svg?')
  ) {
    return '';
  }

  // Upgrade Temu kwcdn.com / temu.com resize query strings without breaking signed URLs
  if (lower.includes('?imageview2') || lower.includes('?imagemogr2')) {
    if (!lower.includes('signature=') && !lower.includes('expires=') && !lower.includes('ossaccesskeyid=')) {
      url = url.split('?')[0];
    } else {
      url = url.replace(/\/w\/\d+/i, '/w/1600');
    }
  }

  return url;
}

export function parseTemuProductHtml(rawHtml: string, sourceUrl: string = ''): ScrapedProductData {
  const html = sanitizeMarketplaceHtml(rawHtml, 'temu');
  let title = '';
  let price = 0;
  let origPrice: number | undefined = undefined;
  let currency = 'USD';
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const specs: string[] = [];
  const rawAttributes: Record<string, string> = {};

  const addImage = (u: string | undefined | null) => {
    if (!u || typeof u !== 'string') return;
    const norm = normalizeTemuImageUrl(u);
    if (norm && !imagesSet.has(norm)) imagesSet.add(norm);
  };

  const addAttr = (nameRaw: string, valRaw: string) => {
    const name = cleanHtmlText(nameRaw).replace(/:$/, '');
    const val = cleanHtmlText(valRaw);
    if (name && val && name.length < 60 && val.length < 180 && !rawAttributes[name]) {
      rawAttributes[name] = val;
      specs.push(`${name}: ${val}`);
    }
  };

  // 1. Parse __NEXT_DATA__ script JSON
  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  const stateObjects: any[] = [];
  if (nextDataMatch?.[1]) {
    const parsedNext = tryParseJsonSafe(nextDataMatch[1]);
    if (parsedNext) stateObjects.push(parsedNext);
  }

  // 2. Parse window.rawData / window.__INITIAL_STATE__
  stateObjects.push(
    ...extractJsonAssignments(html, [
      /window\.rawData\s*=/i,
      /window\.__INITIAL_STATE__\s*=/i,
    ])
  );

  for (const state of stateObjects) {
    // Goods object
    const goodsHits = deepFindByKey(state, new Set(['goods', 'goodsInfo']), 7);
    for (const gh of goodsHits) {
      const g = gh.value;
      if (!g || typeof g !== 'object') continue;

      if (!title && (g.goodsName || g.title)) {
        title = cleanHtmlText(String(g.goodsName || g.title));
      }

      if (Array.isArray(g.gallery)) {
        for (const item of g.gallery) {
          addImage(typeof item === 'string' ? item : item?.url || item?.imageUrl || item?.hdThumbUrl);
        }
      }
      if (g.hdThumbUrl) addImage(g.hdThumbUrl);
      if (g.thumbUrl) addImage(g.thumbUrl);
      if (g.image) addImage(g.image);

      // Goods properties
      const propList = g.goodsProperty || g.goodsProperties || g.properties;
      if (Array.isArray(propList)) {
        for (const p of propList) {
          if (p && typeof p === 'object') {
            const k = p.key || p.name || p.attrName;
            const v = Array.isArray(p.values) ? p.values.join(', ') : (p.value || p.attrValue);
            if (k && v) addAttr(String(k), String(v));
          }
        }
      }
    }

    // Also search top-level gallery / goodsProperty / sku arrays in rawData.store
    const galleryHits = deepFindByKey(state, new Set(['gallery', 'galleryList', 'carouselImageList']), 7);
    for (const gl of galleryHits) {
      if (Array.isArray(gl.value)) {
        for (const item of gl.value) {
          addImage(typeof item === 'string' ? item : item?.url || item?.imageUrl);
        }
      }
    }

    const propHits = deepFindByKey(state, new Set(['goodsProperty', 'goodsProperties', 'productDetail']), 7);
    for (const ph of propHits) {
      const list = Array.isArray(ph.value) ? ph.value : ph.value?.properties;
      if (Array.isArray(list)) {
        for (const p of list) {
          if (p && typeof p === 'object') {
            const k = p.key || p.name || p.attrName;
            const v = Array.isArray(p.values) ? p.values.join(', ') : (p.value || p.attrValue);
            if (k && v) addAttr(String(k), String(v));
          }
        }
      }
    }

    // SKU USD prices
    if (price === 0) {
      const skuHits = deepFindByKey(state, new Set(['sku', 'skuList', 'skus']), 7);
      for (const sh of skuHits) {
        const list = Array.isArray(sh.value) ? sh.value : [sh.value];
        for (const sku of list) {
          if (!sku || typeof sku !== 'object') continue;
          const strPrice = sku.normalPriceStr || sku.priceStr || sku.minOnSalePriceStr || sku.salePriceStr;
          const strOrig = sku.marketPriceStr || sku.linePriceStr;
          if (strPrice) {
            const parsedP = parsePriceAndCurrency(String(strPrice));
            if (parsedP.price > 0) {
              price = parsedP.price;
              currency = parsedP.currency;
            }
          } else if (typeof sku.normalPrice === 'number' && sku.normalPrice > 0) {
            // Temu stores integer cents in normalPrice / price
            price = sku.normalPrice >= 100 && Number.isInteger(sku.normalPrice)
              ? Math.round((sku.normalPrice / 100) * 100) / 100
              : sku.normalPrice;
          }
          if (strOrig) {
            const parsedO = parsePriceAndCurrency(String(strOrig));
            if (parsedO.price > price) origPrice = parsedO.price;
          }
          if (sku.thumbUrl) addImage(sku.thumbUrl);
          if (price > 0) break;
        }
        if (price > 0) break;
      }
    }
  }

  // 3. JSON-LD fallback
  for (const ld of extractJsonLdProducts(html)) {
    if (!title && ld.name) title = cleanHtmlText(String(ld.name));
    if (!rawDesc && ld.description) rawDesc = cleanHtmlText(String(ld.description));
    if (imagesSet.size === 0 && ld.image) {
      const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
      for (const im of imgs) addImage(typeof im === 'string' ? im : im?.url);
    }
    if (price === 0 && ld.offers) {
      const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offer?.price) {
        const cur = String(offer.priceCurrency || 'USD').toUpperCase();
        price = convertToUsd(parseFloat(String(offer.price)), cur);
        currency = cur;
      }
    }
  }

  // 4. F12 outerHTML rendered DOM fallback (for kwcdn product gallery images, h1 title, $ price, attributes)
  if (imagesSet.size === 0) {
    for (const imgM of html.matchAll(/(?:https?:)?(?:\\\/\\\/|\/\/)[a-z0-9.-]*kwcdn\.com\/(?:product|goods|upload_aigc)\/[^\s"'<>\\]+/gi)) {
      addImage(imgM[0]);
    }
  }

  if (!title) {
    const tMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                   html.match(/["']goodsName["']\s*:\s*["']([^"']+)["']/i) ||
                   html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                   html.match(/<title>([\s\S]*?)<\/title>/i);
    if (tMatch) {
      title = cleanHtmlText(tMatch[1]).replace(/\s*[-|]\s*Temu.*$/i, '').trim();
    }
  }

  if (price === 0) {
    const pMatch = html.match(/["']normalPriceStr["']\s*:\s*["']([^"']+)["']/i) ||
                   html.match(/data-testid=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                   html.match(/(?:US\s*\$|\$)\s*\d+(?:\.\d{2})?/i);
    if (pMatch) {
      const parsedP = parsePriceAndCurrency(cleanHtmlText(pMatch[1] || pMatch[0]));
      if (parsedP.price > 0) {
        price = parsedP.price;
        currency = parsedP.currency;
      }
    }
  }

  if (!rawDesc) {
    const ogDesc = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']*)["']/i);
    if (ogDesc?.[1]) rawDesc = cleanHtmlText(ogDesc[1]);
  }

  const features = specs.slice(0, 4);
  let finalDescription = rawDesc || (title ? `${title} — curated with verified product specifications and original gallery photos.` : '');
  if (specs.length > 0) {
    finalDescription += (finalDescription ? '\n\nProduct Attributes:\n' : 'Product Attributes:\n') + specs.slice(0, 10).join(' • ');
  }

  return {
    title: title || 'Imported Product',
    category: inferStoreCategory(title + ' ' + finalDescription),
    price,
    origPrice: origPrice && origPrice > price ? origPrice : (price > 0 ? Math.round(price * 1.3 * 100) / 100 : undefined),
    currency: 'USD',
    description: finalDescription,
    features,
    images: Array.from(imagesSet).slice(0, 12),
    specs: specs.slice(0, 20),
    rawAttributes,
    compactContext: buildCompactContext('temu', title, `${currency} ${price}`, specs, rawDesc, html),
    sourceUrl,
    marketplace: 'temu',
  };
}

/**
 * Explicit platform dispatcher for the 5-platform selector architecture.
 */
export function parsePlatformHtml(platform: ImporterPlatform, html: string, url: string = ''): ScrapedProductData {
  switch (platform) {
    case 'amazon':
      return parseAmazonProductHtml(html, url);
    case 'ebay':
      return parseEbayProductHtml(html, url);
    case 'alibaba':
      return parseAlibabaProductHtml(html, url);
    case 'aliexpress':
      return parseAliExpressProductHtml(html, url);
    case 'temu':
      return parseTemuProductHtml(html, url);
  }
}

/**
 * Main parser entry point that detects marketplace and applies appropriate parser.
 * Amazon detection and parseAmazonProductHtml remain 100% untouched.
 */
export function parseProductHtml(html: string, url: string = ''): ScrapedProductData {
  const isAmazon = /amazon\.(com|co\.uk|de|fr|ca|it|es|co\.jp|in)|amzn\.to/i.test(url) ||
                   html.includes('amazon.com') ||
                   html.includes('id="productTitle"') ||
                   html.includes('id="corePrice_feature_div"');

  if (isAmazon) {
    return parseAmazonProductHtml(html, url);
  }

  const isEbay = /ebay\.(com|co\.uk|de|fr|ca|it|es|com\.au)/i.test(url) ||
                 html.includes('ebay.com') ||
                 html.includes('ux-image-carousel') ||
                 html.includes('x-item-title');

  if (isEbay) {
    return parseEbayProductHtml(html, url);
  }

  const isAlibaba = /alibaba\.com/i.test(url) ||
                    html.includes('window.detailData') ||
                    html.includes('alibaba.com');

  if (isAlibaba) {
    return parseAlibabaProductHtml(html, url);
  }

  const isAliExpress = /aliexpress\./i.test(url) ||
                       html.includes('window.runParams') ||
                       html.includes('window._dida_config_') ||
                       html.includes('aliexpress');

  if (isAliExpress) {
    return parseAliExpressProductHtml(html, url);
  }

  const isTemu = /temu\.com/i.test(url) ||
                 html.includes('window.rawData') ||
                 html.includes('temu.com') ||
                 html.includes('kwcdn.com');

  if (isTemu) {
    return parseTemuProductHtml(html, url);
  }

  // Fallback generic parser
  const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']*)["']/i) ||
                     html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanHtmlText(titleMatch[1]) : 'Imported Product';

  const descMatch = html.match(/<meta property=["']og:description["'] content=["']([^"']*)["']/i) ||
                    html.match(/<meta name=["']description["'] content=["']([^"']*)["']/i);
  const description = descMatch ? cleanHtmlText(descMatch[1]) : title;

  return {
    title,
    category: inferStoreCategory(title + ' ' + description),
    price: 49.99,
    description,
    features: ['🚀 Premium Quality Build', '🛡️ Full Official Warranty', '⚡ Global Fast Shipping', '💎 Certified Original'],
    images: [],
    sourceUrl: url,
    marketplace: 'unknown',
  };
}
