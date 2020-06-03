"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.events();
	initWin.eventsPopup();

	// DIALOG
	overlay.initSchliessen(document.querySelector("#dialog h2 a"));
	document.getElementById("dialog-prompt-text").addEventListener("keydown", function(evt) {
		tastatur.detectModifiers(evt);
		if (!tastatur.modifiers && evt.key === "Enter") {
			overlay.schliessen(this);
		}
	});
	["dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button"].forEach(button => {
		document.getElementById(button).addEventListener("click", function() {
			overlay.schliessen(this);
		});
	});

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();
	
	// DROPDOWN
	document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
