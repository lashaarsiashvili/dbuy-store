const fs = require('fs');

let productPayment = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

// Hide Apple Pay tab
productPayment = productPayment.replace(
  /\{\/\* Button 2: Apple Pay \*\/\}/,
  `{/* Button 2: Apple Pay - Temporarily Disabled */}\n          {false && `
);
productPayment = productPayment.replace(
  /Apple Pay\n            <\/span>\n          <\/button>/,
  `Apple Pay\n            </span>\n          </button>\n          }`
);

// Hide Credit Card tab
productPayment = productPayment.replace(
  /\{\/\* Button 4: Debit \/ Credit Card \*\/\}/,
  `{/* Button 4: Debit / Credit Card - Temporarily Disabled */}\n          {false && `
);
productPayment = productPayment.replace(
  /\{isKa \? "საბანკო ბარათი" \: "Credit Card"\}\n            <\/span>\n          <\/button>/,
  `{isKa ? "საბანკო ბარათი" : "Credit Card"}\n            </span>\n          </button>\n          }`
);

fs.writeFileSync('src/components/ProductPaymentModule.tsx', productPayment);

let checkoutModal = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf8');

// Hide Apple Pay tab
checkoutModal = checkoutModal.replace(
  /\{\/\* Apple Pay Tab \*\/\}/,
  `{/* Apple Pay Tab - Temporarily Disabled */}\n                  {false && (`
);
checkoutModal = checkoutModal.replace(
  /Apple Pay<\/span>\n                  <\/button>/,
  `Apple Pay</span>\n                  </button>\n                  )}`
);

// Hide Credit Card tab
checkoutModal = checkoutModal.replace(
  /\{\/\* Credit Card Tab \*\/\}/,
  `{/* Credit Card Tab - Temporarily Disabled */}\n                  {false && (`
);
checkoutModal = checkoutModal.replace(
  /Credit Card<\/span>\n                  <\/button>/,
  `Credit Card</span>\n                  </button>\n                  )}`
);

fs.writeFileSync('src/components/CheckoutModal.tsx', checkoutModal);

console.log('Patched visibility');
