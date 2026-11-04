from django.db import models


class Faq(models.Model):
    question = models.TextField()
    answer = models.TextField()
    category = models.CharField(max_length=50, default="General")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.question


class ErrorCode(models.Model):
    code = models.CharField(max_length=20, primary_key=True)
    status_code = models.IntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField()
    resolution = models.TextField()

    class Meta:
        ordering = ["status_code", "code"]

    def __str__(self):
        return self.code


class Ticket(models.Model):
    STATUS_OPEN = "open"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [
        (STATUS_OPEN, "open"),
        (STATUS_IN_PROGRESS, "in_progress"),
        (STATUS_RESOLVED, "resolved"),
    ]

    ticket_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200, default="Anonymous")
    email = models.CharField(max_length=200, default="unspecified@example.com")
    subject = models.CharField(max_length=200, default="General Inquiry")
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return self.ticket_number

    def to_dict(self):
        return {
            "id": self.id,
            "ticket_number": self.ticket_number,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
