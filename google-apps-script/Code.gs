const API_KEY = 'transobra-email-key-2026';
const SENDER_NAME = 'TransObra - Gest\u00e3o de Loca\u00e7\u00e3o';
const REPLY_TO = 'transobras.no.replay@gmail.com';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.apiKey !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid API key' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Accept both "to" (string) and "recipients" (array) formats
    let recipients = [];
    if (Array.isArray(data.recipients)) {
      recipients = data.recipients.filter(Boolean);
    } else if (data.to) {
      recipients = data.to.split(',').map(r => r.trim()).filter(Boolean);
    }

    if (recipients.length === 0 || !data.subject) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Missing recipients or subject' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const inlineImages = {};
    if (data.inlineImages && typeof data.inlineImages === 'object') {
      for (const [key, b64] of Object.entries(data.inlineImages)) {
        if (b64 && b64.length > 100) {
          const clean = b64.replace(/\s/g, '').replace(/\n/g, '');
          const mime = key === 'assinatura' ? 'image/png' : 'image/jpeg';
          inlineImages[key] = Utilities.newBlob(Utilities.base64Decode(clean), mime, key);
        }
      }
    }

    const attachments = [];
    if (Array.isArray(data.attachments)) {
      for (const att of data.attachments) {
        if (att.content && att.filename) {
          const clean = att.content.replace(/\s/g, '').replace(/\n/g, '');
          attachments.push(Utilities.newBlob(Utilities.base64Decode(clean), att.mimeType || 'application/pdf', att.filename));
        }
      }
    }

    for (const recipient of recipients) {
      const opts = {
        htmlBody: data.htmlBody || null,
        name: SENDER_NAME,
        replyTo: REPLY_TO,
        noReply: true,
      };
      if (Object.keys(inlineImages).length > 0) opts.inlineImages = inlineImages;
      if (attachments.length > 0) opts.attachments = attachments;

      GmailApp.sendEmail(recipient, data.subject, data.body || '', opts);

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
    JSON.stringify({ status: 'ok', message: 'TransObra Email API v4' })
  ).setMimeType(ContentService.MimeType.JSON);
}
