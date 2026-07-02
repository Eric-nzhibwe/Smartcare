from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('login', views.LoginView.as_view(), name='login'),
    path('me', views.me, name='me'),

    # Patients
    path('patients', views.patients, name='patients'),
    path('patients/<int:pid>', views.patient_detail, name='patient-detail'),

    # Encounters
    path('encounters', views.create_encounter, name='encounters'),
    path('encounters/<int:eid>/vitals', views.patch_vitals, name='patch-vitals'),

    # Dashboard / reports
    path('dashboard', views.dashboard, name='dashboard'),

    # Users
    path('users', views.users, name='users'),
]
