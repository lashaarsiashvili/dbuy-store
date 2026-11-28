import type { Product } from '../types';
import { normalizeProductArrays } from '../utils/productParsing';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
  : '';
const API_URL = `${API_BASE}/api/products`;

export const ProductsManager = {
  // Fetch all products without pagination or artificial item limits (or pass limit/offset for pagination)
  async getProducts(limit?: number, offset?: number): Promise<{ products: Product[]; total: number }> {
    // 1. Primary: fetch product catalog with optional limit & offset from /api/products
    try {
      const queryParams = new URLSearchParams();
      if (typeof limit === 'number' && limit > 0) queryParams.set('limit', String(limit));
      if (typeof offset === 'number' && offset > 0) queryParams.set('offset', String(offset));
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      const response = await fetch(`${API_URL}${queryString}`, { 
        credentials: 'omit',
        cache: 'default'
      });
      if (response.ok) {
        const data: any = await response.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.results || []);
        const total = typeof data?.total === 'number' ? data.total : (Array.isArray(list) ? list.length : 0);
        if (Array.isArray(list)) {
          const viewsMap: Record<string, number> = data?.product_views || {};
          const normalized = list.map(p => {
            const parsed = normalizeProductArrays(p);
            const fromMap = viewsMap[String(parsed.id)] ?? (parsed.customSlug ? viewsMap[String(parsed.customSlug)] : undefined);
            if (typeof fromMap === 'number' && fromMap > (parsed.views || 0)) {
              parsed.views = fromMap;
            }
            return parsed;
          });
          return {
            products: normalized,
            total
          };
        }
      }
    } catch (error) {
      console.warn('Initial /api/products fetch warning:', error);
    }

    // 2. Fallback: query /api/store/products
    try {
      const storeRes = await fetch(`${API_BASE}/api/store/products`, {
        credentials: 'omit',
        cache: 'default'
      });
      if (storeRes.ok) {
        const storeData: any = await storeRes.json();
        const list = Array.isArray(storeData) ? storeData : (storeData?.products || storeData?.results || []);
        if (Array.isArray(list)) {
          const normalized = list.map(normalizeProductArrays);
          const sliced = (limit !== undefined && limit !== null) ? normalized.slice(offset || 0, (offset || 0) + limit) : normalized;
          return { products: sliced, total: normalized.length };
        }
      }
    } catch (err) {
      console.warn('Store endpoint products fetch warning:', err);
    }

    // 3. Fallback: query /api/store/sync
    try {
      const syncRes = await fetch(`${API_BASE}/api/store/sync`, {
        credentials: 'omit',
        cache: 'default'
      });
      if (syncRes.ok) {
        const syncData: any = await syncRes.json();
        const list = syncData?.data?.products || syncData?.products || [];
        if (Array.isArray(list)) {
          const normalized = list.map(normalizeProductArrays);
          const sliced = (limit !== undefined && limit !== null) ? normalized.slice(offset || 0, (offset || 0) + limit) : normalized;
          return { products: sliced, total: normalized.length };
        }
      }
    } catch (err) {
      console.warn('Sync endpoint products fetch warning:', err);
    }

    return { products: [], total: 0 };
  },

  // ახალი პროდუქტის დამატება D1 ბაზაში
  async addProduct(newProduct: Partial<Product>): Promise<any> {
    try {
      const productToSave = {
        ...newProduct,
        id: newProduct.id || 'prod_' + Date.now(),
        createdAt: newProduct.createdAt || new Date().toISOString()
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productToSave) 
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to add product to D1: ${errorText || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('დამატების შეცდომა:', error);
      throw error;
    }
  },

  // პროდუქტის რედაქტირება
  async updateProduct(id: string, updatedFields: Partial<Product>): Promise<any> {
    try {
      const payload = {
        ...updatedFields,
        id,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to update product: ${errorText || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('განახლების შეცდომა:', error);
      throw error;
    }
  },

  // პროდუქტის წაშლა
  async deleteProduct(id: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Failed to delete product: ${errorText || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('წაშლის შეცდომა:', error);
      throw error;
    }
  }
};
