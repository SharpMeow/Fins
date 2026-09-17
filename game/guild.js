/* guild.js — the people who decide if you are a shop.
   Dues, standing, a mandate. A boycott is not a rumor. It is an empty aisle. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastDues = -1;
  var lastToast = "";

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

  function shopDay() {
    try {
      var g = gs();
      if (g && isFinite(g.t)) return Math.floor((((g.t % 1e9) + 1e9) % 1e9) / 2400);
    } catch (e) {}
    return 0;
  }

  function clamp(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function state() {
    var g = gs();
    if (g && g.guild && typeof g.guild.stand === "number") return g.guild;
    var st = {
      stand: 0.42,
      dues: 8,
      paid: 0,
      mandate: "goldfish",
      last: "",
      boycott: 0,
    };
    try {
      if (g) g.guild = st;
    } catch (e) {}
    return st;
  }

  function standing() {
    return state().stand;
  }

  function boycott() {
    return state().stand < 0.22;
  }

  function edge() {
    var s = standing();
    if (s < 0.22) return -0.09;
    if (s > 0.72) return 0.07;
    return (s - 0.42) * 0.12;
  }

  function mandate() {
    return state().mandate;
  }

  function line() {
    var st = state();
    if (boycott()) return "The guild said stay away. I'm just looking through the glass.";
    if (st.stand > 0.7) return "The hall speaks well of this counter.";
    if (st.mandate) return "The hall wants a pair of " + st.mandate + " on the rack.";
    return "";
  }

  function noteSale(kind) {
    var st = state();
    st.stand = clamp(st.stand + 0.018);
    if (kind && String(kind).toLowerCase().indexOf(st.mandate) >= 0) {
      st.stand = clamp(st.stand + 0.05);
      st.last = "Mandate filled. " + st.mandate + ".";
      try {
        if (window.weave && weave.because) weave.because("The hall marked the " + st.mandate + " sale.");
      } catch (e) {}
      rollMandate(st);
    }
  }

  function noteMiss(kind) {
    var st = state();
    st.stand = clamp(st.stand - 0.025);
    if (kind && String(kind).toLowerCase().indexOf(st.mandate) >= 0) {
      st.stand = clamp(st.stand - 0.05);
      st.last = "Missed the mandate.";
    }
  }

  function rollMandate(st) {
    var opts = ["goldfish", "betta", "guppy", "tetra", "cichlid"];
    try {
      if (window.faith && faith.taboo && faith.taboo()) opts.push(faith.taboo());
    } catch (e) {}
    st.mandate = opts[(Math.random() * opts.length) | 0];
  }

  function collectDues() {
    var st = state();
    var d = shopDay();
    if (d === lastDues) return;
    lastDues = d;
    if (d % 7 !== 0) return;
    var g = gs();
    if (!g) return;
    if ((g.coins || 0) >= st.dues) {
      g.coins -= st.dues;
      st.paid++;
      st.stand = clamp(st.stand + 0.04);
      st.last = "Dues paid. " + st.dues + " to the hall.";
    } else {
      st.stand = clamp(st.stand - 0.1);
      st.last = "Dues missed. The hall noticed.";
      try {
        if (window.rumor && rumor.add) rumor.add("guild", "They skipped the hall.", 0.7);
        if (window.weave && weave.because) weave.because("Guild dues missed.");
      } catch (e) {}
    }
  }

  function toastBoycott() {
    var st = state();
    if (!boycott()) {
      st.boycott = 0;
      return;
    }
    if (st.boycott) return;
    st.boycott = 1;
    var msg = "The hall put the word out. People are walking past.";
    if (msg === lastToast) return;
    lastToast = msg;
    try {
      if (typeof k === "function") k(msg, "bad");
    } catch (e) {}
  }

  function panelHtml() {
    var st = state();
    return (
      "<p>The hall. Standing " +
      Math.round(st.stand * 100) +
      ". Mandate: " +
      st.mandate +
      (boycott() ? ". Boycott." : ".") +
      "</p><p>" +
      (st.last || "Quiet.") +
      "</p>"
    );
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_guild"; })) return;
      w.push({
        id: "k_guild",
        sec: "The shop floor",
        t: "The hall",
        tags: "guild dues standing mandate boycott till hall",
        w: "<p>There is a hall for people who sell living water. They want dues, and they want a pair of something on the rack. Fill it and standing rises. Miss the dues and they put the word out. A boycott is an empty aisle, not a letter.</p><p><b>What to do about it:</b> keep the mandate pair. Pay the week. Life will say if they have turned.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 1.8) {
        lastTick = now();
        collectDues();
        toastBoycott();
      }
    } catch (e) {}
  }

  window.guild = {
    standing: standing,
    boycott: boycott,
    edge: edge,
    mandate: mandate,
    line: line,
    noteSale: noteSale,
    noteMiss: noteMiss,
    panel: panelHtml,
  };

  if (window.__onBeat) window.__onBeat(tick, 700);
  else setTimeout(function loop() { tick(); setTimeout(loop, 700); }, 700);
})();
