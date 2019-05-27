"use strict";

let bedeutungen = {
	// speichert den Timeout für das Ausschalten der Farbe
	// bei den Ereignissen unmovable, moved und saved
	timeout: null,
	// Kopie des Bedeutungsgerüsts, ausgelesen aus data.bd
	data: {},
	// Generator zur Erzeugung der nächsten ID
	makeId: null,
	*idGenerator (id) {
		while (true) {
			yield id++;
		}
	},
	// baut ein initiales, alphabetisch sortiertes Bedeutungsgerüst auf
	// (falls in der Kartei noch keiner vorhanden ist; irgendwann ist diese Funktion wohl tot)
	konstit () {
		// Bedeutungsgerüst ist vorhanden
		if (data.bd.bd) {
			return;
		}
		// ID-Generator initialisieren
		bedeutungen.makeId = bedeutungen.idGenerator(1);
		// Gerüst aufbauen
		bedeutungen.data = {}; // TODO data.bd
		bedeutungen.data.sl = 2; // TODO data.bd
		bedeutungen.data.bd = []; // TODO data.bd
		bedeutungen.bedeutungVorhandenCache = {};
		for (let id in data.ka) {
			if (!data.ka.hasOwnProperty(id)) {
				continue;
			}
			if (!data.ka[id].bd) {
				continue;
			}
			let bd = data.ka[id].bd.split("\n");
			for (let i = 0, len = bd.length; i < len; i++) {
				bedeutungen.konstitErgaenzen(bd[i]);
			}
		}
		// Einträge im Gerüst sortieren
		bedeutungen.data.bd.sort(function(a, b) { // TODO data.bd
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
		// Einträge im Gerüst durchzählen
		bedeutungen.konstitZaehlung(); // TODO data.bd
	},
	// Gerüst ggf. um die übergebene Bedeutung ergänzen
	//   bd = String
	//     (Bedeutung ausgeschrieben, Hierarchien durch ": " getrennt)
	konstitErgaenzen (bd) {
		if (bedeutungen.bedeutungVorhanden(bd, true)) {
			return;
		}
		let hie = bd.split(": "),
			hie_akt = [],
			i = 0;
		do {
			hie_akt.push(hie[i]);
			if (!bedeutungen.bedeutungVorhanden(hie_akt.join(": "), true)) {
				bedeutungen.data.bd.push(bedeutungen.konstitBedeutung(hie_akt)); // TODO data.bd
			}
			i++;
		} while (hie[i]);
	},
	// gibt ein neues Bedeutungs-Objekt zurück
	//   bd = Array
	//     (die Bedeutung mit allen Hierarchieebenen)
	konstitBedeutung (bd) {
		return {
			al: "",
			bd: [...bd],
			id: bedeutungen.makeId.next().value,
			ta: [],
			za: "",
		};
	},
	// Bedeutungen durchzählen
	//   arr = Array
	//     (Array mit den Bedeutungen, die durchgezählt werden sollen)
	konstitZaehlung (arr = bedeutungen.data.bd) {
		bedeutungen.zaehlungen = [];
		arr.forEach(function(i) {
			i.za = bedeutungen.zaehlung(i.bd);
		});
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
		// Ebene hochzählen
		if (!bedeutungen.zaehlungen[ebene]) {
			bedeutungen.zaehlungen[ebene] = 0;
		}
		bedeutungen.zaehlungen[ebene]++;
		// alle tieferen Ebenen löschen
		bedeutungen.zaehlungen.fill(0, ebene + 1);
		// Zählzeichen ermitteln
		let zeichen = "–";
		if (bedeutungen.zaehlzeichen[ebene]) {
			zeichen = bedeutungen.zaehlzeichen[ebene][bedeutungen.zaehlungen[ebene] - 1];
		}
		return zeichen;
	},
	// überprüft, ob die übergebene Bedeutung schon vorhanden ist
	// (wird auch in beleg.js genutzt)
	//   bd = String
	//     (die Bedeutung, Hierarchien getrennt durch ": ")
	//   cache = true || undefined
	//     (ist die Bedeutung vorhanden, soll sie gecacht werden
	//   arr = Array || undefined
	//     (Array, in dem geschaut werden soll, ob die Bedeutung vorhanden ist)
	bedeutungVorhandenCache: {},
	bedeutungVorhanden (bd, cache = false, arr = bedeutungen.data.bd) {
		if (cache && bedeutungen.bedeutungVorhandenCache[bd]) {
			return true;
		}
		for (let i = 0, len = arr.length; i < len; i++) {
			if (arr[i].bd.join(": ") === bd) {
				if (cache) {
					bedeutungen.bedeutungVorhandenCache[bd] = true;
				}
				return true;
			}
		}
		return false;
	},
	// Bedeutungen öffnen
	oeffnen () {
		// Bedeutungen sind schon offen
		if (!document.getElementById("bedeutungen").classList.contains("aus")) {
			helfer.auswahl(document.getElementById("bedeutungen-neu"));
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
			// TODO hier Kopie von data.bd => bedeutungen.data
			document.getElementById("bedeutungen-hierarchie").value = bedeutungen.hierarchieEbenen[bedeutungen.data.sl];
			bedeutungen.aufbauen();
			helfer.sektionWechseln("bedeutungen");
		}
	},
	// das Bedeutungsgerüst aufbauen
	aufbauen () {
		bedeutungen.moveAktiv = false;
		// Content vorbereiten
		let cont = document.getElementById("bedeutungen-cont"),
			table = cont.querySelector("table");
		while (table.childNodes.length > 1) { // Caption mit Überschrift erhalten
			table.removeChild(table.lastChild);
		}
		// Tabelle füllen
		let lastId = 0;
		bedeutungen.data.bd.forEach(function(i, n) {
			// höchste ID ermitteln
			lastId = i.id > lastId ? i.id : lastId;
			// Zeile erzeugen
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
			a.title = "Bedeutung löschen (Entf)";
			a.textContent = " ";
			bedeutungen.loeschenListener(a);
			// Bedeutung
			td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add("zaehlung");
			let p = document.createElement("p"),
				b = document.createElement("b");
			b.textContent = i.za;
			p.appendChild(b);
			let span = document.createElement("span");
			span.dataset.feld = "bd";
			span.innerHTML = bd[bd.length - 1];
			bedeutungen.editContListener(span);
			p.appendChild(span);
			let div = document.createElement("div");
			div.appendChild(p);
			for (let j = 1, len = bd.length; j < len; j++) {
				let nDiv = document.createElement("div");
				nDiv.appendChild(div);
				div = nDiv;
			}
			td.appendChild(div);
			// Tags
			td = document.createElement("td");
			td.dataset.feld = "ta";
			tr.appendChild(td);
			// TODO TAGS:
			// - ggf. Werte einfügen
			// - dann kein .leer und kein Standardtext
			td.classList.add("leer");
			td.textContent = "Tags";
			bedeutungen.openTagger(td);
			// Alias
			td = document.createElement("td");
			td.dataset.feld = "al";
			tr.appendChild(td);
			let al = i.al;
			if (!al) {
				al = "Alias";
				td.classList.add("leer");
			}
			td.textContent = al;
			bedeutungen.editContListener(td);
		});
		// Ergänzungszeile einrücken
		bedeutungen.aufbauenErgaenzen(table);
		// ggf. ID-Generator initialisieren
		// (könnte bereits durch bedeutungen.konstit() geschehen sein)
		if (!bedeutungen.makeId) {
			bedeutungen.makeId = bedeutungen.idGenerator(lastId + 1);
		}
	},
	// Zeile zum Ergänzen des Bedeutungsgerüsts einfügen
	//   table = Element
	//     (die Tabelle mit dem Bedeutungsgerüst)
	aufbauenErgaenzen (table) {
		let tr = document.createElement("tr");
		table.appendChild(tr);
		tr.classList.add("bedeutungen-neu");
		for (let i = 0; i < 5; i++) {
			let td = document.createElement("td");
			td.textContent = " ";
			tr.appendChild(td);
		}
		let span = document.createElement("span");
		span.classList.add("leer");
		span.id = "bedeutungen-neu";
		span.setAttribute("contenteditable", "true");
		span.textContent = "neue Bedeutung";
		helfer.editPaste(span);
		bedeutungen.ergaenzen(span);
		tr.childNodes[2].replaceChild(span, tr.childNodes[2].firstChild);
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
		// Werte ändern
		bedeutungen.data.sl = idx;
		bedeutungen.konstitZaehlung();
		bedeutungen.bedeutungenGeaendert(true);
		// neue Zählung eintragen
		document.querySelectorAll("#bedeutungen-cont b").forEach(function(i, n) {
			i.textContent = bedeutungen.data.bd[n].za;
		});
	},
	// die vorherige oder nächste Bedeutung aufrufen
	// (wird nur aufgerufen, wenn Ctrl + ↑ | ↓)
	//   evt = Event-Objekt
	//     (Tastaturevent, über das die Funktion aufgerufen wurde)
	navi (evt) {
		if (!bedeutungen.moveAktiv) {
			let tr = document.querySelector("#bedeutungen-cont tr");
			if (hasIdx(tr)) {
				bedeutungen.moveAn(parseInt(tr.dataset.idx, 10));
			}
			return;
		}
		let tr_aktiv = document.querySelector(".bedeutungen-aktiv");
		if (evt.which === 38 && hasIdx(tr_aktiv.previousSibling)) { // hoch
			bedeutungen.moveAus();
			bedeutungen.moveAn(parseInt(tr_aktiv.previousSibling.dataset.idx, 10));
		} else if (evt.which === 40 && hasIdx(tr_aktiv.nextSibling)) { // runter
			bedeutungen.moveAus();
			bedeutungen.moveAn(parseInt(tr_aktiv.nextSibling.dataset.idx, 10));
		}
		function hasIdx (tr) {
			if (tr.dataset.idx) {
				return true;
			}
			return false;
		}
	},
	//
	naviTab (evt) {
		// nichts aktiviert
		if (!bedeutungen.moveAktiv &&
				!document.getElementById("bedeutungen-edit") &&
				!document.getElementById("bedeutungen-tagger-link")) {
			return;
		}
		evt.preventDefault();
		// moveAktiv
		if (bedeutungen.moveAktiv) {
			let zeile = document.querySelector(".bedeutungen-aktiv");
			if (evt.shiftKey) {
				bedeutungen.editErstellen(zeile.lastChild);
			} else {
				bedeutungen.editErstellen(zeile.childNodes[2].querySelector("span"));
			}
			return;
		}
		// anderes Edit-Feld fokussieren oder die Zeile aktivieren
		let aktiv = document.getElementById("bedeutungen-edit");
		if (!aktiv) {
			aktiv = document.getElementById("bedeutungen-tagger-link");
		}
		let felder = ["bd", "ta", "al"],
			feld = aktiv.parentNode.dataset.feld,
			pos = felder.indexOf(feld);
		if (evt.shiftKey) {
			pos--;
		} else {
			pos++;
		}
		let zeile = document.querySelector(".bedeutungen-edit");
		if (pos < 0 || pos === felder.length) { // Zeile aktivieren
			const idx = parseInt(zeile.dataset.idx, 10);
			bedeutungen.moveAn(idx);
		} else { // anderes Edit-Feld fokussieren
			let neuesFeld = zeile.querySelector(`*[data-feld="${felder[pos]}"]`);
			if (felder[pos] === "ta") {
				bedeutungen.linkTagger(neuesFeld);
			} else {
				bedeutungen.editErstellen(neuesFeld);
			}
		}
	},
	// Listener für die Windrose
	//   a = Element
	//     (der Link mit der Windrose)
	moveListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let tr = this.parentNode.parentNode,
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
	//   moved = true || undefined
	//     (die zu aktivierende Bedeutung wurde gerade bewegt)
	moveAn (idx, moved = false) {
		bedeutungen.moveAktiv = true;
		bedeutungen.editFeldWeg();
		// Top-Element markieren
		let tr = document.querySelectorAll("#bedeutungen-cont tr")[idx];
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
		let icon = tr.firstChild.firstChild;
		icon.setAttribute("class", `icon-link icon-move_${rose.join("-")}`);
		setTimeout(function() {
			icon.focus();
		}, 0); // ohne Timeout kein Fokus
		// erfolgreiche Bewegung markieren
		if (moved) {
			let tab = document.querySelector("#bedeutungen-cont table");
			tab.classList.add("bedeutungen-moved");
			clearTimeout(bedeutungen.timeout);
			tab.classList.remove("bedeutungen-unmovable");
			bedeutungen.timeout = setTimeout(function() {
				tab.classList.remove("bedeutungen-moved");
			}, 500);
		}
	},
	// Bewegung wieder ausschalten
	moveAus () {
		let tr = document.querySelector(".bedeutungen-aktiv");
		if (!tr) {
			return null;
		}
		// Icon zurücksetzen
		let icon = tr.firstChild.firstChild;
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
	// Bedeutung im Bedeutungsgerüst bewegen
	move (evt) {
		// kein Element aktiviert
		if (!bedeutungen.moveAktiv) {
			return;
		}
		evt.preventDefault();
		// Bewegung unmöglich
		let d = bedeutungen.moveData[evt.which];
		if (!d.movable) {
			let tab = document.querySelector("#bedeutungen-cont table");
			tab.classList.add("bedeutungen-unmovable");
			clearTimeout(bedeutungen.timeout);
			tab.classList.remove("bedeutungen-moved");
			bedeutungen.timeout = setTimeout(function() {
				tab.classList.remove("bedeutungen-unmovable");
			}, 500);
			return;
		}
		// Items bewegen
		let items = bedeutungen.moveGetItems();
		for (let i = 0, len = items.length; i < len; i++) {
			let idx = items[i];
			// spezielle Operationen
			if (evt.which === 37) { // nach links
				idx -= i;
				bedeutungen.data.bd[idx].bd.shift();
			} else if (evt.which === 39) { // nach rechts
				for (let j = 0, len = d.pad.length - 1; j < len; j++) {
					bedeutungen.data.bd[idx].bd.shift();
				}
				for (let j = d.pad.length - 1; j >= 0; j--) {
					bedeutungen.data.bd[idx].bd.unshift(d.pad[j]);
				}
			} else if (evt.which === 40) { // nach unten
				idx -= i;
			}
			// Element kopieren
			let kopie = bedeutungen.makeCopy(idx);
			bedeutungen.data.bd.splice(idx, 1);
			bedeutungen.data.bd.splice(idx + d.steps, 0, kopie);
		}
		// Tabelle neu aufbauen
		const aktiv = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
		bedeutungen.konstitZaehlung();
		bedeutungen.aufbauen();
		// Items refokussieren
		if (evt.which === 37 || evt.which === 40) { // nach links + nach unten
			bedeutungen.moveAn(aktiv + d.steps - items.length + 1, true);
		} else if (evt.which === 38) { // nach oben
			bedeutungen.moveAn(aktiv + d.steps, true);
		} else if (evt.which === 39) { // nach rechts
			bedeutungen.moveAn(aktiv, true);
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
		let tr = document.querySelector(".bedeutungen-aktiv");
		const quick_height = document.getElementById("quick").offsetHeight,
			header_height = document.querySelector("body > header").offsetHeight,
			cont_top = document.getElementById("bedeutungen-cont").offsetTop,
			tr_top = tr.offsetTop,
			tr_height = tr.offsetHeight;
		// ggf. hochscrollen
		let pos = cont_top + tr_top - quick_height - 10;
		if (pos <= window.scrollY) {
			window.scrollTo(0, pos);
			return;
		}
		// ggf. runterscrollen
		pos = header_height + cont_top + tr_top + tr_height - quick_height;
		if (pos - window.scrollY >= window.innerHeight) {
			window.scrollTo(0, pos - tr_height - 10 - header_height);
		}
	},
	// erstellt eine unabhängige Kopie eines Datensatzes
	//   idx = Number
	//     (Index des Eintrags, von dem eine Kopie erstellt werden soll)
	makeCopy (idx) {
		let kopie = Object.assign({}, bedeutungen.data.bd[idx]);
		// tiefe Kopie des Bedeutungen-Arrays
		kopie.bd = [...bedeutungen.data.bd[idx].bd];
		// tiefe Kopie des Tags-Arrays
		kopie.ta = [];
		for (let o of bedeutungen.data.bd[idx].ta) {
			kopie.ta.push({...bedeutungen.data.bd[idx].ta[o]});
		}
		// Kopie zurückgeben
		return kopie;
	},
	// Listener für das Löschn-Icon
	//   a = Element
	//     (der Link mit dem Abfalleimer)
	loeschenListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let tr = this.parentNode.parentNode,
				idx = parseInt(tr.dataset.idx, 10);
			if (!bedeutungen.moveAktiv) {
				aktivieren();
			} else {
				let tr_aktiv = document.querySelector(".bedeutungen-aktiv");
				const idx_aktiv = parseInt(tr_aktiv.dataset.idx, 10);
				if (idx_aktiv !== idx) {
					bedeutungen.moveAus();
					aktivieren();
				} else {
					bedeutungen.loeschenPrep();
				}
			}
			function aktivieren () {
				bedeutungen.moveAn(idx);
				setTimeout(function() {
					bedeutungen.loeschenPrep();
				}, 500);
			}
		});
	},
	// Tastatur-Handler für Entf
	loeschenTastatur () {
		// ggf. abbrechen
		if (!bedeutungen.moveAktiv) {
			return;
		}
		bedeutungen.loeschenPrep();
	},
	// benötigte Werte ermitteln, bevor das Löschen angestoßen wird
	loeschenPrep () {
		let tr = document.querySelector(".bedeutungen-aktiv");
		const idx = parseInt(tr.dataset.idx, 10);
		bedeutungen.loeschen(idx);
	},
	// Löschen auf Nachfrage durchführen
	//   idx = Number
	//     (Index der Bedeutung)
	loeschen (idx) {
		let items = bedeutungen.moveGetItems();
		const bd = bedeutungen.data.bd[idx].bd[bedeutungen.data.bd[idx].bd.length - 1];
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				for (let i = items.length - 1; i >= 0; i--) {
					bedeutungen.data.bd.splice(items[i], 1);
				}
				bedeutungen.konstitZaehlung();
				bedeutungen.aufbauen();
				bedeutungen.bedeutungenGeaendert(true);
			} else {
				document.querySelector(".bedeutungen-aktiv").firstChild.firstChild.focus();
			}
		});
		dialog.text(`Soll die markierte Bedeutung\n<p class="bedeutungen-dialog"><b>${bedeutungen.data.bd[idx].za}</b>${bd}</p>\n${items.length > 1 ? "mit all ihren Unterbedeutungen " : ""}wirklich gelöscht werden?`);
	},
	// Listener zum Öffnen des Taggers
	//   td = Element
	//     (die Tabellenzelle, über die der Tagger geöffnet werden soll)
	openTagger (td) {
		// TODO TAGS
		td.addEventListener("click", function() {
			const idx = this.parentNode.dataset.idx;
			tagger.oeffnen(idx);
		});
	},
	// Link zum Öffnen des Taggers erstellen
	linkTagger (zelle) {
		// TODO TAGS
		// ggf. altes Edit-Feld löschen
		bedeutungen.editFeldWeg();
		// Zeile und Container vorbereiten
		bedeutungen.moveAus();
		bedeutungen.editZeile(zelle, true);
		// Link zum Tagger einfügen
		helfer.keineKinder(zelle);
		let a = document.createElement("a");
		a.href = "#";
		a.id = "bedeutungen-tagger-link";
		a.textContent = "Tags"; // TODO hier muss natürlich der richtige Content eingefügt werden
		zelle.appendChild(a);
		a.focus();
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			const idx = this.parentNode.parentNode.dataset.idx;
			tagger.oeffnen(idx);
		});
		a.addEventListener("blur", function() {
			bedeutungen.editEintragen(this);
		});
	},
	// Listener für den Container, in dem ein Edit-Feld erstellt werden soll
	//   ele = Element
	//     (Element, in dem das Edit-Feld erstellt werden soll)
	editContListener (ele) {
		ele.addEventListener("click", function() {
			// Ist das Edit-Feld schon in diesem Element?
			if (this.firstChild.id) {
				return;
			}
			bedeutungen.editErstellen(this);
		});
	},
	// Edit-Feld erstellen
	//   ele = Element
	//     (Element, in dem das Edit-Feld erstellt werden soll)
	editErstellen (ele) {
		// ggf. altes Edit-Feld löschen
		bedeutungen.editFeldWeg();
		// Zeile und Container vorbereiten
		bedeutungen.moveAus();
		bedeutungen.editZeile(ele, true);
		ele.classList.remove("leer");
		// Edit-Feld erzeugen und einhängen
		const idx = bedeutungen.editGetIdx(ele),
			feld = ele.dataset.feld,
			z = bedeutungen.data.bd[idx][feld];
		let edit = document.createElement("span");
		edit.setAttribute("contenteditable", "true");
		edit.id = "bedeutungen-edit";
		if (Array.isArray(z)) {
			if (feld === "bd") {
				edit.innerHTML = z[z.length - 1];
			} else if (feld === "ta") {
				// TODO TAGS:
				// hier müssen die Tags eingefügt werden
			}
		} else {
			edit.textContent = z;
		}
		helfer.keineKinder(ele);
		ele.appendChild(edit);
		// Listener anhängen
		helfer.editPaste(edit);
		edit.addEventListener("input", function() {
			bedeutungen.changed(this);
		});
		bedeutungen.editListener(edit);
		// Caret an das Ende des Feldes setzen
		if (!edit.textContent) {
			edit.focus();
		} else {
			let sel = window.getSelection();
			sel.collapse(edit.lastChild, edit.lastChild.textContent.length);
		}
	},
	// Listener für ein Edit-Feld
	//   edit = Element
	//     (das Edit-Feld)
	editListener (edit) {
		edit.addEventListener("keydown", function(evt) {
			if (evt.which === 27) { // Esc
				evt.stopPropagation();
				bedeutungen.editEintragen(this.parentNode);
				return;
			} else if (evt.which !== 13) { // kein Enter
				return;
			}
			evt.preventDefault();
			// Wert aus dem Edit-Feld ermitteln
			let edit = this;
			const idx = bedeutungen.editGetIdx(edit),
				feld = edit.parentNode.dataset.feld;
			let wert = "";
			if (feld === "bd") {
				wert = helfer.textTrim(edit.innerHTML, true);
			} else {
				wert = helfer.textTrim(edit.textContent, true);
			}
			// Ist der Wert okay?
			if (feld === "bd" && !wert) {
				dialog.oeffnen("alert", function() {
					edit.focus();
				});
				dialog.text("Sie haben keine Bedeutung eingegeben.");
				return;
			} else if (feld === "al") {
				for (let i = 0, len = bedeutungen.data.bd.length; i < len; i++) {
					if (!wert) {
						break;
					}
					if (i === idx) {
						continue;
					}
					if (bedeutungen.data.bd[i].al === wert) {
						alias_schon_vergeben(edit);
						return;
					}
				}
			}
			// Wert übernehmen
			let z = bedeutungen.data.bd[idx];
			if (feld === "bd") {
				z[feld][z[feld].length - 1] = wert;
			} else {
				z[feld] = wert;
			}
			// visualisieren, dass sich was getan hat
			bedeutungen.changed(edit);
			edit.classList.add("bedeutungen-saved");
			clearTimeout(bedeutungen.timeout);
			bedeutungen.timeout = setTimeout(function() {
				edit.classList.remove("bedeutungen-saved");
			}, 500);
			// Änderungsmarkierung setzen
			bedeutungen.bedeutungenGeaendert(true);
			// Alias schon vergeben
			function alias_schon_vergeben (edit) {
				dialog.oeffnen("alert", function() {
					helfer.auswahl(edit);
				});
				dialog.text(`Das Alias <i>${wert}</i> wurde schon vergeben.`);
			}
		});
	},
	// altes Eingabefeld ggf. entfernen
	editFeldWeg () {
		let edit = document.getElementById("bedeutungen-edit");
		if (edit) {
			bedeutungen.editEintragen(edit.parentNode);
		}
	},
	// gespeicherten Wert des edierten Feldes in die übergebene Zelle eintragen
	//   ele = Element
	//     (Element, in dem das Edit-Feld steht)
	editEintragen (ele) {
		let felder = {
			ta: "Tags",
			al: "Alias",
		};
		const idx = bedeutungen.editGetIdx(ele),
			feld = ele.dataset.feld,
			z = bedeutungen.data.bd[idx][feld];
		let wert = "";
		if (Array.isArray(z)) {
			if (feld === "bd") {
				wert = z[z.length - 1];
			} else if (feld === "ta") {
				// TODO TAGS:
				// korrekten Wert in das Feld eintragen
				if (!z.length) {
					wert = felder[feld];
					ele.classList.add("leer");
				} else {
					wert = felder[feld];
					ele.classList.remove("leer");
				}
			}
		} else {
			wert = z;
			if (!wert) { // kein Wert gespeichert
				wert = felder[feld];
				ele.classList.add("leer");
			} else {
				ele.classList.remove("leer");
			}
		}
		helfer.keineKinder(ele);
		ele.innerHTML = wert;
		bedeutungen.editZeile(ele, false);
	},
	// Index des betreffenden Elemenets suchen
	//   ele = Element
	//     (das Edit-Feld, zu dem der Index gesucht werden soll)
	editGetIdx (ele) {
		while (!ele.dataset.idx) {
			ele = ele.parentNode;
		}
		return parseInt(ele.dataset.idx, 10);
	},
	// Zeile markieren/demarkieren, in der ein Edit-Feld geöffnet/geschlossen wurde
	//   ele = Element
	//     (Element, das zum Edieren fokussiert wird)
	//   edit = Boolean
	//     (Zeile wird ediert)
	editZeile (ele, edit) {
		let tr = ele.parentNode;
		while (tr.nodeName !== "TR") {
			tr = tr.parentNode;
		}
		if (edit) {
			tr.classList.add("bedeutungen-edit");
		} else {
			tr.classList.remove("bedeutungen-edit");
		}
	},
	// überprüfen, ob der Inhalt des Feldes geändert wurde
	//   ele = Element
	//     (das Edit-Feld, auf dessen Veränderungen geachtet werden soll)
	changed (ele) {
		// Varialben auslesen
		const idx = parseInt(document.querySelector(".bedeutungen-edit").dataset.idx, 10),
			feld = ele.parentNode.dataset.feld;
		let wert = "";
		if (feld === "bd") {
			wert = helfer.textTrim(ele.innerHTML, true);
		} else {
			wert = helfer.textTrim(ele.textContent, true);
		}
		// Wert aus Datenobjekt auslesen
		let ds = bedeutungen.data.bd[idx],
			wert_ds = "";
		if (Array.isArray(ds[feld])) {
			wert_ds = ds[feld][ds[feld].length - 1];
		} else {
			wert_ds = ds[feld];
		}
		// Markieren setzen/entfernen
		if (wert !== wert_ds) {
			ele.classList.add("bedeutungen-changed");
		} else {
			ele.classList.remove("bedeutungen-changed");
		}
	},
	// Bedeutung ergänzen
	//   span = Element
	//     (das Edit-Feld, über das eine Bedeutung ergänzt werden kann)
	ergaenzen (span) {
		span.addEventListener("keydown", function(evt) {
			if (evt.which === 27) { // Esc (wegen der Einheitlichkeit mit anderen Edit-Feldern)
				evt.stopPropagation();
				this.blur();
				return;
			}
			if (evt.which !== 13) { // kein Enter
				return;
			}
			// Bedeutung hinzufügen
			evt.preventDefault();
			let feld = this;
			const bd = helfer.textTrim(this.innerHTML, true);
			// keine Bedeutung eingegeben
			if (!bd) {
				dialog.oeffnen("alert", function() {
					helfer.auswahl(feld);
				});
				dialog.text("Sie haben keine Bedeutung eingegeben.");
				return;
			}
			// Bedeutung schon vorhanden
			if (bedeutungen.bedeutungVorhanden(bd)) {
				dialog.oeffnen("alert", function() {
					helfer.auswahl(feld);
				});
				dialog.text(`Die Bedeutung\n<p class="bedeutungen-dialog">${bd}</p>\nist schon vorhanden.`);
				return;
			}
			// Bedeutung ergänzen, Gerüst neu aufbauen, Bedeutung aktivieren
			bedeutungen.data.bd.push(bedeutungen.konstitBedeutung([bd]));
			bedeutungen.konstitZaehlung();
			bedeutungen.aufbauen();
			bedeutungen.moveAn(bedeutungen.data.bd.length - 1, true);
			bedeutungen.bedeutungenGeaendert(true);
		});
		span.addEventListener("focus", function() {
			bedeutungen.moveAus();
			bedeutungen.editFeldWeg();
			if (this.classList.contains("leer")) {
				this.classList.remove("leer");
				this.textContent = "";
			}
		});
		span.addEventListener("blur", function() {
			if (!this.textContent) {
				this.classList.add("leer");
				this.textContent = "neue Bedeutung";
			}
		});
	},
	// Änderungen speichern
	speichern () {
		// keine Änderungen
		if (!bedeutungen.geaendert) {
			bedeutungen.schliessen();
			return;
		}
		// TODO Änderungen in Karteikarten anwenden
		// TODO bedeutungen.data => data.bd
		// TODO Änderungsmarkierung Kartei setzen
		// TODO Bedeutungsgerüst-Fenster auffrischen
// 		kartei.karteiGeaendert(true);
		// Änderungsmarkierung Bedeutungen zurücksetzen
		bedeutungen.bedeutungenGeaendert(false);
		// ggf. direkt schließen
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
		helfer.geaendert();
		let asterisk = document.querySelector("#bedeutungen-cont h2 span");
		if (geaendert) {
			asterisk.classList.remove("aus");
		} else {
			asterisk.classList.add("aus");
		}
	},
};
