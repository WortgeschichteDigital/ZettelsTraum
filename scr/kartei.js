"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// bestehende Kartei öffnen
	oeffnen () {
		
	},
	// Benutzer nach dem Wort fragen, für die eine Kartei angelegt werden soll
	wortErfragen () {
		dialog.oeffnen("prompt", function() {
			let wort = document.getElementById("dialog_prompt_text").value;
			wort = wort.replace(/^\s|\s$/g, "");
			if (dialog.confirm && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei erstellt werden!");
			} else if (dialog.confirm && wort) {
				kartei.wort = wort;
				kartei.wortEintragen();
				kartei.erstellen();
			}
		});
		dialog.text("Zu welchem Wort soll eine Kartei erstellt werden?");
	},
	// Wort der aktuellen Kartei eintragen
	wortEintragen () {
		let cont = document.getElementById("wort");
		cont.classList.remove("keine_kartei");
		cont.textContent = kartei.wort;
	},
	// neue Kartei erstellen
	erstellen () {
		// globales Datenobjekt initialisieren
		data = {
			w: kartei.wort,
			dc: new Date().toISOString(),
			dm: "",
			e: [],
			n: "",
			a: [],
			v: 1,
			k: {},
			h: {},
			b: {},
		};
		data.dm = data.dc;
		// neue Karte erstellen
		beleg.erstellen();
	},
};
