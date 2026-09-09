export {};

// Declare Cloudflare Page/Worker local types for tsc compiler
interface D1Database {
  prepare(query: string): {
    bind(...values: any[]): {
      first<T = any>(colName?: string): Promise<T | null>;
      run(): Promise<any>;
    };
  };
  exec(query: string): Promise<any>;
}

type PagesFunction<Env = any, Params extends string = any> = (context: {
  request: Request;
  env: Env;
  params: Record<Params, string>;
}) => Promise<Response> | Response;

interface Env {
  DB?: D1Database;
  STORE_KV?: any;
  KV?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  const filename = params.filename as string;
  const db = env.DB;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=31536000, immutable',
  };

  if (!db) {
    return new Response('Database binding missing', { status: 404 });
  }

  // Retrieve base64 dataUrl from D1 store_kv table
  try {
    const result = await db.prepare('SELECT value FROM store_kv WHERE key = ?').bind(`img-${filename}`).first();
    const dataUrl = result ? (result as any).value : null;

    if (dataUrl && typeof dataUrl === 'string') {
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches[2]) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Decode base64 to binary byte array
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return new Response(bytes.buffer, {
          headers: {
            'Content-Type': mimeType,
            ...corsHeaders
          }
        });
      }
    }
  } catch (err) {
    console.error('Error decoding base64 image from D1 store_kv:', err);
  }

  // Fallback: If not in D1, return 404 so Cloudflare falls back to static assets (pre-compiled files)
  return new Response('Not Found', { status: 404 });
};
