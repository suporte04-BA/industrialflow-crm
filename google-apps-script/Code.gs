const API_KEY = 'transobra-email-key-2026';
const SENDER_NAME = 'TransObra - Gestao de Locacao';
const REPLY_TO = 'transobras.no.replay@gmail.com';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.apiKey !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid API key' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (!data.to || !data.subject) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Missing "to" or "subject"' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const recipients = data.to.split(',').map(r => r.trim()).filter(Boolean);

    for (const recipient of recipients) {
      GmailApp.sendEmail(recipient, data.subject, data.body || '', {
        htmlBody: data.htmlBody || null,
        name: SENDER_NAME,
        replyTo: REPLY_TO,
        noReply: true,
      });

      if (recipients.length > 1) {
        Utilities.sleep(1000);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, sent: recipients.length })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', message: 'TransObra Email API v3' })
  ).setMimeType(ContentService.MimeType.JSON);
}
