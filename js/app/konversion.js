"use strict";

let konversion = {
	// Verteilerfunktion
	start () {
		konversion.von1nach2();
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
};
