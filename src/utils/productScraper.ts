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
 * and normalizes size modifiers (e.g. /s-l64.jpg, /s-l300.jpg, /s-l500.jpg, $_57.JPG)
 * while filtering out placeholders, 1x2 GIFs, SVGs, and UI icons.
 */
export function normalizeEbayImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // Strip enclosing quotes, whitespace, or escape backslashes
  url = url.replace(/^["'\s\\]+|["'\s\\]+$/g, '');
  url = url.replace(/\\/g, '');
  url = url.replace(/&amp;/g, '&');
  url = url.replace(/&#x2F;/g, '/');
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
    lower.includes('ebaystatic.com/cr/') || // internal eBay UI assets/sprites
    lower.includes('ebaystatic.com/pictures/') || // internal eBay UI assets
    lower.includes('badge') ||
    lower.includes('arrow') ||
    lower.endsWith('.svg') ||
    lower.includes('.svg?')
  ) {
    return '';
  }

  // Upgrade eBay image assets (i.ebayimg.com, ir.ebaystatic.com)
  if (lower.includes('i.ebayimg.com') || lower.includes('ir.ebaystatic.com')) {
    // 1. Remove thumbnail subfolder if present: /thumbs/images/ -> /images/
    url = url.replace(/\/thumbs\/images\//i, '/images/');

    // 2. Upgrade smaller sizing modifiers (e.g. /s-l64.jpg, /s-l300.jpg, /s-l500.jpg, /s-l1600.webp) to /s-l1600.jpg
    url = url.replace(/\/s-l\d+\.(?:jpg|jpeg|png|webp)/i, '/s-l1600.jpg');

    // 3. Upgrade legacy size modifiers like /$_57.JPG, /$_12.JPG, /$_1.JPG to /s-l1600.jpg
    url = url.replace(/\/\$_[0-9]+(?:\.[a-zA-Z]+)?(?:\?[^"'\s]*)?$/i, '/s-l1600.jpg');
    url = url.replace(/\/\$_[0-9]+(?:\.[a-zA-Z]+)?\b/i, '/s-l1600.jpg');

    // 4. Strip trailing query parameters if set_id is attached to s-l1600.jpg for clean URL
    if (url.includes('/s-l1600.jpg')) {
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
 * Specialised Parser for eBay Products
 */
export function parseEbayProductHtml(html: string, sourceUrl: string = ''): ScrapedProductData {
  let title = '';
  let price = 0;
  let rawDesc = '';
  const imagesSet = new Set<string>();
  const features: string[] = [];

  // Helper to add normalized eBay image URL
  const addImageUrl = (rawUrl: string | undefined | null) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const norm = normalizeEbayImageUrl(rawUrl);
    if (norm && !imagesSet.has(norm)) {
      imagesSet.add(norm);
    }
  };

  // Helper to extract candidate URLs from an <img> tag in priority order
  const extractUrlsFromImgTag = (imgTag: string) => {
    if (!imgTag) return;

    // 1. data-zoom-src (top priority full high-res)
    const zoomMatch = imgTag.match(/data-zoom-src=["']([^"']+)["']/i);
    if (zoomMatch && zoomMatch[1]) addImageUrl(zoomMatch[1]);

    // 2. data-img-url
    const dataImgMatch = imgTag.match(/data-img-url=["']([^"']+)["']/i);
    if (dataImgMatch && dataImgMatch[1]) addImageUrl(dataImgMatch[1]);

    // 3. data-src
    const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i);
    if (dataSrcMatch && dataSrcMatch[1]) addImageUrl(dataSrcMatch[1]);

    // 4. srcset
    const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
    if (srcsetMatch && srcsetMatch[1]) {
      const entries = srcsetMatch[1].split(',');
      for (const entry of entries) {
        const u = entry.trim().split(/\s+/)[0];
        if (u) addImageUrl(u);
      }
    }

    // 5. src
    const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) addImageUrl(srcMatch[1]);
  };

  // -------------------------------------------------------------
  // SOURCE A: <script type="application/ld+json"> (Product.image)
  // -------------------------------------------------------------
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const rawText = m[1].trim();
      if (!rawText) continue;
      const parsed = JSON.parse(rawText);

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
        if (type === 'Product' || type === 'IndividualProduct') {
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
            const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offers) {
              const p = parseFloat(String(offers.price || offers.lowPrice || '0'));
              if (p > 0 && price === 0) price = p;
            }
          }
        }
      }
    } catch {}
  }

  // ---------------------------------------------------------------------------------------
  // SOURCE B: .ux-image-carousel-item img or .image-treatment img (src, data-src, data-zoom-src, data-img-url, srcset)
  // ---------------------------------------------------------------------------------------
  // B.1: Match entire carousel item or image-treatment blocks
  const containerRegex = /<(?:div|li|span|button)[^>]*class=["'][^"']*(?:ux-image-carousel-item|image-treatment|ux-image-filmstrip-carousel-item|ux-image-grid-item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|li|span|button)>/gi;
  let matchContainer: RegExpExecArray | null;
  while ((matchContainer = containerRegex.exec(html)) !== null) {
    const block = matchContainer[1];
    const imgMatches = block.matchAll(/<img[^>]+>/gi);
    for (const imgMatch of imgMatches) {
      extractUrlsFromImgTag(imgMatch[0]);
    }
  }

  // B.2: Target any <img> tag with carousel / image-treatment class or data-zoom-src / data-img-url directly
  const imgTagMatches = html.matchAll(/<img[^>]+(?:class=["'][^"']*(?:ux-image-carousel-item|image-treatment)[^"']*["']|data-zoom-src=|data-img-url=)[^>]*>/gi);
  for (const imgM of imgTagMatches) {
    extractUrlsFromImgTag(imgM[0]);
  }

  // ---------------------------------------------------------------------------------------
  // SOURCE C: Fallback gallery thumbnails from #icImg or .vi-image-gallery img
  // ---------------------------------------------------------------------------------------
  // C.1: Classic eBay #icImg
  const icImgMatch = html.match(/<img[^>]*id=["']icImg["'][^>]*>/i);
  if (icImgMatch) {
    extractUrlsFromImgTag(icImgMatch[0]);
  }

  // C.2: .vi-image-gallery or #vi_main_img_fs
  const galleryMatches = html.matchAll(/<(?:div|ul|table)[^>]*class=["'][^"']*(?:vi-image-gallery|vi_main_img_fs|gallery-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|ul|table)>/gi);
  for (const gm of galleryMatches) {
    const imgs = gm[1].matchAll(/<img[^>]+>/gi);
    for (const im of imgs) {
      extractUrlsFromImgTag(im[0]);
    }
  }

  // ---------------------------------------------------------------------------------------
  // SOURCE D: Scan for embedded eBay high-res image patterns in scripts & DOM
  // ---------------------------------------------------------------------------------------
  const globalEbayImgRegex = /(?:https?:)?(?:\\\/\\\/|\/\/|\\\/\\\/|https?:\/\/)(?:i\.ebayimg\.com|ir\.ebaystatic\.com)[^\s"'<>\\{}|[\]^`]+/gi;
  const rawUrlsFound = html.matchAll(globalEbayImgRegex);
  for (const rawM of rawUrlsFound) {
    let candidate = rawM[0].replace(/\\/g, '');
    if (candidate.startsWith('//')) candidate = 'https:' + candidate;
    if (!candidate.startsWith('http')) candidate = 'https://' + candidate.replace(/^https?:\/\//, '');
    if (candidate.includes('/images/') || candidate.includes('/00/s/')) {
      addImageUrl(candidate);
    }
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
    images: Array.from(imagesSet).slice(0, 12),
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
