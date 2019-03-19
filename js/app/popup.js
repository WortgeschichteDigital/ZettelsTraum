"use strict";

let popup = {
	// speichert Daten der aktuellen Popup-Liste
	data: [],
	// sammelt die bereits registrierten Daten aus einem Formular-Datensatz
	//   ds = String
	//     (der Datensatz, aus dem die Daten zusammengetragen werden sollen)
	dataFormular (ds) {
		for (let id in data.ka) {
			if ( !data.ka.hasOwnProperty(id) ) {
				continue;
			}
			let d = data.ka[id][ds].split(",");
			for (let i = 0, len = d.length; i < len; i++) {
				let d_tmp = helfer.textTrim(d[i]);
				if (!d_tmp) {
					continue;
				}
				if (popup.data.indexOf(d_tmp) === -1) {
					popup.data.push(d_tmp);
				}
			}
		}
		popup.data.sort(function(a, b) {
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
	//     (Textinput-Feld, das ein Popup-Element haben könnte)
	feld (inp) {
		inp.addEventListener("blur", function() {
			clearTimeout(popup.timeoutBlur);
			popup.timeoutBlur = setTimeout(function() {
				popup.schliessen();
			}, 100); // deutlich Verzögerung, damit Klicks im Popup funktionieren
			clearTimeout(popup.timeoutFill);
		});
		inp.addEventListener("focus", function() {
			clearTimeout(popup.timeoutBlur); // sonst kann das Popup-Fensterchen nicht aufgeklappt werden
			clearTimeout(popup.timeoutFill);
			if (popup.caller && popup.caller !== this.id) {
				popup.schliessen();
			}
		});
		inp.addEventListener("input", function() {
			clearTimeout(popup.timeoutBlur);
			clearTimeout(popup.timeoutFill);
			let feld_id = this.id;
			popup.timeoutFill = setTimeout(function() {
				if ( !document.getElementById("popup") ) {
					popup.init(feld_id);
				}
				popup.fill(true);
			}, 250);
		});
		inp.addEventListener("keydown", function(evt) {
			if (evt.which === 13) { // Enter
				// Popup existiert noch nicht od. hält keine Vorschläge bereit
				let pop = document.getElementById("popup");
				if ( !pop || pop.firstChild.classList.contains("keine-vorschlaege") ) {
					return;
				}
				// noch kein Element ausgewählt => 1. Element auswählen
				let aktiv = pop.querySelector(".aktiv");
				if (!aktiv) {
					aktiv = pop.firstChild;
				}
				// Text des aktivien Elements eintragen
				let feld = pop.parentNode.querySelector(".popup-feld");
				setTimeout(function() {
					popup.auswahl(feld, aktiv.textContent);
				}, 10); // damit andere Enter-Events, die an dem Input hängen, nicht auch noch ausgelöst werden
			} else if (evt.which === 38 || evt.which === 40) { // Cursor hoch (↑) od. runter (↓)
				evt.preventDefault();
				evt.stopPropagation(); // damit im Einstellungen-Menü der Menüpunkt nicht gewechselt wird
				// Popup existiert noch nicht
				if ( !document.getElementById("popup") ) {
					popup.init(this.id);
					return;
				}
				// im Popup-Feld navigieren
				popup.navigation(evt.which);
			}
		});
	},
	// Klick-Event auf dem Link
	//   a = Element
	//     (Link, der geklickt wurde, um die Popup-Liste aufzubauen)
	link (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			popup.init(this.previousSibling.id);
			this.previousSibling.focus();
		});
	},
	// ID des aufrufenden Inputfelds
	caller: "",
	// Popup-Liste initialisieren
	//   feld_id = String
	//     (ID des Textfeldes, zu dem das Popup gehört)
	init (feld_id) {
		// altes Popup-Liste ggf. schließen
		if ( popup.caller && popup.caller !== feld_id) {
			popup.schliessen();
		}
		// neuen Caller registrieren
		popup.caller = feld_id;
		// Daten sammeln
		popup.data = [];
		if (feld_id === "einstellung-bearbeiterin" || feld_id === "meta-be") {
			popup.data = [...privat.bearbeiterinnen];
		} else if (feld_id === "beleg-bd") {
			popup.dataFormular("bd");
		} else if (feld_id === "beleg-ts") {
			popup.dataFormular("ts");
		}
		// Popup erzeugen und einhängen
		let span = document.createElement("span");
		span.id = "popup";
		let inp_text = document.getElementById(feld_id);
		inp_text.parentNode.appendChild(span);
		// Popup füllen
		if (popup.data.length) {
			popup.fill(false);
		} else {
			let opt = document.createElement("span");
			opt.classList.add("keine-vorschlaege");
			opt.textContent = "keine Vorschläge vorhanden";
			span.appendChild(opt);
		}
		// Popup positionieren
		span.style.left = `${inp_text.offsetLeft}px`;
		span.style.top = `${inp_text.offsetHeight + 4}px`;
		span.style.maxWidth = `${inp_text.parentNode.offsetWidth - 12}px`; // 12px padding und border
	},
	// Popup-Liste füllen
	//   filtern = Boolean
	//     (Vorschläge sollen gefiltert werden)
	fill (filtern) {
		// Liste leeren
		let pop = document.getElementById("popup");
		helfer.keineKinder(pop);
		// Elemente ggf. filtern
		let items = [...popup.data],
			va = helfer.textTrim( pop.parentNode.querySelector(".popup-feld").value );
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
			popup.schliessen();
			return;
		}
		// Liste füllen
		items.forEach(function(i) {
			let opt = document.createElement("span");
			opt.textContent = i;
			popup.auswahlKlick(opt);
			pop.appendChild(opt);
		});
	},
	// Tastatur-Navigation in der Popup-Liste
	//   tastaturcode = Number
	//     (Tastaturcode 38 [hoch] od. 40 [runter])
	navigation (tastaturcode) {
		let pop = document.getElementById("popup"),
			opts = pop.querySelectorAll("span");
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
		let pop_hoehe = pop.offsetHeight,
			span_hoehe = opts[0].offsetHeight,
			scroll_top = pop.scrollTop,
			pos_von_oben = opts[pos].offsetTop;
		if (pos_von_oben >= pop_hoehe + scroll_top - span_hoehe * 2) {
			pop.scrollTop = pos_von_oben - pop_hoehe + span_hoehe * 2;
		} else if (pos_von_oben < scroll_top + span_hoehe) {
			pop.scrollTop = pos_von_oben - span_hoehe;
		}
	},
	// Klick in Popup-Liste abfangen
	//   ein = Element
	//     (<span>, auf den geklickt wurde)
	auswahlKlick (ein) {
		ein.addEventListener("click", function() {
			let feld = this.parentNode.parentNode.querySelector(".popup-feld");
			popup.auswahl(feld, this.textContent);
		});
	},
	// ausgewählten Text in das Input-Feld eintragen
	//   feld = Element
	//     (das Input-Feld, zu dem das Popup gehört)
	//   text = String
	//     (der Text, der eingetragen werden soll)
	auswahl (feld, text) {
		let caller = popup.caller; // muss zwischengespeichert werden, weil das Popup sich schließt, wenn sich das Dialog-Fenster öffnet
		if (/^beleg-/.test(caller) && feld.value) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					// Steht der Text schon im Feld?
					let feld_val = feld.value.split(/, */);
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
				text = `${feld.value}, ${text}`;
			}
			// Auswahl übernehmen
			feld.value = text;
			feld.focus();
			// Haben die Änderungen weitere Konsequenzen?
			if ( /^beleg-/.test(caller) ) {
				beleg.belegGeaendert(true);
			} else if ( /^einstellung-/.test(caller) ) {
				optionen.aendereEinstellung( document.getElementById(caller) );
			}
			// Popup schließen
			popup.schliessen();
		}
	},
	// Popup-Liste schließen
	schliessen () {
		let pop = document.getElementById("popup");
		if (pop) {
			pop.parentNode.removeChild(pop);
		}
		popup.caller = "";
	},
};
