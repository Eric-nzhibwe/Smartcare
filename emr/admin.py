from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import AuditLog, Facility, User, Patient, Encounter


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display  = ['name', 'facility_type', 'province', 'district', 'is_active']
    list_filter   = ['facility_type', 'province', 'is_active']
    search_fields = ['name', 'district', 'province']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('SmartCare', {'fields': ('name', 'role', 'facility', 'facility_ref')}),
    )
    list_display  = ['username', 'name', 'role', 'facility_name', 'is_staff', 'is_active']
    list_filter   = ['role', 'is_active']
    search_fields = ['username', 'name', 'email']

    def facility_name(self, obj):
        return obj.facility_name
    facility_name.short_description = 'Facility'


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display  = ['smart_id', 'first_name', 'last_name', 'gender',
                     'province', 'facility', 'status', 'registered_at']
    search_fields = ['smart_id', 'first_name', 'last_name', 'nrc_number', 'phone']
    list_filter   = ['gender', 'province', 'status']


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display  = ['patient', 'encounter_type', 'visit_date',
                     'diagnosis', 'clinician', 'facility']
    search_fields = ['patient__first_name', 'patient__last_name', 'diagnosis']
    list_filter   = ['encounter_type', 'facility']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ['timestamp', 'user', 'action', 'model_name', 'object_id', 'description']
    list_filter   = ['action', 'model_name']
    search_fields = ['user__username', 'description']
    readonly_fields = ['timestamp', 'user', 'action', 'model_name', 'object_id', 'description']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
