// globales Fensterobjekt
let win;

// Electron-Features einbinden
const {app, BrowserWindow, Menu} = require("electron");

// Funktionen zum Menü "Kartei"
const Kartei = {
	erstellen () {
		win.webContents.send("kartei-erstellen");
	},
	oeffnen () {
		win.webContents.send("kartei-oeffnen");
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
	dokumentation () {
		// TODO
	},
	ueber () {
		// TODO
	},
};

// App-Menü erzeugen
const menuLayout = [
	{
		label: "Kartei",
		submenu: [
			{ click() { Kartei.erstellen(); }, label: "Erstellen", accelerator: "CommandOrControl+E" },
			{ type: "separator" },
			{ click() { Kartei.oeffnen(); }, label: "Öffnen", accelerator: "CommandOrControl+O" },
			{ click() { Kartei.speichern(); }, label: "Speichern", accelerator: "CommandOrControl+S" },
			{ click() { Kartei.speichernUnter(); }, label: "Speichern unter", accelerator: "CommandOrControl+Shift+S" },
			{ type: "separator" },
			{ click() { Kartei.schliessen(); }, label: "Schließen", accelerator: "CommandOrControl+W" },
			{ type: "separator" },
			{ role: "quit", label: "Programm beenden" },
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
			{ role: "resetZoom", label: "Standardgröße" },
			{ type: "separator" },
			{ role: "toggleFullScreen", label: "Vollbild" },
		],
	},
	{
		label: "Werkzeuge",
		submenu: [
			{ click() { Werkzeuge.belegHinzufuegen(); }, label: "Beleg hinzufügen", accelerator: "CommandOrControl+N" },
			{ click() { Werkzeuge.belegeAuflisten(); }, label: "Belege auflisten", accelerator: "CommandOrControl+L" },
			{ type: "separator" },
			{ click() { Werkzeuge.bedeutungenSortieren(); }, label: "Bedeutungen", enabled: false },
			{ type: "separator" },
			{ click() { Werkzeuge.metadaten(); }, label: "Metadaten", enabled: false },
			{ click() { Werkzeuge.notizen(); }, label: "Notizen", enabled: false },
			{ click() { Werkzeuge.anhaenge(); }, label: "Anhänge", enabled: false },
		],
	},
	{
		label: "Hilfe",
		submenu: [
			{ click() { Hilfe.benutzerhandbuch(); }, label: "Benutzerhandbuch", accelerator: "F1", enabled: false },
			{ type: "separator" },
			{ click() { Hilfe.dokumentation(); }, label: "Dokumentation", enabled: false },
			{ type: "separator" },
			{ click() { Hilfe.ueber(); }, label: `Über ${app.getName()}`, enabled: false },
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
	},
];
const menu = Menu.buildFromTemplate(menuLayout);
Menu.setApplicationMenu(menu);

// Browser-Fenster
const Fenster = {
	// Fenster erzeugen
	erstellen () {
		// Fenster öffnen
		const Bildschirm = require("electron").screen.getPrimaryDisplay();
		win = new BrowserWindow({
			title: `${app.getName()} v${app.getVersion()}`,
			width: 800,
			height: Bildschirm.workArea.height,
			minWidth: 500,
			minHeight: 300,
			show: false,
		});
		// main.html laden
		win.loadFile("main.html");
		// Fenster anzeigen, sobald alles geladen wurde
		win.once("ready-to-show", () => win.show() );
		// globales Fensterobjekt beim Schließen dereferenzieren
		win.on("closed", () => win = null );
	},
};

// Initialisierung abgeschlossen => Browser-Fenster erstellen
app.on("ready", Fenster.erstellen);

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
		Fenster.erstellen();
	}
});
