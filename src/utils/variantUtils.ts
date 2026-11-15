import type { ProductVariant } from '../types';

export function guessColorHex(colorName: string): string {
  const lower = (colorName || '').toLowerCase();
  if (lower.includes('black') || lower.includes('ebony') || lower.includes('onyx')) return '#111111';
  if (lower.includes('white') || lower.includes('ivory') || lower.includes('cream') || lower.includes('pearl')) return '#FFFFFF';
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('scarlet') || lower.includes('burgundy') || lower.includes('wine')) return '#DC2626';
  if (lower.includes('navy') || lower.includes('midnight')) return '#1E3A8A';
  if (lower.includes('blue') || lower.includes('cobalt') || lower.includes('azure') || lower.includes('sky')) return '#2563EB';
  if (lower.includes('teal') || lower.includes('cyan') || lower.includes('turquoise') || lower.includes('aqua')) return '#0D9488';
  if (lower.includes('green') || lower.includes('olive') || lower.includes('emerald') || lower.includes('sage') || lower.includes('mint')) return '#16A34A';
  if (lower.includes('yellow') || lower.includes('gold') || lower.includes('amber')) return '#EAB308';
  if (lower.includes('orange') || lower.includes('coral') || lower.includes('peach')) return '#EA580C';
  if (lower.includes('purple') || lower.includes('violet') || lower.includes('lavender') || lower.includes('plum')) return '#7C3AED';
  if (lower.includes('pink') || lower.includes('rose') || lower.includes('magenta') || lower.includes('blush')) return '#EC4899';
  if (lower.includes('brown') || lower.includes('coffee') || lower.includes('espresso') || lower.includes('walnut') || lower.includes('tan') || lower.includes('khaki') || lower.includes('beige')) return '#92400E';
  if (lower.includes('silver') || lower.includes('chrome') || lower.includes('platinum') || lower.includes('titanium')) return '#CBD5E1';
  if (lower.includes('gray') || lower.includes('grey') || lower.includes('charcoal') || lower.includes('slate') || lower.includes('graphite')) return '#64748B';
  return '#3B82F6';
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
