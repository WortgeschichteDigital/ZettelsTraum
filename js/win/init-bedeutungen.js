"use strict";

// MODULE
const modules = {
  ipc: require("electron").ipcRenderer,
};

window.addEventListener("load", async () => {
  // INIT
  await initWin.infos();
  initWin.ipcListener();
  initWin.appName();
  initWin.events();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // ICONS
  document.getElementById("bd-win-drucken").addEventListener("click", evt => {
    evt.preventDefault();
    bedeutungen.drucken();
  });

  // DROPDOWN
  document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
  document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
