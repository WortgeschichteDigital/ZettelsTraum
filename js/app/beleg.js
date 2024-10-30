"use strict";

const beleg = {
  // speichert, ob die Leseansicht gerade angezeigt wird
  // (ansonsten sieht man die Formularansicht)
  leseansicht: false,

  // ID der aktuell angezeigten Karte
  id_karte: -1,

  // Kopie der Daten der aktuell angezeigten Karte
  data: {},

  // Liste häufig verwendeter Korpora für das Dropdown-Menü
  korpora: [
    "DTA",
    "IDS",
    "DWDS: Kernkorpus",
    "DWDS: Kernkorpus 21",
    "DWDS: Zeitungskorpus",
    "DWDS: Berliner Zeitung",
    "DWDS: Berliner Wendecorpus",
    "DWDS: Blogs",
    "DWDS: DDR",
    "DWDS: Dortmunder Chat-Korpus",
    "DWDS: Filmuntertitel",
    "DWDS: Gesprochene Sprache",
    "DWDS: IT-Blogs",
    "DWDS: Mode- und Beauty-Blogs",
    "DWDS: neues deutschland",
    "DWDS: Politische Reden",
    "DWDS: Polytechnisches Journal",
    "DWDS: Referenz- und Zeitungskorpora",
    "DWDS: Tagesspiegel",
    "DWDS: Text+Berg",
    "DWDS: Webkorpus 2016c",
    "DWDS: Die ZEIT",
    "DWDS: ZDL-Regionalkorpus",
  ],

  // neue Karteikarte erstellen
  async erstellen () {
    // registrieren, dass die Hauptfunktion "Karteikarte" offen ist
    helfer.hauptfunktion = "karte";
    // alle Overlay-Fenster schließen
    await overlay.alleSchliessen();
    // nächste ID ermitteln
    beleg.id_karte = beleg.idErmitteln();
    // neues Karten-Objekt anlegen
    beleg.data = beleg.karteErstellen();
    // ggf. die Leseansicht verlassen
    if (beleg.leseansicht) {
      beleg.leseToggle(false);
    }
    // Karte anzeigen
    beleg.formular(true);
    // Fenster nach oben scrollen
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: "smooth",
    });
  },

  // ermittelt die nächste ID, die in der aktuellen Kartei vergeben werden sollte
  idErmitteln () {
    let id_karte = 0;
    const ids = Object.keys(data.ka);
    for (let i = 0, len = ids.length; i < len; i++) {
      const id = parseInt(ids[i], 10);
      if (id > id_karte) {
        id_karte = id;
      }
    }
    id_karte++;
    return id_karte;
  },

  // erstellt ein leeres Daten-Objekt für eine neue Karteikarte
  karteErstellen () {
    const karte = {
      an: [], // Anhänge
      au: "", // Autor
      bb: "", // Seite, bis zu der das XML aus einer Datei importiert wurde
      bd: [], // Bedeutung
      be: 0, // Bewertung (Markierung)
      bi: "", // Importtyp (bezieht sich auf die Daten in bx)
      bl: "", // Wortbildung
      bs: "", // Beleg
      bv: "", // Seite, von der an das XML aus einer Datei importiert wurde
      bx: "", // Beleg-XML
      da: "", // Belegdatum
      dc: new Date().toISOString(), // Datum Karteikarten-Erstellung
      di: "", // Importdatum
      dm: "", // Datum Karteikarten-Änderung
      kr: "", // Korpus
      no: "", // Notizen
      qu: "", // Quelle
      sy: "", // Synonym
      tg: [], // Tags
      ts: "", // Textsorte
      ud: "", // Aufrufdatum
      ul: "", // URL
    };
    if (optionen.data.einstellungen.unvollstaendig) {
      karte.tg.push("unvollständig");
    }
    return karte;
  },

  // bestehende Karteikarte öffnen
  //   id = Number
  //     (ID der Karte, die geöffnet werden soll)
  oeffnen (id) {
    // registrieren, dass die Hauptfunktion "Karteikarte" offen ist
    helfer.hauptfunktion = "karte";
    // ggf. Sortieren-Popup in der Belegliste schließen
    liste.headerSortierenSchliessen();
    // ggf. Annotierungs-Popup in der Belegliste schließen
    annotieren.modSchliessen();
    // ID zwischenspeichern
    beleg.id_karte = id;
    // Daten des Belegs kopieren
    beleg.data = structuredClone(data.ka[id]);
    // in Lese- oder in Formularansicht öffnen?
    if (optionen.data.einstellungen.leseansicht) {
      beleg.formular(false); // wegen der Bedeutungen *vor* dem Füllen der Leseansicht
      if (!beleg.leseansicht) {
        beleg.leseToggle(false);
      } else {
        beleg.leseFill();
      }
    } else {
      if (beleg.leseansicht) {
        beleg.leseToggle(false);
      }
      beleg.formular(false); // wegen der Textarea-Größe *nach* dem Umschalten der Leseansicht
    }
  },

  // Formular füllen und anzeigen
  //   neu = Boolean
  //     (neue Karteikarte erstellen)
  //   imp = true | undefined
  //     (Formular wird direkt nach einem Import gefüllt)
  async formular (neu, imp = false) {
    // regulären Ausdruck für Sprung zum Wort zurücksetzen
    beleg.ctrlSpringenFormReset();

    // Beleg-Titel eintragen
    const beleg_titel = document.getElementById("beleg-titel");
    const titel_text = document.createTextNode(`Beleg #${beleg.id_karte}`);
    beleg_titel.replaceChild(titel_text, beleg_titel.firstChild);

    // Tags eintragen
    beleg.tagsFill();

    // Feld-Werte eintragen bzw. zurücksetzen
    const felder = document.querySelectorAll("#beleg input, #beleg textarea");
    for (let i = 0, len = felder.length; i < len; i++) {
      const feld = felder[i];
      const name = feld.id.replace(/^beleg-/, "");
      if (name === "import-feld" && !imp) {
        feld.value = "";
      } else if (/^import-(von|bis)$/.test(name) && !imp) {
        feld.value = "0";
      } else if (feld.classList.contains("beleg-form-data")) {
        feld.value = beleg.data[name];
      }
    }

    // Bedeutung: Label anpassen
    beleg.formularBedeutungLabel();

    // Bedeutung: angehängte Bedeutungen eingtragen
    beleg.formularBedeutungFill();

    // Bewertung eintragen
    beleg.bewertungAnzeigen();

    // Anhänge auflisten
    anhaenge.auflisten(document.getElementById("beleg-an"), "beleg|data|an");

    // Metadatenfelder füllen
    beleg.metadaten();

    // Änderungsmarkierung ausblenden
    beleg.belegGeaendert(false);

    // Formular einblenden
    helfer.sektionWechseln("beleg");

    // Textarea zurücksetzen
    document.querySelectorAll("#beleg textarea").forEach(function (textarea) {
      textarea.scrollTop = 0;
      helfer.textareaGrow(textarea);
    });

    // Belegtext nach Import ggf. automatisch kürzen
    if (imp && optionen.data.einstellungen["karteikarte-text-kuerzen-auto"]) {
      beleg.toolsKuerzen();
    }

    // Fokus setzen
    // (hier braucht es eine Verzögerung: Wird die Karte z.B. direkt nach dem
    // Erstellen einer neuen Wortkartei aufgerufen, wird der fokussierte Button
    // automatisch ausgeführt, wenn man Enter gedrückt hat)
    await new Promise(resolve => setTimeout(() => resolve(true), 25));
    if (neu && !beleg.leseansicht) {
      // Zwischenablage auswerten
      let cb = importShared.detectType(modules.clipboard.readText(), modules.clipboard.readHTML());

      // keine bekannten Daten in der Zwischenablage => Dateidaten vorhanden?
      if (!cb &&
          importShared.fileData.data.length > 1 &&
          importShared.fileData.path) {
        cb = importShared.detectType("file://" + importShared.fileData.path, "");
      }

      // immer noch keine bekannten Daten in der Zwischenablage => Fokus setzen
      if (!cb) {
        const feld = optionen.data.einstellungen["karteikarte-fokus-beleg"] ? "beleg-bs" : "beleg-da";
        document.getElementById(feld).focus();
        return;
      }

      // Import-Formular gemäß der Daten in der Zwischenablage umstellen und füllen
      beleg.formularImport({ src: cb.formView, typeData: cb });
    }
  },

  // Label der Bedeutung auffrischen
  formularBedeutungLabel () {
    const text = `Bedeutung${bedeutungen.aufbauenH2Details(data.bd, true)}`;
    const label = document.querySelector('[for="beleg-bd"]');
    label.textContent = text;
  },

  // Bedeutung: hinzugefügte Bedeutungen auflisten
  // (sowohl in der Formular- als auch in der Leseansicht)
  formularBedeutungFill () {
    const fields = [ "beleg-lese-bd", "beleg-form-bd" ];
    for (const field of fields) {
      // Container vorbereiten
      const cont = document.getElementById(field);
      cont.replaceChildren();

      // Bedeutungen eintragen
      for (const i of beleg.data.bd) {
        if (i.gr !== data.bd.gn) {
          // Bedeutungen aus anderen als dem aktuellen Gerüst nicht drucken
          continue;
        }
        // Bedeutung
        const p = document.createElement("p");
        cont.appendChild(p);
        p.innerHTML = bedeutungen.bedeutungenTief({
          gr: data.bd.gn,
          id: i.id,
          zaCl: true,
        });
        // Entfernen-Icon
        const a = document.createElement("a");
        p.insertBefore(a, p.firstChild);
        a.classList.add("icon-link", "icon-entfernen");
        a.dataset.id = i.id;
        a.href = "#";
        beleg.formularBedeutungEx(a);
      }

      // ggf. leeren Absatz für die Leseansicht erzeugen
      if (field === "beleg-lese-bd" && !cont.hasChildNodes()) {
        const p = document.createElement("p");
        cont.appendChild(p);
        p.textContent = "\u00A0";
      }
    }
  },

  // Bedeutung: hinzugefügte Bedeutung entfernen
  //   icon = Element-Node
  formularBedeutungEx (icon) {
    icon.addEventListener("click", function (evt) {
      evt.preventDefault();

      // Wert entfernen
      const id = parseInt(this.dataset.id, 10);
      const idx = beleg.data.bd.findIndex(i => i.gr === data.bd.gn && i.id === id);
      beleg.data.bd.splice(idx, 1);

      // Ansicht auffrischen
      beleg.formularBedeutungFill();

      // Änderungsmarkierung setzen
      beleg.belegGeaendert(true);

      // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
      if (document.getElementById("suchleiste")) {
        suchleiste.suchen(true);
      }
    });
  },

  // Bedeutung: Liste noch nicht hinzugefügten Bedeutungen erstellen
  formularBedeutungList () {
    // Bedeutungen sammeln, die noch nicht an der Karteikarte hängen
    const gr = data.bd.gr[data.bd.gn];
    const bd = [];
    for (let idx = 0, len = gr.bd.length; idx < len; idx++) {
      const b = gr.bd[idx];
      if (beleg.data.bd.some(i => i.gr === data.bd.gn && i.id === b.id)) {
        continue;
      }
      const zaehlung = bedeutungen.zaehlungTief(idx, gr.bd);
      bd.push({
        id: b.id,
        idx,
        level: b.bd.length,
        text: `<b class="bed-zaehlung">${zaehlung.join(" ")}</b>${b.bd.at(-1)}`,
        zaehlung: zaehlung.join(" "),
      });
    }

    // Fragment erstellen und zurückgeben
    const frag = document.createDocumentFragment();
    for (const b of bd) {
      const a = document.createElement("a");
      frag.appendChild(a);
      const level = b.level > 8 ? 8 : b.level;
      a.classList.add(`bed-level${level}`);
      a.dataset.id = b.id;
      a.dataset.suchtext = b.zaehlung + "|" + gr.bd[b.idx].bd.join("|").replace(/<.+?>/g, "");
      a.href = "#";
      a.innerHTML = b.text;
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const id = parseInt(this.dataset.id, 10);
        beleg.formularBedeutungPush(id);
        this.parentNode.removeChild(this);
      });
    }
    return frag;
  },

  // Bedeutung: neue Bedeutungen hinzufügen
  //   val = String
  //     (im Bedeutung-Feld eingetippte Bedeutung)
  formularBedeutungAdd (val) {
    // Bedeutung schon vorhanden?
    const valNorm = val.replace(/<.+?>/g, "").toLowerCase();
    const gr = data.bd.gr[data.bd.gn];
    const bd = gr.bd;
    for (let idx = 0, len = bd.length; idx < len; idx++) {
      const bdAkt = [ ...bd[idx].bd ];
      for (let i = 0, len = bdAkt.length; i < len; i++) {
        bdAkt[i] = bdAkt[i].replace(/<.+?>/g, "").toLowerCase();
      }
      // Bedeutung vorhanden
      if (bdAkt.includes(valNorm)) {
        const id = bd[idx].id;
        // Bedeutung hängt schon an der Karte => Abbruch
        if (beleg.data.bd.some(i => i.gr === data.bd.gn && i.id === id)) {
          const index = bdAkt.indexOf(valNorm);
          const bedeutung = bd[idx].bd[index].replace(/<.+?>/g, "");
          const zaehlung = bedeutungen.zaehlungTief(idx, bd);
          dialog.oeffnen({
            typ: "alert",
            text: `Die Bedeutung\n<p class="bedeutungen-dialog"><b>${zaehlung.join(" ")}</b> ${bedeutung}</p>\nist schon vorhanden und hängt bereits an der Karteikarte.`,
            callback: () => document.getElementById("beleg-bd").select(),
          });
          return false;
        }
        // Bedeutung hängt noch nicht an der Karte => hinzufügen
        beleg.formularBedeutungPush(bd[idx].id);
        return true;
      }
    }

    // neue Bedeutung zum Gerüst hinzufügen
    if (!bedeutungen.makeId) {
      bedeutungen.idInit(gr);
    }
    const bed = bedeutungen.konstitBedeutung([ val ]);
    gr.bd.push(bed);
    bedeutungen.konstitZaehlung(gr.bd, gr.sl);
    kartei.karteiGeaendert(true);

    // Bedeutungsgerüst-Fenster mit neuen Daten versorgen
    bedeutungenWin.daten();

    // neue Bedeutung an die Karte hängen
    beleg.formularBedeutungPush(gr.bd.at(-1).id);
    return true;
  },

  // Bedeutung: übergebene ID pushen
  //   id = Number
  //     (ID der Bedeutung)
  //   gr = String | undefined
  //     (ID des Bedeutungsgerüsts)
  formularBedeutungPush (id, gr = data.bd.gn) {
    beleg.data.bd.push({
      gr,
      id,
    });
    beleg.data.bd.sort(beleg.formularBedeutungSort);
    beleg.formularBedeutungFill();
    beleg.belegGeaendert(true);
  },

  // Bedeutung: Bedeutungen sortieren
  formularBedeutungSort (a, b) {
    const x = data.bd.gr[a.gr].bd.findIndex(i => i.id === a.id);
    const y = data.bd.gr[b.gr].bd.findIndex(i => i.id === b.id);
    return x - y;
  },

  // Änderungen in einem der Datenfelder des Formulars
  // (input | textarea + .beleg-form-data)
  //   feld = Element
  //     (das Formularfeld, das geändert wurde)
  formularGeaendert (feld) {
    feld.addEventListener("change", function () {
      const val = helfer.textTrim(this.value, true);
      const name = this.id.replace(/^beleg-/, "");
      let noLeerzeilen = "";
      if (name === "no" && /^\n/.test(this.value)) {
        // am Anfang der Notizen müssen Leerzeilen erlaubt sein,
        // weil die erste Zeile in der Belegliste angezeigt werden kann
        noLeerzeilen = this.value.match(/^\n+/)[0];
      } else if (name === "ul") {
        const ud = document.getElementById("beleg-ud");
        if (!beleg.data.ul) {
          const heute = new Date().toISOString().split("T")[0];
          ud.value = heute;
          beleg.data.ud = heute;
        } else if (!val && beleg.data.ul) {
          ud.value = "";
          beleg.data.ud = "";
        }
      }
      beleg.data[name] = noLeerzeilen + val;
      beleg.belegGeaendert(true);
    });
  },

  // zwischen den Import-Formularen hin- und herschalten (Listener)
  //   radio = Element
  //     (Radio-Button zum Umschalten des Import-Formulars)
  formularImportListener (radio) {
    radio.addEventListener("change", function () {
      const src = this.id.replace("beleg-import-quelle-", "");
      beleg.formularImport({ src, fokus: false });
    });
  },

  // zwischen den Import-Formularen hin- und herschalten
  //   src = string
  //     (ID der Quelle, aus der importiert werden soll: url | datei | zwischenablage)
  //   fokus = false | undefined
  //     (Automatisch Fokus ins Formular setzen)
  //   typeData = object | undefined
  //     (Analyseergebnis, das von importShared.detectType() zurückgegeben wird)
  //   autoFill = false | undefined
  //     (Import-Feld automatisch mit übergebenen oder Daten aus der Zwischenablage füllen)
  formularImport ({ src, fokus = true, typeData = null, autoFill = true }) {
    // Radio-Buttons umstellen
    // (weil Wechsel nicht nur auf Klick, sondern auch automatisch geschieht)
    const radio = document.getElementById("beleg-import-quelle-" + src);
    if (!radio.checked) {
      document.getElementsByName("beleg-import-quelle").forEach(i => {
        if (i === radio) {
          i.checked = true;
        } else {
          i.checked = false;
        }
      });
    }

    // Formular zurücksetzen
    const feld = document.getElementById("beleg-import-feld");
    const von = document.getElementById("beleg-import-von");
    const bis = document.getElementById("beleg-import-bis");
    if (autoFill) {
      feld.value = "";
      von.value = "0";
      bis.value = "0";
    }

    // Formular umstellen
    const placeholders = {
      url: "URL",
      datei: "Dateipfad",
      zwischenablage: "Zwischenablage",
    };
    feld.setAttribute("placeholder", placeholders[src]);
    if (src === "zwischenablage") {
      feld.readOnly = true;
    } else {
      feld.readOnly = false;
    }
    const datei = document.getElementById("beleg-import-datei");
    if (src === "datei") {
      datei.classList.remove("aus");
    } else {
      datei.classList.add("aus");
    }

    // Textfeld entsprechend der Zwischenablage füllen
    if (autoFill) {
      const cb = typeData || importShared.detectType(modules.clipboard.readText(), modules.clipboard.readHTML());
      if (optionen.data.einstellungen["url-eintragen"] &&
          (src === "url" && cb?.type === "url" ||
          src === "datei" && cb?.type === "file")) {
        feld.value = cb.data.firstLine;
        feld.dispatchEvent(new Event("input"));
      } else if (src === "zwischenablage" && cb?.formView === "zwischenablage") {
        feld.value = "Zwischenablage: " + cb.formText;
      } else if (src === "datei" &&
          importShared.fileData.data.length > 1 &&
          importShared.fileData.path) {
        feld.value = "file://" + importShared.fileData.path;
      }
    } else {
      feld.dispatchEvent(new Event("input"));
    }

    // Fokus setzen
    if (!fokus) {
      return;
    }
    const start = document.getElementById("beleg-import-start");
    if (!feld.value && src !== "zwischenablage") {
      feld.focus();
    } else if (src === "url") {
      if (von.value === "0") {
        von.select();
      } else {
        bis.select();
      }
    } else if (src === "datei") {
      if (importShared.isFilePath(feld.value)) {
        von.select();
      } else {
        datei.focus();
      }
    } else {
      start.focus();
    }
  },

  // Events in Datenfeldern des Formulars
  // (input | textarea + .beleg-form-data)
  //   input = Node
  formularEvtFormData (input) {
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if ((!tastatur.modifiers || tastatur.modifiers === "Ctrl") && evt.key === "Enter") {
        if (tastatur.modifiers === "Ctrl") {
          evt.preventDefault();
          this.blur();
          const result = beleg.aktionSpeichern();
          if (result) {
            this.focus();
          }
        } else if (document.getElementById("dropdown") &&
            this.classList.contains("dropdown-feld")) {
          evt.preventDefault();
        }
      }
    });
  },

  // Events in Feldern des Import-Formulars
  formularEvtImport () {
    // Import anstoßen
    document.querySelectorAll("#beleg-import-feld, #beleg-import-von, #beleg-import-bis").forEach(input => {
      input.addEventListener("keydown", evt => {
        if (evt.key === "Enter") {
          importShared.startImport();
        }
      });
    });

    // Werte vom Von- und vom Bis-Feld automatisch ermitteln
    const feld = document.getElementById("beleg-import-feld");
    feld.addEventListener("input", function () {
      let parsedURL;
      try {
        parsedURL = new URL(this.value.trim());
      } catch {
        return;
      }
      const urlImport = document.getElementById("beleg-import-quelle-url").checked;
      const von = this.nextSibling;
      const bis = von.nextSibling;
      if (urlImport && parsedURL.origin === "https://www.deutschestextarchiv.de") {
        const page = importTEI.dtaGetPageNo(parsedURL);
        von.value = page;
        bis.value = page + 1;
      } else if (urlImport) {
        von.value = "0";
        bis.value = "0";
      }
    });

    // URL oder File-Protokoll automatisch pasten
    feld.addEventListener("focus", function () {
      if (this.value || this.readOnly || !optionen.data.einstellungen["url-eintragen"]) {
        return;
      }
      const cb = importShared.detectType(modules.clipboard.readText(), modules.clipboard.readHTML());
      if (cb?.type === "file" || cb?.type === "url") {
        setTimeout(() => {
          // der Fokus könnte noch in einem anderen Feld sein, das dann gefüllt werden würde;
          // man muss dem Fokus-Wechsel ein bisschen Zeit geben
          if (document.activeElement.id !== "beleg-import-feld") {
            // ist eine URL in der Zwischenablage, fokussiert man das Import-Feld und löscht den Inhalt,
            // defokussiert man das Programm und fokussiert es dann wieder, indem man direkt
            // auf ein anderes Textfeld klickt, würde dieses Textfeld gefüllt werden
            return;
          }
          beleg.formularImport({ src: cb.formView, typeData: cb });
        }, 10);
      }
    });
  },

  // Tags: Liste der Standardtags und ihrer Icons
  tags: {
    unvollständig: "kreis-unvollstaendig.svg",
    ungeprüft: "verboten.svg",
    unzutreffend: "fahne-rot.svg",
    "Kontext?": "kontext.svg",
    Bücherdienst: "buch.svg",
    Buchung: "buch-check-gruen.svg",
    Metatext: "augen.svg",
  },

  // Tags: Kopf der Karteikarte füllen
  tagsFill () {
    const add = document.getElementById("beleg-tags-add");
    const cont = document.getElementById("beleg-tags");
    const ansicht = optionen.data.einstellungen["karteikarte-tagging"] ? "neu" : "alt";
    if (ansicht === "neu") {
      // Tags-Input einschalten
      add.classList.remove("aus");

      // Bewertungssterne hinzufügen
      cont.replaceChildren();
      const bewertung = beleg.tagsBewertung("span");
      cont.appendChild(bewertung);

      // Tags hinzufügen
      for (const i of beleg.data.tg) {
        const tag = beleg.tagNeu(i, true);
        cont.appendChild(tag);
      }
    } else {
      // Tags-Input ausschalten
      add.classList.add("aus");

      // ggf. Checkboxes hinzufügen
      if (cont.dataset.ansicht !== "alt") {
        // Bewertungssterne hinzufügen
        cont.replaceChildren();
        const bewertung = beleg.tagsBewertung("p");
        add.parentNode.insertBefore(bewertung, add);

        // Checkboxes hinzufügen
        const alleTags = beleg.tagsAlle();
        for (const i of [ ...alleTags ].sort(beleg.tagsSort)) {
          const tag = beleg.tagAlt(i);
          cont.appendChild(tag);
        }
      }

      // Checkboxes abhaken
      document.querySelectorAll("#beleg-tags input").forEach(i => {
        const tag = i.value;
        if (beleg.data.tg.includes(tag)) {
          i.checked = true;
        } else {
          i.checked = false;
        }
      });
    }
    cont.dataset.ansicht = ansicht;
  },

  // Tags: Container mit Bewertungssternen erzeugen
  //   tagName = String
  //     (p | span)
  tagsBewertung (tagName) {
    // alten Container entfernen
    const contAlt = document.getElementById("beleg-bewertung");
    if (contAlt) {
      contAlt.parentNode.removeChild(contAlt);
    }

    // neuen Container erstellen und zurückgeben
    const cont = document.createElement(tagName);
    cont.id = "beleg-bewertung";
    for (let i = 0; i < 5; i++) {
      const a = document.createElement("a");
      cont.appendChild(a);
      a.classList.add("icon-link", "icon-stern", "navi-link");
      a.href = "#";
      a.setAttribute("tabindex", "0");
      a.textContent = "\u00A0";
      beleg.bewertungEvents(a);
    }
    return cont;
  },

  // Tags: neues Format (Icon + Text, selbstdefinierte Tags möglich)
  //   tag = String
  //   deletable = Boolean
  tagNeu (tag, deletable) {
    // Tag
    const span = document.createElement("span");
    span.classList.add("tag");
    const img = document.createElement("img");
    span.appendChild(img);
    img.src = "img/" + (beleg.tags[tag] || "etikett.svg");
    img.width = "24";
    img.height = "24";
    span.appendChild(document.createTextNode(tag));

    // ggf. Events anhängen
    if (deletable) {
      span.addEventListener("mouseover", function () {
        this.firstChild.src = "img/x-dick-rot.svg";
      });
      span.addEventListener("mouseout", function () {
        const tag = this.textContent;
        this.firstChild.src = "img/" + (beleg.tags[tag] || "etikett.svg");
      });
      span.addEventListener("click", function () {
        const tag = this.textContent;
        const idx = beleg.data.tg.indexOf(tag);
        beleg.data.tg.splice(idx, 1);
        this.parentNode.removeChild(this);
        document.getElementById("beleg-tags-neu").dispatchEvent(new Event("focus"));
        beleg.belegGeaendert(true);
      });
    }

    // Element zurückgeben
    return span;
  },

  // Tags: altes Format (Checkbox + Text, keine selbstdefinierten Tags)
  //   tag = String
  tagAlt (tag) {
    // Tag
    const span = document.createElement("span");
    const input = document.createElement("input");
    span.appendChild(input);
    input.checked = false;
    input.type = "checkbox";
    input.value = tag;
    input.id = `tag-${tag}`;
    const label = document.createElement("label");
    span.appendChild(label);
    label.setAttribute("for", `tag-${tag}`);
    label.textContent = tag;

    // Event
    input.addEventListener("change", function () {
      const tag = this.value;
      if (this.checked) {
        beleg.data.tg.push(tag);
        beleg.data.tg.sort(beleg.tagsSort);
      } else {
        const idx = beleg.data.tg.indexOf(tag);
        beleg.data.tg.splice(idx, 1);
      }
      beleg.belegGeaendert(true);
    });

    // Container zurückgeben
    return span;
  },

  // Tags: Liste mit vorhanden Tags füllen
  tagsList () {
    // alle Tags ermitteln
    const alleTags = beleg.tagsAlle();

    // Tagliste bereinigen
    const tags = [ ...alleTags ].sort(beleg.tagsSort);
    for (const tag of beleg.data.tg) {
      const idx = tags.indexOf(tag);
      if (idx === -1) {
        continue;
      }
      tags.splice(idx, 1);
    }

    // Fragment erstellen und zurückgeben
    const frag = document.createDocumentFragment();
    for (const tag of tags) {
      const a = document.createElement("a");
      frag.appendChild(a);
      const img = document.createElement("img");
      a.appendChild(img);
      img.src = "img/" + (beleg.tags[tag] || "etikett.svg");
      img.width = "24";
      img.height = "24";
      a.dataset.suchtext = tag;
      a.href = "#";
      a.appendChild(document.createTextNode(tag));
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const tag = this.textContent;
        beleg.data.tg.push(tag);
        beleg.data.tg.sort(beleg.tagsSort);
        beleg.tagsFill();
        this.parentNode.removeChild(this);
        beleg.belegGeaendert(true);
      });
    }
    return frag;
  },

  // Tags: selbstdefinierten Tag hinzufügen
  //   tag = String
  tagsAdd (tag) {
    // Tag schon angehängt?
    if (beleg.data.tg.includes(tag)) {
      dialog.oeffnen({
        typ: "alert",
        text: `Der Tag <i>${tag}</i> hängt schon an der Karteikarte.`,
        callback: () => document.getElementById("beleg-tags-neu").select(),
      });
      return false;
    }

    // Tag hinzufügen
    beleg.data.tg.push(tag);
    beleg.data.tg.sort(beleg.tagsSort);
    beleg.tagsFill();
    beleg.belegGeaendert(true);
    return true;
  },

  // Tags: Set mit allen Tags zurückgeben, die zur Verfügung stehen
  tagsAlle () {
    const alleTags = new Set();
    Object.keys(beleg.tags).forEach(i => alleTags.add(i));
    for (const karte of Object.values(data.ka)) {
      for (const tag of karte.tg) {
        alleTags.add(tag);
      }
    }
    return alleTags;
  },

  // Tags: Sortierung nach dem Hinzufügen
  tagsSort (a, b) {
    const arr = Object.keys(beleg.tags);
    const x = arr.indexOf(a);
    const y = arr.indexOf(b);
    if (x === -1 && y === -1) {
      const arr = [ a, b ];
      arr.sort(helfer.sortAlpha);
      if (arr[0] === a) {
        return -1;
      }
      return 1;
    } else if (x === -1 && y !== -1) {
      return 1;
    } else if (x !== -1 && y === -1) {
      return -1;
    }
    return x - y;
  },

  // Aktionen beim Klick auf einen Formular-Button
  //   button = Element
  //     (der Button, auf den geklickt wurde)
  aktionButton (button) {
    button.addEventListener("click", function () {
      const aktion = this.id.replace(/^beleg-/, "");
      if (aktion === "speichern") {
        beleg.aktionSpeichern();
      } else if (aktion === "abbrechen") {
        beleg.aktionAbbrechen();
      } else if (aktion === "loeschen") {
        beleg.aktionLoeschen();
      } else if (aktion === "import-start") {
        importShared.startImport();
      } else if (aktion === "import-datei") {
        importShared.fileSelect();
      }
    });
  },

  // Vormerken, dass die Liste neu aufgebaut werden muss
  listeGeaendert: false,

  // Beleg speichern
  //   nieSchliessen = true | undefined
  //     (die Karteikarte sollte nach dem Speichern auf keinen Fall geschlossen werden)
  aktionSpeichern (nieSchliessen = false) {
    // Check: Datum angegeben?
    const da = document.getElementById("beleg-da");
    const dav = helfer.textTrim(da.value, true);
    if (!dav) {
      if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie müssen ein Datum angeben.",
          callback: () => beleg.selectFormEle(da),
        });
      } else {
        beleg.selectFormEle(da);
        beleg.fehlerFormEle(da);
      }
      return false;
    }
    // Check: Datum mit vierstelliger Jahreszahl oder Jahrhundertangabe?
    if (!/[0-9]{4}|[0-9]{2}\.\sJh\./.test(dav)) {
      if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Das Datum muss eine vierstellige Jahreszahl (z.\u00A0B. „1813“) oder eine Jahrhundertangabe (z.\u00A0B. „17.\u00A0Jh.“) enthalten.\nZusätzlich können auch andere Angaben gemacht werden (z.\u00A0B. „ca. 1815“, „1610, vielleicht 1611“).",
          callback: () => beleg.selectFormEle(da),
        });
      } else {
        beleg.selectFormEle(da);
        beleg.fehlerFormEle(da);
      }
      return false;
    }
    // Check: Beleg angegeben?
    const bs = document.getElementById("beleg-bs");
    if (!helfer.textTrim(bs.value, true)) {
      if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie müssen einen Beleg eingeben.",
          callback: () => beleg.selectFormEle(bs),
        });
      } else {
        beleg.selectFormEle(bs);
        beleg.fehlerFormEle(bs);
      }
      return false;
    }
    // Check: Quelle angegeben?
    const qu = document.getElementById("beleg-qu");
    const quVal = helfer.textTrim(qu.value, true);
    if (!quVal) {
      if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie müssen eine Quelle angeben.",
          callback: () => beleg.selectFormEle(qu),
        });
      } else {
        beleg.selectFormEle(qu);
        beleg.fehlerFormEle(qu);
      }
      return false;
    }
    // Check: verbotene Formate im Quelle-Feld?
    if (optionen.data.einstellungen["karteikarte-quelle-strikt"]) {
      const fehler = [];
      if (/https?:\/\/[^\s]+\.[a-z]+/.test(quVal)) {
        fehler.push("• URLs sind verboten");
      }
      if (/\n/.test(quVal)) {
        fehler.push("• Zeilenumbrüche sind verboten");
      }
      if (fehler.length) {
        dialog.oeffnen({
          typ: "alert",
          text: `Das Quelle-Feld ist formal fehlerhaft:\n${fehler.join("<br>")}`,
          callback: () => beleg.selectFormEle(qu),
        });
        return false;
      }
    }
    // Check: Aufrufdatum valide?
    const ud = document.getElementById("beleg-ud");
    if (document.querySelector("#beleg-ud:invalid")) {
      beleg.data.ud = "";
      ud.value = "";
    }
    // Korrektur: URL gefüllt, aber kein Aufrufdatum
    if (beleg.data.ul && !beleg.data.ud) {
      const heute = new Date().toISOString().split("T")[0];
      beleg.data.ud = heute;
      ud.value = heute;
    }
    // Check: URL mit Protokoll?
    const ul = document.getElementById("beleg-ul");
    if (beleg.data.ul && !/^https?:\/\//.test(beleg.data.ul)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die URL beginnt ohne Protokoll.\nFügen Sie am Anfang http:// oder https:// ein.",
        callback: () => beleg.selectFormEle(ul),
      });
      return false;
    }
    // Korrektur: Leerzeichen in der URL maskieren
    beleg.data.ul = beleg.data.ul.replace(/ /g, "%20");
    ul.value = beleg.data.ul;
    // Beleg wurde nicht geändert
    if (!beleg.geaendert) {
      direktSchliessen();
      return false;
    }
    // ggf. Format von Wortbildung, Synonym und Textsorte anpassen
    const ds = [ "bl", "sy", "ts" ];
    for (let i = 0, len = ds.length; i < len; i++) {
      const ds_akt = ds[i];
      beleg.data[ds_akt] = beleg.data[ds_akt].replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
    }
    // ggf. Objekt anlegen
    if (!data.ka[beleg.id_karte]) {
      data.ka[beleg.id_karte] = {};
      liste.statusNeu = beleg.id_karte.toString();
    }
    // zwischenspeichern, dass dieser Beleg geändert wurde
    // (für die Hervorhebung in der Liste)
    liste.statusGeaendert = beleg.id_karte.toString();
    // Objekt mit neuen Werten füllen
    data.ka[beleg.id_karte] = structuredClone(beleg.data);
    // Änderungsdatum speichern
    const dm = new Date().toISOString();
    beleg.data.dm = dm;
    data.ka[beleg.id_karte].dm = dm;
    // Metadatenfelder füllen
    beleg.metadaten();
    // Änderungsmarkierungen auffrischen
    beleg.belegGeaendert(false);
    beleg.listeGeaendert = true;
    kartei.karteiGeaendert(true);
    // Schließen?
    direktSchliessen();
    // Speichern war erfolgreich
    return true;
    // Karteikarte ggf. schließen
    function direktSchliessen () {
      if (!nieSchliessen && optionen.data.einstellungen["karteikarte-schliessen"]) {
        beleg.aktionAbbrechen();
      }
    }
  },

  // ein Element soll selektiert werden;
  // ist es nicht im Blick => in den Blick scrollen
  //   ele = Element
  //     (das Element, das selektiert werden soll)
  //   select = true | undefined
  //     (wird auch genutzt, um zum Element zu scrollen, ohne es zu selektieren)
  selectFormEle (ele, select = true) {
    const hBody = document.querySelector("body > header").offsetHeight;
    const hKarte = document.querySelector("#beleg > header").offsetHeight;
    const hTitle = document.querySelector("#beleg-titel").offsetHeight;
    const quick = document.getElementById("quick");
    const hQuick = quick.offsetHeight;
    let h = hBody + hKarte + hTitle;
    const rect = ele.getBoundingClientRect();
    if (quick.classList.contains("an")) {
      h += hQuick;
    }
    if (rect.top - 24 < h || rect.top + 24 > window.innerHeight) {
      scrollTo({
        left: 0,
        top: rect.top + window.scrollY - h - 24,
        behavior: "smooth",
      });
    }
    if (select) {
      ele.select();
    }
  },

  // visualisiert, dass in einem Elementfeld ein Fehler aufgetreten ist
  // (wird nur aufgerufen, wenn Fehlermeldungen abgestellt wurden)
  //   ele = Element
  //     (das Element, das selektiert wird)
  fehlerFormEle (ele) {
    ele.classList.add("fehler");
    ele.addEventListener("input", fehlerEntfernen);
    ele.addEventListener("blur", fehlerEntfernen);
    function fehlerEntfernen () {
      ele.classList.remove("fehler");
      ele.removeEventListener("input", fehlerEntfernen);
      ele.removeEventListener("blur", fehlerEntfernen);
    }
  },

  // Bearbeiten des Belegs beenden, Beleg also schließen
  // (Der Button hieß früher "Abbrechen", darum heißt die Funktion noch so)
  aktionAbbrechen () {
    speichern.checkInit(async () => {
      await liste.wechseln(); // erst zur Liste wechseln, sonst wird die Meldung, dass der neue Beleg gerade nicht sichtbar ist, sofort wieder ausgeblendet
      if (beleg.listeGeaendert) {
        liste.status(true);
      }
      beleg.listeGeaendert = false;
    });
  },

  // Beleg löschen
  aktionLoeschen () {
    // Beleg wurde noch gar nicht angelegt
    if (!data.ka[beleg.id_karte]) {
      beleg.belegGeaendert(false);
      beleg.aktionAbbrechen();
      return;
    }
    // Beleg wirklich löschen?
    beleg.aktionLoeschenFrage(beleg.id_karte);
  },

  // Fragen, ob der Beleg wirklich gelöscht werden soll
  // (wird auch in anderen Kontexten gebraucht, darum auslagern)
  //   id = Number
  //     (ID des Belegs)
  aktionLoeschenFrage (id) {
    dialog.oeffnen({
      typ: "confirm",
      text: `Soll <i>${liste.detailAnzeigenH3(id.toString())}</i> wirklich gelöscht werden?`,
      callback: async () => {
        if (!dialog.antwort) {
          return;
        }
        delete data.ka[id];
        beleg.belegGeaendert(false);
        kartei.karteiGeaendert(true);
        liste.statusNeu = "";
        liste.statusGeaendert = "";
        liste.status(true);
        await liste.wechseln();
        beleg.listeGeaendert = false;
        bedeutungenWin.daten();
        if (kopieren.an && kopieren.belege.includes(id.toString())) {
          kopieren.belege.splice(kopieren.belege.indexOf(id.toString()), 1);
          kopieren.uiText();
        }
      },
    });
  },

  // Beleg wurde geändert und noch nicht gespeichert
  geaendert: false,

  // Anzeigen, dass der Beleg geändert wurde
  //   geaendert = Boolean
  belegGeaendert (geaendert) {
    beleg.geaendert = geaendert;
    helfer.geaendert();
    const asterisk = document.getElementById("beleg-geaendert");
    if (geaendert) {
      asterisk.classList.remove("aus");
    } else {
      asterisk.classList.add("aus");
    }
    if (beleg.id_karte > -1) {
      // Diese Funktion wird beim Schließen der Kartei aufgerufen. Wenn zuvor keine
      // Karteikarte offen war, führt der Aufruf von belegReferenz() zu einem Fehler,
      // der das Schließen unmöglich macht.
      beleg.belegReferenz();
    }
  },

  // frischt die Beleg-Referenz in der Belegüberschrift auf;
  // Format: Name-Jahr-Belegnummer
  belegReferenz () {
    let ref = xml.belegId({ data: beleg.data, id: beleg.id_karte });
    if (/--[0-9]+$/.test(ref)) {
      // die Jahresangabe fehlt => keine Referenz drucken
      ref = "";
    }
    const cont = document.querySelector("#beleg-referenz");
    cont.textContent = ref;
  },

  // blockiert die Verarbeitung von beleg.pasteBs() kurzzeitig
  pasteBsBlock: false,

  // fängt das Pasten im Belegfeld ab
  // (wird auch von notizen.paste() benutz)
  //   evt = Object
  //     (das Event-Objekt des Paste-Events)
  //   pasten = false | undefined
  //     (der bereinigte Text soll gepastet werden)
  pasteBs (evt, pasten = true) {
    if (beleg.pasteBsBlock) {
      return;
    }

    // Welche Daten gibt es in der Zwischenablage?
    const clipHtml = evt.clipboardData.getData("text/html");
    const clipText = evt.clipboardData.getData("text/plain");
    if (!clipHtml && !clipText) {
      return;
    }
    // Text bereinigen und pasten
    evt.preventDefault();
    let text;
    if (clipHtml) {
      text = clipHtml;
      text = beleg.toolsEinfuegenHtml(text);
    } else {
      text = clipText;
      // Text bereinigen
      text = text.replace(/\n{3,}/g, "\n\n");
      text = helfer.textTrim(text, true);
    }
    if (pasten) {
      modules.clipboard.writeText(text);
      setTimeout(() => {
        // Der Timeout ist nötig, weil es ein wenig dauert,
        // bis der Text wirklich ins Clipboard geschrieben wurde.
        beleg.pasteBsBlock = true;
        document.execCommand("paste");
        beleg.pasteBsBlock = false;
      }, 10);
    } else {
      return text;
    }
  },

  // Verteilerfunktion für Klick-Events der Tools
  //   a = Element
  //     (Link, auf den geklickt wurde)
  toolsKlick (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (this.id === "beleg-meta-toggle") {
        beleg.metadatenToggle(true);
      } else if (/beleg-meta-copy/.test(this.id)) {
        beleg.metadatenCopy(this.id);
      } else if (this.id === "beleg-meta-load-ui") {
        beleg.toolsQuelleURL("ui");
      } else if (this.id === "beleg-meta-header") {
        beleg.metadatenHeaderToggle(true);
      } else if (this.id === "beleg-meta-reimport") {
        beleg.metadatenReimport();
      } else if (this.classList.contains("icon-tools-kopieren")) {
        beleg.toolsKopieren(this);
      } else if (this.classList.contains("icon-tools-einfuegen")) {
        beleg.toolsEinfuegen(this);
      } else if (this.classList.contains("icon-uhr")) {
        beleg.toolsAufrufdatum();
      } else if (this.parentNode.classList.contains("text-tools-beleg") ||
          this.parentNode.classList.contains("text-tools-bedeutung")) {
        beleg.toolsText(this);
      } else if (this.parentNode.classList.contains("text-tools-quelle")) {
        beleg.toolsQuelle(this);
      }
    });
  },

  // Tool Kopieren: Text aus dem zugehörigen Textfeld komplett kopieren
  //   link = Element
  //     (Link, auf den geklickt wurde)
  toolsKopieren (link) {
    // Datensatz ermitteln. Ist der Wert gefüllt?
    const ds = link.parentNode.parentNode.firstChild.getAttribute("for").replace(/^beleg-/, "");
    const text = beleg.data[ds];
    if (!text) {
      return;
    }
    beleg.toolsKopierenExec({
      ds,
      obj: beleg.data,
      text,
      ele: document.querySelector(`#beleg-lese-${ds} p`),
    });
  },

  // führt die Kopieroperation aus (eigene Funktion,
  // weil sie auch für die Kopierfunktion in der Belegliste benutzt wird)
  //   ds = String
  //     (Bezeichner des Datensatzes)
  //   obj = Object
  //     (verweist auf das Datenobjekt, in dem der zu kopierende Text steht;
  //     wichtig, um die Literaturangabe beim Kopieren von Belegtext zu finden)
  //   text = String
  //     (der komplette Feldtext, wie er in der DB steht)
  //   ele = Element | null
  //     (ein Element auf der 1. Ebene im Kopierbereich; "ele" kann "null" sein,
  //     wenn die Leseansicht noch nie aufgebaut wurde)
  //   cb = false | undefined
  //     (Text nicht Zwischenablage kopieren;
  //     nur wenn alle Belegtexte kopiert werden auf false)
  toolsKopierenExec ({ ds, obj, text, ele, cb = true }) {
    // Ist Text ausgewählt und ist er im Bereich des Kopier-Icons?
    if (cb && window.getSelection().toString() &&
        popup.getTargetSelection([ ele ])) {
      modules.clipboard.write({
        text: popup.textauswahl.text,
        html: popup.textauswahl.html,
      });
      return;
    }
    // Kein Text ausgewählt => das gesamte Feld wird kopiert
    if (ds === "bs") { // Beleg
      const p = text.replace(/\n\s*\n/g, "\n").split("\n");
      let html = "";
      p.forEach(text => {
        text = beleg.toolsKopierenKlammern({ text, html: true });
        if (optionen.data.einstellungen["textkopie-wort"]) {
          text = liste.belegWortHervorheben(text, true);
        }
        html += `<p>${text}</p>`;
      });
      // Referenz vorbereiten
      popup.referenz.data = obj;
      if (cb) {
        let eleListe;
        let eleKarte;
        if (!ele) {
          // wenn die Leseansicht noch nie aufgebaut wurde,
          // kann ele === null sein; dann erfolgt das Kopieren immer
          // aus dem Karteikartenformular heraus
          eleKarte = true;
        } else if (ele) {
          eleListe = ele.closest(".liste-details");
          eleKarte = ele.closest("tr");
        }
        if (eleListe) {
          popup.referenz.id = eleListe.previousSibling.dataset.id;
        } else if (eleKarte) {
          popup.referenz.id = "" + beleg.id_karte;
        }
      }
      // Texte aufbereiten
      html = helfer.clipboardHtml(html);
      html = helfer.typographie(html);
      html = beleg.toolsKopierenAddQuelle(html, true, obj);
      html = beleg.toolsKopierenAddJahr(html, true);
      text = text.replace(/<br>/g, "\n");
      text = text.replace(/<.+?>/g, "");
      text = beleg.toolsKopierenKlammern({ text });
      text = helfer.typographie(text);
      text = beleg.toolsKopierenAddQuelle(text, false, obj);
      text = beleg.toolsKopierenAddJahr(text, false);
      if (optionen.data.einstellungen["textkopie-notizen"]) {
        html = beleg.toolsKopierenAddNotizen(html, true, obj);
        text = beleg.toolsKopierenAddNotizen(text, false, obj);
      }
      // Text in Zwischenablage oder Text zurückgeben
      if (cb) {
        modules.clipboard.write({
          text,
          html,
        });
      } else {
        return {
          html,
          text,
        };
      }
    } else if (ds === "bd") { // Bedeutung
      const bd = [];
      for (const i of beleg.data.bd) {
        if (i.gr !== data.bd.gn) {
          // Bedeutungen aus anderen als dem aktuellen Gerüst ignorieren
          continue;
        }
        let bedeutung = bedeutungen.bedeutungenTief({
          gr: data.bd.gn,
          id: i.id,
          leer: true,
        });
        bedeutung = bedeutung.replace(/<mark class="paraphrase">(.+?)<\/mark>/g, (...args) => `‚${args[1]}‘`);
        bd.push(bedeutung);
      }
      let html = "";
      for (const i of bd) {
        html += `<p>${i}</p>`;
      }
      const text = bd.join("\n").replace(/<.+?>/g, "");
      modules.clipboard.write({
        text,
        html,
      });
    } else { // alle anderen Felder
      modules.clipboard.writeText(text);
    }
    // Animation, die anzeigt, dass die Zwischenablage gefüllt wurde
    if (cb) {
      helfer.animation("zwischenablage");
    }
  },

  // Klammern im Belegtext aufbereiten
  //   text = String
  //     (Belegtext, in dem die Klammern aufbereitet werden sollen)
  //   html = true | undefined
  //     (Text wird in HTML formatiert)
  toolsKopierenKlammern ({ text, html = false }) {
    // Bindestriche einfügen
    text = text.replace(/\[¬\]([A-ZÄÖÜ])/g, (m, p1) => `-${p1}`);

    // technische Klammern entfernen
    text = text.replace(/\[¬\]|\[:.+?:\]/g, "");

    // Autorenzusatz, Löschung, Streichung
    const farben = {
      autorenzusatz: "#0a0",
      loeschung: "#f00",
      streichung: "#00f",
    };
    const selektoren = [
      ".klammer-autorenzusatz",
      ".klammer-loeschung",
      ".klammer-streichung",
    ];

    const cont = document.createElement("div");
    cont.innerHTML = text;
    let s = 0;
    while (cont.querySelector(selektoren.join(", "))) {
      if (s > 10) {
        // zur Sicherheit, für den Fall, dass ich irgendetwas nicht bedacht habe
        break;
      }
      s++;
      cont.querySelectorAll(selektoren.join(", ")).forEach(i => {
        const typ = typErmitteln(i);
        let r = `[${i.innerHTML}]`;
        if (typ === "loeschung" && !optionen.data.einstellungen["textkopie-klammern-loeschung"] ||
            typ === "streichung" && !optionen.data.einstellungen["textkopie-klammern-streichung"]) {
          r = "[…]";
        }
        if (html && optionen.data.einstellungen["textkopie-klammern-farbe"]) {
          r = `<span style="color: ${farben[typ]}">${r}</span>`;
        }
        const template = document.createElement("template");
        template.innerHTML = r;
        i.parentNode.replaceChild(template.content, i);
      });
    }

    text = cont.innerHTML;

    function typErmitteln (n) {
      if (n.classList.contains("klammer-autorenzusatz")) {
        return "autorenzusatz";
      } else if (n.classList.contains("klammer-loeschung")) {
        return "loeschung";
      } else if (n.classList.contains("klammer-streichung")) {
        return "streichung";
      }
      return "";
    }

    // Ergebnis zurückgeben
    return helfer.textTrim(text, true);
  },

  // Jahreszahl und/oder ID des Belegs als eine Art Überschrift hinzufügen
  //   text = String
  //     (Text, der ergänzt werden soll)
  //   html = Boolean
  //     (Text soll um eine in html-formatierte Angabe ergänzt werden)
  toolsKopierenAddJahr (text, html) {
    // ID und Jahr ermitteln
    const id = xml.belegId({});
    const jahr = helferXml.datum(popup.referenz.data.da, false, true); // könnte auch Jh. sein
    // Elemente für Überschrift ermitteln
    const h = [];
    if (optionen.data.einstellungen["textkopie-h-jahr"]) {
      h.push(jahr);
    }
    if (optionen.data.einstellungen["textkopie-h-id"]) {
      h.push(id);
    }
    // keine Überschrift
    if (!h.length) {
      return text;
    }
    // Überschrift vorbereiten
    let hText;
    if (h.length > 1) {
      hText = `${h[0]} (${h[1]})`;
    } else {
      hText = h[0];
    }
    // Rückgabe mit Überschrift
    if (html) {
      return `<p><b>${hText}</b></p>${text}`;
    }
    return `${hText}\n\n${text}`;
  },

  // Quellenangabe zum Belegtext hinzufügen
  //   text = String
  //     (Text, der um die Quelle ergänzt werden soll)
  //   html = Boolean
  //     (Text soll um eine html-formatierte Quellenangabe ergänzt werden)
  //   obj = Object
  //     (das Datenobjekt, in dem die Quelle steht)
  toolsKopierenAddQuelle (text, html, obj) {
    if (html) {
      text += "<hr>";
      const quelle = obj.qu.split("\n");
      quelle.forEach(i => {
        i = helfer.textTrim(i, true);
        if (!i) {
          return;
        }
        text += `<p><small>${helfer.escapeHtml(i)}</small></p>`;
      });
      if (obj.ul) {
        text += `<p><small>${obj.ul}<br>(Aufrufdatum: ${helfer.datumFormat(obj.ud, "einfach")})</small></p>`;
      }
    } else {
      text += "\n\n---\n\n";
      text += obj.qu;
      if (obj.ul) {
        text += `\n\n${obj.ul}\n(Aufrufdatum: ${helfer.datumFormat(obj.ud, "einfach")})`;
      }
    }
    return text;
  },

  // Notizen zum Belegtext hinzufügen
  //   text = String
  //     (Text, der um die Notizen ergänzt werden soll)
  //   html = Boolean
  //     (Text soll um eine html-formatierte Notizenangaben ergänzt werden)
  //   obj = Object
  //     (das Datenobjekt, in dem die Notizen steht)
  toolsKopierenAddNotizen (text, html, obj) {
    if (!obj.no) {
      return text;
    }
    if (html) {
      text += "<hr>";
      const notizen = obj.no.trim().split("\n");
      notizen.forEach(i => {
        i = helfer.textTrim(i, true);
        if (!i) {
          return;
        }
        text += `<p>${helfer.escapeHtml(i)}</p>`;
      });
    } else {
      text += "\n\n---\n\n";
      text += obj.no.trim();
    }
    return text;
  },

  // Tool Einfügen: Text möglichst unter Beibehaltung der Formatierung einfügen
  //   link = Element
  //     (Link, auf den geklickt wurde)
  toolsEinfuegen (link) {
    // Element ermitteln
    // Text einlesen
    const id = link.closest("th").querySelector("label").getAttribute("for");
    const ds = id.replace(/^beleg-/, "");
    const feld = document.getElementById(id);
    // Text auslesen
    let text = "";
    if (id === "beleg-bs") {
      if (modules.clipboard.availableFormats().includes("text/html")) {
        text = modules.clipboard.readHTML();
      } else {
        text = modules.clipboard.readText(); // aus Sicherheitsgründen auch Plain-Text bereinigen
      }
      text = beleg.toolsEinfuegenHtml(text);
    } else {
      text = modules.clipboard.readText();
    }
    // Felder ist leer => Text direkt eintragen
    if (!feld.value) {
      eintragen(false);
      return;
    }
    // Feld ist gefüllt + Option immer ergänzen => Text direkt ergänzen
    if (optionen.data.einstellungen["immer-ergaenzen"]) {
      eintragen(true);
      return;
    }
    // Feld ist gefüllt => ergänzen (true), überschreiben (false) oder abbrechen (null)?
    dialog.oeffnen({
      typ: "confirm",
      text: "Im Textfeld steht schon etwas. Soll es ergänzt werden?\n(Bei „Nein“ wird das Textfeld überschrieben.)",
      callback: () => {
        if (dialog.antwort === true ||
            dialog.antwort === false) {
          eintragen(dialog.antwort);
        }
      },
    });
    document.getElementById("dialog-text").appendChild(optionen.shortcut("Textfeld künftig ohne Nachfrage ergänzen", "immer-ergaenzen"));
    // Einfüge-Funktion
    function eintragen (ergaenzen) {
      if (ergaenzen) {
        if (feld.type === "text") { // <input>
          feld.value += ` ${text}`;
        } else if (/^beleg-(bs|no|qu)$/.test(feld.id)) { // <textarea> (Beleg, Quelle, Notizen)
          feld.value += `\n\n${text}`;
        } else { // <textarea> (alle anderen)
          feld.value += `\n${text}`;
        }
      } else {
        feld.value = text;
      }
      beleg.data[ds] = feld.value;
      helfer.textareaGrow(feld);
      beleg.belegGeaendert(true);
    }
  },

  // Tags, die beim Einfügen von HTML-Text erhalten bleiben sollen
  toolsEinfuegenHtmlTags: {
    inline_keep: [
      "B",
      "BR",
      "CITE",
      "DEL",
      "DFN",
      "EM",
      "I",
      "MARK",
      "S",
      "SMALL",
      "STRONG",
      "SUB",
      "SUP",
      "U",
      "VAR",
    ],
    speziell: {
      BIG: { // obsolete!
        ele: "span",
        class: "tei-groesser",
      },
      H1: {
        ele: "span",
        class: "tei-groesser",
      },
      H2: {
        ele: "span",
        class: "tei-groesser",
      },
      H3: {
        ele: "span",
        class: "tei-groesser",
      },
      H4: {
        ele: "span",
        class: "tei-groesser",
      },
      H5: {
        ele: "span",
        class: "tei-groesser",
      },
      H6: {
        ele: "span",
        class: "tei-groesser",
      },
    },
  },

  // Bereitet HTML-Text zum Einfügen in das Beleg-Formular auf
  //   html = String
  //     (Text mit HTML-Tags, der aufbereitet und dann eingefügt werden soll)
  //   minimum = true | undefined
  //     (nur ein absolutes Minimum an Tags bleibt erhalten)
  toolsEinfuegenHtml (html, minimum = false) {
    // wenn <body> => splitten
    const body = html.split(/<body.*?>/);
    if (body.length > 1) {
      html = body[1];
    }

    // Style-Block(s) und Kommentare entfernen
    html = html.replace(/<style.*?>(.|\n)+?<\/style>/g, "");
    html = html.replace(/<!--.+?-->/gs, "");

    // Inline-Styles löschen (widerspricht sonst der Content-Security-Policy)
    html = html.replace(/<\??([a-zA-Z0-9_-]+) [^>]+>/g, (...args) => `<${args[1]}>`);

    // HTML in temporären Container schieben
    const container = document.createElement("div");
    container.innerHTML = html;

    // Inline-Tags, die erhalten bleiben bzw. ersetzt werden sollen
    let inline_keep = [ ...beleg.toolsEinfuegenHtmlTags.inline_keep ];
    let speziell = structuredClone(beleg.toolsEinfuegenHtmlTags.speziell);

    // ggf. Anzahl der Tags reduzieren, die erhalten bleiben sollen
    if (minimum) {
      inline_keep = [
        "B",
        "I",
        "U",
      ];
      speziell = {};
    }

    // Text extrahieren
    let text = "";
    container.childNodes.forEach(i => ana(i, false));

    // erhaltene Inline-Auszeichnungen korrigieren
    Object.keys(speziell).forEach(tag => {
      const reg = new RegExp(`\\[#(${tag})\\](.+?)\\[\\/${tag}\\]`, "g");
      text = text.replace(reg, function (m, p1, p2) {
        let start = `<${speziell[p1].ele}`;
        if (speziell[p1].class) {
          start += ` class="${speziell[p1].class}"`;
        }
        return `${start}>${p2}</${speziell[p1].ele}>`;
      });
    });
    for (let i = 0, len = inline_keep.length; i < len; i++) {
      const tag = inline_keep[i];
      const reg = new RegExp(`\\[#${tag}\\](.*?)\\[\\/${tag}\\]`, "g");
      text = text.replace(reg, function (m, p1) {
        return `<${tag.toLowerCase()}>${p1}</${tag.toLowerCase()}>`;
      });
    }
    text = text.replace(/<br><\/br>/g, "<br>");
    text = text.replace(/\n\r?<br>/g, "<br>");
    text = text.replace(/<br>(?!\n)/g, "<br>\n");

    // viele Absätze am Stück bereinigen
    text = text.replace(/\n{3,}/g, "\n\n");

    // gereinigtes HTML zurückgeben
    return helfer.textTrim(text, true);

    // rekursive Analyse der Tags
    //   ele = Element
    //     (Knoten im XML-Baum)
    function ana (ele, preformatted) {
      if (ele.nodeType === 3) { // Text
        if (preformatted) {
          text += ele.nodeValue;
        } else {
          text += ele.nodeValue.replace(/\n/g, " ");
        }
      } else if (ele.nodeType === 1) { // Element
        // Inline-Elemente ggf. gesondert behandeln
        if (inline_keep.includes(ele.nodeName) || speziell[ele.nodeName]) {
          ele.insertBefore(document.createTextNode(`[#${ele.nodeName}]`), ele.firstChild);
          ele.appendChild(document.createTextNode(`[/${ele.nodeName}]`));
        } else if (!minimum && ele.nodeName === "Q") {
          ele.insertBefore(document.createTextNode('"'), ele.firstChild);
          ele.appendChild(document.createTextNode('"'));
        } else if (!minimum && ele.nodeName === "LI") {
          ele.insertBefore(document.createTextNode("– "), ele.firstChild);
        }
        // Block-Level-Elemente (und andere), die eine Sonderbehandlung benötigen
        let preformatted = false;
        if (/^(DT|FIGCAPTION|HR|LI|TR)$/.test(ele.nodeName)) { // Zeilenumbruch
          text += "\n";
        } else if (/^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DETAILS|DIALOG|DIV|DL|FIELDSET|FIGURE|FOOTER|FORM|H([1-6]{1})|HEADER|MAIN|NAV|OL|P|PRE|SECTION|TABLE|UL)$/.test(ele.nodeName)) { // Absätze
          text = helfer.textTrim(text, false);
          text += "\n\n";
          if (/^PRE$/.test(ele.nodeName)) {
            preformatted = true;
          }
        }
        ele.childNodes.forEach(i => ana(i, preformatted));
      }
    }
  },

  // Texttools Beleg
  //   link = Element
  //     (Link, auf den geklickt wurde)
  toolsText (link) {
    // Sonderzeichen eingeben
    const aktion = link.getAttribute("class").replace(/.+-/, "");
    if (aktion === "kuerzen") {
      beleg.toolsKuerzen();
      return;
    } else if (aktion === "sonderzeichen") {
      const feld = link.parentNode.previousSibling.getAttribute("for");
      sonderzeichen.oeffnen(feld);
      return;
    }
    // Fokus in <textarea>
    const ta = document.getElementById("beleg-bs");
    ta.focus();
    // Tags ermitteln
    const tags = {
      antiqua: {
        start: '<span class="tei-antiqua">',
        ende: "</span>",
      },
      autorenzusatz: {
        start: '<span class="klammer-autorenzusatz">',
        ende: "</span>",
      },
      belegschnitt: {
        start: '<span class="belegschnitt">',
        ende: "</span>",
      },
      bold: {
        start: "<b>",
        ende: "</b>",
      },
      br: {
        start: "<br>",
        ende: "",
      },
      caps: {
        start: '<span class="tei-kapitaelchen">',
        ende: "</span>",
      },
      italic: {
        start: "<i>",
        ende: "</i>",
      },
      loeschung: {
        start: '<span class="klammer-loeschung">',
        ende: "</span>",
      },
      mark: {
        start: '<mark class="user">',
        ende: "</mark>",
      },
      size: {
        start: '<span class="tei-groesser">',
        ende: "</span>",
      },
      spacing: {
        start: '<span class="tei-gesperrt">',
        ende: "</span>",
      },
      streichung: {
        start: '<span class="klammer-streichung">',
        ende: "</span>",
      },
      strike: {
        start: "<s>",
        ende: "</s>",
      },
      superscript: {
        start: "<sup>",
        ende: "</sup>",
      },
      subscript: {
        start: "<sub>",
        ende: "</sub>",
      },
      underline: {
        start: "<u>",
        ende: "</u>",
      },
    };
    // illegales Nesting über die Absatzgrenze hinaus?
    let str_sel = window.getSelection().toString();
    if (/\n/.test(str_sel)) {
      const umbruch = str_sel.match(/\n/).index;
      ta.setSelectionRange(ta.selectionStart, ta.selectionStart + umbruch, "forward");
      str_sel = window.getSelection().toString();
    }
    // Auswahl ermitteln
    let start = ta.selectionStart;
    let ende = ta.selectionEnd;
    let str_start = ta.value.substring(0, start);
    let str_ende = ta.value.substring(ende);
    // illegales Nesting von Inline-Tags?
    if (beleg.toolsTextNesting(str_sel)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Formatierung kann an dieser Position nicht vorgenommen werden.\n<h3>Fehlermeldung</h3>\nillegale Verschachtelung",
        callback: () => ta.focus(),
      });
      return;
    }
    // Aktion durchführen
    const reg_start = new RegExp(`${helfer.escapeRegExp(tags[aktion].start)}$`);
    const reg_ende = new RegExp(`^${helfer.escapeRegExp(tags[aktion].ende)}`);
    if (aktion !== "br" && reg_start.test(str_start) && reg_ende.test(str_ende)) { // Tag entfernen
      str_start = str_start.replace(reg_start, "");
      str_ende = str_ende.replace(reg_ende, "");
      start -= tags[aktion].start.length;
      ende -= tags[aktion].start.length;
    } else { // Tag hinzufügen
      str_sel = `${tags[aktion].start}${str_sel}${tags[aktion].ende}`;
      start += tags[aktion].start.length;
      ende += tags[aktion].start.length;
    }
    ta.value = `${str_start}${str_sel}${str_ende}`;
    // Auswahl wiederherstellen
    ta.setSelectionRange(start, ende, "forward");
    // neuen Text in data
    beleg.data.bs = ta.value;
    // Höhe des Textfelds anpassen
    helfer.textareaGrow(ta);
    // Änderungsmarkierung setzen
    beleg.belegGeaendert(true);
  },

  // illegales Nesting ermitteln
  //   str = String
  //     (String mit [oder ohne] HTML-Tags)
  toolsTextNesting (str) {
    // Sind überhaupt Tags im String?
    const treffer = {
      auf: str.match(/<[a-z1-6]+/g),
      zu: str.match(/<\/[a-z1-6]+>/g),
    };
    if (!treffer.auf && !treffer.zu) {
      return false;
    }
    // Analysieren, ob zuerst ein schließender Tag erscheint
    const first_start = str.match(/<[a-z1-6]+/);
    const first_end = str.match(/<\/[a-z1-6]+/);
    if (first_start && first_end && first_end.index < first_start.index) {
      return true; // offenbar illegales Nesting
    }
    // Anzahl der Treffer pro Tag ermitteln
    const tags = {
      auf: {},
      zu: {},
    };
    for (const [ i, val ] of Object.entries(treffer)) {
      if (!val) {
        continue;
      }
      for (let j = 0, len = val.length; j < len; j++) {
        const tag = val[j].replace(/<|>|\//g, "");
        if (!tags[i][tag]) {
          tags[i][tag] = 0;
        }
        tags[i][tag]++;
      }
    }
    // Analysieren, ob es Diskrepanzen zwischen den
    // öffnenden und schließenden Tags gibt
    const arr = [ "auf", "zu" ];
    for (let i = 0; i < 2; i++) {
      const a = arr[i];
      const b = arr[i === 1 ? 0 : 1];
      for (const [ tag, val ] of Object.entries(tags[a])) {
        if (!tags[b][tag] || val !== tags[b][tag]) {
          return true; // offenbar illegales Nesting
        }
      }
    }
    return false; // offenbar kein illegales Nesting
  },

  // Tools für Quelle-Feld
  //   link = Element
  //     (Link, auf den geklickt wurde)
  toolsQuelle (link) {
    if (link.classList.contains("icon-pfeil-kreis")) {
      beleg.toolsQuelleLaden();
    } else if (link.classList.contains("icon-link-link")) {
      beleg.toolsQuelleURL("ul");
    }
  },

  // Aufrufdatum in Quelle-Feld einfügen
  toolsAufrufdatum () {
    const ud = document.getElementById("beleg-ud");
    ud.value = new Date().toISOString().split("T")[0];
    ud.dispatchEvent(new Event("change"));
    ud.focus();
  },

  // Inhalt des Quelle-Felds neu laden
  //   shortcut = true | undefined
  async toolsQuelleLaden (shortcut = false) {
    // keine Quelle gefunden
    if (!beleg.data.bx || !beleg.data.bi) {
      let text = "Es wurde keine Quelle gefunden, aus der die Titeldaten automatisch neu geladen werden könnten.";
      if (beleg.data.qu) {
        const ori = beleg.data.qu;
        const neu = importShared.changeTitleStyle(ori);
        if (ori !== neu) {
          beleg.toolsQuelleLadenChanges({
            Quelle: {
              key: "qu",
              ori,
              neu,
            },
          }, shortcut);
          return;
        }
        text = "Die vorhandene Quellenangabe kann (oder muss) nicht automatisch angepasst werden.\n" + text;
      }
      dialog.oeffnen({
        typ: "alert",
        text,
        callback: () => document.getElementById("beleg-qu").focus(),
      });
      return;
    }

    // Variablen vorbereiten
    const aenderungen = {};
    let titel = "";
    let xmlDoc;
    if (/^(tei|xml)/.test(beleg.data.bi)) {
      xmlDoc = helferXml.parseXML(beleg.data.bx);
    }

    // Titelinfos abhängig vom Importtyp ermitteln
    if (beleg.data.bi === "bibtex") {
      // BIBTEX
      const bibtex = await importBibtex.startImport({
        content: beleg.data.bx,
        returnTitle: true,
      });
      if (bibtex.length) {
        titel = bibtex[0].ds.qu;
      }
    } else if (beleg.data.bi === "plain-dereko") {
      // PLAIN-DEREKO
      const reg = new RegExp(`^(${importDereko.idForm})(.+)`);
      titel = beleg.data.bx.match(reg)[2] + ".";
      titel = importShared.changeTitleStyle(titel);
    } else if (/^tei/.test(beleg.data.bi) && xmlDoc) {
      // TEI
      importTEI.data.cit = importTEI.citObject();
      importTEI.citFill(xmlDoc);
      importTEI.data.cit.seiten = beleg.data.qu.match(/, Sp?\.\s(.+)\.$/)?.[1] || "";
      importTEI.data.cit.spalte = /, Sp\.\s/.test(beleg.data.qu);
      titel = importTEI.makeQu();
    } else if (beleg.data.bi === "xml-dwds" && xmlDoc) {
      // XML-DWDS
      const dwds = await importDWDS.startImportXML({
        xmlDoc,
        xmlStr: "",
        returnResult: true,
      });
      if (dwds.qu) {
        if (beleg.data.au && !importDWDS.platzhalterName.test(beleg.data.au)) {
          // für den Fall, dass der Autor manuell nachgetragen wurde
          dwds.qu = dwds.qu.replace(/^N\.\sN\./, beleg.data.au);
          dwds.au = beleg.data.au;
        }
        aenderungen.Autor = {
          key: "au",
          ori: beleg.data.au,
          neu: dwds.au,
        };
        titel = dwds.qu;
      }
    } else if (beleg.data.bi === "xml-fundstelle" && xmlDoc) {
      // XML-FUNDSTELLE
      const daten = redLit.eingabeXMLFundstelle({
        xmlDoc,
        xmlStr: "",
      });
      titel = daten.ds.qu;
    } else if (beleg.data.bi === "xml-mods" && xmlDoc) {
      // XML-MODS
      const daten = redLit.eingabeXMLMODS({
        xmlDoc,
        xmlStr: "",
      });
      titel = daten.ds.qu;
    } else if (beleg.data.bi === "xml-wgd" && xmlDoc) {
      // XML-WGD
      titel = xmlDoc.querySelector("Fundstelle unstrukturiert")?.firstChild?.textContent || "";
      titel = importShared.changeTitleStyle(titel);
    }

    // keine Titeldaten gefunden
    if (!titel) {
      dialog.oeffnen({
        typ: "alert",
        text: "Beim Einlesen der Titeldaten ist etwas schiefgegangen.",
      });
      return;
    }

    // Titeldaten gefunden
    aenderungen.Quelle = {
      key: "qu",
      ori: beleg.data.qu,
      neu: titel,
    };
    beleg.toolsQuelleLadenChanges(aenderungen, shortcut);
  },

  // Inhalt des Quelle-Felds neu laden (Änderungen ausführen)
  //   aenderungen = object
  //   shortcut = boolean
  async toolsQuelleLadenChanges (aenderungen, shortcut) {
    // Änderungen ermitteln
    const txt = [];
    for (const [ k, v ] of Object.entries(aenderungen)) {
      const [ ori ] = v.ori.split("\n");
      const [ neu ] = v.neu.split("\n");
      if (ori === neu) {
        continue;
      }
      let val = `<strong>${k}</strong><br>`;
      val += `${v.ori ? v.ori : "<i>kein Autor</i>"}<br>${"\u00A0".repeat(5)}→<br>${v.neu}`;
      txt.push(val);
    }

    // abbrechen, weil keine Änderungen gefunden wurden
    const quelle = document.getElementById("beleg-qu");
    if (!txt.length) {
      if (!shortcut) {
        quelle.focus();
      } else {
        dialog.oeffnen({
          typ: "alert",
          text: "Keine Änderungen nötig.",
        });
      }
      return;
    }

    // nachfragen, ob Änderungen übernommen werden sollen
    let numerus = "Soll die folgende Änderung";
    if (txt.length > 1) {
      numerus = "Sollen die folgenden Änderungen";
    }
    const result = await new Promise(resolve => {
      dialog.oeffnen({
        typ: "confirm",
        text: `${numerus} vorgenommen werden?\n${txt.join("\n")}`,
        callback: () => {
          setTimeout(() => {
            document.querySelector("#dialog > div").classList.remove("breit");
          }, 200);
          resolve(dialog.antwort);
        },
      });
      document.querySelector("#dialog > div").classList.add("breit");
      document.querySelectorAll("#dialog-text p").forEach(p => p.classList.add("force-wrap"));
    });

    // Änderungen übernehmen oder einfach nur das Quelle-Feld fokussieren
    if (result) {
      for (const v of Object.values(aenderungen)) {
        beleg.data[v.key] = v.neu;
        document.getElementById(`beleg-${v.key}`).value = v.neu;
        if (v.key === "qu") {
          helfer.textareaGrow(quelle);
        }
      }
      beleg.belegGeaendert(true);
      beleg.aktionSpeichern();
    } else if (!shortcut) {
      quelle.focus();
    }
  },

  // Link aus dem URL-Feld in das Importformular laden
  //   feld = string
  toolsQuelleURL (feld) {
    // Reihenfolge festlegen, in der die URL-Felder auf Inhalt geprüft werden
    const felder = [ "ul", "ui" ];
    if (feld === "ui") {
      felder.splice(0, 1);
    }

    // URL vorhanden?
    let url;
    for (const i of felder) {
      if (beleg.data[i]) {
        url = beleg.data[i];
        break;
      }
    }
    if (!url) {
      dialog.oeffnen({
        typ: "alert",
        text: "Keine URL gefunden.",
      });
      return;
    }

    // URL bekannt?
    const validURL = importShared.isKnownURL(url);
    if (!validURL) {
      const text = validURL === null ? "Die URL ist nicht valide." : "Bei der URL handelt es sich nicht um eine bekannte Importquelle.";
      dialog.oeffnen({
        typ: "alert",
        text,
      });
      return;
    }

    // nach oben scrollen und Formular umstellen
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: "smooth",
    });

    // Formular füllen
    document.querySelector("#beleg-import-feld").value = url;
    beleg.formularImport({ src: "url", autoFill: false });
    if (beleg.data.bb && beleg.data.bv) {
      document.querySelector("#beleg-import-von").value = beleg.data.bv;
      const bis = document.querySelector("#beleg-import-bis");
      bis.value = beleg.data.bb;
      bis.select();
    }
  },

  // Belegtext um alle Absätze kürzen, die kein Stichwort enthalten
  toolsKuerzen () {
    // Absätze ermitteln, die das Wort enthalten
    const feldBs = document.querySelector("#beleg-bs");
    const textOri = feldBs.value;
    const text = textOri.split("\n\n");
    const wortVorhanden = [];
    const pb = [];
    const regPb = /\[:(.+?):\]/g;
    for (let i = 0, len = text.length; i < len; i++) {
      if (liste.wortVorhanden(text[i])) {
        wortVorhanden.push(i);
      }
      const pbAll = [];
      for (const m of text[i].matchAll(regPb)) {
        if (m[1] !== "?" &&
            !/^[a-z]+$/.test(m[1])) {
          // in Handschriften der WDB werden die Spalten mitunter durch a, b, c usw. bezeichnet => ausschließen
          pbAll.push(m[1]);
        }
      }
      if (i && (!pbAll.length || !new RegExp(`^\\[:${helfer.escapeRegExp(pbAll[0])}:\\]`).test(text[i]))) {
        pbAll.unshift(pb.at(-1).at(-1));
      }
      if (!pbAll.length) {
        pb.push([ "" ]);
      } else {
        pb.push([ ...pbAll ]);
      }
    }

    // gekürzten Text ermitteln
    const kontextErhalten = optionen.data.einstellungen["karteikarte-text-kuerzen-kontext"];
    const kurzText = [];
    const kurzErhalten = [];
    let kurzZuletzt = -1;
    for (let i = 0, len = text.length; i < len; i++) {
      if (wortVorhanden.includes(i) || // Stichwort vorhananden
          kontextErhalten && (wortVorhanden.includes(i - 1) || wortVorhanden.includes(i + 1))) { // Kontext erhalten
        // Text bleibt erhalten
        kurzText.push(text[i]);
        kurzErhalten.push(i);
        kurzZuletzt = i;
      } else if (i > 0 && i < len - 1 && kurzZuletzt === i - 1) {
        // Text löschen, aber Kürzungszeichen setzen
        kurzText.push('<span class="klammer-loeschung">…</span>');
        kurzErhalten.push(i);
      }
    }

    // überflüssige Kürzung am Ende entfernen
    if (kurzText.at(-1) === '<span class="klammer-loeschung">…</span>') {
      kurzText.pop();
      kurzErhalten.pop();
    }

    // gekürzten Text übernehmen
    const textKurz = kurzText.join("\n\n");
    if (textOri !== textKurz) {
      beleg.data.bs = textKurz;
      feldBs.value = textKurz;
      helfer.textareaGrow(feldBs);
      beleg.belegGeaendert(true);
    } else {
      return;
    }

    // Seitenzahl in der Quelle anpassen
    const seiteStart = pb[kurzErhalten[0]][0];
    const seiteEnde = pb[kurzErhalten.at(-1)].at(-1);
    if (!seiteStart) {
      return;
    }
    let seiten = seiteStart;
    if (seiteEnde && seiteEnde !== seiteStart) {
      seiten += "–" + seiteEnde;
    }
    const qu = beleg.data.qu.split("\n");
    const seitenReg = /, ((?:Sp?\.|hier)\s)[^.]+\.$/;
    const seitenMatch = qu[0].match(seitenReg);
    if (seitenMatch) {
      const zaehlung = seitenMatch[1];
      qu[0] = qu[0].replace(seitenReg, ", " + zaehlung + seiten + ".");
      beleg.data.qu = qu.join("\n");
      const feldQu = document.getElementById("beleg-qu");
      feldQu.value = beleg.data.qu;
      helfer.textareaGrow(feldQu);
    }
  },

  // Bewertung des Belegs vor- od. zurücknehmen
  //   stern = Element
  //     (Stern, auf den geklickt wurde, um eine Bewertung vorzunehmen)
  bewertung (stern) {
    const sterne = document.querySelectorAll("#beleg-bewertung a");
    for (let i = 0, len = sterne.length; i < len; i++) {
      if (sterne[i] === stern) {
        const bewertung = i + 1;
        if (beleg.data.be === bewertung) {
          beleg.data.be = 0;
        } else {
          beleg.data.be = bewertung;
        }
        sterne[i].blur();
        break;
      }
    }
    beleg.belegGeaendert(true);
    beleg.bewertungAnzeigen();
  },

  // regelt die Anzeige der Bewertung des Belegs
  bewertungAnzeigen () {
    const sterne = document.querySelectorAll("#beleg-bewertung a");
    for (let i = 0, len = sterne.length; i < len; i++) {
      if (i + 1 > beleg.data.be) {
        sterne[i].classList.remove("aktiv");
      } else {
        sterne[i].classList.add("aktiv");
      }
    }
  },

  // Verteilerfunktion, je nachdem welcher Event gerade stattfindet
  // (diese Funktion wird auch für die Sterne in der Filterliste benutzt)
  //   a = Element
  //     (Icon-Link mit dem Stern, der gerade aktiv ist)
  bewertungEvents (a) {
    // Mousover: Vorschau anzeigen
    a.addEventListener("mouseover", function () {
      const id = this.parentNode.id;
      const sterne = document.querySelectorAll(`#${id} a`);
      let aktivieren = true;
      for (let i = 0, len = sterne.length; i < len; i++) {
        if (aktivieren) {
          sterne[i].classList.add("aktiv");
          if (sterne[i] === this) {
            aktivieren = false;
          }
        } else {
          sterne[i].classList.remove("aktiv");
        }
      }
    });
    // Mouseout: die aktuelle Bewertung anzeigen
    a.addEventListener("mouseout", function () {
      const id = this.parentNode.id;
      if (/^beleg/.test(id)) {
        beleg.bewertungAnzeigen();
      } else if (/^filter/.test(id)) {
        filter.markierenSterne();
      }
    });
    // Click: den Zettel bewerten
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const id = this.parentNode.id;
      if (/^beleg/.test(id)) {
        beleg.bewertung(this);
      } else if (/^filter/.test(id)) {
        filter.anwendenSterne(this);
      }
    });
  },

  // Lesansicht umschalten
  //   user = Boolean
  //     (Leseansicht wurde durch User aktiv gewechselt)
  leseToggle (user) {
    // ggf. Update von beleg.data anstoßen
    // (das kann nötig sein, wenn in einem Datenfeld eine Eingabe erfolgt
    // und dann via Tastaturkürzel in die Leseansicht gewechselt wird)
    const active = document.activeElement;
    if (active.classList.contains("beleg-form-data")) {
      // blur() triggert das Change-Event
      active.blur();
    }

    // ggf. Annotierungs-Popup schließen
    annotieren.modSchliessen();

    // Suchleiste ggf. ausblenden
    if (document.getElementById("suchleiste")) {
      suchleiste.ausblenden();
    }

    // Ansicht umstellen
    const button = document.getElementById("beleg-link-leseansicht");
    const tab = document.querySelector("#beleg table");
    if (beleg.leseansicht) {
      beleg.leseansicht = false;
      button.classList.add("beleg-opt-anzeige-letztes");
      button.title = `zur Leseansicht wechseln (${tastatur.shortcutsTextAktuell("Strg")} + U)`;
      tab.classList.remove("leseansicht");
    } else {
      beleg.leseansicht = true;
      button.classList.remove("beleg-opt-anzeige-letztes");
      button.title = `zur Formularansicht wechseln (${tastatur.shortcutsTextAktuell("Strg")} + U)`;
      tab.classList.add("leseansicht");
    }
    button.classList.toggle("aktiv");
    tooltip.init(button.parentNode);

    // Header-Icons ein- oder ausblenden
    document.querySelectorAll("#beleg .icon-leseansicht").forEach(function (i) {
      if (beleg.leseansicht) {
        i.classList.remove("aus");
      } else {
        i.classList.add("aus");
      }
    });

    // Title des Sprung-Icons anpassen
    const springen = document.getElementById("beleg-link-springen");
    if (beleg.leseansicht) {
      springen.title = `zur nächsten Markierung springen (${tastatur.shortcutsTextAktuell("Strg")} + ↓)`;
    } else {
      springen.title = `zum Wort im Belegtext springen (${tastatur.shortcutsTextAktuell("Strg")} + ↓)`;
    }
    tooltip.init(springen.parentNode);

    // Einfüge-Icons ein- oder ausblenden
    document.querySelectorAll("#beleg .icon-tools-einfuegen").forEach(function (i) {
      if (beleg.leseansicht) {
        i.classList.add("aus");
      } else {
        i.classList.remove("aus");
      }
    });

    // Text-Tools für Beleg und Bedeutung ein- oder ausblenden
    const tools_beleg = document.querySelectorAll(".text-tools-beleg, .text-tools-bedeutung, .text-tools-quelle");
    for (const tools of tools_beleg) {
      if (beleg.leseansicht) {
        tools.classList.add("aus");
      } else {
        tools.classList.remove("aus");
      }
    }

    // Textwerte eintragen
    if (beleg.leseansicht) {
      beleg.leseFill();
    } else if (user) {
      document.querySelectorAll("#beleg textarea").forEach(textarea => helfer.textareaGrow(textarea));
      document.getElementById("beleg-da").focus();
    }
  },

  // aktuelle Werte des Belegs in die Leseansicht eintragen
  leseFill () {
    // Sprungmarke zurücksetzen
    beleg.ctrlSpringenPos = -1;
    // Meta-Infos
    const cont = document.getElementById("beleg-lese-meta");
    cont.replaceChildren();
    liste.metainfosErstellen(beleg.data, cont, "");
    if (!cont.hasChildNodes()) {
      cont.parentNode.classList.add("aus");
    } else {
      cont.parentNode.classList.remove("aus");
    }
    // Datensätze, die String sind
    for (const [ key, val ] of Object.entries(beleg.data)) {
      // String?
      if (typeof val !== "string") {
        continue;
      }
      // Container leeren
      const cont = document.getElementById(`beleg-lese-${key}`);
      if (!cont) { // manche Datensätze (dc, dm, bx) werden nicht angezeigt
        continue;
      }
      cont.replaceChildren();
      // Absätze einhängen
      const p = liste.belegErstellenPrepP(val).split("\n");
      let zuletzt_gekuerzt = false; // true, wenn der vorherige Absatz gekürzt wurde
      for (let i = 0, len = p.length; i < len; i++) {
        let text = p[i];
        if (!text && key === "no" && i === 0 && len > 1) {
          // der erste Absatz im Notizenfeld kann leer sein, soll aber nicht gedruckt
          // werden, wenn er leer ist; dies gilt allerdings nur, wenn darauf noch ein Absatz folgt
          continue;
        }
        const nP = document.createElement("p");
        cont.appendChild(nP);
        nP.dataset.pnumber = i;
        nP.dataset.id = "";
        if (!text) {
          text = "\u00A0";
        } else {
          // Absatz ggf. kürzen
          if (key === "bs" &&
              optionen.data.beleg.kuerzen &&
              !liste.wortVorhanden(text) &&
              !liste.annotierungVorhanden(text) &&
              !/class="belegschnitt"/.test(text)) {
            if (zuletzt_gekuerzt) {
              cont.removeChild(cont.lastChild);
            } else {
              liste.belegAbsatzGekuerzt(nP);
              zuletzt_gekuerzt = true;
            }
            continue;
          }
          zuletzt_gekuerzt = false;
          // Absatz einbinden
          if (!optionen.data.beleg.trennung) {
            text = liste.belegTrennungWeg(text, true);
          }
          if (key !== "bd" && key !== "bs") {
            text = helfer.escapeHtml(text);
          }
          if (/^(no|qu|ul)$/.test(key)) {
            text = liste.linksErkennen(text);
          } else if (key === "bs") {
            text = liste.belegWortHervorheben(text, true);
            text = liste.belegKlammernHervorheben({ text });
          } else if (key === "ud") {
            text = helfer.datumFormat(text, "einfach");
          }
        }
        nP.innerHTML = text;
        annotieren.init(nP);
      }
    }
    // Klick-Events an alles Links hängen
    document.querySelectorAll("#beleg .link").forEach(function (i) {
      helfer.externeLinks(i);
    });
  },

  // Verteilerfunktion für die Links im <caption>-Block
  //   a = Element
  //     (Link, auf den geklickt wurde)
  ctrlLinks (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (/navi-vorheriger$/.test(this.id)) {
        beleg.ctrlNavi(false);
      } else if (/navi-naechster$/.test(this.id)) {
        beleg.ctrlNavi(true);
      } else if (/leseansicht$/.test(this.id)) {
        beleg.leseToggle(true);
      } else if (/kuerzen$/.test(this.id)) {
        beleg.ctrlKuerzen();
      } else if (/trennung$/.test(this.id)) {
        beleg.ctrlTrennung();
      } else if (/springen$/.test(this.id)) {
        beleg.ctrlSpringen();
      } else if (/kopieren$/.test(this.id)) {
        kopieren.addKarte();
      } else if (/zwischenablage$/.test(this.id)) {
        beleg.ctrlZwischenablage(beleg.data);
      } else if (/duplikat/.test(this.id)) {
        beleg.ctrlDuplikat();
      } else if (/suchleiste$/.test(this.id)) {
        suchleiste.einblenden();
      }
    });
  },

  // Kürzung des Belegkontexts in der Leseansicht ein- bzw. ausblenden
  ctrlKuerzen () {
    // Hervorhebung umstellen
    optionen.data.beleg.kuerzen = !optionen.data.beleg.kuerzen;
    optionen.speichern();
    // Link anpassen
    beleg.ctrlKuerzenAnzeige();
    // Belegtext in der Leseansicht ggf. neu aufbauen
    if (beleg.leseansicht) {
      beleg.leseFill();
    }
    // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
    if (document.getElementById("suchleiste")) {
      suchleiste.suchen(true);
    }
  },

  // Kürzung des Belegkontexts in der Leseansicht ein- bzw. ausblenden (Anzeige)
  ctrlKuerzenAnzeige () {
    const link = document.getElementById("beleg-link-kuerzen");
    if (optionen.data.beleg.kuerzen) {
      link.classList.add("aktiv");
      link.title = `Belegkontext anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + K)`;
    } else {
      link.classList.remove("aktiv");
      link.title = `Belegkontext kürzen (${tastatur.shortcutsTextAktuell("Strg")} + K)`;
    }
    tooltip.init(link.parentNode);
  },

  // Trennstriche in der Leseansicht ein- bzw. ausblenden
  ctrlTrennung () {
    // Hervorhebung umstellen
    optionen.data.beleg.trennung = !optionen.data.beleg.trennung;
    optionen.speichern();
    // Link anpassen
    beleg.ctrlTrennungAnzeige();
    // Belegtext in der Leseansicht ggf. neu aufbauen
    if (beleg.leseansicht) {
      beleg.leseFill();
    }
    // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
    if (document.getElementById("suchleiste")) {
      suchleiste.suchen(true);
    }
  },

  // Trennstriche in der Leseansicht ein- bzw. ausblenden (Anzeige)
  ctrlTrennungAnzeige () {
    const link = document.getElementById("beleg-link-trennung");
    if (optionen.data.beleg.trennung) {
      link.classList.add("aktiv");
      link.title = `Silbentrennung nicht anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + T)`;
    } else {
      link.classList.remove("aktiv");
      link.title = `Silbentrennung anzeigen (${tastatur.shortcutsTextAktuell("Strg")} + T)`;
    }
    tooltip.init(link.parentNode);
  },

  // Verteiler für die Sprungfunktion (Ctrl + ↓)
  //   evt = Event-Objekt
  //     (kann fehlen, wenn über den Link im Kopf des Belegs aufgerufen)
  ctrlSpringen (evt = null) {
    // Springen unterbinden, wenn (1.) Fokus in Dropdownfeld + (2.) Auslöser Tastaturkürzel
    if (evt && document.activeElement.classList.contains("dropdown-feld")) {
      return;
    }
    if (beleg.leseansicht) {
      beleg.ctrlSpringenLese();
    } else {
      beleg.ctrlSpringenForm(evt);
    }
  },

  // das letzte Element, zu dem in der Karteikarte gesprungen wurde
  ctrlSpringenPos: -1,

  // durch die Hervorhebungen in der Leseansicht der Karteikarte springen
  ctrlSpringenLese () {
    const marks = document.querySelectorAll("#beleg mark.suchleiste, #beleg-lese-bs mark.user, #beleg-lese-bs mark.wort");
    if (!marks.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Keine Markierung gefunden.",
      });
      return;
    }
    // Element ermitteln
    beleg.ctrlSpringenPos++;
    if (beleg.ctrlSpringenPos >= marks.length) {
      beleg.ctrlSpringenPos = 0;
    }
    // Zur Position springen
    const rect = marks[beleg.ctrlSpringenPos].getBoundingClientRect();
    const quick = document.getElementById("quick");
    let quick_height = quick.offsetHeight;
    const header_height = document.querySelector("body > header").offsetHeight;
    const beleg_header_height = document.querySelector("#beleg > header").offsetHeight;
    const beleg_title_height = document.querySelector("#beleg-titel").offsetHeight;
    if (!quick.classList.contains("an")) {
      quick_height = 0;
    }
    const platz = window.innerHeight - header_height - beleg_header_height - beleg_title_height - quick_height;
    window.scrollTo({
      left: 0,
      top: window.scrollY + rect.bottom - window.innerHeight + Math.round(platz / 2),
      behavior: "smooth",
    });
    // Element markieren
    const pos = beleg.ctrlSpringenPos; // für schnelles Springen zwischenspeichern
    marks[pos].classList.add("mark");
    const marked = [ pos ];
    // ggf. direkt anhängende Elemente auch noch hervorheben
    if (/-kein-ende/.test(marks[pos].getAttribute("class"))) {
      for (let i = pos + 1, len = marks.length; i < len; i++) {
        beleg.ctrlSpringenPos++;
        marked.push(i);
        const m = marks[i];
        if (/-kein-start/.test(m.getAttribute("class")) &&
            !/-kein-ende/.test(m.getAttribute("class"))) {
          m.classList.add("mark");
          break;
        }
        m.classList.add("mark");
      }
    }
    setTimeout(function () {
      for (const i of marked) {
        marks[i].classList.remove("mark");
      }
    }, 1000);
  },

  // Springen im <textarea> des Belegtexts: Datenobjekt
  ctrlSpringenFormReg: {
    // nur Sprung-Icon
    // (RegExp mit allen Karteiwörtern)
    reg: null,
    // nur Sprung-Icon
    // (direkt noch einmal suchen)
    again: false,
    // nur Suchleiste
    // (alle Treffer im Belegtext)
    //   index = number (Index des Treffers)
    //   len = number (Zeichenlänge des Treffers)
    matches: [],
    // nur Sucheleiste
    // (letzter Match, zu dem gesprungen wurde)
    lastMatch: -1,
  },

  // Springen im <textarea> des Belegtexts: regulären Ausdruck zurücksetzen (nur Sprung-Icon)
  ctrlSpringenFormReset () {
    // RegExp ermitteln
    const regs = [];
    for (const i of helfer.formVariRegExpRegs) {
      if (!data.fv[i.wort].tr) {
        regs.push(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`);
      } else {
        regs.push(`[^${helfer.ganzesWortRegExp.links}]*(${i.reg})[^${helfer.ganzesWortRegExp.rechts}]*`);
      }
    }
    beleg.ctrlSpringenFormReg.reg = new RegExp(regs.join("|"), "gi");
    beleg.ctrlSpringenFormReg.again = false;
  },

  // Springen im <textarea> des Belegtexts: Matches ermitteln (nur Suchleiste)
  //   reg = RegExp
  ctrlSpringenFormMatches (reg) {
    const matches = beleg.ctrlSpringenFormReg.matches;
    matches.length = 0;
    beleg.ctrlSpringenFormReg.again = false;

    const bs = document.getElementById("beleg-bs");
    for (const m of bs.value.matchAll(reg)) {
      matches.push({
        index: m.index,
        len: m[0].length,
      });
    }

    beleg.ctrlSpringenFormReg.lastMatch = -1;
  },

  // Springen im <textarea> des Belegtexts: durch die Treffer springen (nur Sprung-Icon)
  ctrlSpringenForm (evt) {
    evt?.preventDefault();
    const textarea = document.getElementById("beleg-bs");
    const val = textarea.value;
    const search = beleg.ctrlSpringenFormReg.reg.exec(val);
    if (search) {
      // Wort gefunden
      beleg.ctrlSpringenFormReg.again = false;
      beleg.ctrlSpringenFormHighlight({
        index: search.index,
        len: search[0].length,
      });
    } else if (beleg.ctrlSpringenFormReg.again) {
      // Wort zum wiederholten Mal nicht gefunden => Wort nicht im Belegtext (oder nicht auffindbar)
      beleg.ctrlSpringenFormReg.again = false;
      dialog.oeffnen({
        typ: "alert",
        text: "Wort nicht gefunden.",
        callback: () => {
          textarea.scrollTop = 0;
          textarea.setSelectionRange(0, 0);
          textarea.focus();
        },
      });
    } else {
      // Wort nicht gefunden => entweder nicht im Belegtext oder nicht von Index 0 aus gesucht => noch einmal suchen
      beleg.ctrlSpringenFormReg.again = true;
      beleg.ctrlSpringenForm(evt);
    }
  },

  // Springen im <textarea> des Belegtexts: zum Suchtreffer scrollen
  //   index = number
  //   len = number
  ctrlSpringenFormHighlight ({ index, len }) {
    const bs = document.getElementById("beleg-bs");
    const val = bs.value;
    const ende = index + len;
    bs.scrollTop = 0;
    bs.value = val.substring(0, ende);
    bs.scrollTop = ende;
    bs.value = val;
    if (bs.scrollTop > 0) {
      bs.scrollTop += 120;
    }
    bs.setSelectionRange(index, ende);
    bs.focus();
  },

  // Kopiert den aktuellen Beleg in die Zwischenablage,
  // sodass er in eine andere Kartei kopiert werden kann
  //   dt = Object
  //     (das Datenobjekt, aus dem heraus der Beleg in die Zwischenablage kopiert werden soll)
  ctrlZwischenablage (dt) {
    const daten = kopieren.datenBeleg(dt);
    daten.typ = "ztb";
    daten.version = 3;
    daten.winId = winInfo.winId;
    daten.wort = kartei.wort;
    modules.clipboard.writeText(JSON.stringify(daten));
    helfer.animation("zwischenablage");
  },

  // Dupliziert den übergebenen Beleg
  async ctrlDuplikat () {
    // Versuchen noch nicht gespeicherte Änderungen anzuwenden;
    // scheitert das => abbrechen
    if (beleg.geaendert && !beleg.aktionSpeichern(true)) {
      return;
    }
    // Duplizieren kann durchgeführt werden
    const daten = [ kopieren.datenBeleg(beleg.data) ];
    const id_karte = await kopieren.einfuegenEinlesen(daten, true);
    // Duplikat öffnen (in derselben Ansicht)
    const leseansicht_status = beleg.leseansicht;
    beleg.oeffnen(id_karte);
    if (beleg.leseansicht !== leseansicht_status) {
      beleg.leseToggle(true);
    }
    // Animation anzeigen
    helfer.animation("duplikat");
  },

  // zur vorherigen/nächsten Karteikarte in der Belegliste springen
  //   next = Boolean
  //     (nächste Karte anzeigen)
  ctrlNavi (next) {
    // Karteikarte geändert?
    if (beleg.geaendert) {
      speichern.checkInit(() => beleg.ctrlNavi(next));
      return;
    }
    // Belege in der Liste und Position des aktuellen Belegs ermitteln
    const belege = [];
    document.querySelectorAll(".liste-kopf").forEach(function (i) {
      belege.push(i.dataset.id);
    });
    let pos = belege.indexOf("" + beleg.id_karte);
    // neue Position
    if (next) {
      pos++;
    } else {
      pos--;
    }
    if (pos === -2) { // kann bei neuen, noch nicht gespeicherten Karteikarten passieren
      pos = 0;
    }
    // erster oder letzter Beleg erreicht!
    if (pos < 0 || pos === belege.length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Der aktuelle Beleg ist ${next ? "der letzte" : "der erste"} in der Belegliste.`,
        callback: () => fokus(),
      });
      return;
    }
    // neuen Beleg öffnen:
    //   1. in derselben Ansicht
    //   2. mit demselben Icon fokussiert
    //   3. mit derselben Scroll-Position
    const leseansicht_status = beleg.leseansicht;
    const scroll = window.scrollY;
    beleg.oeffnen(parseInt(belege[pos], 10));
    if (beleg.leseansicht !== leseansicht_status) {
      beleg.leseToggle(true);
    }
    fokus();
    window.scrollTo({
      left: 0,
      top: scroll,
      behavior: "auto",
    }); // nach fokus()! Das sollte nicht smooth sein!
    // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
    if (document.getElementById("suchleiste")) {
      suchleiste.suchen(true);
    }
    // Icon fokussieren
    function fokus () {
      let icon;
      if (next) {
        icon = document.getElementById("beleg-link-navi-naechster");
      } else {
        icon = document.getElementById("beleg-link-navi-vorheriger");
      }
      icon.focus();
    }
  },

  bedeutungAnderesGeruest: "\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",

  // Bedeutungen-Fenster: Bedeutung aus dem Bedeutungen-Fenster in eine oder alle Karteikarten
  // eintragen oder aus einer oder allen Karteikarten entfernen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  //   eintragen = Boolean
  //     (eintragen oder entfernen)
  bedeutungenWin (bd, eintragen) {
    // Overlay-Fenster ist offen
    if (overlay.oben()) {
      dialog.oeffnen({
        typ: "alert",
        text: `Bedeutungen können nur ${eintragen ? "eingetragen" : "entfernt"} werden, wenn Karteikarte oder Belegliste nicht durch andere Fenster verdeckt werden.`,
      });
      return;
    }

    // Ziel ermitteln
    if (helfer.hauptfunktion === "karte") {
      beleg.bedeutungenWinKarte(bd, eintragen);
      return;
    } else if (helfer.hauptfunktion === "liste") {
      beleg.bedeutungenWinListe(bd, eintragen);
      return;
    }

    // unklar, wo eingetragen werden soll => Fehlermeldung
    dialog.oeffnen({
      typ: "alert",
      text: `Weder eine Karteikarte noch die Belegliste ist geöffnet.\nDie Bedeutung kann nur ${eintragen ? "eingetragen" : "entfernt"} werden, wenn eine der beiden Ansichten aktiv ist.`,
    });
  },

  // Bedeutungen-Fenster: Bedeutung in eine einzelne Karteikarte eintragen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  //   eintragen = Boolean
  //     (eintragen oder entfernen)
  bedeutungenWinKarte (bd, eintragen) {
    // Bedeutung schon vorhanden?
    const hatBd = beleg.data.bd.some(i => i.gr === bd.gr && i.id === bd.id);
    if (eintragen && hatBd || !eintragen && !hatBd) {
      let text = `Die Bedeutung wurde <strong>nicht</strong> ${eintragen ? "eingetragen" : "entfernt"}. Grund: Sie ist ${eintragen ? "schon" : "nicht"} vorhanden.`;
      if (data.bd.gn !== bd.gr) {
        text += beleg.bedeutungAnderesGeruest;
      }
      dialog.oeffnen({
        typ: "alert",
        text,
      });
      return;
    }

    // Bedeutung eintragen
    if (eintragen) {
      beleg.formularBedeutungPush(bd.id, bd.gr);
    } else {
      const idx = beleg.data.bd.findIndex(i => i.gr === bd.gr && i.id === bd.id);
      beleg.data.bd.splice(idx, 1);
      if (data.bd.gn === bd.gr) {
        beleg.formularBedeutungFill();
      }
      beleg.belegGeaendert(true);
    }

    // Meldung, dass Aktion in einem anderen Gerüst
    if (data.bd.gn !== bd.gr) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Bedeutung wurde ${eintragen ? "eingetragen" : "entfernt"}.` + beleg.bedeutungAnderesGeruest,
      });
    }

    // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
    if (document.getElementById("suchleiste")) {
      suchleiste.suchen(true);
    }
  },

  // Bedeutungen-Fenster: Bedeutung in jede sichtbare Karte der Belegliste eintragen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  //   eintragen = Boolean
  //     (eintragen oder entfernen)
  async bedeutungenWinListe (bd, eintragen) {
    // Bedeutungstext ermitteln
    const gr = data.bd.gr[bd.gr];
    const index = gr.bd.findIndex(i => i.id === bd.id);
    const bedeutung = gr.bd[index].bd.at(-1).replace(/<.+?>/g, "");
    const zaehlung = bedeutungen.zaehlungTief(index, gr.bd);
    const bdText = `<b class="zaehlung">${zaehlung.join(" ")}</b>${bedeutung}`;

    // keine Belege in der Liste
    if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum ${eintragen ? "in keine" : "aus keiner"} Karteikarte ${eintragen ? "eingetragen" : "entfernt"} werden.`,
      });
      return;
    }

    // Sicherheitsfrage
    const response = await new Promise(resolve => {
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich ${eintragen ? "in alle" : "aus allen"} Karteikarten, die derzeit in der Belegliste sichtbar sind, <strong>${eintragen ? "eingetragen" : "entfernt"}</strong> werden?`,
        callback: () => resolve(dialog.antwort),
      });
    });
    if (!response) {
      return;
    }

    // Bedeutung eintragen
    let geaendert = false;
    document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(kopf => {
      const id = kopf.dataset.id;
      const idx = data.ka[id].bd.findIndex(i => i.gr === bd.gr && i.id === bd.id);
      if (eintragen) {
        if (idx >= 0) {
          return;
        }
        data.ka[id].bd.push({ ...bd });
        data.ka[id].bd.sort(beleg.formularBedeutungSort);
      } else {
        if (idx === -1) {
          return;
        }
        data.ka[id].bd.splice(idx, 1);
      }
      data.ka[id].dm = new Date().toISOString();
      geaendert = true;
    });

    // Änderungen vorgenommen?
    if (!geaendert) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwar ${eintragen ? "schon in allen Karteikarten" : "noch in keiner Karteikarte"} vorhanden.`,
      });
      return;
    }
    kartei.karteiGeaendert(true);

    // Feedback
    let text = `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde ${eintragen ? "in alle" : "aus allen"} Karteikarten der Belegliste ${eintragen ? "eingetragen" : "entfernt"}.`;
    if (data.bd.gn !== bd.gr) {
      text += beleg.bedeutungAnderesGeruest;
    }
    dialog.oeffnen({
      typ: "alert",
      text,
    });

    // Liste auffrischen
    if (data.bd.gn === bd.gr) {
      liste.status(true);
    }
  },

  // Metadaten: füllen oder auffrischen
  metadaten () {
    const felder = [ "dc", "dm", "bi", "di", "bv", "bb", "bx", "ui" ];
    for (const feld of felder) {
      const cont = document.querySelector(`#beleg-${feld}`);
      cont.replaceChildren();
      if (beleg.data[feld] && feld === "bx") {
        // Importdaten
        const pre = document.createElement("pre");
        cont.appendChild(pre);
        if (/^(tei|xml)/.test(beleg.data.bi)) {
          let bx = beleg.data.bx;
          if (!optionen.data.beleg.header) {
            bx = bx.replace(/<teiHeader([^>]*)>.+?<\/teiHeader>/s, (...args) => `<teiHeader${args[1]}>[ausgeblendet]</teiHeader>`);
          }
          let xmlDoc = helferXml.parseXML(bx);
          xmlDoc = helferXml.indent(xmlDoc);
          const xmlStr = new XMLSerializer().serializeToString(xmlDoc);
          const pretty = helferXml.prettyPrint({
            xmlStr,
          });
          pre.innerHTML = pretty;
        } else if (/<[^>]+>/.test(beleg.data.bx)) {
          const pretty = helferXml.prettyPrint({
            xmlStr: beleg.data.bx,
          });
          pre.innerHTML = pretty;
        } else {
          pre.textContent = beleg.data.bx;
        }
      } else {
        // weitere Datenfelder
        let text = "–";
        if (beleg.data[feld]) {
          text = beleg.data[feld];
        }
        const div = document.createElement("div");
        cont.appendChild(div);
        div.textContent = text;
      }
    }
  },

  // Metadaten: Anzeige umschalten
  //   optionenSpeichern = Boolean
  metadatenToggle (optionenSpeichern) {
    // Icon umstellen
    const link = document.querySelector("#beleg-meta-toggle");
    if (optionen.data.beleg.meta) {
      link.classList.remove("icon-tools-meta-minus");
      link.classList.add("icon-tools-meta-plus");
      link.title = "Metadaten anzeigen";
    } else {
      link.classList.remove("icon-tools-meta-plus");
      link.classList.add("icon-tools-meta-minus");
      link.title = "Metadaten verbergen";
    }
    tooltip.init(link.parentNode);

    // Anzeige der Tabellenzeilen umstellen
    document.querySelectorAll("#beleg .meta").forEach(i => {
      if (optionen.data.beleg.meta) {
        i.classList.add("aus");
      } else {
        i.classList.remove("aus");
      }
    });

    // Optionen auffrischen
    optionen.data.beleg.meta = !optionen.data.beleg.meta;
    if (optionenSpeichern) {
      optionen.speichern();
    }
  },

  // Metadaten: Anzeige von <teiHeader> umstellen
  //   optionenSpeichern = Boolean
  metadatenHeaderToggle (optionenSpeichern) {
    // Optionen auffrischen
    optionen.data.beleg.header = !optionen.data.beleg.header;
    if (optionenSpeichern) {
      optionen.speichern();
    }

    // Icon umstellen
    const link = document.querySelector("#beleg-meta-header");
    if (optionen.data.beleg.header) {
      link.classList.add("icon-tools-header-aus");
      link.classList.remove("icon-tools-header-an");
      link.title = "&lt;teiHeader&gt; in den Importdaten ausblenden";
    } else {
      link.classList.remove("icon-tools-header-aus");
      link.classList.add("icon-tools-header-an");
      link.title = "&lt;teiHeader&gt; in den Importdaten einblenden";
    }
    tooltip.init(link.parentNode);

    // Anzeige der Metadaten auffrischen
    beleg.metadaten();
  },

  // Metadaten: Daten für den Reimport, die zuvor aus dem Quelle-Feld ausgelesen werden müssen
  metadatenReimportData: {},

  // Metadaten: Daten aus bx erneut importieren
  metadatenReimport () {
    // keine Daten vorhanden
    if (!beleg.data.bx) {
      dialog.oeffnen({
        typ: "alert",
        text: "Keine Importdaten vorhanden.",
      });
      return;
    }

    // Daten in Zwischenablage kopieren
    let bx = beleg.data.bx;
    if (beleg.data.bi === "plain-dereko") {
      // die Daten aus dem DeReKo sind schlecht strukturiert und
      // müssen darum neu zusammengebaut werden
      bx = "© Leibniz-Institut für Deutsche Sprache, Mannheim\n\n" + beleg.data.no + "\n".repeat(3);
      bx += `Belege ()\n${"_".repeat(10)}\n\n` + beleg.data.bx;
    } else if (/^tei/.test(beleg.data.bi)) {
      beleg.metadatenReimportData = {
        reimport: true,
        seiten: beleg.data.qu.match(/, Sp?\.\s(.+)\.$/)?.[1] || "",
        spalte: /, Sp\.\s/.test(beleg.data.qu),
      };
    }
    modules.clipboard.writeText(bx);
    beleg.formularImport({
      src: "zwischenablage",
    });

    // Reimport starten
    importShared.startImport();
  },

  // Metadaten: Importdaten in die Zwischenablage kopieren
  //   id = string
  metadatenCopy (id) {
    // Feld ermitteln
    const field = id.replace(/.+-/, "");

    // keine Importdaten vorhanden
    if (!beleg.data[field]) {
      const fieldMap = {
        bx: "Importdaten",
        ui: "Import-URL",
      };
      dialog.oeffnen({
        type: "alert",
        text: `Keine ${fieldMap[field]} gespeichert.`,
      });
      return;
    }

    // Daten kopieren
    modules.clipboard.writeText(beleg.data[field]);

    // Feedback geben
    helfer.animation("zwischenablage");
  },
};
