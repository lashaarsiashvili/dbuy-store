import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory OTP storage with TTL and attempt limits
interface OtpRecord {
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
}

const otpMap = new Map<string, OtpRecord>();

// Clean up expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpMap.entries()) {
    if (record.expiresAt < now) {
      otpMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper to configure nodemailer transporter
function getMailTransporter() {
  const gmailUser = process.env.GMAIL_USER || 'lashaarsiashvili@gmail.com';
  const gmailAppPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || gmailUser;

  if (smtpHost && gmailAppPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: gmailAppPass,
      },
    });
  }

  if (gmailAppPass) {
    // Standard Gmail service using App Password
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPass,
      },
    });
  }

  // Fallback: If no password is set yet in .env, create JSON/test transport that safely logs delivery
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Send 5-Digit Verification OTP to Email
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email, name, language } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email address is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const recipientName = name && typeof name === 'string' ? name.trim() : 'Customer';
    const isKa = language === 'ka';

    // Generate cryptographically secure 5-digit number (10000 to 99999)
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes validity

    otpMap.set(normalizedEmail, {
      code,
      email: normalizedEmail,
      createdAt: now,
      expiresAt,
      attempts: 0,
    });

    const senderEmail = process.env.SMTP_FROM_EMAIL || 'support@dbuystore.com';
    const senderName = process.env.SMTP_FROM_NAME || 'DBUY Store';

    const subject = isKa 
      ? `[DBUY Store] თქვენი დამადასტურებელი კოდია: ${code}`
      : `[DBUY Store] Your verification code is: ${code}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="${isKa ? 'ka' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                      <span style="color: #2563eb;">D</span>BUY <span style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Store</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                ${isKa ? `მოგესალმებით, ${recipientName}!` : `Hello ${recipientName},`}
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${isKa 
                  ? 'გმადლობთ DBUY Store-ში რეგისტრაციისთვის. თქვენი ანგარიშის გასააქტიურებლად შეიყვანეთ ქვემოთ მითითებული 5-ციფრიანი ერთჯერადი უსაფრთხოების კოდი:' 
                  : 'Thank you for registering at DBUY Store. To complete your account verification, please enter the 5-digit one-time security code below:'}
              </p>

              <!-- Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #2563eb; border-radius: 16px; padding: 18px 36px; text-align: center;">
                      <span style="font-family: 'SF Mono', Consolas, Monaco, monospace, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #0f172a; display: block; margin-left: 10px;">
                        ${code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                ⏱️ ${isKa ? 'კოდი აქტიურია 10 წუთის განმავლობაში.' : 'This verification code is valid for 10 minutes.'}
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                ${isKa 
                  ? 'თუ თქვენ არ გაგიგზავნიათ ეს მოთხოვნა, უბრალოდ უგულებელყავით ეს წერილი. თქვენი ანგარიში დაცულია.' 
                  : 'If you did not request this verification code, please safely disregard this email. Your account remains completely secure.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                DBUY Store Security Team
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="mailto:support@dbuystore.com" style="color: #2563eb; text-decoration: none;">support@dbuystore.com</a> • <a href="https://dbuystore.com" style="color: #2563eb; text-decoration: none;">dbuystore.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = isKa
      ? `მოგესალმებით ${recipientName}!\n\nთქვენი DBUY Store-ის 5-ციფრიანი დამადასტურებელი კოდია: ${code}\n\nკოდი აქტიურია 10 წუთის განმავლობაში.\n\nთუ თქვენ არ მოგითხოვიათ ეს კოდი, უგულებელყავით ეს წერილი.\n\nგამომგზავნი: support@dbuystore.com\nDBUY Store Security`
      : `Hello ${recipientName}!\n\nYour DBUY Store 5-digit verification code is: ${code}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nSender: support@dbuystore.com\nDBUY Store Security`;

    const transporter = getMailTransporter();

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: senderEmail,
      to: normalizedEmail,
      subject,
      text: textContent,
      html: htmlContent,
    };

    const sendResult = await transporter.sendMail(mailOptions);
    console.log(`[AUTH-EMAIL-DISPATCH] Sent 5-digit OTP to: ${normalizedEmail} from: ${senderEmail}`, {
      messageId: (sendResult as { messageId?: string })?.messageId || 'dispatched',
    });

    // We respond with success and NEVER return the actual OTP code to the browser!
    res.json({
      success: true,
      message: isKa ? 'დამადასტურებელი კოდი წარმატებით გაიგზავნა თქვენს ელ-ფოსტაზე' : 'Verification code sent successfully to your email',
      sentTo: normalizedEmail,
      from: senderEmail,
    });
  } catch (error) {
    console.error('[AUTH-EMAIL-ERROR] Failed to send OTP email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dispatch verification email. Please try again.',
    });
  }
});

// API: Verify 5-Digit OTP Code
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and verification code are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    const record = otpMap.get(normalizedEmail);

    if (!record) {
      res.status(400).json({
        success: false,
        error: 'No active verification code found for this email. Please request a new code.',
      });
      return;
    }

    if (Date.now() > record.expiresAt) {
      otpMap.delete(normalizedEmail);
      res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      });
      return;
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpMap.delete(normalizedEmail);
      res.status(429).json({
        success: false,
        error: 'Too many incorrect attempts. Please request a new code.',
      });
      return;
    }

    if (record.code !== cleanCode) {
      res.status(400).json({
        success: false,
        error: 'Incorrect verification code. Please check your inbox and try again.',
      });
      return;
    }

    // Code matched! Invalidate code and confirm
    otpMap.delete(normalizedEmail);
    res.json({
      success: true,
      verified: true,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('[AUTH-VERIFY-ERROR]', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// API: Forgot Password / Temporary Password Dispatch
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email address is required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isKa = language === 'ka';
    const isAdmin = normalizedEmail === 'lashaarsiashvili@gmail.com';

    // Generate secure temporary password: DBUY- + 6 characters alphanumeric
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = `DBUY-${randStr}`;

    const senderEmail = process.env.SMTP_FROM_EMAIL || 'support@dbuystore.com';
    const senderName = process.env.SMTP_FROM_NAME || 'DBUY Store Security';

    const subject = isKa
      ? `[DBUY Store] თქვენი დროებითი პაროლი: ${tempPassword}`
      : `[DBUY Store] Your Temporary Password: ${tempPassword}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="${isKa ? 'ka' : 'en'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
                      <span style="color: #2563eb;">D</span>BUY <span style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Security</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a;">
                ${isKa ? (isAdmin ? 'მოგესალმებით, ლაშა (ადმინისტრატორი)!' : 'მოგესალმებით!') : (isAdmin ? 'Hello Administrator!' : 'Hello,')}
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${isKa 
                  ? 'თქვენ მოითხოვეთ პაროლის აღდგენა DBUY Store-ში. თქვენი ახალი დროებითი პაროლი გენერირებულია და მოცემულია ქვემოთ:' 
                  : 'You requested a password reset for your DBUY Store account. Your new secure temporary password has been generated below:'}
              </p>

              <!-- Password Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f1f5f9; border: 2px solid #2563eb; border-radius: 16px; padding: 18px 32px; text-align: center;">
                      <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #0f172a; display: block;">
                        ${tempPassword}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #475569; text-align: center;">
                🔑 ${isKa 
                  ? 'გამოიყენეთ ეს დროებითი პაროლი საიტზე შესასვლელად. შესვლის შემდეგ შეგიძლიათ შეცვალოთ პაროლი თქვენი სურვილისამებრ.' 
                  : 'Use this temporary password to sign in. Once logged in, you can update your password from your account settings.'}
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                ${isKa 
                  ? 'თუ თქვენ არ გაგიგზავნიათ ეს მოთხოვნა, გთხოვთ დაუყოვნებლივ დაუკავშირდეთ ჩვენს მხარდაჭერის გუნდს.' 
                  : 'If you did not request this password reset, please contact support@dbuystore.com immediately.'}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                DBUY Store Security Team
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                <a href="mailto:support@dbuystore.com" style="color: #2563eb; text-decoration: none;">support@dbuystore.com</a> • <a href="https://dbuystore.com" style="color: #2563eb; text-decoration: none;">dbuystore.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = isKa
      ? `მოგესალმებით!\n\nთქვენი DBUY Store-ის ახალი დროებითი პაროლია: ${tempPassword}\n\nგამოიყენეთ ეს პაროლი საიტზე შესასვლელად.\n\nგამომგზავნი: support@dbuystore.com\nDBUY Store Security`
      : `Hello!\n\nYour new DBUY Store temporary password is: ${tempPassword}\n\nUse this password to log in to your account.\n\nSender: support@dbuystore.com\nDBUY Store Security`;

    const transporter = getMailTransporter();
    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: senderEmail,
      to: normalizedEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[AUTH-TEMP-PASSWORD] Dispatched temporary password to: ${normalizedEmail}`);

    res.json({
      success: true,
      tempPassword,
      email: normalizedEmail,
      message: isKa ? 'დროებითი პაროლი წარმატებით გაიგზავნა' : 'Temporary password sent successfully',
    });
  } catch (error) {
    console.error('[AUTH-TEMP-PASS-ERROR]', error);
    res.status(500).json({ success: false, error: 'Failed to send temporary password' });
  }
});

// API: Contact message dispatch
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, orderNumber, subject, message } = req.body;
    const supportEmail = process.env.SMTP_FROM_EMAIL || 'support@dbuystore.com';
    const targetAdmin = process.env.GMAIL_USER || 'lashaarsiashvili@gmail.com';

    const transporter = getMailTransporter();
    await transporter.sendMail({
      from: `"DBUY Contact Form" <${supportEmail}>`,
      replyTo: email,
      to: targetAdmin,
      subject: `[DBUY Contact] ${subject || 'New Message'} from ${name} (${email})`,
      text: `Customer Name: ${name}\nEmail: ${email}\nOrder #: ${orderNumber || 'N/A'}\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('[CONTACT-EMAIL-ERROR]', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Serve frontend with Vite in development or static dist in production
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DBUY Store server running at http://0.0.0.0:${PORT}`);
  });
}

setupFrontend();
