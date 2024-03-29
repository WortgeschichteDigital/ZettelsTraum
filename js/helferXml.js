"use strict";

const helferXml = {
  // XML-String parsen
  //   xmlStr = string
  //   mimeType = string | undefined
  parseXML (xmlStr, mimeType = "text/xml") {
    const xmlDoc = new DOMParser().parseFromString(xmlStr, mimeType);
    if (xmlDoc.querySelector("parsererror")) {
      return null;
    }
    return xmlDoc;
  },

  // Standard XML-Namespaces auflösen
  nsResolver (prefix) {
    switch (prefix) {
      // TEI
      case "t":
        return "http://www.tei-c.org/ns/1.0";
      // MODS
      case "m":
        return "http://www.loc.gov/mods/v3";
      // XML
      case "xml":
        return "http://www.w3.org/XML/1998/namespace";
      // ZDL
      case "z":
        return "http://www.zdl.org/ns/1.0";
      default:
        return "";
    }
  },

  // Fundort anhand der URL ermitteln
  //   url = String
  //     (URL, aus der der Fundort abgeleitet werden soll)
  fundort ({ url }) {
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
      bg: [], // Bedeutungsgerüste
      bl: [], // Belege
      le: [], // Lemmata
      lt: [], // Literatur
      md: { // Metadaten
        id: "", // Artikel-ID
        re: [], // Revisionen
        tf: [], // Themenfeld
        ty: "", // Artikeltyp
      },
      tx: [], // Text
      wi: {}, // Wortinformationen
    };
  },

  // Datum extrahieren
  //   text = String
  //     (Text, aus dem heraus das Datum extrahiert werden soll)
  //   normJh = false | undefined
  //     (die Jahrhundertangabe soll in eine Jahreszahl umgewandelt werden)
  //   sonder = true | undefined
  //     (die übergebene Textstelle soll auf spezielle Formate überprüft werden)
  datum (text, normJh = true, sonder = false) {
    // Sonderformate
    // (übliche Jahresangaben in DeReKo-Quellen suchen)
    const sonderformate = [];
    if (sonder) {
      const formate = [
        /(([0-9]{4})\/[0-9]{2})(?![0-9])/, // 1848/49
        /(?<!Sp?\. )(([0-9]{4})[-–][0-9]{4})/, // 1850–1853
        /zwischen (([0-9]{4}) und [0-9]{4})/, // zwischen 1850 und 1853
      ];
      for (const reg of formate) {
        const m = text.match(reg);
        if (m) {
          const f = {
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
    const formate = [
      /(?<tag>[0-9]{1,2})\.\s*(?<monat>[0-9]{1,2})\.\s*(?<jahr>[0-9]{4})/,
      /(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})/,
      /(?<jahr>[0-9]{4})/,
      /(?<jahrhundert>[0-9]{2})\.\sJh\./,
    ];
    let jahr = "";
    let monat = 0;
    let tag = 0;
    for (const reg of formate) {
      const m = text.match(reg);
      if (m) {
        if (m.groups.jahrhundert) {
          if (normJh) {
            jahr = `${parseInt(m.groups.jahrhundert, 10) - 1}00`; // sehr unschön
          } else {
            jahr = `${m.groups.jahrhundert}.\u00A0Jh.`;
          }
        } else {
          // steht vor diesem Datum ein anderes Datum, das Vorrang hat?
          const before = text.substring(0, m.index);
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
      for (const i of sonderformate) {
        if (i.jahr === jahr) {
          return i.format;
        }
      }
    }
    if (jahr) {
      if (!monat || !tag) {
        return jahr;
      }
      return `${tag < 10 ? "0" : ""}${tag}.${monat < 10 ? "0" : ""}${monat}.${jahr}`;
    }
    return "";
  },

  // Datum ermitteln und als solches und in einem Sortierformat zurückgeben
  //   xmlStr = String
  //     (String mit XML-Tags)
  datumFormat ({ xmlStr }) {
    const datum = xmlStr.match(/<Datum>(.+?)<\/Datum>/)[1];
    return helfer.datumGet({ datum });
  },

  // geschützte Zeichen maskieren
  //   text = String
  //     (String, der maskiert werden soll)
  //   demaskieren = true | undefined
  //     (geschützte Zeichen demaskieren)
  maskieren ({ text, demaskieren = false }) {
    const zeichen = new Map([
      [ "&", "&amp;" ],
      [ "<", "&lt;" ],
      [ ">", "&gt;" ],
      [ '"', "&quot;" ],
      [ "'", "&apos;" ],
    ]);
    for (const [ k, v ] of zeichen) {
      let zReg = k;
      let zRep = v;
      if (demaskieren) {
        zReg = v;
        zRep = k;
      }
      const reg = new RegExp(zReg, "g");
      text = text.replace(reg, zRep);
    }
    return text;
  },

  // ID normieren
  //   id = String
  //     (die ID)
  //   input = Element | undefined
  //     (das Input-Element, aus dem die ID ausgelesen wurde)
  normId ({ id, input = null }) {
    // erhalten bleiben: . - _
    let val = id.replace(/^[0-9\-.·]+|[!§$%&/()[\]{}<>=?\\^°|*+#:,;'"„“‚‘»«›‹’`´]+/g, "");
    val = val.replace(/–/g, "-"); // Halbgeviertstriche
    val = val.replace(/\s+/g, "_");
    if (input && val !== id) {
      input.value = val;
    }
    return val;
  },

  // XSL, um XML-Dokumente mit Einzügen zu versehen
  // (wird vor dem Entsperren des Fensters aus resources geladen)
  indentXsl: "",

  // XML-Dokument mit Einzügen versehen
  // (s. https://stackoverflow.com/a/376503)
  //   xml = Document
  //     (das XML-Snippet)
  indent (xml) {
    const xslt = helferXml.parseXML(helferXml.indentXsl, "application/xml");
    const processor = new XSLTProcessor();
    processor.importStylesheet(xslt);
    return processor.transformToDocument(xml);
  },

  // XML-Snippet einfärben
  //   xmlStr = String
  //     (das XML-Snippet, das eingefärbt werden soll)
  //   xmlErr = Object | null | undefined
  prettyPrint ({ xmlStr, xmlErr = null }) {
    // geschützte Leerzeichen markieren
    xmlStr = xmlStr.replace(/\u{a0}/ug, "␣");
    // horizontale Ellipse zu drei Punkte (wird in Noto Mono weird dargestellt)
    xmlStr = xmlStr.replace(/…/g, "...");
    // ggf. Fehler markieren
    if (xmlErr) {
      const xmlStrLines = xmlStr.split("\n");
      const errLine = xmlStrLines[xmlErr.line - 1];
      let start = errLine.slice(0, xmlErr.column - 1);
      let end = errLine.slice(xmlErr.column - 1);
      if (!/</.test(start) || !/>/.test(start)) {
        if (!xmlStr) { // Textfeld leer => dieses im Fehler vermerken
          xmlStrLines[xmlErr.line - 1] = '<span class="xml-empty">kein Text</span>';
        } else { // ganze Zeile markieren
          xmlStrLines[xmlErr.line - 1] = `<span class="xml-err">${errLine}</span>`;
        }
      } else if (xmlErr.entity) {
        // Text zwischen Tags markieren (Entity-Fehler)
        const idx = start.lastIndexOf(">");
        const start1 = start.slice(0, idx);
        const start2 = start.slice(idx);
        start = `${start1}><span class="xml-err">${start2.substring(1)}`;
        end = end.replace(/</, "</span><");
        xmlStrLines[xmlErr.line - 1] = start + end;
      } else {
        // Tag markieren
        const idx = start.lastIndexOf("<");
        const start1 = start.slice(0, idx);
        let start2 = start.slice(idx);
        if (/>/.test(start2)) {
          start2 = start2.replace(/<.+?>/, m => `<span class="xml-err">${m}</span>`);
        } else {
          start2 = start2.replace(/</, '<span class="xml-err"><');
          end = end.replace(/>/, "></span>");
        }
        xmlStrLines[xmlErr.line - 1] = start1 + start2 + end;
      }
      // Zeilen zusammenfügen, Zeichen maskieren, Fehlermarkierung demaskieren
      xmlStr = xmlStrLines.join("\n");
      xmlStr = helferXml.maskieren({ text: xmlStr });
      xmlStr = xmlStr.replace(/&lt;span class=&quot;xml-(err|empty)&quot;&gt;(.+?)&lt;\/span&gt;/, (m, p1, p2) => `<span class="xml-${p1}">${p2}</span>`);
    } else {
      // Zeichen maskieren
      xmlStr = helferXml.maskieren({ text: xmlStr });
    }
    // farbliche Hervorhebungen
    xmlStr = xmlStr.replace(/&lt;.+?&gt;/g, m => {
      if (/^&lt;!--/.test(m)) {
        return `<span class="xml-comment">${m}</span>`;
      }
      return `<span class="xml-tag">${m}</span>`;
    });
    xmlStr = xmlStr.replace(/<span class="xml-tag">(.+?)<\/span>/g, (m, p1) => {
      p1 = p1.replace(/ (.+?=)(&quot;.+?&quot;)/g, (m, p1, p2) => ` <span class="xml-attr-key">${p1}</span><span class="xml-attr-val">${p2}</span>`);
      return `<span class="xml-tag">${p1}</span>`;
    });
    // Ergebnis zurückgeben
    return xmlStr;
  },

  // Abkürzungen Fließtext
  abbr: {
    "Abb\\.": "Abbildung",
    "Adj\\.": "Adjektiv",
    "Adv\\.": "Adverb",
    "Akk\\.": "Akkusativ",
    "Art\\.": "Artikel",
    "attr\\.": "attributiv",
    "Attr\\.": "Attribut",
    "Bed\\.": "Bedeutung",
    "bes\\.": "besonders",
    "bspw\\.": "beispielsweise",
    "bzw\\.": "beziehungsweise",
    "ca\\.": "circa",
    "Dat\\.": "Dativ",
    "Dem\\.pron\\.": "Demonstrativpronomen",
    "dgl\\.": "dergleichen",
    "d\\.\\sh\\.": "das heißt",
    "d\\.\\si\\.": "das ist",
    "e\\.\\sV\\.": "eingetragener Verein",
    "eigentl\\.": "eigentlich",
    "etc\\.": "et cetera",
    "ff\\.": "folgende",
    "f\\.": "Femininum",
    "fem\\.": "feminin",
    "Fem\\.": "Femininum",
    "Fut\\.": "Futur",
    "Gen\\.": "Genitiv",
    "ggf\\.": "gegebenenfalls",
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
    "o\\.\\sä\\.": "oder ähnlich",
    "o\\.\\sÄ\\.": "oder Ähnliches",
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
    "s\\.\\so\\.": "siehe oben",
    "s\\.\\su\\.": "siehe unten",
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
    "u\\.\\sÄ\\.": "und Ähnliches",
    "u\\.": "und",
    "usw\\.": "und so weiter",
    "v\\.\\sa\\.": "vor allem",
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
    "(?<=[0-9]\\s?)ff?\\.": "folgende",
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
  abbrTagger ({ text, lit = false }) {
    let abbr = helferXml.abbr;
    let notBefore = '(?<!(<Abkuerzung Expansion=".+?">|\\p{Letter}|\u00A0))';
    if (lit) {
      abbr = helferXml.abbrLit;
      notBefore = '(?<!(<Abkuerzung Expansion=".+?">|\\p{Letter}))';
    }
    for (const [ k, v ] of Object.entries(abbr)) {
      const r = new RegExp(notBefore + k, "ug");
      text = text.replace(r, m => `<Abkuerzung Expansion="${v}">${m}</Abkuerzung>`);
    }
    return text;
  },
};
