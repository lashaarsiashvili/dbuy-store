import { GoogleGenAI, Type } from '@google/genai';
import {
  buildCombinedActionVideoPrompt,
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  CommercialSceneRole,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceTone,
  countWords,
  ENFORCED_NEGATIVE_PROMPT,
  MANDATORY_STYLE_MODIFIERS,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
  verifyVoiceoverBindsProduct,
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

const ROLE_LABELS: Record<CommercialSceneRole, string> = {
  hook: 'Problem / Everyday Context',
  showcase: 'Hands-On Practical Action',
  benefit: 'Key Feature in Action',
  cta: 'Everyday Setting CTA',
};

const VALID_CAMERAS = new Set([
  'slow_zoom_in',
  'smooth_pan_right',
  'gentle_orbit',
  'macro_reveal',
]);

async function generatePlanWithRetry(
  ai: GoogleGenAI,
  prompt: string,
  schema: Record<string, any>
) {
  const modelsToTry = ['gemini-4-hydrogen', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    try {
      return await ai.models.generateContent({
        model: modelsToTry[attempt],
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
      if (!isTransient || attempt === modelsToTry.length - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
    }
  }
  throw lastError;
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
    const product = body?.product || {};
    const title = sanitizeCommercialCopy(String(product.title || '')).slice(0, 200);
    const description = sanitizeCommercialCopy(String(product.description || '')).slice(0, 1500);
    const features: string[] = Array.isArray(product.features)
      ? product.features
          .map((f: unknown) => sanitizeCommercialCopy(String(f || '')))
          .filter(Boolean)
          .slice(0, 10)
      : [];
    const price = Number(product.price) || 0;
    const origPrice = Number(product.origPrice) || 0;
    const category = sanitizeCommercialCopy(String(product.category || 'Everyday Essentials')).slice(0, 80);

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product title is required to plan a commercial video.' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const visualTheme: CommercialVisualTheme =
      body?.visualTheme === 'lifestyle_home' || body?.visualTheme === 'tech_modern'
        ? body.visualTheme
        : 'minimalist_studio';

    const aspectRatio: CommercialAspectRatio =
      body?.aspectRatio === '16:9' ? '16:9' : '9:16';

    const voiceTone: CommercialVoiceTone =
      body?.voiceTone === 'calm_luxury' || body?.voiceTone === 'friendly'
        ? body.voiceTone
        : 'energetic';

    const musicMood: CommercialMusicMood =
      body?.musicMood === 'modern_corporate' ||
      body?.musicMood === 'chill_lofi' ||
      body?.musicMood === 'luxury_ambient'
        ? body.musicMood
        : 'upbeat_tech';

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

    const priceLine =
      price > 0
        ? origPrice > price
          ? `$${price.toFixed(2)} (on sale from $${origPrice.toFixed(2)})`
          : `$${price.toFixed(2)}`
        : 'available now at DBUY Store';

    const featuresBlock =
      features.length > 0
        ? features.map((f, i) => `  ${i + 1}. ${f}`).join('\n')
        : '  - Use only details explicitly supported by the product title and description above.';

    const prompt = `You are a senior commercial creative director writing a strict, product-accurate 15-second English video ad for DBUY Store (dbuystore.com).

EXACT PRODUCT DATA (GROUND TRUTH — DO NOT INVENT OR SUBSTITUTE FEATURES):
- Exact Product Title: "${title}"
- Category: ${category}
- Exact Price: ${priceLine}
- Exact Description: ${description || 'No extra description provided — rely strictly on the exact title and features.'}
- Verified Product Features:
${featuresBlock}

CREATIVE SETTINGS:
- Aspect Ratio: ${aspectRatio}
- Visual Environment Theme: ${visualTheme}
- Voiceover Tone: ${voiceTone}
- Music Mood: ${musicMood}

STRICT CONTEXT-BINDING & ANTI-HALLUCINATION RULES:
1. STRICTLY ENGLISH ONLY across every field. Never output Georgian or non-English words.
2. MANDATORY EXACT PRODUCT NAMING: The English voiceover script MUST explicitly speak the exact product name ("${title}") in Scene 1 or Scene 2, and MUST describe concrete, real-world features explicitly listed in the Verified Product Features / Description above.
3. BAN GENERIC FILLER: NEVER write generic openers like "Upgrade your everyday routine", "Elevate your lifestyle", or vague claims that could apply to any product. Every sentence must be unmistakably about "${title}".
4. VOICEOVER LENGTH: Total 40 to 56 words across the 4 scenes (natural spoken commercial English, NO emojis, NO hashtags, NO URLs with https://, say "DBUY Store" cleanly in Scene 4).
5. BAN STATIC SLIDESHOWS — PLAN PRACTICAL "IN-USE" ACTION SCENES:
   Each scene's visualPrompt must describe dynamic real-world live action showing "${title}" being actively used (never panning or zooming over static product photos):
   - Scene 1 (role: "hook", ~3.5s): Relatable everyday problem/context where "${title}" is genuinely needed (e.g., cluttered desk, juggling devices, or specific daily challenge tied to this exact product).
   - Scene 2 (role: "showcase", ~4.5s): Hands-on practical action — natural human hands actively interacting with and using the exact "${title}" in real time in a well-lit modern home or office setup (no close-up human faces).
   - Scene 3 (role: "benefit", ~4s): Visual proof of the product's primary practical feature in motion (e.g., switching devices smoothly, quiet tactile operation, portable carry, or exact feature from the list above).
   - Scene 4 (role: "cta", ~3s): Clean closing live-action shot of "${title}" in its ideal everyday workspace/lifestyle setting (no baked-in text overlays).
6. VISUAL GUARDRAILS: Never include close-up human faces, portraits, or deformed/extra-finger hands. Keep framing below shoulder level focused on natural hand interaction and the product itself.
7. ON-SCREEN COPY: Clean, punchy headlines (2 to 5 words max) and subheadlines (4 to 9 words), no emojis, no hashtags.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              role: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
              headline: { type: Type.STRING },
              subheadline: { type: Type.STRING },
              voiceoverLine: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
              cameraMotion: { type: Type.STRING },
            },
            required: [
              'sceneNumber',
              'role',
              'durationSec',
              'headline',
              'subheadline',
              'voiceoverLine',
              'visualPrompt',
              'cameraMotion',
            ],
          },
        },
        fullVoiceoverScript: { type: Type.STRING },
      },
      required: ['scenes', 'fullVoiceoverScript'],
    };

    const response = await generatePlanWithRetry(ai, prompt, responseSchema);
    const rawText = (response?.text || '').trim();
    if (!rawText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Model returned an empty commercial plan.' }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const parsed = JSON.parse(rawText);
    const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
    const expectedRoles: CommercialSceneRole[] = ['hook', 'showcase', 'benefit', 'cta'];

    const normalizedScenes: CommercialScenePlan[] = expectedRoles.map((expectedRole, idx) => {
      const src = rawScenes[idx] || {};
      const durationSec = idx === 1 ? 4.5 : idx === 2 ? 4 : idx === 0 ? 3.5 : 3;
      const rawCamera = String(src.cameraMotion || '');
      const defaultCameras: CommercialScenePlan['cameraMotion'][] = [
        'slow_zoom_in',
        'smooth_pan_right',
        'macro_reveal',
        'gentle_orbit',
      ];
      const cameraMotion = VALID_CAMERAS.has(rawCamera)
        ? (rawCamera as CommercialScenePlan['cameraMotion'])
        : defaultCameras[idx];

      return {
        sceneNumber: idx + 1,
        role: expectedRole,
        roleLabel: ROLE_LABELS[expectedRole],
        durationSec,
        headline:
          sanitizeCommercialCopy(String(src.headline || '')).slice(0, 60) ||
          ROLE_LABELS[expectedRole],
        subheadline: sanitizeCommercialCopy(String(src.subheadline || '')).slice(0, 110),
        voiceoverLine: sanitizeCommercialCopy(String(src.voiceoverLine || '')).slice(0, 260),
        visualPrompt: optimizeCommercialVisualPrompt(
          String(src.visualPrompt || ''),
          visualTheme,
          title
        ),
        negativePrompt: ENFORCED_NEGATIVE_PROMPT,
        cameraMotion,
      };
    });

    let joinedScript = sanitizeCommercialCopy(
      normalizedScenes.map((s) => s.voiceoverLine).filter(Boolean).join(' ')
    );
    if (!joinedScript) {
      joinedScript = sanitizeCommercialCopy(String(parsed?.fullVoiceoverScript || ''));
    }

    // Enforce product context grounding check: guarantee exact product name appears
    if (!verifyVoiceoverBindsProduct(joinedScript, title)) {
      const anchoredLine = sanitizeCommercialCopy(
        `Meet the ${title}. ${normalizedScenes[1]?.voiceoverLine || ''}`
      );
      normalizedScenes[1].voiceoverLine = anchoredLine;
      joinedScript = sanitizeCommercialCopy(
        normalizedScenes.map((s) => s.voiceoverLine).filter(Boolean).join(' ')
      );
    }

    const fullVoiceoverScript = joinedScript;
    const estimatedDurationSec = normalizedScenes.reduce((sum, s) => sum + s.durationSec, 0);
    const combinedActionPrompt = buildCombinedActionVideoPrompt({
      product: { title, description, features, category },
      scenes: normalizedScenes,
      visualTheme,
      aspectRatio,
    });

    const plan: CommercialVideoPlan = {
      scenes: normalizedScenes,
      fullVoiceoverScript,
      combinedActionPrompt,
      wordCount: countWords(fullVoiceoverScript),
      estimatedDurationSec,
      visualTheme,
      aspectRatio,
      voiceTone,
      musicMood,
      mandatoryStyleModifiers: MANDATORY_STYLE_MODIFIERS,
      negativePrompt: ENFORCED_NEGATIVE_PROMPT,
    };

    return new Response(JSON.stringify({ success: true, plan }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    console.error('[CF-VIDEO-AD-PLAN] Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to generate commercial video script plan.',
      }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
