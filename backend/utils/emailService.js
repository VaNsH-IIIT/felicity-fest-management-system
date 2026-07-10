const nodemailer = require('nodemailer');

// Override recipient for testing — only active when explicitly set in env
const TEST_OVERRIDE_EMAIL = process.env.TEST_OVERRIDE_EMAIL || '';
const getRecipient = (email) => TEST_OVERRIDE_EMAIL || email;

// ============ EMAIL BACKEND SELECTION ============
// Priority: RESEND_API_KEY (HTTP, works on Render) > EMAIL_USER/PASSWORD (SMTP) > Ethereal (test)
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'onboarding@resend.dev';

// Debug: log key prefix on startup (safe — only shows first 8 chars)
if (RESEND_API_KEY) {
  console.log('📧 Resend API key loaded:', RESEND_API_KEY.substring(0, 8) + '..., length:', RESEND_API_KEY.length);
} else {
  console.log('📧 No RESEND_API_KEY found in environment');
}
console.log('📧 EMAIL_FROM:', EMAIL_FROM);

// ---------- Resend HTTP sender (bypasses SMTP port blocks) ----------
const sendViaResend = async (to, subject, html) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [getRecipient(to)],
      subject,
      html
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  console.log('✅ Email sent via Resend:', data.id, '→', getRecipient(to));
  return true;
};

// ---------- Nodemailer SMTP sender (local dev / paid hosting) ----------
let transporter = null;
let transporterReady = null;

if (!RESEND_API_KEY) {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    transporterReady = Promise.resolve(transporter);
    console.log('📧 Email configured with Gmail SMTP (IPv4):', process.env.EMAIL_USER);
  } else {
    transporterReady = nodemailer.createTestAccount().then(account => {
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: account.user, pass: account.pass }
      });
      console.log('📧 Ethereal test account:', account.user);
      console.log('📧 View emails: https://ethereal.email/login');
      console.log('📧 Login:', account.user, '/ Password:', account.pass);
      return transporter;
    }).catch(err => {
      console.error('❌ Ethereal setup failed:', err.message);
      return null;
    });
  }
} else {
  console.log('📧 Email configured with Resend HTTP API');
}

const sendViaSMTP = async (to, subject, html, attachments = []) => {
  await transporterReady;
  if (!transporter) throw new Error('No SMTP transporter available');
  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER || 'noreply@festevent.com',
    to: getRecipient(to),
    subject,
    html,
    attachments
  });
  console.log('✅ Email sent via SMTP:', info.messageId, '→', getRecipient(to));
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('📧 Preview URL:', previewUrl);
  return true;
};

// ---------- Unified sender ----------
const sendEmail = async (to, subject, html, attachments = []) => {
  if (RESEND_API_KEY) {
    return sendViaResend(to, subject, html);
  }
  return sendViaSMTP(to, subject, html, attachments);
};

// Send email with QR code
const sendTicketEmail = async (email, ticketData) => {
  try {
    const ticketContent = `
      <h2>🎫 Your Event Ticket</h2>
      <p>Thank you for registering for <strong>${ticketData.eventName}</strong>!</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket ID:</strong> ${ticketData.ticketId}</p>
        <p><strong>Event:</strong> ${ticketData.eventName}</p>
        <p><strong>Date:</strong> ${ticketData.eventDate}</p>
        <p><strong>Location:</strong> ${ticketData.location || 'TBA'}</p>
        <p><strong>Status:</strong> ${ticketData.status}</p>
      </div>
      
      ${ticketData.qrDataUrl ? `<p>Your QR code is below:</p><img src="${ticketData.qrDataUrl}" alt="QR Code" style="width: 200px; height: 200px;">` : ''}
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        If you have any questions, please contact the event organizer.
      </p>
    `;

    await sendEmail(email, `🎫 Ticket Confirmed - ${ticketData.eventName}`, ticketContent);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
};

// Send registration confirmation email (Normal events)
const sendRegistrationEmail = async (email, registrationData) => {
  try {
    const content = `
      <h2>✅ Registration Successful</h2>
      <p>Hello ${registrationData.participantName},</p>
      
      <p>You have successfully registered for:</p>
      <h3>${registrationData.eventName}</h3>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Ticket ID:</strong> ${registrationData.ticketId}</p>
        <p><strong>Event Type:</strong> ${registrationData.eventType}</p>
        <p><strong>Date:</strong> ${registrationData.eventDate}</p>
        <p><strong>Time:</strong> ${registrationData.eventTime || 'TBA'}</p>
        <p><strong>Location:</strong> ${registrationData.location || 'TBA'}</p>
      </div>
      
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Check your dashboard for event updates</li>
        <li>Download or print your ticket</li>
        <li>Arrive 15 minutes early on event day</li>
      </ul>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        Questions? Contact us at support@festevent.com
      </p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@festevent.com',
      to: getRecipient(email),
      subject: `✅ Registration Confirmed - ${registrationData.eventName}`,
      html: content
    };

    await sendEmail(email, `✅ Registration Confirmed - ${registrationData.eventName}`, content);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
};

// Send merchandise purchase confirmation
const sendMerchandiseEmail = async (email, purchaseData) => {
  try {
    let itemsHTML = '';
    purchaseData.items.forEach(item => {
      itemsHTML += `<li>${item.variantName} x${item.quantity} - ₹${item.totalPrice}</li>`;
    });

    const content = `
      <h2>🛍️ Purchase Confirmed</h2>
      <p>Hello ${purchaseData.participantName},</p>
      
      <p>Your merchandise purchase has been confirmed!</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>${purchaseData.eventName}</h3>
        <p><strong>Order ID:</strong> ${purchaseData.ticketId}</p>
        <h4>Items Purchased:</h4>
        <ul>${itemsHTML}</ul>
        <p><strong>Total Amount:</strong> ₹${purchaseData.totalAmount}</p>
        <p><strong>Delivery Address:</strong> ${purchaseData.deliveryAddress}</p>
      </div>
      
      <p><strong>Delivery Status:</strong> ${purchaseData.deliveryStatus}</p>
      <p>We will notify you once your merchandise is shipped.</p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        Tracking ID: ${purchaseData.ticketId}
      </p>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@festevent.com',
      to: getRecipient(email),
      subject: `🛍️ Purchase Confirmed - ${purchaseData.eventName}`,
      html: content
    };

    await sendEmail(email, `🛍️ Purchase Confirmed - ${purchaseData.eventName}`, content);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
};

module.exports = {
  sendTicketEmail,
  sendRegistrationEmail,
  sendMerchandiseEmail
};
