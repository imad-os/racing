/* Street Racer - synthesized audio (Web Audio only). One AudioContext: created in start(), closed in stop(). */
(function () {
    'use strict';
    var ctx = null, musicGain, sfxGain, engGain, engFilt, eng1, eng2, noiseBuf, driftSrc, driftGain, driftFilt;
    var vol = { music: 0.7, sfx: 0.8 };
    var nextNote = 0, step = 0, tempo = 120, root = 57, intensity = 0, lowTier = false, paused = false;
    var CHORDS = [0, -4, 3, -2];                    // Am F C G
    var MINOR = [0, 3, 7, 12, 7, 3, 10, 7], TRIAD = [0, 3, 7];

    function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    function noiseNode(dur) {
        var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = false; return s;
    }

    function start(v, tier) {
        if (ctx) return;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { ctx = new AC(); } catch (e) { ctx = null; return; }
        lowTier = tier === 'low';
        if (v) { vol.music = v.music; vol.sfx = v.sfx; }
        var n = ctx.sampleRate, i, d;
        noiseBuf = ctx.createBuffer(1, n, n); d = noiseBuf.getChannelData(0);
        for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
        sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
        setVolume(vol);
        // engine
        engGain = ctx.createGain(); engGain.gain.value = 0;
        engFilt = ctx.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 500; engFilt.Q.value = 2;
        eng1 = ctx.createOscillator(); eng1.type = 'sawtooth'; eng1.frequency.value = 50;
        eng2 = ctx.createOscillator(); eng2.type = 'square'; eng2.frequency.value = 25;
        var g2 = ctx.createGain(); g2.gain.value = 0.5;
        eng1.connect(engFilt); eng2.connect(g2); g2.connect(engFilt); engFilt.connect(engGain); engGain.connect(sfxGain);
        eng1.start(); eng2.start();
        // drift screech
        driftSrc = ctx.createBufferSource(); driftSrc.buffer = noiseBuf; driftSrc.loop = true;
        driftFilt = ctx.createBiquadFilter(); driftFilt.type = 'bandpass'; driftFilt.frequency.value = 2200; driftFilt.Q.value = 6;
        driftGain = ctx.createGain(); driftGain.gain.value = 0;
        driftSrc.connect(driftFilt); driftFilt.connect(driftGain); driftGain.connect(sfxGain); driftSrc.start();
        nextNote = ctx.currentTime + 0.1; step = 0; paused = false;
    }

    function stop() {
        if (!ctx) return;
        try { eng1.stop(); eng2.stop(); driftSrc.stop(); } catch (e) {}
        try { ctx.close(); } catch (e2) {}
        busB = busP = busL = null;
        ctx = null;
    }
    function suspend() { paused = true; if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} } }
    function resume() { paused = false; if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') { try { ctx.resume(); } catch (e) {} } nextNote = ctx ? ctx.currentTime + 0.1 : 0; }
    function poke() { if (ctx && !paused && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } }
    function setVolume(v) {
        vol.music = v.music; vol.sfx = v.sfx;
        if (!ctx) return;
        musicGain.gain.value = 0.3 * vol.music; sfxGain.gain.value = 0.9 * vol.sfx;
    }
    function setTrack(t) {
        var th = SR.THEMES[t]; root = th.root; tempo = th.tempo;
    }

    /* ---- music: synth-wave loop scheduled from the game loop (no timers) ---- */
    function tone(type, f, t, dur, gain, dest, f2) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
    }
    function noiseHit(t, dur, gain, ftype, freq, dest) {
        var s = noiseNode(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = ftype; f.frequency.value = freq;
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, dur + 0.05);
    }
    function scheduleStep(s, t, sd) {
        var bar = (s >> 4) & 3, st = s & 15, base = root + CHORDS[bar], i;
        if (st % 4 === 0) tone('sine', 140, t, 0.16, 0.9, musicGain, 40);                         // kick
        if (st === 4 || st === 12) noiseHit(t, 0.14, 0.35, 'highpass', 1800, musicGain);          // snare
        if (!lowTier && (st & 1)) noiseHit(t, 0.04, 0.12, 'highpass', 7000, musicGain);           // hat
        if (st % 2 === 0) tone('sawtooth', mtof(base - 12 + (st % 8 === 6 ? 12 : 0)), t, sd * 1.7, 0.30, bassBus(), 0);   // bass
        if (st === 0 && !lowTier) {                                                               // pad
            for (i = 0; i < 3; i++) tone('sawtooth', mtof(base + TRIAD[i]) * (1 + 0.003 * i), t, sd * 15, 0.05, padBus(), 0);
        }
        if (intensity > 0.3 || bar > 1) tone('square', mtof(base + 12 + MINOR[st % 8]), t, sd * 0.9, 0.06 + 0.05 * intensity, leadBus(), 0);   // arp
    }
    var busB = null, busP = null, busL = null;
    function mkBus(type, f) {
        var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.connect(musicGain); return fl;
    }
    function bassBus() { return busB || (busB = mkBus('lowpass', 600)); }
    function padBus() { return busP || (busP = mkBus('lowpass', 1400)); }
    function leadBus() { return busL || (busL = mkBus('lowpass', 3200)); }

    /* call every frame: drives engine pitch, drift screech, music scheduling */
    function update(sp, nit, drift, onTrack, inten) {
        if (!ctx || paused) return;
        var t = ctx.currentTime;
        intensity = inten;
        var f = 48 + sp * 120 + nit * 30;
        eng1.frequency.setTargetAtTime(f, t, 0.05); eng2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
        engFilt.frequency.setTargetAtTime(350 + sp * 1500 + nit * 600, t, 0.08);
        engGain.gain.setTargetAtTime(onTrack ? 0.1 + 0.07 * sp : 0.05, t, 0.1);
        driftGain.gain.setTargetAtTime(drift * 0.22, t, 0.06);
        driftFilt.frequency.setTargetAtTime(1800 + drift * 900, t, 0.1);
        var sd = 60 / tempo / 4;
        if (nextNote < t - 0.5) nextNote = t + 0.05;
        while (nextNote < t + 0.25) { scheduleStep(step, nextNote, sd); nextNote += sd; step++; }
    }

    /* ---- sound effects ---- */
    function nitro(perfect) {
        if (!ctx || paused) return;
        var t = ctx.currentTime, s = noiseNode(), f = ctx.createBiquadFilter(), g = ctx.createGain(), d = perfect ? 1.1 : 0.7;
        f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(perfect ? 4200 : 2800, t + d * 0.7);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(perfect ? 1.1 : 0.7, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, 0, d + 0.05);
        tone('sawtooth', 90, t, d, 0.25, sfxGain, perfect ? 420 : 260);
        if (perfect) { tone('square', 880, t + 0.05, 0.12, 0.12, sfxGain, 0); tone('square', 1320, t + 0.15, 0.2, 0.12, sfxGain, 0); }
    }
    function crash(power) {
        if (!ctx || paused) return;
        var t = ctx.currentTime, p = Math.max(0.25, Math.min(1, power));
        noiseHit(t, 0.3 + 0.3 * p, 0.8 * p, 'lowpass', 1400, sfxGain);
        tone('sine', 120, t, 0.35, 0.9 * p, sfxGain, 38);
    }
    function scrape() { if (!ctx || paused) return; noiseHit(ctx.currentTime, 0.07, 0.18, 'highpass', 3500, sfxGain); }
    function takedown() {
        if (!ctx || paused) return;
        var t = ctx.currentTime;
        crash(1);
        tone('sawtooth', 660, t, 0.5, 0.2, sfxGain, 90);
        tone('square', 523, t + 0.25, 0.1, 0.1, sfxGain, 0); tone('square', 784, t + 0.35, 0.18, 0.1, sfxGain, 0);
    }
    function near() {
        if (!ctx || paused) return;
        var t = ctx.currentTime;
        noiseHit(t, 0.18, 0.4, 'bandpass', 1800, sfxGain); tone('sine', 1200, t, 0.12, 0.12, sfxGain, 1800);
    }
    function beep(high) { if (!ctx || paused) return; tone('square', high ? 880 : 440, ctx.currentTime, high ? 0.5 : 0.18, 0.18, sfxGain, 0); }
    function jingle(good) {
        if (!ctx || paused) return;
        var t = ctx.currentTime, n = good ? [523, 659, 784, 1046] : [392, 330, 262], i;
        for (i = 0; i < n.length; i++) tone('square', n[i], t + i * 0.13, 0.22, 0.14, sfxGain, 0);
    }
    function land() { if (!ctx || paused) return; var t = ctx.currentTime; tone('sine', 100, t, 0.2, 0.7, sfxGain, 40); noiseHit(t, 0.1, 0.25, 'lowpass', 900, sfxGain); }
    function tick() { if (!ctx || paused) return; tone('square', 660, ctx.currentTime, 0.05, 0.1, sfxGain, 0); }

    SR.audio = { start: start, stop: stop, suspend: suspend, resume: resume, poke: poke, setVolume: setVolume, setTrack: setTrack, update: update,
                 nitro: nitro, crash: crash, scrape: scrape, takedown: takedown, near: near, beep: beep, jingle: jingle, land: land, tick: tick,
                 isOn: function () { return !!ctx; } };
})();
