"use strict";

// globale Fensterobjekte
let win, winHandbuch, winDokumentation, winChangelog, winUeberApp, winUeberElectron;

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
	if (!win) {
		return;
	}
	if (/\.wgd$/.test(argv[1])) {
		win.webContents.send("kartei-oeffnen", argv[1]);
	}
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();
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
				click: () => win.webContents.send("programm-einstellungen"),
			},
			{ type: "separator" },
			{
				label: "Beenden",
				icon: path.join(__dirname, "img", "menu", "programm-beenden.png"),
				role: "quit",
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
				click: () => win.webContents.send("kartei-erstellen"),
				accelerator: "CommandOrControl+E",
			},
			{ type: "separator" },
			{
				label: "Öffnen",
				icon: path.join(__dirname, "img", "menu", "kartei-oeffnen.png"),
				click: () => win.webContents.send("kartei-oeffnen", ""),
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
				click: () => win.webContents.send("kartei-speichern"),
				accelerator: "CommandOrControl+S",
				id: "kartei-speichern",
			},
			{
				label: "Speichern unter",
				icon: path.join(__dirname, "img", "menu", "kartei-speichern-unter.png"),
				click: () => win.webContents.send("kartei-speichern-unter"),
				accelerator: "CommandOrControl+Shift+S",
				id: "kartei-speichern-unter",
			},
			{ type: "separator" },
			{
				label: "Schließen",
				icon: path.join(__dirname, "img", "menu", "kartei-schliessen.png"),
				click: () => win.webContents.send("kartei-schliessen"),
				accelerator: "CommandOrControl+W",
				id: "kartei-schliessen",
			},
			{ type: "separator" },
			{
				label: "Formvarianten",
				icon: path.join(__dirname, "img", "menu", "kartei-formvarianten.png"),
				click: () => win.webContents.send("kartei-formvarianten"),
				id: "kartei-formvarianten",
			},
			{
				label: "Notizen",
				icon: path.join(__dirname, "img", "menu", "kartei-notizen.png"),
				click: () => win.webContents.send("kartei-notizen"),
				id: "kartei-notizen",
			},
			{
				label: "Anhänge",
				icon: path.join(__dirname, "img", "menu", "kartei-anhaenge.png"),
				click: () => win.webContents.send("kartei-anhaenge"),
				id: "kartei-anhaenge",
			},
			{
				label: "Überprüfte Lexika",
				icon: path.join(__dirname, "img", "menu", "kartei-lexika.png"),
				click: () => win.webContents.send("kartei-lexika"),
				id: "kartei-lexika",
			},
			{
				label: "Metadaten",
				icon: path.join(__dirname, "img", "menu", "kartei-metadaten.png"),
				click: () => win.webContents.send("kartei-metadaten"),
				id: "kartei-metadaten",
			},
			{
				label: "Redaktion",
				icon: path.join(__dirname, "img", "menu", "kartei-redaktion.png"),
				click: () => win.webContents.send("kartei-redaktion"),
				id: "kartei-redaktion",
			},
			{ type: "separator" },
			{
				label: "Bedeutungsgerüst",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen.png"),
				click: () => win.webContents.send("kartei-bedeutungen"),
				accelerator: "CommandOrControl+B",
				id: "kartei-bedeutungen",
			},
			{
				label: "Bedeutungsgerüst wechseln",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen-wechseln.png"),
				click: () => win.webContents.send("kartei-bedeutungen-wechseln"),
				id: "kartei-bedeutungen-wechseln",
			},
			{
				label: "Bedeutungsgerüst-Fenster",
				icon: path.join(__dirname, "img", "menu", "kartei-bedeutungen-fenster.png"),
				click: () => win.webContents.send("kartei-bedeutungen-fenster"),
				accelerator: "CommandOrControl+Shift+B",
				id: "kartei-bedeutungen-fenster",
			},
			{ type: "separator" },
			{
				label: "Suche",
				icon: path.join(__dirname, "img", "menu", "kartei-suche.png"),
				click: () => win.webContents.send("kartei-suche"),
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
				click: () => win.webContents.send("belege-hinzufuegen"),
				accelerator: "CommandOrControl+N",
			},
			{
				label: "Auflisten",
				icon: path.join(__dirname, "img", "menu", "belege-auflisten.png"),
				click: () => win.webContents.send("belege-auflisten"),
				accelerator: "CommandOrControl+L",
			},
			{
				label: "Sortieren",
				icon: path.join(__dirname, "img", "menu", "belege-sortieren.png"),
				click: () => win.webContents.send("dialog-anzeigen", "Sorry!\nDiese Funktion ist noch nicht programmiert."), // TODO
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
				click: () => fenster.erstellenHandbuch(),
				accelerator: "F1",
			},
			{ type: "separator" },
			{
				label: "Technische Dokumentation",
				click: () => fenster.erstellenDokumentation(),
			},
			{ type: "separator" },
			{
				label: "Changelog",
				click: () => fenster.erstellenChangelog(),
			},
			{ type: "separator" },
			{
				label: `Über ${app.getName().replace("'", "’")}`,
				click: () => fenster.erstellenUeberApp("app"),
			},
			{
				label: "Über Electron",
				click: () => fenster.erstellenUeberElectron(),
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
	zuletzt (update) {
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
				if (update) {
					win.webContents.send("optionen-zuletzt", optionen.data.app.zuletzt);
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
		if (update) {
			appMenu.erzeugen();
		}
	},
	// Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
	zuletztItem (zuletztVerwendet, datei, i) {
		let item = {
			label: path.basename(datei, ".wgd"),
			sublabel: datei,
			click: () => win.webContents.send("kartei-oeffnen", datei),
		};
		if (i <= 8) {
			item.accelerator = `CommandOrControl+${i + 1}`;
		}
		zuletztVerwendet.submenu.push(item);
	},
	// Menü mit zuletzt benutzten Dateien leeren
	zuletztLoeschen () {
		optionen.data.app.zuletzt = [];
		win.webContents.send("optionen-zuletzt", optionen.data.app.zuletzt);
		optionen.schreiben();
		appMenu.zuletzt(true);
	},
	// Menü-Elemente deaktivieren, wenn keine Kartei offen ist
	deaktivieren (disable, update) {
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
		if (update) {
			appMenu.erzeugen();
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
	erzeugen () {
		let menu = Menu.buildFromTemplate(layoutMenu);
		win.setMenu(menu);
	},
	// erzeugt ein Menü, das nur den Punkt Ansicht hat
	erzeugenAnsicht (fenster) {
		let menu = Menu.buildFromTemplate(layoutMenuAnsicht);
		fenster.setMenu(menu);
		fenster.setMenuBarVisibility(false);
	},
};

// Menüs deaktivieren, die nur bei offenen Karteikarten funktionieren
appMenu.deaktivieren(true, false);

// Menüse aktivieren/deaktivieren, wenn der Renderer-Prozess es wünscht
ipcMain.on("menus-deaktivieren", (evt, disable) => appMenu.deaktivieren(disable, true));

// Programm-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-app", (evt, opener) => fenster.erstellenUeberApp(opener));

// Electron-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-electron", (evt, opener) => fenster.erstellenUeberElectron(opener));

// Druckauftrag aus dem Bedeutungsgerüst-Fenster an den Renderer-Prozess schicken
ipcMain.on("bedeutungen-fenster-drucken", function(evt, daten) {
	// TODO Ziel-Fenster über daten.winId ermitteln
	daten = daten.gr;
	win.webContents.send("bedeutungen-fenster-drucken", daten);
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();
});

// angeklickte Bedeutung im Gerüst-Fenster eintragen
ipcMain.on("bedeutungen-fenster-eintragen", function(evt, bd) {
	// TODO Ziel-Fenster über bd.winId ermitteln
	delete bd.winId;
	win.webContents.send("bedeutungen-fenster-eintragen", bd);
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();
});

// angeklickte Bedeutung im Gerüst-Fenster austragen
ipcMain.on("bedeutungen-fenster-austragen", function(evt, bd) {
	// TODO Ziel-Fenster über bd.winId ermitteln
	delete bd.winId;
	win.webContents.send("bedeutungen-fenster-austragen", bd);
	if (win.isMinimized()) {
		win.restore();
	}
	win.focus();
});

// Status des gerade geschlossenen Bedeutungsgerüst-Fensters an das passende Hauptfenster schicken
ipcMain.on("bedeutungen-fenster-status", function(evt, status) {
	// TODO Ziel-Fenster über status.winId ermitteln
	delete status.winId;
	win.webContents.send("bedeutungen-fenster-status", status);
});

// Handbuch aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-handbuch", () => fenster.erstellenHandbuch());

// Changelog aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("hilfe-changelog", () => fenster.erstellenChangelog());

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
// 		fs.writeFile(optionen.pfad, JSON.stringify(optionen.data), function(err) {
// 			if (err) {
// 				win.webContents.send("dialog-anzeigen", `Die Optionen-Datei konnte nicht gespeichert werden.\n<h3>Fehlermeldung</h3>\n${err.message}`);
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
ipcMain.on("optionen-speichern", function(evt, opt) {
	if (optionen.data.app.zuletzt &&
			optionen.data.app.zuletzt.join(",") !== opt.zuletzt.join(",")) {
		optionen.data.app = opt;
		appMenu.zuletzt(true); // Das sollte nicht unnötig oft aufgerufen werden!
	} else {
		optionen.data.app = opt;
	}
	optionen.schreiben();
});

// Browser-Fenster
fenster = {
	// Hauptfenster erzeugen
	erstellen () {
		// Fenster öffnen
		win = new BrowserWindow({
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
		// Menü erzeugen
		appMenu.erzeugen();
		// HTML laden
		win.loadFile(path.join(__dirname, "index.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		win.once("ready-to-show", function() {
			// ggf. übergebene Kartei öffnen
			if (/\.wgd$/.test(process.argv[1])) {
				// ein bisschen Timeout, sonst klappt das nicht
				setTimeout(() => win.webContents.send("kartei-oeffnen", process.argv[1]), 100);
			}
			// Fenster anzeigen
			win.show();
			// ggf. maximieren
			if (optionen.data.fenster.maximiert) {
				win.maximize();
			}
		});
		// globales Fensterobjekt beim Schließen dereferenzieren
		win.on("closed", function() {
			win = null;
			// ggf. noch offene Nebenfenster schließen
			if (winHandbuch) {
				winHandbuch.close();
			}
			if (winDokumentation) {
				winDokumentation.close();
			}
			if (winChangelog) {
				winChangelog.close();
			}
		});
	},
	// Handbuch-Fenster erstellen
	erstellenHandbuch () {
		// Handbuch-Fenster ist bereits offen => Fenster fokussieren
		if (winHandbuch) {
			if (winHandbuch.isMinimized()) {
				winHandbuch.restore();
			}
			winHandbuch.focus();
			return;
		}
		// Fenster öffnen
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		winHandbuch = new BrowserWindow({
			title: "Handbuch",
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			width: 900,
			height: Bildschirm.workArea.height,
			minWidth: 700,
			minHeight: 350,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Menü erzeugen
		appMenu.erzeugenAnsicht(winHandbuch);
		winHandbuch.on("leave-full-screen", function() {
			// nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
			// (ohne Timeout geht es nicht)
			setTimeout(() => winHandbuch.setMenuBarVisibility(false), 1);
		});
		// HTML laden
		winHandbuch.loadFile(path.join(__dirname, "win", "handbuch.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		winHandbuch.once("ready-to-show", () => winHandbuch.show());
		// globales Fensterobjekt beim Schließen dereferenzieren
		winHandbuch.on("closed", () => winHandbuch = null);
	},
	// Doku-Fenster erstellen
	erstellenDokumentation () {
		// Doku-Fenster ist bereits offen => Fenster fokussieren
		if (winDokumentation) {
			if (winDokumentation.isMinimized()) {
				winDokumentation.restore();
			}
			winDokumentation.focus();
			return;
		}
		// Fenster öffnen
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		winDokumentation = new BrowserWindow({
			title: "Technische Dokumentation",
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			width: 900,
			height: Bildschirm.workArea.height,
			minWidth: 700,
			minHeight: 350,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Menü erzeugen
		appMenu.erzeugenAnsicht(winDokumentation);
		winDokumentation.on("leave-full-screen", function() {
			// nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
			// (ohne Timeout geht es nicht)
			setTimeout(() => winDokumentation.setMenuBarVisibility(false), 1);
		});
		// HTML laden
		winDokumentation.loadFile(path.join(__dirname, "win", "dokumentation.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		winDokumentation.once("ready-to-show", () => winDokumentation.show());
		// globales Fensterobjekt beim Schließen dereferenzieren
		winDokumentation.on("closed", () => winDokumentation = null);
	},
	// Changelog-Fenster erstellen
	erstellenChangelog () {
		// Changelog-Fenster ist bereits offen => Fenster fokussieren
		if (winChangelog) {
			if (winChangelog.isMinimized()) {
				winChangelog.restore();
			}
			winChangelog.focus();
			return;
		}
		// Fenster öffnen
		winChangelog = new BrowserWindow({
			title: "Changelog",
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			width: 625,
			height: 625,
			minWidth: 350,
			minHeight: 350,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Menü erzeugen
		appMenu.erzeugenAnsicht(winChangelog);
		winChangelog.on("leave-full-screen", function() {
			// nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
			// (ohne Timeout geht es nicht)
			setTimeout(() => winChangelog.setMenuBarVisibility(false), 1);
		});
		// HTML laden
		winChangelog.loadFile(path.join(__dirname, "win", "changelog.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		winChangelog.once("ready-to-show", () => winChangelog.show());
		// globales Fensterobjekt beim Schließen dereferenzieren
		winChangelog.on("closed", () => winChangelog = null);
	},
	// Über-Fenster erstellen (App)
	erstellenUeberApp (opener) {
		// Fenster öffnen
		winUeberApp = new BrowserWindow({
			parent: fenster.findParent(opener),
			modal: true,
			title: `Über ${app.getName().replace("'", "’")}`,
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
		// Menü abschalten
		winUeberApp.setMenuBarVisibility(false); // unpaketiert erscheint sonst ein Standardmenü
		// HTML laden
		winUeberApp.loadFile(path.join(__dirname, "win", "ueberApp.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		winUeberApp.once("ready-to-show", () => winUeberApp.show());
		// globales Fensterobjekt beim Schließen dereferenzieren
		winUeberApp.on("closed", () => winUeberApp = null);
	},
	// Über-Fenster erstellen (Electron)
	erstellenUeberElectron (opener) {
		// Fenster öffnen
		winUeberElectron = new BrowserWindow({
			parent: fenster.findParent(opener),
			modal: true,
			title: "Über Electron",
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
		// Menü abschalten
		winUeberElectron.setMenuBarVisibility(false); // unpaketiert erscheint sonst ein Standardmenü
		// HTML laden
		winUeberElectron.loadFile(path.join(__dirname, "win", "ueberElectron.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		winUeberElectron.once("ready-to-show", () => winUeberElectron.show());
		// globales Fensterobjekt beim Schließen dereferenzieren
		winUeberElectron.on("closed", () => winUeberElectron = null);
	},
	// Parent-Fenster ermitteln
	findParent (opener) {
		// TODO Parent für Bedeutungen-Fenster finden
		if (opener === "handbuch") {
			return winHandbuch;
		} else if (opener === "dokumentation") {
			return winDokumentation;
		} else if (opener === "changelog") {
			return winChangelog;
		} else {
			return win;
		}
	},
};

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", function() {
	// Menu der zuletzt verwendeter Karteien erzeugen
	appMenu.zuletzt(false);
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
	// auf MacOS wird das Fenster einfach nur wiederhergestellt
	if (win === null) {
		fenster.erstellen();
	}
});
