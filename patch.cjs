const fs = require('fs');
let content = fs.readFileSync('src/components/OfficialGooglePayButton.tsx', 'utf8');

const targetStr = `          // Use PRODUCTION environment for live Google Pay payments
          const paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'PRODUCTION',
          });

          // Check if ready to pay with cards
          paymentsClient
            .isReadyToPay({
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: [
                {
                  type: 'CARD',
                  parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
                  },
                },
              ],
            })
            .then((response: any) => {
              if (!isMounted) return;
              
              if (response && containerRef.current) {
                // Clear any previous child
                containerRef.current.innerHTML = '';
                
                const button = paymentsClient.createButton({
                  onClick: (e: any) => {
                    if (e && e.preventDefault) e.preventDefault();
                    if (!disabled && !loading) {
                      onClick();
                    }
                  },
                  buttonColor: buttonColor === 'white' ? 'white' : 'black',
                  buttonType: buttonType === 'pay' ? 'pay' : 'buy',
                  buttonSizeMode: buttonSizeMode,
                  buttonLocale: 'en',
                });`;

const replacementStr = `          // Use PRODUCTION environment for live Google Pay payments
          if (!paymentsClientRef.current) {
            paymentsClientRef.current = new google.payments.api.PaymentsClient({
              environment: 'PRODUCTION',
            });
          }

          // Check if ready to pay with cards
          paymentsClientRef.current
            .isReadyToPay({
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: [
                {
                  type: 'CARD',
                  parameters: {
                    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                    allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
                  },
                },
              ],
            })
            .then((response: any) => {
              if (!isMounted) return;
              
              if (response && containerRef.current) {
                // Clear any previous child
                containerRef.current.innerHTML = '';
                
                const button = paymentsClientRef.current.createButton({
                  onClick: (e: any) => {
                    if (e && e.preventDefault) e.preventDefault();
                    handlePayment();
                  },
                  buttonColor: buttonColor === 'white' ? 'white' : 'black',
                  buttonType: buttonType === 'pay' ? 'pay' : 'buy',
                  buttonSizeMode: buttonSizeMode,
                  buttonLocale: 'ka', // using Georgian locale
                });`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/OfficialGooglePayButton.tsx', content);
console.log('Patched');
