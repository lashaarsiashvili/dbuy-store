import { Product } from '../types';
import { generateProductSlug } from '../context/StoreContext';

export type AdPostStyle = 'sales' | 'story' | 'promo';
export type AdLanguage = 'ka' | 'en';

export interface SocialAdOptions {
  product: Product;
  style: AdPostStyle;
  language: AdLanguage;
  baseUrl?: string;
  customDiscountPercent?: number;
}

/**
 * Builds the canonical public URL for a product
 */
export function getProductShareUrl(product: Product, customBaseUrl?: string): string {
  const origin = customBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://dbuystore.com');
  const slug = product.customSlug?.trim() || generateProductSlug(product.title);
  const path = product.customSlug
    ? `/b/${encodeURIComponent(slug)}`
    : (slug ? `/product/${product.id}/${encodeURIComponent(slug)}` : `/product/${product.id}`);
  return `${origin.replace(/\/$/, '')}${path}`;
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
  const shareUrl = getProductShareUrl(product, options.baseUrl);

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

  // Price formatting
  const price = product.price || 0;
  const origPrice = product.origPrice && product.origPrice > price ? product.origPrice : null;
  const currencySymbol = isKa ? '₾' : '$';
  const savings = origPrice ? Math.round(origPrice - price) : 0;
  const discountPercent = origPrice ? Math.round(((origPrice - price) / origPrice) * 100) : 0;

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

      const featureList = features.slice(0, 4).map(f => `  • ${f}`).join('\n');

      const caption = `${headline}

${priceSection}

✨ რატომ უნდა შეიძინოთ:
${featureList || '  • უმაღლესი პრემიუმ ხარისხი\n  • პრაქტიკული და ერგონომიული დიზაინი\n  • გარანტირებული საიმედოობა'}

📦 შეკვეთის უპირატესობები:
  🚚 სწრაფი მიწოდება მთელი საქართველოს მასშტაბით
  💳 უსაფრთხო ონლაინ გადახდა (Visa, Mastercard, Apple Pay, Google Pay)
  🛡️ ოფიციალური ხარისხის გარანტია

👉 დეტალები და შეკვეთა იხილეთ ბმულზე:
${shareUrl}

📩 შეკვეთისთვის ასევე შეგიძლიათ მოგვწეროთ პირად შეტყობინებაში!

${defaultHashtags.join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags };
    } else {
      const headline = `🔥 ${title} — Special Offer at DBUY Store!`;
      const priceSection = origPrice
        ? `💰 Price: Only ${currencySymbol}${price} (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}! 🎉)`
        : `💰 Price: Only ${currencySymbol}${price}`;

      const featureList = features.slice(0, 4).map(f => `  • ${f}`).join('\n');

      const caption = `${headline}

${priceSection}

✨ Key Highlights:
${featureList || '  • Premium build and engineering\n  • Modern ergonomic design\n  • Tested durability'}

📦 Why order with DBUY:
  🚚 Fast & Trackable Worldwide Delivery
  💳 Secure Checkout (Apple Pay, Google Pay, Cards, PayPal)
  🛡️ 100% Satisfaction Guarantee

👉 Tap the link to view and order now:
${shareUrl}

📩 DM us directly for inquiries or quick ordering!

${defaultHashtags.join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags };
    }
  }

  // 2. SHORT / STORY / REELS FORMAT
  if (style === 'story') {
    if (isKa) {
      const headline = `⚡ აღმოაჩინე: ${title}`;
      const caption = `⚡ ${title}

${origPrice ? `🔥 ფასდაკლებით: ${price} ${currencySymbol} (ნაცვლად ${origPrice} ${currencySymbol}-ისა!)` : `🔥 ფასი: ${price} ${currencySymbol}`}
🚚 სწრაფი მიწოდება პირდაპირ კარამდე!

👉 შეუკვეთე აქ: ${shareUrl}
📩 ან მოგვწერე ჩათში

${defaultHashtags.slice(0, 4).join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags.slice(0, 4) };
    } else {
      const headline = `⚡ Spotlight: ${title}`;
      const caption = `⚡ ${title}

${origPrice ? `🔥 Now on Sale: ${currencySymbol}${price} (Was ${currencySymbol}${origPrice})` : `🔥 Price: ${currencySymbol}${price}`}
🚚 Fast door-to-door delivery!

👉 Order directly: ${shareUrl}
📩 Or send us a DM

${defaultHashtags.slice(0, 4).join(' ')}`;

      return { headline, caption, shareUrl, hashtags: defaultHashtags.slice(0, 4) };
    }
  }

  // 3. SPECIAL PROMO / URGENT DEAL
  if (isKa) {
    const headline = `🚨 შეზღუდული აქცია! ${title} — ${discountPercent > 0 ? `-${discountPercent}%` : 'საუკეთესო ფასად'}`;
    const caption = `🚨 შეზღუდული დროის აქცია DBUY-ში!

🌟 ${title}
${origPrice ? `💥 აქციის ფასი: ${price} ${currencySymbol} (${origPrice} ${currencySymbol}-ის ნაცვლად! დაზოგეთ ${savings} ${currencySymbol})` : `💥 საუკეთესო ფასი: ${price} ${currencySymbol}`}

⏰ მარაგში დარჩენილია მხოლოდ რამდენიმე ერთეული!
🚚 სწრაფი საკურიერო მიწოდება მთელ საქართველოში
💳 გადაიხადე ონლაინ ან განვადებით

👉 ისარგებლეთ ფასდაკლებით სანამ მარაგი ამოიწურება:
${shareUrl}

#აქცია #ფასდაკლება #DBUY #საქართველო #ონლაინშოპინგი`;

    return { headline, caption, shareUrl, hashtags: ['#აქცია', '#ფასდაკლება', '#DBUY', '#საქართველო'] };
  } else {
    const headline = `🚨 Flash Deal! ${title} — ${discountPercent > 0 ? `${discountPercent}% OFF` : 'Best Value'}`;
    const caption = `🚨 Limited Time Flash Deal at DBUY!

🌟 ${title}
${origPrice ? `💥 Deal Price: ${currencySymbol}${price} (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}!)` : `💥 Deal Price: ${currencySymbol}${price}`}

⏰ Limited inventory available at this price!
🚚 Fast trackable shipping
💳 Secure payments with instant confirmation

👉 Grab yours before the sale ends:
${shareUrl}

#FlashSale #SpecialDeal #DBUY #OnlineStore`;

    return { headline, caption, shareUrl, hashtags: ['#FlashSale', '#SpecialDeal', '#DBUY', '#OnlineStore'] };
  }
}
