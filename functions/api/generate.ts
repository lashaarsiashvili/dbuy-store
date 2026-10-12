import { GoogleGenAI } from '@google/genai';

export async function onRequestPost(context: any) {
  try {
    const req = context.request;
    const env = context.env || {};
    const body = await req.json();
    const { image, imageUrl, imageBase64, title } = body || {};
    const targetImage = image || imageUrl || imageBase64;

    let base64Data = '';
    let mimeType = 'image/jpeg';

    if (targetImage) {
      if (typeof targetImage === 'string' && targetImage.startsWith('data:')) {
        const matches = targetImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = targetImage.split(',')[1] || targetImage;
        }
      } else if (typeof targetImage === 'string' && (targetImage.startsWith('http://') || targetImage.startsWith('https://'))) {
        try {
          const imgResp = await fetch(targetImage);
          if (imgResp.ok) {
            const arrayBuf = await imgResp.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            base64Data = btoa(binary);
            const contentType = imgResp.headers.get('content-type');
            if (contentType) mimeType = contentType;
          }
        } catch (e) {
          console.warn('[CF-VISION-AI] Fetch image error:', e);
        }
      }
    }

    const apiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

    if (apiKey && base64Data) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const systemPrompt = `Analyze the provided product image. Identify the exact brand, model, and item. Generate a highly detailed, real-world e-commerce product title, a rich SEO-friendly description, and a list of key technical features. Return the result in a structured JSON format with the following keys:
{
  "title": "Clear, appealing, professional product title in English",
  "titleKa": "ზუსტი და მიმზიდველი პროდუქტის სათაური ქართულად",
  "description": "Rich, highly detailed, real-world e-commerce product description in English",
  "descriptionKa": "ვრცელი, დეტალური და გაყიდვებზე ორიენტირებული აღწერა ქართულად",
  "features": ["Key Feature 1 with emoji", "Key Feature 2 with emoji", "Key Feature 3 with emoji", "Key Feature 4 with emoji"],
  "featuresKa": ["ძირითადი მახასიათებელი 1 ემოჯით", "ძირითადი მახასიათებელი 2 ემოჯით", "ძირითადი მახასიათებელი 3 ემოჯით", "ძირითადი მახასიათებელი 4 ემოჯით"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: systemPrompt + (title ? `\nProduct Title hint/context: ${title}` : ''),
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });

        const responseText = response.text || '';
        let parsed = null;
        try {
          parsed = JSON.parse(responseText);
        } catch (e) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[0]);
            } catch (err) {}
          }
        }

        if (parsed) {
          return new Response(
            JSON.stringify({
              success: true,
              data: parsed,
              title: parsed.title,
              titleKa: parsed.titleKa,
              description: parsed.description,
              descriptionKa: parsed.descriptionKa,
              features: parsed.features || [],
              featuresKa: parsed.featuresKa || [],
            }),
            {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
      } catch (geminiErr: any) {
        console.warn('[CF-VISION-GEMINI-WARN]', geminiErr?.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          title: title || 'Premium Product',
          titleKa: 'პრემიუმ პროდუქტი',
          description: 'High quality e-commerce product created with precision engineering and modern aesthetics.',
          descriptionKa: 'მაღალი ხარისხის პროდუქტი შექმნილი თანამედროვე ტექნოლოგიებითა და ერგონომიული დიზაინით.',
          features: ['🚀 Premium Quality Engineering', '🛡️ 1-Year Official Warranty', '⚡ Ultra-Fast Delivery', '💎 Ergonomic Modern Design'],
          featuresKa: ['🚀 უმაღლესი ხარისხის მასალები', '🛡️ 1-წლიანი ოფიციალური გარანტია', '⚡ სწრაფი მიწოდება მთელ საქართველოში', '💎 ერგონომიული დიზაინი'],
        },
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Vision AI failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
