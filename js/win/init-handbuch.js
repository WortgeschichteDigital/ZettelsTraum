"use strict";

window.addEventListener("load", () => {
	// FENSTERTTYP REGISTRIEREN
	window.fenstertyp = "handbuch";

	// PROGRAMM-NAME EINTRAGEN
	const {app} = require("electron").remote;
	document.querySelectorAll(".app-name").forEach(i => {
		i.textContent = app.getName().replace("'", "’");
	});

	// UMBRUCH IN LANGEN DATEIPFADEN
	hilfe.dateiBreak();

	// TASTATUREINGABEN ABFANGEN
	document.addEventListener("keydown", helferWin.tastatur);

	// RECHTSKLICK ABFANGEN
	window.addEventListener("contextmenu", evt => {
		evt.preventDefault();
		popup.oeffnen(evt);
	});

	// EVENTS INITIALISIEREN
	// Suche
	hilfe.sucheListener(document.getElementById("suchfeld"));
	document.getElementById("suchfeld-lupe").addEventListener("click", evt => {
		evt.preventDefault();
		hilfe.sucheWechseln();
	});
	document.getElementById("suchleiste-link").addEventListener("click", evt => {
		evt.preventDefault();
		suchleiste.einblenden();
	});
	document.getElementById("navi-back").addEventListener("click", evt => {
		evt.preventDefault();
		hilfe.historyNavi(false);
	});
	document.getElementById("navi-forward").addEventListener("click", evt => {
		evt.preventDefault();
		hilfe.historyNavi(true);
	});
	// Vorschau-Bilder
	document.querySelectorAll("figure").forEach(i => {
		i.addEventListener("click", function() {
			hilfe.bild(this);
		});
	});
	// Demonstrationskartei öffnen
	document.querySelectorAll(".hilfe-demo").forEach(i => {
		i.addEventListener("click", evt => {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-demo");
		});
	});
	// Über App
	document.querySelectorAll("#icon, .ueber-app").forEach(i => {
		i.addEventListener("click", evt => {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("ueber-app");
		});
	});
	// Über Electron
	document.querySelectorAll(".ueber-electron").forEach(i => {
		i.addEventListener("click", evt => {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("ueber-electron");
		});
	});
	// Dokumentation
	document.querySelectorAll(".link-dokumentation").forEach(a => helferWin.oeffne(a));
	// Changelog
	document.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
	// Fehlerlog
	document.querySelectorAll(".link-fehlerlog").forEach(a => helferWin.oeffneFehlerlog(a));
	// Suche fokussieren
	document.querySelectorAll(".link-suche").forEach(a => {
		a.addEventListener("click", evt => {
			evt.preventDefault();
			document.getElementById("suchfeld").select();
		});
	});
	// interne Sprung-Links
	document.querySelectorAll(`a[href^="#"]`).forEach(a => {
		if (/^#[a-z]/.test(a.getAttribute("href"))) {
			hilfe.naviSprung(a);
		}
	});
	// externe Links
	document.querySelectorAll(`a[href^="http"]`).forEach(a => helfer.externeLinks(a));
	
	// SIGNALE DES MAIN-PROZESSES
	const {ipcRenderer} = require("electron");
	ipcRenderer.on("oeffne-abschnitt", (evt, abschnitt) => hilfe.naviSprungAusfuehren(abschnitt));

	// EINFÜHRUNGSSEKTION ANZEIGEN
	hilfe.sektionWechseln("einfuehrung", false);
});

window.addEventListener("beforeunload", () => {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	ipcRenderer.send("fenster-dereferenzieren", win.id);
});
