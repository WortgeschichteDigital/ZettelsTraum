"use strict";

// MODULE
const modules = {
  clipboard: require("electron").clipboard,
  ipc: require("electron").ipcRenderer,
  os: require("os"),
};

window.addEventListener("load", async () => {
  // INIT
  await initWin.infos();
  initWin.ipcListener();
  initWin.events();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // ICONS
  const reload = document.getElementById("reload");
  reload.addEventListener("click", evt => {
    evt.preventDefault();
    fehlerlog.reload();
  });
  reload.addEventListener("animationend", function () {
    this.classList.remove("rotieren-bitte");
  });
  fehlerlog.kopieren(document.getElementById("kopieren"));

  // FEHLER BEIM MAIN-PROZESS ERFRAGEN
  fehlerlog.reload();

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
