/**
 * AI Product Advertising Copy & Marketing Description Generator
 * Generates high-converting, sales-optimized e-commerce copy in English and Georgian.
 */

export interface GeneratedAdCopy {
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  featuresEn: string[];
  featuresKa: string[];
  customSlug: string;
  badge?: string;
}

export interface GenerateAdCopyParams {
  title: string;
  titleKa?: string;
  category?: string;
  price?: number;
  images?: string[];
  imageTitles?: string[];
  tone?: 'high-converting' | 'tech' | 'luxury';
  language?: 'en' | 'ka' | 'both';
}

/**
 * Extracts a readable product title from an image filename or URL.
 * e.g. "Wireless_Bluetooth_Headphones_ANC_black.jpg" -> "Wireless Bluetooth Headphones ANC Black"
 */
export function cleanImageTitle(rawName: string): string {
  if (!rawName) return '';
  // Remove file extension
  let clean = rawName.replace(/\.[a-zA-Z0-9]{2,5}(\?.*)?$/i, '');
  // Remove data: prefixes or url paths if present
  clean = clean.split('/').pop() || clean;
  // Replace underscores, hyphens, plus signs with spaces
  clean = clean.replace(/[-_+]/g, ' ');
  // Remove redundant noise words like "image", "img", "photo", "pic", dimensions like 1200x800
  clean = clean.replace(/\b\d{3,4}x\d{3,4}\b/gi, '');
  clean = clean.replace(/\b(img|image|photo|pic|picture|dsc|screenshot|product|item)\b/gi, '');
  // Clean multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  // Capitalize words
  if (!clean) return '';
  return clean
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean slug generator for SEO
 */
export function cleanSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Smart offline / client-side copywriter fallback
 * Generates compelling e-commerce advertising copy when offline or if API key is not configured.
 */
export function generateSmartOfflineAdCopy(params: GenerateAdCopyParams): GeneratedAdCopy {
  const primaryImageTitle = params.imageTitles && params.imageTitles.length > 0
    ? params.imageTitles.filter(Boolean)[0]
    : '';

  const rawTitle = (params.title || params.titleKa || primaryImageTitle || 'Smart Living Essential').trim();
  const lower = (rawTitle + ' ' + (params.imageTitles?.join(' ') || '')).toLowerCase();
  const category = params.category || 'tech';
  const price = params.price || 29.99;

  let titleEn = params.title?.trim() || primaryImageTitle || '';
  let titleKa = params.titleKa?.trim() || '';
  let descriptionEn = '';
  let descriptionKa = '';
  let featuresEn: string[] = [];
  let featuresKa: string[] = [];
  let badge = 'Hot Deal';

  // Domain detection
  const isDashCam = lower.includes('dash') || lower.includes('cam') || lower.includes('black box') || lower.includes('lens') || lower.includes('recorder') || lower.includes('gps');
  const isPhoneHolder = lower.includes('holder') || lower.includes('mount') || lower.includes('magsafe') || lower.includes('car phone') || lower.includes('stand');
  const isKeyboard = lower.includes('keyboard') || lower.includes('keychron') || lower.includes('mechanical');
  const isMouse = lower.includes('mouse') || lower.includes('trackball') || lower.includes('ergonomic mouse');
  const isBottle = lower.includes('bottle') || lower.includes('flask') || lower.includes('hydration') || lower.includes('cup');
  const isCharger = lower.includes('charge') || lower.includes('power bank') || lower.includes('wireless pad') || lower.includes('usb');
  const isWatch = lower.includes('watch') || lower.includes('fitness') || lower.includes('tracker') || lower.includes('band');
  const isAudio = lower.includes('headphone') || lower.includes('earbuds') || lower.includes('speaker') || lower.includes('audio') || lower.includes('sound');

  if (isDashCam) {
    if (!titleEn) titleEn = 'Ultra HD Dual-Lens Car Dash Cam with GPS & Night Vision';
    if (!titleKa) titleKa = 'ავტომობილის Full HD ორმაგი ვიდეო-რეგისტრატორი GPS-ით და ღამის ხედვით';
    badge = 'Best Seller';

    descriptionEn = `Capture every critical detail on the road with crystal-clear precision. Engineered with dual front and interior lenses, ultra-wide 170° angle viewing, and advanced infrared night vision, this high-performance dash camera safeguards your vehicle 24/7. Built-in WiFi and GPS allow instant smartphone playback and route tracking. Drive with unmatched security and peace of mind on every trip.`;

    descriptionKa = `დააფიქსირეთ გზის ყოველი დეტალი უმაღლესი სიცხადით. წინა და სალონის ორმაგი ლინზით, 170° ულტრა-ფართო ხედვითა და ინფრაწითელი ღამის ხედვის სისტემით აღჭურვილი ჭკვიანი ვიდეო-რეგისტრატორი თქვენი ავტომობილის 24/7 უსაფრთხოებას იცავს. ჩაშენებული WiFi და GPS გაძლევთ კადრების ტელეფონიდან მყისიერი ნახვისა და გადმოწერის შესაძლებლობას.`;

    featuresEn = [
      '🎥 Dual HD Lens System — Simultaneous front road & interior cabin coverage',
      '🌙 Infrared Night Vision — Crisp, sharp recordings even in pitch-black darkness',
      '🛰️ Built-In GPS & High-Speed WiFi — Real-time tracking and instant phone video downloads',
      '🛡️ 24/7 G-Sensor Parking Guard — Automatically locks & saves emergency impact clips',
    ];

    featuresKa = [
      '🎥 ორმაგი HD ლინზა — წინა გზისა და სალონის ერთდროული სრული ჩაწერა',
      '🌙 ინფრაწითელი ღამის ხედვა — იდეალური სიცხადე სრულ სიბნელეშიც კი',
      '🛰️ GPS ლოკაცია & WiFi — ვიდეოების მყისიერი ნახვა და გადმოწერა ტელეფონში',
      '🛡️ 24/7 დარტყმის სენსორი — ავარიული მომენტის ავტომატური დაცვა წაშლისგან',
    ];
  } else if (isPhoneHolder) {
    if (!titleEn) titleEn = 'Magnetic MagSafe Car Air Vent Phone Mount';
    if (!titleKa) titleKa = 'MagSafe მაგნიტური მანქანის ტელეფონის სამაგრი';
    badge = 'Trending';

    descriptionEn = `Upgrade your daily drive with instantaneous one-hand docking and rock-solid magnetic hold. Featuring aerospace-grade N52 neodymium magnets and a 360-degree ball-joint rotation, this premium MagSafe car mount keeps your smartphone perfectly stable and accessible on the bumpiest terrain without blocking your vents. Seamless navigation, total focus, zero hassle.`;

    descriptionKa = `გახადეთ მართვა მაქსიმალურად კომფორტული და უსაფრთხო. უძლიერესი N52 ნეოდიმის მაგნიტებითა და 360-გრადუსიანი მბრუნავი მექანიზმით აღჭურვილი MagSafe სამაგრი მყარად აფიქსირებს ტელეფონს ნებისმიერი უსწორმასწორო გზის დროს. იდეალურია ნავიგაციისთვის, არ უშლის ჰაერის ჭავლს და მოითხოვს მხოლოდ ერთ მარტივ შეხებას.`;

    featuresEn = [
      '🧲 Ultra-Strong N52 Magnets — Keeps phone rock-steady even on bumpy roads',
      '🔄 360° Omnidirectional Rotation — Switch between portrait navigation & landscape view',
      '⚡ Direct MagSafe & Case Compatible — Instant snap-and-go with zero clips',
      '🚗 Anti-Slip Reinforced Vent Grip — Fits horizontal & vertical car air vents securely',
    ];

    featuresKa = [
      '🧲 ულტრა-მძლავრი N52 მაგნიტი — მყარი ფიქსაცია მკვეთრ მოსახვევებსა და უსწორმასწორო გზაზე',
      '🔄 360° თავისუფალი ბრუნვა — კომფორტული ხედვა ვერტიკალურ და ჰორიზონტალურ რეჟიმში',
      '⚡ MagSafe-ის სრული თავსებადობა — მყისიერი მიმაგრება ერთი შეხებით',
      '🚗 ჰაერის ჟალუზის დაცული სამაგრი — არ აზიანებს სალონის დეტალებს და არ ცურავს',
    ];
  } else if (isKeyboard) {
    if (!titleEn) titleEn = rawTitle || 'Wireless Mechanical Ergonomic Keyboard';
    if (!titleKa) titleKa = 'უსადენო მექანიკური ერგონომიული კლავიატურა';
    badge = 'Best Seller';

    descriptionEn = `Transform your workspace into a productivity powerhouse. Designed with premium tactile switches, triple connectivity (Bluetooth 5.3, 2.4GHz, USB-C), and an acoustic dampening structure, this mechanical keyboard delivers an ultra-smooth typing feel with remarkable battery life. Built for developers, creators, and professionals who demand excellence.`;

    descriptionKa = `გადააქციეთ თქვენი სამუშაო სივრცე სრულყოფილებად. უმაღლესი ხარისხის ტაქტილური სვიჩებით, სამმაგი კავშირით (Bluetooth 5.3, 2.4GHz, USB-C) და ხმის საიზოლაციო შრეებით შექმნილი მექანიკური კლავიატურა უზრუნველყოფს საოცრად სასიამოვნო აკრეფას და ხანგრძლივ ავტონომიას.`;

    featuresEn = [
      '⌨️ Hot-Swappable Switches — Customize your typing feel effortlessly',
      '📶 Multi-Device Triple Mode — Seamlessly switch between Mac, Windows, and tablet',
      '🔋 Massive Rechargeable Battery — Up to 200 hours of wireless typing per charge',
      '✨ Per-Key Dynamic RGB Backlight — Elegant illumination with custom lighting presets',
    ];

    featuresKa = [
      '⌨️ Hot-Swap მექანიზმი — სვიჩების სწრაფი და მარტივი შეცვლის მხარდაჭერა',
      '📶 სამმაგი კავშირი — მყისიერი გადართვა Mac-ს, Windows-სა და ტაბლეტს შორის',
      '🔋 ენერგოეფექტური ელემენტი — 200 საათამდე მუშაობა ერთი დამუხტვით',
      '✨ დინამიკური RGB განათება — მორგებადი ეფექტები და ღამის კომფორტული სამუშაო რეჟიმი',
    ];
  } else if (isMouse) {
    if (!titleEn) titleEn = rawTitle || 'Ergonomic Precision Wireless Mouse';
    if (!titleKa) titleKa = 'ერგონომიული უსადენო მაუსი მაღალი სიზუსტით';
    badge = 'Hot Deal';

    descriptionEn = `Say goodbye to wrist fatigue and welcome effortless control. Engineered with an anatomical 57° vertical angle and whisper-quiet click switches, this ergonomic mouse naturally aligns your forearm for all-day comfort. Featuring a 4000 DPI high-precision sensor, it glides smoothly across virtually any surface.`;

    descriptionKa = `დაემშვიდობეთ მაჯის დაღლილობას და ისიამოვნეთ უმაღლესი კონტროლით. 57° ბუნებრივი ერგონომიული დახრილობითა და ჩუმი კლიკის ღილაკებით შექმნილი მაუსი იდეალურად ერგება ხელისგულს. 4000 DPI ოპტიკური სენსორი უზრუნველყოფს მაქსიმალურ სიზუსტეს ნებისმიერ ზედაპირზე.`;

    featuresEn = [
      '🖐️ 57° Ergonomic Posture — Relieves muscular strain and promotes natural hand alignment',
      '🤫 Ultra-Quiet Acoustic Clicks — 90% noise reduction for focused productivity',
      '🎯 4000 DPI High-Precision Tracking — Pixel-perfect tracking on glass and wood',
      '⚡ Rapid USB-C Quick Charge — 1 minute of charging delivers 3 hours of full use',
    ];

    featuresKa = [
      '🖐️ 57° ერგონომიული დახრა — ხსნის მაჯისა და ხელის დაძაბულობას ხანგრძლივი მუშაობისას',
      '🤫 ულტრა-ჩუმი კლიკები — 90%-ით ნაკლები ხმაური მშვიდი სამუშაო გარემოსთვის',
      '🎯 4000 DPI მაღალი სიზუსტე — შეუფერხებელი მოძრაობა ნებისმიერ ზედაპირზე',
      '⚡ სწრაფი USB-C დამუხტვა — 1 წუთიანი დამუხტვა უზრუნველყოფს 3 საათიან მუშაობას',
    ];
  } else if (isBottle) {
    if (!titleEn) titleEn = rawTitle || 'Smart Insulated Stainless Steel Water Bottle';
    if (!titleKa) titleKa = 'ჭკვიანი თერმო-ბოთლი ტემპერატურის LED ინდიკატორით';
    badge = 'New';

    descriptionEn = `Stay perfectly refreshed wherever life takes you. Crafted from surgical-grade 18/8 stainless steel with advanced double-wall vacuum insulation, this smart bottle keeps your beverages ice-cold for 24 hours or piping hot for 12 hours. Featuring a leakproof lid and an integrated LED touch temperature display.`;

    descriptionKa = `შეინარჩუნეთ იდეალური ენერგია და ტენიანობა მთელი დღის განმავლობაში. სამედიცინო ხარისხის 18/8 უჟანგავი ფოლადითა და ორმაგი ვაკუუმ-იზოლაციით დამზადებული ბოთლი ინარჩუნებს სიცივეს 24 საათით, ხოლო სითბოს 12 საათით. თავსახურზე მოთავსებული სენსორული LED ეკრანი გაჩვენებთ ტემპერატურას ერთი შეხებით.`;

    featuresEn = [
      '❄️ 24h Cold / 12h Hot Insulation — Double-wall vacuum technology keeps drinks fresh',
      '🌡️ Touch LED Temperature Display — Monitor drink temperature with a gentle tap',
      '🔒 100% Leakproof & Condensation-Free — Safe for backpacks, car holders, and gym bags',
      '🌱 Pure 18/8 Food-Grade Stainless Steel — BPA-free, zero metallic aftertaste',
    ];

    featuresKa = [
      '❄️ 24 სთ სიცივე / 12 სთ სითბო — ორმაგი ვაკუუმ-იზოლაცია ინარჩუნებს პირვანდელ ტემპერატურას',
      '🌡️ სენსორული LED ეკრანი — ტემპერატურის მყისიერი ჩვენება ერთი შეხებით',
      '🔒 100% ჰერმეტული და გაჟონვისგან დაცული — უსაფრთხოა ჩანთასა და მანქანაში',
      '🌱 საკვები კლასის 18/8 უჟანგავი ფოლადი — ეკოლოგიური, BPA-ს გარეშე',
    ];
  } else {
    // General high-converting essential template
    if (!titleEn) titleEn = rawTitle;
    if (!titleKa) titleKa = rawTitle;
    badge = 'Best Seller';

    descriptionEn = `Experience the perfect harmony of premium craftsmanship and everyday practicality. Engineered from high-durability materials with meticulous attention to detail, the ${titleEn} elevates your daily routine with seamless convenience and modern style. Designed for discerning shoppers who value reliability, elegance, and outstanding performance.`;

    descriptionKa = `აღმოაჩინეთ უმაღლესი ხარისხისა და პრაქტიკულობის იდეალური შერწყმა. პრემიუმ მასალებითა და დახვეწილი დეტალებით შექმნილი ${titleKa || titleEn} თქვენს ყოველდღიურ ცხოვრებას ხდის უფრო მარტივს, თანამედროვესა და კომფორტულს. საუკეთესო არჩევანი მათთვის, ვინც აფასებს გამძლეობას, ესთეტიკას და ნამდვილ სანდოობას.`;

    featuresEn = [
      '⭐ Premium Build Quality — Engineered with durable, wear-resistant high-grade materials',
      '✨ Sleek Modern Aesthetics — Complements any professional or lifestyle environment',
      '🎯 Designed for Daily Reliability — Rigorously tested for continuous performance',
      '🛡️ 100% Satisfaction Guaranteed — Backed by DBUY Store quality warranty and fast dispatch',
    ];

    featuresKa = [
      '⭐ პრემიუმ ხარისხის მასალები — გამძლე კონსტრუქცია ხანგრძლივი და საიმედო გამოყენებისთვის',
      '✨ თანამედროვე და დახვეწილი დიზაინი — იდეალურად ერგება ნებისმიერ გარემოს',
      '🎯 ყოველდღიური კომფორტი — მარტივი, ერგონომიული და პრაქტიკული მოხმარება',
      '🛡️ 100% გარანტირებული ხარისხი — DBUY Store-ის ოფიციალური შემოწმება და სწრაფი მიწოდება',
    ];
  }

  const customSlug = cleanSlug(titleEn || rawTitle);

  return {
    titleEn,
    titleKa,
    descriptionEn,
    descriptionKa,
    featuresEn,
    featuresKa,
    customSlug,
    badge,
  };
}

/**
 * Main function to generate product ad copy
 * Tries server-side Gemini API first, falling back to smart offline copywriter if necessary.
 */
export async function generateProductAdCopy(params: GenerateAdCopyParams): Promise<GeneratedAdCopy> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('/api/generate-product-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        titleKa: params.titleKa,
        category: params.category,
        price: params.price,
        images: params.images?.slice(0, 3),
        imageTitles: params.imageTitles,
        tone: params.tone || 'high-converting',
        language: params.language || 'both',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json: any = await response.json();
      if (json && json.success && json.data) {
        const d = json.data;
        return {
          titleEn: d.titleEn || params.title || '',
          titleKa: d.titleKa || params.titleKa || '',
          descriptionEn: d.descriptionEn || '',
          descriptionKa: d.descriptionKa || '',
          featuresEn: Array.isArray(d.featuresEn) && d.featuresEn.length > 0 ? d.featuresEn : [],
          featuresKa: Array.isArray(d.featuresKa) && d.featuresKa.length > 0 ? d.featuresKa : [],
          customSlug: d.customSlug ? cleanSlug(d.customSlug) : cleanSlug(params.title || ''),
          badge: d.badge || 'Hot Deal',
        };
      }
    }
  } catch (err) {
    console.warn('Backend ad copy generation error, using smart offline copywriter:', err);
  }

  // Fallback to intelligent rule-based copywriter
  return generateSmartOfflineAdCopy(params);
}
