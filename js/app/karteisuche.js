"use strict";

let karteisuche = {
	// Suche-Fenster öffnen
	oeffnen () {
		let fenster = document.getElementById("karteisuche");
		overlay.oeffnen(fenster);
		// Suchbutton fokussieren
		fenster.querySelector("input").focus();
		// Pfade auflisten
		karteisuche.pfadeAuflisten();
		// ggf. eine ID für die Filter erzeugen
		if (karteisuche.makeId === null) {
			karteisuche.makeId = karteisuche.idGenerator(1);
		}
		// ggf. die Filter wiederherstellen
		if (!document.querySelector(".karteisuche-filter") &&
				optionen.data.karteisuche.filter.length) {
			karteisuche.filterWiederherstellen();
		}
	},
	// Liste der ausgewählten Pfade aufbauen
	pfadeAuflisten () {
		// Check-Status sichern
		let status = Array(optionen.data.karteisuche.pfade.length).fill(true),
			inputs = document.querySelectorAll("#karteisuche-pfade input");
		for (let i = 0, len = inputs.length; i < len; i++) {
			if (!inputs[i].checked) {
				status[i] = false;
			}
		}
		// Content leeren
		let cont = document.getElementById("karteisuche-pfade");
		helfer.keineKinder(cont);
		// Pfad hinzufügen
		let p = document.createElement("p");
		cont.appendChild(p);
		p.classList.add("add");
		karteisuche.pfadHinzufuegenListener(p);
		let a = document.createElement("a");
		p.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-add");
		p.appendChild(document.createTextNode("Pfad hinzufügen"));
		// Pfade auflisten
		for (let i = 0, len = optionen.data.karteisuche.pfade.length; i < len; i++) {
			const pfad = optionen.data.karteisuche.pfade[i];
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Icon
			let a = document.createElement("a");
			p.appendChild(a);
			a.href = "#";
			a.classList.add("icon-link", "icon-loeschen");
			a.dataset.pfad = pfad;
			karteisuche.pfadEntfernen(a);
			// Pfad
			let span = document.createElement("span");
			p.appendChild(span);
			span.dataset.pfad = pfad; // wegen des Rechtsklickmenüs
			span.title = pfad;
			// ggf. Checkbox einblenden
			if (len > 1) {
				let input = document.createElement("input");
				span.insertBefore(input, span.firstChild);
				input.checked = status[i];
				input.id = `pfad-${i + 1}`;
				input.type = "checkbox";
				input.value = pfad;
				let label = document.createElement("label");
				span.appendChild(label);
				label.setAttribute("for", `pfad-${i + 1}`);
				label.textContent = pfad;
			} else {
				span.textContent = pfad;
			}
		}
	},
	// Pfad zur Pfadliste hinzufügen (Listener)
	//   p = Element
	//     (der Absatz zum Hinzufügen des Pfades)
	pfadHinzufuegenListener (p) {
		p.addEventListener("click", function(evt) {
			evt.stopPropagation();
			karteisuche.pfadHinzufuegen();
		});
	},
	// Pfad zur Pfadliste hinzufügen
	async pfadHinzufuegen () {
		let opt = {
			title: "Pfad hinzufügen",
			defaultPath: appInfo.documents,
			properties: [
				"openDirectory",
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = optionen.data.letzter_pfad;
		}
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) { // Fehler
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) { // keine Datei ausgewählt
			return;
		}
		// Ist der Pfad schon in der Liste?
		if (optionen.data.karteisuche.pfade.includes(result.filePaths[0])) {
			dialog.oeffnen({
				typ: "alert",
				text: "Der gewählte Pfad wurde schon aufgenommen.",
			});
			return;
		}
		// Pfad hinzufügen
		optionen.data.karteisuche.pfade.push(result.filePaths[0]);
		optionen.speichern();
		// Liste auffrischen
		karteisuche.pfadeAuflisten();
		// Maximalhöhe Trefferliste setzen
		karteisuche.hoeheTrefferliste();
	},
	// Pfad aus der Liste entfernen
	//   a = Element
	//     (das Lösch-Icon)
	pfadEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Pfad entfernen
			const pfad = this.dataset.pfad;
			optionen.data.karteisuche.pfade.splice(optionen.data.karteisuche.pfade.indexOf(pfad), 1);
			optionen.speichern();
			// Liste auffrischen
			karteisuche.pfadeAuflisten();
			// Maximalhöhe Trefferliste setzen
			karteisuche.hoeheTrefferliste();
		});
	},
	// speichert das Input-Element, das vor dem Start der Suche den Fokus hatte
	suchenFokus: null,
	// Suche vorbereiten
	async suchenPrep () {
		// Fehler: kein Pfad hinzugefügt
		if (!optionen.data.karteisuche.pfade.length) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie müssen zunächst einen Pfad hinzufügen.",
				callback: () => {
					karteisuche.pfadHinzufuegen();
				},
			});
			karteisuche.animation(false);
			return;
		}
		// Pfade ermitteln, in denen gesucht werden soll und kann
		let pfade = [],
			inputs = document.querySelectorAll("#karteisuche-pfade input"),
			nichtGefunden = 0,
			abgehakt = 0;
		if (inputs.length) {
			for (let i of inputs) {
				if (!i.checked) {
					continue;
				}
				abgehakt++;
				const exists = await helfer.exists(i.value);
				if (exists) {
					pfade.push(i.value);
					karteisuche.markierungPfad(i.value, false);
				} else {
					nichtGefunden++;
					karteisuche.markierungPfad(i.value, true);
				}
			}
		} else {
			abgehakt++;
			const pfad = optionen.data.karteisuche.pfade[0],
				exists = await helfer.exists(pfad);
			if (exists) {
				pfade.push(pfad);
				karteisuche.markierungPfad(pfad, false);
			} else {
				nichtGefunden++;
				karteisuche.markierungPfad(pfad, true);
			}
		}
		// Fehler: kein Pfad ausgewählt
		if (!abgehakt) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie müssen zunächst einen Pfad auswählen.",
			});
			karteisuche.animation(false);
			return;
		}
		// Fehler: keiner der (ausgewählten) Pfade wurde wiedergefunden
		if (nichtGefunden === abgehakt) {
			let ausgewaehlt = "";
			if (abgehakt < optionen.data.karteisuche.pfade.length) {
				ausgewaehlt = " ausgewählte";
				if (abgehakt > 1) {
					ausgewaehlt = " ausgewählten";
				}
			}
			let text = `Der${ausgewaehlt} Pfad wurde nicht wiedergefunden.`;
			if (abgehakt > 1) {
				text = `Keiner der${ausgewaehlt} Pfade wurde wiedergefunden.`;
			}
			dialog.oeffnen({
				typ: "alert",
				text: text,
			});
			karteisuche.animation(false);
			return;
		}
		// Element mit Fokus speichern
		karteisuche.suchenFokus = document.querySelector("#karteisuche input:focus");
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.blur();
		} else {
			karteisuche.suchenFokus = null;
		}
		// Okay, die Suche kann starten
		karteisuche.animation(true);
		setTimeout(function() {
			karteisuche.suchen(pfade);
		}, 500);
	},
	// markiert einen Pfad, wenn er nicht gefunden wurde, und demarkiert ihn,
	// wenn er gefunden wurde
	//   pfad = String
	//     (der Pfad)
	//   verschwunden = Boolean
	//     (der Pfad ist verschwunden)
	markierungPfad (pfad, verschwunden) {
		// betreffenden Span finden
		pfad = pfad.replace(/\\/g, "\\\\"); // Backslash in Windows-Pfaden maskieren!
		let span = document.querySelector(`#karteisuche-pfade [title="${pfad}"]`),
			img = span.querySelector("img");
		// Bild ggf. entfernen
		if (!verschwunden) {
			if (img) {
				img.parentNode.removeChild(img);
			}
			return;
		}
		// Bild ggf. hinzufügen
		if (img) {
			return;
		}
		let x = document.createElement("img");
		span.insertBefore(x, span.lastChild);
		x.src = "img/x-dick-rot.svg";
		x.width = "24";
		x.height = "24";
		karteisuche.markierungFehler(x);
	},
	// Reaktion auf Klick auf dem Fehler-Icon
	//   img = Element
	//     (das Fehler-Icon)
	markierungFehler (img) {
		img.addEventListener("click", function() {
			dialog.oeffnen({
				typ: "alert",
				text: `Der Pfad\n<p class="force-wrap"><i>${this.parentNode.title}</i></p>\nkonnte nicht gefunden werden.`,
			});
		});
	},
	// Suche starten
	//   pfade = Array
	//     (Pfade, in denen gesucht werden soll)
	async suchen (pfade) {
		// Suche starten
		karteisuche.ztj = [];
		for (let ordner of pfade) {
			const exists = await helfer.exists(ordner);
			if (exists) {
				await karteisuche.ordnerParsen(ordner);
			}
		}
		// Filterwerte sammeln
		karteisuche.filterWerteSammeln();
		// Karteien analysieren
		for (let kartei of karteisuche.ztj) {
			const content = await io.lesen(kartei.pfad);
			// Kartei einlesen
			let datei = {};
			try {
				datei = JSON.parse(content);
			} catch (err) {
				continue;
			}
			// keine ZTJ-Datei
			// (bis Version 0.24.0 stand in dem Feld "wgd")
			if (!/^(wgd|ztj)$/.test(datei.ty)) {
				continue;
			}
			// Wort merken
			kartei.wort = datei.wo;
			// mit Suchfiltern abgleichen
			kartei.passt = karteisuche.filtern(datei);
		}
		// passende Karteien auflisten
		karteisuche.ztjAuflisten();
		// Sperrbild weg und das zuletzt fokussierte Element wieder fokussieren
		karteisuche.animation(false);
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.focus();
		}
		// Filter speichern
		karteisuche.filterSpeichern();
	},
	// ZTJ-Dateien, die gefunden wurden;
	// Array enthält Objekte:
	//   pfad (String; Pfad zur Kartei)
	//   wort (String; Wort der Kartei)
	//   passt (Boolean; passt zu den Suchfiltern)
	ztj: [],
	// findet alle Pfade in einem übergebenen Ordner
	//   ordner = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	async ordnerParsen (ordner) {
		const fsP = require("fs").promises;
		try {
			let files = await fsP.readdir(ordner);
			for (let i of files) {
				const path = require("path"),
					pfad = path.join(ordner, i);
				await karteisuche.pfadPruefen(pfad);
			}
		} catch (err) {} // Auslesen des Ordners fehlgeschlagen
	},
	// überprüft einen übergebenen Pfad: Ordner oder ZTJ-Datei?
	//   pfad = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	async pfadPruefen (pfad) {
		const fs = require("fs"),
			fsP = fs.promises;
		try {
			await fsP.access(pfad, fs.constants.R_OK); // Lesezugriff auf Pfad? Wenn kein Zugriff => throw
			let stats = await fsP.lstat(pfad); // Natur des Pfades?
			if (stats.isDirectory()) { // Ordner => parsen
				karteisuche.ordnerParsen(pfad);
			} else if (/\.ztj$/.test(pfad)) { // ZTJ-Datei => merken
				karteisuche.ztj.push({
					pfad: pfad,
					wort: "",
					passt: false,
				});
			}
		} catch (err) {} // wahrscheinlich besteht kein Zugriff auf den Pfad
	},
	// ZTJ-Dateien auflisten
	ztjAuflisten () {
		let treffer = 0,
			woerter = [];
		for (let i = 0, len = karteisuche.ztj.length; i < len; i++) {
			if (!karteisuche.ztj[i].passt) {
				continue;
			}
			treffer++;
			woerter.push({
				wort: karteisuche.ztj[i].wort,
				i: i,
			});
		}
		woerter.sort(function(a, b) {
			let arr = [a.wort, b.wort];
			arr.sort(helfer.sortAlpha);
			if (a.wort === arr[0]) {
				return -1;
			}
			return 1;
		});
		// Treffer anzeigen
		let text = "keine Karteien gefunden";
		if (treffer === 1) {
			text = "1 Kartei gefunden";
		} else if (treffer > 1) {
			text = `${treffer} Karteien gefunden`;
		}
		document.getElementById("karteisuche-treffer").textContent = text;
		// Karteiliste füllen
		let cont = document.getElementById("karteisuche-karteien");
		helfer.keineKinder(cont);
		for (let wort of woerter) {
			// Absatz
			let p = document.createElement("p");
			cont.appendChild(p);
			// Link
			let a = document.createElement("a");
			p.appendChild(a);
			a.href = "#";
			let pfad = karteisuche.ztj[wort.i].pfad;
			a.dataset.pfad = pfad;
			karteisuche.ztjOeffnen(a);
			// Wort
			let span = document.createElement("span");
			a.appendChild(span);
			span.textContent = wort.wort;
			// Pfad
			span = document.createElement("span");
			a.appendChild(span);
			span.textContent = pfad;
			span.title = pfad;
		}
		// Maximalhöhe Trefferliste setzen
		karteisuche.hoeheTrefferliste();
	},
	// ZTJ-Datei in neuem Fenster öffnen
	//   a = Element
	//     (Link, mit dem eine ZTJ-Datei geöffnet werden kann)
	ztjOeffnen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (evt.detail > 1) { // Doppelklicks abfangen
				return;
			}
			// die Kartei könnte bereits in diesem Fenster offen sein
			if (kartei.pfad === this.dataset.pfad) {
				return;
			}
			// Kartei in einem neuen Fenster öffnen
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("kartei-laden", this.dataset.pfad, false);
		});
	},
	// maximal Höhe der Trefferliste berechnen
	//   resize = true || undefined
	//     (die Berechnung wurde durch die Größenänderung des Fenster angestoßen)
	hoeheTrefferliste (resize = false) {
		// Ist die Karteisuche überhaupt offen?
		if (resize && document.getElementById("karteisuche").classList.contains("aus")) {
			return;
		}
		// Maximalhöhe berechnen
		let liste = document.getElementById("karteisuche-karteien"),
			max = window.innerHeight - 40 - 28 - 20 - 40 - 20; // 40px Abstand oben, 28px Fensterkopf, 20px Paddings, 40px Margins, 20px Abstand unten
		for (let i of document.getElementById("karteisuche-cont").childNodes) {
			if (i === liste || i.nodeType !== 1) {
				continue;
			}
			max -= i.offsetHeight;
		}
		liste.style.maxHeight = `${max}px`;
	},
	// Generator zur Erzeugung der nächsten Filter-ID
	makeId: null,
	*idGenerator (id) {
		while (true) {
			yield id++;
		}
	},
	// zur Verfügung stehende Filter-Typen
	filterTypen: {
		"Volltext": [
			{
				type: "text",
				ro: false,
				cl: "karteisuche-volltext",
				ph: "Suchtext",
				pre: "",
			},
			{
				type: "checkbox",
				ro: false,
				cl: "karteisuche-volltext-genau",
				ph: "genaue Schreibung",
				pre: "",
			},
		],
		"Tag": [
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-tag-typ",
				ph: "Typ",
				pre: "",
			},
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-tag",
				ph: "Tag",
				pre: "",
			},
		],
		"Karteidatum": [
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-datum-typ",
				ph: "Ereignis",
				pre: "erstellt",
			},
			{
				type: "dropdown",
				ro: true,
				cl: "karteisuche-datum-dir",
				ph: "Zeitrichtung",
				pre: "<=",
			},
			{
				type: "date",
				ro: false,
				cl: "karteisuche-datum",
				ph: "",
				pre: "",
			},
		],
		"BearbeiterIn": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-person",
				ph: "Person",
				pre: "",
			},
		],
		"Redaktion": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-redaktion-ereignis",
				ph: "Ereignis",
				pre: "",
			},
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-redaktion-person",
				ph: "Person",
				pre: "",
			},
		],
	},
	// fügt einen neuen Filter hinzu
	//   manuell = Boolean || undefined
	//     (der Filter wurde manuell hinzugefügt)
	filterHinzufuegen (manuell = true) {
		let cont = document.getElementById("karteisuche-filter"),
			p = document.createElement("p");
		cont.insertBefore(p, cont.firstChild);
		p.classList.add("input-text");
		// Lösch-Icon
		let a = document.createElement("a");
		p.appendChild(a);
		a.href = "#";
		a.classList.add("icon-link", "icon-loeschen");
		karteisuche.filterEntfernen(a);
		// Dropdown-Container
		let span = document.createElement("span");
		p.appendChild(span);
		span.classList.add("dropdown-cont");
		// Input
		let input = document.createElement("input");
		span.appendChild(input);
		input.classList.add("dropdown-feld", "karteisuche-filter");
		let id = karteisuche.makeId.next().value;
		input.id = `karteisuche-filter-${id}`;
		input.placeholder = "Filtertyp";
		input.readOnly = true;
		input.type = "text";
		input.value = "";
		span.appendChild(dropdown.makeLink("dropdown-link-td", "Filtertyp", true));
		dropdown.feld(input);
		// Filter fokussieren, wenn er manuell hinzugefügt wurde
		if (manuell) {
			input.focus();
		}
		// Maximalhöhe Trefferliste setzen
		karteisuche.hoeheTrefferliste();
	},
	// baut die zu einem Filter gehörigen Formularelemente auf
	//   filterId = String
	//     (ID des Filters, der gerade geändert wurde)
	filterFelder (filterId) {
		let filter = document.getElementById(filterId),
			p = filter.parentNode.parentNode;
		// ggf. unnötige Inputs entfernen
		// (der Filter kann geändert werden)
		while (p.childNodes.length > 2) {
			p.removeChild(p.lastChild);
		}
		// Filtertyp und ID ermitteln
		const typ = filter.value,
			id = filterId.replace(/.+-/, "");
		// der Filtertyp könnte leer sein, wenn ein leerer Filter wiederhergestellt wird
		if (!typ) {
			return;
		}
		// die nötigen Inputs hinzufügen
		let felder = karteisuche.filterTypen[typ];
		for (let feld of felder) {
			let span = document.createElement("span");
			p.appendChild(span);
			if (feld.type === "dropdown") {
				span.classList.add("dropdown-cont");
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add("dropdown-feld", feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.placeholder = feld.ph;
				if (feld.ro) {
					input.readOnly = true;
				}
				input.type = "text";
				input.value = feld.pre;
				span.appendChild(dropdown.makeLink("dropdown-link-td", feld.ph, true));
				dropdown.feld(input);
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "text") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.placeholder = feld.ph;
				input.type = "text";
				input.value = feld.pre;
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "date") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.type = "date";
				input.value = new Date().toISOString().split("T")[0];
				karteisuche.filterFelderListener(input);
			} else if (feld.type === "checkbox") {
				let input = document.createElement("input");
				span.appendChild(input);
				input.classList.add(feld.cl);
				input.id = `${feld.cl}-${id}`;
				input.type = "checkbox";
				karteisuche.filterFelderListener(input);
				let label = document.createElement("label");
				span.appendChild(label);
				label.setAttribute("for", `${feld.cl}-${id}`);
				label.textContent = feld.ph;
			}
		}
	},
	// Suche mit Enter starten
	filterFelderListener (input) {
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers &&
					evt.key === "Enter" &&
					!document.getElementById("dropdown")) {
				evt.preventDefault();
				karteisuche.suchenPrep();
			}
		});
	},
	// ermittelt den zu einem ausgeschriebenen Tag-Typ gehörenden Schlüssel
	//   feld = Element
	//     (das Input-Feld, in dem der ausgeschriebene Tag-Typ steht)
	filterTagTyp (feld) {
		const typ = feld.value;
		for (let key in optionen.tagsTypen) {
			if (!optionen.tagsTypen.hasOwnProperty(key)) {
				continue;
			}
			if (optionen.tagsTypen[key][1] === typ) {
				return key;
			}
		}
		return typ.substring(0, 1).toLowerCase() + typ.substring(1);
	},
	// entfernt einen Filter
	//   a = Element
	//     (Anker zum Entfernen des Fitlers)
	filterEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			a.parentNode.parentNode.removeChild(a.parentNode);
			// Maximalhöhe Trefferliste setzen
			karteisuche.hoeheTrefferliste();
		});
	},
	// Zwischenspeicher für die Filterwerte
	filterWerte: [],
	// Filterwerte sammeln
	filterWerteSammeln () {
		karteisuche.filterWerte = [];
		for (let filter of document.querySelectorAll(".karteisuche-filter")) {
			const id = filter.id.replace(/.+-/, ""),
				typ = filter.value;
			// Filter ausgewählt?
			if (!typ) {
				continue;
			}
			// Objekt für die Filterwerte
			let obj = {
				typ: typ,
			};
			// Volltext
			if (typ === "Volltext") {
				let text = document.getElementById(`karteisuche-volltext-${id}`).value;
				text = helfer.textTrim(text.replace(/[<>]+/g, ""), true);
				if (!text) {
					continue;
				}
				const i = document.getElementById(`karteisuche-volltext-genau-${id}`).checked ? "" : "i";
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), i);
				karteisuche.filterWerte.push(obj);
			}
			// Tag
			else if (typ === "Tag") {
				obj.tagTyp = karteisuche.filterTagTyp(document.getElementById(`karteisuche-tag-typ-${id}`));
				obj.tagId = "";
				const tag = document.getElementById(`karteisuche-tag-${id}`).value;
				if (!obj.tagTyp || !tag) {
					continue;
				}
				for (let id in optionen.data.tags[obj.tagTyp].data) {
					if (!optionen.data.tags[obj.tagTyp].data.hasOwnProperty(id)) {
						continue;
					}
					if (optionen.data.tags[obj.tagTyp].data[id].name === tag) {
						obj.tagId = id;
						break;
					}
				}
				if (obj.tagId) {
					karteisuche.filterWerte.push(obj);
				}
			}
			// Karteidatum
			else if (typ === "Karteidatum") {
				obj.typVal = document.getElementById(`karteisuche-datum-typ-${id}`).value;
				obj.dirVal = document.getElementById(`karteisuche-datum-dir-${id}`).value;
				obj.datumVal = document.getElementById(`karteisuche-datum-${id}`).value;
				if (obj.datumVal) { // falls kein korrektes Datum eingegeben wurde, ist der Wert leer
					karteisuche.filterWerte.push(obj);
				}
			}
			// BearbeiterIn
			else if (typ === "BearbeiterIn") {
				obj.wert = document.getElementById(`karteisuche-person-${id}`).value;
				if (obj.wert) {
					karteisuche.filterWerte.push(obj);
				}
			}
			// Redaktion
			else if (typ === "Redaktion") {
				obj.er = document.getElementById(`karteisuche-redaktion-ereignis-${id}`).value;
				obj.pr = document.getElementById(`karteisuche-redaktion-person-${id}`).value;
				if (obj.er || obj.pr) {
					karteisuche.filterWerte.push(obj);
				}
			}
		}
	},
	// String-Datensätze, die der Volltextfilter berücksichtigt
	// (für die Bedeutungen wird es komplizierter)
	filterVolltext: {
		datei: ["no", "wo"],
		karten: ["au", "bl", "bs", "da", "kr", "no", "qu", "sy", "ts"],
	},
	// überprüfen, ob eine Kartei zu den übergebenen Filtern passt
	//   datei = Object
	//     (die ZTJ-Datei, die gefiltert werden soll; also alle Karteidaten, in der üblichen Form)
	filtern (datei) {
		forX: for (let filter of karteisuche.filterWerte) {
			// Volltext
			if (filter.typ === "Volltext") {
				// Datenfelder Kartei
				for (let ds of karteisuche.filterVolltext.datei) {
					if (filter.reg.test(datei[ds])) {
						continue forX;
					}
				}
				// Datenfelder Karteikarten
				for (let ds of karteisuche.filterVolltext.karten) {
					for (let id in datei.ka) {
						if (!datei.ka.hasOwnProperty(id)) {
							continue;
						}
						let text_rein = datei.ka[id][ds];
						if (ds === "bs") {
							text_rein = liste.belegTrennungWeg(text_rein, true);
						}
						if (filter.reg.test(text_rein)) {
							continue forX;
						}
					}
				}
				// Bedeutungen
				for (let id in datei.bd.gr) {
					if (!datei.bd.gr.hasOwnProperty(id)) {
						continue;
					}
					let bd = datei.bd.gr[id].bd;
					for (let i of bd) {
						const bedeutung = i.bd[i.bd.length - 1];
						if (filter.reg.test(bedeutung)) {
							continue forX;
						}
					}
				}
				return false;
			}
			// Tag
			else if (filter.typ === "Tag") {
				let gefunden = false;
				forTag: for (let id in datei.bd.gr) {
					if (!datei.bd.gr.hasOwnProperty(id)) {
						continue;
					}
					let bd = datei.bd.gr[id].bd;
					for (let i of bd) {
						for (let j of i.ta) {
							if (j.ty === filter.tagTyp &&
									j.id === filter.tagId) {
								gefunden = true;
								break forTag;
							}
						}
					}
				}
				if (!gefunden) {
					return false;
				}
			}
			// Karteidatum
			else if (filter.typ === "Karteidatum") {
				const ds = filter.typVal === "erstellt" ? "dc" : "dm",
					lt = filter.dirVal === "<=" ? true : false,
					datum = new Date(filter.datumVal),
					datumDatei = new Date(datei[ds].split("T")[0]);
				if (lt && datumDatei > datum ||
						!lt && datumDatei < datum) {
					return false;
				}
			}
			// BearbeiterIn
			else if (filter.typ === "BearbeiterIn" &&
					!datei.be.includes(filter.wert)) {
				return false;
			}
			// Redaktion
			else if (filter.typ === "Redaktion") {
				for (let i of datei.rd) {
					let gefunden = {
						er: filter.er && i.er === filter.er ? true : false,
						pr: filter.pr && i.pr === filter.pr ? true : false,
					};
					if (filter.er && filter.pr && gefunden.er && gefunden.pr ||
							filter.er && !filter.pr && gefunden.er ||
							!filter.er && filter.pr && gefunden.pr) {
						continue forX;
					}
				}
				return false;
			}
		}
		return true;
	},
	// aktuelle Filterkonfiguration in den Optionen speichern
	filterSpeichern () {
		optionen.data.karteisuche.filter = [];
		for (let filter of document.querySelectorAll(".karteisuche-filter")) {
			let inputs = filter.parentNode.parentNode.querySelectorAll("input"),
				filterDaten = [];
			for (let i of inputs) {
				if (i.type === "checkbox") {
					filterDaten.push(i.checked);
				} else {
					filterDaten.push(i.value);
				}
			}
			optionen.data.karteisuche.filter.push(filterDaten);
		}
		optionen.speichern();
	},
	// in den Optionen gespeicherte Filter wiederherstellen
	filterWiederherstellen () {
		for (let i = optionen.data.karteisuche.filter.length - 1; i >= 0; i--) {
			let werte = optionen.data.karteisuche.filter[i];
			// neuen Absatz erzeugen
			karteisuche.filterHinzufuegen(false);
			let typ = document.querySelector("#karteisuche-filter input");
			typ.value = werte[0];
			// Filterfelder einhängen
			karteisuche.filterFelder(typ.id);
			// Filterfelder füllen
			let inputs = document.querySelectorAll("#karteisuche-filter p:first-child input");
			for (let j = 1, len = werte.length; j < len; j++) {
				if (helfer.checkType("Boolean", werte[j])) {
					inputs[j].checked = werte[j];
				} else {
					inputs[j].value = werte[j];
				}
			}
		}
	},
	// Animation, dass die Karteisuche läuft
	//   anschalten = Boolean
	//     (die Animation soll angeschaltet werden)
	animation (anschalten) {
		let sperrbild = document.getElementById("karteisuche-suche-laeuft");
		// Animation soll ausgeschaltet werden
		if (!anschalten) {
			clearInterval(karteisuche.animationStatus.interval);
			sperrbild.classList.add("aus");
			return;
		}
		// Animation soll angeschaltet werden
		karteisuche.animationStatus.punkte = 3;
		karteisuche.animationStatus.interval = setInterval(() => karteisuche.animationRefresh(), 500);
		karteisuche.animationRefresh();
		sperrbild.classList.remove("aus");
	},
	// Status-Informationen für die Animation
	animationStatus: {
		punkte: 3,
		interval: null,
	},
	// Text in der Animation auffrischen
	animationRefresh() {
		let span = document.querySelector("#karteisuche-suche-laeuft span"),
			status = karteisuche.animationStatus;
		span.textContent = ".".repeat(status.punkte);
		if (status.punkte === 3) {
			status.punkte = 1;
		} else {
			status.punkte++;
		}
	},
};
