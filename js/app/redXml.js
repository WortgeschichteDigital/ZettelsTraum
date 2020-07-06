"use strict";

let redXml = {
	// speichert die contentsId des zugehörigen XML-Fensters
	contentsId: 0,
	// speichert, ob das Fenster gerade initialisiert wird
	// (abgeschlossen, wenn die Init-Daten gesendet wurden)
	winInit: false,
	// XML-Fenster öffnen
	oeffnen () {
		return new Promise(async resolve => {
			// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
			if (!kartei.wort) {
				dialog.oeffnen({
					typ: "alert",
					text: "Um die Funktion <i>Redaktion &gt; XML</i> zu nutzen, muss eine Kartei geöffnet sein.",
				});
				resolve(false);
				return;
			}
			// Fenster schon offen? => Fenster fokussieren
			const {ipcRenderer} = require("electron");
			if (redXml.contentsId) {
				ipcRenderer.invoke("red-xml-fokussieren", redXml.contentsId);
				resolve(false);
				return;
			}
			// Fenster durch Main-Prozess öffnen lassen
			redXml.contentsId = await ipcRenderer.invoke("red-xml-oeffnen", `XML: ${kartei.wort}`);
			resolve(true);
		});
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
	// Daten zusammentragen und an das XML-Fenster schicken
	daten () {
		if (!redXml.contentsId) {
			return;
		}
		// Daten zusammentragen
		let xmlDaten = {
			autorinnen: [],
			contentsId: winInfo.contentsId,
			gerueste: {},
			themenfelder: [],
			wort: kartei.wort,
			xl: data.rd.xl,
		};
		if (optionen.data.personen.length) {
			for (let i of optionen.data.personen) {
				let name = i;
				if (/,/.test(i)) {
					let match = i.match(/(.+),\s?(.+)/);
					name = `${match[2]} ${match[1]}`;
				}
				xmlDaten.autorinnen.push(name);
			}
		}
		for (let [k, v] of Object.entries(data.bd.gr)) {
			xmlDaten.gerueste[k] = v.na;
		}
		if (optionen.data.tags.themenfelder) {
			for (let v of Object.values(optionen.data.tags.themenfelder.data)) {
				xmlDaten.themenfelder.push(v.name);
			}
		}
		// Daten senden
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(redXml.contentsId, "xml-daten", xmlDaten);
		// Init als abgeschlossen markieren
		xml.winInit = true;
	},
	// einen Datensatz an das XML-Fenster schicken
	//   xmlDatensatz = Object
	//     (der Datensatz, der an das Fenster gehen soll)
	async datensatz ({xmlDatensatz}) {
		// Ist das Fenster schon offen?
		if (!redXml.contentsId) {
			// Init-Markierung zurücksetzen
			xml.winInit = false;
			// Fenster öffnen
			await redXml.oeffnen();
			// warten, bis das Fenster mit dem Init fertig ist
			while (!xml.winInit) {
				await new Promise(warten => setTimeout(() => warten(true), 25));
			}
			await new Promise(warten => setTimeout(() => warten(true), 250));
		}
		// Datensatz an das Fenster schicken
		const {ipcRenderer} = require("electron");
		ipcRenderer.sendTo(redXml.contentsId, "xml-datensatz", xmlDatensatz);
		// Animation
		helfer.animation("xml");
	},
	// aus dem XML-Fenster empfangene Daten in die Kartei schreiben
	//   daten = Object
	//     (die XML-Datei-Daten)
	speichern ({daten}) {
		data.rd.xl = daten;
		kartei.karteiGeaendert(true);
	},
};
