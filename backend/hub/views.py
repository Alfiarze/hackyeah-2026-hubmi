"""
Moduły III (kreator), IV (tester/tablica) i V (komunikacja).

  GET/POST /api/threads/            jeden kanał zgłoszeń na wszystkie moduły
  POST     /api/threads/{id}/messages/   odpowiedź w wątku
  POST     /api/threads/{id}/reply/      ROPS/ekspert → pętla komunikacji domknięta
  POST     /api/threads/{id}/vote/       walidacja: mam to / chcę testować / mogę pomóc
  POST     /api/threads/{id}/moderate/   ADMIN: status, etap, oznaczenie przeczytania
  GET      /api/threads/{id}/digest/     AI streszczenie dyskusji
  GET      /api/threads/board/           tablica pomysłów z etapami i głosami
  GET      /api/threads/inbox/           ADMIN: skrzynka zgłoszeń
  GET/POST /api/ratings/                 oceny istniejących innowacji (1–5)
  GET/POST /api/notifications/           dzwoneczek + kanał „nabory”
  GET      /api/grants/                  nabory do generatora
  POST     /api/grants/generate/         generator wniosku (moduł III)
  POST     /api/ideas/develop/           asystent kreatora (moduł III)
"""
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsExpertOrStaff, IsHubmiAdmin, is_staff_role, role_of
from catalog.serializers import InnovationSerializer
from matchmaking import engine

from . import ai as kreator_ai
from . import grant as grant_mod
from .models import Fiszka, Message, Notification, Rating, Thread, Vote
from .serializers import (
    MessageSerializer,
    NotificationSerializer,
    RatingSerializer,
    ThreadSerializer,
    ThreadWriteSerializer,
)


def _client_id(request) -> str:
    value = request.data.get("client_id") or request.headers.get("X-Hubmi-Client", "")
    return str(value)[:64]


def _notify(user, *, channel: str, title: str, body: str = "", thread=None) -> None:
    Notification.objects.create(
        user=user, channel=channel, title=title, body=body, thread=thread
    )


def _nearest(problem: str, limit: int = 5) -> list[dict]:
    """Najbliższe karty do pomysłu/problemu — dla asystenta i generatora wniosku."""
    if not (problem or "").strip():
        return []
    found = engine.search(problem, limit=limit)
    if not found["results"]:
        return []
    ids = [r["innovation_id"] for r in found["results"]]
    rows = {i.id: i for i in _innovations_by_id(ids)}
    out = []
    for r in found["results"]:
        inn = rows.get(r["innovation_id"])
        if not inn:
            continue
        out.append(
            {
                "id": inn.id,
                "name": inn.name,
                "cat_name": inn.cat_name,
                "description": inn.description,
                "problem": inn.problem,
                "score": r["score"],
                "tier": r["tier"],
                "reasons": r["reasons"],
            }
        )
    return out


def _innovations_by_id(ids):
    from catalog.models import Innovation

    return Innovation.objects.select_related("category").filter(id__in=ids)


class ThreadViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ThreadSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return ThreadWriteSerializer
        return ThreadSerializer

    def get_permissions(self):
        if self.action in ("moderate", "inbox"):
            return [IsHubmiAdmin()]
        if self.action == "reply":
            return [IsExpertOrStaff()]
        return [AllowAny()]

    def get_queryset(self):
        qs = (
            Thread.objects.select_related("innovation", "author")
            .prefetch_related("messages", "votes", "fiszka")
        )
        params = self.request.query_params
        if params.get("kind"):
            qs = qs.filter(kind=params["kind"])
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("stage"):
            qs = qs.filter(stage=params["stage"])
        if params.get("powiat"):
            qs = qs.filter(powiat=params["powiat"])
        if params.get("unread") in ("1", "true") and is_staff_role(self.request.user):
            qs = qs.filter(read=False, status=Thread.Status.NOWE)
        if params.get("mine") in ("1", "true") and self.request.user.is_authenticated:
            qs = qs.filter(author=self.request.user)
        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(body__icontains=q))
        return qs

    def perform_create(self, serializer):
        thread = serializer.save()
        # „Jak system powiadamia administratora o nowym pomyśle?” (§6)
        _notify(
            None,
            channel="zgloszenia",
            title=f"Nowe zgłoszenie ({thread.get_kind_display()}): {thread.title}",
            body=thread.body[:300],
            thread=thread,
        )
        if thread.kind == Thread.Kind.POMYSŁ:
            _notify(
                None,
                channel="nabory",
                title=f"Pomysł na tablicy: {thread.title}",
                body="Sprawdź, czy to pasuje do otwartego naboru.",
                thread=thread,
            )

    # --- tablica i skrzynka ------------------------------------------------

    @action(detail=False, methods=["get"])
    def board(self, request):
        """GET /api/threads/board/ — publiczna tablica fiszek z etapami i głosami."""
        qs = self.get_queryset().filter(kind=Thread.Kind.POMYSŁ)
        stage = request.query_params.get("stage")
        if stage:
            qs = qs.filter(stage=stage)
        qs = qs.annotate(
            vote_total=Count("votes", distinct=True)
        ).order_by("-vote_total", "-created_at")
        page = self.paginate_queryset(qs)
        serializer = ThreadSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def inbox(self, request):
        """GET /api/threads/inbox/ — ADMIN: kolejka zgłoszeń z licznikiem nieprzeczytanych."""
        unread = Thread.objects.filter(read=False, status=Thread.Status.NOWE).count()
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        serializer = ThreadSerializer(page or qs, many=True)
        data = serializer.data
        if page is not None:
            response = self.get_paginated_response(data)
            response.data["unread"] = unread
            return response
        return Response({"results": data, "unread": unread})

    # --- komunikacja -------------------------------------------------------

    @action(detail=True, methods=["post"])
    def messages(self, request, pk=None):
        """POST /api/threads/{id}/messages/ {text} — każdy może dopisać do wątku."""
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response(
                {"detail": "Treść wiadomości jest pusta."}, status=status.HTTP_400_BAD_REQUEST
            )
        thread = self.get_object()
        profile = getattr(request.user, "profile", None)
        msg = Message.objects.create(
            thread=thread,
            author=request.user if request.user.is_authenticated else None,
            author_name=(
                request.data.get("author_name")
                or (profile.label if profile else "Mieszkaniec (demo)")
            ),
            role=role_of(request.user),
            text=text,
        )
        if not is_staff_role(request.user) and thread.read:
            # nowa wiadomość wraca na górę skrzynki administratora
            thread.read = False
            thread.status = Thread.Status.NOWE
            thread.save(update_fields=["read", "status", "updated_at"])
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        """POST /api/threads/{id}/reply/ {text} — odpowiedź ROPS/eksperta do autora."""
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response(
                {"detail": "Treść odpowiedzi jest pusta."}, status=status.HTTP_400_BAD_REQUEST
            )
        thread = self.get_object()
        profile = getattr(request.user, "profile", None)
        msg = Message.objects.create(
            thread=thread,
            author=request.user if request.user.is_authenticated else None,
            author_name=request.data.get("author_name")
            or (profile.label if profile else "Koordynator ROPS"),
            role=role_of(request.user),
            text=text,
        )
        thread.status = Thread.Status.ODPOWIEDZIANE
        thread.read = True
        thread.save(update_fields=["status", "read", "updated_at"])
        # pętla domknięta: autorka dostaje kropkę w dzwonku
        _notify(
            thread.author,
            channel="odpowiedzi",
            title=f"Odpowiedź w zgłoszeniu: {thread.title}",
            body=text[:300],
            thread=thread,
        )
        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    # --- walidacja i moderacja --------------------------------------------

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        """POST /api/threads/{id}/vote/ {value, client_id} — walidacja społeczna."""
        thread = self.get_object()
        value = request.data.get("value")
        if value not in Vote.Value.values:
            return Response(
                {"detail": f"Niedozwolony głos. Dozwolone: {Vote.Value.values}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        client = _client_id(request)
        if request.user.is_authenticated:
            client = f"user:{request.user.pk}"
        if not client:
            return Response(
                {"detail": "Podaj client_id (bez logowania) albo zaloguj się."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                vote = Vote.objects.create(
                    thread=thread, value=value, client_id=client,
                    user=request.user if request.user.is_authenticated else None,
                )
        except IntegrityError:
            # już głosował — nie liczymy podwójnie, nie karzemy
            vote = Vote.objects.filter(thread=thread, value=value, client_id=client).first()
            return Response(
                {"detail": "Ten głos został już oddany.", "vote": vote and vote.id},
                status=status.HTTP_200_OK,
            )
        counts = dict(
            thread.votes.values("value").annotate(c=Count("id")).values_list("value", "c")
        )
        return Response(
            {"vote": vote.id, "value": value, "counts": counts},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"])
    def moderate(self, request, pk=None):
        """
        POST /api/threads/{id}/moderate/ {status?, stage?, read?}

        ADMIN: akceptuj/odrzuć, przesuń etap cyklu życia, oznacz przeczytane.
        """
        thread = self.get_object()
        allowed = {}
        if "status" in request.data:
            if request.data["status"] not in Thread.Status.values:
                return Response({"detail": "Zły status."}, status=status.HTTP_400_BAD_REQUEST)
            allowed["status"] = request.data["status"]
        if "stage" in request.data:
            if request.data["stage"] not in Thread.Stage.values:
                return Response({"detail": "Zły etap."}, status=status.HTTP_400_BAD_REQUEST)
            allowed["stage"] = request.data["stage"]
        if "read" in request.data:
            allowed["read"] = bool(request.data["read"])
        if not allowed:
            return Response(
                {"detail": "Nic do zmiany — podaj status, stage albo read."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for key, value in allowed.items():
            setattr(thread, key, value)
        thread.save()
        if allowed.get("status") == Thread.Status.ODPOWIEDZIANE and thread.author_id:
            _notify(
                thread.author,
                channel="odpowiedzi",
                title=f"Status zgłoszenia zmieniony: {thread.title}",
                thread=thread,
            )
        return Response(ThreadSerializer(thread).data)

    @action(detail=True, methods=["get"])
    def digest(self, request, pk=None):
        """GET /api/threads/{id}/digest/ — streszczenie dyskusji (AI + fallback)."""
        thread = self.get_object()
        messages = [
            {"author_name": m.author_name, "role": m.role, "text": m.text}
            for m in thread.messages.all()
        ]
        return Response(kreator_ai.thread_digest(thread.title, messages))


class RatingViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    GET  /api/ratings/?innovation=slug — oceny istniejącej innowacji
    POST /api/ratings/ {innovation, score, comment, client_id}
    """

    serializer_class = RatingSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Rating.objects.select_related("innovation")
        if self.request.query_params.get("innovation"):
            qs = qs.filter(innovation=self.request.query_params["innovation"])
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = _client_id(request)
        if request.user.is_authenticated:
            client = f"user:{request.user.pk}"
        try:
            with transaction.atomic():
                instance = serializer.save(
                    client_id=client,
                    user=request.user if request.user.is_authenticated else None,
                )
        except IntegrityError:
            return Response(
                {"detail": "Tę innowację oceniłeś już wcześniej."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            RatingSerializer(instance).data, status=status.HTTP_201_CREATED
        )


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    GET  /api/notifications/  — dla mieszkańca własne, dla ROPS kanał zgłoszeń
    POST /api/notifications/read/ {ids?} — odhaczenie dzwonka
    """

    serializer_class = NotificationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Notification.objects.all()
        if is_staff_role(self.request.user):
            qs = qs.filter(Q(user__isnull=True) | Q(user=self.request.user))
        elif self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)
        else:
            qs = qs.none()
        if self.request.query_params.get("unread") in ("1", "true"):
            qs = qs.filter(read=False)
        return qs.select_related("thread")

    @action(detail=False, methods=["post"])
    def read(self, request):
        ids = request.data.get("ids")
        qs = self.get_queryset().filter(read=False)
        if ids:
            qs = qs.filter(id__in=ids)
        updated = qs.update(read=True)
        return Response({"updated": updated})


# --- moduł III: generator wniosku i asystent kreatora -----------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def grants_list(request):
    """GET /api/grants/ — nabory, pod które generowany jest wniosek."""
    return Response(grant_mod.GRANTS)


@api_view(["POST"])
@permission_classes([AllowAny])
def grant_generate(request):
    """
    POST /api/grants/generate/
    {grant_id?, title, problem, powiat?, amount, fiszka{istota,adresat,etap,obszar}}

    Sekcja o nowości korzysta z matchmakingu: komisja pyta, czy pomysł jest NOWY
    w skali Polski, a my mamy na to dowód z 115 kart, nie deklarację.
    """
    body = request.data
    problem = (body.get("problem") or "").strip()
    nearest = _nearest(problem, limit=5)
    draft = grant_mod.generate_grant(
        title=body.get("title", ""),
        problem=problem,
        fiszka=body.get("fiszka") or {},
        nearest=nearest,
        amount=int(body.get("amount") or grant_mod.MAX_GRANT),
        powiat=body.get("powiat") or None,
        grant_id=body.get("grant_id") or "iws20",
    )
    return Response({**draft, "nearest": nearest[:3]})


@api_view(["POST"])
@permission_classes([AllowAny])
def idea_develop(request):
    """
    POST /api/ideas/develop/ {problem?, fiszka?}

    Asystent kreatora: rozwija pomysł, podpowiada nietuzinkowe rozwiązania
    i mówi, co już jest w Bibliotece (żeby nie zgłaszać duplikatu).
    """
    body = request.data
    problem = (body.get("problem") or "").strip()
    fiszka = body.get("fiszka") or {}
    if not problem and not fiszka.get("istota"):
        return Response(
            {"detail": "Podaj opis problemu albo istotę pomysłu."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    nearest = _nearest(problem or fiszka.get("istota", ""), limit=3)
    top_score = nearest[0]["score"] if nearest else None
    out = kreator_ai.develop_idea(problem, fiszka, nearest, top_score)
    return Response({**out, "nearest": nearest, "top_score": top_score})
