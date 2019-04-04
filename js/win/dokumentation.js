"use strict";

window.addEventListener("load", function() {
	// START-SEKTION ANZEIGEN
	hilfe.sektionWechseln("start");
	
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helfer.tastatur);
	
	// EVENTS INITIALISIEREN
	// Programm-Icon
	document.getElementById("icon").addEventListener("click", function() {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-zettelstraum", "dokumentation");
	});
	// Navigation
	document.querySelectorAll("nav a").forEach((i) => hilfe.navi(i));
	// Links
	document.querySelectorAll(".link-handbuch").forEach((i) => hilfe.oeffneHandbuch(i));
});
