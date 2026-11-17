import React from 'react';
import { LegalPageLayout, LegalSection } from './LegalPageLayout';

export const RefundPolicyPage: React.FC = () => {
  return (
    <LegalPageLayout
      activeDoc="refund-policy"
      badgeText="Official Store Return & Refund Terms"
      title="Refund & Return Policy"
      lastUpdated="November 17, 2026"
      intro="At DBuy Store (www.dbuystore.com), we strive to deliver high-quality tech products and gadgets. Please read our Refund & Return Policy carefully before completing your purchase."
    >
      <LegalSection number="1" title="Strictly No Returns for Change of Mind" highlight="orange">
        <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/80 dark:border-orange-500/30 mb-3">
          <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
            <li>
              We do NOT accept returns, exchanges, or refunds simply because you changed your mind, no longer want the item, ordered by mistake, or do not like the product after receiving it (&ldquo;I don&apos;t like it&rdquo; is not a valid reason for a return).
            </li>
            <li>
              Please review all product specifications, compatibility details, and descriptions carefully before placing your order.
            </li>
          </ul>
        </div>
      </LegalSection>

      <LegalSection number="2" title="Non-Returnable Items" highlight="orange">
        <ul className="list-disc pl-5 space-y-2 marker:text-orange-500">
          <li>
            Certain products are strictly final sale and cannot be returned under any circumstances, including:
            <ul className="list-disc pl-5 mt-2 space-y-1.5 marker:text-cyan-500">
              <li>Personal care, hygiene, or wearable items once unsealed/opened.</li>
              <li>Clearance, discounted, or promotional items.</li>
              <li>Products marked as &ldquo;Non-Returnable&rdquo; or &ldquo;Final Sale&rdquo; on the product page.</li>
            </ul>
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="3" title="Eligibility for Damaged, Defective, or Incorrect Items">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            A replacement or refund is ONLY offered if the item arrived physically damaged during transit, was manufacturing-defective upon arrival, or if you received the completely wrong item.
          </li>
          <li>
            You must report the issue within 7 days of delivery by emailing{' '}
            <a
              href="mailto:support@dbuystore.com"
              className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
            >
              support@dbuystore.com
            </a>
            . Claims submitted after 7 days will not be accepted.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="4" title="Mandatory Proof of Damage & Customer-Caused Damage Exclusion" highlight="orange">
        <ul className="list-disc pl-5 space-y-2.5 marker:text-orange-500">
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Mandatory Proof:</strong>{' '}
            To qualify for a refund or replacement, the customer MUST provide clear photo and/or video evidence (including unboxing or clear footage of the defect and shipping label) proving that the item arrived damaged or defective. Claims without sufficient visual proof will be automatically rejected.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white font-bold">Customer-Caused Damage:</strong>{' '}
            We do NOT replace or refund items that have been damaged, dropped, broken, exposed to liquid, misused, or improperly installed by the customer after delivery.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="5" title="Return Shipping Instructions">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            Because DBuy Store operates with international fulfillment centers, DO NOT send any item back to the return address printed on the shipping package without prior written authorization from us. Unauthorized returns will not be refunded.
          </li>
          <li>
            If a return is approved, our support team will provide the designated warehouse address. Return shipping costs are the responsibility of the buyer unless otherwise agreed in writing.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="6" title="Refund Processing">
        <ul className="list-disc pl-5 space-y-2 marker:text-cyan-500">
          <li>
            Once your claim and visual proof are verified (or once the approved return is received and inspected), we will notify you of the approval or rejection of your refund.
          </li>
          <li>
            Approved refunds will be issued to your original payment method (PayPal, Google Pay, Apple Pay, or card) within 5–10 business days.
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default RefundPolicyPage;
