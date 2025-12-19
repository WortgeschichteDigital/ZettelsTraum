
import admin from "./admin.mjs";
import data from "./data.mjs";
import lemmas from "./lemmas.mjs";
import load from "./load.mjs";
import means from "./means.mjs";
import misc from "./misc.mjs";
import xml from "./xml.mjs";

import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";

export { assist as default };

class Vis {
  constructor () {
    this.ll = false;
    this.mp = {};
    this.na = "";
    this.qu = {
      pa: "",
      ty: "",
    };

    // lemma list
    //   lemma = string
    //   year = number
    this.lemmas = [];

    // meanings lists
    // (filled with elements)
    this.lists = [];

    // meanings
    //   [LEMMA] = array
    // (the arrays are filled with IDs)
    this.meanings = {};

    // loaded XML data
    this.xml = {
      file: "",
      html: "",
      sha1: "",
    };
  }
}

const assist = {
  // data for the new visualization
  visData: {},

  // show the assistant overlay
  show () {
    // open window
    const win = document.getElementById("assist");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();

    // show start screen
    document.getElementById("assist-cont").replaceChildren();
    this.createTile("start");
  },

  // create a new tile
  //   name = string
  async createTile (name) {
    // remove all tiles that are on the right of the current tile
    const cont = document.getElementById("assist-cont");
    const { offsetWidth, scrollLeft } = cont;
    if (cont.childNodes.length > 1) {
      for (let i = cont.childNodes.length - 1; i >= 1; i--) {
        const item = cont.childNodes[i];
        if (item.offsetLeft <= scrollLeft) {
          break;
        }
        cont.removeChild(item);
      }
    }

    // create new tile
    const template = document.getElementById("at-" + name);
    const clone = template.content.cloneNode(true);
    const tile = document.createElement("div");
    tile.appendChild(clone);
    cont.appendChild(tile);

    // prepare the tile
    const { prep } = template.dataset;
    if (prep) {
      this.prepTile[prep]();
    }

    // add events
    this.events(tile);

    // no scrolling after the creation of the start tile
    if (name === "start") {
      this.navUpdate();
      return;
    }

    // change position
    await new Promise(resolve => setTimeout(() => resolve(true), 500));
    cont.style.removeProperty("height");
    cont.scrollTo({
      top: 0,
      left: scrollLeft + offsetWidth,
      behavior: "smooth",
    });

    // update navigation
    cont.addEventListener("scrollend", () => this.navUpdate(), {
      once: true,
    });
  },

  // preparation functions for various tiles
  prepTile: {
    // hints on how to prepare ZTJ files
    ztj () {
      for (const li of document.querySelectorAll("#make-hints li")) {
        // add list item event
        li.addEventListener("click", function () {
          this.closest("ol").querySelectorAll("li").forEach(i => {
            if (i === this) {
              return;
            }
            i.classList.remove("open");
          });
          const img = this.querySelector("img");
          if (img.src !== img.dataset.src) {
            img.src = img.dataset.src;
          }
          this.classList.toggle("open");
        });

        // block anchor event
        li.querySelector("a").addEventListener("click", evt => evt.preventDefault());
      }
    },

    // choose which of the available lemmas should be part of the visualization
    lemmas () {
      const cont = document.getElementById("make-choose-lemmas");
      for (const [ lemma, list ] of Object.entries(assist.visData.mp)) {
        const p = document.createElement("p");
        cont.appendChild(p);
        const input = document.createElement("input");
        p.appendChild(input);
        input.dataset.lemma = lemma;
        input.id = "make-choose-lemmas-" + encodeURI(lemma);
        input.type = "checkbox";
        if (list) {
          input.checked = true;
        }
        const label = document.createElement("label");
        p.appendChild(label);
        label.setAttribute("for", input.id);
        label.textContent = lemma;
      }
    },

    // choose which list is associated with which lemma
    lists () {
      const cont = document.getElementById("make-choose-lists");
      const p = document.createElement("p");
      cont.appendChild(p);
      for (let i = 0, len = assist.visData.lists.length; i < len; i++) {
        if (p.hasChildNodes()) {
          p.appendChild(document.createTextNode(" | "));
        }
        const a = document.createElement("a");
        p.appendChild(a);
        a.classList.add("meaning-list-link");
        a.dataset.idx = i;
        a.href = "#";
        a.textContent = "Gerüst " + (i + 1);
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          assist.prepTile.meaningsWin(this, "preview");
        });
      }
      const tab = lemmas.makeTab(assist.visData, Object.keys(assist.visData.meanings), true);
      cont.appendChild(tab);
    },

    // list all lemmas and the number of chosen meanings
    meanings () {
      const cont = document.getElementById("make-choose-meanings");
      const tab = document.createElement("table");
      cont.replaceChildren(tab);
      for (const [ lemma, arr ] of Object.entries(assist.visData.meanings)) {
        // row
        const tr = document.createElement("tr");
        tab.appendChild(tr);

        // lemma cell
        const lemmaCell = document.createElement("td");
        tr.appendChild(lemmaCell);
        const a = document.createElement("a");
        lemmaCell.appendChild(a);
        a.classList.add("meaning-list-link");
        a.dataset.idx = assist.visData.mp[lemma] - 1;
        a.dataset.lemma = lemma;
        a.href = "#";
        a.textContent = lemma;
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          assist.prepTile.meaningsWin(this, "choose");
        });

        // meaning count
        const meaningsCell = document.createElement("td");
        tr.appendChild(meaningsCell);
        const numerus = arr.length === 1 ? "Bedeutung" : "Bedeutungen";
        meaningsCell.textContent = `${arr.length} ${numerus}`;
      }
    },

    // create a summary for the chosen data
    summary () {
      const d = assist.visData;
      const cont = document.getElementById("make-summary");
      const tab = document.createElement("table");
      cont.appendChild(tab);

      // name
      defaultRow("Name", d.na);

      // type
      const type = d.ll ? "Lemmata" : "Bedeutungen";
      defaultRow("Typ", "Reihe von " + type);

      // source
      let source = d.qu.ty.toUpperCase() + "-Datei";
      if (d.qu.ty === "xml") {
        source += ` (${d.qu.pa.replace(/[/\\]/g, m => m + "<wbr>")})`;
      }
      defaultRow("Datenquelle", source);

      // lemma heading
      let lemmas;
      if (d.ll && d.lemmas.length === 1 ||
          !d.ll && Object.keys(d.meanings).length === 1) {
        lemmas = "Lemma";
      } else {
        lemmas = "Lemmata";
      }
      defaultRow(lemmas, "");
      tab.lastChild.classList.remove("border");

      // create lemma list
      if (d.ll) {
        // visualization type: lemmas
        for (const i of d.lemmas) {
          const tr = document.createElement("tr");
          tab.appendChild(tr);

          const lemma = document.createElement("td");
          tr.appendChild(lemma);
          lemma.classList.add("indent");
          lemma.textContent = i.lemma;

          const year = document.createElement("td");
          tr.appendChild(year);
          year.textContent = i.year;
        }
      } else {
        // visualization type: meanings
        for (const [ lemma, v ] of Object.entries(d.meanings)) {
          const tr = document.createElement("tr");
          tab.appendChild(tr);

          const lemmaCell = document.createElement("td");
          tr.appendChild(lemmaCell);
          lemmaCell.classList.add("indent");
          lemmaCell.textContent = lemma;

          const infoCell = document.createElement("td");
          tr.appendChild(infoCell);
          const a = document.createElement("a");
          infoCell.appendChild(a);
          a.classList.add("meaning-list-link");
          a.dataset.idx = d.mp[lemma] - 1;
          a.dataset.lemma = lemma;
          a.href = "#";
          a.textContent = "Gerüst " + d.mp[lemma];
          a.addEventListener("click", function (evt) {
            evt.preventDefault();
            assist.prepTile.meaningsWin(this, "summary");
          });

          const numerus = v.length === 1 ? "Bedeutung" : "Bedeutungen";
          infoCell.appendChild(document.createTextNode(` (${v.length} ${numerus})`));
        }
      }

      // create a default row
      function defaultRow (heading, text) {
        const tr = document.createElement("tr");
        tab.appendChild(tr);
        tr.classList.add("border");
        const th = document.createElement("th");
        tr.appendChild(th);
        th.textContent = heading;
        const td = document.createElement("td");
        tr.appendChild(td);
        td.innerHTML = text;
      }
    },

    // open the meanings window and wait until it's closed
    //   caller = element
    //   type = string
    meaningsWin (caller, type) {
      // insert meanings list into the window
      const idx = parseInt(caller.dataset.idx, 10);
      const clone = assist.visData.lists[idx].cloneNode(true);
      if (type === "preview") {
        clone.classList.add("assistant-preview");
      } else if (type === "choose" || type === "summary") {
        const { lemma } = caller.dataset;
        assist.updateListIds(clone, lemma);
        if (type === "choose") {
          for (const li of clone.querySelectorAll("li")) {
            li.addEventListener("click", function (evt) {
              evt.stopPropagation();
              this.classList.toggle("selected");
            });
          }
        } else if (type === "summary") {
          clone.classList.add("assistant-summary");
        }
        for (const id of assist.visData.meanings[lemma]) {
          clone.querySelector("#" + id).classList.add("selected");
        }
      }
      document.getElementById("meanings-cont").replaceChildren(clone);

      // open overlay window
      const win = document.getElementById("meanings");
      overlay.oeffnen(win);

      // restore the old list after the window is closed
      const observer = new MutationObserver((records, observer) => {
        const win = records[0].target;
        if (win.classList.contains("aus")) {
          observer.disconnect();
          if (type === "choose") {
            const m = assist.visData.meanings;
            const { lemma } = caller.dataset;
            m[lemma] = [];
            win.querySelectorAll("li.selected").forEach(i => m[lemma].push(i.id));
            assist.prepTile.meanings();
          }
          means.build();
        }
      });
      observer.observe(win, {
        attributes: true,
      });
    },
  },

  // add events
  //   cont = element
  events (cont) {
    // choose links
    cont.querySelectorAll(".choose").forEach(i => {
      i.addEventListener("click", async function (evt) {
        evt.preventDefault();

        // still waiting
        if (this.classList.contains("waiting")) {
          return;
        }
        this.classList.add("waiting");

        // perform action
        const { action, args, intersection, tile } = this.dataset;
        if (action) {
          const result = await assist.actions[action](args);
          if (!result) {
            this.classList.remove("waiting");
            return;
          }
        }

        // update choose markers
        const cont = this.closest("div");
        cont.querySelectorAll(".choose").forEach(i => i.classList.remove("chosen"));
        this.classList.add("chosen");

        // create new tile
        if (intersection) {
          const chosenTile = await assist.actions[intersection]();
          if (document.getElementById("at-" + chosenTile)) {
            await assist.createTile(chosenTile);
          } else {
            this.classList.remove("chosen");
          }
        } else {
          await assist.createTile(tile);
        }
        this.classList.remove("waiting");
      });
    });

    // add lemma to the lemma list
    cont.querySelector("#make-lemma-list-add")?.addEventListener("click", evt => {
      evt.preventDefault();
      assist.actions.llAdd();
    });
  },

  // navigate through the tiles
  //   link = element
  nav (link) {
    // detect left position
    const action = link.id.replace(/^.+-/, "");
    const cont = document.getElementById("assist-cont");
    let left = 0;
    if (action === "backwards") {
      left = cont.scrollLeft - cont.offsetWidth;
    } else if (action === "forwards") {
      left = cont.scrollLeft + cont.offsetWidth;
    }

    // change position
    cont.scrollTo({
      top: 0,
      left,
      behavior: "smooth",
    });

    // update navigation
    cont.addEventListener("scrollend", () => {
      this.navUpdate();
      if (link.classList.contains("disabled")) {
        link.blur();
      }
    }, {
      once: true,
    });
  },

  // update the navigation
  navUpdate () {
    const dirs = {
      backwards: false,
      forwards: false,
    };

    const cont = document.getElementById("assist-cont");
    if (cont.childNodes.length > 1) {
      const { offsetWidth, scrollWidth, scrollLeft } = cont;
      if (scrollLeft > 0) {
        dirs.backwards = true;
      }
      if (scrollLeft === 0 ||
          scrollWidth > scrollLeft + offsetWidth) {
        dirs.forwards = true;
      }
    }

    for (const [ k, v ] of Object.entries(dirs)) {
      const a = document.getElementById("assist-nav-" + k);
      if (v) {
        a.classList.remove("disabled");
        a.removeAttribute("tabindex");
      } else {
        a.classList.add("disabled");
        a.setAttribute("tabindex", "-1");
      }
    }
  },

  // special actions for new visualizations
  actions: {
    // prepare data
    prepareData () {
      assist.visData = new Vis();
      return true;
    },

    // choose name
    async chooseName () {
      const name = await admin.promptName("Wie soll die Visualisierung heißen?", "", "");
      if (!name || !admin.checkName(name, "")) {
        return false;
      }
      assist.visData.na = name;
      const b = document.getElementById("make-name");
      b.textContent = name;
      b.parentNode.classList.remove("aus");
      return true;
    },

    // choose type
    //   type = string
    chooseType (type) {
      if (type === "lemmas") {
        assist.visData.ll = true;
      } else {
        assist.visData.ll = false;
      }
      return true;
    },

    // choose source
    //   source = string
    chooseSource (source) {
      assist.visData.qu.pa = "";
      assist.visData.qu.ty = source;
      return true;
    },

    // choose the XML file
    async chooseXmlFile () {
      const path = await admin.chooseXmlFile(false, true);
      if (!path) {
        return false;
      }
      assist.visData.qu.pa = path;
      const b = document.getElementById("make-xml");
      b.innerHTML = path.replace(/[/\\]/g, m => m + "<wbr>");
      b.parentNode.classList.remove("aus");
      return true;
    },

    // lemma list: add new lemma
    async llAdd () {
      // prompt lemma
      const add = document.getElementById("make-lemma-list-add");
      const lemma = await misc.prompt({
        text: "Welches Lemma soll hinzugefügt werden?",
        platzhalter: "Lemma",
      });
      if (!lemma) {
        add.focus();
        return;
      }

      // prompt year
      const year = await misc.prompt({
        text: `Mit welchem Jahr soll der Zeitstrahl für <i>${lemma}</i> beginnen?`,
        platzhalter: "Jahr",
      });
      if (!/^[0-9]{3,4}$/.test(year)) {
        dialog.oeffnen({
          typ: "alert",
          text: "Das Jahr muss eine drei- oder vierstellige Ziffer sein!",
          callback: () => add.focus(),
        });
        return;
      }

      // push data
      assist.visData.lemmas.push({
        lemma,
        year: parseInt(year, 10),
      });

      // build list
      this.llList();

      // refocus add icon
      add.focus();
    },

    // lemma list: build list
    llList () {
      const cont = document.getElementById("make-lemma-list").lastElementChild;
      cont.replaceChildren();

      // no lemmas in the list
      const { lemmas } = assist.visData;
      if (!lemmas.length) {
        const p = document.createElement("p");
        cont.appendChild(p);
        p.textContent = "noch keine Lemmata eingegeben";
        return;
      }

      // list lemmas
      for (let i = 0, len = lemmas.length; i < len; i++) {
        const item = lemmas[i];
        const a = document.createElement("a");
        cont.appendChild(a);
        a.classList.add("make-lemma-list-item");
        a.dataset.idx = i;
        a.href = "#";
        a.textContent = `${item.lemma} (${item.year})`;
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          const idx = parseInt(this.dataset.idx, 10);
          assist.visData.lemmas.splice(idx, 1);
          assist.actions.llList();
        });
      }
    },

    // lemma list: check the list
    llCheck () {
      // no lemmas
      const { lemmas } = assist.visData;
      if (!lemmas.length) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben noch keine Lemmata eingegeben!",
        });
        return false;
      }

      // repeated lemmas
      const times = {};
      const repeated = [];
      for (const i of lemmas) {
        const { lemma } = i;
        if (!times[lemma]) {
          times[lemma] = 0;
        }
        times[lemma]++;
        if (times[lemma] > 1) {
          repeated.push(`• ${lemma}`);
        }
      }
      if (repeated.length) {
        let text;
        if (repeated.length > 1) {
          text = "Diese Lemmata tauchen";
        } else {
          text = "Dieses Lemma taucht";
        }
        text += ` in der Liste mehrfach auf:\n${repeated.join("<br>")}`;
        dialog.oeffnen({
          typ: "alert",
          text,
        });
        return false;
      }

      // everything okay
      return true;
    },

    // check whether the lemma selection is valid or not
    lemmasCheck () {
      // check if at least one lemma is selected
      const cont = document.getElementById("make-choose-lemmas");
      if (!cont.querySelector("input:checked")) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben kein Lemma ausgewählt!",
        });
        return false;
      }

      // update data
      for (const i of cont.querySelectorAll("input")) {
        if (i.checked) {
          continue;
        }
        const { lemma } = i.dataset;
        assist.visData.mp[lemma] = 0;
        delete assist.visData.meanings[lemma];
      }
      return true;
    },

    // check whether the list selection is valid or not
    listsCheck () {
      // check mapping
      const map = {};
      document.querySelectorAll("#make-choose-lists input").forEach(i => {
        const { lemma } = i.closest("tr").dataset;
        map[lemma] = parseInt(i.value.match(/[0-9]+$/)?.[0] || 0, 10);
      });
      if (!Object.values(map).some(i => i)) {
        dialog.oeffnen({
          typ: "alert",
          text: "Sie haben keinem der Lemmata ein Bedeutungsgerüst zugeordnet!",
        });
        return false;
      }

      // update mapping
      for (const [ lemma, no ] of Object.entries(map)) {
        assist.visData.mp[lemma] = no;
        if (no) {
          assist.visData.meanings[lemma] = [];
        } else {
          delete assist.visData.meanings[lemma];
        }
      }
      return true;
    },

    // check if meanings were selected
    meaningsCheck () {
      if (Object.values(assist.visData.meanings).some(i => !i.length)) {
        dialog.oeffnen({
          typ: "alert",
          text: "Es gibt noch Lemmata, für die Sie keine Bedeutungen ausgewählt haben!\nZum Auswählen von Bedeutungen müssen Sie auf das Lemma klicken. Im Bedeutungsgerüst wählen Sie dann alle Bedeutungen aus, die in der Visualisierung erscheinen sollen.",
        });
        return false;
      }
      return true;
    },

    // make the visualization
    make () {
      // mark make link
      document.getElementById("make-link").classList.add("chosen");

      // create new visualization object
      const d = assist.visData;
      const vis = admin.newObject({
        map: d.mp,
        ll: d.ll,
        name: d.na,
        path: d.qu.pa,
        type: d.qu.ty,
      });

      // fill in meanings
      if (d.ll) {
        // lemma list
        vis.da.lemmas.lemmas = lemmas.newObject(false);
        for (let i = 0, len = d.lemmas.length; i < len; i++) {
          const { lemma, year } = d.lemmas[i];
          const meaning = means.newObject({
            definition: lemma,
            id: "l1-" + (i + 1),
            quotation: year,
          });
          vis.da.lemmas.lemmas.meanings.push(meaning);
        }
      } else {
        // meaning list
        const quots = d.xml.html.querySelectorAll("#wgd-belegauswahl > div");
        const firstYear = means.getYear(quots[0].id, d.xml.html);

        for (const [ lemma, meanings ] of Object.entries(d.meanings)) {
          // create a new lemma entry
          vis.da.lemmas[lemma] = lemmas.newObject(true);

          // clone the pertinent meaning list
          const list = d.lists[d.mp[lemma] - 1].cloneNode(true);
          assist.updateListIds(list, lemma);

          // fill in the meanings
          for (const id of meanings) {
            // detect meaning item and meaning ID
            const currentMeaning = list.querySelector("#" + id);
            const meaningId = currentMeaning.dataset.meaning;

            // detect first quotation and calculate default usage start
            let quotation = "";
            let usedFrom = 0;
            for (const q of quots) {
              const bed = q.querySelector(".wgd-bedeutungen")?.textContent?.split("|") || [];
              if (bed.includes(meaningId)) {
                quotation = q.id;
                const year = means.getYear(q.id, d.xml.html);
                usedFrom = year - 10 < firstYear ? firstYear : year - 10;
                break;
              }
            }

            // create new meaning object
            const meaning = means.newObject({
              definition: currentMeaning.dataset.alias || "",
              id,
              quotation,
              usedFrom,
            });
            vis.da.lemmas[lemma].meanings.push(meaning);
          }
        }
      }

      // save and load meaning
      data.vis.data.unshift(vis);
      data.updateAvailable();
      data.vis.loaded = vis.id;
      data.vis.xml.sha1 = "";
      load.vis();
      data.save();

      // close overlay
      overlay.schliessen(document.getElementById("assist"));

      // always return "false" as the current has been the last tile
      return false;
    },

    // choose the appropriate tile after source and type are known
    intersection1 () {
      if (assist.visData.qu.ty === "ztj") {
        if (assist.visData.ll) {
          return "make-lemma-list";
        }
        return "make-ztj";
      }
      return "make-xml";
    },

    // choose the appropriate tile after the ZTJ file is prepared
    // or the XML file is known
    async intersection2 () {
      // lemma list
      const d = assist.visData;
      if (d.ll) {
        return "make-lemma-list";
      }

      // load visualization data
      data.xmlTarget = d.xml;
      const loadXml = await xml.load(assist.visData, d.xml);
      data.xmlTarget = null;
      if (!loadXml) {
        return "";
      }
      const transformXml = await xml.transform(d.xml);
      if (!transformXml) {
        return "";
      }

      // detect lemmas and meaning lists
      d.mp = {};
      d.meanings = {};
      const lemmas = d.xml.html.getElementById("wgd-lemmas").textContent.split("|");
      for (const lemma of lemmas) {
        d.mp[lemma] = 0;
        d.meanings[lemma] = [];
      }
      d.lists = d.xml.html.querySelectorAll("#wgd-lesarten > ol");

      // map lemmas and meaning lists according to the data
      for (let i = 0, len = d.lists.length; i < len; i++) {
        const { lemma } = d.lists[i].dataset;
        if (typeof d.mp[lemma] !== "undefined" && d.mp[lemma] === 0) {
          d.mp[lemma] = i + 1;
        }
      }
      if (Object.values(d.mp).some(i => !i) &&
          lemmas.length === 1 &&
          d.lists.length === 1) {
        d.mp[lemmas[0]] = 1;
      }

      // choose the next step
      if (lemmas.length > 1) {
        return "make-choose-lemmas";
      } else if (Object.values(d.mp).some(i => !i)) {
        return "make-choose-lists";
      }
      return "make-choose-meanings";
    },

    // choose the appropriate tile after the lemmas were selected
    intersection3 () {
      if (Object.values(assist.visData.mp).some(i => !i)) {
        return "make-choose-lists";
      }
      return "make-choose-meanings";
    },
  },

  // update list IDs
  //   list = element
  //   lemma = string
  updateListIds (list, lemma) {
    const idBase = Object.keys(this.visData.meanings).indexOf(lemma) + 1;
    const idRep = `l${idBase}-`;
    for (const li of list.querySelectorAll("li")) {
      li.id = li.id.replace(/^l[0-9]+-/, idRep);
    }
  },
};
