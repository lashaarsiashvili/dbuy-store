/**
 * Professional DBUY Store Order Email Templates
 * Produces responsive, high-converting, brand-aligned HTML and plain-text emails
 * for both Customer Order Confirmation and Admin / Merchant Order Alerts.
 */

export interface OrderItem {
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
  selectedColor?: string;
  selectedSize?: string;
  [key: string]: any;
}

export interface CustomerInfo {
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  zip?: string;
  country?: string;
  [key: string]: any;
}

export interface OrderEmailData {
  id?: string;
  customerInfo?: CustomerInfo;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  items?: OrderItem[];
  total?: number;
  totalPrice?: number;
  currency?: string;
  paymentMethod?: string;
  transactionId?: string;
  googlePayTransactionId?: string;
  applePayTransactionId?: string;
  paypalTransactionId?: string;
  createdAt?: string | number | Date;
  status?: string;
  trackingNumber?: string;
  [key: string]: any;
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatPaymentMethodLabel(method?: string): string {
  const m = String(method || '').toLowerCase();
  if (m.includes('google')) return 'Google Pay';
  if (m.includes('apple')) return 'Apple Pay';
  if (m.includes('paypal')) return 'PayPal';
  if (m.includes('card') || m.includes('credit') || m.includes('debit') || m.includes('stripe')) return 'Credit / Debit Card';
  return 'Online Payment';
}

/**
 * Generates the official Customer Order Confirmation email
 */
export function buildCustomerOrderEmail(order: OrderEmailData): { subject: string; html: string; text: string } {
  const customerName = escapeHtml(
    order.customerInfo?.fullName || order.customerInfo?.name || order.name || 'Valued Customer'
  );
  const customerEmail = escapeHtml(order.customerInfo?.email || order.email || '');
  const orderId = escapeHtml(order.id || `ORD-${Date.now()}`);
  
  const totalNum = Number(order.total ?? order.totalPrice ?? 0);
  const formattedTotal = totalNum.toFixed(2);
  const currency = escapeHtml(order.currency || 'USD');
  const paymentMethod = formatPaymentMethodLabel(order.paymentMethod);
  
  const txnId = escapeHtml(
    order.googlePayTransactionId ||
    order.applePayTransactionId ||
    order.paypalTransactionId ||
    order.transactionId ||
    ''
  );

  const rawDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
  const orderDateFormatted = validDate.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';

  const address = escapeHtml(order.customerInfo?.address || order.address || '');
  const city = escapeHtml(order.customerInfo?.city || order.city || '');
  const zip = escapeHtml(order.customerInfo?.postalCode || order.customerInfo?.zip || order.zip || '');
  const country = escapeHtml(order.customerInfo?.country || order.country || '');
  const phone = escapeHtml(order.customerInfo?.phone || order.phone || '');

  const fullAddressLines = [
    address,
    [city, zip].filter(Boolean).join(' '),
    country,
  ].filter(Boolean);

  const rawItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{ title: 'Purchased Item', price: totalNum, quantity: 1, image: '' }];

  const itemsRowsHtml = rawItems.map((item) => {
    const title = escapeHtml(item.title || item.name || 'Product');
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0).toFixed(2);
    const lineTotal = (Number(item.price || 0) * qty).toFixed(2);
    
    // Ensure image URL resolves to absolute domain for standard email clients
    let imgUrl = item.image ? String(item.image).trim() : '';
    if (imgUrl && imgUrl.startsWith('/')) {
      imgUrl = `https://dbuystore.com${imgUrl}`;
    }

    const variantTokens = [
      item.selectedColor ? `Color: ${escapeHtml(item.selectedColor)}` : null,
      item.selectedSize ? `Size: ${escapeHtml(item.selectedSize)}` : null,
    ].filter(Boolean);
    const variantDetails = variantTokens.join(' • ');

    return `
      <tr>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
              ${imgUrl ? `
              <td style="width: 54px; vertical-align: middle; padding-right: 14px;">
                <img src="${imgUrl}" alt="${title}" width="54" height="54" style="width: 54px; height: 54px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; display: block;" />
              </td>` : `
              <td style="width: 54px; vertical-align: middle; padding-right: 14px;">
                <div style="width: 54px; height: 54px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; line-height: 54px; font-size: 22px;">📦</div>
              </td>`}
              <td style="vertical-align: middle;">
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 3px; line-height: 1.3;">
                  ${title}
                </div>
                ${variantDetails ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 3px;">${variantDetails}</div>` : ''}
                <div style="font-size: 12px; color: #64748b;">
                  Qty: <strong style="color: #0f172a;">${qty}</strong> × $${unitPrice}
                </div>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: middle; font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap;">
          $${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const itemsText = rawItems.map((i) => 
    `- ${i.title || i.name || 'Product'} (x${i.quantity || 1}) - $${Number(i.price || 0).toFixed(2)}`
  ).join('\n');

  const subject = `Order Confirmed #${orderId} | DBUY Store`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - DBUY Store</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.08); border-collapse: separate;">
    
    <!-- Brand Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                DBUY<span style="color: #3b82f6;">.</span> STORE
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 2px; font-weight: 500;">
                Curated Premium Goods • Official Purchase Receipt
              </div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
                ✓ Order Confirmed
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Container -->
    <tr>
      <td style="padding: 32px 32px 24px 32px;">
        
        <!-- Greeting -->
        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
          Thank You for Your Purchase, ${customerName}!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          We have received your order and our fulfillment team is preparing it for shipment. Below you will find your official receipt and order summary.
        </p>

        <!-- Order Information Highlight Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
          <tr>
            <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; width: 50%;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                Order Number
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #1e40af; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                #${orderId}
              </div>
            </td>
            <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; width: 50%;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                Order Date
              </div>
              <div style="font-size: 13px; font-weight: 600; color: #0f172a;">
                ${orderDateFormatted}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 20px; width: 50%;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                Payment Method
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                ${paymentMethod}
                ${txnId ? `<div style="font-size: 10px; color: #94a3b8; font-family: monospace; font-weight: normal; margin-top: 2px;">ID: ${txnId}</div>` : ''}
              </div>
            </td>
            <td style="padding: 16px 20px; width: 50%;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 4px;">
                Fulfillment Status
              </div>
              <div style="font-size: 13px; font-weight: 700; color: #15803d;">
                ⚡ Processing & Packaging
              </div>
            </td>
          </tr>
        </table>

        <!-- Purchased Items Header -->
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Ordered Items
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px;">
          ${itemsRowsHtml}
        </table>

        <!-- Cost Breakdown Table -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; font-size: 13px; border-collapse: separate;">
          <tr>
            <td style="padding: 12px 18px 6px 18px; color: #64748b;">Subtotal</td>
            <td style="padding: 12px 18px 6px 18px; text-align: right; font-weight: 600; color: #0f172a;">$${formattedTotal} ${currency}</td>
          </tr>
          <tr>
            <td style="padding: 6px 18px; color: #64748b;">Shipping & Handling</td>
            <td style="padding: 6px 18px; text-align: right; font-weight: 700; color: #16a34a;">FREE (0.00 USD)</td>
          </tr>
          <tr>
            <td style="padding: 6px 18px 12px 18px; color: #64748b;">Estimated Taxes</td>
            <td style="padding: 6px 18px 12px 18px; text-align: right; font-weight: 600; color: #64748b;">Included</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 0 18px 16px 18px;">
              <div style="border-top: 2px solid #e2e8f0; padding-top: 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size: 15px; font-weight: 800; color: #0f172a;">Total Paid:</td>
                    <td style="text-align: right; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      $${formattedTotal} <span style="font-size: 13px; font-weight: 700; color: #64748b;">${currency}</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <!-- Shipping Destination Address -->
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Shipping Destination
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 6px;">
            ${customerName}
          </div>
          ${fullAddressLines.length > 0 ? fullAddressLines.map(line => `
            <div style="font-size: 13px; color: #475569; margin-bottom: 3px;">${line}</div>
          `).join('') : '<div style="font-size: 13px; color: #94a3b8; font-style: italic;">Standard Verified Delivery</div>'}
          ${phone ? `<div style="font-size: 13px; color: #475569; margin-top: 6px;">📞 ${phone}</div>` : ''}
          ${customerEmail ? `<div style="font-size: 13px; color: #2563eb; margin-top: 4px;">✉️ ${customerEmail}</div>` : ''}
        </div>

        <!-- Trust Badges -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 12px; margin-bottom: 24px; border-collapse: separate;">
          <tr>
            <td style="padding: 16px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px; line-height: 1.6;">
                <tr>
                  <td style="padding: 3px 0; color: #1e3a8a;">
                    <strong>🚚 Express Delivery:</strong> Estimated arrival in 3–5 business days. We will email tracking details once dispatched.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; color: #1e3a8a;">
                    <strong>🛡️ 14-Day Guarantee:</strong> Hassle-free returns and customer satisfaction guarantee.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; color: #1e3a8a;">
                    <strong>🔒 Verified Checkout:</strong> Fully protected with 256-bit SSL encryption.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Call to Action Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
          <tr>
            <td style="text-align: center;">
              <a href="https://dbuystore.com" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
                Visit DBUY Store
              </a>
            </td>
          </tr>
        </table>

      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
        <div>Need assistance? Reply directly to this email or reach our support team at <a href="mailto:support@dbuystore.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@dbuystore.com</a></div>
        <div style="margin-top: 8px;">
          <a href="https://dbuystore.com" style="color: #64748b; text-decoration: none; font-weight: 600;">DBUY Store</a> • 
          <a href="https://dbuystore.com/privacy" style="color: #64748b; text-decoration: none;">Privacy Policy</a> • 
          <a href="https://dbuystore.com/terms" style="color: #64748b; text-decoration: none;">Terms of Service</a>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #cbd5e1;">
          © ${new Date().getFullYear()} DBUY Store LLC. All rights reserved.
        </div>
      </td>
    </tr>

  </table>
</body>
</html>
  `;

  const text = `DBUY STORE - ORDER CONFIRMATION
========================================
Order Number: #${orderId}
Order Date: ${orderDateFormatted}
Customer: ${customerName} (${customerEmail})
Status: Processing & Packaging
Payment Method: ${paymentMethod}${txnId ? ` (Txn: ${txnId})` : ''}

ITEMS ORDERED:
${itemsText}

FINANCIAL BREAKDOWN:
----------------------------------------
Subtotal: $${formattedTotal} ${currency}
Shipping: FREE Express (0.00 USD)
Total Paid: $${formattedTotal} ${currency}

SHIPPING DESTINATION:
----------------------------------------
${customerName}
${fullAddressLines.join('\n')}
${phone ? `Phone: ${phone}` : ''}

Thank you for shopping at DBUY Store!
If you have any questions, reach out to us at support@dbuystore.com
Store: https://dbuystore.com
========================================`;

  return { subject, html, text };
}

/**
 * Generates the Admin / Store Management Order Alert email
 */
export function buildAdminOrderAlertEmail(order: OrderEmailData): { subject: string; html: string; text: string } {
  const customerName = escapeHtml(
    order.customerInfo?.fullName || order.customerInfo?.name || order.name || 'Valued Customer'
  );
  const customerEmail = escapeHtml(order.customerInfo?.email || order.email || 'None Provided');
  const orderId = escapeHtml(order.id || `ORD-${Date.now()}`);
  
  const totalNum = Number(order.total ?? order.totalPrice ?? 0);
  const formattedTotal = totalNum.toFixed(2);
  const currency = escapeHtml(order.currency || 'USD');
  const paymentMethod = formatPaymentMethodLabel(order.paymentMethod);
  
  const txnId = escapeHtml(
    order.googlePayTransactionId ||
    order.applePayTransactionId ||
    order.paypalTransactionId ||
    order.transactionId ||
    ''
  );

  const rawDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
  const orderDateFormatted = validDate.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';

  const address = escapeHtml(order.customerInfo?.address || order.address || '');
  const city = escapeHtml(order.customerInfo?.city || order.city || '');
  const zip = escapeHtml(order.customerInfo?.postalCode || order.customerInfo?.zip || order.zip || '');
  const country = escapeHtml(order.customerInfo?.country || order.country || '');
  const phone = escapeHtml(order.customerInfo?.phone || order.phone || '');

  const rawItems = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : [{ title: 'Order Product', price: totalNum, quantity: 1, image: '' }];

  const itemsRowsHtml = rawItems.map((item) => {
    const title = escapeHtml(item.title || item.name || 'Product');
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.price || 0).toFixed(2);
    const lineTotal = (Number(item.price || 0) * qty).toFixed(2);

    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #0f172a;">
          <strong>${title}</strong> (x${qty})
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; text-align: right;">
          $${unitPrice} ea
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">
          $${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const subject = `[NEW ORDER] #${orderId} - $${formattedTotal} ${currency} from ${customerName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Order Alert - DBUY Store</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
    
    <!-- Admin Header -->
    <tr>
      <td style="background-color: #0f172a; padding: 24px 28px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="font-size: 22px; font-weight: 900; color: #ffffff;">
                DBUY<span style="color: #3b82f6;">.</span> STORE
              </div>
              <div style="font-size: 12px; color: #94a3b8;">Admin Order Dispatch Notification</div>
            </td>
            <td style="text-align: right;">
              <span style="background-color: #2563eb; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 800;">
                $${formattedTotal} ${currency}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Content Body -->
    <tr>
      <td style="padding: 28px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a;">New Customer Purchase Received!</h2>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 35%;">Order ID:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #1e40af; font-family: monospace;">#${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Customer:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${customerName} (${customerEmail})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Order Date:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${orderDateFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Payment Method:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${paymentMethod}</td>
          </tr>
          ${txnId ? `
          <tr>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Transaction ID:</td>
            <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #0f172a;">${txnId}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Shipping Destination:</td>
            <td style="padding: 10px 14px; color: #0f172a;">
              ${address ? `${address}, ${city} ${zip}, ${country}` : 'Digital / Standard'}
              ${phone ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Phone: ${phone}</div>` : ''}
            </td>
          </tr>
        </table>

        <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px; text-transform: uppercase;">
          Order Items Breakdown
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px;">
          ${itemsRowsHtml}
        </table>

        <div style="text-align: center; padding-top: 10px;">
          <a href="https://dbuystore.com/admin" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none;">
            Open Store Admin Panel
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
        DBUY Store Automatic System Dispatch • support@dbuystore.com
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `[NEW ORDER ALERT] DBUY Store
Order ID: #${orderId}
Customer: ${customerName} (${customerEmail})
Amount: $${formattedTotal} ${currency}
Payment Method: ${paymentMethod}${txnId ? ` (Txn: ${txnId})` : ''}
Destination: ${address}, ${city} ${zip}, ${country}
Date: ${orderDateFormatted}`;

  return { subject, html, text };
}
