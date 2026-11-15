import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { parseVariants, parseImages } from '../utils/productParsing';
import {
  publishFacebookPublish,
  publishFacebookFeedPost,
  checkFacebookConnectionStatus,
  FacebookConnectionStatus,
} from '../utils/facebookApi';
import {
  buildInstagramCarouselCaption,
  buildInstagramLinkInBioCta,
  checkInstagramConnectionStatus,
  publishInstagramCarousel,
  InstagramConnectionStatus,
  InstagramPublishProgress,
} from '../utils/instagramApi';
import { InstagramOriginalLogo } from './InstagramLogo';
import {
  X,
  Megaphone,
  RefreshCw,
  Copy,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  ExternalLink,
  KeyRound,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Layers,
  Sparkles,
  Loader2,
  GripVertical,
} from 'lucide-react';

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
const LEGACY_FB_TOKEN_PREFIXES = [
  "EAAXgEb3A7ZCABSzaHWiv",
  "EAAXgEb3A7ZCABS9GaZCahs",
  "EAAXgEb3A7ZCABSZCD2vob3",
  "EAAXgEb3A7ZCABSZCLaexua",
  "EAAXgEb3A7ZCABS7rvntxeTp",
  "EAAXgEb3A7ZCABS2h0fORg",
  "EAAXgEb3A7ZCABS4Gsz4x",
];
const FB_PAGE_URL = "https://www.facebook.com/Dbuystore";

function loadSavedFbToken(): string {
  if (typeof window === 'undefined') return '';
  const stored = (localStorage.getItem('dbuy_fb_page_token') || '').trim();
  if (!stored || LEGACY_FB_TOKEN_PREFIXES.some((prefix) => stored.startsWith(prefix))) {
    localStorage.removeItem('dbuy_fb_page_token');
    return '';
  }
  return stored;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({ product, isOpen, onClose, isKa }) => {
  const { addToast, setCurrentPage } = useStore();
  const [activePlatform, setActivePlatform] = useState<'facebook' | 'instagram'>('facebook');

  // Shared Meta Token & Connection State
  const [pageId, setPageId] = useState<string>(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('dbuy_fb_page_id') : null;
    return (cached && cached !== 'me' && cached !== '3722589421239772') ? cached : FB_PAGE_ID;
  });
  const [customToken, setCustomToken] = useState<string>(() => loadSavedFbToken());
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenEditor, setShowTokenEditor] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [fbConnection, setFbConnection] = useState<FacebookConnectionStatus | null>(null);
  const [igConnection, setIgConnection] = useState<InstagramConnectionStatus | null>(null);
  const [isCheckingIgStatus, setIsCheckingIgStatus] = useState(false);

  // Facebook Publisher State
  const [postMode, setPostMode] = useState<'feed' | 'gallery'>('feed');
  const [caption, setCaption] = useState<string>('');
  const [buttonText, setButtonText] = useState<string>(isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook');
  const [buttonColor, setButtonColor] = useState<string>('#1877F2');
  const [variant, setVariant] = useState(0);
  const [copied, setCopied] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{ type: 'success' | 'error'; message: string; postId?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Instagram Carousel Publisher State
  const [igSelectedImages, setIgSelectedImages] = useState<string[]>([]);
  const [igCaption, setIgCaption] = useState<string>('');
  const [igVariant, setIgVariant] = useState(0);
  const [igCopied, setIgCopied] = useState(false);
  const [igLinkCopied, setIgLinkCopied] = useState(false);
  const [igActiveSlide, setIgActiveSlide] = useState(0);
  const [isPublishingIg, setIsPublishingIg] = useState(false);
  const [igProgress, setIgProgress] = useState<InstagramPublishProgress | null>(null);
  const [igStatusAlert, setIgStatusAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    permalink?: string;
    mediaId?: string;
  } | null>(null);
  const [isEnhancingIgCopy, setIsEnhancingIgCopy] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const igTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Verify live Facebook & Instagram Graph API connection status when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const saved = loadSavedFbToken();
    setCustomToken(saved);
    setIsCheckingStatus(true);
    setIsCheckingIgStatus(true);

    checkFacebookConnectionStatus({ accessToken: saved || undefined, pageId })
      .then((status) => {
        if (cancelled) return;
        setFbConnection(status);
        if (status.connected && status.pageId) {
          setPageId(status.pageId);
          localStorage.setItem('dbuy_fb_page_id', status.pageId);
          if (status.resolvedPageToken && saved) {
            setCustomToken(status.resolvedPageToken);
            localStorage.setItem('dbuy_fb_page_token', status.resolvedPageToken);
          }
          setShowTokenEditor(false);
        } else if (status.expired && saved) {
          localStorage.removeItem('dbuy_fb_page_token');
          setCustomToken('');
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingStatus(false);
      });

    checkInstagramConnectionStatus({ accessToken: saved || undefined, pageId })
      .then((igStatus) => {
        if (cancelled) return;
        setIgConnection(igStatus);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingIgStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Populate all product gallery images when product changes or modal opens
  useEffect(() => {
    if (!isOpen || !product) return;

    const urls = new Set<string>();
    const addUrl = (u: any) => {
      if (!u || typeof u !== 'string') return;
      const clean = u.trim();
      if (!clean) return;
      if (clean.startsWith('data:')) {
        urls.add(clean);
      } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (clean.includes('/uploads/')) {
          const uploadPath = clean.substring(clean.indexOf('/uploads/'));
          urls.add(`https://www.dbuystore.com${uploadPath}`);
        } else {
          urls.add(clean);
        }
      } else if (clean.startsWith('/')) {
        urls.add(`https://www.dbuystore.com${clean}`);
      } else {
        urls.add(`https://www.dbuystore.com/${clean}`);
      }
    };

    addUrl(product.image);
    parseImages(product.images).forEach(addUrl);
    parseImages((product as any).gallery).forEach(addUrl);
    parseVariants(product.variants).forEach((v) => {
      if (!v || typeof v !== 'object') return;
      parseImages((v as any).images).forEach(addUrl);
      addUrl((v as any).image);
      addUrl((v as any).imageUrl);
      addUrl((v as any).img);
    });

    const allUrls = Array.from(urls);
    setImages(allUrls);
    setSelectedImages(allUrls);
    setIgSelectedImages(allUrls.slice(0, 10));
    setIgActiveSlide(0);
    setStatusAlert(null);
    setIgStatusAlert(null);
    setIgProgress(null);
    setButtonColor('#1877F2');
    setButtonText(
      postMode === 'feed'
        ? (isKa ? '🚀 გამოაქვეყნე Facebook-ზე' : '🚀 Publish Feed Post to Facebook')
        : (isKa ? '🚀 გამოაქვეყნე გალერეა Facebook-ზე' : '🚀 Publish Multi-Photo Gallery')
    );
  }, [product, isOpen]);

  useEffect(() => {
    if (isOpen && product) {
      setCaption(buildHighConvertingAdCopy(product, 0));
      setIgCaption(buildInstagramCarouselCaption(product, 0, Boolean(isKa)));
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (igActiveSlide >= igSelectedImages.length && igSelectedImages.length > 0) {
      setIgActiveSlide(igSelectedImages.length - 1);
    }
  }, [igSelectedImages.length, igActiveSlide]);

  const setAsMainPhoto = (url: string) => {
    setImages(prev => [url, ...prev.filter(u => u !== url)]);
    setSelectedImages(prev => [url, ...prev.filter(u => u !== url)]);
  };

  const toggleSelectPhoto = (url: string) => {
    setSelectedImages(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      }
      return [...prev, url];
    });
  };

  const selectAllPhotos = () => {
    setSelectedImages(images);
  };

  const regenerate = () => {
    if (!product) return;
    setVariant(v => v + 1);
    setCaption(buildHighConvertingAdCopy(product, variant + 1));
  };

  const handleCopyText = async () => {
    const success = await copyTextSafely(caption, textareaRef.current);
    if (success) {
      setCopied(true);
      addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Copy copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Instagram Carousel Selection & Sorter Handlers
  const toggleIgPhoto = (url: string) => {
    setIgSelectedImages((prev) => {
      if (prev.includes(url)) {
        return prev.filter((u) => u !== url);
      }
      if (prev.length >= 10) {
        addToast(
          isKa ? 'Instagram კარუსელი მაქსიმუმ 10 ფოტოს იტევს.' : 'Instagram Carousels allow a maximum of 10 photos.',
          'warning'
        );
        return prev;
      }
      return [...prev, url];
    });
  };

  const selectUpTo10IgPhotos = () => {
    setIgSelectedImages(images.slice(0, 10));
    setIgActiveSlide(0);
  };

  const moveIgSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= igSelectedImages.length) return;
    setIgSelectedImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setIgActiveSlide(target);
  };

  const makeIgLeadSlide = (index: number) => {
    if (index <= 0 || index >= igSelectedImages.length) return;
    setIgSelectedImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.unshift(moved);
      return next;
    });
    setIgActiveSlide(0);
  };

  const handleDropSlide = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    setIgSelectedImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setIgActiveSlide(targetIndex);
    setDragIndex(null);
  };

  const regenerateIgCaption = async () => {
    if (!product) return;
    const nextIdx = igVariant + 1;
    setIgVariant(nextIdx);
    setIgCaption(buildInstagramCarouselCaption(product, nextIdx, Boolean(isKa)));
  };

  const enhanceIgCaptionWithAi = async () => {
    if (!product || isEnhancingIgCopy) return;
    setIsEnhancingIgCopy(true);
    try {
      const res = await fetch('/api/generate-product-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          titleKa: product.titleKa,
          category: product.category,
          price: product.price,
          images: igSelectedImages.slice(0, 3),
          tone: 'high-converting',
          language: isKa ? 'ka' : 'en',
        }),
      });
      const json: any = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const d = json.data;
        const featuresList: string[] = isKa
          ? (Array.isArray(d.featuresKa) && d.featuresKa.length ? d.featuresKa : [])
          : (Array.isArray(d.featuresEn) && d.featuresEn.length ? d.featuresEn : []);
        const summary = isKa ? (d.descriptionKa || product.descriptionKa || product.description) : (d.descriptionEn || product.description);
        const orig = Number(product.origPrice ?? (product as any).original_price ?? 0);
        const priceLine = orig > product.price
          ? `💰 Special Offer: $${product.price} (Was $${orig})`
          : `💰 Price: $${product.price}`;
        const bullets = featuresList.slice(0, 3).map((f) => `✦ ${f.replace(/^[•\-\*\s]+/, '').trim()}`).join('\n');
        const cta = buildInstagramLinkInBioCta();
        setIgCaption(
          `✨ ${isKa ? (d.titleKa || product.titleKa || product.title) : (d.titleEn || product.title)}\n\n` +
          `${(summary || '').slice(0, 180)}\n\n` +
          (bullets ? `${bullets}\n\n` : '') +
          `${priceLine}\n\n` +
          `${cta}\n\n` +
          `#DBUYStore #InstagramShop #SmartLiving #TrendingNow`
        );
        addToast(isKa ? '✨ AI ტექსტი განახლდა!' : '✨ AI Instagram caption generated!', 'success');
      } else {
        await regenerateIgCaption();
      }
    } catch {
      await regenerateIgCaption();
    } finally {
      setIsEnhancingIgCopy(false);
    }
  };

  const handleCopyIgCaption = async () => {
    const success = await copyTextSafely(igCaption, igTextareaRef.current);
    if (success) {
      setIgCopied(true);
      addToast(isKa ? '✅ Instagram ტექსტი დაკოპირდა!' : '✅ Instagram caption copied!', 'success');
      setTimeout(() => setIgCopied(false), 2000);
    }
  };

  const directBioProductUrl = product
    ? `https://dbuystore.com/b/${encodeURIComponent((product.customSlug && product.customSlug.trim()) ? product.customSlug.trim() : product.id)}`
    : 'https://dbuystore.com/bio';

  const handleCopyDirectProductLink = async () => {
    const success = await copyTextSafely(directBioProductUrl);
    if (success) {
      setIgLinkCopied(true);
      addToast(
        isKa ? '🔗 პროდუქტის პირდაპირი ბმული დაკოპირდა!' : '🔗 Direct product link copied!',
        'success'
      );
      setTimeout(() => setIgLinkCopied(false), 2000);
    }
  };

  // Safe early return placed AFTER all React hooks have been called unconditionally
  if (!isOpen || !product) {
    return null;
  }

  const downloadPhotosAndOpenFacebook = async () => {
    const photosToDownload = selectedImages.length > 0 ? selectedImages : images;
    for (let i = 0; i < photosToDownload.length; i++) {
      const img = photosToDownload[i];
      const href = img.startsWith('data:') ? img : `https://wsrv.nl/?url=${encodeURIComponent(img)}&output=jpg`;
      const a = document.createElement('a');
      a.href = href;
      a.download = `dbuy-photo-${i + 1}.jpg`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 250));
    }
    window.open(FB_PAGE_URL, '_blank');
  };

  const handleVerifyAndSaveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      addToast(isKa ? 'შეიყვანეთ Meta Access Token' : 'Please paste a Meta Access Token', 'error');
      return;
    }

    setIsSavingToken(true);
    try {
      const [status, igStatus] = await Promise.all([
        checkFacebookConnectionStatus({
          accessToken: trimmed,
          pageId: pageId || FB_PAGE_ID,
        }),
        checkInstagramConnectionStatus({
          accessToken: trimmed,
          pageId: pageId || FB_PAGE_ID,
        }),
      ]);

      if (status.connected || igStatus.connected) {
        const finalToken = status.resolvedPageToken || trimmed;
        localStorage.setItem('dbuy_fb_page_token', finalToken);
        setCustomToken(finalToken);
        if (status.pageId) {
          setPageId(status.pageId);
          localStorage.setItem('dbuy_fb_page_id', status.pageId);
        }
        setFbConnection(status);
        setIgConnection(igStatus);
        setTokenInput('');
        setShowTokenEditor(false);
        setStatusAlert(null);
        setIgStatusAlert(null);
        addToast(
          isKa
            ? `✅ დაკავშირდა: ${status.pageName || '@Dbuystore'} & @${igStatus.username || 'dbuy.store'}`
            : `✅ Connected to ${status.pageName || '@Dbuystore'} & @${igStatus.username || 'dbuy.store'}!`,
          'success'
        );
      } else {
        addToast(`❌ ${status.error || igStatus.error || 'Token verification failed'}`, 'error');
        setFbConnection(status);
        setIgConnection(igStatus);
      }
    } finally {
      setIsSavingToken(false);
    }
  };

  const handlePublishToFacebook = async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      setButtonText(isKa ? '⏳ მიმდინარეობს ატვირთვა...' : '⏳ Publishing to Facebook...');
      setStatusAlert(null);

      const productLink = `https://www.dbuystore.com/b/${product.id}`;
      const adMessage = caption.includes(productLink)
        ? caption
        : `${caption}\n\n👉 Order yours today: ${productLink}`;

      const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;

      const result = await publishFacebookFeedPost({
        link: productLink,
        message: adMessage,
        accessToken: customToken || undefined,
        pageId: activePageId,
      });

      if (result.success) {
        const msg = isKa ? 'პოსტი წარმატებით აიტვირთა!' : 'Post published successfully!';
        addToast(`✅ ${msg}`, 'success');
        setStatusAlert({ type: 'success', message: msg, postId: result.postId });
        setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Published Successfully!');
        setButtonColor('#10B981');
      } else if (result.requiresReconnect) {
        const errMsg = result.error || (isKa ? 'Facebook ტოკენის ვადა ამოიწურა — გთხოვთ განაახლოთ' : 'Facebook session expired — please update your Page Access Token above.');
        addToast(`⚠️ ${errMsg}`, 'error');
        setFbConnection({ connected: false, expired: true, requiresReconnect: true, error: errMsg });
        setShowTokenEditor(true);
        setStatusAlert({ type: 'error', message: errMsg });
        setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Feed Post');
        setButtonColor('#1877F2');
      } else {
        await copyTextSafely(caption, textareaRef.current);
        const fbSharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`;
        window.open(fbSharerUrl, '_blank', 'width=620,height=600');

        const msg = isKa
          ? 'ტექსტი დაკოპირდა! Facebook-ის ფანჯარა გაიხსნა @Dbuystore გვერდზე გასაზიარებლად.'
          : 'Ad copy copied! Facebook composer opened to share to @Dbuystore.';
        addToast(`🚀 ${msg}`, 'info');
        setStatusAlert({ type: 'success', message: msg });
        setButtonText(isKa ? '✅ გახსნილია FB-ზე' : '🚀 Opened on Facebook');
        setButtonColor('#1877F2');
      }
    } catch {
      const productLink = `https://www.dbuystore.com/b/${product.id}`;
      await copyTextSafely(caption, textareaRef.current);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`, '_blank', 'width=620,height=600');
      const msg = isKa ? 'Facebook გაიხსნა!' : 'Opened Facebook composer!';
      setStatusAlert({ type: 'success', message: msg });
      setButtonText(isKa ? '✅ გახსნილია FB-ზე' : '🚀 Opened on Facebook');
    } finally {
      setIsPublishing(false);
    }
  };

  const publishGalleryToFacebook = async () => {
    if (isPublishing) return;

    if (selectedImages.length === 0) {
      const emptyMsg = isKa ? 'აირჩიეთ მინიმუმ ერთი ფოტო გალერეისთვის.' : 'Please select at least one photo for the gallery.';
      addToast(`⚠️ ${emptyMsg}`, 'error');
      setStatusAlert({ type: 'error', message: emptyMsg });
      return;
    }

    setIsPublishing(true);
    setButtonText(
      isKa
        ? `⏳ იტვირთება ${selectedImages.length} ფოტო გალერეაში...`
        : `⏳ Uploading ${selectedImages.length} Photos to Gallery...`
    );
    setStatusAlert(null);

    try {
      const copiedText = await copyTextSafely(caption, textareaRef.current);
      if (copiedText) {
        addToast(isKa ? '✅ ტექსტი დაკოპირდა!' : '✅ Ad Text Copied!', 'success');
      }

      const productShareUrl = `https://www.dbuystore.com/b/${product.id}`;
      const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;

      const res = await publishFacebookPublish({
        images: selectedImages,
        message: caption,
        link: productShareUrl,
        accessToken: customToken || undefined,
        pageId: activePageId,
      });

      if (res.success && res.postId) {
        const count = res.attachedCount ?? selectedImages.length;
        const msg = isKa
          ? `${count}-ფოტოიანი გალერეა ერთ პოსტად წარმატებით გამოქვეყნდა!`
          : `Successfully published ${count}-photo gallery into a single Facebook post!`;
        addToast(`✅ ${msg}`, 'success');
        setStatusAlert({ type: 'success', message: msg, postId: res.postId });
        setButtonText(isKa ? '✅ წარმატებით აიტვირთა!' : '🚀 Gallery Published!');
        setButtonColor('#10B981');
      } else {
        const errMsg = res.error || (isKa ? 'გალერეის გამოქვეყნება ვერ მოხერხდა' : 'Failed to publish multi-photo gallery post');
        if (res.requiresReconnect) {
          setFbConnection({ connected: false, expired: true, requiresReconnect: true, error: errMsg });
          setShowTokenEditor(true);
        }
        addToast(`❌ ${errMsg}`, 'error');
        setStatusAlert({ type: 'error', message: errMsg });
        setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Multi-Photo Gallery');
        setButtonColor('#1877F2');
      }
    } catch (err: any) {
      const errMsg = err?.message || (isKa ? 'ქსელური შეცდომა' : 'Network error publishing gallery');
      addToast(`❌ ${errMsg}`, 'error');
      setStatusAlert({ type: 'error', message: errMsg });
      setButtonText(isKa ? '🚀 სცადეთ თავიდან' : '🚀 Retry Multi-Photo Gallery');
      setButtonColor('#1877F2');
    } finally {
      setIsPublishing(false);
    }
  };

  // One-Click Instagram Carousel Publisher Handler
  const handlePublishToInstagram = async () => {
    if (isPublishingIg) return;

    if (igSelectedImages.length < 2 || igSelectedImages.length > 10) {
      const errMsg = isKa
        ? 'Instagram კარუსელისთვის აირჩიეთ 2-დან 10-მდე ფოტო.'
        : 'Please select between 2 and 10 high-resolution photos for an Instagram Carousel.';
      addToast(`⚠️ ${errMsg}`, 'error');
      setIgStatusAlert({ type: 'error', message: errMsg });
      return;
    }

    setIsPublishingIg(true);
    setIgStatusAlert({ type: 'info', message: isKa ? 'მედია ფაილების ატვირთვა...' : 'Uploading media...' });
    setIgProgress({ stage: 'uploading', message: 'Uploading media...' });

    const activePageId = (pageId && pageId !== 'me') ? pageId : FB_PAGE_ID;
    const cleanedIgCaption = igCaption
      .replace(/\(?\s*or\s+visit\s+dbuystore\.com\s*&\s*search\s*ID:\s*[A-Za-z0-9_-]+\s*\)?/gi, '')
      .trim();
    const hasBioCta =
      cleanedIgCaption.includes('@dbuy.store') ||
      cleanedIgCaption.toLowerCase().includes('link in our bio') ||
      cleanedIgCaption.toLowerCase().includes('link in bio') ||
      cleanedIgCaption.includes('dbuystore.com/bio');
    const finalCaption = hasBioCta
      ? cleanedIgCaption
      : `${cleanedIgCaption}\n\n${buildInstagramLinkInBioCta()}`;

    try {
      const result = await publishInstagramCarousel(
        {
          product,
          images: igSelectedImages,
          caption: finalCaption,
          accessToken: customToken || undefined,
          pageId: activePageId,
          igUserId: igConnection?.igUserId,
        },
        (progress) => {
          setIgProgress(progress);
          setIgStatusAlert({
            type: progress.stage === 'published' ? 'success' : 'info',
            message: progress.message,
          });
        }
      );

      if (result.success) {
        const successMsg = isKa
          ? `წარმატებით გამოქვეყნდა @${igConnection?.username || 'dbuy.store'}-ზე!`
          : `Published successfully to @${igConnection?.username || 'dbuy.store'}!`;
        setIgProgress({ stage: 'published', message: successMsg });
        setIgStatusAlert({
          type: 'success',
          message: successMsg,
          permalink: result.permalink || 'https://www.instagram.com/dbuy.store/',
          mediaId: result.mediaId,
        });
        addToast(`✅ ${successMsg}`, 'success');
      } else {
        const errMsg = result.error || 'Failed to publish carousel to Instagram.';
        if (result.requiresReconnect) {
          setIgConnection((prev) => ({
            ...prev,
            connected: false,
            expired: true,
            requiresReconnect: true,
            error: errMsg,
          }));
          setShowTokenEditor(true);
        }
        setIgProgress({ stage: 'error', message: errMsg });
        setIgStatusAlert({ type: 'error', message: errMsg });
        addToast(`❌ ${errMsg}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Network error publishing carousel to Instagram.';
      setIgProgress({ stage: 'error', message: errMsg });
      setIgStatusAlert({ type: 'error', message: errMsg });
      addToast(`❌ ${errMsg}`, 'error');
    } finally {
      setIsPublishingIg(false);
    }
  };

  const igHandle = `@${igConnection?.username || 'dbuy.store'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
              {activePlatform === 'facebook'
                ? (isKa ? 'Facebook პოსტის გამომქვეყნებელი' : 'Facebook Post Publisher')
                : (isKa ? 'Instagram კარუსელის გამომქვეყნებელი' : 'Instagram Post Publisher')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activePlatform === 'facebook'
                ? (isKa ? 'ავტომატური გამოქვეყნება @Dbuystore გვერდზე' : 'Direct one-click publishing to @Dbuystore page')
                : (isKa ? `ავტომატური კარუსელის გამოქვეყნება ${igHandle}-ზე` : `Direct one-click carousel publishing to ${igHandle}`)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Switcher: Facebook Post Publisher vs Instagram Post Publisher */}
        <div className="px-5 pt-4">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActivePlatform('facebook')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'facebook'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>{isKa ? 'Facebook პოსტი' : 'Facebook Post Publisher'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePlatform('instagram')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activePlatform === 'instagram'
                  ? 'bg-white dark:bg-slate-900 text-pink-600 dark:text-pink-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <InstagramOriginalLogo size="xs" showHoverEffect={false} />
              <span>{isKa ? 'Instagram კარუსელი (@dbuy.store)' : 'Instagram Post Publisher'}</span>
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ============================================================== */}
          {/* FACEBOOK POST PUBLISHER TAB (100% Preserved)                   */}
          {/* ============================================================== */}
          {activePlatform === 'facebook' && (
            <>
              {/* Live Facebook Graph API Connection Status */}
              <div className={`rounded-xl border p-3 text-xs sm:text-sm transition-colors ${
                fbConnection?.connected
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : isCheckingStatus
                  ? 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold min-w-0">
                    {isCheckingStatus ? (
                      <span>⏳ {isKa ? 'მოწმდება Facebook კავშირი...' : 'Checking Facebook Graph API connection...'}</span>
                    ) : fbConnection?.connected ? (
                      <span className="truncate">
                        ✅ {isKa
                          ? `დაკავშირებულია ${fbConnection.pageName || '@Dbuystore'}-თან (Graph API აქტიურია)`
                          : `Connected to ${fbConnection.pageName || '@Dbuystore'} (Graph API Active)`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 min-w-0">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {fbConnection?.expired
                            ? (isKa ? 'Facebook სესიის ვადა ამოიწურა — საჭიროა ტოკენის განახლება' : 'Facebook access token expired — reconnect to publish')
                            : (isKa ? 'საჭიროა Facebook Page Access Token' : 'Facebook Page Access Token required')}
                        </span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenEditor(v => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-current/20 shrink-0 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showTokenEditor ? (isKa ? 'დამალვა' : 'Hide') : (fbConnection?.connected ? (isKa ? 'ტოკენის შეცვლა' : 'Update Token') : (isKa ? 'ტოკენის განახლება' : 'Reconnect Token'))}</span>
                  </button>
                </div>

                {showTokenEditor && (
                  <div className="mt-3 pt-3 border-t border-current/15 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-90">
                      <span>
                        {isKa
                          ? 'ჩასვით ახალი Page Access Token ან User Access Token (Graph API Explorer-იდან):'
                          : 'Paste a fresh Page Access Token or User Access Token from Meta Graph API Explorer:'}
                      </span>
                      <a
                        href={`https://developers.facebook.com/tools/explorer/?app_id=${FB_APP_ID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>{isKa ? 'Graph API Explorer-ის გახსნა' : 'Open Graph API Explorer'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="EAA..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={isSavingToken || !tokenInput.trim()}
                        onClick={handleVerifyAndSaveToken}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isSavingToken ? (isKa ? 'მოწმდება...' : 'Verifying...') : (isKa ? 'შემოწმება & შენახვა' : 'Verify & Connect')}
                      </button>
                    </div>
                  </div>
                )}
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
                  <div className="flex justify-between items-center mb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isKa ? 'გალერეის ფოტოები (დააკლიკეთ მთავარ ფოტოდ ასარჩევად)' : 'Gallery Photos (Click photo to set Lead, toggle check to include)'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedImages.length < images.length && (
                        <button
                          type="button"
                          onClick={selectAllPhotos}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isKa ? 'ყველას მონიშვნა' : 'Select All'}
                        </button>
                      )}
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                        {selectedImages.length}/{images.length} {isKa ? 'არჩეული' : 'selected'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {images.map((url, i) => {
                      const selectedIdx = selectedImages.indexOf(url);
                      const isSelected = selectedIdx !== -1;
                      const isMain = selectedIdx === 0;
                      return (
                        <div
                          key={url + i}
                          onClick={() => setAsMainPhoto(url)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all group ${
                            isMain
                              ? 'border-blue-500 scale-[1.03] shadow-xs'
                              : isSelected
                              ? 'border-blue-400/70 opacity-95 hover:opacity-100'
                              : 'border-slate-300 dark:border-slate-700 opacity-45 hover:opacity-75'
                          }`}
                        >
                          <img
                            src={url}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPhoto(url);
                            }}
                            title={isSelected ? (isKa ? 'ამოღება' : 'Remove from gallery') : (isKa ? 'დამატება' : 'Include in gallery')}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition shadow-xs cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/90 text-slate-500 border border-slate-300'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3" /> : ''}
                          </button>
                          {isSelected && (
                            <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black leading-none ${
                              isMain ? 'bg-blue-600 text-white' : 'bg-slate-900/75 text-white'
                            }`}>
                              {isMain ? (isKa ? 'მთავარი' : 'Lead #1') : `#${selectedIdx + 1}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
                    <span className="break-words">{statusAlert.message}</span>
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
                  {statusAlert.type === 'error' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (postMode === 'gallery') {
                          downloadPhotosAndOpenFacebook();
                        } else {
                          const productLink = `https://www.dbuystore.com/b/${product.id}`;
                          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(caption)}`, '_blank');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
                    >
                      <span>{postMode === 'gallery' ? (isKa ? 'ფოტოების ჩამოტვირთვა & FB' : 'Download & Open FB') : (isKa ? 'გაზიარება FB-ზე' : 'Share via FB')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* INSTAGRAM POST PUBLISHER TAB (Carousel v26.0 + /bio CTA)       */}
          {/* ============================================================== */}
          {activePlatform === 'instagram' && (
            <>
              {/* Target @dbuy.store Profile Preview & Graph API Status */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 p-3.5 text-xs transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {igConnection?.profilePictureUrl ? (
                      <img
                        src={igConnection.profilePictureUrl}
                        alt={igHandle}
                        className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                      />
                    ) : (
                      <InstagramOriginalLogo size="md" showHoverEffect={false} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{igHandle}</span>
                        <span className="text-[11px] text-slate-400">
                          {igConnection?.igName || 'DBUY Store'}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          igConnection?.connected
                            ? 'text-emerald-400'
                            : isCheckingIgStatus
                            ? 'text-slate-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {isCheckingIgStatus
                          ? (isKa ? 'მოწმდება Instagram Business კავშირი...' : 'Verifying Instagram Business Account via Graph API v26.0...')
                          : igConnection?.connected
                          ? (isKa
                              ? `დაკავშირებულია (${igConnection.igUserId}) · Carousel API v26.0 აქტიურია`
                              : `Connected (${igConnection.igUserId}) · Carousel Graph API v26.0 Active`)
                          : (igConnection?.error || (isKa ? 'საჭიროა Meta Page Access Token' : 'Meta Page Access Token required'))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenEditor(v => !v)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showTokenEditor ? (isKa ? 'დამალვა' : 'Hide') : (igConnection?.connected ? (isKa ? 'ტოკენის შეცვლა' : 'Update Token') : (isKa ? 'ტოკენის განახლება' : 'Reconnect Token'))}</span>
                  </button>
                </div>

                {showTokenEditor && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                      <span>
                        {isKa
                          ? 'ჩასვით Meta Page Access Token (instagram_basic, instagram_content_publish):'
                          : 'Paste a Meta Page Access Token with instagram_basic & instagram_content_publish scopes:'}
                      </span>
                      <a
                        href={`https://developers.facebook.com/tools/explorer/?app_id=${FB_APP_ID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-pink-400 hover:underline"
                      >
                        <span>{isKa ? 'Graph API Explorer-ის გახსნა' : 'Open Graph API Explorer'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="EAA..."
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-pink-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={isSavingToken || !tokenInput.trim()}
                        onClick={handleVerifyAndSaveToken}
                        className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isSavingToken ? (isKa ? 'მოწმდება...' : 'Verifying...') : (isKa ? 'შემოწმება & შენახვა' : 'Verify & Connect')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Selector (2–10 High-Resolution Product Photos) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {isKa
                        ? 'აირჩიეთ 2–10 ფოტო Instagram კარუსელისთვის'
                        : 'Select 2–10 High-Resolution Photos for Carousel'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    {igSelectedImages.length < Math.min(10, images.length) && (
                      <button
                        type="button"
                        onClick={selectUpTo10IgPhotos}
                        className="text-[11px] font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                      >
                        {isKa ? 'არჩევა (10-მდე)' : 'Select Up to 10'}
                      </button>
                    )}
                    <span className={`text-[11px] font-bold tabular-nums ${
                      igSelectedImages.length >= 2 && igSelectedImages.length <= 10
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {igSelectedImages.length}/10 {isKa ? 'არჩეული (მინ. 2)' : 'selected (2–10 req.)'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {images.map((url, i) => {
                    const selectedIdx = igSelectedImages.indexOf(url);
                    const isSelected = selectedIdx !== -1;
                    const isCover = selectedIdx === 0;
                    return (
                      <button
                        key={`ig-pick-${url}-${i}`}
                        type="button"
                        onClick={() => toggleIgPhoto(url)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all text-left ${
                          isCover
                            ? 'border-pink-500 scale-[1.02] shadow-xs'
                            : isSelected
                            ? 'border-pink-400/75 opacity-100'
                            : 'border-slate-300 dark:border-slate-700 opacity-50 hover:opacity-85'
                        }`}
                      >
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <span
                          className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shadow-xs ${
                            isSelected
                              ? 'bg-pink-600 text-white'
                              : 'bg-white/90 text-slate-500 border border-slate-300'
                          }`}
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : ''}
                        </span>
                        {isSelected && (
                          <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black leading-none tabular-nums ${
                            isCover ? 'bg-pink-600 text-white' : 'bg-slate-900/80 text-white'
                          }`}>
                            {isCover ? (isKa ? 'გარეკანი #1' : 'Cover #1') : `#${selectedIdx + 1}`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Carousel Image Sorter & Live Instagram Swipeable Carousel Preview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Left: Carousel Image Sorter */}
                <div className="md:col-span-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-pink-400 shrink-0" />
                      <h4 className="text-xs font-bold text-white">
                        {isKa ? 'კარუსელის თანმიმდევრობა (Sorter)' : 'Carousel Image Sorter'}
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isKa ? 'გადაადგილეთ სლაიდები' : 'Drag or use arrows'}
                    </span>
                  </div>

                  {igSelectedImages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center py-8 text-xs text-slate-400 text-center">
                      {isKa ? 'აირჩიეთ 2-დან 10-მდე ფოტო ზემოთ.' : 'Select 2 to 10 photos above to arrange your carousel.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {igSelectedImages.map((url, idx) => {
                        const isActive = idx === igActiveSlide;
                        return (
                          <div
                            key={`sorter-${url}-${idx}`}
                            draggable
                            onDragStart={() => setDragIndex(idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDropSlide(idx)}
                            onClick={() => setIgActiveSlide(idx)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-slate-800 border-pink-500/70'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-300 w-6 tabular-nums shrink-0">
                              #{idx + 1}
                            </span>
                            <img
                              src={url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-white truncate">
                                {idx === 0 ? (isKa ? 'მთავარი სლაიდი (Cover)' : 'Lead Cover Slide') : `Carousel Slide ${idx + 1}`}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {idx === 0 ? 'Shown on @dbuy.store & /bio grid' : 'Swipe item'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => makeIgLeadSlide(idx)}
                                  title="Make Cover (#1)"
                                  className="px-1.5 py-1 rounded-md bg-slate-800 hover:bg-pink-600/30 text-[10px] font-bold text-pink-300 cursor-pointer"
                                >
                                  #1
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveIgSlide(idx, -1)}
                                title="Move earlier"
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === igSelectedImages.length - 1}
                                onClick={() => moveIgSlide(idx, 1)}
                                title="Move later"
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleIgPhoto(url)}
                                title="Remove slide"
                                className="p-1 rounded-md bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {igSelectedImages.length < 2 && (
                    <div className="text-[11px] text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded-xl px-3 py-2">
                      {isKa
                        ? '⚠️ Instagram კარუსელის გამოსაქვეყნებლად საჭიროა მინიმუმ 2 ფოტო.'
                        : '⚠️ Select at least 2 photos to enable Instagram Carousel publishing.'}
                    </div>
                  )}
                </div>

                {/* Right: Swipeable Instagram Carousel Preview */}
                <div className="md:col-span-6 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col">
                  {/* Mock IG Post Top Bar */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <InstagramOriginalLogo size="xs" showHoverEffect={false} />
                      <div className="leading-tight">
                        <div className="text-xs font-bold text-white">{igHandle}</div>
                        <div className="text-[10px] text-slate-400">dbuystore.com/bio</div>
                      </div>
                    </div>
                    {igSelectedImages.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-bold text-slate-200 tabular-nums">
                        {igActiveSlide + 1}/{igSelectedImages.length}
                      </span>
                    )}
                  </div>

                  {/* Swipeable Image Viewport */}
                  <div
                    className="relative aspect-square bg-white flex items-center justify-center overflow-hidden select-none"
                    onTouchStart={(e) => {
                      touchStartXRef.current = e.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(e) => {
                      if (touchStartXRef.current === null || igSelectedImages.length < 2) return;
                      const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
                      const diff = touchStartXRef.current - endX;
                      if (diff > 35 && igActiveSlide < igSelectedImages.length - 1) {
                        setIgActiveSlide((s) => s + 1);
                      } else if (diff < -35 && igActiveSlide > 0) {
                        setIgActiveSlide((s) => s - 1);
                      }
                      touchStartXRef.current = null;
                    }}
                  >
                    {igSelectedImages[igActiveSlide] ? (
                      <img
                        src={igSelectedImages[igActiveSlide]}
                        alt={`${product.title} slide ${igActiveSlide + 1}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs text-slate-400">No slides selected</div>
                    )}

                    {igSelectedImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          disabled={igActiveSlide === 0}
                          onClick={() => setIgActiveSlide((s) => Math.max(0, s - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/65 text-white flex items-center justify-center hover:bg-slate-950/85 disabled:opacity-25 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={igActiveSlide === igSelectedImages.length - 1}
                          onClick={() => setIgActiveSlide((s) => Math.min(igSelectedImages.length - 1, s + 1))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/65 text-white flex items-center justify-center hover:bg-slate-950/85 disabled:opacity-25 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Pagination Dots & Preview Caption Footer */}
                  <div className="px-3.5 py-2.5 bg-slate-950 border-t border-slate-800/80 space-y-2">
                    {igSelectedImages.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5">
                        {igSelectedImages.map((_, idx) => (
                          <button
                            key={`dot-${idx}`}
                            type="button"
                            onClick={() => setIgActiveSlide(idx)}
                            aria-label={`Slide ${idx + 1}`}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              idx === igActiveSlide ? 'w-4 bg-pink-500' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      <span className="font-bold text-white mr-1.5">{igHandle.replace('@', '')}</span>
                      {igCaption}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-Generated AI Instagram Caption */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isKa ? 'Instagram აღწერა + Link in Bio CTA' : 'Instagram Caption + Link in Bio CTA'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isEnhancingIgCopy}
                      onClick={enhanceIgCaptionWithAi}
                      className="inline-flex items-center gap-1 text-xs text-pink-600 dark:text-pink-400 hover:underline font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-pink-50 dark:hover:bg-pink-950/40 disabled:opacity-50"
                    >
                      {isEnhancingIgCopy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>{isKa ? 'AI ტექსტი' : 'AI Caption'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={regenerateIgCaption}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isKa ? 'განახლება' : 'Regenerate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyIgCaption}
                      className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {igCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{igCopied ? (isKa ? 'დაკოპირდა!' : 'Copied!') : (isKa ? 'კოპირება' : 'Copy')}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  ref={igTextareaRef}
                  value={igCaption}
                  onChange={(e) => setIgCaption(e.target.value)}
                  className="w-full p-3 h-36 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-pink-500 focus:outline-hidden resize-none"
                />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyDirectProductLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {igLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <LinkIcon className="w-3.5 h-3.5 text-pink-500" />}
                    <span>
                      {igLinkCopied
                        ? (isKa ? 'ბმული დაკოპირდა!' : 'Link Copied!')
                        : (isKa ? 'პროდუქტის ბმულის კოპირება' : 'Copy Direct Product Link')}
                    </span>
                  </button>
                  <a
                    href="https://dbuystore.com/bio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/60 text-xs font-bold transition-colors"
                  >
                    <span>{isKa ? 'გახსენი /bio მაღაზია' : 'Open /bio Shop Page'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Instagram Status Alert Banner */}
              {igStatusAlert && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-3 ${
                    igStatusAlert.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : igStatusAlert.type === 'info'
                      ? 'bg-slate-900 text-slate-100 border-slate-700'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {igStatusAlert.type === 'info' && <Loader2 className="w-4 h-4 animate-spin text-pink-400 shrink-0" />}
                    {igStatusAlert.type === 'success' && <span className="shrink-0">✅</span>}
                    {igStatusAlert.type === 'error' && <span className="shrink-0">⚠️</span>}
                    <div className="min-w-0">
                      <div className="break-words">{igStatusAlert.message}</div>
                      {igProgress?.detail && igStatusAlert.type === 'info' && (
                        <div className="text-[11px] font-normal text-slate-400">{igProgress.detail}</div>
                      )}
                    </div>
                  </div>
                  {igStatusAlert.type === 'success' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setCurrentPage('bio');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                      >
                        <span>{isKa ? 'ნახვა /bio-ზე' : 'View on /bio'}</span>
                      </button>
                      {igStatusAlert.permalink && (
                        <a
                          href={igStatusAlert.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 transition"
                        >
                          <span>{isKa ? 'ნახვა IG-ზე' : 'View on Instagram'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Action Button */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800">
          {activePlatform === 'facebook' ? (
            <button
              disabled={isPublishing || (postMode === 'gallery' && selectedImages.length === 0)}
              onClick={postMode === 'feed' ? handlePublishToFacebook : publishGalleryToFacebook}
              style={{ backgroundColor: buttonColor }}
              className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Megaphone className="w-5 h-5" />
              {buttonText}
            </button>
          ) : (
            <button
              type="button"
              disabled={isPublishingIg || igSelectedImages.length < 2 || igSelectedImages.length > 10}
              onClick={handlePublishToInstagram}
              className="w-full py-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: igProgress?.stage === 'published'
                  ? '#10B981'
                  : 'linear-gradient(90deg, #f58529 0%, #dd2a7b 55%, #8134af 100%)',
              }}
            >
              {isPublishingIg ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{igProgress?.message || (isKa ? 'იტვირთება Instagram-ზე...' : 'Uploading media...')}</span>
                </>
              ) : igProgress?.stage === 'published' ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>{isKa ? `წარმატებით გამოქვეყნდა ${igHandle}-ზე!` : `Published successfully to ${igHandle}!`}</span>
                </>
              ) : (
                <>
                  <InstagramOriginalLogo size="xs" showHoverEffect={false} />
                  <span>
                    {isKa
                      ? `გამოქვეყნება Instagram-ზე (${igSelectedImages.length} ფოტო)`
                      : `Publish to Instagram (${igSelectedImages.length} Carousel Slides)`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
