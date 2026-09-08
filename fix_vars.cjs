const fs = require('fs');
let content = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');
content = content.replace(/setIsProcessingPayment/g, 'setIsProcessing');
content = content.replace(/totalUSD/g, 'totalAmountUSD');
fs.writeFileSync('src/components/ProductPaymentModule.tsx', content);
