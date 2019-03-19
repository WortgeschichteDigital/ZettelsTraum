"use strict";

let anhaenge = {
	// hier stehen Details zu den einzelnen Anhängen
	//   exists = Boolean (Datei existiert)
	//   ext = String (Dateiendung)
	data: {},
	// Anhänge-Fenster einblenden
	oeffnen () {
		let fenster = document.getElementById("anhaenge");
		// Fenster öffnen oder in den Vordergrund holen
		if ( overlay.oeffnen(fenster) ) { // Fenster ist schon offen
			return;
		}
		// Content-Objekt leeren
		let cont = document.getElementById("anhaenge-cont");
		helfer.keineKinder(cont);
		// Liste der Anhänge erzeugen
		anhaenge.auflisten(cont, true, data.an);
		// TODO alle Karten durchgehen und an anhaenge.auflisten(data.ka[id].an, false) schicken
		// TODO davor eine Überschrift: "Beleg #13"
		// TODO die Überschrift kann man anklicken
	},
	// Anhänge auflisten
	//   cont = Element
	//     (Container, in dem die Liste erzeugt werden soll)
	//   add = Boolean
	//     (Add-Button soll erzeugt werden, oder auch nicht)
	//   arr = Array
	//     (Liste der Anhänge; kann leer sein)
	auflisten (cont, add, arr) {
		// ggf. Hinzufüge-Button einfügen
		if (add) {
			anhaenge.addButton(cont);
		}
		// abbrechen, wenn keine Anhänge vorhanden sind
		if (!arr.length) {
			return;
		}
		// Anhänge auflisten
	},
	// Add-Button erzeugen, der über einer Anhängeliste steht
	//   cont = Element
	//     (Container, an den der Button gehängt werden soll)
	addButton (cont) {
		// TODO
	}
};
