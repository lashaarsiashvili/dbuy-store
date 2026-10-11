/**
 * Centralized Image Resolution Helper & Explicit Product File Mapper
 * Resolves assets from GitHub repository lashaarsiashvili/dbuy-store/main/data/uploads/
 */

import { initialProducts } from '../data/initialProducts';
import { Product } from '../types';

const REPO_BASE = 'https://raw.githubusercontent.com/lashaarsiashvili/dbuy-store/main/data/uploads/';

// Explicit mapping for catalog products to actual uploaded files
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  'PRO X2 SUPERSTRIKE Wireless Gaming Headset': 'prod-prod-1788787675363-0-1788788713941-z2li5.jpg',
  'Ember Temperature Control Smart Mug 2, 14 Oz - White': 'prod-1788595035163-4dfq6x.png',
  'Swanson Triple Magnesium Complex Powder 400 mg 8 oz': 'prod-1788708520960-qldcrv.png',
  'Swanson High Concentrate Omega-3 Fish Oil - 680 mg (120 Softgels)': 'prod-1788708754230-4dk0vn.png',
  'Swanson Highest Potency Vitamin D3 Softgels, 250 mcg (250 Sgels)': 'prod-prod-1788777272471-0-1788783602771-bvf0k.jpg',
  'Avene Hyaluron Activ B3 Concentrated Plumping Serum 30ml': 'prod-prod-1788777425106-0-1788783603009-v0hay.jpg',
  'Ember Temperature Control Smart Mug 2, 14 Oz - Matte Black': 'prod-1788595035163-4dfq6x.png',
  'Owala 32oz FreeSip Stainless Steel Water Bottle – Pink Ribbon Toile-2026 Gift': 'prod-prod-1788877210563-0-1788877213900-80n0m.jpg',
  'Owala FreeSip 32 oz Weekender Color Drop Insulated Stainless Steel Water Bottle': 'prod-prod-1788877210563-1-1788877214207-cljm1.jpg',
  'Aquaminder Drink Reminder Smart Water Bottle 600ml': 'prod-prod-1788724519740-0-1788783604196-f2ye4.jpg',
  'SportFlex Whoop Band - Dash Edition': 'prod-prod-1788724361112-0-1788783604832-64q55.jpg',
  'Smart Drinkware Bottle with Sporty Sipper Lid': 'prod-prod-1788723441741-0-1788783605340-uanc4.jpg',
  'CamelBak Podium Steel Insulated Stainless Steel Bike Water Bottle': 'prod-prod-1788723082932-0-1788783606115-hf96t.jpg',
  'The Hume Band 2.0 Precision Biometric Tracker': 'prod-prod-1788724361112-0-1788783604832-64q55.jpg',
  'Car Black Box Front and Interior Double Lens Dash Cam 4K': 'prod-prod-1788722697137-0-1788783607687-fwr3e.jpg',
  'Smart Water Bottle: 32 oz Hydration Tracker with APP': 'prod-prod-1788877210563-0-1788877213900-80n0m.jpg',
  'Vita Smart Water Bottle 24 oz': 'prod-prod-1788877024412-0-1788877027840-tusaz.jpg',
  'G309 LIGHTSPEED Wireless Gaming Mouse - Genshin Impact Edition': 'prod-prod-1788876872896-0-1788876875852-usiiy.jpg',
  'PRO X SUPERLIGHT 2 Ultra-Lightweight Wireless Gaming Mouse': 'prod-prod-1788785750636-0-1788785751962-zjv0m.jpg',
  'Ancient Nutrition Multi Collagen Protein Powder 16oz': 'prod-prod-1788777272471-0-1788783602771-bvf0k.jpg',
  'Nutricost Marine Collagen Powder Wild Caught Fish 8 oz': 'prod-prod-1788777425106-0-1788783603009-v0hay.jpg',
  'Smart Water Bottle with LED Reminder & Temp Sensor': 'prod-prod-1788775639253-0-1788783603595-8i6m1.jpg',
  'Rode PodMic USB Black Broadcast Microphone with SC27 Cable & Boom Arm': 'prod-prod-1788722508271-0-1788783608231-rbxub.jpg',
  'Owala 32oz FreeSip Stainless Steel Water Bottle – Sugar Plum Fairy-2026 Gift': 'prod-prod-1788877210563-2-1788877214520-ccflo.jpg',
};

export function getProductImage(product: { name?: string; title?: string; image?: string } | string | null | undefined): string {
  if (!product) return '';
  
  if (typeof product === 'string') {
    if (!product.trim()) return '';
    if (product.startsWith('http://') || product.startsWith('https://') || product.startsWith('data:')) {
      return product;
    }
    const cleanName = product.trim().replace(/^(\/)?(data\/)?(public\/)?(uploads\/)?/, '');
    if (!cleanName) return '';
    return `${REPO_BASE}${cleanName}`;
  }

  const rawImg = product.image;
  if (!rawImg || typeof rawImg !== 'string' || !rawImg.trim()) {
    if (product.title && PRODUCT_IMAGE_MAP[product.title]) {
      return `${REPO_BASE}${PRODUCT_IMAGE_MAP[product.title]}`;
    }
    if (product.name && PRODUCT_IMAGE_MAP[product.name]) {
      return `${REPO_BASE}${PRODUCT_IMAGE_MAP[product.name]}`;
    }
    return '';
  }

  if (rawImg.startsWith('http://') || rawImg.startsWith('https://') || rawImg.startsWith('data:')) {
    return rawImg;
  }

  if (rawImg.startsWith('/uploads/') || rawImg.startsWith('/')) {
    return rawImg;
  }

  const cleanImg = rawImg.trim().replace(/^(\/)?(data\/)?(public\/)?(uploads\/)?/, '');
  if (!cleanImg) return '';
  return `${REPO_BASE}${cleanImg}`;
}

export function getImageCandidates(rawPath: string | null | undefined): string[] {
  if (!rawPath) return [];
  const resolved = getProductImage(rawPath);
  return [resolved];
}

export function resolveProductImage(rawPath: string | null | undefined): string {
  return getProductImage(rawPath);
}

export const getImageUrl = resolveProductImage;
export const getProductImageUrl = resolveProductImage;
export const resolveAssetUrl = resolveProductImage;
export const resolveGitHubImageUrl = resolveProductImage;
export const resolveGithubAssetUrl = resolveProductImage;

export const resolveProductImageUrl = (productOrUrl: Product | string | null | undefined): string => {
  return getProductImage(productOrUrl as any);
};

export default resolveProductImageUrl;
