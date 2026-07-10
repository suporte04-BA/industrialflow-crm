function doGet(e) {
  try {
    if (!e || !e.parameter || !e.parameter.d) {
      var remainingQuota = MailApp.getRemainingDailyQuota();
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'ok', message: 'TransObra Email API v7', remainingQuota: remainingQuota })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var encoded = e.parameter.d;
    var jsonStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(encoded)).getDataAsString('UTF-8');
    var data = JSON.parse(jsonStr);

    var API_KEY = 'transobra-email-key-2026';
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

    var recipients = data.to.split(',').map(function(r) { return r.trim(); }).filter(Boolean);

    var options = {};
    options.htmlBody = data.htmlBody || data.body || '';
    options.inlineImages = {};

    if (data.inlineImages) {
      for (var key in data.inlineImages) {
        if (data.inlineImages[key]) {
          var blob = Utilities.newBlob(
            Utilities.base64Decode(data.inlineImages[key]),
            'image/png',
            key
          );
          options.inlineImages[key] = blob;
        }
      }
    }

    if (data.attachments && data.attachments.length > 0) {
      options.attachments = data.attachments.map(function(att) {
        return Utilities.newBlob(
          Utilities.base64Decode(att.content),
          att.mimeType || 'application/pdf',
          att.filename
        );
      });
    }

    var sentCount = 0;
    var errors = [];
    for (var i = 0; i < recipients.length; i++) {
      try {
        MailApp.sendEmail(recipients[i], data.subject, data.body || '', options);
        sentCount++;
      } catch (err) {
        errors.push(recipients[i] + ': ' + err.message);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: sentCount > 0, sent: sentCount, total: recipients.length, errors: errors.length > 0 ? errors : undefined, remainingQuota: MailApp.getRemainingDailyQuota() })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var API_KEY = 'transobra-email-key-2026';
    
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
    
    var recipients = data.to.split(',').map(function(r) { return r.trim(); }).filter(Boolean);
    
    var options = {};
    options.htmlBody = data.htmlBody || data.body || '';
    options.inlineImages = {};
    
    if (data.inlineImages) {
      for (var key in data.inlineImages) {
        if (data.inlineImages[key]) {
          var blob = Utilities.newBlob(
            Utilities.base64Decode(data.inlineImages[key]),
            'image/png',
            key
          );
          options.inlineImages[key] = blob;
        }
      }
    }
    
    if (data.attachments && data.attachments.length > 0) {
      options.attachments = data.attachments.map(function(att) {
        return Utilities.newBlob(
          Utilities.base64Decode(att.content),
          att.mimeType || 'application/pdf',
          att.filename
        );
      });
    }
    
    var sentCount = 0;
    var errors = [];
    for (var i = 0; i < recipients.length; i++) {
      try {
        MailApp.sendEmail(recipients[i], data.subject, data.body || '', options);
        sentCount++;
      } catch (err) {
        errors.push(recipients[i] + ': ' + err.message);
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: sentCount > 0, sent: sentCount, total: recipients.length, errors: errors.length > 0 ? errors : undefined })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
