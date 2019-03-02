"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
	pfad: "",
	// Müssen vor dem Neuerstellen, Öffnen oder Schließen einer Kartei noch
	// Änderungen gespeichert werden?
	//   funktion = function
	//     (diese übergebene Funktion soll eigentlich ausgeführt werden, zur Sicherheit
	//     wird aber erst einmal karte.checkSpeichern() ausgeführt)
	checkSpeichern (funktion) {
		// zur Sicherheit den Fokus aus Textfeldern nehmen
		// (falls Änderungen noch nicht übernommen wurden)
		helfer.inputBlur();
		// Änderungen nocht nicht gespeichert
		if (beleg.geaendert || kartei.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort === false) {
					funktion();
				} else if (dialog.antwort) {
					if (beleg.geaendert) {
						beleg.aktionSpeichern();
					} else if (kartei.geaendert) {
						kartei.speichern(false);
					}
				}
			});
			let typ = "Die Kartei";
			if (beleg.geaendert) {
				typ = "Der Beleg";
			}
			dialog.text(`${typ} wurde noch nicht gespeichert!\nMöchten Sie die Daten nicht erst einmal speichern?`);
			return;
		}
		// alle Änderungen bereits gespeichert
		funktion();
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
		// Belegliste leeren: Es könnten noch Belege von einer vorherigen Karte vorhanden sein;
		// außerdem könnte es sein, dass die Bearbeiter*in keinen Beleg erstellt
		liste.aufbauen(true);
		// alle Overlays schließen
		overlay.alleSchliessen();
		// neue Karte erstellen
		beleg.erstellen();
	},
	// bestehende Kartei öffnen (über den Öffnen-Dialog)
	oeffnen () {
		const {app, dialog} = require("electron").remote;
		const opt = {
			title: "Kartei öffnen",
			defaultPath: app.getPath("documents"),
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
				{ name: "Alle Dateien", extensions: ["*"] },
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
	// die übergebene Datei einlesen
	//   datei = String
	//     (Dateipfad; kommt von der Startseite, dem Main-Prozess,
	//     dem Öffnen-Dialog oder via Drag-and-Drop)
	oeffnenEinlesen (datei) {
		const fs = require("fs");
		fs.readFile(datei, "utf-8", function(err, content) {
			if (err) {
				kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten!\n<h2>Fehlermeldung</h2>\n${err.message}`);
				return;
			}
			// Daten einlesen
			let data_tmp = {};
			// Folgt die Datei einer wohlgeformten JSON?
			try {
				data_tmp = JSON.parse(content);
			} catch (err_json) {
				kartei.dialogWrapper(`Beim Einlesen der Datei ist ein Fehler aufgetreten!\n<h2>Fehlermeldung</h2>\n${err_json}`);
				return;
			}
			// Wirklich eine wgd-Datei?
			if (data_tmp.t !== "wgd") {
				kartei.dialogWrapper("Die Datei wurde nicht eingelesen!\nEs handelt sich nicht um eine Karteikasten-Datei von <i>Wortgeschichte digital</i>!");
				return;
			}
			// Daten werden eingelesen => Änderungsmarkierungen kommen weg
			beleg.belegGeaendert(false);
			kartei.karteiGeaendert(false);
			// alle Overlays schließen
			overlay.alleSchliessen();
			// Okay! Datei kann eingelesen werden
			data = JSON.parse(content);
			kartei.wort = data.w;
			kartei.wortEintragen();
			kartei.pfad = datei;
			optionen.aendereLetzterPfad();
			optionen.aendereZuletzt();
			liste.aufbauen(true);
			liste.wechseln();
			kartei.menusDeaktivieren(false);
		});
	},
	// geöffnete Kartei speichern
	//   speichern_unter = Boolean
	//     (nicht automatisch in der aktuellen Datei speichern, sondern immer
	//     den Speichern-Dialog anzeigen)
	speichern (speichern_unter) {
		// Dialog-Komponente laden
		const {app, dialog} = require("electron").remote;
		// Kartei-Datei besteht bereits
		if (kartei.pfad && !speichern_unter) {
			speichern(kartei.pfad);
			return;
		}
		// Kartei-Datei muss angelegt werden
		const path = require("path");
		const opt = {
			title: "Kartei speichern",
			defaultPath: path.join(app.getPath("documents"), `${kartei.wort}.wgd`),
			filters: [
				{ name: "Wortgeschichte digital-Datei", extensions: ["wgd"] },
				{ name: "Alle Dateien", extensions: ["*"] },
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = path.join(optionen.data.letzter_pfad, `${kartei.wort}.wgd`);
		}
		// Dialog anzeigen
		dialog.showSaveDialog(null, opt, function(pfad) {
			if (pfad === undefined) {
				kartei.dialogWrapper("Die Datei wurde nicht gespeichert!");
				return;
			}
			speichern(pfad);
		});
		// Speicher-Funktion
		function speichern (pfad) {
			let dm_alt = data.dm;
			data.dm = new Date().toISOString();
			const fs = require("fs");
			fs.writeFile(pfad, JSON.stringify(data), function(err) {
				if (err) {
					kartei.dialogWrapper(`Beim Speichern der Datei ist ein Fehler aufgetreten!\n<h2>Fehlermeldung</h2>\n${err.message}`);
					data.dm = dm_alt; // altes Änderungsdatum wiederherstellen
					return;
				}
				kartei.pfad = pfad;
				optionen.aendereLetzterPfad();
				optionen.aendereZuletzt();
				kartei.karteiGeaendert(false);
			});
		}
	},
	// Kartei schließen
	schliessen () {
		beleg.belegGeaendert(false);
		kartei.karteiGeaendert(false);
		overlay.alleSchliessen();
		data = {};
		kartei.wort = "";
		kartei.pfad = "";
		const wort = document.getElementById("wort");
		wort.classList.add("keine-kartei");
		wort.textContent = "keine Kartei geöffnet";
		start.zuletzt();
		helfer.sektionWechseln("start");
		kartei.menusDeaktivieren(true);
	},
	// Dialogwrapper für die Öffnen- und Speichern-Funktionen
	// (da gibt es einen Namenskonflikt mit Electrons {dialog})
	//   text = String
	//     (Text, der im Dialog-Feld angezeigt werden soll)
	dialogWrapper (text) {
		dialog.oeffnen("alert", null);
		dialog.text(text);
	},
	// Benutzer nach dem Wort fragen, für das eine Kartei angelegt werden soll
	wortErfragen () {
		dialog.oeffnen("prompt", function() {
			let wort = dialog.getPromptText();
			if (dialog.antwort && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei angelegt werden!");
			} else if (dialog.antwort && wort) {
				kartei.karteiGeaendert(true);
				beleg.belegGeaendert(false);
				kartei.wort = wort;
				kartei.wortEintragen();
				kartei.erstellen();
				kartei.menusDeaktivieren(false);
			}
		});
		dialog.text("Zu welchem Wort soll die Kartei angelegt werden?");
	},
	// Wort durch Benutzer ändern
	wortAendern () {
		// noch keine Kartei geöffnet
		if (!kartei.wort) {
			kartei.wortErfragen();
			return;
		}
		// anbieten, das Wort zu ändern
		dialog.oeffnen("prompt", function() {
			let wort = dialog.getPromptText();
			if (dialog.antwort && wort === kartei.wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Das Wort wurde nicht geändert!");
			} else if (dialog.antwort && wort) {
				kartei.karteiGeaendert(true);
				kartei.wort = wort;
				data.w = wort;
				kartei.wortEintragen();
			} else if (dialog.antwort && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann das bestehende nicht geändert werden!");
			}
		});
		dialog.text("Soll das Wort geändert werden?");
		// Text im Prompt-Input eintragen
		let prompt_text = document.getElementById("dialog-prompt-text");
		prompt_text.value = kartei.wort;
		prompt_text.select();
	},
	// Wort der aktuellen Kartei in den Kopf eintragen
	wortEintragen () {
		let cont = document.getElementById("wort");
		cont.classList.remove("keine-kartei");
		cont.textContent = kartei.wort;
	},
	// Kartei wurde geändert und nocht nicht gespeichert
	geaendert: false,
	// Anzeigen, dass die Kartei geändert wurde
	//   geaendert = Boolean
	//     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
	karteiGeaendert (geaendert) {
		kartei.geaendert = geaendert;
		let icon = document.getElementById("kartei-geaendert");
		if (geaendert) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
	// die App-Menüs teilweise deaktivieren oder komplett aktivieren
	//   disable = Boolean
	//     (true = Kartei wurde geschlossen, false = Kartei wurde geöffnet)
	menusDeaktivieren (disable) {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("menus-deaktivieren", disable);
	},
};
