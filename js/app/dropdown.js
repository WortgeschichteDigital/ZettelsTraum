"use strict";

let dropdown = {
	// speichert Daten der aktuellen Dropdown-Liste
	data: [],
	// sammelt die bereits registrierten Daten aus einem Formular-Datensatz
	//   ds = String
	//     (der Datensatz, aus dem die Daten zusammengetragen werden sollen)
	dataFormular (ds) {
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			let d = data.ka[id][ds].split("\n");
			for (let i = 0, len = d.length; i < len; i++) {
				let d_tmp = helfer.textTrim(d[i]);
				if (!d_tmp) {
					continue;
				}
				if (!dropdown.data.includes(d_tmp)) {
					dropdown.data.push(d_tmp);
				}
			}
		}
		dropdown.data.sort(helfer.sortAlpha);
	},
	// sammelt die Bedeutungen für das Dropdown-Menü im Formular
	dataBedeutungen () {
		let bd = data.bd.gr[data.bd.gn].bd;
		for (let i = 0, len = bd.length; i < len; i++) {
			dropdown.data.push(bedeutungen.bedeutungenTief({
				gr: data.bd.gn,
				id: bd[i].id,
				za: false,
				al: true,
				strip: true,
			}));
		}
	},
	// ergänzt die vordefinierte Liste der Korpora um manuell ergänzte
	dataKorpora () {
		let korpora = [...beleg.korpora],
			korpora_ergaenzt = [];
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			const kr = data.ka[id].kr;
			if (kr && !korpora.includes(kr) && !korpora_ergaenzt.includes(kr)) {
				korpora_ergaenzt.push(kr);
			}
		}
		korpora_ergaenzt.sort(helfer.sortAlpha);
		dropdown.data = korpora_ergaenzt.concat(korpora);
	},
	// Tagliste erstellen
	//   feld_id = String
	//     (ID des Dropdownfeldes, für das die Tagliste erstellt werden soll)
	dataTags (feld_id) {
		const typ = feld_id.replace(/^tagger-/, "");
		let arr = [];
		if (!optionen.data.tags[typ]) { // jemand könnte die Tag-Datei löschen, während der Tagger offen ist
			return arr;
		}
		let data = optionen.data.tags[typ].data;
		for (let id in data) {
			if (!data.hasOwnProperty(id)) {
				continue;
			}
			arr.push(data[id].name);
		}
		arr.sort(helfer.sortAlpha);
		return arr;
	},
	// Liste der Bedeutungsgerüste erstellen
	//   gr = Object
	//     (Zweig mit den Gerüsten)
	//   skipAkt = true || undefined
	//     (das aktuelle Gerüst wird übersprungen; immer in bedeutungen.data gucken!)
	dataGerueste (gr, skipAkt = false) {
		let arr = [];
		Object.keys(gr).forEach(function(i) {
			if (skipAkt && i === bedeutungen.data.gn) {
				return;
			}
			arr.push(`Gerüst ${i}`);
		});
		return arr;
	},
	// Gerüste-Auswahl im Einfügen-Fenster der Kopierfunktion
	dataKopierenGerueste () {
		let arr = [];
		Object.keys(data.bd.gr).forEach(function(id) {
			arr.push(`Gerüst ${id}`);
		});
		arr.push("kein Import");
		return arr;
	},
	// Timeouts für Events im Textfeld
	timeoutBlur: null,
	timeoutFill: null,
	// Events im Textfeld
	//   inp = Element
	//     (Textinput-Feld, das ein Dropdown-Element haben könnte)
	feld (inp) {
		inp.addEventListener("blur", function() {
			clearTimeout(dropdown.timeoutBlur);
			dropdown.timeoutBlur = setTimeout(function() {
				dropdown.schliessen();
			}, 250); // deutlich Verzögerung, damit Klicks im Dropdown funktionieren
			clearTimeout(dropdown.timeoutFill);
		});
		inp.addEventListener("focus", function() {
			clearTimeout(dropdown.timeoutBlur); // sonst kann das Dropdown-Fensterchen nicht aufgeklappt werden
			clearTimeout(dropdown.timeoutFill);
			if (dropdown.caller && dropdown.caller !== this.id) {
				dropdown.schliessen();
			}
		});
		inp.addEventListener("input", function() {
			clearTimeout(dropdown.timeoutBlur);
			clearTimeout(dropdown.timeoutFill);
			let feld_id = this.id;
			dropdown.timeoutFill = setTimeout(function() {
				if (!document.getElementById("dropdown")) {
					dropdown.init(feld_id);
				}
				dropdown.fill(true);
			}, 250);
		});
		inp.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
				// Dropdown existiert noch nicht od. hält keine Vorschläge bereit
				let drop = document.getElementById("dropdown");
				if (!drop || drop.firstChild.classList.contains("keine-vorschlaege")) {
					return;
				}
				// erst jetzt darf die Enter-Taste blockiert werden
				evt.preventDefault();
				// kein Element ausgewählt
				// (dysfunktional, wenn in solchen Fällen einfach das 1. Element ausgewählt würde)
				let aktiv = drop.querySelector(".aktiv");
				if (!aktiv) {
					return;
				}
				// Text des aktivien Elements eintragen
				let feld = drop.parentNode.querySelector(".dropdown-feld");
				setTimeout(function() {
					dropdown.auswahl(feld, aktiv.textContent);
				}, 10); // damit andere Enter-Events, die an dem Input hängen, nicht auch noch ausgelöst werden
			} else if (/^(ArrowDown|ArrowUp)$/.test(evt.key)) {
				let drop = document.getElementById("dropdown");
				if (!drop && tastatur.modifiers !== "Ctrl" && document.activeElement.nodeName === "TEXTAREA") { // sonst kann man in textareas nicht mehr navigieren
					return;
				}
				evt.preventDefault();
				// Dropdown existiert noch nicht
				if (!drop) {
					dropdown.init(this.id);
					return;
				}
				// im Dropdown-Feld navigieren, wenn keine Modifiers gedrückt wurden
				if (!tastatur.modifiers) {
					dropdown.navigation(evt);
				}
			}
		});
		if (inp.getAttribute("readonly") !== null) {
			inp.addEventListener("click", function() {
				dropdown.init(this.id);
			});
		}
	},
	// Dropdown-Link erzeugen
	//   cl = String
	//     (class des Dropdown-Links)
	//   title = String
	//     (Title-Attribut des Dropdown-Links)
	//    noTab = true || undefined
	//     (Link wird aus der Tabliste ausgeschlossen
	makeLink (cl, title, noTab = false) {
		let a = document.createElement("a");
		a.classList.add(cl);
		a.href = "#";
		a.title = title;
		if (noTab) {
			a.setAttribute("tabindex", "-1");
		}
		dropdown.link(a);
		let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("version", "1.1");
		svg.setAttribute("width", "24");
		svg.setAttribute("height", "24");
		svg.setAttribute("viewBox", "0 0 24 24");
		a.appendChild(svg);
		let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("transform", "translate(4 4)");
		path.setAttribute("d", "m7 2v8l-3.5-3.5-1.5 1.5 6 6 6-6-1.5-1.5-3.5 3.5v-8z");
		path.setAttribute("fill", "#212121");
		svg.appendChild(path);
		return a;
	},
	// Klick-Event auf dem Link
	//   a = Element
	//     (Link, der geklickt wurde, um die Dropdown-Liste aufzubauen)
	link (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			dropdown.init(this.previousSibling.id);
			this.previousSibling.focus();
		});
	},
	// ID des aufrufenden Inputfelds
	caller: "",
	// Dropdown-Liste initialisieren
	//   feld_id = String
	//     (ID des Textfeldes, zu dem das Dropdown gehört)
	init (feld_id) {
		// alte Dropdown-Liste ggf. schließen und entfernen
		if (dropdown.caller && dropdown.caller !== feld_id ||
				document.getElementById("dropdown")) {
			dropdown.schliessen();
		}
		// neuen Caller registrieren
		dropdown.caller = feld_id;
		// Daten sammeln
		dropdown.data = [];
		if (feld_id === "einstellung-bearbeiterin" ||
				feld_id === "red-meta-be" ||
				/^redaktion-person/.test(feld_id) ||
				/^karteisuche-(redaktion-)*person-/.test(feld_id)) {
			dropdown.data = [...optionen.data.personen];
		} else if (/^redaktion-ereignis/.test(feld_id) ||
				/^karteisuche-redaktion-ereignis-/.test(feld_id)) {
			dropdown.data = [...Object.keys(redaktion.ereignisse)];
			if (/^redaktion-ereignis-/.test(feld_id)) {
				dropdown.data.shift();
			}
		} else if (feld_id === "beleg-bd") {
			dropdown.dataBedeutungen();
		} else if (feld_id === "beleg-bl") {
			dropdown.dataFormular("bl");
		} else if (feld_id === "beleg-kr") {
			dropdown.dataKorpora();
		} else if (feld_id === "beleg-sy") {
			dropdown.dataFormular("sy");
		} else if (feld_id === "beleg-ts") {
			dropdown.dataFormular("ts");
		} else if (feld_id === "bedeutungen-hierarchie") {
			dropdown.data = [...bedeutungen.hierarchieEbenen];
		} else if (feld_id === "bedeutungen-gerueste") {
			dropdown.data = dropdown.dataGerueste(bedeutungen.data.gr);
		} else if (feld_id === "bedeutungen-gerueste-kopieren") {
			dropdown.data = dropdown.dataGerueste(bedeutungen.data.gr, true);
		} else if (feld_id === "geruestwechseln-dropdown") {
			if (helfer.hauptfunktion === "geruest") {
				dropdown.data = dropdown.dataGerueste(bedeutungen.data.gr);
			} else {
				dropdown.data = dropdown.dataGerueste(data.bd.gr);
			}
		} else if (feld_id === "bd-win-gerueste") {
			dropdown.data = dropdown.dataGerueste(bedeutungen.data.bd.gr);
		} else if (/^tagger-/.test(feld_id)) {
			dropdown.data = dropdown.dataTags(feld_id);
		} else if (/^kopieren-geruest-/.test(feld_id)) {
			dropdown.data = dropdown.dataKopierenGerueste();
		} else if (/^karteisuche-lemmatyp-/.test(feld_id)) {
			dropdown.data = ["Hauptlemma", "Nebenlemma"];
		} else if (/^karteisuche-filter-/.test(feld_id)) {
			dropdown.data = Object.keys(karteisuche.filterTypen);
		} else if (/^karteisuche-themenfeld-/.test(feld_id)) {
			dropdown.data = dropdown.dataTags("tagger-themenfelder");
		} else if (/^karteisuche-sachgebiet-/.test(feld_id)) {
			dropdown.data = dropdown.dataTags("tagger-sachgebiete");
		} else if (/^karteisuche-tag-typ-/.test(feld_id)) {
			let typen = Object.keys(optionen.data.tags);
			for (let i = 0, len = typen.length; i < len; i++) {
				const typ = typen[i];
				if (optionen.tagsTypen[typ]) {
					typen[i] = optionen.tagsTypen[typ][1];
				} else {
					typen[i] = typ.substring(0, 1).toUpperCase() + typ.substring(1);
				}
			}
			dropdown.data = typen;
		} else if (/^karteisuche-tag-/.test(feld_id)) {
			let typenFeld = document.getElementById(feld_id).parentNode.previousSibling.firstChild;
			const typ = karteisuche.filterTagTyp(typenFeld);
			dropdown.data = dropdown.dataTags(`tagger-${typ}`);
		} else if (/^karteisuche-datum-typ/.test(feld_id)) {
			dropdown.data = ["erstellt", "geändert"];
		} else if (/^karteisuche-datum-dir/.test(feld_id)) {
			dropdown.data = ["<=", ">="];
		} else if (/^karteisuche-redaktion-logik/.test(feld_id)) {
			dropdown.data = ["=", "≠"];
		} else if (feld_id === "red-lit-eingabe-fo") {
			dropdown.data = [...redLit.eingabe.fundorte];
		} else if (feld_id === "red-lit-eingabe-tg") {
			dropdown.data = redLit.eingabeTagsAuflisten();
		} else if (feld_id === "red-wi-gn") {
			dropdown.data = dropdown.dataGerueste(data.bd.gr);
		} else if (feld_id === "red-wi-vt") {
			dropdown.data = [...redWi.dropdown.vt];
		} else if (feld_id === "red-wi-lt") {
			dropdown.data = [...redWi.dropdown.lt];
		} else if (/^red-wi-.+-se$/.test(feld_id)) {
			dropdown.data = [...redWi.dropdown.se];
		} else if (/^red-wi-.+-tx$/.test(feld_id)) {
			dropdown.data = redWi.dropdownVerweistexte();
		} else if (feld_id === "red-wi-copy-gn") {
			dropdown.data = redWi.kopierenDropdown();
		} else if (feld_id === "md-ty") {
			dropdown.data = [...xml.dropdown.artikelTypen];
		} else if (feld_id === "md-tf") {
			dropdown.data = [...xml.data.themenfelder];
		} else if (feld_id === "md-re-au") {
			dropdown.data = [...xml.data.autorinnen];
		} else if (feld_id === "le-le") {
			dropdown.data = xml.lemmata();
			if (xml.data.nebenlemmata) {
				xml.data.nebenlemmata.split(/, */).forEach(nl => {
					if (!nl) {
						return;
					}
					dropdown.data.push(nl);
				});
			}
		} else if (feld_id === "le-ty") {
			dropdown.data = [...xml.dropdown.lemmaTypen];
		} else if (/^(le-re|bg-tf-ti)$/.test(feld_id)) {
			dropdown.data = xml.dropdownReferenzen();
		} else if (/^abschnitt-/.test(feld_id)) {
			dropdown.data = [...xml.dropdown.abschnittTypen];
		} else if (/^textblock-add/.test(feld_id)) {
			dropdown.data = [...xml.dropdown.abschnittBloecke];
		} else if (/^textblock-[0-9]+-ty$/.test(feld_id)) {
			dropdown.data = [...xml.dropdown.listenTypen];
		} else if (/^abb-[0-9]+-bildposition$/.test(feld_id)) {
			dropdown.data = [...xml.dropdown.abbPositionen];
		} else if (feld_id === "nw-ty") {
			dropdown.data = [...xml.dropdown.nachweisTypen];
		} else if (feld_id === "nw-lit-si") {
			dropdown.data = xml.dropdownSiglen();
		} else if (/-sel-gr$/.test(feld_id)) {
			dropdown.data = xml.dropdownGerueste();
		} else if (feld_id === "bg-tf-li") {
			dropdown.data = xml.dropdownLesarten().arr;
		}
		// Dropdown erzeugen und einhängen
		let span = document.createElement("span");
		span.id = "dropdown";
		let inp_text = document.getElementById(feld_id);
		inp_text.parentNode.appendChild(span);
		// Dropdown füllen
		if (dropdown.data.length) {
			dropdown.fill(false);
		} else {
			let opt = document.createElement("span");
			opt.classList.add("keine-vorschlaege");
			opt.textContent = "keine Vorschläge vorhanden";
			span.appendChild(opt);
		}
		// Dropdown positionieren
		dropdown.position();
	},
	// Dropdown korrekt positionieren
	position () {
		let drop = document.getElementById("dropdown"),
			feld = drop.parentNode.querySelector(".dropdown-feld");
		drop.style.left = `${feld.offsetLeft}px`;
		drop.style.maxWidth = `${feld.parentNode.offsetWidth - 12}px`; // 12px padding und border
		let rect = feld.getBoundingClientRect();
		if (rect.top + rect.height + drop.offsetHeight + 5 > window.innerHeight) { // 5px hinzuzählen, damit unten immer ein bisschen Absatz bleibt
			drop.style.top = `-${drop.offsetHeight + 4}px`;
		} else {
			drop.style.top = `${feld.offsetHeight + 4}px`;
		}
	},
	// liest den Wert aus einem Dropdown-Feld aus
	//   feld = Element
	//     (das Dropdown-Feld)
	feldWert (feld) {
		if (feld.getAttribute("contenteditable")) {
			return feld.textContent;
		} else {
			return feld.value;
		}
	},
	// Wenn >= 0 heißt das, dass die Dropdownliste gefiltert wurde. Sie ist also
	// aufgrund einer Tastatureingabe erstellt worden
	cursor: -1,
	// Dropdown-Liste füllen
	//   filtern = Boolean
	//     (Vorschläge sollen gefiltert werden)
	fill (filtern) {
		let drop = document.getElementById("dropdown"),
			feld = drop.parentNode.querySelector(".dropdown-feld");
		// wird die Liste gefiltert?
		if (filtern) {
			if (feld.getAttribute("contenteditable")) {
				let sel = window.getSelection();
				dropdown.cursor = sel.focusOffset;
			} else {
				dropdown.cursor = feld.selectionStart;
			}
		} else {
			dropdown.cursor = -1;
		}
		// Liste leeren
		helfer.keineKinder(drop);
		// Elemente ggf. filtern
		let items = [...dropdown.data],
			va = dropdown.feldWert(feld),
			vaTrimmed = helfer.textTrim(va, true);
		if (filtern && vaTrimmed) {
			let reg_chunks = "",
				va_split = [],
				nur_aktuelle_zeile = false;
			if (feld.getAttribute("contenteditable")) {
				va_split = vaTrimmed.split(", ");
			} else {
				va_split = vaTrimmed.split("\n");
				// nur aktuelle Zeile zum Filtern benutzen
				nur_aktuelle_zeile = true;
				let anfang = va.substring(0, dropdown.cursor),
					anfangSp = anfang.split("\n"),
					ende = va.substring(dropdown.cursor),
					endeSp = ende.split("\n");
				anfang = anfangSp[anfangSp.length - 1];
				ende = endeSp[0];
				reg_chunks = anfang + ende;
			}
			if (!nur_aktuelle_zeile) {
				va_split.forEach(function(i) {
					// leere Einträge ausschließen
					if (!i) {
						return;
					}
					// dieser Text wird berücksichtigt
					if (reg_chunks) {
						reg_chunks += "|";
					}
					reg_chunks += helfer.escapeRegExp(i);
				});
			} else {
				reg_chunks = helfer.escapeRegExp(reg_chunks);
			}
			let reg = new RegExp(reg_chunks, "i"),
				gefiltert = [];
			if (reg_chunks) { // wenn nur in der aktuellen Zeile gesucht wird, könnte diese leer sein => alles würde gefunden
				items.forEach(function(i) {
					if (reg.test(i) && !va_split.includes(i)) {
						gefiltert.push(i);
					}
				});
			}
			items = [...gefiltert];
		}
		// Liste ist leer od. Textfeld ist leer (beim Aufrufen der Filterliste durch Tippen)
		if (!items.length || !vaTrimmed && filtern) {
			dropdown.schliessen();
			return;
		}
		// Liste füllen
		items.forEach(function(i) {
			let opt = document.createElement("span");
			opt.textContent = i;
			if (i.length > 80) {
				opt.title = i;
			}
			dropdown.auswahlKlick(opt);
			drop.appendChild(opt);
		});
		// Dropdown positionieren
		dropdown.position();
	},
	// Tastatur-Navigation in der Dropdown-Liste
	//   evt = Object
	//     (Event-Object des keydown)
	navigation (evt) {
		let drop = document.getElementById("dropdown"),
			opts = drop.querySelectorAll("span");
		// ggf. abbrechen, wenn keine Vorschläge vorhanden sind
		if (opts[0].classList.contains("keine-vorschlaege")) {
			return;
		}
		// neue Position ermitteln
		let pos = -1;
		for (let i = 0, len = opts.length; i < len; i++) {
			if (opts[i].classList.contains("aktiv")) {
				pos = i;
			}
			opts[i].classList.remove("aktiv");
		}
		if (evt.key === "ArrowUp") {
			pos--;
		} else {
			pos++;
		}
		if (pos < 0) {
			pos = opts.length - 1;
		} else if (pos >= opts.length) {
			pos = 0;
		}
		// neues Element aktivieren
		opts[pos].classList.add("aktiv");
		// ggf. die Liste an eine gute Position scrollen
		let drop_hoehe = drop.offsetHeight,
			span_hoehe = opts[0].offsetHeight,
			scroll_top = drop.scrollTop,
			pos_von_oben = opts[pos].offsetTop;
		if (pos_von_oben >= drop_hoehe + scroll_top - span_hoehe * 2) {
			drop.scrollTop = pos_von_oben - drop_hoehe + span_hoehe * 2;
		} else if (pos_von_oben < scroll_top + span_hoehe) {
			drop.scrollTop = pos_von_oben - span_hoehe;
		}
	},
	// Klick in Dropdown-Liste abfangen
	//   ein = Element
	//     (<span>, auf den geklickt wurde)
	auswahlKlick (ein) {
		ein.addEventListener("click", function() {
			let feld = this.parentNode.parentNode.querySelector(".dropdown-feld");
			dropdown.auswahl(feld, this.textContent);
		});
	},
	// ausgewählten Text in das Input-Feld eintragen
	// Obacht! Die Funktion wird auch von beleg.bedeutungEintragen() genutzt.
	//   feld = Element
	//     (das Input-Feld, zu dem das Dropdown gehört)
	//   text = String
	//     (der Text, der eingetragen werden soll)
	auswahl (feld, text) {
		let caller = dropdown.caller; // muss zwischengespeichert werden, weil das Dropdown sich schließt, wenn sich das Dialog-Fenster öffnet
		const wert = dropdown.feldWert(feld);
		if (wert && /^beleg-(bd|bl|sy|ts)/.test(caller)) {
			// Steht der Wert schon im Feld?
			let feld_val = wert.split("\n");
			if (feld_val.includes(text)) {
				eintragUnnoetig();
				return;
			}
			// Wurde das Feld durch Texteingabe gefiltert?
			// Soll der Wert immer automatisch ergänzt werden?
			if (dropdown.cursor >= 0 ||
					optionen.data.einstellungen["immer-ergaenzen"]) {
				eintragen(true);
				return;
			}
			// Ergänzen oder überschreiben?
			dialog.oeffnen({
				typ: "confirm",
				text: "Im Textfeld steht schon etwas. Soll es ergänzt werden?\n(Bei „Nein“ wird das Textfeld überschrieben.)",
				callback: () => {
					if (dialog.antwort) {
						eintragen(true);
					} else if (dialog.antwort === false) {
						eintragen(false);
					}
				},
			});
			document.getElementById("dialog-text").appendChild(optionen.shortcut("Textfeld künftig ohne Nachfrage ergänzen", "immer-ergaenzen"));
			return;
		} else if (wert && feld.getAttribute("contenteditable")) {
			let feld_val = wert.split(", ");
			if (feld_val.includes(text)) {
				eintragUnnoetig();
				return;
			}
			eintragen(true);
			return;
		}
		eintragen(false);
		// Eintragen
		function eintragen (ergaenzen) {
			if (ergaenzen) {
				if (feld.getAttribute("contenteditable")) {
					if (dropdown.cursor >= 0) {
						let arr = [],
							feld_start = wert.substring(0, dropdown.cursor);
						feld_start = feld_start.replace(/[^,]+$/, "").replace(/,$/, "").trim();
						if (feld_start) {
							arr.push(feld_start);
						}
						arr.push(text);
						let feld_ende = wert.substring(dropdown.cursor);
						feld_ende = feld_ende.replace(/^[^,]+/, "").replace(/^,/, "").trim();
						if (feld_ende) {
							arr.push(feld_ende);
						}
						text = arr.join(", ");
					} else {
						text = `${helfer.textTrim(wert, true)}, ${text}`;
					}
				} else {
					if (dropdown.cursor >= 0) {
						let arr = [],
							feld_start = wert.substring(0, dropdown.cursor);
						feld_start = feld_start.replace(/[^\n]+$/, "").replace(/\n$/, "");
						if (feld_start) {
							arr.push(feld_start);
						}
						arr.push(text);
						let feld_ende = wert.substring(dropdown.cursor);
						feld_ende = feld_ende.replace(/^[^\n]+/, "").replace(/^\n/, "");
						if (feld_ende) {
							arr.push(feld_ende);
						}
						text = arr.join("\n");
					} else {
						text = `${helfer.textTrim(wert, true)}\n${text}`;
					}
				}
			}
			// Auswahl übernehmen
			if (feld.getAttribute("contenteditable")) {
				feld.textContent = text;
			} else {
				feld.value = text;
			}
			feld.focus();
			// Haben die Änderungen weitere Konsequenzen?
			if (/^beleg-(bd|bl|sy|ts)/.test(caller)) {
				helfer.textareaGrow(feld);
				if (caller === "beleg-bd") { // Daten des Bedeutungsfelds werden erst beim Speichern aufgefrischt; vgl. beleg.aktionSpeichern()
					let bd = document.getElementById("beleg-bd");
					bd.value = helfer.textTrim(bd.value, true);
					// es ist möglich, dass die Leseansicht aktiv ist
					// (beim Einfügen aus dem Bedeutungsgerüst-Fenster)
					if (beleg.leseansicht) {
						beleg.leseFill();
					}
				} else {
					const id = caller.replace(/^beleg-/, "");
					beleg.data[id] = helfer.textTrim(text, true);
				}
				beleg.belegGeaendert(true);
			} else if (caller === "beleg-kr") {
				beleg.data.kr = helfer.textTrim(text, true);
				beleg.belegGeaendert(true);
			} else if (/^einstellung-/.test(caller)) {
				optionen.aendereEinstellung(document.getElementById(caller));
			} else if (caller === "bedeutungen-hierarchie") {
				bedeutungen.hierarchie();
			} else if (caller === "bedeutungen-gerueste") {
				const geruest = text.replace(/^Gerüst /, "");
				bedeutungen.geruestWechseln(geruest);
			} else if (caller === "geruestwechseln-dropdown") {
				const geruest = text.replace(/^Gerüst /, "");
				bedeutungenGeruest.wechseln(geruest);
			} else if (caller === "bd-win-gerueste") {
				bedeutungen.geruest = text.replace(/^Gerüst /, "");
				bedeutungen.aufbauen();
			} else if (/^tagger-/.test(caller)) {
				let ele = document.getElementById(caller);
				window.getSelection().collapse(ele.firstChild, ele.textContent.length);
				ele.classList.add("changed");
				tagger.taggerGeaendert(true);
			} else if (/^karteisuche-filter-/.test(caller)) {
				karteisuche.filterFelder(caller);
				// das erste Input-Feld hinter dem Caller fokussieren
				document.getElementById(caller).parentNode.nextSibling.firstChild.focus();
			} else if (/^red-wi-(gn|lt)$/.test(caller)) {
				feld.dispatchEvent(new Event("input"));
			} else if (/-sel-gr$/.test(caller)) {
				xml.bgSel({caller});
			} else if (/^(red-lit-eingabe-|md-(ty|tf)|abschnitt-|textblock-|abb-)/.test(caller)) {
				feld.dispatchEvent(new Event("change"));
			} else if (caller === "nw-ty") {
				feld.dispatchEvent(new Event("input"));
			}
			// Dropdown schließen
			dropdown.schliessen();
		}
		// Eintrag unnötig
		function eintragUnnoetig () {
			dialog.oeffnen({
				typ: "alert",
				text: "Der ausgewählte Wert muss nicht ergänzt werden, weil er bereits im Feld steht.",
				callback: () => {
					feld.focus();
				},
			});
		}
	},
	// Dropdown-Liste schließen
	schliessen () {
		let drop = document.getElementById("dropdown");
		if (drop) {
			drop.parentNode.removeChild(drop);
		}
		dropdown.caller = "";
	},
};
