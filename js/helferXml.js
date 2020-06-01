"use strict";

let helferXml = {
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
				/(([0-9]{4})\/[0-9]{2})(?![0-9])/,
				/(?<!Sp?\. )(([0-9]{4})[\-–][0-9]{4})/,
				/zwischen (([0-9]{4}) und [0-9]{4})/,
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
};
