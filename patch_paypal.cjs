const fs = require('fs');
const file = 'src/utils/paypalV6.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /        try {\n          const fallbackInstance = await \(window as any\).paypal.createInstance\(\{\n            clientId,\n            components: \['paypal-payments', 'card-fields'\],\n            pageType: 'checkout',\n          \}\);\n          return fallbackInstance;\n        } catch \(fbErr\) {/g,
  `        try {
          const fallbackInstance1 = await (window as any).paypal.createInstance({
            clientId,
            components: ['paypal-payments', 'googlepay-payments', 'card-fields'],
            pageType: 'checkout',
          });
          return fallbackInstance1;
        } catch (fbErr1) {
          try {
            const fallbackInstance2 = await (window as any).paypal.createInstance({
              clientId,
              components: ['paypal-payments', 'card-fields'],
              pageType: 'checkout',
            });
            return fallbackInstance2;
          } catch (fbErr) {`
);

fs.writeFileSync(file, code);
console.log('Patched');
