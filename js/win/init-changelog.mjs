
import winShared from "./winShared.mjs";

import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import suchleiste from "../suchleiste.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // INIT
  await winShared.infos();
  winShared.ipcListener();
  winShared.appName();
  winShared.xmlPrettyPrint();
  winShared.events();
  winShared.eventsPopup();
  winShared.eventsHilfeKopf();
  await suchleiste.modInit();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // FENSTER FREISCHALTEN
  shared.fensterGeladen();
});
