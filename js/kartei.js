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
		// Obacht! Änderungen nocht nicht gespeichert!
		if (notizen.geaendert || beleg.geaendert || kartei.geaendert) {
			sicherheitsfrage.warnen(funktion, {
				notizen: true,
				beleg: true,
				kartei: true,
			});
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
			wo: kartei.wort, // Wort
			wv: [kartei.wort], // Wortstammvariationen
			dc: new Date().toISOString(), // Datum Kartei-Erstellung
			dm: "", // Datum Kartei-Änderung
			re: 0, // Revision
			be: [], // Bearbeiter
			le: [], // überprüfte Lexika usw.
			an: [], // Anhänge
			no: "", // Notizen
			ty: "wgd", // Datei ist eine wgd-Datei (immer dieser Wert!)
			ve: 1, // Version des Datei-Formats
			ka: {}, // Karteikarten
			ha: {}, // Kartenhaufen
			bd: {}, // Bedeutungen
		};
		// ggf. für diesen Rechner registrierte BearbeiterIn eintragen
		if (optionen.data.einstellungen.bearbeiterin) {
			data.be.push(optionen.data.einstellungen.bearbeiterin);
		}
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
				{
					name: "Wortgeschichte digital-Datei",
					extensions: ["wgd"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = optionen.data.letzter_pfad;
		}
		// Dialog anzeigen
		dialog.showOpenDialog(null, opt, function(datei) { // datei ist ein Array!
			if (datei === undefined) {
				kartei.dialogWrapper("Sie haben keine Datei ausgewählt.");
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
				kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err.message}`);
				return;
			}
			// Daten einlesen
			let data_tmp = {};
			// Folgt die Datei einer wohlgeformten JSON?
			try {
				data_tmp = JSON.parse(content);
			} catch (err_json) {
				kartei.dialogWrapper(`Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json}`);
				return;
			}
			// Wirklich eine wgd-Datei?
			if (data_tmp.ty !== "wgd") {
				kartei.dialogWrapper("Die Datei wurde nicht eingelesen.\nEs handelt sich nicht um eine Karteikasten-Datei von <i>Wortgeschichte digital</i>.");
				return;
			}
			// Daten werden eingelesen => Änderungsmarkierungen kommen weg
			notizen.notizenGeaendert(false);
			beleg.belegGeaendert(false);
			kartei.karteiGeaendert(false);
			// alle Overlays schließen
			overlay.alleSchliessen();
			// alle Filter zurücksetzen (wichtig für Text- und Zeitraumfilter)
			filter.ctrlReset(false);
			// Okay! Datei kann eingelesen werden
			data = JSON.parse(content);
			kartei.wort = data.wo;
			kartei.wortEintragen();
			kartei.pfad = datei;
			optionen.aendereLetzterPfad();
			optionen.aendereZuletzt();
			notizen.icon();
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
		// Wurden überhaupt Änderungen vorgenommen?
		if (!speichern_unter && !kartei.geaendert) {
			kartei.dialogWrapper("Es wurden keine Änderungen vorgenommen.\nDie Kartei wurde nicht gespeichert.");
			return;
		}
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
				{
					name: "Wortgeschichte digital-Datei",
					extensions: ["wgd"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = path.join(optionen.data.letzter_pfad, `${kartei.wort}.wgd`);
		}
		// Dialog anzeigen
		dialog.showSaveDialog(null, opt, function(pfad) {
			if (pfad === undefined) {
				kartei.dialogWrapper("Die Kartei wurde nicht gespeichert.");
				return;
			}
			speichern(pfad);
		});
		// Speicher-Funktion
		function speichern (pfad) {
			// ggf. BearbeiterIn hinzufügen
			let bearb = optionen.data.einstellungen.bearbeiterin,
				bearb_ergaenzt = false;
			if (bearb && data.be.indexOf(bearb) === -1) {
				data.be.push(bearb);
				bearb_ergaenzt = true;
			}
			// einige Werte müssen vor dem Speichern angepasst werden
			let dm_alt = data.dm,
				re_alt = data.re;
			data.dm = new Date().toISOString();
			data.re++;
			// Dateisystemzugriff
			const fs = require("fs");
			fs.writeFile(pfad, JSON.stringify(data), function(err) {
				if (err) {
					kartei.dialogWrapper(`Beim Speichern der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err.message}`);
					// passiert ein Fehler, müssen manche Werte zurückgesetzt werden
					if (bearb_ergaenzt) {
						data.be.splice(data.be.indexOf(bearb), 1);
					}
					data.dm = dm_alt;
					data.re = re_alt;
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
		notizen.notizenGeaendert(false);
		beleg.belegGeaendert(false);
		kartei.karteiGeaendert(false);
		overlay.alleSchliessen();
		data = {};
		kartei.wort = "";
		kartei.pfad = "";
		const wort = document.getElementById("wort");
		wort.classList.add("keine-kartei");
		wort.textContent = "keine Kartei geöffnet";
		notizen.icon();
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
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei angelegt werden.");
			} else if (dialog.antwort && wort) {
				notizen.notizenGeaendert(false);
				beleg.belegGeaendert(false);
				kartei.karteiGeaendert(true);
				filter.ctrlReset(false);
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
				dialog.text("Das Wort wurde nicht geändert.");
			} else if (dialog.antwort && wort) {
				kartei.karteiGeaendert(true);
				kartei.wort = wort;
				data.wo = wort;
				data.wv[0] = wort;
				kartei.wortEintragen();
			} else if (dialog.antwort && !wort) {
				dialog.oeffnen("alert", null);
				dialog.text("Sie müssen ein Wort eingeben, sonst kann das bestehende nicht geändert werden.");
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
			icon.classList.add("geaendert");
		} else {
			icon.classList.remove("geaendert");
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
