import { GoogleGenAI } from '@google/genai';
import {
  buildCombinedActionVideoPrompt,
  CommercialAspectRatio,
  CommercialScenePlan,
  CommercialVisualTheme,
  sanitizeCommercialCopy,
} from '../../../src/utils/videoPromptOptimizer';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function resolveImageToInlinePart(
  rawUrl: string,
  originUrl: string
): Promise<{ type: 'image'; mime_type: string; data: string } | null> {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (match) {
      return {
        type: 'image',
        mime_type: match[1] === 'image/jpg' ? 'image/jpeg' : match[1],
        data: match[2],
      };
    }
    return null;
  }

  let fetchUrl = trimmed;
  if (trimmed.startsWith('/')) {
    fetchUrl = new URL(trimmed, originUrl).toString();
  }

  if (!fetchUrl.startsWith('http://') && !fetchUrl.startsWith('https://')) {
    return null;
  }

  try {
    const resp = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DBUYStore/1.0)',
        Accept: 'image/*,*/*;q=0.8',
      },
    });
    if (!resp.ok) return null;
    const rawMime = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!rawMime.startsWith('image/')) return null;
    const mime_type = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    const buf = await resp.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) return null;
    return {
      type: 'image',
      mime_type,
      data: arrayBufferToBase64(buf),
    };
  } catch {
    return null;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extractInteractionErrorMessage(interaction: any, fallback: string): string {
  const errList = Array.isArray(interaction?.errors)
    ? interaction.errors
        .map((e: any) => [e?.code, e?.message].filter(Boolean).join(': ') || JSON.stringify(e))
        .filter(Boolean)
        .join('; ')
    : '';
  const raw =
    errList ||
    interaction?.error?.message ||
    interaction?.output_text ||
    fallback;
  if (/RESOURCE_EXHAUSTED/i.test(raw)) {
    return 'Gemini video generation quota/rate limit reached (RESOURCE_EXHAUSTED). Please wait 30–60 seconds and try again.';
  }
  return raw;
}

async function fetchVideoUriResponse(uri: string, apiKey: string): Promise<Response | null> {
  try {
    const targetUrl = uri.includes('key=')
      ? uri
      : `${uri}${uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(targetUrl, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(45000),
    });
    if (!resp.ok) return null;
    return resp;
  } catch {
    return null;
  }
}

// POST /api/video-ad/generate-video -> Starts reference-guided gemini-omni-1.2-flash job
export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY is not configured on the server.',
        }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body = await context.request.json();
    const product = body?.product || {};
    const title = sanitizeCommercialCopy(String(product.title || '')).slice(0, 200);
    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product title is required for video generation.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const aspectRatio: CommercialAspectRatio = body?.aspectRatio === '16:9' ? '16:9' : '9:16';
    const visualTheme: CommercialVisualTheme =
      body?.visualTheme === 'lifestyle_home' || body?.visualTheme === 'tech_modern'
        ? body.visualTheme
        : 'minimalist_studio';
    const rawDuration = String(body?.duration || '12s').trim();
    const duration = /^(?:[3-9]|1[0-5])s$/.test(rawDuration) ? rawDuration : '12s';

    const scenes: CommercialScenePlan[] = Array.isArray(body?.scenes) ? body.scenes : [];
    const rawRefs: string[] = Array.isArray(body?.referenceImages) ? body.referenceImages : [];
    const originUrl = new URL(context.request.url).origin;

    const imageParts: Array<{ type: 'image'; mime_type: string; data: string }> = [];
    for (const refUrl of rawRefs.slice(0, 4)) {
      const part = await resolveImageToInlinePart(refUrl, originUrl);
      if (part) imageParts.push(part);
    }

    if (imageParts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'At least one accessible product reference image is required for reference-guided video generation.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const actionPrompt =
      typeof body?.combinedActionPrompt === 'string' && body.combinedActionPrompt.trim().length > 40
        ? body.combinedActionPrompt.trim()
        : buildCombinedActionVideoPrompt({
            product: {
              title,
              description: sanitizeCommercialCopy(String(product.description || '')),
              features: Array.isArray(product.features) ? product.features : [],
              category: sanitizeCommercialCopy(String(product.category || '')),
            },
            scenes,
            visualTheme,
            aspectRatio,
            durationSec: parseInt(duration, 10) || 12,
          });

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        apiVersion: 'v1beta',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.2-flash',
      input: [
        ...imageParts,
        {
          type: 'text',
          text: actionPrompt,
        },
      ],
      background: true,
      store: true,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio,
        duration,
        resolution: '720p',
      },
    });

    const status = String(interaction.status || '').toLowerCase();
    const videoPart = interaction.output_video;
    if (videoPart?.data || videoPart?.uri) {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          interactionId: interaction.id,
          mimeType: videoPart.mime_type || 'video/mp4',
          videoUrl: `/api/video-ad/generate-video?id=${encodeURIComponent(interaction.id)}&download=1`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (status === 'failed' || status === 'cancelled') {
      const errDetail = extractInteractionErrorMessage(
        interaction,
        `AI video generation ended with status: ${interaction.status}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          status: interaction.status,
          error: errDetail,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: interaction.status || 'in_progress',
        interactionId: interaction.id,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[CF-VIDEO-AD-GENERATE] Error:', err);
    const msg = /RESOURCE_EXHAUSTED/i.test(String(err?.message || ''))
      ? 'Gemini video generation quota/rate limit reached (RESOURCE_EXHAUSTED). Please wait 30–60 seconds and try again.'
      : err?.message || 'Failed to start reference-guided AI video generation.';
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// GET /api/video-ad/generate-video?id=<interactionId>[&download=1] -> Polls status or streams MP4 binary
export async function onRequestGet(context: any) {
  try {
    const env = context.env || {};
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY is not configured on the server.',
        }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const url = new URL(context.request.url);
    const interactionId = (url.searchParams.get('id') || '').trim();
    if (!interactionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing interaction id query parameter.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const wantsDownload =
      url.searchParams.get('download') === '1' || url.searchParams.get('download') === 'true';

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        apiVersion: 'v1beta',
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const interaction = await ai.interactions.get(interactionId);
    const status = String(interaction.status || '').toLowerCase();
    const videoPart = interaction.output_video;

    if (wantsDownload) {
      if (videoPart?.data) {
        const bytes = base64ToUint8Array(videoPart.data);
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': videoPart.mime_type || 'video/mp4',
            'Content-Length': String(bytes.byteLength),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'private, max-age=300',
          },
        });
      }
      if (videoPart?.uri) {
        const upstream = await fetchVideoUriResponse(videoPart.uri, apiKey);
        if (upstream) {
          const mimeType =
            videoPart.mime_type ||
            (upstream.headers.get('content-type') || 'video/mp4').split(';')[0].trim();
          return new Response(upstream.body, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'private, max-age=300',
            },
          });
        }
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Generated video stream is not yet ready or expired.',
        }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (videoPart?.data || videoPart?.uri) {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          interactionId: interaction.id,
          mimeType: videoPart.mime_type || 'video/mp4',
          videoUrl: `/api/video-ad/generate-video?id=${encodeURIComponent(interaction.id)}&download=1`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    if (status === 'failed' || status === 'cancelled') {
      const errDetail = extractInteractionErrorMessage(
        interaction,
        `AI video generation ended with status: ${interaction.status}`
      );
      return new Response(
        JSON.stringify({
          success: false,
          status: interaction.status,
          error: errDetail,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    if (status === 'completed' || status === 'idle') {
      return new Response(
        JSON.stringify({
          success: false,
          status: interaction.status,
          error: 'Video interaction completed but returned no video stream. Please retry.',
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: interaction.status || 'in_progress',
        interactionId: interaction.id,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[CF-VIDEO-AD-POLL] Error:', err);
    const msg = /RESOURCE_EXHAUSTED/i.test(String(err?.message || ''))
      ? 'Gemini video generation quota/rate limit reached (RESOURCE_EXHAUSTED). Please wait 30–60 seconds and try again.'
      : err?.message || 'Failed to check AI video generation status.';
    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
