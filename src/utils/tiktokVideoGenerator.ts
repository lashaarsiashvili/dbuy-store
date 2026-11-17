import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Product } from '../types';
import { extractTopProductHighlights } from './instagramApi';

export type PromoVideoVibe = 'upbeat' | 'tech' | 'cinematic' | 'cyberpunk';

export type PromoVideoStage =
  | 'extracting'
  | 'music_transitions'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface PromoVideoGenerationProgress {
  stage: PromoVideoStage;
  progressPct: number;
  message: string;
  detail?: string;
}

export interface PromoVideoOptions {
  product: Product;
  selectedImages: string[];
  titleOffer: string;
  priceBanner: string;
  musicVibe: PromoVideoVibe;
  includeWebLinkOverlay: boolean;
  isKa?: boolean;
}

export interface GeneratedPromoVideoResult {
  file: File;
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  rendererUsed: 'webcodecs-mp4' | 'mediarecorder-mp4';
}

const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 1280;
const FPS = 30;
const TOTAL_DURATION_SEC = 12; // 12 seconds (ideal 10-15s TikTok pacing)
const TOTAL_FRAMES = FPS * TOTAL_DURATION_SEC; // 360 frames
const AUDIO_SAMPLE_RATE = 48000;

export const PROMO_VIBE_OPTIONS: Array<{
  value: PromoVideoVibe;
  label: string;
  labelKa: string;
  bpm: number;
}> = [
  {
    value: 'upbeat',
    label: 'Upbeat & Energetic (124 BPM)',
    labelKa: 'ენერგიული და დინამიური (124 BPM)',
    bpm: 124,
  },
  {
    value: 'tech',
    label: 'Modern Tech (116 BPM)',
    labelKa: 'თანამედროვე ტექნოლოგიური (116 BPM)',
    bpm: 116,
  },
  {
    value: 'cinematic',
    label: 'Cinematic Epic (92 BPM)',
    labelKa: 'კინემატოგრაფიული (92 BPM)',
    bpm: 92,
  },
  {
    value: 'cyberpunk',
    label: 'Cyberpunk / Electronic (128 BPM)',
    labelKa: 'კიბერპანკი / ელექტრონული (128 BPM)',
    bpm: 128,
  },
];

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function formatPriceAmount(value: number): string {
  const n = Math.max(0, Number(value) || 0);
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function buildUrlCandidates(rawUrl: string): string[] {
  const clean = (rawUrl || '').trim();
  if (!clean) return [];
  if (clean.startsWith('data:')) return [clean];

  const candidates: string[] = [];

  // Same-origin /uploads path resolves cleanly with zero CORS issues in preview or live site
  if (clean.includes('/uploads/') && typeof window !== 'undefined') {
    const uploadPath = clean.substring(clean.indexOf('/uploads/'));
    candidates.push(`${window.location.origin}${uploadPath}`);
  }

  candidates.push(clean);

  // Guaranteed CORS-enabled image proxy fallback (handles .webp, .avif, and cross-origin URLs)
  const lower = clean.toLowerCase().split('?')[0];
  if (!lower.startsWith('data:')) {
    const absUrl = clean.startsWith('/') ? `https://www.dbuystore.com${clean}` : clean;
    candidates.push(`https://wsrv.nl/?url=${encodeURIComponent(absUrl)}&output=jpg&q=92`);
  }

  return Array.from(new Set(candidates));
}

async function loadImageBitmapClean(rawUrl: string): Promise<HTMLImageElement | ImageBitmap | null> {
  const candidates = buildUrlCandidates(rawUrl);
  for (const url of candidates) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        if (!url.startsWith('data:')) {
          el.crossOrigin = 'anonymous';
        }
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error(`Image load error for ${url}`));
        el.src = url;
      });
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        return img;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

async function loadAllSelectedImages(urls: string[]): Promise<Array<HTMLImageElement | ImageBitmap>> {
  const loaded: Array<HTMLImageElement | ImageBitmap> = [];
  for (const url of urls) {
    const img = await loadImageBitmapClean(url);
    if (img) loaded.push(img);
  }
  return loaded;
}

/**
 * Generates a vibrant, copyright-free synthesized stereo AudioBuffer tuned to the selected vibe.
 */
async function synthesizePromoAudioTrack(
  vibe: PromoVideoVibe,
  durationSec: number
): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === 'undefined') return null;

  try {
    const sampleCount = Math.floor(AUDIO_SAMPLE_RATE * durationSec);
    const ctx = new OfflineAudioContext(2, sampleCount, AUDIO_SAMPLE_RATE);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.01, 0);
    master.gain.linearRampToValueAtTime(0.75, 0.35);
    master.gain.setValueAtTime(0.75, Math.max(0.5, durationSec - 0.8));
    master.gain.linearRampToValueAtTime(0.001, durationSec);
    master.connect(ctx.destination);

    // Pre-generate short white-noise buffer for hi-hats / risers
    const noiseLen = Math.floor(AUDIO_SAMPLE_RATE * 0.25);
    const noiseBuf = ctx.createBuffer(1, noiseLen, AUDIO_SAMPLE_RATE);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const triggerKick = (time: number, punchFreq = 140) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(punchFreq, time);
      osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + 0.2);
    };

    const triggerHat = (time: number, vol = 0.12) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(time);
      src.stop(time + 0.06);
    };

    const triggerSynth = (
      time: number,
      freq: number,
      dur: number,
      type: OscillatorType,
      vol: number,
      cutoff = 2400
    ) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(400, cutoff * 0.45), time + dur);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    };

    const bpm =
      vibe === 'cyberpunk' ? 128 : vibe === 'upbeat' ? 124 : vibe === 'tech' ? 116 : 92;
    const beatDur = 60 / bpm;
    const stepDur = beatDur / 2; // 8th notes
    const totalSteps = Math.floor(durationSec / stepDur);

    const scales: Record<PromoVideoVibe, { bass: number[]; lead: number[] }> = {
      upbeat: {
        bass: [130.81, 146.83, 164.81, 196.0], // C3 D3 E3 G3
        lead: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 587.33, 659.25],
      },
      tech: {
        bass: [110.0, 110.0, 130.81, 146.83], // A2 C3 D3
        lead: [440.0, 523.25, 659.25, 523.25, 880.0, 659.25, 587.33, 523.25],
      },
      cinematic: {
        bass: [82.41, 98.0, 110.0, 73.42], // E2 G2 A2 D2
        lead: [329.63, 392.0, 493.88, 587.33, 659.25, 587.33, 493.88, 392.0],
      },
      cyberpunk: {
        bass: [98.0, 98.0, 116.54, 130.81], // G2 Bb2 C3
        lead: [392.0, 466.16, 523.25, 622.25, 783.99, 622.25, 523.25, 466.16],
      },
    };

    const palette = scales[vibe];

    for (let s = 0; s < totalSteps; s++) {
      const t = s * stepDur;
      const barIdx = Math.floor(s / 8) % palette.bass.length;
      const bassFreq = palette.bass[barIdx];
      const leadFreq = palette.lead[s % palette.lead.length];

      if (vibe === 'cinematic') {
        if (s % 8 === 0) {
          triggerKick(t, 105);
          triggerSynth(t, bassFreq, stepDur * 7.5, 'sawtooth', 0.22, 900);
          triggerSynth(t, bassFreq * 2, stepDur * 7.5, 'triangle', 0.14, 1400);
        }
        if (s % 2 === 0) {
          triggerSynth(t, leadFreq, stepDur * 1.9, 'sine', 0.14, 2200);
        }
      } else if (vibe === 'cyberpunk') {
        if (s % 2 === 0) triggerKick(t, 155);
        if (s % 2 === 1) triggerHat(t, 0.16);
        triggerSynth(t, bassFreq, stepDur * 0.85, 'sawtooth', 0.22, 1150);
        triggerSynth(t, leadFreq, stepDur * 0.72, 'square', 0.11, 2600);
      } else if (vibe === 'tech') {
        if (s % 2 === 0) triggerKick(t, 130);
        if (s % 2 === 1) triggerHat(t, 0.09);
        if (s % 2 === 0) {
          triggerSynth(t, bassFreq, stepDur * 1.5, 'triangle', 0.24, 950);
        }
        triggerSynth(t, leadFreq, stepDur * 0.65, 'sine', 0.14, 3000);
      } else {
        // upbeat
        if (s % 2 === 0) triggerKick(t, 145);
        triggerHat(t, s % 2 === 1 ? 0.14 : 0.06);
        if (s % 2 === 0) {
          triggerSynth(t, bassFreq, stepDur * 1.4, 'sawtooth', 0.19, 1100);
        }
        triggerSynth(t, leadFreq, stepDur * 0.78, 'triangle', 0.15, 2900);
      }
    }

    // Subtle impact chime at major slide marks (3.0s, 6.0s, 9.0s)
    [3.0, 6.0, 9.0].forEach((mark) => {
      if (mark < durationSec - 0.5) {
        triggerSynth(mark, 880, 0.45, 'sine', 0.14, 4200);
      }
    });

    return await ctx.startRendering();
  } catch {
    return null;
  }
}

function drawRoundedRectPath(
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
  maxLines = 2
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
  // Truncate final line cleanly if overflowing
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last).width > maxWidth && last.length > 4) {
      last = `${last.slice(0, -2)}…`;
    }
    lines[maxLines - 1] = last;
  }
  return lines;
}

function drawContainCoverImageCard(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  scale: number,
  panX: number,
  panY: number,
  alpha: number
) {
  if (alpha <= 0.01) return;
  const imgW = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const imgH = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  if (!imgW || !imgH) return;

  ctx.save();
  ctx.globalAlpha = clamp01(alpha);

  // Glowing outer frame
  ctx.shadowColor = 'rgba(25, 181, 254, 0.45)';
  ctx.shadowBlur = 34;
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Clip image inside crisp rounded white studio card
  ctx.save();
  drawRoundedRectPath(ctx, boxX + 4, boxY + 4, boxW - 8, boxH - 8, 32);
  ctx.clip();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Fit inside box cleanly without cutting product details, then apply subtle Ken Burns zoom/pan
  const innerPad = 24;
  const availW = boxW - innerPad * 2;
  const availH = boxH - innerPad * 2;
  const baseRatio = Math.min(availW / imgW, availH / imgH);
  const drawW = imgW * baseRatio * scale;
  const drawH = imgH * baseRatio * scale;
  const dx = boxX + (boxW - drawW) / 2 + panX;
  const dy = boxY + (boxH - drawH) / 2 + panY;

  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();

  // Neon cyan border accent
  drawRoundedRectPath(ctx, boxX, boxY, boxW, boxH, 36);
  ctx.lineWidth = 3;
  const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  borderGrad.addColorStop(0, '#25F4EE');
  borderGrad.addColorStop(0.5, '#19B5FE');
  borderGrad.addColorStop(1, '#F97316');
  ctx.strokeStyle = borderGrad;
  ctx.stroke();

  ctx.restore();
}

function drawDbuyBagLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Glowing outer ring
  const r = size / 2;
  const ringGrad = ctx.createLinearGradient(-r, -r, r, r);
  ringGrad.addColorStop(0, '#25F4EE');
  ringGrad.addColorStop(0.55, '#19B5FE');
  ringGrad.addColorStop(1, '#F97316');

  ctx.shadowColor = 'rgba(25, 181, 254, 0.55)';
  ctx.shadowBlur = 28;
  drawRoundedRectPath(ctx, -r, -r, size, size, size * 0.28);
  ctx.fillStyle = '#07142b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = ringGrad;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Shopping bag silhouette inside emblem
  const bagW = size * 0.46;
  const bagH = size * 0.44;
  const bagY = -bagH * 0.35;

  // Handle arc
  ctx.beginPath();
  ctx.arc(0, bagY, bagW * 0.26, Math.PI, 0, false);
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = '#25F4EE';
  ctx.stroke();

  // Bag body
  drawRoundedRectPath(ctx, -bagW / 2, bagY, bagW, bagH, 10);
  const bagGrad = ctx.createLinearGradient(-bagW / 2, bagY, bagW / 2, bagY + bagH);
  bagGrad.addColorStop(0, '#19B5FE');
  bagGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = bagGrad;
  ctx.fill();

  // Bold "DB" monogram
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(size * 0.22)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DB', 0, bagY + bagH * 0.54);

  ctx.restore();
}

interface RenderSceneState {
  images: Array<HTMLImageElement | ImageBitmap>;
  titleOffer: string;
  priceBanner: string;
  priceNum: number;
  origPriceNum: number;
  highlights: string[];
  includeWebLinkOverlay: boolean;
}

function renderPromoFrame(
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  scene: RenderSceneState
) {
  const t = frameIndex / FPS; // seconds [0 .. 12)
  const progress = t / TOTAL_DURATION_SEC;

  // 1. Dynamic Dark Navy + Cyan + Subtle Orange Ambient Background
  const bgGrad = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  bgGrad.addColorStop(0, '#020611');
  bgGrad.addColorStop(0.45, '#07142b');
  bgGrad.addColorStop(1, '#030b1c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Animated Neon Orbs
  const orb1X = VIDEO_WIDTH * 0.2 + Math.sin(t * 0.9) * 80;
  const orb1Y = VIDEO_HEIGHT * 0.24 + Math.cos(t * 0.7) * 55;
  const rad1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, 340);
  rad1.addColorStop(0, 'rgba(37, 244, 238, 0.26)');
  rad1.addColorStop(1, 'rgba(37, 244, 238, 0)');
  ctx.fillStyle = rad1;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  const orb2X = VIDEO_WIDTH * 0.8 + Math.cos(t * 0.8) * 70;
  const orb2Y = VIDEO_HEIGHT * 0.76 + Math.sin(t * 1.1) * 60;
  const rad2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, 360);
  rad2.addColorStop(0, 'rgba(249, 115, 22, 0.22)');
  rad2.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = rad2;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  // Subtle Digital Tech Grid
  ctx.save();
  ctx.strokeStyle = 'rgba(25, 181, 254, 0.06)';
  ctx.lineWidth = 1;
  const gridOffset = (t * 24) % 48;
  for (let x = 0; x <= VIDEO_WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIDEO_HEIGHT);
    ctx.stroke();
  }
  for (let y = gridOffset; y <= VIDEO_HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIDEO_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();

  // Floating Light Particles
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const px = ((i * 197 + t * (28 + (i % 4) * 10)) % (VIDEO_WIDTH + 40)) - 20;
    const py =
      VIDEO_HEIGHT - (((i * 263 + t * (55 + (i % 5) * 14)) % (VIDEO_HEIGHT + 60)) - 30);
    const pr = 2 + (i % 3) * 1.4;
    ctx.globalAlpha = 0.2 + ((Math.sin(t * 3 + i) + 1) / 2) * 0.45;
    ctx.fillStyle = i % 3 === 0 ? '#F97316' : '#25F4EE';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Top Edge Progress Accent Bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, VIDEO_WIDTH, 6);
  const topBarGrad = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, 0);
  topBarGrad.addColorStop(0, '#25F4EE');
  topBarGrad.addColorStop(0.5, '#19B5FE');
  topBarGrad.addColorStop(1, '#F97316');
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, VIDEO_WIDTH * progress, 6);

  // Persistent Brand Header Pill (Safe Zone below TikTok top UI)
  ctx.save();
  drawRoundedRectPath(ctx, 180, 56, 360, 44, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(37, 244, 238, 0.45)';
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 18px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡ DBUY STORE · TECH FOR A BETTER YOU', VIDEO_WIDTH / 2, 79);
  ctx.restore();

  const imgs = scene.images;
  const primaryImg = imgs[0] || null;

  // ==========================================================
  // SLIDE 1 (0.0s - 3.0s): High-Impact Hook + Main Image Zoom
  // ==========================================================
  if (t < 3.0) {
    const localT = t / 3.0;
    const entry = easeOutCubic(Math.min(1, t / 0.45));
    const exitAlpha = t > 2.65 ? clamp01((3.0 - t) / 0.35) : 1;

    // Headline hook
    ctx.save();
    ctx.globalAlpha = entry * exitAlpha;
    const hookY = 165 - (1 - entry) * 28;
    ctx.shadowColor = 'rgba(37, 244, 238, 0.5)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UPGRADE YOUR SETUP! 💻🔥', VIDEO_WIDTH / 2, hookY);
    ctx.restore();

    // Main Product Image with Ken Burns Zoom-In
    if (primaryImg) {
      const zoomScale = 1.0 + easeInOutQuad(localT) * 0.14;
      drawContainCoverImageCard(
        ctx,
        primaryImg,
        66,
        240 + (1 - entry) * 30,
        588,
        590,
        zoomScale,
        0,
        0,
        entry * exitAlpha
      );
    }

    // Trending Title Offer Banner
    ctx.save();
    ctx.globalAlpha = entry * exitAlpha;
    drawRoundedRectPath(ctx, 56, 868, 608, 122, 24);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(25, 181, 254, 0.5)';
    ctx.stroke();

    ctx.fillStyle = '#25F4EE';
    ctx.font = '800 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleLines = wrapTextLines(ctx, scene.titleOffer, 560, 2);
    if (titleLines.length === 1) {
      ctx.fillText(titleLines[0], VIDEO_WIDTH / 2, 929);
    } else if (titleLines.length >= 2) {
      ctx.fillText(titleLines[0], VIDEO_WIDTH / 2, 908);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 25px system-ui, -apple-system, sans-serif';
      ctx.fillText(titleLines[1], VIDEO_WIDTH / 2, 952);
    }
    ctx.restore();

    // Glowing Price Teaser Pill
    ctx.save();
    ctx.globalAlpha = entry * exitAlpha;
    drawRoundedRectPath(ctx, 180, 1018, 360, 66, 33);
    const pillGrad = ctx.createLinearGradient(180, 1018, 540, 1084);
    pillGrad.addColorStop(0, '#F97316');
    pillGrad.addColorStop(1, '#ea580c');
    ctx.shadowColor = 'rgba(249, 115, 22, 0.55)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = pillGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.priceBanner || `Only $${formatPriceAmount(scene.priceNum)}!`, VIDEO_WIDTH / 2, 1052);
    ctx.restore();
  }

  // ==========================================================
  // SLIDES 2 & 3 (3.0s - 9.0s): Gallery Rotation + Features + Price
  // ==========================================================
  else if (t >= 3.0 && t < 9.0) {
    const galleryWindow = t - 3.0; // [0 .. 6.0)
    const galleryImgs = imgs.length > 1 ? imgs.slice(1) : imgs;
    const totalSlides = Math.max(2, galleryImgs.length);
    const slideDur = 6.0 / totalSlides;
    const rawSlideIdx = Math.min(totalSlides - 1, Math.floor(galleryWindow / slideDur));
    const slideImg = galleryImgs[rawSlideIdx % galleryImgs.length] || primaryImg;
    const slideElapsed = galleryWindow - rawSlideIdx * slideDur;
    const slideProgress = clamp01(slideElapsed / slideDur);
    const slideFadeIn = easeOutCubic(Math.min(1, slideElapsed / 0.35));
    const slideFadeOut = slideElapsed > slideDur - 0.3 ? clamp01((slideDur - slideElapsed) / 0.3) : 1;
    const slideAlpha = slideFadeIn * slideFadeOut;

    // Alternating Ken Burns Pan & Zoom
    const dir = rawSlideIdx % 2 === 0 ? 1 : -1;
    const kbScale = 1.03 + easeInOutQuad(slideProgress) * 0.12;
    const kbPanX = dir * (slideProgress - 0.5) * 26;
    const kbPanY = (0.5 - slideProgress) * 18;

    // Top Feature Highlight Header
    const highlightText =
      scene.highlights[rawSlideIdx % Math.max(1, scene.highlights.length)] ||
      'Engineered for Everyday Performance';
    ctx.save();
    ctx.globalAlpha = slideAlpha;
    drawRoundedRectPath(ctx, 56, 134, 608, 92, 22);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(37, 244, 238, 0.55)';
    ctx.stroke();

    ctx.fillStyle = '#25F4EE';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hlLines = wrapTextLines(ctx, `✨ ${highlightText}`, 560, 2);
    if (hlLines.length === 1) {
      ctx.fillText(hlLines[0], VIDEO_WIDTH / 2, 180);
    } else if (hlLines.length >= 2) {
      ctx.fillText(hlLines[0], VIDEO_WIDTH / 2, 162);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(hlLines[1], VIDEO_WIDTH / 2, 198);
    }
    ctx.restore();

    // Gallery Card
    if (slideImg) {
      drawContainCoverImageCard(
        ctx,
        slideImg,
        66,
        252,
        588,
        585,
        kbScale,
        kbPanX,
        kbPanY,
        slideAlpha
      );
    }

    // Slide Indicator Dots
    ctx.save();
    const dotGap = 20;
    const dotsStartX = VIDEO_WIDTH / 2 - ((totalSlides - 1) * dotGap) / 2;
    for (let d = 0; d < totalSlides; d++) {
      ctx.beginPath();
      ctx.arc(dotsStartX + d * dotGap, 864, d === rawSlideIdx ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = d === rawSlideIdx ? '#25F4EE' : 'rgba(148, 163, 184, 0.45)';
      ctx.fill();
    }
    ctx.restore();

    // Glowing Price Banner Card: "GET IT FOR ONLY $[price]! 🚀"
    const pulse = 1 + Math.sin(t * 5) * 0.02;
    ctx.save();
    ctx.translate(VIDEO_WIDTH / 2, 974);
    ctx.scale(pulse, pulse);
    drawRoundedRectPath(ctx, -304, -74, 608, 148, 28);
    const offerGrad = ctx.createLinearGradient(-304, -74, 304, 74);
    offerGrad.addColorStop(0, '#0f172a');
    offerGrad.addColorStop(1, '#1e293b');
    ctx.shadowColor = 'rgba(249, 115, 22, 0.45)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = offerGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F97316';
    ctx.stroke();

    const formattedPrice = formatPriceAmount(scene.priceNum);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`GET IT FOR ONLY $${formattedPrice}! 🚀`, 0, -14);

    if (scene.origPriceNum > scene.priceNum && scene.priceNum > 0) {
      const pct = Math.max(1, Math.round(((scene.origPriceNum - scene.priceNum) / scene.origPriceNum) * 100));
      ctx.fillStyle = '#25F4EE';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `SAVE ${pct}% · REG. $${formatPriceAmount(scene.origPriceNum)} · TRACKED SHIPPING`,
        0,
        34
      );
    } else {
      ctx.fillStyle = '#25F4EE';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(scene.priceBanner || '🌍 TRACKED WORLDWIDE SHIPPING', 0, 34);
    }
    ctx.restore();
  }

  // ==========================================================
  // SLIDE 4 (9.0s - 12.0s): Clear Call-To-Action + DBuy Bag Logo
  // ==========================================================
  else {
    const ctaElapsed = t - 9.0; // [0 .. 3.0]
    const entry = easeOutCubic(Math.min(1, ctaElapsed / 0.55));
    const logoScale = 0.8 + entry * 0.2;

    // Animated DBuy Bag & Logo Emblem fading in
    ctx.save();
    ctx.globalAlpha = entry;
    ctx.translate(VIDEO_WIDTH / 2, 260);
    ctx.scale(logoScale, logoScale);
    drawDbuyBagLogo(ctx, 0, 0, 170);
    ctx.restore();

    // Small glowing product thumbnail preview card
    if (primaryImg) {
      drawContainCoverImageCard(
        ctx,
        primaryImg,
        210,
        390,
        300,
        290,
        1.0 + Math.sin(ctaElapsed * 2) * 0.03,
        0,
        0,
        entry
      );
    }

    // Call to Action Headline
    ctx.save();
    ctx.globalAlpha = entry;
    ctx.shadowColor = 'rgba(37, 244, 238, 0.55)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👉 TAP THE LINK TO SHOP', VIDEO_WIDTH / 2, 745);
    ctx.restore();

    // Bright Brand Store URL Button
    const btnPulse = 1 + Math.sin(ctaElapsed * 5.5) * 0.025;
    ctx.save();
    ctx.globalAlpha = entry;
    ctx.translate(VIDEO_WIDTH / 2, 855);
    ctx.scale(btnPulse, btnPulse);
    drawRoundedRectPath(ctx, -296, -54, 592, 108, 30);
    const ctaGrad = ctx.createLinearGradient(-296, -54, 296, 54);
    ctaGrad.addColorStop(0, '#25F4EE');
    ctaGrad.addColorStop(0.5, '#19B5FE');
    ctaGrad.addColorStop(1, '#F97316');
    ctx.shadowColor = 'rgba(25, 181, 254, 0.55)';
    ctx.shadowBlur = 28;
    ctx.fillStyle = ctaGrad;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#020611';
    ctx.font = '900 25px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHOP NOW AT: WWW.DBUYSTORE.COM', 0, -10);

    ctx.fillStyle = '#07142b';
    ctx.font = '800 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      scene.priceBanner || `ONLY $${formatPriceAmount(scene.priceNum)} · LIMITED STOCK`,
      0,
      24
    );
    ctx.restore();
  }

  // Optional Bottom Web Link Overlay ('Shop at www.dbuystore.com')
  if (scene.includeWebLinkOverlay) {
    ctx.save();
    drawRoundedRectPath(ctx, 130, 1126, 460, 56, 28);
    ctx.fillStyle = 'rgba(2, 6, 17, 0.84)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(37, 244, 238, 0.65)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛍️ Shop at www.dbuystore.com', VIDEO_WIDTH / 2, 1154);
    ctx.restore();
  }
}

async function detectWebCodecsSupport(): Promise<{
  videoCodec: string | null;
  audioCodec: 'mp4a.40.2' | null;
}> {
  let videoCodec: string | null = null;
  let audioCodec: 'mp4a.40.2' | null = null;

  if (typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined') {
    const candidates = ['avc1.42001f', 'avc1.4d002a', 'avc1.42E01E', 'avc1.640028'];
    for (const codec of candidates) {
      try {
        const res = await VideoEncoder.isConfigSupported({
          codec,
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          bitrate: 2_400_000,
          framerate: FPS,
        });
        if (res.supported) {
          videoCodec = codec;
          break;
        }
      } catch {
        // Try next codec profile
      }
    }
  }

  if (typeof AudioEncoder !== 'undefined' && typeof AudioData !== 'undefined') {
    try {
      const aRes = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2',
        numberOfChannels: 2,
        sampleRate: AUDIO_SAMPLE_RATE,
        bitrate: 128_000,
      });
      if (aRes.supported) {
        audioCodec = 'mp4a.40.2';
      }
    } catch {
      audioCodec = null;
    }
  }

  return { videoCodec, audioCodec };
}

async function encodeViaWebCodecsMp4(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scene: RenderSceneState,
  audioBuffer: AudioBuffer | null,
  videoCodec: string,
  audioCodec: 'mp4a.40.2' | null,
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<Blob> {
  const includeAudio = Boolean(audioBuffer && audioCodec);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
    ...(includeAudio
      ? {
          audio: {
            codec: 'aac',
            numberOfChannels: 2,
            sampleRate: AUDIO_SAMPLE_RATE,
          },
        }
      : {}),
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: videoCodec,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 2_400_000,
    framerate: FPS,
    latencyMode: 'quality',
  });

  let audioEncoder: AudioEncoder | null = null;
  if (includeAudio && audioCodec) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => {
        muxer.addAudioChunk(chunk, meta);
      },
      error: (err) => {
        encoderError = err instanceof Error ? err : new Error(String(err));
      },
    });
    audioEncoder.configure({
      codec: audioCodec,
      numberOfChannels: 2,
      sampleRate: AUDIO_SAMPLE_RATE,
      bitrate: 128_000,
    });
  }

  // Encode AudioBuffer frames if supported
  if (audioEncoder && audioBuffer) {
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
    const totalSamples = audioBuffer.length;
    const chunkSamples = 4096;

    for (let offset = 0; offset < totalSamples; offset += chunkSamples) {
      if (encoderError) throw encoderError;
      const frames = Math.min(chunkSamples, totalSamples - offset);
      const planarData = new Float32Array(frames * 2);
      planarData.set(ch0.subarray(offset, offset + frames), 0);
      planarData.set(ch1.subarray(offset, offset + frames), frames);

      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: AUDIO_SAMPLE_RATE,
        numberOfFrames: frames,
        numberOfChannels: 2,
        timestamp: Math.round((offset / AUDIO_SAMPLE_RATE) * 1_000_000),
        data: planarData,
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }
  }

  // Render & encode all 360 video frames sequentially
  for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
    if (encoderError) throw encoderError;

    renderPromoFrame(ctx, frameIdx, scene);

    const timestampUs = Math.round((frameIdx / FPS) * 1_000_000);
    const durationUs = Math.round((1 / FPS) * 1_000_000);
    const videoFrame = new VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: durationUs,
    });

    videoEncoder.encode(videoFrame, { keyFrame: frameIdx % 60 === 0 });
    videoFrame.close();

    // Keep UI responsive & report live progress
    if (frameIdx % 10 === 0 || frameIdx === TOTAL_FRAMES - 1) {
      const pct = 30 + Math.round((frameIdx / TOTAL_FRAMES) * 58);
      onProgress?.({
        stage: 'music_transitions',
        progressPct: pct,
        message: 'Applying Music & Transitions...',
        detail: `Rendering 9:16 H.264 frame ${frameIdx + 1}/${TOTAL_FRAMES}`,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.({
    stage: 'finalizing',
    progressPct: 92,
    message: 'Finalizing Video Render...',
    detail: 'Muxing H.264 video & audio into MP4 container (<30MB)',
  });

  await videoEncoder.flush();
  videoEncoder.close();

  if (audioEncoder) {
    await audioEncoder.flush();
    audioEncoder.close();
  }

  if (encoderError) throw encoderError;

  muxer.finalize();
  const { buffer } = muxer.target;
  return new Blob([buffer], { type: 'video/mp4' });
}

async function encodeViaMediaRecorderMp4(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  scene: RenderSceneState,
  audioBuffer: AudioBuffer | null,
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<Blob> {
  const mimeCandidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  const supportedMime =
    typeof MediaRecorder !== 'undefined'
      ? mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m))
      : undefined;

  if (!supportedMime) {
    throw new Error(
      'This browser does not support client-side H.264 MP4 encoding. Please use Chrome, Edge, or Safari, or upload an MP4 file directly.'
    );
  }

  const stream = canvas.captureStream(FPS);
  let audioCtx: AudioContext | null = null;

  if (audioBuffer && typeof AudioContext !== 'undefined') {
    try {
      audioCtx = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
      const dest = audioCtx.createMediaStreamDestination();
      const src = audioCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(dest);
      src.start();
      dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    } catch {
      // Proceed video-only if AudioContext is restricted
    }
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 2_400_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stoppedPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/mp4' }));
    };
    recorder.onerror = (ev: any) => {
      reject(ev?.error || new Error('MediaRecorder failed while encoding MP4.'));
    };
  });

  recorder.start(250);

  const startMs = performance.now();
  for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
    renderPromoFrame(ctx, frameIdx, scene);
    if (frameIdx % 10 === 0) {
      const pct = 30 + Math.round((frameIdx / TOTAL_FRAMES) * 60);
      onProgress?.({
        stage: 'music_transitions',
        progressPct: pct,
        message: 'Applying Music & Transitions...',
        detail: `Recording frame ${frameIdx + 1}/${TOTAL_FRAMES}`,
      });
    }
    const targetElapsedMs = ((frameIdx + 1) / FPS) * 1000;
    const waitMs = Math.max(0, startMs + targetElapsedMs - performance.now());
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  onProgress?.({
    stage: 'finalizing',
    progressPct: 95,
    message: 'Finalizing Video Render...',
  });

  recorder.stop();
  const blob = await stoppedPromise;
  if (audioCtx) {
    try {
      await audioCtx.close();
    } catch {
      // Ignore cleanup error
    }
  }
  return blob;
}

/**
 * Generates an optimal 9:16 (720x1280) 12-second H.264 MP4 TikTok promotional video
 * under 30MB using selected product imagery, title/offer, price banner, and vibe audio.
 */
export async function generateTikTokPromoVideo(
  options: PromoVideoOptions,
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<GeneratedPromoVideoResult> {
  const { product, selectedImages, titleOffer, priceBanner, musicVibe, includeWebLinkOverlay } =
    options;

  if (!selectedImages || selectedImages.length === 0) {
    throw new Error('Please select at least 1 product image to generate your promo video.');
  }

  onProgress?.({
    stage: 'extracting',
    progressPct: 8,
    message: 'Extracting Images...',
    detail: `Loading ${selectedImages.length} high-res product image(s)`,
  });

  const loadedImages = await loadAllSelectedImages(selectedImages);
  if (loadedImages.length === 0) {
    throw new Error(
      'Unable to load selected product images for video rendering. Please select different images or upload an MP4 directly.'
    );
  }

  onProgress?.({
    stage: 'extracting',
    progressPct: 20,
    message: 'Extracting Images...',
    detail: `Synthesizing "${PROMO_VIBE_OPTIONS.find((v) => v.value === musicVibe)?.label || musicVibe}" track`,
  });

  const audioBuffer = await synthesizePromoAudioTrack(musicVibe, TOTAL_DURATION_SEC);

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable in this browser.');
  }

  const priceNum = Math.max(0, Number(product.price) || 0);
  const origPriceNum = Number(
    product.origPrice ?? product.originalPrice ?? (product as any).original_price ?? 0
  );
  const highlights = extractTopProductHighlights(product, Boolean(options.isKa));

  const scene: RenderSceneState = {
    images: loadedImages,
    titleOffer: (titleOffer || `🔥 Trending Tech: ${product.title}!`).trim(),
    priceBanner: (priceBanner || `Only $${formatPriceAmount(priceNum)}!`).trim(),
    priceNum,
    origPriceNum,
    highlights,
    includeWebLinkOverlay,
  };

  onProgress?.({
    stage: 'music_transitions',
    progressPct: 28,
    message: 'Applying Music & Transitions...',
    detail: 'Initializing 9:16 H.264 encoder',
  });

  const support = await detectWebCodecsSupport();
  let mp4Blob: Blob;
  let rendererUsed: 'webcodecs-mp4' | 'mediarecorder-mp4' = 'webcodecs-mp4';
  let hasAudio = false;

  if (support.videoCodec) {
    hasAudio = Boolean(audioBuffer && support.audioCodec);
    mp4Blob = await encodeViaWebCodecsMp4(
      canvas,
      ctx,
      scene,
      audioBuffer,
      support.videoCodec,
      support.audioCodec,
      onProgress
    );
  } else {
    rendererUsed = 'mediarecorder-mp4';
    hasAudio = Boolean(audioBuffer);
    mp4Blob = await encodeViaMediaRecorderMp4(canvas, ctx, scene, audioBuffer, onProgress);
  }

  const safeSlug = (product.customSlug || product.id || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .slice(0, 40);
  const file = new File([mp4Blob], `dbuy-tiktok-promo-${safeSlug}.mp4`, {
    type: 'video/mp4',
  });

  onProgress?.({
    stage: 'complete',
    progressPct: 100,
    message: 'Promo Video Ready!',
    detail: `${(file.size / (1024 * 1024)).toFixed(2)} MB · 9:16 H.264 MP4 (${TOTAL_DURATION_SEC}s)`,
  });

  return {
    file,
    durationSec: TOTAL_DURATION_SEC,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    hasAudio,
    rendererUsed,
  };
}
