
import annotieren from "./annotieren.mjs";
import bedeutungen from "./bedeutungen.mjs";
import beleg from "./beleg.mjs";
import drucken from "./drucken.mjs";
import filter from "./filter.mjs";
import helfer from "./helfer.mjs";
import kartei from "./kartei.mjs";
import kopieren from "./kopieren.mjs";
import liste from "./liste.mjs";
import optionen from "./optionen.mjs";
import overlayApp from "./overlayApp.mjs";
import quick from "./quick.mjs";
import redLit from "./redLit.mjs";
import speichern from "./speichern.mjs";
import stamm from "./stamm.mjs";

import dropdown from "../dropdown.mjs";
import overlay from "../overlay.mjs";
import shared from "../shared.mjs";
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
      // Konfigurationsdialog in Formvarianten schließen
      if (overlayId === "stamm" &&
          document.getElementById("stamm-popup")) {
        stamm.kopfKonfigSchliessen();
        return;
      }
      // Versionen-Popup in der Literaturdatenbank schließen
      if (overlayId === "red-lit" &&
          (document.getElementById("red-lit-popup") ||
          !document.getElementById("red-lit-suche-hilfe-fenster").classList.contains("aus"))) {
        if (document.getElementById("red-lit-popup")) {
          redLit.anzeigePopupSchliessen();
        } else {
          document.getElementById("red-lit-suche-hilfe-fenster").classList.add("aus");
        }
        return;
      }
      // Overlay-Fenster schließen
      if (overlayId) {
        const link = document.querySelector(`#${overlayId} h2 .icon-schliessen`);
        overlayApp.schliessen(link);
        return;
      }
      // Bedeutung deaktivieren oder Bedeutungsgerüst-Formular schließen
      if (shared.hauptfunktion === "geruest") {
        if (bedeutungen.moveAktiv) {
          bedeutungen.moveAus();
        } else {
          bedeutungen.schliessen();
        }
        return;
      }
      // Sortieren-Popup schließen
      if (liste.headerSortierenSchliessen()) {
        return;
      }
      // Annotierungs-Popup schließen
      if (annotieren.modSchliessen()) {
        return;
      }
      // Karteikarte schließen
      if (shared.hauptfunktion === "karte") {
        helfer.inputBlur();
        beleg.aktionAbbrechen();
        return;
      }
      return;
    }
    // Key "Tab"
    if ((!m || m === "Shift") && evt.key === "Tab" && helfer.bedeutungenOffen()) {
      bedeutungen.naviTab(evt);
      return;
    }
    // Key "Enter"
    if (!m && evt.key === "Enter" && overlayId === "kopieren-einfuegen") {
      evt.preventDefault();
      speichern.checkInit(() => kopieren.einfuegenAusfuehren());
      return;
    }
    // Key " " | "PageUp" | "PageDown"
    if (!m && /^( |PageDown|PageUp)$/.test(evt.key)) {
      const leiste = document.getElementById("suchleiste");
      if (leiste && leiste.classList.contains("an")) {
        suchleiste.scrollen(evt);
      } else {
        helfer.scrollen(evt);
      }
      return;
    } else if (m === "Ctrl" && /^(PageUp|PageDown)$/.test(evt.key) && helfer.belegOffen()) {
      const next = evt.key === "PageDown";
      beleg.ctrlNavi(next);
      return;
    }
    // Key "F3"
    if ((!m || m === "Shift") && evt.key === "F3") {
      if (!overlayId &&
          (shared.hauptfunktion === "liste" || helfer.belegOffen())) {
        suchleiste.f3(evt);
      }
      return;
    }
    // Key "F5"
    if (!m && evt.key === "F5" && overlayId === "kopieren-einfuegen") {
      kopieren.einfuegenBasisdaten(true);
      return;
    }
    // Key "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp"
    if ((!m || m === "Ctrl") && /^(ArrowDown|ArrowLeft|ArrowRight|ArrowUp)$/.test(evt.key)) {
      const m = sharedTastatur.modifiers;
      // BEDEUTUNGEN sind aktiv, kein Overlay
      if (helfer.bedeutungenOffen()) {
        if (m === "Ctrl" && /^(ArrowDown|ArrowUp)$/.test(evt.key)) {
          bedeutungen.navi(evt);
          return;
        } else if (!m && bedeutungen.moveAktiv) {
          bedeutungen.move(evt);
          return;
        }
      }
      // KARTEIKARTE ist aktiv, kein Overlay
      if (helfer.belegOffen() && m === "Ctrl" && evt.key === "ArrowDown") {
        beleg.ctrlSpringen(evt);
        return;
      }
      // EINSTELLUNGEN QUICK-CONFIG
      if (m === "Ctrl" &&
          !document.getElementById("einstellungen-sec-menue").classList.contains("aus") &&
          document.querySelector("#quick-config .aktiv")) {
        evt.preventDefault();
        let dir = "";
        switch (evt.key) {
          case "ArrowUp":
            dir = "hoch";
            break;
          case "ArrowRight":
            dir = "rechts";
            break;
          case "ArrowDown":
            dir = "runter";
            break;
          case "ArrowLeft":
            dir = "links";
            break;
        }
        quick.moveConfig(dir);
        return;
      }
      // NAVIGATION HOCH | RUNTER
      if (/^(ArrowDown|ArrowUp)$/.test(evt.key)) {
        if (m === "Ctrl" && overlayId === "einstellungen") {
          evt.preventDefault();
          optionen.naviMenue(evt);
        } else if (m === "Ctrl" && overlayId === "red-lit" && document.getElementById("red-lit-popup")) {
          evt.preventDefault();
          redLit.anzeigePopupNav(evt);
        }
        return;
      }
      sharedTastatur.arrows(evt);
      return;
    }
    // Key "Delete"
    if (evt.key === "Delete" && helfer.bedeutungenOffen()) {
      bedeutungen.loeschenTastatur();
      return;
    }
    // DRUCKEN: Key "p"
    if (m === "Ctrl" && evt.code === "KeyP") {
      drucken.tastatur();
      return;
    }
    // BELEGLISTE: Key "f"
    if (shared.hauptfunktion === "liste" && !overlayId &&
        m === "Ctrl+Shift" && evt.code === "KeyF") {
      document.getElementById("liste-link-filter").click();
    }
    // KARTEIKARTE: Key "d" | "i" | "k" | "m" | "t" | "u"
    if (helfer.belegOffen()) {
      if (m === "Ctrl") {
        if (evt.code === "KeyD") {
          beleg.toolsQuelleLaden(true);
        } else if (evt.code === "KeyI") {
          if (kopieren.an) {
            kopieren.addKarte();
          } else {
            beleg.ctrlZwischenablage(beleg.data);
          }
        } else if (evt.code === "KeyK") {
          beleg.ctrlKuerzen();
        } else if (evt.code === "KeyM") {
          const id = document.activeElement.id;
          if (/^beleg-(bd|bs)$/.test(id)) {
            const a = document.getElementById(id).closest("tr").previousSibling.querySelector(".icon-tools-sonderzeichen");
            a.dispatchEvent(new MouseEvent("click"));
          }
        } else if (evt.code === "KeyT") {
          beleg.ctrlTrennung();
        } else if (evt.code === "KeyU") {
          beleg.leseToggle(true);
        }
      } else if (m === "Ctrl+Shift" && evt.code === "KeyD") {
        beleg.toolsQuelleURL("ul");
      } else if (m === "Alt+Ctrl" && evt.code === "KeyD") {
        beleg.toolsTextdatum(true);
      }
      return;
    }
    // LITERATURDATENBANK: Key "f" | "h" | "s"
    if (m === "Ctrl" && overlayId === "red-lit") {
      if (evt.code === "KeyF" && !kartei.wort) {
        filter.suche();
      } else if (evt.code === "KeyH") {
        if (redLit.db.locked) {
          return;
        }
        redLit.dbCheck(() => redLit.eingabeHinzufuegen(), false);
      } else if (evt.code === "KeyS" && !kartei.wort) {
        speichern.kaskade();
      }
    }
  },
};
