import { Product } from '../types';

export const shareProductToSocial = async (
  product: Product,
  generatedText: string,
  productUrl: string
) => {
  try {
    // 1. Combine Text
    const fullText = `${generatedText}\n\n🛒 Shop Worldwide: ${productUrl}`;

    // 2. Safely Copy Text
    try {
      await navigator.clipboard.writeText(fullText);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    // 3. Sequentially trigger downloads for images
    const imagesArray = product.images && product.images.length > 0 
      ? product.images 
      : product.image ? [product.image] : [];

    for (let i = 0; i < imagesArray.length; i++) {
      const link = document.createElement("a");
      link.href = imagesArray[i];
      link.download = `product-image-${product.id}-${i + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 400ms delay to prevent browser blocking
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // 4. Open Facebook
    window.open("https://www.facebook.com/", "_blank");
  } catch (err) {
    console.error("Social sharing error:", err);
  }
};
