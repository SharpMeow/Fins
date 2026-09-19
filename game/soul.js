/* soul.js — people have inner lives.
   The tanks already remember. The street did not. Dwarf Fortress does
   not spawn a miner who likes steel. It has Urist, who saw a death,
   hardened, and still will not sit by that dwarf. Walk-ins now keep
   a like, a hate, a short memory, a thing they dwell on. Wet boards
   are not a modifier. They are why this person walked. No second HUD.
   Odds, speech, the till, a family that noticed a morning. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastGold = "";
  var lastGoldAt = 0;
  var lastBecause = 0;
  var didBrowse = false;
  var didChoir = false;

  var LIKES = [
    "named lines",
    "the quiet tank",
    "the key in the window",
    "a dry aisle",
    "a pair on the rack",
    "the baker's goldfish",
  ];
  var HATES = [
    "the wet boards",
    "a sick bag",
    "something risen",
    "a sloppy knot",
    "an empty plate",
    "a loud choir",
  ];

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

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
    } catch (e) {}
    return "shop";
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

  function pick(arr, h) {
    if (!arr || !arr.length) return "";
    return arr[(h >>> 0) % arr.length];
  }

  function because(text) {
    if (!text) return;
    try {
      if (window.weave && weave.because) weave.because(text);
    } catch (e) {}
    try {
      if (window.desk && desk.think) desk.think("soul", text);
    } catch (e2) {}
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

  function folk() {
    try {
      if (window.kin && kin.folk) return kin.folk() || [];
    } catch (e) {}
    return [];
  }

  function soulOf(fig) {
    if (!fig) return null;
    if (fig.soul && fig.soul.like) return fig.soul;
    var h = hash32("soul:" + (fig.id || "") + ":" + (fig.n || ""));
    fig.soul = {
      brave: (h & 255) / 255,
      tender: ((h >>> 8) & 255) / 255,
      proud: ((h >>> 16) & 255) / 255,
      like: pick(LIKES, h),
      hate: pick(HATES, h >>> 5),
      short: [],
      dwell: "",
    };
    return fig.soul;
  }

  function file(fig, kind, text) {
    var so = soulOf(fig);
    if (!so || !text) return;
    if (so.short.length && so.short[so.short.length - 1].s === text) return;
    so.short.push({ k: kind || "", s: String(text), y: year(), at: now() });
    if (so.short.length > 8) so.short.shift();
    if (kind === "death" || kind === "pinch" || kind === "ill") {
      so.tender = Math.max(0, (so.tender || 0.5) - 0.06);
      so.brave = Math.min(1, (so.brave || 0.5) + 0.04);
      so.dwell = text;
    } else if (kind === "gift" || kind === "plate" || kind === "bag") {
      so.tender = Math.min(1, (so.tender || 0.5) + 0.04);
      if (!so.dwell) so.dwell = text;
    }
  }

  function seedSouls() {
    var all = folk();
    for (var i = 0; i < all.length; i++) if (all[i] && !all[i].dead) soulOf(all[i]);
  }

  function watchBecause() {
    try {
      if (!window.weave || !weave.of) return;
      var bec = weave.of().because || [];
      if (bec.length <= lastBecause) {
        if (!lastBecause) lastBecause = bec.length;
        return;
      }
      var rec = bec[bec.length - 1];
      lastBecause = bec.length;
      if (!rec || !rec.s) return;
      var kind = "note";
      if (/died|dead|plate/.test(rec.s)) kind = "death";
      else if (/took |stole|pinch/.test(rec.s)) kind = "pinch";
      else if (/white-spot|gold-dust|fin-rot|the still|salt-itch/.test(rec.s)) kind = "ill";
      else if (/bag|took a bag|made it right/.test(rec.s)) kind = "bag";
      var all = folk();
      for (var i = 0; i < all.length; i++) {
        if (!all[i] || all[i].dead) continue;
        if (all[i].known || all[i].id === "mae" || kind === "death" || kind === "pinch") {
          file(all[i], kind, rec.s);
        }
      }
    } catch (e) {}
  }

  function aisleWet() {
    try {
      if (window.shopSite && shopSite.wet) return shopSite.wet() > 0.36;
    } catch (e) {}
    return false;
  }

  function tankIll() {
    try {
      if (window.ill && ill.of) return (ill.of().tank || 0) > 0.2;
    } catch (e) {}
    return false;
  }

  function relicN() {
    try {
      if (window.relic && relic.of) {
        var a = relic.of();
        return a && a.n ? a.n : "";
      }
    } catch (e) {}
    return "";
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
        var fig = null;
        try {
          if (window.kin && kin.of && rec.name) fig = kin.of(rec.name);
        } catch (e) {}
        if (!fig || fig.dead) return rec;
        var so = soulOf(fig);
        var keep = !!(st && (st._lateMae || st._goingHold || st._lateKid));
        if (rec.phase === "look" && st && !st._soulSaid && !keep) {
          st._soulSaid = 1;
          var wet = aisleWet();
          var illn = tankIll();
          var key = relicN();
          var line = "";
          if (so.hate === "the wet boards" && wet) {
            line = "I'm not standing in that. I said so last time.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            file(fig, "note", "turned around. the boards were wet");
            because(fig.n.split(" ")[0] + " will not stand in the wet. They said so.");
            try {
              if (window.kin && kin.hurt) kin.hurt(fig.n, 0.03, "hates the wet");
            } catch (eH) {}
          } else if (so.hate === "a sick bag" && illn) {
            line = "That tank is off. I can see it.";
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            file(fig, "ill", "saw the still in the glass");
          } else if (so.hate === "something risen") {
            try {
              var list = typeof allFish === "function" ? allFish() || [] : [];
              for (var r = 0; r < list.length; r++) {
                if (list[r] && (list[r].risen || list[r]._risen)) {
                  line = "That one came back. I'm not bagging it.";
                  rec.phase = "leave";
                  st.phase = "leave";
                  st.bought = false;
                  break;
                }
              }
            } catch (eR) {}
          } else if (so.hate === "an empty plate") {
            try {
              if (window.mark && mark.line && /no plate/.test(mark.line() || "")) {
                var ml = mark.line() || "";
                var whoP = ml.split(" ")[0] || "Someone";
                line = whoP + " still has no plate. I can hear it.";
              }
            } catch (eM) {}
          } else if (so.like === "the key in the window" && key) {
            line = "That's " + key + ". I came for that, not a bag.";
            st.until = Math.max(st.until || 0, now() + 5);
          } else if (so.like === "named lines" && rec.kind === "collector") {
            line = rec.line;
          } else if (so.dwell && so.tender < 0.35) {
            line = "I keep thinking about it. " + so.dwell.replace(/^Year\s+\d+\.\s*/, "");
          } else if (so.short.length && fig.known) {
            var last = so.short[so.short.length - 1];
            if (last && last.k === "bag") line = "The last one is still in the window. You bagged it right.";
          }
          if (line) {
            var had = rec.line || "";
            var clobber = rec.phase === "leave" || !had || /I'm |Just looking|The usual|Can we get/.test(had);
            if (clobber) {
              rec.line = line;
              st.line = line;
              st.lineUntil = now() + 3.8;
            }
          }
          file(fig, "note", wet ? "the aisle was wet" : "looked");
        }
        if (rec.phase === "pay" && st && !st._soulPay && fig) {
          st._soulPay = 1;
          file(fig, "bag", "took a bag");
          if (so.like === "a dry aisle" && aisleWet()) {
            rec.phase = "leave";
            st.phase = "leave";
            st.bought = false;
            rec.line = "Not with the floor like that.";
            st.line = rec.line;
          }
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
        var all = folk();
        var hard = 0;
        for (var i = 0; i < all.length; i++) {
          if (all[i] && all[i].soul && all[i].soul.tender < 0.28 && all[i].known) hard++;
        }
        if (hard) {
          w.sour = Math.min(1, (w.sour || 0) + Math.min(0.12, hard * 0.04));
          if (!w.line) w.line = "A family is still on that morning.";
        }
      } catch (e) {}
      return w;
    };
  }

  function whisper() {
    if (lastGold && now() - lastGoldAt < 12) return lastGold;
    return "";
  }

  function line() {
    var all = folk();
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.dead) continue;
      var so = soulOf(f);
      if (so.dwell) {
        return f.n.split(" ")[0] + " still dwells on it. Likes " + so.like + ". Hates " + so.hate + ".";
      }
    }
    for (var j = 0; j < all.length; j++) {
      if (all[j] && !all[j].dead && all[j].id === "mae") {
        var sm = soulOf(all[j]);
        return "Mae likes " + sm.like + ". Hates " + sm.hate + ".";
      }
    }
    return whisper();
  }

  function seedWiki() {
    try {
      var wiki = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!wiki || !wiki.push) return;
      if (wiki.some(function (a) {
        return a && a.id === "k_soul";
      }))
        return;
      wiki.push({
        id: "k_soul",
        sec: "You and your people",
        t: "People have inner lives",
        tags: "soul memory like hate dwell person urist dwarf kin",
        w: "<p>The tanks already remember. The street did not. A walk-in has a like, a hate, a short memory, a morning they dwell on. Mae hates the wet, or she likes the key. A person who saw a death hardens. They will not bag from a tank that is off. They will not stand in the puddle they already named. That is not a modifier. That is why they walked.</p><p><b>What to do about it:</b> read Life. The same name comes back with the last morning in their mouth. Keep the aisle dry for the ones who said so.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      wrapChoir();
      seedWiki();
      if (sceneName() === "title") return;
      seedSouls();
      if (now() - lastTick > 0.9) {
        lastTick = now();
        watchBecause();
      }
    } catch (e) {}
  }

  window.soul = {
    whisper: whisper,
    line: line,
    of: function (n) {
      try {
        var f = window.kin && kin.of ? kin.of(n) : null;
        return f ? soulOf(f) : null;
      } catch (e) {
        return null;
      }
    },
  };

  if (window.__onBeat) window.__onBeat(tick, 250);
  else
    setTimeout(function loop() {
      tick();
      setTimeout(loop, 250);
    }, 210);
})();
