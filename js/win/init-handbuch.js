"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.appName();
	initWin.events();
	initWin.eventsSuche();
	initWin.eventsPopup();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// FENSTER FREISCHALTEN
	hilfe.sektionWechseln("einfuehrung"); // damit sich das Inhaltsverzeichnis aufbaut
	helfer.fensterGeladen();
});
