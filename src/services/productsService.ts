// src/services/productsService.ts
import { Product } from '../types';

// მიუთითეთ თქვენი Cloudflare Worker-ის რეალური URL (თუ განსხვავდება ძირითადი დომენისგან)
// By default, uses relative /api/products when hosted on the same origin / Cloudflare Pages,
// or fallback to custom worker URL if defined in environment
const DEFAULT_WORKER_URL = "https://your-worker-subdomain.workers.dev/api/products";
const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CLOUDFLARE_WORKER_URL)
  ? (import.meta as any).env.VITE_CLOUDFLARE_WORKER_URL
  : (typeof window !== 'undefined' && window.location.origin ? '/api/products' : DEFAULT_WORKER_URL);

export const ProductsManager = {
  // პროდუქტების წამოღება საიტიზე გამოსატანად
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(API_URL, { credentials: "omit" });
      if (!response.ok) throw new Error("Failed to fetch products from Cloudflare");
      
      const products: any = await response.json();
      return Array.isArray(products) ? products : (products && Array.isArray(products.products) ? products.products : []);
    } catch (error) {
      console.error("Cloudflare KV-დან პროდუქტების ჩატვირთვის შეცდომა:", error);
      // შეცდომის დროსაც კი არ ვაბრუნებთ დეფოლტ მონაცემებს
      return [];
    }
  },

  // ადმინიდან ახალი პროდუქტის დამატება
  async addProduct(newProduct: Partial<Product>): Promise<any> {
    const currentProducts = await this.getProducts();
    const updated = [
      ...currentProducts,
      {
        ...newProduct,
        id: newProduct.id || "prod_" + Date.now(),
        createdAt: new Date().toISOString()
      } as Product
    ];
    return await this.syncWithCloudflare(updated);
  },

  // ადმინიდან პროდუქტის რედაქტირება
  async updateProduct(id: string, updatedFields: Partial<Product>): Promise<any> {
    const currentProducts = await this.getProducts();
    const updated = currentProducts.map(item => 
      item.id === id ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() } : item
    );
    return await this.syncWithCloudflare(updated);
  },

  // ადმინიდან პროდუქტის წაშლა
  async deleteProduct(id: string): Promise<any> {
    const currentProducts = await this.getProducts();
    const updated = currentProducts.filter(item => item.id !== id);
    return await this.syncWithCloudflare(updated);
  },

  // სრული სინქრონიზაცია Cloudflare KV-თან
  async syncWithCloudflare(productsList: Product[]): Promise<any> {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productsList)
      });
      if (!response.ok) throw new Error("Failed to save to Cloudflare KV");
      return await response.json();
    } catch (error) {
      console.error("Cloudflare-ში შენახვის შეცდომა:", error);
      throw error;
    }
  }
};
