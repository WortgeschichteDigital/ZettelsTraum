"use strict";

const kopieren = {
  // speichert, ob der Kopiermodus an ist
  an: false,

  // speichert die IDs der Karten, die zum Kopieren ausgewählt wurden
  belege: [],

  // Kopier-Prozess initialisieren
  init () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Kopieren</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Ist die Funktion schon an?
    if (kopieren.an) {
      kopieren.liste();
      return;
    }
    // Funktion anstellen
    kopieren.uiOn();
  },

  // User-Interface einblenden
  uiOn () {
    kopieren.an = true;
    // UI aufbauen
    document.getElementById("kopieren-aussen").classList.remove("aus");
    kopieren.uiText();
    // Icon im Kopf der Karteikarte einblenden
    document.getElementById("beleg-link-kopieren").classList.remove("aus");
    // Icon im Kopf der Belegliste einblenden
    const listeLink = document.getElementById("liste-link-kopieren");
    listeLink.classList.remove("aus");
    listeLink.nextSibling.classList.remove("kopieren-aus");
    // Icons im Listenkopf einblenden
    document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.remove("aus"));
  },

  // User-Interface ausblenden
  //   fragen = Booleadn
  //     (vor dem Beenden der Funktion sollte nachgefragt werden)
  uiOff (fragen = true) {
    if (fragen && kopieren.belege.length) {
      dialog.oeffnen({
        typ: "confirm",
        text: "Soll die Kopierfunktion wirklich beendet werden?\nDie Liste der zu kopierenden Belege wird dabei geleert.",
        callback: () => {
          if (dialog.antwort) {
            off();
          }
        },
      });
      return;
    }
    off();
    // Kopierfunktion wirklich schließen
    function off () {
      kopieren.an = false;
      // Belegliste leeren (wichtig, damit andere Funktionen wissen,
      // dass die Funktion nicht mehr aktiv ist)
      kopieren.belege = [];
      // UI ausblenden
      document.getElementById("kopieren-aussen").classList.add("aus");
      // Icon im Kopf der Karteikarte ausblenden
      document.getElementById("beleg-link-kopieren").classList.add("aus");
      // Icon im Kopf der Belegliste ausblenden
      const listeLink = document.getElementById("liste-link-kopieren");
      listeLink.classList.add("aus");
      listeLink.nextSibling.classList.add("kopieren-aus");
      // Icons im Listenkopf ausblenden
      document.querySelectorAll(".liste-kopf .icon-kopieren").forEach(a => a.classList.add("aus"));
      // ggf. Listenfenster schließen
      overlay.schliessen(document.getElementById("kopieren-liste"));
    }
  },

  // trägt den Text in UI-Feld ein
  uiText () {
    let text = kopieren.belege.length.toString();
    if (text === "0") {
      text = "";
    }
    document.getElementById("kopieren").textContent = text;
  },

  // Klickfunktion für die Anker in der Belegliste
  //   a = Element
  //     (das Kopier-Icon im Belegkopf)
  addListe (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      kopieren.add(this.parentNode.dataset.id);
    });
  },

  // Klickfunktion für den Anker im Kopf der Belegliste
  //   a = Element
  //     (das Kopier-Icon im Listenkopf)
  addListeAlle (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      document.querySelectorAll(".liste-kopf").forEach(function (i) {
        const id = i.dataset.id;
        if (kopieren.belege.includes(id)) {
          return;
        }
        kopieren.add(id);
      });
    });
  },

  // Beleg aus der offenen Karte zur Liste hinzufügen
  // (besser wenn in Funktion, weil das Ganze von mehreren Orten aufgerufen wird)
  addKarte () {
    kopieren.add(beleg.id_karte.toString());
  },

  // Beleg zur Kopierliste hinzufügen
  //   id = String
  //     (ID der Karteikarte/des Belegs)
  add (id) {
    if (kopieren.belege.includes(id)) {
      dialog.oeffnen({
        typ: "alert",
        text: `<i>${liste.detailAnzeigenH3(id)}</i> ist schon in der Liste der zu kopierenden Belege.`,
      });
      return;
    }
    kopieren.belege.push(id);
    kopieren.uiText();
    helfer.animation("liste");
  },

  // Fenster mit Belegliste öffnen
  liste () {
    overlay.oeffnen(document.getElementById("kopieren-liste"));
    kopieren.listeAufbauen();
    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("kopieren-liste-cont"),
    });
  },

  // Belegliste aufbauen
  listeAufbauen () {
    // Liste leeren
    const cont = document.getElementById("kopieren-liste-cont");
    cont.replaceChildren();
    // keine Belege zum Kopieren vorgemerkt
    if (!kopieren.belege.length) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("keine");
      p.textContent = "keine Belege ausgewählt";
      return;
    }
    // Liste mit Belegen füllen
    for (const id of kopieren.belege) {
      const p = document.createElement("p");
      cont.appendChild(p);
      // Entfernen-Icon
      let a = document.createElement("a");
      p.appendChild(a);
      a.dataset.id = id;
      a.href = "#";
      a.classList.add("icon-link", "icon-entfernen");
      kopieren.listeEntfernen(a);
      // Text
      a = document.createElement("a");
      p.appendChild(a);
      a.href = "#";
      a.dataset.id = id;
      a.textContent = liste.detailAnzeigenH3(id);
      anhaenge.belegOeffnen(a);
    }
  },

  // Beleg aus der Liste entfernen
  //   a = Element
  //     (das Entfernen-Icon vor dem Beleg in der Liste)
  listeEntfernen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      kopieren.belege.splice(kopieren.belege.indexOf(this.dataset.id), 1);
      kopieren.uiText();
      kopieren.listeAufbauen();
    });
  },

  // alle Belege aus der Liste entfernen
  listeLeeren () {
    // keine Belege in der Liste
    if (!kopieren.belege.length) {
      return;
    }
    // Sicherheitsfrage
    dialog.oeffnen({
      typ: "confirm",
      text: "Soll die Liste der zu kopierenden Belege wirklich geleert werden?",
      callback: () => {
        if (dialog.antwort) {
          kopieren.belege = [];
          kopieren.uiText();
          kopieren.listeAufbauen();
        }
      },
    });
  },

  // Overlay-Fenster zum Einfügen der Belege öffnen
  einfuegen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Einfügen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Overlay-Fenster öffnen
    overlay.oeffnen(document.getElementById("kopieren-einfuegen"));
    // zuvor geladene Belegedatei löschen
    kopieren.belegedatei = [];
    // Datenfelder abhaken
    document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function (i) {
      const feld = i.id.replace(/.+-/, "");
      i.checked = optionen.data.kopieren[feld];
    });
    // Basisdaten anfragen und eintragen
    kopieren.einfuegenBasisdaten(false);
    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("kopieren-einfuegen-over"),
    });
  },

  // Listener für das Abhaken der Datenfelder
  //   input = Element
  //     (eine Checkbox in der Datenfelder-Liste)
  einfuegenDatenfelder (input) {
    input.addEventListener("input", function () {
      const feld = this.id.replace(/.+-/, "");
      if (/^(bs|da|qu)$/.test(feld)) {
        this.checked = true;
        dialog.oeffnen({
          typ: "alert",
          text: "Die Datenfelder Datum, Beleg und Quelle müssen zwingend importiert werden.",
        });
        return;
      }
      optionen.data.kopieren[feld] = !optionen.data.kopieren[feld];
      optionen.speichern();
    });
  },

  // Basisdaten der Karteien, aus denen Belege eingefügt werden können, anfordern
  //   animation = Boolean
  //     (der Reload-Button soll animiert werden)
  einfuegenBasisdaten (animation) {
    modules.ipc.send("kopieren-basisdaten", winInfo.winId);
    if (animation) {
      document.getElementById("kopieren-einfuegen-reload").classList.add("rotieren-bitte");
    }
  },

  // Zwischenspeicher für die Basisdaten der einfügbaren Belege
  //   "ID" (ID des Fensters, von dem die Daten stammen)
  //     belege (Number; Anzahl der Belege, die kopiert werden können)
  //     gerueste (Array; eindimensional mit Strings gefüllt; die Strings = IDs der Bedeutungsgerüste)
  //     wort (String; das Karteiwort)
  basisdaten: {},

  // Zwischenspeicher für die Daten der geladenen Belegedatei
  belegedatei: [],

  // Zwischenspeicher für die in der Zwischenablage gefundenen Daten
  zwischenablage: [],

  // Daten eintragen, die angeboten werden
  //   daten = Object
  //     (Objekt mit Informationen zu den Daten, die kopiert werden können)
  einfuegenBasisdatenEintragen (daten) {
    kopieren.basisdaten = daten; // Struktur der Daten in kopieren.basidatenSenden()
    const cont = document.getElementById("kopieren-einfuegen-daten");
    cont.replaceChildren();
    // Zwischenablage auf Daten überprüfen
    kopieren.einfuegenParseClipboard();
    // keine Belegquellen
    if (!Object.keys(daten).length &&
        !kopieren.belegedatei.length &&
        !kopieren.zwischenablage.length) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("keine");
      p.textContent = "keine Belegquellen gefunden";
      kopieren.einfuegenBasisdatenBedeutungen("");
      return;
    }
    // ggf. die Belegedatei hinzufügen
    if (kopieren.belegedatei.length) {
      daten.belegedatei = {
        belege: kopieren.belegedatei.length,
        gerueste: [],
        wort: "Belegedatei",
      };
      for (const beleg of kopieren.belegedatei) {
        for (const bd of beleg.bd) {
          if (!daten.belegedatei.gerueste.includes(bd.gr)) {
            daten.belegedatei.gerueste.push(bd.gr);
          }
        }
      }
      daten.belegedatei.gerueste.sort();
    }
    // ggf. die Zwischenablage hinzufügen
    if (kopieren.zwischenablage.length) {
      daten.zwischenablage = {
        belege: 1,
        gerueste: [],
        wort: "Zwischenablage",
      };
      for (const bd of kopieren.zwischenablage[0].bd) {
        if (!daten.zwischenablage.gerueste.includes(bd.gr)) {
          daten.zwischenablage.gerueste.push(bd.gr);
        }
      }
      daten.zwischenablage.gerueste.sort();
    }
    // Datensätze sortieren;
    const ds = Object.keys(daten);
    ds.sort(function (a, b) {
      if (a === "belegedatei") {
        return -1;
      } else if (b === "belegedatei") {
        return 1;
      }
      if (a === "zwischenablage") {
        return -1;
      } else if (b === "zwischenablage") {
        return 1;
      }
      const x = [ a, b ];
      x.sort();
      if (x[0] === a) {
        return -1;
      }
      return 1;
    });
    // Belegquellen aufbauen
    let ausgewaehlt = false;
    let id_aktiv = "";
    for (let i = 0, len = ds.length; i < len; i++) {
      const id = ds[i];
      // Absatz
      const p = document.createElement("p");
      cont.appendChild(p);
      kopieren.einfuegenDatensatzWaehlen(p);
      // Input
      const input = document.createElement("input");
      p.appendChild(input);
      input.id = `kopieren-kartei-${id}`;
      input.type = "radio";
      input.value = id;
      if (!ausgewaehlt) {
        input.checked = true;
        ausgewaehlt = true;
        id_aktiv = id;
      }
      // Wort
      if (/^[0-9]+$/.test(id)) {
        const i = document.createElement("i");
        i.textContent = daten[id].wort;
        p.appendChild(i);
      } else {
        p.appendChild(document.createTextNode(daten[id].wort));
      }
      // Belege
      let num = "Beleg";
      if (daten[id].belege > 1) {
        num = "Belege";
      }
      p.appendChild(document.createTextNode(` (${daten[id].belege} ${num})`));
    }
    // Importformular für Bedeutungen aufbauen
    kopieren.einfuegenBasisdatenBedeutungen(id_aktiv);
  },

  // die Zwischenablage überprüfen, ob in ihr ein Beleg steckt
  einfuegenParseClipboard () {
    kopieren.zwischenablage = [];
    // Clipboard auslesen
    const cb = modules.clipboard.readText();
    // versuchen den Text im Clipboard zu parsen
    let daten = {};
    try {
      daten = JSON.parse(cb);
    } catch (err) {
      return;
    }
    // der Text konnte offenbar geparst werden => ZTB-Daten?
    if (daten.typ !== "ztb") {
      return;
    }
    // Stammen die Daten aus diesem Fenster?
    if (daten.winId === winInfo.winId && daten.wort === kartei.wort) {
      return;
    }
    // Die Daten sind offenbar okay!
    kopieren.zwischenablage.push(daten);
  },

  // wählt den Datensatz aus, für den der angeklickte Absatz steht
  //   ele = Element
  //     (der Absatz, hinter dem sich der Datensatz verbirgt)
  einfuegenDatensatzWaehlen (ele) {
    ele.addEventListener("click", function () {
      const ps = document.querySelectorAll("#kopieren-einfuegen-daten p");
      let id_aktiv = "";
      for (const p of ps) {
        const input = p.querySelector("input");
        if (p === this) {
          input.checked = true;
          id_aktiv = input.value;
        } else {
          input.checked = false;
        }
      }
      kopieren.einfuegenBasisdatenBedeutungen(id_aktiv);
    });
  },

  // Importformular für die Bedeutungen
  //   id_aktiv = String
  //     (ID des aktiven Datensatzes, kann leer sein)
  einfuegenBasisdatenBedeutungen (id_aktiv) {
    const cont = document.getElementById("kopieren-einfuegen-bedeutungen");
    cont.replaceChildren();
    // Gerüste ermitteln
    let gerueste = [];
    if (id_aktiv) {
      gerueste = kopieren.basisdaten[id_aktiv].gerueste;
    }
    // es könnte sein, dass die ausgewählten Belege keine Bedeutungen haben =>
    // dann werden auch keine Bedeutungsgerüste gefunden
    if (!gerueste.length) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("keine");
      p.textContent = "keine Bedeutungen gefunden";
      return;
    }
    // Tabelle erzeugen
    const table = document.createElement("table");
    cont.appendChild(table);
    for (let i = 0, len = gerueste.length; i < len; i++) {
      const id = gerueste[i];
      const tr = document.createElement("tr");
      table.appendChild(tr);
      // Gerüst-ID
      let td = document.createElement("td");
      tr.appendChild(td);
      td.textContent = `Gerüst ${id}`;
      // Pfeil
      td = document.createElement("td");
      tr.appendChild(td);
      const img = document.createElement("img");
      td.appendChild(img);
      img.src = "img/pfeil-gerade-rechts.svg";
      img.width = "24";
      img.height = "24";
      // Dropdown
      td = document.createElement("td");
      tr.appendChild(td);
      td.classList.add("dropdown-cont");
      const input = document.createElement("input");
      td.appendChild(input);
      input.classList.add("dropdown-feld");
      input.id = `kopieren-geruest-${id}`;
      input.readOnly = true;
      input.title = "Bedeutungsgerüst auswählen";
      input.type = "text";
      if (i === 0) {
        input.value = "Gerüst 1";
      } else {
        input.value = "kein Import";
      }
      dropdown.feld(input);
      const a = dropdown.makeLink("dropdown-link-td", "Bedeutungsgerüst auswählen");
      td.appendChild(a);
    }
    tooltip.init(cont);
  },

  // Einfügen aus der gewünschten Datenquelle wird angestoßen
  einfuegenAusfuehren () {
    // ermitteln, aus welcher Quelle eingefügt werden soll
    const quellen = document.querySelectorAll("#kopieren-einfuegen-daten input");
    let quelle = "";
    for (const i of quellen) {
      if (i.checked) {
        quelle = i.value;
        break;
      }
    }
    // keine Belegquellen vorhanden
    if (!quelle) {
      dialog.oeffnen({
        typ: "alert",
        text: "Beim Kopieren der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nEs gibt keine Belegquelle, die Belege zum Einfügen liefern könnte.",
      });
      return;
    }
    // Quelle = Zwischenablage oder Belegedatei
    if (!/^[0-9]+$/.test(quelle)) {
      kopieren.einfuegenEinlesen(kopieren[quelle]);
      return;
    }
    // Quelle = Fenster
    modules.ipc.send("kopieren-daten", parseInt(quelle, 10), winInfo.winId);
  },

  // die übergebenen Daten werden eingelesen
  // (wird auch für zum Duplizieren von Belegen genutzt)
  //   daten = Array
  //     (in jedem Slot ist eine Zettelkopie, wie sie in kopieren.datenBeleg() erstellt wird)
  //   duplikat = true | undefined
  //     (der übergebene Beleg soll dupliziert werden)
  async einfuegenEinlesen (daten, duplikat = false) {
    // Bedeutungsmapper (welche Bedeutungen in welche Gerüste kommen)
    const bdMap = {};
    if (duplikat) {
      Object.keys(data.bd.gr).forEach(function (i) {
        bdMap[i] = i;
      });
    } else {
      document.querySelectorAll("#kopieren-einfuegen-bedeutungen input").forEach(i => {
        const idQuelle = i.id.replace(/.+-/, "");
        // idZiel bleibt leer, wenn das Gerüst nicht importiert werden soll
        let idZiel = "";
        const wert = i.value.match(/^Gerüst ([0-9]+)/);
        if (wert) {
          idZiel = wert[1];
        }
        bdMap[idQuelle] = idZiel;
      });
    }

    // Datenfelder ermitteln, die importiert werden sollen
    const ds = [ "bx" ]; // "bs" (Beleg) wird immer importiert => Beleg-XML auch immer importieren
    document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(function (i) {
      if (!i.checked && !duplikat) {
        return;
      }
      ds.push(i.id.replace(/.+-/, ""));
    });

    // neue Karten anlegen
    let id_karte_duplikat = 0;
    for (let i = 0, len = daten.length; i < len; i++) {
      // eine neue Karte erzeugen
      const id_karte = beleg.idErmitteln();
      if (duplikat) { // ID für das spätere Öffnen der Karteikarte zwischenspeichern (falls duplizieren aus Karteikarte heraus)
        id_karte_duplikat = id_karte;
      }
      if (len === 1) { // wird nur ein Beleg kopiert, kann er nach dem Aufbau der Belegliste hervorgehoben werden
        liste.statusNeu = id_karte.toString();
      }
      data.ka[id_karte] = beleg.karteErstellen();
      // die Karte mit den gewünschten Datensätzen füllen
      for (let j = 0, len = ds.length; j < len; j++) {
        if (typeof daten[i][ds[j]] === "undefined") {
          // falls ein Datensatz, der importiert werden soll, nicht vorhanden ist
          continue;
        }
        if (ds[j] === "bd") { // Bedeutungen
          for (const k of daten[i].bd) {
            // Sind keine Bedeutungen eingetragen, wird diese Schleife einfach nicht ausgeführt.
            // Sollen Bedeutungen aus diesem Gerüst überhaupt importiert werden?
            //   k.gr = String (die ID des Bedeutungsgerüsts in der Quell-Kartei)
            //   k.bd = Array (identisch mit data.bd.gr[ID].bd[n].bd)
            if (!bdMap[k.gr]) {
              continue;
            }

            // Bedeutung im Gerüst suchen
            const gr = data.bd.gr[bdMap[k.gr]];
            const kBd = k.bd.join("|");
            let id = 0;
            for (const b of gr.bd) {
              if (b.bd.join("|") === kBd) {
                id = b.id;
                break;
              }
            }

            // Bedeutung noch nicht vorhanden
            if (!id) {
              // ggf. ID-Generator initialisieren
              if (!bedeutungen.makeId) {
                bedeutungen.idInit(gr);
              }

              // Bedeutung einhängen
              id = addBd(gr, k.bd);
            }

            // Bedeutung in Karte ergänzen
            data.ka[id_karte].bd.push({
              gr: bdMap[k.gr],
              id,
            });
          }
        } else if (Array.isArray(daten[i][ds[j]])) { // eindimensionale Arrays
          data.ka[id_karte][ds[j]] = [ ...daten[i][ds[j]] ];
        } else { // Primitiven
          data.ka[id_karte][ds[j]] = daten[i][ds[j]];
        }
      }
      // Speicherdatum ergänzen
      data.ka[id_karte].dm = new Date().toISOString();
    }

    // Änderungsmarkierung
    kartei.karteiGeaendert(true);

    // die folgenden Operationen sind fast alle unnötig, wenn ein Beleg dupliziert wurde
    if (duplikat) {
      liste.status(true); // Liste und Filter neu aufbauen
      helfer.animation("duplikat");
      return id_karte_duplikat;
    }

    // BedeutungsgerüstFenster auffrischen
    bedeutungenWin.daten();

    // Liste und Filter neu aufbauen, Liste anzeigen
    liste.status(true);
    await liste.wechseln();

    // Einfüge-Fenster ggf. schließen
    if (optionen.data.einstellungen["einfuegen-schliessen"]) {
      overlay.schliessen(document.getElementById("kopieren-einfuegen"));
    }

    // Feedback anzeigen
    helfer.animation("einfuegen");

    // neue Bedeutung im Bedeutungsgerüst einfügen
    //   gr = Object
    //     (Bedeutungsgerüst)
    //   kBd = Array
    //     (neue Bedeutung)
    function addBd (gr, kBd) {
      let slice = 1;
      let arr = kBd.slice(0, slice);
      let arrVor = [];
      let arrTmpVor = [];
      let pos = -1;

      // 1) Position (initial) und Slice finden
      for (let i = 0, len = gr.bd.length; i < len; i++) {
        const arrTmp = gr.bd[i].bd.slice(0, slice);
        if (arrTmp.join("|") === arr.join("|")) {
          pos = i;
          // passender Zweig gefunden
          if (slice === kBd.length) {
            // hier geht es nicht weiter
            break;
          } else {
            // weiter in die Tiefe wandern
            arrVor = [ ...arr ];
            arrTmpVor = [ ...arrTmp ];
            slice++;
            arr = kBd.slice(0, slice);
          }
        } else if (arrVor.join("|") !== arrTmpVor.join("|")) {
          // jetzt bin ich zu weit: ein neuer Zweig beginnt
          break;
        }
      }

      // 2) Position korrigieren
      //    (hoch zum Slot, an dessen Stelle eingefügt wird)
      if (pos === -1 || pos === gr.bd.length - 1) {
        // Sonderregel: die Bedeutung muss am Ende eingefügt werden
        pos = gr.bd.length;
      } else {
        let i = pos;
        const len = gr.bd.length;
        do {
          // diese Schleife muss mindestens einmal durchlaufen;
          // darum keine gewöhnliche for-Schleife
          i++;
          if (!gr.bd[i] || gr.bd[i].bd.length <= arrVor.length) {
            pos = i;
            break;
          }
        } while (i < len);
      }

      // 3) jetzt kann eingehängt werden
      //    (die nachfolgenden Slots rutschen allen um einen hoch)
      const bdAdd = kBd.slice(slice - 1);
      for (let i = 0, len = bdAdd.length; i < len; i++) {
        const bd = arrVor.concat(bdAdd.slice(0, i + 1));
        gr.bd.splice(pos + i, 0, bedeutungen.konstitBedeutung(bd));
      }

      // Zählung auffrischen
      bedeutungen.konstitZaehlung(gr.bd, gr.sl);

      // ID zurückgeben
      return gr.bd.at(-1).id;
    }
  },

  // Basisdaten über die Belegmenge und das Fenster an den Main-Prozess senden
  basisdatenSenden () {
    const daten = {
      id: winInfo.winId,
      wort: kartei.titel,
      belege: kopieren.belege.length,
      gerueste: Object.keys(data.bd.gr),
    };
    modules.ipc.send("kopieren-basisdaten-lieferung", daten);
  },

  // alle Belegdaten an den Main-Prozess senden
  datenSenden () {
    const daten = [];
    for (const id of kopieren.belege) {
      daten.push(kopieren.datenBeleg(data.ka[id]));
    }
    modules.ipc.send("kopieren-daten-lieferung", daten);
  },

  // fertigt eine Kopie des übergebenen Belegs an
  //   quelle = Object
  //     (Datenquelle des Belegs)
  datenBeleg (quelle) {
    const kopie = structuredClone(quelle);
    delete kopie.dc;
    delete kopie.dm;
    const bd = [];
    for (const b of quelle.bd) {
      const bed = data.bd.gr[b.gr].bd.find(i => i.id === b.id);
      bd.push({
        bd: [ ...bed.bd ],
        gr: b.gr,
      });
    }
    kopie.bd = bd;
    return kopie;
  },

  // Kopierliste in Datei exportieren
  async exportieren () {
    // keine Belege in der Kopierliste
    if (!kopieren.belege.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keine Belege ausgewählt.",
      });
      return;
    }
    // Daten zusammentragen
    const daten = {
      bl: [],
      ty: "ztb",
      ve: 3,
    };
    for (const id of kopieren.belege) {
      daten.bl.push(kopieren.datenBeleg(data.ka[id]));
    }
    // Daten in Datei speichern
    let num = "Belege";
    if (kopieren.belege.length === 1) {
      num = "Beleg";
    }
    const opt = {
      title: "Belege exportieren",
      defaultPath: modules.path.join(appInfo.documents, `${kartei.titel}, ${kopieren.belege.length} ${num}.ztb`),
      filters: [
        {
          name: `${appInfo.name} Belege`,
          extensions: [ "ztb" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
    };
    // Dialog anzeigen
    const result = await modules.ipc.invoke("datei-dialog", {
      open: false,
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
    // Datei schreiben
    const ergebnis = await io.schreiben(result.filePath, JSON.stringify(daten));
    // beim Speichern ist ein Fehler aufgetreten
    if (ergebnis !== true) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Speichern der Belege ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${ergebnis.name}: ${ergebnis.message}</p>`,
      });
      throw ergebnis;
    }
  },

  // Kopierliste aus Datei importieren
  async importieren () {
    const opt = {
      title: "Belege importieren",
      defaultPath: appInfo.documents,
      filters: [
        {
          name: `${appInfo.name} Belege`,
          extensions: [ "ztb" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
      properties: [ "openFile" ],
    };
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
    // Datei einlesen
    const content = await io.lesen(result.filePaths[0]);
    if (typeof content !== "string") {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${content.name}: ${content.message}</p>`,
      });
      throw content;
    }
    // Daten sind in Ordnung => Einleseoperationen durchführen
    let belegedatei_tmp = {};
    try {
      belegedatei_tmp = JSON.parse(content);
    } catch (err_json) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n${err_json.name}: ${err_json.message}`,
      });
      return;
    }
    if (belegedatei_tmp.ty !== "ztb") {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\nkeine <i>${appInfo.name} Belege</i>-Datei`,
      });
      return;
    }
    kopieren.belegedatei = belegedatei_tmp.bl;
    kopieren.einfuegenBasisdaten(true);
  },
};
