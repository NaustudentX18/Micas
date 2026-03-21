/**
 * My Personal CAD — Free AI Proxy
 * Cloudflare Worker that proxies requests to Groq using the app's own API key.
 * Rate limits by IP: 10 requests/hour (free), 100/hour (with user's own key).
 *
 * DEPLOYMENT:
 *   1. Install Wrangler: npm install -g wrangler
 *   2. Set your Groq key: wrangler secret put GROQ_API_KEY
 *   3. Create KV namespace: wrangler kv:namespace create "RATE_LIMIT"
 *   4. Update wrangler.toml with the KV namespace binding
 *   5. Deploy: wrangler deploy
 *
 * The app calls: POST /api/ai-proxy
 * Body: { model, messages, temperature, max_tokens, provider }
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const FREE_LIMIT_PER_HOUR = 10;      // requests per IP per hour (no personal key)
const CORS_ORIGINS = ['*'];           // Lock down to your domain in production

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400);
    }

    const { provider = 'groq', ...groqBody } = body;

    // Only Groq supported via proxy for now
    if (provider !== 'groq') {
      return corsResponse(JSON.stringify({ error: `Provider "${provider}" not supported by proxy` }), 400);
    }

    // Rate limit by IP
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rl:${ip}:${Math.floor(Date.now() / 3600000)}`; // hourly bucket

    if (env.RATE_LIMIT) {
      const count = parseInt(await env.RATE_LIMIT.get(rateLimitKey) || '0', 10);
      if (count >= FREE_LIMIT_PER_HOUR) {
        return corsResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Free tier: ${FREE_LIMIT_PER_HOUR} AI analyses per hour. Add your own Groq key in Settings to remove this limit.`,
            retryAfter: 3600 - (Math.floor(Date.now() / 1000) % 3600)
          }),
          429
        );
      }
      // Increment counter
      await env.RATE_LIMIT.put(rateLimitKey, String(count + 1), { expirationTtl: 3600 });
    }

    // Forward to Groq
    if (!env.GROQ_API_KEY) {
      return corsResponse(JSON.stringify({ error: 'Proxy not configured — GROQ_API_KEY secret missing' }), 503);
    }

    try {
      const groqRes = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'User-Agent': 'MyPersonalCAD/3.0'
        },
        body: JSON.stringify({
          model: groqBody.model || 'llama-3.1-70b-versatile',
          messages: groqBody.messages,
          temperature: groqBody.temperature ?? 0.2,
          max_tokens: groqBody.max_tokens ?? 1800,
          response_format: { type: 'json_object' }
        })
      });

      const data = await groqRes.json();

      if (!groqRes.ok) {
        return corsResponse(
          JSON.stringify({ error: data.error?.message || 'Groq API error', status: groqRes.status }),
          groqRes.status
        );
      }

      return corsResponse(JSON.stringify(data), 200);
    } catch (err) {
      return corsResponse(JSON.stringify({ error: 'Proxy fetch failed', detail: err.message }), 502);
    }
  }
};

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Provider',
    }
  });
}
