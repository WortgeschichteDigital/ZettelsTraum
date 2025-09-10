
import beleg from "./beleg.mjs";
import kartei from "./kartei.mjs";
import liste from "./liste.mjs";
import overlayApp from "./overlayApp.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";

export { belegeTaggen as default };

const belegeTaggen = {
  // in der Belegliste sichtbare Belege
  karten: [],

  // Tagging-Fenster für Belege einblenden
  oeffnen () {
    // Sperre für macOS (Menüpunkte können nicht deaktiviert werden)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Taggen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }

    // Ist die Belegliste sichtbar?
    if (!liste.listeSichtbar({ funktion: "Belege &gt; Taggen" })) {
      return;
    }

    // sichtbare Belege ermitteln
    belegeTaggen.karten = [];
    document.querySelectorAll("#liste-belege .liste-kopf").forEach(i => belegeTaggen.karten.push(i.dataset.id));
    // keine Belege in der Belegliste
    if (!belegeTaggen.karten.length) {
      let text = "Die Belegliste wurde so gefiltert, dass keine Belege sichtbar sind.";
      if (!Object.keys(dd.file.ka).length) {
        text = "Sie haben noch keine Belege aufgenommen.";
      }
      dialog.oeffnen({
        typ: "alert",
        text,
      });
      return;
    }

    // Fenster öffnen oder in den Vordergrund holen
    const fenster = document.getElementById("belege-taggen");
    if (overlay.oeffnen(fenster)) { // Fenster ist schon offen
      return;
    }

    // Anzahl der Belege eintragen
    let numerus = "Belege";
    if (belegeTaggen.karten.length === 1) {
      numerus = "Beleg";
    }
    document.getElementById("belege-taggen-nr").textContent = `${belegeTaggen.karten.length} ${numerus}`;

    // Tabelle aufbauen
    belegeTaggen.tab();
  },

  // Tabelle mit Tags aufbauen
  tab () {
    const tab = document.getElementById("belege-taggen-tab");
    tab.replaceChildren();

    // Kopf
    const kopf = document.createElement("tr");
    tab.appendChild(kopf);
    const kopfText = [ "○", "＋", "－", "\u00A0" ];
    for (let i = 0, len = kopfText.length; i < len; i++) {
      const th = document.createElement("th");
      kopf.appendChild(th);
      th.textContent = kopfText[i];
      if (i === len - 1) {
        th.setAttribute("colspan", "2");
      }
    }

    // vorhandene Tags ermitteln
    const tags = new Set();
    Object.keys(beleg.tags).forEach(i => tags.add(i));
    for (const karte of Object.values(dd.file.ka)) {
      for (const tag of karte.tg) {
        tags.add(tag);
      }
    }
    const tagsSorted = [ ...tags ].sort(beleg.tagsSort);

    // Zeilen mit Tags aufbauen
    for (const tag of tagsSorted) {
      const tr = document.createElement("tr");
      tab.appendChild(tr);
      for (let i = 0; i < 3; i++) {
        const td = document.createElement("td");
        tr.appendChild(td);
        const input = document.createElement("input");
        td.appendChild(input);
        input.name = "belege-taggen-" + tag;
        input.type = "radio";
        if (i === 0) {
          input.checked = true;
        }
      }
      const icon = document.createElement("td");
      tr.appendChild(icon);
      const img = document.createElement("img");
      icon.appendChild(img);
      img.src = "img/" + (beleg.tags[tag] || "etikett.svg");
      img.width = "24";
      img.height = "24";
      const text = document.createElement("td");
      tr.appendChild(text);
      text.textContent = tag;
    }
  },

  // Taggen ausführen
  taggen () {
    // Tagging-Daten sammeln
    const taggen = {};
    document.querySelectorAll("#belege-taggen-cont tr").forEach((i, n) => {
      if (n === 0) {
        return;
      }
      const radio = i.querySelectorAll("input");
      const tag = radio[0].name.replace(/^belege-taggen-/, "");
      if (radio[1].checked) {
        taggen[tag] = true;
      } else if (radio[2].checked) {
        taggen[tag] = false;
      }
    });

    // keine Tags ausgewählt
    if (!Object.keys(taggen).length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keine Tags ausgewählt, die geändert werden sollen.",
      });
      return;
    }

    // Taggen anwenden und abschließen
    let numerus = "Belege";
    if (belegeTaggen.karten.length === 1) {
      numerus = "Beleg";
    }
    const ds = [];
    for (const [ tag, add ] of Object.entries(taggen)) {
      const aktion = add ? "＋" : "－";
      ds.push(`${aktion}${"\u00A0".repeat(3)}<i>${tag}</i>`);
    }
    dialog.oeffnen({
      typ: "confirm",
      text: `Sollen die <b>${belegeTaggen.karten.length} ${numerus}</b> wie folgt getaggt werden?\n${ds.join("<br>")}`,
      callback: () => {
        if (!dialog.antwort) {
          return;
        }

        // Taggen ausführen
        for (const id of belegeTaggen.karten) {
          const tg = dd.file.ka[id].tg;
          let sort = false;
          for (const [ tag, add ] of Object.entries(taggen)) {
            if (add) {
              if (!tg.includes(tag)) {
                tg.push(tag);
                sort = true;
              }
            } else {
              const idx = tg.indexOf(tag);
              if (idx >= 0) {
                tg.splice(idx, 1);
                sort = true;
              }
            }
          }
          if (sort) {
            tg.sort(beleg.tagsSort);
          }
        }

        // Abschluss
        kartei.karteiGeaendert(true);
        liste.aufbauen(true);
        overlayApp.schliessen(document.getElementById("belege-taggen"));
      },
    });
  },
};
