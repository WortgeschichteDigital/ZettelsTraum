
import dd from "./dd.mjs";
import shared from "./shared.mjs";
import sharedTastatur from "./sharedTastatur.mjs";
import tooltip from "./tooltip.mjs";

const mod = {
  // "app"
  annotieren: null,
  beleg: null,
  liste: null,
  // "win"
  helfer: null,
  hilfe: null,
};

export { suchleiste as default };

const suchleiste = {
  // initialisiert Module, die abhängig vom Fenstertyp geladen werden müssen
  async modInit () {
    let modules;
    let dir;
    if (dd.win.typ === "index") {
      // Hauptfenster
      modules = [ "annotieren", "beleg", "liste" ];
      dir = "app";
    } else {
      // Nebenfenster
      modules = [ "helfer", "hilfe" ];
      dir = "win";
    }

    const promises = [];
    for (const i of modules) {
      promises.push((async function () {
        ({ default: mod[i] } = await import(`./${dir}/${i}.mjs`));
      })());
    }
    await Promise.all(promises);
  },

  // speichert, ob die Suchleiste gerade sichtbar ist oder nicht
  aktiv: false,

  // Leiste einblenden
  einblenden () {
    // Leiste ggf. erzeugen
    let leiste = document.getElementById("suchleiste");
    if (!leiste) {
      suchleiste.make();
      leiste = document.getElementById("suchleiste");
      void leiste.offsetWidth;
    }

    // zwischenspeichern, dass die Leiste aktiv ist
    suchleiste.aktiv = true;

    // Leiste einblenden und fokussieren
    leiste.classList.add("an");
    const feld = leiste.firstChild;
    feld.value = suchleiste.suchenZuletzt;
    leiste.firstChild.select();
    suchleiste.suchenZuletzt = "";

    // Padding der Seite erhöhen
    if (dd.win.typ === "changelog") {
      document.querySelector("main").classList.add("padding-suchleiste");
    } else if (/dokumentation|handbuch/.test(dd.win.typ)) {
      document.querySelector("section:not(.aus)").classList.add("padding-suchleiste");
    } else if (dd.win.typ === "index") {
      if (shared.hauptfunktion === "karte") {
        // Karteikarte
        document.getElementById("beleg").classList.add("padding-suchleiste");
      } else {
        // Belegliste
        document.getElementById("liste-belege-cont").classList.add("padding-suchleiste");
      }
    }
  },

  // Listener für das Ausblenden via Link
  //   a = Element
  //     (der Schließen-Link in der Suchleiste)
  ausblendenListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      suchleiste.ausblenden();
    });
  },

  // Leiste ausblenden
  ausblenden () {
    suchleiste.aktiv = false;
    suchleiste.suchenReset();
    const leiste = document.getElementById("suchleiste");
    leiste.firstChild.blur();
    leiste.firstChild.value = "";
    leiste.classList.remove("an");
    const padding = document.querySelector(".padding-suchleiste");
    if (padding) {
      padding.classList.remove("padding-suchleiste");
    }
  },

  // HTML der Suchleiste aufbauen
  make () {
    const div = document.createElement("div");
    document.querySelector("body").appendChild(div);
    div.id = "suchleiste";
    // Text-Input
    let input = document.createElement("input");
    div.appendChild(input);
    input.placeholder = "Suchtext";
    input.type = "text";
    input.value = "";
    input.id = "suchleiste-text";
    suchleiste.suchenListener(input);
    // Pfeile
    const pfeile = [
      {
        typ: "hoch",
        text: "vorherigen",
        short: "Shift + F3",
      },
      {
        typ: "runter",
        text: "nächsten",
        short: "F3",
      },
    ];
    for (const pfeil of pfeile) {
      const a = document.createElement("a");
      div.appendChild(a);
      a.classList.add("icon-link", `icon-${pfeil.typ}`);
      a.href = "#";
      a.id = `suchleiste-${pfeil.typ}`;
      a.textContent = "\u00A0";
      a.title = `zum ${pfeil.text} Treffer (${pfeil.short})`;
      suchleiste.naviListener(a);
    }
    // genaue Schreibung
    input = document.createElement("input");
    div.appendChild(input);
    input.type = "checkbox";
    input.id = "suchleiste-genaue";
    input.addEventListener("change", function () {
      suchleiste.suchenZuletzt = "";
    });
    const label = document.createElement("label");
    div.appendChild(label);
    label.setAttribute("for", "suchleiste-genaue");
    label.textContent = "genaue Schreibung";
    // Schließen
    const a = document.createElement("a");
    div.appendChild(a);
    a.classList.add("icon-link", "icon-schliessen");
    a.href = "#";
    a.id = "suchleiste-schliessen";
    a.textContent = "\u00A0";
    a.title = "Suchleiste schließen (Esc)";
    suchleiste.ausblendenListener(a);
    // Tooltips initialisieren
    tooltip.init(div);
  },

  // Listener für das Suchfeld
  //   input = Element
  //     (der Text-Input der Suchleiste)
  suchenListener (input) {
    input.addEventListener("keydown", function (evt) {
      sharedTastatur.detectModifiers(evt);
      if (!sharedTastatur.modifiers && evt.key === "Enter") {
        suchleiste.suchen(false, evt);
      }
    });
    input.addEventListener("focus", function () {
      this.select();
    });
  },

  // Zwischenspeicher für den Text der letzten erfolgreichen Suche
  suchenZuletzt: "",

  // Suche starten
  //   neuaufbau = boolean
  //     (die Suchergebnisse sollen nur neu aufgebaut werden)
  //   evt = object | undefined
  //     (Event-Objekt)
  suchen (neuaufbau, evt) {
    // Suchtext vorhanden?
    const sucheText = document.getElementById("suchleiste-text");
    let text = sucheText.value;
    const textMitSpitz = shared.textTrim(text, true);
    text = shared.textTrim(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), true);
    if (!text) {
      if (neuaufbau) {
        return;
      }

      // ggf. Annotierungs-Popup schließen
      if (dd.win.typ === "index") {
        mod.annotieren.modSchliessen();
      }

      // alte Suche ggf. löschen
      suchleiste.suchenReset();
      suchleiste.suchenZuletzt = "";

      // visualisieren, dass damit nichts gefunden werden kann
      suchleiste.suchenKeineTreffer();
      return;
    }

    // Suchtext mit der letzten Suche identisch => eine Position weiterrücken
    if (text === suchleiste.suchenZuletzt && !neuaufbau) {
      suchleiste.navi(true, evt);
      return;
    }

    // ggf. Annotierungs-Popup schließen
    if (dd.win.typ === "index") {
      mod.annotieren.modSchliessen();
    }

    // alte Suche löschen
    suchleiste.suchenReset();
    suchleiste.suchenZuletzt = "";

    // Elemente mit Treffer zusammentragen
    const form = shared.hauptfunktion === "karte" && !mod.beleg.leseansicht;
    const genaue = document.getElementById("suchleiste-genaue").checked ? "" : "i";
    const reg = new RegExp(shared.formVariSonderzeichen(shared.escapeRegExp(textMitSpitz)).replace(/\s/g, "\\s"), genaue);
    let e = [];
    if (dd.win.typ === "changelog") {
      e = document.querySelectorAll("div > h2, div > h3, div > p, ul li");
    } else if (/dokumentation|handbuch/.test(dd.win.typ)) {
      e = document.querySelectorAll("section:not(.aus) > h2, section:not(.aus) > p, section:not(.aus) #suchergebnisse > p, section:not(.aus) > div p, section:not(.aus) > pre, section:not(.aus) li, section:not(.aus) td, section:not(.aus) th");
    } else if (dd.win.typ === "index") {
      if (shared.hauptfunktion === "karte" && mod.beleg.leseansicht) {
        // Karteikarte (Leseansicht)
        e = document.querySelectorAll("#beleg th, .beleg-lese td");
      } else if (form) {
        // Karteikarte (Formularansicht)
        // RegExp für Beleg-Feld erstellen
        const formText = textMitSpitz.split("");
        for (let i = 0, len = formText.length; i < len; i++) {
          let letter = shared.escapeRegExp(formText[i]);
          letter = shared.formVariSonderzeichen(letter);
          letter = letter.replace(/\s/g, "(&nbsp;|\\s)");
          formText[i] = letter;
        }
        const reg = new RegExp(formText.join("(?:<[^>]+>|\\[¬\\]| \\[:.+?:\\] )*"), "g" + genaue);
        mod.beleg.ctrlSpringenFormMatches(reg);
        // Feld mit Importdaten hinzufügen (wenn es sichtbar ist)
        if (!document.getElementById("beleg-bx").closest("tr").classList.contains("aus")) {
          e = document.querySelectorAll("#beleg-bx");
        }
      } else {
        // Belegliste
        e = document.querySelectorAll(".liste-kopf > span, .liste-details");
      }
    }
    const treffer = new Set();
    for (const i of e) {
      if (reg.test(i.innerText)) {
        treffer.add(i);
      }
    }

    // Treffer?
    if (!treffer.size) {
      if (form && mod.beleg.ctrlSpringenFormReg.matches.length) {
        suchleiste.naviBelegtext(evt, true);
        suchleiste.suchenZuletzt = text;
        sucheText.select();
      } else if (!neuaufbau) {
        suchleiste.suchenKeineTreffer();
      }
      return;
    }
    suchleiste.suchenZuletzt = text;
    sucheText.select();

    // RegExp erstellen
    let textKomplex = shared.escapeRegExp(text.charAt(0));
    for (let i = 1, len = text.length; i < len; i++) {
      textKomplex += "(<[^>]+>)*";
      textKomplex += shared.escapeRegExp(text.charAt(i));
    }
    textKomplex = shared.formVariSonderzeichen(textKomplex).replace(/\s/g, "(&nbsp;|\\s)");
    const regKomplex = new RegExp(textKomplex, "g" + genaue);

    // Text hervorheben
    for (const t of treffer) {
      t.innerHTML = shared.suchtrefferBereinigen(t.innerHTML.replace(regKomplex, setzenMark), "suchleiste");
      suchleiste.suchenEventsWiederherstellen(t);
      // Suchtreffer unterhalb des Kürzungsplatzhalters entfernen
      t.querySelectorAll(".kuerzung").forEach(k => {
        k.querySelectorAll(".suchleiste").forEach(m => m.parentNode.removeChild(m));
      });
    }

    // zum ersten Treffer springen
    if (!neuaufbau) {
      suchleiste.navi(true, evt);
    }

    // Ersetzungsfunktion
    // (ein bisschen komplizierter, um illegales Nesting zu vermeiden und
    // die Suchtreffer schön aneinanderzuhängen, sodass sie wie ein Element aussehen)
    function setzenMark (m) {
      if (/<.+?>/.test(m)) {
        m = m.replace(/<.+?>/g, function (m) {
          return `</mark>${m}<mark class="suchleiste">`;
        });
      }
      // leere <mark> entfernen (kann passieren, wenn Tags verschachtelt sind)
      m = m.replace(/<mark class="suchleiste"><\/mark>/g, "");
      // Rückgabewert zusammenbauen
      m = `<mark class="suchleiste">${m}</mark>`;
      // alle <mark> ermitteln, die weder Anfang noch Ende sind
      const marks = m.match(/class="suchleiste"/g).length;
      if (marks > 1) { // marks === 1 => der einzige <mark>-Tag ist Anfang und Ende zugleich
        const splitted = m.split(/class="suchleiste"/);
        m = "";
        for (let i = 0, len = splitted.length; i < len; i++) {
          if (i === 0) {
            m += splitted[i] + 'class="suchleiste suchleiste-kein-ende"';
          } else if (i === len - 2) {
            m += splitted[i] + 'class="suchleiste suchleiste-kein-start"';
          } else if (i < len - 1) {
            m += splitted[i] + 'class="suchleiste suchleiste-kein-start suchleiste-kein-ende"';
          } else {
            m += splitted[i];
          }
        }
      }

      // aufbereiteten Match auswerfen
      return m;
    }
  },

  // alte Suche zurücksetzen
  suchenReset () {
    const knoten = new Set();
    document.querySelectorAll(".suchleiste").forEach(function (i) {
      knoten.add(i.parentNode);
    });
    for (const k of knoten) {
      k.innerHTML = k.innerHTML.replace(/<mark[^<]+suchleiste[^<]+>(.+?)<\/mark>/g, ersetzenMark);
      suchleiste.suchenEventsWiederherstellen(k);
    }
    function ersetzenMark (m, p1) {
      return p1;
    }
  },

  // nach dem Ändern des HTML Events wieder einhängen
  //   ele = Element
  //     (HTML-Element, in dem HTML geändert wurde;
  //     hier sollen Events ggf. wiederhergestellt werden)
  suchenEventsWiederherstellen (ele) {
    // Über App öffnen (Changelog, Dokumentation und Handbuch)
    ele.querySelectorAll(".ueber-app").forEach(function (i) {
      i.addEventListener("click", function (evt) {
        evt.preventDefault();
        bridge.ipc.invoke("ueber-app");
      });
    });
    // Über Electron öffnen (Changelog, Dokumentation und Handbuch)
    ele.querySelectorAll(".ueber-electron").forEach(function (i) {
      i.addEventListener("click", function (evt) {
        evt.preventDefault();
        bridge.ipc.invoke("ueber-electron");
      });
    });
    // Demonstrationskartei öffnen (Dokumentation, Handbuch)
    ele.querySelectorAll(".hilfe-demo").forEach(function (i) {
      i.addEventListener("click", function (evt) {
        evt.preventDefault();
        bridge.ipc.invoke("hilfe-demo");
      });
    });
    // Changelog, Dokumentation, Handbuch öffnen (Changelog, Dokumentation, Handbuch)
    ele.querySelectorAll(".link-handbuch, .link-dokumentation").forEach(a => mod.helfer.oeffne(a));
    // Changelog öffnen (Dokumentation und Handbuch)
    ele.querySelectorAll(".link-changelog").forEach(a => mod.helfer.oeffneChangelog(a));
    // Fehlerlog öffnen (Changelog, Handbuch)
    ele.querySelectorAll(".link-fehlerlog").forEach(a => mod.helfer.oeffneFehlerlog(a));
    // interne Sprung-Links (Dokumentation und Handbuch)
    ele.querySelectorAll('a[href^="#"]').forEach(function (a) {
      if (mod.hilfe &&
          /^#[a-z]/.test(a.getAttribute("href"))) {
        mod.hilfe.naviSprung(a);
      }
    });
    // Links zu den Suchfunktionen (Handbuch)
    ele.querySelectorAll(".link-suche").forEach(a => {
      a.addEventListener("click", evt => {
        evt.preventDefault();
        document.getElementById("suchfeld").select();
      });
    });
    ele.querySelectorAll(".link-suchleiste").forEach(a => {
      a.addEventListener("click", evt => {
        evt.preventDefault();
        suchleiste.f3(evt);
      });
    });
    // externe Links
    ele.querySelectorAll('a[href^="http"]').forEach(a => shared.externeLinks(a));
    // Kopierlinks in der Belegliste (Hauptfenster)
    if (ele.classList.contains("liste-details")) {
      ele.querySelectorAll(".icon-tools-kopieren").forEach(a => mod.liste.kopieren(a));
    }
    // Einblenden-Funktion gekürzter Absätze (Hauptfenster)
    ele.querySelectorAll(".gekuerzt").forEach(p => mod.liste.belegAbsatzEinblenden(p));
    // Icon-Tools in der Karteikarte (Hauptfenster)
    if (dd.win.typ === "index" && shared.hauptfunktion === "karte" && ele.nodeName === "TH") {
      ele.querySelectorAll('[class*="icon-tools-"]').forEach(a => mod.beleg.toolsKlick(a));
    }
    // Bedeutung-entfernen-Icon in der Karteikarte (Hauptfenster)
    ele.querySelectorAll(".icon-entfernen").forEach(a => mod.beleg.formularBedeutungEx(a));
    // Annotierung (Hauptfenster)
    ele.querySelectorAll("mark.wort, mark.user").forEach(function (i) {
      i.addEventListener("click", function () {
        mod.annotieren.mod(this);
      });
    });
  },

  // Zwischenspeicher für den Timeout
  suchenKeineTrefferTimeout: null,

  // visualisieren, dass es keine Treffer gab
  suchenKeineTreffer () {
    const input = document.getElementById("suchleiste-text");
    input.classList.add("keine-treffer");
    clearTimeout(suchleiste.suchenKeineTrefferTimeout);
    suchleiste.suchenKeineTrefferTimeout = setTimeout(function () {
      input.classList.remove("keine-treffer");
    }, 1000);
  },

  // Verhalten beim Drücken von F3 steuern
  //   evt = Object
  //     (das Event-Objekt)
  f3 (evt) {
    const leiste = document.getElementById("suchleiste");
    const feld = leiste?.firstChild;
    if (!leiste || !leiste.classList.contains("an")) {
      suchleiste.einblenden();
      return;
    } else if (feld.value.trim() !== suchleiste.suchenZuletzt) {
      suchleiste.suchen(false, evt);
      return;
    } else if (!document.querySelector(".suchleiste") &&
        !(shared.hauptfunktion === "karte" && !mod.beleg.leseansicht && mod.beleg.ctrlSpringenFormReg.matches.length)) {
      suchleiste.suchenKeineTreffer();
      return;
    }
    suchleiste.navi(!evt.shiftKey);
  },

  // Listener für die Navigationslinks
  //   a = Element
  //     (der Navigationslink)
  naviListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      let next = true;
      if (/-hoch$/.test(this.id)) {
        next = false;
      }
      suchleiste.navi(next);
    });
  },

  // Navigation durch die Suchergebnisse
  //   next = Boolean
  //     (zum nächsten Treffer springen)
  //   evt = Object | undefined
  //     (Event-Objekt)
  navi (next, evt) {
    // Formularansicht der Karteikarte?
    const form = shared.hauptfunktion === "karte" && !mod.beleg.leseansicht;
    const formData = typeof beleg !== "undefined" ? mod.beleg.ctrlSpringenFormReg : null;

    // Navigation mit Pfeilen ggf. abfangen
    const marks = document.querySelectorAll(".suchleiste");
    if (!marks.length) {
      if (form && formData.matches.length) {
        // durch die Treffer im Belegfeld springen
        suchleiste.naviBelegtext(evt, next);
      } else {
        // keine Treffer
        suchleiste.suchenKeineTreffer();
      }
      return;
    }

    // aktives Element vorhanden?
    let pos = -1;
    const aktiv = document.querySelectorAll(".suchleiste-aktiv");
    if (aktiv.length) {
      for (let i = 0, len = marks.length; i < len; i++) {
        if (marks[i] === aktiv[0]) {
          pos = i;
          break;
        }
      }
      // die Position muss korrigiert werden, wenn mehr als ein Element aktiv ist;
      // ist nur ein Element aktiv, bleibt die Position mit dieser Formel identisch
      pos += aktiv.length - 1;
    }

    // aktive Elemente demarkieren
    // (wird über Tag-Grenzen hinweg gesucht, können mehrere Elemente am Stück aktiv sein)
    document.querySelectorAll(".suchleiste-aktiv").forEach(i => i.classList.remove("suchleiste-aktiv"));

    // beim Start einer Suche zunächst durch die Treffer im Belegfeld springen
    if (pos === -1 &&
        next &&
        form &&
        formData.matches.length &&
        formData.lastMatch !== formData.matches.length - 1) {
      suchleiste.naviBelegtext(evt, next);
      return;
    }

    // kein aktives Element vorhanden =>
    // ersten Suchtreffer finden, der der derzeitigen Fensterposition folgt
    if (pos === -1 && !form) {
      let headerHeight = document.querySelector("body > header").offsetHeight;
      const quick = document.getElementById("quick");
      if (quick) { // man ist im Hauptfenster
        if (quick.classList.contains("an")) {
          headerHeight += quick.offsetHeight;
        }
        if (shared.hauptfunktion === "karte") { // in der Karteikarte
          headerHeight += document.querySelector("#beleg > header").offsetHeight;
        } else { // in der Belegliste
          headerHeight += document.querySelector("#liste-belege > header").offsetHeight;
        }
      }
      for (let i = 0, len = marks.length; i < len; i++) {
        const rect = marks[i].getBoundingClientRect();
        if (rect.top >= headerHeight) {
          pos = i > 0 ? i - 1 : -1;
          break;
        }
      }
    }

    // Position bestimmen
    if (next) {
      pos++;
      if (pos > marks.length - 1) {
        if (form && formData.matches.length) {
          // wird nur aufgerufen, wenn der letzte <mark> tatsächlich aktiv war;
          // gibt es keine <mark> wird oben direkt zu suchleiste.naviBelegtext() gesprungen
          formData.lastMatch = -1;
          suchleiste.naviBelegtext(evt, next);
          return;
        }
        pos = 0;
        shared.animation("wrap");
      }
    } else {
      pos--;
      if (pos < 0) {
        if (form &&
            formData.matches.length &&
            (pos === -1 ||
            pos === -2 && formData.lastMatch > 0)) {
          // pos === -1 => bei der letzten Navigation war der erste <mark> in den Importdaten aktiv
          //   => zum letzten Match im Belegtext
          // pos === -2 => bei der letzten Navigation war kein <mark> in den Importdaten aktiv
          //   => einen Match im Belegtext weiter nach vorne
          if (pos === -1) {
            formData.lastMatch = 0;
          }
          suchleiste.naviBelegtext(evt, next);
          return;
        }
        pos = marks.length - 1;
        shared.animation("wrap");
      }
    }

    // aktive(s) Element(e) hervorheben
    // (ggf. müssen auch direkt anhängende Elemente hervorgehoben werden)
    marks[pos].classList.add("suchleiste-aktiv");
    if (marks[pos].classList.contains("suchleiste-kein-ende")) {
      for (let i = pos + 1, len = marks.length; i < len; i++) {
        const m = marks[i];
        if (m.classList.contains("suchleiste-kein-start") &&
            !m.classList.contains("suchleiste-kein-ende")) {
          m.classList.add("suchleiste-aktiv");
          break;
        }
        m.classList.add("suchleiste-aktiv");
      }
    }

    // zum aktiven Element springen
    const headerHeight = document.querySelector("header").offsetHeight;
    const suchleisteHeight = document.getElementById("suchleiste").offsetHeight;
    const rect = marks[pos].getBoundingClientRect();
    if (dd.win.typ === "index") {
      if (shared.hauptfunktion === "karte") {
        // Karteikarte
        const kopf = document.getElementById("beleg").offsetTop;
        const header = document.querySelector("#beleg header").offsetHeight;
        const titel = document.getElementById("beleg-titel").offsetHeight;
        if (rect.top < kopf + header + titel ||
            rect.top > window.innerHeight - suchleisteHeight - 24) {
          window.scrollTo({
            left: 0,
            // 24px = Höhe Standardzeile
            top: window.scrollY + rect.top - kopf - header - titel - 72,
            behavior: "smooth",
          });
        }
      } else {
        // Belegliste
        const kopf = document.getElementById("liste").offsetTop;
        const listenkopf = document.querySelector("#liste-belege header").offsetHeight;
        if (rect.top < kopf + listenkopf ||
            rect.top > window.innerHeight - suchleisteHeight - 24) {
          window.scrollTo({
            left: 0,
            // 24px = Höhe Standardzeile
            top: window.scrollY + rect.top - kopf - listenkopf - 72,
            behavior: "smooth",
          });
        }
      }
      return;
    }
    if (rect.top < headerHeight ||
        rect.top > window.innerHeight - suchleisteHeight - 24) {
      window.scrollTo({
        left: 0,
        // 24px = Höhe Standardzeile
        top: window.scrollY + rect.top - headerHeight - 72,
        behavior: "smooth",
      });
    }
  },

  // im <textarea> mit dem Belegtext navigieren
  //   evt = Oject
  //     (Event-Objekt)
  //   next = boolean
  async naviBelegtext (evt, next) {
    evt?.preventDefault();
    const formData = mod.beleg.ctrlSpringenFormReg;
    if (next) {
      formData.lastMatch++;
      if (formData.lastMatch === formData.matches.length) {
        formData.lastMatch = 0;
        shared.animation("wrap");
      }
    } else {
      formData.lastMatch--;
      if (formData.lastMatch === -1) {
        formData.lastMatch = formData.matches.length - 1;
        shared.animation("wrap");
      }
    }
    mod.beleg.selectFormEle(document.getElementById("beleg-bs"), false);
    await shared.scrollEnd();
    mod.beleg.ctrlSpringenFormHighlight(formData.matches[formData.lastMatch]);
  },

  // seitenweises Scrollen
  // (ist die Suchleiste offen, muss ich das übernehmen;
  // wird nur aufgerufen, bei PageUp, PageDown, Space;
  // aber nur, wenn weder Ctrl, noch Alt gedrückt sind)
  //   evt = Object
  //     (das Tastatur-Event-Objekt)
  scrollen (evt) {
    // Ist die Leiste überhaupt an?
    const leiste = document.getElementById("suchleiste");
    if (!leiste || !leiste.classList.contains("an")) {
      return;
    }
    // Space nicht abfangen, wenn Fokus auf <input>, <textarea>, contenteditable
    const aktiv = document.activeElement;
    if (evt.key === " " &&
        (/^(INPUT|TEXTAREA)$/.test(aktiv.nodeName) || aktiv.getAttribute("contenteditable"))) {
      return;
    }
    // die Leiste ist an => ich übernehme das Scrollen vom Browser
    evt.preventDefault();
    // Zielposition berechnen
    const headerHeight = document.querySelector("header").offsetHeight;
    const suchleisteHeight = document.getElementById("suchleiste").offsetHeight;
    const quick = document.getElementById("quick");
    let indexPlus = 0; // zusätzliche Werte für das Hauptfenster (Fenstertyp "index")
    if (quick) {
      if (quick.classList.contains("an")) {
        indexPlus = quick.offsetHeight;
      }
      if (shared.hauptfunktion === "liste") { // Belegliste
        indexPlus += document.querySelector("#liste-belege header").offsetHeight;
      } else { // Karteikarte
        indexPlus += document.querySelector("#beleg header").offsetHeight;
      }
    }
    let top = 0;
    if (evt.key === "PageUp") { // hoch
      top = window.scrollY - window.innerHeight + headerHeight + suchleisteHeight + indexPlus + 72; // 24px = Höhe Standardzeile
    } else if (/^( |PageDown)$/.test(evt.key)) { // runter
      top = window.scrollY + window.innerHeight - headerHeight - suchleisteHeight - indexPlus - 72; // 24px = Höhe Standardzeile
    }
    // scrollen
    window.scrollTo({
      left: 0,
      top,
      behavior: "smooth",
    });
  },
};
