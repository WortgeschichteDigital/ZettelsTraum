
import bedeutungenWin from "./bedeutungenWin.mjs";
import helfer from "./helfer.mjs";
import kartei from "./kartei.mjs";
import liste from "./liste.mjs";
import optionen from "./optionen.mjs";
import redXml from "./redXml.mjs";
import stamm from "./stamm.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import tooltip from "../tooltip.mjs";

export { lemmata as default };

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
    lemmata.lemmataStart = shared.lemmaliste();

    // Fenster füllen
    document.getElementById("lemmata-wf").checked = dd.file.la.wf;
    lemmata.ergaenzendUpdate();
    lemmata.liste();
    document.querySelector("#lemmata-liste input").select();

    // Maximalhöhe des Fenster-Contents festlegen
    shared.elementMaxHeight({
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
      const lemmaliste = shared.lemmaliste();
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
        // Nebenlemmata sammeln
        const nl = new Set();
        for (const lemma of dd.file.la.la) {
          if (!lemma.nl) {
            continue;
          }
          lemma.sc.forEach(i => nl.add(i));
        }

        // hinzugefügte Lemmata
        const hinzu = new Set();
        for (const i of lemmaliste) {
          if (!lemmata.lemmataStart.has(i)) {
            hinzu.add(i);
          }
        }
        const woerter = [];
        const ausWortverbindungNl = new Set();
        for (const lemma of hinzu) {
          if (dd.file.fv[lemma]) {
            dd.file.fv[lemma].an = true;
            if (/ /.test(lemma)) {
              // Formvarianten für Einzelwörter aus Wortverbindungen aktivieren
              for (const wort of lemma.split(" ")) {
                if (dd.file.fv[wort]) {
                  dd.file.fv[wort].an = true;
                }
              }
            }
          } else {
            woerter.push(lemma);
            if (/ /.test(lemma)) {
              // Formvarianten für Einzelwörter aus Wortverbindungen aufnehmen
              for (const wort of lemma.split(" ")) {
                if (!woerter.includes(wort) && !dd.file.fv[wort]) {
                  woerter.push(wort);
                  if (nl.has(lemma)) {
                    ausWortverbindungNl.add(wort);
                  }
                }
              }
            }
          }
        }
        if (woerter.length) {
          // Farben ermitteln, die noch vergeben werden können
          // 0 = Gelb
          // 5 = Rosa
          // 6 = Lila
          // 11 = Türkis
          // 12 = Dunkeltürkisgrün
          // 14 = Hellgrün
          const farben = [ 0, 14, 6, 11, 12, 5 ];
          while (farben.length < 17) {
            const fa = helfer.zufall(1, 17);
            if (fa !== 9 && !farben.includes(fa)) {
              // 9 = Blau (auslassen, weil Standardfarbe für Annotierungen)
              farben.push(fa);
            }
          }
          const farbenFv = {};
          for (const [ wort, val ] of Object.entries(dd.file.fv)) {
            farbenFv[wort] = val.fa;
            const idx = farben.indexOf(val.fa);
            if (idx > -1) {
              farben.splice(idx, 1);
            }
          }

          // Fenster sperren und Formvarianten laden
          document.activeElement.blur();
          const sperre = helfer.sperre(document.getElementById("lemmata-cont"));
          await new Promise(resolve => setTimeout(() => resolve(true), 250));
          await stamm.dtaGet(woerter, false);
          sperre.parentNode.removeChild(sperre);

          // neue Wörter ggf. als Nebenlemma markieren
          for (const wort of woerter) {
            if (ausWortverbindungNl.has(wort)) {
              dd.file.fv[wort].nl = true;
              continue;
            }
            for (const lemma of dd.file.la.la) {
              if (lemma.sc.includes(wort)) {
                if (!dd.file.la.wf && lemma.nl) {
                  dd.file.fv[wort].nl = true;
                }
                break;
              }
            }
          }

          // Farben für die Formvarianten vergeben
          // 1. Wortgruppen mit neuen Wörtern und deren Farbe ermitteln
          const gruppen = {};
          for (let i = 0, len = dd.file.la.la.length; i < len; i++) {
            const lemma = dd.file.la.la[i];
            if (dd.file.la.wf && !lemma.nl) {
              // Titel von Wortfeldartikeln ausschließen
              continue;
            }
            let sc = [ ...lemma.sc ];
            let fa = -1;
            for (const i of lemma.sc) {
              if (typeof farbenFv[i] !== "undefined") {
                fa = farbenFv[i];
              }
              const mehrwort = i.split(" ");
              if (mehrwort.length > 1) {
                sc = sc.concat(mehrwort);
              }
            }
            if (sc.some(i => woerter.includes(i))) {
              // Gruppe nur aufnehmen, wenn eines der Wörter neu geladen wurde
              gruppen[i] = {
                sc,
                fa,
              };
            }
          }


          // 2. den Wortgruppen mit neuen Wörtern ihre Farben zuordnen
          for (const val of Object.values(gruppen)) {
            let fa = val.fa;
            if (fa === -1) {
              if (!farben.length) {
                do {
                  fa = helfer.zufall(0, 17);
                  // 9 = Blau (auslassen, weil Standardfarbe für Annotierungen)
                } while (fa === 9);
              } else {
                fa = farben[0];
                farben.shift();
              }
            }
            for (const i of val.sc) {
              if (dd.file.fv[i]) {
                dd.file.fv[i].fa = fa;
              }
            }
          }
        }

        // entfernte Lemmata
        const weg = new Set();
        for (const lemma of lemmata.lemmataStart) {
          if (!lemmaliste.has(lemma)) {
            weg.add(lemma);
            if (/ /.test(lemma)) {
              // Einzelwörter aus einer Wortverbindungen ebenfalls als verschwunden markieren
              for (const wort of lemma.split(" ")) {
                weg.add(wort);
              }
            }
          }
        }
        for (const lemma of weg) {
          if (dd.file.fv[lemma]) {
            dd.file.fv[lemma].an = false;
          }
        }

        // reguläre Ausdrücke auffrischen
        helfer.formVariRegExp();

        // Filterleiste auffrischen
        liste.status(true);
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
    if (dd.file.la.wf) {
      let titel = 0;
      let alternativen = 0;
      let feldlemmata = 0;
      for (const entry of dd.file.la.la) {
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
    if (!dd.file.la.wf && !dd.file.la.la.some(i => !i.nl)) {
      errors.push("• nur Nebenlemmata angegeben");
    }

    // Fehler: leere Lemmafelder
    if (!dd.file.la.wf && dd.file.la.la.length === 1 && !dd.file.la.la[0].sc.some(i => i)) {
      errors.push("• kein Hauptlemma angegeben");
    } else {
      let leereFelder = false;
      for (const i of dd.file.la.la) {
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
    for (const i of dd.file.la.la) {
      if (dd.file.la.wf && !i.nl) {
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

  // ergänzende Kartei: Update der Anzeige
  ergaenzendUpdate () {
    const sup = [ "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹" ];
    const er = document.getElementById("lemmata-er");
    const erFuer = document.getElementById("lemmata-er-fuer");
    if (dd.file.la.er.length) {
      er.checked = true;
      erFuer.classList.add("kartei-ergaenzt");
      const la = [];
      for (const i of dd.file.la.er) {
        let lemma = "";
        if (i.ho) {
          lemma += sup[i.ho - 1];
        }
        lemma += i.hl;
        la.push(lemma);
      }
      erFuer.textContent = la.join(", ");
    } else {
      er.checked = false;
      erFuer.classList.remove("kartei-ergaenzt");
      erFuer.textContent = "…";
    }
  },

  // ergänzende Kartei: Verknüpfung entfernen oder ergänzen
  async ergaenzend () {
    // Haken entfernt
    const er = document.getElementById("lemmata-er");
    if (!er.checked) {
      dd.file.la.er.length = 0;
      lemmata.ergaenzendUpdate();
      lemmata.geaendert = true;
      return;
    }

    // Haken gesetzt
    await new Promise(resolve => {
      dialog.oeffnen({
        typ: "alert",
        text: "Wählen Sie im folgenden Dateidialog diejenige ZTJ-Kartei aus, für die die hier geöffnete Kartei ergänzende Belege enthält.",
        callback: () => resolve(true),
      });
    });

    // Kartei öffnen
    const opt = {
      title: "Kartei öffnen",
      defaultPath: dd.app.documents,
      filters: [
        {
          name: `${dd.app.name} JSON`,
          extensions: [ "ztj" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
      properties: [ "openFile" ],
    };
    if (optionen.data.letzter_pfad) {
      opt.defaultPath = optionen.data.letzter_pfad;
    }
    const result = await bridge.ipc.invoke("datei-dialog", {
      open: true,
      winId: dd.win.winId,
      opt,
    });

    // Fehler im Dateidialog
    if (result.message || !Object.keys(result).length) {
      fehler(result.message);
      return;
    }

    // Dialog vom User ohne Auswahl einer Kartei geschlossen
    if (result.canceled) {
      er.checked = false;
      return;
    }

    // Datei einlesen
    const content = await bridge.ipc.invoke("io", {
      action: "read",
      path: result.filePaths[0],
    });
    if (typeof content !== "string") {
      fehler(`${content.name}: ${content.message}`);
      return;
    }
    let json;
    try {
      json = JSON.parse(content);
    } catch (err) {
      fehler(`${err.name}: ${err.message}`);
      return;
    }
    if (!json?.la) {
      fehler("das Lemma-Objekt wurde nicht gefunden");
      return;
    }

    // Lemmata registrieren
    for (const lemma of json.la.la) {
      if (lemma.nl) {
        continue;
      }
      dd.file.la.er.push({
        hl: lemma.sc.join("/"),
        ho: lemma.ho,
      });
    }
    if (!dd.file.la.er.length) {
      fehler("keine Hauptlemma gefunden");
      return;
    }
    lemmata.ergaenzendUpdate();
    lemmata.geaendert = true;

    // Fehlermeldung und Checkbox ausschalten
    function fehler (message) {
      er.checked = false;
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${message.replace(/\n/g, " ")}</p>`,
      });
    }
  },

  // Liste aufbauen
  liste () {
    const liste = document.getElementById("lemmata-liste");
    liste.replaceChildren();

    const table = document.createElement("table");
    liste.appendChild(table);
    let keineSchreibungen = true;
    for (const lemma of dd.file.la.la) {
      if (lemma.sc.length > 1) {
        keineSchreibungen = false;
        break;
      }
    }
    if (keineSchreibungen) {
      table.classList.add("keine-schreibungen");
    }
    if (dd.file.la.la.length === 1) {
      table.classList.add("nur-ein-lemma");
    }

    for (let i = 0, len = dd.file.la.la.length; i < len; i++) {
      const tr = document.createElement("tr");
      table.appendChild(tr);
      tr.dataset.idx = i;

      // ICONS-SPALTE
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
      for (let j = 0, len = dd.file.la.la[i].sc.length; j < len; j++) {
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
        let placeholder = dd.file.la.la[i].nl ? "Nebenlemma" : "Hauptlemma";
        if (j > 0) {
          placeholder = `Schreibung ${j + 1}`;
        } else if (dd.file.la.wf && i > 0) {
          placeholder = "Lemma";
        } else if (dd.file.la.wf) {
          placeholder = "Titel";
        }
        input.setAttribute("placeholder", placeholder);
        input.value = dd.file.la.la[i].sc[j];
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
      label.textContent = dd.file.la.wf ? "Feldlemma" : "Nebenlemma";
      if (dd.file.la.la[i].nl) {
        nlI.checked = true;
      }

      // HOMOGRAPHENINDEX-SPALTE
      const homo = document.createElement("td");
      tr.appendChild(homo);
      const homoI = document.createElement("input");
      homo.appendChild(homoI);
      homoI.classList.add("homo");
      homoI.type = "number";
      homoI.setAttribute("min", "0");
      homoI.setAttribute("max", "9");
      homoI.title = "Homographenindex";
      homoI.value = dd.file.la.la[i].ho;
      homoI.defaultValue = dd.file.la.la[i].ho;

      // KOMMENTAR-SPALTE
      const komm = document.createElement("td");
      tr.appendChild(komm);
      const kommI = document.createElement("input");
      komm.appendChild(kommI);
      kommI.classList.add("kommentar");
      kommI.type = "text";
      kommI.setAttribute("placeholder", "Kommentar");
      kommI.value = dd.file.la.la[i].ko;
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
    document.querySelectorAll("#lemmata-liste input:is([type='text'], [type='number'])").forEach(i => {
      i.addEventListener("keydown", evt => {
        sharedTastatur.detectModifiers(evt);
        if (!sharedTastatur.modifiers && evt.key === "Enter") {
          lemmata.schliessen();
        }
      });
    });

    // Änderung des Homographenindex übernehmen
    document.querySelectorAll("#lemmata-liste input[type='number']").forEach(i => {
      i.addEventListener("input", function () {
        // Auto-Korrektur fehlerhafter Eingaben
        helfer.inputNumber(this);
        // Eingabe übernehmen
        const idxLemma = parseInt(this.closest("tr").dataset.idx, 10);
        dd.file.la.la[idxLemma].ho = parseInt(this.value, 10);
        lemmata.geaendert = true;
      });
    });

    // Lemma hinzufügen
    document.querySelector("#lemmata-liste .lemma-hinzu").addEventListener("click", function (evt) {
      evt.preventDefault();
      // Datensatz auffrischen
      dd.file.la.la.push({
        ho: 0,
        ko: "",
        nl: false,
        sc: [ "" ],
      });
      // Liste auffrischen
      lemmata.geaendert = true;
      lemmata.liste();
      document.querySelector(`#lemmata-liste tr[data-idx="${dd.file.la.la.length - 1}"] input`).focus();
    });

    // Lemma entfernen
    document.querySelectorAll("#lemmata-liste .lemma-del").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idx = parseInt(this.closest("tr").dataset.idx, 10);
        dd.file.la.la.splice(idx, 1);
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
        const entry = structuredClone(dd.file.la.la[idx]);
        dd.file.la.la.splice(idx, 1);
        dd.file.la.la.splice(idx - 1, 0, entry);
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
        dd.file.la.la[idx].sc.push("");
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        document.querySelectorAll(`#lemmata-liste tr[data-idx="${idx}"] input`)[dd.file.la.la[idx].sc.length - 1].focus();
      });
    });

    // Schreibung entfernen
    document.querySelectorAll("#lemmata-liste .schreibung-del").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        // Datensatz auffrischen
        const idxLemma = parseInt(this.closest("tr").dataset.idx, 10);
        const idxSchreibung = parseInt(this.closest("p").dataset.idx, 10);
        dd.file.la.la[idxLemma].sc.splice(idxSchreibung, 1);
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
        const schreibung = dd.file.la.la[idxLemma].sc[idxSchreibung];
        dd.file.la.la[idxLemma].sc.splice(idxSchreibung, 1);
        dd.file.la.la[idxLemma].sc.splice(idxSchreibung - 1, 0, schreibung);
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
            dd.file.la.la[idxLemma].ko = this.value.trim();
          } else {
            // Lemma
            const idxSchreibung = parseInt(this.closest("p").dataset.idx, 10);
            dd.file.la.la[idxLemma].sc[idxSchreibung] = this.value.trim();
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
        const lemma = dd.file.la.la[idx];
        lemma.nl = this.checked;
        // Formvarianten auffrischen
        if (!dd.file.la.wf) {
          for (const sc of lemma.sc) {
            const fv = dd.file.fv[sc];
            if (fv) {
              fv.nl = this.checked;
            }
          }
        }
        // Liste auffrischen
        lemmata.geaendert = true;
        lemmata.liste();
        document.querySelector(`#lemmata-liste tr[data-idx="${idx}"] input[type="checkbox"]`).focus();
      });
    });
  },
};
