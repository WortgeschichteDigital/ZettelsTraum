"use strict";

let popup = {
	// speichert die ermittelte Textauswahl
	textauswahl: "",
	// speichert das Element, auf das sich das Event bezieht
	element: null,
	// Popup öffnen
	//   evt = Event-Object
	//     (das Ereignis-Objekt, das beim Rechtsklick erzeugt wird)
	oeffnen (evt) {
		const target = popup.getTarget(evt.path);
		if (!target) {
			return;
		}
		// Menü initialisieren
		const {remote} = require("electron"),
			{Menu} = remote,
			menu = new Menu();
		// Menü füllen
		if (target === "kopieren") {
			popup.menuKopieren(menu);
		} else if (target === "kopieren-code") {
			popup.menuKopierenCode(menu);
		} else if (target === "textfeld") {
			popup.menuBearbeiten(menu);
		} else if (target === "link") {
			popup.menuLink(menu);
		}
		// Menü anzeigen
		menu.popup({
			window: remote.getCurrentWindow(),
		});
	},
	// ermittelt das für den Rechtsklick passende Klickziel
	//   pfad = Array
	//     (speichert den Event-Pfad, also die Elementeliste,
	//     über die das Klick-Event aufgerufen wurde)
	getTarget (pfad) {
		// Textauswahl
		if (window.getSelection().toString() &&
				popup.getTargetSelection(pfad)) {
			return "kopieren";
		}
		// alle Elemente im Pfad durchgehen
		for (let i = 0, len = pfad.length; i < len; i++) {
			// Abbruch, wenn <body> erreicht wurde
			if (pfad[i].nodeName === "BODY") {
				return "";
			}
			// Textfeld
			if (pfad[i].nodeName === "INPUT") {
				return "textfeld";
			}
			// <code> oder <pre>
			if (pfad[i].nodeName === "CODE" ||
					pfad[i].nodeName === "PRE") {
				popup.element = pfad[i];
				return "kopieren-code";
			}
			// Links
			if (/^http/.test(pfad[i].getAttribute("href"))) {
				popup.element = pfad[i];
				return "link";
			}
		}
	},
	// Text der Auswahl ermitteln und entscheiden, ob sie berücksichtigt wird
	//   pfad = Array
	//     (speichert den Event-Pfad, also die Elementeliste, über die das
	//     Klick-Event aufgerufen wurde)
	getTargetSelection (pfad) {
		const sel = window.getSelection();
		let ele = sel.anchorNode;
		while (ele.nodeType !== 1) {
			ele = ele.parentNode;
		}
		if (/^(CODE|PRE)$/.test(ele.nodeName) && ele === pfad[0]) {
			let range = sel.getRangeAt(0),
				container = document.createElement("div");
			container.appendChild(range.cloneContents());
			popup.textauswahl = container.innerText;
			return true;
		}
		return false;
	},
	// Kopieren-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuKopieren (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Textauswahl kopieren",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-kopieren.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.writeText(popup.textauswahl);
			},
		}));
	},
	// Code-Kopie-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuKopierenCode (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Code kopieren",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-kopieren.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.writeText(popup.element.innerText);
			},
		}));
	},
	// Bearbeiten-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBearbeiten (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Rückgängig",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-rueckgaengig.png"),
			role: "undo",
		}));
		menu.append(new MenuItem({
			label: "Wiederherstellen",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-wiederherstellen.png"),
			role: "redo",
		}));
		menu.append(new MenuItem({
			type: "separator"
		}));
		menu.append(new MenuItem({
			label: "Ausschneiden",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-ausschneiden.png"),
			role: "cut",
		}));
		menu.append(new MenuItem({
			label: "Kopieren",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-kopieren.png"),
			role: "copy",
		}));
		menu.append(new MenuItem({
			label: "Einfügen",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-einfuegen.png"),
			role: "paste",
		}));
		menu.append(new MenuItem({
			label: "Alles auswählen",
			icon: path.join(__dirname, "../", "img", "menu", "bearbeiten-auswaehlen.png"),
			role: "selectAll",
		}));
	},
	// Link-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuLink (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Link kopieren",
			icon: path.join(__dirname, "../", "img", "menu", "popup-link.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.writeText(popup.element.getAttribute("href"));
			},
		}));
	},
};
