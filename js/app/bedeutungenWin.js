"use strict";

let bedeutungenWin = {
	// Fenster öffnen oder schließen
	//   oeffnen = Boolean
	//     (Fenster öffnen oder schließen)
	oeffnen (oeffnen) {
		const {ipcRenderer} = require("electron");
		if (oeffnen) {
			ipcRenderer.send("kartei-bedeutungen-fenster", true);
		} else {
			ipcRenderer.send("kartei-bedeutungen-fenster", false);
		}
	},
	// Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
	daten () {
		// Daten zusammentragen
		let daten = {
			wort: kartei.wort,
			bd: data.bd,
		};
		// Daten senden
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("kartei-bedeutungen-fenster-daten", daten);
	},
};
