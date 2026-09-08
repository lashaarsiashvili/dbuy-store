const fs = require('fs');

const files = ['src/components/CheckoutModal.tsx', 'src/components/ProductPaymentModule.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove the alternative direct card form block
  const regex = /\{\/\* Alternative Direct Card Form \*\/\}([\s\S]*?)<\/form>/;
  content = content.replace(regex, '');
  
  fs.writeFileSync(file, content);
}

