"use strict";

let popup = {
	// speichert die ermittelte Textauswahl in der Listen-Detailansicht
	textauswahl: {
		text: "",
		html: "",
	},
	// speichert die ID des Belegs, der bearbeitet werden soll
	belegID: "",
	// speichert den Anhang, der geöffnet werden soll
	anhangDatei: "",
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
		} else if (target === "textfeld") {
			popup.menuBearbeiten(menu);
		} else if (target === "quick") {
			popup.menuQuick(menu);
		} else if (target === "wort") {
			popup.menuWort(menu);
		} else if (target === "notizen") {
			popup.menuNotizen(menu);
		} else if (target === "anhaenge") {
			popup.menuAnhaenge(menu);
		} else if (target === "filter") {
			popup.menuFilter(menu);
		} else if (target === "beleg") {
			popup.menuBeleg(menu);
		} else if (target === "anhang") {
			popup.menuAnhang(menu);
		} else if (target === "schliessen") {
			popup.menuSchliessen(menu);
		} else if (target === "belege") {
			popup.menuBelege(menu);
		} else if (target === "kartei") {
			popup.menuKartei(menu);
		}
		// Menü anzeigen
		menu.popup({
			window: remote.getCurrentWindow(),
		});
	},
	// ermittelt das für den Rechtsklick "passendste" Klickziel
	getTarget (pfad) {
		// Textauswahl
		const sel = window.getSelection();
		if ( sel.toString() ) {
			// ermitteln, ob der ausgewählte Text im Listen-Detail-Bereich steht
			let detail = false,
				ele = sel.anchorNode;
			while (ele.nodeName !== "BODY") {
				ele = ele.parentNode;
				if ( ele.classList.contains("liste-details") ) {
					detail = true;
					break;
				}
			}
			// ermitteln, ob sich der Rechtsklick im unmittelbaren Umfeld
			// des ausgewählten Textes ereignete
			let umfeld = false;
			if (detail) {
				let ele = sel.anchorNode;
				while (ele.nodeName !== "DIV") {
					ele = ele.parentNode;
				}
				if ( ele.contains(pfad[0]) ) {
					umfeld = true;
				}
			}
			// Kopie des ausgewählten Texts zwischenspeichern
			if (detail && umfeld) {
				let range = sel.getRangeAt(0),
					container = document.createElement("div");
				container.appendChild(range.cloneContents());
				let text = container.innerHTML.replace(/<\/p><p>/g, "\n");
				text = text.replace(/<.+?>/g, "");
				text = text.replace(/\n/g, "\n\n");
				popup.textauswahl.text = text;
				popup.textauswahl.html = container.innerHTML;
				return "kopieren";
			}
		}
		// alle Elemente im Pfad durchgehen
		for (let i = 0, len = pfad.length; i < len; i++) {
			// Textfelder
			if (pfad[i].nodeName === "INPUT" && /^(date|text)$/.test(pfad[i].type) ||
					pfad[i].nodeName === "TEXTAREA") {
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
			} else if ( id === "liste-belege-anzahl" &&
					pfad[i].classList.contains("belege-gefiltert") ) {
				return "filter";
			}
			// Klassen
			if ( pfad[i].classList) {
				if ( pfad[i].classList.contains("liste-kopf") ) {
					popup.belegID = pfad[i].dataset.id;
					return "beleg";
				} else if ( pfad[i].classList.contains("liste-meta") ) {
					popup.belegID = pfad[i].parentNode.previousSibling.dataset.id;
					return "beleg";
				} else if ( pfad[i].classList.contains("anhaenge-item") ) {
					popup.anhangDatei = pfad[i].dataset.datei;
					return "anhang";
				} else if ( pfad[i].classList.contains("overlay") ) {
					return "schliessen";
				}
			}
		}
		// kein passendes Element gefunden => Ist eine Kartei offen?
		if (kartei.wort) {
			return "belege";
		}
		// keine Kartei offen
		return "kartei";
	},
	// Kopieren-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuKopieren (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Textauswahl kopieren",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-kopieren.png"),
			click: function() {
				const {clipboard} = require("electron");
				clipboard.write({
					text: popup.textauswahl.text,
					html: helfer.clipboardHtml(popup.textauswahl.html),
				});
			},
		}) );
	},
	// Bearbeiten-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBearbeiten (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Rückgängig",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-rueckgaengig.png"),
			role: "undo",
		}) );
		menu.append( new MenuItem({
			label: "Wiederherstellen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-wiederherstellen.png"),
			role: "redo",
		}) );
		menu.append( new MenuItem({
			type: "separator"
		}) );
		menu.append( new MenuItem({
			label: "Ausschneiden",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-ausschneiden.png"),
			role: "cut",
		}) );
		menu.append( new MenuItem({
			label: "Kopieren",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-kopieren.png"),
			role: "copy",
		}) );
		menu.append( new MenuItem({
			label: "Einfügen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-einfuegen.png"),
			role: "paste",
		}) );
		menu.append( new MenuItem({
			label: "Alles auswählen",
			icon: path.join(__dirname, "img", "menu", "bearbeiten-auswaehlen.png"),
			role: "selectAll",
		}) );
	},
	// Quick-Access-Bar-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuQuick (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Quick-Access-Bar konfigurieren",
			icon: path.join(__dirname, "img", "menu", "programm-einstellungen.png"),
			click: function() {
				optionen.oeffnen();
				optionen.sektionWechseln( document.getElementById("einstellungen-link-menue") );
			},
		}) );
	},
	// Wort-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuWort (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Wort ändern",
			icon: path.join(__dirname, "img", "menu", "popup-wort.png"),
			click: () => kartei.wortAendern(),
		}) );
	},
	// Notizen-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuNotizen (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Notizen-Fenster",
			icon: path.join(__dirname, "img", "menu", "kartei-notizen.png"),
			click: () => notizen.oeffnen(),
		}) );
	},
	// Anhänge-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuAnhaenge (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Anhänge-Fenster",
			icon: path.join(__dirname, "img", "menu", "kartei-anhaenge.png"),
			click: () => anhaenge.fenster(),
		}) );
	},
	// Filter-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuFilter (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Filter zurücksetzen",
			icon: path.join(__dirname, "img", "menu", "popup-filter.png"),
			click: () => filter.ctrlReset(true),
		}) );
	},
	// Beleg-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBeleg (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Beleg bearbeiten",
			icon: path.join(__dirname, "img", "menu", "popup-beleg.png"),
			click: function() {
				overlay.alleSchliessen(); // der Beleg kann auch aus einem Overlay-Fenster geöffnet werden
				beleg.oeffnen( parseInt(popup.belegID, 10) );
			},
		}) );
	},
	// Anhang-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuAnhang (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Anhang öffnen",
			icon: path.join(__dirname, "img", "menu", "popup-oeffnen.png"),
			click: () => anhaenge.oeffnen( popup.anhangDatei ),
		}) );
	},
	// Schließen-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuSchliessen (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Fenster schließen",
			icon: path.join(__dirname, "img", "menu", "popup-schliessen.png"),
			click: function() {
				const id_oben = overlay.oben();
				overlay.schliessen( document.getElementById(id_oben) );
			},
		}) );
	},
	// Belege-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuBelege (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Beleg hinzufügen",
			icon: path.join(__dirname, "img", "menu", "belege-hinzufuegen.png"),
			click: () => beleg.erstellenPre(),
			accelerator: "CommandOrControl+N",
		}) );
		menu.append( new MenuItem({
			label: "Belege auflisten",
			icon: path.join(__dirname, "img", "menu", "belege-auflisten.png"),
			click: () => liste.anzeigen(),
			accelerator: "CommandOrControl+L",
		}) );
		menu.append( new MenuItem({
			label: "Belege sortieren",
			icon: path.join(__dirname, "img", "menu", "belege-sortieren.png"),
			click: function() { // TODO
				dialog.oeffnen("alert", null);
				dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
			},
			accelerator: "CommandOrControl+H",
		}) );
	},
	// Kartei-Menü füllen
	//   menu = Object
	//     (Menü-Objekt, an das die Menü-Items gehängt werden müssen)
	menuKartei (menu) {
		const {MenuItem} = require("electron").remote,
			path = require("path");
		menu.append( new MenuItem({
			label: "Kartei erstellen",
			icon: path.join(__dirname, "img", "menu", "kartei-erstellen.png"),
			click: function() {
				kartei.checkSpeichern( () => kartei.wortErfragen() );
			},
			accelerator: "CommandOrControl+E",
		}) );
	},
};
