"use strict";

let drucken = {
	// TODO (temporäre Funktion)
	ausgeschaltet () {
		dialog.oeffnen("alert", null);
		dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
	},
	// Listener für die Druck-Icons
	//   a = Element
	//     (Icon-Link, auf den geklickt wurde)
	listener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			drucken.ausgeschaltet(); // TODO
// 			drucken.init(this.id);
		});
	},
	// Listener für die Buttons im Druckfenster
	//   span = Element
	//     (Element, hinter dem sich eine der Funktionen im Druckfenster befindet)
	buttons (span) {
		span.addEventListener("click", function() {
			if (/drucken/.test(this.firstChild.src)) {
				print();
			} else if (/kopieren/.test(this.firstChild.src)) {
				// TODO Text kopieren (HTML und Plaintext)
			}
		});
	},
	// Druckanzeige initialisieren
	//   id = String
	//     (ID des Links, über den gedruckt wurde)
	init (id) {
		const fenster = document.getElementById("drucken");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		const cont = document.getElementById("drucken-cont");
		helfer.keineKinder(cont);
		// TEST
		const text = "<b>Das ist der Text,</b> der gedruckt werden soll. <i>Er erstreckt sich über</i> mehr als eine Zeile, <i><b>damit ich auch</b> sehen kann</i>, ob die Zeilenhöhe korrekt definiert ist.";
		for (let i = 0; i < 50; i++) {
			let p = document.createElement("p");
			p.innerHTML = text;
			cont.appendChild(p);
		}
	},
	// Druckfenster mit dem Karteninhalt füllen
	initKarte () {
		// TODO
	},
	// Druckfenster mit dem Listeninhalt füllen
	initListe () {
		// TODO
	},
	// Druckfenster mit dem Bedeutungsbaum füllen
	initBedeutungen () {
		// TODO
	},
};
