const fs = require('fs');
let content = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

const regex1 = /import { GooglePaySheetModal } from ".\/GooglePaySheetModal";\n/m;
content = content.replace(regex1, '');

const regex2 = /const \[isGooglePaySheetOpen, setIsGooglePaySheetOpen\] = useState\(false\);\n/m;
content = content.replace(regex2, '');

const regex3 = /{\/\* Realistic Google Pay Interactive Payment Sheet Modal \*\/}[\s\S]*?isProcessing={isProcessingPayment}\n\s*\/>\n/m;
content = content.replace(regex3, '');

const regex4 = /const executeGooglePayPayment = async \(\) => {[\s\S]*?};/m;
content = content.replace(regex4, `const executeGooglePayPayment = async () => {
    setIsProcessingPayment(true);
    try {
      await startPayPalV6GooglePayCheckout({
        amountUSD: totalUSD,
        label: "DBUY Store Checkout",
        customerInfo: { name: "", email: "", address: "", city: "", zip: "", country: "" },
        onSuccess: (orderID, details) => {
          setIsProcessingPayment(false);
          addToast("Google Pay payment completed successfully!", "success");
          setTimeout(() => {
             // Handle post checkout redirect if needed or clear state
          }, 1000);
        },
        onError: (err) => {
          setIsProcessingPayment(false);
          console.error("Google Pay authorization error:", err);
          addToast("Google Pay payment failed", "error");
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        }
      });
    } catch(err) {
      setIsProcessingPayment(false);
    }
  };`);

const regex5 = /const handleGooglePaySubmit = \(\) => {\n\s*setIsGooglePaySheetOpen\(true\);\n\s*};/m;
content = content.replace(regex5, `const handleGooglePaySubmit = () => {
    executeGooglePayPayment();
  };`);

fs.writeFileSync('src/components/ProductPaymentModule.tsx', content);
