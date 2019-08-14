"use strict";

window.addEventListener("load", function() {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "dokumentation";
	
	// START-SEKTION ANZEIGEN
	hilfe.sektionWechseln("start");
	
	// PROGRAMM-NAME EINTRAGEN
	try { // damit die Dokumentation auch im Browser geladen werden kann und die Navigation funktioniert
		const {app} = require("electron").remote;
		document.querySelectorAll(".app-name").forEach(function(i) {
			i.textContent = app.getName().replace("'", "’");
		});
	} catch (err) {}
	
	// UMBRUCH IN LANGEN DATEIPFADE
	hilfe.dateiBreak();
	
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// RECHTSKLICK ABFANGEN
	window.addEventListener("contextmenu", function(evt) {
		evt.preventDefault();
		popup.oeffnen(evt);
	});
	
	// EVENTS INITIALISIEREN
	// Suche
	hilfe.sucheListener(document.getElementById("suchfeld"));
	document.getElementById("suchfeld-lupe").addEventListener("click", function(evt) {
		evt.preventDefault();
		hilfe.sucheWechseln();
	});
	// Über App
	try { // s.o.
		const {ipcRenderer} = require("electron");
		document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app"));
		// Über Electron
		document.querySelector(".ueber-electron").addEventListener("click", function(evt) {
			evt.preventDefault();
			ipcRenderer.send("ueber-electron");
		});
	} catch (err) {}
	// Handbuch
	document.querySelectorAll(".link-handbuch").forEach((a) => helferWin.oeffneHandbuch(a));
	// Navigation
	document.querySelectorAll(`a[class^="link-sektion-"`).forEach((a) => hilfe.sektion(a));
	// interne Sprung-Links
	document.querySelectorAll(`a[href^="#"]`).forEach(function(a) {
		if (/^#[a-z]/.test(a.getAttribute("href"))) {
			hilfe.naviSprung(a);
		}
	});
	// externe Links
	document.querySelectorAll(`a[href^="http"]`).forEach((a) => helferWin.links(a));
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
