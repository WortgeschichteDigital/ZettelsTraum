"use strict";

let stamm = {
	// Formvarianten-Fenster einblenden
	oeffnen () {
		// wird die Variantenliste gerade erstellt, darf sich das Fenster nicht öffnen
		if (!data.fv.length) {
			dialog.oeffnen("alert", null);
			dialog.text("Die Liste der Formvarianten wird gerade erstellt.\nVersuchen Sie es in ein paar Sekunden noch einmal!");
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("stamm");
		if ( overlay.oeffnen(fenster) ) { // Fenster ist schon offen
			return;
		}
		// Liste erzeugen
		stamm.auflisten();
		// Fokus in das Textfeld
		document.getElementById("stamm-text").focus();
	},
	// alle registrierten Einträge auflisten
	auflisten () {
		let cont = document.getElementById("stamm-liste");
		helfer.keineKinder(cont);
		// Einträge auflisten
		for (let i = 0, len = data.fv.length; i < len; i++) {
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
				a.dataset.fv = data.fv[i].va;
				stamm.entfernen(a);
				p.appendChild(a);
			}
			// Text
			p.appendChild( document.createTextNode(data.fv[i].va) );
			// Variante aus dem DTA?
			if (data.fv[i].qu === "dta") {
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
			dialog.oeffnen("alert", () => text.select() );
			dialog.text("Sie haben keine Variante eingegeben.");
			return;
		}
		// Variante schon registriert?
		for (let i = 0, len = data.fv.length; i < len; i++) {
			if (data.fv[i].va === va) {
				abbruch();
				return;
			}
		}
		// Variante ergänzen und sortieren
		text.value = "";
		data.fv.push({
			va: va,
			qu: "zt",
		});
		stamm.sortieren();
		// Liste neu aufbauen
		stamm.auflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
		// Abbruchmeldung
		function abbruch () {
			dialog.oeffnen("alert", () => text.select() );
			dialog.text("Die Variante ist schon in der Liste.");
		}
	},
	// Liste der Formvariante sortieren
	sortieren () {
		data.fv.sort(function(a, b) {
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
	entfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let fv = this.dataset.fv;
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					// Index ermitteln
					let idx = -1;
					for (let i = 0, len = data.fv.length; i < len; i++) {
						if (data.fv[i].va === fv) {
							idx = i;
							break;
						}
					}
					// Löschen
					data.fv.splice(idx, 1);
					// neu auflisten
					stamm.auflisten();
					// Änderungsmarkierung setzen
					kartei.karteiGeaendert(true);
				} else {
					document.getElementById("stamm-text").focus();
				}
			});
			dialog.text(`Soll <i>${fv}</i> wirklich aus der Liste entfernt werden?`);
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
			// Enter
			if (evt.which === 13) {
				evt.preventDefault();
				stamm.ergaenzen();
			}
		});
	},
	// Formvarianten des DTA laden
	//   aktiv = Boolean
	//     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
	dtaGet (aktiv) {
		let ajax = new XMLHttpRequest();
		ajax.open("GET", `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=json&clean=1&q=${encodeURIComponent(kartei.wort)}`, true);
		ajax.timeout = 5000;
		ajax.addEventListener("load", function () {
			if (ajax.status >= 200 && ajax.status < 300) {
				// JSON parse
				let json = {};
				try {
					json = JSON.parse(ajax.response);
				} catch (err) {
					stamm.dtaFehler("Parsing-Fehler", err, aktiv);
				}
				// eqlemma-Liste extrahieren
				let eqlemma = [];
				try {
					eqlemma = json.body[0].tokens[0].eqlemma;
				} catch (err) {
					stamm.dtaFehler("Parsing-Fehler", "eqlemma is missing", aktiv);
				}
				// Okay, die Liste kann geparst werden
				stamm.dtaPush(eqlemma, aktiv);
			} else {
				stamm.dtaFehler("Download-Fehler", null, aktiv);
			}
		});
		ajax.addEventListener("timeout", function () {
			stamm.dtaFehler("Timeout-Fehler", null, aktiv);
		});
		ajax.addEventListener("error", function () {
			stamm.dtaFehler("allgemeiner Fehler", null, aktiv);
		});
		ajax.send(null);
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
			dialog.oeffnen("alert", null);
			dialog.text(text);
		}
		// ist noch kein Wort in der Liste => das Kartei-Wort einfügen
		if (!data.fv.length) {
			data.fv.push({
				va: kartei.wort,
				qu: "zt",
			});
			kartei.karteiGeaendert(true);
		}
	},
	// Array mit allen für die App relevanten Varianten pushen
	//   eqlemma = Array
	//     (Array mit den Varianten; in jedem Slot steht ein Objekt mit den Werten
	//     "hi" und "w"; hinter "hi" verbirgt sich die Variante)
	dtaPush (eqlemma, aktiv) {
		// ein eindimensionales Array mit allen Varianten erzeugen
		let varianten = [];
		eqlemma.forEach(function(i) {
			if (helfer.checkType("Object", i) && i.hi) {
				varianten.push(i.hi);
			} else if ( helfer.checkType("String", i) ) {
				varianten.push(i);
			}
		});
		// bei merkwürdigen Wörtern und Fällen könnte es sein, dass nichts
		// ausgelesen werden konnte (z. B. wenn man sich vertippt)
		if (!varianten.length) {
			stamm.dtaFehler("Fehler in der Lemmaliste", null, aktiv);
			return;
		}
		// Varianten nach Länge sortieren (kürzeste zuerst)
		varianten.sort(function(a, b) {
			if (a.length > b.length) {
				return 1;
			} else if (a.length < b.length) {
				return -1;
			}
			return 0;
		});
		// Varianten ermitteln, die kürzere Varianten enthalten
		let ex = [];
		for (let i = 0, len = varianten.length; i < len; i++) {
			let variante = varianten[i];
			for (let j = 0; j < len; j++) {
				if (j === i) {
					continue;
				}
				if ( varianten[j].includes(variante) ) {
					ex.push(j);
				}
			}
		}
		// Varianten ermitteln, die nur in Groß- und Kleinschreibung variieren
		let variantenKopie = [...varianten];
		variantenKopie.forEach(function(i, n) {
			variantenKopie[n] = i.toLowerCase();
		});
		for (let i = 1, len = variantenKopie.length; i < len; i++) {
			if (variantenKopie[i] === variantenKopie[i - 1]) {
				ex.push(i);
			}
		}
		// alte, manuell hinzugefügte Varianten ermitteln, die nicht im DTA sind
		let variantenZt = [];
		for (let i = 0, len = data.fv.length; i < len; i++) {
			if (data.fv[i].qu === "zt" && varianten.indexOf(data.fv[i].va) === -1) {
				variantenZt.push(data.fv[i].va);
			}
		}
		// ggf. das Wort hinzufügen, falls es nicht in der eqlemma-Liste ist
		if (varianten.indexOf(kartei.wort) === -1) {
			variantenZt.push(kartei.wort);
		}
		// jetzt können die für die App relevanten Varianten endlich gepusht werden
		data.fv = [];
		for (let i = 0, len = varianten.length; i < len; i++) {
			if (ex.indexOf(i) >= 0) {
				continue;
			}
			data.fv.push({
				va: varianten[i],
				qu: "dta",
			});
		}
		for (let i = 0, len = variantenZt.length; i < len; i++) {
			data.fv.push({
				va: variantenZt[i],
				qu: "zt",
			});
		}
		// Varianten sortieren lassen
		stamm.sortieren();
		// ggf. Änderungsmarkierung machen und Liste neu aufbauen
		if (aktiv) {
			kartei.karteiGeaendert(true);
			stamm.auflisten();
			document.getElementById("stamm-text").focus();
		}
	},
};
