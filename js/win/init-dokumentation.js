"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.appName();
	initWin.xmlPrettyPrint();
	initWin.events();
	initWin.eventsSuche();
	initWin.eventsPopup();
	initWin.eventsHilfeKopf();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
