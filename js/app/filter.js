"use strict";

let filter = {
	// zeigt an, dass keine Filter vorhanden sind
	//   keine = Boolean
	//     (es sind keine Filter vorhanden)
	keineFilter (keine) {
		let filterliste = document.getElementById("liste-filter");
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
		// Backup des Klappstatus und der Scrollposition erstellen
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
		// Variablen für dynamische Filter
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
			wortbildungen: {
				name: "Wortbildungen",
				filter_vorhanden: false,
				filter: {},
				filter_folge: [],
			},
			synonyme: {
				name: "Synonyme",
				filter_vorhanden: false,
				filter: {},
				filter_folge: [],
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
					"verschiedenes-unvollstaendig": {
						name: "unvollständig",
						wert: 0,
					},
					"verschiedenes-ungeprueft": {
						name: "ungeprüft",
						wert: 0,
					},
					"verschiedenes-kontext": {
						name: "Kontext?",
						wert: 0,
					},
					"verschiedenes-buecherdienst": {
						name: "Bücherdienst",
						wert: 0,
					},
					"verschiedenes-notizen": {
						name: "Notizen",
						wert: 0,
					},
					"verschiedenes-buchung": {
						name: "Buchung",
						wert: 0,
					},
					"verschiedenes-metatext": {
						name: "Metatext",
						wert: 0,
					},
					"verschiedenes-annotierung": {
						name: "Annotierung",
						wert: 0,
					},
					"verschiedenes-markierung": {
						name: "Markierung",
						wert: 0,
					},
				},
				filter_folge: [
					"verschiedenes-unvollstaendig",
					"verschiedenes-ungeprueft",
					"verschiedenes-kontext",
					"verschiedenes-buecherdienst",
					"verschiedenes-notizen",
					"verschiedenes-buchung",
					"verschiedenes-annotierung",
					"verschiedenes-metatext",
					"verschiedenes-markierung",
				],
			},
		};
		let baeume = [
			{
				data: "bl",
				typen: "wortbildungen",
			},
			{
				data: "sy",
				typen: "synonyme",
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
		// alle Bedeutungen aus dem aktuellen Bedeutungsgerüst pushen
		let bd = data.bd.gr[data.bd.gn].bd;
		for (let i = 0, len = bd.length; i < len; i++) {
			const id = `bedeutungen-${data.bd.gn}_${bd[i].id}`;
			let name = bd[i].bd[bd[i].bd.length - 1];
			if (bd[i].al) {
				name = bd[i].al;
			}
			filter.typen.bedeutungen.filter[id] = {
				name: name,
				wert: 0,
			};
			filter.typen.bedeutungen.filter_folge.push(id);
		}
		// dynamische Filter und Anzahl der passenden Karten ermitteln
		let regAnnotierung = /farbe[1-9]/;
		if (optionen.data.einstellungen["filter-transparente"]) {
			regAnnotierung = /farbe[0-9]/;
		}
		for (let x = 0, len = belege.length; x < len; x++) {
			let id = belege[x];
			// BEDEUTUNGEN
			let bdGefunden = false;
			for (let i = 0, len = data.ka[id].bd.length; i < len; i++) {
				if (data.ka[id].bd[i].gr !== data.bd.gn) {
					continue;
				}
				bdGefunden = true;
				const idBd = `bedeutungen-${data.bd.gn}_${data.ka[id].bd[i].id}`;
				filter.typen.bedeutungen.filter[idBd].wert++;
			}
			if (!bdGefunden) {
				filter.typen.bedeutungen.filter["bedeutungen-undefined"].wert++;
			}
			// WORTBILDUNGEN, SYNONYME, KORPORA UND TEXTSORTEN
			for (let i = 0, len = baeume.length; i < len; i++) {
				let d = baeume[i].data,
					t = baeume[i].typen;
				if (!data.ka[id][d]) {
					if (!/^(bl|sy)$/.test(d)) { // Wortbildung und Synonym hat kein undefined-Feld
						filter.typen[t].filter[`${t}-undefined`].wert++;
					}
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
					// Wenn mehrere Textsorten usw. in einem Beleg auftauchen
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
			// WORTBILDUNGEN
			if (data.ka[id].bl) {
				filter.typen.wortbildungen.filter_vorhanden = true;
			}
			// SYNONYM
			if (data.ka[id].sy) {
				filter.typen.synonyme.filter_vorhanden = true;
			}
			// VERSCHIEDENES
			// Vollständigkeit
			if (data.ka[id].un) {
				filter.typen.verschiedenes.filter["verschiedenes-unvollstaendig"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// ungeprüft
			if (data.ka[id].up) {
				filter.typen.verschiedenes.filter["verschiedenes-ungeprueft"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Kontext
			if (data.ka[id].ko) {
				filter.typen.verschiedenes.filter["verschiedenes-kontext"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Bücherdienst
			if (data.ka[id].bu) {
				filter.typen.verschiedenes.filter["verschiedenes-buecherdienst"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Notizen
			if (data.ka[id].no) {
				filter.typen.verschiedenes.filter["verschiedenes-notizen"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Buchung
			if (data.ka[id].bc) {
				filter.typen.verschiedenes.filter["verschiedenes-buchung"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Annotierung
			if (/annotierung-wort/.test(data.ka[id].bs) && regAnnotierung.test(data.ka[id].bs)) {
				filter.typen.verschiedenes.filter["verschiedenes-annotierung"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Metatext
			if (data.ka[id].mt) {
				filter.typen.verschiedenes.filter["verschiedenes-metatext"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
			// Markierung
			if (data.ka[id].be) {
				filter.typen.verschiedenes.filter["verschiedenes-markierung"].wert++;
				filter.typen.verschiedenes.filter_vorhanden = true;
			}
		}
		// statistische Angaben der Bedeutungen um die untergeordneten Bedeutungen ergänzen
		filter.statistikBd(belege);
		// wegen der Möglichkeit, aus dem Bedeutungsgerüst-Fenster Bedeutungen zu entfernen,
		// kann es sein, dass eine Bedeutung aktiv ist, aber gar nicht mehr gefunden 
		// werden kann; in solchen Fällen lässt sie sich nicht mehr deaktivieren, weswegen
		// in der Liste keine Belege mehr gefunden werden können => solche Bedeutungen
		// müssen deaktiviert werden
		for (let a in filter.aktiveFilter) {
			if (!filter.aktiveFilter.hasOwnProperty(a)) {
				continue;
			}
			if (!/^bedeutungen-/.test(a)) {
				continue;
			}
			if (!filter.typen.bedeutungen.filter[a] ||
					!filter.typen.bedeutungen.filter[a].wert) {
				filter_backup[`filter-${a}`] = false;
			}
		}
		// Wortbildungen, Synonyme, Korpora und Textsorten sortieren
		let arr_typen = ["wortbildungen", "synonyme", "korpora", "textsorten"];
		for (let i = 0, len = arr_typen.length; i < len; i++) {
			let arr = filter.typen[arr_typen[i]].filter_folge;
			arr.sort(filter.baumSort);
		}
		// dynamische Filter drucken
		let cont = document.getElementById("liste-filter-dynamisch");
		cont.replaceChildren();
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
			let f = filter.typen[block].filter_folge;
			for (let i = 0, len = f.length; i < len; i++) {
				let neuer_filter = filter.aufbauenFilter(f[i], filter.typen[block].filter[f[i]]);
				// kein neuer Filter
				if (!neuer_filter[0]) {
					continue;
				}
				// Verschachtelungstiefe Bedeutungen ermitteln
				if (/^bedeutungen-[0-9]/.test(f[i])) {
					let d = f[i].match(/bedeutungen-(?<gr>[0-9]+)_(?<id>[0-9]+)/);
					const bd = data.bd.gr[d.groups.gr].bd,
						id = parseInt(d.groups.id, 10);
					for (let j = 0, len = bd.length; j < len; j++) {
						if (bd[j].id === id) {
							neuer_filter[1] = bd[j].bd.length - 1;
							break;
						}
					}
					neuer_filter[0].firstChild.dataset.tiefe = neuer_filter[1];
				}
				// in Filterbaum einhängen
				//   [0] = Document-Fragment
				//   [1] = Verschachtelungstiefe; 0 = ohne Verschachtelung, 1 = 1. Ebene usw.
				if (neuer_filter[1] > 0) {
					let schachtel;
					if (block === "bedeutungen") {
						let e = cont.querySelectorAll(`[data-tiefe="${neuer_filter[1] - 1}"]`);
						schachtel = e[e.length - 1];
					} else {
						schachtel = schachtelFinden(neuer_filter[0].firstChild.dataset.f);
					}
					schachtel.appendChild(neuer_filter[0]);
				} else if (neuer_filter[1] === 0) { // der Filter ist unterhalb einer Baumstruktur
					cont.lastChild.appendChild(neuer_filter[0]);
				}
			}
		}
		// Notizen anhängen
		notizen.filterleiste();
		// Backup der Filtereinstellungen wiederherstellen
		filter.backupWiederher(filter_backup);
		// ggf. Markierung der Sterne wiederherstellen
		filter.markierenSterne();
		// erneut aktive Filter ermitteln
		filter.aktiveFilterErmitteln(true);
		// die Funktionen sucht den <div>, in den ein Filter verschachtelt werden muss
		//   f = String
		//     (Filter, ggf. mit Hierarchieebenen ": ")
		function schachtelFinden (f) {
			// Filter kürzen
			let bd_arr = f.split(": ");
			if (bd_arr.length > 1) {
				bd_arr.pop();
			}
			f = bd_arr.join(": ");
			f = f.replace(/"/g, '\\"'); // der Filter könnte " enthalten
			// Schachtel suchen
			let schachtel = cont.lastChild.querySelector(`[data-f^="${f}"]`);
			if (schachtel) {
				return schachtel;
			}
			// nichts gefunden => weiter kürzen
			schachtelFinden(f);
		}
	},
	// Statistik der Bedeutungen um untergeordnete Karten ergänzen
	//   belege = Array
	//     (die IDs der bereits gefilterten Belege)
	statistikBd (belege) {
		if (!optionen.data.einstellungen["filter-unterbedeutungen"]) {
			return;
		}
		let ff = filter.typen.bedeutungen.filter_folge;
		for (let i = 1, len = ff.length; i < len; i++) { // ab 1 => undefined ausschließen
			let d = ff[i].match(/bedeutungen-[0-9]+_(?<id>[0-9]+)/),
				darunter = filter.kartenUnterBd([`${data.bd.gn}_${d.groups.id}`]),
				karten_schon = new Set();
			for (let j = 0, len = darunter.length; j < len; j++) {
				let d = darunter[j].match(/[0-9]+_(?<id>[0-9]+)/),
					id = parseInt(d.groups.id, 10);
				for (let k = 0, len = belege.length; k < len; k++) {
					const idK = belege[k];
					if (!karten_schon.has(idK) && bedeutungen.schonVorhanden({
								bd: data.ka[idK].bd,
								gr: data.bd.gn,
								id: id,
							})[0]) {
						filter.typen.bedeutungen.filter[ff[i]].wert++;
						karten_schon.add(idK);
					}
				}
			}
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
		let cont = document.getElementById("filter-zeitraum-dynamisch");
		cont.replaceChildren();
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
				input.disabled = true;
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
			optionen.speichern();
			filter.aufbauenZeitraum();
			filter.aktiveFilterErmitteln(false);
			liste.status(true);
		});
	},
	// extrahiert die einzelnen Schichten, die in einer Wortbildungs-, Synonym-
	// oder Textsortenangabe stecken
	// (wird auch für Korpora benutzt, weil es so leichter ist)
	//   baum = String
	//     (Wortbildungs-, Synonym- bzw. Textsortenbaum oder Korpus als einzeiliger String)
	//   dt = String
	//     (Datentyp, also entweder "wortbildungen", "synonym", "korpora",
	//      "textsorten" oder "")
	baumExtrakt (baum, dt) {
		if (/^(wortbildungen|synonyme|korpora|textsorten)/.test(dt)) {
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
	// Array mit Schichten sortieren, die aus Wortbildungs-, Synonym-,
	// Korpus- und Textsortenangaben extrahiert wurden
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
		// ggf. Bezeichnungen des Bedeutungen-Filters eintragen
		if (name === "Bedeutungen") {
			const details = bedeutungen.aufbauenH2Details(data.bd, true);
			if (details) {
				let span = document.createElement("span");
				span.classList.add("filter-bedeutungen-details");
				span.textContent = details;
				a.appendChild(span);
				bedeutungenGeruest.listener(span);
			}
		}
		// Bild für Block-Reset anhängen
		let span = document.createElement("span");
		a.appendChild(span);
		span.textContent = " ";
		if (name === "Notizen") {
			span.classList.add("filter-notizen");
			span.title = "Notizen-Fenster anzeigen";
			span.addEventListener("click", function(evt) {
				evt.stopPropagation();
				evt.preventDefault();
				notizen.oeffnen();
			});
		} else {
			span.classList.add("filter-reset");
			span.title = "Filter in diesem Block zurücksetzen";
			filter.ctrlResetBlock(span);
		}
		// Filter-Container
		let div = document.createElement("div");
		div.classList.add("filter-cont", "filter-cont-max");
		filter.backupKlappScroll(div);
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
			optionen.speichern();
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
		if (/^bedeutungen-/.test(f)) {
			if (obj.wert === 0 && f === "bedeutungen-undefined") {
				return [null];
			}
		} else if (!obj.wert && !filter.exklusivAktiv.includes(f)) {
			return [null];
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
		if (!obj.wert && /^bedeutungen-/.test(f)) {
			input.disabled = true;
		}
		// Label
		let label = document.createElement("label");
		label.setAttribute("for", `filter-${f_enc}`);
		if (/^bedeutungen-/.test(f)) {
			label.innerHTML = obj.name;
		} else {
			label.innerHTML = helfer.escapeHtml(obj.name);
		}
		p.appendChild(label);
		// Anzahl der Belege
		if (obj.wert) {
			let span = document.createElement("span");
			span.classList.add("filter-treffer");
			span.textContent = `(${obj.wert})`;
			span.title = `Anzahl der Belege, auf die der Filter „${obj.name}“ zutrifft`;
			p.appendChild(span);
		}
		// ggf. Absatz mit Sternen aufbauen
		if (f === "verschiedenes-markierung") {
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
		p.id = "filter-verschiedenes-bewertung";
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
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung");
		// keine Markierung gespeichert
		if (!filter_bewertung) {
			return;
		}
		// Markierung wiederherstellen
		const be = parseInt(filter_bewertung.dataset.bewertung, 10);
		let sterne = document.querySelectorAll("#filter-verschiedenes-bewertung a");
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
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung");
		if (filter_bewertung) {
			bak["filter-verschiedenes-bewertung"] = filter_bewertung.dataset.bewertung;
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
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung");
		if (bak["filter-verschiedenes-bewertung"] && filter_bewertung) {
			filter_bewertung.dataset.bewertung = bak["filter-verschiedenes-bewertung"];
		}
	},
	// speichert den Klappstatus und die Scrollposition der Filterblöcke
	backupKlapp: {},
	// Backup des Klappstatus und der Scrollposition der Filterblöcke erstellen
	backupKlappMake () {
		filter.backupKlapp = {};
		document.querySelectorAll(".filter-kopf").forEach(function(i) {
			let id = i.id,
				div = i.nextSibling;
			let pos = [-1, false];
			if (!div.classList.contains("aus")) {
				if (optionen.data.filter.reduzieren || !div.dataset.scroll) {
					pos = [0, false];
				} else {
					const ds = parseInt(div.dataset.scroll, 10); // vgl. filter.backupKlappScroll()
					// ggf. einen anderen <div> wählen (nötig für Zeitraum-Filter)
					let div_max = div.querySelector(".filter-cont-max");
					if (div_max) {
						div = div_max;
					}
					const st = div.scrollTop;
					if (ds !== st) {
						pos = [ds, true];
					} else {
						pos = [st, false];
					}
				}
			}
			filter.backupKlapp[id] = pos;
		});
	},
	// Backup des Klappstatust und der Scrollposition der Filterblöcke wiederherstellen
	backupKlappReset () {
		document.querySelectorAll(".filter-kopf").forEach(function(i) {
			let id = i.id,
				div = i.nextSibling;
			if (filter.backupKlapp[id] === undefined ||
					filter.backupKlapp[id][0] === -1) {
				div.classList.add("aus");
			} else if (filter.backupKlapp[id][0] > 0) {
				// ggf. einen anderen <div> wählen (nötig für Zeitraum-Filter)
				let div_max = div.querySelector(".filter-cont-max");
				if (div_max) {
					div = div_max;
				}
				if (filter.backupKlapp[id][1]) {
					// das Auslesen von scrollTop hat beim Backup nicht funktioniert =>
					// ein Timeout ist nötig, damit die Scrollposition wiederhergestellt werden kann
					// (dies tritt auf, wenn die Karteikarte gespeichert wurde)
					setTimeout(function() {
						div.scrollTop = filter.backupKlapp[id][0];
					}, 0);
				} else {
					div.scrollTop = filter.backupKlapp[id][0];
				}
			}
		});
	},
	// Scroll-Status als Fallback speichern
	// (nötig, weil scrollTop nur ermittelt werden kann, wenn der Block sichtbar ist;
	// speichere ich die Karteikarte, ist der Block nicht sichtbar und die Scrollposition immer 0)
	//   div = Element
	//     (Block, in dem die Filter stecken)
	backupKlappScroll (div) {
		div.addEventListener("scroll", function() {
			let ziel = this;
			if (this.id === "filter-zeitraum-dynamisch") {
				ziel = this.parentNode;
			}
			ziel.dataset.scroll = this.scrollTop;
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
		optionen.speichern();
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
			let cont = document.getElementById("filter-erweiterte-cont");
			if (this.classList.contains("aktiv")) {
				filter.anzeigeUmschaltenAnim(cont, true);
			} else {
				filter.anzeigeUmschaltenAnim(cont, false);
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
		let timeout = 0;
		if (input.type === "text") {
			timeout = 250;
		}
		input.addEventListener("input", function() {
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
				tastatur.detectModifiers(evt);
				if (!tastatur.modifiers && evt.key === "Enter") {
					filter.volltextSuchePrep();
					liste.status(true);
				}
			});
		}
	},
	anwendenSterne (stern) {
		filter.setZuletztAktiv(stern);
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung"),
			be = parseInt(filter_bewertung.dataset.bewertung, 10),
			sterne = filter_bewertung.querySelectorAll("a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (sterne[i] === stern) {
				let bewertung = i + 1;
				if (be === bewertung) {
					filter_bewertung.dataset.bewertung = "0";
				} else {
					document.getElementById("filter-verschiedenes-markierung").checked = true;
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
		// Kartendatum-Filter
		if (filter.kartendatumAktiv()) {
			filter.aktiveFilter.kartendatum = true;
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
				let f_check = document.getElementById(`filter-${encodeURI(f)}`);
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
		// sind alle Filter inaktiv => standardmäßig zu öffnende Filter öffnen
		if (!aktive_filter) {
			koepfe.forEach(function(i) {
				const id = i.id.replace(/.+-/, "");
				if (optionen.data.einstellungen[`filter-offen-${id}`]) {
					i.nextSibling.classList.remove("aus");
				}
			});
		}
	},
	// Cache mit regulären Ausdrücken für Wortbildungen, Synonyme, Korpora und Textsorten
	// (wirkt sich wohl positiv auf die Performance aus)
	regCacheBaum: {},
	// Zwischenspeicher für die Daten der Volltextsuche
	volltextSuche: {
		suche: false, // Volltext-Suche ist aktiv
		ka: {}, // speichert welche Datensätze in welchen Karteikarten Treffer produziert haben
		ds: [], // speichert die Datensätze, die durchsucht werden sollen
		reg: [], // speichert die regulären Ausdrücke, mit denen gesucht werden soll
	},
	// Variablen für die Volltextsuche vorbereiten
	volltextSuchePrep () {
		// Filter-Text ermitteln
		let vt = document.getElementById("filter-volltext").value;
		vt = helfer.textTrim(vt.replace(/[<>]+/g, ""), true); // macht nur Probleme, wenn erlaubt wird, nach Spitzklammern zu suchen
		// kein Filtertext
		if (!vt) {
			filter.volltextSuche.suche = false;
			return;
		}
		// Filtertext vorhanden
		filter.volltextSuche.suche = true;
		filter.volltextSuche.ka = {};
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
			let reg = helfer.escapeRegExp(i.charAt(0));
			for (let j = 1, len = i.length; j < len; j++) {
				reg += "(<[^>]+>)*";
				reg += helfer.escapeRegExp(i.charAt(j));
			}
			reg = helfer.formVariSonderzeichen(reg);
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
		let inputs = document.querySelectorAll("#filter-kopf-verschiedenes + div .filter");
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
		// aktive Filter in Bedeutungen, Wortbildungen, Synonymen, Korpora und Textsorten
		let baumfilter = {
			bd: [],
			bl: [],
			kr: [],
			sy: [],
			ts: [],
		};
		for (let i in filter.aktiveFilter) {
			if (!filter.aktiveFilter.hasOwnProperty(i)) {
				continue;
			}
			if (!/^(bedeutungen|wortbildungen|synonyme||korpora|textsorten)-/.test(i)) {
				continue;
			}
			let f = i.match(/^(.+?)-(.+)/);
			if (f[1] === "bedeutungen") {
				baumfilter.bd.push(f[2]);
			} else if (f[1] === "wortbildungen") {
				baumfilter.bl.push(f[2]);
			} else if (f[1] === "synonyme") {
				baumfilter.sy.push(f[2]);
			} else if (f[1] === "korpora") {
				baumfilter.kr.push(f[2]);
			} else if (f[1] === "textsorten") {
				baumfilter.ts.push(f[2]);
			}
		}
		// das Bedeutungsarray ggf. um übergeordnete Bedeutungen auffüllen
		let bdErg = filter.kartenUnterBd(baumfilter.bd);
		baumfilter.bd = baumfilter.bd.concat(bdErg);
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
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung"),
			be = 0;
		if (filter_bewertung) {
			be = parseInt(filter_bewertung.dataset.bewertung, 10);
		}
		// Volltextsuche vorbereiten
		// (wird zwar auch "oninput" aufgerufen, es könnte aber sein, dass die Suche
		// durch eine Änderung der Checkboxes oder Öffnen/Schließen des Erweiterungs-
		// filters aufgerufen wird)
		filter.volltextSuchePrep();
		// Kartendatum vorbereiten
		let kartendatumVon = null,
			kartendatumBis = null,
			kartendatumFeld = "";
		if (filter.aktiveFilter.kartendatum) {
			kartendatumVon = new Date(document.getElementById("filter-kartendatum-von").value);
			kartendatumBis = new Date(document.getElementById("filter-kartendatum-bis").value);
			kartendatumBis.setSeconds(59); // die ganze Minute mitnehmen
			if (document.getElementById("filter-kartendatum-erstellt").checked) { // erstellt
				kartendatumFeld = "dc";
			} else { // geändert
				kartendatumFeld = "dm";
			}
		}
		// Karten filtern
		let regAnnotierung = /farbe[1-9]/;
		if (optionen.data.einstellungen["filter-transparente"]) {
			regAnnotierung = /farbe[0-9]/;
		}
		let karten_gefiltert = [];
		forX: for (let i = 0, len = karten.length; i < len; i++) {
			let id = karten[i];
			// Volltext
			if (filter.aktiveFilter.volltext && !filter.kartenFilternVolltext(id)) {
				continue;
			}
			// Zeitraum
			if (filter.aktiveFilter.zeitraum) {
				let jahr = parseInt(liste.zeitschnittErmitteln(data.ka[id].da).jahr, 10);
				if (!filter_zeitraum.includes(jahr)) {
					continue;
				}
			}
			// Kartendatum
			if (filter.aktiveFilter.kartendatum) {
				let datum = new Date(data.ka[id][kartendatumFeld]);
				if (datum < kartendatumVon || datum > kartendatumBis) {
					continue;
				}
			}
			// Bedeutungen, Wortbildungen, Synonyme, Korpora und Textsorten
			for (let bf in baumfilter) {
				if (!baumfilter.hasOwnProperty(bf)) {
					continue;
				}
				let arr = baumfilter[bf];
				if (arr.length) {
					let okay = false;
					if (bf === "bd") { // Bedeutungen
						forY: for (let j = 0, len = arr.length; j < len; j++) {
							// Ist für das aktuelle Gerüst eine Bedeutung in der Karte?
							if (arr[j] === "undefined") {
								for (let k = 0, len = data.ka[id].bd.length; k < len; k++) {
									if (data.ka[id].bd[k].gr === data.bd.gn) {
										continue forY;
									}
								}
								okay = true;
								continue;
							}
							// Ist die spezifische Bedeutung in der Karte?
							let d = arr[j].match(/(?<gr>[0-9]+)_(?<id>[0-9]+)/);
							if (bedeutungen.schonVorhanden({
										bd: data.ka[id].bd,
										gr: d.groups.gr,
										id: parseInt(d.groups.id, 10),
									})[0]) {
								okay = true;
								break;
							}
						}
					} else if (!data.ka[id][bf] && arr.includes("undefined")) { // undefined
						okay = true;
					} else if (data.ka[id][bf]) {
						for (let j = 0, len = arr.length; j < len; j++) {
							// Suchausdruck auslesen oder erzeugen
							let reg;
							if (filter.regCacheBaum[arr[j]]) {
								reg = filter.regCacheBaum[arr[j]];
							} else {
								reg = new RegExp(`(^|\n)${helfer.escapeRegExp(arr[j])}(:|\n|$)`);
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
						continue forX;
					}
				}
			}
			// vollständig oder unvollständig
			if (filter.aktiveFilter["verschiedenes-unvollstaendig"] &&
					(data.ka[id].un && !filter_inklusiv ||
					!data.ka[id].un && filter_inklusiv)) {
				continue;
			}
			// geprüft oder ungeprüft
			if (filter.aktiveFilter["verschiedenes-ungeprueft"] &&
					(data.ka[id].up && !filter_inklusiv ||
					!data.ka[id].up && filter_inklusiv)) {
				continue;
			}
			// Kontext
			if (filter.aktiveFilter["verschiedenes-kontext"] &&
					(data.ka[id].ko && !filter_inklusiv ||
					!data.ka[id].ko && filter_inklusiv)) {
				continue;
			}
			// Bücherdienst
			if (filter.aktiveFilter["verschiedenes-buecherdienst"] &&
					(data.ka[id].bu && !filter_inklusiv ||
					!data.ka[id].bu && filter_inklusiv)) {
				continue;
			}
			// Notizen
			if (filter.aktiveFilter["verschiedenes-notizen"] &&
					(data.ka[id].no && !filter_inklusiv ||
					!data.ka[id].no && filter_inklusiv)) {
				continue;
			}
			// Buchung
			if (filter.aktiveFilter["verschiedenes-buchung"] &&
					(data.ka[id].bc && !filter_inklusiv ||
					!data.ka[id].bc && filter_inklusiv)) {
				continue;
			}
			// Annotierung
			if (filter.aktiveFilter["verschiedenes-annotierung"] &&
					(/annotierung-wort/.test(data.ka[id].bs) && regAnnotierung.test(data.ka[id].bs) && !filter_inklusiv ||
					!(/annotierung-wort/.test(data.ka[id].bs) && regAnnotierung.test(data.ka[id].bs)) && filter_inklusiv)) {
				continue;
			}
			// Metatext
			if (filter.aktiveFilter["verschiedenes-metatext"] &&
					(data.ka[id].mt && !filter_inklusiv ||
					!data.ka[id].mt && filter_inklusiv)) {
				continue;
			}
			// Markierung
			if (filter.aktiveFilter["verschiedenes-markierung"] &&
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
	// Bedeutungenfilter um untergeordnete Bedeutungen ergänzen
	//   arr = Array
	//     (Filter, die angeklickt wurden)
	kartenUnterBd (arr) {
		// untergeordnete Filter wirklich mit einbeziehen?
		if (!optionen.data.einstellungen["filter-unterbedeutungen"]) {
			return [];
		}
		// untergeordnete Filter suchen
		let arrErg = [];
		for (let i = 0, len = arr.length; i < len; i++) {
			if (arr[i] === "undefined") {
				continue;
			}
			let d = arr[i].match(/[0-9]+_(?<id>[0-9]+)/),
				id = parseInt(d.groups.id, 10),
				bd = data.bd.gr[data.bd.gn].bd,
				bd_len = 0;
			for (let j = 0, len = bd.length; j < len; j++) {
				if (bd[j].id === id) { // hier geht der Bedeutungszweig los => danach aufnehmen
					bd_len = bd[j].bd.length;
				} else if (bd[j].bd.length <= bd_len) { // jetzt ist man wieder auf derselben Ebene wie beim Start => Abbruch
					break;
				} else if (bd_len) { // diese Bedeutung muss untergeordnet sein => Aufnahme
					arrErg.push(`${data.bd.gn}_${bd[j].id}`);
				}
			}
		}
		// Array mit untergeordneten Filtern zurückgeben
		return arrErg;
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
		let treffer = Array(filter.volltextSuche.reg.length).fill(false),
			trefferDs = [];
		for (let i = 0, len = filter.volltextSuche.ds.length; i < len; i++) {
			const ds = filter.volltextSuche.ds[i];
			let text_rein = "";
			if (ds === "bd") {
				text_rein = liste.textBd(data.ka[id][ds]).join(" ").replace(/<.+?>/g, "");
			} else if (ds === "bs") {
				text_rein = data.ka[id][ds].replace(/<.+?>/g, "");
			} else {
				text_rein = data.ka[id][ds];
			}
			text_rein = liste.belegTrennungWeg(text_rein, true);
			for (let j = 0, len = treffer.length; j < len; j++) {
				let reg = filter.volltextSuche.reg[j];
				if (text_rein.match(reg)) {
					treffer[j] = true;
					trefferDs.push(ds);
				}
			}
		}
		if (!treffer.includes(false)) {
			filter.volltextSuche.ka[id] = trefferDs;
			return true;
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
		filter.kartendatumInit();
		let filter_bewertung = document.getElementById("filter-verschiedenes-bewertung");
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
			evt.preventDefault();
			filter.zuletztAktiv = this.parentNode.id;
			let block = this.parentNode.nextSibling;
			block.querySelectorAll(".filter").forEach(function(i) {
				if (i.type === "text") {
					i.value = "";
					if (i.id === "filter-volltext") {
						filter.volltextSuche.suche = false;
					}
				} else if (i.type === "checkbox") {
					i.checked = false;
					// Sonderregel für die Sterne
					if (i.id === "filter-verschiedenes-markierung") {
						document.getElementById("filter-verschiedenes-bewertung").dataset.bewertung = "0";
						filter.markierenSterne();
					}
				}
			});
			if (block.id === "filter-kartendatum") {
				filter.kartendatumInit();
			}
			liste.status(true);
		});
	},
	// Zeitraumgrafik generieren und anzeigen
	ctrlGrafik () {
		// Macht es überhaupt Sinn, die Karte anzuzeigen?
		let jahre = Object.keys(filter.zeitraumTrefferCache);
		if (jahre.length === 1) {
			dialog.oeffnen({
				typ: "alert",
				text: "Alle Belege befinden sich im selben Zeitraum.\nDie Verteilungsgrafik wird nicht anzeigt.",
			});
			return;
		}
		// Fenster öffnen od. in den Vordergrund holen
		let fenster = document.getElementById("zeitraumgrafik");
		if (overlay.oeffnen(fenster)) {
			return;
		}
		// Canvas vorbereiten
		let can = document.querySelector("#zeitraumgrafik-cont canvas"),
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
		// Maximalhöhe der Variantenliste festlegen
		helfer.elementMaxHeight({
			ele: document.getElementById("zeitraumgrafik-cont-over"),
		});
	},
	// Reduktionsmodus der Filter umschalten
	ctrlReduzierenToggle () {
		optionen.data.filter.reduzieren = !optionen.data.filter.reduzieren;
		optionen.speichern();
		filter.ctrlReduzierenAnzeige();
	},
	// Reduktionsmodus der Filter visualisieren
	ctrlReduzierenAnzeige () {
		let link = document.getElementById("filter-ctrl-reduzieren");
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
	//   a = Element
	//     (Filterkopf)
	anzeigeUmschalten (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// wenn nur ein Filter offen sein sollte und der aktive Filter gerade zugeklappt ist
			if (optionen.data.einstellungen["filter-zuklappen"]) {
				document.querySelectorAll(".filter-kopf").forEach(i => {
					let block = i.nextSibling;
					if (i === this) {
						filter.anzeigeUmschaltenAnim(block, block.classList.contains("aus"));
					} else if (!block.classList.contains("aus")) {
						filter.anzeigeUmschaltenAnim(block, false);
					}
				});
				return;
			}
			// wenn mehrere Filter offen sein dürfen
			let block = this.nextSibling;
			filter.anzeigeUmschaltenAnim(block, block.classList.contains("aus"));
			if (this.classList.contains("aktiv")) {
				this.blur();
			}
		});
	},
	// speichert die Filterblöcke, in denen gerade eine Animation läuft
	anzeigeUmschaltenAktiv: new Set(),
	// Animation zum Auf- oder Zuklappen der Filter
	//   block = Element
	//     (Filterkopf)
	//   auf = Boolean
	//     (Filterblock aufklappen)
	anzeigeUmschaltenAnim (block, auf) {
		// läuft in dem Block gerade eine Anmiation? => beenden lassen
		if (filter.anzeigeUmschaltenAktiv.has(block)) {
			return;
		}
		filter.anzeigeUmschaltenAktiv.add(block);
		// zuklappen
		if (!auf) {
			block.style.height = `${block.offsetHeight}px`;
			setTimeout(() => {
				block.classList.add("blenden");
				block.style.height = "0";
				block.style.marginBottom = "0";
				setTimeout(() => {
					block.classList.add("aus");
					block.classList.remove("blenden");
					block.style.height = null;
					block.style.marginBottom = null;
					filter.anzeigeUmschaltenAktiv.delete(block);
				}, 300);
			}, 0);
			return;
		}
		// aufklappen
		block.classList.remove("aus");
		const zielHoehe = block.offsetHeight;
		block.classList.add("blenden");
		block.style.height = "0";
		block.style.marginBottom = "0";
		setTimeout(() => {
			block.style.height = `${zielHoehe}px`;
			block.style.marginBottom = `10px`;
			setTimeout(() => {
				block.style.height = null;
				block.style.marginBottom = null;
				block.classList.remove("blenden");
				filter.anzeigeUmschaltenAktiv.delete(block);
			}, 300);
		}, 0);
	},
	// die Suche wird aufgerufen
	suche () {
		// ggf. das Suchformular in der Literaturdatenbank fokussieren
		if (overlay.oben() === "red-lit") {
			redLit.sucheWechseln();
			return;
		}
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Kartei &gt; Suche</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Suchfilter öffnen
		speichern.checkInit(async () => {
			// Bedeutungen schließen
			bedeutungen.schliessen();
			// Beleg schließen
			beleg.aktionAbbrechen();
			// alle Overlays schließen
			await overlay.alleSchliessen();
			// ggf. Filter öffnen
			if (!optionen.data.belegliste.filterleiste) {
				liste.headerFilter();
			}
			// Suche öffnen
			let input = document.getElementById("filter-volltext");
			input.parentNode.parentNode.classList.remove("aus");
			// Suchfeld fokussieren
			input.select();
		});
	},
	// initialisiert den Kartendatum-Filter
	kartendatumInit () {
		// Checkboxes aus
		document.querySelectorAll(`#filter-kartendatum input[type="checkbox"]`).forEach(function(i) {
			i.checked = false;
		});
		// Ausgangsdatum an Erstellungsdatum der Karten anpassen
		let von = null,
			bis = null;
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			let datum = new Date(data.ka[id].dc);
			if (!von || datum < von) {
				von = datum;
			}
			if (!bis || datum > bis) {
				bis = datum;
			}
		}
		if (!von) { // es gibt noch keine Karteikarten
			von = new Date();
			bis = new Date();
		}
		filter.kartendatumEintragen(document.getElementById("filter-kartendatum-von"), von);
		filter.kartendatumEintragen(document.getElementById("filter-kartendatum-bis"), bis);
	},
	// trägt das Kartendatum ein
	//   feld = Element
	//     (das Feld, in das eingetragen werden soll)
	//   zeit = Date-Object
	//     (die Zeit, die eingetragen werden soll)
	kartendatumEintragen (feld, zeit) {
		let jahr = zeit.getFullYear(),
			monat = zeit.getMonth() + 1,
			tag = zeit.getDate(),
			stunde = zeit.getHours(),
			minute = zeit.getMinutes();
		monat = monat.toString().padStart(2, "0");
		tag = tag.toString().padStart(2, "0");
		stunde = stunde.toString().padStart(2, "0");
		minute = minute.toString().padStart(2, "0");
		feld.value = `${jahr}-${monat}-${tag}T${stunde}:${minute}`;
	},
	// Änderungen in den Checkboxes des Kartendatum-Filters abfangen
	//   input = Element
	//     (eine Checkbox)
	kartendatumBox (input) {
		input.addEventListener("change", function() {
			let erstellt = document.getElementById("filter-kartendatum-erstellt"),
				geaendert = document.getElementById("filter-kartendatum-geaendert");
			if (this === erstellt && this.checked) {
				geaendert.checked = false;
			} else if (this === geaendert && this.checked) {
				erstellt.checked = false;
			}
		});
		filter.anwenden(input);
	},
	// ermittelt, ob der Kartendatum-Filter aktiv ist
	kartendatumAktiv () {
		let erstellt = document.getElementById("filter-kartendatum-erstellt"),
			geaendert = document.getElementById("filter-kartendatum-geaendert");
		if (erstellt.checked || geaendert.checked) {
			return true;
		}
		return false;
	},
	// Änderungen in den Datumsfelder abfangen
	//   input = Element
	//     (ein Datumsfeld)
	kartendatumFeld (input) {
		input.addEventListener("change", function() {
			filter.kartendatumCheck();
		});
		filter.anwenden(input);
	},
	// Zeit des Datumsfeldes auf den Augenblick des Klicks setzen
	//   a = Element
	//     (der Icon-Link zum Setzen des Datums)
	kartendatumJetzt (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			filter.kartendatumEintragen(this.previousSibling, new Date());
			filter.kartendatumCheck();
			// Filter anwenden
			filter.setZuletztAktiv(document.getElementById("filter-kartendatum"));
			liste.status(true);
		});
	},
	// die Datumsfelder im Kartendatum-Filter auf Validität überprüfen
	kartendatumCheck () {
		let feldVon = document.getElementById("filter-kartendatum-von"),
			feldBis = document.getElementById("filter-kartendatum-bis"),
			von = new Date(feldVon.value),
			bis = new Date(feldBis.value);
		if (von > bis) {
			filter.kartendatumEintragen(feldVon, bis);
		}
	},
};
