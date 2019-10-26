"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "changelog";

	// INIT-COMMON
	initCommon.appName();
	initCommon.events();
	initCommon.eventsPopup();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// ICONS
	document.querySelectorAll("#changelog-icons a").forEach(a => {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/suchleiste$/.test(this.id)) {
				suchleiste.einblenden();
			} else if (/drucken$/.test(this.id)) {
				print();
			}
		});
	});

	// ANZEIGE INITIALISIEREN
	helfer.fensterGeladen();
});
