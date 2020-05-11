"use strict";

let redLit = {
	// die aktuelle Literaturdatenbank
	data: {},
	// Literaturdatenbank öffnen
	oeffnen () {
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-lit");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Formular umstellen
		document.getElementById("red-lit-nav-eingabe").checked = true;
		redLit.nav("eingabe");
		// Formularstatus anzeigen
		redLit.eingabeStatus("add");
		// Formular leeren
		redLit.eingabeLoeschen();
		// Formular fokussieren
		document.getElementById("red-lit-eingabe-si").focus();
	},
	// Listener für das Umschalten der Navigation
	//   input = Element
	//     (der Radiobutton zum Umschalten der Formulare)
	navListener (input) {
		input.addEventListener("change", function() {
			const form = this.id.replace(/.+-/, "");
			redLit.nav(form);
		});
	},
	// Navigation zwischen Eingabe- und Suchformular
	//   form = String
	//     ("eingabe" od. "suche")
	nav (form) {
		let formulare = ["red-lit-eingabe", "red-lit-suche"];
		for (let i of formulare) {
			let block = document.getElementById(i);
			if (i.includes(`-${form}`)) {
				block.classList.remove("aus");
			} else {
				block.classList.add("aus");
			}
		}
	},
	// Titelaufnahme hinzufügen
	//   status = String
	eingabeStatus (status) {
		let text = {
			"add": "Titelaufnahme hinzufügen",
			"change": "Titelaufnahme ändern",
			"old": "Titelaufnahme veraltet",
		};
		let p = document.getElementById("red-lit-eingabe-meldung");
		p.textContent = text[status];
		p.setAttribute("class", status);
	},
	// Eingabeformular löschen
	eingabeLoeschen () {
		let inputs = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
		for (let i of inputs) {
			if (i.type === "button") {
				continue;
			}
			i.value = "";
		}
	},
};
