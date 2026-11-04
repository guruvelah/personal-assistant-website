import datetime
import logging

from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)

_client = None
_db = None


def _is_configured():
    uri = settings.MONGODB_URI
    if not uri:
        return False
    return "<username>" not in uri and "<password>" not in uri and "<db_password>" not in uri


def get_database():
    global _client, _db
    if _db is not None:
        return _db
    if not _is_configured():
        logger.warning("[MongoDB] MONGODB_URI is not configured or contains placeholder credentials.")
        return None

    try:
        _client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
        )
        _db = _client[settings.MONGODB_DB]
        logger.info("[MongoDB] Connected successfully to database: %s", settings.MONGODB_DB)
        return _db
    except PyMongoError as err:
        logger.error("[MongoDB] Connection error: %s", err)
        _client = None
        _db = None
        return None


def log_chat(session_id, user_message, assistant_response, response_type, ticket_id=None):
    try:
        database = get_database()
        if database is None:
            return {"logId": f"local-{int(datetime.datetime.utcnow().timestamp() * 1000)}"}

        doc = {
            "sessionId": session_id or "default-session",
            "userMessage": user_message,
            "assistantResponse": assistant_response,
            "responseType": response_type or "text",
            "ticketId": ticket_id,
            "timestamp": datetime.datetime.utcnow(),
        }
        result = database["chat_logs"].insert_one(doc)
        return {"logId": str(result.inserted_id)}
    except PyMongoError as err:
        logger.error("[MongoDB] Failed to log chat: %s", err)
        return {"logId": f"err-{int(datetime.datetime.utcnow().timestamp() * 1000)}"}


def save_feedback(log_id, rating, comment=None):
    try:
        database = get_database()
        if database is None:
            logger.warning("[MongoDB] Cannot save feedback: Mongo not connected.")
            return {"success": False, "error": "MongoDB not connected"}

        doc = {
            "logId": str(log_id) if log_id else None,
            "rating": "up" if rating == "up" else "down",
            "comment": str(comment)[:500] if comment else None,
            "timestamp": datetime.datetime.utcnow(),
        }
        result = database["feedback"].insert_one(doc)
        return {"success": True, "id": str(result.inserted_id)}
    except PyMongoError as err:
        logger.error("[MongoDB] Failed to save feedback: %s", err)
        return {"success": False, "error": str(err)}


def check_mongo_health():
    if not _is_configured():
        return "not_configured"
    try:
        database = get_database()
        if database is None:
            return "not_configured"
        database.command("ping")
        return "ok"
    except PyMongoError as err:
        logger.error("[MongoDB] Ping failed: %s", err)
        return "error"
