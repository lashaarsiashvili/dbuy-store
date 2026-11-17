import { Product } from '../types';
import {
  buildLifestyleProductHook,
  buildLuxurySocialPricingLine,
  extractTopProductHighlights,
  SOCIAL_SHIPPING_TRUST_LINE,
} from './instagramApi';

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY';

export interface TikTokConnectionStatus {
  configured: boolean;
  connected: boolean;
  openId?: string;
  displayName?: string;
  avatarUrl?: string;
  scope?: string;
  expiresAt?: number;
  redirectUri?: string;
  requiresReconnect?: boolean;
  error?: string;
}

export interface TikTokCreatorInfo {
  creatorUsername?: string;
  creatorNickname?: string;
  creatorAvatarUrl?: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  maxVideoPostDurationSec?: number;
  duetDisabled?: boolean;
  commentDisabled?: boolean;
  stitchDisabled?: boolean;
}

export type TikTokPublishStageKey =
  | 'idle'
  | 'initializing'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'error';

export interface TikTokPublishProgress {
  stage: TikTokPublishStageKey;
  progressPct: number;
  message: string;
  detail?: string;
}

export interface PublishTikTokVideoParams {
  file?: File | null;
  videoUrl?: string;
  caption: string;
  privacyLevel: TikTokPrivacyLevel;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
}

export interface PublishTikTokVideoResult {
  success: boolean;
  publishId?: string;
  status?: string;
  publicalyAvailablePostId?: string[];
  error?: string;
  requiresReconnect?: boolean;
}

const MAX_TIKTOK_CAPTION_LENGTH = 2200;
const SINGLE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024; // 20 MB single chunk upload
const MULTI_CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per chunk for larger MP4 files

/**
 * Generates an editable TikTok video caption matching FB/IG store pattern
 * (title, short highlights, pricing, and https://www.dbuystore.com product link).
 */
export function buildTikTokProductCaption(
  product: Product,
  variantIndex = 0,
  isKa = false
): string {
  const title =
    (isKa ? product.titleKa || product.title : product.title) || 'Featured Essential';
  const highlights = extractTopProductHighlights(product, isKa);
  const hook = buildLifestyleProductHook(title, highlights, variantIndex, isKa);
  const shortSummary = highlights.slice(0, 2).map((item) => `✓ ${item}`).join('\n');
  const priceLine = buildLuxurySocialPricingLine(product, isKa);
  const productUrl = `https://www.dbuystore.com/b/${product.id}`;

  const raw = isKa
    ? `${title}\n\n` +
      `${hook}\n\n` +
      `${shortSummary}\n\n` +
      `${priceLine}\n` +
      `${SOCIAL_SHIPPING_TRUST_LINE}\n\n` +
      `🛒 შეუკვეთეთ: ${productUrl}\n\n` +
      `#DBUYStore #TikTokMadeMeBuyIt #TechFinds #SmartGadgets #TrendingNow`
    : `${title}\n\n` +
      `${hook}\n\n` +
      `${shortSummary}\n\n` +
      `${priceLine}\n` +
      `${SOCIAL_SHIPPING_TRUST_LINE}\n\n` +
      `🛒 Shop now: ${productUrl}\n\n` +
      `#DBUYStore #TikTokMadeMeBuyIt #TechFinds #CuratedLiving #TrendingNow`;

  return raw.slice(0, MAX_TIKTOK_CAPTION_LENGTH);
}

export function normalizeProductVideoUrl(rawUrl: string): string {
  const clean = (rawUrl || '').trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (clean.includes('/uploads/')) {
      const uploadPath = clean.substring(clean.indexOf('/uploads/'));
      return `https://www.dbuystore.com${uploadPath}`;
    }
    return clean;
  }
  if (clean.startsWith('/')) {
    return `https://www.dbuystore.com${clean}`;
  }
  return `https://www.dbuystore.com/${clean}`;
}

export async function checkTikTokConnectionStatus(): Promise<TikTokConnectionStatus> {
  try {
    const res = await fetch('/api/tiktok/status', { cache: 'no-store' });
    const json: any = await res.json().catch(() => null);
    if (json) {
      return {
        configured: Boolean(json.configured),
        connected: Boolean(json.connected),
        openId: json.openId,
        displayName: json.displayName,
        avatarUrl: json.avatarUrl,
        scope: json.scope,
        expiresAt: json.expiresAt,
        redirectUri: json.redirectUri,
        requiresReconnect: Boolean(json.requiresReconnect),
        error: json.error,
      };
    }
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      error: err?.message || 'Unable to verify TikTok connection status.',
    };
  }

  return {
    configured: false,
    connected: false,
    error: 'TikTok status endpoint is unavailable.',
  };
}

export async function getTikTokAuthUrl(): Promise<{
  success: boolean;
  url?: string;
  redirectUri?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/tiktok/auth-url', { cache: 'no-store' });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success || !json?.url) {
      return {
        success: false,
        redirectUri: json?.redirectUri,
        error: json?.error || 'Could not generate TikTok OAuth URL.',
      };
    }
    return {
      success: true,
      url: json.url,
      redirectUri: json.redirectUri,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error generating TikTok authorization URL.',
    };
  }
}

export async function disconnectTikTokAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/tiktok/disconnect', { method: 'POST' });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.error || 'Failed to disconnect TikTok account.',
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error disconnecting TikTok account.',
    };
  }
}

export async function fetchTikTokCreatorInfo(): Promise<{
  success: boolean;
  data?: TikTokCreatorInfo;
  requiresReconnect?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/tiktok/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'creator-info' }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        requiresReconnect: Boolean(json?.requiresReconnect),
        error: json?.error || 'Failed to load TikTok creator settings.',
      };
    }
    return {
      success: true,
      data: {
        creatorUsername: json.creatorUsername,
        creatorNickname: json.creatorNickname,
        creatorAvatarUrl: json.creatorAvatarUrl,
        privacyLevelOptions: Array.isArray(json.privacyLevelOptions)
          ? json.privacyLevelOptions
          : ['SELF_ONLY'],
        maxVideoPostDurationSec: json.maxVideoPostDurationSec,
        duetDisabled: Boolean(json.duetDisabled),
        commentDisabled: Boolean(json.commentDisabled),
        stitchDisabled: Boolean(json.stitchDisabled),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error fetching TikTok creator info.',
    };
  }
}

async function callTikTokPublishAction(payload: Record<string, any>) {
  const res = await fetch('/api/tiktok/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok && Boolean(json?.success), status: res.status, data: json };
}

export async function publishVideoToTikTok(
  params: PublishTikTokVideoParams,
  onProgress?: (progress: TikTokPublishProgress) => void
): Promise<PublishTikTokVideoResult> {
  const cleanCaption = (params.caption || '').trim().slice(0, MAX_TIKTOK_CAPTION_LENGTH);
  const useFileUpload = Boolean(params.file);
  const cleanUrl = (params.videoUrl || '').trim();

  if (!useFileUpload && !cleanUrl) {
    return {
      success: false,
      error: 'Please select an MP4 video file or provide a valid public MP4 URL.',
    };
  }

  try {
    let publishId = '';

    if (useFileUpload && params.file) {
      const file = params.file;
      const videoSize = file.size;
      if (videoSize <= 0) {
        return { success: false, error: 'Selected MP4 video file is empty.' };
      }

      const isSingleChunk = videoSize <= SINGLE_UPLOAD_THRESHOLD_BYTES;
      const chunkSize = isSingleChunk ? videoSize : MULTI_CHUNK_SIZE_BYTES;
      const totalChunkCount = isSingleChunk
        ? 1
        : Math.max(1, Math.floor(videoSize / chunkSize));

      onProgress?.({
        stage: 'initializing',
        progressPct: 8,
        message: 'Initializing TikTok video upload...',
        detail: 'Calling TikTok /v2/post/publish/video/init/',
      });

      const initRes = await callTikTokPublishAction({
        action: 'init-upload',
        caption: cleanCaption,
        privacyLevel: params.privacyLevel || 'SELF_ONLY',
        disableComment: Boolean(params.disableComment),
        disableDuet: Boolean(params.disableDuet),
        disableStitch: Boolean(params.disableStitch),
        videoSize,
        chunkSize,
        totalChunkCount,
      });

      if (!initRes.ok || !initRes.data?.publishId || !initRes.data?.uploadUrl) {
        const errMsg = initRes.data?.error || 'Failed to initialize TikTok video upload.';
        onProgress?.({ stage: 'error', progressPct: 0, message: errMsg });
        return {
          success: false,
          requiresReconnect: Boolean(initRes.data?.requiresReconnect),
          error: errMsg,
        };
      }

      publishId = initRes.data.publishId;
      const uploadUrl: string = initRes.data.uploadUrl;
      const contentType = file.type && file.type.startsWith('video/') ? file.type : 'video/mp4';

      for (let i = 0; i < totalChunkCount; i++) {
        const start = i * chunkSize;
        // Final chunk absorbs any trailing bytes per TikTok Content Posting API spec
        const endExclusive = i === totalChunkCount - 1 ? videoSize : Math.min(videoSize, start + chunkSize);
        const lastByte = endExclusive - 1;
        const chunkBlob = file.slice(start, endExclusive);
        const contentRange = `bytes ${start}-${lastByte}/${videoSize}`;

        const basePct = 15 + Math.round((i / totalChunkCount) * 65);
        onProgress?.({
          stage: 'uploading',
          progressPct: basePct,
          message:
            totalChunkCount === 1
              ? 'Uploading MP4 video to TikTok...'
              : `Uploading video chunk ${i + 1} of ${totalChunkCount}...`,
          detail: `${Math.round((endExclusive / (1024 * 1024)) * 10) / 10} MB / ${Math.round((videoSize / (1024 * 1024)) * 10) / 10} MB`,
        });

        const chunkBuffer = await chunkBlob.arrayBuffer();
        const putRes = await fetch('/api/tiktok/upload-chunk', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-tiktok-upload-url': uploadUrl,
            'x-content-range': contentRange,
            'x-video-content-type': contentType,
          },
          body: chunkBuffer,
        });
        const putJson: any = await putRes.json().catch(() => ({}));
        if (!putRes.ok || !putJson?.success) {
          const errMsg = putJson?.error || `Video chunk ${i + 1} upload failed.`;
          onProgress?.({ stage: 'error', progressPct: basePct, message: errMsg });
          return {
            success: false,
            error: errMsg,
          };
        }

        const donePct = 15 + Math.round(((i + 1) / totalChunkCount) * 65);
        onProgress?.({
          stage: 'uploading',
          progressPct: donePct,
          message:
            i + 1 === totalChunkCount
              ? 'Video upload complete. Processing on TikTok...'
              : `Uploaded chunk ${i + 1} of ${totalChunkCount}`,
        });
      }
    } else {
      onProgress?.({
        stage: 'initializing',
        progressPct: 20,
        message: 'Submitting MP4 URL to TikTok...',
        detail: 'Calling TikTok Content Posting API (PULL_FROM_URL)',
      });

      const initUrlRes = await callTikTokPublishAction({
        action: 'init-url',
        caption: cleanCaption,
        privacyLevel: params.privacyLevel || 'SELF_ONLY',
        disableComment: Boolean(params.disableComment),
        disableDuet: Boolean(params.disableDuet),
        disableStitch: Boolean(params.disableStitch),
        videoUrl: cleanUrl,
      });

      if (!initUrlRes.ok || !initUrlRes.data?.publishId) {
        const errMsg = initUrlRes.data?.error || 'TikTok rejected the MP4 video URL.';
        onProgress?.({ stage: 'error', progressPct: 0, message: errMsg });
        return {
          success: false,
          requiresReconnect: Boolean(initUrlRes.data?.requiresReconnect),
          error: errMsg,
        };
      }

      publishId = initUrlRes.data.publishId;
    }

    // Poll publish status until complete or failed
    for (let attempt = 0; attempt < 30; attempt++) {
      const pct = Math.min(96, 82 + Math.round((attempt / 30) * 14));
      onProgress?.({
        stage: 'processing',
        progressPct: pct,
        message: 'TikTok is processing and publishing your video...',
        detail: `Publish ID: ${publishId}`,
      });

      const statusRes = await callTikTokPublishAction({
        action: 'check-status',
        publishId,
      });

      if (!statusRes.ok) {
        const errMsg = statusRes.data?.error || 'Failed to verify TikTok publish status.';
        onProgress?.({ stage: 'error', progressPct: pct, message: errMsg });
        return {
          success: false,
          publishId,
          requiresReconnect: Boolean(statusRes.data?.requiresReconnect),
          error: errMsg,
        };
      }

      const ttStatus = String(statusRes.data?.status || '');
      if (ttStatus === 'PUBLISH_COMPLETE' || ttStatus === 'SEND_TO_USER_INBOX') {
        const doneMsg =
          ttStatus === 'SEND_TO_USER_INBOX'
            ? 'Video uploaded to your TikTok Inbox (ready to finalize in the TikTok app)!'
            : 'Video published to TikTok successfully!';
        onProgress?.({
          stage: 'published',
          progressPct: 100,
          message: doneMsg,
        });
        return {
          success: true,
          publishId,
          status: ttStatus,
          publicalyAvailablePostId: statusRes.data?.publicalyAvailablePostId || [],
        };
      }

      if (ttStatus === 'FAILED') {
        const reason = statusRes.data?.failReason || 'TikTok processing failed for this video.';
        onProgress?.({ stage: 'error', progressPct: pct, message: reason });
        return {
          success: false,
          publishId,
          status: ttStatus,
          error: reason,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    onProgress?.({
      stage: 'published',
      progressPct: 100,
      message: 'Video uploaded! TikTok is finishing background processing.',
    });
    return {
      success: true,
      publishId,
      status: 'PROCESSING_UPLOAD',
    };
  } catch (err: any) {
    const msg = err?.message || 'Unexpected network error publishing video to TikTok.';
    onProgress?.({ stage: 'error', progressPct: 0, message: msg });
    return {
      success: false,
      error: msg,
    };
  }
}
