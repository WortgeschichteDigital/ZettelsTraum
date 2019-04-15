"use strict";

let helferWin = {
	// öffnet externe Links in einem Browser-Fenster
	//   a = Element
	//     (Link, auf dem geklickt wurde)
	links (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let url = this.title;
			const {shell} = require("electron");
			shell.openExternal(url);
		});
	},
	// Tastatur-Events abfangen und verarbeiten
	//   evt = Event-Objekt
	tastatur (evt) {
		// Esc
		if (evt.which === 27) {
			const {remote} = require("electron");
			let win = remote.getCurrentWindow();
			win.close();
		}
		// Cursor hoch (↑), runter (↓) (nur in Hilfefenstern)
		if (typeof hilfe !== "undefined" && (evt.which === 38 || evt.which === 40)) {
			hilfe.naviMenue(evt.which);
		}
		// Strg + P (nur im Bedeutungen-Fenster)
		if (typeof bedeutungencont !== "undefined" && evt.ctrlKey && evt.which === 80) {
			bedeutungencont.drucken();
		}
	},
};
