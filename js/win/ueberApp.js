"use strict";

window.addEventListener("load", function() {
	// app initialisieren
	const {app} = require("electron").remote;
	// Programm-Name eintragen
	document.querySelectorAll("header h1, #name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
	// Programm-Version eintragen
	document.getElementById("version").textContent = app.getVersion();
	// Klick-Events an Links hängen
	document.querySelectorAll("a").forEach(function(i) {
		if (i.classList.contains("intern")) {
			return;
		}
		helfer.links(i);
	});
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helfer.tastatur);
});
