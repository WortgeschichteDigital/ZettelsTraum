"use strict";

let bedeutungenWin = {
	// Fenster öffnen oder schließen
	oeffnen (oeffnen) {
		let {ipcRenderer} = require("electron");
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
			bedeutungen: bedeutungenWin.get(),
		};
		// Daten senden
		let {ipcRenderer} = require("electron");
		ipcRenderer.send("kartei-bedeutungen-fenster-daten", daten);
	},
	// Bedeutungen aus den Karteikarten extrahieren
	get () {
		let daten = {
			bd: {},
			bd_folge: [],
		};
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			if (!data.ka[id].bd) {
				continue;
			}
			let schon_gezaehlt = new Set(),
				b = filter.baumExtrakt(data.ka[id].bd, "");
			for (let i = 0, len = b.length; i < len; i++) {
				if (!daten.bd[b[i]]) {
					let name = b[i].split(": ");
					daten.bd[b[i]] = {
						name: name[name.length - 1],
						wert: 0,
					};
					daten.bd_folge.push(b[i]);
				}
				if (schon_gezaehlt.has(b[i])) { // vgl. filter.aufbauen()
					continue;
				}
				daten.bd[b[i]].wert++;
				schon_gezaehlt.add(b[i]);
			}
		}
		daten.bd_folge.sort(helfer.sortAlpha);
		return daten;
	},
};
