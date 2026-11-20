import { GoogleGenAI } from '@google/genai';
import {
  buildEnglishTtsPrompt,
  CommercialVoiceAccent,
  CommercialVoiceTone,
  countWords,
  ensureWavBase64,
  sanitizeCommercialCopy,
} from '../../../src/utils/videoPromptOptimizer';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

interface TtsAttempt {
  model: string;
  includeSpeechConfig: boolean;
}

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
    const cleanedScript = sanitizeCommercialCopy(String(body?.script || '')).slice(0, 900);
    if (!cleanedScript || countWords(cleanedScript) < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide a valid English voiceover script (at least 3 words).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const voiceTone: CommercialVoiceTone =
      body?.voiceTone === 'calm_luxury' || body?.voiceTone === 'friendly'
        ? body.voiceTone
        : 'energetic';

    const accent: CommercialVoiceAccent = body?.accent === 'uk' ? 'uk' : 'us';
    const { voiceName, promptText } = buildEnglishTtsPrompt(cleanedScript, voiceTone, accent);

    // Explicitly target v1beta so Gemini Audio/TTS generation schema is supported
    // and strictly avoid sending unsupported `speechMetadata` fields in parts.
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

    const attempts: TtsAttempt[] = [
      { model: 'gemini-3.8-flash-lite-tts', includeSpeechConfig: true },
      { model: 'gemini-2.5-flash-preview-tts', includeSpeechConfig: true },
      { model: 'gemini-3.8-flash-lite-tts', includeSpeechConfig: false },
      { model: 'gemini-2.5-flash-preview-tts', includeSpeechConfig: false },
    ];

    let rawAudioBase64 = '';
    let rawMimeType = 'audio/wav';
    let lastErrorMessage = 'Voiceover synthesis failed.';

    for (const attempt of attempts) {
      try {
        const config: Record<string, any> = {
          responseModalities: ['AUDIO'],
        };
        if (attempt.includeSpeechConfig) {
          config.speechConfig = {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          };
        }

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }],
            },
          ],
          config,
        });

        const inlinePart = response.candidates?.[0]?.content?.parts?.find(
          (part: any) => part?.inlineData?.data
        );
        if (inlinePart?.inlineData?.data) {
          rawAudioBase64 = inlinePart.inlineData.data;
          rawMimeType = inlinePart.inlineData.mimeType || 'audio/wav';
          break;
        }
      } catch (attemptErr: any) {
        lastErrorMessage = attemptErr?.message || String(attemptErr);
        console.warn(
          `[CF-VIDEO-AD-VOICEOVER] Attempt failed (${attempt.model}, speechConfig=${attempt.includeSpeechConfig}):`,
          lastErrorMessage.slice(0, 220)
        );
      }
    }

    if (!rawAudioBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: lastErrorMessage || 'Voiceover synthesis returned no audio data.',
        }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const normalizedWav = ensureWavBase64(rawAudioBase64, rawMimeType);

    return new Response(
      JSON.stringify({
        success: true,
        voiceover: {
          audioBase64: normalizedWav.audioBase64,
          mimeType: normalizedWav.mimeType,
          voiceName,
          voiceTone,
          accent,
          wordCount: countWords(cleanedScript),
        },
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[CF-VIDEO-AD-VOICEOVER] Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to generate English studio voiceover.',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
