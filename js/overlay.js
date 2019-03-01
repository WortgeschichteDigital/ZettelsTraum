"use strict";

let overlay = {
	// bisher höchster z-index
	zIndex: 99,
	// Fenster öffnen
	oeffnen (fenster) {
		overlay.zIndex++;
		fenster.style.zIndex = overlay.zIndex;
		fenster.classList.remove("aus");
	},
	// Schließen-Event eines Links initialisieren
	//   link = Element, auf das geklickt wird
	initSchliessen (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			overlay.schliessen(this);
		});
	},
	// schließt ein Overlay-Fenster
	//   schliesser = Objektverweis auf den Link, über den das Schließen angestoßen wurde
	schliessen (schliesser) {
		// Overlay-Fenster ermitteln + schließen
		let fenster = schliesser;
		while (!fenster.classList.contains("overlay")) {
			fenster = fenster.parentNode;
		}
		fenster.classList.add("aus");
		// spezielle Funktionen für einzelne Overlay-Fenster
		if (fenster.id === "dialog") {
			if (schliesser.nodeName === "INPUT") { // Schließen durch Input-Button oder Input-Text
				if (schliesser.value.match(/Abbrechen|Nein/)) { // Alert-Dialog: Abbrechen, Confirm-Dialog: Nein
					dialog.antwort = false;
				} else {
					dialog.antwort = true;
				}
			} else { // Schließen durch Link
				dialog.antwort = null;
			}
			if (dialog.funktion) { // Soll eine Funktion ausgeführt werden?
				dialog.funktion();
			}
		}
	},
	// oberstes Overlay-Fenster ermitteln
	oben () {
		let oben = {
			zIndex: 0,
			id: "",
		};
		let overlays = document.querySelectorAll(".overlay");
		for (let i = 0, len = overlays.length; i < len; i++) {
			if (overlays[i].classList.contains("aus")) {
				continue;
			}
			let zIndex = parseInt(overlays[i].style.zIndex, 10);
			if (zIndex > oben.zIndex) {
				oben.zIndex = zIndex;
				oben.id = overlays[i].id;
			}
		}
		return oben.id;
	},
};
