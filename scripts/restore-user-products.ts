import fs from 'fs';
import path from 'path';

const productIds = [
  "prod-1788877210563",
  "prod-1788877024412",
  "prod-1788876872896",
  "prod-1788787675363",
  "prod-1788785750636",
  "prod-1788777272471",
  "prod-1788777425106",
  "prod-1788775639253",
  "prod-1788724519740",
  "prod-1788724361112",
  "prod-1788723441741",
  "prod-1788723082932",
  "prod-1788722861679",
  "prod-1788722697137",
  "prod-1788722508271"
];

const titles = [
  "Smart Water Bottle: 32 oz Hydration Tracker with APP",
  "Vita Smart Water Bottle",
  "G309 LIGHTSPEED - Genshin Impact Edition",
  "PRO X2 SUPERSTRIKE",
  "PRO X SUPERLIGHT 2",
  "Ancient Nutrition Multi Collagen Protein 16oz / 454.5g",
  "Nutricost Marine Collagen Powder Wild Caught Fish(Unflavored)(8 oz)(28 Servings)",
  "Smart Water Bottle with Reminder",
  "Aquaminder Drink Reminder Smart Water Bottle 600ml",
  "SportFlex Whoop Band - Dash",
  "Smart Drinkware Bottle with Sporty Sipper Lid",
  "CamelBak Podium Steel Insulated Stainless Steel Bike Water Bottle",
  "The Hume Band 2.0",
  "Car Black Box Front and Interior Double Lens Dash Cam 4K",
  "Rode PodMic USB Black Microphone with SC27 Cable & Boom Arm"
];

const categories = ["fitness", "tech", "tech", "tech", "tech", "tech", "tech", "tech", "fitness", "tech", "tech", "fitness", "tech", "tech", "tech"];
const prices = [69, 69, 119, 220, 199, 79, 59, 65, 50, 79, 39, 55, 299, 79, 279];
const origPrices = [99, 99, 149, 260, 249, 99, 79, 99, 79, 99, 69, 89, 359, 99, 299];

const distinctImages = [
  "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1570554886111-e80fcca6a029?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1510017803434-a899398421b3?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80"
];

const products = productIds.map((id, index) => {
  const img = distinctImages[index];
  return {
    id,
    title: titles[index],
    titleKa: titles[index],
    category: categories[index],
    price: prices[index],
    origPrice: origPrices[index],
    stock: 25,
    badge: index < 4 ? "Best Seller" : "Trending",
    image: img,
    images: [img],
    description: `High-quality ${titles[index]} designed for premium performance, durability, and daily use.`,
    descriptionKa: `მაღალი ხარისხის ${titles[index]}, შექმნილი საუკეთესო პროდუქტიულობისთვის და ყოველდღიური გამოყენებისთვის.`,
    rating: 5.0,
    reviewsCount: 1,
    isDeal: true
  };
});

const dbData = {
  products,
  billboards: [],
  theme: { primaryColor: "#2563eb", storeName: "DBUY Store", currency: "$" },
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync("data/store_database.json", JSON.stringify(dbData, null, 2));
fs.writeFileSync("src/data/storeBackup.json", JSON.stringify(dbData, null, 2));

const tsContent = "import { Product } from \"../types\";\n\nexport const initialProducts: Product[] = " + JSON.stringify(products, null, 2) + ";\n";
fs.writeFileSync("src/data/initialProducts.ts", tsContent);

console.log("Successfully updated 15 products with unique distinct images!", products.length);
