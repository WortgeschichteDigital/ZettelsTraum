"use strict";

const lemmata = {
  // Eingabe wurde abgebrochen
  abgebrochen: false,

  // Formular wurde geändert
  geaendert: false,

  // Lemmata, die beim Öffnen des Fenster vorhanden waren
  // (dient zum Abgleich nach dem Schließen)
  lemmataStart: new Set(),

  // beim Öffnen einer neuen Kartei darf das Fenster ohne Eingabe geschlossen werden
  karteiInit: false,

  // Lemmata-Fenster einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!lemmata.karteiInit && !kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Lemmata</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }

    // Abbrechen-Button ein- oder ausblenden
    const abbrechen = document.getElementById("lemmata-abbrechen");
    if (lemmata.karteiInit) {
      abbrechen.classList.remove("aus");
    } else {
      abbrechen.classList.add("aus");
    }

    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("lemmata");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }

    // Lemmata ermitteln
    lemmata.lemmataStart = helfer.lemmaliste();

    // Fenster füllen
    document.getElementById("lemmata-wf").checked = data.la.wf;
    lemmata.liste();
    document.querySelector("#lemmata-liste input").select();

    // Maximalhöhe des Fenster-Contents festlegen
    helfer.elementMaxHeight({
      ele: document.getElementById("lemmata-over"),
    });
  },

  // Lemmata-Fenster ausblenden
  async schliessen () {
    if (lemmata.geaendert ||
        lemmata.karteiInit && !lemmata.abgebrochen) {
      // Gibt es Fehler beim Ausfüllen des Formulars?
      const fehler = lemmata.fehlersuche();
      if (fehler.length) {
        const texte = {
          start: "Sie haben Formfehler gemacht.",
          h3: "Fehlermeldungen",
        };
        if (fehler.length === 1) {
          fehler[0] = fehler[0].replace(/^• /, "");
          texte.start = "Sie haben einen Formfehler gemacht.";
          texte.h3 = "Fehlermeldung";
        }
        dialog.oeffnen({
          typ: "alert",
          text: `${texte.start}\n<h3>${texte.h3}</h3>\n${fehler.join("<br>")}`,
        });
        return;
      }

      // ggf. Formvarianten auffrischen
      const lemmaliste = helfer.lemmaliste();
      let variantenUpdate = false;
      if (lemmata.lemmataStart.size !== lemmaliste.size) {
        variantenUpdate = true;
      } else {
        for (const i of lemmaliste) {
          if (!lemmata.lemmataStart.has(i)) {
            variantenUpdate = true;
            break;
          }
        }
      }

      if (variantenUpdate) {
        // hinzugefügte Lemmata
        const hinzu = new Set();
        for (const i of lemmaliste) {
          if (!lemmata.lemmataStart.has(i)) {
            hinzu.add(i);
          }
        }
        const woerter = [];
        for (const lemma of hinzu) {
          if (data.fv[lemma]) {
            data.fv[lemma].an = true;
          } else {
            woerter.push(lemma);
          }
        }
        if (woerter.length) {
          // Fenster sperren und Formvarianten laden
          document.activeElement.blur();
          const sperre = helfer.sperre(document.getElementById("lemmata-cont"));
          await new Promise(resolve => setTimeout(() => resolve(true), 250));
          await stamm.dtaGet(woerter, false);
          sperre.parentNode.removeChild(sperre);

          // neue Wörter ggf. als Nebenlemma markieren
          for (const wort of woerter) {
            for (const lemma of data.la.la) {
              if (lemma.sc.includes(wort)) {
                if (!data.la.wf && lemma.nl) {
                  data.fv[wort].nl = true;
                }
                break;
              }
            }
          }
        }

        // entfernte Lemmata
        const weg = new Set();
        for (const i of lemmata.lemmataStart) {
          if (!lemmaliste.has(i)) {
            weg.add(i);
          }
        }
        for (const i of weg) {
          if (data.fv[i]) {
            data.fv[i].an = false;
          }
        }

        // reguläre Ausdrücke auffrischen
        helfer.formVariRegExp();
      }

      // Kartei-Wort auffrischen
      kartei.wortUpdate();

      // Daten in externen Fenster auffrischen
      bedeutungenWin.daten();
      redXml.daten();

      // Änderungsmarkierung für Kartei setzen
      kartei.karteiGeaendert(true);

      // Änderungsmarkierung für Fenster zurücksetzen
      lemmata.geaendert = false;
    }

    // Fenster ausblenden
    overlay.ausblenden(document.getElementById("lemmata"));
  },

  // Fehlersuche
  fehlersuche () {
    // Fehlerkontrolle
    const errors = [];

    // Fehler Wortfeldartikel
    if (data.la.wf) {
      let titel = 0;
      let alternativen = 0;
      let feldlemmata = 0;
      for (const entry of data.la.la) {
        if (entry.nl) {
          feldlemmata++;
        } else {
          titel++;
          if (entry.sc.length > 1) {
            alternativen++;
          }
        }
      }
      if (!titel) {
        errors.push("• Wortfeldartikel ohne Titel");
      } else if (titel > 1) {
        errors.push("• Wortfeldartikel mit mehr als einem Titel");
      }
      if (alternativen) {
        errors.push("• Wortfeldartikel mit Alternativtitel");
      }
      if (!feldlemmata) {
        errors.push("• Wortfeldartikel ohne Feldlemmata");
      } else if (feldlemmata < 2) {
        errors.push("• Wortfeldartikel mit zu wenig Feldlemmata");
      }
    }

    // Fehler: nur Nebenlemmata
    if (!data.la.wf && !data.la.la.some(i => !i.nl)) {
      errors.push("• nur Nebenlemmata angegeben");
    }

    // Fehler: leere Lemmafelder
    if (!data.la.wf && data.la.la.length === 1 && !data.la.la[0].sc.some(i => i)) {
      errors.push("• kein Hauptlemma angegeben");
    } else {
      let leereFelder = false;
      for (const i of data.la.la) {
        if (i.sc.some(i => !i)) {
          leereFelder = true;
          break;
        }
      }
      if (leereFelder) {
        errors.push("• leere Lemmafelder stehen lassen");
      }
    }

    // Fehler in Lemmata:
    //   - doppelte Lemmata
    //   - mehrere Schreibungen nicht durch Slash trennen
    //   - illegale Lemmaform
    const lemmata = new Set();
    const doppelt = [];
    const getrennt = [];
    const illegal = [];
    for (const i of data.la.la) {
      if (data.la.wf && !i.nl) {
        continue;
      }
      for (const s of i.sc) {
        if (!s) {
          continue;
        }
        if (lemmata.has(s)) {
          doppelt.push(s);
        }
        if (/\//.test(s)) {
          getrennt.push(s);
        } else if (s && !/^[\p{L}\p{Nd}][\p{L}\p{Nd} .’-]*$/u.test(s)) {
          illegal.push(s);
        }
        lemmata.add(s);
      }
    }
    if (doppelt.length === 1) {
      errors.push(`• doppeltes Lemma: <i>${doppelt[0]}</i>`);
    } else if (doppelt.length) {
      errors.push(`• doppelte Lemmata: <i>${doppelt.join(", ")}</i>`);
    }
    if (getrennt.length) {
      errors.push(`• mehrere Schreibungen in einem Feld: <i>${getrennt.join(", ")}</i>`);
    }
    if (illegal.length) {
      const numerus = illegal.length > 1 ? "Lemmaformen" : "Lemmaform";
      errors.push(`• illegale ${numerus}: <i>${illegal.join(", ")}</i>`);
    }

    return errors;
  },

  // Liste aufbauen
  liste () {
    const liste = document.getElementById("lemmata-liste");
    liste.replaceChildren();

    const table = document.createElement("table");
    liste.appendChild(table);
    let keineSchreibungen = true;
    for (const lemma of data.la.la) {
      if (lemma.sc.length > 1) {
        keineSchreibungen = false;
        break;
      }
    }
    if (keineSchreibungen) {
      table.classList.add("keine-schreibungen");
    }
    if (data.la.la.length === 1) {
      table.classList.add("nur-ein-lemma");
    }

    for (let i = 0, len = data.la.la.length; i < len; i++) {
      const tr = document.createElement("tr");
      table.appendChild(tr);
      tr.dataset.idx = i;

      // ICONS
      const icons = document.createElement("td");
      tr.appendChild(icons);
      if (i > 0) {
        for (const cl of [ [ "icon-pfeil-gerade-hoch", "lemma-hoch" ], [ "icon-muelleimer", "lemma-del" ] ]) {
          const a = lemmata.listeLink(cl);
          icons.appendChild(a);
        }
      } else {
        const a = lemmata.listeLink([ "icon-plus-dick", "lemma-hinzu" ]);
        icons.appendChild(a);
      }

      // LEMMA-SPALTE
      const lemma = document.createElement("td");
      tr.appendChild(lemma);

      // Lemma und Schreibungen
      for (let j = 0, len = data.la.la[i].sc.length; j < len; j++) {
        const p = document.createElement("p");
        lemma.appendChild(p);
        p.dataset.idx = j;
        if (j > 0) {
          p.classList.add("p-schreibung");
          for (const cl of [ [ "icon-pfeil-gerade-hoch", "schreibung-hoch" ], [ "icon-muelleimer", "schreibung-del" ] ]) {
            const a = lemmata.listeLink(cl);
            p.appendChild(a);
          }
        } else {
          p.classList.add("p-lemma");
          const a = lemmata.listeLink([ "icon-plus-dick", "schreibung-hinzu" ]);
          p.appendChild(a);
        }
        const input = document.createElement("input");
        p.appendChild(input);
        input.classList.add("lemma");
        input.type = "text";
        let placeholder = data.la.la[i].nl ? "Nebenlemma" : "Hauptlemma";
        if (j > 0) {
          placeholder = `Schreibung ${j + 1}`;
        } else if (data.la.wf && i > 0) {
          placeholder = "Lemma";
        } else if (data.la.wf) {
          placeholder = "Titel";
        }
        input.setAttribute("placeholder", placeholder);
        input.value = data.la.la[i].sc[j];
      }

      // Nebenlemma-Checkbox
      const nl = document.createElement("p");
      lemma.appendChild(nl);
      nl.classList.add("p-nl");
      const nlI = document.createElement("input");
      nl.appendChild(nlI);
      nlI.type = "checkbox";
      nlI.id = "nl-" + i;
      const label = document.createElement("label");
      nl.appendChild(label);
      label.setAttribute("for", "nl-" + i);
      label.textContent = data.la.wf ? "Feldlemma" : "Nebenlemma";
      if (data.la.la[i].nl) {
        nlI.checked = true;
      }

      // KOMMENTAR
      const komm = document.createElement("td");
      tr.appendChild(komm);
      const kommI = document.createElement("input");
      komm.appendChild(kommI);
      kommI.classList.add("kommentar");
      kommI.type = "text";
      kommI.setAttribute("placeholder", "Kommentar");
      kommI.value = data.la.la[i].ko;
    }

    tooltip.init(liste);
    lemmata.listeEvents();
  },

  // Liste: Icon-Link erzeugen
  //   cl = Array (mit classes)
  listeLink (cl) {
    const titleMap = {
      "lemma-del": "Lemma löschen",
      "lemma-hinzu": "Lemma hinzufügen",
      "lemma-hoch": "Lemma hochschieben",
      "schreibung-del": "Schreibung löschen",
      "schreibung-hinzu": "Schreibung hinzufügen",
      "schreibung-hoch": "Schreibung hochschieben",
    };
    const a = document.createElement("a");
    a.classList.add("icon-link");
    for (const i of cl) {
      a.classList.add(i);
      if (titleMap[i]) {
        a.title = titleMap[i];
      }
    }
    a.href = "#";
    a.textContent = "\u00A0";
    return a;
  },

  // Liste: Events für die einzelnen Elemente
  listeEvents () {
    // Textfelder hören auf Enter => Eingabe beenden
    document.querySelectorAll("#lemmata-liste input[type='text']").forEach(i => {
      i.addEventListener("keydown", evt => {
        tastatur.detectModifiers(evt);
        if (!tastatur.modifiers && evt.key === "Enter") {
          lemmata.schliessen();
        }
      });
    });

    // Lemma hinzufügen
    document.querySelector("#lemmata-liste .lemma-hinzu").addEventListener("click", function (evt) {
      evt.preventDefault();
      // Datensatz auffrischen
      data.la.la.push({
        ko: "",
        nl: false,
        sc: [ "" ],
      });
      // Liste auffrischen
      lemmata.geaendert = true;
      lemmata.liste();
      document.querySelector(`#lemmata-liste tr[data-idx="${data.la.la.length - 1}"] input`).focus();
    });

    // Lemma entfernen
    document.querySelectorAll("#lemmata-liste .lemma-del").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        data.la.la.splice(idx, 1);
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
      });
    });

    // Lemma promovieren
    document.querySelectorAll("#lemmata-liste .lemma-hoch").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        const entry = structuredClone(data.la.la[idx]);
        data.la.la.splice(idx, 1);
        data.la.la.splice(idx - 1, 0, entry);
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        if (idx > 1) {
          document.querySelector(`#lemmata-liste tr[data-idx="${idx - 1}"] a.lemma-hoch`).focus();
        } else {
          document.querySelector(`#lemmata-liste tr[data-idx="${idx - 1}"] input`).focus();
        }
      });
    });

    // Schreibung hinzufügen
    document.querySelectorAll("#lemmata-liste .schreibung-hinzu").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        data.la.la[idx].sc.push("");
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        document.querySelectorAll(`#lemmata-liste tr[data-idx="${idx}"] input`)[data.la.la[idx].sc.length - 1].focus();
      });
    });

    // Schreibung entfernen
    document.querySelectorAll("#lemmata-liste .schreibung-del").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idxLemma = parseInt(this.closest("tr").dataset.idx, 10);
        const idxSchreibung = parseInt(this.closest("p").dataset.idx, 10);
        data.la.la[idxLemma].sc.splice(idxSchreibung, 1);
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        document.querySelectorAll(`#lemmata-liste tr[data-idx="${idxLemma}"] input`)[0].focus();
      });
    });

    // Schreibung promovieren
    document.querySelectorAll("#lemmata-liste .schreibung-hoch").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idxLemma = parseInt(this.closest("tr").dataset.idx, 10);
        const idxSchreibung = parseInt(this.closest("p").dataset.idx, 10);
        const schreibung = data.la.la[idxLemma].sc[idxSchreibung];
        data.la.la[idxLemma].sc.splice(idxSchreibung, 1);
        data.la.la[idxLemma].sc.splice(idxSchreibung - 1, 0, schreibung);
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        if (idxSchreibung > 1) {
          document.querySelectorAll(`#lemmata-liste tr[data-idx="${idxLemma}"] a.schreibung-hoch`)[idxSchreibung - 2].focus();
        } else {
          document.querySelector(`#lemmata-liste tr[data-idx="${idxLemma}"] input`).focus();
        }
      });
    });

    // Textänderung übernehmen
    let inputTimeout;
    document.querySelectorAll("#lemmata-liste input[type='text']").forEach(i => {
      i.addEventListener("input", function () {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
          const idxLemma = parseInt(this.closest("tr").dataset.idx, 10);
          if (this.classList.contains("kommentar")) {
            // Kommentar
            data.la.la[idxLemma].ko = this.value.trim();
          } else {
            // Lemma
            const idxSchreibung = parseInt(this.closest("p").dataset.idx, 10);
            data.la.la[idxLemma].sc[idxSchreibung] = this.value.trim();
          }
          lemmata.geaendert = true;
        }, 50);
      });
    });

    // Nebenlemma-Markierung umstellen
    document.querySelectorAll("#lemmata-liste input[type='checkbox']").forEach(i => {
      i.addEventListener("change", function () {
        // Datensatz auffrischen
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        data.la.la[idx].nl = this.checked;
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        document.querySelector(`#lemmata-liste tr[data-idx="${idx}"] input[type="checkbox"]`).focus();
      });
    });
  },
};
