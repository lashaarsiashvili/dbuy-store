import { Product } from '../types';
import {
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  generateCommercialVoiceover,
} from './tiktokVideoGenerator';
import {
  renderProMotionCommercialVideo,
  prepareProductImagesForAi,
} from './motionGraphicsCompositor';

export interface YouTubeAdPlan {
  dominantColors: {
    primaryAccent: string;
    secondaryGlow: string;
    pedestalColor: string;
  };
  visualHook: string;
  discountTag: string;
  ratingScore: number;
  ratingReviewCount: number;
  scenes: CommercialScenePlan[];
  fullVoiceoverScript: string;
  youtubeTitle: string;
  youtubeDescription: string;
  youtubeTags: string[];
  ctaText: string;
  estimatedDurationSec: number;
  modelUsed: string;
}

export interface GenerateYouTubeVideoOptions {
  product: Product;
  selectedImages: string[];
  aspectRatio: '9:16' | '16:9';
  generationMode?: 'mode1_card' | 'mode2_cinematic';
  musicMood: CommercialMusicMood;
  enableVoiceover: boolean;
  voiceTone?: 'friendly' | 'energetic' | 'calm_luxury';
  voiceAccent?: 'us' | 'uk';
  customCta?: string;
  customPriceBanner?: string;
  onProgress?: (progress: PromoVideoGenerationProgress) => void;
}

export interface YouTubeVideoGenerationSuccess {
  result: PromoVideoGenerationResult;
  videoUrl: string;
  plan: YouTubeAdPlan;
  aspectRatio: '9:16' | '16:9';
  generationMode: 'mode1_card' | 'mode2_cinematic';
}

function computeDiscountTag(priceStr: any, origPriceStr: any): string {
  const p = parseFloat(String(priceStr || '').replace(/[^0-9.]/g, ''));
  const op = parseFloat(String(origPriceStr || '').replace(/[^0-9.]/g, ''));
  if (op > p && p > 0) {
    const pct = Math.round(((op - p) / op) * 100);
    if (pct > 0) return `-${pct}% OFF`;
  }
  return 'SPECIAL OFFER';
}

/**
 * Concise, YouTuber-Style Description & Clickable Product Link Generator
 * Outputs strictly 5 clean lines (no walls of text, no robotic paragraphs):
 * Line 1: Attention-grabbing 1-sentence YouTuber hook + emoji
 * Line 2: Direct Call-To-Action (👉 Get yours here:)
 * Line 3: Exact direct product URL on its own empty line with NO punctuation touching it
 * Line 4: 2–3 ultra-short bullet highlights (price/discount + top feature)
 * Line 5: 3–5 targeted YouTube/Shorts hashtags
 */
export function buildYouTuberProductDescription(
  product: Product,
  hookLine?: string,
  discountTag?: string
): string {
  const cleanTitle = (product.title || 'Upgrade').slice(0, 50).trim();
  const hook =
    hookLine?.trim() ||
    `The ultimate ${cleanTitle} is finally here! 🔥`;

  const ctaLine = `👉 Get yours here:`;
  const productUrl = `https://www.dbuystore.com/product/${product.id}`;

  const priceNum = Number(product.price) > 0 ? `$${Number(product.price).toFixed(2)}` : 'Special Price';
  const tag = discountTag || computeDiscountTag(product.price, product.origPrice);
  const f1 = (product.features?.[0] || 'Studio-Grade Build').slice(0, 32);
  const f2 = (product.features?.[1] || 'Worldwide Shipping').slice(0, 32);
  const highlightLine = `⚡ Only ${priceNum} (${tag}) • ${f1} • ${f2}`;

  const categoryTag = (product.category || 'tech').toLowerCase().replace(/[^a-z0-9]/g, '');
  const tagsLine = `#${categoryTag} #gadgets #dbuystore #shorts`;

  return `${hook}\n${ctaLine}\n${productUrl}\n${highlightLine}\n${tagsLine}`;
}

/**
 * Step 1: Request Gemini Multimodal Vision (gemini-2.5-pro with gemini-2.5-flash fallback)
 * Analyzes product photos, extracts dominant accent colors, camera choreography, callouts, and audio script.
 */
export async function requestYouTubeAdPlan(
  product: Product,
  selectedImages: string[],
  aspectRatio: '9:16' | '16:9'
): Promise<YouTubeAdPlan> {
  // Compress primary product images into base64 payloads for Gemini Multimodal Vision
  let imageParts: Array<{ mimeType: string; data: string }> = [];
  try {
    const payloads = await prepareProductImagesForAi(selectedImages, {
      maxDim: 512,
      maxCount: 2,
      quality: 0.75,
    });
    imageParts = payloads.map((p) => ({
      mimeType: p.mimeType,
      data: p.base64,
    }));
  } catch (imgErr) {
    console.warn('[YOUTUBE-API] Image preparation for Gemini Vision skipped:', imgErr);
  }

  const extractedFeatures: string[] = [];
  if (Array.isArray(product.features) && product.features.length > 0) {
    extractedFeatures.push(...product.features.map((f) => String(f).trim()).filter(Boolean));
  } else if (typeof (product.features as any) === 'string') {
    try {
      const parsed = JSON.parse(product.features as any);
      if (Array.isArray(parsed)) {
        extractedFeatures.push(...parsed.map((f) => String(f).trim()).filter(Boolean));
      }
    } catch {
      extractedFeatures.push(String(product.features));
    }
  }
  if (extractedFeatures.length === 0 && product.description) {
    const lines = product.description
      .split(/[\n\r•\-\*]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 120);
    extractedFeatures.push(...lines.slice(0, 5));
  }

  const payload = {
    product: {
      id: product.id,
      title: product.title,
      price: product.price,
      origPrice: product.origPrice,
      features: extractedFeatures,
      images: selectedImages.slice(0, 6),
      imageParts,
    },
    aspectRatio,
  };

  try {
    const res = await fetch('/api/youtube-video/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data?.plan) {
      const plan = data.plan;
      const discountTag = plan.discountTag || computeDiscountTag(product.price, product.origPrice);
      const youtubeDescription =
        typeof plan.youtubeDescription === 'string' &&
        plan.youtubeDescription.includes('👉 Get yours here:') &&
        plan.youtubeDescription.includes(`https://www.dbuystore.com/product/${product.id}`)
          ? plan.youtubeDescription
          : buildYouTuberProductDescription(product, plan.visualHook || product.title, discountTag);

      return {
        dominantColors: {
          primaryAccent: plan.dominantColors?.primaryAccent || '#0D92FF',
          secondaryGlow: plan.dominantColors?.secondaryGlow || '#38BDF8',
          pedestalColor: plan.dominantColors?.pedestalColor || '#1E293B',
        },
        visualHook: plan.visualHook || 'PRECISION CRAFT & PERFORMANCE',
        discountTag,
        ratingScore: Number(plan.ratingScore) || 4.9,
        ratingReviewCount: Number(plan.ratingReviewCount) || 1280,
        scenes: Array.isArray(plan.scenes) ? plan.scenes : [],
        fullVoiceoverScript: plan.fullVoiceoverScript || '',
        youtubeTitle: plan.youtubeTitle || `${product.title} — Official Commercial ⚡ #Shorts`,
        youtubeDescription,
        youtubeTags: Array.isArray(plan.youtubeTags) ? plan.youtubeTags : ['dbuy', 'shorts', 'tech'],
        ctaText: plan.ctaText || 'Shop Now at DBUYStore.com',
        estimatedDurationSec: Number(plan.estimatedDurationSec) || 16.8,
        modelUsed: data.modelUsed || plan.modelUsed || 'gemini-2.5-pro',
      };
    }
  } catch (netErr) {
    console.warn('[YOUTUBE-API] Plan fetch error, using local fallback generator:', netErr);
  }

  // Graceful deterministic fallback
  const priceDisplay = product.price ? `$${product.price}` : 'Special Price';
  const discountTag = computeDiscountTag(product.price, product.origPrice);
  const f1 = product.features?.[0] || 'Aerospace Aluminum & Precision Finish';
  const f2 = product.features?.[1] || 'Engineered for Everyday Peak Performance';
  const f3 = product.features?.[2] || 'Uncompromising Build & Long-Term Reliability';

  return {
    dominantColors: {
      primaryAccent: '#0D92FF',
      secondaryGlow: '#38BDF8',
      pedestalColor: '#1E293B',
    },
    visualHook: 'ENGINEERED FOR PEAK PERFORMANCE',
    discountTag,
    ratingScore: 4.9,
    ratingReviewCount: 1280,
    youtubeTitle: `${product.title.slice(0, 45)} — Official Showcase ⚡ #Shorts #DBUY`,
    youtubeDescription: buildYouTuberProductDescription(
      product,
      'The cleanest setup upgrade of the season is finally here! 🔥',
      discountTag
    ),
    youtubeTags: ['dbuy', 'dbuystore', 'tech', 'gadgets', 'shorts', 'review', 'shopping'],
    ctaText: 'Shop Now at DBUYStore.com',
    fullVoiceoverScript: `Upgrade your daily setup with ${product.title.slice(0, 35)}. Engineered with ${f1.slice(0, 40)} for peak performance. Grab yours now at DBUY Store for only ${priceDisplay}.`,
    scenes: [
      {
        sceneNumber: 1,
        role: 'hook',
        roleLabel: 'The Hook',
        durationSec: 4.2,
        headline: 'MEET THE FUTURE',
        subheadline: product.title.slice(0, 40),
        calloutBadge: 'FLAGSHIP DESIGN',
        specDetail: 'Ultra-refined studio build',
        voiceoverLine: `Upgrade your daily setup with ${product.title.slice(0, 35)}.`,
        visualPrompt: 'Hero cinematic product reveal with clean studio lighting',
        negativePrompt: '',
        cameraMotion: 'tilt_3d',
      },
      {
        sceneNumber: 2,
        role: 'showcase',
        roleLabel: 'Feature & Craft',
        durationSec: 4.5,
        headline: 'PRECISION CRAFT',
        subheadline: f1.slice(0, 50),
        calloutBadge: (product.features?.[0] || 'TITANIUM ALLOY').slice(0, 24).toUpperCase(),
        specDetail: f1.slice(0, 40),
        voiceoverLine: `Engineered with ${f1.slice(0, 45)} for total reliability.`,
        visualPrompt: 'Macro product detail highlighting texture and finish',
        negativePrompt: '',
        cameraMotion: 'light_sweep',
      },
      {
        sceneNumber: 3,
        role: 'benefit',
        roleLabel: 'Everyday Benefit',
        durationSec: 4.5,
        headline: 'SEAMLESS POWER',
        subheadline: f2.slice(0, 50),
        calloutBadge: '5-STAR RATED',
        specDetail: '4.9 ★ Verified Customer Rating',
        voiceoverLine: `Experience ${f2.slice(0, 45)} every single day.`,
        visualPrompt: 'Product in sleek modern lifestyle workspace setting',
        negativePrompt: '',
        cameraMotion: 'parallax_float',
      },
      {
        sceneNumber: 4,
        role: 'cta',
        roleLabel: 'Special Offer',
        durationSec: 4.5,
        headline: 'ORDER YOURS TODAY',
        subheadline: `Now available for ${priceDisplay} at DBUY Store`,
        calloutBadge: discountTag,
        specDetail: 'Free Worldwide Shipping Available',
        voiceoverLine: `Grab yours now at DBUY Store for only ${priceDisplay}.`,
        visualPrompt: 'Closing showcase with price tag and official store badge',
        negativePrompt: '',
        cameraMotion: 'zoom_punch',
      },
    ],
    estimatedDurationSec: 17.7,
    modelUsed: 'deterministic-fallback',
  };
}

/**
 * Step 2: Full End-to-End 60 FPS Motion Graphics Commercial Video Compositing
 * Zero slideshow: 60 FPS HTML5 Canvas + WebCodecs H.264/AAC / MediaRecorder continuous motion engine!
 */
export async function generateYouTubePromotionalVideo(
  options: GenerateYouTubeVideoOptions
): Promise<YouTubeVideoGenerationSuccess> {
  const {
    product,
    selectedImages,
    aspectRatio,
    generationMode = 'mode1_card',
    musicMood,
    enableVoiceover,
    voiceTone = 'friendly',
    voiceAccent = 'us',
    customCta,
    customPriceBanner,
    onProgress,
  } = options;

  onProgress?.({
    stage: 'planning',
    progressPct: 8,
    message: 'Gemini Multimodal Vision Director analyzing product...',
    detail: 'Extracting dominant colors, 3D camera choreography & commercial hooks',
  });

  // 1. Generate Multimodal Ad Plan with Gemini 2.5 Pro (fallback to Flash)
  const plan = await requestYouTubeAdPlan(product, selectedImages, aspectRatio);

  onProgress?.({
    stage: 'planning',
    progressPct: 18,
    message: `Gemini Director Plan Ready (${plan.modelUsed.toUpperCase()})`,
    detail: `Hook: "${plan.visualHook}" · Accent: ${plan.dominantColors.primaryAccent}`,
  });

  // 2. Optional Voiceover synthesis
  let voiceoverAudioBase64: string | undefined;
  if (enableVoiceover && plan.fullVoiceoverScript) {
    onProgress?.({
      stage: 'voiceover',
      progressPct: 22,
      message: 'Synthesizing English Studio Voiceover...',
      detail: `Tone: ${voiceTone} · Accent: ${voiceAccent.toUpperCase()}`,
    });

    try {
      const voResult = await generateCommercialVoiceover({
        script: plan.fullVoiceoverScript,
        voiceTone,
        accent: voiceAccent,
      });
      if (voResult?.audioBase64) {
        voiceoverAudioBase64 = voResult.audioBase64;
      }
    } catch (voErr) {
      console.warn('[YOUTUBE-API] Voiceover synthesis skipped or failed:', voErr);
      // Proceed gracefully with Web Audio procedural beat + synced captions
    }
  }

  // 3. Prepare scenes with exact timestamps, badges, and choreography
  const scenes: CommercialScenePlan[] = plan.scenes.map((s, idx) => ({
    sceneNumber: idx + 1,
    role: (s.role as any) || (idx === 0 ? 'hook' : idx === 1 ? 'showcase' : idx === 2 ? 'benefit' : 'cta'),
    roleLabel: s.roleLabel || `Scene ${idx + 1}`,
    durationSec: Number(s.durationSec) || 4.2,
    headline: s.headline,
    subheadline: s.subheadline,
    calloutBadge: s.calloutBadge || (idx === 0 ? 'NEW ARRIVAL' : idx === 1 ? 'PRO CRAFT' : idx === 2 ? '5-STAR RATED' : plan.discountTag),
    specDetail: s.specDetail || (product.features && product.features[idx]) || '',
    voiceoverLine: s.voiceoverLine || s.voiceover || '',
    visualPrompt: s.visualPrompt || '',
    negativePrompt: '',
    cameraMotion: (s.cameraChoreography || s.cameraMotion || (idx === 0 ? 'tilt_3d' : idx === 1 ? 'light_sweep' : idx === 2 ? 'parallax_float' : 'zoom_punch')) as any,
  }));

  // Price banner string
  const formattedPrice =
    Number(product.price) > 0
      ? `Only $${Number(product.price).toFixed(Number.isInteger(Number(product.price)) ? 0 : 2)}`
      : 'Special Offer';
  const priceBanner = customPriceBanner || plan.discountTag || formattedPrice;
  const ctaText = customCta?.trim() || plan.ctaText || 'Shop Now at DBUYStore.com';

  // 4. Render client-side video with TRUE 60 FPS Motion Graphics Compositor
  const result = await renderProMotionCommercialVideo(
    {
      product,
      selectedImages,
      aspectRatio,
      generationMode,
      resolution: '1080p',
      visualTheme: 'tech_modern',
      musicMood,
      scenes,
      voiceoverScript: plan.fullVoiceoverScript,
      voiceoverAudioBase64,
      enableVoiceover,
      voiceTone,
      voiceAccent,
      priceBanner,
      dominantColors: plan.dominantColors,
      accentColorHex: plan.dominantColors.primaryAccent,
      discountTag: plan.discountTag,
      ratingScore: plan.ratingScore,
      ratingReviewCount: plan.ratingReviewCount,
      ctaText,
      includeWebLinkOverlay: true,
      modelUsed: plan.modelUsed,
    },
    (p) => {
      onProgress?.(p);
    }
  );

  const videoUrl = URL.createObjectURL(result.file);

  return {
    result,
    videoUrl,
    plan,
    aspectRatio,
    generationMode,
  };
}
