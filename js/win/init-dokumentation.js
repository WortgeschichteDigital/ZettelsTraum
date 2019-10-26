"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "dokumentation";

	// INIT-COMMON
	initCommon.listenerMain();
	initCommon.appName();
	initCommon.events();
	initCommon.eventsSuche();
	initCommon.eventsPopup();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// ANZEIGE INITIALISIEREN
	helfer.fensterGeladen();
});
