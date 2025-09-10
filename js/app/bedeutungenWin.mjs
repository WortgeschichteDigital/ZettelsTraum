
import kartei from "./kartei.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";

export { bedeutungenWin as default };

const bedeutungenWin = {
  // speichert die contentsId des zugehörigen Bedeutungsgerüst-Fensters
  contentsId: 0,

  // Bedeutungsgerüst-Fenster öffnen
  async oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Bedeutungsgerüst-Fenster</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster schon offen? => Fenster fokussieren
    if (bedeutungenWin.contentsId) {
      bridge.ipc.invoke("bedeutungen-fokussieren", bedeutungenWin.contentsId);
      return;
    }
    // Fenster durch Main-Prozess öffnen lassen
    bedeutungenWin.contentsId = await bridge.ipc.invoke("bedeutungen-oeffnen", `Bedeutungsgerüst: ${kartei.titel}`);
  },

  // Bedeutungsgerüst-Fenster schließen
  async schliessen () {
    if (!bedeutungenWin.contentsId) {
      return false;
    }
    await bridge.ipc.invoke("bedeutungen-schliessen", bedeutungenWin.contentsId);
    bedeutungenWin.contentsId = 0;
    return true;
  },

  // Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
  daten () {
    if (!bedeutungenWin.contentsId) {
      return;
    }
    // Daten zusammentragen
    const daten = {
      titel: `Bedeutungsgerüst: ${kartei.titel}`,
      wort: kartei.wort,
      bd: dd.file.bd,
      contentsId: dd.win.contentsId,
    };
    // Daten senden
    bridge.ipc.invoke("webcontents-bridge", {
      id: bedeutungenWin.contentsId,
      channel: "daten",
      data: daten,
    });
  },
};
