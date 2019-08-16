"use strict";

window.addEventListener("load", function() {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "handbuch";
	
	// KARTEIEN-SEKTION ANZEIGEN
	hilfe.sektionWechseln("karteien");
	
	// PROGRAMM-NAME EINTRAGEN
	const {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
	
	// UMBRUCH IN LANGEN DATEIPFADEN
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
	document.getElementById("suchleiste-link").addEventListener("click", function(evt) {
		evt.preventDefault();
		suchleiste.einblenden();
	});
	// Über App
	document.querySelectorAll("#icon, .ueber-app").forEach(function(i) {
		i.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("ueber-app");
		});
	});
	// Über Electron
	document.querySelectorAll(".ueber-electron").forEach(function(i) {
		i.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("ueber-electron");
		});
	});
	// Dokumentation
	document.querySelectorAll(".link-dokumentation").forEach(a => helferWin.oeffneDokumentation(a));
	// Changelog
	document.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
	// Navigation
	document.querySelectorAll(`a[class^="link-sektion-"`).forEach(i => hilfe.sektion(i));
	// interne Sprung-Links
	document.querySelectorAll(`a[href^="#"]`).forEach(function(a) {
		if (/^#[a-z]/.test(a.getAttribute("href"))) {
			hilfe.naviSprung(a);
		}
	});
	// externe Links
	document.querySelectorAll(`a[href^="http"]`).forEach(a => helfer.externeLinks(a));
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
