import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { CachedImage } from './CachedImage';
import { 
  parseCSVText, 
  convertPayhipRowsToProducts, 
  exportProductsToCSV 
} from '../utils/productImport';
import { 
  UploadCloud, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  HelpCircle,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface PayhipImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: Product[], replaceExisting: boolean) => void;
  currentProductsCount: number;
  isKa: boolean;
  allProducts: Product[];
}

export const PayhipImportModal: React.FC<PayhipImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentProductsCount,
  isKa,
  allProducts
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'guide'>('upload');
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Product[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);

    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const valid = parsed.map((p, i) => ({
              id: p.id || 'prod-' + Date.now() + '-' + i,
              title: p.title || p.name || 'Imported Product',
              category: p.category || 'everyday',
              price: Number(p.price) || 29.99,
              origPrice: p.origPrice ? Number(p.origPrice) : undefined,
              stock: Number(p.stock) || 50,
              image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
              images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image],
              description: p.description || '',
              rating: p.rating || 5.0,
              reviewsCount: p.reviewsCount || 10,
            }));
            setParsedPreview(valid);
          } else {
            setErrorMsg(isKa ? 'JSON ფაილის ფორმატი არასწორია (უნდა იყოს მასივი)' : 'Invalid JSON format (must be an array)');
          }
        } catch {
          setErrorMsg(isKa ? 'JSON ფაილის წაკითხვა ვერ მოხერხდა' : 'Failed to parse JSON file');
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setCsvRawText(text);
        processCSV(text);
      } catch {
        setErrorMsg(isKa ? 'ფაილის დამუშავება ვერ მოხერხდა' : 'Failed to process file');
      }
    };
    reader.readAsText(file);
  };

  const processCSV = (text: string) => {
    setErrorMsg(null);
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }

    try {
      const rows = parseCSVText(text);
      if (rows.length === 0) {
        setErrorMsg(isKa ? 'CSV ფაილი ცარიელია ან სათაურები არ მოიძებნა' : 'CSV is empty or missing headers');
        setParsedPreview([]);
        return;
      }
      const prods = convertPayhipRowsToProducts(rows);
      setParsedPreview(prods);
    } catch {
      setErrorMsg(isKa ? 'CSV ტექსტის გარჩევა ვერ მოხერხდა' : 'Failed to parse CSV syntax');
      setParsedPreview([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleExportExisting = () => {
    const csvContent = exportProductsToCSV(allProducts);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dbuy_products_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFinalImport = () => {
    if (parsedPreview.length === 0) return;
    onImport(parsedPreview, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight flex items-center space-x-2">
                <span>{isKa ? 'Payhip & CSV პროდუქტების იმპორტი' : 'Payhip & CSV Product Import'}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Auto-Sync
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {isKa 
                  ? 'გადმოიტანეთ Payhip-ის პროდუქტები სურათებით, ფასებით, აღწერითა და სათაურებით' 
                  : 'Import Payhip products instantly with original photos, prices, slugs, and descriptions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 space-x-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'upload'
                ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isKa ? '1. ფაილის ატვირთვა (.csv, .json)' : '1. Upload File (.csv, .json)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'paste'
                ? 'bg-white text-blue-600 border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isKa ? '2. ტექსტის ჩასმა (Paste Text)' : '2. Paste Text'}</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'guide'
                ? 'bg-white text-indigo-600 border-t border-x border-slate-200 shadow-2xs -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isKa ? '📖 Payhip-დან ექსპორტის ინსტრუქცია' : '📖 Payhip Export Guide'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  {fileName ? fileName : (isKa ? 'ჩააგდეთ Payhip CSV ან JSON ფაილი აქ' : 'Drop your Payhip CSV or JSON export here')}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                  {isKa 
                    ? 'ან დააჭირეთ ასარჩევად თქვენი კომპიუტერიდან (.csv, .json, .txt)'
                    : 'or click to browse from your computer (.csv, .json, .txt)'}
                </p>
                <span className="inline-block px-3 py-1 bg-white text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 shadow-2xs">
                  {isKa ? 'ფაილის არჩევა' : 'Browse File'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                {isKa ? 'ჩასვით CSV ან Payhip ექსპორტის მონაცემები:' : 'Paste CSV or Export Text Here:'}
              </label>
              <textarea
                value={csvRawText}
                onChange={(e) => {
                  setCsvRawText(e.target.value);
                  processCSV(e.target.value);
                }}
                placeholder={`Title,Price,Description,Image URL,Category,Stock\nWireless Gaming Mouse,39.99,High performance gaming mouse,https://images.unsplash.com/...,tech,50\nFitness Hydration Flask,24.99,Double insulated steel bottle,https://images.unsplash.com/...,fitness,100`}
                className="w-full h-44 p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed resize-y"
              />
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100 text-xs text-indigo-950">
              <h4 className="text-sm font-black text-indigo-900 flex items-center space-x-2">
                <span>💡 {isKa ? 'სად არის ექსპორტის ღილაკი Payhip-ში (ნაბიჯ-ნაბიჯ):' : 'Where to find the Export button in Payhip:'}</span>
              </h4>
              
              <div className="space-y-3 font-medium text-slate-700">
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">1</span>
                    <span>{isKa ? 'მეთოდი A: „More ▾“ ჩამოსაშლელი ღილაკი' : 'Method A: "More ▾" dropdown'}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-7">
                    {isKa 
                      ? 'თქვენს Products გვერდზე (სადაც 45 პროდუქტი ჩანს), საძიებო ველის მარჯვნივ მოძებნეთ ღილაკი '
                      : 'On your Products page (showing 45 items), next to Reorder look for the button '}
                    <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">More ▾</strong>
                    {isKa 
                      ? ' („Reorder“-ის გვერდით). დააჭირეთ „More ▾“-ს და ჩამონათვალში აირჩიეთ „Export“ ან „Download CSV“.'
                      : ' and click it to find "Export" / "Download CSV".'}
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">2</span>
                    <span>{isKa ? 'მეთოდი B: Account ▾ მენიუდან' : 'Method B: Via Account ▾ menu'}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-7">
                    {isKa 
                      ? 'ზედა მარჯვენა კუთხეში დააჭირეთ '
                      : 'In the top right corner click '}
                    <strong className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Account ▾</strong>
                    {isKa 
                      ? ' $\\rightarrow$ Settings $\\rightarrow$ Export Data / Products.'
                      : ' $\\rightarrow$ Settings $\\rightarrow$ Export Data.'}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
                    <span>{isKa ? 'მეთოდი C: პირდაპირ მაღაზიის ბმულით (Payhip Storefront)' : 'Method C: Payhip Storefront Link'}</span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed pl-7">
                    {isKa 
                      ? 'თუ ექსპორტი მაინც გაგიჭირდათ, შეგიძლიათ მოგვაწოდოთ თქვენი Payhip მაღაზიის საჯარო ბმული (მაგ: payhip.com/თქვენი_სახელი) ან დააკოპიროთ პროდუქტების ტექსტი და პირდაპირ ჩავაშენებთ თქვენს 45-ივე პროდუქტს მაღაზიაში!'
                      : 'You can also share your public Payhip store URL (e.g. payhip.com/your_store) to directly import all 45 products.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-indigo-200 mt-2">
                <p className="text-[11px] text-indigo-800">
                  ⚡ <strong>{isKa ? 'სურათების ავტომატური სინქრონიზაცია:' : 'Automatic Photo Sync:'}</strong> {isKa ? 'გადმოტანისას ყველა პროდუქტის ორიგინალი ფოტო და ფასი ავტომატურად ჩაიტვირთება.' : 'Photos and prices will sync automatically.'}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedPreview.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    {isKa 
                      ? `აღმოჩენილია ${parsedPreview.length} მზა პროდუქტი:` 
                      : `Detected ${parsedPreview.length} Ready Products:`}
                  </span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {isKa ? 'გადახედეთ პროდუქტების სიას იმპორტამდე' : 'Preview before inserting'}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Photo</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedPreview.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2">
                          <CachedImage
                            src={p.image}
                            alt={p.title}
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200"
                          />
                        </td>
                        <td className="p-2 font-bold text-slate-800 max-w-[180px] truncate" title={p.title}>
                          {p.title}
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-2 font-bold text-emerald-600">
                          ${p.price.toFixed(2)}
                          {p.origPrice && <span className="line-through text-slate-400 text-[10px] ml-1">${p.origPrice.toFixed(2)}</span>}
                        </td>
                        <td className="p-2 text-slate-600 font-medium">
                          {p.stock} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Replace or Append Options */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label className="flex items-center space-x-2.5 text-xs text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>
                    {isKa 
                      ? 'არსებული პროდუქტების ჩანაცვლება (წაშლის ძველ 8 პროდუქტს და ჩაწერს მხოლოდ ახლებს)' 
                      : 'Replace existing catalog (Clear current products and keep only new imports)'}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExportExisting}
            className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer w-full sm:w-auto justify-center"
            title="Download full backup of current catalog"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{isKa ? '💾 მიმდინარე ბაზის ექსპორტი (Backup CSV)' : '💾 Export Current Catalog (Backup CSV)'}</span>
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              {isKa ? 'დახურვა' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={parsedPreview.length === 0}
              onClick={handleFinalImport}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer shadow-md ${
                parsedPreview.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isKa 
                  ? `შემოტანა (${parsedPreview.length} პროდუქტი)` 
                  : `Confirm Import (${parsedPreview.length} Products)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
