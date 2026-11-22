const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/video-ad/generate-video -> Free-Tier Motion-Video Pipeline Descriptor (No paid video models)
export async function onRequestPost() {
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'free-motion-canvas',
      status: 'completed',
      message:
        'Using 100% free-tier client-side Canvas & WebCodecs motion-video renderer (no paid video API required).',
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      success: true,
      mode: 'free-motion-canvas',
      status: 'completed',
      message:
        'Using 100% free-tier client-side Canvas & WebCodecs motion-video renderer.',
    }),
    { status: 200, headers: CORS_HEADERS }
  );
}
