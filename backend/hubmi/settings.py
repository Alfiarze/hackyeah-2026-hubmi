"""
Ustawienia HubMI.

Wszystko, co zmienne, idzie z env — ten sam obraz działa na laptopie
i na serwerze. Opis zmiennych: `.env.example` w korzeniu repo.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default)


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in env(name, default).split(",") if v.strip()]


SECRET_KEY = env("DJANGO_SECRET_KEY", "hubmi-tylko-do-demo-zmien-na-serwerze")
DEBUG = env("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "*")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # wyszukiwanie po Postgresie: wektory (pgvector) + tsvector po polsku
    "django.contrib.postgres",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    # aplikacje HubMI — po jednej na moduł zadania
    "accounts",
    "catalog",       # II  Zasobnik wiedzy + baza innowacji (dla I i VII)
    "matchmaking",   # I   Matchmaking społeczny (obowiązkowy) + AI
    "hub",           # III, IV, V — fiszki, tester, komunikacja, zgłoszenia
    "middleman",     # VII Middleman Innowacji
    "analytics",     # VI  Panel administratora (agregaty, bez modeli)
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # cors musi być przed CommonMiddleware, inaczej OPTIONS nie przechodzi
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "hubmi.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "hubmi.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", "hubmi"),
        "USER": env("DB_USER", "hubmi"),
        "PASSWORD": env("DB_PASSWORD", "hubmi"),
        "HOST": env("DB_HOST", "localhost"),
        "PORT": env("DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

# Język interfejsu API po polsku (formaty dat, komunikaty admina).
LANGUAGE_CODE = "pl"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- API -------------------------------------------------------------------
# Token dla demo/API, sesja dla Django admina. Odczyt jest publiczny (ma być
# dostępny bez logowania), zapisy pilnowane w widokach przez rolę użytkownika.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

_origins = env_list("CORS_ALLOW_ORIGINS")
if _origins:
    CORS_ALLOWED_ORIGINS = _origins
    CORS_ALLOW_CREDENTIALS = True
else:
    # dev/demo: Vite na 5173 ma wchodzić bez konfiguracji
    CORS_ALLOW_ALL_ORIGINS = True

# --- AI --------------------------------------------------------------------
# Jedyny dostawca: Jev (TypeSafe AI) — model decyzyjny, przez Decisions API
# OpenRouter (bo Jev nie jest modelem chatowym: zwraca odpowiedzi typowane
# noul/choice/score, nigdy prozę).
# Bez OpenAI, Anthropic i Ollamy: wszystko, co AI-owe, idzie przez hubmi/ai.py.
# Bez JEV_API_KEY backend działa dalej — widoki schodzą na fallback.
AI_PROVIDER = env("AI_PROVIDER", "jev")
JEV_API_KEY = env("JEV_API_KEY") or env("OPENROUTER_API_KEY") or env("TYPESAFE_API_KEY")
JEV_URL = env("JEV_URL", "https://openrouter.ai/api/alpha/decisions")
JEV_MODEL = env("JEV_MODEL", "typesafe/jev-1.13")
# Jev odpowiada w 70–500 ms, więc 30 s to i tak hojny margines.
JEV_TIMEOUT = float(env("AI_TIMEOUT", "30"))
# Próg: noul >= próg → „powiązane". Samo w sobie Jev zwraca 0..1, to my
# decydujemy, gdzie jest granica.
JEV_THRESHOLD = float(env("JEV_THRESHOLD", "0.5"))

# --- Dane ------------------------------------------------------------------
# Montowane w docker-compose z katalogu hosta (read-only).
ROPS_DATA_DIR = Path(env("ROPS_DATA_DIR", BASE_DIR.parent / "data"))
APP_DATA_DIR = Path(env("APP_DATA_DIR", BASE_DIR.parent / "app" / "src" / "data"))
VECTORS_FILE = APP_DATA_DIR / "vectors.json"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "plain"},
    },
    "loggers": {
        "hubmi": {"handlers": ["console"], "level": "INFO"},
        "django.request": {"handlers": ["console"], "level": "WARNING"},
    },
}
