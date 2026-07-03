"""
Management command to create a Django superuser from environment variables.
Runs non-interactively — safe for use in build/deploy scripts.

Required env vars:
    DJANGO_SUPERUSER_USERNAME  — must be 3+ chars, alphanumeric/._-
    DJANGO_SUPERUSER_PASSWORD  — must pass Django's password validators (min 8 chars, not common)
    DJANGO_SUPERUSER_EMAIL     (optional, defaults to empty)
    DJANGO_SUPERUSER_NAME      (optional, defaults to username)
"""

import os
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
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

        # Validate password strength before attempting creation
        try:
            validate_password(password)
        except ValidationError as exc:
            self.stdout.write(self.style.ERROR(
                f'Superuser password is too weak: {"; ".join(exc.messages)}\n'
                'Set a stronger DJANGO_SUPERUSER_PASSWORD (min 8 chars, not a common password).'
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
            name=name or username,
            role='admin',
            facility='MoH Headquarters',
        )
        self.stdout.write(self.style.SUCCESS(
            f'✅  Superuser "{username}" created successfully.'
        ))
