import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Product } from '../types';
import {
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  ENFORCED_NEGATIVE_PROMPT,
  sanitizeCommercialCopy,
} from './videoPromptOptimizer';
import {
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  renderCommercialAudioMix,
} from './tiktokVideoGenerator';

export const DBUY_OUTRO_DURATION_SEC = 2.5;
const FPS = 30;
const SAMPLE_RATE = 44100;
const CHANNELS = 2;

export interface InlineAiImagePayload {
  base64: string;
  mimeType: string;
}

export interface VeoClipGenerationResult {
  blob: Blob;
  mimeType: string;
  modelUsed: string;
  operationName: string;
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
      // Fall through to proxy
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

/**
 * Converts selected product photo URLs into clean, compact base64 JPEG payloads
 * for multimodal Gemini Director planning and Google Veo Image-to-Video input.
 */
export async function prepareProductImagesForAi(
  urls: string[],
  options?: {
    maxDim?: number;
    maxCount?: number;
    quality?: number;
    targetAspectRatio?: CommercialAspectRatio;
  }
): Promise<InlineAiImagePayload[]> {
  const maxDim = options?.maxDim ?? 768;
  const maxCount = options?.maxCount ?? 4;
  const quality = options?.quality ?? 0.88;
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, maxCount);

  const loaded = await Promise.all(uniqueUrls.map((u) => loadImageElement(u)));
  const payloads: InlineAiImagePayload[] = [];

  for (const img of loaded) {
    if (!img) continue;
    try {
      const canvas = document.createElement('canvas');
      let targetW = img.naturalWidth;
      let targetH = img.naturalHeight;

      if (options?.targetAspectRatio) {
        // Fit hero image onto clean studio frame matching target Veo aspect ratio
        if (options.targetAspectRatio === '9:16') {
          targetW = 720;
          targetH = 1280;
        } else {
          targetW = 1280;
          targetH = 720;
        }
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Clean neutral studio backdrop so product framing fits Veo's aspect ratio naturally
        const bgGrad = ctx.createLinearGradient(0, 0, 0, targetH);
        bgGrad.addColorStop(0, '#0F172A');
        bgGrad.addColorStop(0.5, '#1E293B');
        bgGrad.addColorStop(1, '#090D16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, targetW, targetH);

        // Draw subtle blurred background fill + sharp centered product
        const coverScale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
        const cw = img.naturalWidth * coverScale;
        const ch = img.naturalHeight * coverScale;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.filter = 'blur(28px)';
        ctx.drawImage(img, (targetW - cw) / 2, (targetH - ch) / 2, cw, ch);
        ctx.restore();

        const pad = Math.round(Math.min(targetW, targetH) * 0.06);
        const availW = targetW - pad * 2;
        const availH = targetH - pad * 2;
        const containScale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight);
        const dw = img.naturalWidth * containScale;
        const dh = img.naturalHeight * containScale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (targetW - dw) / 2, (targetH - dh) / 2, dw, dh);
      } else {
        const scale = Math.min(1, maxDim / Math.max(targetW, targetH));
        targetW = Math.max(64, Math.round(targetW * scale));
        targetH = Math.max(64, Math.round(targetH * scale));
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1] || '';
      if (base64.length > 100) {
        payloads.push({ base64, mimeType: 'image/jpeg' });
      }
    } catch {
      // Skip tainted/unreadable images gracefully
    }
  }

  return payloads;
}

/**
 * Step B Client — Launches Google Veo Image-to-Video via /api/video-ad/generate-video,
 * polls the long-running operation until complete, and downloads the MP4 Blob.
 */
export async function generateVeoVideoClip(
  params: {
    heroImageUrl: string;
    prompt: string;
    negativePrompt?: string;
    aspectRatio: CommercialAspectRatio;
    durationSeconds?: number;
  },
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<VeoClipGenerationResult> {
  onProgress?.({
    stage: 'veo',
    progressPct: 16,
    message: 'Preparing Hero Product Frame for Google Veo...',
    detail: `Formatting ${params.aspectRatio} Hero visual input for Image-to-Video`,
  });

  const preparedHero = await prepareProductImagesForAi([params.heroImageUrl], {
    maxCount: 1,
    quality: 0.9,
    targetAspectRatio: params.aspectRatio,
  });

  if (preparedHero.length === 0) {
    throw new Error('Could not load the selected Hero product photo for Google Veo.');
  }

  onProgress?.({
    stage: 'veo',
    progressPct: 22,
    message: 'Submitting Image-to-Video Job to Google Veo...',
    detail: 'Sending Hero frame + Gemini Director cinematic motion prompt',
  });

  const startRes = await fetch('/api/video-ad/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt || ENFORCED_NEGATIVE_PROMPT,
      aspectRatio: params.aspectRatio,
      durationSeconds: params.durationSeconds ?? 8,
      imageBase64: preparedHero[0].base64,
      imageMimeType: preparedHero[0].mimeType,
    }),
  });

  const startData = await startRes.json().catch(() => ({}));
  if (!startRes.ok || !startData?.success || !startData?.operationName) {
    const err: any = new Error(
      startData?.error || `Google Veo failed to start generation (HTTP ${startRes.status}).`
    );
    err.errorCode = startData?.errorCode;
    err.requiresBilling = Boolean(startData?.requiresBilling);
    throw err;
  }

  const operationName: string = startData.operationName;
  const modelUsed: string = startData.modelUsed || 'veo-2.0-generate-001';
  let status: string = startData.status || 'processing';
  let downloadUrl: string =
    startData.downloadUrl ||
    `/api/video-ad/generate-video?operationName=${encodeURIComponent(operationName)}&download=1`;
  let mimeType: string = startData.mimeType || 'video/mp4';

  const startTimeMs = Date.now();
  const maxWaitMs = 360_000; // 6 minutes max
  let pollAttempt = 0;

  while (status !== 'completed') {
    const elapsedSec = Math.round((Date.now() - startTimeMs) / 1000);
    if (Date.now() - startTimeMs > maxWaitMs) {
      throw new Error('Google Veo generation timed out after 6 minutes. Please try again.');
    }

    const simulatedPct = Math.min(62, Math.round(25 + (1 - Math.exp(-elapsedSec / 45)) * 38));
    onProgress?.({
      stage: 'veo',
      progressPct: simulatedPct,
      message: `Google Veo Generating Live AI Video (${elapsedSec}s)...`,
      detail: `Model: ${modelUsed} · Synthesizing realistic motion, lighting & cinematography`,
    });

    await new Promise((resolve) => setTimeout(resolve, pollAttempt < 2 ? 4000 : 5500));
    pollAttempt++;

    const pollRes = await fetch(
      `/api/video-ad/generate-video?operationName=${encodeURIComponent(operationName)}`
    );
    const pollData = await pollRes.json().catch(() => ({}));

    if (!pollRes.ok || pollData?.success === false || pollData?.status === 'failed') {
      throw new Error(
        pollData?.error || `Google Veo generation failed during polling (HTTP ${pollRes.status}).`
      );
    }

    status = pollData.status || 'processing';
    if (pollData.downloadUrl) downloadUrl = pollData.downloadUrl;
    if (pollData.mimeType) mimeType = pollData.mimeType;
  }

  onProgress?.({
    stage: 'veo',
    progressPct: 66,
    message: 'Downloading Generated Google Veo Video Clip...',
    detail: `${modelUsed} clip completed — preparing studio audio & DBuy outro`,
  });

  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    const maybeErr = await downloadRes.json().catch(() => null);
    throw new Error(
      maybeErr?.error || `Failed to download Veo video clip (HTTP ${downloadRes.status}).`
    );
  }

  const blob = await downloadRes.blob();
  if (!blob || blob.size < 1024) {
    throw new Error('Downloaded Google Veo video file was empty.');
  }

  return {
    blob,
    mimeType: blob.type || mimeType || 'video/mp4',
    modelUsed,
    operationName,
  };
}

// ============================================================================
// Canvas Drawing Helpers — Synced Subtitles & Official 2.5s DBuy Branded Outro
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

function drawCoverVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number
) {
  const vw = Math.max(1, video.videoWidth || width);
  const vh = Math.max(1, video.videoHeight || height);
  const videoRatio = vw / vh;
  const boxRatio = width / height;

  let drawW: number;
  let drawH: number;
  if (videoRatio > boxRatio) {
    drawH = height;
    drawW = drawH * videoRatio;
  } else {
    drawW = width;
    drawH = drawW / videoRatio;
  }

  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, drawX, drawY, drawW, drawH);
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

  // Back handle
  const backHandle = new Path2D(
    'M19.5 14.5V10.5C19.5 6.8 22.4 4.2 26 4.2C29.6 4.2 32.5 6.8 32.5 10.5V14.5'
  );
  ctx.strokeStyle = '#0037B3';
  ctx.lineWidth = 3.1;
  ctx.lineCap = 'round';
  ctx.stroke(backHandle);

  // Inner top rim
  const innerRim = new Path2D('M10 13.5L31 12.2L39.5 14.8L29.5 16Z');
  ctx.fillStyle = '#002B94';
  ctx.fill(innerRim);

  // 3D Right side gusset
  const sideGrad = ctx.createLinearGradient(29, 13, 41, 41);
  sideGrad.addColorStop(0, '#0052E8');
  sideGrad.addColorStop(1, '#0035B5');
  const sidePath = new Path2D(
    'M29.5 13.2L39.5 14.8L41.5 36.5C41.7 38.7 40.2 40.6 38 41L29.5 42.5V13.2Z'
  );
  ctx.fillStyle = sideGrad;
  ctx.fill(sidePath);

  // Front bag body
  const frontGrad = ctx.createLinearGradient(6, 42, 30, 12);
  frontGrad.addColorStop(0, '#19B5FE');
  frontGrad.addColorStop(0.55, '#0D92FF');
  frontGrad.addColorStop(1, '#0066FF');
  const frontPath = new Path2D(
    'M8.5 16.5C8.7 14.5 10.3 13 12.3 13H28.5C30.5 13 32.1 14.5 32.3 16.5L34 38.2C34.2 40.7 32.2 42.8 29.7 42.8H10.5C8 42.8 6 40.7 6.2 38.2L8.5 16.5Z'
  );
  ctx.fillStyle = frontGrad;
  ctx.fill(frontPath);

  // Front handle
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

  // Crisp White Checkmark
  const checkPath = new Path2D('M15.2 27.5L19.2 31.8L25.8 23.8');
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(checkPath);

  ctx.restore();
}

/**
 * Renders the crisp 2.5-second Branded DBuy Outro Card featuring:
 * - Official DBuy Blue Shopping Bag with White Checkmark
 * - "DBuy" wordmark + "Tech for a Better You" slogan
 * - Optional Price Offer pill
 * - Clear Call-To-Action URL: www.dbuystore.com
 */
function renderDBuyBrandedOutroCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  outroTimeSec: number,
  outroDurationSec: number,
  priceBannerText: string,
  alpha: number
) {
  const isLandscape = width > height;
  const enter = easeOutCubic(clamp(outroTimeSec / 0.55, 0, 1));
  const subEnter = easeOutCubic(clamp((outroTimeSec - 0.18) / 0.5, 0, 1));
  const ctaEnter = easeOutCubic(clamp((outroTimeSec - 0.35) / 0.5, 0, 1));
  const pulse = 0.5 + 0.5 * Math.sin(outroTimeSec * 4.2);

  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);

  // Deep premium obsidian-navy backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width * 0.4, height);
  bgGrad.addColorStop(0, '#050B18');
  bgGrad.addColorStop(0.5, '#0B162C');
  bgGrad.addColorStop(1, '#040812');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft DBuy cobalt-blue studio ambient aura
  const auraRadius = Math.max(width, height) * 0.52;
  const auraGrad = ctx.createRadialGradient(
    width / 2,
    height * 0.42,
    18,
    width / 2,
    height * 0.42,
    auraRadius
  );
  auraGrad.addColorStop(0, `rgba(13, 146, 255, ${0.26 + pulse * 0.06})`);
  auraGrad.addColorStop(0.45, 'rgba(0, 102, 255, 0.09)');
  auraGrad.addColorStop(1, 'rgba(5, 11, 24, 0)');
  ctx.fillStyle = auraGrad;
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height * (isLandscape ? 0.42 : 0.43);

  // 1. Official DBuy Shopping Bag Icon + Wordmark lockup
  const bagSize = isLandscape ? 116 : 138;
  const logoSlideY = (1 - enter) * 26;
  const logoScale = 0.88 + enter * 0.12;

  ctx.save();
  ctx.translate(cx, cy - (isLandscape ? 64 : 112) + logoSlideY);
  ctx.scale(logoScale, logoScale);
  // Subtle glow ring behind bag
  const bagGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, bagSize * 0.9);
  bagGlow.addColorStop(0, 'rgba(25, 181, 254, 0.34)');
  bagGlow.addColorStop(1, 'rgba(25, 181, 254, 0)');
  ctx.fillStyle = bagGlow;
  ctx.beginPath();
  ctx.arc(0, 0, bagSize * 0.9, 0, Math.PI * 2);
  ctx.fill();

  drawOfficialDBuyBagLogo(ctx, 0, 0, bagSize);
  ctx.restore();

  // "DBuy" Wordmark
  ctx.save();
  ctx.globalAlpha = clamp(alpha * enter, 0, 1);
  const titleY = cy + (isLandscape ? 26 : 6) + (1 - enter) * 20;
  ctx.font = `900 ${isLandscape ? 68 : 78}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DBuy', cx, titleY);

  // Slogan: "Tech for a Better You"
  ctx.globalAlpha = clamp(alpha * subEnter, 0, 1);
  const sloganY = titleY + (isLandscape ? 54 : 62) + (1 - subEnter) * 14;
  ctx.font = `600 ${isLandscape ? 24 : 26}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('Tech for a Better You', cx, sloganY);

  // Subtle horizontal accent divider
  const divW = (isLandscape ? 130 : 140) * subEnter;
  const divY = sloganY + (isLandscape ? 32 : 38);
  const divGrad = ctx.createLinearGradient(cx - divW / 2, divY, cx + divW / 2, divY);
  divGrad.addColorStop(0, 'rgba(25, 181, 254, 0)');
  divGrad.addColorStop(0.5, '#19B5FE');
  divGrad.addColorStop(1, 'rgba(25, 181, 254, 0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(cx - divW / 2, divY, divW, 3);
  ctx.restore();

  // Optional Closing Price Offer Badge
  const cleanPrice = sanitizeCommercialCopy(priceBannerText);
  let nextY = cy + (isLandscape ? 148 : 162);
  if (cleanPrice) {
    ctx.save();
    ctx.globalAlpha = clamp(alpha * ctaEnter, 0, 1);
    ctx.font = `800 ${isLandscape ? 22 : 25}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const priceW = ctx.measureText(cleanPrice).width + 44;
    const priceH = isLandscape ? 46 : 52;
    const py = nextY + (1 - ctaEnter) * 16;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, cx - priceW / 2, py, priceW, priceH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FDE047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cleanPrice, cx, py + priceH / 2 + 1);
    ctx.restore();

    nextY += priceH + (isLandscape ? 20 : 28);
  }

  // Call-To-Action URL Pill: www.dbuystore.com
  ctx.save();
  ctx.globalAlpha = clamp(alpha * ctaEnter, 0, 1);
  const urlText = 'www.dbuystore.com';
  const urlFontSize = isLandscape ? 28 : 31;
  ctx.font = `800 ${urlFontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const urlW = ctx.measureText(urlText).width + 68;
  const urlH = isLandscape ? 62 : 70;
  const urlY = nextY + (1 - ctaEnter) * 18;

  const pillGrad = ctx.createLinearGradient(cx - urlW / 2, urlY, cx + urlW / 2, urlY + urlH);
  pillGrad.addColorStop(0, '#0066FF');
  pillGrad.addColorStop(0.55, '#0D92FF');
  pillGrad.addColorStop(1, '#19B5FE');

  ctx.shadowColor = 'rgba(13, 146, 255, 0.45)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = pillGrad;
  drawRoundedRect(ctx, cx - urlW / 2, urlY, urlW, urlH, urlH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(urlText, cx, urlY + urlH / 2 + 1);

  // Subtle SHOP NOW eyebrow below URL
  ctx.font = `700 ${isLandscape ? 13 : 15}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.fillText('SHOP NOW · OFFICIAL STORE', cx, urlY + urlH + (isLandscape ? 22 : 28));
  ctx.restore();

  // Subtle fade-out on final 0.25s
  const fadeOut = clamp((outroDurationSec - outroTimeSec) / 0.22, 0, 1);
  if (fadeOut < 1) {
    ctx.fillStyle = `rgba(4, 8, 18, ${(1 - fadeOut) * 0.45})`;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

interface CaptionBeat {
  startSec: number;
  endSec: number;
  text: string;
  headline?: string;
}

function buildSyncedCaptionTimeline(
  voiceoverScript: string,
  scenes: CommercialScenePlan[],
  mainDurationSec: number
): CaptionBeat[] {
  const sceneLines = scenes
    .map((s) => ({
      text: sanitizeCommercialCopy(s.voiceoverLine || ''),
      headline: sanitizeCommercialCopy(s.headline || ''),
    }))
    .filter((item) => Boolean(item.text));

  let rawBeats: Array<{ text: string; headline?: string }> = sceneLines;

  if (rawBeats.length === 0) {
    const cleanScript = sanitizeCommercialCopy(voiceoverScript || '');
    const sentences = cleanScript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    rawBeats = sentences.map((text) => ({ text }));
  }

  if (rawBeats.length === 0) return [];

  const startOffset = 0.35;
  const usableWindow = Math.max(2, mainDurationSec - startOffset - 0.35);
  const wordWeights = rawBeats.map((b) => Math.max(3, b.text.split(/\s+/).length));
  const totalWeight = wordWeights.reduce((a, b) => a + b, 0);

  const beats: CaptionBeat[] = [];
  let cursor = startOffset;
  for (let i = 0; i < rawBeats.length; i++) {
    const dur = (wordWeights[i] / totalWeight) * usableWindow;
    const end = i === rawBeats.length - 1 ? startOffset + usableWindow : cursor + dur;
    beats.push({
      startSec: cursor,
      endSec: end,
      text: rawBeats[i].text,
      headline: rawBeats[i].headline,
    });
    cursor = end;
  }

  return beats;
}

function renderVeoFrameOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  mainDurationSec: number,
  captions: CaptionBeat[],
  includeWebLinkOverlay: boolean
) {
  const isLandscape = width > height;
  const padX = isLandscape ? 48 : 36;

  // Subtle top & bottom readability scrims (never obscuring the center hero product!)
  const topScrimH = isLandscape ? 92 : 136;
  const topScrim = ctx.createLinearGradient(0, 0, 0, topScrimH);
  topScrim.addColorStop(0, 'rgba(4, 8, 18, 0.56)');
  topScrim.addColorStop(1, 'rgba(4, 8, 18, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, width, topScrimH);

  const bottomScrimH = isLandscape ? 200 : 340;
  const bottomScrim = ctx.createLinearGradient(0, height - bottomScrimH, 0, height);
  bottomScrim.addColorStop(0, 'rgba(4, 8, 18, 0)');
  bottomScrim.addColorStop(0.5, 'rgba(4, 8, 18, 0.55)');
  bottomScrim.addColorStop(1, 'rgba(4, 8, 18, 0.85)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, height - bottomScrimH, width, bottomScrimH);

  // Subtle Top-Left Official DBuy Mini Brand Mark
  const topY = isLandscape ? 38 : 54;
  ctx.save();
  drawOfficialDBuyBagLogo(ctx, padX + 16, topY, 32);
  ctx.font = `800 ${isLandscape ? 18 : 20}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DBuy', padX + 38, topY + 1);
  ctx.restore();

  // Active Synced English Subtitle Caption Pill
  const activeCaption = captions.find((c) => t >= c.startSec && t < c.endSec);
  if (activeCaption) {
    const enter = easeOutCubic(clamp((t - activeCaption.startSec) / 0.24, 0, 1));
    const exit = easeOutCubic(clamp((activeCaption.endSec - t) / 0.2, 0, 1));
    const alpha = Math.min(enter, exit);
    const slideY = (1 - enter) * 10;

    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);

    const fontSize = isLandscape ? 24 : 26;
    ctx.font = `800 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const maxW = width - padX * 2 - 44;
    const lines = wrapTextLines(ctx, activeCaption.text, maxW, 3);
    if (lines.length > 0) {
      const lineH = fontSize * 1.32;
      const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const boxW = Math.min(width - padX * 2, maxLineW + 40);
      const boxH = lines.length * lineH + 22;
      const boxX = (width - boxW) / 2;
      const boxY = height - (isLandscape ? 92 : 148) - boxH + slideY;

      ctx.fillStyle = 'rgba(5, 11, 24, 0.8)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      let ly = boxY + 11;
      for (const line of lines) {
        ctx.fillText(line, width / 2, ly);
        ly += lineH;
      }
    }
    ctx.restore();
  }

  // Subtle URL watermark & progress bar
  if (includeWebLinkOverlay) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${isLandscape ? 14 : 16}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.fillText('www.dbuystore.com', width / 2, height - (isLandscape ? 36 : 56));
    ctx.restore();
  }

  // Thin playback progress bar
  const barY = height - (isLandscape ? 14 : 22);
  const barW = width - padX * 2;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  drawRoundedRect(ctx, padX, barY, barW, 4, 2);
  ctx.fill();
  const fillW = Math.max(4, barW * clamp(t / Math.max(0.1, mainDurationSec), 0, 1));
  ctx.fillStyle = '#0D92FF';
  drawRoundedRect(ctx, padX, barY, fillW, 4, 2);
  ctx.fill();
}

async function loadVideoElementFromBlob(blob: Blob): Promise<{
  video: HTMLVideoElement;
  objectUrl: string;
  durationSec: number;
}> {
  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Timed out decoding Google Veo clip.')), 20000);
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    video.onloadeddata = done;
    video.oncanplay = done;
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Browser could not decode the generated Google Veo MP4 stream.'));
    };
    video.load();
  });

  const durationSec =
    Number.isFinite(video.duration) && video.duration > 0.5 ? video.duration : 8.0;
  return { video, objectUrl, durationSec };
}

async function seekVideoToTime(video: HTMLVideoElement, targetTimeSec: number): Promise<void> {
  const safeTarget = clamp(targetTimeSec, 0, Math.max(0.05, (video.duration || 8) - 0.03));
  if (Math.abs(video.currentTime - safeTarget) < 0.002 && video.readyState >= 2) {
    return;
  }
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener('seeked', finish);
      resolve();
    };
    video.addEventListener('seeked', finish, { once: true });
    window.setTimeout(finish, 350);
    try {
      video.currentTime = safeTarget;
    } catch {
      finish();
    }
  });
}

async function encodeCompositedWithWebCodecs(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  totalDurationSec: number,
  audioBuffer: AudioBuffer,
  drawFrameAt: (timeSec: number) => Promise<void>,
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
        bitrate: width > 1000 ? 5_800_000 : 4_800_000,
        framerate: FPS,
      });
      if (support?.supported) {
        chosenVideoCodec = codec;
        break;
      }
    } catch {
      // Try next codec
    }
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
      ? { audio: { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: CHANNELS } }
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
    bitrate: width > 1000 ? 5_800_000 : 4_800_000,
    framerate: FPS,
    avc: { format: 'avc' },
  });

  const totalFrames = Math.ceil(totalDurationSec * FPS);
  const frameDurationUs = Math.round(1_000_000 / FPS);

  for (let i = 0; i < totalFrames; i++) {
    if (videoError) throw videoError;
    const t = i / FPS;
    await drawFrameAt(t);

    const frame = new VideoFrameCtor(canvas, {
      timestamp: i * frameDurationUs,
      duration: frameDurationUs,
    });
    videoEncoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
    frame.close();

    if (i % 8 === 0) {
      while (videoEncoder.encodeQueueSize > 10) {
        await new Promise((r) => setTimeout(r, 8));
      }
      const pct = Math.round(74 + (i / totalFrames) * 18);
      onProgress?.(pct, `Compositing frame ${i + 1} / ${totalFrames} (Veo + Subtitles + DBuy Outro)`);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (videoError) throw videoError;

  if (canEncodeAac) {
    onProgress?.(93, 'Encoding English Voiceover & Auto-Ducked Beat (AAC)...');
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

  onProgress?.(97, 'Finalizing H.264 / AAC Commercial MP4...');
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function encodeCompositedWithMediaRecorder(
  canvas: HTMLCanvasElement,
  totalDurationSec: number,
  audioBuffer: AudioBuffer,
  drawFrameAt: (timeSec: number) => Promise<void>,
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
  } catch {
    // Continue even if live audio routing fails
  }

  const mimeCandidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  const chosenMime =
    mimeCandidates.find(
      (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
    ) || 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 4_500_000,
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

  recorder.start(250);
  const startMs = performance.now();

  while (true) {
    const elapsedSec = (performance.now() - startMs) / 1000;
    if (elapsedSec >= totalDurationSec) {
      await drawFrameAt(totalDurationSec);
      break;
    }
    await drawFrameAt(elapsedSec);
    const pct = Math.round(74 + (elapsedSec / totalDurationSec) * 22);
    onProgress?.(pct, `Recording Veo Commercial (${elapsedSec.toFixed(1)}s / ${totalDurationSec.toFixed(1)}s)`);
    await new Promise((r) => setTimeout(r, 16));
  }

  recorder.stop();
  const blob = await stopped;
  if (audioCtx) {
    audioCtx.close().catch(() => {});
  }
  return blob;
}

/**
 * Step C — Combines the Google Veo AI Video clip with:
 * - English AI Voiceover (Gemini Studio TTS)
 * - Synced English Subtitle Captions
 * - Background Music Beat auto-ducked to 17% during speech
 * - Crisp 2.5-second DBuy Branded Outro Card (official blue shopping bag + white checkmark + "DBuy" + "Tech for a Better You" + www.dbuystore.com)
 */
export async function composeVeoCommercialVideo(
  params: {
    veoClip: VeoClipGenerationResult;
    product: Product;
    aspectRatio: CommercialAspectRatio;
    musicMood: CommercialMusicMood;
    scenes: CommercialScenePlan[];
    voiceoverScript: string;
    voiceoverAudioBase64?: string;
    priceBanner?: string;
    includeWebLinkOverlay?: boolean;
  },
  onProgress?: (progress: PromoVideoGenerationProgress) => void
): Promise<PromoVideoGenerationResult> {
  const aspectRatio: CommercialAspectRatio = params.aspectRatio === '16:9' ? '16:9' : '9:16';
  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;

  onProgress?.({
    stage: 'audio',
    progressPct: 68,
    message: 'Decoding Veo Clip & Mixing Auto-Ducked Studio Audio (17% Bed)...',
    detail: params.voiceoverAudioBase64
      ? 'Layering English AI Voiceover + Studio Beat + 2.5s DBuy Outro Sting'
      : 'Synthesizing Studio Beat + Synced Captions + 2.5s DBuy Outro',
  });

  const { video, objectUrl, durationSec: veoRawDurationSec } = await loadVideoElementFromBlob(
    params.veoClip.blob
  );

  try {
    // First pass: decode voiceover duration to align Veo clip cleanly before the 2.5s DBuy Outro
    const initialAudio = await renderCommercialAudioMix({
      musicMood: params.musicMood,
      requestedDurationSec: veoRawDurationSec + DBUY_OUTRO_DURATION_SEC,
      voiceoverAudioBase64: params.voiceoverAudioBase64,
      outroDurationSec: DBUY_OUTRO_DURATION_SEC,
    });

    // Main commercial video spans at least the Veo clip (typically 8s) and extends smoothly up to ~12.5s if voiceover runs longer
    const targetMainDurationSec = initialAudio.hasVoiceover
      ? Math.max(
          veoRawDurationSec,
          Math.min(12.5, Math.ceil((0.4 + initialAudio.voiceDurationSec + 0.35) * 10) / 10)
        )
      : Math.max(7.5, Math.min(10.5, veoRawDurationSec));

    const totalDurationSec =
      Math.round((targetMainDurationSec + DBUY_OUTRO_DURATION_SEC) * 10) / 10;

    // Re-render audio if exact total duration changed by > 0.15s
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

    const captions = buildSyncedCaptionTimeline(
      params.voiceoverScript,
      params.scenes,
      targetMainDurationSec
    );

    const formattedDefaultPrice =
      Number(params.product.price) > 0
        ? `Only $${(Math.round(Number(params.product.price) * 100) / 100).toFixed(
            Number.isInteger(Number(params.product.price)) ? 0 : 2
          )}`
        : '';
    const priceBannerText = sanitizeCommercialCopy(params.priceBanner ?? formattedDefaultPrice);
    const includeWebLink = params.includeWebLinkOverlay !== false;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Failed to initialize 2D compositing canvas.');
    }

    const outroCrossfadeSec = 0.45;
    const drawFrameAt = async (t: number) => {
      ctx.fillStyle = '#050B18';
      ctx.fillRect(0, 0, width, height);

      if (t < targetMainDurationSec) {
        // Map playback smoothly across the full Veo video clip (gentle commercial slow-motion if voiceover is longer than 8s)
        const sourceTime = (t / targetMainDurationSec) * Math.max(0.1, veoRawDurationSec - 0.04);
        await seekVideoToTime(video, sourceTime);
        drawCoverVideoFrame(ctx, video, width, height);
        renderVeoFrameOverlays(
          ctx,
          width,
          height,
          t,
          targetMainDurationSec,
          captions,
          includeWebLink
        );

        // Smooth crossfade into DBuy Branded Outro during final 0.45s of Veo clip
        const timeBeforeOutro = targetMainDurationSec - t;
        if (timeBeforeOutro < outroCrossfadeSec) {
          const outroBlend = easeInOutCubic(1 - timeBeforeOutro / outroCrossfadeSec);
          renderDBuyBrandedOutroCard(
            ctx,
            width,
            height,
            outroBlend * 0.25,
            DBUY_OUTRO_DURATION_SEC,
            priceBannerText,
            outroBlend
          );
        }
      } else {
        // Crisp 2.5-second Branded DBuy Outro Card
        const outroT = clamp(t - targetMainDurationSec, 0, DBUY_OUTRO_DURATION_SEC);
        renderDBuyBrandedOutroCard(
          ctx,
          width,
          height,
          outroT,
          DBUY_OUTRO_DURATION_SEC,
          priceBannerText,
          1
        );
      }
    };

    onProgress?.({
      stage: 'rendering',
      progressPct: 73,
      message: `Compositing ${aspectRatio} Google Veo Video + 2.5s DBuy Outro...`,
      detail: `Encoding ${totalDurationSec.toFixed(1)}s MP4 (${width}×${height} @ ${FPS}fps)`,
    });

    let blob: Blob;
    let encoderUsed: 'webcodecs-mp4' | 'mediarecorder-fallback' = 'webcodecs-mp4';

    try {
      blob = await encodeCompositedWithWebCodecs(
        canvas,
        width,
        height,
        totalDurationSec,
        finalAudio.audioBuffer,
        drawFrameAt,
        (pct, detail) => {
          onProgress?.({
            stage: pct >= 92 ? 'encoding' : 'rendering',
            progressPct: pct,
            message:
              pct >= 92
                ? 'Finalizing H.264 / AAC Commercial MP4...'
                : `Compositing ${aspectRatio} Veo Commercial...`,
            detail,
          });
        }
      );
    } catch (webCodecsErr) {
      console.warn('[VEO-COMPOSITOR] WebCodecs unavailable, falling back to MediaRecorder:', webCodecsErr);
      encoderUsed = 'mediarecorder-fallback';
      blob = await encodeCompositedWithMediaRecorder(
        canvas,
        totalDurationSec,
        finalAudio.audioBuffer,
        drawFrameAt,
        (pct, detail) => {
          onProgress?.({
            stage: 'rendering',
            progressPct: pct,
            message: `Recording ${aspectRatio} Veo Commercial...`,
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
      `dbuy-veo-${safeSlug}-${aspectRatio.replace(':', 'x')}.${ext}`,
      { type: blob.type || 'video/mp4' }
    );

    onProgress?.({
      stage: 'done',
      progressPct: 100,
      message: `Google Veo Commercial Ready (${totalDurationSec.toFixed(1)}s ${aspectRatio})`,
      detail: `${(file.size / (1024 * 1024)).toFixed(2)} MB · ${params.veoClip.modelUsed} + ${
        finalAudio.hasVoiceover ? 'Voiceover (17% Duck)' : 'Studio Beat'
      } + 2.5s DBuy Outro`,
    });

    return {
      file,
      durationSec: totalDurationSec,
      width,
      height,
      aspectRatio,
      encoderUsed,
      hasVoiceover: finalAudio.hasVoiceover,
      autoDucked: finalAudio.autoDucked,
      engineUsed: 'google-veo',
      modelUsed: params.veoClip.modelUsed,
      hasBrandedOutro: true,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
