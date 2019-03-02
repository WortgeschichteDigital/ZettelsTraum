"use strict";

let dialog = {
	// Speicherort für Funktionen, die nach dem Schließen
	// des Dialogs ausgeführt werden.
	funktion: function() {},
	// Speicherort für die Nutzerantwort, die aus einem Bestätigungsdialog resultiert.
	// Mögliche Werte: true (Okay od. Ja) || false (Abbrechen od. Nein) || null (Schließen durch Link)
	antwort: null,
	// Dialog-Fenster öffnen
	//   typ = String
	//     (gibt den Dialog-Typ an, Werte: "alert", "prompt", "confirm")
	//   funktion = function || null
	//     (Funktion, die nach dem Schließen des Dialogs ausgeführt werden soll)
	oeffnen (typ, funktion) {
		// Funktion zwischenspeichern
		dialog.funktion = funktion;
		// Overlay öffnen
		let fenster = document.getElementById("dialog");
		overlay.oeffnen(fenster);
		// Layout vorbereiten + Fokus setzen
		if (typ === "prompt") { // Prompt
			fenster.classList.add("prompt");
			fenster.classList.remove("confirm");
			fenster.classList.remove("alert");
			let textfeld = fenster.querySelector("input");
			textfeld.value = "";
			textfeld.focus();
		} else if (typ === "confirm") { // Confirm
			fenster.classList.remove("prompt");
			fenster.classList.add("confirm");
			fenster.classList.remove("alert");
			document.getElementById("dialog-confirm").querySelector("input").focus();
		} else { // Alert
			// Fenster-Typ
			fenster.classList.remove("prompt");
			fenster.classList.remove("confirm");
			fenster.classList.add("alert");
			// Timeout, sonst wird onkeyup das Fenster sofort geschlossen (betrifft Prompt)
			setTimeout( () => document.getElementById("dialog-ok").querySelector("input").focus(), 25);
		}
	},
	// Text in Dialog-Fenster eintragen
	//   text = String
	//     (Text, der eingetragen werden soll)
	text (text) {
		// alten Text löschen
		let cont = document.getElementById("dialog-text");
		helfer.keineKinder(cont);
		// neue Absätze hinzufügen
		let absaetze = text.split("\n");
		for (let i = 0, len = absaetze.length; i < len; i++) {
			// Überschrift
			if ( absaetze[i].match(/^<h2>/) ) {
				let h2 = document.createElement("h2");
				h2.innerHTML = absaetze[i].match(/<h2>(.+)<\/h2>/)[1];
				cont.appendChild(h2);
				continue;
			}
			// normaler Absatz
			let p = document.createElement("p");
			p.innerHTML = absaetze[i];
			cont.appendChild(p);
		}
	},
	// Text des Prompt-Inputs auslesen und zurückgeben
	getPromptText () {
		let text = document.getElementById("dialog-prompt-text").value;
		text = text.replace(/^\s+|\s+$/g, "");
		return text;
	},
};
