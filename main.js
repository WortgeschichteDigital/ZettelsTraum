// globales Fensterobjekt
let win;

// Funktionen-Container
let appMenu, optionen, fenster;

// Electron-Features einbinden
const {app, BrowserWindow, dialog, ipcMain, Menu} = require("electron");

// Funktionen zum Menü "Kartei"
const Kartei = {
	erstellen () {
		win.webContents.send("kartei-erstellen");
	},
	oeffnen () {
		win.webContents.send("kartei-oeffnen", "");
	},
	speichern () {
		win.webContents.send("kartei-speichern");
	},
	speichernUnter () {
		win.webContents.send("kartei-speichern-unter");
	},
	schliessen () {
		win.webContents.send("kartei-schliessen");
	},
};

// Funktionen zum Menü "Werkzeuge"
const Werkzeuge = {
	belegHinzufuegen () {
		win.webContents.send("beleg-hinzufuegen");
	},
	belegeAuflisten () {
		win.webContents.send("belege-auflisten");
	},
	belegeSortieren () {
		// TODO
	},
	bedeutungenSortieren () {
		// TODO
	},
	metadaten () {
		// TODO
	},
	notizen () {
		// TODO
	},
	anhaenge () {
		// TODO
	},
};

// Funktionen zum Menü "Hilfe"
const Hilfe = {
	benutzerhandbuch () {
		// TODO
	},
	ueber () {
		dialog.showMessageBox({
			type: "info",
			buttons: ["Alles klar!"],
			defaultId: 0,
			title: `Über ${app.getName()}`,
			message: `${app.getName()}\nVersion ${app.getVersion()}\n\n„${app.getName()}“ ist die Wortkartei-App von „Wortgeschichte digital“, dem Göttinger Teilprojekt des „Zentrums für digitale Lexikographie der deutschen Sprache“ (ZDL).\n\n© 2019 ZDL\n\nAutor:\tNico Dorn <ndorn@gwdg.de>\nLizenz:\tMIT\n\nFonts:\tDejaVu Sans\nLizenz:\tBitstream Vera Fonts, Arev Fonts, Public Domain\n\nIcons:\tPapirus\nLizenz:\tGNU General Public License 3.0`,
		});
	},
	dokumentation () {
		// TODO
	},
	electron () {
		dialog.showMessageBox({
			type: "info",
			buttons: ["Alles klar!"],
			defaultId: 0,
			title: "Über Electron",
			message: `Framework-Software von „${app.getName()}“, Version ${app.getVersion()}:\n\nNode.js:\t\t${process.versions.node}\nChromium:\t\t${process.versions.chrome}\nElectron:\t\t${process.versions.electron}`,
		});
	},
};

// App-Menü-Vorlage
let menuLayout = [
	{
		label: "&Kartei",
		submenu: [
			{ click: () => Kartei.erstellen(), label: "Erstellen", accelerator: "CommandOrControl+E", icon: "img/menu/kartei-erstellen.png" },
			{ type: "separator" },
			{ label: "Zuletzt verwendet", id: "zuletzt" },
			{ type: "separator" },
			{ click: () => Kartei.oeffnen(), label: "Öffnen", accelerator: "CommandOrControl+O", icon: "img/menu/kartei-oeffnen.png" },
			{ click: () => Kartei.speichern(), label: "Speichern", accelerator: "CommandOrControl+S", icon: "img/menu/kartei-speichern.png" },
			{ click: () => Kartei.speichernUnter(), label: "Speichern unter", accelerator: "CommandOrControl+Shift+S" },
			{ type: "separator" },
			{ click: () => Kartei.schliessen(), label: "Schließen", accelerator: "CommandOrControl+W", icon: "img/menu/kartei-schliessen.png" },
			{ type: "separator" },
			{ role: "quit", label: "Programm beenden", icon: "img/menu/kartei-beenden.png" },
		],
	},
	{
		label: "&Bearbeiten",
		submenu: [
			{ role: "undo", label: "Rückgängig", icon: "img/menu/bearbeiten-rueckgaengig.png" },
			{ role: "redo", label: "Wiederherstellen", icon: "img/menu/bearbeiten-wiederherstellen.png" },
			{ type: "separator" },
			{ role: "cut", label: "Ausschneiden", icon: "img/menu/bearbeiten-ausschneiden.png" },
			{ role: "copy", label: "Kopieren", icon: "img/menu/bearbeiten-kopieren.png" },
			{ role: "paste", label: "Einfügen", icon: "img/menu/bearbeiten-einfuegen.png" },
			{ role: "selectAll", label: "Alles auswählen", icon: "img/menu/bearbeiten-auswaehlen.png" },
		],
	},
	{
		label: "&Ansicht",
		submenu: [
			{ role: "zoomIn", label: "Schrift vergrößern", icon: "img/menu/ansicht-zoom-plus.png" },
			{ role: "zoomOut", label: "Schrift verkleinern", icon: "img/menu/ansicht-zoom-minus.png" },
			{ role: "resetZoom", label: "Standardgröße", icon: "img/menu/ansicht-zoom-standard.png" },
			{ type: "separator" },
			{ role: "toggleFullScreen", label: "Vollbild", icon: "img/menu/ansicht-vollbild.png" },
		],
	},
	{
		label: "&Werkzeuge",
		submenu: [
			{ click: () => Werkzeuge.belegHinzufuegen(), label: "Beleg hinzufügen", accelerator: "CommandOrControl+N", icon: "img/menu/werkzeuge-beleg-hinzufuegen.png" },
			{ click: () => Werkzeuge.belegeAuflisten(), label: "Belege auflisten", accelerator: "CommandOrControl+L", icon: "img/menu/werkzeuge-belege-auflisten.png" },
			{ click: () => Werkzeuge.belegeSortieren(), label: "Belege sortieren", accelerator: "CommandOrControl+H", icon: "img/menu/werkzeuge-belege-sortieren.png", enabled: false },
			{ type: "separator" },
			{ click: () => Werkzeuge.bedeutungenSortieren(), label: "Bedeutungen", enabled: false },
			{ type: "separator" },
			{ click: () => Werkzeuge.metadaten(), label: "Metadaten", enabled: false },
			{ click: () => Werkzeuge.notizen(), label: "Notizen", enabled: false },
			{ click: () => Werkzeuge.anhaenge(), label: "Anhänge", enabled: false },
		],
	},
	{
		label: "&Hilfe",
		submenu: [
			{ click: () => Hilfe.benutzerhandbuch(), label: "Benutzerhandbuch", accelerator: "F1", icon: "img/menu/hilfe.png", enabled: false },
			{ type: "separator" },
			{ click: () => Hilfe.dokumentation(), label: "Technische Dokumentation", enabled: false },
			{ type: "separator" },
			{ click: () => Hilfe.ueber(), label: `Über ${app.getName()}` },
			{ click: () => Hilfe.electron(), label: "Über Electron" },
		],
	},
];

// ggf. Developer-Menü ergänzen
if (!app.isPackaged) {
	menuLayout.push({
		label: "&Dev",
		submenu: [
			{ role: "reload", label: "Neu laden" },
			{ role: "forceReload", label: "Neu laden erzwingen" },
			{ type: "separator" },
			{ role: "toggleDevTools", label: "Developer tools" },
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
			icon: "img/menu/kartei-zuletzt.png",
			id: "zuletzt",
			submenu: [],
		};
		// Dateiliste ggf. ergänzen
		if (optionen.data.app.zuletzt) {
			let loeschen = [],
				zuletzt = optionen.data.app.zuletzt;
			for (let i = 0, len = zuletzt.length; i < len; i++) {
				// existiert die Datei noch?
				const fs = require("fs");
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
				{ click: () => appMenu.zuletztLoeschen(), label: "Liste löschen" }
			);
		}
		// Position der Karteiliste ermitteln
		let menuKartei = menuLayout[0].submenu,
			pos = -1;
		for (let i = 0, len = menuKartei.length; i < len; i++) {
			if (menuKartei[i].id === "zuletzt") {
				pos = i;
				break;
			}
		}
		// neue Liste einhängen
		menuLayout[0].submenu[pos] = zuletztVerwendet;
		// Menü ggf. auffrischen
		if (update) {
			appMenu.erzeugen();
		}
	},
	// Menüpunkt im Untermenü "Zuletzt verwendet" erzeugen
	zuletztItem (zuletztVerwendet, datei, i) {
		let item = {
			label: require("path").basename(datei),
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
	// erzeugt das Menü
	erzeugen () {
		const menu = Menu.buildFromTemplate(menuLayout);
		Menu.setApplicationMenu(menu);
	},
};

// Optionen einlesen und speichern
optionen = {
	// Pfad zur Optionen-Datei
	pfad: `${app.getPath("userData")}/einstellungen.json`,
	// Objekt mit den gespeicherten Optionen
	data: {
		fenster: {
			x: undefined,
			y: undefined,
			width: 800,
			height: undefined,
			maximiert: false,
		},
		app: {},
	},
	// liest die Optionen-Datei aus
	lesen () {
		const fs = require("fs");
		if (fs.existsSync(optionen.pfad)) {
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
		const fs = require("fs");
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
			optionen.data.app.zuletzt.join(",") !== opt.zuletzt.join(",")) {
		optionen.data.app = opt;
		appMenu.zuletzt(true); // das sollte nicht unnötig oft geschehen
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
			x: optionen.data.fenster.x,
			y: optionen.data.fenster.y,
			width: optionen.data.fenster.width,
			height: optionen.data.fenster.height,
			minWidth: 500,
			minHeight: 300,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: app.isPackaged ? false : true,
				defaultEncoding: "UTF-8",
			},
		});
		// main.html laden
		win.loadFile("main.html");
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
		win.on("resize", fenster.status);
		win.on("move", fenster.status);
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
