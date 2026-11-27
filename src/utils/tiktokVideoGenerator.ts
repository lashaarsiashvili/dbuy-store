import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Product } from '../types';
import {
  buildCombinedActionVideoPrompt,
  buildProductBoundInitialScript,
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MOTION_STYLE_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_RESOLUTION_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  CommercialAspectRatio,
  CommercialMotionStyle,
  CommercialMusicMood,
  CommercialResolutionPreset,
  CommercialScenePlan,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceAccent,
  CommercialVoiceoverResult,
  CommercialVoiceTone,
  ENFORCED_NEGATIVE_PROMPT,
  MANDATORY_STYLE_MODIFIERS,
  normalizeMotionStyle,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
  sanitizeSpokenVoiceoverScript,
} from './videoPromptOptimizer';

export {
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MOTION_STYLE_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_RESOLUTION_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  ENFORCED_NEGATIVE_PROMPT,
  MANDATORY_STYLE_MODIFIERS,
  normalizeMotionStyle,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
};

export type {
  CommercialAspectRatio,
  CommercialMotionStyle,
  CommercialMusicMood,
  CommercialResolutionPreset,
  CommercialScenePlan,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceAccent,
  CommercialVoiceoverResult,
  CommercialVoiceTone,
};

export type PromoVideoVibe =
  | 'upbeat_tech'
  | 'modern_corporate'
  | 'chill_lofi'
  | 'luxury_ambient'
  | 'upbeat'
  | 'tech'
  | 'cinematic'
  | 'cyberpunk';

export interface GeneratedActionVideoClip {
  blob: Blob;
  mimeType: string;
  videoUrl?: string;
}

export interface PromoVideoGeneratorOptions {
  product: Product;
  selectedImages: string[];
  titleOffer?: string;
  priceBanner?: string;
  musicVibe?: PromoVideoVibe;
  musicMood?: CommercialMusicMood;
  visualTheme?: CommercialVisualTheme;
  aspectRatio?: CommercialAspectRatio;
  includeWebLinkOverlay?: boolean;
  isKa?: boolean;
  durationSec?: number;
  scenes?: CommercialScenePlan[];
  combinedActionPrompt?: string;
  voiceoverAudioBase64?: string;
  voiceoverMimeType?: string;
  voiceoverScript?: string;
  generatedVideoBlob?: Blob;
  generatedVideoBase64?: string;
  generatedVideoMimeType?: string;
}

export interface PromoVideoGenerationProgress {
  stage:
    | 'planning'
    | 'voiceover'
    | 'veo'
    | 'visuals'
    | 'audio'
    | 'rendering'
    | 'encoding'
    | 'done'
    | 'error';
  progressPct: number;
  message: string;
  detail?: string;
}

export interface PromoVideoGenerationResult {
  file: File;
  durationSec: number;
  width: number;
  height: number;
  aspectRatio: CommercialAspectRatio;
  encoderUsed: 'webcodecs-mp4' | 'mediarecorder-fallback';
  hasVoiceover: boolean;
  autoDucked: boolean;
  engineUsed?: 'gemini-director-motion' | 'google-veo' | 'canvas-fallback';
  modelUsed?: string;
  fps?: number;
  hasBrandedOutro?: boolean;
}

export const PROMO_VIBE_OPTIONS: Array<{
  value: CommercialMusicMood;
  label: string;
  labelKa: string;
}> = [
  { value: 'upbeat_tech', label: 'Upbeat Tech (Modern)', labelKa: 'Upbeat Tech (თანამედროვე)' },
  { value: 'modern_corporate', label: 'Modern Corporate (Polished)', labelKa: 'Modern Corporate (ბიზნეს)' },
  { value: 'chill_lofi', label: 'Chill Lo-Fi (Warm Studio)', labelKa: 'Chill Lo-Fi (მშვიდი სტუდიო)' },
  { value: 'luxury_ambient', label: 'Luxury Ambient (Flagship)', labelKa: 'Luxury Ambient (პრემიუმ)' },
];

const FPS = 30;
const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const CROSSFADE_SEC = 0.55;

// ============================================================================
// Step 1 Client Helper — Multimodal Gemini Director Script & Veo Motion Planner
// ============================================================================
export async function planCommercialVideoAd(params: {
  product: Product;
  visualTheme: CommercialVisualTheme;
  aspectRatio: CommercialAspectRatio;
  voiceTone: CommercialVoiceTone;
  musicMood: CommercialMusicMood;
  productImages?: Array<{ base64: string; mimeType: string }>;
}): Promise<CommercialVideoPlan> {
  const response = await fetch('/api/video-ad/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: {
        id: params.product.id,
        title: params.product.title,
        description: params.product.description || '',
        features: params.product.features || [],
        price: params.product.price,
        origPrice: params.product.origPrice,
        category: params.product.category,
        images: [params.product.image, ...(params.product.images || [])].filter(Boolean).slice(0, 6),
      },
      productImages: params.productImages || [],
      visualTheme: params.visualTheme,
      aspectRatio: params.aspectRatio,
      voiceTone: params.voiceTone,
      musicMood: params.musicMood,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.plan) {
    throw new Error(
      data?.error || `Failed to generate AI commercial script (HTTP ${response.status}).`
    );
  }
  return data.plan as CommercialVideoPlan;
}

// ============================================================================
// Step 4 Client Helpers — Free-Tier Gemini TTS + Browser SpeechSynthesis
// ============================================================================
export async function generateCommercialVoiceover(params: {
  script: string;
  voiceTone: CommercialVoiceTone;
  accent: CommercialVoiceAccent;
}): Promise<CommercialVoiceoverResult> {
  const response = await fetch('/api/video-ad/voiceover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      script: sanitizeSpokenVoiceoverScript(params.script),
      voiceTone: params.voiceTone,
      accent: params.accent,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.voiceover?.audioBase64) {
    const err: any = new Error(
      data?.error || `Failed to synthesize English voiceover (HTTP ${response.status}).`
    );
    err.quotaExhausted = Boolean(data?.quotaExhausted || response.status === 429);
    throw err;
  }
  return data.voiceover as CommercialVoiceoverResult;
}

export function isBrowserSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function stopBrowserSpeechSynthesis(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function pickBestEnglishVoice(accent: CommercialVoiceAccent): SpeechSynthesisVoice | null {
  if (!isBrowserSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLang = accent === 'uk' ? 'en-gb' : 'en-us';
  const exactLangVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetLang));
  const anyEnglishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const pool = exactLangVoices.length > 0 ? exactLangVoices : anyEnglishVoices;
  if (pool.length === 0) return null;

  const preferredKeywords =
    accent === 'uk'
      ? ['google uk', 'natural', 'daniel', 'serena', 'kate', 'libby', 'ryan', 'sonia']
      : ['google us', 'natural', 'aria', 'guy', 'jenny', 'samantha', 'alex', 'allison', 'ava'];

  for (const kw of preferredKeywords) {
    const found = pool.find((v) => v.name.toLowerCase().includes(kw));
    if (found) return found;
  }
  return pool[0];
}

export function speakWithBrowserSpeechSynthesis(params: {
  script: string;
  voiceTone: CommercialVoiceTone;
  accent: CommercialVoiceAccent;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}): boolean {
  if (!isBrowserSpeechSynthesisSupported()) {
    params.onError?.('Browser SpeechSynthesis is not supported in this browser.');
    return false;
  }
  const cleaned = sanitizeSpokenVoiceoverScript(params.script);
  if (!cleaned) return false;

  stopBrowserSpeechSynthesis();

  const startSpeaking = () => {
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = params.accent === 'uk' ? 'en-GB' : 'en-US';
    const selectedVoice = pickBestEnglishVoice(params.accent);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    if (params.voiceTone === 'energetic') {
      utterance.rate = 1.07;
      utterance.pitch = 1.04;
    } else if (params.voiceTone === 'calm_luxury') {
      utterance.rate = 0.93;
      utterance.pitch = 0.96;
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.01;
    }

    utterance.onend = () => params.onEnd?.();
    utterance.onerror = () => params.onError?.('Browser voice playback interrupted.');
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    let triggered = false;
    const handleVoices = () => {
      if (triggered) return;
      triggered = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
      startSpeaking();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoices);
    window.setTimeout(() => {
      if (!triggered) {
        triggered = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoices);
        startSpeaking();
      }
    }, 350);
  } else {
    startSpeaking();
  }

  return true;
}

// ============================================================================
// Utilities
// ============================================================================
function normalizeMusicMood(mood?: CommercialMusicMood, legacyVibe?: PromoVideoVibe): CommercialMusicMood {
  const candidate = mood || legacyVibe;
  if (
    candidate === 'upbeat_tech' ||
    candidate === 'modern_corporate' ||
    candidate === 'chill_lofi' ||
    candidate === 'luxury_ambient'
  ) {
    return candidate;
  }
  if (candidate === 'tech' || candidate === 'cyberpunk') return 'upbeat_tech';
  if (candidate === 'cinematic') return 'luxury_ambient';
  if (candidate === 'upbeat') return 'modern_corporate';
  return 'upbeat_tech';
}

function getDimensionsForAspectRatio(aspectRatio: CommercialAspectRatio): { width: number; height: number } {
  return aspectRatio === '16:9'
    ? { width: 1280, height: 720 }
    : { width: 720, height: 1280 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function easeOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(x: number): number {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(x: number): number {
  const t = clamp(x, 0, 1);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(clean);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last).width > maxWidth && last.length > 4) {
      last = last.slice(0, -2) + '…';
    }
    lines[maxLines - 1] = last;
  }
  return lines;
}

function buildProductBoundDefaultScenes(
  product: Product,
  visualTheme: CommercialVisualTheme = 'minimalist_studio'
): CommercialScenePlan[] {
  const cleanTitle = sanitizeCommercialCopy(product.title || 'Featured Product');
  const shortTitle = cleanTitle.split(/\s+/).slice(0, 4).join(' ');
  const firstFeature = sanitizeSpokenVoiceoverScript(
    product.features?.[0] || product.description?.split(/[.!?]/)[0] || 'Precision craftsmanship'
  ).slice(0, 64);
  const secondFeature = sanitizeSpokenVoiceoverScript(
    product.features?.[1] || 'Clean, refined everyday design'
  ).slice(0, 64);

  const shortScript = buildProductBoundInitialScript(product);
  const sentences = shortScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return [
    {
      sceneNumber: 1,
      role: 'hook',
      roleLabel: 'Hero Reveal',
      durationSec: 2.4,
      headline: shortTitle,
      subheadline: firstFeature,
      voiceoverLine: sentences[0] || shortScript,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Slow zoom-in with subtle parallax on ${cleanTitle} in soft studio lighting`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'slow_zoom_in',
    },
    {
      sceneNumber: 2,
      role: 'showcase',
      roleLabel: 'Design & Texture',
      durationSec: 2.8,
      headline: 'Signature Design',
      subheadline: secondFeature,
      voiceoverLine: sentences[1] || '',
      visualPrompt: optimizeCommercialVisualPrompt(
        `Smooth slow zoom-in and parallax movement highlighting texture and finish of ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'smooth_pan_right',
    },
    {
      sceneNumber: 3,
      role: 'benefit',
      roleLabel: 'Key Feature',
      durationSec: 2.8,
      headline: 'Built To Perform',
      subheadline: firstFeature,
      voiceoverLine: '',
      visualPrompt: optimizeCommercialVisualPrompt(
        `Macro detail slow zoom-in with parallax depth on key visual features of ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'macro_reveal',
    },
    {
      sceneNumber: 4,
      role: 'cta',
      roleLabel: 'Product Showcase',
      durationSec: 2.4,
      headline: shortTitle,
      subheadline: 'Available now at DBUY Store',
      voiceoverLine: sentences[1] || sentences[0] || '',
      visualPrompt: optimizeCommercialVisualPrompt(
        `Clean studio hero slow zoom-in with subtle parallax on ${cleanTitle}`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'gentle_orbit',
    },
  ];
}

// ============================================================================
// Step 2: Safe Cross-Origin Image Loader & Studio Background Analyzer
// ============================================================================
interface AnalyzedProductFrame {
  img: HTMLImageElement;
  url: string;
  aspect: number;
  isBrightStudioBg: boolean;
  accentRgb: [number, number, number];
}

function resolveCanvasSafeImageUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (typeof window !== 'undefined' && u.origin === window.location.origin) {
        return trimmed;
      }
    } catch {}
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

async function loadSingleImage(url: string): Promise<HTMLImageElement | null> {
  const safeUrl = resolveCanvasSafeImageUrl(url);
  if (!safeUrl) return null;

  const attemptLoad = (src: string, useCrossOrigin: boolean): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      if (useCrossOrigin) {
        img.crossOrigin = 'anonymous';
      }
      const timer = window.setTimeout(() => resolve(null), 10000);
      img.onload = () => {
        window.clearTimeout(timer);
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          resolve(img);
        } else {
          resolve(null);
        }
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });

  const primary = await attemptLoad(safeUrl, true);
  if (primary) return primary;

  if (safeUrl !== url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return attemptLoad(url, true);
  }
  return null;
}

function analyzeProductFrame(img: HTMLImageElement, url: string): AnalyzedProductFrame {
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  let isBrightStudioBg = false;
  let accentRgb: [number, number, number] = [56, 189, 248];

  try {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 24;
    sampleCanvas.height = 24;
    const sCtx = sampleCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(img, 0, 0, 24, 24);
      const data = sCtx.getImageData(0, 0, 24, 24).data;

      // Sample 4 corner border regions to detect white/bright studio cutouts
      const cornerCoords = [
        [1, 1], [2, 1], [1, 2],
        [22, 1], [21, 1], [22, 2],
        [1, 22], [2, 22], [1, 21],
        [22, 22], [21, 22], [22, 21],
      ];
      let brightCorners = 0;
      for (const [cx, cy] of cornerCoords) {
        const idx = (cy * 24 + cx) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (a < 220 || lum > 228) {
          brightCorners++;
        }
      }
      isBrightStudioBg = brightCorners >= 9;

      // Find vibrant center pixel for subtle studio accent lighting
      let bestSat = -1;
      for (let y = 6; y < 18; y++) {
        for (let x = 6; x < 18; x++) {
          const idx = (y * 24 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC - minC;
          if (sat > bestSat && maxC > 55 && minC < 225) {
            bestSat = sat;
            accentRgb = [r, g, b];
          }
        }
      }
    }
  } catch {
    // Fallback gracefully if pixel read isn't available
  }

  return { img, url, aspect, isBrightStudioBg, accentRgb };
}

async function loadProductImagesForCanvas(urls: string[]): Promise<AnalyzedProductFrame[]> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, 6);
  const loaded = await Promise.all(uniqueUrls.map((u) => loadSingleImage(u)));
  const frames: AnalyzedProductFrame[] = [];
  for (let i = 0; i < loaded.length; i++) {
    const img = loaded[i];
    if (img) {
      frames.push(analyzeProductFrame(img, uniqueUrls[i]));
    }
  }
  return frames;
}

// ============================================================================
// Step 4: Studio Music Synthesis + RMS Auto-Ducking Mixer (15–20% bed)
// ============================================================================
function renderMusicMoodIntoGraph(
  ctx: OfflineAudioContext,
  destination: AudioNode,
  durationSec: number,
  mood: CommercialMusicMood
) {
  const bpmMap: Record<CommercialMusicMood, number> = {
    upbeat_tech: 118,
    modern_corporate: 108,
    chill_lofi: 86,
    luxury_ambient: 76,
  };
  const bpm = bpmMap[mood];
  const beatDur = 60 / bpm;
  const barDur = beatDur * 4;

  const chordSets: Record<CommercialMusicMood, number[][]> = {
    upbeat_tech: [
      [261.63, 329.63, 392.0, 493.88, 587.33],
      [220.0, 261.63, 329.63, 392.0, 493.88],
      [174.61, 220.0, 261.63, 329.63, 392.0],
      [196.0, 246.94, 293.66, 329.63, 392.0],
    ],
    modern_corporate: [
      [293.66, 369.99, 440.0, 554.37],
      [246.94, 293.66, 369.99, 440.0],
      [196.0, 246.94, 293.66, 369.99],
      [220.0, 277.18, 329.63, 369.99],
    ],
    chill_lofi: [
      [174.61, 220.0, 261.63, 329.63],
      [164.81, 196.0, 246.94, 293.66],
      [146.83, 174.61, 220.0, 261.63, 329.63],
      [130.81, 164.81, 196.0, 246.94, 293.66],
    ],
    luxury_ambient: [
      [155.56, 196.0, 233.08, 293.66, 349.23],
      [130.81, 155.56, 196.0, 233.08, 293.66],
      [207.65, 261.63, 311.13, 392.0],
      [233.08, 293.66, 349.23, 392.0],
    ],
  };

  const bassRoots: Record<CommercialMusicMood, number[]> = {
    upbeat_tech: [65.41, 55.0, 43.65, 49.0],
    modern_corporate: [73.42, 61.74, 49.0, 55.0],
    chill_lofi: [87.31, 82.41, 73.42, 65.41],
    luxury_ambient: [77.78, 65.41, 51.91, 58.27],
  };

  const musicBusFilter = ctx.createBiquadFilter();
  musicBusFilter.type = 'lowpass';
  musicBusFilter.frequency.value =
    mood === 'chill_lofi' ? 2400 : mood === 'luxury_ambient' ? 3200 : 5200;
  musicBusFilter.Q.value = 0.6;
  musicBusFilter.connect(destination);

  const noiseLen = Math.floor(SAMPLE_RATE * 0.08);
  const noiseBuf = ctx.createBuffer(1, noiseLen, SAMPLE_RATE);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (SAMPLE_RATE * 0.018));
  }

  const chords = chordSets[mood];
  const roots = bassRoots[mood];
  const totalBars = Math.ceil(durationSec / barDur) + 1;

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * barDur;
    if (barStart >= durationSec) break;
    const chord = chords[bar % chords.length];
    const rootFreq = roots[bar % roots.length];
    const chordEnd = Math.min(durationSec + 0.15, barStart + barDur);

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = mood === 'luxury_ambient' || mood === 'chill_lofi' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, barStart);
      osc.detune.setValueAtTime(idx % 2 === 0 ? -4 : 4, barStart);

      const peak = mood === 'luxury_ambient' ? 0.068 : mood === 'chill_lofi' ? 0.072 : 0.055;
      const attack = mood === 'luxury_ambient' ? 0.65 : mood === 'chill_lofi' ? 0.04 : 0.09;

      gain.gain.setValueAtTime(0.0001, barStart);
      gain.gain.linearRampToValueAtTime(peak, Math.min(barStart + attack, chordEnd));
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0002, peak * 0.45),
        Math.min(barStart + barDur * 0.85, chordEnd)
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, chordEnd);

      osc.connect(gain);
      gain.connect(musicBusFilter);
      osc.start(barStart);
      osc.stop(chordEnd + 0.04);
    });

    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(rootFreq, barStart);
    bassGain.gain.setValueAtTime(0.0001, barStart);
    bassGain.gain.linearRampToValueAtTime(mood === 'luxury_ambient' ? 0.16 : 0.19, barStart + 0.08);
    bassGain.gain.exponentialRampToValueAtTime(0.06, Math.min(barStart + barDur * 0.9, chordEnd));
    bassGain.gain.exponentialRampToValueAtTime(0.0001, chordEnd);
    bassOsc.connect(bassGain);
    bassGain.connect(musicBusFilter);
    bassOsc.start(barStart);
    bassOsc.stop(chordEnd + 0.05);

    if (mood === 'upbeat_tech' || mood === 'modern_corporate') {
      const stepsPerBar = mood === 'upbeat_tech' ? 8 : 4;
      const stepDur = barDur / stepsPerBar;
      for (let s = 0; s < stepsPerBar; s++) {
        const t = barStart + s * stepDur;
        if (t >= durationSec) break;
        const note = chord[(s + bar) % chord.length] * (mood === 'upbeat_tech' && s % 4 === 3 ? 2 : 1);
        const pOsc = ctx.createOscillator();
        const pGain = ctx.createGain();
        pOsc.type = 'triangle';
        pOsc.frequency.setValueAtTime(note, t);
        pGain.gain.setValueAtTime(0.0001, t);
        pGain.gain.linearRampToValueAtTime(mood === 'upbeat_tech' ? 0.055 : 0.048, t + 0.012);
        pGain.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(0.28, stepDur * 0.9));
        pOsc.connect(pGain);
        pGain.connect(musicBusFilter);
        pOsc.start(t);
        pOsc.stop(t + 0.32);
      }
    } else if (mood === 'luxury_ambient') {
      const bellTime = barStart + beatDur * 0.5;
      if (bellTime < durationSec) {
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(chord[chord.length - 1] * 2, bellTime);
        bellGain.gain.setValueAtTime(0.0001, bellTime);
        bellGain.gain.linearRampToValueAtTime(0.038, bellTime + 0.06);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, Math.min(durationSec, bellTime + 2.2));
        bellOsc.connect(bellGain);
        bellGain.connect(musicBusFilter);
        bellOsc.start(bellTime);
        bellOsc.stop(Math.min(durationSec + 0.05, bellTime + 2.3));
      }
    }

    if (mood !== 'luxury_ambient') {
      for (let beat = 0; beat < 4; beat++) {
        const t = barStart + beat * beatDur;
        if (t >= durationSec) break;

        const kickTime = mood === 'chill_lofi' && beat === 2 ? t + beatDur * 0.5 : t;
        if ((beat === 0 || beat === 2) && kickTime < durationSec) {
          const kOsc = ctx.createOscillator();
          const kGain = ctx.createGain();
          kOsc.type = 'sine';
          kOsc.frequency.setValueAtTime(mood === 'chill_lofi' ? 92 : 112, kickTime);
          kOsc.frequency.exponentialRampToValueAtTime(42, kickTime + 0.09);
          kGain.gain.setValueAtTime(mood === 'chill_lofi' ? 0.22 : 0.26, kickTime);
          kGain.gain.exponentialRampToValueAtTime(0.0001, kickTime + 0.16);
          kOsc.connect(kGain);
          kGain.connect(musicBusFilter);
          kOsc.start(kickTime);
          kOsc.stop(kickTime + 0.18);
        }

        const shakerTime = t + beatDur * 0.5;
        if (shakerTime < durationSec) {
          const src = ctx.createBufferSource();
          src.buffer = noiseBuf;
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.value = mood === 'chill_lofi' ? 4500 : 6800;
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(mood === 'chill_lofi' ? 0.032 : 0.042, shakerTime);
          nGain.gain.exponentialRampToValueAtTime(0.0001, shakerTime + 0.055);
          src.connect(hp);
          hp.connect(nGain);
          nGain.connect(musicBusFilter);
          src.start(shakerTime);
        }
      }
    }
  }
}

function applyAutoDuckingEnvelope(
  voiceBuffer: AudioBuffer,
  voiceStartOffsetSec: number,
  totalDurationSec: number,
  musicDuckGain: GainNode
) {
  const sr = voiceBuffer.sampleRate;
  const channelData = voiceBuffer.getChannelData(0);
  const windowSec = 0.04;
  const windowSamples = Math.max(1, Math.floor(sr * windowSec));
  const numWindows = Math.ceil(channelData.length / windowSamples);

  const rawActive: boolean[] = new Array(numWindows).fill(false);
  const rmsThreshold = 0.014;

  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSamples;
    const end = Math.min(channelData.length, start + windowSamples);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = channelData[i];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    rawActive[w] = rms > rmsThreshold;
  }

  const holdWindows = 5;
  const smoothedActive: boolean[] = new Array(numWindows).fill(false);
  let holdCounter = 0;
  for (let w = 0; w < numWindows; w++) {
    if (rawActive[w]) {
      holdCounter = holdWindows;
      smoothedActive[w] = true;
    } else if (holdCounter > 0) {
      holdCounter--;
      smoothedActive[w] = true;
    }
  }

  const FULL_BED = 1.0;
  const DUCKED_BED = 0.17;
  const ATTACK_SEC = 0.12;
  const RELEASE_SEC = 0.34;

  musicDuckGain.gain.setValueAtTime(FULL_BED, 0);

  let currentlyDucked = false;
  for (let w = 0; w < numWindows; w++) {
    const t = voiceStartOffsetSec + w * windowSec;
    if (t >= totalDurationSec) break;
    const shouldDuck = smoothedActive[w];
    if (shouldDuck && !currentlyDucked) {
      const rampStart = Math.max(0, t - 0.06);
      musicDuckGain.gain.setValueAtTime(FULL_BED, rampStart);
      musicDuckGain.gain.linearRampToValueAtTime(
        DUCKED_BED,
        Math.min(totalDurationSec, rampStart + ATTACK_SEC)
      );
      currentlyDucked = true;
    } else if (!shouldDuck && currentlyDucked) {
      musicDuckGain.gain.setValueAtTime(DUCKED_BED, t);
      musicDuckGain.gain.linearRampToValueAtTime(
        FULL_BED,
        Math.min(totalDurationSec, t + RELEASE_SEC)
      );
      currentlyDucked = false;
    }
  }

  if (currentlyDucked) {
    const voiceEnd = Math.min(totalDurationSec - 0.05, voiceStartOffsetSec + voiceBuffer.duration);
    musicDuckGain.gain.setValueAtTime(DUCKED_BED, Math.max(0, voiceEnd));
    musicDuckGain.gain.linearRampToValueAtTime(
      FULL_BED,
      Math.min(totalDurationSec, voiceEnd + RELEASE_SEC)
    );
  }
}

export async function renderCommercialAudioMix(params: {
  musicMood: CommercialMusicMood;
  requestedDurationSec: number;
  voiceoverAudioBase64?: string;
  exactDurationSec?: number;
  outroDurationSec?: number;
}): Promise<{
  audioBuffer: AudioBuffer;
  finalDurationSec: number;
  voiceDurationSec: number;
  hasVoiceover: boolean;
  autoDucked: boolean;
}> {
  const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) {
    throw new Error('Web Audio OfflineAudioContext is not supported in this browser.');
  }

  let decodedVoice: AudioBuffer | null = null;
  if (params.voiceoverAudioBase64) {
    try {
      const wavArrayBuf = base64ToArrayBuffer(params.voiceoverAudioBase64);
      const decodeCtx = new OfflineCtx(1, SAMPLE_RATE, SAMPLE_RATE);
      decodedVoice = await decodeCtx.decodeAudioData(wavArrayBuf.slice(0));
    } catch (err) {
      console.warn('[VIDEO-AUDIO] Failed to decode voiceover WAV:', err);
      decodedVoice = null;
    }
  }

  const voiceStartOffsetSec = 0.4;
  const outroSec = params.outroDurationSec ?? 0;
  const voiceDurationSec = decodedVoice ? decodedVoice.duration : 0;
  const computedDurationSec = decodedVoice
    ? Math.max(
        params.requestedDurationSec || 10.5,
        Math.min(18, Math.ceil((voiceStartOffsetSec + decodedVoice.duration + Math.max(1.8, outroSec + 0.4)) * 10) / 10)
      )
    : Math.max(9.5, Math.min(16, params.requestedDurationSec || 10.5));

  const finalDurationSec =
    typeof params.exactDurationSec === 'number' && params.exactDurationSec > 2
      ? params.exactDurationSec
      : computedDurationSec;

  const totalFrames = Math.ceil(SAMPLE_RATE * finalDurationSec);
  const offline = new OfflineCtx(CHANNELS, totalFrames, SAMPLE_RATE);

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -9;
  compressor.knee.value = 14;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.18;

  const masterGain = offline.createGain();
  masterGain.gain.setValueAtTime(0.0001, 0);
  masterGain.gain.linearRampToValueAtTime(0.95, 0.25);
  masterGain.gain.setValueAtTime(0.95, Math.max(0.3, finalDurationSec - 0.7));
  masterGain.gain.linearRampToValueAtTime(0.0001, finalDurationSec);

  compressor.connect(masterGain);
  masterGain.connect(offline.destination);

  const musicBaseGain = offline.createGain();
  musicBaseGain.gain.value = decodedVoice ? 0.38 : 0.62;
  const musicDuckGain = offline.createGain();
  musicDuckGain.gain.value = 1.0;

  musicBaseGain.connect(musicDuckGain);
  musicDuckGain.connect(compressor);

  renderMusicMoodIntoGraph(offline, musicBaseGain, finalDurationSec, params.musicMood);

  let autoDucked = false;
  if (decodedVoice) {
    applyAutoDuckingEnvelope(decodedVoice, voiceStartOffsetSec, finalDurationSec, musicDuckGain);
    autoDucked = true;

    const voiceSource = offline.createBufferSource();
    voiceSource.buffer = decodedVoice;

    const voiceHighPass = offline.createBiquadFilter();
    voiceHighPass.type = 'highpass';
    voiceHighPass.frequency.value = 85;

    const voicePresence = offline.createBiquadFilter();
    voicePresence.type = 'peaking';
    voicePresence.frequency.value = 3100;
    voicePresence.Q.value = 0.9;
    voicePresence.gain.value = 2.4;

    const voiceGain = offline.createGain();
    voiceGain.gain.value = 1.15;

    voiceSource.connect(voiceHighPass);
    voiceHighPass.connect(voicePresence);
    voicePresence.connect(voiceGain);
    voiceGain.connect(compressor);
    voiceSource.start(voiceStartOffsetSec);
  }

  const rendered = await offline.startRendering();
  return {
    audioBuffer: rendered,
    finalDurationSec,
    voiceDurationSec,
    hasVoiceover: Boolean(decodedVoice),
    autoDucked,
  };
}

// ============================================================================
// Step 3: Smooth 30fps Cinematic Motion Canvas Compositor (Ken Burns + Crossfades)
// ============================================================================
interface SceneTimelineSlice {
  index: number;
  scene: CommercialScenePlan;
  frame: AnalyzedProductFrame;
  startSec: number;
  endSec: number;
  durationSec: number;
}

function buildSceneTimeline(
  scenes: CommercialScenePlan[],
  frames: AnalyzedProductFrame[],
  totalDurationSec: number
): SceneTimelineSlice[] {
  const totalPlanSec = Math.max(
    1,
    scenes.reduce((sum, s) => sum + Math.max(2, Number(s.durationSec) || 4), 0)
  );
  const scaleFactor = totalDurationSec / totalPlanSec;

  const slices: SceneTimelineSlice[] = [];
  let cursor = 0;

  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(2, Number(scenes[i].durationSec) || 4) * scaleFactor;
    const end = i === scenes.length - 1 ? totalDurationSec : cursor + dur;
    // Pair scenes across available product images cleanly (last CTA returns to Hero image if >=2 images or cycles)
    const frameIndex =
      i === scenes.length - 1 && frames.length >= 4
        ? 0
        : i % frames.length;
    slices.push({
      index: i,
      scene: scenes[i],
      frame: frames[frameIndex],
      startSec: cursor,
      endSec: end,
      durationSec: Math.max(0.5, end - cursor),
    });
    cursor = end;
  }

  return slices;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  zoom: number,
  panXRatio: number,
  panYRatio: number
) {
  const iw = Math.max(1, img.naturalWidth);
  const ih = Math.max(1, img.naturalHeight);
  const imgRatio = iw / ih;
  const boxRatio = boxW / boxH;

  let baseW: number;
  let baseH: number;
  if (imgRatio > boxRatio) {
    baseH = boxH;
    baseW = baseH * imgRatio;
  } else {
    baseW = boxW;
    baseH = baseW / imgRatio;
  }

  const drawW = baseW * zoom;
  const drawH = baseH * zoom;
  const maxShiftX = Math.max(0, (drawW - boxW) * 0.5);
  const maxShiftY = Math.max(0, (drawH - boxH) * 0.5);

  const drawX = boxX + (boxW - drawW) * 0.5 + panXRatio * maxShiftX;
  const drawY = boxY + (boxH - drawH) * 0.5 + panYRatio * maxShiftY;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  zoom: number,
  panX: number,
  panY: number
) {
  const iw = Math.max(1, img.naturalWidth);
  const ih = Math.max(1, img.naturalHeight);
  const scale = Math.min(boxW / iw, boxH / ih) * zoom;
  const drawW = iw * scale;
  const drawH = ih * scale;
  const drawX = boxX + (boxW - drawW) * 0.5 + panX;
  const drawY = boxY + (boxH - drawH) * 0.5 + panY;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function getKenBurnsTransform(
  motion: CommercialScenePlan['cameraMotion'],
  progress: number,
  sceneIdx: number
): { zoom: number; panX: number; panY: number; bgParallaxX: number; bgParallaxY: number } {
  const eased = easeInOutSine(progress);
  const dir = sceneIdx % 2 === 0 ? 1 : -1;

  // Every scene applies a smooth slow zoom-in combined with subtle multi-layer parallax
  switch (motion) {
    case 'smooth_pan_right':
      return {
        zoom: 1.04 + eased * 0.12,
        panX: (eased - 0.5) * 0.55 * dir,
        panY: Math.sin(eased * Math.PI) * 0.14,
        bgParallaxX: (0.5 - eased) * 0.22 * dir,
        bgParallaxY: -Math.sin(eased * Math.PI) * 0.08,
      };
    case 'macro_reveal':
      return {
        zoom: 1.08 + eased * 0.14,
        panX: (0.5 - eased) * 0.36 * dir,
        panY: (eased - 0.5) * 0.24,
        bgParallaxX: (eased - 0.5) * 0.18 * dir,
        bgParallaxY: (0.5 - eased) * 0.12,
      };
    case 'gentle_orbit':
      return {
        zoom: 1.03 + eased * 0.12,
        panX: Math.sin(eased * Math.PI) * 0.38 * dir,
        panY: (0.5 - eased) * 0.18,
        bgParallaxX: -Math.sin(eased * Math.PI) * 0.16 * dir,
        bgParallaxY: (eased - 0.5) * 0.1,
      };
    case 'slow_zoom_in':
    default:
      return {
        zoom: 1.03 + eased * 0.14,
        panX: (eased - 0.5) * 0.32 * dir,
        panY: (0.5 - eased) * 0.2,
        bgParallaxX: (0.5 - eased) * 0.15 * dir,
        bgParallaxY: (eased - 0.5) * 0.09,
      };
  }
}

function renderSceneVisualLayer(
  ctx: CanvasRenderingContext2D,
  slice: SceneTimelineSlice,
  width: number,
  height: number,
  globalTimeSec: number,
  visualTheme: CommercialVisualTheme,
  alpha: number
) {
  if (alpha <= 0.005) return;

  const isLandscape = width > height;
  const localT = clamp(globalTimeSec - slice.startSec, 0, slice.durationSec);
  const progress = clamp(localT / Math.max(0.01, slice.durationSec), 0, 1);
  const { zoom, panX, panY, bgParallaxX, bgParallaxY } = getKenBurnsTransform(
    slice.scene.cameraMotion,
    progress,
    slice.index
  );
  const { img, isBrightStudioBg, accentRgb } = slice.frame;
  const [ar, ag, ab] = accentRgb;

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Distraction-Free Soft Commercial Studio Cyclorama Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  if (visualTheme === 'lifestyle_home') {
    bgGrad.addColorStop(0, '#FAF6F0');
    bgGrad.addColorStop(0.58, '#EFE7DC');
    bgGrad.addColorStop(1, '#261F18');
  } else if (visualTheme === 'minimalist_studio') {
    bgGrad.addColorStop(0, '#F8FAFC');
    bgGrad.addColorStop(0.6, '#E8EEF5');
    bgGrad.addColorStop(1, '#1E293B');
  } else {
    bgGrad.addColorStop(0, '#0A101D');
    bgGrad.addColorStop(0.55, '#121B2E');
    bgGrad.addColorStop(1, '#060A12');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle background depth layer moving at opposing parallax rate
  ctx.save();
  ctx.globalAlpha = clamp(alpha * (visualTheme === 'tech_modern' ? 0.2 : 0.1), 0, 1);
  ctx.filter = 'blur(42px) saturate(1.1)';
  drawCoverImage(
    ctx,
    img,
    -48,
    -48,
    width + 96,
    height + 96,
    1.08 + progress * 0.04,
    bgParallaxX,
    bgParallaxY
  );
  ctx.restore();

  // Soft overhead studio key-light with gentle parallax drift
  ctx.save();
  const orbX = width * (0.5 + bgParallaxX * 0.45);
  const orbY = height * (0.34 + bgParallaxY * 0.35);
  const orbGrad = ctx.createRadialGradient(orbX, orbY, 20, orbX, orbY, Math.max(width, height) * 0.62);
  if (visualTheme === 'tech_modern') {
    orbGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.22)`);
    orbGrad.addColorStop(0.55, 'rgba(148, 163, 184, 0.09)');
    orbGrad.addColorStop(1, 'rgba(6, 10, 18, 0)');
  } else {
    orbGrad.addColorStop(0, 'rgba(255, 255, 255, 0.78)');
    orbGrad.addColorStop(0.58, `rgba(${ar}, ${ag}, ${ab}, 0.07)`);
    orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  }
  ctx.fillStyle = orbGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 2. Hero Product Presentation (Slow Zoom-In + Subtle Foreground Parallax)
  if (!isBrightStudioBg) {
    // Full-bleed product photography with continuous slow zoom-in + parallax
    ctx.save();
    drawCoverImage(ctx, img, 0, 0, width, height, zoom, panX, panY);
    ctx.restore();
  } else {
    // Clean studio cutout photo -> floating on a soft distraction-free studio stage with parallax
    const stageTop = isLandscape ? 72 : 132;
    const stageBottom = height - (isLandscape ? 190 : 350);
    const stageH = Math.max(260, stageBottom - stageTop);
    const stageW = isLandscape ? Math.round(width * 0.54) : width - 68;
    const baseStageX = isLandscape ? width - stageW - 56 : (width - stageW) / 2;
    const stageX = baseStageX + panX * 18;
    const stageY = stageTop + panY * 12;

    const floatY = Math.sin(globalTimeSec * 1.4 + slice.index) * 5;
    const cardRadius = isLandscape ? 28 : 32;

    // Soft studio floor contact shadow shifting subtly with parallax
    ctx.save();
    const shadowX = stageX + stageW / 2 - panX * 10;
    const shadowY = stageY + stageH + 16 + floatY * 0.3;
    const shadowGrad = ctx.createRadialGradient(
      shadowX,
      shadowY,
      10,
      shadowX,
      shadowY,
      stageW * 0.48
    );
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
    shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(stageX - 40, shadowY - 26, stageW + 80, 52);
    ctx.restore();

    // Clean studio showcase frame with continuous slow zoom-in inside
    ctx.save();
    drawRoundedRect(ctx, stageX, stageY + floatY, stageW, stageH, cardRadius);
    ctx.fillStyle = visualTheme === 'tech_modern' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.98)';
    ctx.fill();

    ctx.save();
    drawRoundedRect(ctx, stageX, stageY + floatY, stageW, stageH, cardRadius);
    ctx.clip();

    const innerPad = isLandscape ? 22 : 24;
    drawContainImage(
      ctx,
      img,
      stageX + innerPad,
      stageY + floatY + innerPad,
      stageW - innerPad * 2,
      stageH - innerPad * 2,
      zoom,
      panX * 22,
      panY * 15
    );

    // Soft studio rim-light sheen sweep across product texture
    const sheenX = stageX + stageW * (-0.3 + progress * 1.6);
    const sheenGrad = ctx.createLinearGradient(sheenX - 90, stageY, sheenX + 90, stageY + stageH);
    sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sheenGrad.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(stageX, stageY + floatY, stageW, stageH);
    ctx.restore();

    drawRoundedRect(ctx, stageX, stageY + floatY, stageW, stageH, cardRadius);
    ctx.strokeStyle =
      visualTheme === 'tech_modern'
        ? `rgba(${ar}, ${ag}, ${ab}, 0.45)`
        : 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function renderMotionCommercialFrame(
  ctx: CanvasRenderingContext2D,
  timeline: SceneTimelineSlice[],
  width: number,
  height: number,
  t: number,
  totalDuration: number,
  visualTheme: CommercialVisualTheme,
  product: Product,
  priceBannerText: string,
  includeWebLinkOverlay: boolean
) {
  const isLandscape = width > height;

  // Base fill
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, width, height);

  // Determine active scene slice
  let activeSliceIdx = timeline.length - 1;
  for (let i = 0; i < timeline.length; i++) {
    if (t < timeline[i].endSec || i === timeline.length - 1) {
      activeSliceIdx = i;
      break;
    }
  }
  const activeSlice = timeline[activeSliceIdx];
  const localTime = clamp(t - activeSlice.startSec, 0, activeSlice.durationSec);
  const sceneProgress = clamp(localTime / Math.max(0.01, activeSlice.durationSec), 0, 1);

  // Smooth Crossfade between previous scene and current scene during initial CROSSFADE_SEC
  if (activeSliceIdx > 0 && localTime < CROSSFADE_SEC) {
    const prevSlice = timeline[activeSliceIdx - 1];
    const mix = easeInOutCubic(localTime / CROSSFADE_SEC);
    renderSceneVisualLayer(ctx, prevSlice, width, height, t, visualTheme, 1 - mix);
    renderSceneVisualLayer(ctx, activeSlice, width, height, t, visualTheme, mix);
  } else {
    renderSceneVisualLayer(ctx, activeSlice, width, height, t, visualTheme, 1);
  }

  // Readability Top & Bottom Scrims
  const topScrimH = isLandscape ? 115 : 175;
  const topScrim = ctx.createLinearGradient(0, 0, 0, topScrimH);
  topScrim.addColorStop(0, 'rgba(6, 10, 18, 0.72)');
  topScrim.addColorStop(1, 'rgba(6, 10, 18, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, width, topScrimH);

  const bottomScrimH = isLandscape ? 260 : 450;
  const bottomScrim = ctx.createLinearGradient(0, height - bottomScrimH, 0, height);
  bottomScrim.addColorStop(0, 'rgba(6, 10, 18, 0)');
  bottomScrim.addColorStop(0.32, 'rgba(6, 10, 18, 0.68)');
  bottomScrim.addColorStop(1, 'rgba(6, 10, 18, 0.94)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, height - bottomScrimH, width, bottomScrimH);

  const accentHex =
    visualTheme === 'lifestyle_home'
      ? '#F59E0B'
      : visualTheme === 'tech_modern'
      ? '#38BDF8'
      : '#60A5FA';

  const padX = isLandscape ? 54 : 40;
  const topBrandY = isLandscape ? 38 : 52;

  // Top Minimal Header Bar
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${isLandscape ? 16 : 18}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('DBUY STORE', padX, topBrandY);

  const brandW = ctx.measureText('DBUY STORE').width;
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.arc(padX + brandW + 12, topBrandY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  const catLabel = sanitizeCommercialCopy(product.category || 'FEATURED').toUpperCase().slice(0, 26);
  ctx.textAlign = 'right';
  ctx.font = `600 ${isLandscape ? 13 : 14}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(241, 245, 249, 0.88)';
  ctx.fillText(catLabel, width - padX, topBrandY);
  ctx.restore();

  // Animated Editorial Copy + Synced English Subtitles
  const scene = activeSlice.scene;
  const enterAlpha = easeOutCubic(clamp(localTime / 0.38, 0, 1));
  const exitAlpha =
    activeSliceIdx < timeline.length - 1
      ? 1 - easeOutCubic(clamp((localTime - (activeSlice.durationSec - 0.25)) / 0.25, 0, 1))
      : 1;
  const textAlpha = Math.min(enterAlpha, exitAlpha);
  const slideY = (1 - enterAlpha) * 16;

  ctx.save();
  ctx.globalAlpha = clamp(textAlpha, 0, 1);

  const contentW = isLandscape ? Math.round(width * 0.44) : width - padX * 2;
  const baseBottomY = height - (isLandscape ? 74 : 108);

  // Closing Price Badge (rendered cleanly on final scene)
  const cleanPriceBanner = sanitizeCommercialCopy(priceBannerText);
  const showPriceBadge = scene.role === 'cta' && Boolean(cleanPriceBanner);

  let priceBlockH = 0;
  if (showPriceBadge) {
    priceBlockH = isLandscape ? 60 : 66;
    const badgeY = baseBottomY - (isLandscape ? 48 : 56) + slideY;
    ctx.font = `800 ${isLandscape ? 23 : 26}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const priceMetrics = ctx.measureText(cleanPriceBanner);
    const hasOrigDiscount =
      Number(product.origPrice) > Number(product.price) && Number(product.price) > 0;
    const origText = hasOrigDiscount ? `$${Number(product.origPrice).toFixed(2)}` : '';
    const origW = origText ? ctx.measureText(origText).width + 16 : 0;

    const ctaPillText = 'SHOP NOW';
    ctx.font = `800 ${isLandscape ? 11 : 12}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const ctaPillW = ctx.measureText(ctaPillText).width + 22;

    const badgeW = priceMetrics.width + origW + ctaPillW + 52;
    const badgeH = isLandscape ? 46 : 52;
    const badgeX = padX;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fill();

    ctx.font = `800 ${isLandscape ? 23 : 26}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const px = badgeX + 18;
    ctx.fillText(cleanPriceBanner, px, badgeY + badgeH / 2 + 1);

    let nextX = px + priceMetrics.width + 12;
    if (origText) {
      ctx.font = `600 ${isLandscape ? 15 : 17}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = '#64748B';
      ctx.fillText(origText, nextX, badgeY + badgeH / 2 + 1);
      const ow = ctx.measureText(origText).width;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nextX - 2, badgeY + badgeH / 2 + 1);
      ctx.lineTo(nextX + ow + 2, badgeY + badgeH / 2 + 1);
      ctx.stroke();
      nextX += ow + 14;
    }

    // Accent SHOP NOW tag inside price badge
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, nextX, badgeY + 10, ctaPillW, badgeH - 20, 8);
    ctx.fill();
    ctx.fillStyle = accentHex;
    ctx.font = `800 ${isLandscape ? 11 : 12}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(ctaPillText, nextX + ctaPillW / 2, badgeY + badgeH / 2 + 0.5);
  }

  // Synced English Subtitle Pill (voiceoverLine)
  const voiceCaption = sanitizeCommercialCopy(scene.voiceoverLine || '');
  const captionFontSize = isLandscape ? 15 : 17;
  ctx.font = `600 ${captionFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const captionLines = voiceCaption ? wrapTextLines(ctx, voiceCaption, contentW - 28, 2) : [];
  const captionBlockH = captionLines.length > 0 ? captionLines.length * (captionFontSize * 1.35) + 22 : 0;

  // Subheadline + Headline metrics
  const subFontSize = isLandscape ? 18 : 21;
  ctx.font = `500 ${subFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const subLines = wrapTextLines(ctx, sanitizeCommercialCopy(scene.subheadline || ''), contentW, 2);
  const subBlockH = subLines.length * (subFontSize * 1.32);

  const headFontSize = isLandscape ? 32 : 38;
  ctx.font = `800 ${headFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const headLines = wrapTextLines(
    ctx,
    sanitizeCommercialCopy(scene.headline || product.title),
    contentW,
    2
  );
  const headBlockH = headLines.length * (headFontSize * 1.15);

  let yCursor =
    baseBottomY -
    priceBlockH -
    (captionBlockH > 0 ? captionBlockH + 12 : 0) -
    subBlockH -
    headBlockH -
    10 +
    slideY;

  // Clean distraction-free headline + feature subheadline (no cluttered eyebrow pills)
  ctx.font = `800 ${headFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  for (const line of headLines) {
    ctx.fillText(line, padX, yCursor);
    yCursor += headFontSize * 1.15;
  }

  yCursor += 6;
  // Subheadline
  ctx.font = `500 ${subFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.92)';
  for (const line of subLines) {
    ctx.fillText(line, padX, yCursor);
    yCursor += subFontSize * 1.32;
  }

  // Synced English Subtitle Caption Pill
  if (captionLines.length > 0) {
    yCursor += 10;
    ctx.font = `600 ${captionFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const maxLineW = Math.max(...captionLines.map((l) => ctx.measureText(l).width));
    const pillW = Math.min(contentW, maxLineW + 28);
    const pillH = captionLines.length * (captionFontSize * 1.35) + 14;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    drawRoundedRect(ctx, padX, yCursor, pillW, pillH, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let capY = yCursor + 7;
    for (const line of captionLines) {
      ctx.fillText(line, padX + 14, capY);
      capY += captionFontSize * 1.35;
    }
  }

  ctx.restore();

  // Bottom Web URL Brand Footer & 4-Scene Progress Rail
  const footerY = height - (isLandscape ? 40 : 58);
  if (includeWebLinkOverlay) {
    ctx.save();
    ctx.textAlign = isLandscape ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${isLandscape ? 16 : 18}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillText('www.dbuystore.com', isLandscape ? width - padX : width / 2, footerY);
    ctx.restore();
  }

  // 4-segment commercial progress rail
  const railY = height - (isLandscape ? 16 : 24);
  const railTotalW = width - padX * 2;
  const gap = 8;
  const segCount = timeline.length;
  const segW = (railTotalW - gap * (segCount - 1)) / segCount;

  for (let i = 0; i < segCount; i++) {
    const sx = padX + i * (segW + gap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    drawRoundedRect(ctx, sx, railY, segW, 4, 2);
    ctx.fill();

    const fillRatio = i < activeSliceIdx ? 1 : i === activeSliceIdx ? sceneProgress : 0;
    if (fillRatio > 0) {
      ctx.fillStyle = accentHex;
      drawRoundedRect(ctx, sx, railY, Math.max(4, segW * fillRatio), 4, 2);
      ctx.fill();
    }
  }

  const fadeInAlpha = clamp(t / 0.35, 0, 1);
  if (fadeInAlpha < 1) {
    ctx.fillStyle = `rgba(6,10,18,${1 - fadeInAlpha})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// ============================================================================
// WebCodecs H.264 + AAC MP4 Encoder (with MediaRecorder Fallback)
// ============================================================================
async function encodeMotionVideoWithWebCodecsMp4(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  totalDurationSec: number,
  audioBuffer: AudioBuffer,
  drawFrameAt: (timeSec: number) => void,
  onProgress?: (pct: number, detail: string) => void
): Promise<Blob> {
  const VideoEncoderCtor = (window as any).VideoEncoder;
  const VideoFrameCtor = (window as any).VideoFrame;
  const AudioEncoderCtor = (window as any).AudioEncoder;
  const AudioDataCtor = (window as any).AudioData;

  if (!VideoEncoderCtor || !VideoFrameCtor) {
    throw new Error('WebCodecs VideoEncoder is not available.');
  }

  const videoCodecs = ['avc1.640028', 'avc1.4d0028', 'avc1.420028', 'avc1.42001f'];
  let chosenVideoCodec: string | null = null;
  for (const codec of videoCodecs) {
    try {
      const support = await VideoEncoderCtor.isConfigSupported({
        codec,
        width,
        height,
        bitrate: width > 1000 ? 5_200_000 : 4_400_000,
        framerate: FPS,
      });
      if (support?.supported) {
        chosenVideoCodec = codec;
        break;
      }
    } catch {}
  }
  if (!chosenVideoCodec) {
    throw new Error('No supported H.264 codec found for WebCodecs.');
  }

  let canEncodeAac = false;
  if (AudioEncoderCtor && AudioDataCtor) {
    try {
      const aacSupport = await AudioEncoderCtor.isConfigSupported({
        codec: 'mp4a.40.2',
        sampleRate: SAMPLE_RATE,
        numberOfChannels: CHANNELS,
        bitrate: 128_000,
      });
      canEncodeAac = Boolean(aacSupport?.supported);
    } catch {
      canEncodeAac = false;
    }
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    ...(canEncodeAac
      ? {
          audio: { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS },
        }
      : {}),
    fastStart: 'in-memory',
  });

  let videoError: Error | null = null;
  const videoEncoder = new VideoEncoderCtor({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err: any) => {
      videoError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: chosenVideoCodec,
    width,
    height,
    bitrate: width > 1000 ? 5_200_000 : 4_400_000,
    framerate: FPS,
    avc: { format: 'avc' },
  });

  const totalFrames = Math.ceil(totalDurationSec * FPS);
  const frameDurationUs = Math.round(1_000_000 / FPS);

  for (let i = 0; i < totalFrames; i++) {
    if (videoError) throw videoError;
    const t = i / FPS;
    drawFrameAt(t);

    const frame = new VideoFrameCtor(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();

    if (i % 10 === 0) {
      while (videoEncoder.encodeQueueSize > 12) {
        await new Promise((r) => setTimeout(r, 8));
      }
      const pct = Math.round(35 + (i / totalFrames) * 50);
      onProgress?.(pct, `Rendering motion frame ${i + 1} / ${totalFrames} (${width}×${height} @ ${FPS}fps)`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (videoError) throw videoError;

  if (canEncodeAac) {
    onProgress?.(88, 'Encoding studio audio & auto-ducked AAC track...');
    let audioError: Error | null = null;
    const audioEncoder = new AudioEncoderCtor({
      output: (chunk: any, meta: any) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err: any) => {
        audioError = err instanceof Error ? err : new Error(String(err));
      },
    });

    audioEncoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: SAMPLE_RATE,
      numberOfChannels: CHANNELS,
      bitrate: 128_000,
    });

    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
    const chunkFrames = 1024;
    const totalSamples = audioBuffer.length;

    for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
      if (audioError) throw audioError;
      const count = Math.min(chunkFrames, totalSamples - offset);
      const planar = new Float32Array(count * CHANNELS);
      planar.set(left.subarray(offset, offset + count), 0);
      planar.set(right.subarray(offset, offset + count), count);

      const audioData = new AudioDataCtor({
        format: 'f32-planar',
        sampleRate: SAMPLE_RATE,
        numberOfFrames: count,
        numberOfChannels: CHANNELS,
        timestamp: Math.round((offset / SAMPLE_RATE) * 1_000_000),
        data: planar,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }

    await audioEncoder.flush();
    audioEncoder.close();
    if (audioError) throw audioError;
  }

  onProgress?.(96, 'Finalizing H.264 / AAC Commercial MP4...');
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function encodeMotionVideoWithMediaRecorderFallback(
  canvas: HTMLCanvasElement,
  totalDurationSec: number,
  audioBuffer: AudioBuffer,
  drawFrameAt: (timeSec: number) => void,
  onProgress?: (pct: number, detail: string) => void
): Promise<Blob> {
  const stream = canvas.captureStream(FPS);
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext | null = null;

  try {
    if (AudioCtx) {
      audioCtx = new AudioCtx({ sampleRate: SAMPLE_RATE });
      const dest = audioCtx.createMediaStreamDestination();
      const src = audioCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(dest);
      dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      src.start();
    }
  } catch {}

  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  const chosenMime =
    mimeCandidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ||
    'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 4_200_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(
        new Blob(chunks, { type: chosenMime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm' })
      );
    };
  });

  recorder.start(250);

  const startMs = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsedSec = (performance.now() - startMs) / 1000;
      if (elapsedSec >= totalDurationSec) {
        drawFrameAt(totalDurationSec);
        resolve();
        return;
      }
      drawFrameAt(elapsedSec);
      const pct = Math.round(35 + (elapsedSec / totalDurationSec) * 58);
      onProgress?.(pct, `Recording motion commercial (${elapsedSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s)`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  recorder.stop();
  const blob = await stopped;
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
  return blob;
}

// ============================================================================
// Main Export — 100% Free-Tier Client Motion-Video Commercial Renderer
// ============================================================================
export async function generateTikTokPromoVideo(
  options: PromoVideoGeneratorOptions,
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<PromoVideoGenerationResult> {
  const aspectRatio: CommercialAspectRatio = options.aspectRatio === '16:9' ? '16:9' : '9:16';
  const visualTheme: CommercialVisualTheme =
    options.visualTheme === 'lifestyle_home' || options.visualTheme === 'tech_modern'
      ? options.visualTheme
      : 'minimalist_studio';
  const musicMood = normalizeMusicMood(options.musicMood, options.musicVibe);
  const { width, height } = getDimensionsForAspectRatio(aspectRatio);

  const scenes =
    options.scenes && options.scenes.length > 0
      ? options.scenes
      : buildProductBoundDefaultScenes(options.product, visualTheme);

  const candidateImages =
    options.selectedImages && options.selectedImages.length > 0
      ? options.selectedImages
      : [options.product.image, ...(options.product.images || [])].filter(Boolean);

  if (candidateImages.length === 0) {
    throw new Error('At least one product photo is required to render the motion commercial.');
  }

  onProgress?.({
    stage: 'visuals',
    progressPct: 16,
    message: 'Preparing Product Scene Visuals & Studio Lighting...',
    detail: `Loading ${Math.min(6, candidateImages.length)} high-res product photo(s) for Ken Burns motion`,
  });

  const analyzedFrames = await loadProductImagesForCanvas(candidateImages);
  if (analyzedFrames.length === 0) {
    throw new Error('Could not load the selected product images for Canvas rendering.');
  }

  onProgress?.({
    stage: 'audio',
    progressPct: 26,
    message: options.voiceoverAudioBase64
      ? 'Mixing English Voiceover & Auto-Ducked Beat (15–20% bed)...'
      : 'Synthesizing Studio Ambient Beat...',
    detail: `Mood: ${musicMood.replace('_', ' ')}`,
  });

  const plannedDuration =
    options.durationSec ||
    scenes.reduce((sum, s) => sum + Math.max(2.5, Number(s.durationSec) || 4), 0);

  const { audioBuffer, finalDurationSec, hasVoiceover, autoDucked } = await renderCommercialAudioMix({
    musicMood,
    requestedDurationSec: plannedDuration,
    voiceoverAudioBase64: options.voiceoverAudioBase64,
  });

  const timeline = buildSceneTimeline(scenes, analyzedFrames, finalDurationSec);

  const formattedDefaultPrice =
    Number(options.product.price) > 0
      ? `Only $${(Math.round(Number(options.product.price) * 100) / 100).toFixed(
          Number.isInteger(Number(options.product.price)) ? 0 : 2
        )}`
      : '';
  const priceBannerText = sanitizeCommercialCopy(options.priceBanner || formattedDefaultPrice);
  const includeWebLink = options.includeWebLinkOverlay !== false;

  onProgress?.({
    stage: 'rendering',
    progressPct: 32,
    message: `Rendering ${aspectRatio} Cinematic Motion Video (30fps)...`,
    detail: 'Ken Burns camera motion, smooth crossfades & synced English captions',
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Failed to initialize 2D rendering context.');
  }

  const drawFrameAt = (timeSec: number) => {
    renderMotionCommercialFrame(
      ctx,
      timeline,
      width,
      height,
      timeSec,
      finalDurationSec,
      visualTheme,
      options.product,
      priceBannerText,
      includeWebLink
    );
  };

  let blob: Blob;
  let encoderUsed: 'webcodecs-mp4' | 'mediarecorder-fallback' = 'webcodecs-mp4';

  try {
    blob = await encodeMotionVideoWithWebCodecsMp4(
      canvas,
      width,
      height,
      finalDurationSec,
      audioBuffer,
      drawFrameAt,
      (pct, detail) => {
        onProgress?.({
          stage: pct >= 86 ? 'encoding' : 'rendering',
          progressPct: pct,
          message:
            pct >= 86
              ? 'Encoding H.264 / AAC Commercial MP4...'
              : `Rendering ${aspectRatio} Motion Commercial...`,
          detail,
        });
      }
    );
  } catch (webCodecsErr) {
    console.warn('[VIDEO-ENCODER] WebCodecs unavailable, using MediaRecorder fallback:', webCodecsErr);
    encoderUsed = 'mediarecorder-fallback';
    blob = await encodeMotionVideoWithMediaRecorderFallback(
      canvas,
      finalDurationSec,
      audioBuffer,
      drawFrameAt,
      (pct, detail) => {
        onProgress?.({
          stage: 'rendering',
          progressPct: pct,
          message: `Recording ${aspectRatio} Motion Commercial...`,
          detail,
        });
      }
    );
  }

  const safeSlug =
    sanitizeCommercialCopy(options.product.title || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'commercial';

  const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
  const file = new File([blob], `dbuy-${safeSlug}-${aspectRatio.replace(':', 'x')}.${ext}`, {
    type: blob.type || 'video/mp4',
  });

  onProgress?.({
    stage: 'done',
    progressPct: 100,
    message: `Commercial Video Ready (${finalDurationSec.toFixed(1)}s ${aspectRatio})`,
    detail: `${(file.size / (1024 * 1024)).toFixed(2)} MB · ${hasVoiceover ? 'Voiceover + Auto-Ducked Beat' : 'Studio Music + Synced Captions'}`,
  });

  return {
    file,
    durationSec: Math.round(finalDurationSec * 10) / 10,
    width,
    height,
    aspectRatio,
    encoderUsed,
    hasVoiceover,
    autoDucked,
  };
}
