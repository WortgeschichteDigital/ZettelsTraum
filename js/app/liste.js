"use strict";

let liste = {
	// Zeigt die Belegliste an, überprüft aber vorher,
	// ob noch etwas in Bearbeitung gespeichert werden muss
	anzeigen () {
		if (tagger.geaendert) { // Tags noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					tagger.speichern();
				} else if (dialog.antwort === false) {
					tagger.taggerGeaendert(false);
					tagger.schliessen();
					liste.wechseln();
				}
			});
			dialog.text("Die Tags wurden verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (bedeutungen.geaendert) { // Bedeutungen noch nicht gespeichert
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					bedeutungen.speichern();
				} else if (dialog.antwort === false) {
					bedeutungen.bedeutungenGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Das Bedeutungsgerüst wurde verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
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
				dialog.oeffnen("alert");
				dialog.text("Der Beleg wurde angelegt.\nWegen der aktuellen Filterregeln erscheint er jedoch nicht in der Belegliste.");
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
	aufbauenDetails ({id, folgekopf}) {
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
		// Belege aus demselben Jahr
		if (datum.a === datum.b) {
			let autor = [data.ka[a].au, data.ka[b].au];
			// nach Belegnummer: auf- oder absteigend
			if (autor[0] === autor[1]) {
				if (optionen.data.belegliste.sort_aufwaerts) {
					return parseInt(a, 10) - parseInt(b, 10);
				} else {
					return parseInt(b, 10) - parseInt(a, 10);
				}
			}
			// nach Autor: alphabetisch auf- oder absteigend
			autor.sort(helfer.sortAlpha);
			let sortierung = [1, -1];
			if (optionen.data.belegliste.sort_aufwaerts) {
				sortierung.reverse();
			}
			if (autor[0] === data.ka[a].au) {
				return sortierung[0];
			}
			return sortierung[1];
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
		// Suche ohne Treffer im Beleg
		if (filter.volltextSuche.suche &&
				!filter.volltextSuche.ka[id].includes("bs")) {
			let p = document.createElement("p");
			p.textContent = "[…]";
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
						p.textContent = "[…]";
						zuletzt_gekuerzt = true;
					}
					continue;
				}
			} else if (optionen.data.belegliste.beleg_kuerzen &&
					!liste.wortVorhanden(p_prep[i])) { // ggf. kürzen, wenn Wort nicht enthalten
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
			p.innerHTML = liste.suchtreffer(liste.belegWortHervorheben(p_prep[i], false), "bs", id);
			beleg.wortAnnotierenInit(p);
		}
		// <div> zurückgeben
		return div;
	},
	// generiert den Vorschautext des übergebenen Belegs inkl. Autorname (wenn vorhanden)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	//   id = String
	//     (ID des aktuellen Belegs)
	belegVorschau (beleg_akt, id) {
		// Beleg aufbereiten
		let schnitt = beleg_akt.bs.replace(/\n+/g, " "); // Absätze könnten mit Leerzeile eingegeben sein
		schnitt = schnitt.replace(/<.+?>/g, ""); // HTML-Formatierungen vorher löschen!
		schnitt = liste.belegTrennungWeg(schnitt, true); // Trennzeichen und Seitenumbrüche weg
		// 1. Treffer des Worts im Text ermitteln, Beleg am Anfang ggf. kürzen
		let reg = new RegExp(helfer.formVariRegExpRegs[0], "gi");
		if (reg.test(schnitt) &&
				reg.lastIndex - kartei.wort.length > 35) {
			schnitt = `…${schnitt.substring(reg.lastIndex - kartei.wort.length - 25)}`;
		}
		// Performance-Schub: Vorschautext kürzen
		if (schnitt.length > 280) {
			schnitt = `${schnitt.substring(0, 250)}…`;
		}
		// Wort hervorheben
		schnitt = liste.belegWortHervorheben(schnitt, false);
		// ggf. Autor angeben
		let frag = document.createDocumentFragment();
		if (beleg_akt.au) {
			let autor = helfer.escapeHtml(beleg_akt.au).split(/,(.+)/),
				autor_span = document.createElement("span");
			frag.appendChild(autor_span);
			autor_span.innerHTML = liste.suchtreffer(autor[0], "au", id);
			if (autor.length > 1) {
				let span = document.createElement("span");
				span.classList.add("liste-autor-detail");
				span.innerHTML = liste.suchtreffer(`,${autor[1]}`, "au", id);
				autor_span.appendChild(span);
			}
			liste.belegVorschauTs(autor_span, beleg_akt, " ", "");
			autor_span.appendChild(document.createTextNode(": "));
		} else {
			liste.belegVorschauTs(frag, beleg_akt, "", " ");
		}
		// Textschnitt in Anführungsstriche
		let q = document.createElement("q");
		q.innerHTML = schnitt;
		frag.appendChild(q);
		// Fragment zurückgeben
		return frag;
	},
	// Textsorte hinter Jahr bzw. Autorname in Vorschaukopf des Belegs einhängen
	//   ele = Element
	//     (hier wird die Textsorte angehängt)
	//   beleg_akt = Object
	//     (Verweis auf den aktuellen Beleg)
	//   vor = String
	//     (Text vor der Textsorte)
	//   nach = String
	//     (Text nach der Textsorte)
	belegVorschauTs (ele, beleg_akt, vor, nach) {
		if (!beleg_akt.ts || !optionen.data.einstellungen.textsorte) {
			return;
		}
		ele.appendChild(document.createTextNode(`${vor}(`));
		let span = document.createElement("span");
		span.classList.add("liste-textsorte");
		span.textContent = beleg_akt.ts.split(":")[0];
		ele.appendChild(span);
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
		for (let i of helfer.formVariRegExpRegs) {
			let reg = new RegExp(`[^${helfer.ganzesWortRegExp.links}]*(${i})[^${helfer.ganzesWortRegExp.rechts}]*`, "gi");
			schnitt = schnitt.replace(reg, (m) => `<mark class="wort">${m}</mark>`);
		}
		return schnitt;
	},
	// überprüft, ob das Karteiwort in dem übergebenen Text steht
	//   text = String
	//     (Text, der auf die Existenz des Karteiworts überprüft werden soll)
	wortVorhanden (text) {
		text = liste.textBereinigen(text);
		for (let i of helfer.formVariRegExpRegs) {
			let reg = new RegExp(i, "i");
			if (!reg.test(text)) {
				return false;
			}
		}
		return true;
	},
	// den übergebenen Text bereinigen, z.B. bevor eine Kürzung vollzogen wird
	// (diese Funktion wird auch von beleg.js benutzt)
	textBereinigen (text) {
		text = text.replace(/<.+?>/g, "");
		text = liste.belegTrennungWeg(text, true);
		return text;
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
	// Details zu einem einzelnen Beleg durch Klick auf den Belegkopf ein- oder ausblenden
	//   div = Element
	//     (der Belegkopf, auf den geklickt werden kann)
	belegUmschalten (div) {
		div.addEventListener("click", function() {
			if (this.classList.contains("schnitt-offen")) {
				this.classList.remove("schnitt-offen");
				this.parentNode.removeChild(this.nextSibling);
			} else {
				this.classList.add("schnitt-offen");
				liste.aufbauenDetails({
					id: this.dataset.id,
				});
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
		// Metatext?
		if (beleg.mt) {
			let img = document.createElement("img");
			img.src = "img/liste-metatext.svg";
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
			let reg = /(&gt;|[.:,;!?)\]}>]+)$/g,
				url = m.replace(reg, ""),
				basis = m.match(/(https*:\/\/)*([^\/]+)/)[2].replace(reg, ""),
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
			dialog.oeffnen("alert");
			dialog.text(`<h3>${liste.detailAnzeigenH3(beleg_id)}</h3>\n${detail}`);
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
			dialog.oeffnen("alert", function() {
				document.getElementById("liste-link-bs").focus();
			});
			dialog.text("Der Belegtext kann nicht ausgeblendet werden.");
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
			beleg.toolsKopierenExec(ds[1], data.ka[ds[0]], text, this);
		});
	},
};
