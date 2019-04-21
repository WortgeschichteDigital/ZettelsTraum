"use strict";

let optionen = {
	// Speicherort aller Optionen
	// (ausgenommen ist der Fenster-Status, der nur im Main-Prozess steht)
	data: {
		// Einstellungen im Kopf der Belegliste
		belegliste: {
			// Filterleiste anzeigen
			filterleiste: false,
			// chronologischen Richtung, in der die Belege sortiert werden sollen
			sort_aufwaerts: false,
			// Dichte der Zeitschnitte oder Zeitschnitte ausblenden
			// mögliche Werte: "10", "50", "100", "-" (keine Schnitte anzeigen)
			zeitschnitte: "-",
			// kompletten Beleg anzeigen oder ausblenden
			beleg: false,
			// Absätze im Beleg ohne Worttreffer gekürzt darstellen
			beleg_kuerzen: false,
			// Trennstriche im Belegtext anzeigen
			trennung: false,
			// Wort der Kartei in der Vorschau und im Beleg automatisch hervorheben
			wort_hervorheben: false,
			// Steuerung Details: Bedeutung einblenden
			detail_bd: false,
			// Steuerung Details: Quelle einblenden
			detail_qu: false,
			// Steuerung Details: Korpus einblenden (ist mit Quelle gekoppelt)
			detail_kr: false,
			// Steuerung Details: Textsorte einblenden
			detail_ts: false,
			// Steuerung Details: Notizen einblenden
			detail_no: false,
			// Steuerung Details: Metainfos einblenden
			detail_meta: false,
		},
		// Einstellungen in der Karteikarte
		beleg: {
			// Trennstriche und Seitenumbrüche in der Leseansicht anzeigen
			trennung: true,
		},
		// Einstellungen-Dialog
		einstellungen: {
			// für diesen Computer registrierte BearbeiterIn
			bearbeiterin: "",
			// Notizen-Fenster nach dem Speichern direkt schließen
			"notizen-schliessen": true,
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
			"quick-kartei-schliessen": false,
			"quick-kartei-formvarianten": false,
			"quick-kartei-notizen": false,
			"quick-kartei-anhaenge": false,
			"quick-kartei-lexika": false,
			"quick-kartei-metadaten": false,
			"quick-kartei-redaktion": false,
			"quick-kartei-bedeutungen": false,
			"quick-kartei-bedeutungen-fenster": false,
			"quick-kartei-suche": false,
			"quick-belege-hinzufuegen": false,
			"quick-belege-auflisten": false,
			"quick-belege-sortieren": false,
			// alle anderen Filterblöcke zuklappen, wenn ein Filterblock geöffnet wird
			"filter-zuklappen": false,
			// inaktive Filterblöcke nach dem Neuaufbau der Filterleiste automatisch zuklappen
			"filter-inaktive": false,
			// nicht warnen, wenn eine Karte erstellt wurde, sie aber wegen der Filterregeln nicht angezeigt wird
			"nicht-karte-gefiltert": false,
			// neue Karteikarten als unvollständig markieren
			unvollstaendig: true,
			// Textfeld immer ergänzen, wenn aus einem Dropdown-Menü ein Wert ausgewählt wurde (betrifft Bedeutung und Textsorte)
			"immer-ergaenzen": false,
			// bestehende Karteikarten in der Leseansicht öffnen
			leseansicht: true,
			// Karteikarte nach dem Speichern direkt schließen
			"karteikarte-schliessen": true,
		},
		// Einstellungen in der Filterleiste
		filter: {
			// Anzahl der Filter während der Filterung sukzessive reduzieren
			reduzieren: false,
			// erweiterte Suche: Suchausdruck als Phrase behandeln
			phrase: false,
			// erweiterte Suche: Groß- und Kleinschreibung im Text beachten
			"text-genau": false,
			// erweiterte Suche: nur ganze Wörter suchen
			"ganzes-wort": false,
			// erweiterte Suche: Datenfelder
			"feld-au": true,
			"feld-bd": true,
			"feld-bs": true,
			"feld-da": true,
			"feld-kr": true,
			"feld-no": true,
			"feld-qu": true,
			"feld-ts": true,
			// speichert den gewünschten Zeitintervall, der in der Filterliste gewählt wurde
			zeitraum: "100",
			// inklusive Logik sollte der exklusiven vorgezogen werden (betrifft "Verschiedenes")
			logik: "inklusiv",
		},
		// letzter Pfad, der beim Speichern oder Öffnen einer Datei benutzt wurde
		letzter_pfad: "",
		// zuletzt verwendete Dokumente
		zuletzt: [],
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
			if (!obj.hasOwnProperty(o)) {
				continue;
			}
			if (!opt.hasOwnProperty(o)) {
				continue;
			}
			if (helfer.checkType("Object", obj[o])) {
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
		// Zeitfilter in der Filterleiste anpassen
		let filter_zeitraum = document.getElementsByName("filter-zeitraum");
		for (let i = 0, len = filter_zeitraum.length; i < len; i++) {
			if (filter_zeitraum[i].id === `filter-zeitraum-${optionen.data.filter.zeitraum}`) {
				filter_zeitraum[i].checked = true;
			} else {
				filter_zeitraum[i].checked = false;
			}
		}
		// andere Filter-Optionen in der Filterleiste anpassen
		document.querySelectorAll(".filter-optionen").forEach(function(i) {
			const opt = i.id.replace(/^filter-/, "");
			i.checked = optionen.data.filter[opt];
		});
		// Icons im Header der Filterleiste anpassen
		filter.ctrlReduzierenAnzeige();
		// Icons und Text im Header der Belegliste anpassen
		liste.headerFilterAnzeige(false); // hier auch die Anzeige der Filterleiste anpassen
		liste.headerSortierenAnzeige();
		liste.headerZeitschnitteAnzeige();
		liste.headerBelegAnzeige();
		liste.headerBelegKuerzenAnzeige();
		liste.headerTrennungAnzeige();
		liste.headerWortHervorhebenAnzeige();
		// Auswahllinks für Detail-Anzeige anpassen
		let details = ["bd", "qu", "ts", "no", "meta"];
		for (let i = 0, len = details.length; i < len; i++) {
			liste.headerDetailsAnzeige(details[i], `detail_${details[i]}`);
		}
		// Icons im <caption> der Karteikarte
		beleg.ctrlTrennungAnzeige();
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
			if (optionen.data.einstellungen[icons[i].id]) {
				icons[i].classList.remove("aus");
				icons_alle_aus = false;
			} else {
				icons[i].classList.add("aus");
			}
		}
		// Spacer ein- oder ausblenden
		if (optionen.data.einstellungen.quick && !icons_alle_aus) {
			let spacer = document.querySelectorAll(".quick-spacer");
			spacer.forEach(function(i) {
				i.classList.add("aus");
			});
			spacer.forEach(function(i) {
				let prev = i.previousSibling,
					next = i.nextSibling,
					vor = false,
					nach = false;
				// vorherige Elemente
				do {
					if (!prev.classList.contains("aus")) {
						if (!prev.classList.contains("quick-spacer")) {
							vor = true;
						}
						break;
					}
					prev = prev.previousSibling;
				} while (prev);
				// folgende Elemente
				do {
					if (!next.classList.contains("aus")) {
						nach = true;
						break;
					}
					next = next.nextSibling;
				} while (next);
				// ein- od. ausschalten
				if (vor && nach) {
					i.classList.remove("aus");
				} else {
					i.classList.add("aus");
				}
			});
		}
		// Bar ein- oder ausblenden
		if (optionen.data.einstellungen.quick && !icons_alle_aus) {
			quick.classList.add("an");
		} else {
			quick.classList.remove("an");
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
	// Timeout für die Speicherfunktion setzen, die nicht zu häufig ablaufen soll und
	// nicht so häufig ablaufen muss.
	//   sofort = Boolean
	//     (wird die Liste der zuletzt geänderten Dateien modifiziert, muss das sofort
	//     gespeichert werden, weil es Konsequenzen für die UI hat)
	speichern_timeout: null,
	speichern (sofort) {
		let timeout = 60000;
		if (sofort) {
			timeout = 0;
		}
		clearTimeout(optionen.speichern_timeout);
		optionen.speichern_timeout = setTimeout(function() {
			optionen.speichernAnstossen();
		}, timeout);
	},
	// Optionen zum speichern endgültig an den Main-Prozess schicken
	speichernAnstossen () {
		optionen.speichern_timeout = null;
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("optionen-speichern", optionen.data);
	},
	// letzten Pfad speichern
	aendereLetzterPfad () {
		const path = require("path"),
			reg = new RegExp(`^.+\\${path.sep}`),
			pfad = kartei.pfad.match(reg)[0];
		optionen.data.letzter_pfad = pfad;
		optionen.speichern(false);
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
		optionen.speichern(true);
	},
	// auf Änderung der Einstellungen achten
	//   ele = Element
	//     (Element, dessen Wert geändert wurde)
	aendereEinstellungListener (ele) {
		let typ = "change";
		if (ele.type === "text") {
			typ = "input";
		}
		ele.addEventListener(typ, function() {
			optionen.aendereEinstellung(this);
		});
	},
	// Einstellung aus dem Einstellungen-Dialog ändern
	//   ele = Element
	//     (Element, dessen Wert geändert wurde)
	aendereEinstellung (ele) {
		// Option ermitteln und umstellen
		let e = ele.id.replace(/^einstellung-/, "");
		if (ele.type === "checkbox") {
			optionen.data.einstellungen[e] = ele.checked;
		} else if (ele.type === "text") {
			optionen.data.einstellungen[e] = ele.value;
		}
		// ggf. Quick-Access-Bar umstellen
		if (/^quick/.test(e)) {
			optionen.anwendenQuickAccess();
		}
		// Optionen speichern
		optionen.speichern(false);
	},
	// das Optionen-Fenster öffnen
	oeffnen () {
		let fenster = document.getElementById("einstellungen");
		overlay.oeffnen(fenster);
		optionen.sektionWechselnInput();
	},
	// Sektion in den Einstellungen wechseln
	//   link = Element
	//     (Link, der für die Sektion steht, in die gewechsel werden soll)
	sektionWechseln (link) {
		// Links im Menü anpassen
		let menu = document.querySelectorAll("#einstellungen ul a"),
			sektion = "";
		for (let i = 0, len = menu.length; i < len; i++) {
			if (menu[i] === link) {
				menu[i].classList.add("aktiv");
				sektion = menu[i].id.replace(/^einstellungen-link-/, "");
			} else {
				menu[i].classList.remove("aktiv");
			}
		}
		// Anzeige der Sektionen anpassen
		let sektionen = document.querySelectorAll("#einstellungen section");
		for (let i = 0, len = sektionen.length; i < len; i++) {
			if (sektionen[i].id === `einstellungen-sec-${sektion}`) {
				sektionen[i].classList.remove("aus");
			} else {
				sektionen[i].classList.add("aus");
			}
		}
		// 1. Input fokussieren
		optionen.sektionWechselnInput();
	},
	// Klick-Event zum Wechseln der Sektion in den Einstellungen
	//   a = Element
	//     (Link, auf den geklickt wurde)
	sektionWechselnLink (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			optionen.sektionWechseln(this);
		});
	},
	// Fokussiert das erste Input-Element der aktuellen Sektion
	sektionWechselnInput () {
		document.querySelector("#einstellungen section:not(.aus) input").focus();
	},
	// durch die Menüelemente navigieren
	//   tastaturcode = Number
	//     (der durch das Event übergebene Tastaturcode, kann hier nur
	//     38 [aufwärts] od. 40 [abwärts] sein)
	naviMenue (tastaturcode) {
		// aktives Element ermitteln
		let links = document.querySelectorAll("#einstellungen li a"),
			aktiv = document.querySelector("#einstellungen a.aktiv"),
			pos = -1;
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// zu aktivierendes Element ermitteln
		if (tastaturcode === 38) {
			pos--;
		} else {
			pos++;
		}
		if (pos < 0) {
			pos = links.length - 1;
		} else if (pos >= links.length) {
			pos = 0;
		}
		// Sektion wechseln
		optionen.sektionWechseln(links[pos]);
	},
	// erzeugt eine Checkbox für Meldungsfenster, um eine Optione leicht zu ändern
	//   label_text = String
	//     (Text für das Label)
	//   option = String
	//     (die Einstellung, die eigentlich geändert werden soll)
	shortcut (label_text, option) {
		// Absatz erzeugen
		let p = document.createElement("p");
		// Input
		let input = document.createElement("input");
		p.appendChild(input);
		input.checked = optionen.data.einstellungen[option];
		input.id = "optionen-shortcut";
		input.type = "checkbox";
		input.addEventListener("change", function() {
			let ein = document.getElementById(`einstellung-${option}`);
			if (this.checked) {
				optionen.data.einstellungen[option] = true;
				ein.checked = true;
			} else {
				optionen.data.einstellungen[option] = false;
				ein.checked = false;
			}
			optionen.speichern(false);
		});
		// Label
		let label = document.createElement("label");
		label.setAttribute("for", "optionen-shortcut");
		label.textContent = label_text;
		p.appendChild(label);
		// Absatz zurückgeben
		return p;
	},
};
