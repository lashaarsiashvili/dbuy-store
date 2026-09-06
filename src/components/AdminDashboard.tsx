import React, { useState, useRef, useEffect } from 'react';
import { useStore, generateProductSlug } from '../context/StoreContext';
import { smartApiFetch } from '../lib/api';
import { Product, Order, BillboardSlide, LogoOptionId } from '../types';
import { generateProductFeatures } from '../utils/productFeatures';
import { generateProductAdCopy } from '../utils/adCopyGenerator';
import { handleImageError } from '../utils/imageFallback';
import { saveImageBackupIDB } from '../utils/imageStorage';
import { AdminAnalytics } from './AdminAnalytics';
import { BrandLogo } from './BrandLogo';
import { LogoPreviewModal } from './LogoPreviewModal';
import { PayhipImportModal } from './PayhipImportModal';
import { StoreSyncModal } from './StoreSyncModal';
import { 
  ShieldCheck, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  Users, 
  Plus, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Save, 
  Lock, 
  Unlock, 
  ExternalLink, 
  X, 
  Check, 
  Eye,
  EyeOff,
  Upload,
  UploadCloud,
  Download,
  Database,
  ImageIcon,
  Link as LinkIcon,
  CheckCircle2,
  Globe,
  Activity,
  Layers,
  Sparkles,
  Clock,
  SlidersHorizontal,
  Sliders,
  KeyRound,
  ShieldAlert,
  Copy,
  RefreshCw,
  Key,
  Truck,
  Navigation,
  Star,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  Mail,
  Send,
  Inbox,
  MessageSquare,
  Server
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    addProduct,
    bulkImportProducts,
    updateProduct,
    publishProductGlobally,
    deleteProduct,
    orders,
    updateOrderStatus,
    updateOrderTracking,
    deleteOrder,
    clearOrderHistory,
    theme,
    updateTheme,
    resetTheme,
    billboards,
    billboardIntervalSeconds,
    updateBillboard,
    addBillboard,
    deleteBillboard,
    resetBillboards,
    setBillboardIntervalSeconds,
    setCurrentPage,
    navigateToProduct,
    copyProductUrl,
    getProductUrl,
    adminSecretSlug,
    updateAdminSecretSlug,
    generateRandomAdminSlug,
    getAdminUrl,
    copyAdminUrl,
    formatPrice,
    addToast,
    analyticsData,
    user,
    adminPassword,
    changeAdminPassword,
    logoutUser,
    loginUser,
    isAdmin,
    registeredUsers,
    deleteRegisteredUser,
    refreshServerStore,
    language,
    t,
  } = useStore();

  const isKa = language === 'ka';
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await refreshServerStore(true);
      addToast(isKa ? 'სერვერის მონაცემები წარმატებით სინქრონიზდა!' : 'Server data synced successfully!', 'success');
    } catch {
      addToast(isKa ? 'სინქრონიზაციის შეცდომა' : 'Sync error', 'error');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Secret Slug Management
  const [slugInputValue, setSlugInputValue] = useState(adminSecretSlug);
  const [isCopiedSlugUrl, setIsCopiedSlugUrl] = useState(false);

  // Sync slug input value with store
  React.useEffect(() => {
    setSlugInputValue(adminSecretSlug);
  }, [adminSecretSlug]);

  // Password Login Gate State for non-logged in or non-admin users
  const [pinInput, setPinInput] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Change Password Form State
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // Registered Users Management State
  const [userSearch, setUserSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'billboards' | 'theme' | 'orders' | 'users' | 'security' | 'messages'>('analytics');

  // Contact Messages & SMTP State
  const [contactMessages, setContactMessages] = useState<Array<{
    id: string;
    name: string;
    email: string;
    orderNumber?: string;
    subject: string;
    message: string;
    createdAt: string;
    status: 'unread' | 'read' | 'replied';
  }>>([]);
  const [messageSearch, setMessageSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);

  // SMTP Settings State
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtppro.zoho.com',
    port: 465,
    user: 'support@dbuystore.com',
    pass: '',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [hasServerPass, setHasServerPass] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Fetch messages and SMTP info
  const fetchSmtpAndMessages = async () => {
    try {
      const [msgRes, smtpRes] = await Promise.all([
        fetch('/api/contact/messages').then(r => r.json()),
        fetch('/api/admin/smtp').then(r => r.json())
      ]);
      if (msgRes?.success) setContactMessages(msgRes.messages || []);
      if (smtpRes?.success) {
        setSmtpForm(prev => ({
          ...prev,
          host: smtpRes.host || 'smtppro.zoho.com',
          port: smtpRes.port || 465,
          user: smtpRes.user || 'support@dbuystore.com',
        }));
        setHasServerPass(smtpRes.hasPass);
      }
    } catch (err) {
      console.warn('Error fetching SMTP or messages:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSmtpAndMessages();
    }
  }, [isAdmin, activeTab]);

  const handleMarkMessageRead = async (id: string, status: 'read' | 'replied') => {
    try {
      const res = await fetch('/api/contact/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setContactMessages(data.messages || []);
        addToast(isKa ? 'სტატუსი განახლდა' : 'Status updated', 'success');
      }
    } catch {
      addToast(isKa ? 'შეცდომა' : 'Error', 'error');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch('/api/contact/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setContactMessages(data.messages || []);
        if (selectedMessage?.id === id) setSelectedMessage(null);
        addToast(isKa ? 'შეტყობინება წაიშალა' : 'Message deleted', 'info');
      }
    } catch {
      addToast(isKa ? 'შეცდომა' : 'Error', 'error');
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await smartApiFetch('/api/admin/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      });
      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { 
          success: false, 
          error: res.status === 405 
            ? (isKa ? 'სტატიკური ჰოსტინგის შეცდომა (405): რეალურ ჰოსტინგზე გაშვებულია მხოლოდ ფრონტენდი backend სერვერის (server.cjs) გარეშე. გააშვით Full-Stack Node.js სერვერი (npm start) ან მიუთითეთ /api რედაირექტი.' : 'Static Hosting Error (405): Your production host is serving static files without running the Node.js backend (server.cjs). Please run as Full-Stack Node.js app (npm start) or configure /api rewrite.')
            : `Server response error (${res.status}): ${text.substring(0, 200) || 'Empty response'}` 
        };
      }
      if (data.success) {
        setHasServerPass(data.smtp?.hasPass ?? true);
        addToast(isKa ? 'Zoho SMTP პარამეტრები წარმატებით შენახულია!' : 'Zoho SMTP settings saved successfully!', 'success');
      } else {
        addToast(data.error || 'Failed to save SMTP settings', 'error');
      }
    } catch {
      addToast('Error saving SMTP settings', 'error');
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await smartApiFetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpForm),
      });
      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { 
          success: false, 
          error: res.status === 405 
            ? (isKa ? 'სტატიკური ჰოსტინგის შეცდომა (405): რეალურ ჰოსტინგზე გაშვებულია მხოლოდ ფრონტენდი backend სერვერის (server.cjs) გარეშე. გააშვით Full-Stack Node.js სერვერი (npm start) ან მიუთითეთ /api რედაირექტი.' : 'Static Hosting Error (405): Your production host is serving static files without running the Node.js backend (server.cjs). Please run as Full-Stack Node.js app (npm start) or configure /api rewrite.')
            : `Server response error (${res.status}): ${text.substring(0, 200) || 'Empty response'}` 
        };
      }
      setSmtpTestResult(data);
      if (data.success) {
        setHasServerPass(true);
        addToast(isKa ? 'Zoho Mail SMTP დაკავშირდა წარმატებით! ტესტი გაიგზავნა.' : 'Zoho Mail SMTP connected successfully! Test email sent.', 'success');
      } else {
        addToast(data.error || 'SMTP Connection Test Failed', 'error');
      }
    } catch (err: any) {
      setSmtpTestResult({ success: false, error: err?.message || 'Network error during test' });
      addToast('SMTP Test Error', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  // Product Add / Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Tracking Number Management Modal
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: '',
    carrier: 'Georgian Post',
    trackingUrl: '',
    status: 'Shipped' as Order['status'],
  });

  const openTrackingModal = (order: Order) => {
    setTrackingModalOrder(order);
    setTrackingForm({
      trackingNumber: order.trackingNumber || '',
      carrier: order.carrier || 'Georgian Post',
      trackingUrl: order.trackingUrl || '',
      status: order.status === 'Processing' ? 'Shipped' : order.status,
    });
  };

  const handleSaveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder) return;
    updateOrderTracking(trackingModalOrder.id, {
      trackingNumber: trackingForm.trackingNumber,
      carrier: trackingForm.carrier,
      trackingUrl: trackingForm.trackingUrl,
      status: trackingForm.status,
    });
    setTrackingModalOrder(null);
  };

  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [prodForm, setProdForm] = useState({
    title: '',
    titleKa: '',
    customSlug: '',
    category: 'tech' as Product['category'],
    price: '' as unknown as number,
    origPrice: '' as unknown as number | undefined,
    stock: '' as unknown as number,
    badge: '',
    image: '',
    images: [] as string[],
    description: '',
    descriptionKa: '',
    features: ['', '', '', ''] as string[],
  });

  // Product catalog table search & filter
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [productSort, setProductSort] = useState<'default' | 'price_asc' | 'price_desc' | 'stock_desc' | 'stock_asc' | 'title_asc'>('default');

  // Orders table search & status filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');

  // Theme Form State
  const [themeForm, setThemeForm] = useState<{
    announcementText: string;
    announcementVisible: boolean;
    primaryColor: string;
    heroTitle: string;
    heroSubtitle: string;
    eurRate: number;
    gelRate: number;
    logoStyle: LogoOptionId;
  }>({
    announcementText: theme?.announcementText || '',
    announcementVisible: theme?.announcementVisible ?? true,
    primaryColor: theme?.primaryColor || '#2563eb',
    heroTitle: theme?.heroTitle || '',
    heroSubtitle: theme?.heroSubtitle || '',
    eurRate: theme?.eurRate ?? 0.92,
    gelRate: theme?.gelRate ?? 2.78,
    logoStyle: (theme?.logoStyle as LogoOptionId) || 'bag-cart',
  });

  useEffect(() => {
    if (theme) {
      setThemeForm({
        announcementText: theme.announcementText || '',
        announcementVisible: theme.announcementVisible ?? true,
        primaryColor: theme.primaryColor || '#2563eb',
        heroTitle: theme.heroTitle || '',
        heroSubtitle: theme.heroSubtitle || '',
        eurRate: theme.eurRate ?? 0.92,
        gelRate: theme.gelRate ?? 2.78,
        logoStyle: (theme.logoStyle as LogoOptionId) || 'bag-cart',
      });
    }
  }, [theme]);

  // Billboard Management State
  const [isBillboardModalOpen, setIsBillboardModalOpen] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<BillboardSlide | null>(null);
  const [billboardImageMode, setBillboardImageMode] = useState<'upload' | 'url'>('url');
  const billboardFileInputRef = useRef<HTMLInputElement>(null);

  const [billboardForm, setBillboardForm] = useState<Omit<BillboardSlide, 'id'>>({
    title: '',
    titleKa: '',
    subtitle: '',
    subtitleKa: '',
    image: '',
    bgImage: '',
    bgGradient: 'from-slate-950 via-indigo-950 to-slate-900',
    badge: 'Featured Deal',
    badgeKa: 'რჩეული პროდუქტი',
    discountTag: '-20% OFF',
    priceTag: '$49.99',
    origPriceTag: '$69.99',
    buttonText: 'Shop Now',
    buttonTextKa: 'შეძენა',
    productId: '',
    category: 'tech',
    isActive: true,
  });

  const billboardGradients = [
    { label: 'Deep Indigo Space', value: 'from-slate-950 via-indigo-950 to-slate-900' },
    { label: 'Midnight Cyber Sky', value: 'from-slate-950 via-slate-900 to-sky-950' },
    { label: 'Emerald Forest Tech', value: 'from-slate-950 via-teal-950 to-slate-900' },
    { label: 'Royal Blue Pulse', value: 'from-slate-950 via-blue-950 to-slate-900' },
    { label: 'Dark Crimson Luxury', value: 'from-slate-950 via-rose-950 to-slate-900' },
    { label: 'Obsidian Pure Black', value: 'from-slate-950 via-slate-900 to-slate-950' },
  ];

  const handleOpenAddBillboard = () => {
    setEditingBillboard(null);
    setBillboardForm({
      title: 'New Featured Product Billboard',
      titleKa: 'ახალი რჩეული პროდუქტის ბილბორდი',
      subtitle: 'Discover high quality gear tailored for modern everyday convenience.',
      subtitleKa: 'აღმოაჩინეთ უმაღლესი ხარისხის პროდუქტები თქვენი ყოველდღიური კომფორტისთვის.',
      image: products[0]?.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
      bgImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1920&q=80',
      bgGradient: 'from-slate-950 via-indigo-950 to-slate-900',
      badge: 'Featured Deal • 2026',
      badgeKa: 'ტოპ შეთავაზება • 2026',
      discountTag: '-25% OFF',
      priceTag: '$79.99',
      origPriceTag: '$99.99',
      buttonText: 'Shop Featured',
      buttonTextKa: 'პროდუქტის შეძენა',
      productId: products[0]?.id || '',
      category: 'tech',
      isActive: true,
    });
    setIsBillboardModalOpen(true);
  };

  const handleOpenEditBillboard = (slide: BillboardSlide) => {
    setEditingBillboard(slide);
    setBillboardForm({
      title: slide.title,
      titleKa: slide.titleKa || '',
      subtitle: slide.subtitle,
      subtitleKa: slide.subtitleKa || '',
      image: slide.image,
      bgImage: slide.bgImage || '',
      bgGradient: slide.bgGradient || 'from-slate-950 via-indigo-950 to-slate-900',
      badge: slide.badge || '',
      badgeKa: slide.badgeKa || '',
      discountTag: slide.discountTag || '',
      priceTag: slide.priceTag || '',
      origPriceTag: slide.origPriceTag || '',
      buttonText: slide.buttonText || 'Shop Now',
      buttonTextKa: slide.buttonTextKa || 'შეძენა',
      productId: slide.productId || '',
      category: slide.category || 'tech',
      isActive: slide.isActive ?? true,
    });
    setIsBillboardModalOpen(true);
  };

  const handleAutoFillFromProduct = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    setBillboardForm(prev => ({
      ...prev,
      productId: prod.id,
      title: prod.title,
      titleKa: prod.titleKa || prod.title,
      subtitle: prod.description,
      subtitleKa: prod.descriptionKa || prod.description,
      image: prod.image,
      category: prod.category,
      priceTag: `$${prod.price.toFixed(2)}`,
      origPriceTag: prod.origPrice ? `$${prod.origPrice.toFixed(2)}` : '',
      discountTag: prod.origPrice ? `-${Math.round((1 - prod.price/prod.origPrice)*100)}% OFF` : (prod.badge || ''),
      badge: prod.badge || 'Best Seller',
      badgeKa: prod.badge || 'რჩეული პროდუქტი',
      buttonText: `Shop ${prod.title.split(' ')[0]}`,
      buttonTextKa: 'პროდუქტის შეძენა',
    }));
    addToast(`Autofilled details from "${prod.title}"!`, 'info');
  };

  const handleSaveBillboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billboardForm.image.trim()) {
      addToast(isKa ? 'გთხოვთ მიუთითოთ ბილბორდის სურათი' : 'Please provide a billboard image', 'error');
      return;
    }
    if (!billboardForm.title.trim()) {
      addToast(isKa ? 'გთხოვთ მიუთითოთ ბილბორდის სათაური' : 'Please provide a billboard title', 'error');
      return;
    }

    if (editingBillboard) {
      updateBillboard(editingBillboard.id, billboardForm);
    } else {
      addBillboard(billboardForm);
    }
    setIsBillboardModalOpen(false);
  };

  const processBillboardImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast(isKa ? 'გთხოვთ ატვირთოთ ვალიდური სურათის ფაილი' : 'Please upload a valid image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const raw = canvas.toDataURL('image/jpeg', 0.90);
          setBillboardForm(prev => ({ ...prev, image: raw }));
          addToast(isKa ? 'ბილბორდის სურათი წარმატებით აიტვირთა!' : 'Billboard image uploaded successfully!', 'success');
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Calculate Metrics
  const totalRevenueUSD = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const totalProductsCount = products.length;
  const registeredCustomersCount = 1 + orders.length;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginUser('lashaarsiashvili@gmail.com', 'Lasha (Admin)', pinInput);
    if (success) {
      setAuthError(false);
      setPinInput('');
    } else {
      setAuthError(true);
      setPinInput('');
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput !== confirmPasswordInput) {
      addToast(isKa ? 'ახალი პაროლები ერთმანეთს არ ემთხვევა!' : 'New passwords do not match!', 'error');
      return;
    }
    const success = changeAdminPassword(oldPasswordInput, newPasswordInput);
    if (success) {
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    }
  };

  const processImageFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const currentCount = prodForm.images.length;
    const availableSlots = 10 - currentCount;
    if (availableSlots <= 0) {
      addToast(isKa ? 'მაქსიმუმ 10 სურათია დაშვებული' : 'Maximum 10 images allowed per product', 'warning');
      return;
    }

    const filesToProcess = fileArray.slice(0, availableSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return;

        const img = new Image();
        img.onload = async () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          let rawUrl = result;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            rawUrl = canvas.toDataURL('image/jpeg', 0.82);
          }

          // Convert to server file immediately so prodForm receives clean short URL
          try {
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataUrl: rawUrl, filename: file.name }),
            });
            const json = await res.json();
            if (json && json.success && json.url) {
              saveImageBackupIDB(json.url, rawUrl);
              appendProdImage(json.url, file.name);
              return;
            }
          } catch (err) {
            console.warn('Upload API call failed, using compressed base64 fallback:', err);
          }
          appendProdImage(rawUrl, file.name);
        };
        img.onerror = () => {
          appendProdImage(result, file.name);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
  };

  const appendProdImage = (url: string, name?: string) => {
    setProdForm(prev => {
      const currentList = prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      if (currentList.length >= 10) {
        addToast(isKa ? 'მაქსიმუმ 10 სურათია დაშვებული' : 'Maximum 10 images allowed', 'warning');
        return prev;
      }
      if (currentList.includes(url)) return prev;

      // If the list only contains a default Unsplash stock photo, replace it with the new custom image.
      // Otherwise, prepend the new image so it immediately becomes the primary cover image.
      const hasOnlyUnsplash = currentList.length === 1 && currentList[0].includes('unsplash.com');
      const updated = hasOnlyUnsplash ? [url] : [url, ...currentList];

      return {
        ...prev,
        images: updated,
        image: updated[0] || url,
      };
    });

    if (name) {
      setUploadedFileInfo({ name, size: 'Ready' });
      addToast(
        isKa ? `სურათი „${name}“ დაემატა!` : `Image "${name}" added!`,
        'success'
      );
    }

    // Backup background upload if still base64
    if (url.startsWith('data:')) {
      fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: url, filename: name }),
      })
        .then(r => r.json())
        .then(json => {
          if (json && json.success && json.url) {
            saveImageBackupIDB(json.url, url);
            setProdForm(prev => {
              const updated = prev.images.map(img => img === url ? json.url : img);
              return {
                ...prev,
                images: updated,
                image: prev.image === url ? json.url : prev.image,
              };
            });
          }
        })
        .catch(err => console.warn('Could not store image to server disk, keeping in memory:', err));
    }
  };

  const removeProdImage = (indexToRemove: number) => {
    setProdForm(prev => {
      const currentList = prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      const updated = currentList.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: updated,
        image: updated[0] || '',
      };
    });
  };

  const setPrimaryProdImage = (index: number) => {
    setProdForm(prev => {
      const currentList = prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      if (index <= 0 || index >= currentList.length) return prev;
      const target = currentList[index];
      const rest = currentList.filter((_, i) => i !== index);
      const updated = [target, ...rest];

      return {
        ...prev,
        images: updated,
        image: updated[0],
      };
    });
    addToast(isKa ? 'მთავარი სურათი განახლდა' : 'Primary cover image updated', 'success');
  };

  const moveProdImage = (fromIndex: number, direction: 'left' | 'right') => {
    setProdForm(prev => {
      const currentList = prev.images.length > 0 ? [...prev.images] : (prev.image ? [prev.image] : []);
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= currentList.length) return prev;
      const updated = [...currentList];
      const temp = updated[fromIndex];
      updated[fromIndex] = updated[toIndex];
      updated[toIndex] = temp;

      return {
        ...prev,
        images: updated,
        image: updated[0] || prev.image,
      };
    });
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (!newImageUrl.startsWith('http') && !newImageUrl.startsWith('data:')) {
      addToast(isKa ? 'გთხოვთ შეიყვანოთ სწორი ბმული (http...)' : 'Please enter a valid URL (http...)', 'warning');
      return;
    }
    appendProdImage(newImageUrl.trim());
    setNewImageUrl('');
  };

  // AI Product Ad Copywriter & Marketing Description Generator
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [adTone, setAdTone] = useState<'high-converting' | 'tech' | 'luxury'>('high-converting');

  const handleGenerateAdCopy = async (fieldTarget: 'all' | 'descriptionEn' | 'descriptionKa' | 'features' = 'all') => {
    const currentTitle = prodForm.title?.trim() || prodForm.titleKa?.trim();
    if (!currentTitle && prodForm.images.length === 0) {
      addToast(
        isKa
          ? 'გთხოვთ შეიყვანოთ პროდუქტის სათაური ან ატვირთოთ სურათი სარეკლამო აღწერის დასაგენერირებლად'
          : 'Please enter a product title or upload an image to generate advertising copy',
        'warning'
      );
      return;
    }

    setIsGeneratingCopy(true);
    try {
      const result = await generateProductAdCopy({
        title: prodForm.title || '',
        titleKa: prodForm.titleKa || '',
        category: prodForm.category,
        price: prodForm.price,
        images: prodForm.images,
        tone: adTone,
        language: isKa ? 'ka' : 'both',
      });

      setProdForm(prev => {
        const next = { ...prev };
        if (fieldTarget === 'descriptionEn') {
          if (result.descriptionEn) next.description = result.descriptionEn;
        } else if (fieldTarget === 'descriptionKa') {
          if (result.descriptionKa) next.descriptionKa = result.descriptionKa;
        } else if (fieldTarget === 'features') {
          if (isKa && result.featuresKa && result.featuresKa.length > 0) {
            next.features = result.featuresKa.slice(0, 4);
          } else if (result.featuresEn && result.featuresEn.length > 0) {
            next.features = result.featuresEn.slice(0, 4);
          }
        } else {
          // all
          if (result.descriptionEn) next.description = result.descriptionEn;
          if (result.descriptionKa) next.descriptionKa = result.descriptionKa;
          if (isKa && result.featuresKa && result.featuresKa.length > 0) {
            next.features = result.featuresKa.slice(0, 4);
          } else if (result.featuresEn && result.featuresEn.length > 0) {
            next.features = result.featuresEn.slice(0, 4);
          }
          if (!prev.titleKa && result.titleKa) next.titleKa = result.titleKa;
          if (!prev.title && result.titleEn) next.title = result.titleEn;
          if (!prev.customSlug && result.customSlug) next.customSlug = result.customSlug;
          if (result.badge && (!prev.badge || prev.badge === 'New')) next.badge = result.badge;
        }
        return next;
      });

      addToast(
        isKa
          ? '✨ სარეკლამო აღწერა და მახასიათებლები წარმატებით ჩაისვა!'
          : '✨ High-converting ad copy and selling points generated & inserted!',
        'success'
      );
    } catch (err) {
      console.error('Ad copy generation error:', err);
      addToast(
        isKa ? 'აღწერის გენერირება ვერ მოხერხდა' : 'Failed to generate ad copy',
        'error'
      );
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleAutoGenerateFeatures = () => {
    const generated = generateProductFeatures({
      title: prodForm.title || (isKa ? 'ახალი პროდუქტი' : 'New Product'),
      description: prodForm.description || '',
      category: prodForm.category,
      price: prodForm.price,
    }, isKa ? 'ka' : 'en');

    setProdForm(prev => ({
      ...prev,
      features: generated.slice(0, 4),
    }));

    addToast(isKa ? '4 ძირითადი მახასიათებელი დაგენერირდა!' : '4 Key Features auto-generated!', 'success');
  };

  const handleFeatureChange = (index: number, value: string) => {
    setProdForm(prev => {
      const newFeats = [...(prev.features || ['', '', '', ''])];
      while (newFeats.length < 4) newFeats.push('');
      newFeats[index] = value;
      return { ...prev, features: newFeats };
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFiles(files);
    }
    // reset input so same file can be chosen again if removed
    e.target.value = '';
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
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFiles(files);
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setUploadedFileInfo(null);
    setImageInputMode('upload');
    setNewImageUrl('');

    setProdForm({
      title: '',
      titleKa: '',
      customSlug: '',
      category: 'tech',
      price: '' as unknown as number,
      origPrice: '' as unknown as number | undefined,
      stock: '' as unknown as number,
      badge: '',
      image: '',
      images: [],
      description: '',
      descriptionKa: '',
      features: ['', '', '', ''],
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setUploadedFileInfo(prod.image?.startsWith('data:') ? { name: 'Uploaded Image', size: 'Local' } : null);
    setImageInputMode(prod.image?.startsWith('data:') ? 'upload' : 'url');
    setNewImageUrl('');

    const prodImages = (prod.images && prod.images.length > 0)
      ? prod.images
      : [prod.image];

    const prodFeatures = (prod.features && prod.features.length >= 3)
      ? prod.features.slice(0, 4)
      : generateProductFeatures(prod, isKa ? 'ka' : 'en');

    while (prodFeatures.length < 4) {
      prodFeatures.push('');
    }

    setProdForm({
      title: prod.title,
      titleKa: prod.titleKa || '',
      customSlug: prod.customSlug || generateProductSlug(prod.title),
      category: prod.category,
      price: prod.price,
      origPrice: prod.origPrice || 0,
      stock: prod.stock,
      badge: prod.badge || '',
      image: prodImages[0] || prod.image,
      images: prodImages,
      description: prod.description,
      descriptionKa: prod.descriptionKa || '',
      features: prodFeatures,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTitle = (prodForm.title || prodForm.titleKa || '').trim();
    if (!effectiveTitle) {
      addToast(isKa ? 'პროდუქტის სათაური აუცილებელია' : 'Product title is required', 'warning');
      return;
    }

    const finalSlug = prodForm.customSlug?.trim() || generateProductSlug(effectiveTitle);

    // Prepare valid images array (up to 10 images)
    const validImages = (prodForm.images || [])
      .map(img => (img || '').trim())
      .filter(img => img.length > 0)
      .slice(0, 10);

    const finalImages = validImages.length > 0
      ? validImages
      : (prodForm.image ? [prodForm.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80']);
    
    const finalPrimaryImage = finalImages[0];

    // Prepare 4 Key Features (auto-generate only if blank and description exists)
    let finalFeatures = (prodForm.features || [])
      .map(f => (f || '').trim())
      .filter(f => f.length > 0);

    if (finalFeatures.length < 4 && prodForm.description) {
      const generated = generateProductFeatures({
        title: effectiveTitle,
        description: prodForm.description,
        category: prodForm.category,
        price: Number(prodForm.price) || 0,
      }, isKa ? 'ka' : 'en');

      // Fill in remaining slots
      while (finalFeatures.length < 4 && generated.length > 0) {
        const nextFeat = generated.shift();
        if (nextFeat && !finalFeatures.includes(nextFeat)) {
          finalFeatures.push(nextFeat);
        }
      }
    }

    const numPrice = Number(prodForm.price) || 0;
    const numOrigPrice = prodForm.origPrice !== '' && prodForm.origPrice !== undefined ? Number(prodForm.origPrice) : undefined;
    const numStock = prodForm.stock !== '' && prodForm.stock !== undefined ? Number(prodForm.stock) : 0;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        title: prodForm.title || prodForm.titleKa || 'Product',
        titleKa: prodForm.titleKa,
        customSlug: finalSlug,
        category: prodForm.category,
        price: numPrice,
        origPrice: numOrigPrice,
        stock: numStock,
        badge: prodForm.badge || undefined,
        image: finalPrimaryImage,
        images: finalImages,
        description: prodForm.description,
        descriptionKa: prodForm.descriptionKa,
        features: finalFeatures.slice(0, 4),
        isPublishedGlobally: true,
        publishedAt: new Date().toISOString(),
      });
      addToast(isKa ? '🌐 პროდუქტი განახლდა და გამოქვეყნდა გლობალურად ყველა მოწყობილობისთვის!' : '🌐 Product updated and published globally across all devices!', 'success');
    } else {
      addProduct({
        title: prodForm.title || prodForm.titleKa || 'Product',
        titleKa: prodForm.titleKa,
        customSlug: finalSlug,
        category: prodForm.category,
        price: numPrice,
        origPrice: numOrigPrice,
        stock: numStock,
        badge: prodForm.badge || undefined,
        image: finalPrimaryImage,
        images: finalImages,
        description: prodForm.description,
        descriptionKa: prodForm.descriptionKa,
        rating: 5.0,
        reviewsCount: 1,
        features: finalFeatures.slice(0, 4),
        isPublishedGlobally: true,
        publishedAt: new Date().toISOString(),
      });
      addToast(isKa ? '🌐 ახალი პროდუქტი შეიქმნა და გამოქვეყნდა გლობალურად ყველა მოწყობილობისთვის!' : '🌐 New product created and published globally across all devices!', 'success');
    }
    setIsProductModalOpen(false);
  };

  const handleSaveTheme = async () => {
    await updateTheme(themeForm);
    addToast(
      isKa
        ? 'საიტის თემა და დიზაინი წარმატებით შეინახა და გავრცელდა ყველა მოწყობილობაზე!'
        : 'Store visual design saved and broadcast live to all devices!',
      'success'
    );
  };

  // Filtered & sorted products in admin table
  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchTitleKa = p.titleKa?.toLowerCase().includes(q);
      const matchId = String(p.id).toLowerCase().includes(q);
      const matchBadge = p.badge?.toLowerCase().includes(q);
      if (!matchTitle && !matchTitleKa && !matchId && !matchBadge) return false;
    }
    if (stockFilter === 'in_stock' && p.stock <= 0) return false;
    if (stockFilter === 'low_stock' && (p.stock <= 0 || p.stock > 5)) return false;
    if (stockFilter === 'out_of_stock' && p.stock > 0) return false;
    return true;
  }).sort((a, b) => {
    if (productSort === 'price_asc') return a.price - b.price;
    if (productSort === 'price_desc') return b.price - a.price;
    if (productSort === 'stock_desc') return b.stock - a.stock;
    if (productSort === 'stock_asc') return a.stock - b.stock;
    if (productSort === 'title_asc') return a.title.localeCompare(b.title);
    return 0;
  });

  // Filtered orders in admin table
  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCust = o.customerName.toLowerCase().includes(q);
      const matchEmail = o.email.toLowerCase().includes(q);
      const matchTrack = (o.trackingNumber || '').toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchEmail && !matchTrack) return false;
    }
    return true;
  });

  // Preset image choices
  const presetImages = [
    { label: 'Smart Bottle', url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80' },
    { label: 'Keyboard', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80' },
    { label: 'Fitness Band', url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80' },
    { label: 'Microphone', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80' },
    { label: 'Flashlight', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
    { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  ];

  // 1. Gate if not authenticated as admin
  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-slate-900 text-white">
        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white">
              {isKa ? 'ადმინისტრატორის ავტორიზაცია' : 'Administrator Authorization'}
            </h2>
            <p className="text-xs text-slate-400">
              {isKa ? (
                <>ადმინ პანელზე წვდომა დაცულია. გთხოვთ შეიყვანოთ ადმინის (<span className="text-amber-300 font-semibold">lashaarsiashvili@gmail.com</span>) პაროლი.</>
              ) : (
                <>Admin panel access is protected. Please enter admin (<span className="text-amber-300 font-semibold">lashaarsiashvili@gmail.com</span>) password.</>
              )}
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {isKa ? 'ადმინისტრატორის ელ-ფოსტა' : 'Administrator Email'}
              </label>
              <input
                type="email"
                disabled
                value="lashaarsiashvili@gmail.com"
                className="w-full px-4 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-400 font-mono select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {isKa ? 'ადმინისტრატორის პაროლი' : 'Admin Password'}
              </label>
              <div className="relative">
                <input
                  type={showPinPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={pinInput ?? ''}
                  onMouseDown={e => {
                    (e.target as HTMLInputElement).placeholder = "";
                  }}
                  onFocus={e => {
                    (e.target as HTMLInputElement).placeholder = "";
                    e.target.select();
                  }}
                  onClick={e => {
                    (e.target as HTMLInputElement).placeholder = "";
                    (e.target as HTMLInputElement).select();
                  }}
                  onBlur={e => {
                    (e.target as HTMLInputElement).placeholder = isKa ? 'შეიყვანეთ პაროლი...' : 'Enter password...';
                  }}
                  onChange={e => {
                    setPinInput(e.target.value);
                    setAuthError(false);
                  }}
                  placeholder={isKa ? 'შეიყვანეთ პაროლი...' : 'Enter password...'}
                  className="w-full pl-4 pr-16 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                />
                <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                  {pinInput.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPinInput('')}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isKa ? 'გასუფთავება' : 'Clear'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPinPassword(!showPinPassword)}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title={showPinPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPinPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {authError && (
                <p className="text-xs text-red-400 font-medium mt-1.5">
                  {isKa ? 'პაროლი არასწორია! გთხოვთ სცადოთ თავიდან.' : 'Incorrect password! Please try again.'}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isKa ? 'ადმინ პანელში შესვლა' : 'Sign in to Admin Panel'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-700/80">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {isKa ? '← მაღაზიის მთავარ გვერდზე დაბრუნება' : '← Return to Store Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Top Admin Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <BrandLogo size="sm" variant="dark" showText={false} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-400">DBUY</span>
                <span className="text-slate-600">/</span>
                <h1 className="text-sm font-bold text-white tracking-tight">
                  {isKa ? 'ადმინის მართვის ცენტრი' : 'Command Center'}
                </h1>
              </div>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isKa ? 'ცოცხალი სისტემა' : 'Production Live'}</span>
                </span>
                <span className="hidden sm:inline-flex items-center text-[10px] text-slate-400 space-x-1">
                  <Truck className="w-3 h-3 text-blue-400" />
                  <span>Georgian Post</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleOpenAddProduct}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isKa ? 'პროდუქტის დამატება' : 'Add Product'}</span>
            </button>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors cursor-pointer"
              title={isKa ? 'ცოცხალი საიტის სინქრონიზაცია & ბაზა' : 'Live site sync & database'}
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">{isKa ? 'საიტის სინქრონიზაცია' : 'Live Sync'}</span>
            </button>

            <a
              href="/api/download-zip"
              download="dbuy-store-project.zip"
              className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 border border-emerald-700/50 transition-colors cursor-pointer"
              title={isKa ? 'მთელი საიტის ZIP ფაილად ჩამოტვირთვა' : 'Download full site project as ZIP archive'}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">{isKa ? 'ZIP გადმოწერა' : 'Export ZIP'}</span>
            </a>

            <button
              onClick={() => setCurrentPage('home')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Open customer storefront"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Storefront</span>
            </button>

            {/* Admin Profile & Logout */}
            <div className="flex items-center pl-2 border-l border-slate-800 space-x-2">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-[11px] font-bold text-slate-200 leading-none">Lasha Arsiashvili</span>
                <span className="text-[9px] text-slate-400 leading-tight">Master Admin</span>
              </div>
              <button
                onClick={() => {
                  logoutUser();
                  setCurrentPage('home');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/20 transition-colors cursor-pointer flex items-center space-x-1"
                title="Lock / Logout from Admin Panel"
              >
                <Lock className="w-3 h-3 text-red-400" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Revenue */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-lg font-black text-slate-900">{formatPrice(totalRevenueUSD)}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                <span>Verified Orders</span>
              </p>
            </div>
          </div>

          {/* Orders */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex items-center space-x-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Orders Placed</p>
              <h3 className="text-lg font-black text-slate-900">{totalOrdersCount}</h3>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5 group-hover:underline">
                {orders.filter(o => o.status === 'Processing').length} pending fulfillment
              </p>
            </div>
          </div>

          {/* Today's Visitors (LIVE) */}
          <div 
            onClick={() => setActiveTab('analytics')}
            className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs flex items-center space-x-3.5 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {isKa ? 'დღის ვიზიტები' : "Today's Visits"}
                </p>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {analyticsData.totalVisitorsToday} <span className="text-xs font-normal text-slate-400">{isKa ? 'ვიზიტორი' : 'visitors'}</span>
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                🛡️ {isKa ? 'ადმინი გამორიცხულია' : 'Admin excluded'}
              </p>
            </div>
          </div>

          {/* Top Country */}
          <div 
            onClick={() => setActiveTab('analytics')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all"
          >
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isKa ? 'ტოპ ქვეყანა' : 'Top Country'}
              </p>
              <h3 className="text-base font-black text-slate-900 truncate flex items-center space-x-1">
                <span>{analyticsData.countryStatsToday[0]?.flag || '🇬🇪'}</span>
                <span className="truncate">{analyticsData.countryStatsToday[0]?.country || 'Georgia'}</span>
              </h3>
              <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                {analyticsData.countryStatsToday[0]?.visitors || 1} hits today
              </p>
            </div>
          </div>

          {/* Products & Inventory Health */}
          <div 
            onClick={() => setActiveTab('products')}
            className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5 cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isKa ? 'პროდუქტების კატალოგი' : 'Catalog Products'}
              </p>
              <h3 className="text-lg font-black text-slate-900">{totalProductsCount}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                {products.filter(p => p.stock > 0).length} In Stock
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Modern Segmented Control */}
        <div className="bg-slate-200/75 p-1.5 rounded-2xl flex items-center space-x-1.5 overflow-x-auto border border-slate-300/60 shadow-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'ტრაფიკი & ანალიტიკა' : 'Traffic & Analytics'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'analytics' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {analyticsData.totalVisitorsToday}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'products'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'პროდუქტების კატალოგი' : 'Products Catalog'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'products' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('billboards')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'billboards'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'ბილბორდები & ბანერები' : 'Billboards & Banners'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'billboards' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {billboards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'theme'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'ვიზუალური თემა' : 'Theme & Styles'}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'orders'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'შეკვეთები' : 'Orders'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'orders' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'იუზერები' : 'Users'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'users' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {registeredUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'security'
                ? 'bg-white text-amber-700 shadow-sm border border-amber-200/80'
                : 'text-slate-600 hover:text-amber-800 hover:bg-white/50'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-600" />
            <span>{isKa ? 'უსაფრთხოება' : 'Security'}</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
              activeTab === 'messages'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Mail className="w-4 h-4 text-blue-600" />
            <span>{isKa ? 'შეტყობინებები & Zoho Email' : 'Messages & Zoho Email'}</span>
            {contactMessages.filter(m => m.status === 'unread').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                {contactMessages.filter(m => m.status === 'unread').length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 0: TRAFFIC & COUNTRY ANALYTICS */}
        {activeTab === 'analytics' && <AdminAnalytics />}

        {/* TAB 1: PRODUCTS CATALOG */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Inventory Overview Ribbon (Shopify Style) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'სულ პროდუქტი' : 'Total Listed'}
                  </span>
                  <p className="text-lg font-black text-slate-900 leading-tight">{products.length}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Package className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'მარაგშია' : 'In Stock'}
                  </span>
                  <p className="text-lg font-black text-emerald-600 leading-tight">
                    {products.filter(p => p.stock > 0).length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'მწირი მარაგი (≤5)' : 'Low Stock (≤5)'}
                  </span>
                  <p className="text-lg font-black text-amber-600 leading-tight">
                    {products.filter(p => p.stock > 0 && p.stock <= 5).length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'მარაგის ჯამი' : 'Inventory Value'}
                  </span>
                  <p className="text-lg font-black text-slate-900 leading-tight">
                    {formatPrice(products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0))}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Action & Filter Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Search Input with Clear Button */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder={isKa ? 'ძიება: სახელი, ID, ბეიჯი...' : 'Search title, ID, badge...'}
                      className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">{isKa ? 'ყველა კატეგორია' : 'All Categories'}</option>
                    <option value="tech">Smart Tech</option>
                    <option value="fitness">Fitness & Hydration</option>
                    <option value="everyday">Everyday Carry</option>
                    <option value="accessories">Accessories</option>
                  </select>

                  {/* Stock Status Filter */}
                  <select
                    value={stockFilter}
                    onChange={e => setStockFilter(e.target.value as typeof stockFilter)}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">{isKa ? 'სრული მარაგი' : 'All Stock Status'}</option>
                    <option value="in_stock">{isKa ? 'მარაგშია (>0)' : 'In Stock (>0)'}</option>
                    <option value="low_stock">{isKa ? 'მწირი მარაგი (≤5)' : 'Low Stock (≤5)'}</option>
                    <option value="out_of_stock">{isKa ? 'გამოლეულია (0)' : 'Out of Stock (0)'}</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    value={productSort}
                    onChange={e => setProductSort(e.target.value as typeof productSort)}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="default">{isKa ? 'დალაგება: სტანდარტული' : 'Sort: Default'}</option>
                    <option value="price_asc">{isKa ? 'ფასი: ზრდადი' : 'Price: Low to High'}</option>
                    <option value="price_desc">{isKa ? 'ფასი: კლებადი' : 'Price: High to Low'}</option>
                    <option value="stock_desc">{isKa ? 'მარაგი: მაღალი' : 'Stock: High to Low'}</option>
                    <option value="stock_asc">{isKa ? 'მარაგი: დაბალი' : 'Stock: Low to High'}</option>
                    <option value="title_asc">{isKa ? 'სახელი: A-Z' : 'Title: A to Z'}</option>
                  </select>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Import products from Payhip or CSV file"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isKa ? 'Payhip / CSV' : 'Payhip / CSV'}</span>
                  </button>

                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isKa ? 'ახალი პროდუქტი' : 'Add Product'}</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">{isKa ? 'სურათი' : 'Image'}</th>
                      <th className="p-4">{isKa ? 'დასახელება & ID' : 'Title & Identifier'}</th>
                      <th className="p-4">{isKa ? 'უნიკალური ბმული' : 'Direct Link'}</th>
                      <th className="p-4">{isKa ? 'კატეგორია' : 'Category'}</th>
                      <th className="p-4">{isKa ? 'ფასი' : 'Price'}</th>
                      <th className="p-4">{isKa ? 'მარაგი' : 'Stock'}</th>
                      <th className="p-4">{isKa ? 'ბეიჯი' : 'Badge'}</th>
                      <th className="p-4 text-right">{isKa ? 'მოქმედებები' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">
                            {isKa ? 'პროდუქტი ვერ მოიძებნა' : 'No products match your criteria'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {isKa ? 'სცადეთ შეცვალოთ ფილტრი ან საძიებო სიტყვა' : 'Try clearing search or adjusting your filters'}
                          </p>
                          {(productSearch || categoryFilter !== 'all' || stockFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setProductSearch('');
                                setCategoryFilter('all');
                                setStockFilter('all');
                                setProductSort('default');
                              }}
                              className="mt-3 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 cursor-pointer"
                            >
                              {isKa ? 'ფილტრების გასუფთავება' : 'Reset All Filters'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(prod => (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="relative group/thumb w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                              <img
                                src={prod.image}
                                alt={prod.title}
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                                className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                              />
                            </div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 line-clamp-1">{prod.title}</span>
                              {prod.isPublishedGlobally && (
                                <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0" title="Published globally across all devices">
                                  <Globe className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                                  <span>{isKa ? 'გლობალური' : 'Global'}</span>
                                </span>
                              )}
                            </div>
                            {prod.titleKa && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">{prod.titleKa}</div>
                            )}
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {prod.id}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-1.5">
                              <code 
                                className="text-[11px] bg-slate-100 px-2 py-1 rounded-md font-mono text-slate-700 select-all max-w-[180px] truncate block cursor-pointer hover:bg-slate-200 transition-colors"
                                onClick={() => copyProductUrl(prod.id)}
                                title={getProductUrl(prod.id)}
                              >
                                /product/{prod.id}/{prod.customSlug || generateProductSlug(prod.title)}
                              </code>
                              <button
                                onClick={() => copyProductUrl(prod.id)}
                                className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                                title="Copy full unique product URL"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 uppercase font-semibold text-[10px] text-blue-600">
                            <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100">
                              {prod.category}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-900">
                            {formatPrice(prod.price)}
                            {prod.origPrice && (
                              <span className="text-[10px] text-slate-400 line-through ml-1.5 font-normal">
                                {formatPrice(prod.origPrice)}
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const newStock = Math.max(0, prod.stock - 1);
                                  updateProduct({ ...prod, stock: newStock });
                                }}
                                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer select-none"
                                title={isKa ? 'მარაგის შემცირება (-1)' : 'Decrease stock (-1)'}
                              >
                                -
                              </button>
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                                prod.stock > 5
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : prod.stock > 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {prod.stock <= 5 && prod.stock > 0 && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                                <span>{prod.stock} {isKa ? 'ცალი' : 'units'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newStock = prod.stock + 1;
                                  updateProduct({ ...prod, stock: newStock });
                                }}
                                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs transition-colors cursor-pointer select-none"
                                title={isKa ? 'მარაგის გაზრდა (+1)' : 'Increase stock (+1)'}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            {prod.badge ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                                {prod.badge}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => publishProductGlobally(prod.id)}
                              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer inline-flex items-center space-x-1 shadow-xs border ${
                                prod.isPublishedGlobally
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                              }`}
                              title={isKa ? 'პროდუქტის გლობალზე გამოქვეყნება (ყველა მოწყობილობისთვის)' : 'Publish product globally across all devices'}
                            >
                              <Globe className={`w-3.5 h-3.5 ${prod.isPublishedGlobally ? 'animate-pulse text-emerald-600' : 'text-white'}`} />
                              <span>
                                {prod.isPublishedGlobally 
                                  ? (isKa ? 'გამოქვეყნებულია' : 'Published') 
                                  : (isKa ? 'გლობალზე გამოქვეყნება' : 'Publish Globally')}
                              </span>
                            </button>
                            <button
                              onClick={() => navigateToProduct(prod.id)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title={isKa ? 'მაღაზიის გვერდის ნახვა' : 'View Live Product Page'}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const duplicated: Omit<Product, 'id'> = {
                                  ...prod,
                                  title: `${prod.title} (Copy)`,
                                  titleKa: prod.titleKa ? `${prod.titleKa} (ასლი)` : undefined,
                                  customSlug: `${prod.customSlug || generateProductSlug(prod.title)}-copy-${Math.floor(100 + Math.random() * 900)}`,
                                };
                                addProduct(duplicated);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title={isKa ? 'პროდუქტის დუბლირება (ასლი)' : 'Duplicate Product'}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                              title={isKa ? 'რედაქტირება' : 'Edit Product Details & Images'}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(prod.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title={isKa ? 'წაშლა' : 'Delete Product'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HERO BILLBOARDS & BANNER MANAGEMENT */}
        {activeTab === 'billboards' && (
          <div className="space-y-6">
            {/* Top Control Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 font-bold">
                      <Layers className="w-5 h-5" />
                    </span>
                    <h3 className="text-lg font-black text-slate-900">
                      Hero Billboards & Banners Management
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    მართეთ მაღაზიის მთავარ გვერდზე განთავსებული სარეკლამო ბილბორდები. სლაიდები იცვლება ავტომატურად (ნაგულისხმევად ყოველ 2 წუთში).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleOpenAddBillboard}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ახალი ბილბორდის დამატება</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm('გსურთ ბილბორდების საწყის მდგომარეობაში დაბრუნება?')) {
                        resetBillboards();
                      }
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>საწყისზე დაბრუნება</span>
                  </button>
                </div>
              </div>

              {/* Rotation Timer Configuration */}
              <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      ავტომატური როტაციის ინტერვალი (Auto-Rotation Timer)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      განსაზღვრეთ რა დროის შემდეგ გადავა ბილბორდი შემდეგ პროდუქტზე (ნაგულისხმევი: 120 წამი = 2 წუთი).
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                    {[
                      { label: '1 წთ (60s)', sec: 60 },
                      { label: '2 წთ (120s)', sec: 120 },
                      { label: '3 წთ (180s)', sec: 180 },
                      { label: '5 წთ (300s)', sec: 300 },
                    ].map(preset => (
                      <button
                        key={preset.sec}
                        onClick={() => {
                          setBillboardIntervalSeconds(preset.sec);
                          addToast(`როტაციის ინტერვალი დაყენდა: ${preset.label}`, 'success');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          billboardIntervalSeconds === preset.sec
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center space-x-1 pl-2">
                    <input
                      type="number"
                      min="10"
                      max="1800"
                      value={billboardIntervalSeconds}
                      onChange={e => setBillboardIntervalSeconds(Math.max(10, Number(e.target.value) || 120))}
                      className="w-16 px-2 py-1.5 text-xs text-center font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 font-semibold">წმ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billboards Slides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {billboards.map((slide, index) => {
                const linked = slide.productId ? products.find(p => p.id === slide.productId) : null;
                return (
                  <div 
                    key={slide.id}
                    className={`bg-white rounded-3xl border overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
                      slide.isActive 
                        ? 'border-slate-200 hover:border-blue-400 hover:shadow-md' 
                        : 'border-slate-200 opacity-60 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {slide.badge || 'Featured Slide'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              updateBillboard(slide.id, { isActive: !slide.isActive });
                              addToast(`ბილბორდი #${index + 1} ${slide.isActive ? 'გაითიშა' : 'გააქტიურდა'}`, 'info');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                              slide.isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {slide.isActive ? '✓ აქტიურია' : 'გათიშულია'}
                          </button>
                        </div>
                      </div>

                      {/* Visual Preview Area */}
                      <div className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                          {/* Image Box */}
                          <div className="sm:col-span-5 h-44 rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-200 shadow-inner group">
                            <img
                              src={slide.image}
                              alt={slide.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {slide.discountTag && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase shadow-xs">
                                {slide.discountTag}
                              </span>
                            )}
                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs text-[11px] font-bold text-white">
                              {slide.priceTag || (linked ? formatPrice(linked.price) : '')}
                            </div>
                          </div>

                          {/* Text Specs */}
                          <div className="sm:col-span-7 space-y-2">
                            <div>
                              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                                {slide.category || 'Featured Product'}
                              </p>
                              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                                {slide.titleKa || slide.title}
                              </h4>
                              {slide.titleKa && slide.title && (
                                <p className="text-xs text-slate-500 line-clamp-1 italic">
                                  EN: {slide.title}
                                </p>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {slide.subtitleKa || slide.subtitle}
                            </p>

                            {linked && (
                              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100">
                                <span>🔗 პროდუქტი:</span>
                                <span className="font-bold truncate max-w-[140px]">{linked.title}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {slide.id}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditBillboard(slide)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isKa ? 'რედაქტირება' : 'Edit Slide'}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (billboards.length <= 1) {
                              addToast('მინიმუმ 1 ბილბორდი უნდა დარჩეს', 'error');
                              return;
                            }
                            if (window.confirm(`ნამდვილად გსურთ ბილბორდის წაშლა?`)) {
                              deleteBillboard(slide.id);
                            }
                          }}
                          className="p-2 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                          title="წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: VISUAL & THEME CUSTOMIZER */}
        {activeTab === 'theme' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6 max-w-4xl">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                🎨 Visual Customizer & Global Storefront Settings
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize banner announcements, hero headlines, and currency exchange multipliers in real-time.
              </p>
            </div>

            <div className="space-y-5">
              {/* Brand Logo Selection Showcase */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>DBUY ლოგოს სტილის არჩევა (5 ვარიანტი)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      დააჭირეთ სასურველ ლოგოს მის ასარჩევად ან გახსენით სრული გადახედვის ფანჯარა.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>5-ვე ლოგოს შედარება</span>
                  </button>
                </div>

                {/* 5 Quick Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { id: 'bag-cart', name: '⭐ 1. ოფიციალური — Smart Commerce', desc: 'ოფიციალური ლოგო: ლურჯი ჩანთის ემბლემა + Shop ბეიჯი' },
                    { id: 'geometric-tech', name: '2. Clean DBuy Wordmark', desc: 'სუფთა DBuy ლოგო ჩარჩოების გარეშე' },
                    { id: 'cyber-d', name: '3. Cyber Dynamic D', desc: 'აეროდინამიკური ენერგია + ისარი' },
                    { id: 'infinity-loop', name: '4. Infinity Loop D-B', desc: 'D და B-ს უსასრულო მარყუჟი' },
                    { id: 'circle-monogram', name: '5. Luxury Obsidian Badge', desc: 'შავი ობსიდიანის წრიული ემბლემა' },
                  ].map((logoOpt) => {
                    const isSelected = (themeForm.logoStyle || 'bag-cart') === logoOpt.id;
                    return (
                      <button
                        key={logoOpt.id}
                        type="button"
                        onClick={() => {
                          const newStyle = logoOpt.id as any;
                          setThemeForm(prev => ({ ...prev, logoStyle: newStyle }));
                          updateTheme({ logoStyle: newStyle });
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950 border-purple-500 ring-2 ring-purple-500/30 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                          <BrandLogo size="sm" variant="dark" showText={false} styleOverride={logoOpt.id as any} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">{logoOpt.name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-black text-emerald-400 shrink-0 ml-1">✓ აქტიური</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{logoOpt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand Accent / Theme Primary Color Picker */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      🎨 საიტის ძირითადი ფერი / Brand Theme Color
                    </label>
                    <p className="text-[11px] text-slate-500">
                      ეს ფერი ავტომატურად აისახება ყველა მომხმარებლისთვის (ღილაკები, ბანერები, ძებნა)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full border border-slate-300 shadow-xs" style={{ backgroundColor: themeForm.primaryColor || '#2563eb' }} />
                    <span className="text-xs font-mono font-bold text-slate-700">{themeForm.primaryColor || '#2563eb'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { color: '#2563eb', name: 'Cobalt Blue' },
                    { color: '#4f46e5', name: 'Electric Indigo' },
                    { color: '#7c3aed', name: 'Cyber Purple' },
                    { color: '#059669', name: 'Emerald' },
                    { color: '#e11d48', name: 'Rose Red' },
                    { color: '#d97706', name: 'Amber Gold' },
                    { color: '#0f172a', name: 'Obsidian' },
                  ].map(preset => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setThemeForm(prev => ({ ...prev, primaryColor: preset.color }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all cursor-pointer ${
                        themeForm.primaryColor === preset.color
                          ? 'border-slate-900 bg-white text-slate-900 shadow-sm ring-2 ring-blue-500/40'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: preset.color }} />
                      <span>{preset.name}</span>
                    </button>
                  ))}

                  <div className="flex items-center space-x-1.5 ml-auto">
                    <span className="text-[11px] text-slate-500 font-semibold">Custom:</span>
                    <input
                      type="color"
                      value={themeForm.primaryColor || '#2563eb'}
                      onChange={e => setThemeForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                      title="Custom color picker"
                    />
                  </div>
                </div>
              </div>

              {/* Announcement text & toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    📢 Top Announcement Banner
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={themeForm.announcementVisible}
                      onChange={e => setThemeForm(prev => ({ ...prev, announcementVisible: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>ჩართულია (Visible)</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={themeForm.announcementText ?? ''}
                  onChange={e => setThemeForm({ ...themeForm, announcementText: e.target.value })}
                  placeholder="მაგალითად: ⚡ FLASH SALE: მიიღეთ 25% ფასდაკლება..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Hero Title & Subtitle */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🌟 Hero Section Main Headline
                  </label>
                  <input
                    type="text"
                    value={themeForm.heroTitle ?? ''}
                    onChange={e => setThemeForm({ ...themeForm, heroTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    🌟 Hero Section Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={themeForm.heroSubtitle ?? ''}
                    onChange={e => setThemeForm({ ...themeForm, heroSubtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Currency Multipliers */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">
                  💱 Currency Multiplier Rates (Base: 1 USD)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      EUR Rate (€ per $1 USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={themeForm.eurRate ?? ''}
                      onChange={e => setThemeForm({ ...themeForm, eurRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GEL Rate (₾ per $1 USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={themeForm.gelRate ?? ''}
                      onChange={e => setThemeForm({ ...themeForm, gelRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Save Theme button */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Visual Settings</span>
                </button>
                <button
                  type="button"
                  onClick={resetTheme}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Orders KPI Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'სულ შეკვეთა' : 'Total Orders'}
                  </span>
                  <p className="text-lg font-black text-slate-900 leading-tight">{orders.length}</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'მუშავდება' : 'Processing'}
                  </span>
                  <p className="text-lg font-black text-amber-600 leading-tight">
                    {orders.filter(o => o.status === 'Processing').length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'გაგზავნილი / გზაში' : 'Shipped'}
                  </span>
                  <p className="text-lg font-black text-blue-600 leading-tight">
                    {orders.filter(o => o.status === 'Shipped').length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'შემოსავალი' : 'Gross Sales'}
                  </span>
                  <p className="text-lg font-black text-emerald-600 leading-tight">
                    {formatPrice(orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (o.total || 0), 0))}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header & Filter Controls */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  {/* Search orders */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      placeholder={isKa ? 'ძიება: ID, მომხმარებელი, იმეილი, ქალაქი...' : 'Search ID, customer, email, city...'}
                      className="w-full pl-8.5 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                    />
                    {orderSearch && (
                      <button
                        type="button"
                        onClick={() => setOrderSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status filter */}
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value as typeof orderStatusFilter)}
                    className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">{isKa ? 'ყველა სტატუსი' : 'All Statuses'}</option>
                    <option value="Processing">Processing</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {orders.length > 0 && (
                  <button
                    onClick={clearOrderHistory}
                    className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 font-semibold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {isKa ? 'ისტორიის გასუფთავება' : 'Clear Order History'}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">{isKa ? 'შეკვეთის ID' : 'Order ID'}</th>
                      <th className="p-4">{isKa ? 'მომხმარებელი' : 'Customer'}</th>
                      <th className="p-4">{isKa ? 'თარიღი' : 'Date'}</th>
                      <th className="p-4">{isKa ? 'პროდუქტები' : 'Items'}</th>
                      <th className="p-4">{isKa ? 'ჯამი' : 'Total'}</th>
                      <th className="p-4">{isKa ? 'სტატუსი' : 'Status'}</th>
                      <th className="p-4">{isKa ? 'თრექინგი / გადამზიდი' : 'Tracking & Courier'}</th>
                      <th className="p-4 text-right">{isKa ? 'მოქმედებები' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">
                            {orders.length === 0 
                              ? (isKa ? 'შეკვეთები ჯერ არ არის დაფიქსირებული' : 'No orders recorded yet')
                              : (isKa ? 'შეკვეთები ვერ მოიძებნა მითითებული ფილტრით' : 'No orders match your search criteria')}
                          </p>
                          {(orderSearch || orderStatusFilter !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setOrderSearch('');
                                setOrderStatusFilter('all');
                              }}
                              className="mt-3 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 cursor-pointer"
                            >
                              {isKa ? 'ფილტრის გასუფთავება' : 'Reset Filters'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-blue-700">
                            <div>{order.id}</div>
                            {order.paypalTransactionId && (
                              <div className="text-[10px] text-emerald-600 font-normal mt-0.5">
                                PP: {order.paypalTransactionId}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{order.customerName}</div>
                            <div className="text-[11px] text-slate-500">{order.email}</div>
                            <div className="text-[10px] text-slate-400">{order.city}, {order.country}</div>
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {order.date}
                          </td>
                          <td className="p-4">
                            <div className="space-y-1 max-w-xs">
                              {order.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] text-slate-700 truncate">
                                  • <span className="font-semibold">{it.quantity}x</span> {it.title}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-black text-slate-900 whitespace-nowrap">
                            {formatPrice(order.total)}
                          </td>
                          <td className="p-4">
                            <select
                              value={order.status}
                              onChange={e => updateOrderStatus(order.id, e.target.value as Order['status'])}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                                order.status === 'Delivered'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : order.status === 'Shipped'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : order.status === 'Cancelled'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {order.trackingNumber || 'Pending'}
                                </span>
                              </div>
                              {order.carrier && (
                                <span className="text-[10px] font-semibold text-indigo-700 flex items-center space-x-1">
                                  <Truck className="w-3 h-3" />
                                  <span>{order.carrier}</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => openTrackingModal(order)}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 pt-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{isKa ? 'თრექინგის შეცვლა' : 'Edit Tracking'}</span>
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete order ${order.id}?`)) {
                                  deleteOrder(order.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4.5: REGISTERED USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Top Cards & Privacy Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'სულ რეგისტრირებული' : 'Total Accounts'}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">{registeredUsers.length}</h3>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'მყიდველები (Customers)' : 'Active Customers'}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">
                    {registeredUsers.filter(u => u.role !== 'admin' && u.email?.toLowerCase().trim() !== 'lashaarsiashvili@gmail.com').length}
                  </h3>
                </div>
              </div>

              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {isKa ? 'ადმინისტრატორი' : 'Admin Accounts'}
                  </p>
                  <h3 className="text-xl font-black text-slate-900">
                    {registeredUsers.filter(u => u.role === 'admin' || u.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com').length || 1}
                  </h3>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 shadow-xs flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    {isKa ? 'პაროლების დაცვა' : 'Password Security'}
                  </p>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {isKa ? '🔒 Salted SHA-256 (დაფარულია)' : '🔒 Salted SHA-256 (Hidden)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy & Confidentiality Guarantee Banner */}
            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start space-x-3 text-xs text-blue-900">
              <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">
                  {isKa ? 'უსაფრთხოების გარანტია: ' : 'Security & Privacy Guarantee: '}
                </span>
                <span>
                  {isKa 
                    ? 'მომხმარებელთა პაროლები კრიპტოგრაფიულად დაშიფრულია და არ ჩანს არცერთ ადმინისტრატორულ ინტერფეისში. ადმინისტრატორს შეუძლია იხილოს მხოლოდ მომხმარებლის საკონტაქტო ელ-ფოსტა, მიწოდების მისამართი და შეკვეთების ისტორია.'
                    : 'Customer passwords are cryptographically salted & hashed. They are completely hidden and never displayed to administrators. Only email, delivery location, and order history are accessible for fulfillment.'}
                </span>
              </div>
            </div>

            {/* Registered Users Table Container */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Action Bar */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder={isKa ? 'ძიება: სახელი, ელ-ფოსტა, ქალაქი...' : 'Search: Name, email, city...'}
                    className="w-full sm:w-80 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  {userSearch && (
                    <button
                      onClick={() => setUserSearch('')}
                      className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      {isKa ? 'გასუფთავება' : 'Clear'}
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                  <span className="text-xs text-slate-500 font-medium">
                    {isKa ? `ნაჩვენებია: ${registeredUsers.length} მომხმარებელი` : `Showing: ${registeredUsers.length} users`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['Name', 'Email', 'Role', 'City', 'Country', 'Address', 'Phone', 'Created At'];
                      const rows = registeredUsers.map(u => [
                        `"${(u.name || '').replace(/"/g, '""')}"`,
                        `"${(u.email || '').replace(/"/g, '""')}"`,
                        `"${(u.role || 'customer').replace(/"/g, '""')}"`,
                        `"${(u.city || '').replace(/"/g, '""')}"`,
                        `"${(u.country || '').replace(/"/g, '""')}"`,
                        `"${(u.address || '').replace(/"/g, '""')}"`,
                        `"${(u.phone || '').replace(/"/g, '""')}"`,
                        `"${u.createdAt || ''}"`,
                      ]);
                      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `dbuy_users_${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      addToast(isKa ? 'მომხმარებელთა სია ექსპორტირებულია CSV ფაილში!' : 'Customer list exported to CSV!', 'success');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title={isKa ? 'მომხმარებელთა სიის გადმოწერა (CSV)' : 'Export Users List to CSV'}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isKa ? 'CSV ექსპორტი' : 'Export CSV'}</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">{isKa ? 'მომხმარებელი' : 'Customer'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'ელ-ფოსტა (Email)' : 'Email'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'მისამართი / ქალაქი' : 'Location & Address'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'რეგისტრაციის თარიღი' : 'Registered Date'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'როლი' : 'Role'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'შეკვეთები' : 'Orders'}</th>
                      <th className="py-3.5 px-4">{isKa ? 'პაროლის სტატუსი' : 'Password Status'}</th>
                      <th className="py-3.5 px-4 text-right">{isKa ? 'მოქმედება' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {registeredUsers
                      .filter(u => {
                        if (!userSearch.trim()) return true;
                        const query = userSearch.toLowerCase().trim();
                        return (
                          u.name?.toLowerCase().includes(query) ||
                          u.email?.toLowerCase().includes(query) ||
                          u.city?.toLowerCase().includes(query) ||
                          u.country?.toLowerCase().includes(query) ||
                          u.phone?.toLowerCase().includes(query)
                        );
                      })
                      .map((u, idx) => {
                        const isPrimaryAdmin = u.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' || u.role === 'admin';
                        const userOrdersCount = orders.filter(o => o.email?.toLowerCase().trim() === u.email?.toLowerCase().trim()).length;
                        const initials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

                        return (
                          <tr key={u.email || idx} className="hover:bg-slate-50/60 transition-colors">
                            {/* User Name + Avatar */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isPrimaryAdmin 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 truncate">{u.name}</p>
                                  {u.phone && <p className="text-[11px] text-slate-400 font-mono">{u.phone}</p>}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-xs font-semibold text-slate-800 select-all">
                                  {u.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(u.email);
                                    setCopiedEmail(u.email);
                                    setTimeout(() => setCopiedEmail(null), 2000);
                                    addToast(isKa ? 'ელ-ფოსტა დაკოპირდა' : 'Email copied to clipboard', 'info');
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Copy Email"
                                >
                                  {copiedEmail === u.email ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <span className="text-[10px] px-1 py-0.5 bg-slate-100 rounded text-slate-600 hover:bg-slate-200">Copy</span>
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Location & Address */}
                            <td className="py-3.5 px-4 max-w-[200px]">
                              <p className="text-slate-900 font-medium truncate">
                                {[u.city, u.country].filter(Boolean).join(', ') || 'Tbilisi, Georgia'}
                              </p>
                              {u.address && (
                                <p className="text-[11px] text-slate-400 truncate" title={u.address}>
                                  {u.address}
                                </p>
                              )}
                            </td>

                            {/* Registered Date */}
                            <td className="py-3.5 px-4 text-slate-600 text-xs">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString(language === 'ka' ? 'ka-GE' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : '—'}
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              {isPrimaryAdmin ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  👑 {isKa ? 'ადმინისტრატორი' : 'Admin'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  👤 {isKa ? 'მომხმარებელი' : 'Customer'}
                                </span>
                              )}
                            </td>

                            {/* Orders Placed */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                                userOrdersCount > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400'
                              }`}>
                                {userOrdersCount} {isKa ? 'შეკვეთა' : 'orders'}
                              </span>
                            </td>

                            {/* Password Status (Strictly Hidden & Protected) */}
                            <td className="py-3.5 px-4">
                              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>{isKa ? '🔒 დაშიფრული (არ ჩანს)' : '🔒 Encrypted (Hidden)'}</span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {isPrimaryAdmin ? (
                                <span className="text-[11px] text-slate-400 font-semibold italic">
                                  {isKa ? 'დაცული ანგარიში' : 'Protected Admin'}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setUserToDelete(u.email)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  title={isKa ? 'მომხმარებლის წაშლა' : 'Delete user'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {registeredUsers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">
                            {isKa ? 'დარეგისტრირებული მომხმარებლები არ მოიძებნა' : 'No registered users found'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {isKa 
                              ? 'ახალი მომხმარებლები რეგისტრაციისთანავე ავტომატურად გამოჩნდებიან ამ სიაში.'
                              : 'Newly registered users will appear here automatically.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY & PASSWORD SETTINGS */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            
            {/* 1. SECRET STEALTH ADMIN GATEWAY & CLOAKING FIREWALL */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border border-indigo-900/50 shadow-xl p-6 sm:p-8 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-white">
                        {isKa ? '🔐 საიდუმლო ადმინ URL და Stealth Firewall' : '🔐 Secret Admin Gateway & Stealth Firewall'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{isKa ? 'აქტიურია & დაცულია' : 'Active & Stealth Protected'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isKa 
                        ? 'საჯარო /admin ბმული სრულად დაბლოკილია. ადმინ პანელში შესასვლელად გამოიყენეთ მხოლოდ თქვენი პირადი საიდუმლო URL.' 
                        : 'Public /admin route is completely cloaked & firewalled. Access is restricted exclusively to your unique secret gateway URL.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      copyAdminUrl();
                      setIsCopiedSlugUrl(true);
                      setTimeout(() => setIsCopiedSlugUrl(false), 2500);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
                  >
                    {isCopiedSlugUrl ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{isCopiedSlugUrl ? (isKa ? 'დაკოპირდა!' : 'Copied!') : (isKa ? 'საიდუმლო URL-ის კოპირება' : 'Copy Secret Gateway URL')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newSlug = generateRandomAdminSlug();
                      setSlugInputValue(newSlug);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    title={isKa ? 'ახალი შემთხვევითი კრიპტოგრაფიული URL-ის გენერირება' : 'Generate new cryptographic high-entropy slug'}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isKa ? 'ახალი კოდი' : 'Generate Token'}</span>
                  </button>
                </div>
              </div>

              {/* Active Gateway URL Display & Customizer */}
              <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                      {isKa ? 'მიმდინარე უნიკალური საიდუმლო მისამართი (Full Gateway URL)' : 'Current Active Secret Gateway URL'}
                    </p>
                    <p className="text-xs sm:text-sm font-mono font-bold text-white break-all bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 select-all">
                      {getAdminUrl()}
                    </p>
                  </div>
                </div>

                {/* Custom Slug Input */}
                <div className="pt-3 border-t border-slate-800/80">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {isKa ? 'მისამართის Slug-ის მორგება (Customize Secret Slug):' : 'Customize Secret Slug:'}
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 select-none hidden sm:inline">
                      {typeof window !== 'undefined' ? `${window.location.origin}/` : '/'}
                    </span>
                    <input
                      type="text"
                      value={slugInputValue}
                      onChange={e => setSlugInputValue(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      placeholder="e.g. portal-sec-9x8f7"
                      className="flex-1 px-3.5 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => updateAdminSecretSlug(slugInputValue)}
                      disabled={slugInputValue.trim() === adminSecretSlug}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isKa ? 'შენახვა' : 'Save Slug'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {isKa 
                      ? '💡 რჩევა: შეინახეთ ეს მისამართი თქვენს ბრაუზერის Bookmark-ებში. საჯარო /admin ბმულით საიტზე ვერავინ შემოვა.'
                      : '💡 Tip: Bookmark this private URL in your browser. Public bots attempting to scan /admin are instantly cloaked and redirected.'}
                  </p>
                </div>
              </div>

              {/* Stealth Defense Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isKa ? 'Stealth Honeypot' : 'Stealth Honeypot'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isKa ? '/admin და /administrator ბმულები გადამისამართებულია მაღაზიაზე.' : 'Scanners trying /admin are cloaked and sent to storefront.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isKa ? 'Entropy 2^128 Token' : 'High Entropy Token'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isKa ? 'უნიკალური 18-სიმბოლოიანი კოდი შეუძლებელს ხდის გამოცნობას.' : 'Cryptographic pseudo-random tokens prevent URL guessing.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isKa ? 'Session Shield' : 'Session Shield'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isKa ? 'მოითხოვს დაცულ პაროლს lashaarsiashvili@gmail.com ექაუნთისთვის.' : 'Enforces cryptographic authentication for admin account.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. ADMINISTRATOR PASSWORD MANAGEMENT */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-5 border-b border-slate-100 mb-6">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isKa ? 'ადმინისტრატორის პაროლის მართვა' : 'Administrator Password Management'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKa ? 'აქედან შეგიძლიათ შეცვალოთ ადმინ პანელის უსაფრთხოების პაროლი ნებისმიერ დროს.' : 'You can change the admin panel security password at any time.'}
                  </p>
                </div>
              </div>

              {/* Current Account Information Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isKa ? 'ადმინის ელ-ფოსტა' : 'Admin Email'}
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-900">lashaarsiashvili@gmail.com</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isKa ? 'სტატუსი' : 'Status'}
                  </p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {isKa ? '✓ ავტორიზებული ადმინი' : '✓ Authorized Admin'}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isKa ? 'პაროლის სტატუსი' : 'Password Status'}
                  </p>
                  <p className="text-xs font-medium text-slate-700">
                    {isKa ? '🔒 დაცული პაროლი' : '🔒 Protected Password'}
                  </p>
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handlePasswordChangeSubmit} className="max-w-xl space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'ძველი პაროლი (Current Password) *' : 'Current Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPasswordInput}
                    onFocus={e => e.target.select()}
                    onClick={e => (e.target as HTMLInputElement).select()}
                    onChange={e => setOldPasswordInput(e.target.value)}
                    placeholder={isKa ? 'შეიყვანეთ მიმდინარე პაროლი...' : 'Enter current password...'}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400 placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'ახალი პაროლი (New Password) *' : 'New Password *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={newPasswordInput}
                      onFocus={e => e.target.select()}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      onChange={e => setNewPasswordInput(e.target.value)}
                      placeholder={isKa ? 'ახალი პაროლი...' : 'New password...'}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400 placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'გაიმეორეთ ახალი პაროლი *' : 'Confirm New Password *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPasswordInput}
                      onFocus={e => e.target.select()}
                      onClick={e => (e.target as HTMLInputElement).select()}
                      onChange={e => setConfirmPasswordInput(e.target.value)}
                      placeholder={isKa ? 'გაიმეორეთ ახალი პაროლი...' : 'Confirm new password...'}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400 placeholder:transition-opacity focus:placeholder:opacity-0 focus:placeholder:text-transparent"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isKa ? 'პაროლის განახლება' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Platform Security Defense Status */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-6">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isKa ? 'აქტიური უსაფრთხოების მექანიზმები (Security Defenses)' : 'Active Platform Security Defenses'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKa ? 'საიტზე ჩართულია რეალურ დროში დაცვისა და გატეხვის საწინააღმდეგო სისტემები' : 'Real-time defense and attack prevention systems are active'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isKa ? 'ბრუტფორსის (Brute-Force) საწინააღმდეგო ბლოკირება' : 'Anti-Brute Force Protection'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isKa ? 'ავტორიზაციის 5 არასწორი მცდელობის შემდეგ სისტემა ავტომატურად ბლოკავს შემომავალ მოთხოვნებს 60 წამით.' : 'After 5 incorrect authorization attempts, incoming requests are blocked for 60 seconds.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isKa ? 'უსაფრთხო ავთენტიფიკაცია & პაროლის აღდგენა' : 'Secure Authentication & Password Recovery'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isKa ? 'მომხმარებლის მონაცემები დაცულია დაშიფვრით და პაროლის აღდგენის სისტემით.' : 'User credentials are secured with encryption and recovery verification.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isKa ? 'XSS & Script Injection სანიტიზაცია' : 'XSS & Script Injection Sanitization'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isKa ? 'ყველა შეყვანილი მონაცემი (სახელი, მისამართი, ელ-ფოსტა) იფილტრება მავნე კოდის ინექციისგან.' : 'All user input fields (name, address, email) are sanitized against malicious code injections.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700 mt-0.5">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isKa ? 'ადმინ პანელის სრული იზოლაცია' : 'Admin Panel Isolation'}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isKa ? 'ადმინის მართვის პანელი და ლინკები სრულად დამალულია საიტის გარედან და მოითხოვს ადმინის სესიას.' : 'Admin control panel and routes are isolated and require an active admin session.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MESSAGES & ZOHO EMAIL SETTINGS */}
        {activeTab === 'messages' && (
          <div className="space-y-8">
            
            {/* ZOHO MAIL SMTP CONFIGURATION PANEL */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3.5">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-slate-900">
                        {isKa ? '📧 Zoho Mail (support@dbuystore.com) პარამეტრები' : '📧 Zoho Mail (support@dbuystore.com) Setup'}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${
                        hasServerPass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasServerPass ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        <span>{hasServerPass ? (isKa ? 'აქტიურია (პაროლი შეყვანილია)' : 'Active (Password Saved)') : (isKa ? 'საჭიროებს პაროლს' : 'Password Required')}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isKa 
                        ? 'პაროლის აღდგენის დროებითი კოდები და მომხმარებლის კითხვები იგზავნება ოფიციალური support@dbuystore.com ფოსტით.'
                        : 'Temporary recovery passwords and customer inquiry updates are dispatched via support@dbuystore.com.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{testingSmtp ? (isKa ? 'მოწმდება...' : 'Testing...') : (isKa ? '⚡ Zoho SMTP კავშირის შემოწმება' : '⚡ Test Zoho SMTP Connection')}</span>
                  </button>
                </div>
              </div>

              {/* SMTP Connection Result Banner */}
              {smtpTestResult && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition-all ${
                  smtpTestResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <div className="flex items-start space-x-2.5">
                    {smtpTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold text-sm">
                        {smtpTestResult.success 
                          ? (isKa ? '✅ Zoho Mail SMTP წარმატებით დაკავშირდა!' : '✅ Zoho Mail SMTP Connected Successfully!')
                          : (isKa ? '❌ Zoho Mail-თან დაკავშირება ვერ მოხერხდა' : '❌ Zoho Mail Connection Failed')}
                      </p>
                      <p className="text-xs opacity-90">{smtpTestResult.message || smtpTestResult.error}</p>
                      {smtpTestResult.error && (
                        <p className="text-[11px] font-mono bg-white/60 p-2 rounded-lg mt-2 border border-red-200/60">
                          {smtpTestResult.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveSmtp} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SMTP Host */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'SMTP სერვერის ჰოსტი (SMTP Host)' : 'SMTP Host'}
                    </label>
                    <select
                      value={['smtppro.zoho.com', 'smtppro.zoho.eu', 'smtp.zoho.com', 'smtp.zoho.eu', 'smtp.gmail.com', 'smtp-relay.brevo.com', 'smtp.resend.com'].includes(smtpForm.host) ? smtpForm.host : 'custom'}
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setSmtpForm({ ...smtpForm, host: '' });
                        } else {
                          setSmtpForm({ ...smtpForm, host: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                    >
                      <option value="smtppro.zoho.com">smtppro.zoho.com (Zoho Workplace / Domain - Global)</option>
                      <option value="smtppro.zoho.eu">smtppro.zoho.eu (Zoho Workplace / Domain - Europe)</option>
                      <option value="smtp.zoho.com">smtp.zoho.com (Zoho Personal)</option>
                      <option value="smtp.zoho.eu">smtp.zoho.eu (Zoho Personal - Europe)</option>
                      <option value="smtp-relay.brevo.com">smtp-relay.brevo.com (Brevo / Sendinblue - 300 Free/Day)</option>
                      <option value="smtp.gmail.com">smtp.gmail.com (Google / Gmail App Password)</option>
                      <option value="smtp.resend.com">smtp.resend.com (Resend)</option>
                      <option value="custom">✏️ {isKa ? 'სხვა სერვერის ჩაწერა...' : 'Custom SMTP Host...'}</option>
                    </select>

                    {!['smtppro.zoho.com', 'smtppro.zoho.eu', 'smtp.zoho.com', 'smtp.zoho.eu', 'smtp.gmail.com', 'smtp-relay.brevo.com', 'smtp.resend.com'].includes(smtpForm.host) && (
                      <input
                        type="text"
                        value={smtpForm.host}
                        onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="e.g. smtp.example.com"
                        className="w-full mt-2 px-4 py-2 text-xs bg-white border border-blue-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* SMTP Port */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'SMTP პორტი (Port)' : 'SMTP Port'}
                    </label>
                    <select
                      value={smtpForm.port}
                      onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value, 10) })}
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                    >
                      <option value={465}>465 (SSL / Secure Encrypted)</option>
                      <option value={587}>587 (TLS / STARTTLS)</option>
                    </select>
                  </div>

                  {/* Zoho Email User */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'გამომგზავნი ელ-ფოსტის მისამართი' : 'Sender Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={smtpForm.user}
                      onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      placeholder="support@dbuystore.com"
                      className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono font-bold text-slate-800"
                    />
                  </div>

                  {/* Zoho Mail Password or App Password */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isKa ? 'Zoho Mail-ის პაროლი / აპლიკაციის პაროლი (App Password) *' : 'Zoho Mail Password / App Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpForm.pass}
                        onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                        placeholder={hasServerPass ? '•••••••••••••••• (Saved on Server)' : (isKa ? 'შეიყვანეთ Zoho პაროლი...' : 'Enter Zoho password...')}
                        className="w-full pl-4 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <span>💡 {isKa ? 'თუ Zoho-ში ჩართული გაქვთ 2FA, შეიყვანეთ App Password' : 'If Zoho 2FA is enabled, generate an App Password in Zoho Security settings.'}</span>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isKa ? 'SMTP პარამეტრების შენახვა' : 'Save SMTP Settings'}</span>
                  </button>
                </div>
              </form>

              {/* Zoho Instructions & Solutions Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs text-slate-600">
                <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <span>ℹ️</span>
                  <span>{isKa ? 'რატომ წერს Zoho "554 5.7.8 Access Restricted" და რა არის გამოსავალი?' : 'Why does Zoho return "554 5.7.8 Access Restricted" & Solution Options'}</span>
                </p>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-[11px] text-amber-900 leading-relaxed">
                  <p className="font-bold text-amber-950">
                    {isKa 
                      ? '📌 Zoho-ს ოფიციალური შეზღუდვა:' 
                      : '📌 Zoho Mail Official Limitation:'}
                  </p>
                  <p>
                    {isKa 
                      ? 'Zoho Mail-ის უფასო (Forever Free) ტარიფზე 2021 წლის შემდეგ შექმნილ დომენურ ფოსტებზე (მაგ. support@dbuystore.com) Zoho-მ სრულად დაბლოკა გარეგანი SMTP/POP/IMAP წვდომა და ითხოვს $1-იან Paid Plan-ს.' 
                      : 'Zoho Mail has disabled external SMTP/IMAP/POP access on Free plans created after Dec 2021 for custom domains.'}
                  </p>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-700">
                  <p className="font-bold text-slate-900">{isKa ? '💡 3 მარტივი გზა პრობლემის გადასაჭრელად:' : '💡 3 Simple Solutions:'}</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>
                      <strong>1. Brevo (Sendinblue) - {isKa ? '100% უფასო (300 იმეილი/დღეში)' : '100% Free (300 emails/day)'}:</strong> {isKa ? 'დარეგისტრირდით brevo.com-ზე (1 წუთში), აიღეთ უფასო SMTP key, აირჩიეთ ზემოთ smtp-relay.brevo.com და გააგზავნეთ support@dbuystore.com-ის სახელით.' : 'Sign up at brevo.com, copy your free SMTP key, select smtp-relay.brevo.com above and send from support@dbuystore.com.'}
                    </li>
                    <li>
                      <strong>2. Zoho Paid Plan ($1 / {isKa ? 'თვეში' : 'month'}):</strong> {isKa ? 'Zoho-ს $1-იან Mail Lite ტარიფზე გადასვლისას Zoho ავტომატურად ხსნის SMTP წვდომას.' : 'Upgrading Zoho to the $1/mo plan unlocks full SMTP access.'}
                    </li>
                    <li>
                      <strong>3. Google / Gmail App Password ({isKa ? 'უფასო' : 'Free'}):</strong> {isKa ? 'აირჩიეთ smtp.gmail.com (465) და გამოიყენეთ ნებისმიერი Gmail-ის 16-ნიშნა App Password.' : 'Select smtp.gmail.com and use a 16-character Gmail App Password.'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* CUSTOMER CONTACT MESSAGES INBOX */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-black text-slate-900">
                        {isKa ? '📥 მომხმარებელთა შეტყობინებები (Contact Inbox)' : '📥 Customer Inquiries Inbox'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {contactMessages.length} {isKa ? 'წერილები' : 'total'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isKa ? 'საკონტაქტო ფორმიდან შემოსული ყველა კითხვა და შეტყობინება' : 'All inquiry forms submitted by users from the Contact page.'}
                    </p>
                  </div>
                </div>

                {/* Message Search */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={messageSearch}
                    onChange={e => setMessageSearch(e.target.value)}
                    placeholder={isKa ? 'ძებნა სახელით, ფოსტით, თემით...' : 'Search messages...'}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Messages Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">{isKa ? 'თარიღი' : 'Date'}</th>
                      <th className="py-3 px-4">{isKa ? 'მომხმარებელი' : 'Customer'}</th>
                      <th className="py-3 px-4">{isKa ? 'თემა / შეკვეთა #' : 'Subject / Order #'}</th>
                      <th className="py-3 px-4">{isKa ? 'შეტყობინების ტექსტი' : 'Message Preview'}</th>
                      <th className="py-3 px-4">{isKa ? 'სტატუსი' : 'Status'}</th>
                      <th className="py-3 px-4 text-right">{isKa ? 'მოქმედება' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {contactMessages
                      .filter(m => {
                        if (!messageSearch.trim()) return true;
                        const q = messageSearch.toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.email?.toLowerCase().includes(q) ||
                          m.subject?.toLowerCase().includes(q) ||
                          m.message?.toLowerCase().includes(q) ||
                          m.orderNumber?.toLowerCase().includes(q)
                        );
                      })
                      .map(msg => (
                        <tr key={msg.id} className={`hover:bg-slate-50/80 transition-colors ${msg.status === 'unread' ? 'bg-blue-50/30 font-semibold' : ''}`}>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                            {new Date(msg.createdAt).toLocaleString(isKa ? 'ka-GE' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{msg.name}</p>
                            <a href={`mailto:${msg.email}`} className="text-blue-600 font-mono text-[11px] hover:underline">
                              {msg.email}
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">{msg.subject}</p>
                            {msg.orderNumber && (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono mt-0.5">
                                #{msg.orderNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[280px]">
                            <p className="line-clamp-2 text-slate-600 text-xs">
                              {msg.message}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {msg.status === 'unread' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                🔴 {isKa ? 'წაუკითხავი' : 'Unread'}
                              </span>
                            ) : msg.status === 'replied' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✅ {isKa ? 'უპასუხა' : 'Replied'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                👁️ {isKa ? 'წაკითხული' : 'Read'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMessage(msg);
                                if (msg.status === 'unread') handleMarkMessageRead(msg.id, 'read');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              {isKa ? 'ნახვა' : 'View'}
                            </button>
                            <a
                              href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)} [DBUY Support]`}
                              onClick={() => handleMarkMessageRead(msg.id, 'replied')}
                              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              <span>{isKa ? 'პასუხი' : 'Reply'}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                    {contactMessages.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600">
                            {isKa ? 'შეტყობინებები ჯერ არ არის' : 'No contact messages yet'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {isKa ? 'საკონტაქტო გვერდიდან გამოგზავნილი წერილები გამოჩნდება აქ.' : 'Messages sent from the Contact page will appear here.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MESSAGE DETAIL MODAL */}
            {selectedMessage && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">{selectedMessage.subject}</h3>
                        <p className="text-xs text-slate-500">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMessage(null)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      <p><strong>{isKa ? 'გამომგზავნი:' : 'From:'}</strong> {selectedMessage.name} (&lt;<a href={`mailto:${selectedMessage.email}`} className="text-blue-600 hover:underline">{selectedMessage.email}</a>&gt;)</p>
                      {selectedMessage.orderNumber && (
                        <p><strong>{isKa ? 'შეკვეთის ნომერი:' : 'Order #:'}</strong> #{selectedMessage.orderNumber}</p>
                      )}
                      <p><strong>{isKa ? 'ოფიციალური მიმღები:' : 'Delivered to:'}</strong> support@dbuystore.com</p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-slate-900">{isKa ? 'შეტყობინების ტექსტი:' : 'Message Body:'}</p>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-xs">
                        {selectedMessage.message}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isKa ? 'წაშლა' : 'Delete'}
                    </button>

                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)} [DBUY Support]`}
                      onClick={() => handleMarkMessageRead(selectedMessage.id, 'replied')}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isKa ? 'პასუხის გაგზავნა (Email Reply)' : 'Reply via Email'}</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Add / Edit Billboard Modal */}
      {isBillboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsBillboardModalOpen(false)} />

          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingBillboard
                      ? (isKa ? 'ბილბორდის რედაქტირება' : 'Edit Billboard')
                      : (isKa ? 'ახალი ბილბორდის დამატება' : 'Add New Billboard')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isKa ? 'შეცვალეთ ბილბორდის სურათი, სათაურები, ფასდაკლების აქცია და დაკავშირებული პროდუქტი.' : 'Customize billboard image, headlines, discount promotions, and linked store product.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBillboardModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBillboardSubmit} className="space-y-5">
              
              {/* 1. Quick Store Product Picker (Autofill) */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isKa ? 'სწრაფი არჩევა მაღაზიის პროდუქტებიდან (Autofill)' : 'Quick Store Product Picker (Autofill)'}</span>
                  </span>
                  <span className="text-[11px] text-blue-600">{isKa ? 'დააჭირეთ პროდუქტს მონაცემების გადმოსატანად' : 'Click a product to auto-fill billboard details'}</span>
                </div>
                <div className="flex items-center space-x-2 overflow-x-auto pb-1.5">
                  {products.slice(0, 10).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAutoFillFromProduct(prod.id)}
                      className={`shrink-0 flex items-center space-x-2 p-1.5 rounded-xl border bg-white text-left transition-all cursor-pointer ${
                        billboardForm.productId === prod.id
                          ? 'border-blue-600 ring-2 ring-blue-500/30'
                          : 'border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <img
                        src={prod.image}
                        alt={prod.title}
                        className="w-8 h-8 rounded-lg object-cover bg-slate-950 shrink-0"
                      />
                      <div className="max-w-[100px]">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{prod.title}</p>
                        <p className="text-[10px] text-blue-600 font-black">{formatPrice(prod.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Main Product Image Setting */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    🖼️ {isKa ? 'ბილბორდის მთავარი სურათი (Main Product Showcase Image) *' : 'Main Product Showcase Image *'}
                  </label>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBillboardImageMode('url')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        billboardImageMode === 'url' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {isKa ? 'URL ბმული' : 'URL Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillboardImageMode('upload')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        billboardImageMode === 'upload' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      {isKa ? 'ფაილის ატვირთვა' : 'Upload File'}
                    </button>
                  </div>
                </div>

                {billboardImageMode === 'upload' ? (
                  <div
                    onClick={() => billboardFileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-blue-50/20 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={billboardFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) processBillboardImageFile(file);
                      }}
                    />
                    <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">{isKa ? 'დააჭირეთ სურათის ასატვირთად' : 'Click to upload image'}</p>
                    <p className="text-[11px] text-slate-500">{isKa ? 'PNG, JPG, WEBP (ავტომატური ოპტიმიზაცია)' : 'PNG, JPG, WEBP (Auto optimized)'}</p>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={billboardForm.image}
                    onChange={e => setBillboardForm({ ...billboardForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                )}

                {/* Live Image Preview Card */}
                {billboardForm.image && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center space-x-4">
                    <img
                      src={billboardForm.image}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover bg-slate-950 border border-slate-700 shrink-0"
                    />
                    <div className="text-xs text-white min-w-0">
                      <p className="font-bold text-blue-400 truncate">{isKa ? 'სურათის გადახედვა:' : 'Image Preview:'}</p>
                      <p className="text-[11px] text-slate-300 truncate">{billboardForm.title || (isKa ? 'სათაური არ არის შეყვანილი' : 'No title entered')}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{billboardForm.image}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Background Gradient / Preset Colors */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  🎨 {isKa ? 'ფონის გრადიენტი (Background Atmosphere Gradient)' : 'Background Atmosphere Gradient'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {billboardGradients.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBillboardForm({ ...billboardForm, bgGradient: grad.value })}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all cursor-pointer ${
                        billboardForm.bgGradient === grad.value
                          ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${grad.value} shrink-0 border border-slate-700 shadow-xs`} />
                      <span className="text-[11px] font-bold text-slate-800 truncate">{grad.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Ambient Background Texture URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  🌌 {isKa ? 'ფონის ბუნდოვანი სურათი (Ambient Lifestyle Background URL - Optional)' : 'Ambient Lifestyle Background URL (Optional)'}
                </label>
                <input
                  type="text"
                  value={billboardForm.bgImage || ''}
                  onChange={e => setBillboardForm({ ...billboardForm, bgImage: e.target.value })}
                  placeholder={isKa ? 'https://images.unsplash.com/... (ფონის მსუბუქი ეფექტისთვის)' : 'https://images.unsplash.com/... (for subtle mood overlay)'}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* 5. Bilingual Titles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    🇬🇪 ქართული სათაური (Georgian Headline) *
                  </label>
                  <input
                    type="text"
                    required
                    value={billboardForm.titleKa}
                    onChange={e => setBillboardForm({ ...billboardForm, titleKa: e.target.value })}
                    placeholder="მაგ: ფლაგმანი უკაბელო ყურსასმენი"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    🇬🇧 ინგლისური სათაური (English Headline) *
                  </label>
                  <input
                    type="text"
                    required
                    value={billboardForm.title}
                    onChange={e => setBillboardForm({ ...billboardForm, title: e.target.value })}
                    placeholder="e.g. Next-Gen ANC Wireless Headphones"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
                  />
                </div>
              </div>

              {/* 6. Bilingual Subtitles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    🇬🇪 ქართული აღწერა (Georgian Subtitle)
                  </label>
                  <textarea
                    rows={2}
                    value={billboardForm.subtitleKa}
                    onChange={e => setBillboardForm({ ...billboardForm, subtitleKa: e.target.value })}
                    placeholder="მოკლე სარეკლამო აღწერა ქართულად..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    🇬🇧 ინგლისური აღწერა (English Subtitle)
                  </label>
                  <textarea
                    rows={2}
                    value={billboardForm.subtitle}
                    onChange={e => setBillboardForm({ ...billboardForm, subtitle: e.target.value })}
                    placeholder="Short promotional subtitle in English..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 7. Badges, Pricing & Discounts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🏷️ Badge (EN)
                  </label>
                  <input
                    type="text"
                    value={billboardForm.badge || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, badge: e.target.value })}
                    placeholder="Flagship Audio"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🏷️ Badge (KA)
                  </label>
                  <input
                    type="text"
                    value={billboardForm.badgeKa || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, badgeKa: e.target.value })}
                    placeholder="ტოპ შეთავაზება"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🔥 Discount Tag
                  </label>
                  <input
                    type="text"
                    value={billboardForm.discountTag || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, discountTag: e.target.value })}
                    placeholder="-27% OFF"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    💰 Display Price
                  </label>
                  <input
                    type="text"
                    value={billboardForm.priceTag || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, priceTag: e.target.value })}
                    placeholder="$79.99"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* 8. Button Labels & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🔘 {isKa ? 'ღილაკის ტექსტი (KA)' : 'Button Label (KA)'}
                  </label>
                  <input
                    type="text"
                    value={billboardForm.buttonTextKa || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, buttonTextKa: e.target.value })}
                    placeholder="ყურსასმენის შეძენა"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🔘 {isKa ? 'ღილაკის ტექსტი (EN)' : 'Button Label (EN)'}
                  </label>
                  <input
                    type="text"
                    value={billboardForm.buttonText || ''}
                    onChange={e => setBillboardForm({ ...billboardForm, buttonText: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    📂 {isKa ? 'კატეგორია' : 'Category'}
                  </label>
                  <select
                    value={billboardForm.category || 'tech'}
                    onChange={e => setBillboardForm({ ...billboardForm, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="tech">Tech & Gadgets</option>
                    <option value="fitness">Fitness & Hydration</option>
                    <option value="everyday">Everyday Carry</option>
                    <option value="accessories">Accessories</option>
                    <option value="deals">Special Deals</option>
                  </select>
                </div>
              </div>

              {/* 9. Active Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isKa ? 'სტატუსი: აქტიური ბილბორდი' : 'Status: Active Billboard'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {isKa ? 'თუ გათიშავთ, ეს სლაიდი როტაციაში არ გამოჩნდება' : 'If deactivated, this slide will not appear in storefront rotation'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={billboardForm.isActive}
                  onChange={e => setBillboardForm({ ...billboardForm, isActive: e.target.checked })}
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBillboardModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isKa ? 'გაუქმება' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {editingBillboard
                      ? (isKa ? 'ცვლილებების შენახვა' : 'Save Changes')
                      : (isKa ? 'ბილბორდის დამატება' : 'Add Billboard')}
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsProductModalOpen(false)} />

          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingProduct
                ? (isKa ? 'პროდუქტის რედაქტირება' : 'Edit Product')
                : (isKa ? 'ახალი პროდუქტის დამატება' : 'Add New Product')}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKa ? 'პროდუქტის სათაური (EN) *' : 'Product Title (EN) *'}
                </label>
                <input
                  type="text"
                  required
                  value={prodForm.title ?? ''}
                  onChange={e => setProdForm({ ...prodForm, title: e.target.value })}
                  placeholder=""
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isKa ? 'პროდუქტის სათაური ქართულად (KA)' : 'Product Title in Georgian (KA)'}
                </label>
                <input
                  type="text"
                  value={prodForm.titleKa ?? ''}
                  onChange={e => setProdForm({ ...prodForm, titleKa: e.target.value })}
                  placeholder=""
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Product URL Slug (Auto-generated from title, fully editable) */}
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    {isKa ? 'პროდუქტის URL მისამართი (Slug)' : 'Product URL Slug'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const autoSlug = generateProductSlug(prodForm.title || prodForm.titleKa || 'product');
                      setProdForm({ ...prodForm, customSlug: autoSlug });
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isKa ? 'სათაურიდან გენერირება' : 'Reset from Title'}</span>
                  </button>
                </div>
                <div className="flex items-center space-x-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-400 select-none font-mono">/product/{editingProduct ? editingProduct.id : 'prod-id'}/</span>
                  <input
                    type="text"
                    value={prodForm.customSlug || ''}
                    onChange={e => setProdForm({ ...prodForm, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder=""
                    className="flex-1 text-xs font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {isKa 
                    ? 'ეს ტექსტი ავტომატურად ჯდება პროდუქტის უნიკალურ ბმულში (მაგ: /product/prod-2/Mechanical-Wireless-Keyboard). შეგიძლიათ თავისუფლად ჩაასწოროთ.'
                    : 'This slug is included in the canonical product URL (e.g. /product/prod-2/mechanical-wireless-keyboard). You can edit it manually.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'კატეგორია *' : 'Category *'}
                  </label>
                  <select
                    value={prodForm.category ?? 'tech'}
                    onChange={e => setProdForm({ ...prodForm, category: e.target.value as Product['category'] })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="tech">{isKa ? 'ჭკვიანი ტექნიკა' : 'Smart Tech'}</option>
                    <option value="fitness">{isKa ? 'ფიტნესი და აქტივობა' : 'Fitness & Hydration'}</option>
                    <option value="everyday">{isKa ? 'ყოველდღიური ნივთები' : 'Everyday Carry'}</option>
                    <option value="accessories">{isKa ? 'აქსესუარები' : 'Accessories'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'ბეიჯის იარლიყი' : 'Badge Label'}
                  </label>
                  <select
                    value={prodForm.badge ?? ''}
                    onChange={e => setProdForm({ ...prodForm, badge: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">{isKa ? 'არცერთი' : 'None'}</option>
                    <option value="Best Seller">{isKa ? 'ბესტსელერი' : 'Best Seller'}</option>
                    <option value="Trending">{isKa ? 'პოპულარული' : 'Trending'}</option>
                    <option value="Hot Deal">{isKa ? 'ცხელი შეთავაზება' : 'Hot Deal'}</option>
                    <option value="New">{isKa ? 'ახალი' : 'New'}</option>
                    <option value="Sale">{isKa ? 'ფასდაკლება' : 'Sale'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'ფასი ($ USD) *' : 'Price ($ USD) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodForm.price === '' || prodForm.price === 0 ? '' : prodForm.price}
                    onChange={e => setProdForm({ ...prodForm, price: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'ძველი ფასი ($)' : 'Orig Price ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodForm.origPrice === '' || prodForm.origPrice === undefined || prodForm.origPrice === 0 ? '' : prodForm.origPrice}
                    onChange={e => setProdForm({ ...prodForm, origPrice: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isKa ? 'მარაგი (ერთეული)' : 'Stock Units'}
                  </label>
                  <input
                    type="number"
                    value={prodForm.stock === '' || prodForm.stock === undefined ? '' : prodForm.stock}
                    onChange={e => setProdForm({ ...prodForm, stock: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Product Images Manager: Up to 5 Images Support */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-3xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>{isKa ? 'პროდუქტის სურათები' : 'Product Images'}</span>
                    </label>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      prodForm.images.length >= 5
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {prodForm.images.length}/5
                    </span>
                  </div>
                  
                  {/* Mode switcher */}
                  <div className="inline-flex p-0.5 bg-white rounded-xl border border-slate-200 text-[11px] shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                        imageInputMode === 'upload'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{isKa ? 'ატვირთვა' : 'Upload'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center space-x-1 cursor-pointer ${
                        imageInputMode === 'url'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{isKa ? 'ლინკი (URL)' : 'Link (URL)'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {isKa 
                    ? 'შეგიძლიათ დაამატოთ 5-მდე სურათი. პირველი სურათი (⭐ მთავარი) გამოჩნდება კატალოგში.'
                    : 'You can add up to 5 images. The first image (⭐ Primary) is displayed on catalog cards.'}
                </p>

                {/* Upload or URL Inputs */}
                {imageInputMode === 'upload' ? (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {/* Drag and drop dropzone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => {
                        if (prodForm.images.length >= 10) {
                          addToast(isKa ? 'მაქსიმუმ 10 სურათია დაშვებული' : 'Maximum 10 images allowed', 'warning');
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                          : prodForm.images.length >= 10
                          ? 'border-slate-200 bg-slate-100 opacity-80 cursor-not-allowed'
                          : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-800">
                          {prodForm.images.length >= 10
                            ? (isKa ? 'მიღწეულია 10 სურათის ლიმიტი' : '10 images limit reached')
                            : (isKa ? 'დააჭირეთ ან გადმოათრიეთ სურათები (1-10 ფაილი)' : 'Click to select or drag & drop images (1-10 files)')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          PNG, JPG, WEBP, GIF
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={e => setNewImageUrl(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImageUrl();
                          }
                        }}
                        placeholder=""
                        disabled={prodForm.images.length >= 10}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden disabled:bg-slate-100"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        disabled={prodForm.images.length >= 10 || !newImageUrl.trim()}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1 transition-all cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isKa ? 'დამატება' : 'Add Image'}</span>
                      </button>
                    </div>

                    {/* Presets Quick Selector */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        {isKa ? 'სწრაფი ფოტო-შაბლონები (დააჭირეთ დასამატებლად):' : 'Quick image presets (click to add):'}
                      </span>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                        {presetImages.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => appendProdImage(preset.url, preset.label)}
                            disabled={prodForm.images.length >= 10}
                            className="shrink-0 p-1 rounded-xl border border-slate-200 bg-white hover:border-blue-500 transition-all disabled:opacity-40 cursor-pointer"
                            title={preset.label}
                          >
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-9 h-9 object-cover rounded-lg"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 10-Images Gallery Grid Preview */}
                {prodForm.images.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {isKa ? `დამატებული სურათები (${prodForm.images.length}/10):` : `Added Gallery Images (${prodForm.images.length}/10):`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {prodForm.images.map((imgUrl, idx) => {
                        return (
                          <div
                            key={idx}
                            className={`relative p-2 rounded-2xl border transition-all flex items-center space-x-2.5 bg-white ${
                              idx === 0
                                ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={imgUrl}
                                alt={`Product img ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                                className="w-14 h-14 object-cover rounded-xl border border-slate-100 bg-slate-50"
                              />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                  idx === 0
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {idx === 0 ? (isKa ? '⭐ მთავარი' : '⭐ Cover') : `#${idx + 1}`}
                                </span>
                                
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => removeProdImage(idx)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title={isKa ? 'სურათის წაშლა' : 'Delete image'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center space-x-1 mt-1.5">
                                {idx !== 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryProdImage(idx)}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                  >
                                    {isKa ? 'მთავარად' : 'Set Cover'}
                                  </button>
                                )}
                                <div className="ml-auto flex items-center space-x-0.5">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => moveProdImage(idx, 'left')}
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                      title="Move left"
                                    >
                                      <ArrowLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {idx < prodForm.images.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => moveProdImage(idx, 'right')}
                                      className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                      title="Move right"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Marketing Ad Copywriter Banner */}
              <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-4 rounded-3xl text-white shadow-xl border border-blue-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-amber-300">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <span className="font-extrabold text-sm tracking-wide text-white">
                        {isKa ? 'AI აღწერების გენერატორი (სურათებისა და სათაურის მიხედვით)' : 'AI Description Generator (From Images & Title)'}
                      </span>
                    </div>
                    <p className="text-xs text-blue-200 leading-relaxed max-w-xl">
                      {isKa 
                        ? 'ატვირთული სურათებისა და სათაურის მიხედვით ქმნის გაყიდვებზე ორიენტირებულ მიმზიდველ სარეკლამო აღწერას (ქართულად & ინგლისურად), 4 მთავარ მახასიათებელს და SEO ბმულს.'
                        : 'Analyzes your uploaded photos and title to craft high-converting, benefit-driven product descriptions (EN & KA), 4 key selling points, and SEO slug.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingCopy || (!prodForm.title?.trim() && !prodForm.titleKa?.trim() && prodForm.images.length === 0)}
                    onClick={() => handleGenerateAdCopy('all')}
                    className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-blue-500/25 border border-white/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 active:scale-95"
                  >
                    {isGeneratingCopy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>{isKa ? 'მიმდინარეობს გენერირება...' : 'Generating Description...'}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 text-amber-300" />
                        <span>{isKa ? '✨ აღწერის გენერაცია (სურათებით & სათაურით)' : '✨ Generate Description from Images & Title'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Copy Style / Tone selector pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <span className="text-blue-200 font-semibold">{isKa ? 'სარეკლამო სტილი:' : 'Ad Copy Style:'}</span>
                  <button
                    type="button"
                    onClick={() => setAdTone('high-converting')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      adTone === 'high-converting' 
                        ? 'bg-white text-blue-900 shadow-md font-extrabold' 
                        : 'bg-white/10 text-white/90 hover:bg-white/20'
                    }`}
                  >
                    🔥 {isKa ? 'მაღალკონვერსიული რეკლამა' : 'High-Converting Sales'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdTone('tech')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      adTone === 'tech' 
                        ? 'bg-white text-blue-900 shadow-md font-extrabold' 
                        : 'bg-white/10 text-white/90 hover:bg-white/20'
                    }`}
                  >
                    ⚡ {isKa ? 'ტექნიკური & დეტალური' : 'Tech & Specs'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdTone('luxury')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      adTone === 'luxury' 
                        ? 'bg-white text-blue-900 shadow-md font-extrabold' 
                        : 'bg-white/10 text-white/90 hover:bg-white/20'
                    }`}
                  >
                    💎 {isKa ? 'პრემიუმ / ელიტარული' : 'Luxury & Premium'}
                  </button>
                </div>
              </div>

              {/* Descriptions (EN & KA) */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {isKa ? 'პროდუქტის სარეკლამო აღწერა (EN)' : 'Product Description (EN)'}
                    </label>
                    <button
                      type="button"
                      disabled={isGeneratingCopy}
                      onClick={() => handleGenerateAdCopy('descriptionEn')}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      title="Generate English advertising copy"
                    >
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>{isKa ? '✨ AI აღწერა (EN)' : '✨ AI Copy (EN)'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={prodForm.description ?? ''}
                    onChange={e => setProdForm({ ...prodForm, description: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {isKa ? 'პროდუქტის სარეკლამო აღწერა ქართულად (KA)' : 'Product Description in Georgian (KA)'}
                    </label>
                    <button
                      type="button"
                      disabled={isGeneratingCopy}
                      onClick={() => handleGenerateAdCopy('descriptionKa')}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      title="Generate Georgian advertising copy"
                    >
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      <span>{isKa ? '✨ AI ქართული რეკლამა' : '✨ AI Georgian Copy'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={prodForm.descriptionKa ?? ''}
                    onChange={e => setProdForm({ ...prodForm, descriptionKa: e.target.value })}
                    placeholder=""
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                  />
                </div>
              </div>

              {/* 4 Key Features Section: Auto-Generation & Manual Editing */}
              <div className="bg-blue-50/50 p-4 rounded-3xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>{isKa ? '4 ძირითადი მახასიათებელი (Key Features)' : '4 Key Features (Selling Points)'}</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isKa 
                        ? 'მყიდველისთვის მიმზიდველი 4 მთავარი პუნქტი (აისახება პროდუქტის გვერდზე)' 
                        : 'Attractive highlights displayed on product detail & quick view'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isGeneratingCopy}
                    onClick={() => handleGenerateAdCopy('features')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title={isKa ? 'ავტომატური გენერაცია სათაურისა და აღწერის მიხედვით' : 'Auto-generate 4 features from title & description'}
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isKa ? '🪄 AI 4 მახასიათებელი' : '🪄 AI 4 Features'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {[0, 1, 2, 3].map((featIdx) => (
                    <div key={featIdx} className="flex items-center space-x-2 bg-white p-1.5 pl-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {featIdx + 1}
                      </div>
                      <input
                        type="text"
                        value={prodForm.features?.[featIdx] ?? ''}
                        onChange={e => handleFeatureChange(featIdx, e.target.value)}
                        placeholder=""
                        className="flex-1 text-xs text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isKa ? 'გაუქმება' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {isKa ? 'შენახვა' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logo Preview Modal with 5 options selector */}
      <LogoPreviewModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        currentLogo={(themeForm.logoStyle as any) || 'bag-cart'}
        onSelectLogo={(newId) => {
          setThemeForm(prev => ({ ...prev, logoStyle: newId }));
          updateTheme({ logoStyle: newId });
        }}
      />

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {isKa ? 'მომხმარებლის წაშლა' : 'Delete User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {userToDelete}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6">
              {isKa 
                ? 'დარწმუნებული ხართ, რომ გსურთ ამ მომხმარებლის ანგარიშის წაშლა? მომხმარებელი ვეღარ შეძლებს ძველი პაროლით შესვლას.'
                : 'Are you sure you want to delete this registered user account? The user will no longer be able to log in with their existing credentials.'}
            </p>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {isKa ? 'გაუქმება' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (userToDelete) {
                    deleteRegisteredUser(userToDelete);
                    setUserToDelete(null);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {isKa ? 'დიახ, წაშლა' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payhip & CSV Product Import Modal */}
      <PayhipImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(importedProducts, replaceExisting) => {
          bulkImportProducts(importedProducts, replaceExisting);
        }}
        currentProductsCount={products.length}
        isKa={isKa}
        allProducts={products}
      />

      {/* Live Site Sync & Database Management Modal */}
      <StoreSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isKa={isKa}
      />

      {/* Order Tracking Management Modal */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center space-x-2">
                    <span>{isKa ? 'თრექინგ ნომრის მინიჭება' : 'Assign Tracking Number'}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      Live Sync
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isKa 
                      ? `შეკვეთა: #${trackingModalOrder.id} • ${trackingModalOrder.customerName}`
                      : `Order: #${trackingModalOrder.id} • ${trackingModalOrder.customerName}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTracking} className="p-6 space-y-5">
              
              {/* Customer summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">{isKa ? 'ადრესატი / ელ-ფოსტა:' : 'Customer & Email:'}</span>
                  <span className="font-bold text-slate-900">{trackingModalOrder.customerName}</span>
                  <span className="text-slate-500 ml-1">({trackingModalOrder.email})</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">{isKa ? 'დანიშნულება:' : 'Destination:'}</span>
                  <span className="font-bold text-slate-800">{trackingModalOrder.city}, {trackingModalOrder.country}</span>
                </div>
              </div>

              {/* Tracking Number Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {isKa ? 'თრექინგ კოდი (Tracking Number)' : 'Tracking Number / Waybill'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = trackingForm.carrier.toLowerCase().includes('georgian') ? 'GEP' : 'TRK';
                      const randomCode = `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`;
                      setTrackingForm(prev => ({ ...prev, trackingNumber: randomCode }));
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isKa ? 'გენერაცია' : 'Auto Generate'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={trackingForm.trackingNumber}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="მაგ: GEP-94819283 ან 94001118992231..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Carrier Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {isKa ? 'საკურიერო კომპანია / გადამზიდი (Carrier)' : 'Shipping Carrier'}
                </label>
                <select
                  value={trackingForm.carrier}
                  onChange={(e) => {
                    const carrier = e.target.value;
                    let defaultUrl = '';
                    if (carrier === 'Georgian Post' || carrier.includes('საქართველოს')) {
                      defaultUrl = `https://www.gpost.ge/tracking?id=${trackingForm.trackingNumber}`;
                    } else if (carrier === 'DHL Express') {
                      defaultUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingForm.trackingNumber}`;
                    } else if (carrier === 'FedEx') {
                      defaultUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingForm.trackingNumber}`;
                    } else if (carrier === 'USPS') {
                      defaultUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingForm.trackingNumber}`;
                    } else if (carrier === 'UPS') {
                      defaultUrl = `https://www.ups.com/track?tracknum=${trackingForm.trackingNumber}`;
                    }
                    setTrackingForm(prev => ({ ...prev, carrier, trackingUrl: defaultUrl || prev.trackingUrl }));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Georgian Post">საქართველოს ფოსტა (Georgian Post)</option>
                  <option value="FedEx">FedEx Express</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="USPS">USPS Priority</option>
                  <option value="UPS">UPS Worldwide</option>
                  <option value="Royal Mail">Royal Mail</option>
                  <option value="Other">სხვა / Custom Courier</option>
                </select>
              </div>

              {/* Direct Tracking URL (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{isKa ? 'თრექინგის პირდაპირი ბმული (Tracking URL)' : 'Direct Tracking Link (Optional)'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{isKa ? 'მომხმარებელი გადავა 1-დაჭერით' : '1-click customer track'}</span>
                </label>
                <input
                  type="url"
                  value={trackingForm.trackingUrl}
                  onChange={(e) => setTrackingForm(prev => ({ ...prev, trackingUrl: e.target.value }))}
                  placeholder="https://www.gpost.ge/tracking?id=..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  {isKa ? 'შეკვეთის სტატუსი (Order Status)' : 'Update Order Status'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Shipped', 'Delivered', 'Processing', 'Cancelled'] as Order['status'][]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTrackingForm(prev => ({ ...prev, status: st }))}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        trackingForm.status === st
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {isKa
                    ? 'შენახვისთანავე თრექინგ კოდი და გადამზიდის დეტალები მომენტალურად აისახება მყიდველის პირად გვერდზე („ჩემი შეკვეთები“).'
                    : 'Saving immediately syncs this tracking number and courier link directly to the buyer’s "My Orders" profile view.'}
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {isKa ? 'გაუქმება' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isKa ? 'შენახვა და ასახვა' : 'Save & Sync with User'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
