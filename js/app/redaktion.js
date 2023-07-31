"use strict";

let redaktion = {
  // vordefinierte Redaktionsereignisse
  ereignisse: {
    "Kartei erstellt": {
      icon: "dokument-plus.svg",
      textNaechstes: "",
    },
    "Artikel erstellt": {
      icon: "dokument.svg",
      textNaechstes: "Artikel erstellen",
    },
    "Redaktion 1 (Kollegium)": {
      icon: "auge.svg",
      textNaechstes: "Redaktion 1 (durch Kollegium)",
    },
    "Revision 1": {
      icon: "stift-quadrat.svg",
      textNaechstes: "Artikel revidieren",
    },
    "Redaktion 2 (Leitung)": {
      icon: "auge.svg",
      textNaechstes: "Redaktion 2 (durch Leitung)",
    },
    "Revision 2": {
      icon: "stift-quadrat.svg",
      textNaechstes: "Artikel revidieren",
    },
    "Redaktion 3 (Projektleitung)": {
      icon: "auge.svg",
      textNaechstes: "Redaktion 3 (durch Projektleitung)",
    },
    "Revision 3": {
      icon: "stift-quadrat.svg",
      textNaechstes: "Artikel revidieren",
    },
    "Korrekturlesen": {
      icon: "auge.svg",
      textNaechstes: "Artikel Korrektur lesen",
    },
    "Artikel fertig": {
      icon: "check.svg",
      textNaechstes: "Artikel fertigstellen",
    },
    "XML-Auszeichnung": {
      icon: "xml.svg",
      textNaechstes: "XML auszeichnen",
    },
    "Artikel online": {
      icon: "kreis-welt.svg",
      textNaechstes: "Artikel online stellen",
    },
    "Artikel überarbeitet": {
      icon: "pfeil-kreis.svg",
      textNaechstes: "",
    },
  },
  // Schlüssel der Feldtypen ermitteln, die in jedem Eintrag vorhanden sind
  feldtypen: {
    datum: "da",
    ereignis: "er",
    notiz: "no",
    person: "pr",
  },
  // Redaktionsfenster einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Redaktion &gt; Ereignisse</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    let fenster = document.getElementById("redaktion");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // nächstes Ereignis eintragen
    redaktion.next();
    // Tabelle aufbauen + Zeile für neuen Eintrag fokussieren
    redaktion.tabelle();
    document.querySelector('#redaktion-cont-over [data-slot="neu"] input').focus();
    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("redaktion-cont-over"),
    });
  },
  // nächstes Redaktionsereignis im Kopf des Ereignisfenster anzeigen
  next () {
    // Element leeren
    let next = document.getElementById("redaktion-next");
    next.replaceChildren();
    // nächstes Ereignis ermitteln
    let ereignis = redaktion.naechstesEreignis(false).title;
    // Anzeige auffrischen
    let strong = document.createElement("strong");
    next.appendChild(strong);
    strong.textContent = ereignis[0];
    if (ereignis[1]) {
      strong.appendChild(document.createTextNode(":"));
      next.appendChild(document.createTextNode(ereignis[1]));
    } else {
      strong.appendChild(document.createTextNode("!"));
    }
  },
  // erstellt die Tabelle im Redaktionsfenster
  tabelle () {
    // Content leeren
    let cont = document.getElementById("redaktion-cont-over");
    cont.replaceChildren();
    // Tabelle aufbauen und einhängen
    let table = document.createElement("table");
    cont.appendChild(table);
    // Tabellenzellen
    data.rd.er.forEach(function(i, n) {
      let tr = document.createElement("tr");
      table.appendChild(tr);
      tr.dataset.slot = n;
      // Verschiebe-Icon
      if (n < 2) {
        redaktion.zelleErzeugen(tr, " ", false);
      } else {
        redaktion.zelleErzeugen(tr, null, false);
        let a = document.createElement("a");
        tr.lastChild.appendChild(a);
        a.classList.add("icon-link", "icon-redaktion-aufwaerts");
        a.href = "#";
        a.textContent = " ";
        redaktion.eintragVerschieben(a);
      }
      // Datum
      redaktion.zelleErzeugen(tr, redaktion.formatDatum(i.da), false);
      redaktion.wertAendern(tr.lastChild, "datum");
      // Ereignis
      redaktion.zelleErzeugen(tr, i.er, true);
      if (n > 0) {
        redaktion.wertAendern(tr.lastChild, "ereignis");
      }
      // Person
      redaktion.zelleErzeugen(tr, i.pr ? i.pr : "keine Person", false);
      redaktion.wertAendern(tr.lastChild, "person");
      // Notiz
      redaktion.zelleErzeugen(tr, i.no ? i.no : " ", false);
      redaktion.wertAendern(tr.lastChild, "notiz");
      // Lösch-Icon
      if (n === 0) {
        redaktion.zelleErzeugen(tr, " ", false);
      } else {
        redaktion.zelleErzeugen(tr, null, false);
        let a = document.createElement("a");
        tr.lastChild.appendChild(a);
        a.classList.add("icon-link", "icon-redaktion-loeschen");
        a.href = "#";
        a.textContent = " ";
        redaktion.eintragLoeschen(a);
      }
    });
    // Zeile für neuen Eintrag
    redaktion.tabelleNeu(table);
  },
  // Zeile für einen neuen Eintrag erzeugen
  //   table = Element
  //     (die Tabelle)
  tabelleNeu (table) {
    let tr = document.createElement("tr");
    tr.dataset.slot = "neu";
    table.appendChild(tr);
    // Leerzelle (Verschiebe-Icon)
    redaktion.zelleErzeugen(tr, " ", false);
    // Datum
    redaktion.zelleErzeugen(tr, null, false);
    redaktion.inputDate(tr.lastChild, new Date().toISOString().split("T")[0], "neu");
    redaktion.inputSubmit(tr.lastChild.firstChild.id);
    // Ereignis
    redaktion.zelleErzeugen(tr, null, false);
    tr.lastChild.classList.add("kein-einzug");
    redaktion.inputText(tr.lastChild, "", "ereignis", "neu");
    redaktion.inputSubmit(tr.lastChild.firstChild.id);
    // Person
    redaktion.zelleErzeugen(tr, null, false);
    redaktion.inputText(tr.lastChild, "", "person", "neu");
    redaktion.inputSubmit(tr.lastChild.firstChild.id);
    // Notiz
    redaktion.zelleErzeugen(tr, null, false);
    redaktion.inputText(tr.lastChild, "", "notiz", "neu");
    redaktion.inputSubmit(tr.lastChild.firstChild.id);
    // Leerzelle (Lösch-Icon)
    redaktion.zelleErzeugen(tr, null, false);
    let a = document.createElement("a");
    tr.lastChild.appendChild(a);
    a.classList.add("icon-link", "icon-redaktion-hinzufuegen");
    a.href = "#";
    a.textContent = " ";
    a.addEventListener("click", evt => {
      evt.preventDefault();
      redaktion.eintragErgaenzen();
    });
  },
  // ISO 8601-Datum umwandeln
  //   datum = String
  //     (Datum-String mit dem Format YYYY-MM-DD)
  formatDatum (datum) {
    let datum_sp = datum.split("-");
    return `${datum_sp[2].replace(/^0/, "")}. ${datum_sp[1].replace(/^0/, "")}. ${datum_sp[0]}`;
  },
  // erzeugt eine Tabellenzelle
  //   parent = Element
  //     (Tabellenzeile [oder Fragment], an die die Zelle angehängt werden soll)
  //   wert = String/null
  //     (Text, der in die Zelle eingetragen werden soll)
  //   icon = Boolean
  //     (zum Redaktionsereignis passendes Icon anzeigen)
  zelleErzeugen (parent, wert, icon) {
    let td = document.createElement("td");
    parent.appendChild(td);
    if (wert && icon) {
      let img = document.createElement("img");
      img.width = "24";
      img.height = "24";
      let src = "img/platzhalter.svg";
      if (redaktion.ereignisse[wert]) {
        src = `img/${redaktion.ereignisse[wert].icon}`;
      }
      img.src = src;
      td.appendChild(img);
      td.appendChild(document.createTextNode(wert));
    } else if (wert) {
      if (wert === "keine Person") {
        td.classList.add("leer");
      } else {
        td.classList.remove("leer");
      }
      td.textContent = wert;
    }
  },
  // erzeugt ein Datum-Feld
  //   td = Element
  //     (die Tabellenzellen, in die das Input-Feld eingehängt werden soll)
  //   val = String
  //     (der Wert, den das Input-Element haben soll)
  inputDate (td, val, id) {
    let input = document.createElement("input");
    td.appendChild(input);
    input.id = `redaktion-datum-${id}`;
    input.type = "date";
    input.value = val;
  },
  // erzeugt ein Text-Input-Feld mit Dropdown-Menü
  //   td = Element
  //     (die Tabellenzellen, in die das Input-Feld eingehängt werden soll)
  //   val = String
  //     (der Wert, den das Input-Element haben soll)
  //   droptyp = String
  //     (die Klasse des Inputs; wichtig für das Dropdown-Menü)
  //   id = String
  //     (der einmalige Anteil der Feld-ID; wichtig für das Dropdown-Menü)
  inputText (td, val, droptyp, id) {
    let droptypen = {
      ereignis: {
        placeholder: "Ereignis",
        title: "Ereignisse auflisten",
        dropdown: true,
      },
      person: {
        placeholder: "Person",
        title: "BearbeiterInnen auflisten",
        dropdown: true,
      },
      notiz: {
        placeholder: "Notiz",
        dropdown: false,
      },
    };
    // <td> als Dropdown-Container bestimmen
    td.classList.add("dropdown-cont");
    // Input erzeugen
    let input = document.createElement("input");
    td.appendChild(input);
    input.id = `redaktion-${droptyp}-${id}`;
    input.type = "text";
    input.value = val;
    input.placeholder = droptypen[droptyp].placeholder;
    // Dropdown-Link erzeugen
    if (droptypen[droptyp].dropdown) {
      input.classList.add("dropdown-feld");
      dropdown.feld(input);
      let a = dropdown.makeLink("dropdown-link-td", droptypen[droptyp].title, true);
      td.appendChild(a);
      tooltip.init(td);
    }
  },
  // Fokus auf ein Input-Feld setzen
  // (ja, das muss leider über eine eigene Funktion geschehen)
  //   id = String
  //     (ID des Inputfelds, das fokussiert werden soll)
  inputFocus (id) {
    document.getElementById(id).focus();
  },
  // Event-Listener für ein Input-Feld
  //   id = String
  //     (ID des Inputfelds, das auf Enter hören soll)
  inputSubmit (id) {
    document.getElementById(id).addEventListener("keydown", function(evt) {
      // Abbruch, wenn nicht Enter gedrückt wurde
      if (evt.key !== "Enter") {
        return;
      }
      // Abbruch, wenn Enter gedrückt wurde, aber das Dropdown-Menü offen ist
      if (document.getElementById("dropdown")) {
        return;
      }
      // Soll ein neuer Eintrag erstellt werden?
      let slot = this.parentNode.parentNode.dataset.slot;
      if (slot === "neu") {
        redaktion.eintragErgaenzen();
        return;
      }
      // Eintrag updaten
      const val = helfer.textTrim(this.value, true),
        feldtyp = this.id.match(/^.+?-(.+?)-/)[1];
      if (!val && feldtyp === "datum") {
        redaktion.alert("Sie haben kein Datum angegeben.", this);
        return;
      }
      if (!val && feldtyp === "ereignis") {
        redaktion.alert("Sie haben kein Ereignis definiert.", this);
        return;
      }
      slot = parseInt(slot, 10);
      // Wurde der Wert wirklich geändert?
      if (data.rd.er[slot][redaktion.feldtypen[feldtyp]] !== val) {
        data.rd.er[slot][redaktion.feldtypen[feldtyp]] = val;
        kartei.karteiGeaendert(true);
        // Erinnerungen-Icon auffrischen
        erinnerungen.check();
      }
      // Tabellenzelle überschreiben
      redaktion.zelleErsetzen(feldtyp, val, this);
    });
  },
  // Event-Listener für Input-Felder, die evtl. zurückgesetzt werden sollen
  //   id = String
  //     (ID des Inputfelds, das auf Enter hören soll)
  inputReset (id) {
    document.getElementById(id).addEventListener("keydown", function(evt) {
      if (evt.key !== "Escape") {
        return;
      }
      // Schließen des Redaktionsfensters unterbinden
      evt.stopPropagation();
      // Feld zurücksetzen
      const slot = parseInt(this.parentNode.parentNode.dataset.slot, 10),
        feldtyp = this.id.match(/^.+?-(.+?)-/)[1];
      redaktion.zelleErsetzen(feldtyp, data.rd.er[slot][redaktion.feldtypen[feldtyp]], this);
    });
  },
  // Tabellenzelle mit einem Input-Element durch eine Textzelle ersetzen
  //   feldtyp = String
  //     (der Feldtyp)
  //   val = String
  //     (der Feldwert)
  //   input = Element
  //     (das Input-Element, von dem die Ersetzung angestoßen wurde)
  zelleErsetzen (feldtyp, val, input) {
    let frag = document.createDocumentFragment();
    if (feldtyp === "datum") {
      redaktion.zelleErzeugen(frag, redaktion.formatDatum(val), false);
    } else if (feldtyp === "person") {
      redaktion.zelleErzeugen(frag, val ? val : "keine Person", false);
    } else if (feldtyp === "notiz") {
      redaktion.zelleErzeugen(frag, val, false);
    } else {
      redaktion.zelleErzeugen(frag, val, true);
    }
    redaktion.wertAendern(frag.lastChild, feldtyp);
    input.parentNode.parentNode.replaceChild(frag, input.parentNode);
  },
  // auf Wunsch einen Wert ändern
  //   td = Element
  //     (Tabellenzelle, in der der Wert geändert werden soll)
  //   feldtyp = String
  //     (Typ des Werts, der geändert werden soll)
  wertAendern (td, feldtyp) {
    td.dataset.feldtyp = feldtyp;
    td.addEventListener("click", function() {
      let frag = document.createDocumentFragment();
      redaktion.zelleErzeugen(frag, null, false);
      frag.lastChild.classList.add("kein-einzug");
      const slot = parseInt(this.parentNode.dataset.slot, 10),
        feldtyp = this.dataset.feldtyp,
        val = data.rd.er[slot][redaktion.feldtypen[feldtyp]];
      if (feldtyp === "datum") {
        redaktion.inputDate(frag.lastChild, val, slot);
      } else if (feldtyp === "ereignis" || feldtyp === "person" || feldtyp === "notiz") {
        redaktion.inputText(frag.lastChild, val, feldtyp, slot);
      }
      const id = frag.lastChild.firstChild.id;
      this.parentNode.replaceChild(frag, this);
      redaktion.inputFocus(id);
      redaktion.inputSubmit(id);
      redaktion.inputReset(id);
    });
  },
  // die Liste der Einträge soll ergänzt werden
  eintragErgaenzen () {
    let inputs = document.querySelectorAll("#redaktion-cont-over tr:last-child input");
    let obj = {
      da: "",
      er: "",
      no: "",
      pr: "",
    };
    for (let i = 0, len = inputs.length; i < len; i++) {
      // Alle nötigen Angaben vorhanden?
      const val = helfer.textTrim(inputs[i].value, true),
        feldtyp = inputs[i].id.match(/^.+?-(.+?)-/)[1];
      if (!val && feldtyp === "datum") {
        redaktion.alert("Sie haben kein Datum angegeben.", inputs[i]);
        return;
      }
      if (!val && feldtyp === "ereignis") {
        redaktion.alert("Sie haben kein Ereignis definiert.", inputs[i]);
        return;
      }
      // Der Wert des Inputfelds ist okay.
      obj[redaktion.feldtypen[feldtyp]] = val;
    }
    let datumNeu = new Date(obj.da),
      idx = -1;
    for (let i = 1, len = data.rd.er.length; i < len; i++) {
      const datum = new Date(data.rd.er[i].da);
      if (datum > datumNeu) {
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      data.rd.er.push(obj);
    } else {
      data.rd.er.splice(idx, 0, obj);
    }
    kartei.karteiGeaendert(true);
    redaktion.tabelle();
    // Anzeige nächstes Ereignis auffrischen
    redaktion.next();
    // Erinnerungen-Icon auffrischen
    erinnerungen.check();
  },
  // Eintrag um eine Position nach oben schieben
  //   a = Element
  //     (Verschiebe-Link, auf den geklickt wurde)
  eintragVerschieben (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      const slot = parseInt(this.parentNode.parentNode.dataset.slot, 10);
      let obj = {
        da: data.rd.er[slot].da,
        er: data.rd.er[slot].er,
        no: data.rd.er[slot].no,
        pr: data.rd.er[slot].pr,
      };
      data.rd.er.splice(slot, 1);
      data.rd.er.splice(slot - 1, 0, obj);
      kartei.karteiGeaendert(true);
      redaktion.tabelle();
      // ggf. das Verschiebe-Icon fokussieren
      if (slot - 1 > 1) {
        document.querySelectorAll(".icon-redaktion-aufwaerts")[slot - 3].focus(); // -3, denn die ersten beiden Einträge haben keinen Pfeil
      }
    });
  },
  // Eintrag löschen
  //   a = Element
  //     (Lösch-Link, auf den geklickt wurde)
  eintragLoeschen (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      const slot = parseInt(this.parentNode.parentNode.dataset.slot, 10);
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll der Eintrag <i>${data.rd.er[slot].er}</i> mit dem Datum <i>${data.rd.er[slot].da}</i> wirklich gelöscht werden?`,
        callback: () => {
          if (dialog.antwort) {
            data.rd.er.splice(slot, 1);
            kartei.karteiGeaendert(true);
            redaktion.tabelle();
            // Anzeige nächstes Ereignis auffrischen
            redaktion.next();
            // Redaktions-Icon auffrischen
            kopf.icons();
          }
        },
      });
    });
  },
  // Meldung auswerfen, falls mit den Eingaben etwas nicht stimmt
  //   text = String
  //     (der Dialogtext)
  //   feld = Element
  //     (Feld, das später fokussiert werden soll)
  alert (text, feld) {
    dialog.oeffnen({
      typ: "alert",
      text: text,
      callback: () => {
        feld.focus();
      },
    });
  },
  // nächstes Redaktionsereignis ermitteln und in Worte fassen
  naechstesEreignis () {
    // keine Kartei geöffnet
    if (!kartei.wort) {
      return null;
    }
    // höchstrangiges Ereignis ermitteln
    let letztesEreignis = -1,
      ereignisse = Object.keys(redaktion.ereignisse);
    for (let i of data.rd.er) {
      const idx = ereignisse.indexOf(i.er);
      if (idx > letztesEreignis) {
        letztesEreignis = idx;
      }
    }
    // Text ermitteln
    let abgeschlossen = false,
      text = ["Nächstes Redaktionsereignis"];
    if (letztesEreignis === -1) {
      text.push(`${redaktion.ereignisse[ereignisse[0]].textNaechstes}`);
    } else if (letztesEreignis >= ereignisse.length - 2) {
      abgeschlossen = true;
      text = ["Redaktion abgeschlossen"];
    } else {
      const ereignis = ereignisse[letztesEreignis + 1];
      text.push(redaktion.ereignisse[ereignis].textNaechstes);
    }
    // nächstes Ereignis zurückgeben
    return {
      title: text,
      abgeschlossen: abgeschlossen,
    };
  },
};
