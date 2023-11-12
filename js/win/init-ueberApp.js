"use strict";

// MODULE
const modules = {
  clipboard: require("electron").clipboard,
  ipc: require("electron").ipcRenderer,
  shell: require("electron").shell,
};

window.addEventListener("load", async () => {
  // MAIL-ADRESSE EINTRAGEN
  const dekodiert = helfer.mailEntschluesseln("wvjkiovxidgbwvefekxfzutfpogspjep0eqspAceyhqf0eg");
  const mail = document.getElementById("mail");
  mail.href = `mailto:${dekodiert}`;
  mail.textContent = dekodiert;

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

  // PROGRAMM-VERSION EINTRAGEN
  document.getElementById("version").textContent = appInfo.version;

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
