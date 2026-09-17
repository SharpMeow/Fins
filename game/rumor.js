/* rumor.js — a fact that walks.
   Heat, source, a line on the floor. DF's rumours are how a world talks to itself.
   Here they change what a regular will pay. */
(function () {
  "use strict";

  var lastTick = 0;

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

  function state() {
    var g = gs();
    if (g && g.rumors && Array.isArray(g.rumors.list)) return g.rumors;
    var st = { list: [], heat: 0, last: "" };
    try {
      if (g) g.rumors = st;
    } catch (e) {}
    return st;
  }

  function add(kind, line, heat) {
    var st = state();
    kind = String(kind || "talk");
    line = String(line || "").slice(0, 160);
    if (!line) return;
    for (var i = 0; i < st.list.length; i++) {
      if (st.list[i].line === line) {
        st.list[i].heat = Math.min(1, st.list[i].heat + (heat || 0.2));
        return;
      }
    }
    st.list.push({ k: kind, line: line, heat: heat == null ? 0.5 : heat, y: yearNow() });
    if (st.list.length > 18) st.list.shift();
    st.last = line;
  }

  function heat() {
    var st = state();
    var h = 0;
    for (var i = 0; i < st.list.length; i++) h += st.list[i].heat || 0;
    st.heat = st.list.length ? h / st.list.length : 0;
    return st.heat;
  }

  function whisper() {
    var st = state();
    var hot = st.list.filter(function (r) { return r.heat > 0.4; });
    if (!hot.length) return "";
    var r = hot[(Math.random() * hot.length) | 0];
    return r.line;
  }

  function tickYear() {
    var st = state();
    for (var i = st.list.length - 1; i >= 0; i--) {
      st.list[i].heat *= 0.86;
      if (st.list[i].heat < 0.08) st.list.splice(i, 1);
    }
    heat();
    try {
      if (window.beast && beast.line) {
        var bl = beast.line();
        if (bl) add("beast", bl, 0.6);
      }
      if (window.faith && faith.today && faith.today()) {
        var g = faith.today();
        if (g && Math.random() < 0.2) add("faith", "It's " + g.n + "'s day.", 0.4);
      }
      if (window.road && road.cut && road.cut() && Math.random() < 0.25) add("road", "The inland road is cut.", 0.7);
    } catch (e) {}
  }

  function panelHtml() {
    var st = state();
    var rows = st.list.slice(-6).map(function (r) { return r.line; });
    return "<p>What the street is saying.</p><p>" + (rows.join(" ") || "Nothing loud.") + "</p>";
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_rumor"; })) return;
      w.push({
        id: "k_rumor",
        sec: "The world before you",
        t: "Rumour",
        tags: "rumor heat street talk beast festival till",
        w: "<p>A fact that walks. Heat, a source, a line. People on the floor repeat it. If the harbor has a beast, if a road is cut, if a god has a day, it shows up as speech before it shows up as a number.</p><p><b>What to do about it:</b> listen. Life writes some of it. The till feels the rest.</p>",
      });
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      seedWiki();
      if (now() - lastTick > 2.2) {
        lastTick = now();
        tickYear();
      }
    } catch (e) {}
  }

  window.rumor = { add: add, heat: heat, whisper: whisper, list: function () { return state().list; }, panel: panelHtml };

  if (window.__onBeat) window.__onBeat(tick, 800);
  else setTimeout(function loop() { tick(); setTimeout(loop, 800); }, 800);
})();
