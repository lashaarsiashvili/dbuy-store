import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import {
  publishFacebookPublish,
  publishFacebookFeedPost,
  checkFacebookConnectionStatus,
  FacebookConnectionStatus,
} from '../utils/facebookApi';
import { X, Megaphone, RefreshCw, Copy, Image as ImageIcon, Link as LinkIcon, Check, ExternalLink, KeyRound, AlertTriangle } from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isKa?: boolean;
}

const copyTextSafely = async (text: string, textareaRef?: HTMLTextAreaElement | null) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      if (textareaRef) {
        textareaRef.select();
        document.execCommand('copy');
        return true;
      }
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.style.position = 'fixed';
      temp.style.opacity = '0';
      document.body.appendChild(temp);
      temp.focus();
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      return true;
    } catch {
      return false;
    }
  }
};

const buildHighConvertingAdCopy = (product: Product, variantIndex = 0) => {
  const hooks = [
    `🔥 Elevate Your Style with the ${product.title}!`,
    `✨ Precision Craftsmanship Meets Bold Design — Meet the ${product.title}.`,
    `💎 Stand Out Every Single Day with the ${product.title}!`
  ];
  const hook = hooks[variantIndex % hooks.length];
  const priceLine = (product as any).origPrice && (product as any).origPrice > product.price
    ? `🔥 Special Offer: $${product.price} (Was $${(product as any).origPrice})`
    : `🔥 Exclusive Price: $${product.price}`;
  const productUrl = `https://www.dbuystore.com/b/${product.id}`;

  return `${hook}\n\n` +
    `✦ Premium build quality & eye-catching modern aesthetics\n` +
    `✦ Designed for durability, comfort, and everyday performance\n` +
    `✦ Stripped of middleman markups — direct luxury value\n\n` +
    `${priceLine}\n` +
    `🌍 Fast & Secure Worldwide Shipping\n\n` +
    `👉 Order yours today: ${productUrl}\n\n` +
    `#DBUY #WorldwideShipping #LuxuryStyle #DealOfTheDay #TrendingNow`;
};

const FB_APP_ID = "1653741686157296";
const FB_PAGE_ID = "215073415343195";
const LEGACY_EXPIRED_FB_TOKEN_PREFIX = "EAAXgEb3A7ZCABSzaHWiv";
const FB_PAGE_URL = "https://www.facebook.com/Dbuystore";

function loadSavedFbToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = (localStorage.getItem('dbuy_fb_page_token') || '').trim();
  if (!stored || stored.startsWith(LEGACY_EXPIRED_FB_TOKEN_PREFIX)) {
    localStorage.removeItem('dbuy_fb_page_token');
    return '';
  }
  return stored;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose, isKa }) => {
  const { addToast } = useStore();
  const [postMode, setPostMode] = useState<'feed' | 'gallery'>('feed');
  const [caption, setCaption] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>(isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook');
  const [buttonColor, setButtonColor] = useState<string>('#1877F2');
  const [variant, setVariant] = useState(0);
  const [pageId, setPageId] = useState<string>(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('dbuy_fb_page_id') : null;
    return (cached && cached !== 'me' && cached !== '3722589421239772') ? cached : FB_PAGE_ID;
  });
  const [customToken, setCustomToken] = useState<string>(() => loadSavedFbToken());
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenEditor, setShowTokenEditor] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [fbConnection, setFbConnection] = useState<FacebookConnectionStatus | null>(null);

  const [copied, setCopied] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string; postId?: string } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Verify live Facebook Page connection status when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const saved = loadSavedFbToken();
    setCustomToken(saved);
    setIsCheckingStatus(true);

    checkFacebookConnectionStatus({ accessToken: saved || undefined, pageId })
      .then((status) => {
        if (cancelled) return;
        setFbConnection(status);
        if (status.connected && status.pageId) {
          setPageId(status.pageId);
          localStorage.setItem('dbuy_fb_page_id', status.pageId);
          if (status.resolvedPageToken && saved) {
            setCustomToken(status.resolvedPageToken);
            localStorage.setItem('dbuy_fb_page_token', status.resolvedPageToken);
          }
          setShowTokenEditor(false);
        } else if (status.expired && saved) {
          // Clear expired browser token automatically
          localStorage.removeItem('dbuy_fb_page_token');
          setCustomToken('');
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Populate all product gallery images (all selected by default) when product changes or modal opens
  useEffect(() => {
    if (!isOpen || !product) return;

    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (!u || typeof u !== 'string') return;
      const clean = u.trim();
      if (!clean) return;
      if (clean.startsWith('data:')) {
        urls.add(clean);
      } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (clean.includes('/uploads/')) {
          const uploadPath = clean.substring(clean.indexOf('/uploads/'));
          urls.add(`https://www.dbuystore.com${uploadPath}`);
        } else {
          urls.add(clean);
        }
      } else if (clean.startsWith('/')) {
        urls.add(`https://www.dbuystore.com${clean}`);
      } else {
        urls.add(`https://www.dbuystore.com/${clean}`);
      }
    };

    addUrl(product.image);
    (product.images || []).forEach(addUrl);
    (product.variants || []).forEach(v => {
      (v.images || []).forEach(addUrl);
    });

    const allUrls = Array.from(urls);
    setImages(allUrls);
    setSelectedImages(allUrls);
    setStatusAlert(null);
    setButtonColor('#1877F2');
    setButtonText(
      postMode === 'feed'
        ? (isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook')
        : (isKa ? '🚀 გამოაქვეყნე გალერეა Facebook-ზე' : '🚀 Publish Multi-Photo Gallery')
    );
  }, [product, isOpen]);

  const setAsMainPhoto = (url: string) => {
    setImages(prev => [url, ...prev.filter(u => u !== url)]);
    setSelectedImages(prev => [url, ...prev.filter(u => u !== url)]);
  };

  const toggleSelectPhoto = (url: string) => {
    setSelectedImages(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      }
      return [...prev, url];
    });
  };

  const selectAllPhotos = () => {
    setSelectedImages(images);
  };

  const regenerate = () => {
    if (!product) return;
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  useEffect(() => {
    if (isOpen && product) {
      setCaption(buildHighConvertingAdCopy(product, 0));
    }
  }, [isOpen, product]);

  const handleCopyText = async () => {
    const success = await copyTextSafely(caption, textareaRef.current);
    if (success) {
      setCopied(true);
      addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Copy copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Safe early return placed AFTER all React hooks have been called unconditionally
  if (!isOpen || !product) {
    return null;
  }

  const downloadPhotosAndOpenFacebook = async () => {
    const photosToDownload = selectedImages.length > 0 ? selectedImages : images;
    for (let i = 0; i < photosToDownload.length; i++) {
      const img = photosToDownload[i];
      const href = img.startsWith('data:') ? img : `https://wsrv.nl/?url=${encodeURIComponent(img)}&output=jpg`;
      const a = document.createElement('a');
      a.href = href;
      a.download = `dbuy-photo-${i + 1}.jpg`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 250));
    }
    window.open(FB_PAGE_URL, '_blank');
  };

  const handleVerifyAndSaveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      addToast(isKa ? 'შეიყვანეთ Facebook Access Token' : 'Please paste a Facebook Access Token', 'error');
      return;
    }

    setIsSavingToken(true);
    try {
      const status = await checkFacebookConnectionStatus({
        accessToken: trimmed,
        pageId: pageId || FB_PAGE_ID,
      });

      if (status.connected) {
        const finalToken = status.resolvedPageToken || trimmed;
        localStorage.setItem('dbuy_fb_page_token', finalToken);
        setCustomToken(finalToken);
        if (status.pageId) {
          setPageId(status.pageId);
          localStorage.setItem('dbuy_fb_page_id', status.pageId);
        }
        setFbConnection(status);
        setTokenInput('');
        setShowTokenEditor(false);
        setStatusAlert(null);
        addToast(
          isKa
            ? `✅ დაკავშირდა გვერდთან: ${status.pageName || '@Dbuystore'}`
            : `✅ Connected to ${status.pageName || '@Dbuystore'}!`,
          'success'
        );
      } else {
        addToast(`❌ ${status.error || 'Token verification failed'}`, 'error');
        setFbConnection(status);
      }
    } finally {
      setIsSavingToken(false);
    }
  };

  // როდესაც მომხმარებელი აჭერს ღილაკს "Publish" (Feed Post):
  const handlePublishToFacebook = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      setButtonText(isKa ? '⏳ მიმდინარეობს ატვირთვა...' : '⏳ Publishing to Facebook...');
      setStatusAlert(null);

      // 1. ვამზადებთ პროდუქტის ლინკს და ტექსტს
      const productLink = `https://www.dbuystore.com/b/${product.id}`;
      const adMessage = caption.includes(productLink)
        ? caption
        : `${caption}\n\n👉 Order yours today: ${productLink}`;

      const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;

      // 2. ვუშვებთ ლინკის პოსტს ფეისბუქზე
      const result = await publishFacebookFeedPost({
        link: productLink,
        message: adMessage,
        accessToken: customToken || undefined,
        pageId: activePageId,
      });

      if (result.success) {
        const msg = isKa ? 'პოსტი წარმატებით აიტვირთა!' : 'Post published successfully!';
        addToast(`✅ ${msg}`, 'success');
        setStatusAlert({ type: 'success', message: msg, postId: result.postId });
        setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Published Successfully!');
        setButtonColor('#10B981');
      } else if (result.requiresReconnect) {
        const errMsg = result.error || (isKa ? 'Facebook ტოკენის ვადა ამოიწურა — გთხოვთ განაახლოთ' : 'Facebook session expired — please update your Page Access Token above.');
        addToast(`⚠️ ${errMsg}`, 'error');
        setFbConnection({ connected: false, expired: true, requiresReconnect: true, error: errMsg });
        setShowTokenEditor(true);
        setStatusAlert({ type: 'error', message: errMsg });
        setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Feed Post');
        setButtonColor('#1877F2');
      } else {
        // Fallback: copy ad copy & open Facebook Web Sharer
        await copyTextSafely(caption, textareaRef.current);
        const fbSharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`;
        window.open(fbSharerUrl, '_blank', 'width=620,height=600');
        
        const msg = isKa 
          ? 'ტექსტი დაკოპირდა! Facebook-ის ფანჯარა გაიხსნა @Dbuystore გვერდზე გასაზიარებლად.' 
          : 'Ad copy copied! Facebook composer opened to share to @Dbuystore.';
        addToast(`🚀 ${msg}`, 'info');
        setStatusAlert({ type: 'success', message: msg });
        setButtonText(isKa ? '✅ გახსნილია FB-ზე' : '🚀 Opened on Facebook');
        setButtonColor('#1877F2');
      }
    } catch {
      const productLink = `https://www.dbuystore.com/b/${product.id}`;
      await copyTextSafely(caption, textareaRef.current);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`, '_blank', 'width=620,height=600');
      const msg = isKa ? 'Facebook გაიხსნა!' : 'Opened Facebook composer!';
      setStatusAlert({ type: 'success', message: msg });
      setButtonText(isKa ? '✅ გახსნილია FB-ზე' : '🚀 Opened on Facebook');
    } finally {
      setIsPublishing(false);
    }
  };

  // როდესაც მომხმარებელი აჭერს ღილაკს "Publish" (Multi-Photo Gallery):
  const publishGalleryToFacebook = async () => {
    if (isPublishing) return;

    if (selectedImages.length === 0) {
      const emptyMsg = isKa ? 'აირჩიეთ მინიმუმ ერთი ფოტო გალერეისთვის.' : 'Please select at least one photo for the gallery.';
      addToast(`⚠️ ${emptyMsg}`, 'error');
      setStatusAlert({ type: 'error', message: emptyMsg });
      return;
    }

    setIsPublishing(true);
    setButtonText(
      isKa
        ? `⏳ იტვირთება ${selectedImages.length} ფოტო გალერეაში...`
        : `⏳ Uploading ${selectedImages.length} Photos to Gallery...`
    );
    setStatusAlert(null);

    try {
      // 1. Copy Ad Copy
      const copiedText = await copyTextSafely(caption, textareaRef.current);
      if (copiedText) {
        addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Text Copied!', 'success');
      }

      const productShareUrl = `https://www.dbuystore.com/b/${product.id}`;
      const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;

      // 2. Upload all selected photos with published=false & publish single feed post with attached_media[i]
      const res = await publishFacebookPublish({
        images: selectedImages,
        message: caption,
        link: productShareUrl,
        accessToken: customToken || undefined,
        pageId: activePageId,
      });

      if (res.success && res.postId) {
        const count = res.attachedCount ?? selectedImages.length;
        const msg = isKa
          ? `${count}-ფოტოიანი გალერეა ერთ პოსტად წარმატებით გამოქვეყნდა!`
          : `Successfully published ${count}-photo gallery into a single Facebook post!`;
        addToast(`✅ ${msg}`, 'success');
        setStatusAlert({ type: 'success', message: msg, postId: res.postId });
        setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Gallery Published!');
        setButtonColor('#10B981');
      } else {
        const errMsg = res.error || (isKa ? 'გალერეის გამოქვეყნება ვერ მოხერხდა' : 'Failed to publish multi-photo gallery post');
        if (res.requiresReconnect) {
          setFbConnection({ connected: false, expired: true, requiresReconnect: true, error: errMsg });
          setShowTokenEditor(true);
        }
        addToast(`❌ ${errMsg}`, 'error');
        setStatusAlert({ type: 'error', message: errMsg });
        setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Multi-Photo Gallery');
        setButtonColor('#1877F2');
      }
    } catch (err: any) {
      const errMsg = err?.message || (isKa ? 'ქსელური შეცდომა' : 'Network error publishing gallery');
      addToast(`❌ ${errMsg}`, 'error');
      setStatusAlert({ type: 'error', message: errMsg });
      setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Multi-Photo Gallery');
      setButtonColor('#1877F2');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isKa ? 'Facebook პოსტის გამომქვეყნებელი' : 'Facebook Post Publisher'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isKa ? 'ავტომატური გამოქვეყნება @Dbuystore გვერდზე' : 'Direct one-click publishing to @Dbuystore page'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Live Facebook Graph API Connection Status */}
          <div className={`rounded-xl border p-3 text-xs sm:text-sm transition-colors ${
            fbConnection?.connected
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : isCheckingStatus
              ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold min-w-0">
                {isCheckingStatus ? (
                  <span>⏳ {isKa ? 'მოწმდება Facebook კავშირი...' : 'Checking Facebook Graph API connection...'}</span>
                ) : fbConnection?.connected ? (
                  <span className="truncate">
                    ✅ {isKa
                      ? `დაკავშირებულია ${fbConnection.pageName || '@Dbuystore'}-თან (Graph API აქტიურია)`
                      : `Connected to ${fbConnection.pageName || '@Dbuystore'} (Graph API Active)`}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {fbConnection?.expired
                        ? (isKa ? 'Facebook სესიის ვადა ამოიწურა — საჭიროა ტოკენის განახლება' : 'Facebook access token expired — reconnect to publish')
                        : (isKa ? 'საჭიროა Facebook Page Access Token' : 'Facebook Page Access Token required')}
                    </span>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTokenEditor(v => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-current/20 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>{showTokenEditor ? (isKa ? 'დამალვა' : 'Hide') : (fbConnection?.connected ? (isKa ? 'ტოკენის შეცვლა' : 'Update Token') : (isKa ? 'ტოკენის განახლება' : 'Reconnect Token'))}</span>
              </button>
            </div>

            {showTokenEditor && (
              <div className="mt-3 pt-3 border-t border-current/15 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-90">
                  <span>
                    {isKa
                      ? 'ჩასვით ახალი Page Access Token ან User Access Token (Graph API Explorer-იდან):'
                      : 'Paste a fresh Page Access Token or User Access Token from Meta Graph API Explorer:'}
                  </span>
                  <a
                    href={`https://developers.facebook.com/tools/explorer/?app_id=${FB_APP_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>{isKa ? 'Graph API Explorer-ის გახსნა' : 'Open Graph API Explorer'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="EAA..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isSavingToken || !tokenInput.trim()}
                    onClick={handleVerifyAndSaveToken}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isSavingToken ? (isKa ? 'მოწმდება...' : 'Verifying...') : (isKa ? 'შემოწმება & შენახვა' : 'Verify & Connect')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mode Switcher: Link Feed Post vs Multi-Photo Gallery */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setPostMode('feed');
                setButtonText(isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook');
                setButtonColor('#1877F2');
                setStatusAlert(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                postMode === 'feed'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>{isKa ? '🔗 ლინკის პოსტი (Feed Card)' : '🔗 Link Post (Feed Card)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPostMode('gallery');
                setButtonText(isKa ? '🚀 გამოაქვეყნე გალერეა Facebook-ზე' : '🚀 Publish Multi-Photo Gallery');
                setButtonColor('#1877F2');
                setStatusAlert(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                postMode === 'gallery'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{isKa ? '📸 ფოტო ალბომი (Gallery)' : '📸 Multi-Photo Gallery'}</span>
            </button>
          </div>

          {/* Feed Post Preview Card */}
          {postMode === 'feed' && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              {images[0] && (
                <img 
                  src={images[0]} 
                  alt={product.title} 
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0" 
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-black">dbuystore.com</div>
                <div className="text-sm font-bold truncate text-slate-900 dark:text-white">{product.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">https://www.dbuystore.com/b/{product.id}</div>
              </div>
            </div>
          )}

          {/* Photo Gallery Selector */}
          {postMode === 'gallery' && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isKa ? 'გალერეის ფოტოები (დააკლიკეთ მთავარ ფოტოდ ასარჩევად)' : 'Gallery Photos (Click photo to set Lead, toggle check to include)'}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {selectedImages.length < images.length && (
                    <button
                      type="button"
                      onClick={selectAllPhotos}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isKa ? 'ყველას მონიშვნა' : 'Select All'}
                    </button>
                  )}
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {selectedImages.length}/{images.length} {isKa ? 'არჩეული' : 'selected'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {images.map((url, i) => {
                  const selectedIdx = selectedImages.indexOf(url);
                  const isSelected = selectedIdx !== -1;
                  const isMain = selectedIdx === 0;
                  return (
                    <div
                      key={url + i}
                      onClick={() => setAsMainPhoto(url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                        isMain
                          ? 'border-blue-500 scale-[1.03] shadow-xs'
                          : isSelected
                          ? 'border-blue-400/70 opacity-95 hover:opacity-100'
                          : 'border-slate-300 dark:border-slate-700 opacity-45 hover:opacity-75'
                      }`}
                    >
                      <img
                        src={url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectPhoto(url);
                        }}
                        title={isSelected ? (isKa ? 'ამოღება' : 'Remove from gallery') : (isKa ? 'დამატება' : 'Include in gallery')}
                        className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition shadow-xs cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/90 text-slate-500 border border-slate-300'
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : ''}
                      </button>
                      {isSelected && (
                        <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${
                          isMain ? 'bg-blue-600 text-white' : 'bg-slate-900/75 text-white'
                        }`}>
                          {isMain ? (isKa ? 'მთავარი' : 'Lead #1') : `#${selectedIdx + 1}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ad Copy Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isKa ? 'სარეკლამო ტექსტი (Ad Message)' : 'Ad Copy Message'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={regenerate}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isKa ? 'ტექსტის განახლება' : 'Regenerate'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? (isKa ? 'დაკოპირდა!' : 'Copied!') : (isKa ? 'კოპირება' : 'Copy')}</span>
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full p-3 h-32 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Status Alert Banner */}
          {statusAlert && (
            <div
              className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
                statusAlert.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{statusAlert.type === 'success' ? '✅' : '⚠️'}</span>
                <span className="break-words">{statusAlert.message}</span>
              </div>
              {statusAlert.postId && (
                <a
                  href={`https://www.facebook.com/${statusAlert.postId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shrink-0"
                >
                  <span>{isKa ? 'ნახვა FB-ზე' : 'View on Facebook'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {statusAlert.type === 'error' && (
                <button
                  type="button"
                  onClick={() => {
                    if (postMode === 'gallery') {
                      downloadPhotosAndOpenFacebook();
                    } else {
                      const productLink = `https://www.dbuystore.com/b/${product.id}`;
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`, '_blank');
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  <span>{postMode === 'gallery' ? (isKa ? 'ფოტოების ჩამოტვირთვა & FB' : 'Download & Open FB') : (isKa ? 'გაზიარება FB-ზე' : 'Share via FB')}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={isPublishing || (postMode === 'gallery' && selectedImages.length === 0)}
            onClick={postMode === 'feed' ? handlePublishToFacebook : publishGalleryToFacebook}
            style={{ backgroundColor: buttonColor }}
            className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Megaphone className="w-5 h-5"/>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};


