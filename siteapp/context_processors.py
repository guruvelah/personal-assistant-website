from django.conf import settings

NAV_ITEMS = [
    {"label": "Home", "path": "/"},
    {"label": "About", "path": "/about"},
    {"label": "FAQs", "path": "/faq"},
    {"label": "Error Codes", "path": "/errors"},
    {"label": "Contact", "path": "/contact"},
    {"label": "Status", "path": "/status"},
]


def site_context(request):
    current_path = request.path
    nav_items = [
        {**item, "active": item["path"] == current_path} for item in NAV_ITEMS
    ]
    return {
        "site_owner": settings.SITE_OWNER,
        "weather_city": settings.WEATHER_CITY,
        "nav_items": nav_items,
        "current_path": current_path,
    }
