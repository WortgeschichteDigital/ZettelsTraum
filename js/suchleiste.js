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
			if (winInfo.typ === "changelog") {
				document.querySelector("main").classList.add("padding-suchleiste");
			} else if (/dokumentation|handbuch/.test(winInfo.typ)) {
				document.querySelector("section:not(.aus)").classList.add("padding-suchleiste");
			} else if (winInfo.typ === "index") {
				if (helfer.belegOffen()) { // Karteikarte
					document.getElementById("beleg").classList.add("padding-suchleiste");
				} else { // Belegliste
					document.getElementById("liste-belege-cont").classList.add("padding-suchleiste");
				}
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
		let padding = document.querySelector(".padding-suchleiste");
		if (padding) {
			padding.classList.remove("padding-suchleiste");
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
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
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
	//   neuaufbau = true || undefined
	//     (die Suchergebnisse sollen nur neu aufgebaut werden, sonst nichts)
	suchen (neuaufbau = false) {
		// Suchtext vorhanden?
		let text = document.getElementById("suchleiste-text").value,
			textMitSpitz = helfer.textTrim(text, true);
		text = helfer.textTrim(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), true);
		if (!text) {
			if (neuaufbau) {
				return;
			}
			// ggf. Annotierungs-Popup schließen
			if (winInfo.typ === "index") {
				annotieren.modSchliessen();
			}
			// alte Suche ggf. löschen
			suchleiste.suchenReset();
			// visualisieren, dass damit nichts gefunden werden kann
			suchleiste.suchenKeineTreffer();
			return;
		}
		// Suchtext mit der letzten Suche identisch => eine Position weiterrücken
		if (text === suchleiste.suchenZuletzt && !neuaufbau) {
			suchleiste.navi(true);
			return;
		}
		// ggf. Annotierungs-Popup schließen
		if (winInfo.typ === "index") {
			annotieren.modSchliessen();
		}
		// alte Suche löschen
		suchleiste.suchenReset();
		// Elemente mit Treffer zusammentragen
		let e;
		if (winInfo.typ === "changelog") {
			e = document.querySelectorAll("div > h2, div > h3, div > p, ul li");
		} else if (/dokumentation|handbuch/.test(winInfo.typ)) {
			e = document.querySelectorAll("section:not(.aus) > h2, section:not(.aus) > p, section:not(.aus) #suchergebnisse > p, section:not(.aus) > div p, section:not(.aus) > pre, section:not(.aus) li, section:not(.aus) td, section:not(.aus) th");
		} else if (winInfo.typ === "index") {
			if (helfer.belegOffen()) { // Karteikarte (Leseansicht)
				e = document.querySelectorAll("#beleg th, .beleg-lese td");
			} else { // Belegliste
				e = document.querySelectorAll(".liste-kopf > span, .liste-details");
			}
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
			if (!neuaufbau) {
				suchleiste.suchenKeineTreffer();
			}
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
		if (!neuaufbau) {
			suchleiste.navi(true);
		}
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
			k.innerHTML = k.innerHTML.replace(/<mark[^<]+suchleiste[^<]+>(.+?)<\/mark>/g, ersetzenMark);
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
		// Demonstrationskartei öffnen (Handbuch)
		ele.querySelectorAll(".hilfe-demo").forEach(function(i) {
			i.addEventListener("click", function(evt) {
				evt.preventDefault();
				const {ipcRenderer} = require("electron");
				ipcRenderer.send("hilfe-demo");
			});
		});
		// Handbuch und Dokumentation öffnen (Changelog, Dokumentation, Handbuch)
		ele.querySelectorAll(".link-handbuch, .link-dokumentation").forEach(a => helferWin.oeffne(a));
		// Changelog öffnen (Dokumentation und Handbuch)
		ele.querySelectorAll(".link-changelog").forEach(a => helferWin.oeffneChangelog(a));
		// Fehlerlog öffnen (Changelog, Handbuch)
		ele.querySelectorAll(".link-fehlerlog").forEach(a => helferWin.oeffneFehlerlog(a));
		// interne Sprung-Links (Dokumentation und Handbuch)
		ele.querySelectorAll(`a[href^="#"]`).forEach(function(a) {
			if (typeof hilfe !== "undefined" &&
					/^#[a-z]/.test(a.getAttribute("href"))) {
				hilfe.naviSprung(a);
			}
		});
		// externe Links
		ele.querySelectorAll(`a[href^="http"]`).forEach(a => helfer.externeLinks(a));
		// Kopierlinks in der Belegliste (Hauptfenster)
		if (ele.classList.contains("liste-details")) {
			ele.querySelectorAll(".icon-tools-kopieren").forEach(a => liste.kopieren(a));
		}
		// Einblenden-Funktion gekürzter Absätze (Hauptfenster)
		ele.querySelectorAll(".gekuerzt").forEach(p => liste.abelegAbsatzEinblenden(p));
		// Icon-Tools in der Karteikarte (Hauptfenster)
		if (winInfo.typ === "index" && helfer.belegOffen() && ele.nodeName === "TH") {
			ele.querySelectorAll(`[class*="icon-tools-"]`).forEach(a => beleg.toolsKlick(a));
		}
		// Bedeutungsgerüst wechseln aus der Karteikarte (Hauptfenster)
		ele.querySelectorAll(`[for="beleg-bd"]`).forEach(label => {
			label.addEventListener("click", () => bedeutungenGeruest.oeffnen());
		});
		// Bedeutung-entfernen-Icon in der Karteikarte (Hauptfenster)
		ele.querySelectorAll(".icon-entfernen").forEach(a => beleg.leseBedeutungEx(a));
		// Annotierung (Hauptfenster)
		ele.querySelectorAll("mark.wort, mark.user").forEach(function(i) {
			i.addEventListener("click", function() {
				annotieren.mod(this);
			});
		});
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
			leiste.firstChild.select();
			return;
		}
		leiste.firstChild.select();
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
		// aktives Element vorhanden?
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
		// kein aktives Element vorhanden =>
		// ersten Suchtreffer finden, der der derzeitigen Fensterposition folgt
		if (!aktiv.length) {
			let headerHeight = document.querySelector("body > header").offsetHeight,
				quick = document.getElementById("quick");
			if (quick) { // man ist im Hauptfenster
				if (quick.classList.contains("an")) {
					headerHeight += quick.offsetHeight;
				}
				if (!document.getElementById("beleg").classList.contains("aus")) { // in der Karteikarte
					headerHeight += document.querySelector("#beleg > header").offsetHeight;
				} else { // in der Belegliste
					headerHeight += document.querySelector("#liste-belege > header").offsetHeight;
				}
			}
			for (let i = 0, len = marks.length; i < len; i++) {
				let rect = marks[i].getBoundingClientRect();
				if (rect.top >= headerHeight) {
					pos = i > 0 ? i - 1 : -1;
					break;
				}
			}
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
		if (winInfo.typ === "index") {
			if (helfer.belegOffen()) { // Karteikarte
				const kopf = document.getElementById("beleg").offsetTop,
					header = document.querySelector("#beleg header").offsetHeight;
				if (rect.top < kopf + header ||
						rect.top > window.innerHeight - suchleisteHeight - 24) {
					window.scrollTo({
						left: 0,
						top: window.scrollY + rect.top - kopf - header - 72, // 24px = Höhe Standardzeile
						behavior: "smooth",
					});
				}
			} else { // Belegliste
				const kopf = document.getElementById("liste").offsetTop,
					listenkopf = document.querySelector("#liste-belege header").offsetHeight;
				if (rect.top < kopf + listenkopf ||
						rect.top > window.innerHeight - suchleisteHeight - 24) {
					window.scrollTo({
						left: 0,
						top: window.scrollY + rect.top - kopf - listenkopf - 72, // 24px = Höhe Standardzeile
						behavior: "smooth",
					});
				}
			}
			return;
		}
		if (rect.top < headerHeight ||
				rect.top > window.innerHeight - suchleisteHeight - 24) {
			window.scrollTo({
				left: 0,
				top: window.scrollY + rect.top - headerHeight - 72, // 24px = Höhe Standardzeile
				behavior: "smooth",
			});
		}
	},
	// seitenweises Scrollen
	// (ist die Suchleiste offen, muss ich das übernehmen;
	// wird nur aufgerufen, bei PageUp, PageDown, Space;
	// aber nur, wenn weder Ctrl, noch Alt gedrückt sind)
	//   evt = Object
	//     (das Tastatur-Event-Objekt)
	scrollen (evt) {
		// Ist die Leiste überhaupt an?
		let leiste = document.getElementById("suchleiste");
		if (!leiste || !leiste.classList.contains("an")) {
			return;
		}
		// Space nicht abfangen, wenn Fokus auf <input>, <textarea>, contenteditable
		let aktiv = document.activeElement;
		if (evt.key === " " &&
				(/^(INPUT|TEXTAREA)$/.test(aktiv.nodeName) || aktiv.getAttribute("contenteditable"))) {
			return;
		}
		// die Leiste ist an => ich übernehme das Scrollen vom Browser
		evt.preventDefault();
		// Zielposition berechnen
		const headerHeight = document.querySelector("header").offsetHeight,
			suchleisteHeight = document.getElementById("suchleiste").offsetHeight,
			quick = document.getElementById("quick");
		let indexPlus = 0; // zusätzliche Werte für das Hauptfenster (Fenstertyp "index")
		if (quick) {
			if (quick.classList.contains("an")) {
				indexPlus = quick.offsetHeight;
			}
			if (!document.getElementById("liste").classList.contains("aus")) { // Belegliste
				indexPlus += document.querySelector("#liste-belege header").offsetHeight;
			} else { // Karteikarte
				indexPlus += document.querySelector("#beleg header").offsetHeight;
			}
		}
		let top = 0;
		if (evt.key === "PageUp") { // hoch
			top = window.scrollY - window.innerHeight + headerHeight + suchleisteHeight + indexPlus + 72; // 24px = Höhe Standardzeile
		} else if (/^( |PageDown)$/.test(evt.key)) { // runter
			top = window.scrollY + window.innerHeight - headerHeight - suchleisteHeight - indexPlus - 72; // 24px = Höhe Standardzeile
		}
		// scrollen
		window.scrollTo({
			left: 0,
			top: top,
			behavior: "smooth",
		});
	},
};
