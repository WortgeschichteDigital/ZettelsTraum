"use strict";

/* MODULE & VARIABLEN ***************************/

// Electron- und Node-Module
const {app, BrowserWindow, ipcMain, Menu, webContents} = require("electron"),
	fs = require("fs"),
	fsP = fs.promises,
	path = require("path");

// eigene Module
const dienste = require("./js/main/dienste"),
	popup = require("./js/main/popup");

// Speicher-Objekt für die Fenster; Format der Einträge:
//   "Fenster-ID" (numerischer String, beginnend mit 1; wird von Electron vergeben)
//     contentsId:  Number (ID des webContents im Fenster)
//     typ:         String (Typ des Fensters:
//       "index"         = Hauptfenster
//       "bedeutungen"   = Nebenfenster "Bedeutungsgerüst" (eins pro Hauptfenster möglich)
//       "changelog"     = Nebenfenster "Changelog"
//       "dokumentation" = Nebenfenster "technische Dokumentation"
//       "handbuch"      = Nebenfenster "Handbuch"
//       "fehlerlog"     = Nebenfenster "Fehlerlog"
//       "app"           = modales Nebenfenster "Über App"
//       "electron"      = modales Nebenfenster "Über Electron")
//     kartei:      String (Pfad zur Kartei, die gerade in dem Fenster geladen ist;
//       immer leer in Fenstern, die nicht typ === "index" sind;
//       kann in Fenstern vom typ === "index" leer sein, dann ist keine Kartei geladen;
//       kann in Fenstern vom typ === "index" auch "neu" sein, dann wurde die Karte erstellt,
//       aber noch nicht gespeichert)
//     exit:        true || undefined (wird dem Objekt kurz vor dem Schließen hinzugefügt,
//       damit dieses Schließen nicht blockiert wird; s. BrowserWindow.on("close"))
let win = {};

// Developer-Tools sollen angezeigt werden (oder nicht)
// (wird auch für andere Dinge benutzt, für Testzwecke besser zentral anlegen
// und nicht überall app.isPackaged abfragen)
let devtools = !app.isPackaged;

// speichert Exceptions im Main-Prozess und in den Renderer-Prozessen
let fehler = [];

// Menü-Vorlagen
let layoutMenu, layoutMenuAnsicht, layoutMenuMac;

// Variablen für die Kopierfunktion
let kopieren = {
	timeout: null,
	basisdaten: {},
	winIdAnfrage: -1,
};

// Variable mit Release Notes
// (ist gefüllt, wenn Updates zur Verfügung stehen)
let updates = {
	notes: "",
	gesucht: false,
};

// Variable für Abgleich der Tag-Dateien
// (soll nur einmal pro Session stattfinden)
let tagDateienAbgleich = true;

// Funktionen-Container
let appMenu, optionen, fenster;


/* PROGRAMMFEHLER *******************************/

process.on("uncaughtException", err => onError(err));
process.on("unhandledRejection", err => onError(err));

function onError (err) {
	fehler.push({
		time: new Date().toISOString(),
		word: "",
		fileZtj: "",
		fileJs: "main.js",
		message: err.stack,
		line: 0,
		column: 0,
	});
	// auf der Konsole auswerfen, wenn nicht gepackt
	if (devtools) {
		console.log(`\x1b[47m\x1b[31m${err.stack}\x1b[0m`);
	}
}


/* LOCALE SETZEN ********************************/

app.commandLine.appendSwitch("lang", "de"); // BUG funktioniert seit Electron 5.0.x nicht mehr: https://github.com/electron/electron/issues/17995


/* SINGLE-INSTANCE ******************************/

if (!app.requestSingleInstanceLock()) {
	app.quit();
	process.exit(0);
}


/* APP-MENÜ *************************************/

// Menü-Vorlagen
layoutMenu = [
	{
		label: `&${app.name}`,
		submenu: [
			{
				label: "Neues Fenster",
				icon: path.join(__dirname, "img", "menu", "fenster-plus.png"),
				click: () => fenster.erstellen(""),
			},
			{ type: "separator" },
			{
				label: "Karteisuche",
				icon: path.join(__dirname, "img", "menu", "lupe.png"),
				click: () => appMenu.befehl("app-karteisuche"),
			},
			{ type: "separator" },
			{
				label: "Einstellungen",
				icon: path.join(__dirname, "img", "menu", "zahnrad.png"),
				click: () => appMenu.befehl("app-einstellungen"),
			},
			{ type: "separator" },
			{
				label: "Beenden",
				icon: path.join(__dirname, "img", "menu", "ausgang.png"),
				click: () => appMenu.befehl("app-beenden"),
				accelerator: "CommandOrControl+Q",
				id: "app-beenden",
			},
		],
	},
	{
		label: "&Kartei",
		submenu: [
			{
				label: "Erstellen",
				icon: path.join(__dirname, "img", "menu", "dokument-plus.png"),
				click: () => appMenu.befehl("kartei-erstellen"),
				accelerator: "CommandOrControl+E",
			},
			{ type: "separator" },
			{
				label: "Öffnen",
				icon: path.join(__dirname, "img", "menu", "oeffnen.png"),
				click: () => appMenu.befehl("kartei-oeffnen", ""),
				accelerator: "CommandOrControl+O",
			},
			{
				label: "Zuletzt verwendet", // Menü wird über appMenu.zuletzt() gefüllt
				id: "kartei-zuletzt",
			},
			{ type: "separator" },
			{
				label: "Speichern",
				icon: path.join(__dirname, "img", "menu", "speichern.png"),
				click: () => appMenu.befehl("kartei-speichern"),
				accelerator: "CommandOrControl+S",
				id: "kartei-speichern",
			},
			{
				label: "Speichern unter",
				icon: path.join(__dirname, "img", "menu", "speichern-unter.png"),
				click: () => appMenu.befehl("kartei-speichern-unter"),
				accelerator: "CommandOrControl+Shift+S",
				id: "kartei-speichern-unter",
			},
			{ type: "separator" },
			{
				label: "Schließen",
				icon: path.join(__dirname, "img", "menu", "x-dick.png"),
				click: () => appMenu.befehl("kartei-schliessen"),
				accelerator: "CommandOrControl+W",
				id: "kartei-schliessen",
			},
			{ type: "separator" },
			{
				label: "Formvarianten",
				icon: path.join(__dirname, "img", "menu", "formvarianten.png"),
				click: () => appMenu.befehl("kartei-formvarianten"),
				id: "kartei-formvarianten",
			},
			{
				label: "Notizen",
				icon: path.join(__dirname, "img", "menu", "stift.png"),
				click: () => appMenu.befehl("kartei-notizen"),
				id: "kartei-notizen",
			},
			{
				label: "Anhänge",
				icon: path.join(__dirname, "img", "menu", "bueroklammer.png"),
				click: () => appMenu.befehl("kartei-anhaenge"),
				id: "kartei-anhaenge",
			},
			{
				label: "Überprüfte Lexika",
				icon: path.join(__dirname, "img", "menu", "buecher.png"),
				click: () => appMenu.befehl("kartei-lexika"),
				id: "kartei-lexika",
			},
			{
				label: "Metadaten",
				icon: path.join(__dirname, "img", "menu", "zeilen-4,0.png"),
				click: () => appMenu.befehl("kartei-metadaten"),
				id: "kartei-metadaten",
			},
			{
				label: "Redaktion",
				icon: path.join(__dirname, "img", "menu", "personen.png"),
				click: () => appMenu.befehl("kartei-redaktion"),
				id: "kartei-redaktion",
			},
			{ type: "separator" },
			{
				label: "Bedeutungsgerüst",
				icon: path.join(__dirname, "img", "menu", "geruest.png"),
				click: () => appMenu.befehl("kartei-bedeutungen"),
				accelerator: "CommandOrControl+B",
				id: "kartei-bedeutungen",
			},
			{
				label: "Bedeutungsgerüst wechseln",
				icon: path.join(__dirname, "img", "menu", "geruest-zahnrad.png"),
				click: () => appMenu.befehl("kartei-bedeutungen-wechseln"),
				accelerator: "CommandOrControl+Alt+B",
				id: "kartei-bedeutungen-wechseln",
			},
			{
				label: "Bedeutungsgerüst-Fenster",
				icon: path.join(__dirname, "img", "menu", "fenster.png"),
				click: () => appMenu.befehl("kartei-bedeutungen-fenster"),
				accelerator: "CommandOrControl+Shift+B",
				id: "kartei-bedeutungen-fenster",
			},
			{ type: "separator" },
			{
				label: "Suche",
				icon: path.join(__dirname, "img", "menu", "lupe.png"),
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
				icon: path.join(__dirname, "img", "menu", "dokument-plus.png"),
				click: () => appMenu.befehl("belege-hinzufuegen"),
				accelerator: "CommandOrControl+N",
			},
			{
				label: "Auflisten",
				icon: path.join(__dirname, "img", "menu", "liste-bullets.png"),
				click: () => appMenu.befehl("belege-auflisten"),
				accelerator: "CommandOrControl+L",
			},
			{ type: "separator" },
			{
				label: "Kopieren",
				icon: path.join(__dirname, "img", "menu", "kopieren.png"),
				click: () => appMenu.befehl("belege-kopieren"),
			},
			{
				label: "Einfügen",
				icon: path.join(__dirname, "img", "menu", "einfuegen.png"),
				click: () => appMenu.befehl("belege-einfuegen"),
			},
		],
	},
	{
		label: "B&earbeiten",
		submenu: [
			{
				label: "Rückgängig",
				icon: path.join(__dirname, "img", "menu", "pfeil-rund-links.png"),
				role: "undo",
			},
			{
				label: "Wiederherstellen",
				icon: path.join(__dirname, "img", "menu", "pfeil-rund-rechts.png"),
				role: "redo",
			},
			{ type: "separator" },
			{
				label: "Ausschneiden",
				icon: path.join(__dirname, "img", "menu", "schere.png"),
				role: "cut",
			},
			{
				label: "Kopieren",
				icon: path.join(__dirname, "img", "menu", "kopieren.png"),
				role: "copy",
			},
			{
				label: "Einfügen",
				icon: path.join(__dirname, "img", "menu", "einfuegen.png"),
				role: "paste",
			},
			{
				label: "Alles auswählen",
				icon: path.join(__dirname, "img", "menu", "auswaehlen.png"),
				role: "selectAll",
			},
		],
	},
	{
		label: "&Hilfe",
		submenu: [
			{
				label: "Handbuch",
				icon: path.join(__dirname, "img", "menu", "kreis-fragezeichen.png"),
				click: () => fenster.erstellenNeben({typ: "handbuch"}),
				accelerator: "F1",
			},
			{
				label: "Demonstrationskartei",
				click: () => appMenu.befehl("hilfe-demo"),
			},
			{
				label: "Technische Dokumentation",
				click: () => fenster.erstellenNeben({typ: "dokumentation"}),
			},
			{ type: "separator" },
			{
				label: "Changelog",
				click: () => fenster.erstellenNeben({typ: "changelog"}),
			},
			{
				label: "Fehlerlog",
				click: () => fenster.erstellenNeben({typ: "fehlerlog"}),
			},
			{ type: "separator" },
			{
				label: "Updates",
				icon: path.join(__dirname, "img", "menu", "pfeil-kreis.png"),
				click: () => appMenu.befehl("hilfe-updates"),
			},
			{ type: "separator" },
			{
				label: `Über ${app.name}`,
				click: () => fenster.erstellenUeber("app"),
			},
			{
				label: "Über Electron",
				click: () => fenster.erstellenUeber("electron"),
			},
		],
	},
];

layoutMenuAnsicht = [
	{
		label: "&Ansicht",
		submenu: [
			{
				label: "Anzeige vergrößern",
				icon: path.join(__dirname, "img", "menu", "plus-quadrat.png"),
				role: "zoomIn",
				accelerator: "CommandOrControl+=",
			},
			{
				label: "Anzeige verkleinern",
				icon: path.join(__dirname, "img", "menu", "minus-quadrat.png"),
				role: "zoomOut",
			},
			{
				label: "Standardgröße",
				icon: path.join(__dirname, "img", "menu", "fenster-standard.png"),
				role: "resetZoom",
			},
			{ type: "separator" },
			{
				label: "Vollbild",
				icon: path.join(__dirname, "img", "menu", "fenster-vollbild.png"),
				role: "toggleFullScreen",
			},
		],
	},
];

layoutMenuMac = [
	{
		label: app.name,
		submenu: [
			{
				label: "Fenster schließen",
				icon: path.join(__dirname, "img", "menu", "fenster-schliessen.png"),
				click: () => fenster.schliessen(),
				accelerator: "CommandOrControl+W",
			},
		],
	},
];

// Ansicht im Hauptmenü ergänzen
layoutMenu.splice(layoutMenu.length - 1, 0, layoutMenuAnsicht[0]);

// ggf. Developer-Menü ergänzen
if (devtools) {
	[layoutMenu, layoutMenuAnsicht].forEach(i => {
		i.push({
			label: "&Dev",
			submenu: [
				{
					label: "Neu laden",
					role: "reload",
				},
				{
					label: "Neu laden erzwingen",
					role: "forceReload",
				},
				{ type: "separator" },
				{
					label: "Developer tools",
					role: "toggleDevTools",
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
	for (let menu of [layoutMenu, layoutMenuAnsicht]) {
		for (let mp of menu) {
			mp.label = mp.label.replace("&", "");
			const zuletztIdx = mp.submenu.findIndex(i => i.id === "kartei-zuletzt");
			if (zuletztIdx >= 0) {
				mp.submenu.splice(zuletztIdx, 1);
			}
		}
	}
	// Ansichtmenü ergänzen
	layoutMenuAnsicht.unshift(layoutMenuMac[0]);
}

appMenu = {
	// überschreibt das Submenü mit den zuletzt verwendeten Karteien
	zuletzt () {
		// für macOS gibt es ein anderes Menüsystem
		if (process.platform === "darwin") {
			return;
		}
		// Submenü-Vorlage
		let layoutZuletzt = {
			label: "Zuletzt verwendet",
			icon: path.join(__dirname, "img", "menu", "uhr.png"),
			id: "kartei-zuletzt",
			submenu: [],
		};
		// Dateiliste ggf. ergänzen
		if (optionen.data.zuletzt) {
			let len = optionen.data.zuletzt.length;
			if (len > 10) {
				// Liste auf 10 Einträge begrenzen
				// (in der Startansicht sind max. 20 Einträge sichtbar)
				len = 10;
			}
			for (let i = 0; i < len; i++) {
				appMenu.zuletztItem(layoutZuletzt, optionen.data.zuletzt[i], i);
			}
		}
		// ggf. Löschmenü hinzufügen
		if (layoutZuletzt.submenu.length) {
			layoutZuletzt.submenu.push(
				{ type: "separator" },
				{
					click: () => appMenu.zuletztLoeschen(),
					label: "Liste löschen",
				},
			);
		}
		// Position der Karteiliste ermitteln
		let menuKartei = layoutMenu[1].submenu,
			pos = -1;
		for (let i = 0, len = menuKartei.length; i < len; i++) {
			if (menuKartei[i].id === "kartei-zuletzt") {
				pos = i;
				break;
			}
		}
		// neue Liste einhängen
		layoutMenu[1].submenu[pos] = layoutZuletzt;
	},
	// Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
	//   layoutZuletzt = Object
	//     (der Menüpunkt "Zuletzt verwendet")
	//   datei = String
	//     (Dateipfad)
	//   i = Number
	//     (Index-Punkt, an dem sich die Datei befindet)
	zuletztItem (layoutZuletzt, datei, i) {
		let item = {
			label: path.basename(datei, ".ztj"),
			sublabel: datei,
			click: () => appMenu.befehl("kartei-oeffnen", datei),
		};
		if (i <= 8) {
			item.accelerator = `CommandOrControl+${i + 1}`;
		}
		layoutZuletzt.submenu.push(item);
	},
	// überprüft, ob die zuletzt verwendeten Karteien noch vorhanden sind
	async zuletztCheck () {
		for (let i of optionen.data.zuletzt) {
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
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ !== "index") {
				continue;
			}
			let w = BrowserWindow.fromId(parseInt(id, 10));
			w.webContents.send("optionen-zuletzt-verschwunden", appMenu.zuletztVerschwunden);
		}
	},
	// Menüs in den Hauptfenstern auffrischen
	zuletztUpdate () {
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ !== "index") {
				continue;
			}
			// Fenster des Renderer-Prozesses ermitteln
			let w = BrowserWindow.fromId(parseInt(id, 10));
			// App-Menü des Renderer-Prozesses auffrischen
			if (process.platform !== "darwin") {
				let disable = false;
				if (!win[id].kartei) {
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
		let elemente = ["kartei-speichern", "kartei-speichern-unter", "kartei-formvarianten", "kartei-notizen", "kartei-anhaenge", "kartei-lexika", "kartei-metadaten", "kartei-redaktion", "kartei-bedeutungen", "kartei-bedeutungen-wechseln", "kartei-bedeutungen-fenster", "kartei-suche", "kartei-schliessen", "belege"];
		for (let j = 0, len = layoutMenu.length; j < len; j++) {
			// sollen vielleicht alle Menüpunkte deaktiviert werden?
			let alle = false;
			if (elemente.includes(layoutMenu[j].id)) {
				alle = true;
			}
			// Submenu durchgehen
			let submenu = layoutMenu[j].submenu;
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
		let menu = Menu.buildFromTemplate(layoutMenu);
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
		let menu = Menu.buildFromTemplate(layoutMenuAnsicht);
		fenster.setMenu(menu);
		fenster.setMenuBarVisibility(false);
	},
	// erzeugt die Menüleiste in macOS
	erzeugenMac (vorlage) {
		appMenu.uovo();
		let menu = Menu.buildFromTemplate(vorlage);
		Menu.setApplicationMenu(menu);
	},
	// führt den aufgerufenen Befehl im aktuellen Fenster aus
	//   befehl = String
	//     (die Aktion)
	//   parameter = String || Array || undefined
	//     (einige Befehle bekommen einen Wert übergeben; im Falle der zuletzt geöffneten
	//     Dateien kann es auch ein Array sein)
	befehl (befehl, parameter) {
		let w = BrowserWindow.getFocusedWindow();
		if (befehl === "app-beenden") {
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				if (win[id].typ === "bedeutungen") {
					// Bedeutungsgerüst-Fenster werden vom zugehörigen Hauptfenster geschlossen
					// (kann zu einem Fehler führen, wenn hier auch noch einmal versucht wird,
					// sie zu schließen)
					continue;
				}
				let w = BrowserWindow.fromId(parseInt(id, 10));
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
	// uovo di Pasqua
	uovo () {
		let l = "Beenden",
			h = new Date().getHours();
		if (h >= 23 || h < 6) {
			l = "Ausgeträumt";
		}
		let m = layoutMenu[0].submenu.find(i => i.id === "app-beenden");
		m.label = l;
	},
};


/* OPTIONEN *************************************/

optionen = {
	// Pfad zur Optionen-Datei
	pfad: path.join(app.getPath("userData"), "einstellungen.json"),
	// Objekt mit den gespeicherten Optionen
	data: {},
	// liest die Optionen-Datei aus
	async lesen () {
		const exists = await dienste.exists(optionen.pfad);
		if (!exists) {
			return;
		}
		let content = await fsP.readFile(optionen.pfad, {encoding: "utf-8"});
		try {
			optionen.data = JSON.parse(content);
		} catch (err) {
			// kann die Optionen-Datei nicht eingelesen werden, ist sie wohl korrupt => löschen
			fsP.unlink(optionen.pfad);
		}
	},
	// Optionen werden nicht sofort geschrieben, sondern erst nach einem Timeout
	schreibenTimeout: null,
	// überschreibt die Optionen-Datei
	schreiben () {
		return new Promise(resolve => {
			if (!Object.keys(optionen.data).length) {
				resolve(false);
				return;
			}
			fsP.writeFile(optionen.pfad, JSON.stringify(optionen.data))
				.then(() => resolve(true))
				.catch(err => {
					fenster.befehlAnHauptfenster("dialog-anzeigen", `Die Optionen-Datei konnte nicht gespeichert werden.\n<h3>Fehlermeldung</h3>\n${err.name}: ${err.message}`);
					resolve(false);
					throw err;
				});
		});
	},
};


/* FENSTER **************************************/

fenster = {
	// Hauptfenster erstellen
	//   kartei = String
	//     (Pfad zur Kartei, die geöffnet werden soll)
	//   neuesWort = true || undefined
	//     (im Fenster soll ein neues Wort erstellt werden)
	erstellen (kartei, neuesWort = false) {
		// Position und Größe des Fensters ermitteln;
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		let x = optionen.data.fenster ? optionen.data.fenster.x : null,
			y = optionen.data.fenster ? optionen.data.fenster.y : null,
			width = optionen.data.fenster ? optionen.data.fenster.width : 1100,
			height = optionen.data.fenster ? optionen.data.fenster.height : Bildschirm.workArea.height;
		// Position des Fensters anpassen, falls das gerade fokussierte Fenster ein Hauptfenster ist
		let w = BrowserWindow.getFocusedWindow();
		if (w && win[w.id].typ === "index") {
			let wBounds = w.getBounds();
			// Verschieben in der Horizontalen
			if (wBounds.x + width + 100 <= Bildschirm.workArea.width) {
				x = wBounds.x + 100;
			} else if (wBounds.x - 100 >= 0) {
				x = wBounds.x - 100;
			}
			// Verschieben in der Vertikalen
			if (wBounds.y + height + 100 <= Bildschirm.workArea.height) {
				y = wBounds.y + 100;
			} else if (wBounds.y - 100 >= 0) {
				y = wBounds.y - 100;
			}
		}
		// Fenster öffnen
		// (die Optionen können noch fehlen)
		let bw = new BrowserWindow({
			title: app.name,
			icon: fenster.icon(),
			backgroundColor: "#386ea6",
			x: x,
			y: y,
			width: width,
			height: height,
			minWidth: 600,
			minHeight: 350,
			autoHideMenuBar: optionen.data.einstellungen ? optionen.data.einstellungen.autoHideMenuBar : false,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: false,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// ggf. maximieren
		// (die Option kann noch fehlen)
		if (optionen.data.fenster &&
				optionen.data.fenster.maximiert) {
			bw.maximize();
		}
		// Windows/Linux: Menüs, die nur bei offenen Karteikarten funktionieren, deaktivieren; Menüleiste an das neue Fenster hängen
		// macOS: beim Fokussieren des Fensters Standardmenü erzeugen
		if (process.platform !== "darwin") {
			appMenu.deaktivieren(true, bw.id);
		} else if (process.platform === "darwin") {
			bw.on("focus", () => appMenu.erzeugenMac(layoutMenu));
		}
		// HTML laden
		bw.loadFile(path.join(__dirname, "index.html"));
		// Fenster fokussieren
		// (mitunter ist das Fenster sonst nicht im Vordergrund)
		fenster.fokus(bw);
		// Fenster-Objekt anlegen
		// (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
		bw.webContents.on("dom-ready", function() {
			fenster.objekt(bw.id, this.id, "index");
		});
		// ggf. übergebene Kartei öffnen
		bw.webContents.once("did-finish-load", function() {
			if (appMenu.zuletztVerschwunden.length) {
				// die IPC-Listener im Renderer-Prozess müssen erst initialisiert werden
				setTimeout(() => this.send("optionen-zuletzt-verschwunden", appMenu.zuletztVerschwunden), 25);
			}
			const ztj = fenster.argvZtj(process.argv);
			if (ztj || kartei) {
				let datei = kartei;
				if (!datei) {
					datei = ztj;
				}
				// die IPC-Listener im Renderer-Prozess müssen erst initialisiert werden
				setTimeout(() => this.send("kartei-oeffnen", datei), 25);
			} else if (neuesWort) {
				// 500ms warten, damit der Ladebildschirm Zeit hat zu verschwinden
				setTimeout(() => {
					if (!this.isDestroyed()) {
						this.send("kartei-erstellen");
					}
				}, 500);
			}
		});
		// Aktionen vor dem Schließen des Fensters
		bw.on("close", function(evt) {
			// beforeUnload() im Fenster ausführen
			if (!win[this.id].exit) {
				evt.preventDefault();
				this.webContents.send("before-unload");
				return;
			}
			// Fenster dereferenzieren
			delete win[this.id];
			// Sind noch Hauptfenster vorhanden?
			let hauptfensterOffen = false;
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				if (win[id].typ === "index") {
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
	//     (der Typ des Neben-Fensters: "bedeutungen" || "changelog" || "dokumentation" || "fehlerlog" || "handbuch")
	//   abschnitt = String || undefined
	//     (Abschnitt, der im Fenster geöffnet werden soll; nur "handbuch" und "dokumentation")
	erstellenNeben ({typ, abschnitt = "", bdTitle = "", bdCaller = null}) {
		// ist das Fenster bereits offen? => Fenster fokussieren
		// (bei Bedeutungsgerüst-Fenstern wissen die Hauptfenster, wenn sie auf sind)
		if (typ !== "bedeutungen") {
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				if (win[id].typ === typ) {
					let w = BrowserWindow.fromId(parseInt(id, 10));
					fenster.fokus(w);
					if (abschnitt) {
						w.webContents.send("oeffne-abschnitt", abschnitt);
					}
					return;
				}
			}
		}
		// Titel und Dimensionen des Fensters ermitteln
		let title = "";
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		let bounds = {
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
		let opt = {
			title: title,
			icon: fenster.icon(),
			backgroundColor: "#386ea6",
			width: bounds.width,
			height: bounds.height,
			minWidth: bounds.minWidth,
			minHeight: bounds.minHeight,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: false,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		};
		if (typ === "bedeutungen") {
			opt.title = bdTitle;
			opt.x = optionen.data["fenster-bedeutungen"].x;
			opt.y = optionen.data["fenster-bedeutungen"].y;
			opt.width = optionen.data["fenster-bedeutungen"].width;
			opt.height = optionen.data["fenster-bedeutungen"].height;
			opt.minWidth = 400;
			opt.minHeight = 400;
		}
		// ggf. die Position des Fensters festlegen; sonst wird es zentriert
		// (damit Handbuch und Dokumentation nicht übereinanderliegen,
		// wenn sie auseinander geöffnet werden)
		if (typ === "dokumentation" || typ === "handbuch") {
			let w = BrowserWindow.getFocusedWindow(),
				x = -1,
				y = -1;
			if (w && /dokumentation|handbuch/.test(win[w.id].typ)) {
				let wBounds = w.getBounds();
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
		let bw = new BrowserWindow(opt);
		// ggf. maximieren
		if (typ === "bedeutungen" &&
				optionen.data["fenster-bedeutungen"].maximiert) {
			bw.maximize();
		}
		// Windows/Linux: verstecktes Ansicht-Menü erzeugen
		// macOS: angepasstes Ansicht-Menü erzeugen
		if (process.platform !== "darwin") {
			appMenu.erzeugenAnsicht(bw);
			bw.on("leave-full-screen", function() {
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
			bw.on("focus", () => appMenu.erzeugenMac(layoutMenuAnsicht));
		}
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${typ}.html`));
		// Fenster fokussieren
		// (mitunter ist das Fenster sonst nicht im Vordergrund)
		fenster.fokus(bw);
		// Fenster-Objekt anlegen
		// (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
		bw.webContents.on("dom-ready", function() {
			fenster.objekt(bw.id, this.id, typ);
		});
		// Seite ist fertig geladen
		bw.webContents.once("did-finish-load", function() {
			// ggf. Abschnitt öffnen
			if (abschnitt) {
				// die IPC-Listener im Renderer-Prozess müssen erst initialisiert werden
				setTimeout(() => this.send("oeffne-abschnitt", abschnitt), 25);
			}
			// ggf. Daten an das Bedeutungsgerüst schicken
			if (bdCaller) {
				setTimeout(() => bdCaller.send("bedeutungen-fenster-daten"), 25);
			}
		});
		// Aktionen vor dem Schließen des Fensters
		bw.on("close", function(evt) {
			// beforeUnload() im Fenster ausführen
			if (!win[this.id].exit) {
				evt.preventDefault();
				this.webContents.send("before-unload");
				return;
			}
			// Fenster dereferenzieren
			delete win[this.id];
		});
		// ID des Web-Content zurückgeben
		return bw.webContents.id;
	},
	// Über-Fenster erstellen
	//   typ = String
	//     (der Typ des Über-Fensters: "app" || "electron")
	erstellenUeber (typ) {
		// Titel Name der Seite ermitteln
		let title, html;
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
		let bw = new BrowserWindow({
			parent: BrowserWindow.getFocusedWindow(),
			modal: true,
			title: title,
			icon: fenster.icon(),
			backgroundColor: "#386ea6",
			width: 650,
			height: 334,
			useContentSize: contentSize,
			center: true,
			resizable: false,
			minimizable: false,
			maximizable: false,
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: false,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Windows/Linux: Menü nur erzeugen, wenn Dev-Tools zugänglich sein sollen; sonst haben die Fenster kein Menü
		// macOS: minimales Menü mit nur einem Punkt erzeugen
		if (process.platform !== "darwin" && devtools) {
			appMenu.erzeugenAnsicht(bw);
		} else if (process.platform === "darwin") {
			bw.on("focus", () => appMenu.erzeugenMac(layoutMenuMac));
		}
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${html}.html`));
		// Fenster-Objekt anlegen
		// (wird Fenster neu geladen => Fenster-Objekt neu anlegen)
		bw.webContents.on("dom-ready", function() {
			fenster.objekt(bw.id, this.id, typ);
		});
		// Aktionen vor dem Schließen des Fensters
		bw.on("close", function(evt) {
			// beforeUnload() im Fenster ausführen
			if (!win[this.id].exit) {
				evt.preventDefault();
				this.webContents.send("before-unload");
				return;
			}
			// Fenster dereferenzieren
			delete win[this.id];
		});
	},
	// legt ein Fenster-Objekt an
	//   id = Number
	//     (Fenster-ID)
	//   typ = String
	//     (Fenstertyp)
	objekt (id, contentsId, typ) {
		win[id] = {
			contentsId: contentsId,
			typ: typ,
			kartei: "",
		};
	},
	// ermittelt das zum Betriebssystem passende Programm-Icon
	icon () {
		if (process.platform === "win32") {
			return path.join(__dirname, "img", "icon", "win", "icon.ico");
		} else if (process.platform === "darwin") {
			return path.join(__dirname, "img", "icon", "mac", "icon.icns");
		} else if (process.platform === "linux") {
			return path.join(__dirname, "img", "icon", "linux", "icon_32px.png");
		} else {
			return null;
		}
	},
	// schickt eine IPC-Meldung an ein Hauptfenster
	// (löst das Problem, dass nicht immer klar ist, ob ein Hauptfenster den Fokus hat)
	//   befehl = String
	//     (der IPC-Channel)
	//   arg = String || undefined
	//     (Befehlsargument, könnte prinzipiell alles sein, was in JSON linearisiert werden kann)
	befehlAnHauptfenster (befehl, arg = "") {
		let bw = BrowserWindow.getFocusedWindow();
		if (bw && win[bw.id].typ === "index") {
			bw.webContents.send(befehl, arg);
			return;
		}
		for (let w in win) {
			if (!win.hasOwnProperty(w)) {
				continue;
			}
			if (win[w].typ === "index") {
				let bw = BrowserWindow.fromId(parseInt(w, 10));
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
		let w = BrowserWindow.getFocusedWindow();
		if (w) { // nur zur Sicherheit, muss eigentlich immer da sein
			w.close();
		}
	},
	// ermittelt den Pfad der übergebenen ZTJ-Datei
	// (unter Windows steht die übergebene Datei nicht unbedingt in argv[1];
	// davor können verschiedene Schalter sein)
	//   argv = Array
	//     (Array mit den Startargumenten)
	argvZtj (argv) {
		for (let i of argv) {
			if (/\.ztj$/.test(i)) {
				return i;
			}
		}
		return "";
	},
};


/* LISTENER (app) *******************************/

// Initialisierung abgeschlossen => Fenster erstellen
app.on("ready", async () => {
	// Optionen einlesen
	await optionen.lesen();
	// Menu der zuletzt verwendeten Karteien erzeugen
	appMenu.zuletzt();
	// warten mit dem Öffnen des Fensters, bis die Optionen eingelesen wurden
	fenster.erstellen("");
	// überprüfen, ob die zuletzt verwendten Karteien noch vorhanden sind
	setTimeout(() => {
		appMenu.zuletztCheck();
	}, 5000);
	// ggf. auf Updates prüfen
	if (!optionen.data.updates) {
		return;
	}
	let updatesChecked = optionen.data.updates.checked.split("T")[0],
		heute = new Date().toISOString().split("T")[0];
	if (updatesChecked === heute ||
			!optionen.data.einstellungen["updates-suche"]) {
		return;
	}
	setTimeout(() => {
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ !== "index") {
				continue;
			}
			let w = BrowserWindow.fromId(parseInt(id, 10));
			w.webContents.send("updates-check");
			break;
		}
	}, 3e4);
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
	if (Object.keys(win).length === 0) {
		fenster.erstellen("");
	}
});

// zweite Instanz wird gestartet
app.on("second-instance", (evt, argv) => {
	// Kartei öffnen?
	const ztj = fenster.argvZtj(argv);
	if (!ztj) {
		return;
	}
	// Kartei schon offen => Fenster fokussieren
	let leereFenster = [];
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].kartei === ztj) {
			fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
			return;
		} else if (win[id].typ === "index" && !win[id].kartei) {
			leereFenster.push(parseInt(id, 10));
		}
	}
	// Kartei noch nicht offen => Kartei öffnen
	if (leereFenster.length) {
		let w = BrowserWindow.fromId(leereFenster[0]);
		w.webContents.send("kartei-oeffnen", ztj);
		fenster.fokus(w);
	} else {
		fenster.erstellen(ztj);
	}
});


/* LISTENER (ipcMain) ***************************/

// ***** PROGRAMMFEHLER *****
// Fehler aus Renderer-Prozess empfangen
ipcMain.on("fehler", (evt, err) => fehler.push(err));

// Fehler an Renderer-Prozess senden
ipcMain.handle("fehler-senden", () => fehler);


// ***** INIT *****
// Infos zu App und Fenster senden
ipcMain.handle("infos-senden", evt => {
	let bw = BrowserWindow.fromWebContents(evt.sender);
	return {
		appInfo: {
			documents: app.getPath("documents"),
			name: app.name,
			packaged: !devtools,
			temp: app.getPath("temp"),
			version: app.getVersion(),
		},
		winInfo: {
			winId: bw.id,
			contentsId: evt.sender.id,
			typ: win[bw.id].typ,
		},
	};
});

// Verzeichnis der Bilder in ./img senden
ipcMain.handle("bilder-senden", async () => await dienste.bilder());


// ***** APP-MENÜ *****
// Menüse aktivieren/deaktivieren
ipcMain.on("menus-deaktivieren", (evt, disable, id) => appMenu.deaktivieren(disable, id));

// App komplett beenden
ipcMain.on("app-beenden", () => appMenu.befehl("app-beenden"));

// Rechtsklickmenü einblenden
ipcMain.handle("popup", (evt, items) => popup.make(evt.sender, items));


// ***** OPTIONEN *****
// Optionen-Daten an Renderer schicken
ipcMain.handle("optionen-senden", () => optionen.data);

// Optionen empfangen und speichern
ipcMain.handle("optionen-speichern", (evt, opt, winId) => {
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
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].typ !== "index") {
			continue;
		}
		const idInt = parseInt(id, 10);
		if (idInt === winId) {
			continue;
		}
		BrowserWindow.fromId(idInt).webContents.send("optionen-empfangen", optionen.data);
	}
	// Optionen nach Timeout in einstellungen.json schreiben
	clearTimeout(optionen.schreibenTimeout);
	optionen.schreibenTimeout = setTimeout(() => optionen.schreiben(), 6e4);
});

// verschwundene Kartei wurde wiedergefunden
ipcMain.handle("optionen-zuletzt-wiedergefunden", (evt, verschwunden) => {
	appMenu.zuletztVerschwunden = verschwunden;
	appMenu.zuletztVerschwundenInform();
});

// Anfrage, ob die Tag-Dateien abgeglichen werden solle
// (soll nur einmal pro Session geschehen)
ipcMain.handle("optionen-tag-dateien-abgleich", () => {
	if (tagDateienAbgleich) {
		tagDateienAbgleich = false;
		return true; // Tag-Dateien abgleichen
	}
	return false; // Tag-Dateien nicht abgleichen
});


// ***** FENSTER *****
// Handbuch öffnen
ipcMain.on("hilfe-handbuch", (evt, abschnitt) => fenster.erstellenNeben({typ: "handbuch", abschnitt: abschnitt}));

// Demonstrationskartei öffnen
ipcMain.on("hilfe-demo", () => fenster.befehlAnHauptfenster("hilfe-demo"));

// Dokumentation öffnen
ipcMain.on("hilfe-dokumentation", (evt, abschnitt) => fenster.erstellenNeben({typ: "dokumentation", abschnitt: abschnitt}));

// Changelog öffnen
ipcMain.on("hilfe-changelog", () => fenster.erstellenNeben({typ: "changelog"}));

// Fehlerlog öffnen
ipcMain.on("hilfe-fehlerlog", () => fenster.erstellenNeben({typ: "fehlerlog"}));

// "Über App" öffnen
ipcMain.on("ueber-app", () => fenster.erstellenUeber("app"));

// "Über Electron" öffnen
ipcMain.on("ueber-electron", () => fenster.erstellenUeber("electron"));

// Fenster fokussieren
ipcMain.handle("fenster-fokus", evt => {
	let bw = BrowserWindow.fromWebContents(evt.sender);
	fenster.fokus(bw);
});

// Fenster schließen
ipcMain.handle("fenster-schliessen", evt => {
	let w = BrowserWindow.fromWebContents(evt.sender);
	w.close();
});

// Fenster endgültig schließen
ipcMain.handle("fenster-schliessen-endgueltig", evt => {
	let w = BrowserWindow.fromWebContents(evt.sender);
	if (!w) {
		// Fenster wurde schon geschlossen
		// (kann bei App > Beenden irgendwie passieren)
		return;
	}
	win[w.id].exit = true;
	w.close();
});

// Fenster-Dimensionen in den Einstellungen speichern
ipcMain.handle("fenster-status", (evt, winId, fenster) => {
	let bw = BrowserWindow.fromId(winId),
		bounds = bw.getBounds(),
		opt = optionen.data[fenster];
	// Status in den Optionen speichern
	opt.x = bounds.x;
	opt.y = bounds.y;
	opt.width = bounds.width;
	opt.height = bounds.height;
	opt.maximiert = bw.isMaximized();
	// Status an alle Hauptfenster melden
	let status = {
		x: opt.x,
		y: opt.y,
		width: opt.width,
		height: opt.height,
		maximiert: opt.maximiert,
	};
	for (let w in win) {
		if (!win.hasOwnProperty(w)) {
			continue;
		}
		if (win[w].typ !== "index" || parseInt(w, 10) === winId) {
			continue;
		}
		let bw = BrowserWindow.fromId(parseInt(w, 10));
		bw.webContents.send("optionen-fenster", fenster, status);
	}
	return status;
});

// Bedeutungsgerüst-Fenster öffnen
ipcMain.handle("bedeutungen-oeffnen", (evt, title) => {
	return fenster.erstellenNeben({typ: "bedeutungen", bdTitle: title, bdCaller: evt.sender});
});

// Bedeutungsgerüst-Fenster schliessen
ipcMain.handle("bedeutungen-schliessen", (evt, contentsId) => {
	let wc = webContents.fromId(contentsId),
		bw = BrowserWindow.fromWebContents(wc);
	bw.close();
});

// Bedeutungsgerüst-Fenster fokussieren
ipcMain.handle("bedeutungen-fokussieren", (evt, contentsId) => {
	let wc = webContents.fromId(contentsId),
		bw = BrowserWindow.fromWebContents(wc);
	fenster.fokus(bw);
});

// neue Kartei zu einem neuen Wort anlegen
ipcMain.on("neues-wort", () => {
	// bestehendes Fenster nutzen?
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].typ === "index" && !win[id].kartei) {
			let w = BrowserWindow.fromId(parseInt(id, 10));
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
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].kartei === kartei) {
			fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
			return true;
		}
	}
	return false;
});

// die übergebene Kartei laden (in einem neuen oder bestehenden Hauptfenster)
ipcMain.on("kartei-laden", (evt, kartei, in_leerem_fenster = true) => {
	if (in_leerem_fenster) {
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ === "index" && !win[id].kartei) {
				let w = BrowserWindow.fromId(parseInt(id, 10));
				w.webContents.send("kartei-oeffnen", kartei);
				fenster.fokus(w);
				return;
			}
		}
	}
	fenster.erstellen(kartei);
});

// registriert im Fenster-Objekt, welche Kartei geöffnet wurde
ipcMain.on("kartei-geoeffnet", (evt, id, kartei) => win[id].kartei = kartei);

// deregistriert im Fenster-Objekt die Kartei, die geöffnet war
ipcMain.on("kartei-geschlossen", (evt, id) => win[id].kartei = "");

// neues, leeres Hauptfenster öffnen
ipcMain.on("fenster-oeffnen", (evt) => fenster.erstellen(""));

// feststellen, ob ein weiteres Hauptfenster offen ist
ipcMain.handle("fenster-hauptfenster", (evt, idFrage) => {
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (parseInt(id, 10) === idFrage) {
			continue;
		}
		if (win[id].typ === "index") {
			return true;
		}
	}
	return false;
});


// ***** UPDATES ******
ipcMain.handle("updates-save-data", (evt, notes) => {
	updates.gesucht = true;
	updates.notes = notes;
});

ipcMain.handle("updates-get-data", () => updates);


// ***** KOPIEREN *****
// Basisdaten zu den möglichten Belegquellen ermitteln und an das anfragende Fenster schicken
ipcMain.on("kopieren-basisdaten", (evt, winId) => {
	// Daten zurücksetzen
	kopieren.basisdaten = {
		win: winId,
		daten: {},
	};
	// Daten aus den Fenstern holen
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		const idInt = parseInt(id, 10);
		if (idInt === winId) {
			continue;
		}
		let w = BrowserWindow.fromId(idInt);
		w.webContents.send("kopieren-basisdaten");
	}
	// Daten an das anfragende Fenster schicken
	// (auch hier, damit es selbst dann eine Antwort bekommt,
	// wenn keine weiteren Fenster offen sind)
	kopieren.timeout = setTimeout(() => {
		let w = BrowserWindow.fromId(kopieren.basisdaten.win);
		w.webContents.send("kopieren-basisdaten-empfangen", kopieren.basisdaten.daten);
	}, 25);
});

// angefragte Basisdaten registrieren und an das anfragende Fenster schicken
ipcMain.on("kopieren-basisdaten-lieferung", (evt, daten) => {
	// keine Daten
	if (!daten.belege) {
		return;
	}
	// Daten registrieren
	kopieren.basisdaten.daten[daten.id] = {};
	kopieren.basisdaten.daten[daten.id].belege = daten.belege;
	kopieren.basisdaten.daten[daten.id].gerueste = [...daten.gerueste];
	kopieren.basisdaten.daten[daten.id].wort = daten.wort;
	// Daten an das anfragende Fenster schicken
	// (damit nicht mehrere Meldungen gesendet werden => Timeout)
	clearTimeout(kopieren.timeout);
	kopieren.timeout = setTimeout(() => {
		let w = BrowserWindow.fromId(kopieren.basisdaten.win);
		w.webContents.send("kopieren-basisdaten-empfangen", kopieren.basisdaten.daten);
	}, 25);
});

// Daten der gewünschten Belegquelle anfragen
ipcMain.on("kopieren-daten", (evt, winIdQuelle, winIdAnfrage) => {
	// Existiert das Fenster, aus dem die Daten kommen sollen, noch?
	if (!win[winIdQuelle]) {
		let w = BrowserWindow.fromId(winIdAnfrage);
		w.webContents.send("dialog-anzeigen", "Beim Kopieren der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDas Fenster, das die Belege liefern sollte, existiert nicht mehr.");
		return;
	}
	// Fenster existiert => Daten anfragen
	kopieren.winIdAnfrage = winIdAnfrage;
	let w = BrowserWindow.fromId(winIdQuelle);
	w.webContents.send("kopieren-daten");
});

// angefragte Daten der gewünschten Belegquelle an das anfragende Fenster schicken
ipcMain.on("kopieren-daten-lieferung", (evt, daten) => {
	let w = BrowserWindow.fromId(kopieren.winIdAnfrage);
	w.webContents.send("kopieren-daten-empfangen", daten);
});


// ***** QUODLIBETICA *****
// Befehle in den Menüpunkten "Bearbeiten" und "Ansicht" ausführen
ipcMain.handle("quick-roles", (evt, befehl) => dienste.quickRoles(evt.sender, befehl));

// Dateidialoge öffnen
ipcMain.handle("datei-dialog", async (evt, args) => await dienste.dateiDialog(args));
