import { GoogleGenAI, Type } from '@google/genai';
import {
  buildCombinedActionVideoPrompt,
  CommercialAspectRatio,
  CommercialMotionStyle,
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
  normalizeMotionStyle,
  optimizeCommercialVisualPrompt,
  sanitizeCommercialCopy,
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

const ROLE_LABELS: Record<CommercialSceneRole, string> = {
  hook: 'Hook & Reveal',
  showcase: 'Key Benefit',
  benefit: 'Feature Proof',
  cta: 'Urgency CTA',
};

interface InlineImageInput {
  base64: string;
  mimeType: string;
}

async function generatePlanWithRetry(
  ai: GoogleGenAI,
  parts: Array<Record<string, any>>,
  schema: Record<string, any>
): Promise<{ response: any; modelUsed: string }> {
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-4-hydrogen',
    'gemini-3.8-flash',
  ];
  let lastError: any = null;

  for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
    const model = modelsToTry[attempt];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      return { response, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isNotFound = msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available');
      const isTransient =
        isNotFound ||
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === modelsToTry.length - 1) {
        throw err;
      }
      if (!isNotFound) {
        await new Promise((r) => setTimeout(r, 550 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

function sanitizeInlineImages(rawImages: unknown): InlineImageInput[] {
  if (!Array.isArray(rawImages)) return [];
  const results: InlineImageInput[] = [];
  for (const item of rawImages.slice(0, 4)) {
    if (!item || typeof item !== 'object') continue;
    const rawB64 = String((item as any).base64 || '').trim();
    const rawMime = String((item as any).mimeType || 'image/jpeg').trim();
    if (!rawB64) continue;
    const cleanB64 = rawB64.includes(',') ? rawB64.split(',')[1] : rawB64;
    if (cleanB64.length < 100 || cleanB64.length > 3_500_000) continue;
    const safeMime = /^image\/(jpeg|jpg|png|webp)$/i.test(rawMime)
      ? rawMime.toLowerCase().replace('image/jpg', 'image/jpeg')
      : 'image/jpeg';
    results.push({ base64: cleanB64, mimeType: safeMime });
  }
  return results;
}

export async function onRequestPost(context: any) {
  try {
    const env = context.env || {};
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY is not configured on Cloudflare Pages secrets.',
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
    const price = Number(product.price) > 0 ? `$${Number(product.price).toFixed(2)}` : '';

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

    const inlineImages = sanitizeInlineImages(body?.productImages);

    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const featuresText = features.length > 0 ? ` Key features: ${features.join('; ')}.` : '';
    const priceText = price ? ` Price: ${price}.` : '';
    const rawDescriptionInput = `${description || title}.${featuresText}${priceText}`.trim();

    const prompt = `# ROLE & OBJECTIVE
You are a high-converting TikTok, Instagram Reels & YouTube Shorts AI Commercial Director creating a punchy 12-second product ad for DBuy Store.
${
  inlineImages.length > 0
    ? `You are viewing ${inlineImages.length} real product photo(s) attached to this request. Study the exact product design, colors, finishes, standout features, and everyday use case.`
    : ''
}

# PART 1: PUNCHY 12-SECOND COMMERCIAL SCRIPT ("fullVoiceoverScript")
- Structure strictly as: Hook -> Key Benefit -> Proof/Demo -> Urgency CTA.
- Target 22 to 34 words total (3 to 4 crisp, energetic sentences) tailored to a "${voiceTone}" voice delivery.
- Sound like a viral high-converting social brand ad — natural, vivid, scroll-stopping, and benefit-led.
- Close with a short urgency CTA mentioning DBuy Store (e.g., "Grab yours today at DBuy Store.").
- Distribute the spoken lines cleanly across the 4 scenes' "voiceoverLine" fields so word-by-word subtitles stay perfectly synced.

# PART 2: SCENE-BY-SCENE KINETIC TYPOGRAPHY & MOTION CHOREOGRAPHY ("scenes")
- Output exactly 4 scenes with roles: "hook", "showcase", "benefit", "cta" totaling ~9.6 seconds (followed by a 2.5s DBuy Branded Outro = ~12.1s total).
- For EACH scene, craft:
  * "calloutBadge": A punchy 2-4 word feature pill badge tailored to this exact product (examples: "Apple Find My Ready", "Zero Monthly Fees", "Track Anywhere", "Fast USB-C Charge", "Instant Setup").
  * "headline": Ultra-crisp kinetic display title (2-4 words, punchy).
  * "subheadline": Short supporting benefit (3-6 words).
  * "highlightWord": Single bold power word from that scene to pop in accent color.
  * "motionStyle": Choose the best dynamic 60fps camera/motion transition from ONLY these 4 values (vary across scenes so every cut feels fresh):
    - "zoom_punch" (Fast Zoom-Punch with spring snap & impact ring)
    - "whip_pan" (Whip-Pan Snap directional slide with motion blur)
    - "tilt_3d" (3D Perspective Tilt floating showcase card)
    - "light_sweep" (Studio Light Sweep volumetric sheen across surface)
  * "voiceoverLine": The exact synced spoken phrase for this beat (displayed as bold word-by-word highlighted subtitles).
  * "visualPrompt": Brief visual direction note for studio backdrop & lighting.

# PART 3: ACCENT COLOR ("accentColorHex")
- Pick one clean vibrant hex color (e.g., "#0D92FF", "#38BDF8", "#F97316", "#10B981", "#A855F7") that harmonizes with the product photos for ambient glow and kinetic badges.

# STRICT NEGATIVE CONSTRAINTS
- NEVER include meta-instructions, prompt labels, voice/accent names, SKUs, dimensions, or shipping boilerplate inside "fullVoiceoverScript", "calloutBadge", or scene subtitles.
- NEVER output words like "voiceover", "American English", "British English", "commercial", or "studio lighting" inside spoken copy.

# PRODUCT INPUT DATA
Product Title: ${title}
Category: ${category}
Visual Theme: ${visualTheme} (${aspectRatio})
Product Details: ${rawDescriptionInput}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        accentColorHex: {
          type: Type.STRING,
          description: 'Vibrant hex accent color matching the product palette (e.g. #0D92FF).',
        },
        fullVoiceoverScript: {
          type: Type.STRING,
          description:
            'Punchy 12-second (22-34 word) Hook -> Key Benefit -> Urgency CTA commercial script.',
        },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              role: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
              calloutBadge: {
                type: Type.STRING,
                description: 'Punchy 2-4 word kinetic callout badge (e.g. "Apple Find My Ready").',
              },
              headline: { type: Type.STRING },
              subheadline: { type: Type.STRING },
              highlightWord: { type: Type.STRING },
              voiceoverLine: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
              motionStyle: {
                type: Type.STRING,
                description: 'One of: zoom_punch, whip_pan, tilt_3d, light_sweep',
              },
            },
            required: [
              'sceneNumber',
              'role',
              'durationSec',
              'calloutBadge',
              'headline',
              'subheadline',
              'highlightWord',
              'voiceoverLine',
              'visualPrompt',
              'motionStyle',
            ],
          },
        },
      },
      required: ['accentColorHex', 'fullVoiceoverScript', 'scenes'],
    };

    const parts: Array<Record<string, any>> = [
      ...inlineImages.map((img) => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.base64,
        },
      })),
      { text: prompt },
    ];

    const { response, modelUsed } = await generatePlanWithRetry(ai, parts, responseSchema);
    const rawText = (response?.text || '').trim();
    if (!rawText) {
      return new Response(
        JSON.stringify({ success: false, error: 'Gemini Director returned an empty commercial plan.' }),
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const parsed = JSON.parse(rawText);
    const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
    const expectedRoles: CommercialSceneRole[] = ['hook', 'showcase', 'benefit', 'cta'];
    const defaultDurations = [2.3, 2.5, 2.5, 2.3];

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
      const durationSec = defaultDurations[idx] || 2.4;
      const motionStyle: CommercialMotionStyle = normalizeMotionStyle(
        String(src.motionStyle || src.cameraMotion || ''),
        idx
      );

      const fallbackLine =
        scriptSentences[idx] ||
        (idx === 3 ? scriptSentences[scriptSentences.length - 1] || fullVoiceoverScript : '');
      const syncedLine =
        sanitizeSpokenVoiceoverScript(String(src.voiceoverLine || '')).slice(0, 140) || fallbackLine;
      const headline =
        sanitizeCommercialCopy(String(src.headline || '')).slice(0, 44) ||
        ROLE_LABELS[expectedRole];
      const calloutBadge =
        sanitizeCommercialCopy(String(src.calloutBadge || '')).slice(0, 34) || headline;
      const highlightWord =
        sanitizeCommercialCopy(String(src.highlightWord || '')).split(/\s+/)[0]?.slice(0, 20) ||
        headline.split(/\s+/)[0] ||
        'DBUY';

      return {
        sceneNumber: idx + 1,
        role: expectedRole,
        roleLabel: ROLE_LABELS[expectedRole],
        durationSec,
        calloutBadge,
        headline,
        subheadline: sanitizeCommercialCopy(String(src.subheadline || '')).slice(0, 72),
        highlightWord,
        voiceoverLine: syncedLine,
        visualPrompt: optimizeCommercialVisualPrompt(
          String(src.visualPrompt || ''),
          visualTheme,
          title
        ),
        negativePrompt: ENFORCED_NEGATIVE_PROMPT,
        motionStyle,
        cameraMotion: motionStyle,
      };
    });

    const estimatedDurationSec =
      Math.round(normalizedScenes.reduce((sum, s) => sum + s.durationSec, 0) * 10) / 10;
    const rawHex = String(parsed?.accentColorHex || '').trim();
    const accentColorHex = /^#[0-9a-fA-F]{6}$/.test(rawHex) ? rawHex : '#0D92FF';

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
      modelUsed,
      accentColorHex,
    };

    return new Response(
      JSON.stringify({
        success: true,
        plan,
        modelUsed,
        analyzedImagesCount: inlineImages.length,
      }),
      {
        status: 200,
        headers: CORS_HEADERS,
      }
    );
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
