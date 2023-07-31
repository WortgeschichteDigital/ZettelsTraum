"use strict";

let helferWin = {
  // Handbuch oder technische Dokumentation über Link öffnen
  //   a = Element
  //     (Link, der zum Handbuch führen soll)
  oeffne (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      // Handbuch oder Dokumentation?
      let fenster = "hilfe-dokumentation";
      if (this.classList.contains("link-handbuch")) {
        fenster = "hilfe-handbuch";
      }
      // ggf. Abschnitt ermitteln
      const abschnitt = a.getAttribute("href").replace(/^#/, "");
      // Signal an den Main-Prozess
      modules.ipc.send(fenster, abschnitt);
    });
  },

  // Changelog über Link öffnen
  //   a = Element
  //     (Link, der zum Changelog führen soll)
  oeffneChangelog (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      modules.ipc.send("hilfe-changelog");
      if (this.dataset.caller === "ueber-app") {
        modules.ipc.invoke("fenster-schliessen");
      }
    });
  },

  // Fehlerlog über Link öffnen
  //   a = Element
  //     (Link, der zum Fehlerlog führen soll)
  oeffneFehlerlog (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      modules.ipc.send("hilfe-fehlerlog");
    });
  },

  // Bedeutungsgerüst-Fenster: zuvor noch die Dimensionen speichern;
  //   das geschieht asynchron, darum muss hier ein wenig gewartet werden;
  //   danach wird ein endgültiger Schließen-Befehl an Main abgesetzt
  // XML-Fenster: zugehörigem Hauptfenster mitteilen, dass es geschlossen wurde
  async beforeUnload () {
    // Bedeutungsgerüst-Fenster
    if (winInfo.typ === "bedeutungen") {
      modules.ipc.sendTo(bedeutungen.data.contentsId, "bedeutungen-fenster-geschlossen");
      await modules.ipc.invoke("fenster-status", winInfo.winId, "fenster-bedeutungen");
    }
    // XML-Fenster
    else if (winInfo.typ === "xml") {
      modules.ipc.sendTo(xml.data.contentsId, "red-xml-geschlossen");
    }
    // Fenster endgültig schließen
    modules.ipc.invoke("fenster-schliessen-endgueltig");
  },
};
