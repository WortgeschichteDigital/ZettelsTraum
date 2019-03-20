"use strict";

let stamm = {
	// Formvarianten-Fenster einblenden
	oeffnen () {
		let fenster = document.getElementById("stamm");
		// Fenster öffnen oder in den Vordergrund holen
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
		for (let i = 0, len = data.wv.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Link
			if (i > 0) {
				let a = document.createElement("a");
				a.href = "#";
				a.classList.add("icon-link", "icon-entfernen");
				a.dataset.wv = data.wv[i];
				stamm.entfernen(a);
				p.appendChild(a);
			} else {
				let span = document.createElement("span");
				span.classList.add("platzhalter");
				span.textContent = " ";
				p.appendChild(span);
			}
			p.appendChild( document.createTextNode(data.wv[i]) );
		}
	},
	// Eintrag hinzufügen
	ergaenzen () {
		let text = document.getElementById("stamm-text"),
			va = helfer.textTrim(text.value);
		// Uppala! Kein Stamm angegeben!
		if (!va) {
			dialog.oeffnen("alert", () => text.select() );
			dialog.text("Sie haben keinen Stamm angegeben.");
			return;
		}
		// Stamm schon registriert
		if (data.wv.indexOf(va) >= 0) {
			dialog.oeffnen("alert", () => text.select() );
			dialog.text("Der Stamm ist schon in der Liste.");
			return;
		}
		// BearbeiterIn ergänzen und sortieren
		text.value = "";
		data.wv.push(va);
		// Liste neu aufbauen
		stamm.auflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
	},
	// Eintrag aus der Liste entfernen
	entfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let wv = this.dataset.wv;
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					// Löschen
					data.wv.splice(data.wv.indexOf(wv), 1);
					// neu auflisten
					stamm.auflisten();
					// Änderungsmarkierung setzen
					kartei.karteiGeaendert(true);
				} else {
					document.getElementById("stamm-text").focus();
				}
			});
			dialog.text(`Soll <i>${wv}</i> wirklich aus der Liste entfernt werden?`);
		});
	},
	// Klick auf Button
	aktionButton (button) {
		button.addEventListener("click", function() {
			stamm.ergaenzen();
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
};
