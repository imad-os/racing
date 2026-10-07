/* Street Racer - all art is drawn by code into offscreen canvases at load time (no image files). */
(function () {
    'use strict';
    var HZ = 232;

    function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function rr(g, x, y, w, h, r) {
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
    function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
    function shade(c, a) { // a in -1..1
        var v = hex(c), i, o = [];
        for (i = 0; i < 3; i++) o.push(Math.max(0, Math.min(255, Math.round(a < 0 ? v[i] * (1 + a) : v[i] + (255 - v[i]) * a))));
        return 'rgb(' + o[0] + ',' + o[1] + ',' + o[2] + ')';
    }
    function lin(g, x0, y0, x1, y1, stops) {
        var gr = g.createLinearGradient(x0, y0, x1, y1), i;
        for (i = 0; i < stops.length; i += 2) gr.addColorStop(stops[i], stops[i + 1]);
        return gr;
    }

    /* ---------------- cars (seen from behind) ---------------- */
    // o: kind 'sport' | 'sedan' | 'van' | 'truck', color, bw (body width fraction), spoiler, stripe, wing
    function carSprite(o) {
        var W = 160, H = 108, c = mk(W, H), g = c.getContext('2d');
        var bw = W * o.bw, bx = (W - bw) / 2, col = o.color, i;
        g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(W / 2, 99, W * 0.46, 7, 0, 0, 7); g.fill();
        var wh = o.kind === 'truck' ? 44 : (o.kind === 'van' ? 38 : 32);
        g.fillStyle = '#08080c';
        rr(g, bx - 4, 100 - wh, 25, wh, 5); g.fill(); rr(g, bx + bw - 21, 100 - wh, 25, wh, 5); g.fill();
        g.fillStyle = '#1b1b24';
        g.fillRect(bx - 1, 100 - wh + 4, 4, wh - 8); g.fillRect(bx + bw - 3, 100 - wh + 4, 4, wh - 8);
        if (o.kind === 'van' || o.kind === 'truck') {
            var top = o.kind === 'truck' ? 6 : 14, bot = 90;
            g.fillStyle = lin(g, 0, top, 0, bot, [0, shade(col, 0.25), 1, shade(col, -0.25)]);
            rr(g, bx, top, bw, bot - top, 6); g.fill();
            g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(W / 2, top + 4); g.lineTo(W / 2, bot - 14); g.stroke();
            g.strokeRect(bx + 6, top + 6, bw - 12, bot - top - 26);
            if (o.kind === 'van') {
                g.fillStyle = lin(g, 0, top + 8, 0, top + 30, [0, '#25384c', 1, '#0b131c']);
                rr(g, bx + 12, top + 8, bw - 24, 20, 4); g.fill();
            }
            g.fillStyle = '#1a1a22'; g.fillRect(bx, bot - 12, bw, 14);
            g.fillStyle = '#e8203a'; rr(g, bx + 3, bot - 44, 9, 22, 3); g.fill(); rr(g, bx + bw - 12, bot - 44, 9, 22, 3); g.fill();
            g.fillStyle = '#ffb0b8'; g.fillRect(bx + 5, bot - 42, 3, 8); g.fillRect(bx + bw - 10, bot - 42, 3, 8);
            g.fillStyle = '#e9e9ee'; g.fillRect(W / 2 - 14, bot - 10, 28, 9);
            return { c: c, ww: o.ww || 560 };
        }
        // lower body
        var lowTop = o.kind === 'sedan' ? 50 : 54, cabTop = o.kind === 'sedan' ? 14 : 24;
        // cabin
        var cw = bw * (o.kind === 'sedan' ? 0.7 : 0.62);
        g.fillStyle = lin(g, 0, cabTop, 0, lowTop + 6, [0, shade(col, 0.1), 1, shade(col, -0.35)]);
        g.beginPath(); g.moveTo(W / 2 - cw / 2, cabTop + 4); g.quadraticCurveTo(W / 2, cabTop - 4, W / 2 + cw / 2, cabTop + 4);
        g.lineTo(W / 2 + bw * 0.44, lowTop + 6); g.lineTo(W / 2 - bw * 0.44, lowTop + 6); g.closePath(); g.fill();
        // rear window
        var gw = cw * 0.86;
        g.fillStyle = lin(g, 0, cabTop + 6, 0, lowTop + 2, [0, '#2d4560', 0.5, '#0e1a28', 1, '#06090e']);
        g.beginPath(); g.moveTo(W / 2 - gw / 2, cabTop + 8); g.quadraticCurveTo(W / 2, cabTop + 2, W / 2 + gw / 2, cabTop + 8);
        g.lineTo(W / 2 + gw * 0.58, lowTop + 2); g.lineTo(W / 2 - gw * 0.58, lowTop + 2); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.moveTo(W / 2 - gw * 0.4, cabTop + 9); g.lineTo(W / 2 - gw * 0.1, cabTop + 9);
        g.lineTo(W / 2 - gw * 0.3, lowTop); g.lineTo(W / 2 - gw * 0.5, lowTop); g.closePath(); g.fill();
        // body
        g.fillStyle = lin(g, 0, lowTop, 0, 92, [0, shade(col, 0.28), 0.35, col, 1, shade(col, -0.45)]);
        rr(g, bx, lowTop, bw, 92 - lowTop, 9); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(bx + 8, lowTop + 2, bw - 16, 2);
        if (o.stripe) {
            g.fillStyle = o.stripe;
            g.fillRect(W / 2 - 14, cabTop + 2, 8, lowTop - cabTop + 40); g.fillRect(W / 2 + 6, cabTop + 2, 8, lowTop - cabTop + 40);
        }
        // spoiler
        if (o.spoiler) {
            var sy = lowTop - 8, sw = bw * (o.spoiler > 1 ? 1.04 : 0.9);
            g.fillStyle = '#101018';
            rr(g, W / 2 - sw / 2, sy, sw, 7, 2); g.fill();
            g.fillStyle = o.wing || shade(col, -0.2);
            g.fillRect(W / 2 - sw / 2, sy - 1, sw, 3);
            g.fillStyle = '#0a0a10';
            g.fillRect(W / 2 - sw / 2, sy - 6, 4, 18); g.fillRect(W / 2 + sw / 2 - 4, sy - 6, 4, 18);
            g.fillRect(W / 2 - 16, sy + 5, 5, 10); g.fillRect(W / 2 + 11, sy + 5, 5, 10);
        }
        // tail lights
        var ty = lowTop + 8, tw = bw * 0.3;
        for (i = 0; i < 2; i++) {
            var tx = i ? bx + bw - tw - 5 : bx + 5;
            g.save(); g.shadowColor = '#ff2040'; g.shadowBlur = 9;
            g.fillStyle = lin(g, tx, 0, tx + tw, 0, i ? [0, '#ff4a60', 1, '#a3001c'] : [0, '#a3001c', 1, '#ff4a60']);
            rr(g, tx, ty, tw, 11, 4); g.fill(); g.restore();
            g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(tx + 4, ty + 2, tw - 8, 2);
        }
        g.fillStyle = '#0e0e14'; g.fillRect(bx + 4, 80, bw - 8, 12);
        g.fillStyle = '#e8e8ee'; g.fillRect(W / 2 - 13, ty + 2, 26, 10);
        g.fillStyle = '#44444c'; g.fillRect(W / 2 - 11, ty + 5, 22, 2);
        for (i = 0; i < 2; i++) {
            var ex = i ? W / 2 + bw * 0.28 : W / 2 - bw * 0.28;
            g.fillStyle = '#9a9aa6'; g.beginPath(); g.arc(ex, 87, 5.5, 0, 7); g.fill();
            g.fillStyle = '#050508'; g.beginPath(); g.arc(ex, 87, 3.4, 0, 7); g.fill();
        }
        return { c: c, ww: o.ww || 500 };
    }

    var PLAYER_DESIGNS = [
        { kind: 'sport', bw: 0.86, spoiler: 1, stripe: null, ww: 500 },
        { kind: 'sport', bw: 0.9, spoiler: 2, stripe: '#ffffff', ww: 520 },
        { kind: 'sedan', bw: 0.84, spoiler: 1, stripe: null, ww: 500 },
        { kind: 'sport', bw: 0.88, spoiler: 1, stripe: '#ffffff', ww: 510 },
        { kind: 'sedan', bw: 0.88, spoiler: 2, stripe: '#10101a', ww: 520 },
        { kind: 'sport', bw: 0.92, spoiler: 2, stripe: null, wing: '#e8f6ff', ww: 530 },
        { kind: 'sport', bw: 0.9, spoiler: 2, stripe: '#1a1a1a', wing: '#ff7a1a', ww: 520 },
        { kind: 'sedan', bw: 0.9, spoiler: 2, stripe: '#e6fbff', wing: '#2a2a3a', ww: 530 },
        { kind: 'sport', bw: 0.94, spoiler: 2, stripe: '#10101a', wing: '#ffd23f', ww: 540 },
        { kind: 'sport', bw: 0.9, spoiler: 1, stripe: '#ffd23f', ww: 520 },
        { kind: 'sport', bw: 0.92, spoiler: 2, stripe: '#e6fbff', wing: '#8a4dff', ww: 530 },
        { kind: 'sport', bw: 0.96, spoiler: 2, stripe: '#0a0a12', wing: '#14e0b5', ww: 550 }
    ];
    SR.PLAYER_DESIGNS = PLAYER_DESIGNS;
    SR.RIVAL_COLORS = ['#ff3b3b', '#3bd0ff', '#ffe03b', '#b36bff', '#42ff8a'];
    var TRAFFIC_COLORS = [['#c9ccd6', '#4a79d8', '#d8a23a'], ['#e8e8ee', '#c24a4a', '#3a8a6a'], ['#f2f2f2', '#d0922a', '#4d6a9a'], ['#eeeeee', '#2f6f9a', '#9a9aa6']];

    function buildCars(spr, cols) {
        var i, k, j, d;
        spr.cars = [];
        for (i = 0; i < 12; i++) { d = PLAYER_DESIGNS[i]; d.color = cols[i]; spr.cars.push(carSprite(d)); }
        for (i = 0; i < 5; i++) {
            d = PLAYER_DESIGNS[(i * 5 + 1) % 12];
            spr.cars.push(carSprite({ kind: d.kind, bw: d.bw, spoiler: d.spoiler, stripe: i % 2 ? '#ffffff' : null, color: SR.RIVAL_COLORS[i], ww: d.ww }));
        }
        var kinds = ['sedan', 'sedan', 'van', 'truck'], ww = [500, 480, 560, 640];
        for (k = 0; k < 4; k++) for (j = 0; j < 3; j++) {
            spr.cars.push(carSprite({ kind: kinds[k], bw: k === 3 ? 0.9 : 0.84, spoiler: 0, color: TRAFFIC_COLORS[k][j], ww: ww[k] }));
        }
    }

    /* ---------------- scenery ---------------- */
    function glowDot(g, x, y, r, col) {
        var gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, col); gr.addColorStop(0.35, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
    function building(w, h, base, neon, seed) {
        var c = mk(w, h), g = c.getContext('2d'), r = rng(seed), x, y, cols = Math.floor(w / 14), rows = Math.floor((h - 18) / 16);
        g.fillStyle = lin(g, 0, 0, 0, h, [0, shade(base, 0.12), 1, shade(base, -0.5)]); g.fillRect(0, 0, w, h);
        for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
            if (r() < 0.5) {
                var t = r();
                g.fillStyle = t < 0.55 ? '#ffe9a8' : (t < 0.8 ? '#7ff3ff' : '#ff8ae6');
                g.globalAlpha = 0.5 + r() * 0.5;
                g.fillRect(4 + x * 14, 14 + y * 16, 8, 10);
            }
        }
        g.globalAlpha = 1;
        g.save(); g.shadowColor = neon; g.shadowBlur = 10; g.strokeStyle = neon; g.lineWidth = 3;
        g.beginPath(); g.moveTo(2, h); g.lineTo(2, 2); g.lineTo(w - 2, 2); g.lineTo(w - 2, h); g.stroke(); g.restore();
        g.fillStyle = neon; g.fillRect(w * 0.2, h * 0.3, w * 0.6, 4);
        return { c: c, ww: w * 14 };
    }
    function lamp(col, glow) {
        var c = mk(48, 200), g = c.getContext('2d');
        g.fillStyle = '#20222c'; g.fillRect(21, 24, 6, 176);
        g.fillRect(10, 20, 30, 6);
        if (glow) glowDot(g, 24, 22, 22, glow);
        g.fillStyle = col; g.fillRect(6, 17, 14, 7); g.fillRect(28, 17, 14, 7);
        return { c: c, ww: 260 };
    }
    function billboard(neon, seed) {
        var c = mk(200, 220), g = c.getContext('2d'), r = rng(seed), i;
        g.fillStyle = '#1c1e2a'; g.fillRect(40, 90, 10, 130); g.fillRect(150, 90, 10, 130);
        g.fillStyle = '#10121c'; rr(g, 4, 6, 192, 100, 8); g.fill();
        g.save(); g.shadowColor = neon; g.shadowBlur = 14; g.strokeStyle = neon; g.lineWidth = 4; rr(g, 8, 10, 184, 92, 6); g.stroke(); g.restore();
        for (i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#12e6ff' : '#ff2bd6'; g.fillRect(24, 24 + i * 19, 40 + r() * 120, 8); }
        return { c: c, ww: 1500 };
    }
    function palm() {
        var c = mk(160, 260), g = c.getContext('2d'), i;
        g.strokeStyle = '#6b4a2b'; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(84, 258); g.quadraticCurveTo(70, 170, 90, 84); g.stroke();
        g.strokeStyle = '#8a6238'; g.lineWidth = 3; g.beginPath(); g.moveTo(86, 258); g.quadraticCurveTo(72, 170, 92, 84); g.stroke();
        for (i = 0; i < 7; i++) {
            var a = -Math.PI * 0.95 + i * (Math.PI * 0.9 / 6), len = 62 + (i % 2) * 14;
            g.save(); g.translate(90, 84); g.rotate(a + Math.PI / 2 + 0.0);
            g.fillStyle = i % 2 ? '#2c8a3c' : '#38a84a';
            g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -22, len, 12); g.quadraticCurveTo(len * 0.5, -6, 0, 5); g.closePath(); g.fill();
            g.restore();
        }
        g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(90, 88, 6, 0, 7); g.fill();
        return { c: c, ww: 1100 };
    }
    function pine(snowy) {
        var c = mk(150, 280), g = c.getContext('2d'), i;
        g.fillStyle = '#4a3322'; g.fillRect(70, 236, 12, 44);
        for (i = 0; i < 4; i++) {
            var y = 20 + i * 52, w = 40 + i * 24;
            g.fillStyle = lin(g, 0, y, 0, y + 70, [0, snowy ? '#1d5a43' : '#1f6b3a', 1, '#0d3a26']);
            g.beginPath(); g.moveTo(75, y - 14); g.lineTo(75 + w, y + 62); g.lineTo(75 - w, y + 62); g.closePath(); g.fill();
            if (snowy) {
                g.fillStyle = '#f6faff';
                g.beginPath(); g.moveTo(75, y - 14); g.lineTo(75 + w * 0.62, y + 28); g.quadraticCurveTo(75, y + 18, 75 - w * 0.62, y + 28); g.closePath(); g.fill();
            }
        }
        return { c: c, ww: 1000 };
    }
    function cactus() {
        var c = mk(110, 220), g = c.getContext('2d');
        g.fillStyle = lin(g, 0, 0, 110, 0, [0, '#2f8a4a', 0.5, '#46b062', 1, '#26703b']);
        rr(g, 44, 10, 24, 208, 12); g.fill();
        rr(g, 12, 70, 18, 66, 9); g.fill(); rr(g, 12, 118, 46, 18, 9); g.fill();
        rr(g, 82, 50, 18, 62, 9); g.fill(); rr(g, 60, 98, 40, 18, 9); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(56, 14, 3, 200);
        return { c: c, ww: 600 };
    }
    function rock(base, hi) {
        var c = mk(180, 120), g = c.getContext('2d');
        g.fillStyle = lin(g, 0, 0, 0, 120, [0, hi, 1, base]);
        g.beginPath(); g.moveTo(6, 118); g.lineTo(26, 54); g.lineTo(70, 18); g.lineTo(118, 30); g.lineTo(160, 70); g.lineTo(176, 118); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.moveTo(70, 18); g.lineTo(118, 30); g.lineTo(176, 118); g.lineTo(110, 118); g.closePath(); g.fill();
        return { c: c, ww: 900 };
    }
    function mesa() {
        var c = mk(300, 200), g = c.getContext('2d');
        g.fillStyle = lin(g, 0, 0, 0, 200, [0, '#c9703c', 1, '#8a4524']);
        g.beginPath(); g.moveTo(0, 200); g.lineTo(26, 70); g.lineTo(60, 52); g.lineTo(230, 52); g.lineTo(272, 80); g.lineTo(300, 200); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,230,180,0.25)'; g.fillRect(60, 52, 170, 10);
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(170, 62, 90, 138);
        return { c: c, ww: 3000 };
    }
    function pole() {
        var c = mk(110, 240), g = c.getContext('2d');
        g.fillStyle = '#4a3a2a'; g.fillRect(50, 10, 8, 230); g.fillRect(14, 28, 80, 6); g.fillRect(24, 50, 60, 5);
        g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 60); g.quadraticCurveTo(54, 90, 110, 60); g.stroke();
        return { c: c, ww: 380 };
    }
    function umbrella(col) {
        var c = mk(150, 160), g = c.getContext('2d'), i;
        g.fillStyle = '#d8d8d8'; g.fillRect(72, 40, 6, 120);
        for (i = 0; i < 6; i++) { g.fillStyle = i % 2 ? col : '#ffffff'; g.beginPath(); g.moveTo(75, 14); g.lineTo(6 + i * 23, 62); g.lineTo(29 + i * 23, 62); g.closePath(); g.fill(); }
        return { c: c, ww: 700 };
    }
    function lighthouse() {
        var c = mk(130, 360), g = c.getContext('2d'), i;
        g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(34, 360); g.lineTo(46, 70); g.lineTo(84, 70); g.lineTo(96, 360); g.closePath(); g.fill();
        for (i = 0; i < 3; i++) { g.fillStyle = '#d83a3a'; g.beginPath(); g.moveTo(40 - i * 0, 110 + i * 90); g.lineTo(90, 110 + i * 90); g.lineTo(93, 150 + i * 90); g.lineTo(37, 150 + i * 90); g.closePath(); g.fill(); }
        g.fillStyle = '#2a2a38'; g.fillRect(42, 48, 46, 24);
        glowDot(g, 65, 58, 30, 'rgba(255,230,120,0.95)');
        g.fillStyle = '#d83a3a'; g.beginPath(); g.moveTo(40, 48); g.lineTo(65, 22); g.lineTo(90, 48); g.closePath(); g.fill();
        return { c: c, ww: 1600 };
    }
    function snowman() {
        var c = mk(100, 150), g = c.getContext('2d');
        g.fillStyle = '#f7fbff'; g.beginPath(); g.arc(50, 112, 34, 0, 7); g.fill(); g.beginPath(); g.arc(50, 64, 24, 0, 7); g.fill();
        g.fillStyle = '#e04b4b'; g.fillRect(28, 80, 44, 8);
        g.fillStyle = '#222'; g.beginPath(); g.arc(42, 58, 3, 0, 7); g.fill(); g.beginPath(); g.arc(58, 58, 3, 0, 7); g.fill();
        g.fillStyle = '#ff8a2a'; g.beginPath(); g.moveTo(50, 64); g.lineTo(70, 68); g.lineTo(50, 70); g.closePath(); g.fill();
        g.fillStyle = '#222'; g.fillRect(34, 28, 32, 6); g.fillRect(38, 10, 24, 20);
        return { c: c, ww: 420 };
    }
    function bush(col) {
        var c = mk(140, 80), g = c.getContext('2d');
        g.fillStyle = col; g.beginPath(); g.arc(40, 56, 26, 0, 7); g.arc(76, 46, 32, 0, 7); g.arc(106, 58, 24, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(14, 62, 112, 16);
        return { c: c, ww: 700 };
    }
    function buoy() {
        var c = mk(80, 140), g = c.getContext('2d');
        g.fillStyle = '#d83a3a'; g.beginPath(); g.moveTo(20, 130); g.lineTo(30, 50); g.lineTo(50, 50); g.lineTo(60, 130); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.fillRect(26, 80, 28, 12);
        g.fillStyle = '#333'; g.fillRect(36, 20, 8, 32); glowDot(g, 40, 18, 14, 'rgba(255,240,140,0.95)');
        return { c: c, ww: 360 };
    }

    function tree(c1, c2) {
        var c = mk(170, 260), g = c.getContext('2d');
        g.fillStyle = '#5a3d26'; g.fillRect(76, 150, 18, 110); g.fillStyle = '#6e4a2e'; g.fillRect(76, 150, 6, 110);
        g.fillStyle = lin(g, 0, 20, 0, 180, [0, c1, 1, c2]);
        g.beginPath(); g.arc(85, 90, 56, 0, 7); g.arc(48, 120, 38, 0, 7); g.arc(122, 120, 38, 0, 7); g.arc(85, 52, 36, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(70, 70, 26, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(112, 118, 30, 0, 7); g.fill();
        return { c: c, ww: 1100 };
    }
    function blossom() {
        var c = mk(190, 250), g = c.getContext('2d'), r = rng(77), i;
        g.fillStyle = '#5a3d36'; g.fillRect(86, 140, 16, 110); g.fillStyle = '#6e4a40'; g.fillRect(86, 140, 5, 110);
        g.fillStyle = lin(g, 0, 20, 0, 170, [0, '#ffc8dc', 1, '#f08fb4']);
        g.beginPath(); g.arc(95, 84, 60, 0, 7); g.arc(50, 114, 40, 0, 7); g.arc(140, 114, 40, 0, 7); g.arc(95, 48, 36, 0, 7); g.fill();
        g.fillStyle = '#fff'; for (i = 0; i < 22; i++) { g.globalAlpha = 0.5 + r() * 0.4; g.beginPath(); g.arc(30 + r() * 130, 30 + r() * 110, 3 + r() * 3, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        return { c: c, ww: 1200 };
    }
    function containers() {
        var c = mk(220, 200), g = c.getContext('2d'), cols = ['#d84a3a', '#2f78c8', '#e0a02a', '#3a9a6a', '#8a8a96'], i, j, k;
        for (j = 0; j < 3; j++) for (i = 0; i < 2; i++) {
            g.fillStyle = cols[(i * 3 + j * 2) % 5]; g.fillRect(10 + i * 100, 20 + j * 56, 96, 52);
            g.fillStyle = 'rgba(0,0,0,0.25)'; for (k = 0; k < 8; k++) g.fillRect(14 + i * 100 + k * 11, 22 + j * 56, 3, 48);
            g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(10 + i * 100, 20 + j * 56, 96, 4);
        }
        g.fillStyle = '#1a1a22'; g.fillRect(8, 188, 204, 10);
        return { c: c, ww: 1500 };
    }
    function crane() {
        var c = mk(260, 340), g = c.getContext('2d');
        g.fillStyle = '#e0a02a'; g.fillRect(40, 60, 12, 280); g.fillRect(130, 60, 12, 280);
        g.fillRect(36, 40, 224, 16); g.fillRect(40, 130, 102, 6); g.fillRect(40, 220, 102, 6);
        g.strokeStyle = '#e0a02a'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 136); g.lineTo(142, 220); g.moveTo(142, 136); g.lineTo(40, 220); g.stroke();
        g.fillStyle = '#333'; g.fillRect(200, 56, 6, 90); g.fillStyle = '#d84a3a'; g.fillRect(188, 146, 30, 18);
        glowDot(g, 46, 36, 18, 'rgba(255,60,60,0.9)');
        return { c: c, ww: 1800 };
    }
    function spire(base, glow) {
        var c = mk(150, 300), g = c.getContext('2d');
        g.fillStyle = lin(g, 0, 0, 0, 300, [0, glow ? '#ff9a50' : '#9a6a58', 0.25, base, 1, '#241412']);
        g.beginPath(); g.moveTo(10, 300); g.lineTo(40, 120); g.lineTo(60, 60); g.lineTo(80, 8); g.lineTo(96, 80); g.lineTo(120, 150); g.lineTo(142, 300); g.closePath(); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(80, 8); g.lineTo(96, 80); g.lineTo(120, 150); g.lineTo(142, 300); g.lineTo(90, 300); g.closePath(); g.fill();
        if (glow) { g.fillStyle = 'rgba(255,120,30,0.5)'; g.fillRect(70, 200, 6, 60); g.fillRect(100, 220, 5, 50); }
        return { c: c, ww: 1000 };
    }
    // sets of scenery per theme: items = [sprite index, weight], lamp = periodic roadside sprite
    function buildScenery(spr) {
        var s = [], i;
        spr.scen = [];
        spr.sceneSets = [];
        // 0 night city
        s = [building(120, 380, '#1b1740', '#ff2bd6', 11), building(150, 520, '#14213f', '#12e6ff', 12), building(110, 300, '#2a1744', '#ffd23f', 13),
             building(170, 640, '#181a3c', '#7dff6a', 14), billboard('#ff2bd6', 3), billboard('#12e6ff', 4), lamp('#ffe9a8', 'rgba(255,230,160,0.55)')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 3], [1, 3], [2, 3], [3, 2], [4, 1], [5, 1]], lamp: 6, near: [0, 1, 2] });
        // 1 desert
        s = [cactus(), rock('#8a5a3a', '#c28a5c'), mesa(), pole(), bush('#7a8a3a'), rock('#7a4e32', '#b57c52')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 3], [1, 2], [2, 1], [4, 2], [5, 2]], lamp: 3, near: [0, 1, 4] });
        // 2 snowy pass
        s = [pine(true), pine(true), rock('#7d8aa0', '#d4dded'), snowman(), pole(), pine(true)];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 4], [1, 3], [2, 2], [3, 0.4], [5, 3]], lamp: 4, near: [0, 1, 2] });
        // 3 coast
        s = [palm(), palm(), umbrella('#ff5a7a'), lighthouse(), rock('#6b4a5a', '#b48a8a'), buoy(), lamp('#fff6e0', 'rgba(255,200,120,0.5)'), bush('#4a8a4a')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 4], [1, 3], [2, 1], [3, 0.25], [4, 2], [7, 2]], lamp: 6, near: [0, 1, 4], sea: 5 });
        // 4 emerald forest
        s = [tree('#4fbf5a', '#2a7a3a'), tree('#6ccf5a', '#33883a'), pine(false), bush('#3f8f3f'), rock('#6a6a6a', '#a8a8a8'), pole(), tree('#3f9a4f', '#1f6a34')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 4], [1, 3], [2, 3], [3, 2], [4, 1], [6, 3]], lamp: 5, near: [0, 1, 3] });
        // 5 ember canyon
        s = [spire('#7a4a3a', false), spire('#6a3a30', true), rock('#5a3a30', '#a86a4a'), mesa(), lamp('#ffb070', 'rgba(255,140,60,0.5)'), rock('#3a2a2a', '#8a4a30')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 3], [1, 2], [2, 3], [3, 1], [5, 3]], lamp: 4, near: [0, 2, 5] });
        // 6 harbor lights
        s = [containers(), crane(), building(150, 300, '#1a2a4a', '#ffd23f', 31), building(130, 240, '#2a2a44', '#12e6ff', 32), lamp('#e8f4ff', 'rgba(200,230,255,0.55)'), buoy(), containers()];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 4], [1, 1.5], [2, 2], [3, 2], [6, 2]], lamp: 4, near: [0, 2], sea: 5 });
        // 7 cherry hills
        s = [blossom(), blossom(), tree('#7fd06a', '#3f9a4a'), bush('#ff9ec0'), rock('#9a9aa8', '#d8d8e6'), lamp('#fff0c8', 'rgba(255,230,180,0.35)'), bush('#5fb85a')];
        spr.scen.push(s); spr.sceneSets.push({ items: [[0, 4], [1, 3], [2, 2], [3, 2], [4, 1], [6, 2]], lamp: 5, near: [0, 1, 3] });
        for (i = 0; i < spr.scen.length; i++) spr.scen[i].forEach(function (e) { e.ratio = e.c.height / e.c.width; });
    }

    /* ---------------- backgrounds (sky + two parallax layers) ---------------- */
    function skyCanvas(th, i) {
        var c = mk(960, HZ + 6), g = c.getContext('2d'), r = rng(100 + i), k;
        g.fillStyle = lin(g, 0, 0, 0, HZ, [0, th.skyTop, 0.6, th.skyMid, 1, th.skyLow]); g.fillRect(0, 0, 960, HZ + 6);
        if (i === 0) { // stars + moon
            g.fillStyle = '#fff';
            for (k = 0; k < 90; k++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * 960, r() * HZ * 0.6, 1.6, 1.6); }
            g.globalAlpha = 1; glowDot(g, 760, 56, 70, 'rgba(255,170,240,0.35)');
            g.fillStyle = '#ffe9f8'; g.beginPath(); g.arc(760, 56, 24, 0, 7); g.fill();
        } else if (i === 1) { // desert sun
            glowDot(g, 300, HZ - 40, 150, 'rgba(255,240,200,0.5)');
            g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(300, HZ - 40, 34, 0, 7); g.fill();
        } else if (i === 2) { // clouds
            for (k = 0; k < 7; k++) { g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, r() * 900, 20 + r() * 110, 120 + r() * 160, 18 + r() * 14, 12); g.fill(); }
        } else if (i === 4) { // forest day
            glowDot(g, 700, 70, 120, 'rgba(255,255,220,0.6)'); g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(700, 70, 30, 0, 7); g.fill();
            for (k = 0; k < 8; k++) { g.fillStyle = 'rgba(255,255,255,0.7)'; rr(g, r() * 900, 30 + r() * 110, 100 + r() * 140, 22 + r() * 12, 14); g.fill(); }
        } else if (i === 5) { // ember glow
            glowDot(g, 480, HZ + 10, 330, 'rgba(255,120,30,0.55)');
            for (k = 0; k < 6; k++) { g.fillStyle = 'rgba(40,14,10,0.45)'; rr(g, r() * 900, 20 + r() * 120, 160 + r() * 200, 20 + r() * 18, 12); g.fill(); }
        } else if (i === 6) { // harbor night
            g.fillStyle = '#fff'; for (k = 0; k < 70; k++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * 960, r() * HZ * 0.55, 1.6, 1.6); }
            g.globalAlpha = 1; glowDot(g, 200, 60, 80, 'rgba(180,220,255,0.3)'); g.fillStyle = '#eef6ff'; g.beginPath(); g.arc(200, 60, 22, 0, 7); g.fill();
        } else if (i === 7) { // cherry day
            glowDot(g, 260, 80, 110, 'rgba(255,255,230,0.6)'); g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(260, 80, 28, 0, 7); g.fill();
            for (k = 0; k < 8; k++) { g.fillStyle = 'rgba(255,255,255,0.75)'; rr(g, r() * 900, 24 + r() * 120, 100 + r() * 140, 20 + r() * 12, 14); g.fill(); }
        } else { // sunset sun on the sea
            glowDot(g, 520, HZ - 8, 190, 'rgba(255,200,110,0.55)');
            g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(520, HZ - 8, 46, Math.PI, 0); g.fill();
            for (k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,170,150,0.35)'; rr(g, r() * 900, 30 + k * 26, 200 + r() * 200, 8, 4); g.fill(); }
        }
        return c;
    }
    function layer(w, h, draw) { var c = mk(w, h), g = c.getContext('2d'); draw(g, w, h); return c; }
    function ridge(g, w, h, col, base, amps, seed) {
        var r = rng(seed), ph = [], x, k, y;
        for (k = 0; k < amps.length; k++) ph.push(r() * 6.28);
        g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
        for (x = 0; x <= w; x += 8) {
            y = base;
            for (k = 0; k < amps.length; k++) y -= amps[k] * (0.5 + 0.5 * Math.sin(x / w * 6.2832 * (k + 2) + ph[k]));
            g.lineTo(x, y);
        }
        g.lineTo(w, h); g.closePath(); g.fill();
    }
    function buildBackgrounds(spr) {
        var T = SR.THEMES, bg = [];
        // night city
        bg.push({
            sky: skyCanvas(T[0], 0),
            far: layer(1920, 120, function (g, w, h) {
                var r = rng(5), x = 0, bw, bh, i;
                while (x < w) {
                    bw = 40 + r() * 70; if (x + bw > w) bw = w - x; bh = 40 + r() * 70;
                    g.fillStyle = '#2a1050'; g.fillRect(x, h - bh, bw, bh);
                    for (i = 0; i < 6; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,200,255,0.5)' : 'rgba(120,230,255,0.5)'; g.fillRect(x + 4 + r() * (bw - 8), h - bh + 6 + r() * (bh - 12), 3, 3); }
                    x += bw;
                }
            }),
            near: layer(1920, 90, function (g, w, h) {
                var r = rng(8), x = 0, bw, bh;
                while (x < w) {
                    bw = 30 + r() * 60; if (x + bw > w) bw = w - x; bh = 24 + r() * 56;
                    g.fillStyle = '#150a30'; g.fillRect(x, h - bh, bw, bh);
                    g.fillStyle = r() < 0.5 ? '#ff2bd6' : '#12e6ff'; g.globalAlpha = 0.8; g.fillRect(x, h - bh, bw, 2); g.globalAlpha = 1;
                    x += bw;
                }
            })
        });
        // desert
        bg.push({
            sky: skyCanvas(T[1], 1),
            far: layer(1920, 110, function (g, w, h) {
                var r = rng(21), x = 20, bw, bh;
                g.fillStyle = '#b2623a'; g.fillRect(0, h - 12, w, 12);
                while (x < w - 120) {
                    bw = 60 + r() * 110; bh = 30 + r() * 50; if (x + bw > w - 10) break;
                    g.fillStyle = '#b2623a'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 12, h - bh); g.lineTo(x + bw - 12, h - bh); g.lineTo(x + bw, h); g.closePath(); g.fill();
                    x += bw + 60 + r() * 140;
                }
            }),
            near: layer(1920, 70, function (g, w, h) { ridge(g, w, h, '#d49a58', h - 6, [22, 12, 7], 31); })
        });
        // snow
        bg.push({
            sky: skyCanvas(T[2], 2),
            far: layer(1920, 150, function (g, w, h) {
                ridge(g, w, h, '#7b93b8', h - 4, [70, 36, 20], 41);
                ridge(g, w, h, 'rgba(255,255,255,0.85)', h - 4, [70, 36, 20], 41);
                g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#7b93b8'; g.fillRect(0, h * 0.5, w, h); g.globalCompositeOperation = 'source-over';
            }),
            near: layer(1920, 80, function (g, w, h) {
                var r = rng(45), x, th;
                g.fillStyle = '#254a50'; g.fillRect(0, h - 10, w, 10);
                for (x = 0; x < w; x += 18) { th = 20 + r() * 40; g.fillStyle = '#1e4448'; g.beginPath(); g.moveTo(x, h - 4); g.lineTo(x + 9, h - th); g.lineTo(x + 18, h - 4); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(x + 9, h - th); g.lineTo(x + 14, h - th + 14); g.lineTo(x + 4, h - th + 14); g.closePath(); g.fill(); }
            })
        });
        // coast
        bg.push({
            sky: skyCanvas(T[3], 3),
            far: layer(1920, 80, function (g, w, h) { ridge(g, w, h, '#7a3d6e', h - 2, [26, 12, 6], 51); }),
            near: layer(1920, 56, function (g, w, h) { ridge(g, w, h, '#4a2a5a', h - 2, [18, 9], 61); })
        });
        // forest
        bg.push({
            sky: skyCanvas(T[4], 4),
            far: layer(1920, 130, function (g, w, h) { ridge(g, w, h, '#7fb6a8', h - 2, [50, 26, 12], 71); }),
            near: layer(1920, 80, function (g, w, h) { var r = rng(72), x, th; ridge(g, w, h, '#3f8a4a', h - 2, [26, 12], 73); for (x = 0; x < w; x += 16) { th = 16 + r() * 26; g.fillStyle = '#2a6a3a'; g.beginPath(); g.moveTo(x, h - 20); g.lineTo(x + 8, h - 20 - th); g.lineTo(x + 16, h - 20); g.closePath(); g.fill(); } })
        });
        // canyon
        bg.push({
            sky: skyCanvas(T[5], 5),
            far: layer(1920, 150, function (g, w, h) { ridge(g, w, h, '#3a1a1a', h - 2, [60, 30, 14], 81); g.fillStyle = 'rgba(255,110,30,0.6)'; g.fillRect(0, h - 8, w, 8); }),
            near: layer(1920, 90, function (g, w, h) { var r = rng(82), x = 0, bw2, bh2; while (x < w) { bw2 = 40 + r() * 80; if (x + bw2 > w) bw2 = w - x; bh2 = 30 + r() * 50; g.fillStyle = '#241210'; g.fillRect(x, h - bh2, bw2, bh2); g.fillStyle = '#ff6a1a'; g.globalAlpha = 0.5; g.fillRect(x, h - bh2, bw2, 2); g.globalAlpha = 1; x += bw2; } })
        });
        // harbor
        bg.push({
            sky: skyCanvas(T[6], 6),
            far: layer(1920, 110, function (g, w, h) { var r = rng(91), x = 0, bw2, bh2, i2; while (x < w) { bw2 = 24 + r() * 50; if (x + bw2 > w) bw2 = w - x; bh2 = 20 + r() * 70; g.fillStyle = '#12304f'; g.fillRect(x, h - bh2, bw2, bh2); for (i2 = 0; i2 < 4; i2++) { g.fillStyle = 'rgba(255,230,160,0.6)'; g.fillRect(x + 3 + r() * (bw2 - 6), h - bh2 + 4 + r() * (bh2 - 8), 2, 2); } x += bw2; } }),
            near: layer(1920, 70, function (g, w, h) { var r = rng(92), x; g.fillStyle = '#0a1c33'; g.fillRect(0, h - 10, w, 10); for (x = 60; x < w - 120; x += 260 + r() * 200) { g.fillRect(x, h - 56, 6, 56); g.fillRect(x - 24, h - 56, 60, 5); g.fillRect(x + 20, h - 56, 4, 24); } })
        });
        // cherry
        bg.push({
            sky: skyCanvas(T[7], 7),
            far: layer(1920, 140, function (g, w, h) { ridge(g, w, h, '#b6a8d8', h - 2, [60, 30, 14], 101); }),
            near: layer(1920, 80, function (g, w, h) { ridge(g, w, h, '#8fcf8a', h - 2, [28, 14], 102); ridge(g, w, h, 'rgba(255,170,200,0.45)', h - 14, [16, 8], 103); })
        });
        spr.bg = bg;
    }

    SR.buildArt = function (carColors, progress) {
        var spr = SR.spr = {};
        progress(0.1); buildCars(spr, carColors);
        progress(0.5); buildScenery(spr);
        progress(0.85); buildBackgrounds(spr);
        progress(1);
        return spr;
    };
    SR.rebuildPlayerCars = function (carColors) {
        var i, d;
        for (i = 0; i < 12; i++) { d = PLAYER_DESIGNS[i]; d.color = carColors[i]; SR.spr.cars[i] = carSprite(d); }
    };
    SR.art = { rr: rr, glowDot: glowDot, mk: mk };
})();
