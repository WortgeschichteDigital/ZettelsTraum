"use strict";

let dialog = {
	// Speicherort für Funktionen, die nach dem Schließen
	// des Dialogs ausgeführt werden.
	callback: null,
	// Speicherort für die Nutzerantwort, die aus einem Bestätigungsdialog resultiert.
	// Mögliche Werte: true (Okay od. Ja) || false (Abbrechen od. Nein) || null (Schließen durch Link)
	antwort: null,
	// Dialog-Fenster öffnen
	//   typ = String
	//     (gibt den Dialog-Typ an, Werte: "alert", "prompt", "confirm")
	//   text = String
	//     (Text, der in das Meldungsfeld eingetragen werden soll)
	//   platzhalter = String || undefined
	//     (Platzhaltertext für das Prompt-Feld)
	//   funktion = function || undefined
	//     (Funktion, die nach dem Schließen des Dialogs ausgeführt werden soll)
	oeffnen ({typ, text, platzhalter = "", callback = null}) {
		// Text eintragen
		dialog.text(text);
		// Funktion zwischenspeichern
		dialog.callback = callback;
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
			textfeld.placeholder = platzhalter;
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
		// Maximalhöhe des Fensters anpassen
		helfer.elementMaxHeight({
			ele: document.getElementById("dialog-text"),
		});
	},
	// Text in Dialog-Fenster eintragen
	//   text = String
	//     (Text, der eingetragen werden soll)
	text (text) {
		// alten Text löschen
		let cont = document.getElementById("dialog-text");
		cont.replaceChildren();
		// neue Absätze hinzufügen
		let absaetze = text.split("\n");
		for (let i = 0, len = absaetze.length; i < len; i++) {
			if (/^<h3>/.test(absaetze[i])) { // Überschrift
				let h3 = document.createElement("h3");
				h3.innerHTML = absaetze[i].match(/<h3>(.+)<\/h3>/)[1];
				cont.appendChild(h3);
				continue;
			} else if (/^<p class/.test(absaetze[i])) { // vordefinierter Absatz
				let ab = absaetze[i].match(/<p class="(.+?)">(.+?)<\/p>/),
					p = document.createElement("p");
				p.classList.add(ab[1]);
				p.innerHTML = ab[2];
				cont.appendChild(p);
				continue;
			} else if (/^<div class/.test(absaetze[i])) { // vordefinierter <div>
				let d = absaetze[i].match(/<div class="(.+?)">(.*?)<\/div>/),
					div = document.createElement("div");
				div.classList.add(d[1]);
				if (d[2]) {
					div.innerHTML = d[2];
				}
				cont.appendChild(div);
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
