"use strict";

let xml = {
	// markierten Belegschnitt aufbereiten
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
			fundort = "DTA";
		} else if (/^DWDS/i.test(data.kr)) {
			fundort = "DWDS";
		} else if (/^Google\s?Books$/i.test(data.kr) ||
			/books\.google\.[a-z]+\//.test(data.qu)) {
			fundort = "GoogleBooks";
		} else if (/^(DeReKo|IDS)/i.test(data.kr)) {
			fundort = "IDS";
		} else if (/https?:\/\/|www\.[a-z-]+\.[a-z]+/.test(data.qu)) {
			fundort = "online";
		} else {
			fundort = "Bibliothek";
		}
		// <Belegtext>
		let cont = document.createElement("div");
		// Belegschnitt typographisch aufbereiten
		// (sollte hier passieren, weil später automatisch XML-Ersetzungen reinkommen)
		cont.innerHTML = helfer.typographie(popup.textauswahl.xml);
		// <span> für farbige Hervorhebung der Klammern ersetzen
		helfer.clipboardHtmlErsetzen(cont, `[class^="klammer-"]`);
		// Belegschnitt parsen
		let text = "",
			knoten = cont.childNodes;
		for (let i = 0, len = knoten.length; i < len; i++) {
			if (i > 0) {
				if (fundort === "DWDS") {
					// Absätze wurden in DWDS-Belegen intern getilgt; die erscheinen
					// online nur, um den Kontext besser zu erkennen.
					text += " ";
				} else {
					text += "<Zeilenumbruch/>";
				}
			}
			getText(knoten[i]);
		}
		// Belegtext aufbereiten
		//   - Text trimmen (durch Streichungen können doppelte Leerzeichen entstehen)
		//   - verschachtelte Hervorhebungen zusammenführen
		text = helfer.textTrim(text, true);
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
							text += `<erwaehntes_Zeichen>`;
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
				let textEsc = helferXml.maskieren({text: n.nodeValue});
				textEsc = textEsc.replace(/&/g, "&amp;"); // sonst macht der Parser die &quot; usw. wieder weg
				text += klammernTaggen(textEsc);
			}
		}
		// geklammerte Texttexteile automatisch taggen
		//   text = String
		//     (Belegtext, der getaggt werden soll)
		function klammernTaggen (text) {
			// DTA-Import Trennstriche auflösen (folgt Großbuchstabe => Trennstrich erhalten)
			text = text.replace(/\[¬\]([A-ZÄÖÜ])/g, (m, p1) => `-${p1}`);
			// DTA-Import: technische Klammern entfernen
			// (Trennstriche, Seiten- und Spaltenwechsel)
			text = text.replace(/\[(¬|:.+?:)\]/g, "");
			// Löschung: [[...]]
			text = text.replace(/\[{2}(.+?)\]{2}/g, (m, p1) => `<Loeschung>${p1}</Loeschung>`);
			// Streichung: [...]
			text = text.replace(/\[(.+?)\]/g, (m, p1) => `<Streichung>${p1}</Streichung>`);
			// Autorenzusatz: {...}
			text = text.replace(/\{(.+?)\}/g, (m, p1) => `<Autorenzusatz>${p1}</Autorenzusatz>`);
			// Ergebnis zurückgeben
			return text;
		}
		// <Fundstelle>
		let fundstelle = document.createElementNS(ns, "Fundstelle");
		schnitt.firstChild.appendChild(fundstelle);
		// <Fundort>
		let fo = document.createElementNS(ns, "Fundort");
		fundstelle.appendChild(fo);
		fo.appendChild(document.createTextNode(fundort));
		// <Datum>
		let da = helferXml.datum(data.da, false, true);
		if (da) {
			let datum = document.createElementNS(ns, "Datum");
			fundstelle.appendChild(datum);
			datum.appendChild(document.createTextNode(da.replace("–", "-"))); // hier lieber keinen Halbgeviertstrich
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
			url.appendChild( document.createTextNode( helferXml.maskieren( {text: href[0]} ) ) );
			// <Aufrufdatum>
			let reg = new RegExp(helfer.escapeRegExp(href[0])),
				zugriff = helferXml.datum(data.qu.split(reg)[1]);
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
		qu = qu.replace(/N\. ?N\./g, "N. N.");
		let unstrukturiert = document.createElementNS(ns, "unstrukturiert");
		fundstelle.appendChild(unstrukturiert);
		unstrukturiert.appendChild( document.createTextNode( helferXml.maskieren( {text: helfer.typographie(qu)} ) ) );
		// Einzüge hinzufügen
		schnitt = helferXml.indent(schnitt);
		// Text in String umwandeln und aufbereiten
		let xmlStr = new XMLSerializer().serializeToString(schnitt);
		xmlStr = xmlStr.replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
		let zeichen = new Map([
			["&amp;amp;", "&amp;"],
			["&amp;lt;", "&lt;"],
			["&amp;gt;", "&gt;"],
			["&amp;quot;", "&quot;"],
			["&amp;apos;", "&apos;"],
		]);
		for (let [k, v] of zeichen) {
			let reg = new RegExp(k, "g");
			xmlStr = xmlStr.replace(reg, v);
		}
		// String zurückgeben
		return xmlStr;
	},
	// markierten Belegschnitt in die Zwischenablage kopieren
	schnittInZwischenablage () {
		const xmlStr = xml.schnitt();
		// Text kopieren
		helfer.toClipboard({
			text: xmlStr,
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
			datum = helferXml.datum(data.da).match(/[0-9]{4}/);
		if (datum) {
			jahr = datum[0];
		}
		// ID zurückgeben
		return `${autor}-${jahr}-${id}`;
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
};
