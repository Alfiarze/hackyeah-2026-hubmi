"""
Moduł VII — Middleman Innowacji: profil instytucji + karta wdrożenia.

  GET/POST /api/institutions/             profil zgłaszającej się instytucji
  POST     /api/institutions/plan/        karta wdrożenia (usługa, koszt, ryzyka)
  GET      /api/middleman/options/        listy do formularza (typ, wielkość)
  GET      /api/institutions/plans/       historia kart

Koszty i harmonogram liczy `rules.py` (port deterministycznych reguł z frontu),
a model z kontenera `ai` dopisuje wyłącznie kontekst — dzięki temu liczby są
obronne przed radą gminy, niezależnie od tego, czy akurat AI odpowiada.
"""
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from hubmi import ai as ai_transport

from . import rules
from .models import ImplementationPlan, InstitutionProfile
from .serializers import (
    ImplementationPlanSerializer,
    InstitutionProfileSerializer,
    PlanRequestSerializer,
)

AI_SYSTEM = (
    "Jesteś modułem Middleman Innowacji w HubMI (ROPS Kraków). Dostajesz "
    "instytucję, innowację z Biblioteki i kartę wdrożenia wyliczoną regułami. "
    "Dopisujesz krótkie, praktyczne uwagi wdrożeniowe po polsku — maks. 3 punkty, "
    "każdy po jednym zdaniu. Nie zmieniasz kwot ani harmonogramu i nie dodajesz "
    "obietnic, których nie ma w kartach."
)

AI_PROMPT = (
    "INSTYTUCJA: {profile}\n\nINNOWACJA: {innovation}\n\n"
    "KARTA WDROŻENIA (reguły, nie zmieniaj): koszt {low}–{high} zł, zasięg: {scale}, "
    "kadra: {staffing}\nRYZYKA: {risks}\n\n"
    "Dopisz 3 uwagi wdrożeniowe dla tej konkretnej instytucji. Zwróć JSON "
    '{{"uwagi": ["...", "...", "..."}}'
)


def _profile_payload(data: dict) -> dict:
    return {
        "name": "Instytucja (demo)",
        "org_type": data["org_type"],
        "size_band": data["size_band"],
        "budget": int(data.get("budget") or 0),
        "staff": int(data.get("staff") or 1),
        "powiat": data.get("powiat") or "",
        "notes": data.get("notes", ""),
    }


def _ai_notes(plan: dict, profile: dict, innovation) -> list[str]:
    if not plan:
        return []
    prompt = AI_PROMPT.format(
        profile=f"{profile['org_type']}, {profile['size_band']}, "
                f"budżet {profile['budget']} zł, {profile['staff']} os., {profile['powiat']}",
        innovation=f"{innovation.name}: {innovation.description[:400]}",
        low=f"{plan['cost_low']:,}",
        high=f"{plan['cost_high']:,}",
        scale=plan["scale"],
        staffing=plan["staffing"],
        risks=" | ".join(plan["risks"][:3]),
    )
    raw = ai_transport.generate_text(
        prompt, system=AI_SYSTEM, json_mode=True, max_tokens=500
    )
    data = ai_transport.extract_json(raw) if raw else None
    if isinstance(data, dict) and isinstance(data.get("uwagi"), list):
        return [str(u)[:300] for u in data["uwagi"]][:3]
    return []


class InstitutionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin,
                         mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = InstitutionProfileSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from accounts.permissions import is_staff_role

        qs = InstitutionProfile.objects.all()
        user = self.request.user
        if user.is_authenticated and not is_staff_role(user):
            qs = qs.filter(user=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user if self.request.user.is_authenticated else None
        )

    @action(detail=False, methods=["post"])
    def plan(self, request):
        """
        POST /api/institutions/plan/
        {innovation_id, org_type, size_band, budget, staff, powiat?, use_ai?}

        Zwraca kartę wdrożenia i zapisuje ją przy profili instytucji.
        """
        ser = PlanRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        innovation = ser.get_innovation()
        if innovation is None:
            return Response(
                {"detail": "Nie ma takiej innowacji (innovation_id)."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = _profile_payload(ser.validated_data)
        plan = rules.adapt(
            {
                "name": innovation.name,
                "description": innovation.description,
                "problem": innovation.problem,
                "benef": innovation.beneficiaries,
                "evidence": innovation.evidence,
                "license": innovation.license,
            },
            profile,
        )

        source = "regula"
        if ser.validated_data.get("use_ai", True):
            notes = _ai_notes(plan, profile, innovation)
            if notes:
                plan["risks"] = plan["risks"] + [f"Uwaga AI: {n}" for n in notes]
                source = "llm"

        with transaction.atomic():
            inst = InstitutionProfile.objects.create(
                **{
                    k: v
                    for k, v in profile.items()
                    if k in ("name", "org_type", "size_band", "budget", "staff", "powiat", "notes")
                },
                user=request.user if request.user.is_authenticated else None,
            )
            instance = ImplementationPlan.objects.create(
                institution=inst,
                innovation=innovation,
                title=plan["title"],
                summary=plan["summary"],
                scale=plan["scale"],
                staffing=plan["staffing"],
                cost_low=plan["cost_low"],
                cost_high=plan["cost_high"],
                affordable=plan["affordable"],
                steps=plan["steps"],
                risks=plan["risks"],
                adaptations=plan["adaptations"],
                legal=plan["legal"],
                source=source,
            )
        data = ImplementationPlanSerializer(instance).data
        data["context"] = plan["context"]
        data["grant_hint"] = {
            "name": "Inkubator Włączenia Społecznego 2.0",
            "max_amount": 120000,
            "note": (
                "Jeśli budżet nie pokrywa dolnej granicy, generator wniosku "
                "(moduł III) przygotuje wniosek pod ten nabór."
            ),
        }
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def plans(self, request):
        """GET /api/institutions/plans/ — historia kart wdrożenia."""
        qs = ImplementationPlan.objects.select_related("innovation", "institution")[:50]
        return Response(ImplementationPlanSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def options(request):
    """GET /api/middleman/options/ — listy do formularza profilu instytucji."""
    return Response(
        {
            "org_types": InstitutionProfile.ORG_TYPES,
            "size_bands": InstitutionProfile.SIZE_BANDS,
            "unit_cost_hint": {k: list(v) for k, v in rules.UNIT_COST.items()},
        }
    )
