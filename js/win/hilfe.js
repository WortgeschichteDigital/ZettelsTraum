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
		let sektion = links[pos].classList.item(0).replace(/^link-sektion-/, "");
		hilfe.sektionWechseln(sektion);
	},
	// korrigiert den Sprung nach Klick auf einen internen Link,
	// sodass er nicht hinter dem Header verschwindet
	naviSprung (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// aktive Sektion ermitteln
			let sek = document.querySelectorAll("section"),
				sek_aktiv = "";
			for (let i = 0, len = sek.length; i < len; i++) {
				if (!sek[i].classList.contains("aus")) {
					sek_aktiv = sek[i].id.replace(/^sektion-/, "");
					break;
				}
			}
			// Sprungziel ermitteln und ggf. die Sektion wechseln
			const id = this.getAttribute("href").replace(/^#/, "");
			let h2 = document.getElementById(id);
			if (!new RegExp(`^${sek_aktiv}`).test(id)) {
				const sek_ziel = id.replace(/^(.+?)-.+/, function(m, p1) {
					return p1;
				});
				hilfe.sektionWechseln(sek_ziel);
			}
			// Fenster an die korrekte Position scrollen
			window.scrollTo({
				left: 0,
				top: h2.offsetTop - 70 - 16, // -16, um oben immer ein bisschen padding zu haben; vgl. hilfe.sucheSprung()
				behavior: "smooth",
			});
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
	// Klick-Event zum Wechseln der Sektion
	//   a = Element
	//     (Link zur gewünschten Sektion)
	sektion (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			const sektion = this.classList.item(0).replace(/^link-sektion-/, "");
			hilfe.sektionWechseln(sektion);
			this.blur();
		});
	},
	// Sektion wechseln
	//   sektion = String
	//     (Hinweis auf die Sektion, die eingeblendet werden soll)
	sektionWechseln (sektion) {
		// Suchleiste ggf. schließen
		if (document.getElementById("suchleiste")) {
			suchleiste.ausblenden();
		}
		// Navigation auffrischen
		document.querySelectorAll("nav a.kopf").forEach(function(i) {
			if (i.classList.contains(`link-sektion-${sektion}`)) {
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
	},
	// Überschriftenliste der aktiven Sektion aufbauen
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
			a.classList.add("intern");
			a.href = `#${h2.id}`;
			a.innerHTML = h2.innerHTML;
			li.appendChild(a);
			ul.appendChild(li);
			hilfe.naviSprung(a);
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
		cont.addEventListener("click", () => hilfe.bildSchliessen());
		// Bild und Beschreibung einhängen
		let h2 = document.createElement("h2");
		cont.appendChild(h2);
		h2.textContent = fig.querySelector("figcaption").textContent;
		cont.appendChild(fig.querySelector("img").cloneNode());
		// Schließen-Icon
		let schliessen = document.createElement("img");
		cont.appendChild(schliessen);
		schliessen.id = "bild-schliessen";
		schliessen.src = "../img/schliessen-gross.svg";
		schliessen.width = "48";
		schliessen.height = "48";
		schliessen.title = "Bild schließen (Esc)";
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
				img.src = `../img/bilder-${bilder[i]}.svg`;
				if (i === 0) {
					img.title = "vorheriges Bild (←)";
				} else {
					img.title = "nächstes Bild (→)";
				}
			} else {
				img.src = `../img/bilder-${bilder[i]}-hell.svg`;
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
		img.addEventListener("click", function(evt) {
			evt.stopPropagation();
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
};
