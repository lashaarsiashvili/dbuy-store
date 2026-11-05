import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProductShareUrl, generateSocialAdPost } from '../utils/socialAdGenerator';
import { X, Megaphone, Loader2, Copy, Download } from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const [caption, setCaption] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  const generateAd = async () => {
    setIsGenerating(true);
    try {
        const ad = generateSocialAdPost({ product, style: 'sales', language: 'en' });
        setCaption(ad.caption);
    } catch (e: any) {
        setCaption(`🔥 ${product.title} — Special Offer at DBUY Store!\n\n🌍 Fast & Secure Worldwide Shipping\n\n👉 Order yours now: ${getProductShareUrl(product)}\n\n#DBUY #WorldwideShipping #DealOfTheDay #Sale`);
    } finally {
        setIsGenerating(false);
    }
  };

  useEffect(() => { if (isOpen && !caption) generateAd(); }, [isOpen, caption]);

  const assistedPublish = async () => {
    try {
        await navigator.clipboard.writeText(caption);
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
        setStatusMessage('✅ Ad Text Copied & Gallery Photos Downloaded! Paste on Facebook.');
    } catch (err: any) {
        console.error('Sharing error:', err);
        setStatusMessage('❌ Error: Manual copy required.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between">
            <div><h3 className="text-lg font-black">Facebook Gallery Ad Publisher</h3><p className="text-xs text-slate-500">AI-powered multi-photo gallery post & high-converting ad generator</p></div>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold mb-2">{product.title}</h4>
                <div className="grid grid-cols-4 gap-2">
                    {getAllProductImages.map((url, i) => <img key={i} src={url} className="w-full aspect-square object-cover rounded-lg border"/>)}
                </div>
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} className="w-full p-3 h-40 rounded-xl bg-slate-50 border border-slate-200 text-sm"/>
        </div>
        <div className="p-5 border-t">
            <button onClick={assistedPublish} className="w-full py-4 bg-[#1877F2] text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                <Megaphone className="w-5 h-5"/>
                {statusMessage || '🚀 Copy Ad & Download Gallery'}
            </button>
        </div>
      </div>
    </div>
  );
};

