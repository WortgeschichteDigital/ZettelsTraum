"use strict";

let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// Liste häufig verwendeter Korpora für das Dropdown-Menü
	korpora: [
		"DTA",
		"DWDS-Kernkorpus",
		"DWDS-Kernkorpus 21",
		"DWDS-Zeitungskorpus",
		"Berliner Zeitung",
		"Berliner Wendecorpus",
		"Blogs",
		"DDR",
		"Dortmunder Chat-Korpus",
		"Filmuntertitel",
		"Gesprochene Sprache",
		"neues deutschland",
		"Polytechnisches Journal",
		"Referenz- und Zeitungskorpora",
		"Tagesspiegel",
		"Text+Berg",
		"Webkorpus 2016c",
		"Die ZEIT",
	],
	// Überprüfen, ob vor dem Erstellen eines neuen Belegs noch Änderungen
	// gespeichert werden müssen.
	erstellenPre () {
		// Änderungen in Bedeutungen/im Beleg noch nicht gespeichert
		if (bedeutungen.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					bedeutungen.speichern();
				} else if (dialog.antwort === false) {
					beleg.erstellen();
				}
			});
			dialog.text("Das Bedeutungsgerüst wurde verändert, aber noch nicht gespeichert.\nMöchten Sie die Änderungen nicht erst einmal speichern?");
			return;
		} else if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					beleg.erstellen();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert.\nMöchten Sie den Beleg nicht erst einmal speichern?");
			return;
		}
		// Beleg schon gespeichert
		beleg.erstellen();
	},
	// neue Karteikarte erstellen
	erstellen () {
		// nächste ID ermitteln
		let id_karte = 0,
			ids = Object.keys(data.ka);
		for (let i = 0, len = ids.length; i < len; i++) {
			let id = parseInt(ids[i], 10);
			if (id > id_karte) {
				id_karte = id;
			}
		}
		id_karte++;
		beleg.id_karte = id_karte;
		// neues Karten-Objekt anlegen
		beleg.data = {
			an: [], // Anhänge
			au: "", // Autor
			bc: false, // Buchung
			bd: "", // Bedeutung
			be: 0, // Bewertung
			bs: "", // Beleg
			bu: false, // Bücherdienstauftrag
			da: "", // Belegdatum
			dc: new Date().toISOString(), // Datum Karteikarten-Erstellung
			dm: "", // Datum Karteikarten-Änderung
			ko: false, // Kontext
			kr: "", // Korpus
			no: "", // Notizen
			qu: "", // Quelle
			ts: "", // Textsorte
			un: optionen.data.einstellungen.unvollstaendig, // Bearbeitung unvollständig
		};
		// ggf. die Leseansicht verlassen
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseToggle(false);
		}
		// Karte anzeigen
		beleg.formular(true);
	},
	// bestehende Karteikarte öffnen
	//   id = Number
	//     (ID der Karte, die geöffnet werden soll)
	oeffnen (id) {
		// ID zwischenspeichern
		beleg.id_karte = id;
		// Daten des Belegs kopieren
		beleg.data = {};
		for (let i in data.ka[id]) {
			if (!data.ka[id].hasOwnProperty(i)) {
				continue;
			}
			if (helfer.checkType("Array", data.ka[id][i])) {
				beleg.data[i] = [...data.ka[id][i]];
			} else {
				beleg.data[i] = data.ka[id][i];
			}
		}
		// in Lese- oder in Formularansicht öffnen?
		const leseansicht = document.getElementById("beleg-link-leseansicht");
		if (optionen.data.einstellungen.leseansicht) {
			if (!leseansicht.classList.contains("aktiv")) {
				beleg.leseToggle(false);
			} else {
				beleg.leseFill();
			}
		} else if (leseansicht.classList.contains("aktiv")) {
			beleg.leseToggle(false);
		}
		// Formular füllen und anzeigen
		beleg.formular(false);
	},
	// Formular füllen und anzeigen
	formular (neu) {
		// Beleg-Titel eintragen
		document.getElementById("beleg-titel").textContent = `Beleg #${beleg.id_karte}`;
		// Feld-Werte eintragen
		let felder = document.querySelectorAll("#beleg input, #beleg textarea");
		for (let i = 0, len = felder.length; i < len; i++) {
			let feld = felder[i].id.replace(/^beleg-/, "");
			if (felder[i].type === "button") {
				continue;
			} else if (feld === "dta") {
				felder[i].value = "";
				continue;
			} else if (feld === "dta-bis") {
				felder[i].value = "0";
				continue;
			} else if (felder[i].type === "checkbox") {
				felder[i].checked = beleg.data[feld];
			} else { // Text-Input und Textarea
				felder[i].value = beleg.data[feld];
			}
		}
		// Bewertung eintragen
		beleg.bewertungAnzeigen();
		// Anhänge auflisten
		anhaenge.auflisten(document.getElementById("beleg-an"), true, "beleg|data|an");
		// Änderungsmarkierung ausblenden
		beleg.belegGeaendert(false);
		// Formular einblenden
		helfer.sektionWechseln("beleg");
		// Textarea zurücksetzen
		document.querySelectorAll("#beleg textarea").forEach((textarea) => helfer.textareaGrow(textarea));
		// Fokus setzen
		const leseansicht_aktiv = document.getElementById("beleg-link-leseansicht").classList.contains("aktiv");
		if (neu && !leseansicht_aktiv) {
			document.getElementById("beleg-dta").focus();
		} else if (!leseansicht_aktiv) {
			document.getElementById("beleg-da").focus();
		}
	},
	// Änderungen in einem Formular-Feld automatisch übernehmen
	//   feld = Element
	//     (das Formularfeld, das geändert wurde)
	formularGeaendert (feld) {
		let event_typ = "input";
		if (this.type === "checkbox") {
			event_typ = "change";
		}
		feld.addEventListener(event_typ, function() {
			let feld = this.id.replace(/^beleg-/, "");
			if (/^dta(-bis)*$/.test(feld)) { // #beleg-dta + #beleg-dta-bis gehören nicht zur Kartei, dienen nur zum DTA-Import
				if (feld === "dta" &&
						/^https*:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) { // Bis-Seite ermitteln und eintragen
					const fak = beleg.DTAImportGetFak(this.value, "");
					if (fak) {
						this.nextSibling.value = parseInt(fak, 10) + 1;
					}
				}
				return;
			}
			if (this.type === "checkbox") {
				beleg.data[feld] = this.checked;
			} else {
				beleg.data[feld] = helfer.textTrim(this.value, true);
			}
			beleg.belegGeaendert(true);
		});
	},
	// Aktionen beim Klick auf einen Formular-Button
	//   button = Element
	//     (der Button, auf den geklickt wurde)
	aktionButton (button) {
		button.addEventListener("click", function() {
			let aktion = this.id.replace(/^beleg-/, "");
			if (aktion === "speichern") {
				beleg.aktionSpeichern();
			} else if (aktion === "abbrechen") {
				beleg.aktionAbbrechen();
			} else if (aktion === "loeschen") {
				beleg.aktionLoeschen();
			} else if (aktion === "dta-button") {
				beleg.DTAImport();
			}
		});
	},
	// Vormerken, dass die Liste neu aufgebaut werden muss
	listeGeaendert: false,
	// Beleg speichern
	aktionSpeichern () {
		// Test: Datum angegeben?
		let da = document.getElementById("beleg-da"),
			dav = helfer.textTrim(da.value, true);
		if (!dav) {
			dialog.oeffnen("alert", () => da.select());
			dialog.text("Sie müssen ein Datum angeben.");
			return;
		}
		// Test: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
		if (!/[0-9]{4}|[0-9]{2}\.\sJh\./.test(dav)) {
			dialog.oeffnen("alert", () => da.select());
			dialog.text("Das Datum muss eine vierstellige Jahreszahl (z. B. „1813“) oder eine Jahrhundertangabe (z. B. „17. Jh.“) enthalten.\nZusätzlich können auch andere Angaben gemacht werden (z. B. „ca. 1815“, „1610, vielleicht 1611“).");
			return;
		}
		// Test: Beleg angegeben?
		let bs = document.getElementById("beleg-bs");
		if (!helfer.textTrim(bs.value, true)) {
			dialog.oeffnen("alert", () => bs.select());
			dialog.text("Sie müssen einen Beleg eingeben.");
			return;
		}
		// Test: Quelle angegeben?
		let qu = document.getElementById("beleg-qu");
		if (!helfer.textTrim(qu.value, true)) {
			dialog.oeffnen("alert", () => qu.select());
			dialog.text("Sie müssen eine Quelle angeben.");
			return;
		}
		// Beleg wurde nicht geändert
		if (!beleg.geaendert) {
			direktSchliessen();
			return;
		}
		// ggf. Format von Bedeutung und Textsorte anpassen
		let ds = ["bd", "ts"];
		for (let i = 0, len = ds.length; i < len; i++) {
			let ds_akt = ds[i];
			beleg.data[ds_akt] = beleg.data[ds_akt].replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
		}
		// ggf. Objekt anlegen
		if (!data.ka[beleg.id_karte]) {
			data.ka[beleg.id_karte] = {};
			liste.statusNeu = beleg.id_karte.toString();
		}
		// zwischenspeichern, dass dieser Beleg geändert wurde
		// (für die Hervorhebung in der Liste)
		liste.statusGeaendert = beleg.id_karte.toString();
		// Objekt mit neuen Werten füllen
		for (let i in beleg.data) {
			if (!beleg.data.hasOwnProperty(i)) {
				continue;
			}
			if (helfer.checkType("Array", beleg.data[i])) {
				data.ka[beleg.id_karte][i] = [...beleg.data[i]];
			} else {
				data.ka[beleg.id_karte][i] = beleg.data[i];
			}
		}
		// Änderungsdatum speichern
		data.ka[beleg.id_karte].dm = new Date().toISOString();
		// Änderungsmarkierung weg
		beleg.belegGeaendert(false);
		beleg.listeGeaendert = true;
		kartei.karteiGeaendert(true);
		// Bedeutungsgerüst-Fenster mit neuen Daten versorgen
		bedeutungenWin.daten();
		// Schließen?
		direktSchliessen();
		// Karteikarte ggf. schließen
		function direktSchliessen () {
			if (optionen.data.einstellungen["karteikarte-schliessen"]) {
				beleg.aktionAbbrechen();
			}
		}
	},
	// Bearbeiten des Belegs beenden, Beleg also schließen
	// (Der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
	aktionAbbrechen () {
		// Änderungen noch speichern?
		if (beleg.geaendert) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					beleg.aktionSpeichern();
				} else if (dialog.antwort === false) {
					abbrechen();
				}
			});
			dialog.text("Der aktuelle Beleg wurde geändert, aber noch nicht gespeichert.\nMöchten Sie den Beleg nicht erst einmal speichern?");
			return;
		}
		// Änderungen sind schon gespeichert
		abbrechen();
		// Funktion zum Abbrechen
		function abbrechen () {
			beleg.belegGeaendert(false);
			if (beleg.listeGeaendert) {
				liste.status(true);
			}
			liste.wechseln();
			beleg.listeGeaendert = false;
		}
	},
	// Beleg löschen
	aktionLoeschen () {
		// Beleg wurde noch gar nicht angelegt
		if (!data.ka[beleg.id_karte]) {
			beleg.belegGeaendert(false);
			beleg.aktionAbbrechen();
			return;
		}
		// Beleg wirklich löschen?
		beleg.aktionLoeschenFrage(beleg.id_karte);
	},
	// Fragen, ob der Beleg wirklich gelöscht werden soll
	// (wird auch in anderen Kontexten gebraucht, darum auslagern)
	//   id = Number
	//     (ID des Belegs)
	aktionLoeschenFrage (id) {
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				delete data.ka[id];
				beleg.belegGeaendert(false);
				kartei.karteiGeaendert(true);
				liste.statusNeu = "";
				liste.statusGeaendert = "";
				liste.status(true);
				liste.wechseln();
				beleg.listeGeaendert = false;
				bedeutungenWin.daten();
			}
		});
		dialog.text(`Soll <i>${liste.detailAnzeigenH3(id)}</i> wirklich gelöscht werden?`);
	},
	// Daten, die importiert wurden
	DTAImportData: {},
	// Daten aus dem DTA importieren
	DTAImport () {
		const dta = document.getElementById("beleg-dta"),
			url = helfer.textTrim(dta.value, true);
		// URL fehlt
		if (!url) {
			dialog.oeffnen("alert", () => dta.select());
			dialog.text("Sie haben keine URL eingegeben.");
			return;
		}
		// Ist das überhaupt eine URL?
		if (!/^https*:\/\//.test(url)) {
			dialog.oeffnen("alert", () => dta.select());
			dialog.text("Das scheint keine URL zu sein.");
			return;
		}
		// URL nicht vom DTA
		if (!/^https*:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
			dialog.oeffnen("alert", () => dta.select());
			dialog.text("Die URL stammt nicht vom DTA.");
			return;
		}
		// Titel-ID ermitteln
		let titel_id = beleg.DTAImportGetTitelId(url);
		if (!titel_id) {
			dialog.oeffnen("alert", () => dta.focus());
			dialog.text("Beim ermitteln der Titel-ID ist etwas schiefgelaufen.\nIst die URL korrekt?");
			return;
		}
		// Faksimileseite ermitteln
		let fak = beleg.DTAImportGetFak(url, titel_id);
		if (!fak) {
			dialog.oeffnen("alert", () => dta.focus());
			dialog.text("Beim ermitteln der Seite ist etwas schiefgelaufen.\nIst die URL korrekt?");
			return;
		}
		// Ist die Kartei schon ausgefüllt?
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.kr || beleg.data.ts || beleg.data.qu) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					startImport();
				} else {
					dta.focus();
				}
			});
			dialog.text("Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Korpus, Textsorte</i> und <i>Quelle</i> werden beim Importieren der Textdaten aus dem DTA überschrieben.\nMöchten Sie den DTA-Import wirklich starten?");
			return;
		}
		// Dann mal los...
		startImport();
		// Startfunktion
		function startImport () {
			beleg.DTAImportData = {
				autor: [],
				hrsg: [],
				titel: "",
				untertitel: [],
				band: "",
				auflage: "",
				ort: "",
				verlag: "",
				datum: {
					druck: "",
					entstehung: "",
				},
				seite: "",
				seite_zuletzt: "",
				serie: "",
				serie_seite: "",
				beleg: "",
				textsorte: [],
				textsorte_sub: [],
				url: `http://www.deutschestextarchiv.de/${titel_id}/${fak}`,
			};
			const url_xml = `http://www.deutschestextarchiv.de/book/download_xml/${titel_id}`;
			dta.blur();
			beleg.DTAImportRequest(url_xml, fak);
		}
	},
	// Titel-ID ermitteln
	//   url = String
	//     (DTA-URL)
	DTAImportGetTitelId (url) {
		let m, titel_id = "";
		if (/\/view\//.test(url)) {
			m = url.match(/\/view\/([^/?]+)/);
		} else {
			m = url.match(/deutschestextarchiv\.de\/([^/?]+)/);
		}
		if (m) {
			titel_id = m[1];
		}
		return titel_id;
	},
	// Faksimile-Nummer ermitteln
	//   url = String
	//     (DTA-URL)
	//   titel_id = String
	//     (titel_id, falls sie schon ermittelt wurde, sonst leerer String)
	DTAImportGetFak (url, titel_id) {
		let fak = "";
		if (!titel_id) {
			titel_id = beleg.DTAImportGetTitelId(url);
			if (!titel_id) {
				return fak;
			}
		}
		if (/p=[0-9]+/.test(url)) {
			fak = url.match(/p=([0-9]+)/)[1];
		} else if (new RegExp(`${titel_id}\\/[0-9]+`).test(url)) {
			const reg = new RegExp(`${titel_id}\\/([0-9]+)`);
			fak = url.match(reg)[1];
		}
		return fak;
	},
	// XMLHttpRequest stellen
	//   url = String
	//     (URL des Dokument, das aus dem DTA geladen werden soll)
	//   fak = String
	//     (Faksimile-Seite des Titels)
	DTAImportRequest (url, fak) {
		let ajax = new XMLHttpRequest();
		ajax.open("GET", url, true);
		ajax.timeout = parseInt(optionen.data.einstellungen.timeout, 10) * 1000;
		ajax.addEventListener("load", function () {
			if (ajax.status >= 200 && ajax.status < 300) {
				if (!ajax.responseXML) {
					if (ajax.responseText &&
							/<title>DTA Qualitätssicherung<\/title>/.test(ajax.responseText)) {
						beleg.DTAImportFehler("DTAQ: Titel noch nicht freigeschaltet");
					} else {
						beleg.DTAImportFehler("XMLHttpRequest: keine XML-Daten");
					}
					return;
				}
				beleg.DTAImportMeta(ajax.responseXML);
				beleg.DTAImportText(ajax.responseXML, fak);
				beleg.DTAImportFill();
			} else {
				beleg.DTAImportFehler("XMLHttpRequest: falscher Status-Code");
			}
		});
		ajax.addEventListener("timeout", function () {
			beleg.DTAImportFehler("XMLHttpRequest: Timeout");
		});
		ajax.addEventListener("error", function () {
			beleg.DTAImportFehler("XMLHttpRequest: unbestimmter Fehler");
		});
		ajax.send(null);
	},
	// Fehler beim Laden der Daten des DTA
	//   fehlertyp = String
	//     (die Beschreibung des Fehlers)
	DTAImportFehler (fehlertyp) {
		dialog.oeffnen("alert", function() {
			let dta = document.getElementById("beleg-dta");
			dta.select();
		});
		dialog.text(`Beim Download der Textdaten aus dem DTA ist ein <strong>Fehler</strong> aufgetreten.\n<h3>Fehlertyp</h3>\n${fehlertyp}`);
	},
	// Meta-Daten des Titels importieren
	//   xml = Document
	//     (das komplette Buch, aus dem eine Seite importiert werden soll;
	//     enthält auch den TEI-Header)
	DTAImportMeta (xml) {
		// normale Werte
		const bibl = xml.querySelector("teiHeader fileDesc sourceDesc biblFull"),
			sorte = xml.querySelector("teiHeader profileDesc textClass");
		const werte = {
			titel: bibl.querySelector(`titleStmt title[type="main"]`),
			untertitel: bibl.querySelectorAll(`titleStmt title[type="sub"]`),
			band: bibl.querySelector(`titleStmt title[type="volume"]`),
			auflage: bibl.querySelector("editionStmt edition"),
			ort: bibl.querySelector("publicationStmt pubPlace"),
			verlag: bibl.querySelector("publicationStmt publisher name"),
			textsorte: sorte.querySelectorAll(`classCode[scheme$="dwds1main"]`), // querySelectorAll eigentlich nicht nötig; das ist ein Relikt aus der Zeit als auch "dwds2main" importiert wurde; besser so lassen, eine Änderung produziert nur Fehler
			textsorte_sub: sorte.querySelectorAll(`classCode[scheme$="dwds1sub"]`),
		};
		for (let wert in werte) {
			if (!werte.hasOwnProperty(wert)) {
				continue;
			}
			if (!werte[wert]) {
				continue;
			}
			const text = getValue(werte[wert]);
			if (!text) { // Tags können leer sein
				continue;
			}
			beleg.DTAImportData[wert] = text;
		}
		function getValue (v) {
			if (helfer.checkType("Element", v)) {
				if (!v.firstChild) {
					return "";
				}
				return trimmer(v.firstChild.nodeValue);
			}
			let out = [];
			v.forEach(function(i) {
				if (!i.firstChild) {
					return;
				}
				out.push(trimmer(i.firstChild.nodeValue));
			});
			return out;
		}
		// Datum
		let datum = bibl.querySelectorAll("publicationStmt date");
		if (datum) {
			for (let i = 0, len = datum.length; i < len; i++) {
				const typ = datum[i].getAttribute("type");
				if (typ === "creation") {
					beleg.DTAImportData.datum.entstehung = trimmer(datum[i].firstChild.nodeValue);
				} else {
					beleg.DTAImportData.datum.druck = trimmer(datum[i].firstChild.nodeValue);
				}
			}
		}
		// Serie
		let serie_titel = bibl.querySelectorAll("seriesStmt title"),
			serie_bd = bibl.querySelector("seriesStmt biblScope");
		if (serie_titel) {
			serie_titel.forEach(function(i, n) {
				if (n > 0) {
					if (!/\.$/.test(beleg.DTAImportData.serie)) {
						beleg.DTAImportData.serie += ".";
					}
					beleg.DTAImportData.serie += " ";
				}
				beleg.DTAImportData.serie += trimmer(i.firstChild.nodeValue);
			});
			if (serie_bd) {
				let unit = serie_bd.getAttribute("unit");
				if (unit === "volume") {
					beleg.DTAImportData.serie += `, ${trimmer(serie_bd.firstChild.nodeValue)}`;
				} else if (unit === "pages") {
					beleg.DTAImportData.serie_seite = trimmer(serie_bd.firstChild.nodeValue);
				}
			}
			if (beleg.DTAImportData.textsorte[0] === "Zeitung") {
				beleg.DTAImportData.titel = `${beleg.DTAImportData.serie}, ${beleg.DTAImportData.titel}`;
				beleg.DTAImportData.serie = "";
			}
		}
		// Personen
		let personen = {
			autor: bibl.querySelectorAll("titleStmt author"),
			hrsg: bibl.querySelectorAll("titleStmt editor"),
		};
		for (let wert in personen) {
			if (!personen.hasOwnProperty(wert)) {
				continue;
			}
			if (!personen[wert]) {
				continue;
			}
			for (let i = 0, len = personen[wert].length; i < len; i++) {
				let person_name = personen[wert][i].querySelector("persName surname, persName addName"),
					person_vorname = personen[wert][i].querySelector("persName forename"),
					name = "";
				if (person_name) {
					if (wert === "autor") {
						name = trimmer(person_name.firstChild.nodeValue);
						if (person_vorname) {
							name += `, ${trimmer(person_vorname.firstChild.nodeValue)}`;
						}
					} else {
						if (person_vorname) {
							name = `${trimmer(person_vorname.firstChild.nodeValue)} ${trimmer(person_name.firstChild.nodeValue)}`;
						} else {
							name = trimmer(person_name.firstChild.nodeValue);
						}
					}
				}
				if (name) {
					beleg.DTAImportData[wert].push(name);
				}
			}
		}
		// spezielle Trim-Funktion
		function trimmer (v) {
			v = helfer.textTrim(v, true);
			v = v.replace(/\n/g, " "); // kommt mitunter mitten im Untertitel vor
			return v;
		}
	},
	// Seite und Text des Titels importieren
	//   xml = Document
	//     (das komplette Buch, aus dem eine Seite importiert werden soll)
	//   fak = String
	//     (Faksimile-Seite des Titels)
	DTAImportText (xml, fak) {
		// Grenze des Textimports ermitteln
		// (importiert wird bis zum Seitenumbruch "fak_bis", aber nie darüber hinaus)
		let int_fak = parseInt(fak, 10),
			int_fak_bis = parseInt(document.getElementById("beleg-dta-bis").value, 10),
			fak_bis = "";
		if (int_fak_bis && int_fak_bis > int_fak) {
			fak_bis = int_fak_bis.toString();
		} else {
			fak_bis = (int_fak + 1).toString();
		}
		// Start- und Endelement ermitteln
		const ele_start = xml.querySelector(`pb[facs="#f${fak.padStart(4, "0")}"]`),
			ele_ende = xml.querySelector(`pb[facs="#f${fak_bis.padStart(4, "0")}"]`);
		// Seite auslesen
		beleg.DTAImportData.seite = beleg.DTAImportData.seite_zuletzt = ele_start.getAttribute("n");
		// Elemente ermitteln, die analysiert werden müssen
		let parent;
		if (ele_ende) {
			parent = ele_ende.parentNode;
			while (!parent.contains(ele_start)) {
				parent = parent.parentNode;
			}
		} else {
			// Wenn "ele_ende" nicht existiert, dürfte die Startseite die letzte Seite sein.
			// Denkbar ist auch, dass eine viel zu hohe Seitenzahl angegeben wurde.
			// Dann holt sich das Skript alle Seiten, die es kriegen kann, ab der Startseite.
			parent = ele_start.parentNode;
			while (parent.nodeName !== "body") {
				parent = parent.parentNode;
			}
		}
		let analyse = [],
			alleKinder = parent.childNodes;
		for (let i = 0, len = alleKinder.length; i < len; i++) {
			if (!analyse.length && alleKinder[i] !== ele_start && !alleKinder[i].contains(ele_start)) {
				continue;
			} else if (alleKinder[i] === ele_ende) {
				break;
			} else if (alleKinder[i].contains(ele_ende)) {
				analyse.push(alleKinder[i]);
				break;
			}
			analyse.push(alleKinder[i]);
		}
		// Elemente analysieren
		const rend = { // Textauszeichnungen
			"#aq": {
				ele: "span",
				class: "dta-antiqua",
			},
			"#b": {
				ele: "b",
				class: "",
			},
			"#blue": {
				ele: "span",
				class: "dta-blau",
			},
			"#fr": {
				ele: "span",
				class: "dta-groesser", // so zumindest Drastellung im DTA, style-Angaben im XML-Header anders
			},
			"#g": {
				ele: "span",
				class: "dta-gesperrt",
			},
			"#i": {
				ele: "i",
				class: "",
			},
			"#in": {
				ele: "span",
				class: "dta-initiale",
			},
			"#k": {
				ele: "span",
				class: "dta-kapitaelchen",
			},
			"#larger": {
				ele: "span",
				class: "dta-groesser",
			},
			"#red": {
				ele: "span",
				class: "dta-rot",
			},
			"#s": {
				ele: "s",
				class: "",
			},
			"#smaller": {
				ele: "small",
				class: "",
			},
			"#sub": {
				ele: "sub",
				class: "",
			},
			"#sup": {
				ele: "sup",
				class: "",
			},
			"#u": {
				ele: "u",
				class: "",
			},
			"#uu": {
				ele: "span",
				class: "dta-doppelt",
			},
		};
		let text = "",
			start = false,
			ende = false;
		for (let i = 0, len = analyse.length; i < len; i++) {
			ana(analyse[i]);
		}
		for (let typ in rend) {
			if (!rend.hasOwnProperty(typ)) {
				continue;
			}
			const reg = new RegExp(`\\[(${typ})\\](.+?)\\[\\/${typ}\\]`, "g");
			text = text.replace(reg, function(m, p1, p2) {
				let start = `<${rend[p1].ele}`;
				if (rend[p1].class) {
					start += ` class="${rend[p1].class}"`;
				}
				start += ">";
				return `${start}${p2}</${rend[p1].ele}>`;
			});
		}
		beleg.DTAImportData.beleg = helfer.textTrim(text, true);
		function ana (ele) {
			if (ele.nodeType === 3) { // Text
				if (start && !ende) {
					let text_tmp = ele.nodeValue.replace(/\n/g, "");
					if (/(-|¬)$/.test(text_tmp) &&
							ele.nextSibling &&
							ele.nextSibling.nodeName === "lb") {
						text += text_tmp.replace(/(-|¬)$/, "[¬]"); // Trennungsstrich ersetzen
					} else {
						text += text_tmp;
						if (ele.nextSibling &&
								ele.nextSibling.nodeName === "lb") {
							text += " ";
						}
					}
				}
			} else if (ele.nodeType === 1) { // Element
				if (ele === ele_start) {
					start = true;
				} else if (ele === ele_ende) {
					ende = true;
				} else {
					if (ele.nodeName === "pb") { // Seitenumbruch
						const n = ele.getAttribute("n");
						if (start) {
							text += `[:${n}:]`;
						}
						beleg.DTAImportData.seite_zuletzt = n;
						return;
					} else if (/^(closer|div|item|p)$/.test(ele.nodeName)) { // Absätze
						text = helfer.textTrim(text, false);
						text += "\n\n";
					} else if (/^(lg)$/.test(ele.nodeName)) { // einfache Absätze
						text = helfer.textTrim(text, false);
						text += "\n";
					} else if (ele.nodeName === "fw" &&
							/^(catch|header|sig)$/.test(ele.getAttribute("type"))) { // Kustode, Kolumnentitel, Bogensignaturen
						return;
					} else if (ele.nodeName === "hi") { // Text-Auszeichnungen
						const typ = ele.getAttribute("rendition");
						if (rend[typ]) {
							ele.insertBefore(document.createTextNode(`[${typ}]`), ele.firstChild);
							ele.appendChild(document.createTextNode(`[/${typ}]`));
						}
					} else if (ele.nodeName === "l") { // Verszeile
						text += "\n";
					} else if (ele.nodeName === "lb") { // Zeilenumbruch
						if (ele.previousSibling &&
								ele.previousSibling.nodeType === 1) {
							text += " ";
						}
						return;
					} else if (ele.nodeName === "note" &&
							ele.getAttribute("type") !== "editorial") { // Anmerkungen; "editorial" sollte inline dargestellt werden
						ele.insertBefore(document.createTextNode("[Anmerkung: "), ele.firstChild);
						ele.appendChild(document.createTextNode("] "));
					} else if (ele.nodeName === "sic") { // <sic> Fehler im Original, Korrektur steht in <corr>; die wird übernommen
						return;
					} else if (ele.nodeName === "speaker") { // Sprecher im Drama
						ele.insertBefore(document.createTextNode(`[#b]`), ele.firstChild);
						ele.appendChild(document.createTextNode(`[/#b]`));
						text = helfer.textTrim(text, false);
						text += "\n\n";
					}
					let kinder = ele.childNodes;
					for (let i = 0, len = kinder.length; i < len; i++) {
						if (ende) {
							break;
						}
						ana(kinder[i]);
					}
				}
			}
		}
	},
	// Daten in das Formular eintragen
	DTAImportFill () {
		// Werte eintragen
		const dta = beleg.DTAImportData;
		let datum_feld = dta.datum.entstehung;
		if (!datum_feld && dta.datum.druck) {
			datum_feld = dta.datum.druck;
		} else if (dta.datum.druck) {
			datum_feld += ` (Publikation von ${dta.datum.druck})`;
		}
		beleg.data.da = datum_feld;
		let autor = dta.autor.join("/");
		if (!autor) {
			autor = "N. N.";
		}
		beleg.data.au = autor;
		beleg.data.bs = dta.beleg;
		if (dta.textsorte.length) {
			let textsorte = [];
			for (let i = 0, len = dta.textsorte.length; i < len; i++) {
				let ts = dta.textsorte[i],
					ts_sub = dta.textsorte_sub[i];
				if (ts_sub && /; /.test(ts_sub)) {
					ts_sub = ts_sub.replace(/, /g, ": ");
					let ts_sub_sp = ts_sub.split("; ");
					for (let j = 0, len = ts_sub_sp.length; j < len; j++) {
						textsorte.push(`${ts}: ${ts_sub_sp[j]}`);
					}
				} else if (ts_sub) {
					ts_sub = ts_sub.replace(/, /g, ": ");
					textsorte.push(`${ts}: ${ts_sub}`);
				} else {
					textsorte.push(ts);
				}
			}
			beleg.data.ts = textsorte.join("\n");
		}
		beleg.data.kr = "DTA";
		// QUELLENANGABE ZUSAMMENSETZEN
		// Autor und Titel
		let quelle = `${autor}: ${dta.titel}`;
		// Untertitel
		if (dta.untertitel.length) {
			dta.untertitel.forEach(function(i) {
				if (/^[a-zäöü]/.test(i)) {
					quelle += ",";
				} else if (!/\.$/.test(quelle)) {
					quelle += ".";
				}
				quelle += ` ${i}`;
			});
		}
		// Serie + Seitenangabe => Titel ist IN einem Werk
		if (dta.serie_seite) {
			quellePunkt();
			quelle += ` In: ${dta.serie}`;
			dta.serie = "";
		}
		// Band
		let reg_band = new RegExp(helfer.escapeRegExp(dta.band));
		if (dta.band && !reg_band.test(quelle)) {
			quellePunkt();
			quelle += ` ${dta.band}`;
		}
		// Herausgeber
		if (dta.hrsg.length) {
			let hrsg = "";
			for (let i = 0, len = dta.hrsg.length; i < len; i++) {
				if (i > 0 && i === len - 1) {
					hrsg += " und ";
				} else if (i > 0) {
					hrsg += ", ";
				}
				hrsg += dta.hrsg[i];
			}
			quellePunkt();
			quelle += ` Hrsg. v. ${hrsg}`;
		}
		// Auflage
		if (dta.auflage) {
			quellePunkt();
			quelle += ` ${dta.auflage}. Auflage`;
		}
		quellePunkt();
		// Ort
		if (dta.ort) {
			quelle += ` ${dta.ort}`;
			if (dta.verlag && dta.verlag !== "s. e.") {
				quelle += `: ${dta.verlag}`;
			}
		}
		// Datum
		let datum = dta.datum.druck;
		if (!datum) {
			datum = dta.datum.entstehung;
		}
		quelle += ` ${datum}`;
		// Seite
		if (dta.serie_seite) {
			quelle += `, S. ${dta.serie_seite}`;
			if (dta.seite) {
				quelle += `, hier ${dta.seite}`;
				if (dta.seite_zuletzt !== dta.seite) {
					quelle += `–${dta.seite_zuletzt}`;
				}
			}
		} else if (dta.seite) {
			quelle += `, S. ${dta.seite}`;
			if (dta.seite_zuletzt !== dta.seite) {
				quelle += `–${dta.seite_zuletzt}`;
			}
		}
		// Serie
		if (dta.serie) {
			quelle += ` (= ${dta.serie})`;
		}
		// URL
		quelle += ".\n\n";
		quelle += dta.url;
		// und fertig...
		beleg.data.qu = quelle;
		// Formular füllen
		beleg.formular(false);
		beleg.belegGeaendert(true);
		// ggf. Punkt einfügen
		function quellePunkt () {
			if (!/\.$/.test(quelle)) {
				quelle += ".";
			}
		}
	},
	// Beleg wurde geändert und noch nicht gespeichert
	geaendert: false,
	// Anzeigen, dass der Beleg geändert wurde
	//   geaendert = Boolean
	belegGeaendert (geaendert) {
		beleg.geaendert = geaendert;
		let icon = document.getElementById("beleg-geaendert");
		if (geaendert) {
			icon.classList.remove("aus");
		} else {
			icon.classList.add("aus");
		}
	},
	// Beleg auf Enter speichern (wenn Fokus in Textfeld oder auf Checkbox)
	//   input = Element
	//     (Element, auf dem das Event ausgeführt wird:
	//     <input type="text">, <input type="checkbox">, <textarea>)
	belegSpeichern (input) {
		input.addEventListener("keydown", function(evt) {
			// auf Enter speichern
			//   - Text-Input und Checkboxes: hier reicht Enter
			//   - mit Strg + Enter geht der Befehl auch in Textareas
			if (evt.which === 13 &&
					(/^(checkbox|number|text)$/.test(this.type) || evt.ctrlKey)) {
				evt.preventDefault();
				if (/^beleg-dta(-bis)*$/.test(this.id)) {
					beleg.DTAImport();
					return;
				}
				if (document.getElementById("dropdown") &&
						/^beleg-(bd|kr|ts)/.test(this.id)) {
					return;
				}
				beleg.aktionSpeichern();
			}
		});
	},
	// Verteilerfunktion für Klick-Events der Tools
	//   a = Element
	//     (Link, auf den geklickt wurde)
	toolsKlick (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (this.classList.contains("icon-tools-kopieren")) {
				beleg.toolsKopieren(this);
			} else if (this.classList.contains("icon-tools-einfuegen")) {
				beleg.toolsEinfuegen(this);
			} else if (this.parentNode.classList.contains("text-tools-beleg")) {
				beleg.toolsText(this);
			}
		});
	},
	// Tool Kopieren: Text aus dem zugehörigen Textfeld komplett kopieren
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsKopieren (link) {
		// Datensatz ermitteln. Ist der Wert gefüllt?
		const ds = link.parentNode.parentNode.firstChild.getAttribute("for").replace(/^beleg-/, ""),
			text = beleg.data[ds];
		if (!text) {
			return;
		}
		beleg.toolsKopierenExec(ds, beleg.data, text, document.querySelector(`#beleg-lese-${ds} p`));
	},
	// führt die Kopieroperation aus (eigene Funktion,
	// weil sie auch für die Kopierfunktion im Beleg benutzt wird)
	//   ds = String
	//     (Bezeichner des Datensatzes)
	//   obj = Object
	//     (verweist auf das Datenobjekt, in dem der zu kopierende Text steht;
	//     wichtig, um die Literaturangabe beim Kopieren von Belegtext zu finden
	//   text = String
	//     (der komplette Feldtext, wie er in der DB steht)
	//   ele = Element
	//     (ein Element auf der 1. Ebene im Kopierbereich)
	toolsKopierenExec (ds, obj, text, ele) {
		// clipboard initialisieren
		const {clipboard} = require("electron");
		// Ist Text ausgewählt und ist er im Bereich des Kopier-Icons?
		if (window.getSelection().toString() &&
				popup.getTargetSelection([ele])) {
			let html = helfer.clipboardHtml(popup.textauswahl.html);
			clipboard.write({
				text: popup.textauswahl.text,
				html: html,
			});
			return;
		}
		// Kein Text ausgewählt => das gesamte Feld wird kopiert
		if (ds === "bs") { // Beleg
			const p = text.replace(/\n\s*\n/g, "\n").split("\n");
			let html = "";
			p.forEach(function(i) {
				let text = i;
				if (optionen.data.einstellungen["textkopie-wort"]) {
					text = liste.belegWortHervorheben(text, true);
				}
				html += `<p>${text}</p>`;
			});
			html = helfer.clipboardHtml(html);
			html = beleg.toolsKopierenAddQuelle(html, true, obj);
			text = text.replace(/<.+?>/g, "");
			text = beleg.toolsKopierenAddQuelle(text, false, obj);
			clipboard.write({
				text: text,
				html: html,
			});
		} else { // alle anderen Felder
			clipboard.writeText(text);
		}
	},
	// Quellenangabe zum Belegtext hinzufügen
	//   text = String
	//     (Text, der um die Quelle ergänzt werden soll)
	//   html = Boolean
	//     (Text soll um eine html-formatierte Quellenangabe ergänzt werden)
	//   obj = Object
	//     (das Datenobjekt, in dem die Quelle steht)
	toolsKopierenAddQuelle (text, html, obj) {
		if (html) {
			text += "<hr>";
			const quelle = obj.qu.split("\n");
			quelle.forEach(function(i) {
				text += `<p>${i}</p>`;
			});
		} else {
			text += "\n\n---\n\n";
			text += obj.qu;
		}
		return text;
	},
	// Tool Einfügen: Text möglichst unter Beibehaltung der Formatierung einfügen
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsEinfuegen (link) {
		// Element ermitteln
		// Text einlesen
		const {clipboard} = require("electron"),
			formate = clipboard.availableFormats(),
			id = link.parentNode.parentNode.firstChild.getAttribute("for"),
			ds = id.replace(/^beleg-/, ""),
			feld = document.getElementById(id);
		// Text auslesen
		let text = "";
		if (id === "beleg-bs" && formate.indexOf("text/html") >= 0) {
			text = beleg.toolsEinfuegenHtml(clipboard.readHTML());
		} else {
			text = clipboard.readText();
		}
		// Text einfügen
		if (feld.value) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					feld.value = text;
				} else if (dialog.antwort === false && feld.type === "text") { // Input-Text
					feld.value += ` ${text}`;
				} else if (dialog.antwort === false) { // Textareas
					feld.value += `\n\n${text}`;
				}
				beleg.data[ds] = feld.value;
				helfer.textareaGrow(feld);
				beleg.belegGeaendert(true);
			});
			dialog.text("Das Feld enthält schon Text. Soll er überschrieben werden?\n(Bei <i>Nein</i> wird der Text ergänzt.)");
			return;
		}
		feld.value = text;
		beleg.data[ds] = text;
		helfer.textareaGrow(feld);
		beleg.belegGeaendert(true);
	},
	// Bereitet HTML-Text zum Einfügen in das Beleg-Formular auf
	//   html = String
	//     (Text mit HTML-Tags, der aufbereitet und dann eingefügt werden soll)
	toolsEinfuegenHtml (html) {
		// Inline-Styles löschen (widerspricht sonst der Content-Security-Policy)
		html = html.replace(/<([a-zA-Z0-9]+) .+?>/g, function(m, p1) {
			return `<${p1}>`;
		});
		// HTML in temporären Container schieben
		let container = document.createElement("div");
		container.innerHTML = html;
		// Inline-Tags, die erhalten bleiben bzw. ersetzt werden sollen
		const inline_keep = [
			"B",
			"CITE",
			"DEL",
			"DFN",
			"EM",
			"I",
			"MARK",
			"S",
			"SMALL",
			"STRONG",
			"SUB",
			"SUP",
			"U",
			"VAR",
		];
		const speziell = {
			"BIG": { // obsolete!
				ele: "span",
				class: "dta-groesser",
			},
			"DD": {
				ele: "b",
				class: "",
			},
			"H1": {
				ele: "span",
				class: "dta-groesser",
			},
			"H2": {
				ele: "span",
				class: "dta-groesser",
			},
			"H3": {
				ele: "span",
				class: "dta-groesser",
			},
			"H4": {
				ele: "span",
				class: "dta-groesser",
			},
			"H5": {
				ele: "span",
				class: "dta-groesser",
			},
			"H6": {
				ele: "span",
				class: "dta-groesser",
			},
		};
		// Text extrahieren
		let text = "";
		container.childNodes.forEach(function(i) {
			ana(i);
		});
		// erhaltene Inline-Auszeichnungen korrigieren
		for (let tag in speziell) {
			if (!speziell.hasOwnProperty(tag)) {
				continue;
			}
			const reg = new RegExp(`\\[#(${tag})\\](.+?)\\[\\/${tag}\\]`, "g");
			text = text.replace(reg, function(m, p1, p2) {
				let start = `<${speziell[p1].ele}`;
				if (speziell[p1].class) {
					start += ` class="${speziell[p1].class}"`;
				} 
				return `${start}>${p2}</${speziell[p1].ele}>`;
			});
		}
		for (let i = 0, len = inline_keep.length; i < len; i++) {
			const tag = inline_keep[i],
				reg = new RegExp(`\\[#${tag}\\](.+?)\\[\\/${tag}\\]`, "g");
			text = text.replace(reg, function(m, p1) {
				return `<${tag.toLowerCase()}>${p1}</${tag.toLowerCase()}>`;
			});
		}
		// viele Absätze am Stück bereinigen
		text = text.replace(/\n{3,}/g, "\n\n");
		// gereinigtes HTML zurückgeben
		return helfer.textTrim(text, true);
		// rekursive Analyse der Tags
		function ana (ele) {
			if (ele.nodeType === 3) { // Text
				text += ele.nodeValue.replace(/\n/g, "");
			} else if (ele.nodeType === 1) { // Element
				// Inline-Elemente ggf. gesondert behandeln
				if (inline_keep.indexOf(ele.nodeName) >= 0 || speziell[ele.nodeName]) {
					ele.insertBefore(document.createTextNode(`[#${ele.nodeName}]`), ele.firstChild);
					ele.appendChild(document.createTextNode(`[/${ele.nodeName}]`));
				} else if (ele.nodeName === "Q") {
					ele.insertBefore(document.createTextNode('"'), ele.firstChild);
					ele.appendChild(document.createTextNode('"'));
				} else if (ele.nodeName === "LI") {
					ele.insertBefore(document.createTextNode("– "), ele.firstChild);
				}
				// Block-Level-Elemente (und andere), die eine Sonderbehandlung benötigen
				if (/^(BR|DD|DT|FIGCAPTION|HR|LI|TR)$/.test(ele.nodeName)) { // Zeilenumbruch
					text += "\n";
				} else if (/^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIALOG|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H([1-6]{1})|HEADER|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/.test(ele.nodeName)) { // Absätze
					text = helfer.textTrim(text, false);
					text += "\n\n";
				}
				ele.childNodes.forEach(function(i) {
					ana(i);
				});
			}
		}
	},
	// Texttools Beleg
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsText (link) {
		// Fokus in <textarea>
		const ta = document.getElementById("beleg-bs");
		ta.focus();
		// Tags ermitteln
		const tags = {
			antiqua: {
				start: `<span class="dta-antiqua">`,
				ende: "</span>",
			},
			bold: {
				start: "<b>",
				ende: "</b>",
			},
			caps: {
				start: `<span class="dta-kapitaelchen">`,
				ende: "</span>",
			},
			italic: {
				start: "<i>",
				ende: "</i>",
			},
			mark: {
				start: `<mark class="user">`,
				ende: "</mark>",
			},
			size: {
				start: `<span class="dta-groesser">`,
				ende: "</span>",
			},
			spacing: {
				start: `<span class="dta-gesperrt">`,
				ende: "</span>",
			},
			strike: {
				start: "<s>",
				ende: "</s>",
			},
			underline: {
				start: "<u>",
				ende: "</u>",
			},
		};
		const aktion = link.getAttribute("class").replace(/.+-/, "");
		// illegales Nesting über die Absatzgrenze hinaus?
		let str_sel = window.getSelection().toString();
		if (/\n/.test(str_sel)) {
			const umbruch = str_sel.match(/\n/).index;
			ta.setSelectionRange(ta.selectionStart, ta.selectionStart + umbruch, "forward");
			str_sel = window.getSelection().toString();
		}
		// Auswahl ermitteln
		let start = ta.selectionStart,
			ende = ta.selectionEnd,
			str_start = ta.value.substring(0, start),
			str_ende = ta.value.substring(ende);
		// illegales Nesting von Inline-Tags?
		if (beleg.toolsTextNesting(str_sel)) {
			dialog.oeffnen("alert", function() {
				ta.focus();
			});
			dialog.text("Die Formatierung kann an dieser Position nicht vorgenommen werden.\nGrund: illegale Verschachtelung.");
			return;
		}
		// Aktion durchführen
		const reg_start = new RegExp(`${helfer.escapeRegExp(tags[aktion].start)}$`),
			reg_ende = new RegExp(`^${helfer.escapeRegExp(tags[aktion].ende)}`);
		if (reg_start.test(str_start) && reg_ende.test(str_ende)) { // Tag entfernen
			str_start = str_start.replace(reg_start, "");
			str_ende = str_ende.replace(reg_ende, "");
			start -= tags[aktion].start.length;
			ende -= tags[aktion].start.length;
		} else { // Tag hinzufüren
			str_sel = `${tags[aktion].start}${str_sel}${tags[aktion].ende}`;
			start += tags[aktion].start.length;
			ende += tags[aktion].start.length;
		}
		ta.value = `${str_start}${str_sel}${str_ende}`;
		// Auswahl wiederherstellen
		ta.setSelectionRange(start, ende, "forward");
		// neuen Text in data
		beleg.data.bs = ta.value;
		// Änderungsmarkierung setzen
		beleg.belegGeaendert(true);
	},
	// illegales Nesting ermitteln
	//   str = String
	//     (String mit [oder ohne] HTML-Tags)
	toolsTextNesting (str) {
		// Sind überhaupt Tags im String?
		const treffer = {
			auf: str.match(/<[a-z1-6]+/g),
			zu: str.match(/<\/[a-z1-6]+>/g),
		};
		if (!treffer.auf && !treffer.zu) {
			return false;
		}
		// Analysieren, ob zuerst ein schließender Tag erscheint
		const first_start = str.match(/<[a-z1-6]+/),
			first_end = str.match(/<\/[a-z1-6]+/);
		if (first_start && first_end && first_end.index < first_start.index) {
			return true; // offenbar illegales Nesting
		}
		// Anzahl der Treffer pro Tag ermitteln
		let tags = {
			auf: {},
			zu: {}
		};
		for (let i in treffer) {
			if (!treffer.hasOwnProperty(i)) {
				continue;
			}
			if (!treffer[i]) {
				continue;
			}
			for (let j = 0, len = treffer[i].length; j < len; j++) {
				const tag = treffer[i][j].replace(/<|>|\//g, "");
				if (!tags[i][tag]) {
					tags[i][tag] = 0;
				}
				tags[i][tag]++;
			}
		}
		// Analysieren, ob es Diskrepanzen zwischen den
		// öffnenden und schließenden Tags gibt
		const arr = ["auf", "zu"];
		for (let i = 0; i < 2; i++) {
			const a = arr[i],
				b = arr[i === 1 ? 0 : 1];
			for (let tag in tags[a]) {
				if (!tags[a].hasOwnProperty(tag)) {
					continue;
				}
				if (!tags[b][tag] || tags[a][tag] !== tags[b][tag]) {
					return true; // offenbar illegales Nesting
				}
			}
		}
		return false; // offenbar kein illegales Nesting
	},
	// Bewertung des Belegs vor- od. zurücknehmen
	//   stern = Element
	//     (Stern, auf den geklickt wurde, um eine Bewertung vorzunehmen)
	bewertung (stern) {
		let sterne = document.querySelectorAll("#beleg-bewertung a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (sterne[i] === stern) {
				let bewertung = i + 1;
				if (beleg.data.be === bewertung) {
					beleg.data.be = 0;
				} else {
					beleg.data.be = bewertung;
				}
				sterne[i].blur();
				break;
			}
		}
		beleg.belegGeaendert(true);
		beleg.bewertungAnzeigen();
	},
	// regelt die Anzeige der Bewertung des Belegs
	bewertungAnzeigen () {
		let sterne = document.querySelectorAll("#beleg-bewertung a");
		for (let i = 0, len = sterne.length; i < len; i++) {
			if (i + 1 > beleg.data.be) {
				sterne[i].classList.remove("aktiv");
			} else {
				sterne[i].classList.add("aktiv");
			}
		}
	},
	// Verteilerfunktion, je nachdem welcher Event gerade stattfindet
	// (diese Funktion wird auch für die Sterne in der Filterliste benutzt)
	//   a = Element
	//     (Icon-Link mit dem Stern, der gerade aktiv ist)
	bewertungEvents (a) {
		// Mousover: Vorschau anzeigen
		a.addEventListener("mouseover", function() {
			let id = this.parentNode.id,
				sterne = document.querySelectorAll(`#${id} a`),
				aktivieren = true;
			for (let i = 0, len = sterne.length; i < len; i++) {
				if (aktivieren) {
					sterne[i].classList.add("aktiv");
					if (sterne[i] === this) {
						aktivieren = false;
					}
				} else {
					sterne[i].classList.remove("aktiv");
				}
			}
		});
		// Mouseout: die aktuelle Bewertung anzeigen
		a.addEventListener("mouseout", function() {
			let id = this.parentNode.id;
			if (/^beleg/.test(id)) {
				beleg.bewertungAnzeigen();
			} else if (/^filter/.test(id)) {
				filter.markierenSterne();
			}
		});
		// Click: den Zettel bewerten
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let id = this.parentNode.id;
			if (/^beleg/.test(id)) {
				beleg.bewertung(this);
			} else if (/^filter/.test(id)) {
				filter.anwendenSterne(this);
			}
		});
	},
	// Lesansicht umschalten
	//   user = Boolean
	//     (Leseansicht wurde durch User aktiv gewechselt)
	leseToggle (user) {
		// Ansicht umstellen
		const button = document.getElementById("beleg-link-leseansicht");
		let an = true;
		if (button.classList.contains("aktiv")) {
			an = false;
			button.title = "zur Leseansicht wechseln";
		} else {
			button.title = "zur Formularansicht wechseln";
		}
		button.classList.toggle("aktiv");
		document.querySelectorAll(".beleg-form").forEach(function(i) {
			if (an) {
				i.classList.add("aus");
			} else {
				i.classList.remove("aus");
			}
		});
		document.querySelectorAll(".beleg-lese").forEach(function(i) {
			if (an) {
				i.classList.remove("aus");
			} else {
				i.classList.add("aus");
			}
		});
		// Einfüge-Icons ein- oder ausblenden
		document.querySelectorAll("#beleg .icon-tools-einfuegen").forEach(function(i) {
			if (an) {
				i.classList.add("aus");
			} else {
				i.classList.remove("aus");
			}
		});
		// Text-Tools für Beleg ein- oder ausblenden
		const tools_beleg = document.querySelector(".text-tools-beleg");
		if (an) {
			tools_beleg.classList.add("aus");
		} else {
			tools_beleg.classList.remove("aus");
		}
		// Textwerte eintragen
		if (an) {
			beleg.leseFill();
		} else if (user) {
			document.querySelectorAll("#beleg textarea").forEach((textarea) => helfer.textareaGrow(textarea));
			document.getElementById("beleg-da").focus();
		}
	},
	// aktuelle Werte des Belegs in die Leseansicht eintragen
	leseFill () {
		// Meta-Infos
		const cont = document.getElementById("beleg-lese-meta");
		helfer.keineKinder(cont);
		liste.metainfosErstellen(beleg.data, cont, "");
		if (!cont.hasChildNodes()) {
			cont.parentNode.classList.add("aus");
		} else {
			cont.parentNode.classList.remove("aus");
		}
		// Datensätze, die String sind
		for (let wert in beleg.data) {
			if (!beleg.data.hasOwnProperty(wert)) {
				continue;
			}
			// String?
			const v = beleg.data[wert];
			if (!helfer.checkType("String", v)) {
				continue;
			}
			// Container leeren
			const cont = document.getElementById(`beleg-lese-${wert}`);
			if (!cont) { // die Datumsdatensätze dc und dm werden nicht angezeigt
				continue;
			}
			helfer.keineKinder(cont);
			// Absätze einhängen
			const p = v.replace(/\n\s*\n/g, "\n").split("\n");
			for (let i = 0, len = p.length; i < len; i++) {
				let text = p[i];
				if (!text) {
					text = " ";
				} else {
					if (!optionen.data.beleg.trennung) {
						text = liste.belegTrennungWeg(text, true);
					}
					text = liste.linksErkennen(text);
				}
				if (wert === "bs") {
					text = liste.belegWortHervorheben(text, true);
				}
				let nP = document.createElement("p");
				nP.innerHTML = text;
				cont.appendChild(nP);
			}
		}
		// Klick-Events an alles Links hängen
		document.querySelectorAll("#beleg .link").forEach(function(i) {
			liste.linksOeffnen(i);
		});
	},
	// Verteilerfunktion für die Links im <caption>-Block
	//   a = Element
	//     (Link, auf den geklickt wurde)
	ctrlLinks (a) {
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			if (/leseansicht$/.test(this.id)) {
				beleg.leseToggle(true);
			} else if (/trennung$/.test(this.id)) {
				beleg.ctrlTrennung();
			}
		});
	},
	// Trennstriche in der Leseansicht ein- bzw. ausblenden
	ctrlTrennung () {
		// Hervorhebung umstellen
		optionen.data.beleg.trennung = !optionen.data.beleg.trennung;
		optionen.speichern(false);
		// Link anpassen
		beleg.ctrlTrennungAnzeige();
		// Belegtext in der Leseansicht ggf. neu aufbauen
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			beleg.leseFill();
		}
	},
	// Trennstriche in der Leseansicht ein- bzw. ausblenden (Anzeige)
	ctrlTrennungAnzeige () {
		let link = document.getElementById("beleg-link-trennung");
		if (optionen.data.beleg.trennung) {
			link.classList.add("aktiv");
			link.title = "Silbentrennung nicht anzeigen";
		} else {
			link.classList.remove("aktiv");
			link.title = "Silbentrennung anzeigen";
		}
	},
	// trägt eine Bedeutung ein, die aus dem Bedeutungen-Fenster
	// an das Hauptfenster geschickt wurde
	//   bd = String
	//     (die Bedeutung)
	bedeutungEintragen (bd) {
		// Karteikarte ist nicht offen
		if (document.getElementById("beleg").classList.contains("aus")) {
			dialog.oeffnen("alert", null);
			dialog.text("Es ist keine Karteikarte geöffnet, in die die Bedeutung eingetragen werden könnte.");
			return;
		}
		// Karteikarte ist in der Leseansicht
		if (document.getElementById("beleg-link-leseansicht").classList.contains("aktiv")) {
			dialog.oeffnen("alert", null);
			dialog.text("Die Karteikarte befindet sich in der Leseansicht.\nDie Bedeutung kann aber nur eingetragen werden, wenn sie sich in der Formularansicht befindet.");
			return;
		}
		// Bedeutung an die Dropdown-Funktion übergeben, die entscheiden soll, wie verfahren wird
		dropdown.caller = "beleg-bd";
		dropdown.cursor = -1;
		dropdown.auswahl(document.getElementById("beleg-bd"), bd);
	},
};
