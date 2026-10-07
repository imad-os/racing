/* Street Racer - themes and track layouts.
 * A track is a list of sections [enter, hold, leave, curve, hill]: segment counts, curve strength
 * (negative = left) and hill height in segments (positive = climb). Built once at load into typed arrays. */
(function () {
    'use strict';
    var SEG = 200;

    SR.THEMES = [
        { // 0 night city neon
            skyTop: '#05021a', skyMid: '#2a0a4d', skyLow: '#ff2a9d', fog: '#3a0f58',
            gL: ['#0a0c20', '#0e1030'], gR: ['#0a0c20', '#0e1030'],
            road: ['#2b2c40', '#25263a'], rumble: ['#ff2bd6', '#12e6ff'], lane: '#e9eaff',
            wall: ['#40466e', '#343a60'], wallTop: '#12e6ff', glow: true, snow: false,
            root: 57, tempo: 118
        },
        { // 1 desert highway
            skyTop: '#2f6fb5', skyMid: '#f2b366', skyLow: '#ffe3a0', fog: '#f0c88a',
            gL: ['#e2b46a', '#d9a95c'], gR: ['#e2b46a', '#d9a95c'],
            road: ['#4c4b50', '#464549'], rumble: ['#d94b3a', '#f1f1f1'], lane: '#f4e9c8',
            wall: ['#b9966a', '#a98558'], wallTop: '#f1f1f1', glow: false, snow: false,
            root: 53, tempo: 126
        },
        { // 2 snowy mountain pass
            skyTop: '#6f8fb6', skyMid: '#b6cbe3', skyLow: '#eef4fb', fog: '#d9e5f2',
            gL: ['#f4f8ff', '#e8eef9'], gR: ['#f4f8ff', '#e8eef9'],
            road: ['#5a6270', '#555d6b'], rumble: ['#e04b4b', '#ffffff'], lane: '#ffffff',
            wall: ['#cdd8e8', '#bcc9dd'], wallTop: '#ffffff', glow: false, snow: true,
            root: 50, tempo: 112
        },
        { // 3 coastal sunset (sea on the left)
            skyTop: '#3b1b6e', skyMid: '#ff6a5a', skyLow: '#ffd27a', fog: '#f59a6a',
            gL: ['#1f6f9c', '#1b6694'], gR: ['#e6c78c', '#dcbc80'],
            road: ['#4a4860', '#44425a'], rumble: ['#ffffff', '#ff5a7a'], lane: '#fff6e0',
            wall: ['#efe3d0', '#ddd0bb'], wallTop: '#ff5a7a', glow: false, snow: false,
            root: 55, tempo: 122
        },
        { // 4 emerald forest (daytime)
            skyTop: '#4aa3e0', skyMid: '#a8dcf0', skyLow: '#e8f7e0', fog: '#cfe9d4',
            gL: ['#3f9a47', '#388f40'], gR: ['#3f9a47', '#388f40'],
            road: ['#55575f', '#505259'], rumble: ['#ffffff', '#2f8f3f'], lane: '#fff8d0',
            wall: ['#8a6a48', '#7a5c3c'], wallTop: '#d9b27a', glow: false, snow: false,
            root: 52, tempo: 120
        },
        { // 5 ember canyon (volcanic dusk)
            skyTop: '#1a0a1a', skyMid: '#7a1f1a', skyLow: '#ff8a2a', fog: '#6a2a1a',
            gL: ['#2a1a1a', '#241616'], gR: ['#2a1a1a', '#241616'],
            road: ['#3a3434', '#343030'], rumble: ['#ff6a1a', '#2a2a2a'], lane: '#ffd9a0',
            wall: ['#5a3a30', '#4a2e26'], wallTop: '#ff6a1a', glow: true, snow: false,
            root: 48, tempo: 128
        },
        { // 6 harbor lights (night, water on the left)
            skyTop: '#02081c', skyMid: '#0a2a5a', skyLow: '#2a7ab0', fog: '#14406a',
            gL: ['#0a2a4a', '#0c3156'], gR: ['#1a1f2a', '#1e2431'],
            road: ['#2f3340', '#2a2e3a'], rumble: ['#ffd23f', '#2a2e3a'], lane: '#e8f4ff',
            wall: ['#4a5470', '#3e4760'], wallTop: '#ffd23f', glow: true, snow: false,
            root: 55, tempo: 124
        },
        { // 7 cherry hills (spring)
            skyTop: '#7ab8f0', skyMid: '#d7e8ff', skyLow: '#fff0f5', fog: '#f4dfe8',
            gL: ['#7fcf7a', '#74c470'], gR: ['#7fcf7a', '#74c470'],
            road: ['#5c5a66', '#56545f'], rumble: ['#ff8fb4', '#ffffff'], lane: '#ffffff',
            wall: ['#f0e4ea', '#e2d4dc'], wallTop: '#ff8fb4', glow: false, snow: false,
            root: 57, tempo: 116
        }
    ];

    SR.TRACKS = [
        [ // Neon District: tight city corners, small crests
            [20, 30, 20, 0, 0], [15, 35, 15, 4, 0], [10, 20, 10, 0, 8], [15, 30, 15, -5, 0], [10, 10, 10, 0, -8],
            [20, 40, 20, 3, 0], [10, 30, 10, -3, 6], [15, 25, 15, -6, 0], [10, 40, 10, 0, 0], [20, 50, 20, 5, 0],
            [10, 14, 10, 0, 14], [8, 6, 8, 0, -14], [15, 35, 15, -4, 0], [15, 25, 15, 6, 0], [20, 40, 20, 0, 0],
            [15, 30, 15, -3, 5], [10, 20, 10, 0, -5], [20, 60, 20, 4, 0], [15, 25, 15, -4, 0], [15, 35, 15, 5, 0],
            [10, 40, 10, 0, 0], [20, 40, 20, -5, 0], [10, 30, 10, 0, 0], [15, 30, 15, 4, 0], [25, 50, 25, 0, 0],
            [15, 30, 15, -5, 0], [15, 40, 15, 3, 0], [30, 60, 30, 0, 0]
        ],
        [ // Mirage Highway: long straights, sweeping bends, big hills
            [30, 70, 30, 0, 0], [30, 60, 30, 2, 0], [25, 40, 25, 0, 12], [20, 20, 20, 0, -14], [30, 70, 30, -2, 0],
            [30, 40, 30, 0, 18], [15, 10, 15, 0, -22], [25, 50, 25, 3, 0], [30, 80, 30, 0, 0], [30, 60, 30, -4, 0],
            [20, 30, 20, 0, 10], [20, 20, 20, 0, -10], [30, 80, 30, 2, 0], [25, 40, 25, -5, 0], [25, 40, 25, 0, 16],
            [12, 10, 12, 0, -18], [30, 70, 30, 0, 0], [25, 50, 25, 4, 0], [30, 50, 30, -3, 0], [30, 90, 30, 0, 0],
            [20, 40, 20, 5, 0], [20, 40, 20, -5, 0], [30, 60, 30, 0, 8], [20, 30, 20, 0, -8], [40, 80, 40, 0, 0]
        ],
        [ // Frostbite Pass: climbs, descents and hairpins
            [20, 30, 20, 0, 0], [20, 40, 20, 4, 14], [15, 30, 15, -5, 8], [15, 30, 15, 6, 10], [10, 20, 10, -6, -10],
            [15, 30, 15, 5, -12], [20, 40, 20, 0, 6], [15, 25, 15, -6, 12], [10, 15, 10, 6, 0], [15, 30, 15, -4, -14],
            [20, 40, 20, 3, -6], [10, 30, 10, 0, 14], [10, 8, 10, 0, -18], [15, 30, 15, 5, 0], [15, 25, 15, -6, 0],
            [10, 20, 10, 6, 10], [15, 30, 15, -5, -10], [20, 50, 20, 0, 0], [15, 25, 15, 6, 8], [15, 25, 15, -6, -8],
            [20, 40, 20, 4, 0], [15, 30, 15, -4, 12], [10, 8, 10, 0, -16], [20, 30, 20, 5, 0], [15, 35, 15, -5, 0],
            [25, 50, 25, 0, 0]
        ],
        [ // Golden Coast: flowing curves along the sea, gentle hills, finale straight
            [30, 50, 30, 0, 0], [25, 50, 25, 3, 6], [25, 40, 25, -3, 0], [20, 40, 20, 4, -6], [25, 50, 25, -4, 8],
            [20, 30, 20, 0, 0], [30, 50, 30, 5, 0], [20, 30, 20, 0, 12], [12, 10, 12, 0, -16], [25, 50, 25, -5, 0],
            [30, 50, 30, 2, 0], [20, 40, 20, -4, 6], [20, 40, 20, 5, -6], [30, 60, 30, 0, 0], [20, 30, 20, -6, 0],
            [25, 40, 25, 3, 10], [12, 10, 12, 0, -14], [25, 50, 25, 4, 0], [25, 50, 25, -3, 0], [30, 60, 30, 0, 6],
            [20, 30, 20, 0, -6], [20, 40, 20, -5, 0], [20, 40, 20, 6, 0], [40, 100, 40, 0, 0]
        ],
        [ // Emerald Forest: rolling hills, S-bends between the trees
            [25, 40, 25, 0, 0], [20, 40, 20, 3, 8], [20, 30, 20, -4, 6], [15, 30, 15, 5, -8], [20, 40, 20, -3, -6],
            [20, 30, 20, 0, 10], [10, 8, 10, 0, -14], [20, 40, 20, 4, 0], [15, 30, 15, -5, 0], [20, 40, 20, 3, 6],
            [15, 25, 15, -6, -6], [25, 50, 25, 0, 0], [20, 30, 20, 4, 8], [15, 25, 15, -4, 4], [12, 8, 12, 0, -16],
            [20, 40, 20, 5, 0], [20, 40, 20, -5, 0], [25, 50, 25, 3, 0], [15, 30, 15, -3, 8], [15, 30, 15, 0, -8],
            [20, 40, 20, 4, 0], [20, 40, 20, -4, 0], [30, 60, 30, 0, 0]
        ],
        [ // Ember Canyon: steep climbs, sharp bends, big drops
            [20, 30, 20, 0, 0], [20, 40, 20, 5, 18], [15, 25, 15, -6, 10], [10, 15, 10, 6, 0], [15, 30, 15, -5, -12],
            [10, 10, 10, 0, -18], [15, 30, 15, 6, 0], [20, 30, 20, -4, 14], [10, 6, 10, 0, -22], [15, 30, 15, 5, 0],
            [15, 25, 15, -6, 0], [20, 40, 20, 0, 12], [12, 8, 12, 0, -16], [15, 30, 15, -5, 0], [15, 30, 15, 6, 0],
            [20, 40, 20, 3, 0], [10, 20, 10, -6, 8], [10, 20, 10, 6, -8], [20, 50, 20, 0, 0], [15, 25, 15, -5, 0],
            [15, 30, 15, -6, 10], [10, 6, 10, 0, -14], [20, 40, 20, 5, 0], [15, 25, 15, -5, 0], [20, 40, 20, 4, 6], [10, 8, 10, 0, -12], [15, 25, 15, 6, 0], [25, 50, 25, 0, 0]
        ],
        [ // Harbor Lights: long quays, sharp dock corners, flat with a few crests
            [30, 60, 30, 0, 0], [15, 30, 15, 5, 0], [15, 30, 15, -5, 0], [25, 60, 25, 0, 0], [15, 25, 15, 6, 0],
            [10, 14, 10, 0, 12], [8, 6, 8, 0, -12], [20, 50, 20, -3, 0], [15, 30, 15, 5, 0], [20, 60, 20, 0, 0],
            [15, 25, 15, -6, 0], [15, 25, 15, -6, 0], [25, 50, 25, 0, 0], [10, 14, 10, 0, 14], [8, 6, 8, 0, -14],
            [20, 40, 20, 4, 0], [20, 40, 20, -4, 0], [30, 70, 30, 0, 0], [15, 25, 15, 6, 0], [15, 30, 15, -5, 0],
            [25, 60, 25, 0, 0], [15, 25, 15, 5, 0], [30, 80, 30, 0, 0]
        ],
        [ // Cherry Hills: gentle sweepers and soft crests
            [30, 50, 30, 0, 0], [25, 40, 25, 2, 8], [25, 40, 25, -3, 6], [20, 30, 20, 0, -10], [25, 50, 25, 4, -4],
            [20, 40, 20, -4, 6], [20, 30, 20, 0, 10], [12, 8, 12, 0, -14], [25, 50, 25, 3, 0], [25, 40, 25, -5, 0],
            [20, 30, 20, 0, 8], [20, 30, 20, 0, -8], [25, 50, 25, 5, 0], [20, 40, 20, -3, 4], [20, 40, 20, 4, -4],
            [25, 50, 25, 0, 0], [20, 30, 20, -5, 0], [20, 30, 20, 5, 0], [30, 60, 30, 2, 0], [25, 50, 25, -2, 0],
            [40, 80, 40, 0, 0]
        ]
    ];

    SR.MAXSEG = 3200;
    SR.SEG = SEG;
    SR.segCurve = new Float32Array(SR.MAXSEG);
    SR.segY = new Float32Array(SR.MAXSEG + 2);
    SR.segCount = 0;
    SR.trackLen = 0;

    function easeIn(a, b, p) { return a + (b - a) * Math.pow(p, 2); }
    function easeOut(a, b, p) { return a + (b - a) * (1 - Math.pow(1 - p, 2)); }
    function easeInOut(a, b, p) { return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5); }

    /* Fills SR.segCurve / SR.segY for track t (no allocation). */
    SR.buildTrack = function (t) {
        var secs = SR.TRACKS[t], n = 0, lastY = 0, i, k;
        var curve = SR.segCurve, y = SR.segY;
        function add(e, h, l, c, hy) {
            var startY = lastY, endY = startY + hy * SEG, total = e + h + l, j, cv;
            for (j = 0; j < e; j++) { cv = easeIn(0, c, j / e); curve[n] = cv; y[n] = easeInOut(startY, endY, j / total); n++; }
            for (j = 0; j < h; j++) { curve[n] = c; y[n] = easeInOut(startY, endY, (e + j) / total); n++; }
            for (j = 0; j < l; j++) { curve[n] = easeInOut(c, 0, j / l); y[n] = easeInOut(startY, endY, (e + h + j) / total); n++; }
            lastY = endY;
        }
        for (i = 0; i < secs.length; i++) { k = secs[i]; add(k[0], k[1], k[2], k[3], k[4]); }
        // come back to ground level smoothly, then a straight to close the lap
        add(30, 20, 30, 0, -lastY / SEG);
        SR.segCount = n;
        SR.trackLen = n * SEG;
        y[n] = y[0]; y[n + 1] = y[1];
        curve[n] = 0;
        return n;
    };
})();
