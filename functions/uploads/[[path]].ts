interface Env {
  [key: string]: any;
}

type PagesFunction<Env = any> = (context: {
  request: Request;
  env: Env;
  params: { path?: string[] };
}) => Promise<Response> | Response;

const NEUTRAL_SVG_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none"><rect width="600" height="600" fill="#f8fafc"/><rect x="16" y="16" width="568" height="568" rx="24" stroke="#e2e8f0" stroke-width="4" stroke-dasharray="12 12"/><path d="M190 380l70-70 90 90 60-60 100 100H90l100-60z" fill="#cbd5e1"/><circle cx="210" cy="220" r="36" fill="#94a3b8"/></svg>`;

export const onRequest: PagesFunction<Env> = async () => {
  // Neutral SVG fallback for missing uploads
  return new Response(NEUTRAL_SVG_PLACEHOLDER, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
