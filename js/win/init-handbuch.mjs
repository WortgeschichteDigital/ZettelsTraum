
import hilfe from "./hilfe.mjs";
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
  winShared.eventsSuche();
  winShared.eventsPopup();
  winShared.eventsHilfeKopf();
  await suchleiste.modInit();

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // UMBRUCH IN LANGEN DATEIPFADEN
  hilfe.dateiBreak();

  // ERWEITERTE NAVIGATION
  hilfe.naviDetailsInit();

  // FENSTER FREISCHALTEN
  hilfe.sektionWechseln("einfuehrung"); // damit der 1. Punkt im Inhaltsverzeichnis markiert wird
  shared.fensterGeladen();
});
