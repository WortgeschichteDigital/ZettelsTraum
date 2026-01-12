
const shared = {
  // SVG dimensions
  dimensions: {
    // SVG width
    width: 720,

    // SVG height
    // (only placeholder, the real image height
    // is calculated after everything was drawn)
    height: 500,

    // maximum x coordinate to which a line is drawn
    // (leaves space to draw the arrows)
    lineMax: 710,

    // the actual height depends on the line thickness
    groupHeights: [ 51, 55, 59 ],
  },

  // calculate timespan of the current data
  calculateTimespan () {
    const quots = [ ...document.querySelectorAll("#wgd-belegauswahl > div") ];

    // detect first year
    let first = 0;
    for (const val of Object.values(make.data.lemmas)) {
      for (const evt of val.events) {
        const year = evt.yearFrom;
        if (year && (!first || year < first)) {
          first = year;
        }
      }
      for (const meaning of val.meanings) {
        for (const id of meaning.quotations) {
          const year = this.getYear(id);
          if (year && (!first || year < first)) {
            first = year;
          }
        }
      }
    }
    if (!first) {
      first = this.getYear(quots[0].id);
    }

    // detect last year
    let last = this.getYear(quots.at(-1)?.id || quots.at(-1));

    // correct first and last date so the timeline has always a certain length
    const current = new Date().getFullYear();
    if (current - last < 10) {
      last = current < last + 10 ? current : last + 10;
    }
    if (last - first < 10) {
      first = last - 10;
    }

    // calculate pixels per year
    return {
      first,
      last,
      pxYear: (this.dimensions.width - 90) / (last - first),
    };
  },

  // create an element with the passed attributes
  //   name = string
  //   attr = object | undefined
  createElement (name, attr = {}) {
    const ele = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [ n, v ] of Object.entries(attr)) {
      ele.setAttribute(n, v);
    }
    return ele;
  },

  // create the gradient for an extension line
  //   svg = document
  //   x1 = number
  //   x2 = number
  //   fadeIn = boolean
  //   cl = string | undefined
  createGradient ({ svg, x1, x2, fadeIn, cl = "" }) {
    const defs = svg.querySelector("defs");
    const id = "bedvisGradOut" + defs.querySelectorAll("linearGradient").length;
    const attr = {
      id,
      x1,
      x2,
      gradientUnits: "userSpaceOnUse",
    };
    if (cl) {
      attr.class = cl;
    }
    const grad = this.createElement("linearGradient", attr);
    for (let i = 1; i <= 2; i++) {
      const opacity = fadeIn ? i - 1 : i % 2;
      grad.appendChild(this.createElement("stop", {
        offset: i - 1,
        "stop-opacity": opacity,
      }));
    }
    defs.appendChild(grad);
    return id;
  },

  // re-enable pointer events for the given element and its descendants
  // (An SVG <title> is a vital accessibility feature. Unfortunately, the browsers
  // display it in a tooltip. A way to prevent this is to disable pointer events
  // for the SVG and re-enable them only for those elements that really need them.
  // These elements must have an empty <title>. Otherwise they trigger
  // a tooltip with the contents of the main SVG <title>.)
  //   ele = element
  pointerEvent (ele) {
    ele.setAttribute("pointer-events", "auto");
    const title = this.createElement("title");
    ele.appendChild(title);
  },

  // get a quotation’s year
  //   id = string
  getYear (id) {
    if (typeof id === "number") {
      return id;
    }
    const time = document.querySelector(`#${id} time`);
    if (!time) {
      return 0;
    }
    const year = time.getAttribute("datetime").match(/^[0-9]{4}/)?.[0];
    if (!year) {
      return 0;
    }
    return parseInt(year, 10);
  },
};

const make = {
  // visualisation data
  //   description             string (accessibility: alternative text that describes
  //                                   the contents of the graphics)
  //   lemmaList               boolean (if this value is "true", the visualization does not show
  //                                    a list of meanings but one of lemmas which changes the
  //                                    behaviour and semantics of several keys:
  //                                      * "[LEMMA]": the key's name is always "lemmas" and it is the only one there is
  //                                      * "meanings": the array is not filled with meaning but lemma entries
  //                                      * "definition": this field contains the lemma as it is printed above the line
  //                                      * "showNumbering": is always "false" and can't be changed)
  //   lemmas                  object
  //     [LEMMA]
  //       events              array
  //         description       string
  //         id                string (ID to reliably address a specific event
  //                                   in the configuration UI)
  //         name              string (event name, may contain \n for line breaks)
  //         yearFrom          number
  //         yearTo            number
  //
  //       meanings            array
  //         definition        string (get definition from document if empty)
  //         frequency         number (1-3, very low to very high frequency)
  //         id                string (ID of the meaning in the document)
  //         usedFrom          number (approximate year from which on the meaning is in use;
  //                                   0 = first known quotation cited)
  //         usedUntil         number (approximate year until which the meaning is in use;
  //                                   0 = used until today)
  //         quotations        array (filled with:
  //                                  string = quotation ID in the document
  //                                  number = year)
  //
  //       showNumbering       boolean
  data: {},

  // ensure that some critical data values are always valid
  validateData () {
    for (const val of Object.values(this.data.lemmas)) {
      // adjust yearFrom and yearTo
      for (const i of val.events) {
        if (i.yearFrom > i.yearTo) {
          i.yearTo = i.yearFrom;
        } else if (!i.yearFrom && i.yearTo) {
          i.yearFrom = i.yearTo;
        } else if (i.yearFrom && !i.yearTo) {
          i.yearTo = i.yearFrom;
        }
      }

      // adjust frequency
      for (const i of val.meanings) {
        if (i.frequency < 1) {
          i.frequency = 1;
        } else if (i.frequency > 3) {
          i.frequency = 3;
        }
      }
    }
  },

  // create SVG
  //   config = object
  //     artData = object (Artikel.json, see https://www.zdl.org/wb/wgd/api#Artikeldaten)
  //     standalone = boolean (create standalone image)
  svg (config) {
    // prepare attributes
    let lemmas;
    if (this.data.lemmaList) {
      lemmas = this.data.lemmas.lemmas.meanings.flatMap(i => i.definition.replace(/_/g, ""));
    } else {
      lemmas = Object.keys(this.data.lemmas);
    }
    const id = lemmas
      .join(" ")
      .replace(/ /g, "_")
      .toLowerCase();
    const svgAttr = {
      "aria-labelledby": "bedvis-title-" + id,
      width: shared.dimensions.width,
      height: shared.dimensions.height,
      "pointer-events": "none",
      viewBox: `0 0 ${shared.dimensions.width} ${shared.dimensions.height}`,
      class: "bedvis",
    };
    if (this.data.description) {
      svgAttr["aria-describedby"] = "bedvis-desc-" + id;
    }
    if (this.data.lemmaList) {
      svgAttr.class = "bedvis lemma-list";
    }

    // create SVG
    const svg = shared.createElement("svg", svgAttr);

    // add accessibility tags
    const title = shared.createElement("title", {
      id: "bedvis-title-" + id,
    });
    svg.appendChild(title);
    const lemmasJoined = lemmas.join("“, „").replace(/^(.+)(, )/, (...args) => args[1] + " und ");
    title.textContent = `Chronologie der ${this.data.lemmaList ? "Wörter" : "Bedeutungen von"} „${lemmasJoined}“`;
    if (this.data.description) {
      const desc = shared.createElement("desc", {
        id: "bedvis-desc-" + id,
      });
      svg.appendChild(desc);
      desc.textContent = this.data.description;
    }

    // add definitions
    this.defs(svg);

    // add meaning groups
    const timespan = shared.calculateTimespan();
    const top = this.meanings(svg, timespan, config);

    // add timeline
    const timelineData = this.timeline(svg, timespan, top);

    // add events to the timeline
    const eventLines = this.events({
      svg,
      timespan,
      top,
      timelineData,
    });

    // adjust SVG height
    const svgHeight = top + 26 + eventLines * 22;
    svg.setAttribute("height", svgHeight);
    svg.setAttribute("viewBox", `0 0 ${shared.dimensions.width} ${svgHeight}`);

    // return SVG
    return svg;
  },

  // add definitions
  //   svg = document
  defs (svg) {
    const defs = shared.createElement("defs");
    svg.appendChild(defs);

    // arrows
    defs.appendChild(shared.createElement("path", {
      id: "bedvisArrow",
      d: "M 0 0 L 10 5 L 0 10 C 5 2, 5 8, 0 0",
    }));
    for (const i of [ "Grey", "Blue", "BlueHover" ]) {
      const arrow = shared.createElement("marker", {
        id: "bedvisArrow" + i,
        viewBox: "0 0 10 10",
        refX: "5",
        refY: "5",
        markerWidth: "16",
        markerHeight: "16",
        markerUnits: "userSpaceOnUse",
        class: "arrow-" + i.toLowerCase(),
      });
      arrow.appendChild(shared.createElement("use", {
        href: "#bedvisArrow",
      }));
      defs.appendChild(arrow);
    }
  },

  // add meanings
  //   svg = document
  //   timespan = object
  //   config = object
  meanings (svg, timespan, config) {
    // detect articles lemmas
    const ll = this.data.lemmaList;
    const artWords = {};
    if (ll) {
      document.querySelector(".wgd-kopf-hl")?.textContent?.split(/\s·\s/)?.forEach(i => {
        artWords[i] = "";
      });
      document.querySelectorAll(".wgd-kopf-nl a").forEach(i => {
        artWords[i.textContent] = i.getAttribute("href");
      });
      document.querySelectorAll("#wgd-wortinformationen > div > p > a").forEach(i => {
        const href = i.getAttribute("href");
        if (/^#/.test(href)) {
          artWords[i.textContent] = href;
        }
      });
    }

    // add meaning blocks
    const lemmas = Object.keys(this.data.lemmas).length;
    let top = 0;
    for (const [ lemma, data ] of Object.entries(this.data.lemmas)) {
      // print lemma
      if (lemmas > 1) {
        top += 16;
        const text = shared.createElement("text", {
          x: shared.dimensions.width / 2,
          y: top,
          "dominant-baseline": "hanging",
          "text-anchor": "middle",
          class: "lemma",
        });
        text.textContent = lemma;
        svg.appendChild(text);
        top += 40;
      } else {
        top += 8;
      }

      // print meaning lines
      for (let i = 0, len = data.meanings.length; i < len; i++) {
        // meaning not found
        const m = data.meanings[i];
        const meaning = document.getElementById(m.id);
        if (!meaning && !ll) {
          continue;
        }

        // get quotation data
        const quots = [];
        for (const id of m.quotations) {
          const year = shared.getYear(id);
          if (!year) {
            continue;
          }
          quots.push({
            id,
            year,
            yearText: typeof id === "number" ? "" + id : document.querySelector(`#${id} time`).textContent.replace(/[a-z]$/, ""),
          });
        }
        if (!quots.length) {
          continue;
        }

        // increase space between meaning lines for standalone graphics
        if (i && config.standalone) {
          top += 15;
        }

        // draw meaning group
        const g = shared.createElement("g");
        svg.appendChild(g);
        shared.pointerEvent(g);

        // calculate basic points
        const groupHeight = shared.dimensions.groupHeights[m.frequency - 1];
        const circleRadius = 5 + [ 0, 2, 4 ][m.frequency - 1];
        const lineStart = 50 + Math.round((quots[0].year - timespan.first) * timespan.pxYear);
        let lineEnd = shared.dimensions.lineMax;
        if (m.usedUntil && quots.length > 1) {
          lineEnd = 50 + Math.round((quots.at(-1).year - timespan.first) * timespan.pxYear);
        }
        const lineWidth = [ 1, 3, 5 ][m.frequency - 1];
        const lineY = top + 20 + circleRadius;

        // draw rectangle
        g.appendChild(shared.createElement("rect", {
          x: lineStart,
          y: top,
          width: lineEnd - lineStart,
          height: groupHeight,
          class: "blind",
        }));

        // print definition text
        const def = shared.createElement("text", {
          x: lineStart + circleRadius,
          y: top,
          "dominant-baseline": "hanging",
          class: "definition",
        });
        const defText = m.definition || meaning?.querySelector("q")?.textContent || "[keine Angabe]";
        if (ll) {
          // lemma list
          fillDef(def, defText, ll);
        } else {
          // meaning list
          fillDef(def, defText, ll);
          let defNumber = meaning.querySelector(".wgd-zaehlz")?.textContent;
          let defParent = meaning.parentNode.parentNode;
          while (defParent.nodeName === "LI") {
            const zaehlz = defParent.querySelector(".wgd-zaehlz")?.textContent;
            if (zaehlz) {
              defNumber = zaehlz + defNumber;
            }
            defParent = defParent.parentNode.parentNode;
          }
          if (data.showNumbering && defNumber) {
            const numbering = shared.createElement("tspan", {
              class: "bold",
              "dominant-baseline": "hanging",
            });
            numbering.textContent = defNumber + "\u00A0".repeat(2);
            def.insertBefore(numbering, def.firstChild);
          }
        }
        let defTarget;
        if (ll) {
          // lemma list
          let lemma = m.definition.replace(/_/g, "");
          const sup = [ "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹" ];
          const supIdx = sup.indexOf(lemma.substring(0, 1));
          let hidx = 0;
          if (supIdx >= 0) {
            lemma = lemma.substring(1);
            hidx = supIdx + 1;
          }
          if (typeof artWords[lemma] !== "undefined") {
            defTarget = artWords[lemma];
          } else if (config.artData?.values) {
            forX: for (let le of config.artData.values.le) {
              const hidxLe = parseInt(le.match(/ \((\d+)\)$/)?.[1] || 0, 10);
              le = le.replace(/ \(.+?\)$/, "");
              for (const leSplit of le.split("/")) {
                if (leSplit === lemma && hidxLe === hidx) {
                  if (hidx > 1) {
                    lemma += "-" + hidx;
                  }
                  defTarget = `${window.location.origin}/wb/wortgeschichten/${encodeURIComponent(lemma)}`;
                  break forX;
                }
              }
            }
          }
        } else {
          // meaning list
          defTarget = meaning.querySelector("a")?.getAttribute("href");
        }
        if (defTarget && /^(#|http)/.test(defTarget)) {
          const a = shared.createElement("a", {
            href: defTarget,
            tabindex: -1,
            class: "definition",
          });
          a.appendChild(def);
          g.appendChild(a);
        } else {
          g.appendChild(def);
        }

        // draw main line
        const lineAttr = {
          x1: lineStart,
          y1: lineY,
          x2: lineEnd,
          y2: lineY,
          "stroke-width": lineWidth,
          class: "meaning",
        };
        if (!m.usedUntil) {
          lineAttr["marker-end"] = "url(#bedvisArrowBlue)";
        }
        const line = shared.createElement("line", lineAttr);
        g.appendChild(line);

        // draw extension line(s)
        const dashWidth = [ 5, 10, 15 ][m.frequency - 1];
        const dasharray = `${dashWidth},${dashWidth}`;
        if (m.usedFrom) {
          let usedFrom = lineStart - Math.round((quots[0].year - m.usedFrom) * timespan.pxYear);
          if (lineStart - usedFrom < 30) {
            usedFrom = lineStart - 30;
          }
          const x1 = usedFrom > 0 ? usedFrom : 0;
          for (let i = 1; i <= 2; i++) {
            const cl = i === 1 ? "extension-norm" : "extension-hover";
            const gradId = shared.createGradient({
              svg,
              x1,
              x2: x1 + 25,
              fadeIn: true,
              cl,
            });
            const extension = shared.createElement("line", {
              x1,
              y1: lineY,
              x2: lineStart,
              y2: lineY,
              stroke: `url(#${gradId})`,
              "stroke-dasharray": dasharray,
              "stroke-width": lineWidth,
              class: cl,
            });
            g.appendChild(extension);
          }
        }
        if (m.usedUntil && quots.length > 1) {
          line.classList.add("meaning-obsolete");
          let x2 = lineEnd + Math.round((m.usedUntil - quots.at(-1).year) * timespan.pxYear);
          if (x2 - lineEnd < 30) {
            x2 = lineEnd + 30;
          }
          if (x2 > shared.dimensions.lineMax) {
            x2 = shared.dimensions.lineMax;
          }
          let gradX1 = x2 - 25;
          if (gradX1 < lineEnd) {
            gradX1 = lineEnd;
          }
          for (let i = 1; i <= 2; i++) {
            const cl = i === 1 ? "extension-norm" : "extension-hover";
            const gradId = shared.createGradient({
              svg,
              x1: gradX1,
              x2,
              fadeIn: false,
              cl,
            });
            const extension = shared.createElement("line", {
              x1: lineEnd,
              y1: lineY,
              x2,
              y2: lineY,
              stroke: `url(#${gradId})`,
              "stroke-dasharray": dasharray,
              "stroke-width": lineWidth,
              class: cl,
            });
            g.appendChild(extension);
          }
        }

        // draw quotation circles
        for (const q of quots) {
          // ID is actually a year => do not draw a circle
          if (typeof q.id === "number") {
            continue;
          }

          // circle
          const cx = 50 + Math.round((q.year - timespan.first) * timespan.pxYear);
          const circle = shared.createElement("circle", {
            cx,
            cy: lineY,
            r: circleRadius,
            class: "quotation",
            "data-id": q.id,
          });
          g.appendChild(circle);

          // year
          const year = shared.createElement("text", {
            x: cx,
            y: lineY + circleRadius + 3,
            "dominant-baseline": "hanging",
            class: "year",
          });
          g.appendChild(year);
          year.textContent = q.yearText;
        }

        // append aria label
        this.ariaDesc({
          ele: g,
          def: defText,
          lemma,
          quotFirst: quots[0].year,
          quotLast: quots.length > 1 ? quots.at(-1).year : 0,
          usedBefore: m.usedFrom,
          usedUntil: m.usedUntil,
        });

        // increase top (after meaning group)
        top += groupHeight + 4;
      }
    }

    // fill in the definition text
    function fillDef (def, defText, ll) {
      // Is it necessary to enclose the definition in guillemets?
      const guillemets = !/›.+‹/.test(defText) && !ll;

      // detect text chunks
      const chunks = [];
      while (defText.length) {
        const text = defText.match(/^[^_]+/)?.[0];
        if (text) {
          chunks.push({
            text,
          });
          defText = defText.substring(text.length);
        } else {
          let cl;
          const type = defText.match(/^_+/)[0];
          if (type.length === 1) {
            cl = "italic";
          } else if (type.length === 2) {
            cl = "bold";
          } else {
            cl = "italic bold";
          }
          const m = defText.match(/^_+(.+?)_+/);
          chunks.push({
            text: m[1],
            cl,
          });
          defText = defText.substring(m[0].length);
        }
      }

      // create <tspan> tags
      for (const i of chunks) {
        const tspan = shared.createElement("tspan", {
          "dominant-baseline": "hanging",
        });
        if (i.cl) {
          tspan.setAttribute("class", i.cl);
        }
        tspan.textContent = i.text;
        def.appendChild(tspan);
      }

      // add guillemets
      // (for the shortening function, it is important that the guillemets
      //  are enclosed in <tspan> tags)
      if (guillemets) {
        const open = shared.createElement("tspan", {
          "dominant-baseline": "hanging",
        });
        open.textContent = "›";
        def.insertBefore(open, def.firstChild);
        const close = shared.createElement("tspan", {
          "dominant-baseline": "hanging",
        });
        close.textContent = "‹";
        def.appendChild(close);
      }
    }

    // increase top (after last meaning group)
    top += 20;

    return top;
  },

  // create an accessibility description for a meaning group
  //   ele = element
  //   def = string
  //   lemma = string
  //   quotFirst = number
  //   quotLast = number
  //   usedBefore = number
  //   usedUntil = number
  ariaDesc ({ ele, def, lemma, quotFirst, quotLast, usedBefore, usedUntil }) {
    // make label text
    let text = `Der früheste Beleg des Worts „${lemma}“ in der Bedeutung „${def}“ stammt aus dem Jahr ${quotFirst}.`;
    if (usedBefore && usedBefore < quotFirst) {
      text += " Diese Bedeutung war vermutlich schon vorher im Gebrauch";
      if (quotLast) {
        text += ` und ist noch für das Jahr ${quotLast} belegt.`;
        if (!usedUntil) {
          text += " Sie wird noch heute verwendet.";
        } else if (usedUntil === quotLast) {
          text += " Später wurde sie vermutlich nicht mehr verwendet.";
        } else if (usedUntil !== quotLast) {
          text += ` Vermutlich wurde sie auch nach ${quotLast} für einige Zeit verwendet, heute aber nicht mehr.`;
        }
      } else if (!usedUntil) {
        text += " und wird noch heute verwendet.";
      } else {
        text += ".";
      }
    } else if (!usedUntil) {
      text += " Diese Bedeutung wird noch heute verwendet.";
    }

    // append label
    ele.setAttribute("aria-label", text);
  },

  // storage for the timeline labels
  // (it might be necessary to remove them after they were created
  //  if an event line overlaps a label)
  timelineLabels: [],

  // add timeline
  //   svg = document
  //   timespan = object
  //   top = number
  timeline (svg, timespan, top) {
    // clear label storage
    this.timelineLabels = [];

    // draw line
    svg.appendChild(shared.createElement("line", {
      x1: 0,
      y1: top,
      x2: shared.dimensions.lineMax,
      y2: top,
      "stroke-width": 3,
      "marker-end": "url(#bedvisArrowGrey)",
      class: "timeline",
    }));

    // print years
    const yearsLeft = Math.floor(50 / timespan.pxYear);
    const minYear = timespan.first - yearsLeft;
    const minYearX = 50 - yearsLeft * timespan.pxYear;
    let year;
    let step;
    if (timespan.last - timespan.first < 30) {
      // steps: five years
      year = parseInt(minYear.toString().replace(/[0-9]$/, "0"), 10) - 5;
      step = 5;
    } else if (timespan.last - timespan.first < 100) {
      // steps: ten years
      year = parseInt(minYear.toString().replace(/[0-9]$/, "0"), 10) - 10;
      step = 10;
    } else if (timespan.last - timespan.first < 300) {
      // steps: fifty years
      year = parseInt(minYear.toString().substring(0, 2), 10) * 100;
      if (parseInt(minYear.toString().substring(2), 10) <= 50) {
        year += 50;
      } else {
        year += 100;
      }
      step = 50;
    } else {
      // steps: one hundred years
      year = parseInt(minYear.toString().substring(0, 2), 10) * 100 + 100;
      step = 100;
    }
    do {
      // ensure that the labels do not overlap
      const x = minYearX + Math.round((year - minYear) * timespan.pxYear);
      if (x < 15) {
        year += step;
        continue;
      }

      // create a new label
      const text = shared.createElement("text", {
        x,
        y: top + 6,
        "dominant-baseline": "hanging",
        "text-anchor": "middle",
        class: "timeline-year",
      });
      text.textContent = year;
      svg.appendChild(text);
      year += step;

      // store the label
      // (its normal width is about 34px)
      this.timelineLabels.push({
        ele: text,
        x: x - 20,
      });
    } while (year < timespan.last);

    return {
      minYear,
      minYearX,
    };
  },

  // add events to the timeline
  //   svg = document
  //   timespan = object
  //   top = number
  //   timelineData = object
  events ({ svg, timespan, top, timelineData }) {
    const { minYear, minYearX } = timelineData;
    let eventLines = 0;

    for (const data of Object.values(this.data.lemmas)) {
      if (!data.events.length) {
        continue;
      }

      for (const e of data.events) {
        // event group
        const g = shared.createElement("g", {
          class: "timeline-event",
        });
        svg.appendChild(g);
        shared.pointerEvent(g);

        // marker
        const x = minYearX + Math.round((e.yearFrom + Math.floor((e.yearTo - e.yearFrom) / 2) - minYear) * timespan.pxYear);
        if (e.yearTo === e.yearFrom) {
          g.appendChild(shared.createElement("rect", {
            x: x - 5,
            y: top - 5,
            width: 10,
            height: 10,
            transform: `rotate(45, ${x}, ${top})`,
          }));
        } else {
          let spanStart = minYearX + Math.round((e.yearFrom - minYear) * timespan.pxYear);
          let spanEnd = minYearX + Math.round((e.yearTo - minYear) * timespan.pxYear);
          while (spanEnd - spanStart < 10) {
            spanStart--;
            spanEnd++;
          }
          g.appendChild(shared.createElement("line", {
            x1: spanStart,
            y1: top,
            x2: spanEnd,
            y2: top,
            class: "timeline-event-span",
          }));
        }
        g.appendChild(shared.createElement("line", {
          x1: x,
          y1: top + 28,
          x2: x,
          y2: top,
          class: "timeline-event-marker",
        }));

        // text
        let date = "" + e.yearFrom;
        if (e.yearTo !== e.yearFrom) {
          date += "–" + e.yearTo;
        }
        let desc = `<b>${date}</b>`;
        if (e.description) {
          desc += " / " + e.description;
        }
        const text = shared.createElement("text", {
          x,
          y: top + 10,
          "dominant-baseline": "hanging",
          "text-anchor": "middle",
          "data-description": desc,
        });
        let lines = 0;
        for (const i of e.name.split("\n")) {
          lines++;
          const tspan = shared.createElement("tspan", {
            x,
            dy: 20,
            "dominant-baseline": "hanging",
          });
          tspan.textContent = i;
          text.appendChild(tspan);
        }
        g.appendChild(text);
        if (lines > eventLines) {
          eventLines = lines;
        }

        // remove a timeline label if it is overlapped by the marker line
        for (const i of this.timelineLabels) {
          if (x > i.x && x < i.x + 40) {
            i.ele.parentNode.removeChild(i.ele);
            break;
          }
        }
      }
    }

    return eventLines;
  },
};

export default {
  makeSVG (data, config = {}) {
    make.data = data;
    make.validateData();
    const svg = make.svg(config) || null;
    return svg;
  },
};
