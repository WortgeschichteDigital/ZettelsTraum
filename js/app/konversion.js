"use strict";

let konversion = {
	// aktuelle Version des Dateiformats
	// *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
	// Bei Änderungen anpassen!
	version: 8,
	// Verteilerfunktion
	start () {
		konversion.von1nach2();
		konversion.von2nach3();
		konversion.von3nach4();
		konversion.von4nach5();
		konversion.von5nach6();
		konversion.von6nach7();
		konversion.von7nach8();
	},
	// Konversion des Dateiformats von Version 1 nach Version 2
	von1nach2 () {
		if (data.ve > 1) {
			return;
		}
		// Datenfeld "kr" (Korpus) in allen Karteikarten ergänzen
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			data.ka[id].kr = "";
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 2 nach Version 3
	von2nach3 () {
		if (data.ve > 2) {
			return;
		}
		// Datenfeld "bl" (Wortbildung) in allen Karteikarten ergänzen
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			data.ka[id].bl = "";
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 3 nach Version 4
	von3nach4 () {
		if (data.ve > 3) {
			return;
		}
		// Datenfeld "sy" (Wortbildung) in allen Karteikarten ergänzen
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			data.ka[id].sy = "";
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 4 nach Version 5
	von4nach5 () {
		if (data.ve > 4) {
			return;
		}
		// Bedeutungsgerüst konstituieren
		bedeutungen.konstit();
		// Datenfeld "bd" (Wortbildung) in allen Karteikarten auf das neue Format umstellen
		let gr = data.bd.gr["1"].bd;
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			let bd = data.ka[id].bd.split("\n");
			data.ka[id].bd = [];
			for (let i = 0, len = bd.length; i < len; i++) {
				for (let j = 0, len = gr.length; j < len; j++) {
					if (bd[i] === gr[j].bd.join(": ")) {
						data.ka[id].bd.push({
							gr: "1",
							id: gr[j].id,
						});
						break;
					}
				}
			}
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 5 nach Version 6
	von5nach6 () {
		if (data.ve > 5) {
			return;
		}
		// Format der Kartei-Notizen: plain text => HTML
		if (data.no) {
			// Spitzklammern maskieren
			let notizen = data.no.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			// Zeilenumbrüche in HTML überführen
			let zeilen = notizen.split("\n");
			data.no = zeilen[0]; // 1. Zeile ist nicht in <div> eingeschlossen
			for (let i = 1, len = zeilen.length; i < len; i++) {
				data.no += "<div>";
				if (!zeilen[i]) {
					data.no += "<br>"; // Leerzeile
				} else {
					data.no += zeilen[i];
				}
				data.no += "</div>";
			}
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 6 nach Version 7
	von6nach7 () {
		if (data.ve > 6) {
			return;
		}
		// reserviertes Datenfeld für die Sortierfunktion löschen
		delete data.ha;
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Konversion des Dateiformats von Version 7 nach Version 8
	von7nach8 () {
		if (data.ve > 7) {
			return;
		}
		// Datenfeld "mt" (Metatext) in allen Karteikarten ergänzen
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			data.ka[id].mt = false;
		}
		// Versionsnummer hochzählen
		data.ve++;
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
};
