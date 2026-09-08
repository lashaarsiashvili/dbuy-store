const fs = require('fs');
let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

const regex = /const handleNativeApplePayAttempt[\s\S]*?};/m;
content = content.replace(regex, '');

fs.writeFileSync('src/components/CheckoutModal.tsx', content);
