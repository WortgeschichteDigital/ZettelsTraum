"use strict";

let hilfe = {
	// mit der Tastatur durch durch die Menüelemente navigieren
	//   tastaturcode = Number
	naviMenue (tastaturcode) {
		// aktives Element ermitteln
		let links = document.querySelectorAll("nav a.kopf"),
			aktiv = document.querySelector("nav a.aktiv"),
			pos = -1;
		for (let i = 0, len = links.length; i < len; i++) {
			if (links[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// zu aktivierendes Element ermitteln
		if (tastaturcode === 38) {
			pos--;
		} else {
			pos++;
		}
		if (pos < 0) {
			pos = links.length - 1;
		} else if (pos >= links.length) {
			pos = 0;
		}
		// Sektion wechseln
		const sektion = links[pos].getAttribute("href").replace(/^#/, "");
		hilfe.sektionWechseln(sektion);
	},
	// korrigiert den Sprung nach Klick auf einen internen Link,
	// sodass er nicht hinter dem Header verschwindet
	naviSprung (a) {
		if (a.classList.contains("link-handbuch") ||
				a.classList.contains("link-dokumentation")) {
			return;
		}
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const id = this.getAttribute("href").replace(/^#/, "");
			hilfe.naviSprungAusfuehren(id);
		});
	},
	// Sprung zu dem übergebenen Ziel ausführen
	//   id = String
	//     (Zielangabe, also ID, zu der hin der Sprung ausgeführt werden soll)
	naviSprungAusfuehren (id) {
		// ggf. die Sektion wechseln
		const sek_aktiv = hilfe.sektionAktiv();
		if (!new RegExp(`^${sek_aktiv}`).test(id)) {
			const sek_ziel = id.split("-")[0];
			hilfe.sektionWechseln(sek_ziel);
		} else {
			// History: Position merken
			hilfe.history(sek_aktiv);
		}
		// ggf. Fenster an die korrekte Position scrollen
		if (/-/.test(id)) {
			window.scrollTo({
				left: 0,
				top: document.getElementById(id).offsetTop - 70 - 16, // -16, um oben immer ein bisschen padding zu haben; vgl. hilfe.sucheSprung()
				behavior: "smooth",
			});
		}
		// History: Pfeile auffrischen (nachdem der Scroll beendet wurde)
		hilfe.historyScrollArrows();
	},
	// ermittelt die aktive Sektion
	sektionAktiv () {
		let sek = document.querySelectorAll("section");
		for (let i = 0, len = sek.length; i < len; i++) {
			if (!sek[i].classList.contains("aus")) {
				return sek[i].id.replace(/^sektion-/, "");
			}
		}
		return "";
	},
	// Sektion wechseln
	//   sektion = String
	//     (Hinweis auf die Sektion, die eingeblendet werden soll)
	//   history = false || undefined
	//     (die Bewegung soll gemerkt werden)
	sektionWechseln (sektion, history = true) {
		// History: Position merken
		if (history) {
			hilfe.history("");
		}
		// Suchleiste ggf. schließen
		if (document.getElementById("suchleiste")) {
			suchleiste.ausblenden();
		}
		// Navigation auffrischen
		document.querySelectorAll("nav a.kopf").forEach(function(i) {
			if (i.getAttribute("href") === `#${sektion}`) {
				i.classList.add("aktiv");
			} else {
				i.classList.remove("aktiv");
			}
		});
		// Sektionen ein- bzw. ausblenden
		document.querySelectorAll("section").forEach(function(i) {
			if (i.id === `sektion-${sektion}`) {
				i.classList.remove("aus");
			} else {
				i.classList.add("aus");
			}
		});
		// Überschriftenliste aufbauen
		hilfe.sektionenH(sektion);
		// nach oben scrollen
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: "auto",
		});
		// History: Pfeile auffrischen
		hilfe.historyArrows();
	},
	// Überschriftenliste der aktiven Sektion aufbauen
	//   sektion = String
	//     (die aktive Sektion)
	sektionenH (sektion) {
		// alte Liste entfernen
		let nav = document.querySelector("nav");
		let ul_h = nav.querySelector("ul.h");
		if (ul_h) {
			ul_h.parentNode.removeChild(ul_h);
		}
		// aktive Sektion ermitteln
		let aktiv = nav.querySelector("a.aktiv");
		if (!aktiv) {
			return;
		}
		// neuen Listencontainer erstellen und einhängen
		let ul = document.createElement("ul");
		ul.classList.add("h");
		aktiv.parentNode.appendChild(ul);
		// Listencontainer füllen
		document.querySelectorAll(`section[id="sektion-${sektion}"] h2`).forEach(function(h2) {
			let li = document.createElement("li"),
				a = document.createElement("a");
			a.href = `#${h2.id}`;
			a.innerHTML = h2.innerHTML;
			li.appendChild(a);
			ul.appendChild(li);
			hilfe.naviSprung(a);
		});
	},
	// lange Dateipfade umbrechen
	dateiBreak () {
		document.querySelectorAll(".datei").forEach(function(i) {
			if (i.innerText.length > 30) {
				i.classList.add("long");
			}
		});
	},
	// speichert den Timeout für das Ausblenden des Bildes
	bildTimeout: null,
	// Vorschau-Bild auf Klick vergrößern und über die Seite legen
	//   fig = Element
	//     (das <figure>-Element, auf das geklickt wurde)
	bild (fig) {
		// Rahmen
		let div = document.getElementById("bild"),
			schonAn = true;
		if (!div) {
			div = document.createElement("div");
			document.body.appendChild(div);
			div.id = "bild";
			schonAn = false;
		}
		helfer.keineKinder(div);
		// Content
		let cont = document.createElement("div");
		div.appendChild(cont);
		cont.id = "bild-cont";
		// Bild und Beschreibung einhängen
		let h2 = document.createElement("h2");
		cont.appendChild(h2);
		h2.textContent = fig.querySelector("figcaption").textContent;
		cont.appendChild(fig.querySelector("img").cloneNode());
		// Schließen-Icon
		let schliessen = document.createElement("img");
		cont.appendChild(schliessen);
		schliessen.id = "bild-schliessen";
		schliessen.src = "../img/x-dick-48.svg";
		schliessen.width = "48";
		schliessen.height = "48";
		schliessen.title = "Bild schließen (Esc)";
		schliessen.addEventListener("click", () => hilfe.bildSchliessen());
		// ggf. Icons zum Navigieren durch eine Bilderstrecke
		hilfe.bilder(fig, cont);
		// Einblenden
		if (!schonAn) {
			setTimeout(() => div.classList.add("einblenden"), 0);
		}
	},
	// speichert die <figure>, die dem angezeigten Bild in einer Bilderstrecke
	// vorangeht bzw. folgt
	bilderData: {
		prev: null,
		next: null,
	},
	// ggf. Navigationsbilder für eine Bilderstrecke einbauen
	//   fig = Element
	//     (angeklickte <figure>)
	//   cont = Element
	//     (#bild-cont, also der Container, in dem das Bild groß angezeigt wird)
	bilder (fig, cont) {
		if (!fig.parentNode.classList.contains("bilder")) {
			return;
		}
		// Position ermitteln, an der sich das geöffnete Bild befindet
		let figs = fig.parentNode.querySelectorAll("figure");
		for (let i = 0, len = figs.length; i < len; i++) {
			if (figs[i] === fig) {
				hilfe.bilderData.prev = null;
				hilfe.bilderData.next = null;
				if (i > 0) {
					hilfe.bilderData.prev = figs[i - 1];
				}
				if (i + 1 < figs.length) {
					hilfe.bilderData.next = figs[i + 1];
				}
				break;
			}
		}
		// Navigationsbilder einhängen
		let bilder = ["prev", "next"];
		for (let i = 0; i < 2; i++) {
			let img = document.createElement("img");
			cont.appendChild(img);
			img.id = `bilder-${bilder[i]}`;
			img.width = "48";
			img.height = "48";
			if (hilfe.bilderData[bilder[i]]) {
				img.src = `../img/pfeil-spitz-${bilder[i] === "next" ? "rechts" : "links"}-48.svg`;
				if (i === 0) {
					img.title = "vorheriges Bild (←)";
				} else {
					img.title = "nächstes Bild (→)";
				}
			} else {
				img.src = `../img/pfeil-spitz-${bilder[i] === "next" ? "rechts" : "links"}-grau-48.svg`;
				if (i === 0) {
					img.title = "kein vorheriges Bild";
				} else {
					img.title = "kein nächstes Bild";
				}
			}
			hilfe.bilderNav(img);
		}
	},
	// Navigation durch die Bilder (Klick auf Icon)
	//   img = Element
	//     (Navigationsbild, auf das geklickt wurde)
	bilderNav (img) {
		img.addEventListener("click", function() {
			let dir = this.id.match(/.+-(.+)/)[1];
			if (hilfe.bilderData[dir]) {
				hilfe.bild(hilfe.bilderData[dir]);
			}
		});
	},
	// Navigation durch die Bilder (Cursor)
	//   key = Number
	//     (Tastaturevent: 37 [←] oder 39 [→])
	bilderTastatur (key) {
		if (!document.getElementById("bild")) {
			return;
		}
		let aktionen = {
			37: "prev",
			39: "next",
		};
		let dir = aktionen[key];
		if (hilfe.bilderData[dir]) {
			hilfe.bild(hilfe.bilderData[dir]);
		}
	},
	// schließt das vergrößte Vorschau-Bild
	bildSchliessen () {
		let bild = document.getElementById("bild");
		bild.classList.remove("einblenden");
		clearTimeout(hilfe.bildTimeout);
		hilfe.bildTimeout = setTimeout(() => bild.parentNode.removeChild(bild), 200);
	},
	// Variable, in der der Timeout der Suche gespeichert wird
	sucheTimeout: null,
	// Listener, über den die Suchfunktion angestoßen wird
	//   input = Element
	//     (das Suchfeld)
	sucheListener (input) {
		input.addEventListener("input", function() {
			clearTimeout(hilfe.sucheTimeout);
			hilfe.sucheTimeout = setTimeout(function() {
				hilfe.suche();
			}, 250);
		});
		input.addEventListener("keydown", function(evt) {
			if (evt.which === 13) {
				clearTimeout(hilfe.sucheTimeout);
				hilfe.suche();
			}
		});
		input.addEventListener("focus", function() {
			this.select();
			if (document.getElementById("suchleiste")) {
				suchleiste.ausblenden();
			}
		});
	},
	// Cache der Suchergebnisse
	suchergebnis: {
		val: "", // letzter bereinigter Suchwert
		scroll: 0, // Scrollposition vor dem Wechseln aus der Suchliste
		reg: [], // Liste der regulären Ausdrücke
		treffer: [], // Treffer
	},
	// Dokument durchsuchen
	//   enter = Boolean
	//     (die Suche wurde via Enter angestoßen)
	suche () {
		// Suchtext ermitteln
		let feld = document.getElementById("suchfeld");
		const val = helfer.textTrim(feld.value, true);
		// erst ab 3 Buchstaben suchen
		if (!val || val.length < 3) {
			hilfe.suchergebnis.val = ""; // damit nach dem Löschen des Suchfelds dasselbe Wort wieder gesucht werden kann
			feld.parentNode.classList.remove("lupe");
			return;
		}
		// Wert ist identisch mit der vorherigen Suche => einfach zur Ergebnisseite wechseln
		if (hilfe.suchergebnis.val === val) {
			hilfe.sucheWechseln();
			return;
		}
		// Lupe einblenden
		feld.parentNode.classList.add("lupe");
		// Cache vorbereiten
		hilfe.suchergebnis = {
			val: val,
			scroll: 0,
			reg: [],
			treffer: [],
		};
		let e = hilfe.suchergebnis;
		// reguläre Ausdrücke
		let val_sp = val.split(/\s/);
		for (let i = 0, len = val_sp.length; i < len; i++) {
			let reg = new RegExp(helfer.escapeRegExp(val_sp[i]), "gi");
			e.reg.push(reg);
		}
		// Suche durchführen
		let sek_suche = document.querySelectorAll(".suche");
		for (let i = 0, len = sek_suche.length; i < len; i++) {
			const sektion = sek_suche[i].id.replace(/^sektion-/, "");
			let knoten = sek_suche[i].childNodes;
			for (let j = 0, len = knoten.length; j < len; j++) {
				if (knoten[j].nodeName === "UL" ||
						knoten[j].nodeName === "TABLE") {
					let knoten_tief = knoten[j].childNodes;
					if (knoten[j].nodeName === "TABLE") {
						knoten_tief = knoten[j].querySelectorAll("tr");
					}
					for (let k = 0, len = knoten_tief.length; k < len; k++) {
						durchsuchen(sektion, knoten_tief[k]);
					}
					continue;
				}
				durchsuchen(sektion, knoten[j]);
			}
		}
		// Treffer sortieren
		e.treffer.sort(function(a, b) {
			if (a.gewicht > b.gewicht) {
				return -1;
			} else if (a.gewicht < b.gewicht) {
				return 1;
			}
			return 0;
		});
		// Treffer drucken
		hilfe.sucheDrucken(0);
		// Text durchsuchen, Treffer merken
		function durchsuchen (sektion, knoten) {
			if (knoten.nodeType !== 1) {
				return;
			}
			const text = helfer.textTrim(knoten.innerText, true);
			let gewicht = 0,
				regs = 0, // Anzahl der regulären Ausdrücke, die Treffer produzierten
				idx = -1;
			for (let i = 0, len = e.reg.length; i < len; i++) {
				let s = text.match(e.reg[i]);
				if (s) {
					regs++;
					gewicht += s.length;
					let idx_tmp = text.split(e.reg[i])[0].length;
					if (idx === -1 || idx_tmp < idx) {
						idx = idx_tmp;
					}
				}
			}
			gewicht *= regs;
			if (knoten.nodeName === "H2") { // Treffer in Überschriften vierfach gewichten
				gewicht *= 4;
			}
			// Treffer!
			if (gewicht) {
				// Textausschnitt erzeugen
				let ausschnitt = text.substring(idx - 65, idx - 65 + 150);
				if (idx - 65 > 0) {
					ausschnitt = `…${ausschnitt}`;
				}
				if (idx - 65 + 150 < text.length) {
					ausschnitt = `${ausschnitt}…`;
				}
				// Treffer einhängen
				e.treffer.push({
					text: ausschnitt,
					gewicht: gewicht,
					sektion: sektion,
					knoten: knoten,
				});
			}
		}
	},
	// Suchtreffer ausdrucken
	sucheDrucken (start) {
		// Ergebnisfeld leeren
		let cont = document.getElementById("suchergebnisse");
		// bei der Erstanzeige Ergebnisfeld leeren und in die Sektion wechseln
		if (start === 0) {
			helfer.keineKinder(cont);
			hilfe.sektionWechseln("suche");
		}
		// keine Treffer
		let e = hilfe.suchergebnis;
		if (!e.treffer.length) {
			let p = document.createElement("p");
			p.classList.add("keine-treffer");
			p.textContent = "keine Treffer";
			cont.appendChild(p);
			return;
		}
		// Treffer drucken
		for (let i = start, len = e.treffer.length; i < len; i++) {
			// immer nur 10 Suchergebnisse auf einmal drucken
			if (i === start + 10) {
				let p = document.createElement("p");
				p.dataset.idx = i;
				p.classList.add("mehr-treffer");
				p.textContent = "mehr Treffer";
				hilfe.sucheNachladen(p);
				cont.appendChild(p);
				break;
			}
			// Absatz erzeugen
			let p = document.createElement("p");
			p.dataset.idx = i;
			cont.appendChild(p);
			// Treffernummer drucken
			let b = document.createElement("b");
			b.textContent = i + 1;
			p.appendChild(b);
			// Text erzeugen und einhängen
			let span = document.createElement("span"),
				text = e.treffer[i].text;
			for (let j = 0, len = e.reg.length; j < len; j++) {
				text = text.replace(e.reg[j], function(m) {
					return `<mark class="suche">${m}</mark>`;
				});
			}
			span.innerHTML = text;
			hilfe.sucheSprung(p);
			p.appendChild(span);
		}
	},
	// weitere Treffer laden
	//   p = Element
	//     (der Absatz zum Nachladen der Treffer)
	sucheNachladen (p) {
		p.addEventListener("click", function() {
			const idx = parseInt(this.dataset.idx, 10);
			this.parentNode.removeChild(this);
			hilfe.sucheDrucken(idx);
		});
	},
	// zur Stelle im Text springen, in der der Treffer zu finden ist
	//   p = Element
	//     (Absatz mit der Vorschau des Treffers)
	sucheSprung (p) {
		p.addEventListener("click", function() {
			// Scroll-Position sichern
			hilfe.suchergebnis.scroll = window.scrollY;
			// Sektion wechseln und zum Treffer-Knoten wechseln
			const idx = parseInt(this.dataset.idx, 10),
				sektion = hilfe.suchergebnis.treffer[idx].sektion,
				knoten = hilfe.suchergebnis.treffer[idx].knoten;
			hilfe.sektionWechseln(sektion);
			window.scrollTo({
				left: 0,
				top: knoten.getBoundingClientRect().top - 70 - 10, // -10, um oben immer ein bisschen padding zu haben; vgl. hilfe.naviSprung()
				behavior: "smooth",
			});
			// Treffer-Knoten animieren
			knoten.classList.add("treffer-vor");
			setTimeout(function() {
				knoten.classList.add("treffer", "treffer-nach");
				setTimeout(function() {
					knoten.classList.remove("treffer");
					setTimeout(function() {
						knoten.classList.remove("treffer-vor", "treffer-nach");
					}, 1500);
				}, 1500);
			}, 500);
		});
	},
	// in die Suchsektion wechseln
	sucheWechseln () {
		hilfe.sektionWechseln("suche");
		window.scrollTo({
			left: 0,
			top: hilfe.suchergebnis.scroll,
			behavior: "auto",
		});
	},
	// Daten
	historyData: {
		pos: [], // Positionen in der Liste
		akt: -1, // aktuelle Position in der Liste
		scrollAktiv: false, // speichert, ob gerade gescrollt wird
		scrollInterval: null, // Intervall, der schaut, ob scrollAktiv noch true ist
		scrollCheck: null, // Timeout, der das Ende des Scrollen feststellt und scrollAktiv auf false setzt
	},
	// aktuelle Position merken, wenn über einen Link ein Sprung ausgeführt wird
	//   sek = String
	//     (die derzeit aktive Sektion)
	history (sek) {
		// ggf. die aktive Sektion ermitteln
		if (!sek) {
			sek = hilfe.sektionAktiv();
		}
		// Speicherobjekt erstellen
		let posNeu = {
			scrollY: window.scrollY,
			section: sek,
		};
		// ggf. die History-Daten kürzen;
		let pos = hilfe.historyData.pos,
			akt = hilfe.historyData.akt;
		if (akt < pos.length - 1) {
			pos.splice(akt + 1);
		}
		// identische Einträge nicht aufnehmen, ggf. Misserfolg melden
		if (pos.length &&
				pos[pos.length - 1].scrollY === posNeu.scrollY &&
				pos[pos.length - 1].section === posNeu.section) {
			return false;
		}
		// Daten anhängen
		pos.push(posNeu);
		hilfe.historyData.akt++;
		// Erfolg melden
		return true;
	},
	// zur vorherigen/nächsten Position in der History-Liste springen
	//   next = Boolean
	//     (zur nächsten Position springen)
	historyNavi (next) {
		let pos = hilfe.historyData.pos,
			akt = hilfe.historyData.akt;
		if (next) { // vorwärts
			akt++;
		} else { // rückwärts
			if (pos.length &&
					akt === pos.length - 1 &&
					hilfe.history("")) {
				akt++;
			}
			akt--;
		}
		if (!pos[akt]) {
			return;
		}
		let ziel = pos[akt];
		// Postion in der History auffrischen
		hilfe.historyData.akt = akt;
		// ggf. zur Sektion wechseln
		if (ziel.section !== hilfe.sektionAktiv()) {
			hilfe.sektionWechseln(ziel.section, false);
		}
		// Scroll-Position wiederherstellen
		window.scrollTo({
			left: 0,
			top: ziel.scrollY,
			behavior: "smooth",
		});
		// Pfeile auffrischen (nachdem der Scroll beendet wurde)
		hilfe.historyScrollArrows();
	},
	// frischt die Pfeile auf, sobald der Scroll beendet wurde
	historyScrollArrows () {
		hilfe.historyData.scrollAktiv = true;
		hilfe.historyData.scrollInterval = setInterval(() => {
			if (hilfe.historyData.scrollAktiv) {
				return;
			}
			clearInterval(hilfe.historyData.scrollInterval);
			document.removeEventListener("scroll", hilfe.historyScroll);
			hilfe.historyArrows();
		}, 10);
		document.addEventListener("scroll", hilfe.historyScroll);
	},
	// überprüft, ob der Scroll vorbei ist
	historyScroll () {
		clearTimeout(hilfe.historyData.scrollCheck);
		hilfe.historyData.scrollCheck = setTimeout(() => hilfe.historyData.scrollAktiv = false, 25);
	},
	// Pfeilfarbe anpassen
	historyArrows () {
		let data = hilfe.historyData,
			back = document.getElementById("navi-back"),
			forward = document.getElementById("navi-forward");
		// aktuelle Position
		const section = hilfe.sektionAktiv(),
			scrollY = window.scrollY;
		// rückwärts
		if (data.pos.length > 1 && data.akt > 0 ||
				data.pos.length === 1 && (data.pos[0].section !== section || data.pos[0].scrollY !== scrollY)) {
			back.classList.add("navigierbar");
		} else {
			back.classList.remove("navigierbar");
		}
		// vorwärts
		if (data.akt >=0 && data.akt < data.pos.length - 1) {
			forward.classList.add("navigierbar");
		} else {
			forward.classList.remove("navigierbar");
		}
	},
};
