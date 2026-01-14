
import bedeutungen from "./bedeutungen.mjs";
import bedvisData from "./bedvis/data.mjs";
import fehlerlog from "./fehlerlog.mjs";
import hilfe from "./hilfe.mjs";
import xml from "./xml.mjs";

import dd from "../dd.mjs";
import dropdown from "../dropdown.mjs";
import overlay from "../overlay.mjs";
import sharedTastatur from "../sharedTastatur.mjs";
import suchleiste from "../suchleiste.mjs";

export { tastatur as default };

const tastatur = {
  // Abfangen der Tastatur-Events initialisieren
  //   evt = Object
  //     (Event-Object des keydown)
  init (evt) {
    // Repeats unterbinden
    if (evt.repeat) {
      return;
    }
    // Modifiers ermitteln
    sharedTastatur.detectModifiers(evt);
    const m = sharedTastatur.modifiers;
    const overlayId = overlay.oben();
    // Key "Escape"
    if (!m && evt.key === "Escape") {
      // falls die Suchleiste auf ist und den Fokus hat
      if (document.getElementById("suchleiste") &&
          document.querySelector("#suchleiste:focus-within")) {
        suchleiste.ausblenden();
        return;
      }
      // Dropdown schließen
      if (document.getElementById("dropdown")) {
        dropdown.schliessen();
        return;
      }
      if (document.activeElement.closest(".dropdown2-cont")) {
        document.activeElement.blur();
        return;
      }
      // falls ein Vorschau-Bild angezeigt wird
      if (document.getElementById("bild")) {
        hilfe.bildSchliessen();
        return;
      }
      // Overlay-Fenster schließen (Dialog im XML-Fenster)
      if (overlayId) {
        const link = document.querySelector(`#${overlayId} h2 .icon-schliessen`);
        overlay.schliessen(link);
        return;
      }
      // Bearbeitung Textarea abbrechen (XML-Fenster)
      if (dd.win.typ === "xml" && document.activeElement.nodeName === "TEXTAREA") {
        const button = document.activeElement.closest(".pre-cont").querySelector('input[value="Abbrechen"]');
        button.dispatchEvent(new Event("click"));
        return;
      }
      // Über-Fenster schließen
      if (!/^(app|electron)$/.test(dd.win.typ)) {
        return;
      }
      bridge.ipc.invoke("fenster-schliessen");
      return;
    }
    // Key "Enter"
    if (dd.win.typ === "xml" &&
        m === "Ctrl" && evt.key === "Enter" &&
        document.activeElement.nodeName === "TEXTAREA") {
      evt.preventDefault();
      const button = document.activeElement.closest(".pre-cont").querySelector('[value="Speichern"]');
      button.dispatchEvent(new MouseEvent("click"));
      return;
    }
    // Key " " | "PageUp" | "PageDown" (Changelog, Dokumentation, Handbuch)
    if (/changelog|dokumentation|handbuch/.test(dd.win.typ) &&
        !m && /^( |PageDown|PageUp)$/.test(evt.key)) {
      suchleiste.scrollen(evt);
      return;
    }
    // Key "ArrowDown" | "ArrowUp" (Dokumentation, Handbuch)
    if (/dokumentation|handbuch/.test(dd.win.typ) &&
        m === "Ctrl" && /^(ArrowDown|ArrowUp)$/.test(evt.key)) {
      hilfe.naviMenue(evt);
      return;
    }
    // Key "ArrowLeft" | "ArrowRight (Dokumentation, Handbuch)
    if (/dokumentation|handbuch/.test(dd.win.typ) &&
        (m === "Alt" || m === "Ctrl") &&
        /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
      if (m === "Alt") {
        const dir = evt.key === "ArrowRight";
        hilfe.historyNavi(dir);
      } else if (m === "Ctrl") {
        switch (evt.key) {
          case "ArrowLeft":
            hilfe.naviDetailsAus();
            break;
          case "ArrowRight":
            hilfe.naviDetails({
              immerAn: true,
            });
            break;
        }
      }
      return;
    }
    // Key "ArrowLeft" | "ArrowRight (Handbuch)
    if (dd.win.typ === "handbuch" &&
        !m && /^(ArrowLeft|ArrowRight)$/.test(evt.key)) {
      hilfe.bilderTastatur(evt);
      return;
    }
    // Key "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp" (Dialog im XML-Fenster)
    if (overlayId && !m && /^(ArrowDown|ArrowLeft|ArrowRight|ArrowUp)$/.test(evt.key)) {
      sharedTastatur.arrows(evt);
      return;
    }
    // Key "F3" (Changelog, Dokumentation, Handbuch)
    if (/changelog|dokumentation|handbuch/.test(dd.win.typ) &&
        (!m || m === "Shift") && evt.key === "F3") {
      suchleiste.f3(evt);
      return;
    }
    // Key "F5" (Fehlerlog)
    if (dd.win.typ === "fehlerlog" && !m && evt.key === "F5") {
      fehlerlog.reload();
      return;
    }
    // Key "f" (Changelog, Dokumentation, Handbuch)
    if (m === "Ctrl" && evt.code === "KeyF") {
      if (dd.win.typ === "changelog") {
        suchleiste.einblenden();
      } else if (/dokumentation|handbuch/.test(dd.win.typ)) {
        document.getElementById("suchfeld").select();
      }
      return;
    }
    // Key "p" (Bedeutungsgerüst, Changelog, Dokumentation, Handbuch)
    if (m === "Ctrl" && evt.code === "KeyP") {
      if (dd.win.typ === "bedeutungen") {
        bedeutungen.drucken();
      } else if (/changelog|dokumentation|handbuch/.test(dd.win.typ)) {
        print();
      }
      return;
    }
    // Key "s" (BedVis-Fenster)
    if (dd.win.typ === "bedvis" && m === "Ctrl" && evt.code === "KeyS") {
      bedvisData.mod.misc.saveFile();
    }
    // Key "e" | "n" | "s" (XML-Fenster)
    if (dd.win.typ === "xml" && m === "Ctrl") {
      if (evt.code === "KeyE") {
        xml.exportieren();
      } else if (evt.code === "KeyN") {
        xml.abschnittAddShortcut();
      } else if (evt.code === "KeyS") {
        xml.speichernKartei();
      }
    }
  },
};
