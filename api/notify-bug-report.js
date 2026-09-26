/* global fetch, process, console, AbortController, setTimeout, clearTimeout */

const RESEND_API_URL = 'https://api.resend.com/emails';
// Matches the AbortController pattern in api/upc-lookup.js: without it a hung Resend request
// holds the function open until the platform kills the invocation.
const RESEND_TIMEOUT_MS = 8000;

// A bug report is free text from the browser, so the body is whatever the caller sends. Caps
// keep a multi-megabyte paste out of the notification email.
const MAX_DESCRIPTION_LENGTH = 8000;
const MAX_PAGE_URL_LENGTH = 500;
const MAX_APP_VERSION_LENGTH = 32;

const truncate = (value, maxLength) => {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}… [truncated]` : text;
};

const safe = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

// Unlike every other field this one lands in a mail header, where a bare CR/LF would let the
// caller append headers of its own.
const safeHeaderValue = (value, fallback) =>
  truncate(safe(value, fallback).replace(/[\r\n]+/g, ' ').trim() || fallback, MAX_APP_VERSION_LENGTH);

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const escapeHtml = (input = '') =>
  String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function buildHtml(payload) {
  const bugId = escapeHtml(safe(payload.id));
  const submittedBy = escapeHtml(safe(payload.user_email));
  const pageUrl = escapeHtml(truncate(safe(payload.page_url), MAX_PAGE_URL_LENGTH));
  const appVersion = escapeHtml(safe(payload.app_version));
  const status = escapeHtml(safe(payload.status, 'open'));
  const description = escapeHtml(truncate(safe(payload.description), MAX_DESCRIPTION_LENGTH));
  const createdAt = escapeHtml(safe(payload.created_at, new Date().toISOString()));

  return `
    <h2>New Filmgraph Bug Report</h2>
    <p>A new bug report was submitted and requires triage.</p>
    <ul>
      <li><strong>Bug ID:</strong> ${bugId}</li>
      <li><strong>Status:</strong> ${status}</li>
      <li><strong>User:</strong> ${submittedBy}</li>
      <li><strong>Page:</strong> ${pageUrl}</li>
      <li><strong>App Version:</strong> ${appVersion}</li>
      <li><strong>Created At:</strong> ${createdAt}</li>
    </ul>
    <h3>Description</h3>
    <pre style="white-space: pre-wrap; font-family: sans-serif;">${description}</pre>
  `;
}

function buildText(payload) {
  return [
    'New Filmgraph Bug Report',
    '',
    `Bug ID: ${safe(payload.id)}`,
    `Status: ${safe(payload.status, 'open')}`,
    `User: ${safe(payload.user_email)}`,
    `Page: ${truncate(safe(payload.page_url), MAX_PAGE_URL_LENGTH)}`,
    `App Version: ${safe(payload.app_version)}`,
    `Created At: ${safe(payload.created_at, new Date().toISOString())}`,
    '',
    'Description:',
    truncate(safe(payload.description), MAX_DESCRIPTION_LENGTH),
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.BUG_REPORT_ADMIN_EMAIL;
  const fromEmail = process.env.BUG_REPORT_FROM_EMAIL;

  if (!resendApiKey || !toEmail || !fromEmail) {
    return res.status(503).json({
      error:
        'Bug report notifications are not configured. Set RESEND_API_KEY, BUG_REPORT_ADMIN_EMAIL, and BUG_REPORT_FROM_EMAIL.',
    });
  }

  const payload = req.body || {};
  if (!payload.description || !payload.page_url) {
    return res.status(400).json({ error: 'Missing required bug payload fields.' });
  }

  const subject = `Filmgraph Bug Report (${safeHeaderValue(payload.app_version, 'unknown version')})`;

  try {
    const resendResponse = await fetchWithTimeout(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        text: buildText(payload),
        html: buildHtml(payload),
      }),
    });

    if (!resendResponse.ok) {
      // The provider's body can carry account and key detail, so it stays in the function log.
      const errorBody = await resendResponse.text();
      console.error(`Resend rejected bug report notification (${resendResponse.status}): ${errorBody}`);
      return res.status(502).json({ error: 'Failed to send bug report notification.' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error(`Resend request timed out after ${RESEND_TIMEOUT_MS}ms.`);
      return res.status(504).json({ error: 'Bug report notification timed out.' });
    }
    console.error('Bug report notification failed:', error);
    return res.status(500).json({ error: 'Failed to send bug report notification.' });
  }
}
