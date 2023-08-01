"use strict";

// MODULE
const modules = {
  clipboard: require("electron").clipboard,
  fsp: require("fs").promises,
  ipc: require("electron").ipcRenderer,
  path: require("path"),
};

window.addEventListener("load", async () => {
  // INIT
  await initWin.infos();
  initWin.ipcListener();
  initWin.events();
  initWin.eventsPopup();
  initWin.eventsXml();

  // DIALOG
  overlay.initSchliessen(document.querySelector("#dialog h2 a"));
  document.getElementById("dialog-prompt-text").addEventListener("keydown", function (evt) {
    tastatur.detectModifiers(evt);
    if (!tastatur.modifiers && evt.key === "Enter") {
      overlay.schliessen(this);
    }
  });
  [ "dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button" ].forEach(button => {
    document.getElementById(button).addEventListener("click", function () {
      overlay.schliessen(this);
    });
  });

  // ANZEIGE TASTATURKÜRZEL ANPASSEN
  tastatur.shortcutsText();

  // TOOLTIPS INITIALISIEREN
  tooltip.init();

  // DROPDOWN
  document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
  document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

  // ÄNDERUNGSNOTIZ
  document.querySelector("#md-re-no").value = "Erstpublikation";

  // FENSTER FREISCHALTEN
  helfer.fensterGeladen();
});
