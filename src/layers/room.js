/* room.js — four things that already existed, made to show up in play.
   A morning (pair, bag, wet aisle, baker). A continent that bites.
   The room you look at. The ear of a quiet shop versus a packed one.
   No second HUD. Odds, speech, a puddle, a cue. */
(function () {
  "use strict";

  var lastTick = 0;
  var lastSale = -1;
  var lastArrive = "";
  var lastClog = false;
  var lastWetCue = 0;
  var lastAtlas = "";
  var lastCrowd = 0;
  var overlay = null;
  var octx = null;
  var drops = [];
  var stillIds = Object.create(null);
  var didBrowse = false;
  var didFish = false;

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

  /* The engine's own clock (jt in fins.js, not exported): a day is 1200 ticks of t, or the
     computer's clock when the player picked real time. This used to read t % 2400, a day twice
     as long, so the light here drifted out of step with the sky fins.js draws and went dark at
     midday every other day. */
  function hour() {
    try {
      if (typeof jt === "function") return jt() * 24;
      var g = gs();
      if (g && g.clock === "real") {
        var d = new Date();
        return d.getHours() + d.getMinutes() / 60;
      }
      if (g && isFinite(g.t)) return ((((g.t / 1200) % 1) + 1) % 1) * 24;
    } catch (e) {}
    return 12;
  }

  function sceneName() {
    try {
      if (document.body.classList.contains("titling")) return "title";
      if (document.body.classList.contains("work")) return "work";
      if (typeof sceneNow === "function") return String(sceneNow() || "");
      if (window.G && window.G.scene) return String(window.G.scene);
    } catch (e) {}
    return "shop";
  }

  function play(name, x) {
    try {
      if (window.feel && feel.play) feel.play(name, x);
    } catch (e) {}
  }

  function rainAmt() {
    try {
      if (window.wxState && isFinite(wxState.rain)) return wxState.rain;
      if (typeof wxWord === "function" && /rain|storm|sleet/i.test(String(wxWord() || ""))) return 0.55;
    } catch (e) {}
    return 0;
  }

  function night() {
    var h = hour();
    return h < 6.2 || h >= 19.2;
  }

  function wet() {
    try {
      if (window.shopSite && shopSite.wet) return shopSite.wet();
    } catch (e) {}
    return 0;
  }

  function crowdN() {
    try {
      var c = window.shopLife && shopLife.crowd ? shopLife.crowd() : [];
      return (c && c.length) || 0;
    } catch (e) {}
    return 0;
  }

  function isStill(f) {
    if (!f) return false;
    if (f.sick || f.ill) return true;
    try {
      if (f.mind && f.mind.stress > 0.68) return true;
    } catch (e) {}
    return false;
  }

  /* The puddle used to sit at a fixed 0.48, 0.74 even when the wet cell moved. */
  function fixPuddle() {
    if (!window.shopSite || shopSite.__roomPuddle) return;
    var orig = shopSite.puddle;
    shopSite.puddle = function () {
      try {
        var s = shopSite.of && shopSite.of();
        if (s && s.cells) {
          var best = null;
          for (var i = 0; i < s.cells.length; i++) {
            var c = s.cells[i];
            if (c.kind === "floor" && c.wet > 0.1 && (!best || c.wet > best.wet)) best = c;
          }
          if (best) {
            return {
              nx: (best.x + 0.5) / (s.w || 16),
              ny: 0.58 + (best.y / (s.h || 10)) * 0.32,
              wet: best.wet,
            };
          }
        }
      } catch (e) {}
      return orig ? orig() : { nx: 0.48, ny: 0.74, wet: 0 };
    };
    shopSite.__roomPuddle = 1;
  }

  function continentBite() {
    var bite = { war: false, cut: false, scarce: "", fever: 0, heat: 0, line: "" };
    try {
      if (window.road && road.cut && road.cut()) {
        bite.cut = true;
        bite.line = "The inland town is late.";
      }
    } catch (e) {}
    try {
      if (window.fever && fever.heat) bite.fever = fever.heat();
      if (bite.fever > 0.4) bite.line = bite.line || (fever.line && fever.line()) || "Something's going around.";
    } catch (e2) {}
    try {
      if (window.wild && wild.of) {
        var st = wild.of();
        for (var k in st.pop) {
          if (st.pop[k] < 0.22) {
            bite.scarce = k;
            bite.line = bite.line || "I heard the river is empty of " + k + ".";
            break;
          }
        }
      }
    } catch (e3) {}
    try {
      if (window.weave && weave.of) {
        var w = weave.of();
        if (/war|embargo|plague/i.test(w.lastAtlas || "")) {
          bite.war = true;
          bite.line = bite.line || "War on the water. Stock will go dear.";
        }
      }
    } catch (e4) {}
    try {
      if (window.rumor && rumor.heat) bite.heat = rumor.heat();
    } catch (e5) {}
    return bite;
  }

  function wrapBrowse() {
    if (didBrowse || !window.shopBrowse) return;
    didBrowse = true;
    var orig = window.shopBrowse;
    window.shopBrowse = function (idx, slot, W, floorY, personS, simT) {
      var rec = orig.apply(this, arguments);
      try {
        if (!rec) return rec;
        var bite = continentBite();
        var st = window.shopLife && shopLife.browse ? shopLife.browse()[idx] : null;
        var coming = window.desk && desk.coming ? desk.coming() : null;

        if (coming && coming.arrived && coming.neighbor) {
          if (coming._roomIdx == null) coming._roomIdx = idx;
          if (coming._roomIdx === idx) {
            rec.name = coming.name || rec.name;
            rec.kind = "neighbor";
            if (st) {
              st.guestName = rec.name;
              st.kind = "neighbor";
            }
          }
        }

        if (rec.phase === "look" && bite.line && st && !st._roomBite && Math.random() < 0.28) {
          st._roomBite = 1;
          rec.line = bite.line;
          st.line = bite.line;
          st.lineUntil = now() + 3.1;
        }

        if (rec.phase === "pay" && st && !st._roomWalk && st.want && window.wild && wild.scarce && wild.scarce(st.want)) {
          st._roomWalk = 1;
          st.phase = "leave";
          rec.phase = "leave";
          rec.line = "I heard there were none. I'll wait.";
          st.line = rec.line;
          st.lineUntil = now() + 2.8;
          st.bought = false;
        }

        if (rec.phase === "pay" && st && !st._roomWalk && bite.fever > 0.55 && Math.random() < 0.45) {
          st._roomWalk = 1;
          st.phase = "leave";
          rec.phase = "leave";
          rec.line = "I'll look from the door.";
          st.line = rec.line;
          st.lineUntil = now() + 2.8;
        }

        if (rec.phase === "pay" && st && !st._roomBag) {
          st._roomBag = 1;
          play("bag", rec.x);
        }
      } catch (e) {}
      return rec;
    };
  }

  function wrapFish() {
    if (didFish || typeof window.drawFishSprite !== "function") return;
    didFish = true;
    var orig = window.drawFishSprite;
    window.drawFishSprite = function (a) {
      try {
        if (a && a.fish && isStill(a.fish) && a.x != null) {
          var id = a.fish.fid || a.fish.id || a.x;
          var pr = stillIds[id];
          if (pr) {
            a.x = pr.x + (a.x - pr.x) * 0.12;
            a.y = pr.y + (a.y - pr.y) * 0.12;
          }
          stillIds[id] = { x: a.x, y: a.y };
          a.fish._holdStill = 1;
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  }

  function ensureOverlay() {
    if (overlay && overlay.parentNode) return;
    overlay = document.getElementById("roomVeil");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "roomVeil";
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
    }
    octx = overlay.getContext("2d");
  }

  function resize() {
    ensureOverlay();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (overlay.width !== ((w * dpr) | 0) || overlay.height !== ((h * dpr) | 0)) {
      overlay.width = (w * dpr) | 0;
      overlay.height = (h * dpr) | 0;
      overlay.style.cssText =
        "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function drawRoom() {
    var sc = sceneName();
    if (sc === "title" || sc === "work") {
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height);
      return;
    }
    resize();
    var w = window.innerWidth;
    var h = window.innerHeight;
    octx.clearRect(0, 0, w, h);

    if (sc === "shop" || sc === "front") {
      var rain = rainAmt();
      if (rain > 0.12) {
        if (!drops.length) {
          for (var i = 0; i < 42; i++) {
            drops.push({
              x: Math.random() * w,
              y: Math.random() * h * 0.55,
              z: 0.4 + Math.random() * 0.8,
              l: 8 + Math.random() * 14,
            });
          }
        }
        octx.strokeStyle = "rgba(190,220,240," + (0.08 + rain * 0.18).toFixed(3) + ")";
        octx.lineWidth = 1;
        octx.beginPath();
        for (var d = 0; d < drops.length; d++) {
          var p = drops[d];
          p.y += (4 + rain * 10) * p.z;
          p.x += rain * 0.6;
          if (p.y > h * 0.62) {
            p.y = -10;
            p.x = Math.random() * w;
          }
          octx.moveTo(p.x, p.y);
          octx.lineTo(p.x + 1.2, p.y + p.l);
        }
        octx.stroke();
        octx.fillStyle = "rgba(12,28,44," + (rain * 0.1).toFixed(3) + ")";
        octx.fillRect(0, 0, w, h * 0.62);
      }

      var pudW = wet();
      if (pudW > 0.18) {
        var pud = { nx: 0.48, ny: 0.76 };
        try {
          pud = shopSite.puddle() || pud;
        } catch (eP) {}
        var px = (pud.nx || 0.48) * w;
        var py = (pud.ny || 0.76) * h;
        var a = Math.min(0.42, pudW * 0.55);
        octx.save();
        var g = octx.createRadialGradient(px, py, 4, px, py, w * (0.08 + pudW * 0.1));
        g.addColorStop(0, "rgba(30,70,90," + (a + 0.08).toFixed(3) + ")");
        g.addColorStop(0.55, "rgba(18,48,66," + a.toFixed(3) + ")");
        g.addColorStop(1, "rgba(18,48,66,0)");
        octx.fillStyle = g;
        octx.beginPath();
        octx.ellipse(px, py, w * (0.1 + pudW * 0.08), 16 + pudW * 18, -0.18, 0, Math.PI * 2);
        octx.fill();
        octx.globalCompositeOperation = "lighter";
        octx.globalAlpha = 0.12 + pudW * 0.1;
        octx.strokeStyle = "rgba(160,210,230,.55)";
        octx.lineWidth = 1;
        octx.beginPath();
        octx.ellipse(px, py - 2, w * (0.07 + pudW * 0.05), 8 + pudW * 8, -0.18, 0.2, Math.PI * 1.4);
        octx.stroke();
        octx.restore();
      }

      if (night()) {
        octx.fillStyle = "rgba(4,12,28,0.18)";
        octx.fillRect(0, 0, w, h);
        var lamp = octx.createRadialGradient(w * 0.62, h * 0.22, 20, w * 0.55, h * 0.4, h * 0.7);
        lamp.addColorStop(0, "rgba(244,196,83,0.05)");
        lamp.addColorStop(1, "rgba(4,10,22,0.22)");
        octx.fillStyle = lamp;
        octx.fillRect(0, 0, w, h);
      }
    }
  }

  function audioBed() {
    var sc = sceneName();
    if (sc === "title" || sc === "work") return;
    var rain = rainAmt();
    var n = crowdN();
    var clog = false;
    try {
      clog = !!window.clogged;
    } catch (e) {}

    if (rain > 0.2 && now() - (audioBed._rainAt || 0) > 1.8) {
      audioBed._rainAt = now();
      play("rain");
    }
    if (clog && !lastClog) play("pump");
    if (clog && now() - (audioBed._pumpAt || 0) > 3.4) {
      audioBed._pumpAt = now();
      play("pump");
    }
    lastClog = clog;

    if (n > lastCrowd && n > 0) play("murmur");
    if (n >= 3 && now() - (audioBed._crowdAt || 0) > 5.5) {
      audioBed._crowdAt = now();
      play("crowd");
    }
    lastCrowd = n;

    if (n === 0 && wet() > 0.28 && now() - lastWetCue > 2.4) {
      lastWetCue = now();
      play("drip");
    }
  }

  function watchMorning() {
    try {
      var coming = window.desk && desk.coming ? desk.coming() : null;
      if (coming && coming.arrived && coming.name) {
        var key = coming.name + "|" + coming.arrived;
        if (key !== lastArrive) {
          lastArrive = key;
          play("wood", window.innerWidth * 0.12);
          play("whoosh", window.innerWidth * 0.12);
          if (coming.neighbor) {
            try {
              if (window.weave && weave.because) {
                weave.because("The baker came at lunch for " + (coming.want || "goldfish") + ".");
              }
            } catch (eB) {}
          }
        }
      }
    } catch (e) {}

    try {
      var day = window.shopLife && shopLife.day ? shopLife.day() : null;
      if (day && lastSale >= 0 && day.sales > lastSale) {
        play("cash");
        play("register");
      }
      if (day) lastSale = day.sales;
    } catch (e2) {}
  }

  function watchAtlas() {
    var bite = continentBite();
    var line = bite.line;
    if (!line) return;
    var key = (bite.war ? "w" : "") + (bite.cut ? "c" : "") + bite.scarce + Math.round(bite.fever * 4);
    if (key === lastAtlas) return;
    if (bite.war || bite.cut || bite.scarce || bite.fever > 0.45) {
      lastAtlas = key;
      try {
        if (window.weave && weave.because) weave.because(line);
        if (window.rumor && rumor.add) rumor.add("atlas", line, bite.war ? 0.9 : 0.6);
        var gold = document.getElementById("hookWhisper");
        if (gold && (bite.war || bite.cut)) {
          gold.textContent = line;
          gold.classList.add("on", "pop");
        }
      } catch (e) {}
    }
  }

  function seedWiki() {
    try {
      var w = typeof WIKI === "function" ? WIKI() : window.WIKI;
      if (!w || !w.push) return;
      if (w.some(function (a) { return a && a.id === "k_room"; })) return;
      w.push({
        id: "k_room",
        sec: "The shop floor",
        t: "The room",
        tags: "puddle night rain still fish aisle baker pair bag door",
        w: "<p>The aisle is wet or it isn't. Night cools the glass. A fish that is holding still will not bag. Rain on the street comes in at the door. None of that is a meter.</p><p><b>What to do about it:</b> swap a filter pad — the boards dry with it. Heat if the street is cold. Keep two of the same fish before lunch. The baker remembers the last fish bag.</p>",
      });
      w.push({
        id: "k_ear",
        sec: "The shop floor",
        t: "The ear",
        tags: "door bag filter rain murmur quiet packed",
        w: "<p>A quiet shop drips. A packed one murmurs. The door has a weight. A fish bag is paper, then the register. The filter, when it packs, is a pump that is working too hard.</p><p><b>What to do about it:</b> listen. If you cannot hear the room, the mute is on.</p>",
      });
    } catch (e) {}
  }

  function tick() {
    try {
      fixPuddle();
      wrapBrowse();
      wrapFish();
      seedWiki();
      if (now() - lastTick > 0.4) {
        lastTick = now();
        watchMorning();
        watchAtlas();
        audioBed();
      }
      drawRoom();
    } catch (e) {}
  }

  window.room = {
    wet: wet,
    night: night,
    bite: continentBite,
    still: isStill,
  };

  if (window.__onBeat) window.__onBeat(tick, 80);
  else setTimeout(function loop() {
    tick();
    setTimeout(loop, 80);
  }, 120);
})();
