import { Product } from '../types';

export const initialProducts: Product[] = [
  {
    "title": "Smart LED Temp Hydration Bottle",
    "badge": "Best Seller",
    "images": [
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1570554886111-e80fcca6a029?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=1000&q=80"
    ],
    "titleKa": "სმარტ თერმოსი LED ტემპერატურის ინდიკატორით",
    "isDeal": true,
    "rating": 4.9,
    "descriptionKa": "ორმაგი უჟანგავი ფოლადის იზოლირებული თერმო-ბოთლი სენსორული LED ეკრანით და 24-საათიანი ტემპერატურის შენარჩუნებით.",
    "features": [
      "Real-time LCD touch temperature cap",
      "24hr cold / 12hr hot insulation",
      "BPA-Free 304 food-grade steel",
      "Leakproof silicone seal ring"
    ],
    "description": "Double-walled insulated stainless steel bottle with smart touch LED temperature display and 24-hour heat/cold retention.",
    "id": "prod-1",
    "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1000&q=80",
    "stock": 28,
    "reviewsCount": 142,
    "price": 34.99,
    "origPrice": 49.99,
    "category": "fitness"
  },
  {
    "descriptionKa": "Hot-swap მექანიკური კლავიატურა RGB განათებით, Bluetooth 5.2, 2.4G უსადენო და Type-C კავშირით.",
    "price": 89.99,
    "origPrice": 119.99,
    "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80",
    "stock": 14,
    "features": [
      "Gateron Pre-lubed switches",
      "RGB per-key illumination",
      "4000mAh long battery life",
      "Mac and Windows compatible"
    ],
    "titleKa": "მექანიკური 75% უსადენო კლავიატურა RGB",
    "description": "Hot-swappable tactile RGB mechanical keyboard with multi-device Bluetooth 5.2, 2.4G wireless, and Type-C connectivity.",
    "rating": 4.8,
    "isDeal": true,
    "reviewsCount": 96,
    "id": "prod-2",
    "badge": "Trending",
    "images": [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1000&q=80"
    ],
    "category": "tech",
    "title": "Mechanical 75% Wireless Keyboard"
  },
  {
    "features": [
      "1.47\" Vivid AMOLED Display",
      "120+ Sport Workout Modes",
      "5ATM Water Resistant up to 50m",
      "Fast Magnetic USB Charging"
    ],
    "image": "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=1000&q=80",
    "stock": 35,
    "description": "All-day SpO2, heart rate, sleep quality, and stress monitoring with 5ATM water resistance and 14-day battery life.",
    "descriptionKa": "გულისცემის, ჟანგბადის და ძილის უწყვეტი მონიტორინგი 5ATM წყალგამძლეობით და 14-დღიანი ელემენტით.",
    "id": "prod-3",
    "origPrice": 59.99,
    "price": 45,
    "reviewsCount": 88,
    "title": "AMOLED Smart Fitness & Pulse Band",
    "category": "fitness",
    "images": [
      "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1510017803434-a899398421b3?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1000&q=80"
    ],
    "badge": "Hot Deal",
    "isDeal": true,
    "rating": 4.7,
    "titleKa": "სმარტ ფიტნეს სამაჯური AMOLED ეკრანით"
  },
  {
    "title": "Studio Broadcast USB Condenser Mic",
    "badge": "New",
    "origPrice": 79.99,
    "images": [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1520523839898-507127053c39?auto=format&fit=crop&w=1000&q=80"
    ],
    "titleKa": "სტუდიური USB კონდენსატორული მიკროფონი",
    "isDeal": false,
    "rating": 4.9,
    "id": "prod-4",
    "descriptionKa": "პროფესიონალური სტუდიური USB მიკროფონი კარდიოიდული ჩაწერით, ყურსასმენის მონიტორინგით და ხმაურის ფილტრით.",
    "category": "tech",
    "stock": 19,
    "image": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80",
    "price": 64.99,
    "description": "Studio-grade cardioid polar pattern USB condenser microphone with zero-latency monitoring jack, gain dial, and pop filter.",
    "features": [
      "192kHz/24-Bit Studio Bitrate",
      "One-touch Mute with LED indicator",
      "Built-in Anti-vibration Shock Mount",
      "Plug & Play on PC, Mac, and PS5"
    ],
    "reviewsCount": 64
  },
  {
    "id": "prod-5",
    "titleKa": "ტაქტიკური კომპაქტური EDC ფანარი 2000LM",
    "rating": 4.8,
    "reviewsCount": 110,
    "title": "Compact Ultra-Bright EDC Flashlight",
    "category": "everyday",
    "descriptionKa": "ავიაციური ალუმინის კორპუსი, 2000 ლუმენი, USB-C დამუხტვა, მაგნიტური ძირი და წყალგამძლეობა.",
    "badge": "Sale",
    "images": [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1000&q=80"
    ],
    "isDeal": true,
    "origPrice": 39.99,
    "description": "Aircraft-grade anodized aluminum tactical torch with 2000 Lumens peak output, USB-C rechargeability, and magnetic base.",
    "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
    "stock": 42,
    "features": [
      "2000 Lumens Turbo Beam",
      "Magnetic Tailcap for hands-free work",
      "IPX8 Waterproof Submersible",
      "USB-C fast direct charging"
    ],
    "price": 29.99
  },
  {
    "descriptionKa": "დახვეწილი საოფისე ორგაიზერი პლანშეტის დამცავი განყოფილებით, კაბელებისა და ბარათების ჯიბეებით.",
    "category": "accessories",
    "title": "Handcrafted Vegan Leather Tech Folio",
    "badge": "Trending",
    "reviewsCount": 53,
    "description": "Sophisticated executive portfolio organizer with padded 11\" tablet sleeve, cable slots, card pockets, and magnetic clasp.",
    "isDeal": false,
    "images": [
      "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80"
    ],
    "price": 49.99,
    "origPrice": 65,
    "features": [
      "Water-resistant vegan PU leather",
      "Fits iPad Pro / Air up to 11 inches",
      "Dual pen and stylus loop",
      "Smooth YKK metal zipper"
    ],
    "id": "prod-6",
    "image": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80",
    "stock": 22,
    "titleKa": "პრემიუმ ტყავის ორგაიზერი პლანშეტისთვის",
    "rating": 4.6
  },
  {
    "features": [
      "40mm Dynamic Bass Drivers",
      "Hybrid ANC with 3 modes",
      "Ultra-soft memory foam earcups",
      "Multipoint Bluetooth connection"
    ],
    "images": [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80"
    ],
    "description": "High-res audio certified over-ear headphones with 40dB active noise cancellation, transparency mode, and 60hr playback.",
    "isDeal": true,
    "stock": 17,
    "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80",
    "reviewsCount": 175,
    "rating": 4.9,
    "titleKa": "უსადენო ANC ყურსასმენები ხმაურის ჩახშობით",
    "price": 79.99,
    "category": "tech",
    "id": "prod-7",
    "badge": "Hot Deal",
    "title": "Hybrid Active Noise Cancelling Headphones",
    "descriptionKa": "პრემიუმ უსადენო ყურსასმენები 40dB აქტიური ხმაურის ჩახშობით და 60-საათიანი სამუშაო რესურსით.",
    "origPrice": 109.99
  },
  {
    "stock": 31,
    "image": "https://images.unsplash.com/photo-1609592424368-24959db23485?auto=format&fit=crop&w=1000&q=80",
    "reviewsCount": 78,
    "category": "accessories",
    "price": 39.99,
    "titleKa": "მაგნიტური MagSafe Power Bank 10,000mAh",
    "description": "Ultra-slim wireless magnetic power bank with 15W MagSafe charging, 20W PD Type-C output, and built-in kickstand.",
    "origPrice": 49.99,
    "title": "Magnetic 10,000mAh Fast Power Bank",
    "id": "prod-8",
    "descriptionKa": "თხელი მაგნიტური პორტატული დამტენი 15W უსადენო დამუხტვით, 20W PD Type-C პორტით და დასადგამით.",
    "images": [
      "https://images.unsplash.com/photo-1609592424368-24959db23485?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1000&q=80"
    ],
    "badge": "New",
    "isDeal": false,
    "features": [
      "Strong N52 Snap Magnet",
      "15W Fast Qi Wireless + 20W PD Wired",
      "Foldable viewing kickstand",
      "Airline travel certified safe"
    ],
    "rating": 4.8
  }
];
