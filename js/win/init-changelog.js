"use strict";

window.addEventListener("load", function() {
	// Fensterttyp registrieren
	window.fenstertyp = "changelog";
	// Über App
	const {ipcRenderer} = require("electron");
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app"));
	// Über Electron
	document.querySelector(".ueber-electron").addEventListener("click", function(evt) {
		evt.preventDefault();
		ipcRenderer.send("ueber-electron", "changelog");
	});
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
	// Programm-Name eintragen
	const {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(function(i) {
		i.textContent = app.getName().replace("'", "’");
	});
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
