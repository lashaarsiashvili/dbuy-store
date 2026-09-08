const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Replace the fallback logic in handleCreatePayPalOrder to throw an error instead
const fallbackRegex = /if \(\!ok\) \{[\s\S]*?return \{[\s\S]*?merchantPayee: 'lashafrommadrid@gmail\.com',\n      \};\n    \}/;
const newErrorThrow = `if (!ok) {
      console.warn('[PAYPAL-ERROR] Create Order Failed:', orderData);
      throw new Error(orderData?.message || orderData?.error_description || 'Failed to create PayPal order');
    }`;
content = content.replace(fallbackRegex, newErrorThrow);

// Replace fallback in the other endpoint handler (around 2370)
const otherFallbackRegex = /} catch \(err: any\) \{\n    console\.error\('\[PAYPAL-SERVER\] Error creating order, safely returning fallback:', err\);\n    const fallbackId = `PP-\\\$\{Date\.now\(\)\}-\\\$\{Math\.random\(\)\.toString\(36\)\.substring\(2, 7\)\.toUpperCase\(\)\}`;[\s\S]*?merchantPayee: 'lashafrommadrid@gmail\.com',\n    \}\);\n  \}/;

const newOtherErrorThrow = `} catch (err: any) {
    console.error('[PAYPAL-SERVER] Error creating order:', err);
    res.status(500).json({ error: err.message || 'Payment gateway error' });
  }`;
content = content.replace(otherFallbackRegex, newOtherErrorThrow);

// Update /paypal-api/checkout/orders handler to return payment_id and client_secret if needed and correct error shape
const v6EndpointRegex = /res\.json\(\{ id: result\.id, orderId: result\.id, \.\.\.result \}\);\n  \} catch \(err: any\) \{\n    res\.status\(500\)\.json\(\{ success: false, error: err\.message \}\);\n  \}/;
const newV6EndpointResponse = `res.json({ id: result.id, orderId: result.id, payment_id: result.id, client_secret: result.id, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment gateway error' });
  }`;
content = content.replace(v6EndpointRegex, newV6EndpointResponse);

fs.writeFileSync('server.ts', content);
