"use strict";

let bedeutungenWin = {
	// speichert die contentsId des zugehörigen Bedeutungsgerüst-Fensters
	contentsId: 0,
	// Bedeutungsgerüst-Fenster öffnen
	async oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen("alert");
			dialog.text("Um die Funktion <i>Kartei &gt; Bedeutungsgerüst-Fenster</i> zu nutzen, muss eine Kartei geöffnet sein.");
			return;
		}
		// Fenster schon offen? => Fenster fokussieren
		const {ipcRenderer} = require("electron");
		if (bedeutungenWin.contentsId) {
			ipcRenderer.invoke("bedeutungen-fokussieren", bedeutungenWin.contentsId);
			return;
		}
		// Fenster durch Main-Prozess öffnen lassen
		bedeutungenWin.contentsId = await ipcRenderer.invoke("bedeutungen-oeffnen", `Bedeutungsgerüst: ${kartei.wort}`);
	},
	// Bedeutungsgerüst-Fenster schließen
	schliessen () {
		if (!bedeutungenWin.contentsId) {
			return;
		}
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("bedeutungen-schliessen", bedeutungenWin.contentsId);
		bedeutungenWin.contentsId = 0;
	},
	// Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
	daten () {
		if (!bedeutungenWin.contentsId) {
			return;
		}
		// Daten zusammentragen
		let daten = {
			wort: kartei.wort,
			bd: data.bd,
			contentsId: winInfo.contentsId,
		};
		// Daten senden
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(bedeutungenWin.contentsId, "daten", daten);
	},
};
