"use strict";

let dialog = {
	// Speicherort für Funktionen, die nach dem Schließen
	// des Dialogs ausgeführt werden.
	funktion: function() {},
	// Speicherort für die Nutzerantwort, die aus einem
	// Bestätigungsdialog resultiert.
	antwort: false,
	// Dialog-Fenster öffnen
	// typ = String
	// 		(gibt den Dialog-Typ an, Werte: "alert", "prompt", "confirm")
	// funktion = function || null
	// 		(Funktion, die nach dem Schließen des Dialogs ausgeführt werden soll
	oeffnen (typ, funktion) {
		// Funktion zwischenspeichern
		dialog.funktion = funktion;
		// Overlay öffnen
		overlay.oeffnen(document.getElementById("dialog"));
		// Layout vorbereiten + Fokus setzen
		let div_prompt = document.getElementById("dialog_prompt"),
			div_ok = document.getElementById("dialog_ok");
		if (typ === "prompt") { // Prompt-Fenster
			div_prompt.classList.remove("aus");
			div_ok.classList.remove("aus");
			let textfeld = div_prompt.querySelector("input");
			textfeld.value = "";
			textfeld.focus();
		} else { // Meldungs-Fenster
			div_prompt.classList.add("aus");
			div_ok.classList.remove("aus");
		}
	},
	// Text im Dialog-Fenster eintragen
	// text = Text, der eingetragen werden soll
	text (text) {
		// alten Text löschen
		let cont = document.getElementById("dialog_text");
		helfer.keineKinder(cont);
		// neue Absätze hinzufügen
		let absaetze = text.split("\n");
		for (let i = 0, len = absaetze.length; i < len; i++) {
			let p = document.createElement("p");
			p.textContent = absaetze[i];
			cont.appendChild(p);
		}
	},
};
