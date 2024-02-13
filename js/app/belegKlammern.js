"use strict";

const belegKlammern = {
  // Klammerung ausführen
  //   type = String
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
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.classList.add("klammer-" + type);
    try {
      range.surroundContents(span);
    } catch (err) {
      dialog.oeffnen({
        typ: "alert",
        text: "Das Setzen von Klammern kann mit dieser Textauswahl nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung",
      });
      return;
    }
    range.collapse();

    // Daten auffrischen
    belegKlammern.update(span.closest("p"));
  },

  // Klammerung entfernen
  remove () {
    const k = popup.klammern;
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
    let bs = "";
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
