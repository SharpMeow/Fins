/* beast.js — forgotten things that still move.
   Unique bodies, a hunger, a year they wake. If they come to the harbor
   the till feels it. Not a bestiary screen. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastToast = "";
  var BODY = ["serpent", "crab", "eel", "ray", "turtle", "whale-thing", "jellyfish", "leech"];
  var MAT = ["scale", "shell", "glass", "bone", "kelp", "iron", "pearl", "salt"];
  var ADJ = ["pale", "blind", "horned", "winged", "two-mouthed", "salt-burnt", "long", "silent"];
  var ACT = ["sleeps", "hunts", "circles", "feeds", "nests", "dies inland"];

  function mulberry(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function yearNow() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function seedOf() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.seed) return w.seed >>> 0;
    } catch (e) {}
    return 1000;
  }

  function pick(rng, a) {
    return a[(rng() * a.length) | 0];
  }

  function nameBeast(rng, i) {
    if (window.tongue && tongue.word) return tongue.word(40 + i, 3);
    return pick(rng, ADJ) + pick(rng, BODY);
  }

  function state() {
    var g = gs();
    if (g && g.beasts && g.beasts.list && g.beasts.list.length) return g.beasts;
    var rng = mulberry(seedOf() ^ 0xbe57);
    var n = 10 + ((rng() * 6) | 0);
    var list = [];
    for (var i = 0; i < n; i++) {
      list.push({
        i: i,
        n: nameBeast(rng, i),
        body: pick(rng, BODY),
        mat: pick(rng, MAT),
        adj: pick(rng, ADJ),
        x: (rng() * 48) | 0,
        y: (rng() * 32) | 0,
        hp: 0.4 + rng() * 0.6,
        act: "sleeps",
        near: 0,
      });
    }
    var st = { list: list, events: [], lastY: 0, scare: 0, note: "" };
    try {
      if (g) g.beasts = st;
    } catch (e) {}
    return st;
  }

  function harborDist(b) {
    var dx = (b.x || 0) - 38;
    var dy = (b.y || 0) - 13;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function tickYear() {
    var st = state();
    var y = yearNow();
    if (st.lastY === y) return;
    st.lastY = y;
    var rng = mulberry((seedOf() ^ y) * 7919);
    st.scare = 0;
    for (var i = 0; i < st.list.length; i++) {
      var b = st.list[i];
      if (rng() < 0.18) {
        b.x = Math.max(0, Math.min(47, b.x + ((rng() * 5) | 0) - 2));
        b.y = Math.max(0, Math.min(31, b.y + ((rng() * 5) | 0) - 2));
      }
      var d = harborDist(b);
      if (d < 6 && rng() < 0.35) {
        b.act = "circles";
        b.near = 1;
        st.scare = Math.max(st.scare, 0.07);
        st.note = b.n + " the " + b.adj + " " + b.body + " is off the harbor.";
        st.events.push({ y: y, n: b.n, k: "near" });
        if (st.events.length > 24) st.events.shift();
        try {
          if (window.weave && weave.because) weave.because(st.note);
          if (window.weave && weave.rumor) weave.rumor("beast", st.note, 0.8);
          if (window.rumor && rumor.add) rumor.add("beast", st.note, 0.85);
        } catch (e) {}
      } else if (d < 12) {
        b.act = "hunts";
        b.near = 0;
      } else {
        b.act = pick(rng, ACT);
        b.near = 0;
      }
      if (rng() < 0.03) {
        b.act = "dies inland";
        b.hp = 0;
        st.events.push({ y: y, n: b.n, k: "dead" });
      }
    }
  }

  function near() {
    var st = state();
    return st.scare || 0;
  }

  function line() {
    var st = state();
    if (st.note) return st.note.replace(/^\w/, function (c) { return "They say " + c.toLowerCase(); });
    var live = st.list.filter(function (b) { return b.near; })[0];
    if (live) return "Something " + live.adj + " in the harbor. I saw the wake.";
    return "";
  }

  function toastOnce() {
    var st = state();
    if (!st.note || st.note === lastToast) return;
    lastToast = st.note;
    try {
      if (typeof k === "function") k(st.note, "bad");
    } catch (e) {}
  }

  function panelHtml() {
    var st = state();
    var rows = st.list.slice(0, 8).map(function (b) {
      return b.n + ", " + b.adj + " " + b.body + ", " + b.act;
    });
    return "<p>Beasts still moving.</p><p>" + rows.join(". ") + ".</p>" + (st.note ? "<p>" + st.note + "</p>" : "");
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_beast"; })) return;
      w.push({
        id: "k_beast",
        sec: "The world before you",
        t: "Forgotten beasts",
        tags: "beast harbor scare till atlas unique",
        w: "<p>The continent still has things that were never stocked. They have a body, a material, a hunger, and a year they wake. When one circles the harbor, people on Salem do not buy. They talk. The till feels it.</p><p><b>What to do about it:</b> read Life. If the gold line says the harbor, wait. The Atlas keeps the name.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 1.6) {
        lastTick = now();
        tickYear();
        toastOnce();
      }
    } catch (e) {}
  }

  window.beast = { state: state, near: near, line: line, tick: tickYear, panel: panelHtml };

  if (window.__onBeat) window.__onBeat(tick, 500);
  else setTimeout(function loop() { tick(); setTimeout(loop, 500); }, 500);
})();
