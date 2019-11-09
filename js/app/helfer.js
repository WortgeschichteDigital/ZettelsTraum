"use strict";

let helfer = {
	// das Fensterladen-Overlay ausblenden
	fensterGeladen () {
		setTimeout(function() {
			let fl = document.getElementById("fensterladen");
			fl.classList.add("geladen");
			fl.addEventListener("transitionend", function() {
				this.classList.add("aus");
			});
		}, 500);
	},
	// fordert den Main-Prozess auf, dieses Fenster zu fokussieren
	fensterFokus () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.invoke("fenster-fokus");
	},
	// Anzeige der Icon-Leiste im Kopf des Hauptfensters anpassen
	kopfIcons () {
		let kopfLeiste = document.getElementById("kopf-icons");
		// letzten sichtbaren Icon-Link markieren
		let last = kopfLeiste.querySelector(".last");
		if (last) {
			last.classList.remove("last");
		}
		let aAn = kopfLeiste.querySelectorAll("a:not(.aus)");
		if (aAn.length) {
			aAn[aAn.length - 1].classList.add("last");
		}
		// ggf. die Anhänge-Icons anzeigen
		let anhaenge = document.getElementById("kartei-anhaenge");
		if (anhaenge.hasChildNodes()) {
			anhaenge.classList.remove("aus");
			if (aAn.length) {
				anhaenge.classList.add("not-first");
			} else {
				anhaenge.classList.remove("not-first");
			}
		} else {
			anhaenge.classList.add("aus");
		}
		// Icon-Leiste ggf. komplett ausschalten
		if (!aAn.length && !anhaenge.hasChildNodes()) {
			kopfLeiste.classList.add("aus");
		} else {
			kopfLeiste.classList.remove("aus");
		}
	},
	// übergebene Sektion einblenden, alle andere Sektionen ausblenden
	//   sektion = String
	//     (ID der einzublendenden Sektion)
	sektion_aktiv: "",
	sektion_document_scroll: 0,
	sektionWechseln (sektion) {
		// Abbruch, wenn die Sektion gar nicht gewechsel werden muss
		if (sektion === helfer.sektion_aktiv) {
			return;
		}
		// Suchleiste ggf. ausblenden
		if (document.getElementById("suchleiste")) {
			suchleiste.ausblenden();
		}
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
			window.scrollTo({
				left: 0,
				top: helfer.sektion_document_scroll,
				behavior: "auto",
			});
		} else {
			window.scrollTo({
				left: 0,
				top: 0,
				behavior: "auto",
			});
		}
	},
	// übernimmt das seitenweise Scrollen im Bedeutungsgerüst, der Belegliste und
	// Leseansicht der Karteikarte
	// (Grund: sonst wird Text unter dem Header versteckt)
	//   evt = Object
	//     (das Event-Objekt)
	scrollen (evt) {
		// nicht abfangen, wenn Overlay-Fenster offen ist
		if (overlay.oben()) {
			return;
		}
		// Space nicht abfangen, wenn Fokus auf <input>, <textarea>, contenteditable
		let aktiv = document.activeElement;
		if (evt.key === " " &&
				(/^(INPUT|TEXTAREA)$/.test(aktiv.nodeName) || aktiv.getAttribute("contenteditable"))) {
			return;
		}
		// normales scrollen unterbinden
		evt.preventDefault();
		// aktive Sektion und deren Abstand nach oben ermitteln
		let sektion = document.querySelector("body > section:not(.aus)"),
			sektionHeader = sektion.querySelector("header");
		const sektionTop = sektion.offsetTop;
		let header = 0;
		if (sektionHeader) {
			header = sektionHeader.offsetHeight;
		}
		// Ziel-Position ermitteln
		let top = 0;
		if (evt.key === "PageUp") { // hoch
			top = window.scrollY - window.innerHeight + sektionTop + header + 72; // 24px = Höhe Standardzeile
		} else if (/^( |PageDown)$/.test(evt.key)) { // runter
			top = window.scrollY + window.innerHeight - sektionTop - header - 72; // 24px = Höhe Standardzeile
		}
		// scrollen
		window.scrollTo({
			left: 0,
			top: top,
			behavior: "smooth",
		});
	},
	// eleminiert alle childNodes des übergebenen Objekts
	//   obj = Element
	//     (dieses Element soll von all seinen Kindern befreit werden)
	keineKinder (obj) {
		while (obj.hasChildNodes()) {
			obj.removeChild(obj.lastChild);
		}
	},
	// wählt den Text innerhalb des übergebenen Objekts aus
	//   obj = Element
	//     (das Element, in dem der Text komplett markiert werden soll)
	auswahl (obj) {
		let range = document.createRange();
		range.selectNodeContents(obj);
		let sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	},
	// Fokus aus Formularfeldern entfernen
	inputBlur () {
		let aktiv = document.activeElement;
		if (aktiv.type === "text" || aktiv.nodeName === "TEXTAREA") {
			aktiv.blur();
		}
	},
	// überprüft, ob in einem Number-Input eine zulässige Ziffer steht
	//   i = Element
	//     (das Number-Feld, das überprüft werden soll)
	inputNumber (i) {
		const v = parseInt(i.value, 10);
		if (isNaN(v) || v < i.min || v > i.max) {
			i.value = i.defaultValue;
		}
	},
	// mehrzeilige Textfelder automatisch an die Größe des Inhalts anpassen
	// (größer als die angegebene max-height werden sie dabei nie)
	//   textarea = Element
	//     (Textfeld, dessen Eingaben hier abgefangen werden)
	textareaGrow (textarea) {
		textarea.style.height = "inherit";
		textarea.style.height = `${textarea.scrollHeight - 4}px`; // 4px padding in scrollHeight enthalten
	},
	// Standardformatierungen in Edit-Feldern abfangen
	//   edit = Element
	//     (das Edit-Feld, das keine Standardformatierungen erhalten soll
	editNoFormat (edit) {
		edit.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (tastatur.modifiers === "Ctrl" && /^(b|i|u)$/.test(evt.key)) {
				evt.preventDefault();
			}
		});
	},
	// Bereinigt Text, der in Textfeldern eingegeben wurde
	//   text = String
	//     (der Text, der bereinigt werden soll)
	//   doppelleer = Boolean
	//     (sollen doppelte Leerzeichen bereinigt werden; das ist nicht in jedem Feld sinnvoll)
	textTrim (text, doppelleer) {
		text = text.replace(/^(\s*\n)+|(\s*\n)+$/g, "");
		text = text.trim(); // berücksichtigt Zeilenumbrüche nicht immer
		if (doppelleer) {
			text = text.replace(/ {2,}/g, " ");
		}
		return text;
	},
	// Treffer innerhalb von Tags löschen
	//   text = String
	//     (Text mit Suchmarkierungen)
	//   cl = String || undefined
	//     (die Class des <mark>)
	suchtrefferBereinigen (text, cl = "suche") {
		let reg = new RegExp(`(<[^>]*?)<mark class="${cl}">(.+?)<\/mark>`, "g");
		while (text.match(reg)) { // > 1 Treffer in ein un demselben Tag => mehrfach durchlaufen
			text = text.replace(reg, function(m, p1, p2) {
				return `${p1}${p2}`;
			});
		}
		return text;
	},
	// beim Pasten von Text in ein Edit-Feld den Text ggf. vorher bereinigen
	//   ele = Element
	//     (das betreffende Edit-Feld)
	editPaste (ele) {
		ele.addEventListener("paste", function(evt) {
			// Muss der Text aufbereitet werden?
			const clipHtml = evt.clipboardData.getData("text/html"),
				clipText = evt.clipboardData.getData("text/plain");
			if (!clipHtml && !/\n|\t/.test(clipText)) {
				return;
			}
			// Text aufbereiten, ersetzen, pasten
			evt.preventDefault();
			let text = "";
			if (clipHtml) {
				text = reinigen(clipHtml, true);
			} else {
				text = reinigen(clipText);
			}
			text = helfer.textTrim(text, true);
			const {clipboard} = require("electron");
			clipboard.writeText(text);
			document.execCommand("paste");
			// Text bereinigen
			//   text = String
			//     (Clipboard-Text, der bereinigt werden soll
			//   tags = true || undefined
			//     (Tags entfernen)
			function reinigen (text, tags = false) {
				if (tags) {
					text = text.replace(/<.+?>/g, "");
				}
				return text.replace(/[\n\t]+/g, " ");
			}
		});
	},
	// ergänzt Style-Information für eine Kopie im HTML-Format;
	// löscht die nicht zum Original gehörenden Markierungen der BenutzerIn
	//   html = String
	//     (der Quelltext, in dem die Ersetzungen vorgenommen werden sollen)
	clipboardHtml (html) {
		// temporären Container erstellen
		let cont = document.createElement("div");
		cont.innerHTML = html;
		// Hervorhebungen, die standardmäßig gelöscht gehören
		let marks = [".suche", ".suchleiste", ".user"];
		if (!optionen.data.einstellungen["textkopie-wort"]) { // Hervorhebung Karteiwort ebenfalls löschen
			marks.push(".wort");
		} else {
			marks.push(".farbe0 .wort");
		}
		helfer.clipboardHtmlErsetzen(cont, marks.join(", "));
		// Hervorhebung Karteiwort ggf. umwandeln
		if (optionen.data.einstellungen["textkopie-wort"]) {
			// Layout festlegen
			let style = "font-weight: bold";
			if (optionen.data.einstellungen["textkopie-wort-hinterlegt"]) {
				style += "; background-color: #e5e5e5";
			}
			// verbliebene Karteiwort-Hervorhebungen umwandeln
			helfer.clipboardHtmlErsetzen(cont, ".wort", "span", style);
		}
		// Annotierungen endgültig löschen
		helfer.clipboardHtmlErsetzen(cont, ".annotierung-wort");
		// DTA-Klassen umwandeln
		let styles = {
			"dta-antiqua": "font-family: sans-serif",
			"dta-blau": "color: blue",
			"dta-doppelt": "text-decoration: underline double",
			"dta-gesperrt": "letter-spacing: 4px",
			"dta-groesser": "font-size: 20px",
			"dta-initiale": "font-size: 24px",
			"dta-kapitaelchen": "font-variant: small-caps",
			"dta-rot": "color: red",
		};
		for (let style in styles) {
			if (!styles.hasOwnProperty(style)) {
				continue;
			}
			stylesAnpassen(style);
		}
		// Ergebnis der Bereinigung zurückggeben
		return cont.innerHTML;
		// Ersetzungsfunktion für die DTA-Layout-Container
		function stylesAnpassen (style) {
			cont.querySelectorAll(`.${style}`).forEach(i => {
				i.setAttribute("style", styles[style]);
				i.removeAttribute("class");
			});
		}
	},
	// Ersetzungsfunktion für zu löschende bzw. umzuwandelnde Element-Container
	//   selectors = String
	//     (Liste der Selektoren)
	//   container = String || undefined
	//     (steuert die Art des Ersatz-Containers)
	//   style = String || undefined
	//     (steuert die Art des Layouts im Ersatz-Container)
	clipboardHtmlErsetzen (cont, selectors, typ = "frag", style = "") {
		let quelle = cont.querySelector(selectors);
		while (quelle) { // die Elemente könnten verschachtelt sein
			let ersatz;
			if (typ === "span") {
				ersatz = document.createElement("span");
				ersatz.setAttribute("style", style);
			} else {
				ersatz = document.createDocumentFragment();
			}
			for (let i = 0, len = quelle.childNodes.length; i < len; i++) {
				ersatz.appendChild(quelle.childNodes[i].cloneNode(true));
			}
			quelle.parentNode.replaceChild(ersatz, quelle);
			quelle = cont.querySelector(selectors);
		}
	},
	// Text in die Zwischenablage schieben
	//   text = Object
	//     (enthält Plain-Text und ggf. auch HTML)
	toClipboard (text) {
		const {clipboard} = require("electron");
		clipboard.write(text);
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
	// alphanumerisch sortieren
	// (geht nur bei eindimensionalen Arrays!)
	//   a = String
	//   b = String
	sortAlpha (a, b) {
		a = helfer.sortAlphaPrep(a);
		b = helfer.sortAlphaPrep(b);
		let x = [a, b];
		x.sort();
		if (x[0] === a) {
			return -1;
		}
		return 1;
	},
	// Strings nach Länge sortieren (kürzeste zuletzt), Fallback: alphanumerische Sortierung
	//   a = String
	//   b = String
	sortLengthAlpha (a, b) {
		const a_len = a.length,
			b_len = b.length;
		if (a_len !== b_len) {
			return b_len - a_len;
		}
		return helfer.sortAlpha(a, b);
	},
	// Strings nach Länge sortieren (kürzeste zuerst), Fallback: alphanumerische Sortierung
	//   a = String
	//   b = String
	sortLengthAlphaKurz (a, b) {
		const a_len = a.length,
			b_len = b.length;
		if (a_len !== b_len) {
			return a_len - b_len;
		}
		return helfer.sortAlpha(a, b);
	},
	// ein übergebenes Datum formatiert ausgeben
	//   datum = String
	//     (im ISO 8601-Format)
	//   knapp = true || undefined
	//     (eine knappere Version des Datums wird zurückgegeben)
	datumFormat (datum, knapp = false) {
		let wochentage = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
			monate = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
		let d = new Date(datum);
		if (knapp) {
			return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}, ${d.getHours()}:${d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()} Uhr`;
		}
		return `${wochentage[d.getDay()]}, ${d.getDate()}. ${monate[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${d.getMinutes() < 10 ? `0${d.getMinutes()}` : d.getMinutes()} Uhr`;
	},
	// überprüft den Typ des übergebenen Objekts zuverlässig
	// mögliche Rückgabewerte u.a.: Arguments, Array, Boolean, Date, Element, Error, Function, JSON, Math, NodeList, Number, Object, RegExp, String
	//   typ = String
	//     (Typ, auf den das übergebene Objekt überprüft werden soll)
	//   obj = Object
	//     (das Objekt, das auf den übergebenen Typ überprüft wird)
	checkType (typ, obj) {
		const cl = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && cl === typ;
	},
	// Variablen um Wortgrenzen zu bestimmen
	ganzesWortRegExp: {
		links: `\\s/\\\\([\\\]{<>`,
		rechts: `\\s"/\\\\)\\\]!?.:,;<>`,
		// für Hervorhebung Karteiwort gewisse Klammern ignorieren: [] ()
		// (das ist deswegen, damit ich Komposita, in denen ein Glied geklammert ist,
		// auch hervorheben kann; z.B.: "(Handels-)Kolonie")
		linksWort: `\\s/\\{<>`,
		rechtsWort: `\\s"/\\!?.:,;<>`,
	},
	// Tokens mit spezieller Bedeutung für reguläre Ausdrücke escapen
	//   string = String
	//     (Text, der escaped werden soll)
	escapeRegExp (string) {
		return string.replace(/\/|\(|\)|\[|\]|\{|\}|\.|\?|\\|\+|\*|\^|\$|\|/g, m => `\\${m}`);
	},
	// Zeichen maskieren
	//   string = String
	//     (Text, in dem Zeichen maskiert werden sollen)
	//   undo = Boolean
	//     (Maskierung zurücknehmen)
	escapeHtml (string, undo = false) {
		let zeichen = [
			{
				orig: "<",
				mask: "&lt;",
			},
			{
				orig: ">",
				mask: "&gt;",
			},
		];
		for (let z of zeichen) {
			let reg, rep;
			if (undo) {
				reg = new RegExp(z.mask, "g");
				rep = z.orig;
			} else {
				reg = new RegExp(z.orig, "g");
				rep = z.mask;
			}
			string = string.replace(reg, rep);
		}
		return string;
	},
	// Sammlung der regulären Ausdrücke aller Formvarianten;
	// in jedem Slot ein Objekt mit den Eigenschaften
	//   wort = das Wort, für den der reguläre Ausdruck erstellt wurde
	//   reg = der reguläre Ausdruck
	formVariRegExpRegs: [],
	// regulären Ausdruck mit allen Formvarianten erstellen
	formVariRegExp () {
		helfer.formVariRegExpRegs = [];
		for (let wort in data.fv) {
			if (!data.fv.hasOwnProperty(wort)) {
				continue;
			}
			// Wort soll nicht berücksichtigt werden
			if (!data.fv[wort].an) {
				continue;
			}
			// Varianten zusammenstellen
			let varianten = [];
			for (let form of data.fv[wort].fo) {
				let text = helfer.escapeRegExp(form.va.charAt(0));
				for (let i = 1, len = form.va.length; i < len; i++) {
					text += "(?:<[^>]+>|\\[¬\\]| \\[:.+?:\\] )*";
					text += helfer.escapeRegExp(form.va.charAt(i));
				}
				text = helfer.formVariSonderzeichen(text);
				varianten.push(text);
			}
			helfer.formVariRegExpRegs.push({
				wort: wort,
				reg: varianten.join("|"),
			});
		}
	},
	// spezielle Buchstaben für einen regulären Suchausdruck um Sonderzeichen ergänzen
	//   wort = String
	//     (die Zeichenkette, mit der gesucht werden soll
	formVariSonderzeichen (wort) {
		return wort.replace(/en|e|nn|n|s|ä|ö|ü/g, function(m) {
			switch (m) {
				case "en":
					return "(?:ẽ|en)";
				case "e":
					return "(?:ẽ|e)";
				case "nn":
					return "(?:ñ|nn)";
				case "n":
					return "(?:ñ|n)";
				case "s":
					return "(?:ſ|s)";
				case "ä":
					return "(?:aͤ|ä)";
				case "ö":
					return "(?:oͤ|ö)";
				case "ü":
					return "(?:uͤ|ü)";
			}
		});
	},
	// Zwischenspeicher für den Timeout der Animation
	animationTimeout: null,
	// Overlay-Animation, die anzeigt, was gerade geschehen ist
	// (Kopier-Aktion oder Wrap der Suchleiste)
	//   ziel = String
	//     ("liste" || "zwischenablage" || "wrap" || "duplikat" || "gespeichert", "einfuegen")
	animation (ziel) {
		// ggf. Timeout clearen
		clearTimeout(helfer.animationTimeout);
		// Element erzeugen oder ansprechen
		let div = null;
		if (document.getElementById("animation")) {
			div = document.getElementById("animation");
		} else {
			div = document.createElement("div");
			div.id = "animation";
			let zIndex = 99;
			if (typeof overlay !== "undefined") { // steht nicht in allen Fenstern zur Verfügung
				overlay.zIndex++;
				zIndex = overlay.zIndex;
			}
			div.style.zIndex = zIndex;
		}
		// Element füllen
		helfer.keineKinder(div);
		let img = document.createElement("img");
		div.appendChild(img);
		img.width = "96";
		img.height = "96";
		let cd = "";
		if (/changelog|fehlerlog|dokumentation|handbuch/.test(winInfo.typ)) {
			cd = "../";
		}
		if (ziel === "zwischenablage") {
			img.src = `${cd}img/einfuegen-pfeil-blau-96.svg`;
		} else if (ziel === "liste") {
			img.src = `${cd}img/kopieren-blau-96.svg`;
			let span = document.createElement("span");
			div.appendChild(span);
			span.textContent = kopieren.belege.length;
		} else if (ziel === "wrap") {
			img.src = `${cd}img/pfeil-kreis-blau-96.svg`;
		} else if (ziel === "duplikat") {
			img.src = `${cd}img/duplizieren-blau-96.svg`;
		} else if (ziel === "gespeichert") {
			img.src = `${cd}img/speichern-blau-96.svg`;
		} else if (ziel === "einfuegen") {
			img.src = `${cd}img/einfuegen-blau-96.svg`;
		}
		// Element einhängen und wieder entfernen
		document.querySelector("body").appendChild(div);
		setTimeout(function() {
			div.classList.add("an");
		}, 1); // ohne Timeout geht es nicht
		helfer.animationTimeout = setTimeout(function() {
			div.classList.remove("an");
			helfer.animationTimeout = setTimeout(function() {
				if (!document.querySelector("body").contains(div)) {
					// der <div> könnte bereits verschwunden sein
					// (kann vorkommen, wenn er im 500ms-Gap noch einmal aktiviert wird)
					return;
				}
				document.querySelector("body").removeChild(div);
			}, 500);
		}, 1000);
	},
	// öffnet externe Links in einem Browser-Fenster
	//   a = Element
	//     (Link, auf dem geklickt wurde)
	externeLinks (a) {
		a.title = a.getAttribute("href");
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (evt.detail > 1) { // Doppelklicks abfangen
				return;
			}
			let url = this.getAttribute("href");
			// URL ggf. aufbereiten
			if (!/^http/.test(url)) {
				url = `https://${url}`;
			}
			// URL im Browser öffnen
			const {shell} = require("electron");
			shell.openExternal(url);
		});
	},
	// öffnet den Dateimanager im Ordner der übergebenen Datei
	//   pfad = String
	//     (Pfad zu einer Datei)
	ordnerOeffnen (pfad) {
		const {shell} = require("electron"),
			path = require("path");
		if (!/\.wgd$/.test(pfad)) { // Ordner öffnen
			if (!/\/$/.test(pfad)) {
				pfad += path.sep;
			}
			pfad += `.${path.sep}`; // sonst wird nicht der Ordner, sondern der übergeordnete Ordner geöffnet
		}
		shell.showItemInFolder(pfad);
	},
	// prüft, ob eine Datei existiert
	//   datei = String
	//     (Pfad zur Datei)
	exists (datei) {
		return new Promise(resolve => {
			const fsP = require("fs").promises;
			fsP.access(datei)
				.then(() => resolve(true))
				.catch(() => resolve(false));
		});
	},
	// markiert in der Titelleiste des Programms, dass irgendeine Änderung
	// noch nicht gespeichert wurde
	geaendert () {
		// Änderungsmarkierung?
		let asterisk = "";
		if (kartei.geaendert ||
				notizen.geaendert ||
				tagger.geaendert ||
				bedeutungen.geaendert ||
				beleg.geaendert) {
			asterisk = " *";
		}
		// Wort
		let wort = "";
		if (kartei.wort) {
			wort = `: ${kartei.wort}`;
		}
		// Dokumententitel
		document.title = appInfo.name + wort + asterisk;
	},
	// überprüft, ob das Bedeutungsgerüst offen ist und nicht durch irgendein
	// anderes Fenster verdeckt wird
	bedeutungenOffen () {
		if (!overlay.oben() && !document.getElementById("bedeutungen").classList.contains("aus")) {
			return true;
		}
		return false;
	},
	// überprüft, ob die Karteikarte offen ist und nicht durch irgendein
	// anderes Fenster verdeckt wird
	belegOffen () {
		if (!overlay.oben() && !document.getElementById("beleg").classList.contains("aus")) {
			return true;
		}
		return false;
	},
	// Öffnen der Demonstrationskartei
	demoOeffnen () {
		// Resources-Pfad ermitteln
		let resources = process.resourcesPath;
		if (/node_modules/.test(resources)) {
			// App ist nicht paketiert => resourcesPath zeigt auf die resources von Electron
			resources = `${resources.replace(/node_modules.+/, "")}resources`;
		}
		const fsP = require("fs").promises,
			path = require("path"),
			quelle = path.join(resources, "Demonstrationskartei Team.wgd"),
			ziel = path.join(appInfo.temp, "Demonstrationskartei Team.wgd");
		fsP.copyFile(quelle, ziel)
			.then(() => {
				kartei.oeffnenEinlesen(ziel);
			})
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Kopieren der Demonstrationsdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				throw err;
			});
	},
	// Handbuch an einer bestimmten Stelle aufschlagen
	//   a = Element
	//     (der Link, der einen abschnitt im Handbuch referenziert)
	handbuchLink (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let abschnitt = this.dataset.handbuch;
			// Aufruf aus den Einstellungen => Abschnitt um Sektionen-ID ergänzen
			if (overlay.oben() === "einstellungen") {
				for (let section of document.querySelectorAll("#einstellungen-cont section")) {
					if (!section.classList.contains("aus")) {
						abschnitt += `-${section.id.replace(/.+-/, "")}`;
						break;
					}
				}
			}
			// Signal an den Main-Prozess
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("hilfe-handbuch", abschnitt);
		});
	},
	// Fehler an den Main-Prozess melden
	//   evt = Object
	//     (Fehler-Objekt)
	onError (evt) {
		let fileJs = evt.filename, // gewöhnliche Fehler
			message = evt.message,
			line = evt.lineno,
			column = evt.colno;
		if (evt.stack) { // weitergeleitete Fehler
			if (!/file:.+?\.js/.test(evt.stack)) {
				noDetails();
			} else {
				fileJs = evt.stack.match(/file:.+?\.js/)[0];
				message = `${evt.name}: ${evt.message}`;
				line = parseInt(evt.stack.match(/\.js:([0-9]+):/)[1], 10);
				column = parseInt(evt.stack.match(/\.js:[0-9]+:([0-9]+)/)[1], 10);
			}
		} else if (evt.reason) { // in promise-Fehler
			if (!/file:.+?\.js/.test(evt.reason.stack)) {
				noDetails();
			} else {
				fileJs = evt.reason.stack.match(/file:.+?\.js/)[0];
				message = evt.reason.stack.match(/(.+?)\n/)[1];
				line = parseInt(evt.reason.stack.match(/\.js:([0-9]+):/)[1], 10);
				column = parseInt(evt.reason.stack.match(/\.js:[0-9]+:([0-9]+)/)[1], 10);
			}
		}
		// Fehler-Objekt erzeugen
		let err = {
			time: new Date().toISOString(),
			word: typeof kartei === "undefined" ? winInfo.typ : kartei.wort,
			fileWgd: typeof kartei === "undefined" ? "Nebenfenster" : kartei.pfad,
			fileJs: fileJs,
			message: message,
			line: line,
			column: column,
		};
		// Fehler-Objekt an Renderer schicken
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("fehler", err);
		// keine Details bekannt
		function noDetails () {
			fileJs = "";
			message = evt.reason.stack;
			line = 0;
			column = 0;
		}
	},
	// führt mitunter asynchrone Operationen aus, die nach und nach
	// vor dem Schließen eines Hauptfensters abgearbeitet werden müssen;
	// danach wird ein endgültiger Schließen-Befehl an Main gegeben
	async beforeUnload () {
		// Schließen unterbrechen, wenn ungespeicherte Änderungen
		if (notizen.geaendert ||
				tagger.geaendert ||
				bedeutungen.geaendert ||
				beleg.geaendert ||
				kartei.geaendert) {
			speichern.checkInit(() => {
				const {ipcRenderer} = require("electron");
				ipcRenderer.invoke("fenster-schliessen");
			}, {
				kartei: true,
			});
			return;
		}
		// Bedeutungen-Fenster ggf. schließen
		await bedeutungenWin.schliessen();
		// Kartei entsperren
		await kartei.lock(kartei.pfad, "unlock");
		// Status des Fensters speichern
		const {ipcRenderer} = require("electron");
		optionen.data.fenster = await ipcRenderer.invoke("fenster-status", winInfo.winId, "fenster");
		// Optionen speichern
		await ipcRenderer.invoke("optionen-speichern", optionen.data, winInfo.winId);
		// Fenster endgültig schließen
		ipcRenderer.invoke("fenster-schliessen-endgueltig");
	},
};
