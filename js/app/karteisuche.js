"use strict";

const karteisuche = {
  // Suche-Fenster öffnen
  async oeffnen () {
    const fenster = document.getElementById("karteisuche");
    overlay.oeffnen(fenster);
    // Läuft im aktuellen Fenster gerade eine Suche?
    if (!document.getElementById("karteisuche-suche-laeuft").classList.contains("aus")) {
      return;
    }
    // Suchtiefe aus den Optionen übernehmen
    document.querySelector("#karteisuche-suchenTiefe").value = optionen.data.karteisuche.tiefe;
    // Cache laden
    karteisuche.ztjCache = await modules.ipc.invoke("ztj-cache-get");
    // Suchbutton fokussieren
    const buttons = fenster.querySelectorAll('input[type="button"]');
    if (Object.keys(karteisuche.ztjCache).length) {
      buttons[1].classList.remove("aus");
      buttons[1].focus();
    } else {
      buttons[0].focus();
    }
    // Pfade auflisten
    karteisuche.pfadeAuflisten();
    // ggf. eine ID für die Filter erzeugen
    if (karteisuche.makeId === null) {
      karteisuche.makeId = karteisuche.idGenerator(1);
    }
    // ggf. die Filter wiederherstellen
    if (!document.querySelector(".karteisuche-filter") &&
        optionen.data.karteisuche.filter.length) {
      karteisuche.filterWiederherstellen();
    }
  },

  // Liste der ausgewählten Pfade aufbauen
  pfadeAuflisten () {
    // Check-Status sichern
    const status = Array(optionen.data.karteisuche.pfade.length).fill(true);
    const inputs = document.querySelectorAll("#karteisuche-pfade input");
    for (let i = 0, len = inputs.length; i < len; i++) {
      if (!inputs[i].checked) {
        status[i] = false;
      }
    }
    // Content leeren
    const cont = document.getElementById("karteisuche-pfade");
    cont.replaceChildren();
    // Pfad hinzufügen
    const p = document.createElement("p");
    cont.appendChild(p);
    p.classList.add("add");
    karteisuche.pfadHinzufuegenListener(p);
    const a = document.createElement("a");
    p.appendChild(a);
    a.href = "#";
    a.classList.add("icon-link", "icon-add");
    p.appendChild(document.createTextNode("Pfad hinzufügen"));
    // Pfade auflisten
    for (let i = 0, len = optionen.data.karteisuche.pfade.length; i < len; i++) {
      const pfad = optionen.data.karteisuche.pfade[i];
      const p = document.createElement("p");
      cont.appendChild(p);
      // Lösch-Icon
      const a = document.createElement("a");
      p.appendChild(a);
      a.href = "#";
      a.classList.add("icon-link", "icon-loeschen");
      a.dataset.pfad = pfad;
      karteisuche.pfadEntfernen(a);
      // Pfad
      const span = document.createElement("span");
      p.appendChild(span);
      span.dataset.pfad = pfad; // wegen des Rechtsklickmenüs
      span.title = pfad;
      // ggf. Checkbox einblenden
      if (len > 1) {
        const input = document.createElement("input");
        span.insertBefore(input, span.firstChild);
        input.checked = status[i];
        input.id = `pfad-${i + 1}`;
        input.type = "checkbox";
        input.value = pfad;
        const label = document.createElement("label");
        span.appendChild(label);
        label.setAttribute("for", `pfad-${i + 1}`);
        label.textContent = pfad;
      } else {
        span.textContent = pfad;
      }
    }
    tooltip.init(p);
  },

  // Pfad zur Pfadliste hinzufügen (Listener)
  //   p = Element
  //     (der Absatz zum Hinzufügen des Pfades)
  pfadHinzufuegenListener (p) {
    p.addEventListener("click", function (evt) {
      evt.stopPropagation();
      karteisuche.pfadHinzufuegen();
    });
  },

  // Pfad zur Pfadliste hinzufügen
  async pfadHinzufuegen () {
    const opt = {
      title: "Pfad hinzufügen",
      defaultPath: appInfo.documents,
      properties: [ "openDirectory" ],
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
    if (result.message || !Object.keys(result).length) { // Fehler
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.message}</p>`,
      });
      return;
    } else if (result.canceled) { // keine Datei ausgewählt
      return;
    }
    // Ist der Pfad schon in der Liste?
    if (optionen.data.karteisuche.pfade.includes(result.filePaths[0])) {
      dialog.oeffnen({
        typ: "alert",
        text: "Der gewählte Pfad wurde schon aufgenommen.",
      });
      return;
    }
    // Pfad hinzufügen
    optionen.data.karteisuche.pfade.push(result.filePaths[0]);
    optionen.speichern();
    // Liste auffrischen
    karteisuche.pfadeAuflisten();
    // Maximalhöhe Trefferliste setzenclearTimeout(helfer.resizeTimeout);
    helfer.elementMaxHeight({
      ele: document.getElementById("karteisuche-karteien"),
    });
  },

  // Pfad aus der Liste entfernen
  //   a = Element
  //     (das Lösch-Icon)
  pfadEntfernen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Pfad entfernen
      const pfad = this.dataset.pfad;
      optionen.data.karteisuche.pfade.splice(optionen.data.karteisuche.pfade.indexOf(pfad), 1);
      optionen.speichern();
      // Liste auffrischen
      karteisuche.pfadeAuflisten();
      // Maximalhöhe Trefferliste setzen
      helfer.elementMaxHeight({
        ele: document.getElementById("karteisuche-karteien"),
      });
    });
  },

  // speichert die Suchttiefe, also die Angaben darüber, wie viele Ordner
  // in die Tiefe gegangen wird, um nach ZTJ-Dateien zu suchen;
  //   1 = nur im angegebenen Ordner suchen
  //   2 = bis zu einen Ordner tief gehen
  //   3 = bis zu zwei Ordner tief gehen
  //   ...
  suchenTiefe: 0,

  // speichert das Input-Element, das vor dem Start der Suche den Fokus hatte
  suchenFokus: null,

  // Suche vorbereiten
  async suchenPrep () {
    // Fehler: kein Pfad hinzugefügt
    if (!optionen.data.karteisuche.pfade.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen zunächst einen Pfad hinzufügen.",
        callback: () => {
          karteisuche.pfadHinzufuegen();
        },
      });
      karteisuche.animation(false);
      return;
    }
    // Pfade ermitteln, in denen gesucht werden soll und kann
    const pfade = [];
    const inputs = document.querySelectorAll("#karteisuche-pfade input");
    let nichtGefunden = 0;
    let abgehakt = 0;
    if (inputs.length) {
      for (const i of inputs) {
        if (!i.checked) {
          continue;
        }
        abgehakt++;
        const exists = await helfer.exists(i.value);
        if (exists) {
          pfade.push(i.value);
          karteisuche.markierungPfad(i.value, false);
        } else {
          nichtGefunden++;
          karteisuche.markierungPfad(i.value, true);
        }
      }
    } else {
      abgehakt++;
      const pfad = optionen.data.karteisuche.pfade[0];
      const exists = await helfer.exists(pfad);
      if (exists) {
        pfade.push(pfad);
        karteisuche.markierungPfad(pfad, false);
      } else {
        nichtGefunden++;
        karteisuche.markierungPfad(pfad, true);
      }
    }
    // Fehler: kein Pfad ausgewählt
    if (!abgehakt) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen zunächst einen Pfad auswählen.",
      });
      karteisuche.animation(false);
      return;
    }
    // Fehler: keiner der (ausgewählten) Pfade wurde wiedergefunden
    if (nichtGefunden === abgehakt) {
      let ausgewaehlt = "";
      if (abgehakt < optionen.data.karteisuche.pfade.length) {
        ausgewaehlt = " ausgewählte";
        if (abgehakt > 1) {
          ausgewaehlt = " ausgewählten";
        }
      }
      let text = `Der${ausgewaehlt} Pfad wurde nicht wiedergefunden.`;
      if (abgehakt > 1) {
        text = `Keiner der${ausgewaehlt} Pfade wurde wiedergefunden.`;
      }
      dialog.oeffnen({
        typ: "alert",
        text,
      });
      karteisuche.animation(false);
      return;
    }
    // Suche starten
    await karteisuche.suchenPrepZtj(pfade);
  },

  // markiert einen Pfad, wenn er nicht gefunden wurde, und demarkiert ihn,
  // wenn er gefunden wurde
  //   pfad = String
  //     (der Pfad)
  //   verschwunden = Boolean
  //     (der Pfad ist verschwunden)
  markierungPfad (pfad, verschwunden) {
    // betreffenden Span finden
    pfad = pfad.replace(/\\/g, "\\\\"); // Backslash in Windows-Pfaden maskieren!
    const span = document.querySelector(`#karteisuche-pfade [title="${pfad}"]`);
    const img = span.querySelector("img");
    // Bild ggf. entfernen
    if (!verschwunden) {
      if (img) {
        img.parentNode.removeChild(img);
      }
      return;
    }
    // Bild ggf. hinzufügen
    if (img) {
      return;
    }
    const x = document.createElement("img");
    span.insertBefore(x, span.lastChild);
    x.src = "img/x-dick-rot.svg";
    x.width = "24";
    x.height = "24";
    karteisuche.markierungFehler(x);
  },

  // Reaktion auf Klick auf dem Fehler-Icon
  //   img = Element
  //     (das Fehler-Icon)
  markierungFehler (img) {
    img.addEventListener("click", function () {
      dialog.oeffnen({
        typ: "alert",
        text: `Der Pfad\n<p class="force-wrap"><i>${this.parentNode.title}</i></p>\nkonnte nicht gefunden werden.`,
      });
    });
  },

  // ZTJ-Dateien zusammentragen
  //   pfade = Array
  //     (Pfade, in denen gesucht werden soll;
  //     das Array ist leer, wenn im Cache gesucht werden soll)
  async suchenPrepZtj (pfade) {
    const status = await modules.ipc.invoke("ztj-cache-status-get");
    // Abbruch, falls bereits eine Suche läuft
    if (status) {
      dialog.oeffnen({
        typ: "alert",
        text: "Es läuft bereits eine Karteisuche.\nSie müssen warten, bis diese beendet ist.",
      });
      return;
    }
    // speichern, dass die Suche läuft
    modules.ipc.invoke("ztj-cache-status-set", true);
    // Cache-Daten aus Main holen
    karteisuche.ztjCache = await modules.ipc.invoke("ztj-cache-get");
    // Element mit Fokus speichern
    karteisuche.suchenFokus = document.querySelector("#karteisuche input:focus");
    if (karteisuche.suchenFokus) {
      karteisuche.suchenFokus.blur();
    } else {
      karteisuche.suchenFokus = null;
    }
    // Animation einblenden
    karteisuche.animation(true);
    // Dateien suchen
    karteisuche.suchenTiefe = parseInt(document.querySelector("#karteisuche-suchenTiefe").value, 10);
    await new Promise(resolve => {
      setTimeout(async () => {
        karteisuche.ztj = [];
        if (pfade.length) {
          // Dateien auf Speichermedium suchen
          for (const ordner of pfade) {
            const exists = await helfer.exists(ordner);
            if (exists) {
              try {
                await modules.fsp.access(ordner, modules.fsp.constants.R_OK); // Lesezugriff auf Basisordner? Wenn kein Zugriff => throw
                await karteisuche.ordnerParsen(ordner, 1);
              } catch (err) { // wahrscheinlich besteht kein Zugriff auf den Pfad
                karteisuche.suchenAbschluss();
                dialog.oeffnen({
                  typ: "alert",
                  text: `Die Karteisuche wurde wegen eines Fehlers nicht gestartet.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.message}</p>`,
                });
                resolve(false);
                return;
              }
            }
          }
        } else {
          // aktive Pfade ermitteln
          const pfade = [];
          document.querySelectorAll("#karteisuche-pfade span[data-pfad]").forEach(i => {
            const input = i.querySelector("input");
            if (input && input.checked ||
                !input) {
              const reg = new RegExp("^" + helfer.escapeRegExp(i.dataset.pfad));
              pfade.push(reg);
            }
          });
          // Dateidaten aus dem Cache zusammentragen
          for (const pfad of Object.keys(karteisuche.ztjCache)) {
            let pfadAktiv = false;
            for (const reg of pfade) {
              if (reg.test(pfad)) {
                pfadAktiv = true;
                break;
              }
            }
            if (!pfadAktiv) {
              // Dateien aus inaktiven Pfaden ignorieren
              continue;
            }
            karteisuche.ztj.push({
              pfad,
              ctime: karteisuche.ztjCache[pfad].ctime,
              wort: "",
              wortSort: "",
              redaktion: [],
              nebenlemmata: [],
              behandeltIn: "",
              behandeltMit: [],
              passt: false,
            });
          }
        }
        await karteisuche.suchen();
        resolve(true);
      }, 500);
    });
  },

  // Suche starten
  async suchen () {
    // Filterwerte sammeln
    karteisuche.filterWerteSammeln();
    // Karteien analysieren
    const ztjAdd = [];
    const ztjMit = {};
    const nebenlemmata = new Set();
    for (const kartei of karteisuche.ztj) {
      // Kartei einlesen
      let datei = {};
      if (karteisuche.ztjCache[kartei.pfad] &&
          kartei.ctime === karteisuche.ztjCache[kartei.pfad].ctime) {
        // aus Cache holen
        datei = karteisuche.ztjCache[kartei.pfad].data;
      } else {
        // vom Speichermedium holen
        const content = await io.lesen(kartei.pfad);
        try {
          datei = JSON.parse(content);
        } catch (err) {
          continue;
        }
        // keine ZTJ-Datei
        // (bis Version 0.24.0 stand in dem Feld "wgd")
        if (!/^(wgd|ztj)$/.test(datei.ty)) {
          continue;
        }
        // Kartei cachen
        modules.ipc.invoke("ztj-cache-save", {
          pfad: kartei.pfad,
          ctime: kartei.ctime,
          data: datei,
        });
        karteisuche.ztjCache[kartei.pfad] = { // Arbeitskopie im Fenster up-to-date halten
          ctime: kartei.ctime,
          data: datei,
        };
      }
      // Werden in der Kartei mehrere Wörter behandelt?
      const woerter = datei.wo.split(", ");
      for (let i = 0, len = woerter.length; i < len; i++) {
        let ziel = kartei;
        if (i > 0) {
          ztjAdd.push({
            pfad: kartei.pfad,
            ctime: kartei.ctime,
            wort: "",
            wortSort: "",
            redaktion: [],
            nebenlemmata: [],
            behandeltIn: "",
            behandeltMit: [],
            passt: false,
          });
          ziel = ztjAdd[ztjAdd.length - 1];
        }
        // Wort merken
        ziel.wort = woerter[i];
        ziel.wortSort = karteisuche.wortSort(woerter[i]);
        // Nebenlemmata
        if (datei.rd.nl) {
          datei.rd.nl.split(/, */).forEach(nl => {
            if (!nl) {
              return;
            }
            nebenlemmata.add(nl);
            ziel.nebenlemmata.push(nl);
            if (!ziel.behandeltMit.includes(nl)) {
              ziel.behandeltMit.push(nl);
            }
            if (!ztjMit[woerter[i]]) {
              ztjMit[woerter[i]] = [];
            }
            if (!ztjMit[woerter[i]].includes(nl)) {
              ztjMit[woerter[i]].push(nl);
            }
          });
        }
        // Behandelt-Datensätze
        if (woerter.length > 1 &&
            !datei.rd.bh) {
          const mit = [ ...woerter ];
          mit.splice(i, 1);
          ziel.behandeltMit = [ ...mit ];
        }
        if (datei.rd.bh) {
          nebenlemmata.add(woerter[i]);
          ziel.behandeltIn = datei.rd.bh;
          if (!ztjMit[datei.rd.bh]) {
            ztjMit[datei.rd.bh] = [];
          }
          if (!ztjMit[datei.rd.bh].includes(woerter[i])) {
            ztjMit[datei.rd.bh].push(woerter[i]);
          }
        }
        // Redaktionsereignisse klonen
        let er = datei.rd.er;
        if (!er) {
          // bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
          // erst danach in data.rd.er
          er = datei.rd;
        }
        for (const erg of er) {
          ziel.redaktion.push({ ...erg });
        }
      }
    }
    // Karteiliste ggf. ergänzen
    karteisuche.ztj = karteisuche.ztj.concat(ztjAdd);
    for (const i of karteisuche.ztj) {
      // Wörter ergänzen, die mit dem Wort der aktuellen Kartei behandelt werden
      if (ztjMit[i.wort]) {
        for (const mit of ztjMit[i.wort]) {
          if (!i.behandeltMit.includes(mit)) {
            i.behandeltMit.push(mit);
          }
        }
      }
      // ggf. Einträge der Nebenlemmata ergänzen
      if (i.nebenlemmata.length) {
        forX: for (const nl of i.nebenlemmata) {
          for (const ztj of karteisuche.ztj) {
            if (ztj.wort === nl) {
              continue forX;
            }
          }
          const obj = {
            pfad: i.pfad,
            ctime: i.ctime,
            wort: nl,
            wortSort: karteisuche.wortSort(nl),
            redaktion: [],
            nebenlemmata: [],
            behandeltIn: i.wort,
            behandeltMit: [],
            passt: i.passt,
          };
          karteisuche.ztj.push(obj);
        }
      }
    }
    // Redaktionsereignisse ggf. aus der übergeordneten Kartei holen
    for (const i of karteisuche.ztj) {
      if (!i.behandeltIn) {
        continue;
      }
      for (const j of karteisuche.ztj) {
        if (j.wort === i.behandeltIn) {
          i.redaktion = [];
          for (const erg of j.redaktion) {
            i.redaktion.push({ ...erg });
          }
          break;
        }
      }
    }
    // Karteien filtern
    for (const kartei of karteisuche.ztj) {
      if (!karteisuche.ztjCache[kartei.pfad]) {
        continue;
      }
      const datei = karteisuche.ztjCache[kartei.pfad].data;
      if (datei.rd.er) {
        datei.rd.er = kartei.redaktion;
      } else {
        datei.rd = kartei.redaktion;
      }
      kartei.passt = karteisuche.filtern(datei);
    }
    // ggf. Karteien nach Lemmatyp filtern
    // (da die Lemmatypen keine Eigenschaft der Karteien sind, kann dieser Filter
    // nicht in karteisuche.filtern() angewendet werden)
    const lt = karteisuche.filterWerte.filter(i => i.typ === "Lemmatyp");
    if (lt.length) {
      for (const i of karteisuche.ztj) {
        if (lt[0].lt === "Hauptlemma" && nebenlemmata.has(i.wort) ||
            lt[0].lt === "Nebenlemma" && !nebenlemmata.has(i.wort)) {
          i.passt = false;
        }
      }
    }
    // passende Karteien auflisten
    karteisuche.ztjAuflisten();
    // ggf. Cache-Button ein- oder ausblenden
    const button = document.querySelectorAll('#karteisuche input[type="button"]')[1];
    if (karteisuche.ztj.length ||
        Object.keys(karteisuche.ztjCache).length) {
      button.classList.remove("aus");
    } else {
      button.classList.add("aus");
    }
    // Sperrbild weg, Status zurücksetzen
    karteisuche.suchenAbschluss();
    // Filter speichern
    karteisuche.filterSpeichern();
    // Systemmeldung ausgeben
    const notifyOpts = {
      body: "Die Karteisuche ist abgeschlossen!",
      icon: "img/icon/linux/icon_128px.png",
      lang: "de",
    };
    switch (process.platform) {
      case "darwin":
        notifyOpts.icon = "img/icon/mac/icon.icns";
        break;
      case "win32":
        notifyOpts.icon = "img/icon/win/icon.ico";
        break;
    }
    new Notification(appInfo.name, notifyOpts);
  },

  // Karteisuche abschließen (bei Erfolg oder vorzeitigem Abbruch)
  suchenAbschluss () {
    // Sperrbild weg und das zuletzt fokussierte Element wieder fokussieren
    karteisuche.animation(false);
    if (karteisuche.suchenFokus) {
      karteisuche.suchenFokus.focus();
    }
    // Status der Karteisuche zurücksetzen
    modules.ipc.invoke("ztj-cache-status-set", false);
  },

  // ZTJ-Dateien, die gefunden wurden;
  // Array enthält Objekte:
  //   pfad (String; Pfad zur Kartei)
  //   ctime (String; Änderungsdatum der Kartei)
  //   wort (String; Wort der Kartei)
  //   wortSort (String; Sortierform des Worts der Kartei)
  //   redaktion (Array; Klon von data.rd.er)
  //   nebenlemmata (Array; Liste der Nebenlemmata)
  //   behandeltIn (String; Wort, in dem das aktuelle Wort behandelt wird)
  //   behandeltMit (Array; Lemmata, die mit dem aktuellen Wort behandelt werden)
  //   passt (Boolean; passt zu den Suchfiltern)
  ztj: [],

  // Cache für ZTJ-Dateien
  // (wird beim Öffnen des Fensters und Start einer Suche aus Main geholt;
  // Schlüssel ist der Pfad der ZTJ-Datei)
  //   ctime (String; Änderungsdatum der Kartei)
  //   data (Object; die kompletten Karteidaten)
  ztjCache: {},

  // findet alle Pfade in einem übergebenen Ordner
  //   ordner = String
  //     (Ordner, von dem aus die Suche beginnen soll)
  //   suchtiefe = Number
  //     (Tiefe gezählt vom Startordner aus; Startordner = 1)
  async ordnerParsen (ordner, suchtiefe) {
    suchtiefe++;
    try {
      const files = await modules.fsp.readdir(ordner);
      for (const i of files) {
        const pfad = modules.path.join(ordner, i);
        await karteisuche.pfadPruefen(pfad, suchtiefe);
      }
      // Auslesen des Ordners geglückt
      return true;
    } catch {}
    // Auslesen des Ordners fehlgeschlagen
    return false;
  },

  // überprüft einen übergebenen Pfad: Ordner oder ZTJ-Datei?
  //   pfad = String
  //     (Ordner, von dem aus die Suche beginnen soll)
  //   suchtiefe = Number
  //     (Tiefe gezählt vom Startordner aus; Startordner = 1)
  async pfadPruefen (pfad, suchtiefe) {
    try {
      let stats; // Natur des Pfades?
      if (/\.ztj$/.test(pfad) ||
          !/\.[a-z]{3,4}/.test(pfad)) {
        // zur Beschleunigung nur testen, wenn ZTJ-Datei oder wahrscheinlich Ordner
        stats = await modules.fsp.lstat(pfad);
      }
      if (stats?.isDirectory() && // Ordner => parsen
          suchtiefe <= karteisuche.suchenTiefe) { // nur bis zu dieser Verschachtelungstiefe suchen
        await karteisuche.ordnerParsen(pfad, suchtiefe);
      } else if (/\.ztj$/.test(pfad)) { // ZTJ-Datei => merken
        karteisuche.ztj.push({
          pfad,
          ctime: stats.ctime.toString(),
          wort: "",
          wortSort: "",
          redaktion: [],
          nebenlemmata: [],
          behandeltIn: "",
          behandeltMit: [],
          passt: false,
        });
      }
      return true;
    } catch {}
    // wahrscheinlich besteht kein Zugriff auf den Pfad
    return false;
  },

  // ZTJ-Dateien auflisten
  ztjAuflisten () {
    let treffer = 0;
    const woerter = [];
    for (let i = 0, len = karteisuche.ztj.length; i < len; i++) {
      if (!karteisuche.ztj[i].passt) {
        continue;
      }
      treffer++;
      woerter.push({
        wort: karteisuche.ztj[i].wort,
        wortSort: karteisuche.ztj[i].wortSort,
        i,
      });
    }
    woerter.sort(function (a, b) {
      const arr = [ a.wortSort, b.wortSort ];
      arr.sort(helfer.sortAlpha);
      if (a.wortSort === arr[0]) {
        return -1;
      }
      return 1;
    });
    // Treffer anzeigen
    document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
    // Karteiliste füllen
    const cont = document.getElementById("karteisuche-karteien");
    const alphabet = new Set();
    cont.scrollTop = 0;
    cont.replaceChildren();
    for (const wort of woerter) {
      // Absatz
      const div = document.createElement("div");
      cont.appendChild(div);
      const alpha = karteisuche.wortAlpha(wort.wortSort);
      alphabet.add(alpha);
      div.dataset.buchstabe = alpha;
      div.dataset.idx = wort.i;
      // Link
      const a = document.createElement("a");
      div.appendChild(a);
      a.href = "#";
      const pfad = karteisuche.ztj[wort.i].pfad;
      a.dataset.pfad = pfad;
      karteisuche.ztjOeffnen(a);
      // Wort
      let span = document.createElement("span");
      a.appendChild(span);
      span.textContent = wort.wort;
      // Pfad
      span = document.createElement("span");
      a.appendChild(span);
      span.textContent = pfad;
      span.title = pfad;
      // ggf. Infos ergänzen
      karteisuche.ztjAuflistenInfos(div, wort.i);
    }
    tooltip.init(cont);
    // Maximalhöhe Trefferliste setzen
    helfer.elementMaxHeight({
      ele: document.getElementById("karteisuche-karteien"),
    });
    // Alphabet drucken
    karteisuche.alphabet(alphabet);
  },

  // Infos ergänzen (Redaktionsstatus und -ereignisse und Verweise)
  //   div = Element
  //     (der Container, in dem die Ereignisse angezeigt werden sollen)
  //   i = Number
  //     (Index, der auf die Daten in karteisuche.ztj zeigt)
  ztjAuflistenInfos (div, i) {
    // Wrapper erzeugen
    const wrap = document.createElement("div");
    // Redaktionsinfos
    if (karteisuche.filterWerte.some(i => i.typ === "Redaktion")) {
      // Redaktionsstatus drucken
      const status = karteisuche.ztjAuflistenRedaktion(i);
      const stat = document.createElement("span");
      wrap.appendChild(stat);
      stat.classList.add("karteisuche-status", `karteisuche-status${status.status}`);
      // höchstes Redaktionsereignis drucken
      const erg = document.createElement("span");
      wrap.appendChild(erg);
      erg.classList.add("karteisuche-hoechst");
      erg.textContent = status.ereignis;
      // Personen und Daten: Wer hat wann was erstellt?
      const erstellt = [
        {
          arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Kartei erstellt"),
          txt: "Kartei",
        },
        {
          arr: karteisuche.ztj[i].redaktion.filter(v => v.er === "Artikel erstellt"),
          txt: "Artikel",
        },
      ];
      let br = false;
      for (const e of erstellt) {
        for (const i of e.arr) {
          if (br) {
            wrap.appendChild(document.createElement("br"));
          }
          const typ = document.createElement("i");
          wrap.appendChild(typ);
          typ.textContent = `${e.txt}:`;
          const da = helfer.datumFormat(i.da, "minuten").split(", ")[0];
          const pr = i.pr ? i.pr : "N.\u00A0N.";
          wrap.appendChild(document.createTextNode(` ${pr} (${da})`));
          br = true;
        }
      }
    }
    // Verweisinfos
    const verweise = karteisuche.ztjAuflistenVerweise(i);
    if (verweise) {
      if (wrap.hasChildNodes()) {
        wrap.appendChild(document.createElement("br"));
      }
      wrap.appendChild(verweise);
      tooltip.init(wrap);
    }
    // Wrapper einhängen, wenn er denn gefüllt wurde
    if (wrap.hasChildNodes()) {
      div.appendChild(wrap);
    }
  },

  // Redaktionsstatus ermitteln
  //   idx = Number
  //     (auf karteisuche.ztj zeigender Index)
  ztjAuflistenRedaktion (idx) {
    const ds = karteisuche.ztj[idx];
    const ereignisse = Object.keys(redaktion.ereignisse);
    let status = 1;
    const status2 = ereignisse.indexOf("Artikel erstellt");
    const status3 = ereignisse.indexOf("Artikel fertig");
    const status4 = ereignisse.indexOf("Artikel online");
    let hoechst = -1;
    for (const i of ds.redaktion) {
      const idx = ereignisse.indexOf(i.er);
      hoechst = idx > hoechst ? idx : hoechst;
    }
    // Status ermitteln
    if (hoechst >= status4) {
      status = 4;
    } else if (hoechst >= status3) {
      status = 3;
    } else if (hoechst >= status2) {
      status = 2;
    }
    return {
      hoechst,
      status,
      status2,
      status3,
      status4,
      ereignis: ereignisse[hoechst],
    };
  },

  // Verweise ermitteln
  //   i = Number
  //     (Index, der auf die Daten in karteisuche.ztj zeigt)
  ztjAuflistenVerweise (i) {
    // Verweise ermitteln
    const verweise = [ ...new Set(karteisuche.ztj[i].behandeltMit) ];
    verweise.sort(helfer.sortAlpha);
    verweise.forEach((i, n) => {
      verweise[n] = `+ ${i}`;
    });
    const bhIn = karteisuche.ztj[i].behandeltIn;
    if (bhIn) {
      verweise.unshift(`→ ${bhIn}`);
    }
    // keine Verweise vorhanden
    if (!verweise.length) {
      return null;
    }
    // Verweise vorhanden
    const span = document.createElement("span");
    span.classList.add("verweise");
    for (let i = 0, len = verweise.length; i < len; i++) {
      if (i > 0) {
        span.appendChild(document.createTextNode(", "));
      }
      const v = verweise[i];
      const wrap = document.createElement("span");
      if (/^→/.test(v)) {
        wrap.textContent = "→\u00A0";
        wrap.title = "behandelt in";
      } else {
        wrap.textContent = "+\u00A0";
        wrap.title = "behandelt mit";
      }
      span.appendChild(wrap);
      span.appendChild(document.createTextNode(v.substring(2)));
    }
    return span;
  },

  // ZTJ-Datei in neuem Fenster öffnen
  //   a = Element
  //     (Link, mit dem eine ZTJ-Datei geöffnet werden kann)
  ztjOeffnen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      if (evt.detail > 1) { // Doppelklicks abfangen
        return;
      }
      // die Kartei könnte bereits in diesem Fenster offen sein
      if (kartei.pfad === this.dataset.pfad) {
        return;
      }
      // Kartei in einem neuen Fenster öffnen
      modules.ipc.send("kartei-laden", this.dataset.pfad, false);
    });
  },

  // Sortierwort aus dem übergebenen Wort/Ausdruck ableiten
  // (denn das Wort könnte mehrgliedrig sein, Beispiele:
  // politisch korrekt => Rückgabe: politisch;
  // der kleine Mann => Rückgabe: Mann)
  //   wort = String
  //     (Wort oder Ausdruck)
  wortSort (wort) {
    // Homographenziffern entfernen
    wort = wort.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "");
    let sortform = "";
    for (const i of wort.split(/\s/)) {
      // Artikel ignorieren
      if (/^der|die|das$/.test(i)) {
        continue;
      }
      // erstes Wort, das kein Artikel ist
      if (!sortform) {
        sortform = i;
      }
      // erstes Wort, das mit einem Großbuchstaben beginnt, bevorzugen
      if (/^[A-ZÄÖÜ]/.test(i)) {
        sortform = i;
        break;
      }
    }
    if (!sortform) {
      // das Wort war offenbar ein Artikel
      return wort;
    }
    return sortform;
  },

  // Buchstabe des Alphabets aus dem übergebenen Karteiwort ableiten
  //   wort = String
  //     (das Wort, um das es geht)
  wortAlpha (wort) {
    let erster = wort.substring(0, 1).toUpperCase();
    if (/[0-9]/.test(erster)) {
      erster = "#";
    } else if (/[ÄÖÜ]/.test(erster)) {
      switch (erster) {
        case "Ä":
          erster = "A";
          break;
        case "Ö":
          erster = "O";
          break;
        case "Ü":
          erster = "U";
          break;
      }
    }
    return erster;
  },

  // Alphabet drucken
  //   alpha = Set
  //     (Buchstaben des Alphabets, die auftauchen)
  alphabet (alpha) {
    // Liste löschen
    const cont = document.getElementById("karteisuche-alphabet");
    cont.replaceChildren();
    // keine Treffer
    if (!alpha.size) {
      return;
    }
    // Liste aufbauen
    const alphabet = [ ...alpha ].sort();
    alphabet.unshift("alle");
    for (let i = 0, len = alphabet.length; i < len; i++) {
      const a = document.createElement("a");
      cont.appendChild(a);
      a.dataset.buchstabe = alphabet[i];
      a.href = "#";
      a.textContent = alphabet[i];
      if (i === 0) {
        a.classList.add("aktiv");
        cont.appendChild(document.createTextNode("|"));
      }
    }
    // Maximalbreite berechnen
    const h = cont.parentNode;
    const treffer = document.getElementById("karteisuche-treffer");
    const belegt = treffer.offsetLeft + treffer.offsetWidth + h.lastChild.offsetWidth + 4 + 2 * 25; // 4px Abstand rechts, 2 * 25px Margins zum Alphabet
    cont.style.maxWidth = `calc(100% - ${belegt}px`;
    // Klickevents anhängen
    cont.querySelectorAll("a").forEach(a => karteisuche.alphabetFilter(a));
  },

  // Trefferliste nach Buchstaben filtern
  //   a = Element
  //     (Link für einen oder alle Buchstaben)
  alphabetFilter (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const b = this.dataset.buchstabe;
      const liste = document.getElementById("karteisuche-karteien");
      let treffer = 0;
      liste.scrollTop = 0;
      // filtern
      for (const i of liste.childNodes) {
        let anzeigen = false;
        if (b === "alle" || b === i.dataset.buchstabe) {
          anzeigen = true;
        }
        if (anzeigen) {
          i.classList.remove("aus");
          treffer++;
        } else {
          i.classList.add("aus");
        }
      }
      // aktiven Filter markieren
      const alpha = document.getElementById("karteisuche-alphabet");
      alpha.querySelector(".aktiv").classList.remove("aktiv");
      this.classList.add("aktiv");
      // Trefferzahl auffrischen
      document.getElementById("karteisuche-treffer").textContent = `(${treffer})`;
    });
  },

  // Generator zur Erzeugung der nächsten Filter-ID
  makeId: null,
  *idGenerator (id) {
    while (true) {
      yield id++;
    }
  },

  // zur Verfügung stehende Filter-Typen
  filterTypen: {
    Karteiwort: [
      {
        type: "text",
        ro: false,
        cl: "karteisuche-karteiwort",
        ph: "Suchtext",
        pre: "",
        label: "",
      },
    ],
    Lemmatyp: [
      {
        type: "dropdown",
        ro: true,
        cl: "karteisuche-lemmatyp",
        ph: "",
        pre: "Hauptlemma",
        label: "",
      },
    ],
    Themenfeld: [
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-themenfeld",
        ph: "Themenfeld",
        pre: "",
        label: "",
      },
    ],
    Sachgebiet: [
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-sachgebiet",
        ph: "Sachgebiet",
        pre: "",
        label: "",
      },
    ],
    Volltext: [
      {
        type: "text",
        ro: false,
        cl: "karteisuche-volltext",
        ph: "Suchtext",
        pre: "",
        label: "",
      },
      {
        type: "checkbox",
        ro: false,
        cl: "karteisuche-volltext-genau",
        ph: "genaue Schreibung",
        pre: "",
        label: "",
      },
    ],
    Tag: [
      {
        type: "dropdown",
        ro: true,
        cl: "karteisuche-tag-typ",
        ph: "Typ",
        pre: "",
        label: "",
      },
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-tag",
        ph: "Tag",
        pre: "",
        label: "",
      },
    ],
    Karteidatum: [
      {
        type: "dropdown",
        ro: true,
        cl: "karteisuche-datum-typ",
        ph: "Ereignis",
        pre: "erstellt",
        label: "",
      },
      {
        type: "dropdown",
        ro: true,
        cl: "karteisuche-datum-dir",
        ph: "Zeitrichtung",
        pre: "<=",
        label: "",
      },
      {
        type: "date",
        ro: false,
        cl: "karteisuche-datum",
        ph: "",
        pre: "",
        label: "",
      },
    ],
    BearbeiterIn: [
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-person",
        ph: "Person",
        pre: "",
        label: "",
      },
    ],
    Redaktion: [
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-redaktion-logik",
        ph: "Logik",
        pre: "=",
        label: "",
      },
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-redaktion-ereignis",
        ph: "Ereignis",
        pre: "",
        label: "",
      },
      {
        type: "dropdown",
        ro: false,
        cl: "karteisuche-redaktion-person",
        ph: "Person",
        pre: "",
        label: "",
      },
    ],
    Redaktionsdatum: [
      {
        type: "date",
        ro: false,
        cl: "karteisuche-redaktionsdatum-von",
        ph: "",
        pre: "",
        label: "von",
      },
      {
        type: "date",
        ro: false,
        cl: "karteisuche-redaktionsdatum-bis",
        ph: "",
        pre: "",
        label: "bis",
      },
    ],
  },

  // fügt einen neuen Filter hinzu
  //   manuell = Boolean | undefined
  //     (der Filter wurde manuell hinzugefügt)
  filterHinzufuegen (manuell = true) {
    const cont = document.getElementById("karteisuche-filter");
    const p = document.createElement("p");
    cont.insertBefore(p, cont.firstChild);
    p.classList.add("input-text");
    // Lösch-Icon
    const a = document.createElement("a");
    p.appendChild(a);
    a.href = "#";
    a.classList.add("icon-link", "icon-loeschen");
    karteisuche.filterEntfernen(a);
    // Dropdown-Container
    const span = document.createElement("span");
    p.appendChild(span);
    span.classList.add("dropdown-cont");
    // Input
    const input = document.createElement("input");
    span.appendChild(input);
    input.classList.add("dropdown-feld", "karteisuche-filter");
    const id = karteisuche.makeId.next().value;
    input.id = `karteisuche-filter-${id}`;
    input.placeholder = "Filtertyp";
    input.readOnly = true;
    input.type = "text";
    input.value = "";
    span.appendChild(dropdown.makeLink("dropdown-link-td", "Filtertyp", true));
    tooltip.init(span);
    dropdown.feld(input);
    karteisuche.filterFelderListener(input);
    // Filter fokussieren, wenn er manuell hinzugefügt wurde
    if (manuell) {
      input.focus();
    }
    // Maximalhöhe Trefferliste setzen
    helfer.elementMaxHeight({
      ele: document.getElementById("karteisuche-karteien"),
    });
  },

  // baut die zu einem Filter gehörigen Formularelemente auf
  //   filterId = String
  //     (ID des Filters, der gerade geändert wurde)
  filterFelder (filterId) {
    const filter = document.getElementById(filterId);
    const p = filter.parentNode.parentNode;
    // ggf. unnötige Inputs entfernen
    // (der Filter kann geändert werden)
    while (p.childNodes.length > 2) {
      p.removeChild(p.lastChild);
    }
    // Filtertyp und ID ermitteln
    const typ = filter.value;
    const id = filterId.replace(/.+-/, "");
    // der Filtertyp könnte leer sein, wenn ein leerer Filter wiederhergestellt wird
    if (!typ) {
      return;
    }
    // die nötigen Inputs hinzufügen
    const felder = karteisuche.filterTypen[typ];
    for (const feld of felder) {
      const span = document.createElement("span");
      p.appendChild(span);
      if (feld.label) {
        const label = document.createElement("label");
        span.appendChild(label);
        label.setAttribute("for", `${feld.cl}-${id}`);
        label.textContent = feld.label;
      }
      if (feld.type === "dropdown") {
        span.classList.add("dropdown-cont");
        const input = document.createElement("input");
        span.appendChild(input);
        input.classList.add("dropdown-feld", feld.cl);
        input.id = `${feld.cl}-${id}`;
        input.placeholder = feld.ph;
        if (feld.ro) {
          input.readOnly = true;
        }
        input.type = "text";
        input.value = feld.pre;
        span.appendChild(dropdown.makeLink("dropdown-link-td", feld.ph, true));
        dropdown.feld(input);
        karteisuche.filterFelderListener(input);
      } else if (feld.type === "text") {
        const input = document.createElement("input");
        span.appendChild(input);
        input.classList.add(feld.cl);
        input.id = `${feld.cl}-${id}`;
        input.placeholder = feld.ph;
        input.type = "text";
        input.value = feld.pre;
        karteisuche.filterFelderListener(input);
      } else if (feld.type === "date") {
        const input = document.createElement("input");
        span.appendChild(input);
        input.classList.add(feld.cl);
        input.id = `${feld.cl}-${id}`;
        input.type = "date";
        const datum = new Date();
        if (feld.cl === "karteisuche-redaktionsdatum-von") {
          input.value = `${datum.getFullYear()}-01-01`;
        } else if (feld.cl === "karteisuche-redaktionsdatum-bis") {
          input.value = `${datum.getFullYear()}-12-31`;
        } else {
          input.value = datum.toISOString().split("T")[0];
        }
        karteisuche.filterFelderListener(input);
      } else if (feld.type === "checkbox") {
        const input = document.createElement("input");
        span.appendChild(input);
        input.classList.add(feld.cl);
        input.id = `${feld.cl}-${id}`;
        input.type = "checkbox";
        karteisuche.filterFelderListener(input);
        const label = document.createElement("label");
        span.appendChild(label);
        label.setAttribute("for", `${feld.cl}-${id}`);
        label.textContent = feld.ph;
      }
    }
    tooltip.init(p);
  },

  // Suche mit Enter starten
  filterFelderListener (input) {
    input.addEventListener("keydown", function (evt) {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers &&
          evt.key === "Enter" &&
          !document.querySelector("#dropdown .aktiv")) {
        evt.preventDefault();
        if (Object.keys(karteisuche.ztjCache).length) {
          karteisuche.suchenPrepZtj([]);
        } else {
          karteisuche.suchenPrep();
        }
      }
    });
  },

  // ermittelt den zu einem ausgeschriebenen Tag-Typ gehörenden Schlüssel
  //   feld = Element
  //     (das Input-Feld, in dem der ausgeschriebene Tag-Typ steht)
  filterTagTyp (feld) {
    const typ = feld.value;
    for (const [ key, val ] of Object.entries(optionen.tagsTypen)) {
      if (val[1] === typ) {
        return key;
      }
    }
    return typ.substring(0, 1).toLowerCase() + typ.substring(1);
  },

  // entfernt einen Filter
  //   a = Element
  //     (Anker zum Entfernen des Filters)
  filterEntfernen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      a.parentNode.parentNode.removeChild(a.parentNode);
      // Maximalhöhe Trefferliste setzen
      helfer.elementMaxHeight({
        ele: document.getElementById("karteisuche-karteien"),
      });
    });
  },

  // Zwischenspeicher für die Filterwerte
  filterWerte: [],

  // Map für Tags
  filterTagMap: {
    Themenfeld: "themenfelder",
    Sachgebiet: "sachgebiete",
  },

  // Filterwerte sammeln
  filterWerteSammeln () {
    karteisuche.filterWerte = [];
    for (const filter of document.querySelectorAll(".karteisuche-filter")) {
      const id = filter.id.replace(/.+-/, "");
      const typ = filter.value;
      // Filter ausgewählt?
      if (!typ) {
        karteisuche.filterIgnorieren(filter, true);
        continue;
      }
      // Objekt für die Filterwerte
      const obj = {
        typ,
      };
      if (typ === "Karteiwort") {
        // Karteiwort
        let text = document.getElementById(`karteisuche-karteiwort-${id}`).value;
        text = helfer.textTrim(text, true);
        if (!text) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
        karteisuche.filterWerte.push(obj);
      } else if (typ === "Lemmatyp") {
        // Lemmatyp
        obj.lt = document.getElementById(`karteisuche-lemmatyp-${id}`).value;
        karteisuche.filterWerte.push(obj);
      } else if (/^(Themenfeld|Sachgebiet)$/.test(typ)) {
        // Themenfelder/Sachgebiet
        const tagName = karteisuche.filterTagMap[typ];
        obj.id = "";
        const tag = document.getElementById(`karteisuche-${typ.toLowerCase()}-${id}`).value;
        if (!tag || !optionen.data.tags[tagName]) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        for (const [ id, val ] of Object.entries(optionen.data.tags[tagName].data)) {
          if (val.name === tag) {
            obj.id = id;
            break;
          }
        }
        if (obj.id) {
          karteisuche.filterWerte.push(obj);
        } else {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
      } else if (typ === "Volltext") {
        // Volltext
        let text = document.getElementById(`karteisuche-volltext-${id}`).value;
        text = helfer.textTrim(text.replace(/[<>]+/g, ""), true);
        if (!text) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        const i = document.getElementById(`karteisuche-volltext-genau-${id}`).checked ? "" : "i";
        obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), i);
        karteisuche.filterWerte.push(obj);
      } else if (typ === "Tag") {
        // Tag
        obj.tagTyp = karteisuche.filterTagTyp(document.getElementById(`karteisuche-tag-typ-${id}`));
        obj.tagId = "";
        const tag = document.getElementById(`karteisuche-tag-${id}`).value;
        if (!obj.tagTyp || !tag) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        for (const [ id, val ] of Object.entries(optionen.data.tags[obj.tagTyp].data)) {
          if (val.name === tag) {
            obj.tagId = id;
            break;
          }
        }
        if (obj.tagId) {
          karteisuche.filterWerte.push(obj);
        } else {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
      } else if (typ === "Karteidatum") {
        // Karteidatum
        obj.typVal = document.getElementById(`karteisuche-datum-typ-${id}`).value;
        obj.dirVal = document.getElementById(`karteisuche-datum-dir-${id}`).value;
        obj.datumVal = document.getElementById(`karteisuche-datum-${id}`).value;
        if (obj.datumVal) { // falls kein korrektes Datum eingegeben wurde, ist der Wert leer
          karteisuche.filterWerte.push(obj);
        } else {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
      } else if (typ === "BearbeiterIn") {
        // BearbeiterIn
        let text = document.getElementById(`karteisuche-person-${id}`).value;
        text = helfer.textTrim(text, true);
        if (!text) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        obj.reg = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(text)), "i");
        karteisuche.filterWerte.push(obj);
      } else if (typ === "Redaktion") {
        // Redaktion
        let textEr = document.getElementById(`karteisuche-redaktion-ereignis-${id}`).value;
        let textPr = document.getElementById(`karteisuche-redaktion-person-${id}`).value;
        textEr = helfer.textTrim(textEr, true);
        textPr = helfer.textTrim(textPr, true);
        if (!textEr && !textPr) {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
        if (textEr) {
          obj.er = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textEr)), "i");
        }
        if (textPr) {
          obj.pr = new RegExp(helfer.formVariSonderzeichen(helfer.escapeRegExp(textPr)), "i");
        }
        obj.logik = document.getElementById(`karteisuche-redaktion-logik-${id}`).value;
        karteisuche.filterWerte.push(obj);
      } else if (typ === "Redaktionsdatum") {
        // Redaktionsdatum
        const vonVal = document.getElementById(`karteisuche-redaktionsdatum-von-${id}`).value;
        const bisVal = document.getElementById(`karteisuche-redaktionsdatum-bis-${id}`).value;
        if (vonVal && bisVal) {
          obj.von = new Date(vonVal);
          obj.bis = new Date(bisVal);
          karteisuche.filterWerte.push(obj);
        } else {
          karteisuche.filterIgnorieren(filter, true);
          continue;
        }
      }
      karteisuche.filterIgnorieren(filter, false);
    }
  },

  // markiert/demarkiert Filter, die ignoriert werden/wurden
  //   filter = Element
  //     (Input-Feld mit der Bezeichnung des Filtertyps)
  //   ignorieren = Boolean
  //     (Filter wird ignoriert bzw. nicht mehr ignoriert)
  filterIgnorieren (filter, ignorieren) {
    const p = filter.closest("p");
    if (ignorieren) {
      p.classList.add("karteisuche-ignoriert");
    } else {
      p.classList.remove("karteisuche-ignoriert");
    }
  },

  // String-Datensätze, die der Volltextfilter berücksichtigt
  // (für die Bedeutungen wird es komplizierter)
  filterVolltext: {
    datei: [ "no", "wo" ],
    redaktion: [ "bh", "nl", "no" ],
    karten: [ "au", "bl", "bs", "da", "kr", "no", "qu", "sy", "ts" ],
  },

  // überprüfen, ob eine Kartei zu den übergebenen Filtern passt
  //   datei = Object
  //     (die ZTJ-Datei, die gefiltert werden soll; also alle Karteidaten, in der üblichen Form)
  filtern (datei) {
    let be = datei.rd.be;
    if (!be) {
      // bis Dateiformat Version 12 standen die Bearbeiterinnen in data.be;
      // erst danach in data.rd.be
      be = datei.be;
    }
    let er = datei.rd.er;
    if (!er) {
      // bis Dateiformat Version 12 standen die Redaktionsereignisse in data.rd;
      // erst danach in data.rd.er
      er = datei.rd;
    }
    const redErg = new Set();
    document.querySelectorAll(".karteisuche-redaktion-ereignis").forEach(i => {
      redErg.add(helfer.formVariSonderzeichen(helfer.escapeRegExp(i.value)));
    });
    const redErgReg = new RegExp([ ...redErg ].join("|"), "i");
    forX: for (const filter of karteisuche.filterWerte) {
      if (filter.typ === "Karteiwort" &&
          !filter.reg.test(datei.wo)) {
        // Karteiwort
        return false;
      } else if (/^(Themenfeld|Sachgebiet)$/.test(filter.typ)) {
        // Themenfeld/Sachgebiet
        let gefunden = false;
        const keys = {
          Themenfeld: "tf",
          Sachgebiet: "sg",
        };
        if (datei.rd[keys[filter.typ]]) {
          // dieser Datensatz wurde erst mit Dateiformat Version 13 eingeführt;
          // davor existierte er nicht
          for (const i of datei.rd[keys[filter.typ]]) {
            if (i.id === filter.id) {
              gefunden = true;
              break;
            }
          }
        }
        if (!gefunden) {
          return false;
        }
      } else if (filter.typ === "Volltext") {
        // Volltext
        // Datenfelder Kartei
        for (const ds of karteisuche.filterVolltext.datei) {
          if (filter.reg.test(datei[ds])) {
            continue forX;
          }
        }
        // Datenfelder Redaktion
        for (const ds of karteisuche.filterVolltext.redaktion) {
          if (filter.reg.test(datei.rd[ds])) {
            continue forX;
          }
        }
        // Datenfelder Karteikarten
        for (const ds of karteisuche.filterVolltext.karten) {
          for (const val of Object.values(datei.ka)) {
            let text_rein = val[ds];
            if (ds === "bs") {
              text_rein = liste.belegTrennungWeg(text_rein, true);
            }
            if (filter.reg.test(text_rein)) {
              continue forX;
            }
          }
        }
        // Bedeutungen
        for (const val of Object.values(datei.bd.gr)) {
          const { bd } = val;
          for (const i of bd) {
            const bedeutung = i.bd[i.bd.length - 1];
            if (filter.reg.test(bedeutung)) {
              continue forX;
            }
          }
        }
        return false;
      } else if (filter.typ === "Tag") {
        // Tag
        let gefunden = false;
        forTag: for (const val of Object.values(datei.bd.gr)) {
          const { bd } = val;
          for (const i of bd) {
            for (const j of i.ta) {
              if (j.ty === filter.tagTyp &&
                  j.id === filter.tagId) {
                gefunden = true;
                break forTag;
              }
            }
          }
        }
        if (!gefunden) {
          return false;
        }
      } else if (filter.typ === "Karteidatum") {
        // Karteidatum
        const ds = filter.typVal === "erstellt" ? "dc" : "dm";
        const lt = filter.dirVal === "<=";
        const datum = new Date(filter.datumVal);
        const datumDatei = new Date(datei[ds].split("T")[0]);
        if (lt && datumDatei > datum ||
            !lt && datumDatei < datum) {
          return false;
        }
      } else if (filter.typ === "BearbeiterIn" &&
          !hasSome(be, filter.reg)) {
        // BearbeiterIn
        return false;
      } else if (filter.typ === "Redaktion") {
        // Redaktion
        for (const i of er) {
          const gefunden = {
            er: filter.er && filter.er.test(i.er),
            pr: filter.pr && filter.pr.test(i.pr),
          };
          const treffer = filter.er && filter.pr && gefunden.er && gefunden.pr ||
              filter.er && !filter.pr && gefunden.er ||
              !filter.er && filter.pr && gefunden.pr;
          if (treffer && filter.logik === "=") {
            continue forX;
          } else if (treffer && filter.logik !== "=") {
            return false;
          }
        }
        if (filter.logik !== "=") {
          continue;
        }
        return false;
      } else if (filter.typ === "Redaktionsdatum") {
        // Redaktionsdatum
        let inRange = false;
        for (const i of er) {
          if (redErg.size && !redErgReg.test(i.er)) {
            continue;
          }
          const da = new Date(i.da);
          if (da >= filter.von && da <= filter.bis) {
            inRange = true;
            break;
          }
        }
        if (!inRange) {
          return false;
        }
        continue;
      }
    }
    return true;
    // testet, ob die Bedingungen zutreffen
    // (ausgelagert, damit die Funktionen nicht in der Schleife sind)
    //   arr = Array
    //     (hier wird gesucht)
    //   reg = RegExp
    //     (regulärer Ausdruck, mit dem gesucht wird)
    function hasSome (arr, reg) {
      return arr.some(v => reg.test(v));
    }
  },

  // aktuelle Filterkonfiguration in den Optionen speichern
  filterSpeichern () {
    optionen.data.karteisuche.filter = [];
    for (const filter of document.querySelectorAll(".karteisuche-filter")) {
      const inputs = filter.parentNode.parentNode.querySelectorAll("input");
      const filterDaten = [];
      for (const i of inputs) {
        if (i.type === "checkbox") {
          filterDaten.push(i.checked);
        } else {
          filterDaten.push(i.value);
        }
      }
      optionen.data.karteisuche.filter.push(filterDaten);
    }
    optionen.speichern();
  },

  // in den Optionen gespeicherte Filter wiederherstellen
  filterWiederherstellen () {
    for (let i = optionen.data.karteisuche.filter.length - 1; i >= 0; i--) {
      const werte = optionen.data.karteisuche.filter[i];
      // Korrektur Redaktionsfilter
      // (ab Version 0.32.0 gibt es ein Logikfeld: = | !=)
      if (werte[0] === "Redaktion" && werte.length === 3) {
        werte.splice(1, 0, "=");
      }
      // neuen Absatz erzeugen
      karteisuche.filterHinzufuegen(false);
      const typ = document.querySelector("#karteisuche-filter input");
      typ.value = werte[0];
      // Filterfelder einhängen
      karteisuche.filterFelder(typ.id);
      // Filterfelder füllen
      const inputs = document.querySelectorAll("#karteisuche-filter p:first-child input");
      for (let j = 1, len = werte.length; j < len; j++) {
        if (helfer.checkType("Boolean", werte[j])) {
          inputs[j].checked = werte[j];
        } else {
          inputs[j].value = werte[j];
        }
      }
    }
  },

  // Ansicht der Filter umschalten
  filterUmschalten () {
    const filter = document.getElementById("karteisuche-filterblock");
    let hoehe = 0;
    if (filter.classList.contains("aus")) {
      filter.classList.remove("aus");
      hoehe = filter.scrollHeight;
      helfer.elementMaxHeight({
        ele: document.getElementById("karteisuche-karteien"),
      });
      filter.classList.add("blenden");
      filter.style.height = "0px";
      filter.style.paddingTop = "0px";
      setTimeout(() => {
        filter.style.height = `${hoehe}px`;
        filter.style.paddingTop = "10px";
      }, 0);
      setTimeout(() => {
        filter.classList.remove("blenden");
        filter.removeAttribute("style");
      }, 300);
    } else {
      filter.classList.add("blenden");
      filter.style.height = `${filter.scrollHeight}px`;
      filter.style.paddingTop = "10px";
      setTimeout(() => {
        filter.style.height = "0px";
        filter.style.paddingTop = "0px";
      }, 0);
      setTimeout(() => {
        filter.classList.add("aus");
        filter.classList.remove("blenden");
        filter.removeAttribute("style");
        helfer.elementMaxHeight({
          ele: document.getElementById("karteisuche-karteien"),
        });
      }, 300);
    }
  },

  // Animation, dass die Karteisuche läuft
  //   anschalten = Boolean
  //     (die Animation soll angeschaltet werden)
  animation (anschalten) {
    const sperrbild = document.getElementById("karteisuche-suche-laeuft");
    // Animation soll ausgeschaltet werden
    if (!anschalten) {
      clearInterval(karteisuche.animationStatus.interval);
      sperrbild.classList.add("aus");
      return;
    }
    // Animation soll angeschaltet werden
    karteisuche.animationStatus.punkte = 3;
    karteisuche.animationStatus.interval = setInterval(() => karteisuche.animationRefresh(), 500);
    karteisuche.animationRefresh();
    sperrbild.classList.remove("aus");
  },

  // Status-Informationen für die Animation
  animationStatus: {
    punkte: 3,
    interval: null,
  },

  // Text in der Animation auffrischen
  animationRefresh () {
    const span = document.querySelector("#karteisuche-suche-laeuft span");
    const status = karteisuche.animationStatus;
    span.textContent = ".".repeat(status.punkte);
    if (status.punkte === 3) {
      status.punkte = 1;
    } else {
      status.punkte++;
    }
  },
};
