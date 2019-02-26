"use strict";

// Das Objekt enthält alle Variablen und Methoden, die mit der Anzeige
// der Belegliste zusammenhängen. Zu den Filtern dieser Liste s. liste_filter.js
let liste = {
	// Zeigt die Karteikartenliste an, überprüft aber vorher
	// ob noch ein Beleg in Bearbeitung gespeichert werden muss
	anzeigen () {
		if (!kartei.wort) { // noch keine Kartei geöffnet/erstellt
			dialog.oeffnen("alert", null);
			dialog.text("Sie müssen erst einmal eine Kartei öffnen oder erstellen!");
		} else if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.confirm) {
					beleg.belegGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert!\nMöchten Sie trotzdem zur Beleg-Liste wechseln?\nAchtung, alle Änderungen am aktuellen Beleg gehen verloren!");
		} else {
			liste.wechseln();
		}
	},
	// zur Belegliste wechseln (von wo auch immer)
	wechseln () {
		document.getElementById("liste").classList.add("preload");
		helfer.sektionWechseln("liste");
	},
	// speichert, in welcher chronologischen Richtung die Belege sortiert werden soll
	sortierung_aufwaerts: true,
	// speichert, ob in der Belegliste der komplette Belegschnitt angezeigt werden soll
	// mögliche Werte: "10", "50", "100", "-" (keine Schnitte anzeigen)
	zeitschnitte: "50",
	// speichert, ob in der Belegliste der komplette Belegschnitt angezeigt werden soll
	belegschnitte_anzeigen: true,
	// baut die Belegliste auf
	aufbauen (filter_init) {
		// Filter initialisieren
		if (filter_init) {
			liste_filter.init();
		}
		// Content-Objekt vorbereiten
		let cont = document.getElementById("liste_belege_cont");
		helfer.keineKinder(cont);
		// Belege filtern
		let belege = Object.keys(data.k);
		belege = liste_filter.filter(belege);
		// Belege sortieren
		liste.belegeSortierenCache = {};
		belege.sort(liste.belegeSortieren);
		// Zeitschnitte drucken
		let start = liste.zeitschnittErmitteln(data.k[belege[0]].da).jahrzehnt,
			ende = liste.zeitschnittErmitteln(data.k[belege[belege.length - 1]].da).jahrzehnt,
			jahrzehnt = start,
			beleg_akt = 0;
		while (true) { // Obacht!
			// Abbruchbedingungen
			if (liste.sortierung_aufwaerts && jahrzehnt > ende ||
					!liste.sortierung_aufwaerts && jahrzehnt < ende) {
				break;
			}
			// Zeitschnitt drucken?
			if (jahrzehnt !== start) {
				cont.appendChild( liste.zeitschnittErstellen(jahrzehnt) );
				// diese Meldung wird ggf. nachträglich ausgeblendet
				let div = document.createElement("div");
				div.classList.add("liste_keine_belege");
				div.textContent = "keine Belege";
				cont.appendChild(div);
			}
			// zugehörige Belege drucken
			while (beleg_akt <= belege.length - 1) { // Obacht!
				// id und Jahrzehnt des Belegs ermitteln
				let id = belege[beleg_akt],
					zeitschnitt_akt = liste.zeitschnittErmitteln(data.k[id].da);
				// Abbruchbedingung Endlosschleife
				if (zeitschnitt_akt.jahrzehnt !== jahrzehnt) {
					break;
				}
				// für den nächsten Durchgang den nächsten Beleg auswählen
				beleg_akt++;
				// Beleg-Kopf erstellen
				let div = document.createElement("div");
				div.classList.add("liste_kopf");
				// Beleg bearbeiten
				let a = document.createElement("a");
				a.href = "#";
				a.classList.add("liste_bearbeiten", "icon_link", "icon_bearbeiten");
				a.textContent = " ";
				a.dataset.id = id;
				beleg.oeffnenKlick(a);
				div.appendChild(a);
				// Jahr
				let span = document.createElement("span");
				span.classList.add("liste_jahr");
				span.textContent = zeitschnitt_akt.datum;
				div.appendChild(span);
				// Belegschnitt-Vorschau
				div.appendChild( liste.belegschnittVorschau(data.k[id]) );
				// <div> für Belegkopf einhängen
				liste.belegschnittUmschalten(div);
				cont.appendChild(div);
				// Belegschnitt
				cont.appendChild( liste.belegschnittErstellen(data.k[id].bs) );
			}
			// Jahrzehnt hoch- bzw. runterzählen
			if (liste.sortierung_aufwaerts) {
				jahrzehnt += 10;
			} else {
				jahrzehnt -= 10;
			}
		}
		// Anzeige der Zeitschnitte anpassen
		liste.zeitschnitteAnpassen();
		// Anzeige, dass kein Beleg vorhanden ist, ggf. ausblenden
		liste.zeitschnitteKeineBelege();
	},
	// Zeitschnitt ermitteln
	zeitschnittErmitteln (datum) {
		// Output-Objekt vorbereiten
		let output = {
			datum: "", // Belegdatum, das angezeigt werden soll
			jahr: "", // Jahr, mit dem gerechnet werden kann
			jahrzehnt: -1, // Jahrzehnt für die Zeitschnittanzeige
		};
		// Anzeigedatum und Jahr, mit dem gerechnet wird, ermitteln
		if (datum.match(/[0-9]{4}/)) {
			output.datum = datum.match(/[0-9]{4}/)[0];
			output.jahr = output.datum;
		} else {
			output.datum = `${datum.match(/([0-9]{2})\./)[1]}. Jh.`;
			output.jahr = ((parseInt(datum.match(/([0-9]{2})\./)[1], 10) - 1) * 100).toString();
		}
		// Jahrzehnt ermitteln
		output.jahrzehnt = Math.floor(parseInt(output.jahr, 10) / 10);
		if (liste.sortierung_aufwaerts) {
			output.jahrzehnt *= 10;
		} else if (!liste.sortierung_aufwaerts) {
			output.jahrzehnt = (output.jahrzehnt + 1) * 10;
		}
		// Output auswerfen
		return output;
	},
	// erstellt ein <div>, der den Zeitschnitt anzeigt
	zeitschnittErstellen (jahrzehnt) {
		// Element erzeugen
		let div = document.createElement("div");
		div.classList.add("liste_zeitschnitt");
		div.textContent = jahrzehnt;
		// dataset erstellen
		jahrzehnt = jahrzehnt.toString(); // wird als integer übergeben, muss aber string sein
		let dataset = "10|";
		if (jahrzehnt.match(/50$/)) {
			dataset += "50|";
		} else if (jahrzehnt.match(/00$/)) {
			dataset += "50|100|";
		}
		div.dataset.zeitschnitt = dataset;
		// <div> auswerfen
		return div;
	},
	// Anzeige, dass für einen Zeitabschnitt keine Belege vorhanden sind, ggf. ausblenden
	zeitschnitteKeineBelege () {
		// 1. Schritt: Meldungen, nur nach Zeitschnitten einblenden, die angezeigt werden.
		let zeitschnitte = document.querySelectorAll("#liste_belege_cont .liste_zeitschnitt");
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			if (zeitschnitte[i].classList.contains("aus")) {
				zeitschnitte[i].nextSibling.classList.add("aus");
			} else {
				zeitschnitte[i].nextSibling.classList.remove("aus");
			}
		}
		// 2. Schritt: Meldungen, denen irgendwann ein Beleg folgt ausblenden
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			let keine_belege = zeitschnitte[i].nextSibling,
				naechster_div = keine_belege.nextSibling;
			while (naechster_div.classList.contains("aus")) {
				naechster_div = naechster_div.nextSibling;
			}
			if (naechster_div.classList.contains("liste_kopf")) {
				keine_belege.classList.add("aus");
			}
		}
	},
	// Anzeige der Zeitschnitte anpassen
	zeitschnitteAnpassen () {
		let zeitschnitte = document.querySelectorAll("#liste_belege_cont [data-zeitschnitt]");
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			let reg = new RegExp(helfer.escapeRegExp(`${liste.zeitschnitte}|`));
			if (zeitschnitte[i].dataset.zeitschnitt.match(reg)) {
				zeitschnitte[i].classList.remove("aus");
			} else {
				zeitschnitte[i].classList.add("aus");
			}
		}
		liste.zeitschnitteKeineBelege();
	},
	// Cache, um die Daten nicht andauernd neu extrahieren zu müssen
	// (unbedingt vor dem Sortieren leeren, sonst werden Änderungen nicht berücksichtigt!)
	belegeSortierenCache: {},
	// Belege chronologisch sortieren
	belegeSortieren (a, b) {
		// Sortierdaten ermitteln
		let datum = {
			a: 0,
			b: 0,
		};
		for (let i = 0; i < 2; i++) {
			// Jahreszahl im Zwischenspeicher?
			if (i === 0 && liste.belegeSortierenCache[a]) {
				datum.a = liste.belegeSortierenCache[a];
				continue;
			} else if (i === 1 && liste.belegeSortierenCache[b]) {
				datum.b = liste.belegeSortierenCache[b];
				continue;
			}
			// Jahreszahl ermitteln
			let id = a,
				zeiger = "a";
			if (i === 1) {
				id = b;
				zeiger = "b";
			}
			let da = data.k[id].da;
			if (da.match(/[0-9]{4}/)) {
				datum[zeiger] = parseInt(da.match(/[0-9]{4}/)[0], 10);
			} else {
				datum[zeiger] = (parseInt(da.match(/([0-9]{2})\./)[1], 10) - 1) * 100;
			}
			// Jahreszahl zwischenspeichern
			liste.belegeSortierenCache[id] = datum[zeiger];
		}
		// Belege aus demselben Jahr => jüngere Belege immer nach älteren sortieren
		if (datum.a === datum.b) {
			return parseInt(a, 10) - parseInt(b, 10);
		}
		// Sortierung nach Jahr
		if (liste.sortierung_aufwaerts) {
			return datum.a - datum.b;
		}
		return datum.b - datum.a;
	},
	// erstellt die Anzeige des Belegschnitts unterhalb des Belegkopfes
	belegschnittErstellen (belegschnitt) {
		// <div> erzeugen
		let div = document.createElement("div");
		div.classList.add("liste_schnitt");
		if (!liste.belegschnitte_anzeigen) {
			div.classList.add("aus");
		}
		// Absätze erzeugen
		let schnitt_prep = belegschnitt.replace(/\n(\s+)*\n/g, "\n"), // Leerzeilen löschen
			schnitt_p = schnitt_prep.split("\n");
		for (let i = 0, len = schnitt_p.length; i < len; i++) {
			let p = document.createElement("p");
			p.textContent = schnitt_p[i];
			div.appendChild(p);
		}
		// <div> zurückgeben
		return div;
	},
	// generiert den Vorschautext des übergebenen Belegs inkl. Autorname (wenn vorhanden)
	belegschnittVorschau (beleg_akt) {
		// Zeilenumbrüche löschen
		let schnitt = beleg_akt.bs.replace(/\n/g, "");
		// 1. Treffer im Text ermitteln, Belegschnitt am Anfang ggf. kürzen
		let reg = new RegExp(helfer.escapeRegExp(kartei.wort), "gi"),
			idx = schnitt.split(reg)[0].length;
		if (idx > 30) {
			schnitt = `…${schnitt.substring(idx - 20)}`;
		}
		// Treffer hervorheben
		schnitt = schnitt.replace(reg, (m) => {
			return `<strong>${m}</strong>`;
		});
		// ggf. Autor angeben
		let frag = document.createDocumentFragment();
		if (beleg_akt.au) {
			let autor = beleg_akt.au.split(",");
			frag.appendChild( document.createTextNode(`${autor[0]}: `) );
		}
		// Textschnitt in Anführungsstriche
		let q = document.createElement("q");
		q.innerHTML = schnitt;
		frag.appendChild(q);
		// Fragment zurückgeben
		return frag;
	},
	// einen einzelnen Belegschnitt durch Klick auf den Belegkopf umschalten
	belegschnittUmschalten (div) {
		div.addEventListener("click", function() {
			let schnitt = this.nextSibling;
			schnitt.classList.toggle("aus");
		});
	},
	// Funktionen im Header aufrufen
	header (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			let funktion = this.id.replace(/^liste_link_/, "");
			if (funktion === "filter") {
				liste.headerFilter();
			} else if (funktion === "sortieren") {
				liste.headerSortieren();
			} else if (funktion.match(/^zeitschnitte/)) {
				liste.headerJahresschnitte(funktion);
			} else if (funktion === "belegschnitt") {
				liste.headerBelegschnitt();
			}
		});
	},
	// Filter ein- bzw. ausblenden
	headerFilter () {
		let sec_liste = document.getElementById("liste"),
			link_filter = document.getElementById("liste_link_filter"),
			filter_an = false;
		sec_liste.classList.remove("preload"); // damit beim ersten Anzeigen der Liste keine Animation läuft
		sec_liste.classList.toggle("filter_aus");
		if (sec_liste.classList.contains("filter_aus")) {
			link_filter.title = "Filter einblenden";
			link_filter.classList.remove("icon_filter_aus");
			link_filter.classList.add("icon_filter_an");
		} else {
			filter_an = true;
			link_filter.title = "Filter ausblenden";
			link_filter.classList.add("icon_filter_aus");
			link_filter.classList.remove("icon_filter_an");
		}
	},
	// chronologisches Sortieren der Belege
	headerSortieren () {
		liste.sortierung_aufwaerts = !liste.sortierung_aufwaerts;
		let link = document.getElementById("liste_link_sortieren");
		if (liste.sortierung_aufwaerts) {
			link.classList.remove("icon_pfeil_hoch");
			link.classList.add("icon_pfeil_runter");
			link.title = "Chronologisch absteigend sortieren";
		} else {
			link.classList.add("icon_pfeil_hoch");
			link.classList.remove("icon_pfeil_runter");
			link.title = "Chronologisch aufsteigend sortieren";
		}
		liste.aufbauen(false);
	},
	// Anzahl der Jahresschnitte festlegen, die angezeigt werden sollen
	headerJahresschnitte (funktion) {
		if (funktion.match(/[0-9]+$/)) {
			liste.zeitschnitte = funktion.match(/[0-9]+$/)[0];
		} else {
			liste.zeitschnitte = "-";
		}
		liste.zeitschnitteAnpassen();
	},
	// Anzeige des kompletten Belegschnitts umstellen
	headerBelegschnitt () {
		// Variable umstellen
		liste.belegschnitte_anzeigen = !liste.belegschnitte_anzeigen;
		// Link im Header anpassen
		let link = document.getElementById("liste_link_belegschnitt");
		if (liste.belegschnitte_anzeigen) {
			link.classList.remove("icon_auge");
			link.classList.add("icon_auge_aus");
			link.title = "Komplettanzeige der Belegschnitte ausblenden";
		} else {
			link.classList.add("icon_auge");
			link.classList.remove("icon_auge_aus");
			link.title = "Komplettanzeige der Belegschnitte einblenden";
		}
		// Anzeige der Belegschnitte anpassen
		let belegschnitte = document.querySelectorAll("#liste_belege_cont .liste_schnitt");
		for (let i = 0, len = belegschnitte.length; i < len; i++) {
			if (liste.belegschnitte_anzeigen) {
				belegschnitte[i].classList.remove("aus");
			} else {
				belegschnitte[i].classList.add("aus");
			}
		}
	},
};
