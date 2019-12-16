"use strict";

let kopf = {
	// Anzeige der Icon-Leiste im Kopf des Hauptfensters anpassen
	icons () {
		// Ordner-Icon ein-/ausblenden
		let iconOrdner = document.getElementById("ordner-icon");
		if (kartei.pfad) {
			iconOrdner.classList.remove("aus");
		} else {
			iconOrdner.classList.add("aus");
		}
		// letzten sichtbaren Icon-Link markieren
		let kopfLeiste = document.getElementById("kopf-icons"),
			last = kopfLeiste.querySelector(".last");
		if (last) {
			last.classList.remove("last");
		}
		let aAn = kopfLeiste.querySelectorAll("a:not(.aus)");
		if (aAn.length) {
			aAn[aAn.length - 1].classList.add("last");
		}
		// ggf. die Anhänge-Icons anzeigen
		let anhaenge = document.getElementById("kartei-anhaenge");
		if (anhaenge.hasChildNodes()) {
			anhaenge.classList.remove("aus");
			if (aAn.length) {
				anhaenge.classList.add("not-first");
			} else {
				anhaenge.classList.remove("not-first");
			}
		} else {
			anhaenge.classList.add("aus");
		}
		// Icon-Leiste ggf. komplett ausschalten
		if (!aAn.length && !anhaenge.hasChildNodes()) {
			kopfLeiste.classList.add("aus");
		} else {
			kopfLeiste.classList.remove("aus");
		}
	},
};
