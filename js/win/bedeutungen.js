"use strict";

window.addEventListener("load", function() {
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// EVENTS INITIALISIEREN
	const {ipcRenderer} = require("electron");
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-zettelstraum", "bedeutungen"));
	// Druck-Icon
	document.getElementById("bd-win-drucken").addEventListener("click", function(evt) {
		evt.preventDefault();
		bedeutungencont.drucken();
	});
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	ipcRenderer.on("daten", (evt, daten) => bedeutungencont.aufbauen(daten));
});
