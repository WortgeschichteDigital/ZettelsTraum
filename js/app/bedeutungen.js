"use strict";

const bedeutungen = {
  // speichert den Timeout für das Ausschalten der Farbe
  // bei den Ereignissen unmovable, moved und saved
  timeout: null,

  // Kopie des Bedeutungsgerüsts, ausgelesen aus data.bd
  data: {},

  // Zeiger auf das gerade aktive Bedeutungsgerüst: bedeutungen.data.gr["ID"]
  akt: {},

  // Generator zur Erzeugung der nächsten ID
  makeId: null,
  *idGenerator (id) {
    while (true) {
      yield id++;
    }
  },

  // ermittelt, welche ID als Nächstes vergeben werden sollte
  //   gr = Array
  idInit (gr = bedeutungen.akt) {
    let lastId = 0;
    gr.bd.forEach(i => {
      if (i.id > lastId) {
        lastId = i.id;
      }
    });
    bedeutungen.makeId = bedeutungen.idGenerator(lastId + 1);
  },

  // baut ein initiales, alphabetisch sortiertes Bedeutungsgerüst auf
  // (falls in der Kartei noch keines vorhanden ist; irgendwann ist diese Funktion tot,
  // weil sie nur von konversion.mjs aufgerufen wird)
  konstit () {
    // Bedeutungsgerüst ist vorhanden
    if (data.bd.gn) {
      return;
    }
    // ID-Generator initialisieren
    bedeutungen.makeId = bedeutungen.idGenerator(1);
    // Gerüst aufbauen
    data.bd = {}; // eigentlich nicht nötig (?)
    data.bd.gn = "1";
    data.bd.gr = {};
    data.bd.gr["1"] = {};
    data.bd.gr["1"].na = "";
    data.bd.gr["1"].sl = 2;
    data.bd.gr["1"].bd = [];
    bedeutungen.bedeutungVorhandenCache = {};
    for (const val of Object.values(data.ka)) {
      if (!val.bd) {
        continue;
      }
      const bd = val.bd.split("\n");
      for (let i = 0, len = bd.length; i < len; i++) {
        bedeutungen.konstitErgaenzen(bd[i]);
      }
    }
    // Einträge im Gerüst sortieren
    data.bd.gr["1"].bd.sort(function (a, b) {
      for (let i = 0, len = a.bd.length; i < len; i++) {
        if (a.bd[i] !== b.bd[i]) {
          return helfer.sortAlpha(a.bd[i], b.bd[i]);
        }
        if (a.bd[i + 1] && b.bd[i + 1]) {
          continue;
        }
        if (a.bd.length > b.bd.length) {
          return 1;
        } else if (a.bd.length < b.bd.length) {
          return -1;
        }
        return 0;
      }
      // zur Sicherheit
      return 0;
    });
    // Einträge im Gerüst durchzählen
    bedeutungen.konstitZaehlung(data.bd.gr["1"].bd, 2);
  },

  // Gerüst ggf. um die übergebene Bedeutung ergänzen
  //   bd = String
  //     (Bedeutung ausgeschrieben, Hierarchien durch ": " getrennt)
  konstitErgaenzen (bd) {
    if (bedeutungen.bedeutungVorhanden(bd, true, data.bd.gr["1"].bd)) {
      return;
    }
    const hie = bd.split(": ");
    const hie_akt = [];
    let i = 0;
    do {
      hie_akt.push(hie[i]);
      if (!bedeutungen.bedeutungVorhanden(hie_akt.join(": "), true, data.bd.gr["1"].bd)) {
        data.bd.gr["1"].bd.push(bedeutungen.konstitBedeutung(hie_akt));
      }
      i++;
    } while (hie[i]);
  },

  // gibt ein neues Bedeutungs-Objekt zurück
  //   bd = Array
  //     (die Bedeutung mit allen Hierarchieebenen)
  konstitBedeutung (bd) {
    return {
      al: "",
      bd: [ ...bd ],
      id: bedeutungen.makeId.next().value,
      ta: [],
      za: "",
    };
  },

  // Bedeutungen durchzählen
  //   arr = Array
  //     (Array mit den Bedeutungen, die durchgezählt werden sollen)
  //   sl = Number | undefined
  //     (Start-Level der Zählung)
  konstitZaehlung (arr = bedeutungen.akt.bd, sl = bedeutungen.akt.sl) {
    bedeutungen.zaehlungen = [];
    arr.forEach(function (i) {
      i.za = bedeutungen.zaehlung(i.bd, sl);
    });
  },

  // Zählzeichen
  zaehlzeichen: [
    [ "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "IX", "XX" ],
    [ "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T" ],
    [ "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20" ],
    [ "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t" ],
    [ "α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ" ],
    Array(20).fill("•"),
    Array(20).fill("◦"),
  ],

  // speichert, wo man gerade mit der Zählung der einzelnen Hierarchien ist
  zaehlungen: [],

  // gibt das richtige Zählzeichen zurück
  //   bd = Array
  //     (Array mit allen Bedeutungen)
  //   sl = Number | undefined
  //     (Start-Level der Zählung)
  zaehlung (bd, sl = bedeutungen.akt.sl) {
    // Ebene ermitteln
    let ebene = bd.length - 1;
    ebene += sl;
    // Ebene hochzählen
    if (!bedeutungen.zaehlungen[ebene]) {
      bedeutungen.zaehlungen[ebene] = 0;
    }
    bedeutungen.zaehlungen[ebene]++;
    // alle tieferen Ebenen löschen
    bedeutungen.zaehlungen.fill(0, ebene + 1);
    // Zählzeichen ermitteln
    let zeichen = "–";
    if (bedeutungen.zaehlzeichen[ebene]) {
      zeichen = bedeutungen.zaehlzeichen[ebene][bedeutungen.zaehlungen[ebene] - 1];
    }
    return zeichen;
  },

  // gibt alle Ebenen der Zählung der übergebenen Bedeutung zurück
  //   idx = Number
  //     (Index der Bedeutung im Bedeutungsgerüst)
  //   bd = Array
  //     (Array mit allen Bedeutungen)
  zaehlungTief (idx, bd = bedeutungen.akt.bd) {
    let ebene = -1;
    const zaehlungen = [];
    do {
      zaehlungen.push(bd[idx].za);
      ebene = bd[idx].bd.length;
      while (idx > 0 && bd[idx].bd.length >= ebene) {
        idx--;
      }
    } while (ebene > 1);
    return zaehlungen.reverse();
  },

  // gibt Bedeutungen mit Zählung als String zurück
  //   gr = String
  //     (ID der Gerüst-Nummer)
  //   id = Number
  //     (ID der Bedeutung)
  //   za = false | undefined
  //     (das Zählzeichen soll angezeigt werden)
  //   zaCl = true | undefined
  //     (das Zählzeichen soll die class "zaehlung" erhalten)
  //   al = true | undefined
  //     (hat die Bedeutung einen Alias, soll der Alias zurückgegeben werden)
  //   leer = true | undefined
  //     (vor und hinter den Zählzeichen werden Leerzeichen eingefügt)
  //   strip = true | undefined
  //     (Tags werden aus der Bedeutung entfernt)
  bedeutungenTief ({ gr, id, za = true, zaCl = false, al = false, leer = false, strip = false }) {
    const arr = [];
    const bd = data.bd.gr[gr].bd;
    let bd_len = -1;
    let idx = -1;
    let cl = "";
    if (zaCl) {
      cl = ' class="zaehlung"';
    }
    // Bedeutung finden
    for (let i = 0, len = bd.length; i < len; i++) {
      if (bd[i].id === id) {
        bd_len = bd[i].bd.length;
        idx = i - 1;
        let init = false;
        if (bd_len === 1) {
          init = true;
        }
        fuellen(i, init);
        break;
      }
    }
    // Bedeutungszweig füllen
    for (let i = idx; i >= 0; i--) {
      if (bd[i].bd.length < bd_len) {
        bd_len = bd[i].bd.length;
        let init = false;
        if (bd_len === 1) {
          init = true;
        }
        fuellen(i, init);
        if (bd_len === 1) {
          break;
        }
      }
    }
    arr.reverse();
    let joined = "";
    if (!za) {
      joined = arr.join(": ");
    } else {
      joined = arr.join("");
    }
    if (strip) {
      joined = joined.replace(/<.+?>/g, "");
    }
    return joined;
    // Array mit Werten füllen
    //   i = Number
    //     (Index der Bedeutung)
    //   init = Boolean
    //     (Zählung wird initialisiert; das ist für die Leerzeichen wichtig zu wissen)
    function fuellen (i, init) {
      let zaehlung = "";
      if (za && leer) {
        let zaehlungVor = "\u00A0".repeat(3);
        if (init) {
          zaehlungVor = "";
        }
        zaehlung = `${zaehlungVor}<b${cl}>${bd[i].za}</b> `;
      } else if (za) {
        zaehlung = `<b${cl}>${bd[i].za}</b>`;
      }
      let bedeutung = bd[i].bd[bd_len - 1];
      if (al && bd[i].al) {
        bedeutung = bd[i].al;
      }
      arr.push(`${zaehlung}${bedeutung}`);
    }
  },

  // überprüft, ob die übergebene Bedeutung schon vorhanden ist
  //   bd = String
  //     (die Bedeutung, Hierarchien getrennt durch ": ")
  //   cache = true | undefined
  //     (ist die Bedeutung vorhanden, soll sie gecacht werden
  //   arr = Array | undefined
  //     (Array, in dem geschaut werden soll, ob die Bedeutung vorhanden ist)
  bedeutungVorhandenCache: {},
  bedeutungVorhanden (bd, cache = false, arr = bedeutungen.akt.bd) {
    if (cache && bedeutungen.bedeutungVorhandenCache[bd]) {
      return true;
    }
    for (let i = 0, len = arr.length; i < len; i++) {
      if (arr[i].bd.join(": ") === bd) {
        if (cache) {
          bedeutungen.bedeutungVorhandenCache[bd] = true;
        }
        return true;
      }
    }
    return false;
  },

  // Bedeutungsgerüst wechseln
  //   id = String
  //     (die ID des Bedeutungsgerüsts in bedeutungen.data.gr[id])
  geruestWechseln (id) {
    bedeutungen.data.gn = id;
    bedeutungen.akt = bedeutungen.data.gr[id];
    document.getElementById("bedeutungen-gerueste").value = `Gerüst ${id}`;
    document.getElementById("bedeutungen-hierarchie").value = bedeutungen.hierarchieEbenen[bedeutungen.akt.sl];
    bedeutungen.aufbauen();
    bedeutungen.bedeutungenGeaendert(true);
    bedeutungen.idInit();
  },

  // Bedeutungsgerüst kopieren
  geruestKopieren () {
    const geruest = document.getElementById("bedeutungen-gerueste-kopieren").value.replace(/^Gerüst /, "");
    const quelle = bedeutungen.data.gr[geruest];
    // Start-Level übernehmen
    bedeutungen.akt.sl = quelle.sl;
    document.getElementById("bedeutungen-hierarchie").value = bedeutungen.hierarchieEbenen[bedeutungen.akt.sl];
    // Bedeutungen kopieren + für das Eintragen in Karteikarten vormerken
    for (let i = 0, len = quelle.bd.length; i < len; i++) {
      bedeutungen.akt.bd.push(bedeutungen.makeCopy(i, quelle));
      bedeutungen.aendernFuellen({
        add: true,
        gr: geruest,
        grN: bedeutungen.data.gn,
        id: quelle.bd[i].id,
        idN: quelle.bd[i].id,
      });
    }
    // Gerüst neu aufbauen
    bedeutungen.aufbauen();
    // Änderungsmarkierung setzen
    bedeutungen.bedeutungenGeaendert(true);
    // ermitteln, welche ID als nächste vergeben werden sollte
    bedeutungen.idInit();
  },

  // Bedeutungsgerüst öffnen
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Bedeutungsgerüst</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Bedeutungsgerüst ist schon offen
    if (helfer.hauptfunktion === "geruest") {
      if (!overlay.oben()) {
        const neu = document.getElementById("bedeutungen-neu");
        helfer.auswahl(neu);
        const rect = neu.getBoundingClientRect();
        if (rect.bottom + 20 > window.innerHeight) {
          window.scrollTo({
            left: 0,
            top: rect.bottom + 20 - window.innerHeight + window.scrollY,
            behavior: "smooth",
          });
        }
      }
      return;
    }
    // Bedeutungenformular anzeigen und initialisieren
    speichern.checkInit(async () => {
      helfer.hauptfunktion = "geruest";
      await overlay.alleSchliessen();
      bedeutungen.data = structuredClone(data.bd);
      bedeutungen.akt = bedeutungen.data.gr[bedeutungen.data.gn];
      document.getElementById("bedeutungen-gerueste").value = `Gerüst ${bedeutungen.data.gn}`;
      document.getElementById("bedeutungen-hierarchie").value = bedeutungen.hierarchieEbenen[bedeutungen.akt.sl];
      bedeutungen.aufbauen();
      helfer.sektionWechseln("bedeutungen");
      bedeutungen.idInit();
    });
  },

  // das Bedeutungsgerüst aufbauen
  aufbauen () {
    bedeutungen.moveAktiv = false;
    // Content vorbereiten
    const cont = document.getElementById("bedeutungen-cont");
    const table = cont.querySelector("table");
    while (table.childNodes.length > 1) { // Caption mit Überschrift erhalten
      table.removeChild(table.lastChild);
    }
    // Überschrift aufbereiten
    bedeutungen.aufbauenH2();
    // Tabelle füllen
    bedeutungen.akt.bd.forEach(function (i, n) {
      // Zeile erzeugen
      const bd = i.bd;
      const tr = document.createElement("tr");
      tr.dataset.idx = n;
      table.appendChild(tr);
      // Move
      let td = document.createElement("td");
      tr.appendChild(td);
      let a = document.createElement("a");
      td.appendChild(a);
      a.classList.add("icon-link", "icon-windrose_l-u-r-d");
      a.href = "#";
      a.title = "Bedeutung verschieben";
      a.textContent = "\u00A0";
      bedeutungen.moveListener(a);
      // Löschen
      td = document.createElement("td");
      tr.appendChild(td);
      a = document.createElement("a");
      td.appendChild(a);
      a.classList.add("icon-link", "icon-loeschen");
      a.href = "#";
      a.title = "Bedeutung löschen (Entf)";
      a.textContent = "\u00A0";
      bedeutungen.loeschenListener(a);
      // Verschmelzen
      td = document.createElement("td");
      tr.appendChild(td);
      a = document.createElement("a");
      td.appendChild(a);
      a.classList.add("icon-link", "icon-verschmelzen");
      a.href = "#";
      a.title = "Bedeutung verschmelzen";
      a.textContent = "\u00A0";
      bedeutungen.verschmelzenListener(a);
      // Bedeutung
      td = document.createElement("td");
      tr.appendChild(td);
      td.classList.add("zaehlung");
      const p = document.createElement("p");
      const b = document.createElement("b");
      b.textContent = i.za;
      p.appendChild(b);
      const span = document.createElement("span");
      span.dataset.feld = "bd";
      span.innerHTML = bd[bd.length - 1];
      bedeutungen.editContListener(span);
      p.appendChild(span);
      let div = document.createElement("div");
      div.appendChild(p);
      for (let j = 1, len = bd.length; j < len; j++) {
        const nDiv = document.createElement("div");
        nDiv.appendChild(div);
        div = nDiv;
      }
      td.appendChild(div);
      // Tags
      td = document.createElement("td");
      td.dataset.feld = "ta";
      tr.appendChild(td);
      bedeutungen.aufbauenTags(i.ta, td);
      bedeutungen.openTagger(td);
      // Alias
      td = document.createElement("td");
      td.dataset.feld = "al";
      tr.appendChild(td);
      let al = i.al;
      if (!al) {
        al = "Alias";
        td.classList.add("leer");
      }
      td.textContent = al;
      bedeutungen.editContListener(td);
    });
    // ggf. Kopierzeile einrücken
    if (!bedeutungen.akt.bd.length && Object.keys(bedeutungen.data.gr).length > 1) {
      bedeutungen.aufbauenKopieren(table);
    }
    // Ergänzungszeile einrücken
    bedeutungen.aufbauenErgaenzen(table);
    // Tooltips initialisieren
    tooltip.init(cont);
  },

  // Überschrift des Bedeutungsgerüst ggf. anpassen
  aufbauenH2 () {
    // Überschrift ermitteln
    let text = "Bedeutungsgerüst";
    const details = bedeutungen.aufbauenH2Details(bedeutungen.data, false);
    if (details) {
      text += details;
    }
    // Überschrift eintragen
    const h2 = document.querySelector("#bedeutungen-cont h2");
    h2.replaceChild(document.createTextNode(text), h2.firstChild);
  },

  // Details der Überschrift ermitteln
  // (diese Funktion wird auch in anderen Kontexten genutzt, darum ausgelagert)
  //   data = Object
  //     (Objekt, aus dem die Details ausgelesen werden sollen: bedeutungen.data oder data.bd)
  //   add_geruest = Boolean
  //     (gibt an, ob "Gerüst" hinzugefügt werden soll
  aufbauenH2Details (data, add_geruest) {
    let details = "";
    if (Object.keys(data.gr).length > 1) {
      if (add_geruest) {
        details += "\u00A0– Gerüst";
      }
      details += `\u00A0${data.gn}`;
    }
    const name = data.gr[data.gn].na;
    if (name) {
      details += `\u00A0(${name})`;
    }
    return details;
  },

  // Tags einer Bedeutung erzeugen und einhängen
  // (wird auch vom Tagger genutzt)
  //   ta = Array
  //     (Array mit den Tags: ta[idx].ty = Typ, ta[idx].id = ID)
  //   td = Element
  //     (die Tabellenzelle, in die die Tags eingetragen werden sollen)
  aufbauenTags (ta, td) {
    // keine Tags vorhanden
    if (!ta.length) {
      td.classList.add("leer");
      td.textContent = "Tags";
      return;
    }
    // Tags eintragen
    td.classList.remove("leer");
    const tagsEx = [];
    for (const tag of ta) {
      if (!optionen.data.tags[tag.ty] ||
          !optionen.data.tags[tag.ty].data[tag.id]) {
        tagsEx.push(ta.findIndex(i => i === tag));
        continue;
      }
      const span = document.createElement("span");
      td.appendChild(span);
      span.classList.add(`bedeutungen-tags-${tag.ty}`);
      const name = optionen.data.tags[tag.ty].data[tag.id].name;
      const abbr = optionen.data.tags[tag.ty].data[tag.id].abbr;
      const typ = optionen.tagsTypen[tag.ty] ? optionen.tagsTypen[tag.ty][1] : tag.ty.substring(0, 1).toUpperCase() + tag.ty.substring(1);
      if (abbr) {
        span.textContent = abbr;
      } else {
        span.textContent = name;
      }
      span.title = `${typ}: ${name}`;
    }
    // ggf. nicht mehr existierende Tags entfernen
    if (tagsEx.length) {
      tagsEx.reverse();
      for (const idx of tagsEx) {
        ta.splice(idx, 1);
      }
      bedeutungen.bedeutungenGeaendert(true);
    }
  },

  // Zeile zum Kopieren eines Bedeutungsgerüsts einfügen
  //   table = Element
  //     (die Tabelle mit dem Bedeutungsgerüst)
  aufbauenKopieren (table) {
    const tr = document.createElement("tr");
    table.appendChild(tr);
    tr.classList.add("bedeutungen-kopieren");
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      td.textContent = "\u00A0";
      tr.appendChild(td);
    }
    // mögliche Gerüste ermitteln
    const gerueste = Object.keys(bedeutungen.data.gr);
    gerueste.splice(gerueste.indexOf(bedeutungen.data.gn), 1);
    // Dropdown-Feld
    const frag = document.createDocumentFragment();
    const span = document.createElement("span");
    frag.appendChild(span);
    span.classList.add("dropdown-cont");
    const input = document.createElement("input");
    span.appendChild(input);
    input.classList.add("dropdown-feld");
    input.id = "bedeutungen-gerueste-kopieren";
    input.readOnly = true;
    input.title = "Bedeutungsgerüst auswählen";
    input.type = "text";
    input.value = `Gerüst ${gerueste[0]}`;
    const a = dropdown.makeLink("dropdown-link-element", "Bedeutungsgerüst auswählen");
    span.appendChild(a);
    tooltip.init(span);
    // Add-Button
    const button = document.createElement("input");
    button.type = "button";
    button.value = "Kopieren";
    span.appendChild(button);
    // Fragment einhängen + Event-Listener anhängen
    tr.childNodes[3].replaceChild(frag, tr.childNodes[3].firstChild);
    dropdown.feld(document.getElementById("bedeutungen-gerueste-kopieren"));
    button.addEventListener("click", () => bedeutungen.geruestKopieren());
  },

  // Zeile zum Ergänzen des Bedeutungsgerüsts einfügen
  //   table = Element
  //     (die Tabelle mit dem Bedeutungsgerüst)
  aufbauenErgaenzen (table) {
    const tr = document.createElement("tr");
    table.appendChild(tr);
    tr.classList.add("bedeutungen-neu");
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      td.textContent = "\u00A0";
      tr.appendChild(td);
    }
    const span = document.createElement("span");
    span.classList.add("leer");
    span.id = "bedeutungen-neu";
    span.setAttribute("contenteditable", "true");
    span.textContent = "neue Bedeutung";
    helfer.editPaste(span);
    bedeutungen.ergaenzen(span);
    tr.childNodes[3].replaceChild(span, tr.childNodes[3].firstChild);
  },

  // Werte für das Formular, mit dem die oberste Hierarchie der Zählzeichen festgelegt wird
  hierarchieEbenen: [
    "I, II, III, …",
    "A, B, C, …",
    "1, 2, 3, …",
  ],

  // Reaktion auf Änderungen der Hierarchie
  hierarchie () {
    const hie = document.getElementById("bedeutungen-hierarchie").value;
    const idx = bedeutungen.hierarchieEbenen.indexOf(hie);
    if (idx === bedeutungen.akt.sl) {
      return;
    }
    // Werte ändern
    bedeutungen.akt.sl = idx;
    bedeutungen.konstitZaehlung();
    bedeutungen.bedeutungenGeaendert(true);
    // neue Zählung eintragen
    document.querySelectorAll("#bedeutungen-cont b").forEach(function (i, n) {
      i.textContent = bedeutungen.akt.bd[n].za;
    });
  },

  // die vorherige oder nächste Bedeutung aufrufen
  // (wird nur aufgerufen, wenn Ctrl + ↑ | Ctrl + ↓)
  //   evt = Object
  //     (Event-Object des keydown)
  navi (evt) {
    // Abbruch, falls noch keine Bedeutungen vorhanden sind
    if (!bedeutungen.akt.bd.length) {
      return;
    }
    // Bedeutungen vorhanden
    const trEditAktiv = document.querySelector("#bedeutungen-cont .bedeutungen-edit");
    if (trEditAktiv) { // Zeile fokussiert (die Bedeutung/die Tags/das Alias)
      bedeutungen.moveAn(parseInt(trEditAktiv.dataset.idx, 10));
    } else if (!bedeutungen.moveAktiv) {
      const tr = document.querySelector("#bedeutungen-cont tr");
      if (hasIdx(tr)) {
        bedeutungen.moveAn(parseInt(tr.dataset.idx, 10));
      }
      bedeutungen.moveScroll();
      return;
    }
    const tr_aktiv = document.querySelector(".bedeutungen-aktiv");
    if (evt.key === "ArrowUp" && hasIdx(tr_aktiv.previousSibling)) { // hoch
      bedeutungen.moveAus();
      bedeutungen.moveAn(parseInt(tr_aktiv.previousSibling.dataset.idx, 10));
    } else if (evt.key === "ArrowDown" && hasIdx(tr_aktiv.nextSibling)) { // runter
      bedeutungen.moveAus();
      bedeutungen.moveAn(parseInt(tr_aktiv.nextSibling.dataset.idx, 10));
    }
    bedeutungen.moveScroll();
    function hasIdx (tr) {
      if (tr.dataset.idx) {
        return true;
      }
      return false;
    }
  },

  // Navigation durch die Felder einer Bedeutung mit Tabs
  //   evt = Event-Objekt
  //     (Keyboard-Event)
  naviTab (evt) {
    // nichts aktiviert
    if (!bedeutungen.moveAktiv &&
        !document.getElementById("bedeutungen-edit") &&
        !document.getElementById("bedeutungen-tagger-link")) {
      return;
    }
    evt.preventDefault();
    // moveAktiv
    if (bedeutungen.moveAktiv) {
      const zeile = document.querySelector(".bedeutungen-aktiv");
      if (evt.shiftKey) {
        bedeutungen.editErstellen(zeile.lastChild);
      } else {
        bedeutungen.editErstellen(zeile.childNodes[3].querySelector("span"));
      }
      return;
    }
    // anderes Edit-Feld fokussieren oder die Zeile aktivieren
    let aktiv = document.getElementById("bedeutungen-edit");
    if (!aktiv) {
      aktiv = document.getElementById("bedeutungen-tagger-link");
    }
    const felder = [ "bd", "ta", "al" ];
    const feld = aktiv.parentNode.dataset.feld;
    let pos = felder.indexOf(feld);
    if (evt.shiftKey) {
      pos--;
    } else {
      pos++;
    }
    const zeile = document.querySelector(".bedeutungen-edit");
    if (pos < 0 || pos === felder.length) { // Zeile aktivieren
      const idx = parseInt(zeile.dataset.idx, 10);
      bedeutungen.moveAn(idx);
    } else { // anderes Edit-Feld fokussieren
      const neuesFeld = zeile.querySelector(`*[data-feld="${felder[pos]}"]`);
      if (felder[pos] === "ta") {
        bedeutungen.linkTagger(neuesFeld);
      } else {
        bedeutungen.editErstellen(neuesFeld);
        bedeutungen.editZeile(neuesFeld, true); // Tagger-Link onblur => Zeile wird deaktiviert => Zeile muss wieder aktiviert werden
      }
    }
  },

  // speichert den Timeout für das Aktivieren des Drags
  moveListenerDrag: null,

  // Listener für die Windrose
  //   a = Element
  //     (der Link mit der Windrose)
  moveListener (a) {
    // Aktivierung
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      clearTimeout(bedeutungen.moveListenerDrag);
      const tr = this.parentNode.parentNode;
      const tr_verschmelzen = tr.classList.contains("bedeutungen-verschmelzen") !== null;
      const tr_aktiv = bedeutungen.moveAus();
      if (tr === tr_aktiv && !tr_verschmelzen) {
        return;
      }
      bedeutungen.moveAn(parseInt(tr.dataset.idx, 10));
    });
    // Vorbereiten des Drag
    a.addEventListener("mousedown", function () {
      const tr = this.parentNode.parentNode;
      bedeutungen.moveListenerDrag = setTimeout(() => {
        // Header-Höhe berechnen
        bedeutungenDrag.data.header = document.querySelector("body > header").offsetHeight;
        bedeutungenDrag.data.header += document.querySelector("#bedeutungen > header").offsetHeight;
        const quick = document.getElementById("quick");
        if (quick.classList.contains("an")) {
          bedeutungenDrag.data.header += quick.offsetHeight;
        }
        // Bedeutung markieren
        bedeutungen.moveAus();
        document.getElementById("bedeutungen-cont").classList.add("drag");
        bedeutungen.moveAn(parseInt(tr.dataset.idx, 10));
        // Maus-Events initialisieren
        document.addEventListener("mousemove", bedeutungenDrag.mouse);
        document.addEventListener("mouseup", bedeutungenDrag.end);
        document.addEventListener("scroll", bedeutungenDrag.markerAus);
      }, 250);
    });
  },

  // eine der Bedeutungen ist aktiviert und kann nun mit allen Subbedeutungen bewegt werden
  moveAktiv: false,

  // Bedeutung (mit allen Unterbedeutungen) aktivieren
  //   idx = Number
  //     (Index der aktiven Zeile)
  //   moved = true | undefined
  //     (die zu aktivierende Bedeutung wurde gerade bewegt)
  moveAn (idx, moved = false) {
    bedeutungen.moveAktiv = true;
    bedeutungen.editFeldWeg();
    bedeutungen.editZeile(null);
    // Top-Element markieren
    const tr = document.querySelectorAll("#bedeutungen-cont tr")[idx];
    tr.classList.add("bedeutungen-aktiv");
    // affizierte markieren
    const len_aktiv = bedeutungen.akt.bd[idx].bd.length;
    for (let i = idx + 1, len = bedeutungen.akt.bd.length; i < len; i++) {
      if (bedeutungen.akt.bd[i].bd.length <= len_aktiv) {
        break;
      }
      document.querySelector(`tr[data-idx="${i}"]`).classList.add("bedeutungen-affiziert");
    }
    // mögliche Bewegungen ermitteln
    bedeutungen.moveGetData();
    // Icon ändern
    const rose = [];
    for (const [ n, val ] of Object.entries(bedeutungen.moveData)) {
      if (val.movable) {
        rose.push(n);
      }
    }
    const icon = tr.firstChild.firstChild;
    icon.setAttribute("class", `icon-link icon-windrose_${rose.join("-")}`);
    setTimeout(function () {
      icon.focus();
    }, 0); // ohne Timeout kein Fokus
    // erfolgreiche Bewegung markieren
    if (moved) {
      bedeutungen.feedback("bedeutungen-moved");
    }
  },

  // Bewegung wieder ausschalten
  moveAus () {
    const tr = document.querySelector(".bedeutungen-aktiv");
    if (!tr) {
      return null;
    }
    // Icon zurücksetzen
    const icon = tr.firstChild.firstChild;
    icon.setAttribute("class", "icon-link icon-windrose_l-u-r-d");
    // aktivierte Zeile deaktivieren
    icon.blur();
    tr.classList.remove("bedeutungen-aktiv", "bedeutungen-verschmelzen");
    bedeutungen.moveAktiv = false;
    // affizierte Zeilen deaktivieren
    document.querySelectorAll(".bedeutungen-affiziert").forEach(function (i) {
      i.classList.remove("bedeutungen-affiziert", "bedeutungen-verschmelzen");
    });
    // ggf. Drag deaktivieren
    if (document.getElementById("bedeutungen-cont").classList.contains("drag")) {
      bedeutungenDrag.end();
    }
    // vormals aktive Zeile zurückgeben
    return tr;
  },

  // speichert die Daten zwischen, welche Bewegungen möglich sind und
  // wie sie ausgeführt werden sollten
  moveData: {
    l: { // nach links 37
      movable: false,
      steps: 0,
    },
    u: { // nach oben 38
      movable: false,
      steps: 0,
    },
    r: { // nach rechts 39
      movable: false,
      steps: 0,
      pad: [],
    },
    d: { // nach unten 40
      movable: false,
      steps: 0,
    },
  },

  // ermitteln, in welche Richtung der aktive Block bewegt werden kann
  moveGetData () {
    // Daten zurücksetzen
    for (const dir of Object.values(bedeutungen.moveData)) {
      dir.movable = false;
      dir.steps = 0;
      if (dir.pad) {
        dir.pad = [];
      }
    }
    // neue Daten ermitteln
    const idx = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
    const ebene = bedeutungen.akt.bd[idx].bd.length;
    const textBd = bedeutungen.editFormat(bedeutungen.akt.bd[idx].bd[ebene - 1]);
    const d = bedeutungen.moveData;
    // nach links
    if (bedeutungen.akt.bd[idx].bd.length > 1) {
      d.l.movable = true;
      for (let i = idx + 1, len = bedeutungen.akt.bd.length; i < len; i++) {
        const ebene_tmp = bedeutungen.akt.bd[i].bd.length;
        if (ebene_tmp <= ebene - 1) {
          break;
        }
        d.l.steps++;
      }
    }
    let bdFehler = bedeutungen.editBdTest({
      wert: textBd,
      idx,
      ebene: ebene - 1,
    });
    if (bdFehler) {
      d.l.movable = false;
    }
    // nach oben
    if (idx > 0 && bedeutungen.akt.bd[idx - 1].bd.length >= bedeutungen.akt.bd[idx].bd.length) {
      d.u.movable = true;
      d.u.steps = -1;
      for (let i = idx - 1; i >= 0; i--) {
        if (bedeutungen.akt.bd[i].bd.length <= ebene) {
          break;
        }
        d.u.steps--;
      }
    }
    // nach rechts
    for (let i = idx - 1; i >= 0; i--) {
      const ebene_tmp = bedeutungen.akt.bd[i].bd.length;
      if (ebene_tmp <= ebene) {
        if (ebene_tmp === ebene) {
          d.r.pad = [ ...bedeutungen.akt.bd[i].bd ];
        }
        break;
      }
    }
    if (d.r.pad.length) {
      d.r.movable = true;
    }
    bdFehler = bedeutungen.editBdTest({
      wert: textBd,
      idx,
      ebene: ebene + 1,
    });
    if (bdFehler) {
      d.r.movable = false;
    }
    // nach unten
    let gleiche_ebene = false;
    for (let i = idx + 1, len = bedeutungen.akt.bd.length; i < len; i++) {
      const ebene_tmp = bedeutungen.akt.bd[i].bd.length;
      if (ebene_tmp < ebene) {
        break;
      }
      if (ebene_tmp === ebene) {
        if (gleiche_ebene) {
          break;
        }
        gleiche_ebene = true;
      }
      d.d.steps++;
    }
    if (gleiche_ebene && d.d.steps) {
      d.d.movable = true;
    }
  },

  // Bedeutung im Bedeutungsgerüst bewegen
  //   evt = Object
  //     (Event-Object des keydown)
  move (evt) {
    // kein Element aktiviert
    if (!bedeutungen.moveAktiv) {
      return;
    }
    evt.preventDefault();
    const dir = evt.key.match(/Arrow([A-Z])/)[1].toLowerCase();
    // Bewegung unmöglich
    const d = bedeutungen.moveData[dir];
    if (!d.movable) {
      bedeutungen.feedback("bedeutungen-unmovable");
      return;
    }
    // Items bewegen
    const items = bedeutungen.moveGetItems();
    let spliceItem = "";
    if (dir === "l") {
      const bd = bedeutungen.akt.bd[items[0]].bd;
      spliceItem = bd[bd.length - 2];
    }
    for (let i = 0, len = items.length; i < len; i++) {
      let idx = items[i];
      // spezielle Operationen
      if (dir === "l") { // nach links
        idx -= i;
        const spliceIdx = bedeutungen.akt.bd[idx].bd.indexOf(spliceItem);
        bedeutungen.akt.bd[idx].bd.splice(spliceIdx, 1);
      } else if (dir === "r") { // nach rechts
        for (let j = 0, len = d.pad.length - 1; j < len; j++) {
          bedeutungen.akt.bd[idx].bd.shift();
        }
        for (let j = d.pad.length - 1; j >= 0; j--) {
          bedeutungen.akt.bd[idx].bd.unshift(d.pad[j]);
        }
      } else if (dir === "d") { // nach unten
        idx -= i;
      }
      // Element kopieren
      const kopie = bedeutungen.makeCopy(idx);
      bedeutungen.akt.bd.splice(idx, 1);
      bedeutungen.akt.bd.splice(idx + d.steps, 0, kopie);
    }
    // Tabelle neu aufbauen
    const aktiv = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
    bedeutungen.konstitZaehlung();
    bedeutungen.aufbauen();
    // Items refokussieren
    if (dir === "l" || dir === "d") { // nach links + nach unten
      bedeutungen.moveAn(aktiv + d.steps - items.length + 1, true);
    } else if (dir === "u") { // nach oben
      bedeutungen.moveAn(aktiv + d.steps, true);
    } else if (dir === "r") { // nach rechts
      bedeutungen.moveAn(aktiv, true);
    }
    // ggf. scrollen
    bedeutungen.moveScroll();
    // Änderungsmarkierung setzen
    bedeutungen.bedeutungenGeaendert(true);
  },

  // Elemente sammeln, die bewegt werden sollen
  moveGetItems () {
    const items = [];
    document.querySelectorAll(".bedeutungen-aktiv, .bedeutungen-affiziert").forEach(function (i) {
      const idx = parseInt(i.dataset.idx, 10);
      items.push(idx);
    });
    return items;
  },

  // nach der Bewegung das Gerüst ggf. an die richtige Stelle scrollen
  moveScroll () {
    const tr = document.querySelector(".bedeutungen-aktiv");
    const quick_height = document.getElementById("quick").offsetHeight;
    const header_height = document.querySelector("body > header").offsetHeight;
    const cont_top = document.getElementById("bedeutungen-cont").offsetTop;
    const tr_top = tr.offsetTop;
    const tr_height = tr.offsetHeight;
    // ggf. hochscrollen
    let pos = cont_top + tr_top - quick_height - 10;
    if (pos <= window.scrollY) {
      window.scrollTo({
        left: 0,
        top: pos,
        behavior: "smooth",
      });
      return;
    }
    // ggf. runterscrollen
    pos = header_height + cont_top + tr_top + tr_height - quick_height;
    if (pos - window.scrollY >= window.innerHeight) {
      window.scrollTo({
        left: 0,
        top: pos - tr_height - 10 - header_height,
        behavior: "smooth",
      });
    }
  },

  // Animation, die anzeigt, dass der Versuch, einen Bedeutungszweig zu bewegen, illegal war
  //   typ = String
  //     (die Klasse der Animation)
  feedback (typ) {
    const tab = document.querySelector("#bedeutungen-cont table");
    tab.classList.remove("bedeutungen-moved", "bedeutungen-unmovable");
    tab.classList.add(typ);
    clearTimeout(bedeutungen.timeout);
    bedeutungen.timeout = setTimeout(function () {
      tab.classList.remove(typ);
    }, 500);
  },

  // erstellt eine unabhängige Kopie eines Datensatzes
  //   idx = Number
  //     (Index des Eintrags, von dem eine Kopie erstellt werden soll)
  //    obj = Object | undefined
  //      (das Objekt, aus dem die Kopie angefertigt werden soll
  makeCopy (idx, obj = bedeutungen.akt) {
    const kopie = { ...obj.bd[idx] };
    // tiefe Kopie des Bedeutungen-Arrays
    kopie.bd = [ ...obj.bd[idx].bd ];
    // tiefe Kopie des Tags-Arrays
    kopie.ta = [];
    for (const o of obj.bd[idx].ta) {
      kopie.ta.push({ ...o });
    }
    // Kopie zurückgeben
    return kopie;
  },

  // Listener für das Löschen-Icon
  //   a = Element
  //     (der Link mit dem Abfalleimer)
  loeschenListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const tr = this.parentNode.parentNode;
      const idx = parseInt(tr.dataset.idx, 10);
      if (!bedeutungen.moveAktiv) {
        aktivieren();
      } else {
        const tr_aktiv = document.querySelector(".bedeutungen-aktiv");
        const idx_aktiv = parseInt(tr_aktiv.dataset.idx, 10);
        if (idx_aktiv !== idx) {
          bedeutungen.moveAus();
          aktivieren();
        } else {
          bedeutungen.loeschenPrep();
        }
      }
      function aktivieren () {
        bedeutungen.moveAn(idx);
        bedeutungen.loeschenPrep();
      }
    });
  },

  // Tastatur-Handler für Entf
  loeschenTastatur () {
    // ggf. abbrechen
    if (!bedeutungen.moveAktiv) {
      return;
    }
    bedeutungen.loeschenPrep();
  },

  // benötigte Werte ermitteln, bevor das Löschen angestoßen wird
  loeschenPrep () {
    // Verschmelzungsmarkierung ggf. entfernen
    document.querySelectorAll(".bedeutungen-verschmelzen").forEach(function (i) {
      i.classList.remove("bedeutungen-verschmelzen");
    });
    // Löschen anstoßen
    const tr = document.querySelector(".bedeutungen-aktiv");
    const idx = parseInt(tr.dataset.idx, 10);
    setTimeout(function () {
      // ohne Timeout erhält das Confirm-Fenster nicht in jdem Fall den Fokus
      bedeutungen.loeschen(idx);
    }, 1);
  },

  // Löschen auf Nachfrage durchführen
  //   idx = Number
  //     (Index der Bedeutung)
  loeschen (idx) {
    const bd = bedeutungen.akt.bd[idx].bd[bedeutungen.akt.bd[idx].bd.length - 1];
    const zaehlung = bedeutungen.zaehlungTief(idx);
    for (let i = 0, len = zaehlung.length; i < len; i++) {
      let zaehlungTief = "";
      if (i > 0) {
        zaehlungTief = " zaehlung-tief";
      }
      zaehlung[i] = `<b class="zaehlung${zaehlungTief}">${zaehlung[i]}</b>`;
    }
    dialog.oeffnen({
      typ: "confirm",
      text: `Soll die markierte Bedeutung\n<p class="bedeutungen-dialog">${zaehlung.join("")}${bd}</p>\n${document.querySelector(".bedeutungen-affiziert") ? "mit all ihren Unterbedeutungen " : ""}wirklich gelöscht werden?`,
      callback: () => {
        if (dialog.antwort) {
          // Löschen für Karteikarten vormerken
          const items = bedeutungen.moveGetItems();
          for (let i = 0, len = items.length; i < len; i++) {
            bedeutungen.aendernFuellen({
              del: true,
              id: bedeutungen.akt.bd[items[i]].id,
            });
          }
          // Löschen im Gerüst ausführen
          bedeutungen.loeschenAusfuehren(items);
        } else {
          document.querySelector(".bedeutungen-aktiv").firstChild.firstChild.focus();
        }
      },
    });
  },

  // markierte Einträge werden gelöscht
  // (wird auch für das Verschmelzen genutzt, darum ausgelagert)
  //   items = Array
  //     (Liste mit Indizes, die gelöscht werden sollen)
  loeschenAusfuehren (items) {
    for (let i = items.length - 1; i >= 0; i--) {
      bedeutungen.akt.bd.splice(items[i], 1);
    }
    bedeutungen.konstitZaehlung();
    bedeutungen.aufbauen();
    bedeutungen.bedeutungenGeaendert(true);
  },

  // Listener für das Verschmelzen-Icon
  //   a = Element
  //     (der Link mit dem Merge-Icon)
  verschmelzenListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const tr = this.parentNode.parentNode;
      const idx = parseInt(tr.dataset.idx, 10);
      // Was muss gemacht werden?
      const aktiv = document.querySelector(".bedeutungen-verschmelzen") !== null;
      if (aktiv && tr.classList.contains("bedeutungen-aktiv")) { // Verschieben deaktivieren
        bedeutungen.moveAus();
        return;
      } else if (aktiv && !tr.classList.contains("bedeutungen-affiziert")) { // Verschiebeziel gewählt
        bedeutungen.verschmelzen(idx);
        return;
      }
      // Bedeutungszweig aktivieren
      if (!bedeutungen.moveAktiv) {
        bedeutungen.moveAn(idx);
      } else {
        const tr_aktiv = document.querySelector(".bedeutungen-aktiv");
        const idx_aktiv = parseInt(tr_aktiv.dataset.idx, 10);
        if (idx_aktiv !== idx) {
          bedeutungen.moveAus();
          bedeutungen.moveAn(idx);
        }
      }
      document.querySelectorAll(".bedeutungen-aktiv, .bedeutungen-affiziert").forEach(function (i) {
        i.classList.add("bedeutungen-verschmelzen");
      });
    });
  },

  // Verschmelzen durchführen
  //   idxZiel = Number
  //     (Index-Nummer der Bedeutung, in die hinein der markierte Bedeutungszweig geschoben wird)
  verschmelzen (idxZiel) {
    const idx = parseInt(document.querySelector(".bedeutungen-aktiv").dataset.idx, 10);
    const zaehlungIdx = bedeutungen.zaehlungTief(idx);
    for (let i = 0, len = zaehlungIdx.length; i < len; i++) {
      let zaehlungTief = "";
      if (i > 0) {
        zaehlungTief = " zaehlung-tief";
      }
      zaehlungIdx[i] = `<b class="zaehlung${zaehlungTief}">${zaehlungIdx[i]}</b>`;
    }
    const bdIdx = bedeutungen.akt.bd[idx].bd[bedeutungen.akt.bd[idx].bd.length - 1];
    const zaehlungIdxZiel = bedeutungen.zaehlungTief(idxZiel);
    for (let i = 0, len = zaehlungIdxZiel.length; i < len; i++) {
      let zaehlungTief = "";
      if (i > 0) {
        zaehlungTief = " zaehlung-tief";
      }
      zaehlungIdxZiel[i] = `<b class="zaehlung${zaehlungTief}">${zaehlungIdxZiel[i]}</b>`;
    }
    const bdIdxZiel = bedeutungen.akt.bd[idxZiel].bd[bedeutungen.akt.bd[idxZiel].bd.length - 1];
    dialog.oeffnen({
      typ: "confirm",
      text: `Soll die markierte Bedeutung\n<p class="bedeutungen-dialog">${zaehlungIdx.join("")}${bdIdx}</p>\n${document.querySelector(".bedeutungen-affiziert") ? "mit all ihren Unterbedeutungen " : ""}wirklich mit der Bedeutung\n<p class="bedeutungen-dialog">${zaehlungIdxZiel.join("")}${bdIdxZiel}</p>\nverschmolzen werden?`,
      callback: () => {
        if (dialog.antwort) {
          const id = bedeutungen.akt.bd[idxZiel].id;
          // Verschmelzen für Karteikarten vormerken
          const items = bedeutungen.moveGetItems();
          for (let i = 0, len = items.length; i < len; i++) {
            bedeutungen.aendernFuellen({
              merge: true,
              id: bedeutungen.akt.bd[items[i]].id,
              idN: id,
            });
          }
          // verschmolzene Bedeutungen löschen
          bedeutungen.loeschenAusfuehren(items);
          // Verschmelzen visualisieren
          for (let i = 0, len = bedeutungen.akt.bd.length; i < len; i++) {
            if (bedeutungen.akt.bd[i].id === id) {
              bedeutungen.moveAn(i, true);
              break;
            }
          }
        } else {
          document.querySelector(".bedeutungen-aktiv").childNodes[2].firstChild.focus();
        }
      },
    });
  },

  // Listener zum Öffnen des Taggers
  //   td = Element
  //     (die Tabellenzelle, über die der Tagger geöffnet werden soll)
  openTagger (td) {
    td.addEventListener("click", function () {
      // Zeile aktivieren
      bedeutungen.editFeldWeg();
      bedeutungen.moveAus();
      bedeutungen.editZeile(null);
      // Tagger öffnen
      tagger.limit = [];
      const idx = this.parentNode.dataset.idx;
      tagger.oeffnen(idx);
    });
  },

  // Link zum Öffnen des Taggers erstellen
  //   zelle = Element
  //     (die Tabellenzelle für die Tags);
  linkTagger (zelle) {
    // Tagger-Link wurde schon erstellt
    // (die Funktion macht nach dem Schließen des Tag-Fensters sonst Probleme)
    if (zelle.firstChild.nodeType === 1 &&
        zelle.firstChild.nodeName === "A") {
      return;
    }
    // ggf. altes Edit-Feld löschen
    bedeutungen.editFeldWeg();
    // Zeile und Container vorbereiten
    bedeutungen.moveAus();
    bedeutungen.editZeile(zelle, true);
    // Link zum Tagger einfügen
    const a = document.createElement("a");
    a.href = "#";
    a.id = "bedeutungen-tagger-link";
    a.innerHTML = zelle.innerHTML;
    zelle.replaceChildren();
    zelle.appendChild(a);
    a.focus();
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      tagger.limit = [];
      const idx = this.parentNode.parentNode.dataset.idx;
      tagger.oeffnen(idx);
    });
    a.addEventListener("blur", function () {
      bedeutungen.editEintragen(this.parentNode);
    });
  },

  // Listener für den Container, in dem ein Edit-Feld erstellt werden soll
  //   ele = Element
  //     (Element, in dem das Edit-Feld erstellt werden soll)
  editContListener (ele) {
    ele.addEventListener("click", function () {
      // Ist das Edit-Feld schon in diesem Element?
      if (this.firstChild.id) {
        return;
      }
      bedeutungen.editErstellen(this);
    });
  },

  // Edit-Feld erstellen
  //   ele = Element
  //     (Element, in dem das Edit-Feld erstellt werden soll)
  editErstellen (ele) {
    // ggf. altes Edit-Feld löschen
    bedeutungen.editFeldWeg();
    // Zeile und Container vorbereiten
    bedeutungen.moveAus();
    bedeutungen.editZeile(ele, true);
    ele.classList.remove("leer");
    // Edit-Feld erzeugen und einhängen
    const idx = bedeutungen.editGetIdx(ele);
    const feld = ele.dataset.feld;
    const z = bedeutungen.akt.bd[idx][feld];
    const edit = document.createElement("span");
    edit.setAttribute("contenteditable", "true");
    edit.id = "bedeutungen-edit";
    if (Array.isArray(z)) {
      edit.innerHTML = z[z.length - 1];
    } else {
      edit.textContent = z;
      helfer.editNoFormat(edit);
    }
    ele.replaceChildren();
    ele.appendChild(edit);
    // für Bedeutungen-Edit Toolbox erzeugen
    if (Array.isArray(z)) {
      clearTimeout(bedeutungen.ergaenzenToolsTimeout);
      bedeutungen.editTools(true, edit);
    }
    // Listener anhängen
    helfer.editPaste(edit);
    edit.addEventListener("input", function () {
      bedeutungen.changed(this);
    });
    bedeutungen.editListener(edit);
    // Caret an das Ende des Feldes setzen
    if (!edit.textContent) {
      edit.focus();
    } else {
      const sel = window.getSelection();
      let knoten = edit.lastChild;
      while (knoten.hasChildNodes()) {
        knoten = knoten.lastChild;
      }
      sel.collapse(knoten, knoten.textContent.length);
    }
  },

  // Toolbox einblenden und positionieren oder ausblenden
  //   an = Boolean
  //     (Toolbox an- oder ausstellen)
  //   ele = Element | undefined
  //     (ggf. das Element, an dem sich die Positionierung ausrichten soll)
  editTools (an, ele) {
    if (!an) {
      const tools = document.getElementById("bedeutungen-tools");
      if (tools) {
        tools.parentNode.removeChild(tools);
      }
      return;
    }
    const div = document.createElement("div");
    div.id = "bedeutungen-tools";
    const tools = [
      {
        cl: "icon-tools-save",
        fun: "save",
        title: "Speichern (Enter)",
      },
      {
        cl: "icon-tools-bold",
        fun: "bold",
        title: `Fetten (${tastatur.shortcutsTextAktuell("Strg")} + B)`,
        blockStart: true,
      },
      {
        cl: "icon-tools-italic",
        fun: "italic",
        title: `Kursivieren (${tastatur.shortcutsTextAktuell("Strg")} + I)`,
      },
      {
        cl: "icon-tools-underline",
        fun: "undeline",
        title: `Unterstreichen (${tastatur.shortcutsTextAktuell("Strg")} + U)`,
      },
      {
        cl: "icon-bedeutung",
        fun: "paraphrase",
        title: "Paraphrase",
        blockStart: true,
      },
    ];
    for (let i = 0, len = tools.length; i < len; i++) {
      const a = document.createElement("a");
      a.classList.add("icon-link", tools[i].cl);
      if (tools[i].blockStart) {
        a.classList.add("block-start");
      }
      a.dataset.fun = tools[i].fun;
      a.href = "#";
      a.title = tools[i].title;
      bedeutungen.editToolsExec(a);
      div.appendChild(a);
    }
    // Elternknoten finden
    let parent = ele.parentNode;
    while (!/^(P|TD)$/.test(parent.nodeName)) {
      parent = parent.parentNode;
    }
    if (parent.nodeName === "TD") {
      if (Object.keys(bedeutungen.data.gr).length === 1 &&
          !bedeutungen.akt.bd.length) {
        div.classList.add("neue-bedeutung-leer");
      } else {
        div.classList.add("neue-bedeutung");
      }
    }
    parent.appendChild(div);
    // Tooltip initialisieren
    tooltip.init(div);
  },

  // Funktion der Text-Tools auf das Content-Feld anwenden
  //   a = Element
  //     (der Tools-Link, auf den geklickt wurde)
  editToolsExec (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const feld = this.parentNode.parentNode.querySelector("[contenteditable]");
      const funktion = this.dataset.fun;
      feld.focus();
      if (funktion === "save") {
        feld.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      } else if (funktion === "paraphrase") {
        notizen.toolsMark({ cl: "paraphrase" });
      } else {
        document.execCommand(funktion);
      }
    });
  },

  // Listener für ein Edit-Feld
  //   edit = Element
  //     (das Edit-Feld)
  editListener (edit) {
    edit.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Escape") {
        evt.stopPropagation();
        bedeutungen.editEintragen(this.parentNode);
        bedeutungen.editTools(false);
        return;
      } else if (evt.key !== "Enter") {
        return;
      }
      evt.preventDefault();
      // Wert aus dem Edit-Feld ermitteln
      const idx = bedeutungen.editGetIdx(this);
      const feld = this.parentNode.dataset.feld;
      let wert = "";
      if (feld === "bd") {
        wert = bedeutungen.editFormat(this.innerHTML);
      } else {
        wert = helfer.textTrim(this.textContent.replace(/[<>]+/g, ""), true);
      }
      // Ist der Wert okay?
      if (feld === "bd") {
        const bdFehler = bedeutungen.editBdTest({ wert, idx });
        if (bdFehler) {
          dialog.oeffnen({
            typ: "alert",
            text: bdFehler,
            callback: () => {
              this.focus();
            },
          });
          return;
        }
      } else if (feld === "al") {
        for (let i = 0, len = bedeutungen.akt.bd.length; i < len; i++) {
          if (!wert) {
            break;
          }
          // Alias schon vergeben oder identisch mit einer Bedeutung?
          if (bedeutungen.akt.bd[i].al === wert) {
            if (i === idx) { // sonst kommt eine Meldung, dass das Alias schon vergeben wurde
              continue;
            }
            alias_schon_vergeben(this, "alias");
            return;
          }
          const bdTextRein = bedeutungen.akt.bd[i].bd[bedeutungen.akt.bd[i].bd.length - 1].replace(/<.+?>/g, "");
          if (bdTextRein === wert) {
            if (i === idx) {
              alias_schon_vergeben(this, "alias_identisch");
            } else {
              alias_schon_vergeben(this, "bedeutung");
            }
            return;
          }
        }
      }
      // Wert übernehmen
      const z = bedeutungen.akt.bd[idx];
      if (feld === "bd") {
        const ebene = z.bd.length;
        const idxChanged = ebene - 1;
        z.bd[idxChanged] = wert;
        // alle untergeordneten Bedeutungen müssen ebenfalls in diesem Index geändert werden
        for (let i = idx + 1, len = bedeutungen.akt.bd.length; i < len; i++) {
          // Das war's! Alle Unterbedeutungen wurden geändert
          if (bedeutungen.akt.bd[i].bd.length <= ebene) {
            break;
          }
          // String im Slot anpassen
          bedeutungen.akt.bd[i].bd[idxChanged] = wert;
        }
      } else {
        z[feld] = wert;
      }
      // visualisieren, dass sich was getan hat
      bedeutungen.changed(this);
      this.classList.add("bedeutungen-saved");
      clearTimeout(bedeutungen.timeout);
      bedeutungen.timeout = setTimeout(() => {
        this.classList.remove("bedeutungen-saved");
      }, 500);
      // Änderungsmarkierung setzen
      bedeutungen.bedeutungenGeaendert(true);
      // Alias schon vergeben
      function alias_schon_vergeben (edit, typ) {
        let text = "";
        if (typ === "alias") {
          text = `Das Alias\n<p class="bedeutungen-dialog">${wert}</p>\nwurde schon vergeben.`;
        } else if (typ === "alias_identisch") {
          text = `Das Alias\n<p class="bedeutungen-dialog">${wert}</p>\nwäre identisch mit der Bedeutung, für die es stehen soll.`;
        } else {
          text = `Das Alias\n<p class="bedeutungen-dialog">${wert}</p>\nwäre identisch mit einer Bedeutung.`;
        }
        dialog.oeffnen({
          typ: "alert",
          text,
          callback: () => {
            helfer.auswahl(edit);
          },
        });
      }
    });
  },

  // Testet, ob die eingegebene Bedeutung akzeptiert werden kann
  //   wert = String
  //     (die Bedeutung; kann HTML-Tags enthalten)
  //   idx = Number
  //     (die Position der Bedeutung im Gerüst)
  //   ebene = Number | undefined
  //     (die Ebene, in der getestet werden soll
  editBdTest ({ wert, idx, ebene }) {
    const wertTest = helfer.textTrim(wert.replace(/<.+?>/g, ""), true);
    if (!ebene) {
      ebene = bedeutungen.akt.bd[idx].bd.length;
    }
    // Bedeutung eingegeben?
    if (!wertTest) {
      return "Sie haben keine Bedeutung eingegeben.";
    }
    // Bedeutung identisch mit einem Alias?
    for (const bd of bedeutungen.akt.bd) {
      if (bd.al === wertTest) {
        return `Die Bedeutung\n<p class="bedeutungen-dialog">${wert}</p>\nwäre identisch mit einem Alias.`;
      }
    }
    // Bedeutung identische mit einer Bedeutung auf derselben Ebene desselben Bedeutungszweigs?
    let start = idx;
    if (ebene === 1) {
      start = 0;
    } else if (idx > 0) {
      let pos = idx - 1;
      while (bedeutungen.akt.bd[pos].bd.length >= ebene) {
        start = pos;
        pos--;
      }
      start = pos + 1;
    }
    for (let i = start, len = bedeutungen.akt.bd.length; i < len; i++) {
      const ebeneTmp = bedeutungen.akt.bd[i].bd.length;
      if (i === idx || ebeneTmp > ebene) { // die Bedeutung, die geändert wird, und Unterbedeutungen nicht überprüfen
        continue;
      }
      if (ebeneTmp < ebene) { // hier beginnt ein neuer Zweig
        break;
      }
      const wertVergleich = helfer.textTrim(bedeutungen.akt.bd[i].bd[ebene - 1].replace(/<.+?>/g, ""), true);
      if (wertVergleich === wertTest) {
        return `Die Bedeutung\n<p class="bedeutungen-dialog">${wert}</p>\nexistiert bereits auf Bedeutungsebene ${ebene}${ebene > 1 ? " des aktuellen Bedeutungszweigs" : ""}.`;
      }
    }
    // keine Fehler gefunden
    return "";
  },

  // altes Eingabefeld ggf. entfernen
  editFeldWeg () {
    const edit = document.getElementById("bedeutungen-edit");
    if (edit) {
      bedeutungen.editEintragen(edit.parentNode);
    }
    bedeutungen.editTools(false);
  },

  // gespeicherten Wert des edierten Feldes in die übergebene Zelle eintragen
  //   ele = Element
  //     (Element, in dem das Edit-Feld steht)
  editEintragen (ele) {
    const felder = {
      ta: "Tags",
      al: "Alias",
    };
    const idx = bedeutungen.editGetIdx(ele);
    const feld = ele.dataset.feld;
    const z = bedeutungen.akt.bd[idx][feld];
    let wert = "";
    if (Array.isArray(z)) {
      if (feld === "bd") {
        wert = z[z.length - 1];
      } else if (feld === "ta") {
        if (!z.length) {
          wert = felder[feld];
          ele.classList.add("leer");
        } else {
          wert = ele.firstChild.innerHTML;
          ele.classList.remove("leer");
        }
      }
    } else {
      wert = z;
      if (!wert) { // kein Wert gespeichert
        wert = felder[feld];
        ele.classList.add("leer");
      } else {
        ele.classList.remove("leer");
      }
    }
    ele.replaceChildren();
    ele.innerHTML = wert;
    bedeutungen.editZeile(ele, false);
  },

  // Index des betreffenden Elemenets suchen
  //   ele = Element
  //     (das Edit-Feld, zu dem der Index gesucht werden soll)
  editGetIdx (ele) {
    while (!ele.dataset.idx) {
      ele = ele.parentNode;
    }
    return parseInt(ele.dataset.idx, 10);
  },

  // Zeile markieren/demarkieren, in der ein Edit-Feld geöffnet/geschlossen wurde
  //   ele = Element
  //     (Element, das zum Edieren fokussiert wird)
  //   edit = Boolean
  //     (Zeile wird ediert)
  editZeile (ele, edit) {
    // es kann sein, dass noch eine andere Zeile aktiv ist
    // (bes. wenn der Tagger geöffnet war)
    const editAlt = document.querySelector(".bedeutungen-edit");
    if (editAlt) {
      editAlt.classList.remove("bedeutungen-edit");
    }
    // nur ausschalten
    if (!ele) {
      return;
    }
    // aktuelle Zeile aktivieren/deaktivieren
    let tr = ele.parentNode;
    while (tr.nodeName !== "TR") {
      tr = tr.parentNode;
    }
    if (edit) {
      tr.classList.add("bedeutungen-edit");
    } else {
      tr.classList.remove("bedeutungen-edit");
    }
  },

  // korrigiert den Inhalt eines Edit-Feldes formal
  //   cont = String
  //     (der Text des Edit-Feldes; kann HTML-Tags enthalten)
  editFormat (cont) {
    cont = cont.replace(/&nbsp;/g, " ");
    cont = cont.replace(/<br>|\sstyle=".+?"/g, "");
    cont = helfer.textTrim(cont, true);
    return cont;
  },

  // überprüfen, ob der Inhalt des Feldes geändert wurde
  //   ele = Element
  //     (das Edit-Feld, auf dessen Veränderungen geachtet werden soll)
  changed (ele) {
    // Varialben auslesen
    const idx = parseInt(document.querySelector(".bedeutungen-edit").dataset.idx, 10);
    const feld = ele.parentNode.dataset.feld;
    let wert = "";
    if (feld === "bd") {
      wert = helfer.textTrim(ele.innerHTML, true);
    } else {
      wert = helfer.textTrim(ele.textContent, true);
    }
    // Wert aus Datenobjekt auslesen
    const ds = bedeutungen.akt.bd[idx];
    let wert_ds = "";
    if (Array.isArray(ds[feld])) {
      wert_ds = ds[feld][ds[feld].length - 1];
    } else {
      wert_ds = ds[feld];
    }
    // Markieren setzen/entfernen
    if (wert !== wert_ds) {
      ele.classList.add("bedeutungen-changed");
    } else {
      ele.classList.remove("bedeutungen-changed");
    }
  },

  // speichert den Verweis auf den Timeout zum Ausblenden
  ergaenzenToolsTimeout: null,

  // Bedeutung ergänzen
  //   span = Element
  //     (das Edit-Feld, über das eine Bedeutung ergänzt werden kann)
  ergaenzen (span) {
    span.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Escape") { // wegen der Einheitlichkeit mit anderen Edit-Feldern
        evt.stopPropagation();
        this.blur();
        return;
      }
      if (evt.key !== "Enter") {
        return;
      }
      // Bedeutung hinzufügen
      evt.preventDefault();
      const bd = bedeutungen.editFormat(this.innerHTML);
      // Ist es erlaubt diese Bedeutung so hinzuzufügen?
      const bdFehler = bedeutungen.editBdTest({
        wert: bd,
        idx: -1, // damit er bei 0 startet, die 1. Bedeutung aber nicht überspringt
        ebene: 1,
      });
      if (bdFehler) {
        dialog.oeffnen({
          typ: "alert",
          text: bdFehler,
          callback: () => {
            helfer.auswahl(this);
          },
        });
        return;
      }
      // Bedeutung ergänzen, Gerüst neu aufbauen, Bedeutung aktivieren
      bedeutungen.akt.bd.push(bedeutungen.konstitBedeutung([ bd ]));
      bedeutungen.konstitZaehlung();
      bedeutungen.aufbauen();
      bedeutungen.moveAn(bedeutungen.akt.bd.length - 1, true);
      bedeutungen.bedeutungenGeaendert(true);
    });
    span.addEventListener("focus", function () {
      bedeutungen.moveAus();
      bedeutungen.editFeldWeg();
      clearTimeout(bedeutungen.ergaenzenToolsTimeout);
      bedeutungen.editTools(true, this);
      if (this.classList.contains("leer")) {
        this.classList.remove("leer");
        this.textContent = "";
      }
    });
    span.addEventListener("blur", function () {
      bedeutungen.ergaenzenToolsTimeout = setTimeout(function () {
        bedeutungen.editTools(false);
      }, 250); // ohne Timeout könnte man nicht raufklicken, weil die Toolbox beim Blur sofort verschwindet
      if (!this.textContent) {
        this.classList.add("leer");
        this.textContent = "neue Bedeutung";
      }
    });
  },

  // Änderungen speichern
  speichern () {
    // keine Änderungen
    if (!bedeutungen.geaendert) {
      schliessen();
      return false;
    }
    // Zählung der Bedeutungsgerüst-IDs zurücksetzen
    bedeutungenGerueste.nextId = 0;
    // Änderungen in Karteikarten anwenden
    bedeutungen.aendernAnwenden();
    // Kopieren: bedeutungen.data => data.bd
    data.bd = structuredClone(bedeutungen.data);
    // Bedeutungsgerüst-Fenster mit neuen Daten versorgen
    bedeutungenWin.daten();
    // Änderungsmarkierung setzen/zurücksetzen und schließen
    kartei.karteiGeaendert(true);
    bedeutungen.bedeutungenGeaendert(false);
    schliessen();
    // Speichern erfolgreich
    return true;
    // Schließen-Funktion
    function schliessen () {
      if (optionen.data.einstellungen["bedeutungen-schliessen"]) {
        bedeutungen.schliessen();
      }
    }
  },

  // speichert eine Änderungsliste mit Ersetzungen/Streichungen, die beim Speichern
  // in den Karteikarten angewendet werden sollen
  aendern: [],

  // Änderungsliste füllen
  aendernFuellen ({
    del = false,
    merge = false,
    add = false,
    wi = false,
    gr = bedeutungen.data.gn,
    grN = "",
    id = 0,
    idN = 0,
  }) {
    bedeutungen.aendern.push({ del, merge, add, wi, gr, grN, id, idN });
  },

  // Änderungsliste abarbeiten
  aendernAnwenden () {
    const a = bedeutungen.aendern;
    for (let i = 0, len = a.length; i < len; i++) {
      if (a[i].wi) { // Wortinfos zum gelöschten Gerüst löschen
        const arr = [];
        for (const wi of data.rd.wi) {
          if (wi.gn !== a[i].gr) {
            arr.push({ ...wi });
          }
        }
        data.rd.wi = arr;
        continue;
      }
      for (const val of Object.values(data.ka)) {
        const { bd } = val;
        for (let j = bd.length - 1; j >= 0; j--) {
          if (bd[j].gr === a[i].gr && bd[j].id === a[i].id) {
            if (a[i].del) { // Löschen
              bd.splice(j, 1);
            } else if (a[i].merge) { // Verschmelzen
              if (bedeutungen.schonVorhanden({
                bd,
                id: a[i].idN,
                gr: bedeutungen.data.gn,
              })[0]) {
                bd.splice(j, 1);
              } else {
                bd[j].id = a[i].idN;
              }
            } else if (a[i].add) { // Hinzufügen
              bd.push({
                gr: a[i].grN,
                id: a[i].idN,
              });
            }
          }
        }
      }
    }
    // Änderungsliste zurücksetzen
    bedeutungen.aendern = [];
  },

  // ist die Bedeutung, mit der verschmolzen wird, in einer Karte schon vorhanden?
  // (wird auch in filter.js und kopieren.js benutzt, um zu gucken,
  // ob eine Karte eine Bedeutung bereits enthält)
  //   bd = Array
  //     (in den Slots Objects mit den Bedeutungen [{}.id und {}.gr])
  //   id = String
  //     (die ID der Bedeutung)
  //   gr = String
  //     (die ID des Bedeutungsgerüsts)
  schonVorhanden ({ bd, gr, id }) {
    for (let i = 0, len = bd.length; i < len; i++) {
      if (bd[i].gr === gr && bd[i].id === id) {
        return [ true, i ];
      }
    }
    return [ false, -1 ];
  },

  // Bedeutungen schließen und zur Belegliste wechseln
  schliessen () {
    speichern.checkInit(() => {
      bedeutungen.aendern = [];
      liste.status(true);
      liste.wechseln();
    });
  },

  // Bedeutungen wurden geändert und noch nicht gespeichert
  geaendert: false,

  // Anzeigen, dass die Bedeutungen geändert wurden
  //   geaendert = Boolean
  bedeutungenGeaendert (geaendert) {
    bedeutungen.geaendert = geaendert;
    helfer.geaendert();
    const asterisk = document.querySelector("#bedeutungen-cont h2 span");
    if (geaendert) {
      asterisk.classList.remove("aus");
    } else {
      asterisk.classList.add("aus");
    }
  },

  // Bedeutungsgerüst an das Redaktionssystem schicken (Listener)
  //   icon = Element
  //     (das XML-Icon)
  xml ({ icon }) {
    icon.addEventListener("click", evt => {
      evt.preventDefault();
      bedeutungen.xmlDatensatz();
    });
  },

  // Bedeutungsgerüst transformieren und an das Redaktionssystem schicken
  xmlDatensatz () {
    // Lesarten auslesen
    const lesarten = [];
    for (let i = 0, len = bedeutungen.akt.bd.length; i < len; i++) {
      const lesart = {
        ebene: -1,
        n: "",
        id: "",
        dia: [],
        txt: "",
      };
      // Zählzeichen + ID
      const bd = bedeutungen.akt.bd[i];
      let zaId = bd.za;
      if (bd.bd.length > 1) {
        let j = i;
        let bd = bedeutungen.akt.bd[j];
        let ebene = bd.bd.length;
        do {
          j--;
          bd = bedeutungen.akt.bd[j];
          if (bd.bd.length < ebene) {
            ebene = bd.bd.length;
            zaId = bd.za + zaId;
          }
        } while (bd.bd.length > 1);
      }
      lesart.n = bd.za;
      lesart.id = zaId;
      // Diasystematik
      for (const t of bd.ta) {
        const tt = optionen.tagsTypen[t.ty];
        if (!tt) {
          continue;
        }
        lesart.dia.push(`<${tt[0]}>${optionen.data.tags[t.ty].data[t.id].name}</${tt[0]}>`);
      }
      // Text
      let text = bd.bd[bd.bd.length - 1];
      text = text.replace(/<mark class="paraphrase">(.+?)<\/mark>/g, (m, p1) => `<Paraphrase>${p1}</Paraphrase>`);
      text = text.replace(/<i>(.+?)<\/i>/g, (m, p1) => `<erwaehntes_Zeichen>${p1}</erwaehntes_Zeichen>`);
      text = text.replace(/<b>(.+?)<\/b>/g, (m, p1) => `<Hervorhebung Stil="#b">${p1}</Hervorhebung>`);
      text = text.replace(/<u>(.+?)<\/u>/g, (m, p1) => `<Hervorhebung Stil="#u">${p1}</Hervorhebung>`);
      text = xml.mergeHervorhebungen({ text });
      text = helfer.typographie(text);
      text = helferXml.abbrTagger({ text });
      if (!/<Paraphrase>/.test(text)) { // gesamter Text ist Paraphrase
        text = `<Paraphrase>${text}</Paraphrase>`;
      }
      lesart.txt = text;
      // Ebene eintragen...
      lesart.ebene = bd.bd.length;
      // ... und fertig!
      lesarten.push(lesart);
    }
    // XML erstellen
    let xl = "<Lesarten>\n\t<Nachweise/>";
    let ebeneZuvor = 1;
    for (const i of lesarten) {
      const t = "\n" + "\t".repeat(i.ebene);
      let la = `${t}<Lesart n="${i.n}" xml:id="l${bedeutungen.data.gn}-${i.id}">`;
      if (i.dia.length) {
        la += `${t}\t<Diasystematik>`;
        for (const d of i.dia) {
          la += `${t}\t\t${d}`;
        }
        la += `${t}\t</Diasystematik>`;
      } else {
        la += `${t}\t<Diasystematik/>`;
      }
      la += `${t}\t${i.txt}`;
      la += `${t}</Lesart>`;
      if (i.ebene > ebeneZuvor) {
        xl = xl.replace(/[\t\n]+<\/Lesart>$/, "");
        xl += la;
        ebeneZuvor = i.ebene;
      } else if (i.ebene < ebeneZuvor) {
        for (let j = 0, len = ebeneZuvor - i.ebene; j < len; j++) {
          xl += `\n${"\t".repeat(i.ebene - 1 + len - j)}</Lesart>`;
        }
        xl += la;
        ebeneZuvor = i.ebene;
      } else {
        xl += la;
      }
    }
    while (ebeneZuvor > 1) {
      xl += `\n${"\t".repeat(ebeneZuvor - 1)}</Lesart>`;
      ebeneZuvor--;
    }
    xl += "\n</Lesarten>";
    // Tabs zu Spaces
    xl = xl.replace(/\t/g, "  ");
    // XML-Datensatz erzeugen und an das Redaktionssystem schicken
    const xmlDatensatz = {
      key: "bg",
      ds: {
        gn: bedeutungen.data.gn,
        la: "",
        nw: [],
        tf: [],
        xl,
      },
    };
    redXml.datensatz({ xmlDatensatz });
  },

  // überprüft, ob das Bedeutungsgerüst beim Umbenennen einer Bedeutung korrumpiert wurde
  // (der Fehler war von 0.10.0 [2019-07-02] an da und wurde mit 0.13.2 [2019-07-30] behoben)
  korruptionCheck () {
    let korrupt = false;
    forX: for (const val of Object.values(data.bd.gr)) {
      const { bd } = val;
      for (let i = 1, len = bd.length; i < len; i++) {
        if (bd[i].bd.length === 1) { // die oberste Ebene *darf* nicht überprüft werden
          continue;
        }
        const bdVor = bd[i - 1].bd;
        for (let j = 0, len = bd[i].bd.length; j < len - 1; j++) { // der letzte Slot *darf* nicht überprüft werden
          if (bd[i].bd[j] !== bdVor[j]) {
            korrupt = true;
            break forX;
          }
        }
      }
    }
    // Bedeutungsgerüst ist nicht korrupt
    if (!korrupt) {
      return;
    }
    // Bedeutungsgüerst ist korrupt
    let num = "Das Bedeutungsgerüst";
    if (Object.keys(data.bd.gr).length > 1) {
      num = "Mindestens eines der Bedeutungsgerüste";
    }
    dialog.oeffnen({
      typ: "confirm",
      text: `${num} dieser Kartei ist korrupt.\nSoll es automatisch repariert werden?`,
      callback: () => {
        if (dialog.antwort) {
          bedeutungen.korruptionRepair();
        }
      },
    });
  },

  // repariert ein korruptes Bedeutungsgerüst
  korruptionRepair () {
    for (const val of Object.values(data.bd.gr)) {
      const { bd } = val;
      for (let i = 1, len = bd.length; i < len; i++) {
        if (bd[i].bd.length === 1) { // die oberste Ebene *darf* nicht geändert werden
          continue;
        }
        const bdVor = bd[i - 1].bd;
        for (let j = 0, len = bd[i].bd.length; j < len - 1; j++) { // der letzte Slot *darf* nicht geändert werden
          if (bd[i].bd[j] !== bdVor[j]) {
            bd[i].bd[j] = bdVor[j];
          }
        }
      }
    }
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
    // Liste + Filter neu aufbauen
    liste.aufbauen(true);
    // Rückmeldung geben
    let num = "Das Bedeutungsgerüst wurde";
    if (Object.keys(data.bd.gr).length > 1) {
      num = "Die Bedeutungsgerüste wurden";
    }
    dialog.oeffnen({
      typ: "alert",
      text: `${num} repariert.\nBitte überprüfen Sie vor dem Speichern der Kartei das Ergebnis.`,
    });
  },
};
