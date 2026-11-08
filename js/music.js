// Versus background music: generated live with Web Audio, no audio files and no licences.
// Four moods: menu (relaxed synthwave), play (Klassiker, light groove), think (Strategie, calm and sparse),
// action (Action games, fast). Every mood has three pieces in their own key, tempo and groove; after one full
// round (32 bars) the next piece of the mood follows. Inside a piece every 8 bars the arrangement changes,
// a lead melody comes and goes, drum fills and a crash mark the sections, so nothing loops for long.
(function () {
  'use strict';
  const settings = V.settings;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  // chords as MIDI notes (close voicings), bass roots, tempo and style per piece; swing pushes every second 16th
  const TRACKS = {
    menu: [
      { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], bass: [45, 41, 48, 43],
        kick: [0, 8], snare: [], hat: [4, 12], bassAt: [0, 6, 8, 14], arpEvery: 2, arpWave: 'triangle', cutoff: 1400, lead: 'triangle' },
      // night drive: Dm Bb F C, a bit faster, square lead
      { bpm: 100, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]], bass: [38, 34, 41, 36],
        kick: [0, 8, 11], snare: [12], hat: [2, 6, 10, 14], bassAt: [0, 3, 8, 11], arpEvery: 2, arpWave: 'square', cutoff: 1600, lead: 'square' },
      // lo-fi: seventh chords, swing, a soft snare and a little vinyl crackle
      { bpm: 84, swing: 0.14, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]], bass: [36, 33, 38, 31],
        kick: [0, 10], snare: [8], hat: [2, 6, 10, 14], bassAt: [0, 10], arpEvery: 4, arpWave: 'sine', cutoff: 1100, pad: 'triangle', lead: 'sine', vinyl: true }
    ],
    play: [
      { bpm: 108, chords: [[52, 55, 59], [52, 55, 60], [50, 55, 59], [50, 54, 57]], bass: [40, 48, 43, 50],
        kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [0, 2, 4, 6, 8, 10, 12, 14], arpEvery: 2, arpWave: 'square', cutoff: 1800, lead: 'triangle' },
      // bouncy: G D Em C, happy
      { bpm: 116, chords: [[55, 59, 62], [50, 54, 57], [52, 55, 59], [48, 52, 55]], bass: [43, 38, 40, 36],
        kick: [0, 8, 10], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [0, 4, 8, 10, 12], arpEvery: 2, arpWave: 'triangle', cutoff: 2000, lead: 'square' },
      // funky: Em7 A7 with swing and a busy bass
      { bpm: 104, swing: 0.12, chords: [[52, 55, 59, 62], [45, 49, 52, 55], [52, 55, 59, 62], [47, 50, 54, 57]], bass: [40, 45, 40, 47],
        kick: [0, 7, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassAt: [0, 3, 6, 8, 11, 14], arpEvery: 4, arpWave: 'square', cutoff: 1700, lead: 'sawtooth' }
    ],
    think: [
      { bpm: 80, chords: [[50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [48, 52, 55, 59]], bass: [38, 46, 41, 48],
        kick: [0], snare: [], hat: [8], bassAt: [0, 10], arpEvery: 4, arpWave: 'sine', cutoff: 1000 },
      // deep: Cm Ab Eb Bb, slow, bells
      { bpm: 72, chords: [[48, 51, 55, 58], [44, 48, 51, 55], [51, 55, 58, 62], [46, 50, 53, 57]], bass: [36, 32, 39, 34],
        kick: [0], snare: [], hat: [], bassAt: [0], arpEvery: 4, arpWave: 'sine', cutoff: 900, pad: 'triangle', bells: true },
      // falling: Fmaj7 Em7 Dm7 Cmaj7, gentle triangle arpeggio, almost no drums
      { bpm: 86, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], bass: [41, 40, 38, 36],
        kick: [], snare: [], hat: [12], bassAt: [0, 8], arpEvery: 2, arpWave: 'triangle', cutoff: 1200, pad: 'triangle', lead: 'sine' }
    ],
    action: [
      { bpm: 128, chords: [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]], bass: [36, 44, 39, 46],
        kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [2, 6, 10, 14], arpEvery: 1, arpWave: 'sawtooth', cutoff: 2400, lead: 'square' },
      // drive: Em C G D, rolling 8th bass
      { bpm: 140, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]], bass: [40, 36, 43, 38],
        kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [0, 2, 4, 6, 8, 10, 12, 14], arpEvery: 2, arpWave: 'square', cutoff: 2600, lead: 'sawtooth' },
      // breakbeat: Am G F E, broken kick and extra snares
      { bpm: 132, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], bass: [45, 43, 41, 40],
        kick: [0, 6, 10], snare: [4, 12, 15], hat: [0, 2, 4, 6, 8, 10, 12, 14], bassAt: [0, 6, 10, 14], arpEvery: 1, arpWave: 'triangle', cutoff: 2200, lead: 'square' }
    ]
  };
  // arpeggio patterns: indexes into the chord tones (+ an octave above)
  const ARPS = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 0, 2, 4, 3], [0, 1, 2, 1, 3, 2, 4, 2], [4, 3, 2, 1, 2, 3, 1, 0], [0, 2, 4, 2, 1, 3, 5, 3]];
  // rhythms for the lead melody (16th steps in a bar); a new motif is made for every 8 bars and then repeated
  const RHY = [[0, 3, 6, 10, 12], [0, 4, 6, 8, 14], [2, 6, 8, 11], [0, 2, 4, 7, 10, 12], [0, 6, 8, 12, 14]];
  const BARS = 64;

  // bus: fades (on, ducked, off) -> compressor -> vol: the music slider, after the compressor so it really changes
  // the loudness. out/delay: the lane of the piece that plays now. Every piece gets its own lane; a new piece fades
  // in while the old lane fades out and is then cut off, so long pad chords and echo never ring on into the next one.
  let ac = null, bus = null, vol = null, out = null, delay = null, noise = null;
  let cur = null, want = null, timer = 0, step = 0, bar = 0, nextT = 0, arp = ARPS[0];
  let piece = 0, T = null, motif = null;
  const lastPiece = {};
  let duckT = 0;
  const BUSV = 0.5; // the level into the compressor (fades go between 0 and this)
  const playing = () => !!timer;
  const level = () => (settings.sound && settings.music !== false ? Math.max(0, Math.min(100, settings.mvol ?? 45)) / 100 : 0);
  // the slider as loudness: squared, so 50 % sounds about half as loud and the low end still has room
  const volGain = () => { const l = level(); return 2 * l * l; };
  function setVol(sec = 0.08) {
    if (!vol) return;
    const t = ac.currentTime; vol.gain.cancelScheduledValues(t); vol.gain.setValueAtTime(vol.gain.value, t); vol.gain.linearRampToValueAtTime(volGain(), t + sec);
  }

  function setup() {
    if (ac) return true;
    ac = V.audio && V.audio(); if (!ac) return false;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    bus = ac.createGain(); bus.gain.value = 0;
    vol = ac.createGain(); vol.gain.value = volGain();
    bus.connect(comp).connect(vol).connect(ac.destination);
    const len = ac.sampleRate * 0.5; noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // a new lane for a piece: its own gain into the bus, with a soft echo for the arpeggio and the melody.
  // xf: crossfade in seconds (the old lane fades out meanwhile), 0 = old one cut at once
  function newLane(xf = 0) {
    cutLane(xf);
    out = ac.createGain(); out.connect(bus);
    const t = ac.currentTime; out.gain.setValueAtTime(xf ? 0.0001 : 1, t); if (xf) out.gain.linearRampToValueAtTime(1, t + xf);
    delay = ac.createDelay(1); const fb = ac.createGain(), tone = ac.createBiquadFilter(), wet = ac.createGain();
    fb.gain.value = 0.32; tone.type = 'lowpass'; tone.frequency.value = 2200; wet.gain.value = 0.35;
    delay.connect(tone).connect(fb).connect(delay); tone.connect(wet).connect(out);
  }
  // the old piece goes silent: faded over xf seconds, then cut off (scheduled notes keep running into nothing)
  function cutLane(xf = 0) {
    if (!out) return;
    const o = out, t = ac.currentTime; out = null; delay = null;
    try {
      o.gain.cancelScheduledValues(t); o.gain.setValueAtTime(o.gain.value, t);
      if (!xf) { o.gain.setValueAtTime(0, t); o.disconnect(); return; }
      o.gain.linearRampToValueAtTime(0.0001, t + xf);
      setTimeout(() => { try { o.disconnect(); } catch (e) { } }, xf * 1000 + 150);
    } catch (e) { }
  }

  // ---------- instruments ----------
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function pad(t, notes, dur, cutoff, wave = 'sawtooth') {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff * 0.5, t); f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cutoff * 0.6, t + dur);
    const g = ac.createGain(); env(g, t, 0.35, wave === 'sawtooth' ? 0.05 : 0.08, dur - 0.5, 0.6);
    f.connect(g).connect(out);
    notes.forEach(n => [-6, 6].forEach(cents => {
      const o = ac.createOscillator(); o.type = wave; o.frequency.value = midi(n); o.detune.value = cents;
      o.connect(f); o.start(t); o.stop(t + dur + 0.7);
    }));
  }
  function bass(t, n, dur, cutoff) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(cutoff * 0.55, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    env(g, t, 0.008, 0.16, dur * 0.4, dur * 0.6);
    o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function pluck(t, n, wave, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = wave; o.frequency.value = midi(n);
    env(g, t, 0.005, vol, 0.02, 0.22);
    o.connect(g); g.connect(out); g.connect(delay); o.start(t); o.stop(t + 0.3);
  }
  // the melody voice: a little glide into the note and a soft vibrato, through the echo
  function lead(t, n, dur, wave) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = wave; o.frequency.setValueAtTime(midi(n - 0.3), t); o.frequency.linearRampToValueAtTime(midi(n), t + 0.04);
    lfo.frequency.value = 5.5; lg.gain.value = 3; lfo.connect(lg).connect(o.detune);
    const soft = wave === 'sine' || wave === 'triangle';
    f.type = 'lowpass'; f.frequency.value = soft ? 4000 : 2400;
    env(g, t, 0.012, soft ? 0.07 : 0.035, dur * 0.5, dur * 0.6);
    o.connect(f).connect(g); g.connect(out); g.connect(delay);
    o.start(t); lfo.start(t); o.stop(t + dur * 1.2); lfo.stop(t + dur * 1.2);
  }
  // a glassy bell (two sines, the upper one inharmonic) with a long tail
  function bell(t, n) {
    [[1, 0.05], [2.76, 0.018]].forEach(([r, v]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = midi(n) * r;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g); g.connect(out); g.connect(delay); o.start(t); o.stop(t + 2.3);
    });
  }
  function tom(t, f0, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.24);
  }
  function kick(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.34);
  }
  function hiss(t, type, freq, vol, len) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + len + 0.02);
  }

  // ---------- sequencer ----------
  // section per 8 bars: 0 pad + bass, 1 + arpeggio, 2 everything + melody, 3 everything with new patterns
  function newMotif() {
    const r = RHY[Math.floor(Math.random() * RHY.length)];
    // per hit: which chord tone (0-3, 4 = the root an octave up) and whether it is held longer
    motif = r.map((at, i) => ({ at, k: Math.floor(Math.random() * 5), long: i === r.length - 1 || Math.random() < 0.25 }));
  }
  function playStep(s, t) {
    const sd = 60 / T.bpm / 4, ci = bar % 4, chord = T.chords[ci], sec = Math.floor(bar / 8) % 4, inSec = bar % 8;
    const drums = sec >= 1 || cur === 'action', full = sec >= 2, hasDrums = T.kick.length + T.snare.length > 0;
    if (s === 0) {
      pad(t, chord, sd * 16, T.cutoff, T.pad);
      if (inSec === 0 && sec >= 2) { arp = ARPS[Math.floor(Math.random() * ARPS.length)]; newMotif(); }
      // a crash where a new section begins
      if (inSec === 0 && sec >= 1 && hasDrums) hiss(t, 'highpass', 5200, 0.06, 1.1);
      if (T.vinyl) for (let i = 0; i < 6; i++) hiss(t + Math.random() * sd * 16, 'highpass', 3000, 0.012, 0.012);
    }
    if (T.bells && s === 0 && sec >= 1 && bar % 2 === 0) bell(t, chord[(bar / 2) % chord.length] + 24);
    // the melody: sections 2 and 3, a rest every fourth bar so it breathes
    if (T.lead && sec >= 2 && motif && bar % 4 !== 3) {
      const h = motif.find(x => x.at === s);
      if (h) { const tones = chord.concat([chord[0] + 12]); lead(t, tones[h.k % tones.length] + 12, sd * (h.long ? 3 : 1.4), T.lead); }
    }
    if (T.bassAt.includes(s)) bass(t, T.bass[ci] + (s % 8 === 6 && cur !== 'think' ? 12 : 0), sd * (T.bassAt.length > 4 ? 1.6 : 3), T.cutoff);
    // a drum fill in the last beat of each section instead of the normal drums
    if (drums && hasDrums && inSec === 7 && s >= 12) { tom(t, [220, 180, 150, 120][s - 12], 0.22); return; }
    if (drums && T.kick.includes(s)) kick(t, cur === 'think' ? 0.25 : 0.42);
    if (full && T.snare.includes(s)) { hiss(t, 'bandpass', T.vinyl ? 2600 : 1900, T.vinyl ? 0.09 : 0.16, 0.16); }
    if (drums && T.hat.includes(s)) hiss(t, 'highpass', 7500, cur === 'think' ? 0.03 : 0.06, 0.05);
    if (full && cur === 'action' && s % 2 === 1) hiss(t, 'highpass', 9000, 0.025, 0.03);
    if (sec >= 1 && s % T.arpEvery === 0) {
      const tones = chord.concat(chord.map(n => n + 12));
      const k = arp[(s / T.arpEvery) % arp.length];
      pluck(t, tones[k % tones.length] + 12, T.arpWave, T.arpWave === 'sawtooth' || T.arpWave === 'square' ? 0.03 : 0.06);
    }
  }
  function tick() {
    if (!ac || !cur || !T || !out) return;
    const sd = 60 / T.bpm / 4;
    // after a pause (tab in the background) start fresh instead of catching up with a burst of notes
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.15) {
      // swing: every second 16th comes a little late
      playStep(step, nextT + (T.swing && step % 2 ? sd * T.swing : 0));
      nextT += sd; step = (step + 1) % 16; if (!step) bar++;
      // one full round played: the next piece of the same mood
      if (!step && bar >= BARS) { nextPiece(); return; }
    }
  }
  // after a full round: the next piece of the same mood, gliding over (the old one fades out while it starts)
  function nextPiece() {
    if (want && level() && !document.hidden && ac.state === 'running') startTrack(want, cur === want, 3.5); else stopNow();
  }
  function fadeTo(v, sec) {
    if (!bus) return;
    const t = ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(v, t + sec);
  }
  function startTrack(name, next, xf = 0) {
    // a mood starts with another piece than last time; after a full round the next one follows
    const list = TRACKS[name], prev = lastPiece[name];
    piece = next && cur === name ? (piece + 1) % list.length
      : prev == null ? Math.floor(Math.random() * list.length) : (prev + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
    lastPiece[name] = piece; T = list[piece];
    cur = name; step = 0; bar = 0; arp = ARPS[Math.floor(Math.random() * ARPS.length)]; newMotif();
    newLane(xf);
    nextT = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 40);
    tick(); setVol(); fadeTo(BUSV, xf ? 0.3 : 1.2);
  }
  function stopNow() { clearInterval(timer); timer = 0; cur = null; if (ac) cutLane(); }

  V.music = {
    // which mood the current screen wants; switching fades over
    play(name) {
      want = name;
      if (!level() || document.hidden) return;
      if (!setup() || ac.state !== 'running') return;
      if (cur === name && playing()) { fadeTo(BUSV, 0.4); return; }
      if (!playing()) return startTrack(name);
      // another mood (menu -> match): the new piece fades in while the old one fades out
      startTrack(name, false, 1.6);
    },
    // the next piece of the current mood right away (for tests and a later "next piece" button)
    skip() { if (playing() && cur) nextPiece(); },
    // quieter for a moment (end of a match, big moments)
    duck(ms = 2500) {
      if (!playing()) return;
      fadeTo(BUSV * 0.25, 0.25);
      clearTimeout(duckT); duckT = setTimeout(() => { if (playing()) fadeTo(BUSV, 1); }, ms);
    },
    // settings changed (music switch, volume, sound on/off)
    apply() {
      if (!level()) { if (playing()) { fadeTo(0, 0.3); setTimeout(() => { if (!level()) stopNow(); }, 350); } return; }
      setVol();
      if (!playing() && want) this.play(want);
    },
    // browsers only allow audio after the first tap or key press
    unlock() {
      if (!want || !level() || !setup()) return;
      const go = () => { if (ac.state === 'running' && want) V.music.play(want); };
      if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => { });
    },
    // for the dev panel and tests: what is playing
    state: () => ({ mood: cur, piece, bar, playing: playing(), level: level() })
  };

  const first = () => { V.music.unlock(); if (ac && ac.state === 'running' && playing()) { removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true); } };
  addEventListener('pointerdown', first, true);
  addEventListener('keydown', first, true);
  // silence in the background, back where it was when the app returns
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (playing()) { stopNow(); } }
    else if (want) setTimeout(() => V.music.play(want), 150);
  });
})();
