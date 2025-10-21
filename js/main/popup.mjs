
import {
  BrowserWindow,
  Menu,
  MenuItem,
} from "electron";
import path from "node:path";

import appMenu from "./appMenu.mjs";

export { popup as default };

const __dirname = import.meta.dirname;

// Liste der verfügbaren Menüpunkte
const punkte = {
  anhang: {
    label: "Anhang öffnen",
    icon: "oeffnen.png",
    click: () => appMenu.befehl("popup-anhaenge-oeffnen", false),
  },
  anhaengeAutoErgaenzen: {
    label: "Anhänge automatisch ergänzen",
    icon: "plus.png",
    click: () => appMenu.befehl("popup-anhaenge-auto-ergaenzen"),
  },
  anhaengeFenster: {
    label: "Anhänge-Fenster",
    icon: "bueroklammer.png",
    click: () => appMenu.befehl("popup-anhaenge-fenster"),
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
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-bedeutungsgeruest"),
  },
  belegBearbeiten: {
    label: "Beleg bearbeiten",
    icon: "karteikarte.png",
    click: () => appMenu.befehl("popup-beleg-bearbeiten"),
  },
  belegDuplizieren: {
    label: "Beleg duplizieren",
    icon: "duplizieren.png",
    click: () => appMenu.befehl("popup-beleg-duplizieren"),
  },
  belegHinzufuegen: {
    label: "Beleg hinzufügen",
    icon: "dokument-plus.png",
    click: () => appMenu.befehl("popup-beleg-hinzufuegen"),
    accelerator: "CommandOrControl+N",
  },
  belegLoeschen: {
    label: "Beleg löschen",
    icon: "muelleimer.png",
    click: () => appMenu.befehl("popup-beleg-loeschen"),
  },
  belegZwischenablage: {
    label: "Beleg in Zwischenablage",
    icon: "einfuegen-pfeil.png",
    click: () => appMenu.befehl("popup-beleg-zwischenablage"),
  },
  belegeAuflisten: {
    label: "Belege auflisten",
    icon: "liste-bullets.png",
    click: () => appMenu.befehl("popup-belege-auflisten"),
    accelerator: "CommandOrControl+L",
  },
  beleglisteConf: {
    label: "Belegliste-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-belegliste"),
  },
  belegschnitt: {
    label: "Belegschnitt markieren",
    icon: "klammern-schnitt.png",
    click: () => appMenu.befehl("popup-beleg-klammern-make", "belegschnitt"),
  },
  belegschnittDemarkieren: {
    label: "Belegschnitt demarkieren",
    icon: "klammern-schnitt-entfernen.png",
    click: () => appMenu.befehl("popup-beleg-klammern-remove", "belegschnitt"),
  },
  erinnerungen: {
    label: "Erinnerungen",
    icon: "kreis-info.png",
    click: () => appMenu.befehl("popup-erinnerungen"),
  },
  filterConf: {
    label: "Filter-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-filterleiste"),
  },
  filterReset: {
    label: "Filter zurücksetzen",
    icon: "pfeil-kreis.png",
    click: () => appMenu.befehl("popup-filter-reset"),
  },
  importConf: {
    label: "Import-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-import"),
  },
  karteiEntfernen: {
    label: "Aus Liste entfernen",
    icon: "muelleimer.png",
    click: () => appMenu.befehl("popup-kartei-entfernen"),
  },
  karteiErstellen: {
    label: "Kartei erstellen",
    icon: "dokument-plus.png",
    click: () => appMenu.befehl("popup-kartei-erstellen"),
    accelerator: "CommandOrControl+E",
  },
  karteikarteConf: {
    label: "Karteikarten-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-karteikarte"),
  },
  karteiOeffnen: {
    label: "Kartei öffnen",
    icon: "dokument-kartei.png",
    click: () => appMenu.befehl("popup-kartei-oeffnen"),
  },
  klammern: {
    label: "Klammern setzen",
    icon: "klammern.png",
  },
  klammernAutorenzusatz: {
    label: "Autorenzusatz",
    icon: "klammern-autorenzusatz.png",
    click: () => appMenu.befehl("popup-beleg-klammern-make", "klammer-autorenzusatz"),
  },
  klammernEntfernen: {
    label: "Klammern entfernen",
    icon: "klammern-entfernen.png",
    click: () => appMenu.befehl("popup-beleg-klammern-remove", "klammern"),
  },
  klammernLoeschung: {
    label: "Löschung",
    icon: "klammern-loeschung.png",
    click: () => appMenu.befehl("popup-beleg-klammern-make", "klammer-loeschung"),
  },
  klammernStreichung: {
    label: "Streichung",
    icon: "klammern-streichung.png",
    click: () => appMenu.befehl("popup-beleg-klammern-make", "klammer-streichung"),
  },
  kopfIconsConf: {
    label: "Icon-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-allgemeines"),
  },
  kopieren: {
    label: "Textauswahl",
    icon: "text-markiert.png",
    click: () => appMenu.befehl("popup-kopieren"),
  },
  kopierenConf: {
    label: "Kopieren-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-kopieren"),
  },
  kopierenNebenfenster: {
    label: "Textauswahl kopieren",
    icon: "kopieren.png",
    click: () => appMenu.befehl("popup-kopieren-nebenfenster"),
  },
  kopierenCode: {
    label: "Code kopieren",
    icon: "kopieren.png",
    click: () => appMenu.befehl("popup-kopieren-code"),
  },
  kopierenID: {
    label: "ID kopieren",
    icon: "kopieren.png",
    click: () => appMenu.befehl("popup-kopieren-id"),
  },
  kopierfunktion: {
    label: "Kopierfunktion beenden",
    icon: "ausgang.png",
    click: () => appMenu.befehl("popup-kopierfunktion"),
  },
  lexika: {
    label: "Lexika-Fenster",
    icon: "buecher.png",
    click: () => appMenu.befehl("popup-lexika"),
  },
  link: {
    label: "Link kopieren",
    icon: "link.png",
    click: () => appMenu.befehl("popup-link"),
  },
  mail: {
    label: "Adresse kopieren",
    icon: "brief.png",
    click: () => appMenu.befehl("popup-mail"),
  },
  markieren: {
    label: "Textauswahl markieren",
    icon: "text-markiert.png",
    click: () => appMenu.befehl("popup-markieren"),
  },
  notizen: {
    label: "Notizen-Fenster",
    icon: "stift.png",
    click: () => appMenu.befehl("popup-notizen"),
  },
  notizenConf: {
    label: "Notizen-Einstellungen",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-notizen"),
  },
  ordner: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: () => appMenu.befehl("popup-ordner"),
  },
  ordnerAnhang: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: () => appMenu.befehl("popup-anhaenge-oeffnen", true),
  },
  ordnerKartei: {
    label: "Ordner öffnen",
    icon: "ordner.png",
    click: () => appMenu.befehl("popup-ordner-kartei"),
  },
  quickConf: {
    label: "Quick-Access-Bar konfigurieren",
    icon: "zahnrad.png",
    click: () => appMenu.befehl("popup-optionen-oeffnen", "einstellungen-link-menue"),
  },
  redaktion: {
    label: "Redaktions-Ereignisse",
    icon: "personen.png",
    click: () => appMenu.befehl("popup-redaktion"),
  },
  redMeta: {
    label: "Redaktionsmetadaten",
    icon: "zeilen-4,0.png",
    click: () => appMenu.befehl("redaktion-metadaten"),
  },
  schliessen: {
    label: "Fenster schließen",
    icon: "x-dick.png",
    click: () => appMenu.befehl("popup-schliessen"),
    accelerator: "Esc",
  },
  text: {
    label: "Text in Zwischenablage",
    icon: "kopieren.png",
  },
  textComplete: {
    label: "Beleg",
    icon: "beleg.png",
    click: () => appMenu.befehl("popup-text-complete"),
  },
  textReferenz: {
    label: "Referenz",
    icon: "link-pfeil-runter.png",
    click: () => appMenu.befehl("popup-text-referenz"),
  },
  titelAufnahmeCp: {
    label: "Titelaufnahme in Zwischenablage",
    icon: "kopieren.png",
  },
  titelAufnahmeText: {
    label: "Text",
    icon: "dokument.png",
    click: () => appMenu.befehl("popup-titel-zwischenablage", "plain"),
  },
  titelAufnahmeXml: {
    label: "XML",
    icon: "xml.png",
    click: () => appMenu.befehl("popup-titel-zwischenablage", "xml"),
  },
  titelAufnahmen: {
    label: "Versionen anzeigen",
    icon: "kreis-info.png",
    click: () => appMenu.befehl("popup-titel-aufnahmen"),
  },
  titelBearbeiten: {
    label: "Titelaufnahme bearbeiten",
    icon: "stift.png",
    click: () => appMenu.befehl("popup-titel-bearbeiten"),
  },
  titelLoeschen: {
    label: "Titelaufnahme löschen",
    icon: "muelleimer.png",
    click: () => appMenu.befehl("popup-titel-loeschen"),
  },
  titelReferenzCp: {
    label: "Referenz in Zwischenablage",
    icon: "kopieren.png",
  },
  titelReferenzText: {
    label: "Text",
    icon: "dokument.png",
    click: () => appMenu.befehl("popup-titel-zwischenablage", "plainReferenz"),
  },
  titelReferenzXml: {
    label: "XML",
    icon: "xml.png",
    click: () => appMenu.befehl("popup-titel-zwischenablage", "xmlReferenz"),
  },
  titelSigle: {
    label: "Sigle in Zwischenablage",
    icon: "kopieren.png",
    click: () => appMenu.befehl("popup-titel-zwischenablage", "sigle"),
  },
  titelXml: {
    label: "Titelaufnahme an XML-Fenster",
    icon: "xml.png",
    click: () => appMenu.befehl("popup-titel-xml"),
  },
  wort: {
    label: "Lemmata ändern",
    icon: "lemmata.png",
    click: () => appMenu.befehl("popup-wort"),
  },
  xml: {
    label: "XML in Zwischenablage",
    icon: "xml.png",
  },
  xmlBeleg: {
    label: "Belegschnitt",
    icon: "beleg.png",
    click: () => appMenu.befehl("popup-xml-schnitt-cb", false),
  },
  xmlBelegComplete: {
    label: "Beleg",
    icon: "beleg.png",
    click: () => appMenu.befehl("popup-xml-schnitt-cb", true),
  },
  xmlFenster: {
    label: "Belegschnitt an XML-Fenster",
    icon: "xml.png",
    click: () => appMenu.befehl("popup-xml-schnitt-win", false),
  },
  xmlFensterComplete: {
    label: "Beleg an XML-Fenster",
    icon: "xml.png",
    click: () => appMenu.befehl("popup-xml-schnitt-win", true),
  },
  xmlReferenz: {
    label: "Referenz",
    icon: "link-pfeil-runter.png",
    click: () => appMenu.befehl("popup-xml-referenz"),
  },
};

const popup = {
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
        menu.append(popup.makeSep());
        continue;
      }
      // Submenü
      if (typeof i !== "string") {
        const args = clone(punkte[i.name]);
        args.sub = true;
        args.obj = true;
        const opt = popup.makeItem(args);
        for (const j of i.sub) {
          const args = clone(punkte[j]);
          args.obj = true;
          opt.submenu.push(popup.makeItem(args));
        }
        menu.append(new MenuItem(opt));
        continue;
      }
      // Menüpunkt
      const args = clone(punkte[i]);
      menu.append(popup.makeItem(args));
    }

    // Cloner
    function clone (punkt) {
      const c = {};
      for (const [ k, v ] of Object.entries(punkt)) {
        c[k] = v;
      }
      return c;
    }

    // Menü anzeigen
    menu.popup({
      window: BrowserWindow.fromWebContents(contents),
    });
  },

  // Menüpunkt erzeugen
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
    label, icon,
    click = "",
    accelerator = "",
    role = "",
    sub = false,
    obj = false,
  }) {
    // Optionen zusammenbauen
    const opt = {
      label,
      icon: path.join(__dirname, "..", "..", "img", "menu", icon),
    };
    if (click) {
      opt.click = click;
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
