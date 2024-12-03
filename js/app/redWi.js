"use strict";

const redWi = {
  // Selector für aktive Input-Felder
  inputs: "#red-wi-text:not(.aus) input, #red-wi-intern:not(.aus) input, #red-wi-extern:not(.aus) input",

  // Dropdown: Feldtypen
  dropdown: {
    vt: [ "Wortbildung", "Wortverbindung", "Wortfeld", "Wortfeldartikel" ],
    lt: [ "Textverweis", "Verweis intern", "Verweis extern" ],
    se: [ "Cluster", "Synonym", "Heteronym", "Paronym", "Hyponym", "Hyperonym", "Meronym", "Holonym", "Gegensatz", "Kohyponym" ],
  },

  // Dropdown: Verweistextvorschläge sammeln
  dropdownVerweistexte () {
    const lemmata = helfer.lemmaliste();
    const gn = document.getElementById("red-wi-gn").value.match(/[0-9]+/)[0];
    const set = new Set();
    const felder = [ "sy", "bl" ]; // Synonmye und Wortbildungen
    for (const id of Object.keys(data.ka)) {
      for (const feld of felder) {
        const daten = data.ka[id][feld];
        if (!daten) {
          continue;
        }
        for (const i of daten.split("\n")) { // Mehrzeiligkeit möglich
          let wort = i;
          if (/: /.test(i)) { // Hierarchieebenen möglich
            const sp = i.split(": ");
            wort = sp[sp.length - 1];
          }
          if (!lemmata.has(wort) &&
              !data.rd.wi.some(i => i.gn === gn && i.tx === wort)) {
            set.add(wort);
          }
        }
      }
    }
    for (const wort of Object.keys(data.fv)) { // Formvarianten
      if (!lemmata.has(wort) &&
          !data.rd.wi.some(i => i.gn === gn && i.tx === wort)) {
        set.add(wort);
      }
    }
    return [ ...set ].sort(helfer.sortAlpha);
  },

  // Wortinformationenfenster öffnen
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Redaktion &gt; Wortinformationen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("red-wi");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // Fix: in ZT v0.41.0 (2020-06-30) wurde vergessen, die Datenstruktur
    // bei neuen Dateien zu initialisieren
    if (!data.rd.wi) {
      data.rd.wi = [];
    }
    // Formular initialisieren/Content aufbauen
    redWi.formInit();
    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("red-wi-cont-over"),
    });
  },

  // Formular: Listener für die Textfelder
  //   input = Element
  //     (ein Textfeld im Formular)
  formListener ({ input }) {
    if (input.id === "red-wi-gn") {
      input.addEventListener("input", () => redWi.contMake());
    } else if (input.id === "red-wi-lt") {
      input.addEventListener("input", () => {
        const tx = document.querySelectorAll(redWi.inputs)[0].value;
        redWi.formToggle();
        redWi.formReset();
        document.querySelectorAll(redWi.inputs)[0].value = tx;
      });
    }
    if (input.type === "text") {
      input.addEventListener("keydown", function (evt) {
        tastatur.detectModifiers(evt);
        if (!tastatur.modifiers &&
            evt.key === "Enter" &&
            !document.getElementById("dropdown")) {
          if (this.closest("#red-wi-form")) {
            redWi.formEval();
          } else {
            redWi.kopieren();
          }
        }
      });
    } else if (input.type === "button") {
      input.addEventListener("click", function () {
        if (/speichern$/.test(this.id)) {
          redWi.formEval();
        } else if (/reset$/.test(this.id)) {
          redWi.formInit();
        } else if (/kopieren$/.test(this.id)) {
          redWi.kopieren();
        }
      });
    }
  },

  // Formular: Formular umstellen
  formToggle () {
    const lt = document.getElementById("red-wi-lt").value;
    const text = document.getElementById("red-wi-text");
    const intern = document.getElementById("red-wi-intern");
    const extern = document.getElementById("red-wi-extern");
    switch (lt) {
      case "Textverweis":
        text.classList.remove("aus");
        intern.classList.add("aus");
        extern.classList.add("aus");
        break;
      case "Verweis intern":
        text.classList.add("aus");
        intern.classList.remove("aus");
        extern.classList.add("aus");
        break;
      case "Verweis extern":
        text.classList.add("aus");
        intern.classList.add("aus");
        extern.classList.remove("aus");
        break;
    }
    const inputs = document.querySelectorAll(redWi.inputs);
    inputs[0].focus();
  },

  // Formular: Fenster initialisieren
  formInit () {
    const gn = document.getElementById("red-wi-gn");
    gn.value = "Gerüst 1";
    const vt = document.getElementById("red-wi-vt");
    vt.value = redWi.dropdown.vt[0];
    const lt = document.getElementById("red-wi-lt");
    lt.value = redWi.dropdown.lt[0];
    redWi.formToggle();
    redWi.formReset();
    redWi.contMake();
  },

  // Formular: Felder zurücksetzen
  formReset () {
    const inputs = document.querySelectorAll(redWi.inputs);
    for (const i of inputs) {
      i.value = "";
    }
    if (document.getElementById("red-wi-lt").value === "Verweis extern") {
      inputs[2].value = new Date().toISOString().split("T")[0];
    }
    inputs[0].focus();
  },

  // Formular: Eingabe überprüfen und Datensatz erstellen
  async formEval () {
    // kurz warten, sonst verschwinden Meldungen sofort wieder
    await new Promise(resolve => setTimeout(() => resolve(true), 25));
    // Datensatz vorbereiten
    const lt = document.getElementById("red-wi-lt");
    const ds = {
      gn: document.getElementById("red-wi-gn").value.match(/[0-9]+/)[0],
      lt: lt.value,
      tx: "",
      vt: document.getElementById("red-wi-vt").value,
      xl: "",
    };
    // illegaler Linktyp bei Wortfeldartikel?
    if (ds.vt === "Wortfeldartikel" && ds.lt !== "Verweis intern") {
      dialog.oeffnen({
        typ: "alert",
        text: "Für den Verweistyp <i>Wortfeldartikel</i> sind nur interne Verweise zulässig.",
        callback: () => lt.focus(),
      });
      return;
    }
    // Verweistext eingegeben?
    // (wird für alle Formulare gebraucht)
    const inputs = document.querySelectorAll(redWi.inputs);
    const txVal = helfer.textTrim(inputs[0].value, true);
    if (!txVal) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keinen Verweistext eingegeben.",
        callback: () => inputs[0].select(),
      });
      return;
    }
    ds.tx = txVal;
    // Daten sammeln und überprüfen
    const text = document.getElementById("red-wi-text");
    const intern = document.getElementById("red-wi-intern");
    const extern = document.getElementById("red-wi-extern");
    // Daten sammeln und überprüfen
    if (!text.classList.contains("aus")) {
      // Überprüfungen Textverweis
      const id = text.querySelector('input[id$="id"]');
      let idVal = helfer.textTrim(id.value, true);
      if (!idVal) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben keine ID eingegeben.",
          callback: () => id.select(),
        });
        return;
      }
      idVal = helferXml.normId({
        id: idVal,
        input: id,
      });
      const typ = checkSemantik(text);
      if (typ === false) {
        return;
      }
      // XML erstellen
      ds.xl = `<Textreferenz Ziel="${idVal}"${typ}>${txVal}</Textreferenz>`;
    } else if (!intern.classList.contains("aus")) {
      // Überprüfungen Verweis intern
      const zl = intern.querySelector('input[id$="zl"]');
      let zlVal = helfer.textTrim(zl.value, true);
      if (!zlVal) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben kein Verweisziel eingegeben.",
          callback: () => zl.select(),
        });
        return;
      }
      const typ = checkSemantik(intern);
      if (typ === false) {
        return;
      }
      // XML erstellen
      ds.xl = `<Verweis${typ}>\n`;
      if (txVal === zlVal) {
        ds.xl += "  <Verweistext/>\n";
      } else {
        ds.xl += `  <Verweistext>${txVal}</Verweistext>\n`;
      }
      const zlValSp = zlVal.split("#");
      zlVal = zlValSp[0].replace(/_/g, " ");
      if (zlValSp[1]) {
        zlVal += "#" + zlValSp[1];
      }
      ds.xl += `  <Verweisziel>${zlVal}</Verweisziel>\n`;
      ds.xl += "</Verweis>";
    } else if (!extern.classList.contains("aus")) {
      // Überprüfungen Verweis extern
      const ul = extern.querySelector('input[id$="ul"]');
      const ulVal = helfer.textTrim(ul.value, true);
      if (!ulVal) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben keine URL eingegeben.",
          callback: () => ul.select(),
        });
        return;
      }
      if (/\s/.test(ulVal) || !/^https?:\/\//.test(ulVal)) {
        dialog.oeffnen({
          typ: "alert",
          text: "Die URL ist ungültig.",
          callback: () => ul.select(),
        });
        return;
      }
      const da = extern.querySelector('input[id$="da"]');
      const daVal = da.value;
      if (!daVal) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben kein Aufrufdatum angegeben.",
          callback: () => da.select(),
        });
        return;
      }
      // XML erstellen
      const datum = /^(?<jahr>[0-9]{4})-(?<monat>[0-9]{2})-(?<tag>[0-9]{2})$/.exec(daVal);
      ds.xl = "<Verweis_extern>\n";
      ds.xl += `  <Verweistext>${txVal}</Verweistext>\n`;
      ds.xl += "  <Verweisziel/>\n";
      ds.xl += "  <Fundstelle>\n";
      ds.xl += `    <Fundort>${helferXml.fundort({ url: ulVal })}</Fundort>\n`;
      ds.xl += `    <URL>${ulVal}</URL>\n`;
      ds.xl += `    <Aufrufdatum>${datum.groups.tag}.${datum.groups.monat}.${datum.groups.jahr}</Aufrufdatum>\n`;
      ds.xl += "  </Fundstelle>\n";
      ds.xl += "</Verweis_extern>";
    }
    // Eingabe speichern
    redWi.formSpeichern({ ds });
    // semantischen Typ überprüfen, ggf. als Attribut zurückgeben
    function checkSemantik (lt) {
      const se = lt.querySelector('input[id$="se"]');
      const seVal = helfer.textTrim(se.value, true);
      if (seVal && !redWi.dropdown.se.includes(seVal)) {
        dialog.oeffnen({
          typ: "alert",
          text: `Die semantische Typisierung als „${seVal}“ ist unzulässig.`,
          callback: () => se.select(),
        });
        return false;
      }
      let typ = "";
      if (seVal) {
        typ = ` Typ="${seVal}"`;
      }
      return typ;
    }
  },

  // Formular: Eingabe speichern
  //   ds = Object
  //     (Datensatz, der gespeichert werden soll)
  formSpeichern ({ ds }) {
    // Datensatz einhängen/überschreiben
    const idx = data.rd.wi.findIndex(i => i.gn === ds.gn && i.vt === ds.vt && i.tx === ds.tx);
    if (idx > -1) {
      data.rd.wi[idx] = ds;
    } else {
      data.rd.wi.push(ds);
    }
    // Datensätze sortieren
    data.rd.wi.sort(helfer.sortWi);
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
    // Formular zurücksetzen
    redWi.formReset();
    // Anzeige neu aufbauen
    redWi.contMake();
    // Wort highlighten
    const wort = document.querySelector(`#red-wi-cont [data-vt="${ds.vt}"][data-tx="${ds.tx}"]`);
    setTimeout(() => wort.classList.add("update"), 0);
    setTimeout(() => wort.classList.remove("update"), 750);
  },

  // Content: Anzeige aufbauen
  contMake () {
    const cont = document.querySelector("#red-wi-cont div");
    const copy = document.getElementById("red-wi-copy");
    const gn = document.getElementById("red-wi-gn").value.match(/[0-9]+/)[0];
    // keine Wortinformationen vorhanden oder
    // keine zum eingestellten Bedeutungsgerüst passenden Wortinformationen
    if (!data.rd.wi.length ||
        !data.rd.wi.some(i => i.gn === gn)) {
      if (data.rd.wi.length) {
        redWi.kopierenGn = gn;
        const gerueste = redWi.kopierenDropdown();
        document.getElementById("red-wi-copy-gn").value = gerueste[0];
        copy.classList.remove("aus");
      }
      cont.parentNode.classList.add("aus");
      return;
    }
    // Wortinformationen aufbauen
    cont.parentNode.classList.remove("aus");
    copy.classList.add("aus");
    cont.replaceChildren();
    const hTxt = {
      Wortverbindung: "Wortverbindungen",
      Wortbildung: "Wortbildungen",
      Wortfeld: "Wortfeld",
      Wortfeldartikel: "Wortfeldartikel",
    };
    let h = "";
    for (const i of data.rd.wi) {
      // falsches Bedeutungsgerüst
      if (i.gn !== gn) {
        continue;
      }
      // Überschrift
      if (h !== i.vt) {
        const h3 = document.createElement("h3");
        cont.appendChild(h3);
        h3.textContent = hTxt[i.vt];
        h = i.vt;
      }
      // Eintrag
      const p = document.createElement("p");
      cont.appendChild(p);
      p.dataset.gn = i.gn;
      p.dataset.vt = i.vt;
      p.dataset.tx = i.tx;
      // Lösch-Icon
      const a = document.createElement("a");
      p.appendChild(a);
      a.classList.add("icon-link", "icon-x-dick");
      a.href = "#";
      redWi.contLoeschen({ a });
      // XML-Icon
      const xl = document.createElement("a");
      p.appendChild(xl);
      xl.classList.add("icon-link", "icon-xml");
      xl.href = "#";
      redWi.contXml({ a: xl });
      // Verweistext
      const text = document.createElement("span");
      p.appendChild(text);
      text.classList.add("text");
      text.appendChild(document.createTextNode(i.tx));
      // Detail
      const detail = document.createElement("span");
      p.appendChild(detail);
      detail.classList.add("detail");
      detail.textContent = `(${i.lt})`;
      redWi.contBearbeiten({ p });
    }
  },

  // Content: Eintrag bearbeiten
  //   p = Element
  //    (Eintrag)
  contBearbeiten ({ p }) {
    p.addEventListener("click", function () {
      const gn = this.dataset.gn;
      const vt = this.dataset.vt;
      const tx = this.dataset.tx;
      const ds = data.rd.wi.find(i => i.gn === gn && i.vt === vt && i.tx === tx);
      document.getElementById("red-wi-vt").value = ds.vt;
      const lt = document.getElementById("red-wi-lt");
      lt.value = ds.lt;
      lt.dispatchEvent(new Event("input"));
      const inputs = document.querySelectorAll(redWi.inputs);
      inputs[0].value = tx;
      if (/^<Textreferenz/.test(ds.xl)) {
        inputs[1].value = ds.xl.match(/Ziel="(.+?)"/)[1];
        seVal();
      } else if (/^<Verweis_extern>/.test(ds.xl)) {
        inputs[1].value = ds.xl.match(/<URL>(.+?)<\/URL>/)[1];
        const da = ds.xl.match(/<Aufrufdatum>(.+?)<\/Aufrufdatum>/)[1];
        const datum = /^(?<tag>[0-9]{2})\.(?<monat>[0-9]{2})\.(?<jahr>[0-9]{4})$/.exec(da);
        inputs[2].value = `${datum.groups.jahr}-${datum.groups.monat}-${datum.groups.tag}`;
      } else {
        inputs[1].value = ds.xl.match(/<Verweisziel>(.+?)<\/Verweisziel>/)[1];
        seVal();
      }
      inputs[0].select();
      // semantischen Verweistyp ermitteln
      function seVal () {
        const se = ds.xl.match(/Typ="(.+?)"/);
        inputs[2].value = se ? se[1] : "";
      }
    });
  },

  // Content: Eintrag löschen
  //   a = Element
  //     (Lösch-Icon)
  contLoeschen ({ a }) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      const gn = this.closest("p").dataset.gn;
      const vt = this.closest("p").dataset.vt;
      const tx = this.closest("p").dataset.tx;
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll „${tx}“ wirklich gelöscht werden?`,
        callback: () => {
          if (dialog.antwort) {
            const idx = data.rd.wi.findIndex(i => i.gn === gn && i.vt === vt && i.tx === tx);
            data.rd.wi.splice(idx, 1);
            kartei.karteiGeaendert(true);
            redWi.contMake();
          }
        },
      });
    });
  },

  // Verweis an das Redaktionssystem schicken
  //   a = Element
  //     (XML-Icon)
  contXml ({ a }) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      const gn = this.closest("p").dataset.gn;
      const vt = this.closest("p").dataset.vt;
      const tx = this.closest("p").dataset.tx;
      const xmlDatensatz = {
        key: "wi-single",
        gn,
        ds: data.rd.wi.find(i => i.gn === gn && i.vt === vt && i.tx === tx),
      };
      redXml.datensatz({ xmlDatensatz });
    });
  },

  // Kopieren: speichert die aktuelle Gerüst-ID
  // (wenn das Kopieren-Formular angezeigt wird)
  kopierenGn: "",

  // Kopieren: ermittelt Gerüste, die Content haben
  kopierenDropdown () {
    let gerueste = [];
    for (const i of data.rd.wi) {
      if (i.gn !== redWi.kopierenGn) {
        gerueste.push(i.gn);
      }
    }
    gerueste = [ ...new Set([ ...gerueste ]) ];
    gerueste.sort();
    for (let i = 0, len = gerueste.length; i < len; i++) {
      gerueste[i] = `Gerüst ${gerueste[i]}`;
    }
    return gerueste;
  },

  // Kopieren: für das Kopieren der Wortinformationen aus
  kopieren () {
    const gn = document.getElementById("red-wi-copy-gn").value.match(/[0-9]+/)[0];
    // Datensätze kopieren
    const wi = [];
    for (const i of data.rd.wi) {
      if (i.gn === gn) {
        const ds = { ...i };
        ds.gn = redWi.kopierenGn;
        wi.push(ds);
      }
    }
    data.rd.wi = data.rd.wi.concat(wi);
    // Datensätze sortieren
    data.rd.wi.sort(helfer.sortWi);
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
    // Anzeige neu aufbauen
    redWi.contMake();
  },

  // Wortinformationen an das Redaktionssystem schicken
  //   icon = Element
  //     (das XML-Icon)
  xml ({ icon }) {
    icon.addEventListener("click", evt => {
      evt.preventDefault();
      const gn = document.getElementById("red-wi-gn").value.match(/[0-9]+/)[0];
      const xmlDatensatz = {
        key: "wi",
        gn,
        ds: data.rd.wi.filter(i => i.gn === gn),
      };
      if (!xmlDatensatz.ds.length) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben noch keine Wortinformationen eingegeben.",
        });
        return;
      }
      redXml.datensatz({ xmlDatensatz });
    });
  },
};
