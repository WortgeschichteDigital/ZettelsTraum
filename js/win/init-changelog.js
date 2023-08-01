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
  initWin.xmlPrettyPrint();
  initWin.events();
  initWin.eventsPopup();
  initWin.eventsHilfeKopf();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
