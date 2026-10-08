/* Street Racer - game: simulation, pseudo-3D renderer (1 or 2 split-screen viewports), HUD, menus and My PC glue.
 * Fixed 60 Hz update, one rAF loop, pooled entities and particles, no allocation in the loop. */
(function () {
    'use strict';
    var T = SR.t;
    var W = 960, H = 540, STEP = 1000 / 60;
    var SEG = SR.SEG, ROADW = 2000, DEPTH0 = 1 / Math.tan(50 * Math.PI / 180), MAXS = 12000;
    var WALLX = 1.08, WALLH = 300, CARW = 0.24, LANES = [-0.75, -0.25, 0.25, 0.75];
    var S_TITLE = 0, S_MAIN = 1, S_CAREER = 2, S_GARAGE = 3, S_HELP = 4, S_COUNT = 5, S_RACE = 6, S_RESULT = 7, S_QUICK = 8, S_MP = 9;
    var NTRACKS = 8, NEV = 24, NCAR = 12;
    var MAXTRAFFIC = 16, TR0 = 6, TR1 = 6 + MAXTRAFFIC, P2I = TR1, NCARS = TR1 + 1, DMAX = 170;
    var SPR_RIVAL = 12, SPR_TRAFFIC = 17;
    var FONT = 'Arial, "Segoe UI", Tahoma, sans-serif';

    /* viewport layout (single full screen, or two stacked halves) */
    var XK = 480, YK = 270, HZ = 232, CAMH = 1000, PLAYERZ = CAMH * DEPTH0, VH = 540, VS = 1, PBY = 502;
    var nPl = 1, nVp = 1;

    /* ---------------- state ---------------- */
    var info = null, tier = 'mid', canvas = null, ctx = null, cs = 1, raf = 0, last = 0, acc = 0, destroyed = false, started = false, paused = false;
    var st = S_TITLE, simT = 0, inputLock = 0, timeScale = 1, slowT = 0, frameAvg = 16.7, tsT = 1;
    var sv = null;
    var trackIdx = 0, theme = null, N = 0, trackLen = 0, segCurve = SR.segCurve, segY = SR.segY;
    var drawDist = 120;
    var sprId = new Uint8Array(SR.MAXSEG * 2), sprX = new Float32Array(SR.MAXSEG * 2);
    var BASE = 0;

    /* ---------------- cars ---------------- */
    var CARS = [
        { brand: 'Kairo',     name: 'Pulse',    col: '#e8344a', price: 0,     need: 0,  st: [4, 4, 5, 4] },
        { brand: 'Kairo',     name: 'Zephyr',   col: '#2f8cff', price: 3000,  need: 2,  st: [5, 5, 6, 5] },
        { brand: 'Kairo',     name: 'Kestrel',  col: '#ffc21a', price: 6500,  need: 4,  st: [6, 6, 6, 5] },
        { brand: 'Voltrix',   name: 'Arc',      col: '#27d3c4', price: 10000, need: 8,  st: [6, 7, 7, 6] },
        { brand: 'Voltrix',   name: 'Nimbus',   col: '#9aa8c8', price: 15000, need: 12, st: [7, 7, 8, 6] },
        { brand: 'Voltrix',   name: 'Quasar',   col: '#c040ff', price: 21000, need: 16, st: [8, 7, 8, 7] },
        { brand: 'Nordhaven', name: 'Ember',    col: '#ff7a1a', price: 28000, need: 20, st: [8, 8, 7, 8] },
        { brand: 'Nordhaven', name: 'Skald',    col: '#3a4a6a', price: 36000, need: 26, st: [9, 8, 8, 8] },
        { brand: 'Nordhaven', name: 'Valkyr',   col: '#f0f0f8', price: 46000, need: 32, st: [9, 9, 8, 9] },
        { brand: 'Solara',    name: 'Halcyon',  col: '#ffd23f', price: 58000, need: 38, st: [9, 9, 9, 9] },
        { brand: 'Solara',    name: 'Vortex',   col: '#8a4dff', price: 72000, need: 44, st: [10, 9, 10, 9] },
        { brand: 'Solara',    name: 'Specter',  col: '#14e0b5', price: 90000, need: 50, st: [10, 10, 10, 10] }
    ];
    var STATN = ['st0', 'st1', 'st2', 'st3'], KTR = [], KTH = [], KEV = ['ev0', 'ev1', 'ev2'], KEVD = ['evd0', 'evd1', 'evd2'], KH = ['h0', 'h1', 'h2', 'h3', 'h4', 'h5'];
    (function () { for (var i = 0; i < NTRACKS; i++) { KTR.push('tr' + i); KTH.push('th' + i); } })();
    var cars = [], PIDX = [0, P2I];
    function newCar(i) {
        return { id: i, kind: i === 0 || i === P2I ? 0 : (i < 6 ? 1 : 2), act: false, dist: 0, x: 0, vx: 0, speed: 0, spr: 0, top: 1, skill: 1, tgtX: 0, laneT: 0,
                 wreck: 0, spin: 0, vspin: 0, hit: 0, hitBy: 0, fin: false, finT: 0, boost: 0, boostT: 0, rel: 0, aggr: 0, blink: 0, haz: 0, tspeed: 0, owner: 0 };
    }
    for (var ci = 0; ci < NCARS; ci++) cars.push(newCar(ci));
    var csx = new Float32Array(NCARS * 2), csy = new Float32Array(NCARS * 2), csc = new Float32Array(NCARS * 2), prevDz = new Float32Array(NCARS * 2);

    /* per-player state */
    function newPl(k) {
        return { k: k, y: 0, vy: 0, air: false, airT: 0, camG: 0, nitro: 0, nitroLvl: 0, nitroAct: false, latch: false, drift: false, driftDir: 1, driftAng: 0, driftT: 0,
                 lean: 0, wallCool: 0, bumpCool: 0, lastTap: -9, perfCd: 0, brake: false, scrapeT: 0, topNow: MAXS, bounce: 0, autoLim: MAXS,
                 shk: 0, flash: 0, flashCol: '#fff', zoomK: 0, perfT: 0, msg: { text: '', t: 0, col: '#fff', big: 0 }, msg2: { text: '', t: 0 },
                 takedowns: 0, nearMiss: 0, curLap: 1, lapStart: 0, bestLapT: 0, place: 1, depth: DEPTH0, bgOff1: 0, bgOff2: 0, camShX: 0, camShY: 0,
                 auto: true, autoCap: 0.6, autoNit: false, rocket: false, carIdx: 0, held: [0, 0, 0, 0, 0],
                 ctrl: { steer: 0, brake: false, nit: false }, stat: { top: 1, accel: 3000, steer: 2, cf: 1, drain: 30, gain: 1, nb: 0.3 } };
    }
    var pls = [newPl(0), newPl(1)];
    var K = 0, P = cars[0], pl = pls[0];
    function use(k) { K = k; P = cars[PIDX[k]]; pl = pls[k]; }

    /* ---------------- event / race state ---------------- */
    var gm = { mode: 0, t: 0, e: 0, laps: 3, type: 0, c1: 0, c2: 0 };   // current game config (0 career, 1 quick, 2 multiplayer)
    var evT = 0, evE = 0, evType = 0, laps = 3, finishDist = 0, timeLimit = 0, raceT = 0, cdT = 0, nRivals = 5, taRef = 0, mpDone = false;
    var res = { mode: 0, pos: 1, time: 0, td: 0, stars: 0, newStars: 0, coins: 0, score: 0, newBest: false, total: 0, reason: 0, items: [], sel: 0, bestStr: '', timeStr: '', targetStr: '', winner: 0, gapStr: '' };
    var LAPS_OPT = [1, 2, 3, 5];

    /* ---------------- saved data ---------------- */
    function zeros(n) { var a = [], i; for (i = 0; i < n; i++) a.push(0); return a; }
    function defSave() {
        var up = [], i, ow = zeros(NCAR);
        for (i = 0; i < NCAR; i++) up.push([0, 0, 0, 0]);
        ow[0] = 1;
        return { v: 2, coins: 0, car: 0, owned: ow, up: up, stars: zeros(NEV), score: zeros(NEV), btime: zeros(NEV), qt: 0, ql: 3 };
    }
    function loadSave() {
        var s = MyPC.load('sr', null), d = defSave(), i, j;
        sv = d;
        if (!s || !s.v) return;
        try {
            if (typeof s.coins === 'number') d.coins = s.coins;
            if (typeof s.car === 'number' && s.car >= 0 && s.car < NCAR) d.car = s.car;
            for (i = 0; i < NCAR; i++) { d.owned[i] = s.owned && s.owned[i] ? 1 : 0; for (j = 0; j < 4; j++) d.up[i][j] = Math.max(0, Math.min(5, (s.up && s.up[i] && s.up[i][j]) | 0)); }
            for (i = 0; i < NEV; i++) { d.stars[i] = Math.max(0, Math.min(3, (s.stars && s.stars[i]) | 0)); d.score[i] = (s.score && s.score[i]) | 0; d.btime[i] = (s.btime && +s.btime[i]) || 0; }
            d.owned[0] = 1;
            if (!d.owned[d.car]) d.car = 0;
            d.qt = Math.max(0, Math.min(NTRACKS - 1, s.qt | 0));
            d.ql = LAPS_OPT.indexOf(s.ql | 0) >= 0 ? s.ql | 0 : 3;
        } catch (e) { sv = defSave(); }
    }
    function persist() { MyPC.save('sr', sv); }
    function totalStars() { var s = 0, i; for (i = 0; i < NEV; i++) s += sv.stars[i]; return s; }
    function careerTotal() { var s = 0, i; for (i = 0; i < NEV; i++) s += sv.score[i]; return s; }
    function evUnlocked(i) { return totalStars() >= i * 2; }
    function trackUnlocked(t) { return evUnlocked(t * 3); }
    function carStat(ci, k) { return CARS[ci].st[k] + sv.up[ci][k] * 0.6; }
    function applyCar(k, ci) {
        var q = pls[k], s = q.stat;
        q.carIdx = ci;
        s.top = 0.8 + 0.03 * carStat(ci, 0);
        s.accel = s.top * MAXS / (9 - 0.55 * carStat(ci, 1));
        s.steer = 1.7 + 0.09 * carStat(ci, 2);
        s.cf = 1 - 0.035 * (carStat(ci, 2) - 5);
        s.drain = 34 - 1.2 * carStat(ci, 3);
        s.gain = 0.8 + 0.06 * carStat(ci, 3);
        s.nb = 0.26 + 0.012 * carStat(ci, 3);
        cars[PIDX[k]].spr = ci;
    }

    /* ---------------- helpers ---------------- */
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function rnd() { return Math.random(); }
    function segIdx(d) { return ((d % trackLen) / SEG) | 0; }
    function groundAt(d) {
        var z = d % trackLen, i = (z / SEG) | 0, p = (z - i * SEG) / SEG;
        return segY[i] + (segY[i + 1] - segY[i]) * p;
    }
    function popMsgQ(q, text, col, big) { q.msg.text = text; q.msg.t = 1.6; q.msg.col = col || '#fff'; q.msg.big = big || 0; }
    function popMsg(text, col, big) { popMsgQ(pl, text, col, big); }
    function addNitroQ(q, v) { q.nitro = Math.min(100, q.nitro + v * q.stat.gain); }
    function addNitro(v) { addNitroQ(pl, v); }
    function fmtTime(s) { var m = (s / 60) | 0, r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); }

    function setLayout(split) {
        if (split) { XK = 400; YK = 135; HZ = 104; CAMH = 1400; VH = 270; VS = 0.5; nVp = 2; }
        else { XK = 480; YK = 270; HZ = 232; CAMH = 1000; VH = 540; VS = 1; nVp = 1; }
        PLAYERZ = CAMH * DEPTH0; PBY = HZ + YK;
        if (theme) buildFog();
    }

    /* ---------------- track loading ---------------- */
    var mapC = null, mapX = new Float32Array(200), mapY = new Float32Array(200), fogGrad = null, gLc = null, gRc = null, sameG = true, sceneRng = 1, nitroGrad = null;
    function srnd() { sceneRng = (sceneRng * 1664525 + 1013904223) >>> 0; return sceneRng / 4294967296; }
    function rgba(hexc, a) { return 'rgba(' + parseInt(hexc.substr(1, 2), 16) + ',' + parseInt(hexc.substr(3, 2), 16) + ',' + parseInt(hexc.substr(5, 2), 16) + ',' + a + ')'; }
    function buildFog() {
        fogGrad = ctx.createLinearGradient(0, HZ - 4, 0, HZ + 80 * VS);
        fogGrad.addColorStop(0, rgba(theme.fog, 1)); fogGrad.addColorStop(1, rgba(theme.fog, 0));
    }
    function loadTrack(t) {
        trackIdx = t; theme = SR.THEMES[t];
        N = SR.buildTrack(t); trackLen = SR.trackLen; BASE = trackLen;
        gLc = theme.gL; gRc = theme.gR; sameG = gLc[0] === gRc[0];
        buildFog(); buildScenery(); buildMinimap();
        SR.audio.setTrack(t);
        pls[0].bgOff1 = pls[0].bgOff2 = pls[1].bgOff1 = pls[1].bgOff2 = 0;
    }
    function buildScenery() {
        var set = SR.spr.sceneSets[trackIdx], items = set.items, tot = 0, i, k, r, j, side, step = tier === 'low' ? 12 : (tier === 'mid' ? 8 : 6), spr = SR.spr.scen[trackIdx], id, ww;
        sceneRng = 1234 + trackIdx * 77;
        for (i = 0; i < items.length; i++) tot += items[i][1];
        sprId.fill(0, 0, N * 2 + 4);
        for (i = 0; i < N; i++) {
            if (i % 12 === 0) {
                sprId[i * 2] = set.lamp + 1; sprX[i * 2] = -1.3;
                sprId[i * 2 + 1] = set.lamp + 1; sprX[i * 2 + 1] = 1.3;
                continue;
            }
            if (i % step !== 3 % step) continue;
            for (side = 0; side < 2; side++) {
                if (srnd() > 0.8) continue;
                r = srnd() * tot; id = items[0][0];
                for (j = 0; j < items.length; j++) { r -= items[j][1]; if (r <= 0) { id = items[j][0]; break; } }
                if (side === 0 && set.sea !== undefined) { if (srnd() < 0.3) id = set.sea; else continue; }
                ww = spr[id].ww / ROADW;
                k = i * 2 + side;
                sprId[k] = id + 1;
                sprX[k] = (side ? 1 : -1) * (1.4 + ww * 0.5 + srnd() * 1.6);
            }
        }
    }
    function buildMinimap() {
        var Kp = 200, i, hd = 0, x = 0, y = 0, px = new Float32Array(Kp), py = new Float32Array(Kp), per = N / Kp, j, minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
        for (i = 0; i < Kp; i++) {
            for (j = 0; j < per; j++) { hd += segCurve[(i * per + j) | 0] * 0.0019 + 0.6 * 6.2832 / N; x += Math.sin(hd); y -= Math.cos(hd); }
            px[i] = x; py[i] = y;
        }
        for (i = 0; i < Kp; i++) { px[i] -= x * (i + 1) / Kp; py[i] -= y * (i + 1) / Kp; if (px[i] < minx) minx = px[i]; if (px[i] > maxx) maxx = px[i]; if (py[i] < miny) miny = py[i]; if (py[i] > maxy) maxy = py[i]; }
        var bw2 = 160, bh2 = 108, s2 = Math.min((bw2 - 20) / Math.max(1, maxx - minx), (bh2 - 20) / Math.max(1, maxy - miny));
        for (i = 0; i < Kp; i++) { mapX[i] = 10 + (px[i] - minx) * s2 + ((bw2 - 20) - (maxx - minx) * s2) / 2; mapY[i] = 10 + (py[i] - miny) * s2 + ((bh2 - 20) - (maxy - miny) * s2) / 2; }
        if (!mapC) mapC = SR.art.mk(bw2, bh2);
        var g = mapC.getContext('2d');
        g.clearRect(0, 0, bw2, bh2);
        g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 9; g.beginPath(); g.moveTo(mapX[0], mapY[0]);
        for (i = 1; i < Kp; i++) g.lineTo(mapX[i], mapY[i]);
        g.closePath(); g.stroke();
        g.strokeStyle = '#e8ecff'; g.lineWidth = 5; g.stroke();
        g.strokeStyle = '#ffd23f'; g.lineWidth = 2; g.beginPath(); g.moveTo(mapX[0] - 5, mapY[0]); g.lineTo(mapX[0] + 5, mapY[0]); g.stroke();
    }

    /* ---------------- world setup ---------------- */
    function respawnTraffic(c, rel) {
        var tries = 0, j, o, ok, lane;
        do {
            lane = LANES[(rnd() * 4) | 0]; ok = true;
            for (j = TR0; j < TR1; j++) { o = cars[j]; if (o !== c && o.act && o.owner === c.owner && Math.abs(o.rel - rel) < 1500 && Math.abs(o.x - lane) < 0.3) { ok = false; break; } }
            if (!ok) rel += 700;
            tries++;
        } while (!ok && tries < 6);
        c.x = lane; c.rel = rel; c.wreck = 0; c.spin = 0; c.vx = 0; c.hit = 0; c.blink = 0.5;
        c.speed = c.tspeed;
    }
    function setTraffic(n, startRel) {
        var i, c;
        for (i = 0; i < MAXTRAFFIC; i++) {
            c = cars[TR0 + i]; c.kind = 2; c.act = i < n; c.owner = i % nPl;
            if (!c.act) continue;
            c.spr = SPR_TRAFFIC + (i % 4) * 3 + (((i / 4) | 0) % 3);
            c.tspeed = (0.32 + rnd() * 0.3) * MAXS; c.wreck = 0;
            c.rel = 0; respawnTraffic(c, startRel + ((i / nPl) | 0) * (1700 + rnd() * 700));
        }
    }
    function resetFx(q) {
        q.y = 0; q.vy = 0; q.air = false; q.airT = 0; q.nitroLvl = 0; q.nitroAct = false; q.latch = false; q.drift = false; q.driftAng = 0; q.driftT = 0;
        q.wallCool = 0; q.bumpCool = 0; q.perfCd = 0; q.perfT = 0; q.shk = 0; q.flash = 0; q.zoomK = 0; q.msg.t = 0; q.msg2.t = 0; q.lean = 0;
        q.held[0] = q.held[1] = q.held[2] = q.held[3] = q.held[4] = 0; q.rocket = false; q.takedowns = 0; q.nearMiss = 0; q.curLap = 1; q.lapStart = 0; q.bestLapT = 0; q.place = 1;
    }
    function trafficCount() { return tier === 'low' ? 8 : (tier === 'mid' ? 12 : 16); }
    function setupDemo(t) {
        var i;
        nPl = 1; setLayout(false); loadTrack(t); resetFx(pls[0]); resetFx(pls[1]); slowT = 0; timeScale = 1; clearParticles();
        applyCar(0, sv.car);
        for (i = 1; i < 6; i++) cars[i].act = false;
        cars[P2I].act = false;
        use(0);
        P.act = true; P.dist = BASE + 600 + ((rnd() * 20) | 0) * 100; P.x = 0; P.vx = 0; P.speed = 0.4 * MAXS; P.wreck = 0; P.fin = false; P.tgtX = 0;
        setTraffic(tier === 'low' ? 4 : 6, 5000);
        pl.auto = true; pl.autoCap = 0.6; pl.autoNit = false; pl.nitro = 0;
        syncCam();
    }
    function skillBase() { return 0.86 + 0.0125 * (gm.mode === 0 ? gm.t * 3 + gm.e : gm.t * 3 + 1); }
    function syncCam() { var k; for (k = 0; k < 2; k++) pls[k].camG = groundAt(cars[PIDX[k]].dist); }

    /* gm = {mode, t, e, laps, type, c1, c2}: builds the grid and starts the countdown */
    function startRace() {
        var i, c, row, k;
        evT = gm.t; evE = gm.e; evType = gm.type; laps = gm.laps; nPl = gm.mode === 2 ? 2 : 1;
        trackIdx = gm.t;
        setLayout(gm.mode === 2);
        loadTrack(gm.t); clearParticles(); slowT = 0; timeScale = 1;
        resetFx(pls[0]); resetFx(pls[1]);
        applyCar(0, gm.mode === 0 ? sv.car : gm.c1);
        if (nPl === 2) applyCar(1, gm.c2);
        finishDist = BASE + laps * trackLen;
        timeLimit = evType === 2 ? 100 : 0;
        nRivals = gm.mode === 2 ? 0 : (evType === 1 ? 0 : 5);
        raceT = 0; mpDone = false;
        taRef = laps * trackLen / 10600;
        for (k = 0; k < nPl; k++) {
            use(k); P.act = true; P.speed = 0; P.vx = 0; P.wreck = 0; P.fin = false; P.hit = 0; pl.nitro = 15; pl.auto = false; pl.autoCap = 1; pl.autoNit = false;
            P.dist = nPl === 2 ? BASE - 400 : BASE - 400 - 2 * 700; P.x = nPl === 2 ? (k ? 0.5 : -0.5) : 0.5; P.tgtX = P.x;
        }
        if (nPl === 1) cars[P2I].act = false;
        for (i = 1; i < 6; i++) {
            c = cars[i]; c.act = i <= nRivals; if (!c.act) continue;
            c.spr = SPR_RIVAL + i - 1; c.kind = 1; c.speed = 0; c.wreck = 0; c.fin = false; c.hit = 0; c.vx = 0; c.blink = 0; c.boost = 0; c.boostT = 8 + rnd() * 10;
            c.skill = (0.96 + 0.02 * (i - 1)) * (0.98 + rnd() * 0.04); c.top = skillBase() * c.skill;
            c.aggr = evType === 2 ? 0.9 : 0.25 + rnd() * 0.35; c.laneT = 1 + rnd() * 2;
            if (evType === 2) { c.dist = cars[0].dist + 1500 + i * 900; c.x = LANES[i & 3]; }
            else { row = ((i - 1) >> 1); c.dist = BASE - 400 - row * 700; c.x = (i & 1) ? -0.5 : 0.5; if (i === 5) c.x = -0.5; }
            c.tgtX = c.x;
        }
        setTraffic(nPl === 2 ? (tier === 'low' ? 6 : 10) : trafficCount(), 4500);
        st = S_COUNT; cdT = 0; inputLock = 0.5;
        resetHudCache(); prevDz.fill(0); syncCam();
        SR.audio.beep(false);
        MyPC.announce(T(KTR[gm.t]));
    }
    function startEvent(t, e) { gm.mode = 0; gm.t = t; gm.e = e; gm.type = e; gm.laps = e === 2 ? 99 : 3; startRace(); MyPC.announce(T(KTR[t]) + ', ' + T(KEV[e])); }
    function startQuick() { gm.mode = 1; gm.t = trackIdx; gm.e = 0; gm.type = 0; gm.laps = sv.ql; gm.c1 = qCar; startRace(); }
    function startMP() { gm.mode = 2; gm.t = trackIdx; gm.e = 0; gm.type = 0; gm.laps = sv.ql; gm.c1 = mCar1; gm.c2 = mCar2; startRace(); }

    /* ---------------- AI ---------------- */
    function hazardScan(c) {
        var look = 1600 + c.speed * 0.12, j, o, dz, blocked = false, hs = 1e9, k, free, lx;
        for (j = 0; j < NCARS; j++) {
            o = cars[j];
            if (o === c || !o.act || o.wreck > 0) continue;
            dz = o.dist - c.dist;
            if (dz > 0 && dz < look && Math.abs(o.x - c.x) < 0.34 && o.speed < c.speed + 400) { blocked = true; if (o.speed < hs) hs = o.speed; }
        }
        if (blocked) {
            for (k = 0; k < 4; k++) {
                lx = LANES[k]; free = true;
                for (j = 0; j < NCARS; j++) {
                    o = cars[j];
                    if (o === c || !o.act || o.wreck > 0) continue;
                    dz = o.dist - c.dist;
                    if (dz > -500 && dz < look && Math.abs(o.x - lx) < 0.32) { free = false; break; }
                }
                if (free && Math.abs(lx - c.x) < 0.9) { c.tgtX = lx; blocked = false; break; }
            }
        }
        c.haz = blocked ? hs : 0;
    }
    function rivalStep(c, dt) {
        var curve = segCurve[segIdx(c.dist)], sp = c.speed / MAXS, p0 = cars[0], gap = c.dist - p0.dist, rub = 1, target, err, maxv, k;
        c.laneT -= dt;
        if (c.laneT <= 0) {
            c.laneT = 2.5 + rnd() * 4;
            if (c.aggr > 0.5 && p0.dist < c.dist && p0.dist > c.dist - 2200 && rnd() < c.aggr) c.tgtX = clamp(p0.x, -0.75, 0.75);
            else if (rnd() < 0.6) c.tgtX = LANES[(rnd() * 4) | 0];
        }
        hazardScan(c);
        if (gap < -5000) rub = 1.05 + Math.min(0.07, (-gap - 5000) / 90000); else if (gap > 7000) rub = 0.95;
        if (evType === 2 && gap > 5000) rub = 0.88;
        c.boostT -= dt; if (c.boostT <= 0) { c.boost = c.boost > 0 ? 0 : 2; c.boostT = c.boost > 0 ? 2 : 9 + rnd() * 10; }
        target = c.top * MAXS * rub * (c.boost > 0 ? 1.12 : 1) * (1 - Math.min(0.2, Math.abs(curve) * 0.03));
        if (c.haz > 0 && c.haz * 0.97 < target) target = c.haz * 0.97;
        if (c.fin) target = Math.min(target, 0.7 * MAXS);
        if (c.speed < target) c.speed += Math.min(c.top * MAXS / 5.5 * dt, target - c.speed); else c.speed -= Math.min(5500 * dt, c.speed - target);
        err = c.tgtX - c.x; maxv = 1.7 * (0.35 + 0.65 * Math.min(1, sp));
        k = clamp(err * 3, -maxv, maxv);
        c.x += k * dt + c.vx * dt - curve * sp * sp * 0.36 * 0.5 * dt;
        c.vx -= c.vx * Math.min(1, 4 * dt);
        c.dist += c.speed * dt;
        if (c.x > 0.96) { c.x = 0.96; wallHitCar(c); c.vx = -Math.abs(c.vx) * 0.4; } else if (c.x < -0.96) { c.x = -0.96; wallHitCar(c); c.vx = Math.abs(c.vx) * 0.4; }
        if (!c.fin && c.dist >= finishDist && evType !== 2) { c.fin = true; c.finT = raceT; }
    }
    function wallHitCar(c) { c.speed *= 0.985; if (c.hit > 0 && c.wreck <= 0) wreckCar(c, true); }
    function wreckCar(c, byPlayer) {
        var q = pls[c.hitBy | 0];
        if (c.wreck > 0) return;
        c.wreck = 2.4; c.spin = 0; c.vspin = (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 4); c.vx = 0;
        c.speed *= 0.75;
        burstAt(c, 14);
        if (c.kind === 1 && byPlayer && c.hit > 0) {
            q.takedowns++; addNitroQ(q, 28); slowT = 0.75; q.shk = Math.max(q.shk, 1); q.flash = 0.5; q.flashCol = '#ffd23f';
            popMsgQ(q, T('tdown'), '#ffd23f', 1);
            q.msg2.text = '+100'; q.msg2.t = 1.2;
            SR.audio.takedown();
            MyPC.announce(T('tdown'));
        } else { SR.audio.crash(0.8); }
        c.hit = 0;
    }
    function trafficStep(c, dt) {
        var o;
        if (!c.act) return;
        o = cars[PIDX[c.owner]];
        if (c.blink > 0) c.blink -= dt;
        if (c.wreck > 0) {
            c.wreck -= dt; c.spin += c.vspin * dt; c.speed *= Math.max(0, 1 - 1.4 * dt);
            c.x += c.vx * dt; c.vx *= Math.max(0, 1 - 2 * dt);
            if (Math.abs(c.x) > 0.96) c.x = clamp(c.x, -0.96, 0.96);
            if (c.wreck <= 0) { c.spin = 0; respawnTraffic(c, 20000 + rnd() * 6000); }
            c.rel += (c.speed - o.speed) * dt; c.dist = o.dist + c.rel;
            if (c.wreck > 0.2 && rnd() < 0.5) smokeAt(c, 0.6);
            return;
        }
        c.speed = c.tspeed;
        c.rel += (c.speed - o.speed) * dt;
        c.x = clamp(c.x + c.vx * dt, -0.96, 0.96); c.vx *= Math.max(0, 1 - 4 * dt);
        if (c.rel < -4500) respawnTraffic(c, 21000 + rnd() * 6000);
        else if (c.rel > 31000) respawnTraffic(c, -3500);
        c.dist = o.dist + c.rel;
    }
    function wreckStep(c, dt) {
        c.wreck -= dt; c.spin += c.vspin * dt; c.speed *= Math.max(0, 1 - 1.5 * dt); c.dist += c.speed * dt;
        c.x = clamp(c.x + c.vx * dt, -0.96, 0.96); c.vx *= Math.max(0, 1 - 2 * dt);
        if (rnd() < 0.5) smokeAt(c, 0.7);
        if (c.wreck <= 0) {
            c.spin = 0; c.blink = 1.2; c.speed = 0; c.hit = 0;
            if (evType === 2) { c.dist = cars[0].dist + 5000 + rnd() * 3000; c.speed = cars[0].speed * 0.9; c.x = LANES[(rnd() * 4) | 0]; c.tgtX = c.x; }
        }
    }

    /* ---------------- player ---------------- */
    function readCtrl() {
        var h = pl.held, c = pl.ctrl;
        c.steer = (h[1] > 0 ? 1 : 0) - (h[0] > 0 ? 1 : 0);
        c.brake = h[3] > 0;
        c.nit = h[4] > 0 || h[2] > 0;
    }
    function autoCtrl() {
        var curve = segCurve[segIdx(P.dist)], sp = P.speed / MAXS, c = pl.ctrl;
        hazardScan(P);
        if (P.haz === 0 && Math.abs(P.tgtX - P.x) < 0.05 && rnd() < 0.002) P.tgtX = LANES[(rnd() * 4) | 0];
        c.steer = clamp((P.tgtX - P.x) * 5 + curve * 0.17 * sp, -1, 1);
        c.brake = false; c.nit = pl.autoNit && pl.nitro > 1;
        pl.autoLim = Math.sqrt(1.75 / (0.36 * Math.max(0.01, Math.abs(curve)) * pl.stat.cf)) * MAXS;
    }
    function playerStep(dt) {
        var sp, curve, topNow, a, lat, push, ground, pred, k, ctrl = pl.ctrl, stat = pl.stat;
        if (st === S_COUNT) { P.speed = 0; return; }
        if (pl.auto) autoCtrl(); else readCtrl();
        curve = segCurve[segIdx(P.dist)];
        if (P.wreck > 0) P.wreck = 0;
        if (ctrl.nit && !pl.latch && pl.nitro > 10) { pl.latch = true; pl.nitroAct = true; SR.audio.nitro(false); pl.flash = 0.25; pl.flashCol = '#7fe9ff'; }
        if (!ctrl.nit || pl.nitro <= 0) { pl.latch = false; pl.nitroAct = false; }
        if (pl.nitroAct) { pl.nitro -= stat.drain * dt; if (pl.nitro < 0) pl.nitro = 0; }
        if (pl.perfT > 0) pl.perfT -= dt;
        if (pl.perfCd > 0) pl.perfCd -= dt;
        k = (pl.nitroAct || pl.perfT > 0) ? 1 : 0;
        pl.nitroLvl += (k - pl.nitroLvl) * Math.min(1, dt * (k ? 6 : 2.5));
        topNow = stat.top * MAXS * (1 + stat.nb * pl.nitroLvl + (pl.perfT > 0 ? 0.16 : 0));
        if (pl.auto) topNow = Math.min(topNow, pl.autoCap * MAXS * stat.top, pl.autoLim);
        pl.topNow = topNow;
        sp = P.speed / MAXS; if (sp > 1.45) sp = 1.45;
        if (!pl.air && ctrl.brake && Math.abs(ctrl.steer) > 0.3 && P.speed > 0.42 * MAXS * stat.top) { if (!pl.drift) { pl.drift = true; pl.driftT = 0; } pl.driftDir = ctrl.steer > 0 ? 1 : -1; }
        else if (pl.drift && !(ctrl.brake && P.speed > 0.34 * MAXS * stat.top)) {
            pl.drift = false;
            if (pl.driftT > 0.9) { P.speed += 0.035 * MAXS; pl.flash = 0.2; pl.flashCol = '#ff9a3a'; }
        }
        if (pl.drift) {
            pl.driftT += dt; addNitro((11 + Math.min(pl.driftT, 3) * 5) * dt);
            P.speed -= P.speed * 0.045 * dt;
            if (pl.driftT > 0.45 && pl.msg.t <= 0.2) popMsg(T('drift'), '#ff9a3a', 0);
            if (rnd() < 0.6) spawnP(1, W / 2 + pl.driftAng * -70 * (XK / 480) + (rnd() - 0.5) * 120 * (XK / 480), PBY - 10 * VS, (rnd() - 0.5) * 30, -20 - rnd() * 30, 0.7 + rnd() * 0.5, 8 + rnd() * 8);
        }
        pl.driftAng += ((pl.drift ? pl.driftDir : 0) - pl.driftAng) * Math.min(1, dt * 6);
        if (ctrl.brake && !pl.drift) { P.speed -= 9500 * dt; }
        else if (P.speed < topNow) { a = stat.accel * (1.55 - 1.2 * Math.min(1, P.speed / topNow)) * (1 + 1.9 * pl.nitroLvl) * (st === S_RESULT ? 0.5 : 1); P.speed += Math.min(a * dt, topNow - P.speed); }
        else P.speed -= Math.min(P.speed - topNow, 3500 * dt);
        if (P.speed < 0) P.speed = 0;
        pl.brake = ctrl.brake && !pl.drift && P.speed > 300;
        lat = ctrl.steer * stat.steer * (0.3 + 0.7 * Math.min(1, sp)) * (pl.drift ? 1.15 : 1) * (pl.air ? 0.35 : 1);
        push = curve * sp * sp * 0.36 * stat.cf * (pl.drift ? 0.35 : 1) * (pl.air ? 0.3 : 1);
        P.x += (lat - push + P.vx) * dt;
        P.vx -= P.vx * Math.min(1, 4 * dt);
        pl.lean += (ctrl.steer - pl.lean) * Math.min(1, dt * 8);
        if (pl.wallCool > 0) pl.wallCool -= dt;
        if (pl.bumpCool > 0) pl.bumpCool -= dt;
        if (P.x > 0.96 || P.x < -0.96) {
            k = P.x > 0 ? 1 : -1; P.x = k * 0.96;
            if (pl.wallCool <= 0) { pl.shk = Math.max(pl.shk, 0.5 + sp * 0.3); SR.audio.crash(sp); P.speed *= 0.95; pl.drift = false; }
            pl.wallCool = 0.25; P.vx = -k * 0.7; P.speed -= P.speed * 0.45 * dt;
            pl.scrapeT -= dt;
            if (pl.scrapeT <= 0) { pl.scrapeT = 0.05; spawnSparks(W / 2 + k * 120 * XK / 480, PBY - 24 * VS, k, 4); SR.audio.scrape(); }
        }
        ground = groundAt(P.dist);
        if (!pl.air) {
            pred = pl.y + pl.vy * dt - 0.5 * 5200 * dt * dt;
            if (ground < pred - 6 && P.speed > 4000) { pl.air = true; pl.airT = 0; pl.y = pred; pl.vy = pl.vy - 5200 * dt; }
            else { pl.vy = (ground - pl.y) / dt; pl.y = ground; }
            if (pl.vy > 12000) pl.vy = 12000; if (pl.vy < -12000) pl.vy = -12000;
        } else {
            pl.airT += dt; pl.vy -= 5200 * dt; pl.y += pl.vy * dt;
            if (pl.y <= ground) {
                pl.y = ground; pl.air = false; pl.vy = 0; pl.shk = Math.max(pl.shk, 0.45); SR.audio.land();
                if (pl.airT > 0.3) { addNitro(8 + pl.airT * 14); popMsg(T('air'), '#7fe9ff', 0); }
                spawnSparks(W / 2, PBY - 12 * VS, 0, 6);
            }
        }
        P.dist += P.speed * dt;
        pl.bounce = Math.sin(P.dist * 0.05) * Math.min(1, sp) * 1.4;
        if (pl.nitroLvl > 0.15) pl.zoomK += (1 - pl.zoomK) * Math.min(1, dt * 5); else pl.zoomK += (0 - pl.zoomK) * Math.min(1, dt * 3);
    }

    /* ---------------- collisions ---------------- */
    function bumpPlayer(c, dz, dx) {
        var s = dx >= 0 ? 1 : -1, rear = dz > 120 && Math.abs(dx) < 0.17, rel = P.speed - c.speed, ov = CARW - Math.abs(dx);
        if (c.wreck > 0) return;
        if (rear) {
            if (pl.bumpCool <= 0) { pl.bumpCool = 0.3; pl.shk = Math.max(pl.shk, 0.6); SR.audio.crash(Math.min(1, rel / 6000)); spawnSparks(W / 2, PBY - 100 * VS, 0, 6); pl.drift = false; }
            if (c.kind === 2 && (rel > 5200 || pl.nitroLvl > 0.5)) { c.wreck = 2.2; c.spin = 0; c.vspin = (rnd() < 0.5 ? -1 : 1) * 8; c.vx = s * -0.5; c.speed = P.speed * 1.05; burstAt(c, 10); P.speed *= 0.9; }
            else { P.speed = Math.min(P.speed, c.speed * 0.9); }
            if (c.kind === 1) { c.hit = 2; c.hitBy = K; c.speed += Math.min(2500, Math.max(0, rel) * 0.5); }
            if (c.kind === 1 && pl.nitroLvl > 0.45 && rel > 1500) wreckCar(c, true);
            return;
        }
        P.x += s * ov * 0.55; c.x -= s * ov * 0.45; P.vx += s * 0.9; c.vx -= s * 1.8;
        if (pl.bumpCool <= 0) {
            pl.bumpCool = 0.3; pl.shk = Math.max(pl.shk, 0.45); SR.audio.crash(0.5); P.speed *= 0.965; spawnSparks(W / 2 + (c.x < P.x ? -90 : 90) * XK / 480, PBY - 52 * VS, -s, 6);
        }
        if (c.kind === 1) {
            c.hit = 2.2; c.hitBy = K;
            if (pl.nitroLvl > 0.45 && rel > 1500) wreckCar(c, true);
        } else if (c.kind === 2 && (pl.nitroLvl > 0.5 || Math.abs(rel) > 5500)) {
            c.wreck = 2.2; c.spin = 0; c.vspin = -s * 8; c.vx = -s * 1.5; burstAt(c, 8);
        }
    }
    function collisions() {
        var i, j, c, o, dz, dx, adx, pdz, k, a, b, s, ov, ia;
        for (k = 0; k < nPl; k++) {
            use(k);
            for (i = 1; i < NCARS; i++) {
                c = cars[i];
                if (!c.act || c.kind === 0) continue;
                dz = c.dist - P.dist;
                if (c.wreck <= 0 && c.blink <= 0 && dz > -380 && dz < 380) {
                    dx = P.x - c.x; adx = Math.abs(dx);
                    if (adx < CARW && !pl.air) bumpPlayer(c, dz, dx);
                }
                ia = i * 2 + k;
                if (c.wreck <= 0 && st === S_RACE) {
                    pdz = prevDz[ia];
                    if (pdz > 0 && dz <= 0 && pdz < 900) {
                        adx = Math.abs(P.x - c.x);
                        if (adx > CARW + 0.02 && adx < 0.5 && P.speed > c.speed + 1500) { addNitro(7); pl.nearMiss++; popMsg(T('near'), '#7dff6a', 0); SR.audio.near(); }
                    }
                }
                prevDz[ia] = dz;
            }
        }
        if (nPl === 2 && st === S_RACE) {   // player vs player
            a = cars[0]; b = cars[P2I];
            dz = b.dist - a.dist; dx = a.x - b.x;
            if (dz > -380 && dz < 380 && Math.abs(dx) < CARW && !pls[0].air && !pls[1].air) {
                ov = CARW - Math.abs(dx); s = dx >= 0 ? 1 : -1;
                if (Math.abs(dx) < 0.17 && Math.abs(dz) > 120) {
                    if (dz > 0) a.speed = Math.min(a.speed, b.speed * 0.97); else b.speed = Math.min(b.speed, a.speed * 0.97);
                } else { a.x += s * ov * 0.5; b.x -= s * ov * 0.5; a.vx += s * 0.8; b.vx -= s * 0.8; }
                if (pls[0].bumpCool <= 0) { pls[0].bumpCool = pls[1].bumpCool = 0.3; pls[0].shk = pls[1].shk = Math.max(pls[0].shk, 0.5); SR.audio.crash(0.5); a.speed *= 0.98; b.speed *= 0.98; }
            }
        }
        for (i = 1; i < 6; i++) {
            c = cars[i];
            if (!c.act || c.wreck > 0) continue;
            for (j = 1; j < P2I; j++) {
                if (j === i) continue;
                o = cars[j];
                if (!o.act || o.wreck > 0 || (j < 6 && j < i)) continue;
                dz = o.dist - c.dist;
                if (dz > -380 && dz < 380) {
                    dx = c.x - o.x;
                    if (Math.abs(dx) < CARW) {
                        if (c.hit > 0 && o.kind === 2) { o.wreck = 2.2; o.vspin = 8; o.vx = dx > 0 ? -1 : 1; wreckCar(c, true); }
                        else {
                            if (dz > 0) c.speed = Math.min(c.speed, o.speed * 0.95); else o.speed = Math.min(o.speed, c.speed * 0.95);
                            c.x += (dx >= 0 ? 1 : -1) * 0.02; if (o.kind === 1) o.x -= (dx >= 0 ? 1 : -1) * 0.02;
                        }
                    }
                }
            }
            if (c.hit > 0) c.hit -= STEP / 1000;
        }
    }

    /* ---------------- particles (screen space, per viewport) ---------------- */
    var NP = 140, px = new Float32Array(NP), py = new Float32Array(NP), pvx = new Float32Array(NP), pvy = new Float32Array(NP), plife = new Float32Array(NP),
        pmax = new Float32Array(NP), psize = new Float32Array(NP), ptype = new Uint8Array(NP), pvp = new Uint8Array(NP), pcur = 0;
    var NSNOW = 70, snx = new Float32Array(NSNOW), sny = new Float32Array(NSNOW), snv = new Float32Array(NSNOW);
    var NLINES = 30, lnA = new Float32Array(NLINES), lnT = new Float32Array(NLINES), lnS = new Float32Array(NLINES);
    (function () { var i; for (i = 0; i < NSNOW; i++) { snx[i] = Math.random() * W; sny[i] = Math.random() * H; snv[i] = 40 + Math.random() * 60; } for (i = 0; i < NLINES; i++) { lnA[i] = Math.random() * 6.283; lnT[i] = Math.random(); lnS[i] = 0.6 + Math.random() * 0.8; } })();
    function clearParticles() { plife.fill(0); }
    function spawnPv(vp, type, x, y, vx, vy, life, size) {
        var i = pcur; pcur = (pcur + 1) % (tier === 'low' ? 70 : NP);
        px[i] = x; py[i] = y; pvx[i] = vx; pvy[i] = vy; plife[i] = life; pmax[i] = life; psize[i] = size; ptype[i] = type; pvp[i] = vp;
    }
    function spawnP(type, x, y, vx, vy, life, size) { spawnPv(K, type, x, y, vx, vy, life, size); }
    function spawnSparks(x, y, dir, n) {
        var i, m = tier === 'low' ? (n >> 1) + 1 : n;
        for (i = 0; i < m; i++) spawnP(0, x, y, dir * (60 + rnd() * 200) + (rnd() - 0.5) * 120, -80 - rnd() * 180, 0.25 + rnd() * 0.35, 2 + rnd() * 2);
    }
    function smokeAt(c, s) {
        var v, i = c.id * 2;
        if (tier === 'low' && rnd() < 0.5) return;
        for (v = 0; v < nVp; v++) if (csx[i + v] > -900) spawnPv(v, 1, csx[i + v], csy[i + v] - csc[i + v] * XK * 170, (rnd() - 0.5) * 30, -20 - rnd() * 30, 0.7 + rnd() * 0.5, 8 * s + rnd() * 8);
    }
    function burstAt(c, n) {
        var v, i, m = tier === 'low' ? n >> 1 : n, x, y, ci = c.id * 2;
        for (v = 0; v < nVp; v++) {
            x = csx[ci + v] > -900 ? csx[ci + v] : W / 2; y = csx[ci + v] > -900 ? csy[ci + v] - csc[ci + v] * XK * 170 : PBY - 100 * VS;
            for (i = 0; i < m; i++) { spawnPv(v, 0, x, y, (rnd() - 0.5) * 420, -100 - rnd() * 260, 0.4 + rnd() * 0.5, 3 + rnd() * 3); spawnPv(v, 2, x, y, (rnd() - 0.5) * 140, -40 - rnd() * 120, 0.5 + rnd() * 0.5, 10 + rnd() * 12); }
        }
    }
    function particlesStep(real) {
        var i, n = tier === 'low' ? 70 : NP, k, q;
        for (i = 0; i < n; i++) {
            if (plife[i] <= 0) continue;
            plife[i] -= real; px[i] += pvx[i] * real; py[i] += pvy[i] * real;
            if (ptype[i] === 0) pvy[i] += 520 * real;
        }
        if (theme && theme.snow) {
            for (i = 0; i < (tier === 'low' ? 30 : NSNOW); i++) { sny[i] += snv[i] * real; snx[i] += Math.sin(sny[i] * 0.03 + i) * 20 * real - segCurve[segIdx(cars[0].dist)] * 10 * real; if (sny[i] > H) { sny[i] = -4; snx[i] = Math.random() * W; } if (snx[i] < 0) snx[i] += W; if (snx[i] > W) snx[i] -= W; }
        }
        for (k = 0; k < 2; k++) {
            q = pls[k];
            if (q.shk > 0) { q.shk -= real * 2.4; if (q.shk < 0) q.shk = 0; }
            if (q.flash > 0) q.flash -= real * 2;
            if (q.msg.t > 0) q.msg.t -= real;
            if (q.msg2.t > 0) q.msg2.t -= real;
        }
    }

    /* ---------------- race flow ---------------- */
    function rankScore(c) { return c.fin ? 1e9 - c.finT : c.dist; }
    function updatePlace() {
        var i, c, s = rankScore(P), p = 1;
        for (i = 1; i < 6; i++) { c = cars[i]; if (c.act && rankScore(c) > s) p++; }
        c = cars[P === cars[0] ? P2I : 0];
        if (nPl === 2 && rankScore(c) > s) p++;
        pl.place = p;
    }
    function lapOf(d) { return Math.floor((d - BASE) / trackLen) + 1; }
    function raceFlow(dt) {
        var l, lt, k;
        if (st !== S_RACE) return;
        raceT += dt;
        for (k = 0; k < nPl; k++) {
            use(k);
            updatePlace();
            l = clamp(lapOf(P.dist), 1, laps);
            if (l > pl.curLap) {
                lt = raceT - pl.lapStart; pl.lapStart = raceT; pl.curLap = l;
                if (pl.bestLapT === 0 || lt < pl.bestLapT) pl.bestLapT = lt;
                if (evType !== 2) { popMsg(l === laps ? T('finallap') : (T('lap') + ' ' + l), '#fff', 1); SR.audio.jingle(true); }
            }
        }
        if (evType === 2) { use(0); if (raceT >= timeLimit) finishEvent(); return; }
        for (k = 0; k < nPl; k++) {
            use(k);
            if (!P.fin && P.dist >= finishDist) {
                P.fin = true; P.finT = raceT;
                if (nPl === 2) { if (!mpDone) finishMP(k); }
                else finishEvent();
            }
        }
    }
    function takeThr(arr) { arr[0] = 3 + evT; arr[1] = 5 + ((evT * 1.5) | 0); arr[2] = 8 + evT * 2; return arr; }
    var thrArr = [0, 0, 0];
    function evScore() {
        var s = 0, thr, k;
        if (evType === 0) s = pl.place === 1 ? 3 : (pl.place <= 3 ? 2 : (pl.place <= 4 ? 1 : 0));
        else if (evType === 1) { k = 0.02 * evT; s = res.time <= taRef * (1.02 - k) ? 3 : (res.time <= taRef * (1.10 - k) ? 2 : (res.time <= taRef * (1.20 - k) ? 1 : 0)); }
        else { thr = takeThr(thrArr); s = pl.takedowns >= thr[2] ? 3 : (pl.takedowns >= thr[1] ? 2 : (pl.takedowns >= thr[0] ? 1 : 0)); }
        return s;
    }
    function toAuto() {
        var k, c;
        for (k = 0; k < nPl; k++) { c = cars[PIDX[k]]; pls[k].auto = true; pls[k].autoCap = 0.5; pls[k].autoNit = false; c.tgtX = LANES[c.x < -0.5 ? 0 : (c.x < 0 ? 1 : (c.x < 0.5 ? 2 : 3))]; }
    }
    function finishMP(winner) {
        var o = cars[PIDX[1 - winner]], w = cars[PIDX[winner]], gap;
        mpDone = true; st = S_RESULT; inputLock = 0.9; toAuto();
        res.mode = 2; res.winner = winner; res.timeStr = fmtTime(w.finT);
        gap = (finishDist - o.dist) / Math.max(4000, o.speed);
        res.gapStr = '+' + gap.toFixed(2) + ' s';
        res.items.length = 0; res.items.push('rematch'); res.items.push('menu'); res.sel = 0;
        SR.audio.jingle(true);
        MyPC.announce(T('winner') + ' ' + T(winner ? 'p2' : 'p1'));
    }
    function finishEvent() {
        var idx = evT * 3 + evE, stars, mult = 1 + evT * 0.35, coins, score, pos, nextOk, career = gm.mode === 0;
        use(0);
        pos = pl.place;
        st = S_RESULT; inputLock = 0.9; toAuto();
        res.mode = gm.mode; res.reason = evType === 2 ? 1 : 0;
        res.time = raceT; res.td = pl.takedowns; res.pos = pos;
        stars = evScore();
        if (evType === 0) { coins = [900, 600, 450, 350, 250, 150][pos - 1] * mult + pl.takedowns * 80; score = stars * 2000 + (6 - pos) * 300 + pl.takedowns * 150; }
        else if (evType === 1) { coins = stars * 400 * mult + 300; score = stars * 2000 + Math.max(0, Math.round((taRef * 1.2 - res.time) * 50)); }
        else { coins = pl.takedowns * 120 * mult + 200; score = stars * 2000 + pl.takedowns * 400; }
        if (career) {
            res.newStars = Math.max(0, stars - sv.stars[idx]);
            coins = Math.round(coins + res.newStars * 500);
            res.stars = stars; res.score = Math.round(score);
            res.newBest = res.score > sv.score[idx];
            if (res.newBest) sv.score[idx] = res.score;
            if (stars > sv.stars[idx]) sv.stars[idx] = stars;
            if (evType !== 2 && (sv.btime[idx] === 0 || res.time < sv.btime[idx])) sv.btime[idx] = res.time;
            res.bestStr = sv.btime[idx] ? fmtTime(sv.btime[idx]) : '-';
        } else { coins = Math.round(coins * 0.5); res.stars = -1; res.score = 0; res.newBest = false; }
        res.coins = coins;
        sv.coins += coins;
        res.total = careerTotal();
        persist();
        if (career) MyPC.submitScore(res.total);
        res.timeStr = fmtTime(raceT);
        if (evType === 1) res.targetStr = fmtTime(taRef * (1.02 - 0.02 * evT)); else if (evType === 2) res.targetStr = '' + takeThr(thrArr)[2]; else res.targetStr = '';
        res.items.length = 0;
        nextOk = career && idx < NEV - 1 && evUnlocked(idx + 1);
        if (nextOk) res.items.push('next');
        res.items.push('retry'); res.items.push('menu');
        res.sel = 0;
        SR.audio.jingle(stars !== 0);
        MyPC.announce(T('results') + (career ? ' ' + stars + ' ' + T('stars') : ''));
    }

    /* ---------------- main update ---------------- */
    function update() {
        var real = 1 / 60, dt, i, c, k, g, cv, spp, q;
        simT += real;
        if (inputLock > 0) inputLock -= real;
        if (slowT > 0) { slowT -= real; tsT = 0.28; } else tsT = 1;
        timeScale += (tsT - timeScale) * 0.2;
        dt = real * timeScale;
        if (st === S_COUNT) {
            cdT += real;
            if (cdT >= 3) {
                st = S_RACE; raceT = 0; SR.audio.beep(true);
                for (k = 0; k < nPl; k++) {
                    q = pls[k]; popMsgQ(q, T('go'), '#7dff6a', 1);
                    if (q.rocket) { q.perfT = 1.6; q.nitro = Math.min(100, q.nitro + 20); popMsgQ(q, T('rocket'), '#ffd23f', 1); SR.audio.nitro(true); q.flash = 0.4; q.flashCol = '#ffd23f'; }
                }
                for (i = 1; i < 6; i++) if (cars[i].act) cars[i].speed = 800;
            } else if (((cdT * 1) | 0) !== (((cdT - real) * 1) | 0)) SR.audio.beep(false);
        }
        for (k = 0; k < nPl; k++) { use(k); playerStep(dt); }
        if (st !== S_COUNT) {
            for (i = 1; i < 6; i++) { c = cars[i]; if (c.act) { if (c.wreck > 0) wreckStep(c, dt); else rivalStep(c, dt); } }
        }
        for (i = TR0; i < TR1; i++) trafficStep(cars[i], dt);
        if (st !== S_COUNT) collisions();
        particlesStep(real);
        raceFlow(dt);
        for (k = 0; k < nPl; k++) {
            q = pls[k]; c = cars[PIDX[k]];
            g = groundAt(c.dist); q.camG += (g - q.camG) * Math.min(1, real * 14);
            cv = segCurve[segIdx(c.dist - PLAYERZ)]; spp = c.speed / MAXS;
            q.bgOff1 += cv * spp * 14 * real; q.bgOff2 += cv * spp * 30 * real;
            q.depth = DEPTH0 * (1 - 0.2 * q.zoomK);
        }
    }

    /* ---------------- rendering ---------------- */
    var bsx = new Float32Array(DMAX + 2), bsy = new Float32Array(DMAX + 2), bsw = new Float32Array(DMAX + 2), bsc = new Float32Array(DMAX + 2),
        bz = new Float32Array(DMAX + 2), clipA = new Float32Array(DMAX + 2), bucket = new Int16Array(DMAX + 2), nextC = new Int16Array(NCARS);
    var fonts = {};
    function font(sz, bold) { var k = sz * (bold ? 1 : -1), f = fonts[k]; if (!f) { f = (bold ? 'bold ' : '') + sz + 'px ' + FONT; fonts[k] = f; } return f; }
    function text(s, x, y, sz, col, align, outline) {
        ctx.font = font(sz, true); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
        if (outline !== 0) { ctx.lineWidth = Math.max(3, sz * 0.13); ctx.strokeStyle = 'rgba(0,0,10,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
        ctx.fillStyle = col; ctx.fillText(s, x, y);
    }
    function star(x, y, r, on) {
        var i, a;
        ctx.beginPath();
        for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * (i & 1 ? r * 0.45 : r), y + Math.sin(a) * (i & 1 ? r * 0.45 : r)); }
        ctx.closePath();
        ctx.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.18)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff3b0' : 'rgba(255,255,255,0.4)'; ctx.stroke();
    }
    function coinIcon(x, y, r) {
        ctx.fillStyle = '#ffb800'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, 7); ctx.fill();
        ctx.fillStyle = '#c98500'; ctx.fillRect(x - r * 0.12, y - r * 0.45, r * 0.24, r * 0.9);
    }
    function panel(x, y, w, h, a) {
        ctx.globalAlpha = a || 0.78; ctx.fillStyle = '#080818'; SR.art.rr(ctx, x, y, w, h, 14); ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(120,200,255,0.35)'; ctx.stroke();
    }
    function focusBox(x, y, w, h, on) {
        if (on) {
            var p = 0.5 + 0.5 * Math.sin(simT * 8);
            ctx.fillStyle = 'rgba(255,210,63,0.20)'; SR.art.rr(ctx, x, y, w, h, 12); ctx.fill();
            ctx.lineWidth = 5; ctx.strokeStyle = p > 0.5 ? '#ffd23f' : '#fff3b0'; SR.art.rr(ctx, x, y, w, h, 12); ctx.stroke();
        } else { ctx.fillStyle = 'rgba(255,255,255,0.07)'; SR.art.rr(ctx, x, y, w, h, 12); ctx.fill(); }
    }
    function arrow(x, y, dir, on) {
        var p = on ? 0.5 + 0.5 * Math.sin(simT * 6) : 0;
        ctx.fillStyle = on ? '#ffd23f' : 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.moveTo(x - dir * (14 - p * 4), y); ctx.lineTo(x + dir * (6 - p * 4), y - 14); ctx.lineTo(x + dir * (6 - p * 4), y + 14); ctx.closePath(); ctx.fill();
    }

    function drawSpr(o, sc, sx, sy, clipY, alpha) {
        var c = o.c, dw = o.ww * sc * XK, dh = dw * o.ratio, dx = sx - dw / 2, dy = sy - dh, ch;
        if (dw < 1.5 || dx > W || dx + dw < 0) return;
        ch = clipY > 0 ? Math.max(0, dy + dh - clipY) : 0;
        if (ch >= dh) return;
        if (alpha < 1) ctx.globalAlpha = alpha;
        if (ch > 0) ctx.drawImage(c, 0, 0, c.width, c.height * (1 - ch / dh), dx, dy, dw, dh - ch);
        else ctx.drawImage(c, dx, dy, dw, dh);
        if (alpha < 1) ctx.globalAlpha = 1;
    }

    function renderWorld() {
        var th = theme, spr = SR.spr, bgl = spr.bg[trackIdx], camPos, i, n, idx, baseIdx, basePct, camX0, camYv, D = nVp > 1 ? Math.min(drawDist, tier === 'high' ? 110 : 75) : drawDist, dx, xa, maxy, dd = pl.depth, vi = K;
        var x1, y1, w1, x2, y2, w2, al, mid, hh1, hh2, wl, lim, c, p, sc, sx, sy, a, fade, clip, cc, cdesc, set, k, id, so;
        camPos = ((P.dist - PLAYERZ) % trackLen + trackLen) % trackLen;
        baseIdx = (camPos / SEG) | 0; basePct = (camPos - baseIdx * SEG) / SEG;
        camX0 = P.x * ROADW; camYv = CAMH + pl.camG + (pl.y - groundAt(P.dist)) * 0.4;
        ctx.drawImage(bgl.sky, 0, 0, 960, 238, 0, 0, W, HZ + 6 * VS);
        var o1 = ((pl.bgOff1 % 1920) + 1920) % 1920, o2 = ((pl.bgOff2 % 1920) + 1920) % 1920, fh = bgl.far.height * VS, nh = bgl.near.height * VS;
        ctx.drawImage(bgl.far, -o1, HZ - fh + 3, 1920, fh); ctx.drawImage(bgl.far, 1920 - o1, HZ - fh + 3, 1920, fh);
        ctx.drawImage(bgl.near, -o2, HZ - nh + 3, 1920, nh); ctx.drawImage(bgl.near, 1920 - o2, HZ - nh + 3, 1920, nh);
        ctx.fillStyle = gLc[0]; ctx.fillRect(0, HZ, W / 2, VH - HZ); ctx.fillStyle = gRc[0]; ctx.fillRect(W / 2, HZ, W / 2, VH - HZ);
        dx = -(segCurve[baseIdx] * basePct); xa = 0;
        for (n = 0; n <= D; n++) {
            idx = baseIdx + n; if (idx >= N) idx -= N;
            bz[n] = (n - basePct) * SEG;
            if (bz[n] > dd) {
                bsc[n] = dd / bz[n];
                bsx[n] = W / 2 + bsc[n] * (xa - camX0) * XK;
                bsy[n] = HZ - bsc[n] * (segY[idx] - camYv) * YK;
                bsw[n] = bsc[n] * ROADW * XK;
            } else { bsc[n] = 0; bsy[n] = 9999; }
            xa += dx; dx += segCurve[idx];
        }
        maxy = VH; lim = tier === 'low' ? 60 : 85;
        ctx.lineJoin = 'miter';
        for (n = 0; n < D; n++) {
            idx = baseIdx + n; if (idx >= N) idx -= N;
            clipA[n] = maxy;
            if (bz[n] <= dd || bsy[n + 1] >= bsy[n] || bsy[n + 1] >= maxy) continue;
            x1 = bsx[n]; y1 = bsy[n]; w1 = bsw[n]; x2 = bsx[n + 1]; y2 = bsy[n + 1]; w2 = bsw[n + 1];
            al = ((idx / 3) | 0) & 1;
            if (sameG) { ctx.fillStyle = gLc[al]; ctx.fillRect(0, y2, W, y1 - y2 + 1); }
            else { mid = (x1 + x2) * 0.5; ctx.fillStyle = gLc[al]; ctx.fillRect(0, y2, mid, y1 - y2 + 1); ctx.fillStyle = gRc[al]; ctx.fillRect(mid, y2, W - mid, y1 - y2 + 1); }
            ctx.fillStyle = th.rumble[al]; ctx.beginPath();
            ctx.moveTo(x1 - w1 * WALLX, y1); ctx.lineTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 - w2 * WALLX, y2); ctx.closePath();
            ctx.moveTo(x1 + w1 * WALLX, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 + w2 * WALLX, y2); ctx.closePath(); ctx.fill();
            ctx.fillStyle = idx === 0 ? '#ffffff' : th.road[al]; ctx.beginPath();
            ctx.moveTo(x1 - w1, y1); ctx.lineTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x2 - w2, y2); ctx.closePath(); ctx.fill();
            if (n < lim && idx !== 0) {
                ctx.fillStyle = th.lane; ctx.beginPath();
                wl = 0.012;
                ctx.moveTo(x1 - w1 * (0.95 + wl), y1); ctx.lineTo(x1 - w1 * (0.95 - wl), y1); ctx.lineTo(x2 - w2 * (0.95 - wl), y2); ctx.lineTo(x2 - w2 * (0.95 + wl), y2); ctx.closePath();
                ctx.moveTo(x1 + w1 * (0.95 - wl), y1); ctx.lineTo(x1 + w1 * (0.95 + wl), y1); ctx.lineTo(x2 + w2 * (0.95 + wl), y2); ctx.lineTo(x2 + w2 * (0.95 - wl), y2); ctx.closePath();
                if (al === 0) {
                    ctx.moveTo(x1 - w1 * wl, y1); ctx.lineTo(x1 + w1 * wl, y1); ctx.lineTo(x2 + w2 * wl, y2); ctx.lineTo(x2 - w2 * wl, y2); ctx.closePath();
                    ctx.moveTo(x1 - w1 * (0.5 + wl), y1); ctx.lineTo(x1 - w1 * (0.5 - wl), y1); ctx.lineTo(x2 - w2 * (0.5 - wl), y2); ctx.lineTo(x2 - w2 * (0.5 + wl), y2); ctx.closePath();
                    ctx.moveTo(x1 + w1 * (0.5 - wl), y1); ctx.lineTo(x1 + w1 * (0.5 + wl), y1); ctx.lineTo(x2 + w2 * (0.5 + wl), y2); ctx.lineTo(x2 + w2 * (0.5 - wl), y2); ctx.closePath();
                }
                ctx.fill();
            }
            hh1 = bsc[n] * WALLH * YK; hh2 = bsc[n + 1] * WALLH * YK;
            ctx.fillStyle = th.wall[al]; ctx.beginPath();
            ctx.moveTo(x1 - w1 * WALLX, y1); ctx.lineTo(x2 - w2 * WALLX, y2); ctx.lineTo(x2 - w2 * WALLX, y2 - hh2); ctx.lineTo(x1 - w1 * WALLX, y1 - hh1); ctx.closePath();
            ctx.moveTo(x1 + w1 * WALLX, y1); ctx.lineTo(x2 + w2 * WALLX, y2); ctx.lineTo(x2 + w2 * WALLX, y2 - hh2); ctx.lineTo(x1 + w1 * WALLX, y1 - hh1); ctx.closePath(); ctx.fill();
            ctx.fillStyle = th.wallTop; ctx.beginPath();
            ctx.moveTo(x1 - w1 * WALLX, y1 - hh1 * 0.82); ctx.lineTo(x2 - w2 * WALLX, y2 - hh2 * 0.82); ctx.lineTo(x2 - w2 * WALLX, y2 - hh2); ctx.lineTo(x1 - w1 * WALLX, y1 - hh1); ctx.closePath();
            ctx.moveTo(x1 + w1 * WALLX, y1 - hh1 * 0.82); ctx.lineTo(x2 + w2 * WALLX, y2 - hh2 * 0.82); ctx.lineTo(x2 + w2 * WALLX, y2 - hh2); ctx.lineTo(x1 + w1 * WALLX, y1 - hh1); ctx.closePath(); ctx.fill();
            maxy = y1;
        }
        ctx.fillStyle = fogGrad; ctx.fillRect(0, HZ - 4, W, 90 * VS);
        for (n = 0; n <= D; n++) bucket[n] = -1;
        for (i = 0; i < NCARS; i++) {
            c = cars[i];
            csx[i * 2 + vi] = -999;
            if (!c.act || i === PIDX[vi]) continue;
            n = ((((c.dist % trackLen) + trackLen) % trackLen) / SEG) | 0; n = n - baseIdx; if (n < 0) n += N;
            if (n >= D) continue;
            nextC[i] = bucket[n]; bucket[n] = i;
        }
        set = spr.scen[trackIdx];
        for (n = D - 1; n >= 0; n--) {
            idx = baseIdx + n; if (idx >= N) idx -= N;
            if (bsc[n] <= 0) continue;
            clip = clipA[n]; fade = n > D * 0.78 ? 1 - (n - D * 0.78) / (D * 0.22) : 1;
            for (k = 0; k < 2; k++) {
                id = sprId[idx * 2 + k];
                if (id) { so = set[id - 1]; drawSpr(so, bsc[n], bsx[n] + bsw[n] * sprX[idx * 2 + k], bsy[n], clip, fade); }
            }
            if (idx === 0) drawGate(n);
            for (i = bucket[n]; i >= 0; i = nextC[i]) {
                cc = cars[i];
                p = (((cc.dist % trackLen) + trackLen) % trackLen) / SEG; p = p - Math.floor(p);
                sc = bsc[n] + (bsc[n + 1] - bsc[n]) * p; sx = bsx[n] + (bsx[n + 1] - bsx[n]) * p + (bsw[n] + (bsw[n + 1] - bsw[n]) * p) * cc.x; sy = bsy[n] + (bsy[n + 1] - bsy[n]) * p;
                csx[i * 2 + vi] = sx; csy[i * 2 + vi] = sy; csc[i * 2 + vi] = sc;
                if (cc.blink > 0 && ((simT * 14) | 0) % 2) continue;
                a = fade;
                cdesc = spr.cars[cc.spr];
                if (cc.wreck > 0) {
                    ctx.save(); ctx.translate(sx, sy - cdesc.ww * sc * XK * cdesc.ratio * 0.4); ctx.rotate(cc.spin);
                    drawSpr(cdesc, sc, 0, cdesc.ww * sc * XK * cdesc.ratio * 0.4, 0, a); ctx.restore();
                } else drawSpr(cdesc, sc, sx, sy, clipA[n], a);
            }
        }
    }
    function drawGate(n) {
        var s = bsc[n], x = bsx[n], w = bsw[n], y = bsy[n], top = y - 900 * s * YK, i, bwid = w * 0.12, cell = w * 2.3 / 14;
        if (s <= 0 || w < 6) return;
        ctx.fillStyle = '#2a2a38'; ctx.fillRect(x - w * 1.25, top, bwid * 0.6, y - top); ctx.fillRect(x + w * 1.25 - bwid * 0.6, top, bwid * 0.6, y - top);
        for (i = 0; i < 14; i++) { ctx.fillStyle = i & 1 ? '#ffffff' : '#111'; ctx.fillRect(x - w * 1.25 + i * cell, top - 60 * s * YK, cell + 1, 60 * s * YK); ctx.fillStyle = i & 1 ? '#111' : '#fff'; ctx.fillRect(x - w * 1.25 + i * cell, top, cell + 1, 60 * s * YK); }
    }

    var glowC = null, flameC = null;
    function glowSpr() {
        if (!glowC) { glowC = SR.art.mk(64, 64); var g = glowC.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,60,60,1)'); gr.addColorStop(0.4, 'rgba(255,40,60,0.5)'); gr.addColorStop(1, 'rgba(255,0,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
        return glowC;
    }
    function flame(x, y, f) {
        if (!flameC) {
            flameC = SR.art.mk(48, 160); var g = flameC.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 160);
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(120,220,255,0.95)'); gr.addColorStop(0.6, 'rgba(60,120,255,0.55)'); gr.addColorStop(1, 'rgba(60,60,255,0)');
            g.fillStyle = gr; g.beginPath(); g.moveTo(24, 0); g.bezierCurveTo(52, 30, 40, 120, 24, 160); g.bezierCurveTo(8, 120, -4, 30, 24, 0); g.fill();
        }
        var len = (70 + rnd() * 40) * f * (XK / 480), wd = (22 + rnd() * 8) * (0.5 + 0.5 * f) * (XK / 480);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, f * 1.2);
        ctx.drawImage(flameC, x - wd / 2, y - 6, wd, len);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function renderPlayer() {
        var d = SR.spr.cars[P.spr], dw, dh, bx = W / 2 + (pl.driftAng * -42 + pl.lean * 6) * XK / 480, by = PBY + pl.bounce, air = (pl.y - groundAt(P.dist)) * 0.6 * (1 / CAMH) * YK, i, gs;
        dw = d.ww * (1 / CAMH) * XK; dh = dw * d.ratio;
        if (air > 0) by -= Math.min(air * 0.5, 120 * VS);
        ctx.save();
        ctx.translate(bx, by); ctx.rotate(pl.driftAng * 0.22 + pl.lean * 0.03);
        if (pl.nitroLvl > 0.08) for (i = -1; i <= 1; i += 2) flame(i * dw * 0.28, -dh * 0.17, pl.nitroLvl);
        ctx.drawImage(d.c, -dw / 2, -dh, dw, dh);
        if (pl.brake) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; gs = glowSpr(); ctx.drawImage(gs, -dw * 0.42, -dh * 0.5, dw * 0.3, dw * 0.3); ctx.drawImage(gs, dw * 0.12, -dh * 0.5, dw * 0.3, dw * 0.3); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
        ctx.restore();
    }
    function renderFx(vi) {
        var i, n = tier === 'low' ? 70 : NP, a, k, sp = P.speed / MAXS, amt, r0, r1, cx = W / 2, cy = HZ - 10 * VS;
        amt = clamp((sp - 0.75) * 1.4 + pl.nitroLvl * 0.7, 0, 1);
        if (amt > 0.02) {
            ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.1 + 0.35 * amt; ctx.lineWidth = 2 + amt * 2; ctx.beginPath();
            for (i = 0; i < (tier === 'low' || nVp > 1 ? 14 : NLINES); i++) {
                lnT[i] += (0.9 + sp * 1.4 + pl.nitroLvl) * lnS[i] * 0.016; if (lnT[i] > 1) { lnT[i] = 0; lnA[i] = Math.random() * 6.283; }
                a = lnA[i]; r0 = 90 + lnT[i] * lnT[i] * 620; r1 = r0 + 20 + lnT[i] * 160 * amt;
                ctx.moveTo(cx + Math.cos(a) * r0 * 1.5, cy + Math.sin(a) * r0 * 0.9 * VS); ctx.lineTo(cx + Math.cos(a) * r1 * 1.5, cy + Math.sin(a) * r1 * 0.9 * VS);
            }
            ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (tier !== 'low' && pl.nitroLvl > 0.2) {
            var z = 1 + 0.025 * pl.nitroLvl, cw = canvas.width, ch = VH * cs, sy0 = vi * VH * cs;
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.22 * pl.nitroLvl;
            ctx.drawImage(canvas, 0, sy0, cw, ch, -cw * (z - 1) / 2, sy0 - ch * (z - 1) * 0.42, cw * z, ch * z);
            ctx.globalAlpha = 1;
            ctx.setTransform(cs, 0, 0, cs, pl.camShX * cs, (vi * VH + pl.camShY) * cs);
        }
        for (i = 0; i < n; i++) {
            if (plife[i] <= 0 || pvp[i] !== vi) continue;
            k = plife[i] / pmax[i];
            if (ptype[i] === 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k; ctx.fillStyle = '#ffa040'; ctx.fillRect(px[i], py[i], psize[i], psize[i]); }
            else if (ptype[i] === 1) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = k * 0.4; ctx.fillStyle = '#d2d2dc'; ctx.beginPath(); ctx.arc(px[i], py[i], psize[i] * (2.2 - k), 0, 7); ctx.fill(); }
            else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k * 0.6; ctx.fillStyle = '#ff6a14'; ctx.beginPath(); ctx.arc(px[i], py[i], psize[i] * (0.6 + k), 0, 7); ctx.fill(); }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        if (theme.snow) {
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            for (i = 0; i < (tier === 'low' ? 30 : NSNOW); i++) ctx.fillRect(snx[i], sny[i] * VS, 2.5, 2.5);
        }
    }

    /* ---------------- HUD ---------------- */
    var spLast = [-1, -1], spStr = ['0', '0'], timeStr = '0:00.00', timeTick = -1, lapStr = ['', ''], lapLast = [-1, -1], tdStr = ['0', '0'], tdLast = [-1, -1], plcLast = [-1, -1], plcStr = ['', ''], totStr = '';
    function resetHudCache() { lapLast[0] = lapLast[1] = tdLast[0] = tdLast[1] = plcLast[0] = plcLast[1] = spLast[0] = spLast[1] = timeTick = -1; totStr = '/ ' + (nRivals + 1); }
    function lapCache(k) { if (pl.curLap !== lapLast[k]) { lapLast[k] = pl.curLap; lapStr[k] = T('lap') + ' ' + pl.curLap + '/' + laps; } return lapStr[k]; }
    function tdCache(k) { if (tdLast[k] !== pl.takedowns) { tdLast[k] = pl.takedowns; tdStr[k] = T('takedowns') + ' ' + pl.takedowns; } return tdStr[k]; }
    function plcCache(k, tot) { if (plcLast[k] !== pl.place) { plcLast[k] = pl.place; plcStr[k] = tot ? pl.place + '/' + tot : '' + pl.place; } return plcStr[k]; }
    function drawMiniMap(mx, my, sc) {
        var i, c, idx, big;
        ctx.fillStyle = 'rgba(5,5,20,0.6)'; SR.art.rr(ctx, mx - 4, my - 4, 160 * sc + 8, 108 * sc + 8, 10); ctx.fill();
        ctx.drawImage(mapC, mx, my, 160 * sc, 108 * sc);
        for (i = P2I; i >= 0; i--) {
            if (i >= TR0 && i < P2I) continue;
            c = cars[i];
            if (i !== 0 && !c.act) continue;
            idx = ((((c.dist % trackLen) + trackLen) % trackLen) / trackLen * 200) | 0;
            big = i === 0 || i === P2I;
            ctx.fillStyle = i === 0 ? '#ffd23f' : (i === P2I ? '#4de1ff' : SR.RIVAL_COLORS[i - 1]);
            ctx.beginPath(); ctx.arc(mx + mapX[idx] * sc, my + mapY[idx] * sc, (big ? 6 : 4.2) * Math.max(0.7, sc), 0, 7); ctx.fill();
            if (big) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        }
    }
    function renderHUD() {
        var kmh = (P.speed / MAXS * 250) | 0, nit, bx, by, remain, k = K, msg = pl.msg, mk, a;
        if (kmh !== spLast[k]) { spLast[k] = kmh; spStr[k] = '' + kmh; }
        text(spStr[k], W - 60, H - 66, 64, pl.nitroLvl > 0.3 ? '#7fe9ff' : '#ffffff', 'right');
        text(T('kmh'), W - 60, H - 28, 24, '#cfd6ff', 'right');
        nit = pl.nitro / 100; bx = W / 2 - 190; by = H - 62;
        ctx.fillStyle = 'rgba(5,5,20,0.7)'; SR.art.rr(ctx, bx - 6, by - 6, 392, 40, 12); ctx.fill();
        if (nit > 0.001) { ctx.fillStyle = nitroGrad; SR.art.rr(ctx, bx, by, Math.max(10, 380 * nit), 28, 8); ctx.fill(); }
        ctx.lineWidth = 3; ctx.strokeStyle = nit > 0.98 && ((simT * 6) | 0) % 2 ? '#ffd23f' : 'rgba(255,255,255,0.7)'; SR.art.rr(ctx, bx, by, 380, 28, 8); ctx.stroke();
        text(T('nitro'), W / 2, by - 20, 24, '#cfd6ff', 'center');
        if (nRivals > 0) {
            text(plcCache(k, 0), 56, 70, 76, pl.place === 1 ? '#ffd23f' : '#ffffff', 'left');
            text(totStr, 56 + (pl.place > 9 ? 90 : 52), 82, 32, '#cfd6ff', 'left');
            text(T('pos'), 56, 28, 24, '#cfd6ff', 'left');
        } else text(T('time'), 56, 30, 24, '#cfd6ff', 'left');
        if (evType === 2) {
            remain = Math.max(0, timeLimit - raceT);
            if ((remain * 10 | 0) !== timeTick) { timeTick = remain * 10 | 0; timeStr = remain.toFixed(1); }
            text(timeStr, W / 2, 52, 56, remain < 10 ? '#ff5a5a' : '#ffffff', 'center');
            text(tdCache(k), W / 2, 100, 30, '#ffd23f', 'center');
        } else {
            if ((raceT * 10 | 0) !== timeTick) { timeTick = raceT * 10 | 0; timeStr = fmtTime(raceT); }
            text(timeStr, W / 2, 46, 42, '#ffffff', 'center');
            text(lapCache(k), W / 2, 90, 32, '#cfd6ff', 'center');
            if (nRivals && pl.takedowns > 0) { text(tdCache(k), W / 2, 128, 24, '#ffd23f', 'center'); }
        }
        drawMiniMap(W - 48 - 160, 30, 1);
        if (msg.t > 0) { mk = msg.t > 1.4 ? 1 + (msg.t - 1.4) * 2.5 : 1; a = Math.min(1, msg.t * 2); ctx.globalAlpha = a; text(msg.text, W / 2, 175, (msg.big ? 64 : 40) * mk, msg.col, 'center'); ctx.globalAlpha = 1; }
        if (pl.msg2.t > 0) { ctx.globalAlpha = Math.min(1, pl.msg2.t * 2); text(pl.msg2.text, W / 2, 232, 34, '#ffffff', 'center'); ctx.globalAlpha = 1; }
        if (st === S_COUNT) renderCountdown(200, 300, 1);
    }
    function renderCountdown(y, y2, sc) {
        var n3 = 3 - (cdT | 0), fr = cdT - (cdT | 0), sz = (150 + (1 - fr) * 50) * sc;
        if (n3 < 1) return;
        ctx.globalAlpha = 1 - fr * 0.5; text('' + n3, W / 2, y, sz, n3 === 1 ? '#7dff6a' : '#ffd23f', 'center'); ctx.globalAlpha = 1;
        if (cdT > 2.4) text('OK', W / 2, y2, 34 * Math.max(0.7, sc), '#cfd6ff', 'center');
    }
    function renderHUDSplit() {
        var kmh = (P.speed / MAXS * 250) | 0, nit, bx = 48, by = VH - 34, k = K, msg = pl.msg, a;
        if (kmh !== spLast[k]) { spLast[k] = kmh; spStr[k] = '' + kmh; }
        text(spStr[k], W - 52, VH - 40, 44, pl.nitroLvl > 0.3 ? '#7fe9ff' : '#ffffff', 'right');
        text(T('kmh'), W - 52, VH - 14, 20, '#cfd6ff', 'right');
        nit = pl.nitro / 100;
        ctx.fillStyle = 'rgba(5,5,20,0.7)'; SR.art.rr(ctx, bx - 4, by - 4, 228, 28, 8); ctx.fill();
        if (nit > 0.001) { ctx.fillStyle = nitroGrad; SR.art.rr(ctx, bx, by, Math.max(8, 220 * nit), 20, 6); ctx.fill(); }
        ctx.lineWidth = 2; ctx.strokeStyle = nit > 0.98 && ((simT * 6) | 0) % 2 ? '#ffd23f' : 'rgba(255,255,255,0.7)'; SR.art.rr(ctx, bx, by, 220, 20, 6); ctx.stroke();
        text(K ? T('p2') : T('p1'), 56, 26, 24, K ? '#4de1ff' : '#ffd23f', 'left');
        text(plcCache(k, 2), 56, 62, 40, pl.place === 1 ? '#ffd23f' : '#ffffff', 'left');
        if ((raceT * 10 | 0) !== timeTick) { timeTick = raceT * 10 | 0; timeStr = fmtTime(raceT); }
        text(lapCache(k), W / 2, 24, 26, '#cfd6ff', 'center');
        text(timeStr, W / 2, 56, 30, '#ffffff', 'center');
        drawMiniMap(W - 48 - 96, 12, 0.6);
        if (msg.t > 0) { a = Math.min(1, msg.t * 2); ctx.globalAlpha = a; text(msg.text, W / 2, 112, msg.big ? 42 : 30, msg.col, 'center'); ctx.globalAlpha = 1; }
        if (st === S_COUNT) renderCountdown(120, 170, 0.6);
    }

    function renderScene() {
        var vi, sx, sy, m, q;
        for (vi = 0; vi < nVp; vi++) {
            use(vi); q = pl;
            ctx.setTransform(cs, 0, 0, cs, 0, 0);
            if (nVp > 1) { ctx.save(); ctx.beginPath(); ctx.rect(0, vi * VH, W, VH); ctx.clip(); }
            sx = 0; sy = 0;
            if (q.shk > 0 || P.speed > MAXS * 0.9) { m = q.shk * 14 * VS + (q.nitroLvl * 1.2 + (P.speed > MAXS * 0.9 ? 0.5 : 0)); sx = (rnd() - 0.5) * m; sy = (rnd() - 0.5) * m; }
            q.camShX = sx; q.camShY = sy;
            ctx.setTransform(cs, 0, 0, cs, sx * cs, (vi * VH + sy) * cs);
            renderWorld();
            if (st !== S_GARAGE && st !== S_QUICK && st !== S_MP) renderPlayer();
            renderFx(vi);
            ctx.setTransform(cs, 0, 0, cs, 0, vi * VH * cs);
            if (q.flash > 0) { ctx.globalAlpha = Math.min(0.5, q.flash); ctx.fillStyle = q.flashCol; ctx.fillRect(0, 0, W, VH); ctx.globalAlpha = 1; }
            if (st === S_RACE || st === S_COUNT) { if (nVp > 1) renderHUDSplit(); else renderHUD(); }
            if (nVp > 1) ctx.restore();
        }
        ctx.setTransform(cs, 0, 0, cs, 0, 0);
        if (nVp > 1) { ctx.fillStyle = '#000'; ctx.fillRect(0, VH - 3, W, 6); ctx.fillStyle = '#12e6ff'; ctx.fillRect(0, VH - 1, W, 2); }
    }

    /* ---------------- menus ---------------- */
    var menuSel = 0, careerSel = 0, garRow = 0, garCar = 0, toast = '', toastT = 0, qRow = 0, mRow = 0, qCar = 0, mCar1 = 0, mCar2 = 0;
    var mainItems = ['campaign', 'quick', 'multi', 'garage', 'howto'];
    var locStr = ['', '', ''];

    function drawBackdropTint(a) { ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    function topBar() {
        coinIcon(60, 36, 14); text('' + sv.coins, 84, 36, 30, '#ffe27a', 'left');
        star(W - 150, 36, 15, true); text('' + totalStars() + '/' + (NEV * 3), W - 124, 36, 30, '#ffffff', 'left');
    }
    var titleC = null;
    function buildTitle() {
        var g, c = SR.art.mk(W, H), ctx0 = ctx;
        ctx = c.getContext('2d');
        g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(0,0,10,0.65)'); g.addColorStop(0.5, 'rgba(0,0,10,0.15)'); g.addColorStop(1, 'rgba(0,0,10,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.shadowColor = '#ff2bd6'; ctx.shadowBlur = 24; text(T('title'), W / 2, 150, 92, '#ffffff', 'center', 0); ctx.restore();
        ctx.save(); ctx.shadowColor = '#12e6ff'; ctx.shadowBlur = 16; text(T('sub'), W / 2, 222, 34, '#7fe9ff', 'center', 0); ctx.restore();
        ctx = ctx0; titleC = c;
    }
    function renderTitle() {
        ctx.drawImage(titleC, 0, 0, W, H);
        if (((simT * 1.6) | 0) % 2 === 0) text(T('press'), W / 2, 440, 38, '#ffffff', 'center');
    }
    function renderMain() {
        var i, y;
        drawBackdropTint(0.45); topBar();
        text(T('title'), W / 2, 84, 60, '#ffffff', 'center');
        for (i = 0; i < 5; i++) {
            y = 140 + i * 74; focusBox(W / 2 - 230, y, 460, 62, i === menuSel);
            text(T(mainItems[i]), W / 2, y + 32, i === menuSel ? 36 : 32, i === menuSel ? '#ffffff' : '#cfd6ff', 'center');
        }
    }
    function renderHelp() {
        var i;
        drawBackdropTint(0.55); topBar();
        text(T('howto'), W / 2, 90, 48, '#ffffff', 'center');
        panel(90, 130, 780, 300, 0.8);
        for (i = 0; i < 6; i++) text(T(KH[i]), W / 2, 168 + i * 46, 25, '#ffffff', 'center', 0);
        focusBox(W / 2 - 150, 452, 300, 56, true); text(T('back'), W / 2, 481, 32, '#ffffff', 'center');
    }
    function renderCareer() {
        var y, idx, ok, s, e;
        drawBackdropTint(0.5); topBar();
        text(T(KTR[trackIdx]), W / 2, 84, 52, '#ffffff', 'center');
        text(T(KTH[trackIdx]) + '  ' + (trackIdx + 1) + '/' + NTRACKS, W / 2, 124, 24, '#7fe9ff', 'center');
        arrow(150, 84, 1, true); arrow(W - 150, 84, -1, true);
        for (e = 0; e < 3; e++) {
            idx = trackIdx * 3 + e; ok = evUnlocked(idx); y = 150 + e * 106;
            focusBox(170, y, 620, 94, careerSel === e);
            ctx.globalAlpha = ok ? 1 : 0.5;
            text(T(KEV[e]), 200, y + 32, 34, '#ffffff', 'left');
            text(ok ? T(KEVD[e]) : locStr[e], 200, y + 68, 22, ok ? '#cfd6ff' : '#ff9a9a', 'left', 0);
            for (s = 0; s < 3; s++) star(660 + s * 40, y + 34, 16, sv.stars[idx] > s);
            if (ok && sv.btime[idx] && e < 2) text(fmtTime(sv.btime[idx]), 770, y + 72, 22, '#ffe27a', 'right', 0);
            ctx.globalAlpha = 1;
        }
        focusBox(W / 2 - 150, 472, 300, 52, careerSel === 3); text(T('back'), W / 2, 499, 30, '#ffffff', 'center');
    }
    function anyNext(cur, d) { return (cur + d + NCAR) % NCAR; }
    function ownedNext(cur, d) { var i = cur, n; for (n = 0; n < NCAR; n++) { i = (i + d + NCAR) % NCAR; if (sv.owned[i]) return i; } return cur; }
    function drawCarBig(ci, cx, base, w) { var d = SR.spr.cars[ci]; ctx.drawImage(d.c, cx - w / 2, base - w * d.ratio, w, w * d.ratio); }
    function selRow(y, h, on, label, labelCol, value, valCol) {
        focusBox(130, y, 700, h, on);
        text(label, 154, y + h / 2, 24, labelCol, 'left', 0);
        text(value, W / 2 + 55, y + h / 2, 28, valCol, 'center');
        arrow(W / 2 - 150, y + h / 2, 1, on); arrow(W / 2 + 260, y + h / 2, -1, on);
    }
    function renderSetup(mp) {
        var r = mp ? mRow : qRow, y = 100, ok = trackUnlocked(trackIdx), h = 52, startRow = mp ? 4 : 3, ci;
        drawBackdropTint(0.55); topBar();
        text(T(mp ? 'multi' : 'quick'), W / 2, 62, 46, '#ffffff', 'center');
        selRow(y, h, r === 0, T('track'), '#cfd6ff', T(KTR[trackIdx]), ok ? '#ffffff' : '#ff9a9a'); y += h + 8;
        selRow(y, h, r === 1, T('laps'), '#cfd6ff', '' + sv.ql, '#ffffff'); y += h + 8;
        ci = mp ? mCar1 : qCar;
        selRow(y, h, r === 2, mp ? T('p1') : T('car'), mp ? '#ffd23f' : '#cfd6ff', CARS[ci].brand + ' ' + CARS[ci].name, CARS[ci].col);
        if (mp) text(devName(mpDev[0]), 154, y + h - 7, 18, '#ffd23f', 'left', 0);
        y += h + 8;
        if (mp) {
            if (mpDev[1]) { selRow(y, h, r === 3, T('p2'), '#4de1ff', CARS[mCar2].brand + ' ' + CARS[mCar2].name, CARS[mCar2].col); text(devName(mpDev[1]), 154, y + h - 7, 18, '#4de1ff', 'left', 0); }
            else { focusBox(130, y, 700, h, r === 3); text(T('p2'), 154, y + h / 2, 24, '#4de1ff', 'left', 0); if (((simT * 2) | 0) % 2 === 0) text(T('join2'), W / 2 + 55, y + h / 2, 26, '#ffffff', 'center'); }
            y += h + 8;
        }
        focusBox(250, y, 220, 56, r === startRow); text(T('start'), 360, y + 29, 30, ok && (!mp || mpDev[1]) ? '#7dff6a' : '#888', 'center');
        focusBox(490, y, 220, 56, r === startRow + 1); text(T('back'), 600, y + 29, 30, '#ffffff', 'center');
        y += 70;
        if (!ok) text(T('locked') + ' - ' + T('need').replace('%n', '' + (trackIdx * 6)), W / 2, y, 24, '#ff9a9a', 'center', 0);
        else text(T(mp ? 'mpnote' : 'qnote'), W / 2, y, 22, '#cfd6ff', 'center', 0);
        if (mp) { drawCarBig(mCar1, 230, 530, 190); if (mpDev[1]) drawCarBig(mCar2, 730, 530, 190); } else drawCarBig(qCar, W / 2, 530, 190);
    }
    function renderGarage() {
        var ci = garCar, car = CARS[ci], own = sv.owned[ci], i, y, d = SR.spr.cars[ci], dw = 330, dh, lv, v, cost, selected = sv.car === ci, pul = 0.5 + 0.5 * Math.sin(simT * 6), locked = totalStars() < car.need;
        drawBackdropTint(0.62); topBar();
        text(car.brand.toUpperCase(), 270, 78, 26, '#cfd6ff', 'center', 0);
        text(car.name.toUpperCase(), 270, 116, 46, car.col, 'center');
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.ellipse(270, 340, 190, 34, 0, 0, 7); ctx.fill();
        dh = dw * d.ratio;
        if (!own) ctx.globalAlpha = 0.55;
        ctx.drawImage(d.c, 270 - dw / 2, 345 - dh + Math.sin(simT * 2) * 2, dw, dh); ctx.globalAlpha = 1;
        arrow(70 - pul * 5, 250, 1, true); arrow(470 + pul * 5, 250, -1, true);
        text((ci + 1) + ' / ' + NCAR, 270, 430, 22, '#cfd6ff', 'center', 0);
        if (own) text(selected ? T('selected') : T('owned'), 270, 392, 28, selected ? '#7dff6a' : '#cfd6ff', 'center');
        else if (locked) text(T('carlocked').replace('%n', '' + car.need), 270, 392, 26, '#ff9a9a', 'center');
        else { coinIcon(205, 392, 13); text('' + car.price, 226, 392, 30, sv.coins >= car.price ? '#ffe27a' : '#ff8a8a', 'left'); }
        y = 128;
        focusBox(540, y, 360, 54, garRow === 0);
        text(own ? (selected ? T('selected') : T('select')) : T('buy'), 720, y + 28, 30, '#ffffff', 'center');
        for (i = 0; i < 4; i++) {
            y = 192 + i * 62; focusBox(540, y, 360, 56, garRow === i + 1);
            lv = sv.up[ci][i]; v = carStat(ci, i);
            text(T(STATN[i]), 556, y + 17, 22, '#cfd6ff', 'left', 0);
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(556, y + 34, 200, 12);
            ctx.fillStyle = '#12e6ff'; ctx.fillRect(556, y + 34, 200 * Math.min(1, car.st[i] / 13), 12);
            ctx.fillStyle = '#ff2bd6'; ctx.fillRect(556 + 200 * Math.min(1, car.st[i] / 13), y + 34, 200 * Math.min(1, (v - car.st[i]) / 13), 12);
            if (own) {
                if (lv >= 5) text(T('maxed'), 884, y + 28, 24, '#7dff6a', 'right', 0);
                else { cost = upCost(ci, i); coinIcon(790, y + 28, 10); text('' + cost, 806, y + 28, 24, sv.coins >= cost ? '#ffe27a' : '#ff8a8a', 'left', 0); }
            }
        }
        focusBox(W / 2 + 80, 452, 300, 52, garRow === 5); text(T('back'), W / 2 + 230, 479, 30, '#ffffff', 'center');
        if (toastT > 0) text(toast, W / 2, 520, 26, '#ff9a9a', 'center');
    }
    function upCost(ci, k) { return 500 * (1 + sv.up[ci][k]) + ci * 250; }
    function renderResult() {
        var i, y, it, x, cnt = res.items.length, s, pop;
        drawBackdropTint(0.5);
        panel(150, 40, 660, 460, 0.86);
        if (res.mode === 2) {
            text(T('finished'), W / 2, 84, 40, '#ffffff', 'center');
            text(T('winner'), W / 2, 150, 28, '#cfd6ff', 'center');
            text(T(res.winner ? 'p2' : 'p1'), W / 2, 214, 64, res.winner ? '#4de1ff' : '#ffd23f', 'center');
            text(T('time'), 200, 300, 30, '#cfd6ff', 'left'); text(res.timeStr, 760, 300, 36, '#ffffff', 'right');
            text(T('gap'), 200, 352, 30, '#cfd6ff', 'left'); text(res.gapStr, 760, 352, 36, '#ffe27a', 'right');
        } else {
            text(res.reason ? T('timeup') : T('finished'), W / 2, 84, 44, '#ffffff', 'center');
            if (res.stars >= 0) for (s = 0; s < 3; s++) { pop = clamp((simT - (0.4 + s * 0.35)) * 4, 0, 1); star(W / 2 - 70 + s * 70, 150, 30 * (res.stars > s ? (1 + (1 - pop) * 0.6) : 1), res.stars > s && simT > 0.4 + s * 0.35); }
            y = 220;
            if (evType === 0) { text(T('place'), 200, y, 30, '#cfd6ff', 'left'); text(res.pos + ' / 6', 760, y, 36, res.pos === 1 ? '#ffd23f' : '#ffffff', 'right'); y += 48; }
            if (evType === 2) { text(T('takedowns'), 200, y, 30, '#cfd6ff', 'left'); text(res.td + ' / ' + res.targetStr, 760, y, 36, '#ffd23f', 'right'); y += 48; }
            else { text(T('time'), 200, y, 30, '#cfd6ff', 'left'); text(res.timeStr, 760, y, 36, '#ffffff', 'right'); y += 48; }
            if (evType === 1) { text(T('target'), 200, y, 26, '#cfd6ff', 'left'); text(res.targetStr, 760, y, 30, '#ffe27a', 'right'); y += 44; }
            else if (evType === 0 && res.td > 0) { text(T('takedowns'), 200, y, 26, '#cfd6ff', 'left'); text('' + res.td, 760, y, 30, '#ffd23f', 'right'); y += 44; }
            text(T('earned'), 200, y, 28, '#cfd6ff', 'left'); coinIcon(640, y, 13); text('' + res.coins, 760, y, 34, '#ffe27a', 'right'); y += 48;
            if (res.mode === 0) { text(T('total'), 200, y, 28, '#cfd6ff', 'left'); text('' + res.total, 760, y, 34, '#ffffff', 'right'); }
            if (res.newBest) text(T('newbest'), W / 2, y + 40, 28, '#7dff6a', 'center');
        }
        for (i = 0; i < cnt; i++) {
            it = res.items[i]; x = W / 2 + (i - (cnt - 1) / 2) * 210;
            focusBox(x - 98, 430, 196, 56, res.sel === i); text(T(it), x, 459, it === 'next' ? 22 : 26, '#ffffff', 'center', 0);
        }
    }

    /* ---------------- menu input ---------------- */
    function toMain() { st = S_MAIN; menuSel = 0; setupDemo(trackIdx); }
    function refreshLocks() {
        var e, idx;
        for (e = 0; e < 3; e++) { idx = trackIdx * 3 + e; locStr[e] = evUnlocked(idx) ? '' : T('locked') + ' - ' + T('need').replace('%n', '' + (idx * 2)); }
    }
    function openCareer() { st = S_CAREER; careerSel = 0; refreshLocks(); setupDemo(trackIdx); }
    function changeTrack(d) { trackIdx = (trackIdx + d + NTRACKS) % NTRACKS; refreshLocks(); setupDemo(trackIdx); SR.audio.tick(); }
    function tick() { SR.audio.tick(); }
    function onMenuInput(a, dev) {
        var idx, it, ni;
        if (inputLock > 0) return;
        if (st === S_TITLE) { if (a === 'confirm') { st = S_MAIN; menuSel = 0; tick(); } return; }
        if (st === S_MAIN) {
            if (a === 'up') { menuSel = (menuSel + 4) % 5; tick(); }
            else if (a === 'down') { menuSel = (menuSel + 1) % 5; tick(); }
            else if (a === 'confirm') {
                tick();
                if (menuSel === 0) openCareer();
                else if (menuSel === 1) { st = S_QUICK; qRow = 0; trackIdx = sv.qt; qCar = sv.car; setupDemo(trackIdx); }
                else if (menuSel === 2) { st = S_MP; mRow = 0; mpDev[0] = dev || 'keys'; if (mpDev[1] === mpDev[0]) mpDev[1] = null; trackIdx = sv.qt; mCar1 = sv.car; mCar2 = anyNext(sv.car, 1); setupDemo(trackIdx); }
                else if (menuSel === 3) { st = S_GARAGE; garRow = 0; garCar = sv.car; toast = ''; toastT = 0; }
                else st = S_HELP;
            }
            return;
        }
        if (st === S_HELP) { if (a === 'confirm') { st = S_MAIN; tick(); } return; }
        if (st === S_CAREER) {
            if (a === 'left') changeTrack(-1); else if (a === 'right') changeTrack(1);
            else if (a === 'up') { careerSel = (careerSel + 3) % 4; tick(); }
            else if (a === 'down') { careerSel = (careerSel + 1) % 4; tick(); }
            else if (a === 'confirm') {
                if (careerSel === 3) { toMain(); return; }
                idx = trackIdx * 3 + careerSel;
                if (evUnlocked(idx)) startEvent(trackIdx, careerSel); else SR.audio.crash(0.3);
            }
            return;
        }
        if (st === S_QUICK || st === S_MP) { setupInput(a, st === S_MP); return; }
        if (st === S_GARAGE) {
            if (a === 'left') { garCar = (garCar + NCAR - 1) % NCAR; tick(); }
            else if (a === 'right') { garCar = (garCar + 1) % NCAR; tick(); }
            else if (a === 'up') { garRow = (garRow + 5) % 6; tick(); }
            else if (a === 'down') { garRow = (garRow + 1) % 6; tick(); }
            else if (a === 'confirm') garageAction();
            return;
        }
        if (st === S_RESULT) {
            if (a === 'left') { res.sel = (res.sel + res.items.length - 1) % res.items.length; tick(); }
            else if (a === 'right') { res.sel = (res.sel + 1) % res.items.length; tick(); }
            else if (a === 'confirm') {
                it = res.items[res.sel];
                if (it === 'next') { ni = evT * 3 + evE + 1; startEvent((ni / 3) | 0, ni % 3); }
                else if (it === 'retry' || it === 'rematch') startRace();
                else if (gm.mode === 0) { trackIdx = evT; st = S_CAREER; careerSel = evE; refreshLocks(); setupDemo(trackIdx); }
                else { st = gm.mode === 1 ? S_QUICK : S_MP; setupDemo(trackIdx); }
            }
        }
    }
    function setupInput(a, mp) {
        var r = mp ? mRow : qRow, last = mp ? 5 : 4, startRow = mp ? 4 : 3, d = a === 'left' ? -1 : (a === 'right' ? 1 : 0), li;
        if (a === 'up') r = (r + last) % (last + 1);
        else if (a === 'down') r = (r + 1) % (last + 1);
        else if (d !== 0) {
            if (r === 0) { trackIdx = (trackIdx + d + NTRACKS) % NTRACKS; sv.qt = trackIdx; setupDemo(trackIdx); persist(); }
            else if (r === 1) { li = LAPS_OPT.indexOf(sv.ql); li = (li + d + LAPS_OPT.length) % LAPS_OPT.length; sv.ql = LAPS_OPT[li]; persist(); }
            else if (r === 2) { if (mp) mCar1 = anyNext(mCar1, d); else qCar = ownedNext(qCar, d); }
            else if (r === 3 && mp) mCar2 = anyNext(mCar2, d);
        } else if (a === 'confirm') {
            if (r === startRow) {
                if (!trackUnlocked(trackIdx) || (mp && !mpDev[1])) SR.audio.crash(0.3);
                else if (mp) startMP(); else startQuick();
            }
            else if (r === startRow + 1) toMain();
            return;
        } else return;
        if (mp) mRow = r; else qRow = r;
        tick();
    }
    function say(s) { toast = s; toastT = 2; }
    function garageAction() {
        var ci = garCar, k, cost;
        if (garRow === 5) { applyCar(0, sv.car); toMain(); return; }
        if (garRow === 0) {
            if (sv.owned[ci]) { sv.car = ci; applyCar(0, ci); persist(); tick(); }
            else if (totalStars() < CARS[ci].need) { say(T('carlocked').replace('%n', '' + CARS[ci].need)); SR.audio.crash(0.3); }
            else if (sv.coins >= CARS[ci].price) { sv.coins -= CARS[ci].price; sv.owned[ci] = 1; sv.car = ci; applyCar(0, ci); persist(); SR.audio.jingle(true); }
            else { say(T('nocoins')); SR.audio.crash(0.3); }
            return;
        }
        k = garRow - 1;
        if (!sv.owned[ci]) { say(T('buy')); return; }
        if (sv.up[ci][k] >= 5) return;
        cost = upCost(ci, k);
        if (sv.coins < cost) { say(T('nocoins')); SR.audio.crash(0.3); return; }
        sv.coins -= cost; sv.up[ci][k]++; if (sv.car === ci) applyCar(0, ci); persist(); SR.audio.jingle(true);
    }

    var ACTIDX = { left: 0, right: 1, up: 2, down: 3, jump: 4 };
    // Multiplayer: player 1 is the controller that opened Multiplayer, player 2 joins by pressing OK on
    // another one ('keys' = TV remote / arrows, 'keys2' = W A S D, 'pad0'..'pad3' = gamepads).
    // In a 2-player race each car reads only its own controller; any other device is ignored.
    var mpDev = ['keys', null];
    function playerOf(dev) {
        if (nPl < 2) return 0;
        return dev === mpDev[0] ? 0 : (dev === mpDev[1] ? 1 : -1);
    }
    function devName(dev) {
        if (!dev) return '';
        if (dev === 'keys') return T('devRemote');
        if (dev === 'keys2') return 'W A S D';
        return T('devPad') + ' ' + ((+dev.slice(3) || 0) + 1);
    }
    function clearHeld() { var k, j; for (k = 0; k < 2; k++) for (j = 0; j < 5; j++) pls[k].held[j] = 0; }
    function onInput(action, pressed, repeat, dev) {
        var k, ai = ACTIDX[action], q;
        dev = dev || 'keys';
        k = playerOf(dev); q = k >= 0 ? pls[k] : null;
        if (q && ai !== undefined && !repeat) q.held[ai] = Math.max(0, q.held[ai] + (pressed ? 1 : -1));
        if (!pressed) return;
        SR.audio.poke();
        if (st === S_RACE || st === S_COUNT) {
            if (repeat || !q) return;
            if ((action === 'jump' || action === 'up') && inputLock <= 0 && !q.auto) {
                if (st === S_COUNT) { if (cdT > 2.45) q.rocket = true; return; }
                if (simT - q.lastTap < 0.3 && q.nitro >= 30 && q.perfCd <= 0 && q.perfT <= 0) {
                    q.nitro -= 30; q.perfT = 1.5; q.perfCd = 2; q.lastTap = -9; popMsgQ(q, T('perfect'), '#ffd23f', 1); SR.audio.nitro(true); q.flash = 0.4; q.flashCol = '#ffd23f';
                } else q.lastTap = simT;
            }
            return;
        }
        if (repeat && (action === 'confirm' || action === 'jump')) return;
        if (st === S_MP && inputLock <= 0 && dev !== mpDev[0]) {
            // any other controller: OK joins as player 2, left / right picks player 2's car
            if (action === 'confirm' || action === 'jump') { if (mpDev[1] !== dev) { mpDev[1] = dev; SR.audio.jingle(true); } }
            else if (dev === mpDev[1] && (action === 'left' || action === 'right')) { mCar2 = anyNext(mCar2, action === 'left' ? -1 : 1); tick(); }
            return;
        }
        if (action === 'jump') return;
        onMenuInput(action, dev);
    }

    /* ---------------- frame ---------------- */
    function render() {
        renderScene();
        if (st === S_TITLE) renderTitle();
        else if (st === S_MAIN) renderMain();
        else if (st === S_HELP) renderHelp();
        else if (st === S_CAREER) renderCareer();
        else if (st === S_QUICK) renderSetup(false);
        else if (st === S_MP) renderSetup(true);
        else if (st === S_GARAGE) renderGarage();
        else if (st === S_RESULT) renderResult();
        if (toastT > 0) toastT -= 1 / 60;
    }
    function audioFrame() {
        var racing = st === S_RACE || st === S_COUNT, sp = cars[0].speed, dr = pls[0].drift || (nPl > 1 && pls[1].drift), nl = pls[0].nitroLvl;
        if (nPl > 1) { sp = Math.max(sp, cars[P2I].speed); nl = Math.max(nl, pls[1].nitroLvl); }
        SR.audio.update(sp / MAXS, nl, dr ? 1 : 0, true, racing ? 1 : 0.2);
    }
    function frame(ts) {
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        var d = Math.min(250, ts - last);
        last = ts; acc += d;
        frameAvg += (d - frameAvg) * 0.05;
        while (acc >= STEP) { update(); acc -= STEP; }
        render();
        audioFrame();
        adapt();
    }
    var adaptT = 0;
    function adapt() {
        adaptT++;
        if (adaptT < 180) return;
        adaptT = 0;
        if (frameAvg > 22 && drawDist > 50) drawDist -= 15;
        else if (frameAvg < 17.5 && drawDist < (tier === 'high' ? 160 : (tier === 'mid' ? 110 : 70))) drawDist += 5;
    }
    function startLoop() { if (!raf && !destroyed) { last = 0; acc = 0; raf = requestAnimationFrame(frame); } }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    function resize() {
        var ww = window.innerWidth, wh = window.innerHeight, s = Math.min(ww / W, wh / H), cap = tier === 'low' ? 1 : (tier === 'mid' ? 1.34 : 2), dpr = window.devicePixelRatio || 1;
        cs = Math.min(s * dpr, cap);
        canvas.width = Math.round(W * cs); canvas.height = Math.round(H * cs);
        canvas.style.width = Math.round(W * s) + 'px'; canvas.style.height = Math.round(H * s) + 'px';
        canvas.style.left = Math.round((ww - W * s) / 2) + 'px'; canvas.style.top = Math.round((wh - H * s) / 2) + 'px';
        ctx.setTransform(cs, 0, 0, cs, 0, 0);
    }
    // a hidden page stops requestAnimationFrame but not the engine oscillators: pause properly instead
    function onVis() { if (document.hidden && started && !paused && !destroyed) MyPC.pause(); }
    function setMenus() { MyPC.setMenu([{ id: 'restart', label: T('restart') }, { id: 'garage', label: T('garage') }]); }

    MyPC.init({
        onInit: function (inf) {
            var cols = [], i;
            info = inf; tier = (inf.quality && inf.quality.tier) || 'mid';
            SR.setLang(inf.lang);
            drawDist = tier === 'high' ? 140 : (tier === 'mid' ? 100 : 65);
            canvas = document.getElementById('c'); ctx = canvas.getContext('2d', { alpha: false });
            ctx.direction = 'ltr';
            resize(); window.addEventListener('resize', resize); document.addEventListener('visibilitychange', onVis);
            nitroGrad = ctx.createLinearGradient(W / 2 - 190, 0, W / 2 + 190, 0); nitroGrad.addColorStop(0, '#12e6ff'); nitroGrad.addColorStop(1, '#ff2bd6');
            loadSave();
            for (i = 0; i < NCAR; i++) cols.push(CARS[i].col);
            MyPC.progress(0.05);
            SR.buildArt(cols, function (p) { MyPC.progress(0.05 + p * 0.9); });
            for (i = 0; i < SR.spr.cars.length; i++) SR.spr.cars[i].ratio = SR.spr.cars[i].c.height / SR.spr.cars[i].c.width;
            setMenus(); buildTitle();
            trackIdx = 0; qCar = sv.car; mCar1 = sv.car; mCar2 = sv.car;
            setupDemo(0);
            st = S_TITLE; inputLock = 0.3;
            MyPC.ready();
        },
        onStart: function () {
            SR.audio.start(info.volume, tier);
            SR.audio.setTrack(trackIdx);
            started = true; paused = false;
            startLoop();
        },
        onPause: function () { paused = true; clearHeld(); stopLoop(); SR.audio.suspend(); },
        onResume: function () { paused = false; clearHeld(); SR.audio.resume(); startLoop(); },
        onDestroy: function () {
            destroyed = true; stopLoop(); SR.audio.stop();
            window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis);
        },
        onInput: onInput,
        onMenu: function (id) {
            if (id === 'restart') {
                if (st === S_RACE || st === S_COUNT || st === S_RESULT) startRace();
            } else if (id === 'garage') { st = S_GARAGE; garRow = 0; garCar = sv.car; setupDemo(trackIdx); inputLock = 0.3; }
        },
        onVolume: function (v) { SR.audio.setVolume(v); }
    });

    // small hook used by tests only
    SR.dbg = { start: function (t, e) { startEvent(t, e); }, quick: function (t) { trackIdx = t; qCar = sv.car; startQuick(); }, mp: function (t) { trackIdx = t; mCar1 = 0; mCar2 = 1; startMP(); },
               setAuto: function (k, cap, nit) { pls[k].auto = true; pls[k].autoCap = cap; pls[k].autoNit = nit; },
               state: function () { return { st: st, dist: cars[0].dist - BASE, speed: cars[0].speed, raceT: raceT, trackLen: trackLen, res: res, place: pls[0].place, td: pls[0].takedowns }; },
               sv: function () { return sv; }, cars: cars, pls: pls, step: function (n) { for (var i = 0; i < n; i++) update(); }, draw: function () { render(); }, key: function (a, dev) { onInput(a, true, false, dev || 'keys'); onInput(a, false, false, dev || 'keys'); }, hold: function (a, down, dev) { onInput(a, down, false, dev || 'keys'); }, mpDev: mpDev, finish: finishEvent, setStars: function (n) { var i; for (i = 0; i < NEV; i++) sv.stars[i] = n; } };
})();
