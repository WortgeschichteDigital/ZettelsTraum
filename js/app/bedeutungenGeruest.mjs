
import bedeutungen from "./bedeutungen.mjs";
import beleg from "./beleg.mjs";
import kartei from "./kartei.mjs";
import liste from "./liste.mjs";
import tagger from "./tagger.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";

export { bedeutungenGeruest as default };

const bedeutungenGeruest = {
  // Fenster öffnen
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Bedeutungsgerüst wechseln</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster wirklich öffnen?
    let obj = dd.file.bd;
    if (shared.hauptfunktion === "geruest") {
      obj = bedeutungen.data;
    }
    if (Object.keys(obj.gr).length === 1) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Kartei hat nur ein Bedeutungsgerüst.",
        callback: () => {
          bedeutungenGeruest.bedeutungsfeldFokus();
        },
      });
      return;
    }
    // Fenster öffnen
    const fenster = document.getElementById("geruestwechseln");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // Gerüste eintragen
    const input = document.getElementById("geruestwechseln-dropdown");
    input.value = `Gerüst ${obj.gn}`;
    setTimeout(function () {
      input.focus();
    }, 5); // ohne Timeout fokussiert das Fenster nicht
  },

  // Bedeutungsfeld der Karteikarte ggf. fokussieren
  bedeutungsfeldFokus () {
    if (shared.hauptfunktion === "karte" &&
        !beleg.leseansicht) {
      document.getElementById("beleg-bd").focus();
    }
  },

  // Bedeutungsgerüst global wechseln
  //   gn = String
  //     (Gerüstnummer, auf die gewechselt werden soll)
  wechseln (gn) {
    // Bedeutungen sind offen
    if (shared.hauptfunktion === "geruest") {
      if (gn === bedeutungen.data.gn) {
        return;
      }
      // Tagger-Fenster offen?
      if (!document.getElementById("tagger").classList.contains("aus")) {
        const fenster = document.getElementById("tagger");
        overlay.oeffnen(fenster);
        tagger.schliessen();
        if (tagger.geaendert) {
          overlay.ausblenden(document.getElementById("geruestwechseln"));
          return;
        }
      }
      // Gerüst wechseln
      bedeutungen.geruestWechseln(gn);
      overlay.ausblenden(document.getElementById("geruestwechseln"));
      return;
    }
    // Gerüst wurde nicht gewechselt
    if (gn === dd.file.bd.gn) {
      return;
    }
    // Gerüst wechseln
    overlay.ausblenden(document.getElementById("geruestwechseln"));
    dd.file.bd.gn = gn;
    // Konsequenzen des Wechsels
    if (shared.hauptfunktion === "karte") {
      beleg.formularBedeutungLabel();
      beleg.formularBedeutungFill();
      beleg.listeGeaendert = true; // damit nach dem Schließen die Liste in jedem Fall aufgefrischt wird – auch wenn das Formular nicht gespeichert wird
      if (!beleg.leseansicht) {
        document.getElementById("beleg-bd").focus();
      }
    } else if (shared.hauptfunktion === "liste") {
      liste.status(true);
    }
    kartei.karteiGeaendert(true);
  },

  // Listener für Überschriften zum Öffnen des Fensters
  //   ele = Element
  listener (ele) {
    ele.addEventListener("click", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      bedeutungenGeruest.oeffnen();
    });
  },
};
