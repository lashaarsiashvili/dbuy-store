const fs = require('fs');

let content = fs.readFileSync('src/utils/paypalV6.ts', 'utf8');

// Replace the older startPayPalV6GooglePayCheckout if it exists so we aren't using the old manual logic.
// We'll just leave it but modify OfficialGooglePayButton to not use it.
console.log('Done');
