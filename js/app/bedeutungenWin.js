"use strict";

let bedeutungenWin = {
	// Zwischenspeicher für den Verweis auf das Bedeutungsgerüst-Fenster
	win: null,
	// Bedeutungsgerüst-Fenster öffnen
	oeffnen () {
		// Bedeutungsgerüst-Fenster ist bereits offen => Fenster fokussieren
		if (bedeutungenWin.win) {
			if (bedeutungenWin.win.isMinimized()) {
				bedeutungenWin.win.restore();
			}
			bedeutungenWin.win.focus();
			return;
		}
		// Module laden
		const {app, BrowserWindow, Menu} = require("electron").remote,
			path = require("path");
		// Menü-Template
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
		// Devtools
		let devtools = false;
		if (!app.isPackaged) {
			devtools = true;
			layoutMenuAnsicht.push({
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
		// Fenster öffnen
		bedeutungenWin.win = new BrowserWindow({
			title: `Bedeutungsgerüst: ${kartei.wort}`,
			icon: path.join(__dirname, "img", "icon", "linux", "icon_32px.png"),
			x: optionen.data["fenster-bedeutungen"].x,
			y: optionen.data["fenster-bedeutungen"].y,
			width: optionen.data["fenster-bedeutungen"].width,
			height: optionen.data["fenster-bedeutungen"].height,
			minWidth: 400,
			minHeight: 400,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				devTools: devtools,
				defaultEncoding: "utf-8",
			},
		});
		// Menü erzeugen
		let menu = Menu.buildFromTemplate(layoutMenuAnsicht);
		bedeutungenWin.win.setMenu(menu);
		bedeutungenWin.win.setMenuBarVisibility(false);
		bedeutungenWin.win.on("leave-full-screen", function() {
			// nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
			// (ohne Timeout geht es nicht)
			setTimeout(() => bedeutungenWin.win.setMenuBarVisibility(false), 1);
		});
		// HTML laden
		bedeutungenWin.win.loadFile(path.join(__dirname, "win", "bedeutungen.html"));
		// Fenster anzeigen, sobald alles geladen wurde
		bedeutungenWin.win.once("ready-to-show", function() {
			bedeutungenWin.win.show();
			// ggf. maximieren
			if (optionen.data["fenster-bedeutungen"].maximiert) {
				bedeutungenWin.win.maximize();
			}
			// Daten aus dem Renderer-Prozess holen
			bedeutungenWin.daten();
		});
		// globales Fensterobjekt beim Schließen dereferenzieren
		bedeutungenWin.win.on("close", () => bedeutungenWin.win = null);
	},
	// Bedeutungsgerüst-Fenster schließen
	schliessen () {
		if (!bedeutungenWin.win) {
			return;
		}
		bedeutungenWin.win.close();
	},
	// Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
	daten () {
		if (!bedeutungenWin.win) {
			return;
		}
		// Daten zusammentragen
		const {remote} = require("electron");
		let daten = {
			wort: kartei.wort,
			bd: data.bd,
			winId: remote.getCurrentWindow().id,
		};
		// Daten senden
		bedeutungenWin.win.webContents.send("daten", daten);
	},
	// speichert den Status, also die Größe und Position des Fensters
	// (das muss leider über den Main-Prozess laufen)
	status (status) {
		for (let wert in status) {
			if (!status.hasOwnProperty(wert)) {
				continue;
			}
			if (status[wert] === null) {
				continue;
			}
			optionen.data["fenster-bedeutungen"][wert] = status[wert];
		}
		optionen.speichern();
	},
};
