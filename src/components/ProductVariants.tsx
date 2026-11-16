import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Palette, Ruler, Image as ImageIcon, Upload } from 'lucide-react';
import type { ProductVariant } from '../types';
import {
  parseAmazonVariantsFromHtml,
  guessColorHex,
  normalizeVariantItem,
  getVariantDisplayImage,
} from '../utils/variantUtils';

export { parseAmazonVariantsFromHtml, guessColorHex };
export type { ProductVariant };

export interface AdminVariantBuilderProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  availableImages?: string[];
  defaultPrice: number;
  onUploadImage?: (file: File) => Promise<string>;
  isKa?: boolean;
  theme?: 'auto' | 'dark';
}

export interface VariantSelectionPayload {
  colorName?: string;
  sizeLabel?: string;
  finalPrice: number;
  variantImage?: string;
  matchedVariant?: ProductVariant | null;
  isUserClick?: boolean;
}

export interface StorefrontVariantSelectorProps {
  variants: ProductVariant[];
  basePrice: number;
  productTitle?: string;
  language?: string;
  onSelectVariant: (selection: VariantSelectionPayload) => void;
}

// ============================================================================
// ADMIN VARIANT BUILDER (Used in Product Importer & Admin Product Modal)
// ============================================================================
export const AdminVariantBuilder: React.FC<AdminVariantBuilderProps> = ({
  variants,
  onChange,
  availableImages = [],
  defaultPrice,
  onUploadImage,
  isKa = false,
  theme = 'auto',
}) => {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const safeVariants = useMemo(
    () => (Array.isArray(variants) ? variants : []).map((v, idx) => normalizeVariantItem(v, idx)),
    [variants]
  );

  const isDark = theme === 'dark';

  const containerCls = isDark
    ? 'p-4 rounded-2xl border border-slate-700/80 bg-slate-900/90 space-y-4 text-slate-100'
    : 'p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/80 space-y-4';

  const cardCls = isDark
    ? 'p-3 bg-slate-950/90 border border-slate-800 rounded-xl shadow-xs space-y-2.5'
    : 'p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-2.5';

  const inputCls = isDark
    ? 'w-full px-2.5 py-1.5 text-xs border border-slate-700 rounded-lg bg-slate-900 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-400'
    : 'w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500';

  const labelCls = isDark
    ? 'block text-[10px] font-bold text-slate-400 uppercase mb-1'
    : 'block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1';

  const handleAddVariant = () => {
    const newVar = normalizeVariantItem({
      id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      colorName: 'Black',
      colorHex: '#111111',
      sizeLabel: '',
      price: undefined,
      imageUrl: availableImages[0] || '',
    });
    onChange([...safeVariants, newVar]);
  };

  const handleUpdate = (index: number, field: keyof ProductVariant, value: unknown) => {
    const updated = safeVariants.map((item, i) => {
      if (i !== index) return item;
      const merged: ProductVariant = {
        ...item,
        [field]: value,
      };
      // Keep synced legacy fields (name, colorCode, images)
      if (field === 'colorName') {
        const strVal = String(value || '');
        if (!item.colorHex || item.colorHex === guessColorHex(item.colorName || '')) {
          merged.colorHex = strVal ? guessColorHex(strVal) : item.colorHex;
        }
      }
      if (field === 'colorHex') {
        merged.colorCode = String(value || '#000000');
      }
      if (field === 'imageUrl') {
        const imgStr = String(value || '').trim();
        const rest = (item.images || []).filter((u) => u && u !== item.imageUrl && u !== imgStr);
        merged.images = imgStr ? [imgStr, ...rest] : rest;
      }
      const nextColor = (merged.colorName || '').trim();
      const nextSize = (merged.sizeLabel || '').trim();
      merged.name = [nextColor, nextSize].filter(Boolean).join(' / ') || item.name || 'Variant';
      merged.colorCode = merged.colorHex || '#000000';
      return merged;
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(safeVariants.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!onUploadImage || !file.type.startsWith('image/')) return;
    setUploadingIdx(index);
    try {
      const uploadedUrl = await onUploadImage(file);
      if (uploadedUrl) {
        handleUpdate(index, 'imageUrl', uploadedUrl);
      }
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className={`text-xs sm:text-sm font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
            <Palette className="w-4 h-4 text-blue-500" />
            <span>
              {isKa
                ? `პროდუქტის ვარიანტები (ფერები, ზომები და სურათები) — ${safeVariants.length}`
                : `Product Variants (Colors, Sizes & Images) — ${safeVariants.length}`}
            </span>
          </h3>
          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {isKa
              ? 'მიუთითეთ ფერის წრე, სახელი, ზომა/მოცულობა, ფასი ან კონკრეტული სურათი. ცარიელის დატოვებისას იმუშავებს ძირითადი ფასი და გალერეა.'
              : 'Optional: define color swatches, sizes/capacities, custom prices, and variant-specific photos.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddVariant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isKa ? '+ ვარიანტის დამატება' : 'Add Variant'}</span>
        </button>
      </div>

      {safeVariants.length === 0 ? (
        <div
          className={`text-center py-4 text-xs border border-dashed rounded-xl ${
            isDark
              ? 'text-slate-400 border-slate-700 bg-slate-950/50'
              : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-950/50'
          }`}
        >
          {isKa
            ? 'ვარიანტები არ არის დამატებული. პროდუქტი გაიყიდება სტანდარტული სახით.'
            : 'No variants added yet. Product will use its base price and main gallery.'}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {safeVariants.map((variant, idx) => {
            const currentImg = getVariantDisplayImage(variant);
            return (
              <div key={variant.id || idx} className={cardCls}>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Color Picker Circle + Hex */}
                  <div className="sm:col-span-2 flex flex-col">
                    <label className={labelCls}>{isKa ? 'ფერის წრე' : 'Color Hex'}</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={variant.colorHex || '#111111'}
                        onChange={(e) => handleUpdate(idx, 'colorHex', e.target.value)}
                        className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer p-0 bg-transparent shrink-0"
                        title="Pick color hex"
                      />
                      <input
                        type="text"
                        value={variant.colorHex || '#111111'}
                        onChange={(e) => handleUpdate(idx, 'colorHex', e.target.value)}
                        className={`${inputCls} font-mono`}
                        aria-label="Color hex value"
                      />
                    </div>
                  </div>

                  {/* Color Name */}
                  <div className="sm:col-span-3">
                    <label className={labelCls}>{isKa ? 'ფერის სახელი' : 'Color Name'}</label>
                    <input
                      type="text"
                      placeholder="e.g. Midnight Black"
                      value={variant.colorName || ''}
                      onChange={(e) => handleUpdate(idx, 'colorName', e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Size / Capacity */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{isKa ? 'ზომა / მოცულობა' : 'Size / Option'}</label>
                    <input
                      type="text"
                      placeholder="XL, 500ml, 256GB"
                      value={variant.sizeLabel || ''}
                      onChange={(e) => handleUpdate(idx, 'sizeLabel', e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {/* Optional Variant Price */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{isKa ? 'ფასი ($)' : 'Price ($ Opt.)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={defaultPrice ? `$${defaultPrice}` : 'Base'}
                      value={variant.price ?? ''}
                      onChange={(e) =>
                        handleUpdate(idx, 'price', e.target.value ? Number(e.target.value) : undefined)
                      }
                      className={inputCls}
                    />
                  </div>

                  {/* Image Picker / URL */}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{isKa ? 'სურათი' : 'Variant Image'}</label>
                    {availableImages.length > 0 ? (
                      <select
                        value={availableImages.includes(currentImg) ? currentImg : ''}
                        onChange={(e) => handleUpdate(idx, 'imageUrl', e.target.value)}
                        className={inputCls}
                      >
                        <option value="">{isKa ? '-- მთავარი ფოტო --' : '-- Main Gallery --'}</option>
                        {availableImages.map((imgUrl, imgIdx) => (
                          <option key={`${imgUrl}-${imgIdx}`} value={imgUrl}>
                            {isKa ? `ფოტო #${imgIdx + 1}` : `Photo #${imgIdx + 1}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="https://... or /uploads/..."
                        value={currentImg}
                        onChange={(e) => handleUpdate(idx, 'imageUrl', e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>

                  {/* Delete Action */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
                      title={isKa ? 'ვარიანტის წაშლა' : 'Remove Variant'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Custom Image URL + Thumbnail Preview + Optional R2 Upload */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  {currentImg ? (
                    <img
                      src={currentImg}
                      alt={variant.colorName || `Variant ${idx + 1}`}
                      className="w-8 h-8 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder={isKa ? 'ან ჩასვით სურათის URL...' : 'Or paste custom variant image URL...'}
                    value={currentImg}
                    onChange={(e) => handleUpdate(idx, 'imageUrl', e.target.value)}
                    className={`${inputCls} flex-1 min-w-[160px] font-mono`}
                  />

                  {onUploadImage && (
                    <label className="px-2.5 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0">
                      <Upload className="w-3 h-3" />
                      <span>
                        {uploadingIdx === idx
                          ? isKa
                            ? 'იტვირთება...'
                            : 'Uploading...'
                          : isKa
                          ? 'R2 ატვირთვა'
                          : 'Upload R2'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STOREFRONT VARIANT SELECTOR (Used on Product Detail Page)
// ============================================================================
export const StorefrontVariantSelector: React.FC<StorefrontVariantSelectorProps> = ({
  variants,
  basePrice,
  productTitle = '',
  language = 'en',
  onSelectVariant,
}) => {
  const normalizedVariants = useMemo(
    () => (Array.isArray(variants) ? variants : []).map((v, idx) => normalizeVariantItem(v, idx)),
    [variants]
  );

  const uniqueColors = useMemo(() => {
    const map = new Map<
      string,
      { name: string; nameKa?: string; hex: string; imageUrl?: string }
    >();
    for (const v of normalizedVariants) {
      const cname = (v.colorName || '').trim();
      if (!cname) continue;
      const key = cname.toLowerCase();
      const existing = map.get(key);
      const vImg = getVariantDisplayImage(v);
      const resolvedHex =
        v.colorHex && v.colorHex !== '#000000'
          ? v.colorHex
          : v.colorCode && v.colorCode !== '#000000'
          ? v.colorCode
          : guessColorHex(cname);
      if (!existing) {
        map.set(key, {
          name: cname,
          nameKa: v.nameKa,
          hex: resolvedHex,
          imageUrl: vImg || undefined,
        });
      } else if (!existing.imageUrl && vImg) {
        existing.imageUrl = vImg;
      }
    }
    return Array.from(map.values());
  }, [normalizedVariants]);

  const uniqueSizes = useMemo(() => {
    return Array.from(
      new Set(normalizedVariants.map((v) => (v.sizeLabel || '').trim()).filter(Boolean))
    );
  }, [normalizedVariants]);

  const variantsSignature = useMemo(
    () =>
      normalizedVariants
        .map((v) => `${v.id || ''}:${v.colorName || ''}:${v.sizeLabel || ''}:${v.price ?? ''}:${v.imageUrl || ''}`)
        .join('|'),
    [normalizedVariants]
  );

  const resolveInitialColor = () => {
    if (uniqueColors.length === 0) return '';
    const lowerTitle = (productTitle || '').toLowerCase();
    if (lowerTitle) {
      const titleMatch = uniqueColors.find((c) => {
        const cname = c.name.toLowerCase();
        return cname.length > 1 && new RegExp(`\\b${cname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lowerTitle);
      });
      if (titleMatch) return titleMatch.name;
    }
    return uniqueColors[0]?.name || '';
  };

  const [selectedColor, setSelectedColor] = useState<string>(resolveInitialColor);
  const [selectedSize, setSelectedSize] = useState<string>(uniqueSizes[0] || '');
  const lastEmittedRef = useRef<string>('');
  const pendingUserClickRef = useRef<boolean>(false);
  const onSelectRef = useRef(onSelectVariant);
  onSelectRef.current = onSelectVariant;

  // Reset initial selections when product variants change
  useEffect(() => {
    setSelectedColor(resolveInitialColor());
    setSelectedSize(uniqueSizes[0] || '');
    lastEmittedRef.current = '';
    pendingUserClickRef.current = false;
  }, [variantsSignature, productTitle]);

  // Resolve matching variant cleanly
  const matchedVariant = useMemo(() => {
    if (normalizedVariants.length === 0) return null;
    const exact = normalizedVariants.find((v) => {
      const colorOk =
        uniqueColors.length === 0 ||
        (v.colorName || '').trim().toLowerCase() === selectedColor.trim().toLowerCase();
      const sizeOk =
        uniqueSizes.length === 0 ||
        (v.sizeLabel || '').trim() === selectedSize.trim();
      return colorOk && sizeOk;
    });
    if (exact) return exact;

    if (selectedColor) {
      const byColor = normalizedVariants.find(
        (v) => (v.colorName || '').trim().toLowerCase() === selectedColor.trim().toLowerCase()
      );
      if (byColor) return byColor;
    }
    if (selectedSize) {
      const bySize = normalizedVariants.find(
        (v) => (v.sizeLabel || '').trim() === selectedSize.trim()
      );
      if (bySize) return bySize;
    }
    return normalizedVariants[0] || null;
  }, [normalizedVariants, uniqueColors.length, uniqueSizes.length, selectedColor, selectedSize]);

  // Notify parent whenever selection resolves to new output
  useEffect(() => {
    if (normalizedVariants.length === 0) return;

    const finalPrice =
      matchedVariant?.price !== undefined && matchedVariant.price > 0
        ? matchedVariant.price
        : basePrice;

    const colorFallbackImg = uniqueColors.find(
      (c) => c.name.toLowerCase() === selectedColor.trim().toLowerCase()
    )?.imageUrl;
    const variantImage = getVariantDisplayImage(matchedVariant) || colorFallbackImg || undefined;

    const emitKey = `${selectedColor}|${selectedSize}|${finalPrice}|${variantImage || ''}|${matchedVariant?.id || ''}`;
    if (lastEmittedRef.current === emitKey) return;
    lastEmittedRef.current = emitKey;

    const isUserClick = pendingUserClickRef.current;
    pendingUserClickRef.current = false;

    onSelectRef.current({
      colorName: selectedColor || undefined,
      sizeLabel: selectedSize || undefined,
      finalPrice,
      variantImage,
      matchedVariant,
      isUserClick,
    });
  }, [normalizedVariants.length, matchedVariant, basePrice, selectedColor, selectedSize, uniqueColors]);

  if (normalizedVariants.length === 0) return null;
  if (uniqueColors.length === 0 && uniqueSizes.length === 0) return null;

  const isKa = language === 'ka';
  const activeColorObj = uniqueColors.find(
    (c) => c.name.toLowerCase() === selectedColor.trim().toLowerCase()
  );
  const displayedColorName =
    isKa && activeColorObj?.nameKa ? activeColorObj.nameKa : selectedColor;

  const handleColorClick = (colorName: string) => {
    pendingUserClickRef.current = true;
    const alreadySelected = selectedColor.trim().toLowerCase() === colorName.trim().toLowerCase();
    setSelectedColor(colorName);

    let nextSize = selectedSize;
    if (uniqueSizes.length > 0) {
      const hasCurrentSize = normalizedVariants.some(
        (v) =>
          (v.colorName || '').trim().toLowerCase() === colorName.toLowerCase() &&
          (v.sizeLabel || '').trim() === selectedSize.trim()
      );
      if (!hasCurrentSize) {
        const firstForColor = normalizedVariants.find(
          (v) =>
            (v.colorName || '').trim().toLowerCase() === colorName.toLowerCase() &&
            (v.sizeLabel || '').trim() !== ''
        );
        if (firstForColor?.sizeLabel) {
          nextSize = firstForColor.sizeLabel.trim();
          setSelectedSize(nextSize);
        }
      }
    }

    // If user clicked the already-active color, immediately jump gallery to its matching image
    if (alreadySelected) {
      pendingUserClickRef.current = false;
      const colorObj = uniqueColors.find(
        (c) => c.name.toLowerCase() === colorName.trim().toLowerCase()
      );
      const finalPrice =
        matchedVariant?.price !== undefined && matchedVariant.price > 0
          ? matchedVariant.price
          : basePrice;
      const variantImage = getVariantDisplayImage(matchedVariant) || colorObj?.imageUrl || undefined;
      onSelectRef.current({
        colorName,
        sizeLabel: nextSize || undefined,
        finalPrice,
        variantImage,
        matchedVariant,
        isUserClick: true,
      });
    }
  };

  const handleSizeClick = (size: string) => {
    setSelectedSize(size);
    if (uniqueColors.length > 0) {
      const hasCurrentColor = normalizedVariants.some(
        (v) =>
          (v.colorName || '').trim().toLowerCase() === selectedColor.trim().toLowerCase() &&
          (v.sizeLabel || '').trim() === size
      );
      if (!hasCurrentColor) {
        const firstForSize = normalizedVariants.find(
          (v) =>
            (v.sizeLabel || '').trim() === size &&
            (v.colorName || '').trim() !== ''
        );
        if (firstForSize?.colorName) {
          setSelectedColor(firstForSize.colorName.trim());
        }
      }
    }
  };

  return (
    <div className="space-y-4 py-2 border-y border-slate-100 dark:border-slate-800/80">
      {/* Color Selector */}
      {uniqueColors.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {isKa ? 'ფერი:' : 'Color:'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {displayedColorName}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueColors.map((c) => {
              const isSelected = selectedColor.trim().toLowerCase() === c.name.toLowerCase();
              const label = isKa && c.nameKa ? c.nameKa : c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleColorClick(c.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                  title={label}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-slate-300 dark:border-white/30 shrink-0 shadow-2xs"
                    style={{ backgroundColor: c.hex || guessColorHex(c.name) }}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size / Capacity Selector */}
      {uniqueSizes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {isKa ? 'ზომა / ვარიანტი:' : 'Size / Option:'}
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">{selectedSize}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map((sz) => {
              const isSelected = selectedSize.trim() === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSizeClick(sz)}
                  className={`px-3.5 py-1.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  {sz}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
