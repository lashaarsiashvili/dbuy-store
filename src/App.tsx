import React, { useEffect } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductGrid } from './components/ProductGrid';
import { TrustSection } from './components/TrustSection';
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
import { ToastContainer } from './components/ToastContainer';

const MainLayout: React.FC = () => {
  const { currentPage, recordVisit } = useStore();

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
      };
      recordVisit(pageNames[currentPage] || currentPage);
    }
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Universal Header */}
      <Header />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            <Hero />
            <ProductGrid />
            <TrustSection />
          </>
        )}

        {currentPage === 'product' && <ProductDetailPage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'contact' && <ContactPage />}
        {currentPage === 'guarantee' && <GuaranteePage />}
        {currentPage === 'returns' && <ReturnsPage />}
        {currentPage === 'privacy' && <PrivacyPage />}
        {currentPage === 'my-orders' && <MyOrdersPage />}
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
      <MainLayout />
    </StoreProvider>
  );
}

export default App;
