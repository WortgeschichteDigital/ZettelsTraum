
import winShared from "./winShared.mjs";

import dropdown from "../dropdown.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import sharedXml from "../sharedXml.mjs";
import tooltip from "../tooltip.mjs";

window.addEventListener("load", async () => {
  // INIT
  await winShared.infos();
  winShared.ipcListener();
  winShared.events();
  winShared.eventsPopup();
  winShared.eventsXml();
  await dropdown.modInit();

  // DIALOG
  overlay.initSchliessen(document.querySelector("#dialog h2 a"));
  document.getElementById("dialog-prompt-text").addEventListener("keydown", function (evt) {
    sharedTastatur.detectModifiers(evt);
    if (!sharedTastatur.modifiers && evt.key === "Enter") {
      overlay.schliessen(this);
    }
  });
  [ "dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button" ].forEach(button => {
    document.getElementById(button).addEventListener("click", function () {
      overlay.schliessen(this);
    });
  });

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  sharedTastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // DROPDOWN
  document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
  document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

  // ÄNDERUNGSNOTIZ
  document.querySelector("#md-re-no").value = "Erstpublikation";

  // XML-INDENT.XSL LADEN
  await shared.resourcesLoad({
    file: "xml-indent.xsl",
    targetObj: sharedXml,
    targetKey: "indentXsl",
  });

  // FENSTER FREISCHALTEN
  shared.fensterGeladen();
});
