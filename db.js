const path = require('path');
const fs = require('fs');

const sqlitePath = process.env.SQLITE_PATH || path.join(__dirname, 'data.sqlite');

// Ensure directory exists if sqlitePath is nested
const dbDir = path.dirname(path.resolve(sqlitePath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
  const BetterSqlite = require('better-sqlite3');
  db = new BetterSqlite(sqlitePath);
  db.pragma('journal_mode = WAL');
  console.log('[SQLite] Connected via better-sqlite3');
} catch (err) {
  // Graceful fallback to Node's built-in synchronous SQLite driver (node:sqlite)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const rawDb = new DatabaseSync(sqlitePath);
    try {
      rawDb.exec('PRAGMA journal_mode = WAL;');
    } catch (_) {}

    db = {
      exec: (sql) => rawDb.exec(sql),
      prepare: (sql) => {
        const stmt = rawDb.prepare(sql);
        return {
          all: (...args) => stmt.all(...args),
          get: (...args) => stmt.get(...args),
          run: (...args) => {
            const res = stmt.run(...args);
            return {
              changes: res.changes,
              lastInsertRowid: res.lastInsertRowid
            };
          }
        };
      },
      pragma: (cmd) => {
        try { rawDb.exec(`PRAGMA ${cmd};`); } catch (_) {}
      },
      transaction: (fn) => {
        return (...args) => {
          rawDb.exec('BEGIN TRANSACTION;');
          try {
            const result = fn(...args);
            rawDb.exec('COMMIT;');
            return result;
          } catch (e) {
            rawDb.exec('ROLLBACK;');
            throw e;
          }
        };
      }
    };
    console.log('[SQLite] Connected via built-in node:sqlite (DatabaseSync)');
  } catch (err2) {
    console.error('[SQLite] Failed to initialize SQLite database:', err.message, err2.message);
    throw err;
  }
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General'
  );

  CREATE TABLE IF NOT EXISTS error_codes (
    code TEXT PRIMARY KEY,
    status_code INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT 'Anonymous',
    email TEXT DEFAULT 'unspecified@example.com',
    subject TEXT DEFAULT 'General Inquiry',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 12 Required FAQs
const defaultFaqs = [
  {
    question: "How does the assistant work?",
    answer: "The assistant uses intelligent keyword matching and database search across our curated FAQs and HTTP/application error codes. If an inquiry cannot be answered automatically, it seamlessly generates a support ticket for personal follow-up.",
    category: "Assistant"
  },
  {
    question: "Who is the site owner?",
    answer: "This website belongs to Guruvelah A S, a dedicated full-stack developer and AI systems engineer focused on building robust, scalable web platforms and intelligent agents.",
    category: "About"
  },
  {
    question: "What technology stack is used here?",
    answer: "The platform is built with Node.js, Express, SQLite (via better-sqlite3 / node:sqlite) for transactional relational data, MongoDB Atlas for conversation logging and telemetry, and integrates Open-Meteo for real-time weather forecasting.",
    category: "Architecture"
  },
  {
    question: "How do I create a support ticket?",
    answer: "You can submit a message via the Contact page form, or simply ask a unique question in the chat assistant that cannot be resolved from the knowledge base — the assistant will automatically file a ticket for you.",
    category: "Support"
  },
  {
    question: "What error codes does the assistant understand?",
    answer: "The system catalogs standard HTTP status codes (400, 401, 403, 404, 429, 500, 503) along with custom application codes such as APP-1001 (validation error) and APP-2001 (rate limit exceeded).",
    category: "Errors"
  },
  {
    question: "How does the weather integration work?",
    answer: "The /api/weather endpoint fetches live meteorological conditions from the Open-Meteo REST API using a strict 3-second timeout and serves a graceful fallback forecast if external requests degrade.",
    category: "Services"
  },
  {
    question: "Where are chat logs and feedback stored?",
    answer: "Every conversation exchange and user thumbs-up/down rating is logged asynchronously into MongoDB Atlas collections ('chat_logs' and 'feedback') for analytics and continuous improvement.",
    category: "Data"
  },
  {
    question: "Is my personal data safe?",
    answer: "Absolutely. No personal information or session telemetry is sold or shared. All sensitive environment secrets are kept strictly out of source control and secured in production vault configurations.",
    category: "Security"
  },
  {
    question: "Can the assistant utilize an external LLM?",
    answer: "Yes, if an ANTHROPIC_API_KEY is supplied in the server environment, the assistant can escalate queries to Anthropic Claude models with a 6-second timeout before falling back to local database indexing.",
    category: "Assistant"
  },
  {
    question: "How can I collaborate or hire the site owner?",
    answer: "Reach out via the Contact page or connect on GitHub. Whether you have questions regarding full-stack software development, cloud infrastructure, or AI automation, inquiries are warmly welcomed.",
    category: "Contact"
  },
  {
    question: "How is application health monitored?",
    answer: "The /health endpoint returns structured JSON reporting the operational readiness of SQLite and MongoDB. The /status page renders visual indicators for uptime and database connections.",
    category: "DevOps"
  },
  {
    question: "Where is this website hosted?",
    answer: "This application is hosted on Render's cloud platform as a containerized Node.js web service, leveraging automated deployment pipelines synchronized with GitHub.",
    category: "Deployment"
  }
];

// 9 Required Error Codes (including APP-1001 and APP-2001)
const defaultErrorCodes = [
  {
    code: "400",
    status_code: 400,
    title: "Bad Request",
    description: "The server could not understand the request due to invalid syntax or missing required parameters.",
    resolution: "Double-check the request body formatting, required fields, and data types before retrying."
  },
  {
    code: "401",
    status_code: 401,
    title: "Unauthorized",
    description: "Authentication credentials were missing or invalid for accessing the target resource.",
    resolution: "Provide valid authentication credentials, API tokens, or login session cookies."
  },
  {
    code: "403",
    status_code: 403,
    title: "Forbidden",
    description: "The server understood the request but refuses to authorize access regardless of authentication.",
    resolution: "Verify whether your user role or access key has permission to view or manipulate this resource."
  },
  {
    code: "404",
    status_code: 404,
    title: "Not Found",
    description: "The requested route or resource could not be located on the server.",
    resolution: "Inspect the URL path for typographical errors or navigate back to the home page."
  },
  {
    code: "429",
    status_code: 429,
    title: "Too Many Requests",
    description: "The client has submitted too many requests within a given time window, exceeding the allowed threshold.",
    resolution: "Back off and wait before resubmitting. Implement rate-limiting jitter in automated scripts."
  },
  {
    code: "500",
    status_code: 500,
    title: "Internal Server Error",
    description: "An unexpected condition was encountered on the server that prevented fulfillment of the request.",
    resolution: "Review server error logs, report the ticket number if available, and retry after a brief pause."
  },
  {
    code: "503",
    status_code: 503,
    title: "Service Unavailable",
    description: "The server is temporarily overloaded or undergoing maintenance and cannot handle the request right now.",
    resolution: "Check the /status dashboard for maintenance notices and try again shortly."
  },
  {
    code: "APP-1001",
    status_code: 400,
    title: "Validation Error",
    description: "The message or payload submitted to the ticket or inquiry API is too brief or fails validation rules.",
    resolution: "Provide a descriptive message of at least 5 characters along with valid contact information."
  },
  {
    code: "APP-2001",
    status_code: 429,
    title: "Support Spam Protection",
    description: "Multiple support tickets or rapid-fire chat requests were detected from the same client session.",
    resolution: "Please allow 60 seconds between submitting inquiries so our assistant and team can assist you."
  }
];

// Seed faqs if empty
const faqCount = db.prepare("SELECT COUNT(*) AS count FROM faqs").get().count;
if (faqCount === 0) {
  const insertFaq = db.prepare("INSERT INTO faqs (question, answer, category) VALUES (?, ?, ?)");
  const insertMany = db.transaction((faqs) => {
    for (const f of faqs) insertFaq.run(f.question, f.answer, f.category);
  });
  insertMany(defaultFaqs);
}

// Seed error_codes if empty
const errCount = db.prepare("SELECT COUNT(*) AS count FROM error_codes").get().count;
if (errCount === 0) {
  const insertErr = db.prepare("INSERT INTO error_codes (code, status_code, title, description, resolution) VALUES (?, ?, ?, ?, ?)");
  const insertMany = db.transaction((errs) => {
    for (const e of errs) insertErr.run(e.code, e.status_code, e.title, e.description, e.resolution);
  });
  insertMany(defaultErrorCodes);
}

// Helper methods
function getFaqs() {
  return db.prepare("SELECT * FROM faqs ORDER BY id ASC").all();
}

function getErrorCodes() {
  return db.prepare("SELECT * FROM error_codes ORDER BY status_code ASC, code ASC").all();
}

function getErrorCode(code) {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  return db.prepare("SELECT * FROM error_codes WHERE UPPER(code) = ?").get(clean) || null;
}

function searchFaq(query) {
  if (!query) return null;
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const all = getFaqs();
  if (terms.length === 0) return null;

  let bestMatch = null;
  let highestScore = 0;

  for (const item of all) {
    const qLower = item.question.toLowerCase();
    const aLower = item.answer.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (qLower.includes(term)) score += 3;
      if (aLower.includes(term)) score += 1;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // Require at least 2 points to be considered a genuine match
  return highestScore >= 2 ? bestMatch : null;
}

function createTicket({ name, email, subject, message }) {
  const ticketNumber = `TICK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
  const stmt = db.prepare(`
    INSERT INTO tickets (ticket_number, name, email, subject, message, status)
    VALUES (?, ?, ?, ?, ?, 'open')
  `);
  const info = stmt.run(
    ticketNumber,
    name || 'Anonymous',
    email || 'unspecified@example.com',
    subject || 'Support Ticket',
    message
  );
  return {
    id: info.lastInsertRowid,
    ticket_number: ticketNumber,
    name: name || 'Anonymous',
    email: email || 'unspecified@example.com',
    subject: subject || 'Support Ticket',
    message,
    status: 'open'
  };
}

function getTickets(limit = 50) {
  return db.prepare("SELECT * FROM tickets ORDER BY id DESC LIMIT ?").all(limit);
}

function getTicketCount() {
  return db.prepare("SELECT COUNT(*) AS count FROM tickets").get().count;
}

function checkDbHealth() {
  try {
    const row = db.prepare("SELECT 1 AS ok").get();
    return row && (row.ok === 1 || row.ok === 1n);
  } catch (err) {
    console.error("SQLite health check failed:", err.message);
    return false;
  }
}

module.exports = {
  db,
  getFaqs,
  getErrorCodes,
  getErrorCode,
  searchFaq,
  createTicket,
  getTickets,
  getTicketCount,
  checkDbHealth
};
