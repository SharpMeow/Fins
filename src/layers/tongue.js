/* tongue.js — a language per people.
   Phonology, names, a dialect on the floor. Every people has a tongue.
   The shop hears it when they walk in off the road. */
(function () {
  "use strict";

  var lastUi = 0;
  var cached = null;

  var ONSETS = ["b", "d", "f", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z", "sh", "th", "kh", "br", "kr", "st"];
  var NUC = ["a", "e", "i", "o", "u", "ae", "ie", "ou", "a", "e", "o"];
  var CODA = ["", "", "n", "r", "l", "s", "th", "k", "m"];
  var GLOSS = [
    ["the", "ta"], ["a", "a"], ["one", "un"], ["fish", "fin"], ["shop", "haus"],
    ["water", "ava"], ["gold", "aur"], ["good", "bel"], ["no", "na"], ["yes", "ya"],
    ["I", "mi"], ["you", "ti"], ["come", "ven"], ["keep", "hold"], ["take", "nem"]
  ];

  function mulberry(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedOf() {
    try {
      if (window.realm && realm.world) {
        var w = realm.world();
        if (w && w.seed) return w.seed >>> 0;
      }
    } catch (e) {}
    return 1000;
  }

  function pick(rng, a) {
    return a[(rng() * a.length) | 0];
  }

  function syll(rng, ph) {
    return pick(rng, ph.on) + pick(rng, ph.nu) + pick(rng, ph.co);
  }

  function build() {
    var rng = mulberry(seedOf() ^ 0x70e1);
    var civs = [];
    try {
      var w = window.realm && realm.world && realm.world();
      civs = (w && w.civs) || [];
    } catch (e) {}
    if (!civs.length) {
      civs = [{ n: "Harbor", i: 0 }, { n: "Inland", i: 1 }, { n: "Hill", i: 2 }];
    }
    var langs = [];
    for (var i = 0; i < civs.length; i++) {
      var r = mulberry((seedOf() ^ 0x70e1) + i * 9973);
      var on = [], nu = [], co = [];
      var nOn = 6 + ((r() * 5) | 0);
      var nNu = 3 + ((r() * 3) | 0);
      var nCo = 3 + ((r() * 3) | 0);
      var j;
      for (j = 0; j < nOn; j++) on.push(pick(r, ONSETS));
      for (j = 0; j < nNu; j++) nu.push(pick(r, NUC));
      for (j = 0; j < nCo; j++) co.push(pick(r, CODA));
      langs.push({
        i: i,
        civ: civs[i].n || civs[i].name || "folk",
        on: on,
        nu: nu,
        co: co,
        order: r() > 0.5 ? "svo" : "sov",
        soft: r() > 0.45,
      });
    }
    cached = { langs: langs, seed: seedOf() };
    return cached;
  }

  function pack() {
    if (!cached || cached.seed !== seedOf()) return build();
    return cached;
  }

  function langOf(id) {
    var p = pack();
    var langs = p.langs || [];
    if (!langs.length) return null;
    var n = typeof id === "number" ? id : Math.abs(String(id || "0").split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0));
    return langs[n % langs.length];
  }

  function word(id, nSyl) {
    var ph = langOf(id);
    if (!ph) return "fin";
    var rng = mulberry((seedOf() ^ 0xabc) + (nSyl || 2) * 13 + (typeof id === "number" ? id : 1));
    nSyl = nSyl || 2;
    var s = "";
    for (var i = 0; i < nSyl; i++) s += syll(rng, ph);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function name(id) {
    return word(id, 2) + " " + word((typeof id === "number" ? id + 3 : 3), 2);
  }

  function say(id, english) {
    english = String(english || "");
    var ph = langOf(id);
    if (!ph || !ph.soft) return english;
    var out = english;
    for (var i = 0; i < GLOSS.length; i++) {
      var re = new RegExp("\\b" + GLOSS[i][0] + "\\b", "ig");
      if (Math.random() < 0.22) out = out.replace(re, GLOSS[i][1]);
    }
    if (ph.soft && out.length > 8 && Math.random() < 0.18) out = out.replace(/\.$/, "") + ", eh.";
    return out;
  }

  function plaque(subject) {
    var w = word(7, 2);
    return w + " · " + String(subject || "the glass");
  }

  function panelHtml() {
    var p = pack();
    var lines = (p.langs || []).slice(0, 6).map(function (L) {
      return L.civ + ": " + word(L.i, 2) + " / " + word(L.i + 1, 2);
    });
    return "<p>The tongues.</p><p>" + lines.join(". ") + ".</p>";
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_tongue"; })) return;
      w.push({
        id: "k_tongue",
        sec: "The world before you",
        t: "Tongues",
        tags: "language dialect civ name plaque speech",
        w: "<p>Every people inland has a mouth of their own. A traveler on Salem will still speak English, and then a word that is not. Names in the Atlas are not random letters. They were said that way.</p><p><b>What to do about it:</b> listen on the floor. The plaque on a tank is a word from the harbor league.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastUi > 2) {
        lastUi = now();
        pack();
      }
    } catch (e) {}
  }

  window.tongue = { word: word, name: name, say: say, plaque: plaque, lang: langOf, panel: panelHtml };

  if (window.__onBeat) window.__onBeat(tick, 900);
  else setTimeout(function loop() { tick(); setTimeout(loop, 900); }, 900);
})();
