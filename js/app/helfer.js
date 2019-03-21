"use strict";

let helfer = {
	// Klicks in der der Quick-Access-Bar verteilen
	//   a = Element
	//     (Link in der Quick-Access-Bar);
	quickAccess (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let id = this.id.replace(/^quick-/, "");
			if (id === "programm-einstellungen") {
				optionen.oeffnen();
				return;
			} else if (id === "programm-beenden") {
				const {app} = require("electron").remote;
				app.quit();
				return;
			} else if (id === "kartei-erstellen") {
				kartei.checkSpeichern( () => kartei.wortErfragen() );
				return;
			} else if (id === "kartei-oeffnen") {
				kartei.checkSpeichern(() => kartei.oeffnen() );
				return;
			}
			// Ist eine Kartei geöffnet?
			if (!kartei.wort) {
				dialog.oeffnen("alert", null);
				dialog.text(`Die Funktion <i>${this.title}</i> steht nur zur Verfügung, wenn eine Kartei offen ist.`);
				return;
			}
			// diese Funktionen stehen nur bei einer geöffneten Kartei zur Verfügung
			if (id === "kartei-speichern") {
				kartei.speichern(false);
			} else if (id === "kartei-speichern-unter") {
				kartei.speichern(true);
			} else if (id === "kartei-schliessen") {
				kartei.checkSpeichern( () => kartei.schliessen() );
			} else if (id === "kartei-formvarianten") {
				stamm.oeffnen();
			} else if (id === "kartei-notizen") {
				notizen.oeffnen();
			} else if (id === "kartei-anhaenge") {
				anhaenge.fenster();
			} else if (id === "kartei-lexika") {
				lexika.oeffnen();
			} else if (id === "kartei-metadaten") {
				meta.oeffnen();
			} else if (id === "kartei-bedeutungen") { // TODO
				dialog.oeffnen("alert", null);
				dialog.text("Sorry!\nDiese Funktion ist noch nicht programmiert.");
			} else if (id === "kartei-suche") {
				filter.suche();
			} else if (id === "belege-hinzufuegen") {
				beleg.erstellenPre();
			} else if (id === "belege-auflisten") {
				liste.anzeigen();
			}
		});
	},
	// übergebene Sektion einblenden, alle andere Sektionen ausblenden
	//   sektion = String
	//     (ID der einzublendenden Sektion)
	sektion_aktiv: "",
	sektion_document_scroll: 0,
	sektionWechseln (sektion) {
		// Scroll-Status der Liste speichern oder wiederherstellen
		if (helfer.sektion_aktiv === "liste") {
			helfer.sektion_document_scroll = window.scrollY;
		}
		helfer.sektion_aktiv = sektion;
		// Sektion umschalten
		let sektionen = document.querySelectorAll("body > section");
		for (let i = 0, len = sektionen.length; i < len; i++) {
			if (sektionen[i].id === sektion) {
				sektionen[i].classList.remove("aus");
			} else {
				sektionen[i].classList.add("aus");
			}
		}
		// Scroll-Status wiederherstellen od. nach oben scrollen
		if (sektion === "liste") {
			window.scrollTo(0, helfer.sektion_document_scroll);
		} else {
			window.scrollTo(0, 0);
		}
	},
	// eleminiert alle childNodes des übergebenen Objekts
	//   obj = Element
	//     (dieses Element soll von all seinen Kindern befreit werden)
	keineKinder (obj) {
		while ( obj.hasChildNodes() ) {
			obj.removeChild(obj.lastChild);
		}
	},
	// ermöglicht die Navigation mit dem Cursor durch Buttons und Links
	//   evt = Event-Objekt
	//     (wird von helfer.tastatur() übergeben)
	cursor (evt) {
		// Cursor hoch od. runter
		if (evt.which === 38 || evt.which === 40) {
			if (overlay.oben() === "einstellungen") { // durch die Menüs in den Einstellungen navigieren
				evt.preventDefault();
				optionen.naviMenue(evt.which);
			}
			return;
		}
		// Curosr links od. rechts
		let aktiv = document.activeElement;
		// Ist das aktive Element ein Anker oder ein Button?
		if ( !(aktiv.nodeName === "A" || aktiv.nodeName === "INPUT" && aktiv.type === "button") ) {
			return;
		}
		// Parent-Block ermitteln
		let parent = aktiv.parentNode;
		while ( !parent.nodeName.match(/^(BODY|DIV|HEADER|P|TD|TH)$/) ) { // BODY nur zur Sicherheit, falls ich in der Zukunft vergesse die Liste ggf. zu ergänzen
			parent = parent.parentNode;
		}
		// Elemente sammeln und Fokus-Position ermitteln
		let elemente = parent.querySelectorAll(`a, input[type="button"]`),
			pos = -1;
		for (let i = 0, len = elemente.length; i < len; i++) {
			if (elemente[i] === aktiv) {
				pos = i;
				break;
			}
		}
		// Position des zu fokussierenden Elements ermitteln
		do {
			if (evt.which === 37 && pos > 0) { // zurück
				pos--;
			} else if (evt.which === 37) { // letzte Position
				pos = elemente.length - 1;
			} else if (evt.which === 39 && pos < elemente.length - 1) { // vorwärts
				pos++;
			} else if (evt.which === 39) { // 1. Position
				pos = 0;
			}
			// Buttons können versteckt sein, das geschieht aber alles im CSS-Code;
			// hat der Button ein display === "none" ist er versteckt und kann nicht
			// fokussiert werden. Normal ist display === "inline-block".
		} while (getComputedStyle(elemente[pos]).display === "none");
		// Das Element kann fokussiert werden
		elemente[pos].focus();
	},
	// Fokus aus Formularfeldern entfernen
	inputBlur () {
		let aktiv = document.activeElement;
		if (aktiv.type === "text" || aktiv.nodeName === "TEXTAREA") {
			aktiv.blur();
		}
	},
	// mehrzeilige Textfelder automatisch an die Größe des Inhalts anpassen
	// (größer als die angegeene max-height werden sie dabei nie)
	//   textarea = Element
	//     (Textfeld, dessen Eingaben hier abgefangen werden)
	textareaGrow (textarea) {
		textarea.style.height = "inherit";
		textarea.style.height = `${textarea.scrollHeight - 4}px`; // padding = 4px, zählt zum scrollHeight dazu
	},
	// Bereinigt Text, der in Textfeldern eingegeben wurde
	//   text = String
	//     (der Text, der bereinigt werden soll)
	//   doppelleer = Boolean
	//     (sollen doppelte Leerzeichen bereinigt werden; das ist nicht in jedem Feld sinnvoll)
	textTrim (text, doppelleer) {
		text = text.trim();
		if (doppelleer) {
			text = text.replace(/ {2,}/g, " ");
		}
		return text;
	},
	// Strings für alphanumerische Sortierung aufbereiten
	//   s = String
	//     (String, der aufbereitet werden soll)
	sortAlphaPrepCache: {},
	sortAlphaPrep (s) {
		if (helfer.sortAlphaPrepCache[s]) {
			return helfer.sortAlphaPrepCache[s];
		}
		let prep = s.toLowerCase().replace(/ä|ö|ü|ß/g, function (m) {
			switch (m) {
				case "ä":
					return "ae";
				case "ö":
					return "oe";
				case "ü":
					return "ue";
				case "ß":
					return "ss";
			}
		});
		helfer.sortAlphaPrepCache[s] = prep;
		return prep;
	},
	// ein übergebenes Datum formatiert ausgeben
	//   datum = String
	//     (im ISO 8601-Format)
	datumFormat (datum) {
		let wochentage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
			monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
		let d = new Date(datum);
		return `${wochentage[d.getDay()]}, ${d.getDate()}. ${monate[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()} Uhr`;
	},
	// überprüft den Typ des übergebenen Objekts zuverlässig
	// mögliche Rückgabewerte: Arguments, Array, Boolean, Date, Error, Function, JSON, Math, Number, Object, RegExp, String
	//   typ = String
	//     (Typ, auf den das übergebene Objekt überprüft werden soll)
	//   obj = Object
	//     (das Objekt, das auf den übergebenen Typ überprüft wird)
	checkType (typ, obj) {
		let cl = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && cl === typ;
	},
	// Tokens mit spezieller Bedeutung für reguläre Ausdrücke escapen
	//   string = String
	//     (Text, der escaped werden soll)
	escapeRegExp (string) {
		return string.replace(/\/|\(|\)|\[|\]|\{|\}|\.|\?|\\|\+|\*|\^|\$|\|/g, (m) => `\\${m}`);
	},
	// regulären Ausdruck mit allen Formvarianten erstellen
	formVariRegExp () {
		let varianten = [];
		data.fv.forEach(function(i) {
			varianten.push( helfer.escapeRegExp(i.va) );
		});
		return varianten.join("|");
	},
	// Tastatur-Events abfangen und verarbeiten
	//   evt = Event-Objekt
	tastatur (evt) {
		// Esc
		if (evt.which === 27) {
			// Popup schließen
			if ( document.getElementById("popup") ) {
				popup.schliessen();
				return;
			}
			// Overlay-Fenster schließen
			let overlay_oben_id = overlay.oben();
			if (overlay_oben_id) {
				let link = document.querySelector(`#${overlay_oben_id} a`);
				overlay.schliessen(link);
				return;
			}
			// Belegfenster schließen
			let formular = document.getElementById("beleg");
			if ( !formular.classList.contains("aus") ) {
				helfer.inputBlur();
				beleg.aktionAbbrechen();
			}
		}
		// Cursor links (←), hoch (↑), rechts (→), runter (↓)
		if (evt.which >= 37 && evt.which <= 40) {
			helfer.cursor(evt);
		}
	},
};
