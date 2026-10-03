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

    state = {
        "instytucja": {
            "typ": profile.get("org_type", ""),
            "wielkosc": profile.get("size_band", ""),
            "budzet_pln": profile.get("budget", 0),
            "kadra_osob": profile.get("staff", 1),
            "powiat": profile.get("powiat", ""),
        },
        "innowacja": {
            "nazwa": innovation.name,
            "opis": innovation.description[:400],
            "problem": innovation.problem[:300],
        },
        "parametry_wdrozenia": {
            "koszt": f"{plan.get('cost_low', 0)}–{plan.get('cost_high', 0)} zł",
            "zasieg": plan.get("scale", ""),
            "kadra": plan.get("staffing", ""),
        },
    }

    questions = {
        "poziom_ryzyka": {
            "type": "score",
            "instructions": "Oceń realny poziom trudności wdrożenia tej innowacji w tej instytucji",
            "criteria": ["Niskie", "Umiarkowane", "Podwyższone", "Wysokie"],
        },
        "glowna_bariera": {
            "type": "choice",
            "instructions": "Który czynnik stanowi największe wyzwanie wdrożeniowe dla tej jednostki?",
            "criteria": {
                "kadra": "Zasoby kadrowe i obciążenie bieżącymi obowiązkami",
                "finanse": "Dopięcie budżetu i koszty utrzymania po pilotażu",
                "procedury": "Procedury formalne, regulaminy i zgody organu prowadzącego",
                "angazowanie_odbiorcow": "Rekrutacja grupy docelowej i frekwencja uczestników",
            },
        },
        "rekomendacja_trybu": {
            "type": "choice",
            "instructions": "Jaki tryb wdrożenia jest optymalny dla profilu tej jednostki?",
            "criteria": {
                "pilotaz": "Rozpocząć od ograniczonego pilotażu w małej grupie",
                "partnerstwo_ngo": "Realizować w partnerstwie z doświadczonym NGO",
                "bezposrednie": "Wdrożyć bezpośrednio w strukturach jednostki",
            },
        },
        "wymaga_szkolenia": {
            "type": "noul",
            "instructions": "Czy kadra instytucji wymaga dedykowanego szkolenia metodycznego przed uruchomieniem?",
            "criteria": {
                "true": "Konieczne wcześniejsze przeszkolenie zespołu z metodyki innowacji.",
                "false": "Kompetencje zespołu są wystarczające do natychmiastowego startu.",
            },
        },
    }

    result = ai_transport.evaluate(state, questions)
    if not result:
        out = []
        if plan.get("risks"):
            out.append(f"Zidentyfikowane ryzyko: {plan['risks'][0]}.")
        out.append(f"Rekomendacja zasobowa: zapotrzebowanie kadry to {plan.get('staffing', 'wg wytycznych')}.")
        out.append("Zalecane przetestowanie procedury w formule pilotażowej przed pełnym wdrożeniem.")
        return out[:3]

    ryzyko_data = ai_transport.score_answer(result, "poziom_ryzyka")
    ryzyko_score = ryzyko_data.get("score", 1.0) if ryzyko_data else 1.0
    ryzyko_poziomy = ["niskie", "umiarkowane", "podwyższone", "wysokie"]
    ryzyko_label = ryzyko_poziomy[min(3, max(0, int(round(ryzyko_score))))]

    bariera_data = ai_transport.choice_answer(result, "glowna_bariera")
    bariera_key = bariera_data.get("choice") if bariera_data else "kadra"
    bariera_labels = {
        "kadra": "dostępność i obciążenie zespołu",
        "finanse": "finansowanie po zakończeniu dofinansowania",
        "procedury": "procedury formalne i dostosowanie regulaminów",
        "angazowanie_odbiorcow": "rekrutacja i zaangażowanie odbiorców",
    }
    bariera_text = bariera_labels.get(bariera_key, "dostosowanie organizacyjne")

    rekom_data = ai_transport.choice_answer(result, "rekomendacja_trybu")
    rekom_key = rekom_data.get("choice") if rekom_data else "pilotaz"
    rekom_labels = {
        "pilotaz": "rekomendowany start od mini-pilotażu na małej próbie odbiorców",
        "partnerstwo_ngo": "rekomendowane partnerstwo z lokalnym NGO dla odciążenia kadry",
        "bezposrednie": "możliwe bezpośrednie wdrożenie w bieżącej strukturze jednostki",
    }
    rekom_text = rekom_labels.get(rekom_key, "rekomendowany etap pilotażowy")

    szkolenie_noul = ai_transport.noul_answer(result, "wymaga_szkolenia") or 0.5
    szkolenie_text = (
        "Wymagane wstępne szkolenie metodyczne dla kadry przed startem usługi."
        if szkolenie_noul >= 0.5
        else "Wdrożenie wykonalne w oparciu o dotychczasowe przygotowanie zespołu."
    )

    notes = [
        f"Ocena Jev: poziom trudności to {ryzyko_label} (indeks {ryzyko_score:.1f}/3) — {rekom_text}.",
        f"Główny punkt uwagi: {bariera_text} (uwzględnij w harmonogramie wdrożenia).",
        szkolenie_text,
    ]
    return notes


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
                source = "jev"

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
