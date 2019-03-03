"use strict";

let notizen = {
	// Fenster für Notizen einblenden
	oeffnen () {
		let fenster = document.getElementById("notizen"),
			feld = document.getElementById("notizen-feld");
		// Ist das Fenster schon offen?
		let schon_offen = false;
		if ( !fenster.classList.contains("aus") ) {
			schon_offen = true;
		}
		// Fenster öffnen oder in den Vordergrund holen
		overlay.oeffnen(fenster);
		// Fokus ins Textfeld
		feld.focus();
		// ggf. Abbruch
		if (schon_offen) {
			return;
		}
		// Notizen-Feld füllen bzw. leeren
		if (data.n) {
			feld.value = data.n;
		} else {
			feld.value = "";
		}
	},
	// speichert die Notizen
	speichern () {
		// Es wurde gar nichts geändert!
		if (!notizen.geaendert) {
			dialog.oeffnen("alert", () => notizen.schliessen() );
			dialog.text("Es wurden keine Änderungen vorgenommen!");
			return;
		}
		// Änderungen speichern
		let notiz = document.getElementById("notizen-feld").value;
		// TODO Wert aufbereiten (typische Fehler beheben in einer Helfer-Funktion)
		data.n = notiz;
		notizen.schliessen();
	},
	// Edieren der Notizen abbrechen
	abbrechen () {
		if (notizen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					notizen.speichern();
				} else if (dialog.antwort === false) {
					notizen.schliessen();
				}
			});
			dialog.text("Die Notizen wurden noch nicht gespeichert!\nMöchten Sie die Eingaben nicht erst einmal speichern?");
			return;
		}
		notizen.schliessen();
	},
	// Notizen löschen
	loeschen () {
		// TODO sind überhaupt Notizen vorhanden (im Notizfeld und/oder in der DB)
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				data.n = "";
				notizen.notizenGeaendert(true);
				notizen.schliessen();
			}
		});
		dialog.text("Sollen die Notizen wirklich gelöscht werden?");
	},
	// Funktionen, die das Notizen-Fenster schließen und beim Schließen
	// aufgerufen werden sollten.
	schliessen () {
		notizen.notizenGeaendert(false);
		notizen.icon();
		document.getElementById("notizen").classList.add("aus");
	},
	// Aktionen beim Klick auf einen Button
	//   button = Element
	//     (der Button, auf den geklickt wurde)
	aktionButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^notizen-/, "");
			if (aktion === "speichern") {
				notizen.speichern();
			} else if (aktion === "abbrechen") {
				notizen.abbrechen();
			} else if (aktion === "loeschen") {
				notizen.loeschen();
			}
		});
	},
	// ändert den Status des Icons, je nachdem ob eine Notiz vorhanden ist oder nicht
	icon () {
		let icon = document.getElementById("notizen-icon");
		if (data.n) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
	// registriert, wenn im Textfeld getippt wird
	//   textarea = Element
	//     (<textarea>, in dem die Notizen stehen)
	change (textarea) {
		textarea.addEventListener("change", () => notizen.notizenGeaendert(true) );
	},
	// speichert, ob das Notizen-Feld geändert wurde
	geaendert: false,
	// Notizen wurden geändert oder gespeichert
	//   geaendert = Boolean
	//     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
	notizenGeaendert (geaendert) {
		notizen.geaendert = geaendert;
		// TODO Visualisierung
		if (geaendert) {
			kartei.karteiGeaendert(true);
		}
	},
};
