import type { ProductVariant } from '../types';
import { smartApiFetch } from '../lib/api';
import { normalizeVariantItem } from './variantUtils';

// ============================================================================
// AutoColorVisionEngine.ts (v2 - Fixed Yellow & Multi-Color Detection)
// ============================================================================

export interface AutoDetectedVariant {
  id: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  primaryImageUrl: string;
  galleryImages: string[];
  confidence: number;
}

/**
 * მთავარი ფუნქცია: აფასებს პროდუქტის სურათებს, გამორიცხავს ჯგუფურ ფოტოებსა და
 * ინფოგრაფიკებს, ამოიცნობს პროდუქტის რეალურ ფერებს და აჯგუფებს სურათებს ფერების მიხედვით.
 */
export async function autoDetectColorVariantsFromImages(
  imageUrls: string[],
  productTitle: string,
  _geminiApiKey?: string
): Promise<AutoDetectedVariant[]> {
  const cleanUrls = Array.from(
    new Set(
      (Array.isArray(imageUrls) ? imageUrls : [])
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => u.length > 0)
    )
  ).slice(0, 12);

  if (cleanUrls.length === 0) return [];

  // 1. პირველ რიგში ვიყენებთ სერვერულ Gemini Vision API-ს (/api/detect-color-variants)
  try {
    const aiVariants = await analyzeImagesViaServerVision(cleanUrls, productTitle);
    if (aiVariants.length > 0) {
      return aiVariants;
    }
  } catch (err) {
    console.warn('Gemini Vision fallback to HSL Histogram:', err);
  }

  // 2. გაუმჯობესებული HSL Hue Histogram Voting ალგორითმი (ზუსტად ცნობს ყვითელს და სხვა ფერებს)
  return await analyzeImagesViaHslHistogram(cleanUrls);
}

// ============================================================================
// ნაწილი 1: სერვერული GEMINI VISION API (გამორიცხავს ჯგუფურ ფოტოებს და ინფოგრაფიკებს)
// ============================================================================
async function analyzeImagesViaServerVision(
  imageUrls: string[],
  productTitle: string
): Promise<AutoDetectedVariant[]> {
  const response = await smartApiFetch('/api/detect-color-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrls: imageUrls.slice(0, 12),
      productTitle,
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload: any = await response.json().catch(() => null);
  if (!payload || !payload.success || !Array.isArray(payload.variants)) {
    return [];
  }

  return payload.variants
    .filter(
      (v: any): v is AutoDetectedVariant =>
        v &&
        typeof v.colorName === 'string' &&
        typeof v.primaryImageUrl === 'string' &&
        v.primaryImageUrl.trim().length > 0
    )
    .map((v: AutoDetectedVariant, idx: number) => ({
      id: v.id || `var_auto_${Date.now()}_${idx}`,
      colorName: v.colorName.trim(),
      colorHex: /^#[0-9A-Fa-f]{6}$/.test(v.colorHex || '') ? v.colorHex : '#18181B',
      sizeLabel: typeof v.sizeLabel === 'string' ? v.sizeLabel.trim() : '',
      primaryImageUrl: v.primaryImageUrl.trim(),
      galleryImages:
        Array.isArray(v.galleryImages) && v.galleryImages.length > 0
          ? v.galleryImages
          : [v.primaryImageUrl.trim()],
      confidence: typeof v.confidence === 'number' ? v.confidence : 0.85,
    }));
}

// ============================================================================
// ნაწილი 2: HSL HUE HISTOGRAM VOTING (პიქსელების ხმის მიცემის ალგორითმი)
// ============================================================================
async function analyzeImagesViaHslHistogram(
  imageUrls: string[]
): Promise<AutoDetectedVariant[]> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return [];
  }

  const grouped = new Map<string, AutoDetectedVariant>();

  for (const url of imageUrls.slice(0, 12)) {
    const detected = await detectDominantColorByHslVoting(url);
    if (!detected) continue;

    const key = detected.name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `hsl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        colorName: detected.name,
        colorHex: detected.hex,
        sizeLabel: '',
        primaryImageUrl: url,
        galleryImages: [url],
        confidence: detected.confidence,
      });
    } else {
      const existing = grouped.get(key)!;
      if (!existing.galleryImages.includes(url)) {
        existing.galleryImages.push(url);
      }
    }
  }

  const results = Array.from(grouped.values());
  return results.length > 1 ? results : [];
}

function loadImageElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.referrerPolicy = 'no-referrer';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 5000);

    img.onload = () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve(img);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve(null);
      }
    };
    img.src = src;
  });
}

async function detectDominantColorByHslVoting(
  imageUrl: string
): Promise<{ name: string; hex: string; confidence: number } | null> {
  const isExternalHttp =
    (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) &&
    (typeof window === 'undefined' || !imageUrl.startsWith(window.location.origin));

  // Route external URLs through /api/image-proxy first to avoid Canvas CORS tainting
  let img: HTMLImageElement | null = null;
  if (isExternalHttp) {
    img = await loadImageElement(`/api/image-proxy?url=${encodeURIComponent(imageUrl)}`);
  }
  if (!img) {
    img = await loadImageElement(imageUrl);
  }
  if (!img || !img.width || !img.height) {
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const size = 80;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    // ვამოწმებთ ცენტრალურ ნაწილს (20%-დან 80%-მდე)
    const start = Math.floor(size * 0.2);
    const end = Math.floor(size * 0.8);
    const data = ctx.getImageData(start, start, end - start, end - start).data;

    const votes: Record<string, number> = {};
    let validPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 150) continue;

      const { h, s, l } = rgbToHsl(r, g, b);

      // სუფთა თეთრი ფონის გამორიცხვა (L > 92% დაბალი სატურაციით)
      if (l > 92 && s < 20) continue;

      validPixels++;
      const colorBucket = classifyHslPixel(h, s, l);
      votes[colorBucket] = (votes[colorBucket] || 0) + 1;
    }

    if (validPixels < 20) return null;

    // ვპოულობთ ყველაზე მეტი ხმის მქონე ფერს (ქრომატულ ფერებს ვანიჭებთ პრიორიტეტს შავ თავსახურთან შედარებით)
    let bestColor = '';
    let maxScore = 0;

    for (const [colorName, count] of Object.entries(votes)) {
      const ratio = count / validPixels;
      // თუ პროდუქტი ყვითელი/წითელი/ლურჯია, მას ხშირად აქვს შავი თავსახური ან ჩრდილი,
      // ამიტომ ფერად პიქსელებს 1.6x წონას ვაძლევთ შავ/ნაცრისფერთან შედარებით
      const isChromatic = !['Black', 'White', 'Gray'].includes(colorName);
      const weightedScore = isChromatic ? ratio * 1.6 : ratio;

      if (weightedScore > maxScore) {
        maxScore = weightedScore;
        bestColor = colorName;
      }
    }

    const standardHexMap: Record<string, string> = {
      Yellow: '#FACC15',
      Orange: '#F97316',
      Red: '#EF4444',
      Pink: '#EC4899',
      Purple: '#8B5CF6',
      Blue: '#2563EB',
      'Navy Blue': '#1E3A8A',
      Cyan: '#06B6D4',
      Green: '#22C55E',
      Black: '#18181B',
      White: '#F8FAFC',
      Gray: '#9CA3AF',
      Brown: '#92400E',
    };

    if (!bestColor || maxScore < 0.22) return null;

    return {
      name: bestColor,
      hex: standardHexMap[bestColor] || '#CBD5E1',
      confidence: Math.min(0.95, maxScore),
    };
  } catch {
    // თუ CORS-მა მაინც დაბლოკა Canvas წაკითხვა
    return null;
  }
}

// ზუსტი RGB -> HSL კონვერტაცია (H: 0-360, S: 0-100, L: 0-100)
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

// თითოეული პიქსელის კლასიფიკაცია Hue კუთხის მიხედვით
function classifyHslPixel(h: number, s: number, l: number): string {
  if (l < 18) return 'Black';
  if (l > 86 && s < 25) return 'White';
  if (s < 18) return 'Gray';

  // ყვითელი დიაპაზონი (40° - 68°)
  if (h >= 40 && h <= 68) {
    if (l < 35) return 'Brown';
    return 'Yellow';
  }
  // ნარინჯისფერი (18° - 40°)
  if (h >= 18 && h < 40) {
    if (l < 35) return 'Brown';
    return 'Orange';
  }
  // წითელი (0° - 18° ან 340° - 360°)
  if (h < 18 || h >= 340) return 'Red';
  // ვარდისფერი / იასამნისფერი (265° - 340°)
  if (h >= 295 && h < 340) return 'Pink';
  if (h >= 265 && h < 295) return 'Purple';
  // ლურჯი და ცისფერი (175° - 265°)
  if (h >= 200 && h < 265) {
    if (l < 32) return 'Navy Blue';
    return 'Blue';
  }
  if (h >= 175 && h < 200) return 'Cyan';
  // მწვანე (68° - 175°)
  if (h > 68 && h < 175) return 'Green';

  return 'Gray';
}

/**
 * Converts AutoDetectedVariant[] directly into normalized store ProductVariant[].
 */
export function mapAutoDetectedVariantsToProductVariants(
  detected: AutoDetectedVariant[]
): ProductVariant[] {
  if (!Array.isArray(detected) || detected.length === 0) return [];
  return detected.map((v, idx) =>
    normalizeVariantItem(
      {
        id: v.id || `var_auto_${Date.now()}_${idx}`,
        colorName: v.colorName,
        colorHex: v.colorHex,
        sizeLabel: v.sizeLabel || '',
        imageUrl: v.primaryImageUrl,
        images: Array.isArray(v.galleryImages) && v.galleryImages.length > 0 ? v.galleryImages : [v.primaryImageUrl],
      },
      idx
    )
  );
}

/**
 * Safely merges auto-detected visual color variants into a product's existing variants list:
 * - If no variants exist yet, uses the auto-detected color variants directly.
 * - If variants already exist (e.g. from Amazon Ctrl+U HTML variationValues), preserves existing
 *   sizes/colors/prices and enriches any variants missing an imageUrl by matching colorName.
 */
export function mergeDetectedColorVariants(
  existingVariants: ProductVariant[],
  detected: AutoDetectedVariant[]
): ProductVariant[] {
  const safeExisting = Array.isArray(existingVariants) ? existingVariants : [];
  if (!Array.isArray(detected) || detected.length === 0) {
    return safeExisting;
  }

  if (safeExisting.length === 0) {
    return mapAutoDetectedVariantsToProductVariants(detected);
  }

  const findColorMatch = (colorName: string): AutoDetectedVariant | undefined => {
    const target = colorName.trim().toLowerCase();
    if (!target) return undefined;
    return (
      detected.find((d) => d.colorName.trim().toLowerCase() === target) ||
      detected.find(
        (d) =>
          target.includes(d.colorName.trim().toLowerCase()) ||
          d.colorName.trim().toLowerCase().includes(target)
      )
    );
  };

  return safeExisting.map((v, idx) => {
    const normalized = normalizeVariantItem(v, idx);
    if (normalized.imageUrl) {
      return normalized;
    }
    const matched = findColorMatch(normalized.colorName || '');
    if (!matched) {
      return normalized;
    }
    return normalizeVariantItem(
      {
        ...normalized,
        colorHex:
          normalized.colorHex && normalized.colorHex !== '#000000'
            ? normalized.colorHex
            : matched.colorHex,
        imageUrl: matched.primaryImageUrl,
        images: matched.galleryImages,
      },
      idx
    );
  });
}
