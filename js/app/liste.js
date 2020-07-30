"use strict";

let liste = {
	// zur Belegliste wechseln (von wo auch immer)
	wechseln () {
		helfer.hauptfunktion = "liste";
		overlay.alleSchliessen();
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
	// Zwischenspeicher für die aufgeklappten Belege
	statusOffen: {},
	// speichert den Status der aktuellen Belegliste, d.h. ob die Karten auf oder zugeklappt sind
	//   filter_init = Boolean
	//     (speichert, ob die Filterliste initialisiert werden sollen)
	status (filter_init) {
		// Klapp-Status sichern
		liste.statusOffen = {};
		let koepfe = document.querySelectorAll(".liste-kopf");
		for (let i = 0, len = koepfe.length; i < len; i++) {
			let id = koepfe[i].dataset.id;
			if (koepfe[i].classList.contains("schnitt-offen")) {
				liste.statusOffen[id] = true;
			} else {
				liste.statusOffen[id] = false;
			}
		}
		// ggf. den gerade erst erstellten Beleg als offenen Beleg hinzufügen
		if (liste.statusNeu) {
			liste.statusOffen[liste.statusNeu] = true;
		}
		// Scroll-Status speichern
		liste.statusScrollBak();
		// Liste aufbauen
		liste.aufbauen(filter_init);
		// Scroll-Status wiederherstellen
		liste.statusScrollReset();
		// ggf. den neuen Beleg visuell hervorheben
		if (liste.statusNeu) {
			// neuen Beleg markieren
			let beleg_unsichtbar = markBelegsuche(liste.statusNeu);
			// neuer Beleg könnte aufgrund der Filter versteckt sein
			if (beleg_unsichtbar && !optionen.data.einstellungen["nicht-karte-gefiltert"]) {
				dialog.oeffnen({
					typ: "alert",
					text: "Der Beleg wurde angelegt.\nWegen der aktuellen Filterregeln erscheint er jedoch nicht in der Belegliste.",
				});
				document.getElementById("dialog-text").appendChild(optionen.shortcut("Meldung nicht mehr anzeigen", "nicht-karte-gefiltert"));
			} else if (!beleg_unsichtbar) { // zum Beleg scrollen
				let id = liste.statusNeu; // wird unten geleert, darum hier zwischenspeichern
				setTimeout(function() {
					let scroll = document.querySelector(`.liste-kopf[data-id="${id}"]`).offsetTop - 34; // 34 = Höhe des Listen-Headers
					window.scrollTo({
						left: 0,
						top: scroll,
						behavior: "auto",
					});
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
			setTimeout(() => kopf.classList.remove("hinweis-beleg"), 1000);
		}
	},
	// Zwischenspeicher für den ermittelten Scroll-Status
	statusScroll: {},
	// Scroll-Status ermitteln
	statusScrollBak () {
		liste.statusScroll = {
			id: "",
			scroll: 0,
		};
		// keine Belege offen => keinen Scroll-Status ermitteln
		if (!document.querySelector("#liste-belege-cont .schnitt-offen")) {
			return;
		}
		// es sind Belege offen => Scroll-Status ermitteln
		let header = document.querySelector("#liste-belege header").offsetHeight,
			win = window.scrollY,
			koepfe = document.querySelectorAll(".liste-kopf");
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
			window.scrollTo({
				left: 0,
				top: kopf.offsetTop - liste.statusScroll.scroll - header,
				behavior: "auto",
			});
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
				div.dataset.id = id;
				// Kopficons einfügen
				for (let i = 0; i < 2; i++) {
					let a = document.createElement("a");
					div.appendChild(a);
					a.href = "#";
					a.classList.add("liste-kopficon", "icon-link");
					a.textContent = " ";
					if (i === 0) { // Beleg kopieren
						a.classList.add("icon-kopieren");
						if (!kopieren.an) {
							a.classList.add("aus");
						}
						a.title = "Beleg kopieren";
						kopieren.addListe(a);
					} else { // Beleg bearbeiten
						a.classList.add("icon-bearbeiten");
						a.title = "Beleg bearbeiten";
						liste.formularOeffnen(a);
					}
				}
				// Belegreferenz
				if (optionen.data.einstellungen["belegliste-referenz"]) {
					let span = document.createElement("span");
					span.classList.add("liste-referenz");
					span.textContent = xml.belegId({data: data.ka[id], id});
					div.appendChild(span);
				}
				// Jahr
				let span = document.createElement("span");
				span.classList.add("liste-jahr");
				span.innerHTML = liste.suchtreffer(zeitschnitt_akt.datum, "da", id);
				if (zeitschnitt_akt.datum !== data.ka[id].da) {
					span.title = data.ka[id].da;
					span.classList.add("liste-jahr-hinweis");
					liste.detailAnzeigen(span);
				}
				div.appendChild(span);
				// Belegvorschau
				div.appendChild(liste.belegVorschau(data.ka[id], id));
				// <div> für Belegkopf einhängen
				cont.appendChild(div);
				liste.belegUmschalten(div);
				// <div> für die Detail-Ansicht erzeugen
				if (filter.volltextSuche.suche ||
						optionen.data.belegliste.beleg && (typeof liste.statusOffen[id] === "undefined" || liste.statusOffen[id]) ||
						!optionen.data.belegliste.beleg && liste.statusOffen[id]) {
					if (liste.aufbauenDetailsBeiSuche(id)) {
						div.classList.add("schnitt-offen");
						liste.aufbauenDetails({
							id: id,
						});
					}
				}
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
		// Anzeige, dass kein Beleg vorhanden ist, ggf. ausblenden
		liste.zeitschnitteKeineBelege();
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
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
		if (filter_init) {
			if (optionen.data.filter.reduzieren) {
				// Hier muss das Aufbauen der Filter unbedingt zweimal gemacht werden!
				// (Wenn sich die Filter durch die Bearbeitung der Karteikarte ändern, kann es sonst
				// passieren, dass kein Filter aktiv ist, aber trotzdem alle Belege herausgefiltert
				// wurden. Kein aktiver Filter, trotzdem keine Belege. Das wäre nicht gut!)
				filter.aufbauen([...belege]);
				belege = filter.kartenFiltern(belege);
				filter.aufbauen([...belege]);
			} else {
				// Wichtig: Erst Filter aufbauen, dann Belege filtern!
				// (Wenn sich die Filter durch die Bearbeitung der Karteikarte ändern, kann es sonst
				// passieren, dass noch Filter aktiv sind, die längst nicht mehr existieren.)
				filter.aufbauen([...belege]);
				belege = filter.kartenFiltern(belege);
			}
		} else {
			belege = filter.kartenFiltern(belege);
		}
		// Belegzahl anzeigen
		liste.aufbauenAnzahl(belege_anzahl, belege.length);
		// Belege zurückgeben
		return belege;
	},
	// In der Kartei sind keine Belege (mehr) und das sollte auch gezeigt werden.
	aufbauenKeineBelege () {
		let cont = document.getElementById("liste-belege-cont"),
			div = document.createElement("div");
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
	// Detailblock aufbauen
	//   id = Number
	//     (ID der Karteikarte)
	//   folgekopf = Element || undefined
	//     (der Belegkopf, der dem mit der übergebenen ID folgt)
	//   einblenden = true || undefined
	//     (die Detailansicht soll eingeblendet werden)
	aufbauenDetails ({id, folgekopf, einblenden = false}) {
		// Detailblock aufbauen
		let div = document.createElement("div");
		div.classList.add("liste-details");
		if (!folgekopf) {
			folgekopf = document.querySelector(`.liste-kopf[data-id="${id}"]`).nextSibling;
		}
		if (!folgekopf) { // Detailblock muss am Ende der Liste eingehängt werden
			document.getElementById("liste-belege-cont").appendChild(div);
		} else {
			folgekopf.parentNode.insertBefore(div, folgekopf);
		}
		// Beleg
		div.appendChild(liste.belegErstellen(id));
		// Bedeutung
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_bd ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("bd")) {
			liste.detailErstellen({
				cont: div,
				ds: "bd",
				h: "Bedeutung",
				text: data.ka[id].bd,
				id,
			});
		}
		// Wortbildung
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_bl ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("bl")) {
			liste.detailErstellen({
				cont: div,
				ds: "bl",
				h: "Wortbildung",
				text: data.ka[id].bl,
				id,
			});
		}
		// Synonym
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_sy ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("sy")) {
			liste.detailErstellen({
				cont: div,
				ds: "sy",
				h: "Synonym",
				text: data.ka[id].sy,
				id,
			});
		}
		// Quellenangabe
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_qu ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("qu")) {
			liste.detailErstellen({
				cont: div,
				ds: "qu",
				h: "Quelle",
				text: data.ka[id].qu,
				id,
				icon: true,
			});
		}
		// Korpus
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_kr ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("kr")) {
			liste.detailErstellen({
				cont: div,
				ds: "kr",
				h: "Korpus",
				text: data.ka[id].kr,
				id,
			});
		}
		// Textsorte
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_ts ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("ts")) {
			liste.detailErstellen({
				cont: div,
				ds: "ts",
				h: "Textsorte",
				text: data.ka[id].ts,
				id,
			});
		}
		// Notizen
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_no ||
				filter.volltextSuche.suche && filter.volltextSuche.ka[id].includes("no")) {
			liste.detailErstellen({
				cont: div,
				ds: "no",
				h: "Notizen",
				text: data.ka[id].no,
				id,
			});
		}
		// Meta-Infos
		if (!filter.volltextSuche.suche && optionen.data.belegliste.detail_meta) {
			liste.metainfosErstellen(data.ka[id], div, "liste-meta");
		}
		if (einblenden) {
			div.classList.add("blenden-prep");
			liste.belegUmschaltenZielhoehe = div.offsetHeight - 30; // 30px = padding-top + padding-bottom
			div.style.height = "0";
			div.style.paddingTop = "0";
			div.style.paddingBottom = "0";
		}
	},
	// ermittelt, ob die Detail-Anzeige wirklich aufgebaut werden soll (für den Fall einer Suche)
	//   id = String
	//     (die ID der Karteikarte, um die es geht)
	aufbauenDetailsBeiSuche (id) {
		if (!filter.volltextSuche.suche) {
			return true;
		}
		// ermitteln
		let felder = ["bs", "bd", "bl", "sy", "qu", "kr", "ts", "no"];
		for (let feld of felder) {
			if (filter.volltextSuche.ka[id].includes(feld)) {
				return true;
			}
		}
		return false;
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
		let datum = [];
		for (let i = 0; i < 2; i++) {
			const id = i === 0 ? a : b;
			// Sortierdatum im Zwischenspeicher?
			if (liste.belegeSortierenCache[id]) {
				datum[i] = liste.belegeSortierenCache[id];
				continue;
			}
			// Sortierdatum ermitteln
			datum[i] = helfer.datumGet({
				datum: data.ka[id].da,
				erstesDatum: true,
			}).sortier;
			// Sortierdatum zwischenspeichern
			liste.belegeSortierenCache[id] = datum[i];
		}
		// 1. Weg: Sortierung nach Datum (chronologisch auf- oder absteigend)
		let sortierung = [1, -1];
		if (optionen.data.belegliste.sort_aufwaerts) {
			sortierung.reverse();
		}
		if (datum[0] !== datum[1]) {
			datum.sort();
			if (datum[0] === liste.belegeSortierenCache[a]) {
				return sortierung[0];
			}
			return sortierung[1];
		}
		// 2. Weg: Sortierung nach Autor (alphabetisch auf- oder absteigend)
		let autor = [data.ka[a].au, data.ka[b].au];
		if (autor[0] !== autor[1]) {
			autor.sort(helfer.sortAlpha);
			if (autor[0] === data.ka[a].au) {
				return sortierung[0];
			}
			return sortierung[1];
		}
		// 3. Weg: Sortierung nach Belegnummer (auf- oder absteigend)
		if (optionen.data.belegliste.sort_aufwaerts) {
			return parseInt(a, 10) - parseInt(b, 10);
		} else {
			return parseInt(b, 10) - parseInt(a, 10);
		}
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
		// Suche ohne Treffer im Beleg
		if (filter.volltextSuche.suche &&
				!filter.volltextSuche.ka[id].includes("bs")) {
			let p = document.createElement("p");
			p.dataset.id = id;
			liste.belegAbsatzGekuerzt(p);
			div.appendChild(p);
			return div;
		}
		// Absätze erzeugen
		let prep = data.ka[id].bs.replace(/\n\s*\n/g, "\n"), // Leerzeilen löschen
			p_prep = prep.split("\n"),
			zuletzt_gekuerzt = false; // true, wenn der vorherige Absatz gekürzt wurde
		for (let i = 0, len = p_prep.length; i < len; i++) {
			let p = document.createElement("p");
			div.appendChild(p);
			p.dataset.pnumber = i;
			p.dataset.id = id;
			// Absatz ggf. kürzen
			if (filter.volltextSuche.suche) { // ggf. kürzen, wenn Suchtreffer nicht enthalten
				const text_rein = p_prep[i].replace(/<.+?>/g, "");
				let treffer = false;
				for (let j = 0, len = filter.volltextSuche.reg.length; j < len; j++) {
					if (text_rein.match(filter.volltextSuche.reg[j])) {
						treffer = true;
						break;
					}
				}
				if (!treffer) {
					if (zuletzt_gekuerzt) {
						div.removeChild(div.lastChild);
					} else {
						liste.belegAbsatzGekuerzt(p);
						zuletzt_gekuerzt = true;
					}
					continue;
				}
			} else if (optionen.data.belegliste.beleg_kuerzen &&
					!liste.wortVorhanden(p_prep[i]) &&
					!(filter.aktiveFilter["verschiedenes-annotierung"] && /annotierung-wort/.test(p_prep[i]) ) ) {
				// ggf. kürzen, wenn
				//   - Wort nicht enthalten
				//   - Annotierungsfilter aktiv und Annotierung nicht vorhanden
				if (zuletzt_gekuerzt) {
					div.removeChild(div.lastChild);
				} else {
					liste.belegAbsatzGekuerzt(p);
					zuletzt_gekuerzt = true;
				}
				continue;
			}
			zuletzt_gekuerzt = false;
			// ggf. Trennungszeichen entfernen
			p_prep[i] = liste.belegTrennungWeg(p_prep[i], false);
			// ggf. Wort hervorheben
			p_prep[i] = liste.belegWortHervorheben(p_prep[i], false);
			// ggf. Klammerungen markieren
			p_prep[i] = liste.belegKlammernHervorheben({text: p_prep[i]});
			// ggf. Suchtreffer hervorheben
			p.innerHTML = liste.suchtreffer(p_prep[i], "bs", id);
			// Absatz normal einhängen
			annotieren.init(p);
		}
		// <div> zurückgeben
		return div;
	},
	// gekürzte Absätze darstellen
	//   p = Element
	//     (der Absatz, der gekürzt dargestellt wird
	belegAbsatzGekuerzt (p) {
		// gekürzten Absatz aufbauen
		p.classList.add("gekuerzt");
		delete p.dataset.pnumber;
		p.appendChild(document.createTextNode("["));
		let span = document.createElement("span");
		span.classList.add("kuerzung");
		p.appendChild(span);
		span.textContent = "einblenden";
		p.appendChild(document.createTextNode("…]"));
		// gekürzten Absatz auf Klick erweitern
		liste.belegAbsatzEinblenden(p);
	},
	// hebt die Kürzung eines Absatzes auf Klick auf
	//   p = Element
	//     (der gekürzte Absatz)
	belegAbsatzEinblenden (p) {
		p.addEventListener("click", function() {
			// ermitteln, welcher Absatz eingeblendet werden könnte
			let k = kontext(this),
				n = -1;
			if (k.next >= 0 || k.prev >= 0) {
				n = k.next >= 0 ? k.next - 1 : k.prev + 1;
			}
			// ID, Absätze und Text ermitteln
			const id = this.dataset.id ? this.dataset.id : "";
			let absaetze = [],
				text = "";
			if (id) {
				absaetze = data.ka[id].bs.replace(/\n\s*\n/g, "\n").split("\n");
			} else {
				absaetze = beleg.data.bs.replace(/\n\s*\n/g, "\n").split("\n");
			}
			if (n === -1) {
				n = absaetze.length - 1;
			}
			text = absaetze[n];
			// neuen Absatz erzeugen
			let p = document.createElement("p");
			p.dataset.pnumber = n;
			p.dataset.id = id;
			if (id) {
				text = liste.belegTrennungWeg(text, false);
				text = liste.belegWortHervorheben(text, false);
				p.innerHTML = liste.belegKlammernHervorheben({text});
			} else {
				if (!optionen.data.beleg.trennung) {
					text = liste.belegTrennungWeg(text, true);
				}
				text = liste.belegWortHervorheben(text, true);
				p.innerHTML = liste.belegKlammernHervorheben({text});
			}
			annotieren.init(p);
			// neuen Absatz einhängen
			const after = k.next >= 0 || k.prev === -1 && k.next === -1 ? true : false;
			if (after) {
				this.parentNode.insertBefore(p, this.nextSibling);
			} else {
				this.parentNode.insertBefore(p, this);
			}
			// Einblenden animieren
			let height = p.offsetHeight;
			p.classList.add("einblenden");
			p.style.height = "24px"; // initial Höhe Standardzeile, damit es nicht so springt
			setTimeout(function() {
				p.style.height = `${height}px`;
				setTimeout(() => {
					// muss mit Timeout gemacht werden; denn "transitionend" wird nicht dispatched,
					// wenn der eingeblendete Text nur eine Zeile hoch ist
					p.classList.remove("einblenden");
					p.style.removeProperty("height");
				}, 300);
			}, 0);
			// gekürzten Absatz entfernen oder auffrischen
			k = kontext(this);
			if (after && k.next === 0 ||
					after && k.next - k.prev === 1 ||
					!after && k.prev === absaetze.length - 1) {
				this.parentNode.removeChild(this);
			}
			// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
			if (document.getElementById("suchleiste")) {
				suchleiste.suchen(true);
			}
			// Nummer des vorherigen und des nachfolgenden Absatzes ermitteln
			function kontext (pKurz) {
				let prev = pKurz.previousSibling,
					next = pKurz.nextSibling;
				let n = {
					prev: -1,
					next: -1,
				};
				if (prev && prev.dataset.pnumber) { // vor dem ersten Absatz könnte der Kopierlink stehen
					n.prev = parseInt(prev.dataset.pnumber, 10);
				}
				if (next) {
					n.next = parseInt(next.dataset.pnumber, 10);
				}
				return n;
			}
		});
	},
	// generiert den Vorschautext des übergebenen Belegs inkl. Autorname (wenn vorhanden)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	//   id = String
	//     (ID des aktuellen Belegs)
	belegVorschau (beleg_akt, id) {
		// Textausschnitt ermitteln
		// 1. Text basal aufbereiten
		let schnitt = beleg_akt.bs.replace(/\n+/g, " "); // Absätze könnten mit Leerzeile eingegeben sein
		schnitt = liste.belegTrennungWeg(schnitt, true); // Trennzeichen und Seitenumbrüche weg
		schnitt = liste.belegWortHervorheben(schnitt, true, true); // Wörter hervorheben (Nur-Markieren-Wörter ausschließen);
		// 2. alle Knoten durchgehen und allein die <mark> erhalten;
		// diese aber nur, wenn sie nicht transparent gesetzt wurden
		let div = document.createElement("div");
		div.innerHTML = schnitt;
		let snippet = "";
		for (let k of div.childNodes) {
			getText(k);
		}
		function getText (k) {
			if (k.nodeType === 1) {
				if (k.classList.contains("wort") && !k.closest(".farbe0")) {
					snippet += `<mark class="wort">${k.textContent}</mark>`;
					return;
				}
				for (let i of k.childNodes) {
					getText(i);
				}
			} else {
				snippet += k.textContent;
			}
		}
		// 3. Snippet vorne kürzen, wenn vor dem ersten <mark> viel Text kommt
		let reg = new RegExp("<mark", "g");
		if (reg.test(snippet) && reg.lastIndex - 5 > 35) {
			snippet = `…${snippet.substring(reg.lastIndex - 5 - 25)}`;
		}
		// 4. Text nach hinten heraus kürzen (deutlicher Performance-Schub!)
		if (snippet.length > 300) {
			snippet = `${snippet.substring(0, 280)}…`;
			// sollte der letzte <mark> beim Kürzen korrumpiert werden: Das ist kein
			// Problem, die Rendering-Engine fängt das ab (wurde getestet)
		}
		// 5. ggf. die Hervorhebungen alle entfernen
		if (!optionen.data.belegliste.wort_hervorheben) {
			snippet = snippet.replace(/<.+?>/g, "");
		}
		// Autor und weitere Details
		let frag = document.createDocumentFragment();
		if (beleg_akt.au) {
			let autor = helfer.escapeHtml(beleg_akt.au).split(/,(.+)/),
				autor_span = document.createElement("span");
			frag.appendChild(autor_span);
			autor_span.classList.add("liste-autor-details-block");
			autor_span.innerHTML = liste.suchtreffer(autor[0], "au", id);
			if (autor.length > 1) {
				let span = document.createElement("span");
				span.classList.add("liste-autor-detail");
				span.innerHTML = liste.suchtreffer(`,${autor[1]}`, "au", id);
				autor_span.appendChild(span);
			}
			liste.belegVorschauFelder(autor_span, beleg_akt, " ", "");
			autor_span.appendChild(document.createTextNode(": "));
		} else {
			liste.belegVorschauFelder(frag, beleg_akt, "", " ");
		}
		// Textschnitt in Anführungsstriche
		let q = document.createElement("q");
		q.innerHTML = snippet;
		frag.appendChild(q);
		// Fragment zurückgeben
		return frag;
	},
	// Textsorte/Notiz hinter Jahr bzw. Autorname in Vorschaukopf des Belegs einhängen
	//   ele = Element
	//     (hier wird die Textsorte angehängt)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	//   vor = String
	//     (Text vor der Textsorte)
	//   nach = String
	//     (Text nach der Textsorte)
	belegVorschauFelder (ele, beleg_akt, vor, nach) {
		// Gibt es überhaupt etwas einzutragen?
		let eintragen = {
			be: false,
			no: false,
			ts: false,
		};
		if (beleg_akt.be && optionen.data.einstellungen["belegliste-mark"]) {
			eintragen.be = true;
		}
		let notiz = beleg_akt.no.split(/\n/)[0];
		if (notiz && optionen.data.einstellungen["belegliste-notizen"]) {
			eintragen.no = true;
		}
		if (beleg_akt.ts && optionen.data.einstellungen.textsorte) {
			eintragen.ts = true;
		}
		if (!eintragen.be && !eintragen.no && !eintragen.ts) {
			return;
		}
		// Vorsatz
		ele.appendChild(document.createTextNode(`${vor}(`));
		// Markierung
		if (eintragen.be) {
			let span = document.createElement("span");
			span.classList.add("liste-mark");
			for (let i = 0; i < beleg_akt.be; i++) {
				let img = document.createElement("img");
				span.appendChild(img);
				img.src = "img/stern-gelb.svg";
				img.width = "24";
				img.height = "24";
			}
			ele.appendChild(span);
		}
		// Notiz
		if (eintragen.no) {
			let span = document.createElement("span");
			span.classList.add("liste-notiz");
			if (notiz.length > 35) {
				notiz = `${notiz.substring(0, 30)}…`;
			}
			span.textContent = notiz;
			ele.appendChild(span);
		}
		// Textsorte
		if (eintragen.ts) {
			let span = document.createElement("span");
			span.classList.add("liste-textsorte");
			span.textContent = beleg_akt.ts.split(":")[0];
			ele.appendChild(span);
		}
		// Nachsatz
		ele.appendChild(document.createTextNode(`)${nach}`));
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
		if (/\] \[:/.test(text)) { // Seitenumbruch, davor kürzbarer Trennstrich
			text = text.replace(/\] \[:/g, "][:");
		}
		return text.replace(/\[¬\]|\[:.+?:\]\s*/g, "");
	},
	// hebt ggf. die unterschiedlich eingeklammerten Textteile hervor,
	// die im Belegtext zu finden sind
	//   text = String
	//     (Belegtext, in dem die Klammern markiert werden sollen)
	belegKlammernHervorheben ({text}) {
		// DTA-Import: Anmerkungen werden an der Stelle, an der der Anker ist,
		// in eckigen Klammern nachgestellt. Schließende Klammer nicht hervorheben!
		// Das macht Probleme, wenn innerhalb der Anmerkung andere Klammern sind.
		text = text.replace(/\[Anmerkung:/g, `<span class="klammer-anmerkung">[Anmerkung:</span>`);
		// DTA-Import: Trenn- oder Bindestrich am Ende einer Zeile
		text = text.replace(/\[¬\]/g, m => {
			return `<span class="klammer-technisch">${m}</span>`;
		});
		// DTA-Import: Spalten- oder Seitenumbruch
		text = text.replace(/\[:(.+?):\]/g, (m, p1) => {
			return `<span class="klammer-technisch">[:${p1}:]</span>`;
		});
		// Autorenzusatz
		text = text.replace(/(?<!<span class="klammer-[a-z]+">)\{.*?\}/g, m => {
			return `<span class="klammer-autorenzusatz">${m}</span>`;
		});
		// Löschung
		text = text.replace(/(?<!<span class="klammer-[a-z]+">)\[{2}.+?\]{2}/g, m => {
			return `<span class="klammer-loeschung">${m}</span>`;
		});
		// Streichung
		text = text.replace(/(?<!<span class="klammer-[a-z]+">\[?)\[.+?\](?!<\/span>)/g, m => {
			return `<span class="klammer-streichung">${m}</span>`;
		});
		// Ergebnis zurückgeben
		return text;
	},
	// hebt ggf. das Wort der Kartei im übergebenen Text hervor
	//   schnitt = String
	//     (Text, in dem der Beleg hervorgehoben werden soll)
	//   immer = Boolean
	//     (das Wort soll immer hervorgehoben werden, egal was in der Option steht)
	//   keinNurMarkieren = true || undefined
	//     (Wörter, die nur markiert werden sollen, von der Hervorhebung ausschließen) 
	belegWortHervorheben (schnitt, immer, keinNurMarkieren = false) {
		// Wort soll nicht hervorgehoben werden
		if (!optionen.data.belegliste.wort_hervorheben && !immer) {
			return schnitt;
		}
		let farbe = 0,
			nebenlemma = false,
			nurMarkieren = false,
			regNoG = null;
		for (let i of helfer.formVariRegExpRegs) {
			if (keinNurMarkieren && data.fv[i.wort].ma && !data.fv[i.wort].nl) {
				continue;
			}
			farbe = data.fv[i.wort].fa;
			nebenlemma = data.fv[i.wort].nl;
			nurMarkieren = data.fv[i.wort].ma;
			let reg;
			if (!data.fv[i.wort].tr) {
				reg = new RegExp(`(?<vorWort>^|[${helfer.ganzesWortRegExp.links}])(?<wort>${i.reg})(?<nachWort>$|[${helfer.ganzesWortRegExp.rechts}])`, "gi");
				regNoG = new RegExp(`(?<vorWort>^|[${helfer.ganzesWortRegExp.links}])(?<wort>${i.reg})(?<nachWort>$|[${helfer.ganzesWortRegExp.rechts}])`, "i"); // wegen lastIndex
			} else {
				reg = new RegExp(`[^${helfer.ganzesWortRegExp.linksWort}]*(${i.reg})[^${helfer.ganzesWortRegExp.rechtsWort}]*`, "gi");
				regNoG = null;
			}
			schnitt = helfer.suchtrefferBereinigen(schnitt.replace(reg, setzenMark), "wort");
		}
		return schnitt;
		// Ersetzungsfunktion; vgl. suchleiste.suchen()
		function setzenMark (m) {
			let r = null;
			if (regNoG) {
				r = regNoG.exec(m);
				m = r.groups.wort;
			}
			if (/<.+?>/.test(m)) {
				m = m.replace(/<.+?>/g, function(m) {
					return `</mark>${m}<mark class="wort">`;
				});
			}
			// leere <mark> entfernen (kann passieren, wenn Tags verschachtelt sind)
			m = m.replace(/<mark class="wort"><\/mark>/g, "");
			// Rückgabewert zusammenbauen
			m = `<mark class="wort">${m}</mark>`;
			// alle <mark> ermitteln, die weder Anfang noch Ende sind
			const marks = m.match(/class="wort"/g).length;
			if (marks > 1) { // marks === 1 => der einzige <mark>-Tag ist Anfang und Ende zugleich
				let splitted = m.split(/class="wort"/);
				m = "";
				for (let i = 0, len = splitted.length; i < len; i++) {
					if (i === 0) {
						m += splitted[i] + `class="wort wort-kein-ende"`;
					} else if (i === len - 2) {
						m += splitted[i] + `class="wort wort-kein-start"`;
					} else if (i < len - 1) {
						m += splitted[i] + `class="wort wort-kein-start wort-kein-ende"`;
					} else {
						m += splitted[i];
					}
				}
			}
			// ggf. die Farbe eintragen
			if (farbe) {
				m = m.replace(/class="wort/g, `class="wort wortFarbe${farbe}`);
			}
			// als Neben- oder Hauptlemma markieren
			if (nebenlemma) {
				m = m.replace(/class="wort/g, `class="wort nebenlemma`);
			} else {
				m = m.replace(/class="wort/g, `class="wort hauptlemma`);
			}
			// ggf. die Markierungsinfo eintragen (wichtig für XML-Export)
			if (nurMarkieren) {
				m = m.replace(/class="wort/g, `class="wort markierung`);
			}
			// bei nicht trunkierter Markierung Zeichen links und rechts der Markierung ergänzen
			if (r) {
				return `${r.groups.vorWort}${m}${r.groups.nachWort}`;
			}
			// aufbereiteten Match auswerfen
			return m;
		}
	},
	// überprüft, ob das Karteiwort in dem übergebenen Text steht
	//   text = String
	//     (Text, der auf die Existenz des Karteiworts überprüft werden soll)
	wortVorhanden (text) {
		// temporäres Element mit hervorgehobenen Karteiwörtern erzeugen
		let div = document.createElement("div");
		div.innerHTML = liste.belegWortHervorheben(text, true);
		// Test 1: Kommt überhaupt ein Karteiwort im Text vor?
		if (!div.querySelector(".wort")) {
			return false;
		}
		// Test 2: Sind evtl. alle Treffer des Karteiworts als falschpositive markiert?
		let marks = div.querySelectorAll(".wort:not(.wort-kein-start)"),
			transparent = 0;
		for (let m of marks) {
			if (m.closest(".farbe0")) {
				// Test ist nur problematisch, wenn ein Karteiwort in eine Textmarkierung eingeschlossen ist, deren Hintergrundfarbe transparent gesetzt wurde; nur: Wer macht sowas?
				transparent++;
			}
		}
		if (marks.length === transparent) {
			return false;
		}
		// Test 3: Ist das Karteiwort mehrgliedrig?
		if (helfer.formVariRegExpRegs.length === 1) {
			if (data.fv[helfer.formVariRegExpRegs[0].wort].ma) {
				return false; // nicht okay (das Wort soll nur markiert, aber nicht berücksichtigt werden)
			}
			return true; // alles okay (das Wort taucht auf und soll berücksichtigt werden)
		}
		// Test 4: Enthält der Absatz ein Nebenlemma?
		if (div.querySelector(".nebenlemma")) {
			return true; // Absätze mit min. einem Nebenlemma immer anzeigen
		}
		// Test 5: Sollen hier überhaupt Wörter berücksichtigt werden?
		let woerter = [];
		for (let i of helfer.formVariRegExpRegs) {
			if (data.fv[i.wort].ma || data.fv[i.wort].nl) {
				woerter.push(true);
			} else {
				woerter.push(false);
			}
		}
		if (woerter.every(i => i === true)) {
			return false; // keine Wörter zu berücksichtigen
		}
		// Test 6: Tauchen alle Wörter eines mehrgliedrigen Karteiworts auf?
		let alleMarks = div.querySelectorAll(".wort.hauptlemma");
		for (let i = 0, len = alleMarks.length; i < len; i++) {
			let treffer = alleMarks[i].textContent;
			if (alleMarks[i].classList.contains("wort-kein-ende")) {
				do {
					i++;
					treffer += alleMarks[i].textContent;
				} while (i < len - 1 && alleMarks[i].classList.contains("wort-kein-ende"));
			}
			for (let j = 0, len = helfer.formVariRegExpRegs.length; j < len; j++) {
				let formVari = helfer.formVariRegExpRegs[j],
					reg;
				if (data.fv[formVari.wort].ma || data.fv[formVari.wort].nl) {
					// ma: Wort nur markieren, sonst nicht berücksichtigen
					// nl: Nebenlemmata für diese Operation nicht berücksichtigen
					continue;
				}
				if (!data.fv[formVari.wort].tr) { // nicht trunkiert
					reg = new RegExp(`(^|[${helfer.ganzesWortRegExp.links}])(${formVari.reg})($|[${helfer.ganzesWortRegExp.rechts}])`, "i");
				} else { // trunkiert
					reg = new RegExp(formVari.reg, "i");
				}
				if (reg.test(treffer)) {
					woerter[j] = true;
				}
			}
			if (!woerter.includes(false)) {
				return true; // es wurden alle Karteiwörter gefunden (hier testen, um unnötige Durchläufe zu sparen)
			}
		}
		return false; // manche Karteiwörter wurden nicht gefunden
	},
	// Suchtreffer hervorheben
	//   text = String
	//     (der Text, in dem die Ersetzung vorgenommen werden soll)
	//   ds = String
	//     (der Datensatz, aus dem der Text stammt, also "bs", "da", "au" usw.)
	//   id = String
	//     (ID des Belegs, in dem der Suchtreffer hervorgehoben werden soll)
	suchtreffer (text, ds, id) {
		// keine Suche oder keine Suche im aktuellen Datensatz
		if (!filter.volltextSuche.suche ||
				!filter.volltextSuche.ka[id].includes(ds)) {
			return text;
		}
		// Suchtreffer hervorheben
		let treffer;
		filter.volltextSuche.reg.forEach(function(i) {
			treffer = i.exec(text);
			text = text.replace(i, setzenMark);
		});
		// Treffer innerhalb von Tags löschen
		text = helfer.suchtrefferBereinigen(text);
		// Text zurückgeben
		return text;
		// Ersetzungsfunktion (vgl. suchleiste.suchen())
		function setzenMark (m) {
			if (treffer.groups) {
				m = treffer.groups.wort;
			}
			if (/<.+?>/.test(m)) {
				m = m.replace(/<.+?>/g, function(m) {
					return `</mark>${m}<mark class="suche">`;
				});
			}
			// leere <mark> entfernen (kann passieren, wenn Tags verschachtelt sind)
			m = m.replace(/<mark class="suche"><\/mark>/g, "");
			// Rückgabewert zusammenbauen
			m = `<mark class="suche">${m}</mark>`;
			// alle <mark> ermitteln, die weder Anfang noch Ende sind
			const marks = m.match(/class="suche"/g).length;
			if (marks > 1) { // marks === 1 => der einzige <mark>-Tag ist Anfang und Ende zugleich
				let splitted = m.split(/class="suche"/);
				m = "";
				for (let i = 0, len = splitted.length; i < len; i++) {
					if (i === 0) {
						m += splitted[i] + `class="suche suche-kein-ende"`;
					} else if (i === len - 2) {
						m += splitted[i] + `class="suche suche-kein-start"`;
					} else if (i < len - 1) {
						m += splitted[i] + `class="suche suche-kein-start suche-kein-ende"`;
					} else {
						m += splitted[i];
					}
				}
			}
			// aufbereiteten Match auswerfen
			if (treffer.groups) {
				return `${treffer.groups.vor}${m}${treffer.groups.nach}`;
			}
			return m;
		}
	},
	// Timeout für das Aus- bzw. Einblenden der Detailansicht
	belegUmschaltenTimeout: null,
	// speichert die Zielhöhe des Detail-Containers für das Einblenden
	belegUmschaltenZielhoehe: -1,
	// Details zu einem einzelnen Beleg durch Klick auf den Belegkopf ein- oder ausblenden
	//   div = Element
	//     (der Belegkopf, auf den geklickt werden kann)
	belegUmschalten (div) {
		div.addEventListener("click", function() {
			if (this.classList.contains("schnitt-offen")) {
				this.classList.remove("schnitt-offen");
				// Ausblenden animieren
				let details = this.nextSibling;
				if (details.querySelector("#annotierung-wort")) {
					annotieren.modSchliessen();
				}
				details.classList.add("blenden", "blenden-prep");
				details.style.height = `${details.offsetHeight - 30}px`; // 30px = padding-top + padding-bottom
				setTimeout(function() {
					details.style.height = "0px";
					details.style.paddingTop = "0px";
					details.style.paddingBottom = "0px";
					clearTimeout(liste.belegUmschaltenTimeout);
					liste.belegUmschaltenTimeout = setTimeout(() => details.parentNode.removeChild(details), 300);
				}, 0);
			} else {
				this.classList.add("schnitt-offen");
				liste.aufbauenDetails({
					id: this.dataset.id,
					einblenden: true,
				});
				// Einblenden animieren
				let details = this.nextSibling;
				setTimeout(function() {
					details.classList.add("blenden");
					details.style.height = `${liste.belegUmschaltenZielhoehe}px`;
					details.style.removeProperty("padding-top");
					details.style.removeProperty("padding-bottom");
					clearTimeout(liste.belegUmschaltenTimeout);
					liste.belegUmschaltenTimeout = setTimeout(() => {
						details.style.removeProperty("height");
						details.classList.remove("blenden", "blenden-prep");
					}, 300);
				}, 0);
			}
			// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
			if (document.getElementById("suchleiste")) {
				suchleiste.suchen(true);
			}
		});
	},
	// generische Funktion für das Erstellen eines Beleg-Details
	//   config = Object
	//     Enthält folgende Eigenschaften:
	//        cont: Element (das ist der aktuelle Detailblock)
	//        ds:   String  (Schlüssel des Datensatzes)
	//        h:    String  (die Überschrift des Datenfelds)
	//        id:   String  (ID der Karteikarte)
	//        text: String  (vollständiger Text des Datenfelds)
	//              Array   (bei Bedeutungen)
	//        icon: Boolean (Kopierlink soll erzeugt werden)
	detailErstellen ({cont, ds, h, text, id, icon = false}) {
		// Datenfeld kann leer sein
		if (!text || ds === "bd" && !text.length) {
			return;
		}
		// Sonderbehandlung Bedeutungen
		if (ds === "bd") {
			let textTmp = liste.textBd(text);
			if (!textTmp.length) { // im aktuellen Gerüst könnten keine passenden Bedeutungen sein
				return;
			}
			text = textTmp.join("\n");
		}
		// <div> für Datenfeld erzeugen
		let div = document.createElement("div");
		cont.appendChild(div);
		div.classList.add(`liste-${ds}`, "liste-label");
		// ggf. Kopierlink erzeugen
		if (icon) {
			let a = document.createElement("a");
			div.appendChild(a);
			a.classList.add("icon-link", "icon-tools-kopieren");
			a.dataset.ds = `${id}|${ds}`;
			liste.kopieren(a);
		}
		// Label erzeugen
		let span = document.createElement("span");
		div.appendChild(span);
		span.classList.add("liste-label");
		if (ds === "bd") {
			const details = bedeutungen.aufbauenH2Details(data.bd, true);
			if (details) {
				h += details;
			}
			bedeutungenGeruest.listener(span);
		}
		span.textContent = h;
		// Sonderzeichen escapen
		if (ds !== "bd" && ds !== "bs") {
			text = helfer.escapeHtml(text);
		}
		// Leerzeilen weg und Links erkennen (nur Notiz und Quelle)
		if (/^(no|qu)$/.test(ds)) {
			text = text.replace(/\n\s*\n/g, "\n");
			text = liste.linksErkennen(text);
		}
		// Absätze erzeugen
		for (let absatz of text.split("\n")) {
			if (!absatz) {
				// die erste Zeile der Notizen könnte leer sein;
				// hierfür keinen Absatz erzeugen
				continue;
			}
			let p = document.createElement("p");
			div.appendChild(p);
			p.innerHTML = liste.suchtreffer(absatz, ds, id);
		}
		// Klick-Events an Links hängen
		for (let link of div.querySelectorAll(".link")) {
			helfer.externeLinks(link);
		}
	},
	// Text aller Bedeutungen in ein Array schreiben
	//   bd = Array
	//     (Bedeutungen, wie sie in den Karteikarten stehen; d.h. Array mit Objects in den Slots)
	textBd (bd) {
		let arr = [];
		for (let i = 0, len = bd.length; i < len; i++) {
			if (bd[i].gr !== data.bd.gn) { // nur Bedeutungen des aktuellen Gerüsts anzeigen
				continue;
			}
			arr.push(bedeutungen.bedeutungenTief({
				gr: bd[i].gr,
				id: bd[i].id,
			}));
		}
		return arr;
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
		if (!beleg.un && !beleg.ko && !beleg.bu && !beleg.bc && !beleg.mt && !beleg.be && !beleg.an.length) {
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
			img.src = "img/kreis-unvollstaendig.svg";
			img.width = "24";
			img.height = "24";
			img.title = "unvollständig";
			div.appendChild(img);
		}
		// Kontext unklar?
		if (beleg.ko) {
			let img = document.createElement("img");
			img.src = "img/kontext.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Kontext?";
			div.appendChild(img);
		}
		// Bücherdienstauftrag?
		if (beleg.bu) {
			let img = document.createElement("img");
			img.src = "img/buch.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Bücherdienst";
			div.appendChild(img);
		}
		// Buchung?
		if (beleg.bc) {
			let img = document.createElement("img");
			img.src = "img/buch-check-gruen.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Buchung";
			div.appendChild(img);
		}
		// Metatext?
		if (beleg.mt) {
			let img = document.createElement("img");
			img.src = "img/augen.svg";
			img.width = "24";
			img.height = "24";
			img.title = "Metatext";
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
			anhaenge.makeIconList(beleg.an, cont_span, true);
			div.appendChild(cont_span);
		}
	},
	// Text-Links erkennen und in echte HTML-Links umwandeln
	//   text = String
	//     (Plain-Text, in dem die Links umgewandelt werden sollen)
	linksErkennen (text) {
		text = text.replace(/https?:[^\s]+|www\.[^\s]+/g, function(m) {
			let reg = /(&gt;|[.:,;!?)\]}>]+)$/g,
				url = m.replace(reg, ""),
				basis = m.match(/(https?:\/\/)*([^\/]+)/)[2].replace(reg, ""),
				schluss = "";
			if (m.match(reg)) {
				schluss = m.replace(/.+?(&gt;|[.:,;!?)\]}>]+)$/g, function(m, p) {
					return p;
				});
			}
			return `<a href="${url}" class="link">${basis}</a>${schluss}`;
		});
		return text;
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
	// Detail auf Klick anzeigen (wird derzeit nur für das Datum benutzt)
	//   span = Element
	//     (<span>, in dem das Detail steht)
	detailAnzeigen (span) {
		span.addEventListener("click", function(evt) {
			evt.stopPropagation();
			let detail = helfer.escapeHtml(this.title),
				beleg_id = this.parentNode.dataset.id;
			dialog.oeffnen({
				typ: "alert",
				text: `<h3>${liste.detailAnzeigenH3(beleg_id)}</h3>\n${detail}`,
			});
		});
	},
	// Text der Überschrift für die Detailanzeige erstellen
	// (die Funktion brauch ich auch in anhaenge.js, drucken.js und popup.js, darum ausgelagert)
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
			} else if (/^(bs|bd|bl|sy|qu|kr|ts|no|meta)$/.test(funktion)) {
				liste.headerDetails(funktion);
			} else if (funktion === "suchleiste") {
				suchleiste.einblenden();
			}
		});
	},
	// Header-Icons: Filter ein- bzw. ausblenden
	headerFilter () {
		// Option ändern
		optionen.data.belegliste.filterleiste = !optionen.data.belegliste.filterleiste;
		optionen.speichern();
		// Anzeige anpassen
		liste.headerFilterAnzeige(true);
	},
	// Header-Icons: Filter ein- bzw. ausblenden
	// (Anzeige der Filterleiste und des Links im Header anpassen)
	//   scroll_bak = Boolean
	//     (Backup des Scrollstatus erstellen und wiederherstellen)
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
	// Header-Icons: chronologisches Sortieren der Belege
	headerSortieren () {
		// Option ändern
		optionen.data.belegliste.sort_aufwaerts = !optionen.data.belegliste.sort_aufwaerts;
		optionen.speichern();
		// Link anpassen
		liste.headerSortierenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Header-Icons: chronologisches Sortieren der Belege (Anzeige im Header anpassen)
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
	// Header-Icons: Anzahl der Zeitschnitte festlegen, die angezeigt werden sollen
	//   funktion = String
	//     (der letzte Teil der ID des Elements, also "liste-link-" + "funktion" = ID)
	headerZeitschnitte (funktion) {
		// Zeitschnitt ermitteln
		if (/[0-9]+$/.test(funktion)) {
			optionen.data.belegliste.zeitschnitte = funktion.match(/[0-9]+$/)[0];
		} else {
			optionen.data.belegliste.zeitschnitte = "-";
		}
		optionen.speichern();
		// Anzeige der Links im Listenheader anpassen
		liste.headerZeitschnitteAnzeige();
		// Anzeige der Zeitschnitte in der Liste anpassen
		liste.zeitschnitteAnpassen(true);
	},
	// Header-Icons: Anzahl der Zeitschnitte festlegen, die angezeigt werden sollen (Anzeige im Header anpassen)
	headerZeitschnitteAnzeige () {
		let aktiv = "";
		if (optionen.data.belegliste.zeitschnitte !== "-") {
			aktiv = `-${optionen.data.belegliste.zeitschnitte}`;
		}
		const id = `liste-link-zeitschnitte${aktiv}`; // der aktive Link
		let links = document.getElementsByClassName("liste-link-zeitschnitte"); // alle Links
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i].id === id) {
				links[i].classList.add("aktiv");
			} else {
				links[i].classList.remove("aktiv");
			}
		}
	},
	// Header-Icons: Anzeige der Details des Belegs umstellen
	headerBeleg () {
		// Variable umstellen
		optionen.data.belegliste.beleg = !optionen.data.belegliste.beleg;
		optionen.speichern();
		// Link im Header anpassen
		liste.headerBelegAnzeige();
		// List geöffneter Belege zurückstellen
		liste.statusOffen = {};
		// Anzeige der Belege anpassen
		document.querySelectorAll(".liste-kopf").forEach(function(i) {
			const offen = i.classList.contains("schnitt-offen");
			if (optionen.data.belegliste.beleg) {
				const id = i.dataset.id;
				if (!offen && liste.aufbauenDetailsBeiSuche(id)) {
					i.classList.add("schnitt-offen");
					liste.aufbauenDetails({
						id,
						folgekopf: i.nextSibling,
					});
				}
			} else {
				// da für die Suche die Einstellung übergangen wird, kann es sein, dass der Beleg
				// gar nicht offen ist
				i.classList.remove("schnitt-offen");
				if (i.nextSibling && i.nextSibling.classList.contains("liste-details")) {
					i.parentNode.removeChild(i.nextSibling);
				}
			}
		});
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
	},
	// Header-Icons: Anzeige der Details des Belegs umstellen (Anzeige im Header anpassen)
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
	// Header-Icons: Kürzung des Belegs aus-/einschalten
	headerBelegKuerzen () {
		// Kürzung umstellen
		optionen.data.belegliste.beleg_kuerzen = !optionen.data.belegliste.beleg_kuerzen;
		optionen.speichern();
		// Link anpassen
		liste.headerBelegKuerzenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Header-Icons: Kürzung des Belegs aus-/einschalten (Anzeige im Header anpassen)
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
	// Header-Icons: Silbentrennung im Beleg aus-/einschalten
	headerTrennung () {
		// Hervorhebung umstellen
		optionen.data.belegliste.trennung = !optionen.data.belegliste.trennung;
		optionen.speichern();
		// Link anpassen
		liste.headerTrennungAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Header-Icons: Silbentrennung im Beleg aus-/einschalten (Anzeige im Header anpassen)
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
	// Header-Icons: Hervorhebung des Worts im Beleg und der Vorschau aus-/einschalten
	headerWortHervorheben () {
		// Hervorhebung umstellen
		optionen.data.belegliste.wort_hervorheben = !optionen.data.belegliste.wort_hervorheben;
		optionen.speichern();
		// Link anpassen
		liste.headerWortHervorhebenAnzeige();
		// Liste neu aufbauen
		liste.status(false);
	},
	// Header-Icons: Hervorhebung des Worts im Beleg und der Vorschau aus-/einschalten (Anzeige im Header anpassen)
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
	// Header-Icons: Steuerung der Detailanzeige ändern
	//   funktion = String
	//     (verweist auf den Link, der geklickt wurde)
	headerDetails (funktion) {
		// Belegtext-Icon ist nur Platzhalter
		if (funktion === "bs") {
			dialog.oeffnen({
				typ: "alert",
				text: "Der Belegtext kann nicht ausgeblendet werden.",
				callback: () => {
					document.getElementById("liste-link-bs").focus();
				},
			});
			return;
		}
		// Einstellung umstellen und speichern
		let opt = `detail_${funktion}`;
		optionen.data.belegliste[opt] = !optionen.data.belegliste[opt];
		optionen.speichern();
		// Anzeige der Icons auffrischen
		liste.headerDetailsAnzeige(funktion, opt);
		liste.headerDetailsLetztesIcon();
		// Anzeige der Details in der Liste auffrischen
		liste.headerDetailsAuffrischen();
		// ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
		if (document.getElementById("suchleiste")) {
			suchleiste.suchen(true);
		}
	},
	// Header-Icons: frischt die Anzeige der Details nach dem Ändern
	// einer Anzeigeoption im Header der Belegliste auf
	headerDetailsAuffrischen () {
		// Scroll-Status speichern
		liste.statusScrollBak();
		// Detail-Anzeige auffrischen
		document.querySelectorAll(".liste-kopf").forEach(function(i) {
			if (!i.nextSibling || !i.nextSibling.classList.contains("liste-details")) {
				return;
			}
			i.parentNode.removeChild(i.nextSibling);
			liste.aufbauenDetails({
				id: i.dataset.id,
			});
		});
		// Scroll-Status wiederherstellen
		liste.statusScrollReset();
	},
	// Header-Icons: Links zur Steuerung der Detailanzeige visuell anpassen
	//   funktion = String
	//     (verweist auf den Link, der geklickt wurde)
	//   opt = String
	//     (Name der Option, die betroffen ist)
	headerDetailsAnzeige (funktion, opt) {
		let title = {
			bd: "Bedeutung",
			bl: "Wortbildung",
			sy: "Synonym",
			qu: "Quelle",
			kr: "Korpus",
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
	// Header-Icons: das letzte angezeigte Icon soll rechts keine border, dafür runde Kanten haben
	headerDetailsLetztesIcon () {
		// alte Markierung entfernen
		let letztes = document.querySelector(".liste-opt-anzeige .liste-opt-anzeige-letztes");
		if (letztes) {
			letztes.classList.remove("liste-opt-anzeige-letztes");
		}
		// letztes aktives Element finden und ggf. markieren
		let a = document.querySelectorAll(".liste-opt-anzeige a");
		for (let i = a.length - 1; i >= 0; i--) {
			if (a[i].classList.contains("aktiv")) {
				if (i < a.length - 1) { // das letzte Icon muss nie markiert werden
					a[i].classList.add("liste-opt-anzeige-letztes");
				}
				break;
			}
		}
	},
	// Datenfeld durch Klick auf ein Icon kopieren
	//   icon = Element
	//     (Kopier-Icon, auf das geklickt wurde)
	kopieren (icon) {
		icon.addEventListener("click", function(evt) {
			evt.preventDefault();
			let ds = this.dataset.ds.split("|"),
				text = data.ka[ds[0]][ds[1]];
			beleg.toolsKopierenExec({
				ds: ds[1],
				obj: data.ka[ds[0]],
				text,
				ele: this,
			});
		});
	},
	// alle in der Belegliste angezeigten Belege in die Zwischenablage
	kopierenAlleBelege () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Belege &gt; Belegtexte in Zwischenablage</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Ist die Belegliste sichtbar?
		if ( !liste.listeSichtbar({funktion: "Belege &gt; Belegtexte in Zwischenablage"}) ) {
			return;
		}
		// Daten sammeln
		let text = [],
			html = [];
		for (let i of document.querySelectorAll("#liste-belege .liste-kopf")) {
			const id = i.dataset.id;
			popup.referenz.id = id; // popup.referenz.data wird in beleg.toolsKopierenExec() gesetzt
			let texte = beleg.toolsKopierenExec({
				ds: "bs",
				obj: data.ka[id],
				text: data.ka[id].bs,
				ele: null,
				cb: false,
			});
			text.push(texte.text);
			html.push(texte.html);
		}
		// Margin vor Absatz
		for (let i = 0, len = html.length; i < len; i++) {
			html[i] = html[i].replace(/^<p>/, `<p style="margin-top: 18pt">`);
		}
		// Daten => Clipboard
		const {clipboard} = require("electron");
		clipboard.write({
			text: text.join("\n".repeat(4)),
			html: html.join(""),
		});
		// Feedback
		helfer.animation("zwischenablage");
	},
	// alle in der Belegliste sichtbaren Belege löschen
	async loeschenAlleBelege () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Belege &gt; Löschen</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Ist die Belegliste sichtbar?
		if ( !liste.listeSichtbar({funktion: "Belege &gt; Löschen"}) ) {
			return;
		}
		// Wirklich löschen
		let belege = document.querySelectorAll("#liste-belege .liste-kopf");
		const loeschen = await new Promise(resolve => {
			let numerus = `Sollen die <i>${belege.length} Belege</i>, die derzeit in der Belegliste sichtbar sind,`;
			if (belege.length === 1) {
				numerus = `Soll <i>${liste.detailAnzeigenH3(belege[0].dataset.id)}</i>`;
			}
			dialog.oeffnen({
				typ: "confirm",
				text: `${numerus} wirklich gelöscht werden?`,
				callback: () => resolve(dialog.antwort),
			});
		});
		if (!loeschen) {
			return;
		}
		// Löschen ausführen
		for (let i of belege) {
			const id = i.dataset.id;
			delete data.ka[id];
			if (kopieren.an && kopieren.belege.includes(id)) {
				kopieren.belege.splice(kopieren.belege.indexOf(id), 1);
			}
		}
		// Belegliste und Filter auffrischen
		kartei.karteiGeaendert(true);
		liste.statusNeu = "";
		liste.statusGeaendert = "";
		liste.status(true);
		// ggf. Zählung über dem Kopier-Icon im Fensterkopf auffrischen
		if (kopieren.an) {
			kopieren.uiText();
		}
	},
	// stellt fest, ob die Belegliste sichtbar ist
	//   funktion = String
	//     (Name der Funktion, die nur ausgeführt werden darf,
	//     wenn die Liste sichtbar ist)
	listeSichtbar ({funktion}) {
		if (helfer.hauptfunktion !== "liste" ||
				overlay.oben()) {
			dialog.oeffnen({
				typ: "alert",
				text: `Die Funktion <i>${funktion}</i> steht nur zur Verfügung, wenn die Belegliste sichtbar ist.`,
			});
			return false;
		}
		return true;
	},
	// Tastaturkürzel Strg + C abfangen und das Kopieren von markiertem Text ggf. selbst regeln
	//   evt = Object
	//     (das Event-Objekt, das beim Kopieren erzeugt wird)
	textKopieren (evt) {
		let sel = window.getSelection(),
			anker = sel.anchorNode;
		// Text ausgewählt?
		if (!anker) {
			return;
		}
		// Text in Detailansicht Belegliste oder Formularansicht Karteikarte?
		anker = anker.parentNode; // andernfalls funktioniert closest() nicht
		if (!anker.closest(".liste-details") &&
				!anker.closest(".beleg-lese")) {
			return;
		}
		// Kopieren wird vom Programm erledigt
		evt.preventDefault();
		// Text auslesen
		popup.getTargetSelection(evt.path);
		// Aktion ohne Nachfrage ausführen
		if (optionen.data.einstellungen["ctrlC-auto"]) {
			liste.textKopierenExec();
			return;
		}
		// Fenster öffnen
		let fenster = document.getElementById("ctrlC");
		overlay.oeffnen(fenster);
		// Checkbox zurücksetzen
		document.getElementById("ctrlC-auto").checked = false;
		// Radio-Buttons vorbereiten
		let auswahl = parseInt(optionen.data.einstellungen["ctrlC-vor"], 10),
			radios = fenster.querySelectorAll(`input[type="radio"]`);
		// kein Belegtext ausgewählt
		if (!popup.selInBeleg()) {
			radios[2].disabled = true;
			if (auswahl === 3) {
				auswahl = 4;
			}
		} else {
			radios[2].disabled = false;
		}
		for (let i = 0, len = radios.length; i < len; i++) {
			if (i + 1 === auswahl) {
				radios[i].checked = true;
				radios[i].focus();
			} else {
				radios[i].checked = false;
			}
		}
	},
	// Listener für die Input-Element im Kopierfenster
	//   input = Element
	//     (Radio-Button oder Button)
	textKopierenInputs (input) {
		if (/checkbox|radio/.test(input.type)) {
			input.addEventListener("keydown", function(evt) {
				tastatur.detectModifiers(evt);
				if (!tastatur.modifiers && evt.key === "Enter") {
					liste.textKopierenExec();
				}
			});
		} else if (input.type === "button") {
			input.addEventListener("click", () => liste.textKopierenExec());
		}
	},
	// Kopieren von markiertem Text ausführen
	textKopierenExec () {
		let fenster = document.getElementById("ctrlC"),
			auswahl = optionen.data.einstellungen["ctrlC-vor"];
		if (overlay.oben() === "ctrlC") { // Overlay-Fenster geöffnet
			let radio = fenster.querySelector("input:checked"),
				aktion = radio.id.replace(/.+-/, "");
			switch (aktion) {
				case "html":
					auswahl = "1";
					break;
				case "htmlReferenz":
					auswahl = "2";
					break;
				case "xml":
					auswahl = "3";
					break;
				case "xmlReferenz":
					auswahl = "4";
					break;
				case "xmlFenster":
					auswahl = "5";
					break;
			}
			// Aktion künftig ohne Nachfrage ausführen
			if (document.getElementById("ctrlC-auto").checked) {
				optionen.data.einstellungen["ctrlC-auto"] = true;
				optionen.data.einstellungen["ctrlC-vor"] = auswahl;
				optionen.anwendenEinstellungen();
				optionen.speichern();
			}
			// Fenster schließen
			overlay.schliessen(fenster);
		} else if (!popup.selInBeleg() && auswahl === "3") { // Overlay-Fenster nicht geöffnet
			auswahl = "4"; // Vorauswahl XML-Belgschnitt anpassen, wenn Auswahl nicht im Belegtext
		}
		// Kopieraktion ausführen
		switch (auswahl) {
			case "1":
				helfer.toClipboard({
					text: popup.textauswahl.text,
					html: popup.textauswahl.html,
				});
				helfer.animation("zwischenablage");
				break;
			case "2":
				helfer.toClipboard({
					text: xml.belegId({}),
				});
				helfer.animation("zwischenablage");
				break;
			case "3":
				xml.schnittInZwischenablage();
				break;
			case "4":
				xml.referenz();
				break;
			case "5":
				xml.schnittInXmlFenster();
				break;
		}
	},
};
