import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VEO_MODELS_PRIORITY = [
  'veo-2.0-generate-001',
  'veo-3.0-generate-preview',
  'veo-3.0-fast-generate-001',
];

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function classifyGeminiError(err: any): {
  status: number;
  errorCode: string;
  message: string;
  requiresBilling: boolean;
} {
  const raw = String(err?.message || err || 'Google Veo video generation failed.');
  if (/PERMISSION_DENIED|403|billing|paid|not\s+enabled/i.test(raw)) {
    return {
      status: 403,
      errorCode: 'VEO_BILLING_OR_PERMISSION',
      message:
        'Google Veo requires a billing-enabled GEMINI_API_KEY with Veo access enabled. Check your API key in Settings > Secrets.',
      requiresBilling: true,
    };
  }
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(raw)) {
    return {
      status: 429,
      errorCode: 'VEO_QUOTA_EXHAUSTED',
      message:
        'Google Veo API quota limit reached (429). Please wait or check your Gemini API billing tier.',
      requiresBilling: true,
    };
  }
  if (/API_KEY_INVALID|invalid api key|401/i.test(raw)) {
    return {
      status: 401,
      errorCode: 'API_KEY_INVALID',
      message: 'GEMINI_API_KEY is invalid. Please verify it in Settings > Secrets.',
      requiresBilling: false,
    };
  }
  return {
    status: 502,
    errorCode: 'VEO_GENERATION_ERROR',
    message: raw.slice(0, 420),
    requiresBilling: false,
  };
}

function createGenAiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function normalizeImageInput(rawBase64?: string, rawMime?: string) {
  if (!rawBase64 || typeof rawBase64 !== 'string') return undefined;
  const clean = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64.trim();
  if (!clean) return undefined;
  const mime =
    rawMime && /^image\/(jpeg|jpg|png|webp)$/i.test(rawMime)
      ? rawMime.toLowerCase().replace('image/jpg', 'image/jpeg')
      : 'image/jpeg';
  return { imageBytes: clean, mimeType: mime };
}

/**
 * POST /api/video-ad/generate-video
 * Starts an asynchronous Google Veo Image-to-Video generation operation via @google/genai SDK.
 */
export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'MISSING_API_KEY',
          error: 'GEMINI_API_KEY is not configured on the server.',
        }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const body = await context.request.json();
    const prompt = String(body?.prompt || '').trim().slice(0, 2200);
    const negativePrompt = String(body?.negativePrompt || '').trim().slice(0, 600);
    const aspectRatio = body?.aspectRatio === '16:9' ? '16:9' : '9:16';
    const durationSeconds = Math.max(5, Math.min(8, Number(body?.durationSeconds) || 8));
    const image = normalizeImageInput(body?.imageBase64, body?.imageMimeType);

    if (!prompt) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A cinematic Veo motion prompt is required.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const ai = createGenAiClient(apiKey);
    const preferredModel =
      typeof body?.model === 'string' && /^veo-[\w.-]+$/i.test(body.model.trim())
        ? body.model.trim()
        : null;
    const modelsToTry = preferredModel
      ? [preferredModel, ...VEO_MODELS_PRIORITY.filter((m) => m !== preferredModel)]
      : VEO_MODELS_PRIORITY;

    let operation: GenerateVideosOperation | null = null;
    let modelUsed = '';
    let lastError: any = null;

    for (const model of modelsToTry) {
      const fullConfig: Record<string, any> = {
        aspectRatio,
        numberOfVideos: 1,
        durationSeconds,
      };
      if (negativePrompt) {
        fullConfig.negativePrompt = negativePrompt;
      }

      const attempts = [
        fullConfig,
        { aspectRatio, numberOfVideos: 1 },
      ];

      let modelUnsupported = false;
      for (const config of attempts) {
        try {
          operation = await ai.models.generateVideos({
            model,
            source: {
              prompt,
              ...(image ? { image } : {}),
            },
            config,
          });
          modelUsed = model;
          break;
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err || '');
          if (/404|NOT_FOUND|not found|not supported for generateVideos/i.test(msg)) {
            modelUnsupported = true;
            break;
          }
          if (/PERMISSION_DENIED|403|API_KEY_INVALID|401|RESOURCE_EXHAUSTED|429/i.test(msg)) {
            throw err;
          }
          // Otherwise retry with minimal config before moving to next model
        }
      }

      if (operation) break;
      if (!modelUnsupported && lastError) {
        // Try next Veo model fallback if available
        continue;
      }
    }

    if (!operation || !operation.name) {
      const classified = classifyGeminiError(lastError);
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: classified.errorCode,
          requiresBilling: classified.requiresBilling,
          error: classified.message,
        }),
        { status: classified.status, headers: CORS_HEADERS }
      );
    }

    const done = Boolean(operation.done);
    const opName = operation.name;
    const firstVideo = operation.response?.generatedVideos?.[0]?.video;

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'google-veo',
        modelUsed,
        status: done ? 'completed' : 'processing',
        operationName: opName,
        mimeType: firstVideo?.mimeType || 'video/mp4',
        downloadUrl: done
          ? `/api/video-ad/generate-video?operationName=${encodeURIComponent(opName)}&download=1`
          : undefined,
      }),
      { status: done ? 200 : 202, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[CF-VEO-START] Error:', err);
    const classified = classifyGeminiError(err);
    return new Response(
      JSON.stringify({
        success: false,
        errorCode: classified.errorCode,
        requiresBilling: classified.requiresBilling,
        error: classified.message,
      }),
      { status: classified.status, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET /api/video-ad/generate-video?operationName=...(&download=1)
 * Polls Google Veo operation status OR streams the finished MP4 clip server-side.
 */
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
    const operationName = (url.searchParams.get('operationName') || '').trim();
    const shouldDownload = url.searchParams.get('download') === '1';

    if (!operationName || !operationName.includes('/operations/')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid Veo operationName query parameter is required.',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const ai = createGenAiClient(apiKey);
    const opRef = new GenerateVideosOperation();
    opRef.name = operationName;

    const operation = await ai.operations.getVideosOperation({ operation: opRef });

    if (operation.error) {
      const errMsg =
        (operation.error as any)?.message ||
        JSON.stringify(operation.error) ||
        'Google Veo generation operation failed.';
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: errMsg,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    if (!operation.done) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'google-veo',
          status: 'processing',
          operationName,
          metadata: operation.metadata || null,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const generatedVideos = operation.response?.generatedVideos || [];
    const firstVideo = generatedVideos[0]?.video;

    if (!firstVideo || (!firstVideo.uri && !firstVideo.videoBytes)) {
      const raiReasons = operation.response?.raiMediaFilteredReasons?.join('; ');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'failed',
          error: raiReasons
            ? `Veo filtered the generated video: ${raiReasons}`
            : 'Veo completed without returning a video clip.',
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    if (!shouldDownload) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'google-veo',
          status: 'completed',
          operationName,
          mimeType: firstVideo.mimeType || 'video/mp4',
          downloadUrl: `/api/video-ad/generate-video?operationName=${encodeURIComponent(operationName)}&download=1`,
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // Stream video bytes directly to browser (keeping GEMINI_API_KEY server-side)
    const mimeType = firstVideo.mimeType || 'video/mp4';

    if (firstVideo.videoBytes) {
      const binaryStr = atob(firstVideo.videoBytes);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Download from Veo URI using server-side API key header
    const videoRes = await fetch(firstVideo.uri!, {
      headers: {
        'x-goog-api-key': apiKey,
      },
      redirect: 'follow',
    });

    if (!videoRes.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to download generated Veo video clip (HTTP ${videoRes.status}).`,
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    return new Response(videoRes.body, {
      status: 200,
      headers: {
        'Content-Type': videoRes.headers.get('content-type') || mimeType,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[CF-VEO-POLL] Error:', err);
    const classified = classifyGeminiError(err);
    return new Response(
      JSON.stringify({
        success: false,
        errorCode: classified.errorCode,
        requiresBilling: classified.requiresBilling,
        error: classified.message,
      }),
      { status: classified.status, headers: CORS_HEADERS }
    );
  }
}
