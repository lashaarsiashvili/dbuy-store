import React, { useState, useRef, useEffect } from 'react';
import {
  Link as LinkIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Check,
  Save,
  Edit3,
  ImageIcon,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  Globe,
  Code2,
  Package,
  Tag,
  Factory,
  ShoppingBag,
  Flame,
  Info,
  MessageSquare,
  BadgeCheck,
  Palette,
} from 'lucide-react';
import type { ExtractedProductReview, ProductVariant } from '../types';
import { AdminVariantBuilder } from './ProductVariants';
import { parseAmazonVariantsFromHtml } from '../utils/variantUtils';
import {
  autoDetectColorVariantsFromImages,
  mergeDetectedColorVariants,
} from '../utils/AutoColorVisionEngine';
import {
  ScrapedProductData,
  ImporterPlatform,
  parseProductHtml,
  parsePlatformHtml,
  sanitizeMarketplaceHtml,
  stripAlibabaSuffix,
} from '../utils/productScraper';
import { normalizeProductCategory } from '../data/categoryNavigationData';
import { smartApiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';
import {
  calculateDeliveryEstimate,
  detectProductOrigin,
  getLocalizedCountryName,
} from '../utils/deliveryEstimate';
import { Truck } from 'lucide-react';

interface ProductUrlImporterProps {
  onPopulateForm: (data: ScrapedProductData) => void;
  onDirectSave: (data: ScrapedProductData) => Promise<boolean>;
  isKa?: boolean;
  formatPrice: (amount: number) => string;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface PlatformCardMeta {
  id: ImporterPlatform;
  name: string;
  emoji: string;
  tagline: string;
  urlPlaceholder: string;
  htmlPlaceholder: string;
  instructions: string;
  parserSummary: string;
  activeCardClass: string;
  inactiveCardClass: string;
  badgeClass: string;
  buttonClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const PLATFORM_CONFIGS: PlatformCardMeta[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    emoji: '📦',
    tagline: 'URL + Ctrl+U Bypass',
    urlPlaceholder: 'https://www.amazon.com/dp/... or https://www.ebay.com/itm/...',
    htmlPlaceholder: 'Paste raw Amazon HTML content here...',
    instructions: 'Paste any Amazon link to extract high-res gallery images, USD pricing, and full English specs.',
    parserSummary: 'Amazon URL & HTML Extractor',
    activeCardClass: 'bg-amber-500/15 border-amber-400 text-amber-200 ring-1 ring-amber-400/40 shadow-lg shadow-amber-500/10',
    inactiveCardClass: 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-amber-500/40 hover:text-amber-200',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    buttonClass: 'from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950',
    Icon: Package,
  },
  {
    id: 'ebay',
    name: 'eBay',
    emoji: '🏷️',
    tagline: 'Ctrl+U Source Extractor',
    urlPlaceholder: 'https://www.ebay.com/itm/... (optional reference link)',
    htmlPlaceholder: 'Paste full eBay Ctrl+U page source HTML here (supports 2MB–5MB pastes)...',
    instructions: 'Open the eBay listing in your browser, press Ctrl+U (or Cmd+Option+U on Mac), press Ctrl+A then Ctrl+C, and paste the full page HTML below.',
    parserSummary: 'Extracts JSON-LD Product schema, MSKU/zoom gallery (s-l1600/s-l1200), ux-labels-values specifics & USD pricing.',
    activeCardClass: 'bg-blue-500/15 border-blue-400 text-blue-200 ring-1 ring-blue-400/40 shadow-lg shadow-blue-500/10',
    inactiveCardClass: 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-blue-500/40 hover:text-blue-200',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    buttonClass: 'from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
    Icon: Tag,
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    emoji: '🏭',
    tagline: 'Ctrl+U Source Extractor',
    urlPlaceholder: 'https://www.alibaba.com/product-detail/... (optional reference link)',
    htmlPlaceholder: 'Paste full Alibaba Ctrl+U page source HTML here (supports 2MB–5MB pastes)...',
    instructions: 'Open the Alibaba product page (USD view), press Ctrl+U (or Cmd+Option+U), select all (Ctrl+A) and copy (Ctrl+C), then paste the full HTML source below.',
    parserSummary: 'Extracts window.detailData / globalData / JSON-LD, full-res imageList (strips _50x50 / .webp thumbnails), productBasicProperties & USD pricing.',
    activeCardClass: 'bg-orange-500/15 border-orange-400 text-orange-200 ring-1 ring-orange-400/40 shadow-lg shadow-orange-500/10',
    inactiveCardClass: 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-orange-500/40 hover:text-orange-200',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    buttonClass: 'from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950',
    Icon: Factory,
  },
  {
    id: 'aliexpress',
    name: 'AliExpress',
    emoji: '🛍️',
    tagline: 'Ctrl+U Source Extractor',
    urlPlaceholder: 'https://www.aliexpress.com/item/... (optional reference link)',
    htmlPlaceholder: 'Paste full AliExpress Ctrl+U page source HTML here (supports 2MB–5MB pastes)...',
    instructions: 'Open the AliExpress item page in your browser, press Ctrl+U (or Cmd+Option+U), press Ctrl+A then Ctrl+C, and paste the full source HTML below.',
    parserSummary: 'Extracts runParams / window._dida_config_, imageComponent.imagePathList (full-res), priceComponent & specsComponent.',
    activeCardClass: 'bg-rose-500/15 border-rose-400 text-rose-200 ring-1 ring-rose-400/40 shadow-lg shadow-rose-500/10',
    inactiveCardClass: 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-rose-500/40 hover:text-rose-200',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    buttonClass: 'from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white',
    Icon: ShoppingBag,
  },
  {
    id: 'temu',
    name: 'Temu',
    emoji: '🧡',
    tagline: 'Ctrl+U / outerHTML Extractor',
    urlPlaceholder: 'https://www.temu.com/... (optional reference link)',
    htmlPlaceholder: 'Paste Temu Ctrl+U page source or F12 outerHTML here (supports 2MB–5MB pastes)...',
    instructions: 'Open the Temu product page, press Ctrl+U (or Cmd+Option+U), copy all (Ctrl+A, Ctrl+C), and paste the HTML below.',
    parserSummary: 'Extracts window.rawData / __NEXT_DATA__ / goods high-res gallery arrays, sku USD prices & product attributes.',
    activeCardClass: 'bg-amber-600/20 border-orange-400 text-orange-100 ring-1 ring-orange-400/50 shadow-lg shadow-orange-500/15',
    inactiveCardClass: 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-orange-400/40 hover:text-orange-200',
    badgeClass: 'bg-orange-500/20 text-orange-200 border-orange-400/40',
    buttonClass: 'from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white',
    Icon: Flame,
  },
];

export const ProductUrlImporter: React.FC<ProductUrlImporterProps> = ({
  onPopulateForm,
  onDirectSave,
  isKa = false,
  addToast,
}) => {
  const { visitorCountryCode, visitorCountryFlag, language, t } = useStore();
  // Active platform selector (Amazon default active)
  const [selectedPlatform, setSelectedPlatform] = useState<ImporterPlatform>('amazon');

  // Amazon state (100% isolated and untouched)
  const [url, setUrl] = useState('');
  const [rawHtml, setRawHtml] = useState('');
  const [showHtmlPaste, setShowHtmlPaste] = useState(false);

  // Dedicated Ctrl+U HTML Extractor state for eBay, Alibaba, AliExpress, Temu
  const [platformUrl, setPlatformUrl] = useState('');
  const [platformHtml, setPlatformHtml] = useState('');

  // Shared extraction & preview state
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);
  const [extractedData, setExtractedData] = useState<ScrapedProductData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBotBlocked, setIsBotBlocked] = useState(false);

  // Editable fields in preview card
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOrigPrice, setEditOrigPrice] = useState<number | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<string>('Electronics');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isDetectingVariants, setIsDetectingVariants] = useState(false);
  const [extractedReviews, setExtractedReviews] = useState<ExtractedProductReview[]>([]);
  const [isReviewsExpanded, setIsReviewsExpanded] = useState<boolean>(false);

  const detectRunIdRef = useRef(0);
  const pendingDetectionRef = useRef<Promise<ProductVariant[] | null> | null>(null);
  const latestVariantsRef = useRef<ProductVariant[]>([]);
  useEffect(() => {
    latestVariantsRef.current = variants;
  }, [variants]);

  const activePlatformMeta = PLATFORM_CONFIGS.find((p) => p.id === selectedPlatform) || PLATFORM_CONFIGS[0];

  const runAutoColorVariantDetection = (
    images: string[],
    productTitle: string,
    seedVariants: ProductVariant[],
    forceReplaceWhenEmpty: boolean = false
  ): Promise<ProductVariant[] | null> => {
    const validImages = images.filter((u) => typeof u === 'string' && u.trim().length > 0);
    if (validImages.length === 0) {
      pendingDetectionRef.current = null;
      setIsDetectingVariants(false);
      return Promise.resolve(null);
    }

    const runId = ++detectRunIdRef.current;
    setIsDetectingVariants(true);

    const task = (async (): Promise<ProductVariant[] | null> => {
      try {
        const detected = await autoDetectColorVariantsFromImages(validImages, productTitle);
        if (detectRunIdRef.current !== runId || detected.length === 0) {
          return null;
        }

        let resolved: ProductVariant[] = [];
        setVariants((prev) => {
          const base = forceReplaceWhenEmpty && prev.length === 0 ? [] : prev.length > 0 ? prev : seedVariants;
          resolved = mergeDetectedColorVariants(base, detected);
          latestVariantsRef.current = resolved;
          return resolved;
        });

        addToast(
          isKa
            ? `AI Vision-მა სურათებიდან ავტომატურად ამოიცნო ${detected.length} ფერის ვარიანტი!`
            : `Auto-detected ${detected.length} color variants from product images!`,
          'success'
        );
        return resolved.length > 0 ? resolved : mergeDetectedColorVariants(seedVariants, detected);
      } catch (err) {
        console.warn('Auto color variant detection skipped:', err);
        return null;
      } finally {
        if (detectRunIdRef.current === runId) {
          setIsDetectingVariants(false);
          pendingDetectionRef.current = null;
        }
      }
    })();

    pendingDetectionRef.current = task;
    return task;
  };

  const applyExtractedItem = (item: ScrapedProductData) => {
    const cleanImgs = Array.from(
      new Set(
        (item.images || [])
          .map((u: string) => (typeof u === 'string' ? u.trim() : ''))
          .filter((u: string) => u.startsWith('http'))
      )
    );
    item.images = cleanImgs;
    const cleanRevs = Array.isArray(item.reviews) ? item.reviews : [];
    const cleanVars = Array.isArray(item.variants) ? item.variants : [];
    const cleanTitle = stripAlibabaSuffix(item.title);
    item.title = cleanTitle;
    setExtractedData(item);
    setEditTitle(cleanTitle);
    setEditPrice(item.price || 49.99);
    setEditOrigPrice(item.origPrice);
    setEditCategory(normalizeProductCategory(item.category, cleanTitle));
    setGalleryImages(cleanImgs);
    latestVariantsRef.current = cleanVars;
    setVariants(cleanVars);
    setExtractedReviews(cleanRevs);
    setIsReviewsExpanded(cleanRevs.length > 0);
    void runAutoColorVariantDetection(cleanImgs, item.title, cleanVars, true);
  };

  // =========================================================================
  // AMAZON EXTRACTION FLOW (100% UNTOUCHED BEHAVIOR)
  // =========================================================================
  const handleExtract = async (overrideHtml?: string) => {
    const trimmedUrl = url.trim();
    const htmlToUse = (overrideHtml !== undefined ? overrideHtml : rawHtml).trim();

    if (!trimmedUrl && !htmlToUse) {
      addToast(
        isKa ? 'გთხოვთ შეიყვანოთ Amazon ან eBay პროდუქტის ბმული' : 'Please enter an Amazon or eBay product URL',
        'warning'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsBotBlocked(false);

    try {
      const response = await smartApiFetch('/api/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          html: htmlToUse || undefined,
        }),
      });

      const resData: any = await response.json().catch(() => ({}));

      if (response.ok && resData.success && resData.data) {
        const item: ScrapedProductData = resData.data;
        const cleanImgs = Array.from(new Set(
          (item.images || [])
            .map((u: string) => (typeof u === 'string' ? u.trim() : ''))
            .filter((u: string) => u.startsWith('http'))
        ));
        item.images = cleanImgs;
        const cleanRevs = Array.isArray(item.reviews) ? item.reviews : [];
        const parsedVars =
          Array.isArray(item.variants) && item.variants.length > 0
            ? item.variants
            : htmlToUse
            ? parseAmazonVariantsFromHtml(htmlToUse)
            : [];
        item.title = stripAlibabaSuffix(item.title);
        setExtractedData(item);
        setEditTitle(item.title);
        setEditPrice(item.price || 49.99);
        setEditOrigPrice(item.origPrice);
        setEditCategory(item.category || 'tech');
        setGalleryImages(cleanImgs);
        latestVariantsRef.current = parsedVars;
        setVariants(parsedVars);
        setExtractedReviews(cleanRevs);
        setIsReviewsExpanded(cleanRevs.length > 0);
        void runAutoColorVariantDetection(cleanImgs, item.title, parsedVars, true);
        addToast(
          isKa
            ? `პროდუქტი "${item.title.substring(0, 30)}..." წარმატებით ამოღებულია!`
            : `Extracted "${item.title.substring(0, 35)}..." with ${cleanImgs.length} high-res images!`,
          'success'
        );
      } else if (resData.isBotBlocked) {
        setIsBotBlocked(true);
        setShowHtmlPaste(true);
        setErrorMsg(
          isKa
            ? 'მარკეტფლეისის ავტორიზაციის დაცვა გააქტიურდა. გთხოვთ დააკოპიროთ გვერდის HTML კოდი ქვემოთ მოცემულ ველში და დააჭიროთ "HTML-დან ამოღებას".'
            : 'Marketplace bot verification triggered. Open product page source (Ctrl+U or right click > View Source), copy & paste the HTML below for instant 100% extraction.'
        );
      } else {
        // If server failed, try client-side parse fallback if rawHtml was provided
        if (htmlToUse) {
          const clientParsed = parseProductHtml(htmlToUse, trimmedUrl);
          if (clientParsed.title && clientParsed.title !== 'Imported Product') {
            const cleanImgs = Array.from(new Set(
              (clientParsed.images || [])
                .map((u: string) => (typeof u === 'string' ? u.trim() : ''))
                .filter((u: string) => u.startsWith('http'))
            ));
            clientParsed.images = cleanImgs;
            const cleanRevs = Array.isArray(clientParsed.reviews) ? clientParsed.reviews : [];
            const parsedVars =
              Array.isArray(clientParsed.variants) && clientParsed.variants.length > 0
                ? clientParsed.variants
                : parseAmazonVariantsFromHtml(htmlToUse);
            setExtractedData(clientParsed);
            setEditTitle(clientParsed.title);
            setEditPrice(clientParsed.price || 49.99);
            setEditOrigPrice(clientParsed.origPrice);
            setEditCategory(clientParsed.category || 'tech');
            setGalleryImages(cleanImgs);
            latestVariantsRef.current = parsedVars;
            setVariants(parsedVars);
            setExtractedReviews(cleanRevs);
            setIsReviewsExpanded(cleanRevs.length > 0);
            void runAutoColorVariantDetection(cleanImgs, clientParsed.title, parsedVars, true);
            addToast('Successfully parsed product from provided HTML!', 'success');
            return;
          }
        }
        setErrorMsg(resData.error || 'Failed to extract product details.');
        addToast(resData.error || 'Extraction failed', 'error');
      }
    } catch (err: any) {
      console.warn('Scraper API request failed:', err);
      // Fallback: if rawHtml is populated, run client-side parser
      if (htmlToUse) {
        const clientParsed = parseProductHtml(htmlToUse, trimmedUrl);
        if (clientParsed.title && clientParsed.title !== 'Imported Product') {
          const cleanImgs = Array.from(new Set(
            (clientParsed.images || [])
              .map((u: string) => (typeof u === 'string' ? u.trim() : ''))
              .filter((u: string) => u.startsWith('http'))
          ));
          clientParsed.images = cleanImgs;
          const cleanRevs = Array.isArray(clientParsed.reviews) ? clientParsed.reviews : [];
          const parsedVars =
            Array.isArray(clientParsed.variants) && clientParsed.variants.length > 0
              ? clientParsed.variants
              : parseAmazonVariantsFromHtml(htmlToUse);
          setExtractedData(clientParsed);
          setEditTitle(clientParsed.title);
          setEditPrice(clientParsed.price || 49.99);
          setEditOrigPrice(clientParsed.origPrice);
          setEditCategory(clientParsed.category || 'tech');
          setGalleryImages(cleanImgs);
          latestVariantsRef.current = parsedVars;
          setVariants(parsedVars);
          setExtractedReviews(cleanRevs);
          setIsReviewsExpanded(cleanRevs.length > 0);
          void runAutoColorVariantDetection(cleanImgs, clientParsed.title, parsedVars, true);
          addToast('Parsed directly via browser parser!', 'success');
          return;
        }
      }
      setErrorMsg(err?.message || 'Network request failed while contacting extractor API.');
      addToast(err?.message || 'Scraper failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // DEDICATED CTRL+U EXTRACTION FLOW FOR EBAY, ALIBABA, ALIEXPRESS, TEMU
  // Strips <style>, <svg>, base64 & unrelated scripts and runs platform-specific
  // pre-parser before compact payload submission so 2MB-5MB HTML never overflows.
  // =========================================================================
  const handlePlatformHtmlExtract = async () => {
    const rawPaste = platformHtml.trim();
    const refUrl = platformUrl.trim();

    if (!rawPaste) {
      addToast(`Please paste the ${activePlatformMeta.name} Ctrl+U page HTML first.`, 'warning');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsBotBlocked(false);

    // Step 1: Strip <style>, <svg>, base64 strings, and unrelated scripts locally
    const sanitizedHtml = sanitizeMarketplaceHtml(rawPaste, selectedPlatform);

    // Step 2: Run dedicated platform pre-parser locally in browser
    const preParsed = parsePlatformHtml(selectedPlatform, sanitizedHtml, refUrl);

    try {
      // Step 3: Send ONLY compact pre-parsed structured payload + compact context to backend (never 5MB HTML!)
      const response = await smartApiFetch('/api/import-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: refUrl || undefined,
          marketplace: selectedPlatform,
          preParsed: {
            ...preParsed,
            compactContext: undefined,
          },
          compactContext: preParsed.compactContext,
        }),
      });

      const resData: any = await response.json().catch(() => ({}));

      if (response.ok && resData.success && resData.data) {
        const finalItem: ScrapedProductData = {
          ...resData.data,
          // Guarantee Original Images Only from verified pre-parser
          images: Array.isArray(resData.data.images) && resData.data.images.length > 0
            ? resData.data.images
            : preParsed.images,
          marketplace: selectedPlatform,
          sourceUrl: refUrl || resData.data.sourceUrl,
        };
        applyExtractedItem(finalItem);
        addToast(
          `Extracted "${finalItem.title.substring(0, 35)}..." from ${activePlatformMeta.name} with ${finalItem.images.length} original high-res photos!`,
          'success'
        );
      } else if (preParsed.title && (preParsed.title !== 'Imported Product' || preParsed.images.length > 0)) {
        applyExtractedItem(preParsed);
        addToast(`Extracted ${activePlatformMeta.name} product directly via client pre-parser!`, 'success');
      } else {
        const msg =
          resData.error ||
          `Could not extract ${activePlatformMeta.name} product details. Ensure you copied the complete Ctrl+U page source.`;
        setErrorMsg(msg);
        addToast(msg, 'error');
      }
    } catch (err: any) {
      console.warn(`[${selectedPlatform.toUpperCase()} IMPORTER] API fallback to pre-parser:`, err);
      if (preParsed.title && (preParsed.title !== 'Imported Product' || preParsed.images.length > 0)) {
        applyExtractedItem(preParsed);
        addToast(`Extracted ${activePlatformMeta.name} product directly via browser pre-parser!`, 'success');
      } else {
        const msg = err?.message || `Failed to parse ${activePlatformMeta.name} HTML.`;
        setErrorMsg(msg);
        addToast(msg, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlatform = (platform: ImporterPlatform) => {
    setSelectedPlatform(platform);
    setErrorMsg(null);
    setIsBotBlocked(false);
  };

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    setGalleryImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
    addToast('Set as primary cover photo', 'info');
  };

  const handleRemoveImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    addToast('Removed image from gallery', 'info');
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= galleryImages.length) return;
    setGalleryImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const handleRemoveReview = (index: number) => {
    setExtractedReviews((prev) => prev.filter((_, i) => i !== index));
    addToast('Removed review from import list', 'info');
  };

  const getUpdatedProductData = (overrideVariants?: ProductVariant[]): ScrapedProductData => {
    const activeUrl = (selectedPlatform === 'amazon' ? url : platformUrl).trim();
    const resolvedMarketplace =
      extractedData?.marketplace && extractedData.marketplace !== 'unknown'
        ? extractedData.marketplace
        : selectedPlatform;
    return {
      ...(extractedData || {
        description: '',
        features: [],
        sourceUrl: activeUrl,
        marketplace: resolvedMarketplace,
      }),
      marketplace: resolvedMarketplace,
      sourceUrl: extractedData?.sourceUrl || activeUrl || undefined,
      title: stripAlibabaSuffix(editTitle.trim() || extractedData?.title || 'Imported Product'),
      price: editPrice || 49.99,
      origPrice: editOrigPrice,
      category: editCategory,
      images: galleryImages,
      variants: overrideVariants ?? latestVariantsRef.current ?? variants,
      reviews: extractedReviews,
    };
  };

  const handleReviewInForm = () => {
    const finalData = getUpdatedProductData();
    onPopulateForm(finalData);
    addToast(
      isKa ? 'მონაცემები გადატანილია რედაქტირების ფორმაში' : 'Populated into Add Product modal for review',
      'info'
    );
  };

  const handleDirectSaveClick = async () => {
    setIsSavingDirectly(true);
    try {
      let resolvedVariants = latestVariantsRef.current;
      if (pendingDetectionRef.current) {
        const detectedVariants = await pendingDetectionRef.current;
        if (Array.isArray(detectedVariants) && detectedVariants.length > 0) {
          resolvedVariants = detectedVariants;
        }
      }
      const finalData = getUpdatedProductData(resolvedVariants);
      const success = await onDirectSave(finalData);
      if (success) {
        detectRunIdRef.current++;
        pendingDetectionRef.current = null;
        if (selectedPlatform === 'amazon') {
          setUrl('');
          setRawHtml('');
          setShowHtmlPaste(false);
        } else {
          setPlatformUrl('');
          setPlatformHtml('');
        }
        setExtractedData(null);
        latestVariantsRef.current = [];
        setVariants([]);
        setExtractedReviews([]);
        setIsReviewsExpanded(false);
      }
    } finally {
      setIsSavingDirectly(false);
    }
  };

  const isAmazonUrl = /amazon\.|amzn\.to/i.test(url);
  const isEbayUrl = /ebay\./i.test(url);
  const pastedSizeLabel = platformHtml.length > 0
    ? platformHtml.length >= 1024 * 1024
      ? `${(platformHtml.length / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.max(1, Math.round(platformHtml.length / 1024))} KB`
    : '';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-indigo-900/60 shadow-xl relative overflow-hidden mb-5">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>
                  {selectedPlatform === 'amazon'
                    ? '1-Click Amazon & Multi-Platform Importer'
                    : `${activePlatformMeta.name} Ctrl+U Product Importer`}
                </span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                PRO SCRAPER
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              {selectedPlatform === 'amazon'
                ? isKa
                  ? 'ჩასვით Amazon (amazon.com, amzn.to) ბმული სრული გალერეის, ფასისა და სპეციფიკაციების ავტომატური ექსტრაქციისთვის'
                  : 'Paste any Amazon link to extract high-res gallery images, USD pricing, and full English specs'
                : activePlatformMeta.parserSummary}
            </p>
          </div>
        </div>

        {/* Global Delivery Badge */}
        <div className="flex items-center space-x-2 self-start sm:self-center">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            <Globe className="w-3 h-3 mr-0.5" />
            <span>Global Delivery</span>
          </span>
        </div>
      </div>

      {/* 1. Platform Selector Cards Row (5 clickable dark rounded cards side-by-side) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4 relative z-10">
        {PLATFORM_CONFIGS.map((platform) => {
          const isActive = selectedPlatform === platform.id;
          const IconComponent = platform.Icon;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleSelectPlatform(platform.id)}
              aria-pressed={isActive}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive ? platform.activeCardClass : platform.inactiveCardClass
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isActive
                    ? 'bg-slate-950/60 border-white/20'
                    : 'bg-slate-900/70 border-slate-700/70 group-hover:border-slate-500/70'
                }`}
              >
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black tracking-tight truncate">
                    {platform.emoji} {platform.name}
                  </span>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-xs shadow-emerald-400/60" />
                  )}
                </div>
                <p className="text-[10px] opacity-75 truncate">{platform.tagline}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Platform-Specific Panel */}
      <div className="relative z-10">
        {selectedPlatform === 'amazon' ? (
          /* ================================================================
             AMAZON PANEL — 100% UNTOUCHED WORKING COMPONENT & LOGIC
             ================================================================ */
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleExtract();
              }}
              className="flex flex-col sm:flex-row items-stretch gap-2"
            >
              <div className="relative flex-1">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4 text-indigo-300" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="https://www.amazon.com/dp/... or https://www.ebay.com/itm/..."
                  className="w-full pl-10 pr-24 py-3 bg-slate-950/70 border border-indigo-500/40 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all font-mono"
                />
                {url && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isAmazonUrl && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Amazon
                      </span>
                    )}
                    {isEbayUrl && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                        eBay
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || (!url.trim() && !rawHtml.trim())}
                className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer whitespace-nowrap ${
                  isLoading || (!url.trim() && !rawHtml.trim())
                    ? 'bg-indigo-900/60 text-indigo-300/60 cursor-not-allowed border border-indigo-800/40'
                    : 'bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold shadow-amber-500/20 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span className="text-slate-900">Extracting gallery, specs & English description...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Import Product Data</span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle for Direct HTML Extraction Fallback */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-indigo-300">
              <button
                type="button"
                onClick={() => setShowHtmlPaste((prev) => !prev)}
                className="inline-flex items-center space-x-1.5 text-indigo-300 hover:text-white transition-colors cursor-pointer underline-offset-4 hover:underline"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {showHtmlPaste
                    ? 'Hide Direct HTML Extractor'
                    : 'Having trouble? Click here to paste Page HTML directly (100% bypass)'}
                </span>
                {showHtmlPaste ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <span className="text-slate-400 text-[11px]">
                Strict Rule: English descriptions & original photos only (no placeholders)
              </span>
            </div>

            {/* Collapsible Direct HTML Paste Box */}
            {showHtmlPaste && (
              <div className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Direct Page HTML Paste (Guaranteed 100% Bypass for Captchas & Bot Checks)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Press Ctrl+U on the product page, copy all (Ctrl+A), and paste here
                  </span>
                </div>
                <textarea
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  placeholder="Paste raw Amazon or eBay HTML content here..."
                  rows={4}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                />
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleExtract(rawHtml)}
                    disabled={isLoading || !rawHtml.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extract From Pasted HTML</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ================================================================
             DEDICATED CTRL+U HTML EXTRACTOR PANEL (eBay, Alibaba, AliExpress, Temu)
             ================================================================ */
          <div className="p-4 bg-slate-950/75 rounded-2xl border border-indigo-500/30 space-y-3">
            {/* Platform Instructions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-start gap-2.5">
                <div className={`px-2.5 py-1 rounded-xl border text-[11px] font-black shrink-0 ${activePlatformMeta.badgeClass}`}>
                  {activePlatformMeta.emoji} {activePlatformMeta.name}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {activePlatformMeta.instructions}
                </p>
              </div>
              <span className="text-[10px] text-emerald-300/90 font-semibold whitespace-nowrap">
                Auto-strips &lt;style&gt;, &lt;svg&gt; &amp; base64
              </span>
            </div>

            {/* Temu F12 Copy outerHTML Helper Tip */}
            {selectedPlatform === 'temu' && (
              <div className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-400/30 text-[11px] text-orange-200 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-orange-300 shrink-0 mt-0.5" />
                <span>
                  <strong>Temu Tip:</strong> If <code className="px-1 py-0.5 rounded bg-slate-900 text-orange-200">Ctrl+U</code> shows an empty shell, press <code className="px-1 py-0.5 rounded bg-slate-900 text-orange-200">F12</code> &rarr; right-click <code className="px-1 py-0.5 rounded bg-slate-900 text-orange-200">&lt;html&gt;</code> &rarr; <strong>Copy</strong> &rarr; <strong>Copy outerHTML</strong> and paste it into the box below.
                </span>
              </div>
            )}

            {/* Optional Reference / Canonical Product URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Optional Product URL (Reference / Canonical Link)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-300" />
                </div>
                <input
                  type="url"
                  value={platformUrl}
                  onChange={(e) => setPlatformUrl(e.target.value)}
                  placeholder={activePlatformMeta.urlPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 font-mono"
                />
              </div>
            </div>

            {/* Dedicated Ctrl+U Page Source HTML Paste Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activePlatformMeta.name} Ctrl+U Page Source HTML</span>
                </label>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {pastedSizeLabel && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 border border-emerald-500/30 font-mono">
                      {pastedSizeLabel} pasted (pre-parser ready)
                    </span>
                  )}
                  <span>Original images &amp; English/USD normalized</span>
                </div>
              </div>
              <textarea
                value={platformHtml}
                onChange={(e) => {
                  setPlatformHtml(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={activePlatformMeta.htmlPlaceholder}
                rows={5}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <span className="text-[11px] text-slate-400">
                Strict Rule: Verified original gallery images, clean English &amp; USD ($) pricing only
              </span>

              <div className="flex items-center gap-2">
                {platformHtml && (
                  <button
                    type="button"
                    onClick={() => {
                      setPlatformHtml('');
                      setErrorMsg(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePlatformHtmlExtract}
                  disabled={isLoading || !platformHtml.trim()}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${activePlatformMeta.buttonClass}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting &amp; Normalizing {activePlatformMeta.name}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract {activePlatformMeta.name} Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMsg}</p>
              {isBotBlocked && selectedPlatform === 'amazon' && (
                <p className="mt-1 text-slate-300 text-[11px]">
                  💡 <strong>Tip:</strong> Right-click the Amazon or eBay product page in your browser, select <em>"View Page Source"</em> (or press Ctrl+U), copy the HTML, and paste it into the Direct HTML box above!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Product Data Card & High-Res Image Preview Grid */}
      {extractedData && (
        <div className="mt-5 pt-5 border-t border-indigo-900/50 bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-indigo-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Extracted Product Preview</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  {extractedData.marketplace.toUpperCase()}
                </span>
              </h4>
            </div>

            <div className="text-xs text-slate-400">
              Found <strong>{galleryImages.length}</strong> full-res photos
            </div>
          </div>

          {/* Geo-Aware Delivery Preview Banner */}
          {(() => {
            const resolvedPlatform =
              extractedData.marketplace && extractedData.marketplace !== 'unknown'
                ? extractedData.marketplace
                : selectedPlatform;
            const origin = detectProductOrigin({
              sourcePlatform: resolvedPlatform,
              sourceUrl: extractedData.sourceUrl || (selectedPlatform === 'amazon' ? url : platformUrl),
            });
            const est = calculateDeliveryEstimate({
              visitorCountry: visitorCountryCode,
              productOrigin: origin,
              sourcePlatform: resolvedPlatform,
            });
            const countryLabel = getLocalizedCountryName(visitorCountryCode, language);
            return (
              <div className="mb-4 p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/35 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-100">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">
                    {t('delivery.estimatedToCountry', {
                      country: `${visitorCountryFlag} ${countryLabel}`,
                      range: est.rangeLabel,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${
                    origin === 'US'
                      ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                      : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  }`}>
                    {t('delivery.originLabel')}: {origin === 'US' ? t('delivery.originUS') : t('delivery.originCN')} ({origin})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-semibold">
                    {t('delivery.worldwideShipping')}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Quick Edit Fields */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Product Title (English)
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Price (USD $)
              </label>
              <input
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-emerald-400 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Orig. Price (USD $)
              </label>
              <input
                type="number"
                step="0.01"
                value={editOrigPrice || ''}
                placeholder="Optional"
                onChange={(e) => setEditOrigPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
              >
                <option value="Electronics">Electronics</option>
                <option value="Gaming">Gaming</option>
                <option value="Smart Home">Smart Home</option>
                <option value="Audio">Audio</option>
                <option value="Wearables">Wearables</option>
                <option value="Smart Bottles">Smart Bottles</option>
                <option value="Office">Office</option>
                <option value="Beauty & Health">Beauty & Health</option>
                <option value="Pets">Pets</option>
              </select>
            </div>
          </div>

          {/* Visual High-Res Gallery Preview Grid */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Extracted High-Res Gallery ({galleryImages.length} Images)</span>
              </label>
              <span className="text-[11px] text-amber-300">
                ⭐ Click "Set Cover" or reorder • First image is store cover photo
              </span>
            </div>

            {galleryImages.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center text-xs text-slate-400">
                No high-resolution images extracted from product page.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {galleryImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className={`group relative rounded-xl overflow-hidden border transition-all ${
                      idx === 0
                        ? 'border-amber-400 ring-2 ring-amber-400/30 bg-slate-900'
                        : 'border-slate-700/80 hover:border-indigo-400 bg-slate-900/80'
                    }`}
                  >
                    <div className="aspect-square w-full bg-slate-950 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={imgUrl}
                        alt={`Extracted thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.triedClean && target.src.includes('?')) {
                            target.dataset.triedClean = 'true';
                            target.src = target.src.split('?')[0];
                            return;
                          }
                          target.style.display = 'none';
                          const fallbackEl = target.nextElementSibling as HTMLElement | null;
                          if (fallbackEl) {
                            fallbackEl.style.display = 'flex';
                          }
                        }}
                      />
                      <div
                        style={{ display: 'none' }}
                        className="flex-col items-center justify-center p-2 text-center text-slate-400 select-none"
                      >
                        <ImageIcon className="w-6 h-6 text-indigo-400/80 mb-1" />
                        <span className="text-[10px] font-bold text-slate-300">Photo #{idx + 1}</span>
                      </div>
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-1 left-1 flex items-center gap-1">
                      {idx === 0 ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-slate-950" />
                          <span>Cover</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-900/90 text-slate-300 font-bold text-[9px]">
                          #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 text-center">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleMakeCover(idx)}
                          className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold w-full transition-colors cursor-pointer"
                        >
                          Set Cover
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
                            title="Move left"
                          >
                            ←
                          </button>
                        )}
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                          title="Open original high-res image"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {idx < galleryImages.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
                            title="Move right"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Extracted Features Pills */}
          {extractedData.features && extractedData.features.length > 0 && (
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Extracted Key Features ({extractedData.features.length})
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {extractedData.features.map((feat, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-start space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Variants Builder (Colors, Sizes, Custom Price & Images) */}
          <div className="mb-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 text-[11px]">
                {isDetectingVariants ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                    <span>
                      {isKa
                        ? 'AutoColorVision: მიმდინარეობს სურათებიდან ფერების ამოცნობა...'
                        : 'AutoColorVision: Detecting color variants from photos...'}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {isKa
                      ? 'ფერის ვარიანტები ავტომატურად ამოიცნობა სურათებიდან (AutoColorVision).'
                      : 'Color variants are automatically analyzed from product photos.'}
                  </span>
                )}
              </div>

              {galleryImages.length > 0 && (
                <button
                  type="button"
                  disabled={isDetectingVariants}
                  onClick={() =>
                    void runAutoColorVariantDetection(galleryImages, editTitle, variants, true)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-indigo-500/40 text-indigo-200 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isKa ? 'ფერების ხელახალი ამოცნობა' : 'Re-Detect Colors from Images'}</span>
                </button>
              )}
            </div>

            <AdminVariantBuilder
              variants={variants}
              onChange={(next) => {
                latestVariantsRef.current = next;
                setVariants(next);
              }}
              availableImages={galleryImages}
              defaultPrice={editPrice || 0}
              theme="dark"
              isKa={isKa}
            />
          </div>

          {/* Extracted Customer Reviews Collapsible Preview */}
          <div className="mb-4 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsReviewsExpanded((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  Extracted Customer Reviews ({extractedReviews.length})
                </span>
                {extractedReviews.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    ★ {(extractedReviews.reduce((s, r) => s + r.rating, 0) / extractedReviews.length).toFixed(1)} avg
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>{isReviewsExpanded ? 'Collapse' : 'Inspect'}</span>
                {isReviewsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {isReviewsExpanded && (
              <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80">
                {extractedReviews.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    No customer reviews were found in the pasted HTML source. The product will be saved cleanly with 0 reviews.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 mt-2">
                    {extractedReviews.map((rev, idx) => (
                      <div
                        key={`${rev.author_name}-${idx}`}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-bold text-white">{rev.author_name}</span>
                            <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                              {Array.from({ length: 5 }).map((_, starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`w-3 h-3 ${
                                    starIdx < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                                  }`}
                                />
                              ))}
                            </span>
                            {rev.verified && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                <BadgeCheck className="w-2.5 h-2.5" />
                                Verified Buyer
                              </span>
                            )}
                            {rev.review_date && (
                              <span className="text-[10px] text-slate-400">{rev.review_date}</span>
                            )}
                          </div>
                          {rev.title && (
                            <p className="text-xs font-bold text-slate-100">{rev.title}</p>
                          )}
                          <p className="text-[11px] text-slate-300 leading-relaxed">{rev.comment}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveReview(idx)}
                          title="Remove this review before saving"
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons: Review & Edit vs Direct Save */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-indigo-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to publish with Global Shipping &amp; Worldwide Delivery</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReviewInForm}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Review &amp; Edit in Form</span>
              </button>

              <button
                type="button"
                disabled={isSavingDirectly}
                onClick={handleDirectSaveClick}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingDirectly ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    <span>Saving Directly...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-slate-950" />
                    <span>Import &amp; Save Directly</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
