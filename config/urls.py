from django.urls import path
from siteapp import views

urlpatterns = [
    path("", views.home, name="home"),
    path("about", views.about, name="about"),
    path("faq", views.faq_page, name="faq"),
    path("errors", views.errors_page, name="errors"),
    path("contact", views.contact_page, name="contact"),
    path("status", views.status_page, name="status"),
    path("admin/tickets", views.admin_tickets_page, name="admin_tickets"),

    path("health", views.health, name="health"),
    path("trigger-500", views.trigger_500, name="trigger_500"),

    path("api/weather", views.api_weather, name="api_weather"),
    path("api/chat", views.api_chat, name="api_chat"),
    path("api/feedback", views.api_feedback, name="api_feedback"),
    path("api/faqs", views.api_faqs, name="api_faqs"),
    path("api/errors", views.api_errors, name="api_errors"),
    path("api/tickets", views.api_tickets, name="api_tickets"),
    path("api/tickets/<int:ticket_id>", views.api_ticket_detail, name="api_ticket_detail"),
]

handler404 = "siteapp.views.custom_404"
handler500 = "siteapp.views.custom_500"
