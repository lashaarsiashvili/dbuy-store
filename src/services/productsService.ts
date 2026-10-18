import type { Product } from '../types';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).replace(/\/+$/, '')
  : '';
const API_URL = `${API_BASE}/api/products`;

export const ProductsManager = {
  // პროდუქტების წამოღება
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${API_URL}?_t=${Date.now()}`, { 
        credentials: 'omit',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const products: any = await response.json();
      return Array.isArray(products) ? products : (products?.products || products?.results || []);
    } catch (error) {
      console.error('D1-დან პროდუქტების ჩატვირთვის შეცდომა:', error);
      return [];
    }
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
