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
  
  // FB Connection State
  const [fbToken, setFbToken] = useState<string>(localStorage.getItem('dbuy_fb_page_token') || '');
  const [fbPageId, setFbPageId] = useState<string>(localStorage.getItem('dbuy_fb_page_id') || '');
  const [fbConnected, setFbConnected] = useState<boolean>(!!(fbToken && fbPageId));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<string[]>([]);

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

  const saveFbConnection = (token: string, id: string) => {
    localStorage.setItem('dbuy_fb_page_token', token);
    localStorage.setItem('dbuy_fb_page_id', id);
    setFbToken(token);
    setFbPageId(id);
    setFbConnected(true);
  };

  const connectFbAutomatically = () => {
    // Basic SDK load and init
    const script = document.createElement('script');
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onload = () => {
        (window as any).FB.init({ appId: '1651734446366149', version: 'v19.0' });
        (window as any).FB.login((response: any) => {
            if (response.authResponse) {
                (window as any).FB.api('/me/accounts', (res: any) => {
                    if (res && res.data && res.data.length > 0) {
                        // For demo, pick first page
                        saveFbConnection(res.data[0].access_token, res.data[0].id);
                    } else {
                        alert('No pages found for this user.');
                    }
                });
            }
        }, { scope: 'pages_manage_posts,pages_read_engagement,pages_show_list' });
    };
    document.body.appendChild(script);
  };

  const regenerate = () => {
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  useEffect(() => { if (isOpen && !caption) regenerate(); }, [isOpen, caption]);

  const publishToFacebook = async () => {
    if (!fbConnected) {
        alert('Please connect your Facebook Page first.');
        return;
    }

    setButtonText('⏳ Uploading photos to Facebook...');
    
    try {
        const uploadedMediaIds: string[] = [];
        for (let i = 0; i < images.length; i++) {
            setButtonText(`⏳ Uploading photo ${i + 1} of ${images.length}...`);
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    url: images[i],
                    published: 'false',
                    access_token: fbToken
                }).toString()
            });
            const data = await fbRes.json() as any;
            if (data.id) {
                uploadedMediaIds.push(data.id);
            }
        }

        setButtonText('🚀 Publishing Multi-Photo Gallery Post...');
        const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: caption,
                attached_media: uploadedMediaIds.map(id => ({ media_fbid: id })),
                access_token: fbToken
            })
        });
        const feedData = await feedRes.json() as any;

        if (feedData.id) {
            setButtonText('✅ Published Automatically to Facebook!');
            setButtonColor('#10B981');
            const postUrl = `https://www.facebook.com/${feedData.id}`;
            // Provide link
            const link = document.createElement('a');
            link.href = postUrl;
            link.target = '_blank';
            link.textContent = '🔗 View Live Post on Facebook ↗';
            link.className = 'block mt-2 text-blue-500 font-bold';
            textareaRef.current?.parentElement?.appendChild(link);
        } else {
            alert('Failed to publish post: ' + JSON.stringify(feedData));
            setButtonText('Error. Try again.');
        }

    } catch (err: any) {
        alert('Error: ' + err.message);
        setButtonText('Error. Try again.');
    }
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
            {/* Connection Status */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {fbConnected ? (
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-green-600">✅ Connected to Facebook Page (Auto-Publish Active)</span>
                        <button onClick={() => { localStorage.clear(); setFbConnected(false); }} className="text-xs text-slate-500 underline">Change Token</button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold">Connect your Facebook Page</h4>
                        <button onClick={connectFbAutomatically} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">🔗 Connect Facebook Page Automatically</button>
                        <input type="text" placeholder="Or paste Page Access Token (EAA...)" onChange={e => {
                           const token = e.target.value.trim();
                           if (token.startsWith('EAA')) {
                               // Quick and dirty token check for PageID
                               fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`)
                                .then(r => r.json())
                                .then(data => { if(data.id) saveFbConnection(token, data.id); });
                           }
                        }} className="w-full p-2 border rounded-lg text-sm"/>
                    </div>
                )}
            </div>

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
        </div>
      </div>
    </div>
  );
};

