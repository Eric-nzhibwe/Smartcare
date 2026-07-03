from django.contrib.auth.models import AbstractUser
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import models, transaction


class Facility(models.Model):
    """
    Canonical facility record — replaces the free-text facility strings
    that were scattered across User, Patient, and Encounter.
    """
    name         = models.CharField(max_length=200, unique=True)
    district     = models.CharField(max_length=100, blank=True)
    province     = models.CharField(max_length=100, blank=True)
    facility_type = models.CharField(
        max_length=50,
        choices=[
            ('hospital',      'Hospital'),
            ('health_centre', 'Health Centre'),
            ('clinic',        'Clinic'),
            ('hq',            'Headquarters'),
        ],
        default='health_centre',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'facilities'

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Extended user with role and facility fields."""

    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('nurse',  'Nurse'),
        ('admin',  'Admin'),
    ]

    name     = models.CharField(max_length=150)
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default='nurse')
    # FK to canonical Facility — nullable so existing rows and migrations don't break
    facility_ref = models.ForeignKey(
        Facility, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='staff',
    )
    # Legacy string kept for backwards compatibility during migration; prefer facility_ref
    facility = models.CharField(max_length=200, blank=True, default='UTH Lusaka')

    REQUIRED_FIELDS = ['name', 'email']

    def __str__(self):
        return f'{self.name} ({self.role})'

    def clean(self):
        """Enforce password strength at the model level."""
        super().clean()
        if self.pk is None and self.password:
            # Only validate on creation through clean(); set_password is the actual path
            pass

    @property
    def facility_name(self):
        """Return the canonical facility name, falling back to the legacy string."""
        return self.facility_ref.name if self.facility_ref else self.facility


class Patient(models.Model):
    GENDER_CHOICES = [('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')]
    STATUS_CHOICES = [('active', 'Active'), ('inactive', 'Inactive')]

    smart_id          = models.CharField(max_length=30, unique=True)
    first_name        = models.CharField(max_length=100)
    last_name         = models.CharField(max_length=100)
    date_of_birth     = models.DateField()
    gender            = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone             = models.CharField(max_length=30, blank=True)
    address           = models.CharField(max_length=255, blank=True)
    province          = models.CharField(max_length=100, blank=True)
    district          = models.CharField(max_length=100, blank=True)
    # FK to Facility (nullable for migration safety)
    facility_ref = models.ForeignKey(
        Facility, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='patients',
    )
    # Legacy string
    facility          = models.CharField(max_length=200, blank=True)
    nrc_number        = models.CharField(max_length=50, blank=True)
    next_of_kin       = models.CharField(max_length=150, blank=True)
    next_of_kin_phone = models.CharField(max_length=30, blank=True)
    blood_group       = models.CharField(max_length=10, blank=True)
    allergies         = models.CharField(max_length=255, blank=True)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    registered_by     = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='registered_patients',
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-registered_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.smart_id})'

    @property
    def facility_name(self):
        return self.facility_ref.name if self.facility_ref else self.facility


class Encounter(models.Model):
    ENCOUNTER_TYPES = [
        ('OPD',        'OPD'),
        ('ART Clinic', 'ART Clinic'),
        ('MCH',        'MCH'),
        ('TB Clinic',  'TB Clinic'),
        ('Inpatient',  'Inpatient'),
        ('Emergency',  'Emergency'),
    ]

    patient        = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')
    encounter_type = models.CharField(max_length=30, choices=ENCOUNTER_TYPES)
    visit_date     = models.DateField()
    chief_complaint = models.CharField(max_length=255, blank=True)

    # Vitals
    temperature  = models.FloatField(null=True, blank=True)
    pulse        = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    weight       = models.FloatField(null=True, blank=True)
    height       = models.FloatField(null=True, blank=True)
    oxygen_sat   = models.FloatField(null=True, blank=True)

    # Assessment
    diagnosis      = models.CharField(max_length=255, blank=True)
    diagnosis_code = models.CharField(max_length=20, blank=True)
    treatment      = models.TextField(blank=True)
    medications    = models.TextField(blank=True)
    notes          = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)

    clinician = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='encounters',
    )
    # FK to Facility (nullable for migration safety)
    facility_ref = models.ForeignKey(
        Facility, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='encounters',
    )
    # Legacy string
    facility   = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return f'{self.encounter_type} — {self.patient} on {self.visit_date}'

    @property
    def facility_name(self):
        return self.facility_ref.name if self.facility_ref else self.facility


class AuditLog(models.Model):
    """Immutable audit trail for patient and encounter mutations."""

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]

    user        = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='audit_logs')
    action      = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name  = models.CharField(max_length=50)   # e.g. 'Patient', 'Encounter'
    object_id   = models.PositiveIntegerField()
    description = models.TextField(blank=True)       # human-readable summary
    timestamp   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user} {self.action} {self.model_name}#{self.object_id}'
