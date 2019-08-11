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
	document.getElementById("icon").addEventListener("click", function() {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("ueber-app");
	});
	// Navigation
	document.querySelectorAll(`a[class^="link-sektion-"`).forEach((i) => hilfe.sektion(i));
	// interne Sprung-Links
	document.querySelectorAll(`a[href^="#"]`).forEach(function(a) {
		if (/^#[a-z]/.test(a.getAttribute("href"))) {
			hilfe.naviSprung(a);
		}
	});
	// externe Links TODO (gibt es sowas im Handbuch?)
	document.querySelectorAll(`a[href^="http"]`).forEach((a) => helferWin.links(a));
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
