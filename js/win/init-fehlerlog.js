"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "fehlerlog";

	// INIT-COMMON
	initCommon.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// ICONS
	fehlerlog.kopieren(document.getElementById("kopieren"));

	// FEHLER BEIM MAIN-PROZESS ERFRAGEN
	const {ipcRenderer} = require("electron");
	let fehler = ipcRenderer.sendSync("fehler-senden");
	fehlerlog.fuellen(fehler);

	// ANZEIGE INITIALISIEREN
	helfer.fensterGeladen();
});
