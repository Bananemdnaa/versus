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

## Online-Konten (Supabase)

Login per Benutzername und Passwort (intern als `<name>@bananemdnaa.github.io`, es werden keine Mails verschickt). Mit Konto werden Bilanz, Einstellungen und gesehene Tutorials auf dem Server gespeichert und auf jedem Gerät abgeglichen. Beim ersten Login wandert der Gast-Fortschritt dieses Browsers ins Konto. Beim Abmelden bleibt alles im Konto, der Browser startet wieder als Gast. Im Reiter „Konto“ lässt sich der Benutzername einmal pro Woche ändern und das Konto samt Daten löschen.

**Admin-Panel** (Reiter „Konto“ → „Admin-Panel“, nur für Owner und Admins):
- Übersicht: Spielerzahl, wer gerade online ist und in welchem Spiel (aktualisiert alle 20 Sekunden), beliebteste Spiele, neue Spieler, Team
- Spieler: Suche nach Namensanfang; ausblenden, sperren (1, 7, 30 Tage oder dauerhaft, mit Grund), entsperren, private Notiz, umbenennen, Bilanz zurücksetzen
- Nur der Owner: Admins ernennen und entlassen, Dev-Konten (Testkonten, überall ausgeblendet). Admins können den Owner und andere Admins nicht bearbeiten.
- Protokoll: jede Admin-Aktion mit Zeit und wer sie gemacht hat

Alle Admin-Aktionen prüft der Server selbst (`require_admin`, `require_owner`), das Spiel zeigt nur die Knöpfe an.

**Einrichten:**
1. Neues Projekt auf supabase.com anlegen.
2. Unter Authentication → Sign In / Providers → Email: Email an, „Confirm email“ aus.
3. Im SQL-Editor `supabase/migrations/20261028000000_accounts_admin.sql` ausführen.
4. Project URL und Publishable Key (Settings → API Keys) in `js/cloud.js` bei `CFG` eintragen.
5. Im Spiel registrieren, dann einmal im SQL-Editor ausführen (Namen anpassen):
   `insert into public.admins (user_id, role) select id, 'owner' from public.profiles where username = 'dein_name' on conflict (user_id) do update set role = 'owner';`

## Freunde, Online-Partien und Ranglisten

Im Reiter „Online“ sucht man Spieler nach Namen, schickt Freundschaftsanfragen und sieht, wer gerade online ist und was er spielt. Herausgefordert wird direkt im Spiel-Panel: Modus „Freund“ lädt einen Freund ein, Modus „Online“ startet eine offene Herausforderung, die alle eingeloggten Spieler als Karte sehen; wer zuerst „Mitspielen“ drückt, spielt. Nimmt jemand an, werden die Seiten ausgelost und die Partie läuft live, jeder am eigenen Gerät. Du bist dabei immer Pink, dein Gegner Gelb.

- Online spielbar: 4 Gewinnt, Tic Tac Toe, Ultimate Tic Tac Toe, Schach, Dame, Reversi, Mühle, Käsekästchen (Schiffe versenken folgt, weil dort die Flotten geheim bleiben müssen)
- Beide Browser prüfen jeden Zug nach den Spielregeln; ein ungültiger Zug annulliert die Partie. Am Ende melden beide das Ergebnis, stimmen die Meldungen nicht überein, wird die Partie annulliert.
- Aufgeben über die Flagge oben rechts. Wer 75 Sekunden nicht erreichbar ist, verliert. Nach einem Neuladen geht es über „Weiterspielen“ im Reiter Online weiter.
- **Rangliste:** gewonnene Online-Partien gegen andere Spieler, gesamt und pro Spiel (Partien gegen die KI zählen nicht). Ausgeblendete und Dev-Konten erscheinen nicht.
- **Admin-Panel → Partien:** laufende und beendete Partien mit Spielern, Zügen und Ergebnis. „Zuschauen“ zeigt eine laufende Partie live, „Abspielen“ spielt eine beendete Zug für Zug nach. Admins können Partien annullieren (steht im Protokoll).

Dafür einmal `supabase/migrations/20261029000000_friends_matches.sql` und danach `supabase/migrations/20261030000000_open_matches.sql` im SQL-Editor ausführen.

Neue Migrationen kommen als weitere Datei in `supabase/migrations/` und werden in Reihenfolge einmal im SQL-Editor ausgeführt.
