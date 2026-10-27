function renderLayout({ title, currentPath, siteOwner, content, weatherCity = 'Chennai' }) {
  const owner = siteOwner || process.env.SITE_OWNER || 'Guruvelah A S';
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'FAQs', path: '/faq' },
    { label: 'Error Codes', path: '/errors' },
    { label: 'Contact', path: '/contact' },
    { label: 'Status', path: '/status' }
  ];

  const navHtml = navItems.map(item => {
    const active = currentPath === item.path ? 'active' : '';
    return `<a href="${item.path}" class="nav-link ${active}">${item.label}</a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ${owner}</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
</head>
<body>
  <header class="site-header">
    <div class="container header-container">
      <a href="/" class="site-logo">
        <span class="logo-badge">⚡</span>
        <span class="logo-text">${owner}</span>
      </a>

      <div class="header-right">
        <div id="weather-badge" class="weather-badge" title="Live weather in ${weatherCity}">
          <span class="weather-icon">🌤️</span>
          <span class="weather-text">Checking ${weatherCity}...</span>
        </div>
        <nav class="site-nav">
          ${navHtml}
        </nav>
      </div>
    </div>
  </header>

  <main class="site-main">
    <div class="container main-container">
      ${content}
    </div>
  </main>

  <footer class="site-footer">
    <div class="container footer-container">
      <div class="footer-left">
        <p>&copy; ${new Date().getFullYear()} <strong>${owner}</strong>. Built with Express, SQLite, MongoDB &amp; Open-Meteo.</p>
      </div>
      <div class="footer-links">
        <a href="/health" class="footer-link">API Health</a>
        <a href="/status" class="footer-link">System Status</a>
        <a href="/faq" class="footer-link">FAQs</a>
        <a href="/errors" class="footer-link">Error Codes</a>
      </div>
    </div>
  </footer>

  <!-- Floating Chat Assistant Widget (Available on every page) -->
  <div id="assistant-widget" class="assistant-widget">
    <button id="chat-toggle-btn" class="chat-toggle-btn" aria-label="Open AI Support Assistant">
      <span class="chat-btn-icon">💬</span>
      <span class="chat-btn-label">Ask Assistant</span>
    </button>

    <div id="chat-drawer" class="chat-drawer hidden">
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-avatar">🤖</div>
          <div>
            <h3 class="chat-title">Support Assistant</h3>
            <span class="chat-status"><span class="status-dot"></span> Online (FAQ, Errors &amp; Tickets)</span>
          </div>
        </div>
        <button id="chat-close-btn" class="chat-close-btn" aria-label="Close Assistant">&times;</button>
      </div>

      <div class="chat-quick-chips">
        <button class="chip-btn" data-query="What does 429 mean?">What does 429 mean?</button>
        <button class="chip-btn" data-query="how does the assistant work">How does the assistant work?</button>
        <button class="chip-btn" data-query="Explain APP-1001">Explain APP-1001</button>
      </div>

      <div id="chat-messages" class="chat-messages">
        <div class="chat-msg msg-assistant">
          <div class="msg-bubble">
            Hello! I am your AI assistant. I can answer questions from our FAQ, explain HTTP and application error codes, or open a support ticket for you. How can I help today?
          </div>
        </div>
      </div>

      <form id="chat-form" class="chat-form">
        <input 
          type="text" 
          id="chat-input" 
          class="chat-input" 
          placeholder="Ask a question or enter an error code..." 
          autocomplete="off" 
          required
        >
        <button type="submit" class="chat-send-btn">Send</button>
      </form>
    </div>
  </div>

  <script src="/app.js"></script>
</body>
</html>`;
}

module.exports = { renderLayout };
