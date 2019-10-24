"use strict";

let bedeutungenWin = {
	// Zwischenspeicher für den Verweis auf das Bedeutungsgerüst-Fenster
	win: null,
	// enthält die Menüvorlage (nur für macOS relevant)
	vorlageMenu: [],
	// Bedeutungsgerüst-Fenster öffnen
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen("alert");
			dialog.text("Um die Funktion <i>Kartei &gt; Bedeutungsgerüst-Fenster</i> zu nutzen, muss eine Kartei geöffnet sein.");
			return;
		}
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
		// Menü-Templates
		let layoutMenuAnsicht = [
			{
				label: "&Ansicht",
				submenu: [
					{
						label: "Schrift vergrößern",
						icon: path.join(__dirname, "img", "menu", "plus-quadrat.png"),
						role: "zoomIn",
						accelerator: "CommandOrControl+=",
					},
					{
						label: "Schrift verkleinern",
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
						click: () => {
							const {remote} = require("electron"),
								win = remote.getCurrentWindow();
							win.close();
						},
						accelerator: "CommandOrControl+W",
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
			if (process.platform === "darwin") {
				layoutMenuAnsicht[layoutMenuAnsicht.length - 1].label = "Dev";
			}
		}
		// Menüvorlagen für macOS aufbereiten
		if (process.platform === "darwin") {
			// Standardmenü anpassen
			layoutMenuAnsicht[0].label = "Ansicht";
			// Ansichtmenü ergänzen
			layoutMenuAnsicht.unshift(layoutMenuMac[0]);
		}
		// Fenster öffnen
		bedeutungenWin.win = new BrowserWindow({
			title: `Bedeutungsgerüst: ${kartei.wort}`,
			icon: bedeutungenWin.icon(),
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
		if (process.platform !== "darwin") {
			let menu = Menu.buildFromTemplate(layoutMenuAnsicht);
			bedeutungenWin.win.setMenu(menu);
			bedeutungenWin.win.setMenuBarVisibility(false);
			bedeutungenWin.win.on("leave-full-screen", function() {
				// nach Verlassen des Vollbilds muss die Menüleiste wieder ausgeblendet werden
				// (ohne Timeout geht es nicht)
				setTimeout(() => bedeutungenWin.win.setMenuBarVisibility(false), 1);
			});
		} else if (process.platform === "darwin") {
			bedeutungenWin.vorlage = layoutMenuAnsicht;
			bedeutungenWin.win.on("focus", () => {
				const {Menu} = require("electron").remote;
				let menu = Menu.buildFromTemplate(bedeutungenWin.vorlage);
				Menu.setApplicationMenu(menu);
			});
		}
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
	// ermittelt das zum Betriebssystem passende Programm-Icon
	icon () {
		const path = require("path");
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
};
