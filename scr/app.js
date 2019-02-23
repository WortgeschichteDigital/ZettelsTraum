"use strict";

// Globales Datenobjekt, in dem die Werte zum aktuellen
// Beleg gespeichert werden.
let data = {};

// Initialisierung der App
window.addEventListener("load", function() {
	// Start-Sektion initialisieren
	document.querySelector("#start_erstellen").addEventListener("click", function() {
		kartei.wortErfragen();
	});
	document.querySelector("#start_oeffnen").addEventListener("click", function() {
		kartei.oeffnen();
	});
	// Dialog-Elemente initialisieren
	document.getElementById("dialog_prompt_text").addEventListener("keydown", function(evt) {
		if (evt.which === 13) { // Enter im Textfeld führt die Aktion aus
			overlay.schliessen(this);
		}
	});
	// Dialog-Elemente initialisieren
	document.getElementById("dialog_ok_button").addEventListener("click", function() {
		overlay.schliessen(this);
	});
	// Schließen-Links von Overlays initialisieren
	let overlay_links = document.querySelectorAll(".overlay_schliessen");
	for (let i = 0, len = overlay_links.length; i < len; i++) {
		overlay.initSchliessen(overlay_links[i]);
	}
});
