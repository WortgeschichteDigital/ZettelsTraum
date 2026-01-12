
import data from "./data.mjs";

import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";
import shared from "../../shared.mjs";

export { misc as default };

const misc = {
  // closes all overlays that are currently open
  async closeAllOverlays () {
    const open = document.querySelectorAll(".overlay:not(.aus)");
    for (const win of open) {
      const { id } = win;
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
        const lemma = i.definition.replace(/_/g, "");
        const tagType = articleLemmas.includes(lemma) ? "term" : "mentioned";
        const tag = tagMap[tagType][type];
        lemmas.push(`<${tag}>${lemma}</${tag}>`);
      }
      caption = "Chronologie der Wörter " + lemmasJoin(lemmas);
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

  // typographical enhancements
  //   str = string
  typo (str) {
    return str
      .replace(/"(.+?)"/g, (...args) => `„${args[1]}“`)
      .replace(/'(.+?)'/g, (...args) => `‚${args[1]}‘`)
      .replace(/'/g, "’")
      .replace(/>(.+?)</g, (...args) => `›${args[1]}‹`);
  },
};
