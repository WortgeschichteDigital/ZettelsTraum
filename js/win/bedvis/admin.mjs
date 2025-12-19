
import data from "./data.mjs";
import lemmas from "./lemmas.mjs";
import lists from "./lists.mjs";
import load from "./load.mjs";
import misc from "./misc.mjs";
import xml from "./xml.mjs";

import dd from "../../dd.mjs";
import dialog from "../../dialog.mjs";
import overlay from "../../overlay.mjs";

export { admin as default };

class Vis {
  constructor ({ ll, map = {}, name, path = "", type }) {
    this.da = {
      description: "",
      lemmaList: ll,
      lemmas: {},
    };
    this.id = misc.makeId();
    this.ll = ll;
    this.mp = map;
    this.na = name;
    this.qu = {
      pa: path,
      ty: type,
    };
  }
}

const admin = {
  // current visualization
  currentVis: null,

  // current XML file path
  currentXmlPath: "",

  // open the admin window
  open () {
    // open the window if it's not already visible
    const win = document.getElementById("admin");
    if (overlay.oeffnen(win)) {
      return;
    }
    document.activeElement.blur();

    // load the current visualization
    const name = data.vis.data.find(i => i.id === data.vis.loaded)?.na || "";
    this.load(name);
  },

  // load the passed visualization
  //   vis = string (the string might by empty)
  async load (vis) {
    // dropdown menu
    vis = vis.replace(/ \[(XML|ZTJ)\]$/, "");
    document.getElementById("list-admin-input").value = lists.addSourceType(vis);

    // toggle functions
    if (vis) {
      toggleFun(true);
    } else {
      toggleFun(false);
    }

    function toggleFun (on) {
      [ "admin-rename", "admin-delete" ].forEach(id => {
        const e = document.getElementById(id);
        if (on) {
          e.classList.remove("disabled");
          e.removeAttribute("tabindex");
        } else {
          e.classList.add("disabled");
          e.setAttribute("tabindex", "-1");
        }
      });
    }

    // prepare data source form
    const visData = data.vis.data.find(i => i.na === vis);
    this.currentVis = visData;
    let type = visData?.qu?.ty || "ztj";
    let path = visData?.qu?.pa || "";

    // toggle lemma list checkbox
    const ll = document.getElementById("admin-config-lemma-list");
    if (visData?.ll) {
      ll.checked = true;
    } else {
      ll.checked = false;
    }

    // check whether the XML file still exists
    if (path) {
      const exists = await bridge.ipc.invoke("file-exists", path);
      if (!exists) {
        dialog.oeffnen({
          typ: "alert",
          text: `Die XML-Datei\n<p class="dialog-indent"><i>${path.replace(/[/\\]/g, "/<wbr>")}</i></p>\nwurde nicht mehr gefunden.\nDie Visualisierungsdaten (Belege und Bedeutungs\u00ADgerüste) werden darum von nun an aus der Kartei geladen.`,
        });
        type = "ztj";
        path = "";
        this.switchToZtj();
      }
    }

    // save current path
    this.currentXmlPath = path;

    // update form
    let pathPrint = path;
    if (pathPrint) {
      pathPrint = `\u200E${path}\u200E`;
    }
    const xmlPath = document.getElementById("admin-xml-path");
    if (pathPrint) {
      xmlPath.classList.remove("no-file");
    } else {
      xmlPath.classList.add("no-file");
    }
    xmlPath.textContent = pathPrint || "keine Datei ausgewählt";
    document.getElementById("admin-source-" + type).click();
  },

  // add a new visualization
  //   type = string
  //   externalUsage = boolean
  async add (type = "", externalUsage = false) {
    // prompt for the name
    const text = "Wie soll die Visualisierung heißen?";
    let count = data.vis.data.length;
    let value;
    do {
      count++;
      value = `Visualisierung ${count}`;
    } while (data.vis.data.some(i => i.na === value));
    const name = await this.promptName(text, value, "add");
    if (!name) {
      return false;
    }

    // check if the name already exists
    if (!this.checkName(name, "add")) {
      return false;
    }

    // add new visualization
    type ||= document.querySelector("#admin-source-cont input:checked").value;
    let ll = false;
    if (!externalUsage) {
      ll = document.getElementById("admin-config-lemma-list").checked;
    }
    const newVis = new Vis({
      name,
      ll,
      type,
    });
    if (type === "xml") {
      newVis.qu.pa = this.currentXmlPath;
      if (!newVis.qu.pa) {
        const chosen = await this.chooseXmlFile(false);
        if (chosen) {
          newVis.qu.pa = this.currentXmlPath;
        } else {
          newVis.qu.ty = "ztj";
        }
      }
    }
    if (ll) {
      newVis.da.lemmas.lemmas = lemmas.newObject(false);
    }
    data.vis.data.unshift(newVis);
    data.updateAvailable();
    if (!externalUsage) {
      this.load(name);
    }
    this.save();
    return true;
  },

  // rename the current visualization
  async rename () {
    // prompt for the name
    const current = this.currentVis.na;
    const text = `Wie soll „${current}“ künftig heißen?`;
    const name = await this.promptName(text, current, "rename");
    if (!name) {
      return;
    }

    // check if
    //   - the name was changed
    //   - the name already exists
    if (name === current || !this.checkName(name, "rename")) {
      return;
    }

    // finish up
    this.currentVis.na = name;
    document.getElementById("list-admin-input").value = lists.addSourceType(name);
    data.updateAvailable();
    this.save();
  },

  // delete the current visualization
  async del () {
    // security question
    const current = this.currentVis.na;
    const response = await new Promise(resolve => {
      dialog.oeffnen({
        typ: "confirm",
        text: `Soll „${current}“ wirklich gelöscht werden?`,
        callback: () => resolve(dialog.antwort),
      });
    });
    if (!response) {
      return;
    }

    // unload the currently loaded visualization if it is the one that will be deleted
    if (this.currentVis.id === data.vis.loaded) {
      data.vis.loaded = "";
      data.vis.xml.sha1 = "";
      await load.vis();
    }

    // remove the visualization
    const idx = data.vis.data.findIndex(i => i.na === current);
    data.vis.data.splice(idx, 1);
    data.updateAvailable();
    this.load("");
    this.save();
  },

  // update the XML path line
  //   type = string
  toggleXmlLine (type) {
    // toggle line
    const sourceCont = document.getElementById("admin-source-cont");
    const xmlPathCont = document.getElementById("admin-xml-cont");
    if (type === "ztj") {
      sourceCont.classList.add("last-p");
      xmlPathCont.classList.add("aus");
    } else {
      sourceCont.classList.remove("last-p");
      xmlPathCont.classList.remove("aus");
    }

    // update visualization data
    if (this.currentVis) {
      this.currentVis.qu.ty = type;
      if (type === "xml") {
        if (this.currentXmlPath) {
          this.currentVis.qu.pa = this.currentXmlPath;
        } else {
          this.chooseXmlFile(true);
        }
      } else {
        this.currentVis.qu.pa = "";
      }
      document.getElementById("list-admin-input").value = lists.addSourceType(this.currentVis.na);
      this.save();
    }
  },

  // choose an XML file as data source
  //   resetZtj = boolean
  //   externalUsage = boolean
  async chooseXmlFile (resetZtj, externalUsage = false) {
    // show dialog
    const opt = {
      title: "Datei auswählen",
      defaultPath: dd.app.documents,
      filters: [
        {
          name: "XML",
          extensions: [ "xml" ],
        },
        {
          name: "Alle Dateien",
          extensions: [ "*" ],
        },
      ],
      properties: [ "openFile" ],
    };
    const result = await bridge.ipc.invoke("datei-dialog", {
      open: true,
      winId: dd.win.winId,
      opt,
    });

    // handle errors
    if (result.message || !Object.keys(result).length) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Öffnen des Dateidialogs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${result.name}: ${result.message}</p>`,
      });
      if (resetZtj) {
        document.getElementById("admin-source-ztj").click();
      }
      return false;
    } else if (result.canceled) {
      if (resetZtj) {
        document.getElementById("admin-source-ztj").click();
      }
      return false;
    }

    // check selected file
    let [ path ] = result.filePaths;
    const file = await bridge.ipc.invoke("file-read", {
      path,
    });
    if (file.message) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Überprüfen der XML-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${file.name}: ${file.message}</p>`,
      });
      return false;
    }
    const valid = xml.validate(file);
    if (valid !== true) {
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Überprüfen der XML-Datei ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${valid}</p>`,
      });
      if (externalUsage) {
        return false;
      }
      this.switchToZtj();
      document.getElementById("admin-source-ztj").click();
      path = "";
    }

    // return path if this function is used externally
    if (externalUsage) {
      return path;
    }

    // save the path
    this.currentXmlPath = path;
    if (this.currentVis?.qu?.ty === "xml") {
      this.currentVis.qu.pa = path;
      await this.save();
    }

    // update the display
    const xmlPath = document.getElementById("admin-xml-path");
    if (path) {
      xmlPath.classList.remove("no-file");
      xmlPath.textContent = `\u200E${path}\u200E`;
    } else {
      xmlPath.classList.add("no-file");
      xmlPath.textContent = "keine Datei ausgewählt";
    }
    const name = this.currentVis?.na || "";
    document.getElementById("list-admin-input").value = lists.addSourceType(name);

    // return value that depends on whether a path was chosen or not
    return !!path;
  },

  // toggle the visualization type (lemma list vs. meanings)
  //   checkbox = element
  async toggleLemmaList (checkbox) {
    // no visualization loaded
    const vis = this.currentVis;
    if (!vis) {
      return;
    }

    // security question
    const change = await new Promise(resolve => {
      const type = checkbox.checked ? "Lemmaliste" : "Bedeutungenliste";
      dialog.oeffnen({
        typ: "confirm",
        text: `Wenn Sie den Typ der Visualisierung ändern, gehen alle bisherige Daten verloren.\nSoll der Visualisierungstyp wirklich zu ${type} geändert werden?`,
        callback: () => resolve(dialog.antwort),
      });
    });
    if (!change) {
      checkbox.checked = !checkbox.checked;
      return;
    }

    // change the data according to the selection
    const ll = checkbox.checked;
    vis.da.lemmaList = ll;
    vis.ll = ll;
    if (ll) {
      vis.da.lemmas = {
        lemmas: lemmas.newObject(false),
      };
      vis.mp = {};
    } else {
      delete vis.da.lemmas.lemmas;
    }

    // save and update the visualization
    this.save();
  },

  // prompt for a visualization name
  //   text = string
  //   value = string
  //   fun = string
  promptName (text, value, fun) {
    return new Promise(resolve => {
      dialog.oeffnen({
        typ: "prompt",
        text,
        platzhalter: "Name der Visualisierung",
        callback: () => {
          const input = dialog.getPromptText();
          if (dialog.antwort && !input) {
            dialog.oeffnen({
              typ: "alert",
              text: "Sie haben keinen Namen eingegeben.",
              callback: () => document.getElementById("admin-" + fun)?.focus(),
            });
            resolve(false);
          } else if (dialog.antwort && input) {
            resolve(input);
          } else {
            resolve(false);
          }
        },
      });
      document.getElementById("dialog-prompt-text").value = value;
    });
  },

  // check if a name already exists
  //   name = string
  //   fun = string
  checkName (name, fun) {
    if (data.vis.data.some(i => i.na === name)) {
      dialog.oeffnen({
        typ: "alert",
        text: `Eine Visualisierung mit dem Namen <i>${name}</i> existiert bereits.`,
        callback: () => document.getElementById("admin-" + fun)?.focus(),
      });
      return false;
    }
    return true;
  },

  // switch the current visualization to ZTJ
  switchToZtj () {
    if (!this.currentVis) {
      return;
    }
    this.currentVis.qu.ty = "ztj";
    this.currentVis.qu.pa = "";
    this.save();
  },

  // save changes
  async save () {
    if (data.vis.loaded === this.currentVis?.id) {
      await load.vis();
    }
    data.save();
  },

  // creates a new visualization object
  //   data = object
  newObject (data) {
    return new Vis(data);
  },
};
