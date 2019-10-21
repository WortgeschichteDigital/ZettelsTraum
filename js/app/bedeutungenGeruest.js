"use strict";

let bedeutungenGeruest = {
	// Fenster öffnen
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			return;
		}
		// Fenster wirklich öffnen?
		let obj = data.bd;
		if (!document.getElementById("bedeutungen").classList.contains("aus")) {
			obj = bedeutungen.data;
		}
		if (Object.keys(obj.gr).length === 1) {
			dialog.oeffnen("alert", function() {
				bedeutungenGeruest.bedeutungsfeldFokus();
			});
			dialog.text("Die Kartei hat nur ein Bedeutungsgerüst.");
			return;
		} else if (beleg.geaendertBd) {
			dialog.oeffnen("alert", function() {
				bedeutungenGeruest.bedeutungsfeldFokus();
			});
			dialog.text("Sie haben das Bedeutungsfeld geändert, aber noch nicht gespeichert.\nBeim Wechsel des Bedeutungsgerüsts vor dem Speichern gingen die Änderungen verloren.");
			return;
		}
		// Fenster öffnen
		let fenster = document.getElementById("geruestwechseln");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Gerüste eintragen
		let input = document.getElementById("geruestwechseln-dropdown");
		input.value = `Gerüst ${obj.gn}`;
		setTimeout(function() {
			input.focus();
		}, 5); // ohne Timeout fokussiert das Fenster nicht
	},
	// Bedeutungsfeld der Karteikarte ggf. fokussieren
	bedeutungsfeldFokus () {
		if (!document.getElementById("beleg").classList.contains("aus") &&
				!document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			document.getElementById("beleg-bd").focus();
		}
	},
	// Bedeutungsgerüst global wechseln
	//   gn = String
	//     (Gerüstnummer, auf die gewechselt werden soll)
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
			beleg.formularBedeutungLabel();
			beleg.formularBedeutung();
			if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
				beleg.leseFillBedeutung();
			}
			beleg.listeGeaendert = true; // damit nach dem Schließen die Liste in jedem Fall aufgefrischt wird – auch wenn das Formular nicht gespeichert wird
			document.getElementById("beleg-bd").focus();
		} else if (!document.getElementById("liste").classList.contains("aus")) {
			liste.status(true);
		}
		kartei.karteiGeaendert(true);
	},
	// Listener für Überschriften zum Öffnen des Fensters
	//   ele = Element
	listener (ele) {
		ele.addEventListener("click", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			bedeutungenGeruest.oeffnen();
		});
	},
};
