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
	// speichert den Status des Formulars
	eingabeStatusAkt: "",
	// Titelaufnahme hinzufügen
	//   status = String
	eingabeStatus (status) {
		redLit.eingabeStatusAkt = status;
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
	// ID automatisch aus der Sigle ermitteln
	//   input = Element
	//     (das Sigle-Feld)
	eingabeAutoID (input) {
		input.addEventListener("input", function() {
			if (redLit.eingabeStatusAkt !== "add") {
				return;
			}
			let val = this.value;
			val = val.toLowerCase();
			val = val.replace(/\s/g, "-");
			val = val.replace(/^[0-9]+|[^a-z0-9ßäöü-]/g, "");
			document.getElementById("red-lit-eingabe-id").value = val;
		});
	},
	// Automatismen bei Eingabe einer URL
	//   input = Element
	//     (das URL-Feld)
	eingabeAutoURL (input) {
		input.addEventListener("input", function() {
			if (!this.value) {
				return;
			}
			let ad = document.getElementById("red-lit-eingabe-ad"),
				fo = document.getElementById("red-lit-eingabe-fo");
			if (!ad.value) {
				ad.value = new Date().toISOString().split("T")[0];
			}
			if (!fo.value) {
				fo.value = "online";
			}
		});
	},
};
