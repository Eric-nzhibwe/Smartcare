from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Patient, Encounter


# ── Auth ──────────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Returns the standard access/refresh tokens plus a flat `user` object
    that the frontend stores in localStorage.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['token'] = data.pop('access')   # frontend expects key 'token'
        data['user'] = {
            'id': user.id,
            'name': user.name,
            'role': user.role,
            'facility': user.facility,
        }
        return data


# ── User ──────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'role', 'facility', 'created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'username', 'password', 'role', 'facility']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ── Patient ───────────────────────────────────────────────────────────────────

class PatientSerializer(serializers.ModelSerializer):
    registered_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['id', 'smart_id', 'registered_by', 'registered_at']


# ── Encounter ─────────────────────────────────────────────────────────────────

class EncounterSerializer(serializers.ModelSerializer):
    clinician_name = serializers.SerializerMethodField()

    class Meta:
        model = Encounter
        fields = '__all__'
        read_only_fields = ['id', 'clinician', 'created_at']

    def get_clinician_name(self, obj):
        return obj.clinician.name if obj.clinician else None
