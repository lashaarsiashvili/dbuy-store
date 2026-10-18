export const ProductsManager = {
  // პროდუქტების წამოღება
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(API_URL, { credentials: "omit" });
      if (!response.ok) throw new Error("Failed to fetch products");
      
      const products: any = await response.json();
      return Array.isArray(products) ? products : (products?.products || []);
    } catch (error) {
      console.error("D1-დან პროდუქტების ჩატვირთვის შეცდომა:", error);
      return [];
    }
  },

  // ახალი პროდუქტის დამატება D1 ბაზაში
  async addProduct(newProduct: Partial<Product>): Promise<any> {
    try {
      const productToSave = {
        ...newProduct,
        id: newProduct.id || "prod_" + Date.now(),
        createdAt: new Date().toISOString()
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ვაგზავნით მხოლოდ 1 ობიექტს და არა მთლიან სიას
        body: JSON.stringify(productToSave) 
      });

      if (!response.ok) throw new Error("Failed to add product to D1");
      return await response.json();
    } catch (error) {
      console.error("დამატების შეცდომა:", error);
      throw error;
    }
  },

  // პროდუქტის რედაქტირება
  async updateProduct(id: string, updatedFields: Partial<Product>): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT", // ან PATCH, გააჩნია თქვენი API როგორ არის აწყობილი
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedFields, updatedAt: new Date().toISOString() })
      });

      if (!response.ok) throw new Error("Failed to update product");
      return await response.json();
    } catch (error) {
      console.error("განახლების შეცდომა:", error);
      throw error;
    }
  },

  // პროდუქტის წაშლა
  async deleteProduct(id: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete product");
      return await response.json();
    } catch (error) {
      console.error("წაშლის შეცდომა:", error);
      throw error;
    }
  }
};
