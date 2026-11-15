import { Product } from '../types';

const IG_GRAPH_VERSION = 'v26.0';
const LOCAL_BIO_STORAGE_KEY = 'dbuy_ig_bio_posts';

export interface InstagramConnectionStatus {
  connected: boolean;
  expired?: boolean;
  requiresReconnect?: boolean;
  pageId?: string;
  pageName?: string;
  igUserId?: string;
  username?: string;
  igName?: string;
  profilePictureUrl?: string;
  source?: string;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
}

export type InstagramPublishStageKey =
  | 'idle'
  | 'connecting'
  | 'uploading'
  | 'processing'
  | 'generating'
  | 'published'
  | 'error';

export interface InstagramPublishProgress {
  stage: InstagramPublishStageKey;
  message: string;
  detail?: string;
  currentSlide?: number;
  totalSlides?: number;
}

export interface PublishInstagramCarouselParams {
  product: Product;
  images: string[];
  caption: string;
  accessToken?: string;
  pageId?: string;
  igUserId?: string;
}

export interface PublishInstagramCarouselResult {
  success: boolean;
  igUserId?: string;
  mediaId?: string;
  parentContainerId?: string;
  childIds?: string[];
  permalink?: string;
  error?: string;
  requiresReconnect?: boolean;
  expired?: boolean;
  details?: any;
}

export interface InstagramBioPost {
  id: string;
  igMediaId?: string;
  permalink?: string;
  productId: string;
  productSlug?: string;
  title?: string;
  price?: number;
  origPrice?: number;
  mainImage: string;
  images: string[];
  caption?: string;
  mediaType?: string;
  publishedAt: string;
}

function isTokenExpiredErr(err: any): boolean {
  return Boolean(err && (err.code === 190 || err.error_subcode === 463 || err.error_subcode === 467));
}

export function normalizeInstagramImageUrl(img: string): string {
  const clean = (img || '').trim();
  if (!clean) return '';
  if (clean.startsWith('data:')) return clean;

  let resolved = clean;
  if (clean.startsWith('/')) {
    resolved = `https://www.dbuystore.com${clean}`;
  } else if (clean.startsWith('https://dbuystore.com/')) {
    resolved = clean.replace('https://dbuystore.com/', 'https://www.dbuystore.com/');
  } else if (clean.startsWith('http://dbuystore.com/')) {
    resolved = clean.replace('http://dbuystore.com/', 'https://www.dbuystore.com/');
  }
  resolved = resolved.replace(/ /g, '%20');

  const lower = resolved.toLowerCase().split('?')[0];
  if (lower.endsWith('.webp') || lower.endsWith('.avif') || lower.endsWith('.heic')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(resolved)}&output=jpg&q=92`;
  }
  return resolved;
}

export const SOCIAL_SHIPPING_TRUST_LINE = '🌍 Tracked Worldwide Shipping · 100% Secure Checkout';

function formatUsdAmount(value: number): string {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function buildLuxurySocialPricingLine(product: Product, isKa = false): string {
  const price = Math.max(0, Number(product.price) || 0);
  const orig = Number(
    product.origPrice ??
      product.originalPrice ??
      (product as any).original_price ??
      0
  );

  const priceStr = formatUsdAmount(price);

  if (orig > price && price > 0) {
    const saveAmt = Math.round((orig - price) * 100) / 100;
    const saveStr = formatUsdAmount(saveAmt);
    const pct = Math.max(1, Math.round(((orig - price) / orig) * 100));
    const origStr = formatUsdAmount(orig);

    if (isKa) {
      return `✨ ექსკლუზიური ფასი: $${priceStr} (დაზოგეთ $${saveStr} · ${pct}% ფასდაკლება | ძველი ფასი: $${origStr})`;
    }
    return `✨ Exclusive Deal: $${priceStr} (Save $${saveStr} · ${pct}% OFF | Reg. $${origStr})`;
  }

  if (isKa) {
    return `✨ გამორჩეული ფასი: $${priceStr}`;
  }
  return `✨ Featured Price: $${priceStr}`;
}

function cleanFeatureText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw
    .replace(/^[\s✓✔✦•\-*▪▸►◆◇★☆➤➢➣→]+/u, '')
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+[\s:.\-]*/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 96) {
    const truncated = cleaned.slice(0, 93);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = `${(lastSpace > 50 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
  }
  return cleaned;
}

function parseRawFeaturesList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
      } catch {
        // Fallback to newline split
      }
    }
    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function extractTopProductHighlights(
  product: Product,
  isKa = false,
  overrideFeatures?: string[]
): string[] {
  const candidates =
    overrideFeatures && overrideFeatures.length > 0
      ? overrideFeatures
      : isKa
        ? [
            ...parseRawFeaturesList(product.features_ka),
            ...parseRawFeaturesList(product.features),
            ...parseRawFeaturesList(product.features_en),
          ]
        : [
            ...parseRawFeaturesList(product.features_en),
            ...parseRawFeaturesList(product.features),
            ...parseRawFeaturesList(product.features_ka),
          ];

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const clean = cleanFeatureText(item);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(clean);
    }
    if (deduped.length >= 3) break;
  }

  const fallbackHighlights = isKa
    ? [
        'დახვეწილი დიზაინი და პრემიუმ ხარისხის მასალები',
        'შექმნილია ყოველდღიური კომფორტისა და გამძლეობისთვის',
        'პირდაპირი ბრენდული ღირებულება ზედმეტი დანამატების გარეშე',
      ]
    : [
        'Refined modern design crafted from durable, high-grade materials',
        'Engineered for effortless comfort and reliable everyday performance',
        'Curated direct-to-you value without traditional retail markups',
      ];

  for (const fb of fallbackHighlights) {
    if (deduped.length >= 3) break;
    deduped.push(fb);
  }

  return deduped.slice(0, 3);
}

function toInlineBenefitPhrase(feature: string): string {
  if (!feature) return '';
  const headline = feature.split(/\s+[—–]\s+|:\s+/)[0].trim();
  const base = headline.length >= 6 && headline.length <= 64 ? headline : feature;
  if (/^[A-Z][a-z]+(?:\s+[a-z]|$)/.test(base)) {
    return base.charAt(0).toLowerCase() + base.slice(1);
  }
  return base;
}

export function buildLifestyleProductHook(
  title: string,
  highlights: string[],
  variantIndex = 0,
  isKa = false
): string {
  const cleanTitle = (title || 'Featured Essential').trim();
  const hasRealFeature = highlights.length > 0;
  const lead = hasRealFeature ? toInlineBenefitPhrase(highlights[0]) : '';
  const secondary = highlights.length > 1 ? toInlineBenefitPhrase(highlights[1]) : '';

  if (isKa) {
    const hooksKa = [
      `აამაღლეთ თქვენი ყოველდღიურობა ${cleanTitle}-ით. შექმნილი თანამედროვე ცხოვრების სტილისთვის${lead ? ` — ${lead}` : ''}, ის გთავაზობთ დახვეწილობასა და პრაქტიკულობას ერთ დეტალში.`,
      `გაიცანით ${cleanTitle} — ბალანსი ესთეტიკასა და ყოველდღიურ კომფორტს შორის.${secondary ? ` გამორჩეული მახასიათებლით: ${secondary}.` : ''}`,
      `დიზაინი, რომელიც პირველივე შეხებიდან იგრძნობა — ${cleanTitle}. საიმედო არჩევანი მათთვის, ვინც აფასებს ხარისხსა და სტილს.`,
    ];
    return hooksKa[variantIndex % hooksKa.length];
  }

  const hooks = [
    `Elevate your everyday routine with the ${cleanTitle}. Thoughtfully crafted${lead ? ` with ${lead}` : ' for modern living'}, it pairs refined design with effortless daily performance.`,
    `Meet the ${cleanTitle} — where clean luxury meets practical precision.${secondary ? ` Built around ${secondary}, it’s made to stand out every single day.` : ' Made to deliver standout value every single day.'}`,
    `Upgrade your essentials with the ${cleanTitle}. Designed for effortless reliability and timeless style${lead ? `, highlighted by ${lead}` : ''}.`,
  ];
  return hooks[variantIndex % hooks.length];
}

export function buildInstagramLinkInBioCta(_productId?: string): string {
  return '🛍️ Shop the collection — tap the link in our bio (@dbuy.store)!';
}

export function buildInstagramCarouselCaption(product: Product, variantIndex = 0, isKa = false): string {
  const title = (isKa ? (product.titleKa || product.title) : product.title) || 'Premium Store Essential';
  const highlights = extractTopProductHighlights(product, isKa);
  const hook = buildLifestyleProductHook(title, highlights, variantIndex, isKa);
  const bulletBlock = highlights.map((item) => `✓ ${item}`).join('\n');
  const priceLine = buildLuxurySocialPricingLine(product, isKa);
  const ctaLine = buildInstagramLinkInBioCta();

  if (isKa) {
    return (
      `${hook}\n\n` +
      `${bulletBlock}\n\n` +
      `${priceLine}\n` +
      `${SOCIAL_SHIPPING_TRUST_LINE}\n\n` +
      `${ctaLine}\n\n` +
      `#DBUYStore #InstagramShop #LuxuryEssentials #EverydayUpgrade #TrendingNow`
    );
  }

  return (
    `${hook}\n\n` +
    `${bulletBlock}\n\n` +
    `${priceLine}\n` +
    `${SOCIAL_SHIPPING_TRUST_LINE}\n\n` +
    `${ctaLine}\n\n` +
    `#DBUYStore #InstagramShop #LuxuryEssentials #CuratedLiving #TrendingNow`
  );
}

export async function checkInstagramConnectionStatus(params?: {
  accessToken?: string;
  pageId?: string;
}): Promise<InstagramConnectionStatus> {
  const customToken = params?.accessToken?.trim();
  const pageId = (params?.pageId && params.pageId.trim() !== 'me') ? params.pageId.trim() : '215073415343195';

  try {
    const res = await fetch('/api/instagram/status', {
      method: customToken ? 'POST' : 'GET',
      headers: customToken ? { 'Content-Type': 'application/json' } : undefined,
      body: customToken ? JSON.stringify({ accessToken: customToken, pageId }) : undefined,
    });
    const json: any = await res.json().catch(() => null);
    if (res.ok && json) {
      return {
        connected: Boolean(json.connected),
        expired: Boolean(json.expired),
        requiresReconnect: Boolean(json.requiresReconnect),
        pageId: json.pageId,
        pageName: json.pageName,
        igUserId: json.igUserId,
        username: json.username || 'dbuy.store',
        igName: json.igName || 'DBUY Store',
        profilePictureUrl: json.profilePictureUrl,
        source: json.source,
        error: json.error,
        errorCode: json.errorCode,
        errorSubcode: json.errorSubcode,
      };
    }
  } catch {
    // Fallback to direct Graph API check if static host has no backend route
  }

  if (!customToken) {
    return {
      connected: false,
      expired: false,
      requiresReconnect: true,
      username: 'dbuy.store',
      error: 'Meta Page Access Token is not configured.',
    };
  }

  try {
    const pageRes = await fetch(
      `https://graph.facebook.com/${IG_GRAPH_VERSION}/${encodeURIComponent(pageId)}?fields=id,name,instagram_business_account{id,username,name,profile_picture_url},connected_instagram_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(customToken)}`
    );
    const pageData: any = await pageRes.json().catch(() => ({}));
    const ig = pageData?.instagram_business_account || pageData?.connected_instagram_account;
    if (pageRes.ok && ig?.id) {
      return {
        connected: true,
        pageId: pageData.id,
        pageName: pageData.name || 'DBUY Store',
        igUserId: ig.id,
        username: ig.username || 'dbuy.store',
        igName: ig.name || 'DBUY Store',
        profilePictureUrl: ig.profile_picture_url,
      };
    }
    const err = pageData?.error || {};
    const expired = isTokenExpiredErr(err);
    return {
      connected: false,
      expired,
      requiresReconnect: expired || !pageRes.ok,
      username: 'dbuy.store',
      error: expired
        ? 'Meta session has expired. Please paste a fresh Page Access Token.'
        : (err.message || 'No connected Instagram Business Account found.'),
    };
  } catch (err: any) {
    return {
      connected: false,
      username: 'dbuy.store',
      error: err?.message || 'Unable to verify Instagram Business connection.',
    };
  }
}

export function loadLocalInstagramBioPosts(): InstagramBioPost[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_BIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBioPostToLocalCache(post: InstagramBioPost): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadLocalInstagramBioPosts();
    const filtered = existing.filter((p) => {
      if (post.igMediaId && p.igMediaId === post.igMediaId) return false;
      if (post.productId && p.productId === post.productId) return false;
      return true;
    });
    const updated = [post, ...filtered].slice(0, 60);
    localStorage.setItem(LOCAL_BIO_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota issues
  }
}

export async function fetchInstagramBioPosts(): Promise<InstagramBioPost[]> {
  const localPosts = loadLocalInstagramBioPosts();
  const merged = new Map<string, InstagramBioPost>();

  for (const lp of localPosts) {
    const key = lp.igMediaId || lp.id || lp.productId;
    if (key) merged.set(key, lp);
  }

  try {
    const res = await fetch('/api/instagram/bio-posts', { cache: 'no-store' });
    const json: any = await res.json().catch(() => null);
    if (res.ok && json?.success && Array.isArray(json.posts)) {
      for (const sp of json.posts) {
        const key = sp.igMediaId || sp.id || sp.productId;
        if (key) merged.set(key, sp);
      }
    }
  } catch {
    // Keep local posts if API unavailable
  }

  return Array.from(merged.values()).sort((a, b) => {
    const tA = new Date(a.publishedAt || 0).getTime();
    const tB = new Date(b.publishedAt || 0).getTime();
    return tB - tA;
  });
}

async function callInstagramPublishEndpoint(payload: Record<string, any>) {
  const res = await fetch('/api/instagram/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok && Boolean(json?.success), status: res.status, data: json };
}

export async function publishInstagramCarousel(
  params: PublishInstagramCarouselParams,
  onProgress?: (progress: InstagramPublishProgress) => void
): Promise<PublishInstagramCarouselResult> {
  const { product, caption, accessToken, pageId } = params;
  const normalizedImages = (params.images || [])
    .map(normalizeInstagramImageUrl)
    .filter(Boolean);

  if (normalizedImages.length < 2 || normalizedImages.length > 10) {
    return {
      success: false,
      error: 'Instagram Carousels require between 2 and 10 product photos.',
    };
  }

  try {
    // Stage 0: Resolve IG Business Account ID
    let igUserId = (params.igUserId || '').trim();
    if (!igUserId) {
      onProgress?.({
        stage: 'connecting',
        message: 'Connecting to @dbuy.store...',
        detail: 'Fetching connected Instagram Business Account ID',
      });
      const status = await checkInstagramConnectionStatus({ accessToken, pageId });
      if (!status.connected || !status.igUserId) {
        return {
          success: false,
          requiresReconnect: Boolean(status.requiresReconnect),
          expired: Boolean(status.expired),
          error: status.error || 'Could not resolve Instagram Business Account ID for @dbuy.store.',
        };
      }
      igUserId = status.igUserId;
    }

    // Step A: Create Item Containers (2 to 10 images)
    const childIds: string[] = [];
    for (let i = 0; i < normalizedImages.length; i++) {
      onProgress?.({
        stage: 'uploading',
        message: `Uploading media (${i + 1}/${normalizedImages.length})...`,
        detail: `Creating Instagram media container for slide #${i + 1}`,
        currentSlide: i + 1,
        totalSlides: normalizedImages.length,
      });

      const stepARes = await callInstagramPublishEndpoint({
        action: 'create-item',
        igUserId,
        imageUrl: normalizedImages[i],
        accessToken,
        pageId,
      });

      if (!stepARes.ok || !stepARes.data?.containerId) {
        const errData = stepARes.data || {};
        return {
          success: false,
          requiresReconnect: Boolean(errData.requiresReconnect),
          expired: Boolean(errData.expired),
          error: errData.error || `Failed to upload slide #${i + 1} to Instagram.`,
          details: errData.details,
        };
      }

      childIds.push(stepARes.data.containerId);
    }

    // Step B: Poll Child Container Status until all return FINISHED
    onProgress?.({
      stage: 'processing',
      message: 'Uploading media...',
      detail: `Waiting for ${childIds.length} media containers to return FINISHED`,
      totalSlides: childIds.length,
    });

    let allChildrenFinished = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const checkRes = await callInstagramPublishEndpoint({
        action: 'check-status',
        containerIds: childIds,
        accessToken,
        pageId,
      });

      if (!checkRes.ok) {
        return {
          success: false,
          error: checkRes.data?.error || 'Instagram rejected one or more carousel media items.',
        };
      }
      if (checkRes.data?.allFinished) {
        allChildrenFinished = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!allChildrenFinished) {
      return {
        success: false,
        error: 'Timed out waiting for Instagram media containers to finish processing.',
      };
    }

    // Step C1: Create Parent Carousel Container
    onProgress?.({
      stage: 'generating',
      message: 'Generating carousel...',
      detail: 'Creating parent CAROUSEL container with ordered slides & caption',
    });

    const createCarouselRes = await callInstagramPublishEndpoint({
      action: 'create-carousel',
      igUserId,
      children: childIds,
      caption,
      accessToken,
      pageId,
    });

    if (!createCarouselRes.ok || !createCarouselRes.data?.parentContainerId) {
      const errData = createCarouselRes.data || {};
      return {
        success: false,
        requiresReconnect: Boolean(errData.requiresReconnect),
        expired: Boolean(errData.expired),
        error: errData.error || 'Failed to generate Instagram carousel container.',
        details: errData.details,
      };
    }

    const parentContainerId = createCarouselRes.data.parentContainerId;

    // Step C2: Poll Parent Container Status until FINISHED
    let parentFinished = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const checkParent = await callInstagramPublishEndpoint({
        action: 'check-status',
        containerIds: [parentContainerId],
        accessToken,
        pageId,
      });

      if (!checkParent.ok) {
        return {
          success: false,
          error: checkParent.data?.error || 'Instagram carousel container failed processing.',
        };
      }
      if (checkParent.data?.allFinished) {
        parentFinished = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!parentFinished) {
      return {
        success: false,
        error: 'Timed out waiting for parent carousel container to reach FINISHED status.',
      };
    }

    // Step C3: Publish Carousel via media_publish
    onProgress?.({
      stage: 'generating',
      message: 'Generating carousel...',
      detail: 'Publishing carousel to @dbuy.store feed',
    });

    const publishRes = await callInstagramPublishEndpoint({
      action: 'publish-carousel',
      igUserId,
      parentContainerId,
      productId: product.id,
      productSlug: product.customSlug || product.id,
      title: product.title,
      price: product.price,
      origPrice: product.origPrice ?? (product as any).original_price,
      mainImage: params.images[0] || product.image,
      images: params.images,
      caption,
      accessToken,
      pageId,
    });

    if (!publishRes.ok || !publishRes.data?.mediaId) {
      const errData = publishRes.data || {};
      return {
        success: false,
        requiresReconnect: Boolean(errData.requiresReconnect),
        expired: Boolean(errData.expired),
        error: errData.error || 'Failed to publish carousel to @dbuy.store.',
        details: errData.details,
      };
    }

    saveBioPostToLocalCache({
      id: `ig-${publishRes.data.mediaId}`,
      igMediaId: publishRes.data.mediaId,
      permalink: publishRes.data.permalink || '',
      productId: product.id,
      productSlug: product.customSlug || product.id,
      title: product.title,
      price: product.price,
      origPrice: product.origPrice ?? (product as any).original_price,
      mainImage: params.images[0] || product.image,
      images: params.images,
      caption,
      mediaType: 'CAROUSEL_ALBUM',
      publishedAt: new Date().toISOString(),
    });

    onProgress?.({
      stage: 'published',
      message: 'Published successfully to @dbuy.store!',
      detail: `${normalizedImages.length}-slide carousel is now live`,
    });

    return {
      success: true,
      igUserId,
      mediaId: publishRes.data.mediaId,
      parentContainerId,
      childIds,
      permalink: publishRes.data.permalink || '',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error publishing carousel to Instagram.',
    };
  }
}
