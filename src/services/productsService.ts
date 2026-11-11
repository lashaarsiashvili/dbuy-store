import type { Product } from '../types';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
  : '';
const API_URL = `${API_BASE}/api/products`;

export const ProductsManager = {
  // Fetch all products without pagination or artificial item limits
  async getProducts(): Promise<Product[]> {
    // 1. Primary: fetch complete product catalog from /api/products
    try {
      const response = await fetch(`${API_URL}?_t=${Date.now()}`, { 
        credentials: 'omit',
        cache: 'no-store'
      });
      if (response.ok) {
        const data: any = await response.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.results || []);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (error) {
      console.warn('Initial /api/products fetch warning:', error);
    }

    // 2. Fallback: query /api/store/products
    try {
      const storeRes = await fetch(`${API_BASE}/api/store/products?_t=${Date.now()}`, {
        credentials: 'omit',
        cache: 'no-store'
      });
      if (storeRes.ok) {
        const storeData: any = await storeRes.json();
        const list = Array.isArray(storeData) ? storeData : (storeData?.products || storeData?.results || []);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (err) {
      console.warn('Store endpoint products fetch warning:', err);
    }

    // 3. Fallback: query /api/store/sync
    try {
      const syncRes = await fetch(`${API_BASE}/api/store/sync?_t=${Date.now()}`, {
        credentials: 'omit',
        cache: 'no-store'
      });
      if (syncRes.ok) {
        const syncData: any = await syncRes.json();
        const list = syncData?.data?.products || syncData?.products || [];
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch (err) {
      console.warn('Sync endpoint products fetch warning:', err);
    }

    return [];
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
