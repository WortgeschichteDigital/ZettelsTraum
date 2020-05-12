"use strict";

let redLit = {
	// aktuelle Literaturdatenbank
	data: {},
	// Literaturdatenbank öffnen
	oeffnen () {
		// Fenster öffnen oder in den Vordergrund holen
		let fenster = document.getElementById("red-lit");
		if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
			return;
		}
		// Datensatz hinzufügen
		redLit.eingabe.changed = false;
		redLit.eingabeHinzufuegen();
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
		// alle Textfelder
		input.addEventListener("input", () => {
			if (redLit.eingabe.changed) {
				return;
			}
			redLit.eingabe.changed = true;
			let span = document.createElement("span");
			span.textContent = "*";
			document.getElementById("red-lit-eingabe-meldung").appendChild(span);
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
			redLit.data[id] = [];
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
		if (redLit.data[id].length && !idGeaendert) {
			let dsAlt = redLit.data[id][0],
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
		redLit.data[id].unshift(ds);
		// Status auffrischen
		redLit.eingabeStatus("change");
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
				redLit.data[id.value]) {
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
		redLit.data[neu] = [];
		// alten Datensatz klonen
		let quelle = redLit.data[alt],
			ziel = redLit.data[neu];
		for (let i = 0, len = quelle.length; i < len; i++) {
			let ds = {};
			klon(quelle[i], ds);
			ziel.push(ds);
		}
		// alten Datensatz entfernen
		delete redLit.data[alt];
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
			for (let v of Object.values(redLit.data)) {
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
