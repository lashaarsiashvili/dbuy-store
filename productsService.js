// productsService.js

// მიუთითეთ თქვენი Cloudflare Worker-ის რეალური URL
const API_URL = "https://your-worker-subdomain.workers.dev/api/products";

export const ProductsManager = {
  // პროდუქტების წამოღება საიტიზე გამოსატანად
  async getProducts() {
    try {
      const response = await fetch(API_URL, { credentials: "omit" });
      if (!response.ok) throw new Error("Failed to fetch products from Cloudflare");
      
      const products = await response.json();
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error("Cloudflare KV-დან პროდუქტების ჩატვირთვის შეცდომა:", error);
      // შეცდომის დროსაც კი არ ვაბრუნებთ დეფოლტ მონაცემებს
      return [];
    }
  },

  // ადმინიდან ახალი პროდუქტის დამატება
  async addProduct(newProduct) {
    const currentProducts = await this.getProducts();
    const updated = [
      ...currentProducts,
      {
        ...newProduct,
        id: newProduct.id || "prod_" + Date.now(),
        createdAt: new Date().toISOString()
      }
    ];
    return await this.syncWithCloudflare(updated);
  },

  // ადმინიდან პროდუქტის რედაქტირება
  async updateProduct(id, updatedFields) {
    const currentProducts = await this.getProducts();
    const updated = currentProducts.map(item => 
      item.id === id ? { ...item, ...updatedFields, updatedAt: new Date().toISOString() } : item
    );
    return await this.syncWithCloudflare(updated);
  },

  // ადმინიდან პროდუქტის წაშლა
  async deleteProduct(id) {
    const currentProducts = await this.getProducts();
    const updated = currentProducts.filter(item => item.id !== id);
    return await this.syncWithCloudflare(updated);
  },

  // სრული სინქრონიზაცია Cloudflare KV-თან
  async syncWithCloudflare(productsList) {
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
