
import bedeutungen from "./bedeutungen.mjs";
import winShared from "./winShared.mjs";

import dropdown from "../dropdown.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // INIT
  await winShared.infos();
  winShared.ipcListener();
  winShared.appName();
  winShared.events();
  await dropdown.modInit();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

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
  shared.fensterGeladen();
});
