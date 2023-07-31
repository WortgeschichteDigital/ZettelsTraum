"use strict";

let notizen = {
  // Fenster für Notizen einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Notizen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    let fenster = document.getElementById("notizen"),
      feld = document.getElementById("notizen-feld");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      feld.focus();
      return;
    }
    helfer.elementMaxHeight({
      ele: document.getElementById("notizen-feld"),
    });
    // Notizen-Feld mit den gespeicherten Daten füllen
    notizen.eintragen = true;
    feld.innerHTML = data.no; // data.no kann leer sein
    setTimeout(function() {
      // der MutationObserver reagiert verzögert, darum muss hier ein Timeout stehen;
      // 0 Millisekunden würde wohl auch gehen
      notizen.eintragen = false;
    }, 5);
    // Feld fokussieren
    feld.focus();
  },
  // speichert die Notizen
  speichern () {
    let feld = document.getElementById("notizen-feld");
    // Es wurde gar nichts geändert!
    if (!notizen.geaendert) {
      direktSchliessen();
      return false;
    }
    let vorhanden = notizen.vorhanden();
    // keine Notizen im Feld, aber Notizen in der Kartei
    if (!vorhanden.feld && vorhanden.kartei) {
      notizen.frageLoeschenGespeicherte(false);
      return false;
    }
    // keine Notizen im Feld
    if (!vorhanden.feld) {
      feld.focus();
      return false;
    }
    // Änderungen speichern
    data.no = vorhanden.feld_value;
    notizen.notizenGeaendert(false);
    kartei.karteiGeaendert(true);
    direktSchliessen();
    // Notizen-Icon updaten
    kopf.icons();
    // ggf. Notizen in der Filterleiste updaten
    notizen.filterleiste();
    // erfolgreich gespeichert
    return true;
    // Notizen-Fenster ggf. schließen
    function direktSchliessen () {
      if (optionen.data.einstellungen["notizen-schliessen"]) {
        notizen.abbrechen();
      }
    }
  },
  // Notizen schließen
  // (der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
  abbrechen () {
    // keine Änderungen vorgenommen
    if (!notizen.geaendert) {
      notizen.schliessen();
      return;
    }
    // Änderungsmarkierung, aber keine Notizen im Feld und keine in Kartei => direkt schließen
    let vorhanden = notizen.vorhanden();
    if (!vorhanden.feld && !vorhanden.kartei) {
      notizen.schliessen();
      return;
    }
    // Änderungsmarkierung, aber keine Notizen im Feld, dafür in Kartei => fragen, ob löschen
    if (!vorhanden.feld && vorhanden.kartei) {
      notizen.frageLoeschenGespeicherte(true);
      return;
    }
    // Es sind also Notizen im Notizfeld. Speichern?
    dialog.oeffnen({
      typ: "confirm",
      text: "Die Notizen wurden noch nicht gespeichert.\nMöchten Sie die Eingaben nicht erst einmal speichern?",
      callback: () => {
        if (dialog.antwort) {
          notizen.speichern();
          notizen.schliessen();
        } else if (dialog.antwort === false) {
          notizen.schliessen();
        } else {
          document.getElementById("notizen-feld").focus();
        }
      },
    });
  },
  // Notizen löschen
  //   confirmed = Boolean
  //     (Die Löschabsicht wurde schon bestätigt.)
  loeschen (confirmed) {
    if (confirmed) {
      loesche();
      return;
    }
    // Sind überhaupt Notizen vorhanden?
    let vorhanden = notizen.vorhanden();
    if (!vorhanden.kartei && !vorhanden.feld) {
      notizen.schliessen();
      return;
    }
    // Sicherheitsfrage
    let speicher = [];
    if (vorhanden.kartei) {
      speicher.push("in der Kartei");
    }
    if (vorhanden.feld) {
      speicher.push("im Notizfeld");
    }
    dialog.oeffnen({
      typ: "confirm",
      text: `Sollen die Notizen ${speicher.join(" und ")} wirklich gelöscht werden?`,
      callback: () => {
        if (dialog.antwort) {
          loesche();
        } else {
          document.getElementById("notizen-feld").focus();
        }
      },
    });
    // Löschfunktion
    function loesche () {
      data.no = "";
      kopf.icons();
      notizen.filterleisteEntfernen();
      kartei.karteiGeaendert(true);
      notizen.schliessen();
    }
  },
  // Fragt nach, ob gespeicherte Notizen gelöscht werden sollen
  //   schliessen = Boolean
  //     (Notizen sollen geschlossen werden, wenn das Löschen abgelehnt wird)
  frageLoeschenGespeicherte (schliessen) {
    dialog.oeffnen({
      typ: "confirm",
      text: "Das Notizfeld ist leer.\nSollen die in der Kartei gespeicherten Notizen gelöscht werden?",
      callback: () => {
        if (dialog.antwort) {
          notizen.loeschen(true);
        } else if (schliessen) { // Aufruf durch notizen.abbrechen()
          notizen.schliessen();
        } else { // Aufruf durch notizen.speichern()
          document.getElementById("notizen-feld").focus();
        }
      },
    });
  },
  // Funktionen, die beim Schließen aufgerufen werden sollten
  schliessen () {
    notizen.notizenGeaendert(false);
    overlay.ausblenden(document.getElementById("notizen"));
  },
  // überprüft, ob überhaupt Notizen vorhanden sind
  vorhanden () {
    let vorhanden = {
      kartei: false,
      feld: false,
      feld_value: "",
    };
    if (data.no) {
      vorhanden.kartei = true;
    }
    let notiz = notizen.bereinigen(document.getElementById("notizen-feld").innerHTML);
    if (notiz.replace(/<.+?>/g, "")) {
      // unter gewissen Umständen können noch Tags im Feld stehen, die aber keinen Text auszeichnen
      vorhanden.feld = true;
    }
    vorhanden.feld_value = notiz;
    return vorhanden;
  },
  // Notizen vor dem Speichern bereinigen
  //   notiz = String
  bereinigen (notiz) {
    notiz = notiz.replace(/^(<div><br><\/div>)+|(<div><br><\/div>)+$/g, "");
    notiz = notiz.replace(/\sstyle=".+?"/g, "");
    return notiz;
  },
  // Aktionen beim Klick auf einen Button
  //   button = Element
  //     (der Button, auf den geklickt wurde)
  aktionButton (button) {
    button.addEventListener("click", function() {
      let aktion = this.id.replace(/^notizen-/, "");
      if (aktion === "speichern") {
        notizen.speichern();
      } else if (aktion === "abbrechen") {
        notizen.abbrechen();
      } else if (aktion === "loeschen") {
        notizen.loeschen(false);
      }
    });
  },
  // der gespeichert Wert wird gerade in das Notizenfeld eingetragen
  eintragen: false,
  // registriert, wenn im Textfeld Veränderungen auftreten
  //   div = Element
  //     (<div contenteditable="true">, in dem die Notizen stehen)
  change (div) {
    let observer = new MutationObserver(function() {
      if (notizen.eintragen) { // Das Feld wird gerade gefüllt; dabei ändert sich aber natürlich nichts.
        return;
      }
      div.classList.add("changed");
      notizen.notizenGeaendert(true);
    });
    observer.observe(div, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  },
  // blockiert die Verarbeitung von notizen.paste() kurzzeitig
  pasteBlock: false,
  // fängt das Pasten von Text ab und bereinigt den Text
  //   evt = Object
  //     (das Event-Objekt des Paste-Events)
  paste (evt) {
    if (notizen.pasteBlock) {
      return;
    }
    let text = beleg.pasteBs(evt, false);
    text = text.replace(/<.+?>/g, "");
    modules.clipboard.writeText(text);
    notizen.pasteBlock = true;
    document.execCommand("paste");
    notizen.pasteBlock = false;
  },
  // speichert, ob der Inhalt des Notizenfelds geändert wurde
  geaendert: false,
  // Notizen wurden geändert oder gespeichert
  //   geaendert = Boolean
  //     (true = Kartei wurde geändert, false = Änderung wurde gespeichert oder verworfen)
  notizenGeaendert (geaendert) {
    notizen.geaendert = geaendert;
    helfer.geaendert();
    let asterisk = document.getElementById("notizen-geaendert");
    if (geaendert) {
      asterisk.classList.remove("aus");
    } else {
      asterisk.classList.add("aus");
    }
  },
  // Funktion der Text-Tools auf Notizen-Feld anwenden
  //   a = Element
  //     (der Tools-Link, auf den geklickt wurde)
  tools (a) {
    a.addEventListener("click", function(evt) {
      evt.preventDefault();
      let funktion = this.getAttribute("class").match(/icon-tools-([^\s]+)/);
      if (funktion[1] === "mark") {
        notizen.toolsMark({cl: "user"});
      } else if (funktion[1] === "heading") {
        // ÜBERSCHRIFT
        let sel = window.getSelection(),
          absatz = sel.focusNode;
        while (absatz.nodeType !== 1 ||
            !/^(DIV|H3|LI)$/.test(absatz.nodeName)) {
          absatz = absatz.parentNode;
        }
        if (absatz.nodeName === "H3") {
          document.execCommand("formatBlock", false, "<DIV>");
        } else {
          document.execCommand("formatBlock", false, "<H3>");
        }
      } else if (funktion[1] === "list-unordered") {
        // LISTE (ungeordnet)
        document.execCommand("insertUnorderedList");
      } else if (funktion[1] === "list-ordered") {
        // LISTE (geordnet)
        document.execCommand("insertOrderedList");
      } else if (funktion[1] === "einzug") {
        // EINZUG
        document.execCommand("indent");
      } else if (funktion[1] === "auszug") {
        // AUSZUG
        document.execCommand("outdent");
      } else if (funktion[1] === "strike") {
        // DURCHSTREICHEN
        document.execCommand("strikeThrough");
      } else if (funktion[1] === "clear") {
        // FORMATIERUNGEN ENTFERNEN
        document.execCommand("removeFormat");
      } else {
        // ALLE ANDEREN FUNKTIONEN
        document.execCommand(funktion[1]);
      }
      document.getElementById("notizen-feld").focus();
    });
  },
  // Text-Tool zum Einfügen/Entfernen eines <mark>
  //   cl = String
  //     (die class, die der <mark> bekommen soll)
  toolsMark ({cl}) {
    // keine Range vorhanden
    let sel = window.getSelection();
    if (sel.rangeCount === 0) {
      document.getElementById("notizen-feld").focus();
      return;
    }
    // Range Clonen
    let range = sel.getRangeAt(0),
      div = document.createElement("div"),
      frag = document.createDocumentFragment();
    div.appendChild(range.cloneContents());
    frag.appendChild(range.cloneContents());
    let content = div.innerHTML;
    // Knoten und Content ermitteln
    let focus = sel.focusNode,
      isFocus = focus.nodeType === 1 && focus.nodeName === "MARK" && focus.innerHTML === content,
      parent = sel.anchorNode.parentNode,
      isParent = parent.nodeType === 1 && parent.nodeName === "MARK" && parent.innerHTML === content;
    // ersetzen oder hinzufügen
    if (isFocus || isParent) {
      let bezug = parent; // Markierung händisch ausgewählt => focusNode = #text
      if (isFocus) {
        bezug = focus; // Markierung gerade hinzugefügt => focusNode = <mark>
      }
      let knoten = [];
      for (let k of bezug.childNodes) {
        knoten.push(k);
      }
      let parentZuMark = bezug.parentNode;
      parentZuMark.removeChild(bezug);
      range.insertNode(frag);
      focusText(knoten, parentZuMark);
    } else {
      let mark = document.createElement("mark");
      mark.classList.add(cl);
      mark.innerHTML = content;
      modules.clipboard.writeHTML(mark.outerHTML);
      range.deleteContents();
      range.insertNode(mark);
      sel.selectAllChildren(mark);
    }
    // Text nach Entfernen eines <mark> fokussieren
    //   knoten = Array
    //     (Liste der Knoten, die sich in dem <mark> befanden)
    //   parent = Element
    //     (Element-Knoten der parent zum entfernten <mark> war)
    function focusText (knoten, parent) {
      // Markierung war leer
      if (!knoten.length) {
        return;
      }
      // Ranges entfernen
      let sel = window.getSelection();
      if (sel.rangeCount > 0) {
        sel.removeAllRanges();
      }
      // es war nur ein Knoten im entfernten <mark>
      if (knoten.length === 1) {
        let text = knoten[0].textContent;
        for (let b of parent.childNodes) {
          if (b.textContent.includes(text)) {
            let idx = b.textContent.indexOf(text),
              range = document.createRange();
            range.setStart(b, idx);
            range.setEnd(b, idx + text.length);
            sel.addRange(range);
            break;
          }
        }
        return;
      }
      // es waren mehrere Knoten im entfernten <mark>
      let start = {
        text: knoten[0].textContent,
        knoten: null,
        pos: -1,
      };
      let end = {
        text: knoten[knoten.length - 1].textContent,
        knoten: null,
        pos: -1,
      };
      for (let b of parent.childNodes) {
        if (!start.knoten && b.textContent === start.text) {
          start.knoten = b;
          while (start.knoten.nodeType !== 3) {
            start.knoten = start.knoten.firstChild;
          }
          start.pos = 0;
        } else if (start.knoten && !end.knoten && b.textContent.includes(end.text)) {
          end.knoten = b;
          while (end.knoten.nodeType === 1) {
            end.knoten = end.knoten.lastChild;
          }
          end.pos = end.knoten.textContent.length;
          break;
        }
      }
      // Knoten und Positionen auswählen
      if (start.knoten && end.knoten) {
        let range = document.createRange();
        range.setStart(start.knoten, start.pos);
        range.setEnd(end.knoten, end.pos);
        sel.addRange(range);
      }
    }
  },
  // Notizen in der Filterleiste einblenden
  filterleiste () {
    if (!data.no || !optionen.data.einstellungen["notizen-filterleiste"]) {
      return;
    }
    if (!document.getElementById("filter-notizen-content")) {
      let filterCont = document.getElementById("liste-filter-dynamisch");
      filterCont.appendChild(filter.aufbauenCont("Notizen"));
      tooltip.init(filterCont);
      let div = document.createElement("div");
      document.getElementById("filter-kopf-notizen").nextSibling.appendChild(div);
      div.id = "filter-notizen-content";
    }
    document.getElementById("filter-notizen-content").innerHTML = data.no;
  },
  // Notizen aus der Filterleiste entfernen
  filterleisteEntfernen () {
    let filterkopf = document.getElementById("filter-kopf-notizen");
    if (!filterkopf) {
      return;
    }
    let parent = filterkopf.parentNode;
    parent.removeChild(filterkopf.nextSibling);
    parent.removeChild(filterkopf);
  },
};
