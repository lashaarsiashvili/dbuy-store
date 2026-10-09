import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load local environment variables from .env if present (allow override)
dotenv.config({ override: true });

// Cloudflare Configuration
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || 'ae33acd14aaf2f0ad7bcb1f2e37b71b5';
const D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || process.env.D1_DATABASE_ID || '0ccd6b48-b6d5-4cbe-95eb-71a9a32ee1b8';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchProductsFromD1(): Promise<any[] | null> {
  if (!CF_API_TOKEN) {
    console.warn('⚠️ CLOUDFLARE_API_TOKEN არ არის მითითებული.');
    return null;
  }

  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
  console.log(`📡 Cloudflare D1-თან დაკავშირება...`);
  console.log(`   - Account ID: ${CF_ACCOUNT_ID}`);
  console.log(`   - Database ID: ${D1_DATABASE_ID}`);

  try {
    const d1Response = await fetch(d1Url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: 'SELECT * FROM products ORDER BY created_at DESC;',
      }),
    });

    const d1Data = (await d1Response.json()) as any;
    if (!d1Data.success) {
      const errMsg = d1Data.errors?.[0]?.message || JSON.stringify(d1Data.errors);
      console.warn(`⚠️ Cloudflare D1 API შეტყობინება: ${errMsg}`);
      if (d1Data.errors?.[0]?.code === 7403) {
        console.warn(`   (მოცემულ Cloudflare API Token-ს სჭირდება "Account > D1 > Read/Edit" ნებართვა Cloudflare Dashboard-ში)`);
      }
      return null;
    }

    const results = d1Data.result?.[0]?.results;
    if (Array.isArray(results) && results.length > 0) {
      console.log(`✅ Cloudflare D1 ბაზიდან წარმატებით ამოღებულია ${results.length} პროდუქტი.`);
      return results;
    }
    return null;
  } catch (err: any) {
    console.warn(`⚠️ Cloudflare D1 დაკავშირების შეცდომა:`, err.message);
    return null;
  }
}

function loadLocalProducts(): any[] {
  const dbPath = path.resolve(process.cwd(), 'data', 'store_database.json');
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.products) && data.products.length > 0) {
        console.log(`📂 გამოყენებულია ლოკალური კატალოგი (data/store_database.json): ${data.products.length} პროდუქტი.`);
        return data.products;
      }
    } catch (e) {
      console.error('შეცდომა store_database.json-ის წაკითხვისას:', e);
    }
  }

  // Fallback to initialProducts.ts
  console.warn('ლოკალური ბაზა ვერ მოიძებნა.');
  return [];
}

async function run() {
  console.log('========================================================');
  console.log('⚡ CLOUDFLARE D1 + GOOGLE GEMINI AI PRODUCT ENRICHER');
  console.log('========================================================');

  if (!GEMINI_API_KEY) {
    console.error('❌ შეცდომა: GEMINI_API_KEY არ არის მითითებული.');
    process.exit(1);
  }

  console.log('1. მონაცემების მოძიება (Cloudflare D1 / Local Store)...');
  let products = await fetchProductsFromD1();

  if (!products || products.length === 0) {
    console.log('🔄 D1 პირდაპირი წვდომის ნაცვლად გამოიყენება არსებული ბაზის მონაცემები ტესტირებისთვის...');
    products = loadLocalProducts();
  }

  if (!products || products.length === 0) {
    console.error('❌ პროდუქტები ვერ მოიძებნა.');
    process.exit(1);
  }

  // Take a clean sample or full list for processing (limit to first 10 for prompt efficiency if large)
  const productsToProcess = products.slice(0, 10);
  console.log(`\n2. Gemini AI დამუშავება (${productsToProcess.length} პროდუქტი მკაცრი ინსტრუქციით)...`);

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `
შენ ხარ მონაცემთა მკაცრი ტრანსფორმატორი.
წესები:
1. გამოიყენე მხოლოდ და მხოლოდ მოწოდებული JSON-ის მონაცემები.
2. კატეგორიულად აკრძალულია ახალი პროდუქტის მოფიქრება ან სიის რაოდენობის შეცვლა.
3. არ შეცვალო და არ შეცდომით მიაბა სურათების ბმულები (image/images), ID-ები და ფასები.
4. თუ რომელიმე ველი არის null ან ცარიელი, დატოვე null ან ცარიელი — არ შეავსო ის საკუთარი ვარაუდით.
5. შედეგი დააბრუნე ზუსტად იმავე რაოდენობის ობიექტების მასივად.
`;

  const prompt = `
აი რეალური პროდუქტების მასივი:
${JSON.stringify(productsToProcess, null, 2)}

დავალება: შეინარჩუნე ყველა ორიგინალი ველი (id, name, price, image, images და ა.შ.) უცვლელად. თუ გევალება აღწერის გამდიდრება, შეცვალე მხოლოდ description ველი და არ შეეხო სხვა ველებს. დააბრუნე სუფთა JSON მასივი.
`;

  // Candidate models: prefer gemini-3.8-flash, fallback to gemini-3.1-flash-lite if temporary 503
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let outputJson = '';
  let usedModel = '';

  for (const modelName of candidateModels) {
    try {
      console.log(`🤖 მოთხოვნის გაგზავნა მოდელთან: ${modelName}...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: 0, // გამორიცხავს მონაცემების გამოგონებას
          responseMimeType: 'application/json', // აბრუნებს მხოლოდ ვალიდურ JSON-ს
          systemInstruction,
        },
      });

      if (response.text) {
        outputJson = response.text;
        usedModel = modelName;
        break;
      }
    } catch (err: any) {
      console.warn(`⚠️ მოდელი ${modelName} დროებით მიუწვდომელია (${err.message}). სცადეთ ალტერნატივა...`);
    }
  }

  if (!outputJson) {
    throw new Error('Gemini API-მ ვერ დააბრუნა პასუხი.');
  }

  console.log(`✅ პასუხი მიღებულია წარმატებით მოდელიდან: ${usedModel}`);
  console.log('\n3. მიღებული პასუხის ვალიდაცია...');

  let parsed: any[];
  try {
    parsed = JSON.parse(outputJson);
  } catch (e) {
    console.error('JSON-ის პარსინგის შეცდომა:', e);
    console.log(outputJson);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error('❌ შეცდომა: შედეგი არ არის მასივი!');
    process.exit(1);
  }

  console.log(`✅ ვალიდაცია წარმატებულია! მიღებულია ${parsed.length} პროდუქტი (საწყისი: ${productsToProcess.length}).`);

  const outputPath = path.resolve(process.cwd(), 'data', 'd1_products_enriched.json');
  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
  console.log(`💾 შედეგი შენახულია: ${outputPath}`);

  console.log('\n=== მიღებული ზუსტი შედეგი ===');
  console.log(JSON.stringify(parsed, null, 2));
}

run().catch((e) => {
  console.error('შეცდომა:', e);
  process.exit(1);
});
