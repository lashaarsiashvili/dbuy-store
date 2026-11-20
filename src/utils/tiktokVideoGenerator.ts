import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Product } from '../types';
import {
  buildCombinedActionVideoPrompt,
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceAccent,
  CommercialVoiceoverResult,
  CommercialVoiceTone,
  ENFORCED_NEGATIVE_PROMPT,
  MANDATORY_STYLE_MODIFIERS,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
} from './videoPromptOptimizer';

export {
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  ENFORCED_NEGATIVE_PROMPT,
  MANDATORY_STYLE_MODIFIERS,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
};

export type {
  CommercialAspectRatio,
  CommercialMusicMood,
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
    | 'video_ai'
    | 'extracting'
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

// ============================================================================
// Stage 1 & 2 Client Helper — Server-Side Product-Bound Script & Scene Planner
// ============================================================================
export async function planCommercialVideoAd(params: {
  product: Product;
  visualTheme: CommercialVisualTheme;
  aspectRatio: CommercialAspectRatio;
  voiceTone: CommercialVoiceTone;
  musicMood: CommercialMusicMood;
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
// Stage 3 Client Helper — Server-Side Gemini Studio English Voiceover (TTS)
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
      script: sanitizeCommercialCopy(params.script),
      voiceTone: params.voiceTone,
      accent: params.accent,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.voiceover?.audioBase64) {
    throw new Error(
      data?.error || `Failed to synthesize English voiceover (HTTP ${response.status}).`
    );
  }
  return data.voiceover as CommercialVoiceoverResult;
}

async function safeParseJsonResponse(
  resp: Response,
  fallbackLabel: string
): Promise<any> {
  const rawText = await resp.text();
  if (!rawText) {
    return {
      success: false,
      error: `${fallbackLabel} returned an empty response (HTTP ${resp.status}).`,
    };
  }
  try {
    return JSON.parse(rawText);
  } catch {
    const snippet = rawText.replace(/\s+/g, ' ').slice(0, 140);
    return {
      success: false,
      error: `${fallbackLabel} returned a non-JSON payload (HTTP ${resp.status}): ${snippet}`,
    };
  }
}

async function fetchActionVideoClipBlob(data: any): Promise<GeneratedActionVideoClip> {
  const mimeType = String(data?.mimeType || 'video/mp4');
  if (typeof data?.videoUrl === 'string' && data.videoUrl) {
    const videoResp = await fetch(data.videoUrl);
    if (!videoResp.ok) {
      const errJson = await videoResp.json().catch(() => ({}));
      throw new Error(
        errJson?.error || `Failed to download rendered AI video clip (HTTP ${videoResp.status}).`
      );
    }
    const contentType = (videoResp.headers.get('content-type') || mimeType).split(';')[0].trim();
    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      throw new Error('Video download endpoint returned an unexpected non-video response.');
    }
    const blob = await videoResp.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded AI video clip is empty.');
    }
    return {
      blob: blob.type ? blob : new Blob([blob], { type: mimeType }),
      mimeType: blob.type || mimeType,
      videoUrl: data.videoUrl,
    };
  }

  if (typeof data?.videoBase64 === 'string' && data.videoBase64) {
    const buf = base64ToArrayBuffer(data.videoBase64);
    return {
      blob: new Blob([buf], { type: mimeType }),
      mimeType,
    };
  }

  throw new Error('Completed AI video job did not include a downloadable video stream.');
}

// ============================================================================
// Stage 2B Client Helper — Reference-Guided Live-Action AI Video (Omni Flash)
// ============================================================================
export async function generateReferenceGuidedActionVideo(
  params: {
    product: Product;
    referenceImages: string[];
    scenes: CommercialScenePlan[];
    combinedActionPrompt?: string;
    visualTheme: CommercialVisualTheme;
    aspectRatio: CommercialAspectRatio;
  },
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<GeneratedActionVideoClip> {
  onProgress?.({
    stage: 'video_ai',
    progressPct: 16,
    message: 'Generating Practical In-Use Action Video (AI)...',
    detail: `Sending ${Math.min(4, params.referenceImages.length)} product reference image(s) to Gemini Omni Video`,
  });

  const startResp = await fetch('/api/video-ad/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: {
        id: params.product.id,
        title: params.product.title,
        description: params.product.description || '',
        features: params.product.features || [],
        category: params.product.category,
      },
      referenceImages: params.referenceImages.slice(0, 4),
      scenes: params.scenes,
      combinedActionPrompt: params.combinedActionPrompt,
      visualTheme: params.visualTheme,
      aspectRatio: params.aspectRatio,
    }),
  });

  const startData = await safeParseJsonResponse(startResp, 'Start AI video generation');
  if (!startResp.ok || !startData?.success) {
    throw new Error(
      startData?.error || `Failed to start reference-guided video generation (HTTP ${startResp.status}).`
    );
  }

  if (startData.status === 'completed' && (startData.videoUrl || startData.videoBase64)) {
    return fetchActionVideoClipBlob(startData);
  }

  const interactionId = String(startData.interactionId || '').trim();
  if (!interactionId) {
    throw new Error('Video generation did not return a valid interaction ID.');
  }

  const maxAttempts = 80; // ~4.5 minutes max polling
  let transientNetworkErrors = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 3200));

    let pollResp: Response;
    try {
      pollResp = await fetch(
        `/api/video-ad/generate-video?id=${encodeURIComponent(interactionId)}`
      );
      transientNetworkErrors = 0;
    } catch (netErr: any) {
      transientNetworkErrors++;
      if (transientNetworkErrors <= 2) continue;
      throw new Error(netErr?.message || 'Network error while polling AI video generation.');
    }

    const pollData = await safeParseJsonResponse(pollResp, 'Poll AI video generation');

    if (!pollResp.ok || !pollData?.success) {
      throw new Error(
        pollData?.error || `AI video generation failed (HTTP ${pollResp.status}).`
      );
    }

    if (pollData.status === 'completed' && (pollData.videoUrl || pollData.videoBase64)) {
      onProgress?.({
        stage: 'video_ai',
        progressPct: 45,
        message: 'Downloading Live-Action Product Video...',
        detail: 'Preparing voiceover audio mix & commercial overlays...',
      });
      const clip = await fetchActionVideoClipBlob(pollData);
      onProgress?.({
        stage: 'video_ai',
        progressPct: 48,
        message: 'Live-Action Product Video Ready!',
        detail: 'Preparing voiceover audio mix & commercial overlays...',
      });
      return clip;
    }

    const simulatedPct = Math.min(44, Math.round(18 + (attempt / maxAttempts) * 26));
    onProgress?.({
      stage: 'video_ai',
      progressPct: simulatedPct,
      message: 'Rendering Hands-On Product Action Video...',
      detail: `Rendering real-world usage scenes for ${sanitizeCommercialCopy(params.product.title).slice(0, 40)} (${Math.round((attempt + 1) * 3.2)}s elapsed)`,
    });
  }

  throw new Error('AI video generation timed out. Please try again.');
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
  const firstFeature = sanitizeCommercialCopy(
    product.features?.[0] || product.description?.split(/[.!?]/)[0] || cleanTitle
  ).slice(0, 80);
  const secondFeature = sanitizeCommercialCopy(
    product.features?.[1] || `Designed for effortless everyday use`
  ).slice(0, 80);

  return [
    {
      sceneNumber: 1,
      role: 'hook',
      roleLabel: 'Problem / Everyday Context',
      durationSec: 3.5,
      headline: cleanTitle.split(/\s+/).slice(0, 4).join(' '),
      subheadline: firstFeature,
      voiceoverLine: `Meet the ${cleanTitle}.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Relatable modern desk problem where ${cleanTitle} is needed`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'slow_zoom_in',
    },
    {
      sceneNumber: 2,
      role: 'showcase',
      roleLabel: 'Hands-On Practical Action',
      durationSec: 4.5,
      headline: 'Effortless In-Use Control',
      subheadline: secondFeature,
      voiceoverLine: `Built with ${firstFeature.charAt(0).toLowerCase()}${firstFeature.slice(1)}.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Natural human hands smoothly using ${cleanTitle} in a modern well-lit workspace`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'smooth_pan_right',
    },
    {
      sceneNumber: 3,
      role: 'benefit',
      roleLabel: 'Key Feature in Action',
      durationSec: 4,
      headline: 'Built For Daily Workflow',
      subheadline: firstFeature,
      voiceoverLine: `Enjoy ${secondFeature.charAt(0).toLowerCase()}${secondFeature.slice(1)}.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Hands-on practical demonstration of ${cleanTitle} core feature in real time`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'macro_reveal',
    },
    {
      sceneNumber: 4,
      role: 'cta',
      roleLabel: 'Everyday Setting CTA',
      durationSec: 3,
      headline: 'Available at DBUY Store',
      subheadline: `Get the ${cleanTitle.split(/\s+/).slice(0, 3).join(' ')} today`,
      voiceoverLine: `Shop the ${cleanTitle} today at DBUY Store.`,
      visualPrompt: optimizeCommercialVisualPrompt(
        `Clean closing shot of ${cleanTitle} in its ideal everyday setup`,
        visualTheme,
        cleanTitle
      ),
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
      cameraMotion: 'gentle_orbit',
    },
  ];
}

// ============================================================================
// Stage 3: Studio Music Synthesis + RMS Auto-Ducking Mixer (15-20% bed)
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

async function renderCommercialAudioMix(params: {
  musicMood: CommercialMusicMood;
  requestedDurationSec: number;
  voiceoverAudioBase64?: string;
}): Promise<{
  audioBuffer: AudioBuffer;
  finalDurationSec: number;
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

  const voiceStartOffsetSec = 0.45;
  const finalDurationSec = decodedVoice
    ? Math.max(15, Math.min(24, Math.ceil((voiceStartOffsetSec + decodedVoice.duration + 1.25) * 10) / 10))
    : Math.max(15, Math.min(22, params.requestedDurationSec || 15));

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
    hasVoiceover: Boolean(decodedVoice),
    autoDucked,
  };
}

// ============================================================================
// Offscreen HTMLVideoElement Loader & Deterministic Frame Seeker
// ============================================================================
async function loadVideoElementFromBlob(
  blob: Blob
): Promise<{ video: HTMLVideoElement; objectUrl: string; durationSec: number }> {
  const objectUrl = URL.createObjectURL(blob);

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Timed out loading generated AI action video.')),
      20000
    );
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to decode generated AI action video in browser.'));
    };
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    video.load();
  });

  const durationSec =
    Number.isFinite(video.duration) && video.duration > 0.5 ? video.duration : 15;
  return { video, objectUrl, durationSec };
}

async function seekVideoToTime(video: HTMLVideoElement, targetTimeSec: number): Promise<void> {
  const clamped = Math.max(0, Math.min(Math.max(0.05, (video.duration || 15) - 0.04), targetTimeSec));
  if (Math.abs(video.currentTime - clamped) < 0.008 && video.readyState >= 2) {
    return;
  }
  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, 450);
    video.addEventListener('seeked', done, { once: true });
    video.currentTime = clamped;
  });
}

// ============================================================================
// Live-Action Video Compositor (Overlays Crisp Branding Over Real In-Use Video)
// ============================================================================
function renderLiveActionCommercialFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  t: number,
  totalDuration: number,
  scenes: CommercialScenePlan[],
  visualTheme: CommercialVisualTheme,
  product: Product,
  priceBannerText: string,
  includeWebLinkOverlay: boolean
) {
  const isLandscape = width > height;

  // 1. Draw full-bleed live-action AI video frame using cover-fit
  const vw = Math.max(1, video.videoWidth || width);
  const vh = Math.max(1, video.videoHeight || height);
  const videoRatio = vw / vh;
  const canvasRatio = width / height;

  let drawW: number;
  let drawH: number;
  if (videoRatio > canvasRatio) {
    drawH = height;
    drawW = drawH * videoRatio;
  } else {
    drawW = width;
    drawH = drawW / videoRatio;
  }
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;

  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, drawX, drawY, drawW, drawH);

  // 2. Clean top & bottom readability scrims (leaves center hands-on action 100% clear)
  const topScrim = ctx.createLinearGradient(0, 0, 0, isLandscape ? 120 : 180);
  topScrim.addColorStop(0, 'rgba(6, 10, 18, 0.72)');
  topScrim.addColorStop(1, 'rgba(6, 10, 18, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, width, isLandscape ? 120 : 180);

  const bottomScrimH = isLandscape ? 235 : 370;
  const bottomScrim = ctx.createLinearGradient(0, height - bottomScrimH, 0, height);
  bottomScrim.addColorStop(0, 'rgba(6, 10, 18, 0)');
  bottomScrim.addColorStop(0.35, 'rgba(6, 10, 18, 0.62)');
  bottomScrim.addColorStop(1, 'rgba(6, 10, 18, 0.88)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, height - bottomScrimH, width, bottomScrimH);

  // Determine active scene
  const totalPlanSec = Math.max(
    1,
    scenes.reduce((sum, s) => sum + Math.max(2, s.durationSec), 0)
  );
  const scaleFactor = totalDuration / totalPlanSec;

  let cursor = 0;
  let activeIdx = scenes.length - 1;
  let sceneStart = 0;
  let sceneDur = totalDuration;

  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(2, scenes[i].durationSec) * scaleFactor;
    if (t < cursor + dur || i === scenes.length - 1) {
      activeIdx = i;
      sceneStart = cursor;
      sceneDur = dur;
      break;
    }
    cursor += dur;
  }

  const scene = scenes[activeIdx];
  const localTime = clamp(t - sceneStart, 0, sceneDur);
  const sceneProgress = clamp(localTime / Math.max(0.01, sceneDur), 0, 1);

  const enterAlpha = easeOutCubic(clamp(localTime / 0.38, 0, 1));
  const exitAlpha =
    activeIdx < scenes.length - 1
      ? 1 - easeOutCubic(clamp((localTime - (sceneDur - 0.25)) / 0.25, 0, 1))
      : 1;
  const textAlpha = Math.min(enterAlpha, exitAlpha);

  const accentHex =
    visualTheme === 'lifestyle_home'
      ? '#F59E0B'
      : visualTheme === 'tech_modern'
      ? '#38BDF8'
      : '#60A5FA';

  const padX = isLandscape ? 56 : 42;
  const topBrandY = isLandscape ? 40 : 52;

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
  ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
  ctx.fillText(catLabel, width - padX, topBrandY);
  ctx.restore();

  // Lower-Third Editorial Caption & Price Lockup
  const slideY = (1 - enterAlpha) * 16;
  ctx.save();
  ctx.globalAlpha = clamp(textAlpha, 0, 1);

  const contentW = isLandscape ? Math.round(width * 0.62) : width - padX * 2;
  const baseBottomY = height - (isLandscape ? 78 : 112);

  // Subheadline + Headline drawn bottom-up cleanly above footer
  const cleanPriceBanner = sanitizeCommercialCopy(priceBannerText);
  const showPriceBadge = scene.role === 'cta' && Boolean(cleanPriceBanner);

  let priceBlockH = 0;
  if (showPriceBadge) {
    priceBlockH = isLandscape ? 58 : 64;
    const badgeY = baseBottomY - (isLandscape ? 46 : 54) + slideY;
    ctx.font = `800 ${isLandscape ? 23 : 26}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const priceMetrics = ctx.measureText(cleanPriceBanner);
    const hasOrigDiscount =
      Number(product.origPrice) > Number(product.price) && Number(product.price) > 0;
    const origText = hasOrigDiscount ? `$${Number(product.origPrice).toFixed(2)}` : '';
    const origW = origText ? ctx.measureText(origText).width + 16 : 0;

    const badgeW = priceMetrics.width + origW + 44;
    const badgeH = isLandscape ? 46 : 52;
    const badgeX = padX;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const px = badgeX + 22;
    ctx.fillText(cleanPriceBanner, px, badgeY + badgeH / 2 + 1);

    if (origText) {
      ctx.font = `600 ${isLandscape ? 16 : 18}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = '#64748B';
      const ox = px + priceMetrics.width + 14;
      ctx.fillText(origText, ox, badgeY + badgeH / 2 + 1);
      const ow = ctx.measureText(origText).width;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox - 2, badgeY + badgeH / 2 + 1);
      ctx.lineTo(ox + ow + 2, badgeY + badgeH / 2 + 1);
      ctx.stroke();
    }
  }

  const subFontSize = isLandscape ? 20 : 22;
  ctx.font = `500 ${subFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const subLines = wrapTextLines(
    ctx,
    sanitizeCommercialCopy(scene.subheadline || ''),
    contentW,
    2
  );
  const subBlockH = subLines.length * (subFontSize * 1.32);

  const headFontSize = isLandscape ? 38 : 40;
  ctx.font = `800 ${headFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const headLines = wrapTextLines(
    ctx,
    sanitizeCommercialCopy(scene.headline || product.title),
    contentW,
    2
  );
  const headBlockH = headLines.length * (headFontSize * 1.15);

  let yCursor = baseBottomY - priceBlockH - subBlockH - headBlockH - 36 + slideY;

  // Small scene eyebrow chip
  const roleTagMap: Record<CommercialScenePlan['role'], string> = {
    hook: 'REAL-WORLD PROBLEM',
    showcase: 'IN ACTION',
    benefit: 'KEY FEATURE',
    cta: 'SHOP ONLINE',
  };
  ctx.font = `700 ${isLandscape ? 11 : 12}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const tagText = roleTagMap[scene.role] || 'FEATURED';
  const tagW = ctx.measureText(tagText).width + 20;
  const tagH = 24;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  drawRoundedRect(ctx, padX, yCursor, tagW, tagH, 12);
  ctx.fill();
  ctx.fillStyle = accentHex;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, padX + 10, yCursor + tagH / 2 + 0.5);
  yCursor += tagH + 10;

  // Headline
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

  ctx.restore();

  // Bottom Web URL Brand Footer & 4-Scene Progress Rail
  const footerY = height - (isLandscape ? 42 : 60);
  if (includeWebLinkOverlay) {
    ctx.save();
    ctx.textAlign = isLandscape ? 'right' : 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${isLandscape ? 16 : 18}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText('www.dbuystore.com', isLandscape ? width - padX : width / 2, footerY);
    ctx.restore();
  }

  // 4-segment commercial progress rail
  const railY = height - (isLandscape ? 16 : 24);
  const railTotalW = width - padX * 2;
  const gap = 8;
  const segCount = scenes.length;
  const segW = (railTotalW - gap * (segCount - 1)) / segCount;

  for (let i = 0; i < segCount; i++) {
    const sx = padX + i * (segW + gap);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    drawRoundedRect(ctx, sx, railY, segW, 4, 2);
    ctx.fill();

    const fillRatio = i < activeIdx ? 1 : i === activeIdx ? sceneProgress : 0;
    if (fillRatio > 0) {
      ctx.fillStyle = accentHex;
      drawRoundedRect(ctx, sx, railY, Math.max(4, segW * fillRatio), 4, 2);
      ctx.fill();
    }
  }

  const fadeInAlpha = clamp(t / 0.3, 0, 1);
  if (fadeInAlpha < 1) {
    ctx.fillStyle = `rgba(6,10,18,${1 - fadeInAlpha})`;
    ctx.fillRect(0, 0, width, height);
  }
}

// ============================================================================
// WebCodecs H.264 + AAC MP4 Encoder (with MediaRecorder Fallback)
// ============================================================================
async function encodeLiveVideoWithWebCodecsMp4(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  videoNativeDuration: number,
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
  const safeMaxVideoT = Math.max(0.1, videoNativeDuration - 0.05);

  for (let i = 0; i < totalFrames; i++) {
    if (videoError) throw videoError;
    const t = i / FPS;
    // Map commercial timeline linearly across full live-action clip duration (never jerky)
    const videoSeekTime = clamp((t / totalDurationSec) * safeMaxVideoT, 0, safeMaxVideoT);
    await seekVideoToTime(video, videoSeekTime);

    drawFrameAt(t);

    const frame = new VideoFrameCtor(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();

    if (i % 6 === 0) {
      while (videoEncoder.encodeQueueSize > 12) {
        await new Promise((r) => setTimeout(r, 8));
      }
      const pct = Math.round(55 + (i / totalFrames) * 30);
      onProgress?.(pct, `Compositing frame ${i + 1} / ${totalFrames} (${width}×${height})`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (videoError) throw videoError;

  if (canEncodeAac) {
    onProgress?.(88, 'Encoding product-bound English voiceover + auto-ducked AAC audio...');
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

async function encodeLiveVideoWithMediaRecorderFallback(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  videoNativeDuration: number,
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

  video.playbackRate = Math.max(0.5, Math.min(1.5, videoNativeDuration / totalDurationSec));
  video.currentTime = 0;
  await video.play().catch(() => {});
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
      const pct = Math.round(55 + (elapsedSec / totalDurationSec) * 38);
      onProgress?.(pct, `Recording live-action commercial (${elapsedSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s)`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  video.pause();
  recorder.stop();
  const blob = await stopped;
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
  return blob;
}

// ============================================================================
// Main Export — Reference-Guided In-Use Commercial Video Compositor
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

  const referenceImages =
    options.selectedImages && options.selectedImages.length > 0
      ? options.selectedImages
      : [options.product.image, ...(options.product.images || [])].filter(Boolean);

  if (referenceImages.length === 0) {
    throw new Error('At least one product image is required for reference-guided AI video generation.');
  }

  // Strictly require live-action AI video (no static image panning slideshows!)
  let actionVideoBlob: Blob | undefined = options.generatedVideoBlob;
  if (!actionVideoBlob && options.generatedVideoBase64) {
    const buf = base64ToArrayBuffer(options.generatedVideoBase64);
    actionVideoBlob = new Blob([buf], { type: options.generatedVideoMimeType || 'video/mp4' });
  }

  if (!actionVideoBlob) {
    const actionPrompt =
      options.combinedActionPrompt ||
      buildCombinedActionVideoPrompt({
        product: {
          title: options.product.title,
          description: options.product.description,
          features: options.product.features,
          category: options.product.category,
        },
        scenes,
        visualTheme,
        aspectRatio,
      });

    const clip = await generateReferenceGuidedActionVideo(
      {
        product: options.product,
        referenceImages,
        scenes,
        combinedActionPrompt: actionPrompt,
        visualTheme,
        aspectRatio,
      },
      onProgress
    );
    actionVideoBlob = clip.blob;
  }

  onProgress?.({
    stage: 'audio',
    progressPct: 50,
    message: options.voiceoverAudioBase64
      ? 'Mixing Product Voiceover & Auto-Ducked Music (15–20% bed)...'
      : 'Composing Studio Background Music...',
    detail: `Mood: ${musicMood.replace('_', ' ')}`,
  });

  const plannedDuration =
    options.durationSec ||
    scenes.reduce((sum, s) => sum + Math.max(2.5, Number(s.durationSec) || 3.75), 0);

  const { audioBuffer, finalDurationSec, hasVoiceover, autoDucked } = await renderCommercialAudioMix({
    musicMood,
    requestedDurationSec: plannedDuration,
    voiceoverAudioBase64: options.voiceoverAudioBase64,
  });

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
    progressPct: 54,
    message: `Compositing ${aspectRatio} Live-Action Commercial...`,
    detail: 'Decoding reference-guided AI video stream & preparing branding overlays',
  });

  const { video, objectUrl: actionVideoUrl, durationSec: nativeVideoDur } =
    await loadVideoElementFromBlob(actionVideoBlob);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    URL.revokeObjectURL(actionVideoUrl);
    throw new Error('Failed to initialize 2D rendering context.');
  }

  const drawFrameAt = (timeSec: number) => {
    renderLiveActionCommercialFrame(
      ctx,
      video,
      width,
      height,
      timeSec,
      finalDurationSec,
      scenes,
      visualTheme,
      options.product,
      priceBannerText,
      includeWebLink
    );
  };

  let blob: Blob;
  let encoderUsed: 'webcodecs-mp4' | 'mediarecorder-fallback' = 'webcodecs-mp4';

  try {
    try {
      blob = await encodeLiveVideoWithWebCodecsMp4(
        canvas,
        video,
        nativeVideoDur,
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
                : `Compositing ${aspectRatio} In-Use Commercial...`,
            detail,
          });
        }
      );
    } catch (webCodecsErr) {
      console.warn('[VIDEO-ENCODER] WebCodecs unavailable, using MediaRecorder fallback:', webCodecsErr);
      encoderUsed = 'mediarecorder-fallback';
      blob = await encodeLiveVideoWithMediaRecorderFallback(
        canvas,
        video,
        nativeVideoDur,
        finalDurationSec,
        audioBuffer,
        drawFrameAt,
        (pct, detail) => {
          onProgress?.({
            stage: 'rendering',
            progressPct: pct,
            message: `Recording ${aspectRatio} Live-Action Commercial...`,
            detail,
          });
        }
      );
    }
  } finally {
    URL.revokeObjectURL(actionVideoUrl);
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
    message: `Live-Action Commercial Ready (${finalDurationSec.toFixed(1)}s ${aspectRatio})`,
    detail: `${(file.size / (1024 * 1024)).toFixed(2)} MB · ${hasVoiceover ? 'Product-Bound Voiceover + Auto-Ducked Music' : 'Studio Music'}`,
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
