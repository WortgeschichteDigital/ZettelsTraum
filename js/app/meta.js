"use strict";

let meta = {
	// Metadaten-Fenster einblenden
	oeffnen () {
		let fenster = document.getElementById("meta");
		// Fenster öffnen oder in den Vordergrund holen
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
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
		document.getElementById("meta-re").textContent = data.re;
		// Liste der BearbeterInnen erstellen
		meta.bearbAuflisten();
		// BearbeiterInnen-Feld leeren und fokussieren
		let be = document.getElementById("meta-be");
		be.value = "";
		be.focus();
	},
	// BearbeiterInnen des Zettels auflisten
	bearbAuflisten () {
		let cont = document.getElementById("meta-be-liste");
		helfer.keineKinder(cont);
		// keine Bearbeiter eingetragen
		if (!data.be.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("kein-wert");
			p.textContent = "keine BearbeiterIn registriert";
			return;
		}
		// BearbeiterInnen auflisten
		let b = [...data.be];
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
			if (optionen.data.personen.indexOf(bearb) === -1) {
				bearb += " +";
				p.title = "(BearbeiterIn manuell ergänzt)";
			}
			p.appendChild(document.createTextNode(bearb));
		}
	},
	// BearbeiterIn ergänzen
	bearbErgaenzen () {
		let be = document.getElementById("meta-be"),
			va = helfer.textTrim(be.value);
		// Uppala! Keine BearbeiterIn angegeben!
		if (!va) {
			dialog.oeffnen("alert", () => be.select());
			dialog.text("Sie haben keinen Namen eingegeben.");
			return;
		}
		// BearbeiterIn schon registriert
		if (data.be.indexOf(va) >= 0) {
			dialog.oeffnen("alert", () => be.select());
			dialog.text("Die BearbeiterIn ist schon in der Liste.");
			return;
		}
		// BearbeiterIn ergänzen und sortieren
		be.value = "";
		data.be.push(va);
		// Liste neu aufbauen
		meta.bearbAuflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
		// Erinnerungen-Icon auffrischen
		erinnerungen.check();
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
					data.be.splice(data.be.indexOf(bearb), 1);
					// neu auflisten
					meta.bearbAuflisten();
					// Änderungsmarkierung setzen
					kartei.karteiGeaendert(true);
					// Erinnerungen-Icon auffrischen
					erinnerungen.check();
				} else {
					document.getElementById("meta-be").focus();
				}
			});
			dialog.text(`Soll <i>${bearb}</i> wirklich aus der Liste entfernt werden?`);
		});
	},
	// Klick auf Button
	aktionButton (button) {
		button.addEventListener("click", function() {
			meta.bearbErgaenzen();
		});
	},
	// Tastatureingaben im Textfeld
	aktionText (input) {
		input.addEventListener("keydown", function(evt) {
			// Enter
			if (evt.which === 13) {
				evt.preventDefault();
			if (document.getElementById("dropdown")) {
					return;
				}
				meta.bearbErgaenzen();
			}
		});
	},
};
