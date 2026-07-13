// ============================================
// TransObra CRM - Google Apps Script Email API v8
// Advanced anti-spam, dedup, queue, audit log
// ============================================

var API_KEY = 'transobra-email-key-2026';
var SENDER_NAME = 'TransObra - Gestão de Locação';
var REPLY_TO = 'transobras.no.replay@gmail.com';
var MAX_RECIPIENTS_PER_RUN = 50;
var DELAY_BETWEEN_EMAILS_MS = 2000;
var DEDUP_SPREADSHEET_ID = null;

// ============================================
// ANTI-SPAM: In-memory dedup (reset per execution)
// ============================================
var _sentHashes = {};

function _hashStr(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function _makeDedupKey(to, subject, htmlBody) {
  var payload = to + '|' + subject + '|' + (htmlBody || '').length;
  return _hashStr(payload);
}

function _wasAlreadySent(key) {
  if (_sentHashes[key]) return true;
  _sentHashes[key] = true;
  return false;
}

// ============================================
// ANTI-SPAM: Persistent dedup via PropertiesService
// ============================================
function _getDedupStore() {
  var store = PropertiesService.getScriptProperties();
  var raw = store.getProperty('email_dedup');
  if (!raw) return {};
  try {
    var parsed = JSON.parse(raw);
    var now = Date.now();
    var cleaned = {};
    for (var k in parsed) {
      if (now - parsed[k] < 3600000) cleaned[k] = parsed[k];
    }
    return cleaned;
  } catch (e) {
    return {};
  }
}

function _saveDedupStore(store) {
  PropertiesService.getScriptProperties().setProperty('email_dedup', JSON.stringify(store));
}

function _markSentPersistent(key) {
  var store = _getDedupStore();
  store[key] = Date.now();
  if (Object.keys(store).length > 2000) {
    var now = Date.now();
    for (var k in store) {
      if (now - store[k] > 3500000) delete store[k];
    }
  }
  _saveDedupStore(store);
}

function _isDuplicate(to, subject, htmlBody) {
  var key = _makeDedupKey(to, subject, htmlBody);
  if (_wasAlreadySent(key)) return true;
  var store = _getDedupStore();
  if (store[key]) return true;
  _markSentPersistent(key);
  return false;
}

// ============================================
// ANTI-SPAM: Rate limiting via PropertiesService
// ============================================
function _checkRateLimit(domain, limit, windowMs) {
  var store = PropertiesService.getScriptProperties();
  var raw = store.getProperty('rate_limit_' + domain);
  var timestamps = [];
  if (raw) {
    try { timestamps = JSON.parse(raw); } catch (e) { timestamps = []; }
  }
  var now = Date.now();
  timestamps = timestamps.filter(function(t) { return now - t < windowMs; });
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  store.setProperty('rate_limit_' + domain, JSON.stringify(timestamps));
  return true;
}

// ============================================
// ANTI-SPAM: Quota checker
// ============================================
function _checkQuota(needed) {
  var remaining = MailApp.getRemainingDailyQuota();
  return { ok: remaining >= needed, remaining: remaining, needed: needed };
}

// ============================================
// ANTI-SPAM: Delay between emails
// ============================================
function _sleep(ms) {
  Utilities.sleep(ms);
}

// ============================================
// AUDIT LOG: Write to spreadsheet
// ============================================
function _logEmail(to, subject, status, provider, errorMsg, meta) {
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('audit_spreadsheet_id');
    if (!ssId) return;
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName('email_log') || ss.insertSheet('email_log');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'To', 'Subject', 'Status', 'Provider', 'Error', 'Meta']);
    }
    sheet.appendRow([
      new Date().toISOString(),
      to,
      subject,
      status,
      provider || 'gas',
      errorMsg || '',
      meta ? JSON.stringify(meta) : ''
    ]);
  } catch (e) {
    Logger.log('[AUDIT] Failed to write log: ' + e.message);
  }
}

// ============================================
// HEALTH CHECK: GET /doGet
// ============================================
function doGet(e) {
  try {
    var remaining = MailApp.getRemainingDailyQuota();
    var props = PropertiesService.getScriptProperties().getProperties();
    var dedupStore = _getDedupStore();
    var dedupCount = Object.keys(dedupStore).length;

    var info = {
      status: 'ok',
      version: 'transobra-email-v8',
      remainingQuota: remaining,
      dedupEntries: dedupCount,
      config: {
        apiKeySet: props.API_KEY === API_KEY,
        scriptUrlSet: !!props.SCRIPT_URL,
        auditSpreadsheetSet: !!props.audit_spreadsheet_id,
      },
      limits: {
        maxRecipientsPerRun: MAX_RECIPIENTS_PER_RUN,
        delayBetweenEmailsMs: DELAY_BETWEEN_EMAILS_MS,
        dedupWindowHours: 1,
      }
    };

    if (!e || !e.parameter || !e.parameter.d) {
      return ContentService.createTextOutput(
        JSON.stringify(info)
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // GET with base64 data (alternative to POST)
    var encoded = e.parameter.d;
    var jsonStr = Utilities.newBlob(Utilities.base64DecodeWebSafe(encoded)).getDataAsString('UTF-8');
    var data = JSON.parse(jsonStr);

    if (data.apiKey !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid API key' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return _processSend(data);

  } catch (err) {
    Logger.log('[doGet] Error: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// MAIN: POST /doPost
// ============================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No POST data received' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    if (data.apiKey !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid API key' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return _processSend(data);

  } catch (err) {
    Logger.log('[doPost] Error: ' + err.message);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// CORE: Process email send with all anti-spam
// ============================================
function _processSend(data) {
  if (!data.to || !data.subject) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Missing "to" or "subject"' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var recipients = data.to.split(',').map(function(r) { return r.trim(); }).filter(Boolean);
  if (recipients.length === 0) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'No valid recipients' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  if (recipients.length > MAX_RECIPIENTS_PER_RUN) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Too many recipients (max ' + MAX_RECIPIENTS_PER_RUN + ')' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Quota check
  var quota = _checkQuota(recipients.length);
  if (!quota.ok) {
    Logger.log('[QUOTA] Insufficient quota: need ' + quota.needed + ', have ' + quota.remaining);
    _logEmail(data.to, data.subject, 'quota_exceeded', 'gas', 'Insufficient quota');
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Insufficient Gmail quota', remaining: quota.remaining })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Build options
  var options = _buildMailOptions(data);

  var sentCount = 0;
  var skippedCount = 0;
  var errors = [];

  for (var i = 0; i < recipients.length; i++) {
    var recipient = recipients[i];

    // Anti-spam: dedup check
    if (_isDuplicate(recipient, data.subject, data.htmlBody)) {
      Logger.log('[DEDUP] Skipping duplicate: ' + recipient + ' | ' + data.subject);
      skippedCount++;
      continue;
    }

    // Anti-spam: rate limit per domain
    var domain = recipient.split('@')[1] || 'unknown';
    if (!_checkRateLimit(domain, 15, 60000)) {
      Logger.log('[RATE] Rate limited: ' + domain);
      errors.push(recipient + ': Rate limited');
      _logEmail(recipient, data.subject, 'rate_limited', 'gas', 'Rate limited for ' + domain);
      continue;
    }

    // Send with retry
    var sent = _sendWithRetry(recipient, data.subject, data.body || '', options, 2);
    if (sent) {
      sentCount++;
    } else {
      errors.push(recipient + ': Send failed after retries');
    }

    // Delay between emails (anti-spam)
    if (i < recipients.length - 1) {
      _sleep(DELAY_BETWEEN_EMAILS_MS);
    }
  }

  var result = {
    success: sentCount > 0,
    sent: sentCount,
    skipped: skippedCount,
    total: recipients.length,
    remainingQuota: MailApp.getRemainingDailyQuota()
  };
  if (errors.length > 0) result.errors = errors;

  _logEmail(data.to, data.subject, sentCount > 0 ? 'sent' : 'failed', 'gas',
    errors.length > 0 ? errors.join('; ') : null,
    { sent: sentCount, skipped: skippedCount, total: recipients.length }
  );

  return ContentService.createTextOutput(
    JSON.stringify(result)
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// Build mail options from data
// ============================================
function _buildMailOptions(data) {
  var options = {};
  options.htmlBody = data.htmlBody || data.body || '';
  options.name = SENDER_NAME;
  options.replyTo = REPLY_TO;
  options.noReply = true;
  options.inlineImages = {};

  if (data.inlineImages) {
    for (var key in data.inlineImages) {
      if (data.inlineImages[key]) {
        var clean = String(data.inlineImages[key]).replace(/\s/g, '').replace(/\n/g, '');
        var mime = 'image/png';
        if (key === 'assinatura') mime = 'image/png';
        else if (clean.length > 100) mime = 'image/jpeg';
        try {
          options.inlineImages[key] = Utilities.newBlob(
            Utilities.base64Decode(clean), mime, key
          );
        } catch (e) {
          Logger.log('[INLINE] Failed to embed: ' + key + ' - ' + e.message);
        }
      }
    }
  }

  if (data.attachments && data.attachments.length > 0) {
    options.attachments = data.attachments.map(function(att) {
      if (!att.content || !att.filename) return null;
      try {
        var clean = String(att.content).replace(/\s/g, '').replace(/\n/g, '');
        return Utilities.newBlob(
          Utilities.base64Decode(clean),
          att.mimeType || 'application/pdf',
          att.filename
        );
      } catch (e) {
        Logger.log('[ATTACH] Failed: ' + att.filename + ' - ' + e.message);
        return null;
      }
    }).filter(Boolean);
  }

  return options;
}

// ============================================
// Send with retry (exponential backoff)
// ============================================
function _sendWithRetry(to, subject, body, options, maxRetries) {
  for (var attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      MailApp.sendEmail(to, subject, body, options);
      return true;
    } catch (err) {
      Logger.log('[SEND] Attempt ' + (attempt + 1) + ' failed for ' + to + ': ' + err.message);
      if (attempt < maxRetries) {
        var delay = Math.min(2000 * Math.pow(2, attempt), 10000);
        _sleep(delay);
      }
    }
  }
  _logEmail(to, subject, 'failed', 'gas', 'Failed after ' + (maxRetries + 1) + ' attempts');
  return false;
}

// ============================================
// SETUP: Run once to configure
// ============================================
function setup() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    'API_KEY': 'transobra-email-key-2026',
    'audit_spreadsheet_id': '',
  });
  Logger.log('[SETUP] Properties configured. Set audit_spreadsheet_id for audit logging.');
}

// ============================================
// TEST: Send a test email
// ============================================
function testSend() {
  var result = _processSend({
    apiKey: API_KEY,
    to: 'suporte04@baeletrica.com.br',
    subject: '[TransObra] Teste API v8 - ' + new Date().toISOString(),
    body: 'Este é um email de teste da API v8 com anti-spam.',
    htmlBody: '<h2>Teste TransObra API v8</h2><p>Anti-spam ativo. Quota: ' + MailApp.getRemainingDailyQuota() + '</p>'
  });
  Logger.log('[TEST] Result: ' + JSON.stringify(result.getContent()));
}

// ============================================
// QUOTA: Check remaining quota
// ============================================
function checkQuota() {
  var remaining = MailApp.getRemainingDailyQuota();
  Logger.log('[QUOTA] Remaining daily quota: ' + remaining);
  return remaining;
}

// ============================================
// CLEANUP: Remove old dedup entries
// ============================================
function cleanupDedup() {
  var store = _getDedupStore();
  var now = Date.now();
  var cleaned = 0;
  for (var k in store) {
    if (now - store[k] > 3600000) {
      delete store[k];
      cleaned++;
    }
  }
  _saveDedupStore(store);
  Logger.log('[CLEANUP] Removed ' + cleaned + ' old dedup entries');
}
