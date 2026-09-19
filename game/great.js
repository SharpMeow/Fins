/* great.js — a great person is not a pool. They walk in once.
   Civilization great merchants, prophets, admirals, engineers, artists,
   scientists. Fin's has one of them on the aisle: they pay double, they
   found a belief, they want a pair for a flagship, they sweeten the
   filter, they cut a morning, they name the water. No second HUD. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var didBrowse = false;
  var didChoir = false;
  var didFish = false;
  var ROLES = ["merchant", "prophet", "admiral", "engineer", "artist", "scientist"];

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

  function year() {
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

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("great", text);
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

  function aFig() {
    try {
      var w = window.realm && realm.world && realm.world();
      if (w && w.figs) {
        for (var i = w.figs.length - 1; i >= 0; i--) {
          if (w.figs[i] && w.figs[i].n && (w.figs[i].fame || 0) > 0.3) return w.figs[i];
        }
        if (w.figs.length) return w.figs[w.figs.length - 1];
      }
    } catch (e) {}
    return { n: "Ithen Ravos", job: "merchant", fame: 0.6 };
  }

  function kindOf() {
    try {
      if (window.guild && guild.mandate) return String(guild.mandate() || "goldfish");
    } catch (e) {}
    return "goldfish";
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

  function state() {
    var g = gs();
    if (g && g.great && g.great.n) return g.great;
    var fig = aFig();
    var role = ROLES[hash32(fig.n) % ROLES.length];
    var st = { n: fig.n, role: role, last: "", seen: false, day: -1, did: false, want: kindOf() };
    try {
      if (g) g.great = st;
    } catch (e) {}
    return st;
  }

  function first(n) {
    return String(n || "Someone").split(" ")[0];
  }

  function roleLine(st) {
    if (st.role === "merchant") return "I'll take the pair. Double.";
    if (st.role === "prophet") return "This water has a god. Listen.";
    if (st.role === "admiral") return "A pair of " + st.want + " for the flagship.";
    if (st.role === "engineer") return "The filter will hold if you let me look.";
    if (st.role === "artist") return "I came to cut the morning into the glass.";
    return "This water has a name. I can tell you it.";
  }

  function act(st) {
    if (st.did) return;
    st.did = true;
    if (st.role === "merchant") {
      try {
        var g = gs();
        if (g) g.coins = (g.coins || 0) + 18;
      } catch (e) {}
    } else if (st.role === "prophet") {
      try {
        if (window.vow && vow.found) vow.found(st.want);
      } catch (e2) {}
    } else if (st.role === "engineer") {
      try {
        if (window.craft && craft.noteBag) craft.noteBag(true);
      } catch (e3) {}
      try {
        if (window.fever && fever.treat) fever.treat();
      } catch (e4) {}
    } else if (st.role === "artist") {
      because(first(st.n) + " cut a morning into the glass.");
    } else if (st.role === "scientist") {
      try {
        if (window.know && know.diagnose) know.diagnose();
      } catch (e5) {}
    }
  }

  function arrive(rec, st, force) {
    var gs_ = state();
    if (gs_.seen && gs_.day === shopDay() && !force) return false;
    if (shopDay() < 1 && !force) return false;
    rec.kind = "collector";
    rec.name = gs_.n;
    rec.phase = "look";
    rec.want = gs_.want;
    rec.line = roleLine(gs_);
    if (st) {
      st._great = 1;
      st.name = gs_.n;
      st.guestName = gs_.n;
      st.want = gs_.want;
      st.line = rec.line;
      st.lineUntil = now() + 7;
      st.until = Math.max(st.until || 0, now() + 8);
      if (gs_.role === "merchant" || gs_.role === "admiral") st.bought = false;
    }
    gs_.seen = true;
    gs_.day = shopDay();
    act(gs_);
    var line = first(gs_.n) + " the " + gs_.role + " is on the aisle.";
    gs_.last = line;
    because(line + " " + rec.line);
    gold(line, true);
    egg("great" + gs_.role, line);
    return true;
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
        var keep = typeof keepGuest === "function" ? keepGuest(st) : !!(st && (st._lateMae || st._goingHold || st._lateKid || st._mask));
        var gs_ = state();
        if (
          !keep &&
          rec.phase === "look" &&
          st &&
          !st._great &&
          shopDay() >= 1 &&
          !gs_.seen &&
          ((idx | 0) === 1 || rec.kind === "collector")
        ) {
          arrive(rec, st);
        }
        if (gs_.seen && gs_.day === shopDay() && rec.phase === "look" && st && !st._great && !st._greatSaid && !keep) {
          st._greatSaid = 1;
          rec.line = rec.kind === "kid" ? "That's not a regular." : first(gs_.n) + " the " + gs_.role + " is here.";
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
        var gs_ = state();
        if (gs_.seen && gs_.day === shopDay()) {
          w.sweet = Math.min(1, (w.sweet || 0) + (gs_.role === "engineer" || gs_.role === "prophet" ? 0.12 : 0.06));
          if (!w.line) w.line = first(gs_.n) + " the " + gs_.role + " is on the aisle.";
        }
      } catch (e) {}
      return w;
    };
  }

  function wrapFish() {
    if (didFish || typeof window.drawFishSprite !== "function") return;
    didFish = true;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (a) {
      try {
        var gs_ = state();
        if (gs_.seen && gs_.day === shopDay() && gs_.role === "scientist" && a && a.fish && a.fish.nick) {
          a.fish._gaze = now();
        }
      } catch (e) {}
      return orig.apply(this, arguments);
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
      if (wiki.some(function (a) { return a && a.id === "k_great"; })) return;
      wiki.push({
        id: "k_great",
        sec: "The chronicle",
        t: "A great person walks in once",
        tags: "great merchant prophet admiral engineer artist scientist civilization",
        w: "<p>Civilization great people are a pool. Fin's has one of them on the aisle. A merchant pays double. A prophet founds a belief. An admiral wants a pair for a flagship. An engineer sweeten the filter. An artist cuts a morning. A scientist names the water. They walk in once.</p><p><b>What to do about it:</b> be on the aisle. Life will name the walk. The gold line will too.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 1.1) lastTick = now();
    } catch (e) {}
  }

  function edge() {
    var gs_ = state();
    return gs_.seen && gs_.day === shopDay() ? 0.06 : 0;
  }

  window.great = {
    whisper: whisper,
    line: line,
    of: state,
    edge: edge,
    seed: function () {
      var rec = { kind: "collector", phase: "look", line: "", name: "" };
      var st = { phase: "look", bought: false };
      arrive(rec, st, true);
      return state();
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 240);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 240);
    }, 220);
})();
