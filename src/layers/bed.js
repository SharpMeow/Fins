/* bed.js — the rocks and the back row of plants on the tank bed.

   Two corrections to what fins.js draws in the Tank scene, made from outside because fins.js is a
   bundle built elsewhere. Both watch the tank's own 2D context for one specific draw and leave
   every other call alone; if fins.js changes and the draw no longer matches, nothing here fires
   and the tank draws exactly as fins.js says.

   1. Rocks came out red. fins.js paints a slate texture on each rock from three hsl() colours,
      but its colour parser (TB) only reads hex, so "hsl(213,12%,37%)" became rgb(213,12,37):
      measured texture rgb(168-180, 9-10, 26-31). The texture is a flat colour times a noise
      shade, so each texel's red channel over the palette hue gives the shade back, and green and
      blue give saturation and lightness; the texel is rebuilt as the slate it was meant to be.
      The hue comes from the rock's own base fill, set just before the texture is drawn. The real
      fix is in fins.js's source: TB has to read hsl().

   2. The plants are flat, saturated strokes on a hazy painted reef, and the back row, drawn at
      34% opacity, read as thin ghost lines across the coral. They are drawn the way distance
      looks under water instead: the near rows a little cooler and less saturated, the back row
      softer and darker still. Only the picture changes; the plants still exist for the fish
      exactly as before. */
(function () {
  "use strict";

  var patched = null;
  /* Water between the glass and a plant cools and hazes it, as it does the painted reef behind;
     the back row more. Applied to the colours the plant is drawn with, not as a canvas filter:
     a filter renders every draw through its own layer and measured 3.4x the frame time (516 ms
     against 150 ms a frame, software rendering). Picked by eye against the reef; much stronger
     than NEAR turns the plants grey. */
  var NEAR = { s: 0.72, l: 0.86, h: 8 };
  var BACK = { s: 0.55, l: 0.62, h: 12 };
  var haze = null;
  var hazeDepth = -1;
  var depth = 0;
  var fixed = new WeakMap();

  function floorY() {
    try {
      return typeof window.floorY === "number" ? window.floorY : NaN;
    } catch (e) {
      return NaN;
    }
  }

  function hexToHsl(s) {
    var m = /^#([0-9a-f]{6})$/i.exec(String(s || ""));
    if (!m) return null;
    var n = parseInt(m[1], 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, sat = 0;
    if (max !== min) {
      var d = max - min;
      sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, sat * 100, l * 100];
  }

  function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    var a = s * Math.min(l, 1 - l);
    function f(n) {
      var k = (n + h / 30) % 12;
      return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255;
    }
    return [f(0), f(8), f(4)];
  }

  /* The rock's base fill is hsl(205 + c*25, 10%, 16 + c*10%); its texture palette hues are
     203 + c*22, 208 + c*22 and 198 + c*30, which average 203 + c*24.7. */
  function paletteHue(fillStyle) {
    var hsl = hexToHsl(fillStyle);
    var c = hsl ? Math.max(0, Math.min(1, (hsl[2] - 16) / 10)) : 0.5;
    return 203 + c * 24.7;
  }

  function slate(src, hue) {
    var o = document.createElement("canvas");
    o.width = src.width;
    o.height = src.height;
    var g = o.getContext("2d", { willReadFrequently: true });
    g.drawImage(src, 0, 0);
    var im = g.getImageData(0, 0, o.width, o.height);
    var d = im.data;
    for (var i = 0; i < d.length; i += 4) {
      var shade = Math.max(0.05, d[i] / hue);
      var rgb = hslToRgb(hue, Math.min(100, d[i + 1] / shade), Math.min(100, d[i + 2] / shade));
      d[i] = rgb[0] * shade;
      d[i + 1] = rgb[1] * shade;
      d[i + 2] = rgb[2] * shade;
    }
    g.putImageData(im, 0, 0);
    return o;
  }

  function isRockTexture(ctx, img, a) {
    if (a.length !== 4 || !(img instanceof HTMLCanvasElement)) return false;
    if (Math.abs(ctx.globalAlpha - 0.85) > 1e-6) return false;
    var fy = floorY();
    return isFinite(fy) && Math.abs(a[1] + a[3] / 1.02 - (fy + 4)) < 0.5;
  }

  function toHsla(c) {
    var m = /^hsla?\(\s*(-?[\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
    if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
    m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
    var rgbHex = null;
    if (m) rgbHex = "#" + [m[1], m[2], m[3]].map(function (v) { return ("0" + Math.round(+v).toString(16)).slice(-2); }).join("");
    else if (/^#[0-9a-f]{6}$/i.test(c)) rgbHex = c;
    if (!rgbHex) return null;
    var hsl = hexToHsl(rgbHex);
    return hsl ? [hsl[0], hsl[1], hsl[2], m && m[4] != null ? +m[4] : 1] : null;
  }

  function hazed(c, k) {
    var p = toHsla(c);
    if (!p) return c;
    return "hsla(" + (p[0] + k.h).toFixed(1) + "," + (p[1] * k.s).toFixed(1) + "%," + (p[2] * k.l).toFixed(1) + "%," + p[3] + ")";
  }

  /* Gradient stops set while a plant is being drawn are hazed too: the plant fills are gradients. */
  (function () {
    var add = CanvasGradient.prototype.addColorStop;
    CanvasGradient.prototype.addColorStop = function (offset, color) {
      return add.call(this, offset, haze && typeof color === "string" ? hazed(color, haze) : color);
    };
  })();

  function patch(ctx) {
    var drawImage = ctx.drawImage;
    ctx.drawImage = function (img) {
      var a = Array.prototype.slice.call(arguments, 1);
      if (isRockTexture(this, img, a)) {
        try {
          var hue = paletteHue(this.fillStyle);
          var key = Math.round(hue);
          var byHue = fixed.get(img);
          if (!byHue) {
            byHue = {};
            fixed.set(img, byHue);
          }
          if (!byHue[key]) byHue[key] = slate(img, hue);
          return drawImage.call(this, byHue[key], a[0], a[1], a[2], a[3]);
        } catch (e) {}
      }
      return drawImage.apply(this, arguments);
    };

    /* fins.js draws each plant as save(); translate(x, floorY + 2); ... restore(), the back row
       at globalAlpha .34. Between that translate and its restore, colours go through haze. */
    var save = ctx.save;
    var restore = ctx.restore;
    var translate = ctx.translate;
    ctx.save = function () {
      depth++;
      return save.apply(this, arguments);
    };
    ctx.restore = function () {
      if (depth === hazeDepth) {
        haze = null;
        hazeDepth = -1;
      }
      depth--;
      return restore.apply(this, arguments);
    };
    ctx.translate = function (x, y) {
      var r = translate.apply(this, arguments);
      try {
        var fy = floorY();
        if (!haze && isFinite(fy) && Math.abs(y - (fy + 2)) < 0.01) {
          if (Math.abs(this.globalAlpha - 0.34) < 1e-6) haze = BACK;
          else if (Math.abs(this.globalAlpha - 1) < 1e-6) haze = NEAR;
          if (haze) hazeDepth = depth;
        }
      } catch (e) {}
      return r;
    };
    ["fillStyle", "strokeStyle"].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, prop);
      if (!d || !d.set) return;
      Object.defineProperty(ctx, prop, {
        configurable: true,
        get: function () {
          return d.get.call(this);
        },
        set: function (v) {
          d.set.call(this, haze && typeof v === "string" ? hazed(v, haze) : v);
        },
      });
    });
    patched = ctx;
  }

  function tick() {
    try {
      var tank = document.getElementById("tank");
      var ctx = tank && tank.getContext && tank.getContext("2d");
      if (ctx && ctx !== patched) patch(ctx);
    } catch (e) {}
  }

  if (window.__onBeat) window.__onBeat(tick, 500);
  else
    (function loop() {
      tick();
      setTimeout(loop, 500);
    })();
})();
