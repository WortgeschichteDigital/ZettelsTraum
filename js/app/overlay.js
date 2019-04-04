"use strict";

let overlay = {
	// bisher höchster z-index
	zIndex: 99,
	// Verweis auf einen laufenden Timeout
	timeout: null,
	// Fenster öffnen
	//   fenster = Element
	//     (Overlay-Fenster, das geöffnet werden soll)
	oeffnen (fenster) {
		// Ist das Fenster schon offen?
		let schon_offen = false;
		if (!fenster.classList.contains("aus")) {
			schon_offen = true;
		}
		// Fenster in den Vordergrund holen
		overlay.zIndex++;
		fenster.style.zIndex = overlay.zIndex;
		// Fenster einblenden
		if (overlay.timeout) {
			clearTimeout(overlay.timeout);
		}
		if (schon_offen) {
			// das ist wichtig für direkt aufeinanderfolgende Dialog-Fenster
			fenster.classList.add("einblenden");
		} else {
			fenster.classList.remove("aus");
			// dieser Timeout behebt merkwürdigerweise Probleme beim Einblenden;
			// sonst läuft die Transition nicht
			overlay.timeout = setTimeout(() => fenster.classList.add("einblenden"), 0);
		}
		// Rückgabewert
		return schon_offen;
	},
	// Schließen-Event eines Links initialisieren
	//   link = Element
	//     (Link, auf den geklickt wurde)
	initSchliessen (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			overlay.schliessen(this);
		});
	},
	// schließt ein Overlay-Fenster
	//   schliesser = Element
	//     (Link oder Button, über den das Schließen angestoßen wurde)
	schliessen (schliesser) {
		// Overlay-Fenster ermitteln
		let fenster = schliesser;
		while (!fenster.classList.contains("overlay")) {
			fenster = fenster.parentNode;
		}
		// Sonderbehandlung für das Notizen-Fenster
		if (fenster.id === "notizen") {
			notizen.abbrechen();
			return;
		}
		// Fenster schließen
		overlay.ausblenden(fenster);
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
	// alle offenen Overlays schließen
	alleSchliessen () {
		let offen = [];
		document.querySelectorAll(".overlay").forEach(function(i) {
			if (!i.classList.contains("aus")) {
				offen.push(i.id);
			}
		});
		for (let i = 0, len = offen.length; i < len; i++) {
			overlay.schliessen(document.getElementById(offen[i]));
		}
	},
	// blendet ein Overlay-Fenster aus
	ausblenden (fenster) {
		fenster.classList.remove("einblenden");
		// Die Zeit des Timeouts richtet sich nach der Transition-Länge, die in der
		// overlay.css festgelegt ist.
		overlay.timeout = setTimeout(() => fenster.classList.add("aus"), 200);
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
