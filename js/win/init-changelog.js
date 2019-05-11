"use strict";

window.addEventListener("load", function() {
	// Über App
	let {ipcRenderer} = require("electron");
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app", "changelog"));
	// Über Electron
	document.querySelector(".ueber-electron").addEventListener("click", function(evt) {
		evt.preventDefault();
		ipcRenderer.send("ueber-electron", "changelog");
	});
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
	// Programm-Name eintragen
	let {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
});
