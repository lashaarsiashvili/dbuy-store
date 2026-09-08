const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Ensure /paypal-api/checkout/orders is handled
content = content.replace(
  "app.post(['/paypal-api/checkout/orders/create', '/paypal-api/checkout/orders/create-with-sample-data'], async (req, res) => {",
  "app.post(['/paypal-api/checkout/orders', '/paypal-api/checkout/orders/create', '/paypal-api/checkout/orders/create-with-sample-data'], async (req, res) => {"
);

// Fix the extraction of amount to include amountUSD
content = content.replace(
  "const orderAmt = amount || purchaseUnits?.[0]?.amount?.value || purchase_units?.[0]?.amount?.value || '10.00';",
  "const orderAmt = amount || req.body.amountUSD || purchaseUnits?.[0]?.amount?.value || purchase_units?.[0]?.amount?.value || '10.00';"
);

fs.writeFileSync('server.ts', content);
