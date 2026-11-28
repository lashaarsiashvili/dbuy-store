import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Film,
  Layers,
  Loader2,
  Mic,
  Monitor,
  Music,
  Palette,
  Sliders,
  Smartphone,
  Sparkles,
  Square,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';
import { Product } from '../types';
import {
  COMMERCIAL_ASPECT_RATIO_OPTIONS,
  COMMERCIAL_MOTION_STYLE_OPTIONS,
  COMMERCIAL_MUSIC_MOOD_OPTIONS,
  COMMERCIAL_RESOLUTION_OPTIONS,
  COMMERCIAL_VISUAL_THEME_OPTIONS,
  COMMERCIAL_VOICE_ACCENT_OPTIONS,
  COMMERCIAL_VOICE_TONE_OPTIONS,
  CommercialAspectRatio,
  CommercialMotionStyle,
  CommercialMusicMood,
  CommercialResolutionPreset,
  CommercialScenePlan,
  CommercialVideoPlan,
  CommercialVisualTheme,
  CommercialVoiceAccent,
  CommercialVoiceoverResult,
  CommercialVoiceTone,
  generateCommercialVoiceover,
  isBrowserSpeechSynthesisSupported,
  planCommercialVideoAd,
  PromoVideoGenerationProgress,
  PromoVideoGenerationResult,
  speakWithBrowserSpeechSynthesis,
  stopBrowserSpeechSynthesis,
} from '../utils/tiktokVideoGenerator';
import {
  buildDirectorFallbackScenes,
  buildProductBoundInitialScript,
  countWords,
  normalizeMotionStyle,
  sanitizeSpokenVoiceoverScript,
} from '../utils/videoPromptOptimizer';
import {
  consumeDailyAiVideoQuota,
  DailyAiVideoQuotaState,
  getDailyAiVideoQuota,
  getQuotaResetCountdownText,
  MAX_DAILY_AI_VIDEOS,
  refundDailyAiVideoQuota,
} from '../utils/aiVideoQuota';
import {
  DBUY_OUTRO_DURATION_SEC,
  prepareProductImagesForAi,
  renderProMotionCommercialVideo,
} from '../utils/motionGraphicsCompositor';

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

const MOTION_STYLE_BADGE_MAP: Record<CommercialMotionStyle, string> = {
  zoom_punch: 'Zoom-Punch',
  whip_pan: 'Whip-Pan',
  tilt_3d: '3D Tilt',
  light_sweep: 'Light Sweep',
  parallax_float: 'Parallax Float',
  dof_blur_whip: 'Depth Blur Whip',
};

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

  // Selected product photos (sequenced across 4 motion beats & analyzed by Gemini AI Director)
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Commercial Controls
  const [aspectRatio, setAspectRatio] = useState<CommercialAspectRatio>(normalizedDefaultRatio);
  const [resolution, setResolution] = useState<CommercialResolutionPreset>('1080p');
  const [visualTheme, setVisualTheme] = useState<CommercialVisualTheme>('minimalist_studio');
  const [voiceTone, setVoiceTone] = useState<CommercialVoiceTone>('friendly');
  const [voiceAccent, setVoiceAccent] = useState<CommercialVoiceAccent>('us');
  const [musicMood, setMusicMood] = useState<CommercialMusicMood>('upbeat_tech');
  const [enableVoiceover, setEnableVoiceover] = useState<boolean>(true);
  const [priceBanner, setPriceBanner] = useState<string>('');
  const [includeWebLink, setIncludeWebLink] = useState<boolean>(true);

  // Daily Free-Tier AI Director Quota (UTC-keyed localStorage counter — zero D1 writes)
  const [quota, setQuota] = useState<DailyAiVideoQuotaState>(() => getDailyAiVideoQuota());

  // Step A: Multimodal Gemini AI Director Plan (12s Script + Kinetic Callouts + Camera Motion Choreography)
  const [plan, setPlan] = useState<CommercialVideoPlan | null>(null);
  const [scenes, setScenes] = useState<CommercialScenePlan[]>([]);
  const [voiceoverScript, setVoiceoverScript] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [showSceneInspector, setShowSceneInspector] = useState<boolean>(false);
  const planRequestIdRef = useRef<number>(0);

  // Step C Audio Preview Cache (Gemini Free-Tier TTS + Browser SpeechSynthesis fallback)
  const [voiceoverCache, setVoiceoverCache] = useState<{
    key: string;
    result: CommercialVoiceoverResult;
    previewUrl: string;
  } | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<boolean>(false);
  const [isSpeakingBrowserVoice, setIsSpeakingBrowserVoice] = useState<boolean>(false);

  // Final 60fps Motion Engine Render State
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<PromoVideoGenerationProgress | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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

  // Keep daily UTC quota synchronized across tabs & midnight UTC resets
  useEffect(() => {
    const syncQuota = () => setQuota(getDailyAiVideoQuota());
    syncQuota();
    const interval = window.setInterval(syncQuota, 60_000);
    window.addEventListener('storage', syncQuota);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', syncQuota);
    };
  }, []);

  // Initialize product context & auto-run Free-Tier Gemini AI Director when product changes
  useEffect(() => {
    const initialSelected = images.slice(0, 6);
    setSelectedImages(initialSelected);
    setAspectRatio(normalizedDefaultRatio);
    setPlan(null);
    setLocalError(null);
    setRenderProgress(null);
    setQuota(getDailyAiVideoQuota());

    const formattedPrice =
      Number(product.price) > 0
        ? `Only $${(Math.round(Number(product.price) * 100) / 100).toFixed(
            Number.isInteger(Number(product.price)) ? 0 : 2
          )}`
        : '';
    setPriceBanner(formattedPrice);

    const prefs = latestPrefsRef.current;
    // Immediately populate crisp kinetic callouts & motion styles so user can see/edit them right away
    setScenes(buildDirectorFallbackScenes(product, prefs.visualTheme));
    setVoiceoverScript(buildProductBoundInitialScript(product));

    const reqId = ++planRequestIdRef.current;
    let cancelled = false;
    setIsPlanning(true);

    (async () => {
      try {
        const preparedImages = await prepareProductImagesForAi(initialSelected.slice(0, 4), {
          maxDim: 512,
          maxCount: 4,
          quality: 0.8,
        });
        if (cancelled || planRequestIdRef.current !== reqId) return;

        const nextPlan = await planCommercialVideoAd({
          product,
          productImages: preparedImages.length > 0 ? preparedImages : undefined,
          visualTheme: prefs.visualTheme,
          aspectRatio: normalizedDefaultRatio,
          voiceTone: prefs.voiceTone,
          musicMood: prefs.musicMood,
        });
        if (cancelled || planRequestIdRef.current !== reqId) return;

        setPlan(nextPlan);
        if (nextPlan.scenes.length > 0) {
          setScenes(nextPlan.scenes);
        }
        setVoiceoverScript(nextPlan.fullVoiceoverScript);
      } catch (err: any) {
        if (cancelled || planRequestIdRef.current !== reqId) return;
        console.warn('[CommercialVideoStudio] Auto-director fallback active:', err?.message || err);
      } finally {
        if (!cancelled && planRequestIdRef.current === reqId) {
          setIsPlanning(false);
        }
      }
    })();

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

  // Stop any browser speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopBrowserSpeechSynthesis();
    };
  }, []);

  const currentVoiceCacheKey = useMemo(() => {
    return `${product.id}::${sanitizeSpokenVoiceoverScript(voiceoverScript)}::${voiceTone}::${voiceAccent}`;
  }, [product.id, voiceoverScript, voiceTone, voiceAccent]);

  const activeVoiceoverPreviewUrl =
    voiceoverCache && voiceoverCache.key === currentVoiceCacheKey
      ? voiceoverCache.previewUrl
      : '';

  const wordCount = useMemo(() => countWords(voiceoverScript), [voiceoverScript]);
  const estimatedSpeechSec = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.round((wordCount / 2.65) * 10) / 10;
  }, [wordCount]);

  const isQuotaExhausted = quota.remaining <= 0;
  const resetCountdownText = useMemo(
    () => getQuotaResetCountdownText(),
    [quota.usedToday, quota.dateUtc]
  );

  const outputDimensionsLabel = useMemo(() => {
    if (aspectRatio === '16:9') {
      return resolution === '1080p' ? '1920×1080' : '1280×720';
    }
    return resolution === '1080p' ? '1080×1920' : '720×1280';
  }, [aspectRatio, resolution]);

  const heroImageUrl = selectedImages[0] || images[0] || '';

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

  // Step A: Run Free-Tier Multimodal Gemini AI Director (Photos + Product Copy -> 12s Script + Kinetic Callouts + Motion Choreography)
  const handleGeneratePlan = async () => {
    if (isPlanning || isRendering) return;
    const reqId = ++planRequestIdRef.current;
    setIsPlanning(true);
    setLocalError(null);
    try {
      const chosen = (selectedImages.length > 0 ? selectedImages : images).slice(0, 4);
      const preparedImages = await prepareProductImagesForAi(chosen, {
        maxDim: 512,
        maxCount: 4,
        quality: 0.8,
      });

      const nextPlan = await planCommercialVideoAd({
        product,
        productImages: preparedImages.length > 0 ? preparedImages : undefined,
        visualTheme,
        aspectRatio,
        voiceTone,
        musicMood,
      });
      if (planRequestIdRef.current !== reqId) return;

      setPlan(nextPlan);
      if (nextPlan.scenes.length > 0) {
        setScenes(nextPlan.scenes);
      }
      setVoiceoverScript(nextPlan.fullVoiceoverScript);
      setShowSceneInspector(true);
      onToast?.(
        'Gemini AI Director crafted a 12s Hook → Benefit → CTA script, kinetic callout badges & camera choreography.',
        'success'
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate AI Director commercial plan.';
      setLocalError(msg);
      onError?.(msg);
      onToast?.(msg, 'error');
    } finally {
      if (planRequestIdRef.current === reqId) {
        setIsPlanning(false);
      }
    }
  };

  // Synthesize English AI Voiceover (Free-Tier Gemini Studio TTS + Browser preview fallback)
  const ensureVoiceoverAudio = async (
    scriptOverride?: string
  ): Promise<CommercialVoiceoverResult | null> => {
    const rawScript = scriptOverride ?? voiceoverScript;
    const cleaned = sanitizeSpokenVoiceoverScript(rawScript);
    if (!enableVoiceover || countWords(cleaned) < 3) {
      return null;
    }

    const cacheKey = `${product.id}::${cleaned}::${voiceTone}::${voiceAccent}`;
    if (voiceoverCache && voiceoverCache.key === cacheKey) {
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
      key: cacheKey,
      result,
      previewUrl,
    });

    return result;
  };

  const handleBrowserVoiceToggle = () => {
    if (isSpeakingBrowserVoice) {
      stopBrowserSpeechSynthesis();
      setIsSpeakingBrowserVoice(false);
      return;
    }
    setIsSpeakingBrowserVoice(true);
    const ok = speakWithBrowserSpeechSynthesis({
      script: voiceoverScript,
      voiceTone,
      accent: voiceAccent,
      onEnd: () => setIsSpeakingBrowserVoice(false),
      onError: () => setIsSpeakingBrowserVoice(false),
    });
    if (!ok) {
      setIsSpeakingBrowserVoice(false);
      onToast?.('Browser SpeechSynthesis is unavailable in this browser.', 'warning');
    }
  };

  const handlePreviewVoiceover = async () => {
    if (isGeneratingVoice || isRendering) return;
    setIsGeneratingVoice(true);
    setLocalError(null);
    try {
      await ensureVoiceoverAudio();
      onToast?.('English studio voiceover ready to mix into 60fps MP4.', 'success');
    } catch {
      if (isBrowserSpeechSynthesisSupported()) {
        handleBrowserVoiceToggle();
        onToast?.('Playing voiceover preview via browser SpeechSynthesis.', 'info');
      } else {
        onToast?.(
          'Studio TTS unavailable right now — video will render with studio beat & word-by-word subtitles.',
          'warning'
        );
      }
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const updateSceneField = (
    idx: number,
    field: 'calloutBadge' | 'headline' | 'subheadline' | 'voiceoverLine',
    value: string
  ) => {
    setScenes((prev) =>
      prev.map((scene, i) => (i === idx ? { ...scene, [field]: value } : scene))
    );
  };

  const updateSceneMotionStyle = (idx: number, motionStyle: CommercialMotionStyle) => {
    setScenes((prev) =>
      prev.map((scene, i) =>
        i === idx
          ? {
              ...scene,
              motionStyle,
              cameraMotion: motionStyle,
            }
          : scene
      )
    );
  };

  // Full 100% Free-Tier Pipeline:
  // Step A: Gemini AI Director -> Step B: Studio Voiceover (17% Ducking) -> Step C: 60fps 2.5D/3D Motion Engine + 2.5s DBuy Outro
  const handleRenderCommercial = async () => {
    if (isRendering || isPlanning) return;

    const latestQuota = getDailyAiVideoQuota();
    setQuota(latestQuota);
    if (latestQuota.remaining <= 0) {
      const limitMsg = `Daily AI Director quota reached (0/${MAX_DAILY_AI_VIDEOS} remaining). ${getQuotaResetCountdownText()}.`;
      setLocalError(limitMsg);
      onError?.(limitMsg);
      onToast?.(limitMsg, 'warning');
      return;
    }

    const chosenImages = selectedImages.length > 0 ? selectedImages : images.slice(0, 6);
    if (chosenImages.length === 0) {
      const msg = 'Select at least 1 product photo to render your commercial video.';
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    const consumed = consumeDailyAiVideoQuota();
    setQuota(consumed.state);
    if (!consumed.allowed) {
      const limitMsg = `Daily AI Director quota reached (0/${MAX_DAILY_AI_VIDEOS} remaining). ${getQuotaResetCountdownText()}.`;
      setLocalError(limitMsg);
      onError?.(limitMsg);
      onToast?.(limitMsg, 'warning');
      return;
    }

    stopBrowserSpeechSynthesis();
    setIsSpeakingBrowserVoice(false);
    setIsRendering(true);
    setLocalError(null);

    let quotaConsumedForRun = true;

    try {
      let activePlan = plan;
      let activeScenes =
        scenes.length > 0 ? scenes : buildDirectorFallbackScenes(product, visualTheme);
      let activeScript = voiceoverScript;

      // Step A: Ensure Gemini AI Director plan exists
      if (!activePlan) {
        setRenderProgress({
          stage: 'planning',
          progressPct: 6,
          message: 'Step A · Gemini AI Director Crafting 12s Commercial...',
          detail: 'Analyzing photos for Hook → Benefit → CTA script, callout badges & camera moves',
        });

        try {
          const preparedImages = await prepareProductImagesForAi(chosenImages.slice(0, 4), {
            maxDim: 512,
            maxCount: 4,
            quality: 0.8,
          });

          activePlan = await planCommercialVideoAd({
            product,
            productImages: preparedImages.length > 0 ? preparedImages : undefined,
            visualTheme,
            aspectRatio,
            voiceTone,
            musicMood,
          });

          setPlan(activePlan);
          if (activePlan.scenes.length > 0) {
            activeScenes = activePlan.scenes;
            setScenes(activeScenes);
          }
          if (!activeScript.trim()) {
            activeScript = activePlan.fullVoiceoverScript;
            setVoiceoverScript(activeScript);
          }
        } catch (planErr: any) {
          console.warn(
            '[CommercialVideoStudio] Using local kinetic storyboard fallback:',
            planErr?.message || planErr
          );
        }
      }

      // Step B: Synthesize Free-Tier English AI Voiceover (graceful fallback to beat + word-by-word captions)
      let voiceResult: CommercialVoiceoverResult | null = null;
      if (enableVoiceover && countWords(activeScript) >= 3) {
        setRenderProgress({
          stage: 'voiceover',
          progressPct: 12,
          message: 'Synthesizing English Studio Voiceover...',
          detail: `${voiceAccent.toUpperCase()} English · ${voiceTone.replace('_', ' ')} tone · Auto-ducks beat to 17%`,
        });
        try {
          voiceResult = await ensureVoiceoverAudio(activeScript);
        } catch (ttsErr: any) {
          console.warn(
            '[CommercialVideoStudio] Studio TTS unavailable, rendering with beat & word-by-word subtitles:',
            ttsErr?.message || ttsErr
          );
          onToast?.(
            'Studio TTS busy — rendering 60fps commercial with studio beat & word-by-word subtitles.',
            'info'
          );
        }
      }

      // Step C: 60fps Pro Motion Graphics & 2.5D/3D Commercial Compositor + 2.5s Branded DBuy Outro
      const result = await renderProMotionCommercialVideo(
        {
          product,
          selectedImages: chosenImages,
          aspectRatio,
          resolution,
          visualTheme,
          musicMood,
          scenes: activeScenes,
          voiceoverScript: sanitizeSpokenVoiceoverScript(activeScript),
          voiceoverAudioBase64: voiceResult?.audioBase64,
          priceBanner,
          includeWebLinkOverlay: includeWebLink,
          accentColorHex: activePlan?.accentColorHex,
          modelUsed: activePlan?.modelUsed || 'gemini-2.5-flash',
        },
        (progress) => {
          setRenderProgress(progress);
        }
      );

      quotaConsumedForRun = false; // Success — keep quota deducted
      onVideoGenerated(result);
    } catch (err: any) {
      if (quotaConsumedForRun) {
        const refunded = refundDailyAiVideoQuota();
        setQuota(refunded);
      }
      const msg =
        err?.message ||
        '60fps Commercial rendering failed. Please try switching to 720p HD or retrying.';
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

  const quotaBadgeClasses = isQuotaExhausted
    ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
    : quota.remaining <= 1
    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
    : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200';

  return (
    <div
      className={`p-4 rounded-2xl bg-slate-950 border ${borderTone} text-slate-100 space-y-4 shadow-lg`}
    >
      {/* Header + Daily AI Director Quota Badge */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isRed
                ? 'bg-red-500/20 border-red-400/40 text-red-400'
                : 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
            }`}
          >
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white">
              AI Commercial Motion Director
            </h4>
            <p className="text-[11px] text-slate-400">
              Gemini AI Director + 60fps 2.5D/3D Motion Engine · Voiceover &amp;{' '}
              {DBUY_OUTRO_DURATION_SEC}s DBuy Outro
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            title={`${resetCountdownText} · Daily limit: ${MAX_DAILY_AI_VIDEOS} AI Director renders/UTC day`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-extrabold tabular-nums ${quotaBadgeClasses}`}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              Daily AI Director Quota: {quota.remaining}/{quota.maxDaily} remaining
            </span>
          </span>
          <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${badgeTone}`}>
            {aspectRatio} · {outputDimensionsLabel} · 60fps
          </span>
        </div>
      </div>

      {/* Product Photos Selector Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs gap-2">
          <span className="font-bold text-slate-200">
            Product Scene Photos (Animated across 4 Dynamic Beats &amp; Analyzed by Gemini)
          </span>
          <span className={`text-[11px] font-bold tabular-nums shrink-0 ${activeTextAccent}`}>
            {selectedImages.length}/{images.length} selected
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
                    {checkedIdx === 0 ? 'Hook #1' : `Shot #${checkedIdx + 1}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Row 1: Aspect Ratio, Output Resolution (1080p/720p 60fps), Visual Studio Style */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-4 space-y-1.5">
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
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    active
                      ? isRed
                        ? 'bg-red-500/20 text-red-200 border border-red-400/50'
                        : 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {opt.value === '9:16' ? (
                    <Smartphone className="w-3 h-3 shrink-0" />
                  ) : (
                    <Monitor className="w-3 h-3 shrink-0" />
                  )}
                  <span className="truncate">{opt.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-4 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Zap className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            <span>Quality (60fps)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {COMMERCIAL_RESOLUTION_OPTIONS.map((opt) => {
              const active = resolution === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setResolution(opt.value)}
                  title={opt.label}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                    active
                      ? isRed
                        ? 'bg-red-500/20 text-red-200 border border-red-400/50'
                        : 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span className="truncate">{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-4 space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
            <Palette className={`w-3.5 h-3.5 ${activeTextAccent}`} />
            <span>Studio Backdrop</span>
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

      {/* Controls Row 2: Voice Tone, Accent & Music Mood */}
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
            <span>Background Music Beat</span>
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

      {/* Step A: Multimodal Gemini AI Director (12s Script + Kinetic Callouts + Camera Motion Choreography) */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableVoiceover}
              onChange={(e) => setEnableVoiceover(e.target.checked)}
              className="rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
            />
            <span>Voiceover &amp; Word-by-Word Subtitles (Auto-Ducks Beat to 17%)</span>
          </label>
          <button
            type="button"
            disabled={isPlanning || isRendering}
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
                <span>Directing 12s Script &amp; Motion...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>{plan ? 'Regenerate AI Direction' : 'Generate AI Direction'}</span>
              </>
            )}
          </button>
        </div>

        {isPlanning && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300">
            <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${activeTextAccent}`} />
            <span className="truncate">
              Gemini AI Director is analyzing product photos for{' '}
              <strong className="text-white">{product.title}</strong>...
            </span>
          </div>
        )}

        {/* Editable 12s Commercial Voiceover Script (Hook -> Key Benefit -> Urgency CTA) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="font-semibold text-slate-300">
              12s Commercial Script (Hook → Key Benefit → Urgency CTA)
            </span>
            <span
              className={`font-bold tabular-nums shrink-0 ${
                wordCount >= 14 && wordCount <= 42 ? 'text-emerald-400' : 'text-amber-300'
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
            placeholder="Hook your viewer fast, show the killer benefit, and close with an urgent CTA to www.dbuystore.com."
            className={`w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs leading-relaxed focus:ring-2 ${focusRing} focus:outline-hidden resize-y disabled:opacity-45`}
          />
        </div>

        {/* Live Kinetic Callout Badges & Camera Transition Choreography Strip */}
        {scenes.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className={`w-3.5 h-3.5 ${activeTextAccent}`} />
                <span>AI Kinetic Callouts &amp; Camera Transitions</span>
              </span>
              {plan?.modelUsed && (
                <span className="text-[10px] font-semibold text-slate-400">
                  Directed by {plan.modelUsed}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {scenes.map((scene, idx) => {
                const mStyle = normalizeMotionStyle(
                  scene.motionStyle || scene.cameraMotion,
                  idx
                );
                return (
                  <button
                    key={`callout-preview-${scene.sceneNumber}`}
                    type="button"
                    onClick={() => setShowSceneInspector(true)}
                    className="text-left p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 transition-colors space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 text-[9px] font-extrabold uppercase tracking-wider">
                      <span className={activeTextAccent}>#{scene.sceneNumber} {scene.roleLabel}</span>
                      <span className="text-slate-400">{MOTION_STYLE_BADGE_MAP[mStyle]}</span>
                    </div>
                    <div className="text-[11px] font-bold text-white truncate">
                      {scene.calloutBadge || scene.headline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Voiceover Preview Controls (Gemini Studio TTS + Browser SpeechSynthesis) */}
        {enableVoiceover && (
          <div className="flex flex-wrap items-center gap-2">
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
                  <span>
                    {activeVoiceoverPreviewUrl ? 'Studio Voice Ready' : 'Preview AI Voiceover'}
                  </span>
                </>
              )}
            </button>

            {isBrowserSpeechSynthesisSupported() && (
              <button
                type="button"
                disabled={isRendering || wordCount < 3}
                onClick={handleBrowserVoiceToggle}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSpeakingBrowserVoice ? (
                  <>
                    <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
                    <span>Stop Browser Voice</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quick Browser Voice Preview</span>
                  </>
                )}
              </button>
            )}

            {activeVoiceoverPreviewUrl && (
              <audio
                controls
                src={activeVoiceoverPreviewUrl}
                className="h-8 flex-1 min-w-[200px] max-w-full"
              />
            )}
          </div>
        )}

        {/* Collapsible 4-Scene Kinetic Callout, Transition Style & Subtitle Editor */}
        {scenes.length > 0 && (
          <div className="pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowSceneInspector((v) => !v)}
              className="w-full flex items-center justify-between py-1 text-[11px] font-bold text-slate-300 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Customize Callout Badges, Camera Moves &amp; Subtitles ({scenes.length} beats)
                </span>
              </span>
              {showSceneInspector ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showSceneInspector && (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scenes.map((scene, idx) => {
                  const activeMotion = normalizeMotionStyle(
                    scene.motionStyle || scene.cameraMotion,
                    idx
                  );
                  return (
                    <div
                      key={`scene-${scene.sceneNumber}`}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                        <span className={activeTextAccent}>
                          Beat {scene.sceneNumber} · {scene.roleLabel}
                        </span>
                        <select
                          value={activeMotion}
                          onChange={(e) =>
                            updateSceneMotionStyle(
                              idx,
                              e.target.value as CommercialMotionStyle
                            )
                          }
                          aria-label={`Beat ${scene.sceneNumber} camera transition`}
                          className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-semibold focus:outline-hidden"
                        >
                          {COMMERCIAL_MOTION_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={scene.calloutBadge || ''}
                        onChange={(e) => updateSceneField(idx, 'calloutBadge', e.target.value)}
                        placeholder="Feature callout badge (e.g. Apple Find My Ready)"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-extrabold focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={scene.headline}
                        onChange={(e) => updateSceneField(idx, 'headline', e.target.value)}
                        placeholder="Kinetic headline"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px] font-bold focus:outline-hidden"
                      />
                      <textarea
                        rows={2}
                        value={scene.voiceoverLine}
                        onChange={(e) => updateSceneField(idx, 'voiceoverLine', e.target.value)}
                        placeholder="Word-by-word highlighted subtitle line"
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[10px] leading-snug focus:outline-hidden resize-y"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3-Stage High-Converting Social Ad Motion Pipeline Summary */}
      <div className="p-3 rounded-xl bg-slate-900/75 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clapperboard className={`w-4 h-4 ${activeTextAccent}`} />
            <div>
              <div className="text-xs font-bold text-white">
                3-Stage AI Director &amp; 60fps Pro Motion Graphics Pipeline
              </div>
              <div className="text-[10px] text-slate-400">
                Cubic-bezier camera choreography, kinetic badges, word-by-word captions &amp;{' '}
                {DBUY_OUTRO_DURATION_SEC}s DBuy Outro.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Stage A */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold">
              <span className={activeTextAccent}>STEP A · GEMINI DIRECTOR</span>
              <span className="text-slate-500">Free Tier</span>
            </div>
            <div className="text-[11px] font-bold text-white">Script &amp; Kinetic Callouts</div>
            <p className="text-[10px] text-slate-400 leading-snug">
              Analyzes {selectedImages.length} photo{selectedImages.length === 1 ? '' : 's'} +
              product copy for a punchy 12s Hook → Benefit → CTA script &amp; transition cues.
            </p>
          </div>

          {/* Stage B */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-extrabold">
              <span className={activeTextAccent}>STEP B · 60FPS MOTION ENGINE</span>
              <span className="text-slate-500">{resolution}</span>
            </div>
            <div className="flex items-center gap-2">
              {heroImageUrl && (
                <img
                  src={heroImageUrl}
                  alt={product.title}
                  className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">2.5D/3D Compositor</div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  Ambient product glow, Whip-Pan, 3D Tilt, Zoom-Punch &amp; bold active-word
                  subtitles.
                </p>
              </div>
            </div>
          </div>

          {/* Stage C */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-extrabold">
              <span className="text-sky-400">STEP C · AUDIO &amp; OUTRO</span>
              <span className="text-slate-500">+{DBUY_OUTRO_DURATION_SEC}s Card</span>
            </div>
            <div className="text-[11px] font-bold text-white">Voiceover + DBuy Outro</div>
            <p className="text-[10px] text-slate-400 leading-snug">
              17% auto-ducked beat, whoosh cuts &amp; animated DBuy blue bag logo +{' '}
              <span className="text-sky-300 font-semibold">www.dbuystore.com</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Price Banner & Web URL Footer Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 space-y-1">
          <label className="block text-[11px] font-bold text-slate-300">
            Price Callout Badge (Optional)
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
              Show DBuy corner logo + 2.5s animated Outro (
              <code className="text-slate-300">www.dbuystore.com</code>)
            </span>
          </label>
        </div>
      </div>

      {/* Quota Exhausted Banner */}
      {isQuotaExhausted && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">
              Daily AI Director Quota reached (0/{quota.maxDaily} remaining today).
            </div>
            <div className="text-[11px] text-amber-300/90">
              {resetCountdownText}. You can still upload a custom MP4 video in the &ldquo;Upload
              Custom MP4 Video&rdquo; tab at any time.
            </div>
          </div>
        </div>
      )}

      {/* Inline Error Alert */}
      {localError && (
        <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs leading-relaxed">
          {localError}
        </div>
      )}

      {/* Primary Generate 60fps AI Commercial CTA */}
      <button
        type="button"
        disabled={isRendering || isPlanning || selectedImages.length === 0 || isQuotaExhausted}
        onClick={handleRenderCommercial}
        className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm ${primaryBtnGradient} hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isRendering ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {renderProgress?.message || `Rendering ${aspectRatio} 60fps AI Commercial...`}
            </span>
          </>
        ) : isQuotaExhausted ? (
          <>
            <Clock className="w-4 h-4" />
            <span>
              Daily AI Director Quota reached (0/{quota.maxDaily} left · Resets 00:00 UTC)
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              Generate {aspectRatio} 60fps AI Commercial ({resolution} · {quota.remaining}/
              {quota.maxDaily} left)
            </span>
          </>
        )}
      </button>

      {/* Multi-Stage Progress Bar */}
      {(isRendering || (renderProgress && renderProgress.stage !== 'error')) && renderProgress && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={`flex items-center gap-2 ${isRed ? 'text-red-300' : 'text-cyan-300'}`}>
              {isRendering ? (
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
