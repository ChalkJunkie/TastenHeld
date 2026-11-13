# TastenHeld – Tipptrainer für Klasse 5

TastenHeld ist ein Lernspiel zum 10-Finger-Tippen auf der deutschen QWERTZ-Tastatur, im Pixelart-Stil mit
Steampunk-Flair. Die Kinder reisen mit dem kleinen Dampf-Roboter **Tipp** durch neun Welten. Tippen ist ihre Zauberkraft.

- Läuft komplett im Browser (Desktop/Laptop mit Tastatur, ab 1366 × 768). Getestet mit Chrome, Edge und Firefox.
- Kein Server, keine Anmeldung, keine Cloud: Es verlässt **keine** Information den Browser.
  Abgefragt wird nur ein frei gewählter Spitzname.
- Kein Sound, alle Rückmeldungen sind sichtbar (Farbe, Symbol, Text).
- Reines HTML/CSS/JavaScript ohne Build-Schritt und ohne externe Dateien.

| Welt | Inhalt | Modi |
|---|---|---|
| 1 Blumenwiese | Grundreihe, Leertaste | Regen |
| 2 Berge | E I R U | Regen, Monster, Rennen |
| 3 Über den Wolken | T Z W O Q P Ü | Regen, Monster, Rennen |
| 4 Kristallhöhle | V B N M C X Y | Regen, Monster, Rennen |
| 5 Uhrturmstadt | Großbuchstaben mit beiden Umschalttasten, Namen, Orte, in 5-6 Komma und Punkt | Regen, Monster, Rennen |
| 6 Erfinderwerkstatt | ß, Zahlen, Satzzeichen | Regen, Monster, Rennen |
| 7 Maschinenraum | Tastenkunde (Fragekarten zu Enter, Pfeilen, Strg, Alt Gr, Win …) | Tastenkunde |
| 8 Sternwarte | lange Wörter, Zungenbrecher, Sonderzeichen, Alt Gr (@ €), Tastenkombinationen, Tempo-Sprint, große Prüfung | alle |
| Boss | Geschichte „Tipp und die verschwundene Taste“ in 6 Kapiteln | Geschichte |

Dazu: „Meine Knackpunkte“ (Übung aus den eigenen Fehlertasten), XP mit freischaltbaren Tipp-Farben und Farbthemen.

---

## Schnellstart für Lehrkräfte

1. Spiel öffnen: `https://<benutzername>.github.io/<repository>/` (siehe „Veröffentlichen“).
2. **Lehrkraft-Ansicht** zum Vorführen: `…/index.html?lehrkraft=1`. Alle Level sind offen, es wird nichts gespeichert.
3. Den Kindern zeigen, wie man den **Spielstand speichert** (unten). Dafür gibt es einen Spickzettel zum
   Ausdrucken: [`docs/Spickzettel_Spielstand.pdf`](docs/Spickzettel_Spielstand.pdf).
4. Nach einem Update der Seite einmal **Strg + F5** drücken (siehe unten).

---

## Für den Unterricht

### Spielstand speichern – bitte den Kindern zeigen
Der Spielstand wird als Datei gespeichert, z. B. `Spielstand_Tastenheld_Lena_2026-11-09.tastenheld`.

- **Speicherort:** im eigenen Ordner auf dem Netzlaufwerk oder auf einem USB-Stick,
  **nicht** im Downloads-Ordner (der wird auf Schulrechnern oft geleert).
- In Chrome und Edge darf man den Speicherort beim Speichern selbst auswählen. In Firefox landet
  die Datei im Download-Ordner und muss danach verschoben werden.
- Beim nächsten Mal: **„Ich habe schon einen Spielstand“** → **„Spielstand auswählen“**.
- Der Knopf „Spielstand speichern“ zeigt „nicht gespeichert“, solange es Neues gibt. Am Ende jeder Runde
  erinnert Tipp ans Speichern, und beim Schließen des Tabs fragt der Browser nach.
- Zusätzlich sichert TastenHeld den Stand automatisch im Browser. Nach einem versehentlichen Neuladen
  erscheint auf der Startseite „Weiterspielen als …“. Diese Sicherung verschwindet beim Abmelden
  vom Schulrechner. Die Datei ist deshalb der eigentliche Spielstand.

### Einstellungen (Zahnrad auf der Weltkarte)
- **Schriftgröße:** Normal, Groß, Sehr groß
- **Farben:** Kupfer & Pergament (Standard) und **Hoher Kontrast** (immer verfügbar). Mit XP kommen
  „Dunkles Holz“ (ab 300 XP) und „Bunte Werkstatt“ (ab 1000 XP) dazu.
- **Weniger Bewegung:** schaltet Wackel-, Hüpf- und Konfetti-Effekte ab. Das passiert auch automatisch,
  wenn es im Betriebssystem so eingestellt ist.
- **Mein Tipp:** Tipp in anderen Farben (ab 150, 400, 800 und 1500 XP).
- Im Spiel lassen sich **Tastatur** und **Hände** oben jederzeit ein- und ausblenden.
  Die Level schalten diese Hilfen nach und nach ab.

### Wertung
- Sterne gibt es **nur für Genauigkeit** (Standard: ★ 85 %, ★★ 93 %, ★★★ 98 %), nie für Tempo.
- Bei einem Fehler wartet der Cursor auf das richtige Zeichen. Pro Zeichen zählt höchstens ein Fehler.
- Tempo (Zeichen pro Minute) bringt nur Bonus-XP. Pausen über 3 Sekunden zählen nicht mit.
- Im Regen-Modus ist ein gelandeter Tropfen kein Fehler: Er kommt noch einmal, und der Regen wird langsamer.
- Im Monster-Modus gibt es kein „Game Over“: Erreicht das Monster Tipp, hüpft es zurück.
- Welt 1–4: versehentliches Shift oder eine eingeschaltete Feststelltaste zählt nicht als Fehler, Tipp gibt nur einen Hinweis.
- Großbuchstabe mit der Umschalttaste der falschen Hand: zählt als richtig, Tipp erklärt aber die bessere Hand.
- Tastenkunde (Welt 7, Tastenkombinationen in 8-6): gewertet wird nur der erste Versuch jeder Karte
  (Sterne ab 70/85/95 %). Falsche Karten kommen am Ende noch einmal. Beim zweiten Fehlversuch zeigt Tipp die Lösung.
- Boss-Geschichte: Jedes Kapitel wird sofort gespeichert. Der Boss gilt als geschafft, wenn alle 6 Kapitel getippt sind.
  Die Sterne richten sich nach der durchschnittlichen (besten) Genauigkeit aller Kapitel.
- „Meine Knackpunkte“ (oben auf der Weltkarte): Tipp sammelt Zeichen mit hoher Fehlerquote und baut daraus eine Übung
  mit Wörtern aus Leveln, die schon freigeschaltet sind.
- Es gibt keine Ranglisten, nur die persönliche Bestleistung.

### Gut zu wissen
- **Win-Taste (Level 7-4):** Sie öffnet unter Windows immer das Startmenü, das kann eine Webseite nicht verhindern.
  Deshalb wird sie nur per Klick auf die Bildschirm-Tastatur abgefragt. Drückt ein Kind sie trotzdem,
  pausiert das Spiel automatisch.
- **Tastenkombinationen (8-6):** Strg + S, C, V, X, Z, A werden im Spiel abgefangen, der Browser speichert also nicht.
  Gefährliche Kombinationen wie Strg + W (Tab schließen) werden nie abgefragt.
- Das Spiel pausiert automatisch, wenn das Fenster den Fokus verliert.

---

## Veröffentlichen (GitHub Pages)

1. Repository auf GitHub öffnen → **Settings** → **Pages**.
2. Unter „Build and deployment“: **Source: Deploy from a branch**.
3. Branch `main` und Ordner `/ (root)` wählen → **Save**.
4. Nach ein bis zwei Minuten ist das Spiel unter `https://<benutzername>.github.io/<repository>/` erreichbar.

**Nach einem Update:** Browser speichern die Programmdateien bis zu 10 Minuten zwischen. Wer TastenHeld kurz
vorher geöffnet hatte, lädt die Seite deshalb einmal mit **Strg + F5** neu. Das Spiel weist auch selbst darauf hin,
wenn es eine veraltete Version bemerkt.

## Lokal testen

Wegen der JavaScript-Module funktioniert ein Doppelklick auf `index.html` **nicht** (`file://`).
Nötig ist ein kleiner lokaler Webserver, zum Beispiel mit Python:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000` öffnen.

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

Der Validator prüft unter anderem: eindeutige Level-IDs, gültige Verweise (`unlock.after`, Listen, Stufen),
dass jedes Zeichen mit den freigeschalteten Tasten tippbar ist, Kleinbuchstaben in Welt 1–4, die Handregel in 5-1/5-2,
die Zeichenregeln für Welt 5 und 8, Tastenkombinationen (Code passt zur Beschriftung) und dass nur gerade
Anführungszeichen und normale Bindestriche vorkommen.

### Wörter ergänzen
Einfach in der passenden Liste in `words.json` ergänzen. Wichtig:
- Welt 1–4: nur Kleinbuchstaben und nur Tasten, die bis dahin eingeführt sind.
- Nur gerade Anführungszeichen (`"`) und den normalen Bindestrich (`-`) verwenden, keine typografischen.
  Vorsicht beim Kopieren aus Word!
- Listen-IDs nicht umbenennen, ohne `levels.json` anzupassen.

### Tastencodes (für keys.json)
`code` ist die **Position** der Taste, benannt nach der US-Tastatur. Auf der deutschen Tastatur liegt deshalb
das Z auf `KeyY` und das Y auf `KeyZ` (Strg + Z = `KeyY`). Der Validator meldet, wenn das nicht zusammenpasst.

### Welten und Weltbilder
Jede Welt in `levels.json` hat ein `theme` (`wiese`, `berge`, `wolken`, `hoehle`, `uhrturm`, `werkstatt`,
`maschinenraum`, `sternwarte`, `wald`). Mit `label` lässt sich die Überschrift auf der Karte ersetzen
(z. B. „Das große Abenteuer“ statt „Welt 9“). Das Bild dazu liegt unter
`assets/pixel/welten/<theme>.png` (Pixelart, 444 × 160 Pixel, wird dreifach vergrößert) und erscheint auf der Weltkarte und als Hintergrund im Spielfeld.
Die Level-Zahnräder sitzen links und unten im Bild, die Deko sollte deshalb eher rechts und oben liegen.

### Ein Level ergänzen
Beispiel aus `levels.json`:

```json
{
  "id": "1-3",
  "title": "G und H",
  "intro": "Die Zeigefinger holen G und H.",
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

- **`id`** ist der Schlüssel im Spielstand. Eine einmal vergebene ID **nicht umbenennen**, sonst verlieren
  die Kinder ihre Sterne. Muss es doch sein, braucht es eine Migration in `js/progress.js`
  (so geschehen bei 5-7 → 5-6).
- **`activeKeys` / `newKeys`:** einzelne Zeichen der Grundbelegung (`"a"`, `"ö"`, `","`, `"1"`) oder
  Tastennamen (`"Space"`, `"ShiftLeft"`, `"ShiftRight"`, `"CapsLock"`, `"AltGr"`). Großbuchstaben und
  Sonderzeichen sind erlaubt, wenn die passende Umschalt- bzw. AltGr-Taste in `activeKeys` steht.
  Vor Leveln mit `newKeys` zeigt Tipp ein kurzes Mini-Tutorial.
- **`caseMode`:** `"lower"` (Welt 1–4) oder `"mixed"` (ab Welt 5).
- **`content.source`:** eine Listen-ID oder mehrere als Array (`["w1_gh", "w1_woerter"]`). Dann wird
  gemischt gezogen. `count` = Anzahl der Einträge ohne Wiederholung.
- **`stars.minChars`:** so viele Zeichen müssen getippt sein, damit die Runde Sterne bekommt.
  `tempoBonusCpm` (optional): ab so vielen Zeichen pro Minute gibt es Bonus-XP.
- **`unlock.after`:** ID des Levels, das mit mindestens einem Stern geschafft sein muss (`null` = immer offen).
- **`optional: true`:** Bonus-Level (z. B. 8-5). Es wird nicht als „Hier geht's weiter“ vorgeschlagen,
  und das nächste Level hängt nicht davon ab.
- **`mode`:** `rain`, `monster`, `race`, `keyhunt` oder `story`. Jeder Modus liest nur seine eigenen `params`:
  - **rain** (Regen): `fallSpeed` (Anteil der Spielfeldhöhe pro Sekunde), `maxOnScreen` (gleichzeitige Tropfen),
    `spawnGap` (Sekunden zwischen Tropfen), `confirmSpace` (Wort zusätzlich mit Leertaste bestätigen, Standard: nein).
  - **monster:** `monsterSpeed` (Anteil der Strecke pro Sekunde, z. B. 0.02), `push` (so weit schubst ein
    fertiges Wort zurück), `errorBoost` (so viel schneller pro Fehler), `maxBoost` (höchstens so viel schneller).
  - **race** (Rennen): keine eigenen Parameter. Alle Wörter/Sätze werden zu einem fortlaufenden Text mit Leerzeichen.
  - **keyhunt** (Tastenkunde): `repeatWrong` (falsche Karten am Ende wiederholen, Standard: ja).
    `content` ist `{ "type": "keycards", "source": "7.1" }` (Stufe aus keys.json) oder `{ "type": "combos" }`.
  - **story** (Geschichte): `content` ist `{ "type": "story", "source": "story" }`, die Kapitel kommen aus story.json.
    Die Bilder zu den Kapiteln liegen unter `assets/pixel/story/` (Name wie im Feld `svg`, aber mit `.png`, z. B. `wald.png`).
  - **Alle Modi (derzeit nicht benutzt):** `capsCheck: true` für ein mögliches Feststelltasten-Level
    (Kleinbuchstaben bei aktiver Feststelltaste zählen nicht als Fehler, nach Wörtern in Großbuchstaben
    erinnert Tipp ans Ausschalten).
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
          hands.js       Hände-Overlay
          engine.js      Inhalte ziehen, Eingabe bewerten, Statistik, Sterne
          progress.js    Spielstand, Sicherung, Datei, Prüfsumme, Migration
          rewards.js     freischaltbare Tipp-Farben und Farbthemen
          knackpunkte.js Übungslevel aus den Tasten mit vielen Fehlern
          ui.js          kleine UI-Helfer, Dialoge, Einstellungen
          validator.js   Prüfung der JSON-Dateien (nur mit ?debug=1)
          screens/       Startseite, Weltkarte, Level-Vorschau/Tutorial, Spiel, Ergebnis
          modes/         Spielmodi (rain, monster, race, keyhunt, story) und textline.js
data/     JSON-Inhalte
assets/pixel/  selbst gezeichnete Pixelart (PNG, sehr klein, wird ohne Weichzeichnen vergrößert)
               ui/ = Bausatz der Oberfläche (Rahmen, Knöpfe, Symbole, Sterne, Hände)
assets/fonts/  Schriften, liegen im Projekt (es wird nichts aus dem Internet geladen):
               „Jersey 15“ (Überschriften) und „Atkinson Hyperlegible“ (Lesetext, besonders gut lesbar).
               Beide stehen unter der SIL Open Font License, die Lizenztexte liegen daneben.
tools/    pixelart.py erzeugt alle Pixelbilder neu (nur für Änderungen an den Grafiken nötig,
          braucht Python 3 mit Pillow: python3 tools/pixelart.py)
docs/     Spickzettel_Spielstand.pdf zum Ausdrucken, Vorlage in docs/spickzettel/ (HTML,
          im Browser öffnen und als PDF drucken)
```

### Spielstand-Format
```json
{
  "format": "tastenheld-spielstand",
  "version": 2,
  "name": "Lena",
  "savedAt": "2026-11-09T10:15:00.000Z",
  "data": { "profile": {}, "settings": {}, "levels": {}, "story": {}, "keyStats": {}, "xp": 0, "unlocked": {}, "tutorialsSeen": [] },
  "checksum": "9f3a1c07"
}
```
Die Prüfsumme (FNV-1a über `data`) erkennt nur versehentliche Beschädigungen und ist kein Schummelschutz.
Ändert sich das Format, wird `SAVE_VERSION` in `js/progress.js` erhöht und eine Migration ergänzt.
Ältere Dateien lassen sich dann weiter laden (Version 1 → 2: Level 5-7 heißt jetzt 5-6).
