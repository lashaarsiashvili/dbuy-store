interface Env {
  R2: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const key = params.key as string;
  if (!key) {
    return new Response("Missing image key", { status: 400 });
  }

  const objectKey = `billboards/${key}`;
  const object = await env.R2.get(objectKey);

  if (!object) {
    return new Response("Image not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, {
    headers,
  });
};
