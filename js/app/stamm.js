"use strict";

let stamm = {
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
				text: "Die Liste der Formvarianten wird gerade erstellt.\nVersuchen Sie es in ein paar Sekunden noch einmal!",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("stamm");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Kopf erzeugen
		stamm.wortAkt = kartei.wort.split(" ")[0];
		stamm.kopf();
		// Liste erzeugen
		stamm.auflisten();
		// Fokus in das Textfeld
		document.getElementById("stamm-text").focus();
	},
	// speichert den Bestandteil des/eines mehrgliedrigen Karteiworts, dessen Liste gerade zu sehen ist
	// (ist das Karteiwort nur ein Wort => wortAkt === kartei.wort
	// ist das Karteiwort mehrgliedrig => wortAkt === 1. Wort des mehrgliedrigen Worts)
	wortAkt: "",
	// Kopf aufbauen
	kopf () {
		let cont = document.getElementById("stamm-kopf");
		helfer.keineKinder(cont);
		// Wortblöcke aufbauen
		let woerter = kartei.wort.split(" ");
		for (let i = 0, len = woerter.length; i < len; i++) {
			const wort = woerter[i];
			let span = document.createElement("span");
			cont.appendChild(span);
			span.dataset.wort = wort;
			if (i === 0) {
				span.classList.add("aktiv");
			}
			if (len > 1) {
				stamm.kopfAktiv(span);
			}
			// Input
			if (len > 1) {
				let input = document.createElement("input");
				span.appendChild(input);
				input.dataset.wort = wort;
				input.type = "checkbox";
				if (data.fv[wort].an) {
					input.checked = true;
					input.title = "Wort deaktivieren";
				} else {
					input.title = "Wort aktivieren";
				}
				stamm.kopfToggle(input);
			}
			// Wort
			span.appendChild(document.createTextNode(wort));
			// Internet-Icon
			let a = document.createElement("a");
			span.appendChild(a);
			a.classList.add("icon-link");
			a.dataset.wort = wort;
			a.href = "#";
			a.textContent = " ";
			a.title = `alle Formvarianten zum Wort „${wort}“ ansehen`;
			stamm.kopfOnline(a);
		}
	},
	// Aktivierung eines Wortes umschalten
	//   input = Element
	//     (die Checkbox)
	kopfToggle (input) {
		input.addEventListener("click", function(evt) {
			evt.stopPropagation();
			// Ist überhaupt noch eine Checkbox aktiv?
			if (!document.querySelector("#stamm-kopf input:checked")) {
				this.checked = true;
				return;
			}
			// Eintrag in Datenobjekt auffrischen
			const wort = this.dataset.wort;
			data.fv[wort].an = this.checked;
			if (this.checked) {
				this.title = "Wort deaktivieren";
			} else {
				this.title = "Wort aktivieren";
			}
			// Änderungsmarkierung setzen
			kartei.karteiGeaendert(true);
			// regulären Ausdruck mit allen Formvarianten neu erstellen
			helfer.formVariRegExp();
		});
	},
	// Wort auswählen, dessen Formvarianten aufgelistet werden sollen
	//   span = Element
	//     (der Inhaltsblock für das Wort))
	kopfAktiv (span) {
		span.addEventListener("click", function() {
			if (this.classList.contains("aktiv")) {
				return;
			}
			// Anzeige im Kopf ändern
			let aktiv = document.querySelector("#stamm-kopf .aktiv");
			aktiv.classList.remove("aktiv");
			this.classList.add("aktiv");
			// Liste ändern
			stamm.wortAkt = this.dataset.wort;
			stamm.auflisten();
		});
	},
	// alle Formvarianten online anzeigen
	//   a = Element
	//     (ein Link, der die Formvarianten-Liste im Netz aufrufen soll)
	kopfOnline (a) {
		a.addEventListener("click", function(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			if (evt.detail > 1) { // Doppelklicks abfangen
				return;
			}
			const url = `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=text&clean=1&pretty=1&raw=1&q=${encodeURIComponent(this.dataset.wort)}`,
				{shell} = require("electron");
			shell.openExternal(url);
		});
	},
	// Liste des aktuellen Worts aufbauen
	auflisten () {
		let cont = document.getElementById("stamm-liste");
		helfer.keineKinder(cont);
		// Einträge auflisten
		let fo = data.fv[stamm.wortAkt].fo;
		for (let i = 0, len = fo.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Platzhalter od. Löschlink
			// (gibt es nur einen Eintrag, darf dieser nicht gelöscht werden)
			if (len === 1) {
				let span = document.createElement("span");
				span.classList.add("platzhalter");
				span.textContent = " ";
				p.appendChild(span);
			} else {
				let a = document.createElement("a");
				a.href = "#";
				a.classList.add("icon-link", "icon-entfernen");
				a.dataset.fv = fo[i].va;
				stamm.entfernen(a);
				p.appendChild(a);
			}
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
	},
	// Eintrag hinzufügen
	ergaenzen () {
		let text = document.getElementById("stamm-text"),
			va = helfer.textTrim(text.value);
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
		// Variante schon registriert?
		let fo = data.fv[stamm.wortAkt].fo;
		for (let i = 0, len = fo.length; i < len; i++) {
			if (fo[i].va === va) {
				abbruch();
				return;
			}
		}
		// Variante ergänzen und sortieren
		text.value = "";
		fo.push({
			va: va,
			qu: "zt",
		});
		stamm.sortieren(fo);
		// Liste neu aufbauen
		stamm.auflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
		// regulären Ausdruck mit allen Formvarianten neu erstellen
		helfer.formVariRegExp();
		// Abbruchmeldung
		function abbruch () {
			dialog.oeffnen({
				typ: "alert",
				text: "Die Variante ist schon in der Liste.",
				callback: () => {
					text.select();
				},
			});
		}
	},
	// Liste der Formvariante sortieren
	//   arr = Array
	//     (Array mit den Varianten, das sortiert werden soll)
	sortieren (arr) {
		arr.sort(function(a, b) {
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
			let fv = this.dataset.fv;
			dialog.oeffnen({
				typ: "confirm",
				text: `Soll <i>${fv}</i> wirklich aus der Liste entfernt werden?`,
				callback: () => {
					if (dialog.antwort) {
						// Index ermitteln
						let idx = -1,
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
					} else {
						document.getElementById("stamm-text").focus();
					}
				},
			});
		});
	},
	// Klick auf Button
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
	aktionText (input) {
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
				evt.preventDefault();
				stamm.ergaenzen();
			}
		});
	},
	// speichert die Formvarianten, die das DTA liefert in Arrays
	// (in jedem Slot steht ein Objekt mit den Werten "hi" und "w";
	// hinter "hi" verbirgt sich die Variante)
	dtaEqlemma: {},
	// Promises vorbereiten
	//   aktiv = Boolean
	//     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
	dtaGet (aktiv) {
		stamm.ladevorgang = true;
		stamm.dtaEqlemma = {};
		let woerter = kartei.wort.split(" "),
			promises = [];
		// Wörter nach Länge sortieren und Objekte erzeugen
		woerter.sort(helfer.sortLengthAlpha);
		for (let wort of woerter) {
			if (!data.fv[wort]) {
				data.fv[wort] = {
					an: true,
					fo: [],
				};
			}
		}
		// Promises erzeugen und verarbeiten
		woerter.forEach(function(i) {
			promises.push(stamm.dtaRequest(i, aktiv));
		});
		Promise.all(promises).then(result => {
			if (!result.includes(false)) {
				// keine Fehler => Varianten bereinigen und eintragen
				stamm.dtaPush(aktiv);
			} else {
				// Fehler => zumindest die Karteiwörter eintragen
				kartei.wort.split(" ").forEach(function(wort) {
					if (!data.fv[wort].fo.length) {
						data.fv[wort].fo = [{
							qu: "zt",
							va: wort,
						}];
					}
				});
				stamm.dtaAbschluss(aktiv);
			}
			helfer.formVariRegExp();
			stamm.ladevorgang = false;
		});
	},
	// Request an das DTA schicken, um an die Formvarianten zu kommen
	//   wort = String
	//     (das Wort, zu dem die Formvarianten gezogen werden sollen)
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
					}
					// eqlemma-Liste extrahieren
					let eqlemma = [];
					try {
						eqlemma = json.body[0].tokens[0].eqlemma;
					} catch (err) {
						stamm.dtaFehler("Parsing-Fehler", "eqlemma is missing", aktiv);
						resolve(false);
					}
					// Okay, die Liste kann zwischengespeichert und nach dem Erfüllen aller Promises geparst werden
					stamm.dtaEqlemma[wort] = eqlemma;
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
	//   aktiv = Boolean
	//     (das Laden der Lemmaliste wurde von der Benutzerin angestoßen)
	dtaPush (aktiv) {
		let fehler = [];
		for (let wort in stamm.dtaEqlemma) {
			if (!stamm.dtaEqlemma.hasOwnProperty(wort)) {
				continue;
			}
			// ein eindimensionales Array mit allen Varianten erzeugen
			let varianten = [];
			for (let i of stamm.dtaEqlemma[wort]) {
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
			// alte, manuell hinzugefügte Varianten ermitteln, die nicht im DTA sind
			let variantenZt = [];
			if (data.fv[wort]) {
				for (let i of data.fv[wort].fo) {
					if (i.qu === "zt" &&
							!varianten.includes(i.va)) {
						variantenZt.push(i.va);
					}
				}
			}
			// ggf. das Wort hinzufügen, falls es nicht in der eqlemma-Liste ist
			if (!varianten.includes(wort)) {
				variantenZt.push(wort);
			}
			// jetzt können die für die App relevanten Varianten endlich eingetragen werden
			data.fv[wort].fo = [];
			for (let i = 0, len = varianten.length; i < len; i++) {
				if (ex.includes(i)) {
					continue;
				}
				data.fv[wort].fo.push({
					va: varianten[i],
					qu: "dta",
				});
			}
			for (let i = 0, len = variantenZt.length; i < len; i++) {
				data.fv[wort].fo.push({
					va: variantenZt[i],
					qu: "zt",
				});
			}
			// Varianten sortieren lassen
			stamm.sortieren(data.fv[wort].fo);
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
