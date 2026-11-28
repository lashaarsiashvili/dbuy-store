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

function computeDiscountTag(priceStr: string, origPriceStr: string): string {
  const p = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  const op = parseFloat(origPriceStr.replace(/[^0-9.]/g, ''));
  if (op > p && p > 0) {
    const pct = Math.round(((op - p) / op) * 100);
    if (pct > 0) return `-${pct}% OFF`;
  }
  return 'SPECIAL OFFER';
}

function buildFallbackYouTubePlan(
  title: string,
  price: string,
  origPrice: string,
  features: string[],
  _aspectRatio: string
) {
  const f1 = features[0] || 'Aerospace Aluminum & Precision Finish';
  const f2 = features[1] || 'Engineered for Everyday Peak Performance';
  const f3 = features[2] || 'Uncompromising Build & Long-Term Reliability';
  const priceDisplay = price ? `$${price}` : 'Special Price';
  const discountTag = computeDiscountTag(price, origPrice);

  const scenes = [
    {
      sceneNumber: 1,
      role: 'hook',
      roleLabel: 'The Hook',
      durationSec: 4.2,
      headline: 'MEET THE FUTURE',
      subheadline: title.slice(0, 40),
      calloutBadge: 'FLAGSHIP DESIGN',
      specDetail: 'Ultra-refined studio build',
      voiceover: `Upgrade your daily setup with ${title.slice(0, 35)}.`,
      cameraChoreography: 'tilt_3d',
    },
    {
      sceneNumber: 2,
      role: 'showcase',
      roleLabel: 'Feature & Craft',
      durationSec: 4.5,
      headline: 'PRECISION CRAFT',
      subheadline: f1.slice(0, 50),
      calloutBadge: (features[0] || 'TITANIUM ALLOY').slice(0, 24).toUpperCase(),
      specDetail: f1.slice(0, 40),
      voiceover: `Engineered with ${f1.slice(0, 45)} for total reliability.`,
      cameraChoreography: 'light_sweep',
    },
    {
      sceneNumber: 3,
      role: 'benefit',
      roleLabel: 'Everyday Benefit',
      durationSec: 4.5,
      headline: 'SEAMLESS POWER',
      subheadline: f2.slice(0, 50),
      calloutBadge: '5-STAR RATED',
      specDetail: '4.9 ★ Verified Customer Rating',
      voiceover: `Experience ${f2.slice(0, 45)} every single day.`,
      cameraChoreography: 'parallax_float',
    },
    {
      sceneNumber: 4,
      role: 'cta',
      roleLabel: 'Special Offer',
      durationSec: 4.5,
      headline: 'ORDER YOURS TODAY',
      subheadline: `Now available for ${priceDisplay} at DBUY Store`,
      calloutBadge: discountTag,
      specDetail: 'Free Worldwide Shipping Available',
      voiceover: `Grab yours now at DBUY Store for only ${priceDisplay}.`,
      cameraChoreography: 'zoom_punch',
    },
  ];

  return {
    dominantColors: {
      primaryAccent: '#0D92FF',
      secondaryGlow: '#38BDF8',
      pedestalColor: '#1E293B',
    },
    visualHook: 'ENGINEERED FOR PEAK PERFORMANCE',
    discountTag,
    ratingScore: 4.9,
    ratingReviewCount: 1280,
    youtubeTitle: `${title.slice(0, 45)} — Official Showcase ⚡ #Shorts #DBUY`,
    youtubeDescription: `Discover ${title}. Engineered for modern lifestyle, work, and everyday excellence.\n\n🔥 Order now at DBUY Store: https://dbuystore.com\n💰 Price: ${priceDisplay} (${discountTag})\n\nKey Specs:\n• ${f1}\n• ${f2}\n• ${f3}\n\n#dbuy #gadgets #tech #shopping #shorts`,
    youtubeTags: ['dbuy', 'dbuystore', 'tech', 'gadgets', 'shorts', 'review', 'shopping'],
    ctaText: 'Shop Now at DBUYStore.com',
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
    const imageParts: Array<{ mimeType: string; data: string }> = Array.isArray(product.imageParts)
      ? product.imageParts
      : Array.isArray(body.imageParts)
      ? body.imageParts
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

    const promptText = `You are an elite motion-graphics commercial director creating a viral, studio-grade 15–18 second promotional ad for YouTube (${aspectRatio === '9:16' ? 'YouTube Shorts (9:16 vertical)' : 'Standard YouTube (16:9 widescreen)'}).

Visually examine the product's design, materials, finish, and silhouette from the provided image(s), along with the product details:
- Title: ${title}
- Price: $${price}${origPrice ? ` (Original: $${origPrice})` : ''}
- Key Specs & Features: ${features.join('; ') || 'Premium craftsmanship, ergonomic design, high durability'}
- Product Image URLs: ${images.join(', ') || 'Official product photos'}

Analyze the product and return a structured JSON commercial plan:
1. dominantColors:
   - primaryAccent: Hex code for the primary vibrant accent color seen in the product (e.g. #0D92FF, #EF4444, #10B981, #F59E0B, #8B5CF6).
   - secondaryGlow: Complementary neon glow hex code.
   - pedestalColor: Sleek ground pedestal highlight hex code (e.g. #1E293B, #0F172A).
2. visualHook: 2 to 4 punchy words (e.g. "ENGINEERED FOR PEAK AUDIO", "UNRIVALED ERGONOMICS").
3. discountTag: Formatted discount tag like "-28% OFF" or "SPECIAL LAUNCH PRICE".
4. ratingScore: Realistic rating score like 4.9.
5. ratingReviewCount: Realistic review count like 1420.
6. scenes: Exactly 4 choreographed scenes (3.6s to 4.5s each, total ~15-18s):
   - Scene 1 (Hook / Attention): Rapid camera entrance, dramatic lighting, bold title hook.
   - Scene 2 (Feature Showcase): Detailed spec breakdown, glassmorphism callout card.
   - Scene 3 (Social Proof & Everyday Benefit): 5-star customer rating pop-up, lifestyle reliability benefit.
   - Scene 4 (Closing Call-to-Action): Price tag reveal, urgent offer, store badge.
   For each scene:
   - sceneNumber: 1, 2, 3, or 4
   - role: "hook", "showcase", "benefit", or "cta"
   - roleLabel: Short label (e.g., "The Hook", "Precision Craft", "Verified Quality", "Special Offer")
   - durationSec: number between 3.6 and 4.6
   - headline: 2 to 4 punchy uppercase words
   - subheadline: 4 to 8 words describing the benefit
   - calloutBadge: Glassmorphism spec badge (e.g. "TITANIUM FRAME", "40H PLAYTIME", "IPX8 WATERPROOF")
   - specDetail: Concise spec specification (e.g. "Bluetooth 5.3 · Ultra-Low Latency")
   - voiceover: 1 natural, conversational spoken English sentence (strictly under 14 words)
   - cameraChoreography: one of ["tilt_3d", "parallax_float", "light_sweep", "dof_blur_whip", "zoom_punch"]
7. fullVoiceoverScript: A seamless 35–48 word English commercial script combining the spoken sentences.
8. youtubeTitle: Catchy YouTube title (under 70 chars) with hashtags (e.g. "${title.slice(0, 35)} — Studio Commercial ⚡ #Shorts #DBUY").
9. youtubeDescription: Engaging description with store link https://dbuystore.com and bullet points.
10. youtubeTags: Array of 6-8 relevant tags.
11. ctaText: Call-to-action button label ("Shop Now at DBUYStore.com").`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        dominantColors: {
          type: Type.OBJECT,
          properties: {
            primaryAccent: { type: Type.STRING },
            secondaryGlow: { type: Type.STRING },
            pedestalColor: { type: Type.STRING },
          },
          required: ['primaryAccent', 'secondaryGlow', 'pedestalColor'],
        },
        visualHook: { type: Type.STRING },
        discountTag: { type: Type.STRING },
        ratingScore: { type: Type.NUMBER },
        ratingReviewCount: { type: Type.INTEGER },
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
              roleLabel: { type: Type.STRING },
              headline: { type: Type.STRING },
              subheadline: { type: Type.STRING },
              calloutBadge: { type: Type.STRING },
              specDetail: { type: Type.STRING },
              voiceover: { type: Type.STRING },
              cameraChoreography: { type: Type.STRING },
              durationSec: { type: Type.NUMBER },
            },
            required: [
              'sceneNumber',
              'role',
              'headline',
              'subheadline',
              'calloutBadge',
              'voiceover',
              'cameraChoreography',
              'durationSec',
            ],
          },
        },
      },
      required: [
        'dominantColors',
        'visualHook',
        'scenes',
        'fullVoiceoverScript',
        'youtubeTitle',
        'youtubeDescription',
        'ctaText',
      ],
    };

    // Prepare multimodal contents if images are passed
    const geminiContents: any[] = [];
    if (Array.isArray(imageParts) && imageParts.length > 0) {
      for (const p of imageParts.slice(0, 3)) {
        if (p?.data && p?.mimeType) {
          geminiContents.push({
            inlineData: {
              mimeType: p.mimeType,
              data: p.data,
            },
          });
        }
      }
    }
    geminiContents.push({ text: promptText });

    let geminiResponse: any = null;
    let modelUsed = 'gemini-2.5-pro';

    try {
      // 1. Try gemini-2.5-pro first
      geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: geminiContents },
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
    } catch (proErr: any) {
      console.warn(
        '[YOUTUBE-STUDIO-CF] gemini-2.5-pro failed or rate-limited, falling back to gemini-2.5-flash:',
        proErr?.message || proErr
      );
      modelUsed = 'gemini-2.5-flash';
      // 2. Fallback to gemini-2.5-flash
      try {
        geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: geminiContents },
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      } catch (flashErr: any) {
        console.warn(
          '[YOUTUBE-STUDIO-CF] gemini-2.5-flash failed, using fallback:',
          flashErr?.message || flashErr
        );
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
    const roleMap: Record<number, { role: string; roleLabel: string; camera: string; badge: string }> = {
      0: { role: 'hook', roleLabel: 'The Hook', camera: 'tilt_3d', badge: 'NEW ARRIVAL' },
      1: { role: 'showcase', roleLabel: 'Feature & Craft', camera: 'light_sweep', badge: 'PRO BUILD' },
      2: { role: 'benefit', roleLabel: 'Everyday Benefit', camera: 'parallax_float', badge: '5-STAR RATED' },
      3: { role: 'cta', roleLabel: 'Special Offer', camera: 'zoom_punch', badge: 'LIMITED DEAL' },
    };

    const validCameras = ['tilt_3d', 'parallax_float', 'light_sweep', 'dof_blur_whip', 'zoom_punch'];

    let timeAccum = 0;
    const scenes = [0, 1, 2, 3].map((idx) => {
      const src = rawScenes[idx] || {};
      const def = roleMap[idx];
      const durationSec = Math.max(3.5, Math.min(5.0, Number(src.durationSec) || 4.2));
      const validCam = validCameras.includes(src.cameraChoreography || src.cameraMotion)
        ? (src.cameraChoreography || src.cameraMotion)
        : def.camera;

      const sceneStart = Math.round(timeAccum * 10) / 10;
      timeAccum += durationSec;
      const sceneEnd = Math.round(timeAccum * 10) / 10;

      return {
        sceneNumber: idx + 1,
        role: def.role,
        roleLabel: String(src.roleLabel || def.roleLabel).slice(0, 30),
        durationSec,
        timestampStart: sceneStart,
        timestampEnd: sceneEnd,
        headline: String(src.headline || def.roleLabel).toUpperCase().slice(0, 48),
        subheadline: String(src.subheadline || title).slice(0, 80),
        calloutBadge: String(src.calloutBadge || def.badge).toUpperCase().slice(0, 28),
        specDetail: String(src.specDetail || features[idx] || '').slice(0, 60),
        voiceover: String(src.voiceover || '').slice(0, 150),
        voiceoverLine: String(src.voiceover || '').slice(0, 150),
        cameraChoreography: validCam,
        cameraMotion: validCam,
      };
    });

    const totalDurationSec = Math.round(timeAccum * 10) / 10;

    const discountTag = String(parsed.discountTag || computeDiscountTag(price, origPrice)).slice(0, 24);

    const plan = {
      dominantColors: {
        primaryAccent: String(parsed.dominantColors?.primaryAccent || '#0D92FF'),
        secondaryGlow: String(parsed.dominantColors?.secondaryGlow || '#38BDF8'),
        pedestalColor: String(parsed.dominantColors?.pedestalColor || '#1E293B'),
      },
      visualHook: String(parsed.visualHook || 'PRECISION CRAFT & PERFORMANCE').slice(0, 50),
      discountTag,
      ratingScore: Number(parsed.ratingScore) || 4.9,
      ratingReviewCount: Number(parsed.ratingReviewCount) || 1280,
      scenes,
      fullVoiceoverScript: String(parsed.fullVoiceoverScript || '').trim(),
      youtubeTitle: String(
        parsed.youtubeTitle || `${title.slice(0, 40)} — Official Showcase ⚡ #Shorts #DBUY`
      ).trim().slice(0, 100),
      youtubeDescription: String(
        parsed.youtubeDescription ||
          `Discover ${title} at DBUY Store: https://dbuystore.com\nPrice: $${price} (${discountTag})`
      ).trim(),
      youtubeTags: Array.isArray(parsed.youtubeTags)
        ? parsed.youtubeTags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 10)
        : ['tech', 'dbuy', 'shorts', 'shopping'],
      ctaText: String(parsed.ctaText || 'Shop Now at DBUYStore.com').trim().slice(0, 40),
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
