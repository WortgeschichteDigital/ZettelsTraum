
import winShared from "./winShared.mjs";

import dd from "../dd.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // INIT
  await winShared.infos();
  winShared.ipcListener();
  winShared.appName();
  winShared.events();
  winShared.eventsPopup();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // VERSIONEN EINTRAGEN
  for (const [ k, v ] of Object.entries(dd.app.versions)) {
    const element = document.getElementById(`version-${k}`);
    if (k === "electron") {
      element.textContent = `Version ${v}`;
    } else {
      element.textContent = v;
    }
  }

  // FENSTER FREISCHALTEN
  shared.fensterGeladen();
});
