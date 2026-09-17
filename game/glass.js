/* glass.js — desktop vs tab. Same renderer. More pixels when the window is a window. */
(function () {
  "use strict";
  var desk = false;
  try {
    desk = !!(window.finsDesktop && window.finsDesktop.shell === "electron");
  } catch (e) {}
  if (desk) {
    document.documentElement.classList.add("desk");
    document.body && document.body.classList.add("desk");
  }
  var dpr = window.devicePixelRatio || 1;
  window.__finsGlass = {
    desk: desk,
    dpr: Math.min(desk ? 2.25 : 2, dpr),
  };
})();
