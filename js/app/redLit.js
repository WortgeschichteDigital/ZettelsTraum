"use strict";

let redLit = {
	// Fenster öffnen
	async oeffnen () {
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-lit");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// Suche zurücksetzen
		redLit.sucheReset();
		// Eingabeformular zurücksetzen
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
		// Pfad zur Datenbank ermitteln
		if (!redLit.db.path) {
			// noch keine Pfad geladen => in den Einstellungen gespeicherten Pfad übernehmen
			// (der kann natürlich ebenfalls leer sein)
			redLit.db.path = optionen.data["literatur-db"];
			redLit.db.mtime = "";
		} else if (optionen.data["literatur-db"] &&
				 optionen.data["literatur-db"] !== redLit.db.path) {
			// Pfad wurde in einem anderen Fenster geändert => übernehmen?
			await new Promise(resolve => setTimeout(() => resolve(true), 200)); // sonst wird DB-Fenster nicht sichtbar
			await new Promise(resolve => {
				dialog.oeffnen({
					typ: "confirm",
					text: `Der Datenbankpfad\n<p class="force-wrap"><i>${redLit.db.path}</i></p>\nwurde in einem anderen Programmfenster geändert in:\n<p class="force-wrap"><i>${optionen.data["literatur-db"]}</i></p>\nSoll die neue Datenbank auch in diesem Fenster geladen werden?`,
					callback: () => {
						if (dialog.antwort) {
							redLit.db.path = optionen.data["literatur-db"];
							redLit.db.mtime = "";
						} else {
							optionen.data["literatur-db"] = redLit.db.path;
							optionen.speichern();
						}
						resolve(true);
					},
				});
			});
		} else if (!optionen.data["literatur-db"]) {
			// in einem anderen Fenster wurde die DB entkoppelt =>
			// Pfad aus diesem Fenster an alle Fenster übertragen
			optionen.data["literatur-db"] = redLit.db.path;
			optionen.speichern();
		}
		// Pfadanzeige auffrischen
		redLit.dbAnzeige();
		// wenn Pfad bekannt =>
		//   1. Kann die DB geladen werden?
		//				wenn nicht => versuchen die Offline-Version zu laden
		//   2. Wurde die DB-Datei seit dem letzten Laden geändert?
		//        wenn ja => DB neu laden
		let dbGeladen = false;
		if (redLit.db.path) {
			const fs = require("fs"),
				fsP = fs.promises;
			let stats;
			try {
				stats = await fsP.lstat(redLit.db.path);
			} catch {
				// Datenbank kann nicht geladen werden
				// (kann temporär verschwunden sein, weil sie im Netzwerk liegt)
				redLit.db.gefunden = false;
				redLit.db.mtime = "";
				// versuchen, die Offline-Version zu laden
				const dbOffline = await redLit.dbLadenOffline();
				if (!dbOffline) {
					// Laden ist endgültig gescheitert => Datenbank entkoppeln
					redLit.dbEntkoppeln();
				} else {
					dbGeladen = true;
				}
			}
			// Datenbank kann geladen werden,
			// aber muss sie auch geladen werden?
			if (stats) {
				redLit.db.gefunden = true;
				const mtime = stats.mtime.toISOString();
				if (mtime !== redLit.db.mtime) {
					// Datenkbank laden
					redLit.db.mtime = mtime;
					dbGeladen = await new Promise(async resolve => {
						const result = await redLit.dbOeffnenEinlesen({pfad: redLit.db.path});
						if (result !== true) {
							dialog.oeffnen({
								typ: "alert",
								text: result,
							});
							resolve(false);
							return;
						}
						resolve(true);
					});
				} else {
					// Offline-Kopie erstellen, falls noch keine vorhanden ist
					// (die Offline-Kopie könnte beim Entkoppeln in einem anderen Hauptfenster
					// gelöscht worden sein)
					const offlinePfad = redLit.dbOfflineKopiePfad(redLit.db.path),
						offlineVorhanden = await helfer.exists(offlinePfad);
					if (!offlineVorhanden) {
						redLit.dbOfflineKopie(redLit.db.path);
					}
					dbGeladen = true;
				}
			}
		}
		// Operationenspeicher leeren
		redLit.db.dataOpts = [];
		// passendes Formular öffnen
		if (dbGeladen) {
			redLit.sucheWechseln();
		} else {
			redLit.eingabeHinzufuegen();
		}
	},
	// Fenster schließen
	schliessen () {
		if (redLit.db.locked) {
			dialog.oeffnen({
				typ: "alert",
				text: "Der Speichervorgang muss erst abgeschlossen werden.\nDanach können Sie das Fenster schließen.",
			});
			return;
		}
		redLit.dbCheck(() => {
			if (!redLit.db.path) {
				redLit.dbEntkoppeln();
			}
			overlay.ausblenden(document.getElementById("red-lit"));
		});
	},
	// Speichern wurde via Tastaturkürzel (Strg + S) angestoßen
	async speichern () {
		if (redLit.db.locked) {
			return;
		}
		// Einstellungen des Speichern-Befehls für die Kartei adaptieren
		let kaskade = {
			eingabe: true,
			db: true,
		};
		if (optionen.data.einstellungen.speichern === "2" && redLit.eingabe.changed) {
			// entweder Eingabeformular oder DB speichern
			kaskade.db = false;
		} else if (optionen.data.einstellungen.speichern === "3") {
			// nur DB speichern
			kaskade.eingabe = false;
		}
		// Eingabeformular nur speichern, wenn es auch sichtbar ist
		// (dort können vollständig ausgefüllte, gerade erst gelöschte Titelaufnahmen
		// lungern, die dann automatisch wieder hinzugefügt werden)
		if (document.getElementById("red-lit-eingabe").classList.contains("aus")) {
			kaskade.eingabe = false;
		}
		// Speichern
		if (kaskade.eingabe &&
				redLit.eingabe.changed) {
			const eingabeSpeichern = await redLit.eingabeSpeichern();
			if (!eingabeSpeichern) {
				return;
			}
		}
		if (kaskade.db &&
				redLit.db.changed) {
			redLit.dbSpeichern();
		}
	},
	// Datenbank: Speicher für Variablen
	db: {
		ve: 2, // Versionsnummer des aktuellen Datenbankformats
		data: {}, // Titeldaten der Literaturdatenbank (wenn DB geladen => Inhalt von DB.ti)
		dataTmp: {}, // temporäre Titeldaten der Literaturdatenbank (Kopie von redLit.db.data)
		dataOpts: [], // Operationenspeicher für alle Änderungen in redLit.db.data
		dataMeta: { // Metadaten der Literaturdatenbank
			dc: "", // Erstellungszeitpunkt (DB.dc)
			dm: "", // Änderungszeitpunkt (DB.dm)
			re: 0, // Revisionsnummer (DB.re)
		},
		path: "", // Pfad zur geladenen Datenbank
		mtime: "", // Änderungsdatum der DB-Datei beim Laden (ISO-String)
		gefunden: false, // Datenbankdatei gefunden (könnte im Netzwerk temporär verschwunden sein)
		changed: false, // Inhalt der Datenbank wurde geändert und noch nicht gespeichert
		locked: false, // Datenbank wird gerade geschrieben, ist also für die Bearbeitung gesperrt
		lockedInterval: null, // Intervall für den Lockbildschirm
	},
	// Datenkbank: versuchen, die Offline-Version zu laden
	dbLadenOffline () {
		return new Promise(async resolve => {
			const offlinePfad = redLit.dbOfflineKopiePfad(redLit.db.path),
				dbOffline = await helfer.exists(offlinePfad);
			if (dbOffline) {
				const result = await redLit.dbOeffnenEinlesen({pfad: offlinePfad, offline: true});
				if (result === true) { // Laden der Offline-Version war erfolgreich
					let span = document.createElement("span");
					span.textContent = "[offline]";
					document.getElementById("red-lit-pfad-db").appendChild(span);
					resolve(true);
					return;
				}
			}
			resolve(false);
		});
	},
	// Datenbank: Anzeige auffrischen
	dbAnzeige () {
		let pfad = document.getElementById("red-lit-pfad-db");
		if (!redLit.db.path) { // keine DB mit dem Programm verknüpft
			pfad.classList.add("keine-db");
			pfad.textContent = "keine Datenbank geladen";
		} else { // DB mit dem Programm verknüpft
			pfad.classList.remove("keine-db");
			pfad.textContent = `\u200E${redLit.db.path}\u200E`;
		}
		// Änderungsmarkierung zurücksetzen
		redLit.dbGeaendert(false);
	},
	// Datenbank: Inhalt wurde geändert
	//   geaendert = Boolean
	//     (DB wurde geändert)
	dbGeaendert (geaendert) {
		redLit.db.changed = geaendert;
		let changed = document.getElementById("red-lit-pfad-changed");
		if (geaendert) {
			changed.classList.add("changed");
		} else {
			changed.classList.remove("changed");
		}
	},
	// Datenbank: Listener für die Icon-Links
	//   a = Element
	//     (ein Icon-Link zum Speichern, Öffnen usw.)
	dbListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/-entkoppeln/.test(this.id)) {
				redLit.dbCheck(() => redLit.dbEntkoppeln());
			} else if (/-oeffnen/.test(this.id)) {
				redLit.dbCheck(() => redLit.dbOeffnen());
			} else if (/-exportieren/.test(this.id)) {
				redLit.dbExportierenFormat();
			} else if (/-speichern$/.test(this.id)) {
				redLit.dbSpeichern();
			} else if (/-speichern-unter$/.test(this.id)) {
				redLit.dbSpeichern(true);
			}
		});
	},
	// Datenbank: Verknüpfung mit der Datenbank auflösen
	async dbEntkoppeln () {
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// DB-Datensätze zurücksetzen
		redLit.db.data = {};
		redLit.db.dataTmp = {};
		redLit.db.dataOpts = [];
		redLit.db.dataMeta = {
			dc: "",
			dm: "",
			re: 0,
		};
		if (redLit.db.path) {
			// redLit.db.path überprüfen! Grund:
			// Wird die DB entkoppelt, das DB-Overlay-Fenster aber nicht geschlossen
			// und dann aus einem anderen Hauptfenster heraus ein neuer DB-Pfad übertragen,
			// würde der Pfad in diesem Hauptfenster beim Schließen des DB-Overlay-Fensters
			// nach einer Überprüfung von optionen.data["literatur-db"] erneut gelöscht.
			redLit.dbOfflineKopieUnlink(redLit.db.path);
			redLit.db.path = "";
			optionen.data["literatur-db"] = "";
			optionen.speichern();
		}
		redLit.db.mtime = "";
		redLit.db.gefunden = false;
		redLit.db.changed = false;
		// DB-Anzeige auffrischen
		redLit.dbAnzeige();
		// Suche zurücksetzen
		redLit.sucheReset();
		// Eingabeformular zurücksetzen
		// (setzt zugleich die Eingabe-Datensätze zurück)
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
	},
	// Datenbank: Datei öffnen
	async dbOeffnen () {
		let opt = {
			title: "Literaturdatenbank öffnen",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: `${appInfo.name} Literaturdatenbank`,
					extensions: ["ztl"],
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
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// Datei einlesen
		const ergebnis = await redLit.dbOeffnenEinlesen({pfad: result.filePaths[0]});
		// Öffnen abschließen
		redLit.dbOeffnenAbschließen({ergebnis, pfad: result.filePaths[0]});
	},
	// Datenbank: Datei einlesen
	//   pfad = String
	//     (Pfad zur Datei)
	//   offline = true || undefined
	//     (die Offlinedatei wird geöffnet => keine Offline-Kopie anlegen)
	//   zusammenfuehren = true || undefined
	//     (die Literaturdatenbank wird geladen, um sie mit den aktuellen Daten zusammenzuführen)
	dbOeffnenEinlesen ({pfad, offline = false, zusammenfuehren = false}) {
		return new Promise(async resolve => {
			let content = await io.lesen(pfad);
			if (!helfer.checkType("String", content)) {
				resolve(`Beim Öffnen der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${content.name}: ${content.message}</p>`);
				throw content;
			}
			// Daten sind in Ordnung => Einleseoperationen durchführen
			let data_tmp = {};
			// Folgt die Datei einer wohlgeformten JSON?
			try {
				data_tmp = JSON.parse(content);
			} catch (err_json) {
				resolve(`Beim Einlesen der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json.name}: ${err_json.message}`);
				throw err_json;
			}
			// Wirklich eine ZTL-Datei?
			if (data_tmp.ty !== "ztl") {
				resolve(`Die Literaturdatenbank konnte nicht eingelesen werden.\nEs handelt sich nicht um eine <i>${appInfo.name} Literaturdatenbank</i>.`);
				if (!zusammenfuehren) {
					redLit.dbEntkoppeln();
				}
				return;
			}
			// Daten ggf. konvertieren
			redLit.dbKonversion({daten: data_tmp});
			// Datei kann eingelesen werden
			redLit.db.data = data_tmp.ti;
			redLit.db.dataMeta.dc = data_tmp.dc;
			redLit.db.dataMeta.dm = data_tmp.dm;
			redLit.db.dataMeta.re = data_tmp.re;
			// Datenbank für Offline-Nutzung verfügbar halten
			if (!offline && !zusammenfuehren) {
				redLit.dbOfflineKopie(pfad);
			}
			// Promise auflösen
			resolve(true);
		});
	},
	// Datenbank: Öffnen der Datenbank abschließen
	//   ergebnis = true || String
	//     (bei Fehlermeldung String)
	//   pfad = String
	//     (Pfad zur geöffneten Datenbank)
	async dbOeffnenAbschließen ({ergebnis, pfad}) {
		if (ergebnis !== true) {
			// Einlesen ist gescheitert
			dialog.oeffnen({
				typ: "altert",
				text: ergebnis,
			});
			return;
		}
		// Datensätze auffrischen
		redLit.db.dataOpts = [];
		if (redLit.db.path !== pfad) {
			redLit.dbOfflineKopieUnlink(redLit.db.path);
			redLit.db.path = pfad;
			optionen.data["literatur-db"] = pfad;
			optionen.speichern();
		}
		const fs = require("fs"),
			fsP = fs.promises;
		let stats = await fsP.lstat(redLit.db.path);
		redLit.db.mtime = stats.mtime.toISOString();
		redLit.db.gefunden = true;
		redLit.db.changed = false;
		// DB-Anzeige auffrischen
		redLit.dbAnzeige();
		// Suche zurücksetzen
		redLit.sucheReset();
		// Eingabeformular zurücksetzen
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
	},
	// Datenbank: Exportformat erfragen
	dbExportierenFormat () {
		let fenster = document.getElementById("red-lit-export");
		overlay.oeffnen(fenster);
		fenster.querySelector("input:checked").focus();
	},
	// Datenbank: Export starten
	dbExportieren () {
		// Format ermitteln
		let format = {
			name: "XML",
			ext: "xml",
			content: "Literaturliste",
		};
		if (document.getElementById("red-lit-export-format-plain").checked) {
			format.name = "Text";
			format.ext = "txt";
		}
		// Fenster schließen
		overlay.schliessen(document.getElementById("red-lit-export"));
		document.getElementById("red-lit-pfad-exportieren").focus();
		// Titelaufnahmen zusammentragen und sortieren
		let aufnahmen = [];
		for (let id of Object.keys(redLit.db.data)) {
			aufnahmen.push({id, slot: 0});
		}
		aufnahmen.sort(helfer.sortSiglen);
		// Dateidaten erstellen
		let content = "";
		if (format.ext === "xml") {
			content = `<?xml-model href="rnc/Literaturliste.rnc" type="application/relax-ng-compact-syntax"?><WGD xmlns="http://www.zdl.org/ns/1.0"><Literaturliste>`;
			for (let i of aufnahmen) {
				content += redLit.dbExportierenSnippetXML(i);
			}
			content += `</Literaturliste></WGD>`;
			let parser = new DOMParser(),
				xmlDoc = parser.parseFromString(content, "text/xml");
			xmlDoc = helferXml.indent(xmlDoc);
			content = new XMLSerializer().serializeToString(xmlDoc);
			// Fixes
			content = content.replace(/\?>/, "?>\n");
			content += "\n";
		} else if (format.ext === "txt") {
			for (let i = 0, len = aufnahmen.length; i < len; i++) {
				if (i > 0) {
					content += "\n\n------------------------------\n\n";
				}
				content += redLit.dbExportierenSnippetPlain(aufnahmen[i]);
			}
			content += "\n";
		}
		// Datei schreiben
		karteisuche.trefferlisteExportierenDialog(content, format);
	},
	// Datenbank: Titelaufnahme-Snippet in XML erstellen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	dbExportierenSnippetXML ({id, slot}) {
		let ds = redLit.db.data[id][slot].td,
			snippet = `<Fundstelle xml:id="${id}">`;
		snippet += `<Sigle>${helferXml.maskieren({text: ds.si})}</Sigle>`;
		snippet += `<unstrukturiert>${helferXml.maskieren({text: ds.ti})}</unstrukturiert>`;
		if (ds.ul) {
			snippet += `<URL>${helferXml.maskieren({text: ds.ul})}</URL>`;
		}
		if (ds.ad) {
			let ad = ds.ad.split("-");
			snippet += `<Aufrufdatum>${ad[2]}.${ad[1]}.${ad[0]}</Aufrufdatum>`;
		}
		snippet += `<Fundort>${ds.fo}</Fundort>`;
		for (let i of ds.pn) {
			snippet += `<PPN>${i}</PPN>`;
		}
		snippet += "</Fundstelle>";
		return snippet;
	},
	// Datenbank: Titelaufnahme-Snippet in Plain-Text erstellen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	dbExportierenSnippetPlain ({id, slot}) {
		let ds = redLit.db.data[id][slot].td,
			snippet = `${ds.si}\n`;
		snippet += `${ds.ti}\n`;
		if (ds.ul) {
			snippet += `\t${ds.ul}`;
			if (ds.ad) {
				let ad = ds.ad.split("-");
				snippet += ` (Aufrufdatum: ${ad[2].replace(/^0/, "")}. ${ad[1].replace(/^0/, "")}. ${ad[0]})`;
			}
			snippet += "\n";
		}
		snippet += `\tFundort: ${ds.fo}`;
		if (ds.pn.length) {
			snippet += `\n\tPPN: ${ds.pn.join(", ")}`;
		}
		return snippet;
	},
	// Datenbank: Datei speichern
	//   speichernUnter = true || undefined
	//     (Dateidialog in jedem Fall anzeigen)
	async dbSpeichern (speichernUnter = false) {
		// Wurden überhaupt Änderungen vorgenommen?
		if (!redLit.db.changed &&
				!speichernUnter) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine Änderungen vorgenommen.",
			});
			return;
		}
		// Dateifpad ist bekannt, wurde aber nicht wiedergefunden => prüfen, ob er jetzt da ist
		if (redLit.db.path &&
				!redLit.db.gefunden) {
			redLit.db.gefunden = await helfer.exists(redLit.db.path);
		}
		// Dateipfad ist bekannt und wurde wiedergefunden => direkt schreiben
		if (redLit.db.path &&
				redLit.db.gefunden &&
				!speichernUnter) {
			const ergebnis = await redLit.dbSpeichernSchreiben({pfad: redLit.db.path});
			if (ergebnis === true) {
				redLit.dbAnzeige();
				redLit.dbOfflineKopie(redLit.db.path);
			} else if (ergebnis) {
				dialog.oeffnen({
					typ: "alert",
					text: ergebnis,
				});
			}
			return;
		}
		// Datei soll/muss neu angelegt werden
		redLit.dbSpeichernUnter();
	},
	// Datenkbank: Datei speichern unter
	async dbSpeichernUnter () {
		const path = require("path");
		let opt = {
			title: "Literaturdatenbank speichern",
			defaultPath: path.join(appInfo.documents, "Literaturdatenbank.ztl"),
			filters: [
				{
					name: `${appInfo.name} Literaturdatenbank`,
					extensions: ["ztl"],
				},
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
		};
		// Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
		if (optionen.data.letzter_pfad) {
			opt.defaultPath = path.join(optionen.data.letzter_pfad, "Literaturdatenbank.ztl");
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
		// Datenbankdatei schreiben
		let merge = false;
		const zielExists = await helfer.exists(result.filePath);
		if (zielExists && redLit.db.path && redLit.db.path !== result.filePath) {
			merge = true;
		}
		const ergebnis = await redLit.dbSpeichernSchreiben({pfad: result.filePath, merge});
		if (ergebnis !== true) {
			// Schreiben gescheitert
			if (ergebnis) {
				dialog.oeffnen({
					typ: "alert",
					text: ergebnis,
				});
			}
			return;
		}
		// ggf. Pfad zur Datenbankdatei speichern
		if (redLit.db.path !== result.filePath) {
			redLit.dbOfflineKopieUnlink(redLit.db.path);
			redLit.db.path = result.filePath;
			optionen.data["literatur-db"] = result.filePath;
			optionen.speichern();
		}
		// Anzeige auffrischen
		redLit.dbAnzeige();
		// Offline-Kopie speichern
		redLit.dbOfflineKopie(result.filePath);
	},
	// Datenbank: Datei schreiben
	//   pfad = String
	//     (Pfad zur Datei)
	//   merge = true || undefined
	//     (Datenbanken sollen verschmolzen werden)
	dbSpeichernSchreiben ({pfad, merge = false}) {
		return new Promise(async resolve => {
			// Ist die Datenkbank gesperrt?
			let locked = await lock.actions({
				datei: pfad,
				aktion: "check",
				maxLockTime: 3e5,
			});
			if (locked) {
				lock.locked({info: locked, typ: "Literaturdatenbank"});
				resolve("");
				return;
			}
			// Datenbank sperren
			await redLit.dbSperre(true);
			locked = await lock.actions({datei: pfad, aktion: "lock"});
			if (!locked) { // Fehler beim Sperren der Datei
				redLit.dbSperre(false);
				resolve("");
				return;
			}
			// Datenbanken zusammenführen?
			let mergeOpts = {
				angelegt: new Set(), // Titelaufnahme neu angelegt
				entfernt: new Set(), // Titelaufnahme komplett entfernt
				ergänzt: new Set(), // Titelaufnahme um Datensätze ergänzt
				geändert: new Set(), // ID einer Titelaufnahme geändert
			};
			let stats,
				merged = false;
			try {
				const fs = require("fs"),
					fsP = fs.promises;
				stats = await fsP.lstat(pfad);
			} catch {
				// Datei existiert wohl noch nicht => merge muss eigentlich === false sein;
				// aber sicher ist sicher; da kann so allerlei schiefgehen
				if (merge) {
					// Datenbank entsperren
					await redLit.dbSperre(false);
					lock.actions({datei: pfad, aktion: "unlock"});
					// Fehlermeldung
					resolve("Zusammenführen der Literaturdatenbanken gescheitert!\n<h3>Fehlermeldung</h3>\nkein Zugriff auf Zieldatei");
					return;
				}
			}
			// alte Metadaten merken für den Fall, dass das Speichern scheitert
			let metaPreMerge = {
				dc: redLit.db.dataMeta.dc,
				dm: redLit.db.dataMeta.dm,
				re: redLit.db.dataMeta.re,
			};
			// Ja, Datenbanken zusammenführen!
			if (stats && (merge || stats.mtime.toISOString() !== redLit.db.mtime)) {
				// Kopie der Titeldaten anlegen
				redLit.db.dataTmp = {};
				redLit.dbKlonen({quelle: redLit.db.data, ziel: redLit.db.dataTmp});
				// geänderte Datenbank herunterladen
				const result = await redLit.dbOeffnenEinlesen({pfad, zusammenfuehren: true});
				if (result !== true) {
					// Titeldaten wiederherstellen
					redLit.db.data = {};
					redLit.dbKlonen({quelle: redLit.db.dataTmp, ziel: redLit.db.data});
					// Metdaten zurücksetzen
					redLit.db.dataMeta.dc = metaPreMerge.dc;
					redLit.db.dataMeta.dm = metaPreMerge.dm;
					redLit.db.dataMeta.re = metaPreMerge.re;
					// Datenbank entsperren
					await redLit.dbSperre(false);
					lock.actions({datei: pfad, aktion: "unlock"});
					// Fehlermeldung
					resolve(`Zusammenführen der Literaturdatenbanken gescheitert!\n${result}`);
					return;
				}
				// ggf. Popup schließen
				redLit.anzeigePopupSchliessen();
				// Operationen seit dem letzten Speichern anwenden
				redLit.db.dataOpts.forEach(i => {
					if (i.aktion === "add") { // Datensatz hinzufügen
						if (!redLit.db.dataTmp[i.id]) {
							// die Titelaufnahme könnte angelegt und kurz danach wieder
							// komplett gelöscht worden sein
							return;
						}
						let aktion = "ergänzt";
						if (!redLit.db.data[i.id]) {
							aktion = "angelegt";
							redLit.db.data[i.id] = [];
						}
						let slot = redLit.db.dataTmp[i.id].findIndex(j => j.id === i.idSlot),
							ds = {};
						redLit.dbTitelKlonenAufnahme(redLit.db.dataTmp[i.id][slot], ds);
						if (redLit.db.data[i.id].some(j => j.id === i.idSlot)) {
							// sehr, sehr, sehr, sehr, sehr, sehr unwahrscheinlich,
							// könnte aber theoretisch sein, dass die ID schon vergeben ist
							ds.id += "0";
						}
						redLit.db.data[i.id].unshift(ds);
						mergeOpts[aktion].add(ds.td.si);
						merged = true;
					} else if (i.aktion === "del") {
						if (!redLit.db.data[i.id]) {
							return;
						}
						let slot = redLit.db.data[i.id].findIndex(j => j.id === i.idSlot);
						if (slot === -1) {
							return;
						}
						mergeOpts.entfernt.add(redLit.db.data[i.id][slot].td.si);
						merged = true;
						redLit.db.data[i.id].splice(slot, 1);
						if (!redLit.db.data[i.id].length) {
							delete redLit.db.data[i.id];
						}
					} else if (i.aktion === "changeId") {
						if (redLit.db.data[i.id] || !redLit.db.data[i.idAlt]) {
							return;
						}
						redLit.db.data[i.id] = [];
						redLit.dbTitelKlonen(redLit.db.data[i.idAlt], redLit.db.data[i.id]);
						delete redLit.db.data[i.idAlt];
						mergeOpts.geändert.add(redLit.db.data[i.id][0].td.si);
						merged = true;
					}
				});
			}
			// ggf. Datenbanken mergen
			if (merge) {
				for (let [k, v] of Object.entries(redLit.db.dataTmp)) {
					// Titelaufnahme nicht vorhanden => Aufnahme mit allen Versionen klonen
					if (!redLit.db.data[k]) {
						redLit.db.data[k] = [];
						redLit.dbTitelKlonen(v, redLit.db.data[k]);
						mergeOpts.angelegt.add(redLit.db.data[k][0].td.si);
						merged = true;
						continue;
					}
					// einzelne Versionen einer Titelaufnahme klonen
					const ergaenzt = redLit.dbTitelMergeAufnahmen(v, redLit.db.data[k]);
					if (ergaenzt) {
						mergeOpts.ergänzt.add(redLit.db.data[k][0].td.si);
						merged = true;
					}
				}
			}
			// alte Metadaten merken für den Fall, dass das Speichern scheitert
			let meta = {
				dc: redLit.db.dataMeta.dc,
				dm: redLit.db.dataMeta.dm,
				re: redLit.db.dataMeta.re,
			};
			// Metadaten auffrischen
			if (!redLit.db.dataMeta.dc) {
				redLit.db.dataMeta.dc = new Date().toISOString();
			}
			redLit.db.dataMeta.dm = new Date().toISOString();
			redLit.db.dataMeta.re++;
			// Daten schreiben
			let daten = redLit.dbSpeichernSchreibenDaten(),
				result = await io.schreiben(pfad, JSON.stringify(daten));
			// beim Schreiben ist ein Fehler aufgetreten
			if (result !== true) {
				if (merged) {
					// Titeldaten wiederherstellen
					redLit.db.data = {};
					redLit.dbKlonen({quelle: redLit.db.dataTmp, ziel: redLit.db.data});
					// Metdaten zurücksetzen
					redLit.db.dataMeta.dc = metaPreMerge.dc;
					redLit.db.dataMeta.dm = metaPreMerge.dm;
					redLit.db.dataMeta.re = metaPreMerge.re;
				} else {
					// Metdaten zurücksetzen
					redLit.db.dataMeta.dc = meta.dc;
					redLit.db.dataMeta.dm = meta.dm;
					redLit.db.dataMeta.re = meta.re;
				}
				// Datenbank entsperren
				await redLit.dbSperre(false);
				lock.actions({datei: pfad, aktion: "unlock"});
				// Fehlermeldung zurückgeben
				resolve(`Beim Speichern der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`);
				// Fehler auswerfen
				throw result;
			}
			// Operationenspeicher leeren
			redLit.db.dataOpts = [];
			// Änderungsdatum auffrischen
			const fs = require("fs"),
				fsP = fs.promises;
			stats = await fsP.lstat(pfad);
			redLit.db.mtime = stats.mtime.toISOString();
			// Datenbank entsperren
			await redLit.dbSperre(false);
			lock.actions({datei: pfad, aktion: "unlock"});
			// Datenbank wurde normal gespeichert => alles klar
			if (!merged) {
				resolve(true);
				return;
			}
			// Suchergebnisse auffrischen
			redLit.sucheTrefferAlleAuffrischen();
			// Rückmeldung, was beim Mergen getan wurde
			let text = "Ihre Änderungen wurden in eine neuere Version der Literaturdatenbank übertragen.";
			if (merge) {
				text = `Ihre Literaturdatenbank wurde mit\n<p class="force-wrap"><i>${pfad}</i></p>\nverschmolzen.`;
			} else if (!redLit.db.path) {
				text = "Ihre Änderungen wurden in die Literaturdatenbank integriert.";
			}
			text += "\nDabei wurden folgende Operationen ausgeführt:";
			for (let [k, v] of Object.entries(mergeOpts)) {
				if (!v.size) {
					continue;
				}
				let ziffer = "" + v.size;
				if (v.size === 1) {
					ziffer = "eine";
				}
				let numerus = "Titelaufnahme wurde";
				if (v.size > 1) {
					numerus = "Titelaufnahmen wurden";
				}
				let praep = "";
				if (k === "geändert") {
					praep = "von ";
					if (v.size === 1) {
						ziffer = "einer";
					} else {
						numerus = "Titelaufnahmen wurde";
					}
					k = "die ID geändert";
				}
				let siglen = [...v].sort(helfer.sortSiglen);
				text += `\n<p class="dialog-liste">• ${praep}${ziffer} ${numerus} ${k} (<i>${siglen.join(", ")}</i>)</p>`;
			}
			dialog.oeffnen({
				typ: "alert",
				text,
			});
			resolve(true);
		});
	},
	// Datenbank: Daten zuammentragen, die geschrieben werden sollen
	dbSpeichernSchreibenDaten () {
		return {
			dc: redLit.db.dataMeta.dc,
			dm: redLit.db.dataMeta.dm,
			re: redLit.db.dataMeta.re,
			ti: redLit.db.data,
			ty: "ztl",
			ve: redLit.db.ve,
		};
	},
	// Datenbank: Eingabefenster für Bearbeitung sperren
	//   sperren = Boolean
	//     (DB soll gesperrt werden)
	dbSperre (sperren) {
		return new Promise(async resolve => {
			// sperren
			if (sperren) {
				redLit.db.locked = true;
				document.activeElement.blur();
				// ggf. auf Schließen des Dropdownmenüs warten
				if (document.getElementById("dropdown")) {
					await new Promise(warten => setTimeout(() => warten(true), 500));
				}
				// Sperre erzeugen
				let sperre = document.createElement("div");
				document.querySelector("#red-lit > div").appendChild(sperre);
				sperre.id = "red-lit-sperre";
				let text = document.createElement("div");
				sperre.appendChild(text);
				text.textContent = "Speichern läuft ...";
				// Animation starten
				redLit.db.lockedInterval = setInterval(() => {
					let punkte = text.textContent.match(/\.+$/);
					if (punkte[0].length === 3) {
						text.textContent = "Speichern läuft .";
					} else {
						text.textContent += ".";
					}
				}, 1e3);
				resolve(true);
				return;
			}
			// entsperren
			await new Promise(warten => setTimeout(() => warten(true), 3e3));
			clearInterval(redLit.db.lockedInterval);
			let sperre = document.getElementById("red-lit-sperre");
			sperre.parentNode.removeChild(sperre);
			if (!document.getElementById("red-lit-suche").classList.contains("aus")) {
				document.getElementById("red-lit-suche-text").select();
			} else {
				document.getElementById("red-lit-eingabe-ti").focus();
			}
			redLit.db.locked = false;
			resolve(true);
		});
	},
	// Datenbank: Offline-Kopie im Einstellungenordner anlegen
	//   pfad = String
	//     (Pfad zur Datenkbank)
	dbOfflineKopie (pfad) {
		const offlinePfad = redLit.dbOfflineKopiePfad(pfad);
		let daten = redLit.dbSpeichernSchreibenDaten();
		io.schreiben(offlinePfad, JSON.stringify(daten));
	},
	// Datenbank: Pfad zur Offline-Kopie ermitteln
	//   pfad = String
	//     (Pfad zur Datenkbank)
	dbOfflineKopiePfad (pfad) {
		// Laufwerksbuchstabe entfernen (Windows)
		pfad = pfad.replace(/^[a-zA-Z]:/, "");
		// Pfad splitten
		const path = require("path");
		let reg = new RegExp(`${helfer.escapeRegExp(path.sep)}`),
			pfadSplit = pfad.split(reg);
		// Splits kürzen
		//   (damit der Dateiname nicht zu lang wird, aber noch eindeutig ist)
		// leere Slots am Anfang entfernen
		//   (kann sein, wenn die Datei z.B. in /Datei.ztl oder C:\Datei.ztl liegt)
		while (pfadSplit.length > 3 ||
				!pfadSplit[0]) {
			pfadSplit.shift();
		}
		return path.join(appInfo.userData, pfadSplit.join("_"));
	},
	// Datenbank: Offline-Kopie im Einstellungenordner löschen
	//   pfad = String
	//     (Pfad zur Datenkbank)
	async dbOfflineKopieUnlink (pfad) {
		if (!pfad) {
			return;
		}
		const offlinePfad = redLit.dbOfflineKopiePfad(pfad),
			offlineVorhanden = await helfer.exists(offlinePfad);
		if (offlineVorhanden) {
			const fs = require("fs"),
				fsP = fs.promises;
			fsP.unlink(offlinePfad);
		}
	},
	// Datenbank: prüft, ob noch ein Speichervorgang aussteht
	//   fun = Function
	//     (Callback-Funktion)
	//   db = false || undefined
	//     (überprüfen, ob die Datenbank gespeichert wurde)
	dbCheck (fun, db = true) {
		return new Promise(async resolve => {
			// Änderungen im Formular noch nicht gespeichert?
			if (redLit.eingabe.changed) {
				if (!document.getElementById("red-lit-nav-eingabe").checked) {
					redLit.nav("eingabe");
				}
				const speichern = await new Promise(antwort => {
					dialog.oeffnen({
						typ: "confirm",
						text: "Die Titelaufnahme im Eingabeformular wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Titelaufnahme nicht erst einmal speichern?",
						callback: () => {
							if (dialog.antwort) {
								redLit.eingabeSpeichern();
								antwort(true);
							} else if (dialog.antwort === false) {
								redLit.eingabe.changed = false;
								antwort(false);
							} else {
								antwort(null);
							}
						},
					});
				});
				if (speichern || speichern === null) {
					resolve(false);
					return;
				}
			}
			// Änderungen in der DB noch nicht gespeichert?
			if (db && redLit.db.changed) {
				let text = "Die Datenbank wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Datenbank nicht erst einmal speichern?";
				if (!redLit.db.path) {
					text = "Sie haben Titelaufnahmen angelegt, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal in einer Datenbank speichern?";
				}
				const speichern = await new Promise(antwort => {
					dialog.oeffnen({
						typ: "confirm",
						text,
						callback: () => {
							if (dialog.antwort) {
								redLit.dbSpeichern();
								antwort(true);
							} else if (dialog.antwort === false) {
								redLit.db.mtime = ""; // damit die DB beim erneuten Öffnen des Fenster neu geladen wird
								redLit.db.changed = false;
								antwort(false);
							} else {
								antwort(null);
							}
						},
					});
				});
				if (speichern || speichern === null) {
					resolve(false);
					return;
				}
			}
			// es steht nichts mehr aus => Funktion direkt ausführen
			fun();
			resolve(true);
		});
	},
	// Datenbank: alle Titeldaten klonen
	//   quelle = Object
	//     (Quelle der Titeldaten)
	//   ziel = Object
	//     (Ziel der Titeldaten, also der Klon)
	dbKlonen ({quelle, ziel}) {
		for (let [k, v] of Object.entries(quelle)) {
			ziel[k] = [];
			redLit.dbTitelKlonen(v, ziel[k]);
		}
	},
	// Datenbank: kompletten Datensatz einer Titelaufnahme klonen
	//   quelle = Object
	//     (der Quell-Datensatz)
	//   ziel = Object
	//     (der Ziel-Datensatz)
	dbTitelKlonen (quelle, ziel) {
		for (let i = 0, len = quelle.length; i < len; i++) {
			let ds = {};
			redLit.dbTitelKlonenAufnahme(quelle[i], ds);
			ziel.push(ds);
		}
	},
	// Datenbank: einzelnen Datensatz einer Titelaufnahme klonen
	//   quelle = Object
	//     (der Quell-Datensatz)
	//   ziel = Object
	//     (der Ziel-Datensatz)
	dbTitelKlonenAufnahme (quelle, ziel) {
		for (let [k, v] of Object.entries(quelle)) {
			if (helfer.checkType("Object", v)) { // Objects
				ziel[k] = {};
				redLit.dbTitelKlonenAufnahme(v, ziel[k]);
			} else if (Array.isArray(v)) { // Arrays
				ziel[k] = [...v];
			} else { // Primitiven
				ziel[k] = v;
			}
		}
	},
	// Datenbank: alle in einer Titelaufnahme nicht vorhandenen Datensätze kopieren
	//   quelle = Array
	//     (der Quell-Titelaufnahme)
	//   ziel = Array
	//     (der Ziel-Titelaufnahme)
	dbTitelMergeAufnahmen (quelle, ziel) {
		let ergaenzt = false;
		quelle.forEach(aq => {
			if (ziel.some(i => i.id === aq.id)) {
				return;
			}
			let ds = {};
			redLit.dbTitelKlonenAufnahme(aq, ds);
			let dsDatum = new Date(ds.da),
				slot = -1;
			for (let i = 0, len = ziel.length; i < len; i++) {
				let zielDatum = new Date(ziel[i].da);
				if (dsDatum > zielDatum) {
					slot = i;
					break;
				}
			}
			if (slot === -1) {
				ziel.push(ds);
			} else {
				ziel.splice(slot, 0, ds);
			}
			ergaenzt = true;
		});
		return ergaenzt;
	},
	// Datenbank: an neue Formate anpassen
	// (WICHTIG! Aktuelle Format-Version in redLit.db.ve einstellen!)
	//   daten = Object
	//     (die kompletten JSON-Daten einer ZTL-Datei)
	dbKonversion ({daten}) {
		// Datenbank hat die aktuelle Version
		if (daten.ve === redLit.db.ve) {
			return;
		}
		// von v1 > v2
		if (daten.ve === 1) {
			// Tag-Array in allen Datensätzen ergänzen
			for (let ti of Object.values(daten.ti)) {
				for (let i of ti) {
					i.td.tg = [];
				}
			}
			daten.ve++;
			redLit.dbGeaendert(true);
		}
	},
	// Navigation: Listener für das Umschalten
	//   input = Element
	//     (der Radiobutton zum Umschalten der Formulare)
	navListener (input) {
		input.addEventListener("change", function() {
			const form = this.id.replace(/.+-/, "");
			redLit.nav(form, true);
		});
	},
	// Navigation: Umschalten zwischen Eingabe- und Suchformular
	//   form = String
	//     ("eingabe" od. "suche")
	//   nav = true || undefined
	//     (Funktion wurde über das Navigationsformular aufgerufen => nie abbrechen)
	nav (form, nav = false) {
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// schon in der richtigen Sektion
		if (!nav && document.getElementById(`red-lit-nav-${form}`).checked) {
			return;
		}
		// Radio-Buttons umstellen
		let radio = document.querySelectorAll("#red-lit-nav input");
		for (let i of radio) {
			if (i.id === `red-lit-nav-${form}`) {
				i.checked = true;
			} else {
				i.checked = false;
			}
		}
		// Block umstellen
		let formulare = ["red-lit-suche", "red-lit-eingabe"];
		for (let i of formulare) {
			let block = document.getElementById(i);
			if (i.includes(`-${form}`)) {
				block.classList.remove("aus");
			} else {
				block.classList.add("aus");
			}
		}
		// ggf. Fous setzen
		if (nav && form === "suche") {
			document.getElementById("red-lit-suche-text").select();
		} else if (nav) {
			let ti = document.getElementById("red-lit-eingabe-ti");
			helfer.textareaGrow(ti);
			ti.focus();
		}
	},
	// Suche: Speicher für Variablen
	suche: {
		treffer: [],
		highlight: null,
		sonder: "",
	},
	// Suche: zum Formular wechseln
	sucheWechseln () {
		redLit.nav("suche");
		document.getElementById("red-lit-suche-text").select();
	},
	// Suche: Formular zurücksetzen
	sucheReset () {
		let inputs = document.querySelectorAll("#red-lit-suche p:first-child input");
		for (let i of inputs) {
			i.value = "";
		}
		redLit.sucheResetBloecke(true);
	},
	// Suche: Formular zurücksetzen (Blöcke)
	//   aus = Boolean
	//     (Blöcke ausstellen)
	sucheResetBloecke (aus) {
		let bloecke = ["titel", "treffer"];
		for (let i of bloecke) {
			let block = document.getElementById(`red-lit-suche-${i}`);
			if (aus) {
				block.classList.add("aus");
			} else {
				block.classList.remove("aus");
			}
		}
	},
	// Suche: Listener für die Formularfelder
	//   input = Element
	//     (Formularfeld)
	sucheListener (input) {
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (!tastatur.modifiers && evt.key === "Enter") {
				redLit.sucheStarten();
			} else if (this.id === "red-lit-suche-text") {
				if (tastatur.modifiers === "Ctrl" && evt.key === "Enter") {
					let titel = document.getElementById("red-lit-suche-titel");
					if (titel.classList.contains("aus")) {
						return;
					}
					for (let i of titel.querySelectorAll(".red-lit-snippet")) {
						if (i.offsetTop >= titel.scrollTop - 10) { // 10px padding-top
							let ds = JSON.parse(i.dataset.ds);
							redLit.anzeigePopup(ds);
							break;
						}
					}
				} else if (tastatur.modifiers === "Alt" && /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
					evt.preventDefault();
					if (evt.repeat) { // Repeats unterbinden
						return;
					}
					let a = document.querySelectorAll("#red-lit-suche-treffer a");
					if (evt.key === "ArrowLeft") {
						a[0].dispatchEvent(new MouseEvent("click"));
					} else {
						a[1].dispatchEvent(new MouseEvent("click"));
					}
				} else if (!tastatur.modifiers && /^(ArrowDown|ArrowUp|PageDown|PageUp)$/.test(evt.key)) {
					evt.preventDefault();
					if (evt.repeat) { // Repeats unterbinden
						return;
					}
					let titel = document.getElementById("red-lit-suche-titel"),
						prozent = titel.offsetHeight / 100 * 88,
						move = 0;
					switch (evt.key) {
						case "ArrowDown":
							move = 40;
							break;
						case "ArrowUp":
							move = -40;
							break;
						case "PageDown":
							move = prozent;
							break;
						case "PageUp":
							move = -prozent;
							break;
					}
					titel.scrollTo({
						top: titel.scrollTop + move,
						left: 0,
						behavior: "smooth",
					});
				}
			}
		});
	},
	// Suche: Sondersuche starten
	//   a = Element
	//     (Link für eine Sondersuche)
	sucheSonder (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			redLit.suche.sonder = this.dataset.sonder;
			redLit.sucheStarten();
			redLit.suche.sonder = "";
		});
	},
	// Suche: starten
	sucheStarten () {
		// Filterkriterien auslesen/Variablen vorbereiten
		let input = document.getElementById("red-lit-suche-text"),
			text = helfer.textTrim(input.value, true),
			ab = document.getElementById("red-lit-suche-ab").value,
			st = [],
			da = null;
		redLit.suche.treffer = [];
		redLit.suche.highlight = [];
		if (text) {
			let insensitive = "i";
			if (/[A-ZÄÖÜ]/.test(text)) {
				insensitive = "";
			}
			let woerter = []; // Suchwörter und Suchphrasen
			text = text.replace(/"(.+?)"/g, (m, p1) => { // Phrasen ermitteln
				woerter.push(p1);
				return "";
			});
			text.split(/\s/).forEach(i => { // Wörter ermitteln
				if (i) {
					woerter.push(i);
				}
			});
			for (let wort of woerter) {
				st.push(new RegExp(helfer.escapeRegExp(wort).replace(/ /g, "\\s"), "g" + insensitive));
			}
			redLit.suche.highlight = st;
		}
		if (ab) {
			da = new Date(ab);
			// Die folgende Verrenkung ist nötig, um die Uhrzeit auf 0 Uhr zu stellen.
			// Sonst wird der Offset zur GMT hinzugerechnet, weswegen Titelaufnahme, die
			// um 0 Uhr erstellt wurden, nicht korrekt gefunden werden.
			da = new Date(da.getFullYear(), da.getMonth(), da.getDate());
		}
		// Einträge durchsuchen
		let datensaetze = [
			["be"],
			["td", "ad"],
			["td", "fo"],
			["td", "no"],
			["td", "pn"],
			["td", "si"],
			["td", "ti"],
			["td", "tg"],
			["td", "ul"],
		];
		let duplikate = new Set(),
			siglen_doppelt = new Set();
		if (redLit.suche.sonder === "duplikate") {
			for (let [k, v] of Object.entries(redLit.db.data)) {
				if (duplikate.has(k)) {
					continue;
				}
				x: for (let [l, w] of Object.entries(redLit.db.data)) {
					if (l === k) {
						continue;
					}
					if (w[0].td.si === v[0].td.si) { // Sigle identisch
						duplikate.add(k);
						duplikate.add(l);
						break;
					} else if (w[0].td.ti === v[0].td.ti) { // Titel identisch
						duplikate.add(k);
						duplikate.add(l);
						break;
					} else if (v[0].td.ul && w[0].td.ul === v[0].td.ul) { // URL identisch
						duplikate.add(k);
						duplikate.add(l);
						break;
					}
					for (let p of v[0].td.pn) { // PPN identisch
						if (w[0].td.pn.includes(p)) {
							duplikate.add(k);
							duplikate.add(l);
							break x;
						}
					}
				}
			}
		} else if (redLit.suche.sonder === "siglen_doppelt") {
			let siglen = [];
			for (let arr of Object.values(redLit.db.data)) {
				siglen.push(arr[0].td.si);
			}
			siglen.forEach(i => {
				let treffer = siglen.filter(j => j === i);
				if (treffer.length > 1) {
					siglen_doppelt.add(i);
				}
			});
		}
		let treffer = redLit.suche.treffer;
		for (let [id, arr] of Object.entries(redLit.db.data)) {
			// Sondersuchen
			if (redLit.suche.sonder === "duplikate" &&
					!duplikate.has(id)) { // Duplikate
				continue;
			} else if (redLit.suche.sonder === "versionen" &&
					arr.length === 1) { // mehrere Versionen
				continue;
			}
			// Suche nach Text und Datum
			for (let i = 0, len = arr.length; i < len; i++) {
				let aufnahme = arr[i];
				// Sondersuchen
				if (redLit.suche.sonder && i > 0) {
					// Sondersuchen, für die nur der erste Eintrag berücksichtigt wird
					break;
				} else if (redLit.suche.sonder === "siglen_doppelt" &&
						!siglen_doppelt.has(aufnahme.td.si)) { // doppelte Siglen
					break;
				} else if (redLit.suche.sonder === "ppn_mit" &&
					!aufnahme.td.pn.length) { // mit PPN
					break;
				} else if (redLit.suche.sonder === "ppn_ohne" &&
					aufnahme.td.pn.length) { // ohne PPN
					break;
				} else if (redLit.suche.sonder === "notizen" &&
					!aufnahme.td.no) { // mit Notizen
					break;
				}
				// Datum
				let daOk = !da ? true : false;
				if (da) {
					let daA = new Date(aufnahme.da);
					if (daA >= da) {
						daOk = true;
					}
				}
				// Text
				let stOk = !st.length ? true : false;
				if (st.length) {
					let ok = Array(st.length).fill(false);
					x: for (let j = 0, len = st.length; j < len; j++) {
						for (let k of datensaetze) {
							let ds = aufnahme[k[0]];
							if (k[1]) {
								ds = ds[k[1]];
							}
							const txt = Array.isArray(ds) ? ds.join(", ") : ds;
							if (txt.match(st[j])) {
								ok[j] = true;
								continue x;
							}
						}
					}
					if (!ok.includes(false)) {
						stOk = true;
					}
				}
				// Treffer aufhnehmen?
				if (daOk && stOk) {
					treffer.push({id, slot: i});
					break;
				}
			}
		}
		// Treffer sortieren (nach Sigle)
		treffer.sort(helfer.sortSiglen);
		// Suchtreffer anzeigen
		redLit.sucheAnzeigen(0);
		// Suchtext selektieren
		input.select();
	},
	// Suche: Treffer anzeigen
	//   start = Number
	//     (Index, von dem aus die Ergebnisse angezeigt werden sollen)
	sucheAnzeigen (start) {
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// keine Treffer => keine Anzeige
		let treffer = redLit.suche.treffer;
		if (!treffer.length) {
			let st = document.getElementById("red-lit-suche-text");
			st.classList.add("keine-treffer");
			setTimeout(() => st.classList.remove("keine-treffer"), 1500);
			redLit.sucheResetBloecke(true);
			return;
		}
		// ggf. Anzeige vorbereiten
		if (start === 0) {
			redLit.sucheResetBloecke(false);
		}
		// 50 Treffer drucken (max.)
		redLit.anzeige.snippetKontext = "suche";
		let titel = document.getElementById("red-lit-suche-titel");
		titel.scrollTop = 0;
		helfer.keineKinder(titel);
		for (let i = start, len = start + 50; i < len; i++) {
			// letzter Treffer erreicht
			if (!treffer[i]) {
				break;
			}
			titel.appendChild(redLit.anzeigeSnippet(treffer[i]));
		}
		// Trefferanzeige auffrischen
		redLit.sucheAnzeigenNav(start);
	},
	// Suche: Anzeige der Navigationsleiste auffrischen
	//   start = Number
	//     (Nummer, ab der die Treffer angezeigt werden; nullbasiert)
	sucheAnzeigenNav (start) {
		let treffer = redLit.suche.treffer,
			range = `${start + 1}–${treffer.length > start + 50 ? start + 50 : treffer.length}`;
		if (treffer.length === 1) {
			range = "1";
		}
		document.getElementById("red-lit-suche-trefferzahl").textContent = `${range} / ${treffer.length}`;
		document.querySelectorAll("#red-lit-suche-treffer a").forEach((a, n) => {
			if (n === 0) { // zurückblättern
				a.dataset.start = `${start - 50}`;
				if (start > 0) {
					a.classList.remove("inaktiv");
				} else {
					a.classList.add("inaktiv");
				}
			} else { // vorblättern
				a.dataset.start = `${start + 50}`;
				if (treffer.length > start + 50) {
					a.classList.remove("inaktiv");
				} else {
					a.classList.add("inaktiv");
				}
			}
		});
	},
	// Suche: in den Treffern blättern
	//   a = Element
	//     (Icon-Link zum Vor- oder Rückwärtsblättern)
	sucheNav (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (this.classList.contains("inaktiv")) {
				return;
			}
			let start = parseInt(this.dataset.start, 10);
			redLit.sucheAnzeigen(start);
		});
	},
	// Suche: Snippet markieren (Listener)
	//   div = Element
	//     (Snippet mit einer Titelaufnahme)
	sucheSnippetMarkierenListener (div) {
		div.addEventListener("click", function() {
			if (this.classList.contains("markiert")) { // Snippet ist markiert => demarkieren
				this.classList.remove("markiert");
				return;
			}
			redLit.sucheSnippetMarkieren(this);
		});
	},
	// Suche: Snippet markieren
	//   div = Element
	//     (Snippet mit einer Titelaufnahme)
	sucheSnippetMarkieren (div) {
		let markiert = document.querySelector("#red-lit-suche-titel .markiert");
		if (markiert) {
			markiert.classList.remove("markiert");
		}
		div.classList.add("markiert");
	},
	// Suche: Titelaufnahme auffrischen, falls sie geändert wurde (bearbeitet, gelöscht)
	//   id = String
	//     (ID der Titelaufnahme)
	//   delSlot = Number || undefined
	//     (Slot dessen Titelaufnahme gelöscht wurde)
	sucheTrefferAuffrischen (id, delSlot = -1) {
		let treffer = redLit.suche.treffer.find(i => i.id === id);
		// Titelaufnahme derzeit nicht im Suchergebnis
		if (!treffer) {
			return;
		}
		// nach Speichern: Slot hochzählen, wenn eine veraltete Titelaufnahme angezeigt wird
		if (delSlot === -1 && treffer.slot > 0) {
			treffer.slot++;
		}
		// nach Löschen: Slotnummer ggf. anpassen
		let titel = document.querySelector(`#red-lit-suche-titel .red-lit-snippet[data-ds*='"${id}"']`);
		if (delSlot >= 0) {
			if (treffer.slot === delSlot) {
				// Treffer komplett entfernen, wenn genau diese Titelaufnahme gelöscht wurde;
				// dieser Zweig wird auch abgearbeitet, wenn die ID der Titelaufnahme geändert wurde
				const idx = redLit.suche.treffer.findIndex(i => i.id === id);
				redLit.suche.treffer.splice(idx, 1);
				if (!redLit.suche.treffer.length) {
					redLit.sucheReset();
				} else if (titel) {
					// Titelanzeige entfernen
					titel.parentNode.removeChild(titel);
					// Navigation auffrischen
					const start = parseInt(document.querySelector("#red-lit-suche-treffer a").dataset.start, 10) + 50;
					redLit.sucheAnzeigenNav(start);
				}
				return;
			} else if (treffer.slot > delSlot) {
				// Slot runterzählen, wenn ein Slot vor der angezeigten Aufnahme gelöscht wurde
				treffer.slot--;
			}
			// ist treffer.slot < delSlot muss die Titelaufnahme nur aufgefrischt werden
		}
		// ggf. angezeigte Titelaufnahme auffrischen
		if (titel) {
			redLit.anzeige.snippetKontext = "suche";
			titel.parentNode.replaceChild(redLit.anzeigeSnippet(treffer), titel);
		}
	},
	// Suche: alle Treffer in den Suchergebnissen auffrischen
	sucheTrefferAlleAuffrischen () {
		document.querySelectorAll("#red-lit-suche-titel:not(.aus) .red-lit-snippet").forEach(i => {
			let ds = JSON.parse(i.dataset.ds);
			// Titelaufnahme existiert nicht mehr in der DB
			if (!redLit.db.data[ds.id] || !redLit.db.data[ds.id][ds.slot]) {
				// Titelaufnahme aus Trefferliste entfernen
				const idx = redLit.suche.treffer.findIndex(j => j.id === ds.id);
				redLit.suche.treffer.splice(idx, 1);
				// sind noch Treffer in der Trefferliste?
				if (!redLit.suche.treffer.length) {
					redLit.sucheReset();
					return;
				}
				// Titelaufnahme aus der Suchanzeige löschen
				i.parentNode.removeChild(i);
				// Navigation auffrischen
				const start = parseInt(document.querySelector("#red-lit-suche-treffer a").dataset.start, 10) + 50;
				redLit.sucheAnzeigenNav(start);
				return;
			}
			// Titelaufnahme auffrischen
			redLit.anzeige.snippetKontext = "suche";
			i.parentNode.replaceChild(redLit.anzeigeSnippet(ds), i);
		});
	},
	// Eingabeformular: Speicher für Variablen
	eingabe: {
		fundorte: ["Bibliothek", "DTA", "DWDS", "GoogleBooks", "IDS", "online"], // gültige Werte im Feld "Fundorte"
		tags: ["unvollständig", "Wörterbuch"], // vordefinierte Werte im Feld "Tags"
		status: "", // aktueller Status des Formulars
		id: "", // ID des aktuellen Datensatzes (leer, wenn neuer Datensatz)
		slot: -1, // Slot des aktuellen Datensatzes
		changed: false, // es wurden Eingaben vorgenommen
	},
	// Eingabeformular: Listener für alle Inputs
	//   input = Element
	//     (Button oder Textfeld)
	eingabeListener (input) {
		// Buttons
		if (input.type === "button") {
			if (/-save$/.test(input.id)) {
				input.addEventListener("click", () => redLit.eingabeSpeichern());
			} else if (/-add$/.test(input.id)) {
				input.addEventListener("click", () => {
					redLit.dbCheck(() => redLit.eingabeHinzufuegen(), false);
				});
			}
			return;
		}
		// Sigle
		if (input.id === "red-lit-eingabe-si") {
			redLit.eingabeAutoID(input);
		}
		// Titel
		if (input.id === "red-lit-eingabe-ti") {
			redLit.eingabeAutoTitel(input);
			input.addEventListener("paste", function() {
				// das muss zeitverzögert stattfinden, sonst ist das Feld noch leer
				setTimeout(() => {
					this.value = redLit.eingabeFormatTitel(this.value);
					helfer.textareaGrow(this);
				}, 25);
			});
		}
		// URL
		if (input.id === "red-lit-eingabe-ul") {
			redLit.eingabeAutoURL(input);
		}
		// alle Textfelder (Change-Listener)
		input.addEventListener("input", function() {
			if (/-tg$/.test(this.id)) { // Tippen im Tags-Feld ist nicht unbedingt eine Änderung
				return;
			}
			redLit.eingabeGeaendert();
		});
		// alle Textfelder (Enter-Listener)
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (tastatur.modifiers === "Ctrl" && evt.key === "Enter") {
				// ohne Timeout würden Warnfenster sofort wieder verschwinden
				setTimeout(() => redLit.eingabeSpeichern(), 200);
			} else if (!tastatur.modifers && evt.key === "Enter" &&
					/-tg$/.test(this.id) && !document.getElementById("dropdown")) {
				redLit.eingabeTagHinzufuegen();
			}
		});
	},
	// Eingabeformular: Formular wurde geändert
	eingabeGeaendert () {
		if (redLit.eingabe.changed) {
			return;
		}
		redLit.eingabe.changed = true;
		let span = document.createElement("span");
		span.textContent = "*";
		document.getElementById("red-lit-eingabe-meldung").appendChild(span);
	},
	// Eingabeformular: Status anzeigen
	//   status = String
	//     (der Status, in dem sich das Formular befindet)
	eingabeStatus (status) {
		redLit.eingabe.status = status;
		if (status === "add") {
			redLit.eingabe.id = "";
			redLit.eingabe.slot = -1;
		} else {
			redLit.eingabe.id = document.getElementById("red-lit-eingabe-id").value;
		}
		redLit.eingabe.changed = false;
		let text = {
			"add": "Titelaufnahme hinzufügen",
			"change": "Titelaufnahme ändern",
			"old": "Titelaufnahme veraltet",
		};
		let p = document.getElementById("red-lit-eingabe-meldung");
		p.textContent = text[status];
		p.setAttribute("class", status);
	},
	// Eingabeformular: Formular leeren
	eingabeLeeren () {
		let inputs = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
		for (let i of inputs) {
			if (i.type === "button") {
				continue;
			}
			i.value = "";
			if (i.nodeName === "TEXTAREA") {
				helfer.textareaGrow(i);
			}
		}
		// Tag-Zelle leeren
		helfer.keineKinder(document.getElementById("red-lit-eingabe-tags"));
		// Metadaten leeren
		redLit.eingabeMetaFuellen({id: "", slot: -1});
	},
	// Eingabeformular: ID automatisch aus der Sigle ermitteln
	//   input = Element
	//     (das Sigle-Feld)
	eingabeAutoID (input) {
		input.addEventListener("input", function() {
			if (redLit.eingabe.status !== "add") {
				return;
			}
			let val = this.value;
			// hochgestellte Ziffern durch 'normal' gestellte ersetzen
			val = helfer.sortSiglenPrepSuper(val);
			// Ziffern vom Anfang an das Ende der ID schieben
			let ziffern = val.match(/^[0-9]+/);
			if (ziffern) {
				val += ziffern[0];
				val = val.substring(ziffern[0].length);
			}
			// weitere Normierungsoperationen
			val = val.toLowerCase();
			val = val.replace(/[\s/]/g, "-");
			val = val.replace(/[^a-z0-9ßäöü-]/g, "");
			val = val.replace(/-{2,}/g, "-");
			document.getElementById("red-lit-eingabe-id").value = val;
		});
	},
	// Eingabeformular: Automatismen bei Eingabe des Titels
	//   input = Element
	//     (das Titel-Feld)
	eingabeAutoTitel (input) {
		input.addEventListener("input", function() {
			// Sigle ermitteln
			let si = document.getElementById("red-lit-eingabe-si");
			if (!si.value) {
				let name = this.value.split(/[\s,:]/),
					jahr = this.value.match(/[0-9]{4}/g),
					sigle = [];
				if (name[0]) {
					let namen = this.value.split(":")[0].split("/");
					if (namen.length > 3) {
						sigle.push(`${name[0]} u. a.`);
					} else if (namen.length > 1) {
						let autoren = [];
						for (let i of namen) {
							let name = i.split(/[\s,]/);
							if (name[0]) {
								autoren.push(name[0]);
							}
						}
						sigle.push(autoren.join("/"));
					} else {
						sigle.push(name[0]);
					}
				}
				if (jahr && jahr.length) {
					let jahrInt = parseInt(jahr[jahr.length - 1], 10);
					if (jahrInt > 1599 && jahrInt < 2051) {
						sigle.push(jahr[jahr.length - 1]);
					}
				}
				if (sigle.length > 1) {
					si.value = sigle.join(" ");
					si.dispatchEvent(new KeyboardEvent("input"));
				}
			}
			// Fundort ausfüllen
			let fo = document.getElementById("red-lit-eingabe-fo");
			if (this.value && !fo.value) {
				fo.value = "Bibliothek";
			}
		});
	},
	// Eingabeformular: Automatismen bei Eingabe einer URL
	//   input = Element
	//     (das URL-Feld)
	eingabeAutoURL (input) {
		input.addEventListener("input", function() {
			let fo = document.getElementById("red-lit-eingabe-fo");
			if (!this.value) {
				fo.value = "Bibliothek";
				return;
			}
			let ad = document.getElementById("red-lit-eingabe-ad");
			if (!ad.value) {
				ad.value = new Date().toISOString().split("T")[0];
			}
			let fundort = "online";
			if (/books\.google/.test(this.value)) {
				fundort = "GoogleBooks";
			} else if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) {
				fundort = "DTA";
			} else if (/owid\.de\//.test(this.value)) {
				fundort = "IDS";
			}
			fo.value = fundort;
		});
	},
	// Eingabe im Titelfeld formatieren
	//   titel = String
	//     (der Text im Titel-Feld)
	eingabeFormatTitel (titel) {
		titel = titel.replace(/[\r\n]/g, " ");
		titel = helfer.textTrim(titel, true);
		titel = helfer.typographie(titel);
		if (titel && !/\.$/.test(titel)) { // Titelaufnahmen enden immer mit einem Punkt
			titel += ".";
		}
		return titel;
	},
	// Eingabeformular: DTA-Import
	async eingabeDTA () {
		// URL-Feld auslesen
		let url = document.getElementById("red-lit-eingabe-ul").value;
		// Formular leeren
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
		// DTA-URL suchen
		const {clipboard} = require("electron"),
			cp = clipboard.readText();
		if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cp)) {
			url = cp;
		} else if (!/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
			url = "";
		}
		// kein DTA-Link gefunden
		if (!url) {
			dialog.oeffnen({
				typ: "alert",
				text: "Weder in der Zwischenablage noch im URL-Feld wurde ein DTA-Link gefunden.",
				callback: () => document.getElementById("red-lit-eingabe-ti-dta").focus(),
			});
			return;
		}
		// Titeldaten laden
		const titelId = await redLit.eingabeDTAFetch({
			url,
			fokusId: "red-lit-eingabe-ti-dta",
		});
		if (!titelId) {
			return;
		}
		// Titel-Feld ausfüllen
		let ti = document.getElementById("red-lit-eingabe-ti");
		ti.value = belegImport.DTAQuelle(false);
		ti.dispatchEvent(new KeyboardEvent("input"));
		// URL-Feld ausfüllen
		let ul = document.getElementById("red-lit-eingabe-ul");
		ul.value = `http://www.deutschestextarchiv.de/${titelId}`;
		ul.dispatchEvent(new KeyboardEvent("input"));
		// Titelfeld fokussieren
		ti.focus();
	},
	// Eingabeformular: Titeldaten des DTA herunterladen
	//   url = String
	//     (Link zu einer Ressource des DTA)
	//   fokusId = String
	//     (ID des Elements, das beim Scheitern fokussiert werden soll)
	//   seitenData = Object || undefined
	//     (enthält Informationen zur Seite des DTA-Titels; die Daten sind gefüllt, wenn
	//     die Quellenangabe der Karteikarte neu geladen werden soll)
	eingabeDTAFetch ({url, fokusId, seitenData = {}}) {
		return new Promise(async resolve => {
			// Titel-ID ermitteln
			let titelId = belegImport.DTAGetTitelId(url);
			if (!titelId) {
				await new Promise(meldung => {
					dialog.oeffnen({
						typ: "alert",
						text: "Aus dem DTA-Link konnte keine Titel-ID extrahiert werden.",
						callback: () => {
							document.getElementById(fokusId).focus();
							meldung(true);
						},
					});
				});
				resolve("");
				return;
			}
			// TEI-Header herunterladen
			let feedback = await helfer.fetchURL(`http://www.deutschestextarchiv.de/api/tei_header/${titelId}`);
			if (feedback.fehler) {
				await new Promise(meldung => {
					dialog.oeffnen({
						typ: "alert",
						text: `Der Download der Titeldaten des DTA ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${feedback.fehler}</p>`,
						callback: () => {
							document.getElementById(fokusId).focus();
							meldung(true);
						},
					});
				});
				resolve("");
				return;
			}
			// Titel noch nicht freigeschaltet? (DTAQ)
			if (/<title>DTA Qualitätssicherung<\/title>/.test(feedback.text)) {
				await new Promise(meldung => {
					dialog.oeffnen({
						typ: "alert",
						text: `Der Download der Titeldaten des DTA ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">DTAQ: Titel noch nicht freigeschaltet</p>`,
						callback: () => {
							document.getElementById(fokusId).focus();
							meldung(true);
						},
					});
				});
				resolve("");
				return;
			}
			// Titeldaten ermitteln
			let parser = new DOMParser(),
				xmlDoc = parser.parseFromString(feedback.text, "text/xml");
			if (xmlDoc.querySelector("parsererror")) {
				await new Promise(meldung => {
					dialog.oeffnen({
						typ: "alert",
						text: "Die XML-Daten des DTA sind nicht wohlgeformt.",
						callback: () => {
							document.getElementById(fokusId).focus();
							meldung(true);
						},
					});
				});
				resolve("");
				return;
			}
			belegImport.DTAResetData();
			if (seitenData.seite) {
				belegImport.DTAData.seite = seitenData.seite;
				belegImport.DTAData.seite_zuletzt = seitenData.seite_zuletzt;
				belegImport.DTAData.spalte = seitenData.spalte;
			}
			belegImport.DTAData.url = url;
			belegImport.DTAMeta(xmlDoc);
			resolve(titelId);
		});
	},
	// Eingabeformular: XML-Import aus der Zwischenablage
	async eingabeXML () {
		// PPN-Feld auslesen
		let pn = document.getElementById("red-lit-eingabe-pn"),
			ppn = pn.value.split(/[,\s]/)[0];
		if (!belegImport.PPNCheck({ppn})) {
			ppn = "";
		}
		// Formular leeren
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
		// XML-Daten suchen
		const {clipboard} = require("electron"),
			cp = clipboard.readText().trim();
		let xmlDaten = redLit.eingabeXMLCheck({xmlStr: cp});
		if (belegImport.PPNCheck({ppn: cp})) {
			ppn = cp;
		} else if (xmlDaten) {
			ppn = "";
		}
		if (ppn) {
			xmlDaten = await belegImport.PPNXML({
				ppn,
				fokus: "red-lit-eingabe-ti-xml",
			});
			if (!xmlDaten) {
				return;
			}
		}
		// keine XML-Daten in der Zwischenablage
		if (!xmlDaten) {
			dialog.oeffnen({
				typ: "alert",
				text: "In der Zwischenablage befindet sich kein XML-Dokument, aus dem eine Titelaufnahme importiert werden könnte.",
				callback: () => document.getElementById("red-lit-eingabe-ti-xml").focus(),
			});
			return;
		}
		// XML-Daten gefunden => Titelaufnahme übernehmen
		if (xmlDaten.td.ti) {
			let feld = document.getElementById("red-lit-eingabe-ti");
			feld.value = redLit.eingabeFormatTitel(xmlDaten.td.ti);
			feld.dispatchEvent(new KeyboardEvent("input"));
		}
		if (xmlDaten.td.si) {
			document.getElementById("red-lit-eingabe-si").value = xmlDaten.td.si;
		}
		if (xmlDaten.td.id) {
			document.getElementById("red-lit-eingabe-id").value = xmlDaten.td.id;
		}
		if (xmlDaten.td.ul) {
			let feld = document.getElementById("red-lit-eingabe-ul");
			feld.value = xmlDaten.td.ul;
			feld.dispatchEvent(new KeyboardEvent("input"));
		}
		if (xmlDaten.td.ad) {
			document.getElementById("red-lit-eingabe-ad").value = xmlDaten.td.ad;
		}
		if (xmlDaten.td.fo) {
			document.getElementById("red-lit-eingabe-fo").value = xmlDaten.td.fo;
		}
		if (xmlDaten.td.pn) {
			document.getElementById("red-lit-eingabe-pn").value = xmlDaten.td.pn;
		}
		// Titelfeld fokussieren
		document.getElementById("red-lit-eingabe-ti").focus();
	},
	// Eingabeformular: überprüft, ob sich hinter einem String ein passendes XML-Dokument verbirgt
	//   xmlStr = String
	//     (String, der überprüft werden soll)
	eingabeXMLCheck ({xmlStr}) {
		// Daten beginnen nicht mit <Fundstelle>, <mods> oder XML-Deklaration
		if (!/^<(Fundstelle|mods|\?xml)/.test(xmlStr)) {
			return false;
		}
		// Namespace-Attribut entfernen; das macht nur Problem mit evaluate()
		xmlStr = xmlStr.replace(/xmlns=".+?"/, "");
		// XML nicht wohlgeformt
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(xmlStr, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			return false;
		}
		// Fundstellen-Snippet
		if (xmlDoc.querySelector("Fundstelle unstrukturiert")) {
			return redLit.eingabeXMLFundstelle({xmlDoc, xmlStr});
		}
		// MODS-Dokument
		if (xmlDoc.querySelector("mods titleInfo")) {
			return redLit.eingabeXMLMODS({xmlDoc, xmlStr});
		}
		// kein passendes XML-Dokument
		return false;
	},
	// Eingabeformular: einen leeren Datensatz zur Verfügung stellen
	// (der Datensatz muss so strukturiert sein, dass man ihn auch zum
	// Import in eine Karteikarte nutzen kann)
	eingabeXMLDatensatz () {
		let data = belegImport.DateiDatensatz();
		data.td = {
			si: "", // Sigle
			id: "", // ID
			ti: "", // Titel
			ul: "", // URL
			ad: "", // Aufrufdatum
			fo: "", // Fundort
			pn: "", // PPN
		};
		return data;
	},
	// Eingabeformular: Fundstellen-Snippet auslesen
	//   xmlDoc = Document
	//     (das geparste XML-Snippet)
	//   xmlStr = String
	//     (das nicht geparste Originaldokument)
	eingabeXMLFundstelle ({xmlDoc, xmlStr}) {
		let data = redLit.eingabeXMLDatensatz();
		// Daten für Titelaufnahme in der Literaturdatenbank
		let ti = xmlDoc.querySelector("unstrukturiert");
		if (ti) {
			data.td.ti = ti.textContent;
		}
		let si = xmlDoc.querySelector("Sigle");
		if (si) {
			data.td.si = si.textContent;
		}
		let fundstelle = xmlDoc.querySelector("Fundstelle") ? xmlDoc.querySelector("Fundstelle") : xmlDoc,
			id = fundstelle.getAttribute("xml:id");
		if (id) {
			data.td.id = id;
		}
		let ul = xmlDoc.querySelector("URL");
		if (ul) {
			data.td.ul = ul.textContent;
		}
		let ad = xmlDoc.querySelector("Aufrufdatum");
		if (ad) {
			let da = ad.textContent.split(".");
			data.td.ad = `${da[2]}-${da[1]}-${da[0]}`;
		}
		let fo = xmlDoc.querySelector("Fundort");
		if (fo) {
			data.td.fo = fo.textContent;
		}
		let pn = xmlDoc.querySelectorAll("PPN");
		if (pn) {
			let ppn = [];
			for (let i of pn) {
				ppn.push(i.textContent);
			}
			data.td.pn = ppn.join(", ");
		}
		// Daten für die Karteikarte
		data.ds.au = "N. N.";
		let autor = data.td.ti.split(": ")[0].split(", ");
		if (autor.length === 2) {
			data.ds.au = autor.join(", ");
		}
		data.ds.bx = xmlStr;
		let jahr = data.td.ti.match(/[0-9]{4}/g);
		if (jahr) {
			data.ds.da = jahr[jahr.length - 1];
		}
		data.ds.qu = data.td.ti;
		if (data.td.ul) {
			data.ds.qu += `\n\n${data.td.ul}`;
			if (data.td.ad) {
				data.ds.qu += ` (Aufrufdatum: ${ad.textContent})`;
			}
			if (/books\.google/.test(data.td.ul)) {
				data.td.kr = "GoogleBooks";
			} else if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(data.td.ul)) {
				data.td.kr = "DTA";
			}
		}
		// Datensatz zurückgeben
		return data;
	},
	// Eingabeformular: MODS-Dokument auslesen
	//   xmlDoc = Document
	//     (das geparste XML-Snippet)
	//   xmlStr = String
	//     (das nicht geparste Originaldokument)
	eingabeXMLMODS ({xmlDoc, xmlStr}) {
		// Daten zusammentragen
		let data = redLit.eingabeXMLDatensatz(),
			td = redLit.eingabeXMLModsTd({xmlDoc});
		// Datensatz für Karteikarte ausfüllen
		if (td.autor.length) {
			data.ds.au = td.autor.join("/");
		} else if (td.hrsg.length) {
			data.ds.au = `${td.hrsg.join("/")} (Hrsg.)`;
		}
		data.ds.bx = xmlStr;
		data.ds.da = td.jahr;
		if (td.url.some(i => /^https?:\/\/www\.deutschestextarchiv\.de\//.test(i))) {
			data.ds.kr = "DTA";
		} else if (td.url.some(i => /books\.google/.test(i))) {
			data.ds.kr = "GoogleBooks";
		}
		data.ds.qu = belegImport.makeTitle({td, mitURL: true});
		// Datensatz für Literaturdatenbank ausfüllen
		data.td.ti = belegImport.makeTitle({td, mitURL: false});
		if (td.url.length) {
			data.td.ul = td.url[0];
		}
		data.td.pn = td.ppn.join(", ");
		// Datensatz zurückgeben
		return data;
	},
	// Eingabeformular: MODS-Dokument auslesen (Titeldaten)
	//   xmlDoc = Document
	//     (das geparste XML-Snippet)
	eingabeXMLModsTd ({xmlDoc}) {
		let td = belegImport.makeTitleDataObject();
		// Helfer-Funktionen
		let evaluator = xpath => {
			return xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		};
		let pusher = (result, key) => {
			let item = result.iterateNext();
			if (Array.isArray(td[key])) {
				while (item) {
					const val = helfer.textTrim(item.textContent, true);
					if (val) {
						td[key].push(val);
					}
					item = result.iterateNext();
				}
			} else if (item) {
				td[key] = helfer.textTrim(item.textContent, true);
			}
		};
		// Autor
		let autor = evaluator("//name[@type='personal']/namePart[not(@*)][contains(following-sibling::role/roleTerm[@type='code'],'aut')]");
		pusher(autor, "autor");
		// Herausgeber
		let hrsg = evaluator("//name[@type='personal']/namePart[not(@*)][contains(following-sibling::role/roleTerm[@type='code'],'edt')]");
		pusher(hrsg, "hrsg");
		// Titel
		let titel = evaluator("/mods/titleInfo[not(@*)]/title");
		pusher(titel, "titel");
		// Korrektur: Großschreibung
		gross({
			ds: td.titel,
			start: 1,
		});
		// Titel-Vorsatz
		let titelVorsatz = evaluator("/mods/titleInfo[not(@*)]/nonSort"),
			item = titelVorsatz.iterateNext();
		if (item) {
			td.titel[0] = helfer.textTrim(item.textContent + td.titel[0], true);
		}
		// Untertitel
		let untertitel = evaluator("/mods/titleInfo[not(@*)]/subTitle");
		pusher(untertitel, "untertitel");
		// Korrektur: Großschreibung
		gross({
			ds: td.untertitel,
			start: 0,
		});
		// Zeitschrift/Sammelband
		let inTitel = evaluator("//relatedItem[@type='host']//title");
		pusher(inTitel, "inTitel");
		// Korrektur: Großschreibung
		gross({
			ds: td.inTitel,
			start: 0,
		});
		// Band
		let band = evaluator("/mods/titleInfo[not(@*)]/partNumber");
		pusher(band, "band");
		// Bandtitel
		let bandtitel = evaluator("/mods/titleInfo[not(@*)]/partName");
		pusher(bandtitel, "bandtitel");
		// Auflage
		let auflage = evaluator("/mods/originInfo[not(@*)]//edition");
		pusher(auflage, "auflage");
		// Qualifikationsschrift
		let quali = evaluator("/mods/note[@type='thesis']");
		pusher(quali, "quali");
		// Ort
		let ort = evaluator("/mods/originInfo[@eventType='publication']//placeTerm");
		pusher(ort, "ort");
		// Verlag
		let verlag;
		if (td.inTitel.length) {
			verlag = evaluator("//relatedItem[@type='host']/originInfo/publisher");
		} else {
			verlag = evaluator("/mods/originInfo[@eventType='publication']/publisher");
		}
		pusher(verlag, "verlag");
		// Jahr
		let jahr = evaluator("/mods/originInfo[@eventType='publication']/dateIssued");
		pusher(jahr, "jahr");
		// Jahrgang, Jahr, Heft, Seiten, Spalten
		let inDetails = evaluator("//relatedItem[@type='host']/part/text");
		item = inDetails.iterateNext();
		if (item) {
			let jahrgang = /(?<val>[0-9]+)\s?\(/.exec(item.textContent);
			if (jahrgang) {
				td.jahrgang = jahrgang.groups.val;
			}
			let jahr = /\((?<val>.+?)\)/.exec(item.textContent);
			if (jahr) {
				td.jahr = jahr.groups.val;
			}
			let heft = /\), (?<val>.+?),/.exec(item.textContent);
			if (heft) {
				td.heft = heft.groups.val;
			}
			let seiten = /(?<typ>Seite|Spalte)\s(?<val>.+)/.exec(item.textContent);
			if (seiten) {
				if (seiten.groups.typ === "Spalte") {
					td.spalte = true;
				}
				td.seiten = seiten.groups.val;
			}
		}
		// Serie
		let serie = evaluator("//relatedItem[@type='series']/titleInfo/title");
		pusher(serie, "serie");
		// URL
		let url = evaluator("//url[@displayLabel='Volltext']");
		pusher(url, "url");
		td.url.sort(helfer.sortURL);
		// PPN
		let ppn = evaluator("//recordIdentifier[@source='DE-627']");
		pusher(ppn, "ppn");
		// Korrektur: Auflage ohne eckige Klammern
		td.auflage = td.auflage.replace(/^\[|\]$/g, "");
		// Korrektur: Ort ggf. aus Verlagsangabe ermitteln
		if (!td.ort.length && /:/.test(td.verlag)) {
			let ort = td.verlag.split(":");
			td.ort.push(ort[0].trim());
		}
		// Korrektur: "[u.a.]" in Ort aufhübschen
		td.ort.forEach((i, n) => td.ort[n] = i.replace(/\[u\.a\.\]/, "u. a."));
		// Korrektur: Jahr ohne eckige Klammern
		td.jahr = td.jahr.replace(/^\[|\]$/g, "");
		// Datensatz zurückgeben
		return td;
		// Großschreibung am Titelanfang
		function gross ({ds, start}) {
			for (let i = start, len = ds.length; i < len; i++) {
				ds[i] = ds[i].substring(0, 1).toUpperCase() + ds[i].substring(1);
			}
		}
	},
	// Eingabeformular: BibTeX-Import aus der Zwischenablage
	async eingabeBibTeX () {
		// PPN-Feld auslesen
		let pn = document.getElementById("red-lit-eingabe-pn"),
			ppn = pn.value.split(/[,\s]/)[0];
		if (!belegImport.PPNCheck({ppn})) {
			ppn = "";
		}
		// Formular leeren
		redLit.eingabeLeeren();
		redLit.eingabeStatus("add");
		// BibTeX-Daten suchen
		const {clipboard} = require("electron"),
			cp = clipboard.readText().trim();
		let bibtexDaten = "";
		if (belegImport.PPNCheck({ppn: cp})) {
			ppn = cp;
		} else if (belegImport.BibTeXCheck(cp)) {
			ppn = "";
			bibtexDaten = cp;
		}
		if (ppn) {
			bibtexDaten = await belegImport.PPNBibTeX({
				ppn,
				fokus: "red-lit-eingabe-ti-bibtex",
			});
			if (!bibtexDaten) {
				return;
			}
		}
		// kein BibTeX-Datensatz in Zwischenablage
		if (!bibtexDaten) {
			dialog.oeffnen({
				typ: "alert",
				text: `Weder im PPN-Feld noch in der Zwischenablage wurden <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Daten oder eine PPN gefunden.`,
				callback: () => document.getElementById("red-lit-eingabe-ti-bibtex").focus(),
			});
			return;
		}
		// BibTeX-Datensatz einlesen
		let titel = belegImport.BibTeXLesen(bibtexDaten, true);
		// Einlesen ist fehlgeschlagen
		if (!titel) {
			dialog.oeffnen({
				typ: "alert",
				text: `Das Einlesen des <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Datensatzes ist fehlgeschlagen.`,
				callback: () => document.getElementById("red-lit-eingabe-ti-bibtex").focus(),
			});
			return;
		}
		// Datensatz übernehmen
		let titelSp = titel[0].ds.qu.split(/https?:\/\//);
		if (titelSp[1]) {
			// URL + Aufrufdatum
			let protokoll = titel[0].ds.qu.match(/https?:\/\//)[0],
				url = titelSp[1].match(/(.+?) /)[1],
				ad = titelSp[1].match(/([0-9]{1,2})\.\s([0-9]{1,2})\.\s([0-9]{4})/);
			if (ad[1].length < 2) {
				ad[1] = "0" + ad[1];
			}
			if (ad[2].length < 2) {
				ad[2] = "0" + ad[2];
			}
			document.getElementById("red-lit-eingabe-ad").value = `${ad[3]}-${ad[2]}-${ad[1]}`;
			let ul = document.getElementById("red-lit-eingabe-ul");
			ul.value = protokoll + url;
			ul.dispatchEvent(new KeyboardEvent("input"));
		}
		// Titel
		let ti = document.getElementById("red-lit-eingabe-ti");
		const quelle = helfer.textTrim(titelSp[0], true);
		ti.value = quelle;
		ti.dispatchEvent(new KeyboardEvent("input"));
		// PPN
		if (!ppn) {
			let m = /^@[a-zA-Z]+\{(GBV-)?(?<ppn>.+?),/.exec(bibtexDaten);
			if (m && belegImport.PPNCheck({ppn: m.groups.ppn})) {
				ppn = m.groups.ppn;
			}
		}
		if (!pn.value) {
			pn.value = ppn;
		}
		// Titel fokussieren
		ti.focus();
	},
	// Eingabeformular: Titelaufnahme speichern
	eingabeSpeichern () {
		return new Promise(async resolve => {
			// Textfelder trimmen und ggf. typographisch aufhübschen
			let textfelder = document.getElementById("red-lit-eingabe").querySelectorAll(`input[type="text"], textarea`);
			for (let i of textfelder) {
				let val = i.value;
				if (i.id === "red-lit-eingabe-ti") { // Titelaufnahme typographisch aufhübschen
					val = redLit.eingabeFormatTitel(val);
				} else {
					val = val.replace(/[\r\n]+/g, "\n");
					val = helfer.textTrim(val, true);
				}
				i.value = val;
				if (i.nodeName === "TEXTAREA") {
					helfer.textareaGrow(i);
				}
			}
			// ID schon vergeben => bestehende Titelaufnahme ergänzen?
			const id = document.getElementById("red-lit-eingabe-id").value;
			if (redLit.eingabe.status === "add" && redLit.db.data[id]) {
				const verschmelzen = await new Promise(verschmelzen => {
					dialog.oeffnen({
						typ: "confirm",
						text: "Die ID ist schon vergeben.\nSoll die bestehende Titelaufnahme ergänzt werden?",
						callback: () => {
							if (dialog.antwort) {
								verschmelzen(true);
							} else {
								verschmelzen(false);
							}
						},
					});
				});
				if (verschmelzen) {
					redLit.eingabe.status = "change";
					redLit.eingabe.id = id;
				} else {
					document.getElementById("red-lit-eingabe-ti").focus();
					resolve(false);
					return;
				}
			}
			// Validierung des Formulars
			const valid = await redLit.eingabeSpeichernValid();
			if (!valid) {
				resolve(false);
				return;
			}
			// ggf. neuen Datensatz erstellen
			if (redLit.eingabe.status === "add") {
				redLit.db.data[id] = [];
			}
			// Daten zusammentragen
			let ds = redLit.eingabeSpeichernMakeDs();
			// ID wurde geändert => Datensatz umbenennen
			let idGeaendert = false;
			if (redLit.eingabe.status !== "add" &&
					redLit.eingabe.id !== id) {
				idGeaendert = true;
				// ggf. Titelaufnahme aus Suchtrefferliste entfernen
				redLit.sucheTrefferAuffrischen(redLit.eingabe.id, redLit.eingabe.slot);
				// ID der Titelaufnahme ändern
				redLit.db.data[id] = [];
				redLit.dbTitelKlonen(redLit.db.data[redLit.eingabe.id], redLit.db.data[id]);
				delete redLit.db.data[redLit.eingabe.id];
				redLit.db.dataOpts.push({
					aktion: "changeId",
					id,
					idAlt: redLit.eingabe.id,
				});
			}
			// Abbruch, wenn identisch mit vorherigem Datensatz
			if (redLit.db.data[id].length && !idGeaendert) {
				const diff = redLit.eingabeSpeichernDiff(redLit.db.data[id][0].td, ds.td);
				if (!diff) {
					dialog.oeffnen({
						typ: "alert",
						text: "Sie haben keine Änderungen vorgenommen.",
						callback: () => {
							document.getElementById("red-lit-eingabe-ti").focus();
						},
					});
					redLit.eingabeStatus(redLit.eingabe.status); // Änderungsmarkierung zurücksetzen
					resolve(false);
					return;
				}
			}
			// Datensatz schreiben
			redLit.db.data[id].unshift(ds);
			redLit.db.dataOpts.push({
				aktion: "add",
				id,
				idSlot: ds.id,
			});
			// Metadaten auffrischen
			redLit.eingabeMetaFuellen({id, slot: 0});
			// Status Eingabeformular auffrischen
			redLit.eingabe.slot = 0;
			redLit.eingabeStatus("change");
			// ggf. Titelaufnahme in der Suche auffrischen
			redLit.sucheTrefferAuffrischen(id);
			// Status Datenbank auffrischen
			redLit.dbGeaendert(true);
			resolve(true);
			return;
		});
	},
	// Eingabeformular: Formular validieren
	eingabeSpeichernValid () {
		return new Promise(async resolve => {
			// BenutzerIn registriert?
			if (!optionen.data.einstellungen.bearbeiterin) {
				fehler({
					text: `Sie können Titelaufnahmen erst ${redLit.eingabe.status === "add" ? "erstellen" : "ändern"}, nachdem Sie sich <a href="#" data-funktion="einstellungen-allgemeines">registriert</a> haben.`,
				});
				resolve(false);
				return;
			}
			// Warnung vor dem Ändern der ID
			let id = document.getElementById("red-lit-eingabe-id");
			if (redLit.eingabe.status !== "add" && redLit.eingabe.id !== id.value) {
				const aendern = await new Promise(antwort => {
					dialog.oeffnen({
						typ: "confirm",
						text: "Die ID nachträglich zu ändern, kann gravierende Konsequenzen haben.\nMöchten Sie die ID wirklich ändern?",
						callback: () => {
							if (!dialog.antwort) {
								id.value = redLit.eingabe.id;
								antwort(false);
							} else {
								antwort(true);
							}
						},
					});
				});
				if (!aendern) {
					id.focus();
					resolve(false);
					return;
				}
			}
			// Pflichtfelder ausgefüllt?
			let pflicht = {
				si: "keine Sigle",
				id: "keine ID",
				ti: "keinen Titel",
				fo: "keinen Fundort",
			};
			for (let [k, v] of Object.entries(pflicht)) {
				let feld = document.getElementById(`red-lit-eingabe-${k}`);
				if (!feld.value) {
					fehler({
						text: `Sie haben ${v} eingegeben.`,
						fokus: feld,
					});
					resolve(false);
					return;
				}
			}
			// ID korrekt formatiert?
			if (/[^a-z0-9ßäöü-]/.test(id.value) ||
					/^[0-9]/.test(id.value)) {
				fehler({
					text: "Die ID hat ein fehlerhaftes Format.\n<b>Erlaubt:</b><br>• Kleinbuchstaben a-z, ß und Umlaute<br>• Ziffern<br>• Bindestriche\n<b>Nicht Erlaubt:</b><br>• Großbuchstaben<br>• Ziffern am Anfang<br>• Sonderzeichen<br>• Leerzeichen",
					fokus: id,
				});
				resolve(false);
				return;
			}
			// ID schon vergeben?
			if (redLit.eingabe.status !== "add" &&
					redLit.eingabe.id !== id.value &&
					redLit.db.data[id.value]) {
				// wenn beim Hinzufügen eines Datensatzes die ID schon vergeben ist,
				// wird oben das Zusammenführen angeboten; hier geht es also nur um
				// das Ändern der ID, was nicht möglich ist, wenn sie schon vergeben wurde
				fehler({
					text: "Die ID ist schon vergeben.",
					fokus: id,
				});
				resolve(false);
				return;
			}
			// Beginnt die URL mit einem Protokoll?
			let url = document.getElementById("red-lit-eingabe-ul");
			if (url.value && !/^https?:\/\//.test(url.value)) {
				fehler({
					text: "Die URL muss mit einem Protokoll beginnen (http[s]://).",
					fokus: url,
				});
				resolve(false);
				return;
			}
			// Enthält die URL Whitespace?
			if (url.value && /\s/.test(url.value)) {
				fehler({
					text: "Die URL darf keine Whitespace-Zeichen (Leerzeichen, Tabs, Zeilenumbrüche) enthalten.",
					fokus: url,
				});
				resolve(false);
				return;
			}
			// wenn URL => Fundort "DTA" || "GoogleBooks" || "IDS" || "online"
			let fo = document.getElementById("red-lit-eingabe-fo");
			if (url.value && !/^(DTA|GoogleBooks|IDS|online)$/.test(fo.value)) {
				fehler({
					text: "Geben Sie eine URL an, muss der Fundort „online“, „DTA“, „GoogleBooks“ oder „IDS“ sein.",
					fokus: fo,
				});
				resolve(false);
				return;
			}
			// wenn URL => genauerer Check, ob die Eingabe konsistent ist
			if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url.value) && fo.value !== "DTA" ||
					/books\.google/.test(url.value) && fo.value !== "GoogleBooks" ||
					/owid\.de\//.test(url.value) && fo.value !== "IDS") {
				fehler({
					text: `Die URL passt nicht zum Fundort „${fo.value}“.`,
					fokus: fo,
				});
				resolve(false);
				return;
			}
			// wenn Aufrufdatum => URL eingeben
			let ad = document.getElementById("red-lit-eingabe-ad");
			if (ad.value && !url.value) {
				fehler({
					text: "Geben Sie ein Aufrufdatum an, müssen Sie auch eine URL angeben.",
					fokus: url,
				});
				resolve(false);
				return;
			}
			// Aufrufdatum in der Zukunft?
			let da = ad.value ? new Date(ad.value) : null;
			if (da) { // vgl. redLit.sucheStarten()
				da = new Date(da.getFullYear(), da.getMonth(), da.getDate());
			}
			if (da && da >= new Date()) {
				fehler({
					text: "Das Aufrufdatum liegt in der Zukunft.",
					fokus: ad,
				});
				resolve(false);
				return;
			}
			// Fundort mit gültigem Wert?
			if (fo.value && !redLit.eingabe.fundorte.includes(fo.value)) {
				let fundorte = redLit.eingabe.fundorte.join(", ").match(/(.+), (.+)/);
				fehler({
					text: `Der Fundort ist ungültig. Erlaubt sind nur die Werte:\n${fundorte[1]} oder ${fundorte[2]}`,
					fokus: fo,
				});
				resolve(false);
				return;
			}
			// wenn Fundort "DTA" || "GoogleBooks" || "IDS" || "online" => URL eingeben
			if (/^(DTA|GoogleBooks|IDS|online)$/.test(fo.value) && !url.value) {
				fehler({
					text: "Ist der Fundort „online“, „DTA“, „GoogleBooks“ oder „IDS“, müssen Sie eine URL angeben.",
					fokus: url,
				});
				resolve(false);
				return;
			}
			// PPN(s) okay?
			let ppn = document.getElementById("red-lit-eingabe-pn");
			if (ppn.value) {
				let ppns = ppn.value.split(/[,\s]/),
					korrekt = [],
					fehlerhaft = [];
				for (let i of ppns) {
					if (i && !belegImport.PPNCheck({ppn: i})) {
						fehlerhaft.push(i);
					} else if (i) {
						korrekt.push(i);
					}
				}
				if (fehlerhaft.length) {
					let numerus = `<abbr title="Pica-Produktionsnummern">PPN</abbr> sind`;
					if (fehlerhaft.length === 1) {
						numerus = `<abbr title="Pica-Produktionsnummer">PPN</abbr> ist`;
					}
					fehler({
						text: `Diese ${numerus} fehlerhaft:\n${fehlerhaft.join(", ")}`,
						fokus: ppn,
					});
					resolve(false);
					return;
				} else {
					ppn.value = korrekt.join(", ");
				}
			}
			// alles okay
			resolve(true);
			return;
			// Fehlermeldung
			function fehler ({text, fokus = false}) {
				let opt = {
					typ: "alert",
					text,
				};
				if (fokus) {
					opt.callback = () => {
						fokus.select();
					};
				}
				dialog.oeffnen(opt);
				document.querySelectorAll("#dialog-text a").forEach(a => {
					a.addEventListener("click", function(evt) {
						evt.preventDefault();
						switch (this.dataset.funktion) {
							case "einstellungen-allgemeines":
								optionen.oeffnen();
								optionen.sektionWechseln(document.querySelector("#einstellungen ul a"));
								break;
						}
						setTimeout(() => overlay.schliessen(document.getElementById("dialog")), 200);
					});
				});
			}
		});
	},
	// Eingabeformular: einen neuen Datensatz auf Grundlage des Formulars erstellen
	eingabeSpeichernMakeDs () {
		let ds = {
			be: optionen.data.einstellungen.bearbeiterin,
			da: new Date().toISOString(),
			id: redLit.eingabeSpeichernMakeID(),
			td: {},
		};
		let felder = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
		for (let i of felder) {
			let k = i.id.replace(/.+-/, "");
			if (i.type === "button" ||
					/^(id|tg)$/.test(k)) {
				continue;
			}
			if (k === "pn") {
				let val = i.value.split(/[,\s]/),
					arr = [];
				for (let ppn of val) {
					if (ppn) {
						arr.push(ppn);
					}
				}
				ds.td.pn = arr;
			} else {
				ds.td[k] = i.value;
			}
		}
		ds.td.tg = redLit.eingabeTagsZusammentragen();
		return ds;
	},
	// Eingabeformular: ID für einen Datensatz erstellen
	eingabeSpeichernMakeID () {
		const hex = "0123456789abcdef";
		let id = "";
		x: while (true) {
			// ID erstellen
			id = "";
			while (id.length < 10) {
				id += hex[helfer.zufall(0, 15)];
			}
			// ID überprüfen
			for (let v of Object.values(redLit.db.data)) {
				for (let i = 0, len = v.length; i < len; i++) {
					if (v[i].id === id) {
						continue x;
					}
				}
			}
			break;
		}
		return id;
	},
	// Eingabeformular: ermittelt, ob zwei Titeldatensätze voneinander abweichen
	//   alt = Object
	//     (alter Datensatz mit Titeldaten)
	//   neu = Object
	//     (neuer Datensatz mit Titeldaten)
	eingabeSpeichernDiff (alt, neu) {
		let diff = false;
		for (let [k, v] of Object.entries(alt)) {
			let n = neu[k];
			if (Array.isArray(v)) {
				v = v.join(",");
				n = n.join(",");
			}
			if (v !== n) {
				diff = true;
				break;
			}
		}
		return diff;
	},
	// Eingabeformular: neue Titelaufnahme hinzufügen
	eingabeHinzufuegen () {
		// ggf. zum Formular wechseln
		redLit.nav("eingabe");
		// Formular leeren
		redLit.eingabeLeeren();
		// Formularstatus ändern
		redLit.eingabeStatus("add");
		// Formular fokussieren
		document.getElementById("red-lit-eingabe-ti").focus();
	},
	// Eingabeformular: Listener für Bearbeitenlinks
	//   a = Element
	//     (Icon-Link zum Bearbeiten eines Eintrags)
	eingabeBearbeitenListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			redLit.anzeigePopupSchliessen();
			let json = JSON.parse(this.closest(".red-lit-snippet").dataset.ds);
			redLit.dbCheck(() => redLit.eingabeBearbeiten(json), false);
		});
	},
	// Eingabeformular: Eintrag bearbeiten
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	eingabeBearbeiten ({id, slot}) {
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// zum Formular wechseln
		redLit.nav("eingabe");
		// Formular leeren
		redLit.eingabeLeeren();
		// Formular füllen
		let ds = redLit.db.data[id][slot].td,
			inputs = document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea");
		for (let i of inputs) {
			let key = i.id.replace(/.+-/, "");
			if (i.type === "button" || key === "tg") { // Tags müssen anders angezeigt werden
				continue;
			}
			if (key === "id") {
				i.value = id;
			} else {
				i.value = Array.isArray(ds[key]) ? ds[key].join(", ") : ds[key];
				if (i.nodeName === "TEXTAREA") {
					helfer.textareaGrow(i);
				}
			}
		}
		// Tags anzeigen
		redLit.eingabeTagsFuellen({tags: ds.tg});
		// Metadaten füllen
		redLit.eingabeMetaFuellen({id, slot});
		// Formularstatus auffrischen
		let status = "change";
		if (slot > 0) {
			status = "old";
		}
		redLit.eingabe.slot = slot;
		redLit.eingabeStatus(status);
		// Formular fokussieren
		document.getElementById("red-lit-eingabe-ti").focus();
	},
	// Eingabeformular: Tags im Formular zusammentragen
	eingabeTagsZusammentragen () {
		let tags = document.getElementById("red-lit-eingabe-tags").querySelectorAll(".tag"),
			arr = [];
		tags.forEach(i => arr.push(i.textContent));
		return arr;
	},
	// Eingabeformular: Tags anzeigen
	//   tags = Array
	//     (Array mit den Tags)
	eingabeTagsFuellen ({tags}) {
		let cont = document.getElementById("red-lit-eingabe-tags");
		helfer.keineKinder(cont);
		for (let tag of tags) {
			let span = redLit.eingabeTagErzeugen({tag});
			cont.appendChild(span);
			span.classList.add("loeschbar");
			redLit.eingabeTagLoeschen({tag: span});
		}
	},
	// Eingabeformular: Tag-Element erzeugen
	//   tag = String
	//     (der Name des Tags)
	eingabeTagErzeugen ({tag}) {
		let span = document.createElement("span");
		span.classList.add("tag");
		span.innerHTML = redLit.anzeigeSnippetMaskieren(tag);
		return span;
	},
	// Eingabeformular: Tag löschen
	//   tag = Element
	//     (Tag, der gelöscht werden soll)
	eingabeTagLoeschen ({tag}) {
		tag.addEventListener("click", function() {
			this.parentNode.removeChild(this);
			redLit.eingabeGeaendert();
		});
	},
	// Eingabeformular: Tag hinzufügen
	eingabeTagHinzufuegen () {
		let tg = document.getElementById("red-lit-eingabe-tg"),
			val = helfer.textTrim(tg.value, true);
		// keine Eingae
		if (!val) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keinen Tag eingegeben.",
				callback: () => tg.select(),
			});
			return;
		}
		// aktuelle Tags sammeln
		let arr = redLit.eingabeTagsZusammentragen();
		// Tag schon vorhanden
		if (arr.includes(val)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Der Tag ist schon vorhanden.",
				callback: () => tg.select(),
			});
			return;
		}
		// Tag ergänzen und die Anzeige neu aufbauen
		arr.push(val);
		arr.sort(helfer.sortAlpha);
		redLit.eingabeTagsFuellen({tags: arr});
		redLit.eingabeGeaendert();
		tg.value = "";
	},
	// Eingabeformular: alle Tags aus der Literaturdatenbank zusammensuchen
	eingabeTagsAuflisten () {
		let tags = new Set();
		for (let titel of Object.values(redLit.db.data)) { // Titel durchgehen
			for (let aufnahme of titel) { // Aufnahmen durchgehen
				for (let tag of aufnahme.td.tg) { // Tags durchgehen
					if (!redLit.eingabe.tags.includes(tag)) {
						tags.add(tag);
					}
				}
			}
		}
		// Tags sortieren
		let arr = [...tags];
		arr.sort(helfer.sortAlpha);
		// vordefinierte Tags an den Anfang schieben
		let pre = [...redLit.eingabe.tags];
		pre.reverse();
		for (let i of pre) {
			arr.unshift(i);
		}
		return arr;
	},
	// Eingabe: Metadaten eintragen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	eingabeMetaFuellen ({id, slot}) {
		// Werte vorbereiten
		let werte = {
			BearbeiterIn: optionen.data.einstellungen.bearbeiterin,
			Datum: " ",
			Aufnahme: " ",
		};
		if (!werte.BearbeiterIn) {
			werte.BearbeiterIn = "N. N.";
		}
		if (id) {
			let ds = redLit.db.data[id][slot];
			werte.BearbeiterIn = ds.be;
			werte.Datum = helfer.datumFormat(ds.da, "sekunden");
			let aufnahmen = redLit.db.data[id].length;
			werte.Aufnahme = `v${aufnahmen - slot} von ${aufnahmen}`;
		}
		// Werte drucken
		let td = document.getElementById("red-lit-eingabe-meta");
		helfer.keineKinder(td);
		for (let [k, v] of Object.entries(werte)) {
			let cont = document.createElement("span");
			td.appendChild(cont);
			let label = document.createElement("span");
			cont.appendChild(label);
			label.textContent = `${k}:`;
			cont.appendChild(document.createTextNode(` ${v}`));
			// ggf. ermöglichen, Versionen-Popup zu öffnen
			if (id && k === "Aufnahme") {
				cont.dataset.ds = `{"id":"${id}","slot":${slot}}`;
				redLit.anzeigePopupListener(cont);
			}
		}
	},
	// Anzeige: Speicher für Variablen
	anzeige: {
		snippetKontext: "suche", // "suche" || "popup"
		id: "", // ID des im Popup angezeigten Titels
	},
	// Anzeige: Snippet einer Titelaufnahme erstellen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	anzeigeSnippet ({id, slot}) {
		let ds = redLit.db.data[id][slot];
		// Snippet füllen
		let div = document.createElement("div");
		div.classList.add("red-lit-snippet");
		div.dataset.ds = `{"id":"${id}","slot":${slot}}`;
		// Sigle
		let si = document.createElement("p");
		div.appendChild(si);
		si.classList.add("sigle");
		si.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.si);
		// ID
		let idPrint = document.createElement("span");
		si.appendChild(idPrint);
		idPrint.classList.add("id");
		idPrint.textContent = id;
		// alte Aufnahme
		if (slot > 0 && redLit.anzeige.snippetKontext === "suche") {
			let alt = document.createElement("span");
			si.appendChild(alt);
			alt.classList.add("veraltet");
			alt.textContent = "[Titelaufnahme veraltet]";
		}
		// Icons
		let icons = document.createElement("span");
		si.appendChild(icons);
		icons.classList.add("icons");
		// Icon: Löschen
		if (redLit.anzeige.snippetKontext === "popup") {
			let del = document.createElement("a");
			icons.appendChild(del);
			del.href = "#";
			del.classList.add("icon-link", "icon-muelleimer");
			del.title = "Titelaufnahme löschen";
			redLit.titelLoeschenFrage(del);
		}
		// Icon: Versionen
		if (redLit.anzeige.snippetKontext === "suche") {
			let vers = document.createElement("a");
			icons.appendChild(vers);
			vers.href = "#";
			vers.classList.add("icon-link", "icon-kreis-info");
			vers.title = "Versionen anzeigen";
			redLit.anzeigePopupListener(vers);
		}
		// Icon: Bearbeiten
		let bearb = document.createElement("a");
		icons.appendChild(bearb);
		bearb.href = "#";
		bearb.classList.add("icon-link", "icon-stift");
		bearb.title = "Titelaufnahme bearbeiten";
		redLit.eingabeBearbeitenListener(bearb);
		// Titelaufnahme
		let ti = document.createElement("p");
		div.appendChild(ti);
		ti.classList.add("aufnahme");
		ti.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.ti);
		// URL + Aufrufdatum
		if (ds.td.ul) {
			let ul = document.createElement("p");
			div.appendChild(ul);
			let a = document.createElement("a");
			ul.appendChild(a);
			a.classList.add("link");
			a.href = ds.td.ul;
			a.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.ul);
			helfer.externeLinks(a);
			if (ds.td.ad) {
				let datum = ds.td.ad.split("-");
				datum[1] = datum[1].replace(/^0/, "");
				datum[2] = datum[2].replace(/^0/, "");
				let i = document.createElement("i");
				ul.appendChild(i);
				i.textContent = "Aufrufdatum:";
				ul.appendChild(i);
				let adFrag = document.createElement("span");
				ul.appendChild(adFrag);
				adFrag.innerHTML = redLit.anzeigeSnippetHighlight(` ${datum[2]}. ${datum[1]}. ${datum[0]}`);
			}
		}
		// Fundort
		let fo = document.createElement("p");
		div.appendChild(fo);
		let i = document.createElement("i");
		fo.appendChild(i);
		i.textContent = "Fundort:";
		let foFrag = document.createElement("span");
		fo.appendChild(foFrag);
		foFrag.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.fo);
		// PPN
		if (ds.td.pn.length) {
			let pn = document.createElement("p");
			div.appendChild(pn);
			let i = document.createElement("i");
			pn.appendChild(i);
			i.textContent = "PPN:";
			for (let i = 0, len = ds.td.pn.length; i < len; i++) {
				if (i > 0) {
					pn.appendChild(document.createTextNode(", "));
				}
				let a = document.createElement("a");
				pn.appendChild(a);
				a.classList.add("link");
				a.href = `https://kxp.k10plus.de/DB=2.1/PPNSET?PPN=${ds.td.pn[i]}`;
				a.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.pn[i]);
				helfer.externeLinks(a);
			}
		}
		// Notizen
		if (ds.td.no) {
			let no = document.createElement("p");
			div.appendChild(no);
			let i = document.createElement("i");
			no.appendChild(i);
			i.textContent = "Notizen:";
			let noFrag = document.createElement("span");
			no.appendChild(noFrag);
			const notiz = redLit.anzeigeSnippetHighlight(ds.td.no);
			noFrag.innerHTML = notiz.replace(/[\r\n]+/g, "<br>");
		}
		// Tags
		if (ds.td.tg.length) {
			let p = document.createElement("p");
			div.appendChild(p);
			p.classList.add("tags");
			for (let tag of ds.td.tg) {
				tag = redLit.anzeigeSnippetHighlight(tag);
				let span = redLit.eingabeTagErzeugen({tag});
				p.appendChild(span);
			}
		}
		// Metadaten: BearbeiterIn + Datum + Titelaufnahmen
		// (nur im Suchkontext anzeigen)
		if (redLit.anzeige.snippetKontext === "suche") {
			let meta = document.createElement("p");
			div.appendChild(meta);
			meta.classList.add("meta");
			// Bearbeiterin
			meta.innerHTML = redLit.anzeigeSnippetHighlight(ds.be);
			// Zeitpunkt
			let zeit = document.createElement("span");
			meta.appendChild(zeit);
			zeit.textContent = helfer.datumFormat(ds.da, "sekunden");
			// Anzahl Versionen
			let aufnahmen = document.createElement("span");
			meta.appendChild(aufnahmen);
			aufnahmen.classList.add("titelaufnahmen");
			let numerus = "Version";
			if (redLit.db.data[id].length > 1) {
				numerus = "Versionen";
			}
			aufnahmen.textContent = `${redLit.db.data[id].length} ${numerus}`;
			redLit.anzeigePopupListener(aufnahmen);
		}
		// ggf. Klick-Event an das Snippet hängen
		if (redLit.anzeige.snippetKontext === "suche") {
			redLit.sucheSnippetMarkierenListener(div);
		}
		// Snippet zurückgeben
		return div;
	},
	// Anzeige: Suchtreffer im Snippet highlighten
	//   text = String
	//     (Text, der gedruckt werden soll)
	anzeigeSnippetHighlight (text) {
		// Muss/kann Text hervorgehoben werden?
		if (redLit.anzeige.snippetKontext !== "suche" ||
				!redLit.suche.highlight.length) {
			return text;
		}
		// Suchtext hervorheben
		for (let i of redLit.suche.highlight) {
			text = text.replace(i, m => `<mark class="suche">${m}</mark>`);
		}
		text = redLit.anzeigeSnippetMaskieren(text);
		text = helfer.suchtrefferBereinigen(text);
		return text;
	},
	// Anzeige: Maskieren von Spitzklammern
	//   text = String
	//     (Text, der gedruckt werden soll)
	anzeigeSnippetMaskieren (text) {
		text = text.replace(/</g, "&lt;");
		text = text.replace(/>/g, "&gt;");
		text = text.replace(/&lt;mark class="suche"&gt;/g, `<mark class="suche">`);
		text = text.replace(/&lt;\/mark&gt;/g, `</mark>`);
		return text;
	},
	// Anzeige: Listener zum Öffnen des Versionen-Popups
	//   ele = Element
	//     (Element, über das das Popup geöffnet werden soll)
	anzeigePopupListener (ele) {
		ele.addEventListener("click", function(evt) {
			evt.preventDefault();
			evt.stopPropagation();
			const ds = this.dataset.ds ? this.dataset.ds : this.closest(".red-lit-snippet").dataset.ds;
			let json = JSON.parse(ds);
			redLit.anzeigePopup(json);
		});
	},
	// Anzeige: Versionen-Popup für Titelaufnahmen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	anzeigePopup ({id, slot}) {
		redLit.anzeige.snippetKontext = "popup";
		redLit.anzeige.id = id;
		// aktuelles Popup ggf. entfernen
		redLit.anzeigePopupSchliessen();
		// Fenster erzeugen
		let win = document.createElement("div");
		document.querySelector("#red-lit > div").appendChild(win);
		win.id = "red-lit-popup";
		// Schließen-Icon
		let img = document.createElement("img");
		win.appendChild(img);
		img.src = "img/x.svg";
		img.width = "24";
		img.height = "24";
		img.title = "Popup schließen (Esc)";
		img.addEventListener("click", () => redLit.anzeigePopupSchliessen());
		// Versionen-Feld
		let vers = document.createElement("div");
		win.appendChild(vers);
		vers.id = "red-lit-popup-versionen";
		redLit.anzeigePopupVersionen(slot);
		// Titel-Feld
		let titel = document.createElement("div");
		win.appendChild(titel);
		titel.id = "red-lit-popup-titel";
		titel.appendChild(redLit.anzeigeSnippet({id, slot}));
	},
	// Anzeige: vorhandene Titelaufnahmen im Versionen-Popup auflisten
	//   slot = Number || undefined
	//     (Titelaufnahme, die angezeigt werden soll)
	anzeigePopupVersionen (slot = 0) {
		let vers = document.getElementById("red-lit-popup-versionen"),
			aufnahme = redLit.db.data[redLit.anzeige.id];
		vers.scrollTop = 0;
		helfer.keineKinder(vers);
		for (let i = 0, len = aufnahme.length; i < len; i++) {
			let div = document.createElement("div");
			vers.appendChild(div);
			if (i === slot) {
				div.classList.add("aktiv");
			}
			div.dataset.slot = i;
			let infos = [
				`v${len - i}`, // Version
				helfer.datumFormat(aufnahme[i].da, "technisch"), // Datum
				aufnahme[i].be, // BearbeiterIn
			];
			for (let i of infos) {
				let span = document.createElement("span");
				div.appendChild(span);
				span.textContent = i;
			}
			redLit.anzeigePopupWechseln(div);
		}
		// ggf. aktives Element in den Blick scrollen
		let aktiv = vers.querySelector(".aktiv");
		if (aktiv.offsetTop + aktiv.offsetHeight > vers.offsetHeight) {
			vers.scrollTop = aktiv.offsetTop;
		}
	},
	// Anzeige: Titelaufnahme aus der Liste auswählen und anzeigen
	//   div = Element
	//     (die angeklickte Titelaufnahme)
	anzeigePopupWechseln (div) {
		div.addEventListener("click", function() {
			if (this.classList.contains("aktiv")) {
				return;
			}
			// ausgewählte Titelaufnahme aktivieren
			document.querySelector("#red-lit-popup-versionen .aktiv").classList.remove("aktiv");
			this.classList.add("aktiv");
			// Titelaufnahme anzeigen
			redLit.anzeige.snippetKontext = "popup";
			let snippet = redLit.anzeigeSnippet({
				id: redLit.anzeige.id,
				slot: parseInt(this.dataset.slot, 10),
			});
			let titel = document.getElementById("red-lit-popup-titel");
			titel.replaceChild(snippet, titel.firstChild);
		});
	},
	// Anzeige: Titelaufnahme im Popup wechseln (Strg + ↑/↓)
	//   evt = Object
	//     (Event-Object des keydown)
	anzeigePopupNav (evt) {
		let slot = parseInt(document.querySelector("#red-lit-popup-versionen .aktiv").dataset.slot, 10);
		if (evt.key === "ArrowDown") {
			slot++;
		} else {
			slot--;
		}
		if (slot < 0 || slot === redLit.db.data[redLit.anzeige.id].length) {
			return;
		}
		let div = document.querySelector(`#red-lit-popup-versionen [data-slot="${slot}"]`);
		div.dispatchEvent(new MouseEvent("click"));
	},
	// Anzeige: Versionen-Popup schließen
	anzeigePopupSchliessen () {
		let win = document.getElementById("red-lit-popup");
		if (!win) {
			return;
		}
		win.parentNode.removeChild(win);
	},
	// Titelaufnahme löschen (Sicherheitsfrage)
	//   a = Element
	//     (Icon-Link zum Löschen)
	titelLoeschenFrage (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let json = JSON.parse(this.closest(".red-lit-snippet").dataset.ds),
				aufnahme = redLit.db.data[json.id],
				text = `Soll Version #${aufnahme.length - json.slot} der Titelaufnahme wirklich gelöscht werden?`;
			if (aufnahme.length === 1) {
				text = "Soll die Titelaufnahme wirklich komplett gelöscht werden?";
			}
			dialog.oeffnen({
				typ: "confirm",
				text,
				callback: () => {
					if (dialog.antwort) {
						redLit.titelLoeschen(json);
					}
				},
			});
		});
	},
	// Titelaufnahme löschen
	//   id = String
	//     (ID der Titelaufnahme)
	//   slot = Number
	//     (Slot der Titelaufnahme)
	async titelLoeschen ({id, slot}) {
		redLit.db.dataOpts.push({
			aktion: "del",
			id,
			idSlot: redLit.db.data[id][slot].id,
		});
		redLit.db.data[id].splice(slot, 1);
		// ggf. Suche auffrischen
		redLit.sucheTrefferAuffrischen(id, slot);
		// ggf. Eingabeformular auffrischen oder zurücksetzen
		if (redLit.eingabe.id === id) {
			if (!redLit.db.data[id].length || // Titelaufnahme existiert nicht mehr
					slot === redLit.eingabe.slot) { // der entfernte Slot wird gerade angezeigt
				await redLit.dbCheck(() => {
					redLit.eingabeLeeren();
					redLit.eingabeStatus("add");
				}, false);
			} else { // Titelaufnahme existiert noch
				redLit.eingabeMetaFuellen({id, slot: 0});
				let ds = redLit.eingabeSpeichernMakeDs();
				const diff = redLit.eingabeSpeichernDiff(redLit.db.data[id][0].td, ds.td);
				if (diff) {
					document.getElementById("red-lit-eingabe-ti").dispatchEvent(new KeyboardEvent("input"));
				}
			}
		}
		// Datensatz ggf. komplett löschen/Popup auffrischen
		if (!redLit.db.data[id].length) {
			delete redLit.db.data[id];
			redLit.anzeigePopupSchliessen();
		} else {
			redLit.anzeigePopupVersionen();
			let titel = document.getElementById("red-lit-popup-titel");
			redLit.anzeige.snippetKontext = "popup";
			titel.replaceChild(redLit.anzeigeSnippet({id, slot: 0}), titel.firstChild);
		}
		// Status Datenbank auffrischen
		redLit.dbGeaendert(true);
	},
	// Titelaufnahme in die Zwischenablage
	//   typ = String
	//     (Texttyp, der in die Zwischenablage kopiert werden soll)
	titelZwischenablage (typ) {
		const {clipboard} = require("electron");
		let text = "";
		if (typ === "plainReferenz") {
			text = popup.titelaufnahme.ds.id;
		} else if (typ === "xmlReferenz") {
			text = `<Literaturreferenz Ziel="${popup.titelaufnahme.ds.id}"></Literaturreferenz>`;
		} else if (typ === "plain") {
			text = redLit.dbExportierenSnippetPlain(popup.titelaufnahme.ds);
		} else if (typ === "xml") {
			let parser = new DOMParser(),
				snippet = redLit.dbExportierenSnippetXML(popup.titelaufnahme.ds),
				xmlDoc = parser.parseFromString(snippet, "text/xml");
			xmlDoc = helferXml.indent(xmlDoc);
			text = new XMLSerializer().serializeToString(xmlDoc);
		}
		clipboard.writeText(text);
		helfer.animation("zwischenablage");
	},
};
