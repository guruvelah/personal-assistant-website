from django.db import migrations

DEFAULT_FAQS = [
    {
        "question": "How does the assistant work?",
        "answer": "The assistant uses intelligent keyword matching and database search across our curated FAQs and HTTP/application error codes. If an inquiry cannot be answered automatically, it seamlessly generates a support ticket for personal follow-up.",
        "category": "Assistant",
    },
    {
        "question": "Who is the site owner?",
        "answer": "This website belongs to Guruvelah A S, a dedicated full-stack developer and AI systems engineer focused on building robust, scalable web platforms and intelligent agents.",
        "category": "About",
    },
    {
        "question": "What technology stack is used here?",
        "answer": "The platform is built with Django (Python), SQLite via the Django ORM for transactional relational data, MongoDB Atlas for conversation logging and telemetry, and integrates Open-Meteo for real-time weather forecasting.",
        "category": "Architecture",
    },
    {
        "question": "How do I create a support ticket?",
        "answer": "You can submit a message via the Contact page form, or simply ask a unique question in the chat assistant that cannot be resolved from the knowledge base — the assistant will automatically file a ticket for you.",
        "category": "Support",
    },
    {
        "question": "What error codes does the assistant understand?",
        "answer": "The system catalogs standard HTTP status codes (400, 401, 403, 404, 429, 500, 503) along with custom application codes such as APP-1001 (validation error) and APP-2001 (rate limit exceeded).",
        "category": "Errors",
    },
    {
        "question": "How does the weather integration work?",
        "answer": "The /api/weather endpoint fetches live meteorological conditions from the Open-Meteo REST API using a strict 3-second timeout and serves a graceful fallback forecast if external requests degrade.",
        "category": "Services",
    },
    {
        "question": "Where are chat logs and feedback stored?",
        "answer": "Every conversation exchange and user thumbs-up/down rating is logged asynchronously into MongoDB Atlas collections ('chat_logs' and 'feedback') for analytics and continuous improvement.",
        "category": "Data",
    },
    {
        "question": "Is my personal data safe?",
        "answer": "Absolutely. No personal information or session telemetry is sold or shared. All sensitive environment secrets are kept strictly out of source control and secured in production vault configurations.",
        "category": "Security",
    },
    {
        "question": "Can the assistant utilize an external LLM?",
        "answer": "Yes, if an ANTHROPIC_API_KEY is supplied in the server environment, the assistant can escalate queries to Anthropic Claude models with a 6-second timeout before falling back to local database indexing.",
        "category": "Assistant",
    },
    {
        "question": "How can I collaborate or hire the site owner?",
        "answer": "Reach out via the Contact page or connect on GitHub. Whether you have questions regarding full-stack software development, cloud infrastructure, or AI automation, inquiries are warmly welcomed.",
        "category": "Contact",
    },
    {
        "question": "How is application health monitored?",
        "answer": "The /health endpoint returns structured JSON reporting the operational readiness of SQLite and MongoDB. The /status page renders visual indicators for uptime and database connections.",
        "category": "DevOps",
    },
    {
        "question": "Where is this website hosted?",
        "answer": "This application is hosted on Render's cloud platform as a containerized Django/Python web service, leveraging automated deployment pipelines synchronized with GitHub.",
        "category": "Deployment",
    },
]

DEFAULT_ERROR_CODES = [
    {
        "code": "400",
        "status_code": 400,
        "title": "Bad Request",
        "description": "The server could not understand the request due to invalid syntax or missing required parameters.",
        "resolution": "Double-check the request body formatting, required fields, and data types before retrying.",
    },
    {
        "code": "401",
        "status_code": 401,
        "title": "Unauthorized",
        "description": "Authentication credentials were missing or invalid for accessing the target resource.",
        "resolution": "Provide valid authentication credentials, API tokens, or login session cookies.",
    },
    {
        "code": "403",
        "status_code": 403,
        "title": "Forbidden",
        "description": "The server understood the request but refuses to authorize access regardless of authentication.",
        "resolution": "Verify whether your user role or access key has permission to view or manipulate this resource.",
    },
    {
        "code": "404",
        "status_code": 404,
        "title": "Not Found",
        "description": "The requested route or resource could not be located on the server.",
        "resolution": "Inspect the URL path for typographical errors or navigate back to the home page.",
    },
    {
        "code": "429",
        "status_code": 429,
        "title": "Too Many Requests",
        "description": "The client has submitted too many requests within a given time window, exceeding the allowed threshold.",
        "resolution": "Back off and wait before resubmitting. Implement rate-limiting jitter in automated scripts.",
    },
    {
        "code": "500",
        "status_code": 500,
        "title": "Internal Server Error",
        "description": "An unexpected condition was encountered on the server that prevented fulfillment of the request.",
        "resolution": "Review server error logs, report the ticket number if available, and retry after a brief pause.",
    },
    {
        "code": "503",
        "status_code": 503,
        "title": "Service Unavailable",
        "description": "The server is temporarily overloaded or undergoing maintenance and cannot handle the request right now.",
        "resolution": "Check the /status dashboard for maintenance notices and try again shortly.",
    },
    {
        "code": "APP-1001",
        "status_code": 400,
        "title": "Validation Error",
        "description": "The message or payload submitted to the ticket or inquiry API is too brief or fails validation rules.",
        "resolution": "Provide a descriptive message of at least 5 characters along with valid contact information.",
    },
    {
        "code": "APP-2001",
        "status_code": 429,
        "title": "Support Spam Protection",
        "description": "Multiple support tickets or rapid-fire chat requests were detected from the same client session.",
        "resolution": "Please allow 60 seconds between submitting inquiries so our assistant and team can assist you.",
    },
]


def seed_data(apps, schema_editor):
    Faq = apps.get_model("siteapp", "Faq")
    ErrorCode = apps.get_model("siteapp", "ErrorCode")

    if not Faq.objects.exists():
        Faq.objects.bulk_create([Faq(**f) for f in DEFAULT_FAQS])

    if not ErrorCode.objects.exists():
        ErrorCode.objects.bulk_create([ErrorCode(**e) for e in DEFAULT_ERROR_CODES])


def unseed_data(apps, schema_editor):
    Faq = apps.get_model("siteapp", "Faq")
    ErrorCode = apps.get_model("siteapp", "ErrorCode")
    Faq.objects.filter(question__in=[f["question"] for f in DEFAULT_FAQS]).delete()
    ErrorCode.objects.filter(code__in=[e["code"] for e in DEFAULT_ERROR_CODES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("siteapp", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_data, reverse_code=unseed_data),
    ]
