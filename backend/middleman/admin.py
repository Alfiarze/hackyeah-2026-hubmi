from django.contrib import admin

from .models import ImplementationPlan, InstitutionProfile


@admin.register(InstitutionProfile)
class InstitutionProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "org_type", "size_band", "budget", "staff", "powiat")
    list_filter = ("org_type", "size_band")


@admin.register(ImplementationPlan)
class ImplementationPlanAdmin(admin.ModelAdmin):
    list_display = ("title", "innovation", "cost_low", "cost_high", "source", "created_at")
    list_filter = ("source",)
