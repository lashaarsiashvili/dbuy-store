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

export type CommercialMotionStyle =
  | 'whip_pan'
  | 'tilt_3d'
  | 'zoom_punch'
  | 'light_sweep';

export type CommercialResolutionPreset = '1080p' | '720p';

export interface CommercialScenePlan {
  sceneNumber: number;
  role: CommercialSceneRole;
  roleLabel: string;
  durationSec: number;
  headline: string;
  subheadline: string;
  calloutBadge?: string;
  highlightWord?: string;
  voiceoverLine: string;
  visualPrompt: string;
  negativePrompt: string;
  motionStyle?: CommercialMotionStyle;
  cameraMotion:
    | CommercialMotionStyle
    | 'slow_zoom_in'
    | 'smooth_pan_right'
    | 'gentle_orbit'
    | 'macro_reveal';
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
  modelUsed?: string;
  accentColorHex?: string;
}

export interface CommercialVoiceoverResult {
  audioBase64: string;
  mimeType: string;
  voiceName: string;
  voiceTone: CommercialVoiceTone;
  accent: CommercialVoiceAccent;
  wordCount: number;
}

export const COMMERCIAL_MOTION_STYLE_OPTIONS: Array<{
  value: CommercialMotionStyle;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    value: 'zoom_punch',
    label: 'Fast Zoom-Punch',
    shortLabel: 'Zoom-Punch',
    description: 'High-impact cubic-bezier spring punch-in with beat shockwave',
  },
  {
    value: 'whip_pan',
    label: 'Whip-Pan Snap',
    shortLabel: 'Whip-Pan',
    description: 'Snappy directional whip-slide with velocity motion streaks',
  },
  {
    value: 'tilt_3d',
    label: '3D Perspective Tilt',
    shortLabel: '3D Tilt',
    description: 'Floating 2.5D card tilt with dynamic depth shadow & rim light',
  },
  {
    value: 'light_sweep',
    label: 'Studio Light Sweep',
    shortLabel: 'Light Sweep',
    description: 'Volumetric specular light beam gliding across product finish',
  },
];

export const COMMERCIAL_RESOLUTION_OPTIONS: Array<{
  value: CommercialResolutionPreset;
  label: string;
  shortLabel: string;
  verticalDims: string;
  landscapeDims: string;
}> = [
  {
    value: '1080p',
    label: '1080p Full HD · 60fps',
    shortLabel: '1080p · 60fps',
    verticalDims: '1080×1920',
    landscapeDims: '1920×1080',
  },
  {
    value: '720p',
    label: '720p Fast HD · 60fps',
    shortLabel: '720p · 60fps',
    verticalDims: '720×1280',
    landscapeDims: '1280×720',
  },
];

export function normalizeMotionStyle(
  raw?: string,
  sceneIndex = 0
): CommercialMotionStyle {
  const val = (raw || '').trim().toLowerCase();
  if (val === 'whip_pan' || val === 'smooth_pan_right') return 'whip_pan';
  if (val === 'tilt_3d' || val === 'gentle_orbit') return 'tilt_3d';
  if (val === 'zoom_punch' || val === 'slow_zoom_in') return 'zoom_punch';
  if (val === 'light_sweep' || val === 'macro_reveal') return 'light_sweep';
  const cycle: CommercialMotionStyle[] = [
    'zoom_punch',
    'whip_pan',
    'tilt_3d',
    'light_sweep',
  ];
  return cycle[sceneIndex % cycle.length];
}

export const MANDATORY_STYLE_MODIFIERS =
  'high-converting social ad motion graphics, cubic-bezier whip-pan and 3D perspective tilt choreography, volumetric studio light sweep, crisp product silhouette preserved faithfully, 60fps ultra-smooth commercial finish';

export const ENFORCED_NEGATIVE_PROMPT =
  'static slideshow, slow linear zoom, frozen still frame, distorted product geometry, cluttered background, blurry, low quality';

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
    dimensions: '1080×1920',
    width: 1080,
    height: 1920,
  },
  {
    value: '16:9',
    label: '16:9 Widescreen (YouTube / Website)',
    shortLabel: '16:9 Landscape',
    dimensions: '1920×1080',
    width: 1920,
    height: 1080,
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
    description: 'Clean soft commercial studio lighting, distraction-free backdrop',
  },
  {
    value: 'lifestyle_home',
    label: 'Warm Soft Studio',
    description: 'Warm diffused studio key light with subtle alabaster depth',
  },
  {
    value: 'tech_modern',
    label: 'Dark Sleek Studio',
    description: 'Refined dark architectural studio lighting with soft rim highlights',
  },
];

export const COMMERCIAL_VOICE_TONE_OPTIONS: Array<{
  value: CommercialVoiceTone;
  label: string;
  description: string;
  voiceName: string;
}> = [
  {
    value: 'friendly',
    label: 'Warm & Professional',
    description: 'Natural, warm, trustworthy product showcase narration',
    voiceName: 'Kore',
  },
  {
    value: 'energetic',
    label: 'Crisp & Upbeat',
    description: 'Clear, confident, engaging social feed pacing',
    voiceName: 'Puck',
  },
  {
    value: 'calm_luxury',
    label: 'Calm & Refined',
    description: 'Composed, smooth, flagship brand delivery',
    voiceName: 'Charon',
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
    .replace(/[*_`~|>•▪●◆►]/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strict negative-constraint sanitizer for spoken voiceover text:
 * - Strips meta-instructions, prompt rules, style descriptions, and voice/accent mentions
 * - Strips technical SKUs, model codes, dimensions, shipping/warranty boilerplate, and raw bullets
 */
export function sanitizeSpokenVoiceoverScript(raw: string): string {
  let text = sanitizeCommercialCopy(raw || '');
  if (!text) return '';

  // Remove any introductory commentary prefix ending with a colon if it mentions meta-terms
  text = text.replace(
    /^(?:here\s+is|sure|certainly|below\s+is)?[^.!?\n]{0,120}\b(?:script|voiceover|voice-over|narration|commercial|english|lighting|prompt|audio)\b[^.!?\n]{0,60}:\s*/gi,
    ''
  );

  // Remove common meta-instructions / LLM commentary prefixes & banned meta terms
  text = text
    .replace(/^(here\s+is|sure,?|certainly,?|voiceover\s*script\s*:|script\s*:|narration\s*:)\s*/gi, '')
    .replace(/\b(read\s+the\s+following(\s+[\w\s]+)?\s+verbatim\s*:?)/gi, ' ')
    .replace(/\b(speak\s+naturally\s+at\s+[\w\s]+pace)\b/gi, ' ')
    .replace(/\b(american\s+english|british\s+english|uk\s+english|us\s+english)\b/gi, ' ')
    .replace(/\b(voiceover|voice-over|studio\s+lighting|commercial|meta-instructions?|prompt\s+rules?|style\s+descriptions?|voice\s+types?|broadcast\s+pace|announcer|narrator)\b/gi, ' ');

  // Remove SKUs, part numbers, dimensions, weights, electrical specs, and shipping boilerplate
  text = text
    .replace(/\b(sku|asin|isbn|upc|ean|mpn|model\s*(no\.?|number|#)?)\s*[:#-]?\s*[a-z0-9-]{3,}/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?)?\s*(?:cm|mm|m|in|inch|inches|ft|px)?\b/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:cm|mm|kg|lbs?|oz|mah|wh|hz|khz|ghz|watts?|volts?)\b/gi, ' ')
    .replace(/\b(free\s+shipping|fast\s+shipping|worldwide\s+shipping|ships\s+within\s+\d+\s+\w+|express\s+delivery|cash\s+on\s+delivery|warranty\s+included)\b/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ');

  text = text
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([—–-])\s*([.,!?])/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

export function countWords(text: string): number {
  const cleaned = sanitizeCommercialCopy(text);
  if (!cleaned) return 0;
  return cleaned
    .split(/\s+/)
    .filter((token) => Boolean(token) && !/^[—–-]+$/.test(token)).length;
}

/**
 * Extracts a short, natural, speakable core product name from long marketplace titles
 * (removing SKUs, dimensions, parenthetical specs, and trailing pipe/comma spec lists).
 */
export function extractSpeakableProductName(title: string): string {
  const cleaned = sanitizeSpokenVoiceoverScript(title || '');
  if (!cleaned) return 'this product';
  const beforeDelimiter = cleaned.split(/\s*[|,;(/]\s*/)[0].trim();
  const words = beforeDelimiter.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(' ') || 'this product';
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
  productTitle: string,
  productContext = ''
): boolean {
  const lowerScript = sanitizeCommercialCopy(script).toLowerCase();
  const cleanTitle = sanitizeCommercialCopy(productTitle).toLowerCase();
  if (!lowerScript || !cleanTitle) return false;
  if (lowerScript.includes(cleanTitle)) return true;

  const titleKeywords = extractProductDistinctiveKeywords(productTitle);
  if (titleKeywords.length === 0) return true;
  if (titleKeywords.some((kw) => lowerScript.includes(kw))) return true;

  if (productContext) {
    const contextKeywords = extractProductDistinctiveKeywords(productContext);
    const contextMatches = contextKeywords.filter((kw) => lowerScript.includes(kw)).length;
    if (contextMatches >= 2) return true;
  }

  return false;
}

/**
 * Builds a punchy, high-converting 10–15 second commercial voiceover script
 * (Hook -> Value/Demo -> Call to Action, ~22–32 words) derived strictly from the product.
 */
export function buildProductBoundInitialScript(product: {
  title?: string;
  description?: string;
  features?: string[];
  price?: number;
}): string {
  const shortName = extractSpeakableProductName(product.title || 'this product');
  const rawFeatures = Array.isArray(product.features)
    ? product.features.map((f) => sanitizeSpokenVoiceoverScript(String(f || ''))).filter(Boolean)
    : [];
  const descSentence = sanitizeSpokenVoiceoverScript(
    String(product.description || '').split(/[.!?]/)[0] || ''
  );

  const primaryBenefit = (rawFeatures[0] || descSentence || 'effortless everyday performance')
    .replace(/^[-–—:\s]+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 9)
    .join(' ')
    .replace(/[.,;:!?]+$/, '');

  const secondaryBenefit = (rawFeatures[1] || 'sleek modern design built for daily life')
    .replace(/^[-–—:\s]+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ')
    .replace(/[.,;:!?]+$/, '');

  const lowerPrimary = primaryBenefit
    ? `${primaryBenefit.charAt(0).toLowerCase()}${primaryBenefit.slice(1)}`
    : 'effortless everyday performance';
  const lowerSecondary = secondaryBenefit
    ? `${secondaryBenefit.charAt(0).toLowerCase()}${secondaryBenefit.slice(1)}`
    : 'sleek modern design built for daily life';

  const candidate = sanitizeSpokenVoiceoverScript(
    `Ready to upgrade with ${shortName}? Experience ${lowerPrimary}, paired with ${lowerSecondary}. Order yours today at DBuy Store.`
  );
  if (countWords(candidate) <= 40) {
    return candidate;
  }
  return sanitizeSpokenVoiceoverScript(
    `Meet ${shortName}. Built for ${lowerPrimary} and effortless daily performance. Order yours today at DBuy Store.`
  );
}

/**
 * Enforces clean 10–15 second commercial voiceover rules:
 * - Sanitized of all meta-instructions, accents, SKUs, dimensions, shipping terms
 * - 2 to 4 punchy sentences (12 to 44 words total, ideal for 10–15s pacing)
 */
export function enforceShortVoiceoverScript(
  rawScript: string,
  product: { title?: string; description?: string; features?: string[] }
): string {
  const cleaned = sanitizeSpokenVoiceoverScript(rawScript);
  if (!cleaned) {
    return buildProductBoundInitialScript(product);
  }

  // Keep up to 4 crisp sentences for Hook -> Value/Demo -> CTA pacing
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  let joined = sentences.join(' ').trim();

  if (countWords(joined) > 44) {
    const tokens = joined
      .split(/\s+/)
      .filter((t) => Boolean(t) && !/^[—–-]+$/.test(t));
    const trailingStop = new Set(['for', 'and', 'or', 'with', 'the', 'a', 'an', 'to', 'of', 'in', 'on']);
    let kept = tokens.slice(0, 36);
    while (
      kept.length > 10 &&
      trailingStop.has(kept[kept.length - 1].toLowerCase().replace(/[.,;:!?]+$/, ''))
    ) {
      kept.pop();
    }
    const trimmed = kept.join(' ').replace(/[,.;:!?—–-]+$/, '');
    joined = trimmed ? `${trimmed}. Order yours today at DBuy Store.` : buildProductBoundInitialScript(product);
  }

  const productContext = [
    product.description || '',
    ...(Array.isArray(product.features) ? product.features : []),
  ].join(' ');

  if (countWords(joined) < 6 || !verifyVoiceoverBindsProduct(joined, product.title || '', productContext)) {
    return buildProductBoundInitialScript(product);
  }

  return joined;
}

/**
 * Visual Prompt Optimizer for Google Veo Image-to-Video Commercial Generation:
 * - Transforms static product photography into live-action cinematic motion
 * - Realistic physics, sweeping commercial studio lighting, lifestyle dynamics
 * - Strictly avoids static Ken Burns zoom/slideshow appearance
 */
export function optimizeCommercialVisualPrompt(
  rawPrompt: string,
  visualTheme: CommercialVisualTheme,
  productTitle?: string
): string {
  let cleaned = sanitizeCommercialCopy(rawPrompt || '');

  const blockedPatterns: Array<[RegExp, string]> = [
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\bclose[-\s]?up\s+(of\s+)?(a\s+)?(human\s+)?(face|faces|eyes|mouth|smiling\s+person|headshot)\b/gi, 'cinematic macro tracking shot across product materials and finish'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(portrait|selfie|facial\s+expression|talking\s+head|human\s+face|human\s+faces)\b/gi, 'dynamic hero product framing'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(deformed\s+hands?|extra\s+fingers?|creepy)\b/gi, 'clean product contour'],
    [/(?<!\bno\s)(?<!\bnever\s)\b(static\s+(product\s+)?(photo|image|slideshow|still)|slow\s+zoom[-\s]?in\s+with\s+subtle\s+parallax)\b/gi, 'cinematic 3D camera orbit with dynamic moving studio key lights and real physical motion'],
  ];

  for (const [pattern, replacement] of blockedPatterns) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

  const themeDirection: Record<CommercialVisualTheme, string> = {
    minimalist_studio:
      'luxury minimalist studio cyclorama with sweeping volumetric softbox reflections gliding across the surface',
    lifestyle_home:
      'sunlit modern architectural lifestyle interior with natural moving light shafts and warm ambient depth',
    tech_modern:
      'sleek obsidian flagship tech studio with dramatic moving neon rim lights, reflective dark glass surface, and subtle atmospheric light particles',
  };

  if (!cleaned) {
    const subject = sanitizeCommercialCopy(productTitle || 'the hero product');
    cleaned = `Cinematic live-action commercial shot bringing ${subject} to life with a smooth 3D gimbal arc, dynamic reflections sweeping across its texture, and natural ambient motion`;
  }

  const lower = cleaned.toLowerCase();
  const additions: string[] = [];

  if (!lower.includes('lighting') && !lower.includes('studio') && !lower.includes('sunlit')) {
    additions.push(themeDirection[visualTheme]);
  }
  if (!lower.includes('4k') && !lower.includes('cinematic')) {
    additions.push(MANDATORY_STYLE_MODIFIERS);
  }

  return [cleaned.replace(/[.,;\s]+$/, ''), ...additions].join(', ');
}

/**
 * Builds the cohesive Google Veo Image-to-Video master commercial motion prompt
 * so the Hero product photo comes alive with dynamic camera movement, realistic lighting,
 * and commercial lifestyle action (NEVER static zooming).
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

  const themeLook: Record<CommercialVisualTheme, string> = {
    minimalist_studio:
      'bright flagship studio cyclorama with animated softbox light sweeps and crisp glossy surface reflections',
    lifestyle_home:
      'modern sunlit lifestyle environment with gentle natural motion, soft shadows, and authentic real-world depth',
    tech_modern:
      'dark flagship tech studio with sweeping cobalt-blue and crisp white rim lights across a reflective slate surface',
  };

  const leadSceneMotion = params.scenes
    .slice(0, 3)
    .map((s) => s.visualPrompt)
    .filter(Boolean)
    .join(' Then transition smoothly: ');

  return `Cinematic commercial product film (${params.aspectRatio}) bringing the exact hero product "${cleanTitle}" from the input image to life. ${
    topFeatures ? `Visually showcase ${topFeatures}. ` : ''
  }Environment: ${themeLook[params.visualTheme]}. ${
    leadSceneMotion
      ? `Motion choreography: ${leadSceneMotion}. `
      : 'Begin with a fluid low-angle 3D gimbal reveal, sweep dramatic commercial studio key lights across the product finish and materials, and glide smoothly into a crisp hero showcase angle. '
  }Preserve the product's exact shape, proportions, colors, and details faithfully. Real physical lighting shifts, subtle atmospheric depth, zero static slideshow zooming, zero on-screen text or watermarks.`;
}

export function getVoiceStylePrompt(
  tone: CommercialVoiceTone,
  accent: CommercialVoiceAccent
): { voiceName: string; styleInstruction: string } {
  const regionNote = accent === 'uk' ? 'refined British' : 'natural North American';

  if (tone === 'energetic') {
    return {
      voiceName: 'Puck',
      styleInstruction: `Crisp, confident, upbeat ${regionNote} product showcase narration`,
    };
  }

  if (tone === 'calm_luxury') {
    return {
      voiceName: 'Charon',
      styleInstruction: `Calm, refined, smooth ${regionNote} luxury product showcase narration`,
    };
  }

  return {
    voiceName: 'Kore',
    styleInstruction: `Warm, natural, professional ${regionNote} product showcase narration`,
  };
}

/**
 * Separates the spoken script cleanly from TTS metadata so meta-instructions,
 * accents, or style descriptions are NEVER embedded into the spoken text payload.
 */
export function buildEnglishTtsPrompt(
  script: string,
  tone: CommercialVoiceTone,
  accent: CommercialVoiceAccent
): { voiceName: string; styleInstruction: string; promptText: string } {
  const spokenOnly = sanitizeSpokenVoiceoverScript(script);
  const { voiceName, styleInstruction } = getVoiceStylePrompt(tone, accent);
  return { voiceName, styleInstruction, promptText: spokenOnly };
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

/**
  * Generates a robust procedural 16kHz mono WAV voiceover track simulating speech rhythm and formants.
  */
export function generateFallbackSpeechWav(script: string): string {
  const sampleRate = 16000;
  const words = (script || 'Product showcase').split(/\s+/).filter(Boolean);
  const durationSec = Math.max(3, Math.min(15, words.length * 0.48));
  const numSamples = Math.round(sampleRate * durationSec);
  const buffer = new Int16Array(numSamples);

  let phase = 0;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((i / numSamples) * Math.PI);
    const syllableMod = Math.sin(t * words.length * 5.5 * Math.PI) > 0.05 ? 1.0 : 0.25;
    const carrier = Math.sin(phase) * 9000 * envelope * syllableMod;
    const formant = Math.sin(phase * 2.1) * 3500 * envelope * syllableMod;
    buffer[i] = Math.max(-32768, Math.min(32767, Math.round(carrier + formant)));
    phase += (2 * Math.PI * 215) / sampleRate;
  }

  const byteLen = buffer.byteLength;
  const wavBytes = new Uint8Array(44 + byteLen);
  const view = new DataView(wavBytes.buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let k = 0; k < str.length; k++) {
      wavBytes[offset + k] = str.charCodeAt(k);
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + byteLen, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, byteLen, true);
  wavBytes.set(new Uint8Array(buffer.buffer), 44);

  let outBinary = '';
  const chunkSize = 0x8000;
  for (let k = 0; k < wavBytes.length; k += chunkSize) {
    outBinary += String.fromCharCode(...wavBytes.subarray(k, k + chunkSize));
  }
  return btoa(outBinary);
}

/**
 * Generates clean, product-bound 4-scene kinetic callout & motion storyboard defaults
 * (~9.6s main + 2.5s DBuy Outro = ~12.1s total) before or alongside Gemini Director planning.
 */
export function buildDirectorFallbackScenes(
  product: {
    title?: string;
    description?: string;
    features?: string[];
    price?: number;
  },
  visualTheme: CommercialVisualTheme = 'minimalist_studio'
): CommercialScenePlan[] {
  const cleanTitle = sanitizeCommercialCopy(product.title || 'Featured Tech');
  const shortName = extractSpeakableProductName(cleanTitle);
  const cleanedFeatures = (product.features || [])
    .map((f) => sanitizeSpokenVoiceoverScript(String(f || '')))
    .filter(Boolean);

  const badge1 = (cleanedFeatures[0] || 'Next-Gen Upgrade')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  const badge2 = (cleanedFeatures[1] || 'Built For Daily Life')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');
  const badge3 = (cleanedFeatures[2] || 'Smart Everyday Essential')
    .split(/\s+/)
    .slice(0, 4)
    .join(' ');

  const script = buildProductBoundInitialScript(product);
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const priceTag =
    Number(product.price) > 0
      ? `Only $${(Math.round(Number(product.price) * 100) / 100).toFixed(
          Number.isInteger(Number(product.price)) ? 0 : 2
        )}`
      : 'Limited Stock';

  return [
    {
      sceneNumber: 1,
      role: 'hook',
      roleLabel: 'Hook & Reveal',
      durationSec: 2.3,
      headline: shortName.toUpperCase(),
      subheadline: badge1,
      calloutBadge: badge1,
      highlightWord: shortName.split(/\s+/)[0] || 'UPGRADE',
      voiceoverLine: sentences[0] || `Ready to upgrade with ${shortName}?`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Fast zoom-punch hero reveal of ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      motionStyle: 'zoom_punch',
      cameraMotion: 'zoom_punch',
    },
    {
      sceneNumber: 2,
      role: 'showcase',
      roleLabel: 'Key Benefit',
      durationSec: 2.5,
      headline: badge1.toUpperCase(),
      subheadline: badge2,
      calloutBadge: badge2,
      highlightWord: badge1.split(/\s+/)[0] || 'SMART',
      voiceoverLine:
        sentences[1] || `Designed with ${badge1.toLowerCase()} for effortless performance.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Whip-pan showcase highlighting ${badge1} on ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      motionStyle: 'whip_pan',
      cameraMotion: 'whip_pan',
    },
    {
      sceneNumber: 3,
      role: 'benefit',
      roleLabel: 'Feature Proof',
      durationSec: 2.5,
      headline: badge2.toUpperCase(),
      subheadline: badge3,
      calloutBadge: badge3,
      highlightWord: badge2.split(/\s+/)[0] || 'PREMIUM',
      voiceoverLine:
        sentences[2] || `Built with ${badge2.toLowerCase()} wherever you go.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `3D perspective tilt revealing sleek craftsmanship of ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      motionStyle: 'tilt_3d',
      cameraMotion: 'tilt_3d',
    },
    {
      sceneNumber: 4,
      role: 'cta',
      roleLabel: 'Urgency CTA',
      durationSec: 2.3,
      headline: 'SHOP NOW AT DBUY',
      subheadline: `${priceTag} · Fast Worldwide Dispatch`,
      calloutBadge: priceTag,
      highlightWord: 'TODAY',
      voiceoverLine:
        sentences[sentences.length - 1] || 'Order yours today at DBuy Store.',
      visualPrompt: optimizeCommercialVisualPrompt(
        `Studio light sweep closing hero shot of ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      motionStyle: 'light_sweep',
      cameraMotion: 'light_sweep',
    },
  ];
}

