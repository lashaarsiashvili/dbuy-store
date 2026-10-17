// Cloudflare Pages Function: /api/contact
// Direct SMTP submission over Cloudflare Sockets (port 465 TLS) to Zoho Mail

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

// Helper: Send email directly using raw SMTPS over Cloudflare Sockets
async function sendSmtpsMail(options: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const socket = connect(
    { hostname: options.host, port: options.port },
    { secureTransport: 'on', allowHalfOpen: false }
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    let result = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      const lines = result.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1];
      if (lastLine && /^\d{3} /.test(lastLine)) {
        break;
      }
    }
    return result;
  }

  async function sendCommand(cmd: string, expectedCode?: number): Promise<string> {
    await writer.write(encoder.encode(cmd + '\r\n'));
    const response = await readResponse();
    if (expectedCode) {
      const lines = response.split('\r\n').filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';
      if (!lastLine.startsWith(String(expectedCode))) {
        throw new Error(`SMTP Error on command: ${response.trim()}`);
      }
    }
    return response;
  }

  // 1. Initial 220 greeting
  const greeting = await readResponse();
  if (!greeting.startsWith('220')) {
    throw new Error(`Invalid SMTP Greeting from ${options.host}: ${greeting}`);
  }

  // 2. EHLO handshake
  await sendCommand('EHLO dbuystore.com', 250);

  // 3. Authenticate with LOGIN method
  await sendCommand('AUTH LOGIN', 334);
  await sendCommand(btoa(options.user), 334);
  await sendCommand(btoa(options.pass), 235);

  // 4. MAIL FROM
  await sendCommand(`MAIL FROM:<${options.user}>`, 250);

  // 5. RCPT TO
  for (const recipient of options.to) {
    await sendCommand(`RCPT TO:<${recipient}>`, 250);
  }

  // 6. DATA command
  await sendCommand('DATA', 354);

  // 7. Construct RFC-5322 MIME payload with mandatory header-body separators
  const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  const encodedSubject = '=?UTF-8?B?' + btoa(unescape(encodeURIComponent(options.subject))) + '?=';
  const base64Text = btoa(unescape(encodeURIComponent(options.text || options.subject)));
  const base64Html = btoa(unescape(encodeURIComponent(options.html)));

  const headerLines = [
    `From: ${options.from}`,
    `To: ${options.to.join(', ')}`,
    ...(options.replyTo ? [`Reply-To: ${options.replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const mimeBody = [
    ...headerLines,
    '', // Mandatory blank line separating headers from body
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', // Mandatory blank line separating part header from body
    base64Text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', // Mandatory blank line separating part header from body
    base64Html,
    `--${boundary}--`,
    '.',
  ].join('\r\n');

  await sendCommand(mimeBody, 250);

  // 8. QUIT
  try {
    await sendCommand('QUIT');
  } catch {}

  try {
    await writer.close();
    await socket.close();
  } catch {}
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const body = await context.request.json().catch(() => ({}));
    const { name, email, orderNumber, subject, message } = body as Record<string, string>;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and message are required.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const smtpUser = (context.env?.ZOHO_USER || 'support@dbuystore.com').trim();
    const smtpPass = (context.env?.ZOHO_PASSWORD || 'cjmwVviQbiaq').trim();
    const adminEmail = (context.env?.ADMIN_EMAIL || 'lashaarsiashvili@gmail.com').trim();
    const supportEmail = (context.env?.SUPPORT_EMAIL || 'support@dbuystore.com').trim();
    const recipients = [supportEmail, adminEmail].filter(Boolean);

    const formattedDate = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC';

    // 1. Support team notification email (matching official DBUY styling)
    const notificationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Support Ticket - DBUY Store</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">DBUY<span style="color: #3b82f6;">.</span> STORE</span>
                    </td>
                    <td style="text-align: right;">
                      <span style="display: inline-block; background-color: rgba(37, 99, 235, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        New Support Ticket
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 32px;">
                <h1 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #0f172a;">Customer Inquiry Received</h1>
                <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                  A new message has been submitted via the DBUY Store contact form and assigned to <strong>support@dbuystore.com</strong>.
                </p>

                <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; font-size: 13px;">
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 35%;">Customer Name:</td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Email Address:</td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: 700;">
                      <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Order Number:</td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">
                      ${orderNumber ? `<span style="background-color: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: 700;">#${orderNumber}</span>` : '<span style="color: #94a3b8;">None Provided</span>'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Subject Topic:</td>
                    <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${subject || 'General Inquiry'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Received Time:</td>
                    <td style="padding: 12px 16px; color: #475569; font-size: 12px;">${formattedDate}</td>
                  </tr>
                </table>

                <div style="margin-bottom: 28px;">
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 8px;">Customer Message:</div>
                  <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 8px; padding: 18px; font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${message}</div>
                </div>

                <div style="text-align: center; margin-bottom: 8px;">
                  <a href="mailto:${email}?subject=Re:%20[DBUY%20Support]%20${encodeURIComponent(subject || 'Your Inquiry')}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                    ✉️ Reply to ${name} (${email})
                  </a>
                </div>
              </td>
            </tr>

            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                Dispatched directly to <strong style="color: #64748b;">support@dbuystore.com</strong><br />
                © ${new Date().getFullYear()} DBUY Store LLC. All customer rights reserved.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // 2. Customer auto-acknowledgement email
    const customerAckHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We Received Your Message - DBUY Store</title>
        </head>
        <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
            <tr>
              <td style="background-color: #2563eb; padding: 28px 32px; text-align: center; color: #ffffff;">
                <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px;">DBUY<span style="color: #93c5fd;">.</span> STORE</div>
                <div style="font-size: 13px; font-weight: 500; color: #bfdbfe;">Customer Care & Support</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #0f172a;">Thank You for Reaching Out, ${name}!</h1>
                <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.6;">
                  We have successfully received your inquiry and forwarded it directly to our customer support team at <strong>support@dbuystore.com</strong>.
                </p>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #334155; line-height: 1.6;">
                  Our team is reviewing your message and will respond to <strong>${email}</strong> within <strong>12 to 24 business hours</strong>.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Your Inquiry Summary:</div>
                  <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">Subject: ${subject || 'General Inquiry'}</div>
                  <div style="font-size: 13px; color: #475569; font-style: italic; line-height: 1.5; white-space: pre-wrap;">"${message}"</div>
                </div>
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">
                  Best regards,<br />
                  <strong style="color: #0f172a;">DBUY Customer Care Team</strong><br />
                  <a href="mailto:support@dbuystore.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@dbuystore.com</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // 1. Primary email dispatch (WorkerMailer with SMTPS raw socket fallback)
    let sendMethod = '';
    let lastSendErr: any = null;

    try {
      await WorkerMailer.send(
        {
          host: 'smtp.zoho.eu',
          port: 465,
          secure: true,
          authType: ['login', 'plain'],
          credentials: {
            username: smtpUser,
            password: smtpPass,
          },
          socketTimeoutMs: 15000,
          responseTimeoutMs: 15000,
        },
        {
          from: { name: 'DBUY Contact Form', email: smtpUser },
          to: recipients.map(r => ({ email: r })),
          reply: { name, email },
          subject: `[DBUY Support] ${subject || 'New Inquiry'} from ${name} (${email})`,
          html: notificationHtml,
          text: `Customer: ${name}\nEmail: ${email}\nOrder #: ${orderNumber || 'N/A'}\nSubject: ${subject}\n\nMessage:\n${message}`,
        }
      );
      sendMethod = 'WorkerMailer';
    } catch (wmErr: any) {
      console.warn('[Cloudflare Pages] WorkerMailer failed, trying direct socket fallback:', wmErr?.message || wmErr);
      lastSendErr = wmErr;

      try {
        await sendSmtpsMail({
          host: 'smtp.zoho.eu',
          port: 465,
          user: smtpUser,
          pass: smtpPass,
          from: `"DBUY Contact Form" <${smtpUser}>`,
          to: recipients,
          replyTo: `${name} <${email}>`,
          subject: `[DBUY Support] ${subject || 'New Inquiry'} from ${name} (${email})`,
          html: notificationHtml,
          text: `Customer: ${name}\nEmail: ${email}\nOrder #: ${orderNumber || 'N/A'}\nSubject: ${subject}\n\nMessage:\n${message}`,
        });
        sendMethod = 'DirectSocketFallback';
        lastSendErr = null;
      } catch (fallbackErr: any) {
        lastSendErr = fallbackErr;
      }
    }

    if (!sendMethod) {
      console.error('[Cloudflare Pages Function] All dispatch attempts failed:', lastSendErr);
      return new Response(
        JSON.stringify({ success: false, error: lastSendErr?.message || 'Failed to dispatch email to support@dbuystore.com' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Non-blocking customer auto-acknowledgement
    try {
      WorkerMailer.send(
        {
          host: 'smtp.zoho.eu',
          port: 465,
          secure: true,
          authType: ['login', 'plain'],
          credentials: { username: smtpUser, password: smtpPass },
        },
        {
          from: { name: 'DBUY Customer Care', email: smtpUser },
          to: [{ name, email }],
          subject: `Message Received - DBUY Customer Care [${subject || 'Inquiry'}]`,
          html: customerAckHtml,
          text: `Hello ${name},\n\nWe received your message regarding "${subject || 'Inquiry'}". Our team will respond shortly.\n\nBest regards,\nDBUY Support Team`,
        }
      ).catch(() => {});
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message successfully sent to DBUY Support',
        method: sendMethod,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Cloudflare Pages Function] Contact Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to dispatch email' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
};
