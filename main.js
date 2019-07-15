"use strict";

// Speicher-Objekt für die Fenster
// (die Bedeutungsgerüst-Fenster sind direkt an ein Hauptfenster gebunden
// und werden auch aus diesem geöffnet; sie werden hier nicht referenziert)
let win = {};

// Funktionen-Container
let appMenu, optionen, fenster;

// Electron-Features einbinden
const {app, BrowserWindow, ipcMain, Menu} = require("electron"),
	fs = require("fs"),
	path = require("path");

// Single-Instance-Test
let primary = app.requestSingleInstanceLock();

if (!primary) {
	app.quit();
	return;
}

app.on("second-instance", function(evt, argv) {
	// Kartei öffnen?
	if (/\.wgd$/.test(argv[1])) {
		// Kartei schon offen => Fenster fokussieren
		let leereFenster = [];
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].kartei === argv[1]) {
				let w = BrowserWindow.fromId(parseInt(id, 10));
				if (w.isMinimized()) {
					w.restore();
				}
				w.focus();
				return;
			} else if (win[id].typ === "index" && !win[id].kartei) {
				leereFenster.push(parseInt(id, 10));
			}
		}
		// Kartei noch nicht offen => Kartei öffnen
		if (leereFenster.length) {
			let w = BrowserWindow.fromId(leereFenster[0]);
			w.webContents.send("kartei-oeffnen", argv[1]);
		} else {
			fenster.erstellen(); // TODO klappt das? Macht er die Kartei auf?
		}
	}
});

// Bilderliste erstellen
let bilder = [];
fs.readdir(path.join(__dirname, "img"), function(err, img) {
	for (let i = 0, len = img.length; i < len; i++) {
		// Bild oder Ordner?
		if (fs.lstatSync(path.join(__dirname, "img", img[i])).isDirectory()) {
			continue;
		}
		// Bild!
		bilder.push(img[i]);
	}
});

// Bilderliste auf Anfrage schicken
ipcMain.on("bilder-senden", function(evt) {
	evt.returnValue = bilder;
});

// App-Menü-Vorlage
let layoutMenu = [
	{
		label: "&Programm",
		submenu: [
			{
				label: "Einstellungen",
				icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
				click: () => appMenu.aktion("programm-einstellungen"),
			},
			{ type: "separator" },
			{
				label: "Neues Fenster",
				icon: path.join(__dirname, "img", "menu", "programm-neues-fenster.png"),
				click: () => fenster.erstellen(),
			},
			{ type: "separator" },
			{
				label: "Beenden",
				icon: path.join(__dirname, "img", "menu", "programm-beenden.png"),
				click: () => appMenu.aktion("programm-beenden"),
				accelerator: "CommandOrControl+Q",
			},
		],
	},
	{
		label: "&Kartei",
		submenu: [
			{
				label: "Erstellen",
				icon: path.join(__dirname, "img", "menu", "kartei-erstellen.png"),
				click: () => appMenu.aktion("kartei-erstellen"),
				accelerator: "CommandOrControl+E",
			},
			{ type: "separator" },
			{
				label: "Öffnen",
				icon: path.join(__dirname, "img", "menu", "kartei-oeffnen.png"),
				click: () => appMenu.aktion("kartei-oeffnen", ""),
				accelerator: "CommandOrControl+O",
			},
			{
				label: "Zuletzt verwendet", // Menü wird über appMenu.zuletzt() gefüllt
				id: "kartei-zuletzt",
			},
			{ type: "separator" },
			{
				label: "Speichern",
				icon: path.join(__dirname, "img", "menu", "kartei-speichern.png"),
				click: () => appMenu.aktion("kartei-speichern"),
				accelerator: "CommandOrControl+S",
				id: "kartei-speichern",
			},
			{
				label: "Speichern unter",
				icon: path.join(__dirname, "img", "menu", "kartei-speichern-unter.png"),
				click: () => appMenu.aktion("kartei-speichern-unter"),
				accelerator: "CommandOrControl+Shift+S",
				id: "kartei-speichern-unter",
			},
			{ type: "separator" },
			{
				label: "Schließen",
				icon: path.join(__dirname, "img", "menu", "kartei-schliessen.png"),
				click: () => appMenu.aktion("kartei-schliessen"),
				accelerator: "CommandOrControl+W",
				id: "kartei-schliessen",
			},
			{ type: "separator" },
			{
				label: "Formvarianten",
				icon: path.join(__dirname, "img", "menu", "kartei-formvarianten.png"),
				click: () => appMenu.aktion("kartei-formvarianten"),
				id: "kartei-formvarianten",
			},
			{
				label: "Notizen",
				icon: path.join(__dirname, "img", "menu", "kartei-notizen.png"),
				click: () => appMenu.aktion("kartei-notizen"),
				id: "kartei-notizen",
			},
			{
				label: "Anhänge",
				icon: path.join(__dirname, "img", "menu", "kartei-anhaenge.png"),
				click: () => appMenu.aktion("kartei-anhaenge"),
				id: "kartei-anhaenge",
			},
			{
				label: "Überprüfte Lexika",
				icon: path.join(__dirname, "img", "menu", "kartei-lexika.png"),
				click: () => appMenu.aktion("kartei-lexika"),
				id: "kartei-lexika",
			},
			{
				label: "Metadaten",
				icon: path.join(__dirname, "img", "menu", "kartei-metadaten.png"),
				click: () => appMenu.aktion("kartei-metadaten"),
				id: "kartei-metadaten",
			},
			{
				label: "Redaktion",
				icon: path.join(__dirname, "img", "menu", "kartei-redaktion.png"),
				click: () => appMenu.aktion("kartei-redaktion"),
				id: "kartei-redaktion",
			},
			{ type: "separator" },
			{
				label: "Bedeutungsgerüst",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen.png"),
				click: () => appMenu.aktion("kartei-bedeutungen"),
				accelerator: "CommandOrControl+B",
				id: "kartei-bedeutungen",
			},
			{
				label: "Bedeutungsgerüst wechseln",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen-wechseln.png"),
				click: () => appMenu.aktion("kartei-bedeutungen-wechseln"),
				id: "kartei-bedeutungen-wechseln",
			},
			{
				label: "Bedeutungsgerüst-Fenster",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen-fenster.png"),
				click: () => appMenu.aktion("kartei-bedeutungen-fenster"),
				accelerator: "CommandOrControl+Shift+B",
				id: "kartei-bedeutungen-fenster",
			},
			{ type: "separator" },
			{
				label: "Suche",
				icon: path.join(__dirname, "img", "menu", "kartei-suche.png"),
				click: () => appMenu.aktion("kartei-suche"),
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
				icon: path.join(__dirname, "img", "menu", "belege-hinzufuegen.png"),
				click: () => appMenu.aktion("belege-hinzufuegen"),
				accelerator: "CommandOrControl+N",
			},
			{
				label: "Auflisten",
				icon: path.join(__dirname, "img", "menu", "belege-auflisten.png"),
				click: () => appMenu.aktion("belege-auflisten"),
				accelerator: "CommandOrControl+L",
			},
			{
				label: "Sortieren",
				icon: path.join(__dirname, "img", "menu", "belege-sortieren.png"),
				click: () => appMenu.aktion("dialog-anzeigen", "Sorry!\nDiese Funktion ist noch nicht programmiert."), // TODO
				accelerator: "CommandOrControl+H",
			},
		],
	},
	{
		label: "B&earbeiten",
		submenu: [
			{
				label: "Rückgängig",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-rueckgaengig.png"),
				role: "undo",
			},
			{
				label: "Wiederherstellen",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-wiederherstellen.png"),
				role: "redo",
			},
			{ type: "separator" },
			{
				label: "Ausschneiden",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-ausschneiden.png"),
				role: "cut",
			},
			{
				label: "Kopieren",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-kopieren.png"),
				role: "copy",
			},
			{
				label: "Einfügen",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-einfuegen.png"),
				role: "paste",
			},
			{
				label: "Alles auswählen",
				icon: path.join(__dirname, "img", "menu", "bearbeiten-auswaehlen.png"),
				role: "selectAll",
			},
		],
	},
	{
		label: "&Hilfe",
		submenu: [
			{
				label: "Handbuch",
				icon: path.join(__dirname, "img", "menu", "hilfe.png"),
				click: () => fenster.erstellenNeben("handbuch"),
				accelerator: "F1",
			},
			{ type: "separator" },
			{
				label: "Technische Dokumentation",
				click: () => fenster.erstellenNeben("dokumentation"),
			},
			{ type: "separator" },
			{
				label: "Changelog",
				click: () => fenster.erstellenNeben("changelog"),
			},
			{ type: "separator" },
			{
				label: `Über ${app.getName().replace("'", "’")}`,
				click: () => fenster.erstellenUeber("app"),
			},
			{
				label: "Über Electron",
				click: () => fenster.erstellenUeber("electron"),
			},
		],
	},
];

let layoutMenuAnsicht = [
	{
		label: "&Ansicht",
		submenu: [
			{
				label: "Schrift vergrößern",
				icon: path.join(__dirname, "img", "menu", "ansicht-zoom-plus.png"),
				role: "zoomIn",
			},
			{
				label: "Schrift verkleinern",
				icon: path.join(__dirname, "img", "menu", "ansicht-zoom-minus.png"),
				role: "zoomOut",
			},
			{
				label: "Standardgröße",
				icon: path.join(__dirname, "img", "menu", "ansicht-zoom-standard.png"),
				role: "resetZoom",
			},
			{ type: "separator" },
			{
				label: "Vollbild",
				icon: path.join(__dirname, "img", "menu", "ansicht-vollbild.png"),
				role: "toggleFullScreen",
			},
		],
	},
];

// Ansicht im Hauptmenü ergänzen
layoutMenu.splice(layoutMenu.length - 1, 0, layoutMenuAnsicht[0]);

// ggf. Developer-Menü ergänzen
let devtools = false;
if (!app.isPackaged) {
	devtools = true;
	let menus = [layoutMenu, layoutMenuAnsicht];
	for (let i = 0, len = menus.length; i < len; i++) {
		menus[i].push({
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
	}
}

// Funktionen zum Menü
appMenu = {
	// überschreibt das Submenü mit den zuletzt verwendeten Karteien
	//   id = Number
	//     (die ID des betroffenen Fensters; kann 0 sein => kein Fenster betroffen)
	zuletzt (id) {
		// neues Submenü erzeugen
		let zuletztVerwendet = {
			label: "Zuletzt verwendet",
			icon: path.join(__dirname, "img", "menu", "kartei-zuletzt.png"),
			id: "kartei-zuletzt",
			submenu: [],
		};
		// Dateiliste ggf. ergänzen
		if (optionen.data.app.zuletzt) {
			let loeschen = [],
				zuletzt = optionen.data.app.zuletzt;
			for (let i = 0, len = zuletzt.length; i < len; i++) {
				// existiert die Datei noch?
				if (!fs.existsSync(zuletzt[i])) {
					loeschen.push(zuletzt[i]);
					continue;
				}
				// Datei dem Menü hinzufügen
				appMenu.zuletztItem(zuletztVerwendet, zuletzt[i], i);
			}
			// ggf. gelöschte Dateien aus der Kartei-Liste entfernen
			if (loeschen.length) {
				for (let i = 0, len = loeschen.length; i < len; i++) {
					zuletzt.splice(zuletzt.indexOf(loeschen[i]), 1);
				}
				// bereingte Kartei-Liste an den Renderer-Prozess schicken
				if (id) {
					appMenu.aktion("optionen-zuletzt", optionen.data.app.zuletzt);
				}
			}
		}
		// ggf. Löschmenü hinzufügen
		if (zuletztVerwendet.submenu.length) {
			zuletztVerwendet.submenu.push(
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
		layoutMenu[1].submenu[pos] = zuletztVerwendet;
		// Menü ggf. auffrischen
		if (id) {
			appMenu.erzeugen(id);
		}
	},
	// Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
	zuletztItem (zuletztVerwendet, datei, i) {
		let item = {
			label: path.basename(datei, ".wgd"),
			sublabel: datei,
			click: () => appMenu.aktion("kartei-oeffnen", datei),
		};
		if (i <= 8) {
			item.accelerator = `CommandOrControl+${i + 1}`;
		}
		zuletztVerwendet.submenu.push(item);
	},
	// Menü mit zuletzt benutzten Dateien leeren
	zuletztLoeschen () {
		optionen.data.app.zuletzt = [];
		appMenu.aktion("optionen-zuletzt", optionen.data.app.zuletzt);
		optionen.schreiben();
		appMenu.zuletzt(BrowserWindow.getFocusedWindow().id);
	},
	// Menü-Elemente deaktivieren, wenn keine Kartei offen ist
	//   disable = Boolean
	//     (Menü-Element deaktiveren oder eben nicht)
	//   id = Number
	//     (die ID des betroffenen Fensters; kann 0 sein => kein Fenster betroffen)
	deaktivieren (disable, id) {
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
		let menu = Menu.buildFromTemplate(layoutMenu);
		BrowserWindow.fromId(id).setMenu(menu);
	},
	// erzeugt ein Menü, das nur den Punkt Ansicht hat und versteckt wird
	//   fenster = Object
	//     (das Fenster-Objekt, in dem das Menü erscheinen soll)
	erzeugenAnsicht (fenster) {
		let menu = Menu.buildFromTemplate(layoutMenuAnsicht);
		fenster.setMenu(menu);
		fenster.setMenuBarVisibility(false);
	},
	// führt die gewählte Aktion im aktuellen Fenster aus
	//   aktion = String
	//     (die Aktion)
	aktion (aktion) {
		let w = BrowserWindow.getFocusedWindow();
		if (aktion === "programm-beenden") {
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				BrowserWindow.fromId(parseInt(id, 10)).close();
			}
		} else {
			w.webContents.send(aktion);
		}
	},
};

// Menüs deaktivieren, die nur bei offenen Karteikarten funktionieren
appMenu.deaktivieren(true, 0);

// Menüse aktivieren/deaktivieren, wenn der Renderer-Prozess es wünscht
ipcMain.on("menus-deaktivieren", (evt, disable, id) => appMenu.deaktivieren(disable, id));

// Programm-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-app", () => fenster.erstellenUeber("app"));

// Electron-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-electron", () => fenster.erstellenUeber("electron"));

// Druckauftrag aus dem Bedeutungsgerüst-Fenster an den Renderer-Prozess schicken
ipcMain.on("bedeutungen-fenster-drucken", function(evt, daten) {
	let w = BrowserWindow.fromId(daten.winId);
	daten = daten.gr;
	w.webContents.send("bedeutungen-fenster-drucken", daten);
	if (w.isMinimized()) {
		w.restore();
	}
	w.focus();
});

// angeklickte Bedeutung im Gerüst-Fenster eintragen
ipcMain.on("bedeutungen-fenster-eintragen", function(evt, bd) {
	let w = BrowserWindow.fromId(bd.winId);
	delete bd.winId;
	w.webContents.send("bedeutungen-fenster-eintragen", bd);
	if (w.isMinimized()) {
		w.restore();
	}
	w.focus();
});

// angeklickte Bedeutung im Gerüst-Fenster austragen
ipcMain.on("bedeutungen-fenster-austragen", function(evt, bd) {
	let w = BrowserWindow.fromId(bd.winId);
	delete bd.winId;
	w.webContents.send("bedeutungen-fenster-austragen", bd);
	if (w.isMinimized()) {
		w.restore();
	}
	w.focus();
});

// Status des gerade geschlossenen Bedeutungsgerüst-Fensters an das passende Hauptfenster schicken
ipcMain.on("bedeutungen-fenster-status", function(evt, status) {
	let w = BrowserWindow.fromId(status.winId);
	delete status.winId;
	w.webContents.send("bedeutungen-fenster-status", status);
});

// Handbuch aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-handbuch", () => fenster.erstellenNeben("handbuch"));

// Changelog aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-changelog", () => fenster.erstellenNeben("changelog"));

// Optionen einlesen und speichern
optionen = {
	// Pfad zur Optionen-Datei
	pfad: path.join(app.getPath("userData"), "einstellungen.json"),
	// Objekt mit den gespeicherten Optionen
	data: {
		fenster: {
			x: undefined,
			y: undefined,
			width: 1100,
			height: undefined,
			maximiert: false,
		},
		app: {},
	},
	// liest die Optionen-Datei aus
	lesen () {
		if (fs.existsSync(optionen.pfad)) {
			const content = fs.readFileSync(optionen.pfad, "utf-8");
			try {
				let data = JSON.parse(content);
				for (let satz in data) {
					if (!data.hasOwnProperty(satz)) {
						continue;
					}
					optionen.data[satz] = data[satz];
				}
			} catch (json_err) {
				// kann die Optionen-Datei nicht eingelesen werden, ist sie wohl korrupt;
				// dann lösche ich sie halt einfach
				fs.unlinkSync(optionen.pfad);
			}
		}
	},
	// überschreibt die Optionen-Datei
	schreiben () {
		// TODO umarbeiten
// 		fs.writeFile(optionen.pfad, JSON.stringify(optionen.data), function(err) {
// 			if (err) {
// 				appMenu.aktion("dialog-anzeigen", `Die Optionen-Datei konnte nicht gespeichert werden.\n<h3>Fehlermeldung</h3>\n${err.message}`);
// 			}
// 		});
	},
};

// Optionen initial einlesen
optionen.lesen();

// Optionen auf Anfrage des Renderer-Prozesses synchron schicken
ipcMain.on("optionen-senden", function(evt) {
	evt.returnValue = optionen.data.app;
});

// Optionen vom Renderer Process abfangen und speichern
ipcMain.on("optionen-speichern", function(evt, opt, id) {
	if (optionen.data.app.zuletzt &&
			optionen.data.app.zuletzt.join(",") !== opt.zuletzt.join(",")) {
		optionen.data.app = opt;
		appMenu.zuletzt(id); // Das sollte nicht unnötig oft aufgerufen werden!
	} else {
		optionen.data.app = opt;
	}
	optionen.schreiben();
});

// Browser-Fenster
fenster = {
	// Hauptfenster erstellen
	erstellen () {
		// Fenster öffnen
		let bw = new BrowserWindow({
			title: app.getName().replace("'", "’"),
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			x: optionen.data.fenster.x,
			y: optionen.data.fenster.y,
			width: optionen.data.fenster.width,
			height: optionen.data.fenster.height,
			minWidth: 600,
			minHeight: 350,
			autoHideMenuBar: optionen.data.app.einstellungen && optionen.data.app.einstellungen.autoHideMenuBar ? true : false, // optionen.data.app.einstellungen könnte noch fehlen (wenn keine Optionen-Datei vorhanden)
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Fenster-Objekt anlegen
		win[bw.id] = {
			typ: "index",
			kartei: "",
		};
		// Menü erzeugen
		appMenu.erzeugen(bw.id);
		// HTML laden
		BrowserWindow.fromId(bw.id).loadFile(path.join(__dirname, "index.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		BrowserWindow.fromId(bw.id).once("ready-to-show", function() {
			// ggf. übergebene Kartei öffnen
			if (/\.wgd$/.test(process.argv[1])) {
				// ein bisschen Timeout, sonst klappt das nicht
				setTimeout(() => this.webContents.send("kartei-oeffnen", process.argv[1]), 100);
			}
			// Fenster anzeigen
			this.show();
			// ggf. maximieren
			if (optionen.data.fenster.maximiert) {
				this.maximize();
			}
		});
	},
	// Neben-Fenster erstellen
	//   typ = String
	//     (der Typ des Neben-Fensters: "handbuch" || "dokumentation" || "changelog")
	erstellenNeben (typ) {
		// Ist das Fenster bereits offen? => Fenster fokussieren
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ === typ) {
				let w = BrowserWindow.fromId(parseInt(id, 10));
				if (w.isMinimized()) {
					w.restore();
				}
				w.focus();
				return;
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
		if (typ === "changelog") {
			title = "Changelog";
			bounds.width = 625;
			bounds.height = 625;
			bounds.minWidth = 350;
			bounds.minHeight = 350;
		} else if (typ === "dokumentation") {
			title = "Technische Dokumentation";
		} else if (typ === "handbuch") {
			title = "Handbuch";
		}
		// Fenster öffnen
		let bw = new BrowserWindow({
			title: title,
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			width: bounds.width,
			height: bounds.height,
			minWidth: bounds.minWidth,
			minHeight: bounds.minHeight,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Fenster-Objekt anlegen
		win[bw.id] = {
			typ: typ,
			kartei: "",
		};
		// Menü erzeugen
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
			}, 1);
		});
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${typ}.html`));
		// Fenster anzeigen, sobald alles geladen wurde
		bw.once("ready-to-show", function() {
			this.show();
		});
	},
	// Über-Fenster erstellen
	//   typ = String
	//     (der Typ des Über-Fensters: "app" || "electron")
	erstellenUeber (typ) {
		// Titel Name der Seite ermitteln
		let title, html;
		if (typ === "app") {
			title = `Über ${app.getName().replace("'", "’")}`;
			html = "ueberApp";
		} else {
			title = "Über Electron";
			html = "ueberElectron";
		}
		// Fenster öffnen
		let bw = new BrowserWindow({
			parent: BrowserWindow.getFocusedWindow(),
			modal: true,
			title: title,
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			width: 650,
			height: 334,
			useContentSize: true,
			center: true,
			resizable: false,
			minimizable: false,
			maximizable: false,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Fenster-Objekt anlegen
		win[bw.id] = {
			typ: html,
			kartei: "",
		};
		// Menü abschalten
		bw.setMenuBarVisibility(false); // unpaketiert erscheint sonst ein Standardmenü
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${html}.html`));
		// Fenster anzeigen, sobald alles geladen wurde
		bw.once("ready-to-show", function() {
			this.show();
		});
	},
};

// Optionen auf Anfrage des Renderer-Prozesses synchron schicken
ipcMain.on("fenster-dereferenzieren", function(evt, id) {
	delete win[id];
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
	if (!hauptfensterOffen) {
		appMenu.aktion("programm-beenden");
	}
});

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", function() {
	// Menu der zuletzt verwendeter Karteien erzeugen
	appMenu.zuletzt(0);
	// Informationen zum Bildschirm auslesen und ggf. speichern
	const Bildschirm = require("electron").screen.getPrimaryDisplay();
	// Fenster standardmäßig maximalisiert öffnen
	if (optionen.data.fenster.height === undefined) {
		optionen.data.fenster.height = Bildschirm.workArea.height;
	}
	// warten mit dem Öffnen des Fensters, bis die Optionen eingelesen wurden
	fenster.erstellen();
});

// App beenden, wenn alle Fenster geschlossen worden sind
app.on("window-all-closed", function() {
	// auf MacOS bleibt das Programm üblicherweise aktiv,
	// bis die BenutzerIn es explizit beendet
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// App wiederherstellen, bzw. wieder öffnen
app.on("activate", function() {
	// auf MacOS wird einfach ein neues Fenster wiederhergestellt
	if (Object.keys(win).length === 0) {
		fenster.erstellen();
	}
});
