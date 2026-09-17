/* flow.js — cohesion between rooms: shared light, scene fades, ambient beds. */
(function () {
  "use strict";

  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {}

  var veil = null;
  var grade = null;
  var lastScene = "";
  var bedNodes = [];
  var bedGain = null;
  var bedScene = "";
  var wired = false;

  var VEIL = {
    tank: "rgba(6, 22, 34, 0.86)",
    shop: "rgba(16, 10, 6, 0.78)",
    street: "rgba(8, 14, 20, 0.84)",
    back: "rgba(12, 8, 5, 0.82)",
    cell: "rgba(6, 8, 10, 0.9)",
  };

  var STING = {
    "shop>tank": "water",
    "tank>shop": "wood",
    "shop>street": "door",
    "street>shop": "door",
    "shop>back": "wood",
    "back>shop": "wood",
    "street>tank": "whoosh",
    "back>tank": "water",
    "tank>street": "whoosh",
  };

  function audio() {
    try {
      if (window.oe && typeof oe.init === "function") oe.init();
      return (window.oe && oe.ctx) || null;
    } catch (e) {
      return null;
    }
  }

  function play(name) {
    try {
      if (window.feel && typeof feel.play === "function") feel.play(name);
    } catch (e) {}
  }

  function sceneNow() {
    try {
      var on = document.querySelector("#scenes .sc.on");
      if (on && on.dataset.scene) return on.dataset.scene;
    } catch (e) {}
    try {
      if (window.__scene) return String(window.__scene);
    } catch (e) {}
    return lastScene || "tank";
  }

  function ensureDom() {
    if (!veil) {
      veil = document.createElement("div");
      veil.id = "flowVeil";
      document.body.appendChild(veil);
    }
    if (!grade) {
      grade = document.createElement("div");
      grade.id = "flowGrade";
      document.body.appendChild(grade);
    }
  }

  var lastYear = 0;

  function worldYear() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
      if (typeof atlGen === "function") {
        var a = atlGen();
        if (a && a.now) return a.now | 0;
      }
    } catch (e) {}
    return 1000;
  }

  function tickYear() {
    var y = worldYear();
    if (!y) return;
    document.body.setAttribute("data-year", String(y));
    if (!lastYear) {
      lastYear = y;
      return;
    }
    if (y === lastYear) return;
    lastYear = y;
    flashVeil(sceneNow());
    play("chime");
  }

  function sting(to, from) {
    var key = (from || "") + ">" + to;
    var name = STING[key];
    if (!name) {
      if (to === "tank") name = "water";
      else if (to === "shop") name = "wood";
      else if (to === "street") name = "whoosh";
    }
    if (name) play(name);
  }

  function flashVeil(to) {
    ensureDom();
    if (reduced) return;
    veil.style.background = VEIL[to] || "rgba(8,10,14,.8)";
    veil.classList.add("on");
    window.setTimeout(function () {
      veil.classList.remove("on");
    }, 70);
  }

  function stopBed() {
    for (var i = 0; i < bedNodes.length; i++) {
      try {
        bedNodes[i].stop();
      } catch (e) {}
      try {
        bedNodes[i].disconnect();
      } catch (e) {}
    }
    bedNodes = [];
    if (bedGain) {
      try {
        bedGain.disconnect();
      } catch (e) {}
    }
    bedGain = null;
    bedScene = "";
  }

  function noiseBuf(c, seconds, brown) {
    var n = Math.max(1, Math.round(c.sampleRate * seconds));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    var acc = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) {
        acc = acc * 0.97 + w * 0.03;
        d[i] = acc * 3.2;
      } else d[i] = w;
    }
    return buf;
  }

  function startBed(scene) {
    if (bedScene === scene && bedGain) return;
    stopBed();
    var c = audio();
    if (!c || c.state === "suspended") return;
    var dest = (window.oe && (oe.sfxBus || oe.master)) || c.destination;
    bedGain = c.createGain();
    bedGain.gain.value = 0.0001;
    bedGain.connect(dest);

    function loop(buf, filterType, freq, q, amp) {
      var src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var f = c.createBiquadFilter();
      f.type = filterType || "lowpass";
      f.frequency.value = freq || 400;
      f.Q.value = q == null ? 0.7 : q;
      var g = c.createGain();
      g.gain.value = amp;
      src.connect(f);
      f.connect(g);
      g.connect(bedGain);
      src.start();
      bedNodes.push(src);
    }

    var brown = noiseBuf(c, 2.4, true);
    var white = noiseBuf(c, 1.6, false);
    var wx = {};
    try {
      if (typeof bt === "function") wx = bt() || {};
      else if (window.__wx) wx = window.__wx;
    } catch (e) {
      wx = window.__wx || {};
    }
    if (scene === "tank") {
      loop(brown, "lowpass", 280, 0.6, 0.55);
      loop(white, "bandpass", 1400, 0.8, 0.12);
      bedGain.gain.exponentialRampToValueAtTime(0.045, c.currentTime + 0.4);
    } else if (scene === "shop") {
      loop(brown, "lowpass", 220, 0.5, 0.5);
      loop(white, "bandpass", 900, 0.6, 0.08);
      bedGain.gain.exponentialRampToValueAtTime(0.032, c.currentTime + 0.4);
    } else if (scene === "street") {
      loop(brown, "lowpass", 180, 0.4, 0.45);
      loop(white, "highpass", 1800, 0.4, 0.16);
      bedGain.gain.exponentialRampToValueAtTime(0.038, c.currentTime + 0.4);
    } else if (scene === "back") {
      loop(brown, "lowpass", 160, 0.5, 0.42);
      bedGain.gain.exponentialRampToValueAtTime(0.022, c.currentTime + 0.5);
    } else {
      bedGain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
    }
    bedScene = scene;

    if ((wx.rain || 0) > 0.12 && (scene === "shop" || scene === "street" || scene === "tank")) {
      var rainAmp = scene === "tank" ? 0.06 : 0.1 + Math.min(0.18, wx.rain * 0.22);
      loop(white, "highpass", scene === "tank" ? 2400 : 3200, 0.3, rainAmp);
    }
  }

  function dayAmt() {
    try {
      if (typeof kn === "function") return kn();
      if (isFinite(window.__day)) return window.__day;
    } catch (e) {}
    return 0.65;
  }

  function tickGrade() {
    ensureDom();
    var scene = sceneNow();
    var day = dayAmt();
    var wx = {};
    try {
      if (typeof bt === "function") wx = bt() || {};
      else if (window.__wx) wx = window.__wx;
    } catch (e) {
      wx = window.__wx || {};
    }
    var rain = Math.max(0, wx.rain || 0);
    var fog = Math.max(0, wx.fog || 0);
    var night = day < 0.32;
    var dusk = day > 0.68 && day < 0.88;
    var dawn = day > 0.18 && day < 0.4;

    var rgb = [18, 24, 34];
    var a = 0;
    if (night) {
      rgb = [8, 12, 26];
      a = (0.32 - day) * 0.9;
    } else if (dusk) {
      rgb = [42, 22, 14];
      a = (day - 0.68) * 0.35;
    } else if (dawn) {
      rgb = [40, 24, 16];
      a = (0.4 - day) * 0.28;
    }
    if (rain > 0.08) {
      rgb = [
        (rgb[0] * 0.7 + 20) | 0,
        (rgb[1] * 0.75 + 28) | 0,
        (rgb[2] * 0.8 + 40) | 0,
      ];
      a += rain * 0.12;
    }
    if (fog > 0.15) a += fog * 0.08;

    if (scene === "shop") a *= 0.42;
    else if (scene === "tank") a *= 0.55;
    else if (scene === "back") a *= 0.5;
    else if (scene === "street") a *= 0.85;
    else if (scene === "cell") a *= 0.7;
    a = Math.max(0, Math.min(0.34, a));

    grade.style.background = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a.toFixed(3) + ")";
    document.body.setAttribute("data-scene", scene);
    document.body.setAttribute("data-tod", night ? "night" : dusk ? "dusk" : dawn ? "dawn" : "day");
    if (rain > 0.2) document.body.setAttribute("data-wx", "rain");
    else if (fog > 0.25) document.body.setAttribute("data-wx", "fog");
    else document.body.setAttribute("data-wx", "clear");
  }

  function onScene(to, from) {
    if (!to || to === from) return;
    lastScene = to;
    document.body.setAttribute("data-scene", to);
    flashVeil(to);
    sting(to, from);
    startBed(to);
    tickGrade();
    if (to === "tank" && from === "shop" && !reduced) {
      document.body.classList.add("flow-lean");
      window.setTimeout(function () {
        document.body.classList.remove("flow-lean");
      }, 520);
    }
  }

  function hookGo() {
    if (typeof window.__onScene !== "function") window.__onScene = onScene;
  }

  function watchTitle() {
    var titling = document.body.classList.contains("titling");
    if (watchTitle._was && !titling) {
      flashVeil("shop");
      play("door");
      startBed(sceneNow());
    }
    watchTitle._was = titling;
  }

  function tick() {
    hookGo();
    watchTitle();
    tickGrade();
    tickYear();
    var sc = sceneNow();
    if (sc && sc !== bedScene) startBed(sc);
    window.setTimeout(tick, 900);
  }

  function wrapSafe(name, ok) {
    try {
      var d = Object.getOwnPropertyDescriptor(globalThis, name);
      if (!d || !d.get || d.get.__safe) return;
      var g = d.get;
      function ng() {
        var fn = g.call(this);
        if (typeof fn !== "function" || fn.__safe) return fn;
        var inner = function () {
          try {
            if (ok && !ok.apply(null, arguments)) return;
            return fn.apply(this, arguments);
          } catch (e) {
            return;
          }
        };
        inner.__safe = 1;
        return inner;
      }
      ng.__safe = 1;
      Object.defineProperty(globalThis, name, { configurable: true, get: ng });
    } catch (e) {}
  }

  function boot() {
    wrapSafe("buyDecor", function (id) {
      try {
        return typeof decorById === "function" && !!decorById(id);
      } catch (e) {
        return false;
      }
    });
    wrapSafe("spawnCoin", function (e) {
      return !!(e && typeof e === "object" && e.sp != null);
    });
    wrapSafe("pedRename", function (e) {
      if (e && typeof e.nick === "string") e.nick = String(e.nick).replace(/[<>]/g, "");
      return true;
    });
    try {
      setTimeout(function () {
        var list = typeof allFish === "function" ? allFish() : [];
        for (var i = 0; i < (list || []).length; i++) {
          if (list[i] && typeof list[i].nick === "string") list[i].nick = list[i].nick.replace(/[<>]/g, "");
        }
      }, 400);
    } catch (eScrub) {}
    if (wired) return;
    wired = true;
    ensureDom();
    hookGo();
    window.__onScene = onScene;
    lastScene = sceneNow();
    document.body.setAttribute("data-scene", lastScene);
    try {
      window.sceneNow = sceneNow;
    } catch (e) {}
    tick();
    document.addEventListener(
      "pointerdown",
      function () {
        startBed(sceneNow());
      },
      { once: true, capture: true }
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
