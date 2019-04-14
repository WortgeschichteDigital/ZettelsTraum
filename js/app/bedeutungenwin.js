"use strict";

let bedeutungenwin = {
	// Fenster öffnen oder schließen
	oeffnen (oeffnen) {
		const {ipcRenderer} = require("electron");
		if (oeffnen) {
			ipcRenderer.send("kartei-bedeutungen-fenster", true);
		} else {
			ipcRenderer.send("kartei-bedeutungen-fenster", false);
		}
	},
	// enthält die Bedeutungen, wie sie zuletzt an das Bedeutungen-Fenster
	// geschickt wurden; so können sie mit den neuen verglichen werden, was
	// das Senden mitunter unnötig macht.
	datenBak: "",
	// Daten zusammentragen und an das Bedeutungen-Fenster schicken
	daten () {
		// Daten zusammentragen
		let daten = {
			wort: kartei.wort,
			bedeutungen: bedeutungenwin.get(),
		};
		// Müssen die Daten wirklich gesendet werden?
		// TODO Kontrollstruktur einstellen, sobald die Tests vorbei sind
		if (false && JSON.stringify(daten) === bedeutungenwin.datenBak) {
			return;
		}
		bedeutungenwin.datenBak = JSON.stringify(daten);
		// Daten senden
		const {ipcRenderer} = require("electron");
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
