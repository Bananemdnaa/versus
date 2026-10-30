// English dictionary for js/i18n.js: German text on the left, English on the right.
// # stands for a number, {0} {1} … for inline tags (bold words, coloured names) inside a sentence.
// Collected with localStorage versus.i18nlog = 1 and V.i18n.missing() / V.i18n.harvest().
(function () {
  'use strict';
  if (V.lang !== 'en') return;
  const A = o => V.i18n.add(o);

  // ---------- shell: menus, tabs, panel ----------
  A({
    'Spiele': 'Games', 'Online': 'Online', 'Bilanz': 'Stats', 'Konto': 'Account', 'Optionen': 'Settings', 'Bereiche': 'Sections',
    'Alle': 'All', 'Klassiker': 'Classics', 'Brettspiele': 'Board games', 'Strategie': 'Strategy', 'Action': 'Action',
    'Leicht': 'Easy', 'Mittel': 'Medium', 'Schwer': 'Hard', 'Profi': 'Pro',
    'Macht oft Fehler. Gut zum Lernen.': 'Makes lots of mistakes. Good for learning.',
    'Spielt solide, übersieht aber einiges.': 'Plays solidly but misses things.',
    'Denkt mehrere Züge voraus.': 'Thinks several moves ahead.',
    'Volle Rechenpower. Viel Glück.': 'Full computing power. Good luck.',
    'Pink': 'Pink', 'Gelb': 'Yellow', 'Cyan': 'Cyan', 'Grün': 'Green',
    'Versus Startseite': 'Versus home', 'Tastenkürzel': 'Keyboard shortcuts', 'Tastenkürzel (?)': 'Keyboard shortcuts (?)',
    'Ton an oder aus': 'Sound on or off', 'Ton (M)': 'Sound (M)', 'Ton': 'Sound', 'Ton an': 'Sound on', 'Ton aus': 'Sound off',
    'Gast': 'Guest', 'Anmelden': 'Sign in', 'Konto behalten': 'Keep account', 'Gast · Anmelden': 'Guest · Sign in',
    'Zwei bis vier · Ein Gerät': 'Two to four · One device',
    '{0} Duell': '{0} duel', 'Wähl dein': 'Choose your', 'Duell': 'duel',
    '# Spiele für zwei bis vier an einem Gerät. Oder du gegen die KI in vier Stufen.': '# games for two to four on one device. Or you against the AI at four levels.',
    'Weiterspielen': 'Continue', 'Zu zweit': 'Two players', 'Gegen KI': 'Vs. AI', 'Gegen die KI': 'Against the AI', 'Am Gerät': 'One device',
    'Mit Konto': 'With account', 'Neu': 'New', '#× gespielt': 'played #×', 'KI #:#': 'AI #:#',
    'Freund': 'Friend', 'Stärke': 'Strength', 'Bilanz #:#': 'Record #:#', 'Beginn': 'First move', 'Du': 'You', 'KI': 'AI', 'Zufall': 'Random',
    'So stark spielt die KI auf freien Plätzen.': 'This is how strong the AI plays on empty seats.',
    'Ihr spielt abwechselnd am selben Gerät.': 'You take turns on the same device.',
    'Ihr spielt abwechselnd am selben Gerät, jeder auf seiner Hälfte.': 'You play on the same device, each on your own half.',
    'Spielen': 'Play', 'Regeln': 'Rules', 'Enter': 'Enter', 'Zurück': 'Back', 'Schließen': 'Close', 'Weiter': 'Next', 'Verstanden': 'Got it',
    'Mit Konto spielbar': 'Playable with an account',
    'Konto erstellen': 'Create account',
    'Du bist offline': 'You are offline',
    'Freunde, Herausforderungen und Ranglisten brauchen Internet. Gegen die KI oder zu zweit an einem Gerät kannst du trotzdem spielen.': 'Friends, challenges and rankings need the internet. You can still play against the AI or with two players on one device.',
    'Zu den Spielen': 'To the games', 'Offline': 'Offline', '{0} · KI und Spiele zu zweit gehen weiter': '{0} · AI and two-player games keep working',
    'Wieder online': 'Back online', 'Lädt': 'Loading',
    // stats tab
    '{0} Bilanz': '{0} stats', 'Deine': 'Your', 'Partien': 'Games', 'Siege gegen KI': 'Wins vs. AI', 'Online-Siege': 'Online wins', 'Siegquote': 'Win rate',
    'Noch keine Partien': 'No games yet', 'Spiel aussuchen': 'Pick a game',
    'Spiel eine Runde, dann steht hier deine Bilanz pro Spiel: gegen die KI, online und zu zweit.': 'Play a round, then your record per game shows up here: against the AI, online and two-player.',
    'Siege': 'Wins', 'Remis': 'Draws', 'Niederlagen': 'Losses', 'Online #:#': 'Online #:#', 'Zu zweit #': 'Two players #',
    // options tab
    '{0} Optionen': '{0} settings', 'Ton und Vibration': 'Sound and vibration', 'Anzeige': 'Display', 'Spiel': 'Game', 'App': 'App', 'Daten': 'Data',
    'Schaltet Effekte und Musik zusammen an und aus': 'Turns effects and music on and off together',
    'Musik': 'Music', 'Eigene Stücke für Menü, Klassiker, Strategie und Action': 'Own tracks for menu, classics, strategy and action',
    'Lautstärke Effekte': 'Effects volume', 'Lautstärke Musik': 'Music volume',
    'Vibration': 'Vibration', 'Aus': 'Off', 'Stark': 'Strong', 'Testen': 'Test',
    'Dieser Browser kann nicht vibrieren': 'This browser cannot vibrate', 'iPhone ab iOS 18: kurzes Tippen statt Ruckeln': 'iPhone with iOS 18 or later: a short tap instead of a buzz',
    'Bei Zügen, Treffern und am Ende': 'On moves, hits and at the end',
    'Effekte': 'Effects', 'Konfetti, Partikel, Animationen. Aus spart Akku.': 'Confetti, particles, animations. Off saves battery.',
    'Intros': 'Intros', 'Start-Animation und VS-Einblendung vor jeder Partie': 'Start animation and VS screen before every game',
    'Koordinaten': 'Coordinates', 'Buchstaben und Zahlen am Schachbrett': 'Letters and numbers on the chess board',
    'Zughilfen': 'Move hints', 'Zeigt, wohin du ziehen kannst (Schach, Dame, Reversi, Mühle)': 'Shows where you can move (chess, checkers, Reversi, mill)',
    'Sprache': 'Language', 'Deutsch': 'Deutsch',
    'Schnelle KI': 'Fast AI', 'Die KI zieht sofort, ohne Nachdenken und Zielen': 'The AI moves right away, without thinking and aiming',
    'Offene Herausforderungen': 'Open challenges', 'Einblenden, wenn jemand einen Gegner sucht': 'Show when someone is looking for an opponent',
    'Online-Status verbergen': 'Hide online status', 'Freunde sehen nicht, ob und was du gerade spielst, und können nicht zuschauen': 'Friends do not see whether or what you are playing, and cannot watch',
    'Läuft als App': 'Running as an app', 'Versus ist auf diesem Gerät installiert': 'Versus is installed on this device',
    'Als App installieren': 'Install as app', 'Eigenes Symbol, startet schneller, ohne Browserleiste': 'Own icon, starts faster, no browser bar',
    'Nach Updates suchen': 'Check for updates', 'Version #': 'Version #',
    'Tutorials wieder als neu zeigen': 'Show tutorials as new again', 'Einstellungen zurücksetzen': 'Reset settings', 'Bilanz löschen': 'Delete stats',
    'Sicher? Nochmal tippen': 'Sure? Tap again',
    'Versus # · ohne Werbung. KI und Spiele zu zweit laufen auch offline.': 'Versus # · no ads. AI and two-player games also work offline.',
    'Taste {0} zeigt alle Kürzel.': 'Key {0} shows all shortcuts.',
    'Der Browser hat die Vibration blockiert. Tipp einmal irgendwo auf die Seite und versuch es nochmal.': 'The browser blocked vibration. Tap anywhere on the page once and try again.',
    'Nichts gespürt? Auf dem iPhone geht das erst ab iOS 18 und nur, wenn unter Einstellungen → Töne & Haptik die {0} an ist.': 'Nothing felt? On iPhone this needs iOS 18 or later, and {0} must be on under Settings → Sounds & Haptics.',
    'Systemhaptik': 'System Haptics',
    'Nichts gespürt? Android schluckt Vibrationen von Webseiten, wenn das Handy auf {0} oder {1} steht. Stell auf Ton oder Vibrieren und schau unter Einstellungen → Töne und Vibration → {2}, dass {3} und {4} nicht auf 0 stehen.': 'Nothing felt? Android swallows vibration from websites when the phone is on {0} or {1}. Switch to sound or vibrate and check under Settings → Sounds and vibration → {2} that {3} and {4} are not at 0.',
    'Lautlos': 'Silent', 'Nicht stören': 'Do not disturb', 'Vibrationsintensität': 'Vibration intensity', 'Berührung': 'Touch', 'Benachrichtigungen': 'Notifications',
    'Geht erst nach dem nächsten Server-Update': 'Works after the next server update',
    'Alle Tutorials sind wieder neu': 'All tutorials are new again', 'Einstellungen zurückgesetzt': 'Settings reset', 'Bilanz gelöscht': 'Stats deleted',
    // tutorial dialog, welcome
    'Willkommen': 'Welcome', 'Willkommen bei Versus': 'Welcome to Versus', 'Drei Arten zu spielen': 'Three ways to play', 'Leg los': "Let's go",
    '{0}: Klassiker wie # Gewinnt und Schach, Strategie und schnelle Action-Duelle. Gemacht für eine schnelle Runde zwischendurch mit Freunden.': '{0}: classics like Connect 4 and chess, strategy and fast action duels. Made for a quick round with friends.',
    '# Spiele für zwei bis vier': '# games for two to four',
    '# Stufen': '# levels', 'ein Gerät': 'one device', 'mit Freunden': 'with friends',
    '{0} von Anfänger bis Profi, {1} an einem Handy, oder {2} gegen Freunde. Die Rangliste startet jeden Montag neu.': '{0} from beginner to pro, {1} on one phone, or {2} against friends. The ranking starts over every Monday.',
    'zu zweit': 'two players', 'online': 'online',
    'Tutorial': 'Tutorial', 'in jedem Spiel': 'in every game', 'kostenlos': 'free', 'installierbar': 'installable',
    'Jedes Spiel erklärt sich beim ersten Mal selbst. Als Gast spielst du sofort los; mit einem Konto sind alle Spiele, Freunde und Online-Partien dabei.': 'Every game explains itself the first time. As a guest you can start right away; with an account you get all games, friends and online matches.',
    // keyboard dialog
    'Überall': 'Everywhere', 'Diese Übersicht': 'This overview', 'Esc': 'Esc', 'Zurück oder schließen': 'Back or close',
    'Spielauswahl': 'Game selection', 'Spiel wählen': 'Choose game', 'KI-Stärke': 'AI strength', 'Gegen KI oder zu zweit': 'Vs. AI or two players',
    'Im Spiel': 'In the game', 'Cursor über das Brett': 'Cursor over the board', 'Enter Leertaste': 'Enter Space', 'Feld wählen oder setzen': 'Choose or place',
    'Neue Partie': 'New game', 'Leertaste': 'Space',
    // install, updates
    'Als App holen': 'Get the app', 'Schneller Start, auch offline': 'Quick start, works offline', 'Installieren': 'Install', 'Nicht mehr anzeigen': "Don't show again",
    'Versus installieren': 'Install Versus', 'Tippe in Safari auf {0} {1}': 'In Safari, tap {0} {1}', 'Teilen': 'Share',
    'Wähle {0}': 'Choose {0}', 'Zum Home-Bildschirm': 'Add to Home Screen', 'Tippe oben rechts auf {0}': 'Tap {0} at the top right', 'Hinzufügen': 'Add',
    'Öffne das Menü deines Browsers (⋮ oder ☰)': "Open your browser's menu (⋮ or ☰)", 'Wähle {0} oder {1}': 'Choose {0} or {1}',
    'App installieren': 'Install app', 'Zum Startbildschirm': 'Add to home screen', 'Bestätige mit {0}': 'Confirm with {0}',
    'Danach startet Versus wie eine normale App von deinem Startbildschirm.': 'Then Versus starts like a normal app from your home screen.',
    'Alles klar': 'Got it', 'Versus ist jetzt installiert': 'Versus is now installed',
    'Neue Version da': 'New version available', 'Kurz neu laden, dann ist sie aktiv': 'Reload once to use it', 'Neu laden': 'Reload', 'Später': 'Later',
    'Lade neu …': 'Reloading …', 'Suche nach Updates …': 'Checking for updates …', 'Keine Verbindung': 'No connection', 'Du hast die neueste Version': 'You have the latest version'
  });

  // ---------- play screen ----------
  A({
    'Spieler 1': 'Player 1', 'Spieler 2': 'Player 2', 'Spieler 3': 'Player 3', 'Spieler 4': 'Player 4', 'Spieler #': 'Player #',
    'DU': 'YOU', 'beginnt': 'starts', '· beginnt': '· starts', 'am Zug': 'to move',
    '{0} bist dran': '{0} to move', '{0} ist dran': '{0} to move', 'Du bist dran': 'Your turn', 'Dein Zug.': 'Your move.',
    '{0} {1}': '{0} {1}', 'denkt': 'is thinking', 'macht weiter': 'keeps going',
    'Sieg!': 'Victory!', 'Niederlage': 'Defeat', 'Unentschieden': 'Draw', '{0} gewinnt': '{0} wins', '{0} hat gewonnen': '{0} won', 'Du hast gewonnen': 'You won',
    '#× unentschieden': '#× draw', 'Revanche': 'Rematch', 'Revanche anfragen': 'Ask for a rematch', 'Neuer Tisch': 'New table', 'Brett ansehen': 'View board', 'Menü': 'Menu',
    '· zählt nicht für die Rangliste': "· doesn't count for the ranking",
    'Regeln (T)': 'Rules (T)', 'Reaktion senden': 'Send reaction', 'Neu starten': 'Restart', 'Neue Partie (N)': 'New game (N)', 'Aufgeben': 'Resign',
    'Gib das Gerät an {0}': 'Hand the device to {0}', 'Die anderen schauen kurz weg.': 'The others look away for a moment.', 'Ich bin #': "I'm #",
    'Ich sehe den Sieg.': 'I can see the win.', 'Gleich ist es vorbei.': "It's almost over.", 'Das war’s wohl.': "That's it, I think.", 'Läuft für mich.': 'Going my way.',
    'Gefällt mir.': 'I like it.', 'Nicht schlecht, oder?': 'Not bad, right?', 'Mal sehen.': "Let's see.", 'Interessant.': 'Interesting.', 'Okay.': 'Okay.', 'Hm.': 'Hm.',
    'Hmm, knifflig.': 'Hmm, tricky.', 'Du spielst gut.': 'You play well.', 'Das wird eng.': 'This is getting tight.', 'Oh nein.': 'Oh no.', 'Das sieht übel aus.': 'This looks bad.', 'Respekt.': 'Respect.',
    'Partie wird neu geladen': 'Reloading the game', 'Zug nicht gesendet:': 'Move not sent:', 'Nicht gesendet:': 'Not sent:',
    'Die Partie wurde annulliert (Ergebnisse passten nicht zusammen).': "The game was voided (the results didn't match).", 'Partie annulliert': 'Game voided',
    'Du hast aufgegeben': 'You resigned', 'Deine Zeit ist abgelaufen': 'Your time ran out', 'Du hast die Partie verlassen': 'You left the game',
    'Ungültiger Zug empfangen, die Partie wird annulliert.': 'Invalid move received, the game is voided.',
    'Revanche annehmen': 'Accept rematch', 'Keine Antwort auf die Revanche': 'No answer to the rematch', '· KI übernimmt': '· AI takes over',
    'Der Tisch wurde aufgelöst': 'The table was closed', 'Tisch wird neu geladen': 'Reloading the table', 'Der Spielstand passt nicht zusammen, lade neu …': "The game state doesn't match, reloading …",
    'Zuschauen': 'Watch', 'Online gegen': 'Online vs.', 'KIs': 'AIs', 'Dafür brauchst du ein Konto': 'You need an account for that',
    'Wirklich aufgeben?': 'Really resign?', 'Partie verlassen?': 'Leave the game?', 'Verlassen': 'Leave', 'Weiterspielen?': 'Keep playing?',
    'Zeit abgelaufen': 'Time ran out', 'Würfeln': 'Roll', 'König': 'King'
  });

  // ---------- account ----------
  A({
    '{0} Konto': '{0} account', '{0} spielen': 'Play {0}', 'Dein': 'Your', 'Einloggen': 'Sign in', 'Benutzername': 'Username', 'Passwort': 'Password', 'Passwort wiederholen': 'Repeat password',
    'z. B. blitzfuchs': 'e.g. blitzfox', 'mindestens 6 Zeichen': 'at least 6 characters', 'Passwort vergessen?': 'Forgot password?',
    'Mit einem Konto liegt deine Bilanz sicher auf dem Server und ist auf jedem Gerät dabei. Freunde und Online-Duelle bauen darauf auf.': 'With an account your stats are safe on the server and with you on every device. Friends and online duels build on it.',
    'Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -. Es gibt keine E-Mail. Nach dem Erstellen bekommst du einen Wiederherstellungscode für ein vergessenes Passwort.': 'Username: 3 to 16 characters, only a–z, 0–9, _ and -. There is no e-mail. After signing up you get a recovery code in case you forget your password.',
    'Deine # Partien aus diesem Browser wandern beim Einloggen mit ins Konto.': 'Your # games from this browser move into the account when you sign in.',
    'Online-Konten sind gleich da. Der Server wird gerade eingerichtet.': 'Online accounts are coming soon. The server is being set up.',
    'Wird abgeglichen …': 'Syncing …', 'Abgeglichen': 'Synced', 'Gespeichert gerade eben': 'Saved just now', 'Abgleichen': 'Sync', 'Abmelden': 'Sign out',
    'Profil und Verlauf': 'Profile and history', 'Admin-Panel': 'Admin panel', 'Dabei seit #': 'Member since #', 'Dabei seit': 'Member since',
    'Benutzernamen ändern': 'Change username', 'Einmal pro Woche möglich': 'Possible once a week', 'Neuer Name': 'New name', 'Ändern': 'Change',
    'Konto löschen': 'Delete account', 'Löscht dein Konto und alle Daten auf dem Server': 'Deletes your account and all data on the server',
    'Passwort zur Bestätigung': 'Password to confirm', 'Endgültig löschen': 'Delete for good',
    'Die Passwörter sind nicht gleich.': "The passwords don't match.", 'Konto erstellt': 'Account created', 'Eingeloggt': 'Signed in', 'Abgemeldet': 'Signed out', 'Konto gelöscht': 'Account deleted',
    'Passwort anzeigen': 'Show password', 'Passwort verbergen': 'Hide password',
    'Wiederherstellungscode': 'Recovery code', 'Du hast einen. Neu erstellen macht den alten ungültig.': 'You have one. Making a new one invalidates the old one.',
    'Noch keiner.': 'None yet.', '{0} Ohne Code ist ein vergessenes Passwort weg.': '{0} Without a code a forgotten password is lost.',
    'Blockierte Spieler': 'Blocked players', 'Niemand blockiert. Geht im Profil eines Spielers.': "Nobody blocked. You can do it in a player's profile.", '# blockiert': '# blocked',
    'Niemand blockiert. Blockierte Spieler können dich nicht einladen, nicht anfragen und landen nie im Schnellen Spiel bei dir.': "Nobody blocked. Blocked players can't invite you, can't send you requests and are never matched with you in Quick match.",
    'Freigeben': 'Unblock',
    'Dein Wiederherstellungscode': 'Your recovery code',
    'Damit setzt du ein neues Passwort, falls du es vergisst. Er wird nur dieses eine Mal angezeigt. Mach am besten einen Screenshot oder schreib ihn auf.': 'Use it to set a new password if you forget yours. It is shown only this once. Best take a screenshot or write it down.',
    'Kopieren': 'Copy', 'Hab ich gespeichert': "I've saved it", 'Code kopiert': 'Code copied',
    'Wiederherstellungscodes kommen nach dem nächsten Server-Update.': 'Recovery codes come with the next server update.',
    '{0} vergessen': 'Forgot {0}',
    'Mit deinem Wiederherstellungscode setzt du ein neues Passwort. Den Code hast du beim Erstellen des Kontos bekommen (oder später unter Konto).': 'Set a new password with your recovery code. You got the code when you created the account (or later under Account).',
    'Neues Passwort': 'New password', 'Passwort neu setzen': 'Set new password', 'Zurück zum Login': 'Back to sign in', 'Neues Passwort gesetzt': 'New password set',
    'Kein Code? Dann lässt sich das Konto leider nicht zurückholen, weil Versus keine E-Mail-Adressen speichert. Erstell einfach ein neues.': "No code? Then the account can't be recovered, because Versus doesn't store e-mail addresses. Just create a new one.",
    'Das kommt nach dem nächsten Server-Update.': 'That comes with the next server update.',
    'Gilt nur in diesem Browser': 'Only valid in this browser',
    'Du spielst als Gast. Wähl einen Namen und ein Passwort, dann wird daraus ein richtiges Konto: alle # Spiele, Freunde, Rangliste und deine Bilanz auf jedem Gerät.': 'You are playing as a guest. Choose a name and a password and it becomes a real account: all # games, friends, the ranking and your stats on every device.',
    'Ich habe schon ein Konto': 'I already have an account', 'Beendet die Gast-Sitzung und öffnet den Login': 'Ends the guest session and opens sign-in',
    'Gast-Sitzung beenden': 'End guest session', 'Sicher? Der Gast ist dann weg. Nochmal tippen': 'Sure? The guest will be gone. Tap again',
    'Name und Online-Partien des Gasts sind danach weg': "The guest's name and online games will be gone", 'Gast-Sitzung beendet': 'Guest session ended',
    'Du spielst als Gast': 'You are playing as a guest', 'Du spielst als Gast.': 'You are playing as a guest.'
  });

  // ---------- server and connection messages ----------
  A({
    'Diesen Benutzernamen gibt es schon.': 'This username is taken.', 'Benutzername oder Passwort falsch.': 'Wrong username or password.',
    'Das Passwort ist zu kurz (mindestens 6 Zeichen).': 'The password is too short (at least 6 characters).', 'Das Passwort ist zu lang.': 'The password is too long.',
    'Registrieren ist auf dem Server gerade nicht möglich.': 'Signing up is not possible on the server right now.',
    'Auf dem Server ist „Confirm email“ noch an.': '"Confirm email" is still on on the server.', 'Konto angelegt, aber auf dem Server ist „Confirm email“ noch an.': 'Account created, but "Confirm email" is still on on the server.',
    'Dieser Benutzername ist nicht erlaubt.': 'This username is not allowed.', 'Dieses Konto ist gesperrt.': 'This account is banned.',
    'Der Gast-Zugang ist auf dem Server noch aus.': 'Guest access is still off on the server.',
    'Die Sicherheitsprüfung hat nicht geklappt. Versuch es nochmal.': "The security check didn't work. Please try again.", 'Die Sicherheitsprüfung lädt gerade nicht.': "The security check won't load right now.",
    'Die Sicherheitsprüfung hat zu lange gedauert.': 'The security check took too long.',
    'Zu viele Versuche. Warte kurz und versuch es dann nochmal.': 'Too many attempts. Wait a moment and try again.', 'Zu viele Versuche. Versuch es in einer Stunde nochmal.': 'Too many attempts. Try again in an hour.',
    'Keine Verbindung zum Server.': 'No connection to the server.', 'Der Server ist noch nicht fertig eingerichtet.': 'The server is not fully set up yet.',
    'Name oder Code stimmt nicht.': 'Name or code is wrong.', 'Nicht eingeloggt.': 'Not signed in.', 'Nicht eingeloggt': 'Not signed in',
    'Benutzername: 3 bis 16 Zeichen, nur a–z, 0–9, _ und -.': 'Username: 3 to 16 characters, only a–z, 0–9, _ and -.',
    'Diesen Spieler gibt es nicht.': "This player doesn't exist.", 'Das bist du selbst.': "That's you.", 'Du kannst dich nicht selbst einladen.': "You can't invite yourself.",
    'Du kannst nur Freunde direkt einladen.': 'You can only invite friends directly.', 'Dein Freund spielt gerade eine andere Partie.': 'Your friend is playing another game.',
    'Du bist schon in einer Partie oder wartest auf eine Antwort.': "You're already in a game or waiting for an answer.", 'Beende erst deine laufende Partie.': 'Finish your current game first.',
    'Da war jemand schneller, oder die Herausforderung gilt nicht mehr.': 'Someone was faster, or the challenge is no longer valid.',
    'Dieses Spiel gibt es online noch nicht.': "This game isn't online yet.", 'Dieses Spiel braucht ein Konto.': 'This game needs an account.',
    'Partie nicht gefunden.': 'Game not found.', 'Die Partie läuft nicht.': "The game isn't running.", 'Die Partie läuft noch.': 'The game is still running.',
    'Dein Gegner spielt schon eine andere Partie.': 'Your opponent is already playing another game.', 'Diese Einladung gilt nicht mehr.': 'This invitation is no longer valid.',
    'Du hast schon 150 Freunde und Anfragen.': 'You already have 150 friends and requests.', 'Du hast schon 30 offene Anfragen. Warte, bis jemand antwortet.': 'You already have 30 open requests. Wait until someone answers.',
    'Für Freunde brauchst du ein Konto.': 'You need an account for friends.', 'Gäste können noch keine Freunde haben.': "Guests can't have friends yet.",
    'Das geht mit diesem Spieler nicht.': "That doesn't work with this player.", 'Du hast schon ein Konto.': 'You already have an account.',
    'Erst ein Konto anlegen, dann gibt es einen Code.': 'Create an account first, then you get a code.', 'Unbekannter Grund.': 'Unknown reason.',
    'Du hast heute schon 10 Meldungen geschickt.': "You've already sent 10 reports today.", 'Du hast diesen Spieler schon gemeldet. Das Team schaut es sich an.': "You've already reported this player. The team is looking into it.",
    'Du hast schon 300 Spieler blockiert.': "You've already blocked 300 players.", 'Keine Admin-Rechte.': 'No admin rights.', 'Das darf nur der Owner.': 'Only the owner may do that.',
    'Das ist schon dein Name.': 'That is already your name.', 'Zu viele Züge.': 'Too many moves.', 'Diese Flotte ist nicht regelkonform.': "This fleet doesn't follow the rules.", 'Deine Flotte steht schon.': 'Your fleet is already set.'
  });

  // ---------- games: names by id ----------
  V.i18n.names({
    c4: 'Connect 4', ships: 'Battleship', ttt: 'Tic Tac Toe', gomoku: 'Five in a Row', uttt: 'Ultimate Tic Tac Toe', dots: 'Dots and Boxes',
    hangman: 'Hangman', slf: 'City Country River', schnapsen: 'Schnapsen', guess: 'Estimation Quiz', ludo: 'Ludo', ladder: 'Snakes and Ladders', checkers: 'Checkers', mill: "Nine Men's Morris",
    yacht: 'Dice Block', maumau: 'Mau-Mau', memory: 'Memory', poker: 'Poker', chess: 'Chess', reversi: 'Reversi', kalaha: 'Kalah', go: 'Go',
    backgammon: 'Backgammon', reaction: 'Reaction Duel', pong: 'Pong', hockey: 'Air Hockey', tron: 'Light Racer', sumo: 'Sumo Arena'
  });

  // ---------- games: shared words ----------
  A({
    'Das Ziel': 'The goal', 'Aufbau und Ziel': 'Setup and goal', 'Das große Ziel': 'The big goal', 'Das Brett': 'The board', 'Am Handy': 'On a phone', 'Am selben Handy': 'On the same phone',
    'Zu zweit und online': 'Two players and online', 'Remis und Tipps': 'Draws and tips', 'Ende': 'End', 'Tipp': 'Tip', 'Pause': 'Pause', 'Fertig': 'Done', 'Gleich geht es los': 'Starting soon',
    'Feld wählen': 'Choose a square', 'Cursor bewegen': 'Move the cursor', 'Stein setzen': 'Place a stone', 'Pfeile': 'Arrows', 'Pfeile + Enter': 'Arrows + Enter', 'Pfeiltasten': 'Arrow keys',
    'Deine Farbe': 'Your colour', 'Weiß': 'White', 'Schwarz': 'Black', 'Du (Schwarz)': 'You (Black)', 'KI (Schwarz)': 'AI (Black)', 'Du (Weiß)': 'You (White)', 'KI (Weiß)': 'AI (White)',
    'Punkte': 'Points', 'Punkte zum Sieg': 'Points to win', 'Tore zum Sieg': 'Goals to win', 'Runden': 'Rounds', 'Chips': 'Chips', 'Karten': 'Cards', 'Paare': 'Pairs', 'Steine': 'Stones',
    '# Punkte': '# points', '# Runden': '# rounds', '# Chips': '# chips', '# Karten': '# cards', '# Steine': '# stones', '# Min': '# min', '# Sekunden': '# seconds', '# Spalten': '# columns',
    '# Versuche': '# tries', '# Fehlern': '# mistakes', '# Schüsse': '# shots', '# oder mehr': '# or more', '# auf dem Brett': '# on the board', '# Bonuspunkte': '# bonus points',
    '# : # Punkte': '# : # points', '# : # : # Punkte': '# : # : # points', '# : # : # : # Punkte': '# : # : # : # points', '# : # Paare': '# : # pairs', '# : # : # : # Paare': '# : # : # : # pairs',
    '# : # : # Chips': '# : # : # chips', '# : # : # : # Chips': '# : # : # : # chips', '# : # Kästchen': '# : # boxes', '# : # Steine': '# : # stones',
    'Gegen KI · #': 'Vs. AI · #', 'Gegen # KIs · #': 'Vs. # AIs · #', 'Pink · beginnt': 'Pink · starts', 'Schwarz · beginnt': 'Black · starts',
    'Freie Wahl': 'Free choice', 'Egal': 'Any', 'Gesamt': 'Total', 'Ich passe': 'I pass', 'Passen': 'Pass', 'Gepasst': 'Passed', 'Nochmal!': 'Again!', 'Nochmal (#)': 'Again (#)',
    'Du denkt nach …': 'You are thinking …', 'KI denkt nach …': 'AI is thinking …', 'KI # denkt nach …': 'AI # is thinking …', 'KI # ist dran …': "AI #'s turn …", 'Lädt …': 'Loading …',
    'Sieg # {0}': 'Win # {0}', 'Sieg · # %': 'Win · # %', 'Du gewinnt #': 'You win #', 'KI # gewinnt #': 'AI # wins #', 'Kein Paar': 'No pair',
    'Leicht': 'Easy', 'Pink · Leicht': 'Pink · Easy', 'Gelb · Leicht': 'Yellow · Easy', 'Cyan · Leicht': 'Cyan · Easy', 'Grün · Leicht': 'Green · Easy', 'Schwarz · Leicht': 'Black · Easy', 'O · Leicht': 'O · Easy',
    'Brett': 'Board', 'Brett Mitte': 'Board centre', 'Brett links': 'Board left', 'Brett rechts': 'Board right', 'Brett oben': 'Board top', 'Brett unten': 'Board bottom',
    'Brett oben links': 'Board top left', 'Brett oben rechts': 'Board top right', 'Brett unten links': 'Board bottom left', 'Brett unten rechts': 'Board bottom right',
    'Mitte links': 'Middle left', 'Mitte rechts': 'Middle right', '# oben links': '# top left', '# unten links': '# bottom left',
    'Alle spielen gleichzeitig am selben Gerät. Jeder hat einen Knopf in seiner Ecke, am PC eine eigene Taste.': 'Everyone plays at the same time on the same device. Each player has a button in their corner, on a PC their own key.',
    'Alle spielen gleichzeitig am selben Gerät. Jeder hat zwei Knöpfe in seiner Ecke, am PC eigene Tasten.': 'Everyone plays at the same time on the same device. Each player has two buttons in their corner, on a PC their own keys.',
    'Ihr spielt reihum am selben Gerät, jeder mit seiner Farbe.': 'You take turns on the same device, each with your own colour.',
    'Ihr würfelt reihum am selben Gerät, jeder mit seiner Farbe.': 'You roll in turn on the same device, each with your own colour.',
    'Ihr würfelt reihum am selben Gerät, jeder hat seine Spalte auf dem Block.': 'You roll in turn on the same device, each with your own column on the pad.',
    'Ihr deckt reihum am selben Gerät auf.': 'You take turns flipping cards on the same device.',
    'Ihr spielt reihum am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.': "You take turns on the same device. Before every move you pass the phone on so nobody sees someone else's cards.",
    'Hier entscheidet nur der Würfel.': 'Only the die decides here.'
  });

  // ---------- Connect 4 ----------
  A({
    'Steine fallen lassen, vier verbinden.': 'Drop discs, connect four.',
    'Lass deine Steine in die Spalten fallen. Wer zuerst vier in einer Reihe hat, gewinnt.': 'Drop your discs into the columns. First to get four in a row wins.',
    'Anfänger: übersieht deine Dreier oft und lässt auch mal den eigenen Sieg liegen.': 'Beginner: often misses your threes and sometimes even its own win.',
    'Blockt offene Dreier, fällt aber auf doppelte Drohungen rein.': 'Blocks open threes but falls for double threats.',
    'Rechnet fünf Züge voraus.': 'Calculates five moves ahead.', 'Rechnet bis zu # Züge tief. Fehler werden sofort bestraft.': 'Calculates up to # moves deep. Mistakes are punished at once.',
    'Spalte wählen': 'Choose a column', 'Stein einwerfen': 'Drop a disc', 'Direkt in diese Spalte': 'Straight into this column',
    'Das Brett hat {0} und # Reihen. Ihr lasst abwechselnd einen Stein in eine Spalte fallen. Er rutscht bis ganz nach unten.': 'The board has {0} and # rows. You take turns dropping a disc into a column. It slides all the way down.',
    'Vier in einer Reihe': 'Four in a row', 'Wer zuerst {0} waagerecht, senkrecht oder diagonal verbindet, gewinnt.': 'Whoever first connects {0} horizontally, vertically or diagonally wins.', 'vier eigene Steine': 'four of their discs',
    'Tippe auf eine Spalte, um dort einzuwerfen. Am PC siehst du über dem Brett, wo dein Stein landet. Ist eine Spalte voll, geht sie nicht mehr.': 'Tap a column to drop a disc there. On a PC you see above the board where your disc will land. A full column cannot be used.',
    'Die {0} ist die wertvollste, weil sie in die meisten Vierer passt. Achte immer auf drei gegnerische Steine mit einer freien Lücke und blocke sie. Noch stärker: Baue zwei Drohungen übereinander.': 'The {0} is the most valuable because it fits into the most fours. Always watch for three enemy discs with a free gap and block them. Even stronger: build two threats on top of each other.',
    'mittlere Spalte': 'middle column', 'Einwerfen': 'Drop', 'Doppeldrohung': 'Double threat',
    'Ist das ganze Brett voll und niemand hat vier verbunden, endet das Spiel unentschieden.': 'If the whole board is full and nobody has connected four, the game is a draw.'
  });

  // ---------- Tic Tac Toe, Ultimate ----------
  A({
    'Der Klassiker in einer Minute: Wer zuerst drei Zeichen in eine Reihe bringt, gewinnt.': 'The classic in one minute: first to get three marks in a row wins.',
    'Drei in einer Reihe auf #×#.': 'Three in a row on #×#.', 'Drei in einer Reihe': 'Three in a row',
    'Die Reihe darf waagerecht, senkrecht oder diagonal sein. Hier hat X die Diagonale geschafft.': 'The row can be horizontal, vertical or diagonal. Here X got the diagonal.',
    'Hat der Gegner schon zwei in einer Reihe, setz dein Zeichen in die Lücke. Sonst gewinnt er im nächsten Zug.': 'If your opponent already has two in a row, put your mark in the gap. Otherwise they win next move.',
    'Der stärkste Trick: Erzeuge zwei Drohungen auf einmal. Der Gegner kann nur eine blocken. Die Mitte und die Ecken sind dafür die besten Felder.': 'The strongest trick: create two threats at once. Your opponent can only block one. The centre and the corners are the best squares for it.',
    'Ist das Brett voll und niemand hat drei in einer Reihe, endet es remis. Wer fehlerfrei spielt, verliert nie. Die Profi-KI spielt genau so. Am PC kannst du mit den Zifferntasten # bis # setzen.': 'If the board is full and nobody has three in a row, it is a draw. Whoever plays without mistakes never loses. The Pro AI plays exactly like that. On a PC you can place with the number keys # to #.',
    'Feld setzen, angeordnet wie der Ziffernblock': 'Place a mark, laid out like the number pad', 'Blocken': 'Block', 'Gewinnen': 'Win',
    'Nimmt gern Mitte und Ecken, blockt aber nicht immer.': "Likes the centre and corners but doesn't always block.",
    'Gewinnt und blockt immer, macht aber ab und zu einen harmlosen Nebenzug.': 'Always wins and blocks, but now and then makes a harmless side move.',
    'Perfekt und gemein: wählt immer den Zug, bei dem du am leichtesten danebengreifst.': 'Perfect and mean: always picks the move where you are most likely to slip.',
    'Blutiger Anfänger: setzt oft irgendwo hin und übersieht deine Drohungen meistens.': 'Total beginner: often places anywhere and usually misses your threats.',
    'Neun Bretter': 'Nine boards', 'Neun kleine Bretter in einem großen. Dein Zug bestimmt, wo der Gegner als Nächstes spielen muss.': 'Nine small boards in a big one. Your move decides where your opponent has to play next.',
    'Das große Brett besteht aus {0}. Gewinnst du ein kleines Brett, gehört dir dieses Feld im großen Brett.': 'The big board consists of {0}. If you win a small board, that square of the big board is yours.', 'neun kleinen Brettern': 'nine small boards',
    'Das ist der Clou: Das Feld, auf das du {0} eines kleinen Bretts setzt, bestimmt das kleine Brett, in dem der Gegner spielen muss. X setzt hier oben rechts im mittleren Brett, also muss O im Brett oben rechts spielen.': 'Here is the twist: the square you pick {0} a small board decides the small board your opponent must play in. X plays top right in the middle board here, so O has to play in the top right board.',
    'innerhalb': 'inside', 'Du schickst den Gegner': 'You send your opponent',
    'Denk bei jedem Zug an zwei Dinge: Was bringt mir das Feld hier, und wohin schicke ich damit den Gegner? Wer nur aufs eigene Brett schaut, schenkt dem Gegner oft den Sieg woanders. Das leuchtende Brett zeigt immer, wo gespielt werden muss.': 'Think of two things every move: what does this square give me, and where does it send my opponent? Looking only at your own board often hands your opponent a win elsewhere. The glowing board always shows where to play.',
    'Anfänger: spielt pro Zug nur # Partien im Kopf durch und achtet kaum darauf, wohin sie dich schickt.': 'Beginner: plays through only # games in its head per move and hardly cares where it sends you.',
    'Nutzt die volle Bedenkzeit, oft über # Partien pro Zug.': 'Uses its full thinking time, often more than # games per move.', 'Freie Wahl: irgendwo': 'Free choice: anywhere'
  });

  // ---------- Five in a Row ----------
  A({
    'Fünf Steine in eine Linie bringen.': 'Get five stones in a line.',
    'Setzt abwechselnd Steine auf die Kreuzungen. Wer zuerst fünf in einer Reihe hat, waagerecht, senkrecht oder diagonal, gewinnt.': 'Take turns placing stones on the intersections. First to get five in a row, horizontally, vertically or diagonally, wins.',
    'Anfänger: blockt deine Dreier oft nicht.': "Beginner: often doesn't block your threes.", 'Blockt Drohungen, baut aber selten eigene Fallen.': 'Blocks threats but rarely sets traps of its own.',
    'Rechnet drei Züge voraus und sieht Doppeldrohungen.': 'Calculates three moves ahead and sees double threats.', 'Rechnet so tief wie möglich. Offene Dreier musst du sofort blocken.': 'Calculates as deep as possible. You must block open threes at once.',
    'Ihr setzt abwechselnd einen Stein auf eine {0}. Wer zuerst {1} lückenlos in einer Reihe hat, gewinnt. Waagerecht, senkrecht und diagonal zählen.': 'You take turns placing a stone on a {0}. Whoever first has {1} in an unbroken row wins. Horizontal, vertical and diagonal all count.',
    'freie Kreuzung': 'free intersection', 'fünf eigene Steine': 'five of their stones', 'Offene Dreier': 'Open threes', 'freien Enden': 'open ends', 'zwei Drohungen': 'two threats', 'Vorschau': 'preview', 'Kreuzung': 'Intersection',
    'Drei Steine in einer Reihe mit {0} sind gefährlich: Daraus wird im nächsten Zug ein offener Vierer, und den kann man nicht mehr an beiden Seiten blocken. Blocke offene Dreier sofort.': 'Three stones in a row with {0} are dangerous: next move they become an open four, which can no longer be blocked on both sides. Block open threes at once.',
    'Der stärkste Zug baut {0} auf einmal, zum Beispiel einen Vierer und einen offenen Dreier. Der Gegner kann nur eine davon blocken.': 'The strongest move builds {0} at once, for example a four and an open three. Your opponent can only block one of them.',
    'Das Brett ist eng. Der erste Tipp zeigt deinen Stein als {0}, ein zweiter Tipp auf dieselbe Stelle setzt ihn. Am PC reicht ein Klick.': 'The board is tight. The first tap shows your stone as a {0}, a second tap on the same spot places it. On a PC one click is enough.',
    'Ist das Brett voll und niemand hat fünf in einer Reihe, endet die Partie unentschieden. Das passiert so gut wie nie.': 'If the board is full and nobody has five in a row, the game is a draw. That almost never happens.',
    'Brettgröße': 'Board size'
  });

  // ---------- Battleship ----------
  A({
    'Versteckte Flotten, gezielte Schüsse.': 'Hidden fleets, aimed shots.',
    'Versteck deine Flotte und finde die Schiffe des Gegners zuerst. Treffer heißt: nochmal schießen.': "Hide your fleet and find your opponent's ships first. A hit means: shoot again.",
    'Schlachtschiff': 'Battleship', 'Kreuzer': 'Cruiser', 'Zerstörer': 'Destroyer', 'U-Boot': 'Submarine', 'Schnellboot': 'Patrol boat',
    'Schlachtschiff{0}': 'Battleship{0}', 'Kreuzer{0}': 'Cruiser{0}', 'Zerstörer{0}': 'Destroyer{0}', 'U-Boot{0}': 'Submarine{0}', 'Schnellboot{0}': 'Patrol boat{0}',
    'Schiff legen oder drehen, schießen': 'Place or turn a ship, shoot', 'Nächstes Schiff drehen': 'Turn the next ship', 'Flotte zufällig verteilen': 'Place the fleet at random',
    'Anfänger: schießt meist blind, auch nach einem Treffer.': 'Beginner: mostly shoots blind, even after a hit.', 'Schießt blind und dann rund um jeden Treffer.': 'Shoots blind and then around every hit.',
    'Folgt der Richtung eines getroffenen Schiffs und sucht im Schachbrettmuster.': 'Follows the direction of a hit ship and searches in a checkerboard pattern.',
    'Rechnet bei jedem Schuss für jedes Feld die Wahrscheinlichkeit aus.': 'Calculates the probability of every square for each shot.',
    'Jeder hat ein Meer mit #×# Feldern und versteckt darin seine Flotte. Ihr schießt abwechselnd auf das Meer des Gegners. Wer zuerst {0}, gewinnt.': "Each player has a sea of #×# squares and hides their fleet in it. You take turns shooting at your opponent's sea. Whoever first {0} wins.",
    'alle gegnerischen Schiffe versenkt': 'sinks all enemy ships', 'Deine Flotte': 'Your fleet', 'nicht berühren': 'not touch',
    'Du hast # Schiffe: Schlachtschiff (# Felder), Kreuzer (#), Zerstörer (#), U-Boot (#) und Schnellboot (#). Schiffe liegen waagerecht oder senkrecht und dürfen sich {0}, auch nicht über Eck.': 'You have # ships: battleship (# squares), cruiser (#), destroyer (#), submarine (#) and patrol boat (#). Ships lie horizontally or vertically and must {0}, not even diagonally.',
    'Schießen': 'Shooting', 'Zufällig': 'Random', 'Drehen (waagerecht)': 'Turn (horizontal)', 'Drehen (senkrecht)': 'Turn (vertical)', 'Platzieren': 'Placing',
    'Zieh die Schiffe aufs Meer. Antippen dreht ein Schiff, zurück ins Dock ziehen nimmt es weg.': 'Drag the ships onto the sea. Tapping turns a ship, dragging it back to the dock removes it.',
    'Zieh die Schiffe aufs Meer oder wähl unten eins und klick ein Feld an. Klick auf ein gelegtes Schiff dreht es.': 'Drag the ships onto the sea or pick one below and click a square. Clicking a placed ship turns it.',
    'Alles platziert. Tippe auf Fertig.': 'All placed. Tap Done.', 'Zum Drehen ist hier kein Platz.': 'No room to turn here.',
    'Da passt das Schiff nicht hin. Schiffe dürfen sich nicht berühren.': "The ship doesn't fit there. Ships must not touch.",
    'Alles platziert. Verschieb oder dreh Schiffe, oder tippe auf Fertig.': 'All placed. Move or turn ships, or tap Done.', 'Platziere zuerst alle # Schiffe.': 'Place all # ships first.',
    'Gerät weitergeben': 'Pass the device', 'Treffer!': 'Hit!', 'Versenkt!': 'Sunk!', 'Wasser': 'Miss', 'Treffer': 'Hit', 'Versenkt': 'Sunk',
    'Du bist dran mit Schießen.': 'Your turn to shoot.', 'Du schießt': "You're shooting", 'Jetzt versteckst du deine Flotte. Spieler # schaut weg.': 'Now you hide your fleet. Player # looks away.',
    'Die Schlacht beginnt. Du schießt zuerst.': 'The battle begins. You shoot first.', 'Die Spieler platzieren noch ihre Flotten': 'The players are still placing their fleets',
    'Meer von {0}': "{0}'s sea", 'Schnellboot versenkt!': 'Patrol boat sunk!', 'Schlachtschiff versenkt!': 'Battleship sunk!', 'Kreuzer versenkt!': 'Cruiser sunk!', 'Zerstörer versenkt!': 'Destroyer sunk!', 'U-Boot versenkt!': 'Submarine sunk!'
  });

  // ---------- Dots and Boxes ----------
  A({
    'Linien ziehen, Kästchen schließen.': 'Draw lines, close boxes.',
    'Zieht abwechselnd Linien zwischen den Punkten. Wer ein Kästchen schließt, bekommt es und zieht nochmal.': 'Take turns drawing lines between the dots. Whoever closes a box gets it and goes again.',
    'Zur nächsten freien Linie springen': 'Jump to the next free line', 'Linie ziehen': 'Draw a line', 'Feldgröße': 'Board size',
    'Anfänger: lässt Kästchen liegen und verschenkt oft welche.': 'Beginner: leaves boxes behind and often gives some away.', 'Nimmt Kästchen mit und verschenkt nur selten eins.': 'Takes boxes and rarely gives one away.',
    'Verschenkt nichts, solange es sichere Linien gibt, und gibt dann die kleinste Kette ab.': 'Gives nothing away while there are safe lines, then hands over the smallest chain.',
    'Rechnet das ganze Endspiel durch und opfert gezielt Kästchen, um die Ketten zu kontrollieren.': 'Works out the whole endgame and sacrifices boxes on purpose to control the chains.',
    'Punkte und Linien': 'Dots and lines', 'eine Linie': 'one line', 'Kästchen schließen': 'Closing boxes', 'vierte Linie': 'fourth line', 'nochmal': 'again', 'Keine Geschenke': 'No gifts', 'Ketten': 'Chains', 'kleinste': 'smallest', 'Profi-Trick': 'Pro trick',
    'Das Feld besteht aus Punkten. Ihr zieht abwechselnd {0} zwischen zwei benachbarten Punkten, waagerecht oder senkrecht. Tippe dazu auf die gestrichelte Lücke.': 'The board is made of dots. You take turns drawing {0} between two neighbouring dots, horizontally or vertically. Tap the dashed gap to do it.',
    'Ziehst du die {0} um ein Kästchen, gehört es dir und du musst {1} ziehen. Wer am Ende die meisten Kästchen hat, gewinnt.': 'If you draw the {0} around a box, it is yours and you must go {1}. Whoever has the most boxes at the end wins.',
    'Ziehst du die dritte Linie um ein Kästchen, kann der Gegner es sich schnappen. Solange es noch sichere Linien gibt, nimm die.': 'If you draw the third line around a box, your opponent can grab it. As long as there are safe lines, take those.',
    'Gegen Ende gibt es nur noch Züge, die etwas verschenken. Dann hängen oft mehrere Kästchen zu {0} zusammen: Wer eine öffnet, schenkt alle auf einmal her. Gib also lieber die {1} Kette ab.': 'Near the end every move gives something away. Then several boxes often hang together in {0}: whoever opens one gives them all away at once. So rather hand over the {1} chain.',
    'Bekommst du eine lange Kette geschenkt, nimm alle Kästchen bis auf zwei und lass die letzten zwei mit einer Linie stehen. Der Gegner muss sie nehmen und dann selbst die nächste Kette öffnen. So gewinnt man knappe Spiele.': 'If you get a long chain as a gift, take all boxes but two and leave the last two with one line. Your opponent has to take them and then open the next chain. That is how close games are won.',
    'Du ziehst': "You're drawing"
  });

  // ---------- Chess ----------
  A({
    'Der König aller Brettspiele.': 'The king of board games.',
    'Setz den gegnerischen König schachmatt. Mit allen Regeln: Rochade, en passant, Umwandlung und Remis.': "Checkmate your opponent's king. With all rules: castling, en passant, promotion and draws.",
    'Figur nehmen, dann Zielfeld': 'Pick a piece, then its target', 'Bei Umwandlung: Dame, Turm, Läufer, Springer': 'On promotion: queen, rook, bishop, knight', 'Schachuhr': 'Chess clock',
    'Anfänger: zieht oft planlos und lässt Figuren hängen.': 'Beginner: often moves aimlessly and leaves pieces hanging.',
    'Schlägt, was offen herumsteht, übersieht aber Gabeln und Fesselungen.': 'Takes whatever is left hanging but misses forks and pins.',
    'Rechnet drei Halbzüge genau. Hängende Figuren verzeiht sie nicht.': "Calculates three half-moves precisely. It doesn't forgive hanging pieces.",
    'Rechnet bis zu acht Halbzüge tief und nimmt sich Zeit dafür.': 'Calculates up to eight half-moves deep and takes its time.',
    'Weiß und Schwarz haben je # Figuren. Weiß beginnt, dann wird abwechselnd gezogen. Du gewinnst, wenn der gegnerische König {0}.': "White and Black have # pieces each. White starts, then you take turns. You win when the opposing king {0}.",
    'schachmatt ist': 'is checkmated', 'Turm, Läufer, Dame': 'Rook, bishop, queen', 'Turm': 'Rook', 'Läufer': 'Bishop', 'Dame': 'Queen', 'Springer': 'Knight', 'Bauer': 'Pawn', 'Bauern': 'Pawns',
    'Der {0} zieht beliebig weit gerade, der {1} beliebig weit diagonal. Die {2} kann beides und ist die stärkste Figur. Keine von ihnen springt über andere Figuren.': 'The {0} moves any distance straight, the {1} any distance diagonally. The {2} can do both and is the strongest piece. None of them jumps over other pieces.',
    'Springer und König': 'Knight and king',
    'Der {0} zieht im L: zwei Felder gerade, eins zur Seite. Er darf als Einziger über Figuren springen. Der {1} zieht ein Feld in jede Richtung, aber nie auf ein angegriffenes Feld.': 'The {0} moves in an L: two squares straight, one to the side. It is the only piece that may jump over others. The {1} moves one square in any direction, but never onto an attacked square.',
    'Bauern ziehen ein Feld geradeaus, vom Startfeld aus auch zwei. {0} tun sie aber schräg nach vorn. Erreicht ein Bauer die letzte Reihe, wird er {1}, meist in eine Dame.': 'Pawns move one square straight ahead, two from their starting square. But they {0} diagonally forward. A pawn that reaches the last rank is {1}, usually into a queen.',
    'Schlagen': 'capture', 'umgewandelt': 'promoted', 'Schach und Matt': 'Check and mate',
    'Wird dein König angegriffen, stehst du im {0} und musst das sofort beenden: König wegziehen, dazwischenstellen oder den Angreifer schlagen. Geht nichts davon, ist es {1}.': 'If your king is attacked, you are in {0} and must end it at once: move the king, block, or capture the attacker. If none of that works, it is {1}.',
    'Schach': 'check', 'Schachmatt': 'checkmate', 'Sonderzüge': 'Special moves', 'Rochade:': 'Castling:', 'En passant:': 'En passant:',
    'König zwei Felder Richtung Turm, der Turm springt daneben. Geht nur, wenn beide noch nicht gezogen haben und der Weg frei und nicht angegriffen ist.': "King two squares towards the rook, the rook jumps next to it. Only allowed if neither has moved and the way is free and not attacked.",
    'Zieht ein Bauer zwei Felder an deinem Bauern vorbei, darfst du ihn im nächsten Zug so schlagen, als wäre er nur eins gezogen.': 'If a pawn moves two squares past your pawn, you may capture it on the next move as if it had moved only one.',
    'Unentschieden gibt es bei {0} (wer dran ist, hat keinen Zug, steht aber nicht im Schach), bei dreimal derselben Stellung, nach # Zügen ohne Bauernzug oder Schlagen, und wenn keiner mehr mattsetzen kann. Tipp: Bring früh Springer und Läufer raus, sichere den König mit der Rochade und lass keine Figur ungedeckt.': "It is a draw on {0} (the player to move has no move but isn't in check), when the same position occurs three times, after # moves without a pawn move or capture, and when nobody can checkmate any more. Tip: develop knights and bishops early, castle your king to safety and don't leave pieces unprotected.",
    'Patt': 'stalemate', 'Schach!': 'Check!', 'Kurze Rochade': 'Short castling', 'Lange Rochade': 'Long castling', 'In welche Figur soll der Bauer werden?': 'What should the pawn become?',
    'Dreifache Stellungswiederholung': 'Threefold repetition', '50-Züge-Regel': '50-move rule', 'Kein Matt mehr möglich': 'No mate possible any more',
    'Gabel stellen': 'Set up a fork', '. Hier setzt der weiße Turm auf der Grundreihe matt: Die eigenen Bauern versperren dem König die Flucht.': '. Here the white rook mates on the back rank: the king\'s own pawns block its escape.'
  });

  // ---------- Checkers ----------
  A({
    'Diagonal ziehen, Steine überspringen.': 'Move diagonally, jump over pieces.',
    'Zieh diagonal, spring über gegnerische Steine und mach aus deinen Steinen Damen. Mit Schlagzwang.': 'Move diagonally, jump over enemy pieces and crown your pieces as kings. Capturing is mandatory.',
    'Anfänger: schaut nur auf den eigenen Zug und lässt oft Steine stehen.': 'Beginner: only looks at its own move and often leaves pieces hanging.',
    'Denkt drei Halbzüge voraus und lässt sich gern in Fallen locken.': 'Thinks three half-moves ahead and is easily lured into traps.',
    'Rechnet sechs Halbzüge tief.': 'Calculates six half-moves deep.', 'Rechnet bis zu # Halbzüge tief. Opfer werden durchschaut.': 'Calculates up to # half-moves deep. Sacrifices are seen through.',
    'Dunkles Feld wählen': 'Choose a dark square', 'Stein nehmen, dann Ziel (bei Mehrfachsprung Feld für Feld)': 'Pick a piece, then its target (multiple jumps square by square)',
    'Gespielt wird nur auf den {0}. Jeder hat # Steine. Pink beginnt. Du gewinnst, wenn der Gegner {1}.': "Only the {0} are used. Each player has # pieces. Pink starts. You win when your opponent {1}.",
    'dunklen Feldern': 'dark squares', 'keine Steine mehr hat oder nicht mehr ziehen kann': 'has no pieces left or cannot move',
    'Ein normaler Stein zieht {0} auf ein freies Feld.': 'A normal piece moves {0} onto a free square.', 'ein Feld diagonal nach vorn': 'one square diagonally forward',
    'Steht ein gegnerischer Stein diagonal neben dir und dahinter ist frei, {0} und schlägst ihn. Das geht auch rückwärts. Kannst du danach nochmal springen, musst du weiterspringen.': 'If an enemy piece is diagonally next to you with a free square behind it, {0} and capture it. That also works backwards. If you can jump again afterwards, you must keep jumping.',
    'springst du drüber': 'you jump over it', 'Schlagzwang': 'Mandatory capture',
    'Kannst du schlagen, {0}. Gibt es mehrere Möglichkeiten, darfst du wählen. Leuchtende Steine zeigen dir, welche Steine gerade ziehen dürfen.': 'If you can capture, {0}. If there are several options, you may choose. Glowing pieces show which pieces may move.',
    'musst du schlagen': 'you must capture', 'Die Dame': 'The king',
    'Erreicht ein Stein die {0}, wird er zur Dame (mit Ring). Die Dame zieht beliebig weit diagonal, vorwärts und rückwärts, und kann auch aus der Ferne schlagen.': 'When a piece reaches the {0}, it becomes a king (with a ring). The king moves any distance diagonally, forwards and backwards, and can also capture from afar.',
    'gegnerische Grundreihe': "opponent's back row",
    'Werden # Züge pro Spieler nur mit Damen ohne Schlagen gemacht, endet es remis. Tipp: Halte deine hintere Reihe lange besetzt, dann bekommt der Gegner schwer eine Dame. Biete ruhig mal einen Stein an, wenn du danach zwei zurückschlägst.': "If # moves per player are made only with kings and without captures, it is a draw. Tip: keep your back row occupied for a long time, then your opponent will struggle to get a king. Feel free to offer a piece if you capture two in return.",
    '#× geschlagen': '#× captured', 'Dame!': 'King!', 'Keine Züge mehr': 'No moves left', 'Alle Steine geschlagen': 'All pieces captured', '# Damenzüge ohne Schlagen': '# king moves without a capture'
  });

  // ---------- Reversi ----------
  A({
    'Einkesseln und umdrehen.': 'Surround and flip.',
    'Schließ gegnerische Steine zwischen zwei eigenen ein und dreh sie um. Am Ende zählt, wer mehr Steine hat.': 'Trap enemy discs between two of yours and flip them. At the end, whoever has more discs wins.',
    'Am Anfang stehen vier Steine in der Mitte. Pink beginnt. Am Ende gewinnt, wer {0} auf dem Brett hat.': 'At the start four discs stand in the middle. Pink starts. At the end, whoever has {0} on the board wins.', 'mehr Steine': 'more discs',
    'Du setzt einen Stein so, dass gegnerische Steine {0} liegen. Waagerecht, senkrecht oder diagonal.': 'You place a disc so that enemy discs lie {0}. Horizontally, vertically or diagonally.', 'zwischen ihm und einem eigenen Stein': 'between it and one of your discs',
    'Alle eingeschlossenen Steine werden {0} und gehören jetzt dir. Ein Zug kann in mehrere Richtungen gleichzeitig umdrehen. Du darfst nur dort setzen, wo du mindestens einen Stein umdrehst. Die Kreise zeigen dir die erlaubten Felder.': 'All trapped discs are {0} and now belong to you. One move can flip in several directions at once. You may only place where you flip at least one disc. The circles show the allowed squares.',
    'umgedreht': 'flipped', 'Ecken': 'Corners', 'Einkesseln': 'Surround',
    'Die {0} sind Gold wert: Ein Stein dort kann nie mehr umgedreht werden. Die Felder direkt neben einer freien Ecke sind gefährlich, weil sie dem Gegner die Ecke schenken. Viele Steine früh im Spiel sind nicht wichtig. Wichtiger ist, dass du viele Zugmöglichkeiten hast.': 'The {0} are worth gold: a disc there can never be flipped again. The squares right next to a free corner are dangerous because they give your opponent the corner. Many discs early on are not important. What matters more is having many possible moves.',
    'Hast du keinen erlaubten Zug, musst du {0} und der Gegner ist nochmal dran. Können beide nicht mehr, ist das Spiel vorbei.': 'If you have no legal move, you must {0} and your opponent goes again. If neither can move, the game is over.', 'passen': 'pass',
    'Anfänger: setzt ziemlich wahllos und verschenkt Ecken.': 'Beginner: places fairly randomly and gives away corners.',
    'Dreht gern viele Steine um und mag Ecken, denkt aber nicht voraus.': "Likes to flip many discs and likes corners, but doesn't think ahead.",
    'Rechnet vier Halbzüge tief.': 'Calculates four half-moves deep.', 'Rechnet acht Züge tief und spielt die letzten # Felder perfekt.': 'Calculates eight moves deep and plays the last # squares perfectly.',
    'Rechnet drei Züge tief und spielt die letzten acht Felder perfekt.': 'Calculates three moves deep and plays the last eight squares perfectly.'
  });

  // ---------- Mill ----------
  A({
    'Drei in einer Linie, dann Stein weg.': 'Three in a line, then take a stone.',
    'Setz und zieh deine neun Steine. Drei in einer Linie sind eine Mühle, dann darfst du einen gegnerischen Stein nehmen.': 'Place and move your nine stones. Three in a line make a mill, then you may take an enemy stone.',
    'Das Brett hat {0} auf drei Quadraten, verbunden durch Linien. Jeder hat {1}. Pink beginnt.': 'The board has {0} on three squares, connected by lines. Each player has {1}. Pink starts.', '# Punkte': '# points', 'neun Steine': 'nine stones',
    'Bringst du {0}, hast du eine Mühle. Dann nimmst du dem Gegner einen Stein weg. Steine, die selbst in einer Mühle stehen, sind geschützt, außer der Gegner hat nur noch Mühlen-Steine.': "If you get {0}, you have a mill. Then you take one of your opponent's stones. Stones that are in a mill themselves are protected, unless your opponent has only mill stones left.",
    'drei Steine in eine Linie': 'three stones in a line',
    'Hat ein Spieler nur noch {0}, darf er mit ihnen auf jeden freien Punkt springen.': 'If a player has only {0} left, they may jump with them to any free point.', 'drei Steine': 'three stones',
    'Du gewinnst, wenn der Gegner {0} hat oder {1}. Nach # Zügen pro Spieler ohne Mühle gibt es Remis. Tipp: Eine Zwickmühle, also zwei Mühlen nebeneinander, die du abwechselnd schließt, ist kaum zu stoppen.': "You win when your opponent has {0} or {1}. After # moves per player without a mill it's a draw. Tip: a double mill, two mills side by side that you close in turn, is almost unstoppable.",
    'nur noch zwei Steine': 'only two stones left', 'nicht mehr ziehen kann': 'cannot move any more', 'Mühle': 'Mill', 'Mühle!': 'Mill!', 'Nur noch zwei Steine': 'Only two stones left',
    'Phase #: Setzen': 'Phase #: Placing', 'Phase #: Ziehen': 'Phase #: Moving', 'Phase #: Springen': 'Phase #: Flying', 'Setzen': 'Place', 'Ziehen': 'Move', 'Springen': 'Fly',
    'Setzen, Stein nehmen oder ziehen': 'Place, take a stone or move', 'Punkt wählen': 'Choose a point', 'Nächstes Feld': 'Next point',
    'Anfänger: setzt oft planlos und übersieht deine Mühlen meistens.': 'Beginner: often places aimlessly and usually misses your mills.',
    'Schließt eigene Mühlen, blockt deine aber nicht immer.': "Closes its own mills but doesn't always block yours.",
    'Rechnet bis zu acht Halbzüge tief und baut gern Zwickmühlen.': 'Calculates up to eight half-moves deep and likes to build double mills.'
  });

  // ---------- Kalah ----------
  A({
    'Steine säen, Gegner leer räumen.': 'Sow seeds, empty your opponent.',
    'Nimm alle Steine aus einer Mulde und verteile sie einzeln weiter. Wer am Ende mehr Steine in seinem Speicher hat, gewinnt.': 'Take all seeds from a pit and sow them one by one. Whoever has more seeds in their store at the end wins.',
    'Anfänger: zieht fast zufällig.': 'Beginner: moves almost at random.', 'Nimmt Extrazüge mit, übersieht aber Fänge.': 'Takes extra turns but misses captures.',
    'Rechnet sechs Züge voraus.': 'Calculates six moves ahead.', 'Rechnet so tief wie möglich. Fast unschlagbar.': 'Calculates as deep as possible. Almost unbeatable.',
    'Mulde von links nach rechts': 'Pit from left to right', 'Mulde spielen': 'Play a pit', 'Steine pro Mulde': 'Seeds per pit', 'Mulde #': 'Pit #',
    'Jeder hat {0} auf seiner Seite und rechts davon einen großen {1}. Du spielst die untere Reihe, dein Speicher ist rechts. Am Anfang liegen in jeder Mulde gleich viele Steine.': 'Each player has {0} on their side and a big {1} to the right. You play the bottom row, your store is on the right. At the start every pit holds the same number of seeds.',
    'sechs Mulden': 'six pits', 'Speicher': 'store', 'Säen': 'Sowing',
    'Tippe eine eigene Mulde an. Alle Steine daraus werden {0} verteilt, einer pro Mulde, auch in deinen Speicher, aber nicht in den des Gegners.': "Tap one of your pits. All its seeds are sown {0}, one per pit, including your store but not your opponent's.",
    'einzeln gegen den Uhrzeigersinn': 'one by one counter-clockwise', 'Extrazug': 'Extra turn',
    'Landet der {0}, bist du gleich nochmal dran. Mulden, die genau bis zum Speicher reichen, sind deshalb wertvoll.': 'If the {0}, you go again right away. Pits that reach exactly to your store are therefore valuable.', 'letzte Stein in deinem Speicher': 'last seed lands in your store',
    'Fangen': 'Capture', 'Landet der letzte Stein in einer {0} und gegenüber liegen Steine, wandern dieser Stein und alle gegenüber in deinen Speicher.': 'If the last seed lands in an {0} and there are seeds opposite, that seed and all opposite go into your store.', 'leeren eigenen Mulde': 'empty pit of your own',
    'Sind alle Mulden einer Seite leer, ist Schluss. Jeder bekommt die Steine, die noch auf seiner Seite liegen.': 'When all pits on one side are empty, the game ends. Each player gets the seeds still on their side.',
    'Mehr Steine im Speicher': 'More seeds in the store'
  });

  // ---------- Go ----------
  A({
    'Gebiet umzingeln, Steine fangen.': 'Surround territory, capture stones.',
    'Das uralte Strategiespiel: Setzt abwechselnd Steine, umzingelt Gebiet und fangt gegnerische Steine, denen alle Freiheiten fehlen. Wer am Ende mehr Fläche hat, gewinnt.': 'The ancient strategy game: take turns placing stones, surround territory and capture enemy stones that have no liberties left. Whoever has more area at the end wins.',
    'Spielt fast zufällig.': 'Plays almost at random.', 'Denkt kurz nach, macht aber viele Fehler.': 'Thinks briefly but makes many mistakes.',
    'Simuliert tausende Partien pro Zug.': 'Simulates thousands of games per move.', 'Rechnet so lange wie möglich. Stark auf #×#.': 'Calculates as long as possible. Strong on #×#.',
    'Schwarz und Weiß setzen abwechselnd einen Stein auf eine {0}. Steine bewegen sich nie. Am Ende zählt, wer mehr {1} hat: eigene Steine plus leere Punkte, die nur von eigenen Steinen umgeben sind. Weiß bekommt # Punkte dazu, weil Schwarz anfängt.': 'Black and White take turns placing a stone on an {0}. Stones never move. At the end, whoever has more {1} wins: own stones plus empty points surrounded only by own stones. White gets # extra points because Black starts.',
    'Fläche': 'area', 'Freiheiten': 'liberties', 'gefangen': 'captured',
    'Die leeren Nachbarpunkte (oben, unten, links, rechts) einer Steingruppe sind ihre {0}. Nimmst du einer gegnerischen Gruppe die letzte Freiheit, ist sie {1} und verschwindet.': 'The empty neighbouring points (up, down, left, right) of a group of stones are its {0}. If you take the last liberty of an enemy group, it is {1} and disappears.',
    'Du darfst nicht auf einen Punkt setzen, auf dem dein Stein sofort keine Freiheit hätte, außer du fängst damit etwas. Und du darfst einen einzelnen Stein nicht {0} (Ko), erst einen Zug später.': "You may not place on a point where your stone would have no liberty at once, unless it captures something. And you may not {0} a single stone (ko), only one move later.",
    'sofort zurückschlagen': 'immediately recapture',
    'Wer nichts Sinnvolles mehr findet, tippt {0}. Passen beide nacheinander, wird gezählt. Steine, die eh verloren sind, solltest du vorher {1}, sonst zählen sie mit.': "If you can't find anything useful, tap {0}. If both pass in a row, the score is counted. Stones that are lost anyway you should {1} first, otherwise they still count.",
    'Ich passe': 'I pass', 'fangen': 'capture',
    'Ecken sind am leichtesten zu sichern, dann die Ränder, dann die Mitte. Eine Gruppe mit {0} (leeren Punkten innen) kann nie gefangen werden.': 'Corners are the easiest to secure, then the edges, then the centre. A group with {0} (empty points inside) can never be captured.',
    'zwei getrennten Augen': 'two separate eyes', 'Da darfst du nicht setzen': "You can't place there", 'Schwarz # : # Weiß': 'Black # : # White',
    'Gefangen: {0} Schwarz · {1} Weiß': 'Captured: {0} Black · {1} White', 'Punkt': 'Point'
  });

  // corrections of whole tutorial sentences (the chess ones include the demo caption)
  A({
    'Weiß und Schwarz haben je # Figuren. Weiß beginnt, dann wird abwechselnd gezogen. Du gewinnst, wenn der gegnerische König {0}. Das heißt Schachmatt.': 'White and Black have # pieces each. White starts, then you take turns. You win when the opposing king {0}. That is called checkmate.',
    'angegriffen ist und nicht mehr entkommen kann': 'is attacked and cannot escape',
    'Wird dein König angegriffen, stehst du im {0} und musst das sofort beenden: König wegziehen, dazwischenstellen oder den Angreifer schlagen. Geht nichts davon, ist es {1}. Hier setzt der weiße Turm auf der Grundreihe matt: Die eigenen Bauern versperren dem König die Flucht.': "If your king is attacked, you are in {0} and must end it at once: move the king, block, or capture the attacker. If none of that works, it is {1}. Here the white rook mates on the back rank: the king's own pawns block its escape.",
    '{0} König zwei Felder Richtung Turm, der Turm springt daneben. Geht nur, wenn beide noch nicht gezogen haben und der Weg frei und nicht angegriffen ist. {1} Zieht ein Bauer zwei Felder an deinem Bauern vorbei, darfst du ihn im nächsten Zug so schlagen, als wäre er nur eins gezogen.': '{0} The king moves two squares towards the rook, the rook jumps next to it. Only allowed if neither has moved and the way is free and not attacked. {1} If a pawn moves two squares past your pawn, you may capture it on the next move as if it had moved only one.',
    'Sind alle Mulden einer Seite leer, ist Schluss. Jeder bekommt die Steine, die noch auf seiner Seite liegen. {0} gewinnt.': 'When all pits on one side are empty, the game ends. Each player gets the seeds still on their side. {0} wins.',
    'Tippe eine eigene Mulde an. Alle Steine daraus werden {0} verteilt: je einer in die nächsten Mulden, auch in deinen Speicher und weiter auf die Seite des Gegners. Den gegnerischen Speicher überspringst du.': "Tap one of your pits. All its seeds are sown {0}: one into each following pit, including your store and on to your opponent's side. You skip your opponent's store.",
    'Sind alle Steine gesetzt, ziehst du einen eigenen Stein {0} auf einen freien Nachbarpunkt. Tippe erst den Stein an, dann das Ziel. Öffnest und schließt du eine Mühle immer wieder, nimmst du jedes Mal einen Stein.': 'Once all stones are placed, you move one of your stones {0} to a free neighbouring point. Tap the stone first, then the target. If you open and close a mill again and again, you take a stone every time.',
    'entlang einer Linie': 'along a line',
    'Zuerst setzt ihr abwechselnd je einen Stein auf einen {0}, bis alle # Steine auf dem Brett sind. Unter dem Brett siehst du, wie viele Steine noch übrig sind.': 'First you take turns placing one stone each on a {0} until all # stones are on the board. Below the board you can see how many stones are left.',
    'freien Punkt': 'free point',
    'Tippe auf ein Feld im gegnerischen Meer. Ein Punkt heißt {0}, dann ist der Gegner dran. Rot heißt {1}: Du darfst sofort noch einmal schießen.': "Tap a square in your opponent's sea. A dot means {0}, then it's your opponent's turn. Red means {1}: you may shoot again right away.",
    'Sind alle Felder eines Schiffs getroffen, ist es versenkt. Weil Schiffe sich nicht berühren dürfen, werden die Felder rundherum automatisch als Wasser markiert.': 'When all squares of a ship are hit, it is sunk. Because ships may not touch, the squares around it are marked as water automatically.',
    '{0} die Schiffe von unten aufs Meer. Grün heißt: passt, rot heißt: geht nicht. {1} eines gelegten Schiffs dreht es, ziehen verschiebt es, zurück ins Dock ziehen nimmt es weg. Am PC geht auch: Schiff unten anklicken, dann ein Feld anklicken; R dreht. {2} verteilt alles automatisch.': "{0} the ships from below onto the sea. Green means it fits, red means it doesn't. {1} a placed ship turns it, dragging moves it, dragging it back to the dock removes it. On a PC you can also click a ship below, then a square; R turns. {2} places everything automatically.",
    'Zieh': 'Drag', 'Antippen': 'Tapping',
    'Zu zweit an einem Gerät kommt nach jedem Zug ein Wechsel-Bildschirm: Gerät weitergeben und nicht hinschauen. Online liegt deine Flotte nur auf dem Server, dein Gegner kann sie nicht sehen. Tipp: Hast du einen Treffer, schieß auf die Nachbarfelder, bis du die Richtung kennst.': "With two players on one device a switch screen comes after every move: pass the device and don't look. Online your fleet is only on the server, your opponent can't see it. Tip: after a hit, shoot the neighbouring squares until you know the direction.",
    'Zwei Spieler setzen abwechselnd ihr Zeichen auf ein Feld des #×#-Bretts: {0} fängt an, dann {1}. Wer zuerst drei eigene Zeichen in eine Reihe bringt, gewinnt.': 'Two players take turns putting their mark on a square of the #×# board: {0} starts, then {1}. First to get three of their marks in a row wins.',
    'Tic Tac Toe in Tic Tac Toe.': 'Tic Tac Toe inside Tic Tac Toe.', 'neun kleinen Tic-Tac-Toe-Brettern': 'nine small Tic Tac Toe boards',
    'Wer drei kleine Bretter in einer Reihe gewinnt, waagerecht, senkrecht oder diagonal, gewinnt das ganze Spiel. Ein kleines Brett, das remis endet, zählt für niemanden.': 'Whoever wins three small boards in a row, horizontally, vertically or diagonally, wins the whole game. A small board that ends in a draw counts for nobody.',
    'Wirst du in ein Brett geschickt, das schon gewonnen oder voll ist, darfst du {0} irgendwo spielen. Das ist ein großer Vorteil, also schick den Gegner möglichst nicht dorthin.': "If you are sent to a board that is already won or full, you may play {0} anywhere. That is a big advantage, so try not to send your opponent there.",
    'auf jedem freien Feld': 'on any free square', 'Wohin': 'Where to', 'X · beginnt · Leicht': 'X · starts · Easy', 'Weiß · Leicht': 'White · Easy', 'Weiß · beginnt · Leicht': 'White · starts · Easy',
    'Pink · beginnt · Leicht': 'Pink · starts · Easy', 'Schwarz · beginnt · Leicht': 'Black · starts · Easy', 'Gegen KI · Leicht': 'Vs. AI · Easy', 'Gegen # KIs · Leicht': 'Vs. # AIs · Easy',
    'Feld #': 'Square #', 'Spalte #': 'Column #', 'Tipps': 'Tips', 'Taktik': 'Tactics', 'Steuerung': 'Controls', 'Verboten': 'Not allowed', 'Spiel vorbei': 'Game over', 'Spieler': 'Players',
    'Zu dritt oder viert': 'Three or four players', 'Zu zweit an einem Gerät': 'Two players on one device', 'Zum Ergebnis': 'To the result', 'Zeit um': "Time's up", 'Start': 'Start',
    'eigenen': 'own', 'eine': 'one', 'drei': 'three', 'kleiner': 'smaller', 'kürzeste': 'shortest', 'obere': 'upper', 'grün': 'green', 'orange': 'orange', 'zurück': 'back', 'läuft …': 'running …'
  });

  // ---------- Backgammon ----------
  A({
    'Würfeln, ziehen, schlagen, abtragen.': 'Roll, move, hit, bear off.',
    'Einer der ältesten Klassiker der Welt: Würfle und zieh deine # Steine einmal ums Brett nach Hause, dann trag sie ab. Einzelne Steine kann der Gegner schlagen. Wer zuerst alle abgetragen hat, gewinnt.': 'One of the oldest classics in the world: roll and move your # checkers once around the board to your home, then bear them off. Your opponent can hit single checkers. First to bear off all checkers wins.',
    'Zieht irgendwie.': 'Moves somehow.', 'Läuft vor allem schnell nach Hause.': 'Mostly runs home fast.', 'Baut Punkte, schützt seine Steine und schlägt.': 'Builds points, protects its checkers and hits.', 'Wägt jeden Zug genau ab.': 'Weighs every move carefully.',
    'Stein wählen, dann Ziel': 'Choose a checker, then the target', 'Zug zurücknehmen': 'Undo move',
    'Jeder hat {0}. Wer unten sitzt, zieht gegen den Uhrzeigersinn nach unten rechts, der andere andersherum nach oben rechts. Gegen die KI und online sitzt du immer unten. Sind alle eigenen Steine im {1} (die sechs Zungen in deiner Ecke), darfst du sie {2}. Wer zuerst alle abgetragen hat, gewinnt.': 'Each player has {0}. Whoever sits at the bottom moves counter-clockwise to the bottom right, the other the other way to the top right. Against the AI and online you always sit at the bottom. When all your checkers are in your {1} (the six points in your corner), you may {2}. First to bear off all checkers wins.',
    '# Steine': '# checkers', 'Heimfeld': 'home board', 'abtragen': 'bear them off',
    'Du würfelst zwei Würfel und ziehst mit jeder Augenzahl einen Stein so weit, mit einem Stein auch zweimal. Bei einem {0} ziehst du viermal. Tippe einen leuchtenden Stein an, dann das Ziel. Du musst so viele Würfel nutzen wie möglich.': 'You roll two dice and move a checker that far for each number, or one checker twice. With a {0} you move four times. Tap a glowing checker, then the target. You must use as many dice as possible.',
    'Pasch': 'double', 'Würfel': 'Dice', 'Würfel #': 'Die #',
    'Du darfst auf freie Zungen, eigene Zungen oder auf eine Zunge mit {0} gegnerischen Stein. Zwei oder mehr gegnerische Steine sind ein {1}.': 'You may move to free points, your own points or a point with {0} enemy checker. Two or more enemy checkers make a {1}.',
    'genau einem': 'exactly one', 'Block': 'block', 'Blockade': 'Blockade', 'Schlagen und einwürfeln': 'Hitting and entering',
    'Landest du auf einem einzelnen gegnerischen Stein, wird er {0} und kommt auf die Bar in der Mitte. Wer Steine auf der Bar hat, muss diese zuerst wieder ins gegnerische Heimfeld {1}.': "If you land on a single enemy checker, it is {0} and goes to the bar in the middle. Whoever has checkers on the bar must first {1} them into the opponent's home board.",
    'geschlagen': 'hit', 'einwürfeln': 'enter',
    'Lass möglichst keine einzelnen Steine in Reichweite des Gegners stehen. Mehrere besetzte Zungen hintereinander (eine {0}) halten seine Steine auf.': "Try not to leave single checkers within your opponent's reach. Several occupied points in a row (a {0}) hold up their checkers.",
    '! Viermal ziehen': '! Move four times', 'Gammon! Der Gegner hat keinen Stein abgetragen': 'Gammon! The opponent has not borne off a single checker', 'Alle Steine abgetragen': 'All checkers borne off',
    'Pips: {0} · {1}': 'Pips: {0} · {1}', '#er-Pasch': 'double #s', '#er': '#s'
  });

  // ---------- Air Hockey, Pong ----------
  A({
    'Puck ins gegnerische Tor schießen.': "Shoot the puck into your opponent's goal.",
    'Schieß den Puck mit deinem Schläger ins gegnerische Tor und verteidige dein eigenes.': "Shoot the puck into your opponent's goal with your mallet and defend your own.",
    'Schläger unten': 'Mallet bottom', 'Schläger oben (zu zweit)': 'Mallet top (two players)',
    'Langsam und verteidigt schlecht.': 'Slow and defends badly.', 'Verteidigt ordentlich, greift selten an.': 'Defends decently, rarely attacks.', 'Schnell, greift gezielt an.': 'Fast, attacks on purpose.', 'Blitzschnell und gnadenlos.': 'Lightning fast and merciless.',
    'Jeder hat einen runden Schläger in seiner Hälfte. Schieß den Puck in das {0}. Wer zuerst die eingestellten Tore hat, gewinnt.': 'Each player has a round mallet in their half. Shoot the puck into the {0}. First to reach the set number of goals wins.',
    'Tor auf der gegenüberliegenden Seite': 'goal on the opposite side', 'deine Hälfte': 'your half', 'deiner Hälfte': 'your half', 'Steuerung': 'Controls',
    'Leg den Finger auf {0}, der Schläger folgt ihm. Zu zweit spielt jeder auf seiner Seite gleichzeitig, also Handy flach zwischen euch. Am PC: unten mit Maus oder {1}, oben mit {2}.': 'Put your finger on {0}, the mallet follows it. With two players each plays on their own side at the same time, so lay the phone flat between you. On a PC: bottom with the mouse or {1}, top with {2}.',
    'Je schneller du den Schläger in den Puck bewegst, desto härter der Schuss. Über die {0} gespielt ist der Puck für den Gegner schwer zu lesen. Die Mittellinie darfst du nicht überqueren.': 'The faster you move the mallet into the puck, the harder the shot. Played off the {0}, the puck is hard to read for your opponent. You may not cross the centre line.',
    'Bande': 'boards', 'Verteidigen': 'Defending',
    'Bleib zwischen Puck und eigenem Tor. Nach einem Tor bekommt der Spieler, der es kassiert hat, den Puck in seiner Hälfte.': 'Stay between the puck and your own goal. After a goal, the player who conceded gets the puck in their half.',
    'Finger oder Maus in deiner Hälfte bewegen, am PC auch Pfeiltasten': 'Move your finger or the mouse in your half, on a PC also the arrow keys', 'TOR!': 'GOAL!', '· bis #': '· to #',
    'Langsamer Schläger, zielt ungenau.': 'Slow mallet, aims poorly.', 'Kaum zu überwinden. Spiel mit den Kanten.': 'Hard to beat. Play off the edges.',
    'Schläger gegen Schläger.': 'Paddle against paddle.',
    'Halte den Ball im Spiel und spiel ihn am Gegner vorbei. Der Ball wird mit jedem Treffer schneller.': 'Keep the ball in play and get it past your opponent. The ball gets faster with every hit.',
    'Jeder hat einen Schläger, einer unten, einer oben. Lass den Ball nicht an deinem Schläger vorbei. Kommt er bei deinem Gegner durch, bekommst du einen Punkt.': "Each player has a paddle, one at the bottom, one at the top. Don't let the ball get past your paddle. If it gets past your opponent, you score a point.",
    'Am Handy ziehst du den Finger auf {0} nach links und rechts. Zu zweit hat jeder seine Hälfte, beide gleichzeitig. Am PC: unten mit {1} oder der Maus, oben mit {2} und {3}. Die Leertaste pausiert.': 'On a phone you drag your finger left and right on {0}. With two players each has their half, both at the same time. On a PC: bottom with {1} or the mouse, top with {2} and {3}. Space pauses.',
    'Wo der Ball den Schläger trifft, bestimmt die Richtung. In der Mitte geht er gerade zurück, an der {0} fliegt er schräg weg. Schräge Bälle prallen von den Seitenwänden ab und sind schwer zu halten.': 'Where the ball hits the paddle decides its direction. In the middle it goes straight back, at the {0} it flies off at an angle. Angled balls bounce off the side walls and are hard to stop.',
    'Kante': 'edge', 'Winkel': 'Angles', 'Tempo': 'Speed', 'untere Hälfte': 'lower half',
    'Mit jedem Treffer wird der Ball etwas schneller. Nach einem Punkt wird er zu dem Spieler aufgeschlagen, der den Punkt verloren hat.': 'With every hit the ball gets a little faster. After a point it is served to the player who lost the point.',
    'Reagiert langsam und zielt grob.': 'Reacts slowly and aims roughly.', 'Kommt an die meisten Bälle.': 'Gets to most balls.', 'Schnell und ziemlich genau.': 'Fast and quite accurate.'
  });

  // ---------- Reaction duel ----------
  A({
    'Wer bei Grün zuerst tippt.': 'First to tap on green.',
    'Warte auf Grün und tippe so schnell du kannst. Wer zu früh tippt, schenkt dem anderen den Punkt.': 'Wait for green and tap as fast as you can. Tap too early and you give the point to the other player.',
    'Beide warten, bis das Feld {0} wird. Wer dann zuerst tippt, bekommt den Punkt. Wer zuerst die eingestellten Punkte hat, gewinnt.': 'Both wait until the field turns {0}. Whoever taps first then gets the point. First to reach the set points wins.',
    'Nicht zu früh': 'Not too early', 'Gegner den Punkt': 'opponent the point',
    'Tippst du, bevor es grün ist, bekommt der {0}. Wie lange es dauert, ist jedes Mal anders.': 'If you tap before it is green, your {0} gets it. How long it takes is different every time.',
    'Finten': 'Fakes',
    'Manchmal leuchtet das Feld kurz {0} und da steht „Nicht tippen!“. Das ist eine Falle. Wer da tippt, verliert den Punkt. Erst bei Grün gilt es.': "Sometimes the field flashes {0} and says “Don't tap!”. That is a trap. Whoever taps loses the point. Only green counts.",
    'Nicht tippen!': "Don't tap!", 'Jetzt!': 'Now!', 'Warten …': 'Wait …', 'Zu früh!': 'Too early!',
    'Legt das Handy flach zwischen euch. Spieler # tippt auf die {0}, Spieler # auf die {1}, die für ihn richtig herum steht. Am PC drückt Spieler # die Taste {2} und Spieler # die Taste {3}.': 'Lay the phone flat between you. Player # taps the {0}, player # the {1}, which faces the right way for them. On a PC player # presses {2} and player # presses {3}.',
    'Reagiert in etwa # Sekunden.': 'Reacts in about # seconds.', 'Reagiert in etwa # Sekunden. Fällt auf Finten fast nie rein.': 'Reacts in about # seconds. Almost never falls for fakes.',
    'Wartet auf den perfekten Moment.': 'Waits for the perfect moment.'
  });

  // ---------- Light Racer, Sumo ----------
  A({
    'Nicht in die Lichtwand fahren. Bis zu #.': "Don't crash into the light wall. Up to #.",
    'Jeder steuert ein Lichtrad, das eine leuchtende Wand hinter sich herzieht. Wer gegen eine Wand fährt, ist raus. Wer als Letzter fährt, holt den Punkt. Für # bis # an einem Gerät oder gegen die KI.': 'Each player steers a light cycle that pulls a glowing wall behind it. Whoever hits a wall is out. The last one riding scores the point. For # to # on one device or against the AI.',
    'Euer Lichtrad fährt {0} und zieht eine Wand hinter sich her. Fahr nicht gegen den Rand, deine eigene Wand oder die der anderen. Wer als {1} noch fährt, bekommt den Punkt.': "Your light cycle drives {0} and pulls a wall behind it. Don't hit the edge, your own wall or anyone else's. Whoever is {1} still riding gets the point.",
    'von selbst geradeaus': 'straight ahead on its own', 'Letzter': 'the last one', 'Lenken': 'Steering', 'zwei Knöpfe': 'two buttons',
    'Jeder hat {0}: links abbiegen und rechts abbiegen, immer aus Sicht deines Rads. Am PC: Spieler # {1} und {2}, Spieler # {3} und {4}, Spieler # {5} und {6}, Spieler # {7} und {8}.': "Each player has {0}: turn left and turn right, always from your cycle's point of view. On a PC: player # {1} and {2}, player # {3} and {4}, player # {5} and {6}, player # {7} and {8}.",
    'Mit der Zeit wird es schneller. Versuch, den anderen den Raum abzuschneiden, statt nur auszuweichen. Fahren zwei frontal ineinander, sind beide raus.': 'It gets faster over time. Try to cut off the others instead of just dodging. If two crash head-on, both are out.',
    'Legt das Handy flach in die Mitte. Spieler # und # sitzen unten, # und # oben, ihre Knöpfe stehen für sie richtig herum. Gegen die KI fährst du gegen # bis # Computer-Räder.': 'Lay the phone flat in the middle. Players # and # sit at the bottom, # and # at the top, their buttons face the right way for them. Against the AI you race # to # computer cycles.',
    'Fährt oft ohne zu schauen.': 'Often drives without looking.', 'Weicht Wänden aus, plant aber nicht.': "Avoids walls but doesn't plan.", 'Sucht sich immer den größten freien Raum.': 'Always looks for the largest free space.', 'Plant Raum und schneidet dir den Weg ab.': 'Plans space and cuts you off.',
    'Spieler # links / rechts': 'Player # left / right', 'Bis einer übrig': 'Until one is left',
    'Ein Knopf, alle raus aus dem Ring. Bis zu #.': 'One button, everyone out of the ring. Up to #.',
    'Dein Pfeil dreht sich ständig. Halte deinen Knopf, um in Pfeilrichtung loszustürmen, und schubs die anderen aus dem Ring. Für # bis # an einem Gerät oder gegen die KI.': 'Your arrow keeps spinning. Hold your button to charge in the arrow direction and push the others out of the ring. For # to # on one device or against the AI.',
    'Jeder steuert eine Scheibe im Ring. Wer über den Rand rutscht, ist raus. Wer als {0} im Ring steht, bekommt den Punkt.': 'Each player steers a disc in the ring. Whoever slides over the edge is out. Whoever is {0} standing in the ring gets the point.',
    'Ein Knopf': 'One button', 'Pfeil': 'arrow', 'Halte': 'Hold', 'Loslassen': 'Let go', 'Schubsen': 'Pushing',
    'Der {0} an deiner Scheibe dreht sich ständig. {1} deinen Knopf: Der Pfeil bleibt stehen und du schiebst in diese Richtung. {2}, und er dreht weiter. Am PC: Spieler # {3}, Spieler # {4}, Spieler # {5}, Spieler # {6}.': 'The {0} on your disc keeps spinning. {1} your button: the arrow stops and you push in that direction. {2} and it spins on. On a PC: player # {3}, player # {4}, player # {5}, player # {6}.',
    'Prallt ihr zusammen, fliegt der Langsamere weiter. Volle Fahrt voraus lohnt sich also. Aber Vorsicht: Wer verfehlt, rutscht selbst über den Rand.': 'When you collide, the slower one flies further. Full speed ahead pays off. But careful: whoever misses slides over the edge themselves.',
    'Nach ein paar Sekunden wird der Ring {0}, damit niemand ewig am Rand wartet.': 'After a few seconds the ring gets {0}, so nobody waits at the edge forever.', 'Der Ring schrumpft': 'The ring is shrinking',
    'Zielt ordentlich, achtet aber kaum auf den Rand.': 'Aims decently but hardly watches the edge.', 'Zielt genau und bremst vor dem Rand.': 'Aims precisely and brakes before the edge.',
    'Spieler # Schub': 'Player # push', 'Schub gegen die KI': 'Push against the AI',
    'Spieler # (oben)': 'Player # (top)', 'Spieler # (unten)': 'Player # (bottom)', 'unten Mitte': 'bottom centre', 'unten links': 'bottom left', 'unten rechts': 'bottom right', 'Unten': 'Bottom'
  });

  // ---------- Ludo, Snakes and Ladders ----------
  A({
    'Wie Mensch ärgere dich nicht. Bis zu #.': 'Like Sorry! or Parcheesi. Up to #.',
    'Der Klassiker wie Mensch ärgere dich nicht: Würfle und bring deine vier Figuren einmal ums Brett ins Ziel. Landest du auf einer fremden Figur, muss sie zurück. Für # bis # Spieler am Gerät oder online, freie Plätze übernimmt die KI.': 'The classic race game: roll and bring your four pieces once around the board into your home. Land on another piece and it has to go back. For # to # players on one device or online, the AI takes empty seats.',
    'Zieht irgendeine Figur.': 'Moves any piece.', 'Wirft raus, wenn es geht, sonst einfach vorwärts.': 'Knocks out when it can, otherwise just moves ahead.',
    'Wirft raus, bringt Figuren in Sicherheit und meidet Gefahr.': 'Knocks out, brings pieces to safety and avoids danger.', 'Wägt jeden Zug genau ab: Risiko, Fortschritt und wen es trifft.': 'Weighs every move carefully: risk, progress and who gets hit.',
    'Figur wählen': 'Choose a piece', 'Cursor über die Figuren': 'Cursor over the pieces', 'Figur ziehen': 'Move a piece',
    'Wie bei Mensch ärgere dich nicht hat jeder {0} in seiner Ecke. Bring alle vier einmal im Uhrzeigersinn ums Brett und dann in deine {1} zur Mitte hin. Wer das zuerst schafft, gewinnt.': 'Each player has {0} in their corner. Bring all four once clockwise around the board and then into your {1} towards the centre. Whoever does it first wins.',
    'vier Figuren': 'four pieces', 'vier Zielfelder': 'four home squares', 'Würfeln und rausgehen': 'Rolling and coming out',
    'Tippe auf den {0} in der Mitte. Nur mit einer {1} kommt eine Figur aus der Ecke auf dein Startfeld, und das musst du dann auch machen. Nach einer # darfst du nochmal würfeln. Steht keine Figur draußen, hast du {2} für eine #.': 'Tap the {0} in the middle. Only with a {1} does a piece come out of the corner onto your start square, and then you must do it. After a # you may roll again. If no piece is out, you get {2} for a #.',
    'drei Versuche': 'three tries',
    'Danach hüpfen die Figuren, die ziehen dürfen. Tippe eine an. Geht nur eine, zieht sie von selbst. Auf ein Feld mit einer {0} Figur darfst du nicht.': 'Then the pieces that may move start hopping. Tap one. If only one can move, it moves by itself. You may not move onto a square with one of your {0} pieces.',
    'Rauswerfen': 'Knocking out',
    'Landest du genau auf einer {0}, muss sie zurück in ihre Ecke. Deshalb ist es gefährlich, # bis # Felder vor einem Gegner zu stehen.': 'If you land exactly on {0}, it has to go back to its corner. That is why standing # to # squares in front of an opponent is dangerous.',
    'fremden Figur': "someone else's piece", 'Ins Ziel': 'Going home', 'genaue Augenzahl': 'exact number',
    'Am Ende der Runde biegst du in deine Zielfelder ab. Dort brauchst du die {0}, über das letzte Feld hinaus geht es nicht. In den Zielfeldern kann dich niemand mehr rauswerfen.': 'At the end of the lap you turn into your home squares. There you need the {0}; you cannot move past the last square. Nobody can knock you out in your home squares.',
    'Unter {0} eröffnest du einen Tisch, lädst Freunde ein oder teilst den Tischcode. Freie Plätze spielt die KI. Geht jemand mitten im Spiel, übernimmt die KI seine Figuren.': "Under {0} you open a table, invite friends or share the table code. The AI plays empty seats. If someone leaves mid-game, the AI takes over their pieces.",
    'Unter {0} eröffnest du einen Tisch für bis zu vier, lädst Freunde ein oder teilst den Tischcode. Freie Plätze würfelt die KI.': 'Under {0} you open a table for up to four, invite friends or share the table code. The AI rolls for empty seats.',
    '# Versuche': '# tries', 'Raus mit dir!': 'Out you go!', 'Raus aus der Ecke': 'Out of the corner', 'Letzter Versuch': 'Last try', 'Würfeln': 'Roll',
    'KI # hat alle Figuren im Ziel': 'AI # has all pieces home', 'Alle Figuren im Ziel': 'All pieces home',
    'Leitern hoch, Schlangen runter. Bis zu #.': 'Up the ladders, down the snakes. Up to #.',
    'Würfeln und los: Wer auf einer Leiter landet, klettert hoch, wer auf einen Schlangenkopf kommt, rutscht runter. Wer zuerst genau auf # landet, gewinnt. Reines Glück, für # bis # Spieler am Gerät oder online.': "Roll and go: land on a ladder and you climb up, land on a snake's head and you slide down. First to land exactly on # wins. Pure luck, for # to # players on one device or online.",
    'Würfelt reihum und zieht eure Figur so viele Felder weiter, von {0} in Schlangenlinien bis {1}. Wer zuerst genau auf # landet, gewinnt.': 'Roll in turn and move your piece that many squares, from {0} winding up to {1}. First to land exactly on # wins.',
    'Leitern': 'Ladders', 'Schlangen': 'Snakes', 'Fuß einer Leiter': 'foot of a ladder', 'Schlangenkopf': "snake's head", 'Genau #': 'Exactly #',
    'Endet dein Zug am {0}, kletterst du sofort bis an ihr oberes Ende.': 'If your move ends at the {0}, you climb straight to its top.',
    'Endet dein Zug auf einem {0}, rutschst du bis zu ihrem Schwanz hinunter.': "If your move ends on a {0}, you slide down to its tail.",
    'Würfelst du kurz vor dem Ziel zu viel, läufst du bis # und die restlichen Augen wieder {0}. Hier entscheidet nur das Glück, perfekt für eine schnelle Runde.': 'If you roll too much just before the end, you move to # and the rest of the way {0}. Only luck decides here, perfect for a quick round.',
    'Leiter!': 'Ladder!', 'Schlange!': 'Snake!', 'KI # ist zuerst auf #': 'AI # reached # first'
  });

  // ---------- Dice Block (Yacht) ----------
  A({
    'Wie Kniffel: würfeln, behalten, eintragen.': 'Like Yahtzee: roll, keep, score.',
    'Der Würfelklassiker wie Kniffel: Würfle bis zu dreimal, behalte die passenden Würfel und trag dein Ergebnis in eines von # Feldern ein. Wer am Ende die meisten Punkte hat, gewinnt. Für # bis #, am Gerät, gegen die KI oder online.': 'The dice classic like Yahtzee: roll up to three times, keep the dice that fit and score your result in one of # boxes. Whoever has the most points at the end wins. For # to #, on one device, against the AI or online.',
    'Wie bei Kniffel: Jeder hat {0}. In jeder Runde würfelst du bis zu dreimal und trägst das Ergebnis in ein freies Feld deiner Spalte ein. Wer am Ende die meisten Punkte hat, gewinnt.': 'Like Yahtzee: each player has {0}. Each round you roll up to three times and score the result in a free box of your column. Whoever has the most points at the end wins.',
    'Würfeln und behalten': 'Rolling and keeping',
    'Tippe auf {0}. Danach kannst du Würfel {1}, sie heben sich an. Beim nächsten Wurf rollen nur die anderen. Nach dem dritten Wurf musst du eintragen, du darfst aber auch früher.': 'Tap {0}. Then you can {1} dice, they lift up. On the next roll only the others roll. After the third roll you must score, but you may also score earlier.',
    'antippen, um sie zu behalten': 'tap to keep', 'Oben: Einser bis Sechser': 'Upper section: Ones to Sixes', 'Oben (Bonus ab #)': 'Upper (bonus from #)',
    'Hier zählen nur die Augen der passenden Zahl, z. B. drei Vierer = # bei Vierer. Kommst du oben auf {0}, gibt es {1}. Das sind drei gleiche pro Zahl.': 'Only the pips of the matching number count, e.g. three fours = # in Fours. If you reach {0} in the upper section, you get {1}. That is three of a kind per number.',
    '# oder mehr': '# or more', '# Bonuspunkte': '# bonus points', 'Unten: Pasch, Straßen und mehr': 'Lower section: of a kind, straights and more',
    '{0}: drei bzw. vier gleiche, zählt alle Augen. {1} (# + # gleiche): #. {2} (# in Folge): #. {3} (# in Folge): #. {4} (# gleiche): #. {5}: alle Augen, passt immer.': '{0}: three or four of a kind, scores all pips. {1} (# + # of a kind): #. {2} (# in a row): #. {3} (# in a row): #. {4} (# of a kind): #. {5}: all pips, always fits.',
    'Dreierpasch/Viererpasch': 'Three/Four of a kind', 'Full House': 'Full house', 'Kleine Straße': 'Small straight', 'Große Straße': 'Large straight', 'Fünferpasch': 'Five of a kind', 'Chance': 'Chance',
    'Kl. Straße': 'Sm. straight', 'Gr. Straße': 'Lg. straight', 'Dreierpasch': 'Three of a kind', 'Viererpasch': 'Four of a kind',
    'Einser': 'Ones', 'Zweier': 'Twos', 'Dreier': 'Threes', 'Vierer': 'Fours', 'Fünfer': 'Fives', 'Sechser': 'Sixes', 'Summe': 'Sum', 'Bonus': 'Bonus', 'Gesamt': 'Total',
    'Passt nichts, musst du trotzdem ein Feld wählen, dann gibt es dort {0}. Tipp: lieber den Fünferpasch oder die Einser streichen als die Chance zu früh verbrauchen.': 'If nothing fits, you still have to choose a box, and it scores {0}. Tip: rather cross out Five of a kind or Ones than use up Chance too early.',
    '# Punkte': '# points', 'Feld eintragen': 'Score a box', 'Würfel behalten oder freigeben': 'Keep or release dice', 'Eintragen!': 'Score it!',
    'Behält, was ihm gerade gefällt.': 'Keeps whatever it likes.', 'Sammelt gleiche Augen und Straßen, plant aber kaum.': 'Collects matching pips and straights but hardly plans.',
    'Rechnet aus, welche Würfel sich zu behalten lohnen.': 'Works out which dice are worth keeping.', 'Rechnet gründlich und spielt auf den Bonus.': 'Calculates thoroughly and plays for the bonus.',
    '{0}: Einser #': '{0}: Ones #', '{0}: Zweier #': '{0}: Twos #', '{0}: Dreier #': '{0}: Threes #', '{0}: Vierer #': '{0}: Fours #', '{0}: Fünfer #': '{0}: Fives #', '{0}: Sechser #': '{0}: Sixes #',
    '{0}: Dreierpasch #': '{0}: Three of a kind #', '{0}: Viererpasch #': '{0}: Four of a kind #', '{0}: Full House #': '{0}: Full house #', '{0}: Kleine Straße #': '{0}: Small straight #',
    '{0}: Große Straße #': '{0}: Large straight #', '{0}: Fünferpasch #': '{0}: Five of a kind #', '{0}: Chance #': '{0}: Chance #', 'Nochmal (#)': 'Again (#)'
  });

  // ---------- Mau-Mau, Memory ----------
  A({
    'Farbe oder Zahl, wer zuerst leer ist.': 'Suit or rank, first to run out wins.',
    'Der Kartenklassiker: Leg eine Karte mit gleicher Farbe oder gleichem Wert. # heißt zwei ziehen, # aussetzen, mit dem Buben wünschst du dir eine Farbe. Wer zuerst alle Karten los ist, gewinnt. Für # bis #, am Gerät, gegen die KI oder online.': 'The card classic (similar to Crazy Eights): play a card of the same suit or rank. # means draw two, # skip a turn, the jack lets you call a suit. First to get rid of all cards wins. For # to #, on one device, against the AI or online.',
    'Legt irgendeine Karte, die passt.': 'Plays any card that fits.', 'Legt passende Karten, plant aber nicht.': "Plays fitting cards but doesn't plan.",
    'Hebt Buben auf, wünscht klug und ärgert dich mit # und #.': 'Saves jacks, calls suits cleverly and annoys you with # and #.', 'Zählt Farben mit und spielt seine Sonderkarten im besten Moment.': 'Counts suits and plays its special cards at the best moment.',
    'Karte legen': 'Play a card', 'Karte ziehen': 'Draw a card', 'Weiter nach dem Ziehen': 'Continue after drawing', 'Legen': 'Play', 'Ziehen': 'Draw', 'Stapel': 'Pile', 'Aussetzen': 'Skip', 'aussetzen': 'skip', 'Sonderkarten': 'Special cards',
    'Jeder bekommt {0}. Wer zuerst keine Karten mehr hat, gewinnt. Gespielt wird mit # Karten von # bis Ass.': 'Everyone gets {0}. First to have no cards left wins. Played with # cards from # to ace.',
    '# Karten': '# cards',
    'Du darfst eine Karte legen, die zur obersten Karte in der Mitte passt: {0} (♠ ♥ ♦ ♣) oder {1}. Tippe die Karte in deiner Hand an.': 'You may play a card that matches the top card in the middle: {0} (♠ ♥ ♦ ♣) or {1}. Tap the card in your hand.',
    'gleiche Farbe': 'same suit', 'gleicher Wert': 'same rank',
    'Kannst oder willst du nicht legen, tippe auf den {0} und zieh eine Karte. Passt sie, darfst du sie gleich legen, sonst tippst du auf {1}.': "If you can't or don't want to play, tap the {0} and draw a card. If it fits, you may play it right away, otherwise you tap {1}.",
    'Weiter': 'Continue',
    '{0}: Der Nächste muss zwei Karten ziehen, außer er legt selbst eine #, dann muss der Übernächste vier ziehen usw. {1}: Der Nächste setzt aus. {2}: passt immer, und du {3}.': '{0}: the next player must draw two cards, unless they play a # themselves, then the one after must draw four, and so on. {1}: the next player skips a turn. {2}: always fits, and you {3}.',
    'wünschst dir eine Farbe': 'call a suit', 'Bube': 'Jack', '„Gib das Gerät an …“': '“Hand the device to …”',
    'Spielt ihr zu mehreren an einem Gerät, erscheint vor jedem Zug {0}. Erst dann werden die eigenen Karten gezeigt.': 'If several of you play on one device, {0} appears before every move. Only then are your own cards shown.',
    'Spielt ihr zu mehreren an einem Gerät, erscheint vor jedem Zug {0}. Erst wenn der Richtige tippt, werden seine Karten gezeigt.': 'If several of you play on one device, {0} appears before every move. Only when the right person taps are their cards shown.',
    'Welche Farbe wünschst du dir?': 'Which suit do you call?', 'Wunsch ♠': 'Called ♠', 'Wunsch ♣': 'Called ♣', 'Wunsch ♥': 'Called ♥', 'Wunsch ♦': 'Called ♦',
    'Pik': 'Spades', 'Kreuz': 'Clubs', 'Herz': 'Hearts', 'Karo': 'Diamonds', 'Mau!': 'Mau!', 'Mau-Mau!': 'Mau-Mau!', '+# ziehen': 'draw +#', 'KI # hat keine Karten mehr': 'AI # has no cards left',
    '{0} zieht # Karten': '{0} draws # cards', '{0} zieht und kann nicht legen': "{0} draws and can't play", '{0} legt eine #, {1} setzt aus': '{0} plays a #, {1} skips a turn', '{0} legt eine #: +#': '{0} plays a #: +#',
    '{0} wünscht sich ♠ Pik': '{0} calls ♠ spades', '{0} wünscht sich ♣ Kreuz': '{0} calls ♣ clubs', '{0} wünscht sich ♥ Herz': '{0} calls ♥ hearts', '{0} wünscht sich ♦ Karo': '{0} calls ♦ diamonds',
    '{0} : {1} · {2} muss aussetzen': '{0} : {1} · {2} skips a turn',
    'Paare finden, Gedächtnis zählt.': 'Find pairs, memory counts.',
    'Deck zwei Karten auf. Ein Paar bekommst du und darfst nochmal, sonst ist der Nächste dran. Wer am Ende die meisten Paare hat, gewinnt. Für # bis #, am Gerät, gegen die KI oder online.': 'Turn over two cards. A pair is yours and you go again, otherwise it is the next player\'s turn. Whoever has the most pairs at the end wins. For # to #, on one device, against the AI or online.',
    'Vergisst fast alles sofort.': 'Forgets almost everything at once.', 'Merkt sich ungefähr die Hälfte.': 'Remembers about half.', 'Hat ein gutes Gedächtnis.': 'Has a good memory.', 'Vergisst nichts.': 'Forgets nothing.',
    'Karte aufdecken': 'Flip a card', 'Cursor über die # Felder bewegen': 'Move the cursor over the # cards',
    'Alle Karten liegen verdeckt. Wer dran ist, deckt {0} auf. Zeigen sie dasselbe Bild, ist es ein {1}: Du bekommst es und darfst nochmal.': "All cards lie face down. Whoever's turn it is flips {0}. If they show the same picture, it is a {1}: you get it and go again.",
    'zwei Karten': 'two cards', 'Paar': 'pair', 'Merk dir, wo welches Bild liegt!': 'Remember where each picture is!',
    'Passen die Karten nicht zusammen, werden sie nach kurzer Zeit wieder umgedreht und der Nächste ist dran. {0}': "If the cards don't match, they are turned back after a moment and the next player goes. {0}",
    'Sind alle Paare gefunden, gewinnt, wer die meisten hat. Die Zahl der Paare stellst du vor dem Spiel ein: #, # oder #.': 'When all pairs are found, whoever has the most wins. You set the number of pairs before the game: #, # or #.'
  });

  // ---------- Poker ----------
  A({
    "Texas Hold'em mit Spielchips. Bis zu #.": "Texas Hold'em with play chips. Up to #.",
    "Texas Hold'em mit Spielchips, ohne echtes Geld: Zwei Karten auf der Hand, fünf in der Mitte. Setzen, erhöhen, bluffen oder aussteigen. Wer am Ende die meisten Chips hat, gewinnt. Für # bis #, am Gerät, gegen die KI oder online.": "Texas Hold'em with play chips, no real money: two cards in your hand, five in the middle. Bet, raise, bluff or fold. Whoever has the most chips at the end wins. For # to #, on one device, against the AI or online.",
    'Alle starten mit {0} (Spielgeld). Wer am Ende die meisten hat, gewinnt. Eine Hand gewinnt, wer die beste Hand zeigt oder als Letzter übrig bleibt, weil alle anderen gepasst haben.': 'Everyone starts with {0} (play money). Whoever has the most at the end wins. A hand is won by showing the best hand or by being the last one left because everyone else folded.',
    'Jeder bekommt {0}. In der Mitte kommen nacheinander {1} (Flop), {2} (Turn) und noch {3} (River). Du bildest aus deinen zwei und den fünf in der Mitte die beste Hand aus fünf Karten. Unter deinen Karten steht immer, was du gerade hast.': 'Everyone gets {0}. In the middle come {1} (flop), {2} (turn) and then {3} (river). You make the best five-card hand from your two and the five in the middle. Below your cards it always shows what you have right now.',
    'zwei verdeckte Karten': 'two face-down cards',
    'Die zwei Spieler nach dem Geber ({0}) zahlen Pflichteinsätze, den kleinen ({1}) und großen Blind ({2}). Alle drei Hände werden sie größer.': 'The two players after the dealer ({0}) pay forced bets, the small ({1}) and big blind ({2}). They grow every three hands.',
    '{0}: aussteigen. {1}: nichts setzen, wenn niemand erhöht hat. {2}: den Einsatz bezahlen. {3}: Betrag mit dem Regler oder den Schnellknöpfen wählen, die anderen müssen mitgehen oder passen. {4}: alles.': "{0}: drop out. {1}: bet nothing if nobody has raised. {2}: pay the bet. {3}: choose an amount with the slider or the quick buttons, the others must call or fold. {4}: everything.",
    'Von schwach nach stark: Höchste Karte, Paar, Zwei Paare, Drilling, Straße (# in Folge), Flush (# gleiche Farbe), Full House (# + #), Vierling, Straight Flush.': 'From weak to strong: high card, pair, two pair, three of a kind, straight (# in a row), flush (# of the same suit), full house (# + #), four of a kind, straight flush.',
    'Rangfolge': 'Hand ranking', 'Hände': 'Hands', 'Blinds': 'Blinds', 'Setzen': 'Betting',
    'Passen': 'Fold', 'Passt': 'Fold', 'Gepasst': 'Folded', 'gepasst': 'folded', 'Check': 'Check', 'Checken': 'Check', 'Mitgehen': 'Call', 'Mitgehen #': 'Call #', 'Checken / Mitgehen': 'Check / Call',
    'Erhöhen': 'Raise', 'Erhöhen (Regler)': 'Raise (slider)', 'All-in': 'All-in', 'Nächste Hand': 'Next hand', 'Vor dem Flop': 'Pre-flop', 'Flop': 'Flop', 'Turn': 'Turn', 'River': 'River',
    'im Topf': 'in the pot', 'Topf': 'Pot', 'Geteilter Topf': 'Split pot', 'Alle anderen haben gepasst': 'Everyone else folded', 'Hand # von # · Blinds #/#': 'Hand # of # · Blinds #/#',
    '{0}: Check': '{0}: Check', '{0}: Passt': '{0}: Fold', '{0}: Mitgehen #': '{0}: Call #',
    'Spielt vorsichtig, blufft nie.': 'Plays carefully, never bluffs.', 'Geht fast überall mit und erhöht selten.': 'Calls almost everything and rarely raises.',
    'Spielt starke Hände aggressiv und steigt mit schwachen aus.': 'Plays strong hands aggressively and folds weak ones.', 'Rechnet genau, nutzt seine Position und blufft gezielt.': 'Calculates precisely, uses its position and bluffs on purpose.',
    'Kein Paar': 'No pair', 'Höchste Karte': 'High card', 'Zwei Paare': 'Two pair', 'Drilling': 'Three of a kind', 'Straße': 'Straight', 'Flush': 'Flush', 'Vierling': 'Four of a kind', 'Straight Flush': 'Straight flush', 'Royal Flush': 'Royal flush'
  });

  // ---------- Hangman, City Country River ----------
  A({
    'Wort ausdenken, Buchstaben raten.': 'Think of a word, guess letters.',
    'Reihum denkt sich einer ein Wort aus, die anderen raten Buchstabe für Buchstabe. Jeder Treffer bringt Punkte, jeder Fehler malt am Galgen weiter. Für # bis #, am Gerät, gegen die KI oder online.': 'In turn one player thinks of a word and the others guess it letter by letter. Every hit scores points, every miss adds to the gallows. For # to #, on one device, against the AI or online.',
    'Rät ziemlich wild.': 'Guesses quite wildly.', 'Rät die häufigsten Buchstaben zuerst.': 'Guesses the most common letters first.', 'Kennt viele Wörter und rät gezielt.': 'Knows many words and guesses on purpose.', 'Kennt alle Wörter der Liste und löst früh.': 'Knows every word on the list and solves early.',
    'A–Z, Ä Ö Ü': 'A–Z', 'Buchstaben raten': 'Guess letters', 'Wort abschicken': 'Submit word', 'Wörter pro Person': 'Words per person',
    'Wer das Wort vorgibt, tippt es heimlich ein, die anderen raten reihum am selben Gerät.': 'Whoever gives the word types it in secretly, the others guess in turn on the same device.',
    'Reihum denkt sich einer ein {0} aus. Die anderen sehen nur Striche und raten nacheinander {1}.': 'In turn one player thinks of a {0}. The others only see dashes and take turns guessing {1}.',
    'Wort': 'word', 'Buchstaben': 'letters', 'Buchstabe': 'Letter',
    'Kommt dein Buchstabe vor, bekommst du {0} und darfst gleich nochmal. Falsch: Am Galgen kommt ein Strich dazu und der Nächste rät.': 'If your letter is in the word, you get {0} and go again. Wrong: a line is added to the gallows and the next player guesses.',
    'einen Punkt pro Treffer': 'one point per hit', 'Lösen': 'Solve', 'Raten': 'Guess',
    'Glaubst du, das Wort zu kennen, tipp es unten ein und drück {0}. Richtig: {1}. Falsch zählt als Fehler.': 'If you think you know the word, type it below and press {0}. Right: {1}. Wrong counts as a miss.',
    '# Punkte plus einen für jeden fehlenden Buchstaben': '# points plus one for each missing letter', 'Gehängt': 'Hanged',
    'Nach {0} ist das Männchen fertig gemalt. Dann bekommt der, der sich das Wort ausgedacht hat, {1}. Ein schweres Wort lohnt sich also!': 'After {0} the little man is fully drawn. Then whoever thought of the word gets {1}. So a hard word pays off!',
    '# Fehlern': '# mistakes',
    'Wer das Wort vorgibt, bekommt das Handy zuerst allein und tippt es heimlich ein. Danach raten die anderen reihum.': 'Whoever gives the word gets the phone alone first and types it in secretly. Then the others guess in turn.',
    'Du denkst dir ein Wort aus. Die anderen schauen weg.': 'You think of a word. The others look away.', 'Ich hab eins': "I've got one", 'Mindestens # Buchstaben.': 'At least # letters.',
    'Ist es': 'Is it', 'Wort zeigen': 'Show word', 'Ganzes Wort': 'Whole word', '· Wort # von #': '· Word # of #', 'Dein geheimes Wort': 'Your secret word',
    '# bis # Buchstaben, ein einzelnes Wort. Die anderen raten es gleich.': '# to # letters, a single word. The others will guess it.', "Los geht's": "Let's go", 'Wort von {0}': "{0}'s word",
    'Gehängt! Das Wort war {0} · {1} +#': 'Hanged! The word was {0} · {1} +#', 'Fehler': 'Misses', '{0} löst {1} (+#)': '{0} solves {1} (+#)', 'Zufallswort': 'Random word',
    'Buchstabe, Stopp, Punkte. Bis zu #.': 'Letter, stop, points. Up to #.',
    'Ein Buchstabe wird ausgelost, alle schreiben gleichzeitig eine Stadt, ein Land, einen Fluss und mehr damit. Wer fertig ist, ruft Stopp. Danach streicht ihr gemeinsam, was nicht zählt. Für # bis #, online oder reihum am selben Gerät.': 'A letter is drawn and everyone writes a city, a country, a river and more starting with it at the same time. Whoever is done calls stop. Then you cross out together what doesn\'t count. For # to #, online or in turn on the same device.',
    'Ein {0} wird ausgelost. Schreib zu jeder Spalte etwas, das damit anfängt: {1}.': 'A {0} is drawn. For each column write something that starts with it: {1}.',
    'Buchstabe': 'letter', 'Stadt, Land, Fluss, Tier, Name, Beruf': 'city, country, river, animal, name, job',
    'Stadt': 'City', 'Land': 'Country', 'Fluss': 'River', 'Tier': 'Animal', 'Name': 'Name', 'Beruf': 'Job',
    'Bist du fertig, tippe {0}. Die anderen haben dann noch {1}. Spätestens nach # Sekunden ist die Runde vorbei.': 'When you are done, tap {0}. The others then have {1} left. The round ends after # seconds at the latest.',
    'Stopp': 'Stop', 'Stopp!': 'Stop!', '# Sekunden': '# seconds', 'Streichen': 'Cross out',
    'Danach seht ihr alle Antworten. {0}, die nicht zählt (gibt es nicht, falscher Buchstabe). Sie wird gestrichen, wenn genug Mitspieler sie streichen. Dann {1}.': "Then you see all answers. {0} that doesn't count (doesn't exist, wrong letter). It is crossed out when enough players cross it out. Then {1}.",
    'Tippe auf eine Antwort': 'Tap an answer',
    '{0}: nur du hast in der Spalte etwas. {1}: deine Antwort hat sonst niemand. {2}: jemand hat dasselbe. Nach allen Runden gewinnt, wer die meisten Punkte hat.': '{0}: only you have something in the column. {1}: nobody else has your answer. {2}: someone has the same. After all rounds, whoever has the most points wins.',
    'Spielt ihr an einem Gerät, schreibt jeder nacheinander für sich (# Sekunden), dann wird gemeinsam gestrichen.': 'If you play on one device, each writes on their own in turn (# seconds), then you cross out together.',
    'Am selben Gerät schreibt jeder für sich, das Handy wird nach jedem weitergegeben (je # Sekunden).': 'On the same device each writes on their own, the phone is passed on after each (# seconds each).'
  });

  // ---------- online: quick match, friends, tables, rankings ----------
  A({
    'Online-Spiele sind gleich da.': 'Online games are coming soon.', 'Mit einem Konto kannst du Freunde hinzufügen, sie zu Partien herausfordern und in die Rangliste kommen.': 'With an account you can add friends, challenge them and get into the ranking.',
    'Anmelden oder Konto erstellen': 'Sign in or create an account', 'Schnelles Spiel': 'Quick match', 'Ein Tipp, und Versus sucht dir einen Gegner.': 'One tap and Versus finds you an opponent.',
    'Gegner suchen': 'Find opponent', 'Als Gast spielen': 'Play as guest', 'Als Gast gehen # Spiele. Mit Konto alle, dazu Freunde und Rangliste.': 'As a guest # games work. With an account all of them, plus friends and the ranking.',
    'Ist gerade niemand frei, kannst du solange gegen die KI spielen.': "If nobody is free right now, you can play the AI in the meantime.", '# online': '# online', '# sucht gerade': '# searching', '# suchen gerade': '# searching', '# spielen': '# playing',
    'Suche Gegner': 'Looking for an opponent', 'Wer jetzt auch sucht, landet bei dir.': 'Whoever searches now will be matched with you.', 'Noch niemand da · # s': 'Nobody yet · # s',
    'Gerade ist niemand frei. Spiel solange gegen die KI, oder warte weiter.': 'Nobody is free right now. Play the AI in the meantime, or keep waiting.', 'Abbrechen': 'Cancel',
    'Die Suche ist abgelaufen': 'The search timed out', 'Schnelles Spiel kommt nach dem nächsten Server-Update.': 'Quick match comes with the next server update.',
    'Versus sucht dir einen Gegner. Ohne Konto spielst du als Gast.': 'Versus finds you an opponent. Without an account you play as a guest.',
    'Versus sucht dir einen Gegner: Wer gerade wartet, spielt gegen dich, sonst wartest du auf den Nächsten. Ist niemand frei, geht es gegen die KI.': "Versus finds you an opponent: whoever is waiting plays you, otherwise you wait for the next one. If nobody is free, you play the AI.",
    'sucht gerade einen Gegner': 'is looking for an opponent', 'Mitspielen': 'Join', 'Sucht einen Gegner': 'Looking for an opponent', 'Herausforderung': 'Challenge', 'Einladung an den Tisch': 'Table invitation',
    'Annehmen': 'Accept', 'Ablehnen': 'Decline', 'Nein danke': 'No thanks', 'Hinsetzen': 'Sit down', 'Laufende Partie': 'Game in progress',
    'Dein Tisch läuft': 'Your table is playing', 'Dein Tisch wartet': 'Your table is waiting', 'Zurück an den Tisch': 'Back to the table',
    'Einladung an den Tisch · #/#': 'Table invitation · #/#', 'Offener Tisch · #/#': 'Open table · #/#', 'Tisch · #/#': 'Table · #/#',
    'Freunde': 'Friends', 'Anfragen': 'Requests', 'Angefragt': 'Requested', 'Zurückziehen': 'Withdraw', 'möchte dein Freund sein': 'wants to be your friend', 'Freundschaftsanfrage': 'Friend request',
    'Noch keine Freunde': 'No friends yet', 'Mein Code': 'My code', 'Name suchen': 'Search name', 'Code eingeben': 'Enter code', 'Freund hinzufügen': 'Add friend',
    'Zeig deinen QR-Code, schick deinen Link oder such nach einem Namen. Danach könnt ihr euch mit einem Tipp herausfordern.': 'Show your QR code, send your link or search for a name. Then you can challenge each other with one tap.',
    'spielt gerade online': 'is playing online', 'spielt gerade': 'is playing', 'offline': 'offline', 'zuletzt #': 'last seen #', 'nie': 'never', 'gestern': 'yesterday', 'gerade eben': 'just now',
    'vor # Min.': '# min ago', 'vor # Std.': '# h ago', 'vor # Tagen': '# days ago', '# Tag': '# day', '# Tage': '# days',
    'Name, z. B. blitzfuchs': 'Name, e.g. blitzfox', 'Tipp die ersten Buchstaben. Die Liste erscheint beim Tippen.': 'Type the first letters. The list appears as you type.', 'Noch ein Buchstabe …': 'One more letter …',
    'angefragt': 'requested', 'Dein Freundescode': 'Your friend code', 'Link teilen': 'Share link', 'Link kopieren': 'Copy link', 'Neuen Code erstellen': 'Create new code', 'Link kopiert': 'Link copied',
    'Lass deinen Freund den QR-Code mit der Handykamera scannen oder den Code eingeben. Dann seid ihr sofort befreundet.': "Let your friend scan the QR code with their phone camera or enter the code. Then you're friends right away.",
    'Alte Links und QR-Codes gelten dann nicht mehr. Nochmal tippen': 'Old links and QR codes will stop working. Tap again', 'QR-Code geht gerade nicht. Teil den Link oder den Code.': "The QR code isn't working right now. Share the link or the code.",
    'QR-Code mit deinem Freundes-Link': 'QR code with your friend link',
    'Gib den Code deines Freundes ein. Er steht bei ihm unter „Mein Code“.': 'Enter your friend\'s code. They find it under "My code".', 'Der Code hat # Zeichen.': 'The code has # characters.',
    'Freundescodes kommen nach dem nächsten Server-Update.': 'Friend codes come with the next server update.', 'Ihr seid jetzt Freunde': "You're friends now", 'Gleich herausfordern': 'Challenge now',
    'Ihr seid schon Freunde': "You're already friends", 'Schon angefragt': 'Already requested', 'Anfrage zurückgezogen': 'Request withdrawn', 'Das ist dein eigener Freundes-Link': 'That is your own friend link',
    'Freundes-Link': 'Friend link', 'Melde dich an oder erstell ein Konto. Danach seid ihr automatisch befreundet.': "Sign in or create an account. Then you'll be friends automatically.", 'Zum Konto': 'To account',
    'Rangliste': 'Ranking', 'Diese Woche': 'This week', 'Für immer': 'All time', 'Alle Spiele': 'All games', 'Wochenwertung': 'Weekly ranking', 'Ewige Wertung': 'All-time ranking',
    '{0} · startet jeden Montag neu · noch {1}': '{0} · starts over every Monday · {1} left', '{0} · startet jeden Montag neu': '{0} · starts over every Monday', '{0} · alle Partien seit Beginn': '{0} · all games since the start',
    'Wochenwertung kommt nach dem nächsten Server-Update.': 'The weekly ranking comes with the next server update.', 'Sieger letzte Woche': "Last week's winners",
    '# Tage # Std': '# days # h', '# Tag # Std': '# day # h', '# Std': '# h',
    'Diese Woche noch keine Partie': 'No game this week yet', 'Noch keine Partie': 'No game yet', 'Noch leer': 'Still empty', 'Deine Chance auf Platz 1!': 'Your chance for first place!',
    'Spiel online gegen einen Freund oder über „Online“ im Spiel-Panel, dann stehst du hier.': 'Play online against a friend or via "Online" in the game panel, then you\'ll show up here.',
    'Spieler': 'Player', '# Sieg': '# win', '# Siege': '# wins', '# Partien': '# games', 'Sieg': 'Win',
    '# Spieler in allen Spielen. Gezählt werden gewonnene Online-Partien gegen andere Spieler, gleiche Siege sortiert nach weniger Partien.': '# players in all games. Online games won against other players count; equal wins are sorted by fewer games.',
    'Für Partien gegen Freunde brauchst du ein Konto.': 'You need an account to play friends.', 'Für Online-Tische brauchst du ein Konto.': 'You need an account for online tables.',
    'Noch keine Freunde. Zeig deinen QR-Code oder such nach einem Namen.': 'No friends yet. Show your QR code or search for a name.',
    'Wen willst du herausfordern? Am besten jemanden, der gerade online ist.': 'Who do you want to challenge? Best someone who is online right now.', 'Einladen': 'Invite', 'Eingeladen': 'Invited', 'Am Tisch': 'At the table',
    'Warte auf {0}': 'Waiting for {0}', 'die Einladung läuft, solange dieses Fenster offen ist.': 'the invitation stays open as long as this window is open.',
    'Die Einladung ist abgelaufen': 'The invitation expired', 'Niemand ist beigetreten': 'Nobody joined', 'Unbekanntes Spiel': 'Unknown game',
    'Diese Partie ist schon vorbei.': 'This game is already over.', 'Die Partie hat noch nicht angefangen.': "The game hasn't started yet.",
    'Profile kommen nach dem nächsten Server-Update.': 'Profiles come with the next server update.', 'Das bist du': "That's you", 'Status verborgen': 'Status hidden',
    'annulliert': 'voided', 'Ihr beide': 'You two', 'Letzte Partien': 'Recent games', 'Noch keine Online-Partien.': 'No online games yet.', 'Spiele': 'Games',
    '· aufgegeben': '· resigned', '· verlassen': '· left', '· Zeit': '· time', '· nicht gewertet': '· unranked',
    'Mein Freundescode': 'My friend code', 'Herausfordern': 'Challenge', 'Freund entfernen': 'Remove friend', 'Wirklich entfernen?': 'Really remove?', 'Anfrage gesendet': 'Request sent',
    'Anfrage annehmen': 'Accept request', 'Als Freund hinzufügen': 'Add as friend', 'Blockieren': 'Block', 'Melden': 'Report', 'Wirklich blockieren?': 'Really block?', 'Nicht mehr blockieren': 'Unblock',
    'Blockieren kommt nach dem nächsten Server-Update.': 'Blocking comes with the next server update.', 'Melden kommt nach dem nächsten Server-Update.': 'Reporting comes with the next server update.',
    'Beleidigender Name': 'Offensive name', 'Beleidigung oder Spam': 'Insults or spam', 'Schummeln oder Abbrechen': 'Cheating or quitting', 'Etwas anderes': 'Something else',
    'Das Team sieht die Meldung und kümmert sich darum. Missbrauch der Meldefunktion kann zur Sperre führen.': 'The team sees the report and takes care of it. Misusing reports can lead to a ban.',
    'Was ist passiert? (freiwillig)': 'What happened? (optional)', 'Wähl bitte einen Grund.': 'Please choose a reason.', 'Danke, die Meldung ist beim Team': 'Thanks, the team has your report',
    'Online-Tische kommen nach dem nächsten Server-Update.': 'Online tables come with the next server update.', 'Das Spiel an diesem Tisch ist vorbei.': 'The game at this table is over.',
    'Online-Tisch · # Plätze': 'Online table · # seats', 'Tischcode': 'Table code', 'Frei': 'Free', 'Gastgeber': 'Host', 'du': 'you', '· du': '· you', '· offline': '· offline', 'spielt sonst die KI': 'otherwise the AI plays',
    'Warte auf Mitspieler': 'Waiting for players', 'Spiel starten': 'Start game', 'Für alle sichtbar': 'Visible to everyone', 'Jeder eingeloggte Spieler kann sich dazusetzen': 'Any signed-in player can join',
    'Freunde einladen': 'Invite friends', 'Noch keine Freunde. Teil einfach den Link oder den Tischcode.': 'No friends yet. Just share the link or the table code.',
    'Der Tisch wurde geschlossen': 'The table was closed', 'Du sitzt nicht mehr an diesem Tisch': "You're no longer at this table", 'Der Tischcode hat # Zeichen': 'The table code has # characters',
    'Eröffne einen Tisch für # Spieler und lade Freunde ein. Freie Plätze spielt die KI.': 'Open a table for # players and invite friends. The AI plays empty seats.', 'Tisch eröffnen': 'Open table', 'Beitreten': 'Join',
    'Online-Tisch · # Spieler': 'Online table · # players', 'Gast': 'Guest'
  });

  // ---------- admin panel ----------
  A({
    'Übersicht': 'Overview', 'Partien': 'Games', 'Meldungen': 'Reports', 'Protokoll': 'Log', 'Spieler': 'Players', 'Live': 'Live', 'Aktiv heute': 'Active today', '+# in # Tagen': '+# in # days', '# in # Tagen': '# in # days', '# online': '# online',
    'Gerade online': 'Online now', 'Gerade niemand.': 'Nobody right now.', 'Aktualisiert sich alle # Sekunden.': 'Refreshes every # seconds.', 'Beliebte Spiele': 'Popular games', 'Noch keine Partien.': 'No games yet.',
    'Neue Spieler': 'New players', 'Noch niemand.': 'Nobody yet.', 'Team': 'Team', '# gesperrt · # ausgeblendet': '# banned · # hidden', '# Freundschaften': '# friendships',
    'Spieler suchen (Namensanfang)': 'Search players (start of name)', 'Niemand gefunden.': 'Nobody found.', 'Ausblenden': 'Hide', 'Einblenden': 'Show', 'Entsperren': 'Unban', 'Sperren …': 'Ban …',
    'Notiz': 'Note', 'Notiz ändern': 'Edit note', 'Umbenennen': 'Rename', 'Bilanz zurücksetzen': 'Reset stats', 'Wirklich alles auf 0?': 'Really reset everything to 0?',
    'Admin entziehen': 'Remove admin', 'Zum Admin machen': 'Make admin', 'Wirklich entziehen?': 'Really remove?', 'Wirklich Admin?': 'Really admin?', 'Dev aufheben': 'Remove dev', 'Zum Dev-Konto': 'Make dev account', 'Wirklich?': 'Really?',
    'Nur der Owner kann Admins bearbeiten.': 'Only the owner can edit admins.', 'Grund (optional, nur für Admins sichtbar)': 'Reason (optional, only visible to admins)', 'Dauerhaft': 'Permanent',
    'Private Notiz für das Team': 'Private note for the team', 'Speichern': 'Save', 'Ausgeblendet': 'Hidden', 'Gesperrt bis #': 'Banned until #', 'Laufend': 'Running', 'Beendet': 'Finished',
    'wartet auf Antwort': 'waiting for an answer', 'läuft': 'running', 'beendet': 'finished', 'gewonnen': 'won', 'remis': 'draw', 'aufgegeben': 'resigned', 'verlassen': 'left', 'Ergebnis strittig': 'Result disputed',
    'Gegner weg': 'opponent gone', 'gewinnt': 'wins', 'gegen': 'vs.', 'Abspielen': 'Replay', 'Annullieren': 'Void', 'Wirklich annullieren?': 'Really void?', 'Keine Partien.': 'No games.',
    'Laufende Partien aktualisieren sich alle # Sekunden. „Zuschauen“ zeigt das Brett live, „Abspielen“ spielt eine beendete Partie Zug für Zug nach.': 'Running games refresh every # seconds. "Watch" shows the board live, "Replay" plays back a finished game move by move.',
    'Noch keine Admin-Aktionen.': 'No admin actions yet.', 'Offen': 'Open', 'Erledigt': 'Done', 'Wieder öffnen': 'Reopen', 'Keine offenen Meldungen.': 'No open reports.', 'Noch keine Meldungen.': 'No reports yet.',
    'Tipp auf den Namen, um den Spieler zu sperren, auszublenden oder umzubenennen. Danach die Meldung auf „Erledigt“ setzen.': 'Tap the name to ban, hide or rename the player. Then set the report to "Done".',
    'Meldung erledigt.': 'Report done.', 'Meldung wieder offen.': 'Report reopened.', 'Partie annulliert.': 'Game voided.', 'Notiz gespeichert.': 'Note saved.', 'Partie': 'Game', 'gesperrt': 'banned',
    'ausgeblendet': 'hidden', 'eingeblendet': 'shown', 'entsperrt': 'unbanned', 'umbenannt': 'renamed', 'Bilanz zurückgesetzt': 'stats reset', 'zum Admin gemacht': 'made admin', 'Admin entzogen': 'admin removed',
    'Dev-Konto an': 'dev account on', 'Dev-Konto aus': 'dev account off', 'Partie annulliert': 'game voided', 'Meldung erledigt': 'report done', 'Meldung wieder offen': 'report reopened', 'Neu laden': 'Reload'
  });

  // ---------- patterns: text with names, moves and hands ----------
  const t = V.t;
  const PIECE = { Bauer: 'Pawn', Springer: 'Knight', Läufer: 'Bishop', Turm: 'Rook', Dame: 'Queen', König: 'King' };
  const HIGH = { Zwei: 'Two', Drei: 'Three', Vier: 'Four', Fünf: 'Five', Sechs: 'Six', Sieben: 'Seven', Acht: 'Eight', Neun: 'Nine', Zehn: 'Ten', Bube: 'Jack', Dame: 'Queen', König: 'King', Ass: 'Ace' };
  const MANY = { Zweier: 'twos', Dreier: 'threes', Vierer: 'fours', Fünfer: 'fives', Sechser: 'sixes', Siebener: 'sevens', Achter: 'eights', Neuner: 'nines', Zehner: 'tens', Buben: 'jacks', Damen: 'queens', Könige: 'kings', Asse: 'aces' };
  const many = w => MANY[w] || w, high = w => HIGH[w] || w;
  function hand(h) {
    let m;
    if ((m = /^Paar (\S+)$/.exec(h))) return 'Pair of ' + many(m[1]);
    if ((m = /^Zwei Paare, (\S+) und (\S+)$/.exec(h))) return 'Two pair, ' + many(m[1]) + ' and ' + many(m[2]);
    if ((m = /^Drilling (\S+)$/.exec(h))) return 'Three ' + many(m[1]);
    if ((m = /^Vierling (\S+)$/.exec(h))) return 'Four ' + many(m[1]);
    if ((m = /^Full House, (\S+) und (\S+)$/.exec(h))) return 'Full house, ' + many(m[1]) + ' over ' + many(m[2]);
    if ((m = /^(Flush|Straße|Straight Flush), (\S+) hoch$/.exec(h))) return t(m[1]) + ', ' + high(m[2]) + ' high';
    if ((m = /^(Straße|Straight Flush) bis (\S+)$/.exec(h))) return t(m[1]) + ' to ' + high(m[2]).toLowerCase();
    if ((m = /^(\S+) hoch$/.exec(h)) && HIGH[m[1]]) return high(m[1]) + ' high';
    return t(h);
  }
  const who = s => (s === 'Du' ? 'You' : s.replace(/^KI\b/, 'AI').replace(/^Spieler (\d)/, 'Player $1'));
  V.i18n.pat([
    // chess moves and notes
    [/^(Bauer|Springer|Läufer|Turm|Dame|König) (schlägt )?([a-h][1-8])(?: wird (Dame|Turm|Läufer|Springer))?$/, (m, p, x, sq, pr) => PIECE[p] + (x ? ' takes ' : ' ') + sq + (pr ? ', becomes ' + PIECE[pr].toLowerCase() : '')],
    [/^(.+) · Schach!$/, (m, a) => t(a) + ' · Check!'],
    // checkers, reversi, mill, go notes
    [/^([a-h]\d+) schlägt ([a-h]\d+)$/, '$1 takes $2'], [/^([a-z]\d+) schlägt (\d+) Steine$/, '$1 takes $2 stones'], [/^([a-h]\d+) · (\d+) umgedreht$/, '$1 · $2 flipped'],
    [/^setzt ([a-g]\d)(?:, nimmt ([a-g]\d))?$/, (m, a, b) => 'places ' + a + (b ? ', takes ' + b : '')], [/^([a-g]\d)–([a-g]\d)(?:, nimmt ([a-g]\d))?$/, (m, a, b, c) => a + '–' + b + (c ? ', takes ' + c : '')],
    // battleship shots
    [/^([A-J]\d+): (.+)$/, (m, sq, r) => sq + ': ' + t(r)],
    // poker hands
    [/^(Du|KI \d) \+(\d+) · (.+)$/, (m, w, n, h) => who(w) + ' +' + n + ' · ' + hand(h)],
    [/^mit (.+)$/, (m, h) => 'with ' + hand(h)],
    [/^(Paar \S+|Zwei Paare, \S+ und \S+|Drilling \S+|Vierling \S+|Full House, \S+ und \S+|(?:Flush|Straße|Straight Flush), \S+ hoch|(?:Straße|Straight Flush) bis \S+|\S+ hoch)$/, (m, h) => hand(h)],
    // dice and board events
    [/^\{(\d)\} würfelt (\d+)$/, '{$1} rolls $2'], [/^\{(\d)\} würfelt (\d+) und kann nicht ziehen$/, "{$1} rolls $2 and can't move"], [/^\{(\d)\} würfelt (\d+) und prallt zurück$/, '{$1} rolls $2 and bounces back'],
    [/^\{(\d)\} klettert von (\d+) auf (\d+)$/, '{$1} climbs from $2 to $3'], [/^\{(\d)\} rutscht von (\d+) auf (\d+)$/, '{$1} slides from $2 to $3'],
    [/^\{(\d)\} wirft \{(\d)\} raus!$/, '{$1} knocks out {$2}!'], [/^\{(\d)\} hat eine \{(\d)\}$/, '{$1} has a {$2}'], [/^\{(\d)\}: (\d+), keine (\d+)$/, '{$1}: $2, no $3'],
    // "note · X to move" and "Name: note" (AI and opponent speech, backgammon moves)
    [/^(.+) · \{(\d)\} (?:bist|ist) dran$/, (m, a, k) => t(a) + ' · {' + k + '} to move'],
    [/^\{(\d)\}: (.+)$/, (m, k, r) => '{' + k + '}: ' + t(r.replace(/\bkann nicht\b/, "can't move"))],
    // names in toasts and dialogs
    [/^Du und (\S+) seid jetzt Freunde$/, "You and $1 are friends now"], [/^Du und (\S+) seid schon Freunde$/, "You and $1 are already friends"],
    [/^Anfrage an (\S+) gesendet$/, 'Request sent to $1'], [/^(\S+) ist jetzt dein Freund$/, '$1 is your friend now'], [/^(\S+) ist nicht mehr dein Freund$/, '$1 is no longer your friend'],
    [/^(\S+) hat abgelehnt$/, '$1 declined'], [/^(\S+) ist blockiert$/, '$1 is blocked'], [/^(\S+) ist nicht mehr blockiert$/, '$1 is no longer blocked'],
    [/^(\S+) melden$/, 'Report $1'], [/^(\S+) auch blockieren$/, 'Also block $1'], [/^(\S+) herausfordern$/, 'Challenge $1'], [/^(\S+) als Freund hinzufügen$/, 'Add $1 as friend'],
    [/^Welches Spiel\? (\S+) bekommt eine Einladung\.$/, 'Which game? $1 gets an invitation.'], [/^Warte, bis (.+) startet …$/, 'Waiting for $1 to start …'],
    [/^Warte auf (\S+)$/, 'Waiting for $1'], [/^Ich bin (\S+)(, weiter)?$/, (m, n, w) => "I'm " + n + (w ? ', continue' : '')], [/^Gib das Gerät an (\S+)$/, 'Hand the device to $1'],
    [/^(\S+) will eine Revanche!$/, '$1 wants a rematch!'], [/^(\S+) möchte keine Revanche$/, "$1 doesn't want a rematch"], [/^(\S+) hat die Partie verlassen$/, '$1 left the game'],
    [/^(\S+) ist gerade nicht erreichbar$/, "$1 can't be reached right now"], [/^(\S+) ist weg, die KI spielt weiter$/, '$1 is gone, the AI plays on'], [/^(\S+): Zeit abgelaufen$/, '$1: time ran out'],
    [/^Willkommen, (\S+)$/, 'Welcome, $1'], [/^Du heißt jetzt (\S+)$/, 'Your name is now $1'], [/^Neuer Code: (.+)$/, 'New code: $1'],
    [/^Niemand mit „(.+)“ gefunden\. Frag nach dem genauen Namen oder lass dir den Code geben\.$/, 'Nobody called "$1" found. Ask for the exact name or for their code.'],
    [/^Du und \{(\d)\} könnt euch jetzt direkt herausfordern\.$/, 'You and {$1} can now challenge each other directly.'],
    [/^(?!spielt )(.+) gegen ([a-z0-9_-]{3,16})$/, (m, g, n) => t(g) + ' vs. ' + n], [/^gegen ([a-z0-9_-]{3,16})(.*)$/, (m, n, r) => 'vs. ' + n + t(r)],
    [/^Dein Platz in (.+?)( diese Woche)?$/, (m, g, w) => 'Your place in ' + (g === 'allen Spielen' ? 'all games' : g) + (w ? ' this week' : '')],
    [/^(Diese Woche hat noch niemand|Hier hat noch niemand) eine Online-Partie in (.+) gewonnen\.(.*)$/, (m, a, g, r) => 'Nobody has won an online game in ' + (g === 'allen Spielen' ? 'all games' : g) + (a.startsWith('Diese') ? ' this week' : '') + ' yet.' + (r ? ' Your chance for first place!' : '')],
    [/^(\d+) Spieler in (.+)\. Gezählt werden (.*)$/, (m, n, g) => n + ' players in ' + (g === 'allen Spielen' ? 'all games' : g) + '. Online games won against other players count; equal wins are sorted by fewer games.'],
    [/^Für Online-Partien in (.+) brauchst du ein Konto\.$/, 'You need an account for online games in $1.'],
    [/^Komm an meinen (.+)-Tisch in Versus \(Code (\S+)\):$/, 'Join my $1 table in Versus (code $2):'],
    [/^Spiel mit mir Versus! Mit diesem Link sind wir sofort Freunde \(Code (.+)\):$/, "Play Versus with me! With this link we're friends right away (code $1):"],
    [/^Als Gast kannst du (.+) und (.+) spielen\. Mit einem kostenlosen Konto sind alle (\d+) Spiele frei, dazu Online-Partien, Freunde und die Rangliste\.$/, 'As a guest you can play $1 and $2. A free account unlocks all $3 games, plus online matches, friends and the ranking.'],
    [/^Anfrage von (\S+) ablehnen$/, 'Decline request from $1'], [/^Anfrage an (\S+) zurückziehen$/, 'Withdraw request to $1'],
    [/^Für Online-Partien brauchst du ein Konto\.$/, 'You need an account for online games.'],
    [/^Du kannst deinen Namen erst wieder ab (.+) ändern\.$/, 'You can change your name again from $1.'], [/^Wieder möglich ab (.+)$/, 'Possible again from $1'],
    [/^Gespeichert (.+)$/, (m, a) => 'Saved ' + t(a)], [/^Abgleich fehlgeschlagen: (.*)$/, (m, e) => 'Sync failed: ' + t(e)],
    [/^dabei seit (.+)$/i, 'member since $1'], [/^(.+) · dabei seit (.+)$/, (m, a, d) => t(a) + ' · member since ' + d], [/^zuletzt (.+)$/, (m, a) => 'last seen ' + t(a)],
    [/^online · (.+)$/, 'online · $1'], [/^(\d+) · (\d+) online$/, '$1 · $2 online'], [/^(\d+) Siege in Folge$/, '$1 wins in a row'],
    [/^Bilanz von (\S+) ist zurückgesetzt\.$/, "$1's stats are reset."], [/^(\S+) ist (ausgeblendet|wieder sichtbar|entsperrt|jetzt Admin|kein Admin mehr|jetzt ein Dev-Konto|kein Dev-Konto mehr)\.$/, (m, n, s) => n + ' ' + { ausgeblendet: 'is hidden', 'wieder sichtbar': 'is visible again', entsperrt: 'is unbanned', 'jetzt Admin': 'is now an admin', 'kein Admin mehr': 'is no longer an admin', 'jetzt ein Dev-Konto': 'is now a dev account', 'kein Dev-Konto mehr': 'is no longer a dev account' }[s] + '.'],
    [/^(\S+) ist (dauerhaft|für .+) gesperrt\.$/, (m, n, d) => n + ' is banned ' + (d === 'dauerhaft' ? 'permanently' : 'for ' + t(d.slice(4))) + '.'], [/^(\S+) heißt jetzt (\S+)\.$/, '$1 is now called $2.'],
    [/^(\d+)× gemeldet$/, 'reported $1×'], [/^von (\S+) · (.+)$/, (m, n, r) => 'by ' + n + ' · ' + r.replace(' · erledigt von ', ' · done by ').replace(' · erledigt', ' · done')],
    [/^Spieler (\d)$/, 'Player $1'], [/^KI (\d)$/, 'AI $1'], [/^(\d+) KIs$/, '$1 AIs'], [/^(\d+) Spieler$/, '$1 players'],
    [/^(\S+) wünscht sich (.+)$/, (m, n, s) => n + ' calls ' + t(s)], [/^(\S+) zieht (\d+) Karten$/, '$1 draws $2 cards']
  ]);

  A({
    'Spielt pro Zug # Partien durch.': 'Plays through # games per move.', 'in einer Linie zwischen deinem neuen und einem alten Stein': 'in a line between your new disc and an old one',
    'mehr Steine seiner Farbe': 'more discs of their colour', 'sich nicht mehr bewegen kann': 'cannot move any more', 'sofort nochmal': 'again right away', 'kann nicht': "can't move",
    'Umdrehen': 'Flipping', 'Turm!': 'Rook!', 'Springer!': 'Knight!', 'Läufer!': 'Bishop!', 'Versus # · ohne Werbung. KI und Spiele zu zweit laufen auch offline.{0}': 'Versus # · no ads. AI and two-player games also work offline.{0}',
    'Du gewinnst #': 'You win #', 'Schnellboot': 'Patrol boat'
  });
  A({
    'Spielbrett': 'Board style', 'Schach, Dame und Reversi': 'Chess, checkers and Reversi', 'Standard': 'Standard', 'Neon': 'Neon', 'Holz': 'Wood',
    'Gegenüber sitzen': 'Sitting opposite', 'Zu zweit am Handy: Name und Hinweise für Spieler 2 stehen auf dem Kopf': "Two players on one phone: player 2's name and hints are upside down",
    'Ergebnis teilen': 'Share result', 'Bild gespeichert': 'Picture saved', 'Bild ging nicht': "Picture didn't work", 'Sofort spielbar': 'Play right away',
    'Mit Konto: # weitere Spiele': 'With an account: # more games', 'Kostenlos. Dazu Online-Partien, Freunde und die Rangliste.': 'Free. Plus online matches, friends and the ranking.',
    'Deine Herausforderung erscheint bei allen eingeloggten Spielern. Wer zuerst beitritt, spielt gegen dich.': 'Your challenge shows up for all signed-in players. Whoever joins first plays you.'
  });
  A({
    'Spiel suchen': 'Search games', 'Favoriten': 'Favourites', 'Zuletzt gespielt': 'Recently played', 'Treffer': 'Results',
    'Kein Spiel gefunden': 'No game found', 'Versuch einen anderen Namen oder schau unter Alle.': 'Try another name or look under All.', 'Suche löschen': 'Clear search',
    'Favorit': 'Favourite', 'Zu Favoriten (F)': 'Add to favourites (F)', 'Aus Favoriten entfernen': 'Remove from favourites',
    'Favorit an oder aus': 'Favourite on or off'
  });
  // ---------- offline matches, watching friends ----------
  A({
    'Abgebrochen': 'Called off', 'Partie abgebrochen': 'Match called off', 'Zuschauer': 'Spectators', 'Du warst zu lange offline': 'You were offline for too long',
    'Ein Spieler war zu lange offline': 'A player was offline for too long', 'Zuschauen': 'Watch', 'offline': 'offline'
  });
  V.i18n.pat([
    [/^(\S+) ist offline · ohne Rückkehr endet die Partie in (\d+) s ohne Sieger$/, "$1 is offline · if they don't come back, the match ends in $2 s with no winner"],
    [/^(\S+) war zu lange offline$/, '$1 was offline for too long'],
    [/^spielt (.+) gegen ([a-z0-9_-]{3,16})$/, (m, g, n) => 'playing ' + g + ' vs. ' + n]
  ]);

  // ---------- invites ----------
  A({
    'Freunde einladen': 'Invite friends', 'Wer über deinen Link ein Konto erstellt, ist sofort dein Freund': 'Whoever creates an account through your link is your friend right away',
    'Wer über deinen Link neu ein Konto erstellt, zählt für dein Werber-Abzeichen im Profil.': "Whoever creates a new account through your link counts for the recruiter badge in your profile.",
    'Du wurdest eingeladen': "You've been invited",
    'Erstell ein kostenloses Konto oder melde dich an. Danach seid ihr automatisch befreundet und könnt gleich gegeneinander spielen.': "Create a free account or sign in. Then you're friends automatically and can play each other right away.",
    'Werber · #': 'Recruiter · #', 'Hat # Spieler zu Versus eingeladen': 'Invited # players to Versus',
    'Du hast schon # Spieler eingeladen · Werber-Abzeichen im Profil': "You've invited # players · recruiter badge in your profile",
    'Zu viele falsche Codes. Versuch es in einer Stunde nochmal.': 'Too many wrong codes. Try again in an hour.', 'Diesen Code gibt es nicht. Vertippt?': "This code doesn't exist. Typo?", 'Das ist dein eigener Code.': 'That is your own code.'
  });

  // ---------- legal ----------
  A({
    'Impressum und Datenschutz': 'Legal notice and privacy', 'Versus # · ohne Werbung. KI und Spiele zu zweit laufen auch offline.{0}{1}{2}': 'Versus # · no ads. AI and two-player games also work offline.{0}{1}{2}', 'Datenschutz und Impressum': 'Privacy and legal notice',
    'Welche Daten Versus speichert und wer dahintersteht': 'What data Versus stores and who runs it',
    'Konten ab 14 Jahren, jünger nur mit Erlaubnis der Eltern. Was gespeichert wird: {0}.': 'Accounts from age 14, younger only with your parents\' permission. What is stored: {0}.', 'Datenschutz': 'Privacy'
  });

  // ---------- Schnapsen, Schätzfragen ----------
  A({
    '# Karten, # Punkte, Zudrehen.': '# cards, # points, closing.',
    'Der österreichische Kartenklassiker für zwei: Stiche machen, Zwanziger und Vierziger ansagen und im richtigen Moment zudrehen. Wer zuerst # Punkte hat, gewinnt die Runde. Am Gerät, gegen die KI oder online.': 'The Austrian card classic for two: win tricks, call marriages for 20 and 40 and close the talon at the right moment. First to # points wins the round. On one device, against the AI or online.',
    'Spielt irgendeine Karte.': 'Plays any card.', 'Sticht hohe Karten und sagt Zwanziger an.': 'Takes high cards and calls marriages.',
    'Zählt Punkte mit und dreht zu, wenn es reicht.': 'Counts points and closes when it is enough.', 'Merkt sich jede Karte und spielt das Ende perfekt.': 'Remembers every card and plays the end perfectly.',
    'Wer spielt zuerst aus?': 'Who leads first?', 'Karte spielen': 'Play a card', 'Atout tauschen': 'Swap trump', 'Zudrehen': 'Close', 'Spiel bis': 'Play to', '# (Bummerl)': '# (Bummerl)',
    'Ihr spielt abwechselnd am selben Gerät. Vor jedem Zug gebt ihr das Handy weiter, damit niemand fremde Karten sieht.': "You take turns on the same device. Pass the phone before every move so nobody sees the other's cards.",
    'Stiche': 'Tricks', 'Zwanziger und Vierziger': 'Marriages', 'Tauschen und Zudrehen': 'Swapping and closing', 'Atout': 'Trump', 'König und Dame': 'king and queen', 'Atout-Buben': 'trump jack',
    'Gespielt wird mit {0}: Ass (# Punkte), Zehner (#), König (#), Dame (#) und Bube (#). Wer in einer Runde zuerst {1} aus seinen Stichen hat, gewinnt sie.': 'You play with {0}: ace (# points), ten (#), king (#), queen (#) and jack (#). Whoever first has {1} from their tricks wins the round.',
    'Jeder hat # Karten. Einer spielt aus, der andere legt dazu. Die höhere Karte der ausgespielten Farbe gewinnt, eine {0}-Karte (Trumpf, offen unter dem Stapel) sticht alles. Nach dem Stich ziehen beide nach, der Gewinner zuerst und spielt wieder aus.': 'Everyone has # cards. One leads, the other plays a card to it. The higher card of the led suit wins, a {0} card (face up under the stock) beats everything. After the trick both draw, the winner first, and the winner leads again.',
    'Hast du {0} einer Farbe, spiel eine davon aus: Das zählt {1}, in Atout {2}. Die Punkte zählen, sobald du einen Stich hast. Die Krone ♛ in deiner Hand zeigt solche Paare.': 'If you hold {0} of one suit, lead one of them: that counts {1}, in trump {2}. The points count once you have a trick. The crown ♛ in your hand marks such pairs.',
    'Mit dem {0} darfst du vor dem Ausspielen die offene Atout-Karte holen. Mit {1} schließt du den Stapel: Ab dann wird nichts mehr gezogen und jeder muss {2}. Das gilt auch, wenn der Stapel leer ist.': 'With the {0} you may take the face-up trump card before you lead. With {1} you shut the stock: from then on nobody draws and everyone must {2}. The same applies once the stock is empty.',
    'Farbe geben, höher spielen wenn möglich, sonst stechen': 'follow suit, play higher if possible, else trump',
    'Der Sieger einer Runde bekommt {0} Punkte, wenn der andere keinen Stich hat, {1}, wenn er unter # hat, sonst {2}. Wer zudreht und keine # schafft, schenkt dem anderen mindestens #. Ohne # gewinnt sonst der letzte Stich.': 'The winner of a round gets {0} points if the other has no trick, {1} if they have less than #, else {2}. Whoever closes and misses # gives the other at least #. Without #, the last trick wins.',
    'Angesagt': 'Called', '+# nach dem ersten Stich': '+# after the first trick', 'leer': 'empty', 'Zugedreht': 'Closed', 'Zugedreht!': 'Closed!', 'Zwanziger!': 'Twenty!', 'Vierziger!': 'Forty!', 'bis #': 'to #',
    'Du gibst zum Stich dazu.': 'You play to the trick.', 'Du spielst aus.': 'You lead.',
    '{0}: Farbe geben, höher wenn möglich, sonst stechen': '{0}: follow suit, higher if possible, else trump', '{0}: spiel eine Karte aus': '{0}: lead a card',
    '{0} dreht zu: ab jetzt Farbe geben und stechen': '{0} closes: from now on follow suit and trump', '{0} sticht (+#)': '{0} takes the trick (+#)',
    '{0} gewinnt die Runde: # zu # Punkte': '{0} wins the round: # to # points', '+# Punkt': '+# point', '+# Punkte': '+# points', 'letzter Stich': 'last trick',
    'der andere ohne Stich': 'the other without a trick', 'der andere unter #': 'the other below #', 'tauscht den Atout-Buben': 'swaps the trump jack', 'dreht zu': 'closes', '# : # Punkte': '# : # points',
    'Wer schätzt am nächsten dran? Bis zu #.': 'Who guesses closest? Up to #.',
    'Wie hoch ist der Großglockner, wann sank die Titanic? Alle tippen gleichzeitig eine Zahl. Wer am nächsten dran ist, holt die Punkte, ein Volltreffer gibt extra. Für # bis #, am selben Gerät oder online.': 'How high is the Grossglockner, when did the Titanic sink? Everyone types a number at the same time. Whoever is closest takes the points, a bullseye gives extra. For # to #, on one device or online.',
    'Ziffern': 'Digits', 'Zahl eintippen': 'Type a number', 'Abgeben': 'Submit', 'Fragen': 'Questions', 'Auflösung': 'The reveal', 'Volltreffer': 'Bullseye', 'Volltreffer!': 'Bullseye!',
    'Am selben Gerät tippt jeder für sich, das Handy wird nach jedem weitergegeben.': 'On one device everyone types on their own, the phone is passed on after each.',
    'Es kommt eine Frage, deren Antwort eine {0} ist: eine Höhe, ein Jahr, eine Anzahl. Tipp deine Schätzung ein, du hast {1}.': 'A question comes up whose answer is a {0}: a height, a year, a count. Type your guess, you have {1}.',
    'Zahl': 'number', 'Zahlenstrahl': 'number line', '# Punkt': '# point', '# Punkte extra': '# bonus points',
    'Danach erscheinen alle Schätzungen und die richtige Antwort auf einem {0}. Wer am nächsten dran ist, bekommt {1}, ab drei Spielern der Zweite {2}.': 'Then all guesses and the right answer appear on a {0}. Whoever is closest gets {1}, with three or more players the second gets {2}.',
    'Triffst du genau (bei Jahren das richtige Jahr, sonst bis # % daneben), gibt es {0}. Nach allen Fragen gewinnt, wer die meisten Punkte hat.': 'If you hit it exactly (the right year for years, else within # %), you get {0}. After all questions whoever has the most points wins.',
    'Spielt ihr an einem Gerät, tippt jeder nacheinander für sich, die anderen schauen weg. Aufgelöst wird für alle gemeinsam.': 'If you play on one device, everyone types in turn while the others look away. The reveal is for everyone together.',
    'Frage # / #': 'Question # / #', 'Frage # von #': 'Question # of #', 'Deine Schätzung': 'Your guess', 'Bitte nur eine Zahl': 'Numbers only, please', 'Tipp zuerst eine Zahl ein': 'Type a number first',
    'Abgegeben. Warte auf die anderen …': 'Submitted. Waiting for the others …', 'keine Antwort': 'no answer', '{0} hat geschätzt': '{0} has guessed', 'noch #': '# left',
    'Frage # von #. Du hast # Sekunden.': 'Question # of #. You have # seconds.'
  });
  {
    const SUIT = { Pik: 'Spades', Herz: 'Hearts', Karo: 'Diamonds', Kreuz: 'Clubs' }, RANK = { Ass: 'Ace', König: 'King', Dame: 'Queen', Bube: 'Jack' };
    const card = (s, r) => (RANK[r] || r) + ' of ' + SUIT[s].toLowerCase();
    V.i18n.pat([
      [/^(Pik|Herz|Karo|Kreuz) (Ass|König|Dame|Bube|\d+)(, (Zwanziger|Vierziger)!)?$/, (m, s, r, x, w) => card(s, r) + (w ? (w === 'Zwanziger' ? ', twenty!' : ', forty!') : '')],
      [/^\{0\} tauscht den Atout-Buben gegen (Pik|Herz|Karo|Kreuz) (Ass|König|Dame|Bube|\d+)$/, (m, s, r) => '{0} swaps the trump jack for the ' + card(s, r).replace(/^\w/, c => c.toLowerCase())],
      [/^\{0\} sagt (Zwanziger|Vierziger) an \((.)\)(, zählt nach dem ersten Stich)?$/, (m, w, s, late) => '{0} calls ' + (w === 'Zwanziger' ? 'twenty' : 'forty') + ' (' + s + ')' + (late ? ', counts after the first trick' : '')],
      [/^Atout (.)$/, 'Trump $1'],
      [/^(.+) gewinnt die Runde$/, (m, n) => who(n) + ' wins the round'],
      [/^(.+) hat zugedreht und keine (\d+) geschafft$/, (m, n, x) => who(n) + ' closed and missed ' + x]
    ]);
  }

  // ---------- words that differ by game ----------
  A({ 'Remis': 'Draw', 'Ziehen': 'Moving' });
  V.i18n.ctx('[data-g=go], [data-g=reversi]', { 'Passen': 'Pass', 'Gepasst': 'Passed' });
  V.i18n.ctx('[data-g=maumau]', { 'Ziehen': 'Draw', 'Passt': 'Fits' });
  V.i18n.ctx('[data-g=checkers]', { 'Dame': 'King', 'Dame!': 'King!' });
  V.i18n.ctx('[data-g=mill]', { 'Ziehen': 'Moving', 'Setzen': 'Placing', 'Springen': 'Flying' });
  V.i18n.pat([[/^(.+) gewinnt$/, (m, n) => who(n) + ' wins'], [/^(.+) gewinnt (\d+)$/, (m, n, x) => who(n) + ' wins ' + x]]);

  A({ 'Language · Deutsch oder Englisch': 'Sprache · German or English' });
  V.i18n.ctx('[data-k=haptic]', { 'Leicht': 'Light' });
  // ---------- app feel: carousel, quick buttons, game sheet, turn banner, pass screen, online search ----------
  A({
    'Beliebt online': 'Popular online', 'Gegen echte Gegner': 'Against real opponents', 'Bis zu vier': 'Up to four', 'Ein Handy, vier Spieler': 'One phone, four players',
    'Jeder auf seiner Hälfte': 'Each on their own half', 'App': 'App', 'Woche ##': 'Week ##', 'Serie #': 'Streak #',
    'Kostenloses Konto: # Spiele mehr': 'Free account: # more games', 'Dazu Online-Partien, Freunde und die Rangliste': 'Plus online matches, friends and the ranking',
    '#–# Spieler': '#–# players', '# Spieler': '# players', 'Ohne KI': 'No AI', 'KI · # Stufen': 'AI · # levels', 'KI': 'AI', 'KI-Stärke': 'AI strength', 'Wer fängt an?': 'Who starts?',
    'Nur zu zweit': 'Two players only', 'Nicht online spielbar': 'Not playable online', 'Online kommt gleich': 'Online is coming soon',
    'Gib das Gerät an': 'Hand the device to', 'Tippen zum Weiter': 'Tap to continue',
    'Live spielen': 'Play live', 'Ein Tipp, ein Gegner': 'One tap, one opponent', 'Suchen': 'Search', 'Als Gast suchen': 'Search as guest',
    'Welches Spiel? Bei „Egal“ nimmt Versus das, wofür gerade jemand wartet.': 'Which game? With “Any”, Versus picks whatever someone is waiting for.',
    'Gegner gefunden': 'Opponent found', 'Noch niemand da': 'Nobody here yet', '# s': '# s',
    'noch # Tage # Std': '# days # h left', 'noch # Tag # Std': '# day # h left', 'noch # Std': '# h left', 'noch # Min': '# min left',
    '# Sieg · # %': '# win · # %', '# Siege · # %': '# wins · # %',
    'Jetzt: Schlachtschiff (# Felder)': 'Now: Battleship (# cells)', 'Leeren': 'Clear'
  });
  // ---------- quick start, undo, coin toss, guided first move, colour-blind mode, links, matches over days, push ----------
  A({
    'Überrasch mich': 'Surprise me', 'Wie wär’s mit {0}?': 'How about {0}?',
    'Zug zurück': 'Take back', 'Zurücknehmen ging hier nicht': 'Could not take that back',
    'Du beginnst': 'You start', 'Die KI beginnt': 'The AI starts', 'DU': 'YOU', 'Hier tippen': 'Tap here',
    'Sitzt ihr euch gegenüber?': 'Sitting opposite each other?',
    'Dann stehen Name und Hinweise für Spieler 2 auf dem Kopf, und Bretter mit oben und unten drehen sich zum, der dran ist.': 'Then name and hints for player 2 are upside down, and boards with a top and bottom turn to whoever is on the move.',
    'Ja, umdrehen': 'Yes, turn it', 'Nein, nebeneinander': 'No, side by side', 'Später unter Optionen → Gegenüber sitzen.': 'Later under Settings → Sitting opposite.',
    'Tipp für die Revanche': 'Tip for the rematch',
    '7: Der Nächste zieht zwei, außer er legt selbst eine 7': '7: the next player draws two, unless they play a 7 too',
    '8: Der Nächste setzt aus': '8: the next player skips a turn', 'Bube passt immer und wünscht eine Farbe': 'A jack always fits and calls a suit',
    'Farbenblind-Modus': 'Colour-blind mode', 'Muster auf den Steinen, Nummern auf den Figuren': 'Patterns on the pieces, numbers on the pawns',
    'Spiel mit mir': 'Play with me', 'Du kannst den Link in Ruhe verschicken, er gilt 15 Minuten.': 'Take your time sending the link, it stays valid for 15 minutes.', '{0} ist beigetreten': '{0} joined', 'Link teilen': 'Share link', 'Kopieren': 'Copy', 'Warte, bis jemand beitritt …': 'Waiting for someone to join …',
    '{0} · schick den Link oder lass den Code scannen. Wer ihn öffnet, spielt sofort gegen dich, auch ohne Freundschaft und ohne Konto (bei den Gast-Spielen).': '{0} · send the link or let them scan the code. Whoever opens it plays you right away, no friendship needed and, for the guest games, no account.',
    'Per Link einladen': 'Invite with a link', 'Freund per Link einladen': 'Invite a friend with a link', 'Der Link ist abgelaufen': 'The link has expired',
    'Dieser Spiel-Link gilt nicht mehr': 'This game link is no longer valid', '{0} lädt dich ein': '{0} invites you',
    'Spiel-Links kommen nach dem nächsten Server-Update.': 'Game links arrive with the next server update.',
    'Wann spielt ihr?': 'When do you play?', 'Jetzt': 'Now', 'Über Tage': 'Over days', 'Partie über Tage': 'Match over days',
    'Jeder zieht, wann er Zeit hat. Du bekommst Bescheid, wenn du dran bist.': 'Everyone moves when they have time. You get a note when it is your turn.',
    'Einladung an {0} verschickt': 'Invitation sent to {0}', 'Partien über Tage kommen nach dem nächsten Server-Update.': 'Matches over days arrive with the next server update.',
    'Über Tage gegen {0}': 'Over days vs. {0}', 'Ziehen': 'Move', 'Ansehen': 'View', '# dran': '# your turn', 'Wartet auf {0}': 'Waiting for {0}', '# Züge': '# moves',
    'Benachrichtigungen': 'Notifications', 'Benachrichtigungen an': 'Notifications on',
    'Herausforderungen, Freundschaftsanfragen und wenn du in einer Partie über Tage dran bist': 'Challenges, friend requests and when it is your turn in a match over days',
    'Im Browser blockiert. Erlaube Benachrichtigungen in den Website-Einstellungen.': 'Blocked in the browser. Allow notifications in the site settings.',
    'Auf dem iPhone erst, wenn Versus als App installiert ist': 'On the iPhone only once Versus is installed as an app',
    'Auf dem iPhone geht das erst, wenn Versus als App installiert ist.': 'On the iPhone this only works once Versus is installed as an app.',
    'Dieser Browser kann keine Benachrichtigungen': 'This browser cannot show notifications', 'Dieser Browser kann keine Benachrichtigungen.': 'This browser cannot show notifications.',
    'Benachrichtigungen sind im Browser blockiert': 'Notifications are blocked in the browser', 'Benachrichtigungen kommen nach dem nächsten Server-Update.': 'Notifications arrive with the next server update.'
  });
  V.i18n.pat([[/^Wie wär’s mit (.+)\?$/, (m, n) => 'How about ' + t(n) + '?'], [/^Einladung an (.+) verschickt$/, (m, n) => 'Invitation sent to ' + n], [/^Über Tage gegen (.+)$/, (m, n) => 'Over days vs. ' + n], [/^Wartet auf (.+)$/, (m, n) => 'Waiting for ' + n], [/^(.+) lädt dich ein$/, (m, n) => n + ' invites you']]);
  V.i18n.pat([[/^(.+) ist dran$/, (m, n) => t(n) + ' to move'], [/^spielt (.+)$/, (m, n) => 'playing ' + t(n)]]);
  // last resort for "A · B · C" lines (colour · level, game · level …): every part on its own
  V.i18n.pat([[/^(?=.* · ).+$/, m => m.split(' · ').map(p => t(p)).join(' · ')]]);
  V.i18n.start();
})();
