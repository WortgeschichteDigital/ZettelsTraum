"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "bedeutungen";

	// INIT-COMMON
	initCommon.listenerMain();
	initCommon.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// ICONS
	document.getElementById("bd-win-drucken").addEventListener("click", evt => {
		evt.preventDefault();
		bedeutungen.drucken();
	});
	
	// DROPDOWN
	document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

	// ANZEIGE INITIALISIEREN
	helfer.fensterGeladen();
});
