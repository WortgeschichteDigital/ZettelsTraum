
/* MODULE & VARIABLEN ***************************/

import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  shell,
  webContents,
} from "electron";
import childProcess from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import appMenu from "./js/main/appMenu.mjs";
import dd from "./js/main/dd.mjs";
import dienste from "./js/main/dienste.mjs";
import fenster from "./js/main/fenster.mjs";
import io from "./js/main/io.mjs";
import optionen from "./js/main/optionen.mjs";
import popup from "./js/main/popup.mjs";


/* PROGRAMMFEHLER *******************************/

process.on("uncaughtException", err => onError(err));
process.on("unhandledRejection", err => onError(err));

function onError (err) {
  dd.fehler.push({
    time: new Date().toISOString(),
    word: "",
    fileZtj: "",
    fileJs: "main.js",
    message: err.stack,
    line: 0,
    column: 0,
  });
  // auf der Konsole auswerfen, wenn nicht gepackt
  if (dd.devtools) {
    console.log(`\x1b[47m\x1b[31m${err.stack}\x1b[0m`);
  }
}


/* LISTENER (app) *******************************/

// parse CLI options
const cliCommand = {
  // Literatur-DB exportieren
  "literatur-db-quelle": "", // Pfad
  "literatur-db-ziel": "", // Pfad
  "literatur-db-format": "", // xml | txt
  // Karteiliste exportieren
  "karteiliste-quelle": "", // Pfad
  "karteiliste-ziel": "", // Pfad
  "karteiliste-vorlage": "", // kommagetrennte Index-Nummer der zu nutzenden Vorlagen
  // ZTJ-Kartei öffnen
  ztj: "", // Pfad
};

for (let i = 0, len = process.argv.length; i < len; i++) {
  if (/\.ztj$/.test(process.argv[i])) {
    for (const k of Object.keys(cliCommand)) {
      cliCommand[k] = "";
    }
    cliCommand.ztj = makeAbsolute("ztj", process.argv[i]);
    break;
  }
  const arg = process.argv[i].match(/^--([^\s=]+)(?:=(.+))?/);
  if (!arg || typeof cliCommand[arg[1]] === "undefined" || !arg[2]) {
    // Kommando unbekannt oder Wert fehlt
    continue;
  }
  cliCommand[arg[1]] = makeAbsolute(arg[1], arg[2].replace(/^"|"$/g, ""));
}

// stellt sicher, dass Pfade absolut sind
function makeAbsolute (command, value) {
  if (/(quelle|ziel|ztj)$/.test(command) && !path.isAbsolute(value)) {
    value = path.join(process.cwd(), value);
    value = path.normalize(value);
  }
  return value;
}

let cliCommandFound = false;
for (const [ k, v ] of Object.entries(cliCommand)) {
  if (/^ztj/.test(k)) {
    continue;
  }
  if (v) {
    cliCommandFound = true;
    break;
  }
}
let cliReturnCode = -1;

// single instance lock
const locked = app.requestSingleInstanceLock(cliCommand);

if (cliCommandFound || !locked) {
  (async function () {
    // sofort beenden, wenn eine zweite Instanz ohne CLI-Kommando gestartet wurde
    if (!cliCommandFound) {
      app.quit();
      process.exit(0);
    }

    // warten bis die App bereit ist
    await app.whenReady();

    // Optionen einlesen
    await optionen.lesen();

    // CLI-Kommandos ausführen
    fenster.erstellen("", false, cliCommand);

    // auf einen validen return code warten
    await new Promise(resolve => {
      const interval = setInterval(() => {
        if (cliReturnCode >= 0) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
    });

    // Instanz beenden
    app.quit();
    process.exit(cliReturnCode);
  }());
} else {
  // zweite Instanz wird gestartet
  app.on("second-instance", (...args) => {
    // Kartei zum Öffnen übergeben?
    if (!args?.[3]?.ztj) {
      return;
    }

    // Kartei schon offen? => Fenster fokussieren
    const leereFenster = [];
    for (const [ id, val ] of Object.entries(dd.win)) {
      if (val.kartei === args[3].ztj) {
        fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
        return;
      } else if (val.typ === "index" && !val.kartei) {
        leereFenster.push(parseInt(id, 10));
      }
    }

    // Kartei noch nicht offen => Kartei öffnen
    if (leereFenster.length) {
      const w = BrowserWindow.fromId(leereFenster[0]);
      w.webContents.send("kartei-oeffnen", args[3].ztj);
      fenster.fokus(w);
    } else {
      fenster.erstellen(args[3].ztj);
    }
  });

  // Initialisierung abgeschlossen => Fenster erstellen
  app.on("ready", async () => {
    // Optionen einlesen
    await optionen.lesen();

    // ggf. Sprache des Menüs anpassen
    appMenu.lang();

    // Menü der zuletzt verwendeten Karteien erzeugen
    appMenu.zuletzt();

    // warten mit dem Öffnen des Fensters, bis die Optionen eingelesen wurden
    fenster.erstellen(cliCommand.ztj, false);

    // überprüfen, ob die zuletzt verwendten Karteien noch vorhanden sind
    setTimeout(() => {
      appMenu.zuletztCheck();
    }, 5000);

    // ggf. auf Updates prüfen
    if (!optionen.data.updates) {
      return;
    }
    const [ updatesChecked ] = optionen.data.updates.checked.split("T");
    const [ heute ] = new Date().toISOString().split("T");
    if (updatesChecked === heute ||
        !optionen.data.einstellungen["updates-suche"]) {
      return;
    }
    setTimeout(() => {
      for (const [ id, val ] of Object.entries(dd.win)) {
        if (val.typ !== "index") {
          continue;
        }
        const w = BrowserWindow.fromId(parseInt(id, 10));
        w.webContents.send("updates-check");
        break;
      }
    }, 3e4);
  });

  // Sicherheit für Web-Contents erhöhen:
  //   - Navigieren zu anderen Seiten als derjenigen,
  //     die beim Öffnen des Fenster aus der main.js heraus
  //     geladen wird, unterbinden.
  //   - Erzeugen von Fenstern via window.open()
  //     aus einem Web-Content heraus unterbinden.
  app.on("web-contents-created", (evt, contents) => {
    contents.on("will-navigate", evt => evt.preventDefault());
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
  });

  // App beenden, wenn alle Fenster geschlossen worden sind
  app.on("window-all-closed", async () => {
    // Optionen schreiben
    clearTimeout(optionen.schreibenTimeout);
    await optionen.schreiben();

    // auf macOS bleibt das Programm üblicherweise aktiv,
    // bis die BenutzerIn es explizit beendet
    if (process.platform !== "darwin") {
      // App beenden
      app.quit();
    }
  });

  // App wiederherstellen
  app.on("activate", () => {
    // auf macOS wird einfach ein neues Fenster wiederhergestellt
    if (Object.keys(dd.win).length === 0) {
      fenster.erstellen("");
    }
  });
}


/* LISTENER (ipcMain) ***************************/

// Sicherheit: WebContents, die eine Anfrage stellen, müssen zwingend eine lokale Datei geladen haben
function validSender (evt) {
  const validIds = Object.values(dd.win).flatMap(i => i.contentsId);
  if (!validIds.includes(evt.sender.id)) {
    return false;
  }
  try {
    const validURL = new URL(evt.senderFrame.url);
    if (validURL.protocol !== "file:") {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

// ***** PROGRAMMFEHLER *****
// Fehler aus Renderer-Prozess empfangen
ipcMain.handle("fehler", (evt, err) => {
  if (!validSender(evt)) {
    return;
  }
  dd.fehler.push(err);
});

// Fehler an Renderer-Prozess senden
ipcMain.handle("fehler-senden", evt => {
  if (!validSender(evt)) {
    return [];
  }
  return dd.fehler;
});


// ***** INIT *****
// Infos zu App und Fenster senden
ipcMain.handle("get-info", evt => {
  if (!validSender(evt)) {
    return {};
  }
  const { env } = process;
  const bw = BrowserWindow.fromWebContents(evt.sender);
  return {
    app: {
      appPath: app.getAppPath(),
      documents: app.getPath("documents"),
      lang: env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES,
      name: app.name,
      os: {
        arch: os.arch(),
        hostname: os.hostname(),
        type: os.type(),
        username: os.userInfo().username,
      },
      packaged: app.isPackaged,
      pathSep: path.sep,
      platform: process.platform,
      resourcesPath: process.resourcesPath,
      temp: app.getPath("temp"),
      userData: app.getPath("userData"),
      version: app.getVersion(),
      versions: {
        chrome: process.versions.chrome,
        electron: process.versions.electron,
        node: process.versions.node,
        v8: process.versions.v8,
      },
    },
    win: {
      winId: bw.id,
      contentsId: evt.sender.id,
      typ: dd.win[bw.id].typ,
    },
  };
});

// Verzeichnis der Bilder in ./img senden
ipcMain.handle("bilder-senden", async evt => {
  if (!validSender(evt)) {
    return [];
  }
  const bilder = await dienste.bilder();
  return bilder;
});


// ***** APP-MENÜ *****
// Menüse aktivieren/deaktivieren
ipcMain.handle("menus-deaktivieren", (evt, disable, id) => {
  if (!validSender(evt)) {
    return;
  }
  appMenu.deaktivieren(disable, id);
});

// App komplett beenden
ipcMain.handle("app-beenden", evt => {
  if (!validSender(evt)) {
    return;
  }
  appMenu.befehl("app-beenden");
});

// Rechtsklickmenü einblenden
ipcMain.handle("popup", (evt, items) => {
  if (!validSender(evt)) {
    return;
  }
  popup.make(evt.sender, items);
});


// ***** OPTIONEN *****
// Optionen empfangen und speichern
ipcMain.handle("optionen-speichern", (evt, opt, winId) => {
  if (!validSender(evt)) {
    return;
  }

  // Optionen übernehmen
  if (optionen.data.zuletzt &&
      optionen.data.zuletzt.join(",") !== opt.zuletzt.join(",")) {
    optionen.data = opt;
    appMenu.zuletzt();
    appMenu.zuletztUpdate(); // Das sollte nicht unnötig oft aufgerufen werden!
  } else {
    optionen.data = opt;
  }

  // Optionen an alle Hauptfenster schicken, mit Ausnahme dem der übergebenen ID
  // (an Nebenfenster wird nur die Helligkeitseinstellung geschickt)
  for (const [ id, val ] of Object.entries(dd.win)) {
    const idInt = parseInt(id, 10);
    if (idInt === winId) {
      continue;
    }
    if (val.typ === "index") {
      // Hauptfenster
      BrowserWindow.fromId(idInt).webContents.send("optionen-empfangen", optionen.data);
    } else {
      // Nebenfenster
      const dunkler = !!optionen.data?.einstellungen?.["helle-dunkler"];
      BrowserWindow.fromId(idInt).webContents.send("helle-dunkler", dunkler);
    }
  }

  // Optionen nach Timeout in einstellungen.json schreiben
  clearTimeout(optionen.schreibenTimeout);
  optionen.schreibenTimeout = setTimeout(() => optionen.schreiben(), 6e4);
});

// verschwundene Kartei wurde wiedergefunden
ipcMain.handle("optionen-zuletzt-wiedergefunden", (evt, verschwunden) => {
  if (!validSender(evt)) {
    return;
  }
  appMenu.zuletztVerschwunden = verschwunden;
  appMenu.zuletztVerschwundenInform();
});

// Anfrage, ob die Tag-Dateien abgeglichen werden solle
// (soll nur einmal pro Session geschehen)
ipcMain.handle("optionen-tag-dateien-abgleich", evt => {
  if (!validSender(evt)) {
    return false;
  }
  if (dd.tagDateienAbgleich) {
    dd.tagDateienAbgleich = false;
    return true; // Tag-Dateien abgleichen
  }
  return false; // Tag-Dateien nicht abgleichen
});


// ***** FENSTER *****
// Handbuch öffnen
ipcMain.handle("hilfe-handbuch", (evt, abschnitt) => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenNeben({ typ: "handbuch", abschnitt });
});

// Demonstrationskartei öffnen
ipcMain.handle("hilfe-demo", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.befehlAnHauptfenster("hilfe-demo");
});

// Dokumentation öffnen
ipcMain.handle("hilfe-dokumentation", (evt, abschnitt) => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenNeben({ typ: "dokumentation", abschnitt });
});

// Changelog öffnen
ipcMain.handle("hilfe-changelog", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenNeben({ typ: "changelog" });
});

// Fehlerlog öffnen
ipcMain.handle("hilfe-fehlerlog", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenNeben({ typ: "fehlerlog" });
});

// "Über App" öffnen
ipcMain.handle("ueber-app", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenUeber("app");
});

// "Über Electron" öffnen
ipcMain.handle("ueber-electron", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellenUeber("electron");
});

// Fenster fokussieren
ipcMain.handle("fenster-fokus", evt => {
  if (!validSender(evt)) {
    return;
  }
  const bw = BrowserWindow.fromWebContents(evt.sender);
  fenster.fokus(bw);
});

// Fenster schließen
ipcMain.handle("fenster-schliessen", evt => {
  if (!validSender(evt)) {
    return;
  }
  const w = BrowserWindow.fromWebContents(evt.sender);
  w.close();
});

// Fenster endgültig schließen
ipcMain.handle("fenster-schliessen-endgueltig", evt => {
  if (!validSender(evt)) {
    return;
  }
  const w = BrowserWindow.fromWebContents(evt.sender);
  if (!w) {
    // Fenster wurde schon geschlossen
    // (kann bei App > Beenden irgendwie passieren)
    return;
  }
  dd.win[w.id].exit = true;
  w.close();
});

// Fenster-Dimensionen in den Einstellungen speichern
ipcMain.handle("fenster-status", (evt, winId, fenster) => {
  if (!validSender(evt)) {
    return false;
  }

  const bw = BrowserWindow.fromId(winId);
  if (!bw) {
    // werden CLI-Kommandos ausgeführt, kann der ganze Prozess
    // zu diesem Zeitpunkt schon wieder beendet sein => kein BrowserWindow
    return false;
  }
  const bounds = bw.getBounds();
  const opt = optionen.data[fenster];

  // Status in den Optionen speichern
  opt.x = bounds.x;
  opt.y = bounds.y;
  opt.width = bounds.width;
  opt.height = bounds.height;
  opt.maximiert = bw.isMaximized();

  // Status an alle Hauptfenster melden
  const status = {
    x: opt.x,
    y: opt.y,
    width: opt.width,
    height: opt.height,
    maximiert: opt.maximiert,
  };
  for (const [ w, v ] of Object.entries(dd.win)) {
    if (v.typ !== "index" || parseInt(w, 10) === winId) {
      continue;
    }
    const bw = BrowserWindow.fromId(parseInt(w, 10));
    bw.webContents.send("optionen-fenster", fenster, status);
  }
  return status;
});

// Bedeutungsgerüst-Fenster öffnen
ipcMain.handle("bedeutungen-oeffnen", (evt, title) => {
  if (!validSender(evt)) {
    return 0;
  }
  return fenster.erstellenNeben({
    typ: "bedeutungen",
    winTitle: title,
    caller: evt.sender,
  });
});

// Bedeutungsgerüst-Fenster schliessen
ipcMain.handle("bedeutungen-schliessen", (evt, contentsId) => {
  if (!validSender(evt)) {
    return;
  }
  const wc = webContents.fromId(contentsId);
  const bw = BrowserWindow.fromWebContents(wc);
  bw.close();
});

// Bedeutungsgerüst-Fenster fokussieren
ipcMain.handle("bedeutungen-fokussieren", (evt, contentsId) => {
  if (!validSender(evt)) {
    return;
  }
  const wc = webContents.fromId(contentsId);
  const bw = BrowserWindow.fromWebContents(wc);
  fenster.fokus(bw);
});

// XML-Fenster öffnen
ipcMain.handle("red-xml-oeffnen", (evt, title) => {
  if (!validSender(evt)) {
    return 0;
  }
  return fenster.erstellenNeben({
    typ: "xml",
    winTitle: title,
    caller: evt.sender,
  });
});

// XML-Fenster schliessen
ipcMain.handle("red-xml-schliessen", (evt, contentsId) => {
  if (!validSender(evt)) {
    return;
  }
  const wc = webContents.fromId(contentsId);
  const bw = BrowserWindow.fromWebContents(wc);
  bw.close();
});

// XML-Fenster fokussieren
ipcMain.handle("red-xml-fokussieren", (evt, contentsId) => {
  if (!validSender(evt)) {
    return;
  }
  const wc = webContents.fromId(contentsId);
  const bw = BrowserWindow.fromWebContents(wc);
  fenster.fokus(bw);
});

// neue Kartei zu einem neuen Wort anlegen
ipcMain.handle("neues-wort", evt => {
  if (!validSender(evt)) {
    return;
  }

  // Bestehendes Fenster nutzen?
  for (const [ id, val ] of Object.entries(dd.win)) {
    if (val.typ === "index" && !val.kartei) {
      const w = BrowserWindow.fromId(parseInt(id, 10));
      fenster.fokus(w);
      w.webContents.send("kartei-erstellen");
      return;
    }
  }

  // neues Fenster öffnen
  fenster.erstellen("", true);
});

// überprüft, ob die übergebene Kartei schon offen ist
ipcMain.handle("kartei-schon-offen", (evt, kartei) => {
  if (!validSender(evt)) {
    return true;
  }
  for (const [ id, val ] of Object.entries(dd.win)) {
    if (val.kartei === kartei) {
      fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
      return true;
    }
  }
  return false;
});

// die übergebene Kartei laden (in einem neuen oder bestehenden Hauptfenster)
ipcMain.handle("kartei-laden", (evt, kartei, in_leerem_fenster = true) => {
  if (!validSender(evt)) {
    return;
  }
  if (in_leerem_fenster) {
    for (const [ id, val ] of Object.entries(dd.win)) {
      if (val.typ === "index" && !val.kartei) {
        const w = BrowserWindow.fromId(parseInt(id, 10));
        w.webContents.send("kartei-oeffnen", kartei);
        fenster.fokus(w);
        return;
      }
    }
  }
  fenster.erstellen(kartei);
});

// registriert im Fenster-Objekt, welche Kartei geöffnet wurde
ipcMain.handle("kartei-geoeffnet", (evt, id, kartei) => {
  if (!validSender(evt)) {
    return;
  }
  dd.win[id].kartei = kartei;
});

// deregistriert im Fenster-Objekt die Kartei, die geöffnet war
ipcMain.handle("kartei-geschlossen", (evt, id) => {
  if (!validSender(evt)) {
    return;
  }
  dd.win[id].kartei = "";
});

// neues, leeres Hauptfenster öffnen
ipcMain.handle("fenster-oeffnen", evt => {
  if (!validSender(evt)) {
    return;
  }
  fenster.erstellen("");
});

// feststellen, ob ein weiteres Hauptfenster offen ist
ipcMain.handle("fenster-hauptfenster", (evt, idFrage) => {
  if (!validSender(evt)) {
    return false;
  }
  for (const [ id, val ] of Object.entries(dd.win)) {
    if (parseInt(id, 10) === idFrage) {
      continue;
    }
    if (val.typ === "index") {
      return true;
    }
  }
  return false;
});

// Daten an das Fenster mit der übergebenen Web-Content-ID schicken
ipcMain.handle("webcontents-bridge", (evt, data) => {
  if (!validSender(evt)) {
    return;
  }
  const contents = webContents.fromId(data.id);
  contents.send(data.channel, data.data);
});

// ***** UPDATES ******
ipcMain.handle("updates-save-data", (evt, notes) => {
  if (!validSender(evt)) {
    return;
  }
  dd.updates.gesucht = true;
  dd.updates.notes = notes;
});

ipcMain.handle("updates-get-data", evt => {
  if (!validSender(evt)) {
    return {};
  }
  return dd.updates;
});


// ***** KOPIEREN *****
// Basisdaten zu den möglichten Belegquellen ermitteln und an das anfragende Fenster schicken
ipcMain.handle("kopieren-basisdaten", (evt, winId) => {
  if (!validSender(evt)) {
    return;
  }

  // Daten zurücksetzen
  dd.kopieren.basisdaten = {
    win: winId,
    daten: {},
  };

  // Daten aus den Fenstern holen
  for (const id of Object.keys(dd.win)) {
    const idInt = parseInt(id, 10);
    if (idInt === winId) {
      continue;
    }
    const w = BrowserWindow.fromId(idInt);
    w.webContents.send("kopieren-basisdaten");
  }

  // Daten an das anfragende Fenster schicken
  // (auch hier, damit es selbst dann eine Antwort bekommt,
  // wenn keine weiteren Fenster offen sind)
  dd.kopieren.timeout = setTimeout(() => {
    const w = BrowserWindow.fromId(dd.kopieren.basisdaten.win);
    w.webContents.send("kopieren-basisdaten-empfangen", dd.kopieren.basisdaten.daten);
  }, 25);
});

// angefragte Basisdaten registrieren und an das anfragende Fenster schicken
ipcMain.handle("kopieren-basisdaten-lieferung", (evt, daten) => {
  if (!validSender(evt)) {
    return;
  }

  // keine Daten
  if (!daten.belege) {
    return;
  }

  // Daten registrieren
  dd.kopieren.basisdaten.daten[daten.id] = {};
  dd.kopieren.basisdaten.daten[daten.id].belege = daten.belege;
  dd.kopieren.basisdaten.daten[daten.id].gerueste = [ ...daten.gerueste ];
  dd.kopieren.basisdaten.daten[daten.id].wort = daten.wort;

  // Daten an das anfragende Fenster schicken
  // (damit nicht mehrere Meldungen gesendet werden => Timeout)
  clearTimeout(dd.kopieren.timeout);
  dd.kopieren.timeout = setTimeout(() => {
    const w = BrowserWindow.fromId(dd.kopieren.basisdaten.win);
    w.webContents.send("kopieren-basisdaten-empfangen", dd.kopieren.basisdaten.daten);
  }, 25);
});

// Daten der gewünschten Belegquelle anfragen
ipcMain.handle("kopieren-daten", (evt, winIdQuelle, winIdAnfrage) => {
  if (!validSender(evt)) {
    return;
  }

  // Existiert das Fenster, aus dem die Daten kommen sollen, noch?
  if (!dd.win[winIdQuelle]) {
    const w = BrowserWindow.fromId(winIdAnfrage);
    w.webContents.send("dialog-anzeigen", "Beim Kopieren der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDas Fenster, das die Belege liefern sollte, existiert nicht mehr.");
    return;
  }

  // Fenster existiert => Daten anfragen
  dd.kopieren.winIdAnfrage = winIdAnfrage;
  const w = BrowserWindow.fromId(winIdQuelle);
  w.webContents.send("kopieren-daten");
});

// angefragte Daten der gewünschten Belegquelle an das anfragende Fenster schicken
ipcMain.handle("kopieren-daten-lieferung", (evt, daten) => {
  if (!validSender(evt)) {
    return;
  }

  const w = BrowserWindow.fromId(dd.kopieren.winIdAnfrage);
  w.webContents.send("kopieren-daten-empfangen", daten);
});


// ***** ZTJ-CACHE ******
ipcMain.handle("ztj-cache-save", (evt, kartei) => {
  if (!validSender(evt)) {
    return;
  }
  dd.ztjCache[kartei.pfad] = {
    ctime: kartei.ctime,
    data: kartei.data,
  };
});

ipcMain.handle("ztj-cache-get", evt => {
  if (!validSender(evt)) {
    return {};
  }
  return dd.ztjCache;
});

ipcMain.handle("ztj-cache-status-set", (evt, status) => {
  if (!validSender(evt)) {
    return;
  }
  dd.ztjCacheStatus = status;
});

ipcMain.handle("ztj-cache-status-get", evt => {
  if (!validSender(evt)) {
    return true;
  }
  return dd.ztjCacheStatus;
});


// ***** DOWNLOAD-CACHE *****
//   id = string
//   text = string
const downloads = [];

ipcMain.handle("downloads-cache-save", (evt, data) => {
  if (!validSender(evt)) {
    return;
  }
  if (downloads.length > 40) {
    downloads.pop();
  }
  downloads.unshift(data);
});

ipcMain.handle("downloads-cache-get", (evt, id) => {
  if (!validSender(evt)) {
    return false;
  }
  const idx = downloads.findIndex(i => i.id === id);
  if (idx === -1) {
    return false;
  }
  const data = { ...downloads[idx] };
  if (idx > 0) {
    downloads.unshift(data);
    downloads.splice(idx + 1, 1);
  }
  return data;
});


// ***** CLI *****
ipcMain.handle("cli-message", (evt, message) => {
  if (!validSender(evt)) {
    return;
  }
  console.log(message);
});

ipcMain.handle("cli-return-code", (evt, returnCode) => {
  if (!validSender(evt)) {
    return;
  }
  cliReturnCode = returnCode;
});


// ***** QUODLIBETICA *****
// Clipboard
ipcMain.handle("cb", (evt, fun, data) => {
  if (!validSender(evt)) {
    return null;
  }
  if (data) {
    return clipboard[fun](data);
  }
  return clipboard[fun]();
});

// Dateidialoge öffnen
ipcMain.handle("datei-dialog", async (evt, args) => {
  if (!validSender(evt)) {
    return null;
  }
  const result = await dienste.dateiDialog(args);
  return result;
});

// Ordner einlesen
ipcMain.handle("dir-read", async (evt, dir) => {
  if (!validSender(evt)) {
    return [];
  }
  try {
    const files = await fs.readdir(dir);
    return files;
  } catch (err) {
    return err;
  }
});

// Paste im webContents triggern
ipcMain.handle("exec-paste", evt => {
  if (!validSender(evt)) {
    return;
  }
  evt.sender.paste();
});

// Datei kopieren
ipcMain.handle("file-copy", async (evt, data) => {
  if (!validSender(evt)) {
    return {
      name: "Illegal Usage",
      message: "invalid sender process",
    };
  }
  try {
    await fs.copyFile(data.src, data.dest);
    return true;
  } catch (err) {
    return err;
  }
});

// Existenz von Datei überprüfen
ipcMain.handle("file-exists", async (evt, pfad) => {
  if (!validSender(evt)) {
    return false;
  }
  return await dienste.exists(pfad);
});

// Datei-Infos zurückgeben
ipcMain.handle("file-info", async (evt, file) => {
  if (!validSender(evt)) {
    return null;
  }

  const info = {
    ctime: "",
    exists: false,
    isDirectory: false,
    mtime: "",
  };

  try {
    const stats = await fs.lstat(file);
    info.ctime = stats.ctime.toISOString();
    info.exists = true;
    info.isDirectory = stats.isDirectory();
    info.mtime = stats.mtime.toISOString();
  } catch {}

  return info;
});

// Datei einlesen
ipcMain.handle("file-read", async (evt, data) => {
  if (!validSender(evt)) {
    return {
      name: "Illegal Usage",
      message: "invalid sender process",
    };
  }
  try {
    const cont = await fs.readFile(data.path, {
      encoding: data.enc || "utf8",
    });
    return cont;
  } catch (err) {
    return err;
  }
});

// Datei löschen
ipcMain.handle("file-unlink", async (evt, file) => {
  if (!validSender(evt)) {
    return {
      name: "Illegal Usage",
      message: "invalid sender process",
    };
  }
  try {
    await fs.unlink(file);
    return true;
  } catch (err) {
    return err;
  }
});

// Datei schreiben
ipcMain.handle("file-write", async (evt, path, cont) => {
  if (!validSender(evt)) {
    return {
      name: "Illegal Usage",
      message: "invalid sender process",
    };
  }
  try {
    await fs.writeFile(path, cont);
    return true;
  } catch (err) {
    return err;
  }
});

// Dateiliste des übergebenen Ordners
ipcMain.handle("get-file-list", async (evt, dir) => {
  if (!validSender(evt)) {
    return [];
  }
  const files = [];
  const ff = await fs.readdir(dir);
  for (const f of ff) {
    const p = path.join(dir, f);
    const stats = await fs.lstat(p);
    if (!stats.isDirectory()) {
      files.push(f);
    }
  }
  return files;
});

// Liste der XML-Dateien aus einem Ordner auslesen
ipcMain.handle("get-xml-file-list", async (evt, dir) => {
  if (!validSender(evt)) {
    return [];
  }
  try {
    const xml = [];
    const files = await fs.readdir(dir, {
      withFileTypes: true,
    });
    for (const dirent of files) {
      if (dirent.isFile() && /\.xml$/.test(dirent.name)) {
        xml.push(path.join(dir, dirent.name));
      }
    }
    return xml;
  } catch (err) {
    return err;
  }
});

// Initialisierung abgeschlossen
//   key = string (initDone | optInitDone)
ipcMain.handle("init-done", (evt, key) => {
  if (!validSender(evt)) {
    return;
  }
  const { id } = evt.sender;
  for (const v of Object.values(dd.win)) {
    if (v.contentsId === id) {
      v[key] = true;
      break;
    }
  }
});

// Dateien schreiben und lesen
ipcMain.handle("io", async (evt, data) => {
  if (!validSender(evt)) {
    return {
      name: "Illegal Usage",
      message: "invalid sender process",
    };
  }
  if (data.action === "read") {
    return await io.read(data.path);
  }
  return await io.write(data.path, data.data);
});

// Internetadresse öffnen
ipcMain.handle("open-external", (evt, url) => {
  if (!validSender(evt)) {
    return;
  }
  shell.openExternal(url);
});

// Dateibrowser öffnen
ipcMain.handle("open-folder", (evt, pfad) => {
  if (!validSender(evt)) {
    return;
  }
  shell.showItemInFolder(pfad);
});

// Datei öffnen
ipcMain.handle("open-path", async (evt, pfad) => {
  if (!validSender(evt)) {
    return "invalid sender process";
  }
  // weird Electron BUG (Electron 38.2.0, 2025-09-30):
  // openPath() will not execute if console.log() is not called prior to the method;
  // "void path" and different approaches (e.g. no await) did not work;
  // furthermore, the promise is never fullfilled
  console.log(pfad);
  return await shell.openPath(pfad);
});

// Ordnernamen des Pfades zurückgeben
ipcMain.handle("path-dirname", (evt, pfad) => {
  if (!validSender(evt)) {
    return "";
  }
  return path.dirname(pfad);
});

// Pfad lesbar?
ipcMain.handle("path-readable", async (evt, pfad) => {
  if (!validSender(evt)) {
    return false;
  }
  try {
    await fs.access(pfad, fs.constants.R_OK);
    return true;
  } catch (err) {
    return err;
  }
});

// Infos zum Pfad ermitteln
ipcMain.handle("path-info", async (evt, data) => {
  if (!validSender(evt)) {
    return {};
  }
  let absolute = data.file;
  if (!path.isAbsolute(absolute)) {
    absolute = path.join(path.parse(data.box).dir, data.file);
  }
  const info = path.parse(absolute);
  info.absolutePath = absolute;
  info.exists = await dienste.exists(absolute);
  return info;
});

// Pfad zusammenfügen
ipcMain.handle("path-join", (evt, arr) => {
  if (!validSender(evt)) {
    return "";
  }
  return path.join(...arr);
});

// Pfad normalisieren
ipcMain.handle("path-normalize", (evt, pfad) => {
  if (!validSender(evt)) {
    return "";
  }
  return path.normalize(pfad);
});

// Befehle in den Menüpunkten "Bearbeiten" und "Ansicht" ausführen
ipcMain.handle("quick-roles", (evt, befehl) => {
  if (!validSender(evt)) {
    return;
  }
  dienste.quickRoles(evt.sender, befehl);
});

// Lockdatei unter Window verstecken
ipcMain.handle("win32-hide-file", (evt, lockfile) => {
  if (!validSender(evt)) {
    return;
  }
  childProcess.spawn("cmd.exe", [ "/c", "attrib", "+h", lockfile ]);
});
