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
  'clean soft commercial studio lighting, distraction-free background, smooth slow zoom-in with subtle parallax depth, focus exclusively on product design, texture, and key visual features, 4k photorealistic product showcase';

export const ENFORCED_NEGATIVE_PROMPT =
  'cluttered background, static image, harsh shadows, distorted geometry, glitch, morphing, erratic movement, blurry, low quality, text artifacts, watermarks';

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
 * Builds a concise, natural, warm commercial voiceover script (1–2 sentences, <15 words)
 * derived strictly from the product name and its single strongest benefit.
 * Example structure: "Meet [Product Name] — [Main Benefit]. Get yours today."
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

  const rawBenefit = rawFeatures[0] || descSentence || 'effortless everyday performance';
  const nameWords = shortName.split(/\s+/).filter(Boolean);
  // Reserve 4 words: "Meet" (1) + "Get yours today." (3) => max 14 total words
  const maxBenefitWords = Math.max(3, 14 - 4 - nameWords.length);
  const benefitWords = rawBenefit
    .replace(/^[-–—:\s]+/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxBenefitWords);
  const benefitPhrase = benefitWords.join(' ').replace(/[.,;:!?]+$/, '');
  const loweredBenefit = benefitPhrase
    ? `${benefitPhrase.charAt(0).toLowerCase()}${benefitPhrase.slice(1)}`
    : 'effortless everyday performance';

  const candidate = sanitizeSpokenVoiceoverScript(
    `Meet ${shortName} — ${loweredBenefit}. Get yours today.`
  );
  if (countWords(candidate) <= 14) {
    return candidate;
  }
  return sanitizeSpokenVoiceoverScript(`Meet ${shortName} — built for effortless performance. Get yours today.`);
}

/**
 * Enforces the strict voiceover output rules:
 * - Sanitized of all meta-instructions, accents, SKUs, dimensions, shipping terms
 * - Maximum 2 sentences and strictly under 15 words total (<= 14 words)
 */
export function enforceShortVoiceoverScript(
  rawScript: string,
  product: { title?: string; description?: string; features?: string[] }
): string {
  const cleaned = sanitizeSpokenVoiceoverScript(rawScript);
  if (!cleaned) {
    return buildProductBoundInitialScript(product);
  }

  // Keep at most 2 sentences
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);

  let joined = sentences.join(' ').trim();

  if (countWords(joined) >= 15) {
    const firstTokens = (sentences[0] || '')
      .split(/\s+/)
      .filter((t) => Boolean(t) && !/^[—–-]+$/.test(t));
    const trailingStop = new Set(['for', 'and', 'or', 'with', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'all-day']);

    // Reserve 3 words for "Get yours today." => max 11 words in sentence 1
    let kept = firstTokens.slice(0, 11);
    while (kept.length > 4 && trailingStop.has(kept[kept.length - 1].toLowerCase().replace(/[.,;:!?]+$/, ''))) {
      kept.pop();
    }

    const firstClean = kept.join(' ').replace(/[,.;:!?—–-]+$/, '');
    joined = firstClean ? `${firstClean}. Get yours today.` : buildProductBoundInitialScript(product);
  }

  if (countWords(joined) < 3 || !verifyVoiceoverBindsProduct(joined, product.title || '')) {
    return buildProductBoundInitialScript(product);
  }

  return joined;
}

/**
 * Visual Prompt Optimizer for Product Showcase Motion:
 * - Uses product image(s) as the hero subject
 * - Smooth slow zoom-in + subtle parallax depth
 * - Clean, soft commercial studio lighting and distraction-free background
 * - Focuses exclusively on product design, texture, and key visual features
 */
export function optimizeCommercialVisualPrompt(
  rawPrompt: string,
  visualTheme: CommercialVisualTheme,
  productTitle?: string
): string {
  let cleaned = sanitizeCommercialCopy(rawPrompt || '');

  const blockedPatterns: Array<[RegExp, string]> = [
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\bclose[-\s]?up\s+(of\s+)?(a\s+)?(human\s+)?(face|faces|eyes|mouth|smiling\s+person|headshot)\b/gi, 'macro close-up of product texture and finish'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(portrait|selfie|facial\s+expression|talking\s+head|human\s+face|human\s+faces)\b/gi, 'hero product framing'],
    [/(?<!\bno\s)(?<!\bzero\s)(?<!\bavoid\s)\b(deformed\s+hands?|extra\s+fingers?|creepy)\b/gi, 'clean product contour'],
    [/(?<!\bno\s)(?<!\bnever\s)\bstatic\s+(product\s+)?(photo|image|slideshow|still)\b/gi, 'slow zoom-in with subtle parallax depth'],
  ];

  for (const [pattern, replacement] of blockedPatterns) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

  const themeDirection: Record<CommercialVisualTheme, string> = {
    minimalist_studio:
      'clean soft commercial studio lighting, distraction-free alabaster backdrop',
    lifestyle_home:
      'warm diffused studio lighting, soft distraction-free neutral backdrop',
    tech_modern:
      'sleek dark studio lighting with subtle soft rim highlights, distraction-free backdrop',
  };

  if (!cleaned) {
    const subject = sanitizeCommercialCopy(productTitle || 'the hero product');
    cleaned = `Smooth slow zoom-in and subtle parallax showcase of ${subject} highlighting design, texture, and key visual features`;
  }

  const lower = cleaned.toLowerCase();
  const additions: string[] = [];

  if (!lower.includes('backdrop') && !lower.includes('background')) {
    additions.push(themeDirection[visualTheme]);
  }
  if (!lower.includes('parallax')) {
    additions.push('smooth slow zoom-in with subtle parallax depth');
  }
  if (!lower.includes('commercial studio lighting')) {
    additions.push(MANDATORY_STYLE_MODIFIERS);
  }

  return [cleaned.replace(/[.,;\s]+$/, ''), ...additions].join(', ');
}

/**
 * Builds the cohesive reference-guided product showcase video prompt
 * focused exclusively on the product's design, texture, and key visual features.
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

  const totalSec = Math.max(8, Math.min(12, Math.round(params.durationSec || 10)));
  const sceneDirections = params.scenes
    .slice(0, 4)
    .map((s) => `Shot ${s.sceneNumber}: ${s.visualPrompt}`)
    .join('\n');

  const themeLook: Record<CommercialVisualTheme, string> = {
    minimalist_studio: 'clean soft commercial studio lighting with a distraction-free light backdrop',
    lifestyle_home: 'warm diffused studio lighting with a clean distraction-free neutral backdrop',
    tech_modern: 'sleek architectural studio lighting with soft rim highlights on a clean dark backdrop',
  };

  return `Generate a clean, dynamic product showcase video (${params.aspectRatio}) using the attached product image(s) as the hero subject: "${cleanTitle}".
${topFeatures ? `Highlight design, texture, and key visual features: ${topFeatures}.` : ''}

VISUAL & MOTION DIRECTION:
1. Keep the hero product's exact design, materials, texture, proportions, and color faithful to the attached image(s).
2. Apply smooth cinematic camera motion: slow zoom-in combined with subtle parallax movement for depth and life (never static).
3. Maintain ${themeLook[params.visualTheme]}.
4. Focus exclusively on the product's design, texture, and key visual features with zero clutter, watermarks, or text artifacts.

SHOT BREAKDOWN (~${totalSec}s):
${sceneDirections}`;
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
