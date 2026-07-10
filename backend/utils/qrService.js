const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Create QR code directory if it doesn't exist (best-effort; ephemeral on cloud hosts)
const qrDir = path.join(__dirname, '../public/qrcodes');
try {
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create QR directory (may be read-only FS):', e.message);
}

// Generate QR code for ticket — saves file AND returns data URL
// File save is best-effort (fails silently on ephemeral filesystems)
const generateTicketQR = async (ticketId, ticketData) => {
  try {
    const qrContent = {
      ticketId,
      eventId: ticketData.eventId,
      participantId: ticketData.participantId,
      eventName: ticketData.eventName,
      registeredAt: new Date().toISOString()
    };

    // Always generate data URL (works everywhere)
    const dataUrl = await QRCode.toDataURL(JSON.stringify(qrContent), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    // Best-effort file write (for local dev; won't persist on cloud)
    try {
      const qrPath = path.join(qrDir, `${ticketId}.png`);
      await QRCode.toFile(qrPath, JSON.stringify(qrContent), {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
    } catch (fileErr) {
      console.warn('QR file write skipped (ephemeral FS):', fileErr.message);
    }

    return dataUrl;
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    throw error;
  }
};

// Generate QR code as data URL (for displaying in browser)
const generateTicketQRDataUrl = async (ticketId, ticketData) => {
  try {
    const qrContent = {
      ticketId,
      eventId: ticketData.eventId,
      participantId: ticketData.participantId,
      eventName: ticketData.eventName,
      registeredAt: new Date().toISOString()
    };

    const dataUrl = await QRCode.toDataURL(JSON.stringify(qrContent), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return dataUrl;
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    throw error;
  }
};

module.exports = {
  generateTicketQR,
  generateTicketQRDataUrl
};
