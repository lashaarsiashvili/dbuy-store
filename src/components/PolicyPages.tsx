import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export interface PolicyPagesProps {
  policyType: 'guarantee' | 'returns' | 'privacy' | 'deliveries';
  onBack?: () => void;
}

export const PolicyPages: React.FC<PolicyPagesProps> = ({ policyType, onBack }) => {
  const { setCurrentPage } = useStore();

  const handleBack = () => {
    if (onBack) onBack();
    else setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store</span>
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          
          {/* 1. MONEY-BACK GUARANTEE */}
          {policyType === 'guarantee' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold">
                  Legal Terms & Conditions
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">Money-Back Guarantee Policy</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Effective Date: November 2026</p>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">1. Overview & Eligibility</h3>
                  <p className="text-xs leading-relaxed">
                    DBUY Store (www.dbuystore.com) provides a 30-day statutory and voluntary money-back guarantee on eligible merchandise, starting from the confirmed date of delivery. To be eligible for a full refund, the purchased item must be unused, in its original factory packaging, and accompanied by all included accessories and documentation.
                  </p>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">2. Claims and Verification</h3>
                <p className="text-xs leading-relaxed">
                  Refund requests must be formally submitted through our customer support channels. DBUY Store reserves the right to inspect returned items upon receipt at our logistics facility prior to authorizing the final reimbursement. Failure to return complete items or evidence of customer-induced physical damage may result in a partial refund or rejection of the claim.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">3. Reimbursement Timeline</h3>
                <p className="text-xs leading-relaxed">
                  Approved refunds are automatically issued to the original method of payment within 5 to 7 business days, depending on the processing times of the respective financial institution or payment gateway (e.g., Google Pay, Credit/Debit Card providers).
                </p>

                <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 mt-4">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    For formal inquiries or dispute resolutions, please contact our legal and support department at <a href="mailto:support@dbuystore.com" className="font-bold underline">support@dbuystore.com</a>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. RETURNS & REFUNDS */}
          {policyType === 'returns' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[11px] font-bold">
                  Logistics & Compliance
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">Returns & Refunds Terms</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">DBUY Store Merchant Operations</p>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <h3 className="font-bold text-slate-900 dark:text-white">1. Return Authorization Process</h3>
                <p className="text-xs leading-relaxed">
                  All product returns require prior authorization. Customers must initiate a return request via email to support@dbuystore.com, citing the unique Order ID and providing clear photographic evidence in cases of defective or damaged goods upon arrival. Unauthorized returns will not be accepted or credited.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">2. Shipping Costs and Liability</h3>
                <p className="text-xs leading-relaxed">
                  Unless the return is a direct result of a merchant error (e.g., incorrect, defective, or damaged items shipped), the customer is responsible for covering return shipping fees. DBUY Store assumes no liability for items lost or damaged in transit during unauthorized or uninspected customer-managed return shipments.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">3. Exceptions & Non-Returnable Goods</h3>
                <p className="text-xs leading-relaxed">
                  Certain categories—including digital software licenses, opened personal care items, and items explicitly marked as final sale—are strictly non-returnable and non-refundable under standard commercial regulations.
                </p>
              </div>
            </div>
          )}

          {/* 3. PRIVACY POLICY */}
          {policyType === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                  Data Protection & GDPR Compliance
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">Privacy Policy</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">DBUY Store Data Governance Framework</p>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="text-xs leading-relaxed">
                  DBUY Store (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates www.dbuystore.com. This Privacy Policy outlines our legal commitments regarding the collection, processing, storage, and disclosure of personal data gathered from users and customers.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">1. Information Collection and Lawful Basis</h3>
                <p className="text-xs leading-relaxed">
                  We collect personally identifiable information (including full name, shipping destination, electronic mail address, and contact telephone numbers) solely for the lawful performance of sales contracts, order fulfillment, and regulatory compliance.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">2. Payment Security and Third-Party Processors</h3>
                <p className="text-xs leading-relaxed">
                  Financial transactions are executed through encrypted, PCI-DSS compliant third-party gateways (such as Google Pay and authorized banking processors). DBUY Store does not retain, process, or store raw credit card credentials on its local servers.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">3. Data Retention and Security</h3>
                <p className="text-xs leading-relaxed">
                  We enforce stringent technical and organizational security measures via Cloudflare infrastructure to prevent unauthorized access, alteration, or disclosure of user data. Personal records are retained only as long as necessary for tax, legal, and operational purposes.
                </p>
              </div>
            </div>
          )}

          {/* 4. VERIFIED DELIVERIES */}
          {policyType === 'deliveries' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                  Shipping & Fulfillment SLA
                </span>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2">Verified Deliveries Framework</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">DBUY Store Logistics Guarantee</p>
              </div>

              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">DBUY Verified Delivery Protocol is active and fully operational.</span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">1. Order Processing and Dispatch</h3>
                <p className="text-xs leading-relaxed">
                  All verified orders are systematically inspected, packed securely, and handed over to certified fulfillment partners. Customers receive a unique tracking identifier via electronic notification upon dispatch.
                </p>

                <h3 className="font-bold text-slate-900 dark:text-white pt-2">2. Delivery Terms and Risk of Loss</h3>
                <p className="text-xs leading-relaxed">
                  Risk of loss and title for items purchased pass to the buyer upon delivery of the items to the carrier. DBUY Store commits to assisting customers in tracking active shipments and coordinating with logistics operators in cases of transit delays or delivery exceptions.
                </p>

                <p className="text-xs text-slate-500 mt-4">
                  For logistical inquiries or tracking support, contact <a href="mailto:support@dbuystore.com" className="text-blue-600 underline font-medium">support@dbuystore.com</a>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const GuaranteePage: React.FC = () => <PolicyPages policyType="guarantee" />;
export const ReturnsPage: React.FC = () => <PolicyPages policyType="returns" />;
export const PrivacyPage: React.FC = () => <PolicyPages policyType="privacy" />;
export const DeliveriesPolicyPage: React.FC = () => <PolicyPages policyType="deliveries" />;
export default PolicyPages;
