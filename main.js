const {app, BrowserWindow, Menu} = require("electron");

// App-Menü erzeugen
const menuVorlage = [
	{
		label: "Datei",
		submenu: [
			{ click() { dateiErstellen() }, label: "Neue Datei", accelerator: "CommandOrControl+N" },
			{ type: "separator" },
			{ click() { dateiOeffnen() }, label: "Öffnen", accelerator: "CommandOrControl+O" },
			{ click() { dateiSpeichern() }, label: "Speichern", accelerator: "CommandOrControl+S" },
			{ type: "separator" },
			{ role: "quit", label: "Beenden" },
		],
	},
	{
		label: "Bearbeiten",
		submenu: [
			{ role: "undo", label: "Rückgängig" },
			{ role: "redo", label: "Wiederherstellen" },
			{ type: "separator" },
			{ role: "cut", label: "Ausschneiden" },
			{ role: "copy", label: "Kopieren" },
			{ role: "paste", label: "Einfügen" },
			{ role: "selectAll", label: "Alles auswählen" },
		],
	},
	{
		label: "Ansicht",
		submenu: [
			{ role: "zoomIn", label: "Schrift vergrößern" },
			{ role: "zoomOut", label: "Schrift verkleinern" },
			{ role: "resetZoom", label: "Schrift zurücksetzen" },
			{ type: "separator" },
			{ role: "toggleFullScreen", label: "Vollbild" },
		],
	},
	{
		label: "Werkzeuge",
		submenu: [
			{ click() { zettelAuflisten() }, label: "Zettel auflisten" },
			{ click() { zettelSortieren() }, label: "Zettel sortieren" },
		],
	},
	{
		label: "Hilfe",
		submenu: [
			{ click() { benutzerhandbuch() }, label: "Benutzerhandbuch", accelerator: "F1" },
		],
	},
	{
		label: "Dev",
		submenu: [
			{ role: "reload", label: "Neu laden" },
			{ role: "forceReload", label: "Neu laden erzwingen" },
			{ type: "separator" },
			{ role: "toggleDevTools", label: "Developer tools" },
		],
	}
];
const menu = Menu.buildFromTemplate(menuVorlage);
Menu.setApplicationMenu(menu);

// globales Fensterobjekt
let win;

// Browser-Fenster erstellen
function createWindow () {
	// Fenster öffnen
	win = new BrowserWindow({
		title: `${app.getName()} v${app.getVersion()}`,
		width: 800,
		height: 800,
		show: false,
	});
	// main.html laden
	win.loadFile("main.html");
	// Fenster anzeigen, sobald alles geladen wurde
	win.once("ready-to-show", () => {
		win.show();
	});
	// globales Fensterobjekt beim Schließen dereferenzieren
	win.on("closed", () => {
		win = null;
	});
}

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", createWindow);

// App beenden, wenn alle Fenster geschlossen worden sind
app.on("window-all-closed", () => {
	// auf MacOS bleibt das Programm üblicherweise aktiv,
	// bis der Benutzer es explizit beendet
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// App wiederherstellen, bzw. wieder öffnen
app.on("activate", () => {
	// auf MacOS wird das Fenster einfach nur wiederhergestellt
	if (win === null) {
		createWindow();
	}
});

// Datei speichern
function dateiOeffnen () {
	console.log("Datei öffnen");
}

// Datei speichern
function dateiSpeichern () {
	console.log("Datei speichern");
}

// Benutzerhandbuch anzeigen
function benutzerhandbuch () {
	console.log("Benutzerhandbuch");
}

// Zettel auflisten
function zettelAuflisten () {
	win.webContents.send("zettelAuflisten");
}

// Zettel sortieren
function zettelSortieren () {
	win.webContents.send("zettelSortieren");
}
