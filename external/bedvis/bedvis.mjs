
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
    const quots = document.querySelectorAll("#wgd-belegauswahl > div");

    // detect first year
    let first = 0;
    for (const val of Object.values(make.data.lemmas)) {
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
    const last = this.getYear(quots[quots.length - 1].id);

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
  //   lemmas                  object
  //     [LEMMA]
  //       events              array
  //         description       string
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
  svg () {
    // prepare attributes
    const lemmas = Object.keys(this.data.lemmas);
    const id = lemmas.join(" ").replace(/ /g, "_").toLowerCase();
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

    // create SVG
    const svg = shared.createElement("svg", svgAttr);

    // add accessibility tags
    const title = shared.createElement("title", {
      id: "bedvis-title-" + id,
    });
    svg.appendChild(title);
    const lemmasJoined = lemmas.join("“, „").replace(/^(.+)(, )/, (...args) => args[1] + " und ");
    title.textContent = `Bedeutungsentwicklung von „${lemmasJoined}“`;
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
    const top = this.meanings(svg, timespan);

    // add timeline
    const minYear = this.timeline(svg, timespan, top);

    // add events to the timeline
    const eventLines = this.events({
      svg,
      timespan,
      top,
      minYear,
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
  meanings (svg, timespan) {
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
        if (!meaning) {
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
        const defText = m.definition || meaning.querySelector("q").textContent;
        def.textContent = `›${defText}‹`;
        const defNumber = meaning.querySelector(".wgd-zaehlz")?.textContent;
        if (data.showNumbering && defNumber) {
          const numbering = shared.createElement("tspan", {
            "dominant-baseline": "hanging",
          });
          numbering.textContent = defNumber + "\u00A0".repeat(2);
          def.insertBefore(numbering, def.firstChild);
        }
        const defTarget = meaning.querySelector("a")?.getAttribute("href") || "";
        if (defTarget && /^#/.test(defTarget)) {
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
            y: lineY + circleRadius + 2,
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

  // add timeline
  //   svg = document
  //   timespan = object
  //   top = number
  timeline (svg, timespan, top) {
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
    const minYear = timespan.first - Math.round(35 / timespan.pxYear);
    let year;
    let step;
    if (timespan.last - timespan.first < 200) {
      // lustra
      year = parseInt(minYear.toString().substring(0, 2), 10) * 100;
      if (parseInt(minYear.toString().substring(2), 10) <= 50) {
        year += 50;
      } else {
        year += 100;
      }
      step = 50;
    } else {
      // centuries
      year = parseInt(minYear.toString().substring(0, 2), 10) * 100 + 100;
      step = 100;
    }
    do {
      const text = shared.createElement("text", {
        x: 15 + Math.round((year - minYear) * timespan.pxYear),
        y: top + 6,
        "dominant-baseline": "hanging",
        "text-anchor": "middle",
        class: "timeline-year",
      });
      text.textContent = year;
      svg.appendChild(text);
      year += step;
    } while (year < timespan.last);

    return minYear;
  },

  // add events to the timeline
  //   svg = document
  //   timespan = object
  //   top = number
  //   minYear = number
  events ({ svg, timespan, top, minYear }) {
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
        const x = 15 + Math.round((e.yearFrom + Math.floor((e.yearTo - e.yearFrom) / 2) - minYear) * timespan.pxYear);
        if (e.yearTo === e.yearFrom) {
          g.appendChild(shared.createElement("rect", {
            x: x - 5,
            y: top - 5,
            width: 10,
            height: 10,
            transform: `rotate(45, ${x}, ${top})`,
          }));
        } else {
          let spanStart = 15 + Math.round((e.yearFrom - minYear) * timespan.pxYear);
          let spanEnd = 15 + Math.round((e.yearTo - minYear) * timespan.pxYear);
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
      }
    }

    return eventLines;
  },
};

export default {
  makeSVG (data) {
    make.data = data;
    make.validateData();
    const svg = make.svg() || null;
    return svg;
  },
};
