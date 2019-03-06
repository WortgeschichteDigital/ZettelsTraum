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
		// Einstellungen-Dialog
		einstellungen: {
			// für diesen Computer registrierte BearbeiterIn
			bearbeiterin: "",
			// Nach dem Starten des Programms wird die Menü-Leiste ausgeblendet,
			// bis die Alt-Taste gedrückt wird.
			autoHideMenuBar: false,
			// Quick-Access-Bar anzeigen
			quick: false,
			// Icons in der Quick-Access-Bar, die ein- oder ausgeblendet gehören
			"quick-programm-einstellungen": false,
			"quick-programm-beenden": false,
			"quick-kartei-erstellen": false,
			"quick-kartei-oeffnen": false,
			"quick-kartei-speichern": false,
			"quick-kartei-speichern-unter": false,
			"quick-kartei-metadaten": false,
			"quick-kartei-anhaenge": false,
			"quick-kartei-notizen": false,
			"quick-kartei-suche": false,
			"quick-kartei-schliessen": false,
			"quick-belege-hinzufuegen": false,
			"quick-belege-auflisten": false,
			"quick-belege-sortieren": false,
		},
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
		// Quick-Access-Bar ein- oder ausschalten
		optionen.anwendenQuickAccess();
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
			if (ee[i].type === "checkbox") {
				ee[i].checked = optionen.data.einstellungen[e] ? true : false;
			} else if (ee[i].type === "text") {
				ee[i].value = optionen.data.einstellungen[e] ? optionen.data.einstellungen[e] : "";
			}
		}
	},
	// Quick-Access-Bar ein- bzw. ausblenden
	anwendenQuickAccess () {
		let quick = document.getElementById("quick");
		// Icons ein- oder ausblenden
		let icons = quick.querySelectorAll("a"),
			icons_alle_aus = true;
		for (let i = 0, len = icons.length; i < len; i++) {
			if (optionen.data.einstellungen[ icons[i].id ]) {
				icons[i].classList.remove("aus");
				icons_alle_aus = false;
			} else {
				icons[i].classList.add("aus");
			}
		}
		// Bar ein- oder ausblenden
		if (optionen.data.einstellungen.quick && !icons_alle_aus) {
			quick.classList.remove("aus");
		} else {
			quick.classList.add("aus");
		}
		// affizierte Elemente anpassen
		let affiziert = document.querySelectorAll("body > header, body > section");
		for (let i = 0, len = affiziert.length; i < len; i++) {
			if (optionen.data.einstellungen.quick && !icons_alle_aus) {
				affiziert[i].classList.add("quick");
			} else {
				affiziert[i].classList.remove("quick");
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
			if (this.type === "checkbox") {
				optionen.data.einstellungen[e] = this.checked;
			} else if (this.type === "text") {
				optionen.data.einstellungen[e] = this.value;
			}
			// ggf. Quick-Access-Bar umstellen
			if ( e.match(/^quick/) ) {
				optionen.anwendenQuickAccess();
			}
			// Optionen speichern
			optionen.speichern();
		});
	},
	// das Optionen-Fenster öffnen
	oeffnen () {
		let fenster = document.getElementById("einstellungen");
		overlay.oeffnen(fenster);
		fenster.querySelector("#einstellungen input").focus();
	},
};
