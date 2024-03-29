"use strict";

// MODULE
const modules = {
  clipboard: require("electron").clipboard,
  ipc: require("electron").ipcRenderer,
  shell: require("electron").shell,
};

window.addEventListener("load", async () => {
  // INIT
  await initWin.infos();
  initWin.ipcListener();
  initWin.appName();
  initWin.events();
  initWin.eventsPopup();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // VERSIONEN EINTRAGEN
  [ "electron", "node", "chrome", "v8" ].forEach(i => {
    const element = document.getElementById(`version-${i}`);
    if (i === "electron") {
      element.textContent = `Version ${process.versions[i]}`;
    } else {
      element.textContent = process.versions[i];
    }
  });

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
