"use strict";
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("finsDesktop", {
  shell: "electron",
  platform: process.platform,
});
