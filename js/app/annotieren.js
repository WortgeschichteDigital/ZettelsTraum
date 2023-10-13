"use strict";

const annotieren = {
  // versucht ein <mark class="user"> im markierten Text zu erzeugen
  makeUser () {
    if (helfer.hauptfunktion === "liste" && !optionen.data.belegliste.trennung ||
        helfer.hauptfunktion !== "liste" && !optionen.data.beleg.trennung) {
      annotieren.unmoeglich();
      return;
    }
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const mark = document.createElement("mark");
    mark.classList.add("user");
    try {
      range.surroundContents(mark);
    } catch (err) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Annotierung kann mit dieser Textauswahl nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung",
      });
      return;
    }
    range.collapse();
    annotieren.mod(mark);
    annotieren.ausfuehren();
  },

  // Meldung, dass das Annotieren nicht möglich ist
  unmoeglich () {
    dialog.oeffnen({
      typ: "alert",
      text: "Das Annotieren ist nur möglich, wenn Trennstriche und Seitenumbrüche sichtbar sind.\nSie müssen zunächst die Funktion <img src='img/trennzeichen.svg' width='24' height='24' alt=''> aktivieren.",
    });
  },

  // Annotierung initialisieren
  //   p = Element
  //     (Absatz, in dem sich markierte Wörter befinden können)
  init (p) {
    p.querySelectorAll("mark.wort, mark.user").forEach(function (i) {
      i.addEventListener("click", function () {
        annotieren.mod(this);
      });
    });
  },

  // speichert wichtige Elemente und Werte, mit denen später gearbeitet wird
  data: {
    cl: "", // class der Markierung (wort | user)
    p: null, // Absatz mit dem <mark>
    data: null, // der die <mark> umschließende Datenknoten (.annotierung-wort)
    start: null, // erster <mark>
    startN: -1, // Nummer des ersten <mark> im Absatz
    ende: null, // letzter <mark> (kann identisch sein mit start)
    endeN: -1, // Nummer des letzten <mark> im Absatz (kann identisch sein mit startN)
  },

  // alle <mark> suchen, die gerade annotiert werden
  //   w = Element
  //     (<mark class="wort | user">, auf den geklickt wurde)
  getMarks (w) {
    // Klasse ermitteln
    if (w.classList.contains("wort")) {
      annotieren.data.cl = "wort";
    } else {
      annotieren.data.cl = "user";
    }
    // Absatz ermitteln
    let p = w.parentNode;
    while (p.nodeName !== "P") {
      p = p.parentNode;
    }
    annotieren.data.p = p;
    // ersten und letzten Mark ermitteln
    const marks = p.querySelectorAll(`mark.${annotieren.data.cl}`);
    let posStart = -1;
    let posEnde = -1;
    for (let i = 0, len = marks.length; i < len; i++) {
      if (marks[i] === w) {
        posStart = i;
        break;
      }
    }
    while (marks[posStart].classList.contains(`${annotieren.data.cl}-kein-start`)) {
      posStart--;
    }
    posEnde = posStart;
    while (marks[posEnde].classList.contains(`${annotieren.data.cl}-kein-ende`)) {
      posEnde++;
    }
    annotieren.data.start = marks[posStart];
    annotieren.data.startN = posStart;
    annotieren.data.ende = marks[posEnde];
    annotieren.data.endeN = posEnde;
    // Datenknoten suchen
    let data = marks[posStart].parentNode;
    while (data.nodeType === 3 || !data.classList.contains("annotierung-wort")) {
      if (data.nodeName === "P") {
        data = null;
        break;
      }
      data = data.parentNode;
    }
    annotieren.data.data = data;
  },

  // Popup für die Annotierung aufbauen
  //   w = Element
  //     (<mark class="wort | user">, auf den geklickt wurde)
  mod (w) {
    if (helfer.hauptfunktion === "liste" && !optionen.data.belegliste.trennung ||
        helfer.hauptfunktion !== "liste" && !optionen.data.beleg.trennung) {
      annotieren.unmoeglich();
      return;
    }

    // Marks ermitteln
    annotieren.getMarks(w);

    // Werte auslesen (falls vorhanden)
    const werte = {
      farbe: 1,
      taggen: true,
      text: "",
    };
    const data = annotieren.data.data;
    if (data) {
      const farbe = data.getAttribute("class").match(/farbe([0-9]{1})/);
      werte.farbe = parseInt(farbe[1], 10);
      if (data.dataset.tooltip) {
        werte.text = data.dataset.tooltip.replace(/\/<wbr>/g, "/");
      }
      if (data.dataset.nichtTaggen === "true") {
        werte.taggen = false;
      }
    }

    // UI ggf. entfernen
    annotieren.modSchliessen();

    // UI erstellen
    const span = document.createElement("span");
    span.id = "annotierung-wort";
    span.addEventListener("mouseover", evt => evt.stopPropagation());

    // Farben
    for (let i = 0; i < 5; i++) {
      const farbe = document.createElement("span");
      span.appendChild(farbe);
      farbe.classList.add("farbe", `farbe${i}`);
      if (werte.farbe === i) {
        farbe.classList.add("aktiv");
      }
    }

    // Icons
    const icons = document.createElement("span");
    span.appendChild(icons);
    icons.classList.add("icons");
    const iconsList = [
      {
        cl: "loeschen",
        svg: "muelleimer.svg",
        title: "Annotierung löschen",
      },
      {
        cl: "schliessen",
        svg: "x-dick.svg",
        title: "Popup schließen (Esc)",
      },
    ];
    for (const i of iconsList) {
      const img = document.createElement("img");
      icons.appendChild(img);
      img.classList.add(i.cl);
      img.src = "img/" + i.svg;
      img.width = "24";
      img.height = "24";
      img.title = i.title;
    }

    // Checkbox "nicht taggen"
    const nichtTaggen = document.createElement("span");
    span.appendChild(nichtTaggen);
    nichtTaggen.classList.add("check");
    const input = document.createElement("input");
    nichtTaggen.appendChild(input);
    input.id = "annotierung-nicht-taggen";
    input.type = "checkbox";
    if (!werte.taggen) {
      input.checked = true;
    }
    const label = document.createElement("label");
    nichtTaggen.appendChild(label);
    label.setAttribute("for", "annotierung-nicht-taggen");
    label.textContent = "nicht taggen";

    // Text
    const txt = document.createElement("span");
    span.appendChild(txt);
    txt.classList.add("text");
    if (werte.text) {
      txt.textContent = werte.text;
    } else {
      txt.classList.add("leer");
      txt.textContent = "Notiz hinzufügen";
    }

    // Position der UI festlegen
    const pos = [];
    let knoten = null;
    if (annotieren.data.start.offsetLeft < 187) { // links neben der Markierung
      pos.push("links");
      knoten = annotieren.data.start;
    } else { // rechts neben der Markierung
      pos.push("rechts");
      knoten = annotieren.data.ende;
    }
    if (knoten.offsetTop < 91) {
      pos.push("unten");
    } else {
      pos.push("oben");
    }
    span.classList.add(pos.join("-"));

    // Popup einhängen und Events anhängen
    knoten.appendChild(span);
    tooltip.init(knoten);
    annotieren.modEvents();
  },

  // Events an das Annotieren-Feld hängen
  modEvents () {
    const aw = document.getElementById("annotierung-wort");

    // ohne stopPropagation() wird das Popup bei jedem Klick neu aufgebaut
    aw.addEventListener("click", evt => evt.stopPropagation());

    // Löschen-Icon
    aw.querySelector(".loeschen").addEventListener("click", () => annotieren.modLoeschen());

    // Schließen-Icon
    aw.querySelector(".schliessen").addEventListener("click", () => annotieren.modSchliessen());

    // Farbkästchen
    aw.querySelectorAll(".farbe").forEach(i => annotieren.modFarbe(i));

    // Checkbox
    aw.querySelector("#annotierung-nicht-taggen").addEventListener("click", () => annotieren.ausfuehren());

    // Textfeld
    annotieren.modText(aw.querySelector(".text"));
  },

  // Annotierung löschen
  modLoeschen () {
    // Notiz als leer markieren
    const aw = document.getElementById("annotierung-wort");
    const text = aw.querySelector(".text");
    if (!text.classList.contains("leer")) {
      text.classList.add("leer");
    }

    // Haken aus Checkbox nehmen
    const nichtTaggen = document.getElementById("annotierung-nicht-taggen");
    if (nichtTaggen.checked) {
      nichtTaggen.checked = false;
    }

    // Standard-Farbe markieren
    aw.querySelector(".aktiv").classList.remove("aktiv");
    const typ = aw.closest("mark").classList.contains("wort") ? "wort" : "user";
    switch (typ) {
      case "wort":
        aw.querySelector(".farbe1").classList.add("aktiv");
        break;
      case "user":
        aw.querySelector(".farbe0").classList.add("aktiv");
        break;
    }

    // Löschen ausführen
    annotieren.ausfuehren();

    // ggf. Popup schließen
    if (!annotieren.data.data) {
      // Das passiert, wenn das Popup für den Typ .wort geöffnet,
      // aber noch keine Annotierung vorgenommen wurde.
      annotieren.modSchliessen();
    }
  },

  // Annotierungs-Popup schließen
  modSchliessen () {
    const aw = document.getElementById("annotierung-wort");
    if (aw) {
      aw.parentNode.removeChild(aw);
      return true;
    }
    return false;
  },

  // Farbe der Annotierung ändern
  //   f = Element
  //     (das <span> für die Farbe)
  modFarbe (f) {
    f.addEventListener("click", function () {
      this.parentNode.querySelector(".aktiv").classList.remove("aktiv");
      this.classList.add("aktiv");
      annotieren.ausfuehren();
    });
  },

  // Text der Annotierung ändern
  //   t = Element
  //     (das Textfeld)
  modText (t) {
    t.addEventListener("click", function () {
      // Edit-Feld schon eingehängt
      if (this.querySelector("input")) {
        return;
      }
      // Container aufbereiten bzw. Text ermitteln
      let text = "";
      if (this.classList.contains("leer")) {
        this.classList.remove("leer");
      } else {
        text = this.textContent;
      }
      // Edit-Feld einhängen
      this.classList.add("aktiv");
      const edit = document.createElement("input");
      this.replaceChild(edit, this.firstChild);
      edit.type = "text";
      edit.value = text;
      edit.focus();
      edit.addEventListener("input", function () {
        this.classList.add("changed");
      });
      edit.addEventListener("keydown", function (evt) {
        tastatur.detectModifiers(evt);
        if (!tastatur.modifiers && /^(Enter|Escape)$/.test(evt.key)) {
          evt.stopPropagation();
          annotieren.modTextSpeichern(this, evt.key, text);
        }
      });
    });
  },

  // Werte aus dem Annotationsfeld übernehmen
  //   input = Element
  //     (das Input-Feld)
  //   key = String
  //     (Taste, die gedrückt wurde: "Enter" | "Escape")
  //   text = String | undefined
  //     (der Originaltext, der vor dem Speichern im Feld stand)
  modTextSpeichern (input, key, text = "") {
    const feld = input.parentNode;
    let textNeu = helfer.textTrim(input.value, true);
    if (key === "Escape") {
      textNeu = text;
    }
    if (!textNeu) {
      feld.classList.add("leer");
      feld.textContent = "Notiz hinzufügen";
    } else {
      feld.textContent = textNeu;
    }
    feld.classList.remove("aktiv");
    annotieren.ausfuehren();
  },

  // Annotierung umsetzen
  ausfuehren () {
    const aw = document.getElementById("annotierung-wort");
    const werte = {
      farbe: 1,
      taggen: aw.querySelector("#annotierung-nicht-taggen:checked") === null,
      text: "",
    };
    // Text ermitteln
    const feld = aw.querySelector(".text");
    if (feld.firstChild.nodeType === 1) { // Textfeld ist noch aktiv
      annotieren.modTextSpeichern(feld.firstChild, 13);
      return;
    }
    if (!feld.classList.contains("leer")) {
      werte.text = feld.textContent;
    }
    // Farbe ermitteln
    const farben = aw.querySelectorAll(".farbe");
    for (let i = 0, len = farben.length; i < len; i++) {
      if (farben[i].classList.contains("aktiv")) {
        werte.farbe = i;
        break;
      }
    }
    // Anzeige auffrischen
    const cl = annotieren.data.cl;
    if (cl === "user" && werte.farbe === 0 && werte.taggen && !werte.text) { // Annotierung entfernen (user)
      const frag = document.createDocumentFragment();
      const start = annotieren.data.start;
      for (const i of start.childNodes) {
        if (i.id === "annotierung-wort") {
          continue;
        }
        frag.appendChild(i.cloneNode(true));
      }
      const data = annotieren.data.data;
      data.parentNode.replaceChild(frag, data);
    } else if (cl === "wort" && werte.farbe === 1 && werte.taggen && !werte.text) { // Annotierung entfernen (wort)
      const data = annotieren.data.data;
      if (!data) {
        // noch keine Annotierung vorhanden => nichts entfernen und nichts auffrischen
        // (kann passieren, wenn Popup geöffnet, Textfeld fokussiert und dann Esc gedrückt;
        // oder Popup geöffnet, auf das gelbe Quadrat geklickt)
        return;
      }
      const frag = document.createDocumentFragment();
      annotieren.data.start = null;
      annotieren.data.ende = null;
      for (const i of data.childNodes) {
        const klon = i.cloneNode(true);
        frag.appendChild(klon);
        let mark = klon;
        if (!mark.classList.contains(cl)) { // falls der <mark> verschachtelt ist in einem Formatierungstag
          mark = mark.querySelector(`.${cl}`);
        }
        if (mark) {
          if (!annotieren.data.start) {
            annotieren.data.start = mark;
          } else {
            annotieren.data.ende = mark;
          }
        }
      }
      if (!annotieren.data.ende) {
        annotieren.data.ende = annotieren.data.start;
      }
      data.parentNode.replaceChild(frag, data);
      annotieren.data.data = null;
      // Events auffrischen
      events();
    } else if (annotieren.data.data) { // Annotierung auffrischen
      const data = annotieren.data.data;
      data.removeAttribute("class");
      data.classList.add("annotierung-wort", `farbe${werte.farbe}`);
      if (werte.text) {
        data.title = werte.text;
      } else {
        data.title = "";
      }
      if (!werte.taggen) {
        data.dataset.nichtTaggen = "true";
      } else if (data?.dataset?.nichtTaggen) {
        delete data.dataset.nichtTaggen;
      }
    } else { // Annotierung vornehmen
      // Annotierung erzeugen
      const annotierung = document.createElement("span");
      annotierung.classList.add("annotierung-wort", `farbe${werte.farbe}`);
      if (werte.text) {
        annotierung.title = werte.text;
      }
      if (!werte.taggen) {
        annotierung.dataset.nichtTaggen = "true";
      }
      // Knoten ersetzen
      if (annotieren.data.start === annotieren.data.ende) { // nur ein <mark>
        const mark = annotieren.data.start;
        const klon = mark.cloneNode(true);
        annotierung.appendChild(klon);
        mark.parentNode.replaceChild(annotierung, mark);
        annotieren.data.start = klon;
        annotieren.data.ende = klon;
      } else { // mehrere <mark>, die über Tag-Grenzen hinweggehen
        // Elternknoten ermitteln
        let parent = annotieren.data.start.parentNode;
        while (!parent.contains(annotieren.data.ende)) {
          parent = parent.parentNode;
        }
        // Knoten kopieren, die umschlossen werden sollen
        let start = false;
        let ende = false;
        let iStart = -1;
        let iEnde = -1;
        for (let i = 0, len = parent.childNodes.length; i < len; i++) {
          if (ende) {
            break;
          }
          const n = parent.childNodes[i];
          if (n === annotieren.data.start ||
              n.contains(annotieren.data.start)) {
            iStart = i;
            start = true;
          }
          if (n === annotieren.data.ende ||
              n.contains(annotieren.data.ende)) {
            iEnde = i;
            ende = true;
          }
          if (!start) {
            continue;
          }
          annotierung.appendChild(n.cloneNode(true));
        }
        // Annotierung einhängen
        parent.insertBefore(annotierung, parent.childNodes[iEnde].nextSibling);
        // alte Knoten entfernen
        for (let i = iEnde; i >= iStart; i--) {
          parent.removeChild(parent.childNodes[i]);
        }
        // Start- und Endknoten neu ermitteln
        const marks = annotierung.querySelectorAll(`mark.${annotieren.data.cl}`);
        annotieren.data.start = marks[0];
        annotieren.data.ende = marks[marks.length - 1];
      }
      annotieren.data.data = annotierung;
      // Events auffrischen
      events();
    }
    // Datensatz auffrischen
    klammern.update(annotieren.data.p);
    // Filterleiste neu aufbauen
    // (es wäre performanter filter.aufbauen(belege) zu benutzen; dann gibt es aber
    // Probleme, wenn nach Annotierungen gefiltert wird und die letzte Annotierung entfernt wurde)
    liste.status(true);
    // Events auffrischen
    function events () {
      const marks = annotieren.data.p.querySelectorAll(`mark.${annotieren.data.cl}`);
      for (let i = annotieren.data.startN; i <= annotieren.data.endeN; i++) {
        listener(marks[i]);
      }
      annotieren.modEvents();
    }
    function listener (m) {
      m.addEventListener("click", function () {
        annotieren.mod(this);
      });
    }
  },
};
