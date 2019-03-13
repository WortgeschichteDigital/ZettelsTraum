"use strict";

// globales Fensterobjekt
let win;

// Funktionen-Container
let appMenu, optionen, fenster;

// Electron-Features einbinden
const {app, BrowserWindow, dialog, ipcMain, Menu} = require("electron"),
	fs = require("fs"),
	path = require("path");

// Bilderliste erstellen
let bilder = [];
fs.readdir(path.join(__dirname, "img"), function(err, img) {
	for (let i = 0, len = img.length; i < len; i++) {
		// Bild oder Ordner?
		if ( fs.lstatSync( path.join(__dirname, "img", img[i]) ).isDirectory() ) {
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
			},
		],
	},
	{
		label: "&Kartei",
		submenu: [
			{
				label: "Erstellen", accelerator: "CommandOrControl+E",
				icon: path.join(__dirname, "img", "menu", "kartei-erstellen.png"),
				click: () => win.webContents.send("kartei-erstellen"),
			},
			{ type: "separator" },
			{
				label: "Zuletzt verwendet", // Menü wird über appMenu.zuletzt() gefüllt
				id: "kartei-zuletzt",
			},
			{ type: "separator" },
			{
				label: "Öffnen",
				icon: path.join(__dirname, "img", "menu", "kartei-oeffnen.png"),
				click: () => win.webContents.send("kartei-oeffnen", ""),
				accelerator: "CommandOrControl+O",
			},
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
				label: "Wortstamm-Variationen",
				icon: path.join(__dirname, "img", "menu", "kartei-wortstamm.png"),
				click: () => win.webContents.send("kartei-wortstamm"),
				id: "kartei-wortstamm",
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
				click: () => void 0, // TODO
				id: "kartei-anhaenge",
			},
			{
				label: "Metadaten",
				icon: path.join(__dirname, "img", "menu", "kartei-metadaten.png"),
				click: () => win.webContents.send("kartei-metadaten"),
				id: "kartei-metadaten",
			},
			{ type: "separator" },
			{
				label: "Suche",
				icon: path.join(__dirname, "img", "menu", "kartei-suche.png"),
				click: () => win.webContents.send("kartei-suche"),
				accelerator: "CommandOrControl+F",
				id: "kartei-suche",
			},
			{ type: "separator" },
			{
				label: "Schließen",
				icon: path.join(__dirname, "img", "menu", "kartei-schliessen.png"),
				click: () => win.webContents.send("kartei-schliessen"),
				accelerator: "CommandOrControl+W",
				id: "kartei-schliessen",
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
				click: () => void 0, // TODO
				accelerator: "CommandOrControl+H",
			},
			{ type: "separator" },
			{
				label: "Bedeutungen sortieren",
				click: () => void 0, // TODO
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
	{
		label: "&Hilfe",
		submenu: [
			{
				label: "Benutzerhandbuch",
				icon: path.join(__dirname, "img", "menu", "hilfe.png"),
				click: () => void 0, // TODO
				accelerator: "F1",
			},
			{ type: "separator" },
			{
				label: "Technische Dokumentation",
				click: () => void 0, // TODO
			},
			{ type: "separator" },
			{
				label: `Über ${app.getName()}`,
				click: () => appMenu.hilfeUeberProgramm(),
			},
			{
				label: "Über Electron",
				click: () => appMenu.hilfeUeberElectron(),
			},
		],
	},
];

// ggf. Developer-Menü ergänzen
if (!app.isPackaged) {
	layoutMenu.push({
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
				if ( !fs.existsSync(zuletzt[i]) ) {
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
		if (i <= 5) {
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
		let elemente = ["kartei-speichern", "kartei-speichern-unter", "kartei-wortstamm", "kartei-notizen", "kartei-anhaenge", "kartei-metadaten", "kartei-suche", "kartei-schliessen", "belege"];
		for (let j = 0, len = layoutMenu.length; j < len; j++) {
			// sollen vielleicht alle Menüpunkte deaktiviert werden?
			let alle = false;
			if (elemente.indexOf(layoutMenu[j].id) >= 0) {
				alle = true;
			}
			// Submenu durchgehen
			let submenu = layoutMenu[j].submenu;
			for (let k = 0, len = submenu.length; k < len; k++) {
				if (alle) {
					toggle(submenu[k]);
				} else if (elemente.indexOf(submenu[k].id) >= 0) {
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
	// erzeugt das Programm-Menü
	erzeugen () {
		const menu = Menu.buildFromTemplate(layoutMenu);
		Menu.setApplicationMenu(menu);
	},
	// Dialog mit Infos zum Programm
	hilfeUeberProgramm () {
		dialog.showMessageBox({
			type: "info",
			buttons: ["Alles klar!"],
			defaultId: 0,
			title: `Über ${app.getName()}`,
			message: `${app.getName()}\nVersion ${app.getVersion()}\n\n„${app.getName()}“ ist die Wortkartei-App von „Wortgeschichte digital“, dem Göttinger Teilprojekt des „Zentrums für digitale Lexikographie der deutschen Sprache“ (ZDL).\n\n© 2019 ZDL\n\nAutor:\tNico Dorn <ndorn@gwdg.de>\nLizenz:\tGNU General Public License v3.0\n\nFonts:\tDejaVu Sans\nLizenz:\tBitstream Vera Fonts, Arev Fonts, Public Domain\n\nIcons:\tPapirus Icon Theme\nLizenz:\tGNU General Public License v3.0`,
		});
	},
	// Dialog mit Infos zum Framework
	hilfeUeberElectron () {
		dialog.showMessageBox({
			type: "info",
			buttons: ["Alles klar!"],
			defaultId: 0,
			title: "Über Electron",
			message: `Framework-Software von „${app.getName()}“, Version ${app.getVersion()}:\n\nElectron:\t\t${process.versions.electron}\nNode:\t\t\t${process.versions.node}\nChromium:\t\t${process.versions.chrome}\nv8:\t\t\t\t${process.versions.v8}`,
		});
	},
};

// Menüs deaktivieren, die nur bei offenen Karteikarten funktionieren
appMenu.deaktivieren(true, false);

// Menüse aktivieren/deaktivieren, wenn der Renderer-Prozess es wünscht
ipcMain.on("menus-deaktivieren", (evt, disable) => appMenu.deaktivieren(disable, true) );

// Programm-Info aufrufen, wenn der Renderer-Prozess es wünscht
ipcMain.on("ueber-zettelstraum", () => appMenu.hilfeUeberProgramm() );

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
		if ( fs.existsSync(optionen.pfad) ) {
			const content = fs.readFileSync(optionen.pfad, "utf-8");
			try {
				optionen.data = JSON.parse(content);
			} catch (json_err) {
				// kann die Optionen-Datei nicht eingelesen werden, ist sie wohl korrupt;
				// dann lösche ich sie halt einfach
				fs.unlinkSync(optionen.pfad);
			}
		}
	},
	// überschreibt die Optionen-Datei
	schreiben () {
		fs.writeFile(optionen.pfad, JSON.stringify(optionen.data), function(err) {
			if (err) {
				dialog.showMessageBox({
					type: "error",
					buttons: ["Alles klar!"],
					defaultId: 0,
					title: "Fehler im Main Process",
					message: `Die Optionen-Datei konnte nicht gespeichert werden!\n\nFehlermeldung:\n${err.message}`,
				});
			}
		});
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
			optionen.data.app.zuletzt.join(",") !== opt.zuletzt.join(",") ) {
		optionen.data.app = opt;
		appMenu.zuletzt(true); // Das sollte nicht unnötig oft aufgerufen werden!
	} else {
		optionen.data.app = opt;
	}
	optionen.schreiben();
});

// Browser-Fenster
fenster = {
	// Fenster erzeugen
	erstellen () {
		// Fenster öffnen
		win = new BrowserWindow({
			title: app.getName(),
			icon: path.join(__dirname, "img", "icon", "png", "icon_32px.png"),
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
				devTools: app.isPackaged ? false : true,
				defaultEncoding: "utf-8",
			},
		});
		// index.html laden
		win.loadFile( path.join(__dirname, "index.html") );
		// Fenster anzeigen, sobald alles geladen wurde
		win.once("ready-to-show", function() {
			win.show();
			// ggf. maximieren
			if (optionen.data.fenster.maximiert) {
				win.maximize();
			}
		});
		// globales Fensterobjekt beim Schließen dereferenzieren
		win.on("closed", () => win = null );
		// Status des Fensters speichern
		// Man könnte den Status noch zusätzlich bei den Events
		// "resize" und "move" speichern, finde ich aber übertrieben.
		win.on("close", fenster.status);
	},
	// Fenster-Status in den Optionen speichern
	status () {
		optionen.data.fenster.maximiert = win.isMaximized();
		const bounds = win.getBounds();
		if (!optionen.data.fenster.maximiert && bounds) {
			optionen.data.fenster.x = bounds.x;
			optionen.data.fenster.y = bounds.y;
			optionen.data.fenster.width = bounds.width;
			optionen.data.fenster.height = bounds.height;
		}
		optionen.schreiben();
	},
};

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", function() {
	// Menu der zuletzt verwendeter Karteien erzeugen
	appMenu.zuletzt(false);
	// Menü erzeugen
	appMenu.erzeugen();
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
	// bis der Benutzer es explizit beendet
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
