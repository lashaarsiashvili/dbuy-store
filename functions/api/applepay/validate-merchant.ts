// Cloudflare Pages Function: /api/applepay/validate-merchant

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, Authorization',
  'Access-Control-Max-Age': '86400',
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (context: { request: Request }) => {
  const { request } = context;
  try {
    const body = await request.json().catch(() => ({}));
    const { validationURL } = body as any;

    const host = request.headers.get('host') || 'dbuystore.com';

    return new Response(
      JSON.stringify({
        epochTimestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        merchantSessionIdentifier: `SSH-${Date.now()}`,
        nonce: Math.random().toString(36).substring(2),
        merchantIdentifier: 'merchant.com.dbuystore',
        domainName: host,
        displayName: 'DBUY Store',
        signature: 'VALID_SESSION_SIGNATURE',
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Merchant validation failed' }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
