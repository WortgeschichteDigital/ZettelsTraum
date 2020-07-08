"use strict";

let helferXml = {
	// Fundort anhand der URL ermitteln
	//   url = String
	//     (URL, aus der der Fundort abgeleitet werden soll)
	fundort ({url}) {
		let fundort = "online";
		if (/deutschestextarchiv\.de\//.test(url)) {
			fundort = "DTA";
		} else if (/dwds\.de\//.test(url)) {
			fundort = "DWDS";
		} else if (/books\.google\.[a-z]+\//.test(url)) {
			fundort = "GoogleBooks";
		} else if (/owid\.de\//.test(url)) {
			fundort = "IDS";
		}
		return fundort;
	},
	// Datenstruktur des XML-Redaktionsfensters zurückgeben
	redXmlData () {
		return {
			ab: [], // Abstract
			bg: [], // Bedeutungsgerüst
			bl: [], // Belege
			le: [], // Lemmata
			lt: [], // Literatur
			md: { // Metadaten
				id: "", // Artikel-ID
				re: [], // Revisionen
				tf: "", // Themenfeld
				ty: "", // Artikeltyp
			},
			tx: [], // Text
			wi: {}, // Wortinformationen
		};
	},
	// Datum extrahieren
	//   text = String
	//     (Text, aus dem heraus das Datum extrahiert werden soll)
	//   normJh = false || undefined
	//     (die Jahrhundertangabe soll in eine Jahreszahl umgewandelt werden)
	//   sonder = true || undefined
	//     (die übergebene Textstelle soll auf spezielle Formate überprüft werden)
	datum (text, normJh = true, sonder = false) {
		// Sonderformate
		// (übliche Jahresangaben in DeReKo-Quellen suchen)
		let sonderformate = [];
		if (sonder) {
			let formate = [
				/(([0-9]{4})\/[0-9]{2})(?![0-9])/, // 1848/49
				/(?<!Sp?\. )(([0-9]{4})[\-–][0-9]{4})/, // 1850–1853
				/zwischen (([0-9]{4}) und [0-9]{4})/, // zwischen 1850 und 1853
			];
			for (let reg of formate) {
				let m = text.match(reg);
				if (m) {
					let f = {
						format: "",
						jahr: "",
					};
					f.format = m[1].replace(/ und |-/, "–");
					f.jahr = m[2];
					sonderformate.push(f);
				}
			}
		}
		// Normformate
		let formate = [
			/(?<tag>[0-9]{1,2})\.\s*(?<monat>[0-9]{1,2})\.\s*(?<jahr>[0-9]{4})/,
			/(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})/,
			/(?<jahr>[0-9]{4})/,
			/(?<jahrhundert>[0-9]{2})\.\sJh\./,
		];
		let jahr = "",
			monat = 0,
			tag = 0;
		for (let reg of formate) {
			let m = text.match(reg);
			if (m) {
				if (m.groups.jahrhundert) {
					if (normJh) {
						jahr = `${parseInt(m.groups.jahrhundert, 10) - 1}00`; // sehr unschön
					} else {
						jahr = `${m.groups.jahrhundert}. Jh.`;
					}
				} else {
					// steht vor diesem Datum ein anderes Datum, das Vorrang hat?
					let before = text.substring(0, m.index);
					if (/[0-9]{4}|[0-9]{2}\.\sJh\./.test(before)) {
						continue;
					}
					// dieses Datum wird ausgewertet
					jahr = m.groups.jahr;
					monat = parseInt(m.groups.monat, 10);
					tag = parseInt(m.groups.tag, 10);
				}
				break;
			}
		}
		// Ergebnis der Analyse
		if (sonderformate.length && !monat) {
			for (let i of sonderformate) {
				if (i.jahr === jahr) {
					return i.format;
				}
			}
		}
		if (jahr) {
			if (!monat || ! tag) {
				return jahr;
			}
			return `${tag < 10 ? "0" : ""}${tag}.${monat < 10 ? "0" : ""}${monat}.${jahr}`;
		}
		return "";
	},
	// Datum ermitteln und als solches und in einem Sortierformat zurückgeben
	//   xmlStr = String
	//     (String mit XML-Tags)
	datumFormat ({xmlStr}) {
		let datum = xmlStr.match(/<Datum>(.+?)<\/Datum>/)[1],
			datumForm1 = /^(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})$/.exec(datum),
			datumForm2 = /^(?<jahrVon>[0-9]{4})-(?<jahrBis>[0-9]{4})$/.exec(datum),
			datumForm3 = /^(?<jahrVon>[0-9]{4})\/(?<jahrBis>[0-9]{2})$/.exec(datum),
			datumForm4 = /^(?<jahr>[0-9]{4})$/.exec(datum),
			datumSort = "";
		if (datumForm1) {
			let g = datumForm1.groups;
			datumSort = `${g.jahr}-${g.monat}-${g.tag}`;
		} else if (datumForm2) {
			let g = datumForm2.groups;
			datumSort = `${g.jahrVon}-xx-xx-${g.jahrBis}`;
		} else if (datumForm3) {
			let g = datumForm3.groups;
			datumSort = `${g.jahrVon}-xx-xx-${g.jahrVon.substring(0, 2)}${g.jahrBis}`;
		} else if (datumForm4) {
			let g = datumForm4.groups;
			datumSort = `${g.jahr}-00-00`;
		}
		return {
			anzeige: datum,
			sortier: datumSort,
		};
	},
	// geschützte Zeichen maskieren
	//   text = String
	//     (String, der maskiert werden soll)
	//   demaskieren = true || undefined
	//     (geschützte Zeichen demaskieren)
	maskieren ({text, demaskieren = false}) {
		let zeichen = new Map([
			["&", "&amp;"],
			["<", "&lt;"],
			[">", "&gt;"],
			['"', "&quot;"],
			["'", "&apos;"],
		]);
		for (let [k, v] of zeichen) {
			let zReg = k,
				zRep = v;
			if (demaskieren) {
				zReg = v;
				zRep = k;
			}
			let reg = new RegExp(zReg, "g");
			text = text.replace(reg, zRep);
		}
		return text;
	},
	// XML-Dokument mit Einzügen versehen
	// (s. https://stackoverflow.com/a/376503)
	//   xml = Document
	//     (das XML-Snippet)
	indent (xml) {
		let xslt = new DOMParser().parseFromString(`<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output omit-xml-declaration="yes" indent="yes"/>
		<xsl:template match="node()|@*">
			<xsl:copy>
				<xsl:apply-templates select="node()|@*"/>
			</xsl:copy>
		</xsl:template>
</xsl:stylesheet>`, "application/xml");
		let processor = new XSLTProcessor();
		processor.importStylesheet(xslt);
		return processor.transformToDocument(xml);
	},
	// XML-Snippet einfärben
	//   xmlStr = String
	//     (das XML-Snippet, das eingefärbt werden soll)
	//   xmlErr = Object || null || undefined
	prettyPrint ({xmlStr, xmlErr = null}) {
		// geschützte Leerzeichen markieren
		xmlStr = xmlStr.replace(/\u{a0}/ug, "␣");
		/// horizonatle Ellipse zu drei Punkte (wird in Noto Mono weird dargestellt)
		xmlStr = xmlStr.replace(/…/g, "...");
		// ggf. Fehler markieren
		if (xmlErr) {
			let xmlStrLines = xmlStr.split("\n"),
				errLine = xmlStrLines[xmlErr.line - 1],
				start = errLine.slice(0, xmlErr.column - 1),
				end = errLine.slice(xmlErr.column - 1);
			if (!/</.test(start) || !/>/.test(start)) {
				if (!xmlStr) { // Textfeld leer => dieses im Fehler vermerken
					xmlStrLines[xmlErr.line - 1] = `<span class="xml-empty">kein Text</span>`;
				} else { // ganze Zeile markieren
					xmlStrLines[xmlErr.line - 1] = `<span class="xml-err">${errLine}</span>`;
				}
			} else {
				if (xmlErr.entity) {
					// Text zwischen Tags markieren (Entity-Fehler)
					let idx = start.lastIndexOf(">"),
						start1 = start.slice(0, idx),
						start2 = start.slice(idx);
					start = `${start1}><span class="xml-err">${start2.substring(1)}`;
					end = end.replace(/</, "</span><");
					xmlStrLines[xmlErr.line - 1] = start + end;
				} else {
					// Tag markieren
					let idx = start.lastIndexOf("<"),
						start1 = start.slice(0, idx),
						start2 = start.slice(idx);
					if (/>/.test(start2)) {
						start2 = start2.replace(/<.+?>/, m => `<span class="xml-err">${m}</span>`);
					} else {
						start2 = start2.replace(/</, `<span class="xml-err"><`);
						end = end.replace(/>/, "></span>");
					}
					xmlStrLines[xmlErr.line - 1] = start1 + start2 + end;
				}
			}
			// Zeilen zusammenfügen, Zeichen maskieren, Fehlermarkierung demaskieren
			xmlStr = xmlStrLines.join("\n");
			xmlStr = helferXml.maskieren({text: xmlStr});
			xmlStr = xmlStr.replace(/&lt;span class=&quot;xml-(err|empty)&quot;&gt;(.+?)&lt;\/span&gt;/, (m, p1, p2) => {
				return `<span class="xml-${p1}">${p2}</span>`;
			});
		} else {
			// Zeichen maskieren
			xmlStr = helferXml.maskieren({text: xmlStr});
		}
		// farbliche Hervorhebungen
		xmlStr = xmlStr.replace(/&lt;.+?&gt;/g, m => {
			return `<span class="xml-tag">${m}</span>`;
		});
		xmlStr = xmlStr.replace(/<span class="xml-tag">(.+?)<\/span>/g, (m, p1) => {
			p1 = p1.replace(/ (.+?=)(&quot;.+?&quot;)/g, (m, p1, p2) => {
				return ` <span class="xml-attr-key">${p1}</span><span class="xml-attr-val">${p2}</span>`;
			});
			return `<span class="xml-tag">${p1}</span>`;
		});
		// Ergebnis zurückgeben
		return xmlStr;
	},
	// Abkürzungen Fließtext
	abbr: {
		"Adj\\.": "Adjektiv",
		"Adv\\.": "Adverb",
		"Akk\\.": "Akkusativ",
		"Art\\.": "Artikel",
		"attr\\.": "attributiv",
		"Attr\\.": "Attribut",
		"bes\\.": "besonders",
		"bspw\\.": "beispielsweise",
		"bzw\\.": "beziehungsweise",
		"ca\\.": "circa",
		"Dat\\.": "Dativ",
		"Dem\\.pron\\.": "Demonstrativpronomen",
		"dgl\\.": "dergleichen",
		"d\\.\\sh\\.": "das heißt",
		"d\\.\\si\\.": "das ist",
		"eigentl\\.": "eigentlich",
		"e\\.\\sV\\.": "eingetragener Verein",
		"f\\.": "Femininum",
		"fem\\.": "feminin",
		"Fem\\.": "Femininum",
		"Fut\\.": "Futur",
		"Gen\\.": "Genitiv",
		"gleichbed\\.": "gleichbedeutend",
		"Hs\\.": "Handschrift",
		"i\\.\\sd\\.\\sR\\.": "in der Regel",
		"i\\.\\sS\\.\\sv\\.": "im Sinne von",
		"Imperf\\.": "Imperfekt",
		"Ind\\.": "Indikativ",
		"Indef\\.pron\\.": "Indefinitpronomen",
		"Inf\\.": "Infinitiv",
		"insb\\.": "insbesondere",
		"Instr\\.": "Instrumental",
		"Interj\\.": "Interjektion",
		"Interr\\.pron\\.": "Interrogativpronomen",
		"intrans\\.": "intransitiv",
		"Jh\\.": "Jahrhundert",
		"Jhs\\.": "Jahrhunderts",
		"Komp\\.": "Komparativ",
		"Konj\\.": "Konjunktion",
		"m\\.": "Maskulinum",
		"mask\\.": "maskulin",
		"Mask\\.": "Maskulinum",
		"n\\.": "Neutrum",
		"neutr\\.": "neutral",
		"Neutr\\.": "Neutrum",
		"Nom\\.": "Nominativ",
		"Num\\.": "Numerale",
		"Num\\.adj\\.": "Numeraladjektiv",
		"Num\\.\\sOrd\\.": "Numerale Ordinale",
		"Part\\.": "Partizip",
		"Part\\.adj\\.": "Partizipialadjektiv",
		"Part\\.\\sPerf\\.": "Partizip Perfekt",
		"Part\\.\\sPräs\\.": "Partizip Präsens",
		"Part\\.\\sPrät\\.": "Partizip Präteritum",
		"Part\\.subst\\.": "Partizipialsubstantiv",
		"Pass\\.": "Passiv",
		"Perf\\.": "Perfekt",
		"Pers\\.": "Person",
		"Pers\\.pron\\.": "Personalpronomen",
		"Plur\\.": "Plural",
		"Poss\\.pron\\.": "Possessivpronomen",
		"präd\\.": "prädikativ",
		"Präd\\.": "Prädikat",
		"Präp\\.": "Präposition",
		"Präs\\.": "Präsens",
		"Prät\\.": "Präteritum",
		"Prät\\.-Präs\\.": "Präteritopräsens",
		"Pron\\.": "Pronomen",
		"Pron\\.adj\\.": "Pronominaladjektiv",
		"refl\\.": "reflexiv",
		"Refl\\.pron\\.": "Reflexivpronomen",
		"Rel\\.pron\\.": "Relativpronomen",
		"s\\.\\sd\\.": "siehe dort",
		"s\\.\\sv\\.": "sub voce",
		"s\\.": "siehe",
		"S\\.": "Siehe",
		"Sing\\.": "Singular",
		"sog\\.": "sogenannter",
		"subst\\.": "substantivisch",
		"Subst\\.": "Substantiv",
		"Superl\\.": "Superlativ",
		"trans\\.": "transitiv",
		"u\\.\\sa\\.": "unter anderem",
		"u\\.\\sä\\.": "und ähnlich",
		"usw\\.": "und so weiter",
		"Vb\\.": "Verb",
		"vgl\\.": "vergleiche",
		"Vgl\\.": "Vergleiche",
		"vs\\.": "versus",
		"Wb\\.": "Wörterbuch",
		"Wbb\\.": "Wörterbücher",
		"zit\\.\\sn\\.": "zitiert nach",
		"z\\.\\sB\\.": "zum Beispiel",
		"Z\\.\\sB\\.": "Zum Beispiel",
	},
	// Abkürzungen im Literaturverzeichnis
	abbrLit: {
		"a\\.\\sd\\.\\sS\\.": "an der Saale",
		"a\\.\\sM\\.": "am Main",
		"Akad\\.\\sder\\sWiss\\.": "Akademie der Wissenschaften",
		"akt\\.": "aktualisierte",
		"Art\\.": "Artikel",
		"Aufl\\.": "Auflage",
		"Auftr\\.": "Auftrag",
		"Ausg\\.": "Ausgabe",
		"Bd\\.": "Band",
		"Bde\\.": "Bände",
		"bearb\\.(?=\\sv)": "bearbeitet",
		"(?<!neu)bearb\\.": "bearbeitete",
		"Bearb\\.": "Bearbeitet",
		"bzw\\.": "beziehungsweise",
		"Ders\\.": "Derselbe",
		"Dies\\.": "Dieselbe",
		"durchges\\.": "durchgesehene",
		"e\\.\\sV\\.": "eingetragener Verein",
		"erg\\.": "ergänzte",
		"erw\\.": "erweiterte",
		"etc\\.": "et cetera",
		"(?<=[0-9])ff?\\.": "folgende",
		"H\\.(?=\\s[0-9])": "Heft",
		"Hrsg\\.(?=\\s[uv])": "Herausgegeben",
		"(?<=\\()Hrsg\\.(?=\\))": "Herausgeber",
		"hrsg\\.": "herausgegeben",
		"i\\.\\sBr\\.": "im Breisgau",
		"Jb\\.": "Jahrbuch",
		"Jbb\\.": "Jahrbücher",
		"Lfg\\.": "Lieferung",
		"Lizenzausg\\.": "Lizenzausgabe",
		"N\\.\\sN\\.": "nomen nescio",
		"Nachdr\\.\\sd\\.": "Nachdruck der",
		"Nachdr\\.": "Nachdruck",
		"Neudr\\.": "Neudruck",
		"neubearb\\.": "neubearbeitete",
		"Nr\\.": "Nummer",
		"o\\.\\sD\\.": "ohne Datum",
		"o\\.\\sO\\.": "ohne Ort",
		"Reprograf\\.": "Reprografischer",
		"s\\.\\sv\\.": "sub voce",
		"S\\.(?=\\s[0-9])": "Seite",
		"Sp\\.(?=\\s[0-9])": "Spalte",
		"u\\.\\sa\\.": "und andere",
		"(?<=\\s)u\\.(?=\\s)": "und",
		"überarb\\.": "überarbeitete",
		"übers\\.(?=\\sv)": "übersetzt",
		"unveränd\\.": "unveränderter",
		"Unveränd\\.": "Unveränderter",
		"verb\\.": "verbesserte",
		"(?<=des\\s)Verf\\.": "Verfassers",
		"Verf\\.": "Verfasser",
		"verm\\.": "vermehrte",
		"vollst\\.": "vollständig",
		"Vorw\\.": "Vorwort",
		"Wb\\.": "Wörterbuch",
		"Wbb\\.": "Wörterbücher",
		"Zs\\.": "Zeitschrift",
	},
	// Abkürzungen-Tagger
	//   text = String
	//     (Text, der getaggt werden soll)
	//   lit = true | undefined
	//     (Literatur-Subset benutzen)
	abbrTagger ({text, lit = false}) {
		let abbr = helferXml.abbr;
		if (lit) {
			abbr = helferXml.abbrLit;
		}
		for (let [k, v] of Object.entries(abbr)) {
			let r = new RegExp(`(?<!(<Abkuerzung Expansion=".+?">|\\p{Letter}| ))${k}`, "ug");
			text = text.replace(r, m => `<Abkuerzung Expansion="${v}">${m}</Abkuerzung>`);
		}
		return text;
	},
};
