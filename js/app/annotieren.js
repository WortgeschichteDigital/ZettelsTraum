"use strict";

let annotieren = {
  // versucht ein <mark class="user"> im markierten Text zu erzeugen
  makeUser () {
    if (helfer.hauptfunktion === "liste" && !optionen.data.belegliste.trennung ||
        helfer.hauptfunktion !== "liste" && !optionen.data.beleg.trennung) {
      annotieren.unmoeglich();
      return;
    }
    let sel = window.getSelection(),
      range = sel.getRangeAt(0),
      mark = document.createElement("mark");
    mark.classList.add("user");
//     try {
      range.surroundContents(mark);
      range.collapse();
      annotieren.mod(mark);
      annotieren.ausfuehren();
//     } catch (err) {
//       dialog.oeffnen({
//         typ: "alert",
//         text: `Die Markierung kann an dieser Position nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\n${err.name}: ${err.message}`,
//       });
//     }
  },
  // Meldung, dass das Annotieren nicht möglich ist
  unmoeglich () {
    dialog.oeffnen({
      typ: "alert",
      text: `Das Annotieren ist nur möglich, wenn Trennstriche und Seitenumbrüche sichtbar sind.\nSie müssen zunächst die Funktion <img src="img/trennzeichen.svg" width="24" height="24" alt=""> aktivieren.`,
    });
  },
  // Annotierung initialisieren
  //   p = Element
  //     (Absatz, in dem sich markierte Wörter befinden können)
  init (p) {
    p.querySelectorAll("mark.wort, mark.user").forEach(function(i) {
      i.addEventListener("click", function() {
        annotieren.mod(this);
      });
    });
  },
  // speichert wichtige Elemente und Werte, mit denen später gearbeitet wird
  data: {
    cl: "", // class der Markierung (wort || user)
    p: null, // Absatz mit dem <mark>
    data: null, // der die <mark> umschließende Datenknoten (.annotierung-wort)
    start: null, // erster <mark>
    startN: -1, // Nummer des ersten <mark> im Absatz
    ende: null, // letzter <mark> (kann identisch sein mit start)
    endeN: -1, // Nummer des letzten <mark> im Absatz (kann identisch sein mit startN)
  },
  // alle <mark> suchen, die gerade annotiert werden
  //   w = Element
  //     (<mark class="wort || user">, auf den geklickt wurde)
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
    let marks = p.querySelectorAll(`mark.${annotieren.data.cl}`),
      posStart = -1,
      posEnde = -1;
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
  //     (<mark class="wort || user">, auf den geklickt wurde)
  mod (w) {
    if (helfer.hauptfunktion === "liste" && !optionen.data.belegliste.trennung ||
        helfer.hauptfunktion !== "liste" && !optionen.data.beleg.trennung) {
      annotieren.unmoeglich();
      return;
    }
    // Marks ermitteln
    annotieren.getMarks(w);
    // Werte auslesen (falls vorhanden)
    let werte = {
      farbe: 1,
      taggen: true,
      text: "",
    };
    let data = annotieren.data.data;
    if (data) {
      let farbe = data.getAttribute("class").match(/farbe([0-9]{1})/);
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
    let span = document.createElement("span");
    span.id = "annotierung-wort";
    span.addEventListener("mouseover", evt => evt.stopPropagation());
    // Schließen-Icon
    let img = document.createElement("img");
    span.appendChild(img);
    img.src = "img/x.svg";
    img.width = "24";
    img.height = "24";
    img.title = "Popup schließen (Esc)";
    // Farben
    for (let i = 0; i < 5; i++) {
      let farbe = document.createElement("span");
      span.appendChild(farbe);
      farbe.classList.add("farbe", `farbe${i}`);
      if (werte.farbe === i) {
        farbe.classList.add("aktiv");
      }
    }
    // Checkbox "nicht taggen"
    let nichtTaggen = document.createElement("span");
    span.appendChild(nichtTaggen);
    nichtTaggen.classList.add("check");
    let input = document.createElement("input");
    nichtTaggen.appendChild(input);
    input.id = "annotierung-nicht-taggen";
    input.type = "checkbox";
    if (!werte.taggen) {
      input.checked = true;
    }
    let label = document.createElement("label");
    nichtTaggen.appendChild(label);
    label.setAttribute("for", "annotierung-nicht-taggen");
    label.textContent = "nicht taggen";
    // Text
    let txt = document.createElement("span");
    span.appendChild(txt);
    txt.classList.add("text");
    if (werte.text) {
      txt.textContent = werte.text;
    } else {
      txt.classList.add("leer");
      txt.textContent = "Notiz hinzufügen";
    }
    // Position der UI festlegen
    let pos = [],
      knoten = null;
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
    let aw = document.getElementById("annotierung-wort");
    aw.addEventListener("click", evt => evt.stopPropagation()); // sonst wird das Popup bei jedem Klick neu aufgebaut
    aw.querySelector("img").addEventListener("click", () => annotieren.modSchliessen()); // Schließen-Icon
    aw.querySelectorAll(".farbe").forEach(i => annotieren.modFarbe(i)); // Farbkästchen
    aw.querySelector("#annotierung-nicht-taggen").addEventListener("click", function() {
      
      annotieren.ausfuehren();
    }); // Checkbox
    annotieren.modText(aw.querySelector(".text")); // Textfeld
  },
  // Annotierungs-Popup schließen
  modSchliessen () {
    let aw = document.getElementById("annotierung-wort");
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
    f.addEventListener("click", function() {
      this.parentNode.querySelector(".aktiv").classList.remove("aktiv");
      this.classList.add("aktiv");
      annotieren.ausfuehren();
    });
  },
  // Text der Annotierung ändern
  //   t = Element
  //     (das Textfeld)
  modText (t) {
    t.addEventListener("click", function() {
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
      let edit = document.createElement("input");
      this.replaceChild(edit, this.firstChild);
      edit.type = "text";
      edit.value = text;
      edit.focus();
      edit.addEventListener("input", function() {
        this.classList.add("changed");
      });
      edit.addEventListener("keydown", function(evt) {
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
  //     (Taste, die gedrückt wurde: "Enter" || "Escape")
  //   text = String || undefined
  //     (der Originaltext, der vor dem Speichern im Feld stand)
  modTextSpeichern (input, key, text = "") {
    let textNeu = helfer.textTrim(input.value, true),
      feld = input.parentNode;
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
    let aw = document.getElementById("annotierung-wort");
    let werte = {
      farbe: 1,
      taggen: aw.querySelector("#annotierung-nicht-taggen:checked") ? false : true,
      text: "",
    };
    // Text ermitteln
    let feld = aw.querySelector(".text");
    if (feld.firstChild.nodeType === 1) { // Textfeld ist noch aktiv
      annotieren.modTextSpeichern(feld.firstChild, 13);
      return;
    }
    if (!feld.classList.contains("leer")) {
      werte.text = feld.textContent;
    }
    // Farbe ermitteln
    let farben = aw.querySelectorAll(".farbe");
    for (let i = 0, len = farben.length; i < len; i++) {
      if (farben[i].classList.contains("aktiv")) {
        werte.farbe = i;
        break;
      }
    }
    // Anzeige auffrischen
    const cl = annotieren.data.cl;
    if (cl === "user" && werte.farbe === 0 && werte.taggen && !werte.text) { // Annotierung entfernen (user)
      let frag = document.createDocumentFragment(),
        start = annotieren.data.start;
      for (let i of start.childNodes) {
        if (i.id === "annotierung-wort") {
          continue;
        }
        frag.appendChild(i.cloneNode(true));
      }
      let data = annotieren.data.data;
      data.parentNode.replaceChild(frag, data);
    } else if (cl === "wort" && werte.farbe === 1 && werte.taggen && !werte.text) { // Annotierung entfernen (wort)
      let data = annotieren.data.data;
      if (!data) {
        // noch keine Annotierung vorhanden => nichts entfernen und nichts auffrischen
        // (kann passieren, wenn Popup geöffnet, Textfeld fokussiert und dann Esc gedrückt;
        // oder Popup geöffnet, auf das gelbe Quadrat geklickt)
        return;
      }
      let frag = document.createDocumentFragment();
      annotieren.data.start = null;
      annotieren.data.ende = null;
      for (let i of data.childNodes) {
        let klon = i.cloneNode(true);
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
      let data = annotieren.data.data;
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
      let annotierung = document.createElement("span");
      annotierung.classList.add("annotierung-wort", `farbe${werte.farbe}`);
      if (werte.text) {
        annotierung.title = werte.text;
      }
      if (!werte.taggen) {
        annotierung.dataset.nichtTaggen = "true";
      }
      // Knoten ersetzen
      if (annotieren.data.start === annotieren.data.ende) { // nur ein <mark>
        let mark = annotieren.data.start,
          klon = mark.cloneNode(true);
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
        let start = false,
          ende = false,
          iStart = -1,
          iEnde = -1;
        for (let i = 0, len = parent.childNodes.length; i < len; i++) {
          if (ende) {
            break;
          }
          let n = parent.childNodes[i];
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
        let marks = annotierung.querySelectorAll(`mark.${annotieren.data.cl}`);
        annotieren.data.start = marks[0];
        annotieren.data.ende = marks[marks.length - 1];
      }
      annotieren.data.data = annotierung;
      // Events auffrischen
      events();
    }
    // Belegtext ermitteln
    let p = annotieren.data.p,
      bs = "";
    if (!p.dataset.id) { // Karteikarte
      bs = document.getElementById("beleg-bs").value;
    } else { // Belegliste
      bs = data.ka[p.dataset.id].bs;
    }
    // Absatz-Text ermitteln
    let klon = p.cloneNode(true),
      awKlon = klon.querySelector("#annotierung-wort");
    if (awKlon) {
      awKlon.parentNode.removeChild(awKlon);
    }
    let text = klon.innerHTML;
    while (/<mark class="(wort|such)/.test(text)) {
      text = text.replace(/<mark class="(wort|such).*?">(.+?)<\/mark>/, function(m, p1, p2) {
        return p2;
      });
    }
    // Ergebnis in Datensatz eintragen
    let absaetze = bs.replace(/\n\s*\n/g, "\n").split("\n");
    absaetze[parseInt(p.dataset.pnumber, 10)] = text;
    bs = absaetze.join("\n\n");
    if (!p.dataset.id) { // Karteikarte
      document.getElementById("beleg-bs").value = bs;
      beleg.data.bs = bs;
      beleg.belegGeaendert(true);
    } else { // Belegliste
      data.ka[p.dataset.id].bs = bs; // Belegtext
      data.ka[p.dataset.id].dm = new Date().toISOString(); // Änderungsdatum
      kartei.karteiGeaendert(true);
    }
    // Filterleiste neu aufbauen
    // (es wäre performanter filter.aufbauen(belege) zu benutzen; dann gibt es aber
    // Probleme, wenn nach Annotierungen gefiltert wird und die letzte Annotierung entfernt wurde)
    liste.status(true);
    // Events auffrischen
    function events () {
      let marks = annotieren.data.p.querySelectorAll(`mark.${annotieren.data.cl}`);
      for (let i = annotieren.data.startN; i <= annotieren.data.endeN; i++) {
        listener(marks[i]);
      }
      annotieren.modEvents();
    }
    function listener (m) {
      m.addEventListener("click", function() {
        annotieren.mod(this);
      });
    }
  },
};
