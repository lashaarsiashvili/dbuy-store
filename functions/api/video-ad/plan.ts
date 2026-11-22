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
  enforceShortVoiceoverScript,
  MANDATORY_STYLE_MODIFIERS,
  optimizeCommercialVisualPrompt,
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

const ROLE_LABELS: Record<CommercialSceneRole, string> = {
  hook: 'Hero Reveal',
  showcase: 'Design & Texture',
  benefit: 'Key Feature',
  cta: 'Product Showcase',
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
  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
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
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('404') ||
        msg.includes('NOT_FOUND');
      if (!isTransient || attempt === modelsToTry.length - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
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
    const category = sanitizeCommercialCopy(String(product.category || 'Featured Product')).slice(0, 80);

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
      body?.voiceTone === 'calm_luxury' || body?.voiceTone === 'energetic'
        ? body.voiceTone
        : 'friendly';

    const musicMood: CommercialMusicMood =
      body?.musicMood === 'modern_corporate' ||
      body?.musicMood === 'chill_lofi' ||
      body?.musicMood === 'luxury_ambient'
        ? body.musicMood
        : 'upbeat_tech';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const featuresText = features.length > 0 ? ` Key features: ${features.join('; ')}.` : '';
    const rawDescriptionInput = `${description || title}.${featuresText}`.trim();

    const prompt = `# ROLE & OBJECTIVE
You are an automated commercial video director. Your sole task is to plan a clean, dynamic, high-converting product showcase video based strictly on the product data provided below.

# VISUAL & MOTION DIRECTIVES
- Use the uploaded product image(s) as the hero subject.
- Apply smooth, cinematic camera motion: a slow zoom-in combined with subtle parallax movement to give depth and life to the product (never static).
- Maintain clean, soft commercial studio lighting and a distraction-free background.
- Focus exclusively on the product's design, texture, and key visual features across 4 clean showcase scenes (Aspect Ratio: ${aspectRatio}, Backdrop Theme: ${visualTheme}).
- For each scene, provide a concise on-screen headline (2–4 words) and subheadline (3–7 words) highlighting the product's design, texture, or key visual feature.

# AUDIO & VOICEOVER RULES
- Generate a natural, warm, professional voiceover script ("fullVoiceoverScript") derived ONLY from the product's name and its single strongest benefit.
- Keep the spoken script short: 1 to 2 sentences maximum, strictly under 15 words total (10 to 14 words max).
- Example structure: "Meet [Product Name] — [Main Benefit]. Get yours today."

# STRICT NEGATIVE CONSTRAINTS (CRITICAL)
- NEVER include meta-instructions, prompt rules, or style descriptions in fullVoiceoverScript or scene text.
- NEVER mention accents, languages, or voice types (do NOT output words like "American English", "British English", "voiceover", "studio lighting", or "commercial").
- NEVER include technical codes, SKUs, model numbers, dimensions, shipping terms, or raw bullet points in fullVoiceoverScript.
- Do NOT add any introductory or concluding commentary.

# PRODUCT INPUT DATA
Product Title: ${title}
Product Description: ${rawDescriptionInput}`;

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
              visualPrompt: { type: Type.STRING },
              cameraMotion: { type: Type.STRING },
            },
            required: [
              'sceneNumber',
              'role',
              'durationSec',
              'headline',
              'subheadline',
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

    const fullVoiceoverScript = enforceShortVoiceoverScript(
      String(parsed?.fullVoiceoverScript || ''),
      { title, description, features }
    );

    const scriptSentences = fullVoiceoverScript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const normalizedScenes: CommercialScenePlan[] = expectedRoles.map((expectedRole, idx) => {
      const src = rawScenes[idx] || {};
      const durationSec = idx === 1 || idx === 2 ? 2.8 : 2.4;
      const rawCamera = String(src.cameraMotion || '');
      const cameraMotion = VALID_CAMERAS.has(rawCamera)
        ? (rawCamera as CommercialScenePlan['cameraMotion'])
        : 'slow_zoom_in';

      const syncedLine =
        idx === 0
          ? scriptSentences[0] || fullVoiceoverScript
          : idx === 1
          ? scriptSentences[1] || ''
          : idx === 3
          ? scriptSentences[1] || scriptSentences[0] || ''
          : '';

      return {
        sceneNumber: idx + 1,
        role: expectedRole,
        roleLabel: ROLE_LABELS[expectedRole],
        durationSec,
        headline:
          sanitizeCommercialCopy(String(src.headline || '')).slice(0, 48) ||
          ROLE_LABELS[expectedRole],
        subheadline: sanitizeCommercialCopy(String(src.subheadline || '')).slice(0, 80),
        voiceoverLine: syncedLine,
        visualPrompt: optimizeCommercialVisualPrompt(
          String(src.visualPrompt || ''),
          visualTheme,
          title
        ),
        negativePrompt: ENFORCED_NEGATIVE_PROMPT,
        cameraMotion,
      };
    });

    const estimatedDurationSec = normalizedScenes.reduce((sum, s) => sum + s.durationSec, 0);
    const combinedActionPrompt = buildCombinedActionVideoPrompt({
      product: { title, description, features, category },
      scenes: normalizedScenes,
      visualTheme,
      aspectRatio,
      durationSec: estimatedDurationSec,
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
