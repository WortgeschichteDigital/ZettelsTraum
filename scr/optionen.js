"use strict";

let optionen = {
	// speichert die Optionen
	data: {
		// letzter Pfad, der beim Speichern oder Öffnen einer Datei benutzt wurde
		letzter_pfad: "",
		// Einstellungen im Kopf der Belegliste
		belegliste: {
			// Filterleiste anzeigen
			filterleiste: true,
			// chronologischen Richtung, in der die Belege sortiert werden sollen
			sort_aufwaerts: true,
			// Dichte der Zeitschnitte oder Zeitschnitte ausblenden
			// mögliche Werte: "10", "50", "100", "-" (keine Schnitte anzeigen)
			zeitschnitte: "50",
			// kompletten Belegschnitt anzeigen oder ausblenden
			belegschnitte: true,
			// Wort der Kartei in der Vorschau und im Belegschnitt automatisch hervorheben
			wort_hervorheben: true,
		},
		// zuletzt verwendete Dokumente
		zuletzt: [],
	},
	// letzten Pfad speichern
	optionLetzterPfad () {
		let pfad = kartei.pfad.match(/^.+\//)[0];
		optionen.data.letzter_pfad = pfad;
		optionen.speichern();
	},
	// Liste der zuletzt verwendeten Karteien ergänzen
	optionZuletzt () {
		// Datei ggf. entfernen (falls an einer anderen Stelle schon vorhanden)
		let zuletzt = optionen.data.zuletzt;
		if (zuletzt.indexOf(kartei.pfad) >= 0) {
			zuletzt.splice(zuletzt.indexOf(kartei.pfad), 1);
		}
		// Datei vorne anhängen
		zuletzt.unshift(kartei.pfad);
		// Liste auf 10 Einträge begrenzen
		if (zuletzt.length > 10) {
			zuletzt.pop();
		}
		// Optionen speichern
		optionen.speichern();
	},
	// liest die vom Main-Prozess übergebenen Optionen ein
	// (zur Sicherheit werden alle Optionen einzeln eingelesen;
	// so kann ich ggf. Optionen einfach löschen)
	einlesen (obj, opt) {
		for (let o in obj) {
			if (!obj.hasOwnProperty(o)) {
				continue;
			}
			if (!opt.hasOwnProperty(o)) {
				continue;
			}
			if (helfer.type_check("Object", obj[o])) {
				optionen.einlesen(obj[o], opt[o]);
			} else {
				obj[o] = opt[o];
			}
		}
	},
	// nach dem Laden müssen manche Optionen direkt angewendet werden
	anwenden () {
		// Icons und Text im Header der Belegliste anpassen
		liste.headerFilterAnzeige(); // hier auch die Anzeige der Filterleiste anpassen
		liste.headerSortierenAnzeige();
		liste.headerZeitschnitteAnzeige();
		liste.headerBelegschnitteAnzeige();
		liste.headerWortHervorhebenAnzeige();
	},
	// Optionen zum speichern an den Main-Prozess schicken
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("optionen-speichern", optionen.data);
	},
};
