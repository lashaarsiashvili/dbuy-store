import { Product } from '../types';

/**
 * Generates 4 compelling, domain-specific Key Features for a product based on its title, description, and category.
 */
export function generateProductFeatures(
  prod: { title: string; description?: string; category?: string; price?: number },
  lang: string = 'en'
): string[] {
  const title = (prod.title || '').trim();
  const desc = (prod.description || '').trim();
  const combined = `${title} ${desc}`.toLowerCase();
  const isKa = lang === 'ka';

  // 1. Try to extract explicit bullet points from description
  const bulletCandidates: string[] = [];
  if (desc) {
    const lines = desc.split(/[\n\r]+/);
    for (const line of lines) {
      const cleaned = line.replace(/^[\s*•\-–—►✔✓\d.)]+/, '').trim();
      if (cleaned.length >= 10 && cleaned.length <= 90 && !cleaned.toLowerCase().startsWith('http')) {
        bulletCandidates.push(cleaned);
      }
    }
  }

  if (bulletCandidates.length >= 4) {
    return bulletCandidates.slice(0, 4);
  }

  // 2. Domain-specific rule matching for popular gadget/e-commerce categories
  const feats: string[] = [];

  // Dash cam / Car Black Box
  if (combined.includes('black box') || combined.includes('dash cam') || combined.includes('car camera') || combined.includes('double lens') || combined.includes('170')) {
    if (isKa) {
      feats.push('170° ფართოკუთხიანი ორმაგი ლინზა (Front & Interior)');
      feats.push('Full HD 1080P მკაფიო ღამის ხედვა (Night Vision)');
      feats.push('G-სენსორი & ავარიული ჩაწერის ავტომატური ბლოკირება');
      feats.push('24-საათიანი პარკინგის მონიტორინგი & Loop Recording');
    } else {
      feats.push('Dual-lens 170° ultra-wide angle front & interior recording');
      feats.push('Full HD 1080P crystal-clear night vision sensors');
      feats.push('Built-in G-Sensor with emergency collision video lock');
      feats.push('24/7 parking surveillance mode & seamless loop recording');
    }
    return feats;
  }

  // Smart Bands / Fitness Trackers / Hume Band / Apple Watch / Smartwatch
  if (combined.includes('band') || combined.includes('watch') || combined.includes('fitness tracker') || combined.includes('heart rate') || combined.includes('hume')) {
    if (isKa) {
      feats.push('გულისცემის, ჟანგბადის (SpO2) & ძილის ზუსტი მონიტორინგი');
      feats.push('100+ სპორტული რეჟიმი & აქტივობის ავტომატური აღრიცხვა');
      feats.push('წყალგაუმტარი 5ATM კორპუსი & ულტრა-მსუბუქი დიზაინი');
      feats.push('14-დღემდე ელემენტის მუშაობის ხანგრძლივობა (Fast Charge)');
    } else {
      feats.push('Continuous Heart Rate, SpO2 & deep sleep tracking');
      feats.push('100+ active workout & fitness sport tracking modes');
      feats.push('5ATM waterproof rated with ultra-lightweight comfort strap');
      feats.push('Up to 14 days ultra-long battery life with fast magnetic charging');
    }
    return feats;
  }

  // Microphones / Audio gear / PodMic / Rode
  if (combined.includes('mic') || combined.includes('audio') || combined.includes('podmic') || combined.includes('sound') || combined.includes('rode')) {
    if (isKa) {
      feats.push('სტუდიური ხარისხის 24-Bit/96kHz ხმის ჩაწერა');
      feats.push('ჩაშენებული Pop-ფილტრი & ვიბრაციის საწინააღმდეგო სამაგრი');
      feats.push('USB-C & XLR ორმაგი თავსებადობა (Plug & Play)');
      feats.push('One-Touch Mute ღილაკი LED ინდიკატორით');
    } else {
      feats.push('Studio-grade 24-Bit/96kHz ultra-low noise audio capture');
      feats.push('Built-in internal pop filter & anti-vibration shock mount');
      feats.push('Dual USB-C & XLR connectivity for PC, Mac, and mixers');
      feats.push('One-touch tap-to-mute with instant LED status indicator');
    }
    return feats;
  }

  // Car Phone Holder / MagSafe Mount
  if (combined.includes('phone holder') || combined.includes('magsafe') || combined.includes('car mount') || combined.includes('holder') || combined.includes('andery')) {
    if (isKa) {
      feats.push('ძლიერი N52 მაგნიტური ფიქსაცია (78+ LBS ძალა)');
      feats.push('MagSafe & უნივერსალური სმარტფონების სრული თავსებადობა');
      feats.push('360° თავისუფლად ბრუნვადი მეტალის მექანიზმი');
      feats.push('სტაბილური დაცვა უსწორმასწორო გზებზე & ვიბრაციის გარეშე');
    } else {
      feats.push('Ultra-strong N52 magnetic grip rated for 78+ LBS hold');
      feats.push('Full official MagSafe & all smartphone case compatibility');
      feats.push('360-degree precision ball joint for optimal viewing angles');
      feats.push('Bumpy road stabilization with zero vibration or slippage');
    }
    return feats;
  }

  // Keyboards / Mechanical Keyboards
  if (combined.includes('keyboard') || combined.includes('keychron') || combined.includes('switch') || combined.includes('typing')) {
    if (isKa) {
      feats.push('მაღალი სიზუსტის მექანიკური სვიჩები (Pre-lubed)');
      feats.push('RGB განათება მორგებადი ეფექტებით & ცხელი კლავიშებით');
      feats.push('Bluetooth 5.1 & USB-C უსადენო/სადენიანი რეჟიმი');
      feats.push('Mac, Windows, iOS & Android სრული თავსებადობა');
    } else {
      feats.push('Pre-lubricated high-precision tactile mechanical switches');
      feats.push('Dynamic per-key RGB backlighting with custom macro effects');
      feats.push('Tri-mode connectivity: Bluetooth 5.1, 2.4GHz & USB-C wired');
      feats.push('Universal layout support for macOS, Windows, iOS, and Android');
    }
    return feats;
  }

  // Water bottles / Insulated Flasks
  if (combined.includes('bottle') || combined.includes('flask') || combined.includes('thermos') || combined.includes('hydration') || combined.includes('insulated')) {
    if (isKa) {
      feats.push('რეალური ტემპერატურის ჭკვიანი LED სენსორული ეკრანი');
      feats.push('24 საათი ცივი / 12 საათი ცხელი იზოლაცია');
      feats.push('BPA-Free 304 სამედიცინო უჟანგავი ფოლადი');
      feats.push('100% ჰერმეტული სილიკონის საცობი გაჟონვის გარეშე');
    } else {
      feats.push('Real-time LCD touch temperature display on smart cap');
      feats.push('Double-walled vacuum insulation: 24h cold / 12h hot');
      feats.push('Food-grade 304 BPA-Free stainless steel interior');
      feats.push('100% leakproof silicone seal ring with easy-carry loop');
    }
    return feats;
  }

  // Flashlight / EDC Tool / Tactical Gear
  if (combined.includes('flashlight') || combined.includes('light') || combined.includes('lumens') || combined.includes('torch') || combined.includes('edc')) {
    if (isKa) {
      feats.push('სუპერ მძლავრი Turbo სინათლის სხივი (2000+ Lumens)');
      feats.push('IPX8 უმაღლესი წყალგაუმტარობა & გამძლე ალუმინის კორპუსი');
      feats.push('მაგნიტური ძირი ხელების გარეშე სამუშაოდ');
      feats.push('USB-C სწრაფი დამუხტვა & ხანგრძლივი მუშაობის რეჟიმი');
    } else {
      feats.push('Ultra-bright 2000+ Lumens turbo beam with long range focus');
      feats.push('IPX8 waterproof submersible rating with aero-grade alloy shell');
      feats.push('Strong magnetic tailcap for hands-free convenience');
      feats.push('Fast USB-C rechargeable battery with battery level indicator');
    }
    return feats;
  }

  // Bags / Sleeves / Organizers
  if (combined.includes('bag') || combined.includes('sleeve') || combined.includes('case') || combined.includes('organizer') || combined.includes('pouch') || combined.includes('backpack')) {
    if (isKa) {
      feats.push('წყალგაუმტარი პრემიუმ მასალა & დამცავი რბილი შიგთავსი');
      feats.push('მრავალფუნქციური განყოფილებები აქსესუარებისა და კაბელებისთვის');
      feats.push('გამძლე YKK ელვა-შესაკრავი & კომფორტული სახელური');
      feats.push('დარტყმაგამძლე 360° კუთხეების დაცვა გაჯეტებისთვის');
    } else {
      feats.push('Water-resistant premium weatherproof exterior fabric');
      feats.push('Multi-compartment organizer for cables, chargers & gadgets');
      feats.push('Heavy-duty reinforced YKK metal zippers and stitching');
      feats.push('360° padded shockproof edge protection for electronics');
    }
    return feats;
  }

  // Headphones / Earbuds / Speakers
  if (combined.includes('headphone') || combined.includes('earbud') || combined.includes('earphone') || combined.includes('speaker') || combined.includes('tws') || combined.includes('anc')) {
    if (isKa) {
      feats.push('აქტიური ხმაურის ჩახშობა (Hybrid Active Noise Cancelling)');
      feats.push('Hi-Res აუდიო დრაივერები & ღრმა ბასის ჟღერადობა');
      feats.push('40+ საათამდე ავტონომიური მუშაობის დრო სწრაფი დამუხტვით');
      feats.push('Bluetooth 5.3 სტაბილური კავშირი & მიკროფონი ზარებისთვის');
    } else {
      feats.push('Hybrid Active Noise Cancellation (ANC) with transparency mode');
      feats.push('Custom Hi-Res 40mm dynamic drivers with rich acoustic bass');
      feats.push('Up to 40+ hours playtime with quick 10-minute USB-C charge');
      feats.push('Bluetooth 5.3 multipoint connection & crystal-clear call mics');
    }
    return feats;
  }

  // Power Banks / Chargers / Wireless charging
  if (combined.includes('power bank') || combined.includes('charger') || combined.includes('charging') || combined.includes('battery') || combined.includes('mah') || combined.includes('watt') || combined.includes('pd')) {
    if (isKa) {
      feats.push('მაღალი სიჩქარის სწრაფი დამუხტვა (PD 3.0 & QC 4.0)');
      feats.push('დიდი ტევადობის უსაფრთხო ლითიუმ-პოლიმერული ელემენტი');
      feats.push('მრავალდონიანი დაცვა გადახურებისა და მოკლე ჩართვისგან');
      feats.push('უნივერსალური თავსებადობა iPhone, Samsung & ლეპტოპებთან');
    } else {
      feats.push('High-speed Fast Power Delivery (PD 3.0 & QC 4.0 compatible)');
      feats.push('High-capacity grade-A safe lithium polymer battery cell');
      feats.push('Multi-protect safety system against overheating & surge');
      feats.push('Universal fast charge for iPhone, Galaxy, iPad & laptops');
    }
    return feats;
  }

  // 3. Fallback dynamically generated based on Category & Specs
  const cat = prod.category || 'tech';
  if (cat === 'tech') {
    if (isKa) {
      return [
        'პრემიუმ ხარისხის კომპონენტები და ერგონომიული დიზაინი',
        'სწრაფი და სტაბილური Plug & Play თავსებადობა',
        'ენერგოეფექტური მუშაობა და გამძლე კონსტრუქცია',
        '100% ხარისხის გარანტია და სწრაფი მიწოდება'
      ];
    }
    return [
      'Engineered with premium performance components',
      'Instant Plug & Play compatibility with modern devices',
      'High-durability ergonomic build designed for daily use',
      'Full manufacturer warranty & satisfaction guarantee'
    ];
  }

  if (cat === 'fitness') {
    if (isKa) {
      return [
        'ეკოლოგიურად სუფთა და უსაფრთხო BPA-Free მასალები',
        'აქტიური ვარჯიშისა და ყოველდღიური გამოყენებისთვის',
        'დარტყმაგამძლე და წყალგაუმტარი კონსტრუქცია',
        'კომფორტული და მსუბუქი პორტატული ფორმა'
      ];
    }
    return [
      'Certified BPA-Free & eco-friendly safe materials',
      'Engineered for intense workouts and everyday fitness',
      'Impact-resistant & weatherproof high-grade construction',
      'Ergonomic lightweight design for maximum mobility'
    ];
  }

  if (cat === 'accessories') {
    if (isKa) {
      return [
        'ზუსტი ზომები და თანამედროვე მინიმალისტური სტილი',
        'ნაკაწრებისა და ცვეთისგან საიმედო დაცვა',
        'პრემიუმ შეხების მასალები და ხანგრძლივი გამძლეობა',
        'თავსებადია უმეტეს თანამედროვე მოდელებთან'
      ];
    }
    return [
      'Precision-engineered sleek minimalist modern finish',
      'Enhanced surface protection against scratches and drops',
      'Premium tactile feel with long-lasting daily durability',
      'Universal compatibility tailored for modern essentials'
    ];
  }

  // Everyday
  if (isKa) {
    return [
      'უმაღლესი ხარისხის პრემიუმ მასალები',
      'კომფორტული და პრაქტიკული ყოველდღიური გამოყენება',
      'გამოცდილი გამძლეობა და ელეგანტური სტილი',
      'სრული საგარანტიო მომსახურება & სწრაფი გზავნილი'
    ];
  }

  return [
    'Crafted with high-grade durable premium materials',
    'Designed for maximum daily comfort and convenience',
    'Rigorously tested for reliability and long lifespan',
    'Backed by full warranty coverage & speedy shipping'
  ];
}

/**
 * Returns either existing features or automatically generated 4 Key Features for any product.
 */
export function getProductFeatures(product: Product, lang: string = 'en'): string[] {
  if (product.features && product.features.length >= 3) {
    return product.features.slice(0, 4);
  }

  return generateProductFeatures(product, lang);
}
