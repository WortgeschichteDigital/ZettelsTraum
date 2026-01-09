
import bedvis from "./bedvis.mjs";
import beleg from "./beleg.mjs";
import helfer from "./helfer.mjs";
import kartei from "./kartei.mjs";
import liste from "./liste.mjs";
import optionen from "./optionen.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import suchleiste from "../suchleiste.mjs";
import tooltip from "../tooltip.mjs";

export { stamm as default };

const stamm = {
  // speichert, ob im Formvarianten-Fenster Änderungen vorgenommen wurden
  geaendert: false,

  // Part-of-speech-Tags
  partOfSpeech: {
    ADJA: "attributives Adjektiv",
    ADJD: "adverbiales oder prädikatives Adjektiv",
    ADV: "Adverb",
    APPR: "Präposition, Zirkumposition links",
    APPRART: "Präposition mit Artikel",
    APPO: "Postposition",
    APZR: "Zirkumposition rechts",
    ART: "bestimmter oder unbestimmter Artikel",
    CARD: "Kardinalzahl",
    FM: "Fremdsprache",
    ITJ: "Interjektion",
    KON: "Konjunktion",
    KOKOM: "Komparativbestimmung",
    KOUI: "Subjunktion, Infinitivsatz einleitend",
    KOUS: "Subjunktion, Satz einleitend",
    NA: "substantiviertes Adjektiv",
    NE: "Eigenname",
    NN: "normales Nomen",
    PAV: "Pronominaladverb",
    PDAT: "attribuierendes Demonstrativpronomen",
    PDS: "substituierendes Demonstrativpronomen",
    PIAT: "attribuierendes Indefinitpronomen ohne Determiner",
    PIDAT: "attribuierendes Indefinitpronomen mit Determiner",
    PIS: "substituierendes Indefinitpronomen",
    PPER: "irreflexives Personalpronomen",
    PRF: "reflexives Personalpronomen",
    PPOSS: "substituierendes Possessivpronomen",
    PPOSAT: "attribuierendes Possessivpronomen",
    PRELAT: "attribuierendes Relativpronomen",
    PRELS: "substituierendes Relativpronomen",
    PTKA: "Partikel bei Adjektiv oder Adverb",
    PTKANT: "Antwortpartikel",
    PTKNEG: "Negationspartikel",
    PTKVZ: "abgetrennter Verbzusatz",
    PTKZU: "„zu“ vor Infinitiv",
    PWS: "substituierendes Interrogativpronomen",
    PWAT: "attribuierendes Interrogativpronomen",
    PWAV: "adverbiales Interrogativ- oder Relativpronomen",
    TRUNC: "Kompositions-Erstglied",
    VAFIN: "finites Verb, aux",
    VAIMP: "Imperativ, aux",
    VAINF: "Infinitiv, aux",
    VAPP: "Partizip Perfekt, aux",
    VMFIN: "finites Verb, modal",
    VMINF: "Infinitiv, modal",
    VMPP: "Partizip Perfekt, modal",
    VVFIN: "finites Verb, voll",
    VVIMP: "Imperativ, voll",
    VVINF: "Infinitiv, voll",
    VVIZU: "Infinitiv mit „zu“, voll",
    VVPP: "Partizip Perfekt, voll",
    XY: "Nichtwort",
  },

  // speichert, ob der Ladevorgang der Formvarianten noch läuft
  ladevorgang: false,

  // Formvarianten-Fenster einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Kartei &gt; Formvarianten</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // wird die Variantenliste gerade erstellt, darf sich das Fenster nicht öffnen
    if (stamm.ladevorgang) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Liste der Formvarianten wird gerade erstellt.\nVersuchen Sie es in ein paar Sekunden noch einmal.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("stamm");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    // Änderungsmarkierung nach dem Öffnen zurücksetzen
    stamm.geaendert = false;
    // Kopf und Liste initial aufbauen
    stamm.aufbauen();
    // Maximalhöhe der Variantenliste festlegen
    shared.elementMaxHeight({
      ele: document.getElementById("stamm-liste"),
    });
  },

  // Formvarianten-Fenster schließen
  schliessen () {
    if (stamm.geaendert) {
      // Update von Belegliste oder Karteikarte
      if (shared.hauptfunktion === "liste") {
        liste.status(true);
      } else if (shared.hauptfunktion === "karte" &&
          beleg.leseansicht) {
        beleg.leseFill();
        if (suchleiste.aktiv) {
          suchleiste.suchen(true);
        }
      }

      // Änderungshinweis an das BedVis-Fenster schicken
      bedvis.cardboxUpdate();
    }
    overlay.ausblenden(document.getElementById("stamm"));
  },

  // Kopf und Liste aufbauen
  //   wortAkt = false | undefined
  aufbauen (wortAkt = true) {
    // ggf. aktuelles Wort ermitteln
    if (wortAkt) {
      stamm.wortAkt = Object.keys(dd.file.fv)[0];
    }
    // Kopf erzeugen
    stamm.kopf();
    // Liste erzeugen
    stamm.auflisten();
    // Fokus in das Textfeld
    document.getElementById("stamm-text").focus();
  },

  // speichert den Bestandteil des/eines mehrgliedrigen Karteiworts, dessen Liste gerade zu sehen ist;
  // in der Regel sollte das somit *das* Karteiwort sein
  // (beim Öffnen des Fensters steht hier der Name des ersten Objects in dd.file.fv)
  wortAkt: "",

  // Kopf aufbauen
  kopf () {
    const cont = document.getElementById("stamm-kopf");
    cont.replaceChildren();
    // Wortblöcke aufbauen
    const woerter = Object.keys(dd.file.fv);
    for (let i = 0, len = woerter.length; i < len; i++) {
      const wort = woerter[i];
      // Container
      const span = document.createElement("span");
      cont.appendChild(span);
      span.dataset.wort = wort;
      if (wort === stamm.wortAkt) {
        span.classList.add("aktiv");
      }
      if (len > 1) {
        stamm.kopfAktiv(span);
      }
      // Icons
      stamm.kopfIcons(span);
      // Wort
      const spanWort = document.createElement("span");
      span.appendChild(spanWort);
      spanWort.classList.add("wort");
      spanWort.textContent = wort;
      // Icon: Konfiguration
      const a = document.createElement("a");
      span.appendChild(a);
      a.classList.add("icon-link", "konfig");
      a.href = "#";
      a.textContent = "\u00A0";
      a.title = "Konfiguration öffnen";
      stamm.kopfKonfigListener(a);
    }
    tooltip.init(cont);
  },

  // Wort auswählen, dessen Formvarianten aufgelistet werden sollen
  //   span = Element
  //     (der Kopfblock mit den Icons und dem Wort)
  kopfAktiv (span) {
    span.addEventListener("click", function () {
      // ist der angeklickte Block bereits aktiv?
      if (this.classList.contains("aktiv")) {
        return;
      }
      // ggf. Konfigurations-Popup schließen
      stamm.kopfKonfigSchliessen();
      // Anzeige im Kopf ändern
      const aktiv = document.querySelector("#stamm-kopf .aktiv");
      aktiv.classList.remove("aktiv");
      this.classList.add("aktiv");
      // Liste ändern
      stamm.wortAkt = this.dataset.wort;
      stamm.auflisten();
    });
  },

  // Konfigurations-Popup (Listener)
  //   a = Element
  //     (der Icon-Link zum Öffnen des Konfigurations-Popups)
  kopfKonfigListener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // da zugleich stamm.kopfAktiv() depatched wird (was es auch soll),
      // würde das Fenster ohne Timeout nicht aufgebaut werden
      setTimeout(() => stamm.kopfKonfig(this), 25);
    });
  },

  // Konfigurations-Popup
  //   a = Element
  //     (der Icon-Link zum Öffnen des Konfigurations-Popups)
  kopfKonfig (a) {
    const cont = a.parentNode;
    const wort = cont.dataset.wort;
    // altes Konfigurations-Popup ggf. schließen
    stamm.kopfKonfigSchliessen();
    // Popup
    const popup = document.createElement("span");
    cont.appendChild(popup);
    popup.id = "stamm-popup";
    if (cont.offsetLeft > 0) {
      popup.classList.add("rechts");
    } else {
      popup.classList.add("links");
    }
    popup.addEventListener("click", evt => evt.stopPropagation()); // damit stamm.kopfAktiv() nicht dispatched wird, wenn irgendwo im Konfigurations-Popup geklickt wird
    // Schließen-Icon
    const img = document.createElement("img");
    popup.appendChild(img);
    img.src = "img/x.svg";
    img.width = "24";
    img.height = "24";
    img.title = "Popup schließen (Esc)";
    img.addEventListener("click", () => stamm.kopfKonfigSchliessen());
    // Part-of-speech
    let p = document.createElement("p");
    popup.appendChild(p);
    p.classList.add("stamm-popup-ps");
    const strong = document.createElement("strong");
    p.appendChild(strong);
    strong.textContent = `${wort}:\u00A0`;
    if (dd.file.fv[wort].ps) {
      const ps = dd.file.fv[wort].ps;
      const ausgeschrieben = stamm.partOfSpeech[ps] ? ` (${stamm.partOfSpeech[ps]})` : "";
      p.appendChild(document.createTextNode(ps + ausgeschrieben));
    } else {
      const span = document.createElement("span");
      p.appendChild(span);
      span.textContent = "Wortart unbekannt";
    }
    // Link zum DTA
    p = document.createElement("p");
    popup.appendChild(p);
    const icon = document.createElement("img");
    p.appendChild(icon);
    icon.src = "img/kreis-welt.svg";
    icon.width = "24";
    icon.height = "24";
    const link = document.createElement("a");
    p.appendChild(link);
    link.classList.add("link");
    link.href = `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=text&clean=1&pretty=1&raw=1&q=${encodeURIComponent(wort)}`;
    link.textContent = "DTA::CAB";
    shared.externeLinks(link);
    // Checkbox: aktivieren
    let an = 0;
    for (const val of Object.values(dd.file.fv)) {
      // mindestens ein Wort muss aktiviert sein; sonst darf dieses Wort nicht deaktiviert werden;
      // ist derzeit mehr als ein Wort aktiviert?
      if (val.an) {
        an++;
      }
    }
    if (an > 1 || an === 1 && !dd.file.fv[wort].an) {
      const check = stamm.kopfKonfigMakeCheckbox({
        wort,
        ds: "an",
        text: "aktivieren",
      });
      popup.appendChild(check);
    }
    // Checkbox: erweitern
    let check = stamm.kopfKonfigMakeCheckbox({
      wort,
      ds: "tr",
      text: "erweitern",
    });
    popup.appendChild(check);
    // Checkbox: Nebenlemma
    check = stamm.kopfKonfigMakeCheckbox({
      wort,
      ds: "nl",
      text: "Nebenlemma",
    });
    popup.appendChild(check);
    // Checkbox: nur markieren
    check = stamm.kopfKonfigMakeCheckbox({
      wort,
      ds: "ma",
      text: "nur markieren",
    });
    popup.appendChild(check);
    // Farbpalette
    p = document.createElement("p");
    popup.appendChild(p);
    p.classList.add("farben");
    for (let i = 0; i < 18; i++) {
      if (i > 0 && i % 6 === 0) {
        p.appendChild(document.createElement("br"));
      }
      const span = document.createElement("span");
      p.appendChild(span);
      span.classList.add("farbe", `wortFarbe${i}`);
      span.dataset.farbe = i;
    }
    p.querySelector(`.wortFarbe${dd.file.fv[wort].fa}`).classList.add("aktiv");
    p.querySelectorAll(".farbe").forEach(i => stamm.kopfKonfigFarbe(i));
    // Button: neu laden
    p = document.createElement("p");
    popup.appendChild(p);
    p.classList.add("stamm-popup-buttons");
    const button = document.createElement("input");
    p.appendChild(button);
    button.type = "button";
    button.value = "DTA-Import";
    stamm.kopfKonfigImport(button);
    // Button: löschen
    if (Object.keys(dd.file.fv).length > 1) {
      const button = document.createElement("input");
      p.appendChild(button);
      button.type = "button";
      button.value = "Löschen";
      stamm.kopfKonfigLoeschen(button);
    }
    // Tooltips initialisieren
    tooltip.init(popup);
  },

  // Konfigurations-Popup entfernen, wenn es existiert
  kopfKonfigSchliessen () {
    const popup = document.getElementById("stamm-popup");
    if (popup) {
      popup.parentNode.removeChild(popup);
    }
  },

  // Checkbox für das Konfigurations-Popup erzeugen
  //   wort = String
  //     (das Wort, um das es geht)
  //   ds = String
  //     (der Datensatz, der betroffen ist)
  //   text = String
  //     (der Text für das Label)
  kopfKonfigMakeCheckbox ({ wort, ds, text }) {
    const p = document.createElement("p");
    // Checkbox erzeugen
    const input = document.createElement("input");
    p.appendChild(input);
    input.dataset.ds = ds;
    input.id = `stamm-popup-checkbox-${ds}`;
    input.type = "checkbox";
    if (dd.file.fv[wort][ds]) {
      input.checked = true;
    }
    stamm.kopfKonfigCheckbox(input);
    // Label erzeugen
    const label = document.createElement("label");
    p.appendChild(label);
    label.setAttribute("for", `stamm-popup-checkbox-${ds}`);
    label.textContent = text;
    // Absatz zurückgeben
    return p;
  },

  // Änderung der Markierungsfarbe
  //   span = Element
  //     (das Quadrat, mit dem die Farbe ausgewählt wird)
  kopfKonfigFarbe (span) {
    span.addEventListener("click", function () {
      const aktiv = this.parentNode.querySelector(".aktiv");
      // Ist das Element schon aktiviert?
      if (aktiv === this) {
        return;
      }
      // Änderungsmarkierung setzen
      stamm.geaendert = true;
      // Änderung der Farbe übernehmen
      const wort = this.closest("[data-wort]").dataset.wort;
      dd.file.fv[wort].fa = parseInt(this.dataset.farbe, 10);
      // Aktivierung umstellen
      aktiv.classList.remove("aktiv");
      this.classList.add("aktiv");
      // Icons auffrischen
      stamm.kopfIcons(this.closest("[data-wort]"));
      // Änderungsmarkierung setzen
      kartei.karteiGeaendert(true);
    });
  },

  // Änderung der Checkboxes im Konfigurations-Popup übernehmen
  //   input = Element
  //     (die Checkbox im Konfigurations-Popup, die angeklickt wurde)
  kopfKonfigCheckbox (input) {
    input.addEventListener("click", function () {
      // Änderungsmarkierung setzen
      stamm.geaendert = true;
      // Eintrag in Datenobjekt auffrischen
      const ds = this.dataset.ds;
      const span = this.closest("[data-wort]");
      dd.file.fv[span.dataset.wort][ds] = this.checked;
      // Icons auffrischen
      stamm.kopfIcons(span);
      // Änderungsmarkierung setzen
      kartei.karteiGeaendert(true);
      // regulären Ausdruck mit allen Formvarianten neu erstellen
      helfer.formVariRegExp();
    });
  },

  // Icons in dem übergebenen Kopfblock auffrischen
  //   span = Element
  //     (der Kopfblock, in dem die Icons erzeugt/aufgefrischt werden sollen)
  kopfIcons (span) {
    // alle bisherigen Icons entfernen
    span.querySelectorAll(".stamm-kopf-icon, .farbe-kopf").forEach(i => i.parentNode.removeChild(i));

    // Wort ermitteln
    const wort = span.dataset.wort;

    // Textelement, vor dem die Images stehen sollen, zwischenspeichern
    const text = span.firstChild;

    // aktivieren
    if (dd.file.fv[wort].an) {
      span.insertBefore(stamm.kopfMakeIcon("check-gruen.svg"), text);
    } else {
      span.insertBefore(stamm.kopfMakeIcon("x-dick-rot.svg"), text);
    }

    // erweitern
    if (dd.file.fv[wort].an && !dd.file.fv[wort].tr) {
      span.insertBefore(stamm.kopfMakeIcon("nicht-trunkiert.svg"), text);
    }

    // Nebenlemma
    if (dd.file.fv[wort].an && dd.file.fv[wort].nl) {
      span.insertBefore(stamm.kopfMakeIcon("raute.svg"), text);
    }

    // nur markiert
    if (dd.file.fv[wort].an && dd.file.fv[wort].ma) {
      span.insertBefore(stamm.kopfMakeIcon("text-markiert.svg"), text);
    }

    // Farbe
    const fa = document.createElement("span");
    span.insertBefore(fa, text);
    fa.classList.add("farbe-kopf", `wortFarbe${dd.file.fv[wort].fa}`);
  },

  // Icon erzeugen
  //   src = String
  //     (Dateiname des Icons)
  kopfMakeIcon (src) {
    const img = document.createElement("img");
    img.classList.add("stamm-kopf-icon");
    img.src = `img/${src}`;
    img.width = "24";
    img.height = "24";
    return img;
  },

  // Formvarianten zu dem Wort, dessen Konfigurations-Popup gerade offen ist, erneut importieren
  //   input = Element
  //     (der DTA-Import-Button im Konfigurations-Popup)
  kopfKonfigImport (input) {
    input.addEventListener("click", () => {
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll der DTA-Import für <i>${stamm.wortAkt}</i> wirklich neu durchgeführt werden?\n(Manuell ergänzte Varianten bleiben erhalten; zuvor gelöschte DTA-Varianten werden wieder hinzugefügt.)`,
        callback: async () => {
          if (!dialog.antwort) {
            return;
          }
          // Sperrbildschirm anzeigen und kurz warten
          document.activeElement.blur();
          const sperre = helfer.sperre(document.getElementById("stamm-popup"));
          await new Promise(resolve => setTimeout(() => resolve(true), 250));
          // Request stellen
          const request = await stamm.dtaRequest(stamm.wortAkt, true);
          if (!request) {
            // Fehlermeldung wird von stamm.dtaRequest() ausgeworfen; nur den Sperrbildschirm entfernen
            sperre.parentNode.removeChild(sperre);
            return;
          }
          // Änderungsmarkierung setzen
          stamm.geaendert = true;
          // Kopf und Liste neu aufbauen
          stamm.aufbauen(false);
          // Änderungsmarkierung setzen
          kartei.karteiGeaendert(true);
          // regulären Ausdruck mit allen Formvarianten neu erstellen
          helfer.formVariRegExp();
        },
      });
    });
  },

  // Wort, dessen Konfigurations-Popup gerade offen ist, mit allen Formvarianten löschen
  //   input = Element
  //     (der Lösch-Button)
  kopfKonfigLoeschen (input) {
    input.addEventListener("click", () => {
      dialog.oeffnen({
        typ: "confirm",
        text: `Sollen <i>${stamm.wortAkt}</i> und all seine Formvarianten wirklich gelöscht werden?`,
        callback: () => {
          if (!dialog.antwort) {
            return;
          }
          // Änderungsmarkierung setzen
          stamm.geaendert = true;
          // Wort löschen
          delete dd.file.fv[stamm.wortAkt];
          // ist kein Wort mehr aktiv => erstes Wort aktivieren
          let an = 0;
          for (const val of Object.values(dd.file.fv)) {
            // mindestens ein Wort muss aktiviert sein;
            // ist derzeit mehr als ein Wort aktiviert?
            if (val.an) {
              an++;
            }
          }
          if (!an) {
            const [ erstesWort ] = Object.keys(dd.file.fv);
            dd.file.fv[erstesWort].an = true;
          }
          // Kopf und Liste neu aufbauen
          stamm.aufbauen();
          // Änderungsmarkierung setzen
          kartei.karteiGeaendert(true);
          // regulären Ausdruck mit allen Formvarianten neu erstellen
          helfer.formVariRegExp();
        },
      });
    });
  },

  // Liste der Formvarianten des aktuellen Worts aufbauen
  auflisten () {
    const cont = document.getElementById("stamm-liste");
    cont.replaceChildren();
    // Einträge auflisten
    const fo = dd.file.fv[stamm.wortAkt].fo;
    for (let i = 1, len = fo.length; i < len; i++) {
      // der erste Eintrag ist immer das Wort, wie es eingetragen wurde (allerdings lower case)
      // => diesen Eintrag nicht anzeigen, damit er nicht gelöscht wird
      const p = document.createElement("p");
      cont.appendChild(p);
      // Lösch-Link
      const a = document.createElement("a");
      a.href = "#";
      a.classList.add("icon-link", "icon-entfernen");
      a.dataset.fv = fo[i].va;
      stamm.entfernen(a);
      p.appendChild(a);
      // Text
      p.appendChild(document.createTextNode(fo[i].va));
      // Variante aus dem DTA?
      if (fo[i].qu === "dta") {
        const span = document.createElement("span");
        span.classList.add("dta");
        span.textContent = "DTA";
        span.title = "aus dem DTA importierte Formvariante";
        p.appendChild(span);
      }
    }
    tooltip.init(cont);
    // keine Varianten vorhanden
    if (!cont.hasChildNodes()) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("keine");
      p.textContent = "keine Formvarianten";
    }
  },

  // Verteilerfunktion für den Ergänzungs-Button
  ergaenzen () {
    const variante = document.getElementById("stamm-ergaenzen-variante").checked;
    const text = variante ? "keine Variante" : "kein Wort";
    const st = document.getElementById("stamm-text");
    const va = shared.textTrim(st.value, true);
    // Uppala! Keine Variante angegeben!
    if (!va) {
      dialog.oeffnen({
        typ: "alert",
        st: `Sie haben ${text} eingegeben.`,
        callback: () => {
          st.select();
        },
      });
      return;
    }
    if (variante) {
      stamm.ergaenzenVariante(va);
      return;
    }
    stamm.ergaenzenWort(va);
  },

  // Variante in der aktuellen Variantenliste ergänzen
  //   va = String
  //     (der bereits getrimmte Text im Textfeld)
  ergaenzenVariante (va) {
    // Varianten ergänzen, schon vorhandene übergehen
    const fo = dd.file.fv[stamm.wortAkt].fo;
    const varianten = [];
    const schon = [];
    va = va.replace(/"(.+)"/, (m, p1) => {
      varianten.push(p1);
      return "";
    });
    va.split(/[\s_]/).forEach(i => {
      if (i) {
        varianten.push(i);
      }
    });
    varianten.forEach(v => {
      const vLower = v.toLowerCase();
      if (fo.find(i => i.va === vLower)) {
        schon.push(v);
        return;
      }
      fo.push({
        qu: "zt",
        va: vLower,
      });
    });
    if (schon.length) {
      let numerus = [ "Variante", "ist" ];
      if (schon.length > 1) {
        numerus = [ "Varianten", "sind" ];
      }
      schon.forEach((i, n) => {
        schon[n] = `<i>${i}</i>`;
      });
      const schonJoined = schon.join(", ").replace(/(.+)(,\s)/, (m, p1) => `${p1} und `);
      dialog.oeffnen({
        typ: "alert",
        text: `Die ${numerus[0]} ${schonJoined} ${numerus[1]} schon in der Liste.`,
        callback: () => {
          document.getElementById("stamm-text").select();
        },
      });
      if (schon.length === varianten.length) {
        return;
      }
    }
    // Variante sortieren
    stamm.sortieren(fo, stamm.wortAkt.toLowerCase());
    // Abschluss
    stamm.ergaenzenAbschluss();
  },

  // Wort ergänzen, dabei die Formvarianten aus dem DTA ziehen
  //   va = String
  //     (der bereits getrimmte Text im Textfeld)
  async ergaenzenWort (va) {
    // ermitteln, welche Wörter importiert werden sollen
    const woerter = stamm.dtaPrepParole(va);
    const schon = [];
    const importieren = [];
    woerter.forEach(w => {
      if (!w) {
        return;
      } else if (dd.file.fv[w]) {
        schon.push(w);
        return;
      }
      importieren.push(w);
    });
    // Import anstoßen, wenn es Wörter zum Importieren gibt
    let sperre;
    if (importieren.length) {
      // ggf. Sperrbildschirm anzeigen und kurz warten
      document.activeElement.blur();
      sperre = helfer.sperre(document.getElementById("stamm-cont"));
      await new Promise(resolve => setTimeout(() => resolve(true), 250));
      // Promises erzeugen
      const promises = [];
      importieren.forEach(w => {
        dd.file.fv[w] = {
          an: true,
          fa: 0,
          fo: [
            {
              qu: "zt",
              va: w.toLowerCase(),
            },
          ],
          ma: false,
          nl: false,
          ps: "",
          tr: true,
        };
        promises.push(stamm.dtaRequest(w, true));
      });
      await Promise.all(promises);
    }
    // Sperre entfernen
    if (sperre) {
      sperre.parentNode.removeChild(sperre);
    }
    // Rückmeldung, falls Wörter nicht importiert wurden
    if (schon.length) {
      let numerus = [ "Das Wort", "ist" ];
      if (schon.length > 1) {
        numerus = [ "Die Wörter", "sind" ];
      }
      schon.forEach((i, n) => {
        schon[n] = `<i>${i}</i>`;
      });
      const schonJoined = schon.join(", ").replace(/(.+)(,\s)/, (m, p1) => `${p1} und `);
      const schonAlle = schon.length === woerter.length ? "\nEs wurde kein Wort ergänzt." : "";
      dialog.oeffnen({
        typ: "alert",
        text: `${numerus[0]} ${schonJoined} ${numerus[1]} schon aufgenommen.${schonAlle}`,
        callback: () => {
          document.getElementById("stamm-text").select();
        },
      });
      if (schonAlle) {
        return;
      }
    }
    // Kopf erzeugen
    stamm.kopf();
    // Abschluss
    stamm.ergaenzenAbschluss();
    // importiertes Wort (bei mehreren das letzte) auswählen
    if (importieren.length) {
      const neuesWort = document.querySelector(`#stamm-kopf [data-wort="${importieren[importieren.length - 1]}"]`);
      neuesWort.dispatchEvent(new Event("click"));
    }
  },

  // Abschluss des Ergänzen einer Variante oder eines Worts
  ergaenzenAbschluss () {
    // Änderungsmarkierung setzen
    stamm.geaendert = true;
    // Liste neu aufbauen
    stamm.auflisten();
    // Testfeld zurücksetzen
    document.getElementById("stamm-text").value = "";
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
    // regulären Ausdruck mit allen Formvarianten neu erstellen
    helfer.formVariRegExp();
  },

  // übergebene Liste der Formvarianten sortieren
  //   arr = Array
  //     (Array mit den Varianten, die sortiert werden sollen)
  //   wort = String
  //     (das Wort, für das die Formvarianten-Liste steht, und zwar lower case)
  sortieren (arr, wort) {
    arr.sort((a, b) => {
      // das betreffende Wort immer ganz nach oben schieben
      if (a.va === wort) {
        return -1;
      } else if (b.va === wort) {
        return 1;
      }
      // manuell hinzugefügte Varianten nach oben schieben
      if (a.qu === "zt" && b.qu !== "zt") {
        return -1;
      } else if (a.qu !== "zt" && b.qu === "zt") {
        return 1;
      }
      // Varianten derselben Kategorie alphabetisch sortieren
      const x = shared.sortAlphaPrep(a.va);
      const y = shared.sortAlphaPrep(b.va);
      const z = [ x, y ];
      z.sort();
      if (z[0] === x) {
        return -1;
      }
      return 1;
    });
  },

  // Eintrag aus der Formvariantenliste entfernen
  //   a = Element
  //     (der Entfernen-Link vor der betreffenden Formvariante)
  entfernen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      // Änderungsmarkierung setzen
      stamm.geaendert = true;
      // Index ermitteln
      const fo = dd.file.fv[stamm.wortAkt].fo;
      const fv = this.dataset.fv;
      const idx = fo.findIndex(i => i.va === fv);
      // Löschen
      fo.splice(idx, 1);
      // neu auflisten
      stamm.auflisten();
      // Änderungsmarkierung setzen
      kartei.karteiGeaendert(true);
      // regulären Ausdruck mit allen Formvarianten neu erstellen
      helfer.formVariRegExp();
    });
  },

  // Klick auf einen Button im Formvarianten-Fenster
  // (nicht im Konfigurations-Popup!)
  //   button = Element
  //     (Button im Formvarianten-Fenster)
  aktionButton (button) {
    button.addEventListener("click", function () {
      if (this.id === "stamm-ergaenzen") {
        stamm.ergaenzen();
      } else if (this.id === "stamm-dta") {
        const numerus = Object.keys(dd.file.fv).length > 1 ? "wirklich für alle Wörter" : `für <i>${stamm.wortAkt}</i> wirklich`;
        dialog.oeffnen({
          typ: "confirm",
          text: `Soll der DTA-Import ${numerus} neu durchgeführt werden?\n(Manuell ergänzte Varianten bleiben erhalten; zuvor gelöschte DTA-Varianten werden wieder hinzugefügt.)`,
          callback: () => {
            if (!dialog.antwort) {
              return;
            }
            // Wurden manuell Wörter ergänzt? Wenn ja => auch diese müssen aufgefrischt werden
            const woerter = shared.lemmaliste();
            for (const wort of Object.keys(dd.file.fv)) {
              woerter.add(wort);
            }
            // alle Wörter auffrischen
            stamm.dtaGet([ ...woerter ], true);
          },
        });
      }
    });
  },

  // Änderung der Radio-Buttons im Formvarianten-Fenster
  //   input = Element
  //     (der Radio-Button, der geändert wurde)
  aktionRadio (input) {
    input.addEventListener("change", function () {
      const st = document.getElementById("stamm-text");
      st.setAttribute("placeholder", this.value);
      st.select();
    });
  },

  // Tastatureingaben im Textfeld des Formvarianten-Fensters abfangen
  //   input = Element
  //     (Textfeld zum Ergänzen einer Formvariante bzw. eines Worts)
  aktionText (input) {
    input.addEventListener("keydown", function (evt) {
      sharedTastatur.detectModifiers(evt);
      if (!sharedTastatur.modifiers && evt.key === "Enter") {
        evt.preventDefault();
        stamm.ergaenzen();
      }
    });
  },

  // Formvarianten aller Karteiwörter initialisieren oder noch einmal laden
  //   woerter = Array
  //     (enthält die Wörter, zu denen Formvarianten bezogen werden sollen)
  //   aktiv = Boolean
  //     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
  async dtaGet (woerter, aktiv) {
    stamm.ladevorgang = true;
    // ggf. Sperrbildschirm anzeigen und kurz warten
    let sperre;
    if (aktiv) {
      document.activeElement.blur();
      sperre = helfer.sperre(document.getElementById("stamm-cont"));
      await new Promise(resolve => setTimeout(() => resolve(true), 250));
    }
    // Objekte anlegen
    for (const wort of woerter) {
      if (dd.file.fv[wort]) {
        // die Objekte sollten nicht überschrieben werden,
        // wenn alle Varianten auf Wunsch des Users noch einmal geladen werden;
        // manuell ergänzte Varianten und Konfiguration bleiben so erhalten
        continue;
      }
      dd.file.fv[wort] = {
        an: true,
        fa: 0,
        fo: [
          {
            qu: "zt",
            va: wort.toLowerCase(),
          },
        ],
        ma: false,
        nl: false,
        ps: "",
        tr: true,
      };
    }
    // Formvarianten abrufen und eintragen
    const request = await stamm.dtaRequest(woerter.join(" "), aktiv);
    if (!request) {
      // Fehler in der Promise => keine Formvarianten;
      // aber das Wort ist eingetragen => einfach abschließen
      stamm.dtaAbschluss(aktiv);
    }
    // Änderungsmarkierung setzen
    stamm.geaendert = true;
    // regulären Ausdruck mit allen Formvarianten neu erstellen
    helfer.formVariRegExp();
    // Ladevorgang abschließen
    if (sperre) {
      sperre.parentNode.removeChild(sperre);
    }
    stamm.ladevorgang = false;
  },

  // Karteiwörter vorbereiten
  // (Bereinigung um Satzzeichen, doppelte Wörter ausschließen)
  //   str = String
  //     (enthält das Wort oder die Wörter)
  dtaPrepParole (str) {
    const woerter = new Set();
    for (const w of str.split(/(?<=[0-9a-zäöü])\/(?=[0-9a-zäöü])/i)) {
      let wort = w.replace(/[([{<](.+?)[)\]}>]/g, () => "");
      wort = wort.replace(/[!?.:,;§$%&/\\=*+~#()[\]{}<>¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "");
      wort = shared.textTrim(wort, true);
      wort = wort.replace(/"(.+)"/, (m, p1) => {
        woerter.add(p1);
        return "";
      });
      wort = wort.replace(/"/, ""); // vereinzeltes Anführungszeichen ggf. weg
      wort.split(/[\s_]/).forEach(i => {
        if (i) {
          woerter.add(i);
        }
      });
    }
    return [ ...woerter ];
  },

  // Request an das DTA schicken, um an die Formvarianten zu kommen
  //   wort = String
  //     (das Wort, zu dem die Formvarianten gezogen werden sollen;
  //     kann durchaus mehrgliedrig sein)
  //   aktiv = Boolean
  //     (der Download der Varianten wurde bewusst angestoßen => ggf. Fehlermeldungen anzeigen)
  dtaRequest (wort, aktiv) {
    return new Promise(resolve => {
      const ajax = new XMLHttpRequest();
      ajax.open("GET", `https://www.deutschestextarchiv.de/demo/cab/query?a=expand.eqlemma&fmt=json&clean=1&q=${encodeURIComponent(wort)}`, true);
      ajax.timeout = parseInt(optionen.data.einstellungen.timeout, 10) * 1000;
      ajax.addEventListener("load", function () {
        if (ajax.status >= 200 && ajax.status < 300) {
          // JSON parsen
          let json;
          try {
            json = JSON.parse(ajax.response);
          } catch (err) {
            stamm.dtaFehler("Parsing-Fehler", err, aktiv);
            resolve(false);
            return;
          }
          stamm.dtaPush(json, aktiv);
          resolve(true);
        } else {
          stamm.dtaFehler("Download-Fehler", null, aktiv);
          resolve(false);
        }
      });
      ajax.addEventListener("timeout", function () {
        stamm.dtaFehler("Timeout-Fehler", null, aktiv);
        resolve(false);
      });
      ajax.addEventListener("error", function () {
        stamm.dtaFehler("allgemeiner Fehler", null, aktiv);
        resolve(false);
      });
      ajax.send(null);
    });
  },

  // Fehler beim Laden der Formvarianten des DTA
  //   fehlertyp = String
  //     (der allgemeine Fehlertyp)
  //   detail = String | null
  //     (falls Details zum Fehler vorhanden sind)
  //   aktiv = Boolean
  //     (das Laden der Lemmaliste wurde von der NutzerIn angestoßen)
  dtaFehler (fehlertyp, detail, aktiv) {
    // Fehlermeldung
    if (aktiv) {
      let text = `Beim Download der Formvarianten des DTA ist ein <strong>${fehlertyp}</strong> aufgetreten.`;
      if (detail) {
        text += `\n<h3>Fehlermeldung</h3>\n${detail}`;
      }
      dialog.oeffnen({
        typ: "alert",
        text,
      });
    }
  },

  // Arrays mit allen für die App relevanten Varianten in dd.file.fv eintragen
  //   json = Object
  //     (die Daten, die vom DTA zurückgekommen sind)
  //   aktiv = Boolean
  //     (das Laden der Lemmaliste wurde von der NutzerIn angestoßen)
  dtaPush (json, aktiv) {
    const fehler = [];
    for (const token of json.body[0].tokens) {
      // Wort ermitteln
      const wort = token.text;
      const wortLower = wort.toLowerCase();
      // Abbruch, wenn dieses Token uninteressant ist
      if (!dd.file.fv[wort]) {
        continue;
      }
      // Part-of-speech-Tag eintragen
      if (token.moot && token.moot.tag) {
        dd.file.fv[wort].ps = token.moot.tag;
      }
      // ein eindimensionales Array mit allen Varianten erzeugen
      let varianten = [];
      for (const i of token.eqlemma) {
        if (typeof i === "object" && i.hi) {
          varianten.push(i.hi.toLowerCase());
        } else if (typeof i === "string") {
          varianten.push(i.toLowerCase());
        }
      }
      // bei merkwürdigen Wörtern und Fällen könnte es sein, dass nichts
      // ausgelesen werden konnte (z. B. wenn man sich vertippt)
      if (!varianten.length) {
        fehler.push(wort);
        continue;
      }
      // doppelte Varianten eliminieren
      // (denn sie haben sich nur in Groß- und Kleinschreibung unterschieden)
      varianten = [ ...new Set(varianten) ];
      // ggf. das Wort hinzufügen
      // (Kann durchaus vorkommen! Wichtig, damit die Eliminierung funktioniert;
      // das Wort wird später wieder entfernt, weil es immer an Position 0 des Arrays steht)
      if (!varianten.includes(wortLower)) {
        varianten.push(wortLower);
      }
      // Varianten ermitteln, die kürzere Varianten enthalten
      // (diesen Reduktionsschritt nur durchführen, wenn das Wort trunkiert wird)
      const ex = new Set();
      if (dd.file.fv[wort].tr) {
        for (let i = 0, len = varianten.length; i < len; i++) {
          const variante = varianten[i];
          for (let j = 0; j < len; j++) {
            if (j === i ||
                varianten[j] === wortLower) {
              // der zweite Test wegen der Variantenlisten alter Dateien,
              // die das Wort selbst nicht unbedingt enthalten mussten
              continue;
            }
            if (varianten[j].includes(variante)) {
              ex.add(j);
            }
          }
        }
      }
      // das Wort, um das es geht, ebenfalls zum Übergehen vormerken
      // (es wurde bereits eingetragen und wird immer an Position 0 des Arrays stehen,
      // dabei aber nie gedruckt werden)
      if (varianten.includes(wortLower) &&
          dd.file.fv[wort].fo[0].va === wortLower) {
        // da das System geändert wurde: din alten Dateien könnte die erste Variante anders lauten
        ex.add(varianten.indexOf(wortLower));
      }
      // alte, manuell hinzugefügte Varianten ermitteln, die nicht im DTA sind
      // (hier wird in jedem Fall auch das Wort gefunden, um das es geht)
      const variantenZt = [];
      if (dd.file.fv[wort]) {
        for (const i of dd.file.fv[wort].fo) {
          if (i.qu === "zt" &&
              (i.va === wortLower || !varianten.includes(i.va))) {
            variantenZt.push(i.va);
          }
        }
      }
      // jetzt können die für die App relevanten Varianten endlich eingetragen werden
      dd.file.fv[wort].fo = [];
      for (let i = 0, len = variantenZt.length; i < len; i++) {
        dd.file.fv[wort].fo.push({
          qu: "zt",
          va: variantenZt[i],
        });
      }
      for (let i = 0, len = varianten.length; i < len; i++) {
        if (ex.has(i)) {
          continue;
        }
        dd.file.fv[wort].fo.push({
          qu: "dta",
          va: varianten[i],
        });
      }
      // Varianten sortieren
      stamm.sortieren(dd.file.fv[wort].fo, wortLower);
    }
    // ggf. Fehlermeldung auswerfen
    if (fehler.length) {
      let num = "in der Variantenliste";
      if (fehler.length > 1) {
        num = "in den Variantenlisten";
      }
      stamm.dtaFehler(`Fehler ${num} von <i>${fehler.join(", ")}</i>`, null, aktiv);
    }
    // Abschluss
    stamm.dtaAbschluss(aktiv);
  },

  // Import der Formvarianten abschließen, wenn aktiv durch User angestoßen
  //   aktiv = Boolean
  //     (Aktion wurde durch den User aktiv angestoßen)
  dtaAbschluss (aktiv) {
    if (!aktiv) {
      return;
    }
    kartei.karteiGeaendert(true);
    stamm.auflisten();
    document.getElementById("stamm-text").focus();
  },
};
