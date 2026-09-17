/* craft.js — the quality of a bag, a tank, a plaque.
   Masterwork is not a stat screen. It is someone who pays and says the word. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastCombo = 0;

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

  function clamp(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function state() {
    var g = gs();
    if (g && g.craft && typeof g.craft.q === "number") return g.craft;
    var st = { q: 0.4, bags: 0, master: 0, plaque: "", last: "" };
    try {
      if (window.tongue && tongue.plaque) st.plaque = tongue.plaque("the glass");
    } catch (e) {}
    try {
      if (g) g.craft = st;
    } catch (e2) {}
    return st;
  }

  function quality() {
    return state().q;
  }

  function edge() {
    return (quality() - 0.4) * 0.16;
  }

  function line() {
    var st = state();
    if (st.q > 0.78) return "Whoever bags here knows their hands.";
    if (st.q < 0.28) return "The last bag was sloppy.";
    if (st.plaque) return "The plaque says " + st.plaque.split("·")[0].trim() + ".";
    return "";
  }

  function noteBag(good) {
    var st = state();
    st.bags++;
    if (good) st.q = clamp(st.q + 0.03);
    else st.q = clamp(st.q - 0.04);
    try {
      if (window.weave && weave.of) {
        var w = weave.of();
        w.craft = st.q;
      }
    } catch (e) {}
  }

  function noteCombo(n) {
    n = n || 0;
    if (n === lastCombo) return;
    lastCombo = n;
    var st = state();
    if (n >= 4) {
      st.q = clamp(st.q + 0.08);
      st.master++;
      st.last = "A bag that will be talked about.";
      try {
        if (window.weave && weave.because) weave.because("A masterwork bag. Combo " + n + ".");
        if (window.rumor && rumor.add) rumor.add("craft", "They bag like a hall shop.", 0.55);
        if (typeof k === "function") k("That bag will be talked about.", "gold");
      } catch (e) {}
    } else if (n >= 2) {
      st.q = clamp(st.q + 0.02);
    }
  }

  function plaque() {
    var st = state();
    if (!st.plaque) {
      try {
        if (window.tongue && tongue.plaque) st.plaque = tongue.plaque("the glass");
      } catch (e) {}
    }
    return st.plaque;
  }

  function panelHtml() {
    var st = state();
    return (
      "<p>Hands. Quality " +
      Math.round(st.q * 100) +
      ". Masterworks " +
      st.master +
      ".</p><p>" +
      (st.plaque ? "Plaque: " + st.plaque + ". " : "") +
      (st.last || "") +
      "</p>"
    );
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_craft"; })) return;
      w.push({
        id: "k_craft",
        sec: "The shop floor",
        t: "The hands",
        tags: "craft quality bag masterwork plaque combo till",
        w: "<p>A bag has quality. A tank has a plaque in a tongue that was spoken inland. String sales and the hands remember. A masterwork is not a menu. Someone pays and tells the hall.</p><p><b>What to do about it:</b> do not break the run. The gold line will say when a bag was good. The till keeps the rest.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 1.2) {
        lastTick = now();
        try {
          if (window.hookRun) noteCombo(hookRun().combo || 0);
        } catch (e) {}
        plaque();
      }
    } catch (e2) {}
  }

  window.craft = {
    quality: quality,
    edge: edge,
    line: line,
    noteBag: noteBag,
    noteCombo: noteCombo,
    plaque: plaque,
    panel: panelHtml,
  };

  if (window.__onBeat) window.__onBeat(tick, 500);
  else setTimeout(function loop() { tick(); setTimeout(loop, 500); }, 500);
})();
