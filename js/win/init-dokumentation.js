"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "dokumentation";

	// INIT-COMMON
	initCommon.appName();
	initCommon.events();
	initCommon.eventsSuche();
	initCommon.eventsPopup();
	initCommon.listenerMain();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// ANZEIGE INITIALISIEREN
	hilfe.sektionWechseln("start", false);
	hilfe.ladenAus();
});
