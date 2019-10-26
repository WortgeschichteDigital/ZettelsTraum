"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "handbuch";

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
	hilfe.sektionWechseln("einfuehrung"); // damit sich das Inhaltsverzeichnis aufbaut
	helfer.fensterGeladen();
});
