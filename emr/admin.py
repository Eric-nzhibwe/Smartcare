from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Patient, Encounter


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('SmartCare', {'fields': ('name', 'role', 'facility')}),
    )
    list_display = ['username', 'name', 'role', 'facility', 'is_staff']
    list_filter = ['role', 'facility']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['smart_id', 'first_name', 'last_name', 'gender', 'province', 'facility', 'registered_at']
    search_fields = ['smart_id', 'first_name', 'last_name', 'nrc_number', 'phone']
    list_filter = ['gender', 'province', 'status']


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ['patient', 'encounter_type', 'visit_date', 'diagnosis', 'clinician', 'facility']
    search_fields = ['patient__first_name', 'patient__last_name', 'diagnosis']
    list_filter = ['encounter_type', 'facility']
