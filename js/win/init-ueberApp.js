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

	// PROGRAMM-VERSION EINTRAGEN
	document.getElementById("version").textContent = appInfo.version;

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
