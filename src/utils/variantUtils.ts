import type { ProductVariant } from '../types';

export function guessColorHex(colorName: string): string {
  const lower = (colorName || '').toLowerCase();
  if (lower.includes('black') || lower.includes('ebony') || lower.includes('onyx')) return '#18181B';
  if (lower.includes('white') || lower.includes('ivory') || lower.includes('cream') || lower.includes('pearl')) return '#F8FAFC';
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('scarlet') || lower.includes('burgundy') || lower.includes('wine')) return '#DC2626';
  if (lower.includes('navy') || lower.includes('midnight')) return '#1E3A8A';
  if (lower.includes('light blue') || lower.includes('sky blue') || lower.includes('baby blue')) return '#60A5FA';
  if (lower.includes('blue') || lower.includes('cobalt') || lower.includes('azure') || lower.includes('sky')) return '#2563EB';
  if (lower.includes('mint')) return '#34D399';
  if (lower.includes('teal') || lower.includes('cyan') || lower.includes('turquoise') || lower.includes('aqua')) return '#06B6D4';
  if (lower.includes('green') || lower.includes('olive') || lower.includes('emerald') || lower.includes('sage')) return '#16A34A';
  if (lower.includes('yellow') || lower.includes('amber')) return '#FACC15';
  if (lower.includes('gold')) return '#EAB308';
  if (lower.includes('orange') || lower.includes('coral') || lower.includes('peach')) return '#F97316';
  if (lower.includes('lilac') || lower.includes('lavender')) return '#C4B5FD';
  if (lower.includes('purple') || lower.includes('violet') || lower.includes('plum')) return '#8B5CF6';
  if (lower.includes('rose gold')) return '#E8B4B8';
  if (lower.includes('pink') || lower.includes('rose') || lower.includes('magenta') || lower.includes('blush')) return '#EC4899';
  if (lower.includes('beige') || lower.includes('khaki') || lower.includes('tan')) return '#D6C7B2';
  if (lower.includes('brown') || lower.includes('coffee') || lower.includes('espresso') || lower.includes('walnut')) return '#92400E';
  if (lower.includes('silver') || lower.includes('chrome') || lower.includes('platinum') || lower.includes('titanium')) return '#CBD5E1';
  if (lower.includes('gray') || lower.includes('grey') || lower.includes('charcoal') || lower.includes('slate') || lower.includes('graphite')) return '#9CA3AF';
  return '#3B82F6';
}

const TITLE_COLOR_MAP: Array<{ pattern: RegExp; name: string; hex: string }> = [
  { pattern: /\bnavy\s*blue\b/i, name: 'Navy Blue', hex: '#1E3A8A' },
  { pattern: /\blight\s*blue\b/i, name: 'Light Blue', hex: '#60A5FA' },
  { pattern: /\bsky\s*blue\b/i, name: 'Light Blue', hex: '#38BDF8' },
  { pattern: /\brose\s*gold\b/i, name: 'Rose Gold', hex: '#E8B4B8' },
  { pattern: /\bmint\s*green\b/i, name: 'Mint Green', hex: '#34D399' },
  { pattern: /\bforest\s*green\b/i, name: 'Green', hex: '#15803D' },
  { pattern: /\bspace\s*gr[ae]y\b/i, name: 'Gray', hex: '#64748B' },
  { pattern: /\bmidnight\s*black\b/i, name: 'Black', hex: '#18181B' },
  { pattern: /\bmatte\s*black\b/i, name: 'Black', hex: '#18181B' },
  { pattern: /\blilac\b/i, name: 'Lilac', hex: '#C4B5FD' },
  { pattern: /\blavender\b/i, name: 'Lilac', hex: '#C4B5FD' },
  { pattern: /\bblue\b/i, name: 'Blue', hex: '#2563EB' },
  { pattern: /\bblack\b/i, name: 'Black', hex: '#18181B' },
  { pattern: /\bwhite\b/i, name: 'White', hex: '#F8FAFC' },
  { pattern: /\bred\b/i, name: 'Red', hex: '#EF4444' },
  { pattern: /\byellow\b/i, name: 'Yellow', hex: '#FACC15' },
  { pattern: /\bgreen\b/i, name: 'Green', hex: '#22C55E' },
  { pattern: /\bpink\b/i, name: 'Pink', hex: '#EC4899' },
  { pattern: /\bpurple\b/i, name: 'Purple', hex: '#8B5CF6' },
  { pattern: /\borange\b/i, name: 'Orange', hex: '#F97316' },
  { pattern: /\bcyan\b/i, name: 'Cyan', hex: '#06B6D4' },
  { pattern: /\bteal\b/i, name: 'Cyan', hex: '#0D9488' },
  { pattern: /\bsilver\b/i, name: 'Silver', hex: '#CBD5E1' },
  { pattern: /\bgold\b/i, name: 'Gold', hex: '#EAB308' },
  { pattern: /\bbeige\b/i, name: 'Beige', hex: '#D6C7B2' },
  { pattern: /\bbrown\b/i, name: 'Brown', hex: '#92400E' },
  { pattern: /\bgr[ae]y\b/i, name: 'Gray', hex: '#9CA3AF' },
];

/**
 * Extracts a color explicitly stated in the product title (e.g. "Logitech G733 ... - Blue").
 * Prioritizes trailing/separator color segments before checking the full title.
 */
export function extractColorFromTitle(productTitle: string): { name: string; hex: string } | null {
  const title = (productTitle || '').trim();
  if (!title) return null;

  // 1. Check trailing segments after "-", "–", "|", ",", "(" (e.g., "... - Blue", "... (Lilac)")
  const segments = title.split(/[-–|,/()\[\]]+/).map((s) => s.trim()).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg.length > 35) continue;
    for (const entry of TITLE_COLOR_MAP) {
      if (entry.pattern.test(seg)) {
        return { name: entry.name, hex: entry.hex };
      }
    }
  }

  // 2. Fallback: scan entire title
  for (const entry of TITLE_COLOR_MAP) {
    if (entry.pattern.test(title)) {
      return { name: entry.name, hex: entry.hex };
    }
  }

  return null;
}

function generateVariantId(seed?: number): string {
  const rand = Math.random().toString(36).substring(2, 7);
  return `var_${Date.now()}${seed !== undefined ? `_${seed}` : ''}_${rand}`;
}

/**
 * Extracts balanced JSON object starting at `{` so Amazon variationValues
 * with whitespace or varied formatting parse reliably.
 */
function extractVariationValuesObject(htmlSource: string): Record<string, unknown> | null {
  const keyMatch = htmlSource.match(/"variationValues"\s*:\s*\{/);
  if (keyMatch && keyMatch.index !== undefined) {
    const startIdx = htmlSource.indexOf('{', keyMatch.index);
    if (startIdx >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let i = startIdx; i < Math.min(htmlSource.length, startIdx + 25000); i++) {
        const ch = htmlSource[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\' && inString) {
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              try {
                const jsonStr = htmlSource.slice(startIdx, i + 1);
                return JSON.parse(jsonStr);
              } catch {
                break;
              }
            }
          }
        }
      }
    }
  }

  const regexFallback = htmlSource.match(/"variationValues"\s*:\s*(\{[\s\S]*?\})\s*,/);
  if (regexFallback && regexFallback[1]) {
    try {
      return JSON.parse(regexFallback[1]);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Parses Amazon Ctrl+U HTML source code for color & size variationValues.
 */
export function parseAmazonVariantsFromHtml(htmlSource: string): ProductVariant[] {
  const extracted: ProductVariant[] = [];
  if (!htmlSource || typeof htmlSource !== 'string') return extracted;

  try {
    const parsed = extractVariationValuesObject(htmlSource);
    if (parsed && typeof parsed === 'object') {
      const colors: string[] = Array.isArray(parsed.color_name)
        ? parsed.color_name.map((c) => String(c || '').trim()).filter(Boolean)
        : [];
      const sizes: string[] = Array.isArray(parsed.size_name)
        ? parsed.size_name.map((s) => String(s || '').trim()).filter(Boolean)
        : [];

      let idx = 0;
      if (colors.length > 0 && sizes.length > 0) {
        colors.forEach((color) => {
          const hex = guessColorHex(color);
          sizes.forEach((size) => {
            extracted.push({
              id: generateVariantId(idx++),
              colorName: color,
              colorHex: hex,
              sizeLabel: size,
              name: `${color} / ${size}`,
              colorCode: hex,
              images: [],
            });
          });
        });
      } else if (colors.length > 0) {
        colors.forEach((color) => {
          const hex = guessColorHex(color);
          extracted.push({
            id: generateVariantId(idx++),
            colorName: color,
            colorHex: hex,
            sizeLabel: '',
            name: color,
            colorCode: hex,
            images: [],
          });
        });
      } else if (sizes.length > 0) {
        sizes.forEach((size) => {
          extracted.push({
            id: generateVariantId(idx++),
            colorName: '',
            colorHex: '#000000',
            sizeLabel: size,
            name: size,
            colorCode: '#000000',
            images: [],
          });
        });
      }
    }
  } catch (error) {
    console.warn('Amazon automatic variant parsing skipped:', error);
  }

  return extracted;
}

export function getVariantDisplayImage(variant: ProductVariant | null | undefined): string {
  if (!variant || typeof variant !== 'object') return '';
  if (typeof variant.imageUrl === 'string' && variant.imageUrl.trim()) {
    return variant.imageUrl.trim();
  }
  if (typeof variant.image === 'string' && variant.image.trim()) {
    return variant.image.trim();
  }
  if (typeof variant.img === 'string' && variant.img.trim()) {
    return variant.img.trim();
  }
  if (Array.isArray(variant.images) && variant.images.length > 0) {
    const first = variant.images.find((u) => typeof u === 'string' && u.trim().length > 0);
    if (first) return first.trim();
  }
  return '';
}

/**
 * Normalizes a variant object so both legacy fields (name, colorCode, images)
 * and new variant builder fields (colorName, colorHex, sizeLabel, imageUrl)
 * coexist seamlessly without data loss.
 */
export function normalizeVariantItem(raw: ProductVariant, index: number = 0): ProductVariant {
  const colorNameRaw = typeof raw.colorName === 'string' ? raw.colorName : '';
  const sizeLabelRaw = typeof raw.sizeLabel === 'string' ? raw.sizeLabel : '';
  const legacyNameRaw = typeof raw.name === 'string' ? raw.name : (typeof raw.title === 'string' ? raw.title : '');

  // If legacy variant had only `name` and no `colorName` / `sizeLabel`, treat `name` as colorName
  const colorName = colorNameRaw || (!sizeLabelRaw ? legacyNameRaw : '');
  const sizeLabel = sizeLabelRaw;

  const rawHex = raw.colorHex || raw.colorCode;
  const colorHex =
    typeof rawHex === 'string' && rawHex.trim()
      ? rawHex.trim()
      : colorName
      ? guessColorHex(colorName)
      : '#000000';

  const parsedImages = Array.isArray(raw.images)
    ? raw.images.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim())
    : [];

  const primaryImage =
    (typeof raw.imageUrl === 'string' && raw.imageUrl.trim()) ||
    (typeof raw.image === 'string' && raw.image.trim()) ||
    (typeof raw.img === 'string' && raw.img.trim()) ||
    parsedImages[0] ||
    '';

  const mergedImages = primaryImage
    ? [primaryImage, ...parsedImages.filter((u) => u !== primaryImage)]
    : parsedImages;

  const computedName =
    [colorName.trim(), sizeLabel.trim()].filter(Boolean).join(' / ') ||
    legacyNameRaw ||
    'Variant';

  const parsedPrice =
    raw.price !== undefined && raw.price !== null && raw.price !== ('' as any) && Number.isFinite(Number(raw.price))
      ? Number(raw.price)
      : undefined;

  return {
    ...raw,
    id: raw.id || `var_${index}_${computedName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    colorName,
    colorHex,
    sizeLabel,
    name: computedName,
    colorCode: colorHex,
    price: parsedPrice,
    imageUrl: primaryImage || undefined,
    images: mergedImages,
  };
}
