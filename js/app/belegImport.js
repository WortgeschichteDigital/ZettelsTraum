"use strict";

let belegImport = {
	// DTA-Import: Daten, die importiert wurden
	DTAData: {},
	// DTA-Import: Daten aus dem DTA importieren
	DTA () {
		let dta = document.getElementById("beleg-dta");
		const url = helfer.textTrim(dta.value, true);
		// URL fehlt
		if (!url) {
			dialog.oeffnen({
				typ: "alert",
				text: "Sie haben keine URL eingegeben.",
				callback: () => {
					dta.select();
				},
			});
			return;
		}
		// Ist das überhaupt eine URL?
		if (!/^https*:\/\//.test(url)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Das scheint keine URL zu sein.",
				callback: () => {
					dta.select();
				},
			});
			return;
		}
		// URL nicht vom DTA
		if (!/^https*:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
			dialog.oeffnen({
				typ: "alert",
				text: "Die URL stammt nicht vom DTA.",
				callback: () => {
					dta.select();
				},
			});
			return;
		}
		// Titel-ID ermitteln
		let titel_id = belegImport.DTAGetTitelId(url);
		if (!titel_id) {
			dialog.oeffnen({
				typ: "alert",
				text: "Beim ermitteln der Titel-ID ist etwas schiefgelaufen.\nIst die URL korrekt?",
				callback: () => {
					dta.focus();
				},
			});
			return;
		}
		// Faksimileseite ermitteln
		let fak = belegImport.DTAGetFak(url, titel_id);
		if (!fak) {
			dialog.oeffnen({
				typ: "alert",
				text: "Beim ermitteln der Seite ist etwas schiefgelaufen.\nIst die URL korrekt?",
				callback: () => {
					dta.focus();
				},
			});
			return;
		}
		// Ist die Kartei schon ausgefüllt?
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.qu || beleg.data.kr || beleg.data.ts) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Quelle, Korpus</i> und <i>Textsorte</i> werden beim Importieren der Textdaten aus dem DTA überschrieben.\nMöchten Sie den DTA-Import wirklich starten?",
				callback: () => {
					if (dialog.antwort) {
						startImport();
					} else {
						dta.focus();
					}
				},
			});
			return;
		}
		// Dann mal los...
		startImport();
		// Startfunktion
		function startImport () {
			belegImport.DTAData = {
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
				spalte: false,
				serie: "",
				serie_seite: "",
				beleg: "",
				textsorte: [],
				textsorte_sub: [],
				url: `http://www.deutschestextarchiv.de/${titel_id}/${fak}`,
			};
			const url_xml = `http://www.deutschestextarchiv.de/book/download_xml/${titel_id}`;
			document.activeElement.blur();
			belegImport.DTARequest(url_xml, fak);
		}
	},
	// DTA-Import: Titel-ID ermitteln
	//   url = String
	//     (DTA-URL)
	DTAGetTitelId (url) {
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
	// DTA-Import: Faksimile-Nummer ermitteln
	//   url = String
	//     (DTA-URL)
	//   titel_id = String
	//     (titel_id, falls sie schon ermittelt wurde, sonst leerer String)
	DTAGetFak (url, titel_id) {
		let fak = "";
		if (!titel_id) {
			titel_id = belegImport.DTAGetTitelId(url);
			if (!titel_id) {
				return fak;
			}
		}
		if (/p=[0-9]+/.test(url)) {
			fak = url.match(/p=([0-9]+)/)[1];
		} else if (new RegExp(`${titel_id}\\/[0-9]+`).test(url)) {
			let reg = new RegExp(`${titel_id}\\/([0-9]+)`);
			fak = url.match(reg)[1];
		}
		return fak;
	},
	// DTA-Import: XMLHttpRequest stellen
	//   url = String
	//     (URL des Dokument, das aus dem DTA geladen werden soll)
	//   fak = String
	//     (Faksimile-Seite des Titels)
	DTARequest (url, fak) {
		let ajax = new XMLHttpRequest();
		ajax.open("GET", url, true);
		ajax.timeout = parseInt(optionen.data.einstellungen.timeout, 10) * 1000;
		ajax.addEventListener("load", function () {
			if (ajax.status >= 200 && ajax.status < 300) {
				if (!ajax.responseXML) {
					if (ajax.responseText &&
							/<title>DTA Qualitätssicherung<\/title>/.test(ajax.responseText)) {
						belegImport.DTAFehler("DTAQ: Titel noch nicht freigeschaltet");
					} else {
						belegImport.DTAFehler("XMLHttpRequest: keine XML-Daten");
					}
					return;
				}
				belegImport.DTAMeta(ajax.responseXML);
				belegImport.DTAText(ajax.responseXML, fak);
				belegImport.DTAFill();
			} else {
				belegImport.DTAFehler("XMLHttpRequest: falscher Status-Code");
			}
		});
		ajax.addEventListener("timeout", function () {
			belegImport.DTAFehler("XMLHttpRequest: Timeout");
		});
		ajax.addEventListener("error", function () {
			belegImport.DTAFehler("XMLHttpRequest: unbestimmter Fehler");
		});
		ajax.send(null);
	},
	// DTA-Import: Fehler beim Laden der Daten des DTA
	//   fehlertyp = String
	//     (die Beschreibung des Fehlers)
	DTAFehler (fehlertyp) {
		dialog.oeffnen({
			typ: "alert",
			text: `Beim Download der Textdaten aus dem DTA ist ein <strong>Fehler</strong> aufgetreten.\n<h3>Fehlertyp</h3>\n${fehlertyp}`,
			callback: () => {
				let dta = document.getElementById("beleg-dta");
				dta.select();
			},
		});
	},
	// DTA-Import: Meta-Daten des Titels importieren
	//   xml = Document
	//     (das komplette Buch, aus dem eine Seite importiert werden soll;
	//     enthält auch den TEI-Header)
	DTAMeta (xml) {
		// normale Werte
		let bibl = xml.querySelector("teiHeader fileDesc sourceDesc biblFull"),
			sorte = xml.querySelector("teiHeader profileDesc textClass");
		let werte = {
			titel: bibl.querySelector(`titleStmt title[type="main"]`),
			untertitel: bibl.querySelectorAll(`titleStmt title[type="sub"]`),
			band: bibl.querySelector(`titleStmt title[type="volume"]`),
			auflage: bibl.querySelector("editionStmt edition"),
			ort: bibl.querySelector("publicationStmt pubPlace"),
			verlag: bibl.querySelector("publicationStmt publisher name"),
			textsorte: sorte.querySelectorAll(`classCode[scheme$="dtamain"], classCode[scheme$="dwds1main"]`),
			textsorte_sub: sorte.querySelectorAll(`classCode[scheme$="dtasub"], classCode[scheme$="dwds1sub"]`),
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
			belegImport.DTAData[wert] = text;
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
					belegImport.DTAData.datum.entstehung = trimmer(datum[i].firstChild.nodeValue);
				} else {
					belegImport.DTAData.datum.druck = trimmer(datum[i].firstChild.nodeValue);
				}
			}
		}
		// Serie
		let serie_titel = bibl.querySelectorAll("seriesStmt title"),
			serie_bd = bibl.querySelector("seriesStmt biblScope");
		if (serie_titel) {
			serie_titel.forEach(function(i, n) {
				if (n > 0) {
					if (!/\.$/.test(belegImport.DTAData.serie)) {
						belegImport.DTAData.serie += ".";
					}
					belegImport.DTAData.serie += " ";
				}
				belegImport.DTAData.serie += trimmer(i.firstChild.nodeValue);
			});
			if (serie_bd) {
				let unit = serie_bd.getAttribute("unit");
				if (unit === "volume") {
					belegImport.DTAData.serie += `, ${trimmer(serie_bd.firstChild.nodeValue)}`;
				} else if (unit === "pages") {
					belegImport.DTAData.serie_seite = trimmer(serie_bd.firstChild.nodeValue);
				}
			}
			if (belegImport.DTAData.textsorte[0] === "Zeitung") {
				belegImport.DTAData.titel = `${belegImport.DTAData.serie}, ${belegImport.DTAData.titel}`;
				belegImport.DTAData.serie = "";
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
					belegImport.DTAData[wert].push(name);
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
	// DTA-Import: Seite und Text des Titels importieren
	//   xml = Document
	//     (das komplette Buch, aus dem eine Seite importiert werden soll)
	//   fak = String
	//     (Faksimile-Seite des Titels)
	DTAText (xml, fak) {
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
		let ele_start = xml.querySelector(`pb[facs="#f${fak.padStart(4, "0")}"]`),
			ele_ende = xml.querySelector(`pb[facs="#f${fak_bis.padStart(4, "0")}"]`);
		// Seite auslesen
		const n = ele_start.getAttribute("n");
		if (n) { // bei Seiten mit <cb> gibt es kein n-Attribut
			belegImport.DTAData.seite = belegImport.DTAData.seite_zuletzt = n;
		}
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
			let reg = new RegExp(`\\[(${typ})\\](.+?)\\[\\/${typ}\\]`, "g");
			while (text.match(reg)) { // bei komischen Verschachtelungen kann es dazu kommen, dass beim 1. Durchgang nicht alle Tags ersetzt werden
				text = text.replace(reg, function(m, p1, p2) {
					let start = `<${rend[p1].ele}`;
					if (rend[p1].class) {
						start += ` class="${rend[p1].class}"`;
					}
					start += ">";
					return `${start}${p2}</${rend[p1].ele}>`;
				});
			}
		}
		belegImport.DTAData.beleg = helfer.textTrim(text, true);
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
						if (!n) { // wenn Spalten => kein n-Attribut im <pb>
							return;
						}
						if (start) { // Ja, das kann passieren! Unbedingt stehenlassen!
							text += `[:${n}:]`;
							belegImport.DTAData.seite_zuletzt = n;
						}
						return;
					} else if (ele.nodeName === "cb") { // Spaltenumbruch
						const n = ele.getAttribute("n");
						if (!n) { // zur Sicherheit
							return;
						}
						belegImport.DTAData.spalte = true;
						if (!belegImport.DTAData.seite) {
							belegImport.DTAData.seite = n;
						} else {
							belegImport.DTAData.seite_zuletzt = n;
							if (start) { // Kann das passieren? Zur Sicherheit stehenlassen!
								text += `[:${n}:]`;
							}
						}
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
	// DTA-Import: Daten in das Formular eintragen
	DTAFill () {
		// Werte eintragen
		let dta = belegImport.DTAData;
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
				if (ts_sub && /[,;] /.test(ts_sub)) {
					let ts_sub_sp = ts_sub.split(/[,;] /);
					for (let j = 0, len = ts_sub_sp.length; j < len; j++) {
						textsorte.push(`${ts}: ${ts_sub_sp[j]}`);
					}
				} else if (ts_sub) {
					textsorte.push(`${ts}: ${ts_sub}`);
				} else {
					textsorte.push(ts);
				}
			}
			// identische Werte eliminieren
			let textsorteUnique = new Set(textsorte);
			beleg.data.ts = Array.from(textsorteUnique).join("\n");
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
		const seite_spalte = dta.spalte ? "Sp" : "S";
		if (dta.serie_seite) {
			quelle += `, ${seite_spalte}. ${dta.serie_seite}`;
			if (dta.seite) {
				quelle += `, hier ${dta.seite}`;
				if (dta.seite_zuletzt !== dta.seite) {
					quelle += `–${dta.seite_zuletzt}`;
				}
			}
		} else if (dta.seite) {
			quelle += `, ${seite_spalte}. ${dta.seite}`;
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
		// Aufrufdatum
		let heute = new Date(),
			tag = heute.getDate(),
			monat = heute.getMonth() + 1;
		quelle += ` (Aufrufdatum: ${tag < 10 ? `0${tag}` : tag}.${monat < 10 ? `0${monat}` : monat}.${heute.getFullYear()})`;
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
		// Wort gefunden?
		belegImport.checkWort();
	},
	// DWDS-Import: Liste der Korpora des DWDS
	DWDSKorpora: {
		blogs: {
			kr: "DWDS: Blogs",
			ts: "Blog",
		},
		bz: {
			kr: "DWDS: Berliner Zeitung",
			ts: "Zeitung",
		},
		bz_pp: {
			kr: "DWDS: Berliner Zeitung",
			ts: "Zeitung",
		},
		ddr: {
			kr: "DWDS: DDR",
			ts: "",
		},
		dingler: {
			kr: "DWDS: Polytechnisches Journal",
			ts: "",
		},
		dta: {
			kr: "DTA",
			ts: "",
		},
		ibk_dchat: {
			kr: "DWDS: Dortmunder Chat-Korpus",
			ts: "Chat",
		},
		ibk_web_2016c: {
			kr: "DWDS: Webkorpus 2016c",
			ts: "",
		},
		it_blogs: {
			kr: "DWDS: IT-Blogs",
			ts: "Blog",
		},
		kern: {
			kr: "DWDS: Kernkorpus",
			ts: "",
		},
		korpus21: {
			kr: "DWDS: Kernkorpus 21",
			ts: "",
		},
		modeblogs: {
			kr: "DWDS: Mode- und Beauty-Blogs",
			ts: "",
		},
		nd: {
			kr: "DWDS: neues deutschland",
			ts: "Zeitung",
		},
		politische_reden: {
			kr: "DWDS: Politische Reden",
			ts: "Rede",
		},
		public: {
			kr: "DWDS: Referenz- und Zeitungskorpora",
			ts: "",
		},
		spk: {
			kr: "DWDS: Gesprochene Sprache",
			ts: "",
		},
		tagesspiegel: {
			kr: "DWDS: Tagesspiegel",
			ts: "Zeitung",
		},
		textberg: {
			kr: "DWDS: Text+Berg",
			ts: "",
		},
		untertitel: {
			kr: "DWDS: Filmuntertitel",
			ts: "",
		},
		wende: {
			kr: "DWDS: Berliner Wendecorpus",
			ts: "",
		},
		zeit: {
			kr: "DWDS: Die ZEIT",
			ts: "Zeitung",
		},
	},
	// DWDS-Import: starten
	DWDS () {
		let doc = belegImport.DWDSXMLCheck();
		// bei Fehlern => Meldung anzeigen
		if (helfer.checkType("Number", doc)) {
			belegImport.DWDSFehler(doc);
			return;
		}
		// Ist die Kartei schon ausgefüllt?
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.qu || beleg.data.kr || beleg.data.ts || beleg.data.no) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Quelle, Korpus, Textsorte</i> und <i>Notizen</i> werden beim Importieren der Textdaten aus dem DWDS überschrieben.\nMöchten Sie den DWDS-Import wirklich starten?",
				callback: () => {
					if (dialog.antwort) {
						startImport();
					} else {
						document.getElementById("beleg-dwds-button").focus();
					}
				},
			});
			return;
		}
		// Dann mal los...
		startImport();
		// Startfunktion
		function startImport () {
			// Datensatz: Datum
			let nDa = doc.xml.querySelector("Fundstelle Datum");
			if (nDa && nDa.firstChild) {
				beleg.data.da = nDa.firstChild.nodeValue;
			}
			// Datensatz: Autor
			let nAu = doc.xml.querySelector("Fundstelle Autor");
			if (nAu && nAu.firstChild) {
				let autor = nAu.firstChild.nodeValue;
				// Autorname besteht nur aus Großbuchstaben, Leerzeichen und Kommata =>
				// wenigstens versuchen ein paar Kleinbuchstaben unterzubringen
				if (/^[A-ZÄÖÜ,\s]+$/.test(autor)) {
					let autorKlein = "";
					autor.split(/\s/).forEach((i, n) => {
						if (n > 0) {
							autorKlein += " ";
						}
						autorKlein += i.substring(0, 1) + i.substring(1).toLowerCase();
					});
					autor = autorKlein;
				}
				// verschiedene Verbesserungen
				autor = autor.replace(/^[!?.,;: ]+/, ""); // Satz- und Leerzeichen am Anfang entfernen (kommt wirklich vor!)
				autor = autor.replace(/\s\/\s/g, "/"); // Leerzeichen um Slashes entfernen
				autor = autor.replace(/^Von /, ""); // häufig wird die Autorangabe "Von Karl Mustermann" fälschlicherweise als kompletter Autor angegeben
				// Autorname eintragen
				if (/^(Name|o\.\s?A\.|unknown)$/.test(autor)) { // merkwürdige Platzhalter für "Autor unbekannt"
					beleg.data.au = "N. N.";
				} else if (!/[A-ZÄÖÜ]/.test(autor)) { // Autorname ist nur ein Kürzel
					beleg.data.au = `N. N. [${autor}]`;
				} else {
					let leerzeichen = autor.match(/\s/g);
					if (!/,\s/.test(autor) && leerzeichen && leerzeichen.length === 1) {
						let autorSp = autor.split(/\s/);
						beleg.data.au = `${autorSp[1]}, ${autorSp[0]}`;
					} else {
						beleg.data.au = autor;
					}
				}
			} else {
				beleg.data.au = "N. N.";
			}
			// Datensatz: Beleg
			let nBs = doc.xml.querySelector("Belegtext");
			if (nBs && nBs.firstChild) {
				let bs = [],
					bsContent = nBs.textContent.replace(/<Stichwort>(.+?)<\/Stichwort>/g, (m, p1) => p1);
				bsContent = bsContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
				for (let p of bsContent.split(/[\r\n]/)) {
					p = helfer.textTrim(p, true);
					if (!p) {
						continue;
					}
					bs.push(p);
				}
				beleg.data.bs = bs.join("\n\n");
			}
			// Datensatz: Beleg-XML
			beleg.data.bx = doc.clipboard;
			// Datensatz: Quelle
			let nQu = doc.xml.querySelector("Fundstelle Bibl");
			if (nQu && nQu.firstChild) {
				beleg.data.qu = nQu.firstChild.nodeValue;
				// eine Verrenkung wegen der häufig merkwürdigen Zitierweise
				beleg.data.qu = beleg.data.qu.replace(/ Zitiert nach:.+/, "");
				let jahrDatierung = beleg.data.da.match(/[0-9]{4}/),
					jahrQuelle = beleg.data.qu.matchAll(/(?<!S. )(?<![0-9])([0-9]{4})/g),
					jahrQuelleStr = "";
				for (let i of jahrQuelle) {
					jahrQuelleStr = i[1];
				}
				if (jahrDatierung && jahrQuelle &&
						jahrDatierung[0] !== jahrQuelleStr) {
					let datierung = parseInt(jahrDatierung[0], 10),
						quelle = parseInt(jahrQuelleStr, 10),
						publikation = `${quelle} [${datierung}]`;
					if (quelle > datierung) {
						publikation = `${quelle} [zuerst ${datierung}]`;
					}
					const idx = beleg.data.qu.lastIndexOf("" + quelle);
					beleg.data.qu = beleg.data.qu.substring(0, idx) + publikation + beleg.data.qu.substring(idx + 4);
				}
				// ggf. Autor + Titel ergänzen
				let nTitel = doc.xml.querySelector("Fundstelle Titel");
				if (nTitel && nTitel.firstChild) {
					let titel = nTitel.firstChild.nodeValue;
					if (/^o\.\s?T\.$|^Jahrbuch des Schweizer Alpen-Clubs/.test(titel)) {
						titel = "";
					}
					if (titel && !beleg.data.qu.includes(titel)) {
						let qu = beleg.data.qu;
						beleg.data.qu = `${beleg.data.au}: ${titel}`;
						if (!/\.$/.test(beleg.data.qu)) {
							beleg.data.qu += ".";
						}
						beleg.data.qu += ` In: ${qu}`;
					}
				}
				// ggf. "o. A." am Anfang der Quellenangabe ersetzen
				if (/^o\.\s?A\./.test(beleg.data.qu)) {
					beleg.data.qu = beleg.data.qu.replace(/^o\.\s?A\./, "N. N.");
				}
				// ggf. Seite ergänzen
				let nSeite = doc.xml.querySelector("Fundstelle Seite");
				if (nSeite && nSeite.firstChild) {
					let seite = nSeite.firstChild.nodeValue;
					if (!beleg.data.qu.includes(`S. ${seite}`)) {
						if (/\.$/.test(beleg.data.qu)) {
							beleg.data.qu = beleg.data.qu.substring(0, beleg.data.qu.length - 1);
						}
						beleg.data.qu += `, S. ${seite}`;
					}
				}
				// ggf. Punkt am Ende der Quellenangabe ergänzen
				if (!/\.$/.test(beleg.data.qu)) {
					beleg.data.qu += ".";
				}
				// Tagesdaten ggf. aufhübschen
				let datum = beleg.data.qu.match(/(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})/);
				if (datum) {
					let reg = new RegExp(helfer.escapeRegExp(datum[0]));
					beleg.data.qu = beleg.data.qu.replace(reg, `${datum.groups.tag.replace(/^0/, "")}. ${datum.groups.monat.replace(/^0/, "")}. ${datum.groups.jahr}`);
				}
				// typographische Verbesserungen
				let von_bis = beleg.data.qu.match(/[0-9]+\s?-\s?[0-9]+/g);
				if (von_bis) {
					for (let i of von_bis) {
						let huebsch = i.replace(/\s?-\s?/, "–");
						beleg.data.qu = beleg.data.qu.replace(i, huebsch);
					}
				}
				// ggf. URL ergänzen
				let nURL = doc.xml.querySelector("Fundstelle URL");
				if (nURL && nURL.firstChild) {
					beleg.data.qu += `\n\n${nURL.firstChild.nodeValue}`;
					// ggf. Aufrufdatum ergänzen
					let nAuf = doc.xml.querySelector("Fundstelle Aufrufdatum");
					if (nAuf && nAuf.firstChild) {
						beleg.data.qu += ` (Aufrufdatum: ${nAuf.firstChild.nodeValue})`;
					}
				}
				// Steht in der Quellenangabe der Autor in der Form "Nachname, Vorname",
				// im Autor-Feld aber nicht?
				let auQu = beleg.data.qu.split(": ");
				if (/, /.test(auQu[0]) && !/, /.test(beleg.data.au)) {
					let autorQu = auQu[0].replace(/,/g, "").split(/\s/),
						autorAu = beleg.data.au.split(/\s/);
					if (auQu[0] !== beleg.data.au &&
							autorQu.length === autorAu.length) {
						let autorAendern = true;
						for (let i of autorAu) {
							if (!autorQu.includes(i)) {
								autorAendern = false;
								break;
							}
						}
						if (autorAendern) {
							beleg.data.au = auQu[0];
						}
					}
				}
				// Steht im Autor-Feld kein Name, in der Quelle scheint aber einer zu sein?
				if ((!beleg.data.au || beleg.data.au === "N. N.") && auQu.length > 1) {
					beleg.data.au = auQu[0];
				}
			}
			// Datensatz: Korpus
			let korpus = "",
				nKr = doc.xml.querySelector("Fundstelle Korpus");
			if (nKr && nKr.firstChild) {
				korpus = nKr.firstChild.nodeValue;
				if (belegImport.DWDSKorpora[korpus]) { // Korpus könnte noch nicht in der Liste sein
					beleg.data.kr = belegImport.DWDSKorpora[korpus].kr;
				}
			}
			// Datensatz: Textsorte
			let nTs = doc.xml.querySelector("Fundstelle Textklasse");
			if (korpus && belegImport.DWDSKorpora[korpus] && belegImport.DWDSKorpora[korpus].ts) {
				beleg.data.ts = belegImport.DWDSKorpora[korpus].ts;
			} else if (nTs && nTs.firstChild) {
				const ts = nTs.firstChild.nodeValue;
				if (!/::/.test(ts)) {
					beleg.data.ts = ts.split(":")[0];
				} else {
					let tsSp = ts.split("::");
					beleg.data.ts = "";
					for (let i = 0, len = tsSp.length; i < len; i++) {
						let tsClean = helfer.textTrim(tsSp[i], true);
						if (!tsClean || /^[A-ZÄÖÜ]{2,}/.test(tsClean)) {
							continue;
						}
						if (i > 0) {
							beleg.data.ts += ": ";
						}
						beleg.data.ts += tsClean;
					}
				}
			}
			// Datensatz: Notizen
			let nDok = doc.xml.querySelector("Fundstelle Dokument");
			if (nDok && nDok.firstChild) {
				let dok = nDok.firstChild.nodeValue;
				if (korpus) {
					let wort = kartei.wort.replace(/\s/g, " && "),
						query = encodeURIComponent(`${wort} #HAS[basename,'${dok}']`),
						ersteZeile = "\n";
					if (optionen.data.einstellungen["notizen-zeitung"] &&
							belegImport.DWDSKorpora[korpus] &&
							belegImport.DWDSKorpora[korpus].ts === "Zeitung") {
						ersteZeile = `${belegImport.DWDSKorpora[korpus].kr.split(": ")[1]}\n\n`;
					}
					beleg.data.no = `${ersteZeile}Beleg im DWDS: https://www.dwds.de/r?format=max&q=${query}&corpus=${korpus}`;
					// 1. Zeile frei lassen; hier werden mitunter Notizen der BearbeiterIn eingetragen,
					// die in der Belegliste angezeigt werden sollen
				} else {
					beleg.data.no = `\n${dok}`;
					// 1. Zeile dito
				}
			}
			// Formular füllen
			beleg.formular(false);
			beleg.belegGeaendert(true);
			// Wort gefunden?
			belegImport.checkWort();
		}
	},
	// DWDS-Import: Fehlermeldung
	//   id = Number
	//     (die Fehlernummer)
	DWDSFehler (id) {
		let fehler = [
			"kein XML-Snippet in der Zwischenablage",
			"XML-Snippet stammt nicht aus dem DWDS",
			"XML-Daten sind nicht wohlgeformt",
		];
		dialog.oeffnen({
			typ: "alert",
			text: `Der DWDS-Import ist fehlgeschlagen.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${fehler[id - 1]}</p>`,
			callback: () => {
				document.getElementById("beleg-dwds-button").focus();
			},
		});
	},
	// DWDS-Import: überprüft, ob Daten in Zwischenablage DWDS-Snippet sind
	//   cp = String || undefined
	//     (Text-Inhalt des Clipboards)
	DWDSXMLCheck (cp) {
		if (!cp) {
			const {clipboard} = require("electron");
			cp = clipboard.readText();
		}
		if (!/^<[a-zA-Z]/.test(cp)) {
			return 1;
		}
		// Daten beginnen nicht mit <Beleg>
		if (!/^<Beleg>/.test(cp)) {
			return 2;
		}
		// XML nicht wohlgeformt
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(cp, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			return 3;
		}
		// kein <Korpus>
		if (!xmlDoc.querySelector("Fundstelle Korpus")) {
			return 2;
		}
		// korrektes XML-Dokument
		return {
			clipboard: cp,
			xml: xmlDoc
		};
	},
	// Datei-Import: speichert die Daten der geladenen Datei zwischen
	Datei: {
		pfad: "", // Pfad zur Datei
		typ: "", // Typ der Datei (dereko || bibtex)
		meta: "", // Metadaten für alle Belege in belegImport.Datei.data
		data: [], // Daten der Datei; s. pushBeleg()
	},
	// Datei-Import: öffnet eine Datei und liest sie ein
	async DateiOeffnen () {
		// Optionen
		let opt = {
			title: "Datei öffnen",
			defaultPath: appInfo.documents,
			filters: [
				{
					name: "Alle Dateien",
					extensions: ["*"],
				},
			],
			properties: [
				"openFile",
			],
		};
		if (document.getElementById("beleg-import-dereko").checked) {
			opt.filters.push({
				name: `Text-Datei`,
				extensions: ["txt"],
			});
		} else if (document.getElementById("beleg-import-bibtex").checked) {
			opt.filters.push({
				name: `BibTeX-Datei`,
				extensions: ["bib", "bibtex"],
			});
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
		// Encoding ermitteln
		let encoding = "utf8";
		if (document.getElementById("beleg-datei-latin1").checked) {
			encoding = "latin1";
		}
		// Datei einlesen
		const fsP = require("fs").promises;
		fsP.readFile(result.filePaths[0], {encoding: encoding})
			.then(content => {
				if (document.getElementById("beleg-import-dereko").checked) {
					belegImport.DeReKo(content, result.filePaths[0]);
				} else if (document.getElementById("beleg-import-bibtex").checked) {
					belegImport.BibTeX(content, result.filePaths[0]);
				}
			})
			.catch(err => {
				dialog.oeffnen({
					typ: "alert",
					text: `Beim Lesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
				});
				throw err;
			});
	},
	// Datei-Import: Metadaten auffrischen
	//   pfad = String
	//     (Pfad zur geladenen Datei)
	//   typ = String
	//     (Typ der Datei, also dereko || bibtex)
	DateiMeta (pfad, typ) {
		let dataPfad = "",
		dataTyp = "";
		if (belegImport.Datei.data.length) {
			dataPfad = pfad;
			dataTyp = typ;
		}
		belegImport.Datei.pfad = dataPfad;
		belegImport.Datei.typ = dataTyp;
	},
	// Datei-Import: Verteilerfunktion für das Importieren eingelesener Datensätze
	DateiImport () {
		// nur ein Datensatz vorhanden => direkt importieren
		if (belegImport.Datei.data.length === 1) {
			belegImport.DateiImportAusfuehren(0);
			return;
		}
		// ggf. Fenster zum Auswahl des zu importierenden Datensatzes öffnen
		let importTypAktiv = "dereko";
		if (document.getElementById("beleg-import-bibtex").checked) {
			importTypAktiv = "bibtex";
		}
		if (!belegImport.Datei.data.length ||
				belegImport.Datei.typ !== importTypAktiv) {
			dialog.oeffnen({
				typ: "alert",
				text: "Es wurden noch keine Datensätze geladen, die importiert werden könnten!",
				callback: () => {
					document.getElementById("beleg-datei-oeffnen").focus();
				},
			});
			return;
		}
		belegImport.DateiImportFenster();
	},
	// Datei-Import: Overlay-Fenster mit der Liste der eingelesenen Belege öffnen
	DateiImportFenster () {
		// Fenster öffnen
		let fenster = document.getElementById("import");
		overlay.oeffnen(fenster);
		document.getElementById("import-abbrechen-button").focus();
		// längstes Wort ermitteln (wird für die Auswahl des Textausschnitts gebraucht)
		let laengstesWort = 0;
		for (let wort of Object.keys(data.fv)) {
			if (wort.length > laengstesWort) {
				laengstesWort = wort.length;
			}
		}
		// Belegliste aufbauen
		let cont = document.getElementById("import-cont"),
			daten = belegImport.Datei.data,
			table = document.createElement("table");
		cont.replaceChild(table, cont.firstChild);
		daten.forEach((i, n) => {
			let tr = document.createElement("tr");
			table.appendChild(tr);
			tr.dataset.idx = n;
			auswahl(tr);
			// Haken
			let td = document.createElement("td");
			tr.appendChild(td);
			let img = document.createElement("img");
			td.appendChild(img);
			img.width = "24";
			img.height= "24";
			if (i.importiert) {
				img.src = "img/check-gruen.svg";
				img.title = "demarkieren";
			} else {
				img.src = "img/platzhalter.svg";
				img.title = "markieren";
			}
			markierung(img);
			// Datum
			td = document.createElement("td");
			tr.appendChild(td);
			td.textContent = i.ds.da ? i.ds.da : "o. J.";
			if (i.ds.da.length > 4) {
				table.classList.add("datum-breit");
			}
			// Autor
			td = document.createElement("td");
			tr.appendChild(td);
			td.textContent = i.ds.au;
			if (i.ds.au === "N. N.") {
				td.classList.add("kein-wert");
			}
			// Beleganriss
			td = document.createElement("td");
			tr.appendChild(td);
			let bs = i.ds.bs.replace(/\n/g, " ");
			if (!bs) { // wird bei BibTeX immer so sein
				td.classList.add("kein-wert");
				td.textContent = "kein Beleg";
				return;
			}
			let pos = belegImport.checkWort(bs, true);
			pos.sort((a, b) => {
				return a - b;
			});
			if (!pos.length) {
				td.textContent = bs.substring(0, 150);
			} else {
				let vor = laengstesWort + 20,
					start = pos[0] - vor < 0 ? 0 : pos[0] - vor;
				if (start === 0) {
					vor = 0;
				}
				td.textContent = `${start > 0 ? "…" : ""}${bs.substring(start, start + 150 - vor)}`;
			}
		});
		// Import-Markierung entfernen
		function markierung (img) {
			img.addEventListener("click", function(evt) {
				evt.stopPropagation();
				let idx = parseInt(this.closest("tr").dataset.idx, 10);
				daten[idx].importiert = !daten[idx].importiert;
				if (daten[idx].importiert) {
					this.src = "img/check-gruen.svg";
					this.title = "demarkieren";
				} else {
					this.src = "img/platzhalter.svg";
					this.title = "markieren";
				}
			});
		}
		// Import-Fenster schließen ausgewählten Datensatz übernehmen
		function auswahl (tr) {
			tr.addEventListener("click", function() {
				overlay.schliessen(document.getElementById("import"));
				setTimeout(() => {
					let idx = parseInt(this.dataset.idx, 10);
					belegImport.DateiImportAusfuehren(idx);
				}, 200); // 200ms Zeit lassen, um das Overlay-Fenster zu schließen
			});
		}
	},
	// Datei-Import: Import ausführen
	//   idx = Number
	//     (der Index in belegImport.Datei.data, der importiert werden soll)
	DateiImportAusfuehren (idx) {
		// Ist die Kartei schon ausgefüllt?
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.qu || beleg.data.kr || beleg.data.ts || beleg.data.no) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Quelle, Korpus, Textsorte</i> und <i>Notizen</i> werden beim Importieren der geladenen Daten überschrieben.\nMöchten Sie den Import wirklich starten?",
				callback: () => {
					if (dialog.antwort) {
						startImport();
					} else {
						document.getElementById("beleg-datei-importieren").focus();
					}
				},
			});
			return;
		}
		// Wurde der Datensatz schon einmal importiert?
		if (belegImport.Datei.data[idx].importiert) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Der ausgewählte Datensatz wurde offenbar schon einmal importiert.\nMöchten Sie ihn trotzdem importieren?",
				callback: () => {
					if (dialog.antwort) {
						startImport();
					} else {
						document.getElementById("beleg-datei-importieren").focus();
					}
				},
			});
			return;
		}
		// Dann mal los...
		startImport();
		// Import-Funktion
		function startImport () {
			let data = belegImport.Datei.data[idx];
			// Datenfelder importieren
			for (let feld of Object.keys(data.ds)) {
				if (!data.ds[feld]) { // Datensatz ist leer
					continue;
				}
				beleg.data[feld] = data.ds[feld];
			}
			// Datensatz als importiert markieren
			data.importiert = true;
			// Formular füllen
			beleg.formular(false);
			beleg.belegGeaendert(true);
			// Wort gefunden?
			// (nur überprüfen, wenn Belegtext importiert wurde;
			// bei BibTeX ist das nicht der Fall)
			if (beleg.data.bs) {
				belegImport.checkWort();
			}
		}
	},
	// DeReKo-Import: Datei parsen
	//   content = String
	//     (Inhalt der Datei)
	//   pfad = String
	//     (Pfad zur Datei)
	DeReKo (content, pfad) {
		// DeReKo-Datei?
		if (!/^© Leibniz-Institut für Deutsche Sprache, Mannheim/.test(content)) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Einlesen des Dateiinhalts ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">Datei stammt nicht aus COSMAS II</p>`,
			});
			return;
		}
		// Daten einlesen
		if (!belegImport.DeReKoLesen(content)) {
			return;
		}
		// Metadaten auffrischen
		belegImport.DateiMeta(pfad, "dereko");
		// Anzeige im Karteikartenformular auffrischen
		beleg.formularImportDatei("dereko");
		// Import-Fenster öffnen oder Daten direkt importieren
		belegImport.DateiImport();
	},
	// DeReKo-Import: Belege einlesen
	//   content = String
	//     (Inhalt der Datei)
	DeReKoLesen (content) {
		// Daten extrahieren
		let meta = content.match(/\nDatum\s+:.+?\n\n/s),
			belege = content.match(/\nBelege \(.+?_{5,}\n\n(.+)/s);
		// wichtige Daten nicht gefunden?
		let fehler = "";
		if (!meta || !meta[0]) {
			fehler = "Metadaten nicht gefunden";
		} else if (!belege || !belege[1]) {
			fehler = "Belege nicht gefunden";
		}
		if (fehler) {
			dialog.oeffnen({
				typ: "alert",
				text: `Beim Einlesen des Dateiinhalts ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${fehler}</p>`,
			});
			return false; // Einlesen fehlgeschlagen
		}
		// Daten analysieren
		belegImport.DeReKoLesenMeta(meta[0]);
		belegImport.DeReKoLesenBelege(belege[1].trim());
		return true; // Einlesen erfolgreich
	},
	// DeReKo-Import: Metadaten parsen
	//   meta = String
	//     (Metadaten zum Export, die für alle Belege gelten)
	DeReKoLesenMeta (meta) {
		belegImport.Datei.meta = "";
		let daten = ["Datum", "Archiv", "Korpus", "Suchanfrage"];
		for (let d of daten) {
			let reg = new RegExp(`(${d})\\s*:(.+)`),
				treffer = meta.match(reg);
			if (treffer && treffer.length === 3) {
				belegImport.Datei.meta += `\n${treffer[1]}:${treffer[2]}`;
			}
		}
	},
	// DeReKo-Import: Belege parsen
	//   belege = String
	//     (die exportierte Belegreihe)
	DeReKoLesenBelege (belege) {
		// Zwischenspeicher zurücksetzen
		belegImport.Datei.data = [];
		// Zeilen analysieren
		let regId = "[a-zA-Z0-9]+?\\/[a-zA-Z0-9]+?\\.[0-9]+?\\s",
			regQuVor = new RegExp(`^(${regId})(.+)`),
			regQuNach = new RegExp(`\\s\\((${regId})(.+)\\)$`),
			regQuNachId = new RegExp(`\\s\\(${regId}`),
			id = "",
			quelle = "",
			beleg = [];
		for (let zeile of belege.split("\n")) {
			if (!zeile) { // Leerzeile
				pushBeleg();
				continue;
			}
			// vorangestellte Quelle
			if (regQuVor.test(zeile)) {
				let match = zeile.match(regQuVor);
				id = match[1];
				quelle = match[2];
				continue;
			}
			// nachgestellte Quelle
			if (regQuNach.test(zeile)) {
				let match = zeile.match(regQuNach);
				id = match[1];
				quelle = match[2];
				zeile = zeile.split(regQuNachId)[0];
			}
			beleg.push(zeile.replace(/<B>|<\/B*>/g, "").trim());
		}
		pushBeleg();
		// Beleg pushen
		function pushBeleg () {
			if (!quelle || !beleg.length) {
				return;
			}
			// Datensatz füllen
			let data = {
				importiert: false,
				ds: {
					au: "N. N.", // Autor
					bs: beleg.join("\n\n"), // Beleg
					bx: `${id}${quelle}\n\n${beleg.join("\n")}`, // Original
					da: "", // Belegdatum
					kr: "IDS-Archiv", // Korpus
					no: belegImport.Datei.meta, // Notizen
					qu: quelle.replace(/\s\[Ausführliche Zitierung nicht verfügbar\]/, ""), // Quellenangabe
					ts: "", // Textsorte
				},
			};
			let autor = quelle.split(":"),
				kommata = autor[0].match(/,/g),
				illegal = /[0-9.;!?]/.test(autor[0]);
			if (!illegal && (/[^\s]+/.test(autor[0]) || kommata <= 1)) {
				data.ds.au = autor[0];
			}
			data.ds.da = xml.datum(quelle);
			if (/\[Tageszeitung\]/.test(quelle)) {
				data.ds.ts = "Zeitung: Tageszeitung";
				data.ds.qu = quelle.replace(/,*\s*\[Tageszeitung\]/g, "");
			}
			if (!/\.$/.test(data.ds.qu)) {
				data.ds.qu += ".";
			}
			belegImport.Datei.data.push(data);
			// Beleg-Daten zurücksetzen
			id = "";
			quelle = "";
			beleg = [];
		}
	},
	// BibTeX-Import: Datei parsen
	//   content = String
	//     (Inhalt der Datei)
	BibTeX (content) {
		
	},
	// überprüft, ob das Wort im importierten Text gefunden wurde;
	// außerdem gibt es die Möglichkeit, sich die Textposition der Wörter
	// zurückgeben zu lassen (wird für das Datei-Import-Fenster gebraucht)
	//   bs = String || undefined
	//     (Belegtext, der überprüft werden soll)
	//   pos = true || undefined
	//     (Position der Treffer soll zurückgegeben werden)
	checkWort (bs = beleg.data.bs, pos = false) {
		if ( !pos && (!bs || !optionen.data.einstellungen["wort-check"]) ) {
			return;
		}
		let positionen = []; // sammelt die Trefferpositionen (wenn gewünscht)
		for (let i of helfer.formVariRegExpRegs) {
			if (data.fv[i.wort].ma) { // diese Variante nur markieren => hier nicht berücksichtigen
				continue;
			}
			let reg;
			if (!data.fv[i.wort].tr) { // nicht trunkiert
				reg = new RegExp(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`, "gi");
			} else { // trunkiert
				reg = new RegExp(i.reg, "gi");
			}
			let check = reg.test(bs);
			if (!pos && !check) {
				dialog.oeffnen({
					typ: "alert",
					text: "Das Karteiwort wurde im gerade importierten Belegtext nicht gefunden.",
					callback: () => {
						document.getElementById("beleg-dta").focus();
					},
				});
				break;
			} else if (pos && check) {
				positionen.push(reg.lastIndex);
			}
		}
		// Trefferpositionen zurückgeben (wenn gewünscht)
		if (pos) {
			return positionen;
		}
	},
};
