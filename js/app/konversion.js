"use strict";

let konversion = {
	// aktuelle Version des Dateiformats
	// *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
	// Bei Änderungen anpassen!
	version: 3,
	// Verteilerfunktion
	start () {
		konversion.von1nach2();
		konversion.von2nach3();
		bedeutungen.konstit(); // TODO das gehört dann in die entsprechende Konversions-Funktion
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
};
