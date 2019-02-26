"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
	pfad: "",
	// bestehende Kartei öffnen
	oeffnen () {
		const {app, dialog} = require("electron").remote;
		const optionen = {
			defaultPath: app.getPath("documents"),
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
			],
		};
		dialog.showOpenDialog(null, optionen, (datei) => { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt!");
				return;
			}
			const fs = require("fs");
			fs.readFile(datei[0], "utf-8", (err, content) => {
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
				// Okay! Datei kann eingelesen werden
				data = JSON.parse(content);
				kartei.wort = data.w;
				kartei.wortEintragen();
				kartei.pfad = datei[0];
				liste.aufbauen(true);
				liste.wechseln();
			});
		});
	},
	// neue Kartei erstellen
	erstellen () {
		// Kartei-Pfad löschen
		kartei.pfad = "";
		// globales Datenobjekt initialisieren
		data = {
			w: kartei.wort,
			dc: new Date().toISOString(),
			dm: "",
			e: [],
			n: "",
			a: [],
			t: "wgd",
			v: 1,
			k: {},
			h: {},
			b: {},
		};
		// neue Karte erstellen
		beleg.erstellenCheck();
	},
	// geöffnete Kartei speichern
	speichern () {
		// keine Kartei geöffnet
		if (!kartei.wort) {
			kartei.dialogWrapper("Es ist keine Kartei geöffnet!");
			return;
		}
		// Dialog-Komponente laden
		const {app, dialog} = require("electron").remote;
		// Speicher-Funktion
		let speichern = function (pfad) {
			let datum_modified = data.dm;
			data.dm = new Date().toISOString();
			const fs = require("fs");
			fs.writeFile(pfad, JSON.stringify(data), (err) => {
				if (err) {
					kartei.dialogWrapper(`Beim Speichern ist ein Fehler aufgetreten!\n<strong>Fehlermeldung:</strong><br>${err.message}`);
					data.dm = datum_modified;
					return;
				}
				kartei.pfad = pfad;
				kartei.karteiGeaendert(false);
			});
		};
		// Kartei-Datei besteht bereits
		if (kartei.pfad) {
			speichern(kartei.pfad);
			return;
		}
		// Kartei-Datei muss angelegt werden
		const optionen = {
			defaultPath: `${app.getPath("documents")}/${kartei.wort}.wgd`,
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
			],
		};
		dialog.showSaveDialog(null, optionen, (pfad) => {
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
	// Benutzer nach dem Wort fragen, für die eine Kartei angelegt werden soll
	wortErfragen () {
		dialog.oeffnen("prompt", function() {
			let wort = dialog.promptText();
			if (dialog.confirm && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei erstellt werden!");
			} else if (dialog.confirm && wort) {
				kartei.karteiGeaendert(true);
				kartei.wort = wort;
				kartei.wortEintragen();
				kartei.erstellen();
			}
		});
		dialog.text("Zu welchem Wort soll eine Kartei erstellt werden?");
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
