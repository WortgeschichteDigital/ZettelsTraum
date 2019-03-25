"use strict";

let dropdown = {
	// speichert Daten der aktuellen Dropdown-Liste
	data: [],
	// sammelt die bereits registrierten Daten aus einem Formular-Datensatz
	//   ds = String
	//     (der Datensatz, aus dem die Daten zusammengetragen werden sollen)
	dataFormular (ds) {
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			let d = data.ka[id][ds].split("\n");
			for (let i = 0, len = d.length; i < len; i++) {
				let d_tmp = helfer.textTrim(d[i]);
				if (!d_tmp) {
					continue;
				}
				if (dropdown.data.indexOf(d_tmp) === -1) {
					dropdown.data.push(d_tmp);
				}
			}
		}
		dropdown.data.sort(function(a, b) {
			a = helfer.sortAlphaPrep(a);
			b = helfer.sortAlphaPrep(b);
			let arr = [a, b];
			arr.sort();
			if (arr[0] === a) {
				return -1;
			}
			return 1;
		});
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
			}, 100); // deutlich Verzögerung, damit Klicks im Dropdown funktionieren
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
				if ( !document.getElementById("dropdown") ) {
					dropdown.init(feld_id);
				}
				dropdown.fill(true);
			}, 250);
		});
		inp.addEventListener("keydown", function(evt) {
			if (evt.which === 13) { // Enter
				// Dropdown existiert noch nicht od. hält keine Vorschläge bereit
				let drop = document.getElementById("dropdown");
				if ( !drop || drop.firstChild.classList.contains("keine-vorschlaege") ) {
					return;
				}
				// erst jetzt darf die Enter-Taste blockiert werden
				evt.preventDefault();
				// noch kein Element ausgewählt => 1. Element auswählen
				let aktiv = drop.querySelector(".aktiv");
				if (!aktiv) {
					aktiv = drop.firstChild;
				}
				// Text des aktivien Elements eintragen
				let feld = drop.parentNode.querySelector(".dropdown-feld");
				setTimeout(function() {
					dropdown.auswahl(feld, aktiv.textContent);
				}, 10); // damit andere Enter-Events, die an dem Input hängen, nicht auch noch ausgelöst werden
			} else if (evt.which === 38 || evt.which === 40) { // Cursor hoch (↑) od. runter (↓)
				let fenster = document.getElementById("dropdown");
				if (!fenster && !evt.ctrlKey && document.activeElement.nodeName === "TEXTAREA") { // sonst man in textareas nicht mehr navigieren
					return;
				}
				evt.preventDefault();
				evt.stopPropagation(); // damit im Einstellungen-Menü der Menüpunkt nicht gewechselt wird
				// Dropdown existiert noch nicht
				if (!fenster) {
					dropdown.init(this.id);
					return;
				}
				// im Dropdown-Feld navigieren
				dropdown.navigation(evt.which);
			}
		});
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
		// altes Dropdown-Liste ggf. schließen
		if ( dropdown.caller && dropdown.caller !== feld_id) {
			dropdown.schliessen();
		}
		// neuen Caller registrieren
		dropdown.caller = feld_id;
		// Daten sammeln
		dropdown.data = [];
		if (feld_id === "einstellung-bearbeiterin" ||
				feld_id === "meta-be" ||
				/^redaktion-person/.test(feld_id) ) {
			dropdown.data = [...privat.bearbeiterinnen];
		} else if ( /^redaktion-ereignis/.test(feld_id) ) {
			dropdown.data = [...redaktion.ereignisse];
		} else if (feld_id === "beleg-bd") {
			dropdown.dataFormular("bd");
		} else if (feld_id === "beleg-ts") {
			dropdown.dataFormular("ts");
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
		span.style.left = `${inp_text.offsetLeft}px`;
		span.style.top = `${inp_text.offsetHeight + 4}px`;
		span.style.maxWidth = `${inp_text.parentNode.offsetWidth - 12}px`; // 12px padding und border
	},
	// Dropdown-Liste füllen
	//   filtern = Boolean
	//     (Vorschläge sollen gefiltert werden)
	fill (filtern) {
		// Liste leeren
		let drop = document.getElementById("dropdown");
		helfer.keineKinder(drop);
		// Elemente ggf. filtern
		let items = [...dropdown.data],
			va = helfer.textTrim( drop.parentNode.querySelector(".dropdown-feld").value );
		if (filtern && va) {
			let reg = new RegExp(helfer.escapeRegExp(va), "i"),
				gefiltert = [];
			items.forEach(function(i) {
				if ( reg.test(i) ) {
					gefiltert.push(i);
				}
			});
			items = [...gefiltert];
		}
		// Liste ist leer od. Textfeld ist leer (beim Aufrufen der Filterliste durch Tippen)
		if (!items.length || !va && filtern) {
			dropdown.schliessen();
			return;
		}
		// Liste füllen
		items.forEach(function(i) {
			let opt = document.createElement("span");
			opt.textContent = i;
			dropdown.auswahlKlick(opt);
			drop.appendChild(opt);
		});
	},
	// Tastatur-Navigation in der Dropdown-Liste
	//   tastaturcode = Number
	//     (Tastaturcode 38 [hoch] od. 40 [runter])
	navigation (tastaturcode) {
		let drop = document.getElementById("dropdown"),
			opts = drop.querySelectorAll("span");
		// ggf. abbrechen, wenn keine Vorschläge vorhanden sind
		if ( opts[0].classList.contains("keine-vorschlaege") ) {
			return;
		}
		// neue Position ermitteln
		let pos = -1;
		for (let i = 0, len = opts.length; i < len; i++) {
			if ( opts[i].classList.contains("aktiv") ) {
				pos = i;
			}
			opts[i].classList.remove("aktiv");
		}
		if (tastaturcode === 38) {
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
	//   feld = Element
	//     (das Input-Feld, zu dem das Dropdown gehört)
	//   text = String
	//     (der Text, der eingetragen werden soll)
	auswahl (feld, text) {
		let caller = dropdown.caller; // muss zwischengespeichert werden, weil das Dropdown sich schließt, wenn sich das Dialog-Fenster öffnet
		if (/^beleg-/.test(caller) && feld.value) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					// Steht der Text schon im Feld?
					let feld_val = feld.value.split("\n");
					if (feld_val.indexOf(text) >= 0) {
						dialog.oeffnen("alert", null);
						dialog.text("Der Text muss nicht ergänzt werden, weil er bereits im Feld steht.");
						return;
					}
					// Text wird ergänzt
					eintragen(true);
				} else if (dialog.antwort === false) {
					eintragen(false);
				}
			});
			dialog.text("Im Textfeld steht schon etwas.\nSoll es um den ausgewählten Text ergänzt werden?");
			return;
		}
		eintragen(false);
		// Eintragen
		function eintragen (ergaenzen) {
			if (ergaenzen) {
				text = `${feld.value}\n${text}`;
			}
			// Auswahl übernehmen
			feld.value = text;
			feld.focus();
			// Haben die Änderungen weitere Konsequenzen?
			if ( /^beleg-/.test(caller) ) {
				helfer.textareaGrow(feld);
				beleg.belegGeaendert(true);
			} else if ( /^einstellung-/.test(caller) ) {
				optionen.aendereEinstellung( document.getElementById(caller) );
			}
			// Dropdown schließen
			dropdown.schliessen();
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