"""
Management command to seed the database with demo users, patients, and encounters.

Usage:
    python manage.py seed
    python manage.py seed --flush   # clears existing data first

Demo credentials (passwords meet the 8-char, non-common validator requirements):
    doctor  / Doctor#2025
    nurse   / Nurse#2025
    admin   / Admin#2025
    doctor2 / Doctor#2025
"""

from django.core.management.base import BaseCommand
from emr.models import Facility, User, Patient, Encounter


FACILITIES = [
    dict(name='UTH Lusaka',          province='Lusaka',      district='Lusaka District',      facility_type='hospital'),
    dict(name='Chipata General',     province='Eastern',     district='Chipata District',      facility_type='hospital'),
    dict(name='Ndola Central',       province='Copperbelt',  district='Ndola District',        facility_type='hospital'),
    dict(name='Livingstone GH',      province='Southern',    district='Livingstone District',  facility_type='hospital'),
    dict(name='Kabwe GH',            province='Central',     district='Kabwe District',        facility_type='hospital'),
    dict(name='Solwezi GH',          province='North-Western', district='Solwezi District',    facility_type='hospital'),
    dict(name='MoH Headquarters',    province='Lusaka',      district='Lusaka District',       facility_type='hq'),
]

USERS = [
    dict(name='Dr. Mulenga Banda',  username='doctor',  password='Doctor#2025',  role='doctor', facility='UTH Lusaka'),
    dict(name='Nurse Chanda Phiri', username='nurse',   password='Nurse#2025',   role='nurse',  facility='Chipata General'),
    dict(name='Admin User',         username='admin',   password='Admin#2025',   role='admin',  facility='MoH Headquarters'),
    dict(name='Dr. Namwinga Lungu', username='doctor2', password='Doctor#2025',  role='doctor', facility='Ndola Central'),
]

PATIENTS = [
    dict(smart_id='SC-2024-000001', first_name='Mwanza',   last_name='Tembo',
         date_of_birth='1985-03-12', gender='Male',   phone='+260971234567',
         address='Plot 45, Cairo Road',     province='Lusaka',      district='Lusaka District',
         facility='UTH Lusaka',      nrc_number='123456/78/1',
         next_of_kin='Mary Tembo',    next_of_kin_phone='+260971234568',
         blood_group='O+', allergies='None', status='active'),
    dict(smart_id='SC-2024-000002', first_name='Chipo',    last_name='Mwale',
         date_of_birth='1992-07-24', gender='Female', phone='+260962345678',
         address='Kalingalinga, House 7',   province='Lusaka',      district='Lusaka District',
         facility='Chipata General',  nrc_number='234567/89/2',
         next_of_kin='John Mwale',    next_of_kin_phone='+260962345679',
         blood_group='A+', allergies='Penicillin', status='active'),
    dict(smart_id='SC-2024-000003', first_name='Bwalya',   last_name='Kasonde',
         date_of_birth='1978-11-05', gender='Male',   phone='+260953456789',
         address='Ndola, Wusakile',          province='Copperbelt',  district='Ndola District',
         facility='Ndola Central',    nrc_number='345678/90/3',
         next_of_kin='Grace Kasonde', next_of_kin_phone='+260953456780',
         blood_group='B+', allergies='None', status='active'),
    dict(smart_id='SC-2024-000004', first_name='Thandiwe', last_name='Nkosi',
         date_of_birth='2001-02-18', gender='Female', phone='+260944567890',
         address='Livingstone, Maramba',     province='Southern',    district='Livingstone District',
         facility='Livingstone GH',   nrc_number='456789/01/4',
         next_of_kin='Peter Nkosi',   next_of_kin_phone='+260944567891',
         blood_group='AB+', allergies='Sulfa drugs', status='active'),
    dict(smart_id='SC-2024-000005', first_name='Emmanuel', last_name='Zulu',
         date_of_birth='1965-09-30', gender='Male',   phone='+260935678901',
         address='Kabwe Central',             province='Central',     district='Kabwe District',
         facility='Kabwe GH',         nrc_number='567890/12/5',
         next_of_kin='Ruth Zulu',     next_of_kin_phone='+260935678902',
         blood_group='O-', allergies='Aspirin', status='active'),
    dict(smart_id='SC-2024-000006', first_name='Mutale',   last_name='Chilufya',
         date_of_birth='1990-05-14', gender='Female', phone='+260926789012',
         address='Solwezi Town',               province='North-Western', district='Solwezi District',
         facility='Solwezi GH',        nrc_number='678901/23/6',
         next_of_kin='Isaac Chilufya', next_of_kin_phone='+260926789013',
         blood_group='A-', allergies='None', status='active'),
]

ENCOUNTERS = [
    dict(patient_smart_id='SC-2024-000001', encounter_type='OPD',
         visit_date='2024-11-10', chief_complaint='Fever and headache',
         temperature=37.8, pulse=88, blood_pressure='120/80', weight=72.0, height=175.0, oxygen_sat=98.0,
         diagnosis='Malaria (confirmed)', diagnosis_code='B54',
         treatment='Artemether-Lumefantrine 80/480mg', medications='AL 6 tablets over 3 days',
         notes='Patient improving', follow_up_date='2024-11-17', facility='UTH Lusaka'),
    dict(patient_smart_id='SC-2024-000001', encounter_type='ART Clinic',
         visit_date='2024-12-05', chief_complaint='Routine ART follow-up',
         temperature=36.9, pulse=76, blood_pressure='118/76', weight=71.0, height=175.0, oxygen_sat=99.0,
         diagnosis='HIV on ART - stable', diagnosis_code='B20',
         treatment='TDF/3TC/DTG', medications='Continue current regimen',
         notes='VL undetectable', follow_up_date='2025-03-05', facility='UTH Lusaka'),
    dict(patient_smart_id='SC-2024-000002', encounter_type='OPD',
         visit_date='2024-11-22', chief_complaint='Abdominal pain and vomiting',
         temperature=36.5, pulse=92, blood_pressure='110/70', weight=58.0, height=162.0, oxygen_sat=97.0,
         diagnosis='Gastroenteritis', diagnosis_code='A09',
         treatment='ORS, Metronidazole 400mg', medications='3-day course',
         notes='Mild dehydration on presentation', follow_up_date='2024-11-29', facility='Chipata General'),
    dict(patient_smart_id='SC-2024-000003', encounter_type='Inpatient',
         visit_date='2024-10-15', chief_complaint='Chest pain, shortness of breath',
         temperature=38.1, pulse=102, blood_pressure='145/95', weight=80.0, height=178.0, oxygen_sat=95.0,
         diagnosis='Hypertensive urgency', diagnosis_code='I10',
         treatment='Amlodipine 10mg, Atenolol 50mg', medications='Admitted 2 nights, BP stabilised',
         notes='Refer to cardiology', follow_up_date='2024-11-15', facility='Ndola Central'),
    dict(patient_smart_id='SC-2024-000004', encounter_type='MCH',
         visit_date='2024-12-01', chief_complaint='Antenatal visit 28 weeks',
         temperature=36.7, pulse=84, blood_pressure='108/68', weight=65.0, height=160.0, oxygen_sat=99.0,
         diagnosis='Normal pregnancy', diagnosis_code='Z34',
         treatment='Ferrous sulphate, Folic acid', medications='Continue supplementation',
         notes='Fundal height 28cm', follow_up_date='2025-01-05', facility='Livingstone GH'),
    dict(patient_smart_id='SC-2024-000005', encounter_type='OPD',
         visit_date='2025-01-08', chief_complaint='Joint pain and swelling',
         temperature=36.4, pulse=78, blood_pressure='130/85', weight=78.0, height=169.0, oxygen_sat=97.0,
         diagnosis='Rheumatoid arthritis', diagnosis_code='M06',
         treatment='Methotrexate 10mg weekly, Folic acid', medications='Monitor LFTs monthly',
         notes='Referred to physician', follow_up_date='2025-02-08', facility='Kabwe GH'),
]


class Command(BaseCommand):
    help = 'Seed the database with demo facilities, users, patients, and encounters'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true',
                            help='Delete all existing data before seeding')

    def handle(self, *args, **options):
        if options['flush']:
            Encounter.objects.all().delete()
            Patient.objects.all().delete()
            User.objects.exclude(is_superuser=True).delete()
            Facility.objects.all().delete()
            self.stdout.write(self.style.WARNING('Existing data cleared.'))

        # ── Facilities ────────────────────────────────────────────────────
        facility_map: dict[str, Facility] = {}
        for f in FACILITIES:
            obj, created = Facility.objects.get_or_create(name=f['name'], defaults={
                k: v for k, v in f.items() if k != 'name'
            })
            facility_map[f['name']] = obj
            self.stdout.write(f"  {'Created' if created else 'Exists '} facility: {f['name']}")

        # ── Users ─────────────────────────────────────────────────────────
        user_map: dict[str, User] = {}
        for u in USERS:
            obj, created = User.objects.get_or_create(username=u['username'])
            obj.name         = u['name']
            obj.role         = u['role']
            obj.facility     = u['facility']
            obj.facility_ref = facility_map.get(u['facility'])
            # Only reset the password on first creation to preserve any post-deploy changes
            if created:
                obj.set_password(u['password'])
            obj.save()
            user_map[u['username']] = obj
            self.stdout.write(
                f"  {'Created' if created else 'Exists '} user: {u['username']}"
                + (' (password set)' if created else ' (password unchanged)')
            )

        default_clinician = user_map.get('doctor')

        # ── Patients ──────────────────────────────────────────────────────
        patient_map: dict[str, Patient] = {}
        for p in PATIENTS:
            defaults = {k: v for k, v in p.items() if k != 'smart_id'}
            defaults['registered_by'] = default_clinician
            defaults['facility_ref']  = facility_map.get(p.get('facility', ''))
            obj, created = Patient.objects.get_or_create(
                smart_id=p['smart_id'], defaults=defaults
            )
            patient_map[p['smart_id']] = obj
            self.stdout.write(f"  {'Created' if created else 'Exists '} patient: {p['smart_id']}")

        # ── Encounters ────────────────────────────────────────────────────
        for e in ENCOUNTERS:
            sid     = e.pop('patient_smart_id')
            patient = patient_map.get(sid)
            if not patient:
                continue
            fac_name = e.get('facility', '')
            _, created = Encounter.objects.get_or_create(
                patient=patient,
                encounter_type=e['encounter_type'],
                visit_date=e['visit_date'],
                defaults={
                    **e,
                    'clinician':    default_clinician,
                    'facility_ref': facility_map.get(fac_name),
                },
            )
            self.stdout.write(
                f"  {'Created' if created else 'Exists '} encounter: {sid} / {e['encounter_type']} / {e['visit_date']}"
            )

        self.stdout.write(self.style.SUCCESS('\n✅  Seed complete.'))
        self.stdout.write('   Login: doctor / Doctor#2025  |  nurse / Nurse#2025  |  admin / Admin#2025')
