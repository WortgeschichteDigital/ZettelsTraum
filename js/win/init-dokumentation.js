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
	// Über Electron
	document.querySelector(".ueber-electron").addEventListener("click", function(evt) {
		evt.preventDefault();
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-electron", "dokumentation");
	});
	// Navigation durch die Sektionen
	document.querySelectorAll(`a[class^="link-sektion-"`).forEach((i) => hilfe.sektion(i));
	// spezielle Links
	document.querySelectorAll(".link-handbuch").forEach((i) => hilfe.oeffneHandbuch(i));
	// Klick-Events an andere Links hängen
	document.querySelectorAll("a").forEach(function(i) {
		if (i.classList.contains("sprung")) {
			hilfe.naviSprung(i);
			return;
		}
		if (i.classList.contains("intern")) {
			return;
		}
		helferWin.links(i);
	});
});
