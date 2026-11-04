import random
import time

from .models import Ticket


def _generate_ticket_number():
    base36 = ""
    n = int(time.time() * 1000)
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    if n == 0:
        base36 = "0"
    while n > 0:
        n, rem = divmod(n, 36)
        base36 = digits[rem] + base36
    return f"TICK-{base36.upper()}-{random.randint(100, 999)}"


def create_ticket(name=None, email=None, subject=None, message=""):
    return Ticket.objects.create(
        ticket_number=_generate_ticket_number(),
        name=name or "Anonymous",
        email=email or "unspecified@example.com",
        subject=subject or "Support Ticket",
        message=message,
        status=Ticket.STATUS_OPEN,
    )
