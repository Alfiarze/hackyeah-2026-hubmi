# Pochodzenie karty: katalog trzyma też innowacje z baz spoza Małopolski
# (PO WER, ROPS Poznań, ESF+, Zenodo), a UI i silnik dopasowania muszą je
# odróżniać od Biblioteki ROPS Kraków.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_alter_innovation_pdf_alter_innovation_url_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="innovation",
            name="ext",
            field=models.BooleanField(default=False, verbose_name="spoza Małopolski"),
        ),
        migrations.AddField(
            model_name="innovation",
            name="origin",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="libraryitem",
            name="ext",
            field=models.BooleanField(default=False, verbose_name="spoza Małopolski"),
        ),
        migrations.AddField(
            model_name="libraryitem",
            name="origin",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
