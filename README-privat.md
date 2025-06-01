# Universal Data Remixer

Eine Webanwendung zum Hochladen von Textdateien (TSV, CSV, JSON etc.), Durchsuchen von Datensätzen, Auswählen bestimmter Datensätze und Herunterladen als individuell konfigurierbare CSV- oder JSON-Datei. Die Anwendung unterstützt Projekteinstellungen, um verschiedene Konfigurationen zu speichern.

## Features

*   Datei-Upload per Drag & Drop oder Dateiauswahl.
*   Automatische und manuelle Auswahl von Trennzeichen, Dateikodierung und Header-Erkennung.
*   Unterstützung für TSV, CSV, PSV und JSON-Dateien (flache Arrays von Objekten).
*   Datensatz-Navigation und -Auswahl (auch "Alle auswählen").
*   Bearbeitbare Feldwerte in der Datenanzeige.
*   Anpassbare Feldanzeige:
    *   Alle Felder anzeigen / Nur ausgewählte Felder anzeigen.
    *   Sichtbarkeit einzelner Felder konfigurieren (projektspezifisch gespeichert).
    *   Leere Felder ein-/ausblenden.
    *   Reihenfolge der Felder per Drag & Drop anpassen (projektspezifisch gespeichert).
*   Projektverwaltung:
    *   Mehrere Projekte anlegen, umbenennen, duplizieren, löschen.
    *   Projekteinstellungen (Dateilade-Voreinstellungen, Feldanzeige, Exportprofile) werden pro Projekt gespeichert.
    *   Import/Export aller Projekte oder einzelner Projekte als JSON.
*   Exportprofil-Verwaltung (pro Projekt):
    *   Benutzerdefinierte Feldzuordnung für den Export.
    *   Statische Felder mit festen Werten definierbar.
    *   Auswahl des CSV-Trennzeichens und der Kodierung pro Profil.
    *   Kommentarfeld für jedes Profil.
    *   Drag & Drop Sortierung der Exportfelder.
    *   Import/Export aller Profile eines Projekts als JSON.
*   Download der ausgewählten Datensätze als CSV oder JSON.
*   Internationalisierung (i18n) für mehrere Sprachen.
*   Cookie-/LocalStorage-Hinweis.
*   Bedienung per Tastatur für Navigation und Auswahl.
*   Responsives Design im "Amazon Dark Mode"-Stil.

## Lokale Entwicklung (mit Vite)

Dieses Projekt verwendet Vite als Build-Tool für eine schnelle Entwicklungsumgebung und einen optimierten Produktions-Build.

**Voraussetzungen:**
*   [Node.js](https://nodejs.org/) (Version 18.x oder höher empfohlen)
*   npm (wird mit Node.js installiert)

**Einrichtung:**

1.  **Projekt klonen oder entpacken:**
    Stellen Sie sicher, dass Sie alle Projektdateien in einem Verzeichnis haben (z.B. `universal-data-remixer`).

2.  **Abhängigkeiten installieren:**
    Öffnen Sie ein Terminal im Stammverzeichnis des Projekts und führen Sie aus:
    ```bash
    npm install
    ```
    Dies installiert alle notwendigen Pakete aus der `package.json` (React, Vite, TypeScript, Tailwind CSS etc.).

3.  **Konfigurationsdateien sicherstellen:**
    Stellen Sie sicher, dass die folgenden Konfigurationsdateien im Projektstamm mit dem korrekten Inhalt vorhanden sind (wie in der Interaktion mit der KI bereitgestellt):
    *   `package.json` (definiert Skripte und Abhängigkeiten)
    *   `vite.config.ts` (Vite-Konfiguration)
    *   `tailwind.config.js` (Tailwind CSS-Konfiguration)
    *   `postcss.config.js` (PostCSS-Konfiguration für Tailwind)
    *   `tsconfig.json` (TypeScript-Hauptkonfiguration)
    *   `tsconfig.node.json` (TypeScript-Konfiguration für Node-Kontext wie Vite-Konfig)
    *   `input.css` (oder `src/input.css` - die Haupt-CSS-Datei mit `@tailwind`-Direktiven)
    *   `index.html` (die Quelldatei im Projektstamm, die von Vite als Einstiegspunkt verwendet wird)
    *   `index.tsx` (oder `src/index.tsx` - der TypeScript-Einstiegspunkt für Ihre React-Anwendung, muss `input.css` importieren)

4.  **Entwicklungsserver starten:**
    Führen Sie im Terminal aus:
    ```bash
    npm run dev
    ```
    Vite startet einen Entwicklungsserver (meist auf `http://localhost:5173`) und öffnet die Anwendung im Browser. Änderungen im Code werden dank Hot Module Replacement (HMR) sofort angezeigt.

## Produktions-Build (mit Vite)

Um eine optimierte Version Ihrer Anwendung für das Deployment zu erstellen:

1.  **Build-Prozess ausführen:**
    Führen Sie im Terminal im Projektstamm aus:
    ```bash
    npm run build
    ```
    Vite kompiliert Ihren Code, verarbeitet Tailwind CSS (entfernt ungenutzte Klassen, minifiziert), bündelt JavaScript und CSS und erstellt einen `dist`-Ordner im Projektstamm. Dieser `dist`-Ordner enthält alle statischen Dateien, die für das Deployment benötigt werden.

## Deployment auf einem Apache-Server (Beispiel Ubuntu)

Nachdem Sie mit `npm run build` den `dist`-Ordner erstellt haben:

1.  **Zugriff auf Ihren Server:**
    Verbinden Sie sich per SSH mit Ihrem Ubuntu V-Server.

2.  **Webserver-Software (Apache):**
    Stellen Sie sicher, dass Apache2 installiert und `mod_rewrite` aktiviert ist:
    ```bash
    sudo apt update && sudo apt install apache2
    sudo a2enmod rewrite
    sudo systemctl restart apache2
    ```

3.  **Dateien übertragen:**
    *   Erstellen Sie ein Verzeichnis für Ihre App, falls noch nicht geschehen (z.B. `/var/www/udr.nofm.de/html`).
    *   Löschen Sie ggf. alte Inhalte aus diesem Verzeichnis.
    *   Übertragen Sie den **Inhalt** Ihres lokalen `dist`-Ordners (nicht den Ordner selbst, es sei denn, er soll ein Unterverzeichnis sein) in das `DocumentRoot`-Verzeichnis Ihrer Domain auf dem Server.
        Beispiel mit `rsync` (vom lokalen Rechner ausführen):
        ```bash
        rsync -avz ./dist/ benutzer@ihre_domain_oder_ip:/var/www/udr.nofm.de/html/
        ```
        Oder mit `scp`:
        ```bash
        scp -r ./dist/* benutzer@ihre_domain_oder_ip:/var/www/udr.nofm.de/html/
        ```

4.  **Berechtigungen setzen:**
    Stellen Sie auf dem Server sicher, dass der Apache-Benutzer (`www-data` unter Ubuntu) Leserechte für die Dateien und Ausführungsrechte für die Verzeichnisse hat:
    ```bash
    sudo chown -R www-data:www-data /var/www/udr.nofm.de/html
    sudo chmod -R 755 /var/www/udr.nofm.de/html 
    ```
    (Passen Sie den Pfad an.)

5.  **Apache Virtual Host Konfiguration:**
    Bearbeiten oder erstellen Sie die Apache-Konfigurationsdatei für Ihre Domain (z.B. `/etc/apache2/sites-available/udr.nofm.de.conf` oder `/etc/apache2/sites-available/udr.nofm.de-le-ssl.conf` für HTTPS).

    Ein Beispiel für eine SSL-Konfiguration (Port 443):
    ```apache
    <IfModule mod_ssl.c>
        <VirtualHost *:443>
            ServerName udr.nofm.de # Ihre Domain
            DocumentRoot /var/www/udr.nofm.de/html/ # Pfad zum Inhalt Ihres dist-Ordners

            <Directory "/var/www/udr.nofm.de/html/">
                Options Indexes FollowSymLinks # FollowSymLinks ist nicht nötig, wenn keine Symlinks verwendet werden
                AllowOverride None # Empfohlen, wenn keine .htaccess benötigt wird
                Require all granted
            </Directory>

            # Umschreiberegeln für Single-Page Applications (SPA)
            RewriteEngine On
            # Wenn die angeforderte Datei oder das Verzeichnis existiert, nicht umschreiben
            RewriteCond %{REQUEST_FILENAME} -f [OR]
            RewriteCond %{REQUEST_FILENAME} -d
            RewriteRule ^ - [L]

            # Alle anderen Anfragen auf index.html umleiten (damit React-Router etc. funktioniert)
            RewriteRule ^ /index.html [L]

            ErrorLog ${APACHE_LOG_DIR}/udr.nofm.de_error.log
            CustomLog ${APACHE_LOG_DIR}/udr.nofm.de_access.log combined

            # Ihre SSL-Zertifikatseinstellungen (z.B. von Let's Encrypt)
            SSLEngine on
            SSLCertificateFile /etc/letsencrypt/live/udr.nofm.de/fullchain.pem
            SSLCertificateKeyFile /etc/letsencrypt/live/udr.nofm.de/privkey.pem
            Include /etc/letsencrypt/options-ssl-apache.conf
        </VirtualHost>
    </IfModule>
    ```
    *   Wenn Sie noch kein SSL haben und auf Port 80 testen:
        ```apache
        <VirtualHost *:80>
            ServerName udr.nofm.de
            DocumentRoot /var/www/udr.nofm.de/html/

            <Directory "/var/www/udr.nofm.de/html/">
                Options Indexes FollowSymLinks
                AllowOverride None
                Require all granted
            </Directory>

            RewriteEngine On
            RewriteCond %{REQUEST_FILENAME} -f [OR]
            RewriteCond %{REQUEST_FILENAME} -d
            RewriteRule ^ - [L]
            RewriteRule ^ /index.html [L]

            ErrorLog ${APACHE_LOG_DIR}/udr.nofm.de_error.log
            CustomLog ${APACHE_LOG_DIR}/udr.nofm.de_access.log combined
        </VirtualHost>
        ```

6.  **Seite aktivieren und Apache neu laden (falls Konfiguration geändert):**
    ```bash
    sudo a2ensite udr.nofm.de.conf # (oder der Name Ihrer Konfigurationsdatei)
    sudo apache2ctl configtest
    sudo systemctl reload apache2
    ```

7.  **Testen:**
    Öffnen Sie Ihre Webseite (`https://udr.nofm.de` oder `http://udr.nofm.de`) im Browser. Leeren Sie den Browser-Cache gründlich (Strg+Shift+R oder Cmd+Shift+R). Die Tailwind-CDN-Warnung sollte verschwunden sein, und die Anwendung sollte aus den lokal gebündelten Assets laufen.

## Wichtige Dateien für den Vite-Workflow

Stellen Sie sicher, dass die folgenden Dateien mit dem korrekten Inhalt in Ihrem Projektstamm vorhanden sind, bevor Sie `npm install` und `npm run build` ausführen:

*   `package.json` (definiert Skripte und Abhängigkeiten)
*   `vite.config.ts` (Vite-Konfiguration)
*   `tailwind.config.js` (Tailwind CSS-Konfiguration)
*   `postcss.config.js` (PostCSS-Konfiguration für Tailwind)
*   `tsconfig.json` (TypeScript-Hauptkonfiguration)
*   `tsconfig.node.json` (TypeScript-Konfiguration für Node-Kontext)
*   `input.css` (Ihre Haupt-CSS-Datei mit `@tailwind`-Direktiven)
*   `index.html` (Quelldatei im Projektstamm, von Vite als Einstiegspunkt verwendet)
*   `index.tsx` (Ihr TypeScript-Einstiegspunkt für React, importiert `input.css`)
*   `App.tsx` und alle Komponenten in `components/`
*   `types.ts`

(Die genauen Inhalte für die Vite-spezifischen Konfigurationsdateien wurden in vorherigen Interaktionen bereitgestellt.)