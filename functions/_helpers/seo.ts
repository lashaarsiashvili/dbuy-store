import { initialProducts } from '../../src/data/initialProducts';

export function injectProductOpenGraph(html: string, identifier: string, requestUrl: string): string {
  if (!identifier) return html;

  const decoded = decodeURIComponent(identifier).toLowerCase().trim();
  const slugify = (text: string) => {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u10A0-\u10FF-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const product = initialProducts.find((p) => {
    const idMatch = String(p.id).toLowerCase() === decoded;
    const slugMatch = p.customSlug && p.customSlug.toLowerCase().trim() === decoded;
    const genSlugMatch = slugify(p.title) === decoded;
    return idMatch || slugMatch || genSlugMatch;
  });

  if (!product) return html;

  const title = product.titleKa || product.title_ka || product.title;
  const price = product.price || 0;
  const origPrice = product.origPrice && product.origPrice > price ? product.origPrice : null;
  const savings = origPrice ? Math.round(origPrice - price) : 0;

  const seoTitle = `🔥 ${title} — მხოლოდ ${price} ₾ DBUY-ში!`;
  const seoDesc = `💰 ფასი: ${price} ₾${origPrice ? ` (ძველი ფასი: ${origPrice} ₾ — დაზოგეთ ${savings} ₾! 🎉)` : ''} | 🚚 სწრაფი მიწოდება მთელ საქართველოში • 🛡️ ოფიციალური გარანტია • შეუკვეთეთ ონლაინ`;
  
  let seoImage = 'https://dbuystore.com/icon.png';
  if (product.image) {
    seoImage = product.image.startsWith('http')
      ? product.image
      : `https://dbuystore.com${product.image.startsWith('/') ? '' : '/'}${product.image}`;
  }

  const seoUrl = requestUrl;

  let modifiedHtml = html
    .replace(/<title>[^<]*<\/title>/, `<title>${seoTitle}</title>`)
    .replace(/<meta name="description" [^>]*>/, `<meta name="description" content="${seoDesc}" />`)
    .replace(/<meta property="og:title" [^>]*>/, `<meta property="og:title" content="${seoTitle}" id="og-title" />`)
    .replace(/<meta property="og:description" [^>]*>/, `<meta property="og:description" content="${seoDesc}" id="og-description" />`)
    .replace(/<meta property="og:image" [^>]*>/g, `<meta property="og:image" content="${seoImage}" id="og-image" />`)
    .replace(/<meta property="og:image:secure_url" [^>]*>/g, `<meta property="og:image:secure_url" content="${seoImage}" id="og-image-secure" />`)
    .replace(/<meta property="og:url" [^>]*>/g, `<meta property="og:url" content="${seoUrl}" id="og-url" />`)
    .replace(/<meta name="twitter:title" [^>]*>/, `<meta name="twitter:title" content="${seoTitle}" id="twitter-title" />`)
    .replace(/<meta name="twitter:description" [^>]*>/, `<meta name="twitter:description" content="${seoDesc}" id="twitter-description" />`)
    .replace(/<meta name="twitter:image" [^>]*>/g, `<meta name="twitter:image" content="${seoImage}" id="twitter-image" />`);

  if (price) {
    modifiedHtml = modifiedHtml.replace(
      /<meta property="product:price:amount" [^>]*>/,
      `<meta property="product:price:amount" content="${price}" id="og-price-amount" />`
    );
  }

  return modifiedHtml;
}
