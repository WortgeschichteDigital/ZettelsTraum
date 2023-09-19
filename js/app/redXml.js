"use strict";

const redXml = {
  // speichert die contentsId des zugehörigen XML-Fensters
  contentsId: 0,

  // speichert, ob das Fenster gerade initialisiert wird
  // (abgeschlossen, wenn die Init-Daten gesendet wurden)
  winInit: false,

  // XML-Fenster öffnen
  async oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Redaktion &gt; XML</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return false;
    }
    // Fenster schon offen? => Fenster fokussieren
    if (redXml.contentsId) {
      modules.ipc.invoke("red-xml-fokussieren", redXml.contentsId);
      return false;
    }
    // Fenster durch Main-Prozess öffnen lassen
    redXml.contentsId = await modules.ipc.invoke("red-xml-oeffnen", `XML: ${kartei.titel}`);
    return true;
  },

  // XML-Fenster öffnen (Promise)
  async oeffnenPromise () {
    // Init-Markierung zurücksetzen
    xml.winInit = false;
    // Fenster öffnen
    await redXml.oeffnen();
    // warten, bis das Fenster mit dem Init fertig ist
    while (!xml.winInit) {
      await new Promise(warten => setTimeout(() => warten(true), 25));
    }
    await new Promise(warten => setTimeout(() => warten(true), 250));
  },

  // Bedeutungsgerüst-Fenster schließen
  async schliessen () {
    if (!redXml.contentsId) {
      return false;
    }
    await modules.ipc.invoke("red-xml-schliessen", redXml.contentsId);
    redXml.contentsId = 0;
    return true;
  },

  // Daten zusammentragen und an das XML-Fenster schicken
  daten () {
    if (!redXml.contentsId) {
      return;
    }
    // Daten zusammentragen
    const xmlDaten = {
      autorinnen: [],
      contentsId: winInfo.contentsId,
      gerueste: {},
      lemmata: data.la,
      letzter_pfad: optionen.data.letzter_pfad,
      themenfelder: [],
      titel: `XML: ${kartei.titel}`,
      wort: kartei.wort,
      xl: data.rd.xl,
    };
    if (optionen.data.personen.length) {
      for (const i of optionen.data.personen) {
        let name = i;
        if (/,/.test(i)) {
          const match = i.match(/(.+),\s?(.+)/);
          name = `${match[2]} ${match[1]}`;
        }
        xmlDaten.autorinnen.push(name);
      }
    }
    for (const [ k, v ] of Object.entries(data.bd.gr)) {
      xmlDaten.gerueste[k] = v.na;
    }
    if (optionen.data.tags.themenfelder) {
      for (const v of Object.values(optionen.data.tags.themenfelder.data)) {
        xmlDaten.themenfelder.push(v.name);
      }
    }
    // Daten senden
    modules.ipc.sendTo(redXml.contentsId, "xml-daten", xmlDaten);
    // Init als abgeschlossen markieren
    xml.winInit = true;
  },

  // einen Datensatz an das XML-Fenster schicken
  //   xmlDatensatz = Object
  //     (der Datensatz, der an das Fenster gehen soll)
  async datensatz ({ xmlDatensatz }) {
    // Ist das Fenster schon offen?
    if (!redXml.contentsId) {
      await redXml.oeffnenPromise();
    }
    // Datensatz an das Fenster schicken
    modules.ipc.sendTo(redXml.contentsId, "xml-datensatz", xmlDatensatz);
    // Animation
    helfer.animation("xml");
  },

  // aus dem XML-Fenster empfangene Daten in die Kartei schreiben
  //   daten = Object
  //     (die XML-Datei-Daten)
  speichern ({ daten }) {
    data.rd.xl = daten;
    kartei.karteiGeaendert(true);
  },
};
