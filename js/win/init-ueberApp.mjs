
import winShared from "./winShared.mjs";

import dd from "../dd.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // MAIL-ADRESSE EINTRAGEN
  const dekodiert = shared.mailEntschluesseln("wvjkiovxidgbwvefekxfzutfpogspjep0eqspAceyhqf0eg");
  const mail = document.getElementById("mail");
  mail.href = `mailto:${dekodiert}`;
  mail.textContent = dekodiert;

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

  // PROGRAMM-VERSION EINTRAGEN
  document.getElementById("version").textContent = dd.app.version;

  // FENSTER FREISCHALTEN
  shared.fensterGeladen();
});
