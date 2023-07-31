"use strict";

let bedeutungenWin = {
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
    bedeutungenWin.contentsId = await modules.ipc.invoke("bedeutungen-oeffnen", `Bedeutungsgerüst: ${kartei.wort}`);
  },
  // Bedeutungsgerüst-Fenster schließen
  schliessen () {
    return new Promise(async resolve => {
      if (!bedeutungenWin.contentsId) {
        resolve(false);
        return;
      }
      await modules.ipc.invoke("bedeutungen-schliessen", bedeutungenWin.contentsId);
      bedeutungenWin.contentsId = 0;
      resolve(true);
    });
  },
  // Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
  daten () {
    if (!bedeutungenWin.contentsId) {
      return;
    }
    // Daten zusammentragen
    let daten = {
      wort: kartei.wort,
      bd: data.bd,
      contentsId: winInfo.contentsId,
    };
    // Daten senden
    modules.ipc.sendTo(bedeutungenWin.contentsId, "daten", daten);
  },
};
