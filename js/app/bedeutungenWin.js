"use strict";

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
      modules.ipc.invoke("bedeutungen-fokussieren", bedeutungenWin.contentsId);
      return;
    }
    // Fenster durch Main-Prozess öffnen lassen
    bedeutungenWin.contentsId = await modules.ipc.invoke("bedeutungen-oeffnen", `Bedeutungsgerüst: ${kartei.titel}`);
  },

  // Bedeutungsgerüst-Fenster schließen
  async schliessen () {
    if (!bedeutungenWin.contentsId) {
      return false;
    }
    await modules.ipc.invoke("bedeutungen-schliessen", bedeutungenWin.contentsId);
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
      wort: kartei.wort,
      bd: data.bd,
      contentsId: winInfo.contentsId,
    };
    // Daten senden
    modules.ipc.sendTo(bedeutungenWin.contentsId, "daten", daten);
  },
};
