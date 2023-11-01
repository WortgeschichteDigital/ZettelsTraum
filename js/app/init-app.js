"use strict";

// MODULE
const modules = {
  clipboard: require("electron").clipboard,
  cp: require("child_process"),
  fsp: require("fs").promises,
  ipc: require("electron").ipcRenderer,
  os: require("os"),
  path: require("path"),
  shell: require("electron").shell,
  zlib: require("zlib"),
};

// INITIALISIERUNG DER APP
window.addEventListener("load", async () => {
  // VARIABLEN ANLEGEN
  // Infos zu App und Fenster erfragen
  const info = await modules.ipc.invoke("infos-senden");
  window.appInfo = info.appInfo;
  window.winInfo = info.winInfo;

  // globales Datenobjekt für Kartei
  window.data = {};

  // Liste der Einstellungen für die Quick-Access-Bar ermitteln
  quickEin.optionsDetect();

  // IPC-LISTENER INITIALISIEREN
  // Menüpunkte
  modules.ipc.on("app-karteisuche", () => karteisuche.oeffnen());
  modules.ipc.on("app-einstellungen", () => optionen.oeffnen());
  modules.ipc.on("kartei-erstellen", () => kartei.wortErfragen());
  modules.ipc.on("kartei-oeffnen", (evt, datei) => {
    if (datei) {
      kartei.oeffnenEinlesen(datei);
    } else {
      kartei.oeffnen();
    }
  });
  modules.ipc.on("kartei-speichern", () => speichern.kaskade());
  modules.ipc.on("kartei-speichern-unter", () => kartei.speichern(true));
  modules.ipc.on("kartei-schliessen", () => kartei.schliessen());
  modules.ipc.on("kartei-lemmata", () => lemmata.oeffnen());
  modules.ipc.on("kartei-formvarianten", () => stamm.oeffnen());
  modules.ipc.on("kartei-notizen", () => notizen.oeffnen());
  modules.ipc.on("kartei-anhaenge", () => anhaenge.fenster());
  modules.ipc.on("kartei-lexika", () => lexika.oeffnen());
  modules.ipc.on("kartei-metadaten", () => meta.oeffnen());
  modules.ipc.on("kartei-bedeutungen", () => bedeutungen.oeffnen());
  modules.ipc.on("kartei-bedeutungen-wechseln", () => bedeutungenGeruest.oeffnen());
  modules.ipc.on("kartei-bedeutungen-fenster", () => bedeutungenWin.oeffnen());
  modules.ipc.on("kartei-suche", () => filter.suche());
  modules.ipc.on("redaktion-ereignisse", () => redaktion.oeffnen());
  modules.ipc.on("redaktion-literatur", () => redLit.oeffnen());
  modules.ipc.on("redaktion-metadaten", () => redMeta.oeffnen());
  modules.ipc.on("redaktion-wortinformationen", () => redWi.oeffnen());
  modules.ipc.on("redaktion-xml", () => redXml.oeffnen());
  modules.ipc.on("redaktion-belege-xml", () => xml.belegeInXmlFenster());
  modules.ipc.on("belege-hinzufuegen", () => {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Hinzufügen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    speichern.checkInit(() => beleg.erstellen());
  });
  modules.ipc.on("belege-auflisten", () => {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Auflisten</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    speichern.checkInit(() => liste.wechseln());
  });
  modules.ipc.on("belege-taggen", () => belegeTaggen.oeffnen());
  modules.ipc.on("belege-loeschen", () => liste.loeschenAlleBelege());
  modules.ipc.on("belege-kopieren", () => kopieren.init());
  modules.ipc.on("belege-einfuegen", () => kopieren.einfuegen());
  modules.ipc.on("belege-zwischenablage", () => liste.kopierenAlleBelege());
  modules.ipc.on("hilfe-demo", () => helfer.demoOeffnen());
  modules.ipc.on("hilfe-updates", () => updates.fenster());
  // Kopierfunktion
  modules.ipc.on("kopieren-basisdaten", () => kopieren.basisdatenSenden());
  modules.ipc.on("kopieren-basisdaten-empfangen", (evt, daten) => kopieren.einfuegenBasisdatenEintragen(daten));
  modules.ipc.on("kopieren-daten", () => kopieren.datenSenden());
  modules.ipc.on("kopieren-daten-empfangen", (evt, daten) => kopieren.einfuegenEinlesen(daten));
  // Einstellungen
  modules.ipc.on("optionen-init", (evt, opt) => {
    optionen.einlesen(optionen.data, opt);
    optionen.anwenden();
    zuletzt.aufbauen();
  });
  modules.ipc.on("optionen-empfangen", (evt, data) => optionen.empfangen(data));
  modules.ipc.on("optionen-zuletzt", (evt, karteien) => zuletzt.update(karteien));
  modules.ipc.on("optionen-zuletzt-verschwunden", (evt, verschwunden) => zuletzt.verschwundenUpdate(verschwunden));
  modules.ipc.on("optionen-fenster", (evt, fenster, status) => {
    optionen.data[fenster] = status;
  });
  modules.ipc.on("optionen-letzter-pfad", (evt, pfad) => optionen.aendereLetzterPfad(pfad));
  // Bedeutungsgerüst-Fenster
  modules.ipc.on("bedeutungen-fenster-daten", () => bedeutungenWin.daten());
  modules.ipc.on("bedeutungen-fenster-geschlossen", () => {
    bedeutungenWin.contentsId = 0;
  });
  modules.ipc.on("bedeutungen-fenster-drucken", (evt, gn) => {
    drucken.init("bedeutungen-", gn);
    modules.ipc.invoke("fenster-fokus");
  });
  modules.ipc.on("bedeutungen-fenster-umtragen", (evt, bd, eintragen) => {
    beleg.bedeutungenWin(bd, eintragen);
    modules.ipc.invoke("fenster-fokus");
  });
  // XML-Fenster
  modules.ipc.on("red-xml-daten", () => redXml.daten());
  modules.ipc.on("red-xml-speichern", (evt, daten) => redXml.speichern({ daten }));
  modules.ipc.on("red-xml-geschlossen", () => {
    redXml.contentsId = 0;
  });
  // Dialog
  modules.ipc.on("dialog-anzeigen", (evt, text) => {
    dialog.oeffnen({
      typ: "alert",
      text,
    });
  });
  // CLI-Operationen
  modules.ipc.on("cli-command", (evt, commands) => cli.verarbeiten(commands));
  // Updates suchen
  modules.ipc.on("updates-check", () => updates.check(true));
  // Before-Unload
  modules.ipc.on("before-unload", () => helfer.beforeUnload());

  // EVENTS: RESIZE
  window.addEventListener("resize", () => {
    clearTimeout(helfer.resizeTimeout);
    helfer.resizeTimeout = setTimeout(() => {
      const elemente = [
        "anhaenge-cont",
        "dialog-text",
        "drucken-cont",
        "einstellungen-sec-allgemeines",
        "einstellungen-sec-kopieren",
        "einstellungen-sec-literatur",
        "einstellungen-sec-menue",
        "einstellungen-sec-notizen",
        "einstellungen-sec-bedeutungsgeruest",
        "einstellungen-sec-karteikarte",
        "einstellungen-sec-filterleiste",
        "einstellungen-sec-belegliste",
        "gerueste-cont-over",
        "import-cont-over",
        "karteisuche-export-form-cont",
        "karteisuche-karteien",
        "kopieren-einfuegen-over",
        "kopieren-liste-cont",
        "lemmata-over",
        "meta-cont-over",
        "notizen-feld",
        "quick-ein-over",
        "red-lit-suche-titel",
        "red-meta-over",
        "red-wi-cont-over",
        "redaktion-cont-over",
        "stamm-liste",
        "tagger-typen",
        "updatesWin-notes",
        "zeitraumgrafik-cont-over",
      ];
      for (const e of elemente) {
        helfer.elementMaxHeight({
          ele: document.getElementById(e),
        });
      }
    }, 100);
  });

  // EVENTS: TASTATUREINGABEN
  document.addEventListener("keydown", tastatur.init);

  // EVENTS: RECHTSKLICK
  window.addEventListener("contextmenu", evt => {
    evt.preventDefault();
    popup.oeffnen(evt);
  });

  // EVENTS: DRAG & DROP
  document.addEventListener("dragover", evt => evt.preventDefault());
  document.addEventListener("dragleave", evt => evt.preventDefault());
  document.addEventListener("dragend", evt => evt.preventDefault());
  document.addEventListener("drop", evt => {
    evt.preventDefault();
    if (!evt.dataTransfer.files.length) { // wenn z.B. Text gedropt wird
      return;
    }
    const pfad = evt.dataTransfer.files[0].path;
    if (/\.ztl$/.test(pfad) && overlay.oben() === "red-lit") {
      redLit.dbCheck(async () => {
        const ergebnis = await redLit.dbOeffnenEinlesen({ pfad });
        redLit.dbOeffnenAbschließen({ ergebnis, pfad });
      });
    } else if (!/\.ztl$/.test(pfad)) {
      kartei.oeffnenEinlesen(pfad);
    }
  });

  // EVENTS: COPY
  document.addEventListener("copy", evt => liste.textKopieren(evt));
  // Kopier-Overlay
  document.querySelectorAll("#ctrlC input").forEach(i => liste.textKopierenInputs(i));

  // EVENTS: ELEMENTE
  // alle <textarea>
  document.querySelectorAll("textarea").forEach(textarea => {
    textarea.addEventListener("input", function () {
      helfer.textareaGrow(this);
    });
  });
  // alle <input type="number">
  document.querySelectorAll('input[type="number"]').forEach(i => {
    i.addEventListener("change", function () {
      const val = this.value;
      helfer.inputNumber(this);
      if (this.value !== val) {
        this.dispatchEvent(new Event("input"));
      }
    });
  });
  // alle Dropdown-Listen
  document.querySelectorAll(".dropdown-feld").forEach(i => dropdown.feld(i));
  document.querySelectorAll(".dropdown-link-td, .dropdown-link-element").forEach(i => dropdown.link(i));
  dropdown2.init();
  // aktives Element für Quick-Access-Bar zwischenspeichern
  document.addEventListener("mousedown", function () {
    quick.accessRolesActive = document.activeElement;
  });
  // BearbeiterIn registrieren
  document.querySelector("#bearbeiterin-name").addEventListener("keydown", evt => {
    if (evt.key === "Enter") {
      bearbeiterin.check();
    }
  });
  document.querySelector("#bearbeiterin-registrieren").addEventListener("click", () => bearbeiterin.check());
  // Wort-Element
  document.getElementById("wort").addEventListener("click", () => kartei.wortAendern());
  // Erinnerungen-Icon
  document.getElementById("erinnerungen-icon").addEventListener("click", () => erinnerungen.show());
  // Ordner-Icon
  document.getElementById("ordner-icon").addEventListener("click", () => helfer.ordnerOeffnen(kartei.pfad));
  // Redaktion-Icon
  document.getElementById("redaktion-icon").addEventListener("click", evt => {
    evt.preventDefault();
    redaktion.oeffnen();
  });
  // Notizen-Icon
  document.getElementById("notizen-icon").addEventListener("click", () => notizen.oeffnen());
  // Lexika-Icon
  document.getElementById("lexika-icon").addEventListener("click", () => lexika.oeffnen());
  // Updates-Icon
  document.getElementById("updates").addEventListener("click", () => updates.fenster());
  // Programm-Icon
  document.getElementById("icon").addEventListener("click", () => modules.ipc.send("ueber-app"));
  // Start-Sektion
  document.getElementById("start-erstellen").addEventListener("click", () => kartei.wortErfragen());
  document.getElementById("start-oeffnen").addEventListener("click", () => kartei.oeffnen());
  // Karteikarte
  document.querySelectorAll("#beleg input, #beleg textarea").forEach(i => {
    if (i.type === "button") {
      beleg.aktionButton(i);
    } else if (i.type === "radio") {
      beleg.formularImportListener(i);
    } else if (i.classList.contains("beleg-form-data")) {
      beleg.formularGeaendert(i);
      beleg.formularEvtFormData(i);
    }
  });
  beleg.formularEvtDTA();
  document.getElementById("beleg-bs").addEventListener("paste", evt => beleg.pasteBs(evt));
  document.querySelectorAll("#beleg .icon-link, #beleg .text-link").forEach(a => {
    if (/icon-tools/.test(a.getAttribute("class"))) { // Text-Tools
      beleg.toolsKlick(a);
    }
  });
  document.querySelectorAll(".beleg-opt-block a").forEach(a => {
    if (a.classList.contains("druck-icon")) {
      return;
    }
    beleg.ctrlLinks(a);
  });
  // Datei-Import
  document.getElementById("import-abbrechen-button").addEventListener("click", () => belegImport.DateiImportFensterSchliessen());
  // Sonderzeichen
  document.querySelectorAll("#sonderzeichen-cont a").forEach(i => sonderzeichen.eintragen(i));
  // Kopierfunktion
  kopieren.addListeAlle(document.getElementById("liste-link-kopieren"));
  document.getElementById("kopieren").addEventListener("click", () => kopieren.liste());
  document.getElementById("kopieren-liste-leeren").addEventListener("click", () => kopieren.listeLeeren());
  document.getElementById("kopieren-liste-beenden").addEventListener("click", () => kopieren.uiOff());
  document.getElementById("kopieren-liste-export").addEventListener("click", () => kopieren.exportieren());
  document.getElementById("kopieren-liste-schliessen").addEventListener("click", () => overlay.schliessen(document.getElementById("kopieren-liste")));
  document.getElementById("kopieren-einfuegen-einfuegen").addEventListener("click", () => speichern.checkInit(() => kopieren.einfuegenAusfuehren()));
  document.getElementById("kopieren-einfuegen-reload").addEventListener("click", () => kopieren.einfuegenBasisdaten(true));
  document.getElementById("kopieren-einfuegen-import").addEventListener("click", () => kopieren.importieren());
  document.getElementById("kopieren-einfuegen-schliessen").addEventListener("click", () => overlay.schliessen(document.getElementById("kopieren-einfuegen")));
  document.querySelectorAll("#kopieren-einfuegen-formular input").forEach(i => kopieren.einfuegenDatenfelder(i));
  // Bedeutungen
  document.getElementById("bedeutungen-speichern").addEventListener("click", () => bedeutungen.speichern());
  document.getElementById("bedeutungen-schliessen").addEventListener("click", () => bedeutungen.schliessen());
  document.getElementById("bedeutungen-gerueste-config").addEventListener("click", evt => bedeutungenGerueste.oeffnen(evt));
  bedeutungen.xml({ icon: document.getElementById("bedeutungen-link-xml") });
  // Tagger
  document.getElementById("tagger-speichern").addEventListener("click", () => tagger.speichern());
  document.getElementById("tagger-schliessen").addEventListener("click", () => tagger.schliessen());
  // Belegliste-Filter
  document.querySelectorAll("#liste-filter header a").forEach(a => filter.ctrlButtons(a));
  document.querySelectorAll(".filter-kopf").forEach(a => {
    filter.anzeigeUmschalten(a);
    filter.ctrlResetBlock(a.lastChild);
  });
  filter.toggleErweiterte();
  document.querySelectorAll(".filter-optionen").forEach(input => filter.filterOptionenListener(input));
  document.querySelectorAll('a[id^="filter-datenfelder-"]').forEach(input => filter.ctrlVolltextDs(input));
  filter.anwenden(document.getElementById("filter-volltext"));
  document.getElementsByName("filter-zeitraum").forEach(i => filter.wechselnZeitraum(i));
  filter.backupKlappScroll(document.getElementById("filter-zeitraum-dynamisch"));
  document.querySelectorAll('#filter-kartendatum input[type="checkbox"]').forEach(i => filter.kartendatumBox(i));
  document.querySelectorAll('#filter-kartendatum input[type="datetime-local"]').forEach(i => filter.kartendatumFeld(i));
  document.querySelectorAll("#filter-kartendatum .icon-jetzt").forEach(a => filter.kartendatumJetzt(a));
  // Funktionen im Belegliste-Header
  document.querySelectorAll("#liste header a").forEach(a => liste.header(a));
  document.querySelector("#liste-sort-schliessen").addEventListener("click", () => liste.headerSortierenSchliessen());
  document.querySelectorAll("#liste-sort a").forEach(i => {
    i.addEventListener("click", function (evt) {
      evt.preventDefault();
      liste.headerSortierenAuswahl = this.getAttribute("href").substring(1).split("-");
      liste.headerSortierenSchliessen();
    });
  });
  // Einstellungen-Fenster
  document.querySelectorAll("#einstellungen ul a").forEach(a => optionen.sektionWechselnLink(a));
  document.querySelectorAll("#einstellungen input").forEach(i => optionen.aendereEinstellungListener(i));
  document.getElementById("einstellung-personenliste").addEventListener("click", () => optionen.aenderePersonenliste());
  document.querySelectorAll(".einstellung-sichern").forEach(i => {
    i.addEventListener("click", function () {
      optionen.sichern(this);
    });
  });
  document.querySelectorAll("#einstellungen-quick-alle, #einstellungen-quick-standard, #einstellungen-quick-keine").forEach(a => quick.preset(a));
  document.querySelectorAll("#quick-config div:nth-child(2) img").forEach(img => quick.eventsPfeile(img));
  optionen.anwendenNotizenFilterleiste(document.getElementById("einstellung-notizen-filterleiste"));
  document.getElementById("einstellung-notizen-max-breite").addEventListener("change", () => {
    optionen.anwendenNotizenMaxBreite();
  });
  document.getElementById("tags-laden").addEventListener("click", () => optionen.tagsManuLaden());
  document.getElementById("tags-zuruecksetzen").addEventListener("click", () => optionen.tagsZuruecksetzen());
  optionen.anwendenIconsDetailsListener(document.getElementById("einstellung-anzeige-icons-immer-an"));
  optionen.anwendenHelleDunklerListener(document.getElementById("einstellung-helle-dunkler"));
  optionen.anwendenSortErweitertListener(document.getElementById("einstellung-belegliste-sort-erweitert"));
  // Quick-Access-Einstellung
  document.getElementById("quick-ein-uebernehmen").addEventListener("click", () => quickEin.uebernehmen());
  document.getElementById("quick-ein-schliessen").addEventListener("click", () => quickEin.schliessen());
  // Lemmata-Fenster
  document.getElementById("lemmata-okay").addEventListener("click", () => lemmata.schliessen());
  document.getElementById("lemmata-abbrechen").addEventListener("click", () => {
    lemmata.abgebrochen = true;
    lemmata.geaendert = false;
    lemmata.schliessen();
  });
  document.getElementById("lemmata-wf").addEventListener("change", function () {
    data.la.wf = this.checked;
    lemmata.geaendert = true;
    lemmata.liste();
  });
  document.getElementById("lemmata-er").addEventListener("change", () => lemmata.ergaenzend());
  // Formvarianten-Fenster
  document.querySelectorAll("#stamm input").forEach(i => {
    if (i.type === "button") {
      stamm.aktionButton(i);
    } else if (i.type === "radio") {
      stamm.aktionRadio(i);
    } else { // Text-Input
      stamm.aktionText(i);
    }
  });
  // Notizen-Fenster
  document.querySelectorAll("#notizen-cont .icon-link").forEach(a => notizen.tools(a));
  document.querySelectorAll("#notizen input, #notizen-feld").forEach(i => {
    if (i.type === "button") {
      notizen.aktionButton(i);
    } else { // #notizen-feld
      notizen.change(i);
    }
  });
  document.getElementById("notizen-feld").addEventListener("paste", evt => notizen.paste(evt));
  // Anhänge (Fenster und Karteikartei)
  document.querySelectorAll(".anhaenge-add input").forEach(i => anhaenge.add(i));
  // Lexika-Fenster
  document.querySelectorAll("#lexika input").forEach(i => {
    if (i.type === "button") {
      lexika.aktionButton(i);
    } else { // Text-Input
      lexika.aktionText(i);
    }
  });
  // Karteimetadaten-Fenster
  document.getElementById("meta-ordner").addEventListener("click", () => {
    if (kartei.pfad) {
      helfer.ordnerOeffnen(kartei.pfad);
    }
  });
  // Belege-taggen-Fenster
  document.getElementById("belege-taggen-input").addEventListener("click", () => belegeTaggen.taggen());
  // Redaktionsmetadaten-Fenster
  document.querySelectorAll("#red-meta-themenfelder, #red-meta-sachgebiete, #red-meta-stichwortplanung").forEach(i => {
    i.addEventListener("click", function (evt) {
      evt.preventDefault();
      const typ = this.id.replace(/.+-/, "");
      redMeta.tagsAdd({ typ });
    });
  });
  document.querySelectorAll("#red-meta input").forEach(i => {
    if (i.type === "button") {
      redMeta.aktionButton(i);
    } else { // Text-Input
      redMeta.aktionText(i);
    }
  });
  // Literaturdatenbank
  document.querySelectorAll("#red-lit-pfad a").forEach(a => redLit.dbListener(a));
  document.querySelectorAll("#red-lit-nav input").forEach(i => redLit.navListener(i));
  document.querySelectorAll("#red-lit-suche-form input").forEach(i => redLit.sucheListener(i));
  document.querySelectorAll("#red-lit-suche-hilfe, #red-lit-suche-hilfe-fenster img").forEach(i => {
    i.addEventListener("click", evt => {
      evt.preventDefault();
      document.getElementById("red-lit-suche-hilfe-fenster").classList.toggle("aus");
    });
  });
  document.querySelectorAll("#red-lit-suche-hilfe-fenster a").forEach(a => redLit.sucheSchalter(a));
  document.getElementById("red-lit-suche-start").addEventListener("click", evt => {
    evt.preventDefault();
    redLit.sucheStarten();
  });
  document.querySelectorAll("#red-lit-suche-sonder a").forEach(a => redLit.sucheSonder(a));
  document.querySelectorAll("#red-lit-suche-treffer a").forEach(a => redLit.sucheNav(a));
  document.querySelectorAll("#red-lit-eingabe input, #red-lit-eingabe textarea").forEach(i => redLit.eingabeListener(i));
  redLit.xml({ icon: document.getElementById("red-lit-eingabe-ti-xml-fenster") });
  document.getElementById("red-lit-eingabe-ti-dta").addEventListener("click", evt => {
    evt.preventDefault();
    redLit.dbCheck(() => redLit.eingabeDTA(), false);
  });
  document.getElementById("red-lit-eingabe-ti-xml").addEventListener("click", evt => {
    evt.preventDefault();
    redLit.dbCheck(() => redLit.eingabeXML(), false);
  });
  document.getElementById("red-lit-eingabe-ti-bibtex").addEventListener("click", evt => {
    evt.preventDefault();
    redLit.dbCheck(() => redLit.eingabeBibTeX(), false);
  });
  // Literaturdatenbank: Export
  document.querySelectorAll('#red-lit-export-cont input[type="radio"]').forEach(i => {
    i.addEventListener("keydown", evt => {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Enter") {
        redLit.dbExportieren();
      }
    });
  });
  document.getElementById("red-lit-export-exportieren").addEventListener("click", () => redLit.dbExportieren());
  document.getElementById("red-lit-export-abbrechen").addEventListener("click", () => overlay.schliessen(document.getElementById("red-lit-export")));
  // Wortinformationen
  document.querySelectorAll("#red-wi-form input, #red-wi-copy input").forEach(input => redWi.formListener({ input }));
  redWi.xml({ icon: document.getElementById("red-wi-xml") });
  // Karteisuche
  document.getElementById("karteisuche-suchen").addEventListener("click", () => karteisuche.suchenPrep());
  document.getElementById("karteisuche-suchenCache").addEventListener("click", () => karteisuche.suchenPrepZtj([]));
  document.getElementById("karteisuche-suchenTiefe").addEventListener("input", function () {
    optionen.data.karteisuche.tiefe = parseInt(this.value, 10);
    optionen.speichern();
  });
  document.querySelector("#karteisuche-cont h3").addEventListener("click", () => karteisuche.filterUmschalten());
  document.getElementById("karteisuche-add-filter").addEventListener("click", () => karteisuche.filterHinzufuegen());
  document.getElementById("karteisuche-speichern").addEventListener("click", evt => {
    evt.preventDefault();
    karteisucheExport.oeffnen();
  });
  // Karteisuche: Export
  document.querySelectorAll("#karteisuche-export-vorlagen-tools a").forEach(a => karteisucheExport.vorlagenToolsListener(a));
  document.querySelectorAll("#karteisuche-export-form input").forEach(i => {
    i.addEventListener("keydown", evt => {
      tastatur.detectModifiers(evt);
      if (!tastatur.modifiers && evt.key === "Enter") {
        karteisucheExport.exportieren();
      }
    });
  });
  document.getElementById("karteisuche-export-exportieren").addEventListener("click", () => karteisucheExport.exportieren());
  document.getElementById("karteisuche-export-abbrechen").addEventListener("click", () => overlay.schliessen(document.querySelector("#karteisuche-export")));
  // Prompt-Textfeld
  document.getElementById("dialog-prompt-text").addEventListener("keydown", function (evt) {
    tastatur.detectModifiers(evt);
    if (!tastatur.modifiers && evt.key === "Enter") {
      overlay.schliessen(this);
    }
  });
  // Dialog-Buttons
  [ "dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button" ].forEach(button => {
    document.getElementById(button).addEventListener("click", function () {
      overlay.schliessen(this);
    });
  });
  // Druck-Links
  document.querySelectorAll(".druck-icon").forEach(a => drucken.listener(a));
  // Druck-Fenster
  document.querySelectorAll("#drucken-head span").forEach(span => drucken.buttons(span));
  // Updates-Fenster
  document.querySelectorAll("#updatesWin-header input").forEach(i => updates.buttons(i));
  // Schließen-Links von Overlays
  document.querySelectorAll(".overlay-schliessen").forEach(a => overlay.initSchliessen(a));
  // Handbuch-Links von Overlays
  document.querySelectorAll(".icon-handbuch, .link-handbuch").forEach(a => helfer.handbuchLink(a));
  // Rotationsanimationen
  document.querySelectorAll("#kopieren-einfuegen-reload").forEach(i => {
    i.addEventListener("animationend", function () {
      this.classList.remove("rotieren-bitte");
    });
  });

  // VISUELLE ANPASSUNGEN
  // App-Namen eintragen
  document.querySelectorAll(".app-name").forEach(i => {
    i.textContent = appInfo.name;
  });
  // Breite Datumsfelder anpassen
  const lang = helfer.checkLang();
  if (!/^de/i.test(lang)) {
    document.querySelectorAll('[type="datetime-local"]').forEach(i => {
      i.classList.add("lang-en");
    });
  }
  // macOS
  if (process.platform === "darwin") {
    // Option zum Ausblenden der Menüleiste verstecken
    const option = document.getElementById("einstellung-autoHideMenuBar").parentNode;
    option.classList.add("aus");
  }
  // Tastaturkürzel ändern
  tastatur.shortcutsText();
  // Tooltips initialisieren
  tooltip.init();

  // IPC-ANFRAGEN
  // Bilder vorladen
  const bilderPreload = [];
  const bilder = await modules.ipc.invoke("bilder-senden");
  for (const b of bilder) {
    const img = new Image();
    img.src = `img/${b}`;
    bilderPreload.push(img);
  }

  // INDENT.XSL LADEN
  await helfer.resourcesLoad({
    file: "indent.xsl",
    targetObj: helferXml,
    targetKey: "indentXsl",
  });

  // FENSTER FREISCHALTEN
  updates.hinweis();
  helfer.fensterGeladen();
});

// FEHLER AN MAIN SCHICKEN
window.addEventListener("error", evt => helfer.onError(evt));
window.addEventListener("unhandledrejection", evt => helfer.onError(evt));
