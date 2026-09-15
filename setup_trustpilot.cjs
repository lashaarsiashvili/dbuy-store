const fs = require('fs');

// 1. Add Trustpilot script to index.html
let html = fs.readFileSync('index.html', 'utf8');
if (!html.includes('invitejs.trustpilot.com')) {
  html = html.replace('</head>', `
  <script>
    (function(w,d,s,r,n){w.TrustpilotObject=n;w[n]=w[n]||function(){(w[n].q=w[n].q||[]).push(arguments)};
    a=d.createElement(s);a.async=1;a.src=r;a.type='text/java'+s;f=d.getElementsByTagName(s)[0];
    f.parentNode.insertBefore(a,f)})(window,document,'script', 'https://invitejs.trustpilot.com/tp.min.js', 'tp');
    tp('register', 'UgGVjqJjusXj5QbQ');
  </script>
</head>`);
  fs.writeFileSync('index.html', html);
}

// 2. Create helper utility for dynamic triggering
const tpCode = `export const triggerTrustpilotInvitation = (orderId: string, email: string, name: string, items: any[]) => {
  if (typeof window === 'undefined' || !(window as any).tp) return;
  
  try {
    const trustpilot_invitation = {
      recipientEmail: email || 'customer@example.com',
      recipientName: name || 'Customer',
      referenceId: orderId || \`Order_\${Date.now()}\`,
      source: 'InvitationScript',
      productSkus: items.map(i => String(i.id)),
      products: items.map(i => ({
        sku: String(i.id),
        productUrl: window.location.origin + \`/product/\${i.id}\`,
        imageUrl: i.image ? (i.image.startsWith('http') ? i.image : window.location.origin + i.image) : '',
        name: i.name || 'Product',
      })),
    };
    (window as any).tp('createInvitation', trustpilot_invitation);
    console.log('Trustpilot invitation sent:', trustpilot_invitation);
  } catch (e) {
    console.error('Trustpilot error:', e);
  }
};
`;
fs.writeFileSync('src/utils/trustpilot.ts', tpCode);
console.log('Trustpilot configured in index.html and helper created.');
