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
					sg: "",
					al: "",
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
			a.classList.add("icon-link", "icon-move_37-38-39-40");
			a.href = "#";
			a.title = "Bedeutung verschieben";
			a.textContent = " ";
			bedeutungen.moveListener(a);
			// Löschen
			td = document.createElement("td");
			tr.appendChild(td);
			a = document.createElement("a");
			td.appendChild(a);
			a.classList.add("icon-link", "icon-loeschen");
			a.href = "#";
			a.title = "Bedeutung löschen";
			a.textContent = " ";
			bedeutungen.loeschenListener(a);
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
			// Sachgebiet
			td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add("leer");
			td.textContent = "Sachgebiet";
			// Alias
			td = document.createElement("td");
			tr.appendChild(td);
			let al = i.al;
			if (!al) {
				al = "Alias";
				td.classList.add("leer");
			}
			td.textContent = al;
			bedeutungen.aliasListener(td);
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
		const hie = document.getElementById("bedeutungen-hierarchie").value,
			idx = bedeutungen.hierarchieEbenen.indexOf(hie);
		if (idx === bedeutungen.data.sl) {
			return;
		}
		bedeutungen.data.sl = idx;
		bedeutungen.bedeutungenGeaendert(true);
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
	// eine der Bedeutungen ist aktiviert und kann nun mit allen Subbedeutungen bewegt werden
	moveAktiv: false,
	// Bedeutung nach dem Verschieben wieder aktivieren
	//   idx = Number
	//     (Index der aktiven Zeile)
	moveAn (idx) {
		bedeutungen.moveAktiv = true;
		bedeutungen.aliasFeldWeg();
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
		// mögliche Bewegungen ermitteln
		bedeutungen.moveGetData();
		// Icon ändern
		let rose = [];
		for (let n in bedeutungen.moveData) {
			if (!bedeutungen.moveData.hasOwnProperty(n)) {
				continue;
			}
			if (bedeutungen.moveData[n].movable) {
				rose.push(n);
			}
		}
		const icon = tr.firstChild.firstChild;
		icon.setAttribute("class", `icon-link icon-move_${rose.join("-")}`);
		setTimeout(function() {
			icon.focus();
		}, 0); // ohne Timeout kein Fokus
	},
	// Bewegung wieder ausschalten
	moveAus () {
		const tr = document.querySelector(".bedeutungen-aktiv");
		if (!tr) {
			return null;
		}
		// Icon zurücksetzen
		const icon = tr.firstChild.firstChild;
		icon.setAttribute("class", `icon-link icon-move_37-38-39-40`);
		// aktivierte Zeile deaktivieren
		icon.blur();
		tr.classList.remove("bedeutungen-aktiv");
		bedeutungen.moveAktiv = false;
		// affizierte Zeilen deaktivieren
		document.querySelectorAll(".bedeutungen-affiziert").forEach(function(i) {
			i.classList.remove("bedeutungen-affiziert");
		});
		// vormals aktive Zeile zurückgeben
		return tr;
	},
	// speichert die Daten zwischen, welche Bewegungen möglich sind und
	// wie sie ausgeführt werden sollten
	moveData: {
		37: { // nach links
			movable: false,
			steps: 0,
		},
		38: { // nach oben
			movable: false,
			steps: 0,
		},
		39: { // nach rechts
			movable: false,
			steps: 0,
			pad: [],
		},
		40: { // nach unten
			movable: false,
			steps: 0,
		},
	},
	// ermitteln, in welche Richtung der aktive Block bewegt werden kann
	moveGetData () {
		// Daten zurücksetzen
		for (let n in bedeutungen.moveData) {
			if (!bedeutungen.moveData.hasOwnProperty(n)) {
				continue;
			}
			bedeutungen.moveData[n].movable = false;
			bedeutungen.moveData[n].steps = 0;
			if (bedeutungen.moveData[n].pad) {
				bedeutungen.moveData[n].pad = [];
			}
		}
		// neue Daten ermitteln
		const idx = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10),
			ebene = bedeutungen.data.bd[idx].bd.length;
		let d = bedeutungen.moveData;
		// nach links
		if (bedeutungen.data.bd[idx].bd.length > 1) {
			d[37].movable = true;
			for (let i = idx + 1, len = bedeutungen.data.bd.length; i < len; i++) {
				const ebene_tmp = bedeutungen.data.bd[i].bd.length;
				if (ebene_tmp <= ebene - 1) {
					break;
				}
				d[37].steps++;
			}
		}
		// nach oben
		if (idx > 0 && bedeutungen.data.bd[idx - 1].bd.length >= bedeutungen.data.bd[idx].bd.length) {
			d[38].movable = true;
			d[38].steps = -1;
			for (let i = idx - 1; i >= 0; i--) {
				if (bedeutungen.data.bd[i].bd.length <= ebene) {
					break;
				}
				d[38].steps--;
			}
		}
		// nach rechts
		for (let i = idx - 1; i >= 0; i--) {
			const ebene_tmp = bedeutungen.data.bd[i].bd.length;
			if (ebene_tmp <= ebene) {
				if (ebene_tmp === ebene) {
					d[39].pad = [...bedeutungen.data.bd[i].bd];
				}
				break;
			}
		}
		if (d[39].pad.length) {
			d[39].movable = true;
		}
		// nach unten
		let gleiche_ebene = false;
		for (let i = idx + 1, len = bedeutungen.data.bd.length; i < len; i++) {
			const ebene_tmp = bedeutungen.data.bd[i].bd.length;
			if (ebene_tmp < ebene) {
				break;
			}
			if (ebene_tmp === ebene) {
				if (gleiche_ebene) {
					break;
				}
				gleiche_ebene = true;
			}
			d[40].steps++;
		}
		if (gleiche_ebene && d[40].steps) {
			d[40].movable = true;
		}
	},
	// Bedeutung im Bedeutungenbaum bewegen
	move (evt) {
		// kein Element aktiviert
		if (!bedeutungen.moveAktiv) {
			return;
		}
		evt.preventDefault();
		// Bewegung unmöglich
		let d = bedeutungen.moveData[evt.which];
		if (!d.movable) {
			const tab = document.querySelector("#bedeutungen-cont table");
			tab.classList.add("bedeutungen-unmovable");
			setTimeout(function() {
				tab.classList.remove("bedeutungen-unmovable");
			}, 500);
			return;
		}
		// Items bewegen
		const items = bedeutungen.moveGetItems();
		for (let i = 0, len = items.length; i < len; i++) {
			let idx = items[i];
			// spezielle Operationen
			if (evt.which === 37) { // nach links
				idx -= i;
				const id = bedeutungen.data.bd[idx].bd.join(": ");
				delete bedeutungen.data.id[id];
				bedeutungen.data.bd[idx].bd.shift();
				bedeutungen.data.id[bedeutungen.data.bd[idx].bd.join(": ")] = true;
			} else if (evt.which === 39) { // nach rechts
				const id = bedeutungen.data.bd[idx].bd.join(": ");
				delete bedeutungen.data.id[id];
				for (let j = 0, len = d.pad.length - 1; j < len; j++) {
					bedeutungen.data.bd[idx].bd.shift();
				}
				for (let j = d.pad.length - 1; j >= 0; j--) {
					bedeutungen.data.bd[idx].bd.unshift(d.pad[j]);
				}
				bedeutungen.data.id[bedeutungen.data.bd[idx].bd.join(": ")] = true;
			} else if (evt.which === 40) { // nach unten
				idx -= i;
			}
			// Element kopieren
			const kopie = {
				bd: [...bedeutungen.data.bd[idx].bd],
				sg: bedeutungen.data.bd[idx].sg,
				al: bedeutungen.data.bd[idx].al,
			};
			bedeutungen.data.bd.splice(idx, 1);
			bedeutungen.data.bd.splice(idx + d.steps, 0, kopie);
		}
		// Tabelle neu aufbauen
		const aktiv = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
		bedeutungen.aufbauen();
		// Items refokussieren
		if (evt.which === 37 || evt.which === 40) { // nach links + nach unten
			bedeutungen.moveAn(aktiv + d.steps - items.length + 1);
		} else if (evt.which === 38) { // nach oben
			bedeutungen.moveAn(aktiv + d.steps);
		} else if (evt.which === 39) { // nach rechts
			bedeutungen.moveAn(aktiv);
		}
		// ggf. scrollen
		bedeutungen.moveScroll();
		// Bedeutungen wurden geändert
		bedeutungen.bedeutungenGeaendert(true);
	},
	// Elemente sammeln, die bewegt werden sollen
	moveGetItems () {
		let items = [];
		document.querySelectorAll(".bedeutungen-aktiv, .bedeutungen-affiziert").forEach(function(i) {
			const idx = parseInt(i.dataset.idx, 10);
			items.push(idx);
		});
		return items;
	},
	// nach der Bewegung das Gerüst ggf. an die richtige Stelle scrollen
	moveScroll () {
		const quick = document.getElementById("quick"),
			quick_an = quick.classList.contains("an"),
			quick_height = quick.offsetHeight,
			header_height = document.querySelector("body > header").offsetHeight,
			cont_top = document.getElementById("bedeutungen-cont").offsetTop,
			tr = document.querySelector(".bedeutungen-aktiv"),
			tr_top = tr.offsetTop,
			tr_height = tr.offsetHeight;
		// ggf. hochscrollen
		let pos = cont_top + tr_top - 5;
		if (!quick_an) {
			pos -= quick_height;
		}
		if (pos <= window.scrollY) {
			window.scrollTo(0, pos);
			return;
		}
		// ggf. runterscrollen
		pos = header_height + cont_top + tr_top + tr_height;
		if (quick_an) {
			pos += quick_height;
		}
		if (pos - window.scrollY >= window.innerHeight) {
			window.scrollTo(0, pos - tr_height - 5 - quick_height - header_height);
		}
	},
	// Listener für das Löschn-Icon
	//   a = Element
	//     (der Link mit dem Abfalleimer)
	loeschenListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const tr = this.parentNode.parentNode,
				idx = parseInt(tr.dataset.idx, 10),
				zaehlung = tr.querySelector("b").firstChild.nodeValue;
			bedeutungen.loeschen(idx, zaehlung);
		});
	},
	// Löschen auf Nachfrage durchführen
	//   idx = Number
	//     (Index der Bedeutung)
	//   zaehlung = String
	//     (angezeigte Zählung)
	loeschen (idx, zaehlung) {
		const bd = bedeutungen.data.bd[idx].bd[bedeutungen.data.bd[idx].bd.length - 1],
			items = bedeutungen.moveGetItems();
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				for (let i = items.length - 1; i >= 0; i--) {
					const idx = items[i],
						id = bedeutungen.data.bd[idx].bd.join(": ");
					delete bedeutungen.data.id[id];
					bedeutungen.data.bd.splice(idx, 1);
				}
				bedeutungen.aufbauen();
				bedeutungen.bedeutungenGeaendert(false);
			} else {
				document.querySelector(".bedeutungen-aktiv").firstChild.firstChild.focus();
			}
		});
		dialog.text(`Soll die markierte Bedeutung\n<p class="bedeutungen-dialog"><b>${zaehlung}</b>${bd}</p>\n${items.length > 1 ? "mit all ihren Unterbedeutungen " : ""}wirklich gelöscht werden?`);
	},
	// aktiviert die Eingabe eines Alias
	//   td = Element
	//     (Tabellenzelle für das Alias)
	aliasListener (td) {
		td.addEventListener("click", function() {
			// Ist das Edit-Feld in dieser Zelle?
			if (this.firstChild.id) {
				return;
			}
			// ggf. altes Edit-Feld löschen
			bedeutungen.aliasFeldWeg();
			// Zeile und Zelle vorbereiten
			bedeutungen.moveAus();
			td.parentNode.classList.add("bedeutungen-edit");
			td.classList.remove("leer");
			// Edit-Feld erzeugen und einhängen
			const idx = parseInt(this.parentNode.dataset.idx, 10);
			let edit = document.createElement("div");
			edit.setAttribute("contenteditable", "true");
			edit.id = "bedeutungen-alias";
			edit.textContent = bedeutungen.data.bd[idx].al;
			td.replaceChild(edit, td.firstChild);
			helfer.auswahl(edit);
			// Event-Listener
			edit.addEventListener("keydown", function(evt) {
				if (evt.which === 27) { // Esc
					evt.stopPropagation();
					bedeutungen.aliasEintragen(this.parentNode);
					return;
				} else if (evt.which !== 13) { // kein Enter
					return;
				}
				evt.preventDefault();
				// Wert aus dem Input ermitteln
				const idx = parseInt(this.parentNode.parentNode.dataset.idx, 10),
					al = helfer.textTrim(this.textContent, true);
				// wurde das Alias schon vergeben?
				for (let i = 0, len = bedeutungen.data.bd.length; i < len; i++) {
					if (!al) {
						break;
					}
					if (i === idx) {
						continue;
					}
					if (bedeutungen.data.bd[i].al === al) {
						schon_vergeben(this);
						return;
					}
				}
				// Alias übernehmen
				bedeutungen.data.bd[idx].al = al;
				// Alias eintragen
				bedeutungen.aliasEintragen(this.parentNode);
				// Änderungsmarkierung setzen
				bedeutungen.bedeutungenGeaendert(true);
				// Alias schon vergeben
				function schon_vergeben (edit) {
					dialog.oeffnen("alert", function() {
						helfer.auswahl(edit);
					});
					dialog.text(`Das Alias <i>${al}</i> wurde schon vergeben.`);
				}
			});
		});
	},
	// ggf. altes Eingabefeld für ein Alias ggf. entfernen
	aliasFeldWeg () {
		const alias = document.getElementById("bedeutungen-alias");
		if (alias) {
			bedeutungen.aliasEintragen(alias.parentNode);
		}
	},
	// gespeicherten Alias in die übergebene Zelle eintragen
	//   td = Element
	//     (Tabellenzelle für das Alias)
	aliasEintragen (td) {
		const idx = parseInt(td.parentNode.dataset.idx, 10);
		let al = bedeutungen.data.bd[idx].al;
		if (!al) { // kein Alias gespeichert
			al = "Alias";
			td.classList.add("leer");
		} else {
			td.classList.remove("leer");
		}
		td.replaceChild(document.createTextNode(al), td.firstChild);
		td.parentNode.classList.remove("bedeutungen-edit");
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
		let asterisk = document.querySelector("#bedeutungen h2 span");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
};
