import React, { useState } from 'react';
import { 
  Link as LinkIcon, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  ArrowRight, 
  Check, 
  Save, 
  Edit3, 
  ImageIcon, 
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
  Globe
} from 'lucide-react';
import { ScrapedProductData, parseProductHtml } from '../utils/productScraper';
import { smartApiFetch } from '../lib/api';

interface ProductUrlImporterProps {
  onPopulateForm: (data: ScrapedProductData) => void;
  onDirectSave: (data: ScrapedProductData) => Promise<boolean>;
  isKa?: boolean;
  formatPrice: (amount: number) => string;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ProductUrlImporter: React.FC<ProductUrlImporterProps> = ({
  onPopulateForm,
  onDirectSave,
  isKa = false,
  formatPrice,
  addToast,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);
  const [extractedData, setExtractedData] = useState<ScrapedProductData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBotBlocked, setIsBotBlocked] = useState(false);
  const [showHtmlPaste, setShowHtmlPaste] = useState(false);
  const [rawHtml, setRawHtml] = useState('');

  // Editable fields in preview card
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOrigPrice, setEditOrigPrice] = useState<number | undefined>(undefined);
  const [editCategory, setEditCategory] = useState<string>('tech');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

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
        setExtractedData(item);
        setEditTitle(item.title);
        setEditPrice(item.price || 49.99);
        setEditOrigPrice(item.origPrice);
        setEditCategory(item.category || 'tech');
        setGalleryImages(cleanImgs);
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
            setExtractedData(clientParsed);
            setEditTitle(clientParsed.title);
            setEditPrice(clientParsed.price || 49.99);
            setEditOrigPrice(clientParsed.origPrice);
            setEditCategory(clientParsed.category || 'tech');
            setGalleryImages(cleanImgs);
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
          setExtractedData(clientParsed);
          setEditTitle(clientParsed.title);
          setEditPrice(clientParsed.price || 49.99);
          setEditOrigPrice(clientParsed.origPrice);
          setEditCategory(clientParsed.category || 'tech');
          setGalleryImages(cleanImgs);
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

  const handleMakeCover = (index: number) => {
    if (index === 0) return;
    setGalleryImages(prev => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
    addToast('Set as primary cover photo', 'info');
  };

  const handleRemoveImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    addToast('Removed image from gallery', 'info');
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= galleryImages.length) return;
    setGalleryImages(prev => {
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const getUpdatedProductData = (): ScrapedProductData => {
    return {
      ...(extractedData || {
        description: '',
        features: [],
        sourceUrl: url,
        marketplace: 'unknown',
      }),
      title: editTitle.trim() || extractedData?.title || 'Imported Product',
      price: editPrice || 49.99,
      origPrice: editOrigPrice,
      category: editCategory,
      images: galleryImages,
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
    const finalData = getUpdatedProductData();
    setIsSavingDirectly(true);
    try {
      const success = await onDirectSave(finalData);
      if (success) {
        setUrl('');
        setRawHtml('');
        setExtractedData(null);
        setShowHtmlPaste(false);
      }
    } finally {
      setIsSavingDirectly(false);
    }
  };

  const isAmazonUrl = /amazon\.|amzn\.to/i.test(url);
  const isEbayUrl = /ebay\./i.test(url);

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
                <span>1-Click Amazon & eBay Product Importer</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                PRO SCRAPER
              </span>
            </div>
            <p className="text-xs text-indigo-200/80">
              {isKa 
                ? 'ჩასვით Amazon (amazon.com, amzn.to) ან eBay (ebay.com/itm) ბმული სრული გალერეის, ფასისა და სპეციფიკაციების ავტომატური ექსტრაქციისთვის'
                : 'Paste any Amazon or eBay link to extract high-res gallery images, USD pricing, and full English specs'}
            </p>
          </div>
        </div>

        {/* Badges indicating supported marketplaces */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
            <span>📦 Amazon</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
            <span>🏷️ eBay</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            <Globe className="w-3 h-3 mr-0.5" />
            <span>Global Delivery</span>
          </span>
        </div>
      </div>

      {/* URL Input Bar */}
      <div className="relative z-10">
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
            onClick={() => setShowHtmlPaste(prev => !prev)}
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

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{errorMsg}</p>
              {isBotBlocked && (
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
                ⭐ Click "Set as Cover" or drag/reorder • First image is store cover photo
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
                          // If loaded with query parameters and failed, retry once with clean URL
                          if (!target.dataset.triedClean && target.src.includes('?')) {
                            target.dataset.triedClean = 'true';
                            target.src = target.src.split('?')[0];
                            return;
                          }
                          // Gracefully show visual placeholder rather than leaving empty black box
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

          {/* Action Buttons: Review & Edit vs Direct Save */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-indigo-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready to publish with Global Shipping & Worldwide Delivery</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleReviewInForm}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
                <span>Review & Edit in Form</span>
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
                    <span>Import & Save Directly</span>
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
