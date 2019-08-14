"use strict";

let notizen = {
	// Fenster für Notizen einblenden
	oeffnen () {
		let fenster = document.getElementById("notizen"),
			feld = document.getElementById("notizen-feld");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			feld.focus();
			return;
		}
		// Notizen-Feld mit den gespeicherten Daten füllen
		notizen.eintragen = true;
		feld.innerHTML = data.no; // data.no kann leer sein
		setTimeout(function() {
			// der MutationObserver reagiert verzögert, darum muss hier ein Timeout stehen;
			// 0 Millisekunden würde wohl auch gehen
			notizen.eintragen = false;
		}, 5);
		// Feld fokussieren
		feld.focus();
	},
	// speichert die Notizen
	speichern () {
		let feld = document.getElementById("notizen-feld");
		// Es wurde gar nichts geändert!
		if (!notizen.geaendert) {
			direktSchliessen();
			return;
		}
		let vorhanden = notizen.vorhanden();
		// keine Notizen im Feld, aber Notizen in der Kartei
		if (!vorhanden.feld && vorhanden.kartei) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					notizen.loeschen(true);
				} else {
					feld.focus();
				}
			});
			dialog.text("Das Notizfeld ist leer.\nSollen die in der Kartei gespeicherten Notizen gelöscht werden?");
			return;
		}
		// keine Notizen im Feld
		if (!vorhanden.feld) {
			feld.focus();
			return;
		}
		// Änderungen speichern
		data.no = vorhanden.feld_value;
		notizen.notizenGeaendert(false);
		kartei.karteiGeaendert(true);
		direktSchliessen();
		// Notizen-Fenster ggf. schließen
		function direktSchliessen () {
			if (optionen.data.einstellungen["notizen-schliessen"]) {
				notizen.abbrechen();
			}
		}
	},
	// Notizen schließen
	// (der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
	abbrechen () {
		// keine Änderungen vorgenommen
		if (!notizen.geaendert) {
			notizen.schliessen();
			return;
		}
		// keine Notizen im Feld trotz Änderungsmarkierung => direkt schließen
		let vorhanden = notizen.vorhanden();
		if (!vorhanden.feld) {
			notizen.schliessen();
			return;
		}
		// Es sind also Notizen im Notizfeld. Speichern?
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				notizen.speichern();
				notizen.schliessen();
			} else if (dialog.antwort === false) {
				notizen.schliessen();
			} else {
				document.getElementById("notizen-feld").focus();
			}
		});
		dialog.text("Die Notizen wurden noch nicht gespeichert.\nMöchten Sie die Eingaben nicht erst einmal speichern?");
	},
	// Notizen löschen
	//   confirmed = Boolean
	//     (Die Löschabsicht wurde schon bestätigt.)
	loeschen (confirmed) {
		if (confirmed) {
			loesche();
			return;
		}
		// Sind überhaupt Notizen vorhanden?
		let vorhanden = notizen.vorhanden();
		if (!vorhanden.kartei && !vorhanden.feld) {
			notizen.schliessen();
			return;
		}
		// Sicherheitsfrage
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				loesche();
			} else {
				document.getElementById("notizen-feld").focus();
			}
		});
		let speicher = [];
		if (vorhanden.kartei) {
			speicher.push("in der Kartei");
		}
		if (vorhanden.feld) {
			speicher.push("im Notizfeld");
		}
		dialog.text(`Sollen die Notizen ${speicher.join(" und ")} wirklich gelöscht werden?`);
		// Löschfunktion
		function loesche () {
			data.no = "";
			kartei.karteiGeaendert(true);
			notizen.schliessen();
		}
	},
	// Funktionen, die beim Schließen aufgerufen werden sollten
	schliessen () {
		notizen.notizenGeaendert(false);
		notizen.icon();
		overlay.ausblenden(document.getElementById("notizen"));
	},
	// überprüft, ob überhaupt Notizen vorhanden sind
	vorhanden () {
		let vorhanden = {
			kartei: false,
			feld: false,
			feld_value: "",
		};
		if (data.no) {
			vorhanden.kartei = true;
		}
		let notiz = notizen.bereinigen(document.getElementById("notizen-feld").innerHTML);
		if (notiz && notiz !== "<br>") {
			// unter gewissen Umständen kann ein vereinzelter <br>-Tag im Feld stehen
			vorhanden.feld = true;
		}
		vorhanden.feld_value = notiz;
		return vorhanden;
	},
	// Notizen vor dem Speichern bereinigen
	//   notiz = String
	bereinigen (notiz) {
		notiz = notiz.replace(/^(<div><br><\/div>)+|(<div><br><\/div>)+$/g, "");
		notiz = notiz.replace(/\sstyle=".+?"/g, "");
		return notiz;
	},
	// Aktionen beim Klick auf einen Button
	//   button = Element
	//     (der Button, auf den geklickt wurde)
	aktionButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^notizen-/, "");
			if (aktion === "speichern") {
				notizen.speichern();
			} else if (aktion === "abbrechen") {
				notizen.abbrechen();
			} else if (aktion === "loeschen") {
				notizen.loeschen(false);
			}
		});
	},
	// ändert den Status des Icons, je nachdem ob eine Notiz vorhanden ist oder nicht
	icon () {
		let icon = document.getElementById("notizen-icon");
		if (data.no) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
		helfer.kopfIcon();
	},
	// der gespeichert Wert wird gerade in das Notizenfeld eingetragen
	eintragen: false,
	// registriert, wenn im Textfeld Veränderungen auftreten
	//   div = Element
	//     (<div contenteditable="true">, in dem die Notizen stehen)
	change (div) {
		let observer = new MutationObserver(function() {
			if (notizen.eintragen) { // Das Feld wird gerade gefüllt; dabei ändert sich aber natürlich nichts.
				return;
			}
			div.classList.add("changed");
			notizen.notizenGeaendert(true);
		});
		observer.observe(div, {
			childList: true,
			subtree: true,
			characterData: true,
		});
	},
	// speichert, ob der Inhalt des Notizenfelds geändert wurde
	geaendert: false,
	// Notizen wurden geändert oder gespeichert
	//   geaendert = Boolean
	//     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
	notizenGeaendert (geaendert) {
		notizen.geaendert = geaendert;
		helfer.geaendert();
		let asterisk = document.getElementById("notizen-geaendert");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
	// Funktion der Text-Tools auf Notizen-Feld anwenden
	//   a = Element
	//     (der Tools-Link, auf den geklickt wurde)
	tools (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let funktion = this.getAttribute("class").match(/icon-tools-([^\s]+)/);
			if (funktion[1] === "mark") {
				// MARKIERUNG (alles etwas komplizierter)
				// keine Range vorhanden
				let sel = window.getSelection();
				if (sel.rangeCount > 0) {
					document.getElementById("notizen-feld").focus();
					return;
				}
				// Range Clonen
				let range = sel.getRangeAt(0),
					div = document.createElement("div"),
					frag = document.createDocumentFragment();
				div.appendChild(range.cloneContents());
				frag.appendChild(range.cloneContents());
				let content = div.innerHTML;
				// Knoten und Content ermitteln
				let focus = sel.focusNode,
					isFocus = focus.nodeType === 1 && focus.nodeName === "MARK" && focus.innerHTML === content,
					parent = sel.anchorNode.parentNode,
					isParent = parent.nodeType === 1 && parent.nodeName === "MARK" && parent.innerHTML === content;
				// ersetzen oder hinzufügen
				if (isFocus || isParent) {
					let bezug = parent; // Markierung händisch ausgewählt => focusNode = #text
					if (isFocus) {
						bezug = focus; // Markierung gerade hinzugefügt => focusNode = <mark>
					}
					let knoten = [];
					for (let k of bezug.childNodes) {
						knoten.push(k);
					}
					let parentZuMark = bezug.parentNode;
					parentZuMark.removeChild(bezug);
					range.insertNode(frag);
					focusText(knoten, parentZuMark);
				} else {
					let mark = document.createElement("mark");
					mark.classList.add("user");
					mark.innerHTML = content;
					let {clipboard} = require("electron");
					clipboard.writeHTML(mark.outerHTML);
					range.deleteContents();
					range.insertNode(mark);
					sel.selectAllChildren(mark);
				}
			} else if (funktion[1] === "heading") {
				// ÜBERSCHRIFT
				let sel = window.getSelection(),
					absatz = sel.focusNode;
				while (absatz.nodeType !== 1 ||
						!/^(DIV|H3|LI)$/.test(absatz.nodeName)) {
					absatz = absatz.parentNode;
				}
				if (absatz.nodeName === "H3") {
					document.execCommand("formatBlock", false, "<DIV>");
				} else {
					document.execCommand("formatBlock", false, "<H3>");
				}
			} else if (funktion[1] === "list") {
				// LISTE
				document.execCommand("insertUnorderedList");
			} else if (funktion[1] === "strike") {
				// DURCHSTREICHEN
				document.execCommand("strikeThrough");
			} else if (funktion[1] === "clear") {
				// FORMATIERUNGEN ENTFERNEN
				document.execCommand("removeFormat");
			} else {
				// ALLE ANDEREN FUNKTIONEN
				document.execCommand(funktion[1]);
			}
			document.getElementById("notizen-feld").focus();
			// Text nach Entfernen eines <mark> fokussieren
			//   knoten = Array
			//     (Liste der Knoten, die sich in dem <mark> befanden)
			//   parent = Element
			//     (Element-Knoten der parent zum entfernten <mark> war)
			function focusText (knoten, parent) {
				// Markierung war leer
				if (!knoten.length) {
					return;
				}
				// Ranges entfernen
				let sel = window.getSelection();
				if (sel.rangeCount > 0) {
					sel.removeAllRanges();
				}
				// es war nur ein Knoten im entfernten <mark>
				if (knoten.length === 1) {
					let text = knoten[0].textContent;
					for (let b of parent.childNodes) {
						if (b.textContent.includes(text)) {
							let idx = b.textContent.indexOf(text),
								range = document.createRange();
							range.setStart(b, idx);
							range.setEnd(b, idx + text.length);
							sel.addRange(range);
							break;
						}
					}
					return;
				}
				// es waren mehrere Knoten im entfernten <mark>
				let start = {
					text: knoten[0].textContent,
					knoten: null,
					pos: -1,
				};
				let end = {
					text: knoten[knoten.length - 1].textContent,
					knoten: null,
					pos: -1,
				};
				for (let b of parent.childNodes) {
					if (!start.knoten && b.textContent === start.text) {
						start.knoten = b;
						while (start.knoten.nodeType !== 3) {
							start.knoten = start.knoten.firstChild;
						}
						start.pos = 0;
					} else if (start.knoten && !end.knoten && b.textContent.includes(end.text)) {
						end.knoten = b;
						while (end.knoten.nodeType === 1) {
							end.knoten = end.knoten.lastChild;
						}
						end.pos = end.knoten.textContent.length;
						break;
					}
				}
				// Knoten und Positionen auswählen
				if (start.knoten && end.knoten) {
					let range = document.createRange();
					range.setStart(start.knoten, start.pos);
					range.setEnd(end.knoten, end.pos);
					sel.addRange(range);
				}
			}
		});
	},
};
