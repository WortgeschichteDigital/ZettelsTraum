"use strict";

window.addEventListener("load", function() {
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// EVENTS INITIALISIEREN
	const {ipcRenderer} = require("electron");
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-zettelstraum", "bedeutungen"));
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	ipcRenderer.on("daten", (evt, daten) => bedeutungencont.aufbauen(daten));
	
	// TODO TEST
	// Bedeutungen holen (brauche ich nur für die Testphase)
	ipcRenderer.send("bedeutungen-fenster-daten");
});
