
import config from "./config.mjs";
import data from "./data.mjs";
import load from "./load.mjs";
import means from "./means.mjs";
import misc from "./misc.mjs";

import dialog from "../../dialog.mjs";
import dropdown2 from "../../dropdown2.mjs";
import overlay from "../../overlay.mjs";

export { lemmas as default };

class Lemma {
  constructor (numbering) {
    this.events = [];
    this.meanings = [];
    this.showNumbering = numbering;
  }
}

const lemmas = {
  // list of available lemmas
  list: [],

  // initialize lemma list
  init () {
    // get lemma list
    this.list = data.vis.xml.html.getElementById("wgd-lemmas").textContent.split("|");
    if (!this.list.length) {
      dialog.oeffnen({
        typ: "alert",
        text: 'Beim Einlesen der XML-Daten ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">keine Lemmata gefunden</p>',
      });
      return false;
    }

    // Has the order of the lemmas been changed?
    const { vis } = load.data;
    let lastIdx = -1;
    let resort = false;
    for (const lemma of Object.keys(vis.da.lemmas)) {
      const idx = this.list.indexOf(lemma);
      if (idx < lastIdx) {
        resort = true;
        break;
      }
      lastIdx = idx;
    }

    // resort the lemmas
    if (resort) {
      const lemmas = [];
      for (const [ lemma, values ] of Object.entries(vis.da.lemmas)) {
        lemmas.push({
          lemma,
          values: structuredClone(values),
        });
        delete vis.da.lemmas[lemma];
      }
      lemmas.sort((a, b) => this.list.indexOf(a.lemma) - this.list.indexOf(b.lemma));

      for (let i = 0, len = lemmas.length; i < len; i++) {
        const item = lemmas[i];
        const idStart = `l${i + 1}-`;
        for (const m of item.values.meanings) {
          m.id = m.id.replace(/^l[0-9]-/, idStart);
        }
        vis.da.lemmas[item.lemma] = item.values;
      }

      data.save();
    }

    // finish up
    return true;
  },

  // show the lemmas overlay
  show () {
    // open window
    const win = document.getElementById("lemmas");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();

    // fill in lemmas
    const { vis } = load.data;
    const tab = this.makeTab(vis, this.list);
    document.getElementById("lemmas-cont").replaceChildren(tab);
  },

  // create a table with lemma forms
  //   vis = object
  //   list = array
  //   assistant = boolean
  makeTab (vis, list, assistant = false) {
    const tab = document.createElement("table");
    for (const lemma of list) {
      // item row
      const row = document.createElement("tr");
      tab.appendChild(row);
      row.dataset.lemma = lemma;

      // cell with item name
      const td1 = document.createElement("td");
      row.appendChild(td1);
      if (assistant) {
        td1.textContent = lemma;
      } else {
        // toggle for the item
        const check = document.createElement("input");
        td1.appendChild(check);
        check.type = "checkbox";
        check.id = "lemma-" + encodeURI(lemma);
        if (vis.da.lemmas[lemma]) {
          check.checked = true;
        }
        check.addEventListener("change", function () {
          lemmas.toggle(this);
        });

        // label for the item
        const label = document.createElement("label");
        td1.appendChild(label);
        label.setAttribute("for", check.id);
        label.textContent = lemma;
      }

      // arrow
      const td2 = document.createElement("td");
      row.appendChild(td2);
      const img = document.createElement("img");
      td2.appendChild(img);
      img.src = "../img/pfeil-gerade-rechts.svg";
      img.width = "24";
      img.height = "24";

      // dropdown menu
      const td3 = document.createElement("td");
      row.appendChild(td3);
      const dropdown = document.createElement("div");
      td3.appendChild(dropdown);
      dropdown.classList.add("dropdown2-cont");
      const text = document.createElement("input");
      dropdown.appendChild(text);
      text.classList.add("dropdown2-input");
      if (assistant) {
        text.classList.add("dropdown2-open-above");
      }
      text.dataset.dropdown2 = assistant ? "listAssistMeans" : "listMeans";
      text.readOnly = true;
      text.type = "text";
      if (assistant) {
        text.value = vis.mp[lemma] ? "Gerüst " + vis.mp[lemma] : "kein Gerüst";
      } else {
        text.value = means.data[vis.mp[lemma]]?.name || "kein Gerüst";
      }
      dropdown2.initCont(dropdown);
    }
    return tab;
  },

  // toggle lemma
  //   cb = element (checkbox)
  async toggle (cb) {
    const tr = cb.closest("tr");
    const { lemma } = tr.dataset;
    const { vis } = load.data;

    if (cb.checked) {
      // add lemma
      if (!vis.mp[lemma]) {
        dialog.oeffnen({
          typ: "alert",
          text: `Sie müssen dem Lemma <i>${lemma}</i> zuerst ein Bedeutungsgerüst zuweisen.`,
          callback: () => tr.querySelector(".dropdown2-input").focus(),
        });
        cb.checked = false;
        return;
      }

      const lemmasTmp = {};
      for (const [ k, v ] of Object.entries(vis.da.lemmas)) {
        lemmasTmp[k] = structuredClone(v);
        delete vis.da.lemmas[k];
      }

      for (const i of this.list) {
        if (i === lemma) {
          vis.da.lemmas[lemma] = new Lemma(true);
        } else if (lemmasTmp[i]) {
          vis.da.lemmas[i] = structuredClone(lemmasTmp[i]);
        }
      }
    } else {
      // remove lemma
      const remove = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `Soll das Lemma <i>${lemma}</i> wirklich aus der Visualisierung entfernt werden?`,
          callback: () => resolve(dialog.antwort),
        });
      });

      if (!remove) {
        cb.checked = true;
        return;
      }

      delete vis.da.lemmas[lemma];
    }

    // finish up
    //   - refill configuration area
    //   - rebuild the meaning lists
    //   - update the SVG
    //   - save the changed data
    config.init();
    means.build();
    load.svg();
    load.sha1Update();
    data.save();
  },

  // map a lemma to a meaning list
  //   meaning = number
  //   input = element (dropdown field)
  async map (meaning, input) {
    // Is the meaning list already in use?
    const tr = input.closest("tr");
    const { lemma } = tr.dataset;
    const { vis } = load.data;
    const inUse = Object.values(vis.mp);
    if (meaning && inUse.includes(meaning)) {
      const map = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text: `<i>${means.data[meaning].name}</i> wird bereits für ein anderes Lemma verwendet.\nSoll es <i>${lemma}</i> ebenfalls zugeordnet werden?`,
          callback: () => resolve(dialog.antwort),
        });
      });
      if (!map) {
        return;
      }
    }

    // update input value
    input.value = means.data[meaning]?.name || "kein Gerüst";

    // update mapping
    vis.mp[lemma] = meaning;

    // rebuild the meaning lists
    means.build();

    // update the configuration block
    const lemmaBlock = config.makeLemmaBlock(lemma, vis.da.lemmas[lemma]);
    if (lemmaBlock) {
      const lemmaCont = document.querySelector(`.lemma-cont[data-lemma="${lemma}"]`);
      lemmaCont.parentNode.replaceChild(lemmaBlock, lemmaCont);
    }

    // update the SVG and save the changes
    load.svg();
    load.sha1Update();
    data.save();

    // automatically activate the meaning
    const cb = tr.querySelector("input");
    if (meaning && !cb.checked) {
      cb.click();
    }
  },

  // lemma list: add a new lemma to the visualization
  async add () {
    // prompt for lemma
    const lemma = await misc.prompt({
      text: "Welches <b>Lemma</b> soll hinzugefügt werden?",
      platzhalter: "Lemma",
    });
    if (!lemma) {
      return;
    }

    // add the new entry
    const { meanings: entries } = load.data.vis.da.lemmas.lemmas;
    let id = "l1";
    if (entries.length) {
      const lastNo = parseInt(entries.at(-1).id.replace(/^l/, ""), 10);
      id = "l" + (lastNo + 1);
    }
    const entry = means.newObject({
      id,
      definition: lemma,
    });
    entries.push(entry);

    // add the configuration block
    const configBlock = config.makeMeanBlock("lemmas", entry);
    const lemmaCont = document.querySelector(".lemma-cont");
    const evtBlock = lemmaCont.querySelector(".event-cont");
    if (evtBlock) {
      lemmaCont.insertBefore(configBlock, evtBlock);
    } else {
      lemmaCont.appendChild(configBlock);
    }

    // update SVG and save data
    load.svg();
    load.sha1Update();
    data.save();
  },

  // creates a new lemma object
  //   numbering = boolean
  newObject (numbering) {
    return new Lemma(numbering);
  },
};
