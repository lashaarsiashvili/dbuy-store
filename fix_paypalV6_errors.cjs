const fs = require('fs');
let content = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

// For Google Pay and Apple Pay
content = content.replace(
  /const \{ orderId \} = await orderRes\.json\(\);/g,
  "const orderData = await orderRes.json();\n            if (!orderData.orderId && !orderData.id) throw new Error(orderData.error || 'Failed to create PayPal order');\n            const orderId = orderData.orderId || orderData.id;"
);

fs.writeFileSync('src/utils/paypalV6.ts', content);
