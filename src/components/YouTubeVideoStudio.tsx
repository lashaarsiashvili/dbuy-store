import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Film,
  Video,
  Sparkles,
  Download,
  Play,
  Check,
  Copy,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Smartphone,
  Monitor,
  Music,
  Volume2,
  Mic,
  Tag,
  ExternalLink,
  Clock,
  Search,
  ChevronDown,
  CheckCircle2,
  Info,
  Loader2,
  Upload,
  ArrowRight,
  Sliders,
  DollarSign,
  Share2,
} from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { CachedImage } from './CachedImage';
import {
  CommercialAspectRatio,
  CommercialMusicMood,
  PromoVideoGenerationProgress,
  speakWithBrowserSpeechSynthesis,
  stopBrowserSpeechSynthesis,
  isBrowserSpeechSynthesisSupported,
} from '../utils/tiktokVideoGenerator';
import {
  DAILY_YOUTUBE_STUDIO_LIMIT,
  getDailyQuota,
  consumeDailyQuota,
  resetDailyQuota,
  DailyQuotaState,
} from '../utils/youtubeStudioQuota';
import {
  generateYouTubePromotionalVideo,
  YouTubeAdPlan,
  YouTubeVideoGenerationSuccess,
} from '../utils/youtubeVideoApi';
import { YouTubeShortsLogo } from './YouTubeLogo';
import { YouTubeShortsModal } from './YouTubeShortsModal';

interface YouTubeVideoStudioProps {
  initialProductId?: string;
}

export const YouTubeVideoStudio: React.FC<YouTubeVideoStudioProps> = ({ initialProductId }) => {
  const { products, language, addToast } = useStore();
  const isKa = language === 'ka';

  // 1. Quota State
  const [quota, setQuota] = useState<DailyQuotaState>(getDailyQuota);

  const refreshQuota = () => {
    setQuota(getDailyQuota());
  };

  const remainingQuota = Math.max(0, quota.maxDaily - quota.usedToday);

  // 2. Product Selection (Read-Only)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (initialProductId) {
      return products.find((p) => p.id === initialProductId) || products[0] || null;
    }
    return products[0] || null;
  });

  // Keep selected product in sync if products reload
  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  // Selected Images for Ken Burns motion
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  useEffect(() => {
    if (selectedProduct) {
      const candidates = [selectedProduct.image, ...(selectedProduct.images || [])]
        .filter(Boolean)
        .slice(0, 6);
      setSelectedImages(candidates);
    } else {
      setSelectedImages([]);
    }
  }, [selectedProduct?.id]);

  // 3. Format & Settings
  const [aspectRatio, setAspectRatio] = useState<CommercialAspectRatio>('9:16');
  const [musicMood, setMusicMood] = useState<CommercialMusicMood>('upbeat_tech');
  const [enableVoiceover, setEnableVoiceover] = useState<boolean>(true);
  const [voiceTone, setVoiceTone] = useState<'friendly' | 'energetic' | 'calm_luxury'>('friendly');
  const [voiceAccent, setVoiceAccent] = useState<'us' | 'uk'>('us');
  const [customCta, setCustomCta] = useState<string>('');

  // 4. Generation Progress & Result
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PromoVideoGenerationProgress | null>(null);
  const [generationResult, setGenerationResult] = useState<YouTubeVideoGenerationSuccess | null>(null);
  const [activePlan, setActivePlan] = useState<YouTubeAdPlan | null>(null);

  // 5. Preview & YouTube Upload Modal
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<'title' | 'desc' | 'tags' | null>(null);
  const [isPlayingVoiceoverPreview, setIsPlayingVoiceoverPreview] = useState(false);

  // Filter products for selector
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Copy helper
  const handleCopy = async (text: string, field: 'title' | 'desc' | 'tags') => {
    if (!text) return;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedField(field);
      addToast(isKa ? 'დაკოპირდა ბუფერში!' : 'Copied to clipboard!', 'success');
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      addToast(isKa ? 'კოპირების შეცდომა' : 'Failed to copy', 'error');
    }
  };

  // Preview Voiceover Narration via Web SpeechSynthesis
  const handlePreviewVoiceover = () => {
    if (isPlayingVoiceoverPreview) {
      stopBrowserSpeechSynthesis();
      setIsPlayingVoiceoverPreview(false);
      return;
    }
    const script = activePlan?.fullVoiceoverScript || selectedProduct?.title;
    if (!script) return;

    setIsPlayingVoiceoverPreview(true);
    speakWithBrowserSpeechSynthesis({
      script,
      voiceTone,
      accent: voiceAccent,
      onEnd: () => setIsPlayingVoiceoverPreview(false),
      onError: () => setIsPlayingVoiceoverPreview(false),
    });
  };

  // Main Action: Generate Video
  const handleGenerateVideo = async () => {
    if (!selectedProduct) {
      addToast(isKa ? 'გთხოვთ აირჩიოთ პროდუქტი' : 'Please select a product first', 'error');
      return;
    }

    if (selectedImages.length === 0) {
      addToast(
        isKa ? 'პროდუქტს უნდა ჰქონდეს მინიმუმ 1 ფოტო' : 'At least one product photo is required',
        'warning'
      );
      return;
    }

    // Free-tier rate & quota check
    const quotaCheck = consumeDailyQuota();
    if (!quotaCheck.allowed) {
      addToast(
        isKa
          ? 'დღიური უფასო ლიმიტი ამოიწურა (5/5). განახლდება ხვალ.'
          : 'Daily Free-Tier quota reached (5/5). Protects Gemini API limits until tomorrow.',
        'warning'
      );
      refreshQuota();
      return;
    }

    refreshQuota();
    setIsGenerating(true);
    setProgress({
      stage: 'planning',
      progressPct: 5,
      message: 'Contacting Gemini 2.5 Pro Free Tier...',
      detail: 'Analyzing product specs & creating 4-scene ad plan',
    });

    try {
      const success = await generateYouTubePromotionalVideo({
        product: selectedProduct,
        selectedImages,
        aspectRatio,
        musicMood,
        enableVoiceover,
        voiceTone,
        voiceAccent,
        customCta: customCta.trim() || undefined,
        onProgress: (p) => {
          setProgress(p);
        },
      });

      setGenerationResult(success);
      setActivePlan(success.plan);
      addToast(
        isKa
          ? `ვიდეო წარმატებით შეიქმნა (${success.result.durationSec}s ${success.aspectRatio})!`
          : `YouTube Ad Video ready (${success.result.durationSec}s ${success.aspectRatio})!`,
        'success'
      );

      // Scroll video into view smoothly
      setTimeout(() => {
        videoPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    } catch (err: any) {
      console.error('[YOUTUBE-STUDIO] Generation failed:', err);
      addToast(
        err?.message || (isKa ? 'ვიდეოს გენერირების შეცდომა' : 'Failed to generate promotional video'),
        'error'
      );
    } finally {
      setIsGenerating(false);
      refreshQuota();
    }
  };

  // Manual reset for admin testing
  const handleResetQuota = () => {
    resetDailyQuota();
    refreshQuota();
    addToast(
      isKa ? 'დღიური კვოტა განულდა (5/5 ხელმისაწვდომია)' : 'Daily quota reset (5/5 free generations available)',
      'info'
    );
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Header Banner & Free-Tier Quota Badge */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/40">
              <Film className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>YouTube Video Studio</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    Free AI Commercials
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Generate high-converting 15–20s YouTube promotional ads using Gemini 2.5 Pro scriptwriting,
                cinematic Ken Burns camera motion, dark glassmorphism price tags, and in-browser Canvas
                rendering with zero server video costs.
              </p>
            </div>
          </div>

          {/* Quota Badge & Protection Status */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div
              className={`p-3 rounded-xl border flex items-center space-x-3 transition-colors ${
                remainingQuota >= 3
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : remainingQuota > 0
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              <div className="relative">
                <ShieldCheck
                  className={`w-5 h-5 ${
                    remainingQuota > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
                <span
                  className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    remainingQuota > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black">
                    {remainingQuota} / {quota.maxDaily} Free Generations Left
                  </span>
                </div>
                <div className="text-[10px] opacity-75 font-medium">
                  {remainingQuota === 0
                    ? 'Limit reached · Resets at midnight'
                    : 'Strict Free-Tier quota protection active'}
                </div>
              </div>
            </div>

            {/* Admin Reset Quota Trigger */}
            <button
              onClick={handleResetQuota}
              title="Reset daily quota (Admin Testing)"
              className="px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset Quota</span>
            </button>
          </div>
        </div>

        {/* Quota progress bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            <span>
              Engine: <strong className="text-white">Gemini 2.5 Pro</strong> (with auto-fallback to{' '}
              <strong className="text-white">Gemini 2.5 Flash</strong> on 429)
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Daily Usage:
            </span>
            <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  remainingQuota === 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (quota.usedToday / quota.maxDaily) * 100)}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-300 font-bold">
              {quota.usedToday}/{quota.maxDaily}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Grid (Controls + Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Picker, Format & Generation Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Select Product from Catalog (Read-Only) */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Select Product from Catalog (Read-Only)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {products.length} products available
              </span>
            </div>

            {/* Search & Category Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories ({products.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({products.filter((p) => p.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Product Selection Carousel / List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-800/80 rounded-xl p-1.5 bg-slate-950/60 scrollbar-thin">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No matching products found.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const candidateImagesCount = [p.image, ...(p.images || [])].filter(Boolean).length;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`w-full text-left p-2 rounded-xl transition flex items-center space-x-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                          : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700/60 flex items-center justify-center">
                        {p.image ? (
                          <CachedImage
                            src={p.image}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{p.title}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="text-emerald-400 font-bold">${Number(p.price).toFixed(2)}</span>
                          <span>•</span>
                          <span className="truncate">{p.category || 'Featured'}</span>
                          <span>•</span>
                          <span>{candidateImagesCount} photos</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Selected Product Spotlight Card */}
            {selectedProduct && (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                      <CachedImage
                        src={selectedProduct.image}
                        alt={selectedProduct.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white leading-tight">
                        {selectedProduct.title}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] mt-1">
                        <span className="font-extrabold text-emerald-400 text-sm">
                          ${Number(selectedProduct.price).toFixed(2)}
                        </span>
                        {Number(selectedProduct.origPrice) > Number(selectedProduct.price) && (
                          <span className="line-through text-slate-500 text-xs">
                            ${Number(selectedProduct.origPrice).toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          {selectedProduct.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    ID: {selectedProduct.id.slice(0, 10)}
                  </span>
                </div>

                {/* Product Photos to Animate (Ken Burns) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="font-semibold">
                      Photos Used in Commercial Motion ({selectedImages.length} selected):
                    </span>
                    <button
                      onClick={() => {
                        const all = [
                          selectedProduct.image,
                          ...(selectedProduct.images || []),
                        ].filter(Boolean);
                        setSelectedImages(all);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-[10px] font-bold cursor-pointer"
                    >
                      Select All
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[selectedProduct.image, ...(selectedProduct.images || [])]
                      .filter(Boolean)
                      .slice(0, 6)
                      .map((imgUrl, i) => {
                        const isChecked = selectedImages.includes(imgUrl);
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (isChecked) {
                                if (selectedImages.length > 1) {
                                  setSelectedImages(selectedImages.filter((u) => u !== imgUrl));
                                } else {
                                  addToast(
                                    isKa
                                      ? 'მინიმუმ 1 ფოტო აუცილებელია'
                                      : 'At least 1 photo is required',
                                    'info'
                                  );
                                }
                              } else {
                                setSelectedImages([...selectedImages, imgUrl]);
                              }
                            }}
                            className={`relative w-12 h-12 rounded-lg border-2 overflow-hidden transition cursor-pointer ${
                              isChecked
                                ? 'border-blue-500 ring-2 ring-blue-500/20'
                                : 'border-slate-800 opacity-40 hover:opacity-80'
                            }`}
                          >
                            <CachedImage
                              src={imgUrl}
                              alt={`Photo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isChecked && (
                              <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Choose Video Format */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30">
                2
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Choose Video Format
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: YouTube Shorts (9:16) */}
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                  aspectRatio === '9:16'
                    ? 'bg-red-950/20 border-red-500 text-white shadow-lg shadow-red-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                    Recommended
                  </span>
                </div>
                <div className="text-sm font-black text-white">YouTube Shorts</div>
                <div className="text-xs font-mono text-red-400 font-bold mt-0.5">
                  9:16 (1080 × 1920)
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Vertical format optimized for YouTube Shorts, Instagram Reels, and mobile discovery.
                </p>
                {aspectRatio === '9:16' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>

              {/* Option 2: Standard YouTube (16:9) */}
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`p-4 rounded-xl border text-left transition cursor-pointer relative ${
                  aspectRatio === '16:9'
                    ? 'bg-blue-950/20 border-blue-500 text-white shadow-lg shadow-blue-950/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Widescreen
                  </span>
                </div>
                <div className="text-sm font-black text-white">Standard YouTube</div>
                <div className="text-xs font-mono text-blue-400 font-bold mt-0.5">
                  16:9 (1920 × 1080)
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                  Horizontal commercial ad optimized for YouTube channel uploads, desktop, and TV feeds.
                </p>
                {aspectRatio === '16:9' && (
                  <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* STEP 3: Audio & Narration Options */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30">
                3
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Soundtrack & Narration Settings
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Soundtrack Mood */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-400" />
                  <span>Synthesized Studio Soundtrack</span>
                </label>
                <select
                  value={musicMood}
                  onChange={(e) => setMusicMood(e.target.value as CommercialMusicMood)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="upbeat_tech">Upbeat Tech (Modern & Punchy)</option>
                  <option value="modern_corporate">Modern Corporate (Polished & Clean)</option>
                  <option value="chill_lofi">Chill Lo-Fi (Warm Studio)</option>
                  <option value="luxury_ambient">Luxury Ambient (Flagship Elegance)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  100% royalty-free Web Audio synthesizer (zero audio loading latency).
                </p>
              </div>

              {/* Voiceover Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-purple-400" />
                    <span>AI Voiceover Narration</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enableVoiceover}
                    onChange={(e) => setEnableVoiceover(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                {enableVoiceover ? (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={voiceTone}
                      onChange={(e) => setVoiceTone(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="friendly">Friendly Voice</option>
                      <option value="energetic">Energetic Voice</option>
                      <option value="calm_luxury">Luxury Voice</option>
                    </select>

                    <select
                      value={voiceAccent}
                      onChange={(e) => setVoiceAccent(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      <option value="us">US English</option>
                      <option value="uk">UK English</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-500 italic">
                    Music only mode with synced on-screen typography captions.
                  </div>
                )}
              </div>
            </div>

            {/* Custom CTA / Price banner override */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Closing Price & Call-to-Action Text (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Leave empty for default price tag
                </span>
              </label>
              <input
                type="text"
                value={customCta}
                onChange={(e) => setCustomCta(e.target.value)}
                placeholder={`Only $${Number(selectedProduct?.price || 0).toFixed(2)} • Shop Now at DBUY`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* STEP 4: Primary Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateVideo}
              disabled={isGenerating || remainingQuota === 0 || !selectedProduct}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-xl cursor-pointer ${
                isGenerating
                  ? 'bg-blue-600/50 text-white cursor-wait'
                  : remainingQuota === 0
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-950/50 hover:shadow-red-600/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progress?.message || 'Rendering YouTube Commercial...'}</span>
                </>
              ) : remainingQuota === 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Daily Free Quota Reached (0/5 Left)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>Generate Ad Video ({remainingQuota} Free Left Today)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Live Progress Bar during generation */}
            {isGenerating && progress && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span>{progress.message}</span>
                  </span>
                  <span className="font-mono text-blue-400 font-bold">
                    {progress.progressPct}%
                  </span>
                </div>

                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-red-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress.progressPct}%` }}
                  />
                </div>

                {progress.detail && (
                  <div className="text-[11px] text-slate-400 font-medium">
                    {progress.detail}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Video Preview Player, Download & YouTube Metadata (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Video Preview Player Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Live Video Preview
                </h3>
              </div>
              {generationResult && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  READY · {generationResult.result.durationSec}s
                </span>
              )}
            </div>

            {/* Video Container matching aspect ratio */}
            <div
              className={`relative mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center transition-all ${
                aspectRatio === '9:16'
                  ? 'w-full max-w-[280px] aspect-[9/16]'
                  : 'w-full aspect-[16/9]'
              }`}
            >
              {generationResult ? (
                <video
                  ref={videoPlayerRef}
                  src={generationResult.videoUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                    <Play className="w-6 h-6 text-slate-600 ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-300">
                      No Commercial Rendered Yet
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto">
                      Select a product and click &quot;Generate Ad Video&quot; to build a 15–20s animated
                      commercial.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Button & File Info */}
            {generationResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Format:</span>{' '}
                    <strong className="text-white">
                      {generationResult.aspectRatio} (
                      {generationResult.aspectRatio === '9:16' ? '1080×1920' : '1920×1080'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Duration:</span>{' '}
                    <strong className="text-white">{generationResult.result.durationSec}s</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">File Size:</span>{' '}
                    <strong className="text-white">
                      {(generationResult.result.file.size / (1024 * 1024)).toFixed(2)} MB
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Script AI:</span>{' '}
                    <strong className="text-emerald-400">
                      {activePlan?.modelUsed === 'gemini-2.5-pro'
                        ? 'Gemini 2.5 Pro'
                        : activePlan?.modelUsed === 'gemini-2.5-flash'
                        ? 'Gemini 2.5 Flash'
                        : 'Free Engine'}
                    </strong>
                  </div>
                </div>

                {/* Primary Download Button */}
                <a
                  href={generationResult.videoUrl}
                  download={generationResult.result.file.name}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video ({generationResult.result.file.name.slice(-15)})</span>
                </a>

                {/* Direct Upload to YouTube Shorts Modal */}
                <button
                  type="button"
                  onClick={() => setIsYouTubeModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition border border-slate-700 cursor-pointer"
                >
                  <YouTubeShortsLogo className="w-4 h-4 text-red-500" />
                  <span>Upload to YouTube Shorts / Channel</span>
                </button>
              </div>
            )}
          </div>

          {/* AI 4-Scene Storyboard Breakdown */}
          {activePlan && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>4-Scene Storyboard</span>
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Total: {activePlan.estimatedDurationSec}s
                </span>
              </div>

              <div className="space-y-2">
                {activePlan.scenes.map((scene, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-blue-400 text-[11px]">
                        Scene {scene.sceneNumber}: {scene.roleLabel}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {scene.durationSec}s · {scene.cameraMotion.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="font-extrabold text-white text-xs">{scene.headline}</div>
                    <div className="text-[11px] text-slate-400">{scene.subheadline}</div>
                    {scene.voiceoverLine && (
                      <div className="text-[10px] text-slate-500 italic flex items-center gap-1 mt-1">
                        <Mic className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                        <span>&quot;{scene.voiceoverLine}&quot;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Voiceover preview audio button */}
              {isBrowserSpeechSynthesisSupported() && (
                <button
                  type="button"
                  onClick={handlePreviewVoiceover}
                  className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {isPlayingVoiceoverPreview ? 'Stop Voice Narration' : 'Listen to Spoken Voiceover'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* YouTube SEO Copy Hub (Title, Description, Tags) */}
          {activePlan && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-red-400" />
                <span>YouTube Upload Metadata</span>
              </h4>

              {/* Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold">Suggested Title:</span>
                  <button
                    onClick={() => handleCopy(activePlan.youtubeTitle, 'title')}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                  >
                    {copiedField === 'title' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Title</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-white font-medium">
                  {activePlan.youtubeTitle}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold">Description & Store Link:</span>
                  <button
                    onClick={() => handleCopy(activePlan.youtubeDescription, 'desc')}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                  >
                    {copiedField === 'desc' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Description</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={3}
                  value={activePlan.youtubeDescription}
                  className="w-full p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono resize-none focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold">Hashtags & Tags:</span>
                  <button
                    onClick={() =>
                      handleCopy(activePlan.youtubeTags.map((t) => `#${t}`).join(' '), 'tags')
                    }
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                  >
                    {copiedField === 'tags' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Tags</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activePlan.youtubeTags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. YouTube Shorts Direct Upload Modal Integration */}
      {isYouTubeModalOpen && selectedProduct && (
        <YouTubeShortsModal
          isOpen={isYouTubeModalOpen}
          product={selectedProduct}
          onClose={() => setIsYouTubeModalOpen(false)}
          isKa={isKa}
        />
      )}
    </div>
  );
};
