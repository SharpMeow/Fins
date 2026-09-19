/* hook.js — the reason you don't close the tab.
   Always one unfinished thing. Variable juice on the till. A run you can break. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastUi = 0;
  var lastSales = -1;
  var lastMissKey = "";
  var whisperAt = 0;
  var shown = "";
  var comboUntil = 0;
  var tillReady = false;
  var sawTill = 0;
  var booted = false;

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

  function callName(n) {
    var p = String(n || "Someone").split(/\s+/);
    if (!p[0]) return "Someone";
    if (/^(the|a|an)$/i.test(p[0])) return p.slice(0, 2).join(" ");
    if (/^(mrs|mr|ms)\.?$/i.test(p[0])) return p.slice(0, Math.min(2, p.length)).join(" ");
    return p[0];
  }

  function hour() {
    try {
      if (typeof gameState === "object" && gameState && isFinite(gameState.t))
        return (((gameState.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    return 12;
  }

  function scene() {
    try {
      if (typeof sceneNow === "function") return sceneNow() || "";
      if (typeof gameState === "object" && gameState && gameState.scene) return String(gameState.scene);
    } catch (e) {}
    return "";
  }

  function hook() {
    var g = gs();
    if (g && g.hook && typeof g.hook.combo === "number") {
      if (!booted) {
        booted = true;
        g.hook.combo = 0;
      }
      return g.hook;
    }
    var h = {
      combo: 0,
      best: 0,
      days: 0,
      lastOpenDay: -1,
      bags: 0,
      alive: 0,
    };
    try {
      if (g) g.hook = h;
    } catch (e) {}
    return h;
  }

  function play(name) {
    try {
      if (window.feel && typeof feel.play === "function") feel.play(name);
      else if (window.I && typeof I[name] === "function") I[name]();
    } catch (e) {}
  }

  function say(msg, kind) {
    try {
      if (typeof k === "function") k(msg, kind || "gold");
      else if (typeof toast === "function") toast(msg, kind || "gold");
    } catch (e) {}
  }

  function markEgg(id, line) {
    try {
      if (typeof findEgg === "function") findEgg(id, line);
    } catch (e) {}
  }

  function think(text) {
    try {
      if (window.desk && typeof desk.think === "function") desk.think("run", text);
    } catch (e) {}
  }

  function fishList() {
    try {
      if (typeof allFish === "function") return allFish() || [];
    } catch (e) {}
    return [];
  }

  function stockDupes() {
    var list = fishList();
    var counts = Object.create(null);
    var names = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (!f) continue;
      var k = String(f.sp);
      counts[k] = (counts[k] || 0) + 1;
      try {
        var S = typeof SPECIES === "function" ? SPECIES() : typeof SPECIES !== "undefined" ? SPECIES : typeof O !== "undefined" ? O : null;
        var rec = S && (S[f.sp] || S[k]);
        names[k] = rec ? rec.gname || rec.name || rec.vname || rec.n || k : k;
      } catch (e) {
        names[k] = k;
      }
    }
    return { counts: counts, names: names };
  }

  function pickImminent() {
    var t = now();
    var h = hook();
    var sc = scene();
    var list = fishList();
    var crowd = window.__shopCrowd || [];
    var looking = 0,
      paying = 0;
    for (var i = 0; i < crowd.length; i++) {
      if (!crowd[i]) continue;
      if (crowd[i].looking) looking++;
      if (crowd[i].pay) paying++;
    }

    if (paying) return "They're waiting on a bag.";
    if (h.combo >= 2 && t < comboUntil) {
      if (h.combo >= 5) return h.combo + " bags. Don't miss.";
      return h.combo + " in a row. The till is a run.";
    }

    try {
      if (window.desk && typeof desk.coming === "function") {
        var c0 = desk.coming();
        if (c0 && c0.done && c0.arrived && now() - c0.arrived < 22) {
          if (c0.had) return callName(c0.name) + " took the " + c0.want + ".";
          return callName(c0.name) + " walked. No " + c0.want + ".";
        }
      }
    } catch (eC) {}
    try {
      if (window.late && typeof late.whisper === "function") {
        var lw = late.whisper();
        if (lw) return lw;
      }
    } catch (eLa) {}
    try {
      if (window.pane && typeof pane.whisper === "function") {
        var pw = pane.whisper();
        if (pw) return pw;
      }
    } catch (ePa) {}
    try {
      if (window.pinch && typeof pinch.whisper === "function") {
        var ph = pinch.whisper();
        if (ph) return ph;
      }
    } catch (ePi) {}
    try {
      if (window.spiral && typeof spiral.whisper === "function") {
        var spw = spiral.whisper();
        if (spw) return spw;
      }
    } catch (eSp) {}
    try {
      if (window.row && typeof row.whisper === "function") {
        var rw2 = row.whisper();
        if (rw2) return rw2;
      }
    } catch (eRo) {}
    try {
      if (window.siege && typeof siege.whisper === "function") {
        var sgw = siege.whisper();
        if (sgw) return sgw;
      }
    } catch (eSg) {}
    try {
      if (window.great && typeof great.whisper === "function") {
        var grw = great.whisper();
        if (grw) return grw;
      }
    } catch (eGr) {}
    try {
      if (window.envoy && typeof envoy.whisper === "function") {
        var evw = envoy.whisper();
        if (evw) return evw;
      }
    } catch (eEv) {}
    try {
      if (window.wed && typeof wed.whisper === "function") {
        var wdw2 = wed.whisper();
        if (wdw2) return wdw2;
      }
    } catch (eWd2) {}
    try {
      if (window.plot && typeof plot.whisper === "function") {
        var plw = plot.whisper();
        if (plw) return plw;
      }
    } catch (ePl) {}
    try {
      if (window.hush && typeof hush.whisper === "function") {
        var hsw = hush.whisper();
        if (hsw) return hsw;
      }
    } catch (eHs) {}
    try {
      if (window.claim && typeof claim.whisper === "function") {
        var clw = claim.whisper();
        if (clw) return clw;
      }
    } catch (eCl) {}
    try {
      if (window.feast && typeof feast.whisper === "function") {
        var few = feast.whisper();
        if (few) return few;
      }
    } catch (eFe) {}
    try {
      if (window.house && typeof house.whisper === "function") {
        var houw = house.whisper();
        if (houw) return houw;
      }
    } catch (eHu) {}
    try {
      if (window.heir && typeof heir.whisper === "function") {
        var hrw = heir.whisper();
        if (hrw) return hrw;
      }
    } catch (eHr) {}
    try {
      if (window.gyve && typeof gyve.whisper === "function") {
        var gyw = gyve.whisper();
        if (gyw) return gyw;
      }
    } catch (eGy) {}
    try {
      if (window.fray && typeof fray.whisper === "function") {
        var frw = fray.whisper();
        if (frw) return frw;
      }
    } catch (eFr) {}
    try {
      if (window.going && typeof going.whisper === "function") {
        var gw = going.whisper();
        if (gw) return gw;
      }
    } catch (eGo) {}
    try {
      if (window.desk && typeof desk.coming === "function") {
        var c = desk.coming();
        if (c && !c.done && hour() < c.hour) {
          var have = window.shopLife && shopLife.stock ? shopLife.stock() : [];
          if (have && have.indexOf(c.want) >= 0) return "We have the " + c.want + ". " + callName(c.name) + " is coming.";
          return callName(c.name) + " is coming, for " + c.want + ".";
        }
      }
    } catch (eC2) {}
    try {
      if (window.wane && typeof wane.whisper === "function") {
        var ww = wane.whisper();
        if (ww) return ww;
      }
    } catch (eWa) {}
    try {
      if (window.mask && typeof mask.whisper === "function") {
        var maw = mask.whisper();
        if (maw) return maw;
      }
    } catch (eMa) {}
    try {
      if (window.stray && typeof stray.whisper === "function") {
        var stw = stray.whisper();
        if (stw) return stw;
      }
    } catch (eSt) {}
    try {
      if (window.blood && typeof blood.whisper === "function") {
        var bw = blood.whisper();
        if (bw) return bw;
      }
    } catch (eBl) {}
    try {
      if (window.ill && typeof ill.whisper === "function") {
        var iw = ill.whisper();
        if (iw) return iw;
      }
    } catch (eIl) {}
    try {
      if (window.relic && typeof relic.whisper === "function") {
        var rw = relic.whisper();
        if (rw) return rw;
      }
    } catch (eRe) {}
    try {
      if (window.kin && typeof kin.whisper === "function") {
        var kw = kin.whisper();
        if (kw) return kw;
      }
    } catch (eKi) {}
    try {
      if (window.mark && typeof mark.whisper === "function") {
        var mw = mark.whisper();
        if (mw) return mw;
      }
    } catch (eMk) {}
    try {
      if (window.soul && typeof soul.whisper === "function") {
        var sws = soul.whisper();
        if (sws) return sws;
      }
    } catch (eSo) {}
    try {
      if (window.hand && typeof hand.whisper === "function") {
        var hw = hand.whisper();
        if (hw) return hw;
      }
    } catch (eHa) {}
    try {
      if (window.cut && typeof cut.whisper === "function") {
        var cw2 = cut.whisper();
        if (cw2) return cw2;
      }
    } catch (eCu) {}
    try {
      if (window.age && typeof age.whisper === "function") {
        var agw = age.whisper();
        if (agw) return agw;
      }
    } catch (eAg) {}
    try {
      if (window.hold && typeof hold.whisper === "function") {
        var how = hold.whisper();
        if (how) return how;
      }
    } catch (eHo) {}
    try {
      if (window.lord && typeof lord.whisper === "function") {
        var ldw = lord.whisper();
        if (ldw) return ldw;
      }
    } catch (eLd) {}
    try {
      if (window.wonder && typeof wonder.whisper === "function") {
        var wdw = wonder.whisper();
        if (wdw) return wdw;
      }
    } catch (eWd) {}
    try {
      if (window.vow && typeof vow.whisper === "function") {
        var vww = vow.whisper();
        if (vww) return vww;
      }
    } catch (eVw) {}
    try {
      if (window.pact && typeof pact.whisper === "function") {
        var pcw = pact.whisper();
        if (pcw) return pcw;
      }
    } catch (ePc) {}
    try {
      if (window.lux && typeof lux.whisper === "function") {
        var lxw = lux.whisper();
        if (lxw) return lxw;
      }
    } catch (eLx) {}
    try {
      if (window.spy && typeof spy.whisper === "function") {
        var spyw = spy.whisper();
        if (spyw) return spyw;
      }
    } catch (eSy) {}
    try {
      if (window.seat && typeof seat.whisper === "function") {
        var stw2 = seat.whisper();
        if (stw2) return stw2;
      }
    } catch (eSe) {}
    try {
      if (window.bent && typeof bent.whisper === "function") {
        var bnw = bent.whisper();
        if (bnw) return bnw;
      }
    } catch (eBn) {}
    try {
      if (window.bond && typeof bond.whisper === "function") {
        var bdw = bond.whisper();
        if (bdw) return bdw;
      }
    } catch (eBd) {}
    try {
      if (window.ward && typeof ward.whisper === "function") {
        var waw = ward.whisper();
        if (waw) return waw;
      }
    } catch (eWa2) {}
    try {
      if (window.fief && typeof fief.whisper === "function") {
        var fiw = fief.whisper();
        if (fiw) return fiw;
      }
    } catch (eFi) {}
    try {
      if (window.sill && typeof sill.whisper === "function") {
        var sw = sill.whisper();
        if (sw) return sw;
      }
    } catch (eSi) {}
    try {
      if (window.shopSite && shopSite.wet() > 0.36) return "The aisle is wet. They're turning around.";
    } catch (eW2) {}
    try {
      if (window.choir && typeof choir.whisper === "function") {
        var cw = choir.whisper();
        if (cw) return cw;
      }
    } catch (eCh) {}
    try {
      if (window.weave && typeof weave.next === "function") {
        var wn = weave.next();
        if (wn) return wn;
      }
    } catch (e0) {}

    var moodName = "";
    try {
      for (var m = 0; m < list.length; m++) {
        var f = list[m];
        if (f && f.mind && f.mind.mood) {
          moodName = f.nick || "A fish";
          break;
        }
      }
    } catch (e) {}
    if (moodName) return moodName + " is in a mood. Don't sell them yet.";

    var fry = 0;
    for (var j = 0; j < list.length; j++) {
      if (list[j] && list[j].stage != null && list[j].stage < 2) fry++;
    }
    if (fry) return fry === 1 ? "Something is still small in the water." : fry + " still small. Wait.";

    var stock = stockDupes();
    var almost = "";
    var kinds = 0;
    for (var k in stock.counts) {
      kinds++;
      if (stock.counts[k] === 1 && !almost) {
        var nm = String(stock.names[k] || "fish").toLowerCase();
        almost = "One " + nm + ". A unique fish is a display.";
      }
    }
    if (almost && Math.random() < 0.55) return almost;

    if (looking && sc !== "shop") return "Someone is at the glass.";
    if (looking && sc === "shop") return looking === 1 ? "They're still looking." : looking + " at the glass.";

    var hr = hour();
    if (hr > 11.4 && hr < 13.8) return "Lunch. They have twelve minutes.";
    if (hr >= 18.5 && looking) return "Last hour. They're still looking.";
    if (hr >= 19 && h.combo >= 2) return "The run is still on. Sign isn't over.";

    try {
      if (window.shopSite && shopSite.wet() > 0.28) return "The aisle is wet. They're stepping around it.";
    } catch (eW) {}

    try {
      if (window.desk && typeof desk.neighbor === "function") {
        var nb = desk.neighbor();
        if (nb && nb.nextD === 0 && hour() < 16.9)
          return (nb.known ? nb.name : "The baker") + " is coming, for " + (nb.want || "goldfish") + ".";
      }
    } catch (eN) {}

    try {
      var regs = window.shopLife && shopLife.regulars ? shopLife.regulars() : [];
      if (regs && regs[0] && regs[0].name && Math.random() < 0.4)
        return regs[0].name + " usually comes after the boats.";
    } catch (e3) {}

    if (h.days >= 3 && hr < 9) return h.days + " mornings. Lights on.";
    if (h.best >= 5 && h.combo === 0 && Math.random() < 0.25) return "Best run was " + h.best + ". The till is quiet.";

    var named = 0;
    for (var n = 0; n < list.length; n++) if (list[n] && list[n].nick) named++;
    if (named && Math.random() < 0.35) {
      var pick = list[(Math.random() * list.length) | 0];
      if (pick && pick.nick) {
        try {
          if (window.mind && mind.dwell) {
            var dw = mind.dwell(pick);
            if (dw && dw.length < 72) return dw;
          }
        } catch (e4) {}
        return pick.nick + " is in the water.";
      }
    }

    if (kinds && kinds < 4) return kinds + " kinds in the water. The case wants more.";
    if (hr < 8) return "Morning. The street isn't in yet.";
    return "";
  }

  function ensureWhisper() {
    var el = document.getElementById("hookWhisper");
    if (el) return el;
    el = document.createElement("span");
    el.id = "hookWhisper";
    el.setAttribute("aria-live", "polite");
    var hud = document.getElementById("hudres");
    if (hud) hud.appendChild(el);
    else document.body.appendChild(el);
    return el;
  }

  function setWhisper(text, force) {
    var el = ensureWhisper();
    if (!el) return;
    if (!text) {
      if (now() - whisperAt > 8) {
        el.textContent = "";
        el.classList.remove("on");
        shown = "";
      }
      return;
    }
    if (!force && text === shown && now() - whisperAt < 4) return;
    shown = text;
    whisperAt = now();
    el.textContent = text;
    el.classList.add("on");
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function onBag() {
    var h = hook();
    h.combo += 1;
    h.bags += 1;
    try {
      window.__bagsThisOpen = (window.__bagsThisOpen || 0) + 1;
    } catch (eB) {}
    try {
      if (window.feel) {
        if (feel.play) feel.play("paper");
        if (feel.punch) feel.punch(0.12);
      }
    } catch (eF) {}
    comboUntil = now() + 90;
    if (h.combo > h.best) {
      h.best = h.combo;
      if (h.best >= 3) {
        say(h.best + " bags. A run.", "gold");
        markEgg("bagrun", h.best + " bags without a miss.");
      }
    }
    if (h.combo === 3) {
      play("chime");
      think("Three bags. The till is a run.");
    } else if (h.combo === 5) {
      play("award");
      think("Five. Don't miss.");
    } else if (h.combo >= 2) play("coin");
    var extra = Math.random();
    if (extra < 0.08) {
      setWhisper("A perfect bag.", true);
      play("chime");
    } else {
      setWhisper(h.combo >= 2 ? h.combo + " in a row." : "Paper. Water. The bell.", true);
    }
  }

  function onMiss(ms) {
    var h = hook();
    if (h.combo >= 3) {
      var broke = "The run broke at " + h.combo + ".";
      think(broke);
      setWhisper(broke, true);
      play("warn");
    }
    h.combo = 0;
    if (ms && ms.why === "stock") setWhisper("They wanted a " + (ms.want || "fish") + ". We didn't have a pair.", true);
    if (ms && ms.why === "wet") setWhisper("They saw the wet boards and left.", true);
  }

  function watchTill() {
    try {
      if (!window.shopLife || !shopLife.day) return;
      var day = shopLife.day();
      if (!day) return;
      if (!tillReady) {
        if (!isFinite(day.sales)) return;
        if (!sawTill) sawTill = now();
        lastSales = day.sales;
        var miss0 = shopLife.misses ? shopLife.misses() : [];
        if (miss0 && miss0.length) {
          var m0 = miss0[miss0.length - 1];
          lastMissKey = (m0.name || "") + "|" + (m0.want || "") + "|" + (m0.y || "");
        }
        if (now() - sawTill < 1.6) return;
        tillReady = true;
        return;
      }
      if (day.sales === lastSales + 1) {
        if (now() - sawTill < 8) lastSales = day.sales;
        else onBag();
      }
      lastSales = day.sales;
      var miss = shopLife.misses ? shopLife.misses() : [];
      if (miss && miss.length) {
        var ms = miss[miss.length - 1];
        var key = (ms.name || "") + "|" + (ms.want || "") + "|" + (ms.y || "");
        if (key !== lastMissKey) {
          lastMissKey = key;
          onMiss(ms);
        }
      }
    } catch (e) {}
  }

  var lastDawn = -1;

  function watchDays() {
    var h = hook();
    var hr = hour();
    if (lastDawn < 0) {
      lastDawn = hr;
      if (!h.days) h.days = 1;
      return;
    }
    var dawn = (lastDawn > 20 && hr < 10) || (lastDawn < 8 && hr >= 8);
    lastDawn = hr;
    if (!dawn) return;
    h.days += 1;
    if (h.days === 3 || h.days === 7 || h.days === 30) {
      say(h.days + " mornings in a row.", "gold");
      markEgg("openchain", h.days + " mornings. Lights on.");
      setWhisper(h.days + " mornings. Lights on.", true);
    }
  }

  function juiceHud() {
    try {
      var coins = document.querySelector("#r-coins .v");
      if (coins && hook().combo >= 2) coins.classList.add("hook-hot");
      else if (coins) coins.classList.remove("hook-hot");
    } catch (e) {}
  }

  function enhanceLife() {
    try {
      var body = document.getElementById("dbody");
      if (!body) return;
      var old = body.querySelector("hook-life");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (e) {}
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : WIKI;
      if (!w || !w.push) return;
      var art = {
        id: "k_run",
        sec: "The shop floor",
        t: "The run",
        tags: "combo streak bags addictive one more till mornings whisper",
        w: "<p>The line in the top bar is the unfinished thing. A customer at the glass. A pair one away. A fish in a mood. A run of bags. This shop calls it the till.</p><p>Miss and the run breaks. Open in the morning and the mornings count. <b>What to do about it:</b> read the gold line. Do not tab out in the last hour if someone is still looking.</p>",
      };
      for (var i = 0; i < w.length; i++) if (w[i] && w[i].id === art.id) return;
      w.push(art);
    } catch (e) {}
  }

  function tick() {
    try {
      ensureWhisper();
      seedWiki();
      if (now() - lastTick > 0.7) {
        lastTick = now();
        watchTill();
        watchDays();
        juiceHud();
        if (now() - whisperAt > 5.5) setWhisper(pickImminent());
      }
      if (now() - lastUi > 0.8) {
        lastUi = now();
        enhanceLife();
      }
    } catch (e) {}
  }
window.hookRun = hook;


  if (window.__onBeat) window.__onBeat(tick, 280);
  else setTimeout(function loop() { tick(); setTimeout(loop, 280); }, 280);

})();
