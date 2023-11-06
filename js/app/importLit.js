"use strict";

const importLit = {
  // Literaturtiteldaten importieren
  //   xmlDoc = document
  //     (XML-Dokument, geparst)
  //   xmlStr = string
  //     (XML-Dokument, nicht geparst)
  //   type = string
  //     (Importtyp)
  //   ansicht = string
  //     (url | datei | zwischenablage)
  async startImport ({ xmlDoc, xmlStr, type, ansicht }) {
    if (ansicht !== "datei") {
      importShared.fileDataReset();
    }
    const titel = [];

    if (type === "xml-fundstelle") {
      // FUNDSTELLE
      const fundstellen = xmlDoc.evaluate("//Fundstelle", xmlDoc, null, XPathResult.ANY_TYPE, null);
      let item = fundstellen.iterateNext();
      while (item) {
        titel.push(redLit.eingabeXMLFundstelle({
          xmlDoc: item,
          xmlStr: item.outerHTML,
        }));
        item = fundstellen.iterateNext();
      }
    } else if (type === "xml-mods") {
      // MODS
      const ds = redLit.eingabeXMLMODS({ xmlDoc, xmlStr });
      titel.push(ds);
    }

    // Titeldaten in Zwischenspeicher für Dateiimporte schreiben
    importShared.fileData.data = titel;

    // Import anstoßen
    const result = await importShared.fileDataImport();
    return result;
  },
};
