"use strict";

const importTei = {
  // prepare XML data
  //   xmlPlain = string
  prepareXml (xmlPlain) {
    // remove namespace attribute
    // (it's easier to transform the XML and avoids problems with evaluate())
    xmlPlain = xmlPlain.replace(/ xmlns=".+?"/, "");

    // parse document
    const xmlDoc = new DOMParser().parseFromString(xmlPlain, "text/xml");

    // document not well formed
    if (xmlDoc.querySelector("parsererror")) {
      importTei.error("XML-Daten nicht wohlgeformt");
      return null;
    }

    // return parsed document
    return xmlDoc;
  },

  // xsl stylsheet
  transformXsl: "",

  // transform the passed XML snippet
  //   tei = string
  //   type = string (tei | tei-dta)
  async transformXml ({ tei, type }) {
    // preprocess tei
    // mark hyphens that appear immediately before a <lb>
    tei = tei.replace(/[-¬](<lb.*?\/>)/g, (...args) => `[¬]${args[1]}`);

    // load xsl if needed
    if (!importTei.transformXsl) {
      await helfer.resourcesLoad({
        file: "xml-import-tei.xsl",
        targetObj: importTei,
        targetKey: "transformXsl",
      });
      if (!importTei.transformXsl) {
        return "";
      }
    }

    // prepare XSLT
    const xslt = new DOMParser().parseFromString(importTei.transformXsl, "application/xml");
    const processor = new XSLTProcessor();
    processor.setParameter(null, "teiType", type.replace(/^tei-?/, ""));
    processor.importStylesheet(xslt);

    // transform <TEI>
    const xmlOri = new DOMParser().parseFromString(tei, "text/xml");
    const xmlTrans = processor.transformToDocument(xmlOri);
    let result = new XMLSerializer().serializeToString(xmlTrans);

    // replace rendition tags
    // (keys are DTA renditions; renditions with empty objects are being deleted;
    // Chrome has severe issues with fn:document(); that's why we're unable
    // to map the renditions in a sane manner within the XSL)
    const renditions = {
      "#aq": {
        tag: "span",
        class: "tei-antiqua",
        reg: /font-family:.*?sans-serif|antiqua/,
      },
      "#b": {
        tag: "b",
        class: "",
        reg: /font-weight: ?bold/,
      },
      "#blue": {},
      "#c": {},
      "#et": {},
      "#et2": {},
      "#et3": {},
      "#f": {},
      "#fr": {
        tag: "span",
        class: "tei-fr",
        reg: /font-size: ?(1[0-9]{2}%|1\.[0-9]+)/,
      },
      "#g": {
        tag: "span",
        class: "tei-gesperrt",
        reg: /letter-spacing:/,
      },
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
      "#k": {
        tag: "span",
        class: "tei-kapitaelchen",
        reg: /font-variant: ?small-caps/,
      },
      "#larger": {
        tag: "span",
        class: "tei-groesser",
        reg: /font-size: ?larger/,
      },
      "#red": {},
      "#right": {},
      "#s": {
        tag: "s",
        class: "",
        reg: /text-decoration: ?line-through/,
      },
      "#smaller": {
        tag: "small",
        class: "",
        reg: /font-size: ?smaller/,
      },
      "#sub": {
        tag: "sub",
        class: "",
        reg: /vertical-align: ?sub/,
      },
      "#sup": {
        tag: "sup",
        class: "",
        reg: /vertical-align: ?super/,
      },
      "#u": {
        tag: "u",
        class: "",
        reg: /text-decoration: ?underline/,
      },
      "#uu": {
        tag: "span",
        class: "tei-doppelt",
        reg: /border-bottom: ?double/,
      },
    };

    const rend = document.createElement("div");
    rend.innerHTML = result;
    rend.querySelectorAll("[data-rendition]").forEach(i => {
      const r = i.dataset.rendition;
      for (const rend of r.split(/(?<!:) /)) {
        // rendition key found
        if (renditions[rend]) {
          addRendition(i, rend);
          continue;
        }
        // search for matching css style
        for (const [ k, v ] of Object.entries(renditions)) {
          if (v?.reg?.test(rend)) {
            addRendition(i, k);
            continue;
          }
        }
      }
    });

    function addRendition (node, renditionKey) {
      const start = document.createTextNode(`[[[${renditionKey}]]]`);
      const end = document.createTextNode(`[[[/${renditionKey}]]]`);
      node.insertBefore(start, node.firstChild);
      node.appendChild(end);
    }

    result = rend.innerHTML;
    result = result.replace(/<span data-rendition="[^"]+">(\[{3}.+?\]{3})/g, (...args) => args[1]);
    result = result.replace(/(\[{3}\/.+?\]{3})<\/span>/g, (...args) => args[1]);

    result = result.replace(/\[{3}(.+?)\]{3}/g, (...args) => {
      let r = args[1];
      let end = "";
      if (/^\//.test(r)) {
        end = "/";
        r = r.substring(1);
      }
      if (!renditions?.[r]?.tag) {
        // these renditions should be ignored
        return "";
      }
      const tag = renditions[r].tag;
      let cl = "";
      if (!end && renditions[r].class) {
        cl = ` class="${renditions[r].class}"`;
      }
      return `<${end}${tag}${cl}>`;
    });

    // amend HTML result
    result = result.replace(/.+<body>(.+)<\/body>.+/, (...args) => args[1]);
    result = result.replace(/\r?\n/g, "");
    // <div> to paragraphs divided by a blank line
    result = result.replace(/<\/div> +<div>/g, "</div><div>");
    result = result.replace(/<div> */g, "\n\n");
    result = result.replace(/ *<\/div>/g, "");
    // line break after <br>
    result = result.replace(/ *<br> */g, "<br>\n");
    // erase last <br> in a line
    result = result.replace(/<br>\n\n/g, "\n");
    // ensure that there are spaces around <cb> and <pb>
    result = result.replace(/(\[:.+?:\])/g, m => ` ${m} `);
    // remove spaces after marked hypens
    result = result.replace(/(\[[-¬]\]) /g, (...args) => args[1]);
    // remove whitespace before closing bracket of a note
    result = result.replace(/\s*\/Anmerkung\]/g, () => "]");
    // collapse multiple empty lines
    result = result.replace(/\n{3,}/g, "\n\n");
    // erase spaces at the beginning of a paragraph
    result = result.replace(/\n +/g, "\n");
    // collapse multiple spaces
    result = result.replace(/ {2,}/g, " ").trim();
    // remove <br> at the end of the text
    result = result.replace(/<br>$/, "");
    // trim paragraphs
    const div = result.split("\n\n");
    for (let i = 0, len = div.length; i < len; i++) {
      div[i] = div[i].trim();
      div[i] = div[i].replace(/^(<[^>]+?>) +/, (...args) => args[1]);
      div[i] = div[i].replace(/ +(<[^>]+?>) *$/, (...args) => args[1]);
    }
    result = div.join("\n\n");
    // decode entities
    const decoder = document.createElement("textarea");
    decoder.innerHTML = result;
    result = decoder.value;

    // return result
    return result;
  },

  // get the proper snippet of <text> using the submitted <pb> numbers
  //   pageFrom = number
  //   pageTo = number
  //   type = string (tei | tei-dta)
  //   xmlDoc = document
  //   xmlPlain = string
  getTextSnippet ({ pageFrom, pageTo, type, xmlDoc, xmlPlain }) {
    // try default values for @facs by import type
    const pb = xmlDoc.querySelectorAll("pb");
    let pbStartSel;
    let pbStart;
    let pbEndSel;
    let pbEnd;
    if (type === "tei-dta") {
      // DTA => search for @facs="#000n"
      pbStartSel = `facs="#f${pageFrom.toString().padStart(4, "0")}"`;
      pbStart = xmlDoc.querySelector(`pb[${pbStartSel}]`);
      pbEndSel = `facs="#f${pageTo.toString().padStart(4, "0")}"`;
      pbEnd = xmlDoc.querySelector(`pb[${pbEndSel}]`);
    }

    // unable to find starting <pb> => try different selectors
    if (!pbStart) {
      const selectors = [
        `facs="${pageFrom}"`,
        `facs="#${pageFrom}"`,
        `facs$="0${pageFrom}"`,
        `n="${pageFrom}"`,
        `n="#${pageFrom}"`,
        `n$="0${pageFrom}"`,
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
        importTei.error("Startseite im XML-Dokument nicht gefunden", "von");
        return "";
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
          importTei.error("Endseite im XML-Dokument nicht gefunden", "bis");
          return "";
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
        importTei.error(`ermittelte Endseite ${order} der Startseite`, "bis");
        return "";
      }
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
      text = tagsStart.join("") + xmlPlain.split(splitterStart)[1];
    } else {
      const splitted = xmlPlain.split(/<pb.*?>/);
      const pbXml = xmlPlain.match(/<pb.*?>/g);
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

    // normalize whitespace
    text = text.replace(/\r?\n/g, "");
    text = text.replace(/ {2,}/g, " ");

    // return <text>
    return text;

    // get index in node list
    function getIndex (n) {
      for (let i = 0, len = pb.length; i < len; i++) {
        if (pb[i] === n) {
          return i;
        }
      }
      return -1;
    }
  },

  // DTA: get title ID
  //   url = string
  dtaGetTitleId (url) {
    let titleId = "";
    let m;
    if (/\/(show|view)\//.test(url)) {
      m = /\/(show|view)\/(?<titleId>[^/?]+)/.exec(url);
    } else {
      m = /deutschestextarchiv\.de\/(?<titleId>[^/?]+)/.exec(url);
    }
    if (m?.groups?.titleId) {
      titleId = m.groups.titleId;
    }
    return titleId;
  },

  // DTA: get page number
  //   url = string
  //   titleId = string | undefined
  dtaGetPageNo (url, titleId) {
    // try to get page from GET variable
    const regGet = /p=(?<page>[0-9]+)/;
    const mGet = regGet.exec(url);
    if (mGet?.groups?.page) {
      return parseInt(mGet.groups.page, 10);
    }

    // try to get page from URL path
    let page = 1;
    if (!titleId) {
      titleId = importTei.dtaGetTitleId(url);
      if (!titleId) {
        return page;
      }
    }
    const regPath = new RegExp(`${titleId}\\/(?<page>[0-9]+)`);
    const mPath = regPath.exec(url);
    if (mPath?.groups?.page) {
      page = parseInt(mPath.groups.page, 10);
    }
    return page;
  },

  // show error message
  //   message = string
  //   focusField = string | undefined
  error (message, focusField = "url") {
    dialog.oeffnen({
      typ: "alert",
      text: `Der TEI-Import ist gescheitert.\n<h3>Fehlermeldung</h3>\n${message}`,
      callback: () => document.querySelector(`#beleg-tei-${focusField}`).select(),
    });
  },
};
