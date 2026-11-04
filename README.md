# Personal website with an integrated AI assistant (Django rewrite)

A production-ready **Django** personal website featuring an embedded AI support assistant, transactional SQLite relational storage (Django ORM), asynchronous MongoDB Atlas telemetry, and real-time Open-Meteo weather forecasting with graceful degradation.

> This is a full rewrite of the original Node.js/Express version of this project onto Django, preserving the exact same URL contract, JSON API shapes, and UI so the same black-box test suite (`test_suite.js`) passes against either backend.

---

## Architecture & Features

- **Front-End & Pages (Django templates):**
  - Modern, responsive server-rendered layout with a floating chat widget on every page (`/`, `/about`, `/faq`, `/errors`, `/contact`, `/status`, `/admin/tickets`).
  - Viewport-responsive design verified at mobile resolution (375 px) with no horizontal scroll and adaptive stacked card layouts.
  - Custom branded 404 and 500 error pages (Django `handler404`/`handler500`) with interactive "Ask the assistant" buttons.
  - `/admin/tickets`: full CRUD ticket management UI (update status inline, delete) backed by the REST API below.
- **Transactional Relational Data (SQLite via the Django ORM):**
  - `Faq`: 12 comprehensive questions and answers with categorization, served on `/faq` and via `GET /api/faqs`.
  - `ErrorCode`: 9 standardized and application error codes (400, 401, 403, 404, 429, 500, 503, APP-1001, APP-2001), served on `/errors` and via `GET /api/errors`.
  - `Ticket`: persistent user support tickets with unique reference IDs, exposed through a full CRUD REST API. Seeded via a Django data migration (`siteapp/migrations/0002_seed_data.py`).
- **Telemetry & Logging (MongoDB Atlas M0 Free Tier, via `pymongo`):**
  - `chat_logs`: logs user prompts, assistant classifications, timestamps, and session IDs.
  - `feedback`: records user ratings (thumbs-up / thumbs-down) linked to chat logs.
- **Conversational Assistant Engine (`siteapp/assistant.py`):**
  - Regex-powered diagnostic classification for error codes.
  - Fuzzy keyword search across the FAQ knowledge base.
  - Automated escalation to ticket generation when queries cannot be answered.
  - Optional integration with the Anthropic Claude API via `ANTHROPIC_API_KEY`, protected by a strict 6-second timeout and fallback logic.
- **Third-Party Weather Integration:**
  - Open-Meteo REST API integration via `/api/weather`, protected by a 3-second timeout and fallback mode.
- **Observability & Diagnostics:**
  - Structured HTTP request logging middleware (`siteapp/middleware.py`) with response times.
  - `/health` endpoint returning JSON health state for SQLite, MongoDB, and the server process.
  - Visual `/status` telemetry dashboard.

---

## Local Setup & Execution

### 1. Prerequisites
- Python >= 3.11
- pip

### 2. Installation
```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```env
PORT=8000
DEBUG=False
DJANGO_SECRET_KEY="a-random-secret-value"
ALLOWED_HOSTS="*"
SITE_OWNER="Your Name"
DJANGO_SQLITE_PATH="./db.sqlite3"
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB="support_assistant"
WEATHER_CITY="Chennai"
WEATHER_LAT=13.0827
WEATHER_LON=80.2707
ENABLE_TEST_ROUTES="true"
```

> `DEBUG` defaults to `False` on purpose — Django's custom `handler404`/`handler500` (the branded error pages) only fire when `DEBUG=False`.

### 4. Migrate & Run
```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```
The server starts on `http://localhost:8000`. The first `migrate` run also seeds the 12 FAQs and 9 error codes via a data migration.

### 5. Run the verification suite
```bash
node test_suite.js
```
32 black-box checks covering every page, the assistant, full ticket CRUD, the FAQ/error JSON API, and the weather endpoint.

---

## Deployment (Render Web Service — Python environment)

1. Connect your GitHub repository to [Render](https://render.com/).
2. Select **Web Service** with:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command:** `python manage.py migrate --noinput && gunicorn config.wsgi --log-file -` (also provided as the `Procfile`)
   - **Plan:** `Free`
3. Add Environment Variables in Render's Dashboard (same list as `.env` above), plus:
   - `ALLOWED_HOSTS`: your Render domain, e.g. `your-app.onrender.com`
4. Trigger the deployment.

> Render's Python runtime is a **separate service type** from the original Node.js deployment — you cannot change an existing Node Web Service's runtime in place. Either create a new Python Web Service, or delete/recreate the existing one pointed at this Django code.

---

## API Reference

| Method | Route | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/faqs` | Returns all FAQs from SQLite as JSON (`{ count, faqs[] }`) |
| `GET` | `/api/errors` | Returns all error codes from SQLite as JSON (`{ count, errors[] }`) |
| `POST` | `/api/chat` | Sends a message to the assistant (FAQ / error code / ticket fallback) |
| `POST` | `/api/feedback` | Records a thumbs-up/down rating against a chat log in MongoDB |
| `POST` | `/api/tickets` | **Create** a ticket (name, email, subject, message) |
| `GET` | `/api/tickets` | **Read** all tickets, optional `?status=open\|in_progress\|resolved` filter and `?limit=` |
| `GET` | `/api/tickets/:id` | **Read** a single ticket by id |
| `PATCH` | `/api/tickets/:id` | **Update** a ticket's status/subject/message |
| `DELETE` | `/api/tickets/:id` | **Delete** a ticket permanently |
| `GET` | `/api/weather` | Open-Meteo forecast with 3s timeout and graceful fallback |
| `GET` | `/health` | JSON health report for SQLite, MongoDB and the server process |

The `/admin/tickets` page is a visual client for the ticket CRUD API: it lists every ticket, lets you change status inline (dropdown → `PATCH`), and delete a ticket (`DELETE`) after a confirmation prompt.

---

## Requirement Checklist

| Requirement | Description | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Multi-page Responsive Layout** | 3+ pages with floating chat widget on each page | PASS | `/`, `/about`, `/faq`, `/errors`, `/contact`, `/status`, `/admin/tickets` |
| **SQL Database (10+ FAQs) via API** | Stored in SQLite (Django ORM), rendered on FAQ page and served as JSON | PASS | 12 FAQs seeded, displayed at `/faq`, served at `GET /api/faqs` |
| **SQL Error Codes (8+ codes) via API** | Including site-specific custom codes | PASS | 9 error codes (including `APP-1001` and `APP-2001`) at `/errors` and `GET /api/errors` |
| **Custom 404 & 500 Pages** | Branded error pages with "Ask the assistant" button | PASS | Django `handler404`/`handler500`, verified on `/does-not-exist` and `/trigger-500` |
| **Intelligent Assistant** | Answers FAQs, explains errors, creates tickets | PASS | Regex code match, FAQ match, ticket fallback |
| **Ticket CRUD** | Tickets created automatically when the assistant is unsure, with full Create/Read/Update/Delete | PASS | `POST/GET/PATCH/DELETE /api/tickets`, visual CRUD UI at `/admin/tickets` |
| **Dual Storage** | Relational tickets in SQLite; logs & feedback in MongoDB | PASS | `Ticket` model in SQLite, `chat_logs` & `feedback` in MongoDB Atlas |
| **Security & Secrets** | Secrets in `.env`, strictly git-ignored | PASS | `.gitignore` covers `.env`, `db.sqlite3`, `venv/` |
| **Observability & APIs** | Health endpoint, request logging, Open-Meteo with 3s timeout | PASS | `/health` returns JSON; `/api/weather` handles fallback |
| **Documentation** | Setup guide, checklist, proposed improvement | PASS | This README |

---

## Proposed Improvement

### Production Vector RAG & Streaming Token Generation (SSE)
While the current assistant architecture reliably resolves known FAQs and HTTP error codes using indexed database search and regex heuristics, the following upgrades would elevate the system to enterprise scale:

1. **Vector Embeddings & Semantic Search (RAG):**
   - Ingest documentation and historical support tickets into a vector store (MongoDB Atlas Vector Search or `pgvector`).
   - Compute dense embeddings to match user intent semantically rather than relying on exact keyword overlap.
2. **Server-Sent Events (SSE) Streaming:**
   - Stream assistant replies token-by-token via Django's `StreamingHttpResponse`, eliminating perceived latency for multi-paragraph explanations.
3. **Authenticated Admin Access:**
   - Protect `/admin/tickets` behind Django's auth system (re-enabling `django.contrib.auth`) before handling real user data in production.
