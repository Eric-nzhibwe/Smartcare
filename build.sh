#!/bin/bash
# Build script for Render deployment
set -e

echo "==> Installing Python dependencies"
pip install -r requirements.txt

echo "==> Collecting static files"
python manage.py collectstatic --no-input

echo "==> Running database migrations"
python manage.py migrate --no-input

echo "==> Seeding demo data (skips if already seeded)"
python manage.py seed || echo "Seed skipped (already exists or error)"

echo "==> Build complete"
