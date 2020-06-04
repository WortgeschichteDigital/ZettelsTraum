"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.appName();
	initWin.xmlPrettyPrint();
	initWin.events();
	initWin.eventsPopup();
	initWin.eventsHilfeKopf();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
