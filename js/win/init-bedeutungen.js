"use strict";

window.addEventListener("load", function() {
	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);
	
	// EVENTS INITIALISIEREN
	document.querySelectorAll(".dropdown-feld").forEach((i) => dropdown.feld(i));
	document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach((i) =>	dropdown.link(i));
	const {ipcRenderer} = require("electron");
	// Über App
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app", "bedeutungen"));
	// Druck-Icon
	document.getElementById("bd-win-drucken").addEventListener("click", function(evt) {
		evt.preventDefault();
		bedeutungen.drucken();
	});
	
	// ANFRAGEN DES MAIN-PROZESSES ABFANGEN
	ipcRenderer.on("daten", (evt, daten) => {
		bedeutungen.data = daten;
		bedeutungen.aufbauen();
	});
});

window.addEventListener("beforeunload", function() {
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	let status = {
		x: null,
		y: null,
		width: null,
		height: null,
		maximiert: win.isMaximized(),
		winId: bedeutungen.data.winId,
	};
	const bounds = win.getBounds();
	if (!status.maximiert && bounds) {
		status.x = bounds.x;
		status.y = bounds.y;
		status.width = bounds.width;
		status.height = bounds.height;
	}
	ipcRenderer.send("bedeutungen-fenster-status", status);
});
