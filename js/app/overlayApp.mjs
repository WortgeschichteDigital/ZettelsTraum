
import bearbeiterin from "./bearbeiterin.mjs";
import beleg from "./beleg.mjs";
import importShared from "./importShared.mjs";
import lemmata from "./lemmata.mjs";
import notizen from "./notizen.mjs";
import redLit from "./redLit.mjs";
import stamm from "./stamm.mjs";
import tagger from "./tagger.mjs";

import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";

export { overlayApp as default };

const overlayApp = {
  // Schließen-Event eines Links initialisieren
  //   link = Element
  //     (Link, auf den geklickt wurde)
  initSchliessen (link) {
    link.addEventListener("click", function (evt) {
      evt.preventDefault();
      overlayApp.schliessen(this);
    });
  },

  // schließt ein Overlay-Fenster
  //   schliesser = Element
  //     (Link oder Button, über den das Schließen angestoßen wurde)
  schliessen (schliesser) {
    // Sonderbehandlung für einige Fenster
    const fenster = schliesser.closest(".overlay");
    if (fenster.id === "bearbeiterin" &&
        !bearbeiterin.check()) {
      return;
    } else if (fenster.id === "tagger") {
      tagger.schliessen();
      return;
    } else if (fenster.id === "notizen") {
      notizen.abbrechen();
      return;
    } else if (fenster.id === "lemmata") {
      if (lemmata.karteiInit) {
        lemmata.abgebrochen = true;
        lemmata.geaendert = false;
      }
      lemmata.schliessen();
      return;
    } else if (fenster.id === "stamm") {
      stamm.schliessen();
      return;
    } else if (fenster.id === "import") {
      importShared.fileDataWinClose();
      return;
    } else if (fenster.id === "red-lit") {
      redLit.schliessen();
      return;
    }
    // Fenster schließen
    overlay.ausblenden(fenster);
    // spezielle Funktionen für einzelne Overlay-Fenster
    if (fenster.id === "dialog") {
      if (schliesser.nodeName === "INPUT") { // Schließen durch Input-Button oder Input-Text
        if (/Abbrechen|Nein/.test(schliesser.value)) { // Alert-Dialog: Abbrechen, Confirm-Dialog: Nein
          dialog.antwort = false;
        } else {
          dialog.antwort = true;
        }
      } else { // Schließen durch Link oder Esc
        dialog.antwort = null;
      }
      if (dialog.callback) { // Soll eine Funktion ausgeführt werden?
        dialog.callback();
      }
    } else if (fenster.id === "geruestwechseln" &&
        shared.hauptfunktion === "karte" &&
        !beleg.leseansicht) {
      document.getElementById("beleg-bd").focus();
    }
  },

  // alle offenen Overlays schließen
  async alleSchliessen () {
    const offen = [];
    document.querySelectorAll(".overlay").forEach(function (i) {
      if (!i.classList.contains("aus")) {
        offen.push(i.id);
      }
    });
    for (let i = 0, len = offen.length; i < len; i++) {
      overlayApp.schliessen(document.getElementById(offen[i]));
      await new Promise(resolve => setTimeout(() => resolve(true), 200));
    }
  },
};
