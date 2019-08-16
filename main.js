"use strict";

/* VARIABLEN ************************************/

// Speicher-Objekt für die Fenster; Format der Einträge:
//   "Fenster-ID" (numerischer String, beginnend mit 1; wird von Electron vergeben)
//     typ: String (Typ des Fensters, "index" für Hauptfenster)
//     kartei: String (Pfad zur Kartei, die gerade in dem Fenster geladen ist;
//       immer leer in Fenstern, die nicht typ === "index" sind;
//       kann in Fenstern vom typ === "index" leer sein, dann ist keine Kartei geladen;
//       kann in Fenstern vom typ === "index" auch "neu" sein, dann wurde die Karte erstellt,
//       aber noch nicht gespeichert)
// (die Bedeutungsgerüst-Fenster sind direkt an ein Hauptfenster gebunden
// und werden auch aus diesem geöffnet; sie werden hier nicht referenziert)
let win = {};

// Funktionen-Container
let appMenu, optionen, fenster;

// Electron-Features einbinden
const {app, BrowserWindow, ipcMain, Menu} = require("electron"),
	fs = require("fs"),
	path = require("path");


/* LOCALE SETZEN ********************************/

app.commandLine.appendSwitch("lang", "de");


/* SINGLE-INSTANCE ******************************/

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
				fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
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
			fenster.erstellen(argv[1]);
		}
	}
});


/* BILDERLISTE **********************************/

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


/* APP-MENÜ *************************************/

// Menü-Vorlagen
let layoutMenu = [
	{
		label: "&Programm",
		submenu: [
			{
				label: "Neues Fenster",
				icon: path.join(__dirname, "img", "menu", "programm-neues-fenster.png"),
				click: () => fenster.erstellen(""),
			},
			{ type: "separator" },
			{
				label: "Karteisuche",
				icon: path.join(__dirname, "img", "menu", "programm-karteisuche.png"),
				click: () => appMenu.aktion("programm-karteisuche"),
			},
			{ type: "separator" },
			{
				label: "Einstellungen",
				icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
				click: () => appMenu.aktion("programm-einstellungen"),
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
				accelerator: "CommandOrControl+Alt+B",
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
			{ type: "separator" },
			{
				label: "Kopieren",
				icon: path.join(__dirname, "img", "menu", "belege-kopieren.png"),
				click: () => appMenu.aktion("belege-kopieren"),
			},
			{
				label: "Einfügen",
				icon: path.join(__dirname, "img", "menu", "belege-einfuegen.png"),
				click: () => appMenu.aktion("belege-einfuegen"),
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
			{
				label: "Technische Dokumentation",
				click: () => fenster.erstellenNeben("dokumentation"),
			},
			{ type: "separator" },
			{
				label: "Changelog",
				click: () => fenster.erstellenNeben("changelog"),
			},
			{
				label: "Fehlerlog",
				click: () => fenster.erstellenNeben("fehlerlog"),
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

// Funktionen zum App-Menü
appMenu = {
	// überschreibt das Submenü mit den zuletzt verwendeten Karteien
	//   update = Boolean
	//     (die Fenster sollen ein Update über die zuletzt geöffneten Dateien erhalten)
	zuletzt (update) {
		// neues Submenü erzeugen
		let zuletztVerwendet = {
			label: "Zuletzt verwendet",
			icon: path.join(__dirname, "img", "menu", "kartei-zuletzt.png"),
			id: "kartei-zuletzt",
			submenu: [],
		};
		// Dateiliste ggf. ergänzen
		if (optionen.data.zuletzt) {
			let loeschen = [],
				zuletzt = optionen.data.zuletzt;
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
		// Menüs in den Hauptfenstern ggf. auffrischen
		if (update) {
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				if (win[id].typ !== "index") {
					continue;
				}
				// Fenster des Renderer-Prozess ermitteln
				let w = BrowserWindow.fromId(parseInt(id, 10));
				// App-Menü des Renderer-Prozesses auffrischen
				let disable = false;
				if (!win[id].kartei) {
					disable = true;
				}
				appMenu.deaktivieren(disable, w.id);
				// Dateiliste an den Renderer-Prozess schicken
				w.webContents.send("optionen-zuletzt", optionen.data.zuletzt);
			}
		}
	},
	// Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
	//   zuletztVerwendet = Object
	//     (der Menüpunkt "Zuletzt verwendet")
	//   datei = String
	//     (Dateipfad)
	//   i = Number
	//     (Index-Punkt, an dem sich die Datei befindet)
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
		optionen.data.zuletzt = [];
		optionen.schreiben();
		appMenu.zuletzt(true);
	},
	// Menü-Elemente deaktivieren, wenn keine Kartei offen ist
	//   disable = Boolean
	//     (Menü-Element deaktiveren oder eben nicht)
	//   id = Number
	//     (die ID des betroffenen Fensters; konnte auch mal 0 sein => kein Fenster betroffen)
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
	//   parameter = String || Array || undefined
	//     (einige Aktionen bekommen einen Wert übergeben; im Falle der zuletzt geöffneten
	//     Dateien kann es auch ein Array sein)
	aktion (aktion, parameter) {
		let w = BrowserWindow.getFocusedWindow();
		if (aktion === "programm-beenden") {
			for (let id in win) {
				if (!win.hasOwnProperty(id)) {
					continue;
				}
				BrowserWindow.fromId(parseInt(id, 10)).close();
			}
		} else if (parameter) {
			w.webContents.send(aktion, parameter);
		} else {
			w.webContents.send(aktion);
		}
	},
};

// Menüse aktivieren/deaktivieren, wenn der Renderer-Prozess es wünscht
ipcMain.on("menus-deaktivieren", (evt, disable, id) => appMenu.deaktivieren(disable, id));

// das Programm auf Wunsch eines Renderer-Prozesses komplett beenden
ipcMain.on("programm-beenden", () => appMenu.aktion("programm-beenden"));


/* OPTIONEN *************************************/

// Funktionen zu den Optionen
optionen = {
	// Pfad zur Optionen-Datei
	pfad: path.join(app.getPath("userData"), "einstellungen.json"),
	// Objekt mit den gespeicherten Optionen
	data: {},
	// liest die Optionen-Datei aus
	lesen () {
		if (fs.existsSync(optionen.pfad)) {
			const content = fs.readFileSync(optionen.pfad, "utf-8");
			try {
				let data = JSON.parse(content);
				if (data.app) {
					// bis Version 0.11.0 waren die Optionen widersinnigerweise in verschiedene Zweige aufgeteilt; das kommt jetzt alles in optionen.data, sodass die Daten in den Renderer-Prozessen und im Main-Prozess komplett an einem identischen Ort liegen
					optionen.data = data.app;
					optionen.data.fenster = data.fenster;
					optionen.data["fenster-bedeutungen"] = data["fenster-bedeutungen"];
				} else {
					optionen.data = data;
				}
			} catch (json_err) {
				// kann die Optionen-Datei nicht eingelesen werden, ist sie wohl korrupt;
				// dann lösche ich sie halt einfach
				fs.unlinkSync(optionen.pfad);
			}
		}
	},
	// Optionen werden nicht sofort geschrieben, sondern erst nach einem Timeout
	schreibenTimeout: null,
	// überschreibt die Optionen-Datei
	schreiben () {
		fs.writeFile(optionen.pfad, JSON.stringify(optionen.data), function(err) {
			if (err) {
				appMenu.aktion("dialog-anzeigen", `Die Optionen-Datei konnte nicht gespeichert werden.\n<h3>Fehlermeldung</h3>\n${err.message}`);
			}
		});
	},
};

// Optionen initial einlesen
optionen.lesen();

// Optionen auf Anfrage des Renderer-Prozesses synchron schicken
ipcMain.on("optionen-senden", evt => evt.returnValue = optionen.data);

// Optionen vom Renderer Process abfangen und speichern
ipcMain.on("optionen-speichern", function(evt, opt, winId) {
	// Optionen übernehmen
	if (optionen.data.zuletzt &&
			optionen.data.zuletzt.join(",") !== opt.zuletzt.join(",")) {
		optionen.data = opt;
		appMenu.zuletzt(true); // Das sollte nicht unnötig oft aufgerufen werden!
	} else {
		optionen.data = opt;
	}
	// Optionen an alle Hauptfenster schicken, mit Ausnahme dem der übergebenen id
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


/* BROWSER-FENSTER ******************************/

// Funktionen zu den Browser-Fenstern
fenster = {
	// Hauptfenster erstellen
	//   kartei = String
	//     (Pfad zur Kartei, die geöffnet werden soll)
	erstellen (kartei) {
		// Fenster öffnen
		// (die Optionen können noch fehlen)
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		let bw = new BrowserWindow({
			title: app.getName().replace("'", "’"),
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			x: optionen.data.fenster ? optionen.data.fenster.x : null,
			y: optionen.data.fenster ? optionen.data.fenster.y : null,
			width: optionen.data.fenster ? optionen.data.fenster.width : 1100,
			height: optionen.data.fenster ? optionen.data.fenster.height : Bildschirm.workArea.height,
			minWidth: 600,
			minHeight: 350,
			autoHideMenuBar: optionen.data.einstellungen ? optionen.data.einstellungen.autoHideMenuBar : false,
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
			kartei: "", // hier steht nichts oder ein Pfad; wurde die Kartei erstellt, aber noch nicht gespeichert hat es den Wert "neu"; nach dem ersten Speichern steht auch hier der Pfad
		};
		// Menüs, die nur bei offenen Karteikarten funktionieren, deaktivieren und diese Menüs an das neue Fenster hängen
		appMenu.deaktivieren(true, bw.id);
		// HTML laden
		BrowserWindow.fromId(bw.id).loadFile(path.join(__dirname, "index.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		BrowserWindow.fromId(bw.id).once("ready-to-show", function() {
			// ggf. übergebene Kartei öffnen
			if (/\.wgd$/.test(process.argv[1]) || kartei) {
				let datei = kartei;
				if (!datei) {
					datei = process.argv[1];
				}
				// ein bisschen Timeout, sonst klappt das nicht
				setTimeout(() => this.webContents.send("kartei-oeffnen", datei), 100);
			}
			// Fenster anzeigen
			this.show();
			// ggf. maximieren
			// (die Option kann noch fehlen)
			if (optionen.data.fenster &&
					optionen.data.fenster.maximiert) {
				this.maximize();
			}
		});
		// ID des Fensters zurückgeben (wird mitunter direkt benötigt)
		return bw.id;
	},
	// Neben-Fenster erstellen
	//   typ = String
	//     (der Typ des Neben-Fensters: "handbuch" || "dokumentation" || "changelog" || "fehlerlog")
	erstellenNeben (typ) {
		// Ist das Fenster bereits offen? => Fenster fokussieren
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ === typ) {
				fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
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
		if (typ === "changelog" || typ === "fehlerlog") {
			title = typ.substring(0, 1).toUpperCase() + typ.substring(1);
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
	// das übergebene Fenster fokussieren
	//   w = Object
	//     (das Fenster-Objekt)
	fokus (w) {
		if (w.isMinimized()) {
			w.restore();
		}
		setTimeout(() => w.focus(), 25); // Timeout, damit das Fenster zuverlässig den Fokus bekommt
	},
};

// Handbuch aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-handbuch", () => fenster.erstellenNeben("handbuch"));

// Dokumentation aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-dokumentation", () => fenster.erstellenNeben("dokumentation"));

// Changelog aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-changelog", () => fenster.erstellenNeben("changelog"));

// Programm-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-app", () => fenster.erstellenUeber("app"));

// Electron-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-electron", () => fenster.erstellenUeber("electron"));

// Druckauftrag aus dem Bedeutungsgerüst-Fenster an den Renderer-Prozess schicken
ipcMain.on("bedeutungen-fenster-drucken", function(evt, daten) {
	let w = BrowserWindow.fromId(daten.winId);
	daten = daten.gr;
	w.webContents.send("bedeutungen-fenster-drucken", daten);
	fenster.fokus(w);
});

// angeklickte Bedeutung im Gerüst-Fenster eintragen
ipcMain.on("bedeutungen-fenster-eintragen", function(evt, bd) {
	let w = BrowserWindow.fromId(bd.winId);
	delete bd.winId;
	w.webContents.send("bedeutungen-fenster-eintragen", bd);
	fenster.fokus(w);
});

// angeklickte Bedeutung im Gerüst-Fenster austragen
ipcMain.on("bedeutungen-fenster-austragen", function(evt, bd) {
	let w = BrowserWindow.fromId(bd.winId);
	delete bd.winId;
	w.webContents.send("bedeutungen-fenster-austragen", bd);
	fenster.fokus(w);
});

// Status des gerade geschlossenen Bedeutungsgerüst-Fensters an das passende Hauptfenster schicken
ipcMain.on("bedeutungen-fenster-status", function(evt, status) {
	let w = BrowserWindow.fromId(status.winId);
	delete status.winId;
	w.webContents.send("bedeutungen-fenster-status", status);
});

// neue Kartei zu einem neuen Wort anlegen
ipcMain.on("neues-wort", function() {
	// neues Fenster öffnen oder ein bestehendes nutzen?
	let neuesFenster = true,
		timeout = 1500,
		winId = 0;
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].typ === "index" && !win[id].kartei) {
			winId = parseInt(id, 10);
			timeout = 0;
			neuesFenster = false;
			break;
		}
	}
	if (neuesFenster) {
		winId = fenster.erstellen("");
	}
	// das Fenster fokussieren
	let w = BrowserWindow.fromId(winId);
	fenster.fokus(w);
	// nach dem Wort fragen
	setTimeout(() => w.webContents.send("kartei-erstellen"), timeout);
});

// überprüft für den Renderer-Prozess, ob die übergebene Kartei schon offen ist
ipcMain.on("kartei-schon-offen", function(evt, kartei) {
	let offen = false;
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (win[id].kartei === kartei) {
			fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
			offen = true;
			break;
		}
	}
	evt.returnValue = offen;
});

// die übergebene Kartei laden (in einem neuen oder bestehenden Hauptfenster)
ipcMain.on("kartei-laden", function(evt, kartei, in_leerem_fenster = true) {
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
ipcMain.on("kartei-geoeffnet", (evt, id, kartei) => {
	if (!win[id]) {
		// im Developer-Modus kann man den WebContent eines Fensters neu laden =>
		// das Fenster wird aus win{} gelöscht und muss jetzt erst wieder angelegt werden,
		// sonst produziert das einen Fehler und der Main-Prozess macht auch
		// andere Dinge nicht mehr korrekt
		win[id] = {
			typ: "index",
			kartei: "",
		};
	}
	win[id].kartei = kartei;
});

// deregistriert im Fenster-Objekt die Kartei, die geöffnet war
ipcMain.on("kartei-geschlossen", (evt, id) => win[id].kartei = "");

// neues, leeres Hauptfenster öffnen
ipcMain.on("fenster-oeffnen", (evt) => fenster.erstellen(""));

// feststellen, ob ein weiteres Hauptfenster offen ist
ipcMain.on("fenster-hauptfenster", function(evt, idFrage) {
	let hauptfensterOffen = false;
	for (let id in win) {
		if (!win.hasOwnProperty(id)) {
			continue;
		}
		if (parseInt(id, 10) === idFrage) {
			continue;
		}
		if (win[id].typ === "index") {
			hauptfensterOffen = true;
			break;
		}
	}
	evt.returnValue = hauptfensterOffen;
});

// Fenster wurde geschlossen => im Fensterobjekt dereferenzieren
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


/* KOPIEREN *************************************/

// Basisdaten zu den möglichten Belegquellen ermitteln und an das anfragende Fenster schicken
let kopierenBasisdaten = {},
	kopierenBasisdatenTimeout = null;

ipcMain.on("kopieren-basisdaten", function(evt, winId) {
	// Daten zurücksetzen
	kopierenBasisdaten = {
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
	kopierenBasisdatenTimeout = setTimeout(function() {
		let w = BrowserWindow.fromId(kopierenBasisdaten.win);
		w.webContents.send("kopieren-basisdaten-empfangen", kopierenBasisdaten.daten);
	}, 25);
});

// angefragte Basisdaten registrieren und an das anfragende Fenster schicken
ipcMain.on("kopieren-basisdaten-lieferung", function(evt, daten) {
	// keine Daten
	if (!daten.belege) {
		return;
	}
	// Daten registrieren
	kopierenBasisdaten.daten[daten.id] = {};
	kopierenBasisdaten.daten[daten.id].belege = daten.belege;
	kopierenBasisdaten.daten[daten.id].gerueste = [...daten.gerueste];
	kopierenBasisdaten.daten[daten.id].wort = daten.wort;
	// Daten an das anfragende Fenster schicken
	// (damit nicht mehrere Meldungen gesendet werden => Timeout)
	clearTimeout(kopierenBasisdatenTimeout);
	kopierenBasisdatenTimeout = setTimeout(function() {
		let w = BrowserWindow.fromId(kopierenBasisdaten.win);
		w.webContents.send("kopieren-basisdaten-empfangen", kopierenBasisdaten.daten);
	}, 25);
});

// Daten der gewünschten Belegquelle anfragen
let kopierenWinIdAnfrage = -1;

ipcMain.on("kopieren-daten", function(evt, winIdQuelle, winIdAnfrage) {
	// Existiert das Fenster, aus dem die Daten kommen sollen, noch?
	if (!win[winIdQuelle]) {
		let w = BrowserWindow.fromId(winIdAnfrage);
		w.webContents.send("dialog-anzeigen", "Beim Kopieren der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDas Fenster, das die Belege liefern sollte, existiert nicht mehr.");
		return;
	}
	// Fenster existiert => Daten anfragen
	kopierenWinIdAnfrage = winIdAnfrage;
	let w = BrowserWindow.fromId(winIdQuelle);
	w.webContents.send("kopieren-daten");
});

// angefragte Daten der gewünschten Belegquelle an das anfragende Fenster schicken
ipcMain.on("kopieren-daten-lieferung", function(evt, daten) {
	let w = BrowserWindow.fromId(kopierenWinIdAnfrage);
	w.webContents.send("kopieren-daten-empfangen", daten);
});


/* APP ******************************************/

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", function() {
	// Menu der zuletzt verwendeter Karteien erzeugen
	appMenu.zuletzt(false);
	// warten mit dem Öffnen des Fensters, bis die Optionen eingelesen wurden
	fenster.erstellen("");
});

// App beenden, wenn alle Fenster geschlossen worden sind
app.on("window-all-closed", function() {
	// auf MacOS bleibt das Programm üblicherweise aktiv,
	// bis die BenutzerIn es explizit beendet
	if (process.platform !== "darwin") {
		// Optionen schreiben
		clearTimeout(optionen.schreibenTimeout);
		optionen.schreiben();
		// App beenden
		app.quit();
	}
});

// App wiederherstellen, bzw. wieder öffnen
app.on("activate", function() {
	// auf MacOS wird einfach ein neues Fenster wiederhergestellt
	if (Object.keys(win).length === 0) {
		fenster.erstellen("");
	}
});


/* PROGRAMMFEHLER *******************************/

let fehler = [];

ipcMain.on("fehler", function(evt, err) {
	fehler.push(err);
});

ipcMain.on("fehler-senden", evt => evt.returnValue = fehler);

process.on("uncaughtException", function(err) {
	fehler.push({
		time: new Date().toISOString(),
		word: "",
		fileWgd: "",
		fileJs: "main.js",
		message: err.stack,
		line: 0,
		column: 0,
	});
	// auf der Konsole auswerfen, wenn nicht gepackt
	if (devtools) {
		console.log(`\x1b[47m\x1b[31m${err.stack}\x1b[0m`);
	}
});
