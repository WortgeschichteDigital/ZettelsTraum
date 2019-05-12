"use strict";

let notizen = {
	// Fenster für Notizen einblenden
	oeffnen () {
		let fenster = document.getElementById("notizen"),
			feld = document.getElementById("notizen-feld");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			feld.focus();
			return;
		}
		// Notizen-Feld füllen bzw. leeren
		if (data.no) {
			feld.value = data.no;
		} else {
			feld.value = "";
		}
		// Größe des Notizfeldes zurücksetzen
		helfer.textareaGrow(feld);
		// Feld fokussieren
		feld.focus();
	},
	// speichert die Notizen
	speichern () {
		let feld = document.getElementById("notizen-feld");
		// Es wurde gar nichts geändert!
		if (!notizen.geaendert) {
			direktSchliessen();
			return;
		}
		let vorhanden = notizen.vorhanden();
		// keine Notizen im Feld, aber Notizen in der Kartei
		if (!vorhanden.feld && vorhanden.kartei) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					notizen.loeschen(true);
				} else {
					feld.focus();
				}
			});
			dialog.text("Das Notizfeld ist leer.\nSollen die in der Kartei gespeicherten Notizen gelöscht werden?");
			return;
		}
		// keine Notizen im Feld
		if (!vorhanden.feld) {
			feld.focus();
			return;
		}
		// Änderungen speichern
		data.no = helfer.textTrim(vorhanden.feld_value, false);
		notizen.notizenGeaendert(false);
		kartei.karteiGeaendert(true);
		direktSchliessen();
		// Notizen-Fenster ggf. schließen
		function direktSchliessen () {
			if (optionen.data.einstellungen["notizen-schliessen"]) {
				notizen.abbrechen();
			}
		}
	},
	// Notizen schließen
	// (der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
	abbrechen () {
		// keine Änderungen vorgenommen
		if (!notizen.geaendert) {
			notizen.schliessen();
			return;
		}
		// keine Notizen im Feld trotz Änderungsmarkierung => direkt schließen
		let vorhanden = notizen.vorhanden();
		if (!vorhanden.feld) {
			notizen.schliessen();
			return;
		}
		// Es sind also Notizen im Notizfeld. Speichern?
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				notizen.speichern();
				notizen.schliessen();
			} else if (dialog.antwort === false) {
				notizen.schliessen();
			} else {
				document.getElementById("notizen-feld").focus();
			}
		});
		dialog.text("Die Notizen wurden noch nicht gespeichert.\nMöchten Sie die Eingaben nicht erst einmal speichern?");
	},
	// Notizen löschen
	//   confirmed = Boolean
	//     (Die Löschabsicht wurde schon bestätigt.)
	loeschen (confirmed) {
		if (confirmed) {
			loesche();
			return;
		}
		// Sind überhaupt Notizen vorhanden?
		let vorhanden = notizen.vorhanden();
		if (!vorhanden.kartei && !vorhanden.feld) {
			notizen.schliessen();
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				loesche();
			} else {
				document.getElementById("notizen-feld").focus();
			}
		});
		let speicher = [];
		if (vorhanden.kartei) {
			speicher.push("in der Kartei");
		}
		if (vorhanden.feld) {
			speicher.push("im Notizfeld");
		}
		dialog.text(`Sollen die Notizen ${speicher.join(" und ")} wirklich gelöscht werden?`);
		// Löschfunktion
		function loesche () {
			data.no = "";
			kartei.karteiGeaendert(true);
			notizen.schliessen();
		}
	},
	// Funktionen, die beim Schließen aufgerufen werden sollten
	schliessen () {
		notizen.notizenGeaendert(false);
		notizen.icon();
		overlay.ausblenden(document.getElementById("notizen"));
	},
	// überprüft, ob überhaupt Notizen vorhanden sind
	vorhanden () {
		let vorhanden = {
			kartei: false,
			feld: false,
			feld_value: "",
		};
		if (data.no) {
			vorhanden.kartei = true;
		}
		let notiz = document.getElementById("notizen-feld").value;
		notiz = helfer.textTrim(notiz, false);
		if (notiz) {
			vorhanden.feld = true;
		}
		vorhanden.feld_value = notiz;
		return vorhanden;
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
				notizen.loeschen(false);
			}
		});
	},
	// ändert den Status des Icons, je nachdem ob eine Notiz vorhanden ist oder nicht
	icon () {
		let icon = document.getElementById("notizen-icon");
		if (data.no) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
	// registriert, wenn im Textfeld getippt wird
	//   textarea = Element
	//     (<textarea>, in dem die Notizen stehen)
	change (textarea) {
		textarea.addEventListener("input", () => notizen.notizenGeaendert(true));
	},
	// speichert, ob der Inhalt des Notizenfelds geändert wurde
	geaendert: false,
	// Notizen wurden geändert oder gespeichert
	//   geaendert = Boolean
	//     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
	notizenGeaendert (geaendert) {
		notizen.geaendert = geaendert;
		helfer.geaendert();
		let asterisk = document.getElementById("notizen-geaendert");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
};
