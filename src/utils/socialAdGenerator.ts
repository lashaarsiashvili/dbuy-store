import { Product } from '../types';
import { generateProductSlug } from '../context/StoreContext';
import { getCachedGelRate } from './exchangeRate';

export type AdPostStyle = 'sales' | 'story' | 'promo';
export type AdLanguage = 'ka' | 'en';

export interface SocialAdOptions {
  product: Product;
  style: AdPostStyle;
  language: AdLanguage;
  baseUrl?: string;
  customDiscountPercent?: number;
  exchangeRateGEL?: number;
}

/**
 * Builds the canonical public URL for a product
 */
export function getProductShareUrl(product: Product, customBaseUrl?: string, language?: AdLanguage): string {
  let origin = 'https://dbuystore.com';
  if (customBaseUrl) {
    origin = customBaseUrl;
  } else if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running on custom live domain (e.g. dbuystore.com), use window.location.origin.
    // When running on dev/preview container (run.app, localhost), fallback to public domain https://dbuystore.com
    // so Facebook, Instagram, Telegram and other external crawlers can access the public Open Graph tags and images!
    if (host && !host.includes('localhost') && !host.includes('run.app') && !host.includes('127.0.0.1')) {
      origin = window.location.origin;
    }
  }
  const slug = product.customSlug?.trim() || generateProductSlug(product.title);
  const path = product.customSlug
    ? `/b/${encodeURIComponent(slug)}`
    : (slug ? `/product/${product.id}/${encodeURIComponent(slug)}` : `/product/${product.id}`);
  const langParam = language ? `?lang=${language}` : '';
  return `${origin.replace(/\/$/, '')}${path}${langParam}`;
}

/**
 * Formats a clean, high-converting social media advertising post
 * optimized for Facebook, Instagram, Telegram, and Messenger.
 */
export function generateSocialAdPost(options: SocialAdOptions): {
  headline: string;
  caption: string;
  shareUrl: string;
  hashtags: string[];
} {
  const { product, style, language } = options;
  const isKa = language === 'ka';
  const shareUrl = getProductShareUrl(product, options.baseUrl, options.language);

  // Title selection
  const title = isKa
    ? (product.titleKa || product.title_ka || product.title)
    : (product.title_en || product.title || product.titleKa || 'Product');

  // Features selection
  let features: string[] = [];
  if (isKa) {
    if (product.features_ka && product.features_ka.length > 0) {
      features = product.features_ka.filter(Boolean);
    } else if (product.features && product.features.length > 0) {
      features = product.features.filter(Boolean);
    }
  } else {
    if (product.features_en && product.features_en.length > 0) {
      features = product.features_en.filter(Boolean);
    } else if (product.features && product.features.length > 0) {
      features = product.features.filter(Boolean);
    }
  }

  // Localization & Currency Logic:
  // If Georgian is selected: Generate the ad copy in Georgian. Fetch the original USD price
  // and automatically convert it to Georgian Lari (₾ / GEL) using the current exchange rate.
  // Perform the exact mathematical conversion—do not simply replace the currency symbol.
  // If English is selected: Generate the ad copy in English and keep the original price in USD ($).
  // Strict Constraint: This localization and conversion logic applies ONLY to the generated ad copy
  // and price display. Do NOT alter, translate, or modify product names, images, or base product descriptions.
  const rawUsdPrice = product.price || 0;
  const rawUsdOrigPrice = product.origPrice && product.origPrice > rawUsdPrice ? product.origPrice : null;
  const exchangeRate = options.exchangeRateGEL && options.exchangeRateGEL > 0
    ? options.exchangeRateGEL
    : getCachedGelRate();

  let price: number;
  let origPrice: number | null = null;
  let savings: number = 0;
  let currencySymbol: string;

  if (isKa) {
    // Exact mathematical conversion USD -> GEL
    price = Math.round(rawUsdPrice * exchangeRate * 100) / 100;
    if (rawUsdOrigPrice) {
      origPrice = Math.round(rawUsdOrigPrice * exchangeRate * 100) / 100;
      savings = Math.round((origPrice - price) * 100) / 100;
    }
    currencySymbol = '₾';
  } else {
    // Keep original price in USD ($)
    price = rawUsdPrice;
    if (rawUsdOrigPrice) {
      origPrice = rawUsdOrigPrice;
      savings = Math.round((origPrice - price) * 100) / 100;
    }
    currencySymbol = '$';
  }

  const discountPercent = origPrice && origPrice > price
    ? Math.round(((origPrice - price) / origPrice) * 100)
    : 0;

  // Category hashtag mapping
  const categoryTagsKa: Record<string, string> = {
    tech: '#ტექნიკა #გაჯეტები',
    fitness: '#ფიტნესი #ვარჯიში #ჯანსაღიცხოვრება',
    everyday: '#ყოველდღიური #აქსესუარები',
    accessories: '#აქსესუარები #სტილი',
  };
  const categoryTagsEn: Record<string, string> = {
    tech: '#Tech #Gadgets #Technology',
    fitness: '#Fitness #Workout #HealthyLife',
    everyday: '#Lifestyle #DailyEssentials',
    accessories: '#Accessories #Style',
  };

  const extraTags = isKa
    ? (categoryTagsKa[product.category] || '#შოპინგი')
    : (categoryTagsEn[product.category] || '#Shopping');

  const defaultHashtags = isKa
    ? ['#DBUY', '#ონლაინშოპინგი', '#ფასდაკლება', '#საქართველო', ...extraTags.split(' ')]
    : ['#DBUY', '#OnlineStore', '#DealOfTheDay', '#Sale', ...extraTags.split(' ')];

  // 1. FULL HIGH-CONVERTING SALES COPY
  if (style === 'sales') {
    if (isKa) {
      const headline = `🔥 ${title} — სპეციალური შეთავაზება DBUY-ში!`;
      const priceSection = origPrice
        ? `💰 ფასი: მხოლოდ ${price} ${currencySymbol} (ძველი ფასი: ${origPrice} ${currencySymbol} — დაზოგეთ ${savings} ${currencySymbol}! 🎉)`
        : `💰 ფასი: მხოლოდ ${price} ${currencySymbol}`;

      const featureBullets = features.length > 0
        ? features.slice(0, 4).map((f, i) => {
            const emojis = ['✨', '⭐', '🎯', '🚀'];
            const emoji = emojis[i % emojis.length];
            const clean = f.replace(/^[•\-\*\s]+/, '').trim();
            return `${emoji} ${clean}`;
          }).join('\n')
        : '✨ უმაღლესი პრემიუმ ხარისხი\n⭐ პრაქტიკული და ერგონომიული დიზაინი\n🎯 გარანტირებული საიმედოობა';

      const caption = `${headline}

${priceSection}

მთავარი უპირატესობები:
${featureBullets}

რატომ DBUY Store:
📦 სწრაფი & თრექინგით მიწოდება მთელი საქართველოს მასშტაბით
🚚 უფასო მიწოდება 100 ₾-ზე მეტი შეკვეთისას
💳 უსაფრთხო გადახდა (Visa, Mastercard, Apple Pay, Google Pay)
🛡️ 100% ხარისხისა და კმაყოფილების გარანტია

შეკვეთა (CTA):
👉 შეკვეთისთვის გადადით ბმულზე:
${shareUrl}
📥 დეტალებისთვის ან შეკვეთისთვის მოგვწერეთ პირადში (DM)!

${defaultHashtags.join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags };
    } else {
      const headline = `🔥 ${title} — Special Offer at DBUY Store!`;
      const priceSection = origPrice
        ? `💰 Price: Only ${currencySymbol}${price} (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}! 🎉)`
        : `💰 Price: Only ${currencySymbol}${price}`;

      const featureBullets = features.length > 0
        ? features.slice(0, 4).map((f, i) => {
            const emojis = ['✨', '⭐', '🎯', '🚀'];
            const emoji = emojis[i % emojis.length];
            const clean = f.replace(/^[•\-\*\s]+/, '').trim();
            return `${emoji} ${clean}`;
          }).join('\n')
        : '✨ Premium Build Quality & Engineering\n⭐ Sleek Modern Ergonomic Aesthetics\n🎯 Tested Daily Durability';

      const caption = `${headline}

${priceSection}

Key Highlights:
${featureBullets}

Why order with DBUY:
📦 Fast & Trackable Worldwide Delivery
🚚 Free Shipping on orders over $50
💳 Secure Checkout (Apple Pay, Google Pay, Cards, PayPal)
🛡️ 100% Satisfaction Guarantee

Call to Action (CTA):
👉 Tap the link to view and order now:
${shareUrl}
📥 DM us directly for inquiries or quick ordering!

${defaultHashtags.join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags };
    }
  }

  // 2. SHORT / STORY / REELS FORMAT
  if (style === 'story') {
    if (isKa) {
      const headline = `⚡ ${title}`;
      const priceSection = origPrice
        ? `💰 ფასი: მხოლოდ ${price} ${currencySymbol} (ძველი ფასი: ${origPrice} ${currencySymbol} — დაზოგეთ ${savings} ${currencySymbol}! 🎉)`
        : `💰 ფასი: მხოლოდ ${price} ${currencySymbol}`;

      const caption = `🔥 ${title} — სპეციალური შეთავაზება DBUY-ში!

${priceSection}

მთავარი უპირატესობები:
✨ პრემიუმ ხარისხი და ერგონომიული დიზაინი
⭐ გარანტირებული საიმედოობა

რატომ DBUY Store:
📦 სწრაფი მიწოდება მთელ საქართველოში
🛡️ 100% ხარისხის გარანტია

შეკვეთა (CTA):
👉 შეუკვეთეთ ბმულიდან:
${shareUrl}
📥 ან მოგვწერეთ პირად შეტყობინებაში!

${defaultHashtags.slice(0, 4).join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags.slice(0, 4) };
    } else {
      const headline = `⚡ ${title}`;
      const priceSection = origPrice
        ? `💰 Price: Only ${currencySymbol}${price} (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}! 🎉)`
        : `💰 Price: Only ${currencySymbol}${price}`;

      const caption = `🔥 ${title} — Special Offer at DBUY Store!

${priceSection}

Key Highlights:
✨ Premium Build Quality
⭐ Sleek Modern Aesthetics

Why order with DBUY:
📦 Fast & Trackable Delivery
🛡️ 100% Satisfaction Guarantee

Call to Action (CTA):
👉 Order directly via link:
${shareUrl}
📥 Or send us a DM!

${defaultHashtags.slice(0, 4).join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags.slice(0, 4) };
    }
  }

  // 3. SPECIAL PROMO / URGENT DEAL
  if (isKa) {
    const headline = `🚨 შეზღუდული აქცია! ${title} — ${discountPercent > 0 ? `-${discountPercent}%` : 'საუკეთესო ფასად'}`;
    const priceSection = origPrice
      ? `💰 ფასი: მხოლოდ ${price} ${currencySymbol} (ძველი ფასი: ${origPrice} ${currencySymbol} — დაზოგეთ ${savings} ${currencySymbol}! 🎉)`
      : `💰 ფასი: მხოლოდ ${price} ${currencySymbol}`;

    const caption = `🔥 ${title} — სპეციალური შეთავაზება DBUY-ში!

${priceSection}

მთავარი უპირატესობები:
✨ შეზღუდული დროის აქცია და საუკეთესო ფასი
⭐ 100% ორიგინალი პროდუქტი
🎯 შეზღუდული რაოდენობა მარაგში

რატომ DBUY Store:
📦 სწრაფი & თრექინგით მიწოდება
💳 უსაფრთხო ონლაინ გადახდა
🛡️ 100% ხარისხისა და კმაყოფილების გარანტია

შეკვეთა (CTA):
👉 ისარგებლეთ ფასდაკლებით სანამ მარაგი ამოიწურება:
${shareUrl}
📥 შეკვეთისთვის მოგვწერეთ პირად შეტყობინებაში!

${defaultHashtags.join(' ')}`;

    return { headline, caption, shareUrl, hashtags: defaultHashtags };
  } else {
    const headline = `🚨 Limited Time Flash Deal! ${title}`;
    const priceSection = origPrice
      ? `💰 Price: Only ${currencySymbol}${price} (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}! 🎉)`
      : `💰 Price: Only ${currencySymbol}${price}`;

    const caption = `🔥 ${title} — Special Offer at DBUY Store!

${priceSection}

Key Highlights:
✨ Limited Time Price Drop
⭐ Premium Grade Materials & Finish
🎯 High Demand Top Rated Item

Why order with DBUY:
📦 Fast & Trackable Worldwide Delivery
💳 Secure Checkout
🛡️ 100% Satisfaction Guarantee

Call to Action (CTA):
👉 Grab yours before the sale ends:
${shareUrl}
📥 DM us directly for inquiries or quick ordering!

${defaultHashtags.join(' ')}`;

    return { headline, caption, shareUrl, hashtags: defaultHashtags };
  }
}
