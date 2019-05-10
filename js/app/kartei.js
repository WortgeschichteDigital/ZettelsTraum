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
		// Obacht! Änderungen noch nicht gespeichert!
		if (notizen.geaendert || bedeutungen.geaendert || beleg.geaendert || kartei.geaendert) {
			sicherheitsfrage.warnen(funktion, {
				notizen: true,
				bedeutungen: true,
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
			an: [], // Anhänge
			bd: {}, // Bedeutungen
			be: [], // BearbeiterIn
			dc: new Date().toISOString(), // Datum Kartei-Erstellung
			dm: "", // Datum Kartei-Änderung
			fv: [], // Formvarianten
			ha: {}, // Kartenhaufen
			ka: {}, // Karteikarten
			le: [], // überprüfte Lexika usw.
			no: "", // Notizen
			rd: [{ // Redaktion
				da: new Date().toISOString().split("T")[0],
				er: "Kartei erstellt",
				pr: "",
			}],
			re: 0, // Revision
			ty: "wgd", // Datei ist eine WGD-Datei (immer dieser Wert!)
			ve: konversion.version, // Version des Dateiformats
			wo: kartei.wort, // Wort
		};
		// Formvarianten aus dem DTA importieren
		stamm.dtaGet(false);
		// ggf. für diesen Rechner registrierte BearbeiterIn eintragen
		if (optionen.data.einstellungen.bearbeiterin) {
			data.be.push(optionen.data.einstellungen.bearbeiterin);
			data.rd[0].pr = optionen.data.einstellungen.bearbeiterin;
		}
		// Belegliste leeren: Es könnten noch Belege von einer vorherigen Karte vorhanden sein;
		// außerdem könnte es sein, dass die Bearbeiter*in keinen Beleg erstellt
		liste.aufbauen(true);
		// alle Overlays schließen
		overlay.alleSchliessen();
		// Bedeutungsgerüst-Fenster schließen
		bedeutungenWin.oeffnen(false);
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
			properties: [
				"openFile",
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
		// Ist die Kartei schon offen?
		if (datei === kartei.pfad) {
			kartei.dialogWrapper("Die Datei, die Sie zu öffnen versuchen, ist schon geöffnet.");
			return;
		}
		// Ist die Datei gesperrt?
		const lockcheck = kartei.lock(datei, "check");
		if (lockcheck) {
			let durch = "";
			if (Array.isArray(lockcheck)) {
				switch (lockcheck[0]) {
					case "computer":
						durch = ` durch Computer <i>${lockcheck[1]}</i>`;
						break;
					case "user":
						durch = ` durch BenutzerIn <i>${lockcheck[1]}</i>`;
						break;
				}
			}
			kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nDatei ist gesperrt${durch}`);
			return;
		}
		// Datei einlesen
		const fs = require("fs");
		fs.readFile(datei, "utf-8", function(err, content) {
			if (err) {
				kartei.dialogWrapper(`Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
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
			// Datei sperren
			if (kartei.pfad && datei !== kartei.pfad) {
				kartei.lock(kartei.pfad, "unlock");
			}
			kartei.lock(datei, "lock");
			// Daten werden eingelesen => Änderungsmarkierungen kommen weg
			notizen.notizenGeaendert(false);
			beleg.belegGeaendert(false);
			bedeutungen.bedeutungenGeaendert(false);
			kartei.karteiGeaendert(false);
			// alle Overlays schließen
			overlay.alleSchliessen();
			// Bedeutungsgerüst-Fenster schließen
			bedeutungenWin.oeffnen(false);
			// alle Filter zurücksetzen (wichtig für Text- und Zeitraumfilter)
			filter.ctrlReset(false);
			// Okay! Datei kann eingelesen werden
			data = JSON.parse(content);
			// Konversion des Dateiformats anstoßen
			konversion.start();
			// Einleseoperationen
			bedeutungen.konstituieren(); // für ältere Karteien, in denen data.bd noch nicht gefüllt ist
			kartei.wort = data.wo;
			kartei.wortEintragen();
			kartei.pfad = datei;
			optionen.aendereLetzterPfad();
			optionen.aendereZuletzt();
			notizen.icon();
			anhaenge.scan(data.an);
			anhaenge.makeIconList(data.an, document.getElementById("kartei-anhaenge"));
			liste.aufbauen(true);
			liste.wechseln();
			kartei.menusDeaktivieren(false);
			erinnerungen.check();
			// inaktive Filter schließen
			// (wurde zwar schon über filter.ctrlReset() ausgeführt,
			// muss hier aber noch einmal gemacht werden, um die dynamisch
			// aufgebauten Filter auch zu schließen)
			filter.inaktiveSchliessen(true);
		});
	},
	// geöffnete Kartei speichern
	//   speichern_unter = Boolean
	//     (nicht automatisch in der aktuellen Datei speichern, sondern immer
	//     den Speichern-Dialog anzeigen)
	speichern (speichern_unter) {
		// Wurden überhaupt Änderungen vorgenommen?
		if (!speichern_unter && !kartei.geaendert) {
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
					kartei.dialogWrapper(`Beim Speichern der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
					// passiert ein Fehler, müssen manche Werte zurückgesetzt werden
					if (bearb_ergaenzt) {
						data.be.splice(data.be.indexOf(bearb), 1);
					}
					data.dm = dm_alt;
					data.re = re_alt;
					return;
				}
				if (!kartei.pfad) {
					kartei.lock(pfad, "lock");
				} else if (pfad !== kartei.pfad) {
					kartei.lock(kartei.pfad, "unlock");
					kartei.lock(pfad, "lock");
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
		kartei.lock(kartei.pfad, "unlock");
		notizen.notizenGeaendert(false);
		beleg.belegGeaendert(false);
		bedeutungen.bedeutungenGeaendert(false);
		kartei.karteiGeaendert(false);
		overlay.alleSchliessen();
		bedeutungenWin.oeffnen(false);
		data = {};
		kartei.wort = "";
		kartei.pfad = "";
		const wort = document.getElementById("wort");
		wort.classList.add("keine-kartei");
		wort.textContent = "keine Kartei geöffnet";
		notizen.icon();
		anhaenge.makeIconList(null, document.getElementById("kartei-anhaenge"));
		start.zuletzt();
		helfer.sektionWechseln("start");
		kartei.menusDeaktivieren(true);
		erinnerungen.icon(false);
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
				kartei.lock(kartei.pfad, "unlock");
				notizen.notizenGeaendert(false);
				beleg.belegGeaendert(false);
				bedeutungen.bedeutungenGeaendert(false);
				kartei.karteiGeaendert(true);
				filter.ctrlReset(false);
				kartei.wort = wort;
				kartei.wortEintragen();
				kartei.erstellen();
				notizen.icon();
				anhaenge.makeIconList(null, document.getElementById("kartei-anhaenge"));
				kartei.menusDeaktivieren(false);
				erinnerungen.check();
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
				data.fv = [];
				stamm.dtaGet(false);
				kartei.wortEintragen();
				bedeutungenWin.daten();
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
	// Lock-Datei-Funktionen
	//   datei = String
	//     (Dateipfad)
	//   aktion = String
	//     (lock, unlock, check)
	lock (datei, aktion) {
		if (!datei) { // für just erstellte, aber noch nicht gespeicherte Dateien
			return;
		}
		const fs = require("fs"),
			pfad = datei.match(/^(.+[/\\]{1})(.+)$/),
			lockfile = `${pfad[1]}.~lock.${pfad[2]}#`;
		if (aktion === "lock") {
			const os = require("os"),
				host = os.hostname(),
				user = os.userInfo().username,
				datum = new Date().toISOString(),
				lockcontent = `${datum};;${host};;${user}`;
			fs.writeFile(lockfile, lockcontent, function(err) {
				if (err) {
					dialog.oeffnen("alert", null);
					dialog.text(`Beim Erstellen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
				}
			});
			// Datei unter Windows verstecken
			if (process.platform === "win32") {
				const child_process = require("child_process");
				child_process.spawn("cmd.exe", ["/c", "attrib", "+h", lockfile]);
			}
		} else if (aktion === "unlock") {
			fs.unlink(lockfile, function(err) {
				if (err) {
					dialog.oeffnen("alert", null);
					dialog.text(`Beim Löschen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
				}
			});
		} else if (aktion === "check") {
			if (fs.existsSync(lockfile)) {
				const lockcontent = fs.readFileSync(lockfile, "utf-8");
				if (!lockcontent) {
					return true; // gesperrt (zur Sicherheit, weil unklarer Status)
				}
				const datum_host_user = lockcontent.split(";;"),
					os = require("os"),
					host = os.hostname(),
					user = os.userInfo().username;
				// nicht sperren, wenn:
				//   derselbe Computer + dieselbe BenutzerIn
				//   vor mehr als 12 Stunden gesperrt
				if (host === datum_host_user[1] && user === datum_host_user[2] ||
						new Date() - new Date(datum_host_user[0]) > 43200000) {
					return false; // nicht gesperrt
				}
				if (datum_host_user[2]) {
					return ["user", datum_host_user[2]]; // gesperrt
				}
				return ["computer", datum_host_user[1]]; // gesperrt
			}
			return false; // nicht gesperrt
		}
	},
};
