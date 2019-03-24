"use strict";

let filter = {
	// gibt an, ob die Filter gerade neu aufgebaut wurden
	init: false,
	// Zwischenspeicher für die dynamischen Filtertypen
	typen: {},
	// Liste der Filter aufbauen
	//   belege = Array
	//     (die IDs der Belege, bereits chronologisch sortiert)
	aufbauen (belege) {
		// Filter werden neu aufgebaut => das muss für später vorgemerkt werden
		filter.init = true;
		// Backup der Filtereinstellungen erstellen
		let filter_backup = filter.backup();
		// Zeitraum-Filter
		if (!optionen.data.belegliste.sort_aufwaerts) {
			belege.reverse();
		}
		if (!belege.length) {
			filter.zeitraumStart = "";
		} else {
			filter.zeitraumStart = liste.zeitschnittErmitteln(data.ka[ belege[0] ].da).jahr;
			filter.zeitraumEnde = liste.zeitschnittErmitteln(data.ka[ belege[belege.length - 1] ].da).jahr;
			// Zwischenspeicher für die Jahre der Belge füllen
			filter.jahrBelegeFuellen();
		}
		filter.aufbauenZeitraum();
		// dynamische Filter und Anzahl der passenden Karten ermitteln
		filter.typen = {
			bedeutungen: {
				name: "Bedeutungen",
				filter_vorhanden: Object.keys(data.ka).length ? true : false,
				filter: {
					"bedeutungen-undefined": {
						name: "(nicht bestimmt)",
						wert: 0,
					},
				},
				filter_folge: ["bedeutungen-undefined"],
			},
			textsorten: {
				name: "Textsorten",
				filter_vorhanden: Object.keys(data.ka).length ? true : false,
				filter: {
					"textsorten-undefined": {
						name: "(nicht bestimmt)",
						wert: 0,
					},
				},
				filter_folge: ["textsorten-undefined"],
			},
			verschiedenes: {
				name: "Verschiedenes",
				filter_vorhanden: false,
				filter: {
					unvollstaendig: {
						name: "unvollständig",
						wert: 0,
					},
					kontext: {
						name: "Kontext?",
						wert: 0,
					},
					buecherdienst: {
						name: "Bücherdienst",
						wert: 0,
					},
					buchung: {
						name: "Buchung",
						wert: 0,
					},
					markierung: {
						name: "Markierung",
						wert: 0,
					},
				},
				filter_folge: [
					"unvollstaendig",
					"kontext",
					"buecherdienst",
					"buchung",
					"markierung",
				],
			},
		};
		let baeume = [{
				data: "bd",
				typen: "bedeutungen",
			},
			{
				data: "ts",
				typen: "textsorten",
			}];
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			// BEDEUTUNGEN UND TEXTSORTEN
			for (let i = 0, len = baeume.length; i < len; i++) {
				let d = baeume[i].data,
					t = baeume[i].typen;
				if (!data.ka[id][d]) {
					filter.typen[t].filter[`${t}-undefined`].wert++;
					continue;
				}
				let schon_gezaehlt = new Set(),
					b = filter.baumExtrakt(data.ka[id][d], t);
				for (let j = 0, len = b.length; j < len; j++) {
					if (!filter.typen[t].filter[ b[j] ]) {
						let name = b[j].replace(/^.+?-/, "").split(": ");
						filter.typen[t].filter[ b[j] ] = {
							name: name[name.length - 1],
							wert: 0,
						};
						filter.typen[t].filter_folge.push(b[j]);
					}
					// Wenn mehrere Bedeutungen oder Textsorten in einem Beleg auftauchen
					// könnte es passieren, dass Belege doppelt gezählt werden. Ein Beispiel wäre:
					// "Mensch: alt: groß\nMensch: alt: klein". Hier würden "Mensch" und "Mensch: alt"
					// zweimal gezählt, obwohl sie im selben Beleg auftauchen. Da kann man
					// Abhilfe schaffen:
					if ( schon_gezaehlt.has(b[j]) ) {
						continue;
					}
					// Filter zählen
					filter.typen[t].filter[ b[j] ].wert++;
					schon_gezaehlt.add(b[j]);
				}
			}
			// VERSCHIEDENES
			// Vollständigkeit
			if (data.ka[id].un) {
				filter.typen.verschiedenes.filter.unvollstaendig.wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Kontext
			if (data.ka[id].ko) {
				filter.typen.verschiedenes.filter.kontext.wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Bücherdienst
			if (data.ka[id].bu) {
				filter.typen.verschiedenes.filter.buecherdienst.wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Buchung
			if (data.ka[id].bc) {
				filter.typen.verschiedenes.filter.buchung.wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Bewertung
			if (data.ka[id].be) {
				filter.typen.verschiedenes.filter.markierung.wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
		}
		// Bedeutungen und Textsorten sortieren
		let arr_typen = ["bedeutungen", "textsorten"];
		for (let i = 0, len = arr_typen.length; i < len; i++) {
			let arr = filter.typen[ arr_typen[i] ].filter_folge;
			arr.sort(filter.baumSort);
		}
		// dynamische Filter drucken
		const cont = document.getElementById("liste-filter-dynamisch");
		helfer.keineKinder(cont);
		for (let block in filter.typen) {
			if ( !filter.typen.hasOwnProperty(block) ) {
				continue;
			}
			if (!filter.typen[block].filter_vorhanden) {
				continue;
			}
			cont.appendChild( filter.aufbauenCont(filter.typen[block].name) );
			if (block === "verschiedenes") {
				cont.lastChild.appendChild( filter.aufbauenFilterlogik() );
			}
			let f = filter.typen[block].filter_folge;
			for (let i = 0, len = f.length; i < len; i++) {
				let neuer_filter = filter.aufbauenFilter(f[i], filter.typen[block].filter[ f[i] ]);
				if (neuer_filter) {
					cont.lastChild.appendChild(neuer_filter);
				}
			}
		}
		// Backup der Filtereinstellungen wiederherstellen
		filter.backupWiederher(filter_backup);
		// ggf. Markierung der Sterne wiederherstellen
		filter.markierenSterne();
	},
	// Zwischenspeicher für die Zeiträume der aktuellen Belegliste
	zeitraumStart: "",
	zeitraumEnde: "",
	// Zeitraumfilter aufbauen
	//   start = String
	//     (Jahr des 1. Belegs)
	//   ende = String
	//     (Jahr des letzten Belegs)
	aufbauenZeitraum () {
		// Liste leeren
		const cont = document.getElementById("filter-zeitraum-dynamisch");
		helfer.keineKinder(cont);
		// Zeitraum-Cache leeren
		filter.zeitraumTrefferCache = {};
		// Belege vorhanden?
		if (!filter.zeitraumStart) {
			let p = document.createElement("p");
			p.classList.add("filter-keine-belege");
			p.textContent = "keine Belege";
			cont.appendChild(p);
			return;
		}
		// Grenzen berechnen
		let start = filter.zeitraumStart,
			ende = filter.zeitraumEnde,
			filter1 = 0,
			filterN = 0,
			step = filter.aufbauenZeitraumStep();
		if (step === 100) { // 100er
			filter1 = parseInt(start.substring(0, 2), 10) * 100;
			filterN = parseInt(ende.substring(0, 2), 10) * 100;
		} else if (step === 50) { // 50er
			let haelfte1 = Math.round(parseInt(start.substring(2), 10) / 100) ? "50" : "00";
			filter1 = parseInt(`${start.substring(0, 2)}${haelfte1}`, 10);
			let haelfteN = Math.round(parseInt(ende.substring(2), 10) / 100) ? "50" : "00";
			filterN = parseInt(`${ende.substring(0, 2)}${haelfteN}`, 10);
		} else { // 10er
			filter1 = parseInt(start.substring(0, 3), 10) * 10;
			filterN = parseInt(ende.substring(0, 3), 10) * 10;
		}
		// Liste füllen
		for (let i = filter1; i <= filterN; i += step) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Checkbox
			let input = document.createElement("input");
			input.classList.add("filter");
			input.id = `filter-zeit-${i}`;
			input.type = "checkbox";
			filter.anwenden(input);
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `filter-zeit-${i}`);
			label.textContent = i;
			p.appendChild(label);
			// Anzahl der Treffer anzeigen
			let treffer = filter.aufbauenZeitraumTreffer(i, step);
			if (!treffer) {
				continue;
			}
			let span = document.createElement("span");
			span.classList.add("filter-treffer");
			span.textContent = `(${treffer})`;
			span.title = "Anzahl der Belege in diesem Zeitraum";
			p.appendChild(span);
		}
		// Liste nach oben scrollen
		cont.scrollTop = 0;
	},
	// Step ermitteln, in dem die Zeitraumfilter dargestellt werden
	aufbauenZeitraumStep () {
		let inputs = document.getElementsByName("filter-zeitraum");
		for (let i = 0, len = inputs.length; i < len; i++) {
			if (inputs[i].checked) {
				return parseInt(inputs[i].id.match(/[0-9]+$/)[0], 10);
			}
		}
	},
	// Zwischenspeicher für das Jahr des Belegs, mit dem gerechnet werden kann
	// (vgl. filter.aufbauen())
	jahrBelege: {},
	// füllt den Zwischenspeicher filter.jahrBelege
	jahrBelegeFuellen () {
		filter.jahrBelege = {};
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			filter.jahrBelege[id] = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
		}
	},
	// hier werden die Treffer der angezeigten Zeiträume zwischengespeichert
	// (der Cache dient dazu, die Zeitraum-Grafik zu generieren)
	zeitraumTrefferCache: {},
	// Anzahl der Treffer in einem gegebenen Zeitraum ermitteln
	//   y = Number
	//     (das Jahr, mit dem der Zeitraum startet)
	//   step = Number
	//     (der Zeitraum für den dieser Jahresfilter steht)
	aufbauenZeitraumTreffer (y, step) {
		let ende = y + step - 1,
			treffer = 0;
		for (let id in filter.jahrBelege) {
			if ( !filter.jahrBelege.hasOwnProperty(id) ) {
				continue;
			}
			if (filter.jahrBelege[id] >= y && filter.jahrBelege[id] <= ende) {
				treffer++;
			}
		}
		filter.zeitraumTrefferCache[y] = treffer;
		return treffer;
	},
	// die Schnitte im Filter-Zeitraum werden gewechselt
	//   input = Element
	//     (Radio-Button, der für die gewünschten Zeitschnitte steht)
	wechselnZeitraum (input) {
		input.addEventListener("change", function() {
			optionen.data.filter.zeitraum = this.id.match(/[0-9]+$/)[0];
			optionen.speichern(false);
			filter.aufbauenZeitraum();
			filter.aktiveFilterErmitteln();
			liste.status(false);
		});
	},
	// extrahiert die einzelnen Schichten, die in einer Bedeutungs- oder Textsortenangabe stecken
	//   baum = String
	//     (Bedeutungs- bzw. Textsortenbaum als einzeiliger String)
	//   dt = String
	//     (Datentyp, also entweder "bedeutungen" oder "textsorten")
	baumExtrakt (baum, dt) {
		let extrakt = [],
			gruppen = baum.split("\n");
		for (let i = 0, len = gruppen.length; i < len; i++) {
			let untergruppen = gruppen[i].split(": "),
				konstrukt = [];
			for (let j = 0, len = untergruppen.length; j < len; j++) {
				konstrukt.push(untergruppen[j]);
				extrakt.push(`${dt}-${konstrukt.join(": ")}`);
			}
		}
		return extrakt;
	},
	// Array mit Bedeutungsschichten, die aus Bedeutungs- und Textsortenangaben
	// extrahiert wurde, sortieren
	baumSort (a, b) {
		// undefined wird an den Anfang gesetzt
		if ( a.match(/undefined$/) ) {
			return -1;
		} else if ( b.match(/undefined$/) ) {
			return 1;
		}
		// alphabetische Sortierung
		a = helfer.sortAlphaPrep(a);
		b = helfer.sortAlphaPrep(b);
		let arr = [a, b];
		arr.sort();
		if (arr[0] === a) {
			return -1;
		}
		return 1;
	},
	// Kopf und Container einer Filtergruppe erzeugen
	//   name = String
	//     (Name des Filterkopfes)
	aufbauenCont (name) {
		let frag = document.createDocumentFragment();
		// Filter-Kopf
		let a = document.createElement("a");
		frag.appendChild(a);
		a.classList.add("filter-kopf");
		a.href = "#";
		a.id = `filter-kopf-${name.toLowerCase()}`;
		a.textContent = name;
		filter.anzeigeUmschalten(a);
		// Bild für Block-Reset anhängen
		let span = document.createElement("span");
		a.appendChild(span);
		span.textContent = " ";
		filter.ctrlResetBlock(span);
		// Filter-Container
		let div = document.createElement("div");
		div.classList.add("filter-cont", "filter-cont-max");
		frag.appendChild(div);
		// Fragment zurückgeben
		return frag;
	},
	// Zeile mit Filterlogik aufbauen
	aufbauenFilterlogik () {
		let p = document.createElement("p");
		p.textContent = "Filterlogik: ";
		let inputs = ["inklusiv", "exklusiv"];
		for (let i = 0, len = inputs.length; i < len; i++) {
			// Input
			let input = document.createElement("input");
			input.id = `filter-logik-${inputs[i]}`;
			input.name = "filter-logik";
			input.type = "radio";
			if (inputs[i] === optionen.data.filter.logik) {
				input.checked = true;
			}
			filter.wechselnFilterlogik(input);
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `filter-logik-${inputs[i]}`);
			label.textContent = inputs[i];
			p.appendChild(label);
		}
		return p;
	},
	// die Logik im Verschiedenes-Filter wird geändert
	//   input = Element
	//     (Radio-Button, der für die gewünschten Zeitschnitte steht)
	wechselnFilterlogik (input) {
		input.addEventListener("change", function() {
			optionen.data.filter.logik = this.id.match(/[a-z]+$/)[0];
			optionen.speichern(false);
			liste.status(false);
		});
	},
	// Absatz mit einem Checkbox-Filter erzeugen
	//   f = String
	//     (Name des Filters)
	//   obj = Object
	//     (Daten zum Filter)
	aufbauenFilter (f, obj) {
		// Muss der Filter wirklich gedruckt werden?
		if (!obj.wert) {
			return false;
		}
		// Sollte der Filter als Filterbaum dargestellt werden?
		let baum = f.match(/: /g),
			baum_tiefe = 0;
		if (baum) {
			baum_tiefe = baum.length;
		}
		// in der Filter-ID sind wahrscheinlich Leerzeichen
		f = encodeURI(f);
		// Filter drucken
		let frag = document.createDocumentFragment(),
			p = document.createElement("p");
		if (baum_tiefe) {
			p.classList.add(`filter-baum${baum_tiefe}`);
		}
		// Input
		let input = document.createElement("input");
		input.classList.add("filter");
		input.id = `filter-${f}`;
		input.type = "checkbox";
		filter.anwenden(input);
		p.appendChild(input);
		// Label
		let label = document.createElement("label");
		label.setAttribute("for", `filter-${f}`);
		label.textContent = obj.name;
		p.appendChild(label);
		// Anzahl der Belege
		let span = document.createElement("span");
		span.classList.add("filter-treffer");
		span.textContent = `(${obj.wert})`;
		span.title = `Anzahl der Belege, auf die der Filter „${obj.name}“ zutrifft`;
		p.appendChild(span);
		// Absatz einhängen
		frag.appendChild(p);
		// ggf. Absatz mit Sternen aufbauen
		if (f === "markierung") {
			frag.lastChild.classList.add("markierung");
			frag.appendChild( filter.aufbauenSterne() );
		}
		// Fragment zurückgeben
		return frag;
	},
	// Absatz mit Sternen aufbauen für eine detaillierte Markierungssuche
	aufbauenSterne () {
		let p = document.createElement("p");
		p.dataset.bewertung = "0";
		p.id = "filter-bewertung";
		for (let i = 0; i < 5; i++) {
			let a = document.createElement("a");
			a.classList.add("icon-link", "icon-stern");
			a.href = "#";
			a.textContent = " ";
			beleg.bewertungEvents(a);
			p.appendChild(a);
		}
		return p;
	},
	// stellt die gespeicherte Markierung im Bewertungsfilter wieder her
	markierenSterne () {
		const filter_bewertung = document.getElementById("filter-bewertung");
		// keine Markierung gespeichert
		if (!filter_bewertung) {
			return;
		}
		// Markierung wiederherstellen
		const be = parseInt(filter_bewertung.dataset.bewertung, 10),
			sterne = document.querySelectorAll("#filter-bewertung a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (i < be) {
				sterne[i].classList.add("aktiv");
			} else {
				sterne[i].classList.remove("aktiv");
			}
		}
	},
	// Erstellt ein Backup der aktuellen Filter-Einstellungen, um sie nach
	// dem Neuaufbau der Liste wieder anzuwenden.
	backup () {
		let bak = {};
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			if (i.type === "text" && i.value) {
				bak[i.id] = i.value;
			} else if (i.type === "checkbox" || i.type === "radio") {
				bak[i.id] = i.checked;
			}
		});
		let filter_bewertung = document.getElementById("filter-bewertung");
		if (filter_bewertung) {
			bak["filter-bewertung"] = filter_bewertung.dataset.bewertung;
		}
		return bak;
	},
	// Stellt ein zuvor gemachtes Backup der Einstellungen in der Filterliste wieder her.
	//   bak = Object
	//     (Das Objekt mit den gespeicherten Einstellungen; vgl. filter.backup().)
	backupWiederher (bak) {
		document.querySelectorAll("#liste-filter input").forEach(function(i) {
			// kein Wert gespeichert
			if (!bak[i.id]) {
				return;
			}
			// Wert wiederherstellen
			if (i.type === "text") {
				i.value = bak[i.id];
			} else if (i.type === "checkbox" || i.type === "radio") {
				i.checked = bak[i.id];
			}
		});
		let filter_bewertung = document.getElementById("filter-bewertung");
		if (bak["filter-bewertung"] && filter_bewertung) {
			filter_bewertung.dataset.bewertung = bak["filter-bewertung"];
		}
	},
	// speichert den aktiven Timeout für das Anwenden der Filter
	// (wichtig für den Volltextfilter, der nicht sofort, sondern
	// nur mit Verzögerung angewandt werden soll)
	anwendenTimeout: null,
	// Löst beim Ändern eines Filters den Neuaufbau der Liste aus
	//   input = Element
	//     (Check- oder Textbox in der Filterliste, die geändert wurde)
	anwenden (input) {
		let listener = "change",
			timeout = 0;
		if (input.type === "text") {
			listener = "input";
			timeout = 250;
		}
		input.addEventListener(listener, function() {
			clearTimeout(filter.anwendenTimeout);
			filter.anwendenTimeout = setTimeout( () => liste.status(false), timeout);
		});
	},
	anwendenSterne (stern) {
		let filter_bewertung = document.getElementById("filter-bewertung"),
			be = parseInt(filter_bewertung.dataset.bewertung, 10),
			sterne = filter_bewertung.querySelectorAll("a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (sterne[i] === stern) {
				let bewertung = i + 1;
				if (be === bewertung) {
					filter_bewertung.dataset.bewertung = "0";
				} else {
					document.getElementById("filter-markierung").checked = true;
					filter_bewertung.dataset.bewertung = bewertung;
				}
				sterne[i].blur();
				break;
			}
		}
		liste.status(false);
	},
	// Zwischenspeicher für die zur Zeit aktiven Filter
	aktiveFilter: {},
	// ermittelt, welche Filter gerade aktiv sind
	aktiveFilterErmitteln () {
		filter.aktiveFilter = {};
		document.querySelectorAll(".filter").forEach(function(i) {
			if (i.type === "text" && i.value ||
					i.type === "checkbox" && i.checked) {
				let id = decodeURI( i.id.replace(/^filter-/, "") ); // Filter-ID könnte enkodiert sein
				filter.aktiveFilter[id] = true;
			}
		});
		// Angaben zu den Filterblöcken ergänzen
		// Zeitraum-Filter
		let filter_zeitraum = filter.kartenFilternZeitraum();
		if (filter_zeitraum.length) {
			filter.aktiveFilter.zeitraum = true;
		}
		// dynamische Filter
		for (let typ in filter.typen) {
			if ( !filter.typen.hasOwnProperty(typ) ) {
				continue;
			}
			for (let f in filter.typen[typ].filter) {
				if ( !filter.typen[typ].filter.hasOwnProperty(f) ) {
					continue;
				}
				let f_encoded = encodeURI(f);
				if (filter.typen[typ].filter[f].wert &&
						document.getElementById(`filter-${f_encoded}`).checked) {
					filter.aktiveFilter[typ] = true;
					break;
				}
			}
		}
		// die gerade aktiven Filterblöcke als solche markieren
		filter.aktiveFilterMarkieren();
		// inaktive Filterblöcke ggf. schließen
		filter.inaktiveSchliessen();
		// filter_zeitraum wird unter Umständen weiterverwendet
		return filter_zeitraum;
	},
	// markiert die Filterblöcke, in denen Filter aktiv sind
	aktiveFilterMarkieren () {
		document.querySelectorAll(".filter-kopf").forEach(function(i) {
			let block = i.id.replace(/^filter-kopf-/, "");
			if (filter.aktiveFilter[block]) {
				i.classList.add("aktiv");
			} else {
				i.classList.remove("aktiv");
			}
		});
	},
	// inaktive Filter nach dem Neuaufbau der Filterliste schließen
	inaktiveSchliessen () {
		// Wurden die Filter gerade erste neu aufgebaut?
		if (!filter.init) {
			return;
		}
		filter.init = false;
		// inaktive Filter schließen
		let koepfe = document.querySelectorAll(".filter-kopf"),
			aktive_filter = 0;
		koepfe.forEach(function(i) {
			if ( !i.classList.contains("aktiv") ) {
				i.nextSibling.classList.add("aus");
				return;
			}
			aktive_filter++;
		});
		// sind alle Filter inaktiv => 1. Filter öffnen
		if (!aktive_filter) {
			koepfe[0].nextSibling.classList.remove("aus");
		}
	},
	// Cache mit regulären Ausdrücken für Bedeutungen und Textsorten
	// (wirkt sich wohl positiv auf die Performance aus)
	regCache: {},
	// Karteikarten filtern
	//   karten = Array
	//     (enthält die IDs der Karten, die gefiltert werden sollen)
	kartenFiltern (karten) {
		// zwei Fliegen mit einer Klappe: ermitteln, ob Filter aktiv sind; 
		// Array mit Jahren besorgen, die durch die Filter passen
		let filter_zeitraum = filter.aktiveFilterErmitteln();
		// keine Filter aktiv
		if (!Object.keys(filter.aktiveFilter).length) {
			return karten;
		}
		// aktive Filter in Bedeutungen und Textsorten
		let baumfilter = {
			bd: [],
			ts: [],
		};
		for (let i in filter.aktiveFilter) {
			if ( !filter.aktiveFilter.hasOwnProperty(i) ) {
				continue;
			}
			if ( !/^(bedeutungen|textsorten)-/.test(i) ) {
				continue;
			}
			let f = i.match(/^(.+?)-(.+)/);
			if (f[1] === "bedeutungen") {
				baumfilter.bd.push(f[2]);
			} else if (f[1] === "textsorten") {
				baumfilter.ts.push(f[2]);
			}
		}
		// bei vorhandemen Verschiedenes-Filtern
		let filter_logik = document.getElementById("filter-logik-inklusiv"),
			filter_inklusiv = true;
		if (filter_logik && !filter_logik.checked) {
			filter_inklusiv = false;
		}
		// bei vorhandemen Bewertungsfilter
		let filter_bewertung = document.getElementById("filter-bewertung"),
			be = 0;
		if (filter_bewertung) {
			be = parseInt(filter_bewertung.dataset.bewertung, 10);
		}
		// Karten filtern
		let karten_gefiltert = [],
			vt = helfer.textTrim(document.getElementById("filter-volltext").value),
			vt_reg = new RegExp(helfer.escapeRegExp( helfer.textTrim(vt) ), "i");
		x: for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i];
			// Volltext
			if ( filter.aktiveFilter.volltext && !volltext(id) ) {
				continue;
			}
			// Zeitraum
			if (filter.aktiveFilter.zeitraum) {
				let jahr = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
				if (filter_zeitraum.indexOf(jahr) === -1) {
					continue;
				}
			}
			// Bedeutungen und Textsorten
			for (let bf in baumfilter) {
				if ( !baumfilter.hasOwnProperty(bf) ) {
					continue;
				}
				let arr = baumfilter[bf];
				if (arr.length) {
					let okay = false;
					if (!data.ka[id][bf] && arr.indexOf("undefined") >= 0) {
						okay = true;
					} else if (data.ka[id][bf]) {
						for (let j = 0, len = arr.length; j < len; j++) {
							// Suchausdruck auslesen oder erzeugen
							let reg;
							if (filter.regCache[ arr[j] ]) {
								reg = filter.regCache[ arr[j] ];
							} else {
								reg = new RegExp(`${helfer.escapeRegExp(arr[j])}(:|\n|$)`);
								filter.regCache[ arr[j] ] = reg;
							}
							// suchen
							if ( reg.test(data.ka[id][bf]) ) {
								okay = true;
								break;
							}
						}
					}
					if (!okay) {
						continue x;
					}
				}
			}
			// vollständig oder unvollständig
			if ( filter.aktiveFilter.unvollstaendig &&
					(data.ka[id].un && !filter_inklusiv ||
					!data.ka[id].un && filter_inklusiv) ) {
				continue;
			}
			// Kontext
			if ( filter.aktiveFilter.kontext &&
					(data.ka[id].ko && !filter_inklusiv ||
					!data.ka[id].ko && filter_inklusiv) ) {
				continue;
			}
			// Bücherdienst
			if ( filter.aktiveFilter.buecherdienst &&
					(data.ka[id].bu && !filter_inklusiv ||
					!data.ka[id].bu && filter_inklusiv) ) {
				continue;
			}
			// Buchung
			if ( filter.aktiveFilter.buchung &&
					(data.ka[id].bc && !filter_inklusiv ||
					!data.ka[id].bc && filter_inklusiv) ) {
				continue;
			}
			// Markierung
			if ( filter.aktiveFilter.markierung &&
					(data.ka[id].be && !filter_inklusiv ||
					!data.ka[id].be && filter_inklusiv ||
					data.ka[id].be && filter_inklusiv && be > data.ka[id].be) ) {
				continue;
			}
			// Karte ist okay!
			karten_gefiltert.push(id);
		}
		return karten_gefiltert;
		// Funktion Volltext
		function volltext (id) {
			let okay = false;
			const ds = ["au", "bd", "bs", "da", "no", "qu", "ts"];
			for (let i = 0, len = ds.length; i < len; i++) {
				if ( data.ka[id][ ds[i] ].match(vt_reg) ) {
					okay = true;
					break;
				}
			}
			return okay;
		}
	},
	// ermitteln, welche Jahre durch den Filter gelassen werden
	kartenFilternZeitraum () {
		let inputs = document.querySelectorAll("#filter-zeitraum-dynamisch input"),
			erg = [],
			step = filter.aufbauenZeitraumStep();
		inputs.forEach(function(i) {
			if (!i.checked) {
				return;
			}
			let jahr = parseInt(i.id.match(/[0-9]+$/)[0], 10);
			for (let j = jahr, ende = jahr + step; j < ende; j++) {
				erg.push(j);
			}
		});
		return erg;
	},
	// Aktion für die Steuerungslinks im Kopf der Filterleiste verteilen
	//   a = Element
	//     (Link, der die Aktion triggert)
	ctrlButtons (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let aktion = this.id.replace(/^filter-ctrl-/, "");
			if (aktion === "reset") {
				filter.ctrlReset(true);
			} else if (aktion === "zeitraumgrafik") {
				filter.ctrlGrafik();
			}
		});
	},
	// alle Filter zurücksetzen
	ctrlReset (liste_aufbauen) {
		// Filter zurücksetzen
		document.querySelectorAll("#filter-volltext, #filter-zeitraum-dynamisch input, #liste-filter-dynamisch input").forEach(function(i) {
			if (i.type === "text") {
				i.value = "";
			} else if (i.type === "checkbox") {
				i.checked = false;
			}
		});
		let filter_bewertung = document.getElementById("filter-bewertung");
		if (filter_bewertung) {
			filter_bewertung.dataset.bewertung = "0";
			filter.markierenSterne();
		}
		// ggf. Liste neu aufbauen
		if (liste_aufbauen) {
			liste.status(false);
		}
	},
	// einen einzelnen Filterblock zurücksetzen
	ctrlResetBlock (img) {
		img.addEventListener("click", function(evt) {
			evt.stopPropagation();
			const block = this.parentNode.nextSibling;
			block.querySelectorAll(".filter").forEach(function(i) {
				if (i.type === "text") {
					i.value = "";
				} else if (i.type === "checkbox") {
					i.checked = false;
					// Sonderregel für die Sterne
					if (i.id === "filter-markierung") {
						document.getElementById("filter-bewertung").dataset.bewertung = "0";
						filter.markierenSterne();
					}
				}
			});
			liste.status(false);
		});
	},
	// Zeitraumgrafik generieren und anzeigen
	ctrlGrafik () {
		// Macht es überhaupt Sinn, die Karte anzuzeigen?
		const jahre = Object.keys(filter.zeitraumTrefferCache);
		if (!jahre.length) {
			dialog.oeffnen("alert", null);
			dialog.text("Es sind keine Belege vorhanden.\nDie Verteilungsgrafik wird nicht anzeigt.");
			return;
		} else if (jahre.length === 1) {
			dialog.oeffnen("alert", null);
			dialog.text("Alle Belege befinden sich im selben Zeitraum.\nDie Verteilungsgrafik wird nicht anzeigt.");
			return;
		}
		// Fenster öffnen od. in den Vordergrund holen
		const fenster = document.getElementById("zeitraumgrafik");
		if ( overlay.oeffnen(fenster) ) {
			return;
		}
		// Canvas vorbereiten
		const can = document.querySelector("#zeitraumgrafik-cont canvas"),
			ctx = can.getContext("2d");
		ctx.clearRect(0, 0, can.width, can.height);
		// Daten vorbereiten
		const step_x = Math.floor((can.width - 40 - 20) / (jahre.length - 1)); // Platz: 40px links, 20px rechts
		let treffer_max = 0;
		jahre.forEach(function(i) {
			if (filter.zeitraumTrefferCache[i] > treffer_max) {
				treffer_max = filter.zeitraumTrefferCache[i];
			}
		});
		const step_y = (can.height - 30 - 10) / treffer_max; // Platz: 30px unten, 10px oben
		// x-Linie zeichnen
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#c3d9f1";
		ctx.beginPath();
		ctx.moveTo(40, 370.5);
		ctx.lineTo(680, 370.5);
		ctx.stroke();
		// y-Linie zeichnen
		ctx.beginPath();
		ctx.moveTo(40.5, 10);
		ctx.lineTo(40.5, 370);
		ctx.stroke();
		ctx.closePath();
		// Diagramm zeichnen
		ctx.lineWidth = 3;
		ctx.strokeStyle = "#72a0cf";
		ctx.font = "14px DejaVu Sans";
		ctx.textAlign = "left";
		let x = 40 - step_x,
			last_font_x = 0;
		for (let i = 0, len = jahre.length; i < len; i++) {
			x += step_x;
			let y = can.height - 30 - Math.round(step_y * filter.zeitraumTrefferCache[ jahre[i] ]) + 0.5; // 30px Platz unten (s.o.)
			if (i === 0) {
				ctx.beginPath();
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
			if (x - last_font_x < 50 && i !== 0) { // Jahreszahlen brauchen ein wenig Platz => nicht zu viele anzeigen
				continue;
			}
			ctx.fillText(jahre[i], x - 17, 390); // Jahreszahlen in 14px DejaVu Sans sind 34px breit
			last_font_x = x;
		}
		ctx.stroke();
		// Treffer an der y-Linie auftragen
		ctx.textAlign = "right";
		let last_font_y = 370;
		for (let i = 1; i <= treffer_max; i++) {
			let y = 370 + 5 - i * step_y; // der Text ist 11px hoch, darum hier + 5
			if (last_font_y - y < 20) { // die Anzahl der Treffer braucht ein wenig Platz => nicht zu eng staffeln
				continue;
			}
			last_font_y = y;
			ctx.fillText(i, 32, y);
		}
	},
	// klappt die Filterblöcke auf oder zu (Event-Listener)
	anzeigeUmschalten (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			this.nextSibling.classList.toggle("aus");
			if ( this.classList.contains("aktiv") ) {
				this.blur();
			}
		});
	},
	// die Suche wird aufgerufen
	suche () {
		// Sicherheitsfrage, falls Beleg und/oder Notizen noch nicht gespeichert sind
		if (notizen.geaendert || beleg.geaendert) {
			sicherheitsfrage.warnen(function() {
				notizen.geaendert = false;
				beleg.geaendert = false;
				filter.suche();
			}, {
				notizen: true,
				beleg: true,
				kartei: false,
			});
			return;
		}
		// Beleg schließen
		beleg.aktionAbbrechen();
		// alle Overlays schließen (da gehört auch das Notizen-Fenster zu)
		overlay.alleSchliessen();
		// ggf. Filter öffnen
		if (!optionen.data.belegliste.filterleiste) {
			liste.headerFilter();
		}
		// Suche öffnen
		let input = document.getElementById("filter-volltext");
		input.parentNode.parentNode.classList.remove("aus");
		// Suchfeld fokussieren
		input.select();
	},
};
