"use strict";

let helferWin = {
	// Handbuch über Link öffnen
	//   a = Element
	//     (Link, der zum Handbuch führen soll)
	oeffneHandbuch (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-handbuch");
		});
	},
	// Dokumentation über Link öffnen
	//   a = Element
	//     (Link, der zur Dokumentation führen soll)
	oeffneDokumentation (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-dokumentation");
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
			// ohne Timeout wird zugleich das Hauptfenster geschlossen, von dem das Nebenfenster abhängig ist
			setTimeout(function() {
				const {remote} = require("electron"),
					win = remote.getCurrentWindow();
				win.close();
			}, 50);
		}
		// Space / PageUp / PageDown (wenn in Changelog oder Dokumentation)
		if (/changelog|dokumentation|handbuch/.test(fenstertyp) &&
				(evt.which === 32 || evt.which === 33 || evt.which === 34) &&
				!(evt.ctrlKey || evt.altKey)) {
			suchleiste.scrollen(evt);
		}
		// Ctrl + Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && (evt.which === 38 || evt.which === 40)) {
			hilfe.naviMenue(evt.which);
		}
		// Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && evt.which === 70) {
			document.getElementById("suchfeld").select();
		}
		// Strg + F (wenn in Changelog oder Dokumentation)
		if (fenstertyp === "changelog" && evt.ctrlKey && evt.which === 70) {
			suchleiste.einblenden();
		}
		// F3 (wenn in Changelog oder Dokumentation)
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
