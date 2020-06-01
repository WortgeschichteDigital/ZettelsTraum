"use strict";

let xml = {
	// enthält die übergebenen Daten
	data: {},
	// Anzeige mit den gelieferten Daten aufbereiten
	aufbauen () {
		// Wort eintragen
		document.querySelector("h1").textContent = xml.data.wort;
	},
};
