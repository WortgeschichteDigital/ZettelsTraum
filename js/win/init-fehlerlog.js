"use strict";

window.addEventListener("load", async () => {
	// INIT
	await initWin.infos();
	initWin.ipcListener();
	initWin.events();

	// ANZEIGE TASTATURKÜRZEL ANPASSEN
	tastatur.shortcutsText();

	// TOOLTIPS INITIALISIEREN
	tooltip.init();

	// ICONS
	let reload = document.getElementById("reload");
	reload.addEventListener("click", evt => {
		evt.preventDefault();
		fehlerlog.reload();
	});
	reload.addEventListener("animationend", function() {
		this.classList.remove("rotieren-bitte");
	});
	fehlerlog.kopieren(document.getElementById("kopieren"));

	// FEHLER BEIM MAIN-PROZESS ERFRAGEN
	fehlerlog.reload();

	// FENSTER FREISCHALTEN
	helfer.fensterGeladen();
});
