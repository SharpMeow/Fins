/* weave.js — the edges between systems.
   This caused that. Pedigree, rumor, the atlas year, the till, the dead, the window. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastSales = -1;
  var lastDead = 0;
  var lastArts = 0;
  var lastRaised = 0;
  var lastMissKey = "";
  var wired = false;
  var didBrowse = false;
  var nextLine = "";
  var nextUntil = 0;

  function now() {
    return typeof performance !== "undefined" ? performance.now() / 1000 : Date.now() / 1000;
  }

  function year() {
    try {
      if (window.saga && typeof saga.year === "function") return saga.year();
    } catch (e) {}
    return 1000;
  }

  function gs() {
    try {
      if (typeof gameState === "function") return gameState();
      if (typeof gameState === "object" && gameState) return gameState;
    } catch (e) {}
    return null;
  }

  function state() {
    var g = gs();
    if (g && g.weave && Array.isArray(g.weave.rumors)) return g.weave;
    var w = {
      rumors: [],
      because: [],
      craft: 0.35,
      word: 0,
      lastAtlas: "",
    };
    try {
      if (g) g.weave = w;
    } catch (e) {}
    return w;
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n;
  }

  function think(text) {
    try {
      if (window.desk && typeof desk.think === "function") desk.think("weave", text);
    } catch (e) {}
  }

  function write(kind, text) {
    try {
      if (typeof chronicle === "function") {
        var line = String(text || "");
        if (line && !/^Year\s+\d/.test(line)) line = "Year " + year() + ". " + line;
        chronicle(kind, line, []);
      }
    } catch (e) {}
  }

  function because(text) {
    if (!text) return;
    var w = state();
    if (w.because.length && w.because[w.because.length - 1].s === text) return;
    w.because.push({ s: text, y: year(), at: now() });
    if (w.because.length > 12) w.because.shift();
  }

  function rumor(kind, text, heat) {
    if (!text) return;
    var w = state();
    for (var i = 0; i < w.rumors.length; i++) {
      if (w.rumors[i].s === text) {
        w.rumors[i].heat = Math.min(3, w.rumors[i].heat + (heat || 1) * 0.4);
        w.rumors[i].at = now();
        return;
      }
    }
    w.rumors.push({ k: kind || "", s: String(text), heat: heat || 1, y: year(), at: now() });
    if (w.rumors.length > 14) w.rumors.shift();
  }

  function hottest() {
    var w = state();
    var best = null;
    for (var i = 0; i < w.rumors.length; i++) {
      if (!best || w.rumors[i].heat > best.heat) best = w.rumors[i];
    }
    return best && best.heat > 0.35 ? best : null;
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function ped(f) {
    try {
      if (f && f.fid && typeof pedOf === "function") return pedOf(f.fid);
    } catch (e) {}
    return null;
  }

  function bloodline(f) {
    var rec = ped(f);
    if (!rec) return null;
    var mom = null,
      dad = null;
    try {
      if (rec.mom && typeof pedOf === "function") mom = pedOf(rec.mom);
      if (rec.dad && typeof pedOf === "function") dad = pedOf(rec.dad);
    } catch (e) {}
    var of = (mom && (mom.nick || mom.vname)) || (dad && (dad.nick || dad.vname)) || "";
    var deeds = rec.deeds && rec.deeds.length ? rec.deeds.length : 0;
    return {
      nick: rec.nick || (f && f.nick) || "",
      of: of,
      deeds: deeds,
      born: rec.born || rec.bornT || 0,
      fate: rec.fate || null,
    };
  }

  function namedBlood() {
    var list = fishList();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var b = bloodline(list[i]);
      if (b && (b.of || b.deeds > 1) && list[i].nick) out.push({ f: list[i], b: b });
    }
    return out;
  }

  function atlasLine() {
    try {
      var a = typeof atlGen === "function" ? atlGen() : typeof civAtlas === "function" ? civAtlas() : null;
      if (!a || !a.e || !a.e.length) return "";
      var ev = a.e[a.e.length - 1];
      if (typeof atlLine === "function") return String(atlLine(a, ev) || "");
      if (ev && ev.s) return String(ev.s);
    } catch (e) {}
    return "";
  }

  function book() {
    try {
      if (window.saga && typeof saga.book === "function") return saga.book();
    } catch (e) {}
    return { dead: [], arts: [], occ: {} };
  }

  function bumpWord(n) {
    try {
      if (typeof townState === "function") {
        var t = townState();
        if (t && typeof t.word === "number") t.word = Math.max(-3, Math.min(3, (t.word || 0) + n));
      }
    } catch (e) {}
    var w = state();
    w.word = clamp01((w.word || 0) + n);
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
        var hot = hottest();
        var blood = namedBlood();
        var w = state();
        if (hot && hot.k === "risen" && rec.phase === "look" && Math.random() < Math.min(0.45, hot.heat * 0.25)) {
          rec.line = ["I'm not buying anything that came back.", "The water smells like a church.", "That tank."][idx % 3];
          rec.kind = rec.kind || "collector";
        } else if (hot && hot.k === "clog" && rec.phase === "look" && Math.random() < 0.3) {
          rec.line = "I heard the water was off.";
        } else if (blood.length && (rec.kind === "collector" || (st && st.kind === "collector") || Math.random() < 0.12 + w.craft * 0.1)) {
          var pick = blood[idx % blood.length];
          if (pick && rec.phase === "look") {
            rec.line = pick.b.of
              ? "Is that one of " + pick.b.of + "'s?"
              : "The " + (pick.f.nick || "named one") + ". I know the line.";
            rec.kind = "collector";
            if (st) st.kind = "collector";
          }
          if (pick && rec.phase === "pay") {
            rec.line = pick.b.of ? "Of " + pick.b.of + ". I'll take it." : "The named one. Wrap it.";
          }
        } else if (hot && hot.k === "art" && rec.phase === "look" && Math.random() < 0.28) {
          rec.line = "What's in the window.";
        }
        if (rec.phase === "leave" && st && !st.bought && st.want && !st.coming && !st._weaveMiss) {
          st._weaveMiss = 1;
          because(
            (rec.name || "Someone") +
              " walked because " +
              (st.haveWant
                ? window.shopSite && shopSite.wet() > 0.36
                  ? "the aisle was wet"
                  : "they would not pay"
                : "we had no pair of " + st.want)
          );
        }
      } catch (e) {}
      return rec;
    };
    wired = true;
  }

  function watchWorld() {
    var w = state();
    var line = atlasLine();
    if (line && line !== w.lastAtlas) {
      w.lastAtlas = line;
      var loud = /war|plague|fished out|closed|extinct|made |embargo|listing/i.test(line) && !/was born of/i.test(line);
      if (loud) {
        rumor("atlas", line, 1.1);
        because("The harbor still carries it: " + line.replace(/^Year\s+\d+\.\s*/, ""));
        nextLine = /war/i.test(line) ? "War on the water. Stock will go dear." : "The year in the atlas is not quiet.";
        nextUntil = now() + 18;
        if (/war|embargo|plague|fished out/i.test(line)) bumpWord(-0.14);
      }
    }
    var b = book();
    var deadN = (b.dead && b.dead.length) || 0;
    if (deadN > lastDead) {
      var d = b.dead[b.dead.length - 1];
      lastDead = deadN;
      if (d && d.n) {
        rumor("death", d.n + " is gone", 1.1);
        because(d.n + " died" + (d.how ? " (" + d.how + ")" : "") + ", and the tankmates will dwell on it.");
        bumpWord(-0.08);
      }
    } else lastDead = deadN;
    var arts = (b.arts && b.arts.length) || 0;
    if (arts > lastArts) {
      var art = b.arts[b.arts.length - 1];
      lastArts = arts;
      if (art && art.n) {
        rumor("art", art.n + " is in the shop", 1.3);
        because(art.n + " was made, so collectors started asking what was in the window.");
        bumpWord(0.12);
        nextLine = "Something new in the window.";
        nextUntil = now() + 20;
      }
    } else lastArts = arts;
    var raised = (b.occ && b.occ.raised) || 0;
    if (raised > lastRaised) {
      lastRaised = raised;
      rumor("risen", "something came back from the pages", 2.2);
      because("A name was read aloud. The street heard, even if they did not see the splash.");
      bumpWord(0.35);
      nextLine = "The street is crossing itself.";
      nextUntil = now() + 24;
    } else lastRaised = raised;
  }

  function watchTill() {
    var w = state();
    try {
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      if (day && lastSales >= 0 && day.sales > lastSales) {
        var n = day.sales - lastSales;
        w.craft = clamp01(w.craft + 0.012 * n);
        if (n && w.craft > 0.7) because("The fish bags are coming easier. That is craft, not luck.");
      }
      if (day) lastSales = day.sales;
      var miss = shopLife.misses ? shopLife.misses() : [];
      if (miss && miss.length) {
        var ms = miss[miss.length - 1];
        var key = (ms.name || "") + "|" + (ms.want || "") + "|" + (ms.y || "");
        if (key !== lastMissKey) {
          lastMissKey = key;
          w.craft = clamp01(w.craft - 0.02);
          if (ms.why === "stock") rumor("stock", "no " + (ms.want || "fish") + " on Salem", 0.9);
          if (ms.why === "clog") rumor("clog", "the water was off", 1.2);
        }
      }
    } catch (e) {}
    try {
      if (window.clogged) rumor("clog", "the filter is packing", 0.7);
    } catch (e2) {}
  }

  function tickRumors() {
    var w = state();
    for (var i = w.rumors.length - 1; i >= 0; i--) {
      w.rumors[i].heat *= 0.992;
      if (w.rumors[i].heat < 0.12) w.rumors.splice(i, 1);
    }
  }

  function next() {
    if (nextLine && now() < nextUntil) return nextLine;
    var hot = hottest();
    if (hot && hot.heat > 0.8) return "The street is saying: " + hot.s + ".";
    var blood = namedBlood();
    if (blood.length && Math.random() < 0.4) {
      var p = blood[0];
      return p.b.of ? p.b.nick + " is of " + p.b.of + "." : p.b.nick + " has a line.";
    }
    var w = state();
    if (w.craft > 0.65 && Math.random() < 0.3) return "The fish bags are coming easier.";
    return "";
  }

  function esc(s) {
    var map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return map[c];
    });
  }

  function enhanceLife() {
    try {
      var body = document.getElementById("dbody");
      if (!body) return;
      var old = body.querySelector("weave-life");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  function enhanceChron() {
    var body = document.getElementById("dbody");
    var title = document.getElementById("dtitle");
    if (!body || !title) return;
    if (!/chronicle/i.test(title.textContent || "")) return;
    var w = state();
    if (!w.because.length) return;
    var html = '<div class="sec">Cause</div>';
    var bec = w.because.slice(-5).reverse();
    for (var i = 0; i < bec.length; i++) {
      html +=
        '<div class="row"><div></div><div><div class="d">' + esc(bec[i].s) + "</div></div><div></div></div>";
    }
    var wrap = body.querySelector(".weave-chron");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "weave-chron";
      body.insertBefore(wrap, body.firstChild);
    }
    if (wrap.getAttribute("data-h") !== String(html.length)) {
      wrap.innerHTML = html;
      wrap.setAttribute("data-h", String(html.length));
    }
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      var extra = [
        {
          id: "k_because",
          sec: "The chronicle",
          t: "Because",
          tags: "because cause weave rumor pedigree bloodline atlas depth",
          w: "<p>This person hates that person because they saw a death, so they started a fight, so a fish bag went wrong. The shop keeps that kind of sentence.</p><p>A collector asks if that tetra is of Idel because the pedigree says so. Someone walks because there is no pair. The street says the water is off because the filter packed. A name read aloud in the back room becomes a rumor with heat, and the heat changes who comes in the door. <b>What to do about it:</b> Life, Because. Chronicle, Cause. The gold line will sometimes carry the loudest rumor.</p>",
        },
        {
          id: "k_blood",
          sec: "The animals",
          t: "Blood",
          tags: "pedigree bloodline collector named mother father deeds lineage",
          w: "<p>A named fish with a mother is not the same as a named fish. Collectors can tell. They will ask for the line. Deeds on the pedigree — a fight, a year turning, a return from the pages — are why one tetra is worth a conversation and the other is stock.</p><p><b>What to do about it:</b> do not sell the last of a line. Life, Blood. If they ask “is that one of Idel’s?”, that is the atlas talking through a person.</p>",
        },
      ];
      for (var i = 0; i < extra.length; i++) {
        var hit = false;
        for (var j = 0; j < w.length; j++) if (w[j] && w[j].id === extra[i].id) hit = true;
        if (!hit) w.push(extra[i]);
      }
    } catch (e) {}
  }

  function tick() {
    try {
      wrapBrowse();
      seedWiki();
      if (now() - lastTick > 1.0) {
        lastTick = now();
        watchWorld();
        watchTill();
        tickRumors();
      }
      if (now() - lastUi > 0.8) {
        lastUi = now();
        enhanceLife();
        enhanceChron();
      }
    } catch (e) {}
  }
window.weave = {
    next: next,
    because: because,
    rumor: rumor,
    of: state,
    blood: namedBlood,
    bumpWord: bumpWord,
  };


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
