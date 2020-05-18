"use strict";

let tastatur = {
	// Abfangen der Tastatur-Events initialisieren
	//   evt = Object
	//     (Event-Object des keydown)
	init (evt) {
		// Repeats unterbinden
		if (evt.repeat) {
			return;
		}
		// Modifiers ermitteln
		tastatur.detectModifiers(evt);
		// Event weiterleiten
		if (winInfo.typ === "index") {
			tastatur.haupt(evt);
		} else {
			tastatur.neben(evt);
		}
	},
	// Tastatur-Events des Hauptfensters
	//   evt = Object
	//     (Event-Object des keydown)
	haupt (evt) {
		const m = tastatur.modifiers,
			overlayId = overlay.oben();
		// Key "Escape"
		if (!m && evt.key === "Escape") {
			// falls die Suchleiste auf ist und den Fokus hat
			if (document.getElementById("suchleiste") &&
					document.querySelector("#suchleiste:focus-within")) {
				suchleiste.ausblenden();
				return;
			}
			// Dropdown schließen
			if (document.getElementById("dropdown")) {
				dropdown.schliessen();
				return;
			}
			// Konfigurationsdialog in Formvarianten schließen
			if (overlayId === "stamm" &&
					document.getElementById("stamm-popup")) {
				stamm.kopfKonfigSchliessen();
				return;
			}
			// Versionen-Popup in der Literaturdatenbank schließen
			if (overlayId === "red-lit" &&
					document.getElementById("red-lit-popup")) {
				redLit.anzeigePopupSchliessen();
				return;
			}
			// Overlay-Fenster schließen
			if (overlayId) {
				let link = document.querySelector(`#${overlayId} h2 .icon-schliessen`);
				overlay.schliessen(link);
				return;
			}
			// Bedeutung deaktivieren oder Bedeutungsgerüst-Formular schließen
			if (helfer.hauptfunktion === "geruest") {
				if (bedeutungen.moveAktiv) {
					bedeutungen.moveAus();
				} else {
					bedeutungen.schliessen();
				}
				return;
			}
			// Annotierungs-Popup schließen
			if (annotieren.modSchliessen()) {
				return;
			}
			// Karteikarte schließen
			if (helfer.hauptfunktion === "karte") {
				helfer.inputBlur();
				beleg.aktionAbbrechen();
				return;
			}
			return;
		}
		// Key "Tab"
		if ((!m || m === "Shift") && evt.key === "Tab" && helfer.bedeutungenOffen()) {
			bedeutungen.naviTab(evt);
			return;
		}
		// Key "Enter"
		if (!m && evt.key === "Enter" && overlayId === "kopieren-einfuegen") {
			evt.preventDefault();
			speichern.checkInit(() => kopieren.einfuegenAusfuehren());
			return;
		}
		// Key " " || "PageUp" || "PageDown"
		if (!m && /^( |PageDown|PageUp)$/.test(evt.key)) {
			let leiste = document.getElementById("suchleiste");
			if (leiste && leiste.classList.contains("an")) {
				suchleiste.scrollen(evt);
			} else {
				helfer.scrollen(evt);
			}
			return;
		} else if (m === "Ctrl" && /^(PageUp|PageDown)$/.test(evt.key) && helfer.belegOffen()) {
			const next = evt.key === "PageDown" ? true : false;
			beleg.ctrlNavi(next);
			return;
		}
		// Key "F3"
		if ((!m || m === "Shift") && evt.key === "F3") {
			if (!overlayId &&
					(helfer.hauptfunktion === "liste" ||
					helfer.belegOffen() && beleg.leseansicht)) {
				suchleiste.f3(evt);
			}
			return;
		}
		// Key "F5"
		if (!m && evt.key === "F5" && overlayId === "kopieren-einfuegen") {
			kopieren.einfuegenBasisdaten(true);
			return;
		}
		// Key "ArrowDown" || "ArrowLeft" || "ArrowRight" || "ArrowUp"
		if ((!m || m === "Ctrl") && /^(ArrowDown|ArrowLeft|ArrowRight|ArrowUp)$/.test(evt.key)) {
			tastatur.hauptArrows(evt, overlayId);
			return;
		}
		// Key "Delete"
		if (evt.key === "Delete" && helfer.bedeutungenOffen()) {
			bedeutungen.loeschenTastatur();
			return;
		}
		// DRUCKEN: Key "p"
		if (m === "Ctrl" && evt.key === "p") {
			drucken.tastatur();
			return;
		}
		// KARTEIKARTE: Key "i" || "k" || "m" || "t" || "u"
		if (m === "Ctrl" && helfer.belegOffen()) {
			if (evt.key === "i") {
				if (kopieren.an) {
					kopieren.addKarte();
				} else {
					beleg.ctrlZwischenablage(beleg.data);
				}
			} else if (evt.key === "k") {
				beleg.ctrlKuerzen();
			} else if (evt.key === "m") {
				let id = document.activeElement.id;
				if (/^beleg-(bd|bs)$/.test(id)) {
					let a = document.getElementById(id).closest("tr").previousSibling.querySelector(".icon-tools-sonderzeichen");
					a.dispatchEvent(new MouseEvent("click"));
				}
			} else if (evt.key === "t") {
				beleg.ctrlTrennung();
			} else if (evt.key === "u") {
				beleg.leseToggle(true);
			}
			return;
		}
		// LITERATURDATENBANK: Key "f" || "h" || "s"
		if (m === "Ctrl" && overlayId === "red-lit") {
			if (evt.key === "f" && !kartei.wort) {
				filter.suche();
			} else if (evt.key === "h") {
				if (redLit.db.locked) {
					return;
				}
				redLit.dbCheck(() => redLit.eingabeHinzufuegen(), false);
			} else if (evt.key === "s" && !kartei.wort) {
				speichern.kaskade();
			}
			return;
		}
	},
	// alle Events, die mit den Navigationspfeilen zusammenhängen
	//   evt = Object
	//     (Event-Object des keydown)
	//   overlayId = String
	//     (die ID des obersten Overlays; leer, wenn kein Overlay-Fenser offen ist)
	hauptArrows (evt, overlayId) {
		const m = tastatur.modifiers;
		// BEDEUTUNGEN sind aktiv, kein Overlay
		if (helfer.bedeutungenOffen()) {
			if (m === "Ctrl" && /^(ArrowDown|ArrowUp)$/.test(evt.key)) {
				bedeutungen.navi(evt);
				return;
			} else if (!m && bedeutungen.moveAktiv) {
				bedeutungen.move(evt);
				return;
			}
		}
		// KARTEIKARTE ist aktiv, kein Overlay
		if (helfer.belegOffen() && m === "Ctrl" && evt.key === "ArrowDown") {
			beleg.ctrlSpringen(evt);
			return;
		}
		// EINSTELLUNGEN QUICK-CONFIG
		if (m === "Ctrl" &&
				!document.getElementById("einstellungen-sec-menue").classList.contains("aus") &&
				document.querySelector("#quick-config .aktiv")) {
			evt.preventDefault();
			let dir = "";
			switch (evt.key) {
				case "ArrowUp":
					dir = "hoch";
					break;
				case "ArrowRight":
					dir = "rechts";
					break;
				case "ArrowDown":
					dir = "runter";
					break;
				case "ArrowLeft":
					dir = "links";
					break;
			}
			quick.moveConfig(dir);
			return;
		}
		// NAVIGATION HOCH || RUNTER
		if (/^(ArrowDown|ArrowUp)$/.test(evt.key)) {
			if (m === "Ctrl" && overlayId === "einstellungen") {
				evt.preventDefault();
				optionen.naviMenue(evt);
			}
			return;
		}
		// Abbruch, wenn "Ctrl"
		if (m === "Ctrl") {
			return;
		}
		// NAVIGATION LINKS || RECHTS
		let aktiv = document.activeElement;
		// Ist das aktive Element ein Anker oder ein Button?
		if (!(aktiv.nodeName === "A" || aktiv.nodeName === "INPUT" && aktiv.type === "button")) {
			return;
		}
		// Parent-Block ermitteln
		let parent = aktiv.parentNode;
		while (!/^(BODY|DIV|HEADER|P|TD|TH)$/.test(parent.nodeName)) { // BODY nur zur Sicherheit, falls ich in der Zukunft vergesse, die Liste ggf. zu ergänzen
			parent = parent.parentNode;
		}
		// Elemente sammeln und Fokus-Position ermitteln
		let elemente = [],
			regA = /filter-kopf|icon-link|navi-link/;
		if (parent.parentNode.id === "liste-filter") {
			// sonst findet er auch die Icon-Links in der Filterleiste
			regA = /filter-kopf/;
		}
		parent.querySelectorAll(`a, input[type="button"]`).forEach(e => {
			if ( e.nodeName === "INPUT" || e.nodeName === "A" && regA.test(e.getAttribute("class")) ) {
				elemente.push(e);
			}
		});
		if (!elemente.length) {
			return;
		}
		let pos = -1;
		for (let i = 0, len = elemente.length; i < len; i++) {
			if (elemente[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// Position des zu fokussierenden Elements ermitteln
		do {
			if (evt.key === "ArrowLeft" && pos > 0) { // zurück
				pos--;
			} else if (evt.key === "ArrowLeft") { // letzte Position
				pos = elemente.length - 1;
			} else if (evt.key === "ArrowRight" && pos < elemente.length - 1) { // vorwärts
				pos++;
			} else if (evt.key === "ArrowRight") { // 1. Position
				pos = 0;
			}
			// Buttons können versteckt sein, das geschieht aber alles im CSS-Code;
			// hat der Button ein display === "none" ist er versteckt und kann nicht
			// fokussiert werden. Normal ist display === "inline-block".
		} while (getComputedStyle(elemente[pos]).display === "none");
		// Das Element kann fokussiert werden
		elemente[pos].focus();
	},
	// Tastatur-Events der Nebenfenster
	//   evt = Object
	//     (Event-Object des keydown)
	neben (evt) {
		const m = tastatur.modifiers;
		// Key "Escape"
		if (!m && evt.key === "Escape") {
			// falls die Suchleiste auf ist und den Fokus hat
			if (document.getElementById("suchleiste") &&
					document.querySelector("#suchleiste:focus-within")) {
				suchleiste.ausblenden();
				return;
			}
			// falls ein Vorschau-Bild angezeigt wird
			if (document.getElementById("bild")) {
				hilfe.bildSchliessen();
				return;
			}
			// Über-Fenster schließen
			if (!/^(app|electron)$/.test(winInfo.typ)) {
				return;
			}
			const {ipcRenderer} = require("electron");
			ipcRenderer.invoke("fenster-schliessen");
			return;
		}
		// Key " " || "PageUp" || "PageDown" (Changelog, Dokumentation, Handbuch)
		if (/changelog|dokumentation|handbuch/.test(winInfo.typ) &&
				!m && /^( |PageDown|PageUp)$/.test(evt.key)) {
			suchleiste.scrollen(evt);
			return;
		}
		// Key "ArrowDown" || "ArrowUp" (Dokumentation, Handbuch)
		if (/dokumentation|handbuch/.test(winInfo.typ) &&
				m === "Ctrl" && /^(ArrowDown|ArrowUp)$/.test(evt.key)) {
			hilfe.naviMenue(evt);
			return;
		}
		// Key "ArrowLeft" || "ArrowRight (Dokumentation, Handbuch)
		if (/dokumentation|handbuch/.test(winInfo.typ) &&
				m === "Alt" && /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
			const dir = evt.key === "ArrowRight" ? true : false;
			hilfe.historyNavi(dir);
			return;
		}
		// Key "ArrowLeft" || "ArrowRight (Handbuch)
		if (winInfo.typ === "handbuch" &&
				!m && /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
			hilfe.bilderTastatur(evt);
			return;
		}
		// Key "F3" (Changelog, Dokumentation, Handbuch)
		if (/changelog|dokumentation|handbuch/.test(winInfo.typ) &&
				(!m || m === "Shift") && evt.key === "F3") {
			suchleiste.f3(evt);
			return;
		}
		// Key "F5" (Fehlerlog)
		if (winInfo.typ === "fehlerlog" && !m && evt.key === "F5") {
			fehlerlog.reload();
			return;
		}
		// Key "f" (Changelog, Dokumentation, Handbuch)
		if (m === "Ctrl" && evt.key === "f") {
			if (winInfo.typ === "changelog") {
				suchleiste.einblenden();
			} else if (/dokumentation|handbuch/.test(winInfo.typ)) {
				document.getElementById("suchfeld").select();
			}
			return;
		}
		// Key "p" (Bedeutungsgerüst, Changelog, Dokumentation, Handbuch)
		if (m === "Ctrl" && evt.key === "p") {
			if (winInfo.typ === "bedeutungen") {
				bedeutungen.drucken();
			} else if (/changelog|dokumentation|handbuch/.test(winInfo.typ)) {
				print();
			}
			return;
		}
	},
	// Zwischenspeicher für die gedrückten Modifiers
	modifiers: "",
	// ermittelt die gedrückten Modifiers und erstellt einen String
	//   evt = Object
	//     (Event-Object des keydown)
	detectModifiers (evt) {
		let s = [];
		if (evt.altKey) {
			s.push("Alt");
		}
		if (evt.getModifierState("AltGraph")) {
			s.push("AltGr");
		}
		if (evt.getModifierState("CapsLock")) {
			s.push("Caps");
		}
		if (evt.ctrlKey) {
			s.push("Ctrl");
		}
		if (evt.metaKey) {
			if (process.platform === "darwin") {
				// unter macOS ist es besser, wenn die Command-Taste wie Ctrl agiert
				// (in den Electron-Menüs wird dies automatisch so umgesetzt)
				s.push("Ctrl");
			} else {
				s.push("Meta");
			}
		}
		if (evt.shiftKey) {
			s.push("Shift");
		}
		tastatur.modifiers = s.join("+");
	},
	// Beschreibung von Tastaturkürzeln unter macOS anpassen
	shortcutsText () {
		if (process.platform !== "darwin") {
			return;
		}
		let kuerzel = {
			Strg: "⌘",
			Alt: "⌥",
		};
		// <kbd>
		document.querySelectorAll("kbd").forEach(i => {
			if (i.classList.contains("nochange")) {
				return;
			}
			if (i.textContent === "Strg") {
				i.textContent = kuerzel.Strg;
			} else if (i.textContent === "Alt") {
				i.textContent = kuerzel.Alt;
			}
		});
		// title=""
		document.querySelectorAll("[title]").forEach(i => {
			if (/Strg \+/.test(i.title)) {
				i.title = i.title.replace(/Strg \+/, `${kuerzel.Strg} +`);
			}
			if (/Alt \+/.test(i.title)) {
				i.title = i.title.replace(/Alt \+/, `${kuerzel.Alt} +`);
			}
		});
	},
	// auf Anfrage das aktuelle Kürzel zurückgeben
	// (unter macOS muss es geändert werden)
	//   text = String
	//     (das Tastaturkürzel, das ggf. angepasst werden soll)
	shortcutsTextAktuell (text) {
		if (process.platform !== "darwin") {
			return text;
		}
		let kuerzel = {
			Strg: "⌘",
			Alt: "⌥",
		};
		return kuerzel[text];
	},
};
