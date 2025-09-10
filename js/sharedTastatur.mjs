
import dd from "./dd.mjs";

export { sharedTastatur as default };

const sharedTastatur = {
  // Navigation nach links und rechts mit Pfeilen
  //   evt = Object
  //     (Event-Object des keydown)
  arrows (evt) {
    // Abbruch, wenn "Ctrl"
    const m = this.modifiers;
    if (m === "Ctrl") {
      return;
    }
    // Ist das aktive Element ein Anker oder ein Button?
    const aktiv = document.activeElement;
    if (!(aktiv.nodeName === "A" || aktiv.nodeName === "INPUT" && aktiv.type === "button")) {
      return;
    }
    // Parent-Block ermitteln
    let parent = aktiv.parentNode;
    while (!/^(BODY|DIV|HEADER|P|TD|TH)$/.test(parent.nodeName)) { // BODY nur zur Sicherheit, falls ich in der Zukunft vergesse, die Liste ggf. zu ergänzen
      parent = parent.parentNode;
    }
    // Elemente sammeln und Fokus-Position ermitteln
    const elemente = [];
    let regA = /filter-kopf|icon-link|navi-link/;
    if (parent.parentNode.id === "liste-filter") {
      // sonst findet er auch die Icon-Links in der Filterleiste
      regA = /filter-kopf/;
    }
    parent.querySelectorAll('a, input[type="button"]').forEach(e => {
      if (e.nodeName === "INPUT" || e.nodeName === "A" && regA.test(e.getAttribute("class"))) {
        elemente.push(e);
      }
    });
    if (!elemente.length) {
      return;
    }
    let pos = -1;
    for (let i = 0, len = elemente.length; i < len; i++) {
      if (elemente[i] === aktiv) {
        pos = i;
        break;
      }
    }
    // Position des zu fokussierenden Elements ermitteln
    do {
      if (evt.key === "ArrowLeft" && pos > 0) { // zurück
        pos--;
      } else if (evt.key === "ArrowLeft") { // letzte Position
        pos = elemente.length - 1;
      } else if (evt.key === "ArrowRight" && pos < elemente.length - 1) { // vorwärts
        pos++;
      } else if (evt.key === "ArrowRight") { // 1. Position
        pos = 0;
      }
      // Buttons können versteckt sein, das geschieht aber alles im CSS-Code;
      // hat der Button ein display === "none" ist er versteckt und kann nicht
      // fokussiert werden. Normal ist display === "inline-block".
    } while (getComputedStyle(elemente[pos]).display === "none");
    // Das Element kann fokussiert werden
    elemente[pos].focus();
  },

  // Zwischenspeicher für die gedrückten Modifiers
  modifiers: "",

  // ermittelt die gedrückten Modifiers und erstellt einen String
  //   evt = Object
  //     (Event-Object des keydown)
  detectModifiers (evt) {
    const s = [];
    if (evt.altKey) {
      s.push("Alt");
    }
    if (evt.getModifierState("AltGraph")) {
      s.push("AltGr");
    }
    if (evt.getModifierState("CapsLock")) {
      s.push("Caps");
    }
    if (evt.ctrlKey) {
      s.push("Ctrl");
    }
    if (evt.metaKey) {
      if (dd.app.platform === "darwin") {
        // unter macOS ist es besser, wenn die Command-Taste wie Ctrl agiert
        // (in den Electron-Menüs wird dies automatisch so umgesetzt)
        s.push("Ctrl");
      } else {
        s.push("Meta");
      }
    }
    if (evt.shiftKey) {
      s.push("Shift");
    }
    this.modifiers = s.join("+");
  },

  // Beschreibung von Tastaturkürzeln unter macOS anpassen
  shortcutsText () {
    if (dd.app.platform !== "darwin") {
      return;
    }
    const kuerzel = {
      Strg: "⌘",
      Alt: "⌥",
    };
    // <kbd>
    document.querySelectorAll("kbd").forEach(i => {
      if (i.classList.contains("nochange")) {
        return;
      }
      if (i.textContent === "Strg") {
        i.textContent = kuerzel.Strg;
      } else if (i.textContent === "Alt") {
        i.textContent = kuerzel.Alt;
      }
    });
    // title=""
    document.querySelectorAll("[title]").forEach(i => {
      if (/Strg \+/.test(i.title)) {
        i.title = i.title.replace(/Strg \+/, `${kuerzel.Strg} +`);
      }
      if (/Alt \+/.test(i.title)) {
        i.title = i.title.replace(/Alt \+/, `${kuerzel.Alt} +`);
      }
    });
  },

  // auf Anfrage das aktuelle Kürzel zurückgeben
  // (unter macOS muss es geändert werden)
  //   text = String
  //     (das Tastaturkürzel, das ggf. angepasst werden soll)
  shortcutsTextAktuell (text) {
    if (dd.app.platform !== "darwin") {
      return text;
    }
    const kuerzel = {
      Strg: "⌘",
      Alt: "⌥",
    };
    return kuerzel[text];
  },
};
