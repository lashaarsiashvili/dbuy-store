import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  DownloadCloud,
  UploadCloud,
  Database,
  Server,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface StoreSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isKa: boolean;
}

export const StoreSyncModal: React.FC<StoreSyncModalProps> = ({
  isOpen,
  onClose,
  isKa,
}) => {
  const {
    products,
    theme,
    orders,
    billboards,
    refreshServerStore,
    syncWithRemoteStore,
    exportFullDatabase,
    importFullDatabase,
    persistCatalogToCode,
    addToast,
  } = useStore();

  const [remoteUrl, setRemoteUrl] = useState(
    'https://ais-dev-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app'
  );
  const [isPulling, setIsPulling] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonPaste, setShowJsonPaste] = useState(false);

  if (!isOpen) return null;

  const handlePullFromRemote = async () => {
    if (!remoteUrl.trim()) {
      addToast(isKa ? 'გთხოვთ მიუთითოთ საიტის URL' : 'Please enter site URL', 'warning');
      return;
    }
    setIsPulling(true);
    try {
      await syncWithRemoteStore(remoteUrl.trim());
    } finally {
      setIsPulling(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshServerStore();
      addToast(
        isKa ? 'სერვერული მონაცემები განახლებულია!' : 'Server data refreshed successfully!',
        'success'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveToCode = async () => {
    setIsSavingCode(true);
    try {
      await persistCatalogToCode();
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        await importFullDatabase(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteImport = async () => {
    if (!jsonInput.trim()) return;
    await importFullDatabase(jsonInput.trim());
    setJsonInput('');
    setShowJsonPaste(false);
  };

  return (
    <div
      id="store-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="store-sync-modal-card"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isKa ? 'ცოცხალი საიტის სინქრონიზაცია & ბაზა' : 'Live Site Sync & Database Management'}
              </h2>
              <p className="text-xs text-slate-300">
                {isKa
                  ? 'გაშვებული საიტიდან მონაცემების გადმოტანა, ბექაფი და კოდში დაფიქსირება'
                  : 'Synchronize products & changes between live site and this workspace'}
              </p>
            </div>
          </div>
          <button
            id="close-sync-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {isKa ? 'ავტო-სინქრონიზაცია აქტიურია (ყოველ 3 წამში)' : 'Live Auto-Sync Active (every 3s)'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  {isKa
                    ? `ბაზაშია: ${products.length} პროდუქტი | ${orders.length} შეკვეთა | ${billboards.length} ბანერი`
                    : `Active in store: ${products.length} products | ${orders.length} orders | ${billboards.length} banners`}
                </p>
              </div>
            </div>

            <button
              id="refresh-server-store-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isKa ? 'გადამოწმება' : 'Check Now'}</span>
            </button>
          </div>

          {/* Section 1: Pull from Live Site */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  {isKa ? '1. გაშვებული საიტიდან მონაცემების გადმოტანა (Live Pull)' : '1. Pull Data from Running / Live Site'}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                Real-Time
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isKa
                ? 'თუ პროდუქტები ან დიზაინი შეცვალეთ გაშვებულ საიტზე (მობილურზე ან ცალკე ლინკზე), მიუთითეთ საიტის ბმული და დააჭირეთ „გადმოტანას“. ყველა მონაცემი გადმოვა აქ და ჩაიწერება ბაზაში.'
                : 'If you made changes or added products on the running live URL or another tab, enter the URL below to pull everything directly into this environment.'}
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700">
                {isKa ? 'გაშვებული საიტის URL:' : 'Running Site URL:'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://ais-dev-...europe-west2.run.app"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  id="pull-remote-data-btn"
                  onClick={handlePullFromRemote}
                  disabled={isPulling}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
                >
                  <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>{isPulling ? (isKa ? 'მოაქვს...' : 'Pulling...') : isKa ? 'მონაცემების გადმოტანა' : 'Pull Live Data'}</span>
                </button>
              </div>

              {/* Quick URL Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 font-medium mr-1">
                  {isKa ? 'პრესეტები:' : 'Presets:'}
                </span>
                <button
                  onClick={() => setRemoteUrl('https://ais-dev-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono transition-colors cursor-pointer"
                >
                  ais-dev (Development)
                </button>
                <button
                  onClick={() => setRemoteUrl('https://ais-pre-urom3ip75pytiauvmfvpzc-860545615937.europe-west2.run.app')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono transition-colors cursor-pointer"
                >
                  ais-pre (Shared Preview)
                </button>
                <button
                  onClick={() => setRemoteUrl(window.location.origin)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-mono transition-colors cursor-pointer"
                >
                  current (This Window)
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Codebase Persistence */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  {isKa ? '2. კოდში მუდმივად დაფიქსირება (src/data/initialProducts.ts)' : '2. Permanently Save to Codebase'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              {isKa
                ? 'დააჭირეთ ამ ღილაკს, რათა ამჟამინდელი ყველა დამატებული პროდუქტი პირდაპირ ჩაიწეროს ფაილში src/data/initialProducts.ts. ასე პროდუქტები მუდმივად გახდება საიტის საბაზისო კოდის ნაწილი.'
                : 'Commit all currently active products directly into src/data/initialProducts.ts so they become permanent source code.'}
            </p>

            <button
              id="commit-to-codebase-btn"
              onClick={handleSaveToCode}
              disabled={isSavingCode}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Zap className={`w-4 h-4 text-amber-400 ${isSavingCode ? 'animate-bounce' : ''}`} />
              <span>
                {isSavingCode
                  ? (isKa ? 'იწერება კოდში...' : 'Writing to code...')
                  : (isKa ? `კოდში დაფიქსირება (${products.length} პროდუქტი)` : `Commit to Codebase (${products.length} products)`)}
              </span>
            </button>
          </div>

          {/* Section 3: Full JSON Backup & Restore */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2">
              <DownloadCloud className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                {isKa ? '3. ბაზის სრული ბექაფი (Export & Import JSON)' : '3. Full Database Backup & Restore'}
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              {isKa
                ? 'შეგიძლიათ ჩამოტვირთოთ საიტის სრული მონაცემთა ბაზა (პროდუქტები, თემა, ბანერები) ერთ JSON ფაილად, ან ატვირთოთ ნებისმიერი ადრე შენახული ბექაფი.'
                : 'Download or upload a complete standalone JSON backup of the store database.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="export-full-db-btn"
                onClick={exportFullDatabase}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>{isKa ? 'ბაზის ჩამოტვირთვა (.json)' : 'Export Backup (.json)'}</span>
              </button>

              <label className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>{isKa ? 'ბექაფის ატვირთვა (.json)' : 'Upload Backup (.json)'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowJsonPaste(!showJsonPaste)}
                className="text-xs text-blue-600 hover:underline font-semibold ml-auto"
              >
                {showJsonPaste ? (isKa ? 'ტექსტის დამალვა' : 'Hide paste box') : (isKa ? 'ან ჩასვით JSON ტექსტი' : 'or paste JSON text')}
              </button>
            </div>

            {showJsonPaste && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"products": [...], "theme": {...}}'
                  rows={4}
                  className="w-full p-3 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  onClick={handlePasteImport}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isKa ? 'JSON ტექსტის იმპორტი' : 'Import Pasted JSON'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            {isKa ? 'დახურვა' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
