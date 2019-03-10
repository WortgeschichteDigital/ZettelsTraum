"use strict";

// Gibt es neue Datentypen, die noch nicht gespeichert sein könnten,
// müssen nicht nur in diesem Script Anpassungen vorgenommen werden.
//
// Zusätzliche Änderungen:
//   app.js -> onbeforeunload()
//   kartei.js -> checkSpeichern()
//
// Außerdem brauchen *alle* Funktionen Anpassungen, die aus
// app.js -> load() heraus an kartei.checkSpeichern() übergeben werden.
//
// Wird das vergessen, kommt das Programm in eine Endlosschleife und stürzt ab!

let sicherheitsfrage = {
	funktion: function() {},
	// warnen, dass es noch ungespeicherte Daten gibt
	//   funktion = Function
	//     (die Funktion, die die BenutzerIn eigentlich ausführen wollte,
	//     also z.B. das Programm schließen, eine neue Kartei öffnen usw.)
	warnen (funktion) {
		sicherheitsfrage.funktion = funktion;
		// Warnen, dass Daten noch nicht gespeichert wurden
		// Obacht! Bei Ergänzungen auch an app.js und kartei.js denken!
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort === false) {
				sicherheitsfrage.funktion();
			} else if (dialog.antwort) {
				sicherheitsfrage.speichern();
			}
		});
		// Datentypen ermitteln, die noch gespeichert werden müssen
		let typen = [],
			mehrzahl = -1;
		if (notizen.geaendert) {
			typen.push("die Notizen");
			mehrzahl += 2;
		}
		if (beleg.geaendert) {
			typen.push("der Beleg");
			mehrzahl++;
		}
		if (kartei.geaendert) {
			typen.push("die Kartei");
			mehrzahl++;
		}
		// Texte vorbereiten
		let verb = mehrzahl ? "wurden" : "wurde",
			text = typen.join(", ");
		text = `${text.substring(0, 1).toUpperCase()}${text.substring(1)}`;
		text = text.replace(/,\s([^,]+)$/, (m, p) => ` und ${p}`);
		// Warnung anzeigen
		dialog.text(`${text} ${verb} noch nicht gespeichert.\nMöchten Sie die Daten nicht erst einmal speichern?`);
	},
	// die geplante Funktion soll nicht ausgeführt werden; die BenutzerIn hat sich für das Speichern entschieden
	speichern () {
		if (notizen.geaendert) {
			notizen.speichern();
		} else if (beleg.geaendert) {
			beleg.aktionSpeichern();
		} else if (kartei.geaendert) {
			kartei.speichern(false);
		}
	},
};