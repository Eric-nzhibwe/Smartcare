import datetime
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Patient, Encounter
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    UserCreateSerializer,
    PatientSerializer,
    EncounterSerializer,
)


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    """
    POST /api/login
    Accepts { username, password } and returns { token, user }.
    Maps simplejwt's /token/ endpoint to the /api/login path the frontend uses.
    On failure returns { error: '...' } to match the original Flask shape.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 401:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/me — return current user payload."""
    user = request.user
    return Response({
        'user_id': user.id,
        'name': user.name,
        'role': user.role,
        'facility': user.facility,
    })


# ── Patients ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def patients(request):
    if request.method == 'GET':
        q = request.query_params.get('q', '').strip()
        qs = Patient.objects.all()
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(smart_id__icontains=q) |
                Q(nrc_number__icontains=q) |
                Q(phone__icontains=q)
            )
        serializer = PatientSerializer(qs, many=True)
        return Response(serializer.data)

    # POST — register new patient
    count = Patient.objects.count()
    smart_id = f"SC-{datetime.date.today().year}-{str(count + 1).zfill(6)}"

    data = request.data.copy()
    data['smart_id'] = smart_id

    serializer = PatientSerializer(data=data)
    if serializer.is_valid():
        serializer.save(registered_by=request.user)
        return Response(
            {'success': True, 'smart_id': smart_id, 'id': serializer.instance.id},
            status=status.HTTP_201_CREATED,
        )
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def patient_detail(request, pid):
    try:
        patient = Patient.objects.get(pk=pid)
    except Patient.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        encounters = Encounter.objects.filter(patient=patient).select_related('clinician')
        return Response({
            'patient': PatientSerializer(patient).data,
            'encounters': EncounterSerializer(encounters, many=True).data,
        })

    # PUT — update patient
    serializer = PatientSerializer(patient, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({'success': True})
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ── Encounters ────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_encounter(request):
    serializer = EncounterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(clinician=request.user)
        return Response({'success': True}, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def patch_vitals(request, eid):
    """
    PATCH /api/encounters/<eid>/vitals
    Nurse quick-vitals: update only the vitals fields on an existing encounter.
    """
    try:
        encounter = Encounter.objects.get(pk=eid)
    except Encounter.DoesNotExist:
        return Response({'error': 'Encounter not found'}, status=status.HTTP_404_NOT_FOUND)

    vitals_fields = ['temperature', 'pulse', 'blood_pressure', 'weight', 'height', 'oxygen_sat']
    for field in vitals_fields:
        val = request.data.get(field)
        if val not in (None, ''):
            setattr(encounter, field, val)
    encounter.save()
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
    """
    System-wide view for admins:
    - System-wide totals
    - Facility comparison
    - Province & gender distribution
    - Monthly trend (all facilities)
    - Top diagnoses system-wide
    - Recent registrations & encounters
    - User list summary
    """
    today = datetime.date.today()
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

    # Facility comparison — patients and encounters per facility
    facility_patients = list(
        Patient.objects.values('facility').annotate(cnt=Count('id')).order_by('-cnt')[:8]
    )
    facility_encounters = list(
        Encounter.objects.values('facility').annotate(cnt=Count('id')).order_by('-cnt')[:8]
    )

    # Monthly trend
    raw = (Encounter.objects.filter(visit_date__gte=six_months_ago)
           .values('visit_date').annotate(cnt=Count('id')))
    month_counts: dict[str, int] = {}
    for row in raw:
        m = str(row['visit_date'])[:7]
        month_counts[m] = month_counts.get(m, 0) + row['cnt']
    monthly_trend = [{'month': m, 'cnt': c} for m, c in sorted(month_counts.items())]

    recent_patients = Patient.objects.order_by('-registered_at')[:5]
    recent_encounters = Encounter.objects.select_related('patient').order_by('-created_at')[:5]
    recent_enc_data = []
    for e in recent_encounters:
        d = EncounterSerializer(e).data
        d['patient_name'] = f'{e.patient.first_name} {e.patient.last_name}'
        d['smart_id'] = e.patient.smart_id
        recent_enc_data.append(d)

    top_diagnoses = list(
        Encounter.objects.exclude(diagnosis='')
        .values('diagnosis').annotate(cnt=Count('id')).order_by('-cnt')[:5]
    )

    # New registrations this week
    week_ago = today - datetime.timedelta(days=7)
    new_this_week = Patient.objects.filter(registered_at__date__gte=week_ago).count()

    return Response({
        'role': 'admin',
        'stats': {
            'total_patients':     total_patients,
            'total_encounters':   total_encounters,
            'today_encounters':   today_encounters,
            'monthly_encounters': monthly_encounters,
            'total_users':        total_users,
            'new_this_week':      new_this_week,
        },
        'gender_dist':        gender_dist,
        'province_dist':      province_dist,
        'enc_types':          enc_types,
        'facility_patients':  facility_patients,
        'facility_encounters': facility_encounters,
        'monthly_trend':      monthly_trend,
        'recent_patients':    PatientSerializer(recent_patients, many=True).data,
        'recent_encounters':  recent_enc_data,
        'top_diagnoses':      top_diagnoses,
    })


def _doctor_dashboard(request):
    """
    Clinical view for doctors:
    - My patient count and encounter totals
    - Upcoming follow-ups (patients I need to see)
    - My recent encounters
    - My top diagnoses
    - Patients I registered
    - Monthly workload trend
    """
    user  = request.user
    today = datetime.date.today()
    six_months_ago = today - datetime.timedelta(days=180)

    my_encounters   = Encounter.objects.filter(clinician=user)
    my_patient_ids  = my_encounters.values_list('patient_id', flat=True).distinct()
    my_patients     = Patient.objects.filter(id__in=my_patient_ids)

    total_my_patients   = my_patients.count()
    total_my_encounters = my_encounters.count()
    today_my_encounters = my_encounters.filter(visit_date=today).count()
    monthly_my_encounters = my_encounters.filter(
        visit_date__year=today.year, visit_date__month=today.month
    ).count()

    # Upcoming follow-ups in the next 14 days where no newer encounter exists
    in_14_days = today + datetime.timedelta(days=14)
    upcoming_followups_qs = (
        my_encounters
        .filter(follow_up_date__gte=today, follow_up_date__lte=in_14_days)
        .select_related('patient')
        .order_by('follow_up_date')[:10]
    )
    upcoming_followups = []
    for e in upcoming_followups_qs:
        upcoming_followups.append({
            'patient_name':   f'{e.patient.first_name} {e.patient.last_name}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'last_diagnosis': e.diagnosis,
            'days_away':      (e.follow_up_date - today).days,
        })

    # Overdue follow-ups (past due, no newer encounter recorded)
    overdue_qs = (
        my_encounters
        .filter(follow_up_date__lt=today)
        .select_related('patient')
        .order_by('-follow_up_date')[:5]
    )
    overdue_followups = []
    for e in overdue_qs:
        overdue_followups.append({
            'patient_name':   f'{e.patient.first_name} {e.patient.last_name}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'last_diagnosis': e.diagnosis,
            'days_overdue':   (today - e.follow_up_date).days,
        })

    # My recent encounters
    recent_enc_qs = my_encounters.select_related('patient').order_by('-created_at')[:8]
    recent_enc_data = []
    for e in recent_enc_qs:
        d = EncounterSerializer(e).data
        d['patient_name'] = f'{e.patient.first_name} {e.patient.last_name}'
        d['smart_id'] = e.patient.smart_id
        recent_enc_data.append(d)

    # My top diagnoses
    my_top_diagnoses = list(
        my_encounters.exclude(diagnosis='')
        .values('diagnosis').annotate(cnt=Count('id')).order_by('-cnt')[:5]
    )

    # My encounter type breakdown
    my_enc_types = list(
        my_encounters.values('encounter_type').annotate(cnt=Count('id')).order_by('-cnt')
    )

    # Monthly workload trend
    raw = (my_encounters.filter(visit_date__gte=six_months_ago)
           .values('visit_date').annotate(cnt=Count('id')))
    month_counts: dict[str, int] = {}
    for row in raw:
        m = str(row['visit_date'])[:7]
        month_counts[m] = month_counts.get(m, 0) + row['cnt']
    monthly_trend = [{'month': m, 'cnt': c} for m, c in sorted(month_counts.items())]

    # Recently registered patients (by anyone at same facility)
    recent_patients = (
        Patient.objects.filter(facility=user.facility)
        .order_by('-registered_at')[:5]
    )

    return Response({
        'role': 'doctor',
        'clinician_name': user.name,
        'facility': user.facility,
        'stats': {
            'total_my_patients':     total_my_patients,
            'total_my_encounters':   total_my_encounters,
            'today_my_encounters':   today_my_encounters,
            'monthly_my_encounters': monthly_my_encounters,
            'upcoming_followups':    len(upcoming_followups),
            'overdue_followups':     len(overdue_followups),
        },
        'upcoming_followups':  upcoming_followups,
        'overdue_followups':   overdue_followups,
        'recent_encounters':   recent_enc_data,
        'top_diagnoses':       my_top_diagnoses,
        'enc_types':           my_enc_types,
        'monthly_trend':       monthly_trend,
        'recent_patients':     PatientSerializer(recent_patients, many=True).data,
    })


def _nurse_dashboard(request):
    """
    Operational view for nurses — what they actually do each shift:
    - Triage queue: today's encounters at their facility with vitals status
    - Quick-record vitals on any patient
    - Upcoming follow-ups (next 7 days) so they can prep the clinic
    - Overdue follow-ups needing a call/re-booking
    - Allergy alert list — patients with known allergies
    - Stat cards: facility patients, registered today, encounters today, pending vitals
    """
    user     = request.user
    today    = datetime.date.today()
    week_ago = today - datetime.timedelta(days=7)
    in_7_days = today + datetime.timedelta(days=7)
    facility  = user.facility

    # ── facility-scoped querysets ─────────────────────────────────────────────
    facility_patients   = Patient.objects.filter(facility=facility)
    facility_encounters = Encounter.objects.filter(facility=facility)

    # ── stat counts ───────────────────────────────────────────────────────────
    total_patients     = facility_patients.count()
    registered_today   = facility_patients.filter(registered_at__date=today).count()
    registered_week    = facility_patients.filter(registered_at__date__gte=week_ago).count()
    encounters_today   = facility_encounters.filter(visit_date=today).count()
    encounters_month   = facility_encounters.filter(
        visit_date__year=today.year, visit_date__month=today.month
    ).count()

    # ── triage queue: today's encounters, enriched with vitals status ─────────
    todays_enc_qs = (
        facility_encounters
        .filter(visit_date=today)
        .select_related('patient', 'clinician')
        .order_by('-created_at')[:30]
    )
    todays_queue = []
    vitals_pending_count = 0
    for e in todays_enc_qs:
        has_vitals = bool(
            e.temperature or e.pulse or e.blood_pressure or e.weight or e.oxygen_sat
        )
        if not has_vitals:
            vitals_pending_count += 1
        allergy_str = e.patient.allergies or ''
        has_allergy = allergy_str not in ('', 'None', 'none', 'N/A')
        todays_queue.append({
            'encounter_id':    e.id,
            'patient_name':    f'{e.patient.first_name} {e.patient.last_name}',
            'patient_id':      e.patient.id,
            'smart_id':        e.patient.smart_id,
            'age':             (today - e.patient.date_of_birth).days // 365,
            'gender':          e.patient.gender,
            'encounter_type':  e.encounter_type,
            'chief_complaint': e.chief_complaint,
            'clinician_name':  e.clinician.name if e.clinician else '—',
            'has_vitals':      has_vitals,
            'vitals_summary':  (
                f'BP {e.blood_pressure}' if e.blood_pressure else
                (f'T {e.temperature}°C' if e.temperature else '—')
            ),
            'has_allergy':     has_allergy,
            'allergies':       allergy_str if has_allergy else '',
        })

    # ── upcoming follow-ups at this facility (next 7 days) ────────────────────
    followup_qs = (
        facility_encounters
        .filter(follow_up_date__gte=today, follow_up_date__lte=in_7_days)
        .select_related('patient', 'clinician')
        .order_by('follow_up_date')[:15]
    )
    upcoming_followups = []
    for e in followup_qs:
        upcoming_followups.append({
            'encounter_id':   e.id,
            'patient_name':   f'{e.patient.first_name} {e.patient.last_name}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'encounter_type': e.encounter_type,
            'last_diagnosis': e.diagnosis,
            'clinician_name': e.clinician.name if e.clinician else '—',
            'days_away':      (e.follow_up_date - today).days,
        })

    # ── overdue follow-ups at this facility ───────────────────────────────────
    overdue_qs = (
        facility_encounters
        .filter(follow_up_date__lt=today)
        .select_related('patient', 'clinician')
        .order_by('-follow_up_date')[:10]
    )
    overdue_followups = []
    for e in overdue_qs:
        overdue_followups.append({
            'encounter_id':   e.id,
            'patient_name':   f'{e.patient.first_name} {e.patient.last_name}',
            'patient_id':     e.patient.id,
            'smart_id':       e.patient.smart_id,
            'follow_up_date': str(e.follow_up_date),
            'encounter_type': e.encounter_type,
            'last_diagnosis': e.diagnosis,
            'clinician_name': e.clinician.name if e.clinician else '—',
            'days_overdue':   (today - e.follow_up_date).days,
        })

    # ── allergy alert list ────────────────────────────────────────────────────
    allergy_qs = (
        facility_patients
        .exclude(allergies='').exclude(allergies='None')
        .exclude(allergies='none').exclude(allergies='N/A')
        .order_by('first_name')[:20]
    )
    allergy_patients = []
    for p in allergy_qs:
        allergy_patients.append({
            'patient_id':  p.id,
            'patient_name': f'{p.first_name} {p.last_name}',
            'smart_id':    p.smart_id,
            'allergies':   p.allergies,
            'blood_group': p.blood_group,
        })

    # ── encounter type breakdown for this facility ────────────────────────────
    enc_types = list(
        facility_encounters
        .values('encounter_type').annotate(cnt=Count('id')).order_by('-cnt')
    )

    # ── recently registered patients ──────────────────────────────────────────
    recent_patients = facility_patients.order_by('-registered_at')[:6]

    return Response({
        'role':              'nurse',
        'nurse_name':        user.name,
        'facility':          facility,
        'stats': {
            'total_patients':       total_patients,
            'registered_today':     registered_today,
            'registered_week':      registered_week,
            'encounters_today':     encounters_today,
            'encounters_month':     encounters_month,
            'vitals_pending':       vitals_pending_count,
            'upcoming_followups':   len(upcoming_followups),
            'overdue_followups':    len(overdue_followups),
            'allergy_count':        len(allergy_patients),
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
        serializer.save()
        return Response({'success': True}, status=status.HTTP_201_CREATED)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
