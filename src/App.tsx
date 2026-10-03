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
  const { 
    currentPage, 
    selectedCategory, 
    products, 
    activeProductId, 
    language, 
    recordVisit, 
    user, 
    isAdmin 
  } = useStore();

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

  // Dynamic SEO Injection for Search Engines, Category Browse views, and Products (Schema.org JSON-LD / OpenGraph / Twitter Cards)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    let title = 'DBUY Store – Premium Lifestyle, Tech & Fitness Essentials';
    let description = 'Discover top-tier curated smart tech, fitness wear, hydration bottles, and everyday carry gear designed to elevate your daily routine.';
    let canonicalUrl = window.location.origin + window.location.pathname;
    let schemaData: any = null;

    // Helper functions for updating tags
    const updateMeta = (attr: string, value: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${value}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const updateCanonical = (href: string) => {
      let el = document.querySelector('link[rel="canonical"]');
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    const updateJsonLd = (data: any) => {
      let el = document.getElementById('seo-jsonld') as HTMLScriptElement;
      if (!el) {
        el = document.createElement('script');
        el.id = 'seo-jsonld';
        el.type = 'application/ld+json';
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data, null, 2);
    };

    // Determine values based on current page and selected category
    if (currentPage === 'home') {
      if (selectedCategory && selectedCategory !== 'all') {
        const categoryLabelsEn: Record<string, string> = {
          tech: 'Smart Tech Accessories',
          fitness: 'Fitness & Active Hydration',
          everyday: 'Everyday Carry Essentials',
          accessories: 'Premium Accessories',
          deals: 'Special Deals & Offers',
          drinkware: 'Smart Hydration & Bottles',
          gaming: 'Pro Gaming & Gear',
          wearables: 'Smart Wearables & Health Trackers',
          supplements: 'Health & Wellness Supplements',
          security: 'Dash Cams & Road Security',
          audio: 'Studio & Premium Audio Equipment',
        };

        const categoryLabelsKa: Record<string, string> = {
          tech: 'სმარტ ტექნიკა და აქსესუარები',
          fitness: 'ფიტნესი და აქტიური ჰიდრატაცია',
          everyday: 'ყოველდღიური აქსესუარები',
          accessories: 'პრემიუმ აქსესუარები',
          deals: 'სპეციალური შეთავაზებები',
          drinkware: 'ჭკვიანი ჰიდრატაცია და ბოთლები',
          gaming: 'გეიმინგ აღჭურვილობა',
          wearables: 'ჭკვიანი სამაჯურები და ტრეკერები',
          supplements: 'ჯანმრთელობა, კოლაგენი და ველნესი',
          security: 'ავტო კამერები და უსაფრთხოება',
          audio: 'სტუდიური და პრემიუმ აუდიო',
        };

        const label = language === 'ka' 
          ? (categoryLabelsKa[selectedCategory] || selectedCategory) 
          : (categoryLabelsEn[selectedCategory] || selectedCategory);

        title = `${label} – DBUY Store Category Browse`;
        description = language === 'ka'
          ? `შეიძინეთ საუკეთესო ${label} კატეგორიის პროდუქტები ონლაინ DBUY Store-ში. უფასო მიწოდება 50$-ზე მეტ შეკვეთაზე!`
          : `Shop premium ${label} products online at DBUY Store. Handpicked selection, certified authentic quality, and free shipping over $50.`;
        
        canonicalUrl = `${window.location.origin}/category/${selectedCategory}`;

        // Collection Page Schema
        const categoryProducts = products.filter(p => p.category === selectedCategory);
        schemaData = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          'name': title,
          'description': description,
          'url': canonicalUrl,
          'about': {
            '@type': 'Thing',
            'name': label
          },
          'mainEntity': {
            '@type': 'ItemList',
            'numberOfItems': categoryProducts.length,
            'itemListElement': categoryProducts.map((p, idx) => ({
              '@type': 'ListItem',
              'position': idx + 1,
              'url': `${window.location.origin}/product/${p.id}`,
              'name': p.title
            }))
          }
        };
      } else {
        // Base home schema
        schemaData = {
          '@context': 'https://schema.org',
          '@type': 'Store',
          'name': 'DBUY Store',
          'description': description,
          'url': window.location.origin,
          'telephone': '+1-234-567-8900',
          'priceRange': '$$',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': '123 Main St',
            'addressLocality': 'Tbilisi',
            'addressCountry': 'GE'
          }
        };
      }
    } else if (currentPage === 'product') {
      const prod = products.find(p => p.id === activeProductId);
      if (prod) {
        const prodTitle = language === 'ka' ? prod.titleKa || prod.title : prod.title;
        const prodDesc = language === 'ka' ? prod.descriptionKa || prod.description : prod.description;
        title = `${prodTitle} – DBUY Store`;
        description = `${prodDesc.substring(0, 150)}... Buy for $${prod.price} USD with worldwide shipping.`;
        canonicalUrl = `${window.location.origin}/product/${prod.id}`;

        // Product Schema
        schemaData = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': prodTitle,
          'image': window.location.origin + prod.image,
          'description': prodDesc,
          'sku': prod.id,
          'offers': {
            '@type': 'Offer',
            'url': canonicalUrl,
            'priceCurrency': 'USD',
            'price': prod.price,
            'itemCondition': 'https://schema.org/NewCondition',
            'availability': prod.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            'seller': {
              '@type': 'Organization',
              'name': 'DBUY Store'
            }
          }
        };
      }
    } else {
      const pageTitlesEn: Record<string, string> = {
        about: 'About Us',
        contact: 'Contact Support',
        guarantee: 'Money Back Guarantee',
        returns: 'Return & Refund Policy',
        privacy: 'Privacy Policy & Data Security',
        'my-orders': 'My Placed Orders',
        deliveries: 'Verified Live Customer Deliveries',
        campaigns: 'Tbilisi Ad Campaigns',
      };

      const pageTitlesKa: Record<string, string> = {
        about: 'ჩვენ შესახებ',
        contact: 'დაგვიკავშირდით',
        guarantee: 'თანხის დაბრუნების გარანტია',
        returns: 'დაბრუნების წესები',
        privacy: 'კონფიდენციალურობის პოლიტიკა',
        'my-orders': 'ჩემი შეკვეთები',
        deliveries: 'ვერიფიცირებული მიწოდებები',
        campaigns: 'თბილისის სარეკლამო კამპანიები',
      };

      const pageTitle = language === 'ka' 
        ? (pageTitlesKa[currentPage] || currentPage) 
        : (pageTitlesEn[currentPage] || currentPage);

      title = `${pageTitle} – DBUY Store`;
      canonicalUrl = `${window.location.origin}/${currentPage}`;
    }

    // Apply values to elements
    document.title = title;
    updateMeta('name', 'description', description);
    updateCanonical(canonicalUrl);

    // OpenGraph Social Share Card Elements
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:url', canonicalUrl);
    updateMeta('property', 'og:type', currentPage === 'product' ? 'product' : 'website');
    updateMeta('property', 'og:site_name', 'DBUY Store');

    // Twitter Card Elements
    updateMeta('name', 'twitter:card', 'summary_large_image');
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);

    // Schema.org structured JSON-LD Injection
    if (schemaData) {
      updateJsonLd(schemaData);
    }
  }, [currentPage, selectedCategory, products, activeProductId, language]);

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
