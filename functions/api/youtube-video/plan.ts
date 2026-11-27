import { GoogleGenAI, Type } from '@google/genai';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function buildFallbackYouTubePlan(
  title: string,
  price: string,
  _origPrice: string,
  features: string[],
  _aspectRatio: string
) {
  const f1 = features[0] || 'Premium Engineering & Sleek Finish';
  const f2 = features[1] || 'Designed for Everyday Peak Performance';
  const f3 = features[2] || 'Uncompromising Build & Modern Reliability';
  const priceDisplay = price ? `$${price}` : 'Special Price';

  const scenes = [
    {
      sceneNumber: 1,
      role: 'hook',
      roleLabel: 'The Hook',
      durationSec: 4.2,
      headline: 'MEET THE FUTURE',
      subheadline: title.slice(0, 40),
      voiceover: `Upgrade your daily setup with ${title.slice(0, 35)}.`,
      cameraMotion: 'slow_zoom_in',
    },
    {
      sceneNumber: 2,
      role: 'showcase',
      roleLabel: 'Feature & Craft',
      durationSec: 4.5,
      headline: 'PRECISION CRAFT',
      subheadline: f1.slice(0, 50),
      voiceover: `Engineered with ${f1.slice(0, 45)} for total reliability.`,
      cameraMotion: 'smooth_pan_right',
    },
    {
      sceneNumber: 3,
      role: 'benefit',
      roleLabel: 'Everyday Benefit',
      durationSec: 4.5,
      headline: 'SEAMLESS POWER',
      subheadline: f2.slice(0, 50),
      voiceover: `Experience ${f2.slice(0, 45)} every single day.`,
      cameraMotion: 'macro_reveal',
    },
    {
      sceneNumber: 4,
      role: 'cta',
      roleLabel: 'Special Offer',
      durationSec: 4.5,
      headline: 'ORDER YOURS TODAY',
      subheadline: `Now available for ${priceDisplay} at DBUY Store`,
      voiceover: `Grab yours now at DBUY Store for only ${priceDisplay}.`,
      cameraMotion: 'gentle_orbit',
    },
  ];

  return {
    youtubeTitle: `${title.slice(0, 45)} — Official Showcase ⚡ #Shorts #DBUY`,
    youtubeDescription: `Discover ${title}. Engineered for modern lifestyle, work, and everyday excellence.\n\n🔥 Order now at DBUY Store: https://dbuystore.com\n💰 Price: ${priceDisplay}\n\nFeatures:\n• ${f1}\n• ${f2}\n• ${f3}\n\n#dbuy #gadgets #tech #shopping #shorts`,
    youtubeTags: ['dbuy', 'dbuystore', 'tech', 'gadgets', 'shorts', 'review', 'shopping'],
    ctaText: 'Shop Now at DBUY',
    fullVoiceoverScript: `Upgrade your daily setup with ${title.slice(0, 35)}. Engineered with ${f1.slice(0, 40)} for peak performance. Grab yours now at DBUY Store for only ${priceDisplay}.`,
    scenes,
    estimatedDurationSec: 17.7,
    modelUsed: 'deterministic-fallback',
  };
}

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json().catch(() => ({}));
    const product = body.product || {};
    const title = String(product.title || '').trim().slice(0, 250);
    const price = String(product.price ?? '').trim();
    const origPrice = String(product.origPrice ?? '').trim();
    const features: string[] = Array.isArray(product.features)
      ? product.features.map((f: unknown) => String(f || '').trim()).filter(Boolean).slice(0, 8)
      : [];
    const images: string[] = Array.isArray(product.images)
      ? product.images.map((img: unknown) => String(img || '').trim()).filter(Boolean).slice(0, 6)
      : [];
    const aspectRatio = body.aspectRatio === '16:9' ? '16:9' : '9:16';

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product title is required' }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      const fallbackPlan = buildFallbackYouTubePlan(title, price, origPrice, features, aspectRatio);
      return new Response(
        JSON.stringify({ success: true, plan: fallbackPlan, modelUsed: 'deterministic-fallback' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a world-class YouTube commercial director creating a viral, high-converting 15–20 second promotional video ad for YouTube (${aspectRatio === '9:16' ? 'YouTube Shorts 9:16' : 'Standard YouTube 16:9'}).

PRODUCT DATA:
- Title: ${title}
- Price: $${price}${origPrice ? ` (Original: $${origPrice})` : ''}
- Key Features: ${features.join('; ') || 'Sleek design, premium build, maximum reliability'}
- Product Image URLs: ${images.join(', ') || 'Official high-resolution product photos'}

CRITICAL DIRECTIVES:
1. Divide the commercial into exactly 4 timed scenes (total duration between 16 and 18 seconds):
   - Scene 1: Hook / Attention (3.8 - 4.5s)
   - Scene 2: Feature Showcase & Craft (3.8 - 4.5s)
   - Scene 3: Everyday Benefit & Lifestyle (3.8 - 4.5s)
   - Scene 4: Call to Action & Pricing (3.8 - 4.5s)
2. For each scene provide:
   - headline: 2 to 4 punchy, high-energy words (e.g. "MEET THE FUTURE", "UNMATCHED CLARITY").
   - subheadline: 3 to 7 words highlighting the feature/benefit.
   - voiceover: 1 natural, conversational English spoken sentence (strictly under 15 words).
   - cameraMotion: choose one of ["slow_zoom_in", "smooth_pan_right", "macro_reveal", "gentle_orbit"].
   - durationSec: number between 3.8 and 4.8.
3. fullVoiceoverScript: A cohesive 30–45 word English narration combining the scenes.
4. youtubeTitle: Catchy YouTube title (under 70 chars) with hashtags (e.g., "${title.slice(0, 35)} — Ultimate Everyday Essential ⚡ #Shorts").
5. youtubeDescription: Engaging YouTube description with highlights, price, and store URL (https://dbuystore.com).
6. youtubeTags: Array of 5–8 relevant tags (e.g. ["tech", "gadgets", "shorts", "dbuystore"]).
7. ctaText: Closing CTA button text (e.g. "Order at DBUY Store").`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        youtubeTitle: { type: Type.STRING },
        youtubeDescription: { type: Type.STRING },
        youtubeTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        ctaText: { type: Type.STRING },
        fullVoiceoverScript: { type: Type.STRING },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              role: { type: Type.STRING },
              headline: { type: Type.STRING },
              subheadline: { type: Type.STRING },
              voiceover: { type: Type.STRING },
              cameraMotion: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
            },
            required: ['sceneNumber', 'headline', 'subheadline', 'voiceover', 'cameraMotion', 'durationSec'],
          },
        },
      },
      required: ['scenes', 'fullVoiceoverScript', 'youtubeTitle', 'youtubeDescription', 'ctaText'],
    };

    let geminiResponse: any = null;
    let modelUsed = 'gemini-2.5-pro';

    try {
      // 1. Try gemini-2.5-pro first
      geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
    } catch (proErr: any) {
      console.warn('[YOUTUBE-STUDIO-CF] gemini-2.5-pro failed or rate-limited, falling back to gemini-2.5-flash:', proErr?.message || proErr);
      modelUsed = 'gemini-2.5-flash';
      // 2. Fallback to gemini-2.5-flash
      try {
        geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (flashErr: any) {
        console.warn('[YOUTUBE-STUDIO-CF] gemini-2.5-flash failed, using fallback:', flashErr?.message || flashErr);
        const fallbackPlan = buildFallbackYouTubePlan(title, price, origPrice, features, aspectRatio);
        return new Response(
          JSON.stringify({ success: true, plan: fallbackPlan, modelUsed: 'deterministic-fallback' }),
          { status: 200, headers: CORS_HEADERS }
        );
      }
    }

    const rawText = (geminiResponse?.text || '').trim();
    if (!rawText) {
      const fallbackPlan = buildFallbackYouTubePlan(title, price, origPrice, features, aspectRatio);
      return new Response(
        JSON.stringify({ success: true, plan: fallbackPlan, modelUsed: 'deterministic-fallback' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const fallbackPlan = buildFallbackYouTubePlan(title, price, origPrice, features, aspectRatio);
      return new Response(
        JSON.stringify({ success: true, plan: fallbackPlan, modelUsed: 'deterministic-fallback' }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
    const roleMap: Record<number, { role: string; roleLabel: string; camera: string }> = {
      0: { role: 'hook', roleLabel: 'The Hook', camera: 'slow_zoom_in' },
      1: { role: 'showcase', roleLabel: 'Feature & Craft', camera: 'smooth_pan_right' },
      2: { role: 'benefit', roleLabel: 'Everyday Benefit', camera: 'macro_reveal' },
      3: { role: 'cta', roleLabel: 'Call To Action', camera: 'gentle_orbit' },
    };

    const scenes = [0, 1, 2, 3].map((idx) => {
      const src = rawScenes[idx] || {};
      const def = roleMap[idx];
      const durationSec = Math.max(3.5, Math.min(5.5, Number(src.durationSec) || 4.2));
      const validCam = ['slow_zoom_in', 'smooth_pan_right', 'macro_reveal', 'gentle_orbit'].includes(src.cameraMotion)
        ? src.cameraMotion
        : def.camera;

      return {
        sceneNumber: idx + 1,
        role: def.role,
        roleLabel: def.roleLabel,
        durationSec,
        headline: String(src.headline || def.roleLabel).toUpperCase().slice(0, 48),
        subheadline: String(src.subheadline || title).slice(0, 80),
        voiceover: String(src.voiceover || '').slice(0, 150),
        cameraMotion: validCam,
      };
    });

    const totalDurationSec = Math.round(scenes.reduce((sum, s) => sum + s.durationSec, 0) * 10) / 10;

    const plan = {
      scenes,
      fullVoiceoverScript: String(parsed.fullVoiceoverScript || '').trim(),
      youtubeTitle: String(parsed.youtubeTitle || `${title} — Official Showcase ⚡ #Shorts`).trim().slice(0, 100),
      youtubeDescription: String(parsed.youtubeDescription || `Discover ${title} at DBUY Store: https://dbuystore.com`).trim(),
      youtubeTags: Array.isArray(parsed.youtubeTags)
        ? parsed.youtubeTags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 10)
        : ['tech', 'dbuy', 'shorts'],
      ctaText: String(parsed.ctaText || 'Shop Now at DBUY').trim().slice(0, 40),
      estimatedDurationSec: totalDurationSec,
      modelUsed,
    };

    return new Response(JSON.stringify({ success: true, plan, modelUsed }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    console.error('[YOUTUBE-STUDIO-CF] Unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to generate YouTube video plan' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
