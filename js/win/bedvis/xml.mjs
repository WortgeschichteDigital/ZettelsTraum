
import data from "./data.mjs";
import load from "./load.mjs";

import dialog from "../../dialog.mjs";
import shared from "../../shared.mjs";
import sharedXml from "../../sharedXml.mjs";

export { xml as default };

const xml = {
  // load XML data
  //   visData = object
  //   xmlData = object
  async load (visData = load.data.vis, xmlData = data.vis.xml) {
    if (visData.qu.ty === "xml") {
      // read data from XML file
      const exists = await bridge.ipc.invoke("file-exists", visData.qu.pa);
      if (!exists) {
        dialog.oeffnen({
          typ: "alert",
          text: 'Beim Laden der Daten aus der XML-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">XML-Datei existiert nicht mehr</p>',
        });
        return false;
      }

      const file = await bridge.ipc.invoke("file-read", {
        path: visData.qu.pa,
      });
      if (file.message) {
        dialog.oeffnen({
          typ: "alert",
          text: `Beim Laden der Daten aus der XML-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${file.name}: ${file.message}</p>`,
        });
        return false;
      }

      xmlData.file = file;
    } else {
      // get data from cardbox file
      xmlData.file = null;
      bridge.ipc.invoke("webcontents-bridge", {
        id: data.mainContentsId,
        channel: "bedvis-xml-data-send",
        data: null,
      });

      let timeoutReached = false;
      const timeout = setTimeout(() => {
        timeoutReached = true;
      }, 3e3);
      while (xmlData.file === null && !timeoutReached) {
        await new Promise(resolve => setTimeout(() => resolve(true), 40));
      }
      clearTimeout(timeout);

      if (timeoutReached) {
        dialog.oeffnen({
          typ: "alert",
          text: 'Beim Laden der Daten aus der Kartei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">Timeout abgelaufen: Daten nicht empfangen</p>',
        });
        return false;
      }
    }
    return true;
  },

  // transform the loaded XML data into HTML
  //   xmlData = object
  async transform (xmlData = data.vis.xml) {
    // check for changes in the XML data
    const sha1 = await data.sha1(xmlData.file);
    if (xmlData.sha1 === sha1) {
      return "unchanged";
    }

    // erase the old HTML document
    xmlData.html = null;

    // load XSL
    if (!data.vis.xml.xsl) {
      await shared.resourcesLoad({
        file: "xml-bedvis.xsl",
        targetObj: data.vis.xml,
        targetKey: "xsl",
      });
      if (!data.vis.xml.xsl) {
        dialog.oeffnen({
          typ: "alert",
          text: 'Beim Transformieren der XML-Daten ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">XSL konnte nich geladen werden</p>',
        });
        return false;
      }
    }

    // prepare XSLT
    const xslt = sharedXml.parseXML(data.vis.xml.xsl, "application/xml");
    const processor = new XSLTProcessor();
    processor.importStylesheet(xslt);

    // transform XML
    const xmlOri = sharedXml.parseXML(xmlData.file);
    const xmlTrans = processor.transformToDocument(xmlOri);
    const htmlStr = new XMLSerializer().serializeToString(xmlTrans);
    if (!htmlStr) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Beim Transformieren der XML-Daten ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">XSL-Transformation fehlgeschlagen</p>',
      });
      return false;
    }

    // parse HTML
    const htmlDoc = sharedXml.parseXML(htmlStr, "text/html");
    if (!htmlDoc) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Beim Transformieren der XML-Daten ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">Parsen des HTML fehlgeschlagen</p>',
      });
      return false;
    }
    xmlData.html = htmlDoc;

    // success!
    xmlData.sha1 = sha1;
    return true;
  },

  // validate an XML file
  //   file = string
  validate (file) {
    // parse file
    const xmlDoc = sharedXml.parseXML(file);
    if (!xmlDoc) {
      return "XML nicht wohlgeformt";
    }

    // check for the existance of quotations and meanings
    const evaluator = xpath => xmlDoc.evaluate(xpath, xmlDoc, sharedXml.nsResolver, XPathResult.ANY_TYPE, null);
    const requiredTags = [ "Belegreihe", "Lesarten" ];
    const articleType = evaluator("//z:Artikel").iterateNext().getAttribute("Typ");
    if (articleType === "Wortfeldartikel") {
      requiredTags.pop();
    }
    const missing = [];
    for (const tag of requiredTags) {
      const exists = evaluator(`//z:${tag}`).iterateNext();
      if (!exists) {
        missing.push(`&lt;${tag}&gt;`);
      }
    }
    if (missing.length) {
      return `${missing.length === 1 ? "Tag" : "Tags"} nicht gefunden: ${missing.join(" und ")}`;
    }

    // file is valid
    return true;
  },
};
