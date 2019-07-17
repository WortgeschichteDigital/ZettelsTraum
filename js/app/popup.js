"use strict";

let popup = {
	// speichert die ermittelte Textauswahl
	textauswahl: {
		text: "",
		html: "",
	},
	// speichert die ID des Belegs, der bearbeitet werden soll
	belegID: "",
	// speichert den Anhang, der geöffnet werden soll
	anhangDatei: "",
	// speichert die Datei aus der Liste zu verwendeter Dateien, der gelöscht werden soll
	startDatei: "",
	// speichert das Element, auf das sich das Event bezieht
	element: null,
	// Popup öffnen
	//   evt = Event-Object
	//     (das Ereignis-Objekt, das beim Rechtsklick erzeugt wird)
	oeffnen (evt) {
		const {remote} = require("electron"),
			{Menu} = remote,
			menu = new Menu(),
			target = popup.getTarget(evt.path);
		// Menü füllen
		if (target === "kopieren") {
			popup.menuKopieren(menu);
			if (overlay.oben() === "drucken") {
				popup.menuSchliessen(menu, true);
			} else {
				popup.menuBelege(menu, true);
			}
		} else if (target === "textfeld") {
			popup.menuBearbeiten(menu);
		} else if (target === "quick") {
			popup.menuQuick(menu);
			popup.menuBelege(menu, true);
		} else if (target === "wort") {
			popup.menuWort(menu);
			popup.menuBelege(menu, true);
		} else if (target === "notizen") {
			popup.menuNotizen(menu);
			popup.menuBelege(menu, true);
		} else if (target === "anhaenge") {
			popup.menuAnhaenge(menu);
			popup.menuBelege(menu, true);
		} else if (target === "filter-conf") {
			popup.menuFilterConf(menu);
			popup.menuBelege(menu, true);
		} else if (target === "filter-reset") {
			popup.menuFilterReset(menu);
			popup.menuBelege(menu, true);
		} else if (target === "start-datei") {
			popup.menuStartDatei(menu);
		} else if (target === "link") {
			popup.menuLink(menu);
			popup.menuBelege(menu, true);
		} else if (target === "beleg") {
			popup.menuBeleg(menu);
			popup.menuBelege(menu, true);
		} else if (target === "beleg-moddel") {
			popup.menuBeleg(menu);
			popup.menuBelegDel(menu);
			popup.menuBeleglisteConf(menu);
			popup.menuBelege(menu, true);
		} else if (target === "anhang") {
			popup.menuAnhang(menu);
			if (!overlay.oben()) { // nicht im Anhänge-Fenster
				popup.menuBelege(menu, true);
			}
		} else if (target === "schliessen") {
			popup.menuSchliessen(menu, false);
		} else if (target === "beleg-conf") {
			popup.menuBelegConf(menu);
			popup.menuBelege(menu, true);
		} else if (target === "bedeutungen-conf") {
			popup.menuBedeutungenConf(menu);
			popup.menuBelege(menu, true);
		} else if (target === "belege") {
			popup.menuBelege(menu, false);
		} else if (target === "kartei") {
			popup.menuKartei(menu);
		}
		// Menü anzeigen
		menu.popup({
			window: remote.getCurrentWindow(),
		});
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
			if (pfad[i].nodeName === "H3" &&
					overlay.oben() === "anhaenge") {
				popup.belegID = pfad[i].dataset.id;
				return "beleg";
			}
			// IDs
			const id = pfad[i].id;
			if (id === "quick") {
				return "quick";
			} else if (id === "wort" && kartei.wort) {
				return "wort";
			} else if (id === "notizen-icon") {
				return "notizen";
			} else if (id === "kartei-anhaenge") {
				return "anhaenge";
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
					return "link";
				} else if (pfad[i].classList.contains("liste-kopf")) {
					popup.belegID = pfad[i].dataset.id;
					return "beleg-moddel";
				} else if (pfad[i].classList.contains("liste-meta")) {
					popup.belegID = pfad[i].parentNode.previousSibling.dataset.id;
					return "beleg";
				} else if (pfad[i].classList.contains("anhaenge-item")) {
					popup.anhangDatei = pfad[i].dataset.datei;
					return "anhang";
				} else if (pfad[i].classList.contains("overlay")) {
					return "schliessen";
				}
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
		const sel = window.getSelection();
		let bereich = false,
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
				break;
			} else if (ele.classList.contains("beleg-lese")) {
				container.umfeld = "TD";
				bereich = true;
				// feststellen, ob der markierte Text Teil des Belegtexts ist
				if (ele.querySelector("td").id === "beleg-lese-bs") {
					bs = true;
					obj = beleg.data;
				}
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
			let html = container.innerHTML;
			if (optionen.data.einstellungen["textkopie-wort"] &&
					!/class="wort"/.test(html)) {
				html = liste.belegWortHervorheben(html, true);
			}
			html = helfer.clipboardHtml(html);
			if (bs) {
				text = beleg.toolsKopierenAddQuelle(text, false, obj);
				html = beleg.toolsKopierenAddQuelle(html, true, obj);
			}
			popup.textauswahl.text = text;
			popup.textauswahl.html = html;
			return true;
		}
		// keine Kopieranweisung geben
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
			icon: path.join(__dirname, "img", "menu", "bearbeiten-kopieren.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.write({
					text: popup.textauswahl.text,
					html: popup.textauswahl.html,
				});
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
			icon: path.join(__dirname, "img", "menu", "bearbeiten-rueckgaengig.png"),
			role: "undo",
		}));
		menu.append(new MenuItem({
			label: "Wiederherstellen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-wiederherstellen.png"),
			role: "redo",
		}));
		menu.append(new MenuItem({
			type: "separator"
		}));
		menu.append(new MenuItem({
			label: "Ausschneiden",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-ausschneiden.png"),
			role: "cut",
		}));
		menu.append(new MenuItem({
			label: "Kopieren",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-kopieren.png"),
			role: "copy",
		}));
		menu.append(new MenuItem({
			label: "Einfügen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-einfuegen.png"),
			role: "paste",
		}));
		menu.append(new MenuItem({
			label: "Alles auswählen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-auswaehlen.png"),
			role: "selectAll",
		}));
	},
	// Quick-Access-Bar-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuQuick (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Quick-Access-Bar konfigurieren",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln(document.getElementById("einstellungen-link-menue"));
			},
		}));
	},
	// Wort-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuWort (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Wort ändern",
			icon: path.join(__dirname, "img", "menu", "popup-wort.png"),
			click: () => kartei.wortAendern(),
		}));
	},
	// Notizen-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuNotizen (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Notizen-Fenster",
			icon: path.join(__dirname, "img", "menu", "kartei-notizen.png"),
			click: () => notizen.oeffnen(),
		}));
	},
	// Anhänge-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuAnhaenge (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Anhänge-Fenster",
			icon: path.join(__dirname, "img", "menu", "kartei-anhaenge.png"),
			click: () => anhaenge.fenster(),
		}));
	},
	// Filter-Conf-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuFilterConf (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Filter-Einstellungen",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln(document.getElementById("einstellungen-link-filter"));
			},
		}));
	},
	// Filter-Reset-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuFilterReset (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Filter zurücksetzen",
			icon: path.join(__dirname, "img", "menu", "popup-filter.png"),
			click: () => filter.ctrlReset(true),
		}));
	},
	// Start-Datei-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuStartDatei (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Aus Liste entfernen",
			icon: path.join(__dirname, "img", "menu", "popup-loeschen.png"),
			click: () => start.dateiEntfernen(popup.startDatei),
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
			icon: path.join(__dirname, "img", "menu", "popup-link.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.writeText(popup.element.title);
			},
		}));
	},
	// Beleg-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBeleg (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Beleg bearbeiten",
			icon: path.join(__dirname, "img", "menu", "popup-beleg.png"),
			click: function() {
				overlay.alleSchliessen(); // der Beleg kann auch aus einem Overlay-Fenster geöffnet werden
				beleg.oeffnen(parseInt(popup.belegID, 10));
			},
		}));
	},
	// BelegDel-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBelegDel (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Beleg löschen",
			icon: path.join(__dirname, "img", "menu", "popup-loeschen.png"),
			click: () => beleg.aktionLoeschenFrage(popup.belegID),
		}));
	},
	// Belegliste-Conf-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBeleglisteConf (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			type: "separator",
		}));
		menu.append(new MenuItem({
			label: "Belegliste-Einstellungen",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln(document.getElementById("einstellungen-link-belegliste"));
			},
		}));
	},
	// Anhang-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuAnhang (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Anhang öffnen",
			icon: path.join(__dirname, "img", "menu", "popup-oeffnen.png"),
			click: () => anhaenge.oeffnen(popup.anhangDatei),
		}));
	},
	// Schließen-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	//   separator = Boolean
	//     (Separator einfügen)
	menuSchliessen (menu, separator) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		if (separator) {
			menu.append(new MenuItem({
				type: "separator",
			}));
		}
		menu.append(new MenuItem({
			label: "Fenster schließen",
			icon: path.join(__dirname, "img", "menu", "popup-schliessen.png"),
			click: function() {
				const id_oben = overlay.oben();
				overlay.schliessen(document.getElementById(id_oben));
			},
			accelerator: "Esc",
		}));
	},
	// Beleg-Conf-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBelegConf (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Karteikarten-Einstellungen",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln(document.getElementById("einstellungen-link-karteikarte"));
			},
		}));
	},
	// Bedeutungen-Conf-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBedeutungenConf (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Bedeutungsgerüst-Einstellungen",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln(document.getElementById("einstellungen-link-bedeutungen"));
			},
		}));
	},
	// Belege-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	//   separator = Boolean
	//     (Separator einfügen)
	menuBelege (menu, separator) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		if (separator) {
			menu.append(new MenuItem({
				type: "separator",
			}));
		}
		menu.append(new MenuItem({
			label: "Beleg hinzufügen",
			icon: path.join(__dirname, "img", "menu", "belege-hinzufuegen.png"),
			click: () => beleg.erstellenPre(),
			accelerator: "CommandOrControl+N",
		}));
		menu.append(new MenuItem({
			label: "Belege auflisten",
			icon: path.join(__dirname, "img", "menu", "belege-auflisten.png"),
			click: () => liste.anzeigen(),
			accelerator: "CommandOrControl+L",
		}));
		menu.append(new MenuItem({
			label: "Belege sortieren",
			icon: path.join(__dirname, "img", "menu", "belege-sortieren.png"),
			click: function() { // TODO
				dialog.oeffnen("alert");
				dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
			},
			accelerator: "CommandOrControl+H",
		}));
	},
	// Kartei-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuKartei (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append(new MenuItem({
			label: "Kartei erstellen",
			icon: path.join(__dirname, "img", "menu", "kartei-erstellen.png"),
			click: function() {
				kartei.wortErfragen();
			},
			accelerator: "CommandOrControl+E",
		}));
	},
};
