"use strict";

const xml = {
  // Liste der Zeitungen, deren Autor und Titel beim Erstellen des Snippets ggf. automatisch eliminiert werden sollen
  zeitungen: [
    "Aachener Zeitung",
    "Berliner Zeitung",
    "BILD",
    "Frankfurter Allgemeine Zeitung",
    "der freitag",
    "freundin",
    "Die Fackel",
    "Die Gartenlaube",
    "Grenzboten",
    "Jungfrau Zeitung",
    "Leipziger Volkszeitung",
    "Merkur",
    "Mittelbayerische",
    "Münchner Merkur",
    "Neue Rheinische Zeitung",
    "Neue Zürcher Zeitung",
    "neues deutschland",
    "Siebenbürgisch-Deutsches Wochenblatt",
    "(Der )?Spiegel",
    "(Der )?Standard",
    "stern",
    "St\\. Galler Tageblatt",
    "Süddeutsche Zeitung",
    "Südkurier",
    "Der Tagesspiegel",
    "taz",
    "Völkischer Beobachter",
    "(Die )?Welt",
    "Die ZEIT",
  ],

  // markierten Belegschnitt aufbereiten
  schnitt () {
    const data = popup.referenz.data;
    const ns = "http://www.w3.org/1999/xhtml";

    // <Beleg>
    const parser = new DOMParser();
    let schnitt = parser.parseFromString("<Beleg></Beleg>", "text/xml");

    // @xml:id
    schnitt.firstChild.setAttribute("xml:id", xml.belegId({}));

    // @Fundort
    // (wird schon hier benötigt, um die Absätze in DWDS-Belgen in Leerzeichen zu verwandeln)
    let fundort = "";
    if (/^DTA/i.test(data.kr) ||
        /deutschestextarchiv\.de\//.test(data.ul)) {
      fundort = "DTA";
    } else if (/^DWDS/i.test(data.kr)) {
      fundort = "DWDS";
    } else if (/^Google\s?Books$/i.test(data.kr) ||
        /books\.google\.[a-z]+\//.test(data.ul)) {
      fundort = "GoogleBooks";
    } else if (/^(DeReKo|IDS)/i.test(data.kr)) {
      fundort = "IDS";
    } else if (data.ul) {
      fundort = "online";
    } else {
      fundort = "Bibliothek";
    }

    // <Belegtext>
    const cont = document.createElement("div");

    // Belegschnitt typographisch aufbereiten
    // (sollte hier passieren, weil später automatisch XML-Ersetzungen reinkommen)
    cont.innerHTML = helfer.typographie(popup.textauswahl.xml);

    // technische Klammern entfernen (Hervorhebung von Seitenumbrüchen, Trennstrichen usw.)
    helfer.clipboardHtmlErsetzen(cont, ".klammer-technisch");

    // .klammer-(autorenzusatz|loeschung|streichung) in Tags umwandeln
    // (da Klammern verschachtelt sein könnten, braucht es eine rekursive Funktion)
    (function klammern (n) {
      for (const ch of n.childNodes) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          const cl = ch.getAttribute("class");
          if (/^klammer-/.test(cl)) {
            const parent = ch.parentNode;
            const tag = cl.replace("klammer-", "");
            const template = document.createElement("template");
            template.innerHTML = `<${tag}>${ch.innerHTML}</${tag}>`;
            parent.replaceChild(template.content, ch);
            // wegen möglicher Verschachtelungen muss der parent dieser Klammer
            // noch einmal gescannt werden
            klammern(parent);
          } else {
            klammern(ch);
          }
        }
      }
    }(cont));

    // Belegschnitt parsen
    let text = "";
    let knoten = cont.childNodes;
    if (knoten.length > 1) {
      knoten = cont.querySelectorAll("[data-pnumber]");
    }
    for (let i = 0, len = knoten.length; i < len; i++) {
      if (i === 0) {
        text += "<Absatz>";
      } else if (fundort === "DWDS") {
        // Absätze wurden in DWDS-Belegen intern getilgt; die erscheinen
        // online nur, um den Kontext besser zu erkennen.
        text += " ";
      } else {
        text += "<Absatz>";
      }
      getText(knoten[i]);
      if (i < len - 1 && fundort !== "DWDS") {
        text += "</Absatz>";
      } else if (i === len - 1) {
        text += "</Absatz>";
      }
    }

    // Belegtext aufbereiten
    //   - Klammerungen aufbereiten
    //   - Leerzeichen vor <Streichung> ergänzen (werden beim Auflösen wieder entfernt)
    //   - überflüssige Versauszeichnungen am Ende ersetzen (kann bei wilder Auswahl passieren)
    //   - leere Tags ersetzen (kann bei Stichwörtern mit Klammerung in der Mitte vorkommen
    //   - Stichwort-Tags zusammenführen (kann bei Klammerung in der Mitte vorkommen)
    //   - Text trimmen (durch Streichungen können doppelte Leerzeichen entstehen)
    //   - verschachtelte Hervorhebungen zusammenführen
    //   - Versauszeichnungen komplettieren/korrigieren
    text = klammernTaggen(text);
    text = text.replace(/([^\s])(<Streichung>[,;:/])/g, (m, p1, p2) => p1 + " " + p2);
    text = text.replace(/(<\/Vers><Vers>\s?)+$/, "");
    text = text.replace(/<([a-zA-Z]+)(?: Stil="#[a-z]+")?><\/([a-zA-Z]+)>/g, (m, p1, p2) => {
      if (p1 === p2 &&
          p1 !== "Autorenzusatz") { // <Autorenzusatz> kann leer sein (Elision)
        return "";
      }
      return m;
    });
    text = text.replace(/<\/Stichwort><Stichwort>|<\/Markierung><Markierung>/g, "");
    text = helfer.textTrim(text, true);
    text = xml.mergeHervorhebungen({ text });
    text = text.replace(/<Absatz>(.+?)<\/Absatz>/g, (m, p1) => {
      if (/<Vers>/.test(p1)) {
        p1 = `<Vers>${p1}</Vers>`;
        p1 = p1.replace(/<Vers><(Streichung|Loeschung)>/g, (m, p1) => `<${p1}><Vers>`);
        p1 = p1.replace(/<\/(Streichung|Loeschung)><\/Vers>/g, (m, p1) => `</Vers></${p1}>`);
        p1 = p1.replace(/<Vers><\/Absatz>$/, "</Absatz>");
      }
      return `<Absatz>${p1}</Absatz>`;
    });

    // Belegtext einhängen
    const belegtext = parser.parseFromString(`<Belegtext>${text}</Belegtext>`, "text/xml");
    schnitt.firstChild.appendChild(belegtext.firstChild);

    // Elemente und Text extrahieren
    //   n = Knoten
    //     (Knoten, der geparst werden soll)
    function getText (n) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        for (const c of n.childNodes) {
          let close = "";
          if (c.nodeType === Node.ELEMENT_NODE &&
              c.nodeName === "BR") {
            text += "</Vers><Vers>";
            continue;
          } else if (c.nodeType === Node.ELEMENT_NODE &&
              c.nodeName === "MARK") {
            // diese Markierung/dieses Stichwort soll evtl. nicht getaggt werden
            const nichtTaggen = c.parentNode?.dataset?.nichtTaggen ? true : false;
            // wenn man in den Formvarianten Mehrwortausdrücken als Wort
            // aufnimmt, kann es zu Verschachtelungen kommen
            const verschachtelt = c.parentNode.closest("mark");
            if (!verschachtelt && !nichtTaggen &&
                (c.parentNode.classList.contains("annotierung-wort") ||
                c.classList.contains("user") ||
                c.classList.contains("markierung"))) {
              text += "<Markierung>";
              close = "</Markierung>";
            } else if (!verschachtelt && !nichtTaggen) {
              text += "<Stichwort>";
              close = "</Stichwort>";
            }
          } else if (c.nodeType === Node.ELEMENT_NODE &&
              /AUTORENZUSATZ|LOESCHUNG|STREICHUNG/.test(c.nodeName)) {
            const tagName = c.nodeName.substring(0, 1) + c.nodeName.substring(1).toLowerCase();
            text += `<${tagName}>`;
            close = `</${tagName}>`;
          } else if (c.nodeType === Node.ELEMENT_NODE &&
              !c.classList.contains("annotierung-wort")) {
            // visuelle Textauszeichnung
            // @Stil: hier können (fast) alle @rendition des DTA rein
            const stil = xml.stil(c);
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
      } else if (n.nodeType === Node.TEXT_NODE) {
        const textEsc = helferXml.maskieren({ text: n.nodeValue });
        text += textEsc.replace(/&/g, "&amp;"); // sonst macht der Parser die &quot; usw. wieder weg
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
      // Korrekturen Taggingfehler
      //   * wenn <Streichung> für Auslassung benutzt wird => <Loeschung>
      //   * <Autorenzusatz> innerhalb von <Streichung> nicht ersetzen)
      //   * Spatien am Anfang/Ende von <Streichung> u. <Loeschung> ausklammern
      text = text.replace(/<Streichung>…<\/Streichung>/g, "<Loeschung>…</Loeschung>");
      const sStart = text.split(/<Streichung>/);
      text = "";
      for (let i = 0, len = sStart.length; i < len; i++) {
        if (i === 0) {
          text += korrekturAutorenz(sStart[0]);
        } else {
          const sEnd = sStart[i].split(/<\/Streichung>/);
          text += "<Streichung>" + sEnd[0] + "</Streichung>" + korrekturAutorenz(sEnd[1]);
        }
      }
      function korrekturAutorenz (s) {
        return s.replace(/<Autorenzusatz>…<\/Autorenzusatz>/g, "<Loeschung>…</Loeschung>");
      }
      text = text.replace(/<(Streichung|Loeschung)>(.+?)<\/(Streichung|Loeschung)>/g, (...args) => {
        const spaceStart = /^ /.test(args[2]) ? " " : "";
        const spaceEnd = / $/.test(args[2]) ? " " : "";
        return `${spaceStart}<${args[1]}>${args[2].replace(/^ | $/g, "")}</${args[3]}>${spaceEnd}`;
      });
      // Ergebnis zurückgeben
      return text;
    }

    // <Fundstelle>
    const fundstelle = document.createElementNS(ns, "Fundstelle");
    schnitt.firstChild.appendChild(fundstelle);

    // <Fundort>
    const fo = document.createElementNS(ns, "Fundort");
    fundstelle.appendChild(fo);
    fo.appendChild(document.createTextNode(fundort));

    // <Datum>
    let da = helferXml.datum(data.da, false, true);
    if (da) {
      const datum = document.createElementNS(ns, "Datum");
      fundstelle.appendChild(datum);
      da = da.replace("–", "-"); // hier lieber keinen Halbgeviertstrich
      da = da.replace(/\.\s?Jh\./, ""); // Jahrhundertangabe auf Ziffern reduzieren
      datum.appendChild(document.createTextNode(da));
    }

    // <URL>
    if (data.ul) {
      // Korrekturen
      // (wird nur für ältere Belge benötigt, die vor v0.81.0 erstellt wurden)
      let url = data.ul.replace(/(&gt;|[.:,;!?)\]}>]+)$/, "");
      if (!/^https?:/.test(url)) {
        url = "https://" + url;
      }

      // DTA-Links aufbereiten
      if (/www\.deutschestextarchiv\.de\//.test(url)) {
        // immer https
        url = url.replace(/^http:/, "https:");
        // immer Zitierform
        const webform = url.match(/^https:\/\/www\.deutschestextarchiv\.de\/book\/view\/(.+)\?p=(.+)$/);
        if (webform) {
          url = `https://www.deutschestextarchiv.de/${webform[1]}/${webform[2]}`;
        }
      }

      // Tag erzeugen
      const urlTag = document.createElementNS(ns, "URL");
      fundstelle.appendChild(urlTag);
      urlTag.appendChild(document.createTextNode(helferXml.maskieren({ text: url })));
    }

    // <Aufrufdatum>
    if (data.ud) {
      // <Aufrufdatum>
      // (Datum auch taggen, wenn keine URL da ist;
      // dann steht das Datum für den Tag, an dem z.B. der DWDS-Beleg importiert wurde)
      const aufrufdatum = document.createElementNS(ns, "Aufrufdatum");
      fundstelle.appendChild(aufrufdatum);
      const ud = data.ud.match(/(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})/);
      aufrufdatum.appendChild(document.createTextNode(`${ud.groups.day}.${ud.groups.month}.${ud.groups.year}`));
    }

    // <unstrukturiert>
    let qu = data.qu.split("\n")[0];
    qu = helfer.textTrim(qu, true);
    qu = qu.replace(/N\. ?N\./g, "N.\u00A0N.");
    const unstrukturiert = document.createElementNS(ns, "unstrukturiert");
    fundstelle.appendChild(unstrukturiert);
    let unstrukturiertTxt = helferXml.maskieren({ text: helfer.typographie(qu) });
    if (optionen.data.einstellungen["textkopie-xml-zeitungen"]) {
      const reg = new RegExp(` In: (${xml.zeitungen.join("|")})`, "i");
      if (reg.test(unstrukturiertTxt)) {
        unstrukturiertTxt = unstrukturiertTxt.replace(/.+? In: /, "");
      }
    }
    unstrukturiert.appendChild(document.createTextNode(unstrukturiertTxt));

    // Einzüge hinzufügen
    schnitt = helferXml.indent(schnitt);

    // Text in String umwandeln und aufbereiten
    let xmlStr = new XMLSerializer().serializeToString(schnitt);
    xmlStr = xmlStr.replace(/\sxmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, "");
    const zeichen = new Map([
      [ "&amp;amp;", "&amp;" ],
      [ "&amp;lt;", "&lt;" ],
      [ "&amp;gt;", "&gt;" ],
      [ "&amp;quot;", "&quot;" ],
      [ "&amp;apos;", "&apos;" ],
    ]);
    for (const [ k, v ] of zeichen) {
      const reg = new RegExp(k, "g");
      xmlStr = xmlStr.replace(reg, v);
    }

    // String zurückgeben
    return xmlStr;
  },

  // veschachtelte Hervorhebungen-Tags zusammenführen
  //   text = String
  //     (Text, in dem die Hervorhebungen zusammengeführt werden sollen)
  mergeHervorhebungen ({ text }) {
    const bak = text;
    const reg = /(?<start>(<Hervorhebung( Stil="#[^>]+")?>){2,})(?<text>[^<]+)(<\/Hervorhebung>)+/g;
    const h = reg.exec(text);
    if (h) {
      // das Folgende funktioniert natürlich nur gut, wenn die Tags direkt
      // ineinander verschachtelt sind; ansonsten produziert es illegales XML
      const stile = [];
      for (const i of [ ...h.groups.start.matchAll(/Stil="(#.+?)"/g) ]) {
        stile.push(i[1]);
      }
      let ersatz = "<Hervorhebung";
      if (stile.length) {
        ersatz += ` Stil="${stile.join(" ")}"`;
      }
      ersatz += `>${h.groups.text}</Hervorhebung>`;
      const reg = new RegExp(helfer.escapeRegExp(h[0]));
      text = text.replace(reg, ersatz);
      // ein Test, ob wohlgeformtes XML produziert wurde
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(`<Belegtext>${text}</Belegtext>`, "text/xml");
      if (xmlDoc.querySelector("parsererror")) {
        text = bak;
      }
    }
    return text;
  },

  // markierten Belegschnitt in die Zwischenablage kopieren
  schnittInZwischenablage () {
    const xmlStr = xml.schnitt();
    // Text kopieren
    modules.clipboard.write({
      text: xmlStr,
    });
    // Animation
    helfer.animation("zwischenablage");
  },

  // markierten Belegschnitt an das XML-Fenster schicken
  schnittInXmlFenster () {
    // Karteikarte noch nicht gespeichert?
    if (helfer.hauptfunktion === "karte" && !data.ka[popup.referenz.id]) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Karteikarte muss erst gespeichert werden.",
      });
      return;
    }
    // Sind Stichwort und Trennzeichen sichtbar?
    if (helfer.hauptfunktion === "karte" && !optionen.data.beleg.trennung) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Um diese Aktion auszuführen, müssen Sie die Anzeige der Trennzeichen im Kopf der Karteikarte aktivieren:\n• Icon <img src="img/trennzeichen.svg" width="24" height="24" alt="">',
      });
      return;
    }
    if (helfer.hauptfunktion === "liste" &&
        (!optionen.data.belegliste.trennung || !optionen.data.belegliste.wort_hervorheben)) {
      const funktionen = [];
      const icons = [];
      if (!optionen.data.belegliste.trennung) {
        funktionen.push("die Anzeige der Trennzeichen");
        icons.push('• Icon <img src="img/trennzeichen.svg" width="24" height="24" alt="">');
      }
      if (!optionen.data.belegliste.wort_hervorheben) {
        funktionen.push("die Hervorhebung des Karteiworts");
        icons.push('• Icon <img src="img/text-fett.svg" width="24" height="24" alt="">');
      }
      dialog.oeffnen({
        typ: "alert",
        text: `Um diese Aktion auszuführen, müssen Sie ${funktionen.join(" und ")} im Kopf der Karteikarte aktivieren:\n${icons.join("<br>")}`,
      });
      return;
    }
    // Daten zusammentragen
    const xmlStr = xml.schnitt();
    const datum = helferXml.datumFormat({ xmlStr });
    // Datensatz an XML-Fenster schicken
    const xmlDatensatz = {
      key: "bl",
      ds: {
        da: datum.anzeige,
        ds: datum.sortier,
        id: xml.belegId({}),
        xl: xmlStr,
      },
    };
    redXml.datensatz({ xmlDatensatz });
  },

  // alle in der Belegliste sichtbaren Belege ans XML-Fenster schicken
  async belegeInXmlFenster () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Redaktion &gt; Belege in XML-Fenster</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Ist die Belegliste sichtbar?
    if (!liste.listeSichtbar({ funktion: "Redaktion &gt; Belege in XML-Fenster" })) {
      return;
    }
    // keine Belege in der Liste
    const belege = document.querySelectorAll("#liste-belege .liste-kopf");
    if (!belege.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "In der Belegliste werden derzeit keine Belege angezeigt.",
      });
      return;
    }
    // Sicherheitsfrage
    let numerus = `Sollen die <i>${belege.length} Belege</i> aus der Belegliste wirklich alle`;
    if (belege.length === 1) {
      numerus = `Soll der <i>${liste.detailAnzeigenH3(belege[0].dataset.id)}</i> wirklich`;
    }
    const senden = await new Promise(resolve => {
      dialog.oeffnen({
        typ: "confirm",
        text: `${numerus} an das XML-Redaktionsfenster geschickt werden?`,
        callback: () => resolve(dialog.antwort),
      });
    });
    if (!senden) {
      return;
    }
    // Ist das XML-Redaktionsfenster schon offen?
    if (!redXml.contentsId) {
      await redXml.oeffnenPromise();
    }
    // Belege an XML-Fenster
    for (const i of belege) {
      const id = i.dataset.id;
      popup.referenz.data = data.ka[id];
      popup.referenz.id = id;
      // Absätzen erzeugen
      const container = document.createElement("div");
      const bs = data.ka[id].bs.replace(/\n\s*\n/g, "\n").split("\n");
      for (const i of bs) {
        const p = document.createElement("p");
        p.dataset.pnumber = 0; // wegen xml.schnitt()
        p.innerHTML = i;
        container.appendChild(p);
      }
      // Text aufbereiten
      const html = liste.belegWortHervorheben(container.innerHTML, true);
      popup.textauswahl.xml = helfer.clipboardXml(html);
      // Datensatz umwandeln an XML-Fenster schicken
      const xmlStr = xml.schnitt();
      const datum = helferXml.datumFormat({ xmlStr });
      const xmlDatensatz = {
        key: "bl",
        ds: {
          da: datum.anzeige,
          ds: datum.sortier,
          id: xml.belegId({}),
          xl: xmlStr,
        },
      };
      redXml.datensatz({ xmlDatensatz });
      // kurz warten
      await new Promise(resolve => setTimeout(() => resolve(true), 100));
    }
  },

  // Referenztag des Belegs in die Zwischenablage kopieren
  referenz () {
    const id = xml.belegId({});
    modules.clipboard.write({
      text: `<Belegreferenz Ziel="${id}"/>`,
    });
    helfer.animation("zwischenablage");
  },

  // Beleg-ID ermitteln
  //   data = Object | undefined
  //     (das Datenobjekt der betreffenden Karteikarte)
  //   id = String | undefined
  //     (ID der betreffenden Karteikarte)
  belegId ({ data = popup.referenz.data, id = popup.referenz.id }) {
    // Autor
    let autor = helfer.textTrim(data.au, true);
    if (!autor) {
      autor = "n-n";
    } else {
      autor = autor.split(",")[0];
      autor = autor.replace(/[;.:'"„“”‚‘»«›‹+*!?(){}[\]<>&]/g, "");
      autor = helfer.textTrim(autor, true);
      autor = autor.toLowerCase();
      autor = autor.replace(/[\s/]/g, "-");
    }
    // Jahr
    let jahr = "";
    const datum = helferXml.datum(data.da.replace(/0000[-–]/, "")).match(/[0-9]{4}/);
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
        return "#larger";
      case "dta-gesperrt":
        return "#g";
      case "dta-initiale":
        return "#in";
      case "dta-kapitaelchen":
        return "#k";
      case "dta-rot":
        return "#red";
      case "dta-doppelt":
        return "#uu";
    }
  },
};
