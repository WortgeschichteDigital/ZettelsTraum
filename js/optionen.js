"use strict";

let optionen = {
	// Speicherort aller Optionen
	// (ausgenommen ist der Fenster-Status, der nur im Main-Prozess steht)
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
		// Einstellungen-Dialog: Nach dem Starten des Programms wird die Menü-Leiste
		// ausgeblendet, bis die Alt-Taste gedrückt wird.
		autoHideMenuBar: false,
	},
	// liest die vom Main-Prozess übergebenen Optionen ein
	// (zur Sicherheit werden alle Optionen einzeln eingelesen;
	// so kann ich ggf. Optionen einfach löschen)
	//   obj = Object
	//     (Objekt-Referenz von optionen.data, in der nach Werten gesucht werden soll)
	//   opt = Object
	//     (Objekt-Referenz der durch den Main-Prozess übergebenen Daten)
	einlesen (obj, opt) {
		for (let o in obj) {
			if ( !obj.hasOwnProperty(o) ) {
				continue;
			}
			if ( !opt.hasOwnProperty(o) ) {
				continue;
			}
			if ( helfer.checkType("Object", obj[o]) ) {
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
		// Optionen im Optionen-Fenster eintragen
		let ee = document.querySelectorAll("#einstellungen input");
		for (let i = 0, len = ee.length; i < len; i++) {
			let e = ee[i].id.replace(/^einstellung-/, "");
			if (optionen.data[e]) {
				ee[i].checked = true;
			} else {
				ee[i].checked = false;
			}
		}
	},
	// Optionen zum speichern an den Main-Prozess schicken
	speichern () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("optionen-speichern", optionen.data);
	},
	// letzten Pfad speichern
	aendereLetzterPfad () {
		let pfad = kartei.pfad.match(/^.+\//)[0];
		optionen.data.letzter_pfad = pfad;
		optionen.speichern();
	},
	// Liste der zuletzt verwendeten Karteien ergänzen
	aendereZuletzt () {
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
	// Einstellung aus dem Einstellungen-Dialog ändern
	//   ele = Element
	//     (Element, dessen Wert geändert wurde)
	aendereEinstellung (ele) {
		ele.addEventListener("change", function() {
			// Option ermitteln und umstellen
			let e = this.id.replace(/^einstellung-/, "");
			optionen.data[e] = this.checked;
			// Optionen speichern
			optionen.speichern();
		});
	},
	// das Optionen-Fenster öffnen
	oeffnen () {
		overlay.oeffnen( document.getElementById("einstellungen") );
	},
};
