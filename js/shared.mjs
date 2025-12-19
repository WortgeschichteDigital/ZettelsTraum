
import dd from "./dd.mjs";
import dialog from "./dialog.mjs";
import overlay from "./overlay.mjs";
import tooltip from "./tooltip.mjs";

export { shared as default };

const shared = {
  // Zwischenspeicher für den Timeout der Animation
  animationTimeout: null,

  // Overlay-Animation, die anzeigt, was gerade geschehen ist
  // (Kopier-Aktion oder Wrap der Suchleiste)
  //   ziel = string
  //     ("liste" | "zwischenablage" | "wrap" | "duplikat" |
  //     "gespeichert" | "einfuegen" | "xml")
  //   belege = number
  //     (Anzahl der Belege, die kopiert wurden)
  animation (ziel, belege = 0) {
    // ggf. Timeout clearen
    clearTimeout(shared.animationTimeout);
    // Element erzeugen oder ansprechen
    let div = null;
    if (document.getElementById("animation")) {
      div = document.getElementById("animation");
    } else {
      div = document.createElement("div");
      div.id = "animation";
      div.style.zIndex = ++overlay.zIndex;
    }
    // Element füllen
    div.replaceChildren();
    const img = document.createElement("img");
    div.appendChild(img);
    img.width = "96";
    img.height = "96";
    let cd = "";
    if (/bedvis|changelog|fehlerlog|dokumentation|handbuch|xml/.test(dd.win.typ)) {
      cd = "../";
    }
    if (ziel === "zwischenablage") {
      img.src = `${cd}img/einfuegen-pfeil-blau-96.svg`;
    } else if (ziel === "liste") {
      img.src = `${cd}img/kopieren-blau-96.svg`;
      const span = document.createElement("span");
      div.appendChild(span);
      span.textContent = belege;
    } else if (ziel === "wrap") {
      img.src = `${cd}img/pfeil-kreis-blau-96.svg`;
    } else if (ziel === "duplikat") {
      img.src = `${cd}img/duplizieren-blau-96.svg`;
    } else if (ziel === "gespeichert") {
      img.src = `${cd}img/speichern-blau-96.svg`;
    } else if (ziel === "einfuegen") {
      img.src = `${cd}img/einfuegen-blau-96.svg`;
    } else if (ziel === "xml") {
      img.src = `${cd}img/xml-blau-96.svg`;
    }
    // Element einhängen und wieder entfernen
    document.querySelector("body").appendChild(div);
    setTimeout(function () {
      div.classList.add("an");
    }, 1); // ohne Timeout geht es nicht
    shared.animationTimeout = setTimeout(function () {
      div.classList.remove("an");
      shared.animationTimeout = setTimeout(function () {
        if (!document.querySelector("body").contains(div)) {
          // der <div> könnte bereits verschwunden sein
          // (kann vorkommen, wenn er im 500ms-Gap noch einmal aktiviert wird)
          return;
        }
        document.querySelector("body").removeChild(div);
      }, 500);
    }, 1000);
  },

  // Datum ermitteln, als solches und in einem Sortierformat zurückgeben
  //   datum = String
  //     (Text mit dem Datum)
  //   erstesDatum = true | undefined
  //     (der String könnte mehrere Daten enthalten => erstgenanntes Datum ermitteln)
  datumGet ({ datum, erstesDatum = false }) {
    // erstgenanntes Datum ermitteln
    if (erstesDatum) {
      const formate = [
        /[0-9]{4}-[0-9]{2}-[0-9]{2}/,
        /[0-9]{1,2}\.\s?[0-9]{1,2}\.\s?[0-9]{4}/,
        /[0-9]{4}[-–][0-9]{4}/,
        /[0-9]{4}\/[0-9]{2}/,
        /[0-9]{4}/,
        /[0-9]{2}\.\sJh\./,
      ];
      let hit = -1;
      let datumTmp = datum;
      for (let i = 0, len = formate.length; i < len; i++) {
        if (!formate[i].test(datumTmp)) {
          continue;
        }
        hit = i;
        datumTmp = datum.split(formate[i])[0];
        if (!datumTmp) {
          break;
        }
      }
      datum = datum.match(formate[hit])[0];
      if (hit < 2) {
        const ziffern = datum.match(/[0-9]+/g);
        if (hit === 0) {
          datum = `${ziffern[2]}.${ziffern[1]}.${ziffern[0]}`;
        } else {
          datum = `${ziffern[0].padStart(2, "0")}.${ziffern[1].padStart(2, "0")}.${ziffern[2]}`;
        }
      } else if (hit === 2) {
        datum = datum.replace("–", "-");
      }
    }
    // Datumformate ermitteln
    const datumForm1 = /^(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})$/.exec(datum);
    const datumForm2 = /^(?<jahrVon>[0-9]{4})-(?<jahrBis>[0-9]{4})$/.exec(datum);
    const datumForm3 = /^(?<jahrVon>[0-9]{4})\/(?<jahrBis>[0-9]{2})$/.exec(datum);
    const datumForm4 = /^(?<jahr>[0-9]{4})$/.exec(datum);
    const datumForm5 = /^(?<jh>[0-9]{2})\.\sJh\.$/.exec(datum);
    let datumSort = "";
    if (datumForm1) {
      const g = datumForm1.groups;
      datumSort = `${g.jahr}-${g.monat}-${g.tag}`;
    } else if (datumForm2) {
      const g = datumForm2.groups;
      datumSort = `${g.jahrVon}-xx-xx-${g.jahrBis}`;
    } else if (datumForm3) {
      const g = datumForm3.groups;
      datumSort = `${g.jahrVon}-xx-xx-${g.jahrVon.substring(0, 2)}${g.jahrBis}`;
    } else if (datumForm4) {
      const g = datumForm4.groups;
      datumSort = `${g.jahr}-00-00`;
    } else if (datumForm5) {
      const g = datumForm5.groups;
      datumSort = `${g.jh - 1}00-00-00`;
    }
    // Daten vor/nach Jahr
    if (datumForm2) {
      const sp = datum.split(/[-–]/);
      if (/^0000/.test(datum)) { // vor Jahr
        datum = `vor ${sp[1]}`;
        datumSort = `${sp[1]}-00-00`;
      } else if (/9999$/.test(datum)) { // nach Jahr
        datum = `nach ${sp[0]}`;
        datumSort = `${sp[0]}-00-00`;
      }
    }
    // Datumsformate zurückgeben
    return {
      anzeige: datum,
      sortier: datumSort,
    };
  },

  // Timeout für das Entfernen des Overflow-Styles
  elementMaxHeightTimeout: null,

  // maximale Höhe des übergebenen Elements festlegen
  //   ele = Element
  //     (Element, dessen maximale Höhe festgelegt werden soll)
  elementMaxHeight ({ ele }) {
    // Bedingungen:
    //   - Element ist in einem Overlay-Fenster
    //   - offsetTop ist der oberste Rand des Fensterkopfs
    const dialog = ele.closest(".overlay");
    if (dialog.classList.contains("aus")) {
      return;
    }
    // elementspezifische Variablen
    //   max = Number
    //     (Maximalhöhe des Bereichs)
    //   queries = Array
    //     (verpflichtend! Selektoren für Elemente, deren Höhe auch abgezogen werden muss)
    //   setOverflow = Boolean
    //     (Container hat standardmäßig kein "overflow: auto")
    const eleConf = {
      "anhaenge-cont": {
        queries: [],
      },
      "buchung-results": {
        queries: [],
      },
      "dialog-text": {
        queries: [ "#dialog-prompt", "#dialog-ok", "#dialog-confirm" ],
      },
      "drucken-cont": {
        queries: [],
      },
      "einstellungen-sec-allgemeines": {
        queries: [],
      },
      "einstellungen-sec-kopieren": {
        queries: [],
      },
      "einstellungen-sec-import": {
        queries: [],
      },
      "einstellungen-sec-menue": {
        queries: [],
      },
      "einstellungen-sec-notizen": {
        queries: [],
      },
      "einstellungen-sec-bedeutungsgeruest": {
        queries: [],
      },
      "einstellungen-sec-karteikarte": {
        queries: [],
      },
      "einstellungen-sec-filterleiste": {
        queries: [],
      },
      "einstellungen-sec-belegliste": {
        queries: [],
      },
      "gerueste-cont-over": {
        queries: [],
      },
      "import-cont-over": {
        queries: [ "#import-abbrechen" ],
      },
      "karteisuche-export-form-cont": {
        queries: [ "#karteisuche-export p.button" ],
      },
      "karteisuche-karteien": {
        queries: [],
      },
      "kopieren-einfuegen-over": {
        queries: [],
      },
      "kopieren-liste-cont": {
        queries: [],
      },
      "lemmata-over": {
        queries: [ "#lemmata h2" ],
      },
      "meta-cont-over": {
        queries: [],
      },
      "notizen-feld": {
        queries: [ "#notizen-buttons" ],
      },
      "quick-ein-over": {
        queries: [ "#quick-ein-buttons" ],
      },
      "red-lit-suche-titel": {
        queries: [ "#red-lit-suche-treffer" ],
      },
      "red-meta-over": {
        queries: [],
        setOverflow: true,
      },
      "red-wi-cont-over": {
        queries: [],
      },
      "redaktion-cont-over": {
        queries: [],
        setOverflow: true,
      },
      "stamm-liste": {
        max: 435,
        queries: [ "#stamm-kopf", "#stamm-cont > p" ],
      },
      "tagger-typen": {
        queries: [ "#tagger-cont > p" ],
        setOverflow: true,
      },
      "updatesWin-notes": {
        queries: [],
      },
      "zeitraumgrafik-cont-over": {
        queries: [],
      },
    };
    // Maximalhöhe berechnen
    const div = document.querySelector(`#${dialog.id} > div`);
    const dialogMarginTop = parseInt(getComputedStyle(div).marginTop.replace("px", ""), 10);
    const conf = eleConf[ele.id];
    let weitereHoehen = 0;
    // ggf. Overflow des Containers setzen/entfernen
    if (conf.setOverflow && window.innerHeight - div.getBoundingClientRect().bottom <= 30) {
      clearTimeout(shared.elementMaxHeightTimeout);
      ele.style.overflow = "auto";
    } else if (conf.setOverflow) {
      clearTimeout(shared.elementMaxHeightTimeout);
      shared.elementMaxHeightTimeout = setTimeout(() => {
        // erst entfernen, wenn die Animation vorbei ist
        // (da sich die Höhe hier schon wieder geändert haben könnte => nochmal checken)
        if (window.innerHeight - div.getBoundingClientRect().bottom <= 30) {
          ele.style.overflow = "auto";
        } else {
          ele.style.removeProperty("overflow");
        }
      }, 500);
    }
    // Höhe weiterer Elemente berechnen
    for (const i of conf.queries) {
      const elemente = document.querySelectorAll(i);
      for (const e of elemente) {
        weitereHoehen += e.offsetHeight;
        for (const m of [ "marginTop", "marginBottom" ]) {
          weitereHoehen += parseInt(getComputedStyle(e)[m].replace("px", ""), 10);
        }
      }
    }
    // Maximalhöhe festlegen
    //   padding-bottom der Dialog-Fenster: 10px
    //   margin unterhalb des Fensters: 20px
    let maxHeight = window.innerHeight - dialogMarginTop - ele.offsetTop - weitereHoehen - 10 - 20;
    if (conf.max && maxHeight > conf.max) {
      maxHeight = conf.max;
    }
    ele.style.maxHeight = `${maxHeight}px`;
  },

  // Tokens mit spezieller Bedeutung für reguläre Ausdrücke escapen
  //   string = String
  //     (Text, der escaped werden soll)
  escapeRegExp (string) {
    return string.replace(/[/\\|()[\]{}.?+*^$]/g, m => `\\${m}`);
  },

  // öffnet externe Links in einem Browser-Fenster
  //   a = Element
  //     (Link, auf dem geklickt wurde)
  externeLinks (a) {
    a.title = a.getAttribute("href");
    tooltip.init(a.parentNode);
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (evt.detail > 1) { // Doppelklicks abfangen
        return;
      }
      let url = this.getAttribute("href");
      // URL ggf. aufbereiten
      if (!/^(http|mailto)/.test(url)) {
        url = `https://${url}`;
      }
      // sicherstellen, dass eine valide URL und kein Schadcode an openExternal() übergeben wird
      let validURL;
      try {
        validURL = new URL(url).href;
      } catch (err) {
        dialog.oeffnen({
          typ: "alert",
          text: `Der Link wird nicht geöffnet, weil es sich bei ihm nicht um eine valide URL handelt.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
        });
        return;
      }
      // URL im Browser öffnen
      bridge.ipc.invoke("open-external", validURL);
    });
  },

  // das Fensterladen-Overlay ausblenden
  async fensterGeladen () {
    await bridge.ipc.invoke("init-done", "initDone");
    await new Promise(resolve => {
      setTimeout(() => {
        const fl = document.getElementById("fensterladen");
        fl.classList.add("geladen");
        fl.addEventListener("transitionend", function () {
          this.classList.add("aus");
          resolve(true);
        });
      }, 500);
    });
  },

  // spezielle Buchstaben für einen regulären Suchausdruck um Sonderzeichen ergänzen
  //   wort = String
  //     (die Zeichenkette, mit der gesucht werden soll
  formVariSonderzeichen (wort) {
    return wort.replace(/en|e|nn|n|s|ä|ö|ü/g, function (m) {
      switch (m) {
        case "en":
          // erstes e mit Tilde = NFD, zweites = NFC
          return "(?:ẽ|ẽ|en)";
        case "e":
          return "(?:ẽ|ẽ|e)";
        case "nn":
          // erstes n mit Tilde = NFD, zweites = NFC
          return "(?:ñ|ñ|nn)";
        case "n":
          return "(?:ñ|ñ|n)";
        case "s":
          return "(?:ſ|s)";
        case "ä":
          return "(?:aͤ|ä)";
        case "ö":
          return "(?:oͤ|ö)";
        case "ü":
          return "(?:uͤ|ü)";
      }
    });
  },

  // speichert, welche der Hauptfunktionen gerade geöffnet ist;
  // mögliche Werte: "liste" (= Belegliste), "gerüst" (= Bedeutungsgerüst), "karte" (= Karteikarte)
  hauptfunktion: "liste",

  // Liste der aktuellen Lemmata ausgeben
  //   daten = Object | undefined
  //     (Verweis auf das Datenobjekt mit den Lemmata)
  //   join = true | undefined
  //     (Schreibungen des Lemmas in einen String, getrennt mit /)
  lemmaliste (daten = dd.file.la, join = false) {
    const liste = new Set();
    for (const lemma of daten.la) {
      if (daten.wf && !lemma.nl) {
        // Titel von Wortfeldartikeln sind keine Lemmata
        continue;
      }
      if (join) {
        liste.add(lemma.sc.join("/"));
      } else {
        for (const schreibung of lemma.sc) {
          liste.add(schreibung);
        }
      }
    }
    return liste;
  },

  // entschüsselt die "verschlüsselte" E-Mail-Adresse
  //   kodiert = String
  //     (die "verschlüsselte" Mail-Adresse)
  mailEntschluesseln (kodiert) {
    let dekodiert = "";
    for (let i = 0, len = kodiert.length; i < len; i++) {
      let charCode = kodiert.charCodeAt(i);
      if (i % 2 === 0) {
        charCode -= 2;
      } else {
        charCode--;
      }
      dekodiert += String.fromCharCode(charCode);
    }
    return dekodiert.split("trenner")[1];
  },

  // Fehler an den Main-Prozess melden
  //   evt = Object
  //     (Fehler-Objekt)
  onError ({ evt, file, word }) {
    let fileJs = evt.filename; // gewöhnliche Fehler
    let message = evt.message;
    let line = evt.lineno;
    let column = evt.colno;
    if (evt.stack) { // weitergeleitete Fehler
      if (!/file:.+?\.js/.test(evt.stack)) {
        noDetails();
      } else {
        fileJs = evt.stack.match(/file:.+?\.js/)[0];
        message = `${evt.name}: ${evt.message}`;
        line = parseInt(evt.stack.match(/\.js:([0-9]+):/)[1], 10);
        column = parseInt(evt.stack.match(/\.js:[0-9]+:([0-9]+)/)[1], 10);
      }
    } else if (evt.reason) { // in promise-Fehler
      if (!/file:.+?\.js/.test(evt.reason.stack)) {
        noDetails();
      } else {
        fileJs = evt.reason.stack.match(/file:.+?\.js/)[0];
        message = evt.reason.stack.match(/(.+?)\n/)[1];
        line = parseInt(evt.reason.stack.match(/\.js:([0-9]+):/)[1], 10);
        column = parseInt(evt.reason.stack.match(/\.js:[0-9]+:([0-9]+)/)[1], 10);
      }
    }
    // Fehler-Objekt erzeugen
    const err = {
      time: new Date().toISOString(),
      word,
      fileZtj: file,
      fileJs,
      message,
      line,
      column,
    };
    // Fehler-Objekt an Renderer schicken
    bridge.ipc.invoke("fehler", err);
    // keine Details bekannt
    function noDetails () {
      let stack = evt.reason.stack ? evt.reason.stack : "";
      if (!stack && evt.reason.name) {
        stack = `${evt.reason.name}: ${evt.reason.message}`;
      }
      fileJs = "";
      message = stack;
      line = 0;
      column = 0;
    }
  },

  // return a random number
  //   min = number
  //   max = number
  rand (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Dropdown: Feldtypen
  redWiDropdown: {
    vt: [ "Wortbildung", "Wortverbindung", "Wortfeld", "Wortfeldartikel" ],
    lt: [ "Textverweis", "Verweis intern", "Verweis extern" ],
    se: [ "Cluster", "Synonym", "Heteronym", "Paronym", "Hyponym", "Hyperonym", "Meronym", "Holonym", "Gegensatz", "Kohyponym" ],
  },

  // Datei aus dem Resources-Ordner laden
  //   file = string (Dateiname)
  //   targetObj = object (Zielobjekt)
  //   targetKey = string (Zielschlüssel)
  async resourcesLoad ({ file, targetObj, targetKey }) {
    const resources = await shared.resourcesPfad();
    const pfad = await bridge.ipc.invoke("path-join", [ resources, file ]);
    const result = await bridge.ipc.invoke("file-read", {
      path: pfad,
    });

    if (result.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Das Einlesen der Datei „${file}“ ist gescheitert.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
    }

    targetObj[targetKey] = result;
  },

  // ermittelt den Resources-Pfad
  async resourcesPfad () {
    let resources = dd.app.resourcesPath;
    if (/node_modules/.test(resources)) {
      // App ist nicht paketiert => resourcesPath zeigt auf die resources von Electron
      resources = await bridge.ipc.invoke("path-join", [ dd.app.appPath, "resources" ]);
    }
    return resources;
  },

  // Ende des Scrollens detektieren
  // (da scrollend nicht feuert, wenn nich gescrollt wird,
  // ist so eine Funktion weiterhin nötig
  //   obj = node
  //     (das Element, das gescrollt wird)
  async scrollEnd (obj = window) {
    await new Promise(resolve => {
      let scrolling = false;
      function scrollDetected () {
        scrolling = true;
      }
      function scrollEnd () {
        obj.removeEventListener("scroll", scrollDetected);
        obj.removeEventListener("scrollend", scrollEnd);
        resolve(true);
      }
      obj.addEventListener("scroll", scrollDetected);
      obj.addEventListener("scrollend", scrollEnd);
      setTimeout(() => {
        if (!scrolling) {
          scrollEnd();
        }
      }, 50);
    });
  },

  // Strings für alphanumerische Sortierung aufbereiten
  //   s = String
  //     (String, der aufbereitet werden soll)
  sortAlphaPrepCache: {},
  sortAlphaPrep (s) {
    if (shared.sortAlphaPrepCache[s]) {
      return shared.sortAlphaPrepCache[s];
    }
    let prep = s.toLowerCase().replace(/ä|ö|ü|ß/g, function (m) {
      switch (m) {
        case "ä":
          return "ae";
        case "ö":
          return "oe";
        case "ü":
          return "ue";
        case "ß":
          return "ss";
      }
    });
    prep = prep.replace(/[0-9]+/g, m => m.padStart(4, "0"));
    shared.sortAlphaPrepCache[s] = prep;
    return prep;
  },

  // alphanumerisch sortieren
  // (geht nur bei eindimensionalen Arrays!)
  //   a = String
  //   b = String
  sortAlpha (a, b) {
    a = shared.sortAlphaPrep(a);
    b = shared.sortAlphaPrep(b);
    const x = [ a, b ];
    x.sort();
    if (x[0] === a) {
      return -1;
    }
    return 1;
  },

  // Strings nach Länge sortieren (kürzeste zuletzt), Fallback: alphanumerische Sortierung
  //   a = String
  //   b = String
  sortLengthAlpha (a, b) {
    const a_len = a.length;
    const b_len = b.length;
    if (a_len !== b_len) {
      return b_len - a_len;
    }
    return shared.sortAlpha(a, b);
  },

  // Titelaufnahmen nach ihren Siglen sortieren
  //   a = Object | String
  //   b = Object | String
  //     (wenn Objekte: enthalten sind Schlüssel "id" [String] und "slot" [Number];
  //     wenn String: direkt die Sigle der Titelaufnahme)
  sortSiglen (a, b) {
    const oriA = a;
    const oriB = b;
    let siA = shared.sortAlphaPrep(shared.sortSiglenPrep(a));
    let siB = shared.sortAlphaPrep(shared.sortSiglenPrep(b));
    // Siglen sind nach der Normalisierung identisch => Duplikate oder zu starke Normalisierung
    if (siA === siB) {
      if (oriA !== oriB) { // z.B. ¹DWB und ²DWB
        siA = shared.sortSiglenPrepSuper(oriA);
        siB = shared.sortSiglenPrepSuper(oriB);
      } else {
        return 0;
      }
    }
    // Siglen sind nicht identisch => sortieren
    const arr = [ siA, siB ];
    arr.sort();
    if (arr[0] === siA) {
      return -1;
    }
    return 1;
  },

  // Titelaufnahmen nach ihren Siglen sortieren (Vorbereitung)
  //   s = String
  //     (String, der aufbereitet werden soll)
  sortSiglenPrepCache: {},
  sortSiglenPrep (s) {
    if (shared.sortSiglenPrepCache[s]) {
      return shared.sortSiglenPrepCache[s];
    }
    let prep = s.replace(/[()[\]{}<>]/g, "");
    prep = prep.replace(/^[⁰¹²³⁴⁵⁶⁷⁸⁹]+/, "");
    shared.sortSiglenPrepCache[s] = prep;
    return prep;
  },

  // Superscript-Ziffern in Siglen in arabische umwandeln
  // (dient für die Sortierung von Siglen, die nach der Elimination der
  // hochgestellten Ziffern identisch wären; das Problem sind die Codepoints
  // in Unicode; da herrscht ein ziemliches Durcheinander: ² komtm vor ³, ³ kommt vor ¹ usw.)
  //   s = String
  //     (String, der aufbereitet werden soll)
  sortSiglenPrepSuperCache: {},
  sortSiglenPrepSuper (s) {
    if (shared.sortSiglenPrepSuperCache[s]) {
      return shared.sortSiglenPrepSuperCache[s];
    }
    const prep = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, m => {
      switch (m) {
        case "⁰":
          return "0";
        case "¹":
          return "1";
        case "²":
          return "2";
        case "³":
          return "3";
        case "⁴":
          return "4";
        case "⁵":
          return "5";
        case "⁶":
          return "6";
        case "⁷":
          return "7";
        case "⁸":
          return "8";
        case "⁹":
          return "9";
      }
    });
    shared.sortSiglenPrepSuperCache[s] = prep;
    return prep;
  },

  // URLs nach Domain sortieren
  //   a = String
  //   b = String
  sortURL (a, b) {
    if (/books\.google/.test(a)) {
      return -1;
    } else if (/books\.google/.test(b)) {
      return 1;
    } else if (/doi\.org/.test(a)) {
      return -1;
    } else if (/doi\.org/.test(b)) {
      return 1;
    }
    return 0;
  },

  // Wortinformationen sortieren
  //   a = Object
  //   b = Object
  //     (s. dd.file.rd.wi)
  sortWi (a, b) {
    const aVt = shared.redWiDropdown.vt.indexOf(a.vt);
    const bVt = shared.redWiDropdown.vt.indexOf(b.vt);
    if (aVt !== bVt) {
      return aVt - bVt;
    }
    if (a.tx === b.tx) {
      return 0;
    }
    const arr = [ a.tx, b.tx ];
    arr.sort(shared.sortAlpha);
    if (arr[0] === a.tx) {
      return -1;
    }
    return 1;
  },

  // Treffer innerhalb von Tags löschen
  //   text = String
  //     (Text mit Suchmarkierungen)
  //   cl = String | undefined
  //     (die Class des <mark>)
  suchtrefferBereinigen (text, cl = "suche") {
    const reg = new RegExp(`(<[^>]*?)<mark class="${cl}">(.+?)</mark>`, "g");
    while (text.match(reg)) { // > 1 Treffer in ein un demselben Tag => mehrfach durchlaufen
      text = text.replace(reg, function (m, p1, p2) {
        return `${p1}${p2}`;
      });
    }
    return text;
  },

  // überprüft, ob in einem Number-Input eine zulässige Ziffer steht
  //   i = Element
  //     (das Number-Feld, das überprüft werden soll)
  inputNumber (i) {
    const v = parseInt(i.value, 10);
    if (isNaN(v) || v < i.min || v > i.max) {
      i.value = i.defaultValue;
    }
  },

  // mehrzeilige Textfelder automatisch an die Größe des Inhalts anpassen
  // (größer als die angegebene max-height werden sie dabei nie)
  //   textarea = Element
  //     (Textfeld, dessen Eingaben hier abgefangen werden)
  //   padding = Number | undefined
  //     (steuert, ob ein padding abgezogen werden muss)
  textareaGrow (textarea, padding = 4) {
    textarea.style.height = "inherit";
    textarea.style.height = `${textarea.scrollHeight - padding}px`; // normalerweise 4px padding in scrollHeight enthalten
  },

  // Bereinigt Text, der in Textfeldern eingegeben wurde
  //   text = String
  //     (der Text, der bereinigt werden soll)
  //   doppelleer = Boolean
  //     (sollen doppelte Leerzeichen bereinigt werden; das ist nicht in jedem Feld sinnvoll)
  textTrim (text, doppelleer) {
    text = text.replace(/^(\s*\n)+|(\s*\n)+$/g, "");
    text = text.trim(); // berücksichtigt Zeilenumbrüche nicht immer
    if (doppelleer) {
      text = text.replace(/[ \t]{2,}/g, " ");
    }
    return text;
  },

  // einen Text typographisch aufhübschen
  //   text = String
  //     (Text, in dem die Anpassungen vorgenommen werden sollen)
  typographie (text) {
    text = text.replace(/[=]"(.*?)"/g, (m, p1) => `=__${p1}__`); // Attribute in Tags maskieren
    text = text.replace(/"(.+?)"/g, (m, p1) => `„${p1}“`); // doppelte Anführungszeichen
    text = text.replace(/([a-z])'([a-z])/g, (m, p1, p2) => `${p1}’${p2}`); // offenkundiges Apostroph
    text = text.replace(/'(.+?)'/g, (m, p1) => `‚${p1}‘`); // einfache Anführungszeichen
    text = text.replace(/'/g, "’"); // wahrscheinliches Apostroph
    text = text.replace(/(\s|[0-9]+)-(\s|[0-9]+)/g, (m, p1, p2) => `${p1}–${p2}`); // Halbgeviertstriche
    text = text.replace(/([0-9])\s[-–]\s([0-9])/g, (m, p1, p2) => `${p1}–${p2}`); // Halbgeviertstriche
    text = text.replace(/--/g, "–"); // Halbgeviertstriche
    text = text.replace(/\s([:;])\s/g, (m, p1) => `${p1} `); // nicht planken
    text = text.replace(/&nbsp;/g, "\u00A0"); // maskierte geschützte Leerzeichen demaskieren
    text = text.replace(/[=]__(.*?)__/g, (m, p1) => `="${p1}"`); // Attribute in Tags demaskieren
    text = text.replace(/\.{3}/g, "…"); // horizontale Ellipse
    text = text.replace(/([a-z]) ([0-9]+ \([0-9]{4}\))/, (m, p1, p2) => `${p1}\u00A0${p2}`); // geschütztes Leerzeichen vor Jahrgang einer Zeitschrift
    text = text.replace(/([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{4})/g, (...args) => `${args[1].replace(/^0/, "")}.\u00A0${args[2].replace(/^0/, "")}. ${args[3]}`); // Leerzeichen bei aneinandergeklatschten Daten
    text = text.replace(/ \/(?!>)/g, "\u00A0/"); // geschütztes Leerzeichen vor Virgel
    // Korrekturen
    text = text.replace(/([0-9]{4})[–-]([0-9]{2})[–-]([0-9]{2})/g, (...args) => `${args[3].replace(/^0/, "")}.\u00A0${args[2].replace(/^0/, "")}. ${args[1]}`); // ISO-Daten in das übliche Datumsformat umwandeln
    // geschützte Leerzeichen (ggf. einfügen, wenn Spatien vergessen wurden)
    const abk = new Set([
      /[0-9]{1,2}\. [0-9]{1,2}\. [0-9]{4}/g, // Datumsangabe (nur 1. Leerzeichen wird ersetzt!)
      /[0-9]{1,2}\.\s?(Jan|Feb|März|Apr|Mai|Juni|Juli|Aug|Sep|Okt|Nov|Dez)/g, // Datumsangabe mit Monat
      /[0-9]\.\s?Aufl/g, // Auflage
      /[0-9] Bde/g, // Bände
      /[0-9]\.\s?Hälfte/g,
      /[0-9]{1,2}\.\s?(Jh\.|Jahrhundert)/g, // Jahrhundertangaben
      /(Abschnitt|Kapitel) ([0-9]|[IVXLC])/g,
      /a\.\s?M\./g, // am Main
      /Abb\.\s?[0-9]+/g, // Abbildung
      /Bd\.\s?[0-9]+/g, // Band
      /d\.\s?(h|i)\./ig,
      /e\.\s?V\./g, // eingetragener Verein
      /hrsg\.\s?v\./ig,
      /H\.\s?[0-9]+/g, // Heft
      /i\.\s?Br\./g, // im Breisgau
      /N\.\s?N\./g, // nomen nescio
      /Nr\.\s?[0-9]+/g, // Nummer
      /o\.\s?ä\./ig, // oder ähnlich/Ähnliches
      /o\.\s?(D|O)\./ig, // ohne Datum/Ort
      /s\.\s?(d|l|o|u)\./ig,
      /s\.\s?v\./g, // sub voce (nur in Kleinschreibung)
      /Sp?\.\s?[0-9]+/g, // Seiten-/Spaltenangaben
      /u\.\s?(a|ä)\./ig,
      /v\.\s?a\./ig,
      /z\.\s?B\./ig,
      /zit\.\s?n\./ig,
      // Dreiwort-Abkürzungen
      // (aufgeteilt, damit das System, nur das erste Leerzeichen zu ersetzen, bestehen bleibt)
      /a\.\s?d\./g, // an der Saale
      /d\.\s?S\./g,
      /i\.\s?d\./g, // in der Regel
      /d\.\s?R\./g,
      /i\.\s?S\./g, // im Sinne von
      /S\.\s?v\./g,
    ]);
    for (const i of abk) {
      text = text.replace(i, m => {
        if (!/\s/.test(m)) {
          return m.replace(/\./, ".\u00A0");
        }
        return m.replace(/\s/, "\u00A0");
      });
    }
    // Text zurückgeben
    return text;
  },
};
