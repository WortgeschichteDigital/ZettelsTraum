"use strict";

let stamm = {
	// Part-of-speech-Tags
	partOfSpeech: {
		ADJA: "attributives Adjektiv",
		ADJD: "adverbiales oder prädikatives Adjektiv",
		ADV: "Adverb",
		APPR: "Präposition, Zirkumposition links",
		APPRART: "Präposition mit Artikel",
		APPO: "Postposition",
		APZR: "Zirkumposition rechts",
		ART: "bestimmter oder unbestimmter Artikel",
		CARD: "Kardinalzahl",
		FM: "Fremdsprache",
		ITJ: "Interjektion",
		KON: "Konjunktion",
		KOKOM: "Komparativbestimmung",
		KOUI: "Subjunktion, Infinitivsatz einleitend",
		KOUS: "Subjunktion, Satz einleitend",
		NA: "substantiviertes Adjektiv",
		NE: "Eigenname",
		NN: "normales Nomen",
		PAV: "Pronominaladverb",
		PDAT: "attribuierendes Demonstrativpronomen",
		PDS: "substituierendes Demonstrativpronomen",
		PIAT: "attribuierendes Indefinitpronomen ohne Determiner",
		PIDAT: "attribuierendes Indefinitpronomen mit Determiner",
		PIS: "substituierendes Indefinitpronomen",
		PPER: "irreflexives Personalpronomen",
		PRF: "reflexives Personalpronomen",
		PPOSS: "substituierendes Possessivpronomen",
		PPOSAT: "attribuierendes Possessivpronomen",
		PRELAT: "attribuierendes Relativpronomen",
		PRELS: "substituierendes Relativpronomen",
		PTKA: "Partikel bei Adjektiv oder Adverb",
		PTKANT: "Antwortpartikel",
		PTKNEG: "Negationspartikel",
		PTKVZ: "abgetrennter Verbzusatz",
		PTKZU: "„zu“ vor Infinitiv",
		PWS: "substituierendes Interrogativpronomen",
		PWAT: "attribuierendes Interrogativpronomen",
		PWAV: "adverbiales Interrogativ- oder Relativpronomen",
		TRUNC: "Kompositions-Erstglied",
		VAFIN: "finites Verb, aux",
		VAIMP: "Imperativ, aux",
		VAINF: "Infinitiv, aux",
		VAPP: "Partizip Perfekt, aux",
		VMFIN: "finites Verb, modal",
		VMINF: "Infinitiv, modal",
		VMPP: "Partizip Perfekt, modal",
		VVFIN: "finites Verb, voll",
		VVIMP: "Imperativ, voll",
		VVINF: "Infinitiv, voll",
		VVIZU: "Infinitiv mit „zu“, voll",
		VVPP: "Partizip Perfekt, voll",
		XY: "Nichtwort",
	},
	// speichert, ob der Ladevorgang der Formvarianten noch läuft
	ladevorgang: false,
	// Formvarianten-Fenster einblenden
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Kartei &gt; Formvarianten</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// wird die Variantenliste gerade erstellt, darf sich das Fenster nicht öffnen
		if (stamm.ladevorgang) {
			dialog.oeffnen({
				typ: "alert",
				text: "Die Liste der Formvarianten wird gerade erstellt.\nVersuchen Sie es in ein paar Sekunden noch einmal.",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("stamm");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Kopf und Liste initial aufbauen
		stamm.aufbauen();
	},
	// Kopf und Liste aufbauen
	//   wortAkt = false || undefined
	aufbauen (wortAkt = true) {
		// ggf. aktuelles Wort ermitteln
		if (wortAkt) {
			stamm.wortAkt = Object.keys(data.fv)[0];
		}
		// Kopf erzeugen
		stamm.kopf();
		// Liste erzeugen
		stamm.auflisten();
		// Fokus in das Textfeld
		document.getElementById("stamm-text").focus();
	},
	// speichert den Bestandteil des/eines mehrgliedrigen Karteiworts, dessen Liste gerade zu sehen ist;
	// (beim Öffnen des Fensters steht hier der Name des ersten Objects in data.fv)
	wortAkt: "",
	// Kopf aufbauen
	kopf () {
		let cont = document.getElementById("stamm-kopf");
		helfer.keineKinder(cont);
		// Wortblöcke aufbauen
		let woerter = Object.keys(data.fv);
		for (let i = 0, len = woerter.length; i < len; i++) {
			const wort = woerter[i];
			// Container
			let span = document.createElement("span");
			cont.appendChild(span);
			span.dataset.wort = wort;
			if (wort === stamm.wortAkt) {
				span.classList.add("aktiv");
			}
			if (len > 1) {
				stamm.kopfAktiv(span);
			}
			// Icon: aktiviert
			let img = document.createElement("img");
			span.appendChild(img);
			if (data.fv[wort].an) {
				img.src = "img/check-gruen.svg";
			} else {
				img.src = "img/x-dick-rot.svg";
			}
			img.width = "24";
			img.height = "24";
			// Icon: nicht trunkiert
			if (!data.fv[wort].tr) {
				let img = document.createElement("img");
				span.appendChild(img);
				img.classList.add("last");
				img.src = "img/nicht-trunkiert.svg";
				img.width = "24";
				img.height = "24";
			} else {
				img.classList.add("last");
			}
			// Wort
			span.appendChild(document.createTextNode(wort));
			// Icon: Konfiguration
			let a = document.createElement("a");
			span.appendChild(a);
			a.classList.add("icon-link", "konfig");
			a.href = "#";
			a.textContent = " ";
			a.title = "Konfiguration öffnen";
			stamm.kopfKonfigListener(a);
		}
	},
	// Wort auswählen, dessen Formvarianten aufgelistet werden sollen
	//   span = Element
	//     (der Inhaltsblock für das Wort))
	kopfAktiv (span) {
		span.addEventListener("click", function() {
			if (this.classList.contains("aktiv")) {
				return;
			}
			// altes Konfigurationsfenster ggf. schließen
			stamm.kopfKonfigSchliessen();
			// Anzeige im Kopf ändern
			let aktiv = document.querySelector("#stamm-kopf .aktiv");
			aktiv.classList.remove("aktiv");
			this.classList.add("aktiv");
			// Liste ändern
			stamm.wortAkt = this.dataset.wort;
			stamm.auflisten();
		});
	},
	// Konfigurationsfenster (Listener)
	//   a = Element
	//     (der Icon-Link zum Öffnen des Konfigurationsfensters)
	kopfKonfigListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// da zugleich stamm.kopfAktiv() gefeuert wird (was es auch soll),
			// würde das Fenster ohne Timeout nicht aufgebaut werden
			setTimeout(() => stamm.kopfKonfig(this), 25);
		});
	},
	// Konfigurationsfenster
	//   a = Element
	//     (der Icon-Link zum Öffnen des Konfigurationsfensters)
	kopfKonfig (a) {
		let cont = a.parentNode;
		const wort = cont.dataset.wort;
		// altes Konfigurationsfenster ggf. schließen
		stamm.kopfKonfigSchliessen();
		// Popup
		let popup = document.createElement("span");
		cont.appendChild(popup);
		popup.id = "stamm-popup";
		if (cont.offsetLeft > 0) {
			popup.classList.add("rechts");
		} else {
			popup.classList.add("links");
		}
		popup.addEventListener("click", evt => evt.stopPropagation()); // damit stamm.kopfAktiv() nicht dispatched wird
		// Schließen-Icon
		let img = document.createElement("img");
		popup.appendChild(img);
		img.src = "img/x.svg";
		img.width = "24";
		img.height = "24";
		img.title = "Popup schließen (Esc)";
		img.addEventListener("click", () => stamm.kopfKonfigSchliessen());
		// Part-of-speech
		let p = document.createElement("p");
		popup.appendChild(p);
		p.classList.add("stamm-popup-ps");
		let strong = document.createElement("strong");
		p.appendChild(strong);
		strong.textContent = `${wort}: `;
		if (data.fv[wort].ps) {
			const ps = data.fv[wort].ps,
				ausgeschrieben = stamm.partOfSpeech[ps] ? ` (${stamm.partOfSpeech[ps]})` : "";
			p.appendChild(document.createTextNode(ps + ausgeschrieben));
		} else {
			let span = document.createElement("span");
			p.appendChild(span);
			span.textContent = "Wortart unbekannt";
		}
		// Link zum DTA
		p = document.createElement("p");
		popup.appendChild(p);
		let icon = document.createElement("img");
		p.appendChild(icon);
		icon.src = "img/kreis-welt.svg";
		icon.width = "24";
		icon.height = "24";
		let link = document.createElement("a");
		p.appendChild(link);
		link.classList.add("link");
		link.href = `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=text&clean=1&pretty=1&raw=1&q=${encodeURIComponent(wort)}`;
		link.textContent = "DTA::CAB";
		helfer.externeLinks(link);
		// Checkbox: aktivieren
		let an = 0;
		for (let w in data.fv) {
			// mindestens ein Wort muss aktiviert sein;
			// ist derzeit mehr als ein Wort aktiviert?
			if (!data.fv.hasOwnProperty(w)) {
				continue;
			}
			if (data.fv[w].an) {
				an++;
			}
		}
		if (an > 1 || an === 1 && !data.fv[wort].an) {
			let p = document.createElement("p");
			popup.appendChild(p);
			let input = document.createElement("input");
			p.appendChild(input);
			input.id = "stamm-popup-aktivieren";
			input.type = "checkbox";
			if (data.fv[wort].an) {
				input.checked = true;
				input.title = "Wort deaktivieren";
			} else {
				input.title = "Wort aktivieren";
			}
			stamm.kopfKonfigAktivieren(input);
			let label = document.createElement("label");
			p.appendChild(label);
			label.setAttribute("for", "stamm-popup-aktivieren");
			label.textContent = "aktivieren";
		}
		// Checkbox: trunkieren
		p = document.createElement("p");
		popup.appendChild(p);
		let input = document.createElement("input");
		p.appendChild(input);
		input.id = "stamm-popup-trunkieren";
		input.type = "checkbox";
		if (data.fv[wort].tr) {
			input.checked = true;
			input.title = "Wort nicht erweitern";
		} else {
			input.title = "Wort links und rechts erweitern";
		}
		stamm.kopfKonfigTrunkieren(input);
		let label = document.createElement("label");
		p.appendChild(label);
		label.setAttribute("for", "stamm-popup-trunkieren");
		label.textContent = "trunkieren";
		// Button: neu laden
		p = document.createElement("p");
		popup.appendChild(p);
		p.classList.add("stamm-popup-buttons");
		let button = document.createElement("input");
		p.appendChild(button);
		button.type = "button";
		button.value = "DTA-Import";
		stamm.kopfKonfigImport(button);
		// Button: löschen
		if (Object.keys(data.fv).length > 1) {
			let button = document.createElement("input");
			p.appendChild(button);
			button.type = "button";
			button.value = "Löschen";
			stamm.kopfKonfigLoeschen(button);
		}
	},
	// entfernt das Konfigurationsfenster
	kopfKonfigSchliessen () {
		let popup = document.getElementById("stamm-popup");
		if (popup) {
			popup.parentNode.removeChild(popup);
		}
	},
	// Aktivierung eines Wortes umschalten
	//   input = Element
	//     (die Checkbox)
	kopfKonfigAktivieren (input) {
		input.addEventListener("click", function() {
			// Eintrag in Datenobjekt auffrischen
			let span = this.closest("[data-wort]"),
				src;
			data.fv[span.dataset.wort].an = this.checked;
			if (this.checked) {
				this.title = "Wort deaktivieren";
				src = "img/check-gruen.svg";
			} else {
				this.title = "Wort aktivieren";
				src = "img/x-dick-rot.svg";
			}
			// Icon auffrischen
			span.firstChild.src = src;
			// Änderungsmarkierung setzen
			kartei.karteiGeaendert(true);
			// regulären Ausdruck mit allen Formvarianten neu erstellen
			helfer.formVariRegExp();
		});
	},
	// Trunkierung eines Wortes umschalten
	//   input = Element
	//     (die Checkbox)
	kopfKonfigTrunkieren (input) {
		input.addEventListener("click", function() {
			// Eintrag in Datenobjekt und Icon auffrischen
			let span = this.closest("[data-wort]");
			data.fv[span.dataset.wort].tr = this.checked;
			if (this.checked) {
				this.title = "Wort nicht erweitern";
				if (span.childNodes[1].nodeType === 1) {
					span.removeChild(span.childNodes[1]);
					span.firstChild.classList.add("last");
				}
			} else {
				this.title = "Wort links und rechts erweitern";
				span.firstChild.classList.remove("last");
				let img = document.createElement("img");
				span.appendChild(img);
				img.classList.add("last");
				img.src = "img/nicht-trunkiert.svg";
				img.width = "24";
				img.height = "24";
				span.insertBefore(img, span.childNodes[1]);
			}
			// Änderungsmarkierung setzen
			kartei.karteiGeaendert(true);
			// regulären Ausdruck mit allen Formvarianten neu erstellen
			helfer.formVariRegExp();
		});
	},
	// Formvarianten zu diesem einen Wort erneut importieren
	//   input = Element
	//     (der DTA-Import-Button im Konfigurationsfenster);
	kopfKonfigImport (input) {
		input.addEventListener("click", async () => {
			// Sperrbildschirm
			let div = document.createElement("div");
			div.classList.add("rotieren-bitte");
			div.id = "stamm-popup-sperre";
			let img = document.createElement("img");
			div.appendChild(img);
			img.src = "img/pfeil-kreis-blau-96.svg";
			img.width = "96";
			img.height = "96";
			document.getElementById("stamm-popup").appendChild(div);
			await new Promise(resolve => setTimeout(() => resolve(true), 250));
			// Request stellen
			const request = await stamm.dtaRequest(stamm.wortAkt, true);
			if (!request) {
				// Fehlermeldung wird von stamm.dtaRequest() ausgeworfen; nur den Sperrbildschirm entfernen
				div.parentNode.removeChild(div);
				return;
			}
			// Kopf und Liste neu aufbauen
			stamm.aufbauen(false);
		});
	},
	// Wort mit allen Formvarianten löschen
	//   input = Element
	//     (der Lösch-Button);
	kopfKonfigLoeschen (input) {
		input.addEventListener("click", () => {
			dialog.oeffnen({
				typ: "confirm",
				text: `Sollen <i>${stamm.wortAkt}</i> und all seine Formvarianten wirklich gelöscht werden?`,
				callback: () => {
					if (!dialog.antwort) {
						return;
					}
					// Wort löschen
					delete data.fv[stamm.wortAkt];
					// ist kein Wort mehr aktiv => erstes Wort aktivieren
					let an = 0;
					for (let w in data.fv) {
						// mindestens ein Wort muss aktiviert sein;
						// ist derzeit mehr als ein Wort aktiviert?
						if (!data.fv.hasOwnProperty(w)) {
							continue;
						}
						if (data.fv[w].an) {
							an++;
						}
					}
					if (!an) {
						let erstesWort = Object.keys(data.fv)[0];
						data.fv[erstesWort].an = true;
					}
					// Kopf und Liste neu aufbauen
					stamm.aufbauen();
				},
			});
		});
	},
	// Liste des aktuellen Worts aufbauen
	auflisten () {
		let cont = document.getElementById("stamm-liste");
		helfer.keineKinder(cont);
		// Einträge auflisten
		let fo = data.fv[stamm.wortAkt].fo;
		for (let i = 1, len = fo.length; i < len; i++) {
			// der erste Eintrag ist immer das Wort, wie es eingetragen wurde => nicht anzeigen, nicht löschen
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Link
			let a = document.createElement("a");
			a.href = "#";
			a.classList.add("icon-link", "icon-entfernen");
			a.dataset.fv = fo[i].va;
			stamm.entfernen(a);
			p.appendChild(a);
			// Text
			p.appendChild(document.createTextNode(fo[i].va));
			// Variante aus dem DTA?
			if (fo[i].qu === "dta") {
				let span = document.createElement("span");
				span.classList.add("dta");
				span.textContent = "DTA";
				span.title = "aus dem DTA importierte Formvariante";
				p.appendChild(span);
			}
		}
		// keine Varianten vorhanden
		if (!cont.hasChildNodes()) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("keine");
			p.textContent = "keine Formvarianten";
		}
	},
	// Eintrag hinzufügen
	ergaenzen () {
		let text = document.getElementById("stamm-text"),
			va = helfer.textTrim(text.value, true);
		// Uppala! Keine Variante angegeben!
		if (!va) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine Variante eingegeben.",
				callback: () => {
					text.select();
				},
			});
			return;
		}
		// Varianten ergänzen, schon registriert übergehen
		let fo = data.fv[stamm.wortAkt].fo,
			varianten = va.split(/\s/),
			schon = [];
		varianten.forEach(v => {
			if (!v || fo.find(i => i.va === v)) {
				schon.push(v);
				return;
			}
			fo.push({
				qu: "zt",
				va: v,
			});
		});
		if (schon.length) {
			let numerus = ["Variante", "ist"];
			if (schon.length > 1) {
				numerus = ["Varianten", "sind"];
			}
			schon.forEach((i, n) => schon[n] = `<i>${i}</i>`);
			const schonJoined = schon.join(", ").replace(/(.+)(,\s)/, (m, p1) => `${p1} und `);
			dialog.oeffnen({
				typ: "alert",
				text: `Die ${numerus[0]} ${schonJoined} ${numerus[1]} schon in der Liste.`,
				callback: () => {
					text.select();
				},
			});
			if (schon.length === varianten.length) {
				return;
			}
		}
		// Variante sortieren
		stamm.sortieren(fo, stamm.wortAkt);
		// Testfeld zurücksetzen
		text.value = "";
		// Liste neu aufbauen
		stamm.auflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
		// regulären Ausdruck mit allen Formvarianten neu erstellen
		helfer.formVariRegExp();
	},
	// Liste der Formvariante sortieren
	//   arr = Array
	//     (Array mit den Varianten, das sortiert werden soll)
	//   wort = String
	//     (das Wort, für das die Formvarianten-Liste steht)
	sortieren (arr, wort) {
		arr.sort(function(a, b) {
			// das betreffende Wort immer ganz nach oben schieben
			if (a.va === wort) {
				return -1;
			} else if (b.va === wort) {
				return 1;
			}
			// manuell hinzugefügte Varianten nach oben schieben
			if (a.qu === "zt" && b.qu !== "zt") {
				return -1;
			} else if (a.qu !== "zt" && b.qu === "zt") {
				return 1;
			}
			// Varianten derselben Kategorie alphabetisch sortieren
			let x = helfer.sortAlphaPrep(a.va),
				y = helfer.sortAlphaPrep(b.va),
				z = [x, y];
			z.sort();
			if (z[0] === x) {
				return -1;
			}
			return 1;
		});
	},
	// Eintrag aus der Liste entfernen
	//   a = Element
	//     (der Entfernen-Link vor der betreffenden Formvariante)
	entfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			// Index ermitteln
			let fv = this.dataset.fv,
				idx = -1,
				fo = data.fv[stamm.wortAkt].fo;
			for (let i = 0, len = fo.length; i < len; i++) {
				if (fo[i].va === fv) {
					idx = i;
					break;
				}
			}
			// Löschen
			fo.splice(idx, 1);
			// neu auflisten
			stamm.auflisten();
			// Änderungsmarkierung setzen
			kartei.karteiGeaendert(true);
			// regulären Ausdruck mit allen Formvarianten neu erstellen
			helfer.formVariRegExp();
		});
	},
	// Klick auf Button
	//   button = Element
	//     (Button im Formvarianten-Fenster)
	aktionButton (button) {
		button.addEventListener("click", function() {
			if (this.id === "stamm-ergaenzen") {
				stamm.ergaenzen();
			} else if (this.id === "stamm-dta") {
				stamm.dtaGet(true);
			}
		});
	},
	// Tastatureingaben im Textfeld abfangen
	//   input = Element
	//     (Textfeld zum Ergänzen einer Formvariante)
	aktionText (input) {
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
				evt.preventDefault();
				stamm.ergaenzen();
			}
		});
	},
	// Formvarianten aller Karteiwörter noch einmal laden
	//   aktiv = Boolean
	//     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
	async dtaGet (aktiv) {
		stamm.ladevorgang = true;
		// Objekte anlegen
		let woerter = stamm.dtaPrepParole();
		for (let wort of woerter) {
			if (data.fv[wort]) {
				// die Objekte sollten nicht überschrieben werden,
				// wenn alle Varianten auf Wunsch des Users noch einmal geladen werden;
				// manuell ergänzte Varianten und Konfiguration erhalten
				continue;
			}
			data.fv[wort] = {
				an: true,
				fo: [{
					qu: "zt",
					va: wort,
				}],
				ps: "",
				tr: true,
			};
		}
		// Formvarianten abrufen und eintragen
		const request = await stamm.dtaRequest(kartei.wort, aktiv);
		if (!request) {
			// Fehler in der Promise => keine Formvarianten;
			// aber das Wort ist eingetragen => einfach abschließen
			stamm.dtaAbschluss(aktiv);
		}
		helfer.formVariRegExp();
		stamm.ladevorgang = false;
	},
	// Karteiwörter vorbereiten
	// (Bereinigung um Satzzeichen, doppelte ausschließen
	dtaPrepParole () {
		let wort = kartei.wort.replace(/[!?.:,;"'§$%&/\\=*+~#()[\]{}<>]+/g, "");
		wort = helfer.textTrim(wort, true);
		let woerter = wort.split(/\s|_/);
		return [...new Set(woerter)];
	},
	// Request an das DTA schicken, um an die Formvarianten zu kommen
	//   wort = String
	//     (das Wort, zu dem die Formvarianten gezogen werden sollen;
	//     kann durchaus mehrgliedrig sein)
	//   aktiv = Boolean
	//     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
	dtaRequest (wort, aktiv) {
		return new Promise(resolve => {
			let ajax = new XMLHttpRequest();
			ajax.open("GET", `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=json&clean=1&q=${encodeURIComponent(wort)}`, true);
			ajax.timeout = parseInt(optionen.data.einstellungen.timeout, 10) * 1000;
			ajax.addEventListener("load", function () {
				if (ajax.status >= 200 && ajax.status < 300) {
					// JSON parsen
					let json = {};
					try {
						json = JSON.parse(ajax.response);
					} catch (err) {
						stamm.dtaFehler("Parsing-Fehler", err, aktiv);
						resolve(false);
						return;
					}
					stamm.dtaPush(json, aktiv);
					resolve(true);
				} else {
					stamm.dtaFehler("Download-Fehler", null, aktiv);
					resolve(false);
				}
			});
			ajax.addEventListener("timeout", function () {
				stamm.dtaFehler("Timeout-Fehler", null, aktiv);
				resolve(false);
			});
			ajax.addEventListener("error", function () {
				stamm.dtaFehler("allgemeiner Fehler", null, aktiv);
				resolve(false);
			});
			ajax.send(null);
		});
	},
	// Fehler beim Laden der Formvarianten des DTA
	//   fehlertyp = String
	//     (der allgemeine Fehlertyp)
	//   detail = String/null
	//     (falls Details zum Fehler vorhanden sind)
	//   aktiv = Boolean
	//     (das Laden der Lemmaliste wurde von der Benutzerin angestoßen)
	dtaFehler (fehlertyp, detail, aktiv) {
		// Fehlermeldung
		if (aktiv) {
			let text = `Beim Download der Formvarianten des DTA ist ein <strong>${fehlertyp}</strong> aufgetreten.`;
			if (detail) {
				text += `\n<h3>Fehlermeldung</h3>\n${detail}`;
			}
			dialog.oeffnen({
				typ: "alert",
				text: text,
			});
		}
	},
	// Arrays mit allen für die App relevanten Varianten in data.fv eintragen
	//   json = Object
	//     (die Daten, die vom DTA zurückgekommen sind)
	//   aktiv = Boolean
	//     (das Laden der Lemmaliste wurde von der Benutzerin angestoßen)
	dtaPush (json, aktiv) {
		let fehler = [];
		for (let token of json.body[0].tokens) {
			// Wort ermitteln
			const wort = token.text;
			// Abbruch, wenn dieses Token uninteressant ist
			if (!data.fv[wort]) {
				continue;
			}
			// Part-of-speech-Tag eintragen
			if (token.moot && token.moot.tag) {
				data.fv[wort].ps = token.moot.tag;
			}
			// ein eindimensionales Array mit allen Varianten erzeugen
			let varianten = [];
			for (let i of token.eqlemma) {
				if (helfer.checkType("Object", i) && i.hi) {
					varianten.push(i.hi);
				} else if (helfer.checkType("String", i)) {
					varianten.push(i);
				}
			}
			// bei merkwürdigen Wörtern und Fällen könnte es sein, dass nichts
			// ausgelesen werden konnte (z. B. wenn man sich vertippt)
			if (!varianten.length) {
				fehler.push(wort);
				continue;
			}
			// Varianten nach Länge sortieren (kürzeste zuerst)
			varianten.sort(helfer.sortLengthAlphaKurz);
			// Varianten ermitteln, die kürzere Varianten enthalten
			let ex = [];
			for (let i = 0, len = varianten.length; i < len; i++) {
				let variante = varianten[i];
				for (let j = 0; j < len; j++) {
					if (j === i) {
						continue;
					}
					if (varianten[j].includes(variante)) {
						ex.push(j);
					}
				}
			}
			// Varianten ermitteln, die nur in Groß- und Kleinschreibung variieren
			let variantenKopie = [...varianten];
			for (let i = 0, len = variantenKopie.length; i < len; i++) {
				variantenKopie[i] = variantenKopie[i].toLowerCase();
			}
			for (let i = 1, len = variantenKopie.length; i < len; i++) {
				if (variantenKopie[i] === variantenKopie[i - 1]) {
					ex.push(i);
				}
			}
			// das Wort, um das es geht, aus den Varianten entfernen
			// (es wurde bereits eingetragen und wird immer an Position 0 des Arrays stehen,
			// dabei aber nie gedruckt werden)
			if (varianten.includes(wort)) {
				varianten.splice(varianten.indexOf(wort), 1);
			}
			// alte, manuell hinzugefügte Varianten ermitteln, die nicht im DTA sind
			// (hier wird in jedem Fall auch das Wort gefunden, um das es geht)
			let variantenZt = [];
			if (data.fv[wort]) {
				for (let i of data.fv[wort].fo) {
					if (i.qu === "zt" &&
							!varianten.includes(i.va)) {
						variantenZt.push(i.va);
					}
				}
			}
			// jetzt können die für die App relevanten Varianten endlich eingetragen werden
			data.fv[wort].fo = [];
			for (let i = 0, len = variantenZt.length; i < len; i++) {
				data.fv[wort].fo.push({
					qu: "zt",
					va: variantenZt[i],
				});
			}
			for (let i = 0, len = varianten.length; i < len; i++) {
				if (ex.includes(i)) {
					continue;
				}
				data.fv[wort].fo.push({
					qu: "dta",
					va: varianten[i],
				});
			}
			// Varianten sortieren
			stamm.sortieren(data.fv[wort].fo, wort);
		}
		// ggf. Fehlermeldung auswerfen
		if (fehler.length) {
			let num = "in der Lemmaliste";
			if (fehler.length > 1) {
				num = "in den Lemmalisten";
			}
			stamm.dtaFehler(`Fehler ${num} von ${fehler.join(", ")}`, null, aktiv);
		}
		// Abschluss
		stamm.dtaAbschluss(aktiv);
	},
	// Import der Formvarianten abschließen, wenn aktiv durch User angestoßen
	//   aktiv = Boolean
	//     (Aktion wurde durch den User aktiv angestoßen)
	dtaAbschluss (aktiv) {
		if (!aktiv) {
			return;
		}
		kartei.karteiGeaendert(true);
		stamm.auflisten();
		document.getElementById("stamm-text").focus();
	},
};
