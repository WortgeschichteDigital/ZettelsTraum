"use strict";

let helferWin = {
	// öffnet externe Links in einem Browser-Fenster
	//   a = Element
	//     (Link, auf dem geklickt wurde)
	links (a) {
		a.title = a.getAttribute("href");
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const url = this.getAttribute("href");
			let {shell} = require("electron");
			shell.openExternal(url);
		});
	},
	// Handbuch über Link öffnen
	//   a = Element
	//     (Link, der zum Handbuch führen soll)
	oeffneHandbuch (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-handbuch");
		});
	},
	// Changelog über Link öffnen
	//   a = Element
	//     (Link, der zum Changelog führen soll)
	oeffneChangelog (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-changelog");
			if (this.dataset.caller === "ueber-app") {
				let {remote} = require("electron"),
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
			let {remote} = require("electron"),
				win = remote.getCurrentWindow();
			win.close();
		}
		// Ctrl + Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && (evt.which === 38 || evt.which === 40)) {
			hilfe.naviMenue(evt.which);
		}
		// Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && evt.ctrlKey && evt.which === 70) {
			document.getElementById("suchfeld").select();
		}
		// Strg + P (nur im Bedeutungsgerüst-Fenster)
		if (typeof bedeutungen !== "undefined" && evt.ctrlKey && evt.which === 80) {
			bedeutungen.drucken();
		}
	},
};
