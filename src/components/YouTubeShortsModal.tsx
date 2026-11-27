import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import {
  X,
  Check,
  RefreshCw,
  ExternalLink,
  Loader2,
  KeyRound,
  LogOut,
  Upload,
  Video,
  Play,
  Sparkles,
  Download,
  Copy,
  Tag,
} from 'lucide-react';
import { YouTubeShortsLogo } from './YouTubeLogo';
import { CommercialVideoStudio } from './CommercialVideoStudio';
import {
  buildYouTubeShortDescription,
  buildYouTubeShortTags,
  buildYouTubeShortTitle,
  checkYouTubeConnectionStatus,
  disconnectYouTubeAccount,
  getYouTubeAuthUrl,
  MAX_YOUTUBE_DESCRIPTION_LENGTH,
  MAX_YOUTUBE_TITLE_LENGTH,
  uploadYouTubeShort,
  YouTubeConnectionStatus,
  YouTubePrivacyStatus,
  YouTubeUploadProgress,
} from '../utils/youtubeApi';
import { PromoVideoGenerationResult } from '../utils/tiktokVideoGenerator';

interface YouTubeShortsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  isKa?: boolean;
}

async function copyTextSafely(text: string): Promise<boolean> {
  if (!text) return false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(temp);
    return ok;
  } catch {
    return false;
  }
}

export const YouTubeShortsModal: React.FC<YouTubeShortsModalProps> = ({
  isOpen,
  onClose,
  product,
  isKa = false,
}) => {
  const { addToast } = useStore();

  const [images, setImages] = useState<string[]>([]);
  const [ytConnection, setYtConnection] = useState<YouTubeConnectionStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showRedirectHelper, setShowRedirectHelper] = useState(false);

  const [videoSourceMode, setVideoSourceMode] = useState<'file' | 'generator'>('generator');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [generatedByStudio, setGeneratedByStudio] = useState(false);
  const [generatedMeta, setGeneratedMeta] = useState<{
    aspectRatio: '9:16' | '16:9';
    hasVoiceover: boolean;
    durationSec: number;
    engineUsed?: 'gemini-director-motion' | 'google-veo' | 'canvas-fallback';
    modelUsed?: string;
    fps?: number;
    hasBrandedOutro?: boolean;
  } | null>(null);

  // YouTube Shorts Metadata
  const [ytTitle, setYtTitle] = useState<string>('');
  const [ytDescription, setYtDescription] = useState<string>('');
  const [ytTags, setYtTags] = useState<string>('');
  const [ytPrivacyStatus, setYtPrivacyStatus] = useState<YouTubePrivacyStatus>('private');
  const [descCopied, setDescCopied] = useState(false);
  const [shortsLinkCopied, setShortsLinkCopied] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<YouTubeUploadProgress | null>(null);
  const [statusAlert, setStatusAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    errorCode?: string;
    videoId?: string;
    shortsUrl?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check YouTube OAuth connection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsCheckingStatus(true);
    checkYouTubeConnectionStatus()
      .then((status) => {
        if (!cancelled) setYtConnection(status);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingStatus(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Listen for YouTube OAuth popup callback messages
  useEffect(() => {
    if (!isOpen) return;
    const handleMessage = (event: MessageEvent) => {
      const origin = (event.origin || '').toLowerCase();
      const isTrustedOrigin =
        !origin ||
        origin.includes('dbuystore.com') ||
        origin.includes('.run.app') ||
        origin.includes('localhost') ||
        origin === window.location.origin.toLowerCase();
      if (!isTrustedOrigin) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'YOUTUBE_OAUTH_SUCCESS') {
        setIsConnecting(false);
        const channelName = data.account?.channelTitle || 'YouTube Channel';
        setStatusAlert({
          type: 'success',
          message: isKa
            ? `YouTube არხი დაკავშირდა: ${channelName}`
            : `Connected to YouTube channel: ${channelName}!`,
        });
        addToast(
          isKa ? '✅ YouTube არხი დაკავშირდა!' : '✅ YouTube channel connected!',
          'success'
        );
        setIsCheckingStatus(true);
        checkYouTubeConnectionStatus()
          .then((status) => setYtConnection(status))
          .finally(() => setIsCheckingStatus(false));
      } else if (data.type === 'YOUTUBE_OAUTH_ERROR') {
        setIsConnecting(false);
        const errMsg = data.error || 'YouTube OAuth connection failed.';
        setStatusAlert({ type: 'error', message: errMsg });
        addToast(`❌ ${errMsg}`, 'error');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOpen, isKa, addToast]);

  // Initialize product metadata & studio defaults
  useEffect(() => {
    if (!product || !isOpen) return;
    const allImgs = Array.from(
      new Set([product.image, ...(product.images || [])].filter(Boolean))
    );
    setImages(allImgs);
    setVideoSourceMode('generator');
    setVideoFile(null);
    setGeneratedByStudio(false);
    setGeneratedMeta(null);
    setUploadProgress(null);
    setStatusAlert(null);

    setYtTitle(buildYouTubeShortTitle(product, Boolean(isKa)));
    setYtDescription(buildYouTubeShortDescription(product, Boolean(isKa)));
    setYtTags(buildYouTubeShortTags(product));
    setYtPrivacyStatus('private');
  }, [product, isOpen, isKa]);

  // Manage local object URL for MP4 video preview
  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [videoFile]);

  const handleRefreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await checkYouTubeConnectionStatus();
      setYtConnection(status);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnectYouTube = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setStatusAlert(null);
    try {
      const returnTo = `${window.location.pathname}${window.location.search}` || '/';
      const res = await getYouTubeAuthUrl(returnTo);
      if (!res.success || !res.url) {
        const errMsg =
          res.error ||
          (isKa
            ? 'YouTube OAuth კონფიგურაცია არ არის დაყენებული სერვერზე.'
            : 'YouTube API credentials (YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET) are not configured on the server.');
        setStatusAlert({ type: 'error', message: errMsg });
        addToast(`⚠️ ${errMsg}`, 'error');
        setIsConnecting(false);
        return;
      }

      const popup = window.open(
        res.url,
        'youtube_oauth_popup',
        'width=600,height=740,scrollbars=yes,resizable=yes'
      );
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        const popupMsg = isKa
          ? 'გთხოვთ დაუშვათ pop-up ფანჯრები ბრაუზერში YouTube-ით შესასვლელად.'
          : 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
        setStatusAlert({ type: 'error', message: popupMsg });
        addToast(`⚠️ ${popupMsg}`, 'warning');
        setIsConnecting(false);
        return;
      }

      const pollTimer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(pollTimer);
          setIsConnecting(false);
          handleRefreshStatus();
        }
      }, 650);
    } catch (err: any) {
      setIsConnecting(false);
      setStatusAlert({
        type: 'error',
        message: err?.message || 'Failed to launch YouTube OAuth.',
      });
    }
  };

  const handleDisconnectYouTube = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      const res = await disconnectYouTubeAccount();
      if (res.success) {
        setYtConnection((prev) => ({
          configured: prev?.configured ?? true,
          connected: false,
          redirectUri: prev?.redirectUri,
        }));
        setStatusAlert(null);
        addToast(isKa ? 'YouTube არხი გაითიშა.' : 'YouTube channel disconnected.', 'info');
      } else {
        addToast(`❌ ${res.error || 'Disconnect failed'}`, 'error');
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSelectVideoFile = (file?: File | null) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (file.type && !file.type.startsWith('video/') && !lowerName.endsWith('.mp4')) {
      const msg = isKa ? 'გთხოვთ აირჩიოთ MP4 ვიდეო ფაილი.' : 'Please select a valid MP4 video file.';
      addToast(`⚠️ ${msg}`, 'error');
      setStatusAlert({ type: 'error', message: msg });
      return;
    }
    setVideoFile(file);
    setGeneratedByStudio(false);
    setGeneratedMeta(null);
    setVideoSourceMode('file');
    setStatusAlert(null);
    setUploadProgress(null);
  };

  const handleStudioVideoGenerated = (result: PromoVideoGenerationResult) => {
    setVideoFile(result.file);
    setGeneratedByStudio(true);
    setGeneratedMeta({
      aspectRatio: result.aspectRatio,
      hasVoiceover: result.hasVoiceover,
      durationSec: result.durationSec,
      engineUsed: result.engineUsed,
      modelUsed: result.modelUsed,
      fps: result.fps,
      hasBrandedOutro: result.hasBrandedOutro,
    });
    setUploadProgress(null);
    const engineLabel =
      result.engineUsed === 'gemini-director-motion'
        ? `Gemini AI Director · ${result.fps || 60}fps`
        : result.engineUsed === 'google-veo'
        ? 'Google Veo AI'
        : 'AI';
    const outroSuffix = result.hasBrandedOutro ? ' + 2.5s DBuy Outro' : '';
    const formatExt = result.file.type.includes('webm') ? 'WebM' : 'MP4';
    setStatusAlert({
      type: 'success',
      message: isKa
        ? `${result.aspectRatio} ${engineLabel} კომერციული ვიდეო მზადაა (${(result.file.size / (1024 * 1024)).toFixed(2)} MB)! დააჭირეთ „YouTube Shorts-ზე ატვირთვა“.`
        : `${result.aspectRatio} ${engineLabel} Commercial ready (${(result.file.size / (1024 * 1024)).toFixed(2)} MB, ${result.durationSec}s ${formatExt}${result.hasVoiceover ? ' · Voiceover + 17% Ducked Beat' : ''}${outroSuffix})! Click "Publish Short to YouTube" below.`,
    });
    addToast(
      isKa
        ? `🎬 ${result.aspectRatio} ${engineLabel} კომერციული ვიდეო შეიქმნა!`
        : `🎬 ${result.aspectRatio} ${engineLabel} Commercial Ad Video ready!`,
      'success'
    );
  };

  const handlePublishShort = async () => {
    if (isUploading || !product) return;

    if (!ytConnection?.connected) {
      const msg = isKa
        ? 'გთხოვთ ჯერ დააკავშიროთ თქვენი YouTube არხი.'
        : 'Please connect your YouTube channel first.';
      addToast(`⚠️ ${msg}`, 'warning');
      setStatusAlert({ type: 'error', message: msg });
      return;
    }

    if (!videoFile) {
      const msg = isKa
        ? 'გთხოვთ შექმნათ ან აირჩიოთ MP4 ვიდეო ფაილი.'
        : 'Please generate an AI Promo Video or upload an MP4 file first.';
      addToast(`⚠️ ${msg}`, 'warning');
      setStatusAlert({ type: 'error', message: msg });
      return;
    }

    setIsUploading(true);
    setStatusAlert({
      type: 'info',
      message: isKa ? 'იტვირთება YouTube Shorts-ზე...' : 'Uploading Short to YouTube...',
    });

    try {
      const result = await uploadYouTubeShort(
        {
          file: videoFile,
          title: ytTitle.trim() || buildYouTubeShortTitle(product, Boolean(isKa)),
          description: ytDescription.trim(),
          tags: ytTags,
          privacyStatus: ytPrivacyStatus,
        },
        (progress) => {
          setUploadProgress(progress);
          setStatusAlert({
            type:
              progress.stage === 'published'
                ? 'success'
                : progress.stage === 'error'
                ? 'error'
                : 'info',
            message: progress.message,
          });
        }
      );

      if (result.success && result.videoId) {
        const shortsUrl = result.shortsUrl || `https://youtube.com/shorts/${result.videoId}`;
        const successMsg = isKa
          ? `ვიდეო წარმატებით აიტვირთა YouTube Shorts-ზე (${ytConnection.channelTitle || 'YouTube'})!`
          : `Short published to ${ytConnection.channelTitle || 'YouTube'} (${result.privacyStatus || ytPrivacyStatus})!`;
        setStatusAlert({
          type: 'success',
          message: successMsg,
          videoId: result.videoId,
          shortsUrl,
        });
        addToast(`✅ ${successMsg}`, 'success');
      } else {
        const errMsg = result.error || 'Failed to upload Short to YouTube.';
        if (result.requiresReconnect) {
          setYtConnection((prev) => ({
            configured: prev?.configured ?? true,
            connected: false,
            requiresReconnect: true,
            redirectUri: prev?.redirectUri,
            error: errMsg,
          }));
        }
        setStatusAlert({
          type: 'error',
          message: errMsg,
          errorCode: result.errorCode,
        });
        addToast(`❌ ${errMsg}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Unexpected error uploading Short to YouTube.';
      setStatusAlert({ type: 'error', message: errMsg });
      addToast(`❌ ${errMsg}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !product) {
    return null;
  }

  const channelTitle = ytConnection?.channelTitle || 'YouTube Channel';
  const channelAvatar = ytConnection?.avatarUrl || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <YouTubeShortsLogo size="md" showHoverEffect={false} />
            <div className="min-w-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {isKa ? 'YouTube Shorts პუბლიკატორი' : 'YouTube Shorts Publisher'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {product.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* YouTube OAuth 2.0 Connection Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {ytConnection?.connected && channelAvatar ? (
                  <img
                    src={channelAvatar}
                    alt={channelTitle}
                    className="w-10 h-10 rounded-xl object-cover border border-red-500/40 shrink-0"
                  />
                ) : (
                  <YouTubeShortsLogo size="md" showHoverEffect={false} />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">
                      {ytConnection?.connected ? channelTitle : 'YouTube Data API v3'}
                    </span>
                    {ytConnection?.connected && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Connected
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      ytConnection?.connected
                        ? 'text-emerald-400'
                        : isCheckingStatus
                        ? 'text-slate-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {isCheckingStatus
                      ? isKa
                        ? 'მოწმდება YouTube კავშირი...'
                        : 'Checking YouTube OAuth 2.0 connection...'
                      : ytConnection?.connected
                      ? `OAuth Active (${ytConnection.channelId || 'YouTube Channel'})`
                      : ytConnection?.configured === false
                      ? isKa
                        ? 'დაამატეთ YOUTUBE_CLIENT_ID და YOUTUBE_CLIENT_SECRET სერვერზე'
                        : 'Requires YOUTUBE_CLIENT_ID & YOUTUBE_CLIENT_SECRET env vars'
                      : ytConnection?.error ||
                        (isKa
                          ? 'დააკავშირეთ YouTube არხი Shorts-ის ასატვირთად'
                          : 'Connect your YouTube channel to publish 9:16 Shorts')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRedirectHelper((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Show YouTube Callback URI"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{showRedirectHelper ? (isKa ? 'დამალვა' : 'Hide URI') : 'Callback URI'}</span>
                </button>

                {ytConnection?.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRefreshStatus}
                      disabled={isCheckingStatus}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer disabled:opacity-50"
                      title="Refresh status"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectYouTube}
                      disabled={isDisconnecting}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/70 cursor-pointer disabled:opacity-50"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      <span>{isKa ? 'გათიშვა' : 'Disconnect'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectYouTube}
                    disabled={isConnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF0000] hover:bg-red-700 text-white cursor-pointer disabled:opacity-60 shadow-sm"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <YouTubeShortsLogo size="xs" showHoverEffect={false} />
                    )}
                    <span>
                      {isConnecting
                        ? isKa
                          ? 'იხსნება Google...'
                          : 'Connecting...'
                        : isKa
                        ? 'YouTube-ის დაკავშირება'
                        : 'Connect YouTube'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {showRedirectHelper && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                <div className="font-semibold text-red-400">
                  Google Cloud Console → Authorized Redirect URI:
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 truncate font-mono text-[11px]">
                    {ytConnection?.redirectUri || `${window.location.origin}/api/youtube/callback`}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      const uri =
                        ytConnection?.redirectUri || `${window.location.origin}/api/youtube/callback`;
                      const ok = await copyTextSafely(uri);
                      if (ok) addToast('✅ Callback URI copied!', 'success');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Product Link Reference Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            {images[0] && (
              <img
                src={images[0]}
                alt={product.title}
                className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-red-600 dark:text-red-400 font-black">
                DBUYSTORE.COM · YOUTUBE SHORTS
              </div>
              <div className="text-sm font-bold truncate text-slate-900 dark:text-white">
                {product.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                https://www.dbuystore.com/b/{product.id}
              </div>
            </div>
          </div>

          {/* Video Source Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setVideoSourceMode('generator');
                setStatusAlert(null);
              }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                videoSourceMode === 'generator'
                  ? 'bg-gradient-to-r from-[#FF0000] via-[#F97316] to-[#EF4444] text-white shadow-md font-extrabold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isKa ? '✨ AI პრომო ვიდეო (9:16)' : '✨ AI Promo Video Generator'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setVideoSourceMode('file');
                setStatusAlert(null);
              }}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                videoSourceMode === 'file'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isKa ? 'MP4 ფაილის ატვირთვა' : 'Upload Custom MP4 Video'}
              </span>
            </button>
          </div>

          {/* Upgraded 4-Stage Commercial Video Studio */}
          {videoSourceMode === 'generator' && (
            <CommercialVideoStudio
              product={product}
              images={images}
              accentTheme="red"
              defaultAspectRatio="9:16"
              isKa={isKa}
              onVideoGenerated={handleStudioVideoGenerated}
              onError={(msg) => setStatusAlert({ type: 'error', message: msg })}
              onToast={addToast}
            />
          )}

          {/* MP4 Video Picker & Preview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/*"
              className="hidden"
              onChange={(e) => handleSelectVideoFile(e.target.files?.[0] || null)}
            />

            {!videoFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-7 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-red-500 dark:hover:border-red-400 bg-white/60 dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isKa ? 'აირჩიეთ MP4 ვიდეო YouTube Shorts-ისთვის' : 'Click to select a custom MP4 video file'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isKa
                    ? 'რეკომენდებულია ვერტიკალური 9:16 MP4 (60 წამამდე)'
                    : '9:16 vertical MP4 recommended (<= 60s) · Or use ✨ AI Promo Video Generator above'}
                </div>
              </button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div
                  className={`sm:col-span-5 rounded-xl overflow-hidden bg-black ${
                    generatedMeta?.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-60'
                  } mx-auto w-full flex items-center justify-center border border-slate-700`}
                >
                  {videoPreviewUrl ? (
                    <video
                      key={videoPreviewUrl}
                      src={videoPreviewUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Play className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="sm:col-span-7 space-y-2.5 min-w-0">
                  {generatedByStudio && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/30 text-[10px] font-extrabold">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {generatedMeta?.engineUsed === 'gemini-director-motion'
                          ? `Gemini AI Director · ${generatedMeta.fps || 60}fps`
                          : generatedMeta?.engineUsed === 'google-veo'
                          ? 'Google Veo AI Commercial'
                          : 'AI Commercial'}{' '}
                        {generatedMeta?.aspectRatio || '9:16'}
                        {generatedMeta?.hasVoiceover ? ' · Voiceover (17% Duck)' : ''}
                        {generatedMeta?.hasBrandedOutro ? ' + 2.5s DBuy Outro' : ''}
                      </span>
                    </span>
                  )}
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {videoFile.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB · {videoFile.type || 'video/mp4'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {isKa ? 'ვიდეოს შეცვლა' : 'Replace Video'}
                    </button>
                    {videoPreviewUrl && (
                      <a
                        href={videoPreviewUrl}
                        download={videoFile.name}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-red-300 border border-slate-700 text-xs font-bold hover:bg-slate-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isKa ? 'ჩამოტვირთვა' : 'Download MP4'}</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setVideoFile(null);
                        setGeneratedByStudio(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 cursor-pointer"
                    >
                      {isKa ? 'წაშლა' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* YouTube Shorts Metadata Form */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
            {/* Video Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKa ? 'ვიდეოს სათაური (YouTube Title)' : 'Video Title (prefilled with #Shorts)'}
                </label>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {ytTitle.length}/{MAX_YOUTUBE_TITLE_LENGTH}
                </span>
              </div>
              <input
                type="text"
                maxLength={MAX_YOUTUBE_TITLE_LENGTH}
                value={ytTitle}
                onChange={(e) => setYtTitle(e.target.value)}
                placeholder="Product Title #Shorts"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKa ? 'აღწერა & პროდუქტის ბმული' : 'Description & Direct Product Link'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {ytDescription.length}/{MAX_YOUTUBE_DESCRIPTION_LENGTH}
                  </span>
                  <button
                    type="button"
                    onClick={() => setYtDescription(buildYouTubeShortDescription(product, Boolean(isKa)))}
                    className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isKa ? 'განახლება' : 'Reset'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyTextSafely(ytDescription);
                      if (ok) {
                        setDescCopied(true);
                        addToast('✅ Description copied!', 'success');
                        setTimeout(() => setDescCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 font-semibold cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700"
                  >
                    {descCopied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{descCopied ? (isKa ? 'დაკოპირდა!' : 'Copied!') : isKa ? 'კოპირება' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <textarea
                value={ytDescription}
                maxLength={MAX_YOUTUBE_DESCRIPTION_LENGTH}
                onChange={(e) => setYtDescription(e.target.value)}
                className="w-full p-3 h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Tags & Privacy Status */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 space-y-1">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Tag className="w-3.5 h-3.5 text-red-500" />
                  <span>{isKa ? 'თეგები (Tags)' : 'Tags (comma separated)'}</span>
                </label>
                <input
                  type="text"
                  value={ytTags}
                  onChange={(e) => setYtTags(e.target.value)}
                  placeholder="Shorts, DBUYStore, TechFinds"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKa ? 'ხილვადობა (Privacy)' : 'Privacy Status'}
                </label>
                <select
                  value={ytPrivacyStatus}
                  onChange={(e) => setYtPrivacyStatus(e.target.value as YouTubePrivacyStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
          </div>

          {/* Upload Progress Indicator */}
          {uploadProgress && isUploading && (
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-200 font-semibold">
                <span className="flex items-center gap-2 truncate">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400 shrink-0" />
                  <span className="truncate">{uploadProgress.message}</span>
                </span>
                <span className="text-red-400 tabular-nums shrink-0">{uploadProgress.progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF0000] to-[#F97316] transition-all duration-300"
                  style={{ width: `${Math.max(4, Math.min(100, uploadProgress.progressPct))}%` }}
                />
              </div>
              {uploadProgress.detail && (
                <div className="text-[11px] text-slate-400 truncate">{uploadProgress.detail}</div>
              )}
            </div>
          )}

          {/* Status Alert Banner (Error or Success with clickable YouTube Shorts link) */}
          {statusAlert && (!isUploading || statusAlert.type !== 'info') && (
            <div
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${
                statusAlert.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : statusAlert.type === 'info'
                  ? 'bg-slate-900 text-slate-100 border-slate-700'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">
                  {statusAlert.type === 'success' ? '✅' : statusAlert.type === 'error' ? '⚠️' : '⏳'}
                </span>
                <div className="min-w-0">
                  {statusAlert.type === 'error' && statusAlert.errorCode && (
                    <div className="text-[11px] font-mono font-bold tracking-tight opacity-90">
                      error.code: {statusAlert.errorCode}
                    </div>
                  )}
                  <div className="break-words">{statusAlert.message}</div>
                  {statusAlert.shortsUrl && (
                    <a
                      href={statusAlert.shortsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono underline hover:opacity-80 break-all inline-block mt-0.5"
                    >
                      {statusAlert.shortsUrl}
                    </a>
                  )}
                </div>
              </div>

              {statusAlert.type === 'success' && statusAlert.shortsUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyTextSafely(statusAlert.shortsUrl || '');
                      if (ok) {
                        setShortsLinkCopied(true);
                        addToast('✅ YouTube Shorts link copied!', 'success');
                        setTimeout(() => setShortsLinkCopied(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {shortsLinkCopied ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{shortsLinkCopied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={statusAlert.shortsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF0000] text-white rounded-lg text-xs font-bold hover:bg-red-700 transition"
                  >
                    <span>{isKa ? 'ნახვა Shorts-ზე' : 'View Short'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Publish CTA */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isUploading || !ytConnection?.connected || !videoFile}
            onClick={handlePublishShort}
            className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                uploadProgress?.stage === 'published'
                  ? '#10B981'
                  : 'linear-gradient(90deg, #09090b 0%, #991b1b 45%, #FF0000 100%)',
            }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {uploadProgress?.message || (isKa ? 'იტვირთება YouTube Shorts-ზე...' : 'Uploading Short to YouTube...')}
                </span>
              </>
            ) : uploadProgress?.stage === 'published' ? (
              <>
                <Check className="w-5 h-5" />
                <span>
                  {isKa ? 'YouTube Short აიტვირთა!' : 'Short Published to YouTube!'}
                </span>
              </>
            ) : (
              <>
                <YouTubeShortsLogo size="xs" showHoverEffect={false} />
                <span>
                  {isKa ? 'გამოქვეყნება YouTube Shorts-ზე' : 'Publish Short to YouTube'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
