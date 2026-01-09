
import config from "./config.mjs";
import data from "./data.mjs";
import lemmas from "./lemmas.mjs";
import load from "./load.mjs";
import quots from "./quots.mjs";

import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";
import tooltip from "../../tooltip.mjs";

export { means as default };

class Meaning {
  constructor ({ id, definition, quotation = "", usedFrom = 0 }) {
    this.definition = definition;
    this.frequency = 2;
    this.id = id;
    this.quotations = [];
    if (quotation) {
      this.quotations.push(quotation);
    }
    this.usedFrom = usedFrom;
    this.usedUntil = 0;
  }
}

const means = {
  // data for all available meaning lists
  // (see prep() for structure)
  data: {},

  // initialize meanings
  init () {
    // skip this initialization if the visualization is there to show lemmas
    this.data = {};
    const { vis } = load.data;
    if (vis.ll) {
      this.build();
      return;
    }

    // extract data of all meaning lists
    const lists = data.vis.xml.html.querySelectorAll("#wgd-lesarten > ol");
    for (let i = 0, len = lists.length; i < len; i++) {
      // create clone
      const clone = lists[i].cloneNode(true);
      const meanings = clone.querySelectorAll("li");
      for (const m of meanings) {
        m.dataset.id = m.id;
        m.removeAttribute("id");
      }

      // create new entry
      const no = i + 1;
      let { lemma } = clone.dataset;
      let name = lemma;
      if (!/^Gerüst [0-9]/.test(name)) {
        name = `Gerüst ${no}`;
        if (lemma) {
          name += ` (${lemma})`;
        }
      }
      if (!lemmas.list.includes(lemma)) {
        lemma = "";
        delete clone.dataset.lemma;
      }
      this.data[no] = {
        lemma,
        list: clone,
        name,
        meanToAlias: {},
      };

      // fill map of meanings and aliases
      for (const m of meanings) {
        const { alias, id } = m.dataset;
        this.data[no].meanToAlias[id] = alias || "";
      }
    }

    // update list mappings
    const mapped = Object.values(vis.mp);

    // lemma not mapped yet
    for (const lemma of lemmas.list) {
      if (typeof vis.mp[lemma] !== "undefined") {
        continue;
      }
      let no = 0;
      for (let [ k, v ] of Object.entries(this.data)) {
        k = parseInt(k, 10);
        if (v.lemma === lemma && !mapped.includes(k)) {
          // perfect match
          no = k;
          break;
        } else if (!no && !mapped.includes(k)) {
          // first list that's not been mapped yet
          no = k;
        }
      }
      vis.mp[lemma] = no;
    }

    // remove missing lemmas and react to missing lists
    let updateMapping = false;
    for (const [ lemma, no ] of Object.entries(vis.mp)) {
      let removeLemma = false;
      if (!lemmas.list.includes(lemma)) {
        // lemma not found
        delete vis.mp[lemma];
        removeLemma = true;
      } else if (no && !this.data[no]) {
        // list not found
        vis.mp[lemma] = 0;
        removeLemma = true;
      }
      if (removeLemma) {
        // remove visualization data
        updateMapping = true;
        delete vis.da.lemmas[lemma];
      }
    }
    if (updateMapping) {
      for (const [ lemma, val ] of Object.entries(vis.da.lemmas)) {
        const idStart = `l${vis.mp[lemma]}-`;
        for (const m of val.meanings) {
          m.id = m.id.replace(/^l[0-9]-/, idStart);
        }
      }
      load.sha1Update();
    }

    // save data (if it's been changed)
    data.save();

    // build the meaning lists
    this.build();
  },

  // build the meaning lists
  build () {
    // prepare content area
    const cont = document.getElementById("meanings-cont");
    cont.replaceChildren();

    // create lists
    const { vis } = load.data;
    const lemmas = vis?.ll ? [] : Object.keys(vis?.da?.lemmas || {});
    for (let i = 0, len = lemmas.length; i < len; i++) {
      // clone list
      const lemma = lemmas[i];
      const mappedTo = vis.mp[lemma];
      const list = this.data[mappedTo]?.list?.cloneNode(true);
      if (!list) {
        continue;
      }

      // amend lemma dataset
      list.dataset.lemma = lemma;

      // update IDs
      const idStart = `l${i + 1}-`;
      for (const m of list.querySelectorAll("li")) {
        m.id = m.dataset.id.replace(/^l[0-9]-/, idStart);
      }

      // mark empty lists without meanings
      if (!list.querySelector("li")) {
        list.classList.add("empty");
        const li = document.createElement("li");
        list.appendChild(li);
        li.textContent = "Bedeutungsgerüst ohne Bedeutungen";
      }

      // print list
      const h3 = document.createElement("h3");
      cont.appendChild(h3);
      h3.textContent = lemma;
      cont.appendChild(list);
    }

    // no meanings available
    if (!cont.hasChildNodes()) {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("no-meanings");
      p.textContent = "keine Lemmata mit Bedeutungen verknüpft";
      return;
    }

    // append toogle events
    cont.querySelectorAll("li").forEach(i => {
      i.addEventListener("click", function (evt) {
        evt.stopPropagation();
        const { id } = this;
        if (means.currentCtx === "quot") {
          means.toggleQuot(id);
        } else {
          const { lemma } = this.closest("ol[data-lemma]").dataset;
          means.toggleConfig(lemma, id);
        }
      });
    });

    // append tooltips
    tooltip.init(cont);
  },

  // current context of the overlay window
  // (quot | config)
  currentCtx: "",

  // show the meanings overlay
  //   ctx = string (quot | config)
  show (ctx, onlyLemma = "") {
    // open window
    const win = document.getElementById("meanings");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();

    // memorize current context
    this.currentCtx = ctx;

    // update heading
    const headingsData = {
      quot: {
        cl: "icon-h icon-h-filter",
        text: "Filter",
      },
      config: {
        cl: "icon-h icon-h-meanings",
        text: "Bedeutungen",
      },
    };
    const heading = win.querySelector("h2");
    heading.firstChild.setAttribute("class", headingsData[ctx].cl);
    const text = document.createTextNode(headingsData[ctx].text);
    heading.replaceChild(text, heading.childNodes[1]);

    // toggle  visibility of special filters
    const filters = document.getElementById("meanings-filters");
    if (ctx === "quot") {
      filters.classList.remove("aus");
    } else {
      filters.classList.add("aus");
    }

    // toggle visibility of lemmas
    document.querySelectorAll("#meanings-cont > ol").forEach(list => {
      const { lemma } = list.dataset;
      if (onlyLemma && onlyLemma !== lemma) {
        list.classList.add("aus");
        list.previousSibling.classList.add("aus");
      } else {
        list.classList.remove("aus");
        list.previousSibling.classList.remove("aus");
      }
    });

    // update toggle state
    const active = new Set();
    for (const lemma of Object.values(load.data.vis.da.lemmas)) {
      lemma.meanings.forEach(i => active.add(i.id));
    }
    win.querySelectorAll("li").forEach(i => {
      if (ctx === "quot" && quots.filterBy.meanings[i.dataset.meaning] ||
          ctx === "config" && active.has(i.id)) {
        i.classList.add("selected");
      } else {
        i.classList.remove("selected");
      }
    });
  },

  // toggle meanings: quotation context
  //   id = string
  toggleQuot (id) {
    const item = document.getElementById(id);
    const { meaning } = item.dataset;
    if (quots.filterBy.meanings[meaning]) {
      delete quots.filterBy.meanings[meaning];
      item.classList.remove("selected");
    } else {
      quots.filterBy.meanings[meaning] = true;
      item.classList.add("selected");
    }
    quots.filter();
  },

  // toggle meanings: configuration context
  //   lemma = string
  //   id = string
  async toggleConfig (lemma, id) {
    const { vis } = load.data;
    const { meanings } = vis.da.lemmas[lemma];
    const thisMean = meanings.find(i => i.id === id);
    const thisLi = document.getElementById(id);
    if (thisMean) {
      // remove meaning
      const remove = await new Promise(resolve => {
        const def = thisMean.definition || thisLi?.querySelector("q")?.textContent || "[keine Angabe]";
        let text;
        if (vis.ll) {
          text = `Soll das Lemma <i>${def}</i> wirklich aus der Grafik entfernt werden?`;
        } else {
          text = `Soll die Bedeutung <q class="wgd-paraphrase">${def}</q> von <i>${lemma}</i> wirklich aus der Grafik entfernt werden?`;
        }
        dialog.oeffnen({
          typ: "confirm",
          text,
          callback: () => resolve(dialog.antwort),
        });
      });

      // no removal
      if (!remove) {
        return;
      }

      // carry out removal
      const idx = meanings.findIndex(i => i.id === id);
      meanings.splice(idx, 1);
      const configBlock = document.querySelector(`.meaning-cont[data-id="${id}"]`);
      configBlock.parentNode.removeChild(configBlock);
      if (!vis.ll) {
        thisLi.classList.remove("selected");
      }
    } else {
      // add meaning
      const no = vis.mp[lemma];
      const { id: aliasId, meaning: meanId } = thisLi.dataset;
      const definition = this.data[no].meanToAlias[aliasId] || "";
      const quotation = quots.maps.meanToQuot[meanId]?.[0] || "";
      let usedFrom = 0;
      if (quotation) {
        const quotYear = this.getYear(quotation);
        const { id } = document.getElementById("wgd-belegauswahl").firstChild;
        const firstYear = this.getYear(id);
        usedFrom = quotYear - 10 < firstYear ? firstYear : quotYear - 10;
      }
      const meaning = new Meaning({
        id,
        definition,
        quotation,
        usedFrom,
      });

      // insert block
      // (due to the mapping feature, the first number in the meaning ID might be
      //  different from that in the "meanToAlias" list)
      const listNo = id.match(/[0-9]/)[0];
      const order = Object.keys(this.data[no].meanToAlias).flatMap(i => i.replace(/[0-9]/, listNo));
      const idx = order.indexOf(id);
      let inserted = false;
      for (let i = 0, len = meanings.length; i < len; i++) {
        const currentIdx = order.indexOf(meanings[i].id);
        if (currentIdx > idx) {
          meanings.splice(i, 0, meaning);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        meanings.push(meaning);
      }

      // add configuration block
      const configBlock = config.makeMeanBlock(lemma, meaning);
      const lemmaCont = document.querySelector(`.lemma-cont[data-lemma="${lemma}"]`);
      const meanOrder = meanings.flatMap(i => i.id);
      if (meanOrder.at(-1) === id) {
        const evt = lemmaCont.querySelector(".event-cont");
        if (evt) {
          lemmaCont.insertBefore(configBlock, evt);
        } else {
          lemmaCont.appendChild(configBlock);
        }
      } else {
        const idx = meanOrder.indexOf(id);
        const nextId = meanOrder[idx + 1];
        const beforeBlock = document.querySelector(`.meaning-cont[data-id="${nextId}"]`);
        lemmaCont.insertBefore(configBlock, beforeBlock);
      }

      // mark as added
      thisLi.classList.add("selected");
    }

    // update SVG and save data
    load.svg();
    load.sha1Update();
    data.save();
  },

  // get a quotations year
  //   quotID = string
  //   base = node
  getYear (quotID, base = document) {
    const time = base.querySelector(`#${quotID} time`)
      .getAttribute("datetime")
      .split("-");
    return parseInt(time[0], 10);
  },


  // creates a new meaning object
  //   data = object
  newObject (data) {
    return new Meaning(data);
  },
};
