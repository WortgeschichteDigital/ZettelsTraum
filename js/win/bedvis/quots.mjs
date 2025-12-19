
import config from "./config.mjs";
import data from "./data.mjs";
import load from "./load.mjs";

import dialog from "../../dialog.mjs";

export { quots as default };

const quots = {
  // data maps
  maps: {
    // meanings > quotations
    meanToQuot: {},

    // quotations > meanings
    quotToMean: {},
  },

  // initialize quotations
  init () {
    // prepare maps and quotations
    this.maps.meanToQuot = {};
    this.maps.quotToMean = {};

    const quots = data.vis.xml.html.querySelectorAll("#wgd-belegauswahl > div");
    const frag = document.createDocumentFragment();

    for (const i of quots) {
      const clone = i.cloneNode(true);
      const bed = clone.querySelector(".wgd-bedeutungen");
      const meanings = bed?.textContent?.split("|") || [];

      for (const m of meanings) {
        if (!this.maps.meanToQuot[m]) {
          this.maps.meanToQuot[m] = [];
        }
        this.maps.meanToQuot[m].push(clone.id);
      }
      this.maps.quotToMean[clone.id] = meanings;

      clone.addEventListener("click", function () {
        const { id } = this;
        const activeMean = document.querySelector(".meaning-cont:not(.closed)");
        if (!activeMean) {
          let message;
          if (load.data.vis.ll) {
            message = "kein aktives Lemma gefunden";
          } else {
            message = "keine aktive Bedeutung gefunden";
          }
          dialog.oeffnen({
            typ: "alert",
            text: `Beim Hinzufügen des Belegs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${message}</p>`,
          });
          return;
        }
        config.quotAdd(activeMean.firstChild, id);
      });

      if (bed) {
        bed.parentNode.removeChild(bed);
      }
      frag.appendChild(clone);
    }

    // append quotations into the document
    const quot = document.getElementById("quot");
    quot.scrollTop = 0;
    while (quot.childNodes.length > 1) {
      quot.removeChild(quot.lastChild);
    }
    quot.classList.remove("init");
    const frame = document.createElement("div");
    quot.appendChild(frame);
    frame.id = "wgd-belegauswahl";
    frame.appendChild(frag);

    // reset filters
    this.filterBy = {};
    this.filterResetIcon();
  },

  // filter list of active IDs
  filterBy: {},

  // filter the meanings
  filter () {
    // filter quotations
    const quotations = document.querySelectorAll("#wgd-belegauswahl > div");
    const filterBy = Object.keys(this.filterBy);
    for (const q of quotations) {
      if (filterBy.length &&
          !this.maps.quotToMean[q.id].some(i => filterBy.includes(i))) {
        q.classList.add("aus");
      } else {
        q.classList.remove("aus");
      }
    }

    // toggle reset icon
    this.filterResetIcon();
  },

  // reset all filters
  filterReset () {
    for (const id of Object.keys(this.filterBy)) {
      delete this.filterBy[id];
    }
    this.filter();
  },

  // toggle reset icon
  filterResetIcon () {
    const reset = document.getElementById("quot-fun-reset");
    if (Object.keys(this.filterBy).length) {
      reset.classList.remove("aus");
    } else {
      reset.classList.add("aus");
    }
  },
};
