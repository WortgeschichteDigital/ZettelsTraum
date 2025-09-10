
import anhaenge from "./anhaenge.mjs";
import kartei from "./kartei.mjs";
import kopf from "./kopf.mjs";
import optionen from "./optionen.mjs";
import overlayApp from "./overlayApp.mjs";
import redaktion from "./redaktion.mjs";
import redMeta from "./redMeta.mjs";

import dd from "../dd.mjs";
import dialog from "../dialog.mjs";

export { erinnerungen as default };

const erinnerungen = {
  data: {
    metadaten: {
      okay: false,
      text: 'In den redaktionellen Metadaten ist keine BearbeiterIn registriert (<a href="#" class="link-erinnerung" data-funktion="metadaten">⇨\u00A0<i>Redaktion\u00A0&gt; Metadaten</i></a>).',
    },
    redaktion: {
      okay: false,
      text: 'In den Redaktionsereignissen fehlen Angaben zu den BearbeiterInnen (<a href="#" class="link-erinnerung" data-funktion="redaktion">⇨\u00A0<i>Redaktion\u00A0&gt; Ereignisse</i></a>).',
    },
    artikelDatei: {
      okay: false,
      text: 'Sie haben den Artikel erstellt, die Datei mit dem Artikel aber noch nicht mit dieser Kartei verknüpft (<a href="#" class="link-erinnerung" data-funktion="anhaenge">⇨\u00A0<i>Kartei\u00A0&gt; Anhänge</i></a>).',
    },
  },

  // speichert, ob alle Tests bestanden wurden
  allesOkay: false,

  // überprüfen, ob auf etwas hingewiesen werden muss
  check () {
    // nicht testen, wenn keine Kartei offen ist
    if (!kartei.wort) {
      return;
    }
    // Tests durchführen
    erinnerungen.allesOkay = true;
    // BearbeiterIn in Metadaten?
    if (dd.file.rd.be.length) {
      erinnerungen.data.metadaten.okay = true;
    } else {
      erinnerungen.allesOkay = false;
      erinnerungen.data.metadaten.okay = false;
    }
    // BearbeiterIn in allen Redaktionsereignissen?
    let redaktion = true;
    for (let i = 0, len = dd.file.rd.er.length; i < len; i++) {
      if (!dd.file.rd.er[i].pr) {
        redaktion = false;
        break;
      }
    }
    if (redaktion) {
      erinnerungen.data.redaktion.okay = true;
    } else {
      erinnerungen.allesOkay = false;
      erinnerungen.data.redaktion.okay = false;
    }
    // Artikel erstellt, aber nicht verknüpft?
    for (const i of dd.file.rd.er) {
      if (i.er === "Artikel erstellt") {
        if (dd.file?.la?.er?.length) {
          // Wort wird in einer anderen Datei mit behandelt;
          // dort ist die Artikeldatei
          erinnerungen.data.artikelDatei.okay = true;
          break;
        }
        let okay = false;
        for (const f of dd.file.an) {
          if (/\.(doc|docx|odt|rtf)$/.test(f)) {
            okay = true;
            break;
          }
        }
        erinnerungen.data.artikelDatei.okay = okay;
        if (!okay) {
          erinnerungen.allesOkay = false;
        }
        break;
      } else {
        erinnerungen.data.artikelDatei.okay = true;
      }
    }
    // Icon umschalten
    kopf.icons();
  },

  // Erinnerungen auf Klick anzeigen
  show () {
    const text = [];
    for (const val of Object.values(erinnerungen.data)) {
      if (val.okay) {
        continue;
      }
      text.push(`• ${val.text}`);
    }
    let punkt = "Der folgende Punkt sollte";
    if (text.length > 1) {
      punkt = "Die folgenden Punkte sollten";
    }
    dialog.oeffnen({
      typ: "alert",
      text: `${punkt} vielleicht korrigiert werden:\n${text.join("\n")}`,
    });
    document.querySelectorAll("#dialog-text a").forEach(a => erinnerungen.listener(a));
  },

  // Klick-Listener für die Verlinkungen im Erinnerungenfenser
  //   a = Element
  //     (der Link im Erinnerungenfenster, der zu der Funktion führt)
  listener (a) {
    a.addEventListener("click", function (evt) {
      evt.preventDefault();
      switch (this.dataset.funktion) {
        case "anhaenge":
          anhaenge.fenster();
          break;
        case "einstellungen-allgemeines":
          optionen.oeffnen();
          optionen.sektionWechseln(document.querySelector("#einstellungen ul a"));
          break;
        case "metadaten":
          redMeta.oeffnen();
          break;
        case "redaktion":
          redaktion.oeffnen();
          break;
      }
      setTimeout(() => overlayApp.schliessen(document.getElementById("dialog")), 200);
    });
  },
};
