/* faith.js — spheres, holy days, a fish that is not just stock.
   A festival is extra feet on Salem. A taboo is a sale you should not have made. */
(function () {
  "use strict";

  var lastTick = 0;
  var GODS = [
    { id: "salt", n: "the Salt Mother", sphere: "sea", fish: "clown", day: 3 },
    { id: "dry", n: "the Dry Eye", sphere: "sun", fish: "cichlid", day: 11 },
    { id: "wheel", n: "the Wheel", sphere: "craft", fish: "goldfish", day: 18 },
    { id: "net", n: "the First Net", sphere: "catch", fish: "tetra", day: 7 },
    { id: "oak", n: "the Quiet Oak", sphere: "wood", fish: "betta", day: 22 },
    { id: "vein", n: "the Red Vein", sphere: "blood", fish: "discus", day: 14 },
    { id: "ledger", n: "the Night Ledger", sphere: "debt", fish: "guppy", day: 27 },
  ];

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

  function doy() {
    try {
      var g = gs();
      if (g && isFinite(g.t)) return Math.floor((((g.t % 1e9) + 1e9) % 1e9) / 2400) % 28;
    } catch (e) {}
    return yearNow() % 28;
  }

  function state() {
    var g = gs();
    if (g && g.faith && g.faith.gods) return g.faith;
    var st = { gods: GODS.map(function (x) { return { id: x.id, n: x.n, favor: 0.5 }; }), lastFest: "", offended: "" };
    try {
      if (g) g.faith = st;
    } catch (e) {}
    return st;
  }

  function today() {
    var d = doy();
    for (var i = 0; i < GODS.length; i++) {
      if (GODS[i].day === d) return GODS[i];
    }
    return null;
  }

  function bless() {
    var g = today();
    if (!g) return 0;
    var st = state();
    var rec = st.gods.filter(function (x) { return x.id === g.id; })[0];
    var fav = rec ? rec.favor : 0.5;
    return 0.06 + fav * 0.08;
  }

  function taboo() {
    var g = today();
    return g ? g.fish : "";
  }

  function line() {
    var g = today();
    if (!g) return "";
    var lines = [
      "It's " + g.n + "'s day. The " + g.fish + " is the one.",
      "We don't skip the " + g.fish + " today.",
      g.n + " is looking. Keep a pair of " + g.fish + ".",
    ];
    return lines[doy() % lines.length];
  }

  function onSale(kind) {
    kind = String(kind || "").toLowerCase();
    var g = today();
    var st = state();
    if (!g) return;
    var rec = st.gods.filter(function (x) { return x.id === g.id; })[0];
    if (!rec) return;
    if (kind.indexOf(g.fish) >= 0) {
      rec.favor = Math.min(1, rec.favor + 0.08);
      st.lastFest = g.n + " was pleased. A " + g.fish + " left the shop on her day.";
      try {
        if (window.weave && weave.because) weave.because(st.lastFest);
      } catch (e) {}
    } else if (Math.random() < 0.2) {
      rec.favor = Math.max(0, rec.favor - 0.04);
      st.offended = g.n;
    }
  }

  function panelHtml() {
    var g = today();
    var st = state();
    var rows = st.gods.map(function (x) {
      return x.n + " " + (x.favor > 0.6 ? "warm" : x.favor < 0.4 ? "cold" : "quiet");
    });
    return "<p>" + (g ? "Today is " + g.n + "'s. Favored: " + g.fish + "." : "No holy day.") + "</p><p>" + rows.join(". ") + ".</p>";
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_faith"; })) return;
      w.push({
        id: "k_faith",
        sec: "The world before you",
        t: "The old names",
        tags: "faith god festival holy fish taboo till salt mother",
        w: "<p>The harbor still keeps seven names. Each has a day in the twenty-eight, a sphere, and a fish. Sell that fish on that day and the street is easier. Ignore it and they still come, they just pay less.</p><p><b>What to do about it:</b> Life will say the name. Keep a pair of whatever is holy this week. The Atlas already knew them.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      state();
      var g = today();
      if (g && now() - lastTick > 8) {
        lastTick = now();
        try {
          if (window.weave && weave.because && Math.random() < 0.15) weave.because("Festival: " + g.n + ".");
        } catch (e) {}
      }
    } catch (e2) {}
  }

  window.faith = { today: today, bless: bless, taboo: taboo, line: line, onSale: onSale, panel: panelHtml };

  if (window.__onBeat) window.__onBeat(tick, 700);
  else setTimeout(function loop() { tick(); setTimeout(loop, 700); }, 700);
})();
