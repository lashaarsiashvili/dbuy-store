import { onRequestPost as publishMultiPhotoPost } from './publish';

export async function onRequestPost(context: any) {
  return publishMultiPhotoPost(context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
