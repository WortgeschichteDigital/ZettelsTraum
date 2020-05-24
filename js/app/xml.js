"use strict";

let xml = {
	// markierten Belegschnitt in die Zwischenablage kopieren
	schnitt () {
		let data = popup.referenz.data,
			ns = "http://www.w3.org/1999/xhtml";
		// <Beleg>
		let parser = new DOMParser(),
			schnitt = parser.parseFromString("<Beleg></Beleg>", "text/xml");
		// @xml:id
		schnitt.firstChild.setAttribute("xml:id", xml.belegId({}));
		// @Fundort
		// (wird schon hier benötigt, um die Absätze in DWDS-Belgen in Leerzeichen zu verwandeln)
		let fundort = "";
		if (/^DTA/i.test(data.kr) ||
				/deutschestextarchiv\.de\//.test(data.qu)) {
			fundort = "dta";
		} else if (/^DWDS/i.test(data.kr)) {
			fundort = "dwds";
		} else if (/^Google\s?Books$/i.test(data.kr) ||
			/books\.google\.[a-z]+\//.test(data.qu)) {
			fundort = "gbooks";
		} else if (/^(DeReKo|IDS-Archiv)/i.test(data.kr)) {
			fundort = "IDS-Archiv";
		} else if (/https?:\/\/|www\.[a-z-]+\.[a-z]+/.test(data.qu)) {
			fundort = "online";
		} else {
			fundort = "Bibliothek";
		}
		// <Belegtext>
		let cont = document.createElement("div");
		cont.innerHTML = helfer.typographie(popup.textauswahl.xml);
		let text = "",
			knoten = cont.childNodes;
		for (let i = 0, len = knoten.length; i < len; i++) {
			if (i > 0) {
				if (fundort === "dwds") {
					// Absätze wurden in DWDS-Belegen intern getilgt; die erscheinen online nur,
					// um den Kontext besser zu erkennen.
					text += " ";
				} else {
					text += "<Zeilenumbruch/>";
				}
			}
			getText(knoten[i]);
		}
		// Belegtext aufbereiten
		//   - Trennzeichen automatisch ersetzen
		//   - Verschachtelte Hervorhebungen zusammenführen
		text = text.replace(/<Autorenzusatz>\[¬\]<\/Autorenzusatz>([A-ZÄÖÜ])/g, (m, p1) => `-${p1}`);
		text = text.replace(/<Autorenzusatz>\[¬\]<\/Autorenzusatz>/g, "");
		let reg = new RegExp(`(?<start>(<Hervorhebung( Stil="#[^>]+")?>){2,})(?<text>[^<]+)(<\/Hervorhebung>)+`, "g"),
			h = reg.exec(text);
		if (h) {
			// das Folgende funktioniert natürlich nur gut, wenn die Tags direkt
			// ineinander verschachtelt sind; ansonsten produziert es illegales XML
			let stile = [];
			for (let i of [...h.groups.start.matchAll(/Stil="(#.+?)"/g)]) {
				stile.push(i[1]);
			}
			let ersatz = `<Hervorhebung`;
			if (stile.length) {
				ersatz += ` Stil="${stile.join(" ")}"`;
			}
			ersatz += `>${h.groups.text}</Hervorhebung>`;
			let reg = new RegExp(helfer.escapeRegExp(h[0]));
			text = text.replace(reg, ersatz);
		}
		// Belegtext einhängen
		let belegtext = parser.parseFromString(`<Belegtext>${text}</Belegtext>`, "text/xml");
		schnitt.firstChild.appendChild(belegtext.firstChild);
		// Elemente und Text extrahieren
		//   n = Knoten
		//     (Knoten, der geparst werden soll)
		function getText (n) {
			if (n.nodeType === 1) {
				for (let c of n.childNodes) {
					let close = "";
					if (c.nodeType === 1 &&
							c.nodeName === "MARK") {
						if (/wortFarbe[0-9]+/.test(c.getAttribute("class"))) {
							// das ist für Kollokationen gedacht
							// TODO da muss wohl ein spezieller Tag her
							text += `<erwaehntes_Zeichen Sprache="dt">`;
							close = "</erwaehntes_Zeichen>";
						} else {
							text += "<Stichwort>";
							close = "</Stichwort>";
						}
					} else if (c.nodeType === 1 &&
							!c.classList.contains("annotierung-wort")) {
						// visuelle Textauszeichnung
						// @Stil: hier können alle @rendition des DTA rein
						let stil = xml.stil(c);
						if (stil) {
							text += `<Hervorhebung Stil="${stil}">`;
						} else {
							text += "<Hervorhebung>";
						}
						close = "</Hervorhebung>";
					}
					getText(c);
					if (close) {
						text += close;
					}
				}
			} else if (n.nodeType === 3) {
				let textEsc = xml.escape({text: n.nodeValue});
				textEsc = textEsc.replace(/&/g, "&amp;"); // sonst macht der Parser die &quot; usw. wieder weg
				text += textEsc.replace(/\[.*?\]/g, m => `<Autorenzusatz>${m}</Autorenzusatz>`);
			}
		}
		// <Fundstelle>
		let fundstelle = document.createElementNS(ns, "Fundstelle");
		schnitt.firstChild.appendChild(fundstelle);
		fundstelle.setAttribute("Fundort", fundort);
		// <Datum>
		let da = xml.datum(data.da);
		if (da) {
			let datum = document.createElementNS(ns, "Datum");
			fundstelle.appendChild(datum);
			datum.appendChild(document.createTextNode(da));
		}
		// <Autor>
		let au = helfer.textTrim(data.au, true);
		if (au) {
			// Korrekturen
			au = au.replace(/N\.N\./g, "N. N.");
			// Element erzeugen
			let autor = document.createElementNS(ns, "Autor");
			fundstelle.appendChild(autor);
			autor.appendChild( document.createTextNode( xml.escape( {text: helfer.typographie(au)} ) ) );
		}
		// <URL>
		let href = data.qu.match(/https?:[^\s]+|www\.[^\s]+/);
		if (href) {
			href[0] = href[0].replace(/(&gt;|[.:,;!?)\]}>]+)$/, "");
			if (!/^https?:/.test(href[0])) {
				href[0] = `https://${href[0]}`;
			}
			let url = document.createElementNS(ns, "URL");
			fundstelle.appendChild(url);
			url.appendChild( document.createTextNode( xml.escape( {text: href[0]} ) ) );
			// <Aufrufdatum>
			let reg = new RegExp(helfer.escapeRegExp(href[0])),
				zugriff = xml.datum(data.qu.split(reg)[1]);
			if (!zugriff) {
				// alternativ Erstellungsdatum Karteikarte nutzen
				// (ist immer vorhanden, auch wenn Kartei noch nicht gespeichert)
				let datum = data.dc.match(/^(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})/);
				zugriff = `${datum.groups.tag}.${datum.groups.monat}.${datum.groups.jahr}`;
			}
			let aufrufdatum = document.createElementNS(ns, "Aufrufdatum");
			fundstelle.appendChild(aufrufdatum);
			aufrufdatum.appendChild(document.createTextNode(zugriff));
		}
		// <unstrukturiert>
		let qu = data.qu;
		if (href) {
			let reg = new RegExp(helfer.escapeRegExp(href[0]));
			qu = qu.split(reg)[0];
		}
		qu = helfer.textTrim(qu, true);
		qu = qu.replace(/N\.N\./g, "N. N.");
		let unstrukturiert = document.createElementNS(ns, "unstrukturiert");
		fundstelle.appendChild(unstrukturiert);
		unstrukturiert.appendChild( document.createTextNode( xml.escape( {text: helfer.typographie(qu)} ) ) );
		// Einzüge hinzufügen
		schnitt = xml.indent(schnitt);
		// Text in String umwandeln und aufbereiten
		let XMLString = new XMLSerializer().serializeToString(schnitt);
		XMLString = XMLString.replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
		let zeichen = new Map([
			["&amp;lt;", "&lt;"],
			["&amp;gt;", "&gt;"],
			["&amp;amp;", "&amp;"],
			["&amp;quot;", "&quot;"],
			["&amp;apos;", "&apos;"],
		]);
		for (let [k, v] of zeichen) {
			let reg = new RegExp(k, "g");
			XMLString = XMLString.replace(reg, v);
		}
		// Text kopieren
		helfer.toClipboard({
			text: XMLString,
		});
		// Animation
		helfer.animation("zwischenablage");
	},
	// Referenztag des Belegs in die Zwischenablage kopieren
	referenz () {
		const id = xml.belegId({});
		helfer.toClipboard({
			text: `<Belegreferenz Ziel="${id}"/>`,
		});
		helfer.animation("zwischenablage");
	},
	// Beleg-ID ermitteln
	//   data = Object || undefined
	//     (das Datenobjekt der betreffenden Karteikarte)
	//   id = String || undefined
	//     (ID der betreffenden Karteikarte)
	belegId ({data = popup.referenz.data, id = popup.referenz.id}) {
		// Autor
		let autor = helfer.textTrim(data.au, true);
		if (!autor) {
			autor = "n-n";
		} else {
			autor = autor.split(",")[0];
			autor = autor.replace(/[;.:'"„“”‚‘»«›‹+*!?(){}[\]<>&]/g, "");
			autor = helfer.textTrim(autor, true);
			autor = autor.toLowerCase();
			autor = autor.replace(/\s/g, "-");
		}
		// Jahr
		let jahr = "",
			datum = xml.datum(data.da).match(/[0-9]{4}/);
		if (datum) {
			jahr = datum[0];
		}
		// ID zurückgeben
		return `${autor}-${jahr}-${id}`;
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
				/(([0-9]{4})\/[0-9]{2})(?![0-9])/,
				/(?<!Sp*\. )(([0-9]{4})[\-–][0-9]{4})/,
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
	// Typ der Hervorhebung ermitteln
	//   n = Element
	//     (ein Knoten, der Textauszeichnungen enthältO)
	stil (n) {
		switch (n.nodeName) {
			case "B":
				return "#b";
			case "DEL":
				return "#s";
			case "DFN":
				return "#i";
			case "EM":
				return "#i";
			case "I":
				return "#i";
			case "S":
				return "#s";
			case "SMALL":
				return "#smaller";
			case "STRONG":
				return "#b";
			case "SUB":
				return "#sub";
			case "SUP":
				return "#sup";
			case "U":
				return "#u";
			case "VAR":
				return "#i";
		}
		if (n.nodeName !== "SPAN" ||
				!n.getAttribute("class")) {
			return "";
		}
		switch (n.getAttribute("class")) {
			case "dta-antiqua":
				return "#aq";
			case "dta-blau":
				return "#blue";
			case "dta-groesser":
				return "#fr";
			case "dta-gesperrt":
				return "#g";
			case "dta-initiale":
				return "#in";
			case "dta-kapitaelchen":
				return "#k";
			case "dta-groesser":
				return "#larger";
			case "dta-rot":
				return "#red";
			case "dta-doppelt":
				return "#uu";
		}
	},
	// geschützte Zeichen escapen
	//   text = String
	//     (String, der escaped werden soll)
	escape ({text}) {
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
	// XML-Snippet mit Einzügen versehen
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
