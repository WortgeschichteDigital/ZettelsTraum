"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
	pfad: "",
	// Müssen vor dem Schließen einer Kartei noch Änderungen gespeichert werden?
	// (Diese Funktion wird nur noch benötigt, wenn dieses Hauptfenster erhalten bleiben soll;
	// das entscheidet kartei.schliessen().)
	//   funktion = function
	//     (diese übergebene Funktion soll eigentlich ausgeführt werden, zur Sicherheit
	//     wird aber erst einmal karte.checkSpeichern() ausgeführt)
	checkSpeichern (funktion) {
		// zur Sicherheit den Fokus aus Textfeldern nehmen
		// (falls Änderungen noch nicht übernommen wurden)
		helfer.inputBlur();
		// Obacht! Änderungen noch nicht gespeichert!
		if (notizen.geaendert || tagger.geaendert || bedeutungen.geaendert || beleg.geaendert || kartei.geaendert) {
			sicherheitsfrage.warnen(funktion, {
				notizen: true,
				tagger: true,
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
			bd: { // Bedeutungsgerüste
				gn: "1",
				gr: {
					"1": {
						bd: [],
						na: "",
						sl: 2,
					},
				},
			},
			be: [], // BearbeiterIn
			dc: new Date().toISOString(), // Datum Kartei-Erstellung
			dm: "", // Datum Kartei-Änderung
			fv: {}, // Formvarianten
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
		// Kartendatum-Filter initialisieren
		filter.kartendatumInit();
		// Belegliste leeren: Es könnten noch Belege von einer vorherigen Karte vorhanden sein;
		// außerdem könnte es sein, dass die Bearbeiter*in keinen Beleg erstellt
		liste.aufbauen(true);
		// alle Overlays schließen
		overlay.alleSchliessen();
		// Bedeutungsgerüst-Fenster schließen
		bedeutungenWin.schliessen();
		// neue Karte erstellen
		beleg.erstellen();
	},
	// bestehende Kartei öffnen (über den Öffnen-Dialog)
	oeffnen () {
		const {app, dialog} = require("electron").remote;
		let opt = {
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
		const {ipcRenderer, remote} = require("electron"),
			schonOffen = ipcRenderer.sendSync("kartei-schon-offen", datei);
		if (schonOffen) {
			return;
		}
		// Ist die Datei gesperrt?
		let lockcheck = kartei.lock(datei, "check");
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
		// im aktuellen Fenster könnte eine Kartei geöffnet sein (kartei.pfad = true)
		// im aktuellen Fenster könnte gerade eine neue Kartei angelegt,
		//   aber noch nicht gespeichert worden sein (kartei.geaendert = true)
		// => neues Hauptfenster öffnen
		if (kartei.pfad || kartei.geaendert) {
			ipcRenderer.send("kartei-laden", datei);
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
			kartei.lock(datei, "lock");
			// Main melden, dass die Kartei in diesem Fenster geöffnet wurde
			ipcRenderer.send("kartei-geoeffnet", remote.getCurrentWindow().id, datei);
			// alle Overlays schließen
			overlay.alleSchliessen();
			// alle Filter zurücksetzen (wichtig für Text- und Zeitraumfilter)
			filter.ctrlReset(false);
			// Okay! Content kann eingelesen werden
			data = JSON.parse(content);
			// Karteiwort eintragen
			// (muss wegen konversion.von8nach9() vor der Konersion geschehen)
			kartei.wort = data.wo;
			// Konversion des Dateiformats anstoßen
			konversion.start();
			// Einleseoperationen
			helfer.formVariRegExp();
			kartei.wortEintragen();
			kartei.pfad = datei;
			optionen.aendereLetzterPfad();
			optionen.aendereZuletzt();
			notizen.icon();
			lexika.icon();
			anhaenge.scan(data.an);
			anhaenge.makeIconList(data.an, document.getElementById("kartei-anhaenge"));
			filter.kartendatumInit();
			liste.aufbauen(true);
			liste.wechseln();
			window.scrollTo({
				left: 0,
				top: 0,
				behavior: "auto",
			}); // war in dem Fenster schon eine Kartei offen, bleibt sonst die Scrollposition der vorherigen Kartei erhalten
			kartei.menusDeaktivieren(false);
			erinnerungen.check();
			helfer.geaendert(); // trägt das Wort in die Titelleiste ein
			// inaktive Filter schließen
			// (wurde zwar schon über filter.ctrlReset() ausgeführt,
			// muss hier aber noch einmal gemacht werden, um die dynamisch
			// aufgebauten Filter auch zu schließen)
			filter.inaktiveSchliessen(true);
			// Bedeutungsgerüst auf Korruption überprüfen
			bedeutungen.korruptionCheck();
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
		let opt = {
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
			if (bearb && !data.be.includes(bearb)) {
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
				helfer.animation("gespeichert");
				const {ipcRenderer, remote} = require("electron");
				ipcRenderer.send("kartei-geoeffnet", remote.getCurrentWindow().id, pfad);
			});
		}
	},
	// Kartei schließen
	schliessen () {
		// Gibt es noch ein anderes Hauptfenster? Wenn ja => dieses Fenster komplett schließen
		const {ipcRenderer, remote} = require("electron"),
			win = remote.getCurrentWindow(),
			hauptfensterOffen = ipcRenderer.sendSync("fenster-hauptfenster", win.id);
		if (hauptfensterOffen) {
			win.close();
			return;
		}
		// das aktuelle Fenster ist das letzte Hauptfenster => die Kartei in diesem Fenster schließen, das Fenster erhalten
		kartei.checkSpeichern(() => kartei.schliessenDurchfuehren());
	},
	// Kartei im aktuellen Fenster schließen, das Fenster selbst aber erhalten
	schliessenDurchfuehren () {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("kartei-geschlossen", remote.getCurrentWindow().id);
		kartei.lock(kartei.pfad, "unlock");
		notizen.notizenGeaendert(false);
		tagger.taggerGeaendert(false);
		beleg.belegGeaendert(false);
		bedeutungen.bedeutungenGeaendert(false);
		kartei.karteiGeaendert(false);
		overlay.alleSchliessen();
		bedeutungenWin.schliessen();
		data = {};
		kartei.wort = "";
		kartei.pfad = "";
		let wort = document.getElementById("wort");
		wort.classList.add("keine-kartei");
		wort.textContent = "keine Kartei geöffnet";
		helfer.geaendert(); // trägt das Wort aus der Titelleiste aus
		notizen.icon();
		lexika.icon();
		anhaenge.makeIconList(null, document.getElementById("kartei-anhaenge"));
		kopieren.uiOff(false);
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
		dialog.oeffnen("alert");
		dialog.text(text);
	},
	// Benutzer nach dem Wort fragen, für das eine Kartei angelegt werden soll
	wortErfragen () {
		// Ist schon eine Kartei offen? Wenn ja => neues Fenster öffnen, direkt nach dem Wort fragen
		if (kartei.wort) {
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("neues-wort");
			return;
		}
		// Es ist noch keine Kartei offen => nach dem Wort fragen
		dialog.oeffnen("prompt", function() {
			let wort = dialog.getPromptText();
			if (dialog.antwort && !wort) {
				dialog.oeffnen("alert");
				dialog.text("Sie müssen ein Wort eingeben, sonst kann keine Kartei angelegt werden.");
			} else if (dialog.antwort && wort) {
				kartei.lock(kartei.pfad, "unlock");
				const {ipcRenderer, remote} = require("electron");
				ipcRenderer.send("kartei-geoeffnet", remote.getCurrentWindow().id, "neu");
				kartei.karteiGeaendert(true);
				filter.ctrlReset(false);
				kartei.wort = wort;
				helfer.formVariRegExp();
				kartei.wortEintragen();
				kartei.erstellen();
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
				dialog.oeffnen("alert");
				dialog.text("Das Wort wurde nicht geändert.");
			} else if (dialog.antwort && wort) {
				kartei.karteiGeaendert(true);
				kartei.wort = wort;
				data.wo = wort;
				data.fv = {};
				stamm.dtaGet(false);
				kartei.wortEintragen();
				bedeutungenWin.daten();
			} else if (dialog.antwort && !wort) {
				dialog.oeffnen("alert");
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
		helfer.geaendert();
		let asterisk = document.getElementById("kartei-geaendert");
		if (geaendert) {
			asterisk.classList.add("geaendert");
		} else {
			asterisk.classList.remove("geaendert");
		}
	},
	// die App-Menüs teilweise deaktivieren oder komplett aktivieren
	//   disable = Boolean
	//     (true = Kartei wurde geschlossen, false = Kartei wurde geöffnet)
	menusDeaktivieren (disable) {
		const {ipcRenderer, remote} = require("electron");
		ipcRenderer.send("menus-deaktivieren", disable, remote.getCurrentWindow().id);
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
		let pfad = datei.match(/^(.+[/\\]{1})(.+)$/);
		const fs = require("fs"),
			lockfile = `${pfad[1]}.~lock.${pfad[2]}#`;
		if (aktion === "lock") {
			// alte Datei ggf. löschen
			// (Unter Windows gibt es Probleme, wenn die Datei direkt überschrieben werden soll.
			// Ist das vielleicht ein Node-BUG? Eigentlich sollte das nämlich gehen.)
			if (fs.existsSync(lockfile)) {
				fs.unlinkSync(lockfile);
			}
			// Lock-Datei erstellen
			const os = require("os"),
				host = os.hostname(),
				user = os.userInfo().username,
				datum = new Date().toISOString(),
				lockcontent = `${datum};;${host};;${user}`;
			fs.writeFile(lockfile, lockcontent, function(err) {
				if (err) {
					dialog.oeffnen("alert");
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
					dialog.oeffnen("alert");
					dialog.text(`Beim Löschen der Sperrdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`);
				}
			});
		} else if (aktion === "check") {
			if (fs.existsSync(lockfile)) {
				const lockcontent = fs.readFileSync(lockfile, "utf-8");
				if (!lockcontent) {
					return true; // gesperrt (zur Sicherheit, weil unklarer Status)
				}
				let datum_host_user = lockcontent.split(";;");
				const os = require("os"),
					host = os.hostname(),
					user = os.userInfo().username;
				// nicht sperren, wenn:
				//   derselbe Computer + dieselbe BenutzerIn
				//   vor mehr als 12 Stunden gesperrt
				if (host === datum_host_user[1] && user === datum_host_user[2] ||
						new Date() - new Date(datum_host_user[0]) > 432e5) {
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
