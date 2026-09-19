/* ward.js — a child, and the aunt who says no.
   Crusader Kings: wards, guardians, education, coming of age. Fin's
   kids already asked for guppies. Now they do not come alone. The
   guardian decides. The child wanted the guppy. The aunt said no.
   A child who was still in school becomes someone with a bent.
   They copy the guardian. No second HUD. Odds, speech, the till. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;

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

  function shopDay() {
    try {
      var g = gs();
      if (g && isFinite(g.t)) return Math.floor((((g.t % 1e9) + 1e9) % 1e9) / 2400);
    } catch (e) {}
    return 0;
  }

  function hash32(s) {
    var h = 2166136261;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("ward", text);
    } catch (e2) {}
  }

  function egg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function gold(text, force) {
    if (!text) return;
    lastGold = text;
    lastGoldAt = now();
    try {
      var el = document.getElementById("hookWhisper");
      if (el && (force || el.textContent !== text)) {
        el.textContent = text;
        el.classList.add("on", "pop");
      }
    } catch (e) {}
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function byId(id) {
    var all = folk();
    for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === id) return all[i];
    return null;
  }

  function state() {
    var g = gs();
    if (g && g.ward && typeof g.ward === "object") return g.ward;
    var st = { last: "", kid: "", guard: "", day: -1, no: false, grown: "" };
    try {
      if (g) g.ward = st;
    } catch (e) {}
    return st;
  }

  function keepOf(st) {
    return !!(
      st &&
      (st._lateMae ||
        st._goingHold ||
        st._lateKid ||
        st._mask ||
        st._hold ||
        st._lord ||
        st._great ||
        st._envoy ||
        st._wed ||
        st._heir ||
        st._plot ||
        st._hush ||
        st._feast ||
        st._gyve ||
        st._claim)
    );
  }

  function guardianOf(kid) {
    if (!kid) return null;
    if (kid.kinOf) {
      var g = byId(kid.kinOf);
      if (g && !g.dead) return g;
    }
    var all = folk();
    for (var i = 0; i < all.length; i++) {
      if (all[i] && !all[i].dead && all[i].id === "mae") return all[i];
    }
    return null;
  }

  function growUp() {
    var st = state();
    var all = folk();
    var d = shopDay();
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.dead) continue;
      if (f.kind === "kid" && f.job === "still in school" && d - (f.bornD || 0) >= 8 && !f._grown) {
        f._grown = 1;
        f.kind = "lunch";
        f.job = "off the boats";
        var g = guardianOf(f);
        if (g && g.bent) f.bent = g.bent;
        else if (window.bent && bent.ofName) f.bent = bent.ofName(f.n) || f.bent;
        f.last = "old enough to bag alone";
        st.grown = f.n;
        var line = first(f.n) + " is old enough to bag alone.";
        st.last = line;
        because(line + (g ? " They copied " + first(g.n) + "." : ""));
        if (d >= 1) gold(line, true);
        egg("wardgrown", line);
      }
    }
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        if (keepOf(st) || !st) return rec;
        var fig = null;
        try {
          if (window.kin && kin.of) fig = kin.of(st.guestName || rec.name);
        } catch (e) {}
        if (!fig) return rec;
        var ws = state();
        if ((rec.kind === "kid" || fig.kind === "kid") && rec.phase === "look" && !st._wardSaid) {
          st._wardSaid = 1;
          var g = guardianOf(fig);
          var no = false;
          if (g) {
            var h = hash32("ward:" + fig.id + shopDay());
            no = (h % 100) < 38;
            rec.line = no
              ? "The child wanted the " + (fig.want || "guppy") + ". " + first(g.n) + " said no."
              : first(g.n) + " said the " + (fig.want || "guppy") + " was all right.";
            st.line = rec.line;
            st.lineUntil = now() + 4;
            ws.kid = fig.n;
            ws.guard = g.n;
            ws.day = shopDay();
            ws.no = no;
            if (no) {
              rec.phase = "leave";
              st.phase = "leave";
              st.bought = false;
              ws.last = first(g.n) + " said no.";
              if (shopDay() >= 1) {
                because(ws.last + " " + first(fig.n) + " wanted the " + (fig.want || "guppy") + ".");
                gold(first(fig.n) + " wanted the " + (fig.want || "guppy") + ". " + first(g.n) + " said no.", true);
                egg("wardno", ws.last);
              }
            } else {
              ws.last = first(g.n) + " said the " + (fig.want || "guppy") + " was all right.";
            }
          }
        } else if (fig._grown && rec.phase === "look" && !st._wardGrown) {
          st._wardGrown = 1;
          rec.line = "I used to need someone. The usual.";
          st.line = rec.line;
        }
      } catch (e) {}
      return rec;
    };
  }

  function wrapChoir() {
    if (didChoir || !window.choir || !choir.weather) return;
    didChoir = true;
    var orig = choir.weather;
    choir.weather = function () {
      var w = orig.apply(this, arguments);
      try {
        var ws = state();
        if (ws.no && ws.day === shopDay()) w.sour = Math.min(1, (w.sour || 0) + 0.03);
        if (ws.grown) w.sweet = Math.min(1, (w.sweet || 0) + 0.03);
      } catch (e) {}
      return w;
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    return state().last || whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_ward";
      }))
        return;
      wiki.push({
        id: "k_ward",
        sec: "You and your people",
        t: "A child, and the aunt who says no",
        tags: "ward guardian education child coming of age crusader aunt guppy",
        w: "<p>Crusader Kings: wards, guardians, education, coming of age. Fin's kids already asked for guppies. Now they do not come alone. The guardian decides. The child wanted the guppy. The aunt said no. A child who was still in school becomes someone with a bent. They copy the guardian.</p><p><b>What to do about it:</b> the kid is not the customer. Life names who said no. When they grow, they bag like the person who brought them.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (now() - lastTick > 1.7) {
        lastTick = now();
        growUp();
      }
    } catch (e) {}
  }

  window.ward = {
    whisper: whisper,
    line: line,
    of: state,
    seed: function () {
      var kids = folk().filter(function (f) {
        return f && !f.dead && (f.kind === "kid" || f.job === "still in school");
      });
      var kid = kids[0];
      if (!kid) return state();
      var g = guardianOf(kid);
      var st = state();
      st.kid = kid.n;
      st.guard = g ? g.n : "Mae Costa";
      st.no = true;
      st.day = shopDay();
      st.last = first(st.kid) + " wanted the guppy. " + first(st.guard) + " said no.";
      gold(st.last, true);
      because(st.last);
      return st;
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
