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
		// Klickziel ermitteln
		const target = popup.getTarget(evt.path);
		if (!target) {
			return;
		}
		// Menü entwerfen
		let items = [];
		if (target === "kopieren") {
			items = ["kopierenNebenfenster"];
		} else if (target === "kopieren-code") {
			items = ["kopierenCode"];
		} else if (target === "textfeld") {
			items = ["bearbeitenRueckgaengig", "bearbeitenWiederherstellen", "sep", "bearbeitenAusschneiden", "bearbeitenKopieren", "bearbeitenEinfuegen", "bearbeitenAlles"];
		} else if (target === "link") {
			items = ["link"];
		} else if (target === "mail") {
			items = ["mail"];
		}
		// Menü vom Main-Prozess erzeugen lassen
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("popup", items);
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
			if (pfad[i].nodeName === "INPUT" ||
					pfad[i].nodeName === "TEXTAREA") {
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
			} else if (/^mailto:/.test(pfad[i].getAttribute("href"))) {
				popup.element = pfad[i];
				return "mail";
			}
		}
	},
	// Text der Auswahl ermitteln und entscheiden, ob sie berücksichtigt wird
	//   pfad = Array
	//     (speichert den Event-Pfad, also die Elementeliste, über die das
	//     Klick-Event aufgerufen wurde)
	getTargetSelection (pfad) {
		let sel = window.getSelection(),
			ele = sel.anchorNode;
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
};
