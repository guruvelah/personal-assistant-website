import json
import time

import requests
from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from . import assistant, mongo
from .models import ErrorCode, Faq, Ticket
from .tickets import create_ticket

VALID_TICKET_STATUSES = [choice[0] for choice in Ticket.STATUS_CHOICES]
_PROCESS_START = time.monotonic()


# -----------------------------------------------------------------
# PAGES
# -----------------------------------------------------------------

def home(request):
    return render(request, "home.html", {"title": "Home"})


def about(request):
    return render(request, "about.html", {"title": "About"})


def faq_page(request):
    faqs = Faq.objects.all()
    return render(request, "faq.html", {"title": "FAQs", "faqs": faqs})


def errors_page(request):
    error_codes = ErrorCode.objects.all()
    return render(request, "errors.html", {"title": "Error Codes", "error_codes": error_codes})


def contact_page(request):
    return render(request, "contact.html", {"title": "Contact"})


def status_page(request):
    sql_health = True
    try:
        Faq.objects.exists()
    except Exception:
        sql_health = False

    mongo_status = mongo.check_mongo_health()
    ticket_count = Ticket.objects.count()
    faq_count = Faq.objects.count()
    error_count = ErrorCode.objects.count()

    uptime_sec = time.monotonic() - _PROCESS_START
    uptime_hours = int(uptime_sec // 3600)
    uptime_mins = int((uptime_sec % 3600) // 60)

    return render(request, "status.html", {
        "title": "Status",
        "sql_health": sql_health,
        "mongo_status": mongo_status,
        "ticket_count": ticket_count,
        "faq_count": faq_count,
        "error_count": error_count,
        "mongodb_db": settings.MONGODB_DB,
        "weather_lat": settings.WEATHER_LAT,
        "weather_lon": settings.WEATHER_LON,
        "uptime_hours": uptime_hours,
        "uptime_mins": uptime_mins,
        "uptime_sec": int(uptime_sec),
    })


def admin_tickets_page(request):
    tickets = Ticket.objects.all()[:100]
    return render(request, "admin_tickets.html", {"title": "Ticket Management", "tickets": tickets})


# -----------------------------------------------------------------
# HEALTH & API ENDPOINTS
# -----------------------------------------------------------------

def health(request):
    sql_ok = True
    try:
        Faq.objects.exists()
    except Exception:
        sql_ok = False

    mongo_status = mongo.check_mongo_health()
    is_healthy = sql_ok and mongo_status in ("ok", "not_configured")

    return JsonResponse({
        "status": "ok" if is_healthy else "degraded",
        "sql": "ok" if sql_ok else "error",
        "mongodb": mongo_status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime": round(time.monotonic() - _PROCESS_START, 3),
    }, status=200 if is_healthy else 503)


def api_weather(request):
    city = settings.WEATHER_CITY
    lat = settings.WEATHER_LAT
    lon = settings.WEATHER_LON

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&current_weather=true"
        )
        response = requests.get(url, timeout=3)
        if not response.ok:
            raise requests.RequestException(f"Open-Meteo HTTP {response.status_code}")

        data = response.json()
        current = data.get("current_weather", {})
        return JsonResponse({
            "fallback": False,
            "city": city,
            "temperature": current.get("temperature"),
            "windspeed": current.get("windspeed"),
            "weathercode": current.get("weathercode"),
            "time": current.get("time"),
            "unit": "°C",
        })
    except requests.RequestException as err:
        print(f"[Weather] Open-Meteo fetch failed or timed out: {err}")
        return JsonResponse({
            "fallback": True,
            "city": city,
            "temperature": 28.5,
            "weathercode": 1,
            "message": "Weather data currently unavailable. Using fallback forecast.",
            "unit": "°C",
        })


@csrf_exempt
@require_http_methods(["POST"])
def api_chat(request):
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        body = {}

    message = body.get("message")
    session_id = body.get("sessionId") or "web-visitor"

    if not message or not isinstance(message, str):
        return JsonResponse({"error": "Message string is required"}, status=400)

    try:
        result = assistant.handle_message(message, session_id)
        return JsonResponse(result)
    except Exception as err:
        print(f"[Assistant] Error handling query: {err}")
        return JsonResponse({
            "type": "error",
            "reply": "An unexpected error occurred while processing your message.",
            "error": str(err),
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def api_feedback(request):
    try:
        body = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        body = {}

    rating = body.get("rating")
    if rating not in ("up", "down"):
        return JsonResponse({"error": 'Valid rating ("up" or "down") is required.'}, status=400)

    result = mongo.save_feedback(body.get("logId"), rating, body.get("comment"))
    return JsonResponse(result)


def api_faqs(request):
    faqs = list(Faq.objects.values("id", "question", "answer", "category"))
    return JsonResponse({"count": len(faqs), "faqs": faqs})


def api_errors(request):
    errors = list(ErrorCode.objects.values("code", "status_code", "title", "description", "resolution"))
    return JsonResponse({"count": len(errors), "errors": errors})


@csrf_exempt
def api_tickets(request):
    if request.method == "POST":
        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            body = {}

        message = body.get("message")
        if not message or not isinstance(message, str) or len(message.strip()) < 5:
            return JsonResponse({
                "error": "Validation failed",
                "code": "APP-1001",
                "message": "Message is too short or missing (minimum 5 characters required).",
            }, status=400)

        ticket = create_ticket(
            name=str(body.get("name") or "Anonymous").strip(),
            email=str(body.get("email") or "unspecified@example.com").strip(),
            subject=str(body.get("subject") or "General Inquiry").strip(),
            message=message.strip(),
        )
        return JsonResponse({"success": True, "ticket": ticket.to_dict()}, status=201)

    if request.method == "GET":
        status = request.GET.get("status")
        try:
            limit = min(int(request.GET.get("limit") or 50), 200)
        except (TypeError, ValueError):
            limit = 50

        if status and status not in VALID_TICKET_STATUSES:
            return JsonResponse({
                "error": "Invalid status filter",
                "code": "APP-1001",
                "message": f"Status must be one of: {', '.join(VALID_TICKET_STATUSES)}",
            }, status=400)

        qs = Ticket.objects.all()
        if status:
            qs = qs.filter(status=status)
        tickets = [t.to_dict() for t in qs[:limit]]
        return JsonResponse({"count": len(tickets), "tickets": tickets})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_ticket_detail(request, ticket_id):
    ticket = Ticket.objects.filter(id=ticket_id).first()

    if request.method == "GET":
        if not ticket:
            return JsonResponse({"error": "Ticket not found", "code": "404"}, status=404)
        return JsonResponse({"ticket": ticket.to_dict()})

    if request.method == "PATCH":
        if not ticket:
            return JsonResponse({"error": "Ticket not found", "code": "404"}, status=404)

        try:
            body = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            body = {}

        status = body.get("status")
        if status and status not in VALID_TICKET_STATUSES:
            return JsonResponse({
                "error": "Invalid status",
                "code": "APP-1001",
                "message": f"Status must be one of: {', '.join(VALID_TICKET_STATUSES)}",
            }, status=400)

        if status:
            ticket.status = status
        if "subject" in body:
            ticket.subject = body["subject"]
        if "message" in body:
            ticket.message = body["message"]
        ticket.save()

        return JsonResponse({"success": True, "ticket": ticket.to_dict()})

    if request.method == "DELETE":
        if not ticket:
            return JsonResponse({"error": "Ticket not found", "code": "404"}, status=404)
        ticket.delete()
        return JsonResponse({"success": True, "id": ticket_id})

    return JsonResponse({"error": "Method not allowed"}, status=405)


def trigger_500(request):
    if not settings.ENABLE_TEST_ROUTES:
        raise Http404()
    raise Exception("Demonstration 500 error triggered via /trigger-500 route.")


# -----------------------------------------------------------------
# CUSTOM ERROR HANDLERS
# -----------------------------------------------------------------

def custom_404(request, exception=None):
    response = render(request, "404.html", {"title": "404 - Not Found", "request_path": request.path})
    response.status_code = 404
    return response


def custom_500(request):
    response = render(request, "500.html", {"title": "500 - Server Error"})
    response.status_code = 500
    return response
