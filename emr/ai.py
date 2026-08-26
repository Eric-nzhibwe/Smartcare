"""
SmartCare Groq AI Integration
==============================
All Groq API calls are centralised here.  Patient data sent to the API is
de-identified: names, NRC numbers, phone numbers and addresses are NEVER
included in prompts — only clinical / demographic context.
"""

from __future__ import annotations
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy client — only instantiated when a key is present so the app boots
# normally in environments where GROQ_API_KEY is not set.
# ---------------------------------------------------------------------------
_client = None


def _get_client():
    global _client
    if _client is None:
        from groq import Groq  # deferred import
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key:
            raise RuntimeError(
                'GROQ_API_KEY is not set.  Add it to your environment variables.'
            )
        _client = Groq(api_key=api_key)
    return _client


def _chat(system: str, user: str, max_tokens: int = 600, temperature: float = 0.3) -> str:
    """Low-level wrapper around Groq chat completions."""
    try:
        resp = _get_client().chat.completions.create(
            model='openai/gpt-oss-120b',
            messages=[
                {'role': 'system', 'content': system},
                {'role': 'user',   'content': user},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        logger.error('Groq API error: %s', exc)
        raise


# ---------------------------------------------------------------------------
# Feature 1 — Clinical Decision Support (Doctor)
# ---------------------------------------------------------------------------
_CLINICAL_SYSTEM = (
    'You are a clinical decision support assistant embedded in SmartCare, a '
    'Zambian electronic medical records system.  Your role is to help clinicians '
    'consider differential diagnoses, flag urgent red flags, and suggest relevant '
    'investigations.  You do NOT make definitive diagnoses.  Always recommend '
    'the clinician uses their professional judgement.  Be concise and structured.'
)


def get_clinical_insights(
    chief_complaint: str,
    vitals: dict,
    age: int,
    gender: str,
    allergies: str,
    encounter_type: str,
    recent_diagnoses: list[str],
) -> dict:
    """
    Returns structured clinical decision support for a doctor.
    De-identified — no patient names or identifiers are sent.
    """
    vitals_str = ', '.join(
        f'{k.replace("_", " ").title()} {v}'
        for k, v in vitals.items() if v not in (None, '', 0)
    )
    hx = ', '.join(recent_diagnoses[:5]) if recent_diagnoses else 'None on record'

    prompt = (
        f'Encounter type: {encounter_type}\n'
        f'Patient: {age}-year-old {gender}\n'
        f'Chief complaint: {chief_complaint or "Not specified"}\n'
        f'Vitals: {vitals_str or "Not recorded"}\n'
        f'Known allergies: {allergies or "None documented"}\n'
        f'Recent diagnoses (last 5): {hx}\n\n'
        'Please provide:\n'
        '1. **Possible differentials** — top 3–5 conditions to consider\n'
        '2. **Red flags** — any urgent features that need immediate attention\n'
        '3. **Suggested investigations** — relevant tests to order\n'
        '4. **Allergy note** — any prescribing precautions given known allergies\n'
        'Use bullet points.  Be concise.'
    )

    text = _chat(_CLINICAL_SYSTEM, prompt, max_tokens=700)

    # Also run rule-based vitals check (no API cost)
    alerts = _vitals_alerts(vitals, age)

    return {'insights': text, 'vitals_alerts': alerts}


# ---------------------------------------------------------------------------
# Feature 2 — Vitals Anomaly Detection (Nurse)
# ---------------------------------------------------------------------------
def _vitals_alerts(vitals: dict, age: int) -> list[dict]:
    """Rule-based abnormal vitals detection — instant, no API call."""
    alerts = []

    spo2 = vitals.get('oxygen_sat')
    if spo2 is not None:
        if spo2 < 90:
            alerts.append({'level': 'critical', 'field': 'SpO₂',
                           'message': f'SpO₂ {spo2}% — severely low, immediate oxygen required'})
        elif spo2 < 94:
            alerts.append({'level': 'warning', 'field': 'SpO₂',
                           'message': f'SpO₂ {spo2}% — below normal range (<94%)'})

    temp = vitals.get('temperature')
    if temp is not None:
        if temp >= 40:
            alerts.append({'level': 'critical', 'field': 'Temperature',
                           'message': f'Temperature {temp}°C — hyperpyrexia, urgent assessment needed'})
        elif temp >= 38.5:
            alerts.append({'level': 'warning', 'field': 'Temperature',
                           'message': f'Temperature {temp}°C — high fever'})
        elif temp < 36:
            alerts.append({'level': 'warning', 'field': 'Temperature',
                           'message': f'Temperature {temp}°C — hypothermia'})

    pulse = vitals.get('pulse')
    if pulse is not None:
        if pulse > 130 or pulse < 40:
            alerts.append({'level': 'critical', 'field': 'Pulse',
                           'message': f'Pulse {pulse} bpm — critical arrhythmia range'})
        elif pulse > 100 or pulse < 55:
            alerts.append({'level': 'warning', 'field': 'Pulse',
                           'message': f'Pulse {pulse} bpm — outside normal range'})

    bp = vitals.get('blood_pressure', '')
    if bp and '/' in str(bp):
        try:
            systolic, diastolic = [int(x.strip()) for x in str(bp).split('/')]
            if systolic >= 180 or diastolic >= 110:
                alerts.append({'level': 'critical', 'field': 'Blood Pressure',
                               'message': f'BP {bp} mmHg — hypertensive crisis'})
            elif systolic >= 140 or diastolic >= 90:
                alerts.append({'level': 'warning', 'field': 'Blood Pressure',
                               'message': f'BP {bp} mmHg — hypertension range'})
            elif systolic < 90:
                alerts.append({'level': 'critical', 'field': 'Blood Pressure',
                               'message': f'BP {bp} mmHg — hypotension, assess for shock'})
        except (ValueError, TypeError):
            pass

    return alerts


def get_triage_summary(patient_queue: list[dict]) -> str:
    """
    AI-generated triage priority summary for the nurse's queue.
    Sends only clinical data (age, gender, chief complaint, vitals status).
    """
    if not patient_queue:
        return 'No patients in the queue.'

    system = (
        'You are a triage support assistant for a Zambian hospital nursing station. '
        'Given a list of patients in today\'s queue, provide a brief triage priority '
        'summary highlighting who needs to be seen most urgently and why.  '
        'Be concise and practical.'
    )

    queue_text = '\n'.join(
        f'- Patient {i+1}: {p.get("age", "?")}y {p.get("gender", "")}, '
        f'type: {p.get("encounter_type", "OPD")}, '
        f'complaint: {p.get("chief_complaint", "not stated") or "not stated"}, '
        f'vitals: {"recorded" if p.get("has_vitals") else "pending"}'
        + (f', allergy alert' if p.get("has_allergy") else '')
        for i, p in enumerate(patient_queue[:20])  # cap at 20 for prompt size
    )

    prompt = (
        f'Today\'s queue ({len(patient_queue)} patients):\n{queue_text}\n\n'
        'Provide a triage priority summary with the top concerns to address first.'
    )

    return _chat(system, prompt, max_tokens=500)


# ---------------------------------------------------------------------------
# Feature 3 — Population / Admin Analytics
# ---------------------------------------------------------------------------
_ADMIN_SYSTEM = (
    'You are a health informatics analyst assistant for SmartCare, a Zambian '
    'Ministry of Health EMR system.  You help administrators interpret patient '
    'and encounter data, identify trends, and suggest operational improvements.  '
    'Be data-driven, specific, and actionable.'
)


def get_admin_insights(stats: dict, top_diagnoses: list[dict], enc_types: list[dict],
                       data_quality: dict, monthly_trend: list[dict]) -> str:
    """
    AI-generated operational insights for the admin dashboard.
    Uses only aggregate, non-identifiable statistics.
    """
    diag_str = ', '.join(
        f'{d["diagnosis"]} ({d["cnt"]})'
        for d in top_diagnoses[:5]
    ) if top_diagnoses else 'No data'

    enc_str = ', '.join(
        f'{e["encounter_type"]} ({e["cnt"]})'
        for e in enc_types
    ) if enc_types else 'No data'

    trend_str = ', '.join(
        f'{t["month"]}: {t["cnt"]}'
        for t in monthly_trend[-6:]
    ) if monthly_trend else 'No data'

    prompt = (
        f'System statistics:\n'
        f'- Total patients: {stats.get("total_patients", 0)}\n'
        f'- Total encounters: {stats.get("total_encounters", 0)}\n'
        f'- Today\'s encounters: {stats.get("today_encounters", 0)}\n'
        f'- New patients this week: {stats.get("new_this_week", 0)}\n'
        f'- Monthly encounters (last 6 months): {trend_str}\n'
        f'- Top diagnoses: {diag_str}\n'
        f'- Encounter types: {enc_str}\n'
        f'- Data quality — missing phone: {data_quality.get("no_phone", 0)}, '
        f'missing NRC: {data_quality.get("no_nrc", 0)}, '
        f'no vitals: {data_quality.get("no_vitals", 0)}\n\n'
        'Provide:\n'
        '1. **Key observations** — 3 notable patterns in this data\n'
        '2. **Operational recommendations** — 2–3 specific actions to improve care delivery\n'
        '3. **Data quality priority** — what to fix first and why\n'
        'Be specific and concise.'
    )

    return _chat(_ADMIN_SYSTEM, prompt, max_tokens=600)


# ---------------------------------------------------------------------------
# Feature 3b — Doctor Dashboard Insights (no encounter_id required)
# ---------------------------------------------------------------------------
_DOCTOR_INSIGHT_SYSTEM = (
    'You are a clinical analytics assistant embedded in SmartCare, a Zambian '
    'Ministry of Health EMR system.  You help doctors understand their clinical '
    'workload patterns, identify trends in their patient population, and improve '
    'care delivery.  Be concise, evidence-based, and actionable.  '
    'Use bullet points and bold headings.'
)


def get_doctor_insights(
    stats: dict,
    top_diagnoses: list[dict],
    enc_types: list[dict],
    monthly_trend: list[dict],
    upcoming_followups: int,
    overdue_followups: int,
) -> str:
    """
    AI-generated clinical workload insights for a doctor's dashboard.
    Uses only aggregate, non-identifiable statistics scoped to the doctor.
    """
    diag_str = ', '.join(
        f'{d["diagnosis"]} ({d["cnt"]})'
        for d in top_diagnoses[:5]
    ) if top_diagnoses else 'No data'

    enc_str = ', '.join(
        f'{e["encounter_type"]} ({e["cnt"]})'
        for e in enc_types
    ) if enc_types else 'No data'

    trend_str = ', '.join(
        f'{t["month"]}: {t["cnt"]}'
        for t in monthly_trend[-6:]
    ) if monthly_trend else 'No data'

    prompt = (
        f'Clinician workload statistics:\n'
        f'- Total patients seen: {stats.get("total_my_patients", 0)}\n'
        f'- Total encounters: {stats.get("total_my_encounters", 0)}\n'
        f'- Today\'s encounters: {stats.get("today_my_encounters", 0)}\n'
        f'- This month\'s encounters: {stats.get("monthly_my_encounters", 0)}\n'
        f'- Monthly trend (last 6 months): {trend_str}\n'
        f'- Top diagnoses: {diag_str}\n'
        f'- Encounter types: {enc_str}\n'
        f'- Upcoming follow-ups (14 days): {upcoming_followups}\n'
        f'- Overdue follow-ups: {overdue_followups}\n\n'
        'Please provide:\n'
        '1. **Workload summary** — key observations about this clinician\'s patient load and trends\n'
        '2. **Clinical patterns** — notable patterns in diagnoses or encounter types\n'
        '3. **Follow-up priority** — what the overdue/upcoming follow-up numbers suggest\n'
        '4. **Recommendations** — 2–3 specific suggestions to improve clinical workflow or patient outcomes\n'
        'Be concise and practical.'
    )

    return _chat(_DOCTOR_INSIGHT_SYSTEM, prompt, max_tokens=600)


# ---------------------------------------------------------------------------
# Feature 4 — Freeform AI Chat (all roles)
# ---------------------------------------------------------------------------
_CHAT_SYSTEM = (
    'You are SmartCare AI, a clinical and operational assistant embedded in '
    'SmartCare EMR — a Zambian Ministry of Health electronic medical records '
    'system.  You help doctors with clinical questions, nurses with triage and '
    'patient care, and administrators with health system management.  '
    'You are professional, evidence-based, and concise.  '
    'You do not provide personal medical advice to patients.  '
    'If asked about specific patient records, explain that you cannot access '
    'individual patient data directly.'
)


def freeform_chat(messages: list[dict], role: str) -> str:
    """
    Multi-turn freeform chat.  `messages` is a list of
    {'role': 'user'|'assistant', 'content': str} dicts.
    """
    role_context = {
        'doctor': 'The user is a doctor. Focus on clinical decision support.',
        'nurse':  'The user is a nurse. Focus on triage, vitals, and patient care coordination.',
        'admin':  'The user is a health system administrator. Focus on operations and analytics.',
    }.get(role, '')

    system = f'{_CHAT_SYSTEM}\n\n{role_context}'.strip()

    try:
        resp = _get_client().chat.completions.create(
            model='openai/gpt-oss-120b',
            messages=[{'role': 'system', 'content': system}] + messages,
            max_tokens=800,
            temperature=0.4,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        logger.error('Groq freeform chat error: %s', exc)
        raise
