"use strict";

let filter = {
	// zeigt an, dass keine Filter vorhanden sind
	//   keine = Boolean
	//     (es sind keine Filter vorhanden)
	keineFilter (keine) {
		const filterliste = document.getElementById("liste-filter");
		if (keine) {
			filterliste.classList.add("keine-filter");
		} else {
			filterliste.classList.remove("keine-filter");
		}
	},
	// speichert die ID des Filterblocks, in dem die BenutzerIn
	// vor dem Neuaufbau der Belegliste aktiv gewesen ist
	zuletztAktiv: "",
	// die ID des zuletzt aktiven Filterblocks ermitteln
	//   ele = Element
	//     (das Element, das geändert wurde
	setZuletztAktiv (ele) {
		while (!ele.classList.contains("filter-cont")) {
			ele = ele.parentNode;
		}
		ele = ele.previousSibling;
		filter.zuletztAktiv = ele.id;
	},
	// Zwischenspeicher für die dynamischen Filtertypen
	typen: {},
	// Liste der Filter aufbauen
	//   belege = Array
	//     (die IDs der Belege, bereits chronologisch sortiert)
	aufbauen (belege) {
		// Backup des Klappstatus erstellen
		filter.backupKlappMake();
		// Backup der Filtereinstellungen erstellen
		let filter_backup = filter.backup();
		// Zeitraum-Filter
		if (!optionen.data.belegliste.sort_aufwaerts) {
			belege.reverse();
		}
		if (!belege.length) {
			filter.zeitraumStart = "";
		} else {
			filter.zeitraumStart = liste.zeitschnittErmitteln(data.ka[belege[0]].da).jahr;
			filter.zeitraumEnde = liste.zeitschnittErmitteln(data.ka[belege[belege.length - 1]].da).jahr;
			// Zwischenspeicher für die Jahre der Belge füllen
			filter.jahrBelegeFuellen(belege);
		}
		filter.aufbauenZeitraum();
		// dynamische Filter und Anzahl der passenden Karten ermitteln
		filter.typen = {
			bedeutungen: {
				name: "Bedeutungen",
				filter_vorhanden: belege.length ? true : false,
				filter: {
					"bedeutungen-undefined": {
						name: "(nicht bestimmt)",
						wert: 0,
					},
				},
				filter_folge: ["bedeutungen-undefined"],
			},
			korpora: {
				name: "Korpora",
				filter_vorhanden: belege.length ? true : false,
				filter: {
					"korpora-undefined": {
						name: "(nicht bestimmt)",
						wert: 0,
					},
				},
				filter_folge: ["korpora-undefined"],
			},
			textsorten: {
				name: "Textsorten",
				filter_vorhanden: belege.length ? true : false,
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
				filter_vorhanden: filter.exklusivAktiv.length ? true : false,
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
		let baeume = [
			{
				data: "bd",
				typen: "bedeutungen",
			},
			{
				data: "kr",
				typen: "korpora",
			},
			{
				data: "ts",
				typen: "textsorten",
			},
		];
		for (let x = 0, len = belege.length; x < len; x++) {
			let id = belege[x];
			// BEDEUTUNGEN, KORPORA UND TEXTSORTEN
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
					if (!filter.typen[t].filter[b[j]]) {
						let name = b[j].replace(/^.+?-/, "").split(": ");
						filter.typen[t].filter[b[j]] = {
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
					if (schon_gezaehlt.has(b[j])) {
						continue;
					}
					// Filter zählen
					filter.typen[t].filter[b[j]].wert++;
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
		// Bedeutungen, Korpora und Textsorten sortieren
		let arr_typen = ["bedeutungen", "korpora", "textsorten"];
		for (let i = 0, len = arr_typen.length; i < len; i++) {
			let arr = filter.typen[arr_typen[i]].filter_folge;
			arr.sort(filter.baumSort);
		}
		// dynamische Filter drucken
		const cont = document.getElementById("liste-filter-dynamisch");
		helfer.keineKinder(cont);
		for (let block in filter.typen) {
			if (!filter.typen.hasOwnProperty(block)) {
				continue;
			}
			if (!filter.typen[block].filter_vorhanden) {
				continue;
			}
			cont.appendChild(filter.aufbauenCont(filter.typen[block].name));
			if (block === "verschiedenes") {
				cont.lastChild.appendChild(filter.aufbauenFilterlogik());
			}
			const f = filter.typen[block].filter_folge;
			for (let i = 0, len = f.length; i < len; i++) {
				const neuer_filter = filter.aufbauenFilter(f[i], filter.typen[block].filter[f[i]]);
				// kein neuer Filter
				if (!neuer_filter[0]) {
					continue;
				}
				// in Filterbaum einhängen
				//   [0] = Document-Fragment
				//   [1] = Verschachtelungstiefe; 0 = ohne Verschachtelung, 1 = 1. Ebene usw.
				if (neuer_filter[1] > 0) {
					const schachtel = schachtelFinden(neuer_filter[0].firstChild.dataset.f);
					schachtel.appendChild(neuer_filter[0]);
				} else if (neuer_filter[1] === 0) { // die Bedeutung ist unterhalb einer Baumstruktur
					cont.lastChild.appendChild(neuer_filter[0]);
				}
			}
		}
		// Backup der Filtereinstellungen wiederherstellen
		filter.backupWiederher(filter_backup);
		// ggf. Markierung der Sterne wiederherstellen
		filter.markierenSterne();
		// erneut aktive Filter ermitteln
		filter.aktiveFilterErmitteln(true);
		// sucht das <div>, in den ein Filter verschachtelt werden muss
		function schachtelFinden(f) {
			// Filter kürzen
			let bd_arr = f.split(": ");
			if (bd_arr.length > 1) {
				bd_arr.pop();
			}
			f = bd_arr.join(": ");
			// Schachtel suchen
			const schachtel = cont.lastChild.querySelector(`[data-f^="${f}"]`);
			if (schachtel) {
				return schachtel;
			}
			// nichts gefunden => weiter kürzen
			schachtelFinden(f);
		}
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
	//   belege = Array
	//     (IDs der aktuellen Belege)
	jahrBelegeFuellen (belege) {
		filter.jahrBelege = {};
		for (let i = 0, len = belege.length; i < len; i++) {
			const id = belege[i];
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
			if (!filter.jahrBelege.hasOwnProperty(id)) {
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
			filter.setZuletztAktiv(this);
			optionen.data.filter.zeitraum = this.id.match(/[0-9]+$/)[0];
			optionen.speichern(false);
			filter.aufbauenZeitraum();
			filter.aktiveFilterErmitteln(false);
			liste.status(true);
		});
	},
	// extrahiert die einzelnen Schichten, die in einer Bedeutungs- oder Textsortenangabe stecken
	// (wird auch für die Korpora benutzt, weil es so leichter ist)
	//   baum = String
	//     (Bedeutungs- bzw. Textsortenbaum oder Korpus als einzeiliger String)
	//   dt = String
	//     (Datentyp, also entweder "bedeutungen", "korpora", "textsorten" oder "")
	baumExtrakt (baum, dt) {
		if (/^(bedeutungen|korpora|textsorten)/.test(dt)) {
			dt += "-";
		}
		let extrakt = [],
			gruppen = baum.split("\n");
		for (let i = 0, len = gruppen.length; i < len; i++) {
			let untergruppen = gruppen[i].split(": "),
				konstrukt = [];
			for (let j = 0, len = untergruppen.length; j < len; j++) {
				konstrukt.push(untergruppen[j]);
				extrakt.push(`${dt}${konstrukt.join(": ")}`);
			}
		}
		return extrakt;
	},
	// Array mit Bedeutungsschichten sortieren, die aus Bedeutungs-, Korpus- und
	// Textsortenangaben extrahiert wurden
	baumSort (a, b) {
		// undefined wird an den Anfang gesetzt
		if (/undefined$/.test(a)) {
			return -1;
		} else if (/undefined$/.test(b)) {
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
		span.title = "Filter in diesem Block zurücksetzen";
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
		p.classList.add("no-indent");
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
			filter.setZuletztAktiv(this);
			optionen.data.filter.logik = this.id.match(/[a-z]+$/)[0];
			optionen.speichern(false);
			liste.status(true);
		});
	},
	// Absatz mit einem Checkbox-Filter erzeugen
	//   f = String
	//     (Name des Filters)
	//   obj = Object
	//     (Daten zum Filter)
	aufbauenFilter (f, obj) {
		// Muss der Filter wirklich gedruckt werden?
		if (!obj.wert && filter.exklusivAktiv.indexOf(f) === -1) {
			return false;
		}
		// Sollte der Filter als Filterbaum dargestellt werden?
		let baum = f.match(/: /g),
			baum_tiefe = 0;
		if (baum) {
			baum_tiefe = baum.length;
		}
		// in der Filter-ID sind wahrscheinlich Leerzeichen
		const f_enc = encodeURI(f);
		// Filter drucken
		let frag = document.createDocumentFragment(),
			div = document.createElement("div"),
			p = document.createElement("p");
		div.appendChild(p);
		div.classList.add("filter-baum");
		div.dataset.f = f;
		frag.appendChild(div);
		// Input
		let input = document.createElement("input");
		input.classList.add("filter");
		input.id = `filter-${f_enc}`;
		input.type = "checkbox";
		filter.anwenden(input);
		p.appendChild(input);
		// Label
		let label = document.createElement("label");
		label.setAttribute("for", `filter-${f_enc}`);
		label.textContent = obj.name;
		p.appendChild(label);
		// Anzahl der Belege
		let span = document.createElement("span");
		span.classList.add("filter-treffer");
		span.textContent = `(${obj.wert})`;
		span.title = `Anzahl der Belege, auf die der Filter „${obj.name}“ zutrifft`;
		p.appendChild(span);
		// ggf. Absatz mit Sternen aufbauen
		if (f === "markierung") {
			frag.lastChild.classList.add("markierung");
			frag.appendChild(filter.aufbauenSterne());
		}
		// Fragment zurückgeben
		return [frag, baum_tiefe];
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
	// speichert den Klappstatus der Filterblöcke
	backupKlapp: {},
	// Backup des Klappstatus der Filterblöcke erstellen
	backupKlappMake () {
		filter.backupKlapp = {};
		document.querySelectorAll(".filter-kopf").forEach(function(i) {
			const id = i.id,
				div = i.nextSibling;
			let aus = false;
			if (div.classList.contains("aus")) {
				aus = true;
			}
			filter.backupKlapp[id] = aus;
		});
	},
	// Backup des Klappstatust der Filterblöcke wiederherstellen
	backupKlappReset () {
		document.querySelectorAll(".filter-kopf").forEach(function(i) {
			const id = i.id;
			if (filter.backupKlapp[id] === undefined ||
					filter.backupKlapp[id]) {
				i.nextSibling.classList.add("aus");
			}
		});
	},
	// beim Ändern eines Filters die Optionen anpassen (Listener)
	//   checkbox = Element
	//     (Input-Element, das geändert wurde [wohl immer eine Checkbox])
	filterOptionenListener (checkbox) {
		checkbox.addEventListener("change", function() {
			filter.filterOptionen(this, true);
		});
	},
	// beim Ändern eines Filters die Optionen anpassen (Listener)
	//   checkbox = Element
	//     (Input-Element, das geändert wurde [wohl immer eine Checkbox])
	//   refresh = Boolean
	//     (auffrischen der Belegliste anstoßen)
	filterOptionen (checkbox, refresh) {
		const opt = checkbox.id.replace(/^filter-/, "");
		optionen.data.filter[opt] = checkbox.checked;
		optionen.speichern(false);
		if (refresh) {
			filter.setZuletztAktiv(checkbox);
			liste.status(true);
		}
	},
	// erweiterte Filter umschalten
	toggleErweiterte () {
		document.getElementById("filter-erweiterte").addEventListener("click", function(evt) {
			evt.preventDefault();
			filter.setZuletztAktiv(this);
			this.classList.toggle("aktiv");
			const cont = document.getElementById("filter-erweiterte-cont");
			if (this.classList.contains("aktiv")) {
				cont.classList.remove("aus");
			} else {
				cont.classList.add("aus");
			}
			liste.status(true);
		});
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
			filter.setZuletztAktiv(this);
			if (this.id === "filter-volltext") {
				filter.volltextSuchePrep();
			}
			clearTimeout(filter.anwendenTimeout);
			filter.anwendenTimeout = setTimeout(() => liste.status(true), timeout);
		});
		// das Volltextsuch-Feld sollte auch auf Enter hören
		if (input.type === "text") {
			input.addEventListener("keydown", function(evt) {
				if (evt.which === 13) {
					filter.volltextSuchePrep();
					liste.status(true);
				}
			});
		}
	},
	anwendenSterne (stern) {
		filter.setZuletztAktiv(stern);
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
		liste.status(true);
	},
	// Zwischenspeicher für die zur Zeit aktiven Filter
	aktiveFilter: {},
	// ermittelt, welche Filter gerade aktiv sind
	//   inaktive = Boolean
	//     (Funktion zum Schließen der inaktiven Filter aufrufen)
	aktiveFilterErmitteln (inaktive) {
		filter.aktiveFilter = {};
		document.querySelectorAll(".filter").forEach(function(i) {
			if (i.type === "text" && i.value ||
					i.type === "checkbox" && i.checked) {
				let id = decodeURI(i.id.replace(/^filter-/, "")); // Filter-ID könnte enkodiert sein
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
			if (!filter.typen.hasOwnProperty(typ)) {
				continue;
			}
			for (let f in filter.typen[typ].filter) {
				if (!filter.typen[typ].filter.hasOwnProperty(f)) {
					continue;
				}
				const f_check = document.getElementById(`filter-${encodeURI(f)}`);
				if (f_check && f_check.checked) {
					filter.aktiveFilter[typ] = true;
					break;
				}
			}
		}
		// die gerade aktiven Filterblöcke als solche markieren
		filter.aktiveFilterMarkieren();
		// ggf. inaktive Filterblöcke ggf. schließen
		if (inaktive) {
			filter.inaktiveSchliessen(false);
		}
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
	// inaktive Filter nach dem Neuaufbau der Filterliste schließen;
	// der Filter, in dem man zuletzt aktiv war, bleibt allerdings immer offen
	//   immer = Boolean
	//     (inaktive Filter werden immer geschlossen, egal wie die Einstellungen sind)
	inaktiveSchliessen (immer) {
		// Sollen die inaktiven Filterblöcke wirklich automatisch geschlossen werden?
		if (!immer && !optionen.data.einstellungen["filter-inaktive"]) {
			filter.backupKlappReset();
			return;
		}
		// inaktive Filter schließen
		let koepfe = document.querySelectorAll(".filter-kopf"),
			aktive_filter = false;
		koepfe.forEach(function(i) {
			if (!i.classList.contains("aktiv") && i.id !== filter.zuletztAktiv) {
				i.nextSibling.classList.add("aus");
				return;
			}
			aktive_filter = true;
		});
		// sind alle Filter inaktiv => 1. Filter öffnen
		if (!aktive_filter) {
			koepfe[0].nextSibling.classList.remove("aus");
		}
	},
	// Cache mit regulären Ausdrücken für Bedeutungen, Korpora und Textsorten
	// (wirkt sich wohl positiv auf die Performance aus)
	regCacheBaum: {},
	// Zwischenspeicher für die Daten der Volltextsuche
	volltextSuche: {
		suche: false,
		ds: [],
		reg: [],
	},
	// Variablen für die Volltextsuche vorbereiten
	volltextSuchePrep () {
		// Filter-Text ermitteln
		const vt = helfer.textTrim(document.getElementById("filter-volltext").value, true);
		// kein Filtertext
		if (!vt) {
			filter.volltextSuche.suche = false;
			return;
		}
		filter.volltextSuche.suche = true;
		// erweiterte Filter aktiv?
		const erweiterte = document.getElementById("filter-erweiterte").classList.contains("aktiv");
		// zu durchsuchende Datensätze
		filter.volltextSuche.ds = [];
		document.querySelectorAll(`input[id^="filter-feld-"]`).forEach(function(i) {
			if (erweiterte && i.checked ||
					!erweiterte) {
				const id = i.id.replace(/^filter-feld-/, "");
				filter.volltextSuche.ds.push(id);
			}
		});
		// reguläre Suchausdrücke
		filter.volltextSuche.reg = [];
		let insensitiv = "gi";
		if (erweiterte && document.getElementById("filter-text-genau").checked) {
			insensitiv = "g";
		}
		let chunks = vt.split(/\s/);
		if (erweiterte && document.getElementById("filter-phrase").checked) {
			chunks = [vt];
		}
		const ganzes_wort = document.getElementById("filter-ganzes-wort").checked;
		chunks.forEach(function(i) {
			if (!i) { // i dürfte eigentlich nicht leer sein, aber sicher ist sicher
				return;
			}
			let reg = helfer.formVariSonderzeichen(helfer.escapeRegExp(i));
			if (erweiterte && ganzes_wort) {
				reg = `(?<vor>^|[${helfer.ganzesWortRegExp.links}]+)(?<wort>${reg})(?<nach>$|[${helfer.ganzesWortRegExp.rechts}]+)`;
			}
			filter.volltextSuche.reg.push(new RegExp(reg, insensitiv));
		});
	},
	// Array mit den aktiven Verschiedenes-Filtern bei exklusiver Filterlogik
	exklusivAktiv: [],
	// aktive Verschiedenes-Filter bei exklusiver Filterlogik finden
	getExklusivAktiv () {
		filter.exklusivAktiv = [];
		const inputs = document.querySelectorAll("#filter-kopf-verschiedenes + div .filter");
		inputs.forEach(function(i) {
			if (!i.checked) {
				return;
			}
			const id = i.id.replace(/^filter-/, "");
			filter.exklusivAktiv.push(id);
		});
	},
	// Karteikarten filtern
	//   karten = Array
	//     (enthält die IDs der Karten, die gefiltert werden sollen)
	kartenFiltern (karten) {
		// zwei Fliegen mit einer Klappe: ermitteln, ob Filter aktiv sind; 
		// Array mit Jahren besorgen, die durch die Filter passen
		let filter_zeitraum = filter.aktiveFilterErmitteln(false);
		// keine Filter aktiv
		if (!Object.keys(filter.aktiveFilter).length) {
			return karten;
		}
		// aktive Filter in Bedeutungen, Korpora und Textsorten
		let baumfilter = {
			bd: [],
			kr: [],
			ts: [],
		};
		for (let i in filter.aktiveFilter) {
			if (!filter.aktiveFilter.hasOwnProperty(i)) {
				continue;
			}
			if (!/^(bedeutungen|korpora|textsorten)-/.test(i)) {
				continue;
			}
			let f = i.match(/^(.+?)-(.+)/);
			if (f[1] === "bedeutungen") {
				baumfilter.bd.push(f[2]);
			} else if (f[1] === "korpora") {
				baumfilter.kr.push(f[2]);
			} else if (f[1] === "textsorten") {
				baumfilter.ts.push(f[2]);
			}
		}
		// bei vorhandemen Verschiedenes-Filtern
		let filter_logik = document.getElementById("filter-logik-inklusiv"),
			filter_inklusiv = true;
		if (filter_logik && !filter_logik.checked) {
			filter_inklusiv = false;
			filter.getExklusivAktiv();
		} else {
			filter.exklusivAktiv = [];
		}
		// bei vorhandemen Bewertungsfilter
		let filter_bewertung = document.getElementById("filter-bewertung"),
			be = 0;
		if (filter_bewertung) {
			be = parseInt(filter_bewertung.dataset.bewertung, 10);
		}
		// Volltextsuche vorbereiten
		// (wird zwar auch "oninput" aufgerufen, es könnte aber sein, dass die Suche
		// durch eine Änderung der Checkboxes oder Öffnen/Schließen des Erweiterungs-
		// filters aufgerufen wird)
		filter.volltextSuchePrep();
		// Karten filtern
		let karten_gefiltert = [];
		x: for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i];
			// Volltext
			if (filter.aktiveFilter.volltext && !filter.kartenFilternVolltext(id)) {
				continue;
			}
			// Zeitraum
			if (filter.aktiveFilter.zeitraum) {
				let jahr = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
				if (filter_zeitraum.indexOf(jahr) === -1) {
					continue;
				}
			}
			// Bedeutungen, Korpora und Textsorten
			for (let bf in baumfilter) {
				if (!baumfilter.hasOwnProperty(bf)) {
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
							if (filter.regCacheBaum[arr[j]]) {
								reg = filter.regCacheBaum[arr[j]];
							} else {
								reg = new RegExp(`${helfer.escapeRegExp(arr[j])}(:|\n|$)`);
								filter.regCacheBaum[arr[j]] = reg;
							}
							// suchen
							if (reg.test(data.ka[id][bf])) {
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
			if (filter.aktiveFilter.unvollstaendig &&
					(data.ka[id].un && !filter_inklusiv ||
					!data.ka[id].un && filter_inklusiv)) {
				continue;
			}
			// Kontext
			if (filter.aktiveFilter.kontext &&
					(data.ka[id].ko && !filter_inklusiv ||
					!data.ka[id].ko && filter_inklusiv)) {
				continue;
			}
			// Bücherdienst
			if (filter.aktiveFilter.buecherdienst &&
					(data.ka[id].bu && !filter_inklusiv ||
					!data.ka[id].bu && filter_inklusiv)) {
				continue;
			}
			// Buchung
			if (filter.aktiveFilter.buchung &&
					(data.ka[id].bc && !filter_inklusiv ||
					!data.ka[id].bc && filter_inklusiv)) {
				continue;
			}
			// Markierung
			if (filter.aktiveFilter.markierung &&
					(data.ka[id].be && !filter_inklusiv ||
					!data.ka[id].be && filter_inklusiv ||
					data.ka[id].be && filter_inklusiv && be > data.ka[id].be)) {
				continue;
			}
			// Karte ist okay!
			karten_gefiltert.push(id);
		}
		return karten_gefiltert;
	},
	// Volltextfilter
	//   id = String
	//     (die ID der Karteikarte)
	kartenFilternVolltext (id) {
		// keine Volltextsuche
		if (!filter.volltextSuche.suche) {
			return true;
		}
		// Volltextsuche
		let treffer = Array(filter.volltextSuche.reg.length).fill(false);
		for (let i = 0, len = filter.volltextSuche.ds.length; i < len; i++) {
			const ds = filter.volltextSuche.ds[i];
			let text_rein = data.ka[id][ds].replace(/<.+?>/g, "");
			text_rein = liste.belegTrennungWeg(text_rein, true);
			for (let j = 0, len = treffer.length; j < len; j++) {
				const reg = filter.volltextSuche.reg[j];
				if (text_rein.match(reg)) {
					treffer[j] = true;
				}
			}
			if (treffer.indexOf(false) === -1) {
				return true;
			}
		}
		return false;
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
			} else if (aktion === "reduzieren") {
				filter.ctrlReduzierenToggle();
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
		filter.volltextSuche.suche = false;
		let filter_bewertung = document.getElementById("filter-bewertung");
		if (filter_bewertung) {
			filter_bewertung.dataset.bewertung = "0";
			filter.markierenSterne();
		}
		// ggf. Liste neu aufbauen
		if (liste_aufbauen) {
			filter.zuletztAktiv = "";
			liste.status(true);
		}
		// inaktive Filter schließen
		filter.inaktiveSchliessen(true);
	},
	// einen einzelnen Filterblock zurücksetzen
	ctrlResetBlock (img) {
		img.addEventListener("click", function(evt) {
			evt.stopPropagation();
			filter.zuletztAktiv = this.parentNode.id;
			const block = this.parentNode.nextSibling;
			block.querySelectorAll(".filter").forEach(function(i) {
				if (i.type === "text") {
					i.value = "";
					if (i.id === "filter-volltext") {
						filter.volltextSuche.suche = false;
					}
				} else if (i.type === "checkbox") {
					i.checked = false;
					// Sonderregel für die Sterne
					if (i.id === "filter-markierung") {
						document.getElementById("filter-bewertung").dataset.bewertung = "0";
						filter.markierenSterne();
					}
				}
			});
			liste.status(true);
		});
	},
	// Zeitraumgrafik generieren und anzeigen
	ctrlGrafik () {
		// Macht es überhaupt Sinn, die Karte anzuzeigen?
		const jahre = Object.keys(filter.zeitraumTrefferCache);
		if (jahre.length === 1) {
			dialog.oeffnen("alert", null);
			dialog.text("Alle Belege befinden sich im selben Zeitraum.\nDie Verteilungsgrafik wird nicht anzeigt.");
			return;
		}
		// Fenster öffnen od. in den Vordergrund holen
		const fenster = document.getElementById("zeitraumgrafik");
		if (overlay.oeffnen(fenster)) {
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
		ctx.font = "14px Noto Sans";
		ctx.textAlign = "left";
		let x = 40 - step_x,
			last_font_x = 0;
		for (let i = 0, len = jahre.length; i < len; i++) {
			x += step_x;
			let y = can.height - 30 - Math.round(step_y * filter.zeitraumTrefferCache[jahre[i]]) + 0.5; // 30px Platz unten (s.o.)
			if (i === 0) {
				ctx.beginPath();
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
			if (x - last_font_x < 50 && i !== 0) { // Jahreszahlen brauchen ein wenig Platz => nicht zu viele anzeigen
				continue;
			}
			ctx.fillText(jahre[i], x - 16, 390); // Jahreszahlen in 14px Noto Sans sind 32px breit
			last_font_x = x;
		}
		ctx.stroke();
		// Treffer an der y-Linie auftragen
		ctx.textAlign = "right";
		let last_font_y = 370;
		for (let i = 1; i <= treffer_max; i++) {
			let y = 370 + 5 - i * step_y; // der Text ist 11px hoch, darum hier + 5
			if (last_font_y - y < 30) { // die Anzahl der Treffer braucht ein wenig Platz => nicht zu eng staffeln
				continue;
			}
			last_font_y = y;
			ctx.fillText(i, 32, y);
		}
	},
	// Reduktionsmodus der Filter umschalten
	ctrlReduzierenToggle () {
		optionen.data.filter.reduzieren = !optionen.data.filter.reduzieren;
		optionen.speichern(false);
		filter.ctrlReduzierenAnzeige();
	},
	// Reduktionsmodus der Filter visualisieren
	ctrlReduzierenAnzeige () {
		const link = document.getElementById("filter-ctrl-reduzieren");
		if (optionen.data.filter.reduzieren) {
			link.classList.add("aktiv");
			link.title = "Reduktionsmodus ausschalten";
		} else {
			link.classList.remove("aktiv");
			link.title = "Reduktionsmodus einschalten";
		}
	},
	// Datensätze im Volltextfilter en bloc umschalten
	//   a = Element
	//     (Link, über den das Umschalten gesteuert wird)
	ctrlVolltextDs (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			filter.setZuletztAktiv(this);
			let alle = true;
			if (/keine$/.test(this.id)) {
				alle = false;
			}
			document.querySelectorAll(`input[id^="filter-feld-"]`).forEach(function(i) {
				if (alle) {
					i.checked = true;
				} else {
					i.checked = false;
				}
				filter.filterOptionen(i, false);
			});
			liste.status(true);
		});
	},
	// klappt die Filterblöcke auf oder zu (Event-Listener)
	anzeigeUmschalten (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// wenn nur ein Filter offen sein sollte und der aktive Filter gerade zugeklappt ist
			if (optionen.data.einstellungen["filter-zuklappen"]) {
				document.querySelectorAll(".filter-kopf").forEach(function(i) {
					if (i === this) {
						i.nextSibling.classList.toggle("aus");
					} else {
						i.nextSibling.classList.add("aus");	
					}
				}, this);
				return;
			}
			// wenn mehrere Filter offen sein dürfen
			this.nextSibling.classList.toggle("aus");
			if (this.classList.contains("aktiv")) {
				this.blur();
			}
		});
	},
	// die Suche wird aufgerufen
	suche () {
		// Sicherheitsfrage, falls Notizen, Beleg, Bedeutungen noch nicht gespeichert sind
		if (notizen.geaendert || bedeutungen.geaendert || beleg.geaendert) {
			sicherheitsfrage.warnen(function() {
				notizen.geaendert = false;
				bedeutungen.geaendert = false;
				beleg.geaendert = false;
				filter.suche();
			}, {
				notizen: true,
				bedeutungen: true,
				beleg: true,
				kartei: false,
			});
			return;
		}
		// Bedeutungen schließen
		bedeutungen.schliessen();
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
