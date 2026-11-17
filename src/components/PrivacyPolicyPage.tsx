import React from 'react';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      activeDoc="privacy-policy"
      badgeText="Data Protection & Security"
      title="Privacy Policy"
      lastUpdated="November 17, 2026"
      intro="DBuy Store (www.dbuystore.com) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you visit or make a purchase from our website."
    >
      <LegalSection number="1" title="Information We Collect">
        <ul className="list-disc pl-5 space-y-2.5 marker:text-cyan-500">
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Order &amp; Contact Information:</strong>{' '}
            Name, shipping address, billing address, email address, and phone number necessary to process and deliver your order.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Payment Information:</strong>{' '}
            All payments are processed securely through encrypted third-party payment gateways (PayPal, Google Pay, Apple Pay). DBuy Store does NOT store or have access to your full credit card details.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Technical &amp; Usage Data:</strong>{' '}
            IP address, browser type, device information, and cookies collected automatically to ensure website security, performance, and analytics (via Cloudflare and standard analytics tools).
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="2" title="How We Use Your Information">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>To process, fulfill, and ship your orders.</li>
          <li>To send order confirmations, tracking updates, and customer support responses.</li>
          <li>To prevent fraud, unauthorized transactions, and security threats.</li>
          <li>To comply with applicable legal and tax obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection number="3" title="Sharing Information with Third Parties" highlight="orange">
        <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
          <li>
            Because we operate on a dropshipping model, we share necessary shipping details (your name, delivery address, and phone number) with our trusted third-party suppliers and shipping carriers solely to fulfill and deliver your order.
          </li>
          <li>
            We share transaction data with our payment processors (PayPal, Google Pay, Apple Pay) to complete payments securely.
          </li>
          <li>
            We never sell, rent, or trade your personal information to third parties for marketing purposes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="Data Security & Cookies">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            Our website uses SSL/TLS encryption and Cloudflare security infrastructure to protect your data during transmission.
          </li>
          <li>
            We use essential cookies to maintain shopping cart functionality and improve user experience. You can disable cookies through your browser settings, though some site features may not function properly.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="5" title="Your Privacy Rights">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            You have the right to request access to, correction of, or deletion of your personal data held by us, subject to legal and accounting record-keeping requirements.
          </li>
          <li>
            To exercise any of these rights, contact us at{' '}
            <a
              href="mailto:support@dbuystore.com"
              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              support@dbuystore.com
            </a>
            .
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="6" title="Changes to This Policy">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            We reserve the right to update this Privacy Policy at any time. Any changes will be posted on this page with an updated revision date.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="7" title="Contact Us">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a
              href="mailto:support@dbuystore.com"
              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              support@dbuystore.com
            </a>
            .
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
