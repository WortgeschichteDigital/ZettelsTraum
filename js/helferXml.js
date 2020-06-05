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
	// geschützte Zeichen maskieren
	//   text = String
	//     (String, der maskiert werden soll)
	maskieren ({text}) {
		let zeichen = new Map([
			["&", "&amp;"],
			["<", "&lt;"],
			[">", "&gt;"],
			['"', "&quot;"],
			["'", "&apos;"],
		]);
		for (let [k, v] of zeichen) {
			let reg = new RegExp(k, "g");
			text = text.replace(reg, v);
		}
		return text;
	},
	// XML-Dokument mit Einzügen versehen
	// (s. https://stackoverflow.com/a/47317538)
	//   xml = Document
	//     (das XML-Snippet)
	indent (xml) {
		let xslt = new DOMParser().parseFromString(`<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:strip-space elements="*"/>
	<xsl:template match="para[content-style][not(text())]">
		<xsl:value-of select="normalize-space(.)"/>
	</xsl:template>
	<xsl:template match="node()|@*">
		<xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
	</xsl:template>
	<xsl:output indent="yes"/>
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
		// ggf. Fehler markieren
		if (xmlErr) {
			let xmlStrLines = xmlStr.split("\n"),
				errLine = xmlStrLines[xmlErr.line - 1],
				start = errLine.slice(0, xmlErr.column - 1),
				end = errLine.slice(xmlErr.column - 1);
			if (!/</.test(start) || !/>/.test(start)) {
				// ganze Zeile markieren
				xmlStrLines[xmlErr.line - 1] = `<span class="xml-err">${errLine}</span>`;
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
			xmlStr = xmlStr.replace(/&lt;span class=&quot;xml-err&quot;&gt;(.+?)&lt;\/span&gt;/, (m, p1) => {
				return `<span class="xml-err">${p1}</span>`;
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
};
