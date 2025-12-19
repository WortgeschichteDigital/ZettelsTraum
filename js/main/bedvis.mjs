
import { app } from "electron";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import dienste from "./dienste.mjs";

export { bedvis as default };

const __dirname = import.meta.dirname;
const resources = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "resources");

const bedvis = {
  // directories
  dirs: {
    // module directory
    module: path.join(__dirname, "..", "..", "external", "bedvis"),

    // template directory
    template: path.join(resources, "bedvis"),
  },

  // data = object
  //   path = string (path to destination file or folder)
  //   compress = boolean (compress into tar.gz)
  //   json = string (visualization data)
  //   meanings = array (HTML of all referred quotations)
  //   quotations = array (HTML of relevant meaning lists)
  async saveModule (data) {
    // copy template folder to temporary directory
    const tmp = path.join(app.getPath("temp"), "zt-bedvis");
    const tmpExists = await dienste.exists(tmp);
    if (tmpExists) {
      try {
        await fs.rm(tmp, {
          recursive: true,
        });
      } catch (err) {
        return err;
      }
    }
    const copied = await this.copyTemplate(tmp);
    if (copied !== true) {
      return copied;
    }

    // inject data into the index file
    const index = await this.injectData(data);
    if (typeof index !== "string") {
      return index;
    }

    // overwrite index file in temporary directory
    try {
      const file = path.join(tmp, "index.html");
      await fs.writeFile(file, index);
    } catch (err) {
      return err;
    }

    // remove old file or folder
    const destExists = await dienste.exists(data.path);
    if (destExists) {
      try {
        await fs.rm(data.path, {
          recursive: true,
        });
      } catch (err) {
        return err;
      }
    }

    // finalize output
    if (data.compress) {
      return await this.makeArchive(tmp, data.path);
    }
    return await this.copyDir(tmp, data.path);
  },

  // copy the module to its final destination
  //   tmpDir = string
  //   destDir = string
  async copyDir (tmpDir, destDir) {
    try {
      await fs.cp(tmpDir, destDir, {
        recursive: true,
      });
    } catch (err) {
      return err;
    }
    return true;
  },

  // compress the module
  //   tmpDir = string
  //   destFile = string
  async makeArchive (tmpDir, destFile) {
    const dirName = path.parse(destFile).name.replace(/\.tar$/, "");
    const opt = {
      windowsHide: true,
    };
    return await new Promise(resolve => {
      exec(`cd "${app.getPath("temp")}"; tar -czf "${destFile}" --transform "s/zt-bedvis/${dirName}/" zt-bedvis`, opt, err => {
        if (err) {
          resolve(err);
        } else {
          resolve(true);
        }
      });
    });
  },

  // copy template folder
  //   destDir = string
  async copyTemplate (destDir) {
    // copy folder
    try {
      await fs.cp(this.dirs.template, destDir, {
        recursive: true,
      });
    } catch (err) {
      return err;
    }

    // copy uncompressed module files
    const promises = [];
    for (const file of [ "bedvis.css", "bedvis.mjs" ]) {
      const src = path.join(this.dirs.module, file);
      const dest = path.join(destDir, "files", file);
      promises.push(fs.cp(src, dest));
    }
    try {
      await Promise.all(promises);
    } catch (err) {
      return err;
    }

    // success!
    return true;
  },

  // update index file
  //   data = object
  async injectData (data) {
    // read file
    let index;
    try {
      const file = path.join(this.dirs.template, "index.html");
      index = await fs.readFile(file, {
        encoding: "utf8",
      });
    } catch (err) {
      return err;
    }

    // inject data
    index = index
      .replace(/data-bedvis=''/, `data-bedvis='${data.json}'`)
      .replace(/<div id="wgd-lesarten">/, `<div id="wgd-lesarten">${data.meanings.join("\n")}`)
      .replace(/<div id="wgd-belegauswahl">/, `<div id="wgd-belegauswahl">${data.quotations.join("\n")}`);

    // success!
    return index;
  },
};
