import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { getProductShareUrl } from '../utils/socialAdGenerator';
import { X, Sparkles, Megaphone, Loader2 } from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const FB_APP_ID = "1651734446366149";
const DEFAULT_FB_TOKEN = "1651734446366149|6ZDc5AoAGiOypXX3GWSYUWM0leI";
const FB_PAGE_HANDLE = "Dbuy.us";

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose }) => {
  if (!isOpen || !product) return null;

  const [caption, setCaption] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fbPageId, setFbPageId] = useState(localStorage.getItem('dbuy_fb_page_id') || FB_PAGE_HANDLE);
  const [fbAccessToken, setFbAccessToken] = useState(localStorage.getItem('dbuy_fb_token') || DEFAULT_FB_TOKEN);
  const [showSettings, setShowSettings] = useState(false);

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
    setCaption('✨ Generating high-converting Facebook ad copy...');
    try {
        const response = await fetch('/api/gemini/generate-ad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product, style: 'sales', language: 'en' })
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        if (data.success) setCaption(data.caption);
        else throw new Error(data.error);
    } catch (e: any) {
        setCaption(`🔥 ${product.title} — Special Offer at DBUY Store!\n\n✦ Premium quality and modern design\n✦ Perfect for everyday use\n✦ High-quality craftsmanship\n\n🔥 Exclusive Price: $${product.price} ${product.origPrice ? `(Was $${product.origPrice})` : ''}\n🌍 Fast & Secure Worldwide Shipping\n\n👉 Order yours now: ${getProductShareUrl(product)}\n\n#DBUY #WorldwideShipping #DealOfTheDay #Sale`);
    } finally {
        setIsGenerating(false);
    }
  };

  useEffect(() => { if (isOpen && !caption) generateAd(); }, [isOpen, caption]);

  const assistedPublish = async () => {
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
    window.open(`https://www.facebook.com/${FB_PAGE_HANDLE}`, '_blank');
    setStatusMessage('✅ Ad Text Copied & Gallery Photos Downloaded! Paste on Facebook.');
    setIsPublishing(false);
  };

  const publishToFacebook = async () => {
    setIsPublishing(true);
    setStatusMessage('Publishing to Facebook...');
    
    try {
        let pageId = fbPageId;
        if (isNaN(Number(pageId))) {
            const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?access_token=${fbAccessToken}`);
            const data = await res.json();
            if (data.id) pageId = data.id;
        }

        const media_fbids = [];
        for (const imageUrl of getAllProductImages) {
            const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos?url=${encodeURIComponent(imageUrl)}&published=false&access_token=${fbAccessToken}`, { method: 'POST' });
            const data = await res.json();
            if (data.id) media_fbids.push(data.id);
            else throw new Error('Image upload failed');
        }

        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: caption,
                attached_media: media_fbids.map(id => ({ media_fbid: id })),
                access_token: fbAccessToken
            })
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.id) {
            setStatusMessage('✅ Multi-Photo Gallery & Ad Published to Facebook!');
            setTimeout(onClose, 2000);
        } else {
            throw new Error(data.error?.message || 'Failed to publish');
        }
    } catch (err: any) {
        assistedPublish();
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
            <div className="border rounded-xl p-3">
                <button onClick={() => setShowSettings(!showSettings)} className="text-xs font-bold w-full text-left">⚙️ Facebook Connection</button>
                {showSettings && <div className="mt-3 space-y-2"><input type="text" value={fbPageId} onChange={e => setFbPageId(e.target.value)} className="w-full p-2 text-xs border rounded" placeholder="Page ID / Handle"/><input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} className="w-full p-2 text-xs border rounded" placeholder="Access Token"/></div>}
            </div>
        </div>
        <div className="p-5 border-t">
            <button onClick={publishToFacebook} disabled={isPublishing} className="w-full py-4 bg-[#1877F2] text-white font-bold rounded-2xl flex items-center justify-center gap-2">
                {isPublishing ? <Loader2 className="animate-spin w-5 h-5"/> : <Megaphone className="w-5 h-5"/>}
                {statusMessage || '🚀 Publish Gallery & Ad to Facebook'}
            </button>
        </div>
      </div>
    </div>
  );
};
