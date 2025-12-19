
import bedeutungen from "./bedeutungen.mjs";
import bedvisData from "./bedvis/data.mjs";
import xml from "./xml.mjs";

import dd from "../dd.mjs";

export { helfer as default };

const helfer = {
  // Handbuch oder technische Dokumentation über Link öffnen
  //   a = Element
  //     (Link, der zum Handbuch führen soll)
  oeffne (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Handbuch oder Dokumentation?
      let fenster = "hilfe-dokumentation";
      if (this.classList.contains("link-handbuch")) {
        fenster = "hilfe-handbuch";
      }
      // ggf. Abschnitt ermitteln
      const abschnitt = a.getAttribute("href").replace(/^#/, "");
      // Signal an den Main-Prozess
      bridge.ipc.invoke(fenster, abschnitt);
    });
  },

  // Changelog über Link öffnen
  //   a = Element
  //     (Link, der zum Changelog führen soll)
  oeffneChangelog (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      bridge.ipc.invoke("hilfe-changelog");
      if (this.dataset.caller === "ueber-app") {
        bridge.ipc.invoke("fenster-schliessen");
      }
    });
  },

  // Fehlerlog über Link öffnen
  //   a = Element
  //     (Link, der zum Fehlerlog führen soll)
  oeffneFehlerlog (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      bridge.ipc.invoke("hilfe-fehlerlog");
    });
  },

  // Bedeutungsgerüst-Fenster: zuvor noch die Dimensionen speichern;
  //   das geschieht asynchron, darum muss hier ein wenig gewartet werden;
  //   danach wird ein endgültiger Schließen-Befehl an Main abgesetzt
  // XML-Fenster: zugehörigem Hauptfenster mitteilen, dass es geschlossen wurde
  async beforeUnload () {
    if (dd.win.typ === "bedeutungen") {
      // Bedeutungsgerüst-Fenster
      bridge.ipc.invoke("webcontents-bridge", {
        id: bedeutungen.data.contentsId,
        channel: "bedeutungen-fenster-geschlossen",
        data: null,
      });
      await bridge.ipc.invoke("fenster-status", dd.win.winId, "fenster-bedeutungen");
    } else if (dd.win.typ === "bedvis") {
      // Bedvis-Fenster
      bridge.ipc.invoke("webcontents-bridge", {
        id: bedvisData.mainContentsId,
        channel: "bedvis-closed",
        data: null,
      });
      await bridge.ipc.invoke("fenster-status", dd.win.winId, "fenster-bedvis");
    } else if (dd.win.typ === "xml") {
      // XML-Fenster
      bridge.ipc.invoke("webcontents-bridge", {
        id: xml.data.contentsId,
        channel: "red-xml-geschlossen",
        data: null,
      });
    }
    // Fenster endgültig schließen
    bridge.ipc.invoke("fenster-schliessen-endgueltig");
  },
};
