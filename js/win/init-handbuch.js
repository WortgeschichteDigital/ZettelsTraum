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
  initWin.xmlPrettyPrint();
  initWin.events();
  initWin.eventsSuche();
  initWin.eventsPopup();
  initWin.eventsHilfeKopf();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // UMBRUCH IN LANGEN DATEIPFADEN
  hilfe.dateiBreak();

  // ERWEITERTE NAVIGATION
  hilfe.naviDetailsInit();

  // FENSTER FREISCHALTEN
  hilfe.sektionWechseln("einfuehrung"); // damit der 1. Punkt im Inhaltsverzeichnis markiert wird
  helfer.fensterGeladen();
});
