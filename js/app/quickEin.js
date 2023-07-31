"use strict";

const quickEin = {
  // ausgewählte Einstellung (Object)
  //   id = string (ID der Einstellung)
  //   icon = number (Nummer des Icons)
  selection: null,

  // alle Einstellungen, die für die Quick-Access-Bar zur Verfügung stehen und ihr Name
  //   [ID] = Object
  //     section  = string (Name der Sektion in den Einstellungen)
  //     title  = string (kompletter Tooltip für die Quick-Access-Bar)
  options: {},

  // Objekt mit allen Einstellungen füllen
  optionsDetect () {
    for (const link of document.querySelectorAll("#einstellungen .navi-link")) {
      const section = document.querySelector(`#einstellungen-sec-${link.id.replace(/.+-/, "")}`);
      const sectionName = link.textContent;
      let h3 = "";
      for (const i of section.querySelectorAll('h3, input[type="checkbox"], input[type="radio"]')) {
        if (i.nodeName === "H3") {
          h3 = i.textContent;
          continue;
        }
        const text = [ sectionName ];
        if (h3) {
          text.push(h3);
        }
        text.push(i.parentNode.querySelector(`label[for="${i.id}"]`).textContent);
        quickEin.options[i.id] = {
          section: sectionName,
          title: text.join("\u00A0> "),
        };
      }
    }
  },

  // verfügbare Icons
  icons: [
    "checkbox.svg",
    "zahnrad.svg",
    "stern.svg",
    "fahne.svg",
    "birne.svg",
    "lesezeichen.svg",
    "stecknadel.svg",
    "sonne.svg",
    "herz.svg",
    "check.svg",
    "plus-dick.svg",
    "minus-dick.svg",
  ],

  // Fenster öffnen
  oeffnen () {
    overlay.oeffnen(document.querySelector("#quick-ein"));
    quickEin.selection = null;
    quickEin.list();
    helfer.elementMaxHeight({
      ele: document.querySelector("#quick-ein-over"),
    });
  },

  // Fenster schließen
  schliessen () {
    overlay.ausblenden(document.querySelector("#quick-ein"));
  },

  // Einstellungen und Icon-Liste aufbauen
  list () {
    // Aufbau könnte schon stattgefunden haben => erstes Option/erstes Icon aktivieren
    const ein = document.querySelector("#quick-ein-opts");
    ein.scrollTop = 0;
    const icons = document.querySelector("#quick-ein-icons");
    if (ein.hasChildNodes()) {
      for (const i of [ ein, icons ]) {
        i.querySelector("a.aktiv")?.classList?.remove("aktiv");
        if (i.closest('[id="quick-ein-opts"]')) {
          i.querySelector("a").focus();
        } else {
          i.querySelector("a").classList.add("aktiv");
        }
      }
      return;
    }

    // Einstellungen
    let section = "";
    for (const [ id, val ] of Object.entries(quickEin.options)) {
      if (section !== val.section) {
        const p = document.createElement("p");
        ein.appendChild(p);
        p.textContent = val.section;
        section = val.section;
      }
      const a = document.createElement("a");
      ein.appendChild(a);
      a.dataset.id = id;
      a.href = "#";
      const reg = new RegExp(`^${val.section}\u00A0> `);
      const text = val.title.replace(reg, "");
      a.textContent = text;
    }
    ein.querySelector("a").focus();

    // Icons
    for (let i = 0; i < 12; i++) {
      const a = document.createElement("a");
      icons.appendChild(a);
      a.dataset.nr = i + 1;
      a.href = "#";
      if (i === 0) {
        a.classList.add("aktiv");
      }
      const span = document.createElement("span");
      a.appendChild(span);
      span.classList.add("icon-link", `quick-ein-${i + 1}`);
    }

    // Click-Event
    for (const i of [ ein, icons ]) {
      i.querySelectorAll("a").forEach(a => {
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          this.closest("div").querySelector("a.aktiv")?.classList?.remove("aktiv");
          this.classList.add("aktiv");
        });
      });
    }
  },

  // Auswahl von Einstellung und Icon übernehmen
  uebernehmen () {
    const id = document.querySelector("#quick-ein-opts a.aktiv")?.dataset.id;
    if (!id) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie haben keine Einstellung ausgewählt.",
      });
      return;
    }
    let icon = 0;
    const icons = document.querySelectorAll("#quick-ein-icons a");
    for (let i = 0, len = icons.length; i < len; i++) {
      if (icons[i].classList.contains("aktiv")) {
        icon = i + 1;
        break;
      }
    }
    quickEin.selection = {
      id,
      icon,
    };
    quickEin.schliessen();
  },
};
