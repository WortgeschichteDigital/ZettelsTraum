"use strict";

let helferWin = {
	// Handbuch oder technische Dokumentation über Link öffnen
	//   a = Element
	//     (Link, der zum Handbuch führen soll)
	oeffne (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Handbuch oder Dokumentation?
			let fenster = "hilfe-dokumentation";
			if (this.classList.contains("link-handbuch")) {
				fenster = "hilfe-handbuch";
			}
			// ggf. Abschnitt ermitteln
			const abschnitt = a.getAttribute("href").replace(/^#/, "");
			// Signal an den Main-Prozess
			const {ipcRenderer} = require("electron");
			ipcRenderer.send(fenster, abschnitt);
		});
	},
	// Changelog über Link öffnen
	//   a = Element
	//     (Link, der zum Changelog führen soll)
	oeffneChangelog (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-changelog");
			if (this.dataset.caller === "ueber-app") {
				const {remote} = require("electron"),
					win = remote.getCurrentWindow();
				win.close();
			}
		});
	},
	// Fehlerlog über Link öffnen
	//   a = Element
	//     (Link, der zum Fehlerlog führen soll)
	oeffneFehlerlog (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-fehlerlog");
		});
	},
	// Tastatur-Events abfangen und verarbeiten
	//   evt = Event-Objekt
	tastatur (evt) {
		// Esc
		if (evt.which === 27) {
			// falls die Suchleiste auf ist und den Fokus hat
			if (document.getElementById("suchleiste") &&
					document.querySelector("#suchleiste:focus-within")) {
				suchleiste.ausblenden();
				return;
			}
			// falls ein Vorschau-Bild angezeigt wird
			if (document.getElementById("bild")) {
				hilfe.bildSchliessen();
				return;
			}
			// ohne Timeout wird zugleich das Hauptfenster geschlossen, von dem das Nebenfenster abhängig ist
			setTimeout(function() {
				const {remote} = require("electron"),
					win = remote.getCurrentWindow();
				win.close();
			}, 50);
		}
		// Space / PageUp / PageDown (wenn in Changelog, Dokumentation oder Handbuch)
		if (/changelog|dokumentation|handbuch/.test(fenstertyp) &&
				(evt.which === 32 || evt.which === 33 || evt.which === 34) &&
				!(evt.ctrlKey || evt.altKey)) {
			suchleiste.scrollen(evt);
		}
		// Ctrl + Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && (evt.which === 38 || evt.which === 40)) {
			hilfe.naviMenue(evt.which);
		}
		// Alt + Cursor links (←), rechts (→) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.altKey && (evt.which === 37 || evt.which === 39)) {
			hilfe.historyNavi(evt.which === 39 ? true : false);
			return;
		}
		// Cursor links (←), rechts (→) (nur im Handbuch)
		if (fenstertyp === "handbuch" && (evt.which === 37 || evt.which === 39)) {
			hilfe.bilderTastatur(evt.which);
		}
		// Strg + F (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && evt.which === 70) {
			document.getElementById("suchfeld").select();
		}
		// Strg + F (wenn in Changelog)
		if (fenstertyp === "changelog" && evt.ctrlKey && evt.which === 70) {
			suchleiste.einblenden();
		}
		// F3 (wenn in Changelog, Dokumentation oder Handbuch)
		if (/changelog|dokumentation|handbuch/.test(fenstertyp) && evt.which === 114) {
			suchleiste.f3(evt);
		}
		// Strg + P (Bedeutungsgerüst und Changelog)
		if (evt.ctrlKey && evt.which === 80) {
			if (fenstertyp === "bedeutungen") {
				bedeutungen.drucken();
			} else if (fenstertyp === "changelog") {
				print();
			}
		}
	},
};
