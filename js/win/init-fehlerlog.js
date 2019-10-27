"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// ICONS
	fehlerlog.kopieren(document.getElementById("kopieren"));

	// FEHLER BEIM MAIN-PROZESS ERFRAGEN
	const {ipcRenderer} = require("electron");
	let fehler = ipcRenderer.sendSync("fehler-senden");
	fehlerlog.fuellen(fehler);

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
