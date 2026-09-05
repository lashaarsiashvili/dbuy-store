import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, 
  Check, 
  X, 
  RotateCcw, 
  Sun, 
  Contrast, 
  Sparkles, 
  Sliders, 
  ShieldCheck, 
  ZoomIn, 
  Layers 
} from 'lucide-react';
import { 
  optimizeProductImage, 
  STUDIO_STYLE_PRESETS, 
  StudioBackgroundStyle, 
  ImageOptimizationOptions 
} from '../utils/productImageOptimizer';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageIndex: number;
  productTitle?: string;
  onApply: (optimizedImage: string, index: number) => void;
  isKa?: boolean;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageIndex,
  productTitle,
  onApply,
  isKa = false,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<StudioBackgroundStyle>('studio-clean');
  const [brightness, setBrightness] = useState<number>(6);
  const [contrast, setContrast] = useState<number>(12);
  const [sharpness, setSharpness] = useState<number>(35);
  const [shadowIntensity, setShadowIntensity] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(1.0);
  const [removeBackground, setRemoveBackground] = useState<boolean>(true);
  const [bgTolerance, setBgTolerance] = useState<number>(32);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [optimizedResult, setOptimizedResult] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'compare'>('preview');

  const processTimeoutRef = useRef<any>(null);

  // Trigger optimization whenever parameters change
  const runOptimization = async (overrideOpts?: Partial<ImageOptimizationOptions>) => {
    if (!imageSrc) return;
    setIsProcessing(true);
    try {
      const res = await optimizeProductImage(imageSrc, {
        style: overrideOpts?.style || selectedStyle,
        brightness: overrideOpts?.brightness !== undefined ? overrideOpts.brightness : brightness,
        contrast: overrideOpts?.contrast !== undefined ? overrideOpts.contrast : contrast,
        sharpness: overrideOpts?.sharpness !== undefined ? overrideOpts.sharpness : sharpness,
        shadowIntensity: overrideOpts?.shadowIntensity !== undefined ? overrideOpts.shadowIntensity : shadowIntensity,
        zoom: overrideOpts?.zoom !== undefined ? overrideOpts.zoom : zoom,
        removeBackground: overrideOpts?.removeBackground !== undefined ? overrideOpts.removeBackground : removeBackground,
        bgTolerance: overrideOpts?.bgTolerance !== undefined ? overrideOpts.bgTolerance : bgTolerance,
      });
      setOptimizedResult(res);
    } catch (err) {
      console.error('Image optimization failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (isOpen && imageSrc) {
      setSelectedStyle('studio-clean');
      setBrightness(6);
      setContrast(12);
      setSharpness(35);
      setShadowIntensity(45);
      setZoom(1.0);
      setRemoveBackground(true);
      setBgTolerance(32);
      runOptimization({
        style: 'studio-clean',
        brightness: 6,
        contrast: 12,
        sharpness: 35,
        shadowIntensity: 45,
        zoom: 1.0,
        removeBackground: true,
        bgTolerance: 32,
      });
    }
  }, [isOpen, imageSrc]);

  // Debounced update on slider changes
  const handleSliderChange = (
    key: 'brightness' | 'contrast' | 'sharpness' | 'shadowIntensity' | 'zoom',
    value: number
  ) => {
    if (key === 'brightness') setBrightness(value);
    if (key === 'contrast') setContrast(value);
    if (key === 'sharpness') setSharpness(value);
    if (key === 'shadowIntensity') setShadowIntensity(value);
    if (key === 'zoom') setZoom(value);

    if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
    processTimeoutRef.current = setTimeout(() => {
      runOptimization({ [key]: value });
    }, 180);
  };

  const handleSelectStyle = (style: StudioBackgroundStyle) => {
    setSelectedStyle(style);
    runOptimization({ style });
  };

  const handleApply = () => {
    if (optimizedResult) {
      onApply(optimizedResult, imageIndex);
      onClose();
    }
  };

  const handleReset = () => {
    setSelectedStyle('studio-clean');
    setBrightness(6);
    setContrast(12);
    setSharpness(35);
    setShadowIntensity(45);
    setZoom(1.0);
    runOptimization({
      style: 'studio-clean',
      brightness: 6,
      contrast: 12,
      sharpness: 35,
      shadowIntensity: 45,
      zoom: 1.0,
    });
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      id="product-image-studio-modal"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                {isKa ? 'სტუდიური სურათის ოპტიმიზატორი' : 'Studio Image Optimizer'}
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {isKa ? `სურათი #${imageIndex + 1}` : `Image #${imageIndex + 1}`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {productTitle ? productTitle : (isKa ? 'კონკრეტული პროდუქტის დამუშავება' : 'Selected Product Photo')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            id="close-studio-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Visual Canvas / Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            
            {/* View Switcher */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  ✨ {isKa ? 'სტუდიური ვერსია' : 'Studio Result'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('compare')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'compare'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  ⚖️ {isKa ? 'შედარება (ორიგინალი / შედეგი)' : 'Compare (Before / After)'}
                </button>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>{isKa ? 'მუშავდება...' : 'Optimizing...'}</span>
                </div>
              )}
            </div>

            {/* Display Canvas Box */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shadow-inner">
              
              {activeTab === 'preview' ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  {optimizedResult ? (
                    <img
                      src={optimizedResult}
                      alt="Optimized product"
                      className="w-full h-full object-contain rounded-xl transition-all duration-200"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Sparkles className="w-8 h-8 animate-spin text-blue-500" />
                      <p className="text-xs">{isKa ? 'სურათის დამუშავება...' : 'Rendering studio image...'}</p>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isKa ? 'იდენტობა დაცულია' : 'Identity Preserved'}</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
                  {/* Before */}
                  <div className="relative flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900/50">
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {isKa ? 'ატვირთული' : 'Original'}
                    </span>
                    <img
                      src={imageSrc}
                      alt="Original"
                      className="max-h-[85%] max-w-[85%] object-contain"
                    />
                  </div>

                  {/* After */}
                  <div className="relative flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-950">
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white shadow-2xs">
                      {isKa ? 'სტუდიური' : 'Studio Enhanced'}
                    </span>
                    {optimizedResult && (
                      <img
                        src={optimizedResult}
                        alt="Optimized"
                        className="max-h-[85%] max-w-[85%] object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quality badge note */}
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {isKa 
                  ? 'ეს ოპტიმიზაცია ცვლის მხოლოდ ამ კონკრეტულ სურათს: უცვლის ფონს, ცენტრავს, ამატებს იატაკის ჩრდილს და აუმჯობესებს ხარისხს. სხვა პროდუქტებს არ ეხება!'
                  : 'This optimization only affects this specific product image: replaces background, centers the subject, adds realistic floor shadow, and boosts clarity without altering other products!'}
              </span>
            </div>
          </div>

          {/* Right Column: Studio Controls & Presets (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Style Presets */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                {isKa ? 'სტუდიური ფონის სტილი' : 'Studio Backdrop Style'}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {STUDIO_STYLE_PRESETS.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectStyle(preset.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-xl p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 shrink-0">
                        {preset.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {isKa ? preset.labelKa : preset.labelEn}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {isKa ? preset.descKa : preset.labelEn}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fine Tuning Sliders */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  {isKa ? 'დეტალური პარამეტრები' : 'Studio Fine Tuning'}
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  {isKa ? 'განულება' : 'Reset'}
                </button>
              </div>

              {/* Background Replacement Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">
                      {isKa ? 'სტუდიური ფონის შეცვლა' : 'Replace with Studio Backdrop'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isKa ? 'აშორებს ძველ ფონს და სვამს სუფთა სტუდიაში' : 'Isolates product & anchors in clean studio'}
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setRemoveBackground(val);
                      runOptimization({ removeBackground: val });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Background Detection Tolerance (if removeBackground is on) */}
              {removeBackground && (
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      {isKa ? 'ფონის ამოცნობის მგრძნობელობა' : 'Background Tolerance'}
                    </span>
                    <span>{bgTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="65"
                    value={bgTolerance}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBgTolerance(val);
                      if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
                      processTimeoutRef.current = setTimeout(() => {
                        runOptimization({ bgTolerance: val });
                      }, 180);
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}

              {/* Sharpness */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    {isKa ? 'სიმკვეთრე / HD ხარისხი' : 'Sharpness & Clarity'}
                  </span>
                  <span>{sharpness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={sharpness}
                  onChange={(e) => handleSliderChange('sharpness', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Floor Shadow */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    {isKa ? 'იატაკის 3D ჩრდილი' : 'Floor Shadow'}
                  </span>
                  <span>{shadowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shadowIntensity}
                  onChange={(e) => handleSliderChange('shadowIntensity', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Brightness */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    {isKa ? 'განათება / სიკაშკაშე' : 'Lighting & Brightness'}
                  </span>
                  <span>{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="35"
                  value={brightness}
                  onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-slate-500" />
                    {isKa ? 'კონტრასტი / ფერები' : 'Contrast & Vibrance'}
                  </span>
                  <span>{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  value={contrast}
                  onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Centering & Zoom */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-blue-500" />
                    {isKa ? 'მასშტაბი & ჩარჩო' : 'Framing & Scale'}
                  </span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => handleSliderChange('zoom', Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isKa ? 'გაუქმება' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isProcessing || !optimizedResult}
              onClick={handleApply}
              id="apply-studio-optimization-btn"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isKa ? 'შენახვა ამ სურათზე' : 'Apply to this Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
