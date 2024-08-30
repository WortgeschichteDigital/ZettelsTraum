"use strict";

const belegeBuchung = {
  // ID collection
  data: {
    // IDs of all quotations present in the current file
    //    ID = boolean (booked or not booked)
    file: {},
    // all IDs that were found in the clipboard
    cb: [],
  },

  // open overlay window
  open () {
    // lock for macOS (menu can't be deactivated)
    if (!kartei.wort) {
      dialog.oeffnen({
        typ: "alert",
        text: "Um die Funktion <i>Belege &gt; Buchung überprüfen</i> zu nutzen, muss eine Kartei geöffnet sein.",
      });
      return;
    }

    // Is the list view active?
    if (helfer.hauptfunktion !== "liste") {
      dialog.oeffnen({
        typ: "alert",
        text: "Die Funktion <i>Belege &gt; Buchung überprüfen</i> steht nur zur Verfügung, wenn die Belegliste sichtbar ist.",
      });
      return;
    }

    // open window or move it in the foreground
    const win = document.getElementById("buchung");
    if (overlay.oeffnen(win)) {
      // window already open
      return;
    }
    document.getElementById("buchung-read").focus();
  },

  // read and anaylze clipboard content
  read () {
    // parse quotations and create appropriate IDs
    this.data.file = {};
    for (const [ id, card ] of Object.entries(data.ka)) {
      const ref = xml.belegId({ data: card, id });
      this.data.file[ref] = card.tg.includes("Buchung");
    }

    // parse clipboard and extract IDs
    this.data.cb = [];
    const reg = /(?<!##(?:\p{Lowercase}|-)*)[\p{Lowercase}-]+-[0-9]{4}-[0-9]+(?!##)/ug;
    const text = modules.clipboard.readText();
    for (const id of text.match(reg) || []) {
      if (!this.data.cb.includes(id)) {
        this.data.cb.push(id);
      }
    }

    // show results
    this.results();
    helfer.animation("wrap");

    // determine maximal height of content
    helfer.elementMaxHeight({
      ele: document.getElementById("buchung-results"),
    });
  },

  // show results
  results () {
    const res = document.getElementById("buchung-results");
    res.replaceChildren();

    // update message
    const message = document.getElementById("buchung-message");
    if (!this.data.cb.length) {
      message.classList.add("buchung-message-error");
      message.textContent = "keine Belegreferenzen im Text der Zwischenablage";
      return;
    }
    message.classList.remove("buchung-message-error");
    const numerus = this.data.cb.length === 1 ? "Belegreferenz" : "Belegreferenzen";
    message.textContent = `${this.data.cb.length} ${numerus} im Text der Zwischenablage`;

    // 1. IDs that were not found
    const notFound = [];
    for (const id of this.data.cb) {
      if (typeof this.data.file[id] === "undefined" && !notFound.includes(id)) {
        notFound.push(id);
      }
    }
    if (notFound.length) {
      printList({
        h: "Belegreferenz im Text, aber nicht im Karteikasten",
        arr: notFound,
        type: "not-found",
      });
    }

    // 2. IDs that are booked but not in the text
    const notInText = [];
    for (const [ id, booked ] of Object.entries(this.data.file)) {
      if (booked && !this.data.cb.includes(id)) {
        notInText.push(id);
      }
    }
    if (notInText.length) {
      printList({
        h: "Belegreferenz gebucht, aber nicht im Text",
        arr: notInText,
        type: "not-in-text",
      });
    }

    // 3. IDs that are not booked
    const notBooked = [];
    for (const id of this.data.cb) {
      if (!notFound.includes(id) && !notBooked.includes(id) && !this.data.file[id]) {
        notBooked.push(id);
      }
    }
    if (notBooked.length) {
      printList({
        h: "Belegreferenz im Text, aber nicht gebucht",
        arr: notBooked,
        type: "not-booked",
      });
    }

    // print list
    function printList ({ h, arr, type }) {
      // print heading
      const h3 = document.createElement("h3");
      res.appendChild(h3);
      h3.textContent = h;

      // book all unbooked quotations
      if ((type === "not-booked" || type === "not-in-text") && arr.length > 1) {
        const p = document.createElement("p");
        res.appendChild(p);
        const a = document.createElement("a");
        p.appendChild(a);
        a.classList.add("buchung-all");
        a.dataset.type = type;
        a.href = "#";
        a.textContent = type === "not-booked" ? "alle Belege buchen" : "alle Belege entbuchen";
        a.addEventListener("click", function (evt) {
          evt.preventDefault();
          const type = this.dataset.type;
          document.querySelectorAll(`#buchung-results ul[data-type="${this.dataset.type}"] a.icon-link`).forEach(i => {
            if (type === "not-booked" && !i.classList.contains("icon-tools-gebucht") ||
                type === "not-in-text" && i.classList.contains("icon-tools-gebucht")) {
              i.click();
            }
          });
        });
        const img = document.createElement("img");
        a.insertBefore(img, a.firstChild);
        img.src = type === "not-booked" ? "img/buch-check.svg" : "img/buch.svg";
        img.width = "24";
        img.height = "24";
      }

      // print list
      const ul = document.createElement("ul");
      res.appendChild(ul);
      ul.dataset.type = type;
      for (const id of arr) {
        const li = document.createElement("li");
        ul.appendChild(li);
        if (type === "not-in-text" || type === "not-booked") {
          // booking icon
          const a = document.createElement("a");
          li.appendChild(a);
          a.classList.add("icon-link", "icon-tools-buchen");
          if (belegeBuchung.data.file[id]) {
            a.classList.add("icon-tools-gebucht");
          }
          a.dataset.id = id.replace(/^.+-/, "");
          a.href = "#";
          a.title = "Buchung umschalten";
          toggleBooking(a);

          // ID
          printID({
            cont: li,
            id,
          });
        } else if (type === "not-found") {
          // icon
          const img = document.createElement("img");
          li.appendChild(img);
          img.src = "img/kreis-leer.svg";
          img.width = "24";
          img.height = "24";

          // ID
          printID({
            cont: li,
            id,
          });

          // similar IDs
          const similar = [];
          const parts = /^(?<nameYear>.+)-(?<cardID>[0-9]+)$/.exec(id);
          const regStart = new RegExp("^" + parts.groups.nameYear.replace(/n-?n/, "n-?n"));
          const regId = new RegExp("-" + parts.groups.cardID + "$");
          for (const key of Object.keys(belegeBuchung.data.file)) {
            if (regStart.test(key) || regId.test(key)) {
              similar.push(key);
            }
          }
          if (similar.length) {
            li.appendChild(document.createElement("br"));
            const label = document.createElement("i");
            li.appendChild(label);
            label.textContent = "ähnlich: ";
            for (let i = 0, len = similar.length; i < len; i++) {
              if (i > 0) {
                li.appendChild(document.createTextNode(", "));
              }
              printID({
                cont: li,
                id: similar[i],
              });
            }
          }
        }
      }

      // initialize tooltips
      tooltip.init(ul);
    }

    // print ID
    function printID ({ cont, id }) {
      const a = document.createElement("a");
      cont.appendChild(a);
      a.href = "#";
      a.textContent = id;
      a.title = "Belegreferenz kopieren";
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        modules.clipboard.writeText(this.textContent);
        helfer.animation("zwischenablage");
      });
    }

    // toggle booking
    function toggleBooking (a) {
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const card = data.ka[this.dataset.id];
        if (!card) {
          // card not found
          dialog.oeffnen({
            typ: "alert",
            text: `Der Beleg mit der ID ${this.dataset.id} existiert nicht mehr.`,
          });
          return;
        }
        const booked = card.tg.includes("Buchung");
        if (booked) {
          card.tg.splice(card.tg.indexOf("Buchung"), 1);
          this.classList.remove("icon-tools-gebucht");
        } else {
          card.tg.push("Buchung");
          card.tg.sort(beleg.tagsSort);
          this.classList.add("icon-tools-gebucht");
        }
        kartei.karteiGeaendert(true);
      });
    }
  },

  // reset input window
  reset () {
    const message = document.getElementById("buchung-message");
    message.textContent = "Text mit Belegreferenzen kopieren und Zwischenablage einlesen";
    const res = document.getElementById("buchung-results");
    res.replaceChildren();
  },
};
