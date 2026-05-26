/**
 * Cloudflare Worker — Substack Subscribe Proxy
 * for sailingwithsage.com
 *
 * Deployed at: https://substack-subscribe.YOUR_SUBDOMAIN.workers.dev
 * (or bind to a custom route like subscribe.sailingwithsage.com)
 *
 * What it does:
 *   1. Receives a POST from the site newsletter form
 *   2. Forwards the email to Substack's API server-side (no CORS issue)
 *   3. Returns JSON success/error back to the site
 *
 * Free tier: 100,000 requests/day — more than enough.
 */

const SUBSTACK_PUB    = 'sailingwithsage'; // ← your Substack publication slug
const ALLOWED_ORIGINS = [
  'https://sailingwithsage.com',
  'https://www.sailingwithsage.com',
  'http://127.0.0.1:5500',   // VS Code Live Server for local testing
  'http://localhost:5500',
];

export default {
  async fetch(request) {

    const origin = request.headers.get('Origin') || '';

    // ── CORS preflight ────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    // ── Only accept POST ──────────────────────────────────────────
    if (request.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405, origin);
    }

    // ── Parse body ────────────────────────────────────────────────
    let email;
    try {
      const body = await request.json();
      email = (body.email || '').trim().toLowerCase();
    } catch {
      return corsResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    // ── Validate email ────────────────────────────────────────────
    if (!email || !email.includes('@') || !email.includes('.')) {
      return corsResponse({ error: 'Invalid email address' }, 400, origin);
    }

    // ── Forward to Substack ───────────────────────────────────────
    try {
      const substackRes = await fetch(
        `https://${SUBSTACK_PUB}.substack.com/api/v1/free`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':   'sailingwithsage.com/1.0',
            'Referer':      'https://sailingwithsage.com/',
            'Origin':       'https://sailingwithsage.com',
          },
          body: JSON.stringify({
            email,
            first_url:      'https://sailingwithsage.com',
            first_referrer: 'https://sailingwithsage.com',
          }),
        }
      );

      // Substack returns 200 on success, sometimes 400 for dupe emails
      if (substackRes.ok) {
        return corsResponse({ success: true }, 200, origin);
      }

      const errText = await substackRes.text();
      console.error('Substack error:', substackRes.status, errText);

      // 400 often means already subscribed — treat as success for UX
      if (substackRes.status === 400) {
        return corsResponse({ success: true, note: 'already_subscribed' }, 200, origin);
      }

      return corsResponse(
        { error: 'Substack error', status: substackRes.status },
        502,
        origin
      );

    } catch (err) {
      console.error('Worker fetch error:', err);
      return corsResponse({ error: 'Internal error' }, 500, origin);
    }
  },
};

// ── Helper: JSON response with CORS headers ───────────────────────
function corsResponse(body, status, origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };
  return new Response(
    body !== null ? JSON.stringify(body) : null,
    { status, headers }
  );
}