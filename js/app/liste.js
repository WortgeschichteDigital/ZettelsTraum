"use strict";

let liste = {
	// Zeigt die Karteikartenliste an, überprüft aber vorher
	// ob noch etwas in Bearbeitung gespeichert werden muss
	anzeigen () {
		if (bedeutungen.geaendert) { // Bedeutungen noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					bedeutungen.speichern();
				} else if (dialog.antwort === false) {
					bedeutungen.bedeutungenGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Die Bedeutungen wurden verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
		} else if (beleg.geaendert) { // aktueller Beleg noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					beleg.belegGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Der aktuelle Beleg wurde noch nicht gespeichert.\nMöchten Sie ihn nicht erst einmal speichern?");
		} else {
			liste.wechseln();
		}
	},
	// zur Belegliste wechseln (von wo auch immer)
	wechseln () {
		document.getElementById("liste").classList.add("preload");
		helfer.sektionWechseln("liste");
	},
	// Zwischenspeicher für die ID eines neu erstellten Belegs
	// (wichtig, damit der Beleg aufgeklappt wird, wenn die Liste neu aufgebaut wird;
	// vgl. liste.status())
	statusNeu: "",
	// Zwischenspeicher für die ID eines geänderten Belegs
	// (damit der Beleg markiert wird)
	statusGeaendert: "",
	// speichert den Status der aktuellen Belegliste, d.h. ob die Karten auf oder zugeklappt sind
	//   filter_init = Boolean
	//     (speichert, ob die Filterliste initialisiert werden sollen)
	status (filter_init) {
		// Klapp-Status ermitteln
		let offen = {},
			koepfe_vor = document.querySelectorAll(".liste-kopf");
		for (let i = 0, len = koepfe_vor.length; i < len; i++) {
			let id = koepfe_vor[i].dataset.id;
			if (koepfe_vor[i].classList.contains("schnitt-offen")) {
				offen[id] = true;
			} else {
				offen[id] = false;
			}
		}
		// ggf. den gerade erst erstellten Beleg als offenen Beleg hinzufügen
		if (liste.statusNeu) {
			offen[liste.statusNeu] = true;
		}
		// Scroll-Status speichern
		liste.statusScrollBak();
		// Liste aufbauen
		liste.aufbauen(filter_init);
		// Klapp-Status wiederherstellen
		let koepfe_nach = document.querySelectorAll(".liste-kopf");
		for (let i = 0, len = koepfe_nach.length; i < len; i++) {
			let id = koepfe_nach[i].dataset.id;
			if (offen[id] || offen[id] === undefined && optionen.data.belegliste.beleg) { // wurde ein Beleg zum Zeitpunkt der Sicherung nicht angezeigt, wird er aufgeklappt, wenn (theoretisch) alle Belege aufgeklappt sein sollten
				koepfe_nach[i].classList.add("schnitt-offen");
				koepfe_nach[i].nextSibling.classList.remove("aus");
			} else {
				koepfe_nach[i].classList.remove("schnitt-offen");
				koepfe_nach[i].nextSibling.classList.add("aus");
			}
		}
		// Scroll-Status wiederherstellen
		liste.statusScrollReset();
		// ggf. einen den neuen Beleg visuell hervorheben
		if (liste.statusNeu) {
			// neuen Beleg markieren
			let beleg_unsichtbar = markBelegsuche(liste.statusNeu);
			// neuer Beleg könnte aufgrund der Filter versteckt sein
			if (beleg_unsichtbar && !optionen.data.einstellungen["nicht-karte-gefiltert"]) {
				dialog.oeffnen("alert", null);
				dialog.text("Der Beleg wurde angelegt.\nWegen der aktuellen Filterregeln erscheint er jedoch nicht in der Belegliste.");
				document.getElementById("dialog-text").appendChild(optionen.shortcut("Meldung nicht mehr anzeigen", "nicht-karte-gefiltert"));
			} else if (!beleg_unsichtbar) { // zum Beleg scrollen
				let id = liste.statusNeu; // wird unten geleert, darum hier zwischenspeichern
				setTimeout(function() {
					let scroll = document.querySelector(`.liste-kopf[data-id="${id}"]`).offsetTop - 34; // 34 = Höhe des Listen-Headers
					window.scrollTo(0, scroll);
				}, 5); // ohne den Timeout ist offsetTop immer 0
			}
		} else if (liste.statusGeaendert) {
			markBelegsuche(liste.statusGeaendert);
		}
		liste.statusNeu = "";
		liste.statusGeaendert = "";
		// Beleg suchen, der neu ist oder geändert wurde
		function markBelegsuche (status) {
			let beleg = document.querySelector(`.liste-kopf[data-id="${status}"]`);
			if (beleg) {
				markSetzen(beleg);
				return false;
			}
			return true;
		}
		function markSetzen (kopf) {
			setTimeout(() => kopf.classList.add("hinweis-beleg"), 0);
			setTimeout(() => kopf.classList.remove("hinweis-beleg"), 1500);
		}
	},
	// Zwischenspeicher für den ermittelten Scroll-Status
	statusScroll: {},
	// Scroll-Status ermitteln
	statusScrollBak () {
		let header = document.querySelector("#liste-belege header").offsetHeight,
			win = window.scrollY,
			koepfe = document.querySelectorAll(".liste-kopf");
		liste.statusScroll = {
			id: "",
			scroll: 0,
		};
		for (let i = 0, len = koepfe.length; i < len; i++) {
			let scroll = koepfe[i].offsetTop - header - win;
			if (scroll >= 0) {
				liste.statusScroll.id = koepfe[i].dataset.id;
				liste.statusScroll.scroll = scroll;
				break;
			}
		}
	},
	// Scroll-Status wiederherstellen
	statusScrollReset () {
		if (!liste.statusScroll.id) {
			return;
		}
		let kopf = document.querySelector(`.liste-kopf[data-id="${liste.statusScroll.id}"]`);
		if (kopf) {
			let header = document.querySelector("#liste-belege header").offsetHeight;
			window.scrollTo(0, kopf.offsetTop - liste.statusScroll.scroll - header);
		}
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
		// Zeitschnitte drucken
		let cont = document.getElementById("liste-belege-cont"),
			start = liste.zeitschnittErmitteln(data.ka[belege[0]].da).jahrzehnt,
			ende = liste.zeitschnittErmitteln(data.ka[belege[belege.length - 1]].da).jahrzehnt,
			jahrzehnt = start,
			beleg_akt = 0;
		while (!(optionen.data.belegliste.sort_aufwaerts && jahrzehnt > ende ||
					!optionen.data.belegliste.sort_aufwaerts && jahrzehnt < ende)) {
			// Zeitschnitt drucken?
			if (jahrzehnt !== start) {
				cont.appendChild(liste.zeitschnittErstellen(jahrzehnt));
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
					zeitschnitt_akt = liste.zeitschnittErmitteln(data.ka[id].da);
				// Abbruchbedingung Endlosschleife
				if (zeitschnitt_akt.jahrzehnt !== jahrzehnt) {
					break;
				}
				// für den nächsten Durchgang den nächsten Beleg auswählen
				beleg_akt++;
				// Beleg-Kopf erstellen
				let div = document.createElement("div");
				div.classList.add("liste-kopf");
				if (optionen.data.belegliste.beleg) {
					div.classList.add("schnitt-offen");
				}
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
				if (zeitschnitt_akt.datum !== data.ka[id].da) {
					span.title = data.ka[id].da;
					span.classList.add("liste-jahr-hinweis");
					liste.detailAnzeigen(span);
				}
				div.appendChild(span);
				// Belegvorschau
				div.appendChild(liste.belegVorschau(data.ka[id]));
				// <div> für Belegkopf einhängen
				liste.belegUmschalten(div);
				cont.appendChild(div);
				// <div> für die Detail-Ansicht erzeugen
				div = document.createElement("div");
				div.classList.add("liste-details");
				if (!optionen.data.belegliste.beleg) {
					div.classList.add("aus");
				}
				cont.appendChild(div);
				// Beleg
				div.appendChild(liste.belegErstellen(id));
				// Bedeutung
				liste.bedeutungErstellen(data.ka[id].bd, div);
				// Quellenangabe
				div.appendChild(liste.quelleErstellen(id));
				// Korpus
				liste.korpusErstellen(data.ka[id].kr, div);
				// Textsorte
				liste.textsorteErstellen(data.ka[id].ts, div);
				// Notizen
				liste.notizenErstellen(data.ka[id].no, div);
				// Meta-Infos
				liste.metainfosErstellen(data.ka[id], div, "liste-meta");
			}
			// Jahrzehnt hoch- bzw. runterzählen
			if (optionen.data.belegliste.sort_aufwaerts) {
				jahrzehnt += 10;
			} else {
				jahrzehnt -= 10;
			}
		}
		// Anzeige der Zeitschnitte anpassen
		liste.zeitschnitteAnpassen(false);
		// Anzeige der Details anpassen
		liste.detailsAnzeigen(false);
		// Anzeige, dass kein Beleg vorhanden ist, ggf. ausblenden
		liste.zeitschnitteKeineBelege();
	},
	// basale Vorbereitungen für die Belegliste
	//   filter_init = Boolean
	//     (true = Filter müssen neu initialisiert werden)
	aufbauenBasis (filter_init) {
		// Content-Objekt vorbereiten
		let cont = document.getElementById("liste-belege-cont");
		helfer.keineKinder(cont);
		// Anzahl der Belege feststellen
		let belege = Object.keys(data.ka),
			belege_anzahl = belege.length;
		// Filter ausblenden?
		if (!belege_anzahl) {
			filter.keineFilter(true);
		} else {
			filter.keineFilter(false);
		}
		// Belege sortieren
		liste.belegeSortierenCache = {};
		belege.sort(liste.belegeSortieren);
		// Belege filtern
		const belege_ungefiltert = [...belege];
		belege = filter.kartenFiltern(belege);
		// Filter ggf. mit den gefilterten Belegen initialisieren
		if (filter_init) {
			if (optionen.data.filter.reduzieren) {
				filter.aufbauen([...belege]);
			} else {
				filter.aufbauen([...belege_ungefiltert]);
			}
		}
		// Belegzahl anzeigen
		liste.aufbauenAnzahl(belege_anzahl, belege.length);
		// Belege zurückgeben
		return belege;
	},
	// In der Kartei sind keine Belege (mehr) und das sollte auch gezeigt werden.
	aufbauenKeineBelege () {
		const cont = document.getElementById("liste-belege-cont");
		let div = document.createElement("div");
		div.classList.add("liste-kartei-leer");
		div.textContent = "keine Belege";
		cont.appendChild(div);
	},
	// Anzahl der Belge drucken
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
		if (/[0-9]{4}/.test(datum) && /[0-9]{2}\.\sJh\./.test(datum)) { // mehrere Datentypen => 1. verwenden
			let datum_split = datum.split(/\sJh\./);
			if (/[0-9]{4}/.test(datum_split[0])) {
				datum_vierstellig(datum_split[0]);
			} else {
				datum_jahrhundert(datum);
			}
		} else if (/[0-9]{4}/.test(datum)) { // 1. Jahresangabe verwenden
			datum_vierstellig(datum);
		} else { // 1. Jarhhundert verwenden
			datum_jahrhundert(datum);
		}
		// Jahrzehnt ermitteln
		output.jahrzehnt = Math.floor(parseInt(output.jahr, 10) / 10);
		if (optionen.data.belegliste.sort_aufwaerts) {
			output.jahrzehnt *= 10;
		} else if (!optionen.data.belegliste.sort_aufwaerts) {
			output.jahrzehnt = (output.jahrzehnt + 1) * 10;
		}
		// Datum und Jahr im Output füllen
		function datum_vierstellig (datum) {
			output.datum = datum.match(/[0-9]{4}/)[0];
			output.jahr = output.datum;
		}
		function datum_jahrhundert (datum) {
			output.datum = `${datum.match(/([0-9]{2})\./)[1]}. Jh.`;
			output.jahr = ((parseInt(datum.match(/([0-9]{2})\./)[1], 10) - 1) * 100).toString();
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
		if (/50$/.test(jahrzehnt)) {
			dataset += "50|";
		} else if (/00$/.test(jahrzehnt)) {
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
			if (naechster_div.classList.contains("liste-kopf")) {
				keine_belege.classList.add("aus");
			}
		}
	},
	// Anzeige der Zeitschnitte anpassen
	//   scroll_bak = Boolean
	//     (beim Neuaufbau der Liste darf die Position nicht gemerkt werden)
	zeitschnitteAnpassen (scroll_bak) {
		if (scroll_bak) {
			liste.statusScrollBak();
		}
		let zeitschnitte = document.querySelectorAll("#liste-belege-cont [data-zeitschnitt]");
		for (let i = 0, len = zeitschnitte.length; i < len; i++) {
			let reg = new RegExp(helfer.escapeRegExp(`${optionen.data.belegliste.zeitschnitte}|`));
			if (reg.test(zeitschnitte[i].dataset.zeitschnitt)) {
				zeitschnitte[i].classList.remove("aus");
			} else {
				zeitschnitte[i].classList.add("aus");
			}
		}
		liste.zeitschnitteKeineBelege();
		if (scroll_bak) {
			liste.statusScrollReset();
		}
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
			let da = liste.zeitschnittErmitteln(data.ka[id].da);
			datum[zeiger] = parseInt(da.jahr, 10);
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
	// erstellt die Anzeige des Belegs
	//   id = String
	//     (ID des Belegs)
	belegErstellen (id) {
		// <div> für Beleg
		let div = document.createElement("div");
		div.classList.add("liste-bs");
		// Kopierlink erzeugen
		let a = document.createElement("a");
		div.appendChild(a);
		a.classList.add("icon-link", "icon-tools-kopieren");
		a.dataset.ds = `${id}|bs`;
		liste.kopieren(a);
		// Absätze erzeugen
		let prep = data.ka[id].bs.replace(/\n\s*\n/g, "\n"), // Leerzeilen löschen
			p_prep = prep.split("\n"),
			form_reg = new RegExp(helfer.formVariRegExp(), "i"),
			zuletzt_gekuerzt = false; // true, wenn der vorherige Absatz gekürzt wurde
		for (let i = 0, len = p_prep.length; i < len; i++) {
			let p = document.createElement("p");
			div.appendChild(p);
			// Absatz ggf. kürzen
			if (optionen.data.belegliste.beleg_kuerzen &&
					!form_reg.test(bereinigen(p_prep[i]))) {
				if (zuletzt_gekuerzt) {
					div.removeChild(div.lastChild);
				} else {
					p.textContent = "[…]";
					zuletzt_gekuerzt = true;
				}
				continue;
			}
			zuletzt_gekuerzt = false;
			// ggf. Trennungszeichen entfernen
			p_prep[i] = liste.belegTrennungWeg(p_prep[i], false);
			// Absatz normal einhängen
			p.innerHTML = liste.suchtreffer(liste.belegWortHervorheben(p_prep[i], false), "bs");
		}
		// <div> zurückgeben
		return div;
		// Absatztext bereinigen, bevor eine Kürzung vollzogen wird
		function bereinigen (text) {
			text = text.replace(/<.+?>/g, "");
			text = liste.belegTrennungWeg(text, true);
			return text;
		}
	},
	// generiert den Vorschautext des übergebenen Belegs inkl. Autorname (wenn vorhanden)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	belegVorschau (beleg_akt) {
		// Beleg aufbereiten
		let schnitt = beleg_akt.bs.replace(/\n+/g, " "); // Absätze könnten mit Leerzeile eingegeben sein
		schnitt = schnitt.replace(/<.+?>/g, ""); // HTML-Formatierungen vorher löschen!
		schnitt = liste.belegTrennungWeg(schnitt, true); // Trennzeichen und Seitenumbrüche weg
		// 1. Treffer im Text ermitteln, Beleg am Anfang ggf. kürzen
		let reg = new RegExp(helfer.formVariRegExp(), "gi");
		if (reg.test(schnitt) &&
				reg.lastIndex - kartei.wort.length > 35) {
			schnitt = `…${schnitt.substring(reg.lastIndex - kartei.wort.length - 25)}`;
		}
		// Performance-Schub: Vorschautext kürzen
		if (schnitt.length > 280) {
			schnitt = `${schnitt.substring(0, 250)}…`;
		}
		// Treffer hervorheben
		schnitt = liste.belegWortHervorheben(schnitt, false);
		// ggf. Autor angeben
		let frag = document.createDocumentFragment();
		if (beleg_akt.au) {
			let autor = beleg_akt.au.split(/,(.+)/),
				autor_span = document.createElement("span");
			frag.appendChild(autor_span);
			autor_span.textContent = autor[0];
			if (autor.length > 1) {
				let span = document.createElement("span");
				span.classList.add("liste-autor-detail");
				span.textContent = `,${autor[1]}`;
				autor_span.appendChild(span);
			}
			autor_span.appendChild(document.createTextNode(": "));
		}
		// Textschnitt in Anführungsstriche
		let q = document.createElement("q");
		q.innerHTML = schnitt;
		frag.appendChild(q);
		// Fragment zurückgeben
		return frag;
	},
	// Trennungszeichen entfernen
	// (Funktion wird auch für andere Kontexte benutzt, z. B. in filter.js und beleg.js)
	//   text = String
	//     (Belegtext)
	//   immer_weg = Boolean
	//     (Trennungsstriche sollen in jedem Fall entfernt werden)
	belegTrennungWeg (text, immer_weg) {
		if (optionen.data.belegliste.trennung && !immer_weg) {
			return text;
		}
		text = text.replace(/\[¬\]([A-Z]+)/, function(m, p1) {
			return `-${p1}`;
		});
		return text.replace(/\[¬\]|\[:.+?:\]\s*/g, "");
	},
	// hebt ggf. das Wort der Kartei im übergebenen Text hervor
	//   schnitt = String
	//     (Text, in dem der Beleg hervorgehoben werden soll)
	//   immer = Boolean
	//     (das Wort soll immer hervorgehoben werden, egal was in der Option steht)
	belegWortHervorheben (schnitt, immer) {
		// Wort soll nicht hervorgehoben werden
		if (!optionen.data.belegliste.wort_hervorheben && !immer) {
			return schnitt;
		}
		const reg = new RegExp(`[^${helfer.ganzesWortRegExp.links}]*(${helfer.formVariRegExp()})[^${helfer.ganzesWortRegExp.rechts}]*`, "gi");
		schnitt = schnitt.replace(reg, (m) => `<mark class="wort">${m}</mark>`);
		return schnitt;
	},
	// Suchtreffer hervorheben
	//   text = String
	//     (der Text, in dem die Ersetzung vorgenommen werden soll)
	//   ds = String
	//     (der Datensatz, aus dem der Text stammt, also "bs", "da", "au" usw.)
	suchtreffer (text, ds) {
		// keine Suche oder keine Suche im aktuellen Datensatz
		if (!filter.volltextSuche.suche ||
				filter.volltextSuche.ds.indexOf(ds) === -1) {
			return text;
		}
		// Suchtreffer hervorheben
		filter.volltextSuche.reg.forEach(function(i) {
			const treffer = i.exec(text);
			text = text.replace(i, function(m) {
				if (treffer.groups) {
					return `${treffer.groups.vor}<mark class="suche">${treffer.groups.wort}</mark>${treffer.groups.nach}`;
				}
				return `<mark class="suche">${m}</mark>`;
			});
		});
		// Treffer innerhalb von Tags löschen
		text = text.replace(/(<[^>]*?)<mark class="suche">(.+?)<\/mark>/g, function(m, p1, p2) {
			return `${p1}${p2}`;
		});
		// Text zurückgeben
		return text;
	},
	// einen einzelnen Beleg durch Klick auf den Belegkopf umschalten
	//   div = Element
	//     (der Belegkopf, auf den geklickt werden kann)
	belegUmschalten (div) {
		div.addEventListener("click", function() {
			// Beleg umschalten
			let schnitt = this.nextSibling;
			schnitt.classList.toggle("aus");
			// Anzeige der Vorschau anpassen
			if (schnitt.classList.contains("aus")) {
				this.classList.remove("schnitt-offen");
			} else {
				this.classList.add("schnitt-offen");
			}
		});
	},
	// erstellt die Anzeige der Bedeutung
	//   bedeutung = String
	//     (der Volltext der Bedeutung)
	//   cont = Element
	//     (das ist der aktuelle Detailblock)
	bedeutungErstellen (bedeutung, cont) {
		// eine Bedeutung kann fehlen
		if (!bedeutung) {
			return;
		}
		// <div> für Bedeutung
		let div = document.createElement("div");
		cont.appendChild(div);
		div.classList.add("liste-bd", "liste-label");
		// Label erstellen
		let span = document.createElement("span");
		div.appendChild(span);
		span.classList.add("liste-label");
		span.textContent = "Bedeutung";
		// Absätze erzeugen
		let p_prep = bedeutung.split("\n");
		for (let i = 0, len = p_prep.length; i < len; i++) {
			let p = document.createElement("p");
			p.innerHTML = liste.suchtreffer(p_prep[i], "bd");
			div.appendChild(p);
		}
	},
	// erstellt den Absatz mit der Quellenangabe
	//   id = String
	//     (ID des Belegs)
	quelleErstellen (id) {
		// <div> für Quelle
		let div = document.createElement("div");
		div.classList.add("liste-qu", "liste-label");
		// Kopierlink erzeugen
		let a = document.createElement("a");
		div.appendChild(a);
		a.classList.add("icon-link", "icon-tools-kopieren");
		a.dataset.ds = `${id}|qu`;
		liste.kopieren(a);
		// Label erstellen
		let span = document.createElement("span");
		span.classList.add("liste-label");
		span.textContent = "Quelle";
		div.appendChild(span);
		// Absätze erzeugen
		let prep = data.ka[id].qu.replace(/\n\s*\n/g, "\n"), // Leerzeilen löschen
			p_prep = prep.split("\n");
		for (let i = 0, len = p_prep.length; i < len; i++) {
			// Text aufbereiten
			let text = liste.linksErkennen(p_prep[i]);
			// neuen Absatz erzeugen
			let p = document.createElement("p");
			p.innerHTML = liste.suchtreffer(text, "qu");
			div.appendChild(p);
		}
		// Klick-Events an alles Links hängen
		let links = div.querySelectorAll(".link");
		for (let i = 0, len = links.length; i < len; i++) {
			liste.linksOeffnen(links[i]);
		}
		// <div> zurückgeben
		return div;
	},
	// erstellt die Anzeige des Korpus
	//   korpus = String
	//     (das Korpus)
	//   cont = Element
	//     (das ist der aktuelle Detailblock)
	korpusErstellen (korpus, cont) {
		// die Korpus-Angabe kann fehlen
		if (!korpus) {
			return;
		}
		// <div> für Korpus
		let div = document.createElement("div");
		cont.appendChild(div);
		div.classList.add("liste-kr", "liste-label");
		// Label erstellen
		let span = document.createElement("span");
		div.appendChild(span);
		span.classList.add("liste-label");
		span.textContent = "Korpus";
		// Absatz erzeugen
		let p = document.createElement("p");
		p.innerHTML = liste.suchtreffer(korpus, "kr");
		div.appendChild(p);
	},
	// erstellt die Anzeige der Textsorte
	//   textsorte = String
	//     (der Volltext der Textsorte)
	//   cont = Element
	//     (das ist der aktuelle Detailblock)
	textsorteErstellen (textsorte, cont) {
		// eine Textsorte kann fehlen
		if (!textsorte) {
			return;
		}
		// <div> für Textsorte
		let div = document.createElement("div");
		cont.appendChild(div);
		div.classList.add("liste-ts", "liste-label");
		// Label erstellen
		let span = document.createElement("span");
		div.appendChild(span);
		span.classList.add("liste-label");
		span.textContent = "Textsorte";
		// Absätze erzeugen
		let p_prep = textsorte.split("\n");
		for (let i = 0, len = p_prep.length; i < len; i++) {
			let p = document.createElement("p");
			p.innerHTML = liste.suchtreffer(p_prep[i], "ts");
			div.appendChild(p);
		}
	},
	// erstellt die Anzeige der Notizen
	//   notizen = String
	//     (der Volltext der Notizen)
	//   cont = Element
	//     (das ist der aktuelle Detailblock)
	notizenErstellen (notizen, cont) {
		// Notizen können fehlen
		if (!notizen) {
			return;
		}
		// <div> für Notizen erzeugen und einhängen
		let div = document.createElement("div");
		div.classList.add("liste-no", "liste-label");
		cont.appendChild(div);
		// Label erstellen
		let span = document.createElement("span");
		span.classList.add("liste-label");
		span.textContent = "Notizen";
		div.appendChild(span);
		// Absätze erzeugen
		let prep = notizen.replace(/\n\s*\n/g, "\n"), // Leerzeilen löschen
			p_prep = prep.split("\n");
		for (let i = 0, len = p_prep.length; i < len; i++) {
			// Text aufbereiten
			let text = liste.linksErkennen(p_prep[i]);
			// neuen Absatz erzeugen
			let p = document.createElement("p");
			p.innerHTML = liste.suchtreffer(text, "no");
			div.appendChild(p);
		}
	},
	// Leiste mit Meta-Informationen zu der Karte erstellen
	//   beleg = Object
	//     (Datenobjekt mit allen Werte der Karte, die dargestellt werden soll)
	//   cont = Element
	//     (an dieses Element soll der Container gehängt werden)
	//   klasse = String
	//     (class des Elements, an das die Icons gehängt werden;
	//     entweder "liste-meta" oder "")
	metainfosErstellen (beleg, cont, klasse) {
		// Gibt es überhaupt Meta-Infos, die angezeigt werden müssen
		if (!beleg.un && !beleg.ko && !beleg.bu && !beleg.bc && !beleg.be && !beleg.an.length) {
			return;
		}
		// es gibt also Infos
		let div = document.createElement("div");
		if (klasse) {
			div.classList.add(klasse);
		}
		cont.appendChild(div);
		// Karte unvollständig?
		if (beleg.un) {
			let img = document.createElement("img");
			img.src = "img/liste-unvollstaendig.svg";
			img.width = "24";
			img.height = "24";
			img.title = "unvollständig";
			div.appendChild(img);
		}
		// Kontext unklar?
		if (beleg.ko) {
			let img = document.createElement("img");
			img.src = "img/liste-kontext.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Kontext?";
			div.appendChild(img);
		}
		// Bücherdienstauftrag?
		if (beleg.bu) {
			let img = document.createElement("img");
			img.src = "img/liste-buecherdienst.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Bücherdienst";
			div.appendChild(img);
		}
		// Buchung?
		if (beleg.bc) {
			let img = document.createElement("img");
			img.src = "img/liste-buchung.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Buchung";
			div.appendChild(img);
		}
		// Markierung?
		if (beleg.be) {
			let cont_span = document.createElement("span");
			cont_span.title = "Markierung";
			div.appendChild(cont_span);
			for (let i = 0; i < beleg.be; i++) {
				let span = document.createElement("span");
				span.classList.add("liste-stern", "icon-stern");
				span.textContent = " ";
				cont_span.appendChild(span);
			}
		}
		// Anhänge?
		if (beleg.an.length && klasse) {
			let cont_span = document.createElement("span");
			anhaenge.scan(beleg.an);
			anhaenge.makeIconList(beleg.an, cont_span);
			div.appendChild(cont_span);
		}
	},
	// Text-Links erkennen und in echte HTML-Links umwandeln
	//   text = String
	//     (Plain-Text, in dem die Links umgewandelt werden sollen)
	linksErkennen (text) {
		text = text.replace(/http(s)*:[^\s]+|www\.[^\s]+/g, function(m) {
			let reg = /[.:,;!?)\]}]+$/g,
				url = m.replace(reg, ""),
				basis = m.match(/(https*:\/\/)*([^\/]+)/)[2].replace(reg, ""),
				schluss = "";
			if (m.match(reg)) {
				schluss = m.replace(/.+?([.:,;!?)\]}]+)$/g, function(m, p) {
					return p;
				});
			}
			return `<a href="${url}" title="${url}" class="link">${basis}</a>${schluss}`;
		});
		return text;
	},
	// Links in einem externen Browser-Fenster öffnen
	//   link = Element
	//     (der Link, auf den geklickt wurde)
	linksOeffnen (link) {
		link.addEventListener("click", function(evt) {
			evt.preventDefault();
			let url = this.title;
			// URL ggf. aufbereiten
			if (!/^http/.test(url)) {
				url = `https://${url}`;
			}
			// URL im Browser öffnen
			const {shell} = require("electron");
			shell.openExternal(url);
		});
	},
	// Klick-Event zum Öffnen des Karteikarten-Formulars
	//   a = Element
	//     (Icon-Link, über den das Formular geöffnet werden kann)
	formularOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			beleg.oeffnen(parseInt(this.parentNode.dataset.id, 10));
		});
	},
	// Passt die Anzeige der Details im geöffneten Beleg an
	//   scroll_back = Boolean
	//     (beim Neuaufbau der Liste darf die Position nicht gemerkt werden)
	detailsAnzeigen (scroll_bak) {
		if (scroll_bak) {
			liste.statusScrollBak();
		}
		let funktionen = ["bd", "qu", "kr", "ts", "no", "meta"];
		for (let i = 0, len = funktionen.length; i < len; i++) {
			let opt = `detail_${funktionen[i]}`,
				ele = document.querySelectorAll(`.liste-${funktionen[i]}`);
			for (let j = 0, len = ele.length; j < len; j++) {
				if (optionen.data.belegliste[opt]) {
					ele[j].classList.remove("aus");
				} else {
					ele[j].classList.add("aus");
				}
			}
		}
		if (scroll_bak) {
			liste.statusScrollReset();
		}
	},
	// Detail auf Klick anzeigen (wird derzeit nur für das Datum benutzt)
	//   span = Element
	//     (<span>, in dem das Detail steht)
	detailAnzeigen (span) {
		span.addEventListener("click", function(evt) {
			evt.stopPropagation();
			let detail = this.title,
				beleg_id = this.parentNode.dataset.id;
			dialog.oeffnen("alert", null);
			dialog.text(`<h3>${liste.detailAnzeigenH3(beleg_id)}</h3>\n${detail}`);
		});
	},
	// Text der Überschrift für die Detailanzeige erstellen
	// (die Funktion brauch ich auch in anhaenge.js und drucken.js, darum ausgelagert)
	//   beleg_id = String || Object
	//     (ID des Belegs; soll die aktuelle Karteikarte gedruckt werden ist es ein Object)
	detailAnzeigenH3 (beleg_id) {
		let obj = {},
			nr = beleg_id;
		if (helfer.checkType("String", beleg_id)) {
			obj = data.ka[beleg_id];
		} else { // falls die aktuelle Karteikarte als Objekt übergeben wird
			obj = beleg_id;
			nr = beleg.id_karte;
		}
		let text = `Beleg #${nr}`,
			text_detail = [];
		if (obj.au) {
			let autor = obj.au.split(",")[0];
			text_detail.push(autor);
		}
		if (obj.da && /[0-9]{4}|[0-9]{2}\.\sJh\./.test(obj.da)) { // in neuen Karten kann das Datumsfeld noch fehlen oder inkorrekt sein
			text_detail.push(liste.zeitschnittErmitteln(obj.da).datum);
		}
		if (text_detail.length) {
			text += ` (${text_detail.join(" ")})`;
		}
		return text;
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
			} else if (/^zeitschnitte/.test(funktion)) {
				liste.headerZeitschnitte(funktion);
			} else if (funktion === "beleg") {
				liste.headerBeleg();
			} else if (funktion === "kuerzen") {
				liste.headerBelegKuerzen();
			} else if (funktion === "hervorheben") {
				liste.headerWortHervorheben();
			} else if (funktion === "trennung") {
				liste.headerTrennung();
			} else if (/^(bd|qu|ts|no|meta)$/.test(funktion)) {
				liste.headerDetails(funktion);
			}
		});
	},
	// Filter ein- bzw. ausblenden
	headerFilter () {
		// Option ändern
		optionen.data.belegliste.filterleiste = !optionen.data.belegliste.filterleiste;
		optionen.speichern(false);
		// Anzeige anpassen
		liste.headerFilterAnzeige(true);
	},
	// Filter ein- bzw. ausblenden (Anzeige der Filterleiste und des Links im Header anpassen)
	headerFilterAnzeige (scroll_bak) {
		// Scroll-Status speichern
		if (scroll_bak) {
			liste.statusScrollBak();
		}
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
		// Scroll-Status wiederherstellen
		if (scroll_bak) {
			setTimeout(() => liste.statusScrollReset(), 500);
		}
	},
	// chronologisches Sortieren der Belege
	headerSortieren () {
		// Option ändern
		optionen.data.belegliste.sort_aufwaerts = !optionen.data.belegliste.sort_aufwaerts;
		optionen.speichern(false);
		// Link anpassen
		liste.headerSortierenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
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
		if (/[0-9]+$/.test(funktion)) {
			optionen.data.belegliste.zeitschnitte = funktion.match(/[0-9]+$/)[0];
		} else {
			optionen.data.belegliste.zeitschnitte = "-";
		}
		optionen.speichern(false);
		// Anzeige der Links im Listenheader anpassen
		liste.headerZeitschnitteAnzeige();
		// Anzeige der Zeitschnitte in der Liste anpassen
		liste.zeitschnitteAnpassen(true);
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
	// Anzeige des kompletten Belegs umstellen
	headerBeleg () {
		// Variable umstellen
		optionen.data.belegliste.beleg = !optionen.data.belegliste.beleg;
		optionen.speichern(false);
		// Link im Header anpassen
		liste.headerBelegAnzeige();
		// Anzeige der Belege anpassen
		let beleg = document.querySelectorAll("#liste-belege-cont .liste-details");
		for (let i = 0, len = beleg.length; i < len; i++) {
			let kopf = beleg[i].previousSibling;
			if (optionen.data.belegliste.beleg) {
				beleg[i].classList.remove("aus");
				kopf.classList.add("schnitt-offen");
			} else {
				beleg[i].classList.add("aus");
				kopf.classList.remove("schnitt-offen");
			}
		}
	},
	// Anzeige des kompletten Belegs umstellen (Anzeige im Header anpassen)
	headerBelegAnzeige () {
		let link = document.getElementById("liste-link-beleg");
		if (optionen.data.belegliste.beleg) {
			link.classList.add("aktiv");
			link.title = "Komplettanzeige des Belegs ausblenden";
		} else {
			link.classList.remove("aktiv");
			link.title = "Komplettanzeige des Belegs einblenden";
		}
	},
	// Kürzung des Belegs aus-/einschalten
	headerBelegKuerzen () {
		// Kürzung umstellen
		optionen.data.belegliste.beleg_kuerzen = !optionen.data.belegliste.beleg_kuerzen;
		optionen.speichern(false);
		// Link anpassen
		liste.headerBelegKuerzenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Kürzung des Belegs aus-/einschalten (Anzeige im Header anpassen)
	headerBelegKuerzenAnzeige () {
		let link = document.getElementById("liste-link-kuerzen");
		if (optionen.data.belegliste.beleg_kuerzen) {
			link.classList.add("aktiv");
			link.title = "Belegkontext anzeigen";
		} else {
			link.classList.remove("aktiv");
			link.title = "Belegkontext kürzen";
		}
	},
	// Silbentrennung im Beleg aus-/einschalten
	headerTrennung () {
		// Hervorhebung umstellen
		optionen.data.belegliste.trennung = !optionen.data.belegliste.trennung;
		optionen.speichern(false);
		// Link anpassen
		liste.headerTrennungAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Silbentrennung im Beleg aus-/einschalten (Anzeige im Header anpassen)
	headerTrennungAnzeige () {
		let link = document.getElementById("liste-link-trennung");
		if (optionen.data.belegliste.trennung) {
			link.classList.add("aktiv");
			link.title = "Silbentrennung nicht anzeigen";
		} else {
			link.classList.remove("aktiv");
			link.title = "Silbentrennung anzeigen";
		}
	},
	// Hervorhebung des Worts im Beleg und der Vorschau aus-/einschalten
	headerWortHervorheben () {
		// Hervorhebung umstellen
		optionen.data.belegliste.wort_hervorheben = !optionen.data.belegliste.wort_hervorheben;
		optionen.speichern(false);
		// Link anpassen
		liste.headerWortHervorhebenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Hervorhebung des Worts im Beleg und der Vorschau aus-/einschalten (Anzeige im Header anpassen)
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
	// Steuerung der Detailanzeige ändern
	//   funktion = String
	//     (verweist auf den Link, der geklickt wurde)
	headerDetails (funktion) {
		// Einstellung umstellen und speichern
		let opt = `detail_${funktion}`;
		optionen.data.belegliste[opt] = !optionen.data.belegliste[opt];
		if (funktion === "qu") {
			optionen.data.belegliste.detail_kr = optionen.data.belegliste.detail_qu;
		}
		optionen.speichern(false);
		// Anzeige der Icons auffrischen
		liste.headerDetailsAnzeige(funktion, opt);
		// Anzeige der Details in der Liste auffrischen
		liste.detailsAnzeigen(true);
	},
	// Links zur Steuerung der Detailanzeige visuell anpassen
	//   funktion = String
	//     (verweist auf den Link, der geklickt wurde)
	//   opt = String
	//     (Name der Option, die betroffen ist)
	headerDetailsAnzeige (funktion, opt) {
		let title = {
			bd: "Bedeutung",
			qu: "Quelle",
			ts: "Textsorte",
			no: "Notizen",
			meta: "Metainfos",
		};
		let link = document.getElementById(`liste-link-${funktion}`);
		if (optionen.data.belegliste[opt]) {
			link.classList.add("aktiv");
			link.title = `${title[funktion]} ausblenden`;
		} else {
			link.classList.remove("aktiv");
			link.title = `${title[funktion]} einblenden`;
		}
	},
	// Datenfeld durch Klick auf ein Icon kopieren
	kopieren (icon) {
		icon.addEventListener("click", function(evt) {
			evt.preventDefault();
			let ds = this.dataset.ds.split("|"),
				text = data.ka[ds[0]][ds[1]];
			beleg.toolsKopierenExec(ds[1], data.ka[ds[0]], text, this);
		});
	},
};
