"use strict";

let bedeutungen = {
	// Kopie des Bedeutungsgerüsts, ausgelesen aus data.bd
	data: {},
	// baut einen initialen, alphabetisch sortierten Bedeutungenbaum auf
	// (falls in der Kartei noch keiner vorhanden ist; irgendwann ist diese Funktion wohl tot)
	konstituieren () {
		// Bedeutungenbaum ist vorhanden
		if (data.bd.bd) {
			return;
		}
		// Baum aufbauen
		bedeutungen.data = {};
		bedeutungen.data.sl = 2;
		bedeutungen.data.bd = [];
		bedeutungen.data.id = {};
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			if (!data.ka[id].bd) {
				continue;
			}
			const bd = data.ka[id].bd.split("\n");
			for (let i = 0, len = bd.length; i < len; i++) {
				bedeutungen.baumErgaenzen(bd[i]);
			}
		}
		// Einträge sortieren
		bedeutungen.data.bd.sort(function(a, b) {
			for (let i = 0, len = a.bd.length; i < len; i++) {
				if (a.bd[i] !== b.bd[i]) {
					return helfer.sortAlpha(a.bd[i], b.bd[i]);
				}
				if (a.bd[i + 1] && b.bd[i + 1]) {
					continue;
				}
				if (a.bd.length > b.bd.length) {
					return 1;
				} else if (a.bd.length < b.bd.length) {
					return -1;
				}
				return 0;
			}
		});
	},
	// Baum ggf. um die übergebene Bedeutung ergänzen
	baumErgaenzen (bd) {
		if (bedeutungen.data.id[bd]) {
			return;
		}
		const hie = bd.split(": ");
		let hie_akt = [],
			i = 0;
		do {
			hie_akt.push(hie[i]);
			let id = hie_akt.join(": ");
			if (!bedeutungen.data.id[id]) {
				bedeutungen.data.id[id] = true;
				bedeutungen.data.bd.push({
					bd: [...hie_akt],
					ku: "",
				});
			}
			i++;
		} while (hie[i]);
	},
	// Bedeutungen öffnen
	oeffnen () {
		// TODO temporär sperren
// 		dialog.oeffnen("alert", null);
// 		dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
// 		return;
		// Bedeutungen sind schon offen
		if (!document.getElementById("bedeutungen").classList.contains("aus")) {
			return;
		}
		// aktueller Beleg ist noch nicht gespeichert
		if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					beleg.belegGeaendert(false);
					init();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert.\nMöchten Sie den Beleg nicht erst einmal speichern?");
			return;
		}
		init();
		// Bedeutungenformular anzeigen und initialisieren
		function init () {
			document.getElementById("bedeutungen-hierarchie").value = bedeutungen.hierarchieEbenen[bedeutungen.data.sl];
			bedeutungen.aufbauen();
			helfer.sektionWechseln("bedeutungen");
		}
	},
	// den Bedeutungenbaum aufbauen
	aufbauen () {
		const cont = document.getElementById("bedeutungen-cont");
		helfer.keineKinder(cont);
		bedeutungen.zaehlungen = [];
		bedeutungen.moveAktiv = false;
		// Tabelle aufbauen
		let table = document.createElement("table");
		cont.appendChild(table);
		bedeutungen.data.bd.forEach(function(i, n) {
			const bd = i.bd;
			let tr = document.createElement("tr");
			tr.dataset.idx = n;
			table.appendChild(tr);
			// Move
			let td = document.createElement("td");
			tr.appendChild(td);
			let a = document.createElement("a");
			td.appendChild(a);
			a.classList.add("icon-link", "icon-move");
			a.href = "#";
			a.title = "Bedeutung verschieben";
			a.textContent = " ";
			bedeutungen.moveListener(a);
			// Bedeutung
			td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add("zaehlung");
			let p = document.createElement("p"),
				b = document.createElement("b");
			b.textContent = bedeutungen.zaehlung(bd);
			p.appendChild(b);
			p.appendChild(document.createTextNode(bd[bd.length- 1]));
			let div = document.createElement("div");
			div.appendChild(p);
			for (let j = 1, len = bd.length; j < len; j++) {
				let nDiv = document.createElement("div");
				nDiv.appendChild(div);
				div = nDiv;
			}
			td.appendChild(div);
			
		});
	},
	// Werte für das Formular, mit dem die oberste Hierarchie der Zählzeichen festgelegt wird
	hierarchieEbenen: [
		"I, II, III, …",
		"A, B, C, …",
		"1, 2, 3, …",
	],
	// Reaktion auf Änderungen der Hierarchie
	hierarchie () {
		const hie = document.getElementById("bedeutungen-hierarchie").value;
		bedeutungen.data.sl = bedeutungen.hierarchieEbenen.indexOf(hie);
		bedeutungen.aufbauen();
	},
	// Zählzeichen
	zaehlzeichen: [
		["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "IX", "XX"],
		["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"],
		["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"],
		["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t"],
		["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ"],
		Array(20).fill("•"),
		Array(20).fill("◦"),
	],
	// speichert, wo man gerade mit der Zählung der einzelnen Hierarchien ist
	zaehlungen: [],
	// gibt das richtige Zählzeichen zurück
	//   bd = Array
	//     (Array mit allen Bedeutungen)
	zaehlung (bd) {
		// Ebene ermitteln
		let ebene = bd.length - 1;
		ebene += bedeutungen.data.sl;
		// hochzählen
		if (!bedeutungen.zaehlungen[ebene]) {
			bedeutungen.zaehlungen[ebene] = 0;
		}
		bedeutungen.zaehlungen[ebene]++;
		// alle höheren Zählungen löschen
		bedeutungen.zaehlungen.fill(0, ebene + 1);
		// Zählzeichen ermitteln
		let zeichen = "–";
		if (bedeutungen.zaehlzeichen[ebene]) {
			zeichen = bedeutungen.zaehlzeichen[ebene][bedeutungen.zaehlungen[ebene] - 1];
		}
		return zeichen;
	},
	// Listener für die Windrose
	//   a = Element
	//     (der Link mit der Windrose)
	moveListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const tr = this.parentNode.parentNode,
				tr_aktiv = bedeutungen.moveAus();
			if (tr === tr_aktiv) {
				return;
			}
			bedeutungen.moveAn(parseInt(tr.dataset.idx, 10));
		});
	},
	// eine der Bedeutungen ist aktiviert und kann bewegt werden
	moveAktiv: false,
	// Bedeutung im Bedeutungenbaum bewegen
	move (evt) {
		// kein Element aktiviert
		if (!bedeutungen.moveAktiv) {
			return;
		}
		evt.preventDefault();
		// Element bewegen (wenn möglich)
		const idx = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10),
			ebene = bedeutungen.data.bd[idx].bd.length;
		let move = 0,
			pad_links = [],
			bewegen = [];
		if (evt.which === 37) { // nach links
			if (bedeutungen.data.bd[idx].bd.length > 1) {
				bewegen = bedeutungen.moveGetEle();
				// Anzahl der Moves ermitteln
				for (let i = idx + 1, len = bedeutungen.data.bd.length; i < len; i++) {
					const ebene_tmp = bedeutungen.data.bd[i].bd.length;
					if (ebene_tmp <= ebene - 1) {
						break;
					}
					move++;
				}
			}
		} else if (evt.which === 38) { // nach oben
			if (idx > 0 && bedeutungen.data.bd[idx - 1].bd.length >= bedeutungen.data.bd[idx].bd.length) {
				bewegen = bedeutungen.moveGetEle();
				// Anzahl der Moves ermitteln
				move = -1;
				for (let i = idx - 1; i >= 0; i--) {
					if (bedeutungen.data.bd[i].bd.length <= ebene) {
						break;
					}
					move--;
				}
			}
		} else if (evt.which === 39) { // nach rechts
			for (let i = idx - 1; i > 0; i--) {
				const ebene_tmp = bedeutungen.data.bd[i].bd.length;
				if (ebene_tmp <= ebene) {
					if (ebene_tmp === ebene) {
						pad_links = [...bedeutungen.data.bd[i].bd];
					}
					break;
				}
			}
			if (pad_links.length) {
				bewegen = bedeutungen.moveGetEle();
			}
		} else if (evt.which === 40) { // nach unten
			// TODO
		}
		// es muss/kann nichts bewegt werden
		if (!bewegen.length) {
			return;
		}
		// alle Kinder bewegen
		for (let i = 0, len = bewegen.length; i < len; i++) {
			let idx = bewegen[i];
			// alte ID löschen, neue ermitteln
			if (evt.which === 37) { // nach links
				idx -= i;
				const id = bedeutungen.data.bd[idx].bd.join(": ");
				delete bedeutungen.data.id[id];
				bedeutungen.data.bd[idx].bd.shift();
				bedeutungen.data.id[bedeutungen.data.bd[idx].bd.join(": ")] = true;
			} else if (evt.which === 39) { // nach rechts
				const id = bedeutungen.data.bd[idx].bd.join(": ");
				delete bedeutungen.data.id[id];
				for (let j = 0, len = pad_links.length - 1; j < len; j++) {
					bedeutungen.data.bd[idx].bd.shift();
				}
				for (let j = pad_links.length - 1; j >= 0; j--) {
					bedeutungen.data.bd[idx].bd.unshift(pad_links[j]);
				}
				bedeutungen.data.id[bedeutungen.data.bd[idx].bd.join(": ")] = true;
			}
			// Element kopieren
			const kopie = {
				bd: [...bedeutungen.data.bd[idx].bd],
				ku: bedeutungen.data.bd[idx].ku,
			};
			bedeutungen.data.bd.splice(idx, 1);
			bedeutungen.data.bd.splice(idx + move, 0, kopie);
		}
		// Tabelle neu aufbauen, Element fokussieren
		bedeutungen.aufbauen();
		if (evt.which === 37) { // nach links
			bedeutungen.moveAn(idx + move - bewegen.length + 1);
		} else if (evt.which === 38) { // nach oben
			bedeutungen.moveAn(idx + move);
		} else if (evt.which === 39) { // nach rechts
			bedeutungen.moveAn(idx);
		}
		// ggf. scrollen
		bedeutungen.moveScroll();
	},
	// Elemente sammeln, die bewegt werden sollen
	moveGetEle () {
		let bewegen = [];
		document.querySelectorAll(".bedeutungen-aktiv, .bedeutungen-affiziert").forEach(function(i) {
			const idx = parseInt(i.dataset.idx, 10);
			bewegen.push(idx);
		});
		return bewegen;
	},
	// nach der Bewegung das Gerüst ggf. an die richtige Stelle scrollen
	moveScroll () {
		const quick = document.getElementById("quick"),
			cont = document.getElementById("bedeutungen-cont").offsetTop,
			tr = document.querySelector(".bedeutungen-aktiv").offsetTop;
		let quick_height = quick.offsetHeight;
		if (quick.classList.contains("an")) {
			quick_height = 0;
		}
		if (cont + tr - quick_height - 5 <= window.scrollY) {
			window.scrollTo(0, cont + tr - quick_height - 5);
		}
	},
	// Bedeutung nach dem Verschieben wieder aktivieren
	//   idx = Number
	//     (Index der aktiven Zeile)
	moveAn (idx) {
		bedeutungen.moveAktiv = true;
		// Top-Element markieren
		const tr = document.querySelectorAll("#bedeutungen-cont tr")[idx];
		tr.classList.add("bedeutungen-aktiv");
		// affizierte markieren
		const len_aktiv = bedeutungen.data.bd[idx].bd.length;
		for (let i = idx + 1, len = bedeutungen.data.bd.length; i < len; i++) {
			if (bedeutungen.data.bd[i].bd.length <= len_aktiv) {
				break;
			}
			document.querySelector(`tr[data-idx="${i}"]`).classList.add("bedeutungen-affiziert");
		}
	},
	// Bewegung wieder ausschalten
	moveAus () {
		const tr = document.querySelector(".bedeutungen-aktiv");
		if (!tr) {
			return null;
		}
		// aktivierte Zeile deaktivieren
		tr.firstChild.firstChild.blur();
		tr.classList.remove("bedeutungen-aktiv");
		bedeutungen.moveAktiv = false;
		// affizierte Zeilen deaktivieren
		document.querySelectorAll(".bedeutungen-affiziert").forEach(function(i) {
			i.classList.remove("bedeutungen-affiziert");
		});
		// vormals aktive Zeile zurückgeben
		return tr;
	},
	// Änderungen speichern
	speichern () {
		// Änderungsmarkierung zurücksetzen
		bedeutungen.bedeutungenGeaendert(false);
		// direkt schließen
		if (optionen.data.einstellungen["bedeutungen-schliessen"]) {
			bedeutungen.schliessen();
		}
	},
	// Bedeutungen schließen
	schliessen () {
		// Bedeutungen noch nicht gespeichert
		if (bedeutungen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					bedeutungen.speichern();
				} else if (dialog.antwort === false) {
					bedeutungen.bedeutungenGeaendert(false);
					liste.wechseln();
				}
			});
			dialog.text("Das Bedeutungsgerüst wurde verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		}
		// zur Liste wechseln
		liste.wechseln();
	},
	// Bedeutungen wurden geändert und noch nicht gespeichert
	geaendert: false,
	// Anzeigen, dass die Bedeutungen geändert wurden
	//   geaendert = Boolean
	bedeutungenGeaendert (geaendert) {
		bedeutungen.geaendert = geaendert;
		let asterisk = document.querySelector("#bedeutungen header span");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
};
