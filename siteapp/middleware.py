import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger("siteapp.request")


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = int((time.monotonic() - start) * 1000)
        timestamp = datetime.now(timezone.utc).isoformat()
        print(
            f"[HTTP] {timestamp} {request.method} {request.get_full_path()} "
            f"{response.status_code} {duration_ms}ms"
        )
        return response
