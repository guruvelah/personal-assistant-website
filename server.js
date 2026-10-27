require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const mongo = require('./mongo');
const assistant = require('./assistant');
const { renderLayout } = require('./layout');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_OWNER = process.env.SITE_OWNER || 'Guruvelah A S';
const ENABLE_TEST_ROUTES = process.env.ENABLE_TEST_ROUTES === 'true' || process.env.ENABLE_TEST_ROUTES === '1';

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper for HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* -------------------------------------------------------------
   PAGES
------------------------------------------------------------- */

// 1. Home Page (/)
app.get('/', (req, res) => {
  const content = `
    <section class="hero-section">
      <div class="hero-content">
        <span class="hero-pill">🚀 Portfolio &amp; Intelligent Assistant</span>
        <h1 class="hero-title">Engineering Reliable Web Systems &amp; Autonomous Agents</h1>
        <p class="hero-subtitle">
          Welcome to my portfolio! I am <strong>${escapeHtml(SITE_OWNER)}</strong>, a full-stack developer dedicated to building responsive web applications, robust SQL &amp; NoSQL architectures, and context-aware conversational assistants.
        </p>
        <div class="hero-actions">
          <a href="/about" class="btn btn-primary">About Me</a>
          <a href="/contact" class="btn btn-secondary">Open a Ticket</a>
          <button class="btn btn-accent open-chat-hero" onclick="window.openAssistant('How does the assistant work?')">💬 Ask Assistant</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Core Competencies</h2>
        <p class="section-desc">Technologies and architectural paradigms leveraged across this platform.</p>
      </div>
      <div class="skills-grid">
        <div class="skill-card">
          <div class="skill-icon">⚡</div>
          <h3>Full-Stack Node.js</h3>
          <p>Express REST APIs, structured request logging, robust error routing, and high-performance server-rendered layouts.</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">🗄️</div>
          <h3>Dual-Database Architecture</h3>
          <p>Transactional SQLite via <code>better-sqlite3</code> for relational data (FAQs, error codes, tickets) paired with MongoDB Atlas for telemetry and feedback.</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">🤖</div>
          <h3>Support Assistant</h3>
          <p>Multi-stage AI assistant with intelligent regex error-code lookups, FAQ fuzzy matching, automatic ticket escalation, and optional LLM fallback.</p>
        </div>
        <div class="skill-card">
          <div class="skill-icon">☁️</div>
          <h3>Cloud &amp; Resilient APIs</h3>
          <p>CI/CD deployment to Render with timeout-protected third-party integrations (Open-Meteo weather with fallback).</p>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Featured Projects</h2>
        <p class="section-desc">Practical systems engineered for performance and reliability.</p>
      </div>
      <div class="projects-grid">
        <article class="project-card">
          <div class="project-badge">Live System</div>
          <h3>AI-Powered Support Portal</h3>
          <p>A full-stack portfolio and support ticketing platform featuring a real-time conversational agent, SQLite schema with WAL mode, and remote MongoDB telemetry.</p>
          <div class="project-tags">
            <span>Node.js</span><span>Express</span><span>SQLite</span><span>MongoDB</span><span>Open-Meteo</span>
          </div>
          <div class="project-links">
            <a href="/faq" class="card-link">View FAQs &rarr;</a>
            <a href="/errors" class="card-link">Error Directory &rarr;</a>
          </div>
        </article>

        <article class="project-card">
          <div class="project-badge">Automation &amp; Agents</div>
          <h3>CampusCRS Course Registration Engine</h3>
          <p>A Django and Python enterprise registration service enforcing strict concurrency locks, automated prerequisite verification, and database auditing.</p>
          <div class="project-tags">
            <span>Python</span><span>Django</span><span>SQLite</span><span>Unit Testing</span>
          </div>
          <div class="project-links">
            <a href="https://github.com/guruvelah/campuscrs-django" target="_blank" rel="noopener noreferrer" class="card-link">GitHub Repository &rarr;</a>
          </div>
        </article>
      </div>
    </section>
  `;

  res.send(renderLayout({
    title: 'Home',
    currentPath: '/',
    siteOwner: SITE_OWNER,
    content
  }));
});

// 2. About Page (/about)
app.get('/about', (req, res) => {
  const content = `
    <section class="about-hero">
      <span class="hero-pill">👨‍💻 About Developer</span>
      <h1 class="hero-title">About ${escapeHtml(SITE_OWNER)}</h1>
      <p class="hero-subtitle">
        I am a passionate software engineer and computer science enthusiast specializing in full-stack architecture, systems programming, and artificial intelligence workflows.
      </p>
    </section>

    <div class="about-details-grid">
      <div class="about-card">
        <h2>Background &amp; Philosophy</h2>
        <p>
          My focus centers on delivering resilient, maintainable, and user-friendly digital experiences. Whether architecting relational SQLite schemas, connecting cloud NoSQL clusters on MongoDB Atlas, or developing responsive UIs that feel natural across desktop and mobile form factors, I prioritize clean design patterns, defensive programming, and zero-defect deployments.
        </p>
        <p>
          This website serves as a practical demonstration of these principles — combining transactional SQLite operations, automated ticket creation, real-time weather integration with fallback safety, and live telemetry tracking.
        </p>
      </div>

      <div class="about-card">
        <h2>Technical Arsenal</h2>
        <ul class="tech-list">
          <li><strong>Languages:</strong> JavaScript (ES6+), TypeScript, Python, C++, SQL, HTML5, CSS3</li>
          <li><strong>Backend Frameworks:</strong> Node.js, Express.js, Django, Fastify</li>
          <li><strong>Databases:</strong> SQLite (better-sqlite3), MongoDB &amp; MongoDB Atlas, PostgreSQL</li>
          <li><strong>DevOps &amp; Cloud:</strong> Render, GitHub Actions, Docker, Linux, Git</li>
          <li><strong>AI &amp; Automation:</strong> Prompt Engineering, Anthropic Claude API, Rule-based NLP, Automated Escalation</li>
        </ul>
      </div>
    </div>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Key Projects</h2>
      </div>
      <div class="projects-grid">
        <div class="project-card">
          <h3>Full-Stack Assistant Platform</h3>
          <p>Integrated Node.js + Express website featuring an interactive chat assistant on every page that indexes SQLite FAQs, diagnoses HTTP/app error codes, logs conversations to MongoDB Atlas, and generates support tickets.</p>
        </div>
        <div class="project-card">
          <h3>IoT Hardware &amp; Embedded Controller Interfacing</h3>
          <p>Firmware implementation and sensor data collection integrating Arduino, logic-gate breadboarding, and serial telemetry transmission.</p>
        </div>
      </div>
    </section>
  `;

  res.send(renderLayout({
    title: 'About',
    currentPath: '/about',
    siteOwner: SITE_OWNER,
    content
  }));
});

// 3. FAQs Page (/faq) - Exactly 12 items
app.get('/faq', (req, res) => {
  const faqs = db.getFaqs();
  const faqCards = faqs.map((faq, idx) => `
    <div class="faq-card" id="faq-${faq.id}">
      <div class="faq-category">${escapeHtml(faq.category || 'General')}</div>
      <h3 class="faq-question">Q${idx + 1}: ${escapeHtml(faq.question)}</h3>
      <p class="faq-answer">${escapeHtml(faq.answer)}</p>
      <button class="btn btn-sm btn-outline ask-faq-btn" onclick="window.openAssistant('${escapeHtml(faq.question)}')">Ask Assistant About This</button>
    </div>
  `).join('');

  const content = `
    <section class="section-header">
      <span class="hero-pill">📚 Knowledge Base</span>
      <h1 class="hero-title">Frequently Asked Questions</h1>
      <p class="section-desc">
        Browse our comprehensive database of <strong>${faqs.length}</strong> frequently asked questions stored in SQLite. Our AI assistant can also answer any of these queries in real time.
      </p>
    </section>

    <div class="faq-list">
      ${faqCards}
    </div>
  `;

  res.send(renderLayout({
    title: 'FAQs',
    currentPath: '/faq',
    siteOwner: SITE_OWNER,
    content
  }));
});

// 4. Error Codes Page (/errors) - Exactly 9 codes (400, 401, 403, 404, 429, 500, 503, APP-1001, APP-2001)
app.get('/errors', (req, res) => {
  const errorCodes = db.getErrorCodes();
  const tableRows = errorCodes.map(err => `
    <tr class="error-row">
      <td class="col-code"><span class="code-badge code-${err.status_code}">${escapeHtml(err.code)}</span></td>
      <td class="col-status"><strong>${err.status_code}</strong></td>
      <td class="col-title">${escapeHtml(err.title)}</td>
      <td class="col-desc">${escapeHtml(err.description)}</td>
      <td class="col-res">${escapeHtml(err.resolution)}</td>
      <td class="col-action">
        <button class="btn btn-xs btn-outline" onclick="window.openAssistant('What does ${escapeHtml(err.code)} mean?')">Ask</button>
      </td>
    </tr>
  `).join('');

  const cardList = errorCodes.map(err => `
    <div class="error-mobile-card">
      <div class="error-card-header">
        <span class="code-badge code-${err.status_code}">${escapeHtml(err.code)}</span>
        <span class="status-num">HTTP ${err.status_code}</span>
      </div>
      <h3 class="error-card-title">${escapeHtml(err.title)}</h3>
      <p class="error-card-desc"><strong>Description:</strong> ${escapeHtml(err.description)}</p>
      <p class="error-card-res"><strong>Resolution:</strong> ${escapeHtml(err.resolution)}</p>
      <button class="btn btn-sm btn-outline btn-block" onclick="window.openAssistant('What does ${escapeHtml(err.code)} mean?')">Ask Assistant About ${escapeHtml(err.code)}</button>
    </div>
  `).join('');

  const content = `
    <section class="section-header">
      <span class="hero-pill">⚠️ Diagnostic Directory</span>
      <h1 class="hero-title">System &amp; HTTP Error Codes</h1>
      <p class="section-desc">
        Comprehensive reference directory of <strong>${errorCodes.length}</strong> standardized HTTP and application error codes with diagnoses and resolution procedures.
      </p>
    </section>

    <!-- Desktop Table View -->
    <div class="table-responsive desktop-only">
      <table class="error-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>HTTP Status</th>
            <th>Title</th>
            <th>Description</th>
            <th>Recommended Resolution</th>
            <th>Assistant</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>

    <!-- Mobile Stacked Card View (activates on small screens) -->
    <div class="mobile-only error-cards-container">
      ${cardList}
    </div>
  `;

  res.send(renderLayout({
    title: 'Error Codes',
    currentPath: '/errors',
    siteOwner: SITE_OWNER,
    content
  }));
});

// 5. Contact Page (/contact)
app.get('/contact', (req, res) => {
  const content = `
    <section class="section-header">
      <span class="hero-pill">📬 Get In Touch</span>
      <h1 class="hero-title">Contact &amp; Support Ticketing</h1>
      <p class="section-desc">
        Have a question, collaboration inquiry, or support request? Fill out the form below to file a ticket directly in our SQLite database.
      </p>
    </section>

    <div class="contact-wrapper">
      <div class="contact-card">
        <form id="contact-form" class="contact-form">
          <div id="contact-alert" class="alert hidden"></div>

          <div class="form-group">
            <label for="contact-name">Your Full Name</label>
            <input type="text" id="contact-name" name="name" class="form-control" placeholder="e.g. Jane Doe" required>
          </div>

          <div class="form-group">
            <label for="contact-email">Email Address</label>
            <input type="email" id="contact-email" name="email" class="form-control" placeholder="e.g. jane@example.com" required>
          </div>

          <div class="form-group">
            <label for="contact-subject">Subject</label>
            <input type="text" id="contact-subject" name="subject" class="form-control" placeholder="e.g. Project Consultation" required>
          </div>

          <div class="form-group">
            <label for="contact-message">Message (Minimum 5 characters)</label>
            <textarea id="contact-message" name="message" rows="5" class="form-control" placeholder="Describe your inquiry or question in detail..." required></textarea>
            <small class="form-hint">Messages with fewer than 5 characters will trigger validation error APP-1001.</small>
          </div>

          <button type="submit" id="contact-submit-btn" class="btn btn-primary btn-block">Submit Support Ticket</button>
        </form>
      </div>

      <div class="contact-info-card">
        <h3>Direct Channels</h3>
        <p>Prefer connecting directly? Reach out through any of these avenues:</p>
        <ul class="contact-methods">
          <li><strong>Location:</strong> Chennai, Tamil Nadu, India</li>
          <li><strong>GitHub:</strong> <a href="https://github.com/guruvelah" target="_blank" rel="noopener noreferrer">github.com/guruvelah</a></li>
          <li><strong>Live Assistant:</strong> Available on every page via the floating chat widget</li>
          <li><strong>System Status:</strong> <a href="/status">Check service health</a></li>
        </ul>
      </div>
    </div>
  `;

  res.send(renderLayout({
    title: 'Contact',
    currentPath: '/contact',
    siteOwner: SITE_OWNER,
    content
  }));
});

// 6. Status Page (/status)
app.get('/status', async (req, res) => {
  const sqlHealth = db.checkDbHealth();
  const mongoStatus = await mongo.checkMongoHealth();
  const ticketCount = db.getTicketCount();
  const faqCount = db.getFaqs().length;
  const errorCount = db.getErrorCodes().length;

  const uptimeSec = process.uptime();
  const uptimeHours = Math.floor(uptimeSec / 3600);
  const uptimeMins = Math.floor((uptimeSec % 3600) / 60);

  const content = `
    <section class="section-header">
      <span class="hero-pill">📊 Telemetry</span>
      <h1 class="hero-title">System Status &amp; Metrics</h1>
      <p class="section-desc">
        Real-time health telemetry across server processes, SQLite transactional storage, and MongoDB telemetry collections.
      </p>
    </section>

    <div class="status-grid">
      <div class="status-card">
        <div class="status-indicator ${sqlHealth ? 'status-good' : 'status-bad'}"></div>
        <h3>SQLite Database</h3>
        <p class="status-label">Status: <strong>${sqlHealth ? 'OPERATIONAL' : 'DEGRADED'}</strong></p>
        <ul class="status-details">
          <li>Total FAQs indexed: <strong>${faqCount}</strong></li>
          <li>Total Error Codes: <strong>${errorCount}</strong></li>
          <li>Tickets created: <strong>${ticketCount}</strong></li>
          <li>Journal Mode: <strong>WAL</strong></li>
        </ul>
      </div>

      <div class="status-card">
        <div class="status-indicator ${mongoStatus === 'ok' ? 'status-good' : (mongoStatus === 'not_configured' ? 'status-warn' : 'status-bad')}"></div>
        <h3>MongoDB Atlas</h3>
        <p class="status-label">Status: <strong>${mongoStatus === 'ok' ? 'CONNECTED' : (mongoStatus === 'not_configured' ? 'NOT CONFIGURED' : 'ERROR')}</strong></p>
        <ul class="status-details">
          <li>Database Name: <strong>${escapeHtml(process.env.MONGODB_DB || 'support_assistant')}</strong></li>
          <li>Telemetry: <strong>chat_logs, feedback</strong></li>
          <li>Cluster Tier: <strong>MongoDB Atlas M0 Free Tier</strong></li>
        </ul>
      </div>

      <div class="status-card">
        <div class="status-indicator status-good"></div>
        <h3>Server Process</h3>
        <p class="status-label">Status: <strong>HEALTHY</strong></p>
        <ul class="status-details">
          <li>Uptime: <strong>${uptimeHours}h ${uptimeMins}m (${Math.floor(uptimeSec)}s)</strong></li>
          <li>Node.js Version: <strong>${process.version}</strong></li>
          <li>Memory Usage: <strong>${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB</strong></li>
          <li>Environment: <strong>${process.env.NODE_ENV || 'production'}</strong></li>
        </ul>
      </div>

      <div class="status-card">
        <div class="status-indicator status-good"></div>
        <h3>Weather Service</h3>
        <p class="status-label">Status: <strong>ACTIVE (3s Timeout)</strong></p>
        <ul class="status-details">
          <li>Provider: <strong>Open-Meteo REST API</strong></li>
          <li>Configured City: <strong>${escapeHtml(process.env.WEATHER_CITY || 'Chennai')}</strong></li>
          <li>Coordinates: <strong>${process.env.WEATHER_LAT || '13.0827'}, ${process.env.WEATHER_LON || '80.2707'}</strong></li>
          <li>Fallback Mode: <strong>Graceful degradation</strong></li>
        </ul>
      </div>
    </div>
  `;

  res.send(renderLayout({
    title: 'Status',
    currentPath: '/status',
    siteOwner: SITE_OWNER,
    content
  }));
});

/* -------------------------------------------------------------
   HEALTH & API ENDPOINTS
------------------------------------------------------------- */

// Health Check Endpoint: returns JSON
app.get('/health', async (req, res) => {
  const sqlOk = db.checkDbHealth();
  const mongoStatus = await mongo.checkMongoHealth();

  const isHealthy = sqlOk && (mongoStatus === 'ok' || mongoStatus === 'not_configured');

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    sql: sqlOk ? 'ok' : 'error',
    mongodb: mongoStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Weather API Endpoint: Open-Meteo with 3-second timeout and fallback
app.get('/api/weather', async (req, res) => {
  const city = process.env.WEATHER_CITY || 'Chennai';
  const lat = process.env.WEATHER_LAT || 13.0827;
  const lon = process.env.WEATHER_LON || 80.2707;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3-second strict timeout

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_weather || {};

    res.json({
      fallback: false,
      city,
      temperature: current.temperature,
      windspeed: current.windspeed,
      weathercode: current.weathercode,
      time: current.time,
      unit: '°C'
    });
  } catch (err) {
    console.warn('[Weather] Open-Meteo fetch failed or timed out:', err.message);
    res.json({
      fallback: true,
      city,
      temperature: 28.5,
      weathercode: 1,
      message: 'Weather data currently unavailable. Using fallback forecast.',
      unit: '°C'
    });
  }
});

// Chat Assistant API: answers FAQ, error codes, creates tickets
app.post('/api/chat', async (req, res) => {
  const message = req.body && req.body.message;
  const sessionId = (req.body && req.body.sessionId) || 'web-visitor';

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message string is required' });
  }

  try {
    const result = await assistant.handleMessage(message, sessionId);
    res.json(result);
  } catch (err) {
    console.error('[Assistant] Error handling query:', err);
    res.status(500).json({
      type: 'error',
      reply: 'An unexpected error occurred while processing your message.',
      error: err.message
    });
  }
});

// Feedback API: captures thumbs-up/down
app.post('/api/feedback', async (req, res) => {
  const { logId, rating, comment } = req.body || {};
  if (!rating || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'Valid rating ("up" or "down") is required.' });
  }

  const result = await mongo.saveFeedback({ logId, rating, comment });
  res.json(result);
});

// Support Tickets API: validates and persists tickets in SQLite
app.post('/api/tickets', (req, res) => {
  const { name, email, subject, message } = req.body || {};

  // Validation: message must be provided and have at least 5 characters
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'APP-1001',
      message: 'Message is too short or missing (minimum 5 characters required).'
    });
  }

  try {
    const ticket = db.createTicket({
      name: name ? String(name).trim() : 'Anonymous',
      email: email ? String(email).trim() : 'unspecified@example.com',
      subject: subject ? String(subject).trim() : 'General Inquiry',
      message: String(message).trim()
    });

    res.status(201).json({
      success: true,
      ticket
    });
  } catch (err) {
    console.error('[Tickets] Error creating ticket:', err);
    res.status(500).json({
      error: 'Failed to create ticket',
      code: '500',
      message: err.message
    });
  }
});

/* -------------------------------------------------------------
   TEST ROUTES (When ENABLE_TEST_ROUTES=true)
------------------------------------------------------------- */
if (ENABLE_TEST_ROUTES) {
  app.get('/trigger-500', (req, res, next) => {
    const err = new Error('Demonstration 500 error triggered via /trigger-500 route.');
    err.status = 500;
    next(err);
  });
}

/* -------------------------------------------------------------
   CUSTOM ERROR HANDLERS (404 and 500)
------------------------------------------------------------- */

// Custom 404 Handler
app.use((req, res) => {
  const content = `
    <section class="error-page-wrapper">
      <div class="error-page-card">
        <div class="error-num">404</div>
        <h1 class="error-page-title">Page Not Found</h1>
        <p class="error-page-message">
          The requested path <code>${escapeHtml(req.path)}</code> could not be found on this server. It may have moved or never existed.
        </p>
        <div class="error-page-actions">
          <a href="/" class="btn btn-primary">Return Home</a>
          <button id="ask-assistant-404" class="btn btn-accent" onclick="window.openAssistant('What does 404 mean?')">
            💬 Ask the assistant
          </button>
        </div>
      </div>
    </section>
  `;

  res.status(404).send(renderLayout({
    title: '404 - Not Found',
    currentPath: req.path,
    siteOwner: SITE_OWNER,
    content
  }));
});

// Custom 500 Handler
app.use((err, req, res, next) => {
  console.error('[Error 500]:', err.stack || err.message);

  const content = `
    <section class="error-page-wrapper">
      <div class="error-page-card">
        <div class="error-num error-num-500">500</div>
        <h1 class="error-page-title">Internal Server Error</h1>
        <p class="error-page-message">
          An unexpected situation arose on the server while attempting to process this request.
        </p>
        <div class="error-page-actions">
          <a href="/" class="btn btn-primary">Return Home</a>
          <button id="ask-assistant-500" class="btn btn-accent" onclick="window.openAssistant('What does 500 mean?')">
            💬 Ask the assistant
          </button>
        </div>
      </div>
    </section>
  `;

  res.status(500).send(renderLayout({
    title: '500 - Server Error',
    currentPath: req.path,
    siteOwner: SITE_OWNER,
    content
  }));
});

/* -------------------------------------------------------------
   SERVER START
------------------------------------------------------------- */
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Server operational on http://localhost:${PORT}`);
  console.log(`👤 Site Owner: ${SITE_OWNER}`);
  console.log(`🧪 Test Routes: ${ENABLE_TEST_ROUTES ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📁 SQLite Path: ${process.env.SQLITE_PATH || path.join(__dirname, 'data.sqlite')}`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
