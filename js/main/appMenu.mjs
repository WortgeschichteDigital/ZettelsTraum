
import {
  app,
  BrowserWindow,
  Menu,
} from "electron";
import path from "node:path";

import dd from "./dd.mjs";
import dienste from "./dienste.mjs";
import fenster from "./fenster.mjs";
import i18n from "./i18n.mjs";
import optionen from "./optionen.mjs";

export { appMenu as default };

const __dirname = new URL(".", import.meta.url).pathname;

// Menü-Vorlagen
const layoutMenu = [
  {
    label: `&${app.name}`,
    submenu: [
      {
        label: "Neues Fenster",
        icon: path.join(__dirname, "..", "..", "img", "menu", "fenster-plus.png"),
        click: () => fenster.erstellen(""),
        accelerator: "CommandOrControl+Shift+N",
        id: "app-neues-fenster",
      },
      { type: "separator" },
      {
        label: "Karteisuche",
        icon: path.join(__dirname, "..", "..", "img", "menu", "lupe.png"),
        click: () => appMenu.befehl("app-karteisuche"),
        id: "app-karteisuche",
      },
      { type: "separator" },
      {
        label: "Einstellungen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "zahnrad.png"),
        click: () => appMenu.befehl("app-einstellungen"),
        id: "app-einstellungen",
      },
      { type: "separator" },
      {
        label: "Beenden",
        icon: path.join(__dirname, "..", "..", "img", "menu", "ausgang.png"),
        click: () => appMenu.befehl("app-beenden"),
        accelerator: "CommandOrControl+Q",
        id: "app-beenden",
      },
    ],
  },
  {
    label: "&Kartei",
    id: "kartei",
    submenu: [
      {
        label: "Erstellen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "dokument-plus.png"),
        click: () => appMenu.befehl("kartei-erstellen"),
        accelerator: "CommandOrControl+E",
        id: "kartei-erstellen",
      },
      { type: "separator" },
      {
        label: "Öffnen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "oeffnen.png"),
        click: () => appMenu.befehl("kartei-oeffnen", ""),
        accelerator: "CommandOrControl+O",
        id: "kartei-oeffnen",
      },
      {
        label: "Zuletzt verwendet", // Menü wird über appMenu.zuletzt() gefüllt
        id: "kartei-zuletzt",
      },
      { type: "separator" },
      {
        label: "Speichern",
        icon: path.join(__dirname, "..", "..", "img", "menu", "speichern.png"),
        click: () => appMenu.befehl("kartei-speichern"),
        accelerator: "CommandOrControl+S",
        id: "kartei-speichern",
      },
      {
        label: "Speichern unter",
        icon: path.join(__dirname, "..", "..", "img", "menu", "speichern-unter.png"),
        click: () => appMenu.befehl("kartei-speichern-unter"),
        accelerator: "CommandOrControl+Shift+S",
        id: "kartei-speichern-unter",
      },
      { type: "separator" },
      {
        label: "Schließen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "x-dick.png"),
        click: () => appMenu.befehl("kartei-schliessen"),
        accelerator: "CommandOrControl+W",
        id: "kartei-schliessen",
      },
      { type: "separator" },
      {
        label: "Lemmata",
        icon: path.join(__dirname, "..", "..", "img", "menu", "lemmata.png"),
        click: () => appMenu.befehl("kartei-lemmata"),
        id: "kartei-lemmata",
      },
      {
        label: "Formvarianten",
        icon: path.join(__dirname, "..", "..", "img", "menu", "formvarianten.png"),
        click: () => appMenu.befehl("kartei-formvarianten"),
        id: "kartei-formvarianten",
      },
      {
        label: "Notizen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "stift.png"),
        click: () => appMenu.befehl("kartei-notizen"),
        accelerator: "CommandOrControl+Alt+N",
        id: "kartei-notizen",
      },
      {
        label: "Anhänge",
        icon: path.join(__dirname, "..", "..", "img", "menu", "bueroklammer.png"),
        click: () => appMenu.befehl("kartei-anhaenge"),
        id: "kartei-anhaenge",
      },
      {
        label: "Überprüfte Lexika",
        icon: path.join(__dirname, "..", "..", "img", "menu", "buecher.png"),
        click: () => appMenu.befehl("kartei-lexika"),
        id: "kartei-lexika",
      },
      {
        label: "Metadaten",
        icon: path.join(__dirname, "..", "..", "img", "menu", "zeilen-4,0.png"),
        click: () => appMenu.befehl("kartei-metadaten"),
        id: "kartei-metadaten",
      },
      { type: "separator" },
      {
        label: "Bedeutungsgerüst",
        icon: path.join(__dirname, "..", "..", "img", "menu", "geruest.png"),
        click: () => appMenu.befehl("kartei-bedeutungen"),
        accelerator: "CommandOrControl+B",
        id: "kartei-bedeutungen",
      },
      {
        label: "Bedeutungsgerüst wechseln",
        icon: path.join(__dirname, "..", "..", "img", "menu", "geruest-zahnrad.png"),
        click: () => appMenu.befehl("kartei-bedeutungen-wechseln"),
        accelerator: "CommandOrControl+Alt+B",
        id: "kartei-bedeutungen-wechseln",
      },
      {
        label: "Bedeutungsgerüst-Fenster",
        icon: path.join(__dirname, "..", "..", "img", "menu", "fenster.png"),
        click: () => appMenu.befehl("kartei-bedeutungen-fenster"),
        accelerator: "CommandOrControl+Shift+B",
        id: "kartei-bedeutungen-fenster",
      },
      { type: "separator" },
      {
        label: "Suche",
        icon: path.join(__dirname, "..", "..", "img", "menu", "lupe.png"),
        click: () => appMenu.befehl("kartei-suche"),
        accelerator: "CommandOrControl+F",
        id: "kartei-suche",
      },
    ],
  },
  {
    label: "&Belege",
    id: "belege",
    submenu: [
      {
        label: "Hinzufügen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "dokument-plus.png"),
        click: () => appMenu.befehl("belege-hinzufuegen"),
        accelerator: "CommandOrControl+N",
        id: "belege-hinzufuegen",
      },
      {
        label: "Auflisten",
        icon: path.join(__dirname, "..", "..", "img", "menu", "liste-bullets.png"),
        click: () => appMenu.befehl("belege-auflisten"),
        accelerator: "CommandOrControl+L",
        id: "belege-auflisten",
      },
      {
        label: "Taggen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "etikett.png"),
        click: () => appMenu.befehl("belege-taggen"),
        id: "belege-taggen",
      },
      {
        label: "Löschen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "muelleimer.png"),
        click: () => appMenu.befehl("belege-loeschen"),
        id: "belege-loeschen",
      },
      { type: "separator" },
      {
        label: "Kopieren",
        icon: path.join(__dirname, "..", "..", "img", "menu", "kopieren.png"),
        click: () => appMenu.befehl("belege-kopieren"),
        id: "belege-kopieren",
      },
      {
        label: "Einfügen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "einfuegen.png"),
        click: () => appMenu.befehl("belege-einfuegen"),
        id: "belege-einfuegen",
      },
      { type: "separator" },
      {
        label: "Belegtexte in Zwischenablage",
        icon: path.join(__dirname, "..", "..", "img", "menu", "kopieren.png"),
        click: () => appMenu.befehl("belege-zwischenablage"),
        id: "belege-zwischenablage",
      },
      { type: "separator" },
      {
        label: "Buchung überprüfen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "buch-check.png"),
        click: () => appMenu.befehl("belege-buchung"),
        id: "belege-buchung",
      },
    ],
  },
  {
    label: "&Redaktion",
    id: "redaktion",
    submenu: [
      {
        label: "Metadaten",
        icon: path.join(__dirname, "..", "..", "img", "menu", "zeilen-4,0.png"),
        click: () => appMenu.befehl("redaktion-metadaten"),
        id: "redaktion-metadaten",
      },
      {
        label: "Ereignisse",
        icon: path.join(__dirname, "..", "..", "img", "menu", "personen.png"),
        click: () => appMenu.befehl("redaktion-ereignisse"),
        id: "redaktion-ereignisse",
      },
      {
        label: "Literatur",
        icon: path.join(__dirname, "..", "..", "img", "menu", "buecher.png"),
        click: () => appMenu.befehl("redaktion-literatur"),
        id: "redaktion-literatur",
      },
      {
        label: "Wortinformationen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "kreis-info.png"),
        click: () => appMenu.befehl("redaktion-wortinformationen"),
        id: "redaktion-wortinformationen",
      },
      {
        label: "XML-Fenster",
        icon: path.join(__dirname, "..", "..", "img", "menu", "xml.png"),
        click: () => appMenu.befehl("redaktion-xml"),
        id: "redaktion-xml",
      },
      { type: "separator" },
      {
        label: "Belege in XML-Fenster",
        icon: path.join(__dirname, "..", "..", "img", "menu", "xml.png"),
        click: () => appMenu.befehl("redaktion-belege-xml"),
        id: "redaktion-belege-xml",
      },
    ],
  },
  {
    label: "&Hilfe",
    id: "hilfe",
    submenu: [
      {
        label: "Handbuch",
        icon: path.join(__dirname, "..", "..", "img", "menu", "kreis-fragezeichen.png"),
        click: () => fenster.erstellenNeben({ typ: "handbuch" }),
        accelerator: "F1",
        id: "hilfe-handbuch",
      },
      {
        label: "Demonstrationskartei",
        click: () => appMenu.befehl("hilfe-demo"),
        id: "hilfe-demonstrationskartei",
      },
      {
        label: "Technische Dokumentation",
        click: () => fenster.erstellenNeben({ typ: "dokumentation" }),
        id: "hilfe-dokumentation",
      },
      { type: "separator" },
      {
        label: "Changelog",
        click: () => fenster.erstellenNeben({ typ: "changelog" }),
        id: "hilfe-changelog",
      },
      {
        label: "Fehlerlog",
        click: () => fenster.erstellenNeben({ typ: "fehlerlog" }),
        id: "hilfe-fehlerlog",
      },
      { type: "separator" },
      {
        label: "Updates",
        icon: path.join(__dirname, "..", "..", "img", "menu", "pfeil-kreis.png"),
        click: () => appMenu.befehl("hilfe-updates"),
        id: "hilfe-updates",
      },
      { type: "separator" },
      {
        label: `Über ${app.name}`,
        click: () => fenster.erstellenUeber("app"),
        id: "hilfe-ueber-app",
      },
      {
        label: "Über Electron",
        click: () => fenster.erstellenUeber("electron"),
        id: "hilfe-ueber-electron",
      },
    ],
  },
];

const layoutMenuBearbeiten = [
  {
    label: "B&earbeiten",
    id: "bearbeiten",
    submenu: [
      {
        label: "Rückgängig",
        icon: path.join(__dirname, "..", "..", "img", "menu", "pfeil-rund-links.png"),
        role: "undo",
        id: "bearbeiten-rueckgaengig",
      },
      {
        label: "Wiederherstellen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "pfeil-rund-rechts.png"),
        role: "redo",
        id: "bearbeiten-wiederherstellen",
      },
      { type: "separator" },
      {
        label: "Ausschneiden",
        icon: path.join(__dirname, "..", "..", "img", "menu", "schere.png"),
        role: "cut",
        id: "bearbeiten-ausschneiden",
      },
      {
        label: "Kopieren",
        icon: path.join(__dirname, "..", "..", "img", "menu", "kopieren.png"),
        role: "copy",
        id: "bearbeiten-kopieren",
      },
      {
        label: "Einfügen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "einfuegen.png"),
        role: "paste",
        id: "bearbeiten-einfuegen",
      },
      {
        label: "Alles auswählen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "auswaehlen.png"),
        role: "selectAll",
        id: "bearbeiten-auswaehlen",
      },
    ],
  },
];

const layoutMenuAnsicht = [
  {
    label: "&Ansicht",
    id: "ansicht",
    submenu: [
      {
        label: "Anzeige vergrößern",
        icon: path.join(__dirname, "..", "..", "img", "menu", "plus-quadrat.png"),
        role: "zoomIn",
        accelerator: "CommandOrControl+=",
        id: "ansicht-vergroessern",
      },
      {
        label: "Anzeige verkleinern",
        icon: path.join(__dirname, "..", "..", "img", "menu", "minus-quadrat.png"),
        role: "zoomOut",
        id: "ansicht-verkleinern",
      },
      {
        label: "Standardgröße",
        icon: path.join(__dirname, "..", "..", "img", "menu", "fenster-standard.png"),
        role: "resetZoom",
        id: "ansicht-standard",
      },
      { type: "separator" },
      {
        label: "Vollbild",
        icon: path.join(__dirname, "..", "..", "img", "menu", "fenster-vollbild.png"),
        role: "toggleFullScreen",
        id: "ansicht-vollbild",
      },
    ],
  },
];

const layoutMenuMac = [
  {
    label: app.name,
    submenu: [
      {
        label: "Fenster schließen",
        icon: path.join(__dirname, "..", "..", "img", "menu", "fenster-schliessen.png"),
        click: () => fenster.schliessen(),
        accelerator: "CommandOrControl+W",
        id: "fenster-schliessen",
      },
    ],
  },
];

// Bearbeiten + Ansicht im Hauptmenü ergänzen
layoutMenu.splice(layoutMenu.length - 1, 0, layoutMenuBearbeiten[0]);
layoutMenu.splice(layoutMenu.length - 1, 0, layoutMenuAnsicht[0]);

// ggf. Developer-Menü ergänzen
if (dd.devtools) {
  [ layoutMenu, layoutMenuBearbeiten, layoutMenuAnsicht ].forEach(i => {
    i.push({
      label: "&Dev",
      submenu: [
        {
          label: "Neu laden",
          role: "reload",
          id: "dev-reload",
        },
        {
          label: "Neu laden erzwingen",
          role: "forceReload",
          id: "dev-force-reload",
        },
        { type: "separator" },
        {
          label: "Developer-Tools",
          role: "toggleDevTools",
          id: "dev-tools",
        },
      ],
    });
  });
}

// Windows/Linux: standardmäßig kein Menü anzeigen
// (einzig verlässliche Methode, um Über-Fenster ohne Menü zu erzeugen)
if (process.platform !== "darwin") {
  Menu.setApplicationMenu(null);
}

// macOS: Menüvorlagen aufbereiten
if (process.platform === "darwin") {
  // Standardmenüs anpassen
  for (const menu of [ layoutMenu, layoutMenuBearbeiten, layoutMenuAnsicht ]) {
    for (const mp of menu) {
      mp.label = mp.label.replace("&", "");
      const zuletztIdx = mp.submenu.findIndex(i => i.id === "kartei-zuletzt");
      if (zuletztIdx >= 0) {
        mp.submenu.splice(zuletztIdx, 1);
      }
    }
  }
  // Bearbeiten + App im Ansichtmenü ergänzen
  layoutMenuAnsicht.unshift(layoutMenuBearbeiten[0]);
  layoutMenuAnsicht.unshift(layoutMenuMac[0]);
}

const appMenu = {
  // überschreibt das Submenü mit den zuletzt verwendeten Karteien
  zuletzt () {
    // für macOS gibt es ein anderes Menüsystem
    if (process.platform === "darwin") {
      return;
    }

    // Submenü-Vorlage
    const zuletzt = [];

    // Dateiliste ggf. ergänzen
    if (optionen.data.zuletzt) {
      let len = optionen.data.zuletzt.length;
      if (len > 10) {
        // Liste auf 10 Einträge begrenzen
        // (in der Startansicht sind max. 20 Einträge sichtbar)
        len = 10;
      }
      for (let i = 0; i < len; i++) {
        appMenu.zuletztItem(zuletzt, optionen.data.zuletzt[i], i);
      }
    }

    // ggf. Löschmenü hinzufügen
    if (zuletzt.length) {
      let label = "Liste löschen";
      const lang = optionen.data?.einstellungen?.sprache;
      if (lang && lang !== "de") {
        const trans = i18n.trans({
          lang,
          key: "kartei-zuletzt-liste-loeschen",
        });
        if (trans) {
          label = trans;
        }
      }
      zuletzt.push(
        { type: "separator" },
        {
          label,
          click: () => appMenu.zuletztLoeschen(),
        },
      );
    }

    // Position der Karteiliste ermitteln
    const menuKartei = layoutMenu[1].submenu;
    let pos = -1;
    for (let i = 0, len = menuKartei.length; i < len; i++) {
      if (menuKartei[i].id === "kartei-zuletzt") {
        pos = i;
        break;
      }
    }

    // neue Liste einhängen
    layoutMenu[1].submenu[pos].submenu = zuletzt;
  },

  // Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
  //   zuletzt = Object
  //     (submenu im Menüpunkt "Zuletzt verwendet")
  //   datei = String
  //     (Dateipfad)
  //   i = Number
  //     (Index-Punkt, an dem sich die Datei befindet)
  zuletztItem (zuletzt, datei, i) {
    const item = {
      label: path.basename(datei, ".ztj"),
      sublabel: datei,
      click: () => appMenu.befehl("kartei-oeffnen", datei),
    };
    if (i <= 8) {
      item.accelerator = `CommandOrControl+${i + 1}`;
    }
    zuletzt.push(item);
  },

  // überprüft, ob die zuletzt verwendeten Karteien noch vorhanden sind
  async zuletztCheck () {
    for (const i of optionen.data.zuletzt) {
      const exists = await dienste.exists(i);
      if (!exists) {
        appMenu.zuletztVerschwunden.push(i);
      }
    }
    if (appMenu.zuletztVerschwunden.length) {
      appMenu.zuletztVerschwundenInform();
    }
  },

  // speichert Dateipfade von Karteien, die verschwunden sind
  zuletztVerschwunden: [],

  // informiert die Browserfenster über Dateipfade mit Karteien, die nicht gefunden wurden
  zuletztVerschwundenInform () {
    for (const [ id, val ] of Object.entries(dd.win)) {
      if (val.typ !== "index") {
        continue;
      }
      const w = BrowserWindow.fromId(parseInt(id, 10));
      w.webContents.send("optionen-zuletzt-verschwunden", appMenu.zuletztVerschwunden);
    }
  },

  // Menüs in den Hauptfenstern auffrischen
  zuletztUpdate () {
    for (const [ id, val ] of Object.entries(dd.win)) {
      if (val.typ !== "index") {
        continue;
      }
      // Fenster des Renderer-Prozesses ermitteln
      const w = BrowserWindow.fromId(parseInt(id, 10));
      // App-Menü des Renderer-Prozesses auffrischen
      if (process.platform !== "darwin") {
        let disable = false;
        if (!val.kartei) {
          disable = true;
        }
        appMenu.deaktivieren(disable, w.id);
      }
      // Dateiliste an den Renderer-Prozess schicken
      w.webContents.send("optionen-zuletzt", optionen.data.zuletzt);
    }
  },

  // Menü mit zuletzt benutzten Dateien leeren
  zuletztLoeschen () {
    optionen.data.zuletzt = [];
    optionen.schreiben();
    appMenu.zuletzt();
    appMenu.zuletztUpdate();
  },

  // Menü-Elemente deaktivieren, wenn keine Kartei offen ist
  //   disable = Boolean
  //     (Menü-Element deaktiveren oder eben nicht)
  //   id = Number
  //     (die ID des betroffenen Fensters; konnte auch mal 0 sein => kein Fenster betroffen)
  deaktivieren (disable, id) {
    // für macOS gibt es ein anderes Menüsystem
    if (process.platform === "darwin") {
      return;
    }

    // zu deaktivierende Menüpunkte durchgehen
    const elemente = [ "kartei-speichern", "kartei-speichern-unter", "kartei-lemmata", "kartei-formvarianten", "kartei-notizen", "kartei-anhaenge", "kartei-lexika", "kartei-metadaten", "kartei-bedeutungen", "kartei-bedeutungen-wechseln", "kartei-bedeutungen-fenster", "kartei-suche", "kartei-schliessen", "redaktion-metadaten", "redaktion-ereignisse", "redaktion-wortinformationen", "redaktion-xml", "redaktion-belege-xml", "belege" ];
    for (let j = 0, len = layoutMenu.length; j < len; j++) {
      // sollen vielleicht alle Menüpunkte deaktiviert werden?
      let alle = false;
      if (elemente.includes(layoutMenu[j].id)) {
        alle = true;
      }
      // Submenu durchgehen
      const submenu = layoutMenu[j].submenu;
      for (let k = 0, len = submenu.length; k < len; k++) {
        if (alle) {
          toggle(submenu[k]);
        } else if (elemente.includes(submenu[k].id)) {
          toggle(submenu[k]);
        }
      }
    }

    // Programm-Menü erzeugen?
    if (id) {
      appMenu.erzeugen(id);
    }

    // Switch-Funktion, die enabled auf true od. false stellt
    //   item = Object
    //     (ein Menü-Objekt)
    function toggle (item) {
      if (disable) {
        item.enabled = false;
      } else {
        item.enabled = true;
      }
    }
  },

  // erzeugt das normale Programm-Menü
  //   id = Number
  //     (ID des Fensters)
  erzeugen (id) {
    appMenu.uovo();
    const menu = Menu.buildFromTemplate(layoutMenu);
    BrowserWindow.fromId(id).setMenu(menu);
  },

  // erzeugt ein Menü, das nur den Punkt Ansicht hat und versteckt wird
  //   fenster = Object
  //     (das Fenster-Objekt, in dem das Menü erscheinen soll)
  erzeugenAnsicht (fenster) {
    // für macOS gibt es ein anderes Menüsystem
    if (process.platform === "darwin") {
      return;
    }

    // Menü für Windows und Linux erzeugen
    const menu = Menu.buildFromTemplate(layoutMenuAnsicht);
    fenster.setMenu(menu);
    fenster.setMenuBarVisibility(false);
  },

  // erzeugt die Menüleiste in macOS
  //   type = string
  erzeugenMac (type) {
    let vorlage;
    switch (type) {
      case "ansicht":
        vorlage = layoutMenuAnsicht;
        break;
      case "mac":
        vorlage = layoutMenuMac;
        break;
      default:
        vorlage = layoutMenu;
        break;
    }
    appMenu.uovo();
    const menu = Menu.buildFromTemplate(vorlage);
    Menu.setApplicationMenu(menu);
  },

  // führt den aufgerufenen Befehl im aktuellen Fenster aus
  //   befehl = String
  //     (die Aktion)
  //   parameter = String | Array | undefined
  //     (einige Befehle bekommen einen Wert übergeben; im Falle der zuletzt geöffneten
  //     Dateien kann es auch ein Array sein)
  befehl (befehl, parameter) {
    const w = BrowserWindow.getFocusedWindow();
    if (befehl === "app-beenden") {
      for (const [ id, val ] of Object.entries(dd.win)) {
        if (/^bedeutungen|xml$/.test(val.typ)) {
          // Bedeutungsgerüst- und XML-Fenster werden vom zugehörigen Hauptfenster
          // geschlossen (kann zu einem Fehler führen, wenn hier auch noch einmal
          // versucht wird, sie zu schließen)
          continue;
        }
        const w = BrowserWindow.fromId(parseInt(id, 10));
        if (w) {
          // Fenster wurde schon geschlossen
          // (kann bei App > Beenden irgendwie passieren)
          w.close();
        }
      }
    } else if (parameter) {
      w.webContents.send(befehl, parameter);
    } else {
      w.webContents.send(befehl);
    }
  },

  // Sprache des Menüs ggf. auffrischen
  lang () {
    // App-Sprache ermitteln
    const [ locale ] = app.getLocale().split("-");
    let lang = i18n.transLang({
      lang: locale,
    });
    if (optionen.data?.einstellungen?.sprache) {
      // Sprache aus Einstellungen übernehmen
      lang = optionen.data.einstellungen.sprache;
    } else if (!optionen?.data?.einstellungen?.sprache) {
      // Sprache der locale in den Einstellungen übernehmen, wenn der Wert noch nicht gesetzt ist
      if (!optionen.data.einstellungen) {
        optionen.data.einstellungen = {};
      }
      optionen.data.einstellungen.sprache = lang;
    }

    // Sprache DE => Menü muss nicht angepasst werden
    if (lang === "de") {
      return;
    }

    // Menü übersetzen
    for (const menu of [ layoutMenu, layoutMenuBearbeiten, layoutMenuAnsicht, layoutMenuMac ]) {
      for (const block of menu) {
        if (block.id) {
          translate(block, block.id);
        }
        for (const i of block.submenu) {
          translate(i, i.id);
        }
      }
    }
    function translate (item, key) {
      if (!key) {
        return;
      }
      const trans = i18n.trans({
        lang,
        key,
      });
      if (trans) {
        item.label = trans;
      }
    }
  },

  // uovo di Pasqua
  uovo () {
    const lang = optionen.data?.einstellungen?.sprache;
    if (!lang || lang !== "de") {
      return;
    }
    const h = new Date().getHours();
    let l = "Beenden";
    if (h >= 23 || h < 6) {
      l = "Ausgeträumt";
    }
    const m = layoutMenu[0].submenu.find(i => i.id === "app-beenden");
    m.label = l;
  },
};
