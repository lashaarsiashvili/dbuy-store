const fs = require('fs');

let productPayment = fs.readFileSync('src/components/ProductPaymentModule.tsx', 'utf8');

// Header cleanup
productPayment = productPayment.replace(
  /<div className="flex items-center space-x-2">\s*<Zap className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" \/>\s*<h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">\s*\{isKa \? "მყისიერი ექსპრეს გადახდა" \: "DIRECT EXPRESS CHECKOUT"\}\s*<\/h3>\s*<\/div>/,
  `<h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {isKa ? "გადახდა" : "Payment"}
            </h3>`
);

productPayment = productPayment.replace(
  /\{isKa\s*\?\s*\`სულ გადასახდელი: \$\{formatPrice\(totalAmountUSD\)\} \(\$\{quantity\} ცალი\) • ყველა მეთოდით თანხა ირიცხება PayPal ანგარიშზე\`\s*\:\s*\`Total: \$\{formatPrice\(totalAmountUSD\)\} \(\$\{quantity\} item\$\{quantity > 1 \? "s" : ""\}\) • Processed directly to merchant PayPal account\`\}/,
  `{isKa
              ? \`სულ გადასახდელი: \${formatPrice(totalAmountUSD)} (\${quantity} ცალი)\`
              : \`Total: \${formatPrice(totalAmountUSD)} (\${quantity} item\${quantity > 1 ? "s" : ""})\`}`
);

// Remove the 256-Bit SSL Live Gateway badge
productPayment = productPayment.replace(
  /<div className="flex items-center space-x-1.5 self-start sm:self-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs">\s*<Lock className="w-3.5 h-3.5 text-emerald-600" \/>\s*<span>256-Bit SSL Live Gateway<\/span>\s*<\/div>/,
  ``
);

// Remove the "All routed to PayPal" badge
productPayment = productPayment.replace(
  /<span className="text-\[11px\] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">\s*\{isKa \? "ყველა მეთოდი მიბმულია PayPal-ზე" \: "All routed to PayPal"\}\s*<\/span>/,
  ``
);

// Remove ✓ გადახდა დაცულია PayPal Buyer Protection გარანტიით text from paypal method (Wait, is this there? Let's check)

fs.writeFileSync('src/components/ProductPaymentModule.tsx', productPayment);

console.log('ProductPaymentModule modified');
