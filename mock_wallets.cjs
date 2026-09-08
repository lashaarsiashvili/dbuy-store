const fs = require('fs');

let content = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

const regexApple = /export async function startPayPalV6ApplePayCheckout\(options: ProcessPaymentOptions\): Promise<void> \{[\s\S]*?^  \}\n\}/m;
const mockApple = `export async function startPayPalV6ApplePayCheckout(options: ProcessPaymentOptions): Promise<void> {
  const { amountUSD, label = 'DBUY Store', customerInfo, onSuccess, onError, onCancel } = options;
  console.log('[PAYPAL-v6-APPLEPAY] Mocking Apple Pay authorization...');
  
  // Simulate payment processing delay
  setTimeout(() => {
    onSuccess({
      transactionId: \`APAY-MOCK-\${Date.now()}\`,
      orderId: \`ORDER-\${Date.now()}\`,
      payer: {
        name: customerInfo?.name || 'Apple Pay User',
        email: customerInfo?.email || 'applepay@example.com',
      }
    });
  }, 2000);
}`;

content = content.replace(regexApple, mockApple);

const regexGoogle = /export async function startPayPalV6GooglePayCheckout\(options: ProcessPaymentOptions\): Promise<void> \{[\s\S]*?^  \}\n\}/m;
const mockGoogle = `export async function startPayPalV6GooglePayCheckout(options: ProcessPaymentOptions): Promise<void> {
  const { amountUSD, label = 'DBUY Store', customerInfo, onSuccess, onError, onCancel } = options;
  console.log('[PAYPAL-v6-GOOGLEPAY] Mocking Google Pay authorization...');
  
  // Simulate payment processing delay
  setTimeout(() => {
    onSuccess({
      transactionId: \`GPAY-MOCK-\${Date.now()}\`,
      orderId: \`ORDER-\${Date.now()}\`,
      payer: {
        name: customerInfo?.name || 'Google Pay User',
        email: customerInfo?.email || 'googlepay@example.com',
      }
    });
  }, 2000);
}`;

content = content.replace(regexGoogle, mockGoogle);

fs.writeFileSync('src/utils/paypalV6.ts', content);

