/**
 * 1-Click Amazon & eBay Product Scraper and Parser Engine
 * Handles high-resolution image normalization, pricing, bullet points,
 * item specifics, and English product descriptions.
 */

export interface ScrapedProductData {
  title: string;
  category: string;
  price: number;
  origPrice?: number;
  description: string;
  features: string[];
  images: string[];
  sourceUrl?: string;
  marketplace: 'amazon' | 'ebay' | 'unknown';
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
 * Upgrades eBay image URLs to maximum resolution (/s-l1600.jpg)
 */
export function normalizeEbayImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim();
  // Upgrade s-l500.jpg, s-l300.webp, s-l64.jpg to s-l1600.jpg
  clean = clean.replace(/\/s-l\d+\.(jpg|png|webp)/i, '/s-l1600.jpg');
  if (clean.includes('ebaystatic.com') || clean.includes('blank.gif') || clean.includes('icon')) {
    return '';
  }
  return clean;
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
 * Specialised Parser for eBay Products
 */
export function parseEbayProductHtml(html: string, sourceUrl: string = ''): ScrapedProductData {
  let title = '';
  let price = 0;
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const features: string[] = [];

  // 1. JSON-LD Extraction
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const productObj = parsed['@type'] === 'Product'
        ? parsed
        : (Array.isArray(parsed['@graph']) ? parsed['@graph'].find((item: any) => item['@type'] === 'Product') : null);

      if (productObj) {
        if (!title && productObj.name) {
          title = cleanHtmlText(productObj.name);
        }
        if (!rawDesc && productObj.description) {
          rawDesc = cleanHtmlText(productObj.description);
        }
        if (productObj.image) {
          const imgs = Array.isArray(productObj.image) ? productObj.image : [productObj.image];
          for (const img of imgs) {
            const norm = normalizeEbayImageUrl(typeof img === 'string' ? img : img.url);
            if (norm) imagesSet.add(norm);
          }
        }
        if (productObj.offers) {
          const offers = Array.isArray(productObj.offers) ? productObj.offers[0] : productObj.offers;
          const p = parseFloat(String(offers.price || offers.lowPrice || '0'));
          if (p > 0 && price === 0) price = p;
        }
      }
    } catch {}
  }

  // 2. Title fallback
  if (!title) {
    const titleMatch = html.match(/class=["'][^"']*x-item-title__mainTitle[^"']*["'][^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                       html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = cleanHtmlText(titleMatch[1]);
      title = title.replace(/\s*\|\s*eBay$/i, '').trim();
    }
  }

  // 3. Price fallback
  if (price === 0) {
    const priceMatch = html.match(/class=["'][^"']*x-price-primary[^"']*["'][^>]*>[\s\S]*?class=["']ux-textspans[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                       html.match(/itemprop=["']price["']\s+content=["']([^"']+)["']/i) ||
                       html.match(/class=["']ux-textspans[^"']*["'][^>]*>\s*(?:US\s*)?\$([0-9,.]+)/i);
    if (priceMatch) {
      const rawPrice = (priceMatch[1] || priceMatch[0]).replace(/[^0-9.]/g, '');
      price = parseFloat(rawPrice) || 0;
    }
  }

  // 4. High-Res Images Extraction
  // A) .ux-image-carousel-item img (src, data-zoom-src, data-src)
  const carouselMatches = html.matchAll(/class=["'][^"']*ux-image-carousel-item[^"']*["'][^>]*>[\s\S]*?<img[^>]+(?:src|data-zoom-src|data-src)=["']([^"']+)["']/gi);
  for (const m of carouselMatches) {
    const norm = normalizeEbayImageUrl(m[1]);
    if (norm) imagesSet.add(norm);
  }

  // B) Scan for all i.ebayimg.com URLs
  const ebayImgMatches = html.matchAll(/https:\/\/i\.ebayimg\.com\/images\/g\/[A-Za-z0-9_-]+\/s-l\d+\.(?:jpg|png|webp)/gi);
  for (const m of ebayImgMatches) {
    const norm = normalizeEbayImageUrl(m[0]);
    if (norm) imagesSet.add(norm);
  }

  // 5. Item specifics (.ux-labels-values)
  const itemSpecifics: string[] = [];
  const labelMatches = html.matchAll(/<div class=["']ux-labels-values__labels[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div class=["']ux-labels-values__values[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi);
  for (const lm of labelMatches) {
    const lbl = cleanHtmlText(lm[1]);
    const val = cleanHtmlText(lm[2]);
    if (lbl && val && lbl.length < 30 && val.length < 60) {
      itemSpecifics.push(`${lbl}: ${val}`);
      if (
        ['Brand', 'Model', 'Features', 'Condition', 'Connectivity', 'Color', 'Material'].some(k => lbl.toLowerCase().includes(k.toLowerCase())) &&
        features.length < 4
      ) {
        features.push(`✨ ${lbl}: ${val}`);
      }
    }
  }

  // Combine into clean English description
  let finalDescription = rawDesc;
  if (!finalDescription) {
    finalDescription = title ? `Authentic ${title} featuring high-grade engineering, reliable functionality, and durable construction.` : 'Premium marketplace item featuring verified specifications and authentic build.';
  }
  if (itemSpecifics.length > 0) {
    finalDescription += '\n\nItem Specifics & Details:\n' + itemSpecifics.slice(0, 8).join(' • ');
  }

  if (features.length < 4 && itemSpecifics.length > 0) {
    for (const spec of itemSpecifics) {
      if (features.length >= 4) break;
      const formatted = `💎 ${spec}`;
      if (!features.includes(formatted)) features.push(formatted);
    }
  }

  const category = inferStoreCategory(title + ' ' + finalDescription);

  return {
    title,
    category,
    price,
    origPrice: price > 0 ? Math.round(price * 1.25 * 100) / 100 : undefined,
    description: finalDescription,
    features: features.slice(0, 4),
    images: Array.from(imagesSet).slice(0, 10),
    sourceUrl,
    marketplace: 'ebay',
  };
}

/**
 * Main parser entry point that detects marketplace and applies appropriate parser
 */
export function parseProductHtml(html: string, url: string = ''): ScrapedProductData {
  const isAmazon = /amazon\.(com|co\.uk|de|fr|ca|it|es|co\.jp|in)|amzn\.to/i.test(url) ||
                   html.includes('amazon.com') ||
                   html.includes('id="productTitle"') ||
                   html.includes('id="corePrice_feature_div"');

  const isEbay = /ebay\.(com|co\.uk|de|fr|ca|it|es|com\.au)/i.test(url) ||
                 html.includes('ebay.com') ||
                 html.includes('ux-image-carousel') ||
                 html.includes('x-item-title');

  if (isAmazon) {
    return parseAmazonProductHtml(html, url);
  } else if (isEbay) {
    return parseEbayProductHtml(html, url);
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
