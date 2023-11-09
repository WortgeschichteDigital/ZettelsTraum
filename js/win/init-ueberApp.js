"use strict";

// MODULE
const modules = {
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

  // PROGRAMM-VERSION EINTRAGEN
  document.getElementById("version").textContent = appInfo.version;

  // MAIL-ADRESSE EINTRAGEN
  const dekodiert = helfer.mailEntschluesseln("wvjkiovxidgbwvefekxfzutfpogspjep0eqspAceyhqf0eg");
  const mail = document.getElementById("mail");
  mail.href = `mailto:${dekodiert}`;
  mail.textContent = dekodiert;

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
