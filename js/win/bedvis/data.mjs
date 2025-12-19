
export { data as default };

const data = {
  // contents ID of the main window
  mainContentsId: 0,

  // hook to distribute the XML file, which is received by the
  // IPC listener channel "bedvis-xml-data-get", correctly
  xmlTarget: null,

  // visualization data
  vis: {
    // current data
    data: [],

    // ID of the currently loaded visualization
    loaded: "",

    // SHA-1 sum of current data
    sha1: "",

    // XML data
    xml: {
      // raw XML file
      // (lemmas, quotations, meanings or an entire article)
      file: "",

      // SHA-1 sum of the current XML file
      sha1: "",

      // HTML document
      // (lemmas, quotations, meanings only)
      html: null,

      // transformation stylesheet
      xsl: "",
    },
  },

  // bedvis modules
  // (the data module is loaded by every secondary window,
  //  but we need the following modules in the bedvis windows only)
  mod: {
    io: null,
    lists: null,
    load: null,
    misc: null,
  },

  // load missing bedvis modules
  async modLoad () {
    const modLoad = [];
    for (const [ k, v ] of Object.entries(this.mod)) {
      if (v) {
        continue;
      }
      modLoad.push((async key => {
        ({ default: this.mod[key] } = await import(`./${key}.mjs`));
      })(k));
    }
    await Promise.all(modLoad);
  },

  // run updates after new data was loaded
  //   data = object
  async update (data) {
    // load missing bedvis modules
    await this.modLoad();

    // close all overlays
    this.mod.misc.closeAllOverlays();

    // save values
    this.mainContentsId = data.contentsId;
    this.vis.data = data.vis;
    this.vis.sha1 = await this.sha1();

    // update title and heading
    document.title = data.title;
    document.querySelector("h1").textContent = data.title;

    // update list of available visualizations
    this.updateAvailable();
  },

  // update list of available visualizations
  updateAvailable () {
    const available = this.mod.lists.available;
    available.length = 0;
    for (const i of this.vis.data) {
      available.push(i.na);
    }
  },

  // create an SHA-1 checksum of the current visualization data
  //   data = object
  async sha1 (data = this.vis.data) {
    const visStr = JSON.stringify(data);
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest("SHA-1", encoder.encode(visStr));
    const sha1 = Array.from(new Uint8Array(hash))
      .map(i => i.toString(16).padStart(2, "0"))
      .join("");
    return sha1;
  },

  // save data to the current cardbox file
  async save () {
    const sha1 = await this.sha1();
    if (sha1 !== this.vis.sha1) {
      bridge.ipc.invoke("webcontents-bridge", {
        id: this.mainContentsId,
        channel: "bedvis-data-get",
        data: this.vis.data,
      });
      this.vis.sha1 = sha1;
    }
  },
};
