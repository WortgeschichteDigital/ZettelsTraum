
import bedeutungen from "./bedeutungen.mjs";
import bedeutungenWin from "./bedeutungenWin.mjs";
import beleg from "./beleg.mjs";
import kartei from "./kartei.mjs";
import lemmata from "./lemmata.mjs";
import lock from "./lock.mjs";
import notizen from "./notizen.mjs";
import optionen from "./optionen.mjs";
import redLit from "./redLit.mjs";
import redXml from "./redXml.mjs";
import speichern from "./speichern.mjs";
import tagger from "./tagger.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import suchleiste from "../suchleiste.mjs";

export { helfer as default };

const helfer = {
  // speichert den Timeout für das Resize-Event,
  // dessen Konsequenzen nicht zu häufig gezogen werden sollen
  resizeTimeout: null,

  // übergebene Sektion einblenden, alle andere Sektionen ausblenden
  //   sektion = String
  //     (ID der einzublendenden Sektion)
  sektion_aktiv: "",
  sektion_document_scroll: 0,
  sektionWechseln (sektion) {
    // Abbruch, wenn die Sektion gar nicht gewechsel werden muss
    if (sektion === helfer.sektion_aktiv) {
      return;
    }
    // Suchleiste ggf. ausblenden
    if (document.getElementById("suchleiste")) {
      suchleiste.ausblenden();
    }
    // Scroll-Status der Liste speichern oder wiederherstellen
    if (helfer.sektion_aktiv === "liste") {
      helfer.sektion_document_scroll = window.scrollY;
    }
    helfer.sektion_aktiv = sektion;
    // Sektion umschalten
    const sektionen = document.querySelectorAll("body > section");
    for (let i = 0, len = sektionen.length; i < len; i++) {
      if (sektionen[i].id === sektion) {
        sektionen[i].classList.remove("aus");
      } else {
        sektionen[i].classList.add("aus");
      }
    }
    // Scroll-Status wiederherstellen od. nach oben scrollen
    if (sektion === "liste") {
      window.scrollTo({
        left: 0,
        top: helfer.sektion_document_scroll,
        behavior: "auto",
      });
    } else {
      window.scrollTo({
        left: 0,
        top: 0,
        behavior: "auto",
      });
    }
  },

  // übernimmt das seitenweise Scrollen im Bedeutungsgerüst, der Belegliste und
  // Leseansicht der Karteikarte
  // (Grund: sonst wird Text unter dem Header versteckt)
  //   evt = Object
  //     (das Event-Objekt)
  scrollen (evt) {
    // nicht abfangen, wenn Overlay-Fenster offen ist
    if (overlay.oben()) {
      return;
    }
    // Space nicht abfangen, wenn Fokus auf <input>, <textarea>, contenteditable
    const aktiv = document.activeElement;
    if (evt.key === " " &&
        (/^(INPUT|TEXTAREA)$/.test(aktiv.nodeName) || aktiv.getAttribute("contenteditable"))) {
      return;
    }
    // normales scrollen unterbinden
    evt.preventDefault();
    // aktive Sektion und deren Abstand nach oben ermitteln
    const sektion = document.querySelector("body > section:not(.aus)");
    const sektionHeader = sektion.querySelector("header");
    const sektionTop = sektion.offsetTop;
    let header = 0;
    if (sektionHeader) {
      header = sektionHeader.offsetHeight;
    }
    // Ziel-Position ermitteln
    let top = 0;
    if (evt.key === "PageUp") { // hoch
      top = window.scrollY - window.innerHeight + sektionTop + header + 72; // 24px = Höhe Standardzeile
    } else if (/^( |PageDown)$/.test(evt.key)) { // runter
      top = window.scrollY + window.innerHeight - sektionTop - header - 72; // 24px = Höhe Standardzeile
    }
    // scrollen
    window.scrollTo({
      left: 0,
      top,
      behavior: "smooth",
    });
  },

  // Zufallsgenerator
  //   min = Number
  //     (Minimalwert)
  //   max = Number
  //     (Maximalwert)
  zufall (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // wählt den Text innerhalb des übergebenen Objekts aus
  //   obj = Element
  //     (das Element, in dem der Text komplett markiert werden soll)
  auswahl (obj) {
    const range = document.createRange();
    range.selectNodeContents(obj);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  },

  // Fokus aus Formularfeldern entfernen
  inputBlur () {
    const aktiv = document.activeElement;
    if (aktiv.type === "text" || aktiv.nodeName === "TEXTAREA") {
      aktiv.blur();
    }
  },

  // überprüft, ob in einem Number-Input eine zulässige Ziffer steht
  //   i = Element
  //     (das Number-Feld, das überprüft werden soll)
  inputNumber (i) {
    const v = parseInt(i.value, 10);
    if (isNaN(v) || v < i.min || v > i.max) {
      i.value = i.defaultValue;
    }
  },

  // Standardformatierungen in Edit-Feldern abfangen
  //   edit = Element
  //     (das Edit-Feld, das keine Standardformatierungen erhalten soll
  editNoFormat (edit) {
    edit.addEventListener("keydown", function (evt) {
      sharedTastatur.detectModifiers(evt);
      if (sharedTastatur.modifiers === "Ctrl" && /^Key[BIU]$/.test(evt.code)) {
        evt.preventDefault();
      }
    });
  },

  // beim Pasten von Text in ein Edit-Feld den Text ggf. vorher bereinigen
  // (wird zur Zeit nur von bedeutungen.js genutzt)
  //   ele = Element
  //     (das betreffende Edit-Feld)
  editPaste (ele) {
    ele.addEventListener("paste", function (evt) {
      // Muss der Text aufbereitet werden?
      const clipHtml = evt.clipboardData.getData("text/html");
      const clipText = evt.clipboardData.getData("text/plain");
      if (!clipHtml && !clipText) {
        return;
      }
      // Pasten unterbinden
      evt.preventDefault();
      // Text aufbereiten
      let text = clipHtml ? clipHtml : clipText;
      text = beleg.toolsEinfuegenHtml(text, true);
      text = text.replace(/\n+/g, " ");
      text = shared.textTrim(text, true);
      // Bereinigung von Aufzählungszeichen, die Word mitliefert
      text = text.replace(/^[0-9a-zA-Z·]\.?\s+/, "");
      // Paraphrasen markieren
      text = text.replace(/‚(.+?)‘/g, (m, p1) => `<mark class="paraphrase">${p1}</mark>`);
      // Text in das Feld eintragen
      ele.innerHTML = text;
      // Input-Event abfeuern
      ele.dispatchEvent(new Event("input"));
    });
  },

  // ergänzt Style-Information für eine Kopie im HTML-Format;
  // löscht die nicht zum Original gehörenden Markierungen der BenutzerIn
  //   html = String
  //     (der Quelltext, in dem die Ersetzungen vorgenommen werden sollen)
  clipboardHtml (html) {
    // temporären Container erstellen
    const cont = document.createElement("div");
    cont.innerHTML = html;
    // Hervorhebungen, die standardmäßig gelöscht gehören
    const marks = [ ".suche", ".suchleiste", ".klammer-technisch" ];
    if (!optionen.data.einstellungen["textkopie-wort"]) { // Hervorhebung Karteiwort ebenfalls löschen
      marks.push(".wort");
    } else {
      marks.push(".farbe0 .wort");
    }
    if (!optionen.data.einstellungen["textkopie-annotierung"]) { // Annotierungen ebenfalls löschen
      marks.push(".user");
    }
    helfer.clipboardHtmlErsetzen({
      cont,
      selectors: marks.join(", "),
    });
    // Hervorhebung Karteiwort ggf. umwandeln
    const hervorhebungen = [];
    if (optionen.data.einstellungen["textkopie-wort"]) {
      hervorhebungen.push(".wort");
    }
    if (optionen.data.einstellungen["textkopie-annotierung"]) {
      hervorhebungen.push(".user");
    }
    if (hervorhebungen.length) {
      // verbliebene Karteiwort-Hervorhebungen umwandeln
      cont.querySelectorAll(hervorhebungen.join(", ")).forEach(i => {
        i.innerHTML = `<b>${i.innerHTML}</b>`;
      });
      if (optionen.data.einstellungen["textkopie-wort-hinterlegt"]) {
        // <mark> durch <span> mit @style ersetzen
        helfer.clipboardHtmlErsetzen({
          cont,
          selectors: hervorhebungen.join(", "),
          typ: "span",
          style: "background-color: #e5e5e5",
        });
      }
      // <mark> entfernen
      let sicherung = 0;
      while (cont.querySelector("mark")) {
        if (sicherung > 25) {
          // nur für den Fall, dass irgendetwas ganz doll schiefgehen sollte
          break;
        }
        sicherung++;
        const template = document.createElement("template");
        cont.querySelectorAll("mark").forEach(i => {
          template.innerHTML = i.innerHTML;
          i.parentNode.replaceChild(template.content, i);
        });
      }
    }
    // Annotierungen endgültig löschen
    helfer.clipboardHtmlErsetzen({
      cont,
      selectors: ".annotierung-wort",
    });
    // TEI-Klassen umwandeln
    const styles = {
      "tei-antiqua": "font-family: sans-serif",
      "tei-doppelt": "text-decoration: underline double",
      "tei-gesperrt": "letter-spacing: 4px",
      "tei-groesser": "font-size: 20px",
      "tei-initiale": "font-size: 24px",
      "tei-kapitaelchen": "font-variant: small-caps",
    };
    for (const style of Object.keys(styles)) {
      stylesAnpassen(style);
    }
    // Ergebnis der Bereinigung zurückggeben
    return cont.innerHTML;
    // Ersetzungsfunktion für die TEI-Layout-Container
    function stylesAnpassen (style) {
      cont.querySelectorAll(`.${style}`).forEach(i => {
        i.setAttribute("style", styles[style]);
        i.removeAttribute("class");
      });
    }
  },

  // bereitet einen in HTMl formatierten String für eine XML-Kopie auf
  //   html = String
  //     (der Quelltext, in dem die Ersetzungen vorgenommen werden sollen)
  clipboardXml (html) {
    // temporären Container erstellen
    const cont = document.createElement("div");
    cont.innerHTML = html;
    // Hervorhebungen, die standardmäßig gelöscht gehören
    const marks = [ ".suche", ".suchleiste", ".farbe0 .user", ".farbe0 .wort" ];
    helfer.clipboardHtmlErsetzen({
      cont,
      selectors: marks.join(", "),
    });
    // Ergebnis der Aufbereitung zurückggeben
    return cont.innerHTML;
  },

  // Ersetzungsfunktion für zu löschende bzw. umzuwandelnde Element-Container
  //   cont = Element
  //     (in diesem Element sollen die Ersetzungen stattfinden)
  //   selectors = String
  //     (Liste der Selektoren)
  //   typ = String | undefined
  //     (Tag-Name des Ersatz-Containers)
  //   style = String | undefined
  //     (Style des Ersatz-Containers)
  clipboardHtmlErsetzen ({ cont, selectors, typ = "frag", style = "" }) {
    let quelle = cont.querySelector(selectors);
    while (quelle) { // die Elemente könnten verschachtelt sein
      let ersatz;
      if (typ === "span") {
        ersatz = document.createElement("span");
        ersatz.setAttribute("style", style);
      } else {
        ersatz = document.createDocumentFragment();
      }
      for (let i = 0, len = quelle.childNodes.length; i < len; i++) {
        ersatz.appendChild(quelle.childNodes[i].cloneNode(true));
      }
      quelle.parentNode.replaceChild(ersatz, quelle);
      quelle = cont.querySelector(selectors);
    }
  },

  // ein übergebenes Datum formatiert ausgeben
  //   datum = String
  //     (im ISO 8601-Format)
  //   format = String | undefined
  //     (steuert die verschiedenen Formatierungstypen)
  datumFormat (datum, format = "") {
    // Minuten und Sekunden formatieren
    const d = new Date(datum);
    let m = d.getMinutes().toString();
    let s = d.getSeconds().toString();
    if (m.length < 2) {
      m = "0" + m;
    }
    if (s.length < 2) {
      s = "0" + s;
    }
    // Format "minuten"
    if (format === "minuten") {
      return `${d.getDate()}.\u00A0${d.getMonth() + 1}. ${d.getFullYear()}, ${d.getHours()}:${m}\u00A0Uhr`;
    }
    // Format "sekunden"
    if (format === "sekunden") {
      return `${d.getDate()}.\u00A0${d.getMonth() + 1}. ${d.getFullYear()}, ${d.getHours()}:${m}:${s}\u00A0Uhr`;
    }
    // Format "technisch"
    if (format === "technisch") {
      let tag = d.getDate().toString();
      let monat = (d.getMonth() + 1).toString();
      let stunde = d.getHours().toString();
      if (tag.length < 2) {
        tag = "0" + tag;
      }
      if (monat.length < 2) {
        monat = "0" + monat;
      }
      if (stunde.length < 2) {
        stunde = "0" + stunde;
      }
      return `${tag}.\u00A0${monat}. ${d.getFullYear()}, ${stunde}:${m}:${s}\u00A0Uhr`;
    }
    // Format "einfach"
    if (format === "einfach") {
      const date = datum.match(/^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})$/);
      return `${date.groups.day.replace(/^0/, "")}.\u00A0${date.groups.month.replace(/^0/, "")}. ${date.groups.year}`;
    }
    // Standardformat
    const wochentage = [ "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag" ];
    const monate = [ "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember" ];
    return `${wochentage[d.getDay()]}, ${d.getDate()}.\u00A0${monate[d.getMonth()]} ${d.getFullYear()}, ${d.getHours()}:${m}\u00A0Uhr`;
  },

  // Variablen um Wortgrenzen zu bestimmen
  ganzesWortRegExp: {
    links: '\\s"„“”‚‘»«›‹/\\\\([\\\]{<>',
    rechts: '\\s"„“”‚‘»«›‹/\\\\)\\\]!?.:,;<>',
    // für Hervorhebung Karteiwort gewisse Klammern ignorieren: [] ()
    // (das ist deswegen, damit ich Komposita, in denen ein Glied geklammert ist,
    // auch hervorheben kann; z.B.: "(Handels-)Kolonie")
    linksWort: '\\s"„“”‚‘»«›‹/\\{<>',
    rechtsWort: '\\s"„“”‚‘»«›‹/\\!?.:,;<>',
  },

  // Zeichen maskieren
  //   string = String
  //     (Text, in dem Zeichen maskiert werden sollen)
  //   undo = Boolean
  //     (Maskierung zurücknehmen)
  escapeHtml (string, undo = false) {
    const zeichen = [
      {
        orig: "<",
        mask: "&lt;",
      },
      {
        orig: ">",
        mask: "&gt;",
      },
    ];
    for (const z of zeichen) {
      let reg;
      let rep;
      if (undo) {
        reg = new RegExp(z.mask, "g");
        rep = z.orig;
      } else {
        reg = new RegExp(z.orig, "g");
        rep = z.mask;
      }
      string = string.replace(reg, rep);
    }
    return string;
  },

  // Sammlung der regulären Ausdrücke aller Formvarianten;
  // in jedem Slot ein Objekt mit den Eigenschaften
  //   wort = das Wort, für den der reguläre Ausdruck erstellt wurde
  //   reg = der reguläre Ausdruck
  formVariRegExpRegs: [],

  // regulären Ausdruck mit allen Formvarianten erstellen
  formVariRegExp () {
    helfer.formVariRegExpRegs = [];
    // Wörter sammeln
    // ("Wörter" mit Leerzeichen müssen als erstes markiert werden,
    // darum an den Anfang sortieren)
    let woerter = [];
    if (dd.file.fv) {
      // beim ersten Aufruf nach dem Erstellen einer neuen Kartei,
      // steht dd.file.fv noch nicht zur Verfügung
      woerter = Object.keys(dd.file.fv);
    }
    woerter.sort((a, b) => {
      if (/\s/.test(a)) {
        return -1;
      } else if (/\s/.test(b)) {
        return 1;
      }
      return 0;
    });
    // RegExp erstellen
    for (const wort of woerter) {
      // Wort soll nicht berücksichtigt werden
      if (!dd.file.fv[wort].an) {
        continue;
      }
      // Varianten zusammenstellen
      const varianten = [];
      for (const form of dd.file.fv[wort].fo) {
        let text = shared.escapeRegExp(form.va.charAt(0));
        for (let i = 1, len = form.va.length; i < len; i++) {
          text += "(?:<[^>]+>|\\[¬\\]| \\[:.+?:\\] )*";
          text += shared.escapeRegExp(form.va.charAt(i));
        }
        text = shared.formVariSonderzeichen(text);
        varianten.push(text);
      }
      helfer.formVariRegExpRegs.push({
        wort,
        reg: varianten.join("|"),
      });
    }
  },

  // Sperr-Overlay erzeugen
  //   cont = Element
  //     (Container, in den das Overlay eingehängt werden soll)
  sperre (cont) {
    const div = document.createElement("div");
    div.classList.add("sperre", "rotieren-bitte");
    const img = document.createElement("img");
    div.appendChild(img);
    img.src = "img/pfeil-kreis-blau-96.svg";
    img.width = "96";
    img.height = "96";
    cont.appendChild(div);
    return div;
  },

  // lädt den Inhalt der übergebenen URL herunter
  //   url = String
  //     (URL, deren Inhalt heruntergeladen werden soll)
  async fetchURL (url) {
    // Abort-Controller initialisieren
    const controller = new AbortController();
    setTimeout(() => controller.abort(), parseInt(optionen.data.einstellungen.timeout, 10) * 1000);
    // Feedback vorbereiten
    const feedback = {
      fetchOk: true,
      fehler: "",
      text: "",
    };
    // Fetch durchführen
    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
      });
    } catch (err) {
      feedback.fetchOk = false;
      fehler(err);
      return feedback;
    }
    // Antwort des Servers fehlerhaft
    if (!response.ok) {
      feedback.fehler = `HTTP-Status-Code ${response.status}`;
      return feedback;
    }
    // Antworttext auslesen
    try {
      feedback.text = await response.text();
    } catch (err) {
      fehler(err);
    }
    // Feedback auswerfen
    return feedback;
    // Fehler eintragen
    function fehler (err) {
      if (err.name === "AbortError") {
        feedback.fehler = "Timeout-Fehler";
      } else {
        feedback.fehler = `${err.name}: ${err.message}`;
      }
    }
  },

  // öffnet den Dateimanager im Ordner der übergebenen Datei
  //   pfad = String
  //     (Pfad zu einer Datei)
  ordnerOeffnen (pfad) {
    if (!/\.ztj$/.test(pfad)) { // Ordner öffnen
      if (!/\/$/.test(pfad)) {
        pfad += dd.app.pathSep;
      }
      pfad += `.${dd.app.pathSep}`; // sonst wird nicht der Ordner, sondern der übergeordnete Ordner geöffnet
    }
    bridge.ipc.invoke("open-folder", pfad);
  },

  // überprüft Quell- und Zielpfade von CLI-Befehlen
  //   format = String
  //     (Dateiformat)
  //   typ = String
  //     (Literaturliste | Karteiliste)
  //   vars = Object
  //     (CLI-Parameter)
  async cliFolderCheck ({ format, typ, vars }) {
    const quelleExists = await bridge.ipc.invoke("file-exists", vars.quelle);
    let zielExists = await bridge.ipc.invoke("file-exists", vars.ziel);
    let neueDatei = false;
    if (!zielExists &&
        !/(\/|\\)$/.test(vars.ziel)) {
      zielExists = await bridge.ipc.invoke("file-exists", vars.ziel.replace(/(\/|\\)[^/\\]+$/, ""));
      neueDatei = true;
    }
    if (!quelleExists || !zielExists) {
      let falsch = "Quellpfad";
      let pfad = vars.quelle;
      if (!zielExists) {
        falsch = "Zielpfad";
        pfad = vars.ziel;
      }
      bridge.ipc.invoke("cli-message", `Fehler: ${falsch} nicht gefunden (${pfad})`);
      return false;
    }
    // Ist der Zielpfad ein Ordner?
    if (!neueDatei) {
      const stats = await bridge.ipc.invoke("file-info", vars.ziel);
      if (!stats.exists) {
        bridge.ipc.invoke("cli-message", `Fehler: Zugriffsfehler auf Zielpfad (${vars.ziel})`);
        return false;
      }
      if (stats.isDirectory) {
        if (!/(\/|\\)$/.test(vars.ziel)) {
          vars.ziel += dd.app.pathSep;
        }
        vars.ziel += `${typ.replace(/[/\\]/g, "-")}.${format}`;
      }
    }
    // CLI-Paramenter zurückgeben
    // (könnten sich geändert haben)
    return vars;
  },

  // markiert in der Titelleiste des Programms, dass irgendeine Änderung
  // noch nicht gespeichert wurde
  geaendert () {
    // Änderungsmarkierung?
    let asterisk = "";
    if (kartei.geaendert ||
        notizen.geaendert ||
        tagger.geaendert ||
        bedeutungen.geaendert ||
        beleg.geaendert) {
      asterisk = " *";
    }
    // Wort
    let wort = "";
    if (kartei.titel) {
      wort = `: ${kartei.titel}`;
    }
    // Dokumententitel
    document.title = dd.app.name + wort + asterisk;
  },

  // überprüft, ob das Bedeutungsgerüst offen ist und nicht durch irgendein
  // anderes Fenster verdeckt wird
  bedeutungenOffen () {
    if (!overlay.oben() && shared.hauptfunktion === "geruest") {
      return true;
    }
    return false;
  },

  // überprüft, ob die Karteikarte offen ist und nicht durch irgendein
  // anderes Fenster verdeckt wird
  belegOffen () {
    if (!overlay.oben() && shared.hauptfunktion === "karte") {
      return true;
    }
    return false;
  },

  // Öffnen der Demonstrationskartei
  async demoOeffnen () {
    const resources = await shared.resourcesPfad();
    const src = await bridge.ipc.invoke("path-join", [ resources, "Demonstrationskartei Team.ztj" ]);
    const dest = await bridge.ipc.invoke("path-join", [ dd.app.temp, "Demonstrationskartei Team.ztj" ]);
    const result = await bridge.ipc.invoke("file-copy", {
      src,
      dest,
    });
    if (result.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Kopieren der Demonstrationsdatei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
      return;
    }
    kartei.oeffnenEinlesen(dest);
  },

  // Handbuch an einer bestimmten Stelle aufschlagen
  //   a = Element
  //     (der Link, der einen abschnitt im Handbuch referenziert)
  handbuchLink (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      let abschnitt = this.dataset.handbuch;
      // Aufruf aus den Einstellungen => Abschnitt um Sektionen-ID ergänzen
      if (overlay.oben() === "einstellungen") {
        for (const section of document.querySelectorAll("#einstellungen-cont section")) {
          if (!section.classList.contains("aus")) {
            abschnitt += `-${section.id.replace(/.+-/, "")}`;
            break;
          }
        }
      }
      // Signal an den Main-Prozess
      bridge.ipc.invoke("hilfe-handbuch", abschnitt);
    });
  },

  // führt mitunter asynchrone Operationen aus, die nach und nach
  // vor dem Schließen eines Hauptfensters abgearbeitet werden müssen;
  // danach wird ein endgültiger Schließen-Befehl an Main gegeben
  async beforeUnload () {
    // Schließen unterbrechen, wenn ungespeicherte Änderungen
    if (lemmata.geaendert ||
        notizen.geaendert ||
        redLit.eingabe.changed ||
        redLit.db.changed ||
        tagger.geaendert ||
        bedeutungen.geaendert ||
        beleg.geaendert ||
        kartei.geaendert) {
      speichern.checkInit(() => {
        bridge.ipc.invoke("fenster-schliessen");
      }, {
        kartei: true,
      });
      return;
    }
    // Bedeutungen-Fenster ggf. schließen
    await bedeutungenWin.schliessen();
    // XML-Fenster ggf. schließen
    await redXml.schliessen();
    // Kartei entsperren
    await lock.actions({ datei: kartei.pfad, aktion: "unlock" });
    // Status des Fensters speichern
    const fensterStatus = await bridge.ipc.invoke("fenster-status", dd.win.winId, "fenster");
    if (fensterStatus) {
      optionen.data.fenster = fensterStatus;
    }
    // Optionen speichern
    await bridge.ipc.invoke("optionen-speichern", optionen.data, dd.win.winId);
    // Fenster endgültig schließen
    bridge.ipc.invoke("fenster-schliessen-endgueltig");
  },
};
