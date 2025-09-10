
import importShared from "./importShared.mjs";

import shared from "../shared.mjs";

export { importBibtex as default };

const importBibtex = {
  // BibTeX-Datei importieren
  //   content = string
  //     (Inhalt der Datei)
  //   returnTitle = true | undefined
  //     (Array mit Titeldaten soll zurückgegeben werden)
  async startImport ({ content, returnTitle = false }) {
    // Content fixen
    content = importBibtex.fix(content);

    // Zwischenspeicher der Titel
    const titel = [];

    // Daten parsen
    let item = {};
    for (let zeile of content.split(/\n/)) {
      // Ende des Datensatzes
      if (/^\}/.test(zeile)) {
        pushTitle();
        item = {};
        continue;
      }

      // Leerzeilen
      zeile = zeile.trim();
      if (!zeile) {
        continue;
      }

      // Startzeile
      if (/^@/.test(zeile)) {
        item.startzeile = zeile;
        continue;
      }

      // Zeile analysieren
      const kv = /^(?<key>[a-z]+)\s*=\s*[{"](?<value>.+)[}"],?$/.exec(zeile);
      if (!kv || !kv.groups.key || !kv.groups.value) {
        // da ist wohl was schiefgelaufen
        continue;
      }
      const key = kv.groups.key;
      if (!item[key]) {
        item[key] = [];
      }
      const val = kv.groups.value;
      if (/^(author|editor)$/.test(key)) {
        for (const i of val.split(/\sand\s/)) {
          item[key].push(importBibtex.symbols(i));
        }
      } else {
        item[key].push(importBibtex.symbols(val));
      }
    }

    // ggf. Titeldaten-Array direkt zurückgeben
    if (returnTitle) {
      return titel;
    }

    // Import anstoßen
    importShared.fileData.data = titel;
    importShared.fileDataSchonImportiert();
    const result = await importShared.fileDataImport();
    return result;

    // Titeldaten übertragen
    function pushTitle () {
      // Datensatz erzeugen
      titel.push(importShared.importObject());
      const ds = titel.at(-1).ds;

      // Autor(en) ermitteln
      if (item.author) {
        ds.au = item.author.join("/");
      } else if (item.editor) {
        ds.au = `${item.editor.join("/")} (Hrsg.)`;
      } else {
        ds.au = "N.\u00A0N.";
      }

      // Originaltitel rekonstruieren
      ds.bi = "bibtex";
      ds.bx = `${item.startzeile}\n`;
      for (const [ k, v ] of Object.entries(item)) {
        if (k === "startzeile") {
          continue;
        }
        for (const i of v) {
          ds.bx += `\t${k} = {${i}},\n`;
        }
      }
      ds.bx = ds.bx.substring(0, ds.bx.length - 2);
      ds.bx += "\n}";

      // Datum
      if (item.year) {
        item.year.forEach((i, n) => {
          item.year[n] = i.replace(/^\[|\]$/g, "");
        });
        ds.da = item.year.join("/");
      } else if (item.date) {
        item.date.forEach((i, n) => {
          item.date[n] = i.replace(/^\[|\]$/g, "");
        });
        ds.da = item.date.join("/");
      }

      // Datensatz von GoogleBooks?
      if (item.url) {
        if (item.url.some(i => /books\.google/.test(i))) {
          ds.kr = "GoogleBooks";
        }
      }

      // Quelle
      const td = importShared.makeTitleObject();
      if (item.author) {
        td.autor = [ ...item.author ];
      }
      if (item.editor) {
        td.hrsg = [ ...item.editor ];
      }
      if (item.title) {
        td.titel = [ ...item.title ];
      } else if (item.booktitle) {
        td.titel = [ ...item.booktitle ];
      } else if (item.shorttitle) {
        td.titel = [ ...item.shorttitle ];
      } else {
        td.titel = [ "[ohne Titel]" ];
      }
      let istZeitschrift = false;
      let istAbschnitt = false;
      if (item.title && item.booktitle) {
        td.inTitel = [ ...item.booktitle ];
        istAbschnitt = true;
      } else if (item.title && (item.journal || item.journaltitle)) {
        if (item.journal) {
          td.inTitel = [ ...item.journal ];
        } else if (item.journaltitle) {
          td.inTitel = [ ...item.journaltitle ];
        }
        istZeitschrift = true;
        istAbschnitt = true;
      }
      if (item.volume) {
        if (istZeitschrift) {
          td.jahrgang = item.volume.join("/");
        } else {
          td.band = item.volume.join("/");
        }
      }
      if (item.edition) {
        td.auflage = item.edition.join("/");
      }
      if (item.school) {
        td.quali = item.school.join(", ");
      }
      if (item.location) {
        td.ort = [ ...item.location ];
      } else if (item.address) {
        td.ort = [ ...item.address ];
      }
      if (item.publisher) {
        td.verlag = item.publisher.join("/");
      }
      td.jahr = ds.da;
      if (item.number) {
        const heft = item.number.join("/");
        const bdStart = /^Bd\./.test(item.number);
        if (bdStart && !istZeitschrift) {
          // BibTeX von GoogleBooks hat mitunter diesen Fehler
          td.band = heft;
        } else if (!bdStart) {
          td.heft = heft;
        }
      }
      if (istAbschnitt && item.pages) {
        td.seiten = item.pages.join(", ");
      }
      if (item.series && item.series.join() !== td.titel.join()) {
        // BibTeX von GoogleBooks trägt mitunter den Romantitel in "series" ein
        td.serie = item.series.join(". ");
      }
      if (item.url) {
        td.url = [ ...item.url ];
        td.url.sort(shared.sortURL);
      }
      ds.qu = importShared.makeTitle(td);
      ds.qu = ds.qu.normalize("NFC");
      ds.ul = td.url[0] || "";
      ds.ud = ds.ul ? new Date().toISOString().split("T")[0] : "";
    }
  },

  // Content einer BibTeX-Datei fixen und normieren
  //   content = string
  //     (Inhalt der Datei)
  fix (content) {
    const zeilen = [];
    for (let zeile of content.split(/\n/)) {
      if (/^[@\s}]/.test(zeile)) {
        zeile = zeile.replace(/^\s+/, "\t");
        if (zeile.trim()) {
          // da könnte noch ein \r drin sein
          zeilen.push(zeile.trimEnd());
        }
        continue;
      }
      zeile = zeile.trim();
      if (!zeile) {
        // Leerzeile
        continue;
      }
      zeilen[zeilen.length - 1] += " " + zeile;
    }
    return zeilen.join("\n");
  },

  // BibTeX-Symbolen auflösen
  //   text = string
  //     (Textzeile, in der die Symbole aufgelöst werden sollen)
  symbols (text) {
    // das scheint der Standard zu sein: \‘{a}
    // Google und die GVK-API verwenden i.d.R. diese Form {\‘a}
    const symbols = new Map();
    symbols.set("``", '"'); // GVK
    symbols.set("''", '"'); // GVK
    symbols.set("`", "'"); // GVK
    symbols.set("'", "'"); // GVK
    symbols.set("\\‘{a}", "à");
    symbols.set("{\\‘a}", "à");
    symbols.set("\\‘{e}", "è");
    symbols.set("{\\‘e}", "è");
    symbols.set("\\‘{i}", "ì");
    symbols.set("{\\‘i}", "ì");
    symbols.set("\\‘{o}", "ò");
    symbols.set("{\\‘o}", "ò");
    symbols.set("\\‘{u}", "ù");
    symbols.set("{\\‘u}", "ù");
    symbols.set("\\’{a}", "á");
    symbols.set("{\\’a}", "á");
    symbols.set("\\’{e}", "é");
    symbols.set("{\\’e}", "é");
    symbols.set("\\’{i}", "í");
    symbols.set("{\\’i}", "í");
    symbols.set("\\’{o}", "ó");
    symbols.set("{\\’o}", "ó");
    symbols.set("\\’{u}", "ú");
    symbols.set("{\\’u}", "ú");
    symbols.set("\\'{a}", "á");
    symbols.set("{\\'a}", "á");
    symbols.set("\\'{e}", "é");
    symbols.set("{\\'e}", "é");
    symbols.set("\\'{i}", "í");
    symbols.set("{\\'i}", "í");
    symbols.set("\\'{o}", "ó");
    symbols.set("{\\'o}", "ó");
    symbols.set("\\'{u}", "ú");
    symbols.set("{\\'u}", "ú");
    symbols.set("\\^{a}", "â");
    symbols.set("{\\^a}", "â");
    symbols.set("\\^{e}", "ê");
    symbols.set("{\\^e}", "ê");
    symbols.set("\\^{i}", "î");
    symbols.set("{\\^i}", "î");
    symbols.set("\\^{o}", "ô");
    symbols.set("{\\^o}", "ô");
    symbols.set("\\^{u}", "û");
    symbols.set("{\\^u}", "û");
    symbols.set("\\”{a}", "ä");
    symbols.set("{\\”a}", "ä");
    symbols.set("\\”{e}", "ë");
    symbols.set("{\\”e}", "ë");
    symbols.set("\\”{o}", "ö");
    symbols.set("{\\”o}", "ö");
    symbols.set("\\”{u}", "ü");
    symbols.set("{\\”u}", "ü");
    symbols.set('\\"{a}', "ä");
    symbols.set('{\\"a}', "ä");
    symbols.set('\\"{e}', "ë");
    symbols.set('{\\"e}', "ë");
    symbols.set('\\"{o}', "ö");
    symbols.set('{\\"o}', "ö");
    symbols.set('\\"{u}', "ü");
    symbols.set('{\\"u}', "ü");
    symbols.set("\\~{a}", "ã");
    symbols.set("{\\~a}", "ã");
    symbols.set("\\~{e}", "ẽ");
    symbols.set("{\\~e}", "ẽ");
    symbols.set("\\~{i}", "ĩ");
    symbols.set("{\\~i}", "ĩ");
    symbols.set("\\~{n}", "ñ");
    symbols.set("{\\~n}", "ñ");
    symbols.set("\\~{o}", "õ");
    symbols.set("{\\~o}", "õ");
    symbols.set("\\~{u}", "ũ");
    symbols.set("{\\~u}", "ũ");
    symbols.set("\\v{a}", "ǎ");
    symbols.set("{\\va}", "ǎ");
    symbols.set("\\v{e}", "ě");
    symbols.set("{\\ve}", "ě");
    symbols.set("\\v{i}", "ǐ");
    symbols.set("{\\vi}", "ǐ");
    symbols.set("\\v{o}", "ǒ");
    symbols.set("{\\vo}", "ǒ");
    symbols.set("\\v{u}", "ǔ");
    symbols.set("{\\vu}", "ǔ");
    symbols.set("\\c{c}", "ç");
    symbols.set("{\\cc}", "ç");
    symbols.set("\\aa", "å");
    symbols.set("\\ae", "æ");
    symbols.set("\\oe", "œ");
    symbols.set("\\l", "ł");
    symbols.set("\\o", "ø");
    symbols.set("\\ss", "ß");

    // Symbole ersetzen
    for (const [ k, v ] of symbols) {
      const regLC = new RegExp(shared.escapeRegExp(k), "g");
      const regUC = new RegExp(shared.escapeRegExp(k), "gi");
      text = text.replace(regLC, v);
      text = text.replace(regUC, v.toUpperCase());
    }

    // Bereinigungen vornehmen
    text = text.replace(/[{}\\]/g, "");

    // Text zurückgeben
    return text;
  },
};
