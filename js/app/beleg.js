"use strict";

let beleg = {
	// ID der aktuell angezeigten Karte
	id_karte: -1,
	// Kopie der Daten der aktuell angezeigten Karte
	data: {},
	// Überprüfen, ob vor dem Erstellen eines neuen Belegs noch Änderungen
	// gespeichert werden müssen.
	erstellenPre () {
		// aktueller Beleg noch nicht gespeichert
		if (beleg.geaendert) {
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
			un: optionen.data.einstellungen.unvollstaendig, // Bearbeitung unvollständig
			ko: false, // Kontext
			bu: false, // Bücherdienstauftrag
			bc: false, // Buchung
			be: 0, // Bewertung
			da: "", // Belegdatum
			au: "", // Autor
			bs: "", // Beleg
			bd: "", // Bedeutung
			ts: "", // Textsorte
			qu: "", // Quelle
			no: "", // Notizen
			an: [], // Anhänge
		};
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
			if ( !data.ka[id].hasOwnProperty(i) ) {
				continue;
			}
			if ( helfer.checkType("Array", data.ka[id][i]) ) {
				beleg.data[i] = [ ...data.ka[id][i] ];
			} else {
				beleg.data[i] = data.ka[id][i];
			}
		}
		// Formular anzeigen
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
		document.querySelectorAll("#beleg textarea").forEach( (textarea) => helfer.textareaGrow(textarea) );
		// Fokus setzen
		if (neu) {
			document.getElementById("beleg-dta").focus();
		} else {
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
			if (feld === "dta") { // #beleg-dta gehört nicht zur Kartei, dient nur zum DTA-Import
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
	// Beleg speichern
	aktionSpeichern () {
		// Test: Datum angegeben?
		let da = document.getElementById("beleg-da"),
			dav = helfer.textTrim(da.value, true);
		if (!dav) {
			dialog.oeffnen("alert", () => da.select() );
			dialog.text("Sie müssen ein Datum angeben.");
			return;
		}
		// Test: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
		if ( !dav.match(/[0-9]{4}|[0-9]{2}\.\sJh\./) ) {
			dialog.oeffnen("alert", () => da.select() );
			dialog.text("Das Datum muss eine vierstellige Jahreszahl (z. B. „1813“) oder eine Jahrhundertangabe (z. B. „17. Jh.“) enthalten.\nZusätzlich können auch andere Angaben gemacht werden (z. B. „ca. 1815“, „1610, vielleicht 1611“).");
			return;
		}
		// Test: Beleg angegeben?
		let bs = document.getElementById("beleg-bs");
		if ( !helfer.textTrim(bs.value, true) ) {
			dialog.oeffnen("alert", () => bs.select() );
			dialog.text("Sie müssen einen Beleg eingeben.");
			return;
		}
		// Test: Quelle angegeben?
		let qu = document.getElementById("beleg-qu");
		if ( !helfer.textTrim(qu.value, true) ) {
			dialog.oeffnen("alert", () => qu.select() );
			dialog.text("Sie müssen eine Quelle angeben.");
			return;
		}
		// Beleg wurde nicht geändert
		if (!beleg.geaendert) {
			dialog.oeffnen("alert", () => liste.wechseln() );
			dialog.text("Es wurden keine Änderungen vorgenommen.");
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
			if ( !beleg.data.hasOwnProperty(i) ) {
				continue;
			}
			if ( helfer.checkType("Array", beleg.data[i]) ) {
				data.ka[beleg.id_karte][i] = [ ...beleg.data[i] ];
			} else {
				data.ka[beleg.id_karte][i] = beleg.data[i];
			}
		}
		// Änderungen darstellen
		beleg.listeGeaendert();
	},
	// Bearbeiten des Belegs abbrechen
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
			liste.wechseln();
		}
	},
	// Beleg löschen
	aktionLoeschen () {
		// Beleg wurde noch gar nicht angelegt
		if (!data.ka[beleg.id_karte]) {
			beleg.aktionAbbrechen();
			return;
		}
		// Beleg wirklich löschen?
		dialog.oeffnen("confirm", function() {
			if (dialog.antwort) {
				// Datensatz löschen
				delete data.ka[beleg.id_karte];
				// Änderungen darstellen
				beleg.listeGeaendert();
			}
		});
		dialog.text("Soll der Beleg wirklich gelöscht werden?");
	},
	// Daten, die importiert wurden
	DTAImportData: {},
	// Daten aus dem DTA importieren
	DTAImport () {
		const dta = document.getElementById("beleg-dta"),
			url = helfer.textTrim(dta.value, true);
		// URL fehlt
		if (!url) {
			dialog.oeffnen("alert", function() {
				dta.select();
			});
			dialog.text("Sie haben keine URL eingegeben.");
			return;
		}
		// Ist das überhaupt eine URL?
		if ( !/^https*:\/\//.test(url) ) {
			dialog.oeffnen("alert", function() {
				dta.select();
			});
			dialog.text("Die scheint keine URL zu sein.");
			return;
		}
		// URL nicht vom DTA
		if ( !/^https*:\/\/www\.deutschestextarchiv\.de\//.test(url) ) {
			dialog.oeffnen("alert", function() {
				dta.select();
			});
			dialog.text("Die URL stammt nicht vom DTA.");
			return;
		}
		// Titel-ID ermitteln
		let titel_id = "";
		if ( /\/view\//.test(url) ) {
			titel_id = url.match(/\/view\/([^/?]+)/)[1];
		} else {
			titel_id = url.match(/deutschestextarchiv\.de\/([^/?]+)/)[1];
		}
		if (!titel_id) {
			dialog.oeffnen("alert", function() {
				dta.focus();
			});
			dialog.text("Beim ermitteln der Titel-ID ist etwas schiefgelaufen.\nIst die URL korrekt?");
			return;
		}
		// Seite ermitteln
		let seite = "";
		if ( /p=[0-9]+/.test(url) ) {
			seite = url.match(/p=([0-9]+)/)[1];
		} else {
			const reg = new RegExp(`${titel_id}\\/([0-9]+)`);
			seite = url.match(reg)[1];
		}
		if (!seite) {
			dialog.oeffnen("alert", function() {
				dta.focus();
			});
			dialog.text("Beim ermitteln der Seite ist etwas schiefgelaufen.\nIst die URL korrekt?");
			return;
		}
		// Ist die Kartei schon ausgefüllt?
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.ts || beleg.data.qu) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					startImport();
				} else {
					document.getElementById("beleg-dta").focus();
				}
			});
			dialog.text("Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Textsorte</i> und <i>Quelle</i> werden beim Importieren der Textdaten aus dem DTA überschrieben.\nMöchten Sie den DTA-Import wirklich starten?");
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
				datum: "",
				seite: "",
				serie: "",
				serie_seite: "",
				beleg: "",
				textsorte: [],
				textsorte_sub: [],
				url: `http://www.deutschestextarchiv.de/${titel_id}/${seite}`,
			};
			const url_xml = `http://www.deutschestextarchiv.de/book/download_xml/${titel_id}`;
			dta.blur();
			beleg.DTAImportRequest(url_xml, seite);
		}
	},
	// XMLHttpRequest stellen
	//   url = String
	//     (URL des Dokument, das aus dem DTA geladen werden soll)
	//   seite = String
	//     (Faksimile-Seite des Titels)
	DTAImportRequest (url, seite) {
		let ajax = new XMLHttpRequest();
		ajax.open("GET", url, true);
		ajax.timeout = 10000;
		ajax.addEventListener("load", function () {
			if (ajax.status >= 200 && ajax.status < 300) {
				if (!ajax.responseXML) {
					if (ajax.responseText &&
							/<title>DTA Qualitätssicherung<\/title>/.test(ajax.responseText) ) {
						beleg.DTAImportFehler("DTAQ: Titel noch nicht freigeschaltet");
					} else {
						beleg.DTAImportFehler("keine XML-Daten");
					}
					return;
				}
				beleg.DTAImportMeta(ajax.responseXML);
				beleg.DTAImportText(ajax.responseXML, seite);
				beleg.DTAImportFill();
			} else {
				beleg.DTAImportFehler("falscher Status-Code");
			}
		});
		ajax.addEventListener("timeout", function () {
			beleg.DTAImportFehler("XMLHttpRequest: Timeout");
		});
		ajax.addEventListener("error", function () {
			beleg.DTAImportFehler("XMLHttpRequest: allgemeiner Fehler");
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
			textsorte: sorte.querySelectorAll(`classCode[scheme$="dwds1main"], classCode[scheme$="dwds2main"], classCode[scheme$="dwds3main"]`),
			textsorte_sub: sorte.querySelectorAll(`classCode[scheme$="dwds1sub"], classCode[scheme$="dwds2sub"], classCode[scheme$="dwds3sub"]`),
		};
		for (let wert in werte) {
			if ( !werte.hasOwnProperty(wert) ) {
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
			if ( helfer.checkType("Element", v) ) {
				if (!v.firstChild) {
					return "";
				}
				return helfer.textTrim(v.firstChild.nodeValue, true);
			}
			let out = [];
			v.forEach(function(i) {
				if (!i.firstChild) {
					return;
				}
				out.push( helfer.textTrim(i.firstChild.nodeValue, true) );
			});
			return out;
		}
		// Datum
		let datum = bibl.querySelectorAll("publicationStmt date");
		if (datum) {
			if (datum.length === 1) {
				beleg.DTAImportData.datum = datum[0].firstChild.nodeValue;
			} else {
				let crea = bibl.querySelector(`publicationStmt date[type="creation"]`);
				if (crea) {
					beleg.DTAImportData.datum = crea.firstChild.nodeValue;
				}
			}
		}
		// Serie
		let serie_titel = bibl.querySelectorAll("seriesStmt title"),
			serie_bd = bibl.querySelector("seriesStmt biblScope");
		if (serie_titel) {
			serie_titel.forEach(function(i, n) {
				if (n > 0) {
					if ( !/\.$/.test(beleg.DTAImportData.serie) ) {
						beleg.DTAImportData.serie += ".";
					}
					beleg.DTAImportData.serie += " ";
				}
				beleg.DTAImportData.serie += helfer.textTrim(i.firstChild.nodeValue, true);
			});
			if (serie_bd) {
				let unit = serie_bd.getAttribute("unit");
				if (unit === "volume") {
					beleg.DTAImportData.serie += `, ${helfer.textTrim(serie_bd.firstChild.nodeValue, true)}`;
				} else if (unit === "pages") {
					beleg.DTAImportData.serie_seite = helfer.textTrim(serie_bd.firstChild.nodeValue, true);
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
			if ( !personen.hasOwnProperty(wert) ) {
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
						name = helfer.textTrim(person_name.firstChild.nodeValue, true);
						if (person_vorname) {
							name += `, ${helfer.textTrim(person_vorname.firstChild.nodeValue, true)}`;
						}
					} else {
						if (person_vorname) {
							name = `${helfer.textTrim(person_vorname.firstChild.nodeValue, true)} ${helfer.textTrim(person_name.firstChild.nodeValue, true)}`;
						} else {
							name = helfer.textTrim(person_name.firstChild.nodeValue, true);
						}
					}
				}
				if (name) {
					beleg.DTAImportData[wert].push(name);
				}
			}
		}
	},
	// Seite und Text des Titels importieren
	//   xml = Document
	//     (das komplette Buch, aus dem eine Seite importiert werden soll)
	DTAImportText (xml, seite) {
		// Start- und Endelement ermitteln
		const ele_start = xml.querySelector(`pb[facs="#f${seite.padStart(4, "0")}"]`),
			ele_ende = xml.querySelector(`pb[facs="#f${(parseInt(seite, 10) + 1).toString().padStart(4, "0")}"]`);
		// Seite auslesen
		beleg.DTAImportData.seite = ele_start.getAttribute("n");
		// Elemente ermitteln, die analysiert werden müssen
		let parent = ele_ende.parentNode;
		while ( !parent.contains(ele_start) ) {
			parent = parent.parentNode;
		}
		let analyse = [],
			alleKinder = parent.childNodes;
		for (let i = 0, len = alleKinder.length; i < len; i++) {
			if ( !analyse.length && alleKinder[i] !== ele_start && !alleKinder[i].contains(ele_start) ) {
				continue;
			} else if (alleKinder[i] === ele_ende) {
				break;
			} else if ( alleKinder[i].contains(ele_ende) ) {
				analyse.push(alleKinder[i]);
				break;
			}
			analyse.push(alleKinder[i]);
		}
		// Elemente analysieren
		const rend = { // Textauszeichnungen
			"#b": {
				ele: "b",
				style: "",
			},
			"#blue": {
				ele: "span",
				style: "color:blue",
			},
			"#g": {
				ele: "span",
				style: "letter-spacing:0.125em",
			},
			"#i": {
				ele: "i",
				style: "",
			},
			"#in": {
				ele: "span",
				style: "font-size:150%",
			},
			"#k": {
				ele: "span",
				style: "font-variant:small-caps",
			},
			"#larger": {
				ele: "span",
				style: "font-size:larger",
			},
			"#red": {
				ele: "span",
				style: "color:red",
			},
			"#s": {
				ele: "span",
				style: "text-decoration:line-through",
			},
			"#smaller": {
				ele: "smaller",
				style: "font-size:smaller",
			},
			"#sub": {
				ele: "sub",
				style: "",
			},
			"#sup": {
				ele: "sup",
				style: "",
			},
			"#u": {
				ele: "u",
				style: "",
			},
			"#uu": {
				ele: "u",
				style: "",
			},
		};
		let text = "",
			start = false,
			ende = false;
		for (let i = 0, len = analyse.length; i < len; i++) {
			ana(analyse[i]);
		}
		for (let typ in rend) {
			if ( !rend.hasOwnProperty(typ) ) {
				continue;
			}
			let reg = new RegExp(`\\[(${typ})\\](.+?)\\[\\/${typ}\\]`, "g");
			text = text.replace(reg, function(m, p1, p2) {
				let start = `<${rend[p1].ele}`;
				if (rend[p1].style) {
					start += ` style="${rend[p1].style}"`;
				}
				start += ">";
				return `${start}${p2}</${rend[p1].ele}>`;
			});
		}
		beleg.DTAImportData.beleg = helfer.textTrim(text, true);
		function ana (ele) {
			if (ele.nodeType === 3) { // Text
				if (start && !ende) {
					let text_tmp = ele.nodeValue.replace(/\n/, "");
					if (/(-|¬)$/.test(text_tmp) && ele.nextSibling && ele.nextSibling.nodeName === "lb") {
						text += text_tmp.replace(/(-|¬)$/, ""); // Trennungsstrich weg
					} else {
						text += text_tmp;
						if (ele.nextSibling &&
								ele.nextSibling.nodeType === 1 &&
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
					if (ele.nodeName === "lb") { // Zeilenumbruch
						if (ele.previousSibling && ele.previousSibling.nodeType === 1) {
							text += " ";
						}
						return;
					} else if ( /^(closer|div|p)$/.test(ele.nodeName) ) { // Absätze
						text += "\n\n";
					} else if ( ele.nodeName === "fw" && /^(header|sig)$/.test(ele.getAttribute("type")) ) { // Kolumnentitel, Bogensignaturen
						return;
					} else if (ele.nodeName === "sic") { // falsch im Original, Korrektur steht in <corr>
						return;
					} else if (ele.nodeName === "hi") { // Text-Auszeichnungen
						const typ = ele.getAttribute("rendition");
						if (rend[typ]) {
							ele.insertBefore(document.createTextNode(`[${typ}]`), ele.firstChild);
							ele.appendChild( document.createTextNode(`[/${typ}]`) );
						}
					} else if (ele.nodeName === "note" && ele.getAttribute("type") !== "editorial") { // Anmerkungen
						ele.insertBefore(document.createTextNode("[Anmerkung: "), ele.firstChild);
						ele.appendChild( document.createTextNode("] ") );
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
		beleg.data.da = dta.datum;
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
				if (ts_sub && /; /.test(ts_sub) ) {
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
		// QUELLENANGABE ZUSAMMENSETZEN
		// Autor und Titel
		let quelle = `${autor}: ${dta.titel}`;
		// Untertitel
		if (dta.untertitel.length) {
			dta.untertitel.forEach(function(i) {
				if ( /^[a-zäöü]/.test(i) ) {
					quelle += ",";
				} else if ( !/\.$/.test(quelle) ) {
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
		let reg_band = new RegExp( helfer.escapeRegExp(dta.band) );
		if ( dta.band && !reg_band.test(quelle) ) {
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
		quelle += ` ${dta.datum}`;
		// Seite
		if (dta.serie_seite) {
			quelle += `, S. ${dta.serie_seite}`;
			if (dta.seite) {
				quelle += `, hier ${dta.seite}`;
			}
		} else if (dta.seite) {
			quelle += `, S. ${dta.seite}`;
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
			if ( !/\.$/.test(quelle) ) {
				quelle += ".";
			}
		}
	},
	// die Aktionen im Formular führten zu einer Änderung der Belegliste (betrifft Speichern und Löschen)
	listeGeaendert () {
		// Änderungsmarkierung des Belegs entfernen
		beleg.belegGeaendert(false);
		// Änderungsmarkierung für Kartei setzen
		kartei.karteiGeaendert(true);
		// Belegliste aufbauen und einblenden
		liste.status(true);
		liste.wechseln();
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
			if ( evt.which === 13 &&
					(this.type.match(/^checkbox$|^text$/) || evt.ctrlKey) ) {
				evt.preventDefault();
				if (this.id === "beleg-dta") {
					beleg.DTAImport();
					return;
				}
				if (document.getElementById("dropdown") &&
						(this.id === "beleg-bd" || this.id === "beleg-ts") ) {
					return;
				}
				helfer.inputBlur();
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
			if ( this.classList.contains("icon-tools-kopieren") ) {
				beleg.toolsKopieren(this);
			} else if ( this.classList.contains("icon-tools-einfuegen") ) {
				beleg.toolsEinfuegen(this);
			}
		});
	},
	// Tool Kopieren: Text aus dem zugehörigen Textfeld komplett kopieren
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsKopieren (link) {
		const {clipboard} = require("electron"),
			id = link.parentNode.previousSibling.getAttribute("for"),
			feld = document.getElementById(id);
		if (id === "beleg-bs") {
			clipboard.writeHTML(feld.value);
		} else {
			clipboard.writeText(feld.value);
		}
	},
	// Tool Einfügen: Text möglichst unter Beibehaltung der Formatierung einfügen
	//   link = Element
	//     (Link, auf den geklickt wurde)
	toolsEinfuegen (link) {
		// Element ermitteln
		// Text einlesen
		const {clipboard} = require("electron"),
			formate = clipboard.availableFormats(),
			id = link.parentNode.previousSibling.getAttribute("for"),
			feld = document.getElementById(id);
		// Text auslesen
		let text = "";
		if (id === "beleg-bs" && formate.indexOf("text/html") >= 0) {
			text = beleg.toolsEinfuegenHtml( clipboard.readHTML() );
		} else {
			text = clipboard.readText();
		}
		// Text einfügen
		if (feld.value) {
			dialog.oeffnen("confirm", function() {
				if (dialog.antwort) {
					feld.value = text;
					helfer.textareaGrow(feld);
				} else if (dialog.antwort === false && feld.type === "text") { // Input-Text
					feld.value += ` ${text}`;
					helfer.textareaGrow(feld);
				} else if (dialog.antwort === false) { // Textareas
					feld.value += `\n\n${text}`;
					helfer.textareaGrow(feld);
				}
				beleg.belegGeaendert(true);
			});
			dialog.text("Das Feld enthält schon Text. Soll er überschrieben werden?\n(Bei <i>Nein</i> wird der Text ergänzt.)");
			return;
		}
		feld.value = text;
		helfer.textareaGrow(feld);
		beleg.belegGeaendert(true);
	},
	// Bereitet HTML-Text zum Einfügen in das Beleg-Formular auf
	//   html = String
	//     (Text mit HTML-Tags, der aufbereitet und dann eingefügt werden soll)
	toolsEinfuegenHtml (html) {
		// TODO
		return html;
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
			if ( id.match(/^beleg/) ) {
				beleg.bewertungAnzeigen();
			} else if ( id.match(/^filter/) ) {
				filter.markierenSterne();
			}
		});
		// Click: den Zettel bewerten
		a.addEventListener("click", function(evt) {
			evt.preventDefault();
			let id = this.parentNode.id;
			if ( id.match(/^beleg/) ) {
				beleg.bewertung(this);
			} else if ( id.match(/^filter/) ) {
				filter.anwendenSterne(this);
			}
		});
	},
};
