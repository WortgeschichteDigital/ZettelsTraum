"use strict";

const drucken = {
  // Listener für die Druck-Icons
  //   a = Element
  //     (Icon-Link, auf den geklickt wurde)
  listener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      drucken.init(this.id);
    });
  },

  // Drucken über Tastaturkürzel initialisieren, starten oder ggf. unterbinden
  tastatur () {
    const oben = overlay.oben();
    if (oben && oben !== "drucken" || !kartei.wort) {
      return;
    }
    if (oben === "drucken") {
      drucken.start();
    } else if (helfer.hauptfunktion === "geruest") {
      drucken.init("bedeutungen-");
    } else if (helfer.hauptfunktion === "karte") {
      drucken.init("beleg-");
    } else {
      drucken.init("liste-");
    }
  },

  // Listener für die Buttons im Druckfenster
  //   span = Element
  //     (Element, hinter dem sich eine der Funktionen im Druckfenster befindet)
  buttons (span) {
    span.addEventListener("click", function () {
      if (/drucker/.test(this.firstChild.src)) {
        drucken.start();
      } else if (/kopieren/.test(this.firstChild.src)) {
        drucken.kopieren();
      }
    });
  },

  // Druckanzeige initialisieren (nur für Karteikarte und Belegliste)
  //   id = String
  //     (ID des Links, über den gedruckt wurde)
  //   gn = String || undefined
  //     (enthält die Bedeutungsgerüst-Nummer, wenn aus dem Bedeutungsgerüst-Fenster gedruckt wird)
  init (id, gn) {
    const fenster = document.getElementById("drucken");
    // Fenster öffnen oder in den Vordergrund holen
    if (overlay.oeffnen(fenster) && id !== "bedeutungen-") {
      // Fenster ist schon offen
      // (ignorieren, wenn ein Bedeutungsgerüst an die Funktion geschickt wird,
      // es könnte der Wunsch bestehen, jetzt ein anderes Gerüst zu drucken)
      return;
    }
    // Bedeutungsgerüst?
    if (/^bedeutungen-/.test(id)) {
      if (!gn) {
        gn = bedeutungen.data.gn;
      }
      drucken.initBedeutungen(gn);
      maxHeight();
      return;
    }
    // Verteiler
    drucken.getIds(id);
    if (!drucken.kartenIds.length) { // keine Karteikarten, die gedruckt werden können
      setTimeout(() => overlay.schliessen(fenster), 0); // ohne Timeout wird es nicht ausgeblendet
      dialog.oeffnen({
        typ: "alert",
        text: "In der Belegliste sind keine Karteikarten, die gedruckt werden könnten.",
      });
      return;
    }
    drucken.fillKarten();
    maxHeight();
    // Maximalhöhe des Fensters anpassen
    function maxHeight () {
      helfer.elementMaxHeight({
        ele: document.getElementById("drucken-cont"),
      });
    }
  },

  // Datenfelder der Karten, die gedruckt werden sollen
  kartenFelder: [
    {
      val: "da",
      name: "Datum",
      width: 1,
    },
    {
      val: "au",
      name: "Autor",
      width: 1,
    },
    {
      val: "bs",
      name: "Beleg",
      width: 2,
    },
    {
      val: "bd",
      name: "Bedeutung",
      width: 2,
    },
    {
      val: "bl",
      name: "Wortbildung",
      width: 1,
    },
    {
      val: "sy",
      name: "Synonym",
      width: 1,
    },
    {
      val: "qu",
      name: "Quelle",
      width: 2,
    },
    {
      val: "kr",
      name: "Korpus",
      width: 1,
    },
    {
      val: "ts",
      name: "Textsorte",
      width: 1,
    },
    {
      val: "no",
      name: "Notizen",
      width: 2,
    },
    {
      val: "an",
      name: "Anhänge",
      width: 2,
    },
  ],

  // die IDs der Karten, die gedruckt werden sollen
  kartenIds: [],

  // IDs der Karten sammeln, die gedruckt werden sollen
  getIds (id) {
    drucken.kartenIds = [];
    const a = drucken.kartenIds;
    if (/^beleg-/.test(id)) {
      a.push(beleg.data);
    } else if (/^liste-/.test(id)) {
      document.querySelectorAll(".liste-kopf").forEach(function (i) {
        a.push(i.dataset.id);
      });
    }
  },

  // Druckfenster mit dem Karteninhalt füllen
  fillKarten () {
    // Content leeren
    const cont = document.getElementById("drucken-cont");
    cont.replaceChildren();
    cont.scrollTop = 0;
    // Karten einhängen
    drucken.kartenIds.forEach(function (i) {
      let obj = i;
      if (!helfer.checkType("Object", obj)) {
        obj = data.ka[i];
      }
      // Überschrift
      const h3 = document.createElement("h3");
      h3.textContent = liste.detailAnzeigenH3(i);
      cont.appendChild(h3);
      // Tabelle
      const f = drucken.kartenFelder;
      const table = document.createElement("table");
      let trTh;
      let trTd;
      cont.appendChild(table);
      let nr = 2;
      for (let x = 0, len = f.length; x < len; x++) {
        if (nr >= 2) {
          nr = 0;
          trTh = document.createElement("tr");
          trTd = document.createElement("tr");
          table.appendChild(trTh);
          table.appendChild(trTd);
        }
        nr += f[x].width;
        // Kopf
        const th = document.createElement("th");
        trTh.appendChild(th);
        th.textContent = f[x].name;
        // Wert ermitteln
        let wert = "";
        if (Array.isArray(obj[f[x].val])) {
          if (f[x].val === "bd") {
            const wertTmp = [];
            for (const bd of obj[f[x].val]) {
              wertTmp.push(bedeutungen.bedeutungenTief({
                gr: bd.gr,
                id: bd.id,
                leer: true,
              }));
            }
            wert = wertTmp.join("\n");
          } else {
            wert = obj[f[x].val].join("\n");
          }
        } else {
          wert = obj[f[x].val];
        }
        if (!wert) {
          wert = "\u00A0";
        }
        // Inhalt
        const td = document.createElement("td");
        trTd.appendChild(td);
        if (helfer.checkType("String", wert)) {
          const wert_p = wert.replace(/\n\s*\n/g, "\n").split("\n");
          for (let y = 0, len = wert_p.length; y < len; y++) {
            const p = document.createElement("p");
            let text = wert_p[y];
            if (f[x].val === "bs") { // Wort im Belegschnitt hervorheben
              text = liste.belegWortHervorheben(text, true);
            }
            p.innerHTML = text;
            helfer.clipboardHtmlErsetzen(p, ".user, .farbe0 .wort");
            helfer.clipboardHtmlErsetzen(p, ".annotierung-wort");
            td.appendChild(p);
          }
        }
        // ggf. colspan setzen
        if (f[x].width === 2) {
          th.setAttribute("colspan", "2");
          td.setAttribute("colspan", "2");
        }
      }
    });
  },

  // Druckfenster mit dem Bedeutungsbaum füllen
  //   gn = String
  //     (die ID des Gerüsts, das gedruckt werden soll)
  initBedeutungen (gn) {
    let qu = data.bd;
    if (helfer.hauptfunktion === "geruest") {
      qu = bedeutungen.data;
    }
    // Sind überhaupt Bedeutungen vorhanden
    if (!qu.gr[gn].bd.length) {
      setTimeout(() => overlay.schliessen(document.getElementById("drucken")), 0); // ohne Timeout wird es nicht ausgeblendet
      dialog.oeffnen({
        typ: "alert",
        text: "Es gibt kein Bedeutungsgerüst, das gedruckt werden könnte.",
      });
      return;
    }
    // Content leeren
    const cont = document.getElementById("drucken-cont");
    cont.replaceChildren();
    cont.scrollTop = 0;
    // Bedeutungen aufbauen
    const bd = qu.gr[gn].bd;
    for (let i = 0, len = bd.length; i < len; i++) {
      // Schachteln erzeugen
      const frag = document.createDocumentFragment();
      let schachtel = frag;
      for (let j = 0, len = bd[i].bd.length; j < len; j++) {
        const div = document.createElement("div");
        schachtel.appendChild(div);
        div.classList.add("bd-win-baum");
        schachtel = div;
      }
      // Absatz mit Zählung und Bedeutung
      const p = document.createElement("p");
      schachtel.appendChild(p);
      p.dataset.id = bd[i].id;
      // Zählung
      const b = document.createElement("b");
      p.appendChild(b);
      b.classList.add("zaehlung");
      b.textContent = bd[i].za;
      // Bedeutung
      const span = document.createElement("span");
      p.appendChild(span);
      span.innerHTML = bd[i].bd[bd[i].bd.length - 1];
      // ggf. Tags ergänzen
      const tags = [];
      for (const tag of bd[i].ta) {
        if (!optionen.data.tags[tag.ty] ||
            !optionen.data.tags[tag.ty].data[tag.id]) {
          continue;
        }
        const abbr = optionen.data.tags[tag.ty].data[tag.id].abbr;
        if (abbr) {
          tags.push(abbr);
        } else {
          tags.push(optionen.data.tags[tag.ty].data[tag.id].name);
        }
      }
      if (tags.length) {
        span.appendChild(document.createTextNode(` [${tags.join("; ")}]`));
      }
      // Fragment einhängen
      cont.appendChild(frag);
    }
    // Überschrift ergänzen
    let h = "Bedeutungsgerüst";
    if (Object.keys(qu.gr).length > 1) {
      h += ` ${gn}`;
    }
    if (qu.gr[qu.gn].na) {
      h += ` (${qu.gr[qu.gn].na})`;
    }
    h += " – ";
    const h3 = document.createElement("h3");
    h3.textContent = h;
    const i = document.createElement("i");
    i.textContent = kartei.wort;
    h3.appendChild(i);
    cont.insertBefore(h3, cont.firstChild);
  },

  // Druck starten
  start () {
    // Liste auf "preload" setzen, sonst springt sie im Hintergrund wild rum
    // ("preload" schaltet die Animationslänge auf 0 Sekunden)
    document.getElementById("liste").classList.add("preload");
    // Druckfunktion triggern
    print();
  },

  // Text aus der Vorschau kopieren
  kopieren () {
    // Bedeutungsbaum?
    const cont = document.getElementById("drucken-cont");
    let baum = false;
    if (cont.querySelector(".bd-win-baum")) {
      baum = true;
    }
    // Ist Text ausgewählt und ist er im Bereich der Vorschau?
    if (window.getSelection().toString() &&
        popup.getTargetSelection([ cont ])) {
      let html = popup.textauswahl.html;
      if (baum) {
        html = baumHtml(html);
      }
      let text = popup.textauswahl.text;
      if (baum) {
        text = baumText(popup.textauswahl.html);
        text = cleanText(text);
      }
      modules.clipboard.write({
        text,
        html,
      });
      return;
    }
    // Kein Text ausgewählt => die gesamte Vorschau wird kopiert
    let html = cont.innerHTML;
    if (baum) {
      html = baumHtml(html);
    }
    html = helfer.clipboardHtml(html);
    // Text aufbereiten (Karten nur basal aufbereiten, Bedeutungsbaum schöner)
    let text = cont.innerHTML;
    if (baum) {
      text = baumText(text);
    } else {
      text = text.replace(/<\/h3>|<\/p>|<\/tr>/g, "\n\n");
    }
    text = cleanText(text);
    // HTML und Text kopieren
    modules.clipboard.write({
      text,
      html,
    });
    // Animation, die anzeigt, dass die Zwischenablage gefüllt wurde
    helfer.animation("zwischenablage");
    // Funktionen zum Aufbereiten des Bedeutungsbaums
    function baumHtml (html) {
      html = html.replace(/<\/b>/g, "</b> ");
      html = html.replace(/<div class="bd-win-baum">/g, function () {
        return `<div style="margin-left: ${0.5}cm">`;
      });
      return html;
    }
    function baumText (text) {
      text = text.replace(/<\/h3>/, "\n\n");
      text = text.replace(/<b class="zaehlung">(.+?)<\/b>/g, (m, p1) => `${p1} `);
      text = text.replace(/<\/p>/g, "\n");
      text = text.replace(/<div class="bd-win-baum">/g, () => "\t");
      return text;
    }
    function cleanText (text) {
      text = text.replace(/<.+?>/g, "");
      text = text.replace(/&nbsp;/g, "\u00A0");
      return text;
    }
  },
};
