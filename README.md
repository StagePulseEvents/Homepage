# StagePulse Events – Website & Anfrageverwaltung

Responsive Website mit öffentlichem Anfrageformular und geschütztem Supabase-Dashboard.

## Enthalten
- `index.html`, `styles.css`, `app.js`: öffentliche Website und mehrstufiges Anfrageformular
- `admin.html`, `admin.css`, `admin.js`: Mitarbeiter-Login und Anfrageverwaltung
- `impressum.html`, `datenschutz.html`: auszufüllende rechtliche Entwürfe
- `supabase/schema.sql`: Datenbanktabellen, Rollen, RLS und Policies
- `supabase/functions/*`: serverseitige Anfrageannahme, Status-/Annahme-E-Mail und Mitarbeitereinladung

## 1. Supabase einrichten
1. Neues Supabase-Projekt erstellen und eine EU-Region wählen, falls das für deine Datenverarbeitung passt.
2. SQL aus `supabase/schema.sql` im SQL Editor ausführen.
3. In Authentication die E-Mail-Bestätigung aktivieren und SMTP für zuverlässige Zustellung konfigurieren.
4. Ersten Geschäftsführer-Account über Supabase Auth anlegen (Dashboard → Authentication → Users).
5. Die zugehörige Rolle im SQL Editor setzen:
   ```sql
   update public.profiles set role='admin' where email='DEINE-LOGIN-EMAIL';
   ```
6. `SUPABASE_URL` und den Publishable/anon Key aus Project Settings → API kopieren.

## 2. Frontend konfigurieren
1. `config.example.js` als `config.js` kopieren.
2. Werte eintragen:
   ```js
   window.STAGEPULSE_CONFIG = {
     SUPABASE_URL: "https://....supabase.co",
     SUPABASE_ANON_KEY: "..."
   };
   ```
3. `config.js` ist absichtlich in `.gitignore`. Für GitHub Pages muss die Datei beim Deployment als Build-Secret erzeugt oder separat bereitgestellt werden. Der Publishable/anon Key ist kein Geheimnis, aber RLS ist zwingend.

## 3. Edge Functions bereitstellen
Supabase CLI installieren und im Projektverzeichnis ausführen:
```bash
supabase login
supabase link --project-ref DEIN_PROJECT_REF
supabase secrets set RESEND_API_KEY=re_... MAIL_FROM="StagePulse Events <anfragen@DEINE-DOMAIN.de>" INTERNAL_NOTIFY_EMAIL=info-stagepulseevents@gmx.de
supabase functions deploy submit-inquiry
supabase functions deploy manage-inquiry
supabase functions deploy invite-employee
```
Die Supabase-Standardvariablen `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` werden in Edge Functions bereitgestellt. Den Service-Role-Key niemals in das Frontend übernehmen.

Resend: Domain verifizieren und Absenderadresse einrichten. Für echte Zustellung ist eine verifizierte Absenderdomain dringend empfohlen. Prüfe SPF/DKIM/DMARC und Testzustellung. Wenn kein Resend-Key gesetzt ist, wird die Anfrage gespeichert, aber keine E-Mail versendet.

## 4. GitHub Pages veröffentlichen
- Repository erstellen und Quellcode pushen.
- `config.js` nicht committen.
- GitHub Pages unter Settings → Pages aktivieren.
- Für GitHub Pages muss `config.js` beim Deployment erzeugt werden (z. B. GitHub Actions Secret `SUPABASE_URL` und `SUPABASE_ANON_KEY`). Alternativ kann der nicht geheime Publishable Key in einer öffentlichen Konfigurationsdatei stehen; niemals den Service-Role-Key.
- Die Domain und Supabase Auth Redirect URLs konfigurieren. Die Redirect URL deiner Website muss in Supabase Authentication → URL Configuration erlaubt sein.

## 5. GitHub Actions-Beispiel
Eine mögliche Workflow-Datei `.github/workflows/pages.yml` muss die Secrets verwenden und `config.js` vor dem Upload generieren. Lege `SUPABASE_URL` und `SUPABASE_ANON_KEY` als Repository Actions Secrets an.

## 6. Rollen & Sicherheit
- Nur angemeldete, aktive Profile mit Rolle `admin` oder `employee` können Anfragen lesen/bearbeiten.
- Nur Admins können Mitarbeiter einladen und bestehende Mitarbeiterkonten aktivieren/deaktivieren. Eingeladene Accounts erhalten standardmäßig Rolle `employee`.
- Der erste Admin wird manuell gesetzt.
- Öffentliche Anfragen werden ausschließlich über die Edge Function mit Service-Role-Key gespeichert; es gibt keine öffentliche INSERT-Policy auf der Tabelle.
- Die Annahme löst eine E-Mail aus, ist aber ausdrücklich keine verbindliche Buchungsbestätigung.

**Vor Livebetrieb ergänzen:** Rate-Limiting/CAPTCHA und Bot-Schutz, Monitoring, Backups, Lösch-/Aufbewahrungskonzept, MFA für Admins, Passwort-Wiederherstellung, E-Mail-Templates, Audit-Log und vollständige Tests. Das Formular sollte vor Veröffentlichung gegen Spam und Missbrauch abgesichert werden.

## 7. Vor Veröffentlichung noch erforderlich
- Vollständige Geschäftsanschrift, ggf. Register-/USt.-Angaben für das Impressum.
- Rechtlich geprüfte Datenschutzerklärung mit tatsächlichen Dienstleistern, Speicherorten und Aufbewahrungsfristen.
- Verifizierte Absenderdomain für E-Mails.
- Eigene Domain, Kontakt-/Supportprozess und Testanfragen.
- Bildrechte/Lizenzen der verwendeten Bildquellen prüfen. Die aktuellen Bild-URLs sind externe Unsplash-Bilder und benötigen Internetzugang.

## Projektstruktur
```text
stagepulse-events/
├── index.html
├── styles.css
├── app.js
├── config.example.js
├── admin.html
├── admin.css
├── admin.js
├── impressum.html
├── datenschutz.html
└── supabase/
    ├── schema.sql
    └── functions/
        ├── submit-inquiry/
        ├── manage-inquiry/
        └── invite-employee/
```

## Anfragen löschen / Aufbewahrung
- Im Admin-Bereich kann jede Anfrage in der Detailansicht über „Anfrage löschen“ endgültig entfernt werden. Dafür muss die Edge Function neu bereitgestellt werden: `supabase functions deploy manage-inquiry`.
- `supabase/aufbewahrung.sql` (optional) löscht Anfragen automatisch nach 30 Tagen per pg_cron.
- Öffentliche Events: `supabase/events.sql` ausführen.
