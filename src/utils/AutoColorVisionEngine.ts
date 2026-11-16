import type { ProductVariant } from '../types';
import { smartApiFetch } from '../lib/api';
import { normalizeVariantItem, extractColorFromTitle, guessColorHex } from './variantUtils';

// ============================================================================
// AutoColorVisionEngine.ts (v3 - Title Hero Color Priority & Dark BG Ignore)
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
 * მთავარი ფუნქცია:
 * 1) ჯერ ამოწმებს პროდუქტის სათაურს (მაგ. "Logitech G733 ... - Blue") და Hero სურათს (index 0)
 *    აუცილებლად აკავშირებს სათაურში მითითებულ ფერთან (არასდროს "Black"-თან მუქი ფონის გამო).
 * 2) იყენებს სერვერულ Gemini Vision API-ს და სარეზერვო HSL Hue Histogram Voting ალგორითმს,
 *    რომელიც აიგნორებს მუქ და თეთრ ფონებს და აანალიზებს მხოლოდ ცენტრალური ობიექტის ფერს.
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

  const titleColor = extractColorFromTitle(productTitle);

  // 1. პირველ რიგში ვიყენებთ სერვერულ Gemini Vision API-ს (/api/detect-color-variants)
  try {
    const aiVariants = await analyzeImagesViaServerVision(cleanUrls, productTitle);
    if (aiVariants.length > 0) {
      return applyTitleColorHeroRule(aiVariants, cleanUrls[0], titleColor);
    }
  } catch (err) {
    console.warn('Gemini Vision fallback to HSL Histogram:', err);
  }

  // 2. გაუმჯობესებული HSL Hue Histogram Voting ალგორითმი (მუქი/თეთრი ფონის იგნორირებით)
  const hslVariants = await analyzeImagesViaHslHistogram(cleanUrls, titleColor);
  return applyTitleColorHeroRule(hslVariants, cleanUrls[0], titleColor);
}

/**
 * Ensures the hero image (index 0) is strictly assigned to the color mentioned in the product title
 * (e.g., "Blue" in "Logitech G733 ... - Blue") and NEVER mislabeled as "Black" due to a dark background.
 */
function applyTitleColorHeroRule(
  variants: AutoDetectedVariant[],
  heroImageUrl: string,
  titleColor: { name: string; hex: string } | null
): AutoDetectedVariant[] {
  if (!titleColor || !heroImageUrl || variants.length === 0) {
    return variants;
  }

  const targetKey = titleColor.name.trim().toLowerCase();
  const updated: AutoDetectedVariant[] = [];
  let heroVariant: AutoDetectedVariant | null = null;

  for (const v of variants) {
    const vKey = (v.colorName || '').trim().toLowerCase();
    const isTargetColor = vKey === targetKey || vKey.includes(targetKey) || targetKey.includes(vKey);

    if (isTargetColor) {
      const mergedGallery = [
        heroImageUrl,
        ...(v.galleryImages || []).filter((u) => u && u !== heroImageUrl),
      ];
      if (!heroVariant) {
        heroVariant = {
          ...v,
          colorName: titleColor.name,
          colorHex: v.colorHex || titleColor.hex,
          primaryImageUrl: heroImageUrl,
          galleryImages: mergedGallery,
          confidence: Math.max(v.confidence || 0.9, 0.95),
        };
      } else {
        for (const img of mergedGallery) {
          if (!heroVariant.galleryImages.includes(img)) {
            heroVariant.galleryImages.push(img);
          }
        }
      }
      continue;
    }

    // Remove heroImageUrl from any non-title-color variant (e.g. "Black" from dark background)
    const remainingGallery = (v.galleryImages || []).filter((u) => u && u !== heroImageUrl);
    const nextPrimary =
      v.primaryImageUrl === heroImageUrl ? remainingGallery[0] || '' : v.primaryImageUrl;

    if (!nextPrimary || remainingGallery.length === 0) {
      continue;
    }

    updated.push({
      ...v,
      primaryImageUrl: nextPrimary,
      galleryImages: remainingGallery,
    });
  }

  if (!heroVariant) {
    heroVariant = {
      id: `var_hero_${Date.now()}`,
      colorName: titleColor.name,
      colorHex: titleColor.hex,
      sizeLabel: '',
      primaryImageUrl: heroImageUrl,
      galleryImages: [heroImageUrl],
      confidence: 0.96,
    };
  }

  const finalList = [heroVariant, ...updated];
  return finalList.length > 1 || Boolean(finalList[0]?.sizeLabel) ? finalList : [];
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
      colorHex: /^#[0-9A-Fa-f]{6}$/.test(v.colorHex || '') ? v.colorHex : guessColorHex(v.colorName),
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
// ნაწილი 2: HSL HUE HISTOGRAM VOTING (მუქი/თეთრი ფონის იგნორირება + ცენტრალური ობიექტი)
// ============================================================================
async function analyzeImagesViaHslHistogram(
  imageUrls: string[],
  titleColor: { name: string; hex: string } | null
): Promise<AutoDetectedVariant[]> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return [];
  }

  const grouped = new Map<string, AutoDetectedVariant>();
  const sliceUrls = imageUrls.slice(0, 12);

  for (let i = 0; i < sliceUrls.length; i++) {
    const url = sliceUrls[i];
    let detected: { name: string; hex: string; confidence: number } | null = null;

    if (i === 0 && titleColor) {
      detected = { name: titleColor.name, hex: titleColor.hex, confidence: 0.96 };
    } else {
      detected = await detectDominantColorByHslVoting(url);
    }

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

    const fullData = ctx.getImageData(0, 0, size, size).data;

    // 1. Detect outer border background brightness so dark studio backgrounds are ignored
    let borderLSum = 0;
    let borderSSum = 0;
    let borderCount = 0;
    const borderBand = Math.floor(size * 0.08);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x >= borderBand && x < size - borderBand && y >= borderBand && y < size - borderBand) {
          continue;
        }
        const idx = (y * size + x) * 4;
        if (fullData[idx + 3] < 150) continue;
        const { s, l } = rgbToHsl(fullData[idx], fullData[idx + 1], fullData[idx + 2]);
        borderLSum += l;
        borderSSum += s;
        borderCount++;
      }
    }
    const borderAvgL = borderCount > 0 ? borderLSum / borderCount : 100;
    const borderAvgS = borderCount > 0 ? borderSSum / borderCount : 0;
    const isDarkBackground = borderAvgL < 24 && borderAvgS < 28;

    // 2. Analyze ONLY the inner center box (24% to 76%) with radial center weighting
    const start = Math.floor(size * 0.24);
    const end = Math.floor(size * 0.76);
    const centerCoord = size / 2;

    const votes: Record<string, number> = {};
    let totalWeight = 0;
    let chromaticWeight = 0;

    for (let y = start; y < end; y++) {
      for (let x = start; x < end; x++) {
        const idx = (y * size + x) * 4;
        const r = fullData[idx];
        const g = fullData[idx + 1];
        const b = fullData[idx + 2];
        const a = fullData[idx + 3];

        if (a < 150) continue;

        const { h, s, l } = rgbToHsl(r, g, b);

        // Exclude pure/near-white studio background
        if (l > 91 && s < 22) continue;
        // Exclude dark studio background pixels when image has a dark background
        if (isDarkBackground && l < 24 && s < 28) continue;
        // Always ignore near-black backdrop/shadow noise (L < 12, low saturation)
        if (l < 12 && s < 22) continue;

        const dx = (x - centerCoord) / (size * 0.3);
        const dy = (y - centerCoord) / (size * 0.3);
        const radialWeight = Math.max(0.4, 1.5 - 0.5 * (dx * dx + dy * dy));

        const colorBucket = classifyHslPixel(h, s, l);
        votes[colorBucket] = (votes[colorBucket] || 0) + radialWeight;
        totalWeight += radialWeight;

        if (!['Black', 'White', 'Gray', 'Silver'].includes(colorBucket)) {
          chromaticWeight += radialWeight;
        }
      }
    }

    if (totalWeight < 15) return null;

    const hasSignificantChromatic = chromaticWeight / totalWeight >= 0.1;

    // 3. Vote for the dominant center-object color (chromatic body beats dark caps/shadows)
    let bestColor = '';
    let maxScore = 0;

    for (const [colorName, weight] of Object.entries(votes)) {
      const ratio = weight / totalWeight;
      if (colorName === 'Black' && (isDarkBackground || hasSignificantChromatic)) {
        // Dark background or shadow should never beat a colored product body
        continue;
      }
      const isChromatic = !['Black', 'White', 'Gray', 'Silver'].includes(colorName);
      const weightedScore = isChromatic ? ratio * 1.9 : ratio;

      if (weightedScore > maxScore) {
        maxScore = weightedScore;
        bestColor = colorName;
      }
    }

    // If everything except Black was tiny, allow Black only when background was NOT dark
    if (!bestColor && !isDarkBackground && votes['Black']) {
      bestColor = 'Black';
      maxScore = votes['Black'] / totalWeight;
    }

    const standardHexMap: Record<string, string> = {
      Yellow: '#FACC15',
      Orange: '#F97316',
      Red: '#EF4444',
      Pink: '#EC4899',
      Lilac: '#C4B5FD',
      Purple: '#8B5CF6',
      'Light Blue': '#60A5FA',
      Blue: '#2563EB',
      'Navy Blue': '#1E3A8A',
      Cyan: '#06B6D4',
      Green: '#22C55E',
      Black: '#18181B',
      White: '#F8FAFC',
      Silver: '#CBD5E1',
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
  if (l > 84 && s < 25) return 'White';
  if (s < 16) {
    if (l >= 66) return 'Silver';
    return 'Gray';
  }

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
  // ვარდისფერი / იასამნისფერი / იასამნისფერი ღია (Lilac)
  if (h >= 295 && h < 340) return 'Pink';
  if (h >= 248 && h < 295) {
    if (l >= 64) return 'Lilac';
    return 'Purple';
  }
  // ლურჯი და ცისფერი (175° - 248°)
  if (h >= 200 && h < 248) {
    if (l < 32) return 'Navy Blue';
    if (l >= 64) return 'Light Blue';
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
