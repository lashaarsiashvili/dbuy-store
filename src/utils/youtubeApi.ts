import { Product } from '../types';
import {
  buildLuxurySocialPricingLine,
  extractTopProductHighlights,
} from './instagramApi';

export type YouTubePrivacyStatus = 'public' | 'unlisted' | 'private';

export interface YouTubeConnectionStatus {
  configured: boolean;
  connected: boolean;
  channelId?: string;
  channelTitle?: string;
  avatarUrl?: string;
  scope?: string;
  expiresAt?: number;
  redirectUri?: string;
  requiresReconnect?: boolean;
  error?: string;
}

export type YouTubeUploadStageKey =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'error';

export interface YouTubeUploadProgress {
  stage: YouTubeUploadStageKey;
  progressPct: number;
  message: string;
  detail?: string;
}

export interface UploadYouTubeShortParams {
  file: File;
  title: string;
  description: string;
  tags: string;
  privacyStatus: YouTubePrivacyStatus;
}

export interface UploadYouTubeShortResult {
  success: boolean;
  videoId?: string;
  shortsUrl?: string;
  watchUrl?: string;
  privacyStatus?: YouTubePrivacyStatus;
  error?: string;
  errorCode?: string;
  requiresReconnect?: boolean;
}

export const MAX_YOUTUBE_TITLE_LENGTH = 100;
export const MAX_YOUTUBE_DESCRIPTION_LENGTH = 5000;

function stripHtmlClean(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildYouTubeShortTitle(product: Product, isKa = false): string {
  const baseTitle = (
    (isKa ? product.titleKa || product.title : product.title) || 'Featured Product'
  ).trim();
  const suffix = ' #Shorts';
  const maxBaseLen = MAX_YOUTUBE_TITLE_LENGTH - suffix.length;
  const cleanBase =
    baseTitle.length > maxBaseLen
      ? `${baseTitle.slice(0, maxBaseLen - 1).trim()}…`
      : baseTitle;
  return cleanBase.toLowerCase().includes('#shorts')
    ? cleanBase.slice(0, MAX_YOUTUBE_TITLE_LENGTH)
    : `${cleanBase}${suffix}`;
}

export function buildYouTubeShortDescription(
  product: Product,
  isKa = false
): string {
  const title =
    (isKa ? product.titleKa || product.title : product.title) || 'Featured Essential';
  const rawDesc = stripHtmlClean(
    isKa ? product.descriptionKa || product.description : product.description
  );
  const shortDesc =
    rawDesc.length > 420 ? `${rawDesc.slice(0, 417).trim()}…` : rawDesc;
  const highlights = extractTopProductHighlights(product, isKa);
  const bulletBlock = highlights.slice(0, 3).map((h) => `✓ ${h}`).join('\n');
  const priceLine = buildLuxurySocialPricingLine(product, isKa);
  const productUrl = `https://www.dbuystore.com/b/${product.id}`;

  const parts = [
    title,
    shortDesc,
    bulletBlock,
    priceLine,
    isKa
      ? `🛒 შეუკვეთეთ აქ: ${productUrl}`
      : `🛒 Shop now at DBuy Store: ${productUrl}`,
    `#Shorts #DBUYStore #TechFinds #SmartGadgets #CuratedLiving`,
  ].filter(Boolean);

  return parts.join('\n\n').slice(0, MAX_YOUTUBE_DESCRIPTION_LENGTH);
}

export function buildYouTubeShortTags(product: Product): string {
  const words = (product.title || '')
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  const category = (product.category || '').trim();
  const tags = Array.from(
    new Set([
      'Shorts',
      'DBUYStore',
      ...(category ? [category] : []),
      ...words,
      'TechFinds',
      'OnlineShopping',
    ])
  );
  return tags.slice(0, 12).join(', ');
}

export async function checkYouTubeConnectionStatus(): Promise<YouTubeConnectionStatus> {
  try {
    const res = await fetch('/api/youtube/status', { cache: 'no-store' });
    const json: any = await res.json().catch(() => null);
    if (json) {
      return {
        configured: Boolean(json.configured),
        connected: Boolean(json.connected),
        channelId: json.channelId,
        channelTitle: json.channelTitle,
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
      error: err?.message || 'Unable to verify YouTube connection status.',
    };
  }

  return {
    configured: false,
    connected: false,
    error: 'YouTube status endpoint is unavailable.',
  };
}

export async function getYouTubeAuthUrl(returnTo = '/'): Promise<{
  success: boolean;
  url?: string;
  redirectUri?: string;
  error?: string;
}> {
  try {
    const query = new URLSearchParams({
      format: 'json',
      returnTo,
    });
    const res = await fetch(`/api/youtube/auth?${query.toString()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success || !json?.url) {
      return {
        success: false,
        redirectUri: json?.redirectUri,
        error: json?.error || 'Could not generate YouTube OAuth URL.',
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
      error: err?.message || 'Network error generating YouTube authorization URL.',
    };
  }
}

export async function disconnectYouTubeAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/youtube/disconnect', { method: 'POST' });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.error || 'Failed to disconnect YouTube account.',
      };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error disconnecting YouTube account.',
    };
  }
}

export function uploadYouTubeShort(
  params: UploadYouTubeShortParams,
  onProgress?: (progress: YouTubeUploadProgress) => void
): Promise<UploadYouTubeShortResult> {
  return new Promise((resolve) => {
    if (!params.file || params.file.size <= 0) {
      resolve({ success: false, error: 'Please select or generate a valid MP4 video file.' });
      return;
    }

    const formData = new FormData();
    formData.append('video', params.file, params.file.name || 'dbuy-short.mp4');
    formData.append('title', (params.title || '').trim().slice(0, MAX_YOUTUBE_TITLE_LENGTH));
    formData.append(
      'description',
      (params.description || '').trim().slice(0, MAX_YOUTUBE_DESCRIPTION_LENGTH)
    );
    formData.append('tags', params.tags || '');
    formData.append('privacyStatus', params.privacyStatus || 'private');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/youtube/upload', true);

    onProgress?.({
      stage: 'uploading',
      progressPct: 6,
      message: 'Preparing MP4 upload for YouTube Shorts...',
      detail: `${(params.file.size / (1024 * 1024)).toFixed(2)} MB · Privacy: ${params.privacyStatus}`,
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const ratio = event.loaded / event.total;
        const pct = Math.min(78, Math.max(8, Math.round(8 + ratio * 70)));
        onProgress?.({
          stage: 'uploading',
          progressPct: pct,
          message:
            ratio >= 0.99
              ? 'Transferring video to YouTube Data API v3...'
              : 'Uploading MP4 video...',
          detail: `${(event.loaded / (1024 * 1024)).toFixed(2)} MB / ${(
            event.total /
            (1024 * 1024)
          ).toFixed(2)} MB`,
        });
      }
    };

    xhr.upload.onload = () => {
      onProgress?.({
        stage: 'processing',
        progressPct: 84,
        message: 'Uploading resumable stream to YouTube...',
        detail: 'Calling youtube/v3/videos?uploadType=resumable',
      });
    };

    xhr.onload = () => {
      let json: any = {};
      try {
        json = JSON.parse(xhr.responseText || '{}');
      } catch {
        json = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && json?.success && json?.videoId) {
        const shortsUrl =
          json.shortsUrl || `https://youtube.com/shorts/${json.videoId}`;
        onProgress?.({
          stage: 'published',
          progressPct: 100,
          message: 'YouTube Short uploaded successfully!',
          detail: shortsUrl,
        });
        resolve({
          success: true,
          videoId: json.videoId,
          shortsUrl,
          watchUrl: json.watchUrl || `https://www.youtube.com/watch?v=${json.videoId}`,
          privacyStatus: json.privacyStatus || params.privacyStatus,
        });
        return;
      }

      const errMsg =
        json?.error || `YouTube upload failed (HTTP ${xhr.status || 500}).`;
      onProgress?.({
        stage: 'error',
        progressPct: 0,
        message: errMsg,
      });
      resolve({
        success: false,
        error: errMsg,
        errorCode: json?.errorCode,
        requiresReconnect: Boolean(json?.requiresReconnect || xhr.status === 401),
      });
    };

    xhr.onerror = () => {
      const msg = 'Network error uploading MP4 video to YouTube.';
      onProgress?.({ stage: 'error', progressPct: 0, message: msg });
      resolve({ success: false, error: msg });
    };

    xhr.send(formData);
  });
}
