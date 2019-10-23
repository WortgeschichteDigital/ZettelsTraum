"use strict";

let initCommon = {
	// Programmname in Elemente eintragen
	appName () {
		const {app} = require("electron").remote;
		document.querySelectorAll(".app-name").forEach(i => {
			i.textContent = app.getName().replace("'", "’");
		});
	},
	// Events initialisieren
	events () {
		// Tastatureingaben abfangen
		document.addEventListener("keydown", tastatur.init);
		// Nebenfenster öffnen
		document.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
		document.querySelectorAll(".link-dokumentation, .link-handbuch").forEach(a => helferWin.oeffne(a));
		document.querySelectorAll(".link-fehlerlog").forEach(a => helferWin.oeffneFehlerlog(a));
		document.querySelectorAll("#icon, .ueber-app").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-app");
			});
		});
		document.querySelectorAll(".ueber-electron").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-electron");
			});
		});
		// externe Links
		document.querySelectorAll(`a[href^="http"], a[href^="mailto"]`).forEach(a => helfer.externeLinks(a));
		// Demonstrationskartei
		document.querySelectorAll(".hilfe-demo").forEach(i => {
			i.addEventListener("click", evt => {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("hilfe-demo");
			});
		});
		// Hilfe-Fenster (Dokumentation, Handbuch)
		if (typeof hilfe !== "undefined") {
			// interne Links
			document.querySelectorAll(`a[href^="#"]`).forEach(a => {
				if (/^#[a-z]/.test(a.getAttribute("href"))) {
					hilfe.naviSprung(a);
				}
			});
			// Vorschau-Bilder
			document.querySelectorAll("figure").forEach(i => {
				i.addEventListener("click", function() {
					hilfe.bild(this);
				});
			});
		}
	},
	// Events initialisieren: Suchzeile
	eventsSuche () {
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
		document.querySelectorAll(".link-suche").forEach(a => {
			a.addEventListener("click", evt => {
				evt.preventDefault();
				document.getElementById("suchfeld").select();
			});
		});
	},
	// Events initialisieren: Rechtsklickmenü
	eventsPopup () {
		window.addEventListener("contextmenu", evt => {
			evt.preventDefault();
			popup.oeffnen(evt);
		});
	},
	// Listener für Signale des Main-Prozesses
	listenerMain () {
		const {ipcRenderer} = require("electron");
		// Abschnitt öffnen (Dokumentation, Handbuch)
		ipcRenderer.on("oeffne-abschnitt", (evt, abschnitt) => hilfe.naviSprungAusfuehren(abschnitt));
		// Gerüstdaten übernehmen (Bedeutungen)
		ipcRenderer.on("daten", (evt, daten) => {
			bedeutungen.data = daten;
			bedeutungen.aufbauen();
		});
	},
};

window.addEventListener("beforeunload", (evt) => {
	// Fenster dereferenzieren
	const {remote, ipcRenderer} = require("electron"),
		win = remote.getCurrentWindow();
	if (fenstertyp !== "bedeutungen") {
		ipcRenderer.send("fenster-dereferenzieren", win.id);
		return;
	}
	// Bedeutungen-Fenster dereferenzieren
	let status = {
		x: null,
		y: null,
		width: null,
		height: null,
		maximiert: win.isMaximized(),
		winId: bedeutungen.data.winId,
	};
	const bounds = win.getBounds();
	if (!status.maximiert && bounds) {
		status.x = bounds.x;
		status.y = bounds.y;
		status.width = bounds.width;
		status.height = bounds.height;
	}
	ipcRenderer.send("bedeutungen-fenster-status", status);
});
