"use strict";

window.addEventListener("load", function() {
	// app initialisieren
	let {app} = require("electron").remote;
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
