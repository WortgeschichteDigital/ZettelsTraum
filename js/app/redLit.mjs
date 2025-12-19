
import helfer from "./helfer.mjs";
import importBibtex from "./importBibtex.mjs";
import importShared from "./importShared.mjs";
import importTEI from "./importTEI.mjs";
import kartei from "./kartei.mjs";
import karteisucheExport from "./karteisucheExport.mjs";
import lock from "./lock.mjs";
import optionen from "./optionen.mjs";
import overlayApp from "./overlayApp.mjs";
import popup from "./popup.mjs";
import redXml from "./redXml.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import sharedXml from "../sharedXml.mjs";
import tooltip from "../tooltip.mjs";

export { redLit as default };

const redLit = {
  // Fenster öffnen
  async oeffnen () {
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("red-lit");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // Suche zurücksetzen
    redLit.sucheReset();
    // Eingabeformular zurücksetzen
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
    // Pfad zur Datenbank ermitteln
    if (!redLit.db.path) {
      // noch keine Pfad geladen => in den Einstellungen gespeicherten Pfad übernehmen
      // (der kann natürlich ebenfalls leer sein)
      redLit.db.path = optionen.data["literatur-db"];
      redLit.db.mtime = "";
    } else if (optionen.data["literatur-db"] &&
        optionen.data["literatur-db"] !== redLit.db.path) {
      // Pfad wurde in einem anderen Fenster geändert => übernehmen?
      await new Promise(resolve => setTimeout(() => resolve(true), 200)); // sonst wird DB-Fenster nicht sichtbar
      await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `Der Datenbankpfad\n<p class="force-wrap"><i>${redLit.db.path}</i></p>\nwurde in einem anderen Programmfenster geändert in:\n<p class="force-wrap"><i>${optionen.data["literatur-db"]}</i></p>\nSoll die neue Datenbank auch in diesem Fenster geladen werden?`,
          callback: () => {
            if (dialog.antwort) {
              redLit.db.path = optionen.data["literatur-db"];
              redLit.db.mtime = "";
            } else {
              optionen.data["literatur-db"] = redLit.db.path;
              optionen.speichern();
            }
            resolve(true);
          },
        });
      });
    } else if (!optionen.data["literatur-db"]) {
      // in einem anderen Fenster wurde die DB entkoppelt =>
      // Pfad aus diesem Fenster an alle Fenster übertragen
      optionen.data["literatur-db"] = redLit.db.path;
      optionen.speichern();
    }
    // Pfadanzeige auffrischen
    redLit.dbAnzeige();
    // wenn Pfad bekannt =>
    //   1. Kann die DB geladen werden?
    //       wenn nicht => versuchen die Offline-Version zu laden
    //   2. Wurde die DB-Datei seit dem letzten Laden geändert?
    //        wenn ja => DB neu laden
    let dbGeladen = false;
    if (redLit.db.path) {
      const stats = await bridge.ipc.invoke("file-info", redLit.db.path);
      if (!stats.exists) {
        // Datenbank kann nicht geladen werden
        // (kann temporär verschwunden sein, weil sie im Netzwerk liegt)
        redLit.db.gefunden = false;
        redLit.db.mtime = "";
        // versuchen, die Offline-Version zu laden
        const dbOffline = await redLit.dbLadenOffline();
        if (!dbOffline) {
          // Laden ist endgültig gescheitert => Datenbank entkoppeln
          redLit.dbEntkoppeln();
        } else {
          dbGeladen = true;
        }
      } else {
        // Datenbank kann geladen werden,
        // aber muss sie auch geladen werden?
        redLit.db.gefunden = true;
        const mtime = stats.mtime;
        if (mtime !== redLit.db.mtime) {
          // Datenkbank laden
          redLit.db.mtime = mtime;
          dbGeladen = await (async function () {
            const result = await redLit.dbOeffnenEinlesen({ pfad: redLit.db.path });
            if (result !== true) {
              dialog.oeffnen({
                typ: "alert",
                text: result,
              });
              return false;
            }
            redLit.db.konvertiert = false;
            return true;
          }());
        } else {
          // Offline-Kopie erstellen, falls noch keine vorhanden ist
          // (die Offline-Kopie könnte beim Entkoppeln in einem anderen Hauptfenster
          // gelöscht worden sein)
          const offlinePfad = await redLit.dbOfflineKopiePfad(redLit.db.path);
          const offlineVorhanden = await bridge.ipc.invoke("file-exists", offlinePfad);
          if (!offlineVorhanden) {
            await redLit.dbOfflineKopie(redLit.db.path);
          }
          dbGeladen = true;
        }
      }
    }
    // Operationenspeicher leeren
    redLit.db.dataOpts = [];
    // passendes Formular öffnen
    if (dbGeladen) {
      redLit.sucheWechseln();
    } else {
      redLit.eingabeHinzufuegen();
    }
  },

  // Fenster schließen
  schliessen () {
    if (redLit.db.locked) {
      dialog.oeffnen({
        typ: "alert",
        text: "Der Speichervorgang muss erst abgeschlossen werden.\nDanach können Sie das Fenster schließen.",
      });
      return;
    }
    redLit.dbCheck(() => {
      if (!redLit.db.path) {
        redLit.dbEntkoppeln();
      }
      overlay.ausblenden(document.getElementById("red-lit"));
    });
  },

  // Speichern wurde via Tastaturkürzel (Strg + S) angestoßen
  async speichern () {
    if (redLit.db.locked) {
      return;
    }
    // Einstellungen des Speichern-Befehls für die Kartei adaptieren
    const kaskade = {
      eingabe: true,
      db: true,
    };
    if (optionen.data.einstellungen.speichern === "2" && redLit.eingabe.changed) {
      // entweder Eingabeformular oder DB speichern
      kaskade.db = false;
    } else if (optionen.data.einstellungen.speichern === "3") {
      // nur DB speichern
      kaskade.eingabe = false;
    }
    // Eingabeformular nur speichern, wenn es auch sichtbar ist
    // (dort können vollständig ausgefüllte, gerade erst gelöschte Titelaufnahmen
    // lungern, die dann automatisch wieder hinzugefügt werden)
    if (document.getElementById("red-lit-eingabe").classList.contains("aus")) {
      kaskade.eingabe = false;
    }
    // Speichern
    if (kaskade.eingabe &&
        redLit.eingabe.changed) {
      const eingabeSpeichern = await redLit.eingabeSpeichern();
      if (!eingabeSpeichern) {
        return;
      }
    }
    if (kaskade.db &&
        redLit.db.changed) {
      redLit.dbSpeichern();
    }
  },

  // Datenbank: Speicher für Variablen
  db: {
    ve: 3, // Versionsnummer des aktuellen Datenbankformats
    data: {}, // Titeldaten der Literaturdatenbank (wenn DB geladen => Inhalt von DB.ti)
    dataTmp: {}, // temporäre Titeldaten der Literaturdatenbank (Kopie von redLit.db.data)
    dataOpts: [], // Operationenspeicher für alle Änderungen in redLit.db.data
    dataMeta: { // Metadaten der Literaturdatenbank
      bl: [], // Blockliste mit gesperrten IDs
      dc: "", // Erstellungszeitpunkt (DB.dc)
      dm: "", // Änderungszeitpunkt (DB.dm)
      re: 0, // Revisionsnummer (DB.re)
    },
    path: "", // Pfad zur geladenen Datenbank
    mtime: "", // Änderungsdatum der DB-Datei beim Laden (ISO-String)
    gefunden: false, // Datenbankdatei gefunden (könnte im Netzwerk temporär verschwunden sein)
    changed: false, // Inhalt der Datenbank wurde geändert und noch nicht gespeichert
    locked: false, // Datenbank wird gerade geschrieben, ist also für die Bearbeitung gesperrt
    lockedInterval: null, // Intervall für den Lockbildschirm
    konvertiert: false, // temporäre Markierung dafür, dass eine DB konvertiert wurde
  },

  // Datenkbank: versuchen, die Offline-Version zu laden
  async dbLadenOffline () {
    const offlinePfad = await redLit.dbOfflineKopiePfad(redLit.db.path);
    const dbOffline = await bridge.ipc.invoke("file-exists", offlinePfad);
    if (dbOffline) {
      const result = await redLit.dbOeffnenEinlesen({ pfad: offlinePfad, offline: true });
      if (result === true) { // Laden der Offline-Version war erfolgreich
        redLit.db.konvertiert = false;
        const span = document.createElement("span");
        span.textContent = "[offline]";
        document.getElementById("red-lit-pfad-db").appendChild(span);
        return true;
      }
    }
    return false;
  },

  // Datenbank: Anzeige auffrischen
  dbAnzeige () {
    const pfad = document.getElementById("red-lit-pfad-db");
    if (!redLit.db.path) { // keine DB mit dem Programm verknüpft
      pfad.classList.add("keine-db");
      pfad.textContent = "keine Datenbank geladen";
    } else { // DB mit dem Programm verknüpft
      pfad.classList.remove("keine-db");
      pfad.textContent = `\u200E${redLit.db.path}\u200E`;
    }
    // Änderungsmarkierung zurücksetzen
    redLit.dbGeaendert(redLit.db.konvertiert);
  },

  // Datenbank: Inhalt wurde geändert
  //   geaendert = Boolean
  //     (DB wurde geändert)
  dbGeaendert (geaendert) {
    redLit.db.changed = geaendert;
    const changed = document.getElementById("red-lit-pfad-changed");
    if (geaendert) {
      changed.classList.add("changed");
    } else {
      changed.classList.remove("changed");
    }
  },

  // Datenbank: Listener für die Icon-Links
  //   a = Element
  //     (ein Icon-Link zum Speichern, Öffnen usw.)
  dbListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (/-entkoppeln/.test(this.id)) {
        redLit.dbCheck(() => redLit.dbEntkoppeln());
      } else if (/-oeffnen/.test(this.id)) {
        redLit.dbCheck(() => redLit.dbOeffnen());
      } else if (/-exportieren/.test(this.id)) {
        redLit.dbExportierenFormat();
      } else if (/-speichern$/.test(this.id)) {
        redLit.dbSpeichern();
      } else if (/-speichern-unter$/.test(this.id)) {
        redLit.dbSpeichern(true);
      }
    });
  },

  // Datenbank: Verknüpfung mit der Datenbank auflösen
  dbEntkoppeln () {
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // DB-Datensätze zurücksetzen
    redLit.db.data = {};
    redLit.db.dataTmp = {};
    redLit.db.dataOpts = [];
    redLit.db.dataMeta = {
      bl: [],
      dc: "",
      dm: "",
      re: 0,
    };
    if (redLit.db.path) {
      // redLit.db.path überprüfen! Grund:
      // Wird die DB entkoppelt, das DB-Overlay-Fenster aber nicht geschlossen
      // und dann aus einem anderen Hauptfenster heraus ein neuer DB-Pfad übertragen,
      // würde der Pfad in diesem Hauptfenster beim Schließen des DB-Overlay-Fensters
      // nach einer Überprüfung von optionen.data["literatur-db"] erneut gelöscht.
      redLit.dbOfflineKopieUnlink(redLit.db.path);
      redLit.db.path = "";
      optionen.data["literatur-db"] = "";
      optionen.speichern();
    }
    redLit.db.mtime = "";
    redLit.db.gefunden = false;
    redLit.db.changed = false;
    // DB-Anzeige auffrischen
    redLit.dbAnzeige();
    // Suche zurücksetzen
    redLit.sucheReset();
    // Eingabeformular zurücksetzen
    // (setzt zugleich die Eingabe-Datensätze zurück)
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
  },

  // Datenbank: Datei öffnen
  async dbOeffnen () {
    const opt = {
      title: "Literaturdatenbank öffnen",
      defaultPath: dd.app.documents,
      filters: [
        {
          name: `${dd.app.name} Literaturdatenbank`,
          extensions: [ "ztl" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
      properties: [ "openFile" ],
    };
    // Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
    if (optionen.data.letzter_pfad) {
      opt.defaultPath = optionen.data.letzter_pfad;
    }
    // Dialog anzeigen
    const result = await bridge.ipc.invoke("datei-dialog", {
      open: true,
      winId: dd.win.winId,
      opt,
    });
    // Fehler oder keine Datei ausgewählt
    if (result.message || !Object.keys(result).length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
      });
      return;
    } else if (result.canceled) {
      return;
    }
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // Datei einlesen
    const ergebnis = await redLit.dbOeffnenEinlesen({ pfad: result.filePaths[0] });
    // Öffnen abschließen
    await redLit.dbOeffnenAbschließen({ ergebnis, pfad: result.filePaths[0] });
    redLit.db.konvertiert = false;
  },

  // Datenbank: Datei einlesen
  //   pfad = String
  //     (Pfad zur Datei)
  //   offline = true | undefined
  //     (die Offlinedatei wird geöffnet => keine Offline-Kopie anlegen)
  //   zusammenfuehren = true | undefined
  //     (die Literaturdatenbank wird geladen, um sie mit den aktuellen Daten zusammenzuführen)
  async dbOeffnenEinlesen ({ pfad, offline = false, zusammenfuehren = false }) {
    const content = await bridge.ipc.invoke("io", {
      action: "read",
      path: pfad,
    });
    if (typeof content !== "string") {
      return `Beim Öffnen der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${content.name}: ${content.message}</p>`;
    }
    // Daten sind in Ordnung => Einleseoperationen durchführen
    let data_tmp;
    // Folgt die Datei einer wohlgeformten JSON?
    try {
      data_tmp = JSON.parse(content);
    } catch (err_json) {
      return `Beim Einlesen der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json.name}: ${err_json.message}`;
    }
    // Wirklich eine ZTL-Datei?
    if (data_tmp.ty !== "ztl") {
      if (!zusammenfuehren) {
        redLit.dbEntkoppeln();
      }
      return `Die Literaturdatenbank konnte nicht eingelesen werden.\nEs handelt sich nicht um eine <i>${dd.app.name} Literaturdatenbank</i>.`;
    }
    // Datenbank nicht kompatibel mit aktueller Programmversion
    if (data_tmp.ve > redLit.db.ve) {
      if (!zusammenfuehren) {
        redLit.dbEntkoppeln();
      }
      return `Die Literaturdatenbank ist nicht kompatibel mit der installierten Version von <i>${dd.app.name}</i>.\nSie sollten ein Programm-Update durchführen.`;
    }
    // Daten ggf. konvertieren
    redLit.dbKonversion({ daten: data_tmp });
    // Datei kann eingelesen werden
    redLit.db.data = data_tmp.ti;
    redLit.db.dataMeta.bl = data_tmp.bl;
    redLit.db.dataMeta.dc = data_tmp.dc;
    redLit.db.dataMeta.dm = data_tmp.dm;
    redLit.db.dataMeta.re = data_tmp.re;
    // Blockliste bereinigen (alte Einträge entfernen)
    const vorSechsMonaten = new Date();
    vorSechsMonaten.setDate(vorSechsMonaten.getMonth() - 6);
    for (let i = redLit.db.dataMeta.bl.length - 1; i >= 0; i--) {
      if (new Date(redLit.db.dataMeta.bl[i].da) <= vorSechsMonaten) {
        redLit.db.dataMeta.bl.splice(i, 1); // keine Änderungsmarkierung setzen!
      }
    }
    // Datenbank für Offline-Nutzung verfügbar halten
    if (!offline && !zusammenfuehren) {
      await redLit.dbOfflineKopie(pfad);
    }
    // Promise auflösen
    return true;
  },

  // Datenbank: Öffnen der Datenbank abschließen
  //   ergebnis = true | String
  //     (bei Fehlermeldung String)
  //   pfad = String
  //     (Pfad zur geöffneten Datenbank)
  async dbOeffnenAbschließen ({ ergebnis, pfad }) {
    if (ergebnis !== true) {
      // Einlesen ist gescheitert
      dialog.oeffnen({
        typ: "altert",
        text: ergebnis,
      });
      return;
    }
    // Datensätze auffrischen
    redLit.db.dataOpts = [];
    if (redLit.db.path !== pfad) {
      redLit.dbOfflineKopieUnlink(redLit.db.path);
      redLit.db.path = pfad;
      optionen.data["literatur-db"] = pfad;
      optionen.speichern();
    }
    const stats = await bridge.ipc.invoke("file-info", redLit.db.path);
    redLit.db.mtime = stats.mtime;
    redLit.db.gefunden = true;
    redLit.db.changed = false;
    // DB-Anzeige auffrischen
    redLit.dbAnzeige();
    // Suche zurücksetzen
    redLit.sucheReset();
    // Eingabeformular zurücksetzen
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
  },

  // Datenbank: Exportformat erfragen
  dbExportierenFormat () {
    const fenster = document.getElementById("red-lit-export");
    overlay.oeffnen(fenster);
    fenster.querySelector("input:checked").focus();
  },

  // Datenbank: Export starten
  //   autoExportFormat = String
  //     (xml | txt)
  //   autoExportPath = String
  //     (Pfad zur Datei);
  async dbExportieren (autoExportFormat, autoExportPath) {
    // Format ermitteln
    const format = {
      name: "XML",
      ext: "xml",
      content: "Literaturliste",
    };
    if (autoExportFormat === "txt" ||
        !autoExportFormat && document.getElementById("red-lit-export-format-plain").checked) {
      format.name = "Text";
      format.ext = "txt";
    }
    // Fenster schließen
    if (!autoExportFormat) {
      overlayApp.schliessen(document.getElementById("red-lit-export"));
      document.getElementById("red-lit-pfad-exportieren").focus();
    }
    // Titelaufnahmen zusammentragen und sortieren
    const aufnahmen = [];
    for (const id of Object.keys(redLit.db.data)) {
      aufnahmen.push({ id, slot: 0 });
    }
    aufnahmen.sort((a, b) => {
      const siA = redLit.db.data[a.id][a.slot].td.si;
      const siB = redLit.db.data[b.id][b.slot].td.si;
      return shared.sortSiglen(siA, siB);
    });
    // Dateidaten erstellen
    let content = "";
    if (format.ext === "xml") {
      content = '<?xml-model href="rnc/Literaturliste.rnc" type="application/relax-ng-compact-syntax"?><WGD xmlns="http://www.zdl.org/ns/1.0"><Literaturliste>';
      for (const i of aufnahmen) {
        content += redLit.dbExportierenSnippetXML(i);
      }
      content += "</Literaturliste></WGD>";
      let xmlDoc = sharedXml.parseXML(content);
      xmlDoc = sharedXml.indent(xmlDoc);
      content = new XMLSerializer().serializeToString(xmlDoc);
      // Fixes
      content = content.replace(/\?>/, "?>\n");
      content += "\n";
    } else if (format.ext === "txt") {
      for (let i = 0, len = aufnahmen.length; i < len; i++) {
        if (i > 0) {
          content += "\n\n------------------------------\n\n";
        }
        content += redLit.dbExportierenSnippetPlain(aufnahmen[i]);
      }
      content += "\n";
    }
    // Datei schreiben
    if (autoExportPath) {
      const write = await bridge.ipc.invoke("file-write", autoExportPath, content);
      if (write.message) {
        bridge.ipc.invoke("cli-message", `Fehler: ${write.name} - ${write.message}`);
        return false;
      }
      return true;
    }
    karteisucheExport.speichern(content, format);
  },

  // Datenbank: automatischen Export durchführen
  //   vars = Object
  //     (Pfade: vars.quelle, vars.ziel; ggf. auch das Format: vars.format)
  async dbExportierenAuto (vars) {
    // Format ermitteln
    const format = vars.format || "xml";

    // Ordner überprüfen
    const result = await helfer.cliFolderCheck({
      format,
      typ: "Literaturliste",
      vars,
    });
    if (result === false) {
      return false;
    }
    vars = result;

    // Message
    bridge.ipc.invoke("cli-message", `Exportiere Literaturliste nach ${vars.ziel}`);

    // DB einlesen
    const ergebnis = await redLit.dbOeffnenEinlesen({ pfad: vars.quelle });
    if (ergebnis !== true) {
      bridge.ipc.invoke("cli-message", `Fehler: ${ergebnis.replace(/<.+?>/g)}`);
      return false;
    }
    await redLit.dbOeffnenAbschließen({ ergebnis, pfad: vars.quelle });
    redLit.db.konvertiert = false;

    // DB exportieren
    const resultExport = await redLit.dbExportieren(format, vars.ziel);
    return resultExport;
  },

  // Datenbank: Titelaufnahme-Snippet in XML erstellen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  dbExportierenSnippetXML ({ id, slot }) {
    const ds = redLit.db.data[id][slot].td;
    let snippet = `<Fundstelle xml:id="${id}">`;
    snippet += `<Sigle>${sharedXml.maskieren({ text: ds.si })}</Sigle>`;
    let titel = sharedXml.maskieren({ text: ds.ti });
    titel = sharedXml.abbrTagger({
      text: titel,
      lit: true,
    });
    snippet += `<unstrukturiert>${titel}</unstrukturiert>`;
    if (ds.ul) {
      snippet += `<URL>${sharedXml.maskieren({ text: ds.ul })}</URL>`;
    }
    if (ds.ad) {
      const ad = ds.ad.split("-");
      snippet += `<Aufrufdatum>${ad[2]}.${ad[1]}.${ad[0]}</Aufrufdatum>`;
    }
    snippet += `<Fundort>${ds.fo}</Fundort>`;
    for (const i of ds.pn) {
      snippet += `<PPN>${i}</PPN>`;
    }
    snippet += "</Fundstelle>";
    return snippet;
  },

  // Datenbank: Titelaufnahme-Snippet in Plain-Text erstellen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  dbExportierenSnippetPlain ({ id, slot }) {
    const ds = redLit.db.data[id][slot].td;
    let snippet = `${ds.si}\n`;
    snippet += `${ds.ti}\n`;
    if (ds.ul) {
      snippet += `\t${ds.ul}`;
      if (ds.ad) {
        const ad = ds.ad.split("-");
        snippet += ` (Aufrufdatum: ${ad[2].replace(/^0/, "")}.\u00A0${ad[1].replace(/^0/, "")}. ${ad[0]})`;
      }
      snippet += "\n";
    }
    snippet += `\tFundort: ${ds.fo}`;
    if (ds.pn.length) {
      snippet += `\n\tPPN: ${ds.pn.join(", ")}`;
    }
    return snippet;
  },

  // Datenbank: Datei speichern
  //   speichernUnter = true | undefined
  //     (Dateidialog in jedem Fall anzeigen)
  async dbSpeichern (speichernUnter = false) {
    // Wurden überhaupt Änderungen vorgenommen?
    if (!redLit.db.changed &&
        !speichernUnter) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keine Änderungen vorgenommen.",
      });
      return;
    }
    // Dateifpad ist bekannt, wurde aber nicht wiedergefunden => prüfen, ob er jetzt da ist
    if (redLit.db.path &&
        !redLit.db.gefunden) {
      redLit.db.gefunden = await bridge.ipc.invoke("file-exists", redLit.db.path);
    }
    // Dateipfad ist bekannt und wurde wiedergefunden => direkt schreiben
    if (redLit.db.path &&
        redLit.db.gefunden &&
        !speichernUnter) {
      const ergebnis = await redLit.dbSpeichernSchreiben({ pfad: redLit.db.path });
      if (ergebnis === true) {
        redLit.dbAnzeige();
        await redLit.dbOfflineKopie(redLit.db.path);
      } else if (ergebnis) {
        dialog.oeffnen({
          typ: "alert",
          text: ergebnis,
        });
      }
      return;
    }
    // Datei soll/muss neu angelegt werden
    redLit.dbSpeichernUnter(speichernUnter);
  },

  // Datenkbank: Datei speichern unter
  //   speichernUnter = Boolean
  //     (Speichern unter/verschmelzen mit gewählt)
  async dbSpeichernUnter (speichernUnter) {
    const opt = {
      title: "Literaturdatenbank speichern",
      defaultPath: await bridge.ipc.invoke("path-join", [ dd.app.documents, "Literaturdatenbank.ztl" ]),
      filters: [
        {
          name: `${dd.app.name} Literaturdatenbank`,
          extensions: [ "ztl" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
    };
    if (speichernUnter) {
      opt.title = "Literaturdatenbank speichern unter/verschmelzen mit";
      opt.buttonLabel = "Speichern unter/verschmelzen mit";
    }
    // Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
    if (optionen.data.letzter_pfad) {
      opt.defaultPath = await bridge.ipc.invoke("path-join", [ optionen.data.letzter_pfad, "Literaturdatenbank.ztl" ]);
    }
    // Dialog anzeigen
    const result = await bridge.ipc.invoke("datei-dialog", {
      open: false,
      winId: dd.win.winId,
      opt,
    });
    // Fehler oder keine Datei ausgewählt
    if (result.message || !Object.keys(result).length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
      });
      return;
    } else if (result.canceled) {
      return;
    }
    // Datenbankdatei schreiben
    let merge = false;
    const zielExists = await bridge.ipc.invoke("file-exists", result.filePath);
    if (zielExists && redLit.db.path && redLit.db.path !== result.filePath) {
      merge = true;
    }
    const ergebnis = await redLit.dbSpeichernSchreiben({ pfad: result.filePath, merge });
    if (ergebnis !== true) {
      // Schreiben gescheitert
      if (ergebnis) {
        dialog.oeffnen({
          typ: "alert",
          text: ergebnis,
        });
      }
      return;
    }
    // ggf. Pfad zur Datenbankdatei speichern
    if (redLit.db.path !== result.filePath) {
      redLit.dbOfflineKopieUnlink(redLit.db.path);
      redLit.db.path = result.filePath;
      optionen.data["literatur-db"] = result.filePath;
      optionen.speichern();
    }
    // Anzeige auffrischen
    redLit.dbAnzeige();
    // Offline-Kopie speichern
    await redLit.dbOfflineKopie(result.filePath);
  },

  // Datenbank: Datei schreiben
  //   pfad = String
  //     (Pfad zur Datei)
  //   merge = true | undefined
  //     (Datenbanken sollen verschmolzen werden)
  async dbSpeichernSchreiben ({ pfad, merge = false }) {
    // Ist die Datenkbank gesperrt?
    let locked = await lock.actions({
      datei: pfad,
      aktion: "check",
      maxLockTime: 3e5,
    });
    if (locked) {
      lock.locked({ info: locked, typ: "Literaturdatenbank" });
      return "";
    }
    // Datenbank sperren
    await redLit.dbSperre(true);
    locked = await lock.actions({ datei: pfad, aktion: "lock" });
    if (!locked) { // Fehler beim Sperren der Datei
      redLit.dbSperre(false);
      return "";
    }
    // Datenbanken zusammenführen?
    const mergeOpts = {
      angelegt: new Set(), // Titelaufnahme neu angelegt
      entfernt: new Set(), // Titelaufnahme komplett entfernt
      ergänzt: new Set(), // Titelaufnahme um Datensätze ergänzt
      geändert: new Set(), // ID einer Titelaufnahme geändert
    };
    let merged = false;
    let stats = await bridge.ipc.invoke("file-info", pfad);
    if (!stats.exists && merge) {
      // Datei existiert wohl noch nicht => merge muss eigentlich === false sein;
      // aber sicher ist sicher; da kann so allerlei schiefgehen
      await redLit.dbSperre(false);
      lock.actions({ datei: pfad, aktion: "unlock" });
      return "Zusammenführen der Literaturdatenbanken gescheitert!\n<h3>Fehlermeldung</h3>\nkein Zugriff auf Zieldatei";
    }
    // alte Metadaten merken für den Fall, dass das Speichern scheitert
    const metaPreMerge = {
      bl: redLit.dbBlocklisteKlonen(redLit.db.dataMeta.bl),
      dc: redLit.db.dataMeta.dc,
      dm: redLit.db.dataMeta.dm,
      re: redLit.db.dataMeta.re,
    };
    // Ja, Datenbanken zusammenführen!
    if (stats.exists && (merge || stats.mtime !== redLit.db.mtime)) {
      // Kopie der Titeldaten anlegen
      redLit.db.dataTmp = {};
      redLit.dbKlonen({ quelle: redLit.db.data, ziel: redLit.db.dataTmp });
      // geänderte Datenbank herunterladen
      const result = await redLit.dbOeffnenEinlesen({ pfad, zusammenfuehren: true });
      if (result !== true) {
        // Titeldaten wiederherstellen
        redLit.db.data = {};
        redLit.dbKlonen({ quelle: redLit.db.dataTmp, ziel: redLit.db.data });
        // Metdaten zurücksetzen
        redLit.db.dataMeta.bl = redLit.dbBlocklisteKlonen(metaPreMerge.bl);
        redLit.db.dataMeta.dc = metaPreMerge.dc;
        redLit.db.dataMeta.dm = metaPreMerge.dm;
        redLit.db.dataMeta.re = metaPreMerge.re;
        // Datenbank entsperren
        await redLit.dbSperre(false);
        lock.actions({ datei: pfad, aktion: "unlock" });
        // Fehlermeldung
        return `Zusammenführen der Literaturdatenbanken gescheitert!\n${result}`;
      }
      redLit.db.konvertiert = false;
      // ggf. Popup schließen
      redLit.anzeigePopupSchliessen();
      // Operationen seit dem letzten Speichern anwenden
      redLit.db.dataOpts.forEach(i => {
        if (i.aktion === "add") { // Datensatz hinzufügen
          if (!redLit.db.dataTmp[i.id]) {
            // die Titelaufnahme könnte angelegt und kurz danach wieder
            // komplett gelöscht worden sein
            return;
          }
          let aktion = "ergänzt";
          if (!redLit.db.data[i.id]) {
            aktion = "angelegt";
            redLit.db.data[i.id] = [];
          }
          const slot = redLit.db.dataTmp[i.id].findIndex(j => j.id === i.idSlot);
          const ds = {};
          redLit.dbTitelKlonenAufnahme(redLit.db.dataTmp[i.id][slot], ds);
          if (redLit.db.data[i.id].some(j => j.id === i.idSlot)) {
            // sehr, sehr, sehr, sehr, sehr, sehr unwahrscheinlich,
            // könnte aber theoretisch sein, dass die ID schon vergeben ist
            ds.id += "0";
          }
          redLit.db.data[i.id].unshift(ds);
          mergeOpts[aktion].add(ds.td.si);
          merged = true;
        } else if (i.aktion === "del") { // Datensatz löschen
          if (!redLit.db.data[i.id]) {
            return;
          }
          const slot = redLit.db.data[i.id].findIndex(j => j.id === i.idSlot);
          if (slot === -1) {
            return;
          }
          mergeOpts.entfernt.add(redLit.db.data[i.id][slot].td.si);
          merged = true;
          redLit.db.data[i.id].splice(slot, 1);
          if (!redLit.db.data[i.id].length) {
            delete redLit.db.data[i.id];
          }
        } else if (i.aktion === "changeId") { // Datensatz-ID geändert
          if (redLit.db.data[i.id] || !redLit.db.data[i.idAlt]) {
            return;
          }
          redLit.db.data[i.id] = [];
          redLit.dbTitelKlonen(redLit.db.data[i.idAlt], redLit.db.data[i.id]);
          delete redLit.db.data[i.idAlt];
          mergeOpts.geändert.add(redLit.db.data[i.id][0].td.si);
          merged = true;
        }
      });
    }
    // ggf. Datenbanken mergen
    if (merge) {
      for (const [ k, v ] of Object.entries(redLit.db.dataTmp)) {
        // Titelaufnahme ist in Blockliste
        if (redLit.db.dataMeta.bl.some(i => i.id === k)) {
          continue;
        }
        // Titelaufnahme nicht vorhanden => Aufnahme mit allen Versionen klonen
        if (!redLit.db.data[k]) {
          redLit.db.data[k] = [];
          redLit.dbTitelKlonen(v, redLit.db.data[k]);
          mergeOpts.angelegt.add(redLit.db.data[k][0].td.si);
          merged = true;
          continue;
        }
        // einzelne Versionen einer Titelaufnahme klonen
        const ergaenzt = redLit.dbTitelMergeAufnahmen(v, redLit.db.data[k]);
        if (ergaenzt) {
          mergeOpts.ergänzt.add(redLit.db.data[k][0].td.si);
          merged = true;
        }
      }
    }
    // alte Metadaten merken für den Fall, dass das Speichern scheitert
    const meta = {
      bl: redLit.dbBlocklisteKlonen(redLit.db.dataMeta.bl),
      dc: redLit.db.dataMeta.dc,
      dm: redLit.db.dataMeta.dm,
      re: redLit.db.dataMeta.re,
    };
    // Blockliste auffrischen
    const [ heute ] = new Date().toISOString().split("T");
    redLit.db.dataOpts.forEach(i => {
      if (i.aktion === "del") { // Datensatz gelöscht
        if (!redLit.db.data[i.id] &&
            !redLit.db.dataMeta.bl.some(j => j.id === i.id)) {
          populateBlocklist(i.id);
        } else if (redLit.db.data[i.id]) {
          populateBlocklist(i.idSlot);
        }
      } else if (i.aktion === "changeId" &&
          !redLit.db.data[i.idAlt]) { // Datensatz-ID geändert
        populateBlocklist(i.idAlt);
      }
    });
    function populateBlocklist (id) {
      redLit.db.dataMeta.bl.push({
        da: heute,
        id,
      });
    }
    // weitere Metadaten auffrischen
    if (!redLit.db.dataMeta.dc) {
      redLit.db.dataMeta.dc = new Date().toISOString();
    }
    redLit.db.dataMeta.dm = new Date().toISOString();
    redLit.db.dataMeta.re++;
    // Daten schreiben
    const daten = redLit.dbSpeichernSchreibenDaten();
    const result = await bridge.ipc.invoke("io", {
      action: "write",
      path: pfad,
      data: JSON.stringify(daten),
    });
    // beim Schreiben ist ein Fehler aufgetreten
    if (result !== true) {
      if (merged) {
        // Titeldaten wiederherstellen
        redLit.db.data = {};
        redLit.dbKlonen({ quelle: redLit.db.dataTmp, ziel: redLit.db.data });
        // Metdaten zurücksetzen
        redLit.db.dataMeta.bl = redLit.dbBlocklisteKlonen(metaPreMerge.bl);
        redLit.db.dataMeta.dc = metaPreMerge.dc;
        redLit.db.dataMeta.dm = metaPreMerge.dm;
        redLit.db.dataMeta.re = metaPreMerge.re;
      } else {
        // Metdaten zurücksetzen
        redLit.db.dataMeta.bl = redLit.dbBlocklisteKlonen(meta.bl);
        redLit.db.dataMeta.dc = meta.dc;
        redLit.db.dataMeta.dm = meta.dm;
        redLit.db.dataMeta.re = meta.re;
      }
      // Datenbank entsperren
      await redLit.dbSperre(false);
      lock.actions({ datei: pfad, aktion: "unlock" });
      // Fehlermeldung zurückgeben
      return `Beim Speichern der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`;
    }
    // Operationenspeicher leeren
    redLit.db.dataOpts = [];
    // Änderungsdatum auffrischen
    stats = await bridge.ipc.invoke("file-info", pfad);
    redLit.db.mtime = stats.mtime;
    // Datenbank entsperren
    await redLit.dbSperre(false);
    lock.actions({ datei: pfad, aktion: "unlock" });
    // Datenbank wurde normal gespeichert => alles klar
    if (!merged) {
      return true;
    }
    // Suchergebnisse auffrischen
    redLit.sucheTrefferAlleAuffrischen();
    // Rückmeldung, was beim Mergen getan wurde
    let text = "Ihre Änderungen wurden in eine neuere Version der Literaturdatenbank übertragen.";
    if (merge) {
      text = `Ihre Literaturdatenbank wurde mit\n<p class="force-wrap"><i>${pfad}</i></p>\nverschmolzen.`;
    } else if (!redLit.db.path) {
      text = "Ihre Änderungen wurden in die Literaturdatenbank integriert.";
    }
    text += "\nDabei wurden folgende Operationen ausgeführt:";
    for (let [ k, v ] of Object.entries(mergeOpts)) {
      if (!v.size) {
        continue;
      }
      let ziffer = "" + v.size;
      if (v.size === 1) {
        ziffer = "eine";
      }
      let numerus = "Titelaufnahme wurde";
      if (v.size > 1) {
        numerus = "Titelaufnahmen wurden";
      }
      let praep = "";
      if (k === "geändert") {
        praep = "von ";
        if (v.size === 1) {
          ziffer = "einer";
        } else {
          numerus = "Titelaufnahmen wurde";
        }
        k = "die ID geändert";
      }
      const siglen = [ ...v ].sort(shared.sortSiglen);
      text += `\n<p class="dialog-liste">• ${praep}${ziffer} ${numerus} ${k} (<i>${siglen.join(", ")}</i>)</p>`;
    }
    dialog.oeffnen({
      typ: "alert",
      text,
    });
    return true;
  },

  // Datenbank: Daten zuammentragen, die geschrieben werden sollen
  dbSpeichernSchreibenDaten () {
    return {
      bl: redLit.db.dataMeta.bl,
      dc: redLit.db.dataMeta.dc,
      dm: redLit.db.dataMeta.dm,
      re: redLit.db.dataMeta.re,
      ti: redLit.db.data,
      ty: "ztl",
      ve: redLit.db.ve,
    };
  },

  // Datenbank: Eingabefenster für Bearbeitung sperren
  //   sperren = Boolean
  //     (DB soll gesperrt werden)
  async dbSperre (sperren) {
    // sperren
    if (sperren) {
      redLit.db.locked = true;
      document.activeElement.blur();
      // ggf. auf Schließen des Dropdownmenüs warten
      if (document.getElementById("dropdown")) {
        await new Promise(warten => setTimeout(() => warten(true), 500));
      }
      // Sperre erzeugen
      const sperre = document.createElement("div");
      document.querySelector("#red-lit > div").appendChild(sperre);
      sperre.id = "red-lit-sperre";
      const text = document.createElement("div");
      sperre.appendChild(text);
      text.textContent = "Speichern läuft ...";
      // Animation starten
      redLit.db.lockedInterval = setInterval(() => {
        const punkte = text.textContent.match(/\.+$/);
        if (punkte[0].length === 3) {
          text.textContent = "Speichern läuft .";
        } else {
          text.textContent += ".";
        }
      }, 1e3);
      return;
    }
    // entsperren
    await new Promise(warten => setTimeout(() => warten(true), 3e3));
    clearInterval(redLit.db.lockedInterval);
    const sperre = document.getElementById("red-lit-sperre");
    sperre.parentNode.removeChild(sperre);
    if (!document.getElementById("red-lit-suche").classList.contains("aus")) {
      document.getElementById("red-lit-suche-text").select();
    } else {
      document.getElementById("red-lit-eingabe-ti").focus();
    }
    redLit.db.locked = false;
  },

  // Datenbank: Offline-Kopie im Einstellungenordner anlegen
  //   pfad = String
  //     (Pfad zur Datenkbank)
  async dbOfflineKopie (pfad) {
    const offlinePfad = await redLit.dbOfflineKopiePfad(pfad);
    const daten = redLit.dbSpeichernSchreibenDaten();
    await bridge.ipc.invoke("io", {
      action: "write",
      path: offlinePfad,
      data: JSON.stringify(daten),
    });
  },

  // Datenbank: Pfad zur Offline-Kopie ermitteln
  //   pfad = String
  //     (Pfad zur Datenkbank)
  async dbOfflineKopiePfad (pfad) {
    // Laufwerksbuchstabe entfernen (Windows)
    pfad = pfad.replace(/^[a-zA-Z]:/, "");
    // Pfad splitten
    const reg = new RegExp(`${shared.escapeRegExp(dd.app.pathSep)}`);
    const pfadSplit = pfad.split(reg);
    // Splits kürzen
    //   (damit der Dateiname nicht zu lang wird, aber noch eindeutig ist)
    // leere Slots am Anfang entfernen
    //   (kann sein, wenn die Datei z.B. in /Datei.ztl oder C:\Datei.ztl liegt)
    while (pfadSplit.length > 3 ||
        !pfadSplit[0]) {
      pfadSplit.shift();
    }
    return await bridge.ipc.invoke("path-join", [ dd.app.userData, pfadSplit.join("_") ]);
  },

  // Datenbank: Offline-Kopie im Einstellungenordner löschen
  //   pfad = String
  //     (Pfad zur Datenkbank)
  async dbOfflineKopieUnlink (pfad) {
    if (!pfad) {
      return;
    }
    const offlinePfad = await redLit.dbOfflineKopiePfad(pfad);
    const offlineVorhanden = await bridge.ipc.invoke("file-exists", offlinePfad);
    if (offlineVorhanden) {
      bridge.ipc.invoke("file-unlink", offlinePfad);
    }
  },

  // Datenbank: prüft, ob noch ein Speichervorgang aussteht
  //   fun = Function | undefined
  //     (Callback-Funktion)
  //   db = false | undefined
  //     (überprüfen, ob die Datenbank gespeichert wurde)
  async dbCheck (fun = null, db = true) {
    // Änderungen im Formular noch nicht gespeichert?
    if (redLit.eingabe.changed) {
      if (!document.getElementById("red-lit-nav-eingabe").checked) {
        redLit.nav("eingabe");
      }
      const speichern = await new Promise(antwort => {
        dialog.oeffnen({
          typ: "confirm",
          text: "Die Titelaufnahme im Eingabeformular wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Titelaufnahme nicht erst einmal speichern?",
          callback: () => {
            if (dialog.antwort) {
              redLit.eingabeSpeichern();
              antwort(true);
            } else if (dialog.antwort === false) {
              redLit.eingabe.changed = false;
              antwort(false);
            } else {
              antwort(null);
            }
          },
        });
      });
      if (speichern || speichern === null) {
        return false;
      }
    }
    // Änderungen in der DB noch nicht gespeichert?
    if (db && redLit.db.changed) {
      let text = "Die Datenbank wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Datenbank nicht erst einmal speichern?";
      if (!redLit.db.path) {
        text = "Sie haben Titelaufnahmen angelegt, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal in einer Datenbank speichern?";
      }
      const speichern = await new Promise(antwort => {
        dialog.oeffnen({
          typ: "confirm",
          text,
          callback: () => {
            if (dialog.antwort) {
              redLit.dbSpeichern();
              antwort(true);
            } else if (dialog.antwort === false) {
              redLit.db.mtime = ""; // damit die DB beim erneuten Öffnen des Fenster neu geladen wird
              redLit.db.changed = false;
              antwort(false);
            } else {
              antwort(null);
            }
          },
        });
      });
      if (speichern || speichern === null) {
        return false;
      }
    }
    // es steht nichts mehr aus => Funktion direkt ausführen
    if (fun) {
      fun();
    }
    return true;
  },

  // Datenbank: alle Titeldaten klonen
  //   quelle = Object
  //     (Quelle der Titeldaten)
  //   ziel = Object
  //     (Ziel der Titeldaten, also der Klon)
  dbKlonen ({ quelle, ziel }) {
    for (const [ k, v ] of Object.entries(quelle)) {
      ziel[k] = [];
      redLit.dbTitelKlonen(v, ziel[k]);
    }
  },

  // Datenbank: Daten der Blockliste klonen
  //   quelle = Object
  //     (Quelle der Blockliste)
  dbBlocklisteKlonen (quelle) {
    const bl = [];
    for (const i of quelle) {
      bl.push({ ...i });
    }
    return bl;
  },

  // Datenbank: kompletten Datensatz einer Titelaufnahme klonen
  //   quelle = Object
  //     (der Quell-Datensatz)
  //   ziel = Object
  //     (der Ziel-Datensatz)
  dbTitelKlonen (quelle, ziel) {
    for (let i = 0, len = quelle.length; i < len; i++) {
      if (redLit.db.dataMeta.bl.some(j => j.id === quelle[i].id)) { // Titelaufnahme in Blockliste
        continue;
      }
      const ds = {};
      redLit.dbTitelKlonenAufnahme(quelle[i], ds);
      ziel.push(ds);
    }
  },

  // Datenbank: einzelnen Datensatz einer Titelaufnahme klonen
  //   quelle = Object
  //     (der Quell-Datensatz)
  //   ziel = Object
  //     (der Ziel-Datensatz)
  dbTitelKlonenAufnahme (quelle, ziel) {
    for (const [ k, v ] of Object.entries(quelle)) {
      if (Array.isArray(v)) { // Arrays
        ziel[k] = [ ...v ];
      } else if (typeof v === "object") { // Objects
        ziel[k] = {};
        redLit.dbTitelKlonenAufnahme(v, ziel[k]);
      } else { // Primitiven
        ziel[k] = v;
      }
    }
  },

  // Datenbank: alle in einer Titelaufnahme nicht vorhandenen Datensätze kopieren
  //   quelle = Array
  //     (der Quell-Titelaufnahme)
  //   ziel = Array
  //     (der Ziel-Titelaufnahme)
  dbTitelMergeAufnahmen (quelle, ziel) {
    let ergaenzt = false;
    quelle.forEach(aq => {
      if (ziel.some(i => i.id === aq.id) ||
          redLit.db.dataMeta.bl.some(i => i.id === aq.id)) { // Titelaufnahme in Blockliste
        return;
      }
      const ds = {};
      redLit.dbTitelKlonenAufnahme(aq, ds);
      const dsDatum = new Date(ds.da);
      let slot = -1;
      for (let i = 0, len = ziel.length; i < len; i++) {
        const zielDatum = new Date(ziel[i].da);
        if (dsDatum > zielDatum) {
          slot = i;
          break;
        }
      }
      if (slot === -1) {
        ziel.push(ds);
      } else {
        ziel.splice(slot, 0, ds);
      }
      ergaenzt = true;
    });
    return ergaenzt;
  },

  // Datenbank: an neue Formate anpassen
  // (WICHTIG! Aktuelle Format-Version in redLit.db.ve einstellen!)
  //   daten = Object
  //     (die kompletten JSON-Daten einer ZTL-Datei)
  dbKonversion ({ daten }) {
    // Datenbank hat die aktuelle Version
    if (daten.ve === redLit.db.ve) {
      return;
    }
    let konvertiert = false;
    // von v1 > v2
    if (daten.ve === 1) {
      // Tag-Array in allen Datensätzen ergänzen
      for (const ti of Object.values(daten.ti)) {
        for (const i of ti) {
          i.td.tg = [];
        }
      }
      daten.ve++;
      konvertiert = true;
    }
    // von v2 > v3
    if (daten.ve === 2) {
      // Blockliste anlegen
      daten.bl = [];
      daten.ve++;
      konvertiert = true;
    }
    if (konvertiert) {
      redLit.db.konvertiert = true;
      redLit.dbGeaendert(true);
    }
  },

  // Navigation: Listener für das Umschalten
  //   input = Element
  //     (der Radiobutton zum Umschalten der Formulare)
  navListener (input) {
    input.addEventListener("change", function () {
      const form = this.id.replace(/.+-/, "");
      redLit.nav(form, true);
    });
  },

  // Navigation: Umschalten zwischen Eingabe- und Suchformular
  //   form = String
  //     ("eingabe" od. "suche")
  //   nav = true | undefined
  //     (Funktion wurde über das Navigationsformular aufgerufen => nie abbrechen)
  nav (form, nav = false) {
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // schon in der richtigen Sektion
    if (!nav && document.getElementById(`red-lit-nav-${form}`).checked) {
      return;
    }
    // Radio-Buttons umstellen
    const radio = document.querySelectorAll("#red-lit-nav input");
    for (const i of radio) {
      if (i.id === `red-lit-nav-${form}`) {
        i.checked = true;
      } else {
        i.checked = false;
      }
    }
    // Block umstellen
    const formulare = [ "red-lit-suche", "red-lit-eingabe" ];
    for (const i of formulare) {
      const block = document.getElementById(i);
      if (i.includes(`-${form}`)) {
        block.classList.remove("aus");
      } else {
        block.classList.add("aus");
      }
    }
    // ggf. Fous setzen
    if (nav && form === "suche") {
      document.getElementById("red-lit-suche-text").select();
    } else if (nav) {
      const ti = document.getElementById("red-lit-eingabe-ti");
      shared.textareaGrow(ti);
      ti.focus();
    }
  },

  // Suche: Speicher für Variablen
  suche: {
    treffer: [],
    highlight: null,
    sonder: "",
    id: null,
  },

  // Suche: zum Formular wechseln
  sucheWechseln () {
    redLit.nav("suche");
    document.getElementById("red-lit-suche-text").select();
  },

  // Suche: Formular zurücksetzen
  sucheReset () {
    const inputs = document.querySelectorAll("#red-lit-suche p:first-child input");
    for (const i of inputs) {
      i.value = "";
    }
    redLit.sucheResetBloecke(true);
  },

  // Suche: Formular zurücksetzen (Blöcke)
  //   aus = Boolean
  //     (Blöcke ausstellen)
  sucheResetBloecke (aus) {
    const bloecke = [ "titel", "treffer" ];
    for (const i of bloecke) {
      const block = document.getElementById(`red-lit-suche-${i}`);
      if (aus) {
        block.classList.add("aus");
      } else {
        block.classList.remove("aus");
      }
    }
    // Maximalhöhe der Trefferanzeige berechnen
    if (!aus) {
      shared.elementMaxHeight({
        ele: document.getElementById("red-lit-suche-titel"),
      });
    }
  },

  // Suche: Listener für die Formularfelder
  //   input = Element
  //     (Formularfeld)
  sucheListener (input) {
    input.addEventListener("keydown", function (evt) {
      sharedTastatur.detectModifiers(evt);
      if (!sharedTastatur.modifiers && evt.key === "Enter") {
        redLit.sucheStarten();
      } else if (this.id === "red-lit-suche-text") {
        if (evt.key === "Enter" && /^(Ctrl|Ctrl\+Shift)$/.test(sharedTastatur.modifiers)) {
          const titel = document.getElementById("red-lit-suche-titel");
          if (titel.classList.contains("aus")) {
            return;
          }
          for (const i of titel.querySelectorAll(".red-lit-snippet")) {
            if (i.offsetTop >= titel.scrollTop - 10) { // 10px padding-top
              const ds = JSON.parse(i.dataset.ds);
              if (sharedTastatur.modifiers === "Ctrl") {
                const xmlIcon = i.querySelector(".icon-xml");
                if (xmlIcon) {
                  xmlIcon.dispatchEvent(new MouseEvent("click"));
                }
              } else {
                redLit.anzeigePopup(ds);
              }
              break;
            }
          }
        } else if (sharedTastatur.modifiers === "Alt" && /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
          evt.preventDefault();
          if (evt.repeat) { // Repeats unterbinden
            return;
          }
          const a = document.querySelectorAll("#red-lit-suche-treffer a");
          if (evt.key === "ArrowLeft") {
            a[0].dispatchEvent(new MouseEvent("click"));
          } else {
            a[1].dispatchEvent(new MouseEvent("click"));
          }
        } else if (!sharedTastatur.modifiers && /^(ArrowDown|ArrowUp|PageDown|PageUp)$/.test(evt.key)) {
          evt.preventDefault();
          if (evt.repeat) { // Repeats unterbinden
            return;
          }
          const titel = document.getElementById("red-lit-suche-titel");
          const prozent = titel.offsetHeight / 100 * 88;
          let move = 0;
          switch (evt.key) {
            case "ArrowDown":
              move = 40;
              break;
            case "ArrowUp":
              move = -40;
              break;
            case "PageDown":
              move = prozent;
              break;
            case "PageUp":
              move = -prozent;
              break;
          }
          titel.scrollTo({
            top: titel.scrollTop + move,
            left: 0,
            behavior: "smooth",
          });
        }
      }
    });
  },

  // Suche: Sondersuche starten
  //   a = Element
  //     (Link für eine Sondersuche)
  sucheSonder (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      redLit.suche.sonder = this.dataset.sonder;
      redLit.sucheStarten();
      redLit.suche.sonder = "";
    });
  },

  // Suche: starten
  sucheStarten () {
    // Suchhilfe schließen
    document.getElementById("red-lit-suche-hilfe-fenster").classList.add("aus");
    // Filterkriterien auslesen/Variablen vorbereiten
    const input = document.getElementById("red-lit-suche-text");
    let text = shared.textTrim(input.value, true);
    const ab = document.getElementById("red-lit-suche-ab").value;
    const st = [];
    let da = null;
    let auchAlte = false;
    let erstellerin = null;
    redLit.suche.id = null;
    redLit.suche.treffer = [];
    redLit.suche.highlight = [];
    if (text) {
      const woerter = [];
      // auch veraltete Titelaufnahmen durchsuchen
      text = text.replace(/(aa|auchalte):""/ig, () => {
        if (!redLit.suche.sonder) {
          auchAlte = true;
        }
        return "";
      });
      // Suche auf Titel einer bestimmten ErstellerIn eingrenzen
      text = text.replace(/(?:er|erst|ersteller|erstellerin):"(.*?)"/ig, (m, p1) => {
        if (!redLit.suche.sonder && p1) {
          // kein Suchtext => Feld ignorieren => trifft auf alle Aufnahmen zu;
          // kein Suchtext + negative Suche => sinnlos => trifft auf keine Aufnahme zu
          const reg = new RegExp(shared.escapeRegExp(p1), "gi");
          erstellerin = reg;
          redLit.suche.highlight.push({
            feld: "be",
            reg,
            negativ: false,
          });
        }
        return "";
      });
      // Feldsuche
      text = text.replace(/(-?)([a-zA-Z]+):"(.*?)"/g, (...args) => {
        const feld = feldCheck(args[2]);
        if (feld === "id" && !args[3]) {
          // Suche nach ID ohne Suchtext
          if (args[1]) {
            // negiert => keine Treffer produzieren
            return args[0].substring(1);
          }
          // nicht negiert => trifft auf alle Titel zu => ignorieren
          return "";
        } else if (!feld) {
          // angegebenes Suchfeld existiert nicht => diese Suchanfrage sollte keine Treffer produzieren
          return args[0];
        } else if (feld === "id") {
          // Suche nach ID
          redLit.suche.id = new RegExp(shared.escapeRegExp(args[3].toLowerCase()));
          return "";
        }
        woerter.push({
          feld,
          text: args[3],
          negativ: Boolean(args[1]),
        });
        return "";
      });
      // Phrasensuche
      text = text.replace(/(-?)(?<!:)"(.+?)"/g, (m, p1, p2) => {
        // (?<!:) damit Suchen mit irregulärer Suchsyntax keine Treffer produzieren
        woerter.push({
          feld: "",
          text: p2,
          negativ: Boolean(p1),
        });
        return "";
      });
      // Wortsuche
      text.split(/\s/).forEach(i => {
        if (!i) {
          return;
        }
        let negativ = false;
        if (/^-/.test(i)) {
          negativ = true;
          i = i.substring(1);
        }
        woerter.push({
          feld: "",
          text: i,
          negativ,
        });
      });
      for (const wort of woerter) {
        let insensitive = "i";
        if (/[A-ZÄÖÜ]/.test(wort.text)) {
          insensitive = "";
        }
        let reg = null;
        if (wort.text) {
          reg = new RegExp(shared.escapeRegExp(wort.text).replace(/ /g, "\\s"), "g" + insensitive);
        }
        const obj = {
          feld: wort.feld,
          reg,
          negativ: wort.negativ,
        };
        st.push(obj);
        redLit.suche.highlight.push(obj);
      }
    }
    if (ab) {
      da = new Date(ab);
      // Die folgende Verrenkung ist nötig, um die Uhrzeit auf 0 Uhr zu stellen.
      // Sonst wird der Offset zur GMT hinzugerechnet, weswegen Titelaufnahme, die
      // um 0 Uhr erstellt wurden, nicht korrekt gefunden werden.
      da = new Date(da.getFullYear(), da.getMonth(), da.getDate());
    }
    // Zeiger für das Trefferobjekt
    const treffer = redLit.suche.treffer;
    // Sondersuche Duplikate
    const duplikate = {
      ti: {}, // Titel identisch
      si: {}, // Sigle identisch
      ul: {}, // URL identisch
      pn: {}, // PPN identisch
    };
    if (redLit.suche.sonder === "duplikate") {
      for (const [ k, v ] of Object.entries(redLit.db.data)) {
        for (const [ l, w ] of Object.entries(redLit.db.data)) {
          if (l === k) {
            continue;
          }
          if (w[0].td.si === v[0].td.si) { // Sigle identisch
            addDuplikat({
              key: "si",
              value: w[0].td.si,
              k,
              l,
            });
          }
          if (w[0].td.ti === v[0].td.ti) { // Titel identisch
            addDuplikat({
              key: "ti",
              value: w[0].td.ti,
              k,
              l,
            });
          }
          if (v[0].td.ul && w[0].td.ul === v[0].td.ul) { // URL identisch
            addDuplikat({
              key: "ul",
              value: w[0].td.ul,
              k,
              l,
            });
          }
          for (const p of v[0].td.pn) { // PPN identisch
            if (w[0].td.pn.includes(p)) {
              addDuplikat({
                key: "pn",
                value: w[0].td.pn,
                k,
                l,
              });
            }
          }
        }
      }
      const duplikateGruende = {
        ti: "Titel identisch",
        si: "Sigle identisch",
        ul: "URL identisch",
        pn: "PPN identisch",
      };
      for (const [ k, v ] of Object.entries(duplikate)) {
        for (const s of Object.values(v)) {
          for (const id of s) {
            treffer.push({
              id,
              slot: 0,
              meldung: duplikateGruende[k],
            });
          }
        }
      }
    }
    function addDuplikat ({ key, value, k, l }) {
      if (!duplikate[key][value]) {
        duplikate[key][value] = new Set();
      }
      for (const i of [ k, l ]) {
        duplikate[key][value].add(i);
      }
    }
    // Einträge durchsuchen
    const datensaetze = [
      [ "be" ],
      [ "td", "ad" ],
      [ "td", "fo" ],
      [ "td", "no" ],
      [ "td", "pn" ],
      [ "td", "si" ],
      [ "td", "tg" ],
      [ "td", "ti" ],
      [ "td", "ul" ],
    ];
    for (const [ id, arr ] of Object.entries(redLit.db.data)) {
      // Suche ggf. auf ErstellerIn einer Titelaufnahme eingrenzen
      if (erstellerin &&
          !erstellerin.test(arr[arr.length - 1].be)) {
        continue;
      }
      // Suche nach ID
      if (redLit.suche.id && !redLit.suche.id.test(id)) {
        continue;
      }
      // Sondersuchen
      if (redLit.suche.sonder === "duplikate") { // Suche bereits abgeschlossen
        break;
      } else if (redLit.suche.sonder === "versionen" &&
          arr.length === 1) { // mehrere Versionen
        continue;
      }
      // Suche nach Text und Datum
      for (let i = 0, len = arr.length; i < len; i++) {
        const aufnahme = arr[i];
        // standardmäßig nur die erste Titelaufnahme durchsuchen
        if (i > 0 && !auchAlte) {
          break;
        }
        // Datum
        let daOk = !da;
        if (da) {
          const daA = new Date(aufnahme.da);
          if (daA >= da) {
            daOk = true;
          }
        }
        // Text
        let stOk = !st.length;
        if (st.length) {
          const ok = Array(st.length).fill(false);
          x: for (let j = 0, lenJ = st.length; j < lenJ; j++) {
            const okNegativ = Array(datensaetze.length).fill(false);
            for (let k = 0, lenK = datensaetze.length; k < lenK; k++) {
              const l = datensaetze[k];
              // dieses Feld durchsuchen?
              if (st[j].feld && !l.includes(st[j].feld)) {
                continue;
              }
              // Datensatz ermitteln
              let ds = aufnahme[l[0]];
              if (l[1]) {
                ds = ds[l[1]];
              }
              // Datensatz durchsuchen
              const txt = Array.isArray(ds) ? ds.join(", ") : ds;
              if (
                !st[j].reg && // kein Suchtext
                    (st[j].negativ && !txt || // Negativsuche && Feld leer
                    !st[j].negativ && txt) || // keine Negativsuche && Feld irgendwie gefüllt
                  st[j].reg && // Suchtext
                    (st[j].negativ && !txt.match(st[j].reg) || // Negativsuche && kein Treffer im Feld
                    !st[j].negativ && txt.match(st[j].reg)) // keine Negativsuche && Treffer im Feld
              ) {
                if (!st[j].feld && st[j].negativ) {
                  // bei Negativsuche ohne Feldangabe muss die Negation auf alle Datensätze zutreffen
                  okNegativ[k] = true;
                } else {
                  ok[j] = true;
                  continue x;
                }
              }
            }
            if (st[j].negativ && !okNegativ.includes(false)) {
              // Negativsuche okay, wenn keiner der Datensätze einen Treffer produzierte
              ok[j] = true;
            }
            if (!ok[j]) {
              break;
            }
          }
          if (!ok.includes(false)) {
            stOk = true;
          }
        }
        // Treffer aufhnehmen?
        if (daOk && stOk) {
          treffer.push({ id, slot: i });
          break;
        }
      }
    }
    // Treffer sortieren (nach Sigle)
    if (redLit.suche.sonder !== "duplikate") {
      treffer.sort((a, b) => {
        const siA = redLit.db.data[a.id][a.slot].td.si;
        const siB = redLit.db.data[b.id][b.slot].td.si;
        return shared.sortSiglen(siA, siB);
      });
    }
    // Suchtreffer anzeigen
    redLit.sucheAnzeigen(0);
    // Suchtext selektieren
    input.select();
    // Feld-Schalter ermitteln
    function feldCheck (text) {
      const erlaubt = [ "be", "ad", "fo", "id", "no", "pn", "si", "tg", "ti", "ul" ];
      text = text.toLowerCase();
      switch (text) {
        case "bearb":
          text = "be";
          break;
        case "bearbeiter":
          text = "be";
          break;
        case "bearbeiterin":
          text = "be";
          break;
        case "sigle":
          text = "si";
          break;
        case "titel":
          text = "ti";
          break;
        case "url":
          text = "ul";
          break;
        case "aufrufdatum":
          text = "ad";
          break;
        case "fundort":
          text = "fo";
          break;
        case "ppn":
          text = "pn";
          break;
        case "tags":
          text = "tg";
          break;
        case "notizen":
          text = "no";
          break;
      }
      if (!erlaubt.includes(text)) {
        text = "";
      }
      return text;
    }
  },

  // Suche: Treffer anzeigen
  //   start = Number
  //     (Index, von dem aus die Ergebnisse angezeigt werden sollen)
  sucheAnzeigen (start) {
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // keine Treffer => keine Anzeige
    const treffer = redLit.suche.treffer;
    if (!treffer.length) {
      const st = document.getElementById("red-lit-suche-text");
      st.classList.add("keine-treffer");
      setTimeout(() => st.classList.remove("keine-treffer"), 1500);
      redLit.sucheResetBloecke(true);
      return;
    }
    // ggf. Anzeige vorbereiten
    if (start === 0) {
      redLit.sucheResetBloecke(false);
    }
    // 50 Treffer drucken (max.)
    redLit.anzeige.snippetKontext = "suche";
    const titel = document.getElementById("red-lit-suche-titel");
    titel.scrollTop = 0;
    titel.replaceChildren();
    for (let i = start, len = start + 50; i < len; i++) {
      // letzter Treffer erreicht
      if (!treffer[i]) {
        break;
      }
      titel.appendChild(redLit.anzeigeSnippet(treffer[i]));
    }
    // Trefferanzeige auffrischen
    redLit.sucheAnzeigenNav(start);
  },

  // Suche: Anzeige der Navigationsleiste auffrischen
  //   start = Number
  //     (Nummer, ab der die Treffer angezeigt werden; nullbasiert)
  sucheAnzeigenNav (start) {
    const treffer = redLit.suche.treffer;
    let range = `${start + 1}–${treffer.length > start + 50 ? start + 50 : treffer.length}`;
    if (treffer.length === 1) {
      range = "1";
    }
    document.getElementById("red-lit-suche-trefferzahl").textContent = `${range} / ${treffer.length}`;
    document.querySelectorAll("#red-lit-suche-treffer a").forEach((a, n) => {
      if (n === 0) { // zurückblättern
        a.dataset.start = `${start - 50}`;
        if (start > 0) {
          a.classList.remove("inaktiv");
        } else {
          a.classList.add("inaktiv");
        }
      } else { // vorblättern
        a.dataset.start = `${start + 50}`;
        if (treffer.length > start + 50) {
          a.classList.remove("inaktiv");
        } else {
          a.classList.add("inaktiv");
        }
      }
    });
  },

  // Suche: in den Treffern blättern
  //   a = Element
  //     (Icon-Link zum Vor- oder Rückwärtsblättern)
  sucheNav (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (this.classList.contains("inaktiv")) {
        return;
      }
      const start = parseInt(this.dataset.start, 10);
      redLit.sucheAnzeigen(start);
    });
  },

  // Suche: Snippet markieren (Listener)
  //   div = Element
  //     (Snippet mit einer Titelaufnahme)
  sucheSnippetMarkierenListener (div) {
    div.addEventListener("click", function () {
      if (this.classList.contains("markiert")) { // Snippet ist markiert => demarkieren
        this.classList.remove("markiert");
        return;
      }
      redLit.sucheSnippetMarkieren(this);
    });
  },

  // Suche: Snippet markieren
  //   div = Element
  //     (Snippet mit einer Titelaufnahme)
  sucheSnippetMarkieren (div) {
    const markiert = document.querySelector("#red-lit-suche-titel .markiert");
    if (markiert) {
      markiert.classList.remove("markiert");
    }
    div.classList.add("markiert");
  },

  // Suche: Titelaufnahme auffrischen, falls sie geändert wurde (bearbeitet, gelöscht)
  //   id = String
  //     (ID der Titelaufnahme)
  //   delSlot = Number | undefined
  //     (Slot dessen Titelaufnahme gelöscht wurde)
  sucheTrefferAuffrischen (id, delSlot = -1) {
    const treffer = redLit.suche.treffer.find(i => i.id === id);
    // Titelaufnahme derzeit nicht im Suchergebnis
    if (!treffer) {
      return;
    }
    // nach Speichern: Slot hochzählen, wenn eine veraltete Titelaufnahme angezeigt wird
    if (delSlot === -1 && treffer.slot > 0) {
      treffer.slot++;
    }
    // nach Löschen: Slotnummer ggf. anpassen
    const titel = document.querySelector(`#red-lit-suche-titel .red-lit-snippet[data-ds*='"${id}"']`);
    if (delSlot >= 0) {
      if (treffer.slot === delSlot) {
        // Treffer komplett entfernen, wenn genau diese Titelaufnahme gelöscht wurde;
        // dieser Zweig wird auch abgearbeitet, wenn die ID der Titelaufnahme geändert wurde
        const idx = redLit.suche.treffer.findIndex(i => i.id === id);
        redLit.suche.treffer.splice(idx, 1);
        if (!redLit.suche.treffer.length) {
          redLit.sucheReset();
        } else if (titel) {
          // Titelanzeige entfernen
          titel.parentNode.removeChild(titel);
          // Navigation auffrischen
          const start = parseInt(document.querySelector("#red-lit-suche-treffer a").dataset.start, 10) + 50;
          redLit.sucheAnzeigenNav(start);
        }
        return;
      } else if (treffer.slot > delSlot) {
        // Slot runterzählen, wenn ein Slot vor der angezeigten Aufnahme gelöscht wurde
        treffer.slot--;
      }
      // ist treffer.slot < delSlot muss die Titelaufnahme nur aufgefrischt werden
    }
    // ggf. angezeigte Titelaufnahme auffrischen
    if (titel) {
      redLit.anzeige.snippetKontext = "suche";
      titel.parentNode.replaceChild(redLit.anzeigeSnippet(treffer), titel);
    }
  },

  // Suche: alle Treffer in den Suchergebnissen auffrischen
  sucheTrefferAlleAuffrischen () {
    document.querySelectorAll("#red-lit-suche-titel:not(.aus) .red-lit-snippet").forEach(i => {
      const ds = JSON.parse(i.dataset.ds);
      // Titelaufnahme existiert nicht mehr in der DB
      if (!redLit.db.data[ds.id] || !redLit.db.data[ds.id][ds.slot]) {
        // Titelaufnahme aus Trefferliste entfernen
        const idx = redLit.suche.treffer.findIndex(j => j.id === ds.id);
        redLit.suche.treffer.splice(idx, 1);
        // sind noch Treffer in der Trefferliste?
        if (!redLit.suche.treffer.length) {
          redLit.sucheReset();
          return;
        }
        // Titelaufnahme aus der Suchanzeige löschen
        i.parentNode.removeChild(i);
        // Navigation auffrischen
        const start = parseInt(document.querySelector("#red-lit-suche-treffer a").dataset.start, 10) + 50;
        redLit.sucheAnzeigenNav(start);
        return;
      }
      // Titelaufnahme auffrischen
      redLit.anzeige.snippetKontext = "suche";
      i.parentNode.replaceChild(redLit.anzeigeSnippet(ds), i);
    });
  },

  // Suche: Schalter ins Suchfeld eintragen
  //   a = Element
  //     (Anker im Hilfefenster)
  sucheSchalter (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Suchfeld vorbereiten
      const suchfeld = document.getElementById("red-lit-suche-text");
      if (suchfeld.value) {
        suchfeld.value += " ";
      }
      // Suchfeld ergänzen
      let schalter = this.textContent;
      if (/^Aufrufdatum/.test(schalter)) {
        const datum = new Date();
        schalter = schalter.replace(/""/, `"${datum.getFullYear()}-${(datum.getMonth() + 1).toString().padStart(2, "0")}-${datum.getDate().toString().padStart(2, "0")}"`);
      }
      suchfeld.value += schalter;
      // Cursor im Suchfeld setzen
      const len = suchfeld.value.length;
      if (/^auchAlte/.test(schalter)) {
        suchfeld.setSelectionRange(len, len);
      } else if (/^Aufrufdatum/.test(schalter)) {
        suchfeld.setSelectionRange(len - 11, len - 1);
      } else {
        suchfeld.setSelectionRange(len, len - 1);
      }
      // Fenster schließen und Suchfeld fokussieren
      document.getElementById("red-lit-suche-hilfe-fenster").classList.add("aus");
      suchfeld.focus();
    });
  },

  // Eingabeformular: Speicher für Variablen
  eingabe: {
    fundorte: [ "Bibliothek", "DTA", "DWDS", "GoogleBooks", "IDS", "online" ], // gültige Werte im Feld "Fundorte"
    tags: [ "unvollständig", "Wörterbuch" ], // vordefinierte Werte im Feld "Tags"
    status: "", // aktueller Status des Formulars
    id: "", // ID des aktuellen Datensatzes (leer, wenn neuer Datensatz)
    slot: -1, // Slot des aktuellen Datensatzes
    changed: false, // es wurden Eingaben vorgenommen
  },

  // Eingabeformular: Listener für alle Inputs
  //   input = Element
  //     (Button oder Textfeld)
  eingabeListener (input) {
    // Buttons
    if (input.type === "button") {
      if (/-save$/.test(input.id)) {
        input.addEventListener("click", () => redLit.eingabeSpeichern());
      } else if (/-add$/.test(input.id)) {
        input.addEventListener("click", () => {
          redLit.dbCheck(() => redLit.eingabeHinzufuegen(), false);
        });
      }
      return;
    }
    // Sigle
    if (input.id === "red-lit-eingabe-si") {
      redLit.eingabeAutoID(input);
    }
    // Titel
    if (input.id === "red-lit-eingabe-ti") {
      redLit.eingabeAutoTitel(input);
      input.addEventListener("paste", function () {
        // das muss zeitverzögert stattfinden, sonst ist das Feld noch leer
        setTimeout(() => {
          this.value = redLit.eingabeFormatTitel(this.value);
          shared.textareaGrow(this);
        }, 25);
      });
    }
    // URL
    if (input.id === "red-lit-eingabe-ul") {
      redLit.eingabeAutoURL(input);
    }
    // alle Textfelder (Change-Listener)
    input.addEventListener("input", function () {
      if (/-tg$/.test(this.id)) { // Tippen im Tags-Feld ist nicht unbedingt eine Änderung
        return;
      }
      redLit.eingabeGeaendert();
    });
    // alle Textfelder (Enter-Listener)
    input.addEventListener("keydown", function (evt) {
      sharedTastatur.detectModifiers(evt);
      if (sharedTastatur.modifiers === "Ctrl" && evt.key === "Enter") {
        // ohne Timeout würden Warnfenster sofort wieder verschwinden
        setTimeout(() => redLit.eingabeSpeichern(), 200);
      } else if (!sharedTastatur.modifers && evt.key === "Enter" &&
          /-tg$/.test(this.id) && !document.getElementById("dropdown")) {
        redLit.eingabeTagHinzufuegen();
      }
    });
  },

  // Eingabeformular: Formular wurde geändert
  eingabeGeaendert () {
    if (redLit.eingabe.changed) {
      return;
    }
    redLit.eingabe.changed = true;
    const span = document.createElement("span");
    span.textContent = "*";
    document.getElementById("red-lit-eingabe-meldung").appendChild(span);
  },

  // Eingabeformular: Status anzeigen
  //   status = String
  //     (der Status, in dem sich das Formular befindet)
  eingabeStatus (status) {
    redLit.eingabe.status = status;
    if (status === "add") {
      redLit.eingabe.id = "";
      redLit.eingabe.slot = -1;
    } else {
      redLit.eingabe.id = document.getElementById("red-lit-eingabe-id").value;
    }
    redLit.eingabe.changed = false;
    const text = {
      add: "Titelaufnahme hinzufügen",
      change: "Titelaufnahme ändern",
      old: "Titelaufnahme veraltet",
    };
    const p = document.getElementById("red-lit-eingabe-meldung");
    p.textContent = text[status];
    p.setAttribute("class", status);
  },

  // Eingabeformular: Formular leeren
  eingabeLeeren () {
    const inputs = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
    for (const i of inputs) {
      if (i.type === "button") {
        continue;
      }
      i.value = "";
      if (i.nodeName === "TEXTAREA") {
        shared.textareaGrow(i);
      }
    }
    // Tag-Zelle leeren
    document.getElementById("red-lit-eingabe-tags").replaceChildren();
    // Metadaten leeren
    redLit.eingabeMetaFuellen({ id: "", slot: -1 });
  },

  // Eingabeformular: ID automatisch aus der Sigle ermitteln
  //   input = Element
  //     (das Sigle-Feld)
  eingabeAutoID (input) {
    input.addEventListener("input", function () {
      if (redLit.eingabe.status !== "add") {
        return;
      }
      let val = this.value;
      // hochgestellte Ziffern durch 'normal' gestellte ersetzen
      val = shared.sortSiglenPrepSuper(val);
      // Ziffern vom Anfang an das Ende der ID schieben
      const ziffern = val.match(/^[0-9]+/);
      if (ziffern) {
        val += ziffern[0];
        val = val.substring(ziffern[0].length);
      }
      // weitere Normierungsoperationen
      val = val.toLowerCase();
      val = val.replace(/[\s/–]/g, "-");
      val = val.replace(/[^a-z0-9ßäöü-]/g, "");
      val = val.replace(/-{2,}/g, "-");
      document.getElementById("red-lit-eingabe-id").value = val;
    });
  },

  // Eingabeformular: Automatismen bei Eingabe des Titels
  //   input = Element
  //     (das Titel-Feld)
  eingabeAutoTitel (input) {
    input.addEventListener("input", function () {
      // Sigle ermitteln
      const si = document.getElementById("red-lit-eingabe-si");
      if (!si.value) {
        const name = this.value.split(/[\s,:]/);
        const jahr = this.value.match(/[0-9]{4}/g);
        const sigle = [];
        if (name[0]) {
          const namen = this.value.split(":")[0].split("/");
          if (namen.length > 3) {
            sigle.push(`${name[0]} u.\u00A0a.`);
          } else if (namen.length > 1) {
            const autoren = [];
            for (const i of namen) {
              const name = i.split(/[\s,]/);
              if (name[0]) {
                autoren.push(name[0]);
              }
            }
            sigle.push(autoren.join("/"));
          } else {
            sigle.push(name[0]);
          }
        }
        if (jahr && jahr.length) {
          const jahrInt = parseInt(jahr[jahr.length - 1], 10);
          if (jahrInt > 1599 && jahrInt < 2051) {
            sigle.push(jahr[jahr.length - 1]);
          }
        }
        if (sigle.length > 1) {
          si.value = sigle.join(" ");
          si.dispatchEvent(new KeyboardEvent("input"));
        }
      }
      // Fundort ausfüllen
      const fo = document.getElementById("red-lit-eingabe-fo");
      if (this.value && !fo.value) {
        fo.value = "Bibliothek";
      }
    });
  },

  // Eingabeformular: Automatismen bei Eingabe einer URL
  //   input = Element
  //     (das URL-Feld)
  eingabeAutoURL (input) {
    input.addEventListener("input", function () {
      const fo = document.getElementById("red-lit-eingabe-fo");
      if (!this.value) {
        fo.value = "Bibliothek";
        return;
      }
      const ad = document.getElementById("red-lit-eingabe-ad");
      if (!ad.value) {
        ad.value = new Date().toISOString().split("T")[0];
      }
      let fundort = "online";
      if (/books\.google/.test(this.value)) {
        fundort = "GoogleBooks";
      } else if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) {
        fundort = "DTA";
      } else if (/owid\.de\//.test(this.value)) {
        fundort = "IDS";
      }
      fo.value = fundort;
    });
  },

  // Eingabe im Titelfeld formatieren
  //   titel = String
  //     (der Text im Titel-Feld)
  eingabeFormatTitel (titel) {
    titel = titel.replace(/[\r\n]/g, " ");
    titel = shared.textTrim(titel, true);
    titel = shared.typographie(titel);
    if (titel && !/\.$/.test(titel)) { // Titelaufnahmen enden immer mit einem Punkt
      titel += ".";
    }
    titel = titel.normalize("NFC");
    return titel;
  },

  // Eingabeformular: DTA-Import
  async eingabeDTA () {
    // URL-Feld auslesen
    let url = document.getElementById("red-lit-eingabe-ul").value;
    // Formular leeren
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
    // DTA-URL suchen
    const cb = await bridge.ipc.invoke("cb", "readText");
    if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cb)) {
      url = cb;
    } else if (!/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
      url = "";
    }
    // kein DTA-Link gefunden
    if (!url) {
      dialog.oeffnen({
        typ: "alert",
        text: "Weder in der Zwischenablage noch im URL-Feld wurde ein DTA-Link gefunden.",
        callback: () => document.getElementById("red-lit-eingabe-ti-dta").focus(),
      });
      return;
    }
    // Titeldaten laden
    const titelId = await redLit.eingabeDTAFetch({
      url,
      fokusId: "red-lit-eingabe-ti-dta",
    });
    if (!titelId) {
      return;
    }
    // Titel-Feld ausfüllen
    const ti = document.getElementById("red-lit-eingabe-ti");
    ti.value = importTEI.makeQu();
    ti.dispatchEvent(new KeyboardEvent("input"));
    // URL-Feld ausfüllen
    const ul = document.getElementById("red-lit-eingabe-ul");
    ul.value = `https://www.deutschestextarchiv.de/${titelId}`;
    ul.dispatchEvent(new KeyboardEvent("input"));
    // Titelfeld fokussieren
    ti.focus();
  },

  // Eingabeformular: Titeldaten des DTA herunterladen
  //   url = String
  //     (Link zu einer Ressource des DTA)
  //   fokusId = String
  //     (ID des Elements, das beim Scheitern fokussiert werden soll)
  //   seitenData = Object | undefined
  //     (enthält Informationen zur Seite des DTA-Titels; die Daten sind gefüllt, wenn
  //     die Quellenangabe der Karteikarte neu geladen werden soll)
  async eingabeDTAFetch ({ url, fokusId, seitenData = {} }) {
    // Titel-ID ermitteln
    const titelId = importTEI.dtaGetTitleId(url);
    if (!titelId) {
      await new Promise(meldung => {
        dialog.oeffnen({
          typ: "alert",
          text: "Aus dem DTA-Link konnte keine Titel-ID extrahiert werden.",
          callback: () => {
            document.getElementById(fokusId).focus();
            meldung(true);
          },
        });
      });
      return "";
    }
    // TEI-Header herunterladen
    const feedback = await helfer.fetchURL(`https://www.deutschestextarchiv.de/api/tei_header/${titelId}`);
    if (feedback.fehler) {
      await new Promise(meldung => {
        dialog.oeffnen({
          typ: "alert",
          text: `Der Download der Titeldaten des DTA ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${feedback.fehler}</p>`,
          callback: () => {
            document.getElementById(fokusId).focus();
            meldung(true);
          },
        });
      });
      return "";
    }
    // Titel noch nicht freigeschaltet? (DTAQ)
    if (/<title>DTA Qualitätssicherung<\/title>/.test(feedback.text)) {
      await new Promise(meldung => {
        dialog.oeffnen({
          typ: "alert",
          text: 'Der Download der Titeldaten des DTA ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">DTAQ: Titel noch nicht freigeschaltet</p>',
          callback: () => {
            document.getElementById(fokusId).focus();
            meldung(true);
          },
        });
      });
      return "";
    }
    // Titeldaten ermitteln
    const xmlDoc = sharedXml.parseXML(feedback.text);
    if (!xmlDoc) {
      await new Promise(meldung => {
        dialog.oeffnen({
          typ: "alert",
          text: "Die XML-Daten des DTA sind nicht wohlgeformt.",
          callback: () => {
            document.getElementById(fokusId).focus();
            meldung(true);
          },
        });
      });
      return "";
    }
    importTEI.data.cit = importTEI.citObject();
    if (seitenData.seiteStart) {
      importTEI.data.cit.seiteStart = seitenData.seiteStart;
      importTEI.data.cit.seiteEnde = seitenData.seiteEnde;
      importTEI.data.cit.spalte = seitenData.spalte;
    }
    importTEI.citFill(xmlDoc);
    return titelId;
  },

  // Eingabeformular: XML-Import aus der Zwischenablage
  async eingabeXML () {
    // PPN-Feld auslesen
    const pn = document.getElementById("red-lit-eingabe-pn");
    let [ ppn ] = pn.value.split(/[,\s]/);
    if (!importShared.isPPN(ppn)) {
      ppn = "";
    }
    // Formular leeren
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
    // XML-Daten suchen
    let cb = await bridge.ipc.invoke("cb", "readText");
    cb = cb.trim();
    let xmlDaten = redLit.eingabeXMLCheck({ xmlStr: cb });
    if (importShared.isPPN(cb)) {
      ppn = cb;
    } else if (xmlDaten) {
      ppn = "";
    }
    if (ppn) {
      xmlDaten = await redLit.eingabeXMLPPN({
        ppn,
        fokus: "red-lit-eingabe-ti-xml",
      });
      if (!xmlDaten) {
        return;
      }
    }
    // keine XML-Daten in der Zwischenablage
    if (!xmlDaten) {
      dialog.oeffnen({
        typ: "alert",
        text: "In der Zwischenablage befindet sich kein XML-Dokument, aus dem eine Titelaufnahme importiert werden könnte.",
        callback: () => document.getElementById("red-lit-eingabe-ti-xml").focus(),
      });
      return;
    }
    // XML-Daten gefunden => Titelaufnahme übernehmen
    if (xmlDaten.td.ti) {
      const feld = document.getElementById("red-lit-eingabe-ti");
      feld.value = redLit.eingabeFormatTitel(xmlDaten.td.ti);
      feld.dispatchEvent(new KeyboardEvent("input"));
    }
    if (xmlDaten.td.si) {
      document.getElementById("red-lit-eingabe-si").value = xmlDaten.td.si;
    }
    if (xmlDaten.td.id) {
      document.getElementById("red-lit-eingabe-id").value = xmlDaten.td.id;
    }
    if (xmlDaten.td.ul) {
      const feld = document.getElementById("red-lit-eingabe-ul");
      feld.value = xmlDaten.td.ul;
      feld.dispatchEvent(new KeyboardEvent("input"));
    }
    if (xmlDaten.td.ad) {
      document.getElementById("red-lit-eingabe-ad").value = xmlDaten.td.ad;
    }
    if (xmlDaten.td.fo) {
      document.getElementById("red-lit-eingabe-fo").value = xmlDaten.td.fo;
    }
    if (xmlDaten.td.pn) {
      document.getElementById("red-lit-eingabe-pn").value = xmlDaten.td.pn;
    }
    // Titelfeld fokussieren
    document.getElementById("red-lit-eingabe-ti").focus();
  },

  // Eingabeformular: überprüft, ob sich hinter einem String ein passendes XML-Dokument verbirgt
  //   xmlStr = String
  //     (String, der überprüft werden soll)
  eingabeXMLCheck ({ xmlStr }) {
    // Daten beginnen nicht mit <Fundstelle>, <mods> oder XML-Deklaration
    if (!/^<(Fundstelle|mods|\?xml)/.test(xmlStr)) {
      return false;
    }
    // XML nicht wohlgeformt
    const xmlDoc = sharedXml.parseXML(xmlStr);
    if (!xmlDoc) {
      return false;
    }
    // Fundstellen-Snippet
    if (xmlDoc.querySelector("Fundstelle unstrukturiert")) {
      return redLit.eingabeXMLFundstelle({ xmlDoc, xmlStr });
    }
    // MODS-Dokument
    if (xmlDoc.querySelector("mods titleInfo")) {
      return redLit.eingabeXMLMODS({ xmlDoc, xmlStr });
    }
    // kein passendes XML-Dokument
    return false;
  },

  // PPN-Download: XML-Datensatz herunterladen
  //   ppn = String
  //     (die PPN, deren Datensatz heruntergeladen werden soll)
  //   fokus = String | undefined
  //     (ID des Elements, das ggf. fokussiert werden soll)
  //   returnXmlStr
  async eingabeXMLPPN ({ ppn, fokus = "", returnXmlStr = false }) {
    // MODS-Dokument herunterladen
    const feedback = await helfer.fetchURL(`https://unapi.k10plus.de/?id=gvk:ppn:${ppn}&format=mods`);
    const result = new Promise(resolve => {
      // Fehler: Dokument konnte nicht korrekt heruntergeladen werden
      if (feedback.fehler) {
        dialog.oeffnen({
          typ: "alert",
          text: `Der Download des XML-Dokuments mit den Titeldaten ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${feedback.fehler}</p>`,
          callback: () => {
            if (fokus) {
              document.getElementById(fokus).focus();
            }
            resolve("");
          },
        });
        return;
      }
      // ggf. XML-String direkt zurückgeben
      if (returnXmlStr) {
        resolve(feedback.text);
        return;
      }
      // Daten parsen
      const xmlDaten = redLit.eingabeXMLCheck({ xmlStr: feedback.text });
      if (!xmlDaten) {
        dialog.oeffnen({
          typ: "alert",
          text: "Bei den aus dem GVK heruntergeladenen Daten handelt es sich nicht um ein XML-Dokument, dessen Titeldaten ausgelesen werden könnten.",
          callback: () => {
            if (fokus) {
              document.getElementById(fokus).focus();
            }
            resolve("");
          },
        });
        return;
      }
      resolve(xmlDaten);
    });
    return result;
  },

  // Eingabeformular: einen leeren Datensatz zur Verfügung stellen
  // (der Datensatz muss so strukturiert sein, dass man ihn auch zum
  // Import in eine Karteikarte nutzen kann)
  eingabeXMLDatensatz () {
    const data = importShared.importObject();
    data.td = {
      si: "", // Sigle
      id: "", // ID
      ti: "", // Titel
      ul: "", // URL
      ad: "", // Aufrufdatum
      fo: "", // Fundort
      pn: "", // PPN
    };
    return data;
  },

  // Eingabeformular: Fundstellen-Snippet auslesen
  //   xmlDoc = Document
  //     (das geparste XML-Snippet)
  //   xmlStr = String
  //     (das nicht geparste Originaldokument)
  eingabeXMLFundstelle ({ xmlDoc, xmlStr }) {
    const data = redLit.eingabeXMLDatensatz();
    // Daten für Titelaufnahme in der Literaturdatenbank
    const ti = xmlDoc.querySelector("unstrukturiert");
    if (ti) {
      data.td.ti = ti.textContent;
    }
    const si = xmlDoc.querySelector("Sigle");
    if (si) {
      data.td.si = si.textContent;
    }
    const fundstelle = xmlDoc.querySelector("Fundstelle") ? xmlDoc.querySelector("Fundstelle") : xmlDoc;
    const id = fundstelle.getAttribute("xml:id");
    if (id) {
      data.td.id = id;
    }
    const ul = xmlDoc.querySelector("URL");
    if (ul) {
      data.td.ul = ul.textContent;
    }
    const ad = xmlDoc.querySelector("Aufrufdatum");
    if (ad) {
      const da = ad.textContent.split(".");
      data.td.ad = `${da[2]}-${da[1]}-${da[0]}`;
    }
    const fo = xmlDoc.querySelector("Fundort");
    if (fo) {
      data.td.fo = fo.textContent;
    }
    const pn = xmlDoc.querySelectorAll("PPN");
    if (pn) {
      const ppn = [];
      for (const i of pn) {
        ppn.push(i.textContent);
      }
      data.td.pn = ppn.join(", ");
    }
    // Daten für die Karteikarte
    data.ds.au = "N.\u00A0N.";
    const autor = data.td.ti.split(": ")[0].split(", ");
    if (autor.length === 2) {
      data.ds.au = autor.join(", ");
    }
    data.ds.bi = "xml-fundstelle";
    data.ds.bx = xmlStr;
    const jahr = data.td.ti.match(/[0-9]{4}/g);
    if (jahr) {
      data.ds.da = jahr[jahr.length - 1];
    }
    data.ds.qu = importShared.changeTitleStyle(data.td.ti);
    if (data.td.ul) {
      data.ds.ul = data.td.ul;
      data.ds.ud = data.td.ad || new Date().toISOString().split("T")[0];
      if (/books\.google/.test(data.td.ul)) {
        data.td.kr = "GoogleBooks";
      } else if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(data.td.ul)) {
        data.td.kr = "DTA";
      }
    }
    // Datensatz zurückgeben
    return data;
  },

  // Eingabeformular: MODS-Dokument auslesen
  //   xmlDoc = Document
  //     (das geparste XML-Snippet)
  //   xmlStr = String
  //     (das nicht geparste Originaldokument)
  eingabeXMLMODS ({ xmlDoc, xmlStr }) {
    // Daten zusammentragen
    const data = redLit.eingabeXMLDatensatz();
    const td = redLit.eingabeXMLModsTd({ xmlDoc });
    // Datensatz für Karteikarte ausfüllen
    if (td.autor.length) {
      data.ds.au = td.autor.join("/");
    } else if (td.hrsg.length) {
      data.ds.au = `${td.hrsg.join("/")} (Hrsg.)`;
    } else {
      data.ds.au = "N.\u00A0N.";
    }
    data.ds.bi = "xml-mods";
    data.ds.bx = xmlStr;
    data.ds.da = td.jahr;
    if (td.url.some(i => /^https?:\/\/www\.deutschestextarchiv\.de\//.test(i))) {
      data.ds.kr = "DTA";
    } else if (td.url.some(i => /books\.google/.test(i))) {
      data.ds.kr = "GoogleBooks";
    }
    data.ds.qu = importShared.makeTitle(td);
    data.ds.ul = td.url[0] || "";
    data.ds.ud = data.ds.ul ? new Date().toISOString().split("T")[0] : "";
    // Datensatz für Literaturdatenbank ausfüllen
    data.td.ti = importShared.makeTitle(td);
    data.td.ul = td.url[0] || "";
    data.td.pn = td.ppn.join(", ");
    // Datensatz zurückgeben
    return data;
  },

  // Eingabeformular: MODS-Dokument auslesen (Titeldaten)
  //   xmlDoc = Document
  //     (das geparste XML-Snippet)
  eingabeXMLModsTd ({ xmlDoc }) {
    const td = importShared.makeTitleObject();
    // Helfer-Funktionen
    const evaluator = xpath => xmlDoc.evaluate(xpath, xmlDoc, sharedXml.nsResolver, XPathResult.ANY_TYPE, null);
    const pusher = (result, key) => {
      let item = result.iterateNext();
      if (Array.isArray(td[key])) {
        while (item) {
          const val = shared.textTrim(item.textContent, true);
          if (val) {
            td[key].push(val);
          }
          item = result.iterateNext();
        }
      } else if (item) {
        td[key] = shared.textTrim(item.textContent, true);
      }
    };
    // Autor
    const autor = evaluator("//m:name[@type='personal']/m:namePart[not(@*)][contains(following-sibling::role/m:roleTerm[@type='code'],'aut')]");
    pusher(autor, "autor");
    // Herausgeber
    const hrsg = evaluator("//m:name[@type='personal']/m:namePart[not(@*)][contains(following-sibling::role/m:roleTerm[@type='code'],'edt')]");
    pusher(hrsg, "hrsg");
    // Titel
    const titel = evaluator("/m:mods/m:titleInfo[not(@*)]/m:title");
    pusher(titel, "titel");
    // Korrektur: Großschreibung
    gross({
      ds: td.titel,
      start: 1,
    });
    // Titel-Vorsatz
    const titelVorsatz = evaluator("/m:mods/m:titleInfo[not(@*)]/m:nonSort");
    let item = titelVorsatz.iterateNext();
    if (item) {
      td.titel[0] = shared.textTrim(item.textContent + td.titel[0], true);
    }
    // Untertitel
    const untertitel = evaluator("/m:mods/m:titleInfo[not(@*)]/m:subTitle");
    pusher(untertitel, "untertitel");
    // Korrektur: Großschreibung
    gross({
      ds: td.untertitel,
      start: 0,
    });
    // Zeitschrift/Sammelband
    const inTitel = evaluator("//m:relatedItem[@type='host']//m:title");
    pusher(inTitel, "inTitel");
    // Korrektur: Großschreibung
    gross({
      ds: td.inTitel,
      start: 0,
    });
    // Band
    const band = evaluator("/m:mods/m:titleInfo[not(@*)]/m:partNumber");
    pusher(band, "band");
    // Bandtitel
    const bandtitel = evaluator("/m:mods/m:titleInfo[not(@*)]/m:partName");
    pusher(bandtitel, "bandtitel");
    // Auflage
    const auflage = evaluator("/m:mods/m:originInfo[not(@*)]//m:edition");
    pusher(auflage, "auflage");
    // Qualifikationsschrift
    const quali = evaluator("/m:mods/m:note[@type='thesis']");
    pusher(quali, "quali");
    // Ort
    const ort = evaluator("/m:mods/m:originInfo[@eventType='publication']//m:placeTerm");
    pusher(ort, "ort");
    // Verlag
    let verlag;
    if (td.inTitel.length) {
      verlag = evaluator("//m:relatedItem[@type='host']/m:originInfo/m:publisher");
    } else {
      verlag = evaluator("/m:mods/m:originInfo[@eventType='publication']/m:publisher");
    }
    pusher(verlag, "verlag");
    // Jahr
    const jahr = evaluator("/m:mods/m:originInfo[@eventType='publication']/m:dateIssued");
    pusher(jahr, "jahr");
    // Jahrgang, Jahr, Heft, Seiten, Spalten
    const inDetails = evaluator("//m:relatedItem[@type='host']/m:part/m:text");
    item = inDetails.iterateNext();
    if (item) {
      const jahrgang = /(?<val>[0-9]+)\s?\(/.exec(item.textContent);
      if (jahrgang) {
        td.jahrgang = jahrgang.groups.val;
      }
      const jahr = /\((?<val>.+?)\)/.exec(item.textContent);
      if (jahr) {
        td.jahr = jahr.groups.val;
      }
      const heft = /\), (?<val>.+?),/.exec(item.textContent);
      if (heft) {
        td.heft = heft.groups.val;
      }
      const seiten = /(?<typ>Seite|Spalte)\s(?<val>.+)/.exec(item.textContent);
      if (seiten) {
        if (seiten.groups.typ === "Spalte") {
          td.spalte = true;
        }
        td.seiten = seiten.groups.val;
      }
    }
    // Serie
    const serie = evaluator("//m:relatedItem[@type='series']/m:titleInfo/m:title");
    pusher(serie, "serie");
    // URL
    const url = evaluator("//m:url[@displayLabel='Volltext']");
    pusher(url, "url");
    td.url.sort(shared.sortURL);
    // PPN
    const ppn = evaluator("//m:recordIdentifier[@source='DE-627']");
    pusher(ppn, "ppn");
    // Korrektur: Auflage ohne eckige Klammern
    td.auflage = td.auflage.replace(/^\[|\]$/g, "");
    // Korrektur: Ort ggf. aus Verlagsangabe ermitteln
    if (!td.ort.length && /:/.test(td.verlag)) {
      const ort = td.verlag.split(":");
      td.ort.push(ort[0].trim());
    }
    // Korrektur: "[u.a.]" in Ort aufhübschen
    td.ort.forEach((i, n) => {
      td.ort[n] = i.replace(/\[u\.a\.\]/, "u.\u00A0a.");
    });
    // Korrektur: Jahr ohne eckige Klammern
    td.jahr = td.jahr.replace(/^\[|\]$/g, "");
    // Korrektur: unvollständige eckige Klammern entfernen
    for (const [ k, v ] of Object.entries(td)) {
      if (Array.isArray(v)) {
        for (let i = 0, len = v.length; i < len; i++) {
          v[i] = cleanBrackets(v[i]);
        }
      } else {
        td[k] = cleanBrackets(v);
      }
    }
    function cleanBrackets (str) {
      if (/[[\]]/.test(str) && !/\[.+\]/.test(str)) {
        return str.replace(/[[\]]/g, "");
      }
      return str;
    }
    // Datensatz zurückgeben
    return td;
    // Großschreibung am Titelanfang
    function gross ({ ds, start }) {
      for (let i = start, len = ds.length; i < len; i++) {
        ds[i] = ds[i].substring(0, 1).toUpperCase() + ds[i].substring(1);
      }
    }
  },

  // Eingabeformular: BibTeX-Import aus der Zwischenablage
  async eingabeBibTeX () {
    // Formular leeren
    redLit.eingabeLeeren();
    redLit.eingabeStatus("add");
    // BibTeX-Daten suchen
    let bibtexDaten = "";
    let cb = await bridge.ipc.invoke("cb", "readText");
    cb = cb.trim();
    if (importShared.isBibtex(cb)) {
      bibtexDaten = cb;
    }
    // kein BibTeX-Datensatz in Zwischenablage
    if (!bibtexDaten) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Es wurden keine <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Daten in der Zwischenablage gefunden.',
        callback: () => document.getElementById("red-lit-eingabe-ti-bibtex").focus(),
      });
      return;
    }
    // BibTeX-Datensatz einlesen
    const titel = await importBibtex.startImport({ content: bibtexDaten, returnTitle: true });
    // Einlesen ist fehlgeschlagen
    if (!titel) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Das Einlesen des <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Datensatzes ist fehlgeschlagen.',
        callback: () => document.getElementById("red-lit-eingabe-ti-bibtex").focus(),
      });
      return;
    }
    // Datensatz übernehmen
    if (titel[0].ds.ul) {
      // URL + Aufrufdatum
      document.getElementById("red-lit-eingabe-ad").value = titel[0].ds.ud;
      const ul = document.getElementById("red-lit-eingabe-ul");
      ul.value = titel[0].ds.ul;
      ul.dispatchEvent(new KeyboardEvent("input"));
    }
    // Titel
    const ti = document.getElementById("red-lit-eingabe-ti");
    const quelle = shared.textTrim(titel[0].ds.qu, true);
    ti.value = quelle.normalize("NFC");
    ti.dispatchEvent(new KeyboardEvent("input"));
    // PPN
    const pn = document.getElementById("red-lit-eingabe-pn");
    if (!pn.value) {
      let ppn = "";
      const m = /^@[a-zA-Z]+\{(GBV-)?(?<ppn>.+?),/.exec(bibtexDaten);
      if (m && importShared.isPPN(m.groups.ppn)) {
        ppn = m.groups.ppn;
      }
      pn.value = ppn;
    }
    // Titel fokussieren
    ti.focus();
  },

  // Eingabeformular: Titelaufnahme speichern
  async eingabeSpeichern () {
    // Textfelder trimmen und ggf. typographisch aufhübschen
    const textfelder = document.getElementById("red-lit-eingabe").querySelectorAll('input[type="text"], textarea');
    for (const i of textfelder) {
      let val = i.value;
      if (i.id === "red-lit-eingabe-ti") { // Titelaufnahme typographisch aufhübschen
        val = redLit.eingabeFormatTitel(val);
      } else {
        val = val.replace(/[\r\n]+/g, "\n");
        val = shared.textTrim(val, true);
      }
      i.value = val;
      if (i.nodeName === "TEXTAREA") {
        shared.textareaGrow(i);
      }
    }
    // ID ist in Blockliste => kann nicht vergeben werden
    const id = document.getElementById("red-lit-eingabe-id").value;
    if (redLit.db.dataMeta.bl.some(i => i.id === id)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die ID ist blockiert.\nEin Datensatz mit dieser ID wurde gelöscht, weswegen die ID vorerst nicht neu vergeben werden kann.",
        callback: () => {
          document.getElementById("red-lit-eingabe-id").select();
        },
      });
      return false;
    }
    // ID schon vergeben => bestehende Titelaufnahme ergänzen?
    if (redLit.eingabe.status === "add" && redLit.db.data[id]) {
      const verschmelzen = await new Promise(verschmelzen => {
        dialog.oeffnen({
          typ: "confirm",
          text: "Die ID ist schon vergeben.\nSoll die bestehende Titelaufnahme ergänzt werden?",
          callback: () => {
            if (dialog.antwort) {
              verschmelzen(true);
            } else {
              verschmelzen(false);
            }
          },
        });
      });
      if (verschmelzen) {
        redLit.eingabe.status = "change";
        redLit.eingabe.id = id;
      } else {
        document.getElementById("red-lit-eingabe-ti").focus();
        return false;
      }
    }
    // Validierung des Formulars
    const valid = await redLit.eingabeSpeichernValid();
    if (!valid) {
      return false;
    }
    // ggf. neuen Datensatz erstellen
    if (redLit.eingabe.status === "add") {
      redLit.db.data[id] = [];
    }
    // Daten zusammentragen
    const ds = redLit.eingabeSpeichernMakeDs();
    // ID wurde geändert => Datensatz umbenennen
    let idGeaendert = false;
    if (redLit.eingabe.status !== "add" &&
        redLit.eingabe.id !== id) {
      idGeaendert = true;
      // ggf. Titelaufnahme aus Suchtrefferliste entfernen
      redLit.sucheTrefferAuffrischen(redLit.eingabe.id, redLit.eingabe.slot);
      // ID der Titelaufnahme ändern
      redLit.db.data[id] = [];
      redLit.dbTitelKlonen(redLit.db.data[redLit.eingabe.id], redLit.db.data[id]);
      delete redLit.db.data[redLit.eingabe.id];
      redLit.db.dataOpts.push({
        aktion: "changeId",
        id,
        idAlt: redLit.eingabe.id,
      });
    }
    // Abbruch, wenn identisch mit vorherigem Datensatz
    if (redLit.db.data[id].length && !idGeaendert) {
      const diff = redLit.eingabeSpeichernDiff(redLit.db.data[id][0].td, ds.td);
      if (!diff) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben keine Änderungen vorgenommen.",
          callback: () => {
            document.getElementById("red-lit-eingabe-ti").focus();
          },
        });
        redLit.eingabeStatus(redLit.eingabe.status); // Änderungsmarkierung zurücksetzen
        return false;
      }
    }
    // Datensatz schreiben
    redLit.db.data[id].unshift(ds);
    redLit.db.dataOpts.push({
      aktion: "add",
      id,
      idSlot: ds.id,
    });
    // Metadaten auffrischen
    redLit.eingabeMetaFuellen({ id, slot: 0 });
    // Status Eingabeformular auffrischen
    redLit.eingabe.slot = 0;
    redLit.eingabeStatus("change");
    // ggf. Titelaufnahme in der Suche auffrischen
    redLit.sucheTrefferAuffrischen(id);
    // Status Datenbank auffrischen
    redLit.dbGeaendert(true);
    return true;
  },

  // Eingabeformular: Formular validieren
  async eingabeSpeichernValid () {
    // BenutzerIn registriert?
    if (!optionen.data.einstellungen.bearbeiterin) {
      fehler({
        text: `Sie können Titelaufnahmen erst ${redLit.eingabe.status === "add" ? "erstellen" : "ändern"}, nachdem Sie sich <a href="#" data-funktion="einstellungen-allgemeines">registriert</a> haben.`,
      });
      return false;
    }
    // Warnung vor dem Ändern der ID
    const id = document.getElementById("red-lit-eingabe-id");
    if (redLit.eingabe.status !== "add" && redLit.eingabe.id !== id.value) {
      const aendern = await new Promise(antwort => {
        dialog.oeffnen({
          typ: "confirm",
          text: "Die ID nachträglich zu ändern, kann gravierende Konsequenzen haben.\nMöchten Sie die ID wirklich ändern?",
          callback: () => {
            if (!dialog.antwort) {
              id.value = redLit.eingabe.id;
              antwort(false);
            } else {
              antwort(true);
            }
          },
        });
      });
      if (!aendern) {
        id.focus();
        return false;
      }
    }
    // Pflichtfelder ausgefüllt?
    const pflicht = {
      si: "keine Sigle",
      id: "keine ID",
      ti: "keinen Titel",
      fo: "keinen Fundort",
    };
    for (const [ k, v ] of Object.entries(pflicht)) {
      const feld = document.getElementById(`red-lit-eingabe-${k}`);
      if (!feld.value) {
        fehler({
          text: `Sie haben ${v} eingegeben.`,
          fokus: feld,
        });
        return false;
      }
    }
    // ID korrekt formatiert?
    if (/[^a-z0-9ßäöü-]/.test(id.value) ||
        /^[0-9]/.test(id.value)) {
      fehler({
        text: "Die ID hat ein fehlerhaftes Format.\n<b>Erlaubt:</b><br>• Kleinbuchstaben a-z, ß und Umlaute<br>• Ziffern<br>• Bindestriche\n<b>Nicht Erlaubt:</b><br>• Großbuchstaben<br>• Ziffern am Anfang<br>• Sonderzeichen<br>• Leerzeichen",
        fokus: id,
      });
      return false;
    }
    // ID schon vergeben?
    if (redLit.eingabe.status !== "add" &&
        redLit.eingabe.id !== id.value &&
        redLit.db.data[id.value]) {
      // wenn beim Hinzufügen eines Datensatzes die ID schon vergeben ist,
      // wird oben das Zusammenführen angeboten; hier geht es also nur um
      // das Ändern der ID, was nicht möglich ist, wenn sie schon vergeben wurde
      fehler({
        text: "Die ID ist schon vergeben.",
        fokus: id,
      });
      return false;
    }
    // Beginnt die URL mit einem Protokoll?
    const url = document.getElementById("red-lit-eingabe-ul");
    if (url.value && !/^https?:\/\//.test(url.value)) {
      fehler({
        text: "Die URL muss mit einem Protokoll beginnen (http[s]://).",
        fokus: url,
      });
      return false;
    }
    // Enthält die URL Whitespace?
    if (url.value && /\s/.test(url.value)) {
      fehler({
        text: "Die URL darf keine Whitespace-Zeichen (Leerzeichen, Tabs, Zeilenumbrüche) enthalten.",
        fokus: url,
      });
      return false;
    }
    // wenn URL => Fundort "DTA" | "GoogleBooks" | "IDS" | "online"
    const fo = document.getElementById("red-lit-eingabe-fo");
    if (url.value && !/^(DTA|GoogleBooks|IDS|online)$/.test(fo.value)) {
      fehler({
        text: "Geben Sie eine URL an, muss der Fundort „online“, „DTA“, „GoogleBooks“ oder „IDS“ sein.",
        fokus: fo,
      });
      return false;
    }
    // wenn URL => genauerer Check, ob die Eingabe konsistent ist
    if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url.value) && fo.value !== "DTA" ||
        /books\.google/.test(url.value) && fo.value !== "GoogleBooks" ||
        /owid\.de\//.test(url.value) && fo.value !== "IDS") {
      fehler({
        text: `Die URL passt nicht zum Fundort „${fo.value}“.`,
        fokus: fo,
      });
      return false;
    }
    // wenn Aufrufdatum => URL eingeben
    const ad = document.getElementById("red-lit-eingabe-ad");
    if (ad.value && !url.value) {
      fehler({
        text: "Geben Sie ein Aufrufdatum an, müssen Sie auch eine URL angeben.",
        fokus: url,
      });
      return false;
    }
    // Aufrufdatum in der Zukunft?
    let da = ad.value ? new Date(ad.value) : null;
    if (da) { // vgl. redLit.sucheStarten()
      da = new Date(da.getFullYear(), da.getMonth(), da.getDate());
    }
    if (da && da >= new Date()) {
      fehler({
        text: "Das Aufrufdatum liegt in der Zukunft.",
        fokus: ad,
      });
      return false;
    }
    // Fundort mit gültigem Wert?
    if (fo.value && !redLit.eingabe.fundorte.includes(fo.value)) {
      const fundorte = redLit.eingabe.fundorte.join(", ").match(/(.+), (.+)/);
      fehler({
        text: `Der Fundort ist ungültig. Erlaubt sind nur die Werte:\n${fundorte[1]} oder ${fundorte[2]}`,
        fokus: fo,
      });
      return false;
    }
    // wenn Fundort "DTA" | "GoogleBooks" | "IDS" | "online" => URL eingeben
    if (/^(DTA|GoogleBooks|IDS|online)$/.test(fo.value) && !url.value) {
      fehler({
        text: "Ist der Fundort „online“, „DTA“, „GoogleBooks“ oder „IDS“, müssen Sie eine URL angeben.",
        fokus: url,
      });
      return false;
    }
    // PPN(s) okay?
    const ppn = document.getElementById("red-lit-eingabe-pn");
    if (ppn.value) {
      const ppns = ppn.value.split(/[,\s]/);
      const korrekt = [];
      const fehlerhaft = [];
      for (const i of ppns) {
        if (i && !importShared.isPPN(i)) {
          fehlerhaft.push(i);
        } else if (i) {
          korrekt.push(i);
        }
      }
      if (fehlerhaft.length) {
        let numerus = '<abbr title="Pica-Produktionsnummern">PPN</abbr> sind';
        if (fehlerhaft.length === 1) {
          numerus = '<abbr title="Pica-Produktionsnummer">PPN</abbr> ist';
        }
        fehler({
          text: `Diese ${numerus} fehlerhaft:\n${fehlerhaft.join(", ")}`,
          fokus: ppn,
        });
        return false;
      }
      ppn.value = korrekt.join(", ");
    }
    // alles okay
    return true;
    // Fehlermeldung
    function fehler ({ text, fokus = false }) {
      const opt = {
        typ: "alert",
        text,
      };
      if (fokus) {
        opt.callback = () => {
          fokus.select();
        };
      }
      dialog.oeffnen(opt);
      document.querySelectorAll("#dialog-text a").forEach(a => {
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          switch (this.dataset.funktion) {
            case "einstellungen-allgemeines":
              optionen.oeffnen();
              optionen.sektionWechseln(document.querySelector("#einstellungen ul a"));
              break;
          }
          setTimeout(() => overlayApp.schliessen(document.getElementById("dialog")), 200);
        });
      });
    }
  },

  // Eingabeformular: einen neuen Datensatz auf Grundlage des Formulars erstellen
  eingabeSpeichernMakeDs () {
    const ds = {
      be: optionen.data.einstellungen.bearbeiterin,
      da: new Date().toISOString(),
      id: redLit.eingabeSpeichernMakeID(),
      td: {},
    };
    const felder = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
    for (const i of felder) {
      const k = i.id.replace(/.+-/, "");
      if (i.type === "button" ||
          /^(id|tg)$/.test(k)) {
        continue;
      }
      if (k === "pn") {
        const val = i.value.split(/[,\s]/);
        const arr = [];
        for (const ppn of val) {
          if (ppn) {
            arr.push(ppn);
          }
        }
        ds.td.pn = arr;
      } else {
        ds.td[k] = i.value;
      }
    }
    ds.td.tg = redLit.eingabeTagsZusammentragen();
    return ds;
  },

  // Eingabeformular: ID für einen Datensatz erstellen
  eingabeSpeichernMakeID () {
    const hex = "0123456789abcdef";
    let id = "";
    x: while (!id) {
      // ID erstellen
      while (id.length < 10) {
        id += hex[shared.rand(0, 15)];
      }
      // ID überprüfen
      for (const v of Object.values(redLit.db.data)) {
        for (let i = 0, len = v.length; i < len; i++) {
          if (v[i].id === id) {
            id = "";
            continue x;
          }
        }
      }
      if (redLit.db.dataMeta.bl.some(i => i.id === id)) {
        id = "";
      }
    }
    return id;
  },

  // Eingabeformular: ermittelt, ob zwei Titeldatensätze voneinander abweichen
  //   alt = Object
  //     (alter Datensatz mit Titeldaten)
  //   neu = Object
  //     (neuer Datensatz mit Titeldaten)
  eingabeSpeichernDiff (alt, neu) {
    let diff = false;
    for (let [ k, v ] of Object.entries(alt)) {
      let n = neu[k];
      if (Array.isArray(v)) {
        v = v.join(",");
        n = n.join(",");
      }
      if (v !== n) {
        diff = true;
        break;
      }
    }
    return diff;
  },

  // Eingabeformular: neue Titelaufnahme hinzufügen
  eingabeHinzufuegen () {
    // ggf. zum Formular wechseln
    redLit.nav("eingabe");
    // Formular leeren
    redLit.eingabeLeeren();
    // Formularstatus ändern
    redLit.eingabeStatus("add");
    // Formular fokussieren
    document.getElementById("red-lit-eingabe-ti").focus();
  },

  // Eingabeformular: Listener für Bearbeitenlinks
  //   a = Element
  //     (Icon-Link zum Bearbeiten eines Eintrags)
  eingabeBearbeitenListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      redLit.anzeigePopupSchliessen();
      const json = JSON.parse(this.closest(".red-lit-snippet").dataset.ds);
      redLit.dbCheck(() => redLit.eingabeBearbeiten(json), false);
    });
  },

  // Eingabeformular: Eintrag bearbeiten
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  eingabeBearbeiten ({ id, slot }) {
    // ggf. Popup schließen
    redLit.anzeigePopupSchliessen();
    // zum Formular wechseln
    redLit.nav("eingabe");
    // Formular leeren
    redLit.eingabeLeeren();
    // Formular füllen
    const ds = redLit.db.data[id][slot].td;
    const inputs = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
    for (const i of inputs) {
      const key = i.id.replace(/.+-/, "");
      if (i.type === "button" || key === "tg") { // Tags müssen anders angezeigt werden
        continue;
      }
      if (key === "id") {
        i.value = id;
      } else {
        i.value = Array.isArray(ds[key]) ? ds[key].join(", ") : ds[key];
        if (i.nodeName === "TEXTAREA") {
          shared.textareaGrow(i);
        }
      }
    }
    // Tags anzeigen
    redLit.eingabeTagsFuellen({ tags: ds.tg });
    // Metadaten füllen
    redLit.eingabeMetaFuellen({ id, slot });
    // Formularstatus auffrischen
    let status = "change";
    if (slot > 0) {
      status = "old";
    }
    redLit.eingabe.slot = slot;
    redLit.eingabeStatus(status);
    // Formular fokussieren
    document.getElementById("red-lit-eingabe-ti").focus();
  },

  // Eingabeformular: Tags im Formular zusammentragen
  eingabeTagsZusammentragen () {
    const tags = document.getElementById("red-lit-eingabe-tags").querySelectorAll(".tag");
    const arr = [];
    tags.forEach(i => arr.push(i.textContent));
    return arr;
  },

  // Eingabeformular: Tags anzeigen
  //   tags = Array
  //     (Array mit den Tags)
  eingabeTagsFuellen ({ tags }) {
    const cont = document.getElementById("red-lit-eingabe-tags");
    cont.replaceChildren();
    const div = document.createElement("div");
    cont.appendChild(div);
    redLit.tagsList({
      cont: div,
      tags,
      eingabe: true,
    });
  },

  // Eingabeformular: Tag-Element erzeugen
  //   tag = String
  //     (der Name des Tags)
  eingabeTagErzeugen ({ tag }) {
    const span = document.createElement("span");
    span.classList.add("tag");
    span.innerHTML = redLit.anzeigeSnippetMaskieren(tag);
    return span;
  },

  // Eingabeformular: Tag löschen
  //   tag = Element
  //     (Tag, der gelöscht werden soll)
  eingabeTagLoeschen ({ tag }) {
    tag.addEventListener("click", function () {
      this.parentNode.removeChild(this);
      redLit.eingabeGeaendert();
    });
  },

  // Eingabeformular: Tag hinzufügen
  eingabeTagHinzufuegen () {
    const tg = document.getElementById("red-lit-eingabe-tg");
    const val = shared.textTrim(tg.value, true);
    // keine Eingae
    if (!val) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keinen Tag eingegeben.",
        callback: () => tg.select(),
      });
      return;
    }
    // aktuelle Tags sammeln
    const arr = redLit.eingabeTagsZusammentragen();
    // Tag schon vorhanden
    if (arr.includes(val)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Der Tag ist schon vorhanden.",
        callback: () => tg.select(),
      });
      return;
    }
    // Tag ergänzen und die Anzeige neu aufbauen
    arr.push(val);
    redLit.eingabeTagsFuellen({ tags: arr });
    redLit.eingabeGeaendert();
    tg.value = "";
  },

  // Eingabeformular: alle Tags aus der Literaturdatenbank zusammensuchen
  eingabeTagsAuflisten () {
    const tags = new Set();
    for (const titel of Object.values(redLit.db.data)) { // Titel durchgehen
      for (let tag of titel[0].td.tg) { // Tags durchgehen
        if (/^Lemma: /.test(tag)) {
          tag = tag.replace(/\s\(.+?\)$/, "");
        }
        tags.add(tag);
      }
    }
    // Tags sortieren
    let arr = [ ...tags ];
    arr = redLit.tagsSort(arr);
    // vordefinierte Tags an den Anfang schieben
    const pre = [ ...redLit.eingabe.tags ];
    pre.reverse();
    for (const i of pre) {
      const idx = arr.indexOf(i);
      if (idx > -1) {
        arr.splice(idx, 1);
      }
      arr.unshift(i);
    }
    return arr;
  },

  // Eingabe: Metadaten eintragen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  eingabeMetaFuellen ({ id, slot }) {
    // Werte vorbereiten
    const werte = {
      BearbeiterIn: optionen.data.einstellungen.bearbeiterin,
      Datum: "\u00A0",
      Aufnahme: "\u00A0",
    };
    if (!werte.BearbeiterIn) {
      werte.BearbeiterIn = "N.\u00A0N.";
    }
    if (id) {
      const ds = redLit.db.data[id][slot];
      werte.BearbeiterIn = ds.be;
      werte.Datum = helfer.datumFormat(ds.da, "sekunden");
      const aufnahmen = redLit.db.data[id].length;
      werte.Aufnahme = `v${aufnahmen - slot} von ${aufnahmen}`;
    }
    // Werte drucken
    const td = document.getElementById("red-lit-eingabe-meta");
    td.replaceChildren();
    for (const [ k, v ] of Object.entries(werte)) {
      const cont = document.createElement("span");
      td.appendChild(cont);
      const label = document.createElement("span");
      cont.appendChild(label);
      label.textContent = `${k}:`;
      cont.appendChild(document.createTextNode(` ${v}`));
      // ggf. ermöglichen, Versionen-Popup zu öffnen
      if (id && k === "Aufnahme") {
        cont.dataset.ds = `{"id":"${id}","slot":${slot}}`;
        redLit.anzeigePopupListener(cont);
      }
    }
  },

  // Anzeige: Speicher für Variablen
  anzeige: {
    snippetKontext: "suche", // "suche" | "popup"
    id: "", // ID des im Popup angezeigten Titels
  },

  // Anzeige: Snippet einer Titelaufnahme erstellen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  //   meldung = String | undefined
  //     (ggf. Meldung, die angezeigt werden soll)
  anzeigeSnippet ({ id, slot, meldung = "" }) {
    const ds = redLit.db.data[id][slot];
    // Snippet füllen
    const div = document.createElement("div");
    div.classList.add("red-lit-snippet");
    div.dataset.ds = `{"id":"${id}","slot":${slot}}`;
    // Sigle
    const si = document.createElement("p");
    div.appendChild(si);
    si.classList.add("sigle");
    si.innerHTML = redLit.anzeigeSnippetHighlight({
      feld: "si",
      text: ds.td.si,
    });
    // ID
    const idPrint = document.createElement("span");
    si.appendChild(idPrint);
    idPrint.classList.add("id");
    let textId = id;
    if (redLit.suche.id) {
      textId = id.replace(redLit.suche.id, m => `<mark class="suche">${m}</mark>`);
    }
    idPrint.innerHTML = textId;
    // alte Aufnahme
    if ((slot > 0 || meldung) &&
        redLit.anzeige.snippetKontext === "suche") {
      const alt = document.createElement("span");
      si.appendChild(alt);
      alt.classList.add("veraltet");
      if (slot > 0) {
        alt.textContent = "[Titelaufnahme veraltet]";
      } else {
        alt.textContent = `[${meldung}]`;
      }
    }
    // Icons
    const icons = document.createElement("span");
    si.appendChild(icons);
    icons.classList.add("icons");
    // Icon: XML
    if (kartei.wort) {
      const xml = document.createElement("a");
      icons.appendChild(xml);
      xml.href = "#";
      xml.classList.add("icon-link", "icon-xml");
      xml.title = "Titelaufnahme in XML-Fenster";
      redLit.xml({ icon: xml });
    }
    // Icon: Referenz kopieren
    if (redLit.anzeige.snippetKontext === "suche") {
      const cb = document.createElement("a");
      icons.appendChild(cb);
      cb.href = "#";
      cb.classList.add("icon-link", "icon-kopieren");
      cb.title = "Referenz in Zwischenablage";
      cb.addEventListener("click", function (evt) {
        evt.preventDefault();
        const ds = JSON.parse(this.closest("div").dataset.ds);
        bridge.ipc.invoke("cb", "writeText", ds.id);
        shared.animation("zwischenablage");
      });
    }
    // Icon: Löschen
    if (redLit.anzeige.snippetKontext === "popup") {
      const del = document.createElement("a");
      icons.appendChild(del);
      del.href = "#";
      del.classList.add("icon-link", "icon-muelleimer");
      del.title = "Titelaufnahme löschen";
      redLit.titelLoeschenFrage(del);
    }
    // Icon: Versionen
    if (redLit.anzeige.snippetKontext === "suche") {
      const vers = document.createElement("a");
      icons.appendChild(vers);
      vers.href = "#";
      vers.classList.add("icon-link", "icon-kreis-info");
      vers.title = "Versionen anzeigen";
      redLit.anzeigePopupListener(vers);
    }
    // Icon: Bearbeiten
    const bearb = document.createElement("a");
    icons.appendChild(bearb);
    bearb.href = "#";
    bearb.classList.add("icon-link", "icon-stift");
    bearb.title = "Titelaufnahme bearbeiten";
    redLit.eingabeBearbeitenListener(bearb);
    // Icons: Tooltip initialisieren
    tooltip.init(icons);
    // Titelaufnahme
    const ti = document.createElement("p");
    div.appendChild(ti);
    ti.classList.add("aufnahme");
    ti.innerHTML = redLit.anzeigeSnippetHighlight({
      feld: "ti",
      text: ds.td.ti,
    });
    // URL + Aufrufdatum
    if (ds.td.ul) {
      const ul = document.createElement("p");
      div.appendChild(ul);
      const a = document.createElement("a");
      ul.appendChild(a);
      a.classList.add("link");
      a.href = ds.td.ul;
      a.innerHTML = redLit.anzeigeSnippetHighlight({
        feld: "ul",
        text: ds.td.ul,
      });
      shared.externeLinks(a);
      if (ds.td.ad) {
        const datum = ds.td.ad.split("-");
        datum[1] = datum[1].replace(/^0/, "");
        datum[2] = datum[2].replace(/^0/, "");
        const i = document.createElement("i");
        ul.appendChild(i);
        i.textContent = "Aufrufdatum:";
        ul.appendChild(i);
        const adFrag = document.createElement("span");
        ul.appendChild(adFrag);
        adFrag.innerHTML = redLit.anzeigeSnippetHighlight({
          feld: "ad",
          text: ` ${datum[2]}.\u00A0${datum[1]}. ${datum[0]}`,
        });
      }
    }
    // Fundort
    const fo = document.createElement("p");
    div.appendChild(fo);
    const i = document.createElement("i");
    fo.appendChild(i);
    i.textContent = "Fundort:";
    const foFrag = document.createElement("span");
    fo.appendChild(foFrag);
    foFrag.innerHTML = redLit.anzeigeSnippetHighlight({
      feld: "fo",
      text: ds.td.fo,
    });
    // PPN
    if (ds.td.pn.length) {
      const pn = document.createElement("p");
      div.appendChild(pn);
      const i = document.createElement("i");
      pn.appendChild(i);
      i.textContent = "PPN:";
      for (let i = 0, len = ds.td.pn.length; i < len; i++) {
        if (i > 0) {
          pn.appendChild(document.createTextNode(", "));
        }
        const a = document.createElement("a");
        pn.appendChild(a);
        a.classList.add("link");
        a.href = `https://kxp.k10plus.de/DB=2.1/PPNSET?PPN=${ds.td.pn[i]}`;
        a.innerHTML = redLit.anzeigeSnippetHighlight({
          feld: "pn",
          text: ds.td.pn[i],
        });
        shared.externeLinks(a);
      }
    }
    // Notizen
    if (ds.td.no) {
      const no = document.createElement("p");
      div.appendChild(no);
      const i = document.createElement("i");
      no.appendChild(i);
      i.textContent = "Notizen:";
      const noFrag = document.createElement("span");
      no.appendChild(noFrag);
      const notiz = redLit.anzeigeSnippetHighlight({
        feld: "no",
        text: ds.td.no,
      });
      noFrag.innerHTML = notiz.replace(/[\r\n]+/g, "<br>");
    }
    // Tags
    if (ds.td.tg.length) {
      const p = document.createElement("p");
      div.appendChild(p);
      p.classList.add("tags");
      redLit.tagsList({
        cont: p,
        tags: ds.td.tg,
        eingabe: false,
      });
    }
    // Metadaten: ErstellerIn + BearbeiterIn + Datum + Titelaufnahmen
    // (nur im Suchkontext anzeigen)
    if (redLit.anzeige.snippetKontext === "suche") {
      const meta = document.createElement("p");
      div.appendChild(meta);
      meta.classList.add("meta");
      // ErstellerIn + BearbeiterIn
      let erst = redLit.db.data[id][redLit.db.data[id].length - 1].be;
      if (erst === ds.be) {
        erst = "";
      } else {
        erst += "\u00A0/ ";
      }
      meta.innerHTML = redLit.anzeigeSnippetHighlight({
        feld: "be",
        text: erst,
      }) + redLit.anzeigeSnippetHighlight({
        feld: "be",
        text: ds.be,
      });
      // Zeitpunkt
      const zeit = document.createElement("span");
      meta.appendChild(zeit);
      zeit.textContent = helfer.datumFormat(ds.da, "sekunden");
      // Anzahl Versionen
      const aufnahmen = document.createElement("span");
      meta.appendChild(aufnahmen);
      aufnahmen.classList.add("titelaufnahmen");
      let numerus = "Version";
      if (redLit.db.data[id].length > 1) {
        numerus = "Versionen";
      }
      aufnahmen.textContent = `${redLit.db.data[id].length}\u00A0${numerus}`;
      redLit.anzeigePopupListener(aufnahmen);
    }
    // ggf. Klick-Event an das Snippet hängen
    if (redLit.anzeige.snippetKontext === "suche") {
      redLit.sucheSnippetMarkierenListener(div);
    }
    // Snippet zurückgeben
    return div;
  },

  // Anzeige: Suchtreffer im Snippet highlighten
  //   feld = String
  //     (Feld, auf das der String zutrifft)
  //   text = String
  //     (Text, der gedruckt werden soll)
  anzeigeSnippetHighlight ({ feld, text }) {
    // kein Highlighting für Sondersuche Duplikate
    if (redLit.suche.sonder === "duplikate") {
      return text;
    }
    // Muss/kann Text hervorgehoben werden?
    if (redLit.anzeige.snippetKontext !== "suche" ||
        !redLit.suche.highlight.length) {
      return text;
    }
    // Suchtext hervorheben
    for (const i of redLit.suche.highlight) {
      if (i.feld && i.feld !== feld) { // wenn i.feld gefüllt => nur betreffendes Feld highlighten
        continue;
      }
      text = text.replace(i.reg, m => `<mark class="suche">${m}</mark>`);
    }
    text = shared.suchtrefferBereinigen(text);
    text = redLit.anzeigeSnippetMaskieren(text);
    return text;
  },

  // Anzeige: Maskieren von Spitzklammern
  //   text = String
  //     (Text, der gedruckt werden soll)
  anzeigeSnippetMaskieren (text) {
    text = text.replace(/</g, "&lt;");
    text = text.replace(/>/g, "&gt;");
    text = text.replace(/&lt;mark class="suche"&gt;/g, '<mark class="suche">');
    text = text.replace(/&lt;\/mark&gt;/g, "</mark>");
    return text;
  },

  // Anzeige: Listener zum Öffnen des Versionen-Popups
  //   ele = Element
  //     (Element, über das das Popup geöffnet werden soll)
  anzeigePopupListener (ele) {
    ele.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      const ds = this.dataset.ds ? this.dataset.ds : this.closest(".red-lit-snippet").dataset.ds;
      const json = JSON.parse(ds);
      redLit.anzeigePopup(json);
    });
  },

  // Anzeige: Versionen-Popup für Titelaufnahmen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  anzeigePopup ({ id, slot }) {
    redLit.anzeige.snippetKontext = "popup";
    redLit.anzeige.id = id;
    // Suchhilfe schließen
    document.getElementById("red-lit-suche-hilfe-fenster").classList.add("aus");
    // aktuelles Popup ggf. entfernen
    redLit.anzeigePopupSchliessen();
    // Fenster erzeugen
    const win = document.createElement("div");
    document.querySelector("#red-lit > div").appendChild(win);
    win.id = "red-lit-popup";
    // Schließen-Icon
    const img = document.createElement("img");
    win.appendChild(img);
    img.src = "img/x.svg";
    img.width = "24";
    img.height = "24";
    img.title = "Popup schließen (Esc)";
    img.addEventListener("click", () => redLit.anzeigePopupSchliessen());
    // Versionen-Feld
    const vers = document.createElement("div");
    win.appendChild(vers);
    vers.id = "red-lit-popup-versionen";
    redLit.anzeigePopupVersionen(slot);
    // Titel-Feld
    const titel = document.createElement("div");
    win.appendChild(titel);
    titel.id = "red-lit-popup-titel";
    titel.appendChild(redLit.anzeigeSnippet({ id, slot }));
    // Tooltips initialisieren
    tooltip.init(win);
  },

  // Anzeige: vorhandene Titelaufnahmen im Versionen-Popup auflisten
  //   slot = Number | undefined
  //     (Titelaufnahme, die angezeigt werden soll)
  anzeigePopupVersionen (slot = 0) {
    const vers = document.getElementById("red-lit-popup-versionen");
    const aufnahme = redLit.db.data[redLit.anzeige.id];
    vers.scrollTop = 0;
    vers.replaceChildren();
    for (let i = 0, len = aufnahme.length; i < len; i++) {
      const div = document.createElement("div");
      vers.appendChild(div);
      if (i === slot) {
        div.classList.add("aktiv");
      }
      div.dataset.slot = i;
      const infos = [
        `v${len - i}`, // Version
        helfer.datumFormat(aufnahme[i].da, "technisch"), // Datum
        aufnahme[i].be, // BearbeiterIn
      ];
      for (const i of infos) {
        const span = document.createElement("span");
        div.appendChild(span);
        span.textContent = i;
      }
      redLit.anzeigePopupWechseln(div);
    }
    // ggf. aktives Element in den Blick scrollen
    const aktiv = vers.querySelector(".aktiv");
    if (aktiv.offsetTop + aktiv.offsetHeight > vers.offsetHeight) {
      vers.scrollTop = aktiv.offsetTop;
    }
  },

  // Anzeige: Titelaufnahme aus der Liste auswählen und anzeigen
  //   div = Element
  //     (die angeklickte Titelaufnahme)
  anzeigePopupWechseln (div) {
    div.addEventListener("click", function () {
      if (this.classList.contains("aktiv")) {
        return;
      }
      // ausgewählte Titelaufnahme aktivieren
      document.querySelector("#red-lit-popup-versionen .aktiv").classList.remove("aktiv");
      this.classList.add("aktiv");
      // Titelaufnahme anzeigen
      redLit.anzeige.snippetKontext = "popup";
      const snippet = redLit.anzeigeSnippet({
        id: redLit.anzeige.id,
        slot: parseInt(this.dataset.slot, 10),
      });
      const titel = document.getElementById("red-lit-popup-titel");
      titel.replaceChild(snippet, titel.firstChild);
    });
  },

  // Anzeige: Titelaufnahme im Popup wechseln (Strg + ↑/↓)
  //   evt = Object
  //     (Event-Object des keydown)
  anzeigePopupNav (evt) {
    let slot = parseInt(document.querySelector("#red-lit-popup-versionen .aktiv").dataset.slot, 10);
    if (evt.key === "ArrowDown") {
      slot++;
    } else {
      slot--;
    }
    if (slot < 0 || slot === redLit.db.data[redLit.anzeige.id].length) {
      return;
    }
    const div = document.querySelector(`#red-lit-popup-versionen [data-slot="${slot}"]`);
    div.dispatchEvent(new MouseEvent("click"));
    const versionen = document.getElementById("red-lit-popup-versionen");
    if (div.offsetTop + div.offsetHeight > versionen.offsetHeight + versionen.scrollTop) {
      versionen.scrollTop = div.offsetTop;
    } else if (div.offsetTop < versionen.scrollTop) {
      versionen.scrollTop = div.offsetTop - versionen.offsetHeight + div.offsetHeight;
    }
  },

  // Anzeige: Versionen-Popup schließen
  anzeigePopupSchliessen () {
    const win = document.getElementById("red-lit-popup");
    if (!win) {
      return;
    }
    win.parentNode.removeChild(win);
  },

  // Titelaufnahme löschen (Sicherheitsfrage)
  //   a = Element
  //     (Icon-Link zum Löschen)
  titelLoeschenFrage (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const json = JSON.parse(this.closest(".red-lit-snippet").dataset.ds);
      const aufnahme = redLit.db.data[json.id];
      let text = `Soll Version #${aufnahme.length - json.slot} der Titelaufnahme wirklich gelöscht werden?`;
      if (aufnahme.length === 1) {
        text = "Soll die Titelaufnahme wirklich komplett gelöscht werden?";
      }
      dialog.oeffnen({
        typ: "confirm",
        text,
        callback: () => {
          if (dialog.antwort) {
            redLit.titelLoeschen(json);
          }
        },
      });
    });
  },

  // Titelaufnahme löschen
  //   id = String
  //     (ID der Titelaufnahme)
  //   slot = Number
  //     (Slot der Titelaufnahme)
  async titelLoeschen ({ id, slot }) {
    redLit.db.dataOpts.push({
      aktion: "del",
      id,
      idSlot: redLit.db.data[id][slot].id,
    });
    redLit.db.data[id].splice(slot, 1);
    // ggf. Suche auffrischen
    redLit.sucheTrefferAuffrischen(id, slot);
    // ggf. Eingabeformular auffrischen oder zurücksetzen
    if (redLit.eingabe.id === id) {
      if (!redLit.db.data[id].length || // Titelaufnahme existiert nicht mehr
          slot === redLit.eingabe.slot) { // der entfernte Slot wird gerade angezeigt
        await redLit.dbCheck(() => {
          redLit.eingabeLeeren();
          redLit.eingabeStatus("add");
        }, false);
      } else { // Titelaufnahme existiert noch
        redLit.eingabeMetaFuellen({ id, slot: 0 });
        const ds = redLit.eingabeSpeichernMakeDs();
        const diff = redLit.eingabeSpeichernDiff(redLit.db.data[id][0].td, ds.td);
        if (diff) {
          document.getElementById("red-lit-eingabe-ti").dispatchEvent(new KeyboardEvent("input"));
        }
      }
    }
    // Datensatz ggf. komplett löschen/Popup auffrischen
    if (!redLit.db.data[id].length) {
      delete redLit.db.data[id];
      redLit.anzeigePopupSchliessen();
    } else {
      redLit.anzeigePopupVersionen();
      const titel = document.getElementById("red-lit-popup-titel");
      redLit.anzeige.snippetKontext = "popup";
      titel.replaceChild(redLit.anzeigeSnippet({ id, slot: 0 }), titel.firstChild);
    }
    // Status Datenbank auffrischen
    redLit.dbGeaendert(true);
  },

  // Titelaufnahme in die Zwischenablage
  //   typ = String
  //     (Texttyp, der in die Zwischenablage kopiert werden soll)
  titelZwischenablage (typ) {
    let text = "";
    if (typ === "plainReferenz") {
      text = popup.titelaufnahme.ds.id;
    } else if (typ === "xmlReferenz") {
      text = `<Literaturreferenz Ziel="${popup.titelaufnahme.ds.id}"></Literaturreferenz>`;
    } else if (typ === "plain") {
      text = redLit.dbExportierenSnippetPlain(popup.titelaufnahme.ds);
    } else if (typ === "xml") {
      const snippet = redLit.dbExportierenSnippetXML(popup.titelaufnahme.ds);
      let xmlDoc = sharedXml.parseXML(snippet);
      xmlDoc = sharedXml.indent(xmlDoc);
      text = new XMLSerializer().serializeToString(xmlDoc);
    } else if (typ === "sigle") {
      text = redLit.db.data[popup.titelaufnahme.ds.id][0].td.si;
    }
    bridge.ipc.invoke("cb", "writeText", text);
    shared.animation("zwischenablage");
  },

  // Titelaufnahme an das Redaktionssystem schicken (Listener)
  //   icon = Element
  //     (das XML-Icon)
  xml ({ icon }) {
    icon.addEventListener("click", function (evt) {
      evt.preventDefault();
      let id;
      const snippet = this.closest(".red-lit-snippet");
      if (snippet) {
        // Icon im Snippet
        const ds = JSON.parse(snippet.dataset.ds);
        id = ds.id;
      } else {
        // Icon im Eingabeformular
        if (!kartei.wort) {
          dialog.oeffnen({
            typ: "alert",
            text: "Um die Funktion <i>Redaktion &gt; XML</i> zu nutzen, muss eine Kartei geöffnet sein.",
          });
          return;
        } else if (redLit.eingabe.status === "add" && !redLit.eingabe.changed) {
          dialog.oeffnen({
            typ: "alert",
            text: "Im Eingabeformular befindet sich keine Titelaufnahme.",
          });
          return;
        } else if (redLit.eingabe.changed) {
          dialog.oeffnen({
            typ: "alert",
            text: "Sie müssen die Titelaufnahme erst speichern.",
          });
          return;
        }
        id = redLit.eingabe.id;
      }
      redLit.xmlDatensatz({ id });
    });
  },

  // Titelaufnahme an das Redaktionssystem schicken
  //   id = String
  //     (die ID der Titelaufnahme)
  xmlDatensatz ({ id }) {
    const xmlDatensatz = {
      key: "lt",
      ds: {
        id,
        si: redLit.db.data[id][0].td.si,
        xl: redLit.dbExportierenSnippetXML({ id, slot: 0 }),
      },
    };
    redXml.datensatz({ xmlDatensatz });
  },

  // Tags auflisten
  //   cont = Element
  //     (Container, in den die Tags eingefügt werden sollen)
  //   tags = Array
  //     (die noch unsortierten Tags)
  //   eingabe = Boolean
  //     (Tags im Eingabeformular einfügen)
  tagsList ({ cont, tags, eingabe = false }) {
    const more = document.createElement("span");
    let tagsArt = 0;
    tags = redLit.tagsSort(tags);
    for (const t of tags) {
      let tag = t;
      if (!eingabe) {
        tag = redLit.anzeigeSnippetHighlight({
          feld: "tg",
          text: t,
        });
      }
      if (/^Artikel: /.test(t)) {
        tagsArt++;
      }
      const span = redLit.eingabeTagErzeugen({ tag });
      if (eingabe) {
        span.classList.add("loeschbar");
        redLit.eingabeTagLoeschen({ tag: span });
      }
      if (tagsArt > 3) {
        more.appendChild(span);
      } else {
        cont.appendChild(span);
      }
    }
    if (tagsArt > 3) {
      more.classList.add("mehr-tags-kuerzung");
      cont.appendChild(more);
      const blende = document.createElement("span");
      more.appendChild(blende);
      blende.classList.add("mehr-tags-kuerzung-blende");
      blende.textContent = "\u00A0";
      const expand = document.createElement("span");
      cont.appendChild(expand);
      expand.classList.add("mehr-tags");
      expand.textContent = "mehr…";
      expand.addEventListener("click", function () {
        this.classList.add("aus");
        this.previousSibling.classList.add("erweitert");
        this.previousSibling.querySelector(".mehr-tags-kuerzung-blende").classList.add("aus");
      });
    }
  },

  // spezielle Sortierung von Tags
  //   tags = Array
  //     (eindimensionales Array mit den Tags)
  tagsSort (tags) {
    const artikel = [];
    const lemma = [];
    const sonstige = [];
    for (const t of tags) {
      if (/^Artikel: /.test(t)) {
        artikel.push(t);
      } else if (/^Lemma: /.test(t)) {
        lemma.push(t);
      } else {
        sonstige.push(t);
      }
    }
    artikel.sort(shared.sortAlpha);
    lemma.sort(shared.sortAlpha);
    sonstige.sort(shared.sortAlpha);
    return sonstige.concat(lemma).concat(artikel);
  },
};
