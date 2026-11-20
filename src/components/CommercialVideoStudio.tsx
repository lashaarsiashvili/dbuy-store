import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Film,
  Loader2,
  Mic,
  Monitor,
  Music,
  Palette,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Volume2,
  Wand2,
} from 'lucide-react';
import { Product } from '../types';
import {
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  CommercialAspectRatio,
  CommercialMusicMood,
  CommercialScenePlan,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceAccent,
  CommercialVoiceoverResult,
  CommercialVoiceTone,
  ENFORCED_NEGATIVE_PROMPT,
  GeneratedActionVideoClip,
  generateCommercialVoiceover,
  generateReferenceGuidedActionVideo,
  generateTikTokPromoVideo,
  MANDATORY_STYLE_MODIFIERS,
  planCommercialVideoAd,
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  sanitizeCommercialCopy,
} from '../utils/tiktokVideoGenerator';
import {
  buildCombinedActionVideoPrompt,
  buildProductBoundInitialScript,
  countWords,
} from '../utils/videoPromptOptimizer';

interface CommercialVideoStudioProps {
  product: Product;
  images: string[];
  accentTheme?: 'cyan' | 'red';
  defaultAspectRatio?: CommercialAspectRatio;
  isKa?: boolean;
  onVideoGenerated: (result: PromoVideoGenerationResult) => void;
  onError?: (message: string) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CommercialVideoStudio: React.FC<CommercialVideoStudioProps> = ({
  product,
  images,
  accentTheme = 'cyan',
  defaultAspectRatio = '9:16',
  isKa = false,
  onVideoGenerated,
  onError,
  onToast,
}) => {
  const isRed = accentTheme === 'red';

  const normalizedDefaultRatio: CommercialAspectRatio =
    defaultAspectRatio === '16:9' ? '16:9' : '9:16';

  // Selected product reference photos (fed to Omni Flash video generator)
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Stage 4 Admin Controls
  const [aspectRatio, setAspectRatio] = useState<CommercialAspectRatio>(normalizedDefaultRatio);
  const [visualTheme, setVisualTheme] = useState<CommercialVisualTheme>('minimalist_studio');
  const [voiceTone, setVoiceTone] = useState<CommercialVoiceTone>('energetic');
  const [voiceAccent, setVoiceAccent] = useState<CommercialVoiceAccent>('us');
  const [musicMood, setMusicMood] = useState<CommercialMusicMood>('upbeat_tech');
  const [enableVoiceover, setEnableVoiceover] = useState<boolean>(true);
  const [priceBanner, setPriceBanner] = useState<string>('');
  const [includeWebLink, setIncludeWebLink] = useState<boolean>(true);

  // Stage 1 & 2 Product-Bound Script + Practical In-Use Scene Plan
  const [plan, setPlan] = useState<CommercialVideoPlan | null>(null);
  const [scenes, setScenes] = useState<CommercialScenePlan[]>([]);
  const [voiceoverScript, setVoiceoverScript] = useState<string>('');
  const [customActionPrompt, setCustomActionPrompt] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [showSceneInspector, setShowSceneInspector] = useState<boolean>(false);
  const planRequestIdRef = useRef<number>(0);

  // Stage 2B Reference-Guided AI Live-Action Video Cache
  const [aiVideoCache, setAiVideoCache] = useState<{
    key: string;
    clip: GeneratedActionVideoClip;
    previewUrl: string;
  } | null>(null);
  const [isGeneratingActionVideo, setIsGeneratingActionVideo] = useState<boolean>(false);

  // Stage 3 Voiceover Preview Cache
  const [voiceoverCache, setVoiceoverCache] = useState<{
    key: string;
    result: CommercialVoiceoverResult;
    previewUrl: string;
  } | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<boolean>(false);

  // Final Render State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<PromoVideoGenerationProgress | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Keep latest settings ref for product-open auto-planning without re-triggering on every dropdown tweak
  const latestPrefsRef = useRef<{
    visualTheme: CommercialVisualTheme;
    aspectRatio: CommercialAspectRatio;
    voiceTone: CommercialVoiceTone;
    musicMood: CommercialMusicMood;
  }>({
    visualTheme,
    aspectRatio: normalizedDefaultRatio,
    voiceTone,
    musicMood,
  });
  latestPrefsRef.current = { visualTheme, aspectRatio, voiceTone, musicMood };

  // Initialize exact product context & auto-plan 4 practical in-use scenes whenever product changes
  useEffect(() => {
    setSelectedImages(images.slice(0, 6));
    setAspectRatio(normalizedDefaultRatio);
    setPlan(null);
    setScenes([]);
    setCustomActionPrompt('');
    setLocalError(null);
    setRenderProgress(null);

    const formattedPrice =
      Number(product.price) > 0
        ? `Only $${(Math.round(Number(product.price) * 100) / 100).toFixed(
            Number.isInteger(Number(product.price)) ? 0 : 2
          )}`
        : '';
    setPriceBanner(formattedPrice);

    // Immediate zero-filler product-bound initial script (overwritten once AI plan returns)
    setVoiceoverScript(buildProductBoundInitialScript(product));

    const reqId = ++planRequestIdRef.current;
    let cancelled = false;
    setIsPlanning(true);

    const prefs = latestPrefsRef.current;
    planCommercialVideoAd({
      product,
      visualTheme: prefs.visualTheme,
      aspectRatio: normalizedDefaultRatio,
      voiceTone: prefs.voiceTone,
      musicMood: prefs.musicMood,
    })
      .then((nextPlan) => {
        if (cancelled || planRequestIdRef.current !== reqId) return;
        setPlan(nextPlan);
        setScenes(nextPlan.scenes);
        setVoiceoverScript(nextPlan.fullVoiceoverScript);
        setCustomActionPrompt(nextPlan.combinedActionPrompt);
      })
      .catch((err: any) => {
        if (cancelled || planRequestIdRef.current !== reqId) return;
        console.warn('[CommercialVideoStudio] Auto-plan failed:', err?.message || err);
      })
      .finally(() => {
        if (!cancelled && planRequestIdRef.current === reqId) {
          setIsPlanning(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [product.id, images.join('|'), normalizedDefaultRatio]);

  // Revoke audio blob URL on cache update/unmount
  useEffect(() => {
    return () => {
      if (voiceoverCache?.previewUrl) {
        URL.revokeObjectURL(voiceoverCache.previewUrl);
      }
    };
  }, [voiceoverCache]);

  // Revoke AI action video blob URL on cache update/unmount
  useEffect(() => {
    return () => {
      if (aiVideoCache?.previewUrl) {
        URL.revokeObjectURL(aiVideoCache.previewUrl);
      }
    };
  }, [aiVideoCache]);

  const currentVoiceCacheKey = useMemo(() => {
    return `${product.id}::${sanitizeCommercialCopy(voiceoverScript)}::${voiceTone}::${voiceAccent}`;
  }, [product.id, voiceoverScript, voiceTone, voiceAccent]);

  const activeVoiceoverPreviewUrl =
    voiceoverCache && voiceoverCache.key === currentVoiceCacheKey
      ? voiceoverCache.previewUrl
      : '';

  const effectiveActionPrompt = useMemo(() => {
    if (customActionPrompt.trim().length > 40) {
      return customActionPrompt.trim();
    }
    return buildCombinedActionVideoPrompt({
      product: {
        title: product.title,
        description: product.description,
        features: product.features,
        category: product.category,
      },
      scenes,
      visualTheme,
      aspectRatio,
    });
  }, [customActionPrompt, product, scenes, visualTheme, aspectRatio]);

  const currentVideoCacheKey = useMemo(() => {
    const refsKey = selectedImages.slice(0, 4).join('|');
    return `${product.id}::${aspectRatio}::${visualTheme}::${refsKey}::${effectiveActionPrompt}`;
  }, [product.id, aspectRatio, visualTheme, selectedImages, effectiveActionPrompt]);

  const activeAiVideoClip =
    aiVideoCache && aiVideoCache.key === currentVideoCacheKey
      ? aiVideoCache.clip
      : null;

  const activeAiVideoPreviewUrl =
    aiVideoCache && aiVideoCache.key === currentVideoCacheKey
      ? aiVideoCache.previewUrl
      : '';

  const wordCount = useMemo(() => countWords(voiceoverScript), [voiceoverScript]);
  const estimatedSpeechSec = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.round((wordCount / 2.75) * 10) / 10;
  }, [wordCount]);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) {
        if (prev.length <= 1) {
          onToast?.(
            isKa
              ? 'მინიმუმ 1 ფოტო აუცილებელია ვიდეოსთვის.'
              : 'Keep at least 1 product image selected.',
            'warning'
          );
          return prev;
        }
        return prev.filter((item) => item !== url);
      }
      return [...prev, url];
    });
  };

  // Stage 1 & 2: Generate Structured Product-Bound Script + Practical In-Use Scene Plan
  const handleGeneratePlan = async () => {
    if (isPlanning || isRendering) return;
    const reqId = ++planRequestIdRef.current;
    setIsPlanning(true);
    setLocalError(null);
    try {
      const nextPlan = await planCommercialVideoAd({
        product,
        visualTheme,
        aspectRatio,
        voiceTone,
        musicMood,
      });
      if (planRequestIdRef.current !== reqId) return;
      setPlan(nextPlan);
      setScenes(nextPlan.scenes);
      setVoiceoverScript(nextPlan.fullVoiceoverScript);
      setCustomActionPrompt(nextPlan.combinedActionPrompt);
      setShowSceneInspector(true);
      onToast?.('Product-bound script & hands-on 4-scene action plan generated.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate AI commercial script plan.';
      setLocalError(msg);
      onError?.(msg);
      onToast?.(msg, 'error');
    } finally {
      if (planRequestIdRef.current === reqId) {
        setIsPlanning(false);
      }
    }
  };

  // Stage 2B: Generate or Reuse Reference-Guided Live-Action AI Video Clip
  const ensureActionVideoClip = async (forceRegenerate = false): Promise<GeneratedActionVideoClip> => {
    const chosenImages = selectedImages.length > 0 ? selectedImages : images.slice(0, 4);
    if (chosenImages.length === 0) {
      throw new Error('No product reference images selected for AI video generation.');
    }

    if (!forceRegenerate && activeAiVideoClip) {
      return activeAiVideoClip;
    }

    const clip = await generateReferenceGuidedActionVideo(
      {
        product,
        referenceImages: chosenImages,
        scenes,
        combinedActionPrompt: effectiveActionPrompt,
        visualTheme,
        aspectRatio,
      },
      (progress) => {
        setRenderProgress(progress);
      }
    );

    const previewUrl = URL.createObjectURL(clip.blob);

    setAiVideoCache({
      key: currentVideoCacheKey,
      clip,
      previewUrl,
    });

    return clip;
  };

  const handleGenerateActionFootageOnly = async (forceRegenerate = false) => {
    if (isGeneratingActionVideo || isRendering || isPlanning) return;
    setIsGeneratingActionVideo(true);
    setLocalError(null);
    try {
      await ensureActionVideoClip(forceRegenerate);
      onToast?.('Live-action product usage footage ready! Click Render MP4 to mix voiceover & captions.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate live-action product video.';
      setLocalError(msg);
      setRenderProgress({
        stage: 'error',
        progressPct: 0,
        message: msg,
      });
      onError?.(msg);
      onToast?.(msg, 'error');
    } finally {
      setIsGeneratingActionVideo(false);
    }
  };

  // Stage 3: Synthesize Studio English Voiceover (cached for reuse during final render)
  const ensureVoiceoverAudio = async (): Promise<CommercialVoiceoverResult | null> => {
    const cleaned = sanitizeCommercialCopy(voiceoverScript);
    if (!enableVoiceover || countWords(cleaned) < 3) {
      return null;
    }
    if (voiceoverCache && voiceoverCache.key === currentVoiceCacheKey) {
      return voiceoverCache.result;
    }

    const result = await generateCommercialVoiceover({
      script: cleaned,
      voiceTone,
      accent: voiceAccent,
    });

    const binary = atob(result.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: result.mimeType || 'audio/wav' });
    const previewUrl = URL.createObjectURL(audioBlob);

    setVoiceoverCache({
      key: currentVoiceCacheKey,
      result,
      previewUrl,
    });

    return result;
  };

  const handlePreviewVoiceover = async () => {
    if (isGeneratingVoice || isRendering) return;
    setIsGeneratingVoice(true);
    setLocalError(null);
    try {
      await ensureVoiceoverAudio();
      onToast?.('Studio English voiceover synthesized and ready to preview.', 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to synthesize English voiceover.';
      setLocalError(msg);
      onError?.(msg);
      onToast?.(msg, 'error');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const updateSceneField = (
    idx: number,
    field: 'headline' | 'subheadline' | 'visualPrompt',
    value: string
  ) => {
    setScenes((prev) => {
      const updated = prev.map((scene, i) => (i === idx ? { ...scene, [field]: value } : scene));
      if (field === 'visualPrompt') {
        setCustomActionPrompt(
          buildCombinedActionVideoPrompt({
            product: {
              title: product.title,
              description: product.description,
              features: product.features,
              category: product.category,
            },
            scenes: updated,
            visualTheme,
            aspectRatio,
          })
        );
      }
      return updated;
    });
  };

  // Final Render Pipeline: Product-Bound Voiceover TTS + Reference-Guided Live-Action Clip + Auto-Ducked Music -> H.264 MP4
  const handleRenderCommercial = async () => {
    if (isRendering || isGeneratingActionVideo) return;
    const chosenImages = selectedImages.length > 0 ? selectedImages : images.slice(0, 4);
    if (chosenImages.length === 0) {
      const msg = 'No product reference images available to generate the live-action video.';
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    setIsRendering(true);
    setLocalError(null);

    try {
      let voiceResult: CommercialVoiceoverResult | null = null;
      if (enableVoiceover && countWords(voiceoverScript) >= 3) {
        setRenderProgress({
          stage: 'voiceover',
          progressPct: 8,
          message: 'Synthesizing Product-Bound English Voiceover...',
          detail: `${voiceAccent.toUpperCase()} English · ${voiceTone.replace('_', ' ')} tone`,
        });
        voiceResult = await ensureVoiceoverAudio();
      }

      const clip = await ensureActionVideoClip(false);

      const result = await generateTikTokPromoVideo(
        {
          product,
          selectedImages: chosenImages,
          priceBanner,
          musicMood,
          visualTheme,
          aspectRatio,
          includeWebLinkOverlay: includeWebLink,
          isKa,
          scenes: scenes.length > 0 ? scenes : undefined,
          combinedActionPrompt: effectiveActionPrompt,
          generatedVideoBlob: clip.blob,
          generatedVideoMimeType: clip.mimeType,
          voiceoverAudioBase64: voiceResult?.audioBase64,
          voiceoverMimeType: voiceResult?.mimeType,
          voiceoverScript: sanitizeCommercialCopy(voiceoverScript),
        },
        (progress) => {
          setRenderProgress(progress);
        }
      );

      onVideoGenerated(result);
    } catch (err: any) {
      const msg = err?.message || 'Failed to render live-action commercial MP4 video.';
      setLocalError(msg);
      setRenderProgress({
        stage: 'error',
        progressPct: 0,
        message: msg,
      });
      onError?.(msg);
      onToast?.(msg, 'error');
    } finally {
      setIsRendering(false);
    }
  };

  const borderTone = isRed ? 'border-red-500/35' : 'border-cyan-500/35';
  const badgeTone = isRed
    ? 'bg-red-500/15 border-red-400/30 text-red-300'
    : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300';
  const activeRing = isRed ? 'border-red-500' : 'border-cyan-400';
  const activeCheckBg = isRed ? 'bg-red-500 text-white' : 'bg-cyan-500 text-slate-950';
  const activeTextAccent = isRed ? 'text-red-400' : 'text-cyan-400';
  const focusRing = isRed ? 'focus:ring-red-500' : 'focus:ring-cyan-500';
  const primaryBtnGradient = isRed
    ? 'bg-gradient-to-r from-[#FF0000] via-[#F97316] to-[#EF4444] text-white'
    : 'bg-gradient-to-r from-[#25F4EE] via-[#19B5FE] to-[#F97316] text-slate-950';
  const progressBarGradient = isRed
    ? 'bg-gradient-to-r from-[#FF0000] via-[#F97316] to-[#F59E0B]'
    : 'bg-gradient-to-r from-[#25F4EE] via-[#19B5FE] to-[#F97316]';

  return (
    <div className={`p-4 rounded-2xl bg-slate-950 border ${borderTone} text-slate-100 space-y-4 shadow-lg`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              isRed
                ? 'bg-red-500/20 border-red-400/40 text-red-400'
                : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
            }`}
          >
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-white">
              Commercial Video Ad Studio
            </h4>
            <p className="text-[11px] text-slate-400">
              Product-Bound Script · Reference-Guided Live-Action Usage · Auto-Ducked English Voiceover
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${badgeTone}`}>
            {aspectRatio} · {aspectRatio === '16:9' ? '1280×720' : '720×1280'} MP4
          </span>
        </div>
      </div>

      {/* Product Reference Images Selector Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200">
            Product Reference Images (Guided In-Use AI Video)
          </span>
          <span className={`text-[11px] font-bold tabular-nums ${activeTextAccent}`}>
            {selectedImages.length}/{images.length} selected (top 4 guide AI action)
          </span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {images.map((url, idx) => {
            const checkedIdx = selectedImages.indexOf(url);
            const isChecked = checkedIdx !== -1;
            return (
              <button
                key={`studio-img-${url}-${idx}`}
                type="button"
                onClick={() => toggleImage(url)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isChecked
                    ? `${activeRing} shadow-xs opacity-100 scale-[1.02]`
                    : 'border-slate-700 opacity-45 hover:opacity-80'
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                <span
                  className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                    isChecked
                      ? activeCheckBg
                      : 'bg-slate-900/80 text-slate-400 border border-slate-600'
                  }`}
                >
                  {isChecked ? <Check className="w-3 h-3 stroke-[3]" /> : ''}
                </span>
                {isChecked && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/85 text-[9px] font-black text-slate-100 tabular-nums">
                    {checkedIdx === 0 ? 'Hero' : `#${checkedIdx + 1}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage 4 Controls Row 1: Aspect Ratio & Visual Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            {aspectRatio === '9:16' ? (
              <Smartphone className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            ) : (
              <Monitor className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            )}
            <span>Aspect Ratio</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {COMMERCIAL_ASPECT_RATIO_OPTIONS.map((opt) => {
              const active = aspectRatio === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAspectRatio(opt.value)}
                  className={`py-2 px-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    active
                      ? isRed
                        ? 'bg-red-500/20 text-red-200 border border-red-400/50'
                        : 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {opt.value === '9:16' ? (
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Monitor className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-6 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Palette className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            <span>Visual Theme</span>
          </label>
          <select
            value={visualTheme}
            onChange={(e) => setVisualTheme(e.target.value as CommercialVisualTheme)}
            className={`w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:ring-2 ${focusRing} focus:outline-hidden`}
          >
            {COMMERCIAL_VISUAL_THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage 4 Controls Row 2: Voice Tone, Accent & Music Mood */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Mic className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            <span>Voiceover Tone</span>
          </label>
          <select
            value={voiceTone}
            onChange={(e) => setVoiceTone(e.target.value as CommercialVoiceTone)}
            disabled={!enableVoiceover}
            className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:ring-2 ${focusRing} focus:outline-hidden disabled:opacity-45`}
          >
            {COMMERCIAL_VOICE_TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <span>Accent</span>
          </label>
          <select
            value={voiceAccent}
            onChange={(e) => setVoiceAccent(e.target.value as CommercialVoiceAccent)}
            disabled={!enableVoiceover}
            className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:ring-2 ${focusRing} focus:outline-hidden disabled:opacity-45`}
          >
            {COMMERCIAL_VOICE_ACCENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-5 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Music className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            <span>Background Music Mood</span>
          </label>
          <select
            value={musicMood}
            onChange={(e) => setMusicMood(e.target.value as CommercialMusicMood)}
            className={`w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:ring-2 ${focusRing} focus:outline-hidden`}
          >
            {COMMERCIAL_MUSIC_MOOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage 1 & 2: AI Script & Scene Planner + Editable Voiceover Script */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableVoiceover}
                onChange={(e) => setEnableVoiceover(e.target.checked)}
                className="rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
              />
              <span>English Studio Voiceover (Auto-Ducks Music to 15–20%)</span>
            </label>
          </div>
          <button
            type="button"
            disabled={isPlanning || isRendering || isGeneratingActionVideo}
            onClick={handleGeneratePlan}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
              isRed
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-200'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200'
            }`}
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Tailoring 4 In-Use Scenes...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>{plan ? 'Regenerate Product Script & Action Plan' : 'Generate AI Script & Action Plan'}</span>
              </>
            )}
          </button>
        </div>

        {isPlanning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300">
            <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${activeTextAccent}`} />
            <span className="truncate">
              Tailoring 4-scene script &amp; hands-on action plan for <strong className="text-white">{product.title}</strong>...
            </span>
          </div>
        )}

        {/* Editable English Voiceover Script Textarea */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">
              Product-Bound English Voiceover Script (Must name exact product)
            </span>
            <span
              className={`font-bold tabular-nums ${
                wordCount >= 35 && wordCount <= 65 ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {wordCount} words · ~{estimatedSpeechSec}s speech
            </span>
          </div>
          <textarea
            rows={3}
            value={voiceoverScript}
            onChange={(e) => setVoiceoverScript(e.target.value)}
            disabled={!enableVoiceover}
            placeholder="Generating exact product-bound English commercial voiceover script..."
            className={`w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs leading-relaxed focus:ring-2 ${focusRing} focus:outline-hidden resize-y disabled:opacity-45`}
          />
        </div>

        {/* Inline Voiceover Preview Controls */}
        {enableVoiceover && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isGeneratingVoice || isRendering || wordCount < 3}
              onClick={handlePreviewVoiceover}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGeneratingVoice ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Voiceover...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeVoiceoverPreviewUrl ? 'Voiceover Ready' : 'Preview English Voiceover'}</span>
                </>
              )}
            </button>
            {activeVoiceoverPreviewUrl && (
              <audio
                controls
                src={activeVoiceoverPreviewUrl}
                className="h-8 flex-1 min-w-[200px] max-w-full"
              />
            )}
          </div>
        )}

        {/* Collapsible Scene Breakdown & Stage 2 Visual Prompt Guardrails Inspector */}
        {scenes.length > 0 && (
          <div className="pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowSceneInspector((v) => !v)}
              className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  4-Scene Storyboard &amp; Visual Guardrails ({scenes.reduce((s, x) => s + x.durationSec, 0)}s plan)
                </span>
              </span>
              {showSceneInspector ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showSceneInspector && (
              <div className="mt-2 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {scenes.map((scene, idx) => (
                    <div
                      key={`scene-${scene.sceneNumber}`}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={activeTextAccent}>
                          Scene {scene.sceneNumber} · {scene.roleLabel}
                        </span>
                        <span className="text-slate-400 tabular-nums">{scene.durationSec}s</span>
                      </div>
                      <input
                        type="text"
                        value={scene.headline}
                        onChange={(e) => updateSceneField(idx, 'headline', e.target.value)}
                        placeholder="On-screen headline"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-bold focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={scene.subheadline}
                        onChange={(e) => updateSceneField(idx, 'subheadline', e.target.value)}
                        placeholder="On-screen subheadline"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] focus:outline-hidden"
                      />
                      <textarea
                        rows={2}
                        value={scene.visualPrompt}
                        onChange={(e) => updateSceneField(idx, 'visualPrompt', e.target.value)}
                        placeholder="Hands-on practical visual prompt"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[10px] leading-snug focus:outline-hidden resize-y"
                      />
                    </div>
                  ))}
                </div>

                {/* Combined Action Prompt Direction (editable before Omni Flash video generation) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
                    <span>Reference-Guided Live-Action Video Direction Prompt</span>
                    {customActionPrompt && (
                      <button
                        type="button"
                        onClick={() => setCustomActionPrompt('')}
                        className="text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={effectiveActionPrompt}
                    onChange={(e) => setCustomActionPrompt(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[10px] leading-relaxed focus:outline-hidden resize-y"
                  />
                </div>

                {/* Stage 2 Guardrail Summary */}
                <div className="p-2.5 rounded-lg bg-emerald-950/35 border border-emerald-500/25 text-[10px] text-emerald-200/90 space-y-1">
                  <div>
                    <strong className="text-emerald-300">Enforced Style Modifiers:</strong>{' '}
                    {MANDATORY_STYLE_MODIFIERS}
                  </div>
                  <div>
                    <strong className="text-emerald-300">Negative Prompt Guardrails:</strong>{' '}
                    {ENFORCED_NEGATIVE_PROMPT}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage 2B: Reference-Guided Live-Action AI Footage Cache & Preview */}
      <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clapperboard className={`w-4 h-4 ${activeTextAccent}`} />
            <div>
              <div className="text-xs font-bold text-white">
                Reference-Guided Live-Action Product Footage (No Slideshows)
              </div>
              <div className="text-[10px] text-slate-400">
                Shows realistic hands-on usage anchored to your product images. Cached once generated.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeAiVideoPreviewUrl ? (
              <button
                type="button"
                disabled={isGeneratingActionVideo || isRendering || isPlanning}
                onClick={() => handleGenerateActionFootageOnly(true)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingActionVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Regenerating Footage...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
                    <span>Regenerate Footage</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isGeneratingActionVideo || isRendering || isPlanning || selectedImages.length === 0}
                onClick={() => handleGenerateActionFootageOnly(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingActionVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating AI Action Clip...</span>
                  </>
                ) : (
                  <>
                    <Clapperboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Pre-Generate AI Footage</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {activeAiVideoPreviewUrl && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-950 border border-slate-800">
            <video
              controls
              muted
              playsInline
              src={activeAiVideoPreviewUrl}
              className="w-28 h-20 rounded-lg object-cover bg-black border border-slate-800 shrink-0"
            />
            <div className="text-[11px] space-y-1 min-w-0">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Raw AI In-Use Action Clip Cached ({aspectRatio})</span>
              </div>
              <p className="text-slate-400 leading-snug">
                Reuses this live-action clip automatically when compositing voiceover, music, or caption updates.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Price Banner & Web URL Footer Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 space-y-1">
          <label className="block text-[11px] font-bold text-slate-300">
            Closing Price Badge
          </label>
          <input
            type="text"
            value={priceBanner}
            onChange={(e) => setPriceBanner(e.target.value)}
            placeholder="Only $49.99"
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-300 font-bold text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>
        <div className="sm:col-span-7 sm:pt-4">
          <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeWebLink}
              onChange={(e) => setIncludeWebLink(e.target.checked)}
              className="mt-0.5 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="leading-snug">
              Include clean brand footer (<code className="text-slate-300">www.dbuystore.com</code>)
            </span>
          </label>
        </div>
      </div>

      {/* Inline Error Alert */}
      {localError && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
          {localError}
        </div>
      )}

      {/* Render Commercial MP4 CTA */}
      <button
        type="button"
        disabled={isRendering || isGeneratingActionVideo || isPlanning || selectedImages.length === 0}
        onClick={handleRenderCommercial}
        className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm ${primaryBtnGradient} hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50`}
      >
        {isRendering || isGeneratingActionVideo ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{renderProgress?.message || `Rendering ${aspectRatio} Live-Action Commercial MP4...`}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              Render {aspectRatio} Live-Action Commercial MP4
              {enableVoiceover ? ' (Voiceover + Auto-Ducking)' : ''}
            </span>
          </>
        )}
      </button>

      {/* Multi-Stage Progress Bar */}
      {(isRendering || isGeneratingActionVideo || (renderProgress && renderProgress.stage !== 'error')) && renderProgress && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={`flex items-center gap-2 ${isRed ? 'text-red-300' : 'text-cyan-300'}`}>
              {isRendering || isGeneratingActionVideo ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span>{renderProgress.message}</span>
            </span>
            <span className="text-amber-300 tabular-nums">{renderProgress.progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${progressBarGradient} transition-all duration-200`}
              style={{ width: `${Math.max(4, Math.min(100, renderProgress.progressPct))}%` }}
            />
          </div>
          {renderProgress.detail && (
            <div className="text-[11px] text-slate-400 truncate">{renderProgress.detail}</div>
          )}
        </div>
      )}
    </div>
  );
};
