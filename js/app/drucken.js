"use strict";

let drucken = {
	// Listener für die Druck-Icons
	//   a = Element
	//     (Icon-Link, auf den geklickt wurde)
	listener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			drucken.init();
		});
	},
	// Drucken initialisieren
	init () {
		dialog.oeffnen("alert", null);
		dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
	},
};
