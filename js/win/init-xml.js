"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();
	
	// DROPDOWN
	document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
