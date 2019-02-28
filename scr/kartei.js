"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
	pfad: "",
	// Müssen vor dem Neuerstellen, Öffnen oder Schließen einer Kartei noch
	// Änderungen gespeichert werden?
	checkSpeichern (funktion) {
		// zur Sicherheit den Fokus aus Textfeldern nehmen
		// (falls Änderungen noch nicht übernommen wurden)
		helfer.inputBlur();
		// Änderungen nocht nicht gespeichert
		if (beleg.geaendert || kartei.geaendert) {
			let text = "Die Kartei";
			if (beleg.geaendert) {
				text = "Der Beleg";
			}
			dialog.oeffnen("confirm", function() {
				if (!dialog.confirm) {
					funktion();
				}
			});
			dialog.text(`${text} wurde verändert, aber noch nicht gespeichert!\nMöchten Sie die Daten nicht lieber erst speichern?`);
			return;
		}
		// alle Änderungen bereits gespeichert
		funktion();
	},
	// bestehende Kartei öffnen (über den Öffnen-Dialog)
	oeffnen () {
		const {app, dialog} = require("electron").remote;
		const opt = {
			defaultPath: app.getPath("documents"),
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = optionen.data.letzter_pfad;
		}
		// Dialog anzeigen
		dialog.showOpenDialog(null, opt, function(datei) { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt!");
				return;
			}
			kartei.oeffnenEinlesen(datei[0]);
		});
	},
	// die übergebene Datei öffnen und einlesen
	//   datei = Dateipfad (kommt vom Öffnen-Dialog oder via Drag-and-Drop)
	oeffnenEinlesen (datei) {
		const fs = require("fs");
		fs.readFile(datei, "utf-8", function(err, content) {
			if (err) {
				kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten!\n<strong>Fehlermeldung:</strong><br>${err.message}`);
				return;
			}
			// Daten einlesen
			let data_tmp = {};
			// Folgt die Datei einer wohlgeformten JSON?
			try {
				data_tmp = JSON.parse(content);
			} catch (err_json) {
				kartei.dialogWrapper(`Beim Einlesen der Datei ist ein Fehler aufgetreten!\n<strong>Fehlermeldung:</strong><br>${err_json}`);
				return;
			}
			// Wirklich ein wgd-Datei?
			if (!data_tmp.t || data_tmp.t !== "wgd") {
				kartei.dialogWrapper("Die Datei wurde nicht eingelesen!\nEs handelt sich nicht um eine Karteikasten-Datei von <i>Wortgeschichte digital</i>!");
				return;
			}
			// Daten werden eingelesen => Änderungsmarkierungen kommen weg
			beleg.belegGeaendert(false);
			kartei.karteiGeaendert(false);
			// Okay! Datei kann eingelesen werden
			data = JSON.parse(content);
			kartei.wort = data.w;
			kartei.wortEintragen();
			kartei.pfad = datei;
			optionen.optionLetzterPfad();
			optionen.optionZuletzt();
			liste.aufbauen(true);
			liste.wechseln();
		});
	},
	// neue Kartei erstellen
	erstellen () {
		// Kartei-Pfad löschen
		kartei.pfad = "";
		// globales Datenobjekt initialisieren
		data = {
			w: kartei.wort, // Wort
			dc: new Date().toISOString(), // Datum Kartei-Erstellung
			dm: "", // Datum Kartei-Änderung
			e: [], // Bearbeiter
			n: "", // Notizen
			a: [], // Anhänge
			t: "wgd", // Datei ist eine wgd-Datei (immer dieser Wert)
			v: 1, // Version des Datei-Formats
			k: {}, // Karteikarten
			h: {}, // Kartenhaufen
			b: {}, // Bedeutungen
		};
		// Belegliste leeren (es könnten noch Belege von einer vorherigen Karte vorhanden sein)
		liste.aufbauenBasis(true);
		// neue Karte erstellen
		beleg.erstellen();
	},
	// geöffnete Kartei speichern
	speichern (speichern_unter) {
		// keine Kartei geöffnet
		if (!kartei.wort) {
			kartei.dialogWrapper("Es ist keine Kartei geöffnet!");
			return;
		}
		// Dialog-Komponente laden
		const {app, dialog} = require("electron").remote;
		// Speicher-Funktion
		function speichern (pfad) {
			let datum_modified = data.dm;
			data.dm = new Date().toISOString();
			const fs = require("fs");
			fs.writeFile(pfad, JSON.stringify(data), function(err) {
				if (err) {
					kartei.dialogWrapper(`Beim Speichern ist ein Fehler aufgetreten!\n<strong>Fehlermeldung:</strong><br>${err.message}`);
					data.dm = datum_modified;
					return;
				}
				kartei.pfad = pfad;
				optionen.optionLetzterPfad();
				optionen.optionZuletzt();
				kartei.karteiGeaendert(false);
			});
		}
		// Kartei-Datei besteht bereits
		if (kartei.pfad && !speichern_unter) {
			speichern(kartei.pfad);
			return;
		}
		// Kartei-Datei muss angelegt werden
		const opt = {
			defaultPath: `${app.getPath("documents")}/${kartei.wort}.wgd`,
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = `${optionen.data.letzter_pfad}/${kartei.wort}.wgd`;
		}
		// Dialog anzeigen
		dialog.showSaveDialog(null, opt, function(pfad) {
			if (pfad === undefined) {
				kartei.dialogWrapper("Die Datei wurde nicht gespeichert!");
				return;
			}
			speichern(pfad);
		});
	},
	// Dialogwrapper für die Öffnen- und Speichern-Funktionen
	// (da gibt es einen Namenskonflikt)
	dialogWrapper (text) {
		dialog.oeffnen("alert", null);
		dialog.text(text);
	},
	// Kartei schließen
	schliessen () {
		beleg.belegGeaendert(false);
		kartei.karteiGeaendert(false);
		data = {};
		kartei.wort = "";
		kartei.pfad = "";
		const wort = document.getElementById("wort");
		wort.classList.add("keine_kartei");
		wort.textContent = "keine Kartei geöffnet";
		helfer.sektionWechseln("start");
	},
	// Benutzer nach dem Wort fragen, für die eine Kartei angelegt werden soll
	wortErfragen () {
		dialog.oeffnen("prompt", function() {
			let wort = dialog.promptText();
			if (dialog.confirm && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei angelegt werden!");
			} else if (dialog.confirm && wort) {
				kartei.karteiGeaendert(true);
				beleg.belegGeaendert(false);
				kartei.wort = wort;
				kartei.wortEintragen();
				kartei.erstellen();
			}
		});
		dialog.text("Zu welchem Wort soll eine Kartei angelegt werden?");
	},
	// Wort bei Bedarf ändern
	wortAendern () {
		// noch keine Kartei geöffnet
		if (!kartei.wort) {
			kartei.wortErfragen();
			return;
		}
		// anbieten, das Wort zu ändern
		dialog.oeffnen("prompt", function() {
			let wort = dialog.promptText();
			if (dialog.confirm && wort === kartei.wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Das Wort wurde nicht geändert!");
			} else if (dialog.confirm && wort) {
				kartei.karteiGeaendert(true);
				kartei.wort = wort;
				data.w = wort;
				kartei.wortEintragen();
			} else if (dialog.confirm && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann das bestehende nicht geändert werden!");
			}
		});
		dialog.text("Soll das Wort geändert werden?");
		let prompt_text = document.getElementById("dialog_prompt_text");
		prompt_text.value = kartei.wort;
		prompt_text.select();
	},
	// Wort der aktuellen Kartei eintragen
	wortEintragen () {
		let cont = document.getElementById("wort");
		cont.classList.remove("keine_kartei");
		cont.textContent = kartei.wort;
	},
	// Kartei wurde geändert und nocht nicht gespeichert
	geaendert: false,
	// Anzeigen, dass die Kartei geändert wurde
	karteiGeaendert (geaendert) {
		kartei.geaendert = geaendert;
		let icon = document.getElementById("kartei_geaendert");
		if (geaendert) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
};
