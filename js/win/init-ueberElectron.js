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
	// externe Links
	document.querySelectorAll(`a[href^="http"]`).forEach((a) => helferWin.links(a));
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
});
