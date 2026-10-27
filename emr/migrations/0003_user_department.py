from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('emr', '0002_facility_auditlog_encounter_facility_ref_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
