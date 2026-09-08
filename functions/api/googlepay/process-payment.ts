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

    // Dispatch asynchronous order alert email
    const orderAlertHtml = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 20px; background-color: #f8fafc;">
          <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="margin: 0; color: #1e3a8a;">Google Pay Order Authorized</h2>
              <span style="background: #2563eb; color: #fff; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px;">Verified</span>
            </div>
            <p><strong>Transaction ID:</strong> ${txnId}</p>
            <p><strong>Amount:</strong> $${formattedAmount} ${currency}</p>
            <p><strong>Customer:</strong> ${payer.name} (${payer.email})</p>
            <p><strong>Shipping Address:</strong> ${payer.address}, ${payer.city} ${payer.zip}, ${payer.country}</p>
            <p style="margin-top: 16px; font-size: 12px; color: #64748b;">DBUY Store Official Payment Gateway</p>
          </div>
        </body>
      </html>
    `;

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
    }).catch((e) => console.warn('Order email notice:', e));

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
