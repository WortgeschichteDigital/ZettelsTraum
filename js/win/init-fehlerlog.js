"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "fehlerlog";

	// INIT-COMMON
	initCommon.events();

	// ICONS
	fehlerlog.kopieren(document.getElementById("kopieren"));

	// FEHLER BEIM MAIN-PROZESS ERFRAGEN
	const {ipcRenderer} = require("electron");
	let fehler = ipcRenderer.sendSync("fehler-senden");
	fehlerlog.fuellen(fehler);
});
