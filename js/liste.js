"use strict";

let liste = {
	// Zeigt die Karteikartenliste an, überprüft aber vorher
	// ob noch ein Beleg in Bearbeitung gespeichert werden muss
	anzeigen () {
		if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					beleg.belegGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Der aktuelle Beleg wurde noch nicht gespeichert!\nMöchten Sie ihn nicht erst einmal speichern?");
		} else {
			liste.wechseln();
		}
	},
	// zur Belegliste wechseln (von wo auch immer)
	wechseln () {
		document.getElementById("liste").classList.add("preload");
		helfer.sektionWechseln("liste");
	},
	// baut die Belegliste auf
	//   filter_init = Boolean
	//     (true = Filter müssen erneut initialisiert werden)
	aufbauen (filter_init) {
		// die Basis der Belegliste vorbereiten
		let belege = liste.aufbauenBasis(filter_init);
		// Hat die Kartei überhaupt Belege?
		if (!belege.length) {
			liste.aufbauenKeineBelege();
			return;
		}
		// Belege sortieren
		liste.belegeSortierenCache = {};
		belege.sort(liste.belegeSortieren);
		// Zeitschnitte drucken
		let cont = document.getElementById("liste-belege-cont"),
			start = liste.zeitschnittErmitteln(data.k[ belege[0] ].da).jahrzehnt,
			ende = liste.zeitschnittErmitteln(data.k[ belege[belege.length - 1] ].da).jahrzehnt,
			jahrzehnt = start,
			beleg_akt = 0;
		while (true) { // Obacht!
			// Abbruchbedingungen
			if (optionen.data.belegliste.sort_aufwaerts && jahrzehnt > ende ||
					!optionen.data.belegliste.sort_aufwaerts && jahrzehnt < ende) {
				break;
			}
			// Zeitschnitt drucken?
			if (jahrzehnt !== start) {
				cont.appendChild( liste.zeitschnittErstellen(jahrzehnt) );
				// diese Meldung wird ggf. nachträglich ausgeblendet
				let div = document.createElement("div");
				div.classList.add("liste-keine-belege");
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
				div.classList.add("liste-kopf");
				div.dataset.id = id;
				// Beleg bearbeiten
				let a = document.createElement("a");
				a.href = "#";
				a.classList.add("liste-bearbeiten", "icon-link", "icon-bearbeiten");
				a.textContent = " ";
				liste.formularOeffnen(a);
				div.appendChild(a);
				// Jahr
				let span = document.createElement("span");
				span.classList.add("liste-jahr");
				span.textContent = zeitschnitt_akt.datum;
				if (zeitschnitt_akt.datum !== data.k[id].da) {
					span.title = data.k[id].da;
					span.classList.add("liste-jahr-hinweis");
					liste.datumAnzeigen(span);
				}
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
			if (optionen.data.belegliste.sort_aufwaerts) {
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
	// basale Vorbereitungen für die Belegliste
	//   filter_init = Boolean
	//     (true = Filter müssen neu initialisiert werden)
	aufbauenBasis (filter_init) {
		// Filter initialisieren
		if (filter_init) {
			filter.aufbauen();
		}
		// Content-Objekt vorbereiten
		let cont = document.getElementById("liste-belege-cont");
		helfer.keineKinder(cont);
		// Anzahl der Belege feststellen und Belege filtern
		let belege = Object.keys(data.k),
			belege_anzahl = belege.length;
		belege = filter.kartenFiltern(belege);
		// Belegzahl anzeigen
		liste.aufbauenAnzahl(belege_anzahl, belege.length);
		// Belege zurückgeben
		return belege;
	},
	// In der Kartei sind keine Belege (mehr) und das sollte auch gezeigt werden.
	aufbauenKeineBelege () {
		let cont = document.getElementById("liste-belege-cont");
		let div = document.createElement("div");
		div.classList.add("liste-kartei-leer");
		div.textContent = "keine Belege";
		cont.appendChild(div);
	},
	// Anzahl der Belege drucken
	//   gesamt = Number
	//     (Anzahl aller Belege)
	//   gefiltert = Number
	//     (Anzahl der Belege, die die Filterung überstanden haben)
	aufbauenAnzahl (gesamt, gefiltert) {
		const cont = document.getElementById("liste-belege-anzahl");
		// keine Belege
		if (!gesamt) {
			cont.classList.add("aus");
			return;
		}
		// Anzahl der Belege anzeigen
		cont.classList.remove("aus");
		let anzahl = "",
			text = "Beleg";
		if (gesamt !== gefiltert) {
			if (gesamt !== 1) {
				text = "Belegen";
			}
			anzahl = `${gefiltert}/${gesamt} ${text}`;
			cont.classList.add("belege-gefiltert");
		} else {
			if (gesamt !== 1) {
				text = "Belege";
			}
			anzahl = `${gesamt} ${text}`;
			cont.classList.remove("belege-gefiltert");
		}
		cont.textContent = anzahl;
	},
	// Zeitschnitt ermitteln
	//   datum = String
	//     (das im Datum-Feld des Belegformulars eingetragene Datum)
	zeitschnittErmitteln (datum) {
		// Output-Objekt vorbereiten
		let output = {
			datum: "", // Belegdatum, das angezeigt werden soll
			jahr: "", // Jahr, mit dem gerechnet werden kann
			jahrzehnt: -1, // Jahrzehnt für die Zeitschnittanzeige
		};
		// Anzeigedatum und Jahr, mit dem gerechnet wird, ermitteln
		if ( datum.match(/[0-9]{4}/) ) {
			output.datum = datum.match(/[0-9]{4}/)[0];
			output.jahr = output.datum;
		} else {
			output.datum = `${datum.match(/([0-9]{2})\./)[1]}. Jh.`;
			output.jahr = ((parseInt(datum.match(/([0-9]{2})\./)[1], 10) - 1) * 100).toString();
		}
		// Jahrzehnt ermitteln
		output.jahrzehnt = Math.floor(parseInt(output.jahr, 10) / 10);
		if (optionen.data.belegliste.sort_aufwaerts) {
			output.jahrzehnt *= 10;
		} else if (!optionen.data.belegliste.sort_aufwaerts) {
			output.jahrzehnt = (output.jahrzehnt + 1) * 10;
		}
		// Output auswerfen
		return output;
	},
	// erstellt ein <div>, der den Zeitschnitt anzeigt
	//   jahrzehnt = Number
	//     (das Jahrzehnt des Zeitschnitts, der erstellt werden soll)
	zeitschnittErstellen (jahrzehnt) {
		// Element erzeugen
		let div = document.createElement("div");
		div.classList.add("liste-zeitschnitt");
		div.textContent = jahrzehnt;
		// dataset erstellen
		jahrzehnt = jahrzehnt.toString(); // wird als integer übergeben, muss aber string sein
		let dataset = "10|";
		if ( jahrzehnt.match(/50$/) ) {
			dataset += "50|";
		} else if ( jahrzehnt.match(/00$/) ) {
			dataset += "50|100|";
		}
		div.dataset.zeitschnitt = dataset;
		// <div> auswerfen
		return div;
	},
	// Anzeige, dass für einen Zeitabschnitt keine Belege vorhanden sind, ggf. ausblenden
	zeitschnitteKeineBelege () {
		// 1. Schritt: Meldungen, nur nach Zeitschnitten einblenden, die angezeigt werden.
		let zeitschnitte = document.querySelectorAll("#liste-belege-cont .liste-zeitschnitt");
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			if ( zeitschnitte[i].classList.contains("aus") ) {
				zeitschnitte[i].nextSibling.classList.add("aus");
			} else {
				zeitschnitte[i].nextSibling.classList.remove("aus");
			}
		}
		// 2. Schritt: Meldungen, denen irgendwann ein Beleg folgt ausblenden
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			let keine_belege = zeitschnitte[i].nextSibling,
				naechster_div = keine_belege.nextSibling;
			while ( naechster_div.classList.contains("aus") ) {
				naechster_div = naechster_div.nextSibling;
			}
			if ( naechster_div.classList.contains("liste-kopf") ) {
				keine_belege.classList.add("aus");
			}
		}
	},
	// Anzeige der Zeitschnitte anpassen
	zeitschnitteAnpassen () {
		let zeitschnitte = document.querySelectorAll("#liste-belege-cont [data-zeitschnitt]");
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			let reg = new RegExp( helfer.escapeRegExp(`${optionen.data.belegliste.zeitschnitte}|`) );
			if ( zeitschnitte[i].dataset.zeitschnitt.match(reg) ) {
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
	//   a, b = String
	//     (IDs der zu sortierenden Belege)
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
			if ( da.match(/[0-9]{4}/) ) {
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
		if (optionen.data.belegliste.sort_aufwaerts) {
			return datum.a - datum.b;
		}
		return datum.b - datum.a;
	},
	// erstellt die Anzeige des Belegschnitts unterhalb des Belegkopfes
	//   belegschnitt = String
	//     (der Volltext des Belegschnitts)
	belegschnittErstellen (belegschnitt) {
		// <div> erzeugen
		let div = document.createElement("div");
		div.classList.add("liste-schnitt");
		if (!optionen.data.belegliste.belegschnitte) {
			div.classList.add("aus");
		}
		// Absätze erzeugen
		let schnitt_prep = belegschnitt.replace(/\n(\s+)*\n/g, "\n"), // Leerzeilen löschen
			schnitt_p = schnitt_prep.split("\n");
		for (let i = 0, len = schnitt_p.length; i < len; i++) {
			let p = document.createElement("p");
			p.innerHTML = liste.belegschnittWortHervorheben(schnitt_p[i]);
			div.appendChild(p);
		}
		// <div> zurückgeben
		return div;
	},
	// generiert den Vorschautext des übergebenen Belegs inkl. Autorname (wenn vorhanden)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	belegschnittVorschau (beleg_akt) {
		// Zeilenumbrüche löschen
		let schnitt = beleg_akt.bs.replace(/\n/g, "");
		// 1. Treffer im Text ermitteln, Belegschnitt am Anfang ggf. kürzen
		let reg = new RegExp(helfer.escapeRegExp(kartei.wort), "gi"),
			idx = schnitt.replace(/<.+?>/g, "").split(reg)[0].length; // HTML-Formatierungen vorher löschen!
		if (idx > 30) {
			schnitt = `…${schnitt.substring(idx - 20)}`;
		}
		// Treffer hervorheben
		schnitt = liste.belegschnittWortHervorheben(schnitt);
		// ggf. Autor angeben
		let frag = document.createDocumentFragment();
		if (beleg_akt.au) {
			let autor = beleg_akt.au.split(",");
			frag.appendChild( document.createTextNode(`${autor[0]}: `) );
		}
		// Textschnitt in Anführungsstriche
		let q = document.createElement("q");
		if (optionen.data.belegliste.belegschnitte) {
			q.classList.add("schnitt-offen");
		}
		q.innerHTML = schnitt;
		frag.appendChild(q);
		// Fragment zurückgeben
		return frag;
	},
	// hebt ggf. das Wort der Kartei im übergebenen Text hervor
	//   schnitt = String
	//     (Text, in dem der Beleg hervorgehoben werden soll)
	belegschnittWortHervorheben (schnitt) {
		// Wort soll nicht hervorgehoben werden
		if (!optionen.data.belegliste.wort_hervorheben) {
			return schnitt;
		}
		let reg = new RegExp(helfer.escapeRegExp(kartei.wort), "gi");
		schnitt = schnitt.replace(reg, (m) => `<strong>${m}</strong>`);
		return schnitt;
	},
	// einen einzelnen Belegschnitt durch Klick auf den Belegkopf umschalten
	//   div = Element
	//     (der Belegkopf, auf den geklickt werden kann)
	belegschnittUmschalten (div) {
		div.addEventListener("click", function() {
			// Belegschnitt umschalten
			let schnitt = this.nextSibling;
			schnitt.classList.toggle("aus");
			// Anzeige der Vorschau verändern
			let vorschau = this.querySelector("q");
			if ( schnitt.classList.contains("aus") ) {
				vorschau.classList.remove("schnitt-offen");
			} else {
				vorschau.classList.add("schnitt-offen");
			}
		});
	},
	// Klick-Event zum Öffnen des Karteikarten-Formulars
	//   a = Element
	//     (Icon-Link, über den das Formular geöffnet werden kann)
	formularOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			beleg.oeffnen( parseInt(this.parentNode.dataset.id, 10) );
		});
	},
	// genaue Datumsangabe auf Klick anzeigen
	//   span = Element
	//     (<span>, in dem das Datum steht)
	datumAnzeigen (span) {
		span.addEventListener("click", function(evt) {
			evt.stopPropagation();
			let datum = this.title,
				beleg_id = this.parentNode.dataset.id;
			dialog.oeffnen("alert", null);
			dialog.text(`<h3>Beleg #${beleg_id}</h3>\n${datum}`);
		});
	},
	// Funktionen im Header aufrufen
	//   link = Element
	//     (Link im Header, auf den geklickt wird)
	header (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			let funktion = this.id.replace(/^liste-link-/, "");
			if (funktion === "filter") {
				liste.headerFilter();
			} else if (funktion === "sortieren") {
				liste.headerSortieren();
			} else if ( funktion.match(/^zeitschnitte/) ) {
				liste.headerZeitschnitte(funktion);
			} else if (funktion === "belegschnitte") {
				liste.headerBelegschnitte();
			} else if (funktion === "hervorheben") {
				liste.headerWortHervorheben();
			}
		});
	},
	// Filter ein- bzw. ausblenden
	headerFilter () {
		// Option ändern
		optionen.data.belegliste.filterleiste = !optionen.data.belegliste.filterleiste;
		optionen.speichern();
		// Anzeige anpassen
		liste.headerFilterAnzeige();
	},
	// Filter ein- bzw. ausblenden (Anzeige der Filterleiste und des Links im Header anpassen)
	headerFilterAnzeige () {
		// Filterleiste
		let sec_liste = document.getElementById("liste");
		sec_liste.classList.remove("preload"); // damit bei der ersten Anzeige keine Animation läuft
		// Link im Header
		let link = document.getElementById("liste-link-filter");
		if (optionen.data.belegliste.filterleiste) {
			sec_liste.classList.remove("filter-aus");
			link.classList.add("aktiv");
			link.title = "Filter ausblenden";
		} else {
			sec_liste.classList.add("filter-aus");
			link.classList.remove("aktiv");
			link.title = "Filter einblenden";
		}
	},
	// chronologisches Sortieren der Belege
	headerSortieren () {
		// Option ändern
		optionen.data.belegliste.sort_aufwaerts = !optionen.data.belegliste.sort_aufwaerts;
		optionen.speichern();
		// Link anpassen
		liste.headerSortierenAnzeige();
		// Liste neu aufbauen
		liste.aufbauen(false);
	},
	// chronologisches Sortieren der Belege (Anzeige im Header anpassen)
	headerSortierenAnzeige () {
		let link = document.getElementById("liste-link-sortieren");
		if (optionen.data.belegliste.sort_aufwaerts) {
			link.classList.add("aktiv");
			link.title = "Chronologisch absteigend sortieren";
		} else {
			link.classList.remove("aktiv");
			link.title = "Chronologisch aufsteigend sortieren";
		}
	},
	// Anzahl der Zeitschnitte festlegen, die angezeigt werden sollen
	//   funktion = String
	//     (der letzte Teil der ID des Elements, also "liste-link-" + "funktion" = ID)
	headerZeitschnitte (funktion) {
		// Zeitschnitt ermitteln
		if ( funktion.match(/[0-9]+$/) ) {
			optionen.data.belegliste.zeitschnitte = funktion.match(/[0-9]+$/)[0];
		} else {
			optionen.data.belegliste.zeitschnitte = "-";
		}
		optionen.speichern();
		// Anzeige der Links im Listenheader anpassen
		liste.headerZeitschnitteAnzeige();
		// Anzeige der Zeitschnitte in der Liste anpassen
		liste.zeitschnitteAnpassen();
	},
	// Anzahl der Zeitschnitte festlegen, die angezeigt werden sollen (Anzeige im Header anpassen)
	headerZeitschnitteAnzeige () {
		let aktiv = "";
		if (optionen.data.belegliste.zeitschnitte !== "-") {
			aktiv = `-${optionen.data.belegliste.zeitschnitte}`;
		}
		const id = `liste-link-zeitschnitte${aktiv}`, // der aktive Link
			links = document.getElementsByClassName("liste-link-zeitschnitte"); // alle Links
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i].id === id) {
				links[i].classList.add("aktiv");
			} else {
				links[i].classList.remove("aktiv");
			}
		}
	},
	// Anzeige des kompletten Belegschnitts umstellen
	headerBelegschnitte () {
		// Variable umstellen
		optionen.data.belegliste.belegschnitte = !optionen.data.belegliste.belegschnitte;
		optionen.speichern();
		// Link im Header anpassen
		liste.headerBelegschnitteAnzeige();
		// Anzeige der Belegschnitte anpassen
		let belegschnitte = document.querySelectorAll("#liste-belege-cont .liste-schnitt");
		for (let i = 0, len = belegschnitte.length; i < len; i++) {
			let q = belegschnitte[i].previousSibling.querySelector("q");
			if (optionen.data.belegliste.belegschnitte) {
				belegschnitte[i].classList.remove("aus");
				q.classList.add("schnitt-offen");
			} else {
				belegschnitte[i].classList.add("aus");
				q.classList.remove("schnitt-offen");
			}
		}
	},
	// Anzeige des kompletten Belegschnitts umstellen (Anzeige im Header anpassen)
	headerBelegschnitteAnzeige () {
		let link = document.getElementById("liste-link-belegschnitte");
		if (optionen.data.belegliste.belegschnitte) {
			link.classList.add("aktiv");
			link.title = "Komplettanzeige der Belegschnitte ausblenden";
		} else {
			link.classList.remove("aktiv");
			link.title = "Komplettanzeige der Belegschnitte einblenden";
		}
	},
	// Hervorhebung des Worts im Belegschnitt und der Vorschau aus-/einschalten
	headerWortHervorheben () {
		// Hervorhebung umstellen
		optionen.data.belegliste.wort_hervorheben = !optionen.data.belegliste.wort_hervorheben;
		optionen.speichern();
		// Link anpassen
		liste.headerWortHervorhebenAnzeige();
		// Liste neu aufbauen
		liste.aufbauen(false);
	},
	// Hervorhebung des Worts im Belegschnitt und der Vorschau aus-/einschalten (Anzeige im Header anpassen)
	headerWortHervorhebenAnzeige () {
		let link = document.getElementById("liste-link-hervorheben");
		if (optionen.data.belegliste.wort_hervorheben) {
			link.classList.add("aktiv");
			link.title = "Wort nicht hervorheben";
		} else {
			link.classList.remove("aktiv");
			link.title = "Wort hervorheben";
		}
	},
};
