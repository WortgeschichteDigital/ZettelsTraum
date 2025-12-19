
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
};
