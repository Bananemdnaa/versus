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
- **Schiffe versenken:** 10×10, fünf Schiffe, die sich nicht berühren dürfen; ein Treffer heißt nochmal schießen. Platzieren: Schiffe aus dem Dock unter dem Brett aufs Meer ziehen (grüne Vorschau = passt), Antippen dreht, Ziehen verschiebt, zurück ins Dock ziehen nimmt weg; am PC auch Schiff wählen und Feld anklicken, `R` dreht.

## Steuerung

Alles geht mit Finger oder Maus. Am PC zusätzlich mit der Tastatur, `?` zeigt alle Kürzel:

- Spielauswahl: Pfeiltasten wählen ein Spiel, `Enter` startet es, `1`–`4` stellen die KI-Stärke ein, `S` wechselt zwischen „Gegen KI“ und „Zu zweit“, `T` öffnet die Regeln
- Brettspiele: Pfeiltasten bewegen einen Cursor über das Brett, `Enter` oder `Leertaste` setzt bzw. wählt aus
- `N` neue Partie, `T` Tutorial, `Esc` zurück, `M` Ton an oder aus
- Eigene Tasten: 4 Gewinnt `1`–`7`, Tic Tac Toe `1`–`9` wie der Ziffernblock, Schiffe versenken `R` drehen, `Z` zufällig, `F` fertig, Pong `←` `→` und `A` `D`, Air Hockey Pfeiltasten und `W` `A` `S` `D`, Reaktionsduell `Leertaste` bzw. `L` und `A`

## Gast-Modus

Ohne Konto spielt man als Gast: 4 Gewinnt, Tic Tac Toe, Schiffe versenken, Käsekästchen, Reaktionsduell und Pong gegen die KI oder zu zweit. Die übrigen Spiele, Freund- und Online-Partien und die Rangliste brauchen ein kostenloses Konto. Die Liste steht in `js/core.js` bei `GUEST_GAMES`.

## Erster Start

Beim allerersten Öffnen erklären drei kurze Folien, was Versus ist und wie man spielt. „Tutorials wieder als neu zeigen“ in den Optionen zeigt sie erneut.

## Optionen

- **Ton und Vibration:** Ton an/aus (Effekte und Musik zusammen), Lautstärke Effekte, Musik an/aus mit eigener Lautstärke, Vibration Aus / Leicht / Stark mit Test-Knopf. Spürt man beim Test nichts, steht das Handy meist auf Lautlos oder Nicht stören, dann unterdrückt Android Vibrationen von Webseiten. Android und die meisten Browser nutzen die Vibrations-Schnittstelle; iPhones (ab iOS 18) bekommen stattdessen ein kurzes haptisches Tippen.
- **Anzeige:** Effekte (aus spart Akku; bei „Bewegung reduzieren“ im System automatisch aus), Intros (Start-Animation und VS-Einblendung), Koordinaten am Schachbrett, Zughilfen (mögliche Züge in Schach, Dame, Reversi und Mühle).
- **Spiel:** Schnelle KI zieht ohne Nachdenk-Pause und ohne Zielen.
- **Online:** offene Herausforderungen einblenden; Online-Status vor Freunden verbergen.
- **App:** installieren, nach Updates suchen. **Daten:** Tutorials zurücksetzen, Einstellungen zurücksetzen, Bilanz löschen.

Statistik, Einstellungen und gesehene Tutorials liegen im `localStorage` des Browsers und werden mit Konto zusätzlich gespeichert. Keine Werbung.

## Musik

Die Musik wird live im Browser erzeugt (`js/music.js`, Web Audio), es gibt keine Audiodateien und keine Lizenzfragen. Vier Stimmungen: Menü, Klassiker, Strategie (ruhig) und Action (schnell). Alle 8 Takte ändert sich das Arrangement, das Arpeggio wechselt sein Muster. Bei Sieg und Niederlage wird sie kurz leiser, im Hintergrund pausiert sie.

## Als App

Versus ist eine installierbare Web-App (`manifest.webmanifest`, `sw.js`, Symbole in `icons/`). Android/Chrome zeigt auf der Startseite „Als App holen“, iPhones bekommen eine Anleitung (Teilen → Zum Home-Bildschirm). Installiert läuft Versus ohne Browserleiste, startet sofort und funktioniert für KI-Partien und Spiele zu zweit auch offline. Online-Funktionen brauchen weiter Internet.

Der Service Worker lädt Seiten zuerst aus dem Netz und Dateien mit `?v=` aus dem Cache. Kommt eine neue Version, erscheint oben „Neue Version da · Neu laden“. Die Zurück-Taste bzw. -Geste schließt Dialoge, fragt im Spiel vor dem Verlassen nach und geht sonst eine Ebene zurück. Kurzbefehle auf dem App-Symbol: `?tab=online` und `?tab=stats`. Ohne Internet zeigt die App oben „Offline“, der Reiter Online erklärt, was gerade nicht geht.


## Aufbau

- `index.html`: Seite, lädt alle Dateien
- `css/app.css`: Oberfläche, Animationen, Effekte
- `js/core.js`: Menüs, Statistik, Tutorials, Tastatur, Effekte, KI-Helfer (Alpha-Beta-Suche und Monte-Carlo-Baumsuche)
- `js/games/*.js`: ein Spiel pro Datei; jedes registriert sich mit `V.register({...})`

Ein neues Spiel ist eine neue Datei in `js/games/` plus ein `<script>`-Eintrag in `index.html`. Nach Änderungen die Versionsnummer `?v=` in `index.html`, `V.VERSION` und `CACHE` in `sw.js` erhöhen, damit Browser und App keine alten Dateien aus dem Cache nehmen.

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
- Nur der Owner: Admins ernennen und entlassen, Dev-Konten (Testkonten: normal sichtbar bei Suche und Freunden, aber nicht in Ranglisten und Admin-Zahlen; Partien gegen sie zählen für niemanden). Admins können den Owner und andere Admins nicht bearbeiten.
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

- Online spielbar: 4 Gewinnt, Schiffe versenken, Tic Tac Toe, Ultimate Tic Tac Toe, Schach, Dame, Reversi, Mühle, Käsekästchen
- Schiffe versenken online: Die Flotten liegen nur auf dem Server, der sie auf die Regeln prüft (5 Schiffe, gerade, ohne Berührung), jeden Schuss auswertet und entscheidet, wer dran ist. Der Gegner sieht ein Schiff erst, wenn es versenkt ist.
- Beide Browser prüfen jeden Zug nach den Spielregeln; ein ungültiger Zug annulliert die Partie. Am Ende melden beide das Ergebnis, stimmen die Meldungen nicht überein, wird die Partie annulliert.
- Aufgeben über die Flagge oben rechts. Wer 75 Sekunden nicht erreichbar ist, verliert. Nach einem Neuladen geht es über „Weiterspielen“ im Reiter Online weiter.
- **Rangliste:** gewonnene Online-Partien gegen andere Spieler, gesamt und pro Spiel (Partien gegen die KI zählen nicht). Standard ist die Wochenwertung, die jeden Montag um 0:00 Uhr neu startet (mit Countdown und den besten drei der Vorwoche); „Für immer“ zeigt die ewige Wertung. Oben steht dein eigener Platz, darunter ein Podest für die Top 3 und die Liste mit Siegquote. Ausgeblendete Spieler und Dev-Konten erscheinen nicht; Partien gegen ein Dev-Konto zählen für beide Spieler nicht.
- **Profile:** Ein Tipp auf einen Namen (Freunde, Suche, Rangliste) zeigt das Profil: Siege, Niederlagen, Siegquote, Wochenplatz, Siegesserie, euer direkter Vergleich, Bilanz pro Spiel und die letzten Partien. Von dort aus kann man herausfordern oder eine Freundschaftsanfrage schicken. Das eigene Profil steht im Reiter Konto unter „Profil und Verlauf“.
- **Reaktionen:** Im Online-Spiel öffnet der Smiley oben acht Reaktionen (GG, 😮, 😂, 🙈, 🤔, 🔥, 👏, 😅), die beim Gegner über seiner Karte aufsteigen. Nach der Partie gibt es vier davon direkt im Ergebnis-Fenster.
- **Revanche:** Wer zuerst „Revanche“ drückt, lädt ein; drückt der andere auch, geht es sofort weiter, mit getauschten Farben und dem Spielstand der Serie.
- **Schachuhr:** Bei Schach zu zweit und online 3, 5 oder 10 Minuten pro Spieler plus 2 Sekunden pro Zug. Online rechnet der Server die Zeit aus den Zugzeiten, wer über die Zeit kommt, verliert.
- **Admin-Panel → Partien:** laufende und beendete Partien mit Spielern, Zügen und Ergebnis. „Zuschauen“ zeigt eine laufende Partie live, „Abspielen“ spielt eine beendete Zug für Zug nach. Admins können Partien annullieren (steht im Protokoll).

Dafür einmal `supabase/migrations/20261029000000_friends_matches.sql` und danach `supabase/migrations/20261030000000_open_matches.sql`, für Schiffe versenken online zusätzlich `supabase/migrations/20261031000000_ships_online.sql` und `supabase/migrations/20261101000000_dev_rankings.sql` und für „Online-Status verbergen“ `supabase/migrations/20261102000000_hide_online.sql`, für die Wochen-Rangliste `supabase/migrations/20261103000000_weekly_rankings.sql`, für Profile, Reaktionen, Revanche und Schachuhr `supabase/migrations/20261104000000_profiles_social.sql` im SQL-Editor ausführen.

Neue Migrationen kommen als weitere Datei in `supabase/migrations/` und werden in Reihenfolge einmal im SQL-Editor ausgeführt.
