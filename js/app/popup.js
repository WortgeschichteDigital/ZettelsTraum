"use strict";

let popup = {
	// speichert die ermittelte Textauswahl
	textauswahl: {
		text: "",
		html: "",
		xml: "",
	},
	// speichert die ID des Belegs, der bearbeitet werden soll
	belegID: "",
	// speichert die ID des Overlay-Fenster, das betroffen ist
	overlayID: "",
	// für XML-Kopie: Referenz für das Kopieren eines Belegs
	referenz: {
		obj: {}, // Objekt, in dem die Karteikarte liegt, d.i. beleg.data || data.ka[ID]
		id: "", // die ID der Karteikarte
	},
	// speichert den Anhang, der geöffnet werden soll
	anhangDatei: "",
	// das angeklickte Anhang-Icon steht in der Detailansicht eines Belegs
	anhangDateiBeleg: false,
	// speichert die Datei aus der Liste zu verwendeter Dateien, der gelöscht werden soll
	startDatei: "",
	// speichert den Pfad aus einer Karteiliste (zur Zeit, 2019-10-26, nur Karteisuche)
	karteiPfad: "",
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
			let selInBeleg = popup.selInBeleg();
			if (selInBeleg) {
				items.push("markieren");
			}
			items.push({name: "text", sub: ["kopieren", "textReferenz"]});
			if (selInBeleg) {
				items.push({name: "xml", sub: ["xmlBeleg", "xmlReferenz"]});
			} else if (/^(karte|liste)$/.test(helfer.hauptfunktion)) {
				items.push({name: "xml", sub: ["xmlReferenz"]});
			}
			if (overlay.oben() === "drucken") {
				items.push("sep", "schliessen", "sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			} else if (helfer.hauptfunktion === "karte") {
				items.push("sep", "karteikarteConf", "sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			} else if (helfer.hauptfunktion === "liste") {
				items.push("sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf", "sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			} else {
				items.push("sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			}
		} else if (target === "textfeld") {
			items = ["bearbeitenRueckgaengig", "bearbeitenWiederherstellen", "sep", "bearbeitenAusschneiden", "bearbeitenKopieren", "bearbeitenEinfuegen", "bearbeitenAlles"];
		} else if (target === "quick") {
			items = ["quickConf"];
			if (kartei.wort) {
				items.push("sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			} else {
				items.push("sep", "karteiErstellen");
			}
		} else if (target === "wort") {
			items = ["wort", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "erinnerungen") {
			items = ["erinnerungen", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "notizen") {
			items = ["notizen", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "lexika") {
			items = ["lexika", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "kopierfunktion") {
			items = ["kopierfunktion", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "notizen-conf") {
			items = ["notizen", "sep", "notizenConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "filter-conf") {
			items = ["filterConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "filter-reset") {
			items = ["filterReset", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "start-datei") {
			items = ["karteiEntfernen", "sep", "ordner", "sep", "karteiErstellen"];
		} else if (target === "link") {
			if (overlay.oben() === "stamm") {
				items.push("link", "sep", "schliessen");
			} else if (helfer.hauptfunktion === "karte") {
				items.push("link", "sep", {name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "karteikarteConf");
			} else if (helfer.hauptfunktion === "liste") {
				items.push("link", "sep", {name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf");
			} else {
				items.push("link");
			}
			items.push("sep", "belegHinzufuegen");
			popup.belegeAuflisten(items);
		} else if (target === "beleg") {
			items = ["belegBearbeiten", "sep", "schliessen", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "beleg-einstellungen") {
			items = ["beleglisteConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "beleg-moddel") {
			items = [{name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "anhang") {
			items = ["anhang", "ordnerAnhang"];
			if (helfer.hauptfunktion === "karte") {
				items.push("sep", {name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "karteikarteConf");
			} else if (popup.anhangDateiBeleg) {
				items.push("sep", {name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf");
			} else if (overlay.oben() === "anhaenge") {
				items.push("sep", "schliessen");
			}
			items.push("sep", "belegHinzufuegen");
			popup.belegeAuflisten(items);
		} else if (target === "schliessen") {
			items = ["schliessen"];
			if (popup.overlayID === "notizen") {
				items.push("sep", "notizenConf");
			} else if (popup.overlayID === "tagger" ||
					popup.overlayID === "gerueste" ||
					popup.overlayID === "geruestwechseln") {
				items.push("sep", "bedeutungenConf");
			} else if (popup.overlayID === "ctrlC") {
				items.push("sep", "kopierenConf");
			}
			if (kartei.wort) {
				items.push("sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			}
		} else if (target === "kartei-pfad") {
			items = ["ordnerKartei", "sep", "schliessen"];
			if (kartei.wort) {
				items.push("sep", "belegHinzufuegen");
				popup.belegeAuflisten(items);
			}
		} else if (target === "beleg-conf") {
			popup.referenz.data = beleg.data;
			popup.referenz.id = "" + beleg.id_karte;
			items = [{name: "text", sub: ["textReferenz"]}, {name: "xml", sub: ["xmlReferenz"]}, "sep", "karteikarteConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "bedeutungen-conf") {
			items = ["bedeutungenConf", "sep", "belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "belege") {
			items = ["belegHinzufuegen"];
			popup.belegeAuflisten(items);
		} else if (target === "kartei") {
			items = ["karteiErstellen"];
		}
		// Menü vom Main-Prozess erzeugen lassen
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("popup", items);
	},
	// ermittelt das für den Rechtsklick "passendste" Klickziel
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
			// Textfelder:
			//   - <input type="date|text"> + nicht readonly
			//   - <textarea>
			//   - Edit-Feld
			if (pfad[i].nodeName === "INPUT" &&
					/^(date|text)$/.test(pfad[i].type) &&
					pfad[i].getAttribute("readonly") === null ||
					pfad[i].nodeName === "TEXTAREA" ||
					pfad[i].nodeType === 1 &&
					pfad[i].getAttribute("contenteditable")) {
				return "textfeld";
			}
			// Überschriften
			if (pfad[i].nodeName === "A" &&
					!pfad[i].classList.contains("icon-link") &&
					overlay.oben() === "kopieren-liste") {
				popup.belegID = pfad[i].dataset.id;
				return "beleg";
			} else if (pfad[i].nodeName === "H3" &&
					overlay.oben() === "anhaenge") {
				popup.belegID = pfad[i].dataset.id;
				return "beleg";
			} else if (pfad[i].nodeName === "HEADER" &&
					pfad[i].parentNode.id === "liste-belege") {
				return "beleg-einstellungen";
			} else if (pfad[i].nodeName === "IMG" &&
					pfad[i].dataset.datei) {
				popup.anhangDatei = pfad[i].dataset.datei;
				if (pfad[i].closest(".liste-meta")) {
					popup.anhangDateiBeleg = true;
					const id = pfad[i].closest(".liste-details").previousSibling.dataset.id;
					popup.referenz.data = data.ka[id];
					popup.referenz.id = id;
				} else {
					popup.anhangDateiBeleg = false;
					if (helfer.hauptfunktion === "karte") {
						popup.referenz.data = beleg.data;
						popup.referenz.id = "" + beleg.id_karte;
					}
				}
				return "anhang";
			}
			// IDs
			const id = pfad[i].id;
			if (id === "fensterladen") {
				return "";
			} else if (id === "quick") {
				return "quick";
			} else if (id === "wort" && kartei.wort) {
				return "wort";
			} else if (id === "erinnerungen-icon") {
				return "erinnerungen";
			} else if (id === "notizen-icon") {
				return "notizen";
			} else if (id === "lexika-icon") {
				return "lexika";
			} else if (id === "kopieren") {
				return "kopierfunktion";
			} else if (id === "filter-notizen-content" || id === "filter-kopf-notizen") {
				return "notizen-conf";
			} else if (id === "liste-filter") {
				return "filter-conf";
			} else if (id === "liste-belege-anzahl" &&
					pfad[i].classList.contains("belege-gefiltert")) {
				return "filter-reset";
			}
			// Klassen
			if (pfad[i].classList) {
				if (pfad[i].classList.contains("start-datei")) {
					popup.startDatei = pfad[i].dataset.datei;
					return "start-datei";
				} else if (pfad[i].classList.contains("link")) {
					popup.element = pfad[i];
					if (helfer.hauptfunktion === "karte") {
						popup.referenz.data = beleg.data;
						popup.referenz.id = "" + beleg.id_karte;
					} else if (helfer.hauptfunktion === "liste") {
						const id = pfad[i].closest(".liste-details").previousSibling.dataset.id;
						popup.referenz.data = data.ka[id];
						popup.referenz.id = id;
					}
					return "link";
				} else if (pfad[i].classList.contains("liste-kopf")) {
					popup.belegID = pfad[i].dataset.id;
					popup.referenz.data = data.ka[popup.belegID];
					popup.referenz.id = popup.belegID;
					return "beleg-moddel";
				} else if (pfad[i].classList.contains("liste-details")) {
					popup.belegID = pfad[i].previousSibling.dataset.id;
					popup.referenz.data = data.ka[popup.belegID];
					popup.referenz.id = popup.belegID;
					return "beleg-moddel";
				} else if (pfad[i].classList.contains("anhaenge-item")) {
					popup.anhangDatei = pfad[i].dataset.datei;
					popup.anhangDateiBeleg = false;
					return "anhang";
				} else if (pfad[i].classList.contains("overlay")) {
					popup.overlayID = pfad[i].id;
					return "schliessen";
				}
			}
			// Datasets
			if (pfad[i].dataset && pfad[i].dataset.pfad) {
				popup.karteiPfad = pfad[i].dataset.pfad;
				return "kartei-pfad";
			}
			// IDs untergeordnet
			// (müssen nach "Klassen" überprüft werden)
			if (id === "beleg") {
				return "beleg-conf";
			} else if (id === "bedeutungen") {
				return "bedeutungen-conf";
			}
		}
		// kein passendes Element gefunden => Ist eine Kartei offen?
		if (kartei.wort) {
			return "belege";
		}
		// keine Kartei offen
		return "kartei";
	},
	// Text der Auswahl ermitteln und entscheiden, ob sie berücksichtigt wird
	// (diese Funktion wird nicht nur für Rechtsklicks verwendet, sondern
	// auch für Kopier-Icons!)
	//   pfad = Array
	//     (speichert den Event-Pfad, also die Elementeliste, über die das
	//     Klick-Event aufgerufen wurde; wird die Funktion über ein Kopier-Icon
	//     aufgerufen, steht nur ein Element in dem Array)
	getTargetSelection (pfad) {
		// ermitteln, ob der ausgewählte Text in einem Bereicht steht,
		// der berücksichtigt werden soll ("liste-details" oder "beleg-lese")
		let sel = window.getSelection(),
			bereich = false,
			ele = sel.anchorNode,
			bs = false, // true, wenn die Textauswahl innerhalb des Belegs ist
			obj = {};
		let container = {
			umfeld: "",
			id: "",
		};
		while (ele.nodeName !== "BODY") {
			ele = ele.parentNode;
			if (ele.classList.contains("liste-details")) {
				container.umfeld = "DIV";
				bereich = true;
				// feststellen, ob der markierte Text Teil des Belegtexts ist
				let div = sel.anchorNode;
				while (div.nodeName !== "DIV") {
					div = div.parentNode;
				}
				if (div.classList.contains("liste-bs")) {
					bs = true;
				}
				const id = div.parentNode.previousSibling.dataset.id;
				obj = data.ka[id];
				popup.referenz.data = data.ka[id]; // für xml.referenz();
				popup.referenz.id = id;
				break;
			} else if (ele.classList.contains("beleg-lese")) {
				container.umfeld = "TD";
				bereich = true;
				// feststellen, ob der markierte Text Teil des Belegtexts ist
				if (ele.querySelector("td").id === "beleg-lese-bs") {
					bs = true;
					obj = beleg.data;
				}
				popup.referenz.data = beleg.data; // für xml.referenz();
				popup.referenz.id = "" + beleg.id_karte;
				break;
			} else if (ele.id === "drucken-cont-rahmen") {
				container.umfeld = "DIV";
				container.id = "drucken-cont-rahmen";
				bereich = true;
			}
		}
		// ermitteln, ob sich der Rechtsklick im unmittelbaren Umfeld
		// des ausgewählten Textes ereignete
		let umfeld = false;
		if (bereich) {
			let ele = sel.anchorNode;
			while (!(ele.nodeName === container.umfeld && (!container.id || ele.id === container.id))) {
				ele = ele.parentNode;
			}
			if (ele.contains(pfad[0])) {
				umfeld = true;
			}
		}
		// Kopie des ausgewählten Texts ermitteln und zwischenspeichern;
		// Kopieranweisung geben
		if (bereich && umfeld) {
			let range = sel.getRangeAt(0),
				container = document.createElement("div");
			container.appendChild(range.cloneContents());
			// Text aufbereiten
			let text = container.innerHTML.replace(/<\/p><p>/g, "\n");
			text = text.replace(/<.+?>/g, "");
			text = text.replace(/\n/g, "\n\n");
			// HTML aufbereiten
			let html = "",
				xml = "";
			if (container.firstChild.nodeType === 1 &&
					container.firstChild.nodeName === "P") {
				html = container.innerHTML;
			} else {
				html = `<p>${container.innerHTML}</p>`;
			}
			xml = html;
			if (optionen.data.einstellungen["textkopie-wort"] &&
					!container.querySelector(".wort")) {
				html = liste.belegWortHervorheben(html, true);
			}
			html = helfer.clipboardHtml(html);
			if (!container.querySelector(".wort")) {
				xml = liste.belegWortHervorheben(xml, true);
			}
			xml = helfer.clipboardXml(xml);
			if (bs) {
				text = beleg.toolsKopierenAddQuelle(text, false, obj);
				html = beleg.toolsKopierenAddQuelle(html, true, obj);
			}
			popup.textauswahl.text = helfer.escapeHtml(text, true);
			popup.textauswahl.html = html;
			popup.textauswahl.xml = xml;
			return true;
		}
		// keine Kopieranweisung geben
		return false;
	},
	// ermittelt, ob eine Selection innerhalb des Belegtextes ist (Belegliste oder Leseansicht)
	selInBeleg () {
		let sel = window.getSelection(),
			anchor = sel.anchorNode;
		while (!(anchor.nodeName === "DIV" || anchor.nodeName === "TD")) {
			anchor = anchor.parentNode;
		}
		if (anchor.classList.contains("liste-bs") ||
				anchor.id === "beleg-lese-bs") {
			return true;
		}
		return false;
	},
	// Befehl "Belege auflisten" ggf. zu den Items hinzufügen
	belegeAuflisten (items) {
		if (overlay.oben() ||
				helfer.hauptfunktion !== "liste") {
			items.push("belegeAuflisten");
		}
	},
};
