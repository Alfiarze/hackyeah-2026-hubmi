from django.contrib import admin

from .models import Category, Deployment, Innovation, LibraryItem


@admin.register(Innovation)
class InnovationAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "updated_at", "updated_by")
    list_filter = ("category",)
    search_fields = ("name", "problem", "description")
    prepopulated_fields = {"id": ("name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("title", "slug")


@admin.register(LibraryItem)
class LibraryItemAdmin(admin.ModelAdmin):
    list_display = ("title", "section", "year", "featured")
    list_filter = ("section", "featured")
    search_fields = ("title", "desc")


@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):
    list_display = ("innovation", "powiat", "org", "year", "demo")
