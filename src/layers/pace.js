/* pace.js — one answer to "paint on this frame?" for every layer that paints on its own loop.

   fins.js has a Frame rate setting (Settings, gameState.fpsCap). 0 is Auto, which paints at
   whatever the monitor refreshes at, uncapped; 30 to 144 is a cap a player can choose to save
   power. fins.js applies the cap to its own paint only. The layers that repaint full-screen
   canvases on their own requestAnimationFrame loops (tech.js, feel.js) never read it, so with a
   cap set they still painted at the monitor's rate: the cap saved less than it said, and they ran
   out of step with the tank under them.

   Each of those loops asks shouldPaint(t) with its requestAnimationFrame timestamp. Every
   callback in one frame gets the same timestamp, so they all get the same answer. The rule is
   the one fins.js uses for itself: add up the time since the last painted frame and paint once it
   reaches the cap's interval, less half a monitor frame, so a 60 cap on a 60 Hz monitor paints
   every frame rather than every other one. Auto always paints. Only drawing is gated: callers
   keep stepping their simulation on elapsed time. */
(function () {
  "use strict";

  var lastT = null;
  var answer = true;
  var prevT = null;
  var sinceP = 0;
  /* A running estimate of the monitor's frame, from the gaps between frames. It starts at 60 Hz
     and settles within a second or so on any other rate. */
  var monitorDt = 1 / 60;

  function cap() {
    try {
      var g = typeof gameState === "function" ? gameState() : typeof gameState === "object" ? gameState : null;
      var c = g ? +g.fpsCap : 0;
      return c > 0 ? c : 0;
    } catch (e) {
      return 0;
    }
  }

  function shouldPaint(t) {
    if (t === lastT) return answer;
    lastT = t;
    var dt = prevT == null ? 0 : (t - prevT) / 1000;
    prevT = t;
    if (dt > 0 && dt < 0.25) monitorDt += (dt - monitorDt) * 0.05;
    var c = cap();
    if (!c) {
      sinceP = 0;
      answer = true;
      return answer;
    }
    sinceP += dt > 0 && dt < 0.25 ? dt : 0;
    if (sinceP < 1 / c - monitorDt / 2) {
      answer = false;
      return answer;
    }
    sinceP = 0;
    answer = true;
    return answer;
  }

  window.finsPace = {
    shouldPaint: shouldPaint,
    cap: cap,
    monitorHz: function () {
      return Math.round(1 / monitorDt);
    },
  };
})();
