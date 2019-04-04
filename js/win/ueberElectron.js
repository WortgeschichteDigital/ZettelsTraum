"use strict";

window.addEventListener("load", function() {
	// Programm-Name eintragen
	const {app} = require("electron").remote;
	document.getElementById("name").textContent = app.getName().replace("'", "’");
	// Versionen eintragen
	document.getElementById("version-electron").textContent = `Version ${process.versions.electron}`;
	document.getElementById("version-nodejs").textContent = process.versions.node;
	document.getElementById("version-chromium").textContent = process.versions.chrome;
	document.getElementById("version-v8").textContent = process.versions.v8;
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
