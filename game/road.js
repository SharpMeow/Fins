/* road.js — the ways between sites.
   Routes, caravans, a war that cuts a road, a person who walked farther than Salem. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastComing = "";
  var didBrowse = false;

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function realmW() {
    try {
      if (window.realm && typeof realm.world === "function") return realm.world();
    } catch (e) {}
    return null;
  }

  function yearNow() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function dist2(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function buildRoutes(w) {
    var routes = [];
    if (!w || !w.sites) return routes;
    for (var i = 0; i < w.sites.length; i++) {
      var a = w.sites[i];
      if (a.ruin) continue;
      var best = -1;
      var bd = 1e9;
      var best2 = -1;
      var bd2 = 1e9;
      for (var j = 0; j < w.sites.length; j++) {
        if (i === j) continue;
        var b = w.sites[j];
        if (b.ruin) continue;
        var d = dist2(a, b);
        if (d < bd) {
          bd2 = bd;
          best2 = best;
          bd = d;
          best = j;
        } else if (d < bd2) {
          bd2 = d;
          best2 = j;
        }
      }
      if (best >= 0) routes.push({ a: i, b: best, cut: 0, name: a.n + "–" + w.sites[best].n });
      if (best2 >= 0 && i === 0) routes.push({ a: i, b: best2, cut: 0, name: a.n + "–" + w.sites[best2].n });
    }
    return routes;
  }

  function state() {
    var g = gs();
    if (g && g.road && g.road.routes && g.road.routes.length) return g.road;
    var w = realmW();
    var st = { routes: buildRoutes(w), lastY: 0, note: "", caravan: "" };
    try {
      if (g) g.road = st;
    } catch (e) {}
    return st;
  }

  function cut() {
    var st = state();
    for (var i = 0; i < st.routes.length; i++) {
      if (st.routes[i].cut && (st.routes[i].a === 0 || st.routes[i].b === 0)) return true;
    }
    try {
      if (window.realm && realm.embargo && realm.embargo()) return true;
    } catch (e) {}
    return false;
  }

  function tickYear() {
    var st = state();
    var y = yearNow();
    if (st.lastY >= y) return;
    st.lastY = y;
    var w = realmW();
    if (!w) return;
    var war = null;
    try {
      war = window.realm && realm.embargo ? realm.embargo() : null;
    } catch (e) {}
    if (war) {
      for (var i = 0; i < st.routes.length; i++) {
        if (Math.random() < 0.35) st.routes[i].cut = 1;
      }
      st.note = "Roads inland are cut. The baker is still next door. The rest is late.";
      try {
        if (window.weave && weave.bumpWord) weave.bumpWord(-0.08);
        if (window.weave && weave.because) weave.because("A road was cut. Holds come late.");
      } catch (e2) {}
    } else {
      for (var r = 0; r < st.routes.length; r++) {
        if (st.routes[r].cut && Math.random() < 0.4) st.routes[r].cut = 0;
      }
    }
    if (w.sites && w.sites.length > 2 && Math.random() < 0.22) {
      var s = w.sites[1 + ((Math.random() * (w.sites.length - 1)) | 0)];
      st.caravan = s.n;
      st.note = "A hold from " + s.n + " is on the water.";
    }
  }

  function injectComing() {
    try {
      var coming = window.desk && desk.coming ? desk.coming() : null;
      if (!coming || coming.done) return;
      var key = (coming.name || "") + "|" + (coming.want || "");
      if (key === lastComing) return;
      lastComing = key;
      if (coming._road) return;
      if (Math.random() > 0.22) return;
      var t = window.realm && realm.traveler ? realm.traveler() : null;
      if (!t || !t.site) return;
      coming._road = 1;
      coming.fromSite = t.site.n;
      if (t.fig && t.fig.n) coming.guestName = t.fig.n;
      var want = coming.want || "";
      var scarce = window.wild && want && wild.scarce(want);
      try {
        if (window.desk && desk.think) {
          desk.think("road", (t.fig ? t.fig.n : "Someone") + " of " + t.site.n + (scarce ? " asking for " + want + " that the river no longer has" : " off a longer road") + ".");
        }
        if (window.weave && weave.because) weave.because("They walked from " + t.site.n + ".");
      } catch (e) {}
    } catch (e2) {}
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function () {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var coming = window.desk && desk.coming ? desk.coming() : null;
        if (coming && coming.fromSite && rec.phase === "look" && !rec._roadLine) {
          rec._roadLine = 1;
          rec.line = rec.line || "From " + coming.fromSite + ".";
          rec.name = coming.guestName || rec.name;
        }
        if (window.wild && rec.want && wild.scarce(rec.want) && rec.phase === "look" && Math.random() < 0.4) {
          rec.line = "I heard the river is empty of " + rec.want + ".";
        }
        if (cut() && rec.phase === "look" && Math.random() < 0.2) {
          rec.line = "The inland hold is late.";
        }
      } catch (e) {}
      return rec;
    };
  }

  function enhance() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/atlas/i.test(title.textContent || "")) return;
    var st = state();
    var html = '<div class="sec">The roads</div>';
    html += '<div class="note">Every site keeps a nearest road. A war cuts the ones that touch the harbor. Then the hold is late, and a person walks in who did not start on this block.</div>';
    var shown = 0;
    for (var i = 0; i < st.routes.length && shown < 8; i++) {
      var r = st.routes[i];
      html += '<div class="row"><div></div><div><div class="d">' + r.name + (r.cut ? " · cut" : "") + "</div></div><div></div></div>";
      shown++;
    }
    if (st.note) html += '<div class="note">' + st.note + "</div>";
    if (cut()) html += '<div class="note">The road to the harbor is not open. Odds drop. People still come; they just do not pay.</div>';
    var wrap = body.querySelector(".road-atlas");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "road-atlas";
      body.appendChild(wrap);
    }
    if (wrap.getAttribute("data-h") !== String(html.length)) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", String(html.length));
    }
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!w || !w.push) return;
      var extra = {
        id: "k_road",
        sec: "The street",
        t: "The roads",
        tags: "road caravan traveler war embargo trade route",
        w: "<p>Salem Street is one block. The map has roads. A war inland cuts the ones that touch the harbor. Holds come late. Word drops. Someone walks in who started in a town you have only read. They will say the name.</p><p><b>What to do about it:</b> Atlas, The roads. If they say the inland hold is late, that is not a random line.</p>",
      };
      for (var i = 0; i < w.length; i++) if (w[i] && w[i].id === extra.id) return;
      w.push(extra);
    } catch (e) {}
  }

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function tick() {
    try {
      wrapBrowse();
      seedWiki();
      if (now() - lastTick > 1.5) {
        lastTick = now();
        tickYear();
        injectComing();
      }
      if (now() - lastUi > 1.2) {
        lastUi = now();
        enhance();
      }
    } catch (e) {}
  }

  window.road = {
    of: state,
    cut: cut,
    tick: tickYear,
  };

  if (window.__onBeat) window.__onBeat(tick, 440);
  else setTimeout(function loop() { tick(); setTimeout(loop, 440); }, 440);
})();
