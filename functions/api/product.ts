import { GoogleGenAI } from '@google/genai';

type PagesFunction<Env = any, Params extends string = any> = (context: {
  request: Request;
  env: Env;
  params: Record<Params, string>;
}) => Promise<Response> | Response;

interface Env {
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not supported' }, 405);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return jsonResponse({
      success: false,
      error: 'GEMINI_API_KEY environment variable is not configured on Cloudflare.',
    }, 400);
  }

  try {
    const { title, titleKa, category, price, images, imageTitles, tone } = await request.json() as any;
    const rawTitle = (title || titleKa || (Array.isArray(imageTitles) ? imageTitles[0] : '') || 'Smart Living Essential').trim();

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contents: any[] = [];

    // Attach up to 3 images (base64 data URLs)
    if (Array.isArray(images)) {
      for (const img of images.slice(0, 3)) {
        if (typeof img === 'string') {
          if (img.startsWith('data:image/')) {
            const match = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              contents.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          } else if (img.startsWith('http://') || img.startsWith('https://')) {
            try {
              const imgRes = await fetch(img, { signal: AbortSignal.timeout(3500) });
              if (imgRes.ok) {
                const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                const arrayBuffer = await imgRes.arrayBuffer();
                // Base64 encoding via standard btoa in Worker environment
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                contents.push({
                  inlineData: {
                    mimeType: contentType.split(';')[0],
                    data: base64,
                  },
                });
              }
            } catch (fetchErr) {
              console.warn('Could not fetch remote image for Gemini visual inspection:', fetchErr);
            }
          }
        }
      }
    }

    const promptText = `You are an elite, award-winning e-commerce product copywriter for DBUY Store (Smart Commerce).
Your task is to craft an irresistibly magnetic, highly persuasive, and extremely concise product description, key features, and titles directly based on the uploaded product photos, image titles/filenames, and the product title.

Input Details:
- Image Titles / File Names: "${Array.isArray(imageTitles) && imageTitles.length > 0 ? imageTitles.join(', ') : 'None'}"
- English Title: "${title || ''}"
- Georgian Title: "${titleKa || ''}"
- Category: "${category || 'tech'}"
- Price: "$${price || ''}"
- Tone: "${tone || 'high-converting'}"

CRITICAL OUTPUT REQUIREMENTS:
1. CONCISE & PUNCHY:
   - "descriptionEn": Exactly 2 to 3 short, engaging, high-impact sentences (max 45 words). Absolutely no verbose marketing filler, no fluff, and no generic promotional sentences. Keep it extremely crisp and focused.
   - "descriptionKa": Exactly 2 to 3 short, natural, and highly attractive sentences in Georgian (ქართული სარეკლამო აღწერა). It must be native, persuasive, and grammatically flawless.
2. CONTEXT-AWARE SPECIFICS:
   - Extract and highlight concrete physical or functional features visible in the image or strongly implied by the title/category (e.g., specific materials like matte-finish aluminum, silicone, braided cable, or key technical specifications like ANC, MagSafe, dual-lens, G-sensor).
3. INDIVIDUALIZED TONE & VARIETY:
   - NEVER use repetitive templates or start with clichéd entry hooks (do NOT repeat "Introducing...", "Upgrade your lifestyle with...", "Meet the...", "Step up your...", etc.).
   - Vary your sentence structures, hooks, and vocabulary dynamically based on the specific product. Every product description should feel uniquely custom-tailored.
4. SALES APPEAL:
   - Highlight the primary practical benefit or distinguishing detail immediately in the very first sentence.
5. FEATURES:
   - "featuresEn": Exactly 4 extremely punchy, benefit-first bullet points in English (each under 10 words) with a single relevant emoji.
   - "featuresKa": Exactly 4 matching punchy bullet points in Georgian with emojis.
6. SLUG & BADGE:
   - "customSlug": A clean, SEO-friendly URL slug.
   - "badge": A short, catchy badge (e.g., "Best Seller", "Hot Deal", "Premium", "Trending", "New").

Return ONLY a valid JSON object matching this schema without markdown code blocks, backticks, or wrapping formatting:
{
  "titleEn": "sleek English title",
  "titleKa": "sleek Georgian title",
  "descriptionEn": "2-3 punchy sentences",
  "descriptionKa": "2-3 punchy Georgian sentences",
  "featuresEn": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "featuresKa": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "customSlug": "clean-slug",
  "badge": "Short Badge"
}`;

    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (response && response.text) {
      try {
        const parsed = JSON.parse(response.text);
        return jsonResponse({ success: true, data: parsed });
      } catch (jsonErr) {
        console.warn('Could not parse Gemini JSON response:', jsonErr);
        return jsonResponse({ success: false, error: 'Could not parse Gemini JSON output.' }, 500);
      }
    }

    return jsonResponse({ success: false, error: 'No content generated.' }, 500);
  } catch (err: any) {
    console.error('Gemini API call failed:', err);
    return jsonResponse({ success: false, error: err?.message || 'Gemini API call failed.' }, 500);
  }
};
