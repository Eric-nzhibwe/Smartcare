from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login',         views.LoginView.as_view(), name='login'),
    path('token/refresh', views.token_refresh,       name='token-refresh'),
    path('logout',        views.logout_view,          name='logout'),
    path('me',            views.me,                   name='me'),

    # Patients
    path('patients',           views.patients,       name='patients'),
    path('patients/<int:pid>', views.patient_detail, name='patient-detail'),

    # Encounters
    path('encounters',                    views.encounters,  name='encounters'),
    path('encounters/<int:eid>/vitals',   views.patch_vitals, name='patch-vitals'),

    # Dashboard / reports
    path('dashboard', views.dashboard, name='dashboard'),

    # Users
    path('users', views.users, name='users'),

    # Facilities
    path('facilities', views.facilities, name='facilities'),

    # Audit log
    path('audit', views.audit_log, name='audit-log'),

    # AI endpoints
    path('ai/clinical',        views.ai_clinical_insights, name='ai-clinical'),
    path('ai/triage',          views.ai_triage_summary,    name='ai-triage'),
    path('ai/admin',           views.ai_admin_insights,    name='ai-admin'),
    path('ai/doctor-insights', views.ai_doctor_insights,   name='ai-doctor-insights'),
    path('ai/chat',            views.ai_chat,              name='ai-chat'),
]
