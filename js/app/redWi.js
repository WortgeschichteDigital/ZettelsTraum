"use strict";

let redWi = {
	// Dropdown: Feldtypen
	dropdown: {
		vt: ["Assoziation", "Kollokation", "Wortfeld"],
		lt: ["Textverweis", "Verweis intern", "Verweis extern"],
	},
	// Dropdown: Verweistextvorschläge sammeln
	dropdownVerweistexte () {
		let set = new Set(),
			felder = ["sy", "bl"]; // Synonmye und Wortbildungen
		for (let id of Object.keys(data.ka)) {
			for (let feld of felder) {
				let daten = data.ka[id][feld];
				if (!daten) {
					continue;
				}
				for (let i of daten.split("\n")) { // Mehrzeiligkeit möglich
					if (/: /.test(i)) { // Hierarchieebenen möglich
						let sp = i.split(": ");
						set.add(sp[sp.length - 1]);
					} else {
						set.add(i);
					}
				}
			}
		}
		return [...set].sort(helfer.sortAlpha);
	},
	// Wortinformationenfenster öffnen
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Redaktion &gt; Wortinformationen</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-wi");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Formular zurücksetzen
		let vt = document.getElementById("red-wi-vt");
		vt.value = redWi.dropdown.vt[0];
		vt.dispatchEvent(new Event("input"));
	},
	// Formular: Listener für die Textfelder
	//   input = Element
	//     (ein Textfeld im Formular)
	formListener ({input}) {
		if (/-(vt|lt)$/.test(input.id)) {
			input.addEventListener("input", function() {
				let lt = document.getElementById("red-wi-lt");
				if (/-vt$/.test(this.id) && !lt.value) {
					lt.value = redWi.dropdown.lt[0];
				}
				redWi.formToggle();
			});
		} else if (input.type === "text") {
			input.addEventListener("keydown", function(evt) {
				tastatur.detectModifiers(evt);
				if (!tastatur.modifiers && evt.key === "Enter") {
					redWi.formSpeichern();
				}
			});
		} else if (input.type === "button") {
			input.addEventListener("click", () => redWi.formSpeichern());
		}
	},
	// Formular: Formular umstellen
	formToggle () {
		let lt = document.getElementById("red-wi-lt").value,
			text = document.getElementById("red-wi-text"),
			intern = document.getElementById("red-wi-intern"),
			extern = document.getElementById("red-wi-extern");
		switch (lt) {
			case "Textverweis":
				text.classList.remove("aus");
				intern.classList.add("aus");
				extern.classList.add("aus");
				break;
			case "Verweis intern":
				text.classList.add("aus");
				intern.classList.remove("aus");
				extern.classList.add("aus");
				break;
			case "Verweis extern":
				text.classList.add("aus");
				intern.classList.add("aus");
				extern.classList.remove("aus");
				break;
		}
		let inputs = document.querySelectorAll("#red-wi-text:not(.aus) input, #red-wi-intern:not(.aus) input, #red-wi-extern:not(.aus) input");
		for (let i of inputs) {
			i.value = "";
		}
		inputs[0].focus();
	},
	// Formular: Eingabe speichern
	formSpeichern () {
		// TODO
	},
};
