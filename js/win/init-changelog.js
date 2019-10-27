"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.appName();
	initWin.events();
	initWin.eventsPopup();

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

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
