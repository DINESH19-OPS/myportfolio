const nodemailer = require('nodemailer');

/**
 * Creates and returns a nodemailer transporter.
 * Uses SMTP credentials from .env if they are configured,
 * otherwise falls back to Ethereal (fake email) for testing.
 */
async function getTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

  // Check if real SMTP credentials are provided
  if (
    smtpHost &&
    smtpUser &&
    smtpPass &&
    smtpUser !== 'your_email@gmail.com' &&
    smtpPass !== 'your_app_password_here'
  ) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  // Fallback: Use Ethereal test account for development
  console.log('[Email] No real SMTP credentials found. Using Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    _testAccount: testAccount,
  });
}

/**
 * Sends an OTP email to the user.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} otp - The 6-digit OTP code.
 */
async function sendOtpEmail(toEmail, otp) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || 'TaskFlow <noreply@taskflow.app>';

  const mailOptions = {
    from,
    to: toEmail,
    subject: '🔐 Your TaskFlow Login OTP',
    html: `
      <div style="
        font-family: 'Inter', Arial, sans-serif;
        max-width: 480px;
        margin: 0 auto;
        background: #090a0f;
        border-radius: 16px;
        padding: 40px 32px;
        border: 1px solid rgba(255,255,255,0.08);
        color: #f8fafc;
      ">
        <div style="text-align:center; margin-bottom: 28px;">
          <div style="font-size: 36px; margin-bottom: 8px;">✅</div>
          <h1 style="
            font-size: 22px;
            font-weight: 800;
            margin: 0;
            background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          ">TaskFlow</h1>
        </div>

        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #f8fafc;">
          Your Login OTP Code
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 28px;">
          Use this code to log in to your TaskFlow account. It expires in <strong style="color:#f8fafc;">10 minutes</strong>.
        </p>

        <div style="
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 28px;
        ">
          <div style="
            font-size: 42px;
            font-weight: 800;
            letter-spacing: 12px;
            color: #6366f1;
            font-family: monospace;
          ">${otp}</div>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align:center; margin: 0;">
          If you didn't request this, you can safely ignore this email.<br />
          This code cannot be used to access anyone else's account.
        </p>
      </div>
    `,
    text: `Your TaskFlow OTP is: ${otp}\n\nThis code expires in 10 minutes. If you didn't request this, ignore this email.`,
  };

  const info = await transporter.sendMail(mailOptions);

  // If using Ethereal, log the preview URL
  if (transporter.options && transporter.options._testAccount) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Email][Ethereal] Preview URL: ${previewUrl}`);
  } else {
    console.log(`[Email] OTP sent to ${toEmail} — Message ID: ${info.messageId}`);
  }

  return info;
}

module.exports = { sendOtpEmail };
