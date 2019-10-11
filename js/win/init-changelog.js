"use strict";

window.addEventListener("load", function() {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "changelog";

	// PROGRAMM-NAME EINTRAGEN
	const {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});

	// TASTATUREINGABE ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);

	// EVENTS INITIALISIEREN
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
	// Handbuch und Dokumentation
	document.querySelectorAll(".link-handbuch, .link-dokumentation").forEach(a => helferWin.oeffne(a));
	// Icons
	document.querySelectorAll("#changelog-icons a").forEach(function(a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/suchleiste$/.test(this.id)) {
				suchleiste.einblenden();
			} else if (/drucken$/.test(this.id)) {
				print();
			}
		});
	});
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
