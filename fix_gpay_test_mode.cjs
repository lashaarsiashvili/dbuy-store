const fs = require('fs');

let code = fs.readFileSync('src/components/OfficialGooglePayButton.tsx', 'utf8');

code = code.replace(
  /\/\/ ტესტ რეჟიმისთვის ვტოვებთ მხოლოდ საბაზისო მეთოდს \(gateway tokenization-ის გარეშე\)\n\s*\(paymentDataRequest as any\)\.allowedPaymentMethods = \[baseCardPaymentMethod\];/,
  `(paymentDataRequest as any).allowedPaymentMethods = [
      Object.assign({}, baseCardPaymentMethod, {
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            'gateway': 'example',
            'gatewayMerchantId': 'exampleGatewayMerchantId'
          }
        }
      })
    ];`
);

// Add visual alert for error debugging
code = code.replace(
  /console\.error\('Google Pay checkout error:', err\);\n\s*if \(onError\) onError\(err\);/,
  `console.error('Google Pay checkout error:', err);
        alert("Google Pay Error: " + (err.statusCode || err.message || JSON.stringify(err)));
        if (onError) onError(err);`
);

fs.writeFileSync('src/components/OfficialGooglePayButton.tsx', code);
console.log('Fixed Google Pay TEST mode parameters');
