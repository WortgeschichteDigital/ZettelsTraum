
import dialog from "./dialog.mjs";

export { overlay as default };

const overlay = {
  // bisher höchster z-index
  zIndex: 99,

  // Verweis auf einen laufenden Timeout
  timeout: null,

  // Fenster öffnen
  //   fenster = Element
  //     (Overlay-Fenster, das geöffnet werden soll)
  oeffnen (fenster) {
    // Ist das Fenster schon offen?
    const schon_offen = !fenster.classList.contains("aus");
    // Fenster in den Vordergrund holen
    if (fenster.id === "bearbeiterin") {
      fenster.style.zIndex = 1e6; // dieses Fenster muss immer über allem anderen liegen
    } else {
      fenster.style.zIndex = ++overlay.zIndex;
    }
    // Fenster einblenden
    clearTimeout(overlay.timeout);
    if (schon_offen) {
      // das ist wichtig für direkt aufeinanderfolgende Dialog-Fenster
      fenster.classList.add("einblenden");
    } else {
      fenster.classList.remove("aus");
      // dieser Timeout behebt merkwürdigerweise Probleme beim Einblenden;
      // sonst läuft die Transition nicht
      overlay.timeout = setTimeout(() => fenster.classList.add("einblenden"), 0);
    }
    // Rückgabewert
    return schon_offen;
  },

  // Schließen-Event eines Links initialisieren
  //   link = Element
  //     (Link, auf den geklickt wurde)
  initSchliessen (link) {
    link.addEventListener("click", function (evt) {
      evt.preventDefault();
      overlay.schliessen(this);
    });
  },

  // schließt ein Overlay-Fenster
  //   schliesser = Element
  //     (Link oder Button, über den das Schließen angestoßen wurde)
  schliessen (schliesser) {
    // Fenster schließen
    const fenster = schliesser.closest(".overlay");
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
    }
  },

  // blendet ein Overlay-Fenster aus
  ausblenden (fenster) {
    fenster.classList.remove("einblenden");
    // Die Zeit des Timeouts richtet sich nach der Transition-Länge, die in der
    // overlay.css festgelegt ist.
    overlay.timeout = setTimeout(() => fenster.classList.add("aus"), 200);
  },

  // oberstes Overlay-Fenster ermitteln
  oben () {
    const oben = {
      zIndex: 0,
      id: "",
    };
    const overlays = document.querySelectorAll(".overlay");
    for (let i = 0, len = overlays.length; i < len; i++) {
      if (overlays[i].classList.contains("aus")) {
        continue;
      }
      const zIndex = parseInt(overlays[i].style.zIndex, 10);
      if (zIndex > oben.zIndex) {
        oben.zIndex = zIndex;
        oben.id = overlays[i].id;
      }
    }
    return oben.id;
  },
};
