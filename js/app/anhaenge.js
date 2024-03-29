"use strict";

const anhaenge = {
  // hier stehen Details zu den einzelnen Anhängen (s. anhaenge.scan())
  data: {},

  // scannt die übergebenen Anhänge und trägt das Ergebnis
  // in anhaenge.data ein
  //   an = Array | String
  //     (Anhang oder Liste von Anhängen, die gescannt werden sollen)
  async scan (an) {
    if (Array.isArray(an)) {
      for (const i of an) {
        await scannen(i);
      }
    } else {
      await scannen(an);
    }
    // Scannfunktion
    async function scannen (datei) {
      // schon gescannt
      if (anhaenge.data[datei]) {
        return;
      }
      // scannen
      let pfad = datei;
      if (!modules.path.isAbsolute(datei)) {
        pfad = `${modules.path.parse(kartei.pfad).dir}${modules.path.sep}${datei}`;
      }
      const exists = await helfer.exists(pfad);
      anhaenge.data[datei] = {
        exists,
        path: pfad,
        ext: modules.path.parse(pfad).ext.toLowerCase(),
      };
    }
  },

  // ermittelt das Array, in dem die aufzulistenden Anhänge zu finden sind
  //   obj = String
  //     (String mit Angaben zu dem Objekt; dieser muss in einen echten Verweis
  //     umgewandelt werden)
  getArr (obj) {
    const obj_split = obj.split("|");
    let arr = {};
    if (obj_split[0] === "data") {
      arr = data;
    } else if (obj_split[0] === "beleg") {
      arr = beleg;
    }
    for (let i = 1, len = obj_split.length; i < len; i++) {
      arr = arr[obj_split[i]];
    }
    return arr;
  },

  // Liste mit Icon-Typen
  iconTypen: {
    ".doc": "datei-doc.svg",
    ".docx": "datei-doc.svg",
    ".gif": "datei-img.svg",
    ".gz": "datei-archiv.svg",
    ".htm": "datei-html.svg",
    ".html": "datei-html.svg",
    ".jpeg": "datei-img.svg",
    ".jpg": "datei-img.svg",
    ".odp": "datei-praes.svg",
    ".odt": "datei-doc.svg",
    ".pdf": "datei-pdf.svg",
    ".png": "datei-img.svg",
    ".ppt": "datei-praes.svg",
    ".pptx": "datei-praes.svg",
    ".rar": "datei-archiv.svg",
    ".rtf": "datei-doc.svg",
    ".svg": "datei-img.svg",
    ".txt": "datei-txt.svg",
    ".ztj": "datei-ztj.svg",
    ".xml": "datei-xml.svg",
    ".zip": "datei-archiv.svg",
  },

  // passendes Icon zum Anhang ermitteln
  //   an = string
  //     (Datei, wie sie sich in anhaenge.data findet)
  getIcon (an) {
    if (!anhaenge.data[an].exists) {
      return "img/datei-x.svg";
    }
    if (anhaenge.iconTypen[anhaenge.data[an].ext]) {
      return `img/${anhaenge.iconTypen[anhaenge.data[an].ext]}`;
    }
    return "img/datei.svg";
  },

  // Liste von Icons erstellen, die einzeln angeklickt werden können
  //   arr = Array | null
  //     (Array mit allen Dateien, für die Icons erstellt werden sollen;
  //     steht der Wert auf null, soll nur die Liste gelöscht werden)
  //   ziel = Element
  //     (Element, in das die Iconliste eingetragen werden soll)
  //   scan = true | undefined
  //     (die übergebene Anhängeliste sollte zunächst gescannt werden)
  async makeIconList (arr, ziel, scan = false) {
    ziel.replaceChildren();
    if (!arr) {
      return;
    }
    if (scan) {
      await anhaenge.scan(arr);
    }
    arr.forEach(function (i) {
      const img = document.createElement("img");
      img.dataset.datei = i;
      img.src = anhaenge.getIcon(i);
      img.width = "24";
      img.height = "24";
      img.title = i;
      anhaenge.oeffnenListener(img);
      ziel.appendChild(img);
    });
    tooltip.init(ziel);
    if (ziel.id === "kartei-anhaenge") {
      kopf.icons();
    }
  },

  // Anhänge-Fenster einblenden
  async fenster () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Anhänge</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("anhaenge");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // Maximalhöhe der Anhängeliste festlegen
    helfer.elementMaxHeight({
      ele: document.getElementById("anhaenge-cont"),
    });
    // Anhänge der Kartei auflisten
    const cont = document.getElementById("anhaenge-cont");
    await anhaenge.auflisten(cont, "data|an");
    // Anhänge der Belege auflisten
    anhaenge.auflistenBelege(cont);
  },

  // Anhänge auflisten
  //   cont = Element
  //     (Container, in dem die Liste erzeugt werden soll)
  //   obj = String
  //     (verweist auf das Objekt, in dem die Anhänge gespeichert werden;
  //     Werte durch Haarstrich getrennt)
  //   leeren = false | undefined
  //     (der Content soll geleert werden)
  async auflisten (cont, obj, leeren = true) {
    // Content leeren
    // (im Anhänge-Fenster darf dies nur beim kompletten Neuaufbau der Liste geschehen)
    if (leeren) {
      cont.replaceChildren();
    }
    // abbrechen, wenn keine Anhänge vorhanden sind
    const arr = anhaenge.getArr(obj);
    if (!arr.length) {
      return;
    }
    await anhaenge.scan(arr);
    // Anhänge auflisten
    arr.forEach(function (i, n) {
      const div = document.createElement("div");
      div.classList.add("anhaenge-item");
      div.dataset.obj = obj;
      div.dataset.datei = i;
      anhaenge.oeffnenListener(div);
      // Icon
      const icon = document.createElement("img");
      icon.src = anhaenge.getIcon(i);
      icon.width = "24";
      icon.height = "24";
      div.appendChild(icon);
      // Datei
      const datei = `\u200E${i}\u200E`; // vgl. den Sermon in meta.oeffnen()
      const span = document.createElement("span");
      span.classList.add("anhaenge-datei");
      span.setAttribute("dir", "rtl");
      span.textContent = datei;
      span.title = datei;
      div.appendChild(span);
      // aufwärts
      if (n > 0) {
        const up = document.createElement("a");
        up.classList.add("icon-link", "anhaenge-aufwaerts");
        up.href = "#";
        up.textContent = "\u00A0";
        anhaenge.sortieren(up);
        div.appendChild(up);
      } else {
        const span = document.createElement("span");
        span.classList.add("anhaenge-platzhalter");
        span.textContent = "\u00A0";
        div.appendChild(span);
      }
      // Löschen
      const del = document.createElement("a");
      del.classList.add("icon-link", "anhaenge-loeschen");
      del.href = "#";
      del.textContent = "\u00A0";
      anhaenge.loeschen(del);
      div.appendChild(del);
      // <div> einhängen
      cont.appendChild(div);
    });
    tooltip.init(cont);
  },

  // Anhänge der Belege im Anhänge-Fenster auflisten
  async auflistenBelege (cont) {
    for (const [ id, val ] of Object.entries(data.ka)) {
      // Anhänge vorhanden?
      if (!val.an.length) {
        continue;
      }
      // Anhänge drucken
      const h3 = document.createElement("h3");
      h3.textContent = liste.detailAnzeigenH3(id);
      h3.dataset.id = id;
      anhaenge.belegOeffnen(h3);
      cont.appendChild(h3);
      await anhaenge.auflisten(cont, `data|ka|${id}|an`, false);
    }
  },

  // Öffnet einen Anhang
  //   item = Element
  //     (der <div> oder <img>, auf den/das geklickt wurde)
  oeffnenListener (item) {
    item.addEventListener("click", function (evt) {
      if (evt.detail > 1) { // Doppelklicks abfangen
        return;
      }
      anhaenge.oeffnen(this.dataset.datei);
    });
  },

  // Öffnet die übergebene Datei
  //   datei = "String"
  //     (Datei, die geöffnet werden soll)
  //   ordner = true | undefined
  //     (Dateiordner im Filemanager öffnen)
  async oeffnen (datei, ordner = false) {
    if (!anhaenge.data[datei].exists) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Datei konnte nicht gefunden werden.",
      });
      return;
    }
    const pfad = anhaenge.data[datei].path;
    if (ordner) {
      modules.shell.showItemInFolder(pfad);
    } else {
      const err = await modules.shell.openPath(pfad);
      if (err) {
        dialog.oeffnen({
          typ: "alert",
          text: `Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err}</p>`,
        });
      }
    }
  },

  // Öffnen der Karteikarte durch Klick auf eine Überschrift im Anhänge-Fenster (Listener)
  // (wird auch in kopieren.js benutzt)
  //   ele = Element
  //     (die Überschrift, auf die geklickt wurde)
  belegOeffnen (ele) {
    ele.addEventListener("click", function (evt) {
      evt.preventDefault();
      const id = this.dataset.id;
      speichern.checkInit(async () => {
        await overlay.alleSchliessen();
        beleg.oeffnen(id);
      });
    });
  },

  // Sortiert den Anhang um eine Position nach oben
  //   item = Element
  //     (der Icon-Link, auf den geklickt wurde)
  sortieren (item) {
    item.addEventListener("click", async function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      let obj = this.parentNode.dataset.obj;
      const cont = this.parentNode.parentNode;
      const datei = this.parentNode.dataset.datei;
      const arr = anhaenge.getArr(obj);
      const idx = arr.indexOf(datei);
      // umsortieren
      arr.splice(idx, 1);
      arr.splice(idx - 1, 0, datei);
      // Änderungsmarkierung
      anhaenge.geaendert(cont);
      // ggf. Änderungsdatum und Anhängeliste der Karteikarte auffrischen
      if (/^data\|ka/.test(obj)) {
        const id = obj.split("|")[2];
        if (beleg.id_karte === parseInt(id, 10) &&
            helfer.hauptfunktion === "karte") {
          beleg.data.an = [ ...arr ];
          anhaenge.auflisten(document.getElementById("beleg-an"), "beleg|data|an");
          beleg.belegGeaendert(true);
        } else {
          data.ka[id].dm = new Date().toISOString();
        }
      }
      // Liste der Anhänge neu aufbauen
      if (cont.dataset.anhaenge === "kartei") { // sonst erscheinen die Anhänge des Belegs an der Stelle, an der die Anhänge der Kartei sein sollten
        obj = "data|an";
      }
      await anhaenge.auflisten(cont, obj);
      // ggf. Liste der Anhänge in den Belegen neu aufbauen
      if (cont.dataset.anhaenge === "kartei") {
        anhaenge.auflistenBelege(cont);
      }
      // ggf. Pfeil-Icon fokussieren
      const pfeil = cont.querySelector(`[data-datei="${datei}"] .anhaenge-aufwaerts`);
      if (pfeil) {
        pfeil.focus();
      }
    });
  },

  // Löscht einen Anhang aus der Liste
  //   item = Element
  //     (der Icon-Link, auf den geklickt wurde)
  loeschen (item) {
    item.addEventListener("click", function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      let obj = this.parentNode.dataset.obj;
      const cont = this.parentNode.parentNode;
      const datei = this.parentNode.dataset.datei;
      const arr = anhaenge.getArr(obj);
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll die folgende Datei wirklich aus der Liste entfernt werden?\n<p class="force-wrap">•\u00A0${datei}</p>`,
        callback: async () => {
          if (!dialog.antwort) {
            return;
          }
          arr.splice(arr.indexOf(datei), 1);
          // Änderungsmarkierung
          anhaenge.geaendert(cont);
          // ggf. Änderungsdatum und Anhängeliste der Karteikarte auffrischen
          if (/^data\|ka/.test(obj)) {
            const id = obj.split("|")[2];
            if (beleg.id_karte === parseInt(id, 10) &&
                helfer.hauptfunktion === "karte") {
              beleg.data.an = [ ...arr ];
              anhaenge.auflisten(document.getElementById("beleg-an"), "beleg|data|an");
              beleg.belegGeaendert(true);
            } else {
              data.ka[id].dm = new Date().toISOString();
            }
          }
          // Liste der Anhänge neu aufbauen
          if (cont.dataset.anhaenge === "kartei") { // sonst erscheinen die Anhänge des Belegs an der Stelle, an der die Anhänge der Kartei sein sollten
            obj = "data|an";
          }
          await anhaenge.auflisten(cont, obj);
          // ggf. Liste der Anhänge in den Belegen neu aufbauen
          if (cont.dataset.anhaenge === "kartei") {
            anhaenge.auflistenBelege(cont);
          }
          // Erinnerungen auffrischen
          erinnerungen.check();
        },
      });
    });
  },

  // Anhang hinzufügen
  //   input = Element
  //     (Add-Button zum Hinzufügen von Anhängen)
  add (input) {
    if (input.value === "Auto-Ergänzen") {
      input.addEventListener("click", () => anhaenge.addAuto({ fenster: true }));
      return;
    }
    input.addEventListener("click", async function () {
      // Optionen für Dateidialog
      const opt = {
        title: "Anhang hinzufügen",
        defaultPath: appInfo.documents,
        filters: [
          {
            name: "Alle Dateien",
            extensions: [ "*" ],
          },
        ],
        properties: [
          "multiSelections",
          "openFile",
        ],
      };
      // Wo wurde zuletzt eine Datei gespeichert oder geöffnet?
      if (optionen.data.letzter_pfad) {
        opt.defaultPath = optionen.data.letzter_pfad;
      }
      // Dialog anzeigen
      const result = await modules.ipc.invoke("datei-dialog", {
        open: true,
        winId: winInfo.winId,
        opt,
      });
      // Fehler oder keine Datei ausgewählt
      if (result.message || !Object.keys(result).length) {
        dialog.oeffnen({
          typ: "alert",
          text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
        });
        return;
      } else if (result.canceled) {
        return;
      }
      // Datei ausgewählt
      const obj = this.dataset.obj;
      const cont = this.parentNode.parentNode.querySelector("div");
      anhaenge.addFiles(result.filePaths, cont, obj);
    });
  },

  // Dateien ggf. hinzufügen
  //   dateien = Array
  //     (enthält eine Liste der Dateien, die hinzugefügt werden sollen)
  //   cont = Element
  //     (Container der den Add-Button und die Liste der Anhänge enthält)
  //   obj = String
  //     (Angaben über das Array, dem die Dateien hinzugefügt werden sollen
  //     Werte durch Haarstriche getrennt)
  async addFiles (dateien, cont, obj) {
    // Dateien hinzufügen
    const reg_pfad = new RegExp(helfer.escapeRegExp(`${modules.path.dirname(kartei.pfad)}${modules.path.sep}`));
    const schon = [];
    const arr = anhaenge.getArr(obj);
    for (const i of dateien) {
      const datei = i.replace(reg_pfad, "");
      if (arr.includes(datei)) {
        schon.push(`•\u00A0${datei}`);
        continue;
      }
      await anhaenge.scan(datei);
      arr.push(datei);
    }
    // melden, wenn Dateien schon im Array sind
    if (schon.length) {
      let numerus = "folgende Datei war";
      if (schon.length > 1) {
        numerus = "folgenden Dateien waren";
      }
      dialog.oeffnen({
        typ: "alert",
        text: `Die ${numerus} schon angehängt:\n${schon.join("<br>")}`,
      });
    }
    // Abbruch, wenn keine neuen Dateien hinzugefügt wurden
    if (schon.length === dateien.length) {
      return;
    }
    // Änderungsmarkierung
    anhaenge.geaendert(cont);
    // Liste der Anhänge neu aufbauen
    await anhaenge.auflisten(cont, obj);
    // ggf. Liste der Anhänge in den Belegen neu aufbauen
    if (cont.dataset.anhaenge === "kartei") {
      anhaenge.auflistenBelege(cont);
    }
    // Erinnerungen auffrischen
    erinnerungen.check();
  },

  // automatisch alle Dateien im Kartei-Verzeichnis hinzufügen
  //   fenster = Boolean
  //     (die Funktion wurde aus dem Anhänge-Fenster heraus aufgerufen)
  async addAuto ({ fenster }) {
    // Kartei noch nicht gespeichert
    if (!kartei.pfad) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen die Kartei erst speichern.",
      });
      return;
    }
    // Ordner auslesen, Dateien sammeln
    const reg = new RegExp(`.+${helfer.escapeRegExp(modules.path.sep)}`);
    const ordner = kartei.pfad.match(reg)[0];
    const dateienA = [];
    const ausgelesen = await (async function () {
      try {
        const files = await modules.fsp.readdir(ordner);
        for (const f of files) {
          const pfad = modules.path.join(ordner, f);
          const stats = await modules.fsp.lstat(pfad);
          if (!stats.isDirectory() &&
              !/^(~\$|\.)|\.(bak|db|ztj)$/.test(f)) {
            dateienA.push(f);
          }
        }
        return true;
      } catch (err) { // Auslesen des Ordners fehlgeschlagen
        dialog.oeffnen({
          typ: "alert",
          text: `Beim Auslesen des Karteiordners ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
        });
        return false;
      }
    }());
    if (!ausgelesen) {
      return;
    }
    // keine Dateien gefunden
    if (!dateienA.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Im Karteiordner wurden keine Dateien zum Anhängen gefunden.",
      });
      return;
    }
    // Dateien sortieren
    const gruppen = {
      // XML
      xml: 10,
      // Office-Dokumente
      doc: 9,
      docx: 9,
      odt: 9,
      rtf: 9,
      // Text-Dateien
      pdf: 8,
      txt: 8,
      // Bilder
      gif: 7,
      jpeg: 7,
      jpg: 7,
      png: 7,
      svg: 7,
      // Sonstiges
      gz: 2,
      htm: 2,
      html: 2,
      odp: 2,
      ppt: 2,
      pptx: 2,
      rar: 2,
      zip: 2,
    };
    dateienA.sort((a, b) => {
      const extA = a.match(/[^.]+$/);
      const extB = b.match(/[^.]+$/);
      const wertA = extA && gruppen[extA[0]] ? gruppen[extA[0]] : 1;
      const wertB = extB && gruppen[extB[0]] ? gruppen[extB[0]] : 1;
      // nach Typ sortieren
      if (wertA !== wertB) {
        return wertB - wertA;
      }
      // alphabetisch sortieren
      const arr = [ a, b ];
      arr.sort(helfer.sortAlpha);
      if (arr[0] === a) {
        if (wertA === 9) { // Office-Dokumente reverse
          return 1;
        }
        return -1;
      }
      if (wertA === 9) { // Office-Dokumente reverse
        return -1;
      }
      return 1;
    });
    // weitere Dateien ermitteln
    const dateienB = [];
    for (const i of data.an) {
      if (/[/\\]/.test(i)) {
        dateienB.push(i);
      }
    }
    // Änderungen nötig?
    const dateien = dateienA.concat(dateienB);
    if (dateien.join() === data.an.join()) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Dateien aus dem Karteiordner sind alle schon angehängt.",
      });
      return;
    }
    // Datensatz auffrischen
    data.an = dateien;
    await anhaenge.scan(data.an);
    // Änderungsmarkierung
    const cont = document.querySelector("#anhaenge-cont");
    anhaenge.geaendert(cont); // hier werden die Icons im Kopf neu aufgebaut
    // ggf. Liste der Anhänge im Fenster neu aufbauen
    if (fenster) {
      await anhaenge.auflisten(cont, "data|an");
      anhaenge.auflistenBelege(cont);
    }
    // Erinnerungen auffrischen
    erinnerungen.check();
  },

  // Änderungsmarkierung setzen
  //   cont = Element
  //     (das Contentobjekt, in dem sich die Anhänge befinden; hier ist auch
  //     die Markierung, ob die Kartei oder ein Beleg betroffen sind)
  geaendert (cont) {
    // Änderungsmarkierung
    const typ = cont.dataset.anhaenge;
    if (typ === "kartei") {
      kartei.karteiGeaendert(true);
      anhaenge.makeIconList(data.an, document.getElementById("kartei-anhaenge"));
    } else if (typ === "beleg") {
      beleg.belegGeaendert(true);
    }
  },
};
