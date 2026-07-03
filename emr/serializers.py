import html
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AuditLog, Facility, User, Patient, Encounter


# ── helpers ───────────────────────────────────────────────────────────────────

def _esc(value):
    """HTML-escape a string to prevent stored-XSS via innerHTML injection."""
    if isinstance(value, str):
        return html.escape(value, quote=True)
    return value


# ── Auth ──────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Returns the standard access/refresh tokens plus a flat `user` object
    that the frontend stores in localStorage.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        # Keep the refresh token for the client to use for silent re-auth
        data['token'] = data.pop('access')   # frontend expects key 'token'
        data['user'] = {
            'id':       user.id,
            'name':     _esc(user.name),
            'role':     user.role,
            'facility': _esc(user.facility_name),
        }
        return data


# ── Facility ──────────────────────────────────────────────────────────────────

class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Facility
        fields = ['id', 'name', 'district', 'province', 'facility_type', 'is_active']


# ── User ──────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    created_at   = serializers.DateTimeField(source='date_joined', read_only=True)
    facility_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'name', 'username', 'role', 'facility', 'facility_name', 'created_at']

    def get_facility_name(self, obj):
        return _esc(obj.facility_name)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['name', 'username', 'password', 'role', 'facility']

    def validate_password(self, value):
        """Run Django's built-in password validators."""
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_username(self, value):
        """
        Enforce username rules:
        - 3–30 characters
        - alphanumeric plus . _ - only
        - cannot be purely numeric
        """
        import re
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError('Username must be at least 3 characters.')
        if len(value) > 30:
            raise serializers.ValidationError('Username must be 30 characters or fewer.')
        if not re.match(r'^[a-zA-Z0-9._-]+$', value):
            raise serializers.ValidationError(
                'Username may only contain letters, digits, and . _ -'
            )
        if value.isdigit():
            raise serializers.ValidationError('Username cannot be purely numeric.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientSerializer(serializers.ModelSerializer):
    registered_at = serializers.DateTimeField(read_only=True)
    facility_name = serializers.SerializerMethodField()

    class Meta:
        model  = Patient
        fields = '__all__'
        read_only_fields = ['id', 'smart_id', 'registered_by', 'registered_at']

    def get_facility_name(self, obj):
        return _esc(obj.facility_name)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Escape string fields that will be injected into innerHTML on the frontend
        for field in ('first_name', 'last_name', 'allergies', 'address',
                      'next_of_kin', 'notes', 'nrc_number'):
            if field in data and isinstance(data[field], str):
                data[field] = _esc(data[field])
        return data


# ── Encounter ─────────────────────────────────────────────────────────────────

class EncounterSerializer(serializers.ModelSerializer):
    clinician_name = serializers.SerializerMethodField()

    class Meta:
        model  = Encounter
        fields = '__all__'
        read_only_fields = ['id', 'clinician', 'created_at']

    def get_clinician_name(self, obj):
        return _esc(obj.clinician.name) if obj.clinician else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for field in ('chief_complaint', 'diagnosis', 'treatment',
                      'medications', 'notes', 'facility'):
            if field in data and isinstance(data[field], str):
                data[field] = _esc(data[field])
        return data


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = AuditLog
        fields = ['id', 'user_name', 'action', 'model_name', 'object_id',
                  'description', 'timestamp']

    def get_user_name(self, obj):
        return obj.user.name if obj.user else '—'
