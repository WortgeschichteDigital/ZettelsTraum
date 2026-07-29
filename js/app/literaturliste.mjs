
import redLit from "./redLit.mjs";

import dialog from "../dialog.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
import tooltip from "../tooltip.mjs";

export { literaturliste as default };

const literaturliste = {
  // open overlay window
  open () {
    // open window or move it in the foreground
    const win = document.getElementById("literaturliste");
    if (overlay.oeffnen(win)) {
      // window already open
      return;
    }
    document.getElementById("literaturliste-read").focus();
  },

  // further titles that should be searched for with a special RegExp
  furtherTitles: [
    {
      reg: /https?:\/\/[a-z]+\.wikipedia\.org/,
      title: "wikipedia1",
    },
    {
      reg: /https?:\/\/[a-z]+\.wikisource\.org/,
      title: "wikisource1",
    },
  ],

  // read and anaylze clipboard content
  async read () {
    // parse clipboard and extract literature titles
    const titles = new Set();
    const reg = /(?<!(?:\p{Letter}|\d|-|#|\/))([a-zäöü][a-zäöüß0-9-]+)((?:,\shier|\ss\.\s?v\.)?[0-9\s,\-–]+)?(?!(?:\p{Letter}|\d|-|#))/ug;
    const text = await bridge.ipc.invoke("cb", "readText");

    for (const m of text.matchAll(reg) || []) {
      const p1 = m[1];
      const p2 = m[2];
      if (/(?<!##(?:\p{Lowercase}|-)*)[\p{Lowercase}-]+-[0-9]{4}-[0-9]+(?!##)/ug.test(p1) ||
          !/[a-z]/.test(p1) ||
          /^[a-zäöüß]+$/.test(p1) && !p2Typisch(p2) ||
          /-/.test(p1) && !/[0-9]/.test(p1) && !p2Typisch(p2) ||
          /[0-9]/.test(p1) && !/-/.test(p1) && p1.match(/[a-zäöüß]/g).length / p1.match(/[0-9]/g).length < 2) {
        continue;
      }
      titles.add(p1);
    }

    function p2Typisch (p2) {
      if (/^(,\shier|\ss\.\sv\.)/.test(p2)) {
        return true;
      } else if (!p2 ||
          /^(\s|,|\s[-–]\s?|\s?[0-9]{4},)$/.test(p2) ||
          /^,\s/.test(p2) && !/[0-9]/.test(p2) ||
          /[0-9]/.test(p2) && !/,/.test(p2)) {
        return false;
      }
      return true;
    }

    // scan the clipboard for further titles
    for (const i of this.furtherTitles) {
      if (text.match(i.reg)) {
        titles.add(i.title);
      }
    }

    // show results
    this.results([ ...titles ].sort());
    shared.animation("wrap");

    // determine maximal height of content
    shared.elementMaxHeight({
      ele: document.getElementById("literaturliste-results"),
    });
  },

  // show results
  //   titles = array
  results (titles) {
    const res = document.getElementById("literaturliste-results");
    res.replaceChildren();

    // update message
    const message = document.getElementById("literaturliste-message");
    if (!titles.length) {
      message.classList.add("literaturliste-message-error");
      message.textContent = "keine Literaturtitel im Text der Zwischenablage";
      return;
    }
    message.classList.remove("literaturliste-message-error");
    message.textContent = `${titles.length} Literaturtitel im Text der Zwischenablage`;

    // show status of the literature DB
    const redLitLoaded = !!Object.keys(redLit.db.data).length;
    const span = document.createElement("span");
    message.appendChild(span);
    span.textContent = `${redLitLoaded ? "✔" : "✘"}${"\u00A0".repeat(2)}Literaturdatenbank ${redLitLoaded ? "" : "nicht"} geladen`;

    // print list
    const ul = document.createElement("ul");
    res.appendChild(ul);

    for (const id of titles) {
      const li = document.createElement("li");
      ul.appendChild(li);

      const span = document.createElement("span");
      li.appendChild(span);
      const fullTitle = redLit.db.data[id]?.[0]?.td?.ti;
      if (fullTitle) {
        span.title = fullTitle;
      } else if (redLitLoaded) {
        span.classList.add("title-not-found");
        span.title = "<i>Titel in der Literaturdatenbank nicht gefunden</i>";
      }
      span.textContent = id;
    }

    // initialize tooltips
    tooltip.init(ul);
  },

  // copy results
  copy () {
    const ids = [];
    document.querySelectorAll("#literaturliste-results li span").forEach(i => ids.push(i.innerText));

    if (!ids.length) {
      dialog.oeffnen({
        typ: "alert",
        text: "Keine Literaturtitel zum Kopieren gefunden.",
        callback: () => document.getElementById("literaturliste-read").focus(),
      });
      return;
    }

    bridge.ipc.invoke("cb", "writeText", ids.join("\n"));
    shared.animation("zwischenablage");
  },
};
