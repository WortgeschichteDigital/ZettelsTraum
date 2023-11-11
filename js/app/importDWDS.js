"use strict";

const importDWDS = {
  // Liste der Abkürzungen häufig verwendeter Korpora
  // mit Name des Korpus und Textsorte
  korpora: {
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

  // Platzhalter in DWDS-Snippets für unbekannte Namen
  platzhalterName: /^(Name|Nn|o\.\s?A\.|unknown|unkown)$/,

  // Import-Objekt erzeugen
  importObject () {
    const data = importShared.importObject();
    data.ds.au = "N.\u00A0N.";
    data.ds.kr = "DWDS";
    return data;
  },

  // XML-Import starten
  //   xmlStr = string
  //     (XML-Daten, nicht geparst)
  //   xmlDoc = document
  //     (XML-Daten, geparst)
  //   ansicht = string | undefined
  //     (url | file | zwischenablage)
  //   returnResult = true | undefined
  //     (das Ergebnis der Analyse soll nicht in den Datei-Zwischenspeicher
  //     geschrieben, sondern direkt zurückgegeben werden)
  async startImportXML ({ xmlDoc, xmlStr, ansicht = "zwischenablage", returnResult = false }) {
    // neues Datenobjekt erzeugen
    let ds;
    if (ansicht === "zwischenablage" || returnResult) {
      // Daten stammen aus Zwischenablage oder den Importdaten der Karteikarte
      ds = importDWDS.importObject().ds;
    } else {
      // Daten stammen aus einer Datei
      importShared.fileData.data[0] = importDWDS.importObject();
      ds = importShared.fileData.data[0].ds;
    }

    // Datensatz: Datum
    const nDa = xmlDoc.querySelector("Fundstelle Erstpublikation") || xmlDoc.querySelector("Fundstelle Datum");
    ds.da = nDa?.firstChild?.nodeValue || "";

    // Datensatz: Autor
    const nAu = xmlDoc.querySelector("Fundstelle Autor");
    if (nAu?.firstChild) {
      ds.au = importDWDS.korrekturen({
        typ: "au",
        txt: nAu.firstChild.nodeValue,
      });
    }

    // Datensatz: Beleg
    const nBs = xmlDoc.querySelector("Belegtext");
    if (nBs?.firstChild) {
      const bs = [];
      let bsContent = nBs.textContent.replace(/<Stichwort>(.+?)<\/Stichwort>/g, (...args) => args[1]);
      bsContent = bsContent.normalize("NFC");
      bsContent = importDWDS.korrekturen({
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
      ds.bs = bs.join("\n\n");
    }

    // Datensatz: Beleg-XML
    ds.bi = "xml-dwds";
    ds.bx = xmlStr;

    // Datensatz: Quelle
    const nQu = xmlDoc.querySelector("Fundstelle Bibl");
    if (nQu?.firstChild) {
      // Titel
      const nTitel = xmlDoc.querySelector("Fundstelle Titel");
      const nSeite = xmlDoc.querySelector("Fundstelle Seite");
      const titeldaten = {
        titel: nTitel?.firstChild?.nodeValue || "",
        seite: nSeite?.firstChild?.nodeValue || "",
      };
      importDWDS.korrekturen({
        typ: "qu",
        txt: nQu.firstChild.nodeValue,
        ds,
        titeldaten,
      });

      // URL und Aufrufdatum
      const nURL = xmlDoc.querySelector("Fundstelle URL");
      ds.ul = nURL?.firstChild?.nodeValue || "";
      if (ds.ul) {
        const nAuf = xmlDoc.querySelector("Fundstelle Aufrufdatum");
        let auf = "";
        if (nAuf?.firstChild?.nodeValue) {
          const aufSp = nAuf?.firstChild?.nodeValue.split(".");
          auf = `${aufSp[2]}-${aufSp[1]}-${aufSp[0]}`;
        }
        ds.ud = auf || new Date().toISOString().split("T")[0];
      }
    }

    // Datensatz: Korpus
    let korpus = "";
    const nKr = xmlDoc.querySelector("Fundstelle Korpus");
    if (nKr?.firstChild) {
      korpus = nKr.firstChild.nodeValue;
      if (/^dta/.test(korpus)) {
        if (korpus.length > 3) {
          korpus = "DTA: " + korpus.substring(3).toUpperCase();
          ds.kr = korpus;
        } else {
          korpus = "dta";
        }
      }
      ds.kr = importDWDS.korpora?.[korpus]?.kr || `DWDS: ${korpus}`;
    }

    // Datensatz: Textsorte
    const nTs = xmlDoc.querySelector("Fundstelle Textklasse");
    if (importDWDS.korpora?.[korpus]?.ts) {
      ds.ts = importDWDS.korpora[korpus].ts;
    } else if (nTs?.firstChild) {
      ds.ts = importDWDS.korrekturen({
        typ: "ts",
        txt: nTs.firstChild.nodeValue,
      });
    }

    // Datensatz: Notizen
    const nDok = xmlDoc.querySelector("Fundstelle Dokument");
    if (nDok?.firstChild) {
      ds.no = importDWDS.korrekturen({
        typ: "no",
        txt: nDok.firstChild.nodeValue,
        ds,
        korpus,
      });
    }

    // Datensatz zurückgeben oder Karteikarte füllen
    if (returnResult) {
      return ds;
    }
    const result = await importShared.fillCard(ds);
    if (result && ansicht !== "zwischenablage") {
      importShared.fileData.data[0].importiert = true;
    }
    return result;
  },

  // JSON-Import starten
  //   json = object
  startImportJSON (json) {
    // Datensätze parsen
    for (const i of json) {
      // Datensatz erzeugen
      importShared.fileData.data.push(importDWDS.importObject());
      const ds = importShared.fileData.data.at(-1).ds;

      // Datum
      if (i.meta_.firstDate || i.meta_.date_) {
        ds.da = i.meta_.firstDate || i.meta_.date_;
        if (/-12-31$/.test(ds.da) && i.meta_.pageRange) {
          ds.da = ds.da.replace(/-.+/, "");
        }
      }

      // Autor
      if (i.meta_.author) {
        ds.au = importDWDS.korrekturen({
          typ: "au",
          txt: i.meta_.author,
        });
      }

      // Beleg
      const bs = [];
      for (const s of i.ctx_) {
        let satz = "";
        if (typeof s === "string") {
          satz = s;
        } else {
          for (const w of s) {
            if (w.ws === "1") {
              satz += " ";
            }
            satz += w.w;
          }
        }
        satz = helfer.textTrim(satz, true);
        satz = satz.normalize("NFC");
        satz = importDWDS.korrekturen({
          typ: "bs",
          txt: satz,
        });
        bs.push(satz);
      }
      ds.bs = bs.join("\n\n").trim();

      // Quelle
      if (i.meta_.bibl) {
        const titeldaten = {
          titel: i.meta_.title || "",
          seite: i.meta_.page_ || "",
        };
        importDWDS.korrekturen({
          typ: "qu",
          txt: i.meta_.bibl,
          ds,
          titeldaten,
        });
        let url = i.meta_.url || "";
        if (!url &&
            /^dta/.test(i.collection) &&
            i.meta_.basename &&
            i.matches?.[0]?.page) {
          url = `https://www.deutschestextarchiv.de/${i.meta_.basename}/${i.matches[0].page}`;
        }
        ds.ul = url;
        if (url) {
          ds.ud = i.meta_.urlDate || new Date().toISOString().split("T")[0];
        }
      }

      // Korpus
      let korpus = "";
      if (i.collection) {
        korpus = i.collection;
        if (/^dta/.test(i.collection)) {
          if (korpus.length > 3) {
            korpus = "DTA: " + korpus.substring(3).toUpperCase();
            ds.kr = korpus;
          } else {
            korpus = "dta";
          }
        }
        ds.kr = importDWDS.korpora?.[korpus]?.kr || `DWDS: ${korpus}`;
      }

      // Textsorte
      if (importDWDS.korpora?.[korpus]?.ts) {
        ds.ts = importDWDS.korpora[korpus].ts;
      } else if (i.textclass) {
        ds.ts = importDWDS.korrekturen({
          typ: "ts",
          txt: i.textclass,
        });
      }

      // Notizen
      if (i.meta_.basename) {
        ds.no = importDWDS.korrekturen({
          typ: "no",
          txt: i.meta_.basename,
          ds,
          korpus,
        });
      }

      // Beleg-XML
      let xmlStr = "<Beleg>";
      xmlStr += `<Belegtext>${helferXml.maskieren({ text: ds.bs })}</Belegtext>`;
      xmlStr += "<Fundstelle>";
      if (i.meta_.urlDate) {
        xmlStr += `<Aufrufdatum>${i.meta_.urlDate}</Aufrufdatum>`;
      }
      if (i.meta_.author) {
        xmlStr += `<Autor>${helferXml.maskieren({ text: i.meta_.author })}</Autor>`;
      }
      if (i.meta_.bibl) {
        xmlStr += `<Bibl>${helferXml.maskieren({ text: i.meta_.bibl })}</Bibl>`;
      }
      if (ds.da) {
        xmlStr += `<Datum>${ds.da}</Datum>`;
      }
      if (i.meta_.basename) {
        xmlStr += `<Dokument>${i.meta_.basename}</Dokument>`;
      }
      if (i.collection) {
        xmlStr += `<Korpus>${i.collection}</Korpus>`;
      }
      if (i.meta_.page_) {
        xmlStr += `<Seite>${i.meta_.page_}</Seite>`;
      }
      if (i.textclass) {
        xmlStr += `<Textklasse>${i.textclass}</Textklasse>`;
      }
      if (i.meta_.title) {
        xmlStr += `<Titel>${helferXml.maskieren({ text: i.meta_.title })}</Titel>`;
      }
      if (i.meta_.url) {
        xmlStr += `<URL>${helferXml.maskieren({ text: i.meta_.url })}</URL>`;
      }
      xmlStr += "</Fundstelle></Beleg>";
      const xmlDoc = helferXml.parseXML(xmlStr);
      const xmlDocIndent = helferXml.indent(xmlDoc);
      ds.bi = "xml-dwds";
      ds.bx = new XMLSerializer().serializeToString(xmlDocIndent);
    }
  },

  // Korrekturen
  //   typ = string
  //     (Datensatz)
  //   txt = string
  //     (Text)
  //   ds = object | undefined
  //     (Datenobjekt für Korrekturen, die nicht nur einen Datensatz betreffen)
  //   titeldaten = object | undefined
  //     (ergänzende Titeldaten)
  //   korpus = string
  //     (das DWDS-Korpus)
  korrekturen ({ typ, txt, ds, titeldaten, korpus }) {
    // AUTOR
    if (typ === "au") {
      // Autor-ID entfernen
      // (bei Snippets aus dem DTA)
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
      //   - Satz- und Leerzeichen am Anfang entfernen (kommt wirklich vor!)
      //   - Leerzeichen um Slashes entfernen
      //   - häufig wird die Autorangabe "Von Karl Mustermann" fälschlicherweise als kompletter Autor angegeben
      txt = txt.replace(/^[!?.,;: ]+/, "");
      txt = txt.replace(/\s\/\s/g, "/");
      txt = txt.replace(/^Von /, "");

      // Autorname eintragen
      //   - merkwürdige Platzhalter für "Autor unbekannt"
      //   - Autorname ist nur ein Kürzel in Kleinbuchstaben
      //   - Autorname in Initialen, aber ohne Spatium
      // (!txt kann deswegen sein, weil die Funktion auch von beleg.toolsQuelleLaden() genutzt wird)
      if (!txt || importDWDS.platzhalterName.test(txt)) {
        return "N.\u00A0N.";
      } else if (!/[A-ZÄÖÜ]/.test(txt)) {
        return `N.\u00A0N. [${txt}]`;
      } else if (/^[A-Z]\.[A-Z]\.$/.test(txt)) {
        return txt.replace(/\./, ".\u00A0");
      }

      // Form "Vorname Nachname" zu "Nachname, Vorname"
      const leerzeichen = txt.match(/\s/g);
      if (!/,\s/.test(txt) &&
          !/^[A-Z]\.\s[A-Z]\.$/.test(txt) &&
          leerzeichen?.length === 1) {
        const txtSp = txt.split(/\s/);
        return `${txtSp[1]}, ${txtSp[0]}`;
      }
      return txt;

    // BELEG
    } else if (typ === "bs") {
      return txt.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // QUELLE
    } else if (typ === "qu") {
      // Unicode-Normalisierung
      ds.qu = txt.normalize("NFC");

      // eine Verrenkung wegen der häufig merkwürdigen Zitierweise
      ds.qu = ds.qu.replace(/ Zitiert nach:.+/, "");
      const jahrDatierung = ds.da.match(/[0-9]{4}/);
      const jahrQuelle = ds.qu.matchAll(/(?<!S. )(?<![0-9])([0-9]{4})/g);
      let jahrQuelleStr = "";
      for (const i of jahrQuelle) {
        jahrQuelleStr = i[1];
      }
      if (!/\[[0-9]{4}\]/.test(ds.qu) &&
          jahrDatierung && jahrQuelleStr &&
          jahrDatierung[0] !== jahrQuelleStr) {
        const datierung = parseInt(jahrDatierung[0], 10);
        const quelle = parseInt(jahrQuelleStr, 10);
        let publikation = `${quelle} [${datierung}]`;
        if (quelle > datierung) {
          publikation = `${quelle} [zuerst ${datierung}]`;
        }
        const idx = ds.qu.lastIndexOf("" + quelle);
        ds.qu = ds.qu.substring(0, idx) + publikation + ds.qu.substring(idx + 4);
      }

      // ggf. Autor und Titel ergänzen
      if (titeldaten.titel) {
        let titel = titeldaten.titel;
        if (/^o\.\s?T\.$|^Jahrbuch des Schweizer Alpen-Clubs/.test(titel)) {
          titel = "";
        }
        if (titel && !ds.qu.includes(titel)) {
          const qu = ds.qu;
          ds.qu = `${ds.au}: ${titel}`;
          if (!/[.!?]$/.test(ds.qu)) {
            ds.qu += ".";
          }
          ds.qu += ` In: ${qu}`;
        }
      }

      // ggf. "o. A." am Anfang der Quellenangabe ersetzen
      if (/^o\.\s?A\./.test(ds.qu)) {
        ds.qu = ds.qu.replace(/^o\.\s?A\./, "N.\u00A0N.");
      }

      // ggf. Seite ergänzen
      if (titeldaten.seite) {
        if (!ds.qu.includes(`S. ${titeldaten.seite}`)) {
          if (/\.$/.test(ds.qu)) {
            ds.qu = ds.qu.substring(0, ds.qu.length - 1);
          }
          ds.qu += `, S.\u00A0${titeldaten.seite}`;
        }
      }

      // ggf. Punkt am Ende der Quellenangabe ergänzen
      if (!/[.!?]$/.test(ds.qu)) {
        ds.qu += ".";
      }

      // Tagesdaten ggf. aufhübschen
      const datum = ds.qu.match(/(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})/);
      if (datum) {
        const reg = new RegExp(helfer.escapeRegExp(datum[0]));
        ds.qu = ds.qu.replace(reg, `${datum.groups.tag.replace(/^0/, "")}.\u00A0${datum.groups.monat.replace(/^0/, "")}. ${datum.groups.jahr}`);
      }

      // typographische Verbesserungen
      ds.qu = helfer.typographie(ds.qu);

      // Steht in der Quellenangabe der Autor in der Form "Nachname, Vorname",
      // im Autor-Feld aber nicht?
      const auQu = ds.qu.split(": ");
      const auQuKommata = auQu[0].match(/, /g);
      if (auQuKommata?.length === 1 &&
          !/, /.test(ds.au)) {
        const autorQu = auQu[0].replace(/,/g, "").split(/\s/);
        const autorAu = ds.au.split(/\s/);
        if (auQu[0] !== ds.au &&
            autorQu.length === autorAu.length) {
          let autorAendern = true;
          for (const i of autorAu) {
            if (!autorQu.includes(i)) {
              autorAendern = false;
              break;
            }
          }
          if (autorAendern) {
            ds.au = auQu[0];
          }
        }
      }

      // Steht im Autor-Feld kein Name, in der Quelle scheint aber einer zu sein?
      if ((!ds.au || /^N.\s?N.$/.test(ds.au)) && auQu.length > 1 &&
          (auQuKommata?.length === 1 ||
          /\su\.\s/.test(auQu[0]))) {
        ds.au = auQu[0].replace(/\su\.\s/g, "/");
      }

    // TEXTSORTE
    } else if (typ === "ts") {
      if (!/::/.test(txt)) {
        return txt.split(":")[0];
      }
      let ts = "";
      const tsSp = txt.split("::");
      for (let i = 0, len = tsSp.length; i < len; i++) {
        const tsClean = helfer.textTrim(tsSp[i], true);
        if (!tsClean || /^[A-ZÄÖÜ]{2,}/.test(tsClean)) {
          continue;
        }
        if (i > 0) {
          ts += ": ";
        }
        ts += tsClean;
      }
      return ts;

    // NOTIZEN
    } else if (typ === "no") {
      // wenn Korpus vorhanden => Notizenfeld füllen
      if (korpus) {
        // Lemma ermitteln, das tatsächlich im Belegtext zu finden ist
        const lemmata = [];
        for (const lemma of data.la.la) {
          for (const schreibung of lemma.sc) {
            if (/ /.test(schreibung)) {
              // Wortverbindungen ignorieren
              continue;
            }
            lemmata.push(schreibung);
          }
        }
        lemmata.sort((a, b) => b.length - a.length);
        let lemma = "";
        for (const l of lemmata) {
          const form = helfer.formVariRegExpRegs.find(i => i.wort === l);
          if (!form) {
            continue;
          }
          const reg = new RegExp(`(^|[${helfer.ganzesWortRegExp.links}])${form.reg}($|[${helfer.ganzesWortRegExp.rechts}])`, "i");
          if (reg.test(ds.bs)) {
            lemma = form.wort;
            break;
          }
        }

        // Query zusammenbauen
        const woerter = lemma || lemmata.join(" && ");
        const query = encodeURIComponent(`${woerter} #HAS[basename,'${txt}']`);

        // ggf. Zeitungsname in die erste Zeile schreiben
        let ersteZeile = "\n";
        if (optionen.data.einstellungen["notizen-zeitung"] &&
            importDWDS.korpora?.[korpus]?.ts === "Zeitung") {
          ersteZeile = `${importDWDS.korpora[korpus].kr.split(": ")[1]}\n\n`;
        }

        // 1. Zeile frei lassen
        // (hier werden mitunter Notizen der BearbeiterIn eingetragen,
        // die in der Belegliste angezeigt werden sollen)
        return `${ersteZeile}Beleg im DWDS: https://www.dwds.de/r?format=max&q=${query}&corpus=${korpus}`;
      }

      // 1. Zeile frei lassen (s.o.)
      return `\n${txt}`;
    }
  },
};
