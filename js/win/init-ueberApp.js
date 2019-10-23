"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "app";

	// INIT-COMMON
	initCommon.appName();
	initCommon.events();

	// PROGRAMM-VERSION EINTRAGEN
	const {app} = require("electron").remote;
	document.getElementById("version").textContent = app.getVersion();
});
