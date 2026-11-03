import { EventContext } from '@cloudflare/workers-types';

export async function onRequest(context: EventContext<any, any, any>): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    const body = await response.blob();
    
    return new Response(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
      },
    });
  } catch (error) {
    return new Response('Error proxying image', { status: 500 });
  }
}
