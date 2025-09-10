
import fehlerlog from "./fehlerlog.mjs";
import winShared from "./winShared.mjs";

import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // INIT
  await winShared.infos();
  winShared.ipcListener();
  winShared.events();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

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
  shared.fensterGeladen();
});
