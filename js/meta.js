"use strict";

let meta = {
	// Fenster für Notizen einblenden
	oeffnen () {
		let fenster = document.getElementById("meta");
		// Fenster öffnen oder in den Vordergrund holen
		if ( overlay.oeffnen(fenster) ) { // Fenster ist schon offen
			return;
		}
		// Felder füllen, die nicht geändert werden können
		document.getElementById("meta-dc").textContent = helfer.datumFormat(data.dc);
		let dm = document.getElementById("meta-dm");
		if (data.dm) {
			dm.textContent = helfer.datumFormat(data.dm);
			dm.classList.remove("kein-wert");
		} else {
			dm.textContent = "noch nicht gespeichert";
			dm.classList.add("kein-wert");
		}
		let speicherort = document.getElementById("meta-speicherort"),
			pfad = "noch nicht gespeichert";
		if (kartei.pfad) {
			pfad = `\u200E${kartei.pfad}\u200E`;
			// Vor und hinter der Pfad-Angabe steht das nicht druckbare Steuer-Zeichen
			// U+200E (left-to-right mark, HTML-Notation: &lrm;). Dadurch behebe ich
			// sowohl im Absatz als auch im Title-Tag Darstellungsprobleme, die dazu
			// führen, dass Slashes am Anfang oder Ende der Pfadangabe plötzlich
			// an der (scheinbar) falschen Seite stehen. Das hängt mit der BiDi Class
			// der Slashes zusammen. Anders ist der Wunsch, eine linke Textellipse zu
			// haben, derzeit offenbar nicht zu realisieren.
			speicherort.title = pfad;
			speicherort.classList.remove("kein-wert");
		} else {
			speicherort.classList.add("kein-wert");
		}
		speicherort.innerHTML = pfad;
		document.getElementById("meta-r").textContent = data.r;
		// Textfelder leeren
		document.querySelectorAll(`#meta input[type="text"]`).forEach( (input) => input.value = "" );
		// Liste der BearbeterInnen
		meta.bearbAuflisten();
		// Liste der Lexika
		meta.lexikaAuflisten();
		// Fokus in Lexika-Feld
		document.querySelector("#meta-l-liste input").focus();
	},
	// BearbeiterInnen des Zettels auflisten
	bearbAuflisten () {
		let cont = document.getElementById("meta-e-liste");
		helfer.keineKinder(cont);
		// keine Bearbeiter eingetragen
		if (!data.e.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("kein-wert");
			p.textContent = "keine BearbeiterIn registriert";
			return;
		}
		// BearbeiterInnen auflisten
		let b = [...data.e];
		b.reverse();
		for (let i = 0, len = b.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Link
			let a = document.createElement("a");
			a.href = "#";
			a.classList.add("icon-link", "icon-entfernen");
			a.dataset.bearb = b[i];
			meta.bearbEntfernen(a);
			p.appendChild(a);
			// BearbeiterIn
			let bearb = b[i];
			if (privat.bearbeiterinnen.indexOf(bearb) === -1) {
				bearb += " +";
				p.title = "(BearbeiterIn manuell ergänzt)";
			}
			p.appendChild( document.createTextNode(bearb) );
		}
	},
	// BearbeiterIn ergänzen
	bearbErgaenzen () {
		let e = document.getElementById("meta-e"),
			v = helfer.textTrim(e.value);
		// Uppala! Keine BearbeiterIn angegeben!
		if (!v) {
			dialog.oeffnen("alert", () => e.select() );
			dialog.text("Sie haben keinen Namen angegeben.");
			return;
		}
		// BearbeiterIn schon registriert
		if (data.e.indexOf(v) >= 0) {
			dialog.oeffnen("alert", () => e.select() );
			dialog.text("Die BearbeiterIn ist schon in der Liste.");
			return;
		}
		// BearbeiterIn ergänzen und sortieren
		e.value = "";
		data.e.push(v);
		// Liste neu aufbauen
		meta.bearbAuflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// BearbeiterIn aus der Liste entfernen
	//   a = Element
	//     (Link vor der Bearbeiterin)
	bearbEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let bearb = this.dataset.bearb;
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					// Löschen
					data.e.splice(data.e.indexOf(bearb), 1);
					// neu auflisten
					meta.bearbAuflisten();
					// Änderungsmarkierung setzen
					kartei.karteiGeaendert(true);
				} else {
					document.getElementById("meta-e").focus();
				}
			});
			dialog.text(`Soll <i>${bearb}</i> wirklich aus der Liste entfernt werden?`);
		});
	},
	// vordefinierte Liste der Lexika, die überprüft werden sollten/könnten
	lexikaPreset: {
		"¹DWB": "Deutsches Wörterbuch",
		"²DWB": "Deutsches Wörterbuch (Neubearbeitung)",
		"AWB": "Althochdeutsches Wörterbuch",
		"FWB": "Frühneuhochdeutsches Wörterbuch",
		"Kluge": "Etymologisches Wörterbuch der deutschen Sprache",
		"MWB": "Mittelhochdeutsches Wörterbuch",
		"Paul": "Deutsches Wörterbuch",
		"Pfeifer": "Etymologisches Wörterbuch des Deutschen",
		"Schulz/Basler": "Deutsches Fremdwörterbuch",
		"Trübner": "Trübners Deutsches Wörterbuch",
	},
	// Liste der Lexika erstellen
	lexikaAuflisten () {
		// Liste leeren
		let cont = document.getElementById("meta-l-liste");
		helfer.keineKinder(cont);
		// Array erstellen
		let l = [];
		for (let i in meta.lexikaPreset) {
			if ( !meta.lexikaPreset.hasOwnProperty(i) ) {
				continue;
			}
			l.push(i);
		}
		for (let i = 0, len = data.l.length; i < len; i++) {
			if (!meta.lexikaPreset[ data.l[i] ]) {
				l.push(data.l[i]);
			}
		}
		// Liste aufbauen
		for (let i = 0, len = l.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Input
			let input = document.createElement("input");
			meta.lexikonUeberprueft(input);
			input.type = "checkbox";
			input.id = `lexikon-${i}`;
			input.value = l[i];
			if (data.l.indexOf(l[i]) >= 0) {
				input.checked = true;
			}
			p.appendChild(input);
			// Label
			let label = document.createElement("label");
			label.setAttribute("for", `lexikon-${i}`);
			p.appendChild(label);
			// title setzen oder Hinweis, dass das Lexikon manuell ergänzt wurde
			if (meta.lexikaPreset[ l[i] ]) {
				label.title = meta.lexikaPreset[ l[i] ];
				label.textContent = l[i];
			} else {
				label.title = `${l[i]} (Lexikon manuell ergänzt)`;
				label.textContent = `${l[i]} +`;
			}
		}
	},
	// Lexikon als überprüft kennzeichnen
	//   input = Element
	//     (Checkbox, die für ein Lexikon steht)
	lexikonUeberprueft (input) {
		input.addEventListener("change", function() {
			if (this.checked) {
				data.l.push(this.value);
			} else {
				data.l.splice(data.l.indexOf(this.value), 1);
			}
			kartei.karteiGeaendert(true);
		});
	},
	// Lexikon ergänzen
	lexikonErgaenzen () {
		let l = document.getElementById("meta-l"),
			v = helfer.textTrim(l.value);
		// Uppala! Kein Wert!
		if (!v) {
			dialog.oeffnen("alert", () => l.select() );
			dialog.text("Sie haben keinen Titel eingegeben.");
			return;
		}
		// Lexikon gibt es schon
		if ( document.querySelector(`#meta-l-liste input[value="${v}"]`) ) {
			dialog.oeffnen("alert", () => l.select() );
			dialog.text("Das Lexikon ist schon in der Liste.");
			return;
		}
		// Lexikon ergänzen und sortieren
		l.value = "";
		data.l.push(v);
		data.l.sort(function(a, b) {
			a = helfer.sortAlphaPrep(a);
			b = helfer.sortAlphaPrep(b);
			let x = [a, b];
			x.sort();
			if (x[0] === a) {
				return -1;
			}
			return 1;
		});
		// Liste neu aufbauen
		meta.lexikaAuflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Klick auf Button verteilen
	aktionButton (button) {
		button.addEventListener("click", function() {
			if ( this.id.match(/^meta-l/) ) {
				meta.lexikonErgaenzen();
			} else if ( this.id.match(/^meta-e/) ) {
				meta.bearbErgaenzen();
			}
		});
	},
	// Tastatureingaben in den Textfeldern abfangen
	aktionText (input) {
		input.addEventListener("keydown", function(evt) {
			// Enter
			if (evt.which === 13) {
				evt.preventDefault();
				if (this.id === "meta-l") {
					meta.lexikonErgaenzen();
				} else if (this.id === "meta-e") {
					meta.bearbErgaenzen();
				}
			}
		});
	},
};
