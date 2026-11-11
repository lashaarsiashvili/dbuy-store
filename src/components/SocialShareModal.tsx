import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import { publishFacebookPublish } from '../utils/facebookApi';
import { X, Megaphone, RefreshCw, Copy, Image as ImageIcon } from 'lucide-react';

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
const FB_PAGE_TOKEN = "EAAXgEb3A7ZCABS1dkA4rhejoXgwWsDWLmZBIuv4UeVmEprMOuEM3o9YPdKKI0NnURobrXx89dsIj9qufVFZBdMW4htKGd8OeZCNZAsQvfVtxqMsGfzefwRURd7jdHd9byYipbYG6Bk1si192BLRl06lnXQ6XEaiSdZBaD7iy2eHgUd0JdxmDyLgsyX7C4LM8ZCAERPUxEn82S8aDK7HboNCZAA6IRhWIPis2n2FI2aC01KjlaLihZA8K5GkOCm3Io5BYuNlf8jC5JdKVZCLFnq";
const FB_PAGE_URL = "https://www.facebook.com/Dbuystore";

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose, isKa }) => {
  if (!isOpen || !product) return null;

  const [caption, setCaption] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>('🚀 Publish Gallery & Ad to Facebook');
  const [buttonColor, setButtonColor] = useState<string>('#1877F2');
  const [variant, setVariant] = useState(0);
  const [pageId, setPageId] = useState<string>(localStorage.getItem('dbuy_fb_page_id') || '');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [showTip, setShowTip] = useState<boolean>(false);

  useEffect(() => {
    // Resolve Page ID if missing
    if (!pageId) {
        fetch(`https://graph.facebook.com/v19.0/me?access_token=${FB_PAGE_TOKEN}`)
            .then(r => r.json())
            .then((data: any) => { if(data.id) { setPageId(data.id); localStorage.setItem('dbuy_fb_page_id', data.id); } });
    }

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
      } else if (clean.startsWith('/uploads/')) {
        urls.add(`https://www.dbuystore.com${clean}`);
      } else if (clean.startsWith('uploads/')) {
        urls.add(`https://www.dbuystore.com/${clean}`);
      }
    };
    addUrl(product.image);
    (product.images || []).forEach(addUrl);
    setImages(Array.from(urls));
  }, [product]);

  const toggleMainPhoto = (idx: number) => {
    const newImages = [...images];
    const [main] = newImages.splice(idx, 1);
    setImages([main, ...newImages]);
  };

  const regenerate = () => {
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  useEffect(() => { if (isOpen && !caption) regenerate(); }, [isOpen, caption]);

  const { addToast } = useStore();
  
  const publishToFacebook = async () => {
    setButtonText('⏳ Processing...');

    // 1. Copy Ad Copy
    const copied = await copyTextSafely(caption, textareaRef.current);
    if (copied) {
        addToast('✅ Ad Text Copied! Press Ctrl+V in the Facebook window.', 'success');
    }

    const productShareUrl = `https://www.dbuystore.com/b/${product.id}`;

    // 2. Automated API Upload (multi-photo gallery via backend /api/facebook/publish)
    let publishedPostId = null;
    const activePageId = pageId || 'me';
    if (activePageId && FB_PAGE_TOKEN && images.length > 0) {
        try {
            setButtonText('🚀 Publishing Gallery to Facebook...');
            const res = await publishFacebookPublish({
                images: images,
                message: caption,
                link: productShareUrl,
                accessToken: FB_PAGE_TOKEN,
                pageId: activePageId
            });

            if (res.success && res.postId) {
                publishedPostId = res.postId;
                addToast('✅ Successfully published multi-photo gallery post!', 'success');
            } else {
                addToast(`⚠️ Facebook publish error: ${res.error || 'Unknown error'}`, 'error');
            }
        } catch (e: any) {
            console.error("API publish failed", e);
            addToast(`⚠️ Facebook publish failed: ${e?.message || 'Network error'}`, 'error');
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
    }

    // 3. Open Centered Facebook Share Popup
    const shareUrl = publishedPostId 
      ? `https://www.facebook.com/${publishedPostId}`
      : `https://www.facebook.com/`;
    
    const width = 680;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(shareUrl, 'FacebookShare', `width=${width},height=${height},top=${top},left=${left},noopener,noreferrer`);

    // 4. Web Share API Fallback (if supported and not already published)
    if (!publishedPostId && typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: product.title, text: caption, url: productShareUrl }).catch(() => {});
    }

    setButtonText('🚀 Finished Sharing!');
    setButtonColor('#10B981');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between">
            <div>
                <h3 className="text-lg font-black">Facebook Gallery Ad Publisher</h3>
            </div>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-200">
                <span>✅ Connected to @Dbuystore (Auto-Gallery Posting Active)</span>
            </div>
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold mb-2">Select Main Photo</h4>
                <div className="grid grid-cols-4 gap-2">
                    {images.map((url, i) => <img key={i} src={url} onClick={(e) => { e.stopPropagation(); toggleMainPhoto(i); }} className={`w-full aspect-square object-cover rounded-lg border-2 ${i === 0 ? 'border-blue-500' : 'border-transparent'} cursor-pointer`}/>)}
                </div>
            </div>
            
            <textarea ref={textareaRef} value={caption} onChange={e => setCaption(e.target.value)} className="w-full p-3 h-32 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </div>
        <div className="p-5 border-t">
            <button onClick={publishToFacebook} style={{ backgroundColor: buttonColor }} className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                <Megaphone className="w-5 h-5"/>
                {buttonText}
            </button>
        </div>
      </div>
    </div>
  );
};

