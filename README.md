# StagePulse Events

One-Page-Website mit Anfrage-Dialog und Admin-Bereich (PHP 8 + SQLite).

## Betrieb
1. Alles auf ein Hosting mit PHP 8 und `pdo_sqlite` hochladen (HTTPS aktivieren).
2. `/admin/` aufrufen, Inhaber-Konto anlegen (einmalig).
3. Ordner `data/` muss beschreibbar und von außen gesperrt sein (`.htaccess` liegt bei, bei Nginx separat sperren).
4. Absender in `lib.php` (`OWNER_MAIL`) prüfen, SPF/DKIM beim Mail-Anbieter einrichten.

## Noch offen
Impressum und Datenschutz (`impressum.html`, `datenschutz.html`), Fotos und Galerie, Mitarbeiter-Verwaltung, Rate-Limiting, Löschfristen.
