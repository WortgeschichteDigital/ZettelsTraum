"use strict";

window.addEventListener("load", function() {
	// Fensterttyp registrieren
	window.fenstertyp = "app";
	// app initialisieren
	const {app} = require("electron").remote;
	// Programm-Name eintragen
	document.querySelectorAll("main h1, #name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
	// Programm-Version eintragen
	document.getElementById("version").textContent = app.getVersion();
	// externe Links
	document.querySelectorAll(`a[href^="http"], a[href^="mailto"]`).forEach((a) => helferWin.links(a));
	// Changelog
	helferWin.oeffneChangelog(document.getElementById("changelog"));
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
