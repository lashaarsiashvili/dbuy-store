import { handleProductsGet, handleProductsPost, handleProductsDelete } from './api/products';

export interface EventContext<Env = any> {
  request: Request;
  env: Env;
  params?: Record<string, string>;
  data?: Record<string, any>;
}

export type PagesFunction<Env = any> = (context: EventContext<Env>) => Promise<Response> | Response;

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET') {
    return handleProductsGet(env, request);
  }

  if (request.method === 'POST') {
    return handleProductsPost(env, request);
  }

  if (request.method === 'DELETE') {
    return handleProductsDelete(env, request);
  }

  return new Response(
    JSON.stringify({ success: false, error: `Method ${request.method} Not Allowed` }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
};

