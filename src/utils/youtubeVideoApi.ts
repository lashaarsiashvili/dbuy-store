import { Product } from '../types';
import {
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  generateTikTokPromoVideo,
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  generateCommercialVoiceover,
} from './tiktokVideoGenerator';

export interface YouTubeAdPlan {
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
}

/**
 * Step 1: Request Gemini 2.5 Pro (falling back to 2.5 Flash on 429) to generate the YouTube Ad Plan
 * Only sends product title, price, key features, and image URLs to protect privacy and stay strictly within free-tier rules.
 */
export async function requestYouTubeAdPlan(
  product: Product,
  selectedImages: string[],
  aspectRatio: '9:16' | '16:9'
): Promise<YouTubeAdPlan> {
  // Extract ONLY product title, price, key features, and image URLs
  const payload = {
    product: {
      title: product.title,
      price: product.price,
      origPrice: product.origPrice,
      features: product.features || [],
      images: selectedImages.slice(0, 6),
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
      return {
        ...data.plan,
        modelUsed: data.modelUsed || data.plan.modelUsed || 'gemini-2.5-pro',
      };
    }
  } catch (netErr) {
    console.warn('[YOUTUBE-API] Plan fetch error, using local fallback generator:', netErr);
  }

  // Graceful deterministic fallback
  const priceDisplay = product.price ? `$${product.price}` : 'Special Price';
  const f1 = product.features?.[0] || 'Precision Craft & Modern Aesthetics';
  const f2 = product.features?.[1] || 'Engineered for Everyday Peak Performance';
  const f3 = product.features?.[2] || 'Uncompromising Build & Long-Term Reliability';

  return {
    youtubeTitle: `${product.title.slice(0, 45)} — Official Showcase ⚡ #Shorts #DBUY`,
    youtubeDescription: `Discover ${product.title}. Engineered for modern lifestyle, work, and everyday excellence.\n\n🔥 Order now at DBUY Store: https://dbuystore.com\n💰 Price: ${priceDisplay}\n\nFeatures:\n• ${f1}\n• ${f2}\n• ${f3}\n\n#dbuy #gadgets #tech #shopping #shorts`,
    youtubeTags: ['dbuy', 'dbuystore', 'tech', 'gadgets', 'shorts', 'review', 'shopping'],
    ctaText: 'Shop Now at DBUY',
    fullVoiceoverScript: `Upgrade your daily setup with ${product.title.slice(0, 35)}. Engineered with ${f1.slice(0, 40)} for peak performance. Grab yours now at DBUY Store for only ${priceDisplay}.`,
    scenes: [
      {
        sceneNumber: 1,
        role: 'hook',
        roleLabel: 'The Hook',
        durationSec: 4.2,
        headline: 'MEET THE FUTURE',
        subheadline: product.title.slice(0, 40),
        voiceoverLine: `Upgrade your daily setup with ${product.title.slice(0, 35)}.`,
        visualPrompt: 'Hero cinematic product reveal with clean studio lighting',
        negativePrompt: '',
        cameraMotion: 'slow_zoom_in',
      },
      {
        sceneNumber: 2,
        role: 'showcase',
        roleLabel: 'Feature & Craft',
        durationSec: 4.5,
        headline: 'PRECISION CRAFT',
        subheadline: f1.slice(0, 50),
        voiceoverLine: `Engineered with ${f1.slice(0, 45)} for total reliability.`,
        visualPrompt: 'Macro product detail highlighting texture and finish',
        negativePrompt: '',
        cameraMotion: 'smooth_pan_right',
      },
      {
        sceneNumber: 3,
        role: 'benefit',
        roleLabel: 'Everyday Benefit',
        durationSec: 4.5,
        headline: 'SEAMLESS POWER',
        subheadline: f2.slice(0, 50),
        voiceoverLine: `Experience ${f2.slice(0, 45)} every single day.`,
        visualPrompt: 'Product in sleek modern lifestyle workspace setting',
        negativePrompt: '',
        cameraMotion: 'macro_reveal',
      },
      {
        sceneNumber: 4,
        role: 'cta',
        roleLabel: 'Special Offer',
        durationSec: 4.5,
        headline: 'ORDER YOURS TODAY',
        subheadline: `Now available for ${priceDisplay} at DBUY Store`,
        voiceoverLine: `Grab yours now at DBUY Store for only ${priceDisplay}.`,
        visualPrompt: 'Closing showcase with price tag and official store badge',
        negativePrompt: '',
        cameraMotion: 'gentle_orbit',
      },
    ],
    estimatedDurationSec: 17.7,
    modelUsed: 'deterministic-fallback',
  };
}

/**
 * Step 2: Full End-to-End Promotional Video Generation & Client-Side Rendering
 * Zero server rendering cost: runs in-browser on HTML5 <canvas> + WebCodecs / MediaRecorder.
 */
export async function generateYouTubePromotionalVideo(
  options: GenerateYouTubeVideoOptions
): Promise<YouTubeVideoGenerationSuccess> {
  const {
    product,
    selectedImages,
    aspectRatio,
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
    message: 'Generating AI Script & Scene Plan with Gemini 2.5 Pro...',
    detail: 'Sending product title, price & features to free-tier model',
  });

  // 1. Generate Ad Plan
  const plan = await requestYouTubeAdPlan(product, selectedImages, aspectRatio);

  onProgress?.({
    stage: 'planning',
    progressPct: 18,
    message: `AI Script & 4-Scene Storyboard Ready (${plan.modelUsed.toUpperCase()})`,
    detail: `Title: "${plan.youtubeTitle.slice(0, 40)}..."`,
  });

  // 2. Optional Voiceover synthesis
  let voiceoverAudioBase64: string | undefined;
  if (enableVoiceover && plan.fullVoiceoverScript) {
    onProgress?.({
      stage: 'voiceover',
      progressPct: 22,
      message: 'Synthesizing English Voiceover Narration...',
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
      // Proceed without blocking video rendering!
    }
  }

  // 3. Prepare scenes
  const scenes: CommercialScenePlan[] = plan.scenes.map((s, idx) => ({
    sceneNumber: idx + 1,
    role: (s.role as any) || (idx === 0 ? 'hook' : idx === 1 ? 'showcase' : idx === 2 ? 'benefit' : 'cta'),
    roleLabel: s.roleLabel || `Scene ${idx + 1}`,
    durationSec: Number(s.durationSec) || 4.2,
    headline: s.headline,
    subheadline: s.subheadline,
    voiceoverLine: s.voiceoverLine || '',
    visualPrompt: s.visualPrompt || '',
    negativePrompt: '',
    cameraMotion: s.cameraMotion || 'slow_zoom_in',
  }));

  const totalDuration = scenes.reduce((sum, s) => sum + s.durationSec, 0);

  // Price banner string
  const formattedPrice =
    Number(product.price) > 0
      ? `Only $${Number(product.price).toFixed(Number.isInteger(Number(product.price)) ? 0 : 2)}`
      : 'Special Offer';
  const priceBanner = customPriceBanner || customCta || formattedPrice;

  // 4. Render client-side video with Canvas & WebCodecs/MediaRecorder
  const result = await generateTikTokPromoVideo(
    {
      product,
      selectedImages,
      aspectRatio,
      musicMood,
      scenes,
      durationSec: totalDuration,
      priceBanner,
      includeWebLinkOverlay: true,
      voiceoverAudioBase64,
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
  };
}
