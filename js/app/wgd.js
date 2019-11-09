"use strict";

let wgd = {
	// Daten komprimieren
	//   daten = String
	//     (ein JSON-String, der komprimiert werden soll)
	gzipData (daten) {
		return new Promise(resolve => {
			const zlib = require("zlib");
			zlib.gzip(daten, (err, buffer) => {
				// Fehler beim Packen
				if (err) {
					resolve(err);
					return;
				}
				// Datei-Buffer zurückgeben
				resolve(buffer);
			});
		});
	},
	// Daten dekomprimieren
	//   daten = Buffer
	//     (ein Datei-Buffer, der dekomprimiert werden soll)
	unzipData (daten) {
		return new Promise(resolve => {
			const zlib = require("zlib");
			zlib.unzip(daten, (err, buffer) => {
				// Fehler beim Entpacken
				// (passiert u.a., wenn die Daten nicht komprimiert sind)
				if (err) {
					resolve(err);
					return;
				}
				// String zurückgeben
				// (standardmäßig mit encoding UTF-8)
				resolve(buffer.toString());
			});
		});
	},
	// (B)WGD-Datei lesen
	//   datei = String
	//     (Pfad zur Datei, die eingelesen werden soll)
	lesen (datei) {
		return new Promise(resolve => {
			const fsP = require("fs").promises;
			fsP.readFile(datei)
				.then(async buffer => {
					// Daten dekomprimieren
					let content = await wgd.unzipData(buffer);
					// Daten sind nicht String => Fehlermeldung => Daten im Buffer wohl gar nicht komprimiert
					// (Dateien wurden erst mit Version 0.24.0 komprimiert)
					if (!helfer.checkType("String", content)) {
						try {
							// sind die Datei-Daten schon JSON => Daten zurückgeben
							let daten = buffer.toString();
							JSON.parse(daten);
							resolve(daten);
						} catch (err) {
							// offenbar nicht => Fehler zurückgeben
							resolve(err);
						}
						return;
					}
					// Daten sind String => keine Fehlermeldung => Daten können zurückgegeben werden
					resolve(content);
				})
				.catch(err => resolve(err));
		});
	},
	// (B)WGD-Datei schreiben
	//   datei = String
	//     (Pfad zur Datei, in der die komprimierten Daten gespeichert werden sollen)
	//   daten = String
	//     (ein JSON-String, der komprimiert werden soll)
	schreiben (datei, daten) {
		return new Promise(async resolve => {
			// Daten packen
			let buffer = await wgd.gzipData(daten);
			// Fehlerbehandlung => beim Komprimieren ist etwas schiefgelaufen
			if (buffer.message) {
				resolve(buffer);
				return;
			}
			// Daten in Datei schreiben
			const fsP = require("fs").promises;
			fsP.writeFile(datei, buffer)
				.then(() => resolve(true))
				.catch(err => resolve(err));
		});
	},
};
