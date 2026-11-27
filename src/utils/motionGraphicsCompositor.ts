import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Product } from '../types';
import {
  buildDirectorFallbackScenes,
  CommercialAspectRatio,
  CommercialMotionStyle,
  CommercialMusicMood,
  CommercialResolutionPreset,
  CommercialScenePlan,
  CommercialVisualTheme,
  normalizeMotionStyle,
  sanitizeCommercialCopy,
  sanitizeSpokenVoiceoverScript,
} from './videoPromptOptimizer';
import {
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  renderCommercialAudioMix,
} from './tiktokVideoGenerator';

export const DBUY_OUTRO_DURATION_SEC = 2.5;
const TARGET_FPS = 60;
const SAMPLE_RATE = 44100;
const CHANNELS = 2;
const SCENE_TRANSITION_SEC = 0.28;

// ============================================================================
// Cubic-Bezier & Spring Easing Math (Zero Boring Linear Zoom!)
// ============================================================================
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Exact 1D Cubic-Bezier solver (Newton-Raphson) matching CSS cubic-bezier(x1, y1, x2, y2).
 */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tInput: number
): number {
  const x = clamp(tInput, 0, 1);
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;

  let t = x;
  for (let i = 0; i < 6; i++) {
    const err = sampleX(t) - x;
    if (Math.abs(err) < 1e-5) break;
    const d = sampleDerivX(t);
    if (Math.abs(d) < 1e-6) break;
    t = clamp(t - err / d, 0, 1);
  }
  return sampleY(t);
}

const easeWhipOut = (t: number) => cubicBezier(0.16, 1, 0.3, 1, t);
const easeWhipIn = (t: number) => cubicBezier(0.7, 0, 0.84, 0, t);
const easeInOutExpo = (t: number) => cubicBezier(0.65, 0, 0.35, 1, t);
const easeSpringOvershoot = (t: number) => cubicBezier(0.22, 1.32, 0.36, 1, t);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 4);

function hexToRgb(hex?: string): [number, number, number] | null {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex.trim())) return null;
  const clean = hex.trim().slice(1);
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbStr(rgb: [number, number, number], alpha = 1): string {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const k = clamp(t, 0, 1);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

// ============================================================================
// Safe Cross-Origin Image Loading, Color Extraction & Pre-Blurred Cache
// ============================================================================
interface PreparedMotionPhoto {
  img: HTMLImageElement;
  url: string;
  aspect: number;
  isBrightStudioBg: boolean;
  accentRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  blurredBackdrop: HTMLCanvasElement;
}

function resolveCanvasSafeUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (typeof window !== 'undefined' && u.origin === window.location.origin) {
        return trimmed;
      }
    } catch {
      // Proxy cross-origin
    }
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

async function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  const safeUrl = resolveCanvasSafeUrl(url);
  if (!safeUrl) return null;

  const tryLoad = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = window.setTimeout(() => resolve(null), 10000);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });

  const primary = await tryLoad(safeUrl);
  if (primary) return primary;
  if (safeUrl !== url && /^https?:\/\//i.test(url)) {
    return tryLoad(url);
  }
  return null;
}

export interface InlineAiImagePayload {
  base64: string;
  mimeType: string;
}

/**
 * Converts selected product photo URLs into compact base64 JPEG payloads
 * for multimodal Gemini AI Director analysis (100% Free-Tier).
 */
export async function prepareProductImagesForAi(
  urls: string[],
  options?: {
    maxDim?: number;
    maxCount?: number;
    quality?: number;
  }
): Promise<InlineAiImagePayload[]> {
  const maxDim = options?.maxDim ?? 512;
  const maxCount = options?.maxCount ?? 4;
  const quality = options?.quality ?? 0.8;
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, maxCount);

  const loaded = await Promise.all(uniqueUrls.map((u) => loadImageElement(u)));
  const payloads: InlineAiImagePayload[] = [];

  for (const img of loaded) {
    if (!img) continue;
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const targetW = Math.max(64, Math.round(img.naturalWidth * scale));
      const targetH = Math.max(64, Math.round(img.naturalHeight * scale));
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      if (base64) {
        payloads.push({ base64, mimeType: 'image/jpeg' });
      }
    } catch {
      // Skip tainted/unreadable images cleanly
    }
  }

  return payloads;
}

function createPreblurredBackdrop(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 240;
  c.height = 240;
  const ctx = c.getContext('2d');
  if (ctx) {
    try {
      ctx.filter = 'blur(18px) saturate(1.35)';
    } catch {
      // Ignore if filter unsupported
    }
    const scale = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight) * 1.15;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  }
  return c;
}

function analyzePhotoForMotion(
  img: HTMLImageElement,
  url: string,
  directorAccentRgb: [number, number, number] | null
): PreparedMotionPhoto {
  const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  let isBrightStudioBg = false;
  let accentRgb: [number, number, number] = directorAccentRgb || [13, 146, 255];
  let secondaryRgb: [number, number, number] = [56, 189, 248];

  try {
    const sample = document.createElement('canvas');
    sample.width = 28;
    sample.height = 28;
    const sCtx = sample.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(img, 0, 0, 28, 28);
      const data = sCtx.getImageData(0, 0, 28, 28).data;

      // Detect bright studio white/off-white cutout corners
      const corners = [
        [1, 1], [2, 1], [1, 2],
        [26, 1], [25, 1], [26, 2],
        [1, 26], [2, 26], [1, 25],
        [26, 26], [25, 26], [26, 25],
      ];
      let brightCount = 0;
      for (const [cx, cy] of corners) {
        const i = (cy * 28 + cx) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (data[i + 3] < 220 || lum > 224) brightCount++;
      }
      isBrightStudioBg = brightCount >= 9;

      // Sample center region for vibrant product accent colors
      let bestSat = -1;
      let secondSat = -1;
      let foundPrimary: [number, number, number] | null = null;
      let foundSecondary: [number, number, number] | null = null;

      for (let y = 6; y < 22; y++) {
        for (let x = 6; x < 22; x++) {
          const i = (y * 28 + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const sat = maxC - minC;
          if (sat > 38 && maxC > 60 && minC < 215) {
            if (sat > bestSat) {
              secondSat = bestSat;
              foundSecondary = foundPrimary;
              bestSat = sat;
              foundPrimary = [r, g, b];
            } else if (sat > secondSat) {
              secondSat = sat;
              foundSecondary = [r, g, b];
            }
          }
        }
      }

      if (foundPrimary) {
        accentRgb = directorAccentRgb ? mixRgb(foundPrimary, directorAccentRgb, 0.35) : foundPrimary;
      }
      if (foundSecondary) {
        secondaryRgb = foundSecondary;
      } else {
        secondaryRgb = [
          clamp(accentRgb[0] + 45, 40, 255),
          clamp(accentRgb[1] + 30, 60, 255),
          clamp(accentRgb[2] + 55, 90, 255),
        ];
      }
    }
  } catch {
    // Graceful fallback
  }

  return {
    img,
    url,
    aspect,
    isBrightStudioBg,
    accentRgb,
    secondaryRgb,
    blurredBackdrop: createPreblurredBackdrop(img),
  };
}

// ============================================================================
// Procedural Transition Whoosh SFX & DBuy Outro Brand Chime Injection
// ============================================================================
function overlayTransitionSfxIntoAudioBuffer(
  audioBuffer: AudioBuffer,
  cutTimesSec: number[],
  outroStartSec: number
): void {
  const sr = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;
  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;

  // 1. Crisp filtered air-whoosh / whip-snap SFX at each scene cut
  for (const cutTime of cutTimesSec) {
    const startSec = Math.max(0, cutTime - 0.12);
    const durSec = 0.24;
    const startIdx = Math.floor(startSec * sr);
    const len = Math.min(Math.floor(durSec * sr), totalSamples - startIdx);
    if (len <= 0) continue;

    let lp = 0;
    let seed = Math.floor(cutTime * 9973) + 1337;
    for (let i = 0; i < len; i++) {
      const p = i / len;
      // Fast bell envelope peaking right at the cut point
      const env = Math.sin(p * Math.PI) * Math.pow(1 - Math.abs(p - 0.5) * 1.4, 1.2);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2 - 1;
      const cutoff = 0.04 + Math.sin(p * Math.PI) * 0.22;
      lp += cutoff * (white - lp);
      const subHit = p > 0.42 && p < 0.72
        ? Math.sin((p - 0.42) * Math.PI * 14) * Math.exp(-(p - 0.42) * 12) * 0.16
        : 0;
      const s = clamp((lp * 0.22 * Math.max(0, env) + subHit) * 0.75, -0.35, 0.35);
      const idx = startIdx + i;
      left[idx] = clamp(left[idx] + s, -0.98, 0.98);
      if (right) {
        right[idx] = clamp(right[idx] + s * 0.96, -0.98, 0.98);
      }
    }
  }

  // 2. Uplifting crystalline brand shimmer chord at the 2.5s DBuy Outro reveal
  const chimeNotes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
  chimeNotes.forEach((freq, nIdx) => {
    const noteStart = outroStartSec + nIdx * 0.075;
    const noteDur = 1.15;
    const startIdx = Math.floor(noteStart * sr);
    const len = Math.min(Math.floor(noteDur * sr), totalSamples - startIdx);
    if (len <= 0 || startIdx < 0) return;

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const attack = Math.min(1, t / 0.018);
      const decay = Math.exp(-t * 3.4);
      const tone =
        (Math.sin(2 * Math.PI * freq * t) + 0.28 * Math.sin(2 * Math.PI * freq * 2 * t)) *
        0.048 *
        attack *
        decay;
      const idx = startIdx + i;
      left[idx] = clamp(left[idx] + tone, -0.98, 0.98);
      if (right) {
        right[idx] = clamp(right[idx] + tone, -0.98, 0.98);
      }
    }
  });
}

// ============================================================================
// Canvas Drawing Primitives & Official DBuy Brand Mark
// ============================================================================
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

/**
 * Draws the official DBuy 3D Blue Shopping Bag Logo with White Checkmark
 * matching src/components/BrandLogo.tsx (bag-cart) vector geometry.
 */
function drawOfficialDBuyBagLogo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  sizePx: number
) {
  const scale = sizePx / 48;
  ctx.save();
  ctx.translate(centerX - sizePx / 2, centerY - sizePx / 2);
  ctx.scale(scale, scale);

  const backHandle = new Path2D(
    'M19.5 14.5V10.5C19.5 6.8 22.4 4.2 26 4.2C29.6 4.2 32.5 6.8 32.5 10.5V14.5'
  );
  ctx.strokeStyle = '#0037B3';
  ctx.lineWidth = 3.1;
  ctx.lineCap = 'round';
  ctx.stroke(backHandle);

  const innerRim = new Path2D('M10 13.5L31 12.2L39.5 14.8L29.5 16Z');
  ctx.fillStyle = '#002B94';
  ctx.fill(innerRim);

  const sideGrad = ctx.createLinearGradient(29, 13, 41, 41);
  sideGrad.addColorStop(0, '#0052E8');
  sideGrad.addColorStop(1, '#0035B5');
  const sidePath = new Path2D(
    'M29.5 13.2L39.5 14.8L41.5 36.5C41.7 38.7 40.2 40.6 38 41L29.5 42.5V13.2Z'
  );
  ctx.fillStyle = sideGrad;
  ctx.fill(sidePath);

  const frontGrad = ctx.createLinearGradient(6, 42, 30, 12);
  frontGrad.addColorStop(0, '#19B5FE');
  frontGrad.addColorStop(0.55, '#0D92FF');
  frontGrad.addColorStop(1, '#0066FF');
  const frontPath = new Path2D(
    'M8.5 16.5C8.7 14.5 10.3 13 12.3 13H28.5C30.5 13 32.1 14.5 32.3 16.5L34 38.2C34.2 40.7 32.2 42.8 29.7 42.8H10.5C8 42.8 6 40.7 6.2 38.2L8.5 16.5Z'
  );
  ctx.fillStyle = frontGrad;
  ctx.fill(frontPath);

  const handleGrad = ctx.createLinearGradient(12, 4, 26, 16);
  handleGrad.addColorStop(0, '#1D63F0');
  handleGrad.addColorStop(1, '#003EC2');
  const frontHandle = new Path2D(
    'M13 16V11.2C13 7.2 15.9 4.5 19.6 4.5C23.3 4.5 26.2 7.2 26.2 11.2V16'
  );
  ctx.strokeStyle = handleGrad;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.stroke(frontHandle);

  const checkPath = new Path2D('M15.2 27.5L19.2 31.8L25.8 23.8');
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(checkPath);

  ctx.restore();
}

// ============================================================================
// Multi-Layer Studio Backdrop (Ambient Color Glow + Perspective Grid + Particles)
// ============================================================================
interface StudioParticle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftX: number;
  phase: number;
  alpha: number;
}

function generateStudioParticles(count: number): StudioParticle[] {
  const particles: StudioParticle[] = [];
  let seed = 42019;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < count; i++) {
    particles.push({
      x: rand(),
      y: rand(),
      radius: 1.5 + rand() * 4.5,
      speedY: 0.025 + rand() * 0.06,
      driftX: (rand() - 0.5) * 0.035,
      phase: rand() * Math.PI * 2,
      alpha: 0.16 + rand() * 0.36,
    });
  }
  return particles;
}

function renderDynamicStudioBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  accentRgb: [number, number, number],
  secondaryRgb: [number, number, number],
  blurredBackdrop: HTMLCanvasElement | null,
  visualTheme: CommercialVisualTheme,
  particles: StudioParticle[],
  bpm: number
) {
  const scaleFactor = Math.min(width, height) / 720;
  const beatPhase = (t * (bpm / 60)) % 1;
  const beatPulse = Math.pow(1 - beatPhase, 3);

  // Layer 1: Rich Base Studio Gradient matched to visual theme
  const baseGrad = ctx.createLinearGradient(0, 0, width * 0.35, height);
  if (visualTheme === 'lifestyle_home') {
    baseGrad.addColorStop(0, '#17141F');
    baseGrad.addColorStop(0.5, '#1F1B2C');
    baseGrad.addColorStop(1, '#0D0C14');
  } else if (visualTheme === 'minimalist_studio') {
    baseGrad.addColorStop(0, '#0B1325');
    baseGrad.addColorStop(0.5, '#13203A');
    baseGrad.addColorStop(1, '#070C17');
  } else {
    baseGrad.addColorStop(0, '#040814');
    baseGrad.addColorStop(0.5, '#091224');
    baseGrad.addColorStop(1, '#03060E');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Layer 2: Blurred Ambient Product Echo (2.5D Counter-Parallax)
  if (blurredBackdrop) {
    ctx.save();
    ctx.globalAlpha = visualTheme === 'tech_modern' ? 0.24 : 0.3;
    const parallaxX = Math.sin(t * 0.7) * width * 0.035;
    const parallaxY = Math.cos(t * 0.55) * height * 0.025;
    const drawScale = 1.18 + beatPulse * 0.03;
    const dw = width * drawScale;
    const dh = height * drawScale;
    ctx.drawImage(
      blurredBackdrop,
      (width - dw) / 2 + parallaxX,
      (height - dh) / 2 + parallaxY,
      dw,
      dh
    );
    ctx.restore();
  }

  // Layer 3: Pulsing Product-Matched Ambient Glow Orbs
  const orb1X = width * (0.28 + Math.sin(t * 0.85) * 0.14);
  const orb1Y = height * (0.3 + Math.cos(t * 0.65) * 0.08);
  const orb1R = Math.max(width, height) * (0.46 + beatPulse * 0.05);
  const orb1 = ctx.createRadialGradient(orb1X, orb1Y, 10, orb1X, orb1Y, orb1R);
  orb1.addColorStop(0, rgbStr(accentRgb, 0.34 + beatPulse * 0.08));
  orb1.addColorStop(0.5, rgbStr(accentRgb, 0.09));
  orb1.addColorStop(1, rgbStr(accentRgb, 0));
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, width, height);

  const orb2X = width * (0.74 + Math.cos(t * 0.7) * 0.12);
  const orb2Y = height * (0.68 + Math.sin(t * 0.6) * 0.08);
  const orb2R = Math.max(width, height) * 0.42;
  const orb2 = ctx.createRadialGradient(orb2X, orb2Y, 10, orb2X, orb2Y, orb2R);
  orb2.addColorStop(0, rgbStr(secondaryRgb, 0.24));
  orb2.addColorStop(0.55, rgbStr(secondaryRgb, 0.06));
  orb2.addColorStop(1, rgbStr(secondaryRgb, 0));
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, width, height);

  // Layer 4: Animated 3D Perspective Studio Grid (lower floor + subtle upper tech grid)
  ctx.save();
  const horizonY = height * 0.64;
  ctx.strokeStyle = rgbStr(accentRgb, 0.14 + beatPulse * 0.04);
  ctx.lineWidth = Math.max(1, 1.2 * scaleFactor);

  // Perspective radiating lines
  const gridCols = 10;
  for (let i = -gridCols; i <= gridCols; i++) {
    const topX = width / 2 + i * (width * 0.085);
    const botX = width / 2 + i * (width * 0.26);
    ctx.beginPath();
    ctx.moveTo(topX, horizonY);
    ctx.lineTo(botX, height);
    ctx.stroke();
  }

  // Forward-gliding perspective horizontal rings
  const gridRows = 8;
  const scrollOffset = (t * 0.55) % 1;
  for (let r = 0; r < gridRows; r++) {
    const depth = (r + scrollOffset) / gridRows;
    const easedDepth = depth * depth;
    const y = horizonY + easedDepth * (height - horizonY);
    ctx.globalAlpha = clamp(depth * 0.75, 0, 0.65);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Layer 5: Floating Luminous Studio Dust / Bokeh Particles
  ctx.save();
  for (const p of particles) {
    const px = ((p.x + t * p.driftX + Math.sin(t * 1.1 + p.phase) * 0.012) % 1 + 1) % 1;
    const py = ((p.y - t * p.speedY) % 1 + 1) % 1;
    const twinkle = 0.55 + 0.45 * Math.sin(t * 3.2 + p.phase);
    const x = px * width;
    const y = py * height;
    const rad = p.radius * scaleFactor * (0.9 + beatPulse * 0.25);

    ctx.globalAlpha = p.alpha * twinkle;
    ctx.fillStyle = p.phase > Math.PI ? '#FFFFFF' : rgbStr(accentRgb, 1);
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================================
// 2.5D / 3D Product Stage Renderer with 4 Dynamic Motion Choreography Styles
// ============================================================================
function renderAnimatedProductStage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  photo: PreparedMotionPhoto,
  motionStyle: CommercialMotionStyle,
  sceneProgress: number,
  sceneTimeSec: number,
  accentRgb: [number, number, number],
  transitionAlpha: number,
  isOutgoing: boolean,
  outgoingProgress: number,
  bpm: number
) {
  const isLandscape = width > height;
  const scaleFactor = Math.min(width, height) / 720;
  const beatPhase = (sceneTimeSec * (bpm / 60)) % 1;
  const beatHit = Math.pow(1 - beatPhase, 4);

  // Stage container geometry (hero product prominently framed in center-mid)
  const stageCenterX = width / 2;
  const stageCenterY = isLandscape ? height * 0.48 : height * 0.49;
  const maxStageW = isLandscape ? width * 0.46 : width * 0.82;
  const maxStageH = isLandscape ? height * 0.62 : height * 0.47;

  const photoAspect = photo.aspect;
  let cardW = maxStageW;
  let cardH = cardW / Math.max(0.55, Math.min(1.85, photoAspect));
  if (cardH > maxStageH) {
    cardH = maxStageH;
    cardW = cardH * Math.max(0.55, Math.min(1.85, photoAspect));
  }
  // Keep a sleek balanced minimum aspect ratio so cards feel sculptural
  cardW = Math.max(cardW, maxStageW * 0.72);
  cardH = Math.max(cardH, maxStageH * 0.68);

  const cornerR = 32 * scaleFactor;

  // Compute dynamic 2.5D / 3D transform parameters per motionStyle
  let tx = 0;
  let ty = Math.sin(sceneTimeSec * 2.6) * 8 * scaleFactor;
  let scaleX = 1;
  let scaleY = 1;
  let rotRad = 0;
  let skewX = 0;
  let skewY = 0;
  let shadowOffsetX = 0;
  let shadowOffsetY = 26 * scaleFactor;
  let ghostStrength = 0;
  let shockwaveProgress = -1;
  let lightSweepProgress = -1;

  const enterT = clamp(sceneTimeSec / 0.44, 0, 1);

  if (motionStyle === 'zoom_punch') {
    const punch = easeSpringOvershoot(enterT);
    const punchScale = lerp(0.58, 1.0, punch) + sceneProgress * 0.045 + beatHit * 0.022;
    scaleX = punchScale;
    scaleY = punchScale;
    ty += (1 - easeWhipOut(enterT)) * 45 * scaleFactor;
    rotRad = lerp(-0.045, 0.012, easeWhipOut(enterT)) + Math.sin(sceneTimeSec * 1.9) * 0.01;
    shockwaveProgress = clamp(sceneTimeSec / 0.65, 0, 1);
  } else if (motionStyle === 'whip_pan') {
    const whip = easeWhipOut(enterT);
    const direction = 1;
    tx = (1 - whip) * width * 0.85 * direction + lerp(-12, 16, sceneProgress) * scaleFactor;
    const velocity = Math.max(0, 1 - enterT * 1.65);
    skewX = -velocity * 0.22 * direction;
    scaleX = 1 + velocity * 0.08 + sceneProgress * 0.035;
    scaleY = 1 - velocity * 0.03 + sceneProgress * 0.035;
    ghostStrength = velocity;
  } else if (motionStyle === 'tilt_3d') {
    const enter = easeWhipOut(enterT);
    const tiltWave = Math.sin(sceneProgress * Math.PI * 1.4 - 0.55);
    const tiltAngle = tiltWave * 0.36; // simulated ~20 deg Y-axis 3D rotation
    scaleX = lerp(0.82, 1.02, enter) * (1 - Math.abs(tiltAngle) * 0.16);
    scaleY = lerp(0.84, 1.02, enter) * (1 + Math.abs(tiltAngle) * 0.02);
    skewY = tiltAngle * 0.14;
    rotRad = tiltAngle * 0.07;
    tx = tiltWave * 18 * scaleFactor;
    ty += (1 - enter) * 60 * scaleFactor;
    shadowOffsetX = -tiltWave * 36 * scaleFactor;
    shadowOffsetY = 30 * scaleFactor;
    lightSweepProgress = clamp((sceneProgress - 0.1) / 0.8, 0, 1);
  } else {
    // light_sweep
    const enter = easeWhipOut(enterT);
    const baseS = lerp(0.92, 1.04, enter) + Math.sin(sceneProgress * Math.PI) * 0.03;
    scaleX = baseS;
    scaleY = baseS;
    tx = Math.sin(sceneProgress * Math.PI * 1.2) * 14 * scaleFactor;
    rotRad = lerp(0.025, -0.02, sceneProgress);
    lightSweepProgress = clamp((sceneTimeSec - 0.15) / 1.4, 0, 1);
  }

  // Outgoing whip-cut exit animation
  if (isOutgoing) {
    const outEase = easeWhipIn(outgoingProgress);
    tx -= outEase * width * 0.72;
    skewX += outEase * 0.18;
    scaleX *= lerp(1, 0.88, outEase);
    scaleY *= lerp(1, 0.88, outEase);
  }

  // Expanding beat shockwave ring behind hero product (Zoom-Punch / Cut Hit)
  if (!isOutgoing && shockwaveProgress >= 0 && shockwaveProgress < 1) {
    ctx.save();
    const ringRadius = lerp(cardW * 0.35, Math.max(cardW, cardH) * 0.88, easeOutQuart(shockwaveProgress));
    ctx.globalAlpha = (1 - shockwaveProgress) * 0.55 * transitionAlpha;
    ctx.strokeStyle = rgbStr(accentRgb, 1);
    ctx.lineWidth = (1 - shockwaveProgress) * 10 * scaleFactor;
    ctx.beginPath();
    ctx.arc(stageCenterX, stageCenterY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Helper to draw the 2.5D product card at current transform
  const drawCardGeometry = (alphaOverride?: number, extraTx = 0) => {
    ctx.save();
    ctx.globalAlpha = clamp((alphaOverride ?? 1) * transitionAlpha, 0, 1);
    ctx.translate(stageCenterX + tx + extraTx, stageCenterY + ty);
    ctx.rotate(rotRad);
    ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0);

    const x = -cardW / 2;
    const y = -cardH / 2;

    // 1. Floating 3D Cast Shadow + Ambient Accent Glow behind card
    if (alphaOverride === undefined) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
      ctx.shadowBlur = 48 * scaleFactor;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
      ctx.fillStyle = photo.isBrightStudioBg ? '#F8FAFC' : '#0B1221';
      drawRoundedRect(ctx, x, y, cardW, cardH, cornerR);
      ctx.fill();
      ctx.restore();

      // Subtle glowing aura rim around the card
      ctx.save();
      ctx.shadowColor = rgbStr(accentRgb, 0.55);
      ctx.shadowBlur = 34 * scaleFactor;
      ctx.strokeStyle = rgbStr(accentRgb, 0.45);
      ctx.lineWidth = 2.5 * scaleFactor;
      drawRoundedRect(ctx, x, y, cardW, cardH, cornerR);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Clipped Card Surface + Product Image
    ctx.save();
    drawRoundedRect(ctx, x, y, cardW, cardH, cornerR);
    ctx.clip();

    if (photo.isBrightStudioBg) {
      // Premium soft ceramic-studio backing for crisp white-bg product photos
      const ceramic = ctx.createRadialGradient(0, -cardH * 0.1, cardW * 0.08, 0, 0, cardW * 0.85);
      ceramic.addColorStop(0, '#FFFFFF');
      ceramic.addColorStop(0.75, '#F8FAFC');
      ceramic.addColorStop(1, '#E2E8F0');
      ctx.fillStyle = ceramic;
      ctx.fillRect(x, y, cardW, cardH);

      const pad = 22 * scaleFactor;
      const availW = cardW - pad * 2;
      const availH = cardH - pad * 2;
      const containScale = Math.min(availW / photo.img.naturalWidth, availH / photo.img.naturalHeight);
      const dw = photo.img.naturalWidth * containScale;
      const dh = photo.img.naturalHeight * containScale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(photo.img, -dw / 2, -dh / 2, dw, dh);
    } else {
      // Full-bleed cover with gentle internal parallax zoom
      const coverScale =
        Math.max(cardW / photo.img.naturalWidth, cardH / photo.img.naturalHeight) *
        (1.04 + sceneProgress * 0.05);
      const dw = photo.img.naturalWidth * coverScale;
      const dh = photo.img.naturalHeight * coverScale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(photo.img, -dw / 2, -dh / 2, dw, dh);
    }

    // 3. Dynamic Volumetric Studio Light Sweep Sheen across surface
    if (alphaOverride === undefined && lightSweepProgress >= 0 && lightSweepProgress <= 1) {
      const sweepX = lerp(-cardW * 0.95, cardW * 0.95, easeInOutExpo(lightSweepProgress));
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const sheenGrad = ctx.createLinearGradient(
        sweepX - cardW * 0.28,
        -cardH * 0.6,
        sweepX + cardW * 0.28,
        cardH * 0.6
      );
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.16)');
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.42)');
      sheenGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.14)');
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.restore();
    }

    // Subtle glass top bevel highlight
    const bevel = ctx.createLinearGradient(0, y, 0, y + cardH * 0.28);
    bevel.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    bevel.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = bevel;
    ctx.fillRect(x, y, cardW, cardH * 0.28);

    ctx.restore();

    // 4. Crisp Glass Border Stroke
    if (alphaOverride === undefined) {
      const borderGrad = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
      borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
      borderGrad.addColorStop(0.5, rgbStr(accentRgb, 0.55));
      borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.24)');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 2.4 * scaleFactor;
      drawRoundedRect(ctx, x, y, cardW, cardH, cornerR);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Directional motion-blur ghost streaks during high-velocity Whip-Pan
  if (ghostStrength > 0.08) {
    drawCardGeometry(ghostStrength * 0.16, 46 * scaleFactor * ghostStrength);
    drawCardGeometry(ghostStrength * 0.26, 22 * scaleFactor * ghostStrength);
  }

  // Primary sharp hero card
  drawCardGeometry();
}

// ============================================================================
// Kinetic Feature Callout Badges + Bold TikTok/Shorts Word-by-Word Subtitles
// ============================================================================
function renderKineticCalloutsAndHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: CommercialScenePlan,
  sceneTimeSec: number,
  sceneDurationSec: number,
  globalTimeSec: number,
  mainDurationSec: number,
  accentRgb: [number, number, number],
  priceBannerText: string,
  includeWebLink: boolean
) {
  const isLandscape = width > height;
  const scaleFactor = Math.min(width, height) / 720;
  const padX = (isLandscape ? 54 : 40) * scaleFactor;

  // Top & bottom subtle readability scrims
  const topScrimH = height * (isLandscape ? 0.18 : 0.23);
  const topScrim = ctx.createLinearGradient(0, 0, 0, topScrimH);
  topScrim.addColorStop(0, 'rgba(4, 8, 18, 0.72)');
  topScrim.addColorStop(1, 'rgba(4, 8, 18, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, width, topScrimH);

  const botScrimH = height * (isLandscape ? 0.26 : 0.28);
  const botScrim = ctx.createLinearGradient(0, height - botScrimH, 0, height);
  botScrim.addColorStop(0, 'rgba(4, 8, 18, 0)');
  botScrim.addColorStop(0.55, 'rgba(4, 8, 18, 0.62)');
  botScrim.addColorStop(1, 'rgba(4, 8, 18, 0.9)');
  ctx.fillStyle = botScrim;
  ctx.fillRect(0, height - botScrimH, width, botScrimH);

  // Top-Left Official DBuy Brand Pill
  const topY = (isLandscape ? 42 : 60) * scaleFactor;
  ctx.save();
  drawOfficialDBuyBagLogo(ctx, padX + 18 * scaleFactor, topY, 36 * scaleFactor);
  ctx.font = `900 ${Math.round(21 * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DBuy', padX + 42 * scaleFactor, topY + 1 * scaleFactor);
  ctx.restore();

  // Top-Right Optional Price Offer Badge
  if (priceBannerText) {
    ctx.save();
    ctx.font = `800 ${Math.round(17 * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const priceW = ctx.measureText(priceBannerText).width + 32 * scaleFactor;
    const priceH = 38 * scaleFactor;
    const px = width - padX - priceW;
    const py = topY - priceH / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    drawRoundedRect(ctx, px, py, priceW, priceH, priceH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.lineWidth = 1.6 * scaleFactor;
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceBannerText, px + priceW / 2, topY + 1 * scaleFactor);
    ctx.restore();
  }

  // Animated Scene Feature Callout Badge + Kinetic Headline (Upper Zone)
  const badgeEnter = easeSpringOvershoot(clamp(sceneTimeSec / 0.36, 0, 1));
  const headEnter = easeWhipOut(clamp((sceneTimeSec - 0.08) / 0.38, 0, 1));
  const exitAlpha = clamp((sceneDurationSec - sceneTimeSec) / 0.18, 0, 1);

  const badgeText = sanitizeCommercialCopy(scene.calloutBadge || scene.roleLabel || '').toUpperCase();
  const headlineText = sanitizeCommercialCopy(scene.headline || '').toUpperCase();

  const headerAnchorY = isLandscape ? height * 0.13 : height * 0.145;

  if (badgeText) {
    ctx.save();
    ctx.globalAlpha = clamp(badgeEnter * exitAlpha, 0, 1);
    const badgeFontPx = Math.round((isLandscape ? 16 : 19) * scaleFactor);
    ctx.font = `900 ${badgeFontPx}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const textW = ctx.measureText(badgeText).width;
    const dotSpace = 22 * scaleFactor;
    const pillW = Math.min(width - padX * 2, textW + dotSpace + 38 * scaleFactor);
    const pillH = (isLandscape ? 38 : 44) * scaleFactor;

    ctx.translate(width / 2, headerAnchorY);
    const popScale = lerp(0.72, 1.0, badgeEnter);
    ctx.scale(popScale, popScale);

    // Glowing glassmorphic callout pill
    ctx.shadowColor = rgbStr(accentRgb, 0.55);
    ctx.shadowBlur = 22 * scaleFactor;
    ctx.fillStyle = 'rgba(8, 15, 32, 0.84)';
    drawRoundedRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = rgbStr(accentRgb, 0.92);
    ctx.lineWidth = 2 * scaleFactor;
    ctx.stroke();

    // Glowing live accent dot inside badge
    const dotX = -pillW / 2 + 20 * scaleFactor;
    ctx.fillStyle = rgbStr(accentRgb, 1);
    ctx.beginPath();
    ctx.arc(dotX, 0, 5.2 * scaleFactor, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, dotX + 14 * scaleFactor, 1 * scaleFactor, pillW - 44 * scaleFactor);
    ctx.restore();
  }

  // Bold Kinetic Scene Headline with Highlight Keyword Pop
  if (headlineText) {
    ctx.save();
    ctx.globalAlpha = clamp(headEnter * exitAlpha, 0, 1);
    const headFontPx = Math.round((isLandscape ? 34 : 42) * scaleFactor);
    ctx.font = `900 ${headFontPx}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    const slideY = (1 - headEnter) * 24 * scaleFactor;
    const headY = headerAnchorY + (isLandscape ? 48 : 58) * scaleFactor + slideY;
    const maxHeadW = width - padX * 2;
    const words = headlineText.split(/\s+/).filter(Boolean).slice(0, 6);
    const highlightTarget = (scene.highlightWord || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Measure total line width (shrink font slightly if needed so it stays crisp on 1 line)
    let activeFontPx = headFontPx;
    while (
      ctx.measureText(words.join(' ')).width > maxHeadW &&
      activeFontPx > Math.round(22 * scaleFactor)
    ) {
      activeFontPx -= 2;
      ctx.font = `900 ${activeFontPx}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    }

    const totalW = ctx.measureText(words.join(' ')).width;
    let cursorX = width / 2 - totalW / 2;
    const spaceW = ctx.measureText(' ').width;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (const w of words) {
      const cleanW = w.replace(/[^A-Z0-9]/g, '');
      const isHighlight = Boolean(highlightTarget) && cleanW === highlightTarget;
      ctx.lineWidth = 6 * scaleFactor;
      ctx.strokeStyle = 'rgba(4, 8, 18, 0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(w, cursorX, headY);

      ctx.fillStyle = isHighlight ? '#38BDF8' : '#FFFFFF';
      ctx.fillText(w, cursorX, headY);
      cursorX += ctx.measureText(w).width + spaceW;
    }
    ctx.restore();
  }

  // Subtle URL Watermark & Segmented Stories-Style Progress Bar
  if (includeWebLink) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round((isLandscape ? 14 : 16) * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.fillText('www.dbuystore.com', width / 2, height - (isLandscape ? 32 : 52) * scaleFactor);
    ctx.restore();
  }

  const barY = height - (isLandscape ? 14 : 22) * scaleFactor;
  const barW = width - padX * 2;
  const barH = 4.5 * scaleFactor;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  drawRoundedRect(ctx, padX, barY, barW, barH, barH / 2);
  ctx.fill();

  const fillW = Math.max(barH, barW * clamp(globalTimeSec / Math.max(0.1, mainDurationSec), 0, 1));
  const barGrad = ctx.createLinearGradient(padX, barY, padX + barW, barY);
  barGrad.addColorStop(0, '#0D92FF');
  barGrad.addColorStop(1, '#38BDF8');
  ctx.fillStyle = barGrad;
  drawRoundedRect(ctx, padX, barY, fillW, barH, barH / 2);
  ctx.fill();
}

/**
 * Bold TikTok / YouTube Shorts-style Word-by-Word Highlighted Subtitles.
 * Displays punchy 3-4 word phrases where the actively spoken word dynamically pops
 * inside a glowing accent pill!
 */
function renderWordByWordSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  sceneTimeSec: number,
  sceneDurationSec: number,
  accentRgb: [number, number, number]
) {
  const clean = sanitizeCommercialCopy(text);
  if (!clean) return;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return;

  const isLandscape = width > height;
  const scaleFactor = Math.min(width, height) / 720;

  // Weight each word's speaking window by character length so highlights match speech cadence
  const weights = words.map((w) => Math.max(2.5, w.length + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const speakStart = 0.08;
  const speakEnd = Math.max(speakStart + 0.5, sceneDurationSec - 0.1);
  const progress = clamp((sceneTimeSec - speakStart) / (speakEnd - speakStart), 0, 0.9999);

  let activeWordIdx = 0;
  let accum = 0;
  let activeWordLocalProgress = 0;
  for (let i = 0; i < words.length; i++) {
    const segStart = accum / totalWeight;
    accum += weights[i];
    const segEnd = accum / totalWeight;
    if (progress >= segStart && progress <= segEnd) {
      activeWordIdx = i;
      activeWordLocalProgress = clamp((progress - segStart) / Math.max(0.01, segEnd - segStart), 0, 1);
      break;
    }
  }

  // Group into viral short-form chunks of 4 words max per caption card
  const chunkSize = isLandscape ? 6 : 4;
  const chunkIndex = Math.floor(activeWordIdx / chunkSize);
  const chunkStart = chunkIndex * chunkSize;
  const chunkWords = words.slice(chunkStart, chunkStart + chunkSize);
  const localActiveIdx = activeWordIdx - chunkStart;

  const fontSize = Math.round((isLandscape ? 30 : 35) * scaleFactor);
  ctx.save();
  ctx.font = `900 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';

  const padX = (isLandscape ? 56 : 36) * scaleFactor;
  const maxRowW = width - padX * 2 - 24 * scaleFactor;
  const spaceW = ctx.measureText(' ').width * 1.25;

  // Split chunk into 1 or 2 balanced rows if needed
  const rows: Array<Array<{ word: string; idx: number; w: number }>> = [[]];
  let currentRowW = 0;
  chunkWords.forEach((word, i) => {
    const w = ctx.measureText(word).width;
    if (rows[rows.length - 1].length > 0 && currentRowW + spaceW + w > maxRowW && rows.length < 2) {
      rows.push([{ word, idx: i, w }]);
      currentRowW = w;
    } else {
      rows[rows.length - 1].push({ word, idx: i, w });
      currentRowW += (rows[rows.length - 1].length > 1 ? spaceW : 0) + w;
    }
  });

  const lineH = fontSize * 1.44;
  const totalBlockH = rows.length * lineH;
  const anchorY = height - (isLandscape ? 110 : 178) * scaleFactor - totalBlockH / 2;

  const exitFade = clamp((sceneDurationSec - sceneTimeSec) / 0.16, 0, 1);
  ctx.globalAlpha = exitFade;

  rows.forEach((row, rIdx) => {
    const rowW =
      row.reduce((sum, item) => sum + item.w, 0) + Math.max(0, row.length - 1) * spaceW;
    let x = width / 2 - rowW / 2;
    const y = anchorY + rIdx * lineH + lineH / 2;

    for (const item of row) {
      const isSpoken = item.idx === localActiveIdx;
      const isAlreadySpoken = item.idx < localActiveIdx;
      const wordCenterX = x + item.w / 2;

      ctx.save();
      ctx.translate(wordCenterX, y);

      if (isSpoken) {
        const pop = 1 + Math.sin(Math.min(1, activeWordLocalProgress * 3.5) * Math.PI) * 0.11;
        ctx.scale(pop, pop);

        // Glowing highlight pill behind actively spoken word
        const pillPadX = 14 * scaleFactor;
        const pillH = fontSize * 1.22;
        const pillW = item.w + pillPadX * 2;
        const pillGrad = ctx.createLinearGradient(-pillW / 2, -pillH / 2, pillW / 2, pillH / 2);
        pillGrad.addColorStop(0, '#0066FF');
        pillGrad.addColorStop(0.6, '#0D92FF');
        pillGrad.addColorStop(1, rgbStr(accentRgb, 1));

        ctx.shadowColor = 'rgba(13, 146, 255, 0.72)';
        ctx.shadowBlur = 18 * scaleFactor;
        ctx.fillStyle = pillGrad;
        drawRoundedRect(ctx, -pillW / 2, -pillH / 2, pillW, pillH, 12 * scaleFactor);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(item.word, 0, 1 * scaleFactor);
      } else {
        ctx.textAlign = 'center';
        ctx.lineWidth = 8 * scaleFactor;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(4, 8, 18, 0.92)';
        ctx.strokeText(item.word, 0, 1 * scaleFactor);

        ctx.fillStyle = isAlreadySpoken ? '#F8FAFC' : 'rgba(226, 232, 240, 0.88)';
        ctx.fillText(item.word, 0, 1 * scaleFactor);
      }

      ctx.restore();
      x += item.w + spaceW;
    }
  });

  ctx.restore();
}

// ============================================================================
// Branded 2.5-Second DBuy Outro Card (Official Bag Logo + Slogan + Glowing CTA)
// ============================================================================
function renderDBuyBrandedOutroCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  outroTimeSec: number,
  outroDurationSec: number,
  priceBannerText: string,
  alpha: number,
  particles: StudioParticle[]
) {
  const isLandscape = width > height;
  const scaleFactor = Math.min(width, height) / 720;

  const bagEnter = easeSpringOvershoot(clamp(outroTimeSec / 0.52, 0, 1));
  const textEnter = easeWhipOut(clamp((outroTimeSec - 0.14) / 0.48, 0, 1));
  const ctaEnter = easeSpringOvershoot(clamp((outroTimeSec - 0.34) / 0.52, 0, 1));
  const pulse = 0.5 + 0.5 * Math.sin(outroTimeSec * 4.8);

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);

  // Obsidian-navy flagship studio backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width * 0.45, height);
  bgGrad.addColorStop(0, '#040917');
  bgGrad.addColorStop(0.5, '#0B1730');
  bgGrad.addColorStop(1, '#030711');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Cobalt DBuy radial studio aura
  const auraR = Math.max(width, height) * 0.56;
  const auraGrad = ctx.createRadialGradient(width / 2, height * 0.4, 16, width / 2, height * 0.4, auraR);
  auraGrad.addColorStop(0, `rgba(13, 146, 255, ${0.32 + pulse * 0.08})`);
  auraGrad.addColorStop(0.45, 'rgba(0, 102, 255, 0.12)');
  auraGrad.addColorStop(1, 'rgba(4, 9, 23, 0)');
  ctx.fillStyle = auraGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle floating outro sparkles
  ctx.save();
  for (let i = 0; i < Math.min(18, particles.length); i++) {
    const p = particles[i];
    const px = ((p.x + outroTimeSec * p.driftX) % 1 + 1) % 1;
    const py = ((p.y - outroTimeSec * p.speedY * 1.4) % 1 + 1) % 1;
    ctx.globalAlpha = alpha * p.alpha * 0.7;
    ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px * width, py * height, p.radius * scaleFactor, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const cx = width / 2;
  const cy = height * (isLandscape ? 0.42 : 0.43);

  // 1. Official DBuy Blue Shopping Bag with White Checkmark
  const bagSize = (isLandscape ? 124 : 152) * scaleFactor;
  const bagSlideY = (1 - bagEnter) * 36 * scaleFactor;
  const bagScale = lerp(0.55, 1.0, bagEnter);

  ctx.save();
  ctx.translate(cx, cy - (isLandscape ? 66 : 118) * scaleFactor + bagSlideY);
  ctx.scale(bagScale, bagScale);

  // Radiant halo ring behind shopping bag
  const bagGlow = ctx.createRadialGradient(0, 0, 12 * scaleFactor, 0, 0, bagSize * 0.98);
  bagGlow.addColorStop(0, 'rgba(25, 181, 254, 0.44)');
  bagGlow.addColorStop(0.6, 'rgba(0, 102, 255, 0.14)');
  bagGlow.addColorStop(1, 'rgba(25, 181, 254, 0)');
  ctx.fillStyle = bagGlow;
  ctx.beginPath();
  ctx.arc(0, 0, bagSize * 0.98, 0, Math.PI * 2);
  ctx.fill();

  drawOfficialDBuyBagLogo(ctx, 0, 0, bagSize);
  ctx.restore();

  // 2. "DBuy" Wordmark & "Tech for a Better You" Slogan
  ctx.save();
  ctx.globalAlpha = clamp(alpha * textEnter, 0, 1);
  const titleY = cy + (isLandscape ? 28 : 10) * scaleFactor + (1 - textEnter) * 24 * scaleFactor;
  ctx.font = `900 ${Math.round((isLandscape ? 72 : 84) * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DBuy', cx, titleY);

  const sloganY = titleY + (isLandscape ? 56 : 66) * scaleFactor + (1 - textEnter) * 14 * scaleFactor;
  ctx.font = `600 ${Math.round((isLandscape ? 24 : 28) * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Tech for a Better You', cx, sloganY);

  // Expanding cyan light divider
  const divW = (isLandscape ? 148 : 168) * scaleFactor * textEnter;
  const divY = sloganY + (isLandscape ? 34 : 40) * scaleFactor;
  const divGrad = ctx.createLinearGradient(cx - divW / 2, divY, cx + divW / 2, divY);
  divGrad.addColorStop(0, 'rgba(25, 181, 254, 0)');
  divGrad.addColorStop(0.5, '#38BDF8');
  divGrad.addColorStop(1, 'rgba(25, 181, 254, 0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(cx - divW / 2, divY, divW, 3.5 * scaleFactor);
  ctx.restore();

  // 3. Optional Price Offer Pill
  const cleanPrice = sanitizeCommercialCopy(priceBannerText);
  let nextY = cy + (isLandscape ? 148 : 168) * scaleFactor;
  if (cleanPrice) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * ctaEnter, 0, 1);
    ctx.font = `800 ${Math.round((isLandscape ? 23 : 27) * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const priceW = ctx.measureText(cleanPrice).width + 48 * scaleFactor;
    const priceH = (isLandscape ? 48 : 54) * scaleFactor;
    const py = nextY + (1 - ctaEnter) * 18 * scaleFactor;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, cx - priceW / 2, py, priceW, priceH, 16 * scaleFactor);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 1.8 * scaleFactor;
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanPrice, cx, py + priceH / 2 + 1 * scaleFactor);
    ctx.restore();

    nextY += priceH + (isLandscape ? 22 : 30) * scaleFactor;
  }

  // 4. Glowing Animated CTA Pill: www.dbuystore.com (with continuous specular shimmer!)
  ctx.save();
  ctx.globalAlpha = clamp(alpha * ctaEnter, 0, 1);
  const urlText = 'www.dbuystore.com';
  const urlFontSize = Math.round((isLandscape ? 29 : 33) * scaleFactor);
  ctx.font = `900 ${urlFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const urlW = ctx.measureText(urlText).width + 78 * scaleFactor;
  const urlH = (isLandscape ? 66 : 76) * scaleFactor;
  const urlX = cx - urlW / 2;
  const urlY = nextY + (1 - ctaEnter) * 20 * scaleFactor;

  const pillGrad = ctx.createLinearGradient(urlX, urlY, urlX + urlW, urlY + urlH);
  pillGrad.addColorStop(0, '#0055FF');
  pillGrad.addColorStop(0.5, '#0D92FF');
  pillGrad.addColorStop(1, '#19B5FE');

  ctx.shadowColor = `rgba(13, 146, 255, ${0.52 + pulse * 0.25})`;
  ctx.shadowBlur = (28 + pulse * 14) * scaleFactor;
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, urlX, urlY, urlW, urlH, urlH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Glossy shimmer sweep across the CTA pill
  ctx.save();
  drawRoundedRect(ctx, urlX, urlY, urlW, urlH, urlH / 2);
  ctx.clip();
  const shimmerPhase = ((outroTimeSec - 0.5) / 1.1) % 1;
  if (outroTimeSec > 0.5) {
    const sx = urlX - urlW * 0.3 + shimmerPhase * urlW * 1.6;
    const shimGrad = ctx.createLinearGradient(sx - 50 * scaleFactor, urlY, sx + 50 * scaleFactor, urlY + urlH);
    shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimGrad;
    ctx.fillRect(urlX, urlY, urlW, urlH);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2 * scaleFactor;
  drawRoundedRect(ctx, urlX, urlY, urlW, urlH, urlH / 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(urlText, cx, urlY + urlH / 2 + 1 * scaleFactor);

  // Subtle SHOP NOW eyebrow below CTA pill
  ctx.font = `800 ${Math.round((isLandscape ? 14 : 16) * scaleFactor)}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.95)';
  ctx.fillText('SHOP NOW · OFFICIAL STORE', cx, urlY + urlH + (isLandscape ? 24 : 32) * scaleFactor);
  ctx.restore();

  // Subtle fade-to-dark polish on final 0.2s
  const fadeOut = clamp((outroDurationSec - outroTimeSec) / 0.2, 0, 1);
  if (fadeOut < 1) {
    ctx.fillStyle = `rgba(3, 7, 17, ${(1 - fadeOut) * 0.45})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

// ============================================================================
// High-FPS 60fps Video Encoders (WebCodecs H.264/AAC MP4 + MediaRecorder 60fps Fallback)
// ============================================================================
async function encode60fpsWithWebCodecs(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  fps: number,
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
    throw new Error('WebCodecs VideoEncoder unavailable.');
  }

  const bitrate = width >= 1080 || height >= 1920 ? 8_500_000 : 5_500_000;
  // Level 4.2 / 5.0 profiles support 1080p @ 60fps cleanly
  const videoCodecs = [
    'avc1.64002a',
    'avc1.640032',
    'avc1.4d002a',
    'avc1.640028',
    'avc1.4d0028',
    'avc1.420028',
  ];

  let chosenCodec: string | null = null;
  for (const codec of videoCodecs) {
    try {
      const support = await VideoEncoderCtor.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
      });
      if (support?.supported) {
        chosenCodec = codec;
        break;
      }
    } catch {
      // Try next profile
    }
  }

  if (!chosenCodec) {
    throw new Error(`No supported H.264 profile for ${width}x${height} @ ${fps}fps.`);
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
      ? { audio: { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS } }
      : {}),
    fastStart: 'in-memory',
  });

  let videoError: Error | null = null;
  const videoEncoder = new VideoEncoderCtor({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (err: any) => {
      videoError = err instanceof Error ? err : new Error(String(err));
    },
  });

  videoEncoder.configure({
    codec: chosenCodec,
    width,
    height,
    bitrate,
    framerate: fps,
    avc: { format: 'avc' },
  });

  const totalFrames = Math.ceil(totalDurationSec * fps);
  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let i = 0; i < totalFrames; i++) {
    if (videoError) throw videoError;
    const t = i / fps;
    drawFrameAt(t);

    const frame = new VideoFrameCtor(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();

    if (i % 12 === 0) {
      while (videoEncoder.encodeQueueSize > 12) {
        await new Promise((r) => setTimeout(r, 6));
      }
      const pct = Math.round(35 + (i / totalFrames) * 54);
      onProgress?.(
        pct,
        `Rendering ${fps}fps Motion Graphics · Frame ${i + 1} / ${totalFrames} (${width}×${height})`
      );
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (videoError) throw videoError;

  if (canEncodeAac) {
    onProgress?.(92, 'Encoding Voiceover & 17% Auto-Ducked Studio Beat (AAC)...');
    let audioError: Error | null = null;
    const audioEncoder = new AudioEncoderCtor({
      output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
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

  onProgress?.(97, 'Finalizing 60fps H.264 / AAC Commercial MP4...');
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function encode60fpsWithMediaRecorder(
  canvas: HTMLCanvasElement,
  fps: number,
  totalDurationSec: number,
  audioBuffer: AudioBuffer,
  drawFrameAt: (timeSec: number) => void,
  onProgress?: (pct: number, detail: string) => void
): Promise<Blob> {
  const stream = canvas.captureStream(fps);
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
  } catch {
    // Continue if live audio context unavailable
  }

  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const chosenMime =
    mimeCandidates.find(
      (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    ) || 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 6_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(
        new Blob(chunks, {
          type: chosenMime.startsWith('video/mp4') ? 'video/mp4' : 'video/webm',
        })
      );
    };
  });

  recorder.start(200);
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
      const pct = Math.round(35 + (elapsedSec / totalDurationSec) * 60);
      onProgress?.(
        pct,
        `Recording ${fps}fps Commercial (${elapsedSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s)`
      );
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
// Main Exported 60fps Pro Motion Graphics Commercial Video Compositor
// ============================================================================
interface ScheduledScene {
  index: number;
  scene: CommercialScenePlan;
  photo: PreparedMotionPhoto;
  motionStyle: CommercialMotionStyle;
  startSec: number;
  endSec: number;
  durationSec: number;
}

export async function renderProMotionCommercialVideo(
  params: {
    product: Product;
    selectedImages: string[];
    aspectRatio: CommercialAspectRatio;
    resolution?: CommercialResolutionPreset;
    visualTheme: CommercialVisualTheme;
    musicMood: CommercialMusicMood;
    scenes: CommercialScenePlan[];
    voiceoverScript: string;
    voiceoverAudioBase64?: string;
    priceBanner?: string;
    includeWebLinkOverlay?: boolean;
    accentColorHex?: string;
    modelUsed?: string;
  },
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<PromoVideoGenerationResult> {
  const aspectRatio: CommercialAspectRatio = params.aspectRatio === '16:9' ? '16:9' : '9:16';
  const resolution: CommercialResolutionPreset = params.resolution === '720p' ? '720p' : '1080p';
  const targetWidth =
    aspectRatio === '16:9'
      ? resolution === '1080p' ? 1920 : 1280
      : resolution === '1080p' ? 1080 : 720;
  const targetHeight =
    aspectRatio === '16:9'
      ? resolution === '1080p' ? 1080 : 720
      : resolution === '1080p' ? 1920 : 1280;

  const bpmMap: Record<CommercialMusicMood, number> = {
    upbeat_tech: 118,
    modern_corporate: 108,
    chill_lofi: 86,
    luxury_ambient: 76,
  };
  const bpm = bpmMap[params.musicMood] || 118;

  onProgress?.({
    stage: 'visuals',
    progressPct: 16,
    message: 'Loading & Analyzing Product Photos for 2.5D Motion Stage...',
    detail: 'Extracting accent colors & building pre-blurred ambient glow layers',
  });

  const directorAccentRgb = hexToRgb(params.accentColorHex);
  const uniqueUrls = Array.from(new Set(params.selectedImages.filter(Boolean))).slice(0, 6);
  const loadedImgs = await Promise.all(uniqueUrls.map((u) => loadImageElement(u)));
  const preparedPhotos: PreparedMotionPhoto[] = [];

  for (let i = 0; i < loadedImgs.length; i++) {
    const img = loadedImgs[i];
    if (img) {
      preparedPhotos.push(analyzePhotoForMotion(img, uniqueUrls[i], directorAccentRgb));
    }
  }

  if (preparedPhotos.length === 0) {
    throw new Error('Could not load any selected product photos for video rendering.');
  }

  const activeScenes =
    params.scenes && params.scenes.length > 0
      ? params.scenes
      : buildDirectorFallbackScenes(params.product, params.visualTheme);

  const rawSceneDuration = activeScenes.reduce((sum, s) => sum + Math.max(1.8, Number(s.durationSec) || 2.4), 0);

  onProgress?.({
    stage: 'audio',
    progressPct: 24,
    message: 'Mixing Voiceover & 17% Auto-Ducked Beat + Transition SFX...',
    detail: params.voiceoverAudioBase64
      ? 'Layering English Studio Voiceover + Beat + Whoosh Cuts + DBuy Outro Chime'
      : 'Synthesizing Studio Beat + Whoosh Cuts + 2.5s DBuy Outro Chime',
  });

  // Pass 1: Mix voiceover + beat to measure exact voiceover duration
  const initialAudio = await renderCommercialAudioMix({
    musicMood: params.musicMood,
    requestedDurationSec: rawSceneDuration + DBUY_OUTRO_DURATION_SEC,
    voiceoverAudioBase64: params.voiceoverAudioBase64,
    outroDurationSec: DBUY_OUTRO_DURATION_SEC,
  });

  // Keep tight high-converting ~12s pacing (~9.5s main + 2.5s DBuy Outro) or expand smoothly if voiceover needs more room
  const targetMainDurationSec = initialAudio.hasVoiceover
    ? Math.max(
        8.8,
        Math.min(13.5, Math.ceil((0.45 + initialAudio.voiceDurationSec + 0.3) * 10) / 10)
      )
    : Math.max(9.2, Math.min(11.0, Math.round(rawSceneDuration * 10) / 10));

  const totalDurationSec =
    Math.round((targetMainDurationSec + DBUY_OUTRO_DURATION_SEC) * 10) / 10;

  const finalAudio =
    Math.abs(initialAudio.finalDurationSec - totalDurationSec) > 0.15
      ? await renderCommercialAudioMix({
          musicMood: params.musicMood,
          requestedDurationSec: totalDurationSec,
          exactDurationSec: totalDurationSec,
          voiceoverAudioBase64: params.voiceoverAudioBase64,
          outroDurationSec: DBUY_OUTRO_DURATION_SEC,
        })
      : initialAudio;

  // Build exact scheduled scenes timeline scaled to targetMainDurationSec
  const scaleFactorDur = targetMainDurationSec / Math.max(1, rawSceneDuration);
  const scheduledScenes: ScheduledScene[] = [];
  let cursor = 0;

  // Distribute voiceover script sentences if scene voiceoverLine is empty
  const cleanFullScript = sanitizeSpokenVoiceoverScript(params.voiceoverScript || '');
  const fallbackSentences = cleanFullScript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = 0; i < activeScenes.length; i++) {
    const s = activeScenes[i];
    const dur =
      i === activeScenes.length - 1
        ? Math.max(1.6, targetMainDurationSec - cursor)
        : Math.max(1.6, (Number(s.durationSec) || 2.4) * scaleFactorDur);
    const photo = preparedPhotos[i % preparedPhotos.length];
    const motionStyle = normalizeMotionStyle(s.motionStyle || s.cameraMotion, i);
    const syncedLine =
      sanitizeCommercialCopy(s.voiceoverLine || '') ||
      fallbackSentences[i] ||
      (i === activeScenes.length - 1 ? fallbackSentences[fallbackSentences.length - 1] || cleanFullScript : '');

    scheduledScenes.push({
      index: i,
      scene: { ...s, voiceoverLine: syncedLine, motionStyle, cameraMotion: motionStyle },
      photo,
      motionStyle,
      startSec: cursor,
      endSec: cursor + dur,
      durationSec: dur,
    });
    cursor += dur;
  }

  // Inject crisp whoosh SFX on scene cuts & uplifting shimmer chime on 2.5s DBuy Outro
  const cutTimes = scheduledScenes.slice(1).map((s) => s.startSec);
  overlayTransitionSfxIntoAudioBuffer(finalAudio.audioBuffer, cutTimes, targetMainDurationSec);

  const formattedDefaultPrice =
    Number(params.product.price) > 0
      ? `Only $${(Math.round(Number(params.product.price) * 100) / 100).toFixed(
          Number.isInteger(Number(params.product.price)) ? 0 : 2
        )}`
      : '';
  const priceBannerText = sanitizeCommercialCopy(params.priceBanner ?? formattedDefaultPrice);
  const includeWebLink = params.includeWebLinkOverlay !== false;
  const particles = generateStudioParticles(30);

  const createFrameRenderer = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to initialize 2D motion graphics canvas.');

    const outroCrossfadeSec = 0.38;

    const drawFrameAt = (t: number) => {
      if (t >= targetMainDurationSec) {
        const outroT = clamp(t - targetMainDurationSec, 0, DBUY_OUTRO_DURATION_SEC);
        renderDBuyBrandedOutroCard(
          ctx,
          w,
          h,
          outroT,
          DBUY_OUTRO_DURATION_SEC,
          priceBannerText,
          1,
          particles
        );
        return;
      }

      // Find active scene
      let current = scheduledScenes[scheduledScenes.length - 1];
      for (const s of scheduledScenes) {
        if (t >= s.startSec && t < s.endSec) {
          current = s;
          break;
        }
      }

      const prev = current.index > 0 ? scheduledScenes[current.index - 1] : null;
      const sceneTimeSec = Math.max(0, t - current.startSec);
      const sceneProgress = clamp(sceneTimeSec / Math.max(0.1, current.durationSec), 0, 1);

      const inTransition = Boolean(prev && sceneTimeSec < SCENE_TRANSITION_SEC);
      const transProgress = inTransition ? clamp(sceneTimeSec / SCENE_TRANSITION_SEC, 0, 1) : 1;

      const activeAccent =
        inTransition && prev
          ? mixRgb(prev.photo.accentRgb, current.photo.accentRgb, easeWhipOut(transProgress))
          : current.photo.accentRgb;
      const activeSecondary =
        inTransition && prev
          ? mixRgb(prev.photo.secondaryRgb, current.photo.secondaryRgb, easeWhipOut(transProgress))
          : current.photo.secondaryRgb;

      // 1. Dynamic Multi-Layer Studio Background (Ambient Glow + Grid + Particles)
      renderDynamicStudioBackground(
        ctx,
        w,
        h,
        t,
        activeAccent,
        activeSecondary,
        current.photo.blurredBackdrop,
        params.visualTheme,
        particles,
        bpm
      );

      // 2. Outgoing Whip-Cut Product Card during crisp 0.28s transition
      if (inTransition && prev) {
        renderAnimatedProductStage(
          ctx,
          w,
          h,
          prev.photo,
          prev.motionStyle,
          1,
          prev.durationSec + sceneTimeSec,
          prev.photo.accentRgb,
          1 - transProgress,
          true,
          transProgress,
          bpm
        );
      }

      // 3. Incoming / Active 2.5D/3D Animated Product Stage
      renderAnimatedProductStage(
        ctx,
        w,
        h,
        current.photo,
        current.motionStyle,
        sceneProgress,
        sceneTimeSec,
        activeAccent,
        inTransition ? clamp(transProgress * 1.4, 0, 1) : 1,
        false,
        0,
        bpm
      );

      // Brief crisp optical flash bloom on scene cut
      if (inTransition && transProgress < 0.45) {
        const flashAlpha = Math.sin((transProgress / 0.45) * Math.PI) * 0.18;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 4. Animated Feature Callout Badge, Kinetic Headline & DBuy HUD
      renderKineticCalloutsAndHud(
        ctx,
        w,
        h,
        current.scene,
        sceneTimeSec,
        current.durationSec,
        t,
        targetMainDurationSec,
        activeAccent,
        priceBannerText,
        includeWebLink
      );

      // 5. Bold TikTok/Shorts Word-by-Word Highlighted Subtitles
      renderWordByWordSubtitles(
        ctx,
        w,
        h,
        current.scene.voiceoverLine,
        sceneTimeSec,
        current.durationSec,
        activeAccent
      );

      // 6. Smooth Crossfade into Branded 2.5-Second DBuy Outro
      const timeBeforeOutro = targetMainDurationSec - t;
      if (timeBeforeOutro < outroCrossfadeSec) {
        const outroBlend = easeInOutExpo(1 - timeBeforeOutro / outroCrossfadeSec);
        renderDBuyBrandedOutroCard(
          ctx,
          w,
          h,
          outroBlend * 0.22,
          DBUY_OUTRO_DURATION_SEC,
          priceBannerText,
          outroBlend,
          particles
        );
      }
    };

    return { canvas, drawFrameAt };
  };

  onProgress?.({
    stage: 'rendering',
    progressPct: 33,
    message: `Rendering ${aspectRatio} 60fps Pro Motion Graphics...`,
    detail: `${targetWidth}×${targetHeight} @ ${TARGET_FPS}fps · ${totalDurationSec.toFixed(1)}s Commercial + 2.5s DBuy Outro`,
  });

  let finalWidth = targetWidth;
  let finalHeight = targetHeight;
  let blob: Blob | null = null;
  let encoderUsed: 'webcodecs-mp4' | 'mediarecorder-fallback' = 'webcodecs-mp4';

  // Primary: WebCodecs 60fps H.264/AAC MP4 (with auto fallback from 1080p -> 720p if H.264 level capped)
  try {
    const primaryRenderer = createFrameRenderer(finalWidth, finalHeight);
    blob = await encode60fpsWithWebCodecs(
      primaryRenderer.canvas,
      finalWidth,
      finalHeight,
      TARGET_FPS,
      totalDurationSec,
      finalAudio.audioBuffer,
      primaryRenderer.drawFrameAt,
      (pct, detail) => {
        onProgress?.({
          stage: pct >= 90 ? 'encoding' : 'rendering',
          progressPct: pct,
          message:
            pct >= 90
              ? 'Finalizing 60fps H.264 / AAC Commercial MP4...'
              : `Rendering ${aspectRatio} 60fps Commercial...`,
          detail,
        });
      }
    );
  } catch (err1080) {
    if (resolution === '1080p') {
      try {
        finalWidth = aspectRatio === '16:9' ? 1280 : 720;
        finalHeight = aspectRatio === '16:9' ? 720 : 1280;
        const hdRenderer = createFrameRenderer(finalWidth, finalHeight);
        blob = await encode60fpsWithWebCodecs(
          hdRenderer.canvas,
          finalWidth,
          finalHeight,
          TARGET_FPS,
          totalDurationSec,
          finalAudio.audioBuffer,
          hdRenderer.drawFrameAt,
          (pct, detail) => {
            onProgress?.({
              stage: pct >= 90 ? 'encoding' : 'rendering',
              progressPct: pct,
              message:
                pct >= 90
                  ? 'Finalizing 60fps H.264 / AAC Commercial MP4...'
                  : `Rendering ${aspectRatio} 60fps HD Commercial...`,
              detail,
            });
          }
        );
      } catch (err720) {
        console.warn('[MOTION-COMPOSITOR] WebCodecs unavailable, using MediaRecorder 60fps:', err1080, err720);
      }
    } else {
      console.warn('[MOTION-COMPOSITOR] WebCodecs unavailable, using MediaRecorder 60fps:', err1080);
    }
  }

  // Seamless MediaRecorder 60fps fallback
  if (!blob) {
    encoderUsed = 'mediarecorder-fallback';
    finalWidth = aspectRatio === '16:9' ? 1280 : 720;
    finalHeight = aspectRatio === '16:9' ? 720 : 1280;
    const mrRenderer = createFrameRenderer(finalWidth, finalHeight);
    blob = await encode60fpsWithMediaRecorder(
      mrRenderer.canvas,
      TARGET_FPS,
      totalDurationSec,
      finalAudio.audioBuffer,
      mrRenderer.drawFrameAt,
      (pct, detail) => {
        onProgress?.({
          stage: 'rendering',
          progressPct: pct,
          message: `Recording ${aspectRatio} 60fps Commercial...`,
          detail,
        });
      }
    );
  }

  const safeSlug =
    sanitizeCommercialCopy(params.product.title || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'commercial';
  const ext = blob.type.includes('webm') ? 'webm' : 'mp4';

  const file = new File(
    [blob],
    `dbuy-ad-${safeSlug}-${aspectRatio.replace(':', 'x')}-60fps.${ext}`,
    { type: blob.type || 'video/mp4' }
  );

  onProgress?.({
    stage: 'done',
    progressPct: 100,
    message: `60fps AI Commercial Ready (${totalDurationSec.toFixed(1)}s ${aspectRatio})`,
    detail: `${(file.size / (1024 * 1024)).toFixed(2)} MB · ${finalWidth}×${finalHeight} @ ${TARGET_FPS}fps · ${
      finalAudio.hasVoiceover ? 'Voiceover (17% Duck)' : 'Studio Beat'
    } + 2.5s DBuy Outro`,
  });

  return {
    file,
    durationSec: totalDurationSec,
    width: finalWidth,
    height: finalHeight,
    aspectRatio,
    encoderUsed,
    hasVoiceover: finalAudio.hasVoiceover,
    autoDucked: finalAudio.autoDucked,
    engineUsed: 'gemini-director-motion',
    modelUsed: params.modelUsed || 'gemini-2.5-flash',
    fps: TARGET_FPS,
    hasBrandedOutro: true,
  };
}
