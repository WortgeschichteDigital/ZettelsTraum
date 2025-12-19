
import admin from "./admin.mjs";
import data from "./data.mjs";
import lists from "./lists.mjs";
import load from "./load.mjs";

import dd from "../../dd.mjs";
import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";
import shared from "../../shared.mjs";

import bedvis from "../../../external/bedvis/bedvis.mjs";

export { io as default };

const io = {
  // current visualization
  currentVis: null,

  // open the import window
  importWin () {
    // open window
    const win = document.getElementById("import");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();

    // select currently loaded visualization
    this.currentVis = data.vis.data.find(i => i.id === data.vis.loaded);
    const name = this.currentVis?.na || "";
    document.getElementById("list-import-input").value = lists.addSourceType(name);
  },

  // load a visualization
  //   vis = string
  importLoad (vis) {
    vis = vis.replace(/ \[(XML|ZTJ)\]$/, "");
    this.currentVis = data.vis.data.find(i => i.na === vis);
    document.getElementById("list-import-input").value = lists.addSourceType(this.currentVis.na);
  },

  // add a new visualization and load it
  async importAdd () {
    const added = await admin.add("ztj", true);
    if (added) {
      this.importLoad(data.vis.data[0].na);
      document.getElementById("import-do").focus();
    }
  },

  // read the clipboard and import valid JSON data
  async importDo () {
    // check for target
    if (!this.currentVis) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen zuerst eine Visualisierung auswählen, in die die Daten importiert werden sollen.",
        callback: () => {
          if (data.vis.data.length) {
            document.getElementById("list-import-input").focus();
          } else {
            document.getElementById("import-add").focus();
          }
        },
      });
      return;
    }

    // read and prepare data from clipboard
    let cb = await bridge.ipc.invoke("cb", "readText");
    cb = cb
      .trim()
      .replace(/^<WGDBedVis.*?>|<\/WGDBedVis>$/g, "");

    // unescape enteties
    // (&lt; &gt; &quot; &apos; &amp;)
    const unescape = document.createElement("div");
    unescape.innerHTML = cb;
    cb = unescape.textContent;

    // parse JSON data
    let json;
    try {
      json = JSON.parse(cb);
    } catch (err) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Einlesen der Daten aus der Zwischenablage ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${err.name}: ${err.message}</p>`,
        callback: () => document.getElementById("import-do").focus(),
      });
      return;
    }

    // check validity of JSON data
    const validJSON = {
      description: {
        types: [ "string" ],
      },
      lemmaList: {
        types: [ "boolean" ],
      },
      lemmas: {
        types: [ "object" ],
        keys: {
          events: {
            types: [ "array" ],
            keys: {
              description: {
                types: [ "string" ],
              },
              id: {
                types: [ "string" ],
              },
              name: {
                types: [ "string" ],
              },
              yearFrom: {
                types: [ "number" ],
              },
              yearTo: {
                types: [ "number" ],
              },
            },
          },
          meanings: {
            types: [ "array" ],
            keys: {
              definition: {
                types: [ "string" ],
              },
              frequency: {
                types: [ "number" ],
              },
              id: {
                types: [ "string" ],
              },
              usedFrom: {
                types: [ "number" ],
              },
              usedUntil: {
                types: [ "number" ],
              },
              quotations: {
                types: [ "array" ],
              },
            },
          },
          showNumbering: {
            types: [ "boolean" ],
          },
        },
      },
    };

    const validityErr = [];

    validate(validJSON, json, "Root");

    function validate (comp, obj, level) {
      // check for missing and superfluos keys
      const required = Object.keys(comp);
      for (const k of Object.keys(obj)) {
        const idx = required.indexOf(k);
        if (idx === -1) {
          validityErr.push(`überflüssiger Schlüssel <i>${k}</i> (Ebene <i>${level}</i>)`);
          continue;
        }
        required.splice(idx, 1);
      }
      for (const k of required) {
        validityErr.push(`fehlender Schlüssel <i>${k}</i> (Ebene <i>${level}</i>)`);
      }

      // check types, parse lemmas and arrays
      for (const [ k, v ] of Object.entries(obj)) {
        // check type
        const types = comp[k]?.types;
        if (!types) {
          continue;
        }
        const type = Array.isArray(v) ? "array" : typeof v;
        if (!types.includes(type)) {
          validityErr.push(`falscher Typ <i>${type}</i> von Schlüssel <i>${k}</i> (Ebene <i>${level}</i>)`);
        }

        // continue if there are no further keys
        if (!comp[k].keys) {
          continue;
        }

        // step downwards
        if (k === "lemmas") {
          for (const lemma of Object.keys(v)) {
            validate(comp[k].keys, v[lemma], "lemmas");
          }
        } else if (type === "array") {
          for (const i of v) {
            validate(comp[k].keys, i, k);
          }
        }
      }
    }

    if (validityErr.length) {
      const err = [];
      for (const i of validityErr) {
        err.push(`<p class="dialog-liste">• ${i}</p>`);
      }
      dialog.oeffnen({
        typ: "alert",
        text: `Die Daten in der Zwischenablage sind nicht valide.\n${err.join("\n")}`,
        callback: () => document.getElementById("import-do").focus(),
      });
      return;
    }

    // security question
    const overwrite = await new Promise(resolve => {
      dialog.oeffnen({
        typ: "confirm",
        text: `Sollen die Visualisierungsdaten von „${this.currentVis.na}“ wirklich überschrieben werden?`,
        callback: () => resolve(dialog.antwort),
      });
    });
    if (!overwrite) {
      document.getElementById("import-do").focus();
      return;
    }

    // import data
    this.currentVis.da = json;
    if (data.vis.loaded === this.currentVis.id) {
      await load.vis();
    }
    data.save();
    overlay.schliessen(document.getElementById("import"));
  },

  // open the export window
  exportWin () {
    const win = document.getElementById("export");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();
  },

  // perform the export
  //   type = string (xml | json | svg | module)
  exportDo (type) {
    // no visualization loaded
    const visData = data.vis.data.find(i => i.id === data.vis.loaded);
    if (!visData) {
      dialog.oeffnen({
        typ: "alert",
        text: "Sie müssen zuerst die Visualisierung laden, die exportiert werden soll.",
        callback: () => {
          const win = document.getElementById("export");
          overlay.schliessen(win);
          document.getElementById("list-head-input").focus();
        },
      });
      return;
    }

    // validate the visualization data
    const { da, ll } = visData;
    const messages = [];
    if (!da.description) {
      // the description must not be empty
      messages.push("• Beschreibungstext fehlt");
    }
    if (!Object.keys(da.lemmas).length) {
      // the visualization needs at least one lemma
      messages.push("• kein Lemma angegeben");
    }
    for (const [ lemma, val ] of Object.entries(da.lemmas)) {
      if (!val.meanings.length) {
        // each lemma needs at least one meaning
        if (ll) {
          messages.push("• kein Lemma angegeben");
        } else {
          messages.push(`• <i>${lemma}:</i> keine Bedeutungen`);
        }
      }
      for (const i of val.meanings) {
        if (ll && !i.definition) {
          // lemma list: definition is compulsory
          messages.push("• Lemma ohne Bezeichnung");
        } else if (!i.quotations.length) {
          // each meaning needs a quotation or a year
          if (ll) {
            messages.push(`• <i>${i.definition}:</i> ohne Beleg oder Jahr`);
          } else {
            const quot = document.querySelector(`#${i.id} q`)?.textContent || "[Bedeutung nicht gefunden]";
            messages.push(`• <i>${lemma}:</i> ›${quot}‹ ohne Beleg oder Jahr`);
          }
        }
      }
      for (const i of val.events) {
        if (!i.name) {
          // every event needs a name
          messages.push(`• <i>${lemma}:</i> Ereignis ohne Namen`);
        }
        if (!i.yearFrom && !i.yearTo) {
          // every event needs a year
          messages.push(`• <i>${lemma}:</i> Ereignis ohne Beginn oder Ende`);
        }
      }
    }
    if (messages.length) {
      const numerus = messages.length === 1 ? "einen Fehler" : "mehrere Fehler";
      dialog.oeffnen({
        typ: "alert",
        text: `Die Visualisierung ist nicht korrekt konfiguriert. Es gibt <b>${numerus}:</b>\n${messages.join("<br>")}`,
      });
      return;
    }

    // copy or save data
    if (type === "xml" || type === "json") {
      this.copy(visData, type);
    } else {
      this.save(visData, type);
    }
  },

  // copy text
  //   visData = object
  //   type = string (xml | json)
  copy (visData, type) {
    // create text
    let text = this.prepData(visData);
    if (type === "xml") {
      text = `<WGDBedVis xml:id="vis-1">${text}</WGDBedVis>`;
    }

    // copy and feedback
    bridge.ipc.invoke("cb", "writeText", text);
    const win = document.getElementById("export");
    overlay.schliessen(win);
    shared.animation("zwischenablage");
  },

  // save file
  //   visData = object
  //   type = string (svg | module)
  async save (visData, type) {
    // choose directory
    const opt = {
      title: "Ordner auswählen",
      defaultPath: dd.app.documents,
      properties: [ "openDirectory" ],
    };
    const dir = await bridge.ipc.invoke("datei-dialog", {
      open: true,
      winId: dd.win.winId,
      opt,
    });

    // handle errors
    if (dir.message || !Object.keys(dir).length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${dir.name}: ${dir.message}</p>`,
      });
      return;
    } else if (dir.canceled) {
      return;
    }

    // create destination path
    let tar;
    let file = visData.ll ? "Lemmas" : Object.keys(visData.da.lemmas).join(", ");
    if (type === "svg") {
      file += ".svg";
    } else {
      tar = await bridge.ipc.invoke("check-tar");
      if (tar) {
        file += ".tar.gz";
      }
    }
    const path = await bridge.ipc.invoke("path-join", [ dir.filePaths[0], file ]);

    // check if the file still exists
    const exists = await bridge.ipc.invoke("file-exists", path);
    if (exists) {
      let text;
      if (type === "svg" || tar) {
        text = `Die Datei <i>${file}</i> existiert bereits.\nSoll sie überschrieben werden?`;
      } else {
        text = `Der Ordner <i>${file}</i> existiert bereits.\nSoll er ersetzt werden?`;
      }
      const overwrite = await new Promise(resolve => {
        dialog.oeffnen({
          typ: "confirm",
          text,
          callback: () => resolve(dialog.antwort),
        });
      });
      if (!overwrite) {
        return;
      }
    }

    // create and save file
    if (type === "svg") {
      this.saveSVG(visData, path);
    } else {
      this.saveModule(visData, path, tar);
    }
  },

  // save SVG file
  //   visData = object
  //   path = string
  async saveSVG (visData, path) {
    // create SVG
    const da = structuredClone(visData.da);
    const svg = bedvis.makeSVG(da, {
      standalone: true,
    });

    // read CSS file
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5e3);

    let response;
    try {
      response = await fetch("../external/bedvis/bedvis.css", {
        signal: controller.signal,
      });
    } catch (err) {
      error(`${err.name}: ${err.message}`);
      return;
    }

    if (!response.ok) {
      error(`HTTP-Status-Code ${response.status}`);
      return;
    }

    let css;
    try {
      css = await response.text();
    } catch (err) {
      error(`${err.name}: ${err.message}`);
      return;
    }

    // prepare CSS file
    css = css
      .replace(/p\.bedvis.+?\{.+?\}/gs, "")
      .replace(/\/\*.+?\*\//g, "")
      .replace(/\n\s*\n/g, "\n")
      .replace(/\s+svg\.bedvis text\.year {\n\s+fill: transparent;\n\s+}/, "  svg.bedvis text.year {\n    fill: var(--text);\n  }");

    // inject CSS
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    svg.insertBefore(style, svg.querySelector("defs"));

    // serialize and save file
    const svgStr = new XMLSerializer().serializeToString(svg);
    const written = await bridge.ipc.invoke("file-write", path, svgStr);
    if (written.message) {
      error(`${written.name}: ${written.message}`);
      return;
    }

    // give feedback
    const win = document.getElementById("export");
    overlay.schliessen(win);
    shared.animation("gespeichert");

    // error message
    function error (message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Erstellen Grafik ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${message}</p>`,
      });
    }
  },

  // save JavaScript module
  //   visData = object
  //   path = string
  //   tar = boolean
  async saveModule (visData, path, tar) {
    // module data
    const data = {
      path,
      compress: tar,
      json: this.prepData(visData),
      meanings: [],
      quotations: [],
    };

    // glean meanings
    document.querySelectorAll("#meanings-cont > ol").forEach(i => {
      const html = ws(i.outerHTML);
      data.meanings.push(html);
    });

    // glean quotations
    const quots = [];
    const allQuots = [ ...document.querySelectorAll("#wgd-belegauswahl > div") ];
    quots.push(allQuots[0].id);
    for (const i of Object.values(visData.da.lemmas)) {
      for (const m of i.meanings) {
        for (const q of m.quotations) {
          if (typeof q === "string" && !quots.includes(q)) {
            quots.push(q);
          }
        }
      }
    }
    quots.push(allQuots.at(-1).id);
    for (const id of quots) {
      const quot = document.getElementById(id);
      const html = ws(quot.outerHTML);
      data.quotations.push(html);
    }

    // export module
    const result = await bridge.ipc.invoke("bedvis-export-module", data);
    if (result.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Speichern des Moduls ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
    } else {
      const win = document.getElementById("export");
      overlay.schliessen(win);
      shared.animation("gespeichert");
    }

    // reduce HTML whitespace
    function ws (str) {
      return str.replace(/\s*\n\s*/g, "")
        .replace(/ {2,}/g, " ");
    }
  },

  // stringify the JSON data of the visualization
  //   visData = object
  prepData (visData) {
    const repTab = new Map([
      [ /&/g, "&amp;" ],
      [ /</g, "&lt;" ],
      [ />/g, "&gt;" ],
      [ /'/g, "&apos;" ],
      [ /"/g, "&quot;" ],
    ]);

    let text = JSON.stringify(visData.da, (k, v) => {
      if (typeof v === "string") {
        for (const [ reg, rep ] of repTab.entries()) {
          v = v.replace(reg, rep);
        }
      }
      return v;
    });

    // the JSON on the web page is invalid if the ampersand
    // in &quot; is not escaped with a backslash
    text = text.replace(/&quot;/g, "\\&quot;");

    return text;
  },
};
