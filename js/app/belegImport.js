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
		if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.kr || beleg.data.ts || beleg.data.qu) {
			dialog.oeffnen({
				typ: "confirm",
				text: "Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Korpus, Textsorte</i> und <i>Quelle</i> werden beim Importieren der Textdaten aus dem DTA überschrieben.\nMöchten Sie den DTA-Import wirklich starten?",
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
						}
						belegImport.DTAData.seite_zuletzt = n;
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
		belegImport.DTACheck();
	},
	// DTA-Import: überprüft, ob das Wort im importierten Text gefunden wurde
	DTACheck () {
		if (!beleg.data.bs || !optionen.data.einstellungen["wort-check"]) {
			return;
		}
		for (let i of helfer.formVariRegExpRegs) {
			if (data.fv[i.wort].ma) { // diese Variante nur markieren => hier nicht berücksichtigen
				continue;
			}
			let reg;
			if (!data.fv[i.wort].tr) { // nicht trunkiert
				reg = new RegExp(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`, "i");
			} else { // trunkiert
				reg = new RegExp(i.reg, "i");
			}
			if (!reg.test(beleg.data.bs)) {
				dialog.oeffnen({
					typ: "alert",
					text: "Das Karteiwort wurde im gerade importierten Belegtext nicht gefunden.",
					callback: () => {
						document.getElementById("beleg-dta").focus();
					},
				});
				break;
			}
		}
	},
};
