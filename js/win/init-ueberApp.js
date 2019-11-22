"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.appName();
	initWin.events();
	initWin.eventsPopup();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// PROGRAMM-VERSION EINTRAGEN
	document.getElementById("version").textContent = appInfo.version;

	// MAIL-ADRESSE EINTRAGEN
	const dekodiert = helfer.mailEntschluesseln("xbwfiehdhwrerzkpn{mbgutfpogspeqspAixfh0eg");
	let mail = document.getElementById("mail");
	mail.href = `mailto:${dekodiert}`;
	mail.textContent = dekodiert;

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
