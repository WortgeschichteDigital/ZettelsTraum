
export { popup as default };

const popup = {
  // speichert die ermittelte Textauswahl
  textauswahl: "",

  // speichert das Element, auf das sich das Event bezieht
  element: null,

  // speichert die ID des angeklickten Kopfs (nur Abschnitts- und Textköpfe)
  kopfID: "",

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
    let items = [];
    if (target === "kopieren") {
      items = [ "kopierenNebenfenster" ];
    } else if (target === "kopieren-id") {
      items = [ "kopierenID" ];
    } else if (target === "kopieren-code") {
      items = [ "kopierenCode" ];
    } else if (target === "textfeld") {
      items = [ "bearbeitenRueckgaengig", "bearbeitenWiederherstellen", "sep", "bearbeitenAusschneiden", "bearbeitenKopieren", "bearbeitenEinfuegen", "bearbeitenAlles" ];
    } else if (target === "bedvis-export") {
      items.push({
        name: "bedvisCopy",
        sub: [ "bedvisExportXml", "bedvisExportJSON" ],
      });
      items.push({
        name: "bedvisSave",
        sub: [ "bedvisExportSvg", "bedvisExportModule" ],
      });
    } else if (target === "link") {
      items = [ "link" ];
    } else if (target === "mail") {
      items = [ "mail" ];
    }
    // Menü vom Main-Prozess erzeugen lassen
    bridge.ipc.invoke("popup", items);
  },

  // ermittelt das für den Rechtsklick passende Klickziel
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
    for (let i = 0, len = pfad.length; i < len; i++) {
      // Abbruch, wenn <body> erreicht wurde
      if (pfad[i].nodeName === "BODY" ||
          pfad[i].nodeName === "HTML") {
        return "";
      }
      // Textfeld
      if (pfad[i].nodeName === "INPUT" ||
          pfad[i].nodeName === "TEXTAREA") {
        return "textfeld";
      }
      // IDs
      if (pfad[i].dataset.id &&
          pfad[i].classList.contains("kopf") &&
          pfad[i].closest(".text-cont")) {
        popup.kopfID = pfad[i].dataset.id;
        return "kopieren-id";
      }
      // <code> oder <pre>
      if (pfad[i].nodeName === "CODE" ||
          pfad[i].nodeName === "PRE") {
        popup.element = pfad[i];
        return "kopieren-code";
      }
      // Bedeutungsvisualisierung
      if (pfad[i].nodeName === "FIGURE" &&
          pfad[i].classList.contains("bedvis")) {
        return "bedvis-export";
      }
      // Links
      if (/^http/.test(pfad[i].getAttribute("href"))) {
        popup.element = pfad[i];
        return "link";
      } else if (/^mailto:/.test(pfad[i].getAttribute("href"))) {
        popup.element = pfad[i];
        return "mail";
      }
    }
  },

  // Text der Auswahl ermitteln und entscheiden, ob sie berücksichtigt wird
  //   pfad = Array
  //     (speichert den Event-Pfad, also die Elementeliste, über die das
  //     Klick-Event aufgerufen wurde)
  getTargetSelection (pfad) {
    const sel = window.getSelection();
    let ele = sel.anchorNode;
    while (ele.nodeType !== 1) {
      ele = ele.parentNode;
    }
    if (/^(CODE|PRE)$/.test(ele.nodeName) && ele === pfad[0]) {
      const range = sel.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      popup.textauswahl = container.innerText;
      return true;
    }
    return false;
  },
};
