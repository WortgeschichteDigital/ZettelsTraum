"use strict";

window.addEventListener("load", function() {
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// EVENTS INITIALISIEREN
	const {ipcRenderer} = require("electron");
	// Über App
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app", "bedeutungen"));
	// Druck-Icon
	document.getElementById("bd-win-drucken").addEventListener("click", function(evt) {
		evt.preventDefault();
		bedeutungencont.drucken();
	});
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	ipcRenderer.on("daten", (evt, daten) => bedeutungencont.aufbauen(daten));
});
