"use strict";

const { BrowserWindow, Menu, MenuItem } = require("electron");
const path = require("path");

// Liste der verfügbaren Menüpunkte
const punkte = {
  anhang: {
    label: "Anhang öffnen",
    icon: "oeffnen.png",
    click: "anhaenge.oeffnen(popup.anhangDatei)",
  },
  anhaengeAutoErgaenzen: {
    label: "Anhänge automatisch ergänzen",
    icon: "plus.png",
    click: "anhaenge.addAuto({ fenster: false })",
  },
  anhaengeFenster: {
    label: "Anhänge-Fenster",
    icon: "bueroklammer.png",
    click: "anhaenge.fenster()",
  },
  bearbeitenRueckgaengig: {
    label: "Rückgängig",
    icon: "pfeil-rund-links.png",
    role: "undo",
  },
  bearbeitenWiederherstellen: {
    label: "Wiederherstellen",
    icon: "pfeil-rund-rechts.png",
    role: "redo",
  },
  bearbeitenAusschneiden: {
    label: "Ausschneiden",
    icon: "schere.png",
    role: "cut",
  },
  bearbeitenKopieren: {
    label: "Kopieren",
    icon: "kopieren.png",
    role: "copy",
  },
  bearbeitenEinfuegen: {
    label: "Einfügen",
    icon: "einfuegen.png",
    role: "paste",
  },
  bearbeitenAlles: {
    label: "Alles auswählen",
    icon: "auswaehlen.png",
    role: "selectAll",
  },
  bedeutungenConf: {
    label: "Bedeutungsgerüst-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-bedeutungsgeruest"));
    `,
  },
  belegBearbeiten: {
    label: "Beleg bearbeiten",
    icon: "karteikarte.png",
    click: `
      overlay.alleSchliessen();
      beleg.oeffnen(parseInt(popup.belegID, 10));
    `,
  },
  belegDuplizieren: {
    label: "Beleg duplizieren",
    icon: "duplizieren.png",
    click: "kopieren.einfuegenEinlesen([kopieren.datenBeleg(data.ka[popup.belegID])], true)",
  },
  belegHinzufuegen: {
    label: "Beleg hinzufügen",
    icon: "dokument-plus.png",
    click: "speichern.checkInit(() => beleg.erstellen())",
    accelerator: "CommandOrControl+N",
  },
  belegLoeschen: {
    label: "Beleg löschen",
    icon: "muelleimer.png",
    click: "beleg.aktionLoeschenFrage(popup.belegID)",
  },
  belegZwischenablage: {
    label: "Beleg in Zwischenablage",
    icon: "einfuegen-pfeil.png",
    click: "beleg.ctrlZwischenablage(data.ka[popup.belegID])",
  },
  belegeAuflisten: {
    label: "Belege auflisten",
    icon: "liste-bullets.png",
    click: "speichern.checkInit(() => liste.wechseln())",
    accelerator: "CommandOrControl+L",
  },
  beleglisteConf: {
    label: "Belegliste-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-belegliste"));
    `,
  },
  erinnerungen: {
    label: "Erinnerungen",
    icon: "kreis-info.png",
    click: "erinnerungen.show()",
  },
  filterConf: {
    label: "Filter-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-filterleiste"));
    `,
  },
  filterReset: {
    label: "Filter zurücksetzen",
    icon: "pfeil-kreis.png",
    click: "filter.ctrlReset(true)",
  },
  karteiEntfernen: {
    label: "Aus Liste entfernen",
    icon: "muelleimer.png",
    click: "zuletzt.karteiEntfernen(popup.startDatei)",
  },
  karteiErstellen: {
    label: "Kartei erstellen",
    icon: "dokument-plus.png",
    click: "kartei.wortErfragen()",
    accelerator: "CommandOrControl+E",
  },
  karteikarteConf: {
    label: "Karteikarten-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-karteikarte"));
    `,
  },
  karteiOeffnen: {
    label: "Kartei öffnen",
    icon: "dokument-kartei.png",
    click: "popup.karteiLink.click()",
  },
  klammern: {
    label: "Klammern setzen",
    icon: "klammern.png",
  },
  klammernAutorenzusatz: {
    label: "Autorenzusatz",
    icon: "klammern-autorenzusatz.png",
    click: 'klammern.make("autorenzusatz")',
  },
  klammernEntfernen: {
    label: "Klammern entfernen",
    icon: "klammern-entfernen.png",
    click: 'klammern.remove()',
  },
  klammernLoeschung: {
    label: "Löschung",
    icon: "klammern-loeschung.png",
    click: 'klammern.make("loeschung")',
  },
  klammernStreichung: {
    label: "Streichung",
    icon: "klammern-streichung.png",
    click: 'klammern.make("streichung")',
  },
  kopfIconsConf: {
    label: "Icon-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-allgemeines"));
    `,
  },
  kopieren: {
    label: "Textauswahl",
    icon: "text-markiert.png",
    click: `
      modules.clipboard.write({
        text: popup.textauswahl.text,
        html: popup.textauswahl.html,
      });
      helfer.animation("zwischenablage");
    `,
  },
  kopierenConf: {
    label: "Kopieren-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-kopieren"));
    `,
  },
  kopierenNebenfenster: {
    label: "Textauswahl kopieren",
    icon: "kopieren.png",
    click: `
      modules.clipboard.write({
        text: popup.textauswahl.replace(/␣/g, "\u00A0").replace(/[.]{3}/g, "…"),
      });
    `,
  },
  kopierenCode: {
    label: "Code kopieren",
    icon: "kopieren.png",
    click: `
      modules.clipboard.write({
        text: popup.element.innerText.replace(/␣/g, "\u00A0").replace(/[.]{3}/g, "…"),
      });
    `,
  },
  kopierenID: {
    label: "ID kopieren",
    icon: "kopieren.png",
    click: `
      modules.clipboard.write({
        text: popup.kopfID,
      });
    `,
  },
  kopierfunktion: {
    label: "Kopierfunktion beenden",
    icon: "ausgang.png",
    click: "kopieren.uiOff()",
  },
  lexika: {
    label: "Lexika-Fenster",
    icon: "buecher.png",
    click: "lexika.oeffnen()",
  },
  link: {
    label: "Link kopieren",
    icon: "link.png",
    click: `
      modules.clipboard.write({
        text: popup.element.getAttribute("href"),
      });
    `,
  },
  literaturConf: {
    label: "Literatur-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-literatur"));
    `,
  },
  mail: {
    label: "Adresse kopieren",
    icon: "brief.png",
    click: `
      modules.clipboard.write({
        text: popup.element.getAttribute("href").replace(/^mailto:/, ""),
      });
    `,
  },
  markieren: {
    label: "Textauswahl markieren",
    icon: "text-markiert.png",
    click: "annotieren.makeUser()",
  },
  notizen: {
    label: "Notizen-Fenster",
    icon: "stift.png",
    click: "notizen.oeffnen()",
  },
  notizenConf: {
    label: "Notizen-Einstellungen",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-notizen"));
    `,
  },
  ordner: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: "helfer.ordnerOeffnen(popup.startDatei)",
  },
  ordnerAnhang: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: "anhaenge.oeffnen(popup.anhangDatei, true)",
  },
  ordnerKartei: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: "helfer.ordnerOeffnen(popup.karteiPfad)",
  },
  quickConf: {
    label: "Quick-Access-Bar konfigurieren",
    icon: "zahnrad.png",
    click: `
      optionen.oeffnen();
      optionen.sektionWechseln(document.getElementById("einstellungen-link-menue"));
    `,
  },
  redaktion: {
    label: "Redaktions-Ereignisse",
    icon: "personen.png",
    click: "redaktion.oeffnen()",
  },
  schliessen: {
    label: "Fenster schließen",
    icon: "x-dick.png",
    click: "overlay.schliessen(document.getElementById(overlay.oben()))",
    accelerator: "Esc",
  },
  text: {
    label: "Text in Zwischenablage",
    icon: "kopieren.png",
  },
  textReferenz: {
    label: "Referenz",
    icon: "link-pfeil-runter.png",
    click: `
      modules.clipboard.write({
        text: xml.belegId({}),
      });
    `,
  },
  titelAufnahmeCp: {
    label: "Titelaufnahme in Zwischenablage",
    icon: "kopieren.png",
  },
  titelAufnahmeText: {
    label: "Text",
    icon: "dokument.png",
    click: "redLit.titelZwischenablage('plain')",
  },
  titelAufnahmeXml: {
    label: "XML",
    icon: "xml.png",
    click: "redLit.titelZwischenablage('xml')",
  },
  titelAufnahmen: {
    label: "Versionen anzeigen",
    icon: "kreis-info.png",
    click: "redLit.anzeigePopup(popup.titelaufnahme.ds)",
  },
  titelBearbeiten: {
    label: "Titelaufnahme bearbeiten",
    icon: "stift.png",
    click: "redLit.dbCheck(() => redLit.eingabeBearbeiten(popup.titelaufnahme.ds), false)",
  },
  titelLoeschen: {
    label: "Titelaufnahme löschen",
    icon: "muelleimer.png",
    click: 'document.querySelector("#red-lit-popup .icon-muelleimer").dispatchEvent(new MouseEvent("click"))',
  },
  titelReferenzCp: {
    label: "Referenz in Zwischenablage",
    icon: "kopieren.png",
  },
  titelReferenzText: {
    label: "Text",
    icon: "dokument.png",
    click: "redLit.titelZwischenablage('plainReferenz')",
  },
  titelReferenzXml: {
    label: "XML",
    icon: "xml.png",
    click: "redLit.titelZwischenablage('xmlReferenz')",
  },
  titelSigle: {
    label: "Sigle in Zwischenablage",
    icon: "kopieren.png",
    click: "redLit.titelZwischenablage('sigle')",
  },
  titelXml: {
    label: "Titelaufnahme an XML-Fenster",
    icon: "xml.png",
    click: "redLit.xmlDatensatz({ id: popup.titelaufnahme.ds.id })",
  },
  wort: {
    label: "Lemmata ändern",
    icon: "lemmata.png",
    click: "kartei.wortAendern()",
  },
  xml: {
    label: "XML in Zwischenablage",
    icon: "xml.png",
  },
  xmlBeleg: {
    label: "Belegschnitt",
    icon: "beleg.png",
    click: "xml.schnittInZwischenablage()",
  },
  xmlFenster: {
    label: "Belegschnitt an XML-Fenster",
    icon: "xml.png",
    click: "xml.schnittInXmlFenster()",
  },
  xmlReferenz: {
    label: "Referenz",
    icon: "link-pfeil-runter.png",
    click: "xml.referenz()",
  },
};

module.exports = {
  // Rechtsklickmenü erzeugen
  //   contents = Object
  //     (Referenz auf den aufrufenden WebContents)
  //   items = Array
  //     (die Menüpunkte)
  make (contents, items) {
    // Menü erzeugen
    const menu = new Menu();
    for (const i of items) {
      // Separator
      if (i === "sep") {
        menu.append(module.exports.makeSep());
        continue;
      }
      // Submenü
      if (typeof i !== "string") {
        const args = { ...punkte[i.name] };
        args.sub = true;
        args.obj = true;
        const opt = module.exports.makeItem(args);
        for (const j of i.sub) {
          const args = { ...punkte[j] };
          args.contents = contents;
          args.obj = true;
          opt.submenu.push(module.exports.makeItem(args));
        }
        menu.append(new MenuItem(opt));
        continue;
      }
      // Menüpunkt
      const args = { ...punkte[i] };
      args.contents = contents;
      menu.append(module.exports.makeItem(args));
    }
    // Menü anzeigen
    menu.popup({
      window: BrowserWindow.fromWebContents(contents),
    });
  },

  // Menüpunkt erzeugen
  //   contents = Object
  //     (webContents des Fensters, in dem das Menü erscheint)
  //   label = String
  //     (Name des Menüpunkts)
  //   icon = String
  //     (Name der PNG-Datei)
  //   click = String
  //     (Funktionen, die auf Klick ausgeführt werden sollen)
  //   accelerator = String | undefined
  //     (Tastaturkürzel, das eine informative Funktion hat)
  //   sub = true | undefined
  //     (Item ist ein Submenü)
  //   obj = true | undefined
  //     (die Funktion soll ein Konfigurationsobjekt und kein MenuItem() zurückgeben)
  makeItem ({
    contents, label, icon,
    click = "",
    accelerator = "",
    role = "",
    sub = false,
    obj = false,
  }) {
    // Optionen zusammenbauen
    const opt = {
      label,
      icon: path.join(__dirname, "../", "../", "img", "menu", icon),
    };
    if (click) {
      opt.click = () => contents.executeJavaScript(click);
    }
    if (accelerator) {
      opt.accelerator = accelerator;
    }
    if (role) {
      opt.role = role;
    }
    if (sub) {
      opt.submenu = [];
    }
    // Rückgabe des Ergebnisses
    if (obj) {
      return opt;
    }
    return new MenuItem(opt);
  },

  // Separator erzeugen
  makeSep () {
    return new MenuItem({
      type: "separator",
    });
  },
};
