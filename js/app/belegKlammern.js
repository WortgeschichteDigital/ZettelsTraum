"use strict";

const belegKlammern = {
  // Klammerung ausführen
  //   type = string
  make (type) {
    // Trennzeichen nicht eingeschaltet
    if (helfer.hauptfunktion === "liste" && !optionen.data.belegliste.trennung ||
        helfer.hauptfunktion !== "liste" && !optionen.data.beleg.trennung) {
      dialog.oeffnen({
        typ: "alert",
        text: "Das Setzen von Klammern ist nur möglich, wenn Trennstriche und Seitenumbrüche sichtbar sind.\nSie müssen zunächst die Funktion <img src='img/trennzeichen.svg' width='24' height='24' alt=''> aktivieren.",
      });
      return;
    }

    // Klammerung vornehmen
    function getIdxNo (ancestor, container) {
      while (container.parentNode !== ancestor) {
        container = container.parentNode;
      }
      const childs = ancestor.childNodes;
      for (let i = 0, len = childs.length; i < len; i++) {
        if (childs[i] === container) {
          return i;
        }
      }
      return -1;
    }

    function newRange (data) {
      const range = new Range();
      for (const type of [ "start", "end" ]) {
        const otherType = type === "start" ? "end" : "start";
        if (data[type + "PN"] !== data.ancestor &&
            data[type + "PN"] !== data[otherType + "PN"]) {
          const idx = getIdxNo(data.ancestor, data[type + "PN"]);
          if (type === "start") {
            range.setStart(data.ancestor, idx);
          } else {
            range.setEnd(data.ancestor, idx + 1);
          }
        } else if (type === "start") {
          range.setStart(data[type + "C"], data[type + "O"]);
        } else {
          range.setEnd(data[type + "C"], data[type + "O"]);
        }
      }
      return range;
    }

    function correctNesting (p) {
      // Mitunter erzeugt range.surroundContents() leere Textknoten,
      // die bei der folgenden Überprüfung Probleme machen und
      // auf diese Weise eliminiert werden.
      const html = p.innerHTML;
      p.innerHTML = html;

      // Wenn der gesamte Absatz markiert wurde und bereits als ganzes in ein und denselben Tag
      // eingeschlossen ist, wird die Klammer in diesen Tag hineingeschachtelt,
      // obwohl die Klammer den Tag umschließen sollte. Das wird hiermit korrigiert.
      if (p.firstChild.nodeType === Node.ELEMENT_NODE &&
          p.childNodes.length === 1 &&
          p.firstChild.firstChild.nodeType === Node.ELEMENT_NODE &&
          p.firstChild.childNodes.length === 1 &&
          p.firstChild.firstChild.classList.contains(type)) {
        const contents = p.firstChild.firstChild.innerHTML;
        p.firstChild.innerHTML = contents;
        const span = document.createElement("span");
        span.classList.add(type);
        span.innerHTML = p.innerHTML;
        p.replaceChild(span, p.firstChild);
      }

      // Annotierungs-Events anhängen
      annotieren.init(p);
    }

    try {
      // Daten ermitteln
      const sel = window.getSelection();
      const range = sel.getRangeAt(0);

      const ancestor = range.commonAncestorContainer;
      if (ancestor.nodeType === Node.ELEMENT_NODE &&
          !ancestor.closest(".liste-bs") &&
          !ancestor.closest("#beleg-lese-bs")) {
        dialog.oeffnen({
          typ: "alert",
          text: "Das Setzen von Klammern kann mit dieser Textauswahl nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nüber den Belegtext hinausreichende Textauswahl",
        });
        return;
      }

      const data = {
        ancestor,
        startC: range.startContainer,
        startP: null,
        startPN: range.startContainer.parentNode,
        startO: range.startOffset,
        endC: range.endContainer,
        endP: null,
        endPN: range.endContainer.parentNode,
        endO: range.endOffset,
      };
      for (const i of [ "start", "end" ]) {
        const p = range[i + "Container"].parentNode;
        if (p.nodeName === "P") {
          data[i + "P"] = p;
        } else {
          data[i + "P"] = p.closest("p");
        }
      }
      range.collapse();

      if (data.startP === data.endP) {
        // Range liegt innerhalb eines Absatzes
        const range = newRange(data);
        const span = document.createElement("span");
        span.classList.add(type);
        range.surroundContents(span);
        range.collapse();
        correctNesting(data.startP);
        belegKlammern.update(data.startP);
      } else {
        // Range erstreckt sich über mehrere Absätze
        const childs = data.ancestor.childNodes;
        let started = false;
        for (let i = 0, len = childs.length; i < len; i++) {
          // Ist das der Start-Container?
          if (childs[i] === data.startP) {
            started = true;
          }

          // Start-Container noch nicht erreicht => weiter
          if (!started) {
            continue;
          }

          // Range erzeugen
          let range;
          if (childs[i] === data.startP) {
            // erster Absatz
            const dataTmp = {
              ancestor: data.startP,
              startC: data.startC,
              startPN: data.startC.parentNode,
              startO: data.startO,
              endC: null,
              endPN: null,
              endO: 0,
            };
            dataTmp.endC = data.startP.lastChild;
            while (dataTmp.endC.nodeType !== Node.TEXT_NODE) {
              dataTmp.endC = dataTmp.endC.lastChild;
            }
            dataTmp.endPN = dataTmp.endC.parentNode;
            dataTmp.endO = dataTmp.endC.length;
            range = newRange(dataTmp);
          } else if (childs[i] === data.endP) {
            // letzter Absatz
            const dataTmp = {
              ancestor: data.endP,
              startC: null,
              startPN: null,
              startO: 0,
              endC: data.endC,
              endPN: data.endC.parentNode,
              endO: data.endO,
            };
            dataTmp.startC = data.endP.firstChild;
            while (dataTmp.startC.nodeType !== Node.TEXT_NODE) {
              dataTmp.startC = dataTmp.startC.firstChild;
            }
            dataTmp.startPN = dataTmp.startC.parentNode;
            range = newRange(dataTmp);
          } else {
            // Absatz in der Mitte
            range = new Range();
            range.selectNodeContents(childs[i]);
          }

          // Klammer setzen
          const span = document.createElement("span");
          span.classList.add(type);
          range.surroundContents(span);
          range.collapse();
          correctNesting(childs[i]);
          belegKlammern.update(childs[i]);

          // End-Container erreicht => Abbruch
          if (childs[i] === data.endP) {
            break;
          }
        }
      }
    } catch {
      dialog.oeffnen({
        typ: "alert",
        text: "Das Setzen von Klammern kann mit dieser Textauswahl nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung",
      });
    }
  },

  // Klammerung entfernen
  //   type = string
  remove (type) {
    const k = popup[type];
    const p = k.closest("p");
    const template = document.createElement("template");
    template.innerHTML = k.innerHTML;
    k.parentNode.replaceChild(template.content, k);
    belegKlammern.update(p);
  },

  // Datensatz auffrischen
  // (Funktion wird auch aus annotieren.ausfuehren() aufgerufen)
  //   p = Node
  update (p) {
    // Belegtext ermitteln
    let bs;
    if (!p.dataset.id) {
      // Karteikarte
      bs = document.getElementById("beleg-bs").value;
    } else {
      // Belegliste
      bs = data.ka[p.dataset.id].bs;
    }

    // Absatztext ermitteln
    const klon = p.cloneNode(true);
    const aw = klon.querySelector("#annotierung-wort");
    if (aw) {
      // Annotierungspopup könnte noch auf sein
      aw.parentNode.removeChild(aw);
    }

    // <mark> und <span> ersetzen, die immer dynamisch ergänzt werden
    (function repDyn (n) {
      for (const ch of n.childNodes) {
        if (ch.nodeType === Node.ELEMENT_NODE) {
          if (ch.nodeName === "SPAN" && ch.classList.contains("klammer-technisch") ||
              ch.nodeName === "MARK" && (ch.classList.contains("wort") || ch.classList.contains("suche"))) {
            const parent = ch.parentNode;
            const template = document.createElement("template");
            template.innerHTML = ch.innerHTML;
            parent.replaceChild(template.content, ch);
            // wegen möglicher Verschachtelungen muss der parent dieser Klammer
            // noch einmal gescannt werden
            repDyn(parent);
          } else {
            repDyn(ch);
          }
        }
      }
    }(klon));

    // Text im Datensatz eintragen
    const absaetze = liste.belegErstellenPrepP(bs).split("\n");
    absaetze[parseInt(p.dataset.pnumber, 10)] = klon.innerHTML;
    bs = absaetze.join("\n\n");
    bs = bs.replace(/<br>(?!\n)/g, "<br>\n");
    if (!p.dataset.id) {
      // Karteikarte
      document.getElementById("beleg-bs").value = bs;
      beleg.data.bs = bs;
      beleg.belegGeaendert(true);
    } else {
      // Belegliste
      data.ka[p.dataset.id].bs = bs;
      data.ka[p.dataset.id].dm = new Date().toISOString();
      kartei.karteiGeaendert(true);
    }
  },
};
