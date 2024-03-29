const konversionen = {
  // Konversion des Dateiformats zu Version 2
  zu2 (data) {
    if (data.ve > 1) {
      return false;
    }

    // Datenfeld "kr" (Korpus) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.kr = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 3
  zu3 (data) {
    if (data.ve > 2) {
      return false;
    }

    // Datenfeld "bl" (Wortbildung) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.bl = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 4
  zu4 (data) {
    if (data.ve > 3) {
      return false;
    }

    // Datenfeld "sy" (Wortbildung) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.sy = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 5
  zu5 (data) {
    if (data.ve > 4) {
      return false;
    }

    // Bedeutungsgerüst konstituieren
    if (typeof bedeutungen !== "undefined") {
      bedeutungen.konstit();
    }

    // Datenfeld "bd" (Wortbildung) in allen Karteikarten auf das neue Format umstellen
    const gr = data.bd.gr["1"].bd;
    for (const val of Object.values(data.ka)) {
      const bd = val.bd.split("\n");
      val.bd = [];
      for (let i = 0, len = bd.length; i < len; i++) {
        for (let j = 0, len = gr.length; j < len; j++) {
          if (bd[i] === gr[j].bd.join(": ")) {
            val.bd.push({
              gr: "1",
              id: gr[j].id,
            });
            break;
          }
        }
      }
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 6
  zu6 (data) {
    if (data.ve > 5) {
      return false;
    }

    // Format der Kartei-Notizen: plain text => HTML
    if (data.no) {
      // Spitzklammern maskieren
      const notizen = data.no.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Zeilenumbrüche in HTML überführen
      const zeilen = notizen.split("\n");
      data.no = zeilen[0]; // 1. Zeile ist nicht in <div> eingeschlossen
      for (let i = 1, len = zeilen.length; i < len; i++) {
        data.no += "<div>";
        if (!zeilen[i]) {
          data.no += "<br>"; // Leerzeile
        } else {
          data.no += zeilen[i];
        }
        data.no += "</div>";
      }
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 7
  zu7 (data) {
    if (data.ve > 6) {
      return false;
    }

    // reserviertes Datenfeld für die Sortierfunktion löschen
    delete data.ha;

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 8
  zu8 (data) {
    if (data.ve > 7) {
      return false;
    }

    // Datenfeld "mt" (Metatext) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.mt = false;
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 9
  zu9 (data) {
    if (data.ve > 8) {
      return false;
    }

    // Datenfeld "fv" konvertieren
    if (/\s/.test(data.wo)) {
      data.fv = {};
      const woerter = data.wo.split(/\s/);
      for (const i of woerter) {
        data.fv[i] = {
          an: true,
          fo: [
            {
              qu: "zt",
              va: i,
            },
          ],
        };
      }
    } else {
      const fo = [];
      data.fv.forEach(function (i) {
        fo.push({ ...i });
      });
      data.fv = {
        [data.wo]: {
          an: true,
          fo,
        },
      };
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 10
  zu10 (data) {
    if (data.ve > 9) {
      return false;
    }

    // Datenfelder "fa", "ma", "ps" und "tr" in allen Wörtern der Formvarianten ergänzen
    for (const val of Object.values(data.fv)) {
      val.fa = 0;
      val.ma = false;
      val.ps = "";
      val.tr = true;
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 11
  zu11 (data) {
    if (data.ve > 10) {
      return false;
    }

    // Datenfeld "ty" ändern: "wgd" -> "ztj"
    data.ty = "ztj";

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 12
  zu12 (data) {
    if (data.ve > 11) {
      return false;
    }

    // Datenfeld "bx" (Beleg-XML) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.bx = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 13
  zu13 (data) {
    if (data.ve > 12) {
      return false;
    }

    // Datenfeld "rd" konvertieren
    const rdKlon = [];
    for (const er of data.rd) {
      rdKlon.push({ ...er });
    }
    data.rd = {
      be: [ ...data.be ],
      bh: "",
      er: rdKlon,
      sg: [],
    };
    delete data.be;

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 14
  zu14 (data) {
    if (data.ve > 13) {
      return false;
    }

    // Datenfeld "rd.tf" ergänzt
    data.rd.tf = [];

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 15
  zu15 (data) {
    if (data.ve > 14) {
      return false;
    }

    // Datenfeld "rd.wi" ergänzt
    data.rd.wi = [];

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 16
  zu16 (data) {
    if (data.ve > 15) {
      return false;
    }

    // Datenfeld "nl" in allen Wörtern der Formvarianten ergänzen
    for (const v of Object.values(data.fv)) {
      v.nl = false;
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 17
  zu17 (data) {
    if (data.ve > 16) {
      return false;
    }

    // Objekte in "rd.wi" um "gn" ergänzen
    // rd.wi.vt === "Assoziation" in "Wortbildung" ändern
    for (const i of data.rd.wi) {
      i.gn = "1";
      if (i.vt === "Assoziation") {
        i.vt = "Wortbildung";
      }
    }

    // Datenstruktur "rd.xl" hinzufügen
    // (Datenstruktur wird ab v17 von helferXml.redXmlData() erzeugt;
    // hier aus Kompatibilitätsgründen gespiegelt)
    data.rd.xl = {
      ab: [], // Abstract
      bg: [], // Bedeutungsgerüste
      bl: [], // Belege
      le: [], // Lemmata
      lt: [], // Literatur
      md: { // Metadaten
        id: "", // Artikel-ID
        re: [], // Revisionen
        tf: "", // Themenfeld
        ty: "", // Artikeltyp
      },
      tx: [], // Text
      wi: {}, // Wortinformationen
    };

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 18
  zu18 (data) {
    if (data.ve > 17) {
      return false;
    }

    // rd.wi.vt === "Kollokation" in "Wortverbindung" ändern
    for (const i of data.rd.wi) {
      if (i.vt === "Kollokation") {
        i.vt = "Wortverbindung";
      }
    }

    // rd.xl.wi.vt === "Kollokation" in "Wortverbindung" ändern
    for (const v of Object.values(data.rd.xl.wi)) {
      for (const i of v) {
        if (i.vt === "Kollokation") {
          i.vt = "Wortverbindung";
        }
      }
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 19
  zu19 (data) {
    if (data.ve > 18) {
      return false;
    }

    // Label in Bedeutungsgerüsten im XML-Redaktionsfenster ergänzen
    for (const v of Object.values(data.rd.xl.bg)) {
      v.la = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 20
  zu20 (data) {
    if (data.ve > 19) {
      return false;
    }

    // data.xl.md.tf in Array umwandeln
    if (data.rd.xl?.md.tf) {
      data.rd.xl.md.tf = [ data.rd.xl.md.tf ];
    } else if (data.rd.xl.md) {
      data.rd.xl.md.tf = [];
    }

    // Datenfeld für Nebenlemmata erzeugen, die mit dem aktuellen Wort behandelt werden
    data.rd.nl = "";

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 21
  zu21 (data) {
    // BUG-Korrektur: ggf. Datenfeld für Nebenlemmata erzeugen
    // (das Feld wurde beim Erzeugen neuer Karteien nicht angelegt)
    if (data.ve === 21 &&
        typeof data.rd.nl === "undefined") {
      data.rd.nl = "";
      return true;
    }

    // Abbruch
    if (data.ve > 20) {
      return false;
    }

    // Datenfeld "up" (ungeprüft) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.up = false;
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 22
  zu22 (data) {
    if (data.ve > 21) {
      return false;
    }

    // Datenfeld für Notizen im Redaktionsmetadaten-Fenster erzeugen
    data.rd.no = "";

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 23
  zu23 (data) {
    if (data.ve > 22) {
      return false;
    }

    // Datenfeld für Notizen im Redaktionsereignis-Fenster erzeugen
    for (const i of data.rd.er) {
      i.no = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 24
  zu24 (data) {
    if (data.ve > 23) {
      return false;
    }

    // Datenfeld "rd.sp" ergänt
    data.rd.sp = [];

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 25
  zu25 (data) {
    if (data.ve > 24) {
      return false;
    }

    // Datenfeld "bi" (Importtyp) in allen Karteikarten ergänzen
    for (const i of Object.values(data.ka)) {
      i.bi = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },

  // Konversion des Dateiformats zu Version 26
  zu26 (data) {
    if (data.ve > 25) {
      return false;
    }

    // Datenfeld "la" (Lemmaliste) ergänzt
    data.la = {
      er: [],
      la: [],
      wf: false,
    };
    for (let i of data.wo.split(",")) {
      i = i.trim();
      if (!i) {
        continue;
      }
      let ko = i.match(/ \((.+?)\)$/)?.[1] || "";
      if (/^Wortfeld/.test(ko)) {
        data.la.wf = true;
        ko = "";
      }
      const la = i.replace(/ \(.+?\)$/g, "");
      const sc = [];
      for (const s of la.split(/ ?\/ ?/)) {
        sc.push(s);
      }
      data.la.la.push({
        ho: 0,
        ko,
        sc,
        nl: false,
      });
    }
    if (data.rd.bh) {
      data.la.er.push({
        hl: data.rd.bh.trim(),
        ho: 0,
      });
    }
    delete data.rd.bh;
    for (let la of data.rd.nl.split(",")) {
      la = la.trim();
      if (!la) {
        continue;
      }
      const sc = [];
      for (const s of la.split(/ ?\/ ?/)) {
        sc.push(s);
      }
      data.la.la.push({
        ho: 0,
        ko: "",
        sc,
        nl: true,
      });
    }

    // Löschen veralteter Datensätze
    delete data.wo;
    delete data.rd.nl;

    // Datenfeld "tg" in allen Karteikarten ergänzen
    // (die alten Taggingdatenfelder gehen in ihm auf)
    const tags = {
      un: "unvollständig",
      up: "ungeprüft",
      ko: "Kontext?",
      bu: "Bücherdienst",
      bc: "Buchung",
      mt: "Metatext",
    };
    for (const karte of Object.values(data.ka)) {
      karte.tg = [];
      for (const [ k, v ] of Object.entries(tags)) {
        if (karte[k]) {
          karte.tg.push(v);
        }
      }
      for (const k of Object.keys(tags)) {
        delete karte[k];
      }
    }

    // semantische Klammern im Belegtext durch Tags ersetzen
    for (const karte of Object.values(data.ka)) {
      karte.bs = karte.bs.replace(/\[{2}(.+?)\]{2}/g, (m, p1) => `<span class="klammer-loeschung">${p1}</span>`);
      karte.bs = karte.bs.replace(/\[(.+?)\]/g, (m, p1) => {
        if (/^\[Anmerkung:\s/.test(m) || /^\[(:.+:|¬)\]$/.test(m)) {
          return m;
        }
        return `<span class="klammer-streichung">${p1}</span>`;
      });
      karte.bs = karte.bs.replace(/\{(.+?)\}/g, (m, p1) => `<span class="klammer-autorenzusatz">${p1}</span>`);
    }

    // die folgenden Datenfelder in allen Karteikarten ergänzen:
    //   - "ud" (Aufrufdatum)
    //   - "ui" (Import-URL)
    //   - "ul" (URL)
    // "ud" und "ul" automatisch aus dem Quellefeld füllen, dann das Quellefeld bereinigen
    for (const karte of Object.values(data.ka)) {
      karte.ud = "";
      karte.ui = "";
      karte.ul = "";
      const qu = karte.qu.split(/\n(.*)/s);
      if (qu.length > 1) {
        // URL suchen und eintragen
        const url = qu[1].match(/https?:[^\s]+|www\.[^\s]+/);
        if (url) {
          qu[1] = qu[1].split(url[0]).join("");
          if (!/^https?:/.test(url[0])) {
            url[0] = `https://${url[0]}`;
          }
          karte.ul = url[0];
        }
        // Datum suchen und eintragen
        const datum = qu[1].match(/(?<day>[0-9]{1,2})\.\s?(?<month>[0-9]{1,2})\.\s?(?<year>[0-9]{2,4})|(?<iso>[0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (datum) {
          if (datum.groups.iso) {
            karte.ud = datum.groups.iso;
          } else {
            const year = datum.groups.year.length === 4 ? datum.groups.year : "20" + datum.groups.year;
            karte.ud = `${year}-${datum.groups.month.padStart(2, "0")}-${datum.groups.day.padStart(2, "0")}`;
          }
          qu[1] = qu[1].split(datum[0]).join("");
        } else if (karte.ul) {
          // Erstellungsdatum der Karteikarte als Fallback nutzen,
          // wenn eine URL vorhanden ist
          karte.ud = karte.dc.split("T")[0];
        }
        // Bereinigung der Karte
        qu[1] = qu[1].replace(/[A-Za-z]+datum|(ab|auf)gerufen am/g, "");
        karte.qu = qu.join("\n");
        karte.qu = karte.qu.replace(/^[\s(),;.:[\]]+$/m, "");
        karte.qu = karte.qu.trim();
      }
    }

    // Bezeichnung veralteter Importtypen durch neue ersetzen;
    // veraltete Layoutklassen ersetzen bzw. löschen;
    // neue Datenfelder für den Import anlegen:
    //   bb = Seite, bis zu der das XML aus einer Datei importiert wurde
    //   bv = Seite, von der an das XML aus einer Datei importiert wurde
    //   di = Importdatum
    const biMap = {
      dereko: "plain-dereko",
      dwds: "xml-dwds",
    };
    for (const karte of Object.values(data.ka)) {
      // Importtypen umbenennen
      if (biMap[karte.bi]) {
        karte.bi = biMap[karte.bi];
      }

      // Layoutklassen auffrischen
      karte.bs = karte.bs.replace(/<span class="dta-(?:blau|rot)">(.+?)<\/span>/g, (...args) => args[1]);
      karte.bs = karte.bs.replace(/\bdta-(antiqua|doppelt|fr|gesperrt|groesser|initiale|kapitaelchen)\b/g, (...args) => "tei-" + args[1]);

      // neue Datenfelder
      karte.bb = 0;
      karte.bv = 0;
      karte.di = "";
    }

    // Versionsnummer hochzählen
    data.ve++;

    // Kartei geändert
    return true;
  },
};

export default {
  // aktuelle Version des Dateiformats
  // *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
  //   1.) Beim Anlegen neuer Datenwerte Objekte anpassen in
  //         beleg.karteErstellen()
  //         kartei.erstellen()
  //         importShared.fillCard()
  //         importShared.importObject()
  //   2.) Diese Versionsnummer hochzählen!
  version: 26,

  // Konversion starten
  //   data = Object
  //     (JSON einer ZTJ-Datei)
  start (data) {
    let karteiGeaendert = false;

    for (const fun of Object.keys(konversionen)) {
      const konvertiert = konversionen[fun](data);
      if (konvertiert) {
        karteiGeaendert = true;
      }
    }

    return karteiGeaendert;
  },
};
