# Personal website with an integrated AI assistant (FAQ, error codes, tickets)

> **Live Deployment:** [https://personal-assistant-website-2psi.onrender.com](https://personal-assistant-website-2psi.onrender.com)

A production-ready Node.js & Express personal website featuring an embedded AI support assistant, transactional SQLite relational storage (`better-sqlite3`), asynchronous MongoDB Atlas telemetry, and real-time Open-Meteo weather forecasting with graceful degradation.

---

## Architecture & Features

- **Front-End & Pages:**
  - Modern, responsive server-rendered layout with floating chat widget on every page (`/`, `/about`, `/faq`, `/errors`, `/contact`, `/status`).
  - Viewport-responsive design verified at mobile resolution (375 px) with no horizontal scroll and adaptive stacked card layouts.
  - Custom branded 404 and 500 error pages with interactive "Ask the assistant" buttons.
- **Transactional Relational Data (SQLite via `better-sqlite3`):**
  - `faqs`: 12 comprehensive questions and answers with categorization.
  - `error_codes`: 9 standardized and application error codes (400, 401, 403, 404, 429, 500, 503, APP-1001, APP-2001).
  - `tickets`: Persistent user support tickets with unique reference IDs.
- **Telemetry & Logging (MongoDB Atlas M0 Free Tier):**
  - `chat_logs`: Logs user prompts, assistant classifications, timestamps, and session IDs.
  - `feedback`: Records user ratings (thumbs-up / thumbs-down) linked to chat logs.
- **Conversational Assistant Engine (`assistant.js`):**
  - Regex-powered diagnostic classification for error codes (`type: "error_code"`).
  - Fuzzy keyword search across indexed knowledge base (`type: "faq"`).
  - Automated escalation to ticket generation when queries cannot be answered (`type: "ticket"`).
  - Optional integration with Anthropic Claude API via `ANTHROPIC_API_KEY` protected by a strict 6-second timeout and fallback logic.
- **Third-Party Weather Integration:**
  - Open-Meteo REST API integration via `/api/weather` protected by a 3-second timeout and fallback mode.
- **Observability & Diagnostics:**
  - Structured HTTP console request logging with response times.
  - `/health` endpoint returning JSON health state for databases and server process.
  - Visual `/status` telemetry dashboard.

---

## Local Setup & Execution

### 1. Prerequisites
- Node.js >= 18.0.0 (Node 20+ recommended)
- npm >= 9.0.0

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your variables inside `.env`:
```env
PORT=3000
SITE_OWNER="Guruvelah A S"
SQLITE_PATH="./data.sqlite"
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="support_assistant"
WEATHER_CITY="Chennai"
WEATHER_LAT=13.0827
WEATHER_LON=80.2707
ENABLE_TEST_ROUTES="true"
```

### 4. Run Server
```bash
npm start
```
The server will start on `http://localhost:3000`.

---

## Deployment (Render Web Service)

1. Connect your GitHub repository to [Render](https://render.com/).
2. Select **Web Service** with the following parameters:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
3. Add Environment Variables in Render's Dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `MONGODB_DB`: `support_assistant`
   - `SITE_OWNER`: `Guruvelah A S`
   - `WEATHER_CITY`: e.g. `Chennai`
   - `WEATHER_LAT`: `13.0827`
   - `WEATHER_LON`: `80.2707`
   - `ENABLE_TEST_ROUTES`: `true`
   - `SQLITE_PATH`: `./data.sqlite` (or mount a persistent disk for persistent tickets across restarts)
4. Trigger the deployment.

---

## Requirement Checklist

| Requirement | Description | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Multi-page Responsive Layout** | 3+ pages with floating chat widget on each page | PASS | `/`, `/about`, `/faq`, `/errors`, `/contact`, `/status` |
| **SQL Database (10+ FAQs)** | Stored in SQLite and rendered on FAQ page | PASS | 12 FAQs seeded and displayed at `/faq` |
| **SQL Error Codes (8+ codes)** | Including site-specific custom codes | PASS | 9 error codes (including `APP-1001` and `APP-2001`) at `/errors` |
| **Custom 404 & 500 Pages** | Branded error pages with "Ask the assistant" button | PASS | Verified on `/does-not-exist` and `/trigger-500` |
| **Intelligent Assistant** | Answers FAQs, explains errors, creates tickets | PASS | Regex code match, FAQ match, ticket fallback |
| **Dual Storage** | Relational tickets in SQLite; logs & feedback in MongoDB | PASS | `tickets` in SQLite, `chat_logs` & `feedback` in MongoDB Atlas |
| **Security & Secrets** | Secrets in `.env`, strictly git-ignored | PASS | `.gitignore` covers `.env`, `*.sqlite*`, `node_modules` |
| **Observability & APIs** | Health endpoint, request logging, Open-Meteo with 3s timeout | PASS | `/health` returns JSON; `/api/weather` handles fallback |
| **Documentation** | Setup guide, checklist, proposed improvement | PASS | Detailed README with deployment guide |

---

## Proposed Improvement

### Production Vector RAG & Streaming Token Generation (SSE)
While the current assistant architecture reliably resolves known FAQs and HTTP error codes using indexed database search and regex heuristics, the following architectural upgrades would elevate the system to enterprise scale:

1. **Vector Embeddings & Semantic Search (RAG):**
   - Ingest documentation, markdown articles, and historical support tickets into a vector store (such as MongoDB Atlas Vector Search or sqlite-vss).
   - Compute dense embeddings (e.g., using `text-embedding-3-small` or local ONNX models) to match user intent semantically rather than relying on exact keyword overlap.
2. **Server-Sent Events (SSE) Streaming:**
   - Implement response streaming over Server-Sent Events (`text/event-stream`) so assistant replies stream token-by-token directly to the client interface, eliminating perceived latency for multi-paragraph explanations.
3. **Admin Ticketing & Moderation Dashboard:**
   - Build a protected `/admin` portal allowing the site administrator to view open tickets, update ticket statuses from `open` to `resolved`, and review user feedback metrics.
