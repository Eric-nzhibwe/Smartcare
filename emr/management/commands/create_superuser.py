"""
Management command to create a Django superuser from environment variables.
Runs non-interactively — safe for use in build/deploy scripts.

Required env vars:
    DJANGO_SUPERUSER_USERNAME
    DJANGO_SUPERUSER_PASSWORD
    DJANGO_SUPERUSER_EMAIL   (optional, defaults to empty)
    DJANGO_SUPERUSER_NAME    (optional, defaults to username)
"""

import os
from django.core.management.base import BaseCommand
from emr.models import User


class Command(BaseCommand):
    help = 'Create a superuser from environment variables (idempotent)'

    def handle(self, *args, **options):
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        email    = os.environ.get('DJANGO_SUPERUSER_EMAIL', '')
        name     = os.environ.get('DJANGO_SUPERUSER_NAME', username)

        if not username or not password:
            self.stdout.write(self.style.WARNING(
                'Skipping superuser creation — '
                'DJANGO_SUPERUSER_USERNAME and DJANGO_SUPERUSER_PASSWORD not set.'
            ))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(
                f'Superuser "{username}" already exists — skipping.'
            ))
            return

        User.objects.create_superuser(
            username=username,
            password=password,
            email=email,
            name=name,
            role='admin',
            facility='MoH Headquarters',
        )
        self.stdout.write(self.style.SUCCESS(
            f'✅  Superuser "{username}" created successfully.'
        ))
