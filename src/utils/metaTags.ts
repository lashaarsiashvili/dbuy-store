import { Product } from '../types';
import { generateProductSlug } from '../context/StoreContext';
import { getProductShareUrl } from './socialAdGenerator';

export interface OpenGraphMetaPayload {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  price?: number | string;
  currency?: string;
}

/**
 * Derives dynamic Open Graph and Twitter card data matching the generated marketing copy
 */
export function getProductOpenGraphPayload(
  product: Product,
  language: 'ka' | 'en' = 'ka',
  customBaseUrl?: string
): OpenGraphMetaPayload {
  const isKa = language === 'ka';
  const rawTitle = isKa
    ? (product.titleKa || product.title_ka || product.title)
    : (product.title_en || product.title || product.titleKa || 'Product');
  
  const price = product.price || 0;
  const origPrice = product.origPrice && product.origPrice > price ? product.origPrice : null;
  const currencySymbol = isKa ? '₾' : '$';
  const currencyCode = isKa ? 'GEL' : 'USD';
  const savings = origPrice ? Math.round(origPrice - price) : 0;

  // High-converting marketing copy headline matching socialAdGenerator
  const headline = isKa
    ? `🔥 ${rawTitle} — სპეციალური შეთავაზება DBUY-ში!`
    : `🔥 ${rawTitle} — Special Offer at DBUY Store!`;

  // Compelling marketing description matching socialAdGenerator
  const description = isKa
    ? `💰 ფასი: მხოლოდ ${price} ${currencySymbol}${origPrice ? ` (ძველი ფასი: ${origPrice} ${currencySymbol} — დაზოგეთ ${savings} ${currencySymbol}! 🎉)` : ''} | 🚚 სწრაფი მიწოდება მთელ საქართველოში | 🛡️ ოფიციალური გარანტია | შეუკვეთეთ ონლაინ DBUY Store-ში`
    : `💰 Price: Only ${currencySymbol}${price}${origPrice ? ` (Regular: ${currencySymbol}${origPrice} — Save ${currencySymbol}${savings}! 🎉)` : ''} | 🚚 Fast Worldwide Delivery | 🛡️ Satisfaction Guarantee | Order online at DBUY Store`;

  const shareUrl = getProductShareUrl(product, customBaseUrl);
  const baseUrl = customBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://dbuystore.com');

  let imageUrl = product.image || (product.images && product.images[0]) || '/icon.png';
  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    imageUrl = `${cleanBase}${cleanPath}`;
  }

  return {
    title: headline,
    description,
    image: imageUrl,
    url: shareUrl,
    type: 'product',
    price: price > 0 ? String(price) : undefined,
    currency: currencyCode,
  };
}

/**
 * Updates DOM meta tags dynamically in browser
 */
export function updateOpenGraphMetaTags(payload: OpenGraphMetaPayload): void {
  if (typeof document === 'undefined') return;

  const setMeta = (attr: 'property' | 'name', key: string, value: string, id?: string) => {
    if (!value) return;
    let el: HTMLMetaElement | null = null;
    if (id) {
      el = document.getElementById(id) as HTMLMetaElement | null;
    }
    if (!el) {
      el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    }
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      if (id) el.id = id;
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };

  // Open Graph
  setMeta('property', 'og:title', payload.title, 'og-title');
  setMeta('property', 'og:description', payload.description, 'og-description');
  setMeta('property', 'og:image', payload.image, 'og-image');
  setMeta('property', 'og:image:secure_url', payload.image, 'og-image-secure');
  setMeta('property', 'og:url', payload.url, 'og-url');
  setMeta('property', 'og:type', payload.type || 'product', 'og-type');

  if (payload.price) {
    setMeta('property', 'product:price:amount', String(payload.price), 'og-price-amount');
  }
  if (payload.currency) {
    setMeta('property', 'product:price:currency', payload.currency, 'og-price-currency');
  }

  // Twitter
  setMeta('name', 'twitter:title', payload.title, 'twitter-title');
  setMeta('name', 'twitter:description', payload.description, 'twitter-description');
  setMeta('name', 'twitter:image', payload.image, 'twitter-image');

  // Standard Document
  setMeta('name', 'description', payload.description);
  document.title = payload.title;
}

/**
 * Resets meta tags back to default store branding
 */
export function resetStoreMetaTags(): void {
  updateOpenGraphMetaTags({
    title: 'DBUY Store — Quality Tech, Fitness & Everyday Essentials',
    description: '🔥 აღმოაჩინეთ საუკეთესო შეთავაზებები DBUY-ში! 🚚 სწრაფი მიწოდება მთელი საქართველოს მასშტაბით • 💳 უსაფრთხო გადახდა • 🛡️ ოფიციალური გარანტია',
    image: (typeof window !== 'undefined' ? window.location.origin : 'https://dbuystore.com') + '/icon.png',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://dbuystore.com',
    type: 'website',
  });
}
