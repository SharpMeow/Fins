/* choir.js — the tank is a choir.
   Every living fish is a voice. The shop's music is not a playlist.
   The glass looks back. A sale drops a voice. A raise comes back a half-step
   off. Fever, a beast, a boycott, a wet aisle: they detune the chord.
   All the continent's weather lands in one place: odds, speech, the gold line,
   a quiet score. No second HUD. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastNamed = -1;
  var lastRaised = -1;
  var lastWhisper = "";
  var ptr = { x: 0.5, y: 0.5, on: 0 };
  var overlay = null;
  var octx = null;
  var master = null;
  var bedOsc = null;
  var bedGain = null;
  var hum = null;
  var voices = [];
  var VOICE_N = 6;
  var wiredPtr = false;
  var lastLost = "";
  var lastSour = "";

  var PENT = [0, 2, 4, 7, 9, 12];

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (document.body.classList.contains("work")) return "work";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
      var on = document.querySelector("#scenes .sc.on");
      if (on && on.dataset.scene) return on.dataset.scene;
    } catch (e) {}
    return "tank";
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.rumor && rumor.add) rumor.add("choir", text, 0.7);
    } catch (e2) {}
    try {
      if (window.desk && desk.think) desk.think("glass", text);
    } catch (e3) {}
  }

  function raisedN() {
    try {
      if (window.saga && saga.book) {
        var b = saga.book();
        if (b && b.occ && b.occ.raised) return b.occ.raised | 0;
      }
    } catch (e) {}
    return 0;
  }

  function tonicOf(f) {
    var sp = String((f && f.sp) || "").toLowerCase();
    if (/betta/.test(sp)) return 220;
    if (/tetra/.test(sp)) return 196;
    if (/guppy/.test(sp)) return 247;
    if (/gold/.test(sp)) return 175;
    if (/cichlid/.test(sp)) return 147;
    if (/koi/.test(sp)) return 165;
    if (/angel/.test(sp)) return 262;
    if (/clown/.test(sp)) return 294;
    if (/discus/.test(sp)) return 185;
    if (/shrimp|snail|crab/.test(sp)) return 330;
    return 196;
  }

  function cents(n) {
    return Math.pow(2, n / 1200);
  }

  function weather() {
    var w = {
      wet: 0,
      fever: 0,
      feverName: "",
      beast: 0,
      beastLine: "",
      boycott: false,
      guild: 0,
      faith: "",
      bless: 0,
      scarce: "",
      cut: false,
      craft: 0.4,
      rumor: 0,
      raised: raisedN(),
      named: 0,
      still: 0,
      clog: false,
      crowd: 0,
      watching: 0,
      sour: 0,
      sweet: 0,
      line: "",
      word: "",
    };
    try {
      if (window.shopSite && shopSite.wet) w.wet = shopSite.wet() || 0;
    } catch (e) {}
    try {
      if (window.fever && fever.heat) w.fever = fever.heat() || 0;
      if (window.fever && fever.line) w.feverName = fever.line() || "";
    } catch (e2) {}
    try {
      if (window.beast && beast.near) w.beast = beast.near() || 0;
      if (window.beast && beast.line) w.beastLine = beast.line() || "";
    } catch (e3) {}
    try {
      if (window.guild && guild.boycott) w.boycott = !!guild.boycott();
      if (window.guild && guild.standing) w.guild = guild.standing();
    } catch (e4) {}
    try {
      if (window.faith && faith.taboo) w.faith = faith.taboo() || "";
      if (window.faith && faith.bless) w.bless = faith.bless() || 0;
    } catch (e5) {}
    try {
      if (window.wild && wild.of) {
        var st = wild.of();
        for (var k in st.pop) {
          if (st.pop[k] < 0.22) {
            w.scarce = k;
            break;
          }
        }
      }
    } catch (e6) {}
    try {
      if (window.road && road.cut && road.cut()) w.cut = true;
    } catch (e7) {}
    try {
      if (window.craft && craft.quality) w.craft = craft.quality();
    } catch (e8) {}
    try {
      if (window.rumor && rumor.heat) w.rumor = rumor.heat() || 0;
    } catch (e9) {}
    try {
      var g = gs();
      if (g && (g.clog || g.filterClog)) w.clog = true;
      if (typeof window.clogged !== "undefined") w.clog = w.clog || !!window.clogged;
    } catch (e10) {}
    try {
      var c = window.shopLife && shopLife.crowd ? shopLife.crowd() : [];
      w.crowd = (c && c.length) || 0;
    } catch (e11) {}
    try {
      var browse = window.shopLife && shopLife.browse ? shopLife.browse() : null;
      if (browse) {
        for (var i = 0; i < browse.length; i++) {
          if (browse[i] && browse[i].phase === "look") w.watching = 1;
        }
      }
    } catch (e12) {}
    var list = fishList();
    for (var f = 0; f < list.length; f++) {
      var fish = list[f];
      if (!fish) continue;
      if (fish.nick) w.named++;
      if (fish.sick || (fish.mind && fish.mind.stress > 0.68)) w.still++;
    }
    if (ptr.on && sceneName() === "tank") w.watching = 1;

    w.sour = clamp01(w.fever * 0.7 + w.beast * 4 + (w.boycott ? 0.45 : 0) + w.wet * 0.25 + (w.clog ? 0.2 : 0) + (w.raised ? 0.12 : 0));
    w.sweet = clamp01(w.bless * 4 + (w.craft - 0.4) * 0.8 + (w.named ? 0.08 : 0) + (w.guild > 0.7 ? 0.12 : 0));

    if (w.beastLine) w.line = w.beastLine;
    else if (w.fever > 0.4 && w.feverName) w.line = w.feverName;
    else if (w.boycott) w.line = "The hall put the word out.";
    else if (w.cut) w.line = "The inland hold is late.";
    else if (w.scarce) w.line = "I heard the river is empty of " + w.scarce + ".";
    else if (w.wet > 0.36) w.line = "The aisle is wet.";
    else if (w.raised && w.watching) w.line = "That one watched me. It shouldn't be here.";
    else if (w.watching && w.named) w.line = "That one watched me.";

    if (w.line) w.word = w.line;
    else if (w.named) w.word = w.named + (w.named === 1 ? " named voice in the water." : " named voices in the water.");
    else w.word = "The water is holding a chord.";
    return w;
  }

  function sfxOk() {
    try {
      var I = window.I || window.sfx;
      if (I && typeof I.ok === "function") return !!I.ok();
    } catch (e) {}
    return true;
  }

  function audioCtx() {
    try {
      var fa = window.finsAudio;
      if (!fa) return null;
      return fa.ctx() || null;
    } catch (e) {
      return null;
    }
  }

  function ensureBus() {
    var ctx = audioCtx();
    if (!ctx) return null;
    if (master && master.context === ctx) return ctx;
    try {
      master = ctx.createGain();
      master.gain.value = 0;
      var fa = window.finsAudio;
      if (fa && fa.connect) fa.connect(master, true);
      else master.connect(ctx.destination);
    } catch (e) {
      return null;
    }
    return ctx;
  }

  function fade(node, v, t) {
    if (!node) return;
    try {
      var g = node.gain || node;
      var ctx = audioCtx();
      var at = ctx ? ctx.currentTime : 0;
      g.cancelScheduledValues(at);
      g.setTargetAtTime(v, at, t || 0.18);
    } catch (e) {}
  }

  function killVoices() {
    for (var i = 0; i < voices.length; i++) {
      try {
        voices[i].osc.stop();
      } catch (e) {}
      try {
        voices[i].osc.disconnect();
        voices[i].gain.disconnect();
      } catch (e2) {}
    }
    voices = [];
    if (bedOsc) {
      try {
        bedOsc.stop();
        bedOsc.disconnect();
        bedGain.disconnect();
      } catch (e3) {}
      bedOsc = null;
      bedGain = null;
    }
    if (hum) {
      try {
        hum.a.stop();
        hum.b.stop();
        hum.g.disconnect();
      } catch (e4) {}
      hum = null;
    }
  }

  function pickVoices(list) {
    var named = [];
    var rest = [];
    for (var i = 0; i < list.length; i++) {
      if (!list[i] || list[i].dead) continue;
      if (list[i].nick) named.push(list[i]);
      else rest.push(list[i]);
    }
    named.sort(function (a, b) {
      return String(a.nick).localeCompare(String(b.nick));
    });
    var out = named.concat(rest);
    return out.slice(0, VOICE_N);
  }

  function tuneVoice(v, f, w, ctx) {
    var base = tonicOf(f);
    var id = (f.fid || f.id || 0) | 0;
    var step = PENT[id % PENT.length];
    var det =
      (f.mind && f.mind.stress ? f.mind.stress * 28 : 0) +
      w.fever * 24 +
      w.beast * 180 +
      (w.raised ? 50 : 0) +
      (f.sick ? 18 : 0) -
      w.sweet * 12;
    var freq = base * Math.pow(2, step / 12) * cents(det);
    var amp = 0.028 + (f.nick ? 0.012 : 0);
    if (w.sour > 0.5) amp *= 0.7;
    if (sceneName() === "work") amp *= 0.45;
    try {
      v.osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.22);
      v.gain.gain.setTargetAtTime(amp, ctx.currentTime, 0.22);
    } catch (e) {}
  }

  function syncVoices(w) {
    var ctx = ensureBus();
    if (!ctx) return;
    var sc = sceneName();
    if (sc === "title" || document.hidden || !sfxOk()) {
      fade(master, 0, 0.3);
      return;
    }
    var list = pickVoices(fishList());
    var target = sc === "work" ? 0.045 : 0.09 + w.sweet * 0.04 - w.sour * 0.03;
    if (w.crowd >= 3) target *= 0.85;
    fade(master, Math.max(0, target), 0.4);

    if (sc === "work") {
      if (!hum) {
        try {
          var g = ctx.createGain();
          g.gain.value = 0.04;
          var a = ctx.createOscillator();
          var b = ctx.createOscillator();
          a.type = "sine";
          b.type = "sine";
          a.frequency.value = 60;
          b.frequency.value = 120;
          a.connect(g);
          b.connect(g);
          g.connect(master);
          a.start();
          b.start();
          hum = { a: a, b: b, g: g };
        } catch (e) {}
      }
      if (hum) fade(hum.g, 0.03 + w.sour * 0.04, 0.3);
      for (var h = 0; h < voices.length; h++) fade(voices[h].gain, 0.004, 0.3);
      return;
    }
    if (hum) fade(hum.g, 0, 0.4);

    if (!bedOsc) {
      try {
        bedGain = ctx.createGain();
        bedGain.gain.value = 0.012;
        bedOsc = ctx.createOscillator();
        bedOsc.type = "sine";
        bedOsc.frequency.value = 55;
        bedOsc.connect(bedGain);
        bedGain.connect(master);
        bedOsc.start();
      } catch (e2) {}
    }
    if (bedOsc) {
      try {
        bedOsc.frequency.setTargetAtTime(w.sour > 0.45 ? 49 : 55, ctx.currentTime, 0.4);
        bedGain.gain.setTargetAtTime(0.01 + w.sour * 0.012, ctx.currentTime, 0.4);
      } catch (e3) {}
    }

    while (voices.length < list.length) {
      try {
        var gn = ctx.createGain();
        gn.gain.value = 0;
        var osc = ctx.createOscillator();
        osc.type = voices.length % 2 ? "triangle" : "sine";
        osc.connect(gn);
        gn.connect(master);
        osc.start();
        voices.push({ osc: osc, gain: gn, id: "" });
      } catch (e4) {
        break;
      }
    }
    while (voices.length > list.length) {
      var drop = voices.pop();
      fade(drop.gain, 0, 0.12);
      (function (gone) {
        setTimeout(function () {
          try {
            gone.osc.stop();
            gone.osc.disconnect();
            gone.gain.disconnect();
          } catch (e5) {}
        }, 400);
      })(drop);
    }
    for (var i = 0; i < list.length && i < voices.length; i++) {
      voices[i].id = list[i].fid || list[i].nick || i;
      tuneVoice(voices[i], list[i], w, ctx);
    }
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("choirVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "choirVeil";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    octx = overlay.getContext("2d");
  }

  function drawGaze(w) {
    var sc = sceneName();
    if (sc === "title" || sc === "work") {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    ensureOverlay();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var bw = (vw * dpr) | 0;
    var bh = (vh * dpr) | 0;
    if (overlay.width !== bw || overlay.height !== bh) {
      overlay.width = bw;
      overlay.height = bh;
      overlay.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    octx.clearRect(0, 0, vw, vh);
    if (!w.watching && w.sour < 0.22 && w.sweet < 0.2) return;
    var cx = sc === "shop" ? vw * 0.62 : vw * 0.5;
    var cy = sc === "shop" ? vh * 0.38 : vh * 0.46;
    var rad = Math.min(vw, vh) * (sc === "shop" ? 0.18 : 0.28);
    var a = 0.04 + w.watching * 0.05 + w.sweet * 0.04;
    if (w.sour > 0.4) a += 0.03;
    var col = w.sour > 0.45 ? "40,90,110" : w.raised ? "180,140,90" : "244,196,83";
    var g = octx.createRadialGradient(cx, cy, 8, cx, cy, rad);
    g.addColorStop(0, "rgba(" + col + "," + a.toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + col + ",0)");
    octx.fillStyle = g;
    octx.fillRect(0, 0, vw, vh);
  }

  function wrapFish() {
    if (typeof window.drawFishSprite !== "function" || window.drawFishSprite.__choir) return;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (a) {
      try {
        if (a && a.fish && a.x != null) {
          var sc = sceneName();
          if (sc === "tank" && ptr.on) {
            var tank = document.getElementById("tank");
            var tw = (tank && tank.clientWidth) || window.innerWidth;
            var th = (tank && tank.clientHeight) || window.innerHeight;
            var px = ptr.x * tw;
            var py = ptr.y * th;
            var dx = px - a.x;
            var dy = py - a.y;
            if (dx * dx + dy * dy < 140 * 140) {
              a.x += dx * 0.018;
              a.y += dy * 0.012;
              a.fish._gaze = now();
            }
          } else if (sc === "shop" || sc === "front") {
            var looking = false;
            try {
              var br = window.shopLife && shopLife.browse ? shopLife.browse() : null;
              if (br) {
                for (var i = 0; i < br.length; i++) if (br[i] && br[i].phase === "look") looking = true;
              }
            } catch (eL) {}
            if (looking) {
              a.x += 1.1;
              a.fish._gaze = now();
            }
          }
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    window.drawFishSprite.__choir = 1;
  }

  function wrapBrowse() {
    if (!window.shopBrowse || window.shopBrowse.__choir) return;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var w = weather();
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        if (rec.phase === "look" && w.line && st && !st._choirSaid && Math.random() < 0.34) {
          st._choirSaid = 1;
          rec.line = w.line;
          st.line = w.line;
          st.lineUntil = now() + 3;
        }
        if (rec.phase === "pay" && st && !st._choirWalk && w.sour > 0.52 && Math.random() < 0.4) {
          st._choirWalk = 1;
          st.phase = "leave";
          rec.phase = "leave";
          rec.line = w.beast ? "I saw the wake. I'm not staying." : "I'll look from the door.";
          st.line = rec.line;
          st.bought = false;
        }
        if (rec.phase === "pay" && st && w.sweet > 0.28 && w.craft > 0.7 && Math.random() < 0.25) {
          rec.line = rec.line || "Whoever bags here knows their hands.";
        }
      } catch (e) {}
      return rec;
    };
    window.shopBrowse.__choir = 1;
  }

  function watchVoices(w) {
    if (lastNamed < 0) {
      lastNamed = w.named;
      lastRaised = w.raised;
      return;
    }
    if (w.named < lastNamed) {
      var n = lastNamed - w.named;
      lastNamed = w.named;
      var msg = n === 1 ? "The water lost a voice." : n + " voices left the water.";
      if (msg !== lastLost) {
        lastLost = msg;
        because(msg);
        try {
          if (typeof k === "function") k(msg, "bad");
        } catch (e) {}
      }
    } else {
      lastNamed = w.named;
    }
    if (w.raised > lastRaised) {
      lastRaised = w.raised;
      because("A voice came back a half-step off.");
      try {
        if (typeof k === "function") k("The chord went wrong.", "bad");
      } catch (e2) {}
    }
    if (w.sour > 0.55 && w.line && w.line !== lastSour) {
      lastSour = w.line;
      because(w.line);
    }
  }

  function whisper(w) {
    if (w.beast > 0.12 && w.beastLine) return w.beastLine;
    if (w.fever > 0.42 && w.feverName) return w.feverName;
    if (w.boycott) return "The hall put the word out. The aisle is empty.";
    if (w.raised && w.watching) return "That one watched me. It shouldn't be here.";
    if (lastLost && now() - lastTick < 8) return lastLost;
    if (w.watching && w.named && sceneName() === "tank") return "They're watching the hand.";
    return "";
  }

  function line() {
    return weather().line || weather().word;
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) { return a && a.id === "k_choir"; })) return;
      wiki.push({
        id: "k_choir",
        sec: "The shop floor",
        t: "The choir",
        tags: "choir glass voice music named raise watch score tank",
        w: "<p>The tank is a choir. Every living fish is a voice. The shop's music is not a playlist — it is the water, singing what it has seen. A named fish carries the melody. Sell the last of a line and a voice drops. Raise a name from the pages and it comes back a half-step off. Fever, a beast off the harbor, a boycott: they detune the chord. People at the glass can hear it. They say so.</p><p><b>What to do about it:</b> listen. Mute the playlist if you have to. Work mode turns it into the fluorescent hum, and the hum still sours when the water is off. The gold line will name a lost voice.</p>",
      });
      wiki.push({
        id: "k_gaze",
        sec: "The animals",
        t: "The glass looks back",
        tags: "gaze watch pointer customer witness fish glass",
        w: "<p>They can see you. The hand at the surface, the person on the aisle, the baker at lunch. Named fish lean toward whoever is looking. A customer will say it: that one watched me. A risen name watches harder, and wrong.</p><p><b>What to do about it:</b> stand still over the tank. They will come to the glass. That is not a meter. That is the shop looking back.</p>",
      });
    } catch (e) {}
  }

  function bindPtr() {
    if (wiredPtr) return;
    wiredPtr = true;
    var on = function (e) {
      var tank = document.getElementById("tank");
      if (!tank) return;
      var r = tank.getBoundingClientRect();
      if (!r.width) return;
      ptr.x = (e.clientX - r.left) / r.width;
      ptr.y = (e.clientY - r.top) / r.height;
      ptr.on = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    };
    window.addEventListener("pointermove", on, { passive: true });
    window.addEventListener("pointerleave", function () {
      ptr.on = 0;
    });
  }

  function tick() {
    try {
      bindPtr();
      wrapFish();
      wrapBrowse();
      seedWiki();
      var w = weather();
      if (now() - lastTick > 0.45) {
        lastTick = now();
        watchVoices(w);
        syncVoices(w);
        var wh = whisper(w);
        if (wh && wh !== lastWhisper) {
          lastWhisper = wh;
          try {
            var el = document.getElementById("hookWhisper");
            if (el && (w.beast > 0.12 || w.raised || lastLost)) {
              el.textContent = wh;
              el.classList.add("on", "pop");
            }
          } catch (eW) {}
        }
      }
      if (now() - lastUi > 0.08) {
        lastUi = now();
        drawGaze(w);
      }
    } catch (e) {}
  }

  window.choir = {
    weather: weather,
    line: line,
    whisper: whisper,
    watching: function () {
      return weather().watching;
    },
  };

  window.addEventListener("visibilitychange", function () {
    if (document.hidden) fade(master, 0, 0.2);
  });
  window.addEventListener("pagehide", killVoices);

  if (window.__onBeat) window.__onBeat(tick, 80);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 80);
    }, 140);
})();
