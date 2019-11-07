"use strict";

const {BrowserWindow, Menu, MenuItem} = require("electron"),
	path = require("path");

// Liste der verfügbaren Menüpunkte
let punkte = {
	anhang: {
		label: "Anhang öffnen",
		icon: "oeffnen.png",
		click: "anhaenge.oeffnen(popup.anhangDatei)",
	},
	bearbeitenRueckgaengig: {
		label: "Rückgängig",
		icon: "pfeil-rund-links.png",
		role: "undo",
	},
	bearbeitenWiederherstellen: {
		label: "Wiederherstellen",
		icon: "pfeil-rund-rechts.png",
		role: "redo",
	},
	bearbeitenAusschneiden: {
		label: "Ausschneiden",
		icon: "schere.png",
		role: "cut",
	},
	bearbeitenKopieren: {
		label: "Kopieren",
		icon: "kopieren.png",
		role: "copy",
	},
	bearbeitenEinfuegen: {
		label: "Einfügen",
		icon: "einfuegen.png",
		role: "paste",
	},
	bearbeitenAlles: {
		label: "Alles auswählen",
		icon: "auswaehlen.png",
		role: "selectAll",
	},
	bedeutungenConf: {
		label: "Bedeutungsgerüst-Einstellungen",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-bedeutungsgeruest"));
		`,
	},
	belegBearbeiten: {
		label: "Beleg bearbeiten",
		icon: "karteikarte.png",
		click: `
			overlay.alleSchliessen();
			beleg.oeffnen(parseInt(popup.belegID, 10));
		`,
	},
	belegDuplizieren: {
		label: "Beleg duplizieren",
		icon: "duplizieren.png",
		click: "kopieren.einfuegenEinlesen([kopieren.datenBeleg(data.ka[popup.belegID])], true)",
	},
	belegHinzufuegen: {
		label: "Beleg hinzufügen",
		icon: "dokument-plus.png",
		click: "speichern.checkInit(() => beleg.erstellen())",
		accelerator: "CommandOrControl+N",
	},
	belegLoeschen: {
		label: "Beleg löschen",
		icon: "muelleimer.png",
		click: "beleg.aktionLoeschenFrage(popup.belegID)",
	},
	belegZwischenablage: {
		label: "Beleg in Zwischenablage kopieren",
		icon: "einfuegen-pfeil.png",
		click: "beleg.ctrlZwischenablage(data.ka[popup.belegID])",
	},
	belegeAuflisten: {
		label: "Belege auflisten",
		icon: "liste-bullets.png",
		click: "speichern.checkInit(() => liste.wechseln())",
		accelerator: "CommandOrControl+L",
	},
	beleglisteConf: {
		label: "Belegliste-Einstellungen",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-belegliste"));
		`,
	},
	erinnerungen: {
		label: "Erinnerungen",
		icon: "kreis-info.png",
		click: "erinnerungen.show()",
	},
	filterConf: {
		label: "Filter-Einstellungen",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-filterleiste"));
		`,
	},
	filterReset: {
		label: "Filter zurücksetzen",
		icon: "pfeil-kreis.png",
		click: "filter.ctrlReset(true)",
	},
	karteiEntfernen: {
		label: "Aus Liste entfernen",
		icon: "muelleimer.png",
		click: "zuletzt.karteiEntfernen(popup.startDatei)",
	},
	karteiErstellen: {
		label: "Kartei erstellen",
		icon: "dokument-plus.png",
		click: "kartei.wortErfragen()",
		accelerator: "CommandOrControl+E",
	},
	karteikarteConf: {
		label: "Karteikarten-Einstellungen",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-karteikarte"));
		`,
	},
	kopieren: {
		label: "Textauswahl kopieren",
		icon: "kopieren.png",
		click: `
			helfer.toClipboard({
				text: popup.textauswahl.text,
				html: popup.textauswahl.html,
			});
			helfer.animation("zwischenablage");
		`,
	},
	kopierenNebenfenster: {
		label: "Textauswahl kopieren",
		icon: "kopieren.png",
		click: `
			helfer.toClipboard({
				text: popup.textauswahl,
			});
		`,
	},
	kopierenCode: {
		label: "Code kopieren",
		icon: "kopieren.png",
		click: `
			helfer.toClipboard({
				text: popup.element.innerText,
			});
		`,
	},
	kopierfunktion: {
		label: "Kopierfunktion beenden",
		icon: "ausgang.png",
		click: "kopieren.uiOff()",
	},
	lexika: {
		label: "Lexika-Fenster",
		icon: "buecher.png",
		click: "lexika.oeffnen()",
	},
	link: {
		label: "Link kopieren",
		icon: "link.png",
		click: `
			helfer.toClipboard({
				text: popup.element.getAttribute("href"),
			});
		`,
	},
	mail: {
		label: "Adresse kopieren",
		icon: "brief.png",
		click: `
			helfer.toClipboard({
				text: popup.element.getAttribute("href").replace(/^mailto:/, ""),
			});
		`,
	},
	markieren: {
		label: "Textauswahl markieren",
		icon: "text-markiert.png",
		click: "annotieren.makeUser()",
	},
	notizen: {
		label: "Notizen-Fenster",
		icon: "stift.png",
		click: "notizen.oeffnen()",
	},
	notizenConf: {
		label: "Notizen-Einstellungen",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-notizen"));
		`,
	},
	ordner: {
		label: "Ordner öffnen",
		icon: "ordner.png",
		click: "helfer.ordnerOeffnen(popup.startDatei)",
	},
	ordnerAnhang: {
		label: "Ordner öffnen",
		icon: "ordner.png",
		click: "anhaenge.oeffnen(popup.anhangDatei, true)",
	},
	ordnerKartei: {
		label: "Ordner öffnen",
		icon: "ordner.png",
		click: "helfer.ordnerOeffnen(popup.karteiPfad)",
	},
	quickConf: {
		label: "Quick-Access-Bar konfigurieren",
		icon: "zahnrad.png",
		click: `
			optionen.oeffnen();
			optionen.sektionWechseln(document.getElementById("einstellungen-link-menue"));
		`,
	},
	schliessen: {
		label: "Fenster schließen",
		icon: "x-dick.png",
		click: "overlay.schliessen(document.getElementById(overlay.oben()))",
		accelerator: "Esc",
	},
	wort: {
		label: "Wort ändern",
		icon: "text-pfeil-kreis.png",
		click: "kartei.wortAendern()",
	},
};

module.exports = {
	// Rechtsklickmenü erzeugen
	make (contents, items) {
		// Menü erzeugen
		let menu = new Menu();
		for (let i of items) {
			// Separator
			if (i === "sep") {
				menu.append(module.exports.makeSep());
				continue;
			}
			// Menüpunkt
			let args = {...punkte[i]};
			args.contents = contents;
			menu.append(module.exports.makeItem(args));
		}
		// Menü anzeigen
		menu.popup({
			window: BrowserWindow.fromWebContents(contents),
		});
	},
	// Menüpunkt erzeugen
	//   contents = Object
	//     (webContents des Fensters, in dem das Menü erscheint)
	//   label = String
	//     (Name des Menüpunkts)
	//   icon = String
	//     (Name der PNG-Datei)
	//   click = String
	//     (Funktionen, die auf Klick ausgeführt werden sollen)
	//   accelerator = String || undefined
	//     (Tastaturkürzel, das eine informative Funktion hat)
	makeItem ({contents, label, icon, click = "", accelerator = "", role = ""}) {
		let opt = {
			label: label,
			icon: path.join(__dirname, "../", "../", "img", "menu", icon),
		};
		if (click) {
			opt.click = () => contents.executeJavaScript(click);
		}
		if (accelerator) {
			opt.accelerator = accelerator;
		}
		if (role) {
			opt.role = role;
		}
		return new MenuItem(opt);
	},
	// Separator erzeugen
	makeSep () {
		return new MenuItem({
			type: "separator",
		});
	},
};