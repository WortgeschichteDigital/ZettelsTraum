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

	// TOOLTIPS INITIALISIEREN
	tooltip.init();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// ERWEITERTE NAVIGATION
	hilfe.naviDetailsInit();

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
