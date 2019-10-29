"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// ICONS
	document.getElementById("reload").addEventListener("click", evt => {
		evt.preventDefault();
		fehlerlog.reload();
	});
	fehlerlog.kopieren(document.getElementById("kopieren"));

	// FEHLER BEIM MAIN-PROZESS ERFRAGEN
	fehlerlog.reload();

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
