"use strict";

let redLit = {
	// Literaturdatenbank öffnen
	oeffnen () {
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-lit");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Datenbank laden
		redLit.dbLaden();
		// Datensatz hinzufügen
		redLit.eingabe.changed = false;
		redLit.eingabeHinzufuegen();
	},
	// Datenbank: Speicher für Variablen
	db: {
		data: {}, // Daten der (geladenen) Literaturdatenbank
		gefunden: false, // Datenbankdatei gefunden (könnte im Netzwerk temporär verschwunden sein)
		changed: false, // Inhalt der Datenbank wurde geändert und noch nicht gespeichert
	},
	// Datenbank: Datei laden
	async dbLaden () {
		// Anzeige auffrischen
		redLit.dbAnzeige();
		// ggf. Datenbank einlesen
		if (!optionen.data["literatur-db"]) {
			return;
		}
		const existiert = await helfer.exists(optionen.data["literatur-db"]);
		// Datenkbank wurde wiedergefunden
		if (existiert) {
			redLit.db.gefunden = true;
			let result = await redLit.dbOeffnenEinlesen(optionen.data["literatur-db"]);
			if (result !== true) {
				dialog.oeffnen({
					typ: "alert",
					text: result,
				});
			}
			return;
		}
		// Datenbank wurde nicht wiedergefunden
		// (kann temporär verschwunden sein, weil sie im Netzwerk liegt)
		redLit.db.gefunden = false;
		// TODO versuchen die Offline-Version zu laden
		// TODO wenn das scheitert => anzeigen, dass keine DB geladen wurde
		// Laden der Offline-Version war erfolgreich
		let span = document.createElement("span");
		span.textContent = "[offline]";
		document.getElementById("red-lit-pfad-db").appendChild(span);
	},
	// Datenbank: Anzeige auffrischen
	dbAnzeige () {
		let pfad = document.getElementById("red-lit-pfad-db");
		// keine DB mit dem Programm verknüpft
		if (!optionen.data["literatur-db"]) {
			pfad.classList.add("keine-db");
			pfad.textContent = "keine Datenbank geladen";
			return;
		}
		// DB mit dem Programm verknüpft
		pfad.classList.remove("keine-db");
		pfad.textContent = `\u200E${optionen.data["literatur-db"]}\u200E`;
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
			let schluessel = Object.keys(data_tmp),
				aufnahme = data_tmp[schluessel[0]];
			if (!aufnahme[0].td || !aufnahme[0].td.ti) {
				resolve(`Die Datei wurde nicht eingelesen.\nEs handelt sich nicht um eine <i>${appInfo.name} Literaturdatenbank</i>.`);
				return;
			}
			// Datei kann eingelesen werden
			redLit.db.data = data_tmp;
			// Datenbank für Offline-Nutzung verfügbar halten
			redLit.dbOfflineKopie(pfad);
			// Promise auflösen
			resolve(true);
		});
	},
	// Datenbank: Listener für die Icon-Links
	//   a = Element
	//     (ein Icon-Link zum Speichern, Öffnen usw.)
	dbListener (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/-speichern$/.test(this.id)) {
				redLit.dbSpeichern();
			} else if (/-speichern-unter$/.test(this.id)) {
				redLit.dbSpeichern(true);
			}
		});
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
		// Datei soll/muss angelegt werden
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
	dbSpeichernSchreiben (pfad) {
		return new Promise(async resolve => {
			let data = redLit.db.data,
				result = await io.schreiben(pfad, JSON.stringify(data));
			// beim Schreiben ist ein Fehler aufgetreten
			if (result !== true) {
				resolve(`Beim Speichern der Literaturdatenbank ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`);
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
		redLit.dbSpeichernSchreiben(path.join(appInfo.userData, dateiname[1]));
	},
	// Navigation: Listener für das Umschalten
	//   input = Element
	//     (der Radiobutton zum Umschalten der Formulare)
	navListener (input) {
		input.addEventListener("change", function() {
			const form = this.id.replace(/.+-/, "");
			redLit.nav(form);
		});
	},
	// Navigation: Umschalten zwischen Eingabe- und Suchformular
	//   form = String
	//     ("eingabe" od. "suche")
	nav (form) {
		let formulare = ["red-lit-eingabe", "red-lit-suche"];
		for (let i of formulare) {
			let block = document.getElementById(i);
			if (i.includes(`-${form}`)) {
				block.classList.remove("aus");
			} else {
				block.classList.add("aus");
			}
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
				input.addEventListener("click", () => redLit.eingabeHinzufuegen());
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
			if (!fo.value) {
				fo.value = "online";
			}
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
		// Status Eingabeformular auffrischen
		redLit.eingabeStatus("change");
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
		// wenn URL => Fundort "online"
		let fo = document.getElementById("red-lit-eingabe-fo");
		if (url.value && fo.value !== "online") {
			fehler({
				text: "Geben Sie eine URL an, muss der Fundort „online“ sein.",
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
		// wenn Fundort "online" => URL eingeben
		if (fo.value === "online" && !url.value) {
			fehler({
				text: "Ist der Fundort „online“, müssen Sie eine URL angeben.",
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
				if (i && !/^[0-9]{9,10}X?$/.test(i)) {
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
		if (redLit.eingabe.changed) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Sie haben offenbar Änderungen vorgenommen.\nSoll die Titelaufnahme nicht erst einmal gespeichert werden?",
				callback: () => {
					if (dialog.antwort) {
						redLit.eingabeSpeichern();
					} else if (dialog.antwort === false) {
						hinzufuegen();
					} else {
						document.getElementById("red-lit-eingabe-si").select();
					}
				},
			});
			return;
		}
		hinzufuegen();
		// Hinzufügen ausführen
		function hinzufuegen () {
			// Formular anzeigen
			document.getElementById("red-lit-nav-eingabe").checked = true;
			redLit.nav("eingabe");
			// Formularstatus ändern
			redLit.eingabeStatus("add");
			// Formular leeren
			redLit.eingabeLeeren();
			// Formular fokussieren
			document.getElementById("red-lit-eingabe-si").focus();
		}
	},
};
