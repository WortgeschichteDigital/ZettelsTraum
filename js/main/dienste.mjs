
import {
  BrowserWindow,
  dialog,
} from "electron";
import fs from "node:fs/promises";
import path from "node:path";

export { dienste as default };

const __dirname = import.meta.dirname;

const svg = [];

const dienste = {
  // erzeugt eine Liste der *.svg im Verzeichnis ./app/img/
  async bilder () {
    if (svg.length) {
      return svg;
    }
    const pfade = await fs.readdir(path.join(__dirname, "..", "..", "img"));
    for (const p of pfade) {
      const stat = await fs.lstat(path.join(__dirname, "..", "..", "img", p));
      if (stat.isDirectory()) {
        continue;
      }
      svg.push(p);
    }
    return svg;
  },

  // prüft, ob eine Datei existiert
  //   datei = String
  //     (Pfad zur Datei)
  async exists (datei) {
    try {
      await fs.access(datei);
      return true;
    } catch {
      return false;
    }
  },

  // Dateidialog anzeigen
  //   open = Boolean
  //     (der showOpenDialog() soll angezeigt werden; sonst showSaveDailog())
  //   winId = Number
  //     (ID des Browser-Fensters)
  //   opt = Object
  //     (Einstellungen, die dem Dialog übergeben werden
  dateiDialog ({ open, winId, opt }) {
    return new Promise(resolve => {
      const bw = BrowserWindow.fromId(winId);
      if (open) {
        dialog.showOpenDialog(bw, opt)
          .then(result => resolve(result))
          .catch(err => resolve(err));
      } else {
        dialog.showSaveDialog(bw, opt)
          .then(result => resolve(result))
          .catch(err => resolve(err));
      }
    });
  },

  // führt Roles aus, die nicht über das Programmmenü, sondern Icons in der
  // Quick-Access-Bar aufgerufen wurden
  //   contents = Object
  //     (der Web-Content, in dem der Befehl ausgeführt werden soll)
  //   befehl = String
  //     (der Befehl, der ausgeführt werden soll)
  quickRoles (contents, befehl) {
    switch (befehl) {
      case "bearbeiten-rueckgaengig":
        contents.undo();
        break;
      case "bearbeiten-wiederherstellen":
        contents.redo();
        break;
      case "bearbeiten-ausschneiden":
        contents.cut();
        break;
      case "bearbeiten-kopieren":
        contents.copy();
        break;
      case "bearbeiten-einfuegen":
        contents.paste();
        break;
      case "bearbeiten-alles-auswaehlen":
        contents.selectAll();
        break;
      case "ansicht-anzeige-vergroessern": {
        const faktorGroesser = Math.round((contents.getZoomFactor() + 0.1) * 10) / 10;
        contents.setZoomFactor(faktorGroesser);
        break;
      }
      case "ansicht-anzeige-verkleinern": {
        const faktorKleiner = Math.round((contents.getZoomFactor() - 0.1) * 10) / 10;
        contents.setZoomFactor(faktorKleiner);
        break;
      }
      case "ansicht-standardgroesse":
        contents.setZoomFactor(1);
        break;
      case "ansicht-vollbild": {
        const win = BrowserWindow.fromWebContents(contents);
        if (win.isFullScreen()) {
          win.setFullScreen(false);
        } else {
          win.setFullScreen(true);
        }
        break;
      }
    }
  },
};
