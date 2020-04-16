"use strict";

let karteisuche = {
	// Suche-Fenster öffnen
	async oeffnen () {
		let fenster = document.getElementById("karteisuche");
		overlay.oeffnen(fenster);
		// schmale Anzeige?
		karteisuche.filterBreite();
		// Cache holen
		const {ipcRenderer} = require("electron");
		karteisuche.ztjCache = await ipcRenderer.invoke("ztj-cache-get");
		// Suchbutton fokussieren
		let buttons = fenster.querySelectorAll(`input[type="button"]`);
		if (Object.keys(karteisuche.ztjCache).length) {
			buttons[1].classList.remove("aus");
			buttons[1].focus();
		} else {
			buttons[0].focus();
		}
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
		// Suche starten
		karteisuche.suchenPrepZtj(pfade);
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
	// ZTJ-Dateien zusammentragen
	//   pfade = Array
	//     (Pfade, in denen gesucht werden soll;
	//     das Array ist leer, wenn im Cache gesucht werden soll)
	async suchenPrepZtj (pfade) {
		// Cache-Daten aus Main holen
		const {ipcRenderer} = require("electron");
		karteisuche.ztjCache = await ipcRenderer.invoke("ztj-cache-get");
		// Element mit Fokus speichern
		karteisuche.suchenFokus = document.querySelector("#karteisuche input:focus");
		if (karteisuche.suchenFokus) {
			karteisuche.suchenFokus.blur();
		} else {
			karteisuche.suchenFokus = null;
		}
		// Animation einblenden
		karteisuche.animation(true);
		// Dateien suchen
		setTimeout(async () => {
			karteisuche.ztj = [];
			if (pfade.length) {
				// Dateien auf Speichermedium suchen
				for (let ordner of pfade) {
					const exists = await helfer.exists(ordner);
					if (exists) {
						await karteisuche.ordnerParsen(ordner);
					}
				}
			} else {
				// Dateidaten aus dem Cache zusammentragen
				for (let pfad of Object.keys(karteisuche.ztjCache)) {
					karteisuche.ztj.push({
						pfad: pfad,
						ctime: karteisuche.ztjCache[pfad].ctime,
						wort: "",
						wortSort: "",
						redaktion: [],
						behandeltIn: "",
						behandeltMit: [],
						passt: false,
					});
				}
			}
			karteisuche.suchen();
		}, 500);
	},
	// Suche starten
	async suchen () {
		// Filterwerte sammeln
		karteisuche.filterWerteSammeln();
		// Karteien analysieren
		const {ipcRenderer} = require("electron");
		let ztjAdd = [],
			ztjMit = {};
		for (let kartei of karteisuche.ztj) {
			// Kartei einlesen
			let datei = {};
			if (karteisuche.ztjCache[kartei.pfad] &&
					kartei.ctime === karteisuche.ztjCache[kartei.pfad].ctime) {
				// aus Cache holen
				datei = karteisuche.ztjCache[kartei.pfad].data;
			} else {
				// vom Speichermedium holen
				const content = await io.lesen(kartei.pfad);
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
				// Kartei cachen
				ipcRenderer.invoke("ztj-cache-save", {
					pfad: kartei.pfad,
					ctime: kartei.ctime,
					data: datei,
				});
				karteisuche.ztjCache[kartei.pfad] = { // Arbeitskopie im Fenster up-to-date halten
					ctime: kartei.ctime,
					data: datei,
				};
			}
			// Werden in der Kartei mehrere Wörter behandelt?
			let woerter = [datei.wo];
			if (/, (?!der|die|das)/.test(datei.wo)) {
				woerter = datei.wo.split(", ");
			}
			for (let i = 0, len = woerter.length; i < len; i++) {
				let ziel = kartei;
				if (i > 0) {
					ztjAdd.push({
						pfad: kartei.pfad,
						ctime: kartei.ctime,
						wort: "",
						wortSort: "",
						redaktion: [],
						behandeltIn: "",
						behandeltMit: [],
						passt: false,
					});
					ziel = ztjAdd[ztjAdd.length - 1];
				}
				// Wort merken
				ziel.wort = woerter[i];
				ziel.wortSort = karteisuche.wortSort(woerter[i]);
				// Behandelt-Datensätze
				if (woerter.length > 1) {
					let mit = [...woerter];
					mit.splice(i, 1);
					ziel.behandeltMit = [...mit];
				}
				if (datei.rd.bh) {
					ziel.behandeltIn = datei.rd.bh;
					if (!ztjMit[datei.rd.bh]) {
						ztjMit[datei.rd.bh] = [];
					}
					ztjMit[datei.rd.bh].push(woerter[i]);
				}
				// mit Suchfiltern abgleichen
				if (i > 0) {
					ziel.passt = kartei.passt;
				} else {
					ziel.passt = karteisuche.filtern(datei);
				}
				// Redaktionsereignisse klonen
				if (ziel.passt) {
					let er = datei.rd.er;
					if (!er) {
						// bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
						// erst danach in data.rd.er
						er = datei.rd;
					}
					for (let erg of er) {
						ziel.redaktion.push({...erg});
					}
				}
			}
		}
		// Karteiliste ggf. ergänzen
		karteisuche.ztj = karteisuche.ztj.concat(ztjAdd);
		for (let i of karteisuche.ztj) {
			if (ztjMit[i.wort]) {
				i.behandeltMit = i.behandeltMit.concat(ztjMit[i.wort]);
			}
		}
		// passende Karteien auflisten
		karteisuche.ztjAuflisten();
		// ggf. Cache-Button ein- oder ausblenden
		let button = document.querySelectorAll(`#karteisuche input[type="button"]`)[1];
		if (karteisuche.ztj.length ||
				Object.keys(karteisuche.ztjCache).length) {
			button.classList.remove("aus");
		} else {
			button.classList.add("aus");
		}
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
	//   ctime (String; Änderungsdatum der Kartei)
	//   wort (String; Wort der Kartei)
	//   wortSort (String; Sortierform des Worts der Kartei)
	//   redaktion (Array; Klon von data.rd.er)
	//   behandeltIn (String; Wort, in dem das aktuelle Wort behandelt wird)
	//   behandeltMit (String; Array, mit denen das aktuelle Wort behandelt wird)
	//   passt (Boolean; passt zu den Suchfiltern)
	ztj: [],
	// Cache für ZTJ-Dateien
	// (wird beim Öffnen des Fensters und Start einer Suche aus Main geholt)
	//   ctime (String; Änderungsdatum der Kartei)
	//   data (Object; die kompletten Karteidaten)
	ztjCache: {},
	// findet alle Pfade in einem übergebenen Ordner
	//   ordner = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	ordnerParsen (ordner) {
		return new Promise(async resolve => {
			const fsP = require("fs").promises;
			try {
				let files = await fsP.readdir(ordner);
				for (let i of files) {
					const path = require("path"),
						pfad = path.join(ordner, i);
					await karteisuche.pfadPruefen(pfad);
				}
				resolve(true);
			} catch (err) { // Auslesen des Ordners fehlgeschlagen
				resolve(false);
			}
		});
	},
	// überprüft einen übergebenen Pfad: Ordner oder ZTJ-Datei?
	//   pfad = String
	//     (Ordner, von dem aus die Suche beginnen soll)
	pfadPruefen (pfad) {
		return new Promise(async resolve => {
			const fs = require("fs"),
				fsP = fs.promises;
			try {
				await fsP.access(pfad, fs.constants.R_OK); // Lesezugriff auf Pfad? Wenn kein Zugriff => throw
				let stats = await fsP.lstat(pfad); // Natur des Pfades?
				if (stats.isDirectory()) { // Ordner => parsen
					await karteisuche.ordnerParsen(pfad);
				} else if (/\.ztj$/.test(pfad)) { // ZTJ-Datei => merken
					karteisuche.ztj.push({
						pfad: pfad,
						ctime: stats.ctime.toString(),
						wort: "",
						wortSort: "",
						redaktion: [],
						behandeltIn: "",
						behandeltMit: [],
						passt: false,
					});
				}
				resolve(true);
			} catch (err) { // wahrscheinlich besteht kein Zugriff auf den Pfad
				resolve(false);
			}
		});
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
				wortSort: karteisuche.ztj[i].wortSort,
				i: i,
			});
		}
		woerter.sort(function(a, b) {
			let arr = [a.wortSort, b.wortSort];
			arr.sort(helfer.sortAlpha);
			if (a.wortSort === arr[0]) {
				return -1;
			}
			return 1;
		});
		// Treffer anzeigen
		document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
		// Karteiliste füllen
		let cont = document.getElementById("karteisuche-karteien"),
			alphabet = new Set();
		helfer.keineKinder(cont);
		for (let wort of woerter) {
			// Absatz
			let div = document.createElement("div");
			cont.appendChild(div);
			let alpha = karteisuche.wortAlpha(wort.wortSort);
			alphabet.add(alpha);
			div.dataset.buchstabe = alpha;
			div.dataset.idx = wort.i;
			// Link
			let a = document.createElement("a");
			div.appendChild(a);
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
			// ggf. Infos ergänzen
			karteisuche.ztjAuflistenInfos(div, wort.i);
		}
		// Maximalhöhe Trefferliste setzen
		karteisuche.hoeheTrefferliste();
		// Alphabet drucken
		karteisuche.alphabet(alphabet);
	},
	// Infos ergänzen (Redaktionsstatus und -ereignisse und Verweise)
	//   div = Element
	//     (der Container, in dem die Ereignisse angezeigt werden sollen)
	//   i = Number
	//     (Index, der auf die Daten in karteisuche.ztj zeigt)
	ztjAuflistenInfos (div, i) {
		// Wrapper erzeugen
		let wrap = document.createElement("div");
		// Redaktionsinfos
		if (karteisuche.filterWerte.some(i => i.typ === "Redaktion")) {
			// Redaktionsstatus drucken
			let status = karteisuche.ztjAuflistenRedaktion(i),
				stat = document.createElement("span");
			wrap.appendChild(stat);
			stat.classList.add("karteisuche-status", `karteisuche-status${status.status}`);
			// höchstes Redaktionsereignis drucken
			let erg = document.createElement("span");
			wrap.appendChild(erg);
			erg.classList.add("karteisuche-hoechst");
			erg.textContent = status.ereignis;
			// Personen und Daten: Wer hat wann was erstellt?
			let erstellt = [
				{
					arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Kartei erstellt"),
					txt: "Kartei",
				},
				{
					arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Artikel erstellt"),
					txt: "Artikel",
				},
			];
			let br = false;
			for (let e of erstellt) {
				for (let i of e.arr) {
					if (br) {
						wrap.appendChild(document.createElement("br"));
					}
					let typ = document.createElement("i");
					wrap.appendChild(typ);
					typ.textContent = `${e.txt}:`;
					let da = helfer.datumFormat(i.da, true).split(", ")[0],
						pr = i.pr ? i.pr : "N. N.";
					wrap.appendChild(document.createTextNode(` ${pr} (${da})`));
					br = true;
				}
			}
		}
		// Verweisinfos
		let verweise = karteisuche.ztjAuflistenVerweise(i);
		if (verweise) {
			if (wrap.hasChildNodes()) {
				wrap.appendChild(document.createElement("br"));
			}
			wrap.appendChild(verweise);
		}
		// Wrapper einhängen, wenn er denn gefüllt wurde
		if (wrap.hasChildNodes()) {
			div.appendChild(wrap);
		}
	},
	// Redaktionsstatus ermitteln
	//   idx = Number
	//     (auf karteisuche.ztj zeigender Index)
	ztjAuflistenRedaktion (idx) {
		let ds = karteisuche.ztj[idx],
			ereignisse = Object.keys(redaktion.ereignisse),
			status = 1,
			status2 = ereignisse.indexOf("Artikel erstellt"),
			status3 = ereignisse.indexOf("Artikel fertig"),
			status4 = ereignisse.indexOf("Artikel online"),
			hoechst = -1;
		for (let i of ds.redaktion) {
			let idx = ereignisse.indexOf(i.er);
			hoechst = idx > hoechst ? idx : hoechst;
		}
		// Status ermitteln
		if (hoechst >= status4) {
			status = 4;
		} else if (hoechst >= status3) {
			status = 3;
		} else if (hoechst >= status2) {
			status = 2;
		}
		return {
			hoechst,
			status,
			status2,
			status3,
			status4,
			ereignis: ereignisse[hoechst],
		};
	},
	// Verweise ermitteln
	//   i = Number
	//     (Index, der auf die Daten in karteisuche.ztj zeigt)
	ztjAuflistenVerweise (i) {
		// Verweise ermitteln
		let verweise = [...new Set(karteisuche.ztj[i].behandeltMit)];
		verweise.sort(helfer.sortAlpha);
		verweise.forEach((i, n) => {
			verweise[n] = `+ ${i}`;
		});
		let bhIn = karteisuche.ztj[i].behandeltIn;
		if (bhIn) {
			verweise.unshift(`→ ${bhIn}`);
		}
		// keine Verweise vorhanden
		if (!verweise.length) {
			return null;
		}
		// Verweise vorhanden
		let span = document.createElement("span");
		span.classList.add("verweise");
		for (let i = 0, len = verweise.length; i < len; i++) {
			if (i > 0) {
				span.appendChild(document.createTextNode(", "));
			}
			let v = verweise[i],
				wrap = document.createElement("span");
			if (/^→/.test(v)) {
				wrap.textContent = "→ ";
				wrap.title = "behandelt in";
			} else {
				wrap.textContent = "+ ";
				wrap.title = "behandelt mit";
			}
			span.appendChild(wrap);
			span.appendChild(document.createTextNode(v.substring(2)));
		}
		return span;
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
			max = window.innerHeight - 40 - 28 - 20 - 50 - 20; // 40px Abstand oben, 28px Fensterkopf, 20px Paddings, 50px Margins, 20px Abstand unten
		for (let i of document.getElementById("karteisuche-cont").childNodes) {
			if (i === liste || i.nodeType !== 1) {
				continue;
			}
			max -= i.offsetHeight;
		}
		liste.style.maxHeight = `${max}px`;
	},
	// Sortierwort aus dem übergebenen Wort/Ausdruck ableiten
	// (denn das Wort könnte mehrgliedrig sein, Beispiele:
	// politisch korrekt => Rückgabe: politisch;
	// der kleine Mann => Rückgabe: Mann)
	//   wort = String
	//     (Wort oder Ausdruck)
	wortSort (wort) {
		let sortform = "";
		for (let i of wort.split(/\s/)) {
			// Artikel ignorieren
			if (/^der|die|das$/.test(i)) {
				continue;
			}
			// erstes Wort, das kein Artikel ist
			if (!sortform) {
				sortform = i;
			}
			// erstes Wort, das mit einem Großbuchstaben beginnt, bevorzugen
			if (/^[A-ZÄÖÜ]/.test(i)) {
				sortform = i;
				break;
			}
		}
		if (!sortform) {
			// das Wort war offenbar ein Artikel
			return wort;
		}
		return sortform;
	},
	// Buchstabe des Alphabets aus dem übergebenen Karteiwort ableiten
	//   wort = String
	//     (das Wort, um das es geht)
	wortAlpha (wort) {
		let erster = wort.substring(0, 1).toUpperCase();
		switch (erster) {
			case "Ä":
				erster = "A";
				break;
			case "Ö":
				erster = "O";
				break;
			case "Ü":
				erster = "U";
				break;
		}
		return erster;
	},
	// Alphabet drucken
	//   alpha = Set
	//     (Buchstaben des Alphabets, die auftauchen)
	alphabet (alpha) {
		// Liste löschen
		let cont = document.getElementById("karteisuche-alphabet");
		helfer.keineKinder(cont);
		// keine Treffer
		if (!alpha.size) {
			return;
		}
		// Liste aufbauen
		let alphabet = [...alpha].sort();
		alphabet.unshift("alle");
		for (let i = 0, len = alphabet.length; i < len; i++) {
			let a = document.createElement("a");
			cont.appendChild(a);
			a.dataset.buchstabe = alphabet[i];
			a.href = "#";
			a.textContent = alphabet[i];
			if (i === 0) {
				a.classList.add("aktiv");
				cont.appendChild(document.createTextNode("|"));
			}
		}
		// Maximalbreite berechnen
		let h = cont.parentNode,
			treffer = document.getElementById("karteisuche-treffer"),
			belegt = treffer.offsetLeft + treffer.offsetWidth + h.lastChild.offsetWidth + 4 + 2 * 25; // 4px Abstand rechts, 2 * 25px Margins zum Alphabet
		cont.style.maxWidth = `calc(100% - ${belegt}px`;
		// Klickevents anhängen
		cont.querySelectorAll("a").forEach(a => karteisuche.alphabetFilter(a));
	},
	// Trefferliste nach Buchstaben filtern
	//   a = Element
	//     (Link für einen oder alle Buchstaben)
	alphabetFilter (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let b = this.dataset.buchstabe,
				liste = document.getElementById("karteisuche-karteien"),
				treffer = 0;
			// filtern
			for (let i of liste.childNodes) {
				let anzeigen = false;
				if (b === "alle" || b === i.dataset.buchstabe) {
					anzeigen = true;
				}
				if (anzeigen) {
					i.classList.remove("aus");
					treffer++;
				} else {
					i.classList.add("aus");
				}
			}
			// aktiven Filter markieren
			let alpha = document.getElementById("karteisuche-alphabet");
			alpha.querySelector(".aktiv").classList.remove("aktiv");
			this.classList.add("aktiv");
			// Trefferzahl auffrischen
			document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
		});
	},
	// Trefferlistenexport: sichtbare Treffer, die exportiert werden können
	// (Indizes, die auf karteisuche.ztj verweisen)
	trefferlisteItems: [],
	// Trefferlistenexport
	trefferlisteExportieren () {
		// keine Treffer in der Liste
		let items = document.querySelectorAll("#karteisuche-karteien > div");
		if (!items.length) {
			let text = "Es wurden keine Karteien gefunden.";
			if (!document.getElementById("karteisuche-treffer").textContent) {
				text = "Sie müssen zuerst eine Suche anstoßen.";
			}
			dialog.oeffnen({
				typ: "alert",
				text,
				callback: () => document.getElementById("karteisuche-suchen").focus(),
			});
			return;
		}
		// Treffer sammeln
		karteisuche.trefferlisteItems = [];
		for (let i = 0, len = items.length; i < len; i++) {
			if (items[i].classList.contains("aus")) {
				continue;
			}
			karteisuche.trefferlisteItems.push(i);
		}
		// Exportformat erfragen
		let fenster = document.getElementById("karteisuche-export");
		overlay.oeffnen(fenster);
		fenster.querySelector("input").focus();
	},
	// Trefferlistenexport durchführen
	trefferlisteExportierenDo () {
		// Auswahlfenster schließen
		overlay.schliessen(document.getElementById("karteisuche-export"));
		// Ausgabe erzeugen
		let md = document.getElementById("karteisuche-export-format-md").checked,
			knapp = document.getElementById("karteisuche-export-typ-knapp").checked,
			items = document.querySelectorAll("#karteisuche-karteien > div"),
			content = "",
			alpha = "";
		if (!md) {
			content = `<!doctype html>\n<html lang="de"><head>\n<meta charset="utf-8">\n<title>Karteiliste</title>\n</head><body>`;
		}
		for (let i of karteisuche.trefferlisteItems) {
			// Überschrift und Kopfzeile
			let item = items[i],
				buchstabe = item.dataset.buchstabe;
			if (buchstabe !== alpha) {
				alpha = buchstabe;
				if (md) {
					content += `\n# ${buchstabe}\n\n`;
					if (!knapp) {
						content += "| Wort |   | Status | in/mit | Kartei | Datum | Artikel | Datum |\n";
						content += "| --- | --- | --- | --- | --- | --- | --- | --- |\n";
					}
				} else {
					if (/<\/li>$/.test(content)) {
						content += "\n</ul>";
					} else if (/<\/tr>$/.test(content)) {
						content += "\n</table>";
					}
					content += `\n<h1>${buchstabe}</h1>`;
					if (knapp) {
						content += "\n<ul>";
					} else {
						content += "\n<table>\n<tr><th>Wort</th><th> </th><th>Status</th><th>in/mit</th><th>Kartei</th><th>Datum</th><th>Artikel</th><th>Datum</th></tr>";
					}
				}
			}
			// Artikelzeile
			let idx = parseInt(item.dataset.idx, 10),
				status = karteisuche.ztjAuflistenRedaktion(idx),
				statusTxt = "abgeschlossen",
				kartei = karteisuche.ztj[idx].redaktion.filter(v => v.er === "Kartei erstellt"),
				karteiDa = helfer.datumFormat(kartei[0].da, true).split(", ")[0],
				karteiPr = kartei[0].pr ? kartei[0].pr : "N. N.",
				artikel = karteisuche.ztj[idx].redaktion.filter(v => v.er === "Artikel erstellt"),
				artikelDa = "",
				artikelPr = "",
				behandeltIn = karteisuche.ztj[idx].behandeltIn,
				behandeltMit = [...new Set(karteisuche.ztj[idx].behandeltMit)],
				inMit = [],
				check = "✓";
			if (status.status === 1) {
				statusTxt = "in Arbeit";
			}
			if (artikel.length) {
				artikelDa = helfer.datumFormat(artikel[0].da, true).split(", ")[0];
				artikelPr = artikel[0].pr ? artikel[0].pr : "N. N.";
			}
			if (behandeltIn || behandeltMit.length) {
				inMit = [...behandeltMit];
				inMit.sort(helfer.sortAlpha);
				for (let j = 0, len = inMit.length; j < len; j++) {
					inMit[j] = `+ ${inMit[j]}`;
				}
				if (behandeltIn) {
					inMit.unshift(`→ ${behandeltIn}`);
				}
			}
			if (status.hoechst < status.status3) {
				check = " ";
			}
			if (md) {
				if (knapp) {
					content += `* ${karteisuche.ztj[idx].wort} (${statusTxt})\n`;
				} else {
					content += `| ${karteisuche.ztj[idx].wort} | ${check} | ${status.ereignis} | `;
					if (inMit.length) {
						content += inMit.join(", ");
					} else {
						content += " ";
					}
					content += ` | ${karteiPr} | ${karteiDa}`;
					if (artikelPr) {
						content += ` | ${artikelPr} | ${artikelDa} |\n`;
					} else {
						content += " | – | – |\n";
					}
				}
			} else {
				if (knapp) {
					content += `\n<li>${karteisuche.ztj[idx].wort} (${statusTxt})</li>`;
				} else {
					content += `\n<tr><td>${karteisuche.ztj[idx].wort}</td><td>${check}</td><td>${status.ereignis}</td>`;
					if (inMit.length) {
						content += `<td>${inMit.join(", ")}</td>`;
					} else {
						content += "<td> </td>";
					}
					content += `<td>${karteiPr}</td><td>${karteiDa}</td>`;
					if (artikelPr) {
						content += `<td>${artikelPr}</td><td>${artikelDa}</td></tr>`;
					} else {
						content += "<td>–</td><td>–</td></tr>";
					}
				}
			}
		}
		if (!md) {
			if (/<\/li>$/.test(content)) {
				content += "\n</ul>";
			} else if (/<\/tr>$/.test(content)) {
				content += "\n</table>";
			}
			content += "\n</body></html>\n";
		}
		// Daten zum Speichern anbieten
		let format = {
			name: "Markdown",
			ext: "md",
		};
		if (!md) {
			format.name = "HTML";
			format.ext = "html";
		}
		karteisuche.trefferlisteExportierenDialog(content, format);
	},
	// Trefferlistenexport: Daten zum Speichern anbieten
	//   content = String
	//     (die Daten)
	//   format = Object
	//     (Angaben zum Format)
	async trefferlisteExportierenDialog (content, format) {
		const path = require("path");
		let opt = {
			title: `${format.name} speichern`,
			defaultPath: path.join(appInfo.documents, `Karteiliste.${format.ext}`),
			filters: [
				{
					name: format.name,
					extensions: [format.ext],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: false,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Kartei speichern
		const fsP = require("fs").promises;
		fsP.writeFile(result.filePath, content)
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Speichern der Karteiliste ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
				});
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
		"Karteiwort": [
			{
				type: "text",
				ro: false,
				cl: "karteisuche-karteiwort",
				ph: "Suchtext",
				pre: "",
			},
		],
		"Sachgebiet": [
			{
				type: "dropdown",
				ro: false,
				cl: "karteisuche-sachgebiet",
				ph: "Sachgebiet",
				pre: "",
			},
		],
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
				cl: "karteisuche-redaktion-logik",
				ph: "Logik",
				pre: "=",
			},
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
		karteisuche.filterFelderListener(input);
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
					!document.querySelector("#dropdown .aktiv")) {
				evt.preventDefault();
				if (Object.keys(karteisuche.ztjCache).length) {
					karteisuche.suchenPrepZtj([]);
				} else {
					karteisuche.suchenPrep();
				}
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
				karteisuche.filterIgnorieren(filter, true);
				continue;
			}
			// Objekt für die Filterwerte
			let obj = {
				typ: typ,
			};
			// Karteiwort
			if (typ === "Karteiwort") {
				let text = document.getElementById(`karteisuche-karteiwort-${id}`).value;
				text = helfer.textTrim(text, true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
				karteisuche.filterWerte.push(obj);
			}
			// Sachgebiet
			else if (typ === "Sachgebiet") {
				obj.id = "";
				const tag = document.getElementById(`karteisuche-sachgebiet-${id}`).value;
				if (!tag || !optionen.data.tags.sachgebiete) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				for (let id in optionen.data.tags.sachgebiete.data) {
					if (!optionen.data.tags.sachgebiete.data.hasOwnProperty(id)) {
						continue;
					}
					if (optionen.data.tags.sachgebiete.data[id].name === tag) {
						obj.id = id;
						break;
					}
				}
				if (obj.id) {
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// Volltext
			else if (typ === "Volltext") {
				let text = document.getElementById(`karteisuche-volltext-${id}`).value;
				text = helfer.textTrim(text.replace(/[<>]+/g, ""), true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
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
					karteisuche.filterIgnorieren(filter, true);
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
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// Karteidatum
			else if (typ === "Karteidatum") {
				obj.typVal = document.getElementById(`karteisuche-datum-typ-${id}`).value;
				obj.dirVal = document.getElementById(`karteisuche-datum-dir-${id}`).value;
				obj.datumVal = document.getElementById(`karteisuche-datum-${id}`).value;
				if (obj.datumVal) { // falls kein korrektes Datum eingegeben wurde, ist der Wert leer
					karteisuche.filterWerte.push(obj);
				} else {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
			}
			// BearbeiterIn
			else if (typ === "BearbeiterIn") {
				let text = document.getElementById(`karteisuche-person-${id}`).value;
				text = helfer.textTrim(text, true);
				if (!text) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
				karteisuche.filterWerte.push(obj);
			}
			// Redaktion
			else if (typ === "Redaktion") {
				let textEr = document.getElementById(`karteisuche-redaktion-ereignis-${id}`).value,
					textPr = document.getElementById(`karteisuche-redaktion-person-${id}`).value;
				textEr = helfer.textTrim(textEr, true);
				textPr = helfer.textTrim(textPr, true);
				if (!textEr && !textPr) {
					karteisuche.filterIgnorieren(filter, true);
					continue;
				}
				if (textEr) {
					obj.er = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textEr)), "i");
				}
				if (textPr) {
					obj.pr = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textPr)), "i");
				}
				obj.logik = document.getElementById(`karteisuche-redaktion-logik-${id}`).value;
				karteisuche.filterWerte.push(obj);
			}
			karteisuche.filterIgnorieren(filter, false);
		}
	},
	// markiert/demarkiert Filter, die ignoriert werden/wurden
	//   filter = Element
	//     (Input-Feld mit der Bezeichnung des Filtertyps)
	//   ignorieren = Boolean
	//     (Filter wird ignoriert bzw. nicht mehr ignoriert)
	filterIgnorieren (filter, ignorieren) {
		let p = filter.closest("p");
		if (ignorieren) {
			p.classList.add("karteisuche-ignoriert");
		} else {
			p.classList.remove("karteisuche-ignoriert");
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
		let be = datei.rd.be;
		if (!be) {
			// bis Dateiformat Version 12 standen die Bearbeiterinnen in data.be;
			// erst danach in data.rd.be
			be = datei.be;
		}
		let er = datei.rd.er;
		if (!er) {
			// bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
			// erst danach in data.rd.er
			er = datei.rd;
		}
		forX: for (let filter of karteisuche.filterWerte) {
			// Karteiwort
			if (filter.typ === "Karteiwort" &&
					!filter.reg.test(datei.wo)) {
				return false;
			}
			// Sachgebiet
			else if (filter.typ === "Sachgebiet") {
				let gefunden = false;
				if (datei.rd.sg) {
					// dieser Datensatz wurde erst mit Dateiformat Version 13 eingeführt;
					// davor existierte er nicht
					for (let i of datei.rd.sg) {
						if (i.id === filter.id) {
							gefunden = true;
							break;
						}
					}
				}
				if (!gefunden) {
					return false;
				}
			}
			// Volltext
			else if (filter.typ === "Volltext") {
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
					!hasSome(be, filter.reg)) {
				return false;
			}
			// Redaktion
			else if (filter.typ === "Redaktion") {
				for (let i of er) {
					let gefunden = {
						er: filter.er && filter.er.test(i.er) ? true : false,
						pr: filter.pr && filter.pr.test(i.pr) ? true : false,
					};
					let treffer = filter.er && filter.pr && gefunden.er && gefunden.pr ||
							filter.er && !filter.pr && gefunden.er ||
							!filter.er && filter.pr && gefunden.pr;
					if (treffer && filter.logik === "=") {
						continue forX;
					} else if (treffer && filter.logik !== "=") {
						return false;
					}
				}
				if (filter.logik !== "=") {
					continue forX;
				}
				return false;
			}
		}
		return true;
		// testet, ob die Bedingungen zutreffen
		// (ausgelagert, damit die Funktionen nicht in der Schleife sind)
		//   arr = Array
		//     (hier wird gesucht)
		//   reg = RegExp
		//     (regulärer Ausdruck, mit dem gesucht wird)
		function hasSome (arr, reg) {
			return arr.some(v => reg.test(v));
		}
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
			// Korrektur Redaktionsfilter
			// (ab Version 0.32.0 gibt es ein Logikfeld: = || !=)
			if (werte[0] === "Redaktion" && werte.length === 3) {
				werte.splice(1, 0, "=");
			}
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
	// feststellen, ob die Textfelder in den Filtern verkleiner werden müssen
	// (blöder Hack, geht aber nicht mit overflow, da die Dropdown-Menüs ausbrechen
	// müssen; setzt man overflow-x auf "hidden", wird overflow-y automatisch zu "auto",
	// ganz egal, was man deklariert)
	filterBreite () {
		let ks = document.getElementById("karteisuche");
		if (ks.classList.contains("aus")) {
			return;
		}
		if (ks.querySelector("div").offsetWidth < 730) {
			ks.classList.add("karteisuche-schmal");
		} else {
			ks.classList.remove("karteisuche-schmal");
		}
	},
	// Ansicht der Filter umschalten
	filterUmschalten () {
		let filter = document.getElementById("karteisuche-filterblock"),
			hoehe = 0;
		if (filter.classList.contains("aus")) {
			filter.classList.remove("aus");
			hoehe = filter.scrollHeight;
			karteisuche.hoeheTrefferliste();
			filter.classList.add("blenden");
			filter.style.height = "0px";
			filter.style.paddingTop = "0px";
			setTimeout(() => {
				filter.style.height = `${hoehe}px`;
				filter.style.paddingTop = "10px";
			}, 0);
			setTimeout(() => {
				filter.classList.remove("blenden");
				filter.removeAttribute("style");
			}, 300);
		} else {
			filter.classList.add("blenden");
			filter.style.height = `${filter.scrollHeight}px`;
			filter.style.paddingTop = "10px";
			setTimeout(() => {
				filter.style.height = "0px";
				filter.style.paddingTop = "0px";
			}, 0);
			setTimeout(() => {
				filter.classList.add("aus");
				filter.classList.remove("blenden");
				filter.removeAttribute("style");
				karteisuche.hoeheTrefferliste();
			}, 300);
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
