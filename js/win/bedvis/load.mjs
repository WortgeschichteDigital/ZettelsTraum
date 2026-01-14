
import config from "./config.mjs";
import data from "./data.mjs";
import lemmas from "./lemmas.mjs";
import lists from "./lists.mjs";
import means from "./means.mjs";
import quots from "./quots.mjs";
import xml from "./xml.mjs";

import overlay from "../../overlay.mjs";
import tooltip from "../../tooltip.mjs";

import bedvis from "../../../external/bedvis/bedvis.mjs";

export { load as default };

const load = {
  // data storage
  data: {
    // current visualization data
    vis: null,

    // checksum of the current visualization data
    sha1: "",
  },

  // load a visualization
  //   cardboxUpdate = boolean
  async vis (cardboxUpdate = false) {
    // detect current visualization data
    this.data.vis = data.vis.data.find(i => i.id === data.vis.loaded);

    // Has the data been updated?
    if (this.data.vis) {
      if (cardboxUpdate && this.data.vis.qu.ty === "xml") {
        // toggle "cardboxUpdate" to "false" if the current visualization
        // does not rely on cardbox but on XML data
        cardboxUpdate = false;
      }
      const sha1 = await data.sha1(this.data.vis);
      if (!cardboxUpdate && sha1 === this.data.sha1) {
        return;
      }
      this.data.sha1 = sha1;
    } else {
      this.data.sha1 = "";
    }

    // update the form
    document.getElementById("list-head-input").value = lists.addSourceType(this.data.vis?.na || "");

    // reset the content areas if no visualization is loaded
    if (!this.data.vis) {
      reset();
      return;
    }

    // load XML data
    const xmlLoaded = await xml.load();
    if (!xmlLoaded) {
      reset();
      return;
    }

    // transform XML data into HTML
    const xmlTransformed = await xml.transform();
    if (!xmlTransformed) {
      reset();
      return;
    } else if (cardboxUpdate && xmlTransformed === "unchanged") {
      // The reload of the visualization was triggered by
      // a cardbox update. If the received XML is unchanged,
      // we can stop the process right here.
      return;
    }

    // close all overlays if the reload is triggered via cardbox update
    if (cardboxUpdate) {
      await overlay.alleSchliessen();
    }

    // initialize lemmas
    const lemmasInit = lemmas.init();
    if (!lemmasInit) {
      reset();
      return;
    }

    // toggle the visualization type
    const main = document.querySelector("main");
    if (this.data.vis.ll) {
      main.classList.add("lemma-list");
    } else {
      main.classList.remove("lemma-list");
    }

    // initialize quotations
    quots.init();

    // initialize meanings
    means.init();

    // initialize configuration
    config.init();

    // create SVG
    this.svg();

    // update SHA-1 sum of the current visualization
    // (it is possible that the visualization data
    //  was changed during the init process)
    this.sha1Update();

    // reset function
    function reset () {
      // unload the current visualization
      load.data.vis = null;
      load.data.sha1 = "";
      data.vis.loaded = "";
      data.vis.xml.sha1 = "";
      document.getElementById("list-head-input").value = "";

      // reset list type
      document.querySelector("main").classList.remove("lemma-list");

      // clear sections
      const texts = [
        "Belege",
        "Einstellungen",
        "Grafik",
      ];
      const sections = document.querySelectorAll("main > section");
      for (let i = 1, len = sections.length; i < len; i++) {
        const sec = sections[i];
        sec.classList.add("init");
        const text = texts[i - 1];
        if (text === "Grafik") {
          sec.replaceChildren();
        } else {
          while (sec.childNodes.length > 1) {
            sec.removeChild(sec.lastChild);
          }
        }
        sec.appendChild(document.createTextNode(text));
      }
    }
  },

  // create preview graphics
  svg () {
    // prepare content area
    const cont = document.getElementById("svg");
    cont.classList.remove("init");
    cont.replaceChildren();

    // make SVG
    let svg;
    try {
      // we need to pass a clone of the data, otherwise the corrections
      // in bedvis.mjs change the data itself
      const visData = structuredClone(this.data.vis.da);
      svg = bedvis.makeSVG(visData);
    } catch {
      const p = document.createElement("p");
      cont.appendChild(p);
      p.classList.add("error");
      const img = document.createElement("img");
      p.appendChild(img);
      img.src = "../img/x-dick-rot.svg";
      img.width = "48";
      img.height = "48";
      p.appendChild(document.createTextNode("Fehler beim Erstellen der Grafik"));
      return;
    }

    // append graphics
    const fig = document.createElement("figure");
    cont.appendChild(fig);
    fig.classList.add("bedvis");
    const graphics = document.createElement("p");
    fig.appendChild(graphics);
    graphics.appendChild(svg);
    const figc = document.createElement("figcaption");
    fig.appendChild(figc);
    const caption = misc.makeCaption(this.data.vis, "html");
    figc.innerHTML = `Visualisierung\u00A01: ${caption}`;

    // shorten overflowing definition text
    const svgWidth = parseInt(svg.getAttribute("width"), 10);
    svg.querySelectorAll("text.definition").forEach(i => {
      const box = i.getBBox();
      if (box.x + box.width > svgWidth) {
        // add tooltip
        const tip = [];
        for (const n of i.childNodes) {
          let text = n.textContent.replace(/\s{2,}/g, " ");
          if (n.classList.contains("bold")) {
            text = `<b>${text}</b>`;
          }
          if (n.classList.contains("italic")) {
            text = `<i>${text}</i>`;
          }
          tip.push(text);
        }
        i.dataset.description = tip.join("");

        // shorten definition
        const { children } = i;
        for (let i = children.length - 1; i >= 0; i--) {
          const child = children[i];
          const childBox = child.getBBox();
          if (childBox.x > svgWidth) {
            child.parentNode.removeChild(child);
            continue;
          }
          const percentage = Math.round((childBox.x + childBox.width - svgWidth) / (childBox.width / 100));
          const oldText = child.textContent;
          const letters = Math.round(oldText.length / 100 * (100 - percentage));
          child.textContent = oldText.substring(0, letters - 5) + "…";
          break;
        }
      }
    });

    // append tooltips
    tooltip.init(p);
  },

  // update the checksum of the current visualization
  async sha1Update () {
    if (!this.data.vis) {
      return;
    }
    this.data.sha1 = await data.sha1(this.data.vis);
  },
};
