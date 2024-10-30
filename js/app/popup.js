"use strict";

const popup = {
  // speichert die ermittelte Textauswahl
  textauswahl: {
    text: "",
    html: "",
    xml: "",
  },

  // speichert die ID des Belegs, der bearbeitet werden soll
  belegID: "",

  // speichert die ID des Overlay-Fenster, das betroffen ist
  overlayID: "",

  // für XML-Kopie: Referenz für das Kopieren eines Belegs
  referenz: {
    data: {}, // Objekt, in dem die Karteikarte liegt, d.i. beleg.data | data.ka[ID]
    id: "", // die ID der Karteikarte
  },

  // für Kopie einer Titelaufnahme (verweist auf redLit.db.data[id][slot])
  titelaufnahme: {
    ds: { // Datensatz, der betroffen ist
      id: "",
      slot: -1,
    },
    popup: false, // Rechtsklickmenü wird innerhalb des Versionen-Popups aufgerufen
  },

  // speichert den Anhang, der geöffnet werden soll
  anhangDatei: "",

  // das angeklickte Anhang-Icon steht im Kopf des Hauptfensters
  anhangDateiKopf: false,

  // das angeklickte Anhang-Icon steht in der Detailansicht eines Belegs
  anhangDateiListe: false,

  // speichert die Auswahl für einen Belegschnitt, auf die ein Rechtsklick erfolgte
  belegschnitt: null,

  // speichert die Auswahl für eine Klammerung, auf die ein Rechtsklick erfolgte
  klammern: null,

  // speichert die Datei aus der Liste zu verwendeter Dateien, der gelöscht werden soll
  startDatei: "",

  // speichert den Pfad aus einer Karteiliste (zur Zeit, 2019-10-26, nur Karteisuche)
  karteiPfad: "",

  // speichert den Karteilink, auf dem ein Rechtsklick ausgeführt wurde
  karteiLink: null,

  // speichert das Element, auf das sich das Event bezieht
  element: null,

  // Popup öffnen
  //   evt = Event-Object
  //     (das Ereignis-Objekt, das beim Rechtsklick erzeugt wird)
  oeffnen (evt) {
    // Klickziel ermitteln
    const target = popup.getTarget(evt.composedPath());
    if (!target) {
      return;
    }

    // Menü entwerfen
    let xmlCopy = [ "xmlReferenz" ];
    let textCopy = [ "textReferenz" ];
    if (popup.belegID) {
      xmlCopy = [ "xmlBelegComplete", "xmlReferenz" ];
      textCopy = [ "textComplete", "textReferenz" ];
    }
    let items = [];
    if (target === "kopieren") {
      const selInBeleg = popup.selInBeleg();
      if (selInBeleg) {
        items.push("markieren");
        let anchor = window.getSelection().anchorNode;
        if (anchor.nodeType !== Node.ELEMENT_NODE) {
          anchor = anchor.parentNode;
        }
        if (!anchor.classList.contains("belegschnitt") &&
            !anchor.closest(".belegschnitt")) {
          items.push("belegschnitt");
        }
        items.push({ name: "klammern", sub: [ "klammernStreichung", "klammernLoeschung", "klammernAutorenzusatz" ] });
      }
      items.push({ name: "text", sub: [ "kopieren", "textReferenz" ] });
      if (selInBeleg) {
        items.push({ name: "xml", sub: [ "xmlBeleg", "xmlReferenz" ] }, "xmlFenster");
      } else if (/^(karte|liste)$/.test(helfer.hauptfunktion)) {
        items.push({ name: "xml", sub: xmlCopy });
      }
      if (overlay.oben() === "drucken") {
        items.push("sep", "schliessen", "sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      } else if (helfer.hauptfunktion === "karte") {
        items.push("sep", "karteikarteConf", "importConf", "sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      } else if (helfer.hauptfunktion === "liste") {
        items.push("sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf", "sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      } else {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      }
    } else if (target === "textfeld") {
      items = [ "bearbeitenRueckgaengig", "bearbeitenWiederherstellen", "sep", "bearbeitenAusschneiden", "bearbeitenKopieren", "bearbeitenEinfuegen", "bearbeitenAlles" ];
    } else if (target === "quick") {
      items = [ "quickConf" ];
      if (kartei.wort) {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      } else {
        items.push("sep", "karteiErstellen");
      }
    } else if (target === "wort") {
      items = [ "wort", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "erinnerungen") {
      items = [ "erinnerungen", "sep", "kopfIconsConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "karteiordner") {
      items = [ "ordnerKartei", "sep", "kopfIconsConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "redaktion") {
      items = [ "redaktion", "sep", "kopfIconsConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "notizen") {
      items = [ "notizen", "sep", "kopfIconsConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "lexika") {
      items = [ "lexika", "sep", "kopfIconsConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "kopierfunktion") {
      items = [ "kopierfunktion", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "notizen-conf") {
      items = [ "notizen", "sep", "notizenConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "filter-conf") {
      items = [ "filterConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "filter-reset") {
      items = [ "filterReset", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "start-datei") {
      items = [ "karteiEntfernen", "sep", "karteiOeffnen", "ordner", "sep", "karteiErstellen" ];
    } else if (target === "link") {
      const oben = overlay.oben();
      if (oben === "stamm") {
        items.push("link", "sep", "schliessen");
      } else if (oben === "red-lit") {
        items.push("link", "sep", "titelBearbeiten", "titelAufnahmen", { name: "titelAufnahmeCp", sub: [ "titelAufnahmeXml", "titelAufnahmeText" ] }, { name: "titelReferenzCp", sub: [ "titelReferenzXml", "titelReferenzText" ] }, "titelSigle", "sep", "importConf", "sep", "schliessen");
        if (kartei.wort) {
          items.splice(4, 0, "titelXml");
        }
        if (popup.titelaufnahme.popup) {
          items.splice(items.indexOf("titelAufnahmen"), 1, "titelLoeschen");
        }
      } else if (helfer.hauptfunktion === "karte") {
        items.push("link", "sep", { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy }, "sep", "karteikarteConf", "importConf");
      } else if (helfer.hauptfunktion === "liste") {
        items.push("link", "sep", { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy }, "sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf");
      } else {
        items.push("link");
      }
      if (kartei.wort) {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      }
    } else if (target === "beleg") {
      items = [ "belegBearbeiten", "sep", "schliessen", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "beleg-einstellungen") {
      items = [ "beleglisteConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "beleg-moddel") {
      items = [ { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy } ];
      if (popup.belegID) {
        items.push("xmlFensterComplete");
      }
      items.push("sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf", "sep", "belegHinzufuegen");
      if (popup.klammern) {
        items.unshift("klammernEntfernen", "sep");
      } else if (popup.belegschnitt) {
        items.unshift("belegschnittDemarkieren", "sep");
      }
      popup.belegeAuflisten(items);
    } else if (target === "anhang") {
      items = [ "anhang", "ordnerAnhang" ];
      if (popup.anhangDateiKopf) {
        items.push("sep", "anhaengeFenster", "anhaengeAutoErgaenzen", "sep", "kopfIconsConf");
      } else if (popup.anhangDateiListe) {
        items.push("sep", { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy }, "sep", "belegBearbeiten", "belegLoeschen", "belegZwischenablage", "belegDuplizieren", "sep", "beleglisteConf");
      } else if (overlay.oben() === "anhaenge") {
        items.push("sep", "schliessen");
      } else if (helfer.hauptfunktion === "karte") {
        items.push("sep", { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy }, "sep", "karteikarteConf", "importConf");
      }
      items.push("sep", "belegHinzufuegen");
      popup.belegeAuflisten(items);
    } else if (target === "titelaufnahme") {
      items.push("titelBearbeiten", "titelAufnahmen", { name: "titelAufnahmeCp", sub: [ "titelAufnahmeXml", "titelAufnahmeText" ] }, { name: "titelReferenzCp", sub: [ "titelReferenzXml", "titelReferenzText" ] }, "titelSigle", "sep", "importConf", "sep", "schliessen");
      if (kartei.wort) {
        items.splice(2, 0, "titelXml");
      }
      if (popup.titelaufnahme.popup) {
        items.splice(items.indexOf("titelAufnahmen"), 1, "titelLoeschen");
      }
      if (kartei.wort) {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      }
    } else if (target === "schliessen") {
      items = [ "schliessen" ];
      if (popup.overlayID === "notizen") {
        items.push("sep", "notizenConf");
      } else if (popup.overlayID === "tagger" ||
          popup.overlayID === "gerueste" ||
          popup.overlayID === "geruestwechseln") {
        items.push("sep", "bedeutungenConf");
      } else if (popup.overlayID === "ctrlC") {
        items.push("sep", "kopierenConf");
      } else if (popup.overlayID === "red-lit") {
        items.push("sep", "importConf");
      }
      if (kartei.wort) {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      }
    } else if (target === "kartei-pfad") {
      items = [ "karteiOeffnen", "ordnerKartei", "sep", "schliessen" ];
      if (kartei.wort) {
        items.push("sep", "belegHinzufuegen");
        popup.belegeAuflisten(items);
      }
    } else if (target === "beleg-conf") {
      popup.referenz.data = beleg.data;
      popup.referenz.id = "" + beleg.id_karte;
      items = [ { name: "text", sub: textCopy }, { name: "xml", sub: xmlCopy } ];
      if (popup.belegID) {
        items.push("xmlFensterComplete");
      }
      items.push("sep", "karteikarteConf", "importConf", "sep", "belegHinzufuegen");
      if (popup.klammern) {
        items.unshift("klammernEntfernen", "sep");
      } else if (popup.belegschnitt) {
        items.unshift("belegschnittDemarkieren", "sep");
      }
      popup.belegeAuflisten(items);
    } else if (target === "bedeutungen-conf") {
      items = [ "bedeutungenConf", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "kopf") {
      items = [ "anhaengeFenster", "anhaengeAutoErgaenzen", "sep", "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "belege") {
      items = [ "belegHinzufuegen" ];
      popup.belegeAuflisten(items);
    } else if (target === "kartei") {
      items = [ "karteiErstellen" ];
    }
    // Menü vom Main-Prozess erzeugen lassen
    modules.ipc.invoke("popup", items);
  },

  // ermittelt das für den Rechtsklick "passendste" Klickziel
  //   pfad = Array
  //     (speichert den Event-Pfad, also die Elementeliste,
  //     über die das Klick-Event aufgerufen wurde)
  getTarget (pfad) {
    // Textauswahl
    if (window.getSelection().toString() &&
        popup.getTargetSelection(pfad)) {
      return "kopieren";
    }
    // alle Elemente im Pfad durchgehen
    popup.belegID = "";
    for (let i = 0, len = pfad.length; i < len; i++) {
      // ggf. Beleg-ID ermitteln, um einen Rechtsklick auf dem Beleg zu detektieren
      if (pfad[i].classList.contains("liste-bs")) {
        popup.belegID = pfad[i].parentNode.previousSibling.dataset.id;
      } else if (pfad[i].id === "beleg-lese-bs") {
        popup.belegID = beleg.id_karte;
      }
      // Textfelder:
      //   - <input type="date|text"> + nicht readonly
      //   - <textarea>
      //   - Edit-Feld
      if (pfad[i].nodeName === "INPUT" &&
          /^(date|text)$/.test(pfad[i].type) &&
          pfad[i].getAttribute("readonly") === null ||
          pfad[i].nodeName === "TEXTAREA" ||
          pfad[i].nodeType === 1 &&
          pfad[i].getAttribute("contenteditable")) {
        return "textfeld";
      }
      // Überschriften
      if (pfad[i].nodeName === "A" &&
          !pfad[i].classList.contains("icon-link") &&
          overlay.oben() === "kopieren-liste") {
        popup.belegID = pfad[i].dataset.id;
        return "beleg";
      } else if (pfad[i].nodeName === "H3" &&
          overlay.oben() === "anhaenge") {
        popup.belegID = pfad[i].dataset.id;
        return "beleg";
      } else if (pfad[i].nodeName === "HEADER" &&
          pfad[i].parentNode.nodeName === "BODY" &&
          kartei.wort) {
        return "kopf";
      } else if (pfad[i].nodeName === "HEADER" &&
          pfad[i].parentNode.id === "liste-belege") {
        return "beleg-einstellungen";
      } else if (pfad[i].nodeName === "IMG" &&
          pfad[i].dataset.datei) {
        popup.anhangDatei = pfad[i].dataset.datei;
        if (pfad[i].closest("#kartei-anhaenge")) {
          popup.anhangDateiKopf = true;
          popup.anhangDateiListe = false;
        } else if (pfad[i].closest(".liste-meta")) {
          popup.anhangDateiKopf = false;
          popup.anhangDateiListe = true;
          const id = pfad[i].closest(".liste-details").previousSibling.dataset.id;
          popup.referenz.data = data.ka[id];
          popup.referenz.id = id;
        }
        return "anhang";
      }
      // IDs
      const id = pfad[i].id;
      if (id === "fensterladen") {
        return "";
      } else if (id === "quick") {
        return "quick";
      } else if (id === "wort" && kartei.wort) {
        return "wort";
      } else if (id === "erinnerungen-icon") {
        return "erinnerungen";
      } else if (id === "ordner-icon") {
        popup.karteiPfad = kartei.pfad;
        return "karteiordner";
      } else if (id === "redaktion-icon") {
        return "redaktion";
      } else if (id === "notizen-icon") {
        return "notizen";
      } else if (id === "lexika-icon") {
        return "lexika";
      } else if (id === "kopieren") {
        return "kopierfunktion";
      } else if (id === "filter-notizen-content" || id === "filter-kopf-notizen") {
        return "notizen-conf";
      } else if (id === "liste-filter") {
        return "filter-conf";
      } else if (id === "liste-belege-anzahl" &&
          pfad[i].classList.contains("belege-gefiltert")) {
        return "filter-reset";
      }
      // Klassen
      if (pfad[i].classList) {
        if (pfad[i].classList.contains("start-datei")) {
          popup.startDatei = pfad[i].dataset.datei;
          popup.karteiLink = pfad[i];
          return "start-datei";
        } else if (pfad[i].classList.contains("link")) {
          popup.element = pfad[i];
          const oben = overlay.oben();
          if (oben === "red-lit") {
            popup.titelaufnahme.ds = JSON.parse(pfad[i].closest(".red-lit-snippet").dataset.ds);
            popup.titelaufnahme.popup = pfad[i].closest("#red-lit-popup");
            if (!popup.titelaufnahme.popup) {
              redLit.sucheSnippetMarkieren(pfad[i].closest(".red-lit-snippet"));
            }
          } else if (oben !== "stamm" && helfer.hauptfunktion === "karte") {
            popup.referenz.data = beleg.data;
            popup.referenz.id = "" + beleg.id_karte;
          } else if (oben !== "stamm" && helfer.hauptfunktion === "liste") {
            const id = pfad[i].closest(".liste-details").previousSibling.dataset.id;
            popup.referenz.data = data.ka[id];
            popup.referenz.id = id;
          }
          return "link";
        } else if (pfad[i].classList.contains("liste-kopf")) {
          popup.belegID = pfad[i].dataset.id;
          popup.referenz.data = data.ka[popup.belegID];
          popup.referenz.id = popup.belegID;
          return "beleg-moddel";
        } else if (pfad[i].classList.contains("liste-details")) {
          popup.belegID = pfad[i].previousSibling.dataset.id;
          popup.referenz.data = data.ka[popup.belegID];
          popup.referenz.id = popup.belegID;
          klickAufKlammern(i);
          return "beleg-moddel";
        } else if (pfad[i].classList.contains("anhaenge-item")) {
          popup.anhangDatei = pfad[i].dataset.datei;
          popup.anhangDateiKopf = false;
          popup.anhangDateiListe = false;
          if (!overlay.oben() && helfer.hauptfunktion === "karte") {
            popup.referenz.data = beleg.data;
            popup.referenz.id = "" + beleg.id_karte;
          }
          return "anhang";
        } else if (pfad[i].classList.contains("red-lit-snippet")) {
          popup.titelaufnahme.ds = JSON.parse(pfad[i].dataset.ds);
          popup.titelaufnahme.popup = pfad[i].closest("#red-lit-popup");
          if (!popup.titelaufnahme.popup) {
            redLit.sucheSnippetMarkieren(pfad[i]);
          }
          return "titelaufnahme";
        } else if (pfad[i].classList.contains("overlay")) {
          popup.overlayID = pfad[i].id;
          return "schliessen";
        }
      }
      // Datasets
      if (pfad[i].dataset && pfad[i].dataset.pfad) {
        popup.karteiPfad = pfad[i].dataset.pfad;
        popup.karteiLink = pfad[i];
        return "kartei-pfad";
      }
      // IDs untergeordnet
      // (müssen nach "Klassen" überprüft werden)
      if (id === "beleg") {
        klickAufKlammern(i);
        return "beleg-conf";
      } else if (id === "bedeutungen") {
        return "bedeutungen-conf";
      }
    }
    // kein passendes Element gefunden => Ist eine Kartei offen?
    if (kartei.wort) {
      return "belege";
    }
    // keine Kartei offen
    return "kartei";
    // Klick auf Klammer entdecken
    function klickAufKlammern (i) {
      popup.belegschnitt = null;
      popup.klammern = null;
      while (i >= 0) {
        i--;
        // Bei Treffer nicht abbrechen!
        // Der Klick könnte auf einer verschachtelten Klammer liegen.
        if (/belegschnitt/.test(pfad[i]?.getAttribute("class"))) {
          popup.belegschnitt = pfad[i];
        } else if (/klammer-(autorenzusatz|loeschung|streichung)/.test(pfad[i]?.getAttribute("class"))) {
          popup.klammern = pfad[i];
        }
      }
    }
  },

  // Text der Auswahl ermitteln und entscheiden, ob sie berücksichtigt wird
  // (diese Funktion wird nicht nur für Rechtsklicks verwendet, sondern
  // auch für Kopier-Icons!)
  //   pfad = Array
  //     (speichert den Event-Pfad, also die Elementeliste, über die das
  //     Klick-Event aufgerufen wurde; wird die Funktion über ein Kopier-Icon
  //     aufgerufen, steht nur ein Element in dem Array)
  getTargetSelection (pfad) {
    // ermitteln, ob der ausgewählte Text in einem Bereicht steht,
    // der berücksichtigt werden soll ("liste-details" oder "beleg-lese")
    const sel = window.getSelection();
    let bereich = false;
    let ele = sel.anchorNode;
    let bs = false; // true, wenn die Textauswahl innerhalb des Belegs ist
    let karte = {};
    const container = {
      umfeld: "",
      id: "",
    };
    while (ele.nodeName !== "BODY") {
      ele = ele.parentNode;
      if (ele.classList.contains("liste-details")) {
        container.umfeld = "DIV";
        bereich = true;
        // feststellen, ob der markierte Text Teil des Belegtexts ist
        let div = sel.anchorNode;
        while (div.nodeName !== "DIV") {
          div = div.parentNode;
        }
        if (div.classList.contains("liste-bs")) {
          bs = true;
        }
        const id = div.parentNode.previousSibling.dataset.id;
        karte = data.ka[id];
        popup.referenz.data = data.ka[id]; // für xml.referenz();
        popup.referenz.id = id;
        break;
      } else if (ele.classList.contains("beleg-lese")) {
        container.umfeld = "TD";
        bereich = true;
        // feststellen, ob der markierte Text Teil des Belegtexts ist
        if (ele.querySelector("td").id === "beleg-lese-bs") {
          bs = true;
          karte = beleg.data;
        }
        popup.referenz.data = beleg.data; // für xml.referenz();
        popup.referenz.id = "" + beleg.id_karte;
        break;
      } else if (ele.id === "drucken-cont-rahmen") {
        container.umfeld = "DIV";
        container.id = "drucken-cont-rahmen";
        bereich = true;
      }
    }
    // Beleg-ID ermitteln, wenn in Belegliste
    // (auch wenn Text markiert ist, stehen verschiedene andere Funktion zur
    // Verfügung, die die ID unbedingt brauchen)
    if (helfer.hauptfunktion === "liste") {
      const details = ele.closest(".liste-details");
      if (details) {
        popup.belegID = details.previousSibling.dataset.id;
      }
    }
    // ermitteln, ob sich der Rechtsklick im unmittelbaren Umfeld
    // des ausgewählten Textes ereignete
    let umfeld = false;
    if (bereich) {
      let ele = sel.anchorNode;
      while (!(ele.nodeName === container.umfeld && (!container.id || ele.id === container.id))) {
        ele = ele.parentNode;
      }
      if (ele.contains(pfad[0])) {
        umfeld = true;
      }
    }
    // Kopie des ausgewählten Texts ermitteln und zwischenspeichern;
    // Kopieranweisung geben
    if (bereich && umfeld) {
      const range = sel.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      popup.textauswahlPrep({
        bs,
        container,
        karte,
      });
      return true;
    }
    // keine Kopieranweisung geben
    return false;
  },

  // Textauswahl eines gesamten Belegs kopieren
  //   copy = boolean
  //     (Belegtext direkt in die Zwischenablage kopieren)
  textauswahlComplete (copy) {
    const bs = true;
    const karte = data.ka[popup.belegID];

    // Belegtext aufbereiten
    let container;
    if (/class="belegschnitt"/.test(karte.bs)) {
      container = xml.belegSchnittPrep(popup.belegID, false);
    } else {
      container = document.createElement("div");
      const absaetze = karte.bs.replace(/\n\s*\n/g, "\n").split(/\n/);
      for (const i of absaetze) {
        const p = document.createElement("p");
        p.innerHTML = i;
        container.appendChild(p);
      }
    }

    // DWDS-Belege aufbereiten
    // (im DWDS werden Absatzgrenzen nicht markiert => mehrere Absätze vereinen)
    if (/^DWDS/.test(karte.kr) &&
        container.childNodes.length > 1) {
      let html = "";
      for (let i = 0, len = container.childNodes.length; i < len; i++) {
        if (i > 0) {
          html += " ";
        }
        html += container.childNodes[i].innerHTML;
      }

      html = html.replace(/<span class="klammer-loeschung">…<\/span> <span class="klammer-loeschung">…<\/span>/g, '<span class="klammer-loeschung">…</span>');
      html = html.replace(/ {2,}/g, " ");

      const p = document.createElement("p");
      p.innerHTML = html;
      container = document.createElement("div");
      container.appendChild(p);
    }

    // Belegtext aufbereiten
    popup.textauswahlPrep({
      bs,
      container,
      karte,
    });

    // Abbruch, weil nicht kopiert werden soll
    if (!copy) {
      return;
    }

    // Belegtext kopieren
    modules.clipboard.write({
      text: popup.textauswahl.text,
      html: popup.textauswahl.html,
    });

    // Feedback
    helfer.animation("zwischenablage");
  },

  // Textauswahl aus übergebenem Container aufbereiten
  //   bs = boolean
  //     (es soll ein Belegschnitt aufbereitet werden)
  //   container = node
  //     (temporärer Container mit dem zu kopierenden HTML)
  //   karte = object
  //     (Zeiger auf die aktuelle Karteikarte)
  textauswahlPrep ({ bs, container, karte }) {
    // Text aufbereiten
    let text = container.innerHTML.replace(/<br>/g, "__br__");
    text = text.replace(/<\/p><p[^>]*>/g, "\n");
    if (!bs) {
      // ansonsten werden an dieser Stelle die Markierungen für die Klammern entfernt
      text = text.replace(/<.+?>/g, "");
    }
    text = text.replace(/\n/g, "\n\n");
    text = text.replace(/__br__/g, "\n");

    // HTML und XML aufbereiten
    let html;
    let xml;
    if (container.firstChild.nodeType === Node.ELEMENT_NODE &&
        container.firstChild.nodeName === "P") {
      html = container.innerHTML;
    } else {
      html = `<p>${container.innerHTML}</p>`;
    }
    xml = html;
    if (optionen.data.einstellungen["textkopie-wort"] &&
        !container.querySelector(".wort")) {
      html = liste.belegWortHervorheben(html, true);
    }
    html = helfer.clipboardHtml(html);
    if (!container.querySelector(".wort")) {
      xml = liste.belegWortHervorheben(xml, true);
    }
    xml = helfer.clipboardXml(xml);

    // Text und HTML in einem Belegschnitt aufbereiten
    if (bs) {
      text = beleg.toolsKopierenKlammern({ text });
      text = text.replace(/<.+?>/g, "");
      text = helfer.typographie(text);
      text = beleg.toolsKopierenAddQuelle(text, false, karte);
      text = beleg.toolsKopierenAddJahr(text, false);
      html = beleg.toolsKopierenKlammern({ text: html, html: true });
      html = helfer.typographie(html);
      html = beleg.toolsKopierenAddQuelle(html, true, karte);
      html = beleg.toolsKopierenAddJahr(html, true);
      if (optionen.data.einstellungen["textkopie-notizen"]) {
        html = beleg.toolsKopierenAddNotizen(html, true, karte);
        text = beleg.toolsKopierenAddNotizen(text, false, karte);
      }
    }

    // Ergebnis zwischenspeichern
    popup.textauswahl.text = helfer.escapeHtml(text, true);
    popup.textauswahl.html = html;
    popup.textauswahl.xml = xml;
  },

  // ermittelt, ob eine Selection innerhalb des Belegtextes ist (Belegliste oder Leseansicht)
  selInBeleg () {
    const sel = window.getSelection();
    let anchor = sel.anchorNode;
    while (!(anchor.nodeName === "DIV" || anchor.nodeName === "TD")) {
      anchor = anchor.parentNode;
    }
    if (anchor.classList.contains("liste-bs") ||
        anchor.id === "beleg-lese-bs") {
      return true;
    }
    return false;
  },

  // Befehl "Belege auflisten" ggf. zu den Items hinzufügen
  belegeAuflisten (items) {
    if (overlay.oben() ||
        helfer.hauptfunktion !== "liste") {
      items.push("belegeAuflisten");
    }
  },
};
