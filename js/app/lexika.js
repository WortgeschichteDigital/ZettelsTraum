"use strict";

let lexika = {
	// vordefinierte Liste der Lexika, die überprüft werden sollten/könnten
	preset: {
		"¹DWB": "Deutsches Wörterbuch",
		"²DWB": "Deutsches Wörterbuch (Neubearbeitung)",
		"AWB": "Althochdeutsches Wörterbuch",
		"FWB": "Frühneuhochdeutsches Wörterbuch",
		"Kluge": "Etymologisches Wörterbuch der deutschen Sprache",
		"MWB": "Mittelhochdeutsches Wörterbuch",
		"Paul": "Deutsches Wörterbuch",
		"Pfeifer": "Etymologisches Wörterbuch des Deutschen",
		"Schulz/Basler": "Deutsches Fremdwörterbuch",
		"Trübner": "Trübners Deutsches Wörterbuch",
	},
	// Lexika-Fenster einblenden
	oeffnen () {
		let fenster = document.getElementById("lexika");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Textfeld leeren
		document.getElementById("lexika-text").value = "";
		// Liste der Lexika erstellen
		lexika.auflisten();
		// Fokus auf die erste Checkbox
		document.querySelector("#lexika-liste input").focus();
	},
	// Liste der Lexika erstellen
	auflisten () {
		// Liste leeren
		let cont = document.getElementById("lexika-liste");
		helfer.keineKinder(cont);
		// Array erstellen
		let l = [];
		for (let i in lexika.preset) {
			if (!lexika.preset.hasOwnProperty(i)) {
				continue;
			}
			l.push(i);
		}
		for (let i = 0, len = data.le.length; i < len; i++) {
			if (!lexika.preset[data.le[i]]) {
				l.push(data.le[i]);
			}
		}
		// Liste aufbauen
		for (let i = 0, len = l.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Input
			let input = document.createElement("input");
			lexika.ueberprueft(input);
			input.type = "checkbox";
			input.id = `lexikon-${i}`;
			input.value = l[i];
			if (data.le.indexOf(l[i]) >= 0) {
				input.checked = true;
			}
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `lexikon-${i}`);
			p.appendChild(label);
			// title setzen oder Hinweis, dass das Lexikon manuell ergänzt wurde
			if (lexika.preset[l[i]]) {
				label.title = lexika.preset[l[i]];
				label.textContent = l[i];
			} else {
				label.title = `${l[i]} (Lexikon manuell ergänzt)`;
				label.textContent = `${l[i]} +`;
			}
		}
	},
	// Lexikon als überprüft kennzeichnen
	//   input = Element
	//     (Checkbox, die für ein Lexikon steht)
	ueberprueft (input) {
		input.addEventListener("change", function() {
			if (this.checked) {
				data.le.push(this.value);
			} else {
				data.le.splice(data.le.indexOf(this.value), 1);
			}
			kartei.karteiGeaendert(true);
		});
	},
	// Lexikon ergänzen
	ergaenzen () {
		let le = document.getElementById("lexika-text"),
			va = helfer.textTrim(le.value);
		// Uppala! Kein Wert!
		if (!va) {
			dialog.oeffnen("alert", () => le.select());
			dialog.text("Sie haben keinen Titel eingegeben.");
			return;
		}
		// Lexikon gibt es schon
		if (document.querySelector(`#lexika-liste input[value="${va}"]`)) {
			dialog.oeffnen("alert", () => le.select());
			dialog.text("Das Lexikon ist schon in der Liste.");
			return;
		}
		// Lexikon ergänzen und sortieren
		le.value = "";
		data.le.push(va);
		data.le.sort(helfer.sortAlpha);
		// Liste neu aufbauen
		lexika.auflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Klick auf Button
	aktionButton (button) {
		button.addEventListener("click", function() {
			lexika.ergaenzen();
		});
	},
	// Tastatureingaben im Textfeld
	aktionText (input) {
		input.addEventListener("keydown", function(evt) {
			// Enter
			if (evt.which === 13) {
				evt.preventDefault();
				lexika.ergaenzen();
			}
		});
	},
};
