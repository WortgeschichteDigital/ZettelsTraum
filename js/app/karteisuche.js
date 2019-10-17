"use strict";

let karteisuche = {
	// Zwischenspeicher für diese Session, welche Pfade bereits gefunden wurden
	pfadGefunden: [],
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
		const fs = require("fs");
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
			// Existiert der Pfad noch?
			if (karteisuche.pfadGefunden.includes(pfad)) {
				continue;
			}
			if (fs.existsSync(pfad)) {
				karteisuche.pfadGefunden.push(pfad);
			} else {
				let img = document.createElement("img");
				span.insertBefore(img, span.lastChild);
				img.src = "img/x-dick-rot.svg";
				img.width = "24";
				img.height = "24";
				karteisuche.pfadFehler(img);
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
	pfadHinzufuegen () {
		const {app, dialog} = require("electron").remote;
		let opt = {
			title: "Pfad hinzufügen",
			defaultPath: app.getPath("documents"),
			properties: [
				"openDirectory",
			],
		};
		dialog.showOpenDialog(null, opt)
			.then(result => {
				if (result.canceled) {
					kartei.dialogWrapper("Sie haben keinen Pfad ausgewählt.");
					return;
				}
				// Ist der Pfad schon in der Liste?
				if (optionen.data.karteisuche.pfade.includes(result.filePaths[0])) {
					kartei.dialogWrapper("Der gewählte Pfad wurde schon aufgenommen.");
					return;
				}
				// Pfad hinzufügen
				karteisuche.pfadGefunden.push(result.filePaths[0]);
				optionen.data.karteisuche.pfade.push(result.filePaths[0]);
				optionen.speichern();
				// Liste auffrischen
				karteisuche.pfadeAuflisten();
			})
			.catch(err => kartei.dialogWrapper(`Beim Öffnen des Datei-Dialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`));
	},
	// Pfad aus der Liste entfernen
	//   a = Element
	//     (das Lösch-Icon)
	pfadEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Pfad entfernen
			const pfad = this.dataset.pfad;
			karteisuche.pfadGefunden.splice(karteisuche.pfadGefunden.indexOf(pfad), 1);
			optionen.data.karteisuche.pfade.splice(optionen.data.karteisuche.pfade.indexOf(pfad), 1);
			optionen.speichern();
			// Liste auffrischen
			karteisuche.pfadeAuflisten();
		});
	},
	// Reaktion auf Klick auf dem Fehler-Icon
	//   img = Element
	//     (das Fehler-Icon)
	pfadFehler (img) {
		img.addEventListener("click", function() {
			dialog.oeffnen("alert");
			dialog.text("Der Pfad konnte nicht gefunden werden.");
		});
	},
	// speichert das Input-Element, das vor dem Start der Suche den Fokus hatte
	suchenFokus: null,
	// Suche vorbereiten
	suchenPrep () {
		// Erst Pfad hinzufügen!
		if (!optionen.data.karteisuche.pfade.length) {
			dialog.oeffnen("alert", function() {
				karteisuche.pfadHinzufuegen();
			});
			dialog.text("Sie müssen zunächst einen Pfad hinzufügen.\nIn diesem Pfad wird dann rekursiv gesucht.");
			document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
			return;
		}
		// Keiner der Pfade wurde gefunden!
		if (!karteisuche.pfadGefunden.length) {
			dialog.oeffnen("alert");
			let text = "Der Pfad in der Liste konnte nicht gefunden werden.";
			if (optionen.data.karteisuche.pfade.length > 1) {
				text = "Die Pfade in der Liste konnten nicht gefunden werden.";
			}
			dialog.text(text);
			document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
			return;
		}
		// Pfade ermitteln, in denen gesucht werden soll
		let pfade = [],
			inputs = document.querySelectorAll("#karteisuche-pfade input");
		if (inputs.length) {
			for (let i of inputs) {
				if (i.checked && karteisuche.pfadGefunden.includes(i.value)) {
					pfade.push(i.value);
				}
			}
		} else {
			pfade = [...karteisuche.pfadGefunden];
		}
		// Wurden Pfade gefunden? Wenn nein => alle Checkboxes abgewählt
		if (!pfade.length) {
			dialog.oeffnen("alert");
			let text = "Pfad";
			if (optionen.data.karteisuche.pfade.length !== karteisuche.pfadGefunden.length) {
				text = "der existierenden Pfade";
			}
			dialog.text(`Sie müssen mindestens einen ${text} auswählen.`);
			document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
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
		document.getElementById("karteisuche-suche-laeuft").classList.remove("aus");
		setTimeout(function() {
			karteisuche.suchen(pfade);
		}, 500);
	},
	// Suche starten
	//   pfade = Array
	//     (Pfade, in denen gesucht werden soll)
	suchen (pfade) {
		// Suche starten
		karteisuche.wgd = [];
		const fs = require("fs");
		for (let pfad of pfade) {
			if (fs.existsSync(pfad)) {
				karteisuche.wgdFinden(pfad);
			}
		}
		// Filterwerte sammeln
		karteisuche.filterWerteSammeln();
		// Karteien analysieren
		for (let kartei of karteisuche.wgd) {
			const fs = require("fs"),
				content = fs.readFileSync(kartei.pfad, {encoding: "utf-8", flag: "r"});
			// Kartei einlesen
			let datei = {};
			try {
				datei = JSON.parse(content);
			} catch (err) {
				continue;
			}
			// keine WGD-Datei
			if (datei.ty !== "wgd") {
				continue;
			}
			// Wort merken
			kartei.wort = datei.wo;
			// mit Suchfiltern abgleichen
			kartei.passt = karteisuche.filtern(datei);
		}
		// passende Karteien auflisten
		karteisuche.wgdAuflisten();
		// Sperrbild weg und das zuletzt fokussierte Element wieder fokussieren
		document.getElementById("karteisuche-suche-laeuft").classList.add("aus");
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.focus();
		}
		// Filter speichern
		karteisuche.filterSpeichern();
	},
	// WGD-Dateien, die gefunden wurden;
	// Array enthält Objekte:
	//   pfad (String; Pfad zur Kartei)
	//   wort (String; Wort der Kartei)
	//   passt (Boolean; passt zu den Suchfiltern)
	wgd: [],
	// WGD-Dateien suchen
	//   pfadStart = String
	//     (Ordner von dem aus die Suche beginnen soll)
	wgdFinden (pfadStart) {
		const fs = require("fs"),
			path = require("path");
		let inhalt = fs.readdirSync(pfadStart);
		for (let i of inhalt) {
			const pfad = path.join(pfadStart, i);
			let stat = fs.lstatSync(pfad);
			if (stat.isDirectory()){
				karteisuche.wgdFinden(pfad);
			} else if (/\.wgd$/.test(pfad)) {
				karteisuche.wgd.push({
					pfad: pfad,
					wort: "",
					passt: false,
				});
			}
		}
	},
	// WGD-Dateien auflisten
	wgdAuflisten () {
		let treffer = 0,
			woerter = [];
		for (let i = 0, len = karteisuche.wgd.length; i < len; i++) {
			if (!karteisuche.wgd[i].passt) {
				continue;
			}
			treffer++;
			woerter.push({
				wort: karteisuche.wgd[i].wort,
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
			let p = document.createElement("p");
			cont.appendChild(p);
			let pfad = karteisuche.wgd[wort.i].pfad;
			p.dataset.pfad = pfad;
			karteisuche.wgdOeffnen(p);
			// Wort
			let span = document.createElement("span");
			p.appendChild(span);
			span.textContent = wort.wort;
			// Pfad
			span = document.createElement("span");
			p.appendChild(span);
			span.textContent = pfad;
			span.title = pfad;
		}
	},
	// WGD-Datei in neuem Fenster öffnen
	//   p = Element
	//     (Absatz, der auf eine WGD-Datei verweist)
	wgdOeffnen (p) {
		p.addEventListener("click", function() {
			// die Kartei könnte bereits in diesem Fenster offen sein
			if (kartei.pfad === this.dataset.pfad) {
				return;
			}
			// Kartei in einem neuen Fenster öffnen
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("kartei-laden", this.dataset.pfad, false);
		});
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
			if (evt.which === 13 &&
					!document.getElementById("dropdown")) { // Enter
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
	// Werte der aktuellen Filter sammeln
	//   datei = Object
	//     (die WGD-Datei, die gefiltert werden soll; also alle Karteidaten, in der üblichen Form)
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
};
