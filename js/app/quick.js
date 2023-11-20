"use strict";

const quick = {
  // Liste der Befehle
  icons: {
    "app-neues-fenster": {
      title: "App > Neues Fenster",
      short: "",
      img: "fenster-plus.svg",
    },
    "app-karteisuche": {
      title: "App > Karteisuche",
      short: "",
      img: "lupe.svg",
    },
    "app-einstellungen": {
      title: "App > Einstellungen",
      short: "",
      img: "zahnrad.svg",
    },
    "app-beenden": {
      title: "App > Beenden",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + Q`,
      img: "ausgang.svg",
    },
    "kartei-erstellen": {
      title: "Kartei > Erstellen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + E`,
      img: "dokument-plus.svg",
    },
    "kartei-oeffnen": {
      title: "Kartei > Öffnen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + O`,
      img: "oeffnen.svg",
    },
    "kartei-speichern": {
      title: "Kartei > Speichern",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + S`,
      img: "speichern.svg",
    },
    "kartei-speichern-unter": {
      title: "Kartei > Speichern unter",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + S`,
      img: "speichern-unter.svg",
    },
    "kartei-schliessen": {
      title: "Kartei > Schließen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + W`,
      img: "x-dick.svg",
    },
    "kartei-lemmata": {
      title: "Kartei > Lemmata",
      short: "",
      img: "lemmata.svg",
    },
    "kartei-formvarianten": {
      title: "Kartei > Formvarianten",
      short: "",
      img: "formvarianten.svg",
    },
    "kartei-notizen": {
      title: "Kartei > Notizen",
      short: "",
      img: "stift.svg",
    },
    "kartei-anhaenge": {
      title: "Kartei > Anhänge",
      short: "",
      img: "bueroklammer.svg",
    },
    "kartei-lexika": {
      title: "Kartei > Überprüfte Lexika",
      short: "",
      img: "buecher.svg",
    },
    "kartei-metadaten": {
      title: "Kartei > Metadaten",
      short: "",
      img: "zeilen-4,0.svg",
    },
    "kartei-bedeutungen": {
      title: "Kartei > Bedeutungsgerüst",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + B`,
      img: "geruest.svg",
    },
    "kartei-bedeutungen-wechseln": {
      title: "Kartei > Bedeutungsgerüst wechseln",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + ${tastatur.shortcutsTextAktuell("Alt")} + B`,
      img: "geruest-zahnrad.svg",
    },
    "kartei-bedeutungen-fenster": {
      title: "Kartei > Bedeutungsgerüst-Fenster",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + B`,
      img: "fenster.svg",
    },
    "kartei-suche": {
      title: "Kartei > Suche",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + F`,
      img: "lupe.svg",
    },
    "redaktion-metadaten": {
      title: "Redaktion > Metadaten",
      short: "",
      img: "zeilen-4,0.svg",
    },
    "redaktion-ereignisse": {
      title: "Redaktion > Ereignisse",
      short: "",
      img: "personen.svg",
    },
    "redaktion-literatur": {
      title: "Redaktion > Literatur",
      short: "",
      img: "buecher.svg",
    },
    "redaktion-wortinformationen": {
      title: "Redaktion > Wortinformationen",
      short: "",
      img: "kreis-info.svg",
    },
    "redaktion-xml": {
      title: "Redaktion > XML",
      short: "",
      img: "xml.svg",
    },
    "redaktion-xmlBelegeFenster": {
      title: "Redaktion > Belege in XML-Fenster",
      short: "",
      img: "xml.svg",
    },
    "belege-hinzufuegen": {
      title: "Belege > Hinzufügen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + N`,
      img: "dokument-plus.svg",
    },
    "belege-auflisten": {
      title: "Belege > Auflisten",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + L`,
      img: "liste-bullets.svg",
    },
    "belege-taggen": {
      title: "Belege > Taggen",
      short: "",
      img: "etikett.svg",
    },
    "belege-loeschen": {
      title: "Belege > Löschen",
      short: "",
      img: "muelleimer.svg",
    },
    "belege-kopieren": {
      title: "Belege > Kopieren",
      short: "",
      img: "kopieren.svg",
    },
    "belege-einfuegen": {
      title: "Belege > Einfügen",
      short: "",
      img: "einfuegen.svg",
    },
    "belege-zwischenablage": {
      title: "Belege > Belegtexte in Zwischenablage",
      short: "",
      img: "kopieren.svg",
    },
    "bearbeiten-rueckgaengig": {
      title: "Bearbeiten > Rückgängig",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + Z`,
      img: "pfeil-rund-links.svg",
    },
    "bearbeiten-wiederherstellen": {
      title: "Bearbeiten > Wiederherstellen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + Umsch + ${process.platform === "win32" ? "Y" : "Z"}`,
      img: "pfeil-rund-rechts.svg",
    },
    "bearbeiten-ausschneiden": {
      title: "Bearbeiten > Ausschneiden",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + X`,
      img: "schere.svg",
    },
    "bearbeiten-kopieren": {
      title: "Bearbeiten > Kopieren",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + C`,
      img: "kopieren.svg",
    },
    "bearbeiten-einfuegen": {
      title: "Bearbeiten > Einfügen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + V`,
      img: "einfuegen.svg",
    },
    "bearbeiten-alles-auswaehlen": {
      title: "Bearbeiten > Alles auswählen",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + A`,
      img: "auswaehlen.svg",
    },
    "ansicht-anzeige-vergroessern": {
      title: "Ansicht > Anzeige vergrößern",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + ${process.platform === "darwin" ? "=" : "+"}`,
      img: "plus-quadrat.svg",
    },
    "ansicht-anzeige-verkleinern": {
      title: "Ansicht > Anzeige verkleinern",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + -`,
      img: "minus-quadrat.svg",
    },
    "ansicht-standardgroesse": {
      title: "Ansicht > Standardgröße",
      short: `${tastatur.shortcutsTextAktuell("Strg")} + 0`,
      img: "fenster-standard.svg",
    },
    "ansicht-vollbild": {
      title: "Ansicht > Vollbild",
      short: `${process.platform === "darwin" ? "Ctrl + ⌘ + F" : "F11"}`,
      img: "fenster-vollbild.svg",
    },
    "hilfe-handbuch": {
      title: "Hilfe > Handbuch",
      short: "F1",
      img: "kreis-fragezeichen.svg",
    },
  },

  // Liste der Standard-Befehle
  iconsStandard: [ "app-beenden", "sep-1", "app-neues-fenster", "sep-2", "kartei-oeffnen", "kartei-speichern", "kartei-schliessen", "sep-3", "belege-hinzufuegen", "sep-4", "hilfe-handbuch" ],

  // Leiste aufbauen
  fill () {
    // Leiste leeren
    const bar = document.getElementById("quick");
    bar.replaceChildren();

    // ggf. veraltete Einträge in der Konfiguration umbenennen
    quick.amendItems();

    // Leiste füllen
    const del = [];
    for (const i of optionen.data.einstellungen["quick-icons"]) {
      // Spacer
      if (/^sep/?.test(i)) {
        const span = document.createElement("span");
        bar.appendChild(span);
        span.classList.add("quick-spacer");
        span.textContent = "\u00A0";
        continue;
      }
      // Icon
      const a = document.createElement("a");
      a.classList.add("icon-link");
      a.href = "#";
      let title;
      if (typeof i === "string") {
        // Standard-Icon
        a.id = `quick-${i}`;
        title = quick.icons[i].title;
        if (quick.icons[i].short) {
          title += ` (${quick.icons[i].short})`;
        }
      } else {
        // Einstellung
        if (!document.querySelector(`#${i.id}`)) {
          // Einstellung verschwunden => später entfernen
          del.push(i.id);
          continue;
        }
        a.classList.add(`quick-ein-${i.icon}`);
        a.dataset.id = i.id;
        title = "Einstellung\u00A0> " + quickEin.options[i.id].title;
      }
      a.title = title;
      a.textContent = "\u00A0";
      bar.appendChild(a);
    }
    tooltip.init(bar);

    // verschwundene Einstellungen entfernen
    if (del.length) {
      const opt = optionen.data.einstellungen["quick-icons"];
      for (const id of del) {
        const idx = opt.findIndex(i => i.id === id);
        opt.splice(idx, 1);
      }
      optionen.speichern();
    }

    // Events anhängen
    document.querySelectorAll("#quick a").forEach(a => {
      if (/^quick-(bearbeiten|ansicht)-/.test(a.id)) {
        quick.accessRoles(a);
      } else {
        quick.access(a);
      }
    });
  },

  // Leiste ein- oder ausschalten
  toggle () {
    const bar = document.getElementById("quick");

    // Leiste ein- oder ausblenden
    if (optionen.data.einstellungen.quick) {
      bar.classList.add("an");
    } else {
      bar.classList.remove("an");
    }

    // Icons in der Leiste von der Tab-Navigation ausschließen od. in sie einbeziehen
    bar.querySelectorAll("a").forEach(a => {
      if (optionen.data.einstellungen.quick) {
        a.removeAttribute("tabindex");
      } else {
        a.setAttribute("tabindex", "-1");
      }
    });

    // affizierte Elemente anpassen
    document.querySelectorAll("body > header, body > section").forEach(i => {
      if (optionen.data.einstellungen.quick) {
        i.classList.add("quick");
      } else {
        i.classList.remove("quick");
      }
    });
  },

  // Vorauswahl der Icons anwenden
  //   a = Element
  //     (der Link, der die Aktion triggert)
  preset (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();

      // Preset laden
      const preset = this.id.match(/.+-(.+)/)[1];
      if (preset === "alle") {
        optionen.data.einstellungen["quick-icons"] = Object.keys(quick.icons);
      } else if (preset === "keine") {
        optionen.data.einstellungen["quick-icons"] = [];
      } else if (preset === "standard") {
        optionen.data.einstellungen["quick-icons"] = [ ...quick.iconsStandard ];
      }

      // Listen neu aufbauen
      quick.fill();
      quick.fillConfig(true);

      // Optionen speichern
      optionen.speichern();
    });
  },

  // Klicks auf Icons der Leiste verteilen
  // (Icons der Kategorie Bearbeiten und Ansicht werden in quick.accessRoles() behandelt)
  //   a = Element
  //     (Icon-Link in der Leiste)
  access (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();

      // Quick-Access-Einstellung
      if (!this.id) {
        document.querySelector(`#${this.dataset.id}`).click();
        return;
      }

      // Befehle, die immer funktionieren
      const befehl = this.id.replace(/^quick-/, "");
      switch (befehl) {
        case "app-neues-fenster":
          modules.ipc.send("fenster-oeffnen");
          return;
        case "app-karteisuche":
          karteisuche.oeffnen();
          return;
        case "app-einstellungen":
          optionen.oeffnen();
          return;
        case "app-beenden":
          modules.ipc.send("app-beenden");
          return;
        case "kartei-erstellen":
          kartei.wortErfragen();
          return;
        case "kartei-oeffnen":
          kartei.oeffnen();
          return;
        case "redaktion-literatur":
          redLit.oeffnen();
          return;
        case "hilfe-handbuch":
          modules.ipc.send("hilfe-handbuch", "");
          return;
      }

      // Ist eine Kartei geöffnet?
      if (!kartei.wort) {
        dialog.oeffnen({
          typ: "alert",
          text: `Die Funktion <i>${quick.icons[befehl].title}</i> steht nur zur Verfügung, wenn eine Kartei geöffnet ist.`,
        });
        return;
      }

      // Befehle, die nur bei geöffneter Kartei zur Verfügung stehen
      switch (befehl) {
        case "kartei-speichern":
          kartei.speichern(false);
          break;
        case "kartei-speichern-unter":
          kartei.speichern(true);
          break;
        case "kartei-schliessen":
          kartei.schliessen();
          break;
        case "kartei-lemmata":
          lemmata.oeffnen();
          break;
        case "kartei-formvarianten":
          stamm.oeffnen();
          break;
        case "kartei-notizen":
          notizen.oeffnen();
          break;
        case "kartei-anhaenge":
          anhaenge.fenster();
          break;
        case "kartei-lexika":
          lexika.oeffnen();
          break;
        case "kartei-metadaten":
          meta.oeffnen();
          break;
        case "kartei-bedeutungen":
          bedeutungen.oeffnen();
          break;
        case "kartei-bedeutungen-wechseln":
          bedeutungenGeruest.oeffnen();
          break;
        case "kartei-bedeutungen-fenster":
          bedeutungenWin.oeffnen();
          break;
        case "kartei-suche":
          filter.suche();
          break;
        case "redaktion-metadaten":
          redMeta.oeffnen();
          break;
        case "redaktion-ereignisse":
          redaktion.oeffnen();
          break;
        case "redaktion-wortinformationen":
          redWi.oeffnen();
          break;
        case "redaktion-xml":
          redXml.oeffnen();
          break;
        case "redaktion-xmlBelegeFenster":
          xml.belegeInXmlFenster();
          break;
        case "belege-hinzufuegen":
          speichern.checkInit(() => beleg.erstellen());
          break;
        case "belege-auflisten":
          speichern.checkInit(() => liste.wechseln());
          break;
        case "belege-taggen":
          speichern.checkInit(() => belegeTaggen.oeffnen());
          break;
        case "belege-loeschen":
          speichern.checkInit(() => liste.loeschenAlleBelege());
          break;
        case "belege-kopieren":
          kopieren.init();
          break;
        case "belege-einfuegen":
          kopieren.einfuegen();
          break;
        case "belege-zwischenablage":
          liste.kopierenAlleBelege();
          break;
      }
    });
  },

  // speichert das Element, das vor einem Mousedown-Event aktiv war
  accessRolesActive: null,

  // Klicks auf Icons in der Leiste verteilen (Bearbeiten und Ansicht)
  //   a = Element
  //     (Icon-Link in der Leiste)
  accessRoles (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const befehl = this.id.replace(/^quick-/, "");
      const fokus = [ "bearbeiten-rueckgaengig", "bearbeiten-wiederherstellen", "bearbeiten-ausschneiden", "bearbeiten-kopieren", "bearbeiten-einfuegen", "bearbeiten-alles-auswaehlen" ];
      if (fokus.includes(befehl)) {
        quick.accessRolesActive.focus();
      }
      modules.ipc.invoke("quick-roles", befehl);
    });
  },

  // Konfigurationsanzeige im Einstellungen-Fenster aufbauen
  //   toTop = true | undefined
  //     (die Konfigurationsfelder nach oben scrollen
  fillConfig (toTop = false) {
    const contSelected = document.getElementById("quick-config-selected");
    const contSelectable = document.getElementById("quick-config-selectable");
    if (toTop) {
      contSelected.scrollTop = 0;
      contSelectable.scrollTop = 0;
    }
    contSelected.replaceChildren();
    contSelectable.replaceChildren();

    // ausgewählte Optionen aufbauen
    for (const i of optionen.data.einstellungen["quick-icons"]) {
      contSelected.appendChild(quick.fillConfigItem(i));
    }

    // auswählbare Optionen aufbauen
    contSelectable.appendChild(quick.fillConfigItem("sep"));
    contSelectable.appendChild(quick.fillConfigItem({}));
    for (const i of Object.keys(quick.icons)) {
      if (optionen.data.einstellungen["quick-icons"].includes(i)) {
        continue;
      }
      contSelectable.appendChild(quick.fillConfigItem(i));
    }

    // Events anhängen
    quick.eventsConfig();

    // Pfeile auffrischen
    quick.pfeile();
  },

  // Item für die Konfiguration im Einstellungen-Fenster erzeugen
  //   i = String | Object
  //     (Identifier des Items oder Objekt mit Daten zur verknüpften Einstellung)
  fillConfigItem (i) {
    const a = document.createElement("a");
    a.href = "#";
    a.dataset.icon = i;
    if (typeof i !== "string") {
      // Quick-Access-Einstellung
      a.dataset.icon = "ein";
      let icon;
      let text;
      if (!i.id) {
        // Platzhalter
        icon = "img/checkbox.svg";
        text = "Einstellung";
      } else {
        a.dataset.id = i.id;
        icon = `img/${quickEin.icons[i.icon - 1]}`;
        text = "Einstellung > " + quickEin.options[i.id].title;
      }
      const img = document.createElement("img");
      a.appendChild(img);
      img.src = icon;
      img.width = "24";
      img.height = "24";
      a.appendChild(document.createTextNode(text));
    } else if (/^sep/.test(i)) {
      // Separator
      const hr = document.createElement("hr");
      a.appendChild(hr);
    } else {
      // Bild
      const img = document.createElement("img");
      a.appendChild(img);
      img.src = `img/${quick.icons[i].img}`;
      img.width = "24";
      img.height = "24";
      // Text
      a.appendChild(document.createTextNode(quick.icons[i].title));
    }
    return a;
  },

  // Events an die Elemente in den Konfigurationsblöcken heften
  eventsConfig () {
    document.querySelectorAll("#quick-config a").forEach(a => {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const aktiv = quick.rmAktiv();
        if (aktiv !== this) {
          this.classList.add("aktiv");
        }
        quick.pfeile();
      });
    });
  },

  // aktives Element deaktivieren
  rmAktiv () {
    const aktiv = document.querySelector("#quick-config .aktiv");
    if (aktiv) {
      aktiv.classList.remove("aktiv");
    }
    return aktiv;
  },

  // Timeout für das Fokussieren des Items
  itemFocusTimeout: null,

  // führt die Bewegung eines Items durch
  //   dir = String
  //     (Bewegungsrichtung: hoch, rechts, runter, links)
  async moveConfig (dir) {
    // Bewegung erlaubt?
    if (!quick.pfeileAktiv[dir]) {
      return;
    }

    // Item bewegen
    const aktiv = document.querySelector("#quick-config .aktiv");
    const opt = optionen.data.einstellungen["quick-icons"];
    let icon = aktiv.dataset.icon;
    let idx;
    if (icon === "ein" && aktiv.dataset.id) {
      // Einstellung
      idx = opt.findIndex(i => i.id === aktiv.dataset.id);
      icon = { ...opt[idx] };
    } else {
      // Standard-Befehl oder Separator
      idx = opt.indexOf(icon);
    }
    if (dir === "hoch" || dir === "runter") {
      // Icon hoch/runter bewegen
      opt.splice(idx, 1);
      if (dir === "hoch") {
        opt.splice(idx - 1, 0, icon);
      } else {
        opt.splice(idx + 1, 0, icon);
      }
    } else if (/selected$/.test(aktiv.closest("div").id)) {
      // Icon entfernen
      opt.splice(idx, 1);
      if (/^sep/.test(icon)) { // sonst wird der Separator nicht gefunden
        icon = "sep";
      }
    } else {
      // Icon hinzufügen
      if (icon === "sep") {
        // Separatoren können mehrfach auftauchen,
        // müssen aber eindeutig ansprechbar sein
        let sepNr = 0;
        let sep;
        do {
          sepNr++;
          sep = document.querySelector(`#quick-config-selected [data-icon="sep-${sepNr}"]`);
        } while (sep);
        icon = `sep-${sepNr}`;
      } else if (icon === "ein") {
        quickEin.oeffnen();
        const selection = await new Promise(resolve => {
          const fenster = document.querySelector("#quick-ein");
          const intervall = setInterval(() => {
            if (fenster.classList.contains("aus")) {
              clearInterval(intervall);
              resolve(quickEin.selection);
            }
          }, 50);
        });
        if (!selection) {
          return;
        }
        // Einstellung ist schon aufgenommen
        if (opt.some(i => i.id === selection.id)) {
          dialog.oeffnen({
            typ: "alert",
            text: `Die Einstellung <i>${quickEin.options[selection.id].title}</i> wurde schon als Icon in der Quick-Access-Bar hinterlegt.`,
          });
          return;
        }
        icon = selection;
      }
      opt.push(icon);
    }

    // Listen neu aufbauen
    quick.fill();
    quick.fillConfig();

    // Item aktivieren
    let item;
    if (typeof icon === "string") {
      item = document.querySelector(`#quick-config [data-icon="${icon}"]`);
    } else {
      item = document.querySelector(`#quick-config [data-id="${icon.id}"]`);
    }
    if (!item) {
      // wird eine Einstellung entfernt, wird das Item nicht wiedergefunden => Einstellung fokussieren
      item = document.querySelector('#quick-config-selectable [data-icon="ein"]');
    }
    item.dispatchEvent(new KeyboardEvent("click", { key: "Enter" }));

    // Item ggf. in den sichtbaren Bereich scrollen
    const cont = item.closest("div");
    const contScroll = cont.scrollTop;
    const contHeight = cont.offsetHeight;
    const itemTop = item.offsetTop;
    const itemHeight = item.offsetHeight;
    if (itemTop + itemHeight + 26 > contHeight + contScroll) {
      cont.scrollTop = itemTop + itemHeight - 4 * 26 - 4; // 26px = Höhe eines Links
    } else if (itemTop - 26 < contScroll) {
      cont.scrollTop = itemTop + itemHeight - 7 * 26 - 4; // 26px = Höhe eines Links
    }

    // Item fokussieren
    clearTimeout(quick.itemFocusTimeout);
    quick.itemFocusTimeout = setTimeout(() => item.focus(), 500);

    // Optionen speichern
    optionen.speichern();
  },

  // speichert, welche Pfeile gerade aktiv sind
  pfeileAktiv: {
    hoch: false,
    rechts: false,
    runter: false,
    links: false,
  },

  // Farbe der Pfeile auffrischen
  pfeile () {
    quick.pfeileAktiv = {
      hoch: false,
      rechts: false,
      runter: false,
      links: false,
    };
    const aktiv = quick.pfeileAktiv;
    const selectedAktiv = document.querySelector("#quick-config-selected .aktiv");
    if (selectedAktiv) {
      aktiv.rechts = true;
      const div = selectedAktiv.closest("div");
      if (div.firstChild !== selectedAktiv) {
        aktiv.hoch = true;
      }
      if (div.lastChild !== selectedAktiv) {
        aktiv.runter = true;
      }
    } else if (document.querySelector("#quick-config-selectable .aktiv")) {
      aktiv.links = true;
    }
    for (const i of Object.keys(aktiv)) {
      const src = `img/pfeil-gerade-${i}${aktiv[i] ? "" : "-grau"}.svg`;
      document.getElementById(`quick-config-${i}`).src = src;
    }
  },

  // Events an die Pfeile hängen
  //   img = Element
  //     (Pfeil, zum Bewegen der Elemente)
  eventsPfeile (img) {
    img.addEventListener("click", function () {
      const dir = this.src.match(/.+-(.+)\./)[1];
      quick.moveConfig(dir);
    });
  },

  // veraltete Einträge in den Einstellungen ändern
  amendItems () {
    const umbenannt = {
      "kartei-redaktion": "redaktion-ereignisse",
    };
    for (const i of Object.keys(umbenannt)) {
      const idx = optionen.data.einstellungen["quick-icons"].indexOf(i);
      if (idx < 0) {
        continue;
      }
      optionen.data.einstellungen["quick-icons"][idx] = umbenannt[i];
      optionen.speichern();
    }
  },
};
