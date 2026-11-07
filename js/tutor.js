// Versus: practice tasks for the tutorials ("Probier's aus"). Every game gets one or two small tasks that are added to
// its tutorial (js/app.js tutorial()): tap the right field on a mini board, pick the right answer (cards, dice, tiles),
// find the pairs (Memory) or tap at green (Reaktionsduell). A wrong answer explains why; tasks can be skipped.
// Step: { after: index in g.tutorial after which it comes (default: at the end), t: title, q: question,
//   pick: { rows, map, o, ok: [cell indices or columns with col: true], col, all, put: { c, t } } |
//   choices: [{ h: html, ok, why }] | memo: [symbols] | react: true,
//   demo: html above the choices, yes: text when solved, no: text after a wrong try }
// Board cells count row by row from the top left: index = row * columns + column.
(function () {
  'use strict';
  const X = { c: 'x', t: 'X' }, PINK = { c: 'd1' }, HIT = { c: 'ht', t: '✕' };
  // chess pieces like js/games/chess.js
  const CH = {
    K: { c: 'pw', t: '♚︎' }, Q: { c: 'pw', t: '♛︎' }, R: { c: 'pw', t: '♜︎' }, B: { c: 'pw', t: '♝︎' }, N: { c: 'pw', t: '♞︎' }, P: { c: 'pw', t: '♟︎' },
    k: { c: 'pb', t: '♚︎' }, q: { c: 'pb', t: '♛︎' }, r: { c: 'pb', t: '♜︎' }, b: { c: 'pb', t: '♝︎' }, n: { c: 'pb', t: '♞︎' }, p: { c: 'pb', t: '♟︎' }
  };
  const BOARD8 = { checker: true, w: 240 };
  const card = c => V.card(c, 'tq-card');
  const cards = l => `<span class="tq-cards">${l.map(card).join('')}</span>`;
  const dice = s => `<span class="tq-dice">${[...s].map(n => `<i>${n}</i>`).join('')}</span>`;
  const tile = (a, b) => `<span class="tq-tile"><i>${a}</i><i>${b}</i></span>`;
  const txt = (h, ok, why) => ({ h, ok: !!ok, why });

  V.TUTOR = {
    c4: [
      { t: 'Probier’s: Gewinnen', q: 'Du bist Pink. In welche Spalte wirfst du, um sofort zu gewinnen?',
        pick: { rows: ['.......', '.......', '.......', '.......', '.b.b...', 'baaa.b.'], col: true, ok: [4], put: PINK },
        yes: 'Genau: vier Pinke unten in einer Reihe.', no: 'Schau dir die untere Reihe an: Wo fehlt dir nur noch ein Stein?' },
      { t: 'Probier’s: Blocken', q: 'Gelb hat drei übereinander. Wo musst du hin?',
        pick: { rows: ['.......', '.......', '.......', '..b....', '..b.a..', '..b.a..'], col: true, ok: [2], put: PINK },
        yes: 'Richtig, sonst hätte Gelb im nächsten Zug vier.', no: 'Wenn du nicht blockst, setzt Gelb oben auf die drei und gewinnt.' }
    ],
    ttt: [
      { t: 'Probier’s: Gewinnen', q: 'Du bist X und am Zug. Wo gewinnst du?',
        pick: { rows: ['xx.', 'oo.', '...'], ok: [2], put: X, o: { w: 170 } },
        yes: 'Drei X in der oberen Reihe!', no: 'Erst gewinnen, dann blocken: Wo fehlt dir ein X zu drei?' },
      { t: 'Probier’s: Blocken', q: 'X ist am Zug. O droht zu gewinnen. Wo blockst du?',
        pick: { rows: ['o.x', '.o.', 'x..'], ok: [8], put: X, o: { w: 170 } },
        yes: 'Genau, die Diagonale von O ist zu.', no: 'O hat oben links und in der Mitte. Wo wird daraus eine Reihe?' }
    ],
    gomoku: [
      { t: 'Probier’s: Fünf', q: 'Du bist Pink. Wo setzt du den fünften Stein?',
        pick: { rows: ['.........', '.........', '.........', '.baaaa...', '.........', '.........', '.........'], ok: [33], put: PINK, o: { w: 260 } },
        yes: 'Fünf in einer Reihe, gewonnen!', no: 'Links ist schon Gelb. Wo ist die Reihe noch offen?' },
      { t: 'Probier’s: Offener Dreier', q: 'Gelb hat einen offenen Dreier. Tippe ein Feld, mit dem du ihn blockst.',
        pick: { rows: ['.........', '.........', '.........', '...bbb...', '.........', '.........', '.........'], ok: [29, 33], put: PINK, o: { w: 260 } },
        yes: 'Gut: Jetzt kann Gelb höchstens noch einen Vierer bauen, den du an der anderen Seite blocken kannst.', no: 'Ein offener Dreier wird an einem seiner beiden Enden geblockt.' }
    ],
    reversi: [
      { t: 'Probier’s: Erlaubte Felder', q: 'Du bist Pink. Finde alle vier Felder, auf die du setzen darfst.',
        pick: { rows: ['......', '......', '..ab..', '..ba..', '......', '......'], ok: [9, 16, 19, 26], all: true, put: PINK, o: { w: 210 } },
        yes: 'Alle gefunden: Von jedem dieser Felder aus kesselst du einen gelben Stein ein.', no: 'Dort würdest du keinen gelben Stein zwischen zwei pinken einschließen.' },
      { t: 'Probier’s: Ecken', q: 'Warum ist eine Ecke so wertvoll?',
        choices: [txt('Ein Stein in der Ecke kann nie mehr umgedreht werden', 1), txt('In der Ecke drehst du immer die meisten Steine um', 0, 'Nicht unbedingt. Der Grund ist, dass niemand einen Eckstein einkesseln kann.'), txt('Ecken zählen am Ende doppelt', 0, 'Jeder Stein zählt gleich. Ecksteine sind aber für immer deine.')],
        yes: 'Genau. Und weil von dort ganze Ränder sicher werden.' }
    ],
    dots: [
      { t: 'Probier’s', q: 'Um ein Kästchen sind schon drei Linien. Was passiert, wenn du die vierte ziehst?',
        choices: [txt('Das Kästchen gehört dir und du ziehst sofort nochmal', 1), txt('Das Kästchen gehört dir, dann ist der Gegner dran', 0, 'Wer ein Kästchen schließt, ist gleich nochmal dran.'), txt('Der Gegner bekommt das Kästchen', 0, 'Wer die vierte Linie zieht, bekommt das Kästchen.')] },
      { t: 'Probier’s: Gefahr', q: 'Welche Linie solltest du möglichst nicht ziehen?',
        choices: [txt('Die dritte Linie um ein Kästchen', 1), txt('Eine Linie am Rand', 0, 'Am Rand ist nicht gefährlich. Gefährlich ist, was dem Gegner ein Kästchen schenkt.'), txt('Die erste Linie um ein Kästchen', 0, 'Die erste ist sicher. Nach der dritten schnappt sich der Gegner das Kästchen.')] }
    ],
    uttt: [
      { t: 'Probier’s: Wohin geschickt?', q: 'X setzt im mittleren Brett auf das Feld oben links. In welches kleine Brett muss O jetzt? Tippe es an.',
        pick: { rows: ['...', '...', '...'], ok: [0], put: { c: 'tg' }, o: { w: 150 } },
        yes: 'Genau: Das Feld im kleinen Brett bestimmt das Brett für den Gegner.', no: 'Nicht das Brett, in dem X gesetzt hat, sondern das Brett an der Stelle des Feldes.' },
      { t: 'Probier’s: Freie Wahl', q: 'O wird in ein Brett geschickt, das schon gewonnen ist. Was darf O?',
        choices: [txt('Auf jedes freie Feld irgendwo setzen', 1), txt('Muss aussetzen', 0, 'Niemand setzt aus. O bekommt sogar einen Vorteil.'), txt('Im mittleren Brett spielen', 0, 'O darf überall hin, nicht nur in die Mitte.')] }
    ],
    hardcore: [
      { t: 'Probier’s: Gewinnen', q: 'Wann gewinnst du das ganze Spiel?',
        choices: [txt('Mit drei gewonnenen Bereichen, egal wo', 1), txt('Mit drei Bereichen in einer Reihe', 0, 'Hier nicht: Drei Bereiche reichen, sie müssen nicht in einer Reihe liegen.'), txt('Erst mit allen neun Bereichen', 0, 'Drei Bereiche reichen schon.')] },
      { t: 'Probier’s: Der Sprung', q: 'Dein Zug gewinnt das kleine Brett unten links. Wo geht es weiter?',
        choices: [txt('Im Bereich unten links', 1), txt('Im selben Bereich, im Brett unten links', 0, 'Das wäre normales Ultimate. Gewinnt ein Zug ein Brett, springt das Spiel in den Bereich an dessen Stelle.'), txt('Der Gegner sucht sich einen Bereich aus', 0, 'Nur wenn der Bereich unten links schon entschieden ist.')] }
    ],
    ttt3: [
      { t: 'Probier’s: Reihe in der Ebene', q: 'Eine Ebene von oben: Wo vervollständigst du die Diagonale?',
        pick: { rows: ['x...', '.x..', '..x.', '....'], ok: [15], put: X, o: { w: 170 } },
        yes: 'Vier in einer Reihe auf der Diagonale.', no: 'Die drei X laufen schräg von oben links nach unten rechts.' },
      { t: 'Probier’s: Durch die Ebenen', q: 'Welche vier Felder sind auch eine Reihe?',
        choices: [txt('Dasselbe Feld in allen vier Ebenen', 1), txt('Die vier Ecken einer Ebene', 0, 'Die Ecken liegen nicht auf einer Linie.'), txt('Vier beliebige Felder in verschiedenen Ebenen', 0, 'Sie müssen auf einer geraden Linie liegen, zum Beispiel übereinander.')] }
    ],
    ships: [
      { t: 'Probier’s: Nachschießen', q: 'Zwei Treffer nebeneinander, oben und unten ist Wasser. Wohin schießt du als Nächstes?',
        pick: { rows: ['......', '..mm..', '..##..', '..mm..', '......', '......'], ok: [13, 16], put: HIT, o: { w: 210 } },
        yes: 'Das Schiff liegt waagerecht, also links oder rechts davon weiter.', no: 'Die Treffer liegen nebeneinander. In welche Richtung geht das Schiff weiter?' },
      { t: 'Probier’s: Versenkt', q: 'Warum ist um ein versenktes Schiff herum alles Wasser?',
        choices: [txt('Schiffe dürfen sich nicht berühren, auch nicht über Eck', 1), txt('Das ist Glück', 0, 'Das ist eine Regel: Schiffe berühren sich nie.'), txt('Der Gegner hat dort schon geschossen', 0, 'Versus markiert die Felder automatisch, weil dort kein Schiff sein kann.')] }
    ],
    checkers: [
      { t: 'Probier’s: Schlagzwang', q: 'Du bist Pink. Welchen Zug musst du machen? Tippe das Zielfeld.',
        pick: { rows: ['......', '......', '......', '..b...', '.a...a', '......'], ok: [15], put: PINK, o: { checker: true, w: 210 } },
        yes: 'Richtig: Du springst über den gelben Stein und schlägst ihn.', no: 'Kannst du schlagen, musst du schlagen. Wer kann hier über einen gelben Stein springen?' },
      { t: 'Probier’s: Dame', q: 'Wann wird ein Stein zur Dame?',
        choices: [txt('Wenn er die gegnerische Grundreihe erreicht', 1), txt('Nach drei Schlägen', 0, 'Schläge zählen nicht. Er muss ganz nach hinten.'), txt('Wenn er die Mitte erreicht', 0, 'Erst auf der letzten Reihe beim Gegner.')] }
    ],
    chess: [
      { t: 'Probier’s: Springer', q: 'Tippe alle Felder an, auf die der weiße Springer ziehen kann.',
        pick: { rows: ['........', '........', '........', '........', '...N....', '........', '........', '........'], map: CH, ok: [18, 20, 25, 29, 41, 45, 50, 52], all: true, put: { c: 'tg' }, o: BOARD8 },
        yes: 'Alle acht gefunden: immer zwei gerade und eins zur Seite.', no: 'Der Springer zieht im L: zwei Felder gerade, dann eins zur Seite.' },
      { t: 'Probier’s: Matt in eins', q: 'Weiß ist am Zug. Wohin zieht der Turm, um mattzusetzen?',
        pick: { rows: ['......k.', '.....ppp', '........', '........', '........', '........', '........', 'R.....K.'], map: CH, ok: [0], put: CH.R, o: BOARD8 },
        yes: 'Schachmatt: Der König kann nicht weg, die eigenen Bauern stehen im Weg.', no: 'Der schwarze König ist hinter seinen Bauern gefangen. Greif ihn auf seiner Reihe an.' }
    ],
    mill: [
      { t: 'Probier’s: Mühle', q: 'Du hast eine Mühle geschlossen. Welchen gegnerischen Stein darfst du normalerweise nicht nehmen?',
        choices: [txt('Einen, der selbst in einer Mühle steht', 1), txt('Den zuletzt gesetzten', 0, 'Den darfst du nehmen. Geschützt sind Steine in einer Mühle.'), txt('Einen in der Ecke', 0, 'Ecken sind nicht geschützt. Nur Steine in einer Mühle.')], yes: 'Genau, außer der Gegner hat nur noch Mühlen-Steine.' },
      { t: 'Probier’s: Springen', q: 'Wann darfst du mit deinen Steinen springen?',
        choices: [txt('Wenn ich nur noch drei Steine habe', 1), txt('Immer in der Zieh-Phase', 0, 'In der Zieh-Phase geht es nur entlang der Linien.'), txt('Nach jeder Mühle', 0, 'Nach einer Mühle nimmst du einen Stein weg, springen darfst du erst mit drei Steinen.')] }
    ],
    kalaha: [
      { t: 'Probier’s: Extrazug', q: 'Deine Mulden sind unten, dein Speicher rechts. Tippe eine Mulde, deren letzter Stein in deinem Speicher landet.',
        pick: { rows: ['0444444.', '.3514260'], map: { '0': { c: 'kst', t: '0' }, '.': { c: 'nb' } }, ok: [10, 13], o: { w: 260 } },
        yes: 'Genau: so viele Steine, wie Mulden bis zum Speicher. Das gibt einen Extrazug.', no: 'Zähl die Mulden bis zu deinem Speicher rechts: Passt die Zahl der Steine genau?' }
    ],
    go: [
      { t: 'Probier’s: Fangen', q: 'Der gelbe Stein hat nur noch eine Freiheit. Wo setzt du, um ihn zu fangen?',
        pick: { rows: ['.......', '.......', '...a...', '..ab...', '...a...', '.......', '.......'], ok: [25], put: PINK, o: { w: 210 } },
        yes: 'Gefangen: Er hat keine Freiheit mehr und verschwindet.', no: 'Freiheiten sind die leeren Punkte oben, unten, links und rechts. Welcher ist noch frei?' },
      { t: 'Probier’s: Freiheiten', q: 'Wie viele Freiheiten hat ein einzelner Stein mitten auf dem Brett?',
        choices: [txt('4', 1), txt('8', 0, 'Schräge Punkte zählen nicht, nur oben, unten, links und rechts.'), txt('2', 0, 'Mitten auf dem Brett sind alle vier Nachbarn frei.')] }
    ],
    hex: [
      { t: 'Probier’s', q: 'Wie viele Nachbarn hat ein Sechseck in der Mitte?',
        choices: [txt('6', 1), txt('4', 0, 'Ein Sechseck hat sechs Kanten, also sechs Nachbarn.'), txt('8', 0, 'Es sind sechs, eins pro Kante.')] },
      { t: 'Probier’s: Remis?', q: 'Das Brett ist voll. Kann es unentschieden sein?',
        choices: [txt('Nein, einer hat immer eine Verbindung', 1), txt('Ja, wenn keiner verbunden hat', 0, 'Bei Hex geht das nicht: Wer den anderen blockiert, verbindet automatisch selbst.')] }
    ],
    backgammon: [
      { t: 'Probier’s: Wohin?', q: 'Auf welche Zunge darfst du ziehen?',
        choices: [txt('Eine Zunge mit genau einem gegnerischen Stein', 1, ''), txt('Eine Zunge mit zwei gegnerischen Steinen', 0, 'Zwei oder mehr gegnerische Steine sind ein Block, da darfst du nicht hin.')], yes: 'Richtig, und du schlägst den Stein dabei auf die Bar.' },
      { t: 'Probier’s: Pasch', q: 'Du würfelst 4 und 4. Wie oft ziehst du?',
        demo: dice('44'), choices: [txt('Viermal je 4', 1), txt('Zweimal je 4', 0, 'Bei einem Pasch ziehst du doppelt so oft.'), txt('Einmal 8', 0, 'Bei einem Pasch ziehst du die Zahl viermal.')] }
    ],
    ludo: [
      { t: 'Probier’s: Raus', q: 'Keine deiner Figuren steht draußen. Was brauchst du?',
        choices: [txt('Eine 6', 1), txt('Irgendeine Zahl', 0, 'Aus der Ecke kommt man nur mit einer 6.'), txt('Eine 1', 0, 'Es muss eine 6 sein.')], yes: 'Genau, und dafür hast du drei Versuche.' },
      { t: 'Probier’s: Rauswerfen', q: 'Du landest genau auf einer fremden Figur. Was passiert?',
        choices: [txt('Sie muss zurück in ihre Ecke', 1), txt('Ihr steht beide dort', 0, 'Auf einem Feld steht nur eine Figur. Die fremde fliegt raus.'), txt('Du musst zurück', 0, 'Umgekehrt: Die Figur, auf der du landest, muss zurück.')] }
    ],
    ladder: [
      { t: 'Probier’s: Genau 100', q: 'Du stehst auf 97 und würfelst eine 5. Wo landest du?',
        demo: dice('5'), choices: [txt('98', 1), txt('100', 0, 'Es muss genau 100 sein. Zu viel läufst du wieder zurück.'), txt('97', 0, 'Du ziehst schon, nur prallst du an der 100 ab.')], yes: '97 + 3 = 100, die restlichen 2 geht es zurück: 98.' }
    ],
    yacht: [
      { t: 'Probier’s: Bestes Feld', q: 'Du hast diese Würfel. Welches Feld bringt am meisten?',
        demo: dice('22555'), choices: [txt('Full House: 25', 1), txt('Dreierpasch: 19', 0, 'Dreierpasch zählt nur die Augen, hier 19. Full House gibt immer 25.'), txt('Fünfer: 15', 0, 'Drei Fünfer bei den Fünfern sind 15. Full House bringt mehr.')] },
      { t: 'Probier’s: Straße', q: 'Was ist das hier?',
        demo: dice('13456'), choices: [txt('Kleine Straße: 30', 1), txt('Große Straße: 40', 0, 'Für die große Straße brauchst du fünf in Folge, hier fehlt die 2.'), txt('Gar nichts', 0, '3, 4, 5 und 6 sind vier in Folge, also eine kleine Straße.')] }
    ],
    maumau: [
      { t: 'Probier’s: Legen', q: 'In der Mitte liegt diese Karte. Welche aus deiner Hand darfst du legen?',
        demo: cards(['9H']), choices: [txt(card('KS'), 0, 'Pik König passt weder in Farbe noch Wert zu Herz 9.'), txt(card('9C'), 1, 'Gleicher Wert: 9 auf 9.'), txt(card('JD'), 1, 'Ein Bube passt immer, und du wünschst dir eine Farbe.'), txt(card('8S'), 0, 'Pik 8 passt nicht zu Herz 9.')] }
    ],
    schnapsen: [
      { t: 'Probier’s: Punkte', q: 'Wie viele Punkte zählt ein Ass?',
        choices: [txt('11', 1), txt('10', 0, '10 ist der Zehner. Das Ass zählt 11.'), txt('4', 0, '4 ist der König. Das Ass zählt 11.')] },
      { t: 'Probier’s: Zwanziger', q: 'Du spielst König oder Dame aus und hast das Paar (nicht in Atout). Wie viel bringt das?',
        choices: [txt('20 Punkte', 1), txt('40 Punkte', 0, '40 gibt es nur für das Paar in der Atout-Farbe.'), txt('Nichts', 0, 'König und Dame einer Farbe sind ein Zwanziger.')] }
    ],
    poker: [
      { t: 'Probier’s: Welche Hand ist stärker?', q: 'Tippe die stärkere Hand an.',
        choices: [txt(cards(['2H', '6H', '9H', 'JH', 'KH']), 1, 'Flush: fünf Karten in einer Farbe.'), txt(cards(['5C', '6D', '7S', '8H', '9C']), 0, 'Eine Straße ist gut, aber ein Flush schlägt sie.')] },
      { t: 'Probier’s: Rangfolge', q: 'Was schlägt ein Full House?',
        choices: [txt('Vierling', 1), txt('Flush', 0, 'Der Flush ist schwächer als das Full House.'), txt('Drilling', 0, 'Ein Drilling ist viel schwächer.')] }
    ],
    domino: [
      { t: 'Probier’s: Anlegen', q: 'Die Enden der Schlange zeigen 3 und 5. Welche Steine passen?',
        demo: `<span class="tq-ends">${tile(3, '·')}<b>…</b>${tile('·', 5)}</span>`,
        choices: [txt(tile(6, 3), 1, 'Die 3 passt an das Ende mit der 3.'), txt(tile(2, 4), 0, 'Weder 2 noch 4 liegt an einem Ende.'), txt(tile(5, 5), 1, 'Der Pasch 5-5 passt an die 5.'), txt(tile(1, 6), 0, 'Keine Hälfte zeigt 3 oder 5.')] }
    ],
    memory: [
      { t: 'Probier’s', q: 'Merk dir die Bilder! Gleich werden sie umgedreht. Finde dann alle drei Paare.', memo: ['🍒', '⭐', '🌙', '⭐', '🌙', '🍒'], yes: 'Alle Paare gefunden!', no: 'Kein Paar. Sie werden wieder umgedreht, merk dir, was du gesehen hast.' }
    ],
    hangman: [
      { t: 'Probier’s', q: 'Das Wort ist BANANE. Du rätst N. Wie viele Punkte bekommst du?',
        choices: [txt('2', 1), txt('1', 0, 'Es gibt einen Punkt pro Treffer, und N kommt zweimal vor.'), txt('3', 0, 'N kommt in BANANE zweimal vor.')], yes: 'Und du darfst gleich nochmal raten.' }
    ],
    slf: [
      { t: 'Probier’s', q: 'Der Buchstabe ist B. Welche Antworten zählen bei Stadt?',
        choices: [txt('Berlin', 1, 'Fängt mit B an und ist eine Stadt.'), txt('Paris', 0, 'Falscher Buchstabe.'), txt('Bremen', 1, 'Fängt mit B an und ist eine Stadt.'), txt('Bayern', 0, 'Bayern ist keine Stadt, sondern ein Land.')] },
      { t: 'Probier’s: Punkte', q: 'Nur du hast in einer Spalte etwas geschrieben. Wie viele Punkte?',
        choices: [txt('20', 1), txt('10', 0, '10 gibt es, wenn deine Antwort sonst niemand hat, aber die anderen etwas anderes geschrieben haben.'), txt('5', 0, '5 gibt es, wenn jemand dasselbe hat.')] }
    ],
    guess: [
      { t: 'Probier’s', q: 'Die richtige Antwort ist 1000. Wer bekommt die 3 Punkte?',
        choices: [txt('Anna mit 900', 1), txt('Ben mit 1200', 0, 'Ben liegt 200 daneben, Anna nur 100.'), txt('Beide', 0, 'Nur wer am nächsten dran ist.')] }
    ],
    code: [
      { t: 'Probier’s', q: 'Der Code ist 1 2 3 4, du rätst 1 3 5 6. Was ist die Antwort?',
        choices: [txt('1 Treffer, 1 Fast', 1), txt('2 Treffer', 0, 'Nur die 1 steht an der richtigen Stelle. Die 3 kommt vor, aber woanders.'), txt('0 Treffer, 2 Fast', 0, 'Die 1 steht genau richtig, das ist ein Treffer.')], yes: 'Die 1 ist ein Treffer, die 3 ist Fast, 5 und 6 kommen nicht vor.' }
    ],
    who: [
      { after: 2, t: 'Probier’s: Umklappen', q: 'Du fragst: „Hat deine Figur eine Brille?“ Die Antwort ist <b>Nein</b>. Welche Figuren klappen um?',
        choices: [txt('Alle mit Brille', 1), txt('Alle ohne Brille', 0, 'Nein heißt: Die gesuchte Figur hat keine Brille. Also fallen die mit Brille weg.'), txt('Keine, die muss ich selbst umklappen', 0, 'Das Spiel klappt nach jeder Antwort selbst um.')],
        yes: 'Genau. Übrig bleiben nur Figuren ohne Brille.', no: 'Überleg: Welche Figuren können es nach dieser Antwort nicht mehr sein?' },
      { after: 3, t: 'Probier’s: „oder“', q: 'Du fragst: „Hat deine Figur eine Brille oder einen Bart?“ Die Antwort ist <b>Ja</b>. Was weißt du jetzt?',
        choices: [txt('Sie hat eine Brille, einen Bart oder beides', 1), txt('Sie hat eine Brille und einen Bart', 0, 'Ja heißt bei „oder“: mindestens eins davon, nicht unbedingt beides.'), txt('Sie hat eine Brille', 0, 'Vielleicht hat sie auch nur einen Bart.')],
        yes: 'Richtig. Weg sind nur die Figuren ohne Brille und ohne Bart.' },
      { after: 4, t: 'Probier’s: Falsch geraten', q: 'Du rätst falsch und hattest noch zwei Herzen. Was passiert?',
        choices: [txt('Ein Herz ist weg, und der andere ist dran', 1), txt('Du hast sofort verloren', 0, 'Verloren hast du erst, wenn dein letztes Herz weg ist.'), txt('Du darfst gleich nochmal raten', 0, 'Nach einem Fehlversuch ist der andere dran.')],
        yes: 'Genau. Und die falsche Figur klappt um.' },
      { t: 'Probier’s: Gute Frage', q: 'Auf deinem Brett sind noch <b>8 Figuren</b> übrig. Welche Frage hilft dir am meisten?',
        choices: [txt('Eine, die auf 4 der 8 passt', 1), txt('Eine, die auf 1 der 8 passt', 0, 'Meistens kommt dann Nein, und es bleiben 7 übrig.'), txt('Eine, die auf alle 8 passt', 0, 'Die Antwort ist sicher Ja, du erfährst nichts Neues.')],
        yes: 'Richtig: Egal ob Ja oder Nein, danach sind nur noch 4 übrig.' }
    ],
    abc: [
      { after: 2, t: 'Probier’s: Zeit um', q: 'Die Zeit läuft ab, bevor du ein Wort abgeschickt hast. Was passiert?',
        choices: [txt('Du verlierst ein Leben, der Nächste macht mit dem nächsten Buchstaben weiter', 1), txt('Der Nächste muss denselben Buchstaben nehmen', 0, 'Der Buchstabe gilt als verpasst, es geht mit dem nächsten weiter.'), txt('Nichts, du bekommst mehr Zeit', 0, 'Zeit um heißt: ein Leben weniger.')] },
      { after: 3, t: 'Probier’s: Was zählt?', q: 'Kategorie Tiere, dein Buchstabe ist <b>D</b>. In diesem Spiel wurde schon <b>Dachs</b> genannt. Was tippst du?',
        choices: [txt('Delfin', 1), txt('Dachs', 0, 'Dachs wurde schon genannt. Wiederholen kostet ein Leben.'), txt('Ente', 0, 'Ente fängt mit E an. Du brauchst ein Tier mit D.')],
        yes: 'Genau: richtiger Buchstabe, ein Tier und noch nicht genannt.' }
    ],
    draw: [
      { t: 'Probier’s', q: 'Was darfst du beim Zeichnen nicht?',
        choices: [txt('Buchstaben oder Zahlen malen', 1), txt('Farben wechseln', 0, 'Farben darfst du so oft wechseln, wie du willst.'), txt('Etwas wegradieren', 0, 'Rückgängig und Weiß als Radierer sind erlaubt.')] }
    ],
    reaction: [
      { t: 'Probier’s', q: 'Tippe auf das Feld, sobald es grün wird. Nicht bei Orange!', react: true }
    ],
    pong: [
      { t: 'Probier’s', q: 'Wo musst du den Ball treffen, damit er schräg wegfliegt?',
        choices: [txt('An der Kante des Schlägers', 1), txt('Genau in der Mitte', 0, 'In der Mitte geht er gerade zurück.'), txt('Das ist Zufall', 0, 'Kein Zufall: Die Trefferstelle bestimmt den Winkel.')] }
    ],
    hockey: [
      { t: 'Probier’s', q: 'Darfst du mit deinem Schläger über die Mittellinie?',
        choices: [txt('Nein, ich bleibe in meiner Hälfte', 1), txt('Ja, wenn der Puck drüben ist', 0, 'Die Mittellinie darfst du nie überqueren.')] }
    ],
    billiard: [
      { t: 'Probier’s: Die 8', q: 'Wann darfst du die schwarze 8 versenken?',
        choices: [txt('Wenn alle meine Kugeln versenkt sind', 1), txt('Jederzeit', 0, 'Fällt die 8 zu früh, hast du den Frame verloren.'), txt('Gleich beim Anstoß', 0, 'Beim Anstoß wird sie nur wieder aufgesetzt, gewonnen hast du damit nicht.')] },
      { t: 'Probier’s: Foul', q: 'Die weiße Kugel fällt in eine Tasche. Was passiert?',
        choices: [txt('Foul: Der andere hat die Kugel in der Hand', 1), txt('Nichts, ich bin nochmal dran', 0, 'Das ist ein Foul.'), txt('Ich verliere den Frame', 0, 'Nur wenn dabei die 8 fällt. Sonst ist es ein Foul.')] }
    ],
    tron: [
      { t: 'Probier’s', q: 'Zwei Räder fahren frontal ineinander. Was passiert?',
        choices: [txt('Beide sind raus', 1), txt('Das schnellere gewinnt', 0, 'Frontal sind beide raus.'), txt('Sie prallen ab', 0, 'Bei Lichtrenner gibt es kein Abprallen.')] }
    ],
    // the boards get their look (map) from js/games/mines.js, which loads later
    mines: [
      { after: 2, t: 'Probier’s: Mine gefunden', q: 'Du deckst eine Mine auf. Was passiert?',
        choices: [txt('Sie gehört mir und ich bin nochmal dran', 1), txt('Ich habe verloren', 0, 'Hier ist eine Mine etwas Gutes: Sie bringt dir einen Punkt.'), txt('Ich bekomme einen Punkt, dann ist der Nächste dran', 0, 'Nach einer Mine bist du sofort nochmal dran. Erst ein sicheres Feld beendet deinen Zug.')] },
      { after: 2, t: 'Probier’s: Sichere Mine', q: 'Tippe auf ein Feld, unter dem ganz sicher eine Mine liegt.',
        pick: { rows: ['01...', '0112.', '0001.'], ok: [2], put: { c: 'mjg1 mjflag' }, o: { w: 200 } },
        yes: 'Genau: Die 1 daneben hat nur noch dieses eine verdeckte Feld, also muss die Mine dort liegen.', no: 'Such eine 1, die nur ein einziges verdecktes Feld neben sich hat.' },
      { after: 2, t: 'Probier’s: 1-2-1', q: 'Über der Reihe 1 2 1 liegen genau zwei Minen. Finde beide.',
        pick: { rows: ['...', '121', '000'], ok: [0, 2], all: true, put: { c: 'mjg1 mjflag' }, o: { w: 150 } },
        yes: 'Richtig. Läge die Mine in der Mitte, hätten beide Einsen schon ihre Mine und die 2 bekäme keine zweite.', no: 'Probier es aus: Was wäre, wenn die Mine über der 2 läge? Passen die beiden Einsen dann noch?' }
    ],
    sumo: [
      { t: 'Probier’s', q: 'Wie schiebst du in eine bestimmte Richtung?',
        choices: [txt('Knopf halten, wenn der Pfeil dorthin zeigt', 1), txt('Knopf mehrmals schnell antippen', 0, 'Antippen bringt kaum etwas. Halten schiebt.'), txt('Aufs Ziel tippen', 0, 'Es gibt nur einen Knopf: halten, wenn der Pfeil richtig steht.')] }
    ]
  };
})();
