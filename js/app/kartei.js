"use strict";

let kartei = {
	// aktuelles Wort
	wort: "",
	// Pfad der geladenen Datei (dient zum automatischen Speichern der Datei)
	pfad: "",
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
			dc: new Date().toISOString(), // Datum Kartei-Erstellung
			dm: "", // Datum Kartei-Änderung
			fv: {}, // Formvarianten
			ka: {}, // Karteikarten
			le: [], // überprüfte Lexika usw.
			no: "", // Notizen
			rd: { // Redaktion
				be: [], // BearbeiterInnen
				bh: "", // behandelt in
				er: [{ // Ereignisse
					da: new Date().toISOString().split("T")[0],
					er: "Kartei erstellt",
					pr: "",
				}],
				sg: [], // Sachgebiete
			},
			re: 0, // Revision
			ty: "ztj", // Datei ist eine ZTJ-Datei (immer dieser Wert! Bis Version 0.24.0 stand in dem Feld "wgd")
			ve: konversion.version, // Version des Dateiformats
			wo: kartei.wort, // Wort
		};
		// Formvarianten aus dem DTA importieren
		stamm.dtaGet(kartei.wort, false);
		// ggf. für diesen Rechner registrierte BearbeiterIn eintragen
		if (optionen.data.einstellungen.bearbeiterin) {
			data.rd.be.push(optionen.data.einstellungen.bearbeiterin);
			data.rd.er[0].pr = optionen.data.einstellungen.bearbeiterin;
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
	async oeffnen () {
		let opt = {
			title: "Kartei öffnen",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: `${appInfo.name} JSON`,
					extensions: ["ztj"],
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
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: true,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Datei einlesen
		kartei.oeffnenEinlesen(result.filePaths[0]);
	},
	// die übergebene Datei einlesen
	//   datei = String
	//     (Dateipfad; kommt von der Startseite, dem Main-Prozess,
	//     dem Öffnen-Dialog oder via Drag-and-Drop)
	async oeffnenEinlesen (datei) {
		// Ist die Kartei schon offen?
		const {ipcRenderer} = require("electron"),
			schonOffen = await ipcRenderer.invoke("kartei-schon-offen", datei);
		if (schonOffen) {
			return;
		}
		// Ist die Datei gesperrt?
		let locked = await lock.actions({datei, aktion: "check"});
		if (locked) {
			lock.locked({info: locked});
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
		let content = await io.lesen(datei);
		if (!helfer.checkType("String", content)) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${content.name}: ${content.message}</p>`,
			});
			throw content;
		}
		// Daten sind in Ordnung => Einleseoperationen durchführen
		let data_tmp = {};
		// Folgt die Datei einer wohlgeformten JSON?
		try {
			data_tmp = JSON.parse(content);
		} catch (err_json) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json.name}: ${err_json.message}`,
			});
			return;
		}
		// Wirklich eine ZTJ-Datei?
		if (!/^(wgd|ztj)$/.test(data_tmp.ty)) { // bis Version 0.24.0 stand in dem Feld "wgd"
			dialog.oeffnen({
				typ: "alert",
				text: `Die Datei wurde nicht eingelesen.\nEs handelt sich nicht um eine <i>${appInfo.name} JSON</i>-Datei.`,
			});
			return;
		}
		// das Format der ZTJ-Datei wird von der installierten Programmversion nicht verstanden =>
		// Update bitte!
		if (data_tmp.ve > konversion.version) {
			dialog.oeffnen({
				typ: "alert",
				text: `Die Datei ist nicht kompatibel mit der installierten Version von <i>${appInfo.name}</i>.\nSie sollten ein <a href="#">Programm-Update</a> durchführen.`,
			});
			document.querySelector("#dialog-text a").addEventListener("click", evt => {
				evt.preventDefault();
				updates.fenster();
				overlay.schliessen(document.getElementById("dialog"));
				setTimeout(async () => {
					const {ipcRenderer} = require("electron");
					let data = await ipcRenderer.invoke("updates-get-data");
					if (!data.gesucht) {
						updates.check(false);
					}
				}, 500);
			});
			return;
		}
		// War die Datei evtl. verschwunden?
		zuletzt.verschwundenCheck(datei);
		// Datei sperren
		lock.actions({datei, aktion: "lock"});
		// Main melden, dass die Kartei in diesem Fenster geöffnet wurde
		ipcRenderer.send("kartei-geoeffnet", winInfo.winId, datei);
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
		zuletzt.aendern();
		anhaenge.makeIconList(data.an, document.getElementById("kartei-anhaenge"), true); // impliziert kopf.icons()
		filter.kartendatumInit();
		liste.statusOffen = {}; // sonst werden unter Umständen Belege aufgeklappt, selbst wenn alle geschlossen sein sollten; s. Changelog zu Version 0.23.0
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
	},
	// Speichern: Verteilerfunktion
	// (Rückgabewerte:
	//     false: es wurde nicht gespeichert oder der User muss eine Entscheidung treffen;
	//     true: es wurde erfolgreich gespeichert)
	//   speichern_unter = Boolean
	//     (nicht automatisch in der aktuellen Datei speichern, sondern immer
	//     den Speichern-Dialog öffnen)
	async speichern (speichern_unter) {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort && speichern_unter) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Kartei &gt; Speichern unter</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Wurden überhaupt Änderungen vorgenommen?
		if (!kartei.geaendert && !speichern_unter) {
			return false;
		}
		// Kartei-Datei besteht bereits
		if (kartei.pfad && !speichern_unter) {
			const resultat = await kartei.speichernSchreiben(kartei.pfad);
			return resultat;
		}
		// Kartei-Datei muss angelegt werden
		kartei.speichernUnter();
		return false;
	},
	// Speichern: Kartei schreiben
	//   pfad = String
	//     (Zielpfad der Kartei)
	speichernSchreiben (pfad) {
		return new Promise(async resolve => {
			// ggf. BearbeiterIn hinzufügen oder an die Spitze der Liste holen
			const bearb = optionen.data.einstellungen.bearbeiterin;
			let beAlt = [...data.rd.be];
			if (bearb) {
				if (data.rd.be.includes(bearb)) {
					data.rd.be.splice(data.rd.be.indexOf(bearb), 1);
				}
				data.rd.be.unshift(bearb);
			}
			// einige Werte müssen vor dem Speichern angepasst werden
			const dm_alt = data.dm,
				re_alt = data.re;
			data.dm = new Date().toISOString();
			data.re++;
			// Datei speichern
			let result = await io.schreiben(pfad, JSON.stringify(data));
			// beim Speichern ist ein Fehler aufgetreten
			if (result !== true) {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Speichern der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
				});
				// passiert ein Fehler, müssen manche Werte zurückgesetzt werden
				data.rd.be = [...beAlt];
				data.dm = dm_alt;
				data.re = re_alt;
				// Promise auflösen
				resolve(false);
				throw result;
			}
			// das Speichern war erfolgreich
			zuletzt.verschwundenCheck(pfad);
			if (!kartei.pfad) {
				lock.actions({datei: pfad, aktion: "lock"});
			} else if (pfad !== kartei.pfad) {
				lock.actions({datei: kartei.pfad, aktion: "unlock"});
				lock.actions({datei: pfad, aktion: "lock"});
			}
			kartei.pfad = pfad;
			optionen.aendereLetzterPfad();
			zuletzt.aendern();
			kartei.karteiGeaendert(false);
			helfer.animation("gespeichert");
			const {ipcRenderer} = require("electron");
			ipcRenderer.send("kartei-geoeffnet", winInfo.winId, pfad);
			// ggf. Liste der BearbeiterInnen im redaktionellen Metadaten-Fenster auffrischen
			if (!document.getElementById("red-meta").classList.contains("aus")) {
				redMeta.bearbAuflisten();
			}
			// ggf. Icons im Kopf des Hauptfensters auffrischen
			// (wichtig für das Ordner-Icon, das nach dem Speichern einer neuen Kartei erscheinen soll)
			kopf.icons();
			// Promise auflösen
			resolve(true);
		});
	},
	// Speichern: Pfad ermitteln
	async speichernUnter () {
		const path = require("path");
		let opt = {
			title: "Kartei speichern",
			defaultPath: path.join(appInfo.documents, `${kartei.wort}.ztj`),
			filters: [
				{
					name: `${appInfo.name} JSON`,
					extensions: ["ztj"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = path.join(optionen.data.letzter_pfad, `${kartei.wort}.ztj`);
		}
		// Dialog anzeigen
		const {ipcRenderer} = require("electron");
		let result = await ipcRenderer.invoke("datei-dialog", {
			open: false,
			winId: winInfo.winId,
			opt: opt,
		});
		// Fehler oder keine Datei ausgewählt
		if (result.message || !Object.keys(result).length) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
			});
			return;
		} else if (result.canceled) {
			return;
		}
		// Kartei speichern
		kartei.speichernSchreiben(result.filePath);
	},
	// Kartei schließen
	async schliessen () {
		// Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
		if (!kartei.wort) {
			dialog.oeffnen({
				typ: "alert",
				text: "Um die Funktion <i>Kartei &gt; Schließen</i> zu nutzen, muss eine Kartei geöffnet sein.",
			});
			return;
		}
		// Gibt es noch ein anderes Hauptfenster? Wenn ja => dieses Fenster komplett schließen
		const {ipcRenderer} = require("electron"),
			hauptfensterOffen = await ipcRenderer.invoke("fenster-hauptfenster", winInfo.winId);
		if (hauptfensterOffen) {
			ipcRenderer.invoke("fenster-schliessen");
			return;
		}
		// das aktuelle Fenster ist das letzte Hauptfenster => die Kartei in diesem Fenster schließen, das Fenster erhalten
		speichern.checkInit(() => {
			kartei.schliessenDurchfuehren();
		}, {
			kartei: true,
		});
	},
	// Kartei im aktuellen Fenster schließen, das Fenster selbst aber erhalten
	schliessenDurchfuehren () {
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("kartei-geschlossen", winInfo.winId);
		lock.actions({datei: kartei.pfad, aktion: "unlock"});
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
		belegImport.Datei.typ = "dta";
		belegImport.DateiReset();
		let wort = document.getElementById("wort");
		wort.classList.add("keine-kartei");
		wort.textContent = "keine Kartei geöffnet";
		helfer.geaendert(); // trägt das Wort aus der Titelleiste aus
		erinnerungen.allesOkay = true;
		anhaenge.makeIconList(null, document.getElementById("kartei-anhaenge"));
		kopf.icons();
		kopieren.uiOff(false);
		zuletzt.aufbauen();
		helfer.sektionWechseln("start");
		kartei.menusDeaktivieren(true);
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
		dialog.oeffnen({
			typ: "prompt",
			text: "Zu welchem Wort soll die Kartei angelegt werden?",
			platzhalter: "Karteiwort",
			callback: () => {
				let wort = dialog.getPromptText();
				if (dialog.antwort && !wort) {
					dialog.oeffnen({
						typ: "alert",
						text: "Sie müssen ein Wort eingeben, sonst kann keine Kartei angelegt werden.",
					});
				} else if (dialog.antwort && wort) {
					lock.actions({datei: kartei.pfad, aktion: "unlock"});
					const {ipcRenderer} = require("electron");
					ipcRenderer.send("kartei-geoeffnet", winInfo.winId, "neu");
					kartei.karteiGeaendert(true);
					filter.ctrlReset(false);
					kartei.wort = wort;
					helfer.formVariRegExp();
					kartei.wortEintragen();
					kartei.erstellen();
					kartei.menusDeaktivieren(false);
					erinnerungen.check();
				}
			},
		});
	},
	// Wort durch Benutzer ändern
	wortAendern () {
		// noch keine Kartei geöffnet
		if (!kartei.wort) {
			kartei.wortErfragen();
			return;
		}
		// anbieten, das Wort zu ändern
		dialog.oeffnen({
			typ: "prompt",
			text: "Soll das Wort geändert werden?",
			platzhalter: "Karteiwort",
			callback: () => {
				let wort = dialog.getPromptText();
				if (dialog.antwort && wort === kartei.wort) {
					dialog.oeffnen({
						typ: "alert",
						text: "Das Wort wurde nicht geändert.",
					});
				} else if (dialog.antwort && wort) {
					kartei.karteiGeaendert(true);
					kartei.wort = wort;
					data.wo = wort;
					data.fv = {};
					stamm.dtaGet(kartei.wort, false);
					kartei.wortEintragen();
					bedeutungenWin.daten();
				} else if (dialog.antwort && !wort) {
					dialog.oeffnen({
						typ: "alert",
						text: "Sie müssen ein Wort eingeben, sonst kann das bestehende nicht geändert werden.",
					});
				}
			},
		});
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
		const {ipcRenderer} = require("electron");
		ipcRenderer.send("menus-deaktivieren", disable, winInfo.winId);
	},
};
