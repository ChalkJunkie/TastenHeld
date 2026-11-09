# TastenHeld – Tipptrainer für Klasse 5

TastenHeld ist ein buntes Lernspiel zum 10-Finger-Tippen auf der deutschen QWERTZ-Tastatur.
Die Kinder reisen mit dem kleinen Roboter **Tipp** durch Welten. Tippen ist ihre Zauberkraft.

- Läuft komplett im Browser (Desktop/Laptop mit Tastatur, ab 1366 × 768).
- Kein Server, keine Anmeldung, keine Cloud: Es verlässt **keine** Information den Browser.
- Kein Sound, alle Rückmeldungen sind sichtbar (Farbe, Symbol, Text).
- Reines HTML/CSS/JavaScript ohne Build-Schritt und ohne externe Dateien.

**Stand:** Meilenstein 2. Die Welten 1–4 (Grundreihe, obere Reihe, untere Reihe mit Komma und Punkt) sind spielbar,
in den Modi Regen, Monster und Rennen.

---

## Für den Unterricht

### Spielstand speichern – bitte den Kindern zeigen
Der Spielstand wird als Datei gespeichert, z. B. `Spielstand_Tastenheld_Lena_2026-11-09.tastenheld`.

- **Speicherort:** im eigenen Ordner auf dem Netzlaufwerk oder auf einem USB-Stick,
  **nicht** im Downloads-Ordner (der wird auf Schulrechnern oft geleert).
- In Chrome/Edge darf man den Speicherort beim Speichern selbst auswählen. In anderen Browsern landet
  die Datei im Download-Ordner und muss danach verschoben werden.
- Beim nächsten Mal: **„Ich habe schon einen Spielstand“** → **„Spielstand auswählen“**.
- Zusätzlich sichert TastenHeld den Stand automatisch im Browser. Nach einem versehentlichen Neuladen
  erscheint auf der Startseite „Weiterspielen als …“. Diese Sicherung verschwindet beim Abmelden
  vom Schulrechner. Die Datei ist deshalb der eigentliche Spielstand.

### Lehrkraft-Ansicht
`index.html?lehrkraft=1` öffnet alle Level zum Vorführen. Dabei wird nichts gespeichert.

### Wertung
- Sterne gibt es **nur für Genauigkeit** (Standard: ★ 85 %, ★★ 93 %, ★★★ 98 %), nie für Tempo.
- Bei einem Fehler wartet der Cursor auf das richtige Zeichen. Pro Zeichen zählt höchstens ein Fehler.
- Tempo (Zeichen pro Minute) bringt nur Bonus-XP. Pausen über 3 Sekunden zählen nicht mit.
- Im Regen-Modus ist ein gelandeter Tropfen kein Fehler: Er kommt noch einmal, und der Regen wird langsamer.
- Im Monster-Modus gibt es kein „Game Over“: Erreicht das Monster Tipp, hüpft es zurück.
- Es gibt keine Ranglisten, nur die persönliche Bestleistung.

---

## Lokal testen

Wegen der JavaScript-Module funktioniert ein Doppelklick auf `index.html` **nicht** (`file://`).
Nötig ist ein kleiner lokaler Webserver, zum Beispiel mit Python:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

## Auf GitHub Pages veröffentlichen

1. Repository auf GitHub öffnen → **Settings** → **Pages**.
2. Unter „Build and deployment“: **Source: Deploy from a branch**.
3. Branch `main` und Ordner `/ (root)` wählen → **Save**.
4. Nach ein bis zwei Minuten ist das Spiel unter `https://<benutzername>.github.io/<repository>/` erreichbar.

**Nach einem Update:** Browser speichern die Programmdateien bis zu 10 Minuten zwischen. Wer TastenHeld kurz
vorher geöffnet hatte, lädt die Seite deshalb einmal mit **Strg + F5** neu. Das Spiel weist auch selbst darauf hin,
wenn es eine veraltete Version bemerkt.

---

## Inhalte pflegen

Alle Inhalte liegen als JSON im Ordner `data/`. Nach jeder Änderung bitte mit dem **Validator** prüfen:
`index.html?debug=1` öffnen, dann die Konsole mit **F12** öffnen. Unten rechts zeigt ein Hinweis, wie viele Fehler gefunden wurden.
Jeder Fehler nennt Level-ID und Wort.

| Datei | Inhalt |
|---|---|
| `levels.json` | Welten und Level (Modus, Tasten, Inhalte, Hilfen, Sterne, Freischaltung) |
| `words.json` | Wortlisten: `{ "version", "lists": { "<listId>": ["wort", …] } }` |
| `keys.json` | Tastenkunde-Karten (Welt 7) und Tastenkombinationen (Welt 8) |
| `story.json` | Boss-Geschichte „Tipp und die verschwundene Taste“ |
| `layout-de.json` | komplette deutsche Tastatur (Position, Beschriftung, Finger, Shift/AltGr) |

### Wörter ergänzen
Einfach in der passenden Liste in `words.json` ergänzen. Wichtig:
- Welt 1–4: nur Kleinbuchstaben und nur Tasten, die bis dahin eingeführt sind.
- Nur gerade Anführungszeichen (`"`) und den normalen Bindestrich (`-`) verwenden, keine typografischen.
  Vorsicht beim Kopieren aus Word!
- Listen-IDs nicht umbenennen, ohne `levels.json` anzupassen.

### Ein Level ergänzen
Beispiel aus `levels.json`:

```json
{
  "id": "1-3",
  "title": "G und H",
  "intro": "G und H liegen in der Mitte ...",
  "mode": "rain",
  "caseMode": "lower",
  "newKeys": ["g", "h"],
  "activeKeys": ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "Space"],
  "content": { "type": "sequences", "source": "w1_gh", "count": 12 },
  "helps": { "keyboard": true, "hands": true, "fingerColors": true, "highlightNext": true },
  "params": { "fallSpeed": 0.05, "maxOnScreen": 1, "spawnGap": 1.0, "confirmSpace": false },
  "stars": { "accuracy": [85, 93, 98], "minChars": 35 },
  "unlock": { "after": "1-2" }
}
```

- **`id`** ist der Schlüssel im Spielstand. Eine einmal vergebene ID **nie umbenennen**, sonst verlieren
  die Kinder ihre Sterne.
- **`activeKeys` / `newKeys`:** einzelne Zeichen der Grundbelegung (`"a"`, `"ö"`, `","`, `"1"`) oder
  Tastennamen (`"Space"`, `"ShiftLeft"`, `"ShiftRight"`, `"CapsLock"`, `"AltGr"`). Großbuchstaben und
  Sonderzeichen sind erlaubt, wenn die passende Umschalt- bzw. AltGr-Taste in `activeKeys` steht.
- **`caseMode`:** `"lower"` (Welt 1–4, versehentliches Shift oder Feststelltaste zählt nicht als Fehler)
  oder `"mixed"` (ab Welt 5).
- **`content.source`:** eine Listen-ID oder mehrere als Array (`["w1_gh", "w1_woerter"]`). Dann wird
  gemischt gezogen. `count` = Anzahl der Einträge ohne Wiederholung.
- **`stars.minChars`:** so viele Zeichen müssen getippt sein, damit die Runde Sterne bekommt.
  `tempoBonusCpm` (optional): ab so vielen Zeichen pro Minute gibt es Bonus-XP.
- **`unlock.after`:** ID des Levels, das mit mindestens einem Stern geschafft sein muss (`null` = immer offen).
- **`mode`:** `rain`, `monster` oder `race`. Jeder Modus liest nur seine eigenen `params`:
  - **rain** (Regen): `fallSpeed` (Anteil der Spielfeldhöhe pro Sekunde), `maxOnScreen` (gleichzeitige Tropfen),
    `spawnGap` (Sekunden zwischen Tropfen), `confirmSpace` (Wort zusätzlich mit Leertaste bestätigen, Standard: nein).
  - **monster:** `monsterSpeed` (Anteil der Strecke pro Sekunde, z. B. 0.02), `push` (so weit schubst ein
    fertiges Wort zurück), `errorBoost` (so viel schneller pro Fehler), `maxBoost` (höchstens so viel schneller).
  - **race** (Rennen): keine Parameter. Alle Wörter/Sätze werden zu einem fortlaufenden Text mit Leerzeichen.
- Texte mit Leerzeichen (Sätze) passen besser zu `monster` und `race` als zu `rain`.

---

## Technik

```
index.html
css/      base.css (Grundlagen, Seiten), themes.css (Farbthemen), game.css (Spiel, Tastatur)
js/       main.js        Start, Daten laden, Bildschirme steuern
          input.js       zentrale Tastatur-Eingabe (AltGr, Totasten, Browser-Kürzel)
          layout.js      Nachschlagen im Tastaturlayout (Zeichen -> Taste/Finger)
          keyboard.js    virtuelle Tastatur
          hands.js       Hände-Overlay (SVG)
          engine.js      Inhalte ziehen, Eingabe bewerten, Statistik, Sterne
          progress.js    Spielstand, Sicherung, Datei, Prüfsumme, Migration
          ui.js          kleine UI-Helfer, Dialoge, Einstellungen
          validator.js   Prüfung der JSON-Dateien (nur mit ?debug=1)
          screens/       Startseite, Weltkarte, Level-Vorschau/Tutorial, Spiel, Ergebnis
          modes/         Spielmodi (rain.js, monster.js, race.js, textline.js)
data/     JSON-Inhalte
assets/svg/  selbst gezeichnete Grafiken
```

### Spielstand-Format
```json
{
  "format": "tastenheld-spielstand",
  "version": 1,
  "name": "Lena",
  "savedAt": "2026-11-09T10:15:00.000Z",
  "data": { "profile": {}, "settings": {}, "levels": {}, "story": {}, "keyStats": {}, "xp": 0, "unlocked": {}, "tutorialsSeen": [] },
  "checksum": "9f3a1c07"
}
```
Die Prüfsumme (FNV-1a über `data`) erkennt nur versehentliche Beschädigungen und ist kein Schummelschutz.
Ändert sich das Format, wird `SAVE_VERSION` in `js/progress.js` erhöht und eine Migration ergänzt.
Ältere Dateien lassen sich dann weiter laden.
