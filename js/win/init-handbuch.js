"use strict";

window.addEventListener("load", function() {
	// KARTEIEN-SEKTION ANZEIGEN
	hilfe.sektionWechseln("karteien");
	
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// EVENTS INITIALISIEREN
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", function() {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-zettelstraum", "handbuch");
	});
	// Navigation
	document.querySelectorAll("nav a").forEach((i) => hilfe.navi(i));
});
