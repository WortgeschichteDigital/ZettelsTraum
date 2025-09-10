
import { app } from "electron";

import fs from "node:fs/promises";
import path from "node:path";

import dienste from "./dienste.mjs";
import fenster from "./fenster.mjs";

export { optionen as default };

const optionen = {
  // Pfad zur Optionen-Datei
  pfad: path.join(app.getPath("userData"), "einstellungen.json"),

  // Objekt mit den gespeicherten Optionen
  data: {},

  // liest die Optionen-Datei aus
  async lesen () {
    const exists = await dienste.exists(optionen.pfad);
    if (!exists) {
      return false;
    }
    const content = await fs.readFile(optionen.pfad, { encoding: "utf8" });
    try {
      optionen.data = JSON.parse(content);
      return true;
    } catch {
      // kann die Optionen-Datei nicht eingelesen werden, ist sie wohl korrupt => löschen
      fs.unlink(optionen.pfad);
    }
    return false;
  },

  // Optionen werden nicht sofort geschrieben, sondern erst nach einem Timeout
  schreibenTimeout: null,

  // überschreibt die Optionen-Datei
  schreiben () {
    return new Promise(resolve => {
      if (!Object.keys(optionen.data).length) {
        resolve(false);
        return;
      }
      fs.writeFile(optionen.pfad, JSON.stringify(optionen.data))
        .then(() => resolve(true))
        .catch(err => {
          fenster.befehlAnHauptfenster("dialog-anzeigen", `Die Optionen-Datei konnte nicht gespeichert werden.\n<h3>Fehlermeldung</h3>\n${err.name}: ${err.message}`);
          resolve(false);
          throw err;
        });
    });
  },
};
