from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user with role and facility fields."""

    ROLE_CHOICES = [
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('admin', 'Admin'),
    ]

    name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='nurse')
    facility = models.CharField(max_length=200, blank=True, default='UTH Lusaka')

    # Keep AbstractUser's username / password fields
    REQUIRED_FIELDS = ['name', 'email']

    def __str__(self):
        return f'{self.name} ({self.role})'


class Patient(models.Model):
    GENDER_CHOICES = [('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')]
    STATUS_CHOICES = [('active', 'Active'), ('inactive', 'Inactive')]

    smart_id = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    province = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    facility = models.CharField(max_length=200, blank=True)
    nrc_number = models.CharField(max_length=50, blank=True)
    next_of_kin = models.CharField(max_length=150, blank=True)
    next_of_kin_phone = models.CharField(max_length=30, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    allergies = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    registered_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='registered_patients'
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-registered_at']

    def __str__(self):
        return f'{self.first_name} {self.last_name} ({self.smart_id})'


class Encounter(models.Model):
    ENCOUNTER_TYPES = [
        ('OPD', 'OPD'),
        ('ART Clinic', 'ART Clinic'),
        ('MCH', 'MCH'),
        ('TB Clinic', 'TB Clinic'),
        ('Inpatient', 'Inpatient'),
        ('Emergency', 'Emergency'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='encounters')
    encounter_type = models.CharField(max_length=30, choices=ENCOUNTER_TYPES)
    visit_date = models.DateField()
    chief_complaint = models.CharField(max_length=255, blank=True)

    # Vitals
    temperature = models.FloatField(null=True, blank=True)
    pulse = models.IntegerField(null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    oxygen_sat = models.FloatField(null=True, blank=True)

    # Assessment
    diagnosis = models.CharField(max_length=255, blank=True)
    diagnosis_code = models.CharField(max_length=20, blank=True)
    treatment = models.TextField(blank=True)
    medications = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)

    clinician = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='encounters'
    )
    facility = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return f'{self.encounter_type} — {self.patient} on {self.visit_date}'
