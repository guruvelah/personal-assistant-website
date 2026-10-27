require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING LOCAL VERIFICATION SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc} - ${details}`);
      failed++;
    }
  }

  // 1. Check HTTP 200 on /, /about, /faq, /errors, /contact, /status, /health
  const routes = ['/', '/about', '/faq', '/errors', '/contact', '/status', '/health'];
  for (const route of routes) {
    try {
      const res = await fetch(`${BASE_URL}${route}`);
      assert(`GET ${route} returns 200`, res.status === 200, `Got ${res.status}`);
      if (route === '/faq') {
        const text = await res.text();
        const count = (text.match(/class="faq-card"/g) || []).length;
        assert('/faq renders exactly 12 items', count === 12, `Found ${count} faq-cards`);
      } else if (route === '/errors') {
        const text = await res.text();
        const rowCount = (text.match(/class="error-row"/g) || []).length;
        assert('/errors renders exactly 9 codes', rowCount === 9, `Found ${rowCount} rows`);
      } else if (route === '/health') {
        const json = await res.json();
        assert('/health returns sql: "ok"', json.sql === 'ok', `Got ${json.sql}`);
        assert('/health returns mongodb: "ok" (not not_configured)', json.mongodb === 'ok', `Got ${json.mongodb}`);
      }
    } catch (err) {
      assert(`GET ${route} reachable`, false, err.message);
    }
  }

  // 2. /does-not-exist returns 404 with custom page and "Ask the assistant" button
  try {
    const res = await fetch(`${BASE_URL}/does-not-exist`);
    const text = await res.text();
    assert('/does-not-exist returns 404', res.status === 404, `Got ${res.status}`);
    assert('/does-not-exist has "Ask the assistant" button', text.includes('Ask the assistant'), 'Button missing in 404 page');
  } catch (err) {
    assert('/does-not-exist reachable', false, err.message);
  }

  // 3. /trigger-500 returns 500 with custom page and "Ask the assistant" button
  try {
    const res = await fetch(`${BASE_URL}/trigger-500`);
    const text = await res.text();
    assert('/trigger-500 returns 500', res.status === 500, `Got ${res.status}`);
    assert('/trigger-500 has "Ask the assistant" button', text.includes('Ask the assistant'), 'Button missing in 500 page');
  } catch (err) {
    assert('/trigger-500 reachable', false, err.message);
  }

  // 4. POST /api/chat "What does 429 mean?" -> type error_code
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What does 429 mean?' })
    });
    const json = await res.json();
    assert('POST /api/chat "What does 429 mean?" -> type error_code', json.type === 'error_code' && json.code === '429', `Got type: ${json.type}, code: ${json.code}`);
  } catch (err) {
    assert('POST /api/chat 429 test', false, err.message);
  }

  // 5. POST /api/chat "how does the assistant work" -> type faq
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'how does the assistant work' })
    });
    const json = await res.json();
    assert('POST /api/chat "how does the assistant work" -> type faq', json.type === 'faq', `Got type: ${json.type}`);
  } catch (err) {
    assert('POST /api/chat faq test', false, err.message);
  }

  // 6. POST /api/chat "purple elephants dance" -> creates a ticket
  let ticketId = null;
  let logId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'purple elephants dance' })
    });
    const json = await res.json();
    ticketId = json.ticketId;
    logId = json.logId;
    assert('POST /api/chat "purple elephants dance" -> creates a ticket', json.type === 'ticket' && !!json.ticketId, `Got type: ${json.type}, ticketId: ${json.ticketId}`);
  } catch (err) {
    assert('POST /api/chat ticket fallback test', false, err.message);
  }

  // 7. POST /api/tickets with message "hi" -> 400 with code APP-1001
  try {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', message: 'hi' })
    });
    const json = await res.json();
    assert('POST /api/tickets with "hi" -> 400', res.status === 400, `Got ${res.status}`);
    assert('POST /api/tickets returns code APP-1001', json.code === 'APP-1001', `Got code: ${json.code}`);
  } catch (err) {
    assert('POST /api/tickets validation test', false, err.message);
  }

  // 8. POST /api/feedback with logId
  if (logId) {
    try {
      const res = await fetch(`${BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, rating: 'up', comment: 'Excellent answer' })
      });
      const json = await res.json();
      assert('POST /api/feedback creates document in feedback', res.status === 200 && json.success === true, `Got status: ${res.status}, success: ${json.success}`);
    } catch (err) {
      assert('POST /api/feedback test', false, err.message);
    }
  }

  // 9. Weather API check: /api/weather within 3 seconds
  try {
    const startTime = Date.now();
    const res = await fetch(`${BASE_URL}/api/weather`);
    const elapsed = Date.now() - startTime;
    const json = await res.json();
    assert('GET /api/weather responds within 3 seconds', elapsed <= 3000, `Took ${elapsed}ms`);
    assert('GET /api/weather returns temperature data or fallback message', json.temperature !== undefined || json.fallback === true, `Response: ${JSON.stringify(json)}`);
  } catch (err) {
    assert('GET /api/weather test', false, err.message);
  }

  console.log('====================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
