"use strict";

const importShared = {
  // Online-Ressourcen
  onlineResources: [
    {
      name: "DTA",
      desc: "aus dem DTA",
      type: "tei-dta",
      originReg: /^https:\/\/www\.deutschestextarchiv\.de$/,
      xmlPath: "https://www.deutschestextarchiv.de/book/download_xml/",
      xmlPathReg: /^\/book\/download_xml\/[^/]+/,
    },
    {
      name: "Polytechnisches Journal",
      desc: "aus dem Polytechnischen Journal",
      type: "tei-dingler",
      originReg: /^https:\/\/dingler\.bbaw\.de$/,
      xmlPath: "https://dingler.bbaw.de/xml/articles/",
      xmlPathReg: /^\/xml\/articles\/[^/]+/,
    },
  ],

  // Typ der zu importierenden Textdaten ermitteln
  //   str = string
  //   html = string | undefined
  detectType (str, html = "") {
    str = str.trim();

    // keine Textdaten übergeben
    if (!str) {
      return null;
    }

    // URL
    if (importShared.isKnownURL(str)) {
      return {
        data: {
          // string
          full: str,
          // string
          firstLine: str.split("\n")[0].trim(),
        },
        type: "url",
        formView: "url",
        formText: "",
        usesFileData: false,
      };
    }

    // Dateipfad
    if (importShared.isFilePath(str)) {
      return {
        data: {
          // string
          full: str,
          // string
          firstLine: str.split("\n")[0].trim(),
        },
        type: "file",
        formView: "datei",
        formText: "",
        usesFileData: false,
      };
    }

    // PPN
    if (importShared.isPPN(str)) {
      return {
        // string
        data: str,
        type: "ppn",
        formView: "zwischenablage",
        formText: "PPN",
        usesFileData: true,
      };
    }

    // BibTeX
    if (importShared.isBibtex(str)) {
      return {
        // string
        data: str,
        type: "bibtex",
        formView: "zwischenablage",
        formText: "BibTeX",
        usesFileData: true,
      };
    }

    // JSON
    const json = importShared.isKnownJSON(str);
    if (json) {
      return {
        // object (parsed JSON)
        data: json.data,
        type: json.type,
        formView: "zwischenablage",
        formText: json.formText,
        usesFileData: json.usesFileData,
      };
    }

    // XML
    const xml = importShared.isKnownXML(str);
    if (xml) {
      return {
        data: xml.data,
        type: xml.type,
        formView: "zwischenablage",
        formText: xml.formText,
        usesFileData: xml.usesFileData,
      };
    }

    // Plain-Text (bekanntes Format)
    const plain = importShared.isKnownPlainText(str);
    if (plain) {
      return {
        // object
        //   DeReKo: .meta (string), .belege (string)
        data: plain.data,
        type: plain.type,
        formView: "zwischenablage",
        formText: plain.formText,
        usesFileData: plain.usesFileData,
      };
    }

    // HTML und Plain-Text (unbekanntes Format)
    let text = beleg.toolsEinfuegenHtml(html || str);
    let textType = "plain";
    let htmlTags = [ ...beleg.toolsEinfuegenHtmlTags.inline_keep ];
    htmlTags = htmlTags.concat(Object.keys(beleg.toolsEinfuegenHtmlTags.speziell));
    for (const tag of htmlTags) {
      const reg = new RegExp(`<${tag}>`, "i");
      if (reg.test(text)) {
        textType = "html";
        break;
      }
    }
    if (text) {
      // nicht jeden Text akzeptieren
      //   - einzeiliger Text, der zu kurz ist
      //   - URLs und Dateipfade
      const lines = text.match(/\n/g)?.length || 1;
      if (lines === 1 && text.length < 200 ||
          /^(https?|file):\/\//.test(text)) {
        return null;
      }

      // Plain-Text aufbereiten
      // (if a random XML file was imported, "str" contains the XML tags;
      // do not normalize the line breaks in that case)
      if (textType === "plain" && !/<[a-zA-Z0-9_-]+?>/.test(str)) {
        text = str.replace(/\n+/g, "\n\n");
      }

      // Raw-Input aufbereiten
      const bx = [];
      for (let line of (html || str).split("\n")) {
        line = line.trim();
        if (line) {
          bx.push(line);
        }
      }

      return {
        data: {
          // string
          bs: text,
          // string
          bx: bx.join("\n"),
        },
        type: textType,
        formView: "zwischenablage",
        formText: textType === "plain" ? "Plain-Text (nur Beleg)" : "HTML (nur Beleg)",
        usesFileData: false,
      };
    }

    // Fallback
    return null;
  },

  // Check: BibTeX
  //   str = string
  isBibtex (str) {
    if (!/^@[a-zA-Z]+\{.+?,/.test(str) || !/\}$/.test(str)) {
      return false;
    }
    return true;
  },

  // Check: Dateipfad
  //   str = string
  isFilePath (str) {
    let validPath;
    try {
      validPath = new URL(str).href;
    } catch {
      return null;
    }
    if (/^file:\/\//.test(validPath)) {
      return true;
    }
    return false;
  },

  // Check: JSON in einem bekannten Format
  //   str = string
  isKnownJSON (str) {
    // JSON?
    let json;
    try {
      json = JSON.parse(str);
    } catch {
      return null;
    }

    // DWDS?
    if (json?.[0]?.ctx_ && json?.[0]?.meta_) {
      return {
        data: json,
        type: "json-dwds",
        formText: "JSON (DWDS)",
        usesFileData: true,
      };
    }

    // keine bekannten JSON-Daten
    return null;
  },

  // Check: Plain-Text in einem bekannten Format
  //   str = string
  isKnownPlainText (str) {
    // DeReKo
    if (/^© Leibniz-Institut für Deutsche Sprache, Mannheim/.test(str)) {
      const meta = str.match(/\nDatum\s*:.+?\n\n/s)?.[0];
      const belege = str.match(/\nBelege \(.+?_{5,}\n\n(.+)/s)?.[1]?.trim();
      if (!meta || !belege) {
        return null;
      }
      return {
        data: {
          meta,
          belege,
        },
        type: "plain-dereko",
        formText: "Plain-Text (DeReKo)",
        usesFileData: true,
      };
    }
    return null;
  },

  // Check: URL einer bekannten Quelle
  //   str = string
  isKnownURL (str) {
    let validURL;
    try {
      validURL = new URL(str);
    } catch {
      return null;
    }
    for (const i of importShared.onlineResources) {
      if (i.originReg.test(validURL.origin)) {
        return i;
      }
    }
    return false;
  },

  // Check: XML in einem bekannten Format
  //   str = string
  isKnownXML (str) {
    // XML?
    if (!/<[^>]+?>/.test(str)) {
      // Der Parser produziert bei Nicht-XML-Daten viele CSP violations,
      // was beim Testen dieser Funktionen nervt.
      // => Gar nicht erst parsen, wenn kein Tag im String zu finden ist.
      return null;
    }
    const xml = importShared.parseXML(str);
    if (!xml) {
      return null;
    }

    // DWDS
    if (xml.documentElement.nodeName === "Beleg" && xml.querySelector("Fundstelle Korpus")) {
      return {
        data: {
          xmlDoc: xml,
          xmlStr: str,
        },
        type: "xml-dwds",
        formText: "XML (DWDS)",
        usesFileData: false,
      };
    }

    // TEI
    if (xml.documentElement.nodeName === "TEI") {
      // DTA
      if (xml.querySelector("publicationStmt publisher orgName[role='project']")?.textContent === "Deutsches Textarchiv") {
        return {
          data: {
            xmlDoc: xml,
            xmlStr: str,
          },
          type: "tei-dta",
          formText: "TEI-XML (DTA)",
          usesFileData: false,
        };
      }

      // Polytechnisches Journal
      if (/\bDingler\b/.test(xml.querySelector("publicationStmt publisher orgName[role='project']")?.textContent)) {
        return {
          data: {
            xmlDoc: xml,
            xmlStr: str,
          },
          type: "tei-dingler",
          formText: "TEI-XML (Polytechnisches Journal)",
          usesFileData: false,
        };
      }

      // Quelle unbekannt
      return {
        data: {
          xmlDoc: xml,
          xmlStr: str,
        },
        type: "tei",
        formText: "TEI-XML",
        usesFileData: false,
      };
    }

    // MODS
    if (xml.documentElement.nodeName === "mods" && xml.querySelector("mods titleInfo")) {
      return {
        data: {
          xmlDoc: xml,
          xmlStr: str,
        },
        type: "xml-mods",
        formText: "XML (MODS)",
        usesFileData: true,
      };
    }

    // Fundstelle
    if (/^Fundstellen?$/.test(xml.documentElement.nodeName)) {
      return {
        data: {
          xmlDoc: xml,
          xmlStr: str,
        },
        type: "xml-fundstelle",
        formText: "XML (Fundstelle)",
        usesFileData: true,
      };
    }

    // Format unbekannt
    return null;
  },

  // Check: PPN
  //   str = string
  isPPN (str) {
    if (/^([0-9]{9,10}|[0-9]{8,9}X)$/.test(str)) {
      return true;
    }
    return false;
  },

  // Kodierung des übergebenen Strings auf Validität testen
  //   str = string
  isWrongEncoding (str) {
    // Der Anfang des Strings wird auf den replacement character getestet.
    // Der replacement character ersetzt beim Einlesen der Datei Zeichen,
    // die in Unicode nicht dargestellt werden können.
    // => Hinweis auf falsche Kodierung beim Einlesen einer Datei
    const sub = str.substring(0, 10000);
    if (/\uFFFD/u.test(sub)) {
      return true;
    }
    return false;
  },

  // leeres Import-Objekt für die Daten erzeugen
  importObject () {
    return {
      importiert: false,
      ds: {
        // Autor
        au: "",
        // Import bis Seite
        bb: "",
        // Importtyp
        bi: "",
        // Beleg
        bs: "",
        // Import von Seite
        bv: "",
        // Original
        bx: "",
        // Belegdatum
        da: "",
        // Importdatum
        di: new Date().toISOString(),
        // Korpus
        kr: "",
        // Notizen
        no: "",
        // Quelle
        qu: "",
        // Textsorte
        ts: "",
        // Aufrufdatum
        ud: "",
        // URL
        ul: "",
      },
    };
  },

  // Datei auswählen
  async fileSelect () {
    const opt = {
      title: "Datei öffnen",
      defaultPath: appInfo.documents,
      filters: [
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
        {
          name: "BibTeX",
          extensions: [ "bib", "bibtex" ],
        },
        {
          name: "HTML",
          extensions: [ "htm", "html" ],
        },
        {
          name: "JSON",
          extensions: [ "json" ],
        },
        {
          name: "Text",
          extensions: [ "txt" ],
        },
        {
          name: "XML",
          extensions: [ "xml" ],
        },
      ],
      properties: [ "openFile" ],
    };

    if (optionen.data.letzter_pfad) {
      opt.defaultPath = optionen.data.letzter_pfad;
    }

    const result = await modules.ipc.invoke("datei-dialog", {
      open: true,
      winId: winInfo.winId,
      opt,
    });

    // Fehler oder keine Datei ausgewählt
    if (result.message || !Object.keys(result).length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
        callback: () => document.getElementById("beleg-import-datei").focus(),
      });
      return;
    } else if (result.canceled) {
      return;
    }

    // Dateiname in Import-Feld eintragen
    document.getElementById("beleg-import-feld").value = "file://" + result.filePaths[0];
    document.getElementById("beleg-import-von").select();
  },

  // Datei einlesen
  async fileRead () {
    // Pfad einlesen
    let pfad = document.getElementById("beleg-import-feld").value.trim();
    if (!pfad) {
      fehler("Dateipfad nicht gefunden");
      return false;
    }
    if (!importShared.isFilePath(pfad)) {
      fehler("Dateipfad nicht valide");
      return false;
    }
    pfad = modules.path.normalize(pfad.replace(/^file:\/\//, ""));

    // Existiert die Datei?
    const exists = await helfer.exists(pfad);
    if (!exists) {
      fehler("Datei nicht gefunden");
      return false;
    }

    // Datei einlesen
    const encodings = [ "utf8", "latin1" ];
    let encoding = 0;
    let result = null;
    if (pfad !== importShared.fileData.path) {
      result = await readFile();
    }

    // Ergebnis zurückgeben und ggf. Dateidaten zurücksetzen
    if (result) {
      importShared.fileDataReset();
      importShared.fileData.path = pfad;
      importShared.fileData.raw = result;
    }
    return {
      content: result,
      path: pfad,
    };

    async function readFile () {
      let fileCont;
      try {
        fileCont = await modules.fsp.readFile(pfad, {
          encoding: encodings[encoding],
        });
      } catch (err) {
        fehler(`${err.name}: ${err.message}`);
        return false;
      }

      if (fileCont.trim() === "") {
        // Null-Byte-Datei
        fehler("Datei enthält keine Daten");
        return false;
      } else if (encoding < encodings.length - 1 &&
          importShared.isWrongEncoding(fileCont)) {
        // Kodierung offenbar falsch => Datei noch einmal mit einer anderen Kodierung einlesen
        encoding++;
        fileCont = await readFile();
      }
      return fileCont;
    }

    // Fehlermeldung anzeigen
    function fehler (message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${message}</p>`,
        callback: () => document.getElementById("beleg-import-feld").select(),
      });
    }
  },

  // Dateidaten
  fileData: {
    // Belege
    data: [],
    // gemeinsame Metadaten für alle Belege
    meta: "",
    // Pfad zur Datei
    path: "",
    // Rohdaten der Datei
    raw: "",
    // SHA1-ID
    sha1: "",
  },

  // Dateidaten zurücksetzen
  fileDataReset () {
    for (const k of Object.keys(importShared.fileData)) {
      if (Array.isArray(importShared.fileData[k])) {
        importShared.fileData[k].length = 0;
      } else {
        importShared.fileData[k] = "";
      }
    }
  },

  // Dateidaten importieren
  async fileDataImport () {
    const fileData = importShared.fileData;
    let result = false;

    if (fileData.data.length === 1) {
      // nur ein Datensatz in der Datei => direkt importieren
      const fillCard = await importShared.fileDataImportAlready(fileData.data[0]);
      if (fillCard) {
        result = await importShared.fillCard(fileData.data[0].ds);
        if (result) {
          fileData.data[0].importiert = true;
        }
      }
    } else {
      // mehrere Datensätze in der Datei => Import-Fenster öffnen
      let interval;
      result = await new Promise(resolve => {
        importShared.fileDataWin();
        interval = setInterval(() => {
          if (importShared.fileDataWinResponse !== null) {
            clearInterval(interval);
            resolve(importShared.fileDataWinResponse);
          }
        }, 50);
      });
    }

    return result;
  },

  // Dateidaten: Frage, ob ein bereits importierter Datensatz noch einmal importiert werden soll
  //   ds = object
  //     (Datensatzobjekt des Belegs)
  async fileDataImportAlready (ds) {
    let importieren = true;
    if (ds.importiert) {
      importieren = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: "Dieser Datensatz wurde schon einmal importiert.\nSoll er noch einmal importiert werden?",
          callback: () => resolve(dialog.antwort),
        });
      });
    }
    return importieren;
  },

  // Dateidaten: Antwort des Import-Fensters
  fileDataWinResponse: null,

  // Dateidaten: Import-Fenster mit der Liste der eingelesenen Belege öffnen
  fileDataWin () {
    // Fenster öffnen
    overlay.oeffnen(document.getElementById("import"));
    document.getElementById("import-abbrechen-button").focus();
    importShared.fileDataWinResponse = null;

    // Länge des längsten Worts ermitteln
    // (wird für die Auswahl des Textausschnitts gebraucht)
    let laengstesWort = 0;
    for (const wort of Object.keys(data.fv)) {
      if (wort.length > laengstesWort) {
        laengstesWort = wort.length;
      }
    }

    // Aufbau der Belegliste vorbereiten
    const daten = importShared.fileData.data;
    let autorenVorhanden = false;
    let belegeVorhanden = false;

    const cont = document.getElementById("import-cont-over");
    cont.replaceChildren();
    const table = document.createElement("table");
    cont.appendChild(table);

    // Belegliste aufbauen
    daten.forEach((i, n) => {
      // Zeile
      const tr = document.createElement("tr");
      table.appendChild(tr);
      tr.dataset.idx = n;
      tr.addEventListener("click", function () {
        overlay.ausblenden(document.getElementById("import"));
        setTimeout(async () => {
          // 200ms Zeit lassen, um das Overlay-Fenster zu schließen (wichtig!)
          const idx = parseInt(this.dataset.idx, 10);
          const fillCard = await importShared.fileDataImportAlready(importShared.fileData.data[idx]);
          if (fillCard) {
            importShared.fileDataWinResponse = await importShared.fillCard(importShared.fileData.data[idx].ds);
            if (importShared.fileDataWinResponse) {
              importShared.fileData.data[idx].importiert = true;
            }
          } else {
            importShared.fileDataWinResponse = false;
          }
        }, 200);
      });

      // Haken
      let td = document.createElement("td");
      tr.appendChild(td);
      const img = document.createElement("img");
      td.appendChild(img);
      img.width = "24";
      img.height = "24";
      if (i.importiert) {
        img.src = "img/check-gruen.svg";
        img.title = "demarkieren";
      } else {
        img.src = "img/platzhalter.svg";
        img.title = "markieren";
      }
      img.addEventListener("click", function (evt) {
        evt.stopPropagation();
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        daten[idx].importiert = !daten[idx].importiert;
        if (daten[idx].importiert) {
          this.src = "img/check-gruen.svg";
          this.title = "demarkieren";
        } else {
          this.src = "img/platzhalter.svg";
          this.title = "markieren";
        }
        tooltip.init(this.parentNode);
      });

      // Datum
      td = document.createElement("td");
      tr.appendChild(td);
      td.textContent = i.ds.da || "o.\u00A0J.";
      if (i.ds.da.length > 4) {
        table.classList.add("datum-breit");
      }

      // Autor
      td = document.createElement("td");
      tr.appendChild(td);
      td.textContent = i.ds.au;
      if (i.ds.au === "N.\u00A0N.") {
        td.classList.add("kein-wert");
      } else {
        autorenVorhanden = true;
      }

      // Beleganriss
      td = document.createElement("td");
      tr.appendChild(td);
      let bs = i.ds.bs.replace(/\n/g, " ");
      bs = bs.normalize("NFC");
      if (!bs) {
        // z.B. beim Import von BibTeX gibt es keine Belege
        td.classList.add("kein-wert");
        td.textContent = "kein Beleg";
        return;
      }
      belegeVorhanden = true;
      const pos = importShared.checkQuotation(bs, true);
      pos.sort((a, b) => a - b);
      if (!pos.length) {
        td.textContent = bs.substring(0, 150);
      } else {
        let vor = laengstesWort + 20;
        const start = pos[0] - vor < 0 ? 0 : pos[0] - vor;
        if (start === 0) {
          vor = 0;
        }
        td.textContent = `${start > 0 ? "…" : ""}${bs.substring(start, start + 150 - vor)}`;
      }
    });

    // Tabellenlayout anpassen
    if (!autorenVorhanden) {
      table.classList.add("keine-autoren");
    }
    if (!belegeVorhanden) {
      table.classList.add("keine-belege");
    }

    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("import-cont-over"),
    });

    // Tooltips initialisieren
    tooltip.init(cont);
  },

  // Dateidaten: Import-Fenster schließen
  fileDataWinClose () {
    importShared.fileDataWinResponse = false;
    overlay.ausblenden(document.getElementById("import"));
    document.getElementById("beleg-import-start").focus();
  },

  // Import starten
  async startImport () {
    // Ansicht ermitteln
    // (url | datei | zwischenablage)
    let ansicht = document.querySelector("[name='beleg-import-quelle']:checked");
    ansicht = ansicht.id.replace("beleg-import-quelle-", "");

    // Daten einlesen
    let typeData;
    if (ansicht === "url") {
      // URL
      const data = await importURL.startImport();
      typeData = data.typeData;
      if (typeData) {
        typeData.formData = data.formData;
        typeData.urlData = data.urlData;
      }
    } else if (ansicht === "datei") {
      // DATEI
      const fileData = await importShared.fileRead();
      if (fileData.content) {
        // Datentyp ermitteln
        typeData = importShared.detectType(fileData.content);
      } else if (fileData.content === null) {
        // Datei bereits eingelesen
        if (importShared.fileData.data.length) {
          typeData = true;
        } else if (fileData.path === importShared.fileData.path && importShared.fileData.raw) {
          typeData = importShared.detectType(importShared.fileData.raw);
        }
      } else {
        // Einlesen gescheitert
        typeData = false;
      }
      // bei TEI-Dokumenten Formulardaten hinzufügen
      if (/^tei/.test(typeData?.type)) {
        typeData.formData = importURL.getFormData(false);
      }
    } else if (ansicht === "zwischenablage") {
      // ZWISCHENABLAGE
      typeData = importShared.detectType(modules.clipboard.readText(), modules.clipboard.readHTML());
      if (typeData.formView !== "zwischenablage") {
        beleg.formularImport({
          src: typeData.formView,
          typeData,
        });
        return;
      }
      if (typeData.usesFileData) {
        const str = typeof typeData.data === "string" ? typeData.data : JSON.stringify(typeData.data);
        const sha1 = modules.crypto.createHash("sha1").update(str).digest("hex");
        if (sha1 !== importShared.fileData.sha1) {
          // Dateidaten aus der Zwischenablage neu einlesen
          importShared.fileDataReset();
          importShared.fileData.sha1 = sha1;
        } else if (importShared.fileData.data.length) {
          // Dateidaten aus der Zwischenablage bereits eingelesen
          typeData = true;
        }
      }
    }
    if (!typeData) {
      if (typeData === null) {
        dialog.oeffnen({
          typ: "alert",
          text: 'Beim Einlesen der Daten ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">keine Daten gefunden</p>',
        });
      }
      return;
    }

    // Daten verteilen
    let result = false;
    if (typeData === true) {
      // Dateidaten wurden bereits eingelesen
      result = await importShared.fileDataImport();
    } else if (typeData.type === "bibtex") {
      // BIBTEX
      result = await importBibtex.startImport({ content: typeData.data });
    } else if (typeData.type === "html" || typeData.type === "plain") {
      // HTML | PLAIN
      const ds = importShared.importObject().ds;
      ds.bi = typeData.type;
      ds.bs = typeData.data.bs;
      ds.bx = typeData.data.bx;
      result = await importShared.fillCard(ds);
    } else if (typeData.type === "json-dwds") {
      // JSON-DWDS
      importDWDS.startImportJSON(typeData.data);
      result = await importShared.fileDataImport();
    } else if (typeData.type === "plain-dereko") {
      // PLAIN-DEREKO
      importDereko.meta(typeData.data.meta);
      importDereko.belege(typeData.data.belege);
      result = await importShared.fileDataImport();
    } else if (typeData.type === "ppn") {
      // PPN
      const xmlStr = await redLit.eingabeXMLPPN({ ppn: typeData.data, returnXmlStr: true });
      if (xmlStr) {
        const xml = importShared.isKnownXML(xmlStr);
        if (xml) {
          result = await importLit.startImport({ ...xml.data, type: "xml-mods" });
        }
      }
    } else if (/^tei/.test(typeData.type)) {
      // TEI
      result = await importTEI.startImport(typeData);
    } else if (typeData.type === "xml-dwds") {
      // XML-DWDS
      result = importDWDS.startImportXML({ ...typeData.data, ansicht });
    } else if (typeData.type === "xml-fundstelle" || typeData.type === "xml-mods") {
      // XML-FUNDSTELLE | XML-MODS
      result = await importLit.startImport({ ...typeData.data, type: typeData.type });
    }

    // ggf. Clipboard löschen
    if (result && optionen.data.einstellungen["karteikarte-clear-clipboard"]) {
      modules.clipboard.clear();
    }
  },

  // Karteikarte ausfüllen
  //   ds = object
  //     (Importdaten für den Beleg)
  async fillCard (ds) {
    // Kann und soll der Beleg nicht lieber aus der passenden Online-Ressource importiert werden?
    if (await importShared.importFromOriginalSource(ds)) {
      return false;
    }

    // Ist die Karte schon ausgefüllt?
    const datenfelder = {
      da: "Datum",
      au: "Autor",
      bs: "Beleg",
      qu: "Quelle",
      ul: "URL",
      ud: "Aufrufdatum",
      kr: "Korpus",
      ts: "Textsorte",
      no: "Notizen",
    };
    const ausgefuellt = new Set();
    for (const [ k, v ] of Object.entries(ds)) {
      if (v && datenfelder[k] && beleg.data[k]) {
        ausgefuellt.add(datenfelder[k]);
      }
    }
    if (ausgefuellt.size) {
      let felder = [ ...ausgefuellt ].join(", ");
      felder = felder.replace(/, ([a-zA-Z]+)$/, (...args) => `</i> und <i>${args[1]}`);
      let numerus = [ "Die Felder", "werden" ];
      if (ausgefuellt.size === 1) {
        numerus = [ "Das Feld", "wird" ];
      }
      const fuellen = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `Die Karteikarte ist teilweise schon gefüllt.\n${numerus[0]} <i>${felder}</i> ${numerus[1]} beim Importieren der geladenen Daten überschrieben.\nMöchten Sie den Import wirklich starten?`,
          callback: () => resolve(dialog.antwort),
        });
      });
      if (!fuellen) {
        document.getElementById("beleg-import-start").focus();
        return false;
      }
    }

    // Karte ausfüllen
    for (const [ k, v ] of Object.entries(ds)) {
      if (!v) {
        continue;
      }
      beleg.data[k] = v;
    }
    beleg.formular(false, true);
    beleg.belegGeaendert(true);

    // Wort im Beleg?
    // (nur überprüfen, wenn Belegtext importiert wurde;
    // bei BibTeX ist das bspw. nicht der Fall)
    if (beleg.data.bs) {
      const result = importShared.checkQuotation();
      if (result) {
        document.getElementById("beleg-da").focus();
      }
    }

    // Import ausgeführt
    return true;
  },

  // Online-Ressource bevorzugen?
  //   ds = object
  async importFromOriginalSource (ds) {
    // keine URL vorhanden
    if (!ds.ul) {
      return false;
    }

    // Wurde aus einer bekannten Online-Ressource importiert?
    let source = null;
    let validURL;
    try {
      validURL = new URL(ds.ul);
    } catch {
      return false;
    }
    for (const i of importShared.onlineResources) {
      if (i.originReg.test(validURL.origin)) {
        if (ds.bi !== i.type) {
          source = i;
        }
        break;
      }
    }
    if (!source) {
      return false;
    }

    // Fragen, ob nicht lieber aus der Online-Ressource importiert werden soll
    if (!optionen.data.einstellungen["karteikarte-original-bevorzugen"]) {
      const result = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `Der Beleg stammt ${source.desc}.\nMöchten Sie ihn nicht lieber direkt aus der Originalquelle importieren?`,
          callback: () => resolve(dialog.antwort),
        });
        document.getElementById("dialog-text").appendChild(optionen.shortcut("Import aus Originalquelle künftig ohne Nachfrage", "karteikarte-original-bevorzugen"));
      });
      if (!result) {
        return false;
      }
    }

    // Ansicht des Import-Formulars wechseln
    modules.clipboard.writeText(ds.ul);
    beleg.formularImport({
      src: "url",
    });
    importShared.startImport();
    return true;
  },

  // überprüft, ob eines der Karteiwörter im importierten Text gefunden wurde;
  // außerdem gibt es die Möglichkeit, sich die Textposition der Karteiwörter
  // zurückgeben zu lassen (wird für das Datei-Import-Fenster gebraucht)
  //   bs = string | undefined
  //     (Belegtext)
  //   pos = true | undefined
  //     (Position der Treffer soll zurückgegeben werden)
  checkQuotation (bs = beleg.data.bs, pos = false) {
    if (!pos && (!bs || !optionen.data.einstellungen["wort-check"])) {
      return true;
    }

    let wortGefunden = false;
    const positionen = [];
    for (const i of helfer.formVariRegExpRegs) {
      if (data.fv[i.wort].ma &&
          !optionen.data.einstellungen["wort-check-nur-markieren"]) {
        // "Nur markieren"-Varianten normalerweise nicht berücksichtigen
        continue;
      }
      let reg;
      if (!data.fv[i.wort].tr) {
        // nicht trunkiert
        reg = new RegExp(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`, "gi");
      } else {
        // trunkiert
        reg = new RegExp(i.reg, "gi");
      }
      const found = reg.test(bs);
      if (pos && found) {
        positionen.push(reg.lastIndex);
      } else if (found) {
        wortGefunden = true;
        break;
      }
    }

    // ggf. Trefferpositionen zurückgeben
    if (pos) {
      return positionen;
    }

    // ggf. Warnmeldung anzeigen
    if (!wortGefunden) {
      const verianten = [];
      for (const [ k, v ] of Object.entries(data.fv)) {
        if (v.ma && !optionen.data.einstellungen["wort-check-nur-markieren"]) {
          continue;
        }
        verianten.push(k);
      }
      let numerus = [ "Das Karteiwort", "" ];
      let woerter = verianten.join(", ");
      if (verianten.length > 1) {
        numerus = [ "Die Karteiwörter", "n" ];
        woerter = woerter.replace(/(.+), (.+)/, (...args) => `${args[1]}</i> und <i>${args[2]}`);
      }
      dialog.oeffnen({
        typ: "alert",
        text: `${numerus[0]} <i>${woerter}</i> wurde${numerus[1]} im gerade importierten Belegtext nicht gefunden.`,
        callback: () => {
          const ansicht = document.querySelector("[name='beleg-import-quelle']:checked");
          if (/url$/.test(ansicht.id)) {
            document.getElementById("beleg-import-bis").select();
          } else {
            document.getElementById("beleg-import-start").focus();
          }
        },
      });
      return false;
    }
    return true;
  },
  // XML-String parsen
  //   xmlStr = string
  parseXML (xmlStr) {
    xmlStr = importShared.removeNS(xmlStr);
    const xmlDoc = new DOMParser().parseFromString(xmlStr, "text/xml");
    if (xmlDoc.querySelector("parsererror")) {
      return null;
    }
    return xmlDoc;
  },

  // @xmlns aus einem XML-String entfernen
  // (Hintergrund ist, dass XPath 1.0 das Konzept eines default namespace ohne
  // Präfix nicht kennt. Darum kann evalute() mit XML-Dateien,
  // die einen default namespace haben, nicht funktionieren.)
  //   xmlStr = string
  removeNS (xmlStr) {
    xmlStr = xmlStr.replace(/ xmlns=".+?"/, "");
    return xmlStr;
  },

  // Titelaufnahme: neuen Datensatz erstellen
  makeTitleObject () {
    return {
      autor: [],
      hrsg: [],
      titel: [],
      untertitel: [],
      inTitel: [],
      band: "",
      bandtitel: [],
      auflage: "",
      quali: "",
      ort: [],
      verlag: "",
      jahrgang: "",
      jahr: "",
      jahrZuerst: "",
      heft: "",
      spalte: false,
      seiten: "",
      seite: "",
      serie: "",
      serieBd: "",
      url: [],
      ppn: [],
    };
  },

  // Titelaufnahme: aus übergebenen Daten zusammensetzen
  //   td = object
  //     (Datensatz mit den Titeldaten)
  makeTitle (td) {
    let titel = "";

    // Autor
    if (td.autor.length) {
      if (td.autor.length > 3) {
        titel = `${td.autor[0]}/${td.autor[1]} u.\u00A0a.: `;
      } else {
        titel = `${td.autor.join("/")}: `;
      }
    } else if (td.hrsg.length) {
      if (td.hrsg.length > 3) {
        titel = `${td.hrsg[0]}/${td.hrsg[1]} u.\u00A0a.: `;
      } else {
        titel = `${td.hrsg.join("/")} (Hrsg.): `;
      }
    } else {
      titel = "N.\u00A0N.: ";
    }

    // Titel
    titel += td.titel.join(". ");

    // Untertitel
    if (td.untertitel.length) {
      td.untertitel.forEach(i => {
        if (/^[a-zäöü]/.test(i)) {
          titel += ",";
        } else if (!/^[([{]/.test(i)) {
          punkt();
        }
        titel += ` ${i}`;
      });
    }

    // In
    if (td.inTitel.length) {
      punkt();
      titel += " In: ";
      if (td.autor.length && td.hrsg.length && !td.jahrgang) {
        titel += `${hrsg(true)} (Hrsg.): `;
      }
      titel += td.inTitel.join(". ");
    }

    // Band
    if (td.band && !td.jahrgang) {
      punkt();
      titel += ` ${td.band}`;
      if (td.bandtitel.length) {
        titel += `: ${td.bandtitel.join(". ")}`;
      }
    }

    // ggf. Herausgeber ergänzen
    if (!td.inTitel.length && td.hrsg.length && td.autor.length) {
      punkt();
      titel += ` Hrsg. von ${hrsg(false)}`;
    }

    // Auflage
    if (td.auflage && !td.jahrgang && !/^1(\.|$)|1\.\sAufl/.test(td.auflage)) {
      if (/\sAufl(\.|age)?|(\sA|(?<=\p{Lowercase})a)usg(\.|abe)?/u.test(td.auflage)) {
        titel += `. ${td.auflage}`;
      } else {
        titel += `. ${td.auflage}. Aufl.`;
      }
    }

    // Qualifikationsschrift
    if (td.quali) {
      punkt();
      titel += ` ${td.quali}`;
    }

    // Ort
    if (td.ort.length && !td.jahrgang) {
      punkt();
      if (td.ort.length > 2) {
        titel += ` ${td.ort[0]} u.\u00A0a.`;
      } else {
        titel += ` ${td.ort.join("/")}`;
      }
    } else if (!td.ort.length && !td.jahrgang) {
      punkt();
    }

    // Verlag
    if (optionen.data.einstellungen["literatur-verlag"] && td.verlag) {
      if (td.ort.length) {
        titel += `: ${td.verlag}`;
      } else {
        punkt();
        titel += ` ${td.verlag}`;
      }
    }

    // Jahrgang (+ Heft) + Jahr
    if (td.jahrgang) {
      titel += ` ${td.jahrgang}`;
      if (/^[0-9]+$/.test(td.heft)) {
        titel += `/${td.heft}`;
      }
      if (td.jahr) {
        titel += ` (${td.jahr})`;
      }
    } else if (td.jahr) {
      titel += ` ${td.jahr}`;
      if (td.jahrZuerst) {
        titel += ` [${td.jahrZuerst}]`;
      }
    }

    // Heft (wenn Angabe nicht-numerisch)
    if (td.heft && !/^[0-9]+$/.test(td.heft)) {
      titel += `, ${td.heft}`;
    }

    // Seiten/Spalten
    const seite_spalte = td.spalte ? "Sp.\u00A0" : "S.\u00A0";
    if (td.seiten) {
      titel += `, ${/Sp?\. /.test(td.seiten) ? "" : seite_spalte}${td.seiten}`;
    }
    if (td.seite) {
      if (td.seiten) {
        titel += `, hier ${td.seite}`;
      } else {
        titel += `, ${seite_spalte}${td.seite}`;
      }
    }

    // Serie
    if (optionen.data.einstellungen["literatur-serie"] && td.serie) {
      titel += ` (${td.serie}${td.serieBd ? " " + td.serieBd : ""})`;
    }
    punkt();

    // Titel typographisch verbessern und zurückgeben
    titel = helfer.textTrim(titel, true);
    titel = helfer.typographie(titel);
    return titel;

    // ggf. Punkt ergänzen
    function punkt () {
      if (!/[,;.:!?]$/.test(titel)) {
        titel += ".";
      }
    }

    // Herausgeber auflisten
    //   slash = boolean
    //     (Anschluss mit Slash, sonst mit Kommata bzw. "und")
    function hrsg (slash) {
      let pers = "";
      for (let i = 0, len = td.hrsg.length; i < len; i++) {
        // maximal 3 Hrsg. nennen; bei mehr Hrsg. => 2 Hrsg. + u.a.
        if (len > 3 && i === 2) {
          pers += " u.\u00A0a.";
          break;
        }

        // Anschluss
        if (i > 0 && slash) {
          pers += "/";
        } else if (i > 0 && i === len - 1) {
          pers += " und ";
        } else if (i > 0) {
          pers += ", ";
        }

        // Namen umdrehen: Nachname, Vorname > Vorname Nachname
        const hrsg = td.hrsg[i].split(", ");
        hrsg.reverse();
        pers += hrsg.join(" ");
      }
      return pers;
    }
  },
};
