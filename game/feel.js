/* Feel: named SFX catalog + juice (punch, flash, ripples, floaters).
   Extends I with sounds the rest of the game (and future events) can call.
   Existing I.buy / I.coin / etc. stay — we only fill gaps and layer motion. */
(function () {
  "use strict";
  var jobs = [];
  window.__onBeat = function (fn, ms) {
    if (typeof fn !== "function") return;
    jobs.push({ fn: fn, ms: Math.max(120, ms || 280), last: 0 });
  };
  function pump() {
    var hidden = false;
    try {
      hidden = !!document.hidden;
    } catch (e) {}
    var t = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!hidden) {
      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        if (t - j.last >= j.ms) {
          j.last = t;
          try {
            j.fn();
          } catch (err) {}
        }
      }
    }
    setTimeout(pump, hidden ? 800 : 80);
  }
  setTimeout(pump, 100);
})();
(function () {
  "use strict";

  var reducedOS = false;
  try {
    reducedOS = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {}
  var reduced = reducedOS;

  /* Settings carries its own Reduce motion switch. It used to move the game's
     own drawing and leave this layer shaking the screen anyway. */
  function refreshCalm() {
    var r = reducedOS;
    try {
      if (window.gameState && gameState.reduceMotion) r = true;
    } catch (e) {}
    reduced = r;
  }

  var lastSfx = 0;
  var voices = 0;
  var VOICE_CAP = 14;
  var trauma = 0;
  var flashA = 0;
  var flashCol = "255,220,140";
  var overlay = null;
  var octx = null;
  var floats = [];
  var ripples = [];
  var sparks = [];
  var pellets = [];
  var last = 0;
  var shakeT = 0;
  var shakeSeed = 0;
  var painted = false;
  var hudPulse = Object.create(null);
  var wired = false;

  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function markSfx() {
    lastSfx = now();
  }

  function sfxOn() {
    try {
      var I = window.I || window.sfx;
      if (I && typeof I.ok === "function") return !!I.ok();
    } catch (e) {}
    return true;
  }

  /* sound.js holds the context when the bundle does not hand its own out. */
  function bridge() {
    try {
      return window.finsAudio || null;
    } catch (e) {
      return null;
    }
  }

  function audio() {
    try {
      if (window.oe && typeof oe.init === "function") oe.init();
      if (window.oe && oe.ctx) return oe.ctx;
      var b = bridge();
      return (b && b.ctx()) || null;
    } catch (e) {
      return null;
    }
  }

  function bus() {
    if (window.ge && ge.bus) return ge.bus;
    if (window.oe && oe.sfxBus) return oe.sfxBus;
    if (window.oe && oe.master) return oe.master;
    var b = bridge();
    var lb = b && b.bus();
    if (lb) return lb;
    var c = audio();
    return c ? c.destination : null;
  }

  function vol() {
    if ((window.ge && ge.bus) || (window.oe && oe.sfxBus)) return 1;
    var b = bridge();
    if (b && b.bus()) return b.vol();
    return 0.55;
  }

  function ok() {
    if (!sfxOn()) return false;
    var b = bridge();
    if (!(window.oe && oe.ctx) && b) return b.ok();
    var c = audio();
    if (!c) return false;
    if (c.state === "suspended") {
      try {
        c.resume();
      } catch (e) {}
    }
    return true;
  }

  function panTo(x) {
    if (!isFinite(x)) return;
    if (window.ge) {
      try {
        var W = typeof window.D === "number" && window.D ? window.D : (overlay && overlay.width) || 1;
        ge.pan = Math.max(-0.6, Math.min(0.6, (x / W) * 2 - 1));
        ge.hint = x;
      } catch (e) {}
    }
    var b = bridge();
    if (b) {
      try {
        b.panAt(x);
      } catch (e) {}
    }
  }

  function endVoice(node, t) {
    voices++;
    node.onended = function () {
      voices--;
      try {
        node.disconnect();
      } catch (e) {}
    };
    try {
      node.stop(t);
    } catch (e) {}
  }

  function connect(node) {
    var c = audio();
    var b = bridge();
    if (c && b && !(window.ge && ge.bus) && b.bus()) return b.connect(node);
    var out = bus();
    if (!c || !out) return node;
    var p = window.ge && isFinite(ge.pan) && Math.abs(ge.pan) > 0.04 && c.createStereoPanner;
    if (p) {
      try {
        var pn = c.createStereoPanner();
        pn.pan.value = Math.max(-1, Math.min(1, ge.pan));
        node.connect(pn);
        pn.connect(out);
        return node;
      } catch (e) {}
    }
    node.connect(out);
    return node;
  }

  function osc(type, freq, dur, amp, slide, delay) {
    if (!ok() || voices > VOICE_CAP) return;
    var c = audio();
    if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || "sine";
    var f0 = Math.max(20, freq || 440);
    o.frequency.setValueAtTime(f0, t);
    if (slide && slide > 0) {
      try {
        o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
      } catch (e) {
        o.frequency.linearRampToValueAtTime(Math.max(20, slide), t + dur);
      }
    }
    var a = Math.max(0.0008, (amp || 0.08) * vol());
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    o.connect(g);
    connect(g);
    o.start(t);
    endVoice(o, t + dur + 0.03);
  }

  function noise(dur, amp, freq, kind, delay, q) {
    if (!ok() || voices > VOICE_CAP) return;
    var c = audio();
    if (!c) return;
    var t = c.currentTime + (delay || 0);
    var src = c.createBufferSource();
    src.buffer = pinkBuf(c);
    src.loop = true;
    /* Start somewhere else in the buffer each time so a repeated cue is not
       the same grain of noise twice. */
    var skip = Math.random() * Math.max(0.01, src.buffer.duration - dur - 0.05);
    var f = c.createBiquadFilter();
    f.type = kind || "lowpass";
    f.frequency.value = Math.max(60, freq || 800);
    f.Q.value = q == null ? 0.8 : q;
    var g = c.createGain();
    var a = Math.max(0.0008, (amp || 0.06) * vol());
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    connect(g);
    src.start(t, skip);
    endVoice(src, t + dur + 0.03);
  }

  /* Two seconds of pink noise, built once and read from a different offset on
     every cue. The old path allocated a buffer per call: a quarter of a
     megabyte a shot in a game that is meant to be left running. */
  var pink = null;
  var pinkCtx = null;

  function pinkBuf(c) {
    var b = bridge();
    if (b && typeof b.noise === "function") {
      var shared = b.noise("pink", 2);
      if (shared) return shared;
    }
    if (pink && pinkCtx === c) return pink;
    var n = Math.max(64, Math.round(c.sampleRate * 2));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var data = buf.getChannelData(0);
    var acc = 0;
    for (var i = 0; i < n; i++) {
      acc = acc * 0.92 + (Math.random() * 2 - 1) * 0.08;
      data[i] = acc * 6;
    }
    pink = buf;
    pinkCtx = c;
    return buf;
  }

  function jitter(f, amt) {
    return f * (1 + (Math.random() * 2 - 1) * (amt == null ? 0.04 : amt));
  }

  /* Named catalog — only used when I[name] is missing. */
  var CATALOG = {
    click: function () {
      noise(0.03, 0.07, 3200, "bandpass", 0, 2.4);
      osc("triangle", jitter(920, 0.04), 0.05, 0.05);
    },
    hover: function () {
      osc("sine", jitter(1680, 0.03), 0.04, 0.03);
    },
    modal: function () {
      osc("triangle", 392, 0.08, 0.07);
      osc("triangle", 523.25, 0.12, 0.05, 0, 0.05);
    },
    page: function () {
      noise(0.08, 0.05, 1800, "bandpass", 0, 0.7);
      osc("triangle", jitter(340, 0.08), 0.07, 0.04, 220);
    },
    paper: function () {
      noise(0.12, 0.07, 2400, "highpass", 0, 0.5);
      noise(0.08, 0.04, 4200, "bandpass", 0.04, 1.2);
    },
    rustle: function () {
      noise(0.16, 0.06, 2100, "highpass");
    },
    cash: function () {
      osc("square", jitter(1180, 0.02), 0.05, 0.05);
      osc("square", jitter(1560, 0.02), 0.07, 0.06, 0, 0.045);
      noise(0.05, 0.04, 2800, "bandpass", 0.02);
    },
    register: function () {
      noise(0.05, 0.08, 900, "lowpass");
      osc("square", 1318, 0.08, 0.06, 0, 0.07);
      osc("square", 1760, 0.1, 0.05, 0, 0.13);
    },
    bag: function () {
      noise(0.14, 0.07, 700, "lowpass");
      noise(0.08, 0.04, 2400, "bandpass", 0.05);
    },
    net: function () {
      noise(0.18, 0.08, 1400, "bandpass", 0, 0.6);
      osc("sine", 220, 0.16, 0.04, 90);
    },
    pour: function () {
      noise(0.45, 0.09, 1800, "bandpass", 0, 0.4);
      osc("sine", 180, 0.35, 0.04, 90);
    },
    water: function () {
      noise(0.28, 0.08, 1600, "bandpass");
      osc("sine", jitter(240, 0.1), 0.18, 0.05, 80);
    },
    gravel: function () {
      noise(0.12, 0.1, 500, "lowpass");
      noise(0.08, 0.05, 1600, "bandpass", 0.03);
    },
    lid: function () {
      osc("triangle", 180, 0.1, 0.08, 90);
      noise(0.06, 0.06, 800, "lowpass", 0.02);
    },
    heater: function () {
      osc("sine", 62, 0.22, 0.05);
      noise(0.08, 0.03, 400, "lowpass", 0.04);
    },
    switch: function () {
      noise(0.025, 0.08, 2200, "bandpass", 0, 3);
      osc("square", jitter(240, 0.05), 0.04, 0.04);
    },
    pump: function () {
      osc("sine", 96, 0.28, 0.05, 74);
      osc("sine", 74, 0.28, 0.03, 0, 0.02);
    },
    drip: function () {
      osc("sine", jitter(1400, 0.08), 0.08, 0.06, 480);
      noise(0.05, 0.03, 3000, "bandpass", 0.03);
    },
    gulp: function () {
      osc("sine", jitter(220, 0.1), 0.1, 0.07, 90);
      noise(0.07, 0.05, 900, "lowpass");
    },
    dart: function () {
      osc("sine", jitter(640, 0.08), 0.08, 0.05, 180);
      noise(0.05, 0.04, 2000, "highpass");
    },
    death: function () {
      osc("sawtooth", 180, 0.28, 0.07, 70);
      osc("triangle", 110, 0.32, 0.05, 48, 0.04);
    },
    feed: function () {
      noise(0.06, 0.05, 1800, "bandpass");
      osc("triangle", jitter(520, 0.08), 0.07, 0.05, 240);
    },
    pop: function () {
      osc("sine", jitter(880, 0.06), 0.07, 0.07, 220);
      noise(0.04, 0.04, 2600, "bandpass");
    },
    whoosh: function () {
      noise(0.22, 0.08, 900, "bandpass", 0, 0.5);
      osc("sine", 280, 0.18, 0.03, 80);
    },
    swoosh: function () {
      noise(0.16, 0.07, 1400, "highpass");
    },
    stamp: function () {
      noise(0.05, 0.1, 600, "lowpass");
      osc("sine", 140, 0.09, 0.08, 60);
    },
    phone: function () {
      osc("square", 440, 0.18, 0.06);
      osc("square", 480, 0.18, 0.05, 0, 0.02);
      osc("square", 440, 0.18, 0.06, 0, 0.38);
      osc("square", 480, 0.18, 0.05, 0, 0.4);
    },
    keys: function () {
      osc("square", jitter(2100, 0.08), 0.05, 0.04);
      osc("square", jitter(2600, 0.08), 0.04, 0.03, 0, 0.04);
      noise(0.04, 0.03, 4000, "bandpass", 0.02);
    },
    drawer: function () {
      noise(0.12, 0.07, 500, "lowpass");
      osc("triangle", 140, 0.14, 0.05, 80);
    },
    wood: function () {
      osc("triangle", jitter(180, 0.06), 0.1, 0.07, 90);
      noise(0.06, 0.05, 700, "lowpass");
    },
    metal: function () {
      osc("square", jitter(1320, 0.04), 0.18, 0.05);
      osc("square", jitter(1975, 0.04), 0.12, 0.03, 0, 0.01);
    },
    glass: function () {
      osc("sine", jitter(2100, 0.03), 0.22, 0.05);
      osc("sine", jitter(3150, 0.03), 0.16, 0.03, 0, 0.01);
    },
    scrape: function () {
      noise(0.2, 0.07, 1100, "bandpass", 0, 1.4);
    },
    zipper: function () {
      noise(0.16, 0.06, 2800, "bandpass", 0, 2);
      osc("sawtooth", 400, 0.12, 0.03, 900);
    },
    clock: function () {
      osc("square", jitter(1100, 0.02), 0.03, 0.04);
      noise(0.02, 0.03, 2500, "bandpass");
    },
    thunder: function () {
      noise(0.55, 0.16, 180, "lowpass");
      osc("sine", 48, 0.5, 0.1, 28);
    },
    wind: function () {
      noise(0.7, 0.07, 700, "bandpass", 0, 0.4);
    },
    levelup: function () {
      osc("triangle", 523.25, 0.12, 0.07);
      osc("triangle", 659.25, 0.14, 0.07, 0, 0.1);
      osc("triangle", 783.99, 0.18, 0.08, 0, 0.2);
      osc("triangle", 1046.5, 0.28, 0.07, 0, 0.32);
    },
    research: function () {
      osc("sine", 392, 0.1, 0.05);
      osc("sine", 494, 0.12, 0.05, 0, 0.08);
      osc("sine", 587, 0.18, 0.06, 0, 0.16);
    },
    xp: function () {
      osc("sine", jitter(1320, 0.03), 0.08, 0.05);
      osc("sine", jitter(1760, 0.03), 0.1, 0.04, 0, 0.05);
    },
    debt: function () {
      osc("sawtooth", 98, 0.22, 0.07, 70);
      osc("triangle", 73, 0.28, 0.05, 0, 0.04);
    },
    loan: function () {
      osc("triangle", 196, 0.12, 0.06);
      osc("triangle", 247, 0.16, 0.05, 0, 0.08);
      noise(0.08, 0.04, 900, "lowpass", 0.04);
    },
    siren: function () {
      osc("sine", 680, 0.35, 0.06, 980);
      osc("sine", 980, 0.35, 0.05, 680, 0.32);
    },
    crowd: function () {
      noise(0.4, 0.06, 400, "bandpass", 0, 0.6);
      noise(0.3, 0.04, 900, "bandpass", 0.05, 0.8);
    },
    cheer: function () {
      osc("triangle", 784, 0.2, 0.05);
      osc("triangle", 988, 0.22, 0.05, 0, 0.06);
      noise(0.24, 0.05, 1200, "bandpass", 0.04);
    },
    clap: function () {
      noise(0.06, 0.12, 1800, "bandpass", 0, 1.2);
      noise(0.04, 0.06, 3200, "highpass", 0.01);
    },
    engine: function () {
      osc("sawtooth", 70, 0.4, 0.05, 90);
      noise(0.4, 0.05, 220, "lowpass");
    },
    dock: function () {
      osc("sine", 90, 0.18, 0.08, 50);
      noise(0.12, 0.07, 400, "lowpass");
    },
    snapshot: function () {
      noise(0.04, 0.1, 4000, "highpass");
      osc("sine", 180, 0.08, 0.05, 60);
    },
    notify: function () {
      osc("sine", 880, 0.08, 0.06);
      osc("sine", 1320, 0.12, 0.05, 0, 0.07);
    },
    success: function () {
      osc("triangle", 659.25, 0.1, 0.07);
      osc("triangle", 880, 0.16, 0.07, 0, 0.09);
    },
    error: function () {
      osc("sawtooth", 160, 0.16, 0.07, 90);
      osc("triangle", 120, 0.18, 0.05, 0, 0.05);
    },
    murmur: function () {
      noise(0.28, 0.04, 280, "bandpass", 0, 2.2);
      osc("triangle", jitter(180, 0.12), 0.22, 0.03);
    },
    gull: function () {
      osc("sawtooth", jitter(1100, 0.08), 0.16, 0.04, 1400);
      osc("sawtooth", jitter(900, 0.08), 0.12, 0.03, 1200, 0.18);
    },
    horn: function () {
      osc("square", jitter(310, 0.04), 0.28, 0.05);
      osc("square", jitter(370, 0.04), 0.28, 0.04, 0, 0.01);
    },
    car: function () {
      noise(0.5, 0.05, 500, "lowpass");
      osc("sawtooth", 90, 0.4, 0.03, 70);
    },
    sneeze: function () {
      noise(0.08, 0.1, 1800, "bandpass");
      osc("sine", 200, 0.1, 0.05, 80);
    },
    cough: function () {
      noise(0.1, 0.08, 700, "lowpass");
      osc("triangle", 140, 0.1, 0.05, 70);
    },
    heartbeat: function () {
      osc("sine", 70, 0.1, 0.08, 40);
      osc("sine", 70, 0.1, 0.06, 40, 0.22);
    },
    type: function () {
      noise(0.02, 0.05, 4200, "bandpass", 0, 3);
      osc("square", jitter(480, 0.1), 0.03, 0.03);
    },
    whistle: function () {
      osc("sine", jitter(1480, 0.04), 0.16, 0.05, 1680);
      osc("sine", jitter(1760, 0.04), 0.12, 0.04, 1980, 0.08);
    },
    shutter: function () {
      noise(0.03, 0.1, 3500, "highpass");
      osc("sine", 90, 0.06, 0.05, 50);
    },
    bubble: function () {
      osc("sine", jitter(420, 0.12), 0.08, 0.05, jitter(900, 0.1));
      osc("sine", jitter(360, 0.12), 0.06, 0.03, jitter(800, 0.1), 0.05);
    },
    rain: function () {
      noise(0.6, 0.06, 3500, "highpass");
    },
    room: function () {
      noise(0.2, 0.04, 900, "bandpass");
    },
  };

  /* Aliases so future code can use either name. */
  CATALOG.waterchange = CATALOG.pour;
  CATALOG.pellet = CATALOG.feed;
  CATALOG.drop = CATALOG.pop;
  CATALOG.alarm = CATALOG.siren;
  CATALOG.level = CATALOG.levelup;
  CATALOG.achievement = CATALOG.success;
  CATALOG.ui = CATALOG.click;
  CATALOG.open = CATALOG.modal;
  CATALOG.shut = CATALOG.lid;
  CATALOG.foot = CATALOG.wood;
  CATALOG.whistle = CATALOG.whistle;
  CATALOG.tune = CATALOG.whistle;

  function playNamed(name, x) {
    if (!name) return false;
    name = String(name);
    if (isFinite(x)) panTo(x);
    var I = window.I || window.sfx;
    if (I && typeof I[name] === "function" && !I[name].__feelSynth) {
      try {
        I[name]();
        markSfx();
        return true;
      } catch (e) {}
    }
    var fn = CATALOG[name];
    if (!fn) return false;
    try {
      fn();
      markSfx();
    } catch (e) {}
    if (window.ge) {
      try {
        ge.pan = 0;
        ge.hint = null;
      } catch (err) {}
    }
    return true;
  }

  function punch(amt) {
    if (reduced) return;
    trauma = Math.min(1, trauma + (amt == null ? 0.25 : amt));
    shakeSeed = Math.random() * 6.283;
  }

  function flash(color, amt) {
    if (reduced) return;
    flashA = Math.max(flashA, amt == null ? 0.22 : amt);
    if (color) {
      var c = color;
      if (c[0] === "#") {
        var h = c.slice(1);
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var n = parseInt(h, 16);
        flashCol = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
      }
    }
  }

  function floatText(text, x, y, color) {
    if (reduced && floats.length > 6) return;
    var cv = document.getElementById("tank");
    var r = cv ? cv.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    var str = String(text);
    var mag = Math.abs(parseFloat(str.replace(/[^0-9.\-]/g, ""))) || 0;
    floats.push({
      t: 0,
      dur: 0.95,
      x: x == null ? r.width * 0.5 : x,
      y: y == null ? r.height * 0.42 : y,
      text: str,
      col: color || "#f4c453",
      /* A four-figure sale should not come up the same size as a penny. */
      size: 15 + Math.min(11, Math.log(1 + mag) * 1.9),
      drift: (Math.random() * 2 - 1) * 9,
    });
    if (floats.length > 24) floats.shift();
  }

  function ripple(x, y, color) {
    if (reduced) return;
    ripples.push({
      t: 0,
      dur: 0.86,
      x: x,
      y: y,
      col: color || "180,220,245",
      r0: 5,
      r1: 62,
    });
    if (ripples.length > 18) ripples.shift();
  }

  function spark(x, y, col, opt) {
    opt = opt || {};
    var a = opt.a == null ? Math.random() * Math.PI * 2 : opt.a;
    var sp = opt.sp == null ? 40 + Math.random() * 90 : opt.sp;
    sparks.push({
      t: 0,
      dur: opt.dur || 0.45 + Math.random() * 0.35,
      x: x,
      y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (opt.lift == null ? 30 : opt.lift),
      col: col || "#f4c453",
      r: opt.r || 1.4 + Math.random() * 2.2,
      drag: opt.drag == null ? 1.6 : opt.drag,
      grav: opt.grav == null ? 140 : opt.grav,
      flake: !!opt.flake,
      rot: Math.random() * 6.283,
      spin: (Math.random() * 2 - 1) * 7,
    });
    if (sparks.length > 90) sparks.splice(0, sparks.length - 90);
  }

  function burst(x, y, color, n) {
    n = reduced ? Math.min(n || 8, 6) : n || 12;
    for (var i = 0; i < n; i++) {
      spark(x, y, color, { a: (i / n) * Math.PI * 2 + Math.random() * 0.4 });
    }
  }

  /* Paper, not sparks: each flake keeps its own colour, turns as it falls and
     is slowed by the air rather than dropping like shot. */
  function confetti(x, y) {
    var cols = ["#f4c453", "#ff6f59", "#3fbf8a", "#dcd3ff", "#7ac74f", "#e6f1f8"];
    var n = reduced ? 10 : 26;
    for (var i = 0; i < n; i++) {
      spark(x, y, cols[i % cols.length], {
        a: -Math.PI * 0.5 + (Math.random() * 2 - 1) * 1.15,
        sp: 90 + Math.random() * 190,
        lift: 60,
        dur: 0.9 + Math.random() * 0.7,
        r: 2.2 + Math.random() * 2.6,
        drag: 2.4,
        grav: 190,
        flake: true,
      });
    }
  }

  function feedDrop(x, y) {
    pellets.push({
      t: 0,
      dur: 0.55,
      x: x,
      y0: y - 40,
      y1: y,
      r: 2.2 + Math.random(),
    });
    if (pellets.length > 20) pellets.shift();
    playNamed("feed", x);
  }

  function coinFly(x, y, amount) {
    var el = document.getElementById("r-coins");
    var r = el ? el.getBoundingClientRect() : { left: innerWidth * 0.2, top: 18, width: 40, height: 20 };
    var cv = document.getElementById("tank");
    var cr = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
    floats.push({
      t: 0,
      dur: 0.7,
      x: x,
      y: y,
      tx: r.left + r.width * 0.5 - cr.left,
      ty: r.top + r.height * 0.5 - cr.top,
      text: amount != null ? (amount > 0 ? "+" + amount : String(amount)) : "$",
      col: "#f4c453",
      fly: 1,
      size: 16,
      /* Thrown, not dragged: the control point lifts the arc above the line. */
      cx: x + (r.left + r.width * 0.5 - cr.left - x) * 0.4,
      cy: Math.min(y, r.top + r.height * 0.5 - cr.top) - 70,
    });
    pulseHud("r-coins");
  }

  function pulseHud(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var v = el.querySelector(".v") || el;
    v.classList.remove("tick");
    void v.offsetWidth;
    v.classList.add("tick");
    hudPulse[id] = now();
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("canvas");
    overlay.id = "feelfx";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    octx = overlay.getContext("2d");
    syncOverlay();
  }

  var ovW = 0;
  var ovH = 0;
  var ovDpr = 0;

  function syncOverlay() {
    if (!overlay) return;
    var dpr = Math.min((window.__finsGlass && window.__finsGlass.dpr) || 2, window.devicePixelRatio || 1);
    var w = innerWidth;
    var h = innerHeight;
    if (w === ovW && h === ovH && dpr === ovDpr) return;
    ovW = w;
    ovH = h;
    ovDpr = dpr;
    overlay.width = Math.round(w * dpr);
    overlay.height = Math.round(h * dpr);
    overlay.style.width = w + "px";
    overlay.style.height = h + "px";
    if (octx) octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* How much of the spark's path is smeared behind it. A fixed slice of time,
     not a frame, so it draws the same length on any panel. */
  var TRAIL = 0.026;

  function busy() {
    return (
      flashA > 0.002 ||
      trauma > 0.002 ||
      floats.length > 0 ||
      ripples.length > 0 ||
      sparks.length > 0 ||
      pellets.length > 0
    );
  }

  function clearAll() {
    floats.length = 0;
    ripples.length = 0;
    sparks.length = 0;
    pellets.length = 0;
    flashA = 0;
    trauma = 0;
  }

  function tick(t) {
    var gap = last ? (t - last) / 1000 : 0.016;
    /* Back from a background tab: run the room forward, do not replay a
       splash that finished while nobody was looking. */
    if (gap > 0.5) {
      clearAll();
      var tankBack = document.getElementById("tank");
      if (tankBack && tankBack.style.transform) tankBack.style.transform = "";
    }
    var dt = last ? Math.min(0.05, gap) : 0.016;
    last = t;
    refreshCalm();

    if (trauma > 0.002 && !reduced) {
      trauma = Math.max(0, trauma - dt * 2.6);
      shakeT += dt;
      var sh = trauma * trauma;
      var tank = document.getElementById("tank");
      if (tank) {
        /* A decaying wobble on two rates rather than fresh noise per frame:
           an impact reads the same on a 165 Hz panel as on a 60 Hz one, where
           per-frame jitter just reads as static. */
        var ox = Math.sin(shakeT * 78.5 + shakeSeed) * sh * 11;
        var oy = Math.sin(shakeT * 61.3 + shakeSeed * 1.7 + 1.1) * sh * 7.5;
        tank.style.transform = "translate(" + ox.toFixed(2) + "px," + oy.toFixed(2) + "px)";
      }
    } else if (trauma) {
      trauma = 0;
      var tank2 = document.getElementById("tank");
      if (tank2) tank2.style.transform = "";
    }
    if (flashA > 0.002) flashA = Math.max(0, flashA - dt * 2.8);
    else flashA = 0;

    var i;
    for (i = floats.length - 1; i >= 0; i--) {
      floats[i].t += dt;
      if (floats[i].t >= floats[i].dur) floats.splice(i, 1);
    }
    for (i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt;
      if (ripples[i].t >= ripples[i].dur) ripples.splice(i, 1);
    }
    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      /* Air, so a flake settles instead of accelerating away. */
      var k = Math.max(0, 1 - s.drag * dt);
      s.vx *= k;
      s.vy = s.vy * k + s.grav * dt;
      s.rot += s.spin * dt;
      if (s.t >= s.dur) sparks.splice(i, 1);
    }
    for (i = pellets.length - 1; i >= 0; i--) {
      pellets[i].t += dt;
      if (pellets[i].t >= pellets[i].dur) pellets.splice(i, 1);
    }

    /* An idle shop should not be paying for a full-screen clear sixty times a
       second. Draw while there is something to draw, wipe once when there is
       not, then leave the canvas alone. */
    if (busy()) {
      draw();
      painted = true;
    } else if (painted) {
      syncOverlay();
      if (octx) octx.clearRect(0, 0, innerWidth, innerHeight);
      painted = false;
    }
    requestAnimationFrame(tick);
  }

  function draw() {
    if (!octx) return;
    syncOverlay();
    var w = innerWidth;
    var h = innerHeight;
    octx.clearRect(0, 0, w, h);

    /* A flat white rectangle over the whole room reads as a cheap cut. The
       light comes in at the edges and leaves the glass alone. */
    if (flashA > 0.01) {
      var fa = flashA * flashA * 1.9;
      var gr = octx.createRadialGradient(w * 0.5, h * 0.44, Math.min(w, h) * 0.12, w * 0.5, h * 0.44, Math.max(w, h) * 0.72);
      gr.addColorStop(0, "rgba(" + flashCol + "," + (fa * 0.34).toFixed(3) + ")");
      gr.addColorStop(0.55, "rgba(" + flashCol + "," + (fa * 0.62).toFixed(3) + ")");
      gr.addColorStop(1, "rgba(" + flashCol + "," + Math.min(0.85, fa).toFixed(3) + ")");
      octx.fillStyle = gr;
      octx.fillRect(0, 0, w, h);
    }

    var k, p, a, u;

    /* Rings on a surface: they slow as they widen, thin as they go, and carry
       a second ring behind the first. */
    for (k = 0; k < ripples.length; k++) {
      p = ripples[k];
      u = p.t / p.dur;
      var spread = 1 - Math.pow(1 - u, 2.4);
      a = Math.pow(1 - u, 1.7);
      var rad = p.r0 + (p.r1 - p.r0) * spread;
      octx.lineWidth = 0.7 + 2.1 * (1 - u);
      octx.strokeStyle = "rgba(" + p.col + "," + (0.5 * a).toFixed(3) + ")";
      octx.beginPath();
      octx.ellipse(p.x, p.y, rad, rad * 0.88, 0, 0, Math.PI * 2);
      octx.stroke();
      if (rad > 16) {
        octx.lineWidth = 0.6 + 1.1 * (1 - u);
        octx.strokeStyle = "rgba(" + p.col + "," + (0.22 * a).toFixed(3) + ")";
        octx.beginPath();
        octx.ellipse(p.x, p.y, rad * 0.61, rad * 0.54, 0, 0, Math.PI * 2);
        octx.stroke();
      }
    }

    for (k = 0; k < pellets.length; k++) {
      p = pellets[k];
      u = p.t / p.dur;
      var yy = p.y0 + (p.y1 - p.y0) * (u * u);
      octx.fillStyle = "rgba(217,160,107," + (1 - u * 0.3).toFixed(3) + ")";
      octx.beginPath();
      octx.arc(p.x, yy, p.r, 0, 7);
      octx.fill();
    }

    /* Sparks add light; paper does not. */
    if (sparks.length) {
      octx.lineCap = "round";
      for (k = 0; k < sparks.length; k++) {
        p = sparks[k];
        u = p.t / p.dur;
        a = Math.pow(1 - u, 1.4);
        octx.globalAlpha = a;
        if (p.flake) {
          octx.globalCompositeOperation = "source-over";
          octx.save();
          octx.translate(p.x, p.y);
          octx.rotate(p.rot);
          octx.fillStyle = p.col;
          /* Turned edge-on it is a sliver, flat on it is a square of paper. */
          var fw = p.r * 2.1;
          var fh = p.r * 1.3 * Math.abs(Math.cos(p.rot * 1.6));
          octx.fillRect(-fw * 0.5, -fh * 0.5, fw, Math.max(0.7, fh));
          octx.restore();
        } else {
          octx.globalCompositeOperation = "lighter";
          octx.strokeStyle = p.col;
          octx.lineWidth = Math.max(0.9, p.r * 1.8 * (1 - u * 0.55));
          octx.beginPath();
          octx.moveTo(p.x - p.vx * TRAIL, p.y - p.vy * TRAIL);
          octx.lineTo(p.x, p.y);
          octx.stroke();
        }
      }
      octx.globalCompositeOperation = "source-over";
      octx.globalAlpha = 1;
    }

    octx.textAlign = "center";
    octx.textBaseline = "middle";
    for (k = 0; k < floats.length; k++) {
      p = floats[k];
      var tt = p.t / p.dur;
      var ease = 1 - Math.pow(1 - tt, 3);
      var fx = p.x;
      var fy = p.y - 46 * ease;
      if (p.fly && p.tx != null) {
        /* Quadratic through the lifted control point, so the coin is thrown
           at the till rather than slid along a rail. */
        var iv = 1 - ease;
        fx = iv * iv * p.x + 2 * iv * ease * p.cx + ease * ease * p.tx;
        fy = iv * iv * p.y + 2 * iv * ease * p.cy + ease * ease * p.ty;
      } else {
        fx += p.drift * ease;
      }
      /* Lands slightly over size, then settles. */
      var sc = tt < 0.16 ? 0.62 + (tt / 0.16) * 0.52 : 1.14 - Math.min(1, (tt - 0.16) / 0.22) * 0.14;
      var size = Math.round((p.size || 16) * sc);
      octx.font = "800 " + size + "px Nunito, 'Segoe UI', system-ui, sans-serif";
      octx.globalAlpha = tt < 0.7 ? 1 : 1 - (tt - 0.7) / 0.3;
      octx.strokeStyle = "rgba(6,14,24,.6)";
      octx.lineWidth = Math.max(2, size * 0.17);
      octx.lineJoin = "round";
      octx.strokeText(p.text, fx, fy);
      octx.fillStyle = p.col;
      octx.fillText(p.text, fx, fy);
    }
    octx.globalAlpha = 1;
  }

  function wrapI(name, after) {
    var I = window.I || window.sfx;
    if (!I || typeof I[name] !== "function" || I[name].__feelWrap) return;
    var orig = I[name];
    I[name] = function () {
      markSfx();
      var r = orig.apply(this, arguments);
      try {
        after.apply(this, arguments);
      } catch (e) {}
      return r;
    };
    I[name].__feelWrap = 1;
  }

  function fillGaps() {
    var I = window.I || window.sfx;
    if (!I) return;
    Object.keys(CATALOG).forEach(function (name) {
      if (typeof I[name] !== "function") {
        I[name] = function (x) {
          playNamed(name, x);
        };
        I[name].__feelSynth = 1;
      }
    });
  }

  var lastToastJuice = 0;

  function juiceForToast(kind, msg) {
    var k = String(kind || "");
    if (!k || k === "hint") return;
    if (now() - lastToastJuice < 420) return;
    lastToastJuice = now();
    if (k === "bad") {
      flash("#ff6f59", 0.1);
      punch(0.08);
    } else if (k === "gold") {
      flash("#f4c453", 0.06);
      pulseHud("r-coins");
    } else if (k === "prog") {
      flash("#f4c453", 0.05);
      pulseHud("r-level");
    } else if (k === "good") {
      pulseHud("r-fish");
    }
    if (now() - lastSfx < 180) return;
    if (k === "bad") playNamed(/warn|clog|ill|sick|debt|owe/.test(String(msg || "")) ? "warn" : "bad");
    else if (k === "gold") playNamed("coin");
    else if (k === "prog") playNamed("sparkle");
    else if (k === "good") playNamed("chime");
  }

  function pointerRipple(ev) {
    if (document.body.classList.contains("titling")) return;
    var cv = document.getElementById("tank");
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    var x = (ev.clientX || 0) - r.left;
    var y = (ev.clientY || 0) - r.top;
    var scene = "";
    try {
      if (typeof window.sceneOn === "function") scene = String(window.sceneOn() || "");
    } catch (e) {}
    if (scene === "shop") ripple(x, y, "210,190,160");
    else {
      ripple(x, y, "190,230,255");
      if (now() - lastSfx > 220) playNamed("drip", x);
    }
  }

  function onEventCard(node) {
    if (!node || !node.classList) return;
    var r = node.getBoundingClientRect();
    var x = r.left + r.width * 0.5;
    var y = r.top + r.height * 0.5;
    if (node.classList.contains("order") || node.classList.contains("wild")) {
      if (now() - lastSfx > 80) playNamed("bell", x);
      punch(0.08);
      ripple(x, y, "244,196,83");
    } else if (node.classList.contains("sick")) {
      if (now() - lastSfx > 80) playNamed("warn", x);
      flash("#ff6f59", 0.1);
    } else if (node.classList.contains("filter")) {
      if (now() - lastSfx > 80) playNamed("pump", x);
    }
  }

  function wire() {
    if (wired) return;
    wired = true;
    fillGaps();
    var I0 = window.I || window.sfx;
    if (I0 && typeof I0.fx !== "function") I0.fx = playNamed;
    wrapI("coin", function () {
      pulseHud("r-coins");
    });
    wrapI("buy", function () {
      flash("#f4c453", 0.06);
    });
    wrapI("sell", function () {
      pulseHud("r-coins");
      flash("#3fbf8a", 0.06);
    });
    wrapI("bad", function () {
      punch(0.16);
      flash("#ff6f59", 0.12);
    });
    wrapI("thud", function () {
      punch(0.28);
    });
    wrapI("crit", function () {
      punch(0.4);
      flash("#ff6f59", 0.16);
    });
    wrapI("splash", function () {
      ripple(innerWidth * 0.5, innerHeight * 0.28, "190,230,255");
    });
    wrapI("award", function () {
      confetti(innerWidth * 0.5, innerHeight * 0.28);
      punch(0.22);
      flash("#f4c453", 0.14);
    });
    wrapI("chime", function () {
      flash("#f4c453", 0.05);
    });
    wrapI("hatch", function () {
      burst(innerWidth * 0.5, innerHeight * 0.55, "#cfe6f2", 14);
    });
    wrapI("unlock", function () {
      flash("#dcd3ff", 0.1);
      punch(0.12);
    });
    wrapI("warn", function () {
      flash("#ff6f59", 0.1);
    });
    wrapI("door", function () {
      flash("#f4c453", 0.04);
    });
    wrapI("shot", function () {
      punch(0.55);
      flash("#fff6d8", 0.35);
    });
    wrapI("gavel", function () {
      punch(0.2);
    });

    try {
      var prevShow = window.toastShow;
      if (typeof prevShow === "function") {
        window.toastShow = function (msg, kind, n) {
          try {
            juiceForToast(kind, msg);
          } catch (e) {}
          return prevShow.apply(this, arguments);
        };
      }
    } catch (e) {}

    try {
      var sc = window.spawnCoin;
      if (typeof sc === "function") {
        window.spawnCoin = function (fish) {
          var r = sc.apply(this, arguments);
          try {
            if (fish && isFinite(fish.x)) {
              coinFly(fish.x, fish.y, fish.v);
              if (now() - lastSfx > 60) playNamed("coin", fish.x);
            }
          } catch (e) {}
          return r;
        };
      }
    } catch (e) {}

    var tank = document.getElementById("tank");
    if (tank) {
      tank.addEventListener(
        "pointerdown",
        function (ev) {
          try {
            pointerRipple(ev);
          } catch (e) {}
        },
        { passive: true }
      );
    }

    document.addEventListener(
      "click",
      function (ev) {
        var t = ev.target;
        if (!t || !t.closest) return;
        if (t.closest(".buy") && !t.closest(".buy:disabled")) {
          if (now() - lastSfx > 70) playNamed("click");
        } else if (t.closest(".tt-btn")) {
          if (now() - lastSfx > 70) playNamed("click");
        }
      },
      true
    );

    var evs = document.getElementById("events");
    if (evs && typeof MutationObserver === "function") {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var nodes = muts[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) onEventCard(nodes[j]);
        }
      }).observe(evs, { childList: true });
    }

    var unlock = function () {
      try {
        if (window.oe && typeof oe.userGesture === "function") oe.userGesture();
        else if (window.oe && typeof oe.init === "function") {
          oe.init();
          if (oe.ctx && oe.ctx.state === "suspended") oe.ctx.resume();
        }
      } catch (e) {}
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        try {
          var c = audio();
          if (c && c.state === "suspended") c.resume();
        } catch (e) {}
      }
    });

    var lastStep = 0;
    var engineStep = typeof window.folkStep === "function" ? window.folkStep : null;
    window.folkStep = function (x, y) {
      if (!sfxOn()) return;
      var t = now();
      /* folk.js fires once per planted foot per person on screen, so the room
         needs a floor on how often the boards can answer. */
      if (t - lastStep < 90) return;
      lastStep = t;
      panTo(x);
      if (engineStep) {
        try {
          engineStep(x, y);
          return;
        } catch (e) {}
      }
      var scene = "";
      try {
        if (typeof sceneNow === "function") scene = String(sceneNow() || "");
        if (!scene && typeof gameState === "object" && gameState && gameState.scene) scene = String(gameState.scene);
        if (!scene) {
          var on = document.querySelector("#scenes .sc.on");
          if (on && on.dataset.scene) scene = on.dataset.scene;
        }
      } catch (e) {}
      if (scene === "shop") playNamed("wood", x);
      else if (scene === "street") playNamed("gravel", x);
      else playNamed("foot", x);
    };
    /* The room's ambience, beds and hums and the odd gull, belongs to the
       engine, which keys it off scene, hour and weather and fades between
       them. A second timer firing one-shots on top only muddied it. */
  }

  window.feel = {
    play: playNamed,
    has: function (name) {
      var I = window.I || window.sfx;
      return !!(CATALOG[name] || (I && typeof I[name] === "function"));
    },
    list: function () {
      var I = window.I || window.sfx;
      var set = Object.create(null);
      Object.keys(CATALOG).forEach(function (k) {
        set[k] = 1;
      });
      if (I) Object.keys(I).forEach(function (k) {
        if (typeof I[k] === "function") set[k] = 1;
      });
      return Object.keys(set).sort();
    },
    punch: punch,
    flash: flash,
    float: floatText,
    ripple: ripple,
    burst: burst,
    confetti: confetti,
    feed: feedDrop,
    coinFly: coinFly,
    pulseHud: pulseHud,
    catalog: CATALOG,
  };

  window.__feelTest = function () {
    fillGaps();
    playNamed("click");
    punch(0.2);
    flash("#f4c453", 0.12);
    floatText("+$12", innerWidth * 0.5, innerHeight * 0.4);
    ripple(innerWidth * 0.5, innerHeight * 0.55);
    burst(innerWidth * 0.5, innerHeight * 0.5, "#f4c453", 10);
    return { sounds: window.feel.list().length, trauma: trauma, floats: floats.length };
  };

  function boot() {
    ensureOverlay();
    wire();
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
