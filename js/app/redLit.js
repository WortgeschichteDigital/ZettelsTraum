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
		// Datenbank laden
		const dbGeladen = await redLit.dbLaden();
		// passendes Formular öffnen
		if (dbGeladen) {
			redLit.sucheWechseln();
		} else {
			redLit.eingabeHinzufuegen();
		}
	},
	// Fenster schließen
	schliessen () {
		redLit.dbCheck(() => {
			if (!optionen.data["literatur-db"]) {
				redLit.dbEntkoppeln();
			}
			overlay.ausblenden(document.getElementById("red-lit"));
		});
	},
	// Datenbank: Speicher für Variablen
	db: {
		data: {}, // Titeldaten der Literaturdatenbank (wenn DB geladen => Inhalt von DB.ti)
		dataMeta: { // Metadaten der Literaturdatenbank
			dc: "", // Erstellungszeitpunkt (DB.dc)
			dm: "", // Änderungszeitpunkt (DB.dm)
			re: 0, // Revisionsnummer (DB.re)
		},
		ve: 1, // Versionsnummer des aktuellen Datenbankformats
		gefunden: false, // Datenbankdatei gefunden (könnte im Netzwerk temporär verschwunden sein)
		changed: false, // Inhalt der Datenbank wurde geändert und noch nicht gespeichert
	},
	// Datenbank: Datei laden
	dbLaden () {
		return new Promise(async resolve => {
			// Anzeige auffrischen
			redLit.dbAnzeige();
			// ggf. Datenbank einlesen
			if (!optionen.data["literatur-db"]) {
				resolve(false);
				return;
			}
			const dbExistiert = await helfer.exists(optionen.data["literatur-db"]);
			// Datenkbank wurde wiedergefunden
			if (dbExistiert) {
				redLit.db.gefunden = true;
				const result = await redLit.dbOeffnenEinlesen(optionen.data["literatur-db"]);
				if (result !== true) {
					dialog.oeffnen({
						typ: "alert",
						text: result,
					});
					resolve(false);
					return;
				}
				resolve(true);
				return;
			}
			// Datenbank wurde nicht wiedergefunden
			// (kann temporär verschwunden sein, weil sie im Netzwerk liegt)
			redLit.db.gefunden = false;
			// versuchen, die Offline-Version zu laden
			const dbOffline = await redLit.dbLadenOffline();
			if (dbOffline) {
				resolve(true);
				return;
			}
			// Laden ist endgültig gescheitert => Datenbank entkoppeln
			redLit.dbEntkoppeln();
			resolve(false);
		});
	},
	// Datenkbank: versuchen, die Offline-Version zu laden
	dbLadenOffline () {
		return new Promise(async resolve => {
			const path = require("path");
			let reg = new RegExp(`.+${helfer.escapeRegExp(path.sep)}(.+)`),
				dateiname = optionen.data["literatur-db"].match(reg),
				offlinePfad = path.join(appInfo.userData, dateiname[1]);
			const dbOffline = await helfer.exists(offlinePfad);
			if (dbOffline) {
				let result = await redLit.dbOeffnenEinlesen(offlinePfad);
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
		if (!optionen.data["literatur-db"]) { // keine DB mit dem Programm verknüpft
			pfad.classList.add("keine-db");
			pfad.textContent = "keine Datenbank geladen";
		} else { // DB mit dem Programm verknüpft
			pfad.classList.remove("keine-db");
			pfad.textContent = `\u200E${optionen.data["literatur-db"]}\u200E`;
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
	dbEntkoppeln () {
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
		// DB-Datensätze zurücksetzen
		redLit.db.data = {};
		redLit.db.dataMeta = {
			dc: "",
			dm: "",
			re: 0,
		};
		redLit.db.gefunden = false;
		redLit.db.changed = false;
		if (optionen.data["literatur-db"]) {
			optionen.data["literatur-db"] = "";
			optionen.speichern();
		}
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
		const ergebnis = await redLit.dbOeffnenEinlesen(result.filePaths[0]);
		if (ergebnis === true) {
			// Datensätze auffrischen
			redLit.db.gefunden = true;
			redLit.db.changed = false;
			if (optionen.data["literatur-db"] !== result.filePaths[0]) {
				optionen.data["literatur-db"] = result.filePaths[0];
				optionen.speichern();
			}
			// DB-Anzeige auffrischen
			redLit.dbAnzeige();
			// Suche zurücksetzen
			redLit.sucheReset();
			// Eingabeformular zurücksetzen
			redLit.eingabeLeeren();
			redLit.eingabeStatus("add");
		} else {
			// Einlesen ist gescheitert
			dialog.oeffnen({
				typ: "altert",
				text: ergebnis,
			});
		}
	},
	// Datenbank: Datei einlesen
	//   pfad = String
	//     (Pfad zur Datei)
	dbOeffnenEinlesen (pfad) {
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
				return;
			}
			// Wirklich eine ZTL-Datei?
			if (data_tmp.ty !== "ztl") {
				resolve(`Die Literaturdatenbank konnte nicht eingelesen werden.\nEs handelt sich nicht um eine <i>${appInfo.name} Literaturdatenbank</i>.`);
				redLit.dbEntkoppeln();
				return;
			}
			// Datei kann eingelesen werden
			redLit.db.data = data_tmp.ti;
			redLit.db.dataMeta.dc = data_tmp.dc;
			redLit.db.dataMeta.dm = data_tmp.dm;
			redLit.db.dataMeta.re = data_tmp.re;
			// Datenbank für Offline-Nutzung verfügbar halten
			redLit.dbOfflineKopie(pfad);
			// Promise auflösen
			resolve(true);
		});
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
			format.name = "Plain text";
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
		aufnahmen.sort(redLit.dbSortAufnahmen);
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
			xmlDoc = xml.indent(xmlDoc);
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
		snippet += `<Sigle>${ds.si}</Sigle>`;
		snippet += `<unstrukturiert>${ds.ti}</unstrukturiert>`;
		if (ds.ul) {
			snippet += `<URL>${ds.ul}</URL>`;
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
	// Datenbank: Helferfunktion zum Sortieren der Titelaufnahmen
	//   a = Object
	//   b = Object
	//     (die Objekte enthalten die Schlüssel "id" [String] und "slot" [Number])
	dbSortAufnahmen (a, b) {
		const siA = helfer.sortAlphaPrep( ex(redLit.db.data[a.id][a.slot].td.si ) ),
			siB = helfer.sortAlphaPrep( ex( redLit.db.data[b.id][b.slot].td.si ) );
		let arr = [siA, siB];
		arr.sort();
		if (arr[0] === siA) {
			return -1;
		}
		return 1;
		function ex (sigle) {
			return sigle.replace(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/, "");
		}
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
		if (optionen.data["literatur-db"] &&
				!redLit.db.gefunden) {
			const dbGefunden = await helfer.exists(optionen.data["literatur-db"]);
			if (dbGefunden) {
				redLit.db.gefunden = true;
			}
		}
		// Dateipfad ist bekannt und wurde wiedergefunden => direkt schreiben
		if (optionen.data["literatur-db"] &&
				redLit.db.gefunden &&
				!speichernUnter) {
			const ergebnis = await redLit.dbSpeichernSchreiben(optionen.data["literatur-db"]);
			if (ergebnis === true) {
				redLit.dbAnzeige();
				redLit.dbOfflineKopie(optionen.data["literatur-db"]);
			} else {
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
			defaultPath: path.join(appInfo.documents, "Literatur.ztl"),
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
			opt.defaultPath = path.join(optionen.data.letzter_pfad, "Literatur.ztl");
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
		const ergebnis = await redLit.dbSpeichernSchreiben(result.filePath);
		if (ergebnis === true) {
			// ggf. Pfad zur Datenbankdatei speichern
			if (optionen.data["literatur-db"] !== result.filePath) {
				optionen.data["literatur-db"] = result.filePath;
				optionen.speichern();
			}
			// Anzeige auffrischen
			redLit.dbAnzeige();
			// Offline-Kopie speichern
			redLit.dbOfflineKopie(result.filePath);
		} else {
			dialog.oeffnen({
				typ: "alert",
				text: ergebnis,
			});
		}
	},
	// Datenbank: Datei schreiben
	//   pfad = String
	//     (Pfad zur Datei)
	//   offline = true || undefined
	//     (Datei wird für Offline-Nutzung gespeichert => Metadaten nicht auffrischen)
	dbSpeichernSchreiben (pfad, offline = false) {
		return new Promise(async resolve => {
			// alte Metadaten merken für den Fall, dass das Speichern scheitert
			let meta = {
				dc: redLit.db.dataMeta.dc,
				dm: redLit.db.dataMeta.dm,
				re: redLit.db.dataMeta.re,
			};
			// Metadaten auffrischen
			// (nur wenn kein Speichern für Offline-Nutzung)
			if (!offline) {
				if (!redLit.db.dataMeta.dc) {
					redLit.db.dataMeta.dc = new Date().toISOString();
				}
				redLit.db.dataMeta.dm = new Date().toISOString();
				redLit.db.dataMeta.re++;
			}
			// Daten zusammentragen
			let db = {
				dc: redLit.db.dataMeta.dc,
				dm: redLit.db.dataMeta.dm,
				re: redLit.db.dataMeta.re,
				ti: redLit.db.data,
				ty: "ztl",
				ve: redLit.db.ve,
			};
			let result = await io.schreiben(pfad, JSON.stringify(db));
			// beim Schreiben ist ein Fehler aufgetreten
			if (result !== true) {
				resolve(`Beim Speichern der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`);
				// Metdaten zurücksetzen
				redLit.db.dataMeta.dc = meta.dc;
				redLit.db.dataMeta.dm = meta.dm;
				redLit.db.dataMeta.re = meta.re;
				// Fehler auswerfen
				throw result;
			}
			// Schreiben war erfolgreich
			resolve(true);
		});
	},
	// Datenbank: Offline-Kopie im Einstellungenordner anlegen
	//   pfad = String
	//     (Pfad zur Datenkbank)
	dbOfflineKopie (pfad) {
		const path = require("path");
		let reg = new RegExp(`.+${helfer.escapeRegExp(path.sep)}(.+)`),
			dateiname = pfad.match(reg);
		redLit.dbSpeichernSchreiben(path.join(appInfo.userData, dateiname[1]), true);
	},
	// Datenbank: prüft, ob noch ein Speichervorgang aussteht
	//   fun = Function
	//     (Callback-Funktion)
	//   db = false || undefined
	//     (überprüfen, ob die Datenbank gespeichert wurde)
	dbCheck (fun, db = true) {
		// Änderungen im Formular noch nicht gespeichert?
		if (redLit.eingabe.changed) {
			redLit.nav("eingabe");
			dialog.oeffnen({
				typ: "confirm",
				text: "Die Titelaufnahme im Eingabeformular wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Titelaufnahme nicht erst einmal speichern?",
				callback: () => {
					if (dialog.antwort) {
						redLit.eingabeSpeichern();
					} else if (dialog.antwort === false) {
						redLit.eingabe.changed = false;
						redLit.dbCheck(fun, db);
					}
				},
			});
			return;
		}
		// Änderungen in der DB noch nicht gespeichert?
		if (db && redLit.db.changed) {
			let text = "Die Datenbank wurde geändert, aber noch nicht gespeichert.\nMöchten Sie die Datenbank nicht erst einmal speichern?";
			if (!optionen.data["literatur-db"]) {
				text = "Sie haben Titelaufnahmen angelegt, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal in einer Datenbank speichern?";
			}
			dialog.oeffnen({
				typ: "confirm",
				text,
				callback: () => {
					if (dialog.antwort) {
						redLit.dbSpeichern();
					} else if (dialog.antwort === false) {
						redLit.db.changed = false;
						fun();
					}
				},
			});
			return;
		}
		// es steht nichts mehr aus => Funktion direkt ausführen
		fun();
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
		// schon in der richtigen Sektion
		if (!nav && document.getElementById(`red-lit-nav-${form}`).checked) {
			return;
		}
		// ggf. Popup schließen
		redLit.anzeigePopupSchliessen();
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
		let text = helfer.textTrim(document.getElementById("red-lit-suche-text").value, true),
			ab = document.getElementById("red-lit-suche-ab").value,
			st = null,
			da = null;
		redLit.suche.treffer = [];
		redLit.suche.highlight = null;
		if (text) {
			st = new RegExp(helfer.escapeRegExp(text), "gi");
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
					if (w[0].td.ti === v[0].td.ti) {
						duplikate.add(k);
						duplikate.add(l);
						break;
					}
					for (let p of v[0].td.pn) {
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
				if (/^(duplikate|siglen_doppelt)$/.test(redLit.suche.sonder) && i > 0) { // nur aktuellsten Eintrag berücksichtigen
					break;
				} else if (redLit.suche.sonder === "siglen_doppelt" &&
						!siglen_doppelt.has(aufnahme.td.si)) { // doppelte Siglen
					continue;
				} else if (redLit.suche.sonder === "ppn_mit" &&
					!aufnahme.td.pn.length) { // mit PPN
					continue;
				} else if (redLit.suche.sonder === "ppn_ohne" &&
					aufnahme.td.pn.length) { // ohne PPN
					continue;
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
				let stOk = !st ? true : false;
				if (st) {
					for (let j of datensaetze) {
						let ds = aufnahme[j[0]];
						if (j[1]) {
							ds = ds[j[1]];
						}
						const txt = Array.isArray(ds) ? ds.join(", ") : ds;
						if (txt.match(st)) {
							stOk = true;
							break;
						}
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
		treffer.sort(redLit.dbSortAufnahmen);
		// Suchtreffer anzeigen
		redLit.sucheAnzeigen(0);
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
		// 100 Treffer drucken (max.)
		redLit.anzeige.snippetKontext = "suche";
		let titel = document.getElementById("red-lit-suche-titel");
		titel.scrollTop = 0;
		helfer.keineKinder(titel);
		for (let i = start, len = start + 100; i < len; i++) {
			// letzter Treffer erreicht
			if (!treffer[i]) {
				break;
			}
			titel.appendChild(redLit.anzeigeSnippet(treffer[i]));
		}
		// Trefferanzeige auffrischen
		let range = `${start + 1}–${treffer.length > start + 100 ? start + 100 : treffer.length}`;
		if (treffer.length === 1) {
			range = "1";
		}
		document.getElementById("red-lit-suche-trefferzahl").textContent = `${range} / ${treffer.length}`;
		document.querySelectorAll("#red-lit-suche-treffer a").forEach((a, n) => {
			if (n === 0) { // zurückblättern
				a.dataset.start = `${start - 100}`;
				if (start > 0) {
					a.classList.remove("inaktiv");
				} else {
					a.classList.add("inaktiv");
				}
			} else { // vorblättern
				a.dataset.start = `${start + 100}`;
				if (treffer.length > start + 100) {
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
	// Suche: Snippet aktivieren
	//   div = Element
	//     (Snippet mit einer Titelaufnahme)
	sucheSnippetMarkieren (div) {
		div.addEventListener("click", function() {
			// Snippet ist markiert => demarkieren
			if (this.classList.contains("markiert")) {
				this.classList.remove("markiert");
				return;
			}
			// markiertes Snippet demarkieren
			let markiert = document.querySelector("#red-lit-suche-titel .markiert");
			if (markiert) {
				markiert.classList.remove("markiert");
			}
			// angeklicktes Snippet markieren
			this.classList.add("markiert");
		});
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
				// Treffer komplett entfernen, wenn genau diese Titelaufnahme gelöscht wurde
				let idx = redLit.suche.treffer.findIndex(i => i.id === id);
				redLit.suche.treffer.splice(idx, 1);
				if (!redLit.suche.treffer.length) {
					redLit.sucheReset();
				} else if (titel) {
					titel.parentNode.removeChild(titel);
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
	// Eingabeformular: Speicher für Variablen
	eingabe: {
		fundorte: ["Bibliothek", "DTA", "DWDS", "GoogleBooks", "IDS", "online"], // gültige Werte im Feld "Fundorte"
		status: "", // aktueller Status des Formulars
		id: "", // ID des aktuellen Datensatzes (leer, wenn neuer Datensatz)
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
		// ID
		if (input.id === "red-lit-eingabe-id") {
			redLit.eingabeWarnungID(input);
		}
		// Titel
		if (input.id === "red-lit-eingabe-ti") {
			redLit.eingabeAutoTitel(input);
		}
		// URL
		if (input.id === "red-lit-eingabe-ul") {
			redLit.eingabeAutoURL(input);
		}
		// alle Textfelder (Change-Listener)
		input.addEventListener("input", () => {
			if (redLit.eingabe.changed) {
				return;
			}
			redLit.eingabe.changed = true;
			let span = document.createElement("span");
			span.textContent = "*";
			document.getElementById("red-lit-eingabe-meldung").appendChild(span);
		});
		// alle Textfelder (Enter-Listener)
		input.addEventListener("keydown", function(evt) {
			tastatur.detectModifiers(evt);
			if (tastatur.modifiers === "Ctrl" && evt.key === "Enter") {
				redLit.eingabeSpeichern();
			}
		});
	},
	// Eingabeformular: Status anzeigen
	//   status = String
	//     (der Status, in dem sich das Formular befindet)
	eingabeStatus (status) {
		redLit.eingabe.status = status;
		if (status === "add") {
			redLit.eingabe.id = "";
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
			val = val.toLowerCase();
			val = val.replace(/\s/g, "-");
			val = val.replace(/^[0-9]+|[^a-z0-9ßäöü-]/g, "");
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
					sigle.push(name[0]);
				}
				if (jahr && jahr.length) {
					sigle.push(jahr[jahr.length - 1]);
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
			if (!this.value) {
				return;
			}
			let ad = document.getElementById("red-lit-eingabe-ad"),
				fo = document.getElementById("red-lit-eingabe-fo");
			if (!ad.value) {
				ad.value = new Date().toISOString().split("T")[0];
			}
			fo.value = /books\.google\.[a-z]+\//.test(this.value) ? "GoogleBooks" : "online";
		});
	},
	// Eingabeformular: vor Ändern der ID warnen
	//   input = Element
	//     (das ID-Feld)
	eingabeWarnungID (input) {
		input.addEventListener("change", () => {
			if (redLit.eingabe.status === "add") {
				return;
			}
			dialog.oeffnen({
				typ: "confirm",
				text: "Die ID nachträglich zu ändern, kann gravierende Konsequenzen haben.\nMöchten Sie die ID wirklich ändern?",
				callback: () => {
					let id = document.getElementById("red-lit-eingabe-id");
					if (!dialog.antwort) {
						id.value = redLit.eingabe.id;
					}
					id.select();
				},
			});
		});
	},
	// Eingabeformular: BibTeX-Import aus der Zwischenablage
	eingabeBibTeX () {
		const {clipboard} = require("electron"),
			cp = clipboard.readText(),
			bibtexCp = belegImport.BibTeXCheck(cp);
		// kein BibTeX-Datensatz in Zwischenablage
		if (!bibtexCp) {
			dialog.oeffnen({
				typ: "alert",
				text: `In der Zwischenablage befindet sich kein <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Datensatz.`
			});
			return;
		}
		// BibTeX-Datensatz einlesen
		let titel = belegImport.BibTeXLesen(cp, "literatur-db");
		// Einlesen ist fehlgeschlagen
		if (!titel) {
			dialog.oeffnen({
				typ: "alert",
				text: `Das Einlesen des <span class="bibtex"><span>Bib</span>T<span>E</span>X</span>-Datensatzes ist fehlgeschlagen.`
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
	},
	// Eingabeformular: Titelaufnahme speichern
	eingabeSpeichern () {
		// Textfelder trimmen und ggf. typographisch aufhübschen
		let textfelder = document.getElementById("red-lit-eingabe").querySelectorAll(`input[type="text"], textarea`);
		for (let i of textfelder) {
			let val = i.value;
			if (i.id === "red-lit-eingabe-ti") { // Titelaufnahme typographisch aufhübschen
				val = val.replace(/[\r\n]/g, " ");
				val = helfer.textTrim(val, true);
				val = helfer.typographie(val);
				if (val && !/\.$/.test(val)) { // Titelaufnahmen enden immer mit einem Punkt
					val += ".";
				}
			} else {
				val = helfer.textTrim(val, true);
			}
			i.value = val;
			if (i.nodeName === "TEXTAREA") {
				helfer.textareaGrow(i);
			}
		}
		// Validierung des Formulars
		if (!redLit.eingabeSpeichernValid()) {
			return;
		}
		// ggf. neuen Datensatz erstellen
		const id = document.getElementById("red-lit-eingabe-id").value;
		if (redLit.eingabe.status === "add") {
			redLit.db.data[id] = [];
		}
		// Daten zusammentragen
		let ds = {
			be: optionen.data.einstellungen.bearbeiterin,
			da: new Date().toISOString(),
			id: redLit.eingabeSpeichernMakeID(),
			td: {},
		};
		let felder = document.getElementById("red-lit-eingabe").querySelectorAll("input, textarea");
		for (let i of felder) {
			let k = i.id.replace(/.+-/, "");
			if (i.type === "button" ||
					k === "id") {
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
		// ID wurde geändert => Datensatz umbenennen
		let idGeaendert = false;
		if (redLit.eingabe.status !== "add" &&
				redLit.eingabe.id !== id) {
			idGeaendert = true;
			redLit.eingabeSpeichernIDAendern(redLit.eingabe.id, id);
		}
		// Abbruch, wenn identisch mit vorherigem Datensatz
		if (redLit.db.data[id].length && !idGeaendert) {
			let dsAlt = redLit.db.data[id][0],
				diff = false;
			for (let [k, v] of Object.entries(dsAlt.td)) {
				let alt = v,
					neu = ds.td[k];
				if (Array.isArray(alt)) {
					alt = alt.join(",");
					neu = neu.join(",");
				}
				if (alt !== neu) {
					diff = true;
					break;
				}
			}
			if (!diff) {
				dialog.oeffnen({
					typ: "alert",
					text: "Sie haben keine Änderungen vorgenommen.",
					callback: () => {
						document.getElementById("red-lit-eingabe-si").select();
					},
				});
				redLit.eingabeStatus(redLit.eingabe.status); // Änderungsmarkierung zurücksetzen
				return;
			}
		}
		// Datensatz schreiben
		redLit.db.data[id].unshift(ds);
		// Metadaten auffrischen
		redLit.eingabeMetaFuellen({id, slot: 0});
		// Status Eingabeformular auffrischen
		redLit.eingabeStatus("change");
		// ggf. Titelaufnahme in der Suche auffrischen
		redLit.sucheTrefferAuffrischen(id);
		// Status Datenbank auffrischen
		redLit.dbGeaendert(true);
	},
	// Eingabeformular: Formular validieren
	eingabeSpeichernValid () {
		// BenutzerIn registriert?
		if (!optionen.data.einstellungen.bearbeiterin) {
			fehler({
				text: `Sie können Titelaufnahmen erst ${redLit.eingabe.status === "add" ? "erstellen" : "ändern"}, nachdem Sie sich <a href="#" data-funktion="einstellungen-allgemeines">registriert</a> haben.`,
			});
			return false;
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
				return false;
			}
		}
		// ID korrekt formatiert?
		let id = document.getElementById("red-lit-eingabe-id");
		if (/[^a-z0-9ßäöü-]/.test(id.value) ||
				/^[0-9]/.test(id.value)) {
			fehler({
				text: "Die ID hat ein fehlerhaftes Format.\n<b>Erlaubt:</b><br>• Kleinbuchstaben a-z, ß und Umlaute<br>• Ziffern<br>• Bindestriche\n<b>Nicht Erlaubt:</b><br>• Großbuchstaben<br>• Ziffern am Anfang<br>• Sonderzeichen<br>• Leerzeichen",
				fokus: id,
			});
			return false;
		}
		// ID schon vergeben?
		if ((redLit.eingabe.status === "add" ||
				redLit.eingabe.status !== "add" && redLit.eingabe.id !== id.value) &&
				redLit.db.data[id.value]) {
			fehler({
				text: "Die ID ist schon vergeben.",
				fokus: id,
			});
			return false;
		}
		// URL korrekt formatiert?
		let url = document.getElementById("red-lit-eingabe-ul");
		if (url.value && !/^https?:\/\//.test(url.value)) {
			fehler({
				text: "Die URL muss mit einem Protokoll beginnen (http[s]://).",
				fokus: url,
			});
			return false;
		}
		// wenn URL => Fundort "GoogleBooks" || "online"
		let fo = document.getElementById("red-lit-eingabe-fo");
		if (url.value && !/^(GoogleBooks|online)$/.test(fo.value)) {
			fehler({
				text: "Geben Sie eine URL an, muss der Fundort „online“ oder „GoogleBooks“ sein.",
				fokus: fo,
			});
			return false;
		}
		// wenn Aufrufdatum => URL eingeben
		let ad = document.getElementById("red-lit-eingabe-ad");
		if (ad.value && !url.value) {
			fehler({
				text: "Geben Sie ein Aufrufdatum an, müssen Sie auch eine URL angeben.",
				fokus: url,
			});
			return false;
		}
		// Aufrufdatum in der Zukunft?
		if (ad.value && new Date(ad.value) > new Date()) {
			fehler({
				text: "Das Aufrufdatum liegt in der Zukunft.",
				fokus: ad,
			});
			return false;
		}
		// Fundort mit gültigem Wert?
		if (fo.value && !redLit.eingabe.fundorte.includes(fo.value)) {
			let fundorte = redLit.eingabe.fundorte.join(", ").match(/(.+), (.+)/);
			fehler({
				text: `Der Fundort ist ungültig. Erlaubt sind nur die Werte:\n${fundorte[1]} oder ${fundorte[2]}`,
				fokus: fo,
			});
			return false;
		}
		// wenn Fundort "GoogleBooks" || "online" => URL eingeben
		if (/^(GoogleBooks|online)$/.test(fo.value) && !url.value) {
			fehler({
				text: "Ist der Fundort „online“ oder „GoogleBooks“, müssen Sie eine URL angeben.",
				fokus: url,
			});
			return false;
		}
		// PPN(s) okay?
		let ppn = document.getElementById("red-lit-eingabe-pn");
		if (ppn.value) {
			let ppns = ppn.value.split(/[,\s]/),
				korrekt = [],
				fehlerhaft = [];
			for (let i of ppns) {
				if (i && !/^[0-9]{8,10}X?$/.test(i)) {
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
				return false;
			} else {
				ppn.value = korrekt.join(", ");
			}
		}
		// alles okay
		return true;
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
	},
	// Eingabeformular: ID einer Titelaufnahme ändern
	// (Titelaufnahme klonen)
	//   alt = String
	//     (die alte ID)
	//   neu = String
	//     (die neue ID)
	eingabeSpeichernIDAendern (alt, neu) {
		// neuen Datensatz anlegen
		redLit.db.data[neu] = [];
		// alten Datensatz klonen
		let quelle = redLit.db.data[alt],
			ziel = redLit.db.data[neu];
		for (let i = 0, len = quelle.length; i < len; i++) {
			let ds = {};
			klon(quelle[i], ds);
			ziel.push(ds);
		}
		// alten Datensatz entfernen
		delete redLit.db.data[alt];
		// Klon-Funktion
		function klon (quelle, ziel) {
			for (let [k, v] of Object.entries(quelle)) {
				if (helfer.checkType("Object", v)) { // Objects
					ziel[k] = {};
					klon(v, ziel[k]);
				} else if (Array.isArray(v)) { // Arrays
					ziel[k] = [...v];
				} else { // Primitiven
					ziel[k] = v;
				}
			}
		}
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
	// Eingabeformular: neue Titelaufnahme hinzufügen
	eingabeHinzufuegen () {
		// ggf. zum Formular wechseln
		redLit.nav("eingabe");
		// Formular leeren
		redLit.eingabeLeeren();
		// Formularstatus ändern
		redLit.eingabeStatus("add");
		// Formular fokussieren
		document.getElementById("red-lit-eingabe-si").focus();
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
			if (i.type === "button") {
				continue;
			}
			let key = i.id.replace(/.+-/, "");
			if (key === "id") {
				i.value = id;
			} else {
				i.value = Array.isArray(ds[key]) ? ds[key].join(", ") : ds[key];
				if (i.nodeName === "TEXTAREA") {
					helfer.textareaGrow(i);
				}
			}
		}
		// Metadaten füllen
		redLit.eingabeMetaFuellen({id, slot});
		// Formularstatus auffrischen
		let status = "change";
		if (slot > 0) {
			status = "old";
		}
		redLit.eingabeStatus(status);
		// Sigle-Feld fokussieren
		document.getElementById("red-lit-eingabe-si").select();
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
			noFrag.innerHTML = redLit.anzeigeSnippetHighlight(ds.td.no);
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
			redLit.sucheSnippetMarkieren(div);
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
				!redLit.suche.highlight) {
			return text;
		}
		// Suchtext hervorheben
		return text.replace(redLit.suche.highlight, m => `<mark class="suche">${m}</mark>`);
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
	titelLoeschen ({id, slot}) {
		redLit.db.data[id].splice(slot, 1);
		// ggf. Suche auffrischen
		redLit.sucheTrefferAuffrischen(id, slot);
		// ggf. Eingabeformular auffrischen
		if (redLit.eingabe.id === id) {
			if (!redLit.db.data[id].length) { // Titelaufnahme existiert nicht mehr
				redLit.eingabeMetaFuellen({id: "", slot: -1});
				redLit.eingabeStatus("add");
			} else { // Titelaufnahme existiert noch
				redLit.eingabeMetaFuellen({id, slot: 0});
			}
			document.getElementById("red-lit-eingabe-si").dispatchEvent(new KeyboardEvent("input"));
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
			xmlDoc = xml.indent(xmlDoc);
			text = new XMLSerializer().serializeToString(xmlDoc);
		}
		clipboard.writeText(text);
		helfer.animation("zwischenablage");
	},
};
