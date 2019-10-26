"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "electron";

	// INIT-COMMON
	initCommon.appName();
	initCommon.events();
	initCommon.eventsPopup();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// VERSIONEN EINTRAGEN
	["electron", "node", "chrome", "v8"].forEach(i => {
		let element = document.getElementById(`version-${i}`);
		if (i === "electron") {
			element.textContent = `Version ${process.versions[i]}`;
		} else {
			element.textContent = process.versions[i];
		}
	});

	// ANZEIGE INITIALISIEREN
	helfer.fensterGeladen();
});
