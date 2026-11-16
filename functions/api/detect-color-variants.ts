import { EventContext } from '@cloudflare/workers-types';
import { GoogleGenAI, Type } from '@google/genai';

interface AutoDetectedVariant {
  id: string;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  primaryImageUrl: string;
  galleryImages: string[];
  confidence: number;
}

interface VisionImageAnalysis {
  imageIndex: number;
  isSingleColorProductShot: boolean;
  detectedColorName: string;
  detectedColorHex: string;
  detectedSizeLabel: string;
  confidence: number;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Slug, X-Admin-Key',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context: EventContext<any, any, any>): Promise<Response> {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const env = context.env || {};
    const imageUrls: string[] = Array.isArray(body?.imageUrls)
      ? body.imageUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0).slice(0, 12)
      : [];
    const productTitle = typeof body?.productTitle === 'string' ? body.productTitle.trim() : '';

    if (imageUrls.length === 0) {
      return new Response(JSON.stringify({ success: true, variants: [] }), { headers: CORS_HEADERS });
    }

    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return new Response(JSON.stringify({ success: true, variants: [], fallback: true }), { headers: CORS_HEADERS });
    }

    const fetchedImages = await Promise.all(
      imageUrls.map(async (url, idx) => {
        try {
          if (url.startsWith('data:image/')) {
            const match = url.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
            if (match && match[2]) {
              return { idx, url, mimeType: match[1], data: match[2] };
            }
            return null;
          }
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return null;
          }
          const resp = await fetch(url, {
            signal: AbortSignal.timeout(6000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DBUYStore/1.0)',
              Accept: 'image/*,*/*;q=0.8',
            },
          });
          if (!resp.ok) return null;
          const contentType = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
          if (!contentType.startsWith('image/')) return null;
          const buf = await resp.arrayBuffer();
          if (!buf || buf.byteLength === 0 || buf.byteLength > 8 * 1024 * 1024) return null;
          return {
            idx,
            url,
            mimeType: contentType,
            data: arrayBufferToBase64(buf),
          };
        } catch {
          return null;
        }
      })
    );

    const validImages = fetchedImages.filter(
      (item): item is { idx: number; url: string; mimeType: string; data: string } => item !== null
    );

    if (validImages.length === 0) {
      return new Response(JSON.stringify({ success: true, variants: [], fallback: true }), { headers: CORS_HEADERS });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const titleColorMatch = (() => {
      const t = (productTitle || '').trim();
      const map: Array<{ p: RegExp; name: string; hex: string }> = [
        { p: /\bnavy\s*blue\b/i, name: 'Navy Blue', hex: '#1E3A8A' },
        { p: /\blight\s*blue\b/i, name: 'Light Blue', hex: '#60A5FA' },
        { p: /\blilac\b/i, name: 'Lilac', hex: '#C4B5FD' },
        { p: /\blavender\b/i, name: 'Lilac', hex: '#C4B5FD' },
        { p: /\bblue\b/i, name: 'Blue', hex: '#2563EB' },
        { p: /\bblack\b/i, name: 'Black', hex: '#18181B' },
        { p: /\bwhite\b/i, name: 'White', hex: '#F8FAFC' },
        { p: /\bred\b/i, name: 'Red', hex: '#EF4444' },
        { p: /\byellow\b/i, name: 'Yellow', hex: '#FACC15' },
        { p: /\bgreen\b/i, name: 'Green', hex: '#22C55E' },
        { p: /\bpink\b/i, name: 'Pink', hex: '#EC4899' },
        { p: /\bpurple\b/i, name: 'Purple', hex: '#8B5CF6' },
        { p: /\borange\b/i, name: 'Orange', hex: '#F97316' },
        { p: /\bsilver\b/i, name: 'Silver', hex: '#CBD5E1' },
        { p: /\bgold\b/i, name: 'Gold', hex: '#EAB308' },
        { p: /\bgr[ae]y\b/i, name: 'Gray', hex: '#9CA3AF' },
      ];
      const segs = t.split(/[-–|,/()\[\]]+/).map((s) => s.trim()).filter(Boolean);
      for (let i = segs.length - 1; i >= 0; i--) {
        if (segs[i].length > 35) continue;
        for (const m of map) if (m.p.test(segs[i])) return { name: m.name, hex: m.hex };
      }
      for (const m of map) if (m.p.test(t)) return { name: m.name, hex: m.hex };
      return null;
    })();

    const prompt = `You are a precise e-commerce catalog visual classifier. Inspect these ${validImages.length} images for "${productTitle || 'E-Commerce Product'}".
Each image is preceded by its exact integer imageIndex label (e.g. "imageIndex=0").
${titleColorMatch ? `CRITICAL RULE: The product title explicitly states the color "${titleColorMatch.name}". The main hero image (imageIndex=0) depicts "${titleColorMatch.name}" — NEVER label it as "Black" just because the studio background is dark!` : ''}

CRITICAL VISUAL RULES:
- IGNORE ALL BACKGROUNDS (both dark/black studio backgrounds and white/gray studio backgrounds). Detect ONLY the physical color of the center product object itself!
- For EACH provided image, return a JSON object inside an array:
1. "imageIndex": exact integer imageIndex label given before the image.
2. "isSingleColorProductShot": TRUE ONLY IF the image focuses on ONE specific color variant of the product. Set FALSE if:
   - It is a group shot showing multiple different colors side-by-side (e.g., 5 bottles of different colors together).
   - It is a dimension/size diagram, text infographic, packaging chart, or close-up texture without showing the main body color.
3. "detectedColorName": The exact standard English color name of the center product body (choose clear names like: "Yellow", "Black", "White", "Red", "Blue", "Navy Blue", "Light Blue", "Lilac", "Green", "Mint Green", "Pink", "Purple", "Orange", "Gray", "Silver", "Gold", "Beige", "Brown"). Use the EXACT same string for identical colors across different angles!
4. "detectedColorHex": Accurate hex code for that color (e.g., Yellow -> "#FACC15", Black -> "#18181B", Blue -> "#2563EB", Lilac -> "#C4B5FD", White -> "#F8FAFC").
5. "detectedSizeLabel": Specific size/volume if clearly shown for this variant (e.g. "500ml", "1L", "32 oz"), otherwise "".
6. "confidence": 0.0 to 1.0.`;

    const parts: any[] = [{ text: prompt }];
    for (const img of validImages) {
      parts.push({ text: `imageIndex=${img.idx}` });
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              imageIndex: { type: Type.INTEGER },
              isSingleColorProductShot: { type: Type.BOOLEAN },
              detectedColorName: { type: Type.STRING },
              detectedColorHex: { type: Type.STRING },
              detectedSizeLabel: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: [
              'imageIndex',
              'isSingleColorProductShot',
              'detectedColorName',
              'detectedColorHex',
              'confidence',
            ],
          },
        },
      },
    });

    const analyses: VisionImageAnalysis[] = JSON.parse((response.text || '[]').trim());
    if (!Array.isArray(analyses)) {
      return new Response(JSON.stringify({ success: true, variants: [] }), { headers: CORS_HEADERS });
    }

    // Enforce title-color assignment on hero image (imageIndex === 0)
    if (titleColorMatch && validImages.some((v) => v.idx === 0)) {
      const heroAnalysis = analyses.find((a) => a.imageIndex === 0);
      if (heroAnalysis) {
        heroAnalysis.isSingleColorProductShot = true;
        heroAnalysis.detectedColorName = titleColorMatch.name;
        heroAnalysis.detectedColorHex = titleColorMatch.hex;
        heroAnalysis.confidence = Math.max(Number(heroAnalysis.confidence) || 0.95, 0.95);
      } else {
        analyses.unshift({
          imageIndex: 0,
          isSingleColorProductShot: true,
          detectedColorName: titleColorMatch.name,
          detectedColorHex: titleColorMatch.hex,
          detectedSizeLabel: '',
          confidence: 0.96,
        });
      }
    }

    const colorClusters = new Map<string, AutoDetectedVariant>();
    const validByIndex = new Map(validImages.map((img) => [img.idx, img.url]));

    for (const analysis of analyses) {
      const targetUrl = validByIndex.get(analysis.imageIndex);
      if (!analysis.isSingleColorProductShot || (analysis.confidence ?? 0) < 0.7 || !targetUrl) {
        continue;
      }

      const colorName = String(analysis.detectedColorName || '').trim() || 'Default';
      const sizeLabel = String(analysis.detectedSizeLabel || '').trim();
      const clusterKey = `${colorName.toLowerCase()}__${sizeLabel.toLowerCase()}`;

      if (!colorClusters.has(clusterKey)) {
        colorClusters.set(clusterKey, {
          id: `var_auto_${Date.now()}_${colorClusters.size}`,
          colorName,
          colorHex: /^#[0-9A-Fa-f]{6}$/.test(analysis.detectedColorHex || '')
            ? analysis.detectedColorHex
            : '#18181B',
          sizeLabel,
          primaryImageUrl: targetUrl,
          galleryImages: [targetUrl],
          confidence: Number(analysis.confidence) || 0.85,
        });
      } else {
        const existing = colorClusters.get(clusterKey)!;
        if (!existing.galleryImages.includes(targetUrl)) {
          existing.galleryImages.push(targetUrl);
        }
      }
    }

    const results = Array.from(colorClusters.values());
    if (results.length <= 1 && !results[0]?.sizeLabel) {
      return new Response(JSON.stringify({ success: true, variants: [] }), { headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ success: true, variants: results }), { headers: CORS_HEADERS });
  } catch (err: any) {
    console.warn('[CF-AUTO-COLOR-VISION]', err?.message || err);
    return new Response(
      JSON.stringify({ success: true, variants: [], fallback: true }),
      { headers: CORS_HEADERS }
    );
  }
}
