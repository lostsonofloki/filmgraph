/* global fetch, process */

const RESEND_API_URL = 'https://api.resend.com/emails';

const safe = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
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
  const pageUrl = escapeHtml(safe(payload.page_url));
  const appVersion = escapeHtml(safe(payload.app_version));
  const status = escapeHtml(safe(payload.status, 'open'));
  const description = escapeHtml(safe(payload.description));
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
    `Page: ${safe(payload.page_url)}`,
    `App Version: ${safe(payload.app_version)}`,
    `Created At: ${safe(payload.created_at, new Date().toISOString())}`,
    '',
    'Description:',
    safe(payload.description),
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

  const subject = `Filmgraph Bug Report (${safe(payload.app_version, 'unknown version')})`;

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
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
      const errorBody = await resendResponse.text();
      return res.status(502).json({
        error: `Resend API rejected request (${resendResponse.status}).`,
        details: errorBody,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to send bug report notification.',
      details: error?.message || 'Unknown error',
    });
  }
}
