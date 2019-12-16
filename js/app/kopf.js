"use strict";

let kopf = {
	// Anzeige der Icon-Leiste im Kopf des Hauptfensters anpassen
	icons () {
		let kopfLeiste = document.getElementById("kopf-icons");
		// letzten sichtbaren Icon-Link markieren
		let last = kopfLeiste.querySelector(".last");
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
