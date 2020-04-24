"use strict";

let redMeta = {
	// Metdatenfenster einblenden
	oeffnen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Redaktion &gt; Metadaten</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-meta");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		fenster.querySelector("input").focus();
		// Behandelt-mit-Feld füllen
		document.getElementById("red-meta-behandelt-mit").value = data.rd.bh;
		// Sachgebiete aufbauen
		redMeta.sachgebiete();
		// Liste der BearbeterInnen erstellen und das Textfeld leeren
		redMeta.bearbAuflisten();
		let be = document.getElementById("red-meta-be");
		be.value = "";
	},
	// Sachgebiete auflisten
	sachgebiete () {
		let sg = document.getElementById("red-meta-sachgebiete"),
			sachgebiete = [],
			tags = optionen.data.tags.sachgebiete;
		if (tags) {
			// Sachgebiete-Tags vorhanden
			for (let i of data.rd.sg) {
				sachgebiete.push(tags.data[i.id].name);
			}
		} else {
			// Sachgebiete-Tags fehlen
			sg.textContent = "Sachgebiete-Datei fehlt";
			sg.classList.add("kein-wert");
			return;
		}
		// Tags anzeigen
		if (sachgebiete.length) {
			sg.classList.remove("kein-wert");
			sg.textContent = sachgebiete.join(", ");
		} else {
			sg.classList.add("kein-wert");
			sg.textContent = "keine Sachgebiete zugeordnet";
		}
	},
	// Sachgebiete hinzufügen
	sachgebieteAdd () {
		let tags = optionen.data.tags.sachgebiete;
		// keine Tag-Datei vorhanden
		if (!tags) {
			dialog.oeffnen({
				typ: "alert",
				text: `Das Programm muss zunächst mit einer Sachgebiete-Datei verknüpft werden.\nTag-Dateien können via <i>${appInfo.name} &gt; Einstellungen &gt; Bedeutungsgerüst</i> geladen werden.`,
				callback: () => document.getElementById("red-meta-behandelt-mit").focus(),
			});
			return;
		}
		// Tagger öffnen
		tagger.limit = ["sachgebiete"];
		tagger.oeffnen("red-meta");
	},
	// BearbeiterInnen des Zettels auflisten
	bearbAuflisten () {
		let cont = document.getElementById("red-meta-be-liste");
		helfer.keineKinder(cont);
		// keine BearbeiterInnen eingetragen
		if (!data.rd.be.length) {
			let p = document.createElement("p");
			cont.appendChild(p);
			p.classList.add("kein-wert");
			p.textContent = "keine BearbeiterIn registriert";
			return;
		}
		// BearbeiterInnen auflisten
		for (let i = 0, len = data.rd.be.length; i < len; i++) {
			let p = document.createElement("p");
			cont.appendChild(p);
			// Lösch-Link
			let a = document.createElement("a");
			p.appendChild(a);
			a.href = "#";
			a.classList.add("icon-link", "icon-entfernen");
			a.dataset.bearb = data.rd.be[i];
			redMeta.bearbEntfernen(a);
			// BearbeiterIn
			p.appendChild(document.createTextNode(data.rd.be[i]));
		}
	},
	// BearbeiterIn ergänzen
	bearbErgaenzen () {
		let be = document.getElementById("red-meta-be"),
			va = helfer.textTrim(be.value, true);
		// Uppala! Keine BearbeiterIn angegeben!
		if (!va) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keinen Namen eingegeben.",
				callback: () => be.select(),
			});
			return;
		}
		// BearbeiterIn schon registriert
		if (data.rd.be.includes(va)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Die BearbeiterIn ist schon in der Liste.",
				callback: () => be.select(),
			});
			return;
		}
		// BearbeiterIn ergänzen und Liste sortieren
		be.value = "";
		data.rd.be.unshift(va);
		// Liste neu aufbauen
		redMeta.bearbAuflisten();
		// Änderungsmarkierung setzen
		kartei.karteiGeaendert(true);
		// Erinnerungen-Icon auffrischen
		erinnerungen.check();
	},
	// BearbeiterIn aus der Liste entfernen
	//   a = Element
	//     (Löschlink vor der Bearbeiterin)
	bearbEntfernen (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let bearb = this.dataset.bearb,
				be = document.getElementById("red-meta-be");
			dialog.oeffnen({
				typ: "confirm",
				text: `Soll <i>${bearb}</i> wirklich aus der Liste entfernt werden?`,
				callback: () => {
					if (dialog.antwort) {
						// Löschen
						data.rd.be.splice(data.rd.be.indexOf(bearb), 1);
						// neu auflisten
						redMeta.bearbAuflisten();
						// Änderungsmarkierung setzen
						kartei.karteiGeaendert(true);
						// Erinnerungen-Icon auffrischen
						erinnerungen.check();
						// Fokus setzen
						be.focus();
					} else {
						be.focus();
					}
				},
			});
		});
	},
	// Klick auf Button
	aktionButton (button) {
		button.addEventListener("click", function() {
			redMeta.bearbErgaenzen();
		});
	},
	// Timeout, damit bei Tastureingabe im Behandelt-mit-Feld
	// gewisse Funktionen nicht zu häufig getriggert werden
	behandeltInTimeout: null,
	// Tastatureingaben in einem der Textfelder
	//   input = Element
	//     (das Textfeld)
	aktionText (input) {
		if (input.id === "red-meta-behandelt-mit") {
			input.addEventListener("input", function() {
				data.rd.bh = this.value;
				// die folgenden Funktionen nicht zu häufig aufrufen
				clearTimeout(redMeta.behandeltInTimeout);
				redMeta.behandeltInTimeout = setTimeout(() => {
					// Änderungsmarkierung setzen
					kartei.karteiGeaendert(true);
					// Erinnerungen-Icon auffrischen
					erinnerungen.check();
				}, 250);
			});
		} else if (input.id === "red-meta-be") {
			input.addEventListener("keydown", function(evt) {
				tastatur.detectModifiers(evt);
				if (!tastatur.modifiers && evt.key === "Enter") {
					evt.preventDefault();
					if (document.getElementById("dropdown")) {
						return;
					}
					redMeta.bearbErgaenzen();
				}
			});
		}
	},
};