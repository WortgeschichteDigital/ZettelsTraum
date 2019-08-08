"use strict";

let helferWin = {
	// öffnet externe Links in einem Browser-Fenster
	//   a = Element
	//     (Link, auf dem geklickt wurde)
	links (a) {
		a.title = a.getAttribute("href");
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const url = this.getAttribute("href"),
				{shell} = require("electron");
			shell.openExternal(url);
		});
	},
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
			// ohne Timeout wird zugleich das Hauptfenster geschlossen, von dem das Nebenfenster abhängig ist
			setTimeout(function() {
				const {remote} = require("electron"),
					win = remote.getCurrentWindow();
				win.close();
			}, 50);
		}
		// Ctrl + Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && (evt.which === 38 || evt.which === 40)) {
			hilfe.naviMenue(evt.which);
		}
		// Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && evt.which === 70) {
			document.getElementById("suchfeld").select();
		}
		// Strg + P (Bedeutungsgerüst und Changelog)
		if (evt.ctrlKey && evt.which === 80) {
			console.log(document.title);
			if (typeof bedeutungen !== "undefined") {
				bedeutungen.drucken();
			} else if (/^Changelog$/.test(document.title)) {
				print();
			}
		}
	},
};
