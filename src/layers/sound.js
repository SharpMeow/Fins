/* sound.js: the way into the game's audio for everything that loads after it.

   The bundle keeps its engine private: `sfx` (the named cues) is on the window,
   `oe` (the AudioContext, the buses, the sequencer) is not. feel.js synthesises
   the cues the bundle does not carry (gravel, wood, register, cash, murmur,
   drip, pour) and every one of them asked `window.oe` for a context, got
   undefined, and returned without making a sound. Fifty-eight of the game's
   hundred and eighteen sound names were stubs. Walk-in sales call feel.play
   ("cash") and folk.js calls folkStep on every footfall; both were silent.

   This runs before the bundle, takes the context the game builds for itself,
   and hands the layers a bus into it with a room on the send. No second
   context: if the game never opens one, neither do we, and the layers stay
   quiet, which is the same thing the mute does. */
(function () {
  "use strict";

  var ctx = null;
  var built = false;
  var dry = null;
  var send = null;
  var lim = null;
  var bufs = Object.create(null);
  var pan = 0;
  var voices = 0;

  /* Capture, never construct. The bundle opens the context on the first cue it
     plays, so our audio arrives exactly when the game's own does. */
  (function capture() {
    try {
      var Native = window.AudioContext || window.webkitAudioContext;
      if (!Native) return;
      var Wrapped = function () {
        var made = new (Function.prototype.bind.apply(
          Native,
          [null].concat(Array.prototype.slice.call(arguments))
        ))();
        if (!ctx) ctx = made;
        return made;
      };
      Wrapped.prototype = Native.prototype;
      try {
        Object.defineProperty(Wrapped, "name", { value: "AudioContext" });
      } catch (e) {}
      window.AudioContext = Wrapped;
      if (window.webkitAudioContext) window.webkitAudioContext = Wrapped;
    } catch (e) {}
  })();

  /* A short room. Early reflections then a decaying tail, so the synthesised
     cues sit in the same space as the ones the bundle plays instead of arriving
     dry on top of them. */
  function roomIR(c) {
    var len = Math.max(1, Math.round(c.sampleRate * 0.42));
    var buf = c.createBuffer(2, len, c.sampleRate);
    var taps = [
      [0.0061, 0.6],
      [0.0098, 0.5],
      [0.0143, 0.42],
      [0.0207, 0.34],
      [0.0291, 0.26],
    ];
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / c.sampleRate;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * 0.5;
        for (var k = 0; k < taps.length; k++) {
          var at = Math.round(taps[k][0] * c.sampleRate * (ch ? 1.07 : 1));
          if (i === at) d[i] += taps[k][1] * (Math.random() < 0.5 ? -1 : 1);
        }
        if (t < 0.004) d[i] *= t / 0.004;
      }
    }
    return buf;
  }

  function build() {
    if (built || !ctx) return built;
    try {
      lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -6;
      lim.knee.value = 2;
      lim.ratio.value = 12;
      lim.attack.value = 0.002;
      lim.release.value = 0.12;
      lim.connect(ctx.destination);

      dry = ctx.createGain();
      dry.gain.value = 1;
      dry.connect(lim);

      var conv = ctx.createConvolver();
      conv.buffer = roomIR(ctx);
      send = ctx.createGain();
      send.gain.value = 0.16;
      send.connect(conv);
      conv.connect(lim);

      built = true;
    } catch (e) {
      built = false;
    }
    return built;
  }

  function save() {
    try {
      return window.gameState || null;
    } catch (e) {
      return null;
    }
  }

  /* The bundle's own gate. It already knows about the mute and about the title
     screen, where event audio stays silent and interface cues do not. */
  function ok() {
    try {
      var I = window.sfx || window.I;
      if (I && typeof I.ok === "function" && !I.ok()) return false;
      if (!I) {
        var s = save();
        if (s && s.sfx === false) return false;
      }
    } catch (e) {}
    if (!ctx) return false;
    if (ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (e) {}
    }
    if (ctx.state !== "running") return false;
    return build();
  }

  /* 0.55 is feel.js's own figure: what it used for these recipes when it had no
     bus to hand them to. Kept, and multiplied by the sfx slider, which it was
     not, so at the default 0.8 the layer sits a fifth under the level its
     author wrote for, and the slider now moves it.

     Measured on the layer bus with the room faded out: cue peaks land between
     0.014 and 0.068, median 0.023. The engine's own cues could not be measured
     the same way. They sum into a master that carries a floor around 0.35
     which nothing outside the bundle can switch off, so this is a level to
     set by ear, not a matched one. */
  var TRIM = 0.55;

  function vol() {
    var v = 0.8;
    var s = save();
    if (s && s.vol && isFinite(s.vol.sfx)) v = s.vol.sfx;
    return Math.max(0, Math.min(1, v)) * TRIM;
  }

  /* One buffer per shape, kept for the life of the tab. The old path built a
     fresh noise buffer on every call, up to a quarter of a megabyte a shot,
     for a game people leave running all day. */
  function noiseBuf(kind, seconds) {
    if (!ctx) return null;
    var key = kind + "|" + seconds;
    if (bufs[key]) return bufs[key];
    var n = Math.max(64, Math.round(ctx.sampleRate * seconds));
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var acc = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (kind === "brown") {
        acc = acc * 0.97 + w * 0.03;
        d[i] = acc * 3.2;
      } else if (kind === "pink") {
        acc = acc * 0.92 + w * 0.08;
        d[i] = acc * 6;
      } else d[i] = w;
    }
    bufs[key] = buf;
    return buf;
  }

  function hold(node, at) {
    voices++;
    node.onended = function () {
      voices--;
      try {
        node.disconnect();
      } catch (e) {}
    };
    try {
      node.stop(at);
    } catch (e) {}
  }

  /* Pan follows whatever made the sound, so a footfall on the left of the room
     arrives on the left. */
  function connect(node, wet) {
    if (!build()) return node;
    var out = node;
    if (Math.abs(pan) > 0.04 && ctx.createStereoPanner) {
      try {
        var p = ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        node.connect(p);
        out = p;
      } catch (e) {}
    }
    out.connect(dry);
    if (wet !== false && send) out.connect(send);
    return node;
  }

  window.finsAudio = {
    ctx: function () {
      return ctx;
    },
    ready: function () {
      return !!ctx && build();
    },
    ok: ok,
    vol: vol,
    bus: function () {
      return build() ? dry : null;
    },
    send: function () {
      return build() ? send : null;
    },
    noise: noiseBuf,
    hold: hold,
    connect: connect,
    voices: function () {
      return voices;
    },
    pan: function (v) {
      if (isFinite(v)) pan = Math.max(-0.7, Math.min(0.7, v));
      return pan;
    },
    /* Screen x to a pan position, using the tank canvas as the room's width. */
    panAt: function (x) {
      if (!isFinite(x)) return (pan = 0);
      var w = 0;
      try {
        var cv = document.getElementById("tank");
        w = (cv && cv.clientWidth) || window.innerWidth || 1;
      } catch (e) {
        w = window.innerWidth || 1;
      }
      return window.finsAudio.pan((x / w) * 2 - 1);
    },
  };
})();
