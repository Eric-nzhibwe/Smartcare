#!/bin/bash
# Build script for Render deployment
set -e

echo "==> Installing Python dependencies"
pip install -r requirements.txt

echo "==> Collecting static files"
python manage.py collectstatic --no-input

echo "==> Running database migrations"
python manage.py migrate --no-input

echo "==> Seeding demo data (creates facilities/users if missing, preserves existing passwords)"
python manage.py seed || echo "Seed skipped or partial"

echo "==> Creating superuser (skips if already exists)"
python manage.py create_superuser || echo "Superuser step skipped"

echo "==> Build complete"
