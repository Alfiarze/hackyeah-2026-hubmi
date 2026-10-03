#!/bin/sh
set -e

echo "=== HubMI backend ==="

python manage.py wait_for_db
python manage.py migrate --noinput

# idempotentne — 115 kart + 76 dokumentów + seed wątków, przy każdym starcie
python manage.py import_data
python manage.py load_vectors

if [ "${DJANGO_DEBUG:-1}" = "1" ]; then
  echo "tryb dev: runserver 0.0.0.0:8000"
  exec python manage.py runserver 0.0.0.0:8000
fi

echo "tryb prod: gunicorn"
exec gunicorn hubmi.wsgi:application --bind 0.0.0.0:8000 --workers "${GUNICORN_WORKERS:-3}"
