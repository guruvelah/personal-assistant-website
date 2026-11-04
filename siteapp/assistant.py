import re
import logging

import requests
from django.conf import settings

from . import mongo
from .models import ErrorCode, Faq
from .tickets import create_ticket

logger = logging.getLogger(__name__)

ERROR_CODE_RE = re.compile(r"\b(APP-1001|APP-2001|400|401|403|404|429|500|503)\b", re.IGNORECASE)


def _ask_anthropic(prompt):
    api_key = settings.ANTHROPIC_API_KEY
    if not api_key or not api_key.strip():
        return None

    model = settings.ANTHROPIC_MODEL or "claude-3-haiku-20240307"
    try:
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            timeout=6,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": model,
                "max_tokens": 300,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        if not response.ok:
            logger.warning("[Anthropic] Request failed with status %s", response.status_code)
            return None

        data = response.json()
        content = data.get("content")
        if content and content[0].get("text"):
            return content[0]["text"]
        return None
    except requests.RequestException as err:
        logger.warning("[Anthropic] Call timed out or failed: %s", err)
        return None


def _search_faq(query):
    terms = [t for t in re.sub(r"[^a-z0-9\s]", " ", query.lower()).split() if len(t) > 2]
    if not terms:
        return None

    best_match = None
    highest_score = 0

    for faq in Faq.objects.all():
        q_lower = faq.question.lower()
        a_lower = faq.answer.lower()
        score = 0
        for term in terms:
            if term in q_lower:
                score += 3
            if term in a_lower:
                score += 1
        if score > highest_score:
            highest_score = score
            best_match = faq

    return best_match if highest_score >= 2 else None


def handle_message(user_message, session_id="default-session"):
    clean = (user_message or "").strip()
    if not clean:
        return {"type": "error", "reply": "Please provide a question or error code to look up."}

    result = None

    # 1. Error code match
    error_match = ERROR_CODE_RE.search(clean)
    if error_match:
        code = error_match.group(1).upper()
        err_record = ErrorCode.objects.filter(code__iexact=code).first()
        if err_record:
            result = {
                "type": "error_code",
                "code": err_record.code,
                "title": err_record.title,
                "reply": (
                    f"Error {err_record.code} ({err_record.title}): {err_record.description}\n\n"
                    f"Resolution: {err_record.resolution}"
                ),
            }

    # 2. FAQ match
    if not result:
        faq_record = _search_faq(clean)
        if faq_record:
            result = {"type": "faq", "question": faq_record.question, "reply": faq_record.answer}

    # 3. Optional Anthropic fallback
    if not result and settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY.strip():
        ai_text = _ask_anthropic(clean)
        if ai_text:
            result = {"type": "ai", "reply": ai_text}

    # 4. Fallback: auto-create a support ticket
    if not result:
        ticket = create_ticket(
            name="Chat Visitor",
            email="chat-visitor@support.local",
            subject=f'Assistant Inquiry: "{clean[:40]}"',
            message=clean,
        )
        result = {
            "type": "ticket",
            "ticketId": ticket.ticket_number,
            "reply": (
                f'I could not find an exact match in our FAQs or error codes for "{clean}". '
                f"I have automatically created support ticket #{ticket.ticket_number} for you. "
                f"Our team will review it shortly!"
            ),
        }

    # 5. Log interaction to MongoDB
    mongo_log = mongo.log_chat(
        session_id=session_id,
        user_message=clean,
        assistant_response=result["reply"],
        response_type=result["type"],
        ticket_id=result.get("ticketId"),
    )
    result["logId"] = mongo_log["logId"]
    return result
