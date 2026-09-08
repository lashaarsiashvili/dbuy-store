const fs = require('fs');
let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

// Replace all instances
const regex3 = /{\/\* Google Pay Verification \/ Screenshot Helper[\s\S]*?Zero Liability Policy\n\s*<\/div>\n/g;
content = content.replace(regex3, '');

// Also fix the GooglePay onSuccess signature bug
content = content.replace(/onSuccess: \(orderID, details\) => {/g, 'onSuccess: (details) => {\n          const orderID = details.orderId || details.transactionId;');

fs.writeFileSync('src/components/CheckoutModal.tsx', content);

let content2 = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');
content2 = content2.replace(/onSuccess: \(orderID, details\) => {/g, 'onSuccess: (details) => {\n          const orderID = details.orderId || details.transactionId;');

// Remove the leftover GooglePaySheetModal from ProductPaymentModule
const regex4 = /{\/\* Realistic Google Pay Interactive Payment Sheet Modal \*\/}[\s\S]*?isProcessing={isProcessingPayment}\n\s*\/>/g;
content2 = content2.replace(regex4, '');

// ProductPaymentModule has a leftover GooglePaySheetModal render near 1441
const regex5 = /<GooglePaySheetModal[\s\S]*?executeGooglePayPayment\(\);\n\s*}}\n\s*totalAmount={totalAmountUSD}[\s\S]*?\/>/g;
content2 = content2.replace(regex5, '');

fs.writeFileSync('src/components/ProductPaymentModule.tsx', content2);
