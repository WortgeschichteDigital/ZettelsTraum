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

app.commandLine.appendSwitch("lang", "de"); // BUG funktioniert seit Electron 5.0.x nicht mehr: https://github.com/electron/electron/issues/17995


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
		label: `&${app.getName().replace("'", "’")}`,
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
				click: () => appMenu.aktion("app-karteisuche"),
			},
			{ type: "separator" },
			{
				label: "Einstellungen",
				icon: path.join(__dirname, "img", "menu", "zahnrad.png"),
				click: () => appMenu.aktion("app-einstellungen"),
			},
			{ type: "separator" },
			{
				label: "Beenden",
				icon: path.join(__dirname, "img", "menu", "ausgang.png"),
				click: () => appMenu.aktion("app-beenden"),
				accelerator: "CommandOrControl+Q",
			},
		],
	},
	{
		label: "&Kartei",
		submenu: [
			{
				label: "Erstellen",
				icon: path.join(__dirname, "img", "menu", "dokument-plus.png"),
				click: () => appMenu.aktion("kartei-erstellen"),
				accelerator: "CommandOrControl+E",
			},
			{ type: "separator" },
			{
				label: "Öffnen",
				icon: path.join(__dirname, "img", "menu", "oeffnen.png"),
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
				icon: path.join(__dirname, "img", "menu", "speichern.png"),
				click: () => appMenu.aktion("kartei-speichern"),
				accelerator: "CommandOrControl+S",
				id: "kartei-speichern",
			},
			{
				label: "Speichern unter",
				icon: path.join(__dirname, "img", "menu", "speichern-unter.png"),
				click: () => appMenu.aktion("kartei-speichern-unter"),
				accelerator: "CommandOrControl+Shift+S",
				id: "kartei-speichern-unter",
			},
			{ type: "separator" },
			{
				label: "Schließen",
				icon: path.join(__dirname, "img", "menu", "x-dick.png"),
				click: () => appMenu.aktion("kartei-schliessen"),
				accelerator: "CommandOrControl+W",
				id: "kartei-schliessen",
			},
			{ type: "separator" },
			{
				label: "Formvarianten",
				icon: path.join(__dirname, "img", "menu", "formvarianten.png"),
				click: () => appMenu.aktion("kartei-formvarianten"),
				id: "kartei-formvarianten",
			},
			{
				label: "Notizen",
				icon: path.join(__dirname, "img", "menu", "stift.png"),
				click: () => appMenu.aktion("kartei-notizen"),
				id: "kartei-notizen",
			},
			{
				label: "Anhänge",
				icon: path.join(__dirname, "img", "menu", "bueroklammer.png"),
				click: () => appMenu.aktion("kartei-anhaenge"),
				id: "kartei-anhaenge",
			},
			{
				label: "Überprüfte Lexika",
				icon: path.join(__dirname, "img", "menu", "buecher.png"),
				click: () => appMenu.aktion("kartei-lexika"),
				id: "kartei-lexika",
			},
			{
				label: "Metadaten",
				icon: path.join(__dirname, "img", "menu", "zeilen-4,0.png"),
				click: () => appMenu.aktion("kartei-metadaten"),
				id: "kartei-metadaten",
			},
			{
				label: "Redaktion",
				icon: path.join(__dirname, "img", "menu", "personen.png"),
				click: () => appMenu.aktion("kartei-redaktion"),
				id: "kartei-redaktion",
			},
			{ type: "separator" },
			{
				label: "Bedeutungsgerüst",
				icon: path.join(__dirname, "img", "menu", "geruest.png"),
				click: () => appMenu.aktion("kartei-bedeutungen"),
				accelerator: "CommandOrControl+B",
				id: "kartei-bedeutungen",
			},
			{
				label: "Bedeutungsgerüst wechseln",
				icon: path.join(__dirname, "img", "menu", "geruest-zahnrad.png"),
				click: () => appMenu.aktion("kartei-bedeutungen-wechseln"),
				accelerator: "CommandOrControl+Alt+B",
				id: "kartei-bedeutungen-wechseln",
			},
			{
				label: "Bedeutungsgerüst-Fenster",
				icon: path.join(__dirname, "img", "menu", "fenster.png"),
				click: () => appMenu.aktion("kartei-bedeutungen-fenster"),
				accelerator: "CommandOrControl+Shift+B",
				id: "kartei-bedeutungen-fenster",
			},
			{ type: "separator" },
			{
				label: "Suche",
				icon: path.join(__dirname, "img", "menu", "lupe.png"),
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
				icon: path.join(__dirname, "img", "menu", "dokument-plus.png"),
				click: () => appMenu.aktion("belege-hinzufuegen"),
				accelerator: "CommandOrControl+N",
			},
			{
				label: "Auflisten",
				icon: path.join(__dirname, "img", "menu", "liste-bullets.png"),
				click: () => appMenu.aktion("belege-auflisten"),
				accelerator: "CommandOrControl+L",
			},
			{ type: "separator" },
			{
				label: "Kopieren",
				icon: path.join(__dirname, "img", "menu", "kopieren.png"),
				click: () => appMenu.aktion("belege-kopieren"),
			},
			{
				label: "Einfügen",
				icon: path.join(__dirname, "img", "menu", "einfuegen.png"),
				click: () => appMenu.aktion("belege-einfuegen"),
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
				click: () => fenster.erstellenNeben("handbuch"),
				accelerator: "F1",
			},
			{
				label: "Demonstrationskartei",
				click: () => appMenu.aktion("hilfe-demo"),
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

let layoutMenuMac = [
	{
		label: `${app.getName().replace("'", "’")}`,
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
let devtools = false;
if (!app.isPackaged || true) {
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

// Windows/Linux: standardmäßig kein Menü anzeigen
// (einzig verlässliche Methode, um Über-Fenster ohne Menü zu erzeugen)
if (process.platform !== "darwin") {
	Menu.setApplicationMenu(null);
}

// macOs: Menüvorlagen aufbereiten
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

// Funktionen zum App-Menü
appMenu = {
	// überschreibt das Submenü mit den zuletzt verwendeten Karteien
	//   update = Boolean
	//     (die Fenster sollen ein Update über die zuletzt geöffneten Dateien erhalten)
	zuletzt (update) {
		// für macOS gibt es ein anderes Menüsystem
		if (process.platform === "darwin") {
			return;
		}
		// neues Submenü erzeugen
		let zuletztVerwendet = {
			label: "Zuletzt verwendet",
			icon: path.join(__dirname, "img", "menu", "uhr.png"),
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
		let menu = Menu.buildFromTemplate(vorlage);
		Menu.setApplicationMenu(menu);
	},
	// führt die gewählte Aktion im aktuellen Fenster aus
	//   aktion = String
	//     (die Aktion)
	//   parameter = String || Array || undefined
	//     (einige Aktionen bekommen einen Wert übergeben; im Falle der zuletzt geöffneten
	//     Dateien kann es auch ein Array sein)
	aktion (aktion, parameter) {
		let w = BrowserWindow.getFocusedWindow();
		if (aktion === "app-beenden") {
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
ipcMain.on("app-beenden", () => appMenu.aktion("app-beenden"));


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
		// Position und Größe des Fensters ermitteln;
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		let x = optionen.data.fenster ? optionen.data.fenster.x : null,
			y = optionen.data.fenster ? optionen.data.fenster.y : null,
			width = optionen.data.fenster ? optionen.data.fenster.width : 1100,
			height = optionen.data.fenster ? optionen.data.fenster.height : Bildschirm.workArea.height;
		// Position des Fensters anpassen, falls das gerade fokussierte Fenster ein Hauptfenster ist
		let w = BrowserWindow.getFocusedWindow();
		if (w && win[w.id] && win[w.id].typ === "index") { // Test win[w.id] nur für Dev
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
			title: app.getName().replace("'", "’"),
			icon: fenster.icon(),
			x: x,
			y: y,
			width: width,
			height: height,
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
		// Windows/Linux: Menüs, die nur bei offenen Karteikarten funktionieren, deaktivieren; Menüleiste an das neue Fenster hängen
		// macOS: beim Fokussieren des Fensters Standardmenü erzeugen
		if (process.platform !== "darwin") {
			appMenu.deaktivieren(true, bw.id);
		} else if (process.platform === "darwin") {
			BrowserWindow.fromId(bw.id).on("focus", () => appMenu.erzeugenMac(layoutMenu));
		}
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
	//   abschnitt = String || undefined
	//     (Abschnitt, der im Fenster geöffnet werden soll; nur "handbuch" und "dokumentation")
	erstellenNeben (typ, abschnitt = "") {
		// Ist das Fenster bereits offen? => Fenster fokussieren
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
		let opt = {
			title: title,
			icon: fenster.icon(),
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
		};
		// ggf. die Position des Fensters festlegen; sonst wird es zentriert
		// (damit Handbuch und Dokumentation nicht übereinanderliegen,
		// wenn sie auseinander geöffnet werden)
		if (typ === "dokumentation" || typ === "handbuch") {
			let w = BrowserWindow.getFocusedWindow(),
				x = -1,
				y = -1;
			if (w && win[w.id] && /dokumentation|handbuch/.test(win[w.id].typ)) { // Test win[w.id] nur für Dev
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
		// Fenster-Objekt anlegen
		win[bw.id] = {
			typ: typ,
			kartei: "",
		};
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
				}, 1);
			});
		} else if (process.platform === "darwin") {
			bw.on("focus", () => appMenu.erzeugenMac(layoutMenuAnsicht));
		}
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${typ}.html`));
		// Fenster anzeigen, sobald alles geladen wurde
		bw.once("ready-to-show", function() {
			this.show();
			if (abschnitt) {
				let timeout = 0;
				if (process.platform === "darwin") {
					// macOS lahmt offenbar ein wenig mit dem Aufbau des Fensters;
					// gibt es kein Timeout, springt er niemals zum Abschnitt;
					// Timeout muss ziemlich hoch sein
					timeout = 500;
				}
				setTimeout(() => {
					// ohne Timeout funktioniert es zumindest unter macOS nicht;
					// das Fenster braucht wohl ein wenig Zeit, um sich aufzubauen
					this.webContents.send("oeffne-abschnitt", abschnitt);
				}, timeout);
			}
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
			icon: fenster.icon(),
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
		// Windows/Linux: Menü nur erzeugen, wenn Dev-Tools zugänglich sein sollen; sonst haben die Fenster kein Menü
		// macOS: minimales Menü mit nur einem Punkt erzeugen
		if (process.platform !== "darwin" && devtools) {
			appMenu.erzeugenAnsicht(bw);
		} else if (process.platform === "darwin") {
			bw.on("focus", () => appMenu.erzeugenMac(layoutMenuMac));
		}
		// HTML laden
		bw.loadFile(path.join(__dirname, "win", `${html}.html`));
		// Fenster anzeigen, sobald alles geladen wurde
		bw.once("ready-to-show", function() {
			this.show();
		});
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
};

// Handbuch aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-handbuch", (evt, abschnitt) => fenster.erstellenNeben("handbuch", abschnitt));

// Demonstrationskartei öffnen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-demo", () => {
	// ggf. ein Hauptfenster suchen und fokussieren
	let w = BrowserWindow.getFocusedWindow();
	if (win[w.id].typ !== "index") {
		for (let id in win) {
			if (!win.hasOwnProperty(id)) {
				continue;
			}
			if (win[id].typ === "index") {
				fenster.fokus(BrowserWindow.fromId(parseInt(id, 10)));
				break;
			}
		}
	}
	// Hauptfenster ist fokussiert (das dauert ggf. 25 ms)
	setTimeout(() => appMenu.aktion("hilfe-demo"), 50);
});

// Dokumentation aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-dokumentation", (evt, abschnitt) => fenster.erstellenNeben("dokumentation", abschnitt));

// Changelog aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-changelog", () => fenster.erstellenNeben("changelog"));

// Fehlerlog aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-fehlerlog", () => fenster.erstellenNeben("fehlerlog"));

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
		appMenu.aktion("app-beenden");
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
	// Optionen schreiben
	clearTimeout(optionen.schreibenTimeout);
	optionen.schreiben();
	// auf MacOS bleibt das Programm üblicherweise aktiv,
	// bis die BenutzerIn es explizit beendet
	if (process.platform !== "darwin") {
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
