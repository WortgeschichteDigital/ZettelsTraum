"use strict";

let redXml = {
	// speichert die contentsId des zugehörigen XML-Fensters
	contentsId: 0,
	// XML-Fenster öffnen
	async oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Redaktion &gt; XML</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Fenster schon offen? => Fenster fokussieren
		const {ipcRenderer} = require("electron");
		if (redXml.contentsId) {
			ipcRenderer.invoke("red-xml-fokussieren", redXml.contentsId);
			return;
		}
		// Fenster durch Main-Prozess öffnen lassen
		redXml.contentsId = await ipcRenderer.invoke("red-xml-oeffnen", `XML: ${kartei.wort}`);
	},
	// Bedeutungsgerüst-Fenster schließen
	schliessen () {
		return new Promise(async resolve => {
			if (!redXml.contentsId) {
				resolve(false);
				return;
			}
			const {ipcRenderer} = require("electron");
			await ipcRenderer.invoke("red-xml-schliessen", redXml.contentsId);
			redXml.contentsId = 0;
			resolve(true);
		});
	},
	// Daten zusammentragen und an das Bedeutungsgerüst-Fenster schicken
	daten () {
		if (!redXml.contentsId) {
			return;
		}
		// Daten zusammentragen
		let xmlDaten = {
			wort: kartei.wort,
			contentsId: winInfo.contentsId,
			xl: data.rd.xl,
		};
		// Daten senden
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(redXml.contentsId, "xml-daten", xmlDaten);
	},
};
