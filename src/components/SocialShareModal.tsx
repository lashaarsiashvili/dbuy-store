import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import { X, Sparkles, Check, Layers, Megaphone, Loader2 } from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !product) return null;

  const [caption, setCaption] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Helper to extract product images safely
  const getAllProductImages = React.useMemo(() => {
    if (!product) return [];
    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (typeof u === 'string' && u.trim().startsWith('http')) urls.add(u.trim());
    };
    addUrl(product.image);
    (product.images || []).forEach(addUrl);
    return Array.from(urls);
  }, [product]);

  const generateAd = async () => {
    setIsGenerating(true);
    setCaption('✨ Generating high-converting Facebook ad copy...');
    try {
        const response = await fetch('/api/gemini/generate-ad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product, style: 'sales', language: 'en' })
        });
        
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON response from server'); }

        if (data.success) {
            setCaption(data.caption);
        } else {
            throw new Error(data.error);
        }
    } catch (e: any) {
        console.error('Ad Gen Error:', e);
        // Robust Fallback Template
        const fallbackAd = `🔥 ${product.title} — Special Offer at DBUY Store!

✦ Premium quality and modern design
✦ Perfect for everyday use
✦ High-quality craftsmanship

🔥 Exclusive Price: $${product.price} ${product.origPrice ? `(Was $${product.origPrice})` : ''}
🌍 Fast & Secure Worldwide Shipping

👉 Order yours now: ${getProductShareUrl(product)}

#DBUY #WorldwideShipping #DealOfTheDay #Sale`;
        setCaption(fallbackAd);
        setStatusMessage('Used fallback ad template.');
    } finally {
        setIsGenerating(false);
    }
  };

  useEffect(() => {
      if (isOpen && !caption) generateAd();
  }, [isOpen, caption]);

  const publishToFacebook = async () => {
    setIsPublishing(true);
    setStatusMessage('Starting gallery publish...');
    const fbPageId = localStorage.getItem('dbuy_fb_page_id') || '';
    const fbAccessToken = localStorage.getItem('dbuy_fb_token') || '';

    try {
        if (!fbPageId || !fbAccessToken) throw new Error('Facebook credentials not configured');
        
        setStatusMessage('Uploading gallery...');
        const response = await fetch('/api/facebook/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken: fbAccessToken,
                pageId: fbPageId,
                message: caption,
                images: getAllProductImages
            })
        });
        
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { throw new Error('Invalid JSON response from server'); }

        if (data.success) {
            setStatusMessage('Published Successfully! ✅');
            setTimeout(onClose, 2000);
        } else {
            throw new Error(data.error || 'Failed to publish post');
        }
    } catch (err: any) {
        console.error('Publish Error:', err);
        setStatusMessage('Error publishing: ' + err.message);
        // Fallback for publish failure
        await navigator.clipboard.writeText(caption);
        window.open('https://www.facebook.com/', '_blank');
        setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Facebook Gallery Ad Publisher</h3>
                <p className="text-xs text-slate-500">AI-powered multi-photo gallery post & high-converting ad generator</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
            {/* Product & Gallery Preview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold mb-2">{product.title}</h4>
                <div className="flex justify-between items-center mb-3">
                    <span className="text-blue-600 font-bold">${product.price}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                        {getAllProductImages.length} Photos Selected for Gallery
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {getAllProductImages.map((url, i) => (
                        <img key={i} src={url} className="w-full aspect-square object-cover rounded-lg border border-slate-200"/>
                    ))}
                </div>
            </div>

            {/* AI Ad Copy Editor */}
            <div className="space-y-2">
                <label className="text-xs font-bold flex items-center justify-between">
                    <span>Ad Copy</span>
                    <button onClick={generateAd} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Sparkles className="w-3 h-3"/> {isGenerating ? 'Generating...' : 'Regenerate'}
                    </button>
                </label>
                <textarea 
                    value={caption} 
                    onChange={e => setCaption(e.target.value)}
                    className="w-full p-3 h-40 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-sm"
                />
                {statusMessage && <p className="text-xs text-blue-600 font-bold">{statusMessage}</p>}
            </div>
        </div>

        {/* Primary Action */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={publishToFacebook}
                disabled={isPublishing}
                className="w-full py-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-2xl flex items-center justify-center gap-2"
            >
                {isPublishing ? <Loader2 className="animate-spin w-5 h-5"/> : <Megaphone className="w-5 h-5"/>}
                {isPublishing ? 'Publishing...' : '🚀 Publish Gallery & Ad to Facebook'}
            </button>
        </div>
      </div>
    </div>
  );
};
