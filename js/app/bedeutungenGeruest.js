"use strict";

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
    let obj = data.bd;
    if (helfer.hauptfunktion === "geruest") {
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
    } else if (beleg.geaendertBd) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben das Bedeutungsfeld geändert, aber noch nicht gespeichert.\nBeim Wechsel des Bedeutungsgerüsts vor dem Speichern gingen die Änderungen verloren.",
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
    if (helfer.hauptfunktion === "karte" &&
        !beleg.leseansicht) {
      document.getElementById("beleg-bd").focus();
    }
  },

  // Bedeutungsgerüst global wechseln
  //   gn = String
  //     (Gerüstnummer, auf die gewechselt werden soll)
  wechseln (gn) {
    // Bedeutungen sind offen
    if (helfer.hauptfunktion === "geruest") {
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
    if (gn === data.bd.gn) {
      return;
    }
    // Gerüst wechseln
    overlay.ausblenden(document.getElementById("geruestwechseln"));
    data.bd.gn = gn;
    // Konsequenzen des Wechsels
    if (helfer.hauptfunktion === "karte") {
      beleg.formularBedeutungLabel();
      beleg.formularBedeutung();
      if (beleg.leseansicht) {
        beleg.leseFillBedeutung();
      }
      beleg.listeGeaendert = true; // damit nach dem Schließen die Liste in jedem Fall aufgefrischt wird – auch wenn das Formular nicht gespeichert wird
      document.getElementById("beleg-bd").focus();
    } else if (helfer.hauptfunktion === "liste") {
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
