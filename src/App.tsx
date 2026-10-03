import React, { useEffect } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryBrowse } from './components/CategoryBrowse';
import { ProductGrid } from './components/ProductGrid';
import { Footer } from './components/Footer';
import { QuickViewModal } from './components/QuickViewModal';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { GuaranteePage, ReturnsPage, PrivacyPage } from './components/PolicyPages';
import { MyOrdersPage } from './components/MyOrdersPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { VerifiedDeliveriesPage } from './components/VerifiedDeliveriesPage';
import { AdsGallery } from './components/AdsGallery';
import { ToastContainer } from './components/ToastContainer';
import { getPayPalV6Instance } from './utils/paypalV6';
import { analytics } from './components/AdminAnalyticsDashboard';

const LIVE_PAYPAL_CLIENT_ID = 'BAA8MiLS64FD2RN3VjViRR43H3eppqJislMbK5xa0E-u-qiZf-eVRr3FZYQjSsRysNGRj-usScKAwtYPg8';
const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || LIVE_PAYPAL_CLIENT_ID;

const MainLayout: React.FC = () => {
  const { currentPage, recordVisit, user, isAdmin } = useStore();

  // Site Visit Analytics Tracking (excluding admin users)
  useEffect(() => {
    const isCurrentAdmin = Boolean(
      isAdmin ||
      user?.role === 'admin' ||
      user?.email?.toLowerCase().trim() === 'lashaarsiashvili@gmail.com' ||
      user?.email?.toLowerCase().trim() === 'admin@dbuy.com'
    );
    analytics.trackVisit(isCurrentAdmin);

    // Active session heartbeat every 25 seconds for real-time live visitor tracking
    if (!isCurrentAdmin) {
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          analytics.trackHeartbeat(window.location.pathname);
        }
      }, 25000);
      return () => clearInterval(interval);
    }
  }, [user, isAdmin]);

  // Scroll to top on page change and log view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (currentPage !== 'admin') {
      const pageNames: Record<string, string> = {
        home: 'Storefront (Home)',
        product: 'Product Detail Page',
        about: 'About Us Page',
        contact: 'Contact Us Page',
        guarantee: 'Guarantee Policy',
        returns: 'Returns Policy',
        privacy: 'Privacy Policy',
        'my-orders': 'My Orders Page',
        campaigns: 'Tbilisi Ad Campaigns',
      };
      recordVisit(pageNames[currentPage] || currentPage);
    }
  }, [currentPage]);

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Universal Header */}
      <Header />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            <CategoryBrowse />
            <Hero />
            <ProductGrid />
          </>
        )}

        {currentPage === 'product' && <ProductDetailPage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
        {currentPage === 'guarantee' && <GuaranteePage />}
        {currentPage === 'returns' && <ReturnsPage />}
        {currentPage === 'privacy' && <PrivacyPage />}
        {currentPage === 'my-orders' && <MyOrdersPage />}
        {currentPage === 'deliveries' && <VerifiedDeliveriesPage />}
        {currentPage === 'campaigns' && <AdsGallery />}
        {currentPage === 'admin' && <AdminDashboard />}
      </main>

      {/* Universal Footer */}
      <Footer />

      {/* Global Modals & Overlays */}
      <QuickViewModal />
      <CartDrawer />
      <WishlistDrawer />
      <CheckoutModal />
      <AuthModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <StoreProvider>
      <PayPalScriptProvider
        options={{
          clientId: paypalClientId,
          currency: 'USD',
          intent: 'capture',
          components: 'buttons',
          enableFunding: 'card,paylater,venmo',
        }}
      >
        <MainLayout />
      </PayPalScriptProvider>
    </StoreProvider>
  );
}

export default App;
