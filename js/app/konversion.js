"use strict";

const konversion = {
  // aktuelle Version des Dateiformats
  // *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
  // 1.) Beim Anlegen neuer Datenwerte Objekte in
  //   kartei.erstellen() u. beleg.karteErstellen() ergänzen!
  // 2.) Diese Versionsnummer hochzählen!
  version: 26,

  // Verteilerfunktion
  start () {
    const konvFun = Object.keys(konversion).filter(i => /^nach/.test(i));
    for (const fun of konvFun) {
      konversion[fun]();
    }
  },

  // Konversion des Dateiformats nach Version 2
  nach2 () {
    if (data.ve > 1) {
      return;
    }
    // Datenfeld "kr" (Korpus) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.kr = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 3
  nach3 () {
    if (data.ve > 2) {
      return;
    }
    // Datenfeld "bl" (Wortbildung) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.bl = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 4
  nach4 () {
    if (data.ve > 3) {
      return;
    }
    // Datenfeld "sy" (Wortbildung) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.sy = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 5
  nach5 () {
    if (data.ve > 4) {
      return;
    }
    // Bedeutungsgerüst konstituieren
    bedeutungen.konstit();
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 6
  nach6 () {
    if (data.ve > 5) {
      return;
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 7
  nach7 () {
    if (data.ve > 6) {
      return;
    }
    // reserviertes Datenfeld für die Sortierfunktion löschen
    delete data.ha;
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 8
  nach8 () {
    if (data.ve > 7) {
      return;
    }
    // Datenfeld "mt" (Metatext) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.mt = false;
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 9
  nach9 () {
    if (data.ve > 8) {
      return;
    }
    // Datenfeld "fv" konvertieren
    if (/\s/.test(kartei.wort)) {
      data.fv = {};
      const woerter = kartei.wort.split(/\s/);
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
        [kartei.wort]: {
          an: true,
          fo,
        },
      };
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 10
  nach10 () {
    if (data.ve > 9) {
      return;
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 11
  nach11 () {
    if (data.ve > 10) {
      return;
    }
    // Datenfeld "ty" ändern: "wgd" -> "ztj"
    data.ty = "ztj";
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 12
  nach12 () {
    if (data.ve > 11) {
      return;
    }
    // Datenfeld "bx" (Beleg-XML) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.bx = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 13
  nach13 () {
    if (data.ve > 12) {
      return;
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 14
  nach14 () {
    if (data.ve > 13) {
      return;
    }
    // Datenfeld "rd.tf" ergänzt
    data.rd.tf = [];
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 15
  nach15 () {
    if (data.ve > 14) {
      return;
    }
    // Datenfeld "rd.wi" ergänzt
    data.rd.wi = [];
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 16
  nach16 () {
    if (data.ve > 15) {
      return;
    }
    // Datenfeld "nl" in allen Wörtern der Formvarianten ergänzen
    for (const v of Object.values(data.fv)) {
      v.nl = false;
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 17
  nach17 () {
    if (data.ve > 16) {
      return;
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
    data.rd.xl = helferXml.redXmlData();
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 18
  nach18 () {
    if (data.ve > 17) {
      return;
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 19
  nach19 () {
    if (data.ve > 18) {
      return;
    }
    // Label in Bedeutungsgerüsten im XML-Redaktionsfenster ergänzen
    for (const v of Object.values(data.rd.xl.bg)) {
      v.la = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 20
  nach20 () {
    if (data.ve > 19) {
      return;
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
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 21
  nach21 () {
    // BUG-Korrektur: ggf. Datenfeld für Nebenlemmata erzeugen
    // (das Feld wurde beim Erzeugen neuer Karteien nicht angelegt)
    if (data.ve === 21 &&
        typeof data.rd.nl === "undefined") {
      data.rd.nl = "";
    }
    // Abbruch
    if (data.ve > 20) {
      return;
    }
    // Datenfeld "up" (ungeprüft) in allen Karteikarten ergänzen
    for (const val of Object.values(data.ka)) {
      val.up = false;
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 22
  nach22 () {
    if (data.ve > 21) {
      return;
    }
    // Datenfeld für Notizen im Redaktionsmetadaten-Fenster erzeugen
    data.rd.no = "";
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 23
  nach23 () {
    if (data.ve > 22) {
      return;
    }
    // Datenfeld für Notizen im Redaktionsereignis-Fenster erzeugen
    for (const i of data.rd.er) {
      i.no = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 24
  nach24 () {
    if (data.ve > 23) {
      return;
    }
    // Datenfeld "rd.sp" ergänt
    data.rd.sp = [];
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 25
  nach25 () {
    if (data.ve > 24) {
      return;
    }
    // Datenfeld "bi" (Importtyp) in allen Karteikarten ergänzen
    for (const i of Object.values(data.ka)) {
      i.bi = "";
    }
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },

  // Konversion des Dateiformats nach Version 26
  nach26 () {
    if (data.ve > 25) {
      return;
    }
    // Datenfeld "la" (Lemmaliste) ergänzt
    data.la = {
      wf: false,
      la: [],
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
        ko,
        sc,
        nl: false,
      });
    }
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
        ko: "",
        sc,
        nl: true,
      });
    }
    // Löschen veralteter Datensätze einschalten
    delete data.wo;
    delete data.rd.nl;
    // Versionsnummer hochzählen
    data.ve++;
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
  },
};
