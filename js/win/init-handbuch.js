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

	// ERWEITERTE NAVIGATION
	hilfe.naviDetailsInit();

	// FENSTER FREISCHALTEN
	hilfe.sektionWechseln("einfuehrung"); // damit der 1. Punkt im Inhaltsverzeichnis markiert wird
	helfer.fensterGeladen();
});
