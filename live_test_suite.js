const BASE_URL = 'https://personal-assistant-website-2psi.onrender.com';

async function waitAndTest() {
  console.log('====================================================');
  console.log(`🌐 RUNNING LIVE VERIFICATION AGAINST: ${BASE_URL}`);
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

  // Check HTTPS
  assert('Live URL uses HTTPS protocol', BASE_URL.startsWith('https://'));

  // Wakeup / initial health check with retry
  let initialOk = false;
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Contacting ${BASE_URL}/health ...`);
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        const json = await res.json();
        console.log('Live /health response:', json);
        assert('Live /health returns HTTP 200', res.status === 200);
        assert('Live /health reports sql: "ok"', json.sql === 'ok', `Got ${json.sql}`);
        assert('Live /health reports mongodb: "ok"', json.mongodb === 'ok', `Got ${json.mongodb}`);
        initialOk = true;
        break;
      }
    } catch (err) {
      console.log(`Wakeup attempt ${attempt} waiting: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!initialOk) {
    console.error('Service did not wake up in time.');
    process.exit(1);
  }

  // 1. Check all live pages: /, /about, /faq, /errors, /contact, /status
  const pages = ['/', '/about', '/faq', '/errors', '/contact', '/status'];
  for (const p of pages) {
    try {
      const res = await fetch(`${BASE_URL}${p}`);
      assert(`Live GET ${p} returns 200`, res.status === 200, `Got ${res.status}`);
      const text = await res.text();
      if (p === '/faq') {
        const count = (text.match(/class="faq-card"/g) || []).length;
        assert('Live /faq renders exactly 12 items', count === 12, `Found ${count}`);
      } else if (p === '/errors') {
        const rows = (text.match(/class="error-row"/g) || []).length;
        assert('Live /errors renders exactly 9 codes', rows === 9, `Found ${rows}`);
      }
    } catch (e) {
      assert(`Live GET ${p}`, false, e.message);
    }
  }

  // 2. Custom 404
  try {
    const res = await fetch(`${BASE_URL}/does-not-exist`);
    const text = await res.text();
    assert('Live /does-not-exist returns 404', res.status === 404, `Got ${res.status}`);
    assert('Live 404 has "Ask the assistant" button', text.includes('Ask the assistant'));
  } catch (e) {
    assert('Live 404 test', false, e.message);
  }

  // 3. Custom 500
  try {
    const res = await fetch(`${BASE_URL}/trigger-500`);
    const text = await res.text();
    assert('Live /trigger-500 returns 500', res.status === 500, `Got ${res.status}`);
    assert('Live 500 has "Ask the assistant" button', text.includes('Ask the assistant'));
  } catch (e) {
    assert('Live 500 test', false, e.message);
  }

  // 4. POST /api/chat "What does 429 mean?"
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What does 429 mean?' })
    });
    const json = await res.json();
    assert('Live POST /api/chat "What does 429 mean?" -> type error_code', json.type === 'error_code' && json.code === '429', `Got ${json.type}, ${json.code}`);
  } catch (e) {
    assert('Live chat 429', false, e.message);
  }

  // 5. POST /api/chat "how does the assistant work"
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'how does the assistant work' })
    });
    const json = await res.json();
    assert('Live POST /api/chat "how does the assistant work" -> type faq', json.type === 'faq', `Got ${json.type}`);
  } catch (e) {
    assert('Live chat faq', false, e.message);
  }

  // 6. POST /api/chat "purple elephants dance"
  let logId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'purple elephants dance' })
    });
    const json = await res.json();
    logId = json.logId;
    assert('Live POST /api/chat "purple elephants dance" -> creates ticket', json.type === 'ticket' && !!json.ticketId, `Got ${json.type}, ticket: ${json.ticketId}`);
  } catch (e) {
    assert('Live chat ticket', false, e.message);
  }

  // 7. POST /api/tickets validation with "hi"
  try {
    const res = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Live Tester', message: 'hi' })
    });
    const json = await res.json();
    assert('Live POST /api/tickets with "hi" -> 400', res.status === 400);
    assert('Live POST /api/tickets returns code APP-1001', json.code === 'APP-1001');
  } catch (e) {
    assert('Live ticket validation', false, e.message);
  }

  // 8. POST /api/feedback
  if (logId) {
    try {
      const res = await fetch(`${BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, rating: 'up', comment: 'Verified live' })
      });
      const json = await res.json();
      assert('Live POST /api/feedback saves document', res.status === 200 && json.success === true);
    } catch (e) {
      assert('Live feedback', false, e.message);
    }
  }

  // 9. Weather endpoint /api/weather
  try {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/api/weather`);
    const elapsed = Date.now() - start;
    const json = await res.json();
    assert('Live GET /api/weather responds within 3s', elapsed <= 3000, `Took ${elapsed}ms`);
    assert('Live GET /api/weather returns temperature/fallback', json.temperature !== undefined || json.fallback === true);
  } catch (e) {
    assert('Live weather', false, e.message);
  }

  console.log('====================================================');
  console.log(`LIVE RESULTS: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

waitAndTest().catch(e => {
  console.error('Live test runner failed:', e);
  process.exit(1);
});
