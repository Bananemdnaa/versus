(function () {
  // Alphabet-Spiel for 2-4 people (no AI): one category, and in turns everybody names a word with the next letter,
  // A, B, C … against the clock. No word in time, a word that was already said or one the others don't accept costs
  // a life. Words from the built-in lists count at once; anything else goes to a quick vote of the others.
  // After Z it starts again at A with less time (three laps at most). Last one with lives left wins.
  // Uses ctx.listen/ctx.submit: { w, k } the word of turn k ('' = none), { v: 1|0, k } a vote,
  // { late: 1, k } / { x: 1, k } the host ends a turn or a vote that hangs (someone went away).
  const LAPS = 3, VOTE_MS = 15000;
  const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z]/g, '');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CATS = {
    tiere: ['Tiere', 'Aal,Adler,Affe,Alpaka,Ameise,Amsel,Antilope,Ara,Assel,Axolotl,Alligator,Albatros,Anakonda,Auerhahn,Bär,Biber,Biene,Bison,Blauwal,Bussard,Büffel,Barsch,Bonobo,Buntspecht,Chamäleon,Chinchilla,Chihuahua,Collie,Cobra,Clownfisch,Capybara,Dachs,Delfin,Dingo,Dromedar,Drossel,Dohle,Dackel,Dorsch,Dodo,Eber,Echse,Eichhörnchen,Eisbär,Elch,Elefant,Ente,Esel,Eule,Erdmännchen,Emu,Eidechse,Elster,Falke,Fasan,Faultier,Fledermaus,Fliege,Floh,Flamingo,Forelle,Frosch,Fuchs,Flusspferd,Gans,Gazelle,Gecko,Geier,Gepard,Giraffe,Gorilla,Grille,Grizzly,Goldfisch,Gnu,Gämse,Gürteltier,Gibbon,Hai,Hamster,Hase,Hecht,Hering,Hirsch,Huhn,Hummel,Hummer,Hund,Hyäne,Hornisse,Hahn,Igel,Iltis,Impala,Ibis,Jaguar,Junikäfer,Kamel,Känguru,Kakadu,Kaninchen,Karpfen,Kater,Katze,Kobra,Koala,Kojote,Krake,Krokodil,Kuh,Kranich,Krabbe,Kolibri,Käfer,Kiwi,Lachs,Lama,Leopard,Libelle,Löwe,Luchs,Lemming,Lerche,Laus,Lemur,Marder,Maulwurf,Maus,Meerschweinchen,Möwe,Mücke,Murmeltier,Marienkäfer,Maultier,Makrele,Meise,Mandrill,Nashorn,Nachtigall,Nerz,Natter,Nilpferd,Nandu,Narwal,Ochse,Okapi,Orca,Orang-Utan,Otter,Oktopus,Ozelot,Opossum,Panda,Papagei,Pavian,Pelikan,Pferd,Pinguin,Puma,Pute,Pony,Pfau,Piranha,Python,Qualle,Quokka,Rabe,Ratte,Reh,Rentier,Robbe,Rind,Rochen,Rotkehlchen,Raupe,Regenwurm,Schaf,Schakal,Schildkröte,Schlange,Schmetterling,Schnecke,Schwan,Schwein,Seehund,Skorpion,Spatz,Specht,Spinne,Stier,Storch,Strauß,Seepferdchen,Seestern,Salamander,Sardine,Tapir,Taube,Tiger,Thunfisch,Truthahn,Tukan,Tintenfisch,Termite,Uhu,Unke,Vielfraß,Viper,Wal,Walross,Waschbär,Wespe,Wiesel,Wildschwein,Wolf,Wombat,Wurm,Wachtel,Wellensittich,Warzenschwein,Xerus,Yak,Zebra,Ziege,Zander,Zebu,Zecke,Zeisig,Zitteraal'],
    essen: ['Essen & Trinken', 'Ananas,Apfel,Aprikose,Avocado,Aubergine,Auflauf,Apfelsaft,Artischocke,Banane,Birne,Brot,Brezel,Brokkoli,Burger,Butter,Bohnen,Blumenkohl,Brownie,Baguette,Cola,Croissant,Currywurst,Cornflakes,Chili,Cappuccino,Ciabatta,Couscous,Cheeseburger,Cashew,Dattel,Döner,Donut,Dinkel,Ei,Eis,Erdbeere,Erbsen,Espresso,Eistee,Essiggurke,Erdnuss,Feige,Fisch,Fanta,Frikadelle,Falafel,Fondue,Fleisch,Fischstäbchen,Gurke,Granatapfel,Grapefruit,Gnocchi,Gulasch,Gyros,Gummibärchen,Grießbrei,Honig,Himbeere,Hähnchen,Hamburger,Haferflocken,Heidelbeere,Hotdog,Hummus,Hefezopf,Ingwer,Joghurt,Johannisbeere,Kaffee,Kakao,Kartoffel,Käse,Keks,Kirsche,Kiwi,Knödel,Kuchen,Kürbis,Kohl,Karotte,Kebab,Ketchup,Kaugummi,Lasagne,Limonade,Linsen,Lauch,Lakritz,Lebkuchen,Leberkäse,Mango,Mais,Melone,Milch,Möhre,Muffin,Müsli,Marmelade,Mandel,Maultaschen,Mozzarella,Nudeln,Nutella,Nektarine,Nuss,Nachos,Obst,Olive,Orange,Omelett,Orangensaft,Paprika,Pfirsich,Pflaume,Pizza,Pommes,Pudding,Popcorn,Pfannkuchen,Pilze,Pesto,Quark,Quiche,Quitte,Radieschen,Reis,Rosinen,Rotkohl,Rührei,Ravioli,Rhabarber,Salat,Sahne,Salami,Schnitzel,Schokolade,Spaghetti,Spinat,Suppe,Sushi,Semmel,Senf,Tomate,Toast,Tee,Tiramisu,Tortellini,Torte,Thunfisch,Tofu,Taco,Vanilleeis,Vollkornbrot,Waffel,Wassermelone,Wurst,Weintraube,Walnuss,Wasser,Wrap,Yufka,Zitrone,Zwiebel,Zucchini,Zucker,Zimtschnecke,Zwieback'],
    laender: ['Länder', 'Afghanistan,Ägypten,Albanien,Algerien,Andorra,Angola,Argentinien,Armenien,Aserbaidschan,Äthiopien,Australien,Bahamas,Bahrain,Bangladesch,Barbados,Belarus,Belgien,Belize,Benin,Bhutan,Bolivien,Bosnien,Botswana,Brasilien,Brunei,Bulgarien,Burkina Faso,Burundi,Chile,China,Costa Rica,Dänemark,Deutschland,Dominica,Dschibuti,Ecuador,Elfenbeinküste,El Salvador,England,Eritrea,Estland,Eswatini,Fidschi,Finnland,Frankreich,Gabun,Gambia,Georgien,Ghana,Grenada,Griechenland,Grönland,Großbritannien,Guatemala,Guinea,Guyana,Haiti,Honduras,Holland,Indien,Indonesien,Irak,Iran,Irland,Island,Israel,Italien,Jamaika,Japan,Jemen,Jordanien,Kambodscha,Kamerun,Kanada,Kasachstan,Katar,Kenia,Kirgisistan,Kiribati,Kolumbien,Komoren,Kongo,Kosovo,Kroatien,Kuba,Kuwait,Laos,Lesotho,Lettland,Libanon,Liberia,Libyen,Liechtenstein,Litauen,Luxemburg,Madagaskar,Malawi,Malaysia,Malediven,Mali,Malta,Marokko,Mauretanien,Mauritius,Mexiko,Moldau,Monaco,Mongolei,Montenegro,Mosambik,Myanmar,Namibia,Nauru,Nepal,Neuseeland,Nicaragua,Niederlande,Niger,Nigeria,Nordkorea,Nordmazedonien,Norwegen,Oman,Österreich,Pakistan,Palau,Panama,Paraguay,Peru,Philippinen,Polen,Portugal,Ruanda,Rumänien,Russland,Sambia,Samoa,Saudi-Arabien,Schottland,Schweden,Schweiz,Senegal,Serbien,Seychellen,Simbabwe,Singapur,Slowakei,Slowenien,Somalia,Spanien,Sri Lanka,Sudan,Südafrika,Südkorea,Suriname,Syrien,Tadschikistan,Taiwan,Tansania,Thailand,Togo,Tonga,Trinidad,Tschad,Tschechien,Tunesien,Türkei,Turkmenistan,Tuvalu,Uganda,Ukraine,Ungarn,Uruguay,Usbekistan,USA,Vanuatu,Vatikan,Venezuela,Vietnam,Wales,Weißrussland,Zentralafrika,Zypern'],
    staedte: ['Städte', 'Aachen,Amsterdam,Athen,Augsburg,Ankara,Antwerpen,Atlanta,Abu Dhabi,Berlin,Bremen,Bonn,Bochum,Bielefeld,Braunschweig,Barcelona,Basel,Bern,Brüssel,Budapest,Bukarest,Bangkok,Boston,Bordeaux,Bologna,Belgrad,Bratislava,Buenos Aires,Chemnitz,Cottbus,Chicago,Cannes,Casablanca,Celle,Coburg,Cuxhaven,Dresden,Dortmund,Düsseldorf,Duisburg,Darmstadt,Dublin,Dubai,Delhi,Danzig,Detroit,Dallas,Essen,Erfurt,Erlangen,Edinburgh,Eindhoven,Emden,Frankfurt,Freiburg,Florenz,Fulda,Fürth,Flensburg,Graz,Genf,Gelsenkirchen,Göttingen,Glasgow,Genua,Gießen,Gera,Hamburg,Hannover,Heidelberg,Hongkong,Helsinki,Havanna,Halle,Hamm,Hildesheim,Houston,Innsbruck,Istanbul,Ingolstadt,Jena,Jerusalem,Jakarta,Johannesburg,Köln,Kiel,Kassel,Karlsruhe,Koblenz,Kairo,Kopenhagen,Krakau,Konstanz,Kapstadt,Kyoto,Leipzig,Linz,London,Lissabon,Lübeck,Lyon,Los Angeles,Luzern,Lima,Lagos,München,Mainz,Mannheim,Magdeburg,Madrid,Mailand,Marseille,Moskau,Mumbai,Miami,Münster,Melbourne,Nürnberg,Neapel,Nizza,New York,Neuss,Nairobi,Oslo,Osnabrück,Oldenburg,Oberhausen,Oxford,Ottawa,Offenbach,Paris,Potsdam,Prag,Passau,Peking,Porto,Palermo,Pisa,Quedlinburg,Quebec,Quito,Rom,Rostock,Regensburg,Rio de Janeiro,Rotterdam,Riga,Salzburg,Stuttgart,Saarbrücken,Schwerin,Sydney,Seoul,Sevilla,Stockholm,Siegen,Solingen,Shanghai,Tokio,Trier,Toronto,Tübingen,Turin,Tallinn,Tunis,Ulm,Utrecht,Venedig,Valencia,Vancouver,Verona,Vilnius,Wien,Wiesbaden,Warschau,Wolfsburg,Würzburg,Washington,Wuppertal,Weimar,Xanten,York,Yokohama,Zürich,Zagreb,Zwickau'],
    namen: ['Vornamen', 'Anna,Alex,Alexander,Ali,Amelie,Anton,Arne,Aylin,Adam,Alina,Ben,Bastian,Benedikt,Bianca,Bruno,Berat,Carla,Carl,Clara,Chiara,Charlotte,Christian,Can,David,Daniel,Dana,Dominik,Denise,Derya,Elias,Emma,Emil,Eva,Erik,Elif,Ella,Finn,Felix,Fabian,Frida,Franziska,Fatma,Greta,Gustav,Gabriel,Gina,Georg,Hannah,Hanna,Henry,Hugo,Helena,Hamza,Ida,Ivan,Isabel,Ilias,Ines,Jonas,Julia,Jan,Jana,Jakob,Johanna,Joel,Kim,Kai,Karl,Katharina,Kevin,Kerem,Lena,Leon,Luca,Lea,Lukas,Lina,Linus,Mia,Max,Marie,Moritz,Maja,Mohammed,Noah,Nina,Nele,Niklas,Nora,Nils,Oskar,Ole,Olivia,Oliver,Paul,Paula,Pia,Philipp,Peter,Quentin,Rosa,Ronja,Robin,Rafael,Ruben,Sophie,Sofia,Simon,Sarah,Samuel,Selin,Tim,Tom,Tara,Theo,Tobias,Ulla,Ulrich,Valentin,Vera,Viktoria,Vincent,Willi,Wilma,Yara,Yusuf,Yannik,Zoe,Zara,Zeynep'],
    berufe: ['Berufe', 'Anwalt,Arzt,Apotheker,Architekt,Astronaut,Automechaniker,Bäcker,Bauer,Busfahrer,Bankkaufmann,Bauarbeiter,Bürgermeister,Bibliothekar,Bodyguard,Chemiker,Chef,Coach,Chirurg,Clown,Designer,Dachdecker,Detektiv,Dolmetscher,Dirigent,DJ,Elektriker,Erzieher,Entwickler,Erfinder,Fahrlehrer,Feuerwehrmann,Fischer,Fleischer,Florist,Friseur,Fotograf,Förster,Fußballer,Gärtner,Glaser,Goldschmied,Grafiker,Hausmeister,Hebamme,Hufschmied,Informatiker,Ingenieur,Imker,Influencer,Journalist,Jurist,Jäger,Juwelier,Kellner,Koch,Kassierer,Kapitän,Klempner,Krankenpfleger,Künstler,Kosmetiker,Lehrer,Lokführer,Landwirt,Lackierer,Maler,Maurer,Mechaniker,Metzger,Musiker,Model,Moderator,Notar,Nachrichtensprecher,Optiker,Pilot,Polizist,Postbote,Programmierer,Psychologe,Physiker,Pfarrer,Richter,Rettungssanitäter,Reporter,Rapper,Sänger,Schauspieler,Schneider,Schreiner,Schornsteinfeger,Sekretär,Soldat,Steuerberater,Stewardess,Schiedsrichter,Tänzer,Taxifahrer,Tierarzt,Tischler,Trainer,Tätowierer,Uhrmacher,Unternehmer,Übersetzer,Verkäufer,Vermesser,Winzer,Wissenschaftler,Webdesigner,YouTuber,Zahnarzt,Zimmermann,Zauberer,Zöllner,Zugbegleiter'],
    marken: ['Marken', 'Adidas,Apple,Audi,Aldi,Amazon,Asics,Airbus,Allianz,Barbie,Bosch,BMW,Burberry,Bahlsen,Bugatti,Chanel,Coca-Cola,Canon,Converse,Chevrolet,Citroen,Dior,Disney,Dell,DHL,Douglas,Dacia,Ebay,Edeka,Ferrari,Fanta,Fiat,Ford,Facebook,Fila,Gucci,Google,Garnier,Gillette,Haribo,Honda,Hyundai,Hugo Boss,Hollister,Ikea,Intel,Instagram,Jaguar,Jeep,Kia,Kinder,Knorr,Lego,Lidl,Lamborghini,Lacoste,Levis,Lindt,Mercedes,Microsoft,Milka,McDonalds,Mazda,Mini,Monster,Nike,Nintendo,Nivea,Nokia,Netflix,Nutella,Nestle,Opel,Oreo,Puma,Porsche,Pepsi,Playstation,Prada,Pringles,Peugeot,Primark,Rewe,Red Bull,Rolex,Renault,Ritter Sport,Ralph Lauren,Samsung,Sony,Spotify,Skoda,Seat,Snapchat,Supreme,Shell,Siemens,Tesla,Toyota,TikTok,Tommy Hilfiger,Twix,Uber,Under Armour,Volkswagen,Vans,Volvo,Vodafone,Visa,Versace,Whatsapp,Wilkinson,Xbox,Xiaomi,Yamaha,YouTube,Zara,Zalando,Zoom,Zewa']
  };
  const CAT_IDS = Object.keys(CATS);
  const LISTS = {};
  CAT_IDS.forEach(c => { LISTS[c] = CATS[c][1].split(','); CATS[c].set = new Set(LISTS[c].map(norm)); });
  // in the list: also plurals (Affen, Bären) and female forms of jobs (Lehrerin)
  function known(cat, w) {
    const set = CATS[cat].set, n = norm(w);
    if (set.has(n)) return true;
    for (const end of ['innen', 'in', 'en', 'n', 'e', 's', 'er']) if (n.endsWith(end) && set.has(n.slice(0, -end.length))) return true;
    return false;
  }
  const startsWith = (w, l) => norm(w)[0] === l.toLowerCase();

  V.css(`
  .ab{width:min(var(--bw),560px);display:flex;flex-direction:column;gap:12px;align-items:stretch}
  .ab-head{display:flex;justify-content:space-between;align-items:center;gap:10px}
  .ab-cat{font:800 italic 20px/1.1 var(--f-d);text-transform:uppercase;letter-spacing:.02em}
  .ab-cat small{display:block;color:var(--muted);font:700 italic 11px/1 var(--f-d);letter-spacing:.14em}
  .ab-lap{color:var(--muted);font-size:12px;text-align:right}
  .ab-strip{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:2px 0;scroll-behavior:smooth}
  .ab-strip::-webkit-scrollbar{display:none}
  .ab-strip span{flex:none;width:28px;height:32px;border-radius:7px;display:grid;place-items:center;background:var(--panel);border:1px solid var(--line);font:800 italic 15px/1 var(--f-d);color:var(--dim);position:relative}
  .ab-strip span.done{color:var(--fg)} .ab-strip span.miss{color:var(--bad);text-decoration:line-through}
  .ab-strip span.done::after{content:'';position:absolute;left:50%;bottom:3px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--pc,var(--good))}
  .ab-strip span.cur{background:linear-gradient(135deg,var(--pink),var(--yellow));color:var(--ink);border-color:transparent}
  .ab-main{display:flex;align-items:center;gap:16px}
  .ab-letter{flex:none;width:clamp(84px,24vw,110px);aspect-ratio:1;display:grid;place-items:center;border-radius:20px;background:linear-gradient(135deg,var(--pink),var(--yellow));color:var(--ink);font:800 italic clamp(54px,15vw,74px)/1 var(--f-d);box-shadow:4px 4px 0 var(--cyan)}
  .ab-letter.pop{animation:slfspin .7s var(--ease)}
  .ab-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
  .ab-who{font:800 italic 18px/1.15 var(--f-d)}
  .ab-bar{height:10px;border-radius:5px;background:var(--panel3);overflow:hidden}
  .ab-bar i{display:block;height:100%;background:var(--cyan);border-radius:5px;transform-origin:left;transition:transform .25s linear}
  .ab-bar.low i{background:var(--bad)}
  .ab-sec{font:800 italic 28px/1 var(--f-d);font-variant-numeric:tabular-nums}
  .ab-sec.low{color:var(--bad);animation:clkp 1s steps(2) infinite}
  .ab-in{display:flex;gap:8px}
  .ab-in .inp{flex:1;min-width:0;height:50px;font-size:18px}
  .ab-in .btn{height:50px;flex:none}
  .ab-box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center}
  .ab-box p{margin:0;color:var(--muted);font-size:14px}
  .ab-box .w{font:800 italic 26px/1.1 var(--f-d);color:var(--fg);word-break:break-word}
  .ab-vote{display:flex;gap:10px;width:100%}
  .ab-vote .btn{flex:1;height:48px}
  .ab-pl{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
  .ab-pl span{display:inline-flex;gap:6px;align-items:center;padding:6px 10px;border-radius:10px;background:var(--panel);border:1px solid var(--line);font-size:13px;font-weight:700}
  .ab-pl span.on{border-color:currentColor}
  .ab-pl span.out{opacity:.4;text-decoration:line-through}
  .ab-pl i{font-style:normal;color:var(--bad);letter-spacing:1px} .ab-pl i s{color:var(--dim);text-decoration:none}
  .ab-chain{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
  .ab-chain h4{width:100%;margin:0;text-align:center;font:700 italic 11px/1 var(--f-d);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .ab-chain span{padding:5px 9px;border-radius:9px;background:var(--panel);border:1px solid var(--line);font-size:13px}
  .ab-chain span b{font:800 italic 13px/1 var(--f-d);margin-right:5px}
  .ab-chain span.bad{text-decoration:line-through;color:var(--dim)}
  .ab-note{color:var(--muted);font-size:13px;text-align:center;margin:0;min-height:18px}
  @media (min-width:1280px){
    .ab{width:100%;max-width:900px;display:grid;grid-template-columns:minmax(0,1fr) 280px;grid-template-areas:'head side' 'strip side' 'main side' 'act side' 'note side';align-content:start;gap:14px 26px}
    .ab-head{grid-area:head} .ab-strip{grid-area:strip;flex-wrap:wrap;overflow:visible} .ab-main{grid-area:main} .ab-act{grid-area:act} .ab-note{grid-area:note}
    .ab-side{grid-area:side;display:flex;flex-direction:column;gap:14px}
    .ab-pl{flex-direction:column;align-items:stretch} .ab-pl span{justify-content:space-between;padding:9px 12px}
    .ab-chain{justify-content:flex-start;max-height:340px;overflow:auto} .ab-chain h4{text-align:left}
    .ab-strip span{width:30px;height:34px}
  }
  @media (max-width:1279px){ .ab-side{display:contents} .ab-pl{order:5} .ab-chain{order:6} }`);

  V.register({
    id: 'abc', name: 'Alphabet-Spiel', cat: 'Klassiker', order: 9, accent: '#3fd6ff', party: true, noAI: true, noFirst: true,
    short: 'A, B, C … wer findet kein Wort?',
    desc: 'Eine Kategorie, zum Beispiel Tiere. Reihum nennt jeder ein Wort mit dem nächsten Buchstaben: Affe, Bär, Chamäleon … Wer zu lange braucht oder ein Wort wiederholt, verliert ein Leben. Für 2 bis 4, am selben Gerät oder online.',
    sides: { 1: 'Pink', 2: 'Gelb', 3: 'Cyan', 4: 'Grün' },
    keys: [['Enter', 'Wort abschicken'], ['J', 'Zählt'], ['X', 'Zählt nicht']],
    options: [{ id: 'n', label: 'Mitspieler', group: 'players', inline: 'local', live: false, def: 3, choices: [[2, '2'], [3, '3'], [4, '4']] },
      { id: 'cat', label: 'Kategorie', group: 'rules', short: v => v === 'rnd' ? '' : CATS[v] ? CATS[v][0] : '', def: 'rnd', choices: [['rnd', 'Zufall'], ...CAT_IDS.map(c => [c, CATS[c][0]])] },
      { id: 'lives', label: 'Leben', group: 'rules', short: v => `${v} Leben`, def: 2, choices: [[1, '1'], [2, '2'], [3, '3']] },
      { id: 'abc', label: 'Buchstaben', group: 'rules', desc: 'Q, X und Y sind sehr schwer und werden sonst übersprungen.', short: v => +v ? 'alle 26' : '', def: 0, choices: [[0, 'Ohne Q X Y'], [1, 'Alle 26']] },
      { id: 'time', label: 'Zeit pro Wort', group: 'time', short: v => `${v} s`, def: 15, choices: [[10, '10 s'], [15, '15 s'], [25, '25 s']] }],
    localHint: 'Am selben Gerät gebt ihr das Handy reihum weiter. Wer dran ist, tippt sein Wort ein.',
    endDelay: 1300,
    icon: `<svg viewBox="0 0 48 48"><rect x="4" y="8" width="16" height="16" rx="4" fill="#1d2140" stroke="#3a3f66" stroke-width="1.5"/><text x="12" y="21" text-anchor="middle" font-size="12" font-weight="800" fill="#8a90b8" font-family="Arial">A</text><rect x="16" y="14" width="18" height="18" rx="4" fill="#1d2140" stroke="#3a3f66" stroke-width="1.5"/><text x="25" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="#c9cdf0" font-family="Arial">B</text><rect x="24" y="20" width="21" height="21" rx="5" fill="#3fd6ff"/><text x="34.5" y="36" text-anchor="middle" font-size="16" font-weight="800" fill="#08090f" font-family="Arial">C</text><path d="M8 38h12" stroke="#ff5d73" stroke-width="3" stroke-linecap="round"/><path d="M8 43h7" stroke="#ff5d73" stroke-width="3" stroke-linecap="round" opacity=".5"/></svg>`,
    tutorial: [
      { t: 'Das Ziel', d: 'Vor dem Spiel wird eine <b>Kategorie</b> gewählt, zum Beispiel <b>Tiere</b>. Reihum nennt jeder ein Wort aus dieser Kategorie, und zwar immer mit dem <b>nächsten Buchstaben</b> im Alphabet. Wer zuletzt noch Leben hat, gewinnt.' },
      { t: 'Ein Zug', d: 'Bist du dran, siehst du groß deinen Buchstaben. <b>Tippe ein Wort</b> ein, das damit anfängt, und dann <b>Los</b> (am PC Enter). Danach kommt der Nächste mit dem nächsten Buchstaben: A, B, C …', demo: '<div class="ab-chain"><span><b class="c1">A</b><span>Affe</span></span><span><b class="c2">B</b><span>Bär</span></span><span><b class="c3">C</b><span>Chamäleon</span></span><span><b class="c1">D</b>…</span></div>' },
      { t: 'Die Uhr läuft', d: 'Für jedes Wort hast du nur wenige Sekunden (im Spiel-Panel einstellbar). Ist die Zeit um, bevor du abschickst, <b>verlierst du ein Leben</b>. Der Buchstabe gilt dann als verpasst, und der Nächste macht mit dem folgenden weiter.' },
      { t: 'Was zählt?', d: 'Das Wort muss mit dem richtigen Buchstaben anfangen und darf in diesem Spiel <b>noch nicht genannt</b> worden sein. Kennt das Spiel das Wort aus seiner Liste, zählt es sofort. Sonst <b>stimmen die anderen ab</b>: Zählt das oder nicht? Ein abgelehntes Wort kostet ein Leben.' },
      { t: 'Runde zwei', d: 'Nach Z geht es wieder bei A los, aber mit <b>weniger Zeit</b>, und alle Wörter aus Runde eins sind schon weg. Q, X und Y werden normalerweise übersprungen. Nach drei Runden gewinnt, wer die meisten Leben übrig hat. Wer alle Leben verloren hat, ist raus.' },
      { t: 'Tipps', d: 'Überleg dir schon, während die anderen dran sind, ein Wort für <b>deinen nächsten Buchstaben</b>. Ein kurzes Wort ist schneller getippt als ein langes. Lieber ein sicheres Wort als ein lustiges, das abgelehnt wird.' }
    ],
    start(ctx) {
      const N = ctx.n, P = ctx.players, R = ctx.rng, local = ctx.mode === 'local';
      const o = ctx.opts;
      const cat = CATS[o.cat] ? o.cat : CAT_IDS[Math.floor(R() * CAT_IDS.length)];
      const LIVES = [1, 2, 3].includes(+o.lives) ? +o.lives : 2;
      const T0 = [10, 15, 25].includes(+o.time) ? +o.time : 15;
      const LETTERS = (+o.abc ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPRSTUVWZ').split('');
      const lives = {}; P.forEach(p => { lives[p] = LIVES; });
      const used = new Set(), chain = [], done = {};
      let k = 0, li = 0, lap = 1, cur = P[0], phase = '', deadline = 0, tick = null, sent = false, over = false;
      let pend = null, votes = {}, voted = false, lateT = 0, voteT = 0;
      const wrap = V.el('div', 'ab'); ctx.stage.appendChild(wrap);
      ctx.onCleanup(() => clearInterval(tick));
      const letter = () => LETTERS[li];
      const secs = () => Math.max(6, T0 - 3 * (lap - 1));
      const alive = () => P.filter(p => lives[p] > 0);
      const mine = () => local || cur === ctx.mySide;
      const people = () => P.filter(p => !ctx.isBot(p));
      const hearts = p => `<i>${'♥'.repeat(lives[p])}<s>${'♥'.repeat(LIVES - lives[p])}</s></i>`;

      // ---------- turns ----------
      function turnStart() {
        k++; phase = 'type'; sent = false; pend = null; votes = {}; voted = false;
        deadline = Date.now() + secs() * 1000;
        ctx.turn(cur, false);
        ctx.status(`Kategorie: <b>${CATS[cat][0]}</b> · ${ctx.who(cur)} braucht ein Wort mit <b>${letter()}</b>`);
        draw(true);
        clearInterval(tick); tick = setInterval(timer, 200); timer();
        const myK = k;
        // computer seats (someone left the table): the host answers for them, now and then without a word
        if (ctx.isBot(cur) && ctx.amHost()) {
          const s = cur;
          ctx.later(() => {
            if (k !== myK || phase !== 'type') return;
            const opts = LISTS[cat].filter(w => startsWith(w, letter()) && !used.has(norm(w)));
            ctx.submit({ w: opts.length && Math.random() < 0.85 ? V.pick(opts) : '', k: myK }, s);
          }, ctx.auto ? 0 : 1500 + Math.random() * 2500);
        }
        // the host ends a turn that hangs (the player went away without leaving)
        clearTimeout(lateT);
        if (!local && ctx.amHost()) lateT = ctx.later(() => { if (k === myK && phase === 'type') ctx.submit({ late: 1, k: myK }); }, secs() * 1000 + 6000);
      }
      function timer() {
        if (!ctx.alive() || phase !== 'type') return clearInterval(tick);
        const ms = Math.max(0, deadline - Date.now()), left = Math.ceil(ms / 1000), low = left <= 3;
        const b = wrap.querySelector('.ab-bar'), n = wrap.querySelector('.ab-sec');
        if (b) { b.classList.toggle('low', low); b.firstElementChild.style.transform = `scaleX(${ms / (secs() * 1000)})`; }
        if (n) { n.textContent = left; n.classList.toggle('low', low); }
        if (ms <= 0 && mine() && !sent && !ctx.isBot(cur)) send(true);
      }
      function send(timeUp) {
        if (sent || phase !== 'type' || !mine()) return;
        const x = wrap.querySelector('#abw'), w = x ? x.value.trim().slice(0, 30) : '';
        // what is typed still counts when the time runs out, if it starts right
        if (!timeUp && !w) { V.sfx.bad(); return x && x.focus(); }
        sent = true;
        V.sfx.place();
        ctx.submit({ w: timeUp && !startsWith(w, letter()) ? '' : w, k }, cur);
      }

      ctx.listen((s, m) => {
        if (over || !m || m.k !== k) return;
        if (phase === 'type' && ((s === cur && typeof m.w === 'string') || m.late)) {
          clearInterval(tick); clearTimeout(lateT);
          const w = m.late ? '' : String(m.w).trim().slice(0, 30);
          if (!w) return resolve(false, m.late ? 'zu lange weg' : 'Zeit um');
          if (!startsWith(w, letter())) return resolve(false, `fängt nicht mit ${letter()} an`, w);
          if (used.has(norm(w))) return resolve(false, 'schon genannt', w);
          if (known(cat, w)) return resolve(true, '', w);
          // unknown word: the others decide
          pend = w;
          const voters = local ? [1] : people().filter(p => p !== cur);
          if (!voters.length) return resolve(true, '', w);
          phase = 'vote'; votes = {}; voted = false;
          V.sfx.tick();
          ctx.status(`Kennt das Spiel nicht: Zählt <b translate="no">${esc(w)}</b> als <b>${CATS[cat][0]}</b>?`);
          draw();
          clearTimeout(voteT);
          if (!local && ctx.amHost()) { const myK = k; voteT = ctx.later(() => { if (k === myK && phase === 'vote') ctx.submit({ x: 1, k: myK }); }, VOTE_MS); }
          return;
        }
        if (phase === 'vote' && (m.v === 0 || m.v === 1 || m.x)) {
          if (m.v != null && (local || (s !== cur && !(s in votes)))) votes[local ? 1 : s] = m.v;
          const voters = local ? [1] : people().filter(p => p !== cur);
          if (!m.x && !voters.every(p => p in votes)) return draw();
          clearTimeout(voteT);
          const yes = Object.values(votes).filter(v => v === 1).length, no = Object.values(votes).filter(v => v === 0).length;
          return resolve(no <= yes, no > yes ? 'abgelehnt' : '', pend);
        }
      });

      function resolve(ok, why, w) {
        phase = 'show';
        const s = cur;
        chain.unshift({ s, l: letter(), w: w || '', ok });
        done[li] = ok ? s : -1;
        if (ok) {
          used.add(norm(w)); V.sfx.goal();
          ctx.status(`${ctx.who(s)}: <b translate="no">${esc(w)}</b> zählt`);
        } else {
          lives[s]--; V.sfx.bad();
          const outNow = lives[s] <= 0;
          ctx.status(`${ctx.who(s)}: ${w ? `<b translate="no">${esc(w)}</b> ` : ''}<span>${why}</span>, <span>${outNow ? 'keine Leben mehr' : 'ein Leben weniger'}</span>`);
          const pl = wrap.querySelector(`.ab-pl [data-p="${s}"]`); if (pl) V.fx.shake(pl, true);
        }
        draw();
        ctx.later(advance, ctx.fast() || ctx.auto ? 0 : 1300);
      }
      function advance() {
        if (over) return;
        const left = alive();
        if (left.length <= 1) return finish(left[0] || 0, left.length ? `${ctx.name(left[0])} ist übrig` : '');
        li++;
        if (li >= LETTERS.length) {
          li = 0; lap++;
          Object.keys(done).forEach(i => delete done[i]);
          if (lap > LAPS) return finishByLives();
          V.sfx.go();
        }
        // the next one who still has lives
        const i = P.indexOf(cur);
        for (let d = 1; d <= N; d++) { const p = P[(i + d) % N]; if (lives[p] > 0) { cur = p; break; } }
        turnStart();
      }
      function finishByLives() {
        const top = Math.max(...P.map(p => lives[p])), ws = P.filter(p => lives[p] === top);
        finish(ws.length > 1 ? 0 : ws[0], `Nach ${LAPS} Runden`);
      }
      function finish(w, note) {
        over = true; phase = 'end'; clearInterval(tick); clearTimeout(lateT); clearTimeout(voteT);
        draw();
        ctx.end(w, note);
      }

      // ---------- screen ----------
      function draw(fresh) {
        const m = mine() && !ctx.isBot(cur);
        const strip = LETTERS.map((l, i) => `<span class="${i === li && !over ? 'cur' : done[i] === -1 ? 'miss' : done[i] ? 'done' : ''}"${done[i] > 0 ? ` style="--pc:${V.hex(done[i])}"` : ''}>${l}</span>`).join('');
        const pct = Math.max(0, deadline - Date.now()) / (secs() * 1000);
        let act = '';
        if (phase === 'type') {
          act = m ? `<form class="ab-in" id="abf" autocomplete="off"><input class="inp" id="abw" maxlength="30" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="send" placeholder="${letter()} …"><button class="btn primary" type="submit"><span>Los</span></button></form>`
            : `<div class="ab-box"><p>${ctx.who(cur)} sucht ein Wort mit ${letter()} …</p></div>`;
        } else if (phase === 'vote') {
          const canVote = local || (!ctx.isBot(ctx.mySide) && ctx.mySide !== cur && !(ctx.mySide in votes));
          act = `<div class="ab-box"><p>${local ? 'Die anderen entscheiden' : `${ctx.who(cur)} sagt`}</p><div class="w" translate="no">${esc(pend)}</div><p>Zählt das als <b>${CATS[cat][0]}</b>?</p>
            ${canVote ? '<div class="ab-vote"><button class="btn primary" data-v="1"><span>Zählt</span></button><button class="btn" data-v="0"><span>Zählt nicht</span></button></div>' : `<p>${ctx.mySide === cur ? 'Die anderen stimmen ab …' : 'Warte auf die anderen …'}</p>`}</div>`;
        } else if (phase === 'end') {
          act = '';
        }
        const showLetter = phase === 'show' && chain[0] ? chain[0].l : letter();
        wrap.innerHTML = `<div class="ab-head"><div class="ab-cat"><small>Kategorie</small><span>${CATS[cat][0]}</span></div><div class="ab-lap"><span>Runde ${Math.min(lap, LAPS)} von ${LAPS}</span><br><span>${secs()} s pro Wort</span></div></div>
          <div class="ab-strip">${strip}</div>
          <div class="ab-main"><div class="ab-letter${fresh ? ' pop' : ''}">${over ? '★' : showLetter}</div><div class="ab-info"><div class="ab-who">${over ? 'Vorbei' : `${ctx.who(cur)} ${phase === 'vote' ? 'wartet' : 'ist dran'}`}</div>
            ${phase === 'type' ? `<div class="ab-bar"><i style="transform:scaleX(${pct})"></i></div><div class="ab-sec">${Math.ceil(pct * secs())}</div>` : ''}</div></div>
          <div class="ab-act">${act}</div>
          <div class="ab-side"><div class="ab-pl">${P.map(p => `<span class="c${p}${p === cur && !over ? ' on' : ''}${lives[p] <= 0 ? ' out' : ''}" data-p="${p}">${esc(ctx.name(p))} ${hearts(p)}</span>`).join('')}</div>
          ${chain.length ? `<div class="ab-chain nofit"><h4>Wörter</h4>${chain.slice(0, 30).map(c => `<span class="${c.ok ? '' : 'bad'}"><b class="c${c.s}">${c.l}</b><span translate="no">${c.w ? esc(c.w) : '–'}</span></span>`).join('')}</div>` : ''}</div>`;
        const st = wrap.querySelector('.ab-strip .cur'); if (st) st.scrollIntoView({ block: 'nearest', inline: 'center' });
        const f = wrap.querySelector('#abf');
        if (f) {
          f.onsubmit = e => { e.preventDefault(); send(false); };
          const x = f.querySelector('input'); setTimeout(() => { if (x && document.body.contains(x)) x.focus({ preventScroll: true }); }, 60);
        }
        wrap.querySelectorAll('[data-v]').forEach(b => b.onclick = () => vote(+b.dataset.v));
      }
      function vote(v) {
        if (phase !== 'vote' || voted) return;
        if (!local && (ctx.mySide === cur || ctx.mySide in votes)) return;
        voted = true; V.sfx.tick();
        ctx.submit({ v, k }, local ? P.find(p => p !== cur) : ctx.mySide);
      }
      ctx.keys(e => {
        if (e.target && e.target.tagName === 'INPUT') return false;
        if (phase !== 'vote') return false;
        const key = e.key.toLowerCase();
        if (key === 'j') { vote(1); return true; }
        if (key === 'x') { vote(0); return true; }
        return false;
      });
      turnStart();
    }
  });
})();