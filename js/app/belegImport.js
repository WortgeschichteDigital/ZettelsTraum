"use strict";

const belegImport = {
  // DTA-Import: Daten, die importiert wurden
  DTAData: {},

  // DTA-Import: Datenobjekt zurücksetzen
  DTAResetData () {
    belegImport.DTAData = {
      autor: [],
      hrsg: [],
      titel: [],
      untertitel: [],
      band: "",
      auflage: "",
      ort: [],
      verlag: "",
      datum_druck: "",
      datum_entstehung: "",
      spalte: false,
      seiten: "",
      seite: "",
      seite_zuletzt: "",
      zeitschrift: "",
      zeitschrift_jg: "",
      zeitschrift_h: "",
      serie: "",
      serie_bd: "",
      beleg: "",
      textsorte: [],
      textsorte_sub: [],
      url: "",
    };
  },

  // DTA-Import: Daten aus dem DTA importieren
  DTA () {
    const dta = document.getElementById("beleg-dta");
    const url = helfer.textTrim(dta.value, true);
    // URL fehlt
    if (!url) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keine URL eingegeben.",
        callback: () => {
          dta.select();
        },
      });
      return;
    }
    // Ist das überhaupt eine URL?
    if (!/^https?:\/\//.test(url)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Das scheint keine URL zu sein.",
        callback: () => {
          dta.select();
        },
      });
      return;
    }
    // URL nicht vom DTA
    if (!/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die URL stammt nicht vom DTA.",
        callback: () => {
          dta.select();
        },
      });
      return;
    }
    // Titel-ID ermitteln
    const titel_id = belegImport.DTAGetTitelId(url);
    if (!titel_id) {
      dialog.oeffnen({
        typ: "alert",
        text: "Beim ermitteln der Titel-ID ist etwas schiefgelaufen.\nIst die URL korrekt?",
        callback: () => {
          dta.focus();
        },
      });
      return;
    }
    // Faksimileseite ermitteln
    const fak = belegImport.DTAGetFak(url, titel_id);
    if (!fak) {
      dialog.oeffnen({
        typ: "alert",
        text: "Beim ermitteln der Seite ist etwas schiefgelaufen.\nIst die URL korrekt?",
        callback: () => {
          dta.focus();
        },
      });
      return;
    }
    // Ist die Kartei schon ausgefüllt?
    if (beleg.data.da || beleg.data.au || beleg.data.bs || beleg.data.qu || beleg.data.ul || beleg.data.ud || beleg.data.kr || beleg.data.ts) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Die Karteikarte ist teilweise schon gefüllt.\nDie Felder <i>Datum, Autor, Beleg, Quelle, URL, Aufrufdatum, Korpus</i> und <i>Textsorte</i> werden beim Importieren der Textdaten aus dem DTA überschrieben.\nMöchten Sie den DTA-Import wirklich starten?",
        callback: () => {
          if (dialog.antwort) {
            startImport();
          } else {
            dta.focus();
          }
        },
      });
      return;
    }
    // Dann mal los...
    startImport();
    // Startfunktion
    async function startImport () {
      belegImport.DTAResetData();
      belegImport.DTAData.url = `https://www.deutschestextarchiv.de/${titel_id}/${fak}`;
      const url_xml = `https://www.deutschestextarchiv.de/book/download_xml/${titel_id}`;
      document.activeElement.blur();
      const result = await belegImport.DTARequest(url_xml, fak);
      belegImport.clearClipboard(result, false);
    }
  },

  // DTA-Import: Titel-ID ermitteln
  //   url = String
  //     (DTA-URL)
  DTAGetTitelId (url) {
    let m;
    let titel_id = "";
    if (/\/(show|view)\//.test(url)) {
      m = /\/(show|view)\/(?<titel_id>[^/?]+)/.exec(url);
    } else {
      m = /deutschestextarchiv\.de\/(?<titel_id>[^/?]+)/.exec(url);
    }
    if (m && m.groups.titel_id) {
      titel_id = m.groups.titel_id;
    }
    return titel_id;
  },

  // DTA-Import: Faksimile-Nummer ermitteln
  //   url = String
  //     (DTA-URL)
  //   titel_id = String
  //     (titel_id, falls sie schon ermittelt wurde, sonst leerer String)
  DTAGetFak (url, titel_id) {
    let fak = "";
    if (!titel_id) {
      titel_id = belegImport.DTAGetTitelId(url);
      if (!titel_id) {
        return fak;
      }
    }
    if (/p=[0-9]+/.test(url)) {
      fak = url.match(/p=([0-9]+)/)[1];
    } else if (new RegExp(`${titel_id}\\/[0-9]+`).test(url)) {
      const reg = new RegExp(`${titel_id}\\/([0-9]+)`);
      fak = url.match(reg)[1];
    }
    return fak;
  },

  // DTA-Import: XMLHttpRequest stellen
  //   url = String
  //     (URL des Dokument, das aus dem DTA geladen werden soll)
  //   fak = String
  //     (Faksimile-Seite des Titels)
  async DTARequest (url, fak) {
    const response = await helfer.fetchURL(url);
    // Fehler
    if (response.fehler) {
      belegImport.DTAFehler(`HttpRequest: ${response.fehler}`);
      return false;
    }
    // keine Textdaten
    if (!response.text) {
      belegImport.DTAFehler("HttpRequest: keine Daten empfangen");
      return false;
    }
    // DTAQ
    if (/<title>DTA Qualitätssicherung<\/title>/.test(response.text)) {
      belegImport.DTAFehler("DTAQ: Titel noch nicht freigeschaltet");
      return false;
    }
    // Daten parsen
    // (Namespace-Attribut entfernen; da habe ich sonst Probleme mit
    // evaluate() in belegImport.DTAMeta())
    const text = response.text.replace(/ xmlns=".+?"/, "");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    // XML nicht wohlgeformt
    if (xmlDoc.querySelector("parsererror")) {
      belegImport.DTAFehler("HttpRequest: XML-Daten nicht wohlgeformt");
      return false;
    }
    // XML-Daten okay => weiterverarbeiten
    belegImport.DTAMeta(xmlDoc);
    belegImport.DTAText(xmlDoc, fak);
    belegImport.DTAFill();
    return true;
  },

  // DTA-Import: Fehler beim Laden der Daten des DTA
  //   fehlertyp = String
  //     (die Beschreibung des Fehlers)
  DTAFehler (fehlertyp) {
    dialog.oeffnen({
      typ: "alert",
      text: `Beim Download der Textdaten aus dem DTA ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${fehlertyp}`,
      callback: () => {
        const dta = document.getElementById("beleg-dta");
        dta.select();
      },
    });
  },

  // DTA-Import: Meta-Daten des Titels importieren
  //   xmlDoc = Document
  //     (entweder das komplette Buch, aus dem eine Seite importiert
  //     werden soll [enthält auch den TEI-Header], oder ein XML-Dokument,
  //     das allein die TEI-Header des Buchs umfasst)
  DTAMeta (xmlDoc) {
    const evaluator = xpath => xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null);
    const dta = belegImport.DTAData;
    // Personen
    const personen = {
      autor: evaluator("//biblFull/titleStmt/author/persName"),
      hrsg: evaluator("//biblFull/titleStmt/editor/persName"),
    };
    for (const [ k, v ] of Object.entries(personen)) {
      let item = v.iterateNext();
      while (item) {
        const vorname = item.querySelector("forename");
        const nachname = item.querySelector("surname");
        const addName = item.querySelector("addName"); // in <addName> steht häufig der ganze Name nach dem Muster "Vorname Nachname"; dafür fehlen <forname> und <surname>
        if (nachname) {
          const name = [ trimmer(nachname.textContent) ];
          if (vorname) {
            name.push(trimmer(vorname.textContent));
          }
          dta[k].push(name.join(", "));
        } else if (addName) {
          dta[k].push(trimmer(addName.textContent));
        }
        item = v.iterateNext();
      }
    }
    // normale Werte
    const werte = {
      titel: evaluator("//biblFull/titleStmt/title[@type='main']"),
      untertitel: evaluator("//biblFull/titleStmt/title[@type='sub']"),
      band: evaluator("//biblFull/titleStmt/title[@type='volume']"),
      auflage: evaluator("//biblFull/editionStmt/edition"),
      ort: evaluator("//biblFull/publicationStmt/pubPlace"),
      verlag: evaluator("//biblFull/publicationStmt/publisher/name"),
      datum_druck: evaluator("//biblFull/publicationStmt/date[@type='publication']"),
      datum_entstehung: evaluator("//biblFull/publicationStmt/date[@type='creation']"),
    };
    for (const [ k, v ] of Object.entries(werte)) {
      let item = v.iterateNext();
      while (item) {
        if (Array.isArray(dta[k])) {
          dta[k].push(trimmer(item.textContent));
        } else {
          dta[k] = trimmer(item.textContent);
        }
        item = v.iterateNext();
      }
    }
    // Zeitschrift/Serie
    let istZeitschrift = false;
    const zeitschriftEval = evaluator("//sourceDesc/bibl").iterateNext();
    if (/^JA?/.test(zeitschriftEval.getAttribute("type"))) {
      istZeitschrift = true;
    }
    const series = {
      titel: evaluator("//biblFull/seriesStmt/title"),
      bd_jg: evaluator("//biblFull/seriesStmt/biblScope[@unit='volume']"),
      heft: evaluator("//biblFull/seriesStmt/biblScope[@unit='issue']"),
      seiten: evaluator("//biblFull/seriesStmt/biblScope[@unit='pages']"),
    };
    const seriesTitel = [];
    let item = series.titel.iterateNext();
    while (item) {
      seriesTitel.push(trimmer(item.textContent));
      item = series.titel.iterateNext();
    }
    if (istZeitschrift) { // Zeitschrift
      dta.zeitschrift = seriesTitel.join(". ");
      item = series.bd_jg.iterateNext();
      if (item) {
        dta.zeitschrift_jg = trimmer(item.textContent);
      }
      item = series.heft.iterateNext();
      if (item) {
        dta.zeitschrift_h = trimmer(item.textContent);
      }
      item = series.seiten.iterateNext();
      if (item) {
        dta.seiten = trimmer(item.textContent);
      }
    } else { // Serie
      dta.serie = seriesTitel.join(". ");
      item = series.bd_jg.iterateNext();
      if (item) {
        dta.serie_bd = trimmer(item.textContent);
      }
    }
    // Textsorte
    const textsorte = evaluator("//profileDesc//textClass/classCode");
    item = textsorte.iterateNext();
    while (item) {
      const scheme = item.getAttribute("scheme");
      let key = "";
      if (/main$/.test(scheme)) {
        key = "textsorte";
      } else if (/sub$/.test(scheme)) {
        key = "textsorte_sub";
      }
      if (key) {
        dta[key].push(trimmer(item.textContent));
      }
      item = textsorte.iterateNext();
    }
    // spezielle Trim-Funktion
    function trimmer (v) {
      v = v.replace(/\n/g, " "); // kommt mitunter mitten im Untertitel vor
      v = helfer.textTrim(v, true);
      return v;
    }
  },

  // DTA-Import: Seite und Text des Titels importieren
  //   xml = Document
  //     (das komplette Buch, aus dem eine Seite importiert werden soll)
  //   fak = String
  //     (Faksimile-Seite des Titels)
  DTAText (xml, fak) {
    // Grenze des Textimports ermitteln
    // (importiert wird bis zum Seitenumbruch "fak_bis", aber nie darüber hinaus)
    const int_fak = parseInt(fak, 10);
    const int_fak_bis = parseInt(document.getElementById("beleg-dta-bis").value, 10);
    let fak_bis = "";
    if (int_fak_bis && int_fak_bis > int_fak) {
      fak_bis = int_fak_bis.toString();
    } else {
      fak_bis = (int_fak + 1).toString();
    }
    // Start- und Endelement ermitteln
    const ele_start = xml.querySelector(`pb[facs="#f${fak.padStart(4, "0")}"]`);
    const ele_ende = xml.querySelector(`pb[facs="#f${fak_bis.padStart(4, "0")}"]`);
    // Seite auslesen
    const n = ele_start.getAttribute("n");
    if (n) { // bei Seiten mit <cb> gibt es kein n-Attribut
      belegImport.DTAData.seite = n;
      belegImport.DTAData.seite_zuletzt = n;
    }
    // Elemente ermitteln, die analysiert werden müssen
    let parent;
    if (ele_ende) {
      parent = ele_ende.parentNode;
      while (!parent.contains(ele_start)) {
        parent = parent.parentNode;
      }
    } else {
      // Wenn "ele_ende" nicht existiert, dürfte die Startseite die letzte Seite sein.
      // Denkbar ist auch, dass eine viel zu hohe Seitenzahl angegeben wurde.
      // Dann holt sich das Skript alle Seiten, die es kriegen kann, ab der Startseite.
      parent = ele_start.parentNode;
      while (parent.nodeName !== "body") {
        parent = parent.parentNode;
      }
    }
    const analyse = [];
    const alleKinder = parent.childNodes;
    for (let i = 0, len = alleKinder.length; i < len; i++) {
      if (!analyse.length && alleKinder[i] !== ele_start && !alleKinder[i].contains(ele_start)) {
        continue;
      } else if (alleKinder[i] === ele_ende) {
        break;
      } else if (alleKinder[i].contains(ele_ende)) {
        analyse.push(alleKinder[i]);
        break;
      }
      analyse.push(alleKinder[i]);
    }
    // Elemente analysieren
    const rend = { // Textauszeichnungen
      "#aq": {
        ele: "span",
        class: "dta-antiqua",
      },
      "#b": {
        ele: "b",
        class: "",
      },
      "#blue": {
        ele: "span",
        class: "dta-blau",
      },
      "#fr": {
        ele: "span",
        class: "dta-groesser", // so zumindest Drastellung im DTA, style-Angaben im XML-Header anders
      },
      "#g": {
        ele: "span",
        class: "dta-gesperrt",
      },
      "#i": {
        ele: "i",
        class: "",
      },
      "#in": {
        ele: "span",
        class: "dta-initiale",
      },
      "#k": {
        ele: "span",
        class: "dta-kapitaelchen",
      },
      "#larger": {
        ele: "span",
        class: "dta-groesser",
      },
      "#red": {
        ele: "span",
        class: "dta-rot",
      },
      "#s": {
        ele: "s",
        class: "",
      },
      "#smaller": {
        ele: "small",
        class: "",
      },
      "#sub": {
        ele: "sub",
        class: "",
      },
      "#sup": {
        ele: "sup",
        class: "",
      },
      "#u": {
        ele: "u",
        class: "",
      },
      "#uu": {
        ele: "span",
        class: "dta-doppelt",
      },
    };
    let text = "";
    let start = false;
    let ende = false;
    for (let i = 0, len = analyse.length; i < len; i++) {
      ana(analyse[i]);
    }
    // Textauszeichnungen umsetzen
    for (const typ of Object.keys(rend)) {
      const reg = new RegExp(`\\[(${typ})\\](.+?)\\[\\/${typ}\\]`, "g");
      while (text.match(reg)) { // bei komischen Verschachtelungen kann es dazu kommen, dass beim 1. Durchgang nicht alle Tags ersetzt werden
        text = text.replace(reg, function (m, p1, p2) {
          let start = `<${rend[p1].ele}`;
          if (rend[p1].class) {
            start += ` class="${rend[p1].class}"`;
          }
          start += ">";
          return `${start}${p2}</${rend[p1].ele}>`;
        });
      }
    }
    // Text trimmen
    text = helfer.textTrim(text, true);
    // Leerzeichen am Anfang von Absätzen entfernen;
    // ana() hierfür lieber nicht anpacken
    text = text.replace(/\n[ \t]+/g, "\n");
    // Fertig!
    belegImport.DTAData.beleg = text.normalize("NFC");
    // Analysefunktion
    function ana (ele) {
      if (ele.nodeType === 3) { // Text
        if (start && !ende) {
          const text_tmp = ele.nodeValue.replace(/\n/g, "");
          if (/(-|¬)$/.test(text_tmp) &&
              ele.nextSibling &&
              ele.nextSibling.nodeName === "lb") {
            text += text_tmp.replace(/(-|¬)$/, "[¬]"); // Trennungsstrich ersetzen
          } else {
            text += text_tmp;
            if (ele.nextSibling &&
                ele.nextSibling.nodeName === "lb") {
              text += " ";
            }
          }
        }
      } else if (ele.nodeType === 1) { // Element
        if (ele === ele_start) {
          start = true;
        } else if (ele === ele_ende) {
          ende = true;
        } else {
          if (ele.nodeName === "pb") { // Seitenumbruch
            const n = ele.getAttribute("n");
            if (!n) { // wenn Spalten => kein n-Attribut im <pb>
              return;
            }
            if (start) { // Ja, das kann passieren! Unbedingt stehenlassen!
              text += `[:${n}:]`;
              belegImport.DTAData.seite_zuletzt = n;
            }
            return;
          } else if (ele.nodeName === "cb") { // Spaltenumbruch
            const n = ele.getAttribute("n");
            if (!n) { // zur Sicherheit
              return;
            }
            belegImport.DTAData.spalte = true;
            if (!belegImport.DTAData.seite) {
              belegImport.DTAData.seite = n;
            } else {
              belegImport.DTAData.seite_zuletzt = n;
              if (start) { // Kann das passieren? Zur Sicherheit stehenlassen!
                text += `[:${n}:]`;
              }
            }
            return;
          } else if (/^(closer|div|item|p)$/.test(ele.nodeName)) { // Absätze
            text = helfer.textTrim(text, false);
            text += "\n\n";
          } else if (/^(lg)$/.test(ele.nodeName)) { // einfache Absätze
            text = helfer.textTrim(text, false);
            text += "\n";
          } else if (ele.nodeName === "fw" &&
              /^(catch|header|sig)$/.test(ele.getAttribute("type"))) { // Kustode, Kolumnentitel, Bogensignaturen
            return;
          } else if (ele.nodeName === "hi") { // Text-Auszeichnungen
            const typ = ele.getAttribute("rendition");
            if (rend[typ]) {
              ele.insertBefore(document.createTextNode(`[${typ}]`), ele.firstChild);
              ele.appendChild(document.createTextNode(`[/${typ}]`));
            }
          } else if (ele.nodeName === "l") { // Verszeile
            text = text.replace(/ +$/, "");
            if (/(?<!<br>)\n$/.test(text)) {
              text += "\n";
            } else {
              text += "<br>\n";
            }
          } else if (ele.nodeName === "lb") { // Zeilenumbruch
            if (ele.previousSibling &&
                ele.previousSibling.nodeType === 1) {
              text += " ";
            }
            return;
          } else if (ele.nodeName === "note" &&
              ele.getAttribute("type") !== "editorial") { // Anmerkungen; "editorial" sollte inline dargestellt werden
            ele.insertBefore(document.createTextNode("[Anmerkung: "), ele.firstChild);
            ele.appendChild(document.createTextNode("] "));
          } else if (ele.nodeName === "sic") { // <sic> Fehler im Original, Korrektur steht in <corr>; die wird übernommen
            return;
          } else if (ele.nodeName === "speaker") { // Sprecher im Drama
            ele.insertBefore(document.createTextNode("[#b]"), ele.firstChild);
            ele.appendChild(document.createTextNode("[/#b]"));
            text = helfer.textTrim(text, false);
            text += "\n\n";
          }
          const kinder = ele.childNodes;
          for (let i = 0, len = kinder.length; i < len; i++) {
            if (ende) {
              break;
            }
            ana(kinder[i]);
          }
        }
      }
    }
  },

  // DTA-Import: Daten in das Formular eintragen
  DTAFill () {
    const dta = belegImport.DTAData;
    let datum_feld = dta.datum_entstehung;
    if (!datum_feld && dta.datum_druck) {
      datum_feld = dta.datum_druck;
    } else if (dta.datum_druck) {
      datum_feld += ` (Publikation von ${dta.datum_druck})`;
    }
    beleg.data.da = datum_feld;
    let autor = dta.autor.join("/");
    if (!autor) {
      autor = "N. N.";
    }
    beleg.data.au = autor;
    beleg.data.bs = dta.beleg;
    if (dta.textsorte.length) {
      const textsorte = [];
      for (let i = 0, len = dta.textsorte.length; i < len; i++) {
        const ts = dta.textsorte[i];
        const ts_sub = dta.textsorte_sub[i];
        if (ts_sub && /[,;] /.test(ts_sub)) {
          const ts_sub_sp = ts_sub.split(/[,;] /);
          for (let j = 0, len = ts_sub_sp.length; j < len; j++) {
            textsorte.push(`${ts}: ${ts_sub_sp[j]}`);
          }
        } else if (ts_sub) {
          textsorte.push(`${ts}: ${ts_sub}`);
        } else {
          textsorte.push(ts);
        }
      }
      // identische Werte eliminieren
      const textsorteUnique = new Set(textsorte);
      beleg.data.ts = Array.from(textsorteUnique).join("\n");
    }
    beleg.data.kr = "DTA";
    beleg.data.qu = belegImport.DTAQuelle();
    beleg.data.ul = dta.url;
    beleg.data.ud = new Date().toISOString().split("T")[0];
    // Formular füllen
    beleg.formular(false, true);
    beleg.belegGeaendert(true);
    // Wort gefunden?
    importShared.checkQutation();
  },

  // DTA-Import: Quelle zusammensetzen
  DTAQuelle () {
    const dta = belegImport.DTAData;
    const td = importShared.makeTitleObject();
    td.autor = [ ...dta.autor ];
    td.hrsg = [ ...dta.hrsg ];
    td.titel = [ ...dta.titel ];
    td.untertitel = [ ...dta.untertitel ];
    if (dta.zeitschrift) {
      td.inTitel.push(dta.zeitschrift);
    }
    const regBand = new RegExp(helfer.escapeRegExp(dta.band));
    if (dta.band &&
        !dta.titel.some(i => regBand.test(i)) &&
        !dta.untertitel.some(i => regBand.test(i))) {
      td.band = dta.band;
    }
    td.auflage = dta.auflage;
    td.ort = [ ...dta.ort ];
    td.verlag = dta.verlag !== "s. e." ? dta.verlag : "";
    td.jahrgang = dta.zeitschrift_jg;
    td.jahr = dta.datum_druck;
    if (!dta.datum_druck) {
      td.jahr = dta.datum_entstehung;
    } else {
      td.jahrZuerst = dta.datum_entstehung;
    }
    if (dta.zeitschrift_h && !dta.zeitschrift_jg) {
      td.jahrgang = dta.zeitschrift_h;
    } else if (dta.zeitschrift_h) {
      td.heft = dta.zeitschrift_h;
    }
    td.spalte = dta.spalte;
    td.seiten = dta.seiten;
    if (dta.seite) {
      td.seite = dta.seite.replace(/^0+/, ""); // ja, das gibt es
      if (dta.seite_zuletzt && dta.seite_zuletzt !== dta.seite) {
        td.seite += `–${dta.seite_zuletzt.replace(/^0+/, "")}`;
      }
    }
    td.serie = dta.serie;
    td.serieBd = dta.serie_bd;
    td.url.push(dta.url);
    let title = importShared.makeTitle(td);
    title = title.normalize("NFC");
    return title;
  },
};
