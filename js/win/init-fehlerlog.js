"use strict";

window.addEventListener("load", function() {
	// Über App
	const {ipcRenderer} = require("electron");
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app"));
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
	// Fehler vom Main-Prozess holen
	let fehler = ipcRenderer.sendSync("fehler-senden");
	fehlerlog.fuellen(fehler);
});

window.addEventListener("beforeunload", function() {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
