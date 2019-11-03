"use strict";

let meta = {
	// Metadaten-Fenster einblenden
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Kartei &gt; Metadaten</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("meta");
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
		document.getElementById("meta-ve").textContent = `Version ${data.ve}`;
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
		for (let i = 0, len = data.be.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Link
			let a = document.createElement("a");
			a.href = "#";
			a.classList.add("icon-link", "icon-entfernen");
			a.dataset.bearb = data.be[i];
			meta.bearbEntfernen(a);
			p.appendChild(a);
			// BearbeiterIn
			let bearb = data.be[i];
			if (!optionen.data.personen.includes(bearb)) {
				bearb += " +";
				p.title = "BearbeiterIn nicht in der Personenliste";
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
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keinen Namen eingegeben.",
				callback: () => {
					be.select();
				},
			});
			return;
		}
		// BearbeiterIn schon registriert
		if (data.be.includes(va)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Die BearbeiterIn ist schon in der Liste.",
				callback: () => {
					be.select();
				},
			});
			return;
		}
		// BearbeiterIn ergänzen und sortieren
		be.value = "";
		data.be.unshift(va);
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
			dialog.oeffnen({
				typ: "confirm",
				text: `Soll <i>${bearb}</i> wirklich aus der Liste entfernt werden?`,
				callback: () => {
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
				},
			});
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
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
				evt.preventDefault();
				if (document.getElementById("dropdown")) {
					return;
				}
				meta.bearbErgaenzen();
			}
		});
	},
};
