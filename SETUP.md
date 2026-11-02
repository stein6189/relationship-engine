# SETUP.md — für Daniel (Deutsch)

Ziel: Claude Code baut über Nacht **komplett autonom**, testet mehrfach Ende
zu Ende und stellt den Prototyp online. Du richtest nur einmal alles ein und
prüfst morgen früh das Ergebnis.

## 1. Zugänge (ca. 20 Minuten, alles VOR dem Start)

Claude Code darf nachts an nichts hängen bleiben. Deshalb alle Zugänge vorab:

1. **Claude-API-Schlüssel:** console.anthropic.com → API Keys → neuen
   Schlüssel erstellen. 20 € Guthaben aufladen (mehrere Testrunden kosten
   mehr als ein einzelner Durchlauf).
2. **GitHub-Kommandozeile:** `gh` installieren, dann `gh auth login`
   ausführen und im Browser bestätigen.
3. **Vercel:** vercel.com → „Sign up“ → mit GitHub anmelden → Hobby-Plan.
   Dann Settings → Tokens → neuen Token erstellen.
4. **Node.js** (Version 20 oder neuer) muss installiert sein: `node -v`.

## 2. Vorher 20 Minuten lesen (wichtig)

Bewertet wird **dein Urteil**, nicht der Code. Lies `SPEC.md`, `RULES.md` und
`TRACEABILITY.md` einmal ganz durch. Ändere jetzt alles, was du anders sehen
würdest. Nachts fragt Claude Code nicht mehr nach.

## 3. Ordner vorbereiten

1. Leeren Ordner anlegen, z. B. `relationship-engine`, alle Dateien aus
   diesem Paket hineinkopieren.
2. Datei `.env.local` anlegen:
   ```
   ANTHROPIC_API_KEY=dein-schlüssel
   MODEL_FAST=claude-haiku-5-5
   MODEL_SMART=claude-sonnet-5-5
   DEMO_PASSWORD=ein-passwort-für-liqid
   VERCEL_TOKEN=dein-vercel-token
   ```

## 4. Claude Code autonom starten

Damit Claude Code nicht bei jedem Befehl um Erlaubnis fragt, musst du ihm
für diesen Ordner weitreichende Rechte geben, z. B. über den Modus, der
Berechtigungsabfragen überspringt (`claude --dangerously-skip-permissions`).
Das heißt: Es darf in diesem Ordner alles ausführen, ohne zu fragen. Nur in
diesem Projektordner verwenden, nicht in deinem Home-Verzeichnis.

Erste und einzige Nachricht:

> Read CLAUDE.md and every file it references. Then build the complete
> prototype autonomously: all four phases, the QA gate after each phase, at
> least three rounds of final end-to-end due diligence, and the deployment to
> Vercel. Do not stop to ask me anything — log decisions in DECISIONS.md and
> progress in PROGRESS.md. You are done only when the definition of done in
> CLAUDE.md is met. Finish with a short summary and the production URL.

Rechner nicht in den Ruhezustand gehen lassen (Energiesparen aus,
Laptop am Netzteil).

Falls Claude Code abbricht (z. B. Kontext voll): neu starten mit
> Read CLAUDE.md and PROGRESS.md and continue where you left off.

## 5. Dienstag früh: deine Prüfung (ca. 1 Stunde)

1. `PROGRESS.md` und `QA_REPORT.md` lesen.
2. Den Link in einem privaten Browserfenster öffnen, Passwort testen.
3. `DEMO.md` einmal selbst durchklicken, laut, mit Stoppuhr.
4. Fehler gefunden? An Claude Code:
   > Fix: <was>. Then rerun QA round A on the deployed URL.
5. `DECISIONS.md` und `TRACEABILITY.md` lesen. Jede Entscheidung musst du im
   Panel selbst begründen können.

## 6. Abgabe bis Dienstag 12:00

- Mail an LIQID: Link + Passwort + One-Pager (PDF).
- Repository privat lassen. Im Mail anbieten: „Gerne gebe ich Ihnen
  Lesezugriff auf das Repository — schicken Sie mir einfach die
  GitHub-Namen.“

## 7. Falls morgen früh etwas Wichtiges fehlt

Nie streichen: Monatsplan, digitale Nachrichten, Albers-Dokumentation mit
Prüfer. Wenn anderes unfertig ist, in dieser Reihenfolge vereinfachen:
1. Keller nur als Karte + Optionstabelle, ohne Chart
2. Kunden-App nur für Albers
3. „Under the hood“ nur als Drawer bei V4
