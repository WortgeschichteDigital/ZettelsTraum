
import bedeutungen from "./bedeutungen.mjs";
import kartei from "./kartei.mjs";
import popup from "./popup.mjs";
import xml from "./xml.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import sharedXml from "../sharedXml.mjs";

export { bedvis as default };

const bedvis = {
  // contents ID of the visualization window
  visContentsId: 0,

  // open or focus the visualization window
  async open () {
    // block for macOS
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Visualisierung</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }

    // focus the window if its already open
    if (this.visContentsId) {
      bridge.ipc.invoke("bedvis-focus", this.visContentsId);
      return;
    }

    // open the window
    this.visContentsId = await bridge.ipc.invoke("bedvis-open", `Visualisierung: ${kartei.titel}`);
  },

  // close the window
  async close () {
    if (!this.visContentsId) {
      return false;
    }
    await bridge.ipc.invoke("bedvis-close", this.visContentsId);
    this.visContentsId = 0;
    return true;
  },

  // send data to the window
  sendData () {
    if (!this.visContentsId) {
      return;
    }

    // glean data
    const data = {
      contentsId: dd.win.contentsId,
      title: `Visualisierung: ${kartei.titel}`,
      vis: dd.file.bv,
    };

    // send data
    bridge.ipc.invoke("webcontents-bridge", {
      id: this.visContentsId,
      channel: "bedvis-data-get",
      data,
    });
  },

  // save updated data
  //   data = object
  updateData (data) {
    dd.file.bv = data;
    kartei.karteiGeaendert(true);
  },

  // send XML data to the window
  sendXmlData () {
    // create XML document
    const doc = '<WGD xmlns="http://www.zdl.org/ns/1.0"><Artikel></Artikel></WGD>';
    const ns = sharedXml.nsResolver("z");
    let xmlDoc = sharedXml.parseXML(doc);
    const artikel = xmlDoc.querySelector("Artikel");
    const { wf } = dd.file.la;
    artikel.setAttribute("Typ", wf ? "Wortfeldartikel" : "Vollartikel");

    // append lemmas
    let verweise;
    if (wf) {
      verweise = document.createElementNS(ns, "Verweise");
      artikel.appendChild(verweise);
      verweise.setAttribute("Typ", "Wortfeld");
    }
    for (const la of dd.file.la.la) {
      if (wf && !la.nl) {
        continue;
      }
      if (wf) {
        const verweis = document.createElementNS(ns, "Verweis");
        verweise.appendChild(verweis);
        const vt = document.createElementNS(ns, "Verweistext");
        verweis.appendChild(vt);
        vt.textContent = la.sc.join("/");
        const vz = document.createElementNS(ns, "Verweisziel");
        verweis.appendChild(vz);
        if (la.ho) {
          vz.setAttribute("hidx", la.ho);
        }
      } else {
        const lemma = document.createElementNS(ns, "Lemma");
        artikel.appendChild(lemma);
        lemma.setAttribute("Typ", la.nl ? "Nebenlemma" : "Hauptlemma");
        for (const sc of la.sc) {
          const schreibung = document.createElementNS(ns, "Schreibung");
          lemma.appendChild(schreibung);
          schreibung.textContent = sc;
          if (la.ho) {
            schreibung.setAttribute("hidx", la.ho);
          }
        }
      }
    }

    // append quotations
    const belegeSorted = [];
    for (const [ id, beleg ] of Object.entries(dd.file.ka)) {
      // ignore quotations that are not booked
      if (!beleg.tg.includes("Buchung")) {
        continue;
      }

      // make cutting
      popup.belegID = id;
      popup.referenz.data = beleg;
      popup.referenz.id = id;
      popup.textauswahl.xml = "";
      let belegStr = xml.schnitt();
      belegStr = belegStr.replace("<Beleg", `<Beleg xmlns="${ns}"`);
      const belegDoc = sharedXml.parseXML(belegStr);

      // clean-up
      if (!beleg.bs.includes('<span class="belegschnitt">') &&
          (belegDoc.querySelector("Stichwort") || belegDoc.querySelector("Markierung"))) {
        const paragraphs = belegDoc.querySelectorAll("Absatz");
        for (const p of paragraphs) {
          if (!p.querySelector("Stichwort") && !p.querySelector("Markierung")) {
            p.parentNode.removeChild(p);
          }
        }
      }
      if (!belegDoc.querySelector("Absatz")) {
        continue;
      }

      // append linked meanings
      const bed = document.createElementNS(ns, "Bedeutungen");
      belegDoc.documentElement.appendChild(bed);
      for (const i of beleg.bd) {
        const b = document.createElementNS(ns, "Bedeutung");
        bed.appendChild(b);
        b.textContent = `l${i.gr}-${i.id}`;
      }

      // extract date
      let date = belegDoc.querySelector("Fundstelle Datum").textContent;
      if (date.length === 10) {
        const [ d, m, y ] = date.split(".");
        date = `${y}-${m}-${d}`;
      } else if (date.length === 2) {
        date = parseInt(date, 10) - 1 + "50";
      } else if (/^(0000|9999)-/.test(date)) {
        date = date.split("-")[1] + "-00-00";
      } else {
        date += "-00-00";
      }

      // save quotation
      const clone = belegDoc.documentElement.cloneNode(true);
      belegeSorted.push({
        date,
        clone,
      });
    }

    belegeSorted.sort((a, b) => {
      if (a.date === b.date) {
        return 0;
      }
      const x = [ a.date, b.date ];
      x.sort();
      if (x[0] === a.date) {
        return -1;
      }
      return 1;
    });

    const belege = document.createElementNS(ns, "Belegreihe");
    artikel.appendChild(belege);
    for (const i of belegeSorted) {
      belege.appendChild(i.clone);
    }

    // append meanings
    for (const id of Object.keys(dd.file.bd.gr)) {
      let bedStr = bedeutungen.xmlMake({
        geruest: dd.file.bd.gr[id],
        geruestID: id,
        typ: "bedvis",
      });
      bedStr = bedStr.replace("<Lesarten>", `<Lesarten xmlns="${ns}" xml:id="l${id}">`);
      const bedDoc = sharedXml.parseXML(bedStr);
      const clone = bedDoc.documentElement.cloneNode(true);
      artikel.appendChild(clone);
    }

    // serialize XML data
    xmlDoc = sharedXml.indent(xmlDoc);
    const data = new XMLSerializer().serializeToString(xmlDoc);

    // send data
    bridge.ipc.invoke("webcontents-bridge", {
      id: this.visContentsId,
      channel: "bedvis-xml-data-get",
      data,
    });
  },

  // send a notification about the recent cardbox updates
  // (this might trigger a reload of data and visualization)
  cardboxUpdate () {
    if (!this.visContentsId) {
      return;
    }

    bridge.ipc.invoke("webcontents-bridge", {
      id: this.visContentsId,
      channel: "bedvis-cardbox-update",
    });
  },
};
