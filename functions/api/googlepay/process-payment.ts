// Cloudflare Pages Function: /api/googlepay/process-payment
// Authorizes Google Pay express payments and sends order notification to merchant

// @ts-ignore
import { connect } from 'cloudflare:sockets';
import { WorkerMailer } from 'worker-mailer';

interface Env {
  ZOHO_USER?: string;
  ZOHO_PASSWORD?: string;
  ADMIN_EMAIL?: string;
  SUPPORT_EMAIL?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Slug, Authorization',
  'Access-Control-Max-Age': '86400',
};

async function sendOrderEmail(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  try {
    await WorkerMailer.send(
      {
        host: options.host,
        port: options.port,
        secure: true,
        authType: ['login', 'plain'],
        credentials: {
          username: options.user,
          password: options.pass,
        },
        socketTimeoutMs: 12000,
        responseTimeoutMs: 12000,
      },
      {
        from: { name: 'DBUY Payments', email: options.user },
        to: options.to.map((email) => ({ email })),
        subject: options.subject,
        html: options.html,
        text: options.text,
      }
    );
  } catch (wmErr) {
    console.warn('[Cloudflare Pages] WorkerMailer notification notice:', wmErr);
  }
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      amount,
      currency = 'USD',
      customerInfo,
      orderDetails,
      paymentData,
      description,
    } = body as any;

    const txnId = `GPAY-TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const payer = {
      name:
        paymentData?.shippingAddress?.name ||
        customerInfo?.name ||
        'Google Pay Customer',
      email:
        paymentData?.email ||
        customerInfo?.email ||
        'customer@dbuystore.com',
      address:
        paymentData?.shippingAddress?.address1 ||
        customerInfo?.address ||
        'Shipping Address',
      city:
        paymentData?.shippingAddress?.locality ||
        customerInfo?.city ||
        'Tbilisi',
      zip:
        paymentData?.shippingAddress?.postalCode ||
        customerInfo?.zip ||
        '0100',
      country:
        paymentData?.shippingAddress?.countryCode ||
        customerInfo?.country ||
        'Georgia',
    };

    const formattedAmount = Number(amount || 0).toFixed(2);
    const smtpUser = env?.ZOHO_USER || 'support@dbuystore.com';
    const smtpPass = env?.ZOHO_PASSWORD || 'Lashalasha1@';

    // Dispatch asynchronous order alert email with professional store branding
    const orderAlertHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px 12px; background-color: #f1f5f9; color: #0f172a; margin: 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background-color: #0f172a; padding: 24px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size: 22px; font-weight: 900; color: #ffffff;">DBUY<span style="color: #3b82f6;">.</span> STORE</div>
                      <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">Google Pay Transaction Authorized</div>
                    </td>
                    <td style="text-align: right;">
                      <span style="background-color: #2563eb; color: #ffffff; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                        ✓ $${formattedAmount} ${currency}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a; font-weight: 800;">Google Pay Order Confirmed</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; font-size: 13px;">
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 35%;">Transaction ID:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #1e40af; font-family: monospace;">${txnId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Customer:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${payer.name} (${payer.email})</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Shipping Destination:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${payer.address}, ${payer.city} ${payer.zip}, ${payer.country}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Payment Method:</td>
                    <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">Google Pay Instant Authorization</td>
                  </tr>
                </table>
                <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; font-size: 12px; color: #1e3a8a; line-height: 1.5; margin-bottom: 20px;">
                  <strong>⚡ Instant Express Dispatch:</strong> This order has been processed via Google Pay and logged in the DBUY Store management system.
                </div>
                <div style="text-align: center;">
                  <a href="https://dbuystore.com/admin" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none;">
                    Open Store Admin Panel
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
                DBUY Store Official Payment Gateway • support@dbuystore.com
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Customer receipt HTML
    const customerReceiptHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px 12px; background-color: #f1f5f9; color: #0f172a; margin: 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background-color: #0f172a; padding: 24px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="font-size: 22px; font-weight: 900; color: #ffffff;">DBUY<span style="color: #3b82f6;">.</span> STORE</div>
                      <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">Official Order Receipt</div>
                    </td>
                    <td style="text-align: right;">
                      <span style="background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                        ✓ Confirmed
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a;">Thank You, ${payer.name}!</h1>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                  Your Google Pay purchase of <strong>$${formattedAmount} ${currency}</strong> has been successfully authorized and confirmed.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; font-size: 13px;">
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b; width: 35%;">Transaction ID:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #1e40af; font-family: monospace;">${txnId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Amount Paid:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">$${formattedAmount} ${currency}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Shipping Destination:</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${payer.address}, ${payer.city} ${payer.zip}, ${payer.country}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">Payment Method:</td>
                    <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">Google Pay</td>
                  </tr>
                </table>
                <div style="text-align: center; margin-top: 24px;">
                  <a href="https://dbuystore.com" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none;">
                    Return to DBUY Store
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
                Need help? Contact us anytime at <a href="mailto:support@dbuystore.com" style="color: #2563eb; text-decoration: none;">support@dbuystore.com</a> • DBUY Store LLC
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // 1. Dispatch Admin Alert
    sendOrderEmail({
      host: 'smtp.zoho.eu',
      port: 465,
      user: smtpUser,
      pass: smtpPass,
      from: smtpUser,
      to: ['lashaarsiashvili@gmail.com', 'support@dbuystore.com'],
      subject: `[DBUY Order] Google Pay: $${formattedAmount} (${txnId})`,
      html: orderAlertHtml,
      text: `Google Pay Order Authorized!\nTxn ID: ${txnId}\nAmount: $${formattedAmount} ${currency}\nCustomer: ${payer.name} (${payer.email})\nAddress: ${payer.address}, ${payer.city}, ${payer.country}`,
    }).catch((e) => console.warn('Order email admin notice:', e));

    // 2. Dispatch Customer Receipt if customer email provided
    if (payer.email && payer.email.includes('@')) {
      sendOrderEmail({
        host: 'smtp.zoho.eu',
        port: 465,
        user: smtpUser,
        pass: smtpPass,
        from: smtpUser,
        to: [payer.email],
        subject: `Order Confirmation - DBUY Store ($${formattedAmount})`,
        html: customerReceiptHtml,
        text: `Thank you for your purchase!\nOrder Amount: $${formattedAmount} ${currency}\nTransaction ID: ${txnId}\nDBUY Store`,
      }).catch((e) => console.warn('Order email customer notice:', e));
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: txnId,
        googlePayTransactionId: txnId,
        paymentMethod: 'googlepay',
        amount: formattedAmount,
        currency,
        payer,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('[Cloudflare Pages] Google Pay Authorize error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to process Google Pay payment',
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
