"use strict";

const hilfe = {
  // mit der Tastatur durch durch die Menüelemente navigieren
  //   evt = Object
  //     (Event-Object des keydown)
  naviMenue (evt) {
    // aktives Element ermitteln
    const links = document.querySelectorAll("nav a.kopf");
    const aktiv = document.querySelector("nav a.aktiv");
    let pos = -1;
    for (let i = 0, len = links.length; i < len; i++) {
      if (links[i] === aktiv) {
        pos = i;
        break;
      }
    }
    // zu aktivierendes Element ermitteln
    if (evt.key === "ArrowUp") {
      pos--;
    } else {
      pos++;
    }
    if (pos < 0) {
      pos = links.length - 1;
    } else if (pos >= links.length) {
      pos = 0;
    }
    // Sektion wechseln
    const sektion = links[pos].getAttribute("href").replace(/^#/, "");
    hilfe.sektionWechseln(sektion);
  },

  // korrigiert den Sprung nach Klick auf einen internen Link,
  // sodass er nicht hinter dem Header verschwindet
  naviSprung (a) {
    if (a.classList.contains("link-handbuch") ||
        a.classList.contains("link-dokumentation")) {
      return;
    }
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const id = this.getAttribute("href").replace(/^#/, "");
      hilfe.naviSprungAusfuehren(id);
    });
  },

  // Sprung zu dem übergebenen Ziel ausführen
  //   id = String
  //     (Zielangabe, also ID, zu der hin der Sprung ausgeführt werden soll)
  async naviSprungAusfuehren (id) {
    // ggf. die Sektion wechseln
    const sek_aktiv = hilfe.sektionAktiv();
    if (!new RegExp(`^${sek_aktiv}`).test(id)) {
      const sek_ziel = id.split("-")[0];
      hilfe.sektionWechseln(sek_ziel);
    } else {
      // History: Position merken
      hilfe.history(sek_aktiv);
    }
    // ggf. Fenster an die korrekte Position scrollen
    if (sek_aktiv === "start" || sek_aktiv === "einfuehrung") {
      // befindet man sich in der Startsektion wird an die falsche Position gescrollt,
      // wenn das Ziel ein Absatz ist => kurz warten
      await new Promise(resolve => setTimeout(() => resolve(true), 25));
    }
    if (/-/.test(id)) {
      window.scrollTo({
        left: 0,
        top: document.getElementById(id).offsetTop - 70 - 16, // -16, um oben immer ein bisschen padding zu haben; vgl. hilfe.sucheSprung()
        behavior: "smooth",
      });
    }
    // History: Pfeile auffrischen (nachdem der Scroll beendet wurde)
    hilfe.historyScrollArrows();
  },

  // Navi-Details: Timeout für das Ausblenden
  naviDetailsTimeout: null,

  // Navi-Details: Öffnen-Icons initialisieren
  naviDetailsInit () {
    document.querySelectorAll("nav > ul a").forEach(i => {
      const span = document.createElement("span");
      span.classList.add("nav-details-toggle");
      i.appendChild(span);
      span.addEventListener("click", function () {
        if (!this.closest("a").classList.contains("aktiv")) {
          return;
        }
        hilfe.naviDetails({
          immerAn: false,
        });
      });
    });
  },

  // Navi-Details: Anzeige aufbauen
  //   immerAn = Boolean
  //     (Detail-Navigation nicht umschalten)
  naviDetails ({ immerAn }) {
    let nd = document.getElementById("navi-details");
    const sektion = hilfe.naviDetailsAktiv();
    if (nd) {
      if (!immerAn) {
        hilfe.naviDetailsAus();
        return;
      } else if (!sektion.id || nd.dataset.sektion === sektion.id) {
        return;
      }
      clearTimeout(hilfe.naviDetailsTimeout);
    }
    // ggf. abbrechen (bei Suchseite oder Einführung)
    if (!sektion.aktiv) {
      return;
    }
    // Icon in der Navigationsleiste umstellen
    sektion.aktiv.querySelector(".nav-details-toggle").classList.add("nav-details-toggle-aus");
    // Container aufbauen bzw. leeren
    let div;
    if (!nd) {
      nd = document.createElement("div");
      document.querySelector("main").appendChild(nd);
      nd.id = "navi-details";
      div = document.createElement("div");
      nd.appendChild(div);
    } else {
      div = nd.firstChild;
      div.replaceChildren();
    }
    nd.dataset.sektion = sektion.id;
    // Navigation aufbauen
    const h = document.querySelectorAll(`#${sektion.id} > h2, #${sektion.id} .add-navi-details, #${sektion.id} > .erklaerung-icon, #${sektion.id} > .erklaerung-icon-menues, #${sektion.id} > .erklaerung-option`);
    h.forEach(i => {
      if (!i.id || i.classList.contains("no-navi-details")) {
        return;
      }
      const a = document.createElement("a");
      div.appendChild(a);
      if (i.nodeName === "H2") {
        a.classList.add("h2");
      } else if (i.classList.contains("add-navi-details")) {
        a.classList.add("add");
      } else {
        a.classList.add("icon");
      }
      a.href = "#" + i.id;
      // Linktext auslesen und aufbereiten
      let text = "";
      if (i.classList.contains("add-navi-details")) {
        text = i.querySelector("b").textContent;
      } else {
        text = i.textContent;
      }
      text = text.trim();
      const rep = [
        /^Tastaturkürzel.+?;\s/,
        /^nur Leseansicht;\s/,
        /^nur bei aktiviert.+?;\s/,
        /^[a-zA-Z]+:\s/,
        /:$/,
      ];
      for (const r of rep) {
        text = text.replace(r, "");
      }
      if (/; /.test(text)) {
        text = text.replace(/(.+?); .+/, (m, p1) => p1);
      }
      a.textContent = text;
      // Events anhängen
      hilfe.naviSprung(a);
      a.addEventListener("click", () => hilfe.naviDetailsAus());
    });
    // ggf. System der Überschriften umstellen
    if (!div.querySelector(".h2")) {
      div.querySelectorAll(".icon").forEach(i => {
        i.classList.remove("icon");
        i.classList.add("h2");
      });
      div.querySelectorAll(".icon").forEach(i => {
        i.classList.remove("icon");
        i.classList.add("add");
      });
    }
    // Einrückungen vornehmen
    for (const a of div.querySelectorAll(".h2")) {
      // ermitteln, ob unterhalb Links der Klasse add sind
      let icon = "level1";
      let next = a.nextSibling;
      while (next && !next.classList.contains("h2")) {
        if (next.classList.contains("add")) {
          icon = "level2";
          break;
        }
        next = next.nextSibling;
      }
      // Einzüge setzen
      next = a.nextSibling;
      while (next && !next.classList.contains("h2")) {
        if (next.classList.contains("add")) {
          next.classList.add("level1");
        } else {
          next.classList.add(icon);
        }
        next = next.nextSibling;
      }
    }
    // Navigation positionieren
    const rect = sektion.aktiv.getBoundingClientRect();
    if (rect.top + nd.offsetHeight < window.innerHeight) {
      // an der oberen Kante des aktiven Menüpunkts ausrichten
      nd.style.top = `${rect.top}px`;
    } else if (rect.bottom - nd.offsetHeight < 130) {
      // an der oberen Kante der Navigation ausrichten
      nd.style.top = "130px";
    } else {
      // an der unteren Kante des aktiven Menüpunkts ausrichten
      nd.style.top = `${rect.bottom - nd.offsetHeight}px`;
    }
    // Navigation einblenden
    nd.style.left = `${250 - nd.offsetWidth}px`; // 250px = Breite Haupt-Navigation
    setTimeout(() => {
      nd.style.left = "265px";
    }, 0);
    // ersten Link fokussieren
    div.querySelector("a").focus();
  },

  // Navi-Details: Infos zur aktiven Sektion ermitteln
  naviDetailsAktiv () {
    const aktiv = document.querySelector("nav > ul a.aktiv");
    let id = "";
    if (aktiv) {
      id = "sektion-" + aktiv.getAttribute("href").substring(1);
    }
    return {
      aktiv,
      id,
    };
  },

  // Navi-Details: Anzeige schließen
  naviDetailsAus () {
    const nd = document.getElementById("navi-details");
    if (!nd) {
      return;
    }
    nd.style.left = `${250 - nd.offsetWidth}px`;
    clearTimeout(hilfe.naviDetailsTimeout);
    hilfe.naviDetailsTimeout = setTimeout(() => {
      nd.parentNode.removeChild(nd);
      const aus = document.querySelectorAll(".nav-details-toggle-aus");
      for (const i of aus) {
        // schaltet man schnell um, könnten durchaus mehrere vorhanden sein
        i.classList.remove("nav-details-toggle-aus");
      }
    }, 500);
  },

  // ermittelt die aktive Sektion
  sektionAktiv () {
    const sek = document.querySelectorAll("section");
    for (let i = 0, len = sek.length; i < len; i++) {
      if (!sek[i].classList.contains("aus")) {
        return sek[i].id.replace(/^sektion-/, "");
      }
    }
    return "";
  },

  // Sektion wechseln
  //   sektion = String
  //     (Hinweis auf die Sektion, die eingeblendet werden soll)
  //   history = false | undefined
  //     (die Bewegung soll gemerkt werden)
  sektionWechseln (sektion, history = true) {
    // History: Position merken
    if (history) {
      hilfe.history("");
    }
    // Suchleiste ggf. schließen
    if (document.getElementById("suchleiste")) {
      suchleiste.ausblenden();
    }
    // Detail-Navigation ggf. schließen
    hilfe.naviDetailsAus();
    // Navigation auffrischen
    document.querySelectorAll("nav a.kopf").forEach(function (i) {
      if (i.getAttribute("href") === `#${sektion}`) {
        i.classList.add("aktiv");
      } else {
        i.classList.remove("aktiv");
      }
    });
    // Sektionen ein- bzw. ausblenden
    document.querySelectorAll("section").forEach(function (i) {
      if (i.id === `sektion-${sektion}`) {
        i.classList.remove("aus");
      } else {
        i.classList.add("aus");
      }
    });
    // nach oben scrollen
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    // History: Pfeile auffrischen
    hilfe.historyArrows();
    // Suche: ggf. Link fokussieren
    if (!history && sektion === "suche") {
      hilfe.sucheFokus();
    }
  },

  // lange Dateipfade umbrechen
  dateiBreak () {
    document.querySelectorAll(".datei").forEach(function (i) {
      if (i.innerText.length > 30) {
        i.classList.add("long");
      }
    });
  },

  // speichert den Timeout für das Ausblenden des Bildes
  bildTimeout: null,

  // Vorschau-Bild auf Klick vergrößern und über die Seite legen
  //   fig = Element
  //     (das <figure>-Element, auf das geklickt wurde)
  bild (fig) {
    // Rahmen
    let div = document.getElementById("bild");
    let schonAn = true;
    if (!div) {
      div = document.createElement("div");
      document.body.appendChild(div);
      div.id = "bild";
      schonAn = false;
    }
    div.replaceChildren();
    // Content
    const cont = document.createElement("div");
    div.appendChild(cont);
    cont.id = "bild-cont";
    // Bild und Beschreibung einhängen
    const h2 = document.createElement("h2");
    cont.appendChild(h2);
    h2.textContent = fig.querySelector("figcaption").textContent;
    cont.appendChild(fig.querySelector("img").cloneNode());
    // Schließen-Icon
    const schliessen = document.createElement("img");
    cont.appendChild(schliessen);
    schliessen.id = "bild-schliessen";
    schliessen.src = "../img/x-dick-48.svg";
    schliessen.width = "48";
    schliessen.height = "48";
    schliessen.title = "Bild schließen (Esc)";
    schliessen.addEventListener("click", () => hilfe.bildSchliessen());
    tooltip.init(cont);
    // ggf. Icons zum Navigieren durch eine Bilderstrecke
    hilfe.bilder(fig, cont);
    // Einblenden
    if (!schonAn) {
      setTimeout(() => div.classList.add("einblenden"), 0);
    }
  },

  // speichert die <figure>, die dem angezeigten Bild in einer Bilderstrecke
  // vorangeht bzw. folgt
  bilderData: {
    prev: null,
    next: null,
  },

  // ggf. Navigationsbilder für eine Bilderstrecke einbauen
  //   fig = Element
  //     (angeklickte <figure>)
  //   cont = Element
  //     (#bild-cont, also der Container, in dem das Bild groß angezeigt wird)
  bilder (fig, cont) {
    if (!fig.parentNode.classList.contains("bilder")) {
      return;
    }
    // Position ermitteln, an der sich das geöffnete Bild befindet
    const figs = fig.parentNode.querySelectorAll("figure");
    for (let i = 0, len = figs.length; i < len; i++) {
      if (figs[i] === fig) {
        hilfe.bilderData.prev = null;
        hilfe.bilderData.next = null;
        if (i > 0) {
          hilfe.bilderData.prev = figs[i - 1];
        }
        if (i + 1 < figs.length) {
          hilfe.bilderData.next = figs[i + 1];
        }
        break;
      }
    }
    // Navigationsbilder einhängen
    const bilder = [ "prev", "next" ];
    for (let i = 0; i < 2; i++) {
      const img = document.createElement("img");
      cont.appendChild(img);
      img.id = `bilder-${bilder[i]}`;
      img.width = "48";
      img.height = "48";
      if (hilfe.bilderData[bilder[i]]) {
        img.src = `../img/pfeil-spitz-${bilder[i] === "next" ? "rechts" : "links"}-48.svg`;
        if (i === 0) {
          img.title = "vorheriges Bild (←)";
        } else {
          img.title = "nächstes Bild (→)";
        }
      } else {
        img.src = `../img/pfeil-spitz-${bilder[i] === "next" ? "rechts" : "links"}-grau-48.svg`;
        if (i === 0) {
          img.title = "kein vorheriges Bild";
        } else {
          img.title = "kein nächstes Bild";
        }
      }
      hilfe.bilderNav(img);
    }
    // Tooltips initialisieren
    tooltip.init(cont);
  },

  // Navigation durch die Bilder (Klick auf Icon)
  //   img = Element
  //     (Navigationsbild, auf das geklickt wurde)
  bilderNav (img) {
    img.addEventListener("click", function () {
      const dir = this.id.match(/.+-(.+)/)[1];
      if (hilfe.bilderData[dir]) {
        hilfe.bild(hilfe.bilderData[dir]);
      }
    });
  },

  // Navigation durch die Bilder (Cursor)
  //   evt = Object
  //     (Event-Object des keydown)
  bilderTastatur (evt) {
    if (!document.getElementById("bild")) {
      return;
    }
    const aktionen = {
      ArrowLeft: "prev",
      ArrowRight: "next",
    };
    const dir = aktionen[evt.key];
    if (hilfe.bilderData[dir]) {
      hilfe.bild(hilfe.bilderData[dir]);
    }
  },

  // schließt das vergrößte Vorschau-Bild
  bildSchliessen () {
    const bild = document.getElementById("bild");
    bild.classList.remove("einblenden");
    clearTimeout(hilfe.bildTimeout);
    hilfe.bildTimeout = setTimeout(() => bild.parentNode.removeChild(bild), 200);
  },

  // Variable, in der der Timeout der Suche gespeichert wird
  sucheTimeout: null,

  // Listener, über den die Suchfunktion angestoßen wird
  //   input = Element
  //     (das Suchfeld)
  sucheListener (input) {
    input.addEventListener("input", function () {
      clearTimeout(hilfe.sucheTimeout);
      hilfe.sucheTimeout = setTimeout(function () {
        hilfe.suche();
      }, 250);
    });
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Enter") {
        clearTimeout(hilfe.sucheTimeout);
        hilfe.suche(true);
      }
    });
    input.addEventListener("focus", function () {
      this.select();
      if (document.getElementById("suchleiste")) {
        suchleiste.ausblenden();
      }
    });
  },

  // Cache der Suchergebnisse
  suchergebnis: {
    val: "", // letzter bereinigter Suchwert
    scroll: 0, // Scrollposition vor dem Wechseln aus der Suchliste
    reg: [], // Liste der regulären Ausdrücke
    regPhrase: null, // regulärer Ausdruck für den gesamten Suchtext
    treffer: [], // Treffer
    lastClick: -1, // Index des letzten Klicks (verweist auf suchergebnis.treffer)
  },

  // Dokument durchsuchen
  //   enter = Boolean
  //     (die Suche wurde via Enter angestoßen)
  suche (enter) {
    // Suchtext ermitteln
    const feld = document.getElementById("suchfeld");
    const val = helfer.textTrim(feld.value, true);
    // erst ab 3 Buchstaben suchen
    if (!val || val.length < 3) {
      hilfe.suchergebnis.val = ""; // damit nach dem Löschen des Suchfelds dasselbe Wort wieder gesucht werden kann
      feld.parentNode.classList.remove("lupe");
      return;
    }
    // Wert ist identisch mit der vorherigen Suche => einfach zur Ergebnisseite wechseln
    if (hilfe.suchergebnis.val === val) {
      hilfe.sucheWechseln();
      return;
    }
    // Lupe einblenden
    feld.parentNode.classList.add("lupe");
    // Cache vorbereiten
    hilfe.suchergebnis = {
      val,
      scroll: 0,
      reg: [],
      regPhrase: null,
      treffer: [],
      lastClick: -1,
    };
    const e = hilfe.suchergebnis;
    if (/\s/.test(val)) { // nur, wenn es mehrere Wörter gibt
      e.regPhrase = new RegExp(helfer.escapeRegExp(val), "gi");
    }
    // reguläre Ausdrücke
    const val_sp = val.split(/\s/);
    val_sp.sort(helfer.sortLengthAlpha);
    for (let i = 0, len = val_sp.length; i < len; i++) {
      const reg = new RegExp(helfer.escapeRegExp(val_sp[i]), "gi");
      e.reg.push(reg);
    }
    // Suche durchführen
    const sek_suche = document.querySelectorAll(".suche");
    for (let i = 0, len = sek_suche.length; i < len; i++) {
      const sektion = sek_suche[i].id.replace(/^sektion-/, "");
      const knoten = sek_suche[i].childNodes;
      for (let j = 0, len = knoten.length; j < len; j++) {
        if (/^(DIV|OL|TABLE|UL)$/.test(knoten[j].nodeName)) {
          let knoten_tief = knoten[j].childNodes;
          if (knoten[j].nodeName === "TABLE") {
            knoten_tief = knoten[j].querySelectorAll("tr");
          }
          for (let k = 0, len = knoten_tief.length; k < len; k++) {
            durchsuchen(sektion, knoten_tief[k]);
          }
          continue;
        }
        durchsuchen(sektion, knoten[j]);
      }
    }
    // Treffer sortieren
    e.treffer.sort(function (a, b) {
      if (a.gewicht > b.gewicht) {
        return -1;
      } else if (a.gewicht < b.gewicht) {
        return 1;
      }
      return 0;
    });
    // Treffer drucken
    hilfe.sucheDrucken(0);
    // ggf. den ersten Treffer fokussieren
    if (enter) {
      hilfe.sucheFokus();
    }
    // Text durchsuchen, Treffer merken
    function durchsuchen (sektion, knoten) {
      if (knoten.nodeType !== 1) {
        return;
      }
      const text = helfer.textTrim(knoten.innerText, true);
      let gewicht = 0;
      let regs = 0; // Anzahl der regulären Ausdrücke, die Treffer produzierten
      let idx = -1;
      for (let i = 0, len = e.reg.length; i < len; i++) {
        const s = text.match(e.reg[i]);
        if (s) {
          regs++;
          gewicht += s.length; // Anzahl der Treffer im Textausschnitt
          const idx_tmp = text.split(e.reg[i])[0].length;
          if (idx === -1 || idx_tmp < idx) {
            idx = idx_tmp;
          }
        }
      }
      gewicht *= regs; // Anzahl Treffer im Textausschnitt multipliziert mal Anzahl der regulären Ausdrücke, die Treffer produzieren
      if (knoten.nodeName === "H2") {
        gewicht *= 10; // Treffer in Überschriften höher gewichten
      } else if (/erklaerung-(icon|option)/.test(knoten.getAttribute("class"))) {
        gewicht *= 5; // Treffer in Erklärungsköpfen höher gewichten
      } else if (knoten.nodeName === "FIGURE") {
        gewicht *= 2; // Treffer in Abbildungsunterschriften höher gewichten
      }
      if (e.regPhrase && text.match(e.regPhrase)) {
        gewicht *= 10; // Treffer mit komplettem Suchausdruck höher gewichten
        idx = text.split(e.regPhrase)[0].length;
      }
      // Treffer!
      if (gewicht) {
        // Textausschnitt erzeugen
        let ausschnitt = text.substring(idx - 65, idx - 65 + 150);
        if (idx - 65 > 0) {
          ausschnitt = `…${ausschnitt}`;
        }
        if (idx - 65 + 150 < text.length) {
          ausschnitt = `${ausschnitt}…`;
        }
        // Treffer einhängen
        e.treffer.push({
          text: ausschnitt,
          gewicht,
          sektion,
          knoten,
        });
      }
    }
  },

  // Suchtreffer ausdrucken
  sucheDrucken (start) {
    // Ergebnisfeld leeren
    const cont = document.getElementById("suchergebnisse");
    // bei der Erstanzeige Ergebnisfeld leeren und in die Sektion wechseln
    if (start === 0) {
      cont.replaceChildren();
      hilfe.sektionWechseln("suche");
    }
    // keine Treffer
    const e = hilfe.suchergebnis;
    if (!e.treffer.length) {
      const p = document.createElement("p");
      p.classList.add("keine-treffer");
      p.textContent = "keine Treffer";
      cont.appendChild(p);
      return;
    }
    // Treffer drucken
    for (let i = start, len = e.treffer.length; i < len; i++) {
      // immer nur 10 Suchergebnisse auf einmal drucken
      if (i === start + 10) {
        const a = document.createElement("a");
        cont.appendChild(a);
        a.href = "#";
        a.dataset.idx = i;
        a.classList.add("mehr-treffer");
        a.textContent = "mehr Treffer";
        hilfe.sucheNachladen(a);
        break;
      }
      // Treffer erzeugen
      const a = document.createElement("a");
      cont.appendChild(a);
      a.href = "#";
      a.dataset.idx = i;
      hilfe.sucheSprung(a);
      // Treffernummer drucken
      const b = document.createElement("b");
      a.appendChild(b);
      b.textContent = i + 1;
      // Text erzeugen, Suchtreffer markieren und einhängen
      const span = document.createElement("span");
      a.appendChild(span);
      let text = e.treffer[i].text;
      text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;"); // für ursprünglich maskierte Code-Beispiele
      if (e.regPhrase) {
        text = text.replace(e.regPhrase, function (m) {
          return `<mark class="suche">${m}</mark>`;
        });
      }
      for (let j = 0, len = e.reg.length; j < len; j++) {
        text = text.replace(e.reg[j], function (m) {
          return `<mark class="suche">${m}</mark>`;
        });
      }
      span.innerHTML = helfer.suchtrefferBereinigen(text);
      // verschachtelte Treffer entfernen
      let inner = span.querySelector(".suche .suche");
      while (inner) {
        const text = document.createTextNode(inner.textContent);
        inner.parentNode.replaceChild(text, inner);
        inner = span.querySelector(".suche .suche");
      }
    }
  },

  // weitere Treffer laden
  //   a = Element
  //     (der Link zum Nachladen der Treffer)
  sucheNachladen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const idx = parseInt(this.dataset.idx, 10);
      this.parentNode.removeChild(this);
      hilfe.sucheDrucken(idx);
      hilfe.suchergebnis.lastClick = idx;
      hilfe.sucheFokus();
    });
  },

  // zur Stelle im Text springen, in der der Treffer zu finden ist
  //   a = Element
  //     (Link mit der Vorschau des Treffers)
  sucheSprung (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Scroll-Position sichern
      hilfe.suchergebnis.scroll = window.scrollY;
      // Sektion wechseln und zum Treffer-Knoten wechseln
      const idx = parseInt(this.dataset.idx, 10);
      const sektion = hilfe.suchergebnis.treffer[idx].sektion;
      const knoten = hilfe.suchergebnis.treffer[idx].knoten;
      hilfe.sektionWechseln(sektion);
      window.scrollTo({
        left: 0,
        top: knoten.getBoundingClientRect().top - 70 - 10, // -10, um oben immer ein bisschen padding zu haben; vgl. hilfe.naviSprung()
        behavior: "smooth",
      });
      // merken, welche Treffer angeklickt wurde
      hilfe.suchergebnis.lastClick = idx;
      // Treffer-Knoten animieren
      knoten.classList.add("treffer-vor");
      setTimeout(function () {
        knoten.classList.add("treffer", "treffer-nach");
        setTimeout(function () {
          knoten.classList.remove("treffer");
          setTimeout(function () {
            knoten.classList.remove("treffer-vor", "treffer-nach");
          }, 1500);
        }, 1500);
      }, 500);
    });
  },

  // in die Suchsektion wechseln
  sucheWechseln () {
    hilfe.sektionWechseln("suche");
    window.scrollTo({
      left: 0,
      top: hilfe.suchergebnis.scroll,
      behavior: "auto",
    });
    hilfe.sucheFokus();
  },

  // zuletzt fokussierten Link in der Suche wieder fokussieren
  sucheFokus () {
    if (hilfe.suchergebnis.treffer.length) {
      let idx = hilfe.suchergebnis.lastClick;
      if (idx === -1) {
        idx = 0;
      }
      document.querySelectorAll("#suchergebnisse a")[idx].focus();
    }
  },

  // Daten
  historyData: {
    pos: [], // Positionen in der Liste
    akt: -1, // aktuelle Position in der Liste
    scrollAktiv: false, // speichert, ob gerade gescrollt wird
    scrollInterval: null, // Intervall, der schaut, ob scrollAktiv noch true ist
    scrollCheck: null, // Timeout, der das Ende des Scrollen feststellt und scrollAktiv auf false setzt
  },

  // aktuelle Position merken, wenn über einen Link ein Sprung ausgeführt wird
  //   sek = String
  //     (die derzeit aktive Sektion)
  history (sek) {
    // ggf. die aktive Sektion ermitteln
    if (!sek) {
      sek = hilfe.sektionAktiv();
    }
    // Speicherobjekt erstellen
    const posNeu = {
      scrollY: window.scrollY,
      section: sek,
    };
    // ggf. die History-Daten kürzen;
    const pos = hilfe.historyData.pos;
    const akt = hilfe.historyData.akt;
    if (akt < pos.length - 1) {
      pos.splice(akt + 1);
    }
    // identische Einträge nicht aufnehmen, ggf. Misserfolg melden
    if (pos.length &&
        pos[pos.length - 1].scrollY === posNeu.scrollY &&
        pos[pos.length - 1].section === posNeu.section) {
      return false;
    }
    // Daten anhängen
    pos.push(posNeu);
    hilfe.historyData.akt++;
    // Erfolg melden
    return true;
  },

  // zur vorherigen/nächsten Position in der History-Liste springen
  //   next = Boolean
  //     (zur nächsten Position springen)
  historyNavi (next) {
    const pos = hilfe.historyData.pos;
    let akt = hilfe.historyData.akt;
    if (next) { // vorwärts
      akt++;
    } else { // rückwärts
      if (pos.length &&
          akt === pos.length - 1 &&
          hilfe.history("")) {
        akt++;
      }
      akt--;
    }
    if (!pos[akt]) {
      return;
    }
    const ziel = pos[akt];
    // Postion in der History auffrischen
    hilfe.historyData.akt = akt;
    // ggf. zur Sektion wechseln
    if (ziel.section !== hilfe.sektionAktiv()) {
      hilfe.sektionWechseln(ziel.section, false);
    }
    // Scroll-Position wiederherstellen
    window.scrollTo({
      left: 0,
      top: ziel.scrollY,
      behavior: "smooth",
    });
    // Pfeile auffrischen (nachdem der Scroll beendet wurde)
    hilfe.historyScrollArrows();
  },

  // frischt die Pfeile auf, sobald der Scroll beendet wurde
  historyScrollArrows () {
    hilfe.historyData.scrollAktiv = true;
    hilfe.historyData.scrollInterval = setInterval(() => {
      if (hilfe.historyData.scrollAktiv) {
        return;
      }
      clearInterval(hilfe.historyData.scrollInterval);
      document.removeEventListener("scroll", hilfe.historyScroll);
      hilfe.historyArrows();
    }, 10);
    document.addEventListener("scroll", hilfe.historyScroll);
  },

  // überprüft, ob der Scroll vorbei ist
  historyScroll () {
    clearTimeout(hilfe.historyData.scrollCheck);
    hilfe.historyData.scrollCheck = setTimeout(() => {
      hilfe.historyData.scrollAktiv = false;
    }, 25);
  },

  // Pfeilfarbe anpassen
  historyArrows () {
    const data = hilfe.historyData;
    const back = document.getElementById("navi-back");
    const forward = document.getElementById("navi-forward");
    // aktuelle Position
    const section = hilfe.sektionAktiv();
    const scrollY = window.scrollY;
    // rückwärts
    if (data.pos.length > 1 && data.akt > 0 ||
        data.pos.length === 1 && (data.pos[0].section !== section || data.pos[0].scrollY !== scrollY)) {
      back.classList.add("navigierbar");
    } else {
      back.classList.remove("navigierbar");
    }
    // vorwärts
    if (data.akt >= 0 && data.akt < data.pos.length - 1) {
      forward.classList.add("navigierbar");
    } else {
      forward.classList.remove("navigierbar");
    }
  },
};
