# Versus

12 Spiele für zwei Spieler an einem Gerät oder allein gegen die KI in vier Stufen. Jedes Spiel hat ein eigenes Tutorial.

**Spielen:** https://bananemdnaa.github.io/versus/

## Spiele

- **Klassiker:** 4 Gewinnt, Schiffe versenken, Tic Tac Toe, Ultimate Tic Tac Toe, Käsekästchen
- **Strategie:** Schach, Dame, Reversi, Mühle
- **Action:** Reaktionsduell, Pong, Air Hockey (beide spielen gleichzeitig am selben Handy, jeder auf seiner Hälfte)

## Modi

Am Laptop ist die Startseite ein Auswahlbildschirm: links die Spiele, rechts direkt die Einstellungen des gewählten Spiels. Im Spiel stehen die Spielerkarten links und rechts neben dem Brett. Am Handy öffnet ein Tipp auf ein Spiel dessen Einstellungen.

Du bist immer Pink und links, die KI immer Gelb und rechts, egal wer anfängt. Zu zweit ist Spieler 1 Pink, Spieler 2 Gelb.

- **Gegen KI** (alle Brettspiele): Leicht ist ein echter Anfänger, Mittel ein Gelegenheitsspieler, Schwer rechnet sauber ein paar Züge voraus, Profi rechnet so tief, wie die Bedenkzeit erlaubt. Du wählst, wer anfängt (bei Schach deine Farbe). Die KI denkt sichtbar nach, zielt mit einem Fadenkreuz auf ihren Zug, schreibt ihren letzten Zug in die Statuszeile und kommentiert die Lage in einer Sprechblase.
- **Action-Spiele** gibt es nur zu zweit, weil dort eine KI nur über die Reaktionszeit stark oder schwach wäre.
- **2 Spieler, ein Gerät:** abwechselnd am selben Handy oder PC. Bei Schiffe versenken kommt zwischen den Zügen ein Wechsel-Bildschirm, damit keiner die Flotte des anderen sieht.

Regeln im Detail:
- **Schach:** alle Regeln, also Rochade, en passant, Umwandlung mit Auswahl, Patt, dreifache Wiederholung, 50-Züge-Regel und zu wenig Material.
- **Dame:** deutsche Regeln mit Schlagzwang, Mehrfachsprüngen und fliegenden Damen; Remis nach 25 Damenzügen pro Spieler ohne Schlagen.
- **Mühle:** Setzen, Ziehen und Springen ab drei Steinen; Remis nach 30 Zügen pro Spieler ohne Mühle.
- **Schiffe versenken:** 10×10, fünf Schiffe, die sich nicht berühren dürfen; ein Treffer heißt nochmal schießen.

## Steuerung

Alles geht mit Finger oder Maus. Am PC zusätzlich mit der Tastatur, `?` zeigt alle Kürzel:

- Spielauswahl: Pfeiltasten wählen ein Spiel, `Enter` startet es, `1`–`4` stellen die KI-Stärke ein, `S` wechselt zwischen „Gegen KI“ und „Zu zweit“, `T` öffnet die Regeln
- Brettspiele: Pfeiltasten bewegen einen Cursor über das Brett, `Enter` oder `Leertaste` setzt bzw. wählt aus
- `N` neue Partie, `T` Tutorial, `Esc` zurück, `M` Ton an oder aus
- Eigene Tasten: 4 Gewinnt `1`–`7`, Tic Tac Toe `1`–`9` wie der Ziffernblock, Schiffe versenken `R` drehen, `Z` zufällig, `F` fertig, Pong `←` `→` und `A` `D`, Air Hockey Pfeiltasten und `W` `A` `S` `D`, Reaktionsduell `Leertaste` bzw. `L` und `A`

## Optionen

Ton, Vibration (am Handy) und Effekte lassen sich unter „Optionen“ abschalten. Mit „Effekte aus“ fallen Konfetti, Partikel, Wackeln und die Hintergrund-Animation weg, das spart Akku. Wer im System „Bewegung reduzieren“ eingestellt hat, bekommt das automatisch.

Statistik, Einstellungen und gesehene Tutorials liegen im `localStorage` des Browsers. Es gibt keine Konten und keine Werbung.

## Aufbau

- `index.html`: Seite, lädt alle Dateien
- `css/app.css`: Oberfläche, Animationen, Effekte
- `js/core.js`: Menüs, Statistik, Tutorials, Tastatur, Effekte, KI-Helfer (Alpha-Beta-Suche und Monte-Carlo-Baumsuche)
- `js/games/*.js`: ein Spiel pro Datei; jedes registriert sich mit `V.register({...})`

Ein neues Spiel ist eine neue Datei in `js/games/` plus ein `<script>`-Eintrag in `index.html`. Nach Änderungen die Versionsnummer `?v=` in `index.html` erhöhen, damit Browser keine alten Dateien aus dem Cache nehmen.

## Lokal starten

`index.html` im Browser öffnen reicht meistens. Sonst über einen kleinen lokalen Server, zum Beispiel:

```
npx serve .
```
