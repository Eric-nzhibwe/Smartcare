import datetime
import html as html_mod
from django.db import transaction
from django.db.models import Count, Q, Exists, OuterRef
from django.db.models.functions import TruncMonth
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import AuditLog, Facility, User, Patient, Encounter
from .serializers import (
    AuditLogSerializer,
    CustomTokenObtainPairSerializer,
    FacilitySerializer,
    UserSerializer,
    UserCreateSerializer,
    PatientSerializer,
    EncounterSerializer,
)

# ── helpers ───────────────────────────────────────────────────────────────────

def _log(user, action, model_name, object_id, description=''):
    AuditLog.objects.create(
        user=user, action=action,
        model_name=model_name, object_id=object_id,
        description=description,
    )


def _facility_filter(user):
    """
    Return a Q object that restricts a queryset to the requesting user's
    facility (for nurses and doctors). Admins see everything.
    """
    if user.role == 'admin':
        return Q()
    fac = user.facility_name
    return Q(facility=fac) | Q(facility_ref__name=fac)


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """
    POST /api/login
    Accepts { username, password } → { token, refresh, user }.
    """
    serializer_class  = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 400:
            return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if response.status_code == 401:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """
    POST /api/token/refresh
    Accepts { refresh } → { token, refresh } with rotation.
    On success the old refresh token is blacklisted.
    """
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'error': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        old_token   = RefreshToken(refresh_token)
        new_access  = str(old_token.access_token)
        new_refresh = str(old_token)       # rotation produces a new refresh token
        old_token.blacklist()              # invalidate the old one only after capturing both
        return Response({'token': new_access, 'refresh': new_refresh})
    except TokenError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    POST /api/logout
    Accepts { refresh } and blacklists the refresh token so it can't be reused.
    """
    refresh_token = request.data.get('refresh')
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass   # already invalid — that's fine
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/me — return current user payload."""
    user = request.user
    return Response({
        'user_id':  user.id,
        'name':     html_mod.escape(user.name),
        'role':     user.role,
        'facility': html_mod.escape(user.facility_name),
    })


# ── Patients ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def patients(request):
    if request.method == 'GET':
        q  = request.data.get('q', request.query_params.get('q', '')).strip()
        # Facility scoping: non-admins only see their own facility's patients
        qs = Patient.objects.filter(_facility_filter(request.user))
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)  |
                Q(last_name__icontains=q)   |
                Q(smart_id__icontains=q)    |
                Q(nrc_number__icontains=q)  |
                Q(phone__icontains=q)
            )
        # Honour ?status= filter
        status_param = request.query_params.get('status')
        if status_param in ('active', 'inactive'):
            qs = qs.filter(status=status_param)

        serializer = PatientSerializer(qs, many=True)
        return Response(serializer.data)

    # POST — register new patient
    # Atomic SmartID generation to avoid race conditions
    with transaction.atomic():
        # Lock the table for the count so two concurrent requests can't get the same number
        count = Patient.objects.select_for_update().count()
        smart_id = f"SC-{datetime.date.today().year}-{str(count + 1).zfill(6)}"

        data = request.data.copy()
        data['smart_id'] = smart_id

        serializer = PatientSerializer(data=data)
        if serializer.is_valid():
            patient = serializer.save(registered_by=request.user)
            _log(request.user, 'create', 'Patient', patient.id,
                 f'Registered {patient.first_name} {patient.last_name} ({smart_id})')
            return Response(
                {'success': True, 'smart_id': smart_id, 'id': patient.id},
                status=status.HTTP_201_CREATED,
            )
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def patient_detail(request, pid):
    # Scoped lookup — non-admins cannot fetch patients outside their facility
    try:
        patient = Patient.objects.filter(_facility_filter(request.user)).get(pk=pid)
    except Patient.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        encounters = Encounter.objects.filter(patient=patient).select_related('clinician')
        return Response({
            'patient':    PatientSerializer(patient).data,
            'encounters': EncounterSerializer(encounters, many=True).data,
        })

    # PUT — update patient
    serializer = PatientSerializer(patient, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        _log(request.user, 'update', 'Patient', patient.id,
             f'Updated patient {patient.smart_id}')
        return Response({'success': True})
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ── Encounters ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def encounters(request):
    """
    GET  /api/encounters  — paginated encounter list with optional filters
    POST /api/encounters  — create a new encounter
    """
    if request.method == 'GET':
        qs = Encounter.objects.filter(
            _facility_filter(request.user)
        ).select_related('patient', 'clinician')

        # Optional filters
        patient_id = request.query_params.get('patient')
        enc_type   = request.query_params.get('type')
        date_from  = request.query_params.get('from')
        date_to    = request.query_params.get('to')

        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if enc_type:
            qs = qs.filter(encounter_type=enc_type)
        if date_from:
            qs = qs.filter(visit_date__gte=date_from)
        if date_to:
            qs = qs.filter(visit_date__lte=date_to)

        # Pagination
        try:
            page      = max(1, int(request.query_params.get('page', 1)))
            page_size = min(100, max(1, int(request.query_params.get('page_size', 25))))
        except (ValueError, TypeError):
            page, page_size = 1, 25

        total = qs.count()
        start = (page - 1) * page_size
        end   = start + page_size
        slice_qs = qs[start:end]

        results = []
        for e in slice_qs:
            d = EncounterSerializer(e).data
            d['patient_name'] = f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}'
            d['smart_id']     = e.patient.smart_id
            results.append(d)

        return Response({
            'results':    results,
            'total':      total,
            'page':       page,
            'page_size':  page_size,
            'num_pages':  (total + page_size - 1) // page_size,
        })

    # POST — create encounter
    serializer = EncounterSerializer(data=request.data)
    if serializer.is_valid():
        enc = serializer.save(clinician=request.user)
        _log(request.user, 'create', 'Encounter', enc.id,
             f'{enc.encounter_type} for patient {enc.patient_id} on {enc.visit_date}')
        return Response({'success': True, 'id': enc.id}, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def patch_vitals(request, eid):
    """
    PATCH /api/encounters/<eid>/vitals
    Nurse quick-vitals: update only the vitals fields on an existing encounter.
    """
    try:
        encounter = Encounter.objects.filter(
            _facility_filter(request.user)
        ).get(pk=eid)
    except Encounter.DoesNotExist:
        return Response({'error': 'Encounter not found'}, status=status.HTTP_404_NOT_FOUND)

    vitals_fields = ['temperature', 'pulse', 'blood_pressure', 'weight', 'height', 'oxygen_sat']
    updated = []
    for field in vitals_fields:
        val = request.data.get(field)
        if val not in (None, ''):
            setattr(encounter, field, val)
            updated.append(field)
    encounter.save()

    if updated:
        _log(request.user, 'update', 'Encounter', encounter.id,
             f'Vitals updated: {", ".join(updated)}')

    return Response({'success': True})


# ── Dashboard ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    """Route to the correct dashboard based on the user's role."""
    role = request.user.role
    if role == 'doctor':
        return _doctor_dashboard(request)
    elif role == 'nurse':
        return _nurse_dashboard(request)
    else:
        return _admin_dashboard(request)


def _admin_dashboard(request):
    today          = datetime.date.today()
    six_months_ago = today - datetime.timedelta(days=180)

    total_patients    = Patient.objects.count()
    total_encounters  = Encounter.objects.count()
    today_encounters  = Encounter.objects.filter(visit_date=today).count()
    monthly_encounters = Encounter.objects.filter(
        visit_date__year=today.year, visit_date__month=today.month
    ).count()
    total_users = User.objects.count()

    gender_dist   = list(Patient.objects.values('gender').annotate(cnt=Count('id')).order_by('-cnt'))
    province_dist = list(Patient.objects.values('province').annotate(cnt=Count('id')).order_by('-cnt')[:8])
    enc_types     = list(Encounter.objects.values('encounter_type').annotate(cnt=Count('id')).order_by('-cnt'))

    facility_patients = list(
        Patient.objects.values('facility').annotate(cnt=Count('id')).order_by('-cnt')[:8]
    )
    facility_encounters = list(
        Encounter.objects.values('facility').annotate(cnt=Count('id')).order_by('-cnt')[:8]
    )

    raw = (Encounter.objects.filter(visit_date__gte=six_months_ago)
           .values('visit_date').annotate(cnt=Count('id')))
    month_counts: dict[str, int] = {}
    for row in raw:
        m = str(row['visit_date'])[:7]
        month_counts[m] = month_counts.get(m, 0) + row['cnt']
    monthly_trend = [{'month': m, 'cnt': c} for m, c in sorted(month_counts.items())]

    recent_patients  = Patient.objects.order_by('-registered_at')[:5]
    recent_encounters = Encounter.objects.select_related('patient').order_by('-created_at')[:5]
    recent_enc_data  = []
    for e in recent_encounters:
        d = EncounterSerializer(e).data
        d['patient_name'] = f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}'
        d['smart_id']     = e.patient.smart_id
        recent_enc_data.append(d)

    top_diagnoses = list(
        Encounter.objects.exclude(diagnosis='')
        .values('diagnosis').annotate(cnt=Count('id')).order_by('-cnt')[:5]
    )

    week_ago     = today - datetime.timedelta(days=7)
    new_this_week = Patient.objects.filter(registered_at__date__gte=week_ago).count()

    # Data quality — server-side aggregation (avoids loading all patients on the client)
    dq_no_phone  = Patient.objects.filter(Q(phone='') | Q(phone__isnull=True)).count()
    dq_no_nrc    = Patient.objects.filter(Q(nrc_number='') | Q(nrc_number__isnull=True)).count()
    dq_no_vitals = Encounter.objects.filter(
        temperature__isnull=True, pulse__isnull=True, blood_pressure=''
    ).count()

    return Response({
        'role':   'admin',
        'stats': {
            'total_patients':     total_patients,
            'total_encounters':   total_encounters,
            'today_encounters':   today_encounters,
            'monthly_encounters': monthly_encounters,
            'total_users':        total_users,
            'new_this_week':      new_this_week,
        },
        'gender_dist':          gender_dist,
        'province_dist':        province_dist,
        'enc_types':            enc_types,
        'facility_patients':    facility_patients,
        'facility_encounters':  facility_encounters,
        'monthly_trend':        monthly_trend,
        'recent_patients':      PatientSerializer(recent_patients, many=True).data,
        'recent_encounters':    recent_enc_data,
        'top_diagnoses':        top_diagnoses,
        'data_quality': {
            'no_phone':  dq_no_phone,
            'no_nrc':    dq_no_nrc,
            'no_vitals': dq_no_vitals,
        },
    })


def _doctor_dashboard(request):
    user  = request.user
    today = datetime.date.today()
    six_months_ago = today - datetime.timedelta(days=180)

    my_encounters  = Encounter.objects.filter(clinician=user)
    my_patient_ids = my_encounters.values_list('patient_id', flat=True).distinct()
    my_patients    = Patient.objects.filter(id__in=my_patient_ids)

    total_my_patients    = my_patients.count()
    total_my_encounters  = my_encounters.count()
    today_my_encounters  = my_encounters.filter(visit_date=today).count()
    monthly_my_encounters = my_encounters.filter(
        visit_date__year=today.year, visit_date__month=today.month
    ).count()

    in_14_days = today + datetime.timedelta(days=14)

    # Upcoming follow-ups: only encounters where no NEWER encounter exists for the same patient
    newer_enc = Encounter.objects.filter(
        patient=OuterRef('patient'),
        visit_date__gt=OuterRef('follow_up_date'),
    )
    upcoming_followups_qs = (
        my_encounters
        .filter(follow_up_date__gte=today, follow_up_date__lte=in_14_days)
        .annotate(has_newer=Exists(newer_enc))
        .filter(has_newer=False)
        .select_related('patient')
        .order_by('follow_up_date')[:10]
    )
    upcoming_followups = []
    for e in upcoming_followups_qs:
        upcoming_followups.append({
            'patient_name':   f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'last_diagnosis': html_mod.escape(e.diagnosis),
            'days_away':      (e.follow_up_date - today).days,
        })

    # Overdue: follow_up_date in the past and no newer encounter attended
    overdue_qs = (
        my_encounters
        .filter(follow_up_date__lt=today)
        .annotate(has_newer=Exists(newer_enc))
        .filter(has_newer=False)
        .select_related('patient')
        .order_by('-follow_up_date')[:5]
    )
    overdue_followups = []
    for e in overdue_qs:
        overdue_followups.append({
            'patient_name':   f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'last_diagnosis': html_mod.escape(e.diagnosis),
            'days_overdue':   (today - e.follow_up_date).days,
        })

    recent_enc_qs   = my_encounters.select_related('patient').order_by('-created_at')[:8]
    recent_enc_data = []
    for e in recent_enc_qs:
        d = EncounterSerializer(e).data
        d['patient_name'] = f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}'
        d['smart_id']     = e.patient.smart_id
        recent_enc_data.append(d)

    my_top_diagnoses = list(
        my_encounters.exclude(diagnosis='')
        .values('diagnosis').annotate(cnt=Count('id')).order_by('-cnt')[:5]
    )
    my_enc_types = list(
        my_encounters.values('encounter_type').annotate(cnt=Count('id')).order_by('-cnt')
    )

    raw = (my_encounters.filter(visit_date__gte=six_months_ago)
           .values('visit_date').annotate(cnt=Count('id')))
    month_counts: dict[str, int] = {}
    for row in raw:
        m = str(row['visit_date'])[:7]
        month_counts[m] = month_counts.get(m, 0) + row['cnt']
    monthly_trend = [{'month': m, 'cnt': c} for m, c in sorted(month_counts.items())]

    recent_patients = (
        Patient.objects.filter(_facility_filter(user))
        .order_by('-registered_at')[:5]
    )

    return Response({
        'role':           'doctor',
        'clinician_name': html_mod.escape(user.name),
        'facility':       html_mod.escape(user.facility_name),
        'stats': {
            'total_my_patients':      total_my_patients,
            'total_my_encounters':    total_my_encounters,
            'today_my_encounters':    today_my_encounters,
            'monthly_my_encounters':  monthly_my_encounters,
            'upcoming_followups':     len(upcoming_followups),
            'overdue_followups':      len(overdue_followups),
        },
        'upcoming_followups': upcoming_followups,
        'overdue_followups':  overdue_followups,
        'recent_encounters':  recent_enc_data,
        'top_diagnoses':      my_top_diagnoses,
        'enc_types':          my_enc_types,
        'monthly_trend':      monthly_trend,
        'recent_patients':    PatientSerializer(recent_patients, many=True).data,
    })


def _nurse_dashboard(request):
    user      = request.user
    today     = datetime.date.today()
    week_ago  = today - datetime.timedelta(days=7)
    in_7_days = today + datetime.timedelta(days=7)

    facility_patients   = Patient.objects.filter(_facility_filter(user))
    facility_encounters = Encounter.objects.filter(_facility_filter(user))

    total_patients    = facility_patients.count()
    registered_today  = facility_patients.filter(registered_at__date=today).count()
    registered_week   = facility_patients.filter(registered_at__date__gte=week_ago).count()
    encounters_today  = facility_encounters.filter(visit_date=today).count()
    encounters_month  = facility_encounters.filter(
        visit_date__year=today.year, visit_date__month=today.month
    ).count()

    todays_enc_qs = (
        facility_encounters
        .filter(visit_date=today)
        .select_related('patient', 'clinician')
        .order_by('-created_at')[:30]
    )
    todays_queue         = []
    vitals_pending_count = 0
    for e in todays_enc_qs:
        has_vitals  = bool(e.temperature or e.pulse or e.blood_pressure or e.weight or e.oxygen_sat)
        allergy_str = e.patient.allergies or ''
        has_allergy = allergy_str not in ('', 'None', 'none', 'N/A')
        if not has_vitals:
            vitals_pending_count += 1
        todays_queue.append({
            'encounter_id':    e.id,
            'patient_name':    f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}',
            'patient_id':      e.patient.id,
            'smart_id':        e.patient.smart_id,
            'age':             (today - e.patient.date_of_birth).days // 365,
            'gender':          e.patient.gender,
            'encounter_type':  e.encounter_type,
            'chief_complaint': html_mod.escape(e.chief_complaint),
            'clinician_name':  html_mod.escape(e.clinician.name) if e.clinician else '—',
            'has_vitals':      has_vitals,
            'vitals_summary':  (
                f'BP {e.blood_pressure}' if e.blood_pressure else
                (f'T {e.temperature}°C'  if e.temperature  else '—')
            ),
            'has_allergy':     has_allergy,
            'allergies':       html_mod.escape(allergy_str) if has_allergy else '',
        })

    # Upcoming follow-ups — exclude those that have already been attended
    newer_enc = Encounter.objects.filter(
        patient=OuterRef('patient'),
        visit_date__gt=OuterRef('follow_up_date'),
    )
    followup_qs = (
        facility_encounters
        .filter(follow_up_date__gte=today, follow_up_date__lte=in_7_days)
        .annotate(has_newer=Exists(newer_enc))
        .filter(has_newer=False)
        .select_related('patient', 'clinician')
        .order_by('follow_up_date')[:15]
    )
    upcoming_followups = []
    for e in followup_qs:
        upcoming_followups.append({
            'encounter_id':   e.id,
            'patient_name':   f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'encounter_type': e.encounter_type,
            'last_diagnosis': html_mod.escape(e.diagnosis),
            'clinician_name': html_mod.escape(e.clinician.name) if e.clinician else '—',
            'days_away':      (e.follow_up_date - today).days,
        })

    overdue_qs = (
        facility_encounters
        .filter(follow_up_date__lt=today)
        .annotate(has_newer=Exists(newer_enc))
        .filter(has_newer=False)
        .select_related('patient', 'clinician')
        .order_by('-follow_up_date')[:10]
    )
    overdue_followups = []
    for e in overdue_qs:
        overdue_followups.append({
            'encounter_id':   e.id,
            'patient_name':   f'{html_mod.escape(e.patient.first_name)} {html_mod.escape(e.patient.last_name)}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'encounter_type': e.encounter_type,
            'last_diagnosis': html_mod.escape(e.diagnosis),
            'clinician_name': html_mod.escape(e.clinician.name) if e.clinician else '—',
            'days_overdue':   (today - e.follow_up_date).days,
        })

    allergy_qs = (
        facility_patients
        .exclude(allergies='').exclude(allergies='None')
        .exclude(allergies='none').exclude(allergies='N/A')
        .order_by('first_name')[:20]
    )
    allergy_patients = [{
        'patient_id':   p.id,
        'patient_name': f'{html_mod.escape(p.first_name)} {html_mod.escape(p.last_name)}',
        'smart_id':     p.smart_id,
        'allergies':    html_mod.escape(p.allergies),
        'blood_group':  p.blood_group,
    } for p in allergy_qs]

    enc_types       = list(
        facility_encounters.values('encounter_type').annotate(cnt=Count('id')).order_by('-cnt')
    )
    recent_patients = facility_patients.order_by('-registered_at')[:6]

    return Response({
        'role':              'nurse',
        'nurse_name':        html_mod.escape(user.name),
        'facility':          html_mod.escape(user.facility_name),
        'stats': {
            'total_patients':     total_patients,
            'registered_today':   registered_today,
            'registered_week':    registered_week,
            'encounters_today':   encounters_today,
            'encounters_month':   encounters_month,
            'vitals_pending':     vitals_pending_count,
            'upcoming_followups': len(upcoming_followups),
            'overdue_followups':  len(overdue_followups),
            'allergy_count':      len(allergy_patients),
        },
        'todays_queue':       todays_queue,
        'upcoming_followups': upcoming_followups,
        'overdue_followups':  overdue_followups,
        'allergy_patients':   allergy_patients,
        'enc_types':          enc_types,
        'recent_patients':    PatientSerializer(recent_patients, many=True).data,
    })


# ── Users ─────────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def users(request):
    if request.method == 'GET':
        qs = User.objects.all().order_by('date_joined')
        return Response(UserSerializer(qs, many=True).data)

    # POST — admin only
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        _log(request.user, 'create', 'User', user.id,
             f'Created user {user.username} ({user.role})')
        return Response({'success': True}, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ── Facilities ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def facilities(request):
    if request.method == 'GET':
        qs = Facility.objects.filter(is_active=True)
        return Response(FacilitySerializer(qs, many=True).data)

    # POST — admin only
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    serializer = FacilitySerializer(data=request.data)
    if serializer.is_valid():
        facility = serializer.save()
        _log(request.user, 'create', 'Facility', facility.id, f'Created facility {facility.name}')
        return Response({'success': True, 'id': facility.id}, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ── Audit log ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log(request):
    """GET /api/audit — admin only. Returns recent audit entries."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

    try:
        limit = min(200, max(1, int(request.query_params.get('limit', 50))))
    except (ValueError, TypeError):
        limit = 50

    qs = AuditLog.objects.select_related('user').order_by('-timestamp')[:limit]
    return Response(AuditLogSerializer(qs, many=True).data)
