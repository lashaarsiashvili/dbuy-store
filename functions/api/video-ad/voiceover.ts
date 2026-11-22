import { GoogleGenAI } from '@google/genai';
import {
  buildEnglishTtsPrompt,
  CommercialVoiceAccent,
  CommercialVoiceTone,
  countWords,
  ensureWavBase64,
  sanitizeSpokenVoiceoverScript,
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
  useSpeechMetadata: boolean;
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
    const cleanedScript = sanitizeSpokenVoiceoverScript(String(body?.script || '')).slice(0, 400);
    if (!cleanedScript || countWords(cleanedScript) < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide a valid voiceover script (at least 3 words).',
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const voiceTone: CommercialVoiceTone =
      body?.voiceTone === 'calm_luxury' || body?.voiceTone === 'energetic'
        ? body.voiceTone
        : 'friendly';

    const accent: CommercialVoiceAccent = body?.accent === 'uk' ? 'uk' : 'us';
    const { voiceName, styleInstruction, promptText } = buildEnglishTtsPrompt(
      cleanedScript,
      voiceTone,
      accent
    );

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const attempts: TtsAttempt[] = [
      { model: 'gemini-3.8-flash-lite-tts', useSpeechMetadata: true, includeSpeechConfig: true },
      { model: 'gemini-3.8-flash-tts', useSpeechMetadata: true, includeSpeechConfig: true },
      { model: 'gemini-3.8-flash-lite-tts', useSpeechMetadata: false, includeSpeechConfig: true },
      { model: 'gemini-3.8-flash-lite-tts', useSpeechMetadata: false, includeSpeechConfig: false },
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

        const part: Record<string, any> = { text: promptText };
        if (attempt.useSpeechMetadata) {
          part.speechMetadata = { style: styleInstruction };
        }

        const response = await ai.models.generateContent({
          model: attempt.model,
          contents: [
            {
              role: 'user',
              parts: [part],
            },
          ],
          config,
        });

        const inlinePart = response.candidates?.[0]?.content?.parts?.find(
          (p: any) => p?.inlineData?.data
        );
        if (inlinePart?.inlineData?.data) {
          rawAudioBase64 = inlinePart.inlineData.data;
          rawMimeType = inlinePart.inlineData.mimeType || 'audio/wav';
          break;
        }
      } catch (attemptErr: any) {
        lastErrorMessage = attemptErr?.message || String(attemptErr);
        console.warn(
          `[CF-VIDEO-AD-VOICEOVER] Attempt failed (${attempt.model}, meta=${attempt.useSpeechMetadata}, speechConfig=${attempt.includeSpeechConfig}):`,
          lastErrorMessage.slice(0, 220)
        );
      }
    }

    if (!rawAudioBase64) {
      const isQuota = /RESOURCE_EXHAUSTED|429|quota/i.test(lastErrorMessage);
      return new Response(
        JSON.stringify({
          success: false,
          quotaExhausted: isQuota,
          error: lastErrorMessage || 'Voiceover synthesis returned no audio data.',
        }),
        { status: isQuota ? 429 : 502, headers: CORS_HEADERS }
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
