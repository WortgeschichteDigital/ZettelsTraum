
import data from "./data.mjs";
import events from "./events.mjs";
import lemmas from "./lemmas.mjs";
import load from "./load.mjs";
import means from "./means.mjs";
import misc from "./misc.mjs";

import dialog from "../../dialog.mjs";
import shared from "../../shared.mjs";
import tooltip from "../../tooltip.mjs";

export { config as default };

const config = {
  // initialize configuration
  init () {
    // prepare area
    const conf = document.getElementById("config");
    conf.scrollTop = 0;
    while (conf.childNodes.length > 1) {
      conf.removeChild(conf.lastChild);
    }
    conf.classList.remove("init");

    // initialize description field
    this.initDesc();

    // initialize lemmas
    this.initLemmas();
  },

  // initialize description field
  initDesc () {
    const desc = document.createElement("div");
    document.getElementById("config").appendChild(desc);

    this.addBlockLabel({
      key: "description",
      id: "config-description",
      cont: desc,
    });

    const { da } = load.data.vis;
    const ta = document.createElement("textarea");
    desc.appendChild(ta);
    ta.id = "description";
    ta.setAttribute("placeholder", "Beschreibungstext");
    ta.value = da.description || "";
    ta.addEventListener("change", function () {
      const valueRaw = this.value;
      const text = misc.typo(valueRaw)
        .trim()
        .replace(/\n/g, " ")
        .replace(/\s{2,}/g, " ");
      if (valueRaw !== text) {
        this.value = text;
      }
      da.description = text;
      load.svg();
      load.sha1Update();
      data.save();
    });
  },

  // initialize lemmas
  initLemmas () {
    // create lemma blocks
    const conf = document.getElementById("config");
    for (const [ lemma, values ] of Object.entries(load.data.vis.da.lemmas)) {
      const l = this.makeLemmaBlock(lemma, values);
      conf.appendChild(l);
    }

    // set tabindices to all meaning and event blocks
    document.querySelectorAll(".meaning-cont, .event-cont").forEach(i => this.toggleTabindex(i, false));
  },

  // make a new lemma block
  //   lemma = string
  //   value = object
  makeLemmaBlock (lemma, values) {
    // no values passed
    // (this happens when the mapping is changed and the lemma is deactivated)
    if (!values) {
      return null;
    }

    // create container
    const cont = document.createElement("div");
    cont.classList.add("lemma-cont");
    cont.dataset.lemma = lemma;

    // create heading
    const { vis } = load.data;
    if (!vis.ll) {
      const h3 = document.createElement("h3");
      cont.appendChild(h3);
      h3.textContent = lemma;
    }

    // add functions
    const funCont = document.createElement("p");
    cont.appendChild(funCont);

    const fun = [
      {
        src: "geruest.svg",
        label: "Bedeutungen",
        type: "meaning",
      },
      {
        src: "plus-dick.svg",
        label: "Ereignis",
        type: "event",
      },
    ];
    if (vis.ll) {
      fun[0] = {
        src: "plus-dick.svg",
        label: "Lemma",
        type: "lemma",
      };
    }

    for (const i of fun) {
      const a = document.createElement("a");
      funCont.appendChild(a);
      a.classList.add("fun-link");
      a.dataset.lemma = lemma;
      a.dataset.type = i.type;
      a.href = "#";
      a.id = `fun-${i.type}-${encodeURI(lemma)}`;
      this.makeImg({
        src: i.src,
        cont: a,
      });
      a.appendChild(document.createTextNode(i.label));
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const { lemma, type } = this.dataset;
        if (type === "lemma") {
          // add lemma
          lemmas.add();
        } else if (type === "event") {
          // add event
          events.add(lemma);
        } else {
          // add meaning
          means.show("config", lemma);
        }
      });
    }

    // numbering toggle
    if (!vis.ll) {
      const numCont = document.createElement("p");
      cont.appendChild(numCont);
      numCont.classList.add("num-cont");

      const num = document.createElement("input");
      numCont.appendChild(num);
      num.type = "checkbox";
      const id = "showNumbering-" + encodeURI(lemma);
      num.id = id;
      num.value = lemma;
      if (values.showNumbering) {
        num.checked = true;
      }
      num.addEventListener("change", function () {
        const { value } = this;
        load.data.vis.da.lemmas[value].showNumbering = this.checked;
        load.svg();
        load.sha1Update();
        data.save();
      });

      this.makeLabel({
        id,
        text: "Bedeutungen mit Zählzeichen",
        cont: numCont,
      });
    }

    // add meanings
    const removeMeanings = [];
    for (let i = 0, len = values.meanings.length; i < len; i++) {
      const meaning = values.meanings[i];
      const m = this.makeMeanBlock(lemma, meaning);
      if (m) {
        // append meaning block
        cont.appendChild(m);
      } else {
        // mark this meaning for removal
        // (the lemma mapping has been changed and there is
        //  no corresponding ID to this meaning)
        removeMeanings.push(i);
      }
    }
    for (let i = removeMeanings.length - 1; i >= 0; i--) {
      const idx = removeMeanings[i];
      values.meanings.splice(idx, 1);
    }

    // add events
    for (let i = 0, len = values.events.length; i < len; i++) {
      const evt = values.events[i];
      const e = this.makeEvtBlock(lemma, evt);
      cont.appendChild(e);
    }

    // return result
    return cont;
  },

  // make a new meaning block
  //   lemma = string
  //   meaning = object
  makeMeanBlock (lemma, meaning) {
    // remove non existing meanings
    // (if the meaning lists differ in structure, it might be impossible
    //  to find a corresponding meaning ID after the lemma mapping has been changed)
    const { vis } = load.data;
    if (!vis.ll && !document.getElementById(meaning.id)) {
      return null;
    }

    // create container
    const cont = document.createElement("div");
    cont.classList.add("closed", "meaning-cont");
    cont.dataset.id = meaning.id;

    // add header
    const header = document.createElement("div");
    cont.appendChild(header);
    header.classList.add("meaning-header");

    // add definition number
    let meanEle;
    let meanNum;
    if (vis.ll) {
      meanNum = "Lemma";
    } else {
      meanEle = document.getElementById(meaning.id);
      meanNum = meanEle.querySelector(".wgd-zaehlz").textContent;
      let meanParent = meanEle.parentNode.parentNode;
      while (meanParent.nodeName === "LI") {
        const num = meanParent.querySelector(".wgd-zaehlz").textContent;
        if (num) {
          meanNum = num + meanNum;
        }
        meanParent = meanParent.parentNode.parentNode;
      }
    }
    const zaehlz = document.createElement("span");
    header.appendChild(zaehlz);
    zaehlz.classList.add("wgd-zaehlz");
    zaehlz.textContent = meanNum;

    // add definition
    let paraphrase;
    if (vis.ll) {
      paraphrase = document.createTextNode(meaning.definition || "[keine Angabe]");
    } else {
      paraphrase = meanEle.querySelector(".wgd-paraphrase").cloneNode(true);
    }
    header.appendChild(paraphrase);
    header.addEventListener("click", function () {
      config.toggleBlock(this.parentNode);
    });

    // add function icons
    const fun = document.createElement("span");
    header.appendChild(fun);
    fun.classList.add("meaning-fun");
    const funTarget = vis.ll ? "Lemma" : "Bedeutung";

    // move entry
    this.makeImg({
      src: "pfeil-gerade-hoch.svg",
      title: funTarget + " nach oben schieben",
      cont: fun,
    });
    fun.lastChild.classList.add("meaning-fun-move");
    fun.lastChild.addEventListener("click", function (evt) {
      evt.stopPropagation();
      const { lemma } = this.closest(".lemma-cont").dataset;
      const { id } = this.closest(".meaning-cont").dataset;
      config.moveUp(lemma, id);
    });

    // delete entry
    this.makeImg({
      src: "muelleimer.svg",
      title: funTarget + " aus Grafik entfernen",
      cont: fun,
    });
    fun.lastChild.addEventListener("click", function (evt) {
      evt.stopPropagation();
      const { lemma } = this.closest(".lemma-cont").dataset;
      const { id } = this.closest(".meaning-cont").dataset;
      means.toggleConfig(lemma, id);
    });

    // add form elements
    const configs = [
      {
        key: "definition",
        placeholder: `›${paraphrase.textContent}‹`,
        type: "text",
      },
      {
        key: "frequency",
        placeholder: "Ziffer 1–3",
        type: "number",
        min: 1,
        max: 3,
      },
      {
        key: "quotations",
        type: "",
      },
      {
        key: "usedFrom",
        placeholder: "Jahreszahl oder 0",
        type: "number",
        min: 0,
        max: 9999,
      },
      {
        key: "usedUntil",
        placeholder: "Jahreszahl oder 0",
        type: "number",
        min: 0,
        max: 9999,
      },
    ];
    if (vis.ll) {
      configs[0].placeholder = "Lemma";
    }

    for (const i of configs) {
      const div = document.createElement("div");
      cont.appendChild(div);
      div.classList.add("config-block");

      const id = `${i.key}-${lemma}-${meaning.id}`;
      this.addBlockLabel({
        key: vis.ll ? "ll-" + i.key : i.key,
        id,
        cont: div,
      });

      if (i.type) {
        // input elements
        if (i.key === "usedFrom" || i.key === "usedUntil") {
          // checkboxes for special purposes
          const map = {
            usedFrom: {
              idFrag: "isFirstQuot",
              label: "frühester Beleg ist Erstbeleg",
            },
            usedUntil: {
              idFrag: "stillInUse",
              label: `${vis.ll ? "Lemma" : "Bedeutung"} noch im Gebrauch`,
            },
          };
          usedCheck({
            cont: div,
            idFrag: map[i.key].idFrag,
            idMean: meaning.id,
            key: i.key,
            label: map[i.key].label,
            value: meaning[i.key],
          });
        }

        const input = document.createElement("input");
        div.appendChild(input);
        input.dataset.key = i.key;
        input.id = id;
        input.placeholder = i.placeholder;
        input.type = i.type;
        input.value = meaning[i.key];
        if (i.type === "number") {
          input.defaultValue = meaning[i.key];
        }
        if (typeof i.min !== "undefined") {
          input.min = i.min;
        }
        if (typeof i.max !== "undefined") {
          input.max = i.max;
        }

        input.addEventListener("change", function () {
          // auto correct number fields
          const { type } = this;
          if (type === "number") {
            shared.inputNumber(this);
          }

          // detect necessary variables
          const { lemma } = this.closest(".lemma-cont").dataset;
          const { id } = this.closest(".meaning-cont").dataset;
          const { key } = this.dataset;
          const { vis } = load.data;

          // data update
          const valueRaw = this.value;
          let value = valueRaw.trim();
          if (key === "definition") {
            value = misc.typo(value);
          }
          const meaning = vis.da.lemmas[lemma].meanings.find(i => i.id === id);
          meaning[key] = type === "number" ? parseInt(value, 10) : value;

          // update field
          if (valueRaw !== value) {
            this.value = value;
          }

          // update the configuration block header
          if (vis.ll && key === "definition") {
            const header = this.closest(".meaning-cont").querySelector(".meaning-header");
            const lemma = document.createTextNode(meaning[key] || "[keine Angabe]");
            header.replaceChild(lemma, header.childNodes[1]);
          }

          // auto correct the toggle state of the checkboxes
          if (key === "usedFrom" || key === "usedUntil") {
            const check = this.previousSibling.firstChild;
            if (meaning[key] === 0) {
              check.checked = true;
            } else {
              check.checked = false;
            }
          }

          // update data and graphics
          load.svg();
          load.sha1Update();
          data.save();
        });
      } else {
        // input field for adding a year
        const input = document.createElement("input");
        div.appendChild(input);
        input.id = `quotYear-${lemma}-${meaning.id}`;
        input.placeholder = "Jahr hinzufügen";
        input.type = "text";
        input.value = "";

        // change listener
        input.addEventListener("change", function () {
          const { value } = this;
          if (!/^[0-9]{1,4}$/.test(value) || value === "0") {
            dialog.oeffnen({
              typ: "alert",
              text: 'Beim Hinzufügen des Jahrs ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">Jahr liegt nicht zwischen 1 und 9999</p>',
              callback: () => {
                this.value = "";
                this.focus();
              },
            });
            return;
          }
          this.value = "";
          config.quotAdd(this, parseInt(value, 10));
        });

        // quotation list
        const list = document.createElement("div");
        div.appendChild(list);
        list.classList.add("quot-list");
        list.id = `quotList-${encodeURI(lemma)}-${meaning.id}`;
        this.quotList(lemma, meaning.id, list);
      }
    }

    // checkbox for usage span
    function usedCheck ({ cont, idFrag, idMean, key, label, value }) {
      const p = document.createElement("p");
      cont.appendChild(p);

      const check = document.createElement("input");
      p.appendChild(check);
      check.dataset.key = key;
      check.type = "checkbox";
      const id = idFrag + "-" + encodeURI(lemma) + "-" + idMean;
      check.id = id;
      if (value === 0) {
        check.checked = true;
      }

      config.makeLabel({
        id,
        text: label,
        cont: p,
      });

      check.addEventListener("change", function () {
        // update the input value
        const input = this.parentNode.nextSibling;
        if (this.checked) {
          input.value = 0;
        } else if (input.defaultValue !== "0") {
          input.value = input.defaultValue;
        } else {
          const { lemma } = this.closest(".lemma-cont").dataset;
          const { id } = this.closest(".meaning-cont").dataset;
          const { key } = this.dataset;
          const { quotations } = vis.da.lemmas[lemma].meanings.find(i => i.id === id);
          if (quotations.length) {
            if (key === "usedFrom") {
              input.value = config.getYear(quotations[0]) - 10;
            } else if (quotations.length > 1) {
              input.value = config.getYear(quotations.at(-1)) + 25;
            }
          }
        }
        input.dispatchEvent(new Event("change"));
      });
    }

    // return result
    return cont;
  },

  // make a new event block
  //   lemma = string
  //   evt = object
  makeEvtBlock (lemma, evt) {
    // create container
    const cont = document.createElement("div");
    cont.classList.add("closed", "event-cont");
    cont.dataset.id = evt.id;

    // add header
    const header = document.createElement("div");
    cont.appendChild(header);
    header.classList.add("event-header");
    header.appendChild(this.evtHeaderText(evt.name));
    header.addEventListener("click", function () {
      config.toggleBlock(this.parentNode);
    });

    const fun = document.createElement("span");
    header.appendChild(fun);
    fun.classList.add("event-fun");
    this.makeImg({
      src: "muelleimer.svg",
      title: "Ereignis aus Grafik entfernen",
      cont: fun,
    });
    fun.firstChild.addEventListener("click", async function (evt) {
      evt.stopPropagation();
      const configBlock = this.closest(".event-cont");
      const { lemma } = this.closest(".lemma-cont").dataset;
      const { id } = configBlock.dataset;
      const { events } = load.data.vis.da.lemmas[lemma];
      const idx = events.findIndex(i => i.id === id);

      const remove = await new Promise(resolve => {
        const name = events[idx].name.replace(/\n/g, " ") || "[ohne Namen]";
        dialog.oeffnen({
          typ: "confirm",
          text: `Soll das Ereignis <i>${name}</i> wirklich aus der Grafik entfernt werden?`,
          callback: () => resolve(dialog.antwort),
        });
      });
      if (!remove) {
        return;
      }

      events.splice(idx, 1);
      configBlock.parentNode.removeChild(configBlock);
      load.svg();
      load.sha1Update();
      data.save();
    });

    // add form elements
    const configs = [
      {
        key: "name",
        placeholder: "Name des Ereignisses",
        type: "textarea",
      },
      {
        key: "yearFrom",
        placeholder: "Jahreszahl oder 0",
        type: "number",
        min: 0,
        max: 9999,
      },
      {
        key: "yearTo",
        placeholder: "Jahreszahl oder 0",
        type: "number",
        min: 0,
        max: 9999,
      },
      {
        key: "description",
        placeholder: "Beschreibung des Ereignisses",
        type: "textarea",
      },
    ];

    for (const i of configs) {
      const div = document.createElement("div");
      cont.appendChild(div);
      div.classList.add("config-block");

      const id = `${i.key}-${lemma}-${evt.id}`;
      this.addBlockLabel({
        key: "event-" + i.key,
        id,
        cont: div,
      });

      const tag = i.type === "textarea" ? "textarea" : "input";
      const input = document.createElement(tag);
      div.appendChild(input);
      input.dataset.key = i.key;
      input.id = id;
      input.placeholder = i.placeholder;
      if (i.type !== "textarea") {
        input.type = i.type;
      }
      input.value = evt[i.key];
      if (i.type === "number") {
        input.defaultValue = evt[i.key];
      }
      if (typeof i.min !== "undefined") {
        input.min = i.min;
      }
      if (typeof i.max !== "undefined") {
        input.max = i.max;
      }

      input.addEventListener("change", function () {
        const { type } = this;
        if (type === "number") {
          shared.inputNumber(this);
        }

        const { lemma } = this.closest(".lemma-cont").dataset;
        const { id } = this.closest(".event-cont").dataset;
        const { key } = this.dataset;

        const evt = load.data.vis.da.lemmas[lemma].events.find(i => i.id === id);
        const valueRaw = this.value;
        let value = valueRaw.trim();
        if (key === "description") {
          value = misc.typo(value)
            .replace(/\n/g, " ")
            .replace(/\s{2,}/g, " ");
        } else if (key === "name") {
          value = value.replace(/\s*\n+\s*/g, "\n");
        }
        evt[key] = type === "number" ? parseInt(value, 10) : value;

        if (key === "name") {
          value = misc.typo(value);
          const header = this.closest(".event-cont").querySelector(".event-header");
          while (header.childNodes.length > 1) {
            header.removeChild(header.firstChild);
          }
          header.insertBefore(config.evtHeaderText(evt.name), header.lastChild);
        }

        if (valueRaw !== value) {
          this.value = value;
        }

        load.svg();
        load.sha1Update();
        data.save();
      });
    }

    // return result
    return cont;
  },

  // get the year of a quotation
  //   quotation = string | number
  getYear (quotation) {
    let year;
    if (typeof quotation === "number") {
      year = quotation;
    } else {
      const yearStr = document.getElementById(quotation)
        ?.querySelector("time")
        ?.getAttribute("datetime")
        ?.split("-")
        ?.[0];
      year = parseInt(yearStr || 0, 10);
    }
    return year;
  },

  // add a quotation to a meaning
  //   caller = element
  //   quotation = string | number
  quotAdd (caller, quotation) {
    // add quotation/year
    const { lemma } = caller.closest(".lemma-cont").dataset;
    const { id } = caller.closest(".meaning-cont").dataset;
    const meaning = load.data.vis.da.lemmas[lemma].meanings.find(i => i.id === id);

    if (meaning.quotations.includes(quotation)) {
      const type = typeof quotation === "number" ? "Jahr" : "Beleg";
      dialog.oeffnen({
        typ: "alert",
        text: `Beim Hinzufügen des ${type}s ist ein Fehler aufgetreten.\n<h3>Fehlermeldung</h3>\n<p class="force-wrap">${type} schon in der Liste</p>`,
      });
      return;
    }

    meaning.quotations.push(quotation);
    const quots = [];
    for (const i of meaning.quotations) {
      quots.push({
        val: i,
        year: this.getYear(i),
      });
    }
    quots.sort((a, b) => a.year - b.year);
    meaning.quotations = quots.flatMap(i => i.val);

    // update quotation list
    this.quotList(lemma, id);

    // update data and graphics
    load.svg();
    load.sha1Update();
    data.save();
  },

  // update the quotation list of a meaning
  //   lemma = string
  //   id = string
  //   list = element
  quotList (lemma, id, list = null) {
    // prepare list
    list ||= document.getElementById(`quotList-${encodeURI(lemma)}-${id}`);
    list.replaceChildren();

    // fill list
    const { quotations } = load.data.vis.da.lemmas[lemma].meanings.find(i => i.id === id);
    const removeQuots = [];
    for (let i = 0, len = quotations.length; i < len; i++) {
      // detect list item name
      const q = quotations[i];
      let html;
      if (typeof q === "number") {
        html = `Jahr ${q}`;
      } else {
        const name = document.querySelector(`#${q} time`)?.innerHTML;
        if (!name) {
          removeQuots.push(i);
          continue;
        } else {
          html = `Beleg ${name}`;
        }
      }

      // create list item
      const a = document.createElement("a");
      list.appendChild(a);
      a.dataset.lemma = lemma;
      a.dataset.id = id;
      a.dataset.value = q;
      a.href = "#";
      a.innerHTML = html;

      // listener for removal
      a.addEventListener("click", function (evt) {
        evt.preventDefault();
        const { lemma, id, value } = this.dataset;
        const meaning = load.data.vis.da.lemmas[lemma].meanings.find(i => i.id === id);

        let idx = meaning.quotations.indexOf(value);
        if (idx === -1) {
          idx = meaning.quotations.indexOf(parseInt(value, 10));
          if (idx === -1) {
            return;
          }
        }
        meaning.quotations.splice(idx, 1);

        config.quotList(lemma, id);
        load.svg();
        load.sha1Update();
        data.save();
      });
    }

    // remove quotations that were not found
    if (removeQuots.length) {
      for (let i = removeQuots.length - 1; i >= 0; i--) {
        const idx = removeQuots[i];
        quotations.splice(idx, 1);
      }
      load.sha1Update();
      data.save();
    }

    // Are there any quotations at all?
    if (!list.hasChildNodes()) {
      const p = document.createElement("p");
      list.appendChild(p);
      p.textContent = "noch keine Belege hinzugefügt";
    }
  },

  // create the text contents of an event header
  //   name = string
  evtHeaderText (name) {
    const frag = document.createDocumentFragment();
    const b = document.createElement("b");
    frag.appendChild(b);
    b.textContent = "Ereignis";
    const text = " " + (name || "[ohne Namen]");
    frag.appendChild(document.createTextNode(text));
    return frag;
  },

  // labels
  labels: [
    {
      key: "definition",
      help: "<p>Die in der Grafik angezeigte Bedeutung wird normalerweise aus dem Bedeutungsgerüst ausgelesen. Sollte die Bedeutung aus dem Gerüst zu lang oder zu komplex sein, können Sie hier einen Alias eintragen, der in der Grafik anstelle der Bedeutung aus dem Gerüst gedruckt wird.</p>\
      <p>In diesem Feld sind die Markdownformatierungen für <i>_kursiven Text_</i> und <b>__fetten Text__</b> zulässig.</p>\
      <p>Wenn Sie Text in einfache Guillemets einschließen (›Text‹), entfallen die automatisch erzeugten Guillemets, in die eine Bedeutung normalerweise eingeschlossen ist.</p>\
      <p>Nach der Eingabe werden einige typographische Verbesserungen vorgenommen (z.\u00A0B. \"Text\" zu „Text“ oder >Text< zu ›Text‹).</p>",
      text: "Bedeutungsangabe",
    },
    {
      key: "description",
      help: "<p>Die Beschreibung ist für Menschen mit eingeschränkter Sehfähigkeit von Bedeutung. Sie sollte kurz sein (zwei, drei Sätze), dabei aber die wesentlichen Inhalte der Grafik sprachlich vermitteln. Zeilenumbrüche sind <em>nicht</em> erlaubt.</p>\
      <p>Nach der Eingabe werden einige typographische Verbesserungen vorgenommen (z.\u00A0B. \"Text\" zu „Text“ oder >Text< zu ›Text‹).</p>",
      text: "Beschreibung der Grafik",
    },
    {
      key: "event-description",
      help: "<p>Sie können das Ereignis – wenn Sie möchten – genauer beschreiben. Die Beschreibung wird in einem Tooltip angezeigt, wenn man mit der Maus über den Ereignisnamen fährt. Zeilenumbrüche sind <em>nicht</em> erlaubt.</p>\
      <p>Nach der Eingabe werden einige typographische Verbesserungen vorgenommen (z.\u00A0B. \"Text\" zu „Text“ oder >Text< zu ›Text‹).</p>",
      text: "Beschreibung",
    },
    {
      key: "event-name",
      help: "<p>Hier geben Sie den Namen des Ereignisses an. Ein Ereignisname ist zwingend erforderlich. Zeilenumbrüche sind erlaubt.</p>\
      <p>Nach der Eingabe werden einige typographische Verbesserungen vorgenommen (z.\u00A0B. \"Text\" zu „Text“ oder >Text< zu ›Text‹).</p>",
      text: "Name",
    },
    {
      key: "event-yearFrom",
      help: "Hier geben Sie das Jahr an, in dem das Ereignis stattfand oder begann.",
      text: "Beginn",
    },
    {
      key: "event-yearTo",
      help: "Hier geben Sie das Jahr an, in dem das Ereignis endete. Wenn das Ereignis keinen Zeitraum beschreibt, sondern nur ein einziges Jahr betrifft, können Sie eine 0 oder dasselbe Jahr wie im Feld <i>Beginn</i> eintragen.",
      text: "Ende",
    },
    {
      key: "frequency",
      help: "Wenn eine Bedeutung besonders häufig oder besonders selten belegt ist, können Sie mit dieser Einstellung die Breite des Zeitstrahls ändern, um dies visuell zu verdeutlichen.",
      text: "Belegdichte",
    },
    {
      key: "ll-definition",
      help: "<p>Das hier angegebene Lemma wird auf der Webseite verlinkt, wenn es sich um ein Nebenlemma des Artikels oder um ein Lemma handelt, das in einem anderen Artikel behandelt wird. Dieses Feld muss zwingend ausgefüllt werden.</p>\
      <p>In diesem Feld ist die Markdownformatierung für <b>__fetten Text__</b> zulässig.</p>\
      <p>Nach der Eingabe werden einige typographische Verbesserungen vorgenommen (z.\u00A0B. \"Text\" zu „Text“ oder >Text< zu ›Text‹).</p>",
      text: "Lemma-Angabe",
    },
    {
      key: "ll-frequency",
      help: "Wenn ein Lemma besonders häufig oder besonders selten belegt ist, können Sie mit dieser Einstellung die Breite des Zeitstrahls ändern, um dies visuell zu verdeutlichen.",
      text: "Belegdichte",
    },
    {
      key: "ll-quotations",
      help: "Sie können jedem Lemma beliebig viele Belege zuordnen. Diese werden als Punkt auf dem Zeitstrahl des Lemmas aufgetragen. Ferner können Sie über das Textfeld eine Jahreszahl ergänzen, die nicht mit einem Beleg verknüpft ist. Diese Zahl legt den Zeitpunkt fest, zu dem der Zeitstrahl beginnen oder enden soll. Haben Sie eine Jahreszahl angegeben, wird der Zeitstrahl auch dann aufgebaut, wenn mit ihm keine Belege verknüpft wurden.",
      text: "Belege und Jahre",
    },
    {
      key: "ll-usedFrom",
      help: "Vermuten Sie, dass der früheste Ihnen bekannte Beleg nicht der Erstsbeleg ist, können sie hier eine Jahreszahl eingeben, die vor dem Datum des frühesten Belegs liegt. In der Grafik wird links neben dem frühesten Beleg dann eine gestrichelte Linie angezeigt. Dies geschieht auch, wenn Sie anstelle eines Belegs eine Jahreszahl angeben.",
      text: "Benutzt seit",
    },
    {
      key: "ll-usedUntil",
      help: "Wollen Sie anzeigen, dass dieses Lemma nicht mehr im Gebrauch ist, können sie ein Jahr eingeben, bis zu dem es ungefähr genutzt wurde. Hinter dem letzten Belegpunkt bzw. Jahr wird der Zeitstrahl dann um eine gestrichelte Linie ergänzt. Geben Sie hier eine Jahreszahl an, müssen Sie mindestens zwei Belege bzw. Jahre mit dem Lemma verknüpfen.",
      text: "Benutzt bis",
    },
    {
      key: "quotations",
      help: "Sie können jeder Bedeutung beliebig viele Belege zuordnen. Diese werden als Punkt auf dem Zeitstrahl der Bedeutung aufgetragen. Zumindest <em>ein</em> Beleg sollte normalerweise immer angegeben werden. Dies sollte dann der Erst- oder früheste Beleg aus der Belegauswahl sein. Ferner können Sie über das Textfeld eine Jahreszahl ergänzen, die nicht mit einem Beleg verknüpft ist. Diese Zahl legt den Zeitpunkt fest, zu dem der Zeitstrahl beginnen oder enden soll. Haben Sie eine Jahreszahl angegeben, wird der Zeitstrahl auch dann aufgebaut, wenn mit ihm keine Belege verknüpft wurden.",
      text: "Belege und Jahre",
    },
    {
      key: "usedFrom",
      help: "Vermuten Sie, dass der früheste Ihnen bekannte Beleg nicht der Erstsbeleg ist, können sie hier eine Jahreszahl eingeben, die vor dem Datum des frühesten Belegs liegt. In der Grafik wird links neben dem frühesten Beleg dann eine gestrichelte Linie angezeigt.",
      text: "Benutzt seit",
    },
    {
      key: "usedUntil",
      help: "Wollen Sie anzeigen, dass diese Bedeutung nicht mehr im Gebrauch ist, können sie ein Jahr eingeben, bis zu dem sie ungefähr genutzt wurde. Hinter dem letzten Belegpunkt wird der Zeitstrahl dann um eine gestrichelte Linie ergänzt. Geben Sie hier eine Jahreszahl an, müssen Sie mindestens zwei Belege auswählen, am besten den frühsten und den letzten Beleg, in dem die Bedeutung aktualisiert wird. Alternativ können Sie auch zwei Jahreszahlen angeben.",
      text: "Benutzt bis",
    },
  ],

  // add a block label
  //   key = string
  //   id = string
  //   cont = element
  addBlockLabel ({ key, id, cont }) {
    const labelData = this.labels.find(i => i.key === key);
    if (!labelData) {
      return;
    }

    this.makeLabel({
      id,
      text: labelData.text,
      cl: "block",
      cont,
    });

    this.makeImg({
      src: "kreis-fragezeichen.svg",
      title: labelData.help,
      cont: cont.lastChild,
    });
  },

  // make a new label
  //   id = string
  //   text = string
  //   cont = element
  makeLabel ({ id, text, cl = "", cont }) {
    const label = document.createElement("label");
    cont.appendChild(label);
    label.setAttribute("for", id);
    if (cl) {
      label.classList.add(cl);
    }
    label.textContent = text;
  },

  // make a new image
  //   src = string
  //   title = string
  //    cont = element
  makeImg ({ src, title = "", cont }) {
    const img = document.createElement("img");
    cont.appendChild(img);
    img.src = "../img/" + src;
    img.width = "24";
    img.height = "24";
    if (title) {
      img.title = title;
      tooltip.init(cont);
    }
  },

  // toggle meaning and event blocks
  //   block = node
  toggleBlock (block) {
    if (!block.classList.contains("closed")) {
      block.classList.add("closed");
      this.toggleTabindex(block, false);
      return;
    }

    if (block.classList.contains("meaning-cont")) {
      document.querySelectorAll(".meaning-cont").forEach(i => {
        i.classList.add("closed");
        this.toggleTabindex(i, false);
      });
    }
    block.classList.remove("closed");
    this.toggleTabindex(block, true);
  },

  // toggle tabindices in meaning and event block
  //   block = node
  //   on = boolean
  toggleTabindex (block, on) {
    block.querySelectorAll("a, input, textarea").forEach(i => {
      if (on) {
        i.removeAttribute("tabindex");
      } else {
        i.setAttribute("tabindex", "-1");
      }
    });
  },

  // move a meaning or a lemma one slot upwards
  //   lemma = string
  //   id = string
  moveUp (lemma, id) {
    // update the data
    const { vis } = load.data;
    const meanings = vis.da.lemmas[lemma].meanings;
    const idx = meanings.findIndex(i => i.id === id);
    const clone = structuredClone(meanings[idx]);
    meanings.splice(idx, 1);
    meanings.splice(idx - 1, 0, clone);

    // remove the configuration block
    const oldBlock = document.querySelector(`.meaning-cont[data-id="${id}"]`);
    const parent = oldBlock.parentNode;
    const previous = oldBlock.previousSibling;
    oldBlock.parentNode.removeChild(oldBlock);

    // insert the newly created configuration block
    const newBlock = config.makeMeanBlock(lemma, clone);
    parent.insertBefore(newBlock, previous);

    // update SVG and save data
    load.svg();
    load.sha1Update();
    data.save();
  },
};
