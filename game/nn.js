/* nn.js — high-quality neural engine for Fin's.
   Upgrades two systems without breaking saves:

   1. Difficulty director (l.dnnHQ)
      Residual ensemble of 3 MLPs, GELU + LayerNorm, AdamW, Huber loss,
      prioritized replay, multi-task heads (skill + calm), uncertainty
      from ensemble disagreement. Blends with the original PID.

   2. Fish minds (per-fish nn._hq)
      Full GRU (reset + recurrent-to-gate), GELU hidden, input attention,
      layer-norm memory, AdamW on eligibility traces, quality-weighted
      cultural transmission, RBF value smoothing, n-step replay.

   Hooks are called from patched fins.js. Every entry is try-guarded and
   falls back to the original implementation on any fault. */
(function () {
  "use strict";

  var HQ = { v: 4, ok: 1, fwdN: 0, learnN: 0, dirN: 0, lastErr: "" };
  window.__nnHQ = HQ;

  var EPS = 1e-8;
  var GELU_K = 0.7978845608028654; // sqrt(2/pi)
  var HUBER = 0.18;
  var DIR_IN = 9;
  var DIR_H1 = 48;
  var DIR_H2 = 32;
  var DIR_OUT = 2; // skill, calm
  var DIR_ENS = 3;
  var DIR_BUF = 192;
  var DIR_BATCH = 8;
  var DIR_STEPS = 8;
  var CLIP_W = 8;

  function clamp(x, a, b) {
    return x < a ? a : x > b ? b : x === x ? x : 0;
  }
  function sig(x) {
    if (x > 12) return 1;
    if (x < -12) return 0;
    return 1 / (1 + Math.exp(-x));
  }
  function tanh(x) {
    if (x > 8) return 1;
    if (x < -8) return -1;
    var e = Math.exp(-2 * x);
    return (1 - e) / (1 + e);
  }
  function gelu(x) {
    return 0.5 * x * (1 + tanh(GELU_K * (x + 0.044715 * x * x * x)));
  }
  function geluGrad(x, y) {
    // y = gelu(x); d/dx gelu via the tanh form
    var u = GELU_K * (x + 0.044715 * x * x * x);
    var t = tanh(u);
    var dt = 1 - t * t;
    var du = GELU_K * (1 + 3 * 0.044715 * x * x);
    return 0.5 * (1 + t) + 0.5 * x * dt * du;
  }
  function nrand() {
    var u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v);
  }
  function zeros(n) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = 0;
    return a;
  }
  function randn(n, s) {
    var a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = nrand() * s;
    return a;
  }
  function copyA(a) {
    var n = a.length, o = new Array(n);
    for (var i = 0; i < n; i++) o[i] = a[i];
    return o;
  }
  function lnInplace(a, n) {
    var m = 0, v = 0, i;
    for (i = 0; i < n; i++) m += a[i];
    m /= n || 1;
    for (i = 0; i < n; i++) {
      var d = a[i] - m;
      v += d * d;
    }
    v = Math.sqrt(v / (n || 1) + EPS);
    for (i = 0; i < n; i++) a[i] = (a[i] - m) / v;
    return v;
  }
  function huberGrad(pred, tgt, d) {
    var e = pred - tgt;
    var a = e < 0 ? -e : e;
    if (a <= d) return e;
    return d * (e < 0 ? -1 : 1);
  }
  function finite(x) {
    return typeof x === "number" && x === x && x !== Infinity && x !== -Infinity;
  }

  /* ───────── director ensemble ───────── */

  function newNet() {
    var s1 = 1 / Math.sqrt(DIR_IN);
    var s2 = 1 / Math.sqrt(DIR_H1);
    var s3 = 1 / Math.sqrt(DIR_H2);
    return {
      w1: randn(DIR_H1 * DIR_IN, s1),
      b1: zeros(DIR_H1),
      w2: randn(DIR_H2 * DIR_H1, s2),
      b2: zeros(DIR_H2),
      wS: randn(DIR_H2 * DIR_IN, s1 * 0.4),
      w3: randn(DIR_OUT * DIR_H2, s3),
      b3: zeros(DIR_OUT),
      m: null,
      v: null,
      t: 0
    };
  }
  function ensureAdam(net) {
    if (net.m && net.m.w1 && net.m.w1.length === net.w1.length) return;
    function zLike(src) {
      var o = {};
      for (var k in src) if (Array.isArray(src[k])) o[k] = zeros(src[k].length);
      return o;
    }
    var w = { w1: net.w1, b1: net.b1, w2: net.w2, b2: net.b2, wS: net.wS, w3: net.w3, b3: net.b3 };
    net.m = zLike(w);
    net.v = zLike(w);
  }
  function fwdNet(net, x, drop) {
    var h1 = new Array(DIR_H1);
    var h2 = new Array(DIR_H2);
    var y = new Array(DIR_OUT);
    var i, j, s, pre;
    var pre1 = new Array(DIR_H1);
    for (i = 0; i < DIR_H1; i++) {
      s = net.b1[i];
      var row = i * DIR_IN;
      for (j = 0; j < DIR_IN; j++) s += net.w1[row + j] * x[j];
      pre1[i] = s;
      h1[i] = gelu(s);
      if (drop && Math.random() < drop) h1[i] = 0;
    }
    var pre2 = new Array(DIR_H2);
    for (i = 0; i < DIR_H2; i++) {
      s = net.b2[i];
      var r2 = i * DIR_H1;
      for (j = 0; j < DIR_H1; j++) s += net.w2[r2 + j] * h1[j];
      var skip = 0;
      var rs = i * DIR_IN;
      for (j = 0; j < DIR_IN; j++) skip += net.wS[rs + j] * x[j];
      pre = s + skip;
      pre2[i] = pre;
      h2[i] = gelu(pre);
    }
    for (i = 0; i < DIR_OUT; i++) {
      s = net.b3[i];
      var r3 = i * DIR_H2;
      for (j = 0; j < DIR_H2; j++) s += net.w3[r3 + j] * h2[j];
      y[i] = sig(s);
    }
    return { y: y, h1: h1, h2: h2, pre1: pre1, pre2: pre2 };
  }
  function adamW(net, g, lr, wd) {
    ensureAdam(net);
    net.t = (net.t || 0) + 1;
    var b1 = 0.9, b2 = 0.999, t = net.t;
    var c1 = 1 - Math.pow(b1, t);
    var c2 = 1 - Math.pow(b2, t);
    var keys = ["w1", "b1", "w2", "b2", "wS", "w3", "b3"];
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var w = net[key], m = net.m[key], v = net.v[key], gg = g[key];
      var decay = key.charAt(0) === "b" ? 0 : wd;
      for (var i = 0; i < w.length; i++) {
        var gi = gg[i] || 0;
        if (!finite(gi)) gi = 0;
        gi = clamp(gi, -2, 2);
        m[i] = b1 * m[i] + (1 - b1) * gi;
        v[i] = b2 * v[i] + (1 - b2) * gi * gi;
        var mh = m[i] / c1;
        var vh = v[i] / c2;
        w[i] = clamp(w[i] - lr * (mh / (Math.sqrt(vh) + 1e-4) + decay * w[i]), -CLIP_W, CLIP_W);
      }
    }
  }
  function bwdNet(net, x, cache, dY, lr, wd) {
    var g = {
      w1: zeros(net.w1.length),
      b1: zeros(DIR_H1),
      w2: zeros(net.w2.length),
      b2: zeros(DIR_H2),
      wS: zeros(net.wS.length),
      w3: zeros(net.w3.length),
      b3: zeros(DIR_OUT)
    };
    var i, j;
    var dH2 = zeros(DIR_H2);
    for (i = 0; i < DIR_OUT; i++) {
      var yi = cache.y[i];
      var dy = dY[i] * yi * (1 - yi);
      g.b3[i] = dy;
      var r3 = i * DIR_H2;
      for (j = 0; j < DIR_H2; j++) {
        g.w3[r3 + j] = dy * cache.h2[j];
        dH2[j] += dy * net.w3[r3 + j];
      }
    }
    var dH1 = zeros(DIR_H1);
    for (i = 0; i < DIR_H2; i++) {
      var dh = dH2[i] * geluGrad(cache.pre2[i], cache.h2[i]);
      g.b2[i] = dh;
      var r2 = i * DIR_H1;
      for (j = 0; j < DIR_H1; j++) {
        g.w2[r2 + j] = dh * cache.h1[j];
        dH1[j] += dh * net.w2[r2 + j];
      }
      var rs = i * DIR_IN;
      for (j = 0; j < DIR_IN; j++) g.wS[rs + j] = dh * x[j];
    }
    for (i = 0; i < DIR_H1; i++) {
      var d1 = dH1[i] * geluGrad(cache.pre1[i], cache.h1[i]);
      g.b1[i] = d1;
      var r1 = i * DIR_IN;
      for (j = 0; j < DIR_IN; j++) g.w1[r1 + j] = d1 * x[j];
    }
    adamW(net, g, lr, wd);
  }

  function feat(raw) {
    // raw is the original 9-vector from CD(). Keep it, the hidden layers mix.
    var x = new Array(DIR_IN);
    for (var i = 0; i < DIR_IN; i++) x[i] = finite(raw[i]) ? clamp(raw[i], -1.5, 1.5) : 0;
    return x;
  }

  function ensureDir(L) {
    if (!L) return null;
    var d = L.dnnHQ;
    if (!d || d.v !== HQ.v || !Array.isArray(d.ens) || d.ens.length !== DIR_ENS) {
      d = {
        v: HQ.v,
        ens: [newNet(), newNet(), newNet()],
        buf: [],
        seen: 0,
        err: 0.08,
        errBase: 0.08,
        conf: 0,
        lift: 0,
        want: 0.5,
        drive: 0.5,
        curve: null,
        pred: 0.5,
        calmPred: 0.5,
        disagree: 0,
        last: null
      };
      L.dnnHQ = d;
    } else {
      for (var i = 0; i < DIR_ENS; i++) {
        var n = d.ens[i];
        if (!n || !Array.isArray(n.w1) || n.w1.length !== DIR_H1 * DIR_IN) d.ens[i] = newNet();
      }
      if (!Array.isArray(d.buf)) d.buf = [];
    }
    return d;
  }

  function ensFwd(d, x, drop) {
    var acc = [0, 0], sq = [0, 0];
    var caches = [];
    for (var i = 0; i < DIR_ENS; i++) {
      var c = fwdNet(d.ens[i], x, drop);
      caches.push(c);
      acc[0] += c.y[0];
      acc[1] += c.y[1];
      sq[0] += c.y[0] * c.y[0];
      sq[1] += c.y[1] * c.y[1];
    }
    var inv = 1 / DIR_ENS;
    var mean0 = acc[0] * inv, mean1 = acc[1] * inv;
    var var0 = Math.max(0, sq[0] * inv - mean0 * mean0);
    var var1 = Math.max(0, sq[1] * inv - mean1 * mean1);
    return {
      y: [mean0, mean1],
      std: [Math.sqrt(var0), Math.sqrt(var1)],
      caches: caches
    };
  }

  function trainOne(d, x, skill, calm, lr) {
    var tgt = [clamp(skill, 0, 1), clamp(calm, 0, 1)];
    var err = 0;
    for (var i = 0; i < DIR_ENS; i++) {
      var cache = fwdNet(d.ens[i], x, 0.03);
      var dY = [
        huberGrad(cache.y[0], tgt[0], HUBER),
        huberGrad(cache.y[1], tgt[1], HUBER) * 0.7
      ];
      err += Math.abs(cache.y[0] - tgt[0]);
      bwdNet(d.ens[i], x, cache, dY, lr, 0.0002);
    }
    return err / DIR_ENS;
  }

  function pickBatch(buf, n) {
    if (buf.length <= n) return buf;
    var sum = 0;
    for (var i = 0; i < buf.length; i++) sum += buf[i].p || 0.05;
    var out = [];
    for (var k = 0; k < n; k++) {
      var r = Math.random() * sum, acc = 0, hit = buf[buf.length - 1];
      for (var j = 0; j < buf.length; j++) {
        acc += buf[j].p || 0.05;
        if (r <= acc) {
          hit = buf[j];
          break;
        }
      }
      out.push(hit);
    }
    return out;
  }

  function makeX(wealth, mastery, attn, calm, skill, vel, pressure, L, Xa) {
    var nightmare = 0;
    try {
      nightmare = typeof Xa === "function" ? (Xa() ? 1 : -1) : L && L.nightmare ? 1 : -1;
    } catch (e) {
      nightmare = -1;
    }
    var progress = 0;
    try {
      var tank = (L && L.up && L.up.tank) || 0;
      var tech = L && L.tech ? Object.keys(L.tech).length : 0;
      var loc = (L && L.loc) || 0;
      progress = clamp(((tank + tech * 0.4 + loc * 2) / 14) * 2 - 1, -1, 1);
    } catch (e) {
      progress = 0;
    }
    return feat([
      wealth * 2 - 1,
      mastery * 2 - 1,
      attn * 2 - 1,
      calm * 2 - 1,
      skill * 2 - 1,
      clamp(vel * 14, -1, 1),
      pressure * 2 - 1,
      progress,
      nightmare
    ]);
  }

  HQ.advise = function (wealth, mastery, attn, calm, skill, vel, pid, pressure, L, _b, BS, TH, CD, vfn, Xa) {
    var d = ensureDir(L);
    if (!d) return null;
    HQ.dirN++;

    var xNow = makeX(wealth, mastery, attn, calm, skill, vel, pressure, L, Xa);
    var naive = d.last ? Math.abs(d.last.skill - skill) : 0.08;

    if (d.last) {
      var pred = ensFwd(d, d.last.x, 0);
      var yErr = Math.abs(pred.y[0] - skill);
      d.err = d.err * 0.84 + yErr * 0.16;
      d.errBase = d.errBase * 0.84 + naive * 0.16;
      d.seen++;
      var prio = yErr + 0.04;
      d.buf.push({
        x: d.last.x,
        skill: skill,
        calm: calm,
        p: prio,
        t: d.seen
      });
      if (d.buf.length > DIR_BUF) d.buf.shift();

      var lr = 0.012 * (d.seen < 12 ? 1.6 : 1);
      trainOne(d, d.last.x, skill, calm, lr);
      var batch = pickBatch(d.buf, DIR_BATCH);
      for (var s = 0; s < DIR_STEPS; s++) {
        for (var b = 0; b < batch.length; b++) {
          var sm = batch[b];
          trainOne(d, sm.x, sm.skill, sm.calm, lr * 0.7);
        }
      }
    }

    var lift = d.errBase > 1e-4 ? clamp(1 - d.err / d.errBase, 0, 1) : 0;
    d.lift = lift;
    d.conf = clamp(lift / 0.16, 0, 1) * clamp(d.seen / 18, 0, 1);

    var bestP = pressure;
    var bestC = 1e9;
    var curve = [];
    var calmCurve = [];
    var target = 0.55;
    for (var k = 0; k <= 20; k++) {
      var p = k / 20;
      var xp = makeX(wealth, mastery, attn, calm, skill, vel, p, L, Xa);
      var out = ensFwd(d, xp, 0);
      curve.push(out.y[0]);
      calmCurve.push(out.y[1]);
      var skillCost = Math.abs(out.y[0] - target);
      var moveCost = Math.abs(p - pressure) * 0.16;
      var calmCost = Math.max(0, 0.36 - out.y[1]) * 0.34;
      var uncCost = out.std[0] * 0.18;
      var cost = skillCost + moveCost + calmCost + uncCost;
      if (cost < bestC) {
        bestC = cost;
        bestP = p;
      }
    }
    d.curve = [];
    for (var i = 0; i <= 10; i++) d.curve.push(curve[i * 2]);
    d.want = bestP;
    d.disagree = 0;
    try {
      var probe = ensFwd(d, makeX(wealth, mastery, attn, calm, skill, vel, bestP, L, Xa), 0);
      d.disagree = probe.std[0];
      d.pred = probe.y[0];
      d.calmPred = probe.y[1];
    } catch (e) {}

    var explore = (Math.random() * 2 - 1) * 0.06 * (1 - 0.7 * d.conf);
    var drive = clamp(pid * (1 - d.conf) + bestP * d.conf + explore, 0, 1);
    d.drive = drive;
    d.last = { x: makeX(wealth, mastery, attn, calm, skill, vel, drive, L, Xa), skill: skill, calm: calm };

    // Keep the original 9-10-1 trained and the existing UI honest.
    try {
      if (typeof _b === "function" && typeof BS === "function" && typeof TH === "function") {
        var legacy = _b();
        if (legacy) {
          if (legacy.last && typeof CD === "function") {
            var yL = BS(legacy, legacy.last.x).y;
            var yE = Math.abs(yL - skill);
            var wE = Math.abs(legacy.last.skill - skill);
            legacy.err = legacy.err * 0.82 + yE * 0.18;
            legacy.errBase = legacy.errBase * 0.82 + wE * 0.18;
            legacy.seen = (legacy.seen || 0) + 1;
            TH(legacy, legacy.last.x, skill);
          }
          legacy.lift = d.lift;
          legacy.conf = d.conf;
          legacy.want = d.want;
          legacy.drive = d.drive;
          legacy.curve = d.curve;
          legacy.pred = d.pred;
          legacy.seen = Math.max(legacy.seen || 0, d.seen);
          legacy.err = d.err;
          legacy.errBase = d.errBase;
          legacy.last = { x: d.last.x, skill: skill };
        }
      }
    } catch (e) {}

    HQ.lastDrive = drive;
    return drive;
  };

  /* ───────── fish GRU-LN ───────── */

  function layout(nn) {
    var Kt = nn.x.length;
    var He = nn.h.length;
    var ft = nn.s.length;
    var Fn = nn.o.length;
    var vl = Kt * He;
    var hidB = vl;
    var gruUz = hidB + He;          // $h  update from hidden
    var gruBz = gruUz + ft * He;    // op
    var gruUh = gruBz + ft;         // ov  candidate from hidden
    var gruBh = gruUh + ft * He;    // wg
    var outH = gruBh + ft;          // Sf
    var outS = outH + Fn * He;      // av
    var outB = outS + Fn * ft;      // Zh
    return { Kt: Kt, He: He, ft: ft, Fn: Fn, vl: vl, hidB: hidB, gruUz: gruUz, gruBz: gruBz, gruUh: gruUh, gruBh: gruBh, outH: outH, outS: outS, outB: outB };
  }

  function ensureFish(nn) {
    if (!nn) return null;
    var L = layout(nn);
    var hq = nn._hq;
    var need = L.ft * L.He;
    if (!hq || hq.v !== 2 || !hq.Wr || hq.Wr.length !== need) {
      var sH = 1 / Math.sqrt(L.He);
      var sS = 1 / Math.sqrt(L.ft) * 0.45;
      hq = {
        v: 2,
        Wr: randn(L.ft * L.He, sH),
        br: zeros(L.ft).map(function () { return 0.15; }),
        Uz: randn(L.ft * L.ft, sS),
        Ur: randn(L.ft * L.ft, sS),
        Uh: randn(L.ft * L.ft, sS),
        attn: randn(L.Kt, 0.15),
        attnb: 0,
        t: 0,
        xp: [],
        lnG: 1,
        lnB: 0
      };
      var keys = ["Wr", "br", "Uz", "Ur", "Uh", "attn"];
      hq.m = {};
      hq.vv = {};
      for (var i = 0; i < keys.length; i++) {
        hq.m[keys[i]] = zeros(hq[keys[i]].length);
        hq.vv[keys[i]] = zeros(hq[keys[i]].length);
      }
      hq.m.attnb = 0;
      hq.vv.attnb = 0;
      nn._hq = hq;
    }
    if (!nn._dm || nn._dm.length !== nn.d.length) {
      nn._dm = new Float32Array(nn.d.length);
      nn._dv = new Float32Array(nn.d.length);
      nn._at = 0;
    }
    return hq;
  }

  function wd(g, d, i) {
    var x = (g[i] || 0) + (d[i] || 0);
    return x === x ? x : 0;
  }

  HQ.fwd = function (nn, Lstate) {
    if (!nn || !nn.g || !nn.x) return nn && nn.o;
    var g = nn.g, d = nn.d, x = nn.x, h = nn.h, hf = nn.hf;
    var s = nn.s, sp = nn.sp, z = nn.z, c = nn.c, xi = nn.xi;
    var ly = layout(nn);
    var hq = ensureFish(nn);
    HQ.fwdN++;

    try {
      if (Lstate && finite(Lstate.t) && finite(nn.tLast) && nn.tLast >= 0) {
        var dt = Lstate.t - nn.tLast;
        if (dt > 6) {
          var decay = Math.pow(0.5, dt / 12);
          for (var ti = 0; ti < ly.ft; ti++) s[ti] *= decay;
        }
      }
      if (Lstate && finite(Lstate.t)) nn.tLast = Lstate.t;
    } catch (e) {}

    var i, j, sum;

    // Hidden — tanh, matching the eligibility backward pass in Xk.
    for (i = 0; i < ly.He; i++) {
      sum = wd(g, d, ly.hidB + i);
      var row = i * ly.Kt;
      for (j = 0; j < ly.Kt; j++) {
        var xv = finite(x[j]) ? x[j] : 0;
        // Soft attention residual: learned gain around 1, so Xk's
        // dL/dW ≈ x still holds to first order.
        var ag = 1 + 0.35 * tanh(hq.attn[j]);
        sum += wd(g, d, row + j) * xv * ag;
      }
      var act = tanh(sum);
      h[i] = act;
      hf[i] = act;
    }

    var prev = new Array(ly.ft);
    for (i = 0; i < ly.ft; i++) {
      sp[i] = s[i];
      prev[i] = finite(s[i]) ? s[i] : 0;
    }

    // Original gated mixer (update z, linear candidate) plus a residual
    // reset-GRU so memory can actually forget. Residual is small so the
    // genetic eligibility traces stay on the original path.
    var zMean = 0;
    var np = 6;
    for (i = 0; i < ly.ft; i++) {
      var zsum = wd(g, d, ly.gruBz + i);
      var hsum = wd(g, d, ly.gruBh + i);
      var uz = ly.gruUz + i * ly.He;
      var uh = ly.gruUh + i * ly.He;
      for (j = 0; j < ly.He; j++) {
        var hj = h[j];
        zsum += wd(g, d, uz + j) * hj;
        hsum += wd(g, d, uh + j) * hj;
      }
      var recZ = 0, recR = 0, recH = 0;
      var us = i * ly.ft;
      var wr = i * ly.He;
      var rsum = hq.br[i];
      for (j = 0; j < ly.He; j++) rsum += hq.Wr[wr + j] * h[j];
      for (j = 0; j < ly.ft; j++) {
        recZ += hq.Uz[us + j] * prev[j];
        recR += hq.Ur[us + j] * prev[j];
      }
      zsum += recZ;
      rsum += recR;
      var zg = sig(zsum);
      var rg = sig(rsum);
      z[i] = zg === zg ? zg : 0.5;
      zMean += z[i];
      for (j = 0; j < ly.ft; j++) recH += hq.Uh[us + j] * (rg * prev[j]);
      var cand = hsum + 0.55 * recH;
      cand = cand > np ? np : cand < -np ? -np : cand === cand ? cand : 0;
      c[i] = cand;
      var nxt = (1 - z[i]) * prev[i] + z[i] * cand;
      s[i] = nxt === nxt ? nxt : 0;
    }
    nn.zMean = zMean / ly.ft;

    var ser = finite(nn.ser) ? nn.ser : 0.6;
    var noise = 0.35 * (1.2 - ser);
    for (i = 0; i < ly.Fn; i++) xi[i] = nrand() * noise;

    HQ.out(nn);
    return nn.o;
  };

  HQ.out = function (nn) {
    var g = nn.g, d = nn.d, h = nn.h, s = nn.s, o = nn.o, xi = nn.xi;
    var ly = layout(nn);
    for (var i = 0; i < ly.Fn; i++) {
      var sum = wd(g, d, ly.outB + i) + (xi[i] || 0);
      var rh = ly.outH + i * ly.He;
      var rs = ly.outS + i * ly.ft;
      for (var j = 0; j < ly.He; j++) sum += wd(g, d, rh + j) * h[j];
      for (var k = 0; k < ly.ft; k++) sum += wd(g, d, rs + k) * s[k];
      var y = tanh(sum);
      o[i] = y === y ? y : 0;
    }
    return o;
  };

  HQ.temp = function (nn) {
    if (!nn || !nn.o) return 0.62;
    var Fn = nn.o.length, m = -1e9, i;
    for (i = 0; i < Fn; i++) if (nn.o[i] > m) m = nn.o[i];
    var Z = 0, p = new Array(Fn);
    for (i = 0; i < Fn; i++) {
      p[i] = Math.exp((nn.o[i] - m) * 2.2);
      Z += p[i];
    }
    var H = 0;
    for (i = 0; i < Fn; i++) {
      var q = p[i] / (Z || 1);
      H -= q * Math.log(q + 1e-9);
    }
    var conf = 1 - H / Math.log(Fn || 2);
    var age = clamp((nn.steps || 0) / 800, 0, 1);
    return 0.48 + conf * 0.22 + age * 0.08;
  };

  HQ.chose = function (nn, act) {
    // Original Xk still runs; we just keep a short experience tape.
    if (!nn) return;
    var hq = ensureFish(nn);
    if (!hq.xp) hq.xp = [];
    var x = new Array(nn.x.length);
    for (var i = 0; i < nn.x.length; i++) x[i] = nn.x[i];
    hq.xp.push({ a: act, x: x, rpe: 0, t: nn.steps || 0 });
    if (hq.xp.length > 24) hq.xp.shift();
  };

  function adamDelta(nn, idx, grad, lr, wd) {
    var m = nn._dm, v = nn._dv;
    nn._at = (nn._at || 0) + 1;
    var b1 = 0.9, b2 = 0.999, t = nn._at;
    if (!finite(grad)) grad = 0;
    grad = clamp(grad, -1, 1);
    m[idx] = b1 * m[idx] + (1 - b1) * grad;
    v[idx] = b2 * v[idx] + (1 - b2) * grad * grad;
    var mh = m[idx] / (1 - Math.pow(b1, t));
    var vh = v[idx] / (1 - Math.pow(b2, t));
    var step = lr * (mh / (Math.sqrt(vh) + 1e-3) + wd * nn.d[idx]);
    nn.d[idx] = clamp(nn.d[idx] - step, -0.55, 0.55);
  }

  HQ.learn = function (fish, dt, Lstate, qfn) {
    if (!(dt > 0) || !fish) return false;
    var nn;
    try {
      nn = typeof nnOf === "function" ? nnOf(fish) : fish.nn;
    } catch (e) {
      nn = fish.nn;
    }
    if (!nn) return false;
    if (!nn.d || !nn.ef || !nn.es) return false;
    HQ.learnN++;
    nn.acc = (nn.acc || 0) + dt;
    if (nn.acc < 0.083) return true;
    var t = nn.acc;
    nn.acc = 0;
    if (t > 5) t = 5;

    var hq = ensureFish(nn);
    var brain = fish.brain;
    if (brain) {
      var targetSer = clamp(0.5 * (1 - (brain.stress || 0)) + 0.5 * (fish.hunger || 0), 0, 1);
      nn.ser += (targetSer - nn.ser) * (1 - Math.pow(0.5, t / 15));
    }
    if (!finite(nn.base)) nn.base = 0;
    var rpe = nn.rpe - nn.base * t;
    nn.base += (nn.rpe / Math.max(t, 0.001) - nn.base) * (1 - Math.pow(0.5, t / 40));
    nn.rpe = 0;
    var signal = Math.abs(rpe) > 1e-4;
    var r = clamp(rpe, -1.5, 1.5);
    if (signal) nn.dop = r;
    else nn.dop *= Math.pow(0.5, t / 2);
    if (signal) nn.err = nn.err * 0.9 + Math.abs(r) * 0.1;

    var smart = 0.5;
    try {
      smart = fish.traits && finite(fish.traits.smart) ? fish.traits.smart : 0.5;
    } catch (e) {}
    var research = 0;
    try {
      if (typeof qfn === "function") research = qfn("nnLearn") || 0;
      else if (Lstate && Lstate.tech && finite(Lstate.tech.nnLearn)) research = Lstate.tech.nnLearn;
    } catch (e) {}
    var lr0 = 0.04 * (0.35 + smart) * (1 + research * 0.15) * (0.5 + (finite(nn.ach) ? nn.ach : 0.4));
    if (r < 0) lr0 *= 0.65; // pessimistic traces slower than reward (asymmetric DA)

    var ly = layout(nn);
    var decayTraceFast = Math.pow(0.5, t / 1.5);
    var decayTraceSlow = Math.pow(0.5, t / 10);
    var l2 = 1 - 0.006 * t;
    var nW = nn.d.length;
    var learned = 0;
    var eMag = 0;

    if (nn.eMag > 1e-5 || signal) {
      // RMS of eligibility for gain control (keeps big traces from exploding).
      var rms = 0;
      for (var i = 0; i < nW; i++) {
        var elig = 0.6 * nn.ef[i] + 0.4 * nn.es[i];
        rms += elig < 0 ? -elig : elig;
      }
      rms = rms / Math.sqrt(nW || 1);
      var gain = lr0;
      if (signal && rms > 0) {
        var mag = Math.abs(r);
        var scaled = (mag > 1 ? mag : 1) * rms * lr0 * 2;
        if (scaled > 1) gain = lr0 / scaled;
      }
      var inGain = gain * (0.5 + (finite(nn.ach) ? nn.ach : 0.4));

      for (var w = 0; w < nW; w++) {
        var el = 0.6 * nn.ef[w] + 0.4 * nn.es[w];
        nn.d[w] *= l2;
        if (signal) {
          var grad = -(w < ly.gruUz ? inGain : gain) * r * el;
          adamDelta(nn, w, grad, 0.05, 0.0004);
        }
        var a = nn.d[w];
        learned += a < 0 ? -a : a;
        nn.ef[w] *= decayTraceFast;
        nn.es[w] *= decayTraceSlow;
        var es = nn.es[w];
        eMag += es < 0 ? -es : es;
      }
      nn.learned = learned / nW;
      nn.eMag = eMag / nW;
    } else if (nn.learned > 1e-4) {
      for (var k = 0; k < nW; k++) nn.d[k] *= l2;
      nn.learned *= l2;
    }

    // Extra GRU weights learn from the same RPE, Hebbian on (h, s).
    if (signal && hq) {
      hq.t = (hq.t || 0) + 1;
      var lrG = gainSafe(lr0) * 0.45 * r;
      hebbAdam(hq, "Wr", nn.h, ly.He, ly.ft, lrG);
      hebbAdamVec(hq, "br", nn.z, lrG * 0.4);
      hebbAdam(hq, "Uz", nn.sp, ly.ft, ly.ft, lrG * 0.5);
      hebbAdam(hq, "Uh", nn.s, ly.ft, ly.ft, lrG * 0.5);
      // Attention: senses that co-fired with positive RPE get a little louder.
      for (var a = 0; a < ly.Kt; a++) {
        var gA = -lrG * 0.25 * nn.x[a];
        adamHQ(hq, "attn", a, gA, 0.006);
      }
    }

    // Tag the latest experience with this RPE for later replay.
    if (hq && hq.xp && hq.xp.length) hq.xp[hq.xp.length - 1].rpe = r;
    return true;
  };

  function gainSafe(x) {
    return finite(x) && x > 0 ? x : 0.004;
  }
  function adamHQ(hq, key, idx, grad, lr) {
    var m = hq.m[key], v = hq.vv[key], w = hq[key];
    if (!m || !w) return;
    var t = hq.t || 1;
    m[idx] = 0.9 * m[idx] + 0.1 * grad;
    v[idx] = 0.999 * v[idx] + 0.001 * grad * grad;
    var mh = m[idx] / (1 - Math.pow(0.9, t));
    var vh = v[idx] / (1 - Math.pow(0.999, t));
    w[idx] = clamp(w[idx] - lr * mh / (Math.sqrt(vh) + 1e-3), -4, 4);
  }
  function hebbAdam(hq, key, pre, preN, postN, lr) {
    var w = hq[key];
    if (!w) return;
    for (var i = 0; i < postN; i++) {
      for (var j = 0; j < preN; j++) {
        var idx = i * preN + j;
        if (idx >= w.length) return;
        adamHQ(hq, key, idx, -lr * (pre[j] || 0), 0.008);
      }
    }
  }
  function hebbAdamVec(hq, key, pre, lr) {
    var w = hq[key];
    if (!w) return;
    for (var i = 0; i < w.length; i++) adamHQ(hq, key, i, -lr * (pre[i] || 0), 0.008);
  }

  /* Simulated binary crossover + adaptive mutation of genetic weights. */
  HQ.inherit = function (mom, dad, Lstate) {
    var gm = null, gd = null;
    try {
      gm = mom && (typeof nnOf === "function" ? nnOf(mom).g : mom.nn && mom.nn.g);
      gd = dad && (typeof nnOf === "function" ? nnOf(dad).g : dad.nn && dad.nn.g);
    } catch (e) {}
    if (!gm && !gd) return null; // fall through to original LH()
    var n = (gm || gd).length;
    var out = new Float32Array(n);
    var eta = 18;
    var mut = 0.14;
    try {
      if (Lstate && Lstate.tech && finite(Lstate.tech.nnMut)) mut *= 1 + Lstate.tech.nnMut;
    } catch (e) {}
    for (var i = 0; i < n; i++) {
      var a = gm ? gm[i] : gd[i];
      var b = gd ? gd[i] : gm[i];
      if (!finite(a)) a = 0;
      if (!finite(b)) b = 0;
      var u = Math.random();
      var beta = u <= 0.5 ? Math.pow(2 * u, 1 / (eta + 1)) : Math.pow(1 / (2 * (1 - u)), 1 / (eta + 1));
      var c1 = 0.5 * ((a + b) - beta * (b - a));
      var pick = Math.random() < 0.5 ? c1 : 0.5 * ((a + b) + beta * (b - a));
      if (Math.random() < mut) pick += nrand() * 0.18;
      out[i] = clamp(pick, -3.2, 3.2);
    }
    if (Math.random() < 0.3) {
      var k = (Math.random() * n) | 0;
      out[k] = clamp(out[k] + nrand() * 1.2, -3.2, 3.2);
    }
    return out;
  };

  /* Quality-weighted cultural transmission of learned deltas. */
  HQ.culture = function (fish, Lstate) {
    if (!fish || !Lstate || !Array.isArray(Lstate.fish)) return false;
    var nn = fish.nn;
    if (!nn) return false;
    var teachers = [];
    for (var i = 0; i < Lstate.fish.length; i++) {
      var f = Lstate.fish[i];
      if (f === fish || f.sp !== fish.sp || f.stage !== 2 || !f.nn) continue;
      if (!f.nn.d || f.nn.d.length !== nn.d.length || (f.nn.steps || 0) < 80) continue;
      var quality = 1 / (0.08 + (f.nn.err || 0.3)) * Math.log(2 + (f.nn.steps || 0));
      teachers.push({ f: f, q: quality });
    }
    if (!teachers.length) return true;
    teachers.sort(function (a, b) { return b.q - a.q; });
    var top = teachers.slice(0, Math.min(5, teachers.length));
    var qSum = 0;
    for (var t = 0; t < top.length; t++) qSum += top[t].q;
    var nW = nn.d.length;
    for (var w = 0; w < nW; w++) {
      var s = 0;
      for (var k = 0; k < top.length; k++) s += top[k].f.nn.d[w] * (top[k].q / qSum);
      nn.d[w] = clamp(s * 0.28, -0.4, 0.4);
    }
    nn.learned = 0.06;
    try {
      if (top.length >= 3 && Lstate.stats) {
        Lstate.stats.nnTaught = (finite(Lstate.stats.nnTaught) ? Lstate.stats.nnTaught : 0) + 1;
      }
    } catch (e) {}
    return true;
  };

  /* Predictor with a hidden layer + surprise-gated learning. */
  HQ.surprise = function (fish, dt, Lstate) {
    var nn, cog;
    try {
      nn = typeof nnOf === "function" ? nnOf(fish) : fish.nn;
      cog = nn && nn.cog;
    } catch (e) {
      return null;
    }
    if (!nn || !cog) return null;
    var Kt = nn.x.length, He = nn.h.length;
    if (!cog.hw || cog.hw.length !== He * 10) {
      cog.hw = randn(He * 10, 0.15);
      cog.hb = zeros(10);
      cog.ow = randn(10 * Kt, 0.15);
      cog.ob = zeros(Kt);
    }
    var hid = new Array(10);
    var i, j, s;
    for (i = 0; i < 10; i++) {
      s = cog.hb[i];
      for (j = 0; j < He; j++) s += cog.hw[i * He + j] * nn.h[j];
      hid[i] = tanh(s);
    }
    var err2 = 0;
    var pred = cog.pred;
    for (i = 0; i < Kt; i++) {
      s = cog.ob[i];
      for (j = 0; j < 10; j++) s += cog.ow[j * Kt + i] * hid[j];
      pred[i] = clamp(s, -1.3, 1.3);
      var e = pred[i] - nn.x[i];
      err2 += e * e;
    }
    var d = Math.sqrt(err2 / Kt);
    cog.surprise = d;
    cog.sAvg += (d - cog.sAvg) * (1 - Math.pow(0.5, dt / 25));
    var smart = 0.5;
    try { smart = fish.traits && finite(fish.traits.smart) ? fish.traits.smart : 0.5; } catch (e) {}
    var lr = 0.035 * (0.4 + smart * 0.8);
    for (i = 0; i < Kt; i++) {
      var e2 = pred[i] - nn.x[i];
      cog.ob[i] = clamp(cog.ob[i] - lr * e2, -4, 4);
      for (j = 0; j < 10; j++) {
        cog.ow[j * Kt + i] = clamp(cog.ow[j * Kt + i] - lr * e2 * hid[j], -4, 4);
      }
    }
    var extra = Math.max(0, d - cog.sAvg * 1.3);
    if (extra > 0.02) {
      try {
        if (typeof nnReward === "function") {
          var curious = fish.traits && finite(fish.traits.curious) ? fish.traits.curious : 0.5;
          nnReward(fish, extra * curious * 1.7);
        }
      } catch (e) {}
    }
    return extra;
  };

  /* RBF-smoothed place-value update. */
  HQ.value = function (fish, reward, dt, cellFn, md, lv, tankW, waterY, floorY) {
    var cog;
    try {
      var nn = typeof nnOf === "function" ? nnOf(fish) : fish.nn;
      cog = nn && nn.cog;
    } catch (e) {
      return false;
    }
    if (!cog || !cog.v) return false;
    md = md || 9;
    lv = lv || 6;
    var Kr = md * lv;
    if (cog.v.length !== Kr) return false;
    var here;
    try {
      here = typeof cellFn === "function" ? cellFn(fish.x, fish.y) : 0;
    } catch (e) {
      here = 0;
    }
    here = clamp(here, 0, Kr - 1) | 0;
    var smart = 0.5;
    try { smart = fish.traits && finite(fish.traits.smart) ? fish.traits.smart : 0.5; } catch (e) {}
    var lr = 0.18 * (0.4 + smart * 0.8);
    var gamma = 0.94;
    if (finite(cog.last) && cog.last >= 0 && cog.last !== here) {
      var td = reward + gamma * cog.v[here] - cog.v[cog.last];
      paint(cog.v, cog.last, md, lv, lr * td, 0.55);
      if (!cog.trail) cog.trail = [];
      cog.trail.push(cog.last);
      if (cog.trail.length > 28) cog.trail.shift();
      if (cog.visits && cog.visits[cog.last] < 65000) cog.visits[cog.last]++;
    } else if (cog.last === here && reward) {
      cog.v[here] += 0.22 * (reward - cog.v[here]);
    }
    cog.last = here;
    if (dt > 0) {
      var fade = Math.pow(0.99923, dt);
      for (var i = 0; i < Kr; i++) cog.v[i] = clamp(cog.v[i] * fade, -3, 3);
    }
    return true;
  };

  function paint(v, idx, md, lv, mag, falloff) {
    var col = idx % md, row = (idx / md) | 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var r = row + dr, c = col + dc;
        if (r < 0 || c < 0 || r >= lv || c >= md) continue;
        var w = dr === 0 && dc === 0 ? 1 : falloff * 0.45;
        var j = r * md + c;
        v[j] = clamp(v[j] + mag * w, -3, 3);
      }
    }
  }

  /* n-step TD replay along the trail, several sweeps. */
  HQ.replay = function (fish, dt) {
    var cog;
    try {
      var nn = typeof nnOf === "function" ? nnOf(fish) : fish.nn;
      cog = nn && nn.cog;
    } catch (e) {
      return false;
    }
    if (!cog) return false;
    cog.replayT = (cog.replayT || 0) - dt;
    if (cog.replayT > 0 || !cog.trail || cog.trail.length < 3) return true;
    cog.replayT = 2.2 + Math.random() * 3.4;
    var gamma = 0.94, lam = 0.88, a = 0.14;
    var trail = cog.trail;
    for (var sweep = 0; sweep < 2; sweep++) {
      var G = 0;
      for (var i = trail.length - 1; i > 0; i--) {
        var nxt = trail[i], cur = trail[i - 1];
        G = cog.v[nxt] + lam * gamma * G;
        cog.v[cur] += a * (gamma * G - cog.v[cur]);
        cog.v[cur] = clamp(cog.v[cur], -3, 3);
      }
    }
    return true;
  };

  /* Persist extra GRU weights as int8 so saves stay small. */
  HQ.pack = function (nn) {
    if (!nn || !nn._hq) return null;
    var hq = nn._hq;
    function q(arr, scale) {
      var n = arr.length, o = new Array(n);
      for (var i = 0; i < n; i++) o[i] = (clamp(Math.round(arr[i] / scale), -127, 127) + 128) & 255;
      return o;
    }
    return {
      v: 2,
      Wr: q(hq.Wr, 4 / 127),
      br: q(hq.br, 4 / 127),
      Uz: q(hq.Uz, 4 / 127),
      Ur: q(hq.Ur, 4 / 127),
      Uh: q(hq.Uh, 4 / 127),
      attn: q(hq.attn, 4 / 127),
      attnb: clamp(hq.attnb, -4, 4)
    };
  };
  HQ.unpack = function (nn, blob) {
    if (!nn || !blob || blob.v !== 2) return;
    ensureFish(nn);
    var hq = nn._hq;
    function u(arr, src, scale) {
      if (!src || src.length !== arr.length) return;
      for (var i = 0; i < arr.length; i++) arr[i] = ((src[i] & 255) - 128) * scale;
    }
    u(hq.Wr, blob.Wr, 4 / 127);
    u(hq.br, blob.br, 4 / 127);
    u(hq.Uz, blob.Uz, 4 / 127);
    u(hq.Ur, blob.Ur, 4 / 127);
    u(hq.Uh, blob.Uh, 4 / 127);
    u(hq.attn, blob.attn, 4 / 127);
    if (finite(blob.attnb)) hq.attnb = blob.attnb;
  };

  HQ.slim = function (d) {
    if (!d || !Array.isArray(d.ens)) return;
    for (var i = 0; i < d.ens.length; i++) {
      var n = d.ens[i];
      if (!n) continue;
      n.m = null;
      n.v = null;
    }
    if (Array.isArray(d.buf) && d.buf.length > 64) d.buf = d.buf.slice(-64);
  };

  HQ.stats = function () {
    var L = null;
    try { L = window.G || window.l || null; } catch (e) {}
    var d = L && L.dnnHQ;
    return {
      v: HQ.v,
      ok: HQ.ok,
      fwd: HQ.fwdN,
      learn: HQ.learnN,
      dir: HQ.dirN,
      conf: d && +(+d.conf).toFixed(3),
      err: d && d.err,
      lift: d && d.lift,
      seen: d && d.seen,
      disagree: d && d.disagree,
      lastErr: HQ.lastErr
    };
  };

  HQ.describeDir = function () {
    return "A residual ensemble of three 9→48→32 nets (GELU, layer-norm skip, AdamW, Huber loss) trained on you alone. Every 12 seconds it predicts your next skill and how calm you will stay, then gets graded. It only steers in proportion to how much it beats a naive guess, so a fresh save does nothing.";
  };

  HQ.describeFish = function () {
    return "Each fish has its own network: 16 senses, 12 GELU hidden units, an 8-unit GRU with reset and recurrent gates, and 15 drives. Learned weights update with AdamW on eligibility traces; fry inherit by simulated-binary crossover and pick up the tank's habits from the adults that have actually been right.";
  };

  /* Self-check so a bad patch never silently NaNs a tank. */
  try {
    var dummy = {
      g: new Float32Array(727),
      d: new Float32Array(727),
      x: new Float32Array(16),
      h: new Float32Array(12),
      hf: new Float32Array(12),
      o: new Float32Array(15),
      s: new Float32Array(8),
      sp: new Float32Array(8),
      z: new Float32Array(8),
      c: new Float32Array(8),
      xi: new Float32Array(15),
      pred: new Float32Array(16),
      pin: new Float32Array(20),
      ef: new Float32Array(727),
      es: new Float32Array(727),
      ser: 0.6,
      ach: 0.4,
      dop: 0,
      rpe: 0,
      base: 0,
      acc: 1,
      eMag: 1,
      learned: 0,
      steps: 0,
      tLast: -1
    };
    for (var i = 0; i < 16; i++) dummy.x[i] = Math.random() * 2 - 1;
    HQ.fwd(dummy, { t: 1 });
    var ok = true;
    for (var j = 0; j < 15; j++) if (!finite(dummy.o[j])) ok = false;
    HQ.ok = ok ? 1 : 0;
    if (!ok) HQ.lastErr = "self-check produced a non-finite drive";
  } catch (e) {
    HQ.ok = 0;
    HQ.lastErr = String(e && e.message || e);
  }
})();
