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
	//   funktion = function || undefined
	//     (Funktion, die nach dem Schließen des Dialogs ausgeführt werden soll)
	oeffnen (typ, funktion = null) {
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
			setTimeout(() => document.getElementById("dialog-ok").querySelector("input").focus(), 25);
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
			if (/^<h3>/.test(absaetze[i])) { // Überschrift
				let h3 = document.createElement("h3");
				h3.innerHTML = absaetze[i].match(/<h3>(.+)<\/h3>/)[1];
				cont.appendChild(h3);
				continue;
			} else if (/^<p class/.test(absaetze[i])) { // vordefinierter Absatz
				const ab = absaetze[i].match(/<p class="(.+?)">(.+?)<\/p>/);
				let p = document.createElement("p");
				p.classList.add(ab[1]);
				p.innerHTML = ab[2];
				cont.appendChild(p);
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
		text = helfer.textTrim(text, true);
		return text;
	},
};
