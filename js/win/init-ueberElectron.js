"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.appName();
	initWin.events();
	initWin.eventsPopup();

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

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
