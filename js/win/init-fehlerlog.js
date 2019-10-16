"use strict";

window.addEventListener("load", () => {
	// Fensterttyp registrieren
	window.fenstertyp = "fehlerlog";
	// Über App
	const {ipcRenderer} = require("electron");
	document.getElementById("icon").addEventListener("click", () => ipcRenderer.send("ueber-app"));
	// Tastatur-Events abfangen
	document.addEventListener("keydown", helferWin.tastatur);
	// Listener an Kopier-Link hängen
	fehlerlog.kopieren(document.getElementById("kopieren"));
	// Fehler vom Main-Prozess holen
	let fehler = ipcRenderer.sendSync("fehler-senden");
	fehlerlog.fuellen(fehler);
});

window.addEventListener("beforeunload", () => {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
