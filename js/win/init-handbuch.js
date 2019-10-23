"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "handbuch";

	// INIT-COMMON
	initCommon.appName();
	initCommon.events();
	initCommon.eventsSuche();
	initCommon.eventsPopup();
	initCommon.listenerMain();

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// ANZEIGE INITIALISIEREN
	hilfe.sektionWechseln("einfuehrung", false);
	hilfe.ladenAus();
});
