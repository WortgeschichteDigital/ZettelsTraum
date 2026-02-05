
import data from "./data.mjs";

import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";
import shared from "../../shared.mjs";
import tooltip from "../../tooltip.mjs";

import bedvis from "../../../external/bedvis/bedvis.mjs";

export { misc as default };

const misc = {
  // closes all overlays that are currently open
  async closeAllOverlays () {
    const open = document.querySelectorAll(".overlay:not(.aus)");
    for (const win of open) {
      const { id } = win;
      if (id === "assist" &&
          document.getElementById("assist-cont").lastChild.querySelector("#make-hints")) {
        continue;
      }
      overlay.schliessen(document.getElementById(id));
      await new Promise(resolve => setTimeout(() => resolve(true), 200));
    }
  },

  // create the caption for a figure
  //   visData = object
  //   type = string (html | xml)
  makeCaption (visData, type) {
    const tagMap = {
      mentioned: {
        html: "i",
        xml: "erwaehntes_Zeichen",
      },
      term: {
        html: "i",
        xml: "Stichwort",
      },
    };

    let caption;
    if (visData.ll) {
      // lemma list
      const articleLemmas = data.vis.xml.html
        .getElementById("wgd-all-lemmas")
        .textContent
        .split("|")
        .map(i => i.split("/"))
        .flat();
      const lemmas = [];
      for (const i of visData.da.lemmas.lemmas.meanings) {
        const lemma = bedvis.getLemma(i.definition);
        const tagType = articleLemmas.includes(lemma) ? "term" : "mentioned";
        const tag = tagMap[tagType][type];
        lemmas.push(`<${tag}>${lemma}</${tag}>`);
      }
      caption = `Chronologie der ${lemmas.some(i => / /.test(i)) ? "Ausdrücke" : "Wörter"} ${lemmasJoin(lemmas)}`;
    } else {
      // meanings list
      const lemmas = [];
      const tag = tagMap.term[type];
      for (const lemma of Object.keys(visData.da.lemmas)) {
        lemmas.push(`<${tag}>${lemma}</${tag}>`);
      }
      caption = "Chronologie der Bedeutungen von " + lemmasJoin(lemmas);
    }
    return caption;

    // join a lemma list
    function lemmasJoin (lemmas) {
      return lemmas
        .join(", ")
        .replace(/^(.+), /, (...args) => args[1] + " und ");
    }
  },

  // make a visualization ID
  makeId () {
    let id;
    do {
      id = shared.rand(0, 16 ** 4 - 1).toString(16).padStart(4, "0");
    } while (data.vis.data.some(i => i.id === id));
    return id;
  },

  // show a prompt dialog
  //   text = string
  //   platzhalter = string
  prompt ({ text, platzhalter }) {
    return new Promise(resolve => {
      dialog.oeffnen({
        typ: "prompt",
        text,
        platzhalter,
        callback: () => {
          const input = dialog.getPromptText();
          if (dialog.antwort && !input) {
            resolve(false);
          } else if (dialog.antwort && input) {
            resolve(input);
          } else {
            resolve(false);
          }
        },
      });
    });
  },

  // save the ZTJ file
  saveFile () {
    bridge.ipc.invoke("webcontents-bridge", {
      id: data.mainContentsId,
      channel: "kartei-speichern",
      data: null,
    });
    shared.animation("gespeichert");
  },

  // shorten the overflowing definition text
  //   svg = document
  async shortenDef (svg) {
    // wait until the graphics is fully rendered
    // (the font that is used for the graphics is not present on the first load;
    //  this addles the result of the shortening)
    await new Promise(resolve => setTimeout(() => resolve(true), 250));

    // shorten the definitions
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
          if (childBox.x > svgWidth ||
              child.textContent.length === 1) {
            child.parentNode.removeChild(child);
            continue;
          }
          const percentage = Math.round((childBox.x + childBox.width - svgWidth) / (childBox.width / 100));
          const oldText = child.textContent;
          let letters = Math.round(oldText.length / 100 * (100 - percentage)) - 5;
          if (letters < 1) {
            letters = 1;
          }
          child.textContent = oldText.substring(0, letters) + "…";
          break;
        }
      }
    });

    // append tooltips
    tooltip.init(svg.parentNode);
  },

  // typographical enhancements
  //   str = string
  typo (str) {
    return str
      .replace(/ - /g, " – ")
      .replace(/"(.+?)"/g, (...args) => `„${args[1]}“`)
      .replace(/'(.+?)'/g, (...args) => `‚${args[1]}‘`)
      .replace(/'/g, "’")
      .replace(/>(.+?)</g, (...args) => `›${args[1]}‹`);
  },
};
