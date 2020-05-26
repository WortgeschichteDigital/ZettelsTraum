"use strict";

let belegImport = {
	// DTA-Import: Daten, die importiert wurden
	DTAData: {},
	// DTA-Import: Datenobjekt zurücksetzen
	DTAResetData () {
		belegImport.DTAData = {
			autor: [],
			hrsg: [],
			titel: [],
			untertitel: [],
			band: "",
			auflage: "",
			ort: [],
			verlag: "",
			datum_druck: "",
			datum_entstehung: "",
			spalte: false,
			seiten: "",
			seite: "",
			seite_zuletzt: "",
			zeitschrift: "",
			zeitschrift_jg: "",
			zeitschrift_h: "",
			serie: "",
			serie_bd: "",
			beleg: "",
			textsorte: [],
			textsorte_sub: [],
			url: "",
		};
	},
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
		if (!/^https?:\/\//.test(url)) {
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
		if (!/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
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
			belegImport.DTAResetData();
			belegImport.DTAData.url = `http://www.deutschestextarchiv.de/${titel_id}/${fak}`;
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
		if (/\/(show|view)\//.test(url)) {
			m = /\/(show|view)\/(?<titel_id>[^/?]+)/.exec(url);
		} else {
			m = /deutschestextarchiv\.de\/(?<titel_id>[^/?]+)/.exec(url);
		}
		if (m && m.groups.titel_id) {
			titel_id = m.groups.titel_id;
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
				let text = ajax.responseText.replace(/ xmlns=".+?"/, ""); // da habe ich sonst Probleme mit evaluate() in belegImport.DTAMeta()
				let parser = new DOMParser(),
					xmlDoc = parser.parseFromString(text, "text/xml");
				belegImport.DTAMeta(xmlDoc);
				belegImport.DTAText(xmlDoc, fak);
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
			text: `Beim Download der Textdaten aus dem DTA ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${fehlertyp}`,
			callback: () => {
				let dta = document.getElementById("beleg-dta");
				dta.select();
			},
		});
	},
	// DTA-Import: Meta-Daten des Titels importieren
	//   xmlDoc = Document
	//     (entweder das komplette Buch, aus dem eine Seite importiert
	//     werden soll [enthält auch den TEI-Header], oder ein XML-Dokument,
	//     das allein die TEI-Header des Buchs umfasst)
	DTAMeta (xmlDoc) {
		let evaluator = xpath => {
			return xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);
		};
		let dta = belegImport.DTAData;
		// Personen
		let personen = {
			autor: evaluator("//biblFull/titleStmt/author/persName"),
			hrsg: evaluator("//biblFull/titleStmt/editor/persName"),
		};
		for (let [k, v] of Object.entries(personen)) {
			let item = v.iterateNext();
			while (item) {
				let vorname = item.querySelector("forename"),
					nachname = item.querySelector("surname"),
					addName = item.querySelector("addName"); // in <addName> steht häufig der ganze Name nach dem Muster "Vorname Nachname"; dafür fehlen <forname> und <surname>
				if (nachname) {
					let name = [trimmer(nachname.textContent)];
					if (vorname) {
						name.push(trimmer(vorname.textContent));
					}
					dta[k].push(name.join(", "));
				} else if (addName) {
					dta[k].push(trimmer(addName.textContent));
				}
				item = v.iterateNext();
			}
		}
		// normale Werte
		let werte = {
			titel: evaluator("//biblFull/titleStmt/title[@type='main']"),
			untertitel: evaluator("//biblFull/titleStmt/title[@type='sub']"),
			band: evaluator("//biblFull/titleStmt/title[@type='volume']"),
			auflage: evaluator("//biblFull/editionStmt/edition"),
			ort: evaluator("//biblFull/publicationStmt/pubPlace"),
			verlag: evaluator("//biblFull/publicationStmt/publisher/name"),
			datum_druck: evaluator("//biblFull/publicationStmt/date[@type='publication']"),
			datum_entstehung: evaluator("//biblFull/publicationStmt/date[@type='creation']"),
		};
		for (let [k, v] of Object.entries(werte)) {
			let item = v.iterateNext();
			while (item) {
				if (Array.isArray(dta[k])) {
					dta[k].push(trimmer(item.textContent));
				} else {
					dta[k] = trimmer(item.textContent);
				}
				item = v.iterateNext();
			}
		}
		// Zeitschrift/Serie
		let istZeitschrift = false,
			zeitschriftEval = evaluator("//sourceDesc/bibl").iterateNext();
		if (/^JA?/.test(zeitschriftEval.getAttribute("type"))) {
			istZeitschrift = true;
		}
		let series = {
			titel: evaluator("//biblFull/seriesStmt/title"),
			bd_jg: evaluator("//biblFull/seriesStmt/biblScope[@unit='volume']"),
			heft: evaluator("//biblFull/seriesStmt/biblScope[@unit='issue']"),
			seiten: evaluator("//biblFull/seriesStmt/biblScope[@unit='pages']"),
		};
		let seriesTitel = [],
			item = series.titel.iterateNext();
		while (item) {
			seriesTitel.push(trimmer(item.textContent));
			item = series.titel.iterateNext();
		}
		if (istZeitschrift) { // Zeitschrift
			dta.zeitschrift = seriesTitel.join(". ");
			item = series.bd_jg.iterateNext();
			if (item) {
				dta.zeitschrift_jg = trimmer(item.textContent);
			}
			item = series.heft.iterateNext();
			if (item) {
				dta.zeitschrift_h = trimmer(item.textContent);
			}
			item = series.seiten.iterateNext();
			if (item) {
				dta.seiten = trimmer(item.textContent);
			}
		} else { // Serie
			dta.serie = seriesTitel.join(". ");
			item = series.bd_jg.iterateNext();
			if (item) {
				dta.serie_bd = trimmer(item.textContent);
			}
		}
		// Textsorte
		let textsorte = evaluator("//profileDesc//textClass/classCode");
		item = textsorte.iterateNext();
		while (item) {
			let scheme = item.getAttribute("scheme"),
				key = "";
			if (/main$/.test(scheme)) {
				key = "textsorte";
			} else if (/sub$/.test(scheme)) {
				key = "textsorte_sub";
			}
			if (key) {
				dta[key].push(trimmer(item.textContent));
			}
			item = textsorte.iterateNext();
		}
		// spezielle Trim-Funktion
		function trimmer (v) {
			v = v.replace(/\n/g, " "); // kommt mitunter mitten im Untertitel vor
			v = helfer.textTrim(v, true);
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
		let dta = belegImport.DTAData,
			datum_feld = dta.datum_entstehung;
		if (!datum_feld && dta.datum_druck) {
			datum_feld = dta.datum_druck;
		} else if (dta.datum_druck) {
			datum_feld += ` (Publikation von ${dta.datum_druck})`;
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
		beleg.data.qu = belegImport.DTAQuelle(true);
		// Formular füllen
		beleg.formular(false);
		beleg.belegGeaendert(true);
		// Wort gefunden?
		belegImport.checkWort();
	},
	// DTA-Import: Quelle zusammensetzen
	//   mitURL = Boolean
	//     (URL + Aufrufdatum sollen der Titelaufnahme angehängt werden)
	DTAQuelle (mitURL) {
		let dta = belegImport.DTAData,
			td = belegImport.makeTitleDataObject();
		td.autor = [...dta.autor];
		td.hrsg = [...dta.hrsg];
		td.titel = [...dta.titel];
		td.untertitel = [...dta.untertitel];
		if (dta.zeitschrift) {
			td.inTitel.push(dta.zeitschrift);
		}
		let regBand = new RegExp(helfer.escapeRegExp(dta.band));
		if (dta.band &&
				!dta.titel.some(i => regBand.test(i)) &&
				!dta.untertitel.some(i => regBand.test(i))) {
			td.band = dta.band;
		}
		td.auflage = dta.auflage;
		td.ort = [...dta.ort];
		td.verlag = dta.verlag !== "s. e." ? dta.verlag : "";
		td.jahrgang = dta.zeitschrift_jg;
		td.jahr = dta.datum_druck;
		if (!dta.datum_druck) {
			td.jahr = dta.datum_entstehung;
		} else {
			td.jahrZuerst = dta.datum_entstehung;
		}
		if (dta.zeitschrift_h && !dta.zeitschrift_jg) {
			td.jahrgang = dta.zeitschrift_h;
		} else if (dta.zeitschrift_h) {
			td.heft = dta.zeitschrift_h;
		}
		td.spalte = dta.spalte;
		td.seiten = dta.seiten;
		if (dta.seite) {
			td.seite = dta.seite.replace(/^0+/, ""); // ja, das gibt es
			if (dta.seite_zuletzt && dta.seite_zuletzt !== dta.seite) {
				td.seite += `–${dta.seite_zuletzt.replace(/^0+/, "")}`;
			}
		}
		td.serie = dta.serie;
		td.serieBd = dta.serie_bd;
		td.url.push(dta.url);
		return belegImport.makeTitle({td, mitURL});
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
		regional: {
			kr: "DWDS: ZDL-Regionalkorpus",
			ts: "Zeitung",
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
	// DWDS-Import: Daten parsen
	//   content = String || Object
	//     (die Daten; String, bei Datei-Daten; Object bei XML-Daten)
	//   pfad = String
	//     (die Pfadangabe)
	//   autoImport = false || undefined
	//     (nach dem Parsen soll ein automatischer Import angestoßen werden)
	DWDS (content, pfad, autoImport = true) {
		// Daten überprüfen
		let xml, json;
		if (helfer.checkType("Object", content)) {
			xml = content;
		} else {
			try {
				json = JSON.parse(content);
				if (!belegImport.DWDSJSONCheck(json)) {
					return false;
				}
			} catch {}
		}
		// keine korrekten Daten gefunden
		if (!xml && !json) {
			return false;
		}
		// Daten einlesen
		if (xml) {
			belegImport.DWDSLesenXML(xml);
		} else if (json) {
			belegImport.DWDSLesenJSON(json);
		}
		// Metadaten auffrischen
		belegImport.DateiMeta(pfad, "dwds");
		// Anzeige im Karteikartenformular auffrischen
		beleg.formularImportDatei("dwds");
		// Import-Fenster öffnen oder Daten direkt importieren
		if (autoImport) {
			belegImport.DateiImport();
		}
		return true;
	},
	// DWDS-Import: einen leeren Datensatz erzeugen
	DWDSDatensatz () {
		let data = belegImport.DateiDatensatz();
		data.ds.au = "N. N.";
		data.ds.kr = "DWDS";
		return data;
	},
	// DWDS-Import: XML-Daten einlesen
	//   clipboard = String
	//     (Clipboard-Content)
	//   xml = Document
	//     (das geparste XML-Dokument)
	//   returnResult = true || undefined
	//     (das Ergebnis der Analyse soll nicht in den Datei-Zwischenspeicher
	//     geschrieben, sondern direkt zurückgegeben werden)
	DWDSLesenXML ({clipboard, xml, returnResult = false}) {
		// Datenobjekt erzeugen
		let data;
		if (returnResult) {
			data = belegImport.DWDSDatensatz().ds;
		} else {
			belegImport.Datei.meta = "";
			belegImport.Datei.data = [belegImport.DWDSDatensatz()];
			data = belegImport.Datei.data[0].ds;
		}
		// Datensatz: Datum
		let nDa = xml.querySelector("Fundstelle Datum");
		if (nDa && nDa.firstChild) {
			data.da = nDa.firstChild.nodeValue;
		}
		// Datensatz: Autor
		let nAu = xml.querySelector("Fundstelle Autor");
		if (nAu && nAu.firstChild) {
			data.au = belegImport.DWDSKorrekturen({
				typ: "au",
				txt: nAu.firstChild.nodeValue,
			});
		}
		// Datensatz: Beleg
		let nBs = xml.querySelector("Belegtext");
		if (nBs && nBs.firstChild) {
			let bs = [],
				bsContent = nBs.textContent.replace(/<Stichwort>(.+?)<\/Stichwort>/g, (m, p1) => p1);
			bsContent = belegImport.DWDSKorrekturen({
				typ: "bs",
				txt: bsContent,
			});
			for (let p of bsContent.split(/[\r\n]/)) {
				p = helfer.textTrim(p, true);
				if (!p) {
					continue;
				}
				bs.push(p);
			}
			data.bs = bs.join("\n\n");
		}
		// Datensatz: Beleg-XML
		data.bx = clipboard;
		// Datensatz: Quelle
		let nQu = xml.querySelector("Fundstelle Bibl");
		if (nQu && nQu.firstChild) {
			let nTitel = xml.querySelector("Fundstelle Titel"),
				nSeite = xml.querySelector("Fundstelle Seite"),
				nURL = xml.querySelector("Fundstelle URL"),
				nAuf = xml.querySelector("Fundstelle Aufrufdatum");
			let titeldaten = {
				titel: nTitel && nTitel.firstChild ? nTitel.firstChild.nodeValue : "",
				seite: nSeite && nSeite.firstChild ? nSeite.firstChild.nodeValue : "",
				url: nURL && nURL.firstChild ? nURL.firstChild.nodeValue : "",
				auf: nAuf && nAuf.firstChild ? nAuf.firstChild.nodeValue : "",
			};
			belegImport.DWDSKorrekturen({
				typ: "qu",
				txt: nQu.firstChild.nodeValue,
				data,
				titeldaten,
			});
		}
		// Datensatz: Korpus
		let korpus = "",
			nKr = xml.querySelector("Fundstelle Korpus");
		if (nKr && nKr.firstChild) {
			korpus = nKr.firstChild.nodeValue;
			if (/^dta/.test(korpus)) {
				korpus = "dta";
			}
			if (belegImport.DWDSKorpora[korpus]) { // Korpus könnte noch nicht in der Liste sein
				data.kr = belegImport.DWDSKorpora[korpus].kr;
			}
		}
		// Datensatz: Textsorte
		let nTs = xml.querySelector("Fundstelle Textklasse");
		if (korpus &&
				belegImport.DWDSKorpora[korpus] &&
				belegImport.DWDSKorpora[korpus].ts) {
			data.ts = belegImport.DWDSKorpora[korpus].ts;
		} else if (nTs && nTs.firstChild) {
			data.ts = belegImport.DWDSKorrekturen({
				typ: "ts",
				txt: nTs.firstChild.nodeValue,
			});
		}
		// Datensatz: Notizen
		let nDok = xml.querySelector("Fundstelle Dokument");
		if (nDok && nDok.firstChild) {
			data.no = belegImport.DWDSKorrekturen({
				typ: "no",
				txt: nDok.firstChild.nodeValue,
				korpus
			});
		}
		// ggf. Datensatz direkt zurückgeben
		if (returnResult) {
			return data;
		}
	},
	// DWDS-Import: JSON-Daten einlesen
	//   json = Object
	//     (die JSON-Daten der Belege)
	DWDSLesenJSON (json) {
		// Zwischenspeicher zurücksetzen
		belegImport.Datei.meta = "";
		belegImport.Datei.data = [];
		// Datensätze parsen
		for (let i of json) {
			// Datensatz vorbereiten
			let data = belegImport.DWDSDatensatz();
			belegImport.Datei.data.push(data);
			// Datensatz: Datum
			if (i.meta_.date_) {
				data.ds.da = i.meta_.date_;
				if (/-12-31$/.test(data.ds.da) && i.meta_.pageRange) {
					data.ds.da = data.ds.da.replace(/-.+/, "");
				}
			}
			// Datensatz: Autor
			if (i.meta_.author) {
				data.ds.au = belegImport.DWDSKorrekturen({
					typ: "au",
					txt: i.meta_.author,
				});
			}
			// Datensatz: Beleg
			let bs = [];
			for (let s of i.ctx_) {
				let satz = "";
				if (helfer.checkType("String", s)) {
					satz = s;
				} else {
					for (let w of s) {
						if (w.ws === "1") {
							satz += " ";
						}
						satz += w.w;
					}
				}
				satz = helfer.textTrim(satz, true);
				satz = belegImport.DWDSKorrekturen({
					typ: "bs",
					txt: satz,
				});
				bs.push(satz);
			}
			data.ds.bs = bs.join("\n\n");
			// Datensatz: Quelle
			if (i.meta_.bibl) {
				let titeldaten = {
					titel: i.meta_.title ? i.meta_.title : "",
					seite: i.meta_.page_ ? i.meta_.page_ : "",
					url: i.meta_.url ? i.meta_.url : "",
					auf: i.meta_.urlDate ? i.meta_.urlDate : "",
				};
				if (/^dta/.test(i.collection) &&
						!titeldaten.url &&
						i.meta_.basename &&
						i.matches[0] &&
						i.matches[0].page) {
					titeldaten.url = `http://www.deutschestextarchiv.de/${i.meta_.basename}/${i.matches[0].page}`;
				}
				belegImport.DWDSKorrekturen({
					typ: "qu",
					txt: i.meta_.bibl,
					data: data.ds,
					titeldaten,
				});
			}
			// Datensatz: Korpus
			let korpus = "";
			if (i.collection) {
				korpus = i.collection;
				if (/^dta/.test(i.collection)) {
					korpus = "dta";
				}
				if (belegImport.DWDSKorpora[korpus]) { // Korpus könnte noch nicht in der Liste sein
					data.ds.kr = belegImport.DWDSKorpora[korpus].kr;
				}
			}
			// Datensatz: Textsorte
			if (korpus &&
					belegImport.DWDSKorpora[korpus] &&
					belegImport.DWDSKorpora[korpus].ts) {
				data.ds.ts = belegImport.DWDSKorpora[korpus].ts;
			} else if (i.textclass) {
				data.ds.ts = belegImport.DWDSKorrekturen({
					typ: "ts",
					txt: i.textclass,
				});
			}
			// Datensatz: Notizen
			if (i.meta_.basename) {
				data.ds.no = belegImport.DWDSKorrekturen({
					typ: "no",
					txt: i.meta_.basename,
					korpus
				});
			}
			// Datensatz: Beleg-XML
			let xmlTxt = "<Beleg>";
			xmlTxt += `<Belegtext>${data.ds.bs}</Belegtext>`;
			xmlTxt += "<Fundstelle>";
			if (i.meta_.urlDate) {
				xmlTxt += `<Aufrufdatum>${i.meta_.urlDate}</Aufrufdatum>`;
			}
			if (i.meta_.author) {
				xmlTxt += `<Autor>${i.meta_.author}</Autor>`;
			}
			if (i.meta_.bibl) {
				xmlTxt += `<Bibl>${i.meta_.bibl}</Bibl>`;
			}
			if (data.ds.da) {
				xmlTxt += `<Datum>${data.ds.da}</Datum>`;
			}
			if (i.meta_.basename) {
				xmlTxt += `<Dokument>${i.meta_.basename}</Dokument>`;
			}
			if (i.collection) {
				xmlTxt += `<Korpus>${i.collection}</Korpus>`;
			}
			if (i.meta_.page_) {
				xmlTxt += `<Seite>${i.meta_.page_}</Seite>`;
			}
			if (i.textclass) {
				xmlTxt += `<Textklasse>${i.textclass}</Textklasse>`;
			}
			if (i.meta_.title) {
				xmlTxt += `<Titel>${i.meta_.title}</Titel>`;
			}
			if (i.meta_.url) {
				xmlTxt += `<URL>${i.meta_.url}</URL>`;
			}
			xmlTxt += "</Fundstelle></Beleg>";
			let parser = new DOMParser(),
				xmlDoc = parser.parseFromString(xmlTxt, "text/xml"),
				xmlDocIndent = xml.indent(xmlDoc);
			data.ds.bx = new XMLSerializer().serializeToString(xmlDocIndent);
		}
	},
	// DWDS-Import: Korrekturen
	//   typ = String
	//     (Datensatz)
	//   txt = String
	//     (Text)
	//   data = Object || undefined
	//     (Datenobjekt für Korrekturen, die nicht nur einen Datensatz betreffen)
	//   titeldaten = Object || undefined
	//     (ergänzende Titeldaten)
	//   korpus = String
	//     (das DWDS-Korpus)
	DWDSKorrekturen ({typ, txt, data, titeldaten, korpus}) {
		if (typ === "au") { // AUTOR
			// Autor-ID entfernen (bei Snippets aus dem DTA)
			txt = txt.replace(/\s\(#.+?\)/, "");
			// Autorname besteht nur aus Großbuchstaben, Leerzeichen und Kommata =>
			// wenigstens versuchen ein paar Kleinbuchstaben unterzubringen
			if (/^[A-ZÄÖÜ,\s]+$/.test(txt)) {
				let klein = "";
				txt.split(/\s/).forEach((i, n) => {
					if (n > 0) {
						klein += " ";
					}
					klein += i.substring(0, 1) + i.substring(1).toLowerCase();
				});
				txt = klein;
			}
			// verschiedene Verbesserungen
			txt = txt.replace(/^[!?.,;: ]+/, ""); // Satz- und Leerzeichen am Anfang entfernen (kommt wirklich vor!)
			txt = txt.replace(/\s\/\s/g, "/"); // Leerzeichen um Slashes entfernen
			txt = txt.replace(/^Von /, ""); // häufig wird die Autorangabe "Von Karl Mustermann" fälschlicherweise als kompletter Autor angegeben
			// Autorname eintragen
			if (/^(Name|Nn|o\.\s?A\.|unknown)$/.test(txt)) { // merkwürdige Platzhalter für "Autor unbekannt"
				return "N. N.";
			} else if (!/[A-ZÄÖÜ]/.test(txt)) { // Autorname ist nur ein Kürzel
				return `N. N. [${txt}]`;
			}
			let leerzeichen = txt.match(/\s/g);
			if (!/,\s/.test(txt) && leerzeichen && leerzeichen.length === 1) {
				let txtSp = txt.split(/\s/);
				return `${txtSp[1]}, ${txtSp[0]}`;
			}
			return txt;
		} else if (typ === "bs") { // BELEG
			return txt.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		} else if (typ === "qu") { // QUELLE
			data.qu = txt;
			// eine Verrenkung wegen der häufig merkwürdigen Zitierweise
			data.qu = data.qu.replace(/ Zitiert nach:.+/, "");
			let jahrDatierung = data.da.match(/[0-9]{4}/),
				jahrQuelle = data.qu.matchAll(/(?<!S. )(?<![0-9])([0-9]{4})/g),
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
				const idx = data.qu.lastIndexOf("" + quelle);
				data.qu = data.qu.substring(0, idx) + publikation + data.qu.substring(idx + 4);
			}
			// ggf. Autor + Titel ergänzen
			if (titeldaten.titel) {
				let titel = titeldaten.titel;
				if (/^o\.\s?T\.$|^Jahrbuch des Schweizer Alpen-Clubs/.test(titel)) {
					titel = "";
				}
				if (titel && !data.qu.includes(titel)) {
					let qu = data.qu;
					data.qu = `${data.au}: ${titel}`;
					if (!/\.$/.test(data.qu)) {
						data.qu += ".";
					}
					data.qu += ` In: ${qu}`;
				}
			}
			// ggf. "o. A." am Anfang der Quellenangabe ersetzen
			if (/^o\.\s?A\./.test(data.qu)) {
				data.qu = data.qu.replace(/^o\.\s?A\./, "N. N.");
			}
			// ggf. Seite ergänzen
			if (titeldaten.seite) {
				if (!data.qu.includes(`S. ${titeldaten.seite}`)) {
					if (/\.$/.test(data.qu)) {
						data.qu = data.qu.substring(0, data.qu.length - 1);
					}
					data.qu += `, S. ${titeldaten.seite}`;
				}
			}
			// ggf. Punkt am Ende der Quellenangabe ergänzen
			if (!/\.$/.test(data.qu)) {
				data.qu += ".";
			}
			// Tagesdaten ggf. aufhübschen
			let datum = data.qu.match(/(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})/);
			if (datum) {
				let reg = new RegExp(helfer.escapeRegExp(datum[0]));
				data.qu = data.qu.replace(reg, `${datum.groups.tag.replace(/^0/, "")}. ${datum.groups.monat.replace(/^0/, "")}. ${datum.groups.jahr}`);
			}
			// typographische Verbesserungen
			let von_bis = data.qu.match(/[0-9]+\s?-\s?[0-9]+/g);
			if (von_bis) {
				for (let i of von_bis) {
					let huebsch = i.replace(/\s?-\s?/, "–");
					data.qu = data.qu.replace(i, huebsch);
				}
			}
			// ggf. URL ergänzen
			if (titeldaten.url) {
				data.qu += `\n\n${titeldaten.url}`;
				// Aufrufdatum ergänzen
				if (titeldaten.auf) {
					data.qu += ` (Aufrufdatum: ${titeldaten.auf})`;
				} else {
					let heute = new Date();
					data.qu += ` (Aufrufdatum: ${heute.getDate()}. ${heute.getMonth() + 1}. ${heute.getFullYear()})`;
				}
			}
			// Steht in der Quellenangabe der Autor in der Form "Nachname, Vorname",
			// im Autor-Feld aber nicht?
			let auQu = data.qu.split(": ");
			if (/, /.test(auQu[0]) && !/, /.test(data.au)) {
				let autorQu = auQu[0].replace(/,/g, "").split(/\s/),
					autorAu = data.au.split(/\s/);
				if (auQu[0] !== data.au &&
						autorQu.length === autorAu.length) {
					let autorAendern = true;
					for (let i of autorAu) {
						if (!autorQu.includes(i)) {
							autorAendern = false;
							break;
						}
					}
					if (autorAendern) {
						data.au = auQu[0];
					}
				}
			}
			// Steht im Autor-Feld kein Name, in der Quelle scheint aber einer zu sein?
			if ((!data.au || /^N.\sN./.test(data.au)) && auQu.length > 1) {
				data.au = auQu[0];
			}
		} else if (typ === "ts") { // TEXTSORTE
			if (!/::/.test(txt)) {
				return txt.split(":")[0];
			}
			let ts = "",
				tsSp = txt.split("::");
			for (let i = 0, len = tsSp.length; i < len; i++) {
				let tsClean = helfer.textTrim(tsSp[i], true);
				if (!tsClean || /^[A-ZÄÖÜ]{2,}/.test(tsClean)) {
					continue;
				}
				if (i > 0) {
					ts += ": ";
				}
				ts += tsClean;
			}
			return ts;
		} else if (typ === "no") { // NOTIZEN
			if (korpus) {
				let wort = kartei.wort.replace(/\s/g, " && "),
					query = encodeURIComponent(`${wort} #HAS[basename,'${txt}']`),
					ersteZeile = "\n";
				if (optionen.data.einstellungen["notizen-zeitung"] &&
						belegImport.DWDSKorpora[korpus] &&
						belegImport.DWDSKorpora[korpus].ts === "Zeitung") {
					ersteZeile = `${belegImport.DWDSKorpora[korpus].kr.split(": ")[1]}\n\n`;
				}
				return `${ersteZeile}Beleg im DWDS: https://www.dwds.de/r?format=max&q=${query}&corpus=${korpus}`;
				// 1. Zeile frei lassen; hier werden mitunter Notizen der BearbeiterIn eingetragen,
				// die in der Belegliste angezeigt werden sollen
			}
			return `\n${txt}`;
			// 1. Zeile dito
		}
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
			return false;
		}
		// Daten beginnen nicht mit <Beleg>
		if (!/^<Beleg>/.test(cp)) {
			return false;
		}
		// XML nicht wohlgeformt
		let parser = new DOMParser(),
			xmlDoc = parser.parseFromString(cp, "text/xml");
		if (xmlDoc.querySelector("parsererror")) {
			return false;
		}
		// kein <Korpus>
		if (!xmlDoc.querySelector("Fundstelle Korpus")) {
			return false;
		}
		// korrektes XML-Dokument
		return {
			clipboard: cp,
			xml: xmlDoc,
		};
	},
	// DWDS-Import: überprüft, ob die geladen Datei ein DWDS-JSON-Export ist
	//   json = Object || Array
	//     (JSON-Daten)
	DWDSJSONCheck (json) {
		if (!json[0] || !json[0].ctx_ || !json[0].meta_) {
			return false;
		}
		return true;
	},
	// Datei-Import: speichert die Daten der geladenen Datei zwischen
	Datei: {
		pfad: "", // Pfad zur Datei
		typ: "", // Typ der Datei (dwds || dereko || bibtex)
		meta: "", // Metadaten für alle Belege in belegImport.Datei.data
		data: [], // Daten der Datei; s. pushBeleg()
	},
	// Datei-Import: Zwischenspeicher und Importformular zurücksetzen
	DateiReset () {
		let datei = belegImport.Datei,
			typ = datei.typ;
		// Zwischenspeicher zurücksetzen
		for (let k of Object.keys(datei)) {
			if (Array.isArray(datei[k])) {
				datei[k] = [];
			} else {
				datei[k] = "";
			}
		}
		// Formular zurücksetzen
		beleg.formularImport(typ);
	},
	// Datei-Import: einen leeren Datensatz erzeugen
	DateiDatensatz () {
		return {
			importiert: false,
			ds: {
				au: "", // Autor
				bs: "", // Beleg
				bx: "", // Original
				da: "", // Belegdatum
				kr: "", // Korpus
				no: "", // Notizen
				qu: "", // Quellenangabe
				ts: "", // Textsorte
			},
		};
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
		if (document.getElementById("beleg-import-dwds").checked) {
			opt.filters.push({
				name: `JSON-Datei`,
				extensions: ["json"],
			});
		} else if (document.getElementById("beleg-import-dereko").checked) {
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
				// sollten DWDS- oder BibTeX-Daten in der Zwischenablage sein => Zwischenablage leeren
				const {clipboard} = require("electron"),
					cp = clipboard.readText();
				if (belegImport.DWDSXMLCheck(cp) ||
						belegImport.BibTeXCheck(cp)) {
					clipboard.clear();
				}
				// Datei-Inhalt importieren
				if (document.getElementById("beleg-import-dwds").checked) {
					belegImport.DWDS(content, result.filePaths[0]);
				} else if (document.getElementById("beleg-import-dereko").checked) {
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
	//     (Typ der Datei, also dwds || dereko || bibtex)
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
		// Clipboard-Content schlägt Datei-Content
		const {clipboard} = require("electron"),
			cp = clipboard.readText();
		let importTypAktiv = "dereko";
		if (document.getElementById("beleg-import-dwds").checked) {
			importTypAktiv = "dwds";
			let xml = belegImport.DWDSXMLCheck(cp);
			if (xml) {
				belegImport.DWDS(xml, "– Zwischenablage –", false);
			}
		} else if (document.getElementById("beleg-import-bibtex").checked) {
			importTypAktiv = "bibtex";
			if (belegImport.BibTeXCheck(cp)) {
				belegImport.BibTeX(cp, "– Zwischenablage –", false);
			}
		}
		// keine Daten vorhanden => Meldung + Abbruch
		if (!belegImport.Datei.data.length ||
				belegImport.Datei.typ !== importTypAktiv) {
			dialog.oeffnen({
				typ: "alert",
				text: "Es wurden noch keine Datensätze geladen, die importiert werden könnten.",
				callback: () => {
					document.getElementById("beleg-datei-oeffnen").focus();
				},
			});
			return;
		}
		// direkt importieren oder Importfenster öffnen
		if (belegImport.Datei.data.length === 1) {
			// nur ein Datensatz vorhanden => direkt importieren
			belegImport.DateiImportAusfuehren(0);
		} else {
			// mehrere Datensätze vorhanden => Importfenster öffnen
			belegImport.DateiImportFenster();
		}
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
			autorenVorhanden = false,
			belegeVorhanden = false,
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
			} else {
				autorenVorhanden = true;
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
			belegeVorhanden = true;
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
		if (!autorenVorhanden) {
			table.classList.add("keine-autoren");
		}
		if (!belegeVorhanden) {
			table.classList.add("keine-belege");
		}
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
				belegImport.DateiImportFensterSchliessen();
				setTimeout(() => {
					let idx = parseInt(this.dataset.idx, 10);
					belegImport.DateiImportAusfuehren(idx);
				}, 200); // 200ms Zeit lassen, um das Overlay-Fenster zu schließen
			});
		}
	},
	// Datei-Import: schließt das Importfenster und fokussiert den Import-Button
	DateiImportFensterSchliessen () {
		overlay.ausblenden(document.getElementById("import"));
		document.getElementById("beleg-datei-importieren").focus();
	},
	// Datei-Import: Import ausführen
	//   idx = Number
	//     (der Index in belegImport.Datei.data, der importiert werden soll)
	async DateiImportAusfuehren (idx) {
		// Kann und soll der Beleg direkt aus dem DTA importiert werden?
		if (await belegImport.DateiImportDTA(idx)) {
			return;
		}
		// Ist die Kartei schon ausgefüllt?
		let feldnamen = {
			da: "Datum",
			au: "Autor",
			bs: "Beleg",
			qu: "Quelle",
			kr: "Korpus",
			ts: "Textsorte",
			no: "Notizen",
		};
		let karteGefuellt = false,
			felderGefuellt = new Set();
		for (let [k, v] of Object.entries(belegImport.Datei.data[idx].ds)) {
			if (k === "bx") {
				continue;
			}
			if (v && beleg.data[k]) {
				felderGefuellt.add(feldnamen[k]);
				karteGefuellt = true;
			}
		}
		if (karteGefuellt) {
			// Feldnamen für die Anzeige vorbereiten
			let felder = [...felderGefuellt],
				felderFolge = Object.values(feldnamen);
			felder.sort((a, b) => felderFolge.indexOf(a) - felderFolge.indexOf(b));
			let felderTxt= felder.join(", ").replace(/, ([a-zA-Z]+)$/, (m, p1) => `</i> und <i>${p1}`),
				numerus = ["Die Felder", "werden"];
			if (felder.length === 1) {
				numerus = ["Das Feld", "wird"];
			}
			// Meldung anzeigen
			dialog.oeffnen({
				typ: "confirm",
				text: `Die Karteikarte ist teilweise schon gefüllt.\n${numerus[0]} <i>${felderTxt}</i> ${numerus[1]} beim Importieren der geladenen Daten überschrieben.\nMöchten Sie den Import wirklich starten?`,
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
	// DTA-Import bevorzugen?
	//   idx = Number
	//     (der Index in belegImport.Datei.data, der importiert werden soll)
	DateiImportDTA (idx) {
		return new Promise(resolve => {
			let ds = belegImport.Datei.data[idx].ds;
			// Beleg wohl nicht aus DTA
			if (!/https?:\/\/www\.deutschestextarchiv\.de\//.test(ds.qu)) {
				resolve(false);
				return;
			}
			// Beleg wohl aus DTA
			if (optionen.data.einstellungen["dta-bevorzugen"]) {
				dtaImport();
				resolve(true);
				return;
			}
			dialog.oeffnen({
				typ: "confirm",
				text: "Der Beleg stammt offenbar aus dem DTA.\nMöchten Sie ihn nicht lieber direkt aus dem DTA importieren?",
				callback: () => {
					if (dialog.antwort) {
						// DTA-Import anstoßen => Import des DWDS-Snippets unterbinden
						dtaImport();
						resolve(true);
					} else {
						// DWDS-Snippet importieren
						resolve(false);
					}
				},
			});
			document.getElementById("dialog-text").appendChild(optionen.shortcut("DTA-Import künftig ohne Nachfrage anstoßen", "dta-bevorzugen"));
			// DTA-Import anstoßen
			function dtaImport () {
				let url = liste.linksErkennen(ds.qu).match(/href="([^"]+\.deutschestextarchiv\.de\/.+?)"/)[1],
					dtaFeld = document.getElementById("beleg-dta");
				dtaFeld.value = url;
				const fak = belegImport.DTAGetFak(url, "");
				if (fak) {
					dtaFeld.nextSibling.value = parseInt(fak, 10) + 1;
				}
				beleg.formularImport("dta");
				belegImport.DTA();
			}
		});
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
	// Form der ID eines DeReKo-Belegs
	DeReKoId: "[a-zA-Z0-9]+?\\/[a-zA-Z0-9]+?\\.[0-9]+?\\s",
	// DeReKo-Import: Belege parsen
	//   belege = String
	//     (die exportierte Belegreihe)
	DeReKoLesenBelege (belege) {
		// Zwischenspeicher zurücksetzen
		belegImport.Datei.data = [];
		// Zeilen analysieren
		let regQuVor = new RegExp(`^(${belegImport.DeReKoId})(.+)`),
			regQuNach = new RegExp(`\\s\\((${belegImport.DeReKoId})(.+)\\)$`),
			regQuNachId = new RegExp(`\\s\\(${belegImport.DeReKoId}`),
			id = "",
			quelle = "",
			beleg = [];
		for (let zeile of belege.split("\n")) {
			if (!zeile) { // Leerzeile
				pushBeleg();
				continue;
			}
			// Enteties auflösen
			zeile = zeile.replace(/&#(.+?);/g, (m, p1) => String.fromCharCode(p1));
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
			beleg.push(zeile.replace(/<B>|<\/B?>/g, "").trim());
		}
		pushBeleg();
		// Beleg pushen
		function pushBeleg () {
			if (!quelle || !beleg.length) {
				return;
			}
			// Datensatz füllen
			let data = belegImport.DateiDatensatz();
			data.ds.au = "N. N."; // Autor
			data.ds.bs = beleg.join("\n\n"); // Beleg
			data.ds.bx = `${id}${quelle}\n\n${beleg.join("\n")}`; // Original
			data.ds.kr = "IDS-Archiv"; // Korpus
			data.ds.no = belegImport.Datei.meta; // Notizen
			data.ds.qu = quelle.replace(/\s\[Ausführliche Zitierung nicht verfügbar\]/, ""); // Quellenangabe
			let autor = quelle.split(":"),
				kommata = autor[0].match(/,/g),
				illegal = /[0-9.;!?]/.test(autor[0]);
			if (!illegal && (/[^\s]+/.test(autor[0]) || kommata <= 1)) {
				data.ds.au = autor[0];
			}
			data.ds.da = xml.datum(quelle, false, true);
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
	//   pfad = String
	//     (Pfad zur Datei)
	//   autoImport = false || undefined
	//     (nach dem Parsen soll ein automatischer Import angestoßen werden)
	BibTeX (content, pfad, autoImport = true) {
		// Daten einlesen
		if (!belegImport.BibTeXLesen(content)) {
			return false;
		}
		// Metadaten auffrischen
		belegImport.DateiMeta(pfad, "bibtex");
		// Anzeige im Karteikartenformular auffrischen
		beleg.formularImportDatei("bibtex");
		// Import-Fenster öffnen oder Daten direkt importieren
		if (autoImport) {
			belegImport.DateiImport();
		}
		return true;
	},
	// BibTeX-Import: Content einer BibTeX-Datei fixen und normieren
	//   content = String
	//     (Inhalt der Datei)
	BibTeXFix (content) {
		let zeilen = [];
		for (let zeile of content.split(/\n/)) {
			if (/^[@\s}]/.test(zeile)) {
				zeile = zeile.replace(/^\s+/, "\t");
				if (zeile.trim()) {
					zeilen.push(zeile.trimEnd()); // da könnte noch ein \r drin sein
				}
				continue;
			}
			zeile = zeile.trim();
			if (!zeile) {
				continue; // Leerzeile
			}
			zeilen[zeilen.length - 1] += ` ${zeile}`;
		}
		return zeilen.join("\n");
	},
	// BibTeX-Import: Daten einlesen
	//   content = String
	//     (Inhalt der Datei)
	//   returnResult = true || undefined
	//     (es soll ein String zurückgegeben werden)
	BibTeXLesen (content, returnResult = false) {
		// Content fixen
		content = belegImport.BibTeXFix(content);
		// Zwischenspeicher der Titel
		let titel = [];
		// Daten parsen
		let item = {};
		for (let zeile of content.split(/\n/)) {
			// Ende des Datensatzes
			if (/^\}/.test(zeile)) {
				pushTitle();
				item = {};
				continue;
			}
			// Leerzeilen
			zeile = zeile.trim();
			if (!zeile) {
				continue;
			}
			// Startzeile
			if (/^@/.test(zeile)) {
				item.startzeile = zeile;
				continue;
			}
			// Zeile analysieren
			let kv = /^(?<key>[a-z]+)\s*=\s*[{"](?<value>.+)[}"],?$/.exec(zeile);
			if (!kv || !kv.groups.key || !kv.groups.value) {
				// da ist wohl was schiefgelaufen
				continue;
			}
			const key = kv.groups.key;
			if (!item[key]) {
				item[key] = [];
			}
			const val = kv.groups.value;
			if (/^(author|editor)$/.test(key)) {
				for (let i of val.split(/\sand\s/)) {
					item[key].push(belegImport.BibTeXSymbols(i));
				}
			} else {
				item[key].push(belegImport.BibTeXSymbols(val));
			}
		}
		// Daten in den Zwischenspeicher eintragen
		// (nur wenn welche vorhanden sind)
		if (titel.length) {
			if (returnResult) {
				return titel;
			}
			belegImport.Datei.meta = "";
			belegImport.Datei.data = titel;
			return true;
		}
		return false;
		// Titeldaten übertragen
		function pushTitle () {
			// Datensatz füllen
			let data = belegImport.DateiDatensatz();
			// Autor(en) ermitteln
			if (item.author) {
				data.ds.au = item.author.join("/");
			} else if (item.editor) {
				data.ds.au = `${item.editor.join("/")} (Hrsg.)`;
			} else {
				data.ds.au = "N. N.";
			}
			// Originaltitel rekonstruieren
			data.ds.bx = `${item.startzeile}\n`;
			for (let [k, v] of Object.entries(item)) {
				if (k === "startzeile") {
					continue;
				}
				for (let i of v) {
					data.ds.bx += `\t${k} = \{${i}\},\n`;
				}
			}
			data.ds.bx = data.ds.bx.substring(0, data.ds.bx.length - 2);
			data.ds.bx += `\n}`;
			// Datum
			if (item.year) {
				item.year.forEach((i, n) => item.year[n] = i.replace(/^\[|\]$/g, ""));
				data.ds.da = item.year.join("/");
			} else if (item.date) {
				item.date.forEach((i, n) => item.date[n] = i.replace(/^\[|\]$/g, ""));
				data.ds.da = item.date.join("/");
			}
			// Datensatz von GoogleBooks?
			if (item.url) {
				if (item.url.some(i => /books\.google/.test(i))) {
					data.ds.kr = "GoogleBooks";
				}
			}
			// Quellenangabe ermitteln
			let td = belegImport.makeTitleDataObject();
			if (item.author) {
				td.autor = [...item.author];
			}
			if (item.editor) {
				td.hrsg = [...item.editor];
			}
			if (item.title) {
				td.titel = [...item.title];
			} else if (item.booktitle) {
				td.titel = [...item.booktitle];
			} else if (item.shorttitle) {
				td.titel = [...item.shorttitle];
			} else {
				td.titel = ["[ohne Titel]"];
			}
			let istZeitschrift = false,
				istAbschnitt = false;
			if (item.title && item.booktitle) {
				td.inTitel = [...item.booktitle];
				istAbschnitt = true;
			} else if (item.title && (item.journal || item.journaltitle)) {
				if (item.journal) {
					td.inTitel = [...item.journal];
				} else if (item.journaltitle) {
					td.inTitel = [...item.journaltitle];
				}
				istZeitschrift = true;
				istAbschnitt = true;
			}
			if (item.volume) {
				if (istZeitschrift) {
					td.jahrgang = item.volume.join("/");
				} else {
					td.band = item.volume.join("/");
				}
			}
			if (item.edition) {
				td.auflage = item.edition.join("/");
			}
			if (item.school) {
				td.quali = item.school.join(", ");
			}
			if (item.location) {
				td.ort = [...item.location];
			} else if (item.address) {
				td.ort = [...item.address];
			}
			if (item.publisher) {
				td.verlag = item.publisher.join("/");
			}
			td.jahr = data.ds.da;
			if (item.number) {
				const heft = item.number.join("/"),
					bdStart = /^Bd\./.test(item.number); // BibTeX von GoogleBooks hat mitunter diesen Fehler
				if (bdStart && !istZeitschrift) {
					td.band = heft;
				} else if (!bdStart) {
					td.heft = heft;
				}
			}
			if (istAbschnitt && item.pages) {
				td.seiten = item.pages.join(", ");
			}
			if (item.series && item.series.join() !== td.titel.join()) {
				// BibTeX von GoogleBooks trägt mitunter den Romantitel in "series" ein
				td.serie = item.series.join(". ");
			}
			if (item.url) {
				td.url = [...item.url];
				td.url.sort(helfer.sortURL);
			}
			data.ds.qu = belegImport.makeTitle({
				td,
				mitURL: true,
			});
			// Datensatz pushen
			titel.push(data);
		}
	},
	// BibTeX-Import: Helferfunktion zum Auflösen von BibTeX-Symbolen
	// (die tauchen noch in den Dateien von GoogleBooks auf)
	//   text = String
	//     (Textzeile, in der die Symbole aufgelöst werden sollen)
	BibTeXSymbols (text) {
		// das scheint der Standard zu sein: \‘{a}
		// Google und die GVK-API verwenden i.d.R. diese Form {\‘a}
		let symbols = new Map();
		symbols.set("``", '"'); // GVK
		symbols.set("''", '"'); // GVK
		symbols.set("`", "'"); // GVK
		symbols.set("'", "'"); // GVK
		symbols.set("\\‘{a}", "à");
		symbols.set("{\\‘a}", "à");
		symbols.set("\\‘{e}", "è");
		symbols.set("{\\‘e}", "è");
		symbols.set("\\‘{i}", "ì");
		symbols.set("{\\‘i}", "ì");
		symbols.set("\\‘{o}", "ò");
		symbols.set("{\\‘o}", "ò");
		symbols.set("\\‘{u}", "ù");
		symbols.set("{\\‘u}", "ù");
		symbols.set("\\’{a}", "á");
		symbols.set("{\\’a}", "á");
		symbols.set("\\’{e}", "é");
		symbols.set("{\\’e}", "é");
		symbols.set("\\’{i}", "í");
		symbols.set("{\\’i}", "í");
		symbols.set("\\’{o}", "ó");
		symbols.set("{\\’o}", "ó");
		symbols.set("\\’{u}", "ú");
		symbols.set("{\\’u}", "ú");
		symbols.set("\\'{a}", "á");
		symbols.set("{\\'a}", "á");
		symbols.set("\\'{e}", "é");
		symbols.set("{\\'e}", "é");
		symbols.set("\\'{i}", "í");
		symbols.set("{\\'i}", "í");
		symbols.set("\\'{o}", "ó");
		symbols.set("{\\'o}", "ó");
		symbols.set("\\'{u}", "ú");
		symbols.set("{\\'u}", "ú");
		symbols.set("\\^{a}", "â");
		symbols.set("{\\^a}", "â");
		symbols.set("\\^{e}", "ê");
		symbols.set("{\\^e}", "ê");
		symbols.set("\\^{i}", "î");
		symbols.set("{\\^i}", "î");
		symbols.set("\\^{o}", "ô");
		symbols.set("{\\^o}", "ô");
		symbols.set("\\^{u}", "û");
		symbols.set("{\\^u}", "û");
		symbols.set("\\”{a}", "ä");
		symbols.set("{\\”a}", "ä");
		symbols.set("\\”{e}", "ë");
		symbols.set("{\\”e}", "ë");
		symbols.set("\\”{o}", "ö");
		symbols.set("{\\”o}", "ö");
		symbols.set("\\”{u}", "ü");
		symbols.set("{\\”u}", "ü");
		symbols.set('\\"{a}', "ä");
		symbols.set('{\\"a}', "ä");
		symbols.set('\\"{e}', "ë");
		symbols.set('{\\"e}', "ë");
		symbols.set('\\"{o}', "ö");
		symbols.set('{\\"o}', "ö");
		symbols.set('\\"{u}', "ü");
		symbols.set('{\\"u}', "ü");
		symbols.set("\\~{a}", "ã");
		symbols.set("{\\~a}", "ã");
		symbols.set("\\~{e}", "ẽ");
		symbols.set("{\\~e}", "ẽ");
		symbols.set("\\~{i}", "ĩ");
		symbols.set("{\\~i}", "ĩ");
		symbols.set("\\~{n}", "ñ");
		symbols.set("{\\~n}", "ñ");
		symbols.set("\\~{o}", "õ");
		symbols.set("{\\~o}", "õ");
		symbols.set("\\~{u}", "ũ");
		symbols.set("{\\~u}", "ũ");
		symbols.set("\\v{a}", "ǎ");
		symbols.set("{\\va}", "ǎ");
		symbols.set("\\v{e}", "ě");
		symbols.set("{\\ve}", "ě");
		symbols.set("\\v{i}", "ǐ");
		symbols.set("{\\vi}", "ǐ");
		symbols.set("\\v{o}", "ǒ");
		symbols.set("{\\vo}", "ǒ");
		symbols.set("\\v{u}", "ǔ");
		symbols.set("{\\vu}", "ǔ");
		symbols.set("\\c{c}", "ç");
		symbols.set("{\\cc}", "ç");
		symbols.set("\\aa", "å");
		symbols.set("\\ae", "æ");
		symbols.set("\\oe", "œ");
		symbols.set("\\l", "ł");
		symbols.set("\\o", "ø");
		symbols.set("\\ss", "ß");
		// Symbole ersetzen
		for (let [k, v] of symbols) {
			let regLC = new RegExp(helfer.escapeRegExp(k), "g"),
				regUC = new RegExp(helfer.escapeRegExp( k ), "gi");
			text = text.replace(regLC, v);
			text = text.replace(regUC, v.toUpperCase());
		}
		// Bereinigungen vornehmen
		text = text.replace(/[{}\\]/g, "");
		// Text zurückgeben
		return text;
	},
	// BibTeX-Import: prüft, ob ein BibTex-Datensatz im Clipboard liegt
	//   cp = String
	//     (Text-Inhalt des Clipboards)
	BibTeXCheck (cp) {
		cp = cp.trim();
		if (!/^@[a-zA-Z]+\{.+?,/.test(cp) || !/\}/.test(cp)) {
			return false;
		}
		return true;
	},
	// eine Titelaufnahme aus den übergebenen Daten zusammensetzen
	//   td = Object
	//     (Datensatz mit den Titeldaten)
	//   mitURL = Boolean
	//     (URL + Aufrufdatum sollen der Titelaufnahme angehängt werden)
	makeTitle ({td, mitURL}) {
		let titel = "";
		// Liste der Autoren/Herausgeber ggf. kürzen
		td.autor = ua(td.autor);
		td.hrsg = ua(td.hrsg);
		// Autor
		if (td.autor.length) {
			titel = `${td.autor.join("/")}: `;
		} else if (td.hrsg.length) {
			titel = `${td.hrsg.join("/")} (Hrsg.): `;
		} else {
			titel = "N. N.: ";
		}
		// Titel
		titel += td.titel.join(". ");
		// Untertitel
		if (td.untertitel.length) {
			td.untertitel.forEach(function(i) {
				if (/^[a-zäöü]/.test(i)) {
					titel += ",";
				} else if (!/^[(\[{]/.test(i)) {
					punkt();
				}
				titel += ` ${i}`;
			});
		}
		// In
		if (td.inTitel.length) {
			punkt();
			titel += " In: ";
			if (td.autor.length && td.hrsg.length && !td.jahrgang) {
				titel += `${td.hrsg.join("/")} (Hrsg.): `;
			}
			titel += td.inTitel.join(". ");
		}
		// Band
		if (td.band && !td.jahrgang) {
			punkt();
			titel += ` ${td.band}`;
			if (td.bandtitel.length) {
				titel += `: ${td.bandtitel.join(". ")}`;
			}
		}
		// ggf. Herausgeber ergänzen
		if (!td.inTitel.length && td.hrsg.length && td.autor.length) {
			punkt();
			titel += " Hrsg. von ";
			for (let i = 0, len = td.hrsg.length; i < len; i++) {
				if (i > 0 && i === len - 1) {
					titel += " und ";
				} else if (i > 0) {
					titel += ", ";
				}
				let hrsg = td.hrsg[i].split(", ");
				if (hrsg.length > 1) {
					hrsg.reverse();
					titel += hrsg.join(" ");
				} else {
					titel += hrsg[0];
				}
			}
		}
		// Auflage
		if (td.auflage && !td.jahrgang && !/^1(\.|$)/.test(td.auflage)) {
			if (/\s(Aufl(\.|age)?|Ausgabe)$/.test(td.auflage)) {
				titel += `, ${td.auflage}`;
			} else {
				titel += `, ${td.auflage}. Aufl.`;
			}
		}
		// Qualifikationsschrift
		if (td.quali) {
			punkt();
			titel += ` ${td.quali}`;
		}
		// Ort
		if (td.ort.length && !td.jahrgang) {
			punkt();
			titel += ` ${td.ort.join("/")}`;
		} else if (!td.ort.length && !td.jahrgang) {
			punkt();
		}
		// Jahrgang + Jahr
		if (td.jahrgang) {
			titel += ` ${td.jahrgang}`;
			if (td.jahr) {
				titel += ` (${td.jahr})`;
			}
		} else if (td.jahr) {
			titel += ` ${td.jahr}`;
			if (td.jahrZuerst) {
				titel += ` [${td.jahrZuerst}]`;
			}
		}
		// Heft
		if (td.heft) {
			titel += `, H. ${td.heft}`;
		}
		// Seiten/Spalten
		const seite_spalte = td.spalte ? "Sp. " : "S. ";
		if (td.seiten) {
			titel += `, ${/Sp?\. /.test(td.seiten) ? "" : seite_spalte}${td.seiten}`;
		}
		if (td.seite) {
			if (td.seiten) {
				titel += `, hier ${td.seite}`;
			} else {
				titel += `, ${seite_spalte}${td.seite}`;
			}
		}
		// Serie
		if (td.serie) {
			titel += ` (${td.serie}${td.serieBd ? " " + td.serieBd : ""})`;
		}
		punkt();
		// URL und Aufrufdatum
		if (mitURL && td.url.length) {
			let heute = helfer.datumFormat(new Date().toISOString(), "minuten").split(",")[0];
			titel += "\n";
			for (let url of td.url) {
				titel += `\n${url} (Aufrufdatum: ${heute})`;
			}
		}
		// Titel typographisch verbessern und zurückgeben
		titel = helfer.textTrim(titel, true);
		titel = helfer.typographie(titel);
		return titel;
		// ggf. Punkt ergänzen
		function punkt () {
			if (!/[,;\.:!?]$/.test(titel)) {
				titel += ".";
			}
		}
		// ggf. Namenslisten kürzen
		function ua (liste) {
			if (liste.length > 3) {
				return [`${liste[0]} u. a.`];
			}
			return liste;
		}
	},
	// leeren Datensatz für eine Titelaufnahme erstellen
	makeTitleDataObject () {
		return {
			autor: [],
			hrsg: [],
			titel: [],
			untertitel: [],
			inTitel: [],
			band: "",
			bandtitel: [],
			auflage: "",
			quali: "",
			ort: [],
			verlag: "",
			jahrgang: "",
			jahr: "",
			jahrZuerst: "",
			heft: "",
			spalte: false,
			seiten: "",
			seite: "",
			serie: "",
			serieBd: "",
			url: [],
			ppn: [],
		};
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
