// Versus background music: generated live with Web Audio, no audio files and no licences.
// Four moods: menu (relaxed synthwave), play (Klassiker, light groove), think (Strategie, calm and sparse),
// action (Action games, fast four-on-the-floor). Every 8 bars the arrangement changes and the arpeggio
// picks a new pattern, so it does not loop the same 4 bars forever.
(function () {
  'use strict';
  const settings = V.settings;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  // chords as MIDI notes (close voicings), bass roots, tempo and style per mood
  const TRACKS = {
    menu: {
      bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]], bass: [45, 41, 48, 43],
      kick: [0, 8], snare: [], hat: [4, 12], bassAt: [0, 6, 8, 14], arpEvery: 2, arpWave: 'triangle', cutoff: 1400
    },
    play: {
      bpm: 108, chords: [[52, 55, 59], [52, 55, 60], [50, 55, 59], [50, 54, 57]], bass: [40, 48, 43, 50],
      kick: [0, 6, 8], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [0, 2, 4, 6, 8, 10, 12, 14], arpEvery: 2, arpWave: 'square', cutoff: 1800
    },
    think: {
      bpm: 80, chords: [[50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [48, 52, 55, 59]], bass: [38, 46, 41, 48],
      kick: [0], snare: [], hat: [8], bassAt: [0, 10], arpEvery: 4, arpWave: 'sine', cutoff: 1000
    },
    action: {
      bpm: 128, chords: [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]], bass: [36, 44, 39, 46],
      kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bassAt: [2, 6, 10, 14], arpEvery: 1, arpWave: 'sawtooth', cutoff: 2400
    }
  };
  // arpeggio patterns: indexes into the chord tones (+ an octave above)
  const ARPS = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 0, 2, 4, 3], [0, 1, 2, 1, 3, 2, 4, 2], [4, 3, 2, 1, 2, 3, 1, 0], [0, 2, 4, 2, 1, 3, 5, 3]];

  let ac = null, bus = null, delay = null, noise = null;
  let cur = null, want = null, timer = 0, step = 0, bar = 0, nextT = 0, arp = ARPS[0], switching = false;
  const playing = () => !!timer;
  const level = () => (settings.sound && settings.music !== false ? Math.max(0, Math.min(100, settings.mvol ?? 45)) / 100 : 0);

  function setup() {
    if (ac) return true;
    ac = V.audio && V.audio(); if (!ac) return false;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    bus = ac.createGain(); bus.gain.value = 0;
    bus.connect(comp).connect(ac.destination);
    // a soft echo for the arpeggio
    delay = ac.createDelay(1); const fb = ac.createGain(), tone = ac.createBiquadFilter(), wet = ac.createGain();
    fb.gain.value = 0.32; tone.type = 'lowpass'; tone.frequency.value = 2200; wet.gain.value = 0.35;
    delay.connect(tone).connect(fb).connect(delay); tone.connect(wet).connect(bus);
    const len = ac.sampleRate * 0.5; noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  // ---------- instruments ----------
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function pad(t, notes, dur, cutoff) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff * 0.5, t); f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cutoff * 0.6, t + dur);
    const g = ac.createGain(); env(g, t, 0.35, 0.05, dur - 0.5, 0.6);
    f.connect(g).connect(bus);
    notes.forEach(n => [-6, 6].forEach(cents => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = cents;
      o.connect(f); o.start(t); o.stop(t + dur + 0.7);
    }));
  }
  function bass(t, n, dur, cutoff) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = midi(n);
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(cutoff * 0.55, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    env(g, t, 0.008, 0.16, dur * 0.4, dur * 0.6);
    o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function pluck(t, n, wave, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = wave; o.frequency.value = midi(n);
    env(g, t, 0.005, vol, 0.02, 0.22);
    o.connect(g); g.connect(bus); g.connect(delay); o.start(t); o.stop(t + 0.3);
  }
  function kick(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.34);
  }
  function hiss(t, type, freq, vol, len) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(bus); s.start(t); s.stop(t + len + 0.02);
  }

  // ---------- sequencer ----------
  // section per 8 bars: 0 pad + bass, 1 + arpeggio, 2 everything, 3 everything with a new pattern
  function playStep(T, s, t) {
    const sd = 60 / T.bpm / 4, ci = bar % 4, chord = T.chords[ci], sec = Math.floor(bar / 8) % 4;
    const drums = sec >= 1 || cur === 'action', full = sec >= 2;
    if (s === 0) {
      pad(t, chord, sd * 16, T.cutoff);
      if (bar % 4 === 0 && sec === 3) arp = ARPS[Math.floor(Math.random() * ARPS.length)];
    }
    if (T.bassAt.includes(s)) bass(t, T.bass[ci] + (s % 8 === 6 && cur !== 'think' ? 12 : 0), sd * (T.bassAt.length > 4 ? 1.6 : 3), T.cutoff);
    if (drums && T.kick.includes(s)) kick(t, cur === 'think' ? 0.25 : 0.42);
    if (full && T.snare.includes(s)) { hiss(t, 'bandpass', 1900, 0.16, 0.16); }
    if (drums && T.hat.includes(s)) hiss(t, 'highpass', 7500, cur === 'think' ? 0.03 : 0.06, 0.05);
    if (full && cur === 'action' && s % 2 === 1) hiss(t, 'highpass', 9000, 0.025, 0.03);
    if (sec >= 1 && s % T.arpEvery === 0) {
      const tones = chord.concat(chord.map(n => n + 12));
      const k = arp[(s / T.arpEvery) % arp.length];
      pluck(t, tones[k % tones.length] + 12, T.arpWave, T.arpWave === 'sawtooth' || T.arpWave === 'square' ? 0.03 : 0.06);
    }
  }
  function tick() {
    if (!ac || !cur) return;
    const T = TRACKS[cur], sd = 60 / T.bpm / 4;
    // after a pause (tab in the background) start fresh instead of catching up with a burst of notes
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.15) {
      playStep(T, step, nextT);
      nextT += sd; step = (step + 1) % 16; if (!step) bar++;
    }
  }
  function fadeTo(v, sec) {
    if (!bus) return;
    const t = ac.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(v, t + sec);
  }
  function startTrack(name) {
    cur = name; step = 0; bar = 0; arp = ARPS[Math.floor(Math.random() * ARPS.length)];
    nextT = ac.currentTime + 0.08;
    if (!timer) timer = setInterval(tick, 40);
    tick(); fadeTo(level() * 0.55, 1.2);
  }
  function stopNow() { clearInterval(timer); timer = 0; cur = null; }

  V.music = {
    // which mood the current screen wants; switching fades over
    play(name) {
      want = name;
      if (!level() || document.hidden) return;
      if (!setup() || ac.state !== 'running') return;
      if (cur === name && playing()) return fadeTo(level() * 0.55, 0.4);
      if (switching) return;
      if (!playing()) return startTrack(name);
      switching = true; fadeTo(0, 0.45);
      setTimeout(() => { switching = false; if (want && level()) startTrack(want); else stopNow(); }, 480);
    },
    // quieter for a moment (end of a match, big moments)
    duck(ms = 2500) {
      if (!playing()) return;
      fadeTo(level() * 0.15, 0.25);
      setTimeout(() => { if (playing()) fadeTo(level() * 0.55, 1); }, ms);
    },
    // settings changed (music switch, volume, sound on/off)
    apply() {
      if (!level()) { if (playing()) { fadeTo(0, 0.3); setTimeout(() => { if (!level()) stopNow(); }, 350); } return; }
      if (playing()) fadeTo(level() * 0.55, 0.15); else if (want) this.play(want);
    },
    // browsers only allow audio after the first tap or key press
    unlock() {
      if (!want || !level() || !setup()) return;
      const go = () => { if (ac.state === 'running' && want) V.music.play(want); };
      if (ac.state === 'running') go(); else ac.resume().then(go).catch(() => { });
    }
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
