"use strict";

let suchleiste = {
	// Leiste einblenden
	einblenden () {
		// Leiste ggf. erzeugen
		if (!document.getElementById("suchleiste")) {
			suchleiste.make();
		}
		// Leiste einblenden und fokussieren
		setTimeout(function() {
			// ohne Timeout kommt nach dem Erzeugen der Leiste keine Animation
			let leiste = document.getElementById("suchleiste");
			leiste.classList.add("an");
			leiste.firstChild.select();
			if (fenstertyp === "changelog") {
				document.querySelector("main").classList.add("padding-suchleiste");
			} else if (/dokumentation|handbuch/.test(fenstertyp)) {
				document.querySelector("section:not(.aus)").classList.add("padding-suchleiste");
			}
		}, 1);
	},
	// Listener für das Ausblenden via Link
	//   a = Element
	//     (der Schließen-Link in der Suchleiste)
	ausblendenListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			suchleiste.ausblenden();
		});
	},
	// Leiste ausblenden
	ausblenden () {
		suchleiste.suchenReset();
		let leiste = document.getElementById("suchleiste");
		leiste.firstChild.blur();
		leiste.firstChild.value = "";
		leiste.classList.remove("an");
		if (fenstertyp === "changelog") {
			document.querySelector("main").classList.remove("padding-suchleiste");
		} else if (/dokumentation|handbuch/.test(fenstertyp)) {
			document.querySelector("section:not(.aus)").classList.remove("padding-suchleiste");
		}
	},
	// HTML der Suchleiste aufbauen
	make () {
		let div = document.createElement("div");
		document.querySelector("body").appendChild(div);
		div.id = "suchleiste";
		// Text-Input
		let input = document.createElement("input");
		div.appendChild(input);
		input.placeholder = "Suchtext";
		input.type = "text";
		input.value = "";
		input.id = "suchleiste-text";
		suchleiste.suchenListener(input);
		// Pfeile
		let pfeile = [
			{
				typ: "hoch",
				text: "vorherigen",
				short: "Shift + F3",
			},
			{
				typ: "runter",
				text: "nächsten",
				short: "F3",
			},
		];
		for (let pfeil of pfeile) {
			let a = document.createElement("a");
			div.appendChild(a);
			a.classList.add("icon-link", `icon-${pfeil.typ}`);
			a.href = "#";
			a.id = `suchleiste-${pfeil.typ}`;
			a.textContent = " ";
			a.title = `zum ${pfeil.text} Treffer (${pfeil.short})`;
			suchleiste.naviListener(a);
		}
		// genaue Schreibung
		input = document.createElement("input");
		div.appendChild(input);
		input.type = "checkbox";
		input.id = "suchleiste-genaue";
		input.addEventListener("change", function() {
			suchleiste.suchenZuletzt = "";
		});
		let label = document.createElement("label");
		div.appendChild(label);
		label.setAttribute("for", "suchleiste-genaue");
		label.textContent = "genaue Schreibung";
		// Schließen
		let a = document.createElement("a");
		div.appendChild(a);
		a.classList.add("icon-link", "icon-schliessen");
		a.href = "#";
		a.id = "suchleiste-schliessen";
		a.textContent = " ";
		a.title = "Suchleiste schließen (Esc)";
		suchleiste.ausblendenListener(a);
	},
	// Listener für das Suchfeld
	//   input = Element
	//     (der Text-Input der Suchleiste)
	suchenListener (input) {
		input.addEventListener("keydown", function(evt) {
			if (evt.which === 13) {
				suchleiste.suchen();
			}
		});
		input.addEventListener("focus", function() {
			this.select();
		});
	},
	// Zwischenspeicher für den Text der letzten erfolgreichen Suche
	suchenZuletzt: "",
	// Suche starten
	suchen () {
		// Suchtext vorhanden?
		let text = document.getElementById("suchleiste-text").value,
			textMitSpitz = helfer.textTrim(text, true);
		text = helfer.textTrim(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), true);
		if (!text) {
			// alte Suche ggf. löschen
			suchleiste.suchenReset();
			// visualisieren, dass damit nichts gefunden werden kann
			suchleiste.suchenKeineTreffer();
			return;
		}
		// Suchtext mit der letzten Suche identisch => eine Position weiterrücken
		if (text === suchleiste.suchenZuletzt) {
			suchleiste.navi(true);
			return;
		}
		// alte Suche löschen
		suchleiste.suchenReset();
		// Elemente mit Treffer zusammentragen
		let e;
		if (fenstertyp === "changelog") {
			e = document.querySelectorAll("div > h2, div > h3, div > p, ul li");
		} else if (/dokumentation|handbuch/.test(fenstertyp)) {
			e = document.querySelectorAll("section:not(.aus) > h2, section:not(.aus) > p, section:not(.aus) #suchergebnisse > p, section:not(.aus) > pre, section:not(.aus) li, section:not(.aus) td, section:not(.aus) th");
		}
		let genaue = document.getElementById("suchleiste-genaue").checked ? "" : "i",
			reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textMitSpitz)).replace(/\s/g, "\\s"), genaue),
			treffer = new Set();
		for (let i of e) {
			if (reg.test(i.innerText)) {
				treffer.add(i);
			}
		}
		// Treffer?
		if (!treffer.size) {
			suchleiste.suchenKeineTreffer();
			return;
		}
		suchleiste.suchenZuletzt = text;
		// komplizierten RegExp erstellen
		let textKomplex = helfer.escapeRegExp(text.charAt(0));
		for (let i = 1, len = text.length; i < len; i++) {
			textKomplex += "(<[^>]+>)*";
			textKomplex += helfer.escapeRegExp(text.charAt(i));
		}
		textKomplex = helfer.formVariSonderzeichen(textKomplex).replace(/\s/g, "(&nbsp;|\\s)");
		let regKomplex = new RegExp(textKomplex, "g" + genaue);
		// Text hervorheben
		for (let t of treffer) {
			t.innerHTML = helfer.suchtrefferBereinigen(t.innerHTML.replace(regKomplex, setzenMark), "suchleiste");
			suchleiste.suchenEventsWiederherstellen(t);
		}
		// zum ersten Treffer springen
		suchleiste.navi(true);
		// Ersetzungsfunktion
		// (ein bisschen komplizierter, um illegales Nesting zu vermeiden und
		// die Suchtreffer schön aneinanderzuhängen, sodass sie wie ein Element aussehen)
		function setzenMark (m) {
			if (/<.+?>/.test(m)) {
				m = m.replace(/<.+?>/g, function(m) {
					return `</mark>${m}<mark class="suchleiste">`;
				});
			}
			// leere <mark> entfernen (kann passieren, wenn Tags verschachtelt sind)
			m = m.replace(/<mark class="suchleiste"><\/mark>/g, "");
			// Rückgabewert zusammenbauen
			m = `<mark class="suchleiste">${m}</mark>`;
			// alle <mark> ermitteln, die weder Anfang noch Ende sind
			const marks = m.match(/class="suchleiste"/g).length;
			if (marks > 1) { // marks === 1 => der einzige <mark>-Tag ist Anfang und Ende zugleich
				let splitted = m.split(/class="suchleiste"/);
				m = "";
				for (let i = 0, len = splitted.length; i < len; i++) {
					if (i === 0) {
						m += splitted[i] + `class="suchleiste suchleiste-kein-ende"`;
					} else if (i === len - 2) {
						m += splitted[i] + `class="suchleiste suchleiste-kein-start"`;
					} else if (i < len - 1) {
						m += splitted[i] + `class="suchleiste suchleiste-kein-start suchleiste-kein-ende"`;
					} else {
						m += splitted[i];
					}
				}
			}
			// aufbereiteten Match auswerfen
			return m;
		}
	},
	// alte Suche zurücksetzen
	suchenReset () {
		// zuletzt gesuchten Text zurücksetzen
		suchleiste.suchenZuletzt = "";
		// alte Suchtreffer entfernen
		let knoten = new Set();
		document.querySelectorAll(".suchleiste").forEach(function(i) {
			knoten.add(i.parentNode);
		});
		for (let k of knoten) {
			k.innerHTML = k.innerHTML.replace(/<mark.+?suchleiste.+?>(.+?)<\/mark>/g, ersetzenMark);
			suchleiste.suchenEventsWiederherstellen(k);
		}
		function ersetzenMark (m, p1) {
			return p1;
		}
	},
	// nach dem Ändern des HTML Events wieder einhängen
	//   ele = Element
	//     (HTML-Element, in dem HTML geändert wurde;
	//     hier sollen Events ggf. wiederhergestellt werden)
	suchenEventsWiederherstellen (ele) {
		// Über App öffnen (Changelog, Dokumentation und Handbuch)
		ele.querySelectorAll(".ueber-app").forEach(function(i) {
			i.addEventListener("click", function(evt) {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-app");
			});
		});
		// Über Electron öffnen (Changelog, Dokumentation und Handbuch)
		ele.querySelectorAll(".ueber-electron").forEach(function(i) {
			i.addEventListener("click", function(evt) {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("ueber-electron");
			});
		});
		// Handbuch öffnen (Changelog, Dokumentation)
		ele.querySelectorAll(".link-handbuch").forEach(a => helferWin.oeffneHandbuch(a));
		// Handbuch öffnen (Changelog, Handbuch)
		ele.querySelectorAll(".link-dokumentation").forEach(a => helferWin.oeffneDokumentation(a));
		// Changelog öffnen (Dokumentation und Handbuch)
		ele.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
		// interne Sprung-Links (Dokumentation und Handbuch)
		ele.querySelectorAll(`a[href^="#"]`).forEach(function(a) {
			if (/^#[a-z]/.test(a.getAttribute("href"))) {
				hilfe.naviSprung(a);
			}
		});
		// externe Links
		ele.querySelectorAll(`a[href^="http"]`).forEach(a => helfer.externeLinks(a));
	},
	// Zwischenspeicher für den Timeout
	suchenKeineTrefferTimeout: null,
	// visualisieren, dass es keine Treffer gab
	suchenKeineTreffer () {
		let input = document.getElementById("suchleiste-text");
		input.classList.add("keine-treffer");
		clearTimeout(suchleiste.suchenKeineTrefferTimeout);
		suchleiste.suchenKeineTrefferTimeout = setTimeout(function() {
			input.classList.remove("keine-treffer");
		}, 1000);
	},
	// Verhalten beim Drücken von F3 steuern
	//   evt = Object
	//     (das Event-Objekt)
	f3 (evt) {
		let leiste = document.getElementById("suchleiste");
		if (!leiste || !leiste.classList.contains("an")) {
			suchleiste.einblenden();
			return;
		} else if (!document.querySelector(".suchleiste")) {
			suchleiste.suchenKeineTreffer();
			return;
		}
		let next = true;
		if (evt.shiftKey) {
			next = false;
		}
		suchleiste.navi(next);
	},
	// Listener für die Navigationslinks
	//   a = Element
	//     (der Navigationslink)
	naviListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let next = true;
			if (/-hoch$/.test(this.id))  {
				next = false;
			}
			suchleiste.navi(next);
		});
	},
	// Navigation durch die Suchergebnisse
	//   next = Boolean
	//     (zum nächsten Treffer springen)
	navi (next) {
		let marks = document.querySelectorAll(".suchleiste");
		// Navigation mit Pfeilen ggf. abfangen
		if (!marks.length) {
			suchleiste.suchenKeineTreffer();
			return;
		}
		// aktives Element?
		let pos = -1,
			aktiv = document.querySelectorAll(".suchleiste-aktiv");
		if (aktiv.length) {
			for (let i = 0, len = marks.length; i < len; i++) {
				if (marks[i] === aktiv[0]) {
					pos = i;
					break;
				}
			}
			// die Position muss korrigiert werden, wenn mehr als ein Element aktiv ist;
			// ist nur ein Element aktiv, bleibt die Position mit dieser Formel identisch
			pos += aktiv.length - 1;
		}
		// Position bestimmen
		if (next) {
			pos++;
			if (pos > marks.length - 1) {
				pos = 0;
				helfer.animation("wrap");
			}
		} else {
			pos--;
			if (pos < 0) {
				pos = marks.length - 1;
				helfer.animation("wrap");
			}
		}
		// aktive(s) Element(e) hervorheben
		// (wird über Tag-Grenzen hinweg gesucht, können mehrere Elemente am Stück aktiv sein)
		if (aktiv.length) {
			document.querySelectorAll(".suchleiste-aktiv").forEach(function(i) {
				i.classList.remove("suchleiste-aktiv");
			});
		}
		marks[pos].classList.add("suchleiste-aktiv");
		// ggf. direkt anhängende Elemente auch noch hervorheben
		if (marks[pos].classList.contains("suchleiste-kein-ende")) {
			for (let i = pos + 1, len = marks.length; i < len; i++) {
				let m = marks[i];
				if (m.classList.contains("suchleiste-kein-start") &&
						!m.classList.contains("suchleiste-kein-ende")) {
					m.classList.add("suchleiste-aktiv");
					break;
				}
				m.classList.add("suchleiste-aktiv");
			}
		}
		// zum aktiven Element springen
		const headerHeight = document.querySelector("header").offsetHeight,
			suchleisteHeight = document.getElementById("suchleiste").offsetHeight;
		let rect = marks[pos].getBoundingClientRect();
		if (rect.top < headerHeight ||
				rect.top > window.innerHeight - suchleisteHeight - 24) {
			window.scrollTo(0, window.scrollY + rect.top - headerHeight - 72); // 24px = Höhe Standardzeile
		}
	},
	// seitenweises Scrollen
	// (ist die Suchleiste offen, muss ich das übernehmen;
	// wird nur aufgerufen, bei PageUp, PageDown, Space;
	// aber nur, wenn weder Ctrl, noch Alt gedrückt sind)
	//   evt = Object
	//     (das Event-Objekt)
	scrollen (evt) {
		// Ist die Leiste überhaupt an?
		let leiste = document.getElementById("suchleiste");
		if (!leiste || !leiste.classList.contains("an")) {
			return;
		}
		// Fokus im Suchfeld?
		if (evt.which === 32 &&
				/^suchleiste-(text|genaue)$/.test(document.activeElement.id)) {
			return;
		}
		// die Leiste ist an => ich übernehme das Scrollen vom Browser
		evt.preventDefault();
		// Zielposition berechnen
		const headerHeight = document.querySelector("header").offsetHeight,
			suchleisteHeight = document.getElementById("suchleiste").offsetHeight;
		let top = 0;
		if (evt.which === 33) { // hoch (PageUp)
			top = window.scrollY - window.innerHeight + headerHeight + suchleisteHeight + 72; // 24px = Höhe Standardzeile
		} else if (evt.which === 32 || evt.which === 34) { // runter (Space, PageDown)
			top = window.scrollY + window.innerHeight - headerHeight - suchleisteHeight - 72;
		}
		// scrollen
		window.scrollTo({
			left: 0,
			top: top,
			behavior: "smooth",
		});
	},
};
