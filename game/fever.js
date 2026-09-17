/* fever.js — a sickness that walks the road.
   Not a status icon. Heat on the street, ich in the glass, people who stay home. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastY = 0;
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

  function clamp(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function state() {
    var g = gs();
    if (g && g.fever && typeof g.fever.heat === "number") return g.fever;
    var st = { heat: 0.08, name: "", last: "", sicked: 0 };
    try {
      if (g) g.fever = st;
    } catch (e) {}
    return st;
  }

  function heat() {
    return state().heat;
  }

  function edge() {
    var h = heat();
    if (h < 0.28) return 0;
    return Math.min(0.1, (h - 0.28) * 0.22);
  }

  function line() {
    var st = state();
    if (st.heat < 0.32) return "";
    if (st.name) return "There's " + st.name + " on the street. I'm not lingering.";
    return "Something's going around. I'll look from the door.";
  }

  function infectFish() {
    var st = state();
    if (st.heat < 0.55) return;
    var g = gs();
    var fish = (g && g.fish) || [];
    var n = 0;
    for (var i = 0; i < fish.length && n < 2; i++) {
      var f = fish[i];
      if (!f || f.dead) continue;
      if ((f.sick || 0) > 0) continue;
      if (Math.random() < st.heat * 0.08) {
        f.sick = Math.max(f.sick || 0, 0.35);
        n++;
      }
    }
    if (n) {
      st.sicked += n;
      st.last = n + " in the glass caught it.";
    }
  }

  function tickHeat() {
    var st = state();
    var add = 0;
    try {
      if (window.beast && beast.near) add += beast.near() * 0.4;
    } catch (e) {}
    try {
      if (window.wild && wild.scarce) {
        /* scarce water is stressed water */
        add += 0.01;
      }
    } catch (e2) {}
    try {
      if (window.shopSite && shopSite.wet && shopSite.wet() > 0.4) add += 0.02;
    } catch (e3) {}
    try {
      var g = gs();
      if (g && g.clog) add += 0.03;
    } catch (e4) {}
    st.heat = clamp(st.heat * 0.97 + add);
    if (st.heat < 0.2) st.name = "";
  }

  function yearPulse() {
    var y = yearNow();
    if (y === lastY) return;
    lastY = y;
    var st = state();
    if (Math.random() < 0.12) {
      st.heat = clamp(st.heat + 0.35);
      st.name = st.name || (window.tongue && tongue.word ? tongue.word(9, 2) + " fever" : "harbor fever");
      st.last = st.name + " came up the road.";
      try {
        if (window.rumor && rumor.add) rumor.add("fever", st.last, 0.8);
        if (window.weave && weave.because) weave.because(st.last);
      } catch (e) {}
      var msg = st.last;
      if (msg !== lastToast) {
        lastToast = msg;
        try {
          if (typeof k === "function") k(msg, "bad");
        } catch (e2) {}
      }
    } else {
      st.heat = clamp(st.heat * 0.7);
    }
  }

  function treat() {
    var st = state();
    st.heat = clamp(st.heat - 0.18);
    st.last = "The column was treated. The street is easier.";
  }

  function panelHtml() {
    var st = state();
    return (
      "<p>" +
      (st.name ? st.name : "No named fever") +
      ". Heat " +
      Math.round(st.heat * 100) +
      ".</p><p>" +
      (st.last || "The water is holding.") +
      "</p>"
    );
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_fever"; })) return;
      w.push({
        id: "k_fever",
        sec: "The shop floor",
        t: "Fever",
        tags: "fever ich sick street heat treat clog beast",
        w: "<p>A sickness that walks the road. It has heat, sometimes a name. When it is up, people look from the door and the glass can catch it. A clogged filter and a wet aisle feed it. A beast off the harbor feeds it.</p><p><b>What to do about it:</b> treat the water. Clean the filter. Wait. The gold line will say the name if it has one.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 1.5) {
        lastTick = now();
        yearPulse();
        tickHeat();
        infectFish();
      }
    } catch (e) {}
  }

  window.fever = { heat: heat, edge: edge, line: line, treat: treat, panel: panelHtml };

  if (window.__onBeat) window.__onBeat(tick, 600);
  else setTimeout(function loop() { tick(); setTimeout(loop, 600); }, 600);
})();
