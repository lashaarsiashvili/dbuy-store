import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import { publishFacebookPublish, publishFacebookFeedPost } from '../utils/facebookApi';
import { X, Megaphone, RefreshCw, Copy, Image as ImageIcon, Link as LinkIcon, Check, ExternalLink } from 'lucide-react';

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
const FB_PAGE_TOKEN = "EAAXgEb3A7ZCABSzaHWivAFli9ZCZAugvKGDXylopxiZCA791ZBU3EFzpOkJBeY4tGSrpMUbPxf2qrGlWVnkXHwgBdzytE4ZBjKQwJfmeTP4ZAXmJiwiH0yS9GIa3K2hjV87u3DkCg3kLJbcms9yq2HJ4ZCyW6vOEZBwGESu7LzNFzjFwbEr2Jtk25qhwZB8mIEJILg74y5LANijrRY19ZCUL8YNEwnZAOTpZBGGVmpimdewZDZD";
const FB_PAGE_URL = "https://www.facebook.com/Dbuystore";

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose, isKa }) => {
  if (!isOpen || !product) return null;

  const [postMode, setPostMode] = useState<'feed' | 'gallery'>('feed');
  const [caption, setCaption] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>(isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook');
  const [buttonColor, setButtonColor] = useState<string>('#1877F2');
  const [variant, setVariant] = useState(0);
  const [pageId, setPageId] = useState<string>(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('dbuy_fb_page_id') : null;
    return (cached && cached !== 'me' && cached !== '3722589421239772') ? cached : FB_PAGE_ID;
  });
  const [copied, setCopied] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string; postId?: string } | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Resolve Page ID with the active Page Access Token
    fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_PAGE_TOKEN}&fields=id,name`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.id && data.id !== '3722589421239772' && data.id !== 'me') {
          setPageId(data.id);
          localStorage.setItem('dbuy_fb_page_id', data.id);
        } else {
          setPageId(FB_PAGE_ID);
          localStorage.setItem('dbuy_fb_page_id', FB_PAGE_ID);
        }
      })
      .catch(() => {
        setPageId(FB_PAGE_ID);
      });

    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (!u || typeof u !== 'string') return;
      const clean = u.trim();
      if (!clean) return;
      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (clean.includes('/uploads/')) {
          const uploadPath = clean.substring(clean.indexOf('/uploads/'));
          urls.add(`https://www.dbuystore.com${uploadPath}`);
        } else {
          urls.add(clean);
        }
      } else if (clean.startsWith('/')) {
        urls.add(`https://www.dbuystore.com${clean}`);
      } else if (clean.startsWith('uploads/')) {
        urls.add(`https://www.dbuystore.com/${clean}`);
      } else {
        urls.add(`https://www.dbuystore.com/${clean}`);
      }
    };
    addUrl(product.image);
    (product.images || []).forEach(addUrl);
    setImages(Array.from(urls));
  }, [product, pageId]);

  const toggleMainPhoto = (idx: number) => {
    const newImages = [...images];
    const [main] = newImages.splice(idx, 1);
    setImages([main, ...newImages]);
  };

  const regenerate = () => {
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  useEffect(() => {
    if (isOpen && !caption) {
      regenerate();
    }
  }, [isOpen, caption]);

  const { addToast } = useStore();

  const handleCopyText = async () => {
    const success = await copyTextSafely(caption, textareaRef.current);
    if (success) {
      setCopied(true);
      addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Copy copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // როდესაც მომხმარებელი აჭერს ღილაკს "Publish" (Feed Post):
  const handlePublishToFacebook = async () => {
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
        accessToken: FB_PAGE_TOKEN,
        pageId: activePageId,
      });

      if (result.success) {
        const msg = isKa ? 'პოსტი წარმატებით აიტვირთა!' : 'Post published successfully!';
        addToast(`✅ ${msg}`, 'success');
        setStatusAlert({ type: 'success', message: msg, postId: result.postId });
        setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Published Successfully!');
        setButtonColor('#10B981');
      } else {
        const msg = isKa ? `შეცდომა: ${result.error || 'უცნობი შეცდომა'}` : `Error: ${result.error || 'Failed to publish post'}`;
        addToast(`⚠️ ${msg}`, 'error');
        setStatusAlert({ type: 'error', message: msg });
        setButtonText(isKa ? 'გამეორება' : 'Retry Publishing');
        setButtonColor('#EF4444');
      }
    } catch (err: any) {
      console.error(err);
      const msg = isKa ? `შეცდომა: ${err?.message || 'ქსელის შეცდომა'}` : `Error: ${err?.message || 'Network error'}`;
      addToast(`⚠️ ${msg}`, 'error');
      setStatusAlert({ type: 'error', message: msg });
      setButtonText(isKa ? 'გამეორება' : 'Retry Publishing');
      setButtonColor('#EF4444');
    }
  };

  // როდესაც მომხმარებელი აჭერს ღილაკს "Publish" (Multi-Photo Gallery):
  const publishGalleryToFacebook = async () => {
    setButtonText(isKa ? '⏳ მიმდინარეობს გალერეის ატვირთვა...' : '⏳ Publishing Gallery...');
    setStatusAlert(null);

    // 1. Copy Ad Copy
    const copiedText = await copyTextSafely(caption, textareaRef.current);
    if (copiedText) {
      addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Text Copied!', 'success');
    }

    const productShareUrl = `https://www.dbuystore.com/b/${product.id}`;

    // 2. Automated API Upload (multi-photo gallery via backend /api/facebook/publish)
    let publishedPostId = null;
    const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;
    if (activePageId && FB_PAGE_TOKEN && images.length > 0) {
      try {
        const res = await publishFacebookPublish({
          images: images,
          message: caption,
          link: productShareUrl,
          accessToken: FB_PAGE_TOKEN,
          pageId: activePageId,
        });

        if (res.success && res.postId) {
          publishedPostId = res.postId;
          const msg = isKa ? 'გალერეა წარმატებით აიტვირთა!' : 'Successfully published multi-photo gallery post!';
          addToast(`✅ ${msg}`, 'success');
          setStatusAlert({ type: 'success', message: msg, postId: res.postId });
          setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Published Successfully!');
          setButtonColor('#10B981');
        } else {
          const msg = isKa ? `შეცდომა: ${res.error || 'შეცდომა'}` : `Error: ${res.error || 'Failed to publish gallery'}`;
          addToast(`⚠️ ${msg}`, 'error');
          setStatusAlert({ type: 'error', message: msg });
          setButtonText(isKa ? 'გამეორება' : 'Retry Publishing');
          setButtonColor('#EF4444');
        }
      } catch (e: any) {
        console.error("API publish failed", e);
        const msg = isKa ? `შეცდომა: ${e?.message || 'ქსელის შეცდომა'}` : `Error: ${e?.message || 'Network error'}`;
        addToast(`⚠️ ${msg}`, 'error');
        setStatusAlert({ type: 'error', message: msg });
        setButtonText(isKa ? 'გამეორება' : 'Retry Publishing');
        setButtonColor('#EF4444');
      }
    } else {
      // Download images if not using API
      for (let i = 0; i < images.length; i++) {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(images[i])}&output=jpg`;
        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = `dbuy-photo-${i + 1}.jpg`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(r => setTimeout(r, 300));
      }
      setButtonText(isKa ? '✅ ფოტოები ჩამოტვირთულია' : '🚀 Photos Downloaded');
      setButtonColor('#10B981');
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
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-bold border border-emerald-200 dark:border-emerald-800">
            <span>✅ {isKa ? 'დაკავშირებულია @Dbuystore-თან (Facebook Graph API აქტიურია)' : 'Connected to @Dbuystore (Facebook Graph API Active)'}</span>
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
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isKa ? 'აირჩიეთ მთავარი ფოტო' : 'Select Main Photo'}
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {images.length} {isKa ? 'ფოტო' : 'photos'}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMainPhoto(i);
                    }}
                    className={`w-full aspect-square object-cover rounded-lg border-2 cursor-pointer transition-all ${
                      i === 0 ? 'border-blue-500 scale-[1.03] shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    alt=""
                  />
                ))}
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
                <span className="truncate">{statusAlert.message}</span>
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
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={postMode === 'feed' ? handlePublishToFacebook : publishGalleryToFacebook}
            style={{ backgroundColor: buttonColor }}
            className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base"
          >
            <Megaphone className="w-5 h-5"/>
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};


