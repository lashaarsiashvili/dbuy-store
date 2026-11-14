import type { Product, ProductVariant, ProductVideo } from '../types';

/**
 * Safely parses any array-like field that may arrive from Cloudflare D1 / SQLite
 * as either a native JS array or a JSON-encoded string (e.g., "[]" or '[{"name":...}]').
 * Guarantees an array return value in all cases.
 */
export function parseArrayField<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      let parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        const inner = parsed.trim();
        if (inner.startsWith('[')) {
          parsed = JSON.parse(inner);
        }
      }
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parses product variants into a ProductVariant[] array.
 */
export function parseVariants(variants: unknown): ProductVariant[] {
  if (Array.isArray(variants)) {
    return variants as ProductVariant[];
  }
  if (typeof variants === 'string') {
    const trimmed = variants.trim();
    if (!trimmed) return [];
    try {
      let parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        const inner = parsed.trim();
        if (inner.startsWith('[')) {
          parsed = JSON.parse(inner);
        }
      }
      if (Array.isArray(parsed)) {
        return parsed as ProductVariant[];
      }
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parses product videos into a ProductVideo[] array.
 */
export function parseVideos(videos: unknown): ProductVideo[] {
  return parseArrayField<ProductVideo>(videos);
}

/**
 * Safely parses a string array field (e.g., features, tags, specs, gallery)
 * that may be serialized as JSON in D1.
 */
export function parseStringArray(value: unknown): string[] {
  return parseArrayField<unknown>(value)
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

/**
 * Safely parses product/variant image arrays (handles native arrays, JSON-encoded arrays,
 * or a single non-empty URL/path string).
 */
export function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
        }
      } catch {
        return [];
      }
    } else if (trimmed.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
        }
        if (typeof parsed === 'string' && parsed.trim().startsWith('[')) {
          const nested: unknown = JSON.parse(parsed.trim());
          if (Array.isArray(nested)) {
            return nested
              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
              .map((item) => item.trim());
          }
        }
      } catch {
        return [];
      }
    } else if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:')
    ) {
      return [trimmed];
    }
  }
  return [];
}

/**
 * Normalizes array-based fields on a Product object loaded from API or cache
 * so downstream UI components always receive genuine JavaScript arrays.
 */
export function normalizeProductArrays(product: Product): Product {
  if (!product || typeof product !== 'object') return product;

  const rawAny = product as any;
  const normalizedVariants = parseVariants(rawAny.variants)
    .filter((v) => v && typeof v === 'object')
    .map((v) => ({
      ...v,
      images: parseImages((v as any).images),
    }));

  const normalized: Product = {
    ...product,
    images: parseImages(rawAny.images),
    variants: normalizedVariants,
    videos: parseVideos(rawAny.videos),
    features: rawAny.features != null ? parseStringArray(rawAny.features) : rawAny.features,
    features_en: rawAny.features_en != null ? parseStringArray(rawAny.features_en) : rawAny.features_en,
    features_ka: rawAny.features_ka != null ? parseStringArray(rawAny.features_ka) : rawAny.features_ka,
  };

  if (rawAny.gallery !== undefined) {
    (normalized as any).gallery = parseImages(rawAny.gallery);
  }
  if (rawAny.tags !== undefined) {
    (normalized as any).tags = parseStringArray(rawAny.tags);
  }
  if (rawAny.specs !== undefined) {
    (normalized as any).specs = parseArrayField(rawAny.specs);
  }

  return normalized;
}
