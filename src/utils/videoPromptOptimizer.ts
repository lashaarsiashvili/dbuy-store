// ============================================================================
// Commercial Video Ad Pipeline — Shared Types, Product Binding & In-Use Prompts
// ============================================================================

export type CommercialAspectRatio = '9:16' | '16:9';

export type CommercialVisualTheme =
  | 'minimalist_studio'
  | 'lifestyle_home'
  | 'tech_modern';

export type CommercialVoiceTone = 'energetic' | 'calm_luxury' | 'friendly';

export type CommercialVoiceAccent = 'us' | 'uk';

export type CommercialMusicMood =
  | 'upbeat_tech'
  | 'modern_corporate'
  | 'chill_lofi'
  | 'luxury_ambient';

export type CommercialSceneRole = 'hook' | 'showcase' | 'benefit' | 'cta';

export interface CommercialScenePlan {
  sceneNumber: number;
  role: CommercialSceneRole;
  roleLabel: string;
  durationSec: number;
  headline: string;
  subheadline: string;
  voiceoverLine: string;
  visualPrompt: string;
  negativePrompt: string;
  cameraMotion: 'slow_zoom_in' | 'smooth_pan_right' | 'gentle_orbit' | 'macro_reveal';
}

export interface CommercialVideoPlan {
  scenes: CommercialScenePlan[];
  fullVoiceoverScript: string;
  combinedActionPrompt: string;
  wordCount: number;
  estimatedDurationSec: number;
  visualTheme: CommercialVisualTheme;
  aspectRatio: CommercialAspectRatio;
  voiceTone: CommercialVoiceTone;
  musicMood: CommercialMusicMood;
  mandatoryStyleModifiers: string;
  negativePrompt: string;
}

export interface CommercialVoiceoverResult {
  audioBase64: string;
  mimeType: string;
  voiceName: string;
  voiceTone: CommercialVoiceTone;
  accent: CommercialVoiceAccent;
  wordCount: number;
}

export const MANDATORY_STYLE_MODIFIERS =
  'commercial product videography, studio lighting, 4k resolution, smooth cinematic camera motion, sleek modern aesthetic, photorealistic, high-end advertising style';

export const ENFORCED_NEGATIVE_PROMPT =
  'distorted faces, creepy, horror, deformed hands, extra fingers, glitch, morphing, erratic movement, blurry, low quality, text artifacts';

export const COMMERCIAL_ASPECT_RATIO_OPTIONS: Array<{
  value: CommercialAspectRatio;
  label: string;
  shortLabel: string;
  dimensions: string;
  width: number;
  height: number;
}> = [
  {
    value: '9:16',
    label: '9:16 Vertical (Reels / TikTok / Shorts)',
    shortLabel: '9:16 Vertical',
    dimensions: '720×1280',
    width: 720,
    height: 1280,
  },
  {
    value: '16:9',
    label: '16:9 Widescreen (YouTube / Website)',
    shortLabel: '16:9 Landscape',
    dimensions: '1280×720',
    width: 1280,
    height: 720,
  },
];

export const COMMERCIAL_VISUAL_THEME_OPTIONS: Array<{
  value: CommercialVisualTheme;
  label: string;
  description: string;
}> = [
  {
    value: 'minimalist_studio',
    label: 'Minimalist Studio',
    description: 'Clean bright modern architectural interior, soft natural lighting',
  },
  {
    value: 'lifestyle_home',
    label: 'Lifestyle / Home',
    description: 'Warm sunlit home office or living space, oak & linen textures',
  },
  {
    value: 'tech_modern',
    label: 'Tech / Modern',
    description: 'Sleek contemporary workspace, crisp ambient lighting, modern desk gear',
  },
];

export const COMMERCIAL_VOICE_TONE_OPTIONS: Array<{
  value: CommercialVoiceTone;
  label: string;
  description: string;
  voiceName: string;
}> = [
  {
    value: 'energetic',
    label: 'Energetic Commercial',
    description: 'Upbeat, crisp, confident pacing for social feeds',
    voiceName: 'Puck',
  },
  {
    value: 'calm_luxury',
    label: 'Calm / Luxury',
    description: 'Composed, refined, smooth flagship brand delivery',
    voiceName: 'Charon',
  },
  {
    value: 'friendly',
    label: 'Friendly & Natural',
    description: 'Warm, relatable, trustworthy everyday voiceover',
    voiceName: 'Kore',
  },
];

export const COMMERCIAL_VOICE_ACCENT_OPTIONS: Array<{
  value: CommercialVoiceAccent;
  label: string;
}> = [
  { value: 'us', label: 'US English' },
  { value: 'uk', label: 'UK English' },
];

export const COMMERCIAL_MUSIC_MOOD_OPTIONS: Array<{
  value: CommercialMusicMood;
  label: string;
  description: string;
}> = [
  {
    value: 'upbeat_tech',
    label: 'Upbeat Tech',
    description: 'Modern crisp synths & clean driving rhythm (118 BPM)',
  },
  {
    value: 'modern_corporate',
    label: 'Modern Corporate',
    description: 'Polished uplifting piano pads & confident groove (108 BPM)',
  },
  {
    value: 'chill_lofi',
    label: 'Chill Lo-Fi',
    description: 'Warm Rhodes chords & relaxed studio groove (86 BPM)',
  },
  {
    value: 'luxury_ambient',
    label: 'Luxury Ambient',
    description: 'Airy cinematic studio pads & refined sub-swell (76 BPM)',
  },
];

/**
 * Strips emojis, hashtags, URLs, markdown symbols, and erratic punctuation
 * so both TTS narration and on-screen commercial copy stay natural and clean.
 */
export function sanitizeCommercialCopy(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/#[\p{L}\p{N}_-]+/gu, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
      ' '
    )
    .replace(/[*_`~|>]/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  const cleaned = sanitizeCommercialCopy(text);
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

/**
 * Extracts distinctive non-trivial keywords from a product title so we can
 * verify that generated voiceover copy explicitly references the exact product.
 */
export function extractProductDistinctiveKeywords(title: string): string[] {
  const stopWords = new Set([
    'with', 'and', 'for', 'the', 'pro', 'plus', 'mini', 'max', 'ultra',
    'new', 'best', 'set', 'kit', 'pack', 'pcs', 'piece', 'inch',
  ]);
  const tokens = sanitizeCommercialCopy(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));
  return Array.from(new Set(tokens));
}

export function verifyVoiceoverBindsProduct(
  script: string,
  productTitle: string
): boolean {
  const lowerScript = sanitizeCommercialCopy(script).toLowerCase();
  const cleanTitle = sanitizeCommercialCopy(productTitle).toLowerCase();
  if (!lowerScript || !cleanTitle) return false;
  if (lowerScript.includes(cleanTitle)) return true;

  const keywords = extractProductDistinctiveKeywords(productTitle);
  if (keywords.length === 0) return true;
  const matchedCount = keywords.filter((kw) => lowerScript.includes(kw)).length;
  return matchedCount >= Math.min(2, keywords.length);
}

/**
 * Builds an exact product-bound initial English script immediately when a product
 * loads (zero generic filler), naming the exact product, its real features, and price.
 */
export function buildProductBoundInitialScript(product: {
  title?: string;
  description?: string;
  features?: string[];
  price?: number;
}): string {
  const cleanTitle = sanitizeCommercialCopy(product.title || 'this featured product');
  const rawFeatures = Array.isArray(product.features)
    ? product.features.map((f) => sanitizeCommercialCopy(String(f || ''))).filter(Boolean)
    : [];
  const descSentence = sanitizeCommercialCopy(
    String(product.description || '').split(/[.!?]/)[0] || ''
  );

  const featureOne = rawFeatures[0] || descSentence || 'reliable everyday performance';
  const featureTwo = rawFeatures[1] || '';
  const priceNum = Number(product.price) || 0;
  const priceClause =
    priceNum > 0 ? `Get yours for just $${priceNum.toFixed(2)} at DBUY Store.` : 'Shop yours today at DBUY Store.';

  const detailsPart = featureTwo
    ? `Enjoy ${featureOne.charAt(0).toLowerCase()}${featureOne.slice(1)} and ${featureTwo.charAt(0).toLowerCase()}${featureTwo.slice(1)}.`
    : `Built for ${featureOne.charAt(0).toLowerCase()}${featureOne.slice(1)}.`;

  return sanitizeCommercialCopy(
    `Meet the ${cleanTitle}. ${detailsPart} ${priceClause}`
  );
}

/**
 * Stage 2 Visual Prompt Optimizer for Practical "In-Use" Action Scenes:
 * - Preserves realistic human hands actively interacting with the product.
 * - Blocks close-up human faces/portraits and erratic/deformed hand language.
 * - Appends environment direction matching the visual theme + mandatory modifiers.
 */
export function optimizeCommercialVisualPrompt(
  rawPrompt: string,
  visualTheme: CommercialVisualTheme,
  productTitle?: string
): string {
  let cleaned = sanitizeCommercialCopy(rawPrompt || '');

  // Strip uncanny-valley close-up face & deformed-hand phrases while keeping
  // natural hands-on product interaction and existing negative "no human faces" guardrails intact.
  const blockedPatterns: Array<[RegExp, string]> = [
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\bclose[-\s]?up\s+(of\s+)?(a\s+)?(human\s+)?(face|faces|eyes|mouth|smiling\s+person|headshot)\b/gi, 'over-the-shoulder perspective focused on hands using the product'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(portrait|selfie|facial\s+expression|talking\s+head|human\s+face|human\s+faces)\b/gi, 'waist-down workspace perspective focused on the product'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(deformed\s+hands?|extra\s+fingers?|creepy)\b/gi, 'natural human hands cleanly operating the product'],
    [/(?<!\bno\s)(?<!\bnever\s)\bstatic\s+(product\s+)?(photo|image|slideshow|still)\b/gi, 'live-action hands-on product demonstration'],
  ];

  for (const [pattern, replacement] of blockedPatterns) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

  const themeDirection: Record<CommercialVisualTheme, string> = {
    minimalist_studio:
      'clean contemporary minimalist desk environment, soft diffused natural daylight, architectural shadows',
    lifestyle_home:
      'warm sunlit modern home workspace with natural oak tabletop, soft indoor depth of field',
    tech_modern:
      'sleek modern office desk setup with laptop and tablet, crisp balanced studio key light and subtle rim highlights',
  };

  if (!cleaned) {
    const subject = sanitizeCommercialCopy(productTitle || 'the exact product shown in the reference image');
    cleaned = `Live-action medium close-up of natural human hands smoothly using ${subject} in real time on a desk`;
  }

  const lower = cleaned.toLowerCase();
  const additions: string[] = [];

  if (
    !lower.includes('workspace') &&
    !lower.includes('desk') &&
    !lower.includes('home') &&
    !lower.includes('environment')
  ) {
    additions.push(themeDirection[visualTheme]);
  }
  if (!lower.includes('no faces') && !lower.includes('no human faces')) {
    additions.push('framing stays below shoulder level with zero human faces visible');
  }
  if (!lower.includes('commercial product videography')) {
    additions.push(MANDATORY_STYLE_MODIFIERS);
  }

  return [cleaned.replace(/[.,;\s]+$/, ''), ...additions].join(', ');
}

/**
 * Builds the cohesive 15-second reference-guided practical "in-use" video prompt
 * sent to gemini-omni-1.2-flash alongside the real product reference photos.
 */
export function buildCombinedActionVideoPrompt(params: {
  product: {
    title: string;
    description?: string;
    features?: string[];
    category?: string;
  };
  scenes: CommercialScenePlan[];
  visualTheme: CommercialVisualTheme;
  aspectRatio: CommercialAspectRatio;
  durationSec?: number;
}): string {
  const cleanTitle = sanitizeCommercialCopy(params.product.title);
  const topFeatures = (params.product.features || [])
    .map((f) => sanitizeCommercialCopy(f))
    .filter(Boolean)
    .slice(0, 3)
    .join('; ');

  const totalSec = Math.max(8, Math.min(15, Math.round(params.durationSec || 12)));
  const s1End = (totalSec * 0.25).toFixed(1);
  const s2End = (totalSec * 0.55).toFixed(1);
  const s3End = (totalSec * 0.8).toFixed(1);

  const sceneDirections = params.scenes
    .slice(0, 4)
    .map((s) => {
      const timeRange =
        s.sceneNumber === 1
          ? `0s-${s1End}s (Everyday Workspace Context)`
          : s.sceneNumber === 2
          ? `${s1End}s-${s2End}s (Hands-On Practical Usage)`
          : s.sceneNumber === 3
          ? `${s2End}s-${s3End}s (Key Feature in Motion)`
          : `${s3End}s-${totalSec}s (Clean Closing Product Shot)`;
      return `Shot ${s.sceneNumber} [${timeRange}]: ${s.visualPrompt}`;
    })
    .join('\n');

  const themeLook: Record<CommercialVisualTheme, string> = {
    minimalist_studio: 'bright minimalist architectural workspace, clean matte surfaces, soft daylight',
    lifestyle_home: 'warm sunlit home office or living space, natural wood desk, inviting modern decor',
    tech_modern: 'sleek contemporary tech workstation with laptop and tablet, crisp studio lighting',
  };

  return `Create a seamless ${totalSec}-second photorealistic live-action commercial video (${params.aspectRatio} aspect ratio) showing real-world everyday usage of the exact product in the attached reference image(s): "${cleanTitle}".
${topFeatures ? `Key product capabilities to demonstrate naturally in motion: ${topFeatures}.` : ''}

VISUAL CONTINUITY & PRODUCTION DIRECTION:
1. Keep the physical product's exact design, proportions, colors, hardware details, and finish faithful to the attached reference photos.
2. Film continuous live-action physical motion inside a ${themeLook[params.visualTheme]} with realistic camera depth of field and natural lighting.
3. Show natural human hands smoothly interacting with and operating "${cleanTitle}" in real time (holding, typing, clicking, adjusting, or using it effortlessly on the workspace).
4. Keep camera framing below shoulder height focused strictly on the product, tabletop surface, and natural hand movements, with clean frame edges and zero on-screen text, captions, logos, or watermarks.

4-SHOT PRACTICAL ACTION STORYBOARD:
${sceneDirections}

STYLE & CINEMATOGRAPHY:
${MANDATORY_STYLE_MODIFIERS}, smooth stabilized gimbal motion, natural skin tones, crisp tactile details.`;
}

export function getVoiceStylePrompt(
  tone: CommercialVoiceTone,
  accent: CommercialVoiceAccent
): { voiceName: string; styleInstruction: string } {
  const accentLabel =
    accent === 'uk'
      ? 'natural British English (UK)'
      : 'natural American English (US)';

  if (tone === 'energetic') {
    return {
      voiceName: 'Puck',
      styleInstruction: `an energetic, crisp, upbeat, confident ${accentLabel} commercial voiceover announcer`,
    };
  }

  if (tone === 'calm_luxury') {
    return {
      voiceName: 'Charon',
      styleInstruction: `a calm, refined, smooth, poised ${accentLabel} luxury brand commercial narrator`,
    };
  }

  return {
    voiceName: 'Kore',
    styleInstruction: `a warm, friendly, trustworthy, conversational ${accentLabel} commercial narrator`,
  };
}

/**
 * Builds a clean plain-text TTS prompt without using unsupported `speechMetadata`
 * part fields, instructing strictly English US/UK commercial narration.
 */
export function buildEnglishTtsPrompt(
  script: string,
  tone: CommercialVoiceTone,
  accent: CommercialVoiceAccent
): { voiceName: string; promptText: string } {
  const cleaned = sanitizeCommercialCopy(script);
  const { voiceName, styleInstruction } = getVoiceStylePrompt(tone, accent);
  const promptText = `Read the following commercial advertisement aloud strictly in English as ${styleInstruction}. Speak naturally at a clear studio broadcast pace and read only the script below verbatim:\n\n${cleaned}`;
  return { voiceName, promptText };
}

/**
 * Ensures returned base64 audio bytes have a valid RIFF WAV header.
 */
export function ensureWavBase64(
  base64Audio: string,
  mimeType = 'audio/wav'
): { audioBase64: string; mimeType: string } {
  const cleanB64 = (base64Audio || '').includes(',')
    ? base64Audio.split(',')[1]
    : base64Audio;

  const binary = atob(cleanB64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  if (
    byteLen >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return { audioBase64: cleanB64, mimeType: 'audio/wav' };
  }

  const lowerMime = (mimeType || '').toLowerCase();
  if (
    lowerMime.includes('mpeg') ||
    lowerMime.includes('mp3') ||
    lowerMime.includes('ogg') ||
    lowerMime.includes('webm') ||
    lowerMime.includes('mp4')
  ) {
    return { audioBase64: cleanB64, mimeType };
  }

  const rateMatch = lowerMime.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? Number(rateMatch[1]) || 24000 : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const wavBytes = new Uint8Array(44 + byteLen);
  const view = new DataView(wavBytes.buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      wavBytes[offset + i] = str.charCodeAt(i);
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + byteLen, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, byteLen, true);
  wavBytes.set(bytes, 44);

  let outBinary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < wavBytes.length; i += chunkSize) {
    outBinary += String.fromCharCode(...wavBytes.subarray(i, i + chunkSize));
  }

  return {
    audioBase64: btoa(outBinary),
    mimeType: 'audio/wav',
  };
}
