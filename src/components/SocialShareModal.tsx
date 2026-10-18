import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { 
  generateSocialAdPost, 
  getProductShareUrl, 
  AdPostStyle, 
  AdLanguage 
} from '../utils/socialAdGenerator';
import { getCachedGelRate, fetchCurrentGelRate } from '../utils/exchangeRate';
import { publishFacebookPhotoPost, publishFacebookFeedPost } from '../utils/facebookApi';
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
  Megaphone,
  Image as ImageIcon,
  FileText,
  Info,
  Layers
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
  const [showFbGuidance, setShowFbGuidance] = useState<boolean>(false);
  const [exchangeRate, setExchangeRate] = useState<number>(() => getCachedGelRate());

  // Fetch real-time current exchange rate
  useEffect(() => {
    let active = true;
    fetchCurrentGelRate().then((rate) => {
      if (active && rate > 0) {
        setExchangeRate(rate);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Update caption when language, style, or exchangeRate changes
  useEffect(() => {
    if (!product) return;
    const generated = generateSocialAdPost({
      product,
      style,
      language,
      exchangeRateGEL: exchangeRate,
    });
    setCaption(generated.caption);
    setStatusMessage('');
  }, [product, style, language, exchangeRate]);

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

  // Dynamic public share URL containing ?lang=en or ?lang=ka query parameter
  const shareUrl = getProductShareUrl(product, undefined, language);

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

  // Helper to get image as File object (for Web Share API with files)
  const getProductImageFile = async (): Promise<File | null> => {
    const imageUrl = product.image || (product.images && product.images[0]) || '';
    if (!imageUrl) return null;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const safeTitle = (product.title || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const filename = `dbuy-${safeTitle}.${ext}`;
      return new File([blob], filename, { type: blob.type || 'image/jpeg' });
    } catch {
      return null;
    }
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

  // 1. Share full Photo Post to Facebook (Direct Graph API /me/photos or Photo Upload + Text Copy + Open Composer)
  const handleShareFacebookFullPost = async () => {
    const imageUrl = product.image || (product.images && product.images[0]) || '';

    // Attempt direct Facebook Graph API Photo Post
    try {
      const apiResult = await publishFacebookPhotoPost({
        imageUrl,
        message: caption,
      });

      if (apiResult.success) {
        showToast(
          language === 'ka'
            ? `🎉 ფოტო-პოსტი წარმატებით გამოქვეყნდა Facebook-ზე! (ID: ${apiResult.photoId || apiResult.postId})`
            : `🎉 Photo Post successfully published to Facebook! (ID: ${apiResult.photoId || apiResult.postId})`,
          'fb'
        );
        return;
      }
    } catch {
      // Continue to fallback photo-post workflow if direct API key not configured
    }

    // 1. Copy generated ad copy to clipboard
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      fallbackCopyText(caption);
    }

    // 2. Check if mobile Web Share API with files is supported
    const imageFile = await getProductImageFile();
    if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: displayTitle,
          text: caption,
          url: shareUrl,
        });
        showToast(
          language === 'ka'
            ? 'სურათი და სარეკლამო ტექსტი გაიგზავნა Facebook Photo Post-ის მენიუში!'
            : 'Image & ad copy sent to Facebook Photo Post share menu!',
          'fb'
        );
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // 3. Automatically download main product photo for direct Facebook photo upload
    await handleDownloadImage();

    // 4. Show instructional guidance banner
    setShowFbGuidance(true);
    showToast(
      language === 'ka'
        ? '📸 ფოტო ჩამოიტვირთა! 📝 ტექსტი დაკოპირდა! ატვირთეთ ფოტო Facebook-ზე.'
        : '📸 Photo downloaded! 📝 Ad copy copied! Ready for Facebook photo upload.',
      'fb'
    );

    // 5. Open Facebook post composer / feed in a new window for direct photo upload
    window.open('https://www.facebook.com/', '_blank');
  };

  // 2. Share via Facebook Link Sharer Dialog or Feed Graph API
  const handleShareFacebookLink = async () => {
    // Attempt direct Facebook Graph API Link Post with message caption
    try {
      const apiResult = await publishFacebookFeedPost({
        link: shareUrl,
        message: caption,
      });

      if (apiResult.success) {
        showToast(
          language === 'ka'
            ? `🎉 ბმულის პოსტი წარმატებით გამოქვეყნდა Facebook-ზე! (ID: ${apiResult.postId})`
            : `🎉 Link Post successfully published to Facebook with caption message! (ID: ${apiResult.postId})`,
          'fb'
        );
        return;
      }
    } catch {
      // Continue to sharer dialog if direct API token not configured
    }

    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      fallbackCopyText(caption);
    }

    await handleDownloadImage();

    setShowFbGuidance(true);
    showToast(
      language === 'ka'
        ? 'ტექსტი დაკოპირდა! Facebook-ის ფანჯარაში უბრალოდ ჩააკარით (Paste / Ctrl+V).'
        : 'Text copied! Simply paste (Ctrl+V) into Facebook share post.',
      'fb'
    );

    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'width=650,height=600,scrollbars=yes,resizable=yes');
  };

  const handleShareFacebook = handleShareFacebookFullPost;

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
      exchangeRateGEL: exchangeRate,
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                <div className="flex items-center space-x-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {language === 'ka'
                      ? `${(Math.round((product.price || 0) * exchangeRate * 100) / 100).toFixed(2)} ₾`
                      : `$${(product.price || 0).toFixed(2)}`}
                  </span>
                  {product.origPrice && product.origPrice > product.price && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {language === 'ka'
                        ? `${(Math.round(product.origPrice * exchangeRate * 100) / 100).toFixed(2)} ₾`
                        : `$${product.origPrice.toFixed(2)}`}
                    </span>
                  )}
                  {language === 'ka' && (
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      (1$ ≈ {exchangeRate.toFixed(2)}₾)
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
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white'
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
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white'
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
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white'
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
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-200'
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
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-200'
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
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {language === 'ka' ? 'გაშვება სოციალურ ქსელებში:' : 'One-Click Publish & Share:'}
              </h4>
              <button
                type="button"
                onClick={() => setShowFbGuidance(!showFbGuidance)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{language === 'ka' ? (showFbGuidance ? 'ინსტრუქციის დამალვა' : 'როგორ მუშაობს?') : (showFbGuidance ? 'Hide Guide' : 'How it works?')}</span>
              </button>
            </div>

            {/* Instructional Guidance Card */}
            {showFbGuidance && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 space-y-2.5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-black text-xs text-blue-800 dark:text-blue-300">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                    <span>{language === 'ka' ? 'როგორ გამოვაქვეყნოთ სურათი და სარეკლამო ტექსტი Facebook-ზე:' : 'How to publish photo & ad copy to Facebook:'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFbGuidance(false)}
                    className="text-blue-500 hover:text-blue-700 text-xs font-bold cursor-pointer px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start space-x-2.5 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
                    <span className="text-lg shrink-0">📸</span>
                    <div>
                      <span className="font-black block text-slate-900 dark:text-white">
                        {language === 'ka' ? '1. სურათი ჩამოტვირთულია' : '1. Photo Downloaded'}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight block mt-0.5">
                        {language === 'ka' 
                          ? 'Facebook-ის ფანჯარაში დააჭირეთ „ფოტოს/ვიდეოს დამატება“-ს და აირჩიეთ გადმოწერილი ფაილი.' 
                          : 'In Facebook composer, click "Add Photo/Video" and select the downloaded file.'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2.5 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
                    <span className="text-lg shrink-0">📝</span>
                    <div>
                      <span className="font-black block text-slate-900 dark:text-white">
                        {language === 'ka' ? '2. ტექსტი დაკოპირებულია' : '2. Text Copied'}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight block mt-0.5">
                        {language === 'ka' 
                          ? 'პოსტის ტექსტის ველში გააკეთეთ ჩასმა (Paste / Ctrl+V ან ტელეფონზე ეკრანზე თითის დაჭერით „ჩასმა“).' 
                          : 'In the post text box, paste (Ctrl+V / Long press -> Paste).'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social Share Primary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Facebook Full Post Button (Photo + Text) - RECOMMENDED */}
              <button
                type="button"
                onClick={handleShareFacebookFullPost}
                className="p-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-between shadow-md shadow-blue-500/25 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Facebook className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-xs leading-none">
                        {language === 'ka' ? 'Facebook სრული პოსტი' : 'Facebook Full Post'}
                      </span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-900 dark:text-white tracking-wide">
                        {language === 'ka' ? 'ფოტო + ტექსტი' : 'Photo + Text'}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/90 mt-1">
                      {language === 'ka' ? 'ავტომატურად იწერს სურათს და აკოპირებს ტექსტს' : 'Auto-downloads image & copies ad text'}
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Instagram Button (Photo + Text) */}
              <button
                type="button"
                onClick={handleShareInstagram}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-between shadow-md shadow-pink-500/25 transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Instagram className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-xs leading-none">
                        {language === 'ka' ? 'Instagram-ზე გაზიარება' : 'Share to Instagram'}
                      </span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white/25 text-white tracking-wide">
                        {language === 'ka' ? 'ფოტო + ტექსტი' : 'Photo + Text'}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/90 mt-1">
                      {language === 'ka' ? 'სურათის გადმოწერა + ტექსტის კოპირება' : 'Copies caption + downloads image'}
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-white/80 group-hover:text-white group-hover:translate-y-0.5 transition-all shrink-0" />
              </button>
            </div>

            {/* Secondary Option: Facebook Sharer Link Card */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={handleShareFacebookLink}
                className="w-full p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-200 border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    {language === 'ka' ? 'ან გააზიარეთ Facebook-ის ბმულის ბარათით (Sharer)' : 'Or share via Facebook Interactive Link Card'}
                  </span>
                </div>
                <span className="text-[10px] font-normal text-blue-700 dark:text-blue-300">
                  {language === 'ka' ? 'ბმული + ტექსტი' : 'Link + Caption'}
                </span>
              </button>
            </div>

            {/* Auxiliary Tools: Copy Ad Copy, Copy Link, Download Image, Native Mobile Share */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
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
                onClick={handleDownloadImage}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span>{language === 'ka' ? 'სურათის ჩამოტვირთვა' : 'Save Photo'}</span>
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
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {hasNativeShare ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === 'ka' ? 'მობილური გაზიარება' : 'Native Share'}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>{language === 'ka' ? 'ფოტოს გახსნა' : 'View Image'}</span>
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
