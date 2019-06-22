"use strict";

let konversion = {
	// aktuelle Version des Dateiformats
	// *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
	// Bei Änderungen anpassen!
	version: 5,
	// Verteilerfunktion
	start () {
		konversion.von1nach2();
		konversion.von2nach3();
		konversion.von3nach4();
		konversion.von4nach5();
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
};
