import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import { X, Megaphone, RefreshCw, Copy, Image as ImageIcon } from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
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

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const [caption, setCaption] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>('🚀 Publish Gallery & Ad to Facebook');
  const [buttonColor, setButtonColor] = useState<string>('#1877F2');
  const [variant, setVariant] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [showTip, setShowTip] = useState<boolean>(false);

  useEffect(() => {
    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (typeof u === 'string' && u.trim().startsWith('http')) urls.add(u.trim());
      else if (typeof u === 'string' && u.trim().startsWith('/uploads/')) urls.add(window.location.origin + u.trim());
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

  const publishToFacebook = async () => {
    // 1. MUST happen synchronously on line 1 so Chrome opens Facebook Page immediately
    window.open('https://www.facebook.com/Dbuystore', '_blank', 'noopener,noreferrer');

    setButtonText('⏳ Preparing Gallery & Ad...');

    // 2. Copy Ad Copy safely
    await copyTextSafely(caption, textareaRef.current);

    // 3. Download images ONLY via Blob URL (NEVER click a raw R2 URL!)
    for (let i = 0; i < images.length; i++) {
        try {
            const response = await fetch(images[i], { mode: 'cors' });
            if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `dbuy-product-${i + 1}.jpg`;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Clean up blob URL
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            }
        } catch (err) {
            console.error("Failed to download image", err);
        }
        await new Promise(r => setTimeout(r, 300));
    }

    setButtonText('✅ Ad Copied & Photos Downloaded! Upload Photos & Paste (Ctrl+V) on @Dbuystore');
    setButtonColor('#10B981');
    setShowTip(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between">
            <div>
                <h3 className="text-lg font-black">Facebook Gallery Ad Publisher</h3>
                <p className="text-xs text-slate-500">Auto-publish multi-photo gallery to Facebook Page</p>
            </div>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold mb-2">Select Main Photo (Click to reorder)</h4>
                <div className="grid grid-cols-4 gap-2">
                    {images.map((url, i) => <img key={i} src={url} onClick={() => toggleMainPhoto(i)} className={`w-full aspect-square object-cover rounded-lg border-2 ${i === 0 ? 'border-blue-500' : 'border-transparent'} cursor-pointer`}/>)}
                </div>
            </div>
            
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold">Social Ad Copy (Editable):</label>
                <button onClick={regenerate} className="text-xs flex items-center gap-1 font-bold text-[#1877F2]"><RefreshCw className="w-3 h-3"/> Regenerate</button>
            </div>
            <textarea ref={textareaRef} value={caption} onChange={e => setCaption(e.target.value)} className="w-full p-3 h-32 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </div>
        <div className="p-5 border-t">
            <button onClick={publishToFacebook} style={{ backgroundColor: buttonColor }} className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                <Megaphone className="w-5 h-5"/>
                {buttonText}
            </button>
            {showTip && <p className="text-xs text-slate-500 mt-2 text-center">💡 Tip: When pasting on Facebook, select the downloaded photos first so Facebook creates the multi-photo gallery instead of a single link card.</p>}
        </div>
      </div>
    </div>
  );
};

