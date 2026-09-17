/* Photoreal shop, city map, fish atlas, and town scatter for Fin's. */
(function () {
  "use strict";

  function loadImg(src) {
    var im = new Image();
    im.decoding = "async";
    im.src = src;
    return im;
  }

  var shopBg = loadImg("art/shop-interior.jpg?v=5");
  var backBg = loadImg("art/back-room.jpg?v=2");
  var cityMap = loadImg("art/city-map.jpg?v=2");
  var fishAtlas = loadImg("art/fish-atlas.png?v=3");
  window.shopBg = shopBg;
  window.backBg = backBg;
  window.cityMap = cityMap;

  var TANK_KEYS = ["planted", "goldfish", "reef", "betta", "cichlid", "shrimp", "discus", "quarantine"];
  var tankPlates = {};
  for (var ti = 0; ti < TANK_KEYS.length; ti++) {
    tankPlates[TANK_KEYS[ti]] = loadImg("art/tanks/" + TANK_KEYS[ti] + ".jpg?v=2");
  }
  var tankLooks = {
    ocean: loadImg("art/looks/ocean.jpg?v=1"),
    black: loadImg("art/looks/black.jpg?v=1"),
    sunset: loadImg("art/looks/sunset.jpg?v=1"),
    planted: loadImg("art/looks/planted.jpg?v=1"),
    lagoon: loadImg("art/looks/lagoon.jpg?v=1")
  };
  var gravelImg = loadImg("art/gravel.jpg?v=1");
  window.paintTankLook = function (ctx, w, h, id, light) {
    if (!ctx || w < 8 || h < 8) return false;
    var img = tankLooks[id] || tankLooks.planted;
    if (!img || !img.complete || !img.naturalWidth) return false;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    light = light == null ? 0.7 : light;
    if (light < 0.85) {
      ctx.fillStyle = "rgba(6,12,22," + ((0.85 - light) * 0.72).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
    }
    return true;
  };
  window.paintTankGravel = function (ctx, w, h) {
    if (!ctx || !gravelImg.complete || !gravelImg.naturalWidth || w < 8 || h < 8) return false;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(gravelImg, 0, 0, w, h);
    ctx.restore();
    return true;
  };
  // Quads match compose_shop_tanks.py (tl,tr,br,bl), normalized to the shop photo.
  // Door keepout x>=0.82. Window keepout x<=0.155. Sign covers B-t0.
  var SHOP_WALL = [
    { id: "L-top", key: "reef", kind: "side", tint: "rgba(20,70,150,.22)", rim: "rgba(90,180,255,.7)", fill: "#12324a",
      q: [0.162, 0.198, 0.248, 0.228, 0.250, 0.348, 0.158, 0.342] },
    { id: "L-bot", key: "betta", kind: "side", tint: "rgba(90,20,30,.28)", rim: "rgba(220,80,90,.7)", fill: "#2a1210",
      q: [0.162, 0.352, 0.250, 0.358, 0.248, 0.508, 0.160, 0.528] },
    { id: "island", key: "planted", kind: "island", tint: "rgba(40,110,80,.22)", rim: "rgba(140,210,160,.7)", fill: "#16382c",
      q: [0.302, 0.398, 0.502, 0.378, 0.518, 0.558, 0.292, 0.582] },
    { id: "B-t0", key: "goldfish", kind: "back", tint: "rgba(180,120,40,.2)", rim: "rgba(240,190,90,.7)", fill: "#4a3214",
      q: [0.498, 0.168, 0.585, 0.178, 0.588, 0.278, 0.496, 0.272] },
    { id: "B-t1", key: "cichlid", kind: "back", tint: "rgba(80,90,100,.18)", rim: "rgba(190,200,210,.7)", fill: "#3a3a32",
      q: [0.592, 0.178, 0.675, 0.190, 0.678, 0.282, 0.590, 0.278] },
    { id: "B-t2", key: "discus", kind: "back", tint: "rgba(40,90,70,.2)", rim: "rgba(120,190,150,.7)", fill: "#1c3328",
      q: [0.682, 0.190, 0.758, 0.206, 0.760, 0.288, 0.680, 0.282] },
    { id: "B-b0", key: "shrimp", kind: "back", tint: "rgba(50,120,70,.2)", rim: "rgba(110,200,130,.7)", fill: "#1e3a24",
      q: [0.496, 0.278, 0.588, 0.282, 0.590, 0.398, 0.492, 0.408] },
    { id: "B-b1", key: "quarantine", kind: "back", tint: "rgba(90,110,120,.16)", rim: "rgba(180,200,210,.65)", fill: "#2a3438",
      q: [0.590, 0.282, 0.678, 0.286, 0.680, 0.392, 0.588, 0.400] },
  ];
  // Overlay play tanks: wall glass only, no overlap with the aisle island or the door.
  // Skip island (people walk the aisle) and B-t0 (behind the hanging sign) and B-b0 (hidden by the island).
  var SHOP_PLAY = [0, 1, 2, 3, 4, 5, 6, 7];

  function wallOf(i) {
    return SHOP_WALL[SHOP_PLAY[((i % SHOP_PLAY.length) + SHOP_PLAY.length) % SHOP_PLAY.length]];
  }
  function insetNorm(q, t) {
    var cx = (q[0] + q[2] + q[4] + q[6]) / 4;
    var cy = (q[1] + q[3] + q[5] + q[7]) / 4;
    var o = [];
    for (var i = 0; i < 8; i += 2) {
      o.push(q[i] + (cx - q[i]) * t);
      o.push(q[i + 1] + (cy - q[i + 1]) * t);
    }
    return o;
  }
  function quadToCanvas(q, W, top, ph) {
    return [
      q[0] * W, top + q[1] * ph,
      q[2] * W, top + q[3] * ph,
      q[4] * W, top + q[5] * ph,
      q[6] * W, top + q[7] * ph,
    ];
  }
  function aabbOf(q) {
    var minx = Math.min(q[0], q[2], q[4], q[6]);
    var maxx = Math.max(q[0], q[2], q[4], q[6]);
    var miny = Math.min(q[1], q[3], q[5], q[7]);
    var maxy = Math.max(q[1], q[3], q[5], q[7]);
    return { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
  }

  window.__shopWall = SHOP_WALL;
  window.__shopPlay = SHOP_PLAY;

  function nameOfFish(f, species) {
    if (!f) return "";
    if (f.name) return String(f.name);
    var T = species && species[f.sp];
    if (T && (T.name || T.n)) return String(T.name || T.n);
    if (f.sp && typeof f.sp === "object") return String(f.sp.name || f.sp.n || "");
    return String(f.sp || "");
  }
  function wallKeyForFish(f, species) {
    if (f && (f.sick || f.cond)) return "quarantine";
    var n = nameOfFish(f, species).toLowerCase();
    if (/shrimp|snail|crab|nerite|amano|cherry shrimp/.test(n)) return "shrimp";
    if (/betta|siamese/.test(n)) return "betta";
    if (/clown|damsel|tang|wrasse|marine|anthias|chromis|blenny/.test(n)) return "reef";
    if (/goldfish|comet|oranda|koi|\bcarp\b/.test(n)) return "goldfish";
    if (/cichlid|oscar|ram|krib|frontosa|mbuna/.test(n)) return "cichlid";
    if (/discus|angel|gourami/.test(n)) return "discus";
    return "planted";
  }
  window.shopSlotCount = function (nTanks) {
    if (window.shopBg && shopBg.complete && shopBg.naturalWidth) return SHOP_PLAY.length;
    return Math.max(1, nTanks || 1);
  };
  window.shopFishForSlot = function (slot, allFish, species) {
    var wall = wallOf(slot);
    var key = wall && wall.key;
    allFish = allFish || [];
    var out = [];
    for (var i = 0; i < allFish.length; i++) {
      var f = allFish[i];
      if (f && wallKeyForFish(f, species) === key) out.push(f);
    }
    return out;
  };
  window.shopGoTank = function (slot, view, tanks, fish, species) {
    var wall = wallOf(slot);
    var key = wall && wall.key;
    view = view || 0;
    function has(list) {
      if (!list) return false;
      for (var i = 0; i < list.length; i++) if (wallKeyForFish(list[i], species) === key) return true;
      return false;
    }
    if (has(fish)) return view;
    tanks = tanks || [];
    for (var t = 0; t < tanks.length; t++) {
      if (t === view) continue;
      if (has(tanks[t])) return t;
    }
    return view;
  };

  window.shopPlayTank = function (i, W, top, canvasH) {
    var wall = wallOf(i);
    var ph = Math.max(24, (canvasH || 1) - top);
    var nq = insetNorm(wall.q, wall.kind === "side" ? 0.1 : 0.08);
    var q = quadToCanvas(nq, W, top, ph);
    var box = aabbOf(q);
    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      q: q,
      key: wall.key,
      kind: wall.kind,
      rim: wall.rim,
      tint: wall.tint,
      fill: wall.fill,
      id: wall.id,
    };
  };

  window.shopTankBegin = function (ctx, i, W, top, canvasH) {
    var pt = window.shopPlayTank(i, W, top, canvasH);
    if (!ctx || !pt || !pt.q || pt.w < 4 || pt.h < 4) return pt;
    var q = pt.q;
    var x = pt.x, y = pt.y, w = pt.w, h = pt.h;
    var a = (q[2] - q[0]) / w;
    var b = (q[3] - q[1]) / w;
    var c = (q[6] - q[0]) / h;
    var d = (q[7] - q[1]) / h;
    ctx.save();
    ctx.transform(a, b, c, d, q[0] - a * x - c * y, q[1] - b * x - d * y);
    return pt;
  };
  window.shopTankEnd = function (ctx) {
    if (ctx) ctx.restore();
  };

  window.drawShopTankInterior = function (ctx, x, y, w, h, idx) {
    if (!ctx || w < 8 || h < 8) return;
    var wall = wallOf(idx);
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x + 2, y + h * 0.08, w - 4, h * 0.78, 4);
    else ctx.rect(x + 2, y + h * 0.08, w - 4, h * 0.78);
    ctx.clip();
    var img = tankPlates[wall.key];
    if (img && img.complete && img.naturalWidth) {
      var iw = img.naturalWidth,
        ih = img.naturalHeight;
      ctx.drawImage(img, iw * 0.1, ih * 0.1, iw * 0.8, ih * 0.78, x, y + h * 0.06, w, h * 0.82);
    } else {
      ctx.fillStyle = wall.fill;
      ctx.fillRect(x, y, w, h);
    }
    ctx.fillStyle = wall.tint;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = wall.rim;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h * 0.14);
    ctx.lineTo(x + w - 6, y + h * 0.14);
    ctx.stroke();
    ctx.restore();
  };

  var FISH_CELLS = 3;
  var FISH_CELL = 256;
  var fishCrops = null;
  function fishIndex(sp) {
    var n = String((sp && (sp.name || sp.n)) || "").toLowerCase();
    if (/goldfish|comet|oranda/.test(n)) return 0;
    if (/betta|siamese/.test(n)) return 1;
    if (/tetra|neon|cardinal|rasbora|danio|minnow|white cloud/.test(n)) return 2;
    if (/guppy|endler|platy|molly|sword/.test(n)) return 3;
    if (/angel/.test(n)) return 4;
    if (/cichlid|oscar|ram|krib/.test(n)) return 5;
    if (/\bkoi\b|carp/.test(n)) return 6;
    if (/clown|damsel|tang|wrasse|marine/.test(n)) return 7;
    if (/gourami|discus|barb|cory|loach/.test(n)) return 8;
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 33 + n.charCodeAt(i)) >>> 0;
    return h % 9;
  }
  function ensureFishCrops() {
    if (fishCrops || !fishAtlas.complete || !fishAtlas.naturalWidth) return;
    try {
      var c = document.createElement("canvas");
      c.width = fishAtlas.naturalWidth;
      c.height = fishAtlas.naturalHeight;
      var g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(fishAtlas, 0, 0);
      var img = g.getImageData(0, 0, c.width, c.height);
      var data = img.data;
      var W = c.width;
      fishCrops = [];
      for (var idx = 0; idx < 9; idx++) {
        var col = idx % FISH_CELLS,
          row = (idx / FISH_CELLS) | 0;
        var x0 = col * FISH_CELL,
          y0 = row * FISH_CELL;
        var minx = FISH_CELL,
          miny = FISH_CELL,
          maxx = 0,
          maxy = 0;
        for (var y = 0; y < FISH_CELL; y++) {
          for (var x = 0; x < FISH_CELL; x++) {
            if (data[((y0 + y) * W + (x0 + x)) * 4 + 3] > 18) {
              if (x < minx) minx = x;
              if (y < miny) miny = y;
              if (x > maxx) maxx = x;
              if (y > maxy) maxy = y;
            }
          }
        }
        if (maxx <= minx) {
          minx = 24;
          miny = 24;
          maxx = 232;
          maxy = 232;
        }
        var pad = 8;
        fishCrops[idx] = {
          sx: x0 + Math.max(0, minx - pad),
          sy: y0 + Math.max(0, miny - pad),
          sw: Math.min(FISH_CELL - Math.max(0, minx - pad), maxx - minx + pad * 2),
          sh: Math.min(FISH_CELL - Math.max(0, miny - pad), maxy - miny + pad * 2),
        };
      }
    } catch (e) {
      fishCrops = null;
    }
  }

  window.drawFishSprite = function (args) {
    if (!args || !args.ctx || !fishAtlas.complete || !fishAtlas.naturalWidth) return false;
    var sp = args.sp;
    if (!sp || sp.shape === "shrimp" || sp.shape === "snail" || sp.shape === "crab") return false;
    ensureFishCrops();
    var ctx = args.ctx;
    var f = args.fish || {};
    var hunger = f.hunger == null ? 1 : Math.max(0, Math.min(1.2, f.hunger));
    var sick = f.sick || f.cond || 0;
    var gulp = f.gulp || 0;
    var uniq = ((f.fid || f.id || 0) * 13 + (f.gen || 0)) % 9;
    var size = Math.max(7, args.size || 12) * (0.88 + 0.18 * Math.min(1, hunger)) * (0.94 + uniq * 0.012);
    var idx = fishIndex(sp);
    var crop = fishCrops && fishCrops[idx];
    var dir = f.dir < 0 ? -1 : 1;
    var phase = f.phase || 0;
    var bob = Math.sin(phase) * size * 0.045;
    var bank = Math.max(-0.22, Math.min(0.22, (f.vy || 0) / 420)) * dir;
    var aspect = crop ? crop.sw / Math.max(1, crop.sh) : 1.55;
    var h = size * 1.18;
    var w = h * Math.max(1.15, Math.min(2.1, aspect));
    if (gulp > 0) {
      var gulpN = Math.sin(Math.min(1, gulp / 0.22) * Math.PI);
      w *= 1 + gulpN * 0.06;
    }
    ctx.save();
    ctx.translate(args.x, args.y + size * 0.38);
    ctx.scale(1, 0.28);
    ctx.fillStyle = "rgba(6,16,28," + (0.16 + 0.1 * Math.min(1, hunger)).toFixed(3) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.42, w * 0.42, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(args.x, args.y + bob);
    ctx.rotate(bank + Math.sin(phase * 2.1) * 0.045 * dir);
    ctx.scale(dir, 1);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
    if (sick) ctx.filter = "sepia(0.4) saturate(0.75)";
    else if (hunger < 0.35) ctx.globalAlpha = 0.78 + hunger * 0.45;
    if (crop) {
      ctx.drawImage(fishAtlas, crop.sx, crop.sy, crop.sw, crop.sh, -w * 0.48, -h * 0.52, w, h);
    } else {
      var col = idx % FISH_CELLS,
        row = (idx / FISH_CELLS) | 0;
      ctx.drawImage(fishAtlas, col * FISH_CELL, row * FISH_CELL, FISH_CELL, FISH_CELL, -w * 0.48, -h * 0.52, w, h);
    }
    ctx.filter = "none";
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.18 + 0.1 * Math.sin(phase * 1.7 + uniq);
    var spec = ctx.createRadialGradient(-w * 0.12, -h * 0.22, 0, 0, 0, w * 0.55);
    spec.addColorStop(0, "rgba(230,250,255,.7)");
    spec.addColorStop(1, "rgba(230,250,255,0)");
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(-w * 0.06, -h * 0.16, w * 0.28, h * 0.18, -0.4, 0, 7);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    if (f.shiny) {
      ctx.fillStyle = "rgba(255,255,240,.75)";
      ctx.beginPath();
      ctx.arc(w * 0.1, -h * 0.14, Math.max(1.2, size * 0.07), 0, 7);
      ctx.fill();
    }
    if (sick) {
      ctx.fillStyle = "rgba(170,220,90,.18)";
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.34, h * 0.24, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
    return true;
  };

  window.drawShopBackdrop = function (ctx, x, y, w, h, t, wx) {
    if (!ctx || !shopBg.complete || !shopBg.naturalWidth || w < 8 || h < 8) return false;
    t = t || 0;
    wx = wx || {};
    ctx.save();
    ctx.drawImage(shopBg, x, y, w, h);
    var day = wx.day == null ? 0.65 : wx.day;
    if (day < 0.5) {
      ctx.fillStyle = "rgba(6,12,24," + ((0.5 - day) * 0.85).toFixed(3) + ")";
      ctx.fillRect(x, y, w, h);
    }

    // Keep the photoreal room. A painted oak slab used to cover the
    // lower half and fight the photo; people stand on the photo's floor.
    var g = ctx.createLinearGradient(0, y, 0, y + h * 0.14);
    g.addColorStop(0, "rgba(6,10,16,.38)");
    g.addColorStop(1, "rgba(6,10,16,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h * 0.14);
    drawShopRoomFx(ctx, x, y, w, h, t, wx);
    if (window.__gunFlash > 0.04) {
      ctx.fillStyle = "rgba(255,244,210," + (window.__gunFlash * 0.42).toFixed(3) + ")";
      ctx.fillRect(x, y, w, h);
      var doorGlow = ctx.createRadialGradient(x + w * 0.12, y + h * 0.5, 4, x + w * 0.12, y + h * 0.5, w * 0.4);
      doorGlow.addColorStop(0, "rgba(255,250,230," + (window.__gunFlash * 0.55).toFixed(3) + ")");
      doorGlow.addColorStop(1, "rgba(255,220,160,0)");
      ctx.fillStyle = doorGlow;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    return true;
  };

  window.drawBackBackdrop = function (ctx, x, y, w, h, t) {
    if (!ctx || !backBg.complete || !backBg.naturalWidth || w < 8 || h < 8) return false;
    t = t || 0;
    ctx.save();
    var iw = backBg.naturalWidth, ih = backBg.naturalHeight;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    var ox = dw > w ? (w - dw) * 0.18 : (w - dw) / 2;
    var oy = dh > h ? (h - dh) * 0.35 : (h - dh) / 2;
    ctx.drawImage(backBg, x + ox, y + oy, dw, dh);
    var top = ctx.createLinearGradient(0, y, 0, y + h * 0.12);
    top.addColorStop(0, "rgba(6,10,16,.34)");
    top.addColorStop(1, "rgba(6,10,16,0)");
    ctx.fillStyle = top;
    ctx.fillRect(x, y, w, h * 0.12);
    var bot = ctx.createLinearGradient(0, y + h * 0.82, 0, y + h);
    bot.addColorStop(0, "rgba(8,6,4,0)");
    bot.addColorStop(1, "rgba(8,6,4,.28)");
    ctx.fillStyle = bot;
    ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    var bulb = ctx.createRadialGradient(x + w * 0.5, y + h * 0.08, 4, x + w * 0.5, y + h * 0.22, w * 0.42);
    bulb.addColorStop(0, "rgba(255,220,150," + (0.05 + pulse * 0.03).toFixed(3) + ")");
    bulb.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = bulb;
    ctx.fillRect(x, y, w, h * 0.55);
    ctx.restore();
    return true;
  };

  var dust = [];
  var steam = [];
  var rain = [];
  var snow = [];
  var gustBits = [];
  var beads = [];
  var flashT = 0;
  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {}

  function seedPool(pool, n, make) {
    while (pool.length < n) pool.push(make(pool.length));
    if (pool.length > n) pool.length = n;
  }

  /* Storefront glass in shop-interior.jpg — left wall, stops before the first tank. */
  var SHOP_WIN = { x: 0.018, y: 0.082, w: 0.138, h: 0.58 };

  function mixRgb(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return [
      (a[0] + (b[0] - a[0]) * t) | 0,
      (a[1] + (b[1] - a[1]) * t) | 0,
      (a[2] + (b[2] - a[2]) * t) | 0,
    ];
  }

  function airC(wx) {
    try {
      if (typeof wxWord === "function") {
        var s = wxWord();
        var f = s.match(/(-?\d+)\s*°F/);
        if (f) return (parseInt(f[1], 10) - 32) * 5 / 9;
        var c = s.match(/(-?\d+)\s*°C/);
        if (c) return parseInt(c[1], 10);
      }
    } catch (e) {}
    return wx && wx.seaT != null ? wx.seaT : 12;
  }

  function skyRgb(day, cloud, rainAmt, fogAmt) {
    var night = [8, 12, 22];
    var dawn = [196, 118, 72];
    var noon = [118, 168, 210];
    var dusk = [210, 96, 58];
    var over = [92, 104, 118];
    var storm = [48, 58, 72];
    var base;
    if (day < 0.22) base = mixRgb(night, dawn, day / 0.22);
    else if (day < 0.45) base = mixRgb(dawn, noon, (day - 0.22) / 0.23);
    else if (day > 0.82) base = mixRgb(dusk, night, (day - 0.82) / 0.18);
    else if (day > 0.68) base = mixRgb(noon, dusk, (day - 0.68) / 0.14);
    else base = noon;
    base = mixRgb(base, over, Math.max(0, cloud - 0.28) * 1.15);
    if (rainAmt > 0.08) base = mixRgb(base, storm, Math.min(1, rainAmt * 1.1));
    if (fogAmt > 0.15) base = mixRgb(base, [170, 176, 182], fogAmt * 0.55);
    return base;
  }

  function drawWindowWeather(ctx, x, y, w, h, t, wx) {
    var rainAmt = Math.max(0, wx.rain || 0);
    var fogAmt = Math.max(0, wx.fog || 0);
    var cloud = wx.cloud == null ? 0.3 : wx.cloud;
    var wind = wx.wind || 8;
    var gust = wx.gust || 0;
    var day = wx.day == null ? 0.65 : wx.day;
    var seaT = airC(wx);
    var front = wx.front || 0;
    var snowing = rainAmt > 0.05 && seaT <= 1.5;
    var sleeting = rainAmt > 0.1 && seaT > 1.5 && seaT < 4.5;
    var storming = rainAmt > 0.55 || wind >= 28 || (front > 0.4 && rainAmt > 0.25);
    var night = day < 0.28;

    var px = x + SHOP_WIN.x * w;
    var py = y + SHOP_WIN.y * h;
    var pw = SHOP_WIN.w * w;
    var ph = SHOP_WIN.h * h;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px, py, pw, ph, Math.min(6, pw * 0.03));
    else ctx.rect(px, py, pw, ph);
    ctx.clip();

    var rgb = skyRgb(day, cloud, rainAmt, fogAmt);
    var veil = 0.07 + cloud * 0.1 + rainAmt * 0.09 + (night ? 0.14 : 0) + fogAmt * 0.1;
    veil = Math.min(0.38, veil);
    ctx.globalCompositeOperation = "multiply";
    var wash = ctx.createLinearGradient(px, py, px, py + ph);
    wash.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + veil.toFixed(3) + ")");
    wash.addColorStop(0.5, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (veil * 0.42).toFixed(3) + ")");
    wash.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0.03)");
    ctx.fillStyle = wash;
    ctx.fillRect(px, py, pw, ph);

    ctx.globalCompositeOperation = night ? "screen" : "overlay";
    var sky = ctx.createLinearGradient(px, py, px, py + ph);
    var topA = (night ? 0.22 : 0.14) + cloud * 0.08;
    sky.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + topA.toFixed(3) + ")");
    sky.addColorStop(0.45, "rgba(" + rgb[0] + "," + rgb[1] + "," + Math.min(255, rgb[2] + 8) + "," + (topA * 0.35).toFixed(3) + ")");
    sky.addColorStop(1, "rgba(20,24,28," + (night ? 0.18 : 0.04).toFixed(3) + ")");
    ctx.fillStyle = sky;
    ctx.fillRect(px, py, pw, ph);

    if (night) {
      ctx.globalCompositeOperation = "screen";
      var lamp = ctx.createRadialGradient(px + pw * 0.72, py + ph * 0.7, 2, px + pw * 0.55, py + ph * 0.62, pw * 0.9);
      lamp.addColorStop(0, "rgba(255,170,70," + (0.2 + (1 - cloud) * 0.08).toFixed(3) + ")");
      lamp.addColorStop(0.45, "rgba(255,140,40,.06)");
      lamp.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = lamp;
      ctx.fillRect(px, py, pw, ph);
    }

    ctx.globalCompositeOperation = "source-over";

    if (fogAmt > 0.04) {
      ctx.fillStyle = "rgba(210,216,222," + (fogAmt * 0.32).toFixed(3) + ")";
      ctx.fillRect(px, py, pw, ph);
      var fogBand = ctx.createLinearGradient(px, py + ph * 0.45, px, py + ph);
      fogBand.addColorStop(0, "rgba(200,208,214,0)");
      fogBand.addColorStop(1, "rgba(188,196,204," + (fogAmt * 0.4).toFixed(3) + ")");
      ctx.fillStyle = fogBand;
      ctx.fillRect(px, py, pw, ph);
    }

    var slant = ((wx.dir || 240) > 180 ? 1 : -1) * (0.12 + wind * 0.012 + gust * 0.02);
    var dt = reduced ? 0.45 : 1;

    if (!snowing && rainAmt > 0.03) {
      var nRain = reduced ? 10 : Math.floor(16 + rainAmt * 40 + wind * 0.4);
      seedPool(rain, nRain, function () {
        return {
          x: Math.random(),
          y: Math.random(),
          l: 0.05 + Math.random() * 0.14,
          v: 0.22 + Math.random() * 0.45 + rainAmt * 0.25,
          w: 0.55 + Math.random(),
        };
      });
      ctx.strokeStyle = "rgba(214,230,242," + (0.16 + rainAmt * 0.42).toFixed(3) + ")";
      ctx.lineWidth = rainAmt > 0.6 ? 1.35 : 1;
      ctx.beginPath();
      for (var i = 0; i < rain.length; i++) {
        var d = rain[i];
        d.y += d.v * 0.018 * dt * (0.85 + rainAmt);
        d.x += slant * 0.01 * dt;
        if (d.y > 1.15) {
          d.y = -0.12;
          d.x = Math.random();
        }
        if (d.x < -0.1) d.x += 1.2;
        if (d.x > 1.1) d.x -= 1.2;
        var rx = px + d.x * pw;
        var ry = py + d.y * ph;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + slant * d.l * pw * 0.35, ry + d.l * ph);
      }
      ctx.stroke();
    }

    if (snowing || sleeting) {
      var nSnow = reduced ? 10 : Math.floor(18 + rainAmt * 40);
      seedPool(snow, nSnow, function () {
        return {
          x: Math.random(),
          y: Math.random(),
          r: 1.1 + Math.random() * 2.4,
          v: 0.035 + Math.random() * 0.07,
          p: Math.random() * 6.28,
        };
      });
      ctx.fillStyle = "rgba(242,248,255,.88)";
      for (var s = 0; s < snow.length; s++) {
        var fl = snow[s];
        fl.y += fl.v * dt * (sleeting ? 1.6 : 1);
        fl.x += Math.sin(t * 0.9 + fl.p) * 0.003 * dt + slant * 0.004;
        if (fl.y > 1.08) {
          fl.y = -0.05;
          fl.x = Math.random();
        }
        ctx.globalAlpha = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(t + fl.p));
        ctx.beginPath();
        ctx.arc(px + fl.x * pw, py + fl.y * ph, fl.r, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (wind > 16 && rainAmt < 0.35 && !reduced) {
      seedPool(gustBits, Math.min(14, 4 + (wind / 6) | 0), function () {
        return { x: Math.random(), y: 0.3 + Math.random() * 0.6, v: 0.012 + Math.random() * 0.03, l: 0.04 + Math.random() * 0.08, p: Math.random() * 6 };
      });
      ctx.strokeStyle = "rgba(40,36,28,.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var g = 0; g < gustBits.length; g++) {
        var bit = gustBits[g];
        bit.x += bit.v * dt * (wind / 18) * (slant >= 0 ? 1 : -1);
        bit.y += Math.sin(t * 2 + bit.p) * 0.002;
        if (bit.x > 1.2) bit.x = -0.1;
        if (bit.x < -0.2) bit.x = 1.1;
        var bx = px + bit.x * pw;
        var by = py + bit.y * ph;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + bit.l * pw * (slant >= 0 ? 1 : -1), by + 1.5);
      }
      ctx.stroke();
    }

    if (storming) {
      if (flashT <= 0 && Math.random() < 0.012 * dt) flashT = 0.18 + Math.random() * 0.16;
      if (flashT > 0) {
        flashT -= 0.016 * dt;
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(210,230,255," + (flashT * 1.6).toFixed(3) + ")";
        ctx.fillRect(px, py, pw, ph);
        ctx.globalCompositeOperation = "source-over";
        if (flashT > 0.12 && window.feel && feel.play && Math.random() < 0.18) {
          try {
            feel.play("thud");
          } catch (e) {}
        }
      }
    } else flashT = 0;

    /* Beads and runnels on the glass — reads as weather on the pane. */
    var wet = Math.max(rainAmt, fogAmt * 0.6, snowing ? 0.3 : 0);
    if (wet > 0.04 && !reduced) {
      seedPool(beads, Math.floor(10 + wet * 22), function () {
        return {
          x: 0.06 + Math.random() * 0.88,
          y: Math.random() * 0.7,
          r: 0.8 + Math.random() * 1.6,
          v: 0.0015 + Math.random() * 0.006 * (0.4 + rainAmt),
          hold: Math.random() * 2,
        };
      });
      ctx.fillStyle = "rgba(220,236,248,.42)";
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 0.8;
      for (var b = 0; b < beads.length; b++) {
        var be = beads[b];
        be.hold -= 0.016;
        if (be.hold < 0) be.y += be.v * dt;
        if (be.y > 0.96) {
          be.y = Math.random() * 0.2;
          be.x = 0.05 + Math.random() * 0.9;
          be.hold = 0.4 + Math.random() * 2.2;
        }
        var bpx = px + be.x * pw;
        var bpy = py + be.y * ph;
        ctx.beginPath();
        ctx.ellipse(bpx, bpy, be.r * 0.7, be.r, 0, 0, 7);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "screen";
    var shine = ctx.createLinearGradient(px, py, px + pw * 0.55, py + ph * 0.35);
    shine.addColorStop(0, "rgba(255,255,255," + (0.05 + (1 - cloud) * 0.04).toFixed(3) + ")");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(px, py, pw, ph * 0.45);
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    return { x: px, y: py, w: pw, h: ph, rain: rainAmt, cloud: cloud, night: night };
  }

  function drawShopRoomFx(ctx, x, y, w, h, t, wx) {
    var rainAmt = Math.max(0, wx.rain || 0);
    var fogAmt = Math.max(0, wx.fog || 0);
    var cloud = wx.cloud == null ? 0.3 : wx.cloud;

    var win = drawWindowWeather(ctx, x, y, w, h, t, wx);
    var doorX = win.x,
      doorY = win.y,
      doorW = win.w,
      doorH = win.h;

    // Hanging lamp glows — pulse with a cheap two-sine flicker.
    var lamps = [
      [0.22, 0.18, 0.16],
      [0.5, 0.16, 0.2],
      [0.78, 0.2, 0.16],
    ];
    for (var L = 0; L < lamps.length; L++) {
      var lx = x + lamps[L][0] * w,
        ly = y + lamps[L][1] * h,
        rad = lamps[L][2] * w;
      var flick = reduced ? 0.7 : 0.62 + 0.1 * Math.sin(t * 2.05 + L) + 0.04 * Math.sin(t * 13.7 + L * 2);
      var grd = ctx.createRadialGradient(lx, ly, 2, lx, ly, rad);
      grd.addColorStop(0, "rgba(255,210,140," + (0.22 * flick).toFixed(3) + ")");
      grd.addColorStop(0.45, "rgba(255,170,80," + (0.08 * flick).toFixed(3) + ")");
      grd.addColorStop(1, "rgba(255,140,40,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(lx, ly, rad, 0, 7);
      ctx.fill();
    }

    // God rays from the door, slow pendulum.
    if (!reduced) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var sway = Math.sin(t * 0.35) * 0.04;
      var ray = ctx.createLinearGradient(doorX + doorW, doorY, x + w * (0.42 + sway), y + h * 0.92);
      ray.addColorStop(0, "rgba(255,220,170," + ((0.04 + (1 - cloud) * 0.03) * (1 - rainAmt * 0.75) * (win.night ? 0.15 : 1)).toFixed(3) + ")");
      ray.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(doorX + doorW * 0.2, doorY);
      ctx.lineTo(doorX + doorW, doorY);
      ctx.lineTo(x + w * (0.5 + sway), y + h);
      ctx.lineTo(x + w * (0.22 + sway), y + h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Dust motes in the lamp shafts.
    seedPool(dust, reduced ? 10 : 28, function (i) {
      return {
        x: 0.15 + Math.random() * 0.7,
        y: Math.random(),
        s: 0.6 + Math.random() * 1.4,
        p: Math.random() * 6.28,
        v: 0.003 + Math.random() * 0.007,
      };
    });
    ctx.fillStyle = "rgba(255,236,200,.55)";
    for (var m = 0; m < dust.length; m++) {
      var u = dust[m];
      u.y -= u.v * (reduced ? 0.4 : 1);
      u.x += Math.sin(t * 0.4 + u.p) * 0.00035;
      if (u.y < -0.02) {
        u.y = 1.02;
        u.x = 0.12 + Math.random() * 0.76;
      }
      var a = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + u.p));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(x + u.x * w, y + u.y * h, u.s, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Hanging lamp cords — tiny pendulum.
    ctx.strokeStyle = "rgba(30,20,12,.35)";
    ctx.lineWidth = 1;
    for (var L2 = 0; L2 < lamps.length; L2++) {
      var cx = x + lamps[L2][0] * w;
      var cy = y + lamps[L2][1] * h;
      var sway = Math.sin(t * 1.15 + L2) * w * 0.004;
      ctx.beginPath();
      ctx.moveTo(cx, y + h * 0.02);
      ctx.quadraticCurveTo(cx + sway, cy * 0.55, cx + sway * 0.4, cy);
      ctx.stroke();
    }

    // Steam from a mug on the left counter.
    seedPool(steam, 10, function (i) {
      return { x: 0.2 + Math.random() * 0.04, y: 0.62, life: Math.random(), v: 0.01 + Math.random() * 0.02 };
    });
    for (var s = 0; s < steam.length; s++) {
      var st = steam[s];
      st.life += st.v;
      if (st.life > 1) {
        st.life = 0;
        st.x = 0.19 + Math.random() * 0.05;
      }
      var sy = y + (0.62 - st.life * 0.16) * h;
      var sx = x + (st.x + Math.sin(t * 1.4 + s) * 0.008 * st.life) * w;
      ctx.globalAlpha = (1 - st.life) * 0.07;
      ctx.fillStyle = "#e8e4dc";
      ctx.beginPath();
      ctx.ellipse(sx, sy, 3 + st.life * 5, 2 + st.life * 4, 0, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Plant sway — overlay a few leaves on the right fern.
    if (!reduced) {
      ctx.save();
      ctx.translate(x + w * 0.9, y + h * 0.72);
      ctx.rotate(Math.sin(t * 0.9) * 0.05);
      ctx.fillStyle = "rgba(40,90,55,.18)";
      for (var lf = 0; lf < 5; lf++) {
        ctx.save();
        ctx.rotate((-0.5 + lf * 0.22) + Math.sin(t * 1.1 + lf) * 0.06);
        ctx.beginPath();
        ctx.ellipse(0, -h * (0.04 + lf * 0.012), w * 0.012, h * 0.05, 0.4, 0, 7);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    try {
      if (window.shopSite && shopSite.wet() > 0.12) {
        var wetA = Math.min(0.38, shopSite.wet() * 0.45);
        ctx.save();
        ctx.globalAlpha = wetA;
        ctx.fillStyle = "rgba(36,64,84,1)";
        ctx.beginPath();
        ctx.ellipse(x + w * 0.48, y + h * 0.74, w * 0.24, h * 0.055, 0, 0, 7);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + w * 0.42, y + h * 0.7, w * 0.1, h * 0.03, 0, 0, 7);
        ctx.fill();
        ctx.restore();
        if (shopSite.wet() > 0.2) {
          ctx.save();
          ctx.strokeStyle = "rgba(180,210,230," + (0.25 + shopSite.wet() * 0.3).toFixed(2) + ")";
          ctx.lineWidth = 1.2;
          var dripT = t || 0;
          for (var dr = 0; dr < 3; dr++) {
            var dx = x + w * (0.44 + dr * 0.04);
            var dy = y + h * (0.52 + ((dripT * 0.35 + dr * 0.2) % 0.22));
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx, dy + h * 0.025);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    } catch (eWet) {}
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  var bubbles = [];

  window.shopInteriorFx = function (ctx, t, wx, tanks, floorY) {
    window.__shopTanks = tanks || [];
    if (!ctx || !tanks || !tanks.length) return;
    t = t || 0;
    wx = wx || {};
    var need = tanks.length * (reduced ? 5 : 9);
    seedPool(bubbles, need, function (i) {
      return { id: i, u: Math.random(), v: Math.random(), r: 0.8 + Math.random() * 1.6, sp: 0.012 + Math.random() * 0.03, w: Math.random() };
    });

    for (var i = 0; i < tanks.length; i++) {
      var tk = tanks[i];
      var tx = tk[0],
        ty = tk[1],
        tw = tk[2],
        th = tk[3];
      if (tw < 8 || th < 8) continue;
      var pt = (window.__shopTankPts || [])[i];
      var q = pt && pt.q;
      ctx.save();
      ctx.beginPath();
      if (q && q.length >= 8) {
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(q[2], q[3]);
        ctx.lineTo(q[4], q[5]);
        ctx.lineTo(q[6], q[7]);
        ctx.closePath();
      } else if (ctx.roundRect) ctx.roundRect(tx + 2, ty + th * 0.08, tw - 4, th * 0.78, 3);
      else ctx.rect(tx + 2, ty + th * 0.08, tw - 4, th * 0.78);
      ctx.clip();
      var live = !!(window.shopBg && shopBg.complete && shopBg.naturalWidth);
      if (wx.clog) {
        ctx.fillStyle = live ? "rgba(90,80,40,.08)" : "rgba(90,80,40,.22)";
        ctx.fillRect(tx, ty, tw, th);
      }
      if (!live) {
        ctx.globalCompositeOperation = "lighter";
        for (var c = 0; c < 3; c++) {
          var ph = t * (0.35 + c * 0.12) + i * 0.7 + c;
          ctx.beginPath();
          ctx.moveTo(tx, ty + th);
          for (var px = 0; px <= tw; px += 6) {
            var yy =
              ty +
              th * 0.2 +
              Math.sin(px * 0.045 + ph) * 7 +
              Math.sin(px * 0.02 + ph * 1.7) * 5 +
              c * 10;
            ctx.lineTo(tx + px, yy);
          }
          ctx.strokeStyle = wx.clog
            ? "rgba(180,170,90," + (0.05 + c * 0.015).toFixed(3) + ")"
            : "rgba(140,220,255," + (0.07 + c * 0.02).toFixed(3) + ")";
          ctx.lineWidth = 5 - c;
          ctx.stroke();
        }

        var sy = ty + th * 0.1 + Math.sin(t * 1.6 + i) * 1.5;
        var sg = ctx.createLinearGradient(tx, sy, tx, sy + 8);
        sg.addColorStop(0, "rgba(200,240,255,.22)");
        sg.addColorStop(1, "rgba(200,240,255,0)");
        ctx.fillStyle = sg;
        ctx.fillRect(tx, sy, tw, 8);
      }

      // Bubbles.
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(210,240,255,.55)";
      ctx.lineWidth = 1;
      for (var b = 0; b < bubbles.length; b++) {
        if (b % tanks.length !== i) continue;
        var bu = bubbles[b];
        bu.v -= bu.sp;
        if (bu.v < 0) {
          bu.v = 1;
          bu.u = 0.08 + Math.random() * 0.84;
        }
        var bx = tx + 4 + (bu.u + Math.sin(t * 1.2 + bu.w) * 0.04) * (tw - 8);
        var by = ty + th * 0.12 + bu.v * th * 0.7;
        ctx.globalAlpha = 0.25 + 0.45 * bu.v;
        ctx.beginPath();
        ctx.arc(bx, by, bu.r, 0, 7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (window.shopBg && shopBg.complete && shopBg.naturalWidth) {
        ctx.save();
        if (q && q.length >= 8) {
          ctx.beginPath();
          ctx.moveTo(q[0], q[1]);
          ctx.lineTo(q[2], q[3]);
          ctx.lineTo(q[4], q[5]);
          ctx.lineTo(q[6], q[7]);
          ctx.closePath();
          ctx.clip();
        }
        var shine = ctx.createLinearGradient(tx, ty, tx + tw * 0.35, ty + th * 0.45);
        shine.addColorStop(0, "rgba(255,255,255,.08)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(tx + 4, ty + th * 0.12, tw * 0.14, th * 0.4);
        ctx.restore();
      }

      ctx.save();
      if (q && q.length >= 8) {
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(q[2], q[3]);
        ctx.lineTo(q[2] + 6, q[3] - 5);
        ctx.lineTo(q[0] + 4, q[1] - 6);
        ctx.closePath();
        ctx.fillStyle = "rgba(210,232,245," + (0.1 + 0.04 * Math.sin((t || 0) + i)).toFixed(3) + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(q[2], q[3]);
        ctx.lineTo(q[4], q[5]);
        ctx.lineTo(q[4] + 7, q[5] - 1);
        ctx.lineTo(q[2] + 7, q[3] - 4);
        ctx.closePath();
        ctx.fillStyle = "rgba(6,14,24,.32)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(q[6], q[7]);
        ctx.lineTo(q[4], q[5]);
        ctx.lineTo(q[4] + 3, q[5] + 9);
        ctx.lineTo(q[6] - 2, q[7] + 10);
        ctx.closePath();
        ctx.fillStyle = "rgba(4,8,12,.38)";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(q[2], q[3]);
        ctx.lineTo(q[4], q[5]);
        ctx.lineTo(q[6], q[7]);
        ctx.closePath();
        ctx.strokeStyle = "rgba(190,230,255,.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(8,16,26,.4)";
        ctx.fillRect(tx + tw - 6, ty + th * 0.1, 6, th * 0.76);
        ctx.fillStyle = "rgba(200,230,245,.14)";
        ctx.fillRect(tx + 2, ty + th * 0.07, tw - 4, 5);
        ctx.strokeStyle = "rgba(190,230,255,.42)";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tx + 2, ty + th * 0.08, tw - 4, th * 0.78);
        ctx.fillStyle = "rgba(0,0,0,.3)";
        ctx.fillRect(tx + 10, ty + th * 0.86, tw - 16, 7);
      }
      ctx.restore();

      // Floor caustic blob under each tank — skip on the photoreal floor.
      if (floorY && !(window.shopBg && shopBg.complete)) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        var cx = tx + tw * 0.5 + Math.sin(t * 0.8 + i) * 6;
        var cy = floorY + 8;
        var glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, tw * 0.45);
        glow.addColorStop(0, "rgba(90,180,220," + (0.1 + 0.05 * Math.sin(t * 1.4 + i)).toFixed(3) + ")");
        glow.addColorStop(1, "rgba(90,180,220,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(cx, cy, tw * 0.42, 10, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      }
    }
  };

  var WORLD_GW = { lon0: -71.125, lon1: -70.995, lat0: 42.31965, lat1: 42.41635 };
  // city-map.jpg is a tighter inner-harbor aerial, not the full WORLD_GW box.
  var PHOTO_GW = { lon0: -71.072, lon1: -70.994, lat0: 42.3315, lat1: 42.3865 };

  function worldToLonLat(x, y) {
    return [
      WORLD_GW.lon0 + (x / 1000) * (WORLD_GW.lon1 - WORLD_GW.lon0),
      WORLD_GW.lat1 - (y / 1000) * (WORLD_GW.lat1 - WORLD_GW.lat0),
    ];
  }
  function lonLatToPhoto(lon, lat, iw, ih) {
    return [
      ((lon - PHOTO_GW.lon0) / (PHOTO_GW.lon1 - PHOTO_GW.lon0)) * iw,
      ((PHOTO_GW.lat1 - lat) / (PHOTO_GW.lat1 - PHOTO_GW.lat0)) * ih,
    ];
  }
  function worldToPhoto(x, y, iw, ih) {
    var ll = worldToLonLat(x, y);
    return lonLatToPhoto(ll[0], ll[1], iw, ih);
  }

  var waterMask = null, waterMW = 256, waterMH = 256;
  function ensureWaterMask() {
    if (waterMask || !cityMap.complete || !cityMap.naturalWidth) return;
    try {
      var c = document.createElement("canvas");
      c.width = waterMW;
      c.height = waterMH;
      var x = c.getContext("2d");
      x.drawImage(cityMap, 0, 0, waterMW, waterMH);
      var data = x.getImageData(0, 0, waterMW, waterMH).data;
      waterMask = new Uint8Array(waterMW * waterMH);
      for (var i = 0; i < waterMask.length; i++) {
        var r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        waterMask[i] = b > 88 && b > r + 12 && g > r - 8 && r < 150 && (b + g) > r * 2.1 ? 1 : 0;
      }
    } catch (e) {
      waterMask = new Uint8Array(1);
    }
  }
  function photoIsWater(px, py, iw, ih) {
    if (!waterMask || waterMask.length < 4) return false;
    var mx = Math.max(0, Math.min(waterMW - 1, (px / iw) * waterMW | 0));
    var my = Math.max(0, Math.min(waterMH - 1, (py / ih) * waterMH | 0));
    return waterMask[my * waterMW + mx] === 1;
  }

  var cam = { left: 482, top: 472, span: 96 };
  window.townCam = cam;
  window.townToView = function (x, y, w, h) {
    return [((x - cam.left) / cam.span) * w, ((y - cam.top) / cam.span) * h];
  };

  var STREET_CHAINS = [
    ["haymarket", "shop", "salem", "prince", "oldnorth", "copps"],
    ["hanover", "square", "park"],
    ["commercial", "battery", "langone"],
    ["greenway", "prince", "prado", "hanover"],
    ["square", "lewis", "battery"],
    ["shop", "hanover"],
    ["copps", "langone"],
    ["salem", "prado"],
    ["park", "lewis"],
  ];

  function streetSegs(places) {
    var by = Object.create(null);
    if (places && places.length) {
      for (var i = 0; i < places.length; i++) {
        var p = places[i];
        if (p && p.id) by[p.id] = p;
      }
    }
    var segs = [];
    for (var c = 0; c < STREET_CHAINS.length; c++) {
      var chain = STREET_CHAINS[c];
      for (var k = 0; k < chain.length - 1; k++) {
        var a = by[chain[k]],
          b = by[chain[k + 1]];
        if (a && b && isFinite(a.x) && isFinite(b.x)) segs.push([a.x, a.y, b.x, b.y, chain[k], chain[k + 1]]);
      }
    }
    return segs;
  }

  function alongSeg(seg, t, side) {
    var x = seg[0] + (seg[2] - seg[0]) * t;
    var y = seg[1] + (seg[3] - seg[1]) * t;
    var dx = seg[2] - seg[0],
      dy = seg[3] - seg[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len,
      ny = dx / len;
    return [x + nx * side, y + ny * side];
  }

  function inHarborWater(px, py, byId) {
    if (px > 585) return true;
    if (px > 560 && py > 560) return true;
    var bat = byId && byId.battery;
    if (bat && px > bat.x + 8 && py > bat.y + 6) return true;
    return false;
  }

  window.scatterTown = function (place, idx, mode) {
    var segs = window.__townSegs;
    var px = place && place.x != null ? place.x : 528;
    var py = place && place.y != null ? place.y : 531;
    var pr = place && place.r != null ? place.r : 18;
    var h1 = ((idx * 1103515245 + 12345) >>> 0) / 4294967296;
    var h2 = ((idx * 1664525 + 1013904223) >>> 0) / 4294967296;
    if (mode === "place" || mode === "market") {
      var ang = h1 * Math.PI * 2;
      var rad = (0.18 + h2 * 0.55) * pr;
      return [px + Math.cos(ang) * rad, py + Math.sin(ang) * rad * 0.72];
    }
    if (!segs || !segs.length) {
      return [px + (h1 * 22 - 11), py + (h2 * 18 - 9)];
    }
    var seg = segs[idx % segs.length];
    var t = 0.06 + h1 * 0.88;
    var lot = mode === "home" || mode === "work";
    var side = (idx % 2 ? 1 : -1) * (lot ? 5.5 + (idx % 7) * 1.15 : 1.6 + (idx % 4) * 0.55);
    return alongSeg(seg, t, side);
  };

  function hash01(i, salt) {
    var n = ((i + 1) * 2654435761 + (salt || 0) * 1597334677) >>> 0;
    return n / 4294967296;
  }

  function drawMiniPerson(ctx, x, y, size, color, moving, walk) {
    ctx.save();
    ctx.fillStyle = "rgba(8,4,0,.32)";
    ctx.beginPath();
    ctx.ellipse(x + 0.4, y + 0.6, size * 0.32, size * 0.12, 0, 0, 7);
    ctx.fill();
    var bob = moving ? Math.sin(((walk || 0) % 1) * Math.PI * 2) * size * 0.08 : 0;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.32 + bob, size * 0.2, size * 0.42, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - size * 0.7 + bob, Math.max(1.1, size * 0.16), 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function hourOfDay() {
    try {
      if (typeof gameState === "object" && gameState && isFinite(gameState.t))
        return (((gameState.t % 2400) + 2400) % 2400) / 100;
    } catch (e) {}
    try {
      if (typeof jt === "function") return jt() * 24;
    } catch (e2) {}
    var d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  function drawCruiser(ctx, x, y, ang, pulse) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = "#d8dde4";
    ctx.fillRect(-11, -5, 22, 10);
    ctx.fillStyle = "#1a2330";
    ctx.fillRect(-7, -4.2, 9, 8.4);
    ctx.fillStyle = pulse > 0.5 ? "#d02030" : "#2040d0";
    ctx.fillRect(-2, -6.2, 7, 2.4);
    ctx.fillStyle = pulse > 0.5 ? "#2040d0" : "#d02030";
    ctx.fillRect(-2, 3.8, 7, 2.4);
    ctx.fillStyle = "#0b1018";
    ctx.beginPath();
    ctx.arc(-6, 5.6, 2.1, 0, 7);
    ctx.arc(6, 5.6, 2.1, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  window.paintTownMap = function (ctx, w, h, H, shop, places, selected, colors, jobs) {
    if (!ctx || !w || !h) return;
    window.__townPlaces = places;
    window.__townSegs = streetSegs(places);
    var sx = shop && shop.x != null ? shop.x : 528;
    var sy = shop && shop.y != null ? shop.y : 531;
    cam.span = 96;
    cam.left = sx - cam.span * 0.42;
    cam.top = sy - cam.span * 0.52;
    window.townCam = cam;

    var reduced = false;
    try {
      reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {}
    var now = typeof performance !== "undefined" ? performance.now() : Date.now();
    var hour = hourOfDay();
    var night = hour < 5.5 || hour > 20.5;
    var dusk = (hour >= 5.5 && hour < 8) || (hour >= 17.5 && hour <= 20.5);
    var fleeingWorld = window.__fleeUntil > now || window.__gunFlash > 0.04;
    if (!window.__gunSiren && window.__gunSirenAt && now > window.__gunSirenAt) window.__gunSiren = 1;
    var shaken = false;
    if (!reduced && window.__gunShake > 0.02) {
      var sh = window.__gunShake * window.__gunShake;
      ctx.save();
      shaken = true;
      ctx.translate((Math.random() - 0.5) * sh * 16, (Math.random() - 0.5) * sh * 12);
      window.__gunShake *= 0.86;
    }
    ctx.fillStyle = "#07141e";
    ctx.fillRect(0, 0, w, h);
    if (cityMap.complete && cityMap.naturalWidth) {
      var iw = cityMap.naturalWidth,
        ih = cityMap.naturalHeight;
      ensureWaterMask();
      var nw = worldToPhoto(cam.left, cam.top, iw, ih);
      var se = worldToPhoto(cam.left + cam.span, cam.top + cam.span, iw, ih);
      var srcX = nw[0],
        srcY = nw[1],
        srcW = se[0] - nw[0],
        srcH = se[1] - nw[1];
      if (!(srcW > 12 && srcH > 12)) {
        var shopP = worldToPhoto(sx, sy, iw, ih);
        srcW = iw * 0.15;
        srcH = ih * 0.15;
        srcX = shopP[0] - srcW * 0.42;
        srcY = shopP[1] - srcH * 0.52;
      }
      if (srcX < 0) {
        srcW += srcX;
        srcX = 0;
      }
      if (srcY < 0) {
        srcH += srcY;
        srcY = 0;
      }
      if (srcX + srcW > iw) srcW = iw - srcX;
      if (srcY + srcH > ih) srcH = ih - srcY;
      if (srcW > 8 && srcH > 8) ctx.drawImage(cityMap, srcX, srcY, srcW, srcH, 0, 0, w, h);
      var wash = night ? 0.42 : dusk ? 0.22 : 0.1;
      ctx.fillStyle = night ? "rgba(4,10,22," + wash + ")" : "rgba(6,16,28," + wash + ")";
      ctx.fillRect(0, 0, w, h);
    }
    if (window.__gunFlash > 0.02) {
      ctx.fillStyle = "rgba(255,244,210," + (window.__gunFlash * 0.55).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
      var ring = (1 - window.__gunFlash) * Math.max(24, w * 0.22);
      ctx.strokeStyle = "rgba(255,250,230," + (window.__gunFlash * 0.7).toFixed(3) + ")";
      ctx.lineWidth = 3;
      ctx.beginPath();
      var shopV0 = toVSafe(sx, sy, w, h);
      ctx.arc(shopV0[0], shopV0[1], ring, 0, 7);
      ctx.stroke();
      window.__gunFlash *= 0.84;
    }
    if (window.__gunSiren) {
      var pulse = 0.5 + 0.5 * Math.sin(now / 180);
      ctx.fillStyle = "rgba(180,20,30," + (0.07 * pulse).toFixed(3) + ")";
      ctx.fillRect(0, 0, w * 0.5, h);
      ctx.fillStyle = "rgba(20,40,180," + (0.07 * (1 - pulse)).toFixed(3) + ")";
      ctx.fillRect(w * 0.5, 0, w * 0.5, h);
    }

    function toVSafe(x, y, ww, hh) {
      return [((x - cam.left) / cam.span) * ww, ((y - cam.top) / cam.span) * hh];
    }
    function toV(x, y) {
      return [((x - cam.left) / cam.span) * w, ((y - cam.top) / cam.span) * h];
    }

    var byId = Object.create(null);
    if (places && places.length) {
      for (var p0 = 0; p0 < places.length; p0++) {
        var pl0 = places[p0];
        if (pl0 && pl0.id) byId[pl0.id] = pl0;
      }
    }
    var segs = window.__townSegs || [];

    if (segs.length) {
      ctx.save();
      ctx.strokeStyle = night ? "rgba(255,214,140,.16)" : "rgba(255,228,180,.2)";
      ctx.lineWidth = Math.max(2.2, w * 0.007);
      ctx.lineCap = "round";
      ctx.beginPath();
      for (var sg = 0; sg < segs.length; sg++) {
        var a = toV(segs[sg][0], segs[sg][1]);
        var b = toV(segs[sg][2], segs[sg][3]);
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (places && places.length) {
      ctx.font = "600 " + Math.max(9, Math.round(w * 0.018)) + "px Nunito, sans-serif";
      ctx.textAlign = "center";
      for (var p = 0; p < places.length; p++) {
        var pl = places[p];
        if (!pl || pl.id === "sea") continue;
        var q = pl.q;
        if (q && q !== "ne" && q !== "dt" && pl.id !== "shop") continue;
        var xy = toV(pl.x, pl.y);
        if (xy[0] < 8 || xy[0] > w - 8 || xy[1] < 8 || xy[1] > h - 8) continue;
        if (pl.id === "shop") {
          ctx.save();
          ctx.fillStyle = "rgba(244,196,83,.22)";
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], Math.max(9, w * 0.022), 0, 7);
          ctx.fill();
          ctx.strokeStyle = "rgba(244,196,83,.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#f4c453";
          ctx.beginPath();
          ctx.moveTo(xy[0], xy[1] - w * 0.028);
          ctx.lineTo(xy[0] - 4, xy[1] - 4);
          ctx.lineTo(xy[0] + 4, xy[1] - 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#f4c453";
          ctx.fillText("Fin's", xy[0], xy[1] - w * 0.034);
          ctx.restore();
        } else if (w > 220) {
          ctx.fillStyle = "rgba(8,12,18,.55)";
          var tw = ctx.measureText(pl.n).width + 10;
          ctx.fillRect(xy[0] - tw / 2, xy[1] - 15, tw, 12);
          ctx.fillStyle = "rgba(230,236,242,.86)";
          ctx.fillText(pl.n, xy[0], xy[1] - 5);
        }
      }
    }

    var toShopCap = 0;
    var idleCap = 0;
    var homeCap = 0;
    var workCap = 0;
    var walkCap = 0;
    var shopInside = 0;

    if (H && H.n) {
      var n = H.n;
      var step = n > 1200 ? Math.ceil(n / 900) : 1;
      var folk = typeof window.folkDraw === "function";
      var drawn = 0;
      var cap = night ? 70 : 110;
      for (var i = 0; i < n; i += step) {
        var st = H.st[i];
        if (st === 8) continue;
        var px = H.x[i],
          py = H.y[i];
        var spd = H.vx && H.vy ? Math.hypot(H.vx[i] || 0, H.vy[i] || 0) : 0;
        var run = fleeingWorld && (st === 7 || st === 1 || st === 3 || st === 5 || spd > 10);
        var job = jobs && jobs[H.job[i]];
        var workId = job && job.work;
        var workPl = workId && byId[workId];
        var homePl = null;
        if (job && job.homes && places) {
          var seedH = (H.who && H.who[i]) >>> 0;
          var cand = [];
          for (var hp = 0; hp < places.length; hp++) {
            var plc = places[hp];
            if (plc && plc.q === "ne") cand.push(plc);
          }
          if (cand.length) homePl = cand[seedH % cand.length];
        }
        if (!run) {
          if (st === 6) {
            if (shopInside > (night ? 2 : 8)) continue;
            var inside = window.scatterTown({ x: sx, y: sy, r: 7 }, i, "place");
            px = inside[0];
            py = inside[1];
            shopInside++;
          } else if (st === 0) {
            if (night && homeCap > 28) continue;
            if (!night && homeCap > 18) continue;
            var homeAt = homePl || byId.copps || { x: sx - 28, y: sy - 22, r: 22 };
            var home = window.scatterTown(homeAt, i, "home");
            px = home[0];
            py = home[1];
            homeCap++;
          } else if (st === 2) {
            if (workCap > 22) continue;
            var wrkAt = workPl || byId.haymarket || { x: sx + 18, y: sy + 16, r: 16 };
            var wrk = window.scatterTown(wrkAt, i + 3, "work");
            px = wrk[0];
            py = wrk[1];
            workCap++;
          } else if (st === 4) {
            var mkt = byId.haymarket || byId.faneuil || { x: sx - 12, y: sy + 24, r: 20 };
            var idle = window.scatterTown(mkt, i, "market");
            px = idle[0];
            py = idle[1];
          } else if (st === 7) {
            if (idleCap > (night ? 8 : 16)) continue;
            var parks = [byId.prado, byId.langone, byId.park, byId.greenway, byId.copps].filter(Boolean);
            var park = parks.length ? parks[i % parks.length] : { x: sx + 10, y: sy - 18, r: 14 };
            var idl = window.scatterTown(park, i, "place");
            px = idl[0];
            py = idl[1];
            idleCap++;
          } else if (st === 5) {
            if (toShopCap > (night ? 3 : 6)) continue;
            if (segs.length) {
              var toward = segs[0];
              for (var si = 0; si < segs.length; si++) {
                if (segs[si][4] === "salem" || segs[si][5] === "shop" || segs[si][4] === "shop") {
                  toward = segs[si];
                  break;
                }
              }
              var tt = 0.18 + (toShopCap * 0.12) % 0.7;
              var on = alongSeg(toward, tt, (toShopCap % 2 ? 1 : -1) * 1.6);
              px = on[0];
              py = on[1];
            }
            toShopCap++;
          } else if (st === 1 || st === 3) {
            var walkMax = night ? 8 : (hour >= 7 && hour < 9.5) || (hour >= 16.5 && hour < 18.5) ? 28 : 18;
            if (walkCap > walkMax) continue;
            if (segs.length) {
              var walkSeg = segs[(i * 3) % segs.length];
              var wt = ((now / 14000 + hash01(i, 9)) % 1);
              if (H.vx && H.vx[i] < 0) wt = 1 - wt;
              var onW = alongSeg(walkSeg, 0.08 + wt * 0.84, (i % 2 ? 1 : -1) * 1.7);
              px = onW[0];
              py = onW[1];
            }
            walkCap++;
          }
        }
        var distShop = Math.hypot(px - sx, py - sy);
        if (!run && st !== 5 && st !== 6 && distShop < 9) continue;
        if (!run && inHarborWater(px, py, byId)) continue;
        if (cityMap.complete && cityMap.naturalWidth) {
          var pxy = worldToPhoto(px, py, cityMap.naturalWidth, cityMap.naturalHeight);
          if (photoIsWater(pxy[0], pxy[1], cityMap.naturalWidth, cityMap.naturalHeight)) continue;
        }
        var v = toV(px, py);
        if (v[0] < -8 || v[0] > w + 8 || v[1] < -8 || v[1] > h + 8) continue;
        if (drawn > cap && !run && st !== 5 && st !== 6) continue;
        drawn++;
        var coming = st === 5 || st === 6;
        var near = distShop < 16 || st === 6;
        var size = coming || run ? Math.max(14, w * 0.03) : near ? Math.max(11, w * 0.024) : Math.max(8, w * 0.016);
        var moving = st === 1 || st === 3 || st === 5 || run;
        var face = H.vx && H.vx[i] < 0 ? -1 : 1;
        var walk = (i * 0.17 + (H.t || 0) * (moving ? (run ? 3.4 : 1.6) : 0)) % 2;
        var jid = job && job.id ? job.id : "";
        var kit = "";
        if (/fisher|hand|netter|ship|cooper|diver|longshore/.test(jid)) kit = "work";
        else if (/dealer|clerk|bank|lawyer|doctor|factor/.test(jid)) kit = "suit";
        else if ((H.who[i] >>> 0) % 11 === 0) kit = "kid";
        else if ((H.who[i] >>> 0) % 9 === 0) kit = "elder";
        var col = run ? "#e8d4b0" : coming ? "#f4c453" : colors && colors[st] ? colors[st] : "#c9b89a";
        var useFolk = folk && (coming || run || (near && size >= 22)) && drawn < 28;
        if (useFolk) {
          try {
            window.folkDraw(
              ctx,
              v[0],
              v[1],
              size * 1.15,
              col,
              walk,
              false,
              face,
              moving,
              {
                id: "map:" + i,
                seed: (H.who && H.who[i]) >>> 0,
                fem: ((H.who && H.who[i]) >>> 18 & 1) === 1,
                kit: kit,
                stoop: st === 0 && !run && (i % 17 === 0),
              }
            );
          } catch (e) {
            folk = false;
            drawMiniPerson(ctx, v[0], v[1], size, col, moving, walk);
          }
        } else {
          drawMiniPerson(ctx, v[0], v[1], size, col, moving, walk);
        }
        if (run && drawn < 40) {
          ctx.fillStyle = "rgba(255,244,210,.85)";
          ctx.font = "700 " + Math.max(8, Math.round(w * 0.016)) + "px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("!", v[0], v[1] - size * 1.15);
        }
      }
    }

    if (window.__gunSiren) {
      var segs2 = window.__townSegs || [];
      var pulse2 = (now / 180) % 1;
      var drive = ((now / 5500) % 1);
      var cruiserXY = [sx - 18, sy + 6];
      if (segs2.length) {
        var sg2 = segs2[0];
        cruiserXY = alongSeg(sg2, 0.15 + drive * 0.55, 0);
      }
      var cv = toV(cruiserXY[0], cruiserXY[1]);
      var ang = segs2.length ? Math.atan2(segs2[0][3] - segs2[0][1], segs2[0][2] - segs2[0][0]) : 0.2;
      drawCruiser(ctx, cv[0], cv[1], ang, pulse2);
    }

    if (selected >= 0 && H && selected < H.n) {
      var sv = toV(H.x[selected], H.y[selected]);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sv[0], sv[1], 11, 0, 7);
      ctx.stroke();
    }

    if (!reduced && segs.length && !night) {
      ctx.fillStyle = "rgba(40,48,56,.85)";
      for (var car = 0; car < 5; car++) {
        var cs = segs[(car * 2) % segs.length];
        var ct = (now / (9000 + car * 1100) + hash01(car, 4)) % 1;
        var cxy = alongSeg(cs, 0.1 + ct * 0.8, 0);
        var cvp = toV(cxy[0], cxy[1]);
        ctx.save();
        ctx.translate(cvp[0], cvp[1]);
        var cang = Math.atan2(cs[3] - cs[1], cs[2] - cs[0]);
        ctx.rotate(cang);
        ctx.fillRect(-5, -2.2, 10, 4.4);
        ctx.fillStyle = "#d8c48a";
        ctx.fillRect(2.2, -1.4, 2.2, 1.1);
        ctx.fillStyle = "rgba(40,48,56,.85)";
        ctx.restore();
      }
    }

    ctx.fillStyle = "rgba(8,14,22,.66)";
    ctx.fillRect(0, h - 28, w, 28);
    ctx.fillStyle = fleeingWorld || window.__gunSiren ? "#f4c453" : "rgba(230,236,242,.82)";
    ctx.font = "600 " + Math.max(10, Math.round(w * 0.02)) + "px Nunito, sans-serif";
    ctx.textAlign = "left";
    var clock = Math.floor(hour);
    var mins = Math.floor((hour - clock) * 60);
    var hhmm = (clock < 10 ? "0" : "") + clock + ":" + (mins < 10 ? "0" : "") + mins;
    ctx.fillText(
      window.__gunSiren
        ? "North End · a cruiser on Salem Street"
        : fleeingWorld
          ? "North End · people running"
          : "North End · " + hhmm + (night ? " · quiet streets" : dusk ? " · the light going" : hour >= 11.4 && hour < 13.8 ? " · lunch on the street" : " · people at work"),
      10,
      h - 10
    );
    if (shaken) ctx.restore();
  };
})();
