"use strict";

const redMeta = {
  // Metdatenfenster einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Redaktion &gt; Metadaten</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }
    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("red-meta");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }
    fenster.querySelector("input").focus();
    // Notizen-Feld füllen
    document.getElementById("red-meta-notizen").value = data.rd.no;
    // Sachgebiete, Themenfelder, Stichwortplanung aufbauen
    redMeta.tags();
    // Liste der BearbeterInnen erstellen und das Textfeld leeren
    redMeta.bearbAuflisten();
    const be = document.getElementById("red-meta-be");
    be.value = "";
    // Maximalhöhe des Fensters anpassen
    helfer.elementMaxHeight({
      ele: document.getElementById("red-meta-over"),
    });
  },

  // Tags auflisten
  tags () {
    const tags = [ "sachgebiete", "stichwortplanung", "themenfelder" ];
    const keys = {
      sachgebiete: "sg",
      stichwortplanung: "sp",
      themenfelder: "tf",
    };
    for (const tag of tags) {
      const cont = document.getElementById(`red-meta-${tag}`);
      const arr = [];
      const tags = optionen.data.tags[tag];
      const name = tag.substring(0, 1).toUpperCase() + tag.substring(1);
      const del = []; // zu löschende Tags, die nicht mehr existieren
      if (tags) { // Tags vorhanden
        for (const i of data.rd[keys[tag]]) {
          if (!tags.data[i.id]) { // Tag existiert nicht mehr
            del.push(i.id);
            continue;
          }
          arr.push(tags.data[i.id].name);
        }
      } else { // Tags fehlen
        cont.textContent = `${name}-Datei fehlt`;
        cont.classList.add("kein-wert");
        continue;
      }
      // ggf. nicht mehr existente Tags löschen
      if (del.length) {
        for (const i of del) {
          const idx = data.rd[keys[tag]].findIndex(entry => entry.id === i);
          data.rd[keys[tag]].splice(idx, 1);
        }
        kartei.karteiGeaendert(true);
      }
      // Tags anzeigen
      if (arr.length) {
        cont.classList.remove("kein-wert");
        cont.textContent = arr.join(", ");
      } else {
        cont.classList.add("kein-wert");
        cont.textContent = `keine ${name} zugeordnet`;
      }
    }
  },

  // Tags hinzufügen
  //   typ = String
  //     (Typ der Tag-Datei)
  tagsAdd ({ typ }) {
    const tags = optionen.data.tags[typ];
    // keine Tag-Datei vorhanden
    if (!tags) {
      dialog.oeffnen({
        typ: "alert",
        text: `Das Programm muss zunächst mit einer ${typ.substring(0, 1).toUpperCase()}${typ.substring(1)}-Datei verknüpft werden.\nTag-Dateien können via <i>${appInfo.name} &gt; Einstellungen &gt; Bedeutungsgerüst</i> geladen werden.`,
        callback: () => document.getElementById("red-meta-notizen").focus(),
      });
      return;
    }
    // Tagger öffnen
    tagger.limit = [ typ ];
    tagger.oeffnen(`red-meta-${typ}`);
  },

  // BearbeiterInnen des Zettels auflisten
  bearbAuflisten () {
    const cont = document.getElementById("red-meta-be-liste");
    cont.replaceChildren();
    // keine BearbeiterInnen eingetragen
    if (!data.rd.be.length) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("kein-wert");
      p.textContent = "keine BearbeiterIn registriert";
      return;
    }
    // BearbeiterInnen auflisten
    for (let i = 0, len = data.rd.be.length; i < len; i++) {
      const p = document.createElement("p");
      cont.appendChild(p);
      // Lösch-Link
      const a = document.createElement("a");
      p.appendChild(a);
      a.href = "#";
      a.classList.add("icon-link", "icon-entfernen");
      a.dataset.bearb = data.rd.be[i];
      redMeta.bearbEntfernen(a);
      // BearbeiterIn
      p.appendChild(document.createTextNode(data.rd.be[i]));
    }
  },

  // BearbeiterIn ergänzen
  bearbErgaenzen () {
    const be = document.getElementById("red-meta-be");
    const va = helfer.textTrim(be.value, true);
    // Uppala! Keine BearbeiterIn angegeben!
    if (!va) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keinen Namen eingegeben.",
        callback: () => be.select(),
      });
      return;
    }
    // BearbeiterIn schon registriert
    if (data.rd.be.includes(va)) {
      dialog.oeffnen({
        typ: "alert",
        text: "Die BearbeiterIn ist schon in der Liste.",
        callback: () => be.select(),
      });
      return;
    }
    // BearbeiterIn ergänzen und Liste sortieren
    be.value = "";
    data.rd.be.unshift(va);
    // Liste neu aufbauen
    redMeta.bearbAuflisten();
    // Änderungsmarkierung setzen
    kartei.karteiGeaendert(true);
    // Erinnerungen-Icon auffrischen
    erinnerungen.check();
  },

  // BearbeiterIn aus der Liste entfernen
  //   a = Element
  //     (Löschlink vor der Bearbeiterin)
  bearbEntfernen (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      const bearb = this.dataset.bearb;
      const be = document.getElementById("red-meta-be");
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll <i>${bearb}</i> wirklich aus der Liste entfernt werden?`,
        callback: () => {
          if (dialog.antwort) {
            // Löschen
            data.rd.be.splice(data.rd.be.indexOf(bearb), 1);
            // neu auflisten
            redMeta.bearbAuflisten();
            // Änderungsmarkierung setzen
            kartei.karteiGeaendert(true);
            // Erinnerungen-Icon auffrischen
            erinnerungen.check();
            // Fokus setzen
            be.focus();
          } else {
            be.focus();
          }
        },
      });
    });
  },

  // Klick auf Button
  aktionButton (button) {
    button.addEventListener("click", function () {
      redMeta.bearbErgaenzen();
    });
  },

  // Timeout, damit bei Tastureingabe im Notizen-Feld
  // gewisse Funktionen nicht zu häufig getriggert werden
  timeout: null,

  // Tastatureingaben in einem der Textfelder
  //   input = Element
  //     (das Textfeld)
  aktionText (input) {
    if (input.id === "red-meta-notizen") {
      input.addEventListener("input", function () {
        data.rd.no = this.value;
        // die folgenden Funktionen nicht zu häufig aufrufen
        clearTimeout(redMeta.timeout);
        redMeta.timeout = setTimeout(() => {
          // Änderungsmarkierung setzen
          kartei.karteiGeaendert(true);
          // Erinnerungen-Icon auffrischen
          erinnerungen.check();
        }, 250);
      });
    } else if (input.id === "red-meta-be") {
      input.addEventListener("keydown", function (evt) {
        tastatur.detectModifiers(evt);
        if (!tastatur.modifiers && evt.key === "Enter") {
          evt.preventDefault();
          if (document.getElementById("dropdown")) {
            return;
          }
          redMeta.bearbErgaenzen();
        }
      });
    }
  },
};
