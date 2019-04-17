"use strict";

window.addEventListener("load", function() {
	// START-SEKTION ANZEIGEN
	hilfe.sektionWechseln("start");
	
	// PROGRAMM-NAME EINTRAGEN
	const {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
	
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
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
	// Klick-Events an andere Links hängen
	document.querySelectorAll("a").forEach(function(i) {
		if (i.classList.contains("intern")) {
			return;
		}
		helferWin.links(i);
	});
});
