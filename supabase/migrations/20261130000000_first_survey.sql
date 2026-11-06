-- Versus: die erste Umfrage (Deutsch und Englisch getrennt), gleich live.
-- Braucht 20261129000000_flags_surveys.sql. Läuft sie zweimal, legt sie nichts doppelt an.
-- Ergebnis und Beenden: Admin-Panel, Tab "Umfragen".

insert into public.surveys (title, intro, lang, questions, status, created_by, started_at)
select 'Wie gefällt dir Versus?', 'Fünf kurze Fragen, alles freiwillig. Damit wissen wir, was wir als Nächstes besser machen.', 'de',
  '[
    {"q": "Wie gefällt dir Versus insgesamt?", "t": "scale"},
    {"q": "Was ist dein Lieblingsspiel bei Versus?", "t": "text"},
    {"q": "Wie spielst du am meisten?", "t": "many", "o": ["Gegen die KI", "Zu zweit am selben Gerät", "Online mit Freunden", "Online gegen andere Spieler"]},
    {"q": "Was sollen wir als Nächstes verbessern?", "t": "many", "o": ["Mehr Spiele", "Stärkere oder bessere KI", "Online-Modus", "Aussehen und Animationen", "Läuft flüssiger auf dem Handy", "Steuerung", "Anleitungen und Regeln"]},
    {"q": "Was würdest du verbessern, oder was fehlt dir?", "t": "text"}
  ]'::jsonb, 'live', 'team', now()
where not exists (select 1 from public.surveys where title = 'Wie gefällt dir Versus?');

insert into public.surveys (title, intro, lang, questions, status, created_by, started_at)
select 'How do you like Versus?', 'Five quick questions, all optional. They tell us what to improve next.', 'en',
  '[
    {"q": "How do you like Versus overall?", "t": "scale"},
    {"q": "What is your favourite game in Versus?", "t": "text"},
    {"q": "How do you play most?", "t": "many", "o": ["Against the AI", "Two players on one device", "Online with friends", "Online against other players"]},
    {"q": "What should we improve next?", "t": "many", "o": ["More games", "Stronger or better AI", "Online mode", "Looks and animations", "Runs smoother on phones", "Controls", "Tutorials and rules"]},
    {"q": "What would you improve, or what are you missing?", "t": "text"}
  ]'::jsonb, 'live', 'team', now()
where not exists (select 1 from public.surveys where title = 'How do you like Versus?');
