import React from 'react';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';
import { useStore } from '../context/StoreContext';

export const TermsPage: React.FC = () => {
  const { setCurrentPage } = useStore();

  return (
    <LegalPageLayout
      activeDoc="terms"
      badgeText="DBuy Store Legal Agreement"
      title="Terms and Conditions"
      lastUpdated="November 17, 2026"
      intro="Welcome to DBuy Store (www.dbuystore.com). By accessing or purchasing from our website, you agree to be bound by the following Terms and Conditions. Please read them carefully before using our services."
    >
      <LegalSection number="1" title="General Conditions & Dropshipping Business Model">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            DBuy Store operates on a dropshipping fulfillment model. We partner with verified third-party suppliers and manufacturers globally to source and ship products directly to you.
          </li>
          <li>
            By using this site, you confirm that you are at least the age of majority in your jurisdiction or have obtained parental/guardian consent.
          </li>
          <li>
            We reserve the right to refuse service, cancel orders, or limit quantities purchased per person, household, or order at our sole discretion.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="2" title="Products & Descriptions">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            We specialize in consumer electronics, gadgets, and tech accessories (&ldquo;Tech for a Better You&rdquo;).
          </li>
          <li>
            Because items are shipped directly from our partner suppliers, packaging may occasionally vary or include supplier branding/documentation.
          </li>
          <li>
            While we strive to display product colors, specifications, and images as accurately as possible, minor variations may occur depending on your screen settings or manufacturer updates.
          </li>
          <li>
            All product descriptions, availability, and pricing are subject to change at any time without prior notice.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="3" title="Pricing, Payments & Customs" highlight="orange">
        <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
          <li>
            All prices are listed in USD ($) unless otherwise specified on the checkout page.
          </li>
          <li>
            We accept secure online payments via PayPal, Google Pay, Apple Pay, and supported credit/debit cards.
          </li>
          <li>
            Your order will only be processed and forwarded to our fulfillment partner once full payment has been successfully authorized and received.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Customs &amp; Import Taxes:</strong>{' '}
            Since products are dispatched from international warehouses, orders may be subject to local import duties, VAT, or customs fees upon arrival in your country. These charges are the sole responsibility of the buyer.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="Shipping & Delivery">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            Orders are typically processed and dispatched by our suppliers within 1–3 business days.
          </li>
          <li>
            Estimated delivery times vary depending on the destination country and supplier warehouse location (generally 7–20 business days for standard international shipping).
          </li>
          <li>
            If you order multiple items, they may arrive in separate packages and on different dates, depending on which supplier fulfills each item.
          </li>
          <li>
            Once your order ships, you will receive a tracking number via email. DBuy Store is not responsible for delays caused by customs clearance, postal carriers, or force majeure events.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="5" title="Returns & Refunds" highlight="orange">
        <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
          <li>
            All returns, replacements, and refunds are strictly governed by our{' '}
            <a
              href="/refund-policy"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('refund-policy');
              }}
              className="text-cyan-600 dark:text-cyan-400 font-semibold underline underline-offset-2 hover:text-orange-500 transition-colors"
            >
              Refund &amp; Return Policy
            </a>
            . Please review it carefully before placing an order.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="6" title="Intellectual Property">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            All content on www.dbuystore.com, including the DBuy logo, graphics, text, and website design, is the property of DBuy Store and is protected by applicable copyright and trademark laws. Unauthorized use or reproduction is strictly prohibited.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="7" title="Limitation of Liability">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            DBuy Store acts as an online retail intermediary connecting customers with third-party suppliers. To the maximum extent permitted by law, DBuy Store shall not be liable for any indirect, incidental, or consequential damages arising from the use or inability to use the products purchased through our website.
          </li>
          <li>
            Our total liability for any claim related to a purchase shall not exceed the amount paid by you for the specific product.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="8" title="Governing Law">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            These Terms and Conditions are governed by and construed in accordance with the laws of Georgia, without regard to its conflict of law principles.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="9" title="Contact Information">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            Website:{' '}
            <a
              href="https://www.dbuystore.com"
              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              www.dbuystore.com
            </a>
          </li>
          <li>
            Email:{' '}
            <a
              href="mailto:support@dbuystore.com"
              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              support@dbuystore.com
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default TermsPage;
