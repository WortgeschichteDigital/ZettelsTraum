
import admin from "./admin.mjs";
import assist from "./assist.mjs";
import data from "./data.mjs";
import io from "./io.mjs";
import lemmas from "./lemmas.mjs";
import load from "./load.mjs";
import means from "./means.mjs";

export { lists as default };

const lists = {
  // available visualizations
  available: [],

  // admin list
  admin: {
    // list available visualizations
    list () {
      return lists.make("admin");
    },

    // load a visualization
    //   vis = string
    load (vis) {
      admin.load(vis);
    },
  },

  // header list
  head: {
    // list available visualizations
    list () {
      return lists.make("head");
    },

    // load a visualization
    //   vis = string
    load (vis) {
      const name = vis.replace(/ \[(XML|ZTJ)\]$/, "");
      data.vis.loaded = data.vis.data.find(i => i.na === name).id;
      data.vis.xml.sha1 = "";
      load.vis();
    },
  },

  // import list
  import: {
    // list available visualizations
    list () {
      return lists.make("import");
    },

    // load a visualization
    //   vis = string
    load (vis) {
      io.importLoad(vis);
    },
  },

  // meanings list
  means: {
    // list available meaning lists
    list () {
      const list = [
        {
          name: "kein Gerüst",
          value: "0",
        },
      ];
      for (const [ k, v ] of Object.entries(means.data)) {
        list.push({
          name: v.name,
          value: k,
        });
      }
      return lists.make("means", list);
    },

    // map a meaning list
    //   meaning = string
    //   input = element
    load (meaning, input) {
      lemmas.map(parseInt(meaning, 10), input);
    },
  },

  // meaning lists for the assitant
  assistMeans: {
    // list available meaning lists
    list () {
      const list = [
        {
          name: "kein Gerüst",
          value: "0",
        },
      ];
      for (let i = 0, len = assist.visData.lists.length; i < len; i++) {
        const no = i + 1;
        list.push({
          name: "Gerüst " + no,
          value: "" + no,
        });
      }
      return lists.make("assistMeans", list);
    },

    // set list
    //   listNo = string
    //   input = element
    load (listNo, input) {
      input.value = listNo === "0" ? "kein Gerüst" : "Gerüst " + listNo;
    },
  },

  // make a list
  //   type = string
  //   list = array
  make (type, list = this.available) {
    const frag = document.createDocumentFragment();
    for (let name of list) {
      let value;
      if (typeof name === "object") {
        ({ name, value } = name);
      }
      const a = document.createElement("a");
      frag.appendChild(a);
      a.dataset.suchtext = name;
      a.dataset.type = type;
      if (value) {
        a.dataset.value = value;
      }
      a.href = "#";
      const text = this.addSourceType(name);
      a.appendChild(document.createTextNode(text));
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const { type, value } = this.dataset;
        const input = this.closest(".dropdown2-cont").querySelector("input");
        lists[type].load(value || this.textContent, input);
        this.parentNode.removeChild(this);
      });
    }

    if (!frag.hasChildNodes()) {
      const span = document.createElement("span");
      frag.appendChild(span);
      span.classList.add("placeholder");
      span.textContent = "keine Visualisierung vorhanden";
    }

    return frag;
  },

  // add source type
  //   name = string
  addSourceType (name) {
    const dataVis = data.vis.data.find(i => i.na === name);
    if (!dataVis) {
      return name;
    }
    const type = dataVis.qu.ty.toUpperCase();
    return `${name} [${type}]`;
  },
};
