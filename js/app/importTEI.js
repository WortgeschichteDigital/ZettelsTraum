"use strict";

const importTEI = {
  // start the import
  //   importData       = object
  //     data           = object
  //       xmlDoc       = document (XML document, parsed)
  //       xmlStr       = string (XML document, string)
  //     formData       = object
  //       bis          = number (from page)
  //       resource     = object
  //         name       = string (resource name, used as corpus name)
  //         desc       = string
  //         originReg  = RegExp
  //         type       = string
  //         xmlPath    = string
  //         xmlPathReg = RegExp
  //       url          = string (form URL)
  //       von          = number (to page)
  //     formText       = string
  //     formView       = string
  //     type           = string (tei | tei-copadocs | tei-dibilit | tei-dibiphil | tei-dingler | tei-dta | tei-humboldt | tei-jeanpaul | tei-soldatenbriefe | tei-stimmlos | tei-wdb)
  //     urlData        = object
  //       id           = string (tei-copadocs, tei-dibilit, tei-dibiphil, tei-dingler, tei-dta, tei-humboldt, tei-jeanpaul, tei-soldatenbriefe, tei-stimmlos => title ID)
  //       url          = string (URL to XML file)
  //     usesFileData   = boolean
  async startImport (importData) {
    // on reimport from the saved import data, formData ist not present;
    // import from page 0, so everything is imported
    if (!importData.formData) {
      importData.formData = {
        von: 0,
        bis: 0,
      };
    }

    // reset data objects
    const data = importTEI.data;
    data.cit = importTEI.citObject();
    data.ds = importShared.importObject().ds;
    if (!importData.formData.resource) {
      const resource = importShared.onlineResources.find(i => i.type === importData.type);
      if (resource) {
        importData.formData.resource = resource;
      }
    }

    // fill in already known values
    data.ds.bb = importData.formData.bis;
    data.ds.bi = importData.type;
    data.ds.bv = importData.formData.von;
    data.ds.kr = importData.formData?.resource?.name || "";
    if (importData.urlData) {
      data.ds.ui = importData.urlData.url;
      data.ds.ud = new Date().toISOString().split("T")[0];
      if (importData.type === "tei-copadocs") {
        data.ds.ul = `https://deutschestextarchiv.github.io/copadocs/${importData.urlData.id}.html`;
      } else if (importData.type === "tei-dta" && data.ds.bv) {
        data.ds.ul = `https://www.deutschestextarchiv.de/${importData.urlData.id}/${data.ds.bv}`;
      } else if (importData.type === "tei-dingler") {
        data.ds.ul = `https://dingler.bbaw.de/articles/${importData.urlData.id}.html`;
      } else if (importData.type === "tei-humboldt") {
        data.ds.ul = "https://humboldt.unibe.ch/text/" + importData.urlData.id;
      } else if (importData.type === "tei-jeanpaul") {
        const html = /^[IXV]+_/.test(importData.urlData.id) ? "brief" : "umfeldbrief";
        data.ds.ul = `https://www.jeanpaul-edition.de/${html}.html?num=${importData.urlData.id}`;
      } else {
        data.ds.ul = importData.formData?.url || "";
      }
      if (/\.xml$/.test(data.ds.ul)) {
        data.ds.ul = "";
        data.ds.ud = "";
      }
    }

    // get text snippet
    const snippet = await importTEI.getTextSnippet({
      pageFrom: data.ds.bv,
      pageTo: data.ds.bb,
      type: data.ds.bi,
      xmlDoc: importData.data.xmlDoc,
      xmlStr: importData.data.xmlStr,
    });
    if (!snippet) {
      return false;
    }

    // create a complete TEI document with the extracted snippet
    data.ds.bx = importTEI.createCompleteDoc({
      text: snippet,
      xmlDoc: importData.data.xmlDoc,
    });

    // fill in citation data
    importTEI.citFill(importData.data.xmlDoc);

    // values depending on the source
    if (importData.type === "tei-copadocs" && data.cit.titel.some(i => /brief/i.test(i))) {
      data.cit.textsorte.push("Brief");
    } else if (importData.type === "tei-jeanpaul") {
      data.cit.textsorte.push("Brief");
    }

    // detect column count (no mark as recto/verso folio and snippet has <cb/> with @n)
    if (!/[rv]$/.test(data.cit.seiteStart) &&
        !/[rv]$/.test(data.cit.seiteEnde) &&
        /<cb[^>]+?n=".+?"/.test(snippet)) {
      data.cit.spalte = true;
    }

    // in case of a reimport, get precollected page data
    if (beleg.metadatenReimportData.reimport) {
      for (const i of [ "seiten", "spalte" ]) {
        if (beleg.metadatenReimportData[i]) {
          importTEI.data.cit[i] = beleg.metadatenReimportData[i];
        }
      }
      beleg.metadatenReimportData.reimport = false;
    }

    // fill in missing card values
    // date
    let da = data.cit.datumEntstehung;
    if (data.cit.datumEntstehung === data.cit.datumDruck) {
      data.cit.datumDruck = "";
    }
    if (!da && data.cit.datumDruck) {
      da = data.cit.datumDruck;
    } else if (data.cit.datumDruck) {
      da += ` (Publikation von ${data.cit.datumDruck})`;
    }
    data.ds.da = da;
    // author
    data.ds.au = data.cit.autor.join("/") || "N.\u00A0N.";
    // citation
    data.ds.qu = importTEI.makeQu();
    // text class
    if (!data.cit.textsorte.length && data.cit.textsorteSub.length) {
      data.cit.textsorte = [ ...data.cit.textsorteSub ];
      data.cit.textsorteSub = [];
    }
    if (data.cit.textsorte.length) {
      const textclass = new Set();
      for (let i = 0, len = data.cit.textsorte.length; i < len; i++) {
        const ts = data.cit.textsorte[i];
        const tsSub = data.cit.textsorteSub[i] || "";
        if (/[,;] /.test(tsSub)) {
          const tsSubSp = tsSub.split(/[,;] /);
          for (let j = 0, len = tsSubSp.length; j < len; j++) {
            textclass.add(`${ts}: ${tsSubSp[j]}`);
          }
        } else if (tsSub) {
          textclass.add(`${ts}: ${tsSub}`);
        } else {
          textclass.add(ts);
        }
      }
      data.ds.ts = [ ...textclass ].join("\n");
    }

    // get quotation
    const quotation = await importTEI.transformXML({
      tei: data.ds.bx,
      type: importData.type,
    });
    if (!quotation) {
      return false;
    }
    data.ds.bs = quotation;

    // fill in card
    const result = await importShared.fillCard(data.ds);
    return result;
  },

  // imported data
  data: {
    // citation data
    cit: {},
    // card data
    ds: {},
  },

  // new citation data object
  citObject () {
    return {
      autor: [],
      hrsg: [],
      titel: [],
      untertitel: [],
      band: "",
      auflage: "",
      ort: [],
      verlag: "",
      datumDruck: "",
      datumEntstehung: "",
      spalte: false,
      seiten: "",
      seiteStart: "",
      seiteEnde: "",
      zeitschrift: "",
      zeitschriftJg: "",
      zeitschriftH: "",
      serie: "",
      serieBd: "",
      textsorte: [],
      textsorteSub: [],
    };
  },

  // read citation data from <teiHeader>
  //   xmlDoc = document
  citFill (xmlDoc) {
    const evaluator = xpath => xmlDoc.evaluate(xpath, xmlDoc, helferXml.nsResolver, XPathResult.ANY_TYPE, null);
    const data = importTEI.data.cit;

    // persons
    const persons = {
      autor: evaluator("//t:biblFull/t:titleStmt/t:author/t:persName"),
      autor2: evaluator("//t:profileDesc/t:correspDesc/t:correspAction[@type='sent']/t:persName"),
      autor3: evaluator("//t:profileDesc/t:creation/t:persName[@type='sender']"),
      hrsg: evaluator("//t:biblFull/t:titleStmt/t:editor/t:persName"),
    };
    for (const [ k, v ] of Object.entries(persons)) {
      let item = v.iterateNext();
      const key = k.replace(/[0-9]$/, "");
      while (item) {
        const forename = item.querySelector("forename");
        const surname = item.querySelector("surname");
        // <addName> often gives the whole name like this: "forename surname";
        // in that case, <forename> and <surname> are missing
        const addName = item.querySelector("addName");
        if (surname) {
          const name = [ trimmer(surname.textContent) ];
          if (forename) {
            name.push(trimmer(forename.textContent));
          }
          data[key].push(name.join(", "));
        } else if (addName) {
          data[key].push(trimmer(addName.textContent));
        } else {
          data[key].push(trimmer(item.textContent));
        }
        item = v.iterateNext();
      }
    }

    // further pub infos
    const pub = {
      titel: evaluator("//t:biblFull/t:titleStmt/t:title[@type='main']"),
      titel2: evaluator("//t:sourceDesc/t:bibl/t:title"),
      untertitel: evaluator("//t:biblFull/t:titleStmt/t:title[@type='sub']"),
      band: evaluator("//t:biblFull/t:titleStmt/t:title[@type='volume']"),
      auflage: evaluator("//t:biblFull/t:editionStmt/t:edition"),
      ort: evaluator("//t:biblFull/t:publicationStmt/t:pubPlace"),
      verlag: evaluator("//t:biblFull/t:publicationStmt/t:publisher/t:name"),
      datumDruck: evaluator("//t:biblFull/t:publicationStmt/t:date[@type='publication']"),
      datumEntstehung: evaluator("//t:biblFull/t:publicationStmt/t:date[@type='creation']"),
      datumEntstehung2: evaluator("//t:profileDesc/t:correspDesc/t:correspAction[@type='sent']/t:date"),
      datumEntstehung3: evaluator("//t:profileDesc/t:creation/t:date[@type='sent']"),
      datumEntstehung4: evaluator("//t:biblFull/t:publicationStmt/t:date[@type='firstPublication']"),
      datumEntstehung5: evaluator("//t:biblFull/t:publicationStmt/t:date"),
    };
    for (const [ k, v ] of Object.entries(pub)) {
      let item = v.iterateNext();
      const key = k.replace(/[0-9]$/, "");
      while (item) {
        if (/datumEntstehung[0-9]/.test(k)) {
          if (data.datumEntstehung) {
            item = v.iterateNext();
            continue;
          }
          // @when, @notBefore, @notAfter
          const when = item.getAttribute("when");
          if (!data.datumEntstehung && when) {
            data.datumEntstehung = when;
          } else if (!data.datumEntstehung) {
            const notBefore = item.getAttribute("notAfter");
            const notAfter = item.getAttribute("notAfter");
            let date = notBefore || notAfter || "";
            if (notBefore && notAfter) {
              date = `zwischen ${notBefore} und ${notAfter}`;
            } else if (notBefore) {
              date = "nicht vor " + notBefore;
            } else if (notAfter) {
              date = "nicht nach " + notAfter;
            }
            if (!date) {
              date = trimmer(item.textContent);
            }
            data.datumEntstehung = date;
          }
        } else if (Array.isArray(data[key])) {
          if (/[0-9]$/.test(k) && !data[key].length) {
            data[key].push(trimmer(item.textContent));
          }
        } else {
          data[key] = trimmer(item.textContent);
        }
        item = v.iterateNext();
      }
    }

    // journal/series
    let isJournal = false;
    const journalEval = evaluator("//t:sourceDesc/t:bibl").iterateNext();
    if (/^JA?/.test(journalEval?.getAttribute("type"))) {
      isJournal = true;
    }
    const series = {
      titel: evaluator("//t:biblFull/t:seriesStmt/t:title"),
      bdJg: evaluator("//t:biblFull/t:seriesStmt/t:biblScope[@unit='volume']"),
      heft: evaluator("//t:biblFull/t:seriesStmt/t:biblScope[@unit='issue']"),
      seiten: evaluator("//t:biblFull/t:seriesStmt/t:biblScope[@unit='pages']"),
      seiten2: evaluator("//t:sourceDesc/t:bibl/t:biblScope[@unit='page']"),
    };
    const seriesTitel = [];
    let item = series.titel.iterateNext();
    while (item) {
      seriesTitel.push(trimmer(item.textContent));
      item = series.titel.iterateNext();
    }
    if (isJournal) {
      // journal
      data.zeitschrift = seriesTitel.join(". ");
      item = series.bdJg.iterateNext();
      if (item) {
        data.zeitschriftJg = trimmer(item.textContent);
      }
      item = series.heft.iterateNext();
      if (item) {
        data.zeitschriftH = trimmer(item.textContent);
      }
      item = series.seiten.iterateNext();
      if (item) {
        data.seiten = trimmer(item.textContent);
      }
    } else {
      // series/edition
      data.serie = seriesTitel.join(". ");
      item = series.bdJg.iterateNext();
      if (item) {
        data.serieBd = trimmer(item.textContent);
      }
      item = series.seiten2.iterateNext();
      const seiten = [];
      while (item) {
        const num = item.querySelectorAll("num");
        if (num.length) {
          const s = [];
          for (const i of num) {
            s.push(trimmer(i.textContent));
          }
          seiten.push(s.join("–"));
        } else {
          seiten.push(trimmer(item.textContent));
        }
        item = series.seiten2.iterateNext();
      }
      data.seiten = seiten.join(" u. ");
    }

    // fallback for documents without full bibliographical information
    if (!data.titel.length) {
      const fallback = {
        titel1: evaluator("//t:sourceDesc/t:bibl"),
        titel2: evaluator("//t:titleStmt/t:title"),
      };
      for (const v of Object.values(fallback)) {
        const item = v.iterateNext();
        if (!item) {
          continue;
        }
        const text = trimmer(item.textContent);
        if (text) {
          data.titel.push(text);
          break;
        }
      }
    }

    // text class
    const textclass = evaluator("//t:profileDesc//t:textClass/t:classCode");
    item = textclass.iterateNext();
    while (item) {
      const scheme = item.getAttribute("scheme");
      let key = "";
      if (/main$/.test(scheme)) {
        key = "textsorte";
      } else if (/sub$/.test(scheme)) {
        key = "textsorteSub";
      } else if (!/DTACorpus$/.test(scheme)) {
        key = "textsorte";
      }
      if (key) {
        data[key].push(trimmer(item.textContent));
      }
      item = textclass.iterateNext();
    }

    // special trim function
    function trimmer (v) {
      v = v.replace(/\r?\n/g, " ");
      v = helfer.textTrim(v, true);
      return v;
    }
  },

  // create citation for the card
  makeQu () {
    const data = importTEI.data.cit;
    const td = importShared.makeTitleObject();

    // fill in data
    td.autor = [ ...data.autor ];
    td.hrsg = [ ...data.hrsg ];
    td.titel = [ ...data.titel ];
    td.untertitel = [ ...data.untertitel ];
    if (data.zeitschrift) {
      td.inTitel.push(data.zeitschrift);
    }
    const regBand = new RegExp(helfer.escapeRegExp(data.band));
    if (data.band &&
        !data.titel.some(i => regBand.test(i)) &&
        !data.untertitel.some(i => regBand.test(i))) {
      td.band = data.band;
    }
    td.auflage = data.auflage;
    td.ort = [ ...data.ort ];
    td.verlag = data.verlag !== "s. e." ? data.verlag : "";
    td.jahrgang = data.zeitschriftJg;
    td.jahr = data.datumDruck;
    if (!data.datumDruck) {
      const d = td.titel.join(", ").match(/\((?<jahr1>[0-9]{4})\)|(?<jahr2>[0-9]{4})\./);
      data.datumDruck = d?.groups?.jahr1 || d?.groups?.jahr2 || "";
    }
    if (!data.datumDruck) {
      td.jahr = data.datumEntstehung.match(/[0-9]{4}/)?.[0] || "";
    } else {
      td.jahrZuerst = data.datumEntstehung.match(/[0-9]{4}/)?.[0] || "";
    }
    if (data.zeitschriftH && !data.zeitschriftJg) {
      td.jahrgang = data.zeitschriftH;
    } else if (data.zeitschriftH) {
      td.heft = data.zeitschriftH;
    }
    td.spalte = data.spalte;
    td.seiten = data.seiten;
    if (data.seiteStart) {
      td.seite = data.seiteStart.replace(/^0+/, "");
      if (data.seiteEnde !== data.seiteStart) {
        td.seite += `–${data.seiteEnde.replace(/^0+/, "")}`;
      }
    }
    td.serie = data.serie;
    td.serieBd = data.serieBd;
    td.url.push(data.url);

    // make and return title
    let title = importShared.makeTitle(td, importTEI.data.ds);
    title = title.normalize("NFC");
    return title;
  },

  // list of known renditions;
  // this list's sources are (mainly) DTABf and Polytechnisches Journal
  // (renditions with empty objects are being deleted;
  // Chrome has severe issues with fn:document(); that's why we're unable
  // to map the renditions in a sane manner in the XSLT)
  knownRenditions: {
    "#antiqua": {
      tag: "span",
      class: "tei-antiqua",
      reg: null,
    },
    "#aq": {
      tag: "span",
      class: "tei-antiqua",
      reg: /font-family:.*?sans-serif/,
    },
    "#b": {
      tag: "b",
      class: "",
      reg: /font-weight: ?bold/,
    },
    "#bold": {
      tag: "b",
      class: "",
      reg: null,
    },
    "#blue": {},
    "#c": {},
    "#center": {},
    "#double-underline": {
      tag: "span",
      class: "tei-doppelt",
      reg: null,
    },
    "#et": {},
    "#et2": {},
    "#et3": {},
    "#f": {},
    "#fr": {},
    "#g": {
      tag: "span",
      class: "tei-gesperrt",
      reg: /letter-spacing:/,
    },
    "#hidden": {},
    "#i": {
      tag: "i",
      class: "",
      reg: /font-style: ?italic/,
    },
    "#in": {
      tag: "span",
      class: "tei-initiale",
      reg: /font-size: ?(1[0-9]{2}%|1\.[0-9]+)/,
    },
    "#indent-1": {},
    "#indent-2": {},
    "#italic": {
      tag: "i",
      class: "",
      reg: null,
    },
    "#k": {
      tag: "span",
      class: "tei-kapitaelchen",
      reg: /font-variant: ?small-caps/,
    },
    "#l1em": {},
    "#l2em": {},
    "#l3em": {},
    "#large": {
      tag: "span",
      class: "tei-groesser",
      reg: null,
    },
    "#larger": {
      tag: "span",
      class: "tei-groesser",
      reg: /font-size: ?(larger|(x+-)?large)/,
    },
    "#left": {},
    "#no_indent": {},
    "#r1em": {},
    "#red": {},
    "#right": {},
    "#roman": {},
    "#rkd": {},
    "#s": {
      tag: "s",
      class: "",
      reg: /text-decoration: ?line-through/,
    },
    "#smallCaps": {
      tag: "span",
      class: "tei-kapitaelchen",
      reg: null,
    },
    "#small-caps": {
      tag: "span",
      class: "tei-kapitaelchen",
      reg: null,
    },
    "#sub": {
      tag: "sub",
      class: "",
      reg: /vertical-align: ?sub/,
    },
    "#subscript": {
      tag: "sub",
      class: "",
      reg: null,
    },
    "#sup": {
      tag: "sup",
      class: "",
      reg: /vertical-align: ?super/,
    },
    "#super": {
      tag: "sup",
      class: "",
      reg: null,
    },
    "#superscript": {
      tag: "sup",
      class: "",
      reg: null,
    },
    // check #small and #smaller after #sub, #sup etc.!
    // (there might be a mismatch due to the font-size)
    "#small": {
      tag: "small",
      class: "",
      reg: null,
    },
    "#smaller": {
      tag: "small",
      class: "",
      reg: /font-size: ?(0?\.[0-9]+em|smaller|x+-small)/,
    },
    "#spaced": {
      tag: "span",
      class: "tei-gesperrt",
      reg: null,
    },
    "#u": {
      tag: "u",
      class: "",
      reg: /text-decoration: ?underline/,
    },
    "#underline": {
      tag: "u",
      class: "",
      reg: null,
    },
    "#underline_dotted": {
      tag: "u",
      class: "",
      reg: null,
    },
    "#uu": {
      tag: "span",
      class: "tei-doppelt",
      reg: /border-bottom:[^;]*double/,
    },
    "#wide": {
      tag: "span",
      class: "tei-gesperrt",
      reg: null,
    },
    "#x-large": {
      tag: "span",
      class: "tei-groesser",
      reg: null,
    },
    "#x-small": {
      tag: "small",
      class: "",
      reg: null,
    },
    "#xx-large": {
      tag: "span",
      class: "tei-groesser",
      reg: null,
    },
    "#xx-small": {
      tag: "small",
      class: "",
      reg: null,
    },
  },

  // set with unknown renditions that are found during the transformation
  // (this set only serves for evaluation purposes)
  unknownRenditions: null,

  // XSL stylsheet
  transformXSL: "",

  // transform the passed XML snippet
  //   tei = string
  //   type = string (tei | tei-copadocs | tei-dibilit | tei-dibiphil | tei-dingler | tei-dta | tei-humboldt | tei-jeanpaul | tei-soldatenbriefe | tei-stimmlos | tei-wdb)
  async transformXML ({ tei, type }) {
    // reset set for unknown renditions
    importTEI.unknownRenditions = new Set();

    // preprocess TEI
    // mark hyphens that appear immediately before a <lb>
    tei = tei.replace(/[-¬](<lb.*?\/>)/g, (...args) => `[¬]${args[1]}`);

    // load XSL if needed
    if (!importTEI.transformXSL) {
      await helfer.resourcesLoad({
        file: "xml-import-tei.xsl",
        targetObj: importTEI,
        targetKey: "transformXSL",
      });
      if (!importTEI.transformXSL) {
        return "";
      }
    }

    // prepare XSLT
    const xslt = helferXml.parseXML(importTEI.transformXSL, "application/xml");
    const processor = new XSLTProcessor();
    processor.setParameter(null, "teiType", type.replace(/^tei-?/, ""));
    processor.importStylesheet(xslt);

    // transform <TEI>
    const xmlOri = helferXml.parseXML(tei);
    const xmlTrans = processor.transformToDocument(xmlOri);
    let result = new XMLSerializer().serializeToString(xmlTrans);

    // replace rendition tags
    const renditions = importTEI.knownRenditions;
    const rend = document.createElement("div");
    rend.innerHTML = result;
    let rendRun = 0;
    const rendTemplate = document.createElement("template");
    while (rend.querySelector("[data-rendition]")) {
      rendRun++;
      if (rendRun > 10) {
        // safety net
        break;
      }
      rend.querySelectorAll("[data-rendition]").forEach(i => {
        const rAttr = i.dataset.rendition;
        x: for (const rKey of rAttr.split(/(?<!:) /)) {
          // rendition key found
          const rKeyHash = /^#/.test(rKey) ? rKey : "#" + rKey;
          if (renditions[rKeyHash]) {
            addRendition(i, rKeyHash);
            continue;
          }
          // search for matching css style
          for (const [ k, v ] of Object.entries(renditions)) {
            if (v?.reg?.test(rKey)) {
              addRendition(i, k);
              continue x;
            }
          }
          // unknown rendition => remove it
          importTEI.unknownRenditions.add(rKey);
          addRendition(i, rKey);
        }
      });
    }

    function addRendition (node, renditionKey) {
      if (!node.parentNode) {
        return;
      }
      if (!renditions?.[renditionKey]?.tag) {
        // ignore rendition
        rendTemplate.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(rendTemplate.content, node);
      } else {
        // create appropriate tag
        const ele = document.createElement(renditions[renditionKey].tag);
        if (renditions[renditionKey].class) {
          ele.classList.add(renditions[renditionKey].class);
        }
        ele.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(ele, node);
      }
    }

    result = rend.innerHTML;

    // amend HTML result
    result = importTEI.transformHTML(result);

    // show warning message if no text remains
    if (!result) {
      importTEI.error("kein Text transformiert", "feld");
      return false;
    }

    // return result
    return result;
  },

  // prepare the XML that was transformed into HTML
  //   str = string
  transformHTML (str) {
    // remove line breaks
    str = str.replace(/\r?\n/g, "");

    // <div> to paragraphs divided by a blank line
    // (sometimes text follows directly after a <div> => insert blank lines in that case, too)

    str = str.replace(/<\/div> +<div>/g, "</div><div>");
    str = str.replace(/<\/div> +/g, "</div>");
    str = str.replace(/<\/div>(?=[^\s])/g, "</div>\n\n");
    str = str.replace(/<div> */g, "\n\n");
    str = str.replace(/ *<\/div>/g, "");

    // line break after <br>
    str = str.replace(/ *<br ?\/?> */g, "<br>\n");

    // erase last <br> in a line
    str = str.replace(/<br>\n\n/g, "\n");

    // ensure that there are spaces around <cb> and <pb>
    str = str.replace(/(\[:.+?:\])/g, m => ` ${m} `);

    // remove spaces after marked hypens
    str = str.replace(/(\[[-¬]\]) /g, (...args) => args[1]);

    // remove whitespace before closing bracket of a note
    str = str.replace(/\s*\/Anmerkung\]/g, () => "]");

    // collapse multiple empty lines
    str = str.replace(/\n{3,}/g, "\n\n");

    // erase spaces at the beginning of a paragraph
    str = str.replace(/^ +/gm, "");

    // collapse multiple spaces
    str = str.replace(/ {2,}/g, " ").trim();

    // remove <br> at the end of the text
    str = str.replace(/<br>$/, "");

    // remove placeholders for <cb> and <pb> at the end of the text
    str = str.replace(/\[:.+?:\]$/, "");

    // remove placeholders for <cb> and <pb> at the beginning of the text
    // if there is only one placeholder
    if (str.match(/\[:.+?:\]/g)?.length === 1) {
      str = str.replace(/^\[:.+?:\]/, "");
    }

    // erase empty placeholders for <cb> and <pb> that follow immediately after another placeholder
    str = str.replace(/(\[:.+?:\])\s+\[:\?:\]/g, (...args) => args[1]);

    // ensure that <small> is an inline style
    str = str.replace(/<small>(.+?)<\/small>/gs, (...args) => {
      const p = args[1].trim().split(/\n+/);
      const result = [];
      for (const i of p) {
        result.push(`<small>${i}</small>`);
      }
      return result.join("\n\n");
    });

    // replace <q> with quotation marks
    str = str.replace(/<q>(.)(.+?)(.)<\/q>/gs, (...args) => {
      let start = args[1];
      if (!/[„‚»›«‹“]/.test(start)) {
        start = "„" + start;
      }
      let end = args[3];
      if (!/[“‘»›«‹”]/.test(end)) {
        end += "“";
      }
      return start + args[2].trim() + end;
    });

    // trim paragraphs
    const div = str.split("\n\n");
    for (let i = 0, len = div.length; i < len; i++) {
      div[i] = div[i].trim();
      div[i] = div[i].replace(/^(<[^>]+?>) +/, (...args) => args[1]);
      div[i] = div[i].replace(/ +(<[^>]+?>) *$/, (...args) => args[1]);
      // detect empty lines that only have tags and spaces
      const hasText = div[i].replace(/<.+?>/g, "").trim();
      if (!hasText) {
        div[i] = "";
      }
    }
    str = div.filter(i => i).join("\n\n");

    // merge twin tags
    str = str.replace(/((<[^/>]{1}[^>]*>){2,})(.+?)((<\/[^>]+>){2,})/g, (...args) => {
      // detect twins
      const start = args[1].match(/(?<=<).+?(?=>)/g);
      const end = args[4].match(/(?<=<).+?(?=>)/g);
      if (start.length !== end.length) {
        return args[0];
      }
      const ex = [];
      for (let i = 1, len = start.length; i < len; i++) {
        if (/span/.test(start[i])) {
          continue;
        }
        if (start[i] === start[i - 1]) {
          ex.push(i);
        }
      }

      // remove twins
      end.reverse();
      const startMerged = [];
      const endMerged = [];
      for (let i = 0, len = start.length; i < len; i++) {
        if (ex.includes(i)) {
          continue;
        }
        startMerged.push(`<${start[i]}>`);
        endMerged.push(`<${end[i]}>`);
      }
      endMerged.reverse();

      // return result
      return startMerged.join("") + args[3] + endMerged.join("");
    });

    // decode entities
    const decoder = document.createElement("textarea");
    decoder.innerHTML = str;
    str = decoder.value;

    // trim a last time and normalize unicode
    str = str.trim().normalize("NFC");

    // return result
    return str;
  },

  // get the proper snippet of <text> using the submitted <pb> numbers
  //   pageFrom = number
  //   pageTo = number
  //   type = string (tei | tei-copadocs | tei-dibilit | tei-dibiphil | tei-dingler | tei-dta | tei-humboldt | tei-jeanpaul | tei-wdb)
  //   xmlDoc = document
  //   xmlStr = string
  async getTextSnippet ({ pageFrom, pageTo, type, xmlDoc, xmlStr }) {
    const pb = xmlDoc.querySelectorAll("pb");
    let pbStartSel;
    let pbStart;
    let pbEndSel;
    let pbEnd;

    // try default values by import type
    if (!pb.length || !pageFrom) {
      // import everything if:
      //   - no <pb> found
      //   - pageFrom == 0

      // warn about or even prevent the import of a very large file as a whole
      const strBytes = new Blob([ xmlStr ]).size;
      const message = `Die Datei ist <b>${Math.round(strBytes / 1024)} KB</b> groß.`;
      if (strBytes > 400 * 1024) {
        dialog.oeffnen({
          typ: "alert",
          text: `${message}\nWeil sie zu groß ist, wird der Import wird nicht ausgeführt.\nWählen Sie zuerst aus, welche Seiten aus der Datei importiert werden sollen.`,
          callback: () => document.querySelector("#beleg-import-von").select(),
        });
        return false;
      } else if (strBytes > 200 * 1024) {
        const result = await new Promise(resolve => {
          dialog.oeffnen({
            typ: "confirm",
            text: `${message}\nSoll wirklich der komplette Inhalt dieser recht großen Datei importiert werden?`,
            callback: () => resolve(dialog.antwort),
          });
        });
        if (!result) {
          document.querySelector("#beleg-import-von").select();
          return false;
        }
      }

      // detect page numbers
      if (pb.length) {
        importTEI.data.cit.seiteStart = pb[0].getAttribute("n") || "";
        importTEI.data.cit.seiteEnde = pb[pb.length - 1].getAttribute("n") || "";
      }

      // return the whole content of <text>
      const text = xmlStr.match(/<text[ >].+?<\/text>/s)?.[0] || false;
      if (!text) {
        importTEI.error("kein <text> gefunden", "feld");
        return false;
      }
      return normalize(text);
    } else if (/^tei-(dibilit|dibiphil|dta|humboldt|stimmlos)$/.test(type)) {
      // DTA => search for @facs="#000n"
      pbStartSel = `facs="#f${pageFrom.toString().padStart(4, "0")}"`;
      pbStart = xmlDoc.querySelector(`pb[${pbStartSel}]`);
      pbEndSel = `facs="#f${pageTo.toString().padStart(4, "0")}"`;
      pbEnd = xmlDoc.querySelector(`pb[${pbEndSel}]`);
    } else if (type === "tei-dingler") {
      // Polytechnisches Journal => search for @n="n"
      pbStartSel = `n="${pageFrom}"`;
      pbStart = xmlDoc.querySelector(`pb[${pbStartSel}]`);
      pbEndSel = `n="${pageTo}"`;
      pbEnd = xmlDoc.querySelector(`pb[${pbEndSel}]`);
    }

    // unable to find starting <pb> => try different selectors
    if (!pbStart) {
      const selectors = [
        `n="${pageFrom}"`,
        `n="#${pageFrom}"`,
        `n$="0${pageFrom}"`,
        `n^="${pageFrom}"`,
        `facs="${pageFrom}"`,
        `facs="#${pageFrom}"`,
        `facs$="0${pageFrom}"`,
        `facs^="${pageFrom}"`,
      ];
      for (const sel of selectors) {
        pbStart = xmlDoc.querySelector(`pb[${sel}]`);
        if (pbStart) {
          if (/^facs/.test(sel)) {
            pbStartSel = `facs="${pbStart.getAttribute("facs")}"`;
          } else {
            pbStartSel = `n="${pbStart.getAttribute("n")}"`;
          }
          const idxStart = getIndex(pbStart);
          const idxEnd = idxStart + pageTo - pageFrom;
          if (pb[idxEnd]) {
            pbEnd = pb[idxEnd];
            pbEndSel = "";
            if (/^facs/.test(sel) && pbEnd.getAttribute("facs")) {
              pbEndSel = `facs="${pbEnd.getAttribute("facs")}"`;
            } else if (pbEnd.getAttribute("n")) {
              pbEndSel = `n="${pbEnd.getAttribute("n")}"`;
            }
          } else {
            pbEnd = null;
            pbEndSel = "";
          }
          break;
        }
      }
    }

    // still unable to find starting <pb> => count <pb> tags
    if (!pbStart) {
      if (pb[pageFrom - 1]) {
        pbStart = pb[pageFrom - 1];
        pbStartSel = "";
        if (pbStart.getAttribute("facs")) {
          pbStartSel = `facs="${pbStart.getAttribute("facs")}"`;
        } else if (pbStart.getAttribute("n")) {
          pbStartSel = `n="${pbStart.getAttribute("n")}"`;
        }
      } else {
        // error: start page not found
        importTEI.error("Startseite im XML-Dokument nicht gefunden", "von");
        return false;
      }
    }

    // unable to find ending <pb> => try to find it via starting <pb>
    if (!pbEnd) {
      const idxStart = getIndex(pbStart);
      if (idxStart === pb.length - 1 ||
          idxStart + pageTo - pageFrom >= pb.length) {
        // pageFrom is last page or pageTo is >= last page
        pbEndSel = "";
        pbEnd = null;
      } else {
        // find end page relative to Start page
        let idxEnd = idxStart + pageTo - pageFrom;
        while (idxEnd > pb.length - 1) {
          idxEnd--;
        }
        if (pb[idxEnd]) {
          pbEnd = pb[idxEnd];
          pbEndSel = "";
          if (pbEnd.getAttribute("facs")) {
            pbEndSel = `facs="${pbEnd.getAttribute("facs")}"`;
          } else if (pbEnd.getAttribute("n")) {
            pbEndSel = `n="${pbEnd.getAttribute("n")}"`;
          }
        } else {
          // error: end page not found
          importTEI.error("Endseite im XML-Dokument nicht gefunden", "bis");
          return false;
        }
      }
    }

    // ensure that starting <pb> precedes ending <pb>
    if (pbEnd) {
      const idxStart = getIndex(pbStart);
      const idxEnd = getIndex(pbEnd);
      if (idxEnd <= idxStart) {
        // error: order of the detected <pb> tags is wrong
        const order = idxEnd < idxStart ? "liegt vor" : "ist identisch mit";
        importTEI.error(`ermittelte Endseite ${order} der Startseite`, "bis");
        return false;
      }
    }

    // pose a security question or even prevent the import
    // if a large number of pages is about to be imported
    const idxStart = getIndex(pbStart);
    const idxEnd = pbEnd ? getIndex(pbEnd) : pb.length;
    if (idxEnd - idxStart > 9) {
      const number = `Sie haben <b>${idxEnd - idxStart} Seiten</b> für den Import ausgewählt.`;
      if (idxEnd - idxStart > 29) {
        dialog.oeffnen({
          typ: "alert",
          text: `${number}\nDer Import von mehr als 30 Seiten wird nicht ausgeführt.`,
          callback: () => document.querySelector("#beleg-import-von").select(),
        });
        return false;
      }
      const result = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `${number}\nSoll der Import mit dieser großen Anzahl an Seiten wirklich ausgeführt werden?`,
          callback: () => resolve(dialog.antwort),
        });
      });
      if (!result) {
        document.querySelector("#beleg-import-von").select();
        return false;
      }
    }

    // register page numbers
    for (let i = idxStart; i < idxEnd; i++) {
      const n = pb[i].getAttribute("n") || "";
      if (i === idxStart) {
        importTEI.data.cit.seiteStart = n;
      }
      importTEI.data.cit.seiteEnde = n;
    }

    // the cutting which follows does not work when multiple <pb>
    // with the same value of @n or @facs are present
    // => in that case, fall back to pageFrom and pageTo
    if (pbStartSel) {
      const startReg = new RegExp(`<pb[^>]+?${pbStartSel}.*?>`, "g");
      const startMatch = xmlStr.match(startReg);
      if (startMatch?.length > 1) {
        pbStartSel = "";
        pageFrom = 0;
        for (const i of pb) {
          pageFrom++;
          if (i === pbStart) {
            break;
          }
        }
      }
    }
    if (pbEndSel) {
      const endReg = new RegExp(`<pb[^>]+?${pbEndSel}.*?>`, "g");
      const endMatch = xmlStr.match(endReg);
      if (endMatch?.length > 1) {
        pbEndSel = "";
        pageTo = 0;
        for (const i of pb) {
          pageTo++;
          if (i === pbEnd) {
            break;
          }
        }
      }
    }
    if (pageTo <= pageFrom) {
      pageTo = pageFrom + 1;
    }

    // cut pages from <text>
    // 1. start of cut
    let text = "";
    const tagsStart = [];
    let parent = pbStart;
    do {
      parent = parent.parentNode;
      tagsStart.unshift(`<${parent.nodeName}>`);
    } while (parent.nodeName !== "text");
    if (pbStartSel) {
      const splitterStart = new RegExp(`<pb[^>]+?${pbStartSel}.*?>`);
      text = tagsStart.join("") + xmlStr.split(splitterStart)[1];
    } else {
      const splitted = xmlStr.split(/<pb.*?>/);
      const pbXml = xmlStr.match(/<pb.*?>/g);
      let xml = "";
      for (let i = 0, len = splitted.length; i < len; i++) {
        if (i >= pageFrom) {
          if (xml) {
            xml += pbXml[i - 1];
          }
          xml += splitted[i];
        }
      }
      text = tagsStart.join("") + xml;
    }

    // 2. end of cut
    let splitterEnd = null;
    const tagsEnd = [];
    if (pbEnd) {
      if (pbEndSel) {
        splitterEnd = new RegExp(`<pb[^>]+?${pbEndSel}.*?>`);
      }
      let parent = pbEnd;
      do {
        parent = parent.parentNode;
        tagsEnd.push(`</${parent.nodeName}>`);
      } while (parent.nodeName !== "text");
    } else {
      tagsEnd.push("</text>");
      splitterEnd = /<\/text>/;
    }
    if (splitterEnd) {
      text = text.split(splitterEnd)[0] + tagsEnd.join("");
    } else {
      const splitted = text.split(/<pb.*?>/);
      const pbXml = text.match(/<pb.*?>/g);
      let xml = "";
      for (let i = 0, len = splitted.length; i < len; i++) {
        if (i === pageTo - pageFrom) {
          break;
        }
        if (xml) {
          xml += pbXml[i - 1];
        }
        xml += splitted[i];
      }
      text = xml + tagsEnd.join("");
    }

    // normalize and return text
    return normalize(text);

    // get index in node list
    function getIndex (n) {
      for (let i = 0, len = pb.length; i < len; i++) {
        if (pb[i] === n) {
          return i;
        }
      }
      return -1;
    }

    // normalize text
    function normalize (text) {
      text = text.replace(/\r?\n/g, "");
      text = helfer.textTrim(text, true);
      return text.normalize("NFC");
    }
  },

  // create a complete TEI document from a given text snippet
  //   text = string
  //     (extracted pages from the complete document)
  //   xmlDoc = document
  //     (complete XML document)
  createCompleteDoc ({ text, xmlDoc }) {
    // purge irrelevant lists to shrink the header size
    const lists = [ "list", "listBibl", "listOrg", "listPerson", "listPlace" ];
    for (const i of lists) {
      let list = xmlDoc.querySelector(`sourceDesc > ${i}`);
      while (list) {
        list.parentNode.removeChild(list);
        list = xmlDoc.querySelector(`sourceDesc > ${i}`);
      }
    }

    // <teiHeader> to string
    let header = xmlDoc?.querySelector("teiHeader")?.outerHTML || "";
    header = header.replace(/ xmlns(:.+?)?=".+?"/g, "");

    // clean-up operations
    header = header.replace(/^\s+/gm, "");
    header = header.replace(/\r?\n([\p{L}\p{N}])?/gu, (...args) => {
      if (args[1]) {
        return " " + args[1];
      }
      return "";
    });
    header = helfer.textTrim(header, true);
    header = header.normalize("NFC");

    // return complete document
    return `<TEI xmlns="http://www.tei-c.org/ns/1.0">${header}${text}</TEI>`;
  },

  // Korpus historischer Patiententexte: get title ID
  //   url = string | object
  copadocsGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    if (/\.xml$/.test(url.pathname)) {
      return url.pathname.match(/\/data\/(.+?)\.xml$/)?.[1] || false;
    }
    return url.pathname.match(/\/copadocs\/(.+?)\.html$/)?.[1] || false;
  },

  // Polytechnisches Journal: get title ID
  //   url = string | object
  dinglerGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    return url.pathname.match(/\/articles\/(.+?)\.(html|xml)$/)?.[1] || false;
  },

  // DTA: get title ID
  //   url = string | object
  dtaGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    if (/\/(download_xml|show|view)\//.test(url.pathname)) {
      return url.pathname.replace(/\/$/, "").match(/([^/]+)$/)?.[1] || false;
    }
    return url.pathname.match(/^\/(.+?)\//)?.[1] || false;
  },

  // DTA: get page number
  //   url = string | object
  //   titleId = string | undefined
  dtaGetPageNo (url, titleId = "") {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    // from search parameter
    const p = url.searchParams.get("p");
    if (p) {
      return parseInt(p, 10);
    }

    // from URL path
    if (!titleId) {
      titleId = importTEI.dtaGetTitleId(url);
    }
    if (titleId) {
      const page = url.pathname.match(/[0-9]+$/);
      const titleReg = new RegExp(titleId + "$");
      if (page && !titleReg.test(url.pathname)) {
        return parseInt(page[0], 10);
      }
    }

    // return default
    return 1;
  },

  // DiBiLit, DiBiPhil, Soldatenbriefe, stimm-los: get title ID
  //   url = string | object
  dtaGitHubGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    return url.pathname.match(/\/data\/(.+?)\.xml$/)?.[1] || false;
  },

  // Humboldt-Schriften: get title ID
  //   url = string | object
  humboldtGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    if (/\.xml$/.test(url.pathname)) {
      return url.pathname.match(/\/xml\/(.+?)\.xml$/)?.[1] || false;
    }
    return url.pathname.match(/\/text\/(.+)/)?.[1] || false;
  },

  // Briefe von Jean Paul: get title ID
  //   url = string | object
  jeanpaulGetTitleId (url) {
    // parse URL
    url = importTEI.parseURL(url);
    if (!url) {
      return false;
    }

    if (/\.xml$/.test(url.pathname)) {
      return url.pathname.match(/\/([IVX]+_[^.])\.xml$/)?.[1] || false;
    }
    return url.searchParams.get("num") || false;
  },

  // parse the given URL (if necessary)
  //   url = string
  parseURL (url) {
    if (typeof url === "string") {
      try {
        url = new URL(url);
      } catch {
        return false;
      }
    }
    return url;
  },

  // show error message
  //   message = string
  //   focusField = string | undefined
  error (message, focusField = "url") {
    dialog.oeffnen({
      typ: "alert",
      text: `Der TEI-Import ist gescheitert.\n<h3>Fehlermeldung</h3>\n${message}`,
      callback: () => document.querySelector(`#beleg-import-${focusField}`).select(),
    });
  },
};
