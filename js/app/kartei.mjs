
import anhaenge from "./anhaenge.mjs";
import bedeutungen from "./bedeutungen.mjs";
import bedeutungenWin from "./bedeutungenWin.mjs";
import bedvis from "./bedvis.mjs";
import beleg from "./beleg.mjs";
import belegeBuchung from "./belegeBuchung.mjs";
import erinnerungen from "./erinnerungen.mjs";
import filter from "./filter.mjs";
import helfer from "./helfer.mjs";
import importShared from "./importShared.mjs";
import konversion from "./konversion.mjs";
import kopf from "./kopf.mjs";
import kopieren from "./kopieren.mjs";
import lemmata from "./lemmata.mjs";
import liste from "./liste.mjs";
import lock from "./lock.mjs";
import meta from "./meta.mjs";
import notizen from "./notizen.mjs";
import optionen from "./optionen.mjs";
import overlayApp from "./overlayApp.mjs";
import redMeta from "./redMeta.mjs";
import redXml from "./redXml.mjs";
import speichern from "./speichern.mjs";
import tagger from "./tagger.mjs";
import updates from "./updates.mjs";
import zuletzt from "./zuletzt.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import shared from "../shared.mjs";
import sharedXml from "../sharedXml.mjs";

export { kartei as default };

const kartei = {
  // aktuelles Wort für Fenstertitel
  // (ohne Kommentare zu den Wörtern)
  titel: "",

  // aktuelles Wort für Fensterkopf
  // (mit Kommentaren zu den Wörtern)
  wort: "",

  // Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
  pfad: "",

  // neue Kartei erstellen
  async erstellen () {
    // alte Kartei ggf. entsperren
    lock.actions({ datei: kartei.pfad, aktion: "unlock" });

    // Kartei-Pfad löschen
    kartei.pfad = "";

    // Main-Prozess mitteilen, dass in diesem Fenster eine Kartei geöffnet ist
    bridge.ipc.invoke("kartei-geoeffnet", dd.win.winId, "neu");

    // globales Datenobjekt initialisieren
    dd.file = {
      an: [], // Anhänge
      bd: { // Bedeutungsgerüste
        gn: "1",
        gr: {
          1: {
            bd: [],
            na: "",
            sl: 2,
          },
        },
      },
      bv: [], // Bedeutungsvisualisierung
      dc: new Date().toISOString(), // Datum Kartei-Erstellung
      dm: "", // Datum Kartei-Änderung
      fv: {}, // Formvarianten
      ka: {}, // Karteikarten
      la: { // Lemmaliste
        er: [], // ergänzende Kartei für die angegebenen Hauptlemmata
        la: [ // Lemmata
          {
            ho: 0, // Homographenindex
            ko: "", // Kommentar
            nl: false, // ist Nebenlemma
            sc: [ "" ], // Schreibungen
          },
        ],
        wf: false, // ist Wortfeldartikel
      },
      le: [], // überprüfte Lexika usw.
      no: "", // Notizen
      rd: { // Redaktion
        be: [], // BearbeiterInnen
        er: [
          { // Ereignisse
            da: new Date().toISOString().split("T")[0],
            er: "Kartei erstellt",
            no: "",
            pr: "",
          },
        ],
        no: "", // Notizen
        sg: [], // Sachgebiete
        sp: [], // Stichwortplanung
        tf: [], // Themenfelder
        wi: [], // Wortinformationen
        xl: sharedXml.redXmlData(), // XML
      },
      re: 0, // Revision
      ty: "ztj", // Datei ist eine ZTJ-Datei (immer dieser Wert! Bis Version 0.24.0 stand in dem Feld "wgd")
      ve: konversion.version, // Version des Dateiformats
    };

    // Lemmata-Fenster öffnen und auf Eingabe warten
    lemmata.karteiInit = true;
    lemmata.oeffnen();
    await new Promise(resolve => {
      const interval = setInterval(() => {
        if (document.getElementById("lemmata").classList.contains("aus")) {
          clearInterval(interval);
          resolve(true);
        }
      }, 50);
    });
    lemmata.karteiInit = false;

    // Erstellen abgebrochen
    if (lemmata.abgebrochen) {
      dd.file = {};
      bridge.ipc.invoke("kartei-geschlossen", dd.win.winId);
      lemmata.abgebrochen = false;
      return;
    }

    // ggf. für diesen Rechner registrierte BearbeiterIn eintragen
    if (optionen.data.einstellungen.bearbeiterin) {
      dd.file.rd.be.push(optionen.data.einstellungen.bearbeiterin);
      dd.file.rd.er[0].pr = optionen.data.einstellungen.bearbeiterin;
    }

    // Kartendatum-Filter initialisieren
    filter.ctrlReset(false);
    filter.kartendatumInit();

    // Belegliste leeren: Es könnten noch Belege von einer vorherigen Karte vorhanden sein;
    // außerdem könnte es sein, dass die Bearbeiter*in keinen Beleg erstellt
    liste.aufbauen(true);

    // alle Overlays schließen
    await overlayApp.alleSchliessen();

    // Bedeutungsgerüst-Fenster schließen
    bedeutungenWin.schliessen();

    // Bedvis-Fenster schließen
    bedvis.close();

    // XML-Fenster schließen
    redXml.schliessen();

    // neue Karte erstellen
    beleg.erstellen();

    // Fenstermenüs aktivieren
    bridge.ipc.invoke("menus-deaktivieren", false, dd.win.winId);

    // Erinnerungen initialisieren
    erinnerungen.check();
  },

  // bestehende Kartei öffnen (über den Öffnen-Dialog)
  async oeffnen () {
    const opt = {
      title: "Kartei öffnen",
      defaultPath: dd.app.documents,
      filters: [
        {
          name: `${dd.app.name} JSON`,
          extensions: [ "ztj" ],
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
    // Datei einlesen
    kartei.oeffnenEinlesen(result.filePaths[0]);
  },

  // die übergebene Datei einlesen
  //   datei = String
  //     (Dateipfad; kommt von der Startseite, dem Main-Prozess,
  //     dem Öffnen-Dialog oder via Drag-and-Drop)
  async oeffnenEinlesen (datei) {
    // Ist die Kartei schon offen?
    const schonOffen = await bridge.ipc.invoke("kartei-schon-offen", datei);
    if (schonOffen) {
      return;
    }
    // Ist die Datei gesperrt?
    const locked = await lock.actions({ datei, aktion: "check" });
    if (locked) {
      lock.locked({ info: locked });
      return;
    }
    // im aktuellen Fenster könnte eine Kartei geöffnet sein (kartei.pfad = true)
    // im aktuellen Fenster könnte gerade eine neue Kartei angelegt,
    //   aber noch nicht gespeichert worden sein (kartei.geaendert = true)
    // => neues Hauptfenster öffnen
    if (kartei.pfad || kartei.geaendert) {
      bridge.ipc.invoke("kartei-laden", datei);
      return;
    }
    // Datei einlesen
    const content = await bridge.ipc.invoke("io", {
      action: "read",
      path: datei,
    });
    if (typeof content !== "string") {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${content.name}: ${content.message}</p>`,
      });
      throw content;
    }
    // Daten sind in Ordnung => Einleseoperationen durchführen
    let data_tmp;
    // Folgt die Datei einer wohlgeformten JSON?
    try {
      data_tmp = JSON.parse(content);
    } catch (err_json) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json.name}: ${err_json.message}`,
      });
      return;
    }
    // Wirklich eine ZTJ-Datei?
    if (!/^(wgd|ztj)$/.test(data_tmp.ty)) { // bis Version 0.24.0 stand in dem Feld "wgd"
      dialog.oeffnen({
        typ: "alert",
        text: `Die Datei wurde nicht eingelesen.\nEs handelt sich nicht um eine <i>${dd.app.name} JSON</i>-Datei.`,
      });
      return;
    }
    // das Format der ZTJ-Datei wird von der installierten Programmversion nicht verstanden =>
    // Update bitte!
    if (data_tmp.ve > konversion.version) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Datei ist nicht kompatibel mit der installierten Version von <i>${dd.app.name}</i>.\nSie sollten ein <a href="#">Programm-Update</a> durchführen.`,
      });
      document.querySelector("#dialog-text a").addEventListener("click", evt => {
        evt.preventDefault();
        updates.fenster();
        overlayApp.schliessen(document.getElementById("dialog"));
        setTimeout(async () => {
          const data = await bridge.ipc.invoke("updates-get-data");
          if (!data.gesucht) {
            updates.check(false);
          }
        }, 500);
      });
      return;
    }
    // War die Datei evtl. verschwunden?
    zuletzt.verschwundenCheck(datei);
    // Datei sperren
    lock.actions({ datei, aktion: "lock" });
    // Main melden, dass die Kartei in diesem Fenster geöffnet wurde
    bridge.ipc.invoke("kartei-geoeffnet", dd.win.winId, datei);
    // alle Overlays schließen
    await overlayApp.alleSchliessen();
    // alle Filter zurücksetzen (wichtig für Text- und Zeitraumfilter)
    filter.ctrlReset(false);
    // Buchung-überprüfen-Fenster zurücksetzen
    belegeBuchung.reset();
    // Okay! Content kann eingelesen werden
    dd.file = JSON.parse(content);
    // Sicherheit: potenziell gefährliche Daten aus Karteikartenfeldern löschen
    kartei.oeffnenBereinigen();
    // Karteiwort eintragen
    // (muss wegen Konversion nach v9 vor der Konversion geschehen;
    // mit der Konversion nach v26 wird dd.file.wo entfernt)
    kartei.wort = dd.file.wo || "";
    // Version des Datenformats der Kartei für das Metadatenfenster merken
    // (muss vor der Konversion geschehen)
    meta.ve = dd.file.ve;
    // Konversion des Dateiformats anstoßen
    const karteiKonvertiert = konversion.start(dd.file);
    if (karteiKonvertiert) {
      kartei.karteiGeaendert(true);
    }
    // Einleseoperationen
    helfer.formVariRegExp();
    kartei.wortUpdate();
    kartei.pfad = datei;
    optionen.aendereLetzterPfad();
    zuletzt.aendern();
    anhaenge.makeIconList(dd.file.an, document.getElementById("kartei-anhaenge"), true); // impliziert kopf.icons()
    filter.kartendatumInit();
    liste.statusOffen = {}; // sonst werden unter Umständen Belege aufgeklappt, selbst wenn alle geschlossen sein sollten; s. Changelog zu Version 0.23.0
    liste.statusSichtbarP = {};
    liste.aufbauen(true);
    await liste.wechseln();
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: "auto",
    }); // war in dem Fenster schon eine Kartei offen, bleibt sonst die Scrollposition der vorherigen Kartei erhalten
    bridge.ipc.invoke("menus-deaktivieren", false, dd.win.winId);
    erinnerungen.check();
    helfer.geaendert(); // trägt das Wort in die Titelleiste ein
    // inaktive Filter schließen
    // (wurde zwar schon über filter.ctrlReset() ausgeführt,
    // muss hier aber noch einmal gemacht werden, um die dynamisch
    // aufgebauten Filter auch zu schließen)
    filter.inaktiveSchliessen(true);
    // Bedeutungsgerüst auf Korruption überprüfen
    bedeutungen.korruptionCheck();
  },

  // Sicherheit: potenziell gefährliche Tags aus Karteikartenfeldern löschen
  oeffnenBereinigen () {
    const rep = /<\/?(?:a|script).*?>/g;
    for (const karte of Object.values(dd.file.ka)) {
      for (const [ k, v ] of Object.entries(karte)) {
        if (typeof v !== "string") {
          continue;
        }
        karte[k] = v.replace(rep, "");
      }
    }
  },

  // Speichern: Verteilerfunktion
  // (Rückgabewerte:
  //     false: es wurde nicht gespeichert oder der User muss eine Entscheidung treffen;
  //     true: es wurde erfolgreich gespeichert)
  //   speichern_unter = Boolean
  //     (nicht automatisch in der aktuellen Datei speichern, sondern immer
  //     den Speichern-Dialog öffnen)
  async speichern (speichern_unter) {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort && speichern_unter) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Speichern unter</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Wurden überhaupt Änderungen vorgenommen?
    if (!kartei.geaendert && !speichern_unter) {
      return false;
    }
    // Kartei-Datei besteht bereits
    if (kartei.pfad && !speichern_unter) {
      const resultat = await kartei.speichernSchreiben(kartei.pfad);
      return resultat;
    }
    // Kartei-Datei muss angelegt werden
    kartei.speichernUnter();
    return false;
  },

  // Speichern: Kartei schreiben
  //   pfad = String
  //     (Zielpfad der Kartei)
  async speichernSchreiben (pfad) {
    // ggf. BearbeiterIn hinzufügen oder an die Spitze der Liste holen
    const bearb = optionen.data.einstellungen.bearbeiterin;
    const beAlt = [ ...dd.file.rd.be ];
    if (bearb) {
      if (dd.file.rd.be.includes(bearb)) {
        dd.file.rd.be.splice(dd.file.rd.be.indexOf(bearb), 1);
      }
      dd.file.rd.be.unshift(bearb);
    }
    // einige Werte müssen vor dem Speichern angepasst werden
    const dm_alt = dd.file.dm;
    const re_alt = dd.file.re;
    dd.file.dm = new Date().toISOString();
    dd.file.re++;
    // Datei speichern
    const result = await bridge.ipc.invoke("io", {
      action: "write",
      path: pfad,
      data: JSON.stringify(dd.file),
    });
    // beim Speichern ist ein Fehler aufgetreten
    if (result !== true) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Speichern der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
      // passiert ein Fehler, müssen manche Werte zurückgesetzt werden
      dd.file.rd.be = [ ...beAlt ];
      dd.file.dm = dm_alt;
      dd.file.re = re_alt;
      return false;
    }
    // das Speichern war erfolgreich
    zuletzt.verschwundenCheck(pfad);
    if (!kartei.pfad) {
      lock.actions({ datei: pfad, aktion: "lock" });
    } else if (pfad !== kartei.pfad) {
      lock.actions({ datei: kartei.pfad, aktion: "unlock" });
      lock.actions({ datei: pfad, aktion: "lock" });
    }
    meta.ve = dd.file.ve; // Version des Dateiformats für das Metadaten-Fenster bereitstellen
    kartei.pfad = pfad;
    optionen.aendereLetzterPfad();
    zuletzt.aendern();
    kartei.karteiGeaendert(false);
    shared.animation("gespeichert");
    bridge.ipc.invoke("kartei-geoeffnet", dd.win.winId, pfad);
    // ggf. Liste der BearbeiterInnen im redaktionellen Metadaten-Fenster auffrischen
    if (!document.getElementById("red-meta").classList.contains("aus")) {
      redMeta.bearbAuflisten();
    }
    // ggf. Icons im Kopf des Hauptfensters auffrischen
    // (wichtig für das Ordner-Icon, das nach dem Speichern einer neuen Kartei erscheinen soll)
    kopf.icons();
    return true;
  },

  // Speichern: Pfad ermitteln
  async speichernUnter () {
    const opt = {
      title: "Kartei speichern",
      defaultPath: await bridge.ipc.invoke("path-join", [ dd.app.documents, `${kartei.titel}.ztj` ]),
      filters: [
        {
          name: `${dd.app.name} JSON`,
          extensions: [ "ztj" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
    };
    // Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
    if (optionen.data.letzter_pfad) {
      opt.defaultPath = await bridge.ipc.invoke("path-join", [ optionen.data.letzter_pfad, `${kartei.titel}.ztj` ]);
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
    // Kartei speichern
    kartei.speichernSchreiben(result.filePath);
  },

  // Kartei schließen
  async schliessen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Schließen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Gibt es noch ein anderes Hauptfenster? Wenn ja => dieses Fenster komplett schließen
    const hauptfensterOffen = await bridge.ipc.invoke("fenster-hauptfenster", dd.win.winId);
    if (hauptfensterOffen) {
      bridge.ipc.invoke("fenster-schliessen");
      return;
    }
    // das aktuelle Fenster ist das letzte Hauptfenster => die Kartei in diesem Fenster schließen, das Fenster erhalten
    speichern.checkInit(() => {
      kartei.schliessenDurchfuehren();
    }, {
      kartei: true,
    });
  },

  // Kartei im aktuellen Fenster schließen, das Fenster selbst aber erhalten
  async schliessenDurchfuehren () {
    bridge.ipc.invoke("kartei-geschlossen", dd.win.winId);
    lock.actions({ datei: kartei.pfad, aktion: "unlock" });
    notizen.notizenGeaendert(false);
    tagger.taggerGeaendert(false);
    beleg.belegGeaendert(false);
    bedeutungen.bedeutungenGeaendert(false);
    kartei.karteiGeaendert(false);
    await overlayApp.alleSchliessen();
    bedeutungenWin.schliessen();
    bedvis.close();
    redXml.schliessen();
    dd.file = {};
    kartei.titel = "";
    kartei.wort = "";
    kartei.pfad = "";
    importShared.fileDataReset();
    const wort = document.getElementById("wort");
    wort.classList.add("keine-kartei");
    wort.textContent = "keine Kartei geöffnet";
    helfer.geaendert(); // trägt das Wort aus der Titelleiste aus
    erinnerungen.allesOkay = true;
    anhaenge.makeIconList(null, document.getElementById("kartei-anhaenge"));
    kopf.icons();
    kopieren.uiOff(false);
    zuletzt.aufbauen();
    helfer.sektionWechseln("start");
    bridge.ipc.invoke("menus-deaktivieren", true, dd.win.winId);
  },

  // Benutzer nach dem Wort fragen, für das eine Kartei angelegt werden soll
  wortErfragen () {
    // Kartei offen => neues Fenster öffnen und direkt nach dem Wort fragen
    if (kartei.wort) {
      bridge.ipc.invoke("neues-wort");
      return;
    }

    // keine Kartei offen => nach dem Wort fragen
    kartei.erstellen();
  },

  // Wort durch Benutzer ändern
  wortAendern () {
    if (!kartei.wort) {
      kartei.wortErfragen();
      return;
    }
    lemmata.oeffnen();
  },

  // Anzeige des Karteiworts auffrischen
  wortUpdate () {
    // Wortformen erzeugen
    const sup = [ "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹" ];
    const wort = [];
    const titel = [];
    for (const lemma of dd.file.la.la) {
      if (lemma.nl) {
        continue;
      }
      let text = lemma.sc.join("/");
      if (lemma.ho) {
        text = sup[lemma.ho - 1] + text;
      }
      titel.push(text);
      if (lemma.ko) {
        text += `<span>${lemma.ko}</span>`;
      }
      wort.push(text);
    }
    kartei.wort = wort.join(", ");
    kartei.titel = titel.join(", ");
    if (dd.file.la.wf) {
      kartei.wort += " (Wortfeld)";
      kartei.titel += " (Wortfeld)";
    }

    // Wort in den Fensterkopf eintragen
    const cont = document.getElementById("wort");
    cont.classList.remove("keine-kartei");
    cont.innerHTML = kartei.wort;
  },

  // Kartei wurde geändert und nocht nicht gespeichert
  geaendert: false,

  // Anzeigen, dass die Kartei geändert wurde
  //   geaendert = Boolean
  //     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
  karteiGeaendert (geaendert) {
    kartei.geaendert = geaendert;
    helfer.geaendert();
    const asterisk = document.getElementById("kartei-geaendert");
    if (geaendert) {
      asterisk.classList.add("geaendert");
    } else {
      asterisk.classList.remove("geaendert");
    }
  },
};
