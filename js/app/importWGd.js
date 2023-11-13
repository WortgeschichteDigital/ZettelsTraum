"use strict";

const importWGd = {
  // XML-Import starten
  //   xmlStr = string
  //     (XML-Daten, nicht geparst)
  //   xmlDoc = document
  //     (XML-Daten, geparst)
  //   ansicht = string | undefined
  //     (url | file | zwischenablage)
  async startImport ({ xmlDoc, xmlStr, ansicht = "zwischenablage" }) {
    // neues Datenobjekt erzeugen
    let ds;
    if (ansicht === "zwischenablage") {
      // Daten stammen aus Zwischenablage oder den Importdaten der Karteikarte
      ds = importShared.importObject().ds;
    } else {
      // Daten stammen aus einer Datei
      importShared.fileData.data[0] = importShared.importObject();
      ds = importShared.fileData.data[0].ds;
    }

    // Datensatz: Datum
    const nDa = xmlDoc.querySelector("Fundstelle Datum");
    ds.da = nDa?.firstChild?.nodeValue || "";

    // Datensatz: Beleg
    ds.bs = await importWGd.transformXML(xmlStr);

    // Datensatz: Importdaten
    ds.bi = "xml-wgd";
    ds.bx = xmlStr;

    // Datensatz: Quelle
    const nQu = xmlDoc.querySelector("Fundstelle unstrukturiert");
    ds.qu = nQu?.firstChild?.textContent?.normalize("NFC") || "";

    // Datensatz: Autor
    let autoren = ds.qu.split(": ")[0];
    if (/: /.test(ds.qu) && /, /.test(autoren)) {
      autoren = autoren.replace(/ \(H(rs)?g\.\)/, "");
      autoren = autoren.replace(/ u\.\sa\./, "");
      const autorenArr = autoren.split("/");
      for (let i = 0, len = autorenArr.length; i < len; i++) {
        if (/, /.test(autorenArr[i])) {
          autorenArr[i] = autorenArr[i].trim();
        } else {
          const reverse = autorenArr[i].split(" ");
          autorenArr[i] = reverse[1].trim() + ", " + reverse[0].trim();
        }
      }
      while (autorenArr.length > 3) {
        autorenArr.pop();
      }
      ds.au = autorenArr.join("/");
    } else {
      ds.au = "N.\u00A0N.";
    }

    // Datensatz: URL
    const nURL = xmlDoc.querySelector("Fundstelle URL");
    ds.ul = nURL?.firstChild?.nodeValue || "";

    // Datensatz: Aufrufdatum
    if (ds.ul) {
      const nAuf = xmlDoc.querySelector("Fundstelle Aufrufdatum");
      let auf = "";
      if (nAuf?.firstChild?.nodeValue) {
        const aufMatch = nAuf.firstChild.nodeValue.match(/^(?<day>[0-9]{2})\.(?<month>[0-9]{2})\.(?<year>[0-9]{4})$/);
        auf = `${aufMatch.groups.year}-${aufMatch.groups.month}-${aufMatch.groups.day}`;
      }
      ds.ud = auf || new Date().toISOString().split("T")[0];
    }

    // Datensatz: Korpus
    const nKr = xmlDoc.querySelector("Fundstelle Fundort");
    const korpus = nKr?.firstChild?.nodeValue || "";
    if (!/^(Bibliothek|online)$/.test(korpus)) {
      ds.kr = korpus
    }

    // Karteikarte füllen
    const result = await importShared.fillCard(ds);
    if (result && ansicht !== "zwischenablage") {
      importShared.fileData.data[0].importiert = true;
    }
    return result;
  },

  // XSL stylsheet
  transformXSL: "",

  // transform the passed XML snippet
  //   xml = string
  async transformXML (xml) {
    // load XSL if needed
    if (!importWGd.transformXSL) {
      await helfer.resourcesLoad({
        file: "xml-import-wgd.xsl",
        targetObj: importWGd,
        targetKey: "transformXSL",
      });
      if (!importWGd.transformXSL) {
        return "";
      }
    }

    // prepare XSLT
    const xslt = helferXml.parseXML(importWGd.transformXSL, "application/xml");
    const processor = new XSLTProcessor();
    processor.importStylesheet(xslt);

    // transform XML
    const xmlOri = helferXml.parseXML(xml);
    const xmlTrans = processor.transformToDocument(xmlOri);
    let result = new XMLSerializer().serializeToString(xmlTrans);

    // extract body
    result = result.match(/<body>(.+)<\/body>/s)[1];

    // amend HTML result
    result = importTEI.transformHTML(result);

    // map rendition styles
    const styleMap = {
      "#aq": "tei-antiqua",
      "#larger": "tei-groesser",
      "#g": "tei-gesperrt",
      "#in": "tei-initiale",
      "#k": "tei-kapitaelchen",
      "#uu": "tei-doppelt",
    };
    result = result.replace(/data-rendition="(.+?)"/g, (...args) => {
      const cl = new Set();
      for (const i of args[1].split(" ")) {
        if (styleMap[i]) {
          cl.add(styleMap[i]);
        }
      }
      return `class="${[ ...cl ].join(" ")}"`;
    });

    // finish up
    return result;
  },
};
