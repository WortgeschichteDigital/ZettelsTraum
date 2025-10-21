
import anhaenge from "./anhaenge.mjs";
import annotieren from "./annotieren.mjs";
import bearbeiterin from "./bearbeiterin.mjs";
import bedeutungen from "./bedeutungen.mjs";
import bedeutungenGeruest from "./bedeutungenGeruest.mjs";
import bedeutungenGerueste from "./bedeutungenGerueste.mjs";
import bedeutungenWin from "./bedeutungenWin.mjs";
import beleg from "./beleg.mjs";
import belegeBuchung from "./belegeBuchung.mjs";
import belegeTaggen from "./belegeTaggen.mjs";
import belegKlammern from "./belegKlammern.mjs";
import cli from "./cli.mjs";
import dropdown2 from "./dropdown2.mjs";
import drucken from "./drucken.mjs";
import erinnerungen from "./erinnerungen.mjs";
import filter from "./filter.mjs";
import helfer from "./helfer.mjs";
import importShared from "./importShared.mjs";
import kartei from "./kartei.mjs";
import karteisuche from "./karteisuche.mjs";
import karteisucheExport from "./karteisucheExport.mjs";
import kopieren from "./kopieren.mjs";
import lemmata from "./lemmata.mjs";
import lexika from "./lexika.mjs";
import liste from "./liste.mjs";
import meta from "./meta.mjs";
import notizen from "./notizen.mjs";
import optionen from "./optionen.mjs";
import overlayApp from "./overlayApp.mjs";
import popup from "./popup.mjs";
import quick from "./quick.mjs";
import quickEin from "./quickEin.mjs";
import redaktion from "./redaktion.mjs";
import redLit from "./redLit.mjs";
import redMeta from "./redMeta.mjs";
import redWi from "./redWi.mjs";
import redXml from "./redXml.mjs";
import sonderzeichen from "./sonderzeichen.mjs";
import speichern from "./speichern.mjs";
import stamm from "./stamm.mjs";
import stichwortplanung from "./stichwortplanung.mjs";
import tagger from "./tagger.mjs";
import tastatur from "./tastatur.mjs";
import updates from "./updates.mjs";
import xml from "./xml.mjs";
import zuletzt from "./zuletzt.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import dropdown from "../dropdown.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import sharedXml from "../sharedXml.mjs";
import suchleiste from "../suchleiste.mjs";
import tooltip from "../tooltip.mjs";

// INITIALISIERUNG DER APP
window.addEventListener("load", async () => {
  // VARIABLEN ANLEGEN
  // Infos zu App und Fenster erfragen
  const info = await bridge.ipc.invoke("get-info");
  dd.app = info.app;
  dd.win = info.win;
  await dropdown.modInit();
  await suchleiste.modInit();

  // Liste der Einstellungen für die Quick-Access-Bar ermitteln
  quickEin.optionsDetect();

  // IPC-LISTENER INITIALISIEREN
  // Menüpunkte
  bridge.ipc.listen("app-karteisuche", () => karteisuche.oeffnen());
  bridge.ipc.listen("app-einstellungen", () => optionen.oeffnen());
  bridge.ipc.listen("kartei-erstellen", () => kartei.wortErfragen());
  bridge.ipc.listen("kartei-oeffnen", datei => {
    if (datei) {
      kartei.oeffnenEinlesen(datei);
    } else {
      kartei.oeffnen();
    }
  });
  bridge.ipc.listen("kartei-speichern", () => speichern.kaskade());
  bridge.ipc.listen("kartei-speichern-unter", () => kartei.speichern(true));
  bridge.ipc.listen("kartei-schliessen", () => kartei.schliessen());
  bridge.ipc.listen("kartei-lemmata", () => lemmata.oeffnen());
  bridge.ipc.listen("kartei-formvarianten", () => stamm.oeffnen());
  bridge.ipc.listen("kartei-notizen", () => notizen.oeffnen());
  bridge.ipc.listen("kartei-anhaenge", () => anhaenge.fenster());
  bridge.ipc.listen("kartei-lexika", () => lexika.oeffnen());
  bridge.ipc.listen("kartei-metadaten", () => meta.oeffnen());
  bridge.ipc.listen("kartei-bedeutungen", () => bedeutungen.oeffnen());
  bridge.ipc.listen("kartei-bedeutungen-wechseln", () => bedeutungenGeruest.oeffnen());
  bridge.ipc.listen("kartei-bedeutungen-fenster", () => bedeutungenWin.oeffnen());
  bridge.ipc.listen("kartei-suche", () => filter.suche());
  bridge.ipc.listen("redaktion-ereignisse", () => redaktion.oeffnen());
  bridge.ipc.listen("redaktion-literatur", () => redLit.oeffnen());
  bridge.ipc.listen("redaktion-metadaten", () => redMeta.oeffnen());
  bridge.ipc.listen("redaktion-wortinformationen", () => redWi.oeffnen());
  bridge.ipc.listen("redaktion-xml", () => redXml.oeffnen());
  bridge.ipc.listen("redaktion-belege-xml", () => xml.belegeInXmlFenster());
  bridge.ipc.listen("belege-hinzufuegen", () => {
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
  bridge.ipc.listen("belege-auflisten", () => {
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
  bridge.ipc.listen("belege-taggen", () => belegeTaggen.oeffnen());
  bridge.ipc.listen("belege-loeschen", () => liste.loeschenAlleBelege());
  bridge.ipc.listen("belege-kopieren", () => kopieren.init());
  bridge.ipc.listen("belege-einfuegen", () => kopieren.einfuegen());
  bridge.ipc.listen("belege-zwischenablage", () => liste.kopierenAlleBelege());
  bridge.ipc.listen("belege-buchung", () => belegeBuchung.open());
  bridge.ipc.listen("hilfe-demo", () => helfer.demoOeffnen());
  bridge.ipc.listen("hilfe-updates", () => updates.fenster());

  // Kopierfunktion
  bridge.ipc.listen("kopieren-basisdaten", () => kopieren.basisdatenSenden());
  bridge.ipc.listen("kopieren-basisdaten-empfangen", daten => kopieren.einfuegenBasisdatenEintragen(daten));
  bridge.ipc.listen("kopieren-daten", () => kopieren.datenSenden());
  bridge.ipc.listen("kopieren-daten-empfangen", daten => kopieren.einfuegenEinlesen(daten));

  // Einstellungen
  bridge.ipc.listen("optionen-init", opt => {
    optionen.einlesen(optionen.data, opt);
    optionen.anwenden();
    zuletzt.aufbauen();
    bridge.ipc.invoke("init-done", "optInitDone");
  });
  bridge.ipc.listen("optionen-empfangen", data => optionen.empfangen(data));
  bridge.ipc.listen("optionen-zuletzt", karteien => zuletzt.update(karteien));
  bridge.ipc.listen("optionen-zuletzt-verschwunden", verschwunden => zuletzt.verschwundenUpdate(verschwunden));
  bridge.ipc.listen("optionen-fenster", (fenster, status) => {
    optionen.data[fenster] = status;
  });
  bridge.ipc.listen("optionen-letzter-pfad", pfad => optionen.aendereLetzterPfad(pfad));

  // Bedeutungsgerüst-Fenster
  bridge.ipc.listen("bedeutungen-fenster-daten", () => bedeutungenWin.daten());
  bridge.ipc.listen("bedeutungen-fenster-geschlossen", () => {
    bedeutungenWin.contentsId = 0;
  });
  bridge.ipc.listen("bedeutungen-fenster-drucken", gn => {
    drucken.init("bedeutungen-", gn);
    bridge.ipc.invoke("fenster-fokus");
  });
  bridge.ipc.listen("bedeutungen-fenster-umtragen", data => {
    beleg.bedeutungenWin(data.bd, data.eintragen);
    bridge.ipc.invoke("fenster-fokus");
  });

  // XML-Fenster
  bridge.ipc.listen("red-xml-daten", () => redXml.daten());
  bridge.ipc.listen("red-xml-speichern", daten => redXml.speichern({ daten }));
  bridge.ipc.listen("red-xml-geschlossen", () => {
    redXml.contentsId = 0;
  });

  // Dialog
  bridge.ipc.listen("dialog-anzeigen", text => {
    dialog.oeffnen({
      typ: "alert",
      text,
    });
  });

  // CLI-Operationen
  bridge.ipc.listen("cli-command", commands => cli.verarbeiten(commands));

  // Updates suchen
  bridge.ipc.listen("updates-check", () => updates.check(true));

  // Before-Unload
  bridge.ipc.listen("before-unload", () => helfer.beforeUnload());

  // Popup
  bridge.ipc.listen("popup-anhaenge-auto-ergaenzen", () => anhaenge.addAuto({ fenster: false }));
  bridge.ipc.listen("popup-anhaenge-fenster", () => anhaenge.fenster());
  bridge.ipc.listen("popup-anhaenge-oeffnen", arg => anhaenge.oeffnen(popup.anhangDatei, arg));
  bridge.ipc.listen("popup-beleg-bearbeiten", () => {
    overlayApp.alleSchliessen();
    beleg.oeffnen(parseInt(popup.belegID, 10));
  });
  bridge.ipc.listen("popup-beleg-duplizieren", () => {
    const beleg = kopieren.datenBeleg(dd.file.ka[popup.belegID]);
    kopieren.einfuegenEinlesen([ beleg ], true);
  });
  bridge.ipc.listen("popup-beleg-hinzufuegen", () => speichern.checkInit(() => beleg.erstellen()));
  bridge.ipc.listen("popup-beleg-klammern-make", arg => belegKlammern.make(arg));
  bridge.ipc.listen("popup-beleg-klammern-remove", arg => belegKlammern.remove(arg));
  bridge.ipc.listen("popup-beleg-loeschen", () => beleg.aktionLoeschenFrage(popup.belegID));
  bridge.ipc.listen("popup-beleg-zwischenablage", () => beleg.ctrlZwischenablage(dd.file.ka[popup.belegID]));
  bridge.ipc.listen("popup-belege-auflisten", () => speichern.checkInit(() => liste.wechseln()));
  bridge.ipc.listen("popup-erinnerungen", () => erinnerungen.show());
  bridge.ipc.listen("popup-filter-reset", () => filter.ctrlReset(true));
  bridge.ipc.listen("popup-kartei-entfernen", () => zuletzt.karteiEntfernen(popup.startDatei));
  bridge.ipc.listen("popup-kartei-erstellen", () => kartei.wortErfragen());
  bridge.ipc.listen("popup-kartei-oeffnen", () => popup.karteiLink.click());
  bridge.ipc.listen("popup-kopieren", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.textauswahl.text,
      html: popup.textauswahl.html,
    });
    shared.animation("zwischenablage");
  });
  bridge.ipc.listen("popup-kopieren-code", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.element.innerText.replace(/␣/g, "\u00A0").replace(/[.]{3}/g, "…"),
    });
  });
  bridge.ipc.listen("popup-kopieren-id", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.kopfID,
    });
  });
  bridge.ipc.listen("popup-kopieren-nebenfenster", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.textauswahl.replace(/␣/g, "\u00A0").replace(/[.]{3}/g, "…"),
    });
  });
  bridge.ipc.listen("popup-kopierfunktion", () => kopieren.uiOff());
  bridge.ipc.listen("popup-lexika", () => lexika.oeffnen());
  bridge.ipc.listen("popup-link", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.element.getAttribute("href"),
    });
  });
  bridge.ipc.listen("popup-mail", () => {
    bridge.ipc.invoke("cb", "write", {
      text: popup.element.getAttribute("href").replace(/^mailto:/, ""),
    });
  });
  bridge.ipc.listen("popup-markieren", () => annotieren.makeUser());
  bridge.ipc.listen("popup-notizen", () => notizen.oeffnen());
  bridge.ipc.listen("popup-optionen-oeffnen", arg => {
    optionen.oeffnen();
    optionen.sektionWechseln(document.getElementById(arg));
  });
  bridge.ipc.listen("popup-ordner", () => helfer.ordnerOeffnen(popup.startDatei));
  bridge.ipc.listen("popup-ordner-kartei", () => helfer.ordnerOeffnen(popup.karteiPfad));
  bridge.ipc.listen("popup-redaktion", () => redaktion.oeffnen());
  bridge.ipc.listen("popup-schliessen", () => {
    const id = overlay.oben();
    overlay.schliessen(document.getElementById(id));
  });
  bridge.ipc.listen("popup-text-complete", () => popup.textauswahlComplete(true));
  bridge.ipc.listen("popup-text-referenz", () => {
    bridge.ipc.invoke("cb", "write", {
      text: xml.belegId({}),
    });
  });
  bridge.ipc.listen("popup-titel-aufnahmen", () => redLit.anzeigePopup(popup.titelaufnahme.ds));
  bridge.ipc.listen("popup-titel-bearbeiten", () => redLit.dbCheck(() => redLit.eingabeBearbeiten(popup.titelaufnahme.ds), false));
  bridge.ipc.listen("popup-titel-loeschen", () => document.querySelector("#red-lit-popup .icon-muelleimer").click());
  bridge.ipc.listen("popup-titel-xml", () => redLit.xmlDatensatz({ id: popup.titelaufnahme.ds.id }));
  bridge.ipc.listen("popup-titel-zwischenablage", arg => redLit.titelZwischenablage(arg));
  bridge.ipc.listen("popup-wort", () => kartei.wortAendern());
  bridge.ipc.listen("popup-xml-referenz", () => xml.referenz());
  bridge.ipc.listen("popup-xml-schnitt-cb", arg => xml.schnittInZwischenablage(arg));
  bridge.ipc.listen("popup-xml-schnitt-win", arg => xml.schnittInXmlFenster(arg));

  // EVENTS: RESIZE
  window.addEventListener("resize", () => {
    clearTimeout(helfer.resizeTimeout);
    helfer.resizeTimeout = setTimeout(() => {
      const elemente = [
        "anhaenge-cont",
        "buchung-results",
        "dialog-text",
        "drucken-cont",
        "einstellungen-sec-allgemeines",
        "einstellungen-sec-kopieren",
        "einstellungen-sec-import",
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
        shared.elementMaxHeight({
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
    const pfad = bridge.web.getPathForFile(evt.dataTransfer.files[0]);
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
      shared.textareaGrow(this);
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
  // Stichwortplanung-Icon
  document.getElementById("stichwortplanung-icon").addEventListener("click", () => stichwortplanung.showLemmas());
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
  document.getElementById("icon").addEventListener("click", () => bridge.ipc.invoke("ueber-app"));
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
  beleg.formularEvtImport();
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
  document.getElementById("import-abbrechen-button").addEventListener("click", () => importShared.fileDataWinClose());
  // Sonderzeichen
  document.querySelectorAll("#sonderzeichen-cont a").forEach(i => sonderzeichen.eintragen(i));
  // Kopierfunktion
  kopieren.addListeAlle(document.getElementById("liste-link-kopieren"));
  document.getElementById("kopieren").addEventListener("click", () => kopieren.liste());
  document.getElementById("kopieren-liste-leeren").addEventListener("click", () => kopieren.listeLeeren());
  document.getElementById("kopieren-liste-beenden").addEventListener("click", () => kopieren.uiOff());
  document.getElementById("kopieren-liste-export").addEventListener("click", () => kopieren.exportieren());
  document.getElementById("kopieren-liste-schliessen").addEventListener("click", () => overlayApp.schliessen(document.getElementById("kopieren-liste")));
  document.getElementById("kopieren-einfuegen-einfuegen").addEventListener("click", () => speichern.checkInit(() => kopieren.einfuegenAusfuehren()));
  document.getElementById("kopieren-einfuegen-reload").addEventListener("click", () => kopieren.einfuegenBasisdaten(true));
  document.getElementById("kopieren-einfuegen-import").addEventListener("click", () => kopieren.importieren());
  document.getElementById("kopieren-einfuegen-schliessen").addEventListener("click", () => overlayApp.schliessen(document.getElementById("kopieren-einfuegen")));
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
    dd.file.la.wf = this.checked;
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
  // Buchung-überprüfen-Fenster
  document.getElementById("buchung-read").addEventListener("click", () => belegeBuchung.read());
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
      sharedTastatur.detectModifiers(evt);
      if (!sharedTastatur.modifiers && evt.key === "Enter") {
        redLit.dbExportieren();
      }
    });
  });
  document.getElementById("red-lit-export-exportieren").addEventListener("click", () => redLit.dbExportieren());
  document.getElementById("red-lit-export-abbrechen").addEventListener("click", () => overlayApp.schliessen(document.getElementById("red-lit-export")));
  // Wortinformationen
  document.querySelectorAll("#red-wi-form input, #red-wi-copy input").forEach(input => redWi.formListener({ input }));
  redWi.xml({ icon: document.getElementById("red-wi-xml") });
  redWi.clipboard({ icon: document.getElementById("red-wi-clipboard") });
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
      sharedTastatur.detectModifiers(evt);
      if (!sharedTastatur.modifiers && evt.key === "Enter") {
        karteisucheExport.exportieren();
      }
    });
  });
  document.getElementById("karteisuche-export-exportieren").addEventListener("click", () => karteisucheExport.exportieren());
  document.getElementById("karteisuche-export-abbrechen").addEventListener("click", () => overlayApp.schliessen(document.querySelector("#karteisuche-export")));
  // Prompt-Textfeld
  document.getElementById("dialog-prompt-text").addEventListener("keydown", function (evt) {
    sharedTastatur.detectModifiers(evt);
    if (!sharedTastatur.modifiers && evt.key === "Enter") {
      overlayApp.schliessen(this);
    }
  });
  // Dialog-Buttons
  [ "dialog-ok-button", "dialog-abbrechen-button", "dialog-ja-button", "dialog-nein-button" ].forEach(button => {
    document.getElementById(button).addEventListener("click", function () {
      overlayApp.schliessen(this);
    });
  });
  // Druck-Links
  document.querySelectorAll(".druck-icon").forEach(a => drucken.listener(a));
  // Druck-Fenster
  document.querySelectorAll("#drucken-head span").forEach(span => drucken.buttons(span));
  // Updates-Fenster
  document.querySelectorAll("#updatesWin-header input").forEach(i => updates.buttons(i));
  // Schließen-Links von Overlays
  document.querySelectorAll(".overlay-schliessen").forEach(a => overlayApp.initSchliessen(a));
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
    i.textContent = dd.app.name;
  });
  // Breite Datumsfelder anpassen
  if (!/^de/i.test(dd.app.lang)) {
    document.querySelectorAll('[type="datetime-local"]').forEach(i => {
      i.classList.add("lang-en");
    });
  }
  // macOS
  if (dd.app.platform === "darwin") {
    // Option zum Ausblenden der Menüleiste verstecken
    const option = document.getElementById("einstellung-autoHideMenuBar").parentNode;
    option.classList.add("aus");
  }
  // Tastaturkürzel ändern
  sharedTastatur.shortcutsText();
  // Tooltips initialisieren
  tooltip.init();

  // IPC-ANFRAGEN
  // Bilder vorladen
  const bilderPreload = [];
  const bilder = await bridge.ipc.invoke("bilder-senden");
  for (const b of bilder) {
    const img = new Image();
    img.src = `img/${b}`;
    bilderPreload.push(img);
  }

  // XML-INDENT.XSL LADEN
  await shared.resourcesLoad({
    file: "xml-indent.xsl",
    targetObj: sharedXml,
    targetKey: "indentXsl",
  });

  // FENSTER FREISCHALTEN
  updates.hinweis();
  await shared.fensterGeladen();
  if (!optionen.data.einstellungen.bearbeiterin) {
    bearbeiterin.oeffnen();
  }
});

// FEHLER AN MAIN SCHICKEN
window.addEventListener("error", evt => shared.onError({
  evt,
  file: kartei.pfad,
  word: kartei.titel,
}));
window.addEventListener("unhandledrejection", evt => shared.onError({
  evt,
  file: kartei.pfad,
  word: kartei.titel,
}));
