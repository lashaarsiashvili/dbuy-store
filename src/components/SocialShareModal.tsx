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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getAllProductImages = React.useMemo(() => {
    if (!product) return [];
    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (typeof u === 'string' && u.trim().startsWith('http')) urls.add(u.trim());
      else if (typeof u === 'string' && u.trim().startsWith('/uploads/')) urls.add(window.location.origin + u.trim());
    };
    addUrl(product.image);
    (product.images || []).forEach(addUrl);
    return Array.from(urls);
  }, [product]);

  const generateCollage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1200, 630);

    const images = getAllProductImages.slice(0, 5);
    const gap = 12;

    // Left: Main (50% - gap)
    if (images[0]) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = images[0];
      await img.decode();
      ctx.drawImage(img, gap, gap, 594 - gap, 630 - 2 * gap);
    }

    // Right: 2x2 grid
    for (let i = 1; i < images.length; i++) {
        const row = Math.floor((i - 1) / 2);
        const col = (i - 1) % 2;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = images[i];
        await img.decode();
        ctx.drawImage(img, 600 + col * 300 + gap, row * 315 + gap, 300 - 2 * gap, 315 - 2 * gap);
    }
  };

  const copyGalleryImage = async () => {
    await generateCollage();
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.toBlob(async (blob) => {
            if (blob) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                alert('Gallery image copied to clipboard!');
            }
        }, 'image/png');
    }
  };

  const regenerate = () => {
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  useEffect(() => { if (isOpen && !caption) regenerate(); }, [isOpen, caption]);

  const publishToFacebook = async () => {
    setButtonText('⏳ Preparing Gallery & Ad...');
    await copyTextSafely(caption, textareaRef.current);
    await generateCollage();
    
    // Fallback
    const images = getAllProductImages;
    for (let i = 0; i < images.length; i++) {
        const res = await fetch(images[i]);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `product-image-${i+1}.jpg`;
        a.click();
        await new Promise(r => setTimeout(r, 400));
    }
    window.open('https://www.facebook.com/Dbuystore', '_blank', 'noopener,noreferrer');
    setButtonText('✅ Ad Copied & Ready! Paste (Ctrl+V) on @Dbuystore');
    setButtonColor('#10B981');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <canvas ref={canvasRef} width="1200" height="630" className="hidden" />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between">
            <div>
                <h3 className="text-lg font-black">Facebook Gallery Ad Publisher</h3>
                <p className="text-xs text-slate-500">AI-powered multi-photo gallery post & high-converting ad generator</p>
            </div>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold mb-2">{product.title}</h4>
                <div className="grid grid-cols-4 gap-2">
                    {getAllProductImages.map((url, i) => <img key={i} src={url} className="w-full aspect-square object-cover rounded-lg border"/>)}
                </div>
            </div>
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold">Social Ad Copy (Editable):</label>
                <button onClick={regenerate} className="text-xs flex items-center gap-1 font-bold text-[#1877F2]"><RefreshCw className="w-3 h-3"/> Regenerate</button>
            </div>
            <textarea ref={textareaRef} value={caption} onChange={e => setCaption(e.target.value)} className="w-full p-3 h-40 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
            <button onClick={copyGalleryImage} className="w-full flex items-center justify-center gap-2 py-2 border rounded-lg font-bold text-xs"><ImageIcon className="w-4 h-4"/> 📸 Copy Gallery Image to Clipboard</button>
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

