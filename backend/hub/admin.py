from django.contrib import admin

from .models import Fiszka, Message, Notification, Rating, Thread, Vote


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "status", "stage", "author_name", "powiat", "read", "created_at")
    list_filter = ("kind", "status", "stage", "read")
    search_fields = ("title", "body", "query_text")
    inlines = [MessageInline]


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("innovation", "score", "author_name", "created_at")
    list_filter = ("score",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "channel", "user", "read", "created_at")
    list_filter = ("channel", "read")


admin.site.register([Fiszka, Vote])
