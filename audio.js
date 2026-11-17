"use strict";
/* Cloud Sea / audio.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- sound: all generated, starts on the first click ---------- */
  var audio = null;
  function initAudio() {
    if (audio) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      var ac = new AC(), master = ac.createGain(); master.gain.value = save.sound ? 1 : 0; master.connect(ac.destination);
      var nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      function noise() { var s = ac.createBufferSource(); s.buffer = nb; s.loop = true; s.start(); return s; }
      var windF = ac.createBiquadFilter(); windF.type = "bandpass"; windF.Q.value = 0.6; var windG = ac.createGain(); windG.gain.value = 0; noise().connect(windF); windF.connect(windG); windG.connect(master);
      var rainF = ac.createBiquadFilter(); rainF.type = "highpass"; rainF.frequency.value = 2600; var rainG = ac.createGain(); rainG.gain.value = 0; noise().connect(rainF); rainF.connect(rainG); rainG.connect(master);
      var o1 = ac.createOscillator(), o2 = ac.createOscillator(), engF = ac.createBiquadFilter(), engG = ac.createGain(); o1.type = "sawtooth"; o2.type = "square"; engF.type = "lowpass"; engF.frequency.value = 420; engG.gain.value = 0;
      o1.connect(engF); o2.connect(engF); engF.connect(engG); engG.connect(master); o1.start(); o2.start();
      var lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 17; lfoG.gain.value = 0.012; lfo.connect(lfoG); lfoG.connect(engG.gain); lfo.start();
      var musG = ac.createGain(); musG.gain.value = 0.5; var musF = ac.createBiquadFilter(); musF.type = "lowpass"; musF.frequency.value = 1500; var delay = ac.createDelay(1); delay.delayTime.value = 0.46; var fb = ac.createGain(); fb.gain.value = 0.34;
      musG.connect(musF); musF.connect(master); musF.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
      audio = { ac: ac, master: master, windF: windF, windG: windG, rainG: rainG, o1: o1, o2: o2, engG: engG, musG: musG, nextChord: ac.currentTime + 0.5, chord: 0 };
    } catch (e) { audio = null; }
  }
  var CHORDS = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 261.6, 329.6, 440.0], [196.0, 293.7, 392.0, 440.0], [164.8, 246.9, 329.6, 392.0], [174.6, 220.0, 349.2, 392.0]];
  function updateAudio() {
    if (!audio) return;
    var ac = audio.ac, t = ac.currentTime, sp = me.speed;
    audio.windF.frequency.setTargetAtTime(350 + sp * 7, t, 0.2); audio.windG.gain.setTargetAtTime(started ? 0.03 + sp / 200 * 0.13 : 0.03, t, 0.3);
    audio.rainG.gain.setTargetAtTime(wx.rain * 0.07, t, 0.5);
    var f = 48 + me.throttle * 30 + (sp - 80) * 0.18; audio.o1.frequency.setTargetAtTime(f, t, 0.15); audio.o2.frequency.setTargetAtTime(f * 2.01, t, 0.15);
    audio.engG.gain.setTargetAtTime(onFoot ? 0 : vehicle ? 0.004 : started && !paused ? 0.035 + me.throttle * 0.03 : 0.012, t, 0.3);
    if (vehicle && started && !onFoot) audio.windG.gain.setTargetAtTime(0.05 + sp / 200 * 0.1 + Math.max(0, Math.sin(t * (3.2 + Math.min(sp, 160) * 0.025))) * 0.09, t, 0.05);
    if (onFoot) audio.windG.gain.setTargetAtTime(0.02, t, 0.4);
    if (onFoot && !paused && wx.rain < 0.2 && t > (audio.nextBird || 0)) {
      audio.nextBird = t + 2 + Math.random() * 5; var bf = 2200 + Math.random() * 1600, nb = 2 + Math.floor(Math.random() * 3);
      for (var b = 0; b < nb; b++) { var bo = ac.createOscillator(), bg = ac.createGain(), bt = t + b * 0.13; bo.type = "sine"; bo.frequency.setValueAtTime(bf, bt); bo.frequency.exponentialRampToValueAtTime(bf * (1.15 + Math.random() * 0.3), bt + 0.08); bg.gain.setValueAtTime(0, bt); bg.gain.linearRampToValueAtTime(0.025, bt + 0.02); bg.gain.exponentialRampToValueAtTime(0.0005, bt + 0.11); bo.connect(bg); bg.connect(audio.master); bo.start(bt); bo.stop(bt + 0.13); }
    }
    if (t > audio.nextChord) {
      var ch = CHORDS[audio.chord % CHORDS.length]; audio.chord++; audio.nextChord = t + 8;
      for (var i = 0; i < ch.length; i++) {
        var o = ac.createOscillator(), g = ac.createGain(); o.type = i % 2 ? "triangle" : "sine"; o.frequency.value = ch[i] * (i === 3 ? 1 : 0.5) * (1 + (Math.random() - 0.5) * 0.004);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 3 + i * 0.4); g.gain.linearRampToValueAtTime(0, t + 11.5);
        o.connect(g); g.connect(audio.musG); o.start(t); o.stop(t + 12);
      }
      for (var n = 0; n < 4; n++) {   // a few soft plucked notes over each chord
        var mo = ac.createOscillator(), mg = ac.createGain(), mt = t + 1 + n * 1.6 + Math.random() * 0.6; mo.type = "triangle"; mo.frequency.value = ch[Math.floor(Math.random() * ch.length)] * 2;
        mg.gain.setValueAtTime(0, mt); mg.gain.linearRampToValueAtTime(0.035, mt + 0.03); mg.gain.exponentialRampToValueAtTime(0.0005, mt + 1.8); mo.connect(mg); mg.connect(audio.musG); mo.start(mt); mo.stop(mt + 1.9);
      }
    }
  }
  function blip(freq, delaySec) {
    if (!audio) return;
    var ac = audio.ac, t = ac.currentTime + (delaySec || 0), o = ac.createOscillator(), g = ac.createGain(); o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 0.55);
  }
  function setSound(on) { save.sound = on; persist(); $("b-sound").textContent = "Sound: " + (on ? "on" : "off"); if (audio) audio.master.gain.setTargetAtTime(on ? 1 : 0, audio.ac.currentTime, 0.05); }

