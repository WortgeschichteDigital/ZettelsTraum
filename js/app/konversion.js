"use strict";

const konversion = {
  // aktuelle Version des Dateiformats
  // *** WICHTIG! *** WICHTIG! *** WICHTIG! ***
  // 1.) Beim Anlegen neuer Datenwerte Objekte in
  //   kartei.erstellen() u. beleg.karteErstellen() ergänzen!
  // 2.) Diese Versionsnummer hochzählen!
  version: 25,

  // Verteilerfunktion
  start () {
    konversion.von1nach2();
    konversion.von2nach3();
    konversion.von3nach4();
    konversion.von4nach5();
    konversion.von5nach6();
    konversion.von6nach7();
    konversion.von7nach8();
    konversion.von8nach9();
    konversion.von9nach10();
    konversion.von10nach11();
    konversion.von11nach12();
    konversion.von12nach13();
    konversion.von13nach14();
    konversion.von14nach15();
    konversion.von15nach16();
    konversion.von16nach17();
    konversion.von17nach18();
    konversion.von18nach19();
    konversion.von19nach20();
    konversion.von20nach21();
    konversion.von21nach22();
    konversion.von22nach23();
    konversion.von23nach24();
    konversion.von24nach25();
  },

  // Konversion des Dateiformats von Version 1 nach Version 2
  von1nach2 () {
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

  // Konversion des Dateiformats von Version 2 nach Version 3
  von2nach3 () {
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

  // Konversion des Dateiformats von Version 3 nach Version 4
  von3nach4 () {
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

  // Konversion des Dateiformats von Version 4 nach Version 5
  von4nach5 () {
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

  // Konversion des Dateiformats von Version 5 nach Version 6
  von5nach6 () {
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

  // Konversion des Dateiformats von Version 6 nach Version 7
  von6nach7 () {
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

  // Konversion des Dateiformats von Version 7 nach Version 8
  von7nach8 () {
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

  // Konversion des Dateiformats von Version 8 nach Version 9
  von8nach9 () {
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

  // Konversion des Dateiformats von Version 9 nach Version 10
  von9nach10 () {
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

  // Konversion des Dateiformats von Version 10 nach Version 11
  von10nach11 () {
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

  // Konversion des Dateiformats von Version 11 nach Version 12
  von11nach12 () {
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

  // Konversion des Dateiformats von Version 12 nach Version 13
  von12nach13 () {
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

  // Konversion des Dateiformats von Version 13 nach Version 14
  von13nach14 () {
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

  // Konversion des Dateiformats von Version 14 nach Version 15
  von14nach15 () {
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

  // Konversion des Dateiformats von Version 15 nach Version 16
  von15nach16 () {
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

  // Konversion des Dateiformats von Version 16 nach Version 17
  von16nach17 () {
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

  // Konversion des Dateiformats von Version 17 nach Version 18
  von17nach18 () {
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

  // Konversion des Dateiformats von Version 18 nach Version 19
  von18nach19 () {
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

  // Konversion des Dateiformats von Version 19 nach Version 20
  von19nach20 () {
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

  // Konversion des Dateiformats von Version 20 nach Version 21
  von20nach21 () {
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

  // Konversion des Dateiformats von Version 21 nach Version 22
  von21nach22 () {
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

  // Konversion des Dateiformats von Version 22 nach Version 23
  von22nach23 () {
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

  // Konversion des Dateiformats von Version 23 nach Version 24
  von23nach24 () {
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

  // Konversion des Dateiformats von Version 24 nach Version 25
  von24nach25 () {
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
};
