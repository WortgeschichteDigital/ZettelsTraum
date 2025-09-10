
import beleg from "./beleg.mjs";

import shared from "../shared.mjs";
import sharedTastatur from "../sharedTastatur.mjs";

export { dropdown2 as default };

const dropdown2 = {
  // Map für Funktionen
  funMap: {
    belegBedeutung: {
      obj: beleg,
      add: "formularBedeutungAdd",
      list: "formularBedeutungList",
    },
    belegTags: {
      obj: beleg,
      add: "tagsAdd",
      list: "tagsList",
    },
  },

  // Filter-Timeout
  filterTimeout: undefined,

  // Container initialisieren
  init () {
    document.querySelectorAll(".dropdown2-cont").forEach(e => {
      // Listenfeld ergänzen
      const list = document.createElement("div");
      e.appendChild(list);
      list.classList.add("dropdown2-list");
      const scroll = document.createElement("div");
      list.appendChild(scroll);

      // Input-Feld: Liste beim Fokussieren neu aufbauen
      const input = e.querySelector(".dropdown2-input");
      input.addEventListener("focus", function () {
        dropdown2.list(this);
      });

      // Input-Feld: Event für Wert hinzufügen und Navigation
      input.addEventListener("keydown", function (evt) {
        sharedTastatur.detectModifiers(evt);
        if (!sharedTastatur.modifiers && evt.key === "Enter") {
          dropdown2.add(this);
        } else if (!sharedTastatur.modifiers && /^Arrow(Up|Down)$/.test(evt.key)) {
          evt.preventDefault();
          dropdown2.nav(this, evt.key === "ArrowUp");
        }
      });

      // Input-Feld: Event für Textfilter
      input.addEventListener("input", function () {
        clearTimeout(dropdown2.filterTimeout);
        dropdown2.filterTimeout = setTimeout(() => dropdown2.list(this), 250);
      });
    });
  },

  // Liste neu aufbauen
  //   input = Node
  list (input) {
    // Liste holen
    const funs = dropdown2.funMap[input.dataset.dropdown2];
    const frag = funs.obj[funs.list]();

    // Textfilter anwenden
    const text = input.value.trim();
    if (text) {
      const reg = new RegExp(shared.escapeRegExp(text), "i");
      const a = frag.querySelectorAll("a");
      for (let i = a.length - 1; i >= 0; i--) {
        const item = a[i];
        if (!reg.test(item.dataset.suchtext)) {
          item.parentNode.removeChild(item);
        }
      }
    }

    // Liste einhängen
    const list = input.closest(".dropdown2-cont").querySelector(".dropdown2-list");
    list.firstChild.replaceChildren();
    list.firstChild.appendChild(frag);
  },

  // Navigation in der Liste
  //   input = Node
  //   up = Boolean
  nav (input, up) {
    // Gibt es überhaupt Werte zum Hinzufügen?
    const list = input.closest(".dropdown2-cont").querySelector(".dropdown2-list");
    const a = list.querySelectorAll("a");
    if (!a.length) {
      return;
    }

    // markiertes Element ermitteln
    const markiert = list.querySelector(".markiert");
    let idx = -1;
    if (markiert) {
      for (let i = 0, len = a.length; i < len; i++) {
        if (a[i].classList.contains("markiert")) {
          idx = i;
          break;
        }
      }
      markiert.classList.remove("markiert");
    }

    // nächstes Element markieren
    if (up) {
      idx--;
    } else {
      idx++;
    }
    if (idx < 0) {
      return;
    } else if (idx === a.length) {
      idx--;
    }
    a[idx].classList.add("markiert");

    // ggf. scrollen
    const cont = list.firstChild;
    const contHeight = cont.offsetHeight;
    const aHeight = a[0].offsetHeight;
    const scrollTop = cont.scrollTop;
    const top = a[idx].offsetTop;
    if (top >= contHeight + scrollTop - aHeight) {
      cont.scrollTo(0, a[idx].offsetTop - 2 * aHeight);
    } else if (top <= scrollTop) {
      cont.scrollTo(0, a[idx].offsetTop - 7 * aHeight);
    }
  },

  // Wert aus der Liste hinzufügen
  //   input = Node
  add (input) {
    // markierten Eintag in der Liste hinzufügen
    const list = input.closest(".dropdown2-cont").querySelector(".dropdown2-list");
    const markiert = list.querySelector(".markiert");
    if (markiert) {
      markiert.click();
      return;
    }

    // neuen Wert hinzufügen
    const val = shared.textTrim(input.value, true);
    if (!val) {
      return;
    }

    const funs = dropdown2.funMap[input.dataset.dropdown2];
    const added = funs.obj[funs.add](val);
    if (added) {
      input.value = "";
      dropdown2.list(input);
    }
  },
};
