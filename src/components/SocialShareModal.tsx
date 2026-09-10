import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  generateSocialAdPost, 
  getProductShareUrl, 
  AdPostStyle, 
  AdLanguage 
} from '../utils/socialAdGenerator';
import { 
  X, 
  Facebook, 
  Instagram, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Share2, 
  Sparkles, 
  RotateCcw,
  Smartphone,
  CheckCircle2,
  Megaphone
} from 'lucide-react';

interface SocialShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  isKa?: boolean;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  product,
  isOpen,
  onClose,
  isKa = true,
}) => {
  if (!isOpen || !product) return null;

  const [language, setLanguage] = useState<AdLanguage>(isKa ? 'ka' : 'en');
  const [style, setStyle] = useState<AdPostStyle>('sales');
  const [caption, setCaption] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'text' | 'link' | 'fb' | 'ig' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Update caption when language or style changes
  useEffect(() => {
    if (!product) return;
    const generated = generateSocialAdPost({
      product,
      style,
      language,
    });
    setCaption(generated.caption);
    setStatusMessage('');
  }, [product, style, language]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const shareUrl = getProductShareUrl(product);

  const showToast = (msg: string, type: 'text' | 'link' | 'fb' | 'ig') => {
    setStatusMessage(msg);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
    }, 3000);
  };

  // Copy plain text
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      showToast(
        language === 'ka' ? 'სარეკლამო ტექსტი დაკოპირდა ბუფერში!' : 'Ad copy copied to clipboard!',
        'text'
      );
    } catch {
      // Fallback
      fallbackCopyText(caption);
      showToast(
        language === 'ka' ? 'სარეკლამო ტექსტი დაკოპირდა!' : 'Ad copy copied!',
        'text'
      );
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(
        language === 'ka' ? 'პროდუქტის ბმული დაკოპირდა!' : 'Product URL copied!',
        'link'
      );
    } catch {
      fallbackCopyText(shareUrl);
      showToast(
        language === 'ka' ? 'პროდუქტის ბმული დაკოპირდა!' : 'Product URL copied!',
        'link'
      );
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch {
      // silent
    }
    document.body.removeChild(textArea);
  };

  // Download product image
  const handleDownloadImage = async () => {
    const imageUrl = product.image || (product.images && product.images[0]) || '';
    if (!imageUrl) return;

    const safeTitle = (product.title || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const filename = `dbuy-${safeTitle}.jpg`;

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // 1. Share to Facebook
  const handleShareFacebook = async () => {
    // Copy text first so merchant can simply Ctrl+V / Paste into post box
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      fallbackCopyText(caption);
    }

    showToast(
      language === 'ka'
        ? 'ტექსტი დაკოპირდა! Facebook-ის ფანჯარაში უბრალოდ ჩააკარით (Paste / Ctrl+V).'
        : 'Text copied! Simply paste (Ctrl+V) into Facebook share post.',
      'fb'
    );

    // Open Facebook Sharer Dialog
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(caption)}`;
    window.open(fbUrl, '_blank', 'width=650,height=600,scrollbars=yes,resizable=yes');
  };

  // 2. Share to Instagram (Copy formatted text + Download high-res ad image + Open Instagram)
  const handleShareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      fallbackCopyText(caption);
    }

    // Auto-trigger image download for quick posting to feed / story
    await handleDownloadImage();

    showToast(
      language === 'ka'
        ? 'სარეკლამო ტექსტი დაკოპირდა და სურათი ჩამოიტვირთა! შექმენით პოსტი Instagram-ზე.'
        : 'Caption copied and image downloaded! Ready to publish on Instagram.',
      'ig'
    );

    // Open Instagram Web
    window.open('https://www.instagram.com/', '_blank');
  };

  // 3. Native mobile share sheet if supported
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.titleKa || product.title,
          text: caption,
          url: shareUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyText();
    }
  };

  // Reset to auto-generated text
  const handleResetCopy = () => {
    const generated = generateSocialAdPost({
      product,
      style,
      language,
    });
    setCaption(generated.caption);
    setStatusMessage(language === 'ka' ? 'ტექსტი აღდგა საწყის სარეკლამო ვერსიაზე' : 'Reset to default ad copy');
  };

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const displayTitle = language === 'ka' 
    ? (product.titleKa || product.title_ka || product.title)
    : (product.title_en || product.title || product.titleKa);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Megaphone className="w-5 h-5 text-white animate-bounce-subtle" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {language === 'ka' ? 'სარეკლამო პოსტი & გაზიარება' : 'Social Ad Post & Direct Share'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  FB & IG
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ka' 
                  ? 'გააზიარეთ სარეკლამოდ გამზადებული პოსტი პირად ან ბიზნეს გვერდებზე' 
                  : 'Ready-to-publish high-converting ad posts for Facebook, Instagram & Social Media'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Product Mini Card */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center space-x-3 overflow-hidden">
              <img
                src={product.image || (product.images && product.images[0]) || '/placeholder.png'}
                alt={product.title}
                className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {displayTitle}
                </h4>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {product.price} {language === 'ka' ? '₾' : '$'}
                  </span>
                  {product.origPrice && product.origPrice > product.price && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {product.origPrice} {language === 'ka' ? '₾' : '$'}
                    </span>
                  )}
                  {product.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {product.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0 pl-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                title={language === 'ka' ? 'სურათის გადმოწერა' : 'Download product image'}
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">{language === 'ka' ? 'სურათი' : 'Image'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-blue-600 text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                title={language === 'ka' ? 'ბმულის კოპირება' : 'Copy link'}
              >
                {copiedType === 'link' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">{language === 'ka' ? 'ბმული' : 'Link'}</span>
              </button>
            </div>
          </div>

          {/* Controls: Language & Style Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Style Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setStyle('sales')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  style === 'sales'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                🚀 {language === 'ka' ? 'სრული სარეკლამო' : 'Full Ad Copy'}
              </button>
              <button
                type="button"
                onClick={() => setStyle('story')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  style === 'story'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                ⚡ {language === 'ka' ? 'მოკლე / Story / Reels' : 'Story / Reels'}
              </button>
              <button
                type="button"
                onClick={() => setStyle('promo')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  style === 'promo'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                🎁 {language === 'ka' ? 'სპეციალური აქცია' : 'Flash Sale'}
              </button>
            </div>

            {/* Language Selection */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setLanguage('ka')}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  language === 'ka'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🇬🇪 ქართული
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>

          {/* Editable Post Content Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{language === 'ka' ? 'სარეკლამო პოსტის ტექსტი (შეგიძლიათ ჩაასწოროთ):' : 'Social Ad Copy (Editable):'}</span>
              </label>

              <button
                type="button"
                onClick={handleResetCopy}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                title={language === 'ka' ? 'საწყისი ტექსტის აღდგენა' : 'Reset copy'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'ka' ? 'აღდგენა' : 'Reset'}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={9}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed resize-y"
                placeholder={language === 'ka' ? 'სარეკლამო ტექსტი...' : 'Ad text...'}
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] font-medium text-slate-400 pointer-events-none bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                {caption.length} {language === 'ka' ? 'სიმბოლო' : 'chars'}
              </div>
            </div>
          </div>

          {/* Status notification toast */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Direct Sharing Action Buttons */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === 'ka' ? 'გაშვება სოციალურ ქსელებში:' : 'One-Click Publish & Share:'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleShareFacebook}
                className="p-3 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-between shadow-md shadow-blue-500/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Facebook className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-xs leading-none">
                      {language === 'ka' ? 'Facebook-ზე გაზიარება' : 'Share to Facebook'}
                    </div>
                    <div className="text-[10px] text-white/80 mt-1">
                      {language === 'ka' ? 'ტექსტი კოპირდება + ბმული იხსნება' : 'Auto-copies text & opens sharer'}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Instagram Button */}
              <button
                type="button"
                onClick={handleShareInstagram}
                className="p-3 rounded-2xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-between shadow-md shadow-pink-500/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-xs leading-none">
                      {language === 'ka' ? 'Instagram-ისთვის გამზადება' : 'Ready for Instagram'}
                    </div>
                    <div className="text-[10px] text-white/80 mt-1">
                      {language === 'ka' ? 'ტექსტის კოპირება + სურათის გადმოწერა' : 'Copies caption + downloads image'}
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-y-0.5 transition-all shrink-0" />
              </button>
            </div>

            {/* Auxiliary Tools: Copy Ad Copy, Copy Link, Native Mobile Share */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyText}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copiedType === 'text' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {language === 'ka' ? 'დაკოპირდა!' : 'Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'ka' ? 'ტექსტის კოპირება' : 'Copy Text'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {copiedType === 'link' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {language === 'ka' ? 'ბმული დაკოპირდა!' : 'Copied!'}
                    </span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'ka' ? 'ბმულის კოპირება' : 'Copy Link'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={hasNativeShare ? handleNativeShare : handleDownloadImage}
                className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {hasNativeShare ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === 'ka' ? 'მობილური გაზიარება' : 'Native Share'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === 'ka' ? 'სურათის გადმოწერა' : 'Download Photo'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {language === 'ka' ? 'DBUY სარეკლამო ასისტენტი' : 'DBUY Social Commerce Tool'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'ka' ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
