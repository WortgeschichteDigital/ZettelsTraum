
import {
  app,
  BrowserWindow,
  nativeImage,
  screen,
} from "electron";
import path from "node:path";

import appMenu from "./appMenu.mjs";
import dd from "./dd.mjs";
import optionen from "./optionen.mjs";

export { fenster as default };

const __dirname = import.meta.dirname;

const fenster = {
  // Hauptfenster erstellen
  //   kartei = String
  //     (Pfad zur Kartei, die geöffnet werden soll)
  //   neuesWort = true | undefined
  //     (im Fenster soll ein neues Wort erstellt werden)
  //   cli = object | undefined
  //     (ggf. verstecktes Fenster öffnen, in dem CLI-Befehle ausgeführt werden)
  erstellen (kartei, neuesWort = false, cli = null) {
    // Position und Größe des Fensters ermitteln
    let Bildschirm;
    try {
      Bildschirm = screen.getPrimaryDisplay();
    } catch {}
    const workAreaW = Bildschirm?.workArea?.width || 1024;
    const workAreaH = Bildschirm?.workArea?.height || 768;
    let x = optionen.data.fenster ? optionen.data.fenster.x : null;
    let y = optionen.data.fenster ? optionen.data.fenster.y : null;
    const width = optionen.data.fenster ? optionen.data.fenster.width : 1100;
    const height = optionen.data.fenster ? optionen.data.fenster.height : workAreaH;

    // Position des Fensters anpassen, falls das gerade fokussierte Fenster ein Hauptfenster ist
    if (!cli) {
      const w = BrowserWindow.getFocusedWindow();
      if (w && dd.win[w.id].typ === "index") {
        const wBounds = w.getBounds();
        // Verschieben in der Horizontalen
        if (wBounds.x + width + 100 <= workAreaW) {
          x = wBounds.x + 100;
        } else if (wBounds.x - 100 >= 0) {
          x = wBounds.x - 100;
        }
        // Verschieben in der Vertikalen
        if (wBounds.y + height + 100 <= workAreaH) {
          y = wBounds.y + 100;
        } else if (wBounds.y - 100 >= 0) {
          y = wBounds.y - 100;
        }
      }
    }

    // Fenster öffnen
    // (die Optionen können noch fehlen)
    const bw = new BrowserWindow({
      title: app.name,
      icon: fenster.icon(),
      backgroundColor: "#386ea6",
      x,
      y,
      width,
      height,
      minWidth: 600,
      minHeight: 350,
      autoHideMenuBar: optionen.data.einstellungen ? optionen.data.einstellungen.autoHideMenuBar : false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        defaultEncoding: "UTF-8",
        devTools: dd.devtools,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.cjs"),
        sandbox: true,
        spellcheck: false,
      },
    });

    // Browserfenster anzeigen
    if (!cli) {
      bw.once("ready-to-show", function () {
        this.show();
      });
    }

    // ggf. maximieren
    // (die Option kann noch fehlen)
    if (!cli &&
        optionen.data.fenster &&
        optionen.data.fenster.maximiert) {
      bw.maximize();
    }

    // Windows/Linux: Menüs, die nur bei offenen Karteikarten funktionieren, deaktivieren; Menüleiste an das neue Fenster hängen
    // macOS: beim Fokussieren des Fensters Standardmenü erzeugen
    if (!cli) {
      if (process.platform !== "darwin") {
        appMenu.deaktivieren(true, bw.id);
      } else if (process.platform === "darwin") {
        bw.on("focus", () => appMenu.erzeugenMac());
      }
    }

    // HTML laden
    bw.loadFile(path.join(__dirname, "..", "..", "index.html"));

    // Fenster fokussieren
    // (mitunter ist das Fenster sonst nicht im Vordergrund)
    if (!cli) {
      fenster.fokus(bw);
    }

    // Fenster-Objekt anlegen
    // (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
    bw.webContents.on("dom-ready", function () {
      fenster.objekt(bw.id, this.id, "index");
    });

    // Initialisierungsmarker zurücksetzen (für Entwickler)
    bw.webContents.on("did-start-loading", function () {
      const { id } = this;
      for (const v of Object.values(dd.win)) {
        if (v.contentsId === id) {
          v.initDone = false;
          v.optInitDone = false;
          break;
        }
      }
    });

    // ggf. übergebene Kartei öffnen
    bw.webContents.on("did-finish-load", async function () {
      // Fensterobjekt ermitteln
      const { id } = this;
      let winObj;
      for (const v of Object.values(dd.win)) {
        if (v.contentsId === id) {
          winObj = v;
          break;
        }
      }

      // auf Abschluss der Initialisierung warten
      let sec = 0;
      while (!winObj.initDone) {
        await new Promise(resolve => setTimeout(() => resolve(true), 10));
        sec++;
        if (sec > 500) {
          return;
        }
      }

      // Optionen-Daten an Renderer schicken
      this.send("optionen-init", optionen.data);

      // auf Abschluss der Optionen-Initialisierung warten
      let secOpt = 0;
      while (!winObj.optInitDone) {
        await new Promise(resolve => setTimeout(() => resolve(true), 10));
        secOpt++;
        if (secOpt > 500) {
          return;
        }
      }

      // War die Kartei verschwunden?
      if (appMenu.zuletztVerschwunden.length) {
        this.send("optionen-zuletzt-verschwunden", appMenu.zuletztVerschwunden);
      }

      // Was soll getan werden?
      //   - leeres Fenster öffnen und neues Wort erstellen?
      //   - übergebene Kartei öffnen?
      //   - CLI-Kommando ausführen?
      if (neuesWort) {
        // 500ms warten, damit der Ladebildschirm Zeit hat zu verschwinden
        setTimeout(() => {
          if (!this.isDestroyed()) {
            this.send("kartei-erstellen");
          }
        }, 500);
      } else if (kartei) {
        this.send("kartei-oeffnen", kartei);
      } else if (cli) {
        this.send("cli-command", cli);
      }
    });

    // Aktionen vor dem Schließen des Fensters
    bw.on("close", function (evt) {
      // beforeUnload() im Fenster ausführen
      if (!dd.win[this.id].exit) {
        evt.preventDefault();
        this.webContents.send("before-unload");
        return;
      }

      // Fenster dereferenzieren
      delete dd.win[this.id];

      // Sind noch Hauptfenster vorhanden?
      let hauptfensterOffen = false;
      for (const val of Object.values(dd.win)) {
        if (val.typ === "index") {
          hauptfensterOffen = true;
          break;
        }
      }

      // App ggf. komplett beenden
      if (!hauptfensterOffen) {
        appMenu.befehl("app-beenden");
      }
    });

    // ID des Fensters zurückgeben (wird mitunter direkt benötigt)
    return bw.id;
  },

  // Neben-Fenster erstellen
  //   typ = String
  //     (der Typ des Neben-Fensters:
  //     "bedeutungen" | "changelog" | "dokumentation" | "fehlerlog" | "handbuch" | "xml")
  //   abschnitt = String | undefined
  //     (Abschnitt, der im Fenster geöffnet werden soll; nur "handbuch" und "dokumentation")
  //   winTitle = String | undefined
  //     (Fenster-Titel für Bedeutungsgerüst- und XML-Fenster)
  //   caller = Object | undefined
  //     (ggf. Fensterobjekt, das als Caller fungiert)
  erstellenNeben ({
    typ,
    abschnitt = "",
    winTitle = "",
    caller = null,
  }) {
    // ist das Fenster bereits offen? => Fenster fokussieren
    // (bei Bedeutungsgerüst- und XML-Fenstern wissen die Hauptfenster,
    // ob sie auf sind)
    if (!/^(bedeutungen|xml)$/.test(typ)) {
      for (const [ id, val ] of Object.entries(dd.win)) {
        if (val.typ === typ) {
          const w = BrowserWindow.fromId(parseInt(id, 10));
          fenster.fokus(w);
          if (abschnitt) {
            w.webContents.send("oeffne-abschnitt", abschnitt);
          }
          return "";
        }
      }
    }

    // Titel und Dimensionen des Fensters ermitteln
    let title = "";
    const Bildschirm = screen.getPrimaryDisplay();
    const bounds = {
      width: 900,
      height: Bildschirm.workArea.height,
      minWidth: 700,
      minHeight: 350,
    };
    if (typ === "changelog" || typ === "fehlerlog") {
      title = typ.substring(0, 1).toUpperCase() + typ.substring(1);
      bounds.width = 625;
      bounds.height = 625;
      bounds.minWidth = 400;
      bounds.minHeight = 400;
    } else if (typ === "dokumentation") {
      title = "Technische Dokumentation";
      if (bounds.height > 825) {
        bounds.height = 825;
      }
    } else if (typ === "handbuch") {
      title = "Handbuch";
      if (bounds.height > 825) {
        bounds.height = 825;
      }
    }
    const opt = {
      title,
      icon: fenster.icon(),
      backgroundColor: "#386ea6",
      width: bounds.width,
      height: bounds.height,
      minWidth: bounds.minWidth,
      minHeight: bounds.minHeight,
      show: false,
      webPreferences: {
        contextIsolation: true,
        defaultEncoding: "UTF-8",
        devTools: dd.devtools,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.cjs"),
        sandbox: true,
        spellcheck: false,
      },
    };
    if (typ === "bedeutungen") {
      opt.title = winTitle;
      opt.x = optionen.data["fenster-bedeutungen"].x;
      opt.y = optionen.data["fenster-bedeutungen"].y;
      opt.width = optionen.data["fenster-bedeutungen"].width;
      opt.height = optionen.data["fenster-bedeutungen"].height;
      opt.minWidth = 400;
      opt.minHeight = 400;
    } else if (typ === "xml") {
      opt.title = winTitle;
      opt.width = Math.round(Bildschirm.workArea.width / 2);
      opt.minWidth = 800;
      opt.minHeight = 600;
    }

    // ggf. die Position des Fensters festlegen; sonst wird es zentriert
    // (damit Handbuch und Dokumentation nicht übereinanderliegen,
    // wenn sie auseinander geöffnet werden)
    if (typ === "dokumentation" || typ === "handbuch") {
      const w = BrowserWindow.getFocusedWindow();
      let x = -1;
      let y = -1;
      if (w && /dokumentation|handbuch/.test(dd.win[w.id].typ)) {
        const wBounds = w.getBounds();
        // Verschieben in der Horizontalen
        if (wBounds.x + bounds.width + 100 <= Bildschirm.workArea.width) {
          x = wBounds.x + 100;
        } else if (wBounds.x - 100 >= 0) {
          x = wBounds.x - 100;
        }
        // Verschieben in der Vertikalen
        if (wBounds.y + bounds.height + 100 <= Bildschirm.workArea.height) {
          y = wBounds.y + 100;
        } else if (wBounds.y - 100 >= 0) {
          y = wBounds.y - 100;
        }
      }
      if (x >= 0 || y >= 0) {
        x = x === -1 ? 0 : x;
        y = y === -1 ? 0 : y;
        opt.x = x;
        opt.y = y;
      }
    }

    // Fenster öffnen
    const bw = new BrowserWindow(opt);

    // Browserfenster anzeigen
    bw.once("ready-to-show", function () {
      this.show();
    });

    // ggf. maximieren
    if (typ === "bedeutungen" &&
        optionen.data["fenster-bedeutungen"].maximiert) {
      bw.maximize();
    }

    // Windows/Linux: verstecktes Ansicht-Menü erzeugen
    // macOS: angepasstes Ansicht-Menü erzeugen
    if (process.platform !== "darwin") {
      appMenu.erzeugenAnsicht(bw);
      bw.on("leave-full-screen", function () {
        // nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
        // (ohne Timeout geht es nicht)
        setTimeout(() => {
          if (!this.id) {
            // Die Funktion wird merkwürdigerweise auch aufgerufen, wenn das Fenster geschlossen wird;
            // zu diesem Zeitpunkt könnte das Fenster-Objekt aber schon zerstört sein, was ich daran
            // erkenne, dass es keine ID mehr gibt.
            return;
          }
          this.setMenuBarVisibility(false);
        }, 0);
      });
    } else if (process.platform === "darwin") {
      bw.on("focus", () => appMenu.erzeugenMac("ansicht"));
    }

    // HTML laden
    bw.loadFile(path.join(__dirname, "..", "..", "win", `${typ}.html`));

    // Fenster fokussieren
    // (mitunter ist das Fenster sonst nicht im Vordergrund)
    fenster.fokus(bw);

    // Fenster-Objekt anlegen
    // (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
    bw.webContents.on("dom-ready", function () {
      fenster.objekt(bw.id, this.id, typ);
    });

    // Seite ist fertig geladen
    bw.webContents.once("did-finish-load", async function () {
      // auf Abschluss der Initialisierung warten
      const { id } = this;
      let winObj;
      for (const v of Object.values(dd.win)) {
        if (v.contentsId === id) {
          winObj = v;
          break;
        }
      }
      let sec = 0;
      while (!winObj.initDone) {
        await new Promise(resolve => setTimeout(() => resolve(true), 10));
        sec++;
        if (sec > 500) {
          return;
        }
      }

      // ggf. helle Elemente dunkler darstellen
      if (optionen.data.einstellungen["helle-dunkler"]) {
        this.send("helle-dunkler");
      }
      // ggf. Abschnitt öffnen
      if (abschnitt) {
        this.send("oeffne-abschnitt", abschnitt);
      }
      // ggf. Daten an das Bedeutungsgerüst schicken
      if (typ === "bedeutungen" && caller) {
        caller.send("bedeutungen-fenster-daten");
      } else if (typ === "xml" && caller) {
        caller.send("red-xml-daten");
      }
    });

    // Aktionen vor dem Schließen des Fensters
    bw.on("close", function (evt) {
      // beforeUnload() im Fenster ausführen
      if (!dd.win[this.id].exit) {
        evt.preventDefault();
        this.webContents.send("before-unload");
        return;
      }
      // Fenster dereferenzieren
      delete dd.win[this.id];
    });

    // ID des Web-Content zurückgeben
    return bw.webContents.id;
  },

  // Über-Fenster erstellen
  //   typ = String
  //     (der Typ des Über-Fensters: "app" | "electron")
  erstellenUeber (typ) {
    // Titel Name der Seite ermitteln
    let title;
    let html;
    if (typ === "app") {
      title = `Über ${app.name}`;
      html = "ueberApp";
    } else {
      title = "Über Electron";
      html = "ueberElectron";
    }

    // festlegen, wie die Höhe der Über-Fenster berechnet werden soll
    // (Linux agiert hier offenbar anders als Windows und macOS)
    let contentSize = false;
    if (/darwin|win32/.test(process.platform)) {
      contentSize = true;
    }

    // Fenster öffnen
    const bw = new BrowserWindow({
      parent: BrowserWindow.getFocusedWindow(),
      modal: true,
      title,
      icon: fenster.icon(),
      backgroundColor: "#386ea6",
      width: 650,
      height: 358,
      useContentSize: contentSize,
      center: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      show: false,
      webPreferences: {
        contextIsolation: true,
        defaultEncoding: "UTF-8",
        devTools: dd.devtools,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.cjs"),
        sandbox: true,
        spellcheck: false,
      },
    });

    // Browserfenster anzeigen
    bw.once("ready-to-show", function () {
      this.show();
    });

    // Windows/Linux: Menü nur erzeugen, wenn Dev-Tools zugänglich sein sollen; sonst haben die Fenster kein Menü
    // macOS: minimales Menü mit nur einem Punkt erzeugen
    if (process.platform !== "darwin" && dd.devtools) {
      appMenu.erzeugenAnsicht(bw);
    } else if (process.platform === "darwin") {
      bw.on("focus", () => appMenu.erzeugenMac("mac"));
    }

    // HTML laden
    bw.loadFile(path.join(__dirname, "..", "..", "win", `${html}.html`));

    // Fenster-Objekt anlegen
    // (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
    bw.webContents.on("dom-ready", function () {
      fenster.objekt(bw.id, this.id, typ);
    });

    // Aktionen vor dem Schließen des Fensters
    bw.on("close", function (evt) {
      // beforeUnload() im Fenster ausführen
      if (!dd.win[this.id].exit) {
        evt.preventDefault();
        this.webContents.send("before-unload");
        return;
      }
      // Fenster dereferenzieren
      delete dd.win[this.id];
    });
  },

  // legt ein Fenster-Objekt an
  //   id = Number
  //     (Fenster-ID)
  //   typ = String
  //     (Fenstertyp)
  objekt (id, contentsId, typ) {
    dd.win[id] = {
      contentsId,
      typ,
      kartei: "",
      exit: false,
      initDone: false,
      optInitDone: false,
    };
  },

  // ermittelt das zum Betriebssystem passende Programm-Icon
  icon () {
    if (process.platform === "win32") {
      return nativeImage.createFromPath(path.join(__dirname, "..", "..", "img", "icon", "win", "icon.ico"));
    } else if (process.platform === "darwin") {
      return nativeImage.createFromPath(path.join(__dirname, "..", "..", "img", "icon", "mac", "icon.icns"));
    } else if (process.platform === "linux") {
      return nativeImage.createFromPath(path.join(__dirname, "..", "..", "img", "icon", "linux", "icon_32px.png"));
    }
    return null;
  },

  // schickt eine IPC-Meldung an ein Hauptfenster
  // (löst das Problem, dass nicht immer klar ist, ob ein Hauptfenster den Fokus hat)
  //   befehl = string
  //     (der IPC-Channel)
  //   arg = boolean | string
  //     (Befehlsargument, könnte prinzipiell alles sein, was in JSON linearisiert werden kann)
  befehlAnHauptfenster (befehl, arg = "") {
    const bw = BrowserWindow.getFocusedWindow();
    if (bw && dd.win[bw.id].typ === "index") {
      bw.webContents.send(befehl, arg);
      return;
    }
    for (const [ id, val ] of Object.entries(dd.win)) {
      if (val.typ === "index") {
        const bw = BrowserWindow.fromId(parseInt(id, 10));
        bw.webContents.send(befehl, arg);
        fenster.fokus(bw);
        return;
      }
    }
  },

  // das übergebene Fenster fokussieren
  //   w = Object
  //     (das Fenster-Objekt)
  fokus (w) {
    if (w.isMinimized()) {
      w.restore();
    }
    setTimeout(() => w.focus(), 25); // Timeout, damit das Fenster zuverlässig den Fokus bekommt
  },

  // schließt das aktuelle Fenster
  // (macOS bekommt in Nebenfenstern einen extra Menüpunkt,
  // der nur den Befehl "Fenster schließen" hat)
  schliessen () {
    const w = BrowserWindow.getFocusedWindow();
    if (w) { // nur zur Sicherheit, muss eigentlich immer da sein
      w.close();
    }
  },
};
