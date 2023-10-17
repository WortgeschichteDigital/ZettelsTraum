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
      bd: [], // Bedeutung
      be: 0, // Bewertung (Markierung)
      bi: "", // Importtyp (bezieht sich auf die Daten in bx)
      bl: "", // Wortbildung
      bs: "", // Beleg
      bx: "", // Beleg-XML
      da: "", // Belegdatum
      dc: new Date().toISOString(), // Datum Karteikarten-Erstellung
      dm: "", // Datum Karteikarten-Änderung
      kr: "", // Korpus
      no: "", // Notizen
      qu: "", // Quelle
      sy: "", // Synonym
      tg: [], // Tags
      ts: "", // Textsorte
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
    beleg.ctrlSpringenFormReg.again = false;
    beleg.ctrlSpringenFormReset();

    // Beleg-Titel eintragen
    const beleg_titel = document.getElementById("beleg-titel");
    const titel_text = document.createTextNode(`Beleg #${beleg.id_karte}`);
    beleg_titel.replaceChild(titel_text, beleg_titel.firstChild);

    // Tags eintragen
    beleg.tagsFill();
    beleg.tagsList();

    // Feld-Werte eintragen
    const felder = document.querySelectorAll("#beleg input, #beleg textarea");
    for (let i = 0, len = felder.length; i < len; i++) {
      const feld = felder[i].id.replace(/^beleg-/, "");
      if (felder[i].type === "button" || /^tags?-/.test(feld)) {
        continue;
      } else if (feld === "dta") {
        felder[i].value = "";
        continue;
      } else if (feld === "dta-bis") {
        felder[i].value = "0";
        continue;
      } else if (/^(bd|datei-latin1)$/.test(feld)) {
        continue;
      } else if (felder[i].type === "checkbox") {
        felder[i].checked = beleg.data[feld];
      } else { // Text-Input und Textarea
        felder[i].value = beleg.data[feld];
      }
    }

    // Feld-Wert für Bedeutung eintragen
    beleg.formularBedeutung();
    beleg.formularBedeutungLabel();

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
      // Was ist in der Zwischenablage?
      const cb = modules.clipboard.readText().trim();
      const ppnCp = belegImport.PPNCheck({ ppn: cb });
      const dwds = belegImport.DWDSXMLCheck(cb);
      const xml = belegImport.XMLCheck({ xmlStr: cb });
      const bibtexCp = belegImport.BibTeXCheck(cb);
      if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cb)) { // DTA-URL
        beleg.formularImport("dta");
      } else if (dwds) { // DWDS-Snippet
        belegImport.DWDS(dwds, "– Zwischenablage –", false);
        beleg.formularImport("dwds");
      } else if (xml) {
        belegImport.XML(cb, "– Zwischenablage –", false);
        beleg.formularImport("xml");
      } else if (bibtexCp) {
        belegImport.BibTeX(cb, "– Zwischenablage –", false);
        beleg.formularImport("bibtex");
      } else if (ppnCp) {
        belegImport.PPNAnzeigeKarteikarte({ typ: "xml" });
      } else if (belegImport.Datei.data.length) {
        beleg.formularImport(belegImport.Datei.typ);
      } else {
        let feld = document.querySelector("#beleg-da");
        if (optionen.data.einstellungen["karteikarte-fokus-beleg"]) {
          feld = document.querySelector("#beleg-bs");
        }
        feld.focus();
      }
    }
  },

  // Bedeutung in das Formular eintragen
  formularBedeutung () {
    // Wert ermitteln
    const bd = [];
    for (let i = 0, len = beleg.data.bd.length; i < len; i++) {
      if (beleg.data.bd[i].gr !== data.bd.gn) { // Bedeutungen aus anderen Gerüsten nicht drucken
        continue;
      }
      bd.push(bedeutungen.bedeutungenTief({
        gr: beleg.data.bd[i].gr,
        id: beleg.data.bd[i].id,
        za: false,
        al: true,
        strip: true,
      }));
    }
    // Wert ins Feld eintragen
    const feld = document.getElementById("beleg-bd");
    feld.value = bd.join("\n");
    // Feld anpassen
    feld.scrollTop = 0;
    helfer.textareaGrow(feld);
  },

  // Label der Bedeutung auffrischen
  formularBedeutungLabel () {
    const text = `Bedeutung${bedeutungen.aufbauenH2Details(data.bd, true)}`;
    const label = document.querySelector('[for="beleg-bd"]');
    label.textContent = text;
  },

  // Änderungen in einem Formular-Feld automatisch übernehmen
  //   feld = Element
  //     (das Formularfeld, das geändert wurde)
  formularGeaendert (feld) {
    feld.addEventListener("input", function () {
      const feld = this.id.replace(/^beleg-/, "");
      if (/^dta(-bis)*$/.test(feld)) { // #beleg-dta + #beleg-dta-bis gehören nicht zur Kartei, dienen nur zum DTA-Import
        if (feld === "dta" &&
            /^https?:\/\/www\.deutschestextarchiv\.de\//.test(this.value)) { // Bis-Seite ermitteln und eintragen
          const fak = belegImport.DTAGetFak(this.value, "");
          if (fak) {
            this.nextSibling.value = parseInt(fak, 10) + 1;
          }
        }
        return;
      }
      if (this.type === "checkbox") {
        beleg.data[feld] = this.checked;
      } else if (feld === "bd") {
        // Daten des Bedeutungsfelds werden erst beim Speichern aufgefrischt;
        // vgl. beleg.aktionSpeichern().
        // Wurden die Daten hier geändert, darf das Gerüst aber erst
        // nach dem Speichern gewechselt werden, sonst gehen die Änderungen verloren.
        beleg.geaendertBd = true;
      } else {
        let noLeer = "";
        if (feld === "no" && /^\n/.test(this.value)) {
          // am Anfang der Notizen müssen Leerzeilen erlaubt sein,
          // weil die erste Zeile in der Belegliste angezeigt werden kann
          noLeer = this.value.match(/^\n+/)[0];
        }
        beleg.data[feld] = noLeer + helfer.textTrim(this.value, true);
      }
      beleg.belegGeaendert(true);
    });
  },

  // zwischen den Import-Formularen hin- und herschalten (Listener)
  //   radio = Element
  //     (Radio-Button zum Umschalten des Import-Formulars)
  formularImportListener (radio) {
    radio.addEventListener("change", function () {
      const src = this.id.replace(/.+-/, "");
      beleg.formularImport(src);
    });
  },

  // zwischen den Import-Formularen hin- und herschalten
  //   src = String
  //     (ID der Quelle, aus der importiert werden soll: dta | dwds | dereko | xml | bibtex)
  formularImport (src) {
    // ggf. src umstellen
    src = src === "ppn" ? "xml" : src;
    // Checkbox für ISO 8859-15 umstellen
    const latin1 = document.getElementById("beleg-datei-latin1");
    if (src === "dereko") {
      latin1.checked = true;
    } else {
      latin1.checked = false;
    }
    // Radio-Buttons umstellen
    // (weil Wechsel nicht nur auf Klick, sondern auch automatisch geschieht)
    const radios = [ "beleg-import-dta", "beleg-import-dwds", "beleg-import-dereko", "beleg-import-xml", "beleg-import-bibtex" ];
    for (const r of radios) {
      const radio = document.getElementById(r);
      if (r.includes(src)) {
        radio.checked = true;
      } else {
        radio.checked = false;
      }
    }
    // Formular umstellen
    const forms = [ "beleg-form-dta", "beleg-form-datei" ];
    let formsZiel = src;
    if (/^(dwds|dereko|xml|bibtex)/.test(src)) {
      formsZiel = "datei";
    }
    let eleAktiv = null;
    for (const f of forms) {
      const ele = document.getElementById(f);
      if (f.includes(formsZiel)) {
        ele.classList.remove("aus");
        eleAktiv = ele;
      } else {
        ele.classList.add("aus");
      }
    }
    // Fokus setzen
    if (/^(dwds|dereko|xml|bibtex)$/.test(src)) {
      const inputs = eleAktiv.querySelectorAll("input");
      if (src === belegImport.Datei.typ &&
          belegImport.Datei.data.length ||
         belegImport.Datei.typ === "ppn") {
        inputs[inputs.length - 1].focus();
      } else {
        inputs[inputs.length - 2].focus();
      }
      // ggf. Dateiname eintragen
      beleg.formularImportDatei(src);
    } else {
      eleAktiv.querySelector("input").focus();
    }
  },

  // ggf. Dateiname eintragen
  //   src = String
  //     (ID der Quelle, aus der importiert werden soll: dwds | dereko | xml | bibtex)
  formularImportDatei (src) {
    const name = document.getElementById("beleg-datei-name");
    if (src === "dwds" && belegImport.Datei.typ === "dwds" ||
        src === "dereko" && belegImport.Datei.typ === "dereko" ||
        src === "xml" && belegImport.Datei.typ === "xml" ||
        src === "bibtex" && belegImport.Datei.typ === "bibtex" ||
        /^(xml|bibtex)$/.test(src) && belegImport.Datei.typ === "ppn") {
      name.textContent = `\u200E${belegImport.Datei.pfad}\u200E`; // vgl. meta.oeffnen()
      name.classList.remove("leer");
    } else {
      name.textContent = "keine Datei geladen";
      name.classList.add("leer");
    }
  },

  // Tags: Liste der Standardtags und ihrer Icons
  tags: {
    unvollständig: "kreis-unvollstaendig.svg",
    ungeprüft: "verboten.svg",
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
        for (const i of Object.keys(beleg.tags)) {
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
        beleg.tagsList();
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
    const alleTags = new Set();
    Object.keys(beleg.tags).forEach(i => alleTags.add(i));
    for (const karte of Object.values(data.ka)) {
      for (const tag of karte.tg) {
        alleTags.add(tag);
      }
    }

    // Tagliste bereinigen
    const tags = [ ...alleTags ].sort(beleg.tagsSort);
    for (const tag of beleg.data.tg) {
      const idx = tags.indexOf(tag);
      if (idx === -1) {
        continue;
      }
      tags.splice(idx, 1);
    }

    // Tags drucken
    const list = document.getElementById("beleg-tags-list");
    list.replaceChildren();
    for (const tag of tags) {
      const a = document.createElement("a");
      list.appendChild(a);
      const img = document.createElement("img");
      a.appendChild(img);
      img.src = "img/" + (beleg.tags[tag] || "etikett.svg");
      img.width = "24";
      img.height = "24";
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
  },

  // Tags: selbstdefinierten Tag hinzufügen
  //   tag = String
  tagsAdd (tag) {
    // Tag im Dropdown-Menü markiert?
    const markiert = document.querySelector("#beleg-tags-list .markiert");
    if (markiert) {
      markiert.click();
      return;
    }

    // Tag aufbereiten
    tag = helfer.textTrim(tag, true);
    if (!tag) {
      return;
    }

    // Tag schon angehängt?
    if (beleg.data.tg.includes(tag)) {
      dialog.oeffnen({
        typ: "alert",
        text: `Der Tag <i>${tag}</i> hängt schon an der Karteikarte.`,
        callback: () => {
          document.getElementById("beleg-tags-neu").select();
        },
      });
      return;
    }

    // Tag hinzufügen
    document.getElementById("beleg-tags-neu").value = "";
    beleg.data.tg.push(tag);
    beleg.data.tg.sort(beleg.tagsSort);
    beleg.tagsFill();
    beleg.tagsList();
    beleg.belegGeaendert(true);
  },

  // Tags: durch die Liste der Tags navigieren
  //   up = Boolean
  tagsNav (up) {
    // Gibt es noch Tags zum Hinzufügen?
    const tags = document.querySelectorAll("#beleg-tags-list a");
    if (!tags.length) {
      return;
    }

    // markiertes Element ermitteln
    const markiert = document.querySelector("#beleg-tags-list .markiert");
    let idx = -1;
    if (markiert) {
      for (let i = 0, len = tags.length; i < len; i++) {
        if (tags[i].classList.contains("markiert")) {
          idx = i;
          break;
        }
      }
      markiert.classList.remove("markiert");
    }

    // nächstes Element markieren
    if (up) {
      idx--;
    } else {
      idx++;
    }
    if (idx < 0) {
      return;
    } else if (idx === tags.length) {
      idx--;
    }
    tags[idx].classList.add("markiert");
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
      } else if (aktion === "dta-button") {
        belegImport.DTA();
      } else if (aktion === "datei-oeffnen") {
        belegImport.DateiOeffnen();
      } else if (aktion === "datei-importieren") {
        belegImport.DateiImport();
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
          callback: () => {
            beleg.selectFormEle(da);
          },
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
          callback: () => {
            beleg.selectFormEle(da);
          },
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
          callback: () => {
            beleg.selectFormEle(bs);
          },
        });
      } else {
        beleg.selectFormEle(bs);
        beleg.fehlerFormEle(bs);
      }
      return false;
    }
    // Check: Quelle angegeben?
    const qu = document.getElementById("beleg-qu");
    if (!helfer.textTrim(qu.value, true)) {
      if (!optionen.data.einstellungen["karteikarte-keine-fehlermeldung"]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie müssen eine Quelle angeben.",
          callback: () => {
            beleg.selectFormEle(qu);
          },
        });
      } else {
        beleg.selectFormEle(qu);
        beleg.fehlerFormEle(qu);
      }
      return false;
    }
    // Beleg wurde nicht geändert
    if (!beleg.geaendert) {
      direktSchliessen();
      return false;
    }
    // ggf. Format von Bedeutung, Wortbildung, Synonym und Textsorte anpassen
    const bdFeld = document.getElementById("beleg-bd");
    const ds = [ "bd", "bl", "sy", "ts" ];
    for (let i = 0, len = ds.length; i < len; i++) {
      const ds_akt = ds[i];
      if (ds_akt === "bd") {
        bdFeld.value = beleg.bedeutungAufbereiten();
      } else {
        beleg.data[ds_akt] = beleg.data[ds_akt].replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
      }
    }
    // Bedeutungen des aktuellen Gerüsts entfernen
    for (let i = 0, len = beleg.data.bd.length; i < len; i++) {
      if (beleg.data.bd[i].gr === data.bd.gn) {
        beleg.data.bd.splice(i, 1);
        i--;
        len = beleg.data.bd.length;
      }
    }
    // Bedeutung im Bedeutungsfeld hinzufügen
    const bdFeldSp = bdFeld.value.split("\n");
    for (let i = 0, len = bdFeldSp.length; i < len; i++) {
      let zeile = bdFeldSp[i];
      // Bedeutungsfeld könnte leer sein
      if (!zeile) {
        continue;
      }
      // Tags entfernen
      // (User könnten auf die Idee kommen, gleich <i>, <b>, <u> oder Text in Spitzklammern einzugeben;
      // das macht die Sache nur kompliziert, weil z.B. das HTML auf Korrektheit getestet werden müsste)
      zeile = helfer.textTrim(zeile.replace(/<.+?>|[<>]+/g, ""), true);
      // ggf. neue Bedeutung in das Gerüst eintragen
      let bd = beleg.bedeutungSuchen(zeile);
      if (!bd.id) {
        bd = beleg.bedeutungErgaenzen(zeile);
        if (!bd.id) { // die Funktion ist kompliziert und fehleranfällig, lieber noch mal kontrollieren
          dialog.oeffnen({
            typ: "alert",
            text: "Beim Speichern der Karteikarte ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nEinhängen der neuen Bedeutung in das Bedeutungsgerüst fehlgeschalgen",
          });
          return false;
        }
      }
      beleg.data.bd.push({
        gr: data.bd.gn,
        id: bd.id,
      });
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
    // Bedeutungsgerüst-Fenster mit neuen Daten versorgen
    bedeutungenWin.daten();
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
  selectFormEle (ele) {
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
    ele.select();
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

  // Bedeutung wurde geändert und nocht nicht gespeichert
  geaendertBd: false,

  // Anzeigen, dass der Beleg geändert wurde
  //   geaendert = Boolean
  belegGeaendert (geaendert) {
    beleg.geaendert = geaendert;
    helfer.geaendert();
    const asterisk = document.getElementById("beleg-geaendert");
    if (geaendert) {
      asterisk.classList.remove("aus");
    } else {
      beleg.geaendertBd = false;
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

  // Speichern oder DTAImport starten (wenn Fokus auf einem Input-Element)
  //   input = Element
  //     (Element, auf dem das Event ausgeführt wird:
  //     <input type="checkbox">, <input type="number">, <input type="text">, <textarea>)
  belegSpeichern (input) {
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if ((!tastatur.modifiers || tastatur.modifiers === "Ctrl") && evt.key === "Enter") {
        if (tastatur.modifiers === "Ctrl") {
          evt.preventDefault();
          beleg.aktionSpeichern();
          return;
        }
        if (/^beleg-dta(-bis)*$/.test(this.id)) {
          evt.preventDefault();
          belegImport.DTA();
          return;
        }
        if (document.getElementById("dropdown") &&
            /^beleg-(bd|bl|kr|sy|ts)/.test(this.id)) {
          evt.preventDefault();
        }
      }
    });
    // DTA-Feld ggf. direkt aus dem Clipboard füttern
    if (input.id === "beleg-dta") {
      input.addEventListener("focus", function () {
        if (this.value || !optionen.data.einstellungen["url-eintragen"]) {
          return;
        }
        const cb = modules.clipboard.readText();
        if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(cb)) {
          setTimeout(function () {
            // der Fokus könnte noch in einem anderen Feld sein, das dann gefüllt werden würde;
            // man muss dem Fokus-Wechsel ein bisschen Zeit geben
            if (document.activeElement.id !== "beleg-dta") {
              // ist eine URL in der Zwischenablage, fokussiert man das DTA-Feld und löscht den Inhalt,
              // defokussiert man das Programm und fokussiert es dann wieder, indem man direkt
              // auf ein anderes Textfeld klickt, würde dieses Textfeld gefüllt werden
              return;
            }
            document.execCommand("paste");
          }, 5);
        }
      });
    }
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
    let text = "";
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
      const bd = beleg.bedeutungAufbereiten();
      const bds = [];
      bd.split("\n").forEach(function (i) {
        const bd = beleg.bedeutungSuchen(i);
        if (!bd.id) {
          const bdsTmp = [];
          i.split(": ").forEach(function (j, n) {
            let vor = "\u00A0".repeat(3);
            if (!n) {
              vor = "";
            }
            bdsTmp.push(`${vor}<b>?</b> ${j}`);
          });
          bds.push(bdsTmp.join(""));
        } else {
          bds.push(bedeutungen.bedeutungenTief({
            gr: data.bd.gn,
            id: bd.id,
            leer: true,
          }));
        }
      });
      let html = "";
      bds.forEach(function (i) {
        html += `<p>${i}</p>`;
      });
      const text = bds.join("\n").replace(/<.+?>/g, "");
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
    text = text.replace(/<span class="klammer-(autorenzusatz|loeschung|streichung)">(.+?)<\/span>/g, (m, typ, text) => {
      let r = `[${text}]`;
      if (typ === "loeschung" && !optionen.data.einstellungen["textkopie-klammern-loeschung"] ||
          typ === "streichung" && !optionen.data.einstellungen["textkopie-klammern-streichung"]) {
        r = "[…]";
      }
      if (html && optionen.data.einstellungen["textkopie-klammern-farbe"]) {
        r = `<span style="color: ${farben[typ]}">${r}</span>`;
      }
      return r;
    });
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
    let hText = "";
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
        text += `<p>${helfer.escapeHtml(i)}</p>`;
      });
    } else {
      text += "\n\n---\n\n";
      text += obj.qu;
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
    const id = link.closest("th").firstChild.getAttribute("for");
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
    html = html.replace(/<([a-zA-Z0-9]+) .+?>/g, function (m, p1) {
      return `<${p1}>`;
    });
    // HTML in temporären Container schieben
    const container = document.createElement("div");
    container.innerHTML = html;
    // Inline-Tags, die erhalten bleiben bzw. ersetzt werden sollen
    let inline_keep = [
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
    ];
    let speziell = {
      BIG: { // obsolete!
        ele: "span",
        class: "dta-groesser",
      },
      H1: {
        ele: "span",
        class: "dta-groesser",
      },
      H2: {
        ele: "span",
        class: "dta-groesser",
      },
      H3: {
        ele: "span",
        class: "dta-groesser",
      },
      H4: {
        ele: "span",
        class: "dta-groesser",
      },
      H5: {
        ele: "span",
        class: "dta-groesser",
      },
      H6: {
        ele: "span",
        class: "dta-groesser",
      },
    };
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
    container.childNodes.forEach(function (i) {
      ana(i, false);
    });
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
        ele.childNodes.forEach(function (i) {
          ana(i, preformatted);
        });
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
        start: '<span class="dta-antiqua">',
        ende: "</span>",
      },
      autorenzusatz: {
        start: '<span class="klammer-autorenzusatz">',
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
        start: '<span class="dta-kapitaelchen">',
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
        start: '<span class="dta-groesser">',
        ende: "</span>",
      },
      spacing: {
        start: '<span class="dta-gesperrt">',
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
        callback: () => {
          ta.focus();
        },
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
      beleg.toolsQuelleDTALink();
    }
  },

  // Aufrufdatum in Quelle-Feld einfügen
  toolsAufrufdatum () {
    const qu = document.getElementById("beleg-qu");
    qu.focus();
    const heute = new Date();
    const start = qu.value.substring(0, qu.selectionStart);
    const ende = qu.value.substring(qu.selectionStart);
    const leerzeichen = / $/.test(start) ? "" : " ";
    qu.value = start + leerzeichen + `(Aufrufdatum: ${heute.getDate()}. ${heute.getMonth() + 1}. ${heute.getFullYear()})` + ende;
  },

  // Inhalt des Quelle-Felds neu laden
  //   shortcut = true | undefined
  async toolsQuelleLaden (shortcut = false) {
    // Zwischenspeicher für Änderungen
    const aenderungen = {};
    // Titelinfos aus bx laden
    const bx = beleg.bxTyp({ bx: beleg.data.bx });
    if (bx.typ) {
      let titel = "";
      if (bx.typ === "bibtex") {
        const bibtex = belegImport.BibTeXLesen(bx.daten, true);
        if (bibtex.length) {
          titel = bibtex[0].ds.qu;
        }
      } else if (bx.typ === "dereko") {
        const reg = new RegExp(`^(${belegImport.DeReKoId})(.+)`);
        titel = bx.daten.match(reg)[2] + ".";
      } else if (bx.typ === "xml-dwds") {
        const dwds = belegImport.DWDSLesenXML({
          clipboard: "",
          xml: bx.daten,
          returnResult: true,
        });
        let url = liste.linksErkennen(dwds.qu);
        if (/href="/.test(url)) {
          url = url.match(/href="(.+?)"/)[1];
        }
        let direktAusDTA = false;
        if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
          direktAusDTA = await new Promise(resolve => {
            dialog.oeffnen({
              typ: "confirm",
              text: "Die Karteikarte wurde aus einem DWDS-Snippet gefüllt, der Beleg stammt allerdings aus dem DTA.\nSoll der Zitiertitel direkt aus dem DTA geladen werden?",
              callback: () => {
                if (dialog.antwort) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              },
            });
          });
        }
        if (direktAusDTA) {
          titel = await beleg.toolsQuelleLadenDTA({ url });
          if (titel) {
            aenderungen.Autor = {
              key: "au",
              ori: beleg.data.au,
              neu: belegImport.DTAData.autor.join("/"),
            };
            if (!aenderungen.Autor.neu) {
              aenderungen.Autor.neu = "N.\u00A0N.";
            }
          }
        } else if (dwds.qu) {
          if (beleg.data.au &&
              !/^(N\.\s?N\.|Name|Nn|o\.\s?A\.|unknown|unkown)/.test(beleg.data.au)) {
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
      } else if (bx.typ === "xml-fundstelle") {
        const daten = redLit.eingabeXMLFundstelle({ xmlDoc: bx.daten, xmlStr: "" });
        titel = daten.ds.qu;
      } else if (bx.typ === "xml-mods") {
        const daten = redLit.eingabeXMLMODS({ xmlDoc: bx.daten, xmlStr: "" });
        titel = daten.ds.qu;
      }
      if (titel) {
        aenderungen.Quelle = {
          key: "qu",
          ori: beleg.data.qu,
          neu: titel,
        };
        ausfuellen();
      } else if (titel === "") {
        // "titel" könnte "false" sein, wenn die Anfrage an das DTA gescheitert ist;
        // in diesem Fall kommt eine Fehlermeldung von der Fetch-Funktion
        lesefehler();
      }
      return;
    }
    // wenn Korpus "DWDS" => mit dem Text arbeiten, der im Quelle-Feld steht
    if (/^DWDS/.test(beleg.data.kr)) {
      const quelle = beleg.data.qu.split("\n");
      const data = {
        au: beleg.data.au,
        da: beleg.data.da,
        qu: quelle[0],
      };
      // versuchen, relativ wild in das Quelle-Feld
      // kopierte Daten zu Titel und Autor auszulesen
      const titeldaten = {};
      const autor = /, Autor: (?<Autor>.+?), Titel:/.exec(data.qu);
      const titel = /, Titel: (?<Titel>.+?)(?<Ende>$|, S)/.exec(data.qu);
      if (autor) {
        data.au = autor.groups.Autor;
        data.qu = data.qu.replace(/, Autor: .+?, Titel:/, ", Titel:");
      }
      if (titel) {
        titeldaten.titel = titel.groups.Titel;
        const reg = new RegExp(", Titel: .+" + titel.groups.Ende);
        data.qu = data.qu.replace(reg, titel.groups.Ende);
      }
      // Autor und Quelle nachbearbeiten
      data.au = belegImport.DWDSKorrekturen({
        typ: "au",
        txt: data.au,
      });
      belegImport.DWDSKorrekturen({
        typ: "qu",
        txt: data.qu,
        data,
        titeldaten,
      });
      // Änderungen ermitteln
      aenderungen.Autor = {
        key: "au",
        ori: beleg.data.au,
        neu: data.au,
      };
      quelle[0] = data.qu;
      aenderungen.Quelle = {
        key: "qu",
        ori: beleg.data.qu,
        neu: quelle.join("\n"),
      };
      // fragen, ob Änderungen übernommen werden sollen
      ausfuellen();
      return;
    }
    // Titelinfos aus dem DTA herunterladen
    let url = liste.linksErkennen(beleg.data.qu);
    if (/href="/.test(url)) {
      url = url.match(/href="(.+?)"/)[1];
    }
    if (/^https?:\/\/www\.deutschestextarchiv\.de\//.test(url)) {
      const titel = await beleg.toolsQuelleLadenDTA({ url });
      if (titel) {
        aenderungen.Autor = {
          key: "au",
          ori: beleg.data.au,
          neu: belegImport.DTAData.autor.join("/"),
        };
        if (!aenderungen.Autor.neu) {
          aenderungen.Autor.neu = "N.\u00A0N.";
        }
        aenderungen.Quelle = {
          key: "qu",
          ori: beleg.data.qu,
          neu: titel,
        };
        ausfuellen();
      } else if (titel === "") {
        lesefehler();
      }
      return;
    }
    // keine Quelle gefunden
    dialog.oeffnen({
      typ: "alert",
      text: "Es wurde keine Quelle gefunden, aus der die Titeldaten automatisch neu geladen werden könnten.",
    });
    // Quellenfeld ausfüllen (wenn gewünscht)
    function ausfuellen () {
      // Änderungen ermitteln
      const txt = [];
      for (const [ k, v ] of Object.entries(aenderungen)) {
        const ori = v.ori.split(/\n+https?:/)[0];
        const neu = v.neu.split(/\n+https?:/)[0];
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
      dialog.oeffnen({
        typ: "confirm",
        text: `${numerus} vorgenommen werden?\n${txt.join("\n")}`,
        callback: () => {
          if (dialog.antwort) {
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
          setTimeout(() => {
            document.querySelector("#dialog > div").classList.remove("breit");
          }, 200);
        },
      });
      document.querySelector("#dialog > div").classList.add("breit");
      document.querySelectorAll("#dialog-text p").forEach(p => p.classList.add("force-wrap"));
    }
    // generische Fehlermeldung
    function lesefehler () {
      dialog.oeffnen({
        typ: "alert",
        text: "Beim Einlesen der Titeldaten ist etwas schiefgelaufen.",
      });
    }
  },

  // Zitiertitelanfrage an das DTA
  //   url = String
  //     (DTA-Link)
  async toolsQuelleLadenDTA ({ url }) {
    const quelle = document.getElementById("beleg-qu");
    // Seitenangabe auslesen
    const mHier = /, hier (?<seiten>[^\s]+)( |\.\n\n)/.exec(quelle.value);
    const mSeiten = /(?<typ>, Sp?\.)\s(?<seiten>[^\s]+)( |\.\n\n)/.exec(quelle.value);
    const seitenData = {
      seite: "",
      seite_zuletzt: "",
      spalte: false,
    };
    let seiten;
    if (mHier) {
      seiten = mHier.groups.seiten;
    } else if (mSeiten) {
      seiten = mSeiten.groups.seiten;
      if (mSeiten.groups.typ === ", Sp.") {
        seitenData.spalte = true;
      }
    }
    if (seiten) {
      const seitenSp = seiten.split(/[-–]/);
      seitenData.seite = seitenSp[0];
      if (seitenSp[1]) {
        seitenData.seite_zuletzt = seitenSp[1];
      }
    }
    // TEI-Header herunterladen
    const fetchOk = await redLit.eingabeDTAFetch({
      url,
      fokusId: "beleg-qu",
      seitenData,
    });
    // Rückgabewerte
    if (fetchOk) {
      return belegImport.DTAQuelle(true);
    }
    return false;
  },

  // Typ der Daten im bx-Datensatz ermitteln
  //   bx = String
  //     (Datensatz, der überprüft werden soll)
  bxTyp ({ bx }) {
    // keine Daten vorhanden
    if (!bx) {
      return {
        typ: "",
        daten: "",
      };
    }
    // BibTeX-Daten
    if (belegImport.BibTeXCheck(bx)) {
      return {
        typ: "bibtex",
        daten: bx,
      };
    }
    // DeReKo-Daten
    const reg = new RegExp(`^${belegImport.DeReKoId}`);
    if (reg.test(bx)) {
      return {
        typ: "dereko",
        daten: bx,
      };
    }
    // XML-Daten
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(bx.replace(/ xmlns=".+?"/, ""), "text/xml");
    if (!xmlDoc.querySelector("parsererror")) {
      const evaluator = xpath => xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null).iterateNext();
      let typ = "";
      if (evaluator("//teiHeader/sourceDesc/biblFull")) {
        typ = "xml-dta";
      } else if (evaluator("/Beleg/Fundstelle")) {
        typ = "xml-dwds";
      } else if (evaluator("/Fundstelle")) {
        typ = "xml-fundstelle";
      } else if (evaluator("/mods/titleInfo")) {
        typ = "xml-mods";
      } else {
        typ = "";
      }
      return {
        typ,
        daten: xmlDoc,
      };
    }
    // Datenformat unbekannt
    return {
      typ: "",
      daten: "",
    };
  },

  // DTA-Link aus dem Quelle-Feld in das Importformular holen
  toolsQuelleDTALink () {
    const quelle = document.querySelector("#beleg-qu").value;
    const link = quelle.match(/https?:\/\/www\.deutschestextarchiv\.de\/[^\s]+/);
    if (!link) {
      dialog.oeffnen({
        typ: "alert",
        text: "Kein DTA-Link gefunden.",
      });
      return;
    }
    window.scrollTo({
      left: 0,
      top: 0,
      behavior: "smooth",
    });
    document.querySelector("#beleg-import-dta").click();
    const dta = document.querySelector("#beleg-dta");
    dta.value = link[0];
    dta.dispatchEvent(new Event("input"));
    document.querySelector("#beleg-dta-bis").select();
  },

  // Belegtext um alle Absätze kürzen, die kein Stichwort enthalten
  toolsKuerzen () {
    // Absätze ermitteln, die das Wort enthalten
    const bs = document.querySelector("#beleg-bs");
    const textOri = bs.value;
    const text = textOri.split("\n\n");
    const wortVorhanden = [];
    for (let i = 0, len = text.length; i < len; i++) {
      if (liste.wortVorhanden(text[i])) {
        wortVorhanden.push(i);
      }
    }
    // gekürzten Text ermitteln
    const kurz = [];
    let kurzZuletzt = -1;
    const kontextErhalten = optionen.data.einstellungen["karteikarte-text-kuerzen-kontext"];
    for (let i = 0, len = text.length; i < len; i++) {
      if (wortVorhanden.includes(i) || // Stichwort vorhananden
          kontextErhalten && (wortVorhanden.includes(i - 1) || wortVorhanden.includes(i + 1))) { // Kontext erhalten
        kurz.push(text[i]);
        kurzZuletzt = i;
      } else if (i > 0 && i < len - 1 && kurzZuletzt === i - 1) { // Kürzungszeichen
        kurz.push("[[…]]" + seitenumbruch(text[i]));
      } else {
        const su = seitenumbruch(text[i]);
        if (su) {
          kurz[kurz.length - 1] = kurz[kurz.length - 1] + su;
        }
      }
    }
    function seitenumbruch (text) { // Seitenumbruch erhalten
      const reg = /\[:.+?:\]/;
      if (reg.test(text)) {
        return " " + text.match(reg)[0];
      }
      return "";
    }
    if (/\[\[…\]\]/.test(kurz[kurz.length - 1])) { // überflüssige Kürzung am Ende entfernen
      kurz.pop();
    }
    // gekürzten Text übernehmen
    const textKurz = kurz.join("\n\n");
    if (textOri !== textKurz) {
      beleg.data.bs = textKurz;
      bs.value = textKurz;
      helfer.textareaGrow(bs);
      beleg.belegGeaendert(true);
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
    const tools_beleg = document.querySelectorAll(".text-tools-beleg, .text-tools-bedeutung");
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
              !liste.wortVorhanden(text)) {
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
          if (/^(no|qu)$/.test(key)) {
            text = liste.linksErkennen(text);
          }
          if (key === "bs") {
            text = liste.belegWortHervorheben(text, true);
            text = liste.belegKlammernHervorheben({ text });
          }
        }
        nP.innerHTML = text;
        annotieren.init(nP);
      }
    }
    // Bedeutungen
    beleg.leseFillBedeutung();
    // Klick-Events an alles Links hängen
    document.querySelectorAll("#beleg .link").forEach(function (i) {
      helfer.externeLinks(i);
    });
  },

  // Bedeutungsfeld der Leseansicht füllen
  leseFillBedeutung () {
    const feldBd = beleg.bedeutungAufbereiten();
    const contBd = document.getElementById("beleg-lese-bd");
    contBd.replaceChildren();
    if (feldBd) {
      feldBd.split("\n").forEach(function (i) {
        const bd = beleg.bedeutungSuchen(i);
        const p = document.createElement("p");
        if (!bd.id) {
          i.split(": ").forEach(function (j) {
            const b = document.createElement("b");
            p.appendChild(b);
            b.textContent = "?";
            p.appendChild(document.createTextNode(j));
          });
        } else {
          p.innerHTML = bedeutungen.bedeutungenTief({
            gr: data.bd.gn,
            id: bd.id,
          });
        }
        const a = document.createElement("a");
        a.classList.add("icon-link", "icon-entfernen");
        a.dataset.bd = i;
        a.href = "#";
        beleg.leseBedeutungEx(a);
        p.insertBefore(a, p.firstChild);
        contBd.appendChild(p);
      });
    } else {
      const p = document.createElement("p");
      p.textContent = "\u00A0";
      contBd.appendChild(p);
    }
  },

  // Bedeutung in der Leseansicht aus dem Formular entfernen
  leseBedeutungEx (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Wert entfernen
      beleg.leseBedeutungExFeld(this.dataset.bd);
      // Ansicht auffrischen
      beleg.leseFillBedeutung();
      // Änderungsmarkierung setzen
      beleg.belegGeaendert(true);
      // ggf. Suche der Suchleiste erneut anstoßen (nur Neuaufbau)
      if (document.getElementById("suchleiste")) {
        suchleiste.suchen(true);
      }
    });
  },

  // Bedeutung aus dem Bedeutungsfeld entfernen
  // (wird auch anderweitig verwendet => darum ausgelagert)
  //   bd = String
  //     (die Bedeutung, in der Form, in der sie im Formularfeld stehen könnte)
  leseBedeutungExFeld (bd) {
    const reg = new RegExp(`${helfer.escapeRegExp(bd)}(\n|$)`);
    const feld = document.getElementById("beleg-bd");
    if (!reg.test(feld.value)) {
      return false; // den Rückgabewert braucht man für das Austragen aus dem Bedeutungsgerüst-Fenster heraus
    }
    feld.value = feld.value.replace(reg, "");
    feld.value = beleg.bedeutungAufbereiten();
    helfer.textareaGrow(feld);
    return true;
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

  // regulärer Ausdruck für den Sprung im Beleg-Formular
  ctrlSpringenFormReg: {
    reg: null,
    again: false,
  },

  // regulären Ausdruck für den Sprung im Beleg-Formular zurücksetzen
  ctrlSpringenFormReset () {
    const regs = [];
    for (const i of helfer.formVariRegExpRegs) {
      if (!data.fv[i.wort].tr) {
        regs.push(`(^|[${helfer.ganzesWortRegExp.links}])(${i.reg})($|[${helfer.ganzesWortRegExp.rechts}])`);
      } else {
        regs.push(`[^${helfer.ganzesWortRegExp.links}]*(${i.reg})[^${helfer.ganzesWortRegExp.rechts}]*`);
      }
    }
    beleg.ctrlSpringenFormReg.reg = new RegExp(regs.join("|"), "gi");
  },

  // <textarea> mit dem Belegtext zum Wort scrollen
  ctrlSpringenForm (evt) {
    if (evt) {
      evt.preventDefault();
    }
    const textarea = document.getElementById("beleg-bs");
    const val = textarea.value;
    const search = beleg.ctrlSpringenFormReg.reg.exec(val);
    if (search) { // Wort gefunden
      beleg.ctrlSpringenFormReg.again = false;
      const ende = search.index + search[0].length;
      textarea.scrollTop = 0;
      textarea.value = val.substring(0, ende);
      textarea.scrollTop = ende;
      textarea.value = val;
      if (textarea.scrollTop > 0) {
        textarea.scrollTop += 120;
      }
      textarea.setSelectionRange(search.index, ende);
      textarea.focus();
    } else if (beleg.ctrlSpringenFormReg.again) { // Wort zum wiederholten Mal nicht gefunden => Wort nicht im Belegtext (oder nicht auffindbar)
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
    } else { // Wort nicht gefunden => entweder nicht im Belegtext oder nicht von Index 0 aus gesucht => noch einmal suchen
      beleg.ctrlSpringenFormReg.again = true;
      beleg.ctrlSpringenForm(evt);
    }
  },

  // Kopiert den aktuellen Beleg in die Zwischenablage,
  // sodass er in eine andere Kartei kopiert werden kann
  //   dt = Object
  //     (das Datenobjekt, aus dem heraus der Beleg in die Zwischenablage kopiert werden soll)
  ctrlZwischenablage (dt) {
    const daten = kopieren.datenBeleg(dt);
    daten.typ = "ztb";
    daten.version = 2;
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
        callback: () => {
          fokus();
        },
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

  // typographische Aufbereitung des aktuellen Inhalts des Bedeutungsfeldes
  bedeutungAufbereiten () {
    return helfer.textTrim(document.getElementById("beleg-bd").value, true).replace(/::/g, ": ").replace(/\n\s*\n/g, "\n");
  },

  // sucht eine Bedeutung im Bedeutungsgerüst
  //   bd = String
  //     (die Bedeutung)
  //   gn = String | undefined
  //     (ID des Gerüsts, in dem gesucht werden soll)
  bedeutungSuchen (bd, gn = data.bd.gn) {
    let bdS = bd.split(": ");
    const bdA = data.bd.gr[gn].bd;
    // Alias ggf. durch vollen Bedeutungsstring ersetzen
    bdS = beleg.bedeutungAliasAufloesen(bdS, bdA);
    // Bedeutung suchen => ID zurückgeben
    const bdSJ = bdS.join(": ");
    for (let i = 0, len = bdA.length; i < len; i++) {
      if (bdA[i].bd.join(": ").replace(/<.+?>/g, "") === bdSJ) {
        return {
          idx: i,
          id: bdA[i].id,
        };
      }
    }
    // Bedeutung nicht gefunden (IDs beginnen mit 1)
    return {
      idx: -1,
      id: 0,
    };
  },

  // manuell eingetragene Bedeutung in den Bedeutungsbaum einhängen
  // (wird nur aufgerufen, wenn die Bedeutung noch nicht vorhanden ist)
  //   bd = String
  //     (die Bedeutung; Hierarchien getrennt durch ": ")
  //   gn = String | undefined
  //     (ID des Gerüsts, in dem gesucht werden soll)
  bedeutungErgaenzen (bd, gn = data.bd.gn) {
    // Zeiger auf das betreffende Gerüst ermitteln
    const gr = data.bd.gr[gn];
    // ggf. höchste ID ermitteln
    if (!bedeutungen.makeId) {
      let lastId = 0;
      gr.bd.forEach(function (i) {
        if (i.id > lastId) {
          lastId = i.id;
        }
      });
      bedeutungen.makeId = bedeutungen.idGenerator(lastId + 1);
    }
    // Alias ggf. durch vollen Bedeutungsstring ersetzen
    let bdS = bd.split(": ");
    bdS = beleg.bedeutungAliasAufloesen(bdS, gr.bd);
    // jetzt wird's kompliziert: korrekte Position der Bedeutung im Gerüst suchen
    let slice = 1;
    let arr = bdS.slice(0, slice);
    let arrVor = [];
    let arrTmpVor = [];
    let pos = -1; // der Index, an dessen Stelle das Einfügen beginnt
    // 1) Position (initial) und Slice finden
    for (let i = 0, len = gr.bd.length; i < len; i++) {
      const arrTmp = gr.bd[i].bd.slice(0, slice);
      if (arrTmp.join(": ") === arr.join(": ")) {
        pos = i;
        // passender Zweig gefunden
        if (slice === bdS.length) {
          // hier geht es nicht weiter
          break;
        } else {
          // weiter in die Tiefe wandern
          arrVor = [ ...arr ];
          arrTmpVor = [ ...arrTmp ];
          slice++;
          arr = bdS.slice(0, slice);
        }
      } else if (arrVor.join(": ") !== arrTmpVor.join(": ")) {
        // jetzt bin ich zu weit: ein neuer Zweig beginnt
        break;
      }
    }
    const bdAdd = bdS.slice(slice - 1);
    // 2) Position korrigieren (hoch zum Slot, an dessen Stelle eingefügt wird)
    if (pos === -1 || pos === gr.bd.length - 1) { // Sonderregel: die Bedeutung muss am Ende eingefügt werden
      pos = gr.bd.length;
    } else {
      let i = pos;
      const len = gr.bd.length;
      do { // diese Schleife muss mindestens einmal durchlaufen; darum keine gewöhnliche for-Schleife
        i++;
        if (!gr.bd[i] || gr.bd[i].bd.length <= arrVor.length) {
          pos = i;
          break;
        }
      } while (i < len);
    }
    // 3) jetzt kann eingehängt werden (die nachfolgenden Slots rutschen alle um einen hoch)
    for (let i = 0, len = bdAdd.length; i < len; i++) {
      const bd = arrVor.concat(bdAdd.slice(0, i + 1));
      gr.bd.splice(pos + i, 0, bedeutungen.konstitBedeutung(bd));
    }
    // Zählung auffrischen
    bedeutungen.konstitZaehlung(gr.bd, gr.sl);
    // ID zurückgeben
    return beleg.bedeutungSuchen(bd, gn);
  },

  // Alias durch vollen Bedeutungsstring ersetzen
  //   bdS = Array
  //     (in diesen Bedeutungen sollen die Aliasses aufgelöst werden)
  //   bdA = Array
  //     (in diesen Bedeutungen soll nach den Aliases gesucht werden)
  bedeutungAliasAufloesen (bdS, bdA) {
    for (let i = 0, len = bdS.length; i < len; i++) {
      for (let j = 0, len = bdA.length; j < len; j++) {
        if (bdS[i] === bdA[j].al) {
          bdS[i] = bdA[j].bd[bdA[j].bd.length - 1].replace(/<.+?>/g, "");
          break;
        }
      }
    }
    return bdS;
  },

  // trägt eine Bedeutung, die aus dem Bedeutungen-Fenster an das Hauptfenster geschickt wurde,
  // in einer oder mehreren Karten ein oder aus (Verteilerfunktion)
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  //   eintragen = Boolean
  //     (eintragen oder austragen)
  bedeutungEinAustragen (bd, eintragen) {
    // Overlay-Fenster ist offen => Abbruch
    if (overlay.oben()) {
      dialog.oeffnen({
        typ: "alert",
        text: `Bedeutungen können nur ${eintragen ? "eingetragen" : "ausgetragen"} werden, wenn Karteikarte oder Belegliste nicht durch andere Fenster verdeckt werden.`,
      });
      return;
    }
    // Ziel ermitteln
    if (helfer.hauptfunktion === "karte") {
      if (eintragen) {
        beleg.bedeutungEintragenKarte(bd);
      } else {
        beleg.bedeutungAustragenKarte(bd);
      }
      return;
    } else if (helfer.hauptfunktion === "liste") {
      if (eintragen) {
        beleg.bedeutungEintragenListe(bd);
      } else {
        beleg.bedeutungAustragenListe(bd);
      }
      return;
    }
    // unklar, wo eingetragen werden soll => Fehlermeldung
    dialog.oeffnen({
      typ: "alert",
      text: `Weder eine Karteikarte noch die Belegliste ist geöffnet.\nDie Bedeutung kann nur ${eintragen ? "eingetragen" : "ausgetragen"} werden, wenn eine der beiden Ansichten aktiv ist.`,
    });
  },

  // Bedeutung in eine einzelne Karteikarte eintragen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  bedeutungEintragenKarte (bd) {
    // nicht aktives Gerüst => einfach eintragen, wenn nicht vorhanden
    if (data.bd.gn !== bd.gr) {
      if (bedeutungen.schonVorhanden({
        bd: beleg.data.bd,
        gr: bd.gr,
        id: bd.id,
      })[0]) {
        dialog.oeffnen({
          typ: "alert",
          text: "Die Bedeutung wurde <strong>nicht</strong> eingetragen. Grund: Sie ist schon vorhanden.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
        });
        return;
      }
      beleg.data.bd.push({ ...bd });
      beleg.belegGeaendert(true);
      dialog.oeffnen({
        typ: "alert",
        text: "Die Bedeutung wurde eingetragen.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
      });
      return;
    }
    // aktives Gerüst => Text ermitteln und an die Dropdown-Funktion übergeben
    const text = bedeutungen.bedeutungenTief({
      gr: bd.gr,
      id: bd.id,
      za: false,
      strip: true,
    });
    dropdown.caller = "beleg-bd";
    dropdown.cursor = -1;
    dropdown.auswahl(document.getElementById("beleg-bd"), text);
  },

  // Bedeutung aus einer einzelneb Karteikarte entfernen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  bedeutungAustragenKarte (bd) {
    // nicht aktives Gerüst => einfach austragen, wenn vorhanden
    if (data.bd.gn !== bd.gr) {
      const vorhanden = bedeutungen.schonVorhanden({
        bd: beleg.data.bd,
        gr: bd.gr,
        id: bd.id,
      });
      if (vorhanden[0]) {
        beleg.data.bd.splice(vorhanden[1], 1);
        beleg.belegGeaendert(true);
        dialog.oeffnen({
          typ: "alert",
          text: "Die Bedeutung wurde entfernt.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
        });
        return;
      }
      dialog.oeffnen({
        typ: "alert",
        text: "Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.\n(In der Karteikarte wird ein anderes Gerüst angezeigt als im Bedeutungsgerüst-Fenster.)",
      });
      return;
    }
    // aktives Gerüst => Text ermitteln und entfernen
    const text = bedeutungen.bedeutungenTief({
      gr: bd.gr,
      id: bd.id,
      za: false,
      strip: true,
    });
    const ex = beleg.leseBedeutungExFeld(text);
    if (!ex) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Bedeutung wurde <strong>nicht</strong> entfernt. Grund: Sie ist der aktuellen Karteikarte überhaupt nicht zugeordnet.",
      });
      return;
    }
    beleg.belegGeaendert(true);
    if (beleg.leseansicht) {
      beleg.leseFillBedeutung();
    }
  },

  // Bedeutung in jede Karte der Belegliste eintragen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  bedeutungEintragenListe (bd) {
    const bdText = bedeutungen.bedeutungenTief({ gr: bd.gr, id: bd.id, zaCl: true });
    // keine Belege in der Liste
    if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum in keine Karteikarte eingetragen werden.`,
      });
      return;
    }
    // Sicherheitsfrage
    dialog.oeffnen({
      typ: "confirm",
      text: `Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich in alle Karteikarten, die derzeit in der Belegliste sichtbar sind, <strong>eingetragen</strong> werden?`,
      callback: () => {
        if (!dialog.antwort) {
          return;
        }
        // Bedeutung eintragen
        document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(function (i) {
          const id = i.dataset.id;
          if (!bedeutungen.schonVorhanden({
            bd: data.ka[id].bd,
            gr: bd.gr,
            id: bd.id,
          })[0]) {
            data.ka[id].bd.push({ ...bd });
            data.ka[id].dm = new Date().toISOString();
          }
        });
        kartei.karteiGeaendert(true);
        // Rückmeldung
        let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
        if (data.bd.gn === bd.gr) {
          geruest_inaktiv = "";
        }
        dialog.oeffnen({
          typ: "alert",
          text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in allen Karteikarten der Belegliste ergänzt.${geruest_inaktiv}`,
        });
        // Liste auffrischen
        if (!geruest_inaktiv) {
          liste.status(true);
        }
      },
    });
  },

  // Bedeutung aus jeder Karte der Belegliste entfernen
  //   bd = Object
  //     (die Bedeutung mit Gerüstnummer [bd.gr] und ID [bd.id])
  bedeutungAustragenListe (bd) {
    const bdText = bedeutungen.bedeutungenTief({ gr: bd.gr, id: bd.id, zaCl: true });
    // keine Belege in der Liste
    if (!document.querySelector("#liste-belege-cont .liste-kopf")) {
      dialog.oeffnen({
        typ: "alert",
        text: `Die Belegliste zeigt derzeit keine Belege an. Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nkann darum aus keiner Karteikarte entfernt werden.`,
      });
      return;
    }
    // Sicherheitsfrage
    dialog.oeffnen({
      typ: "confirm",
      text: `Soll die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwirklich aus allen Karteikarten, die derzeit in der Belegliste sichtbar sind, <strong>entfernt</strong> werden?`,
      callback: () => {
        if (!dialog.antwort) {
          return;
        }
        // Bedeutung eintragen
        let treffer = false;
        document.querySelectorAll("#liste-belege-cont .liste-kopf").forEach(function (i) {
          const id = i.dataset.id;
          const vorhanden = bedeutungen.schonVorhanden({
            bd: data.ka[id].bd,
            gr: bd.gr,
            id: bd.id,
          });
          if (vorhanden[0]) {
            data.ka[id].bd.splice(vorhanden[1], 1);
            data.ka[id].dm = new Date().toISOString();
            treffer = true;
          }
        });
        // Rückmeldung
        let geruest_inaktiv = "\n(Im Hauptfenster ist ein anderes Gerüst als im Bedeutungsgerüst-Fenster eingestellt.)";
        if (data.bd.gn === bd.gr) {
          geruest_inaktiv = "";
        }
        if (!treffer) {
          dialog.oeffnen({
            typ: "alert",
            text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde in keiner der Karteikarten in der aktuellen Belegliste gefunden.${geruest_inaktiv}`,
          });
          return;
        }
        dialog.oeffnen({
          typ: "alert",
          text: `Die Bedeutung\n<p class="bedeutungen-dialog">${bdText}</p>\nwurde aus allen Karteikarten der Belegliste entfernt.${geruest_inaktiv}`,
        });
        // Änderungsmarkierung
        kartei.karteiGeaendert(true);
        // Liste auffrischen
        if (!geruest_inaktiv) {
          liste.status(true);
        }
      },
    });
  },

  // Metadaten: füllen oder auffrischen
  metadaten () {
    const felder = [ "dc", "dm", "bi", "bx" ];
    for (const feld of felder) {
      const cont = document.querySelector(`#beleg-${feld}`);
      cont.replaceChildren();
      if (beleg.data[feld] && feld === "bx") {
        // Importdaten
        const pre = document.createElement("pre");
        cont.appendChild(pre);
        if (/^<.+>/.test(beleg.data.bx)) {
          const pretty = helferXml.prettyPrint({
            xmlStr: beleg.data[feld],
          });
          pre.innerHTML = pretty;
        } else {
          pre.textContent = beleg.data[feld];
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
  //   optionenSpeichern = Booleand
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

    // Importtyp ermitteln
    let bi = beleg.data.bi || "";
    if (!bi) {
      if (/@[a-z]+{/.test(beleg.data.bx)) {
        bi = "bibtex";
      } else if (/^<Beleg>/.test(beleg.data.bx)) {
        bi = "dwds";
      } else if (/^<Fundstelle /.test(beleg.data.bx)) {
        bi = "xml-fundstelle";
      } else if (/<mods /.test(beleg.data.bx)) {
        bi = "xml-mods";
      } else if (!/<.+>/.test(beleg.data.bx)) {
        bi = "dereko";
      }
    }
    if (!bi) {
      dialog.oeffnen({
        typ: "alert",
        text: "Der Importtyp konnte nicht ermittelt werden.",
      });
      return;
    }

    // Import neu anstoßen
    if (bi === "bibtex") {
      document.querySelector("#beleg-import-bibtex").click();
      belegImport.BibTeX(beleg.data.bx, "");
    } else if (bi === "dereko") {
      document.querySelector("#beleg-import-dereko").click();
      belegImport.DeReKo(beleg.data.bx, "", true);
    } else if (bi === "dwds") {
      document.querySelector("#beleg-import-dwds").click();
      const obj = {
        clipboard: beleg.data.bx,
        xml: new DOMParser().parseFromString(beleg.data.bx, "text/xml"),
      };
      belegImport.DWDS(obj, "");
    } else if (/^xml/.test(bi)) {
      document.querySelector("#beleg-import-xml").click();
      belegImport.XML(beleg.data.bx, "");
    }
  },
};
