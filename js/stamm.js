"use strict";

let stamm = {
	// Wortstamm-Fenster einblenden
	oeffnen () {
		let fenster = document.getElementById("stamm");
		// Fenster öffnen oder in den Vordergrund holen
		if ( overlay.oeffnen(fenster) ) { // Fenster ist schon offen
			return;
		}
		// TODO Liste erzeugen
		// Fokus in das Textfeld
		document.getElementById("stamm-text").focus();
	},
};
