import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Sparkles, 
  MapPin, 
  ArrowRight, 
  Eye, 
  ShoppingBag, 
  Heart, 
  MessageCircle, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Smartphone, 
  Monitor, 
  Layers, 
  ExternalLink,
  Flame,
  Check,
  Compass
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { CachedImage } from './CachedImage';
import { ScrollReveal } from './ScrollReveal';

export interface AdVariation {
  id: string;
  category: string;
  adNumber: number;
  productName: string;
  productNameKa: string;
  productId: string;
  realProductTitle: string;
  price: number;
  origPrice?: number;
  image: string;
  location: string;
  locationKa: string;
  headlineEn: string;
  headlineKa: string;
  descriptionEn: string;
  descriptionKa: string;
  buttonEn: string;
  buttonKa: string;
  accentGradient: string;
  badgeText: string;
  badgeTextKa: string;
  lifestyleContextEn: string;
  lifestyleContextKa: string;
  likes: string;
  comments: string;
  tags: string[];
}

export const AdsGallery: React.FC = () => {
  const { 
    language, 
    setCurrentPage, 
    navigateToProduct, 
    setQuickViewProduct, 
    products, 
    formatPrice,
    addToast 
  } = useStore();

  const isKa = language === 'ka';
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [viewFormat, setViewFormat] = useState<'feed' | 'story' | 'banner'>('feed');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 5 Distinct Ad Variations based on real products from www.dbuystore.com
  const ads: AdVariation[] = [
    {
      id: 'ad-fitness-smartwatch',
      category: 'fitness',
      adNumber: 1,
      productName: 'The Hume Band 2.0 & SportFlex',
      productNameKa: 'The Hume Band 2.0 & SportFlex',
      productId: 'prod-1788722861679',
      realProductTitle: 'The Hume Band 2.0',
      price: 299,
      origPrice: 349,
      image: '/uploads/prod-prod-1788722861679-0-1788783606625-h5wof.jpg',
      location: 'Mtatsminda Park, Tbilisi',
      locationKa: 'მთაწმინდის პარკი, თბილისი',
      headlineEn: 'Start an Active Life!',
      headlineKa: 'დაიწყე აქტიური ცხოვრება!',
      descriptionEn: 'DBUY Fitness Smartwatches & Trackers: Your ultimate workout partner overlooking Tbilisi.',
      descriptionKa: 'DBUY Fitness Smartwatches & Trackers: თქვენი საუკეთესო პარტნიორი ვარჯიშსა და ჯანმრთელობის მონიტორინგში.',
      buttonEn: 'Buy Now',
      buttonKa: 'შეიძინე ახლავე',
      accentGradient: 'from-amber-500 via-orange-600 to-rose-600',
      badgeText: 'Health & Workout',
      badgeTextKa: 'ვარჯიში & ჯანმრთელობა',
      lifestyleContextEn: 'Active morning workout session above the scenic Tbilisi panorama with real-time biometric and heart tracking.',
      lifestyleContextKa: 'აქტიური დილის ვარჯიში მთაწმინდის პარკში თბილისის ხედით, რეალური დროის ჯანმრთელობისა და პულსის მონიტორინგით.',
      likes: '3.4k',
      comments: '182',
      tags: ['#TbilisiFitness', '#MtatsmindaRun', '#DBUYStore', '#SmartLife'],
    },
    {
      id: 'ad-smart-water-bottle',
      category: 'drinkware',
      adNumber: 2,
      productName: 'Smart Water Bottle (Hydration Tracker with APP)',
      productNameKa: 'Smart Water Bottle (დატენიანების ტრეკერი აპლიკაციით)',
      productId: 'prod-1788877210563',
      realProductTitle: 'Smart Water Bottle: 32 oz Hydration Tracker with APP',
      price: 69,
      origPrice: 99,
      image: '/uploads/prod-prod-1788877210563-0-1788877213900-80n0m.jpg',
      location: 'Terminal Coworking, Tbilisi',
      locationKa: 'ქოვორქინგ სივრცე, თბილისი',
      headlineEn: 'Stay Hydrated All Day',
      headlineKa: 'იყავი ენერგიული და დატენიანებული მთელი დღე',
      descriptionEn: 'Our smart water bottles remind you to drink so you stay focused, energized, and feel your best.',
      descriptionKa: 'ჭკვიანი წყლის ბოთლი შეხსენების სისტემითა და აპლიკაციით — თქვენი ენერგიისა და პროდუქტიულობის გარანტია.',
      buttonEn: 'Discover',
      buttonKa: 'აღმოაჩინე',
      accentGradient: 'from-blue-600 via-sky-500 to-cyan-400',
      badgeText: 'Smart Hydration',
      badgeTextKa: 'ჭკვიანი დატენიანება',
      lifestyleContextEn: 'Modern professional at a clean wooden desk staying refreshed throughout a productive tech workday in Tbilisi.',
      lifestyleContextKa: 'თანამედროვე პროფესიონალი სამუშაო მაგიდასთან ინარჩუნებს ენერგიასა და ოპტიმალურ ჰიდრატაციას მთელი დღის განმავლობაში.',
      likes: '2.8k',
      comments: '145',
      tags: ['#CoworkingTbilisi', '#SmartBottle', '#HealthyWorkday', '#DBUY'],
    },
    {
      id: 'ad-tech-accessories',
      category: 'workspace',
      adNumber: 3,
      productName: 'PRO X SUPERLIGHT 2 & G309 Tech Gear',
      productNameKa: 'PRO X SUPERLIGHT 2 & G309 ტექნიკა',
      productId: 'prod-1788785750636',
      realProductTitle: 'PRO X SUPERLIGHT 2',
      price: 199,
      origPrice: 239,
      image: '/uploads/prod-prod-1788785750636-0-1788785751962-zjv0m.jpg',
      location: 'Boutique Cafe, Vera, Tbilisi',
      locationKa: 'მყუდრო კაფე, ვერა, თბილისი',
      headlineEn: 'Build Your Perfect Workspace',
      headlineKa: 'შექმენი შენი იდეალური სამუშაო გარემო',
      descriptionEn: 'From ultra-light pro precision gear to elite lifestyle accessories, DBUY has everything you need.',
      descriptionKa: 'ულტრა-ზუსტი პერიფერიული ტექნიკიდან პრემიუმ აქსესუარებამდე, DBUY-ს აქვს ყველაფერი შენი იდეალური გარემოსთვის.',
      buttonEn: 'Shop Accessories',
      buttonKa: 'აქსესუარების ნახვა',
      accentGradient: 'from-violet-600 via-purple-600 to-indigo-600',
      badgeText: 'Workspace & Pro Gear',
      badgeTextKa: 'სამუშაო სივრცე & ტექნიკა',
      lifestyleContextEn: 'Working remotely from a warm cafe in Tbilisi with a laptop, hot drink, and ultra-accurate wireless gear.',
      lifestyleContextKa: 'პროდუქტიული მუშაობა თბილისის მყუდრო კაფეში, ულტრა-მსუბუქი პერიფერიითა და კომფორტული აქსესუარებით.',
      likes: '4.1k',
      comments: '230',
      tags: ['#TbilisiCafeWork', '#ProXSuperlight', '#DeskSetup', '#DBUYStore'],
    },
    {
      id: 'ad-professional-audio',
      category: 'audio',
      adNumber: 4,
      productName: 'Rode PodMic USB & PRO X2 Studio Headset',
      productNameKa: 'Rode PodMic USB & PRO X2 სტუდიური ყურსასმენი',
      productId: 'prod-1788722508271',
      realProductTitle: 'Rode PodMic USB Black Microphone with SC27 Cable & Boom Arm',
      price: 279,
      origPrice: 329,
      image: '/uploads/prod-prod-1788722508271-0-1788783608231-rbxub.jpg',
      location: 'Translation & Dubbing Studio, Tbilisi',
      locationKa: 'გახმოვანებისა და თარგმნის სტუდია, თბილისი',
      headlineEn: 'Your Voice, Your Success',
      headlineKa: 'შენი ხმა, შენი წარმატება',
      descriptionEn: 'Top-tier broadcast audio equipment for professional translation, dubbing, and streaming. Feel the difference!',
      descriptionKa: 'სტუდიური ხარისხის აუდიო აღჭურვილობა პროფესიონალური თარგმნის, გახმოვანებისა და პოდკასტინგისთვის. იგრძენი სხვაობა!',
      buttonEn: 'View Audio Tech',
      buttonKa: 'აუდიო ტექნიკის ნახვა',
      accentGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      badgeText: 'Studio & Broadcast Audio',
      badgeTextKa: 'სტუდიური აუდიო & თარგმნა',
      lifestyleContextEn: 'Translator speaking into an articulating broadcast boom arm microphone with waveform monitoring in a soundproof studio.',
      lifestyleContextKa: 'გახმოვანებისა და თარგმნის პროფესიონალი სტუდიურ მიკროფონთან ხმის მონიტორინგის ინტერფეისით.',
      likes: '3.9k',
      comments: '194',
      tags: ['#AudioTbilisi', '#DubbingStudio', '#RodePodMic', '#TranslationGeorgia'],
    },
    {
      id: 'ad-smart-surveillance',
      category: 'security',
      adNumber: 5,
      productName: 'Car Black Box 4K Dual Lens Dash Cam',
      productNameKa: 'Car Black Box 4K ორმაგი ობიექტივის კამერა',
      productId: 'prod-1788722697137',
      realProductTitle: 'Car Black Box Front and Interior Double Lens Dash Cam 4K',
      price: 79,
      origPrice: 119,
      image: '/uploads/prod-prod-1788722697137-0-1788783607687-fwr3e.jpg',
      location: 'Tbilisi Urban Streets & Living',
      locationKa: 'თბილისის ქუჩები & მობილური კონტროლი',
      headlineEn: 'Comfort & Security are at Your Fingertips',
      headlineKa: 'კომფორტი და უსაფრთხოება შენს ხელთაა',
      descriptionEn: 'Control your 4K dual-lens smart surveillance with Wi-Fi smartphone app from anywhere, with DBUY.',
      descriptionKa: 'აკონტროლე შენი 4K ორმაგი ობიექტივის ჭკვიანი უსაფრთხოების სისტემა სმარტფონით ნებისმიერი ადგილიდან, DBUY-სთან ერთად.',
      buttonEn: 'Choose Tech',
      buttonKa: 'შეარჩიე ტექნიკა',
      accentGradient: 'from-indigo-600 via-blue-600 to-cyan-600',
      badgeText: 'Smart Security & Auto',
      badgeTextKa: 'ჭკვიანი უსაფრთხოება & ავტო',
      lifestyleContextEn: 'Smart Wi-Fi remote viewing on smartphone, 24/7 security surveillance and comfort in urban Tbilisi.',
      lifestyleContextKa: 'სმარტფონის Wi-Fi აპლიკაციით პირდაპირი კონტროლი და სრული უსაფრთხოება თბილისის ქუჩებში.',
      likes: '2.5k',
      comments: '118',
      tags: ['#TbilisiSecurity', '#CarBlackBox4K', '#SmartLiving', '#DBUYStore'],
    },
  ];

  // Filtering
  const filteredAds = activeFilter === 'all' 
    ? ads 
    : ads.filter(ad => ad.category === activeFilter);

  const handleCopyCopy = (ad: AdVariation) => {
    const textToCopy = `🔥 ${isKa ? ad.headlineKa : ad.headlineEn}\n\n${isKa ? ad.descriptionKa : ad.descriptionEn}\n\n📍 ${isKa ? ad.locationKa : ad.location}\n🛒 www.dbuystore.com\n\n${ad.tags.join(' ')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(ad.id);
    addToast(
      isKa ? 'სარეკლამო ტექსტი დაკოპირდა!' : 'Ad copy copied to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleProductAction = (productId: string) => {
    const found = products.find(p => p.id === productId);
    if (found) {
      navigateToProduct(found.id);
    } else {
      setCurrentPage('home');
    }
  };

  const handleQuickViewAction = (productId: string) => {
    const found = products.find(p => p.id === productId);
    if (found) {
      setQuickViewProduct(found);
    }
  };

  return (
    <div className="w-full py-10 sm:py-16 bg-slate-50/70 dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= SECTION HEADER ================= */}
        <ScrollReveal direction="up" delay={0}>
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-xs font-black tracking-wide border border-blue-200/60 dark:border-blue-800/60 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-rose-500 animate-bounce-short" />
              <span>{isKa ? 'თბილისი, საქართველო • ლაიფსთაილ რეკლამების გალერეა' : 'Tbilisi, Georgia • Lifestyle Ad Variations'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {isKa ? 'DBUY Store სარეკლამო კამპანიები' : 'DBUY Store Ad Campaigns'}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {isKa 
                ? 'პროფესიონალური სარეკლამო ვარიაციები თბილისის რეალურ ლოკაციებზე, www.dbuystore.com-ის ოფიციალური პროდუქტებითა და ბრენდინგით.' 
                : 'High-converting digital ad variations featuring authentic Tbilisi lifestyle scenarios using official products from www.dbuystore.com.'}
            </p>

            {/* Official Website Verification Badge */}
            <div className="pt-2 flex items-center justify-center space-x-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isKa ? 'ოფიციალური კატალოგის პროდუქტები' : 'Verified Official Products'}</span>
              </span>
              <span>•</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">www.dbuystore.com</span>
            </div>
          </div>
        </ScrollReveal>

        {/* ================= CONTROLS: CATEGORY FILTER & VIEW FORMAT ================= */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-slate-200 dark:border-slate-800">
          
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none w-full md:w-auto pb-1">
            {[
              { id: 'all', labelEn: 'All Ads (5)', labelKa: 'ყველა რეკლამა (5)' },
              { id: 'fitness', labelEn: 'Fitness (Mtatsminda)', labelKa: 'ფიტნესი (მთაწმინდა)' },
              { id: 'drinkware', labelEn: 'Hydration (Coworking)', labelKa: 'დატენიანება (ქოვორქინგი)' },
              { id: 'workspace', labelEn: 'Workspace (Cafe)', labelKa: 'სამუშაო (კაფე)' },
              { id: 'audio', labelEn: 'Audio (Studio)', labelKa: 'აუდიო (სტუდია)' },
              { id: 'security', labelEn: 'Security & Auto', labelKa: 'უსაფრთხოება & ავტო' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {isKa ? f.labelKa : f.labelEn}
              </button>
            ))}
          </div>

          {/* Layout Display Switcher */}
          <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs self-end md:self-auto">
            <button
              onClick={() => setViewFormat('feed')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewFormat === 'feed'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{isKa ? 'ბარათები' : 'Feed Cards'}</span>
            </button>
            <button
              onClick={() => setViewFormat('story')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewFormat === 'story'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{isKa ? 'სთორი (9:16)' : 'Story (9:16)'}</span>
            </button>
          </div>

        </div>

        {/* ================= ADS GALLERY GRID ================= */}
        {viewFormat === 'feed' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredAds.map((ad, idx) => {
              const headline = isKa ? ad.headlineKa : ad.headlineEn;
              const description = isKa ? ad.descriptionKa : ad.descriptionEn;
              const buttonText = isKa ? ad.buttonKa : ad.buttonEn;
              const locationText = isKa ? ad.locationKa : ad.location;
              const badgeText = isKa ? ad.badgeTextKa : ad.badgeText;
              const contextText = isKa ? ad.lifestyleContextKa : ad.lifestyleContextEn;

              return (
                <ScrollReveal key={ad.id} direction="up" delay={idx * 60}>
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
                    
                    {/* 1. Brand Header Bar */}
                    <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center space-x-2.5">
                        <BrandLogo size="sm" circularBadge={true} showText={false} />
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white">DBUY Store</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20" />
                          </div>
                          <span className="text-[10px] text-slate-400">Sponsored • www.dbuystore.com</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Ad #{ad.adNumber}
                      </span>
                    </div>

                    {/* 2. Visual Stage (Product + Tbilisi Lifestyle Scenario) */}
                    <div className="relative aspect-4/3 overflow-hidden bg-slate-950 cursor-pointer" onClick={() => handleProductAction(ad.productId)}>
                      
                      {/* Ambient Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${ad.accentGradient} opacity-25 group-hover:opacity-35 transition-opacity duration-500`} />
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.06]" />

                      {/* Real Product Image Showcase */}
                      <div className="absolute inset-4 sm:inset-6 flex items-center justify-center">
                        <CachedImage
                          src={ad.image}
                          alt={ad.productName}
                          className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-108 transition-transform duration-500 ease-out"
                        />
                      </div>

                      {/* Location Pill Overlay */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-md">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{locationText}</span>
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                        {badgeText}
                      </div>

                      {/* Price Tag Overlay */}
                      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white text-xs font-black shadow-lg flex items-baseline space-x-1.5">
                        <span>{formatPrice(ad.price)}</span>
                        {ad.origPrice && (
                          <span className="text-[10px] text-slate-400 line-through font-normal">
                            {formatPrice(ad.origPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. Ad Copywriting Content */}
                    <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Lifestyle Context Note */}
                        <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <Compass className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="line-clamp-1">{contextText}</span>
                        </div>

                        {/* Compelling Headline */}
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {headline}
                        </h3>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                          {description}
                        </p>

                        {/* Associated Product Tag */}
                        <div className="pt-1 flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <span className="text-slate-400">{isKa ? 'პროდუქტი:' : 'Product:'}</span>
                          <span className="text-blue-600 dark:text-blue-400 truncate">{ad.productName}</span>
                        </div>
                      </div>

                      {/* 4. Action CTA & Social Engagements */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProductAction(ad.productId)}
                            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 cursor-pointer hover:scale-102"
                          >
                            <ShoppingBag className="w-4 h-4" />
                            <span>{buttonText}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleQuickViewAction(ad.productId)}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            title="Quick View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCopyCopy(ad)}
                            className={`p-3 rounded-xl transition-all cursor-pointer ${
                              copiedId === ad.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                            title={isKa ? 'სარეკლამო ტექსტის კოპირება' : 'Copy Ad Copy'}
                          >
                            {copiedId === ad.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Social Meta Mockup */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center space-x-1">
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                              <span>{ad.likes}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{ad.comments}</span>
                            </span>
                          </div>
                          <span>www.dbuystore.com</span>
                        </div>
                      </div>

                    </div>

                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          /* ================= STORY / 9:16 VERTICAL VIEW ================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-6">
            {filteredAds.map((ad, idx) => {
              const headline = isKa ? ad.headlineKa : ad.headlineEn;
              const description = isKa ? ad.descriptionKa : ad.descriptionEn;
              const buttonText = isKa ? ad.buttonKa : ad.buttonEn;
              const locationText = isKa ? ad.locationKa : ad.location;

              return (
                <ScrollReveal key={ad.id} direction="up" delay={idx * 50}>
                  <div className="relative aspect-9/16 rounded-3xl overflow-hidden shadow-xl border-4 border-slate-900 bg-slate-950 text-white flex flex-col justify-between p-4 group">
                    
                    {/* Story Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-b ${ad.accentGradient} opacity-35 group-hover:opacity-45 transition-opacity duration-500`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />

                    {/* Story Top Header Bar */}
                    <div className="relative z-10 space-y-2">
                      {/* Story Progress Indicators */}
                      <div className="flex items-center space-x-1">
                        <div className="flex-1 h-1 rounded-full bg-white" />
                        <div className="flex-1 h-1 rounded-full bg-white/40" />
                        <div className="flex-1 h-1 rounded-full bg-white/40" />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2">
                          <BrandLogo size="sm" circularBadge={true} showText={false} />
                          <div>
                            <p className="text-[11px] font-black leading-tight">dbuystore.com</p>
                            <p className="text-[9px] text-slate-300">Sponsored</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300">#{ad.adNumber}</span>
                      </div>

                      {/* Location Badge */}
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-semibold text-rose-300 border border-white/15">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{locationText}</span>
                      </div>
                    </div>

                    {/* Story Center Product Stage */}
                    <div className="relative z-10 my-auto py-2 flex items-center justify-center">
                      <div className="w-36 h-36 rounded-2xl p-2 flex items-center justify-center">
                        <CachedImage
                          src={ad.image}
                          alt={ad.productName}
                          className="w-full h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    </div>

                    {/* Story Bottom Copy & Swipe / CTA */}
                    <div className="relative z-10 space-y-2.5">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black tracking-tight leading-snug line-clamp-2">
                          {headline}
                        </h4>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                          {description}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline space-x-2">
                        <span className="text-base font-black text-amber-300">{formatPrice(ad.price)}</span>
                        {ad.origPrice && (
                          <span className="text-[11px] text-slate-400 line-through">{formatPrice(ad.origPrice)}</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleProductAction(ad.productId)}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <span>{buttonText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* ================= BOTTOM ACTION: GO BACK TO CATALOG ================= */}
        <div className="mt-12 sm:mt-16 text-center">
          <button
            onClick={() => setCurrentPage('home')}
            className="px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-extrabold text-sm shadow-sm hover:shadow-md transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <span>{isKa ? '← მაღაზიაში დაბრუნება' : '← Back to Storefront'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
