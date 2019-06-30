"use strict";

let bedeutungenGeruest = {
	// Fenster öffnen
	oeffnen () {
		// Fenster wirklich öffnen?
		let obj = data.bd;
		if (!document.getElementById("bedeutungen").classList.contains("aus")) {
			obj = bedeutungen.data;
		}
		if (Object.keys(obj.gr).length === 1) {
			dialog.oeffnen("alert");
			dialog.text("Die Kartei hat nur ein Bedeutungsgerüst.");
			return;
		}
		// Fenster öffnen
		let fenster = document.getElementById("geruestwechseln");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Gerüste eintragen
		document.getElementById("geruestwechseln-dropdown").value = `Gerüst ${obj.gn}`;
	},
	// Bedeutungsgerüst global wechseln
	//   gn = String
	//     (Gerüstnummer, auf die gewechseln werden soll)
	wechseln (gn) {
		// Bedeutungen sind offen
		if (!document.getElementById("bedeutungen").classList.contains("aus")) {
			if (gn === bedeutungen.data.gn) {
				return;
			}
			// Tagger-Fenster offen?
			if (!document.getElementById("tagger").classList.contains("aus")) {
				let fenster = document.getElementById("tagger");
				overlay.oeffnen(fenster);
				tagger.schliessen();
				if (tagger.geaendert) {
					overlay.ausblenden(document.getElementById("geruestwechseln"));
					return;
				}
			}
			// Gerüst wechseln
			bedeutungen.geruestWechseln(gn);
			overlay.ausblenden(document.getElementById("geruestwechseln"));
			return;
		}
		// Gerüst wurde nicht gewechselt
		if (gn === data.bd.gn) {
			return;
		}
		// Gerüst wechseln
		overlay.ausblenden(document.getElementById("geruestwechseln"));
		data.bd.gn = gn;
		// Konsequenzen des Wechsels
		if (!document.getElementById("beleg").classList.contains("aus")) {
			// TODO nur Bedeutungsfeld auffrischen
		} else if (!document.getElementById("liste").classList.contains("aus")) {
			liste.status(true);
		}
	},
	// Listener für Überschriften zum Öffnen des Fensters
	//   ele = Element
	listener (ele) {
		ele.addEventListener("click", function(evt) {
			evt.stopPropagation();
			bedeutungenGeruest.oeffnen();
		});
	},
};
