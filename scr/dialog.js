"use strict";

let dialog = {
	// Speicherort für Funktionen, die nach dem Schließen
	// des Dialogs ausgeführt werden.
	funktion: function() {},
	// Speicherort für die Nutzerantwort, die aus einem
	// Bestätigungsdialog resultiert.
	antwort: false,
	// Dialog-Fenster öffnen
	//   typ = String
	//     (gibt den Dialog-Typ an, Werte: "alert", "prompt", "confirm")
	//   funktion = function || null
	//     (Funktion, die nach dem Schließen des Dialogs ausgeführt werden soll
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
			document.getElementById("dialog_confirm").querySelector("input").focus();
		} else { // Alert
			// Fenster-Typ
			fenster.classList.remove("prompt");
			fenster.classList.remove("confirm");
			fenster.classList.add("alert");
			// Timeout, sonst wird onkeyup das Fenster sofort geschlossen (betrifft Prompt)
			setTimeout( () => document.getElementById("dialog_ok").querySelector("input").focus(), 25);
		}
	},
	// Text im Dialog-Fenster eintragen
	//   text = Text, der eingetragen werden soll
	text (text) {
		// alten Text löschen
		let cont = document.getElementById("dialog_text");
		helfer.keineKinder(cont);
		// neue Absätze hinzufügen
		let absaetze = text.split("\n");
		for (let i = 0, len = absaetze.length; i < len; i++) {
			let p = document.createElement("p");
			p.innerHTML = absaetze[i];
			cont.appendChild(p);
		}
	},
	// Text des Prompt-Inputs auslesen und zurückgeben
	promptText () {
		let text = document.getElementById("dialog_prompt_text").value;
		text = text.replace(/^\s+|\s+$/g, "");
		return text;
	},
};
