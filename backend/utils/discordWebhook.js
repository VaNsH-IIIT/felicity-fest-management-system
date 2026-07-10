// Discord Webhook notification utility

/**
 * Send a notification to an organizer's Discord webhook
 * @param {string} webhookUrl - The Discord webhook URL
 * @param {object} data - Notification data
 * @param {string} data.eventName - Event name
 * @param {string} data.participantName - Who registered
 * @param {string} data.participantEmail - Their email
 * @param {string} data.ticketId - Ticket ID
 * @param {string} data.teamName - Team name if applicable
 * @param {string} data.type - 'registration' | 'cancellation' | 'merchandise'
 */
async function sendDiscordNotification(webhookUrl, data) {
  if (!webhookUrl) return;

  const colorMap = {
    registration: 0x2ed573,   // green
    cancellation: 0xff4757,   // red
    merchandise: 0x667eea,    // accent blue
  };

  const titleMap = {
    registration: '🎫 New Registration',
    cancellation: '❌ Registration Cancelled',
    merchandise: '🛍️ Merchandise Order',
  };

  const embed = {
    title: titleMap[data.type] || '📢 Event Notification',
    color: colorMap[data.type] || 0x667eea,
    fields: [
      { name: 'Event', value: data.eventName || 'Unknown', inline: true },
      { name: 'Participant', value: data.participantName || 'Unknown', inline: true },
      { name: 'Email', value: data.participantEmail || '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Fest Event Management System' },
  };

  if (data.ticketId) {
    embed.fields.push({ name: 'Ticket ID', value: data.ticketId, inline: true });
  }
  if (data.teamName) {
    embed.fields.push({ name: 'Team', value: data.teamName, inline: true });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    // Webhook failure should not break the registration flow
    console.error('Discord webhook error:', err.message);
  }
}

module.exports = { sendDiscordNotification };
